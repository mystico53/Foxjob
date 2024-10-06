const { onRequest } = require("firebase-functions/v2/https");
const functions = require('firebase-functions');
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const cors = require('cors')({ origin: true });
const fetch = require('node-fetch');
require('dotenv').config();

const db = admin.firestore();

const match = onRequest(async (request, response) => {
    if (request.method === 'OPTIONS') {
        response.set('Access-Control-Allow-Origin', '*');
        response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        response.set('Access-Control-Allow-Headers', 'Content-Type');
        response.status(204).send('');
        return;
    }

    if (request.method !== 'POST') {
        logger.warn(`Invalid request method: ${request.method}`);
        response.status(405).send('Method Not Allowed. Please use POST.');
        return;
    }

    cors(request, response, async () => {
        try {
            logger.info('match function called');
            logger.info('Request Body:', JSON.stringify(request.body));

            const { jobId, googleId } = request.body;

            if (!jobId || !googleId) {
                logger.error('Missing jobId or googleId in request body.');
                response.status(400).send('Bad Request: jobId and googleId are required.');
                return;
            }

            // Retrieve the user's resume
            const userCollectionsRef = db.collection('users').doc(googleId).collection('UserCollections');
            const resumeQuery = userCollectionsRef.where('type', '==', 'Resume').limit(1);
            const resumeSnapshot = await resumeQuery.get();

            if (resumeSnapshot.empty) {
                logger.warn(`No resume found for user ID: ${googleId}`);
                response.status(404).send('Resume not found.');
                return;
            }

            const resumeDoc = resumeSnapshot.docs[0];
            const resumeText = resumeDoc.data().extractedText;

            // Retrieve the job description text
            const extractedJDTextRef = db
                .collection('users')
                .doc(googleId)
                .collection('processed')
                .doc(jobId)
                .collection('extractedJDText');

            const extractedJDTextSnapshot = await extractedJDTextRef.get();

            if (extractedJDTextSnapshot.empty) {
                logger.warn(`No job description found for job ID: ${jobId}`);
                response.status(404).send('Job description not found.');
                return;
            }

            const extractedJDTextDoc = extractedJDTextSnapshot.docs[0];
            const jobDescriptionText = extractedJDTextDoc.data().text;

            // Call Anthropic API to match resume with job description
            const matchResult = await matchResumeWithJob(resumeText, jobDescriptionText);

            // Save the match result to Firestore
            const matchesRef = db.collection('users').doc(googleId).collection('matches').doc(jobId);
            await matchesRef.set({ matchResult });

            // Send the response to the client
            response.set('Access-Control-Allow-Origin', '*');
            response.status(200).json({ matchResult });
        } catch (error) {
            logger.error('Error in match function:', error);
            response.status(500).send('Internal Server Error.');
        }
    });
});

async function matchResumeWithJob(resumeText, jobDescriptionText) {
    const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic.api_key;

    if (!apiKey) {
        logger.error('Anthropic API key not found');
        throw new Error('Anthropic API key not found');
    }

    const instruction = `You are an AI assistant tasked with critically evaluating how well a resume matches a given job description. Your task is to:

1) Derive 6 key skills needed for the job based on the job description.
2) Match these skills with the candidate's experience, being very overly critical in your assessment (one short sentence).
3) Score each skill match on a scale of 0-100, where 100 is a perfect match and 0 is no match at all.
4) Calculate a total score based on the average of these 5 skill scores.
5) Write a short summary (max 30 words) highlighting the biggest pro and the biggest con for why the candidate is or isn't a good fit. Use the format "Your experience in [area] is [assessment], but [area] is [assessment]."

Format your response as a JSON object with the following structure:

{
  "keySkills": [
    {
      "skill": "Skill 1",
      "score": 0,
      "assessment": "Brief one short sentence explanation of score"
    },
    {
      "skill": "Skill 2",
      "score": 0,
      "assessment": "Brief one short sentence explanation of score"
    },
    {
      "skill": "Skill 3",
      "score": 0,
      "assessment": "Brief one short sentence explanation of score"
    },
    {
      "skill": "Skill 4",
      "score": 0,
      "assessment": "Brief one short sentence explanation of score"
    },
    {
      "skill": "Skill 5",
      "score": 0,
      "assessment": "Brief one short sentence explanation of score"
    },
     {
      "skill": "Skill 6",
      "score": 0,
      "assessment": "Brief one short sentence explanation of score"
    }
  ],
  "totalScore": 0,
  "summary": "Brief one short sentence explanation of score, Your experience in [area] is [assessment], but [area] is [assessment]."
}`;

    const prompt = `${instruction}\n\nResume:\n${resumeText}\n\nJob Description:\n${jobDescriptionText}`;

    try {
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 2048,
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

        if (data.content && data.content.length > 0 && data.content[0].type === 'text') {
            const content = data.content[0].text.trim();
            try {
                const jsonContent = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                return JSON.parse(jsonContent);
            } catch (error) {
                logger.error('Error parsing JSON from Anthropic response:', error);
                throw new Error('Error parsing JSON from Anthropic response');
            }
        } else {
            logger.error('Unexpected Anthropic API response structure:', data);
            throw new Error('Unexpected Anthropic API response structure');
        }
    } catch (error) {
        logger.error('Error calling Anthropic API:', error);
        throw error;
    }
}

module.exports = { match };