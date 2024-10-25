const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { Firestore } = require("firebase-admin/firestore");
const { PubSub } = require('@google-cloud/pubsub');

// Ensure Firestore instance is reused
const db = admin.firestore();
const pubSubClient = new PubSub();

exports.extractJobRequirements = functions.pubsub
  .topic('job-description-extracted')
  .onPublish(async (message) => {
    const messageData = message.json;
    const { googleId, docId } = messageData;

    logger.info(`Starting job requirements extraction for googleId: ${googleId}, docId: ${docId}`);

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
      const extractedText = jobData.texts.extractedText;
      logger.info('Extracted job description fetched from Firestore');

      // Process text with Anthropic API
      const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic.api_key;

      if (!apiKey) {
        logger.error('Anthropic API key not found');
        throw new Error('Anthropic API key not found');
      }

      const prompt = `Extract the 6 most needed key requirements for this job, dont choose basic, trivial skills (e.g. stakeholder management, find industry and job specific stuff), this should include experience in the industry, education, job specifics, skills. Format each requirement as "Requirement X: Specific requirement", where X is a number from 1 to 6. Ensure there are exactly 6 requirements. Here's the job description:

${extractedText}

Provide only the list of 6 requirements, one per line, without any additional text or explanations.`;

      logger.info('Calling Anthropic API for job requirements extraction');

      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
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

      let requirementsText;
      if (data.content && data.content.length > 0 && data.content[0].type === 'text') {
        requirementsText = data.content[0].text.trim();
        logger.info('Job requirements extracted successfully');
      } else {
        logger.error('Unexpected Anthropic API response structure:', data);
        throw new Error('Unexpected Anthropic API response structure');
      }

      // Parse requirements into individual fields
      const requirementsLines = requirementsText.split('\n').filter(line => line.trim());
      const requirements = {};
      
      requirementsLines.forEach((line, index) => {
        if (!line.includes(':')) {
          logger.warn(`Malformed requirement line: ${line}`);
          return;
        }
        
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        
        if (!value) {
          logger.warn(`Empty value for requirement: ${key}`);
          return;
        }
        
        const fieldName = `requirement${index + 1}`;
        requirements[fieldName] = value;
      });

      // Only update if we have valid requirements
      if (Object.keys(requirements).length > 0) {
        // Save requirements to Firestore
        await jobDocRef.update({
          requirements: requirements,
        });

        logger.info(`Job requirements saved to Firestore at path: ${jobDocRef.path}`);
        logger.info(`Extracted requirements: ${JSON.stringify(requirements)}`);

        // Publish to "requirements-gathered" topic
        const pubSubMessage = {
          jobReference: docId,
          googleId: googleId
        };

        const topicName = 'requirements-gathered';
        const pubSubTopic = pubSubClient.topic(topicName);
        await pubSubTopic.publishMessage({
          data: Buffer.from(JSON.stringify(pubSubMessage)),
        });

        logger.info(`Published message to ${topicName} topic with jobReference: ${docId} and googleId: ${googleId}`);
      } else {
        logger.error('No valid requirements extracted from the response');
        throw new Error('No valid requirements extracted from the response');
      }

    } catch (error) {
      logger.error('Error in extractJobRequirements:', error);
      throw error; // Re-throw the error to ensure the function fails properly
    }
  });