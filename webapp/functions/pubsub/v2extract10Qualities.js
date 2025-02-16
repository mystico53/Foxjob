const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { PubSub } = require('@google-cloud/pubsub');
const { FieldValue } = require("firebase-admin/firestore");

// Initialize
const db = admin.firestore();
const pubSubClient = new PubSub();

// ===== Config =====
const CONFIG = {
  topics: {
    qualityExtractionRequests: 'quality-extraction-requests',
    qualitiesGathered: 'ten-qualities-gathered'
  },
  collections: {
    users: 'users',
    scrapedJobs: 'scrapedJobs'
  },
  defaultValues: {
    naText: 'na'
  },
  instructions: {
    qualitiesExtraction: `Using the 'Count, Context, and Criticality' method, analyze the job description to identify exactly 7 crucial qualities, distributed across Required Categories below.

Required Categories (must include at least 1 from each, maximum 3 from any single category):
A. Technical/Domain Expertise (hard skills, technical knowledge, tools)
B. Experience/Background (years, industry knowledge, achievements)
C. Core Responsibilities (primary job functions, key deliverables)
D. Work Approach (must include both D1 and D2):
   D1. Professional Skills (communication, organization, leadership)
   D2. Work Style (collaboration, autonomy, adaptability)

Format:
Quality X: [Primary Skill/Requirement] | Criticality: [X/10] | Category: [A/B/C/D] | Evidence: [2-3 supporting quotes, separated by ';']

Criticality Scoring (use exact numbers, no decimals):
10: Explicit requirements in title/first paragraph OR multiple must-have mentions
9: Key responsibilities mentioned multiple times across different contexts
8: Explicitly stated requirements OR skills central to multiple responsibilities
7: Important supporting skills mentioned in multiple contexts
6: Clearly stated but supporting requirements
5 or lower: Implied or nice-to-have skills

Quality Selection Rules:
1. If two qualities share more than 50% of their evidence quotes, combine them and add a new distinct quality
2. When the same skill appears in general and specific contexts, use the specific application
3. Prioritize qualities that combine what (responsibilities) with how (approach)
4. Must include at least one quality that reflects work environment fit
5. Skills appearing across multiple categories should be evaluated based on their most critical application

Evidence Selection Priority:
1. Quotes showing both requirement and application context
2. Quotes demonstrating skill impact or importance
3. Quotes showing relationship to other role aspects
4. Maximum 3 most relevant quotes per quality
5. When combining quotes, ensure they demonstrate different aspects

Evaluation Matrix:
- Criticality (30%): Requirement language and placement
- Context Diversity (30%): Appearance in different role aspects
- Application Specificity (20%): How clearly usage is defined
- Work Style Fit (20%): Alignment with environment/culture

Output Requirements:
1. Exactly 7 qualities
2. At least 1 quality from each main category (A,B,C,D)
3. Both D1 and D2 subcategories must be represented
4. Maximum 3 qualities from any category
5. Order by criticality score (highest to lowest)
6. Present as 7 consecutive fields only
7. Complete information in single lines using pipe separators
8. No additional text or explanations`
  }
};

// ===== Firestore Service =====
const firestoreService = {
  getDocRef(userId, jobId) {
    return db.collection('users')
      .doc(userId)
      .collection('scrapedJobs')
      .doc(jobId);
  },

  async getJobDocument(docRef) {
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      logger.warn('404:', { path: docRef.path });
      throw new Error(`Document not found: ${docRef.path}`);
    }

    const data = snapshot.data();
    return data;
  },

  async updateJobQualities(docRef, qualities) {
    await docRef.update({
      qualities: qualities,
      'processing.status': 'qualities extracted',
      lastProcessed: FieldValue.serverTimestamp(),
    });
  }
};

