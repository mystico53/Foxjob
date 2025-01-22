const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { OpenAI } = require('openai');
const { initializeApp } = require('firebase-admin/app');
const { FieldValue } = require("firebase-admin/firestore");

if (!admin.apps.length) {
    initializeApp();
}

// Initialize
const db = admin.firestore();

// ===== Config =====
const CONFIG = {
    matching: {
        similarityThreshold: 0.75,
        embeddingModel: 'text-embedding-ada-002'
    },
    function: {
        timeoutSeconds: 120
    }
};

// ===== Job Parser Service =====
const jobParserService = {
    extractJobInfo(text) {
        console.log('\n=== Input Text ===\n', text);

        const extracted = {
            requirements: [],      
            responsibilities: [],  
            tools: new Set(),     
            experience: []        
        };

        const patterns = {
            // Split document into major sections first
            sections: {
                education: /education(?:\s*&\s*experience)?:?[\s\n]+(.*?)(?=\n\s*\n|$)/is,
                responsibilities: /(?:depth\s*&\s*scope|responsibilities|job\s*description):?[\s\n]+(.*?)(?=\n\s*(?:education|physical|who\s*we\s*are)|$)/is,
                physical: /physical\s*requirements:?[\s\n]+(.*?)(?=\n\s*(?:who\s*we\s*are|additional|$))/is
            },

            // Pattern for bullet points or numbered lists
            bulletPoints: /(?:^|\n)\s*[•\-\*\d]+\s*(.+?)(?=\n|$)/gm,

            // Pattern for skills and tools, excluding common words
            skills: /(?:proficient|experience|expertise|knowledge|skills?|mastery|understanding|competency|familiarity)\s+(?:with|in|of|using)\s+([^.]*?)(?=\.|\n|,|\(|or)/gi,
            
            // Pattern for years of experience
            yearsExp: /(\d+(?:\+|\s*-\s*\d+)?)\s*(?:years?|yrs?)(?:\s+of)?\s+(?:work\s+)?experience/gi
        };

        // Helper function to clean text
        const cleanText = (text) => {
            if (!text) return [];
            return text
                .split('\n')
                .map(line => line.trim())
                .filter(line => {
                    // Filter out empty lines and common headers
                    return line.length > 2 && 
                           !line.match(/^(?:requirements?|responsibilities|education|experience|physical):?$/i);
                })
                .map(line => {
                    // Clean up bullet points and leading symbols
                    return line.replace(/^[-•*\d]+\s*/, '').trim();
                });
        };

        // Extract sections
        const sections = {};
        for (const [name, pattern] of Object.entries(patterns.sections)) {
            const match = text.match(pattern);
            if (match) {
                sections[name] = match[1];
            }
        }

        // Process responsibilities
        if (sections.responsibilities) {
            // Extract bullet points from responsibilities section
            const bulletPoints = [...sections.responsibilities.matchAll(patterns.bulletPoints)]
                .map(match => match[1].trim())
                .filter(point => point.length > 10);  // Filter out very short points

            extracted.responsibilities = bulletPoints.length > 0 ? 
                bulletPoints : 
                cleanText(sections.responsibilities);
        }

        // Process education and experience
        if (sections.education) {
            // Extract requirements including education and experience
            const requirements = [...sections.education.matchAll(patterns.bulletPoints)]
                .map(match => match[1].trim())
                .filter(point => point.length > 10);

            extracted.requirements = requirements.length > 0 ? 
                requirements : 
                cleanText(sections.education);

            // Extract years of experience
            const expMatches = sections.education.matchAll(patterns.yearsExp);
            for (const match of expMatches) {
                extracted.experience.push(match[0]);
            }
        }

        // Extract skills and tools
        const skillMatches = text.matchAll(patterns.skills);
        const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
        
        for (const match of skillMatches) {
            const skills = match[1]
                .split(/[,\s]+/)
                .map(s => s.trim().toLowerCase())
                .filter(s => {
                    return s.length > 2 && 
                           !commonWords.has(s) &&
                           !s.match(/^(and|or|with|using)$/i);
                });
            
            skills.forEach(skill => {
                const cleanSkill = skill.replace(/[,.]$/, '');
                if (cleanSkill.length > 2) {
                    extracted.tools.add(cleanSkill);
                }
            });
        }

        // Final cleanup and deduplication
        extracted.tools = Array.from(extracted.tools);
        for (const [key, value] of Object.entries(extracted)) {
            if (Array.isArray(value)) {
                extracted[key] = [...new Set(value)]
                    .map(item => item.trim())
                    .filter(item => item.length > 2);
            }
        }

        return extracted;
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

    async updateJobMatchScore(userId, jobId, matchScore, parsedJob) {
        try {
            await db.collection('users')
                .doc(userId)
                .collection('scrapedjobs')
                .doc(jobId)
                .update({
                    embeddingMatch: {
                        score: matchScore,
                        timestamp: FieldValue.serverTimestamp(),
                    },
                    parsedDetails: parsedJob,
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
            // Parse job description
            const parsedJob = jobParserService.extractJobInfo(jobDescription);
            
            logger.debug('Parsed job info:', {
                severity: 'DEBUG',
                sections: Object.keys(parsedJob),
                requirements: parsedJob.requirements.length,
                responsibilities: parsedJob.responsibilities.length,
                tools: parsedJob.tools.length,
                experience: parsedJob.experience.length
            });

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
            const score = this.calculateAdjustedScore(similarity);
            
            return {
                score,
                parsedJob
            };
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
    'users/{userId}/scrapedjobs/{jobId}',
    async (event) => {
        logger.debug('Trigger received event:', {
            path: event.data.ref.path,
            exists: event.data.exists,
            data: JSON.stringify(event.data.data())
        });

        try {
            const { userId, jobId } = event.params;
            const jobData = event.data.data();
            
            logger.info('Starting job matching process', { userId, jobId });

            // Extract job description from the document and handle array format
            const jobDescription = jobData.details?.description;
            if (!jobDescription || !Array.isArray(jobDescription)) {
                throw new Error('Job description not found or in invalid format');
            }
            
            // Join array elements into a single string
            const jobDescriptionText = jobDescription.join('\n');

            // Get resume text
            const resumeText = await firestoreService.getResumeText(userId);
            if (!resumeText) {
                logger.warn('No resume text found for user', { userId });
                return;
            }

            // Process the match
            const { score: matchScore, parsedJob } = await matchingService.processMatch(
                jobDescriptionText, 
                resumeText
            );

            // Update the job document with the match score and parsed details
            await firestoreService.updateJobMatchScore(userId, jobId, matchScore, parsedJob);

            logger.info('Job matching completed', { userId, jobId, matchScore });

        } catch (error) {
            logger.error('Error in job matching process:', error);
            throw error;
        }
    });