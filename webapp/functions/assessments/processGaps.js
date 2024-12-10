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

async function summarizeGapsHolistically(gaps) {
  const instruction = `
    Analyze these gaps from a candidate's resume and provide exactly three findings.
    
    Format your response as a JSON object with exactly this structure:
    {
      "finding1": {
        "name": "Theme name / gap category",
        "assessment": "One sentence describing the specific gap",
        "recommendation": "One sentence specific suggestion to address it",
        "impactScore": 8 (number between 1-10)
      },
      "finding2": {
        "name": "Theme name / gap category",
        "assessment": "One sentence describing the specific gap",
        "recommendation": "One sentence specific suggestion to address it",
        "impactScore": 8 (number between 1-10)
      },
      "finding3": {
        "name": "Theme name / gap category",
        "assessment": "One sentence describing the specific gap",
        "recommendation": "One sentence specific suggestion to address it",
        "impactScore": 8 (number between 1-10)
      }
    }

    The impactScore should reflect how much addressing this gap would improve their chances (10 = highest impact).
    Be extremely specific in your assessments and recommendations.
  `;

  const promptContent = `${instruction}\nHere are the gaps to analyze:\n${JSON.stringify(gaps)}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a direct and practical career coach focused on actionable improvements." },
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

exports.processGaps = onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      // Log the incoming request
      logger.info('Process gaps function called', req.body);

      const { userId, gaps } = req.body;

      // Validate required fields
      if (!userId || !gaps || !Array.isArray(gaps) || gaps.length === 0) {
        logger.error('Missing or invalid parameters');
        return res.status(400).json({ 
          error: 'Missing or invalid parameters',
          received: { userId, gaps }
        });
      }

      // Get the holistic analysis from OpenAI
      const holisticAnalysis = await summarizeGapsHolistically(gaps);

      // Create a new document in UserCollections
      const userCollectionsRef = db
        .collection('users')
        .doc(userId)
        .collection('UserCollections');

      // Create a new document with auto-generated ID
      const newDoc = await userCollectionsRef.add({
        type: 'HolisticGapsAnalysis',
        createdAt: Firestore.FieldValue.serverTimestamp(),
        gaps: gaps,
        analysis: holisticAnalysis,
        status: 'processed'
      });

      // Return success response
      res.status(200).json({
        message: 'Gaps analyzed holistically and saved successfully',
        analysis: holisticAnalysis,
        savedDocumentId: newDoc.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error processing gaps:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message,
        received: req.body
      });
    }
  });
});