// ===== PubSub Service =====
const pubSubService = {
  parseMessage(message) {
    if (!message.data) {
      throw new Error('No message data received');
    }
    const data = message.json;
    if (!data) {
      throw new Error('Invalid JSON in message data');
    }
    return data;
  },

  validateMessageData(data) {
    const { userId, jobId } = data;
    if (!userId || !jobId) {
      throw new Error('Missing required fields in message data');
    }
    return { userId, jobId };
  },

  async ensureTopicExists(topicName) {
    try {
      await pubSubClient.createTopic(topicName);
    } catch (err) {
      if (err.code !== 6) { // 6 = already exists
        throw err;
      }
    }
  },

  async publishMessage(topicName, message) {
    await this.ensureTopicExists(topicName);
    const messageId = await pubSubClient
      .topic(topicName)
      .publishMessage({
        data: Buffer.from(JSON.stringify(message)),
      });
    logger.info(`Message ${messageId} published to ${topicName}`);
    return messageId;
  }
};

// ===== Anthropic Service =====
const { callGeminiAPI } = require('../services/geminiService');

// ===== Qualities Parser =====
const qualitiesParser = {
  parseQualities(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const qualities = {};

    lines.forEach((line, index) => {
      const qualityNumber = `Q${index + 1}`;
      
      const components = line.split('|').map(s => s.trim());
      
      let primarySkill = '';
      let criticality = '';
      let evidence = '';
      
      components.forEach(component => {
        const [key, value] = component.split(':').map(s => s.trim());
        
        if (component.startsWith('Quality')) {
          primarySkill = value;
        } else if (component.toLowerCase().includes('criticality')) {
          criticality = value;
        } else if (component.toLowerCase().includes('evidence')) {
          evidence = value;
        }
      });

      qualities[qualityNumber] = {
        primarySkill,
        criticality,
        evidence,
      };
    });

    if (Object.keys(qualities).length === 0) {
      throw new Error('No valid qualities extracted from the response');
    }

    logger.info('Parsed qualities:', qualities);

    return qualities;
  }
};

// ===== Error Handlers =====
const errorHandlers = {
  async handleProcessingError(error, docRef, context = {}) {
    logger.error('Processing Error:', error, context);
    throw error;
  },

  handleAndThrow(error, message) {
    logger.error(message, error);
    throw error;
  }
};

// ===== Main Function =====
exports.extractJobQualities = onMessagePublished(
  {
    topic: CONFIG.topics.qualityExtractionRequests,
  },
  async (event) => {
    let docRef;
    const message = event.data;
    try {
      // Parse and validate message
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
      
      const { userId, jobId } = pubSubService.validateMessageData(messageData);
      logger.info(`Processing qualities for userId: ${userId}, jobId: ${jobId}`);

      // Get Firestore document
      docRef = firestoreService.getDocRef(userId, jobId);
      const jobData = await firestoreService.getJobDocument(docRef);
      
      // Process job qualities
      const jobDescription = jobData.details?.description;
      if (!jobDescription) {
        throw new Error('Invalid job description for processing');
      }

      const apiResponse = await callGeminiAPI(
        jobDescription,
        CONFIG.instructions.qualitiesExtraction,
        {
          model: 'gemini-2.0-flash', // Using pro for more structured output
          //temperature: 0.3,  // Lower temperature for consistent formatting
          //maxOutputTokens: 2048
        }
      );
      
      if (apiResponse.error) {
        throw new Error(`API Error: ${apiResponse.message}`);
      }

      const qualitiesText = apiResponse.extractedText;
      logger.info('Raw qualities text:', { qualitiesText });
      
      // Parse and validate qualities
      const qualities = qualitiesParser.parseQualities(qualitiesText);
      
      // Update Firestore
      await firestoreService.updateJobQualities(docRef, qualities);

      // Publish next message
      await pubSubService.publishMessage(
        CONFIG.topics.qualitiesGathered,
        { userId, jobId }
      );

    } catch (error) {
      await errorHandlers.handleProcessingError(error, docRef, { message });
    }
  });