const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { OpenAI } = require('openai');
const { FieldValue } = require("firebase-admin/firestore");

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// ===== Config =====
const CONFIG = {
    matching: {
        embeddingModel: 'text-embedding-ada-002',
        qualityWeightMultiplier: 1.5 // Adjust if you want to weight qualities differently
    },
    topics: {
        qualityMatchingRequests: 'ten-qualities-gathered',
        matchingComplete: 'matching-complete'
    }
};

// ===== Firestore Service =====
const firestoreService = {
    async getJobDocument(userId, jobId) {
        try {
            const docRef = db.collection('users')
                .doc(userId)
                .collection('scrapedJobs')
                .doc(jobId);
            
            const doc = await docRef.get();
            if (!doc.exists) {
                throw new Error('Job document not found');
            }
            
            return {
                docRef,
                data: doc.data()
            };
        } catch (error) {
            logger.error('Error getting job document:', error);
            throw error;
        }
    },

    async getResumeText(userId) {
        try {
            const userCollectionsRef = db.collection('users')
                .doc(userId)
                .collection('UserCollections');
            
            const resumeQuery = userCollectionsRef.where('type', '==', 'Resume').limit(1);
            const resumeSnapshot = await resumeQuery.get();
    
            if (resumeSnapshot.empty) {
                throw new Error(`No resume found for user ID: ${userId}`);
            }
    
            const resumeDoc = resumeSnapshot.docs[0];
            const structuredData = resumeDoc.data().structuredData;  // Changed this line
    
            if (!structuredData) {
                throw new Error('No structured data found in resume');
            }
    
            return structuredData;
        } catch (error) {
            logger.error('Error getting resume data:', error);
            throw error;
        }
    },

    async updateQualityMatchScores(docRef, qualityScores, finalScore) {
        try {
            // Clean the quality scores to remove undefined values
            const cleanedScores = {};
            for (const [key, score] of Object.entries(qualityScores)) {
                cleanedScores[key] = {
                    similarity: score.similarity,
                    criticality: score.criticality,
                    weightedScore: score.weightedScore,
                    bestMatchingChunk: score.bestMatchingChunk,
                    matchType: score.matchType || 'unknown'
                };
                
                // Only add company/position if they exist
                if (score.company) {
                    cleanedScores[key].company = score.company;
                }
                if (score.position) {
                    cleanedScores[key].position = score.position;
                }
            }
    
            await docRef.update({
                qualityMatches: cleanedScores,
                qualityMatchScore: finalScore,
                'processing.status': 'quality matched',
                lastProcessed: FieldValue.serverTimestamp()
            });
            
            logger.info('Updated quality match scores:', { 
                scores: Object.entries(cleanedScores).map(([key, value]) => ({
                    quality: key,
                    similarity: value.similarity,
                    criticality: value.criticality,
                    bestMatch: value.bestMatchingChunk
                })),
                finalScore 
            });
        } catch (error) {
            logger.error('Error updating quality match scores:', error);
            throw error;
        }
    }
};

