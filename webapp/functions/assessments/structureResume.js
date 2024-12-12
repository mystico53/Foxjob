const { onRequest } = require('firebase-functions/v2/https');
const cors = require('cors')({ origin: true });
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { Firestore } = require("firebase-admin/firestore");
const { callAnthropicAPI } = require('../services/anthropicService');

// Initialize Firestore
const db = admin.firestore();

const CONFIG = {
  instructions: {
    resumeParsing: `
    You are an expert resume analyst. Parse this resume text into a structured format.
    
    Your response MUST be a valid JSON object following this structure:
    {
      "summary": "executive summary if available, otherwise empty string",
      "companies": [
        {
          "name": "company name",
          "positions": [
            {
              "title": "position title",
              "bullets": [
                "achievement or responsibility 1",
                "achievement or responsibility 2"
              ]
            }
          ]
        }
      ],
      "education": "all education details if available, otherwise empty string",
      "other": "any other relevant sections not captured above"
    }

    CRITICAL RULES:
    1. Only create sections that are clearly present in the resume
    2. Maintain original bullet points and achievements exactly as written
    3. Group positions under their respective companies
    4. Include dates with company names when available
    5. Ensure all strings are properly escaped
    6. Do not fabricate or assume information
    7. If a section is not present, use an empty string or empty array as appropriate
    `
  }
};

const firestoreService = {
  async getResumeText(userId) {
    logger.info('Getting resume for user:', userId);
    
    const userCollectionsRef = db.collection('users').doc(userId).collection('UserCollections');
    const resumeQuery = userCollectionsRef.where('type', '==', 'Resume').limit(1);
    const resumeSnapshot = await resumeQuery.get();

    if (resumeSnapshot.empty) {
      throw new Error(`No resume found for user ID: ${userId}`);
    }

    const resumeDoc = resumeSnapshot.docs[0];
    return resumeDoc.data().extractedText;
  }
};

const resumeProcessor = {
  async structureResume(resumeText) {
    try {
      const result = await callAnthropicAPI(resumeText, CONFIG.instructions.resumeParsing);
      
      if (!result || result.error) {
        throw new Error(result?.message || 'Error processing resume');
      }

      let parsedContent;
      try {
        let cleanedText = result.extractedText;
        if (typeof cleanedText === 'string') {
          cleanedText = cleanedText.replace(/^\uFEFF/, '');
          cleanedText = cleanedText.replace(/\r\n/g, '\n');
          cleanedText = cleanedText.trim();
          
          parsedContent = JSON.parse(cleanedText);
        } else {
          parsedContent = result.extractedText;
        }
      } catch (parseError) {
        logger.error('Error parsing API response:', parseError);
        throw new Error(`Invalid resume parsing response: ${parseError.message}`);
      }

      this.validateResumeStructure(parsedContent);
      return parsedContent;

    } catch (error) {
      logger.error('Error in structureResume:', error);
      throw new Error(`Resume structuring failed: ${error.message}`);
    }
  },

  validateResumeStructure(data) {
    const requiredFields = ['summary', 'companies', 'education', 'other'];
    for (const field of requiredFields) {
      if (!Object.hasOwn(data, field)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!Array.isArray(data.companies)) {
      throw new Error('Companies must be an array');
    }

    data.companies.forEach((company, index) => {
      if (!company.name) {
        throw new Error(`Company at index ${index} missing name`);
      }
      if (!Array.isArray(company.positions)) {
        throw new Error(`Company ${company.name} positions must be an array`);
      }

      company.positions.forEach((position, posIndex) => {
        if (!position.title) {
          throw new Error(`Position at index ${posIndex} in ${company.name} missing title`);
        }
        if (!Array.isArray(position.bullets)) {
          throw new Error(`Position ${position.title} bullets must be an array`);
        }
      });
    });

    if (typeof data.summary !== 'string' || 
        typeof data.education !== 'string' || 
        typeof data.other !== 'string') {
      throw new Error('Summary, education, and other must be strings');
    }
  }
};

exports.structureResume = onRequest((req, res) => {
    return cors(req, res, async () => {
      try {
        // Log the incoming request
        logger.info('Structure resume function called', req.body);
  
        const { userId } = req.body;
  
        // Validate required fields
        if (!userId) {
          logger.error('Missing required parameters');
          return res.status(400).json({ 
            error: 'Missing required parameters',
            received: { userId }
          });
        }
  
        // Reference to UserCollections
        const userCollectionsRef = db.collection('users').doc(userId).collection('UserCollections');
  
        // Get resume document
        const resumeQuery = userCollectionsRef.where('type', '==', 'Resume').limit(1);
        const resumeSnapshot = await resumeQuery.get();
  
        if (resumeSnapshot.empty) {
          throw new Error(`No resume found for user ID: ${userId}`);
        }
  
        const resumeDoc = resumeSnapshot.docs[0];
        const resumeData = resumeDoc.data();
        const resumeText = resumeData.extractedText;
  
        // Process the resume
        const structuredResume = await resumeProcessor.structureResume(resumeText);
  
        // Update the same resume document with structuredData
        await resumeDoc.ref.update({
          structuredData: structuredResume,
          status: 'processed',
          createdAt: Firestore.FieldValue.serverTimestamp()
        });
  
        console.log('Structured Resume:', JSON.stringify(structuredResume, null, 2));
  
        // Return success response
        res.status(200).json({
          message: 'Resume structured and updated successfully',
          structuredResume,
          documentId: resumeDoc.id,
          timestamp: new Date().toISOString()
        });
  
      } catch (error) {
        logger.error('Error processing resume:', error);
        res.status(500).json({ 
          error: 'Internal server error',
          message: error.message,
          received: req.body
        });
      }
    });
  });