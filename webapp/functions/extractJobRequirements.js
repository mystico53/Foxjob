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
    const { extractedPath, googleId, rawPath } = messageData;

    logger.info(`Starting job requirements extraction for googleId: ${googleId}, extractedPath: ${extractedPath}`);

    if (!extractedPath || !googleId || !rawPath) {
      logger.error('Missing required information in the Pub/Sub message');
      return;
    }

    try {
      // 1. Fetch extracted job description from Firestore
      const docSnapshot = await db.doc(extractedPath).get();

      if (!docSnapshot.exists) {
        logger.error(`Document not found: ${extractedPath}`);
        return;
      }

      const extractedText = docSnapshot.data().extractedJD;
      logger.info('Extracted job description fetched from Firestore');

      // 2. Process text with Anthropic API
      const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic.api_key;

      if (!apiKey) {
        logger.error('Anthropic API key not found');
        throw new Error('Anthropic API key not found');
      }

      const prompt = `Extract the 6 most needed key requirements for this job. Format each requirement as "Category: Specific requirement". Ensure there are exactly 6 requirements. Here's the job description:

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

      let requirements;
      if (data.content && data.content.length > 0 && data.content[0].type === 'text') {
        requirements = data.content[0].text.trim();
        logger.info('Job requirements extracted successfully');
      } else {
        logger.error('Unexpected Anthropic API response structure:', data);
        throw new Error('Unexpected Anthropic API response structure');
      }

      // 3. Save requirements to Firestore
      const pathParts = extractedPath.split('/');
      const jobDocumentPath = pathParts.slice(0, -2).join('/');
      const requirementsPath = `${jobDocumentPath}/requirements/document`;
      const requirementsRef = db.doc(requirementsPath);
      await requirementsRef.set({
        requirements: requirements,
        timestamp: Firestore.FieldValue.serverTimestamp()
      });

      logger.info(`Job requirements saved to Firestore at path: ${requirementsPath}`);
      logger.info(`Extracted requirements: ${requirements}`);

      // 4. Publish to "requirements-gathered" topic
      const jobReference = jobDocumentPath.split('/').pop(); // Extract the last part of the path as job reference
      const pubSubMessage = {
        jobReference: jobReference,
        googleId: googleId
      };

      const topicName = 'requirements-gathered';
      const pubSubTopic = pubSubClient.topic(topicName);
      await pubSubTopic.publish(Buffer.from(JSON.stringify(pubSubMessage)));

      logger.info(`Published message to ${topicName} topic with jobReference: ${jobReference} and googleId: ${googleId}`);

    } catch (error) {
      logger.error('Error in extractJobRequirements:', error);
    }
  });