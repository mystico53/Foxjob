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
      jobDescriptionExtracted: 'qualities-resumetext-added',
      matchingCompleted: 'embeddings-matched'
    },
    matching: {
      similarityThreshold: 0.75,
      embeddingModel: 'text-embedding-ada-002'
    }
};

// ===== Schema Definition =====
const matchResultSchema = z.object({
    timestamp: z.date(),
    matchDetails: z.object({
      similarityScore: z.number(),
      keySkillMatches: z.array(z.string()),
      recommendations: z.string()
    })
});

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

    async updateQualityEmbeddingScore(googleId, docId, qualityId, embeddingScore) {
        try {
            const updateData = {};
            updateData[`qualities.${qualityId}.embeddingScore`] = embeddingScore;
            
            await db.collection('users')
                .doc(googleId)
                .collection('jobs')
                .doc(docId)
                .update(updateData);
            
            logger.info('Updated embedding score for quality:', { qualityId, embeddingScore });
        } catch (error) {
            logger.error('Error updating quality embedding score:', error);
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

    async getEmbedding(text) {
        if (!this.openai) this.initialize();

        const response = await this.openai.embeddings.create({
            model: CONFIG.matching.embeddingModel,
            input: this.preprocessText(text),
        });

        return response.data[0].embedding;
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
        
        for (const [qualityId, quality] of Object.entries(qualities)) {
            // Skip if no resumeText
            if (!quality.resumeText) {
                logger.warn(`No resumeText found for quality ${qualityId}`);
                continue;
            }

            // Combine quality fields into a single text
            const qualityText = [
                quality.context,
                quality.evidence,
                quality.primarySkill,
                quality.successMetrics
            ].filter(Boolean).join(' ');

            // Add text comparison logging
            logger.info('Comparing texts:', {
                qualityId,
                jobQuality: qualityText.substring(0, 200) + '...',
                resumeText: quality.resumeText.substring(0, 200) + '...'
            });

            // Get embeddings
            const [qualityEmbedding, resumeEmbedding] = await Promise.all([
                embeddingService.getEmbedding(qualityText),
                embeddingService.getEmbedding(quality.resumeText)
            ]);

            // Calculate similarity
            const rawSimilarity = embeddingService.calculateSimilarity(
                qualityEmbedding, 
                resumeEmbedding
            );

            // Calculate adjusted score
            const adjustedScore = this.calculateAdjustedScore(rawSimilarity);

            // Store the embedding score for this quality
            await firestoreService.updateQualityEmbeddingScore(
                googleId,
                docId,
                qualityId,
                adjustedScore
            );

            logger.info('Quality embedding processed:', {
                qualityId,
                rawSimilarity,
                adjustedScore,
                normalized: (rawSimilarity - 0.65) / 0.3, // Add scoring steps
                sigmoid: 1 / (1 + Math.exp(-10 * ((rawSimilarity - 0.65) / 0.3 - 0.5)))
            });
        }

              return true;
          } catch (error) {
              logger.error('Error processing match:', error);
              throw error;
          }
      },

    calculateAdjustedScore(rawSimilarity) {
      // Expand the expected similarity range (0.65-0.95) to better differentiate scores
      const normalized = Math.max(0, (rawSimilarity - 0.65) / 0.3);
      
      // Use sigmoid function to create a more nuanced S-curve
      // This will create more differentiation in the middle ranges
      const sigmoid = 1 / (1 + Math.exp(-10 * (normalized - 0.5)));
      
      // Apply logarithmic scaling to further separate scores
      const scaled = Math.log10(1 + 9 * sigmoid) / Math.log10(10);
      
      // Scale to 0-100 and round to nearest integer
      return Math.round(scaled * 100);
  }
};

// ===== Main Function =====
exports.embeddingMatch = onMessagePublished(
    { topic: CONFIG.topics.jobDescriptionExtracted },
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

            // Get job document
            const jobData = await firestoreService.getJobDocument(googleId, docId);

            // Process matches for each quality
            await matchingService.processMatch(googleId, docId, jobData);

            logger.info('Match processing completed', { googleId, docId });

        } catch (error) {
            logger.error('Error in match processing:', error);
            throw error;
        }
    });