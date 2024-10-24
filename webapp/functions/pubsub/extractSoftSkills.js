const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { Firestore } = require("firebase-admin/firestore");
const fetch = require('node-fetch');
const { PubSub } = require('@google-cloud/pubsub');

// Ensure Firestore instance is reused
const db = admin.firestore();
const pubSubClient = new PubSub();

exports.extractSoftSkills = functions.pubsub
  .topic('job-description-extracted debug')
  .onPublish(async (message) => {
    const messageData = message.json;
    const { googleId, docId } = messageData;

    logger.info(`Starting soft skills extraction for googleId: ${googleId}, docId: ${docId}`);

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

      const prompt = softSkillsInstructions.prompt.replace('{TEXT}', extractedText);

      logger.info('Calling Anthropic API for soft skills extraction');

      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: softSkillsInstructions.model,
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
        logger.info('Soft skills extracted successfully');
      } else {
        logger.error('Unexpected Anthropic API response structure:', data);
        throw new Error('Unexpected Anthropic API response structure');
      }

      // Create a dynamic object for soft skills with the new structure
      const softSkills = {};
      
      // Convert the skills into the new format
      Object.entries(analysisResult.Softskills).forEach(([key, value], index) => {
        const skillNumber = `SS${index + 1}`;
      
        // Initialize skillName
        let skillName = key.trim();
      
        // Check if the key has a numerical prefix (e.g., "1. Collaboration")
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
      
        softSkills[skillNumber] = {
          Name: skillName,
          Description: value.trim()
        };
      });

      // Save analysis result to Firestore
      await jobDocRef.update({
        'Requirements.Softskills': softSkills
      });

      logger.info(`Soft skills extraction saved to Firestore for googleId: ${googleId}, docId: ${docId}`);

      const pubSubMessage = {
        docId: docId,
        googleId: googleId
      };
      
      const topicName = 'soft-skills-extracted';
      const pubSubTopic = pubSubClient.topic(topicName);
      await pubSubTopic.publishMessage({
        data: Buffer.from(JSON.stringify(pubSubMessage)),
      });

    } catch (error) {
      logger.error('Error in extractSoftSkills:', error);
    }
  });

// Anthropic instructions for soft skills extraction
const softSkillsInstructions = {
  model: "claude-3-haiku-20240307",
  prompt: `Extract the 5 most important soft skills from this job description in descending order. Use the job description to analyze if each of these skills are *required* or *preferred*. As a reminder: Soft skills are interpersonal and behavioral competencies that affect how people work with others and approach their work, such as communication, leadership, problem-solving, and adaptability. These skills are typically harder to quantify but crucial for workplace success. Do ***NOT*** include either hard skills or domain expertise (you will do that in another step). Hard skills are specific technical abilities that can be taught and measured, while domain expertise refers to deep knowledge in a specific field.

Format your response as a JSON object with the following structure:

{
  "Softskills": {
    "1. Skillname": "most important soft skill: one short sentence describing how this skill applies to the role (required or preferred?)",
    "2. Skillname": "second most important soft skill: one short sentence describing how this skill applies to the role (required or preferred?)",
    "3. Skillname": "third most important soft skill: one short sentence describing how this skill applies to the role (required or preferred?)",
    "4. Skillname": "fourth most important soft skill: one short sentence describing how this skill applies to the role (required or preferred?)",
    "5. Skillname": "fifth most important soft skill: one short sentence describing how this skill applies to the role (required or preferred?)"
  }
}

The skill name should be a single word. The description should explain how this soft skill specifically applies to the role, followed by whether it's required or preferred in parentheses.

Here's the job description to analyze:

{TEXT}

Provide only the JSON response without any additional text or explanations.`
};