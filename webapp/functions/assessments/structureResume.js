const { onRequest } = require('firebase-functions/v2/https');
const cors = require('cors')({ origin: true });
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const OpenAI = require('openai');
require('dotenv').config();
const { Firestore } = require("firebase-admin/firestore");

// Initialize OpenAI and Firestore
const openai = new OpenAI();
const db = admin.firestore();

async function summarizeResume(resumeText) {
  const instruction = `
    Analyze this resume text and provide a clear, professional summary.
    
    Format your response as a JSON object with exactly this structure:
    {
      "professionalSummary": "2-3 sentences highlighting key qualifications and experience",
      "keySkills": ["skill1", "skill2", "skill3"],
      "experienceHighlights": [
        "Key achievement or responsibility 1",
        "Key achievement or responsibility 2",
        "Key achievement or responsibility 3"
      ],
      "yearsOfExperience": "X years",
      "recommendedRoles": ["role1", "role2", "role3"]
    }

    Be specific and professional in your analysis.
  `;

  const promptContent = `${instruction}\nHere is the resume to analyze:\n${resumeText}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a professional resume analyst focused on extracting key qualifications and experience." },
        { role: "user", content: promptContent }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    logger.error('Error calling OpenAI API:', error);
    throw error;
  }
}

exports.structureResume = onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      logger.info('Structure resume function called', req.body);

      const { userId } = req.body;

      if (!userId) {
        logger.error('No userId provided');
        return res.status(400).json({ 
          error: 'Missing userId',
          received: req.body
        });
      }

      const userCollectionsRef = db
        .collection('users')
        .doc(userId)
        .collection('UserCollections');

      const resumeQuery = await userCollectionsRef
        .where('type', '==', 'Resume')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      if (resumeQuery.empty) {
        logger.error('No resume found for user:', userId);
        return res.status(404).json({
          error: 'No resume found'
        });
      }

      const resumeDoc = resumeQuery.docs[0];
      const resumeData = resumeDoc.data();
      
      // Get the summary from OpenAI
      const resumeSummary = await summarizeResume(resumeData.extractedText);

      // Create a new document with the summary
      const newDoc = await userCollectionsRef.add({
        type: 'ResumeSummary',
        createdAt: Firestore.FieldValue.serverTimestamp(),
        originalResumeId: resumeDoc.id,
        summary: resumeSummary,
        status: 'processed'
      });

      res.status(200).json({
        success: true,
        summary: resumeSummary,
        savedDocumentId: newDoc.id,
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