const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { OpenAI } = require('openai');
const { initializeApp } = require('firebase-admin/app');
const { FieldValue } = require("firebase-admin/firestore");
const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const { PubSub } = require('@google-cloud/pubsub');

if (!admin.apps.length) {
    initializeApp();
}

const db = admin.firestore();
const pubSubClient = new PubSub();

// ===== Config =====
const CONFIG = {
    matching: {
        embeddingModel: 'text-embedding-ada-002'
    },
    function: {
        timeoutSeconds: 120
    },
    pubsub: {
        qualityExtractionTopic: 'quality-extraction-requests'
    }
};

// ===== Firestore Service =====
const firestoreService = {
    async getResumeText(firebaseUid) {
        try {
            const userCollectionsRef = db.collection('users')
                .doc(firebaseUid)
                .collection('UserCollections');
            
            const resumeQuery = userCollectionsRef.where('type', '==', 'Resume').limit(1);
            const resumeSnapshot = await resumeQuery.get();

            if (resumeSnapshot.empty) {
                logger.warn(`No resume found for user ID: ${firebaseUid}`);
                return null;
            }

            const resumeDoc = resumeSnapshot.docs[0];
            const resumeText = resumeDoc.data().extractedText;

            if (!resumeText) {
                logger.warn(`No extracted text found in resume for user ID: ${firebaseUid}`);
                return null;
            }

            return resumeText;

        } catch (error) {
            logger.error('Error getting resume text:', error);
            throw error;
        }
    },

    async updateJobMatchScore(firebaseUid, jobId, matchScore) {
        try {
            await db.collection('users')
                .doc(firebaseUid)
                .collection('scrapedJobs')
                .doc(jobId)
                .update({
                    embeddingMatch: {
                        score: matchScore,
                        timestamp: FieldValue.serverTimestamp(),
                    },
                    'processing.status': 'embedded',
                    lastProcessed: FieldValue.serverTimestamp()
                });
            logger.info('Updated job match score and status:', { firebaseUid, jobId, matchScore });
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
exports.matchNewJob = onMessagePublished(
    {
        topic: 'job-embedding-requests',
    },
    async (event) => {
        try {
            logger.info('matchNewJob function called', { event: JSON.stringify(event) });
            
            if (!event.data?.message?.data) {
                logger.error('Invalid event structure:', { event: JSON.stringify(event) });
                return;
            }

            let messageData;
            try {
                messageData = JSON.parse(Buffer.from(event.data.message.data, 'base64').toString());
                logger.info('Parsed message data:', messageData);
            } catch (parseError) {
                logger.error('Failed to parse message data:', { 
                    error: parseError,
                    rawData: event.data.message.data 
                });
                return;
            }

            if (!messageData?.firebaseUid || !messageData?.jobId) {
                logger.error('Missing required fields in message:', messageData);
                return;
            }

            const { firebaseUid, jobId } = messageData;
            
            logger.info('Starting job matching process', { firebaseUid, jobId });

            // Get the job data from Firestore
            const jobDoc = await admin.firestore()
                .collection('users')
                .doc(firebaseUid)
                .collection('scrapedJobs')
                .doc(jobId)
                .get();

            if (!jobDoc.exists) {
                throw new Error('Job document not found');
            }

            const jobData = jobDoc.data();
            const jobDescription = jobData.details?.description;
            
            if (!jobDescription || typeof jobDescription !== 'string') {
                throw new Error('Job description not found or in invalid format');
            }

            const resumeText = await firestoreService.getResumeText(firebaseUid);
            if (!resumeText) {
                logger.warn('No resume text found for user', { firebaseUid });
                return;
            }

            const matchScore = await matchingService.processMatch(
                jobDescription, 
                resumeText
            );

            await firestoreService.updateJobMatchScore(firebaseUid, jobId, matchScore);

            // Only trigger quality extraction for jobs with match score >= 50
            if (matchScore >= 50) {
                try {
                    const topicName = CONFIG.pubsub.qualityExtractionTopic;
                    const message = {
                        data: Buffer.from(JSON.stringify({
                            firebaseUid,
                            jobId
                        })),
                    };
                    
                    const messageId = await pubSubClient.topic(topicName).publishMessage(message);
                    logger.info('Published quality extraction request:', {
                        messageId,
                        firebaseUid,
                        jobId,
                        topic: topicName
                    });
                } catch (pubError) {
                    logger.error('Failed to publish quality extraction request:', {
                        error: pubError,
                        firebaseUid,
                        jobId
                    });
                    // Note: We don't throw here to avoid failing the whole function
                    // if just the publish fails
                }
            }

            logger.info('Job matching completed', { firebaseUid, jobId, matchScore });

        } catch (error) {
            logger.error('Error in job matching process:', error);
            throw error;
        }
    }
);