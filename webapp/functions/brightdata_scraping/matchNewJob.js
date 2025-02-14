const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { OpenAI } = require('openai');
const { initializeApp } = require('firebase-admin/app');
const { FieldValue } = require("firebase-admin/firestore");

if (!admin.apps.length) {
    initializeApp();
}

const db = admin.firestore();

// ===== Config =====
const CONFIG = {
    matching: {
        embeddingModel: 'text-embedding-ada-002'
    },
    function: {
        timeoutSeconds: 120
    }
};

// ===== Firestore Service =====
const firestoreService = {
    async getResumeText(userId) {
        try {
            const userCollectionsRef = db.collection('users')
                .doc(userId)
                .collection('UserCollections');
            
            const resumeQuery = userCollectionsRef.where('type', '==', 'Resume').limit(1);
            const resumeSnapshot = await resumeQuery.get();

            if (resumeSnapshot.empty) {
                logger.warn(`No resume found for user ID: ${userId}`);
                return null;
            }

            const resumeDoc = resumeSnapshot.docs[0];
            const resumeText = resumeDoc.data().extractedText;

            if (!resumeText) {
                logger.warn(`No extracted text found in resume for user ID: ${userId}`);
                return null;
            }

            return resumeText;

        } catch (error) {
            logger.error('Error getting resume text:', error);
            throw error;
        }
    },

    async updateJobMatchScore(userId, jobId, matchScore) {
        try {
            await db.collection('users')
                .doc(userId)
                .collection('scrapedJobs')
                .doc(jobId)
                .update({
                    embeddingMatch: {
                        score: matchScore,
                        timestamp: FieldValue.serverTimestamp(),
                    },
                    lastProcessed: FieldValue.serverTimestamp()
                });
            logger.info('Updated job match score:', { userId, jobId, matchScore });
        } catch (error) {
            logger.error('Error updating job match score:', error);
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

    async getEmbeddings(texts) {
        if (!this.openai) this.initialize();
        
        const preprocessedTexts = Array.isArray(texts) ? texts.map(this.preprocessText) : [this.preprocessText(texts)];
        
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
    async processMatch(jobDescription, resumeText) {
        try {
            // Get embeddings for both texts
            const [jobEmbedding, resumeEmbedding] = await Promise.all([
                embeddingService.getEmbeddings(jobDescription),
                embeddingService.getEmbeddings(resumeText)
            ]);

            // Calculate similarity
            const similarity = embeddingService.calculateSimilarity(
                jobEmbedding[0],
                resumeEmbedding[0]
            );

            // Calculate final score
            return this.calculateAdjustedScore(similarity);
        } catch (error) {
            logger.error('Error processing match:', error);
            throw error;
        }
    },

    calculateAdjustedScore(rawSimilarity) {
        const normalized = Math.max(0, (rawSimilarity - 0.65) / 0.3);
        const sigmoid = 1 / (1 + Math.exp(-10 * (normalized - 0.5)));
        const scaled = Math.log10(1 + 9 * sigmoid) / Math.log10(10);
        return Math.round(scaled * 100);
    }
};

// ===== Main Function =====
exports.matchNewJob = onDocumentCreated(
    'users/{userId}/scrapedJobs/{jobId}',
    async (event) => {
        try {
            const { userId, jobId } = event.params;
            const jobData = event.data.data();
            
            logger.info('Starting job matching process', { userId, jobId });

            const jobDescription = jobData.details?.description;
            if (!jobDescription || typeof jobDescription !== 'string') {
                throw new Error('Job description not found or in invalid format');
            }

            const resumeText = await firestoreService.getResumeText(userId);
            if (!resumeText) {
                logger.warn('No resume text found for user', { userId });
                return;
            }

            const matchScore = await matchingService.processMatch(
                jobDescription, 
                resumeText
            );

            await firestoreService.updateJobMatchScore(userId, jobId, matchScore);

            logger.info('Job matching completed', { userId, jobId, matchScore });

        } catch (error) {
            logger.error('Error in job matching process:', error);
            throw error;
        }
    });