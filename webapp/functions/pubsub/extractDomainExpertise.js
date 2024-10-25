const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { Firestore } = require("firebase-admin/firestore");
const fetch = require('node-fetch');
const { PubSub } = require('@google-cloud/pubsub');

// Ensure Firestore instance is reused
const db = admin.firestore();
const pubSubClient = new PubSub();

exports.extractDomainExpertise = functions.pubsub
  .topic('job-description-extracted')
  .onPublish(async (message) => {
    const messageData = message.json;
    const { googleId, docId } = messageData;

    logger.info(`Starting domain expertise extraction for googleId: ${googleId}, docId: ${docId}`);

    if (!googleId || !docId) {
      logger.error('Missing required information in the Pub/Sub message');
      return;
    }

    try {
      const jobDocRef = db.collection('users').doc(googleId).collection('jobs').doc(docId);
      const docSnapshot = await jobDocRef.get();

      if (!docSnapshot.exists) {
        logger.error(`Document not found: ${jobDocRef.path}`);
        return;
      }

      const jobData = docSnapshot.data();
      const extractedText = jobData.texts.extractedText || "na";
      logger.info('Extracted job description fetched from Firestore');

      const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic.api_key;

      if (!apiKey) {
        logger.error('Anthropic API key not found');
        throw new Error('Anthropic API key not found');
      }

      const prompt = domainExpertiseInstructions.prompt.replace('{TEXT}', extractedText);

      logger.info('Calling Anthropic API for domain expertise extraction');

      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: domainExpertiseInstructions.model,
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
          logger.info('Domain expertise extracted successfully');
        } catch (parseError) {
          logger.error('Failed to parse JSON from Anthropic API response:', parseError);
          throw new Error('Failed to parse JSON from Anthropic API response');
        }
      } else {
        logger.error('Unexpected Anthropic API response structure:', data);
        throw new Error('Unexpected Anthropic API response structure');
      }

      // Validate analysisResult structure
      if (!analysisResult || !analysisResult.Domain) {
        logger.error('Invalid analysis result or missing Domain field:', analysisResult);
        throw new Error('Invalid analysis result or missing Domain field');
      }

      // Create the domain expertise object with the new structure
      const domainExpertise = {
        name: analysisResult.Domain.Name,
        assessment: analysisResult.Domain.Description,
        importance: analysisResult.Domain.Importance
      };

      logger.info(`Formatted Domain Expertise for Firestore: ${JSON.stringify(domainExpertise)}`);

      // Save to Firestore under SkillAssessment/DomainExpertise
      await jobDocRef.update({
        'SkillAssessment.DomainExpertise': domainExpertise
      });

      logger.info(`Domain expertise saved to Firestore for googleId: ${googleId}, docId: ${docId}`);

      // Define the topic name first
      const topicName = 'domain-expertise-extracted';
      
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
      logger.error('Error in extractDomainExpertise:', error);
    }
  });

// Anthropic instructions for domain expertise extraction
const domainExpertiseInstructions = {
  model: "claude-3-haiku-20240307",
  prompt: `Analyze the domain expertise requirements in this job description. Domain expertise refers to knowledge and skills in a specific field, industry, or subject matter. It goes beyond general hard skills and is gained through experience and practice within a particular domain. Domain experts understand the intricacies, challenges, and practices of their field.

First, describe neutrally the domain expertise listed for this specific profession in one very short sentence. Then critically analyze how necessary this expertise really is based on the overall job requirements.

Rate the importance on this scale:
1 - Not mentioned at all
2 - Mentioned as a bonus or slight preference
3 - Listed as desired passion or heartfelt interest
4 - Described as necessary or needed
5 - Stated as hard requirement or critical

Format your response as a JSON object with the following structure:

{
  "Domain": {
    "Name": "name of the domain/field, max three words",
    "Description": "one short sentence describing the required domain expertise",
    "Importance": numerical_rating
  }
}

Here's the job description to analyze:

{TEXT}

Provide only the JSON response without any additional text or explanations.`
};