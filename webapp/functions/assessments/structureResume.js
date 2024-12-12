const { OpenAI } = require('openai');
const { logger } = require('firebase-functions');
const functions = require('firebase-functions');
const { z } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');
const cors = require('cors')({ origin: true });
const admin = require('firebase-admin');
const { Firestore } = require("firebase-admin/firestore");

// Initialize Firestore
const db = admin.firestore();

// Configuration
const CONFIG = {
  model: 'gpt-4o-mini'
};

// Schema Definition
const getResumeSchema = () => {
  return z.object({
    summary: z.string().optional(),  // Optional summary section
    experience: z.array(
      z.object({
        companyName: z.string(),
        positions: z.array(
          z.object({
            title: z.string(),
            dateRange: z.string(),
            bullets: z.array(z.string())  // Original bullet points verbatim
          })
        )
      })
    ),
    remainingText: z.string()  // Captures all other text verbatim that doesn't fit in the above schema
  });
};

async function summarizeResume(resumeText) {
  const instruction = `Structure this resume by copying the exact text into these components:

1. If there's a summary section, copy it verbatim into 'summary'
2. For work experience, copy exactly:
   - Company name as written
   - For each position:
     * Title exactly as written
     * Date range exactly as written
     * All bullet points exactly as written
3. Copy ALL remaining text (contact info, education, skills, awards, etc.) verbatim into 'remainingText'

Rules:
- Copy text exactly as written with no changes
- Don't modify any words, numbers, or punctuation
- Don't skip any content
- Put everything that isn't work experience or summary into remainingText
- Ensure every single word from the original appears somewhere in the output

Resume text to analyze:
${resumeText}`;

  try {
    // Get API key
    const apiKey = process.env.OPENAI_API_KEY || functions.config().openai.api_key;
    
    if (!apiKey) {
      logger.error('OpenAI API key not found');
      return { error: true, message: 'API key not configured' };
    }

    logger.info('Calling OpenAI API for resume analysis');
    const openai = new OpenAI({ apiKey });

    const completion = await openai.beta.chat.completions.parse({
      model: CONFIG.model,
      messages: [
        { 
          role: 'system', 
          content: 'You are a professional resume analyzer focused on extracting and structuring work experience details accurately.' 
        },
        { role: 'user', content: instruction }
      ],
      response_format: zodResponseFormat(
        getResumeSchema(),
        "resume_analysis"
      ),
    });

    if (completion.choices && completion.choices.length > 0) {
      const parsedContent = completion.choices[0].message.parsed;
      
      logger.info('Successfully parsed resume content');
      return { 
        error: false, 
        resumeSummary: parsedContent 
      };
    } else {
      logger.error('Invalid API response structure:', completion);
      return { error: true, message: 'Invalid API response structure' };
    }

  } catch (error) {
    logger.error('Error in resume analysis:', error);
    return { 
      error: true, 
      message: error.message,
      details: error.response?.data || error 
    };
  }
}

exports.structureResume = functions.https.onRequest((req, res) => {
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
      
      const result = await summarizeResume(resumeData.extractedText);
      
      if (result.error) {
        throw new Error(result.message);
      }

      // Create a new document with the summary
      const newDoc = await userCollectionsRef.add({
        type: 'ResumeSummary',
        createdAt: Firestore.FieldValue.serverTimestamp(),
        originalResumeId: resumeDoc.id,
        summary: result.resumeSummary,
        status: 'processed'
      });

      res.status(200).json({
        success: true,
        summary: result.resumeSummary,
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