const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { Firestore } = require("firebase-admin/firestore");
const fetch = require('node-fetch');
const { PubSub } = require('@google-cloud/pubsub');

// Ensure Firestore instance is reused
const db = admin.firestore();
const pubSubClient = new PubSub();

exports.extractHardSkills = functions.pubsub
  .topic('job-description-extracted')
  .onPublish(async (message) => {
    const messageData = message.json;
    const { googleId, docId } = messageData;

    logger.info(`Starting hard skills extraction for googleId: ${googleId}, docId: ${docId}`);

    if (!googleId || !docId) {
      logger.error('Missing required information in the Pub/Sub message');
      return;
    }

    try {
      // Create document reference using googleId and docId
      const jobDocRef = db.collection('users').doc(googleId).collection('jobs').doc(docId);

      // Fetch job data from Firestore
      const docSnapshot = await jobDocRef.get();

      if (!docSnapshot.exists) {
        logger.error(`Document not found: ${jobDocRef.path}`);
        return;
      }

      const jobData = docSnapshot.data();
      const extractedText = jobData.texts.extractedText || "na";
      logger.info('Extracted job description fetched from Firestore');

      // Process text with Anthropic API
      const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic.api_key;

      if (!apiKey) {
        logger.error('Anthropic API key not found');
        throw new Error('Anthropic API key not found');
      }

      const prompt = hardSkillsInstructions.prompt.replace('{TEXT}', extractedText);

      logger.info('Calling Anthropic API for hard skills extraction');

      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: hardSkillsInstructions.model,
          max_tokens: 4096,
          messages: [
            { role: 'user', content: prompt }
          ],
        }),
      });

      const data = await anthropicResponse.json();

      if (!anthropicResponse.ok) {
        logger.error('Anthropic API error response:', data);
        throw new Error(`Anthropic API Error: ${JSON.stringify(data)}`);
      }

      logger.info('Received response from Anthropic API');

      let analysisResult;
      if (data.content && data.content.length > 0 && data.content[0].type === 'text') {
        try {
          analysisResult = JSON.parse(data.content[0].text.trim());
          logger.info('Hard skills extracted successfully');
        } catch (parseError) {
          logger.error('Failed to parse JSON from Anthropic API response:', parseError);
          throw new Error('Failed to parse JSON from Anthropic API response');
        }
      } else {
        logger.error('Unexpected Anthropic API response structure:', data);
        throw new Error('Unexpected Anthropic API response structure');
      }

      // Validate analysisResult structure
      if (!analysisResult || typeof analysisResult !== 'object') {
        logger.error('Invalid analysis result: not an object', analysisResult);
        throw new Error('Invalid analysis result: not an object');
      }

      if (!analysisResult.Hardskills || typeof analysisResult.Hardskills !== 'object') {
        logger.error('Hardskills field is missing or invalid in analysis result:', analysisResult);
        throw new Error('Hardskills field is missing or invalid in analysis result');
      }

      logger.info(`Parsed Hardskills from API: ${JSON.stringify(analysisResult.Hardskills)}`);

      // Create a dynamic object for hard skills with the new structure
      const hardSkills = {};

      // Convert the skills into the new format
      Object.entries(analysisResult.Hardskills).forEach(([key, value], index) => {
        const skillNumber = `HS${index + 1}`;
      
        // Initialize skillName
        let skillName = key.trim();
      
        // Check if the key has a numerical prefix (e.g., "1. Programming")
        const match = key.match(/^\d+\.\s*(.+)$/);
        if (match && match[1]) {
          skillName = match[1].trim();
        }
      
        // Validate skillName and value
        if (!skillName) {
          logger.error(`Skill name is undefined or empty for key: "${key}"`);
          return; // Skip this entry
        }
      
        if (typeof value !== 'string' || value.trim() === '') {
          logger.error(`Description is invalid for skill: "${skillName}"`);
          return; // Skip this entry
        }
      
        // Create the nested structure
        if (!hardSkills[docId]) {
          hardSkills[docId] = {};
        }
        if (!hardSkills[docId].SkillAssessment) {
          hardSkills[docId].SkillAssessment = {};
        }
        if (!hardSkills[docId].SkillAssessment.Hardskills) {
          hardSkills[docId].SkillAssessment.Hardskills = {};
        }
      
        hardSkills[docId].SkillAssessment.Hardskills[skillNumber] = {
          name: skillName,
          description: value.trim()
        };
      });
      
      logger.info(`Formatted Hardskills for Firestore: ${JSON.stringify(hardSkills)}`);
      
      // Save analysis result to Firestore
      await jobDocRef.update({
        [`SkillAssessment.Hardskills`]: hardSkills[docId].SkillAssessment.Hardskills
      });

      logger.info(`Hard skills extraction saved to Firestore for googleId: ${googleId}, docId: ${docId}`);

      
      // Define the topic name first
      const topicName = 'hard-skills-extracted';
      
      // Create topic if it doesn't exist
      await pubSubClient.createTopic(topicName).catch((err) => {
        if (err.code === 6) {
          logger.info('Topic already exists');
        } else {
          throw err;
        }
      });
      
      // Prepare the message
      const pubSubMessage = {
        docId: docId,
        googleId: googleId
      };
      
      // Publish the message
      const messageId = await pubSubClient.topic(topicName).publishMessage({
        data: Buffer.from(JSON.stringify(pubSubMessage)),
      });

      logger.info(`Message ${messageId} published to topic ${topicName}`);


    } catch (error) {
      logger.error('Error in extractHardSkills:', error);
    }
  });

// Anthropic instructions for hard skills extraction
const hardSkillsInstructions = {
  model: "claude-3-haiku-20240307", 
  prompt: `Extract the 5 most important hard skills from this job description in descending order. Use the job description to analyze if each of these skills are *required* or *preferred*. As a reminder: Hard skills are job-specific abilities learned through formal education or training, such as programming, project management, and statistics. These skills are quantifiable, often certifiable, and can be tested or demonstrated. Do ***NOT*** include either softskills or domain expertise (you will do that in another step). Soft skills are interpersonal traits that affect how people work together, like communication and teamwork. Domain expertise is deep knowledge in a specific field that must be gained through experience.

Format your response as a JSON object with the following structure:

{
  "Hardskills": {
    "Skillname1": "most important hard skill: one short sentence description of this skill (required or preferred?)",
    "Skillname2": "second most important hard skill: one short sentence description of this skill (required or preferred?)",
    "Skillname3": "third most important hard skill: one short sentence description of this skill (required or preferred?)",
    "Skillname4": "fourth most important hard skill: one short sentence description of this skill (required or preferred?)",
    "Skillname5": "fifth most important hard skill: one short sentence description of this skill (required or preferred?)"
  }
}

The skill name should be a single word. The description should be one short sentence followed by whether it's required or preferred in parentheses.

Here's the job description to analyze:

{TEXT}

Provide only the JSON response without any additional text or explanations.`
};