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
            requirements: [],      // All requirements and qualifications
            responsibilities: [],  // Job duties and tasks
            tools: new Set(),
            experience: []       // Technical skills and technologies
        };

        const patterns = {
            // Comprehensive requirements pattern combining all qualification-related sections
            requirements: /(?:minimum qualifications|basic qualifications|required|requirements|qualifications|what we['']re looking for|what you need|key qualifications|required skills|preferred qualifications|who you are|ideal candidate|what you bring|candidate requirements|must have|you should have|you will need|job requirements|position requirements|skills needed|required experience|essential requirements|desired skills|candidate profile|your profile|your background|what it takes|skill requirements|required attributes|experience required|experience|background|track record|work history|previous roles|prerequisites?|about you)[:\s]+(.*?)(?=(?:\n\s*\n|\n(?:[A-Z][a-z]|\n|About|Responsibilities||Company))|$)/is,
            
            // Comprehensive responsibilities pattern
            responsibilities: /(?:responsibilities|job responsibilities|the role|what you['']ll do|key responsibilities|essential functions|how you will fulfill your potential|key duties|job description|position overview|role overview|day to day|main duties|core responsibilities|your role|job duties|primary responsibilities|principal duties|position responsibilities|what you will be doing|your responsibilities|job function|role description|primary duties|key activities|scope of work|job scope|objectives|mission|purpose of role)[:\s]+(.*?)(?=(?:\n\s*\n|\n(?:[A-Z][a-z]|\n|About|Requirements|Qualifications|Benefits|Company|Location))|$)/is,
            
            // Pattern for technical skills
            technicalSkills: /(?:proficiency|experience|expertise|knowledge|skills?|mastery|understanding|background|competency|familiarity|capability|literacy|fluency|command)\s+(?:with|in|of|using)\s+([^.]*?)(?=\.|\n|,|\(|or)/gi,
        
        };

        // Helper function to clean text
        const cleanText = (text) => {
            return text.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 2)
                .map(line => line.replace(/^[-•*]\s*/, '').trim())
                .filter(line => !line.match(/^[A-Za-z\s&]+:$/));
        };

        // Extract main sections
        console.log('\n=== Extracting Main Sections ===');
        ['requirements', 'responsibilities'].forEach(section => {
            try {
                const match = text.match(patterns[section]);
                if (match) {
                    console.log(`\nFound ${section} section:`, match[1]);
                    const cleanedSection = cleanText(match[1]);
                    console.log(`Cleaned ${section}:`, cleanedSection);
                    extracted[section] = cleanedSection;
                } else {
                    logger.warn(`No match found for ${section} section`);
                }
            } catch (error) {
                logger.error(`Error processing ${section} section:`, error);
                extracted[section] = [];
            }
        });

        // Extract technical skills and tools
        console.log('\n=== Extracting Technical Skills ===');
        
        // From explicit skill mentions
        const skillMatches = text.matchAll(patterns.technicalSkills);
        for (const match of skillMatches) {
            const skills = match[1]
                .split(/[,\s]+/)
                .map(s => s.trim())
                .filter(s => s.length > 1);
            
            skills.forEach(skill => {
                const cleanSkill = skill.replace(/[,.]$/, '');
                if (cleanSkill.length > 1 && !cleanSkill.match(/^(and|or|with|using)$/i)) {
                    console.log('Found skill mention:', cleanSkill);
                    extracted.tools.add(cleanSkill);
                }
            });
        }

        // From technology keywords
        const techMatches = text.match(patterns.technologies) || [];
        techMatches.forEach(tech => {
            const cleanTech = tech.trim().replace(/[,.]$/, '');
            console.log('Found technology:', cleanTech);
            extracted.tools.add(cleanTech);
        });

        // Additional Requirements section
        const additionalReqMatch = text.match(/Additional Requirements:[^\n]*\n(.*?)(?=\n\s*\n|$)/s);
        if (additionalReqMatch) {
            console.log('\n=== Processing Additional Requirements ===');
            const additionalReqs = cleanText(additionalReqMatch[1]);
            console.log('Additional requirements:', additionalReqs);
            extracted.requirements = [...extracted.requirements, ...additionalReqs];
        }

        // Final cleanup
        console.log('\n=== Final Cleanup ===');
        extracted.tools = Array.from(extracted.tools);
        
        for (const [key, value] of Object.entries(extracted)) {
            if (Array.isArray(value)) {
                extracted[key] = [...new Set(value)]
                    .map(item => item.trim())
                    .filter(item => item.length > 2);
                console.log(`\nFinal ${key}:`, extracted[key]);
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
    'users/{userId}/scrapedjobsDEBUG/{jobId}',
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