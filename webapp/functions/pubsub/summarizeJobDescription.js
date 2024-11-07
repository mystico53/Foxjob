const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { Firestore } = require("firebase-admin/firestore");
const fetch = require('node-fetch');

// Ensure Firestore instance is reused
const db = admin.firestore();

exports.summarizeJobDescription = functions.pubsub
  .topic('job-description-extracted')
  .onPublish(async (message) => {
    const messageData = message.json;
    const { googleId, docId } = messageData;

    logger.info(`Starting job description analysis for googleId: ${googleId}, docId: ${docId}`);

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

      const prompt = anthropicInstructions.prompt.replace('{TEXT}', extractedText);

      logger.info('Calling Anthropic API for job description analysis');

      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: anthropicInstructions.model,
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
        logger.info('Job description analyzed successfully');
      } else {
        logger.error('Unexpected Anthropic API response structure:', data);
        throw new Error('Unexpected Anthropic API response structure');
      }

      // Save analysis result to Firestore
      await jobDocRef.update({
        summarized: {
          companyInfo: {
            name: analysisResult.companyInfo?.name || "na",
            industry: analysisResult.companyInfo?.industry || "na",
            companyFocus: analysisResult.companyInfo?.companyFocus || "na"
          },
          jobInfo: {
            jobTitle: analysisResult.jobInfo?.jobTitle || "na",
            remoteType: analysisResult.jobInfo?.remoteType || "na",
            jobSummary: analysisResult.jobInfo?.jobSummary || "na"
          },
          areasOfFun: analysisResult.areasOfFun || ["", "", ""],
          mandatorySkills: analysisResult.mandatorySkills || ["", "", ""],
          compensation: analysisResult.compensation || "Not mentioned"
        },
      });

      logger.info(`Job description analysis saved to Firestore for googleId: ${googleId}, docId: ${docId}`);

    } catch (error) {
      logger.error('Error in summarizeJobDescription:', error);
    }
  });

// Anthropic instructions
const anthropicInstructions = {
  model: "claude-3-haiku-20240307", 
  prompt: `You are a job market and industry expert. You excel in distilling concise information from job descriptions. You will rephrase terms to make them understandable. Your task is to:

1) Extract the company name, Specific Industry branch, what makes the company truly unique?
2) Find out the job position title and Summarize the job in one short sentence. (max 15 words)
3) What are unique traits of this job that make it fun? Ignore the standard responsibilities of the job title.
4) List mandatory skills that are unique or advanced, not just common requirements.
5) List compensation if mentioned

Format your response as a JSON object with the following structure:

{
  "companyInfo": {
    "name": "Company Name",
    "industry": "Specific Industry branch, not just software development, but what kind exactly"
    "companyFocus": "Company does....What makes the company truly unique? Explain short in simple terms (keep it short)"
  },
  "jobInfo": {
    "jobTitle": "What is job title?",
    "remoteType": "is this a remote or onsite job, eg On-site 3 days week, or Remote",
    "jobSummary": "One sentence job summary, always start with You will" (keep it short)
  },
  "areasOfFun": (keep it short) [
    "Fun 1",
    "Fun 2",
    "Fun 3"
  ],
  "mandatorySkills": (keep it short) [
    "Skill 1" 12 years of XY,
    "Skill 2", Preferred degree in X
    "Skill 3" Proven Skills in Y
  ],
  "compensation": "Amount or 'Not mentioned, eg. 150,000 or 150k' no extra details other than the amount"
}

Ensure all fields are present in the JSON, even if empty. For 'areasOfFun' and 'mandatorySkills', include up to three items. If there are fewer, leave the remaining items as empty strings.

Here's the job description to analyze:

{TEXT}

Provide only the JSON response without any additional text or explanations.`
};