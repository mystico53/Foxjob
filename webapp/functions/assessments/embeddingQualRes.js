const { onRequest } = require('firebase-functions/v2/https');
const cors = require('cors')({ origin: true });
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { OpenAI } = require('openai');
const { Firestore } = require("firebase-admin/firestore");

// Initialize Firestore
const db = admin.firestore();

// ===== Config =====
const CONFIG = {
    matching: {
        similarityThreshold: 0.75,
        embeddingModel: 'text-embedding-ada-002',
        batchSize: 10 // Number of embeddings to process in parallel
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

    async getStructuredResume(googleId, resumeDocId) {
        try {
            const resumeDoc = await db.collection('users')
                .doc(googleId)
                .collection('UserCollections')
                .doc(resumeDocId)
                .get();

            if (!resumeDoc.exists) {
                throw new Error(`Resume document not found: ${resumeDocId}`);
            }

            const resumeData = resumeDoc.data();
            if (!resumeData.structuredData) {
                throw new Error(`Structured data not found in resume document: ${resumeDocId}`);
            }

            return resumeData.structuredData;
        } catch (error) {
            logger.error('Error getting structured resume:', error);
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

// ===== Resume Processor =====
const resumeProcessor = {
    extractBulletPoints(structuredData) {
        const bulletPoints = structuredData.companies.flatMap(company => 
            company.positions.flatMap(position => position.bullets)
        );
        return bulletPoints;
    }
};

// ===== Matching Service =====
const matchingService = {
    async processMatch(googleId, docId) {
        try {
            

            // Retrieve structured resume data
            const structuredResume = await firestoreService.getStructuredResume(googleId, docId);

            // Extract bullet points
            const bulletPoints = resumeProcessor.extractBulletPoints(structuredResume);

            if (bulletPoints.length === 0) {
                throw new Error('No bullet points found in structured resume data');
            }

            // Generate embeddings
            const [jobEmbedding, bulletEmbeddings] = await Promise.all([
                embeddingService.getBatchEmbeddings([jobRequirement]),
                embeddingService.getBatchEmbeddings(bulletPoints)
            ]);

            const jobVec = jobEmbedding[0]; // Single embedding for job requirement

            // Calculate similarity scores
            const similarityScores = bulletEmbeddings.map(bulletVec => 
                embeddingService.calculateSimilarity(jobVec, bulletVec)
            );

            // Pair bullet points with their similarity scores
            const pairedScores = bulletPoints.map((bullet, index) => ({
                bullet,
                score: similarityScores[index]
            }));

            // Filter based on similarity threshold
            const filteredScores = pairedScores.filter(item => item.score >= CONFIG.matching.similarityThreshold);

            if (filteredScores.length === 0) {
                logger.info('No bullet points meet the similarity threshold');
                return [];
            }

            // Sort the filtered bullet points by score in descending order
            const sortedScores = filteredScores.sort((a, b) => b.score - a.score);

            // Select top N bullet points (e.g., top 5)
            const topN = 5;
            const topMatches = sortedScores.slice(0, topN);

            // Store the matches in Firestore
            await this.storeMatchingResults(googleId, docId, topMatches);

            return topMatches;

        } catch (error) {
            logger.error('Error processing match:', error);
            throw error;
        }
    },

    async storeMatchingResults(googleId, docId, topMatches) {
        try {
            const matchingResultsRef = db.collection('users')
                .doc(googleId)
                .collection('jobs')
                .doc(docId)
                .collection('MatchingResults');

            await matchingResultsRef.add({
                topMatches,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            logger.info('Stored matching results successfully');
        } catch (error) {
            logger.error('Error storing matching results:', error);
            throw error;
        }
    }
};

// ===== Main HTTP Function =====
exports.embeddingQualRes = onRequest((req, res) => {
    return cors(req, res, async () => {
        try {
            // Log the incoming request
            logger.info('Embedding Match function called', req.body);

            const { googleId, docId, jobRequirement } = req.body;

            // Validate required fields
            if (!googleId || !docId || !jobRequirement) {
                logger.error('Missing required parameters');
                return res.status(400).json({ 
                    error: 'Missing required parameters',
                    received: { googleId, docId, jobRequirement }
                });
            }

            // Retrieve job document data
            const jobData = await firestoreService.getJobDocument(googleId, docId);

            // Add the job requirement to jobData for processing
            jobData.requirement = jobRequirement;

            // Process the match
            const topMatches = await matchingService.processMatch(googleId, docId, jobData);

            // Return success response
            res.status(200).json({
                message: 'Embedding match process completed successfully',
                topMatches,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error in embedding match:', error);
            res.status(500).json({ 
                error: 'Internal server error',
                message: error.message,
                received: req.body
            });
        }
    });
});
