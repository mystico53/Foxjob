const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { OpenAI } = require('openai');
const { z } = require('zod');

// Initialize
const db = admin.firestore();

// ===== Config =====
const CONFIG = {
    topics: {
        jobDescriptionExtracted: 'ten-qualities-gathered-DISABLED',
        matchingCompleted: 'embeddings-matched'
    },
    matching: {
        similarityThreshold: 0.75,
        embeddingModel: 'text-embedding-ada-002',
        batchSize: 10 // Number of embeddings to process in parallel
    },
    function: {
        timeoutSeconds: 120 // Increased timeout
    }
};

// ===== Firestore Service =====
const firestoreService = {
    async getJobDocument(googleId, docId) {
        try {
            const jobDoc = await db.collection('users')
                .doc(googleId)
                .collection('jobs')
                .doc(docId)
                .get();

            if (!jobDoc.exists) {
                throw new Error(`Job document not found: ${docId}`);
            }

            return jobDoc.data();
        } catch (error) {
            logger.error('Error getting job document:', error);
            throw error;
        }
    },

    async batchUpdateQualityScores(googleId, docId, updates) {
        try {
            // Create a batch write
            const batch = db.batch();
            const docRef = db.collection('users')
                .doc(googleId)
                .collection('jobs')
                .doc(docId);

            // Combine all updates into a single object
            const consolidatedUpdates = updates.reduce((acc, { qualityId, embeddingScore }) => {
                acc[`qualities.${qualityId}.embeddingScore`] = embeddingScore;
                return acc;
            }, {});

            batch.update(docRef, consolidatedUpdates);
            await batch.commit();

            logger.info('Batch updated embedding scores:', { updateCount: updates.length });
        } catch (error) {
            logger.error('Error in batch update:', error);
            throw error;
        }
    }
};

// ===== Embedding Service =====
const embeddingService = {
    openai: null,

    initialize() {
        const apiKey = process.env.OPENAI_API_KEY || functions.config().openai.api_key;
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }
        this.openai = new OpenAI({ apiKey });
    },

    async getBatchEmbeddings(texts) {
        if (!this.openai) this.initialize();

        const preprocessedTexts = texts.map(this.preprocessText);
        
        try {
            const response = await this.openai.embeddings.create({
                model: CONFIG.matching.embeddingModel,
                input: preprocessedTexts,
            });

            return response.data.map(item => item.embedding);
        } catch (error) {
            logger.error('Error getting embeddings:', error);
            throw error;
        }
    },

    preprocessText(text) {
        return text
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    },

    calculateSimilarity(vecA, vecB) {
        const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    }
};

// ===== Matching Service =====
const matchingService = {
    async processMatch(googleId, docId, jobData) {
        try {
            const qualities = jobData.qualities;
            const qualityBatches = this.createQualityBatches(qualities);
            const allUpdates = [];

            for (const batch of qualityBatches) {
                const batchUpdates = await this.processBatch(batch);
                allUpdates.push(...batchUpdates);
            }

            // Perform batch update to Firestore
            await firestoreService.batchUpdateQualityScores(googleId, docId, allUpdates);

            return true;
        } catch (error) {
            logger.error('Error processing match:', error);
            throw error;
        }
    },

    createQualityBatches(qualities) {
        const qualityArray = Object.entries(qualities)
            .filter(([_, quality]) => quality.resumeText) // Filter out qualities without resumeText
            .map(([id, quality]) => ({ id, ...quality }));

        const batches = [];
        for (let i = 0; i < qualityArray.length; i += CONFIG.matching.batchSize) {
            batches.push(qualityArray.slice(i, i + CONFIG.matching.batchSize));
        }
        return batches;
    },

    async processBatch(qualityBatch) {
        // Prepare texts for embedding
        const qualityTexts = qualityBatch.map(quality => 
            [quality.evidence, quality.primarySkill]
                .filter(Boolean)
                .join(' ')
        );
        const resumeTexts = qualityBatch.map(quality => quality.resumeText);

        // Get embeddings in parallel
        const [qualityEmbeddings, resumeEmbeddings] = await Promise.all([
            embeddingService.getBatchEmbeddings(qualityTexts),
            embeddingService.getBatchEmbeddings(resumeTexts)
        ]);

        // Process similarities and create updates
        return qualityBatch.map((quality, index) => {
            const rawSimilarity = embeddingService.calculateSimilarity(
                qualityEmbeddings[index],
                resumeEmbeddings[index]
            );

            const adjustedScore = this.calculateAdjustedScore(rawSimilarity);

            return {
                qualityId: quality.id,
                embeddingScore: adjustedScore
            };
        });
    },

    calculateAdjustedScore(rawSimilarity) {
        const normalized = Math.max(0, (rawSimilarity - 0.65) / 0.3);
        const sigmoid = 1 / (1 + Math.exp(-10 * (normalized - 0.5)));
        const scaled = Math.log10(1 + 9 * sigmoid) / Math.log10(10);
        return Math.round(scaled * 100);
    }
};

// ===== Main Function =====
exports.embeddingMatch = onMessagePublished(
    { 
        topic: CONFIG.topics.jobDescriptionExtracted,
        timeoutSeconds: CONFIG.function.timeoutSeconds
    },
    async (event) => {
        try {
            const messageData = (() => {
                try {
                    if (!event?.data?.message?.data) {
                        throw new Error('Invalid message format received');
                    }
                    const decodedData = Buffer.from(event.data.message.data, 'base64').toString();
                    return JSON.parse(decodedData);
                } catch (error) {
                    logger.error('Error parsing message data:', error);
                    throw error;
                }
            })();
            
            const { googleId, docId } = messageData;
            logger.info('Starting match processing', { googleId, docId });

            const jobData = await firestoreService.getJobDocument(googleId, docId);
            await matchingService.processMatch(googleId, docId, jobData);

            logger.info('Match processing completed', { googleId, docId });

        } catch (error) {
            logger.error('Error in match processing:', error);
            throw error;
        }
    });