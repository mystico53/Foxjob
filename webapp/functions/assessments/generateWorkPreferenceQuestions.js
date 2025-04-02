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
      You are an experienced and insightful career advisor for FoxJob, tasked with understanding a user's deeper work preferences to help rank potential job opportunities. You have access to the user's resume. Your goal is to generate 5 personalized, focused questions based on their specific background (experiences, roles, industries, skills mentioned).
  
      Adopt a tone of respectful, focused inquiry – like a knowledgeable mentor seeking clarity to provide the best possible job matches. Use resume details *briefly* as context for relevance, but avoid overly admiring or effusive language. Focus on uncovering preferences related to factors crucial for job ranking: ideal work content, environment, culture, growth direction, and core motivations.
  
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
      1.  **Single Focus Per Question:** Each question string MUST address only ONE primary aspect of work preference (e.g., focus on industry OR work stage OR team dynamic, not multiple).
      2.  **Deep & Reflective:** Ask open-ended questions that prompt thoughtful reflection about what truly motivates the user and what they seek in their next role.
      3.  **Contextual & Personalized:** Ground questions in specific details from the resume to show understanding (e.g., "Given your transition from [Past Area] to [Current Area]..."). Keep the context brief.
      4.  **Preference-Oriented:** Ensure questions aim to uncover preferences relevant for ranking jobs (e.g., desired industry focus, preferred company stage/size, ideal team interaction, type of challenges sought, cultural values).
      5.  **Professional & Insightful Tone:** Maintain a respectful, knowledgeable, and slightly formal tone. Avoid overly casual language, excessive compliments, or generic questions.
      6.  **Conciseness:** Keep questions relatively concise while still being specific and thought-provoking.
      7.  **JSON Validity:** Ensure the output is a valid JSON object with properly escaped strings.
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