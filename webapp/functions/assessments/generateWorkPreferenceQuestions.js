const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { Firestore } = require("firebase-admin/firestore");
const { callAnthropicAPI } = require('../services/anthropicService');
const FieldValue = Firestore.FieldValue;

// Initialize Firestore
const db = admin.firestore();

const CONFIG = {
    instructions: {
      workPreferenceQuestions: `
      You're like a helpful friend who knows this person's background (from their resume) and wants to quickly understand what makes a job feel right for *them* for FoxJob matching. Generate 5 super simple, friendly, and personalized questions.
  
      Think short, easy-to-understand questions. Briefly mention a past role or project to show you know their history, then ask ONE direct question about what they prefer *now* or for their *next* role. Focus on things like work environment, type of tasks, company feel, or learning goals.
  
      Your response MUST be a valid JSON object following this structure:
      {
        "questions": [
          "Question 1 text here",
          "Question 2 text here",
          "Question 3 text here",
          "Question 4 text here",
          "Question 5 text here"
        ]
      }
  
      CRITICAL RULES:
      1.  **Keep it SUPER Simple:** Use everyday language. Short sentences. Ask about ONE thing only. If you can simplify a word, do it.
      2.  **Friendly & Direct:** Sound warm and approachable. Ask directly about preferences (e.g., "Do you prefer...", "What kind of...", "How important is...").
      3.  **Brief Context, Then Preference:** Quickly mention a resume point, then ask the preference question. *Example*: "I saw you led big teams at planpolitik. For your next role, what size team do you think you'd enjoy most?" or "You've worked in EdTech and now AI. Are you leaning towards a specific industry now?"
      4.  **Focus on Job Matching Preferences:** Ask about concrete things helpful for ranking jobs:
          *   Company Size/Stage (startup vs large corp?)
          *   Team Vibe (collaborative vs independent?)
          *   Work Type (building new things vs improving existing ones? hands-on coding vs strategy?)
          *   Pace (fast-paced vs steady?)
          *   Industry Focus (stick with AI or explore others?)
          *   Learning Goals (what new skills are exciting?)
      5.  **One Idea Per Question:** Absolutely no combined questions. Just one clear preference query.
      6.  **Easy to Understand:** Ensure anyone can grasp the question immediately without needing to re-read.
      7.  **Valid JSON Output:** Structure must be correct JSON.
      `
    }
  };

const workPreferenceQuestionsGenerator = {
  async generateQuestions(resumeText) {
    try {
      const result = await callAnthropicAPI(resumeText, CONFIG.instructions.workPreferenceQuestions);
      
      if (!result || result.error) {
        throw new Error(result?.message || 'Error generating work preference questions');
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
        throw new Error(`Invalid questions response: ${parseError.message}`);
      }

      this.validateQuestionsStructure(parsedContent);
      return parsedContent;

    } catch (error) {
      logger.error('Error in generateQuestions:', error);
      throw new Error(`Work preference questions generation failed: ${error.message}`);
    }
  },

  validateQuestionsStructure(data) {
    if (!Object.hasOwn(data, 'questions')) {
      throw new Error('Missing required field: questions');
    }

    if (!Array.isArray(data.questions)) {
      throw new Error('Questions must be an array');
    }

    if (data.questions.length !== 5) {
      throw new Error('Exactly 5 questions are required');
    }

    data.questions.forEach((question, index) => {
      if (typeof question !== 'string' || question.trim() === '') {
        throw new Error(`Question at index ${index} is invalid or empty`);
      }
    });
  }
};

exports.generateWorkPreferenceQuestions = onDocumentCreated('users/{userId}/UserCollections/{docId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.error('No data associated with the event');
    return;
  }

  const data = snapshot.data();
  // Only process if it's a resume document
  if (data.type !== 'Resume') {
    logger.info('Document is not a resume, skipping processing');
    return;
  }

  const userId = event.params.userId;
  logger.info('Generating work preference questions for user:', userId);

  try {
    // Generate work preference questions based on the resume
    const questionData = await workPreferenceQuestionsGenerator.generateQuestions(data.extractedText);

    // Log the generated questions for debugging
    logger.info('Generated Work Preference Questions:', JSON.stringify(questionData, null, 2));

    // Create a new document with the work preference questions
    const workPreferencesRef = db.collection('users').doc(userId).collection('UserCollections').doc('work_preferences');
    
    // Prepare the document data with friendly, personalized questions
    const workPreferencesData = {
      'question1': questionData.questions[0],
      'answer1': '',
      'question2': questionData.questions[1],
      'answer2': '',
      'question3': questionData.questions[2],
      'answer3': '',
      'question4': questionData.questions[3],
      'answer4': '',
      'question5': questionData.questions[4],
      'answer5': '',
      'timestamp': FieldValue.serverTimestamp(),
      'status': 'pending'
    };

    // Set the document
    await workPreferencesRef.set(workPreferencesData);

    logger.info('Successfully created work preference questions for user:', userId);

  } catch (error) {
    logger.error('Error generating work preference questions:', {
      error: 'Internal server error',
      message: error.message,
      userId: userId
    });
    
    // Create document with error status
    const workPreferencesRef = db.collection('users').doc(userId).collection('UserCollections').doc('work_preferences');
    await workPreferencesRef.set({
      'status': 'error',
      'error': {
        message: error.message,
        timestamp: FieldValue.serverTimestamp()
      }
    });
  }
});