// ===== Embedding Service =====
const embeddingService = {
    openai: null,

    initialize() {
        const apiKey = process.env.OPENAI_API_KEY;
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
    // Extract all sections from structured resume
    getResumeSections(structuredData) {
        const sections = [];
        
        // Add summary
        if (structuredData.summary) {
            sections.push({
                text: structuredData.summary,
                type: 'summary'
            });
        }

        // Add all position titles and bullets
        structuredData.companies.forEach(company => {
            company.positions.forEach(position => {
                // Add position title
                sections.push({
                    text: `${position.title} at ${company.name}`,
                    type: 'title'
                });

                // Add each bullet point
                position.bullets.forEach(bullet => {
                    sections.push({
                        text: bullet,
                        type: 'bullet',
                        position: position.title,
                        company: company.name
                    });
                });
            });
        });

        // Add education
        if (structuredData.education) {
            sections.push({
                text: structuredData.education,
                type: 'education'
            });
        }

        return sections;
    },

    async processQualityMatches(qualities, structuredResumeData) {
        try {
            // Get all resume sections
            const resumeSections = this.getResumeSections(structuredResumeData);
            
            logger.info('Processing resume sections:', {
                numberOfSections: resumeSections.length,
                sectionTypes: resumeSections.map(s => s.type)
            });

            // Get embeddings for all sections at once
            const sectionEmbeddings = await embeddingService.getEmbeddings(
                resumeSections.map(section => section.text)
            );

            const qualityScores = {};
            let totalWeightedScore = 0;
            let totalWeight = 0;

            for (const [qualityKey, quality] of Object.entries(qualities)) {
                logger.info(`Processing ${qualityKey}:`, {
                    primarySkill: quality.primarySkill,
                    criticality: quality.criticality
                });

                // Create focused quality text
                const qualityText = `${quality.primarySkill}. ${quality.evidence}`;
                const [qualityEmbedding] = await embeddingService.getEmbeddings(qualityText);
                
                // Find best matching section
                const sectionSimilarities = sectionEmbeddings.map((sectionEmb, index) => ({
                    similarity: embeddingService.calculateSimilarity(qualityEmbedding, sectionEmb),
                    section: resumeSections[index]
                }));

                // Sort by similarity to find best match
                const sortedSimilarities = [...sectionSimilarities]
                    .sort((a, b) => b.similarity - a.similarity);

                const bestMatch = sortedSimilarities[0];
                
                logger.info(`Best match for ${qualityKey}:`, {
                    matchType: bestMatch.section.type,
                    similarity: bestMatch.similarity,
                    text: bestMatch.section.text.substring(0, 100)
                });

                // Calculate weighted score
                const weight = parseFloat(quality.criticality) / 10;
                const weightedScore = bestMatch.similarity * weight;
                
                qualityScores[qualityKey] = {
                    similarity: Math.round(bestMatch.similarity * 100),
                    criticality: quality.criticality,
                    weightedScore: Math.round(weightedScore * 100),
                    bestMatchingChunk: bestMatch.section.text,
                    matchType: bestMatch.section.type,
                    company: bestMatch.section.company,
                    position: bestMatch.section.position
                };

                totalWeightedScore += weightedScore;
                totalWeight += weight;
            }

            // Calculate final score (0-100)
            const finalScore = Math.min(100, Math.round((totalWeightedScore / totalWeight) * 100));
            
            logger.info('Final calculation details:', {
                totalWeightedScore,
                totalWeight,
                finalScore
            });

            return {
                qualityScores,
                finalScore
            };
        } catch (error) {
            logger.error('Error processing quality matches:', error);
            throw error;
        }
    }
};

// ===== Main Function =====
exports.matchJobQualities = onMessagePublished(
    {
        topic: CONFIG.topics.qualityMatchingRequests,
    },
    async (event) => {
        try {
            // Parse message data
            const messageData = JSON.parse(
                Buffer.from(event.data.message.data, 'base64').toString()
            );
            
            const { userId, jobId } = messageData;
            if (!userId || !jobId) {
                throw new Error('Missing required fields in message data');
            }

            logger.info('Starting quality matching process', { userId, jobId });

            // Get job document and resume
            const { docRef, data: jobData } = await firestoreService.getJobDocument(userId, jobId);
            const structuredResumeData = await firestoreService.getResumeText(userId);

            // Validate qualities exist
            if (!jobData.qualities || Object.keys(jobData.qualities).length === 0) {
                throw new Error('No qualities found for matching');
            }

            // Process matches
            const { qualityScores, finalScore } = await matchingService.processQualityMatches(
                jobData.qualities,
                structuredResumeData  // Pass the structured data
            );

            // Update Firestore
            await firestoreService.updateQualityMatchScores(docRef, qualityScores, finalScore);

            logger.info('Quality matching completed', {
                userId,
                jobId,
                finalScore,
                qualityScores
            });

        } catch (error) {
            logger.error('Error in quality matching process:', error);
            throw error;
        }
    }
);