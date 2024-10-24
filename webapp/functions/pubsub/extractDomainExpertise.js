const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { Firestore } = require("firebase-admin/firestore");
const fetch = require('node-fetch');

// Ensure Firestore instance is reused
const db = admin.firestore();

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
        analysisResult = JSON.parse(data.content[0].text.trim());
        logger.info('Domain expertise extracted successfully');
      } else {
        logger.error('Unexpected Anthropic API response structure:', data);
        throw new Error('Unexpected Anthropic API response structure');
      }

      // Save analysis result to Firestore using dot notation to update only the DomainExpertise
      await jobDocRef.update({
        'Requirements.DomainExpertise': analysisResult.Domain
      });

      logger.info(`Domain expertise extraction saved to Firestore for googleId: ${googleId}, docId: ${docId}`);

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