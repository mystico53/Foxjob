const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { Firestore } = require("firebase-admin/firestore");
const fetch = require('node-fetch');

// Ensure Firestore instance is reused
const db = admin.firestore();

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
        analysisResult = JSON.parse(data.content[0].text.trim());
        logger.info('Hard skills extracted successfully');
      } else {
        logger.error('Unexpected Anthropic API response structure:', data);
        throw new Error('Unexpected Anthropic API response structure');
      }

      // Create a dynamic object for hard skills with the new structure
      const hardSkills = {};
      
      // Convert the skills into the new format
      Object.entries(analysisResult.Hardskills).forEach(([key, value], index) => {
        const skillNumber = `HS${index + 1}`;
        const skillName = key.split('. ')[1]; // Extract skill name without number
        hardSkills[skillNumber] = {
          Name: skillName,
          Description: value
        };
      });

      // Save analysis result to Firestore
      await jobDocRef.update({
        'Requirements.Softskills': softSkills
      });

      logger.info(`Hard skills extraction saved to Firestore for googleId: ${googleId}, docId: ${docId}`);

    } catch (error) {
      logger.error('Error in extractHardSkills:', error);
    }
  });

// Anthropic instructions for hard skills extraction
const hardSkillsInstructions = {
  model: "claude-3-haiku-20240307", 
  prompt: `Extract the 5 most important hard skills from this job description in descending order. Use the job description to analyse if each of these skills are *required* or *preferred*. As a reminder: Hard skills are job-specific abilities learned through formal education or training, such as programming, project management, and statistics. These skills are quantifiable, often certifiable, and can be tested or demonstrated. Do ***NOT*** include either softskills or domain expertise (you will do that in another step). Soft skills are interpersonal traits that affect how people work together, like communication and teamwork. Domain expertise is deep knowledge in a specific field that must be gained through experience.

Format your response as a JSON object with the following structure:

{
  "Hardskills": {
    "1. Skillname": "most important hard skill: one short sentence description of this skill (required or preferred?)",
    "2. Skillname": "second most important hard skill: one short sentence description of this skill (required or preferred?)",
    "3. Skillname": "third most important hard skill: one short sentence description of this skill (required or preferred?)",
    "4. Skillname": "fourth most important hard skill: one short sentence description of this skill (required or preferred?)",
    "5. Skillname": "fifth most important hard skill: one short sentence description of this skill (required or preferred?)"
  }
}

The skill name should be a single word. The description should be one short sentence followed by whether it's required or preferred in parentheses.

Here's the job description to analyze:

{TEXT}

Provide only the JSON response without any additional text or explanations.`
};