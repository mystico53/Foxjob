const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const admin = require('firebase-admin');
const logger = require("firebase-functions/logger");
require('dotenv').config();
const OpenAI = require('openai');
const { z } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');

const openai = new OpenAI();
const db = admin.firestore();

exports.matchDomainExpertise = onMessagePublished(
  { topic: 'domain-expertise-extracted' },
  async (event) => {
    try {
      logger.info('matchDomainExpertise function called');
      
      const messageData = (() => {
        try {
          if (!event?.data?.message?.data) {
            throw new Error('Invalid message format received');
          }
          const decodedData = Buffer.from(event.data.message.data, 'base64').toString();
          return JSON.parse(decodedData);
        } catch (error) {
          logger.error('Error parsing message data:', error);
          throw error;
        }
      })();

      logger.info('Parsed Pub/Sub message data:', messageData);

      const { firebaseUid, docId } = messageData;

      if (!docId || !firebaseUid) {
        logger.error('Missing docId or firebaseUid in Pub/Sub message.');
        throw new Error('Missing docId or firebaseUid');
      }

      // Retrieve the user's resume
      const userCollectionsRef = db.collection('users').doc(firebaseUid).collection('UserCollections');
      const resumeQuery = userCollectionsRef.where('type', '==', 'Resume').limit(1);
      const resumeSnapshot = await resumeQuery.get();

      let resumeText;
      if (resumeSnapshot.empty) {
        logger.warn(`No resume found for user ID: ${firebaseUid}. Using placeholder resume.`);
        resumeText = placeholderResumeText;
      } else {
        const resumeDoc = resumeSnapshot.docs[0];
        resumeText = resumeDoc.data().extractedText;
      }

      // Retrieve the job document and domain expertise
      const jobDocRef = db
        .collection('users')
        .doc(firebaseUid)
        .collection('jobs')
        .doc(docId);

      const jobDoc = await jobDocRef.get();
      if (!jobDoc.exists) {
        logger.warn(`No job document found for job ID: ${docId}`);
        throw new Error('No job document found');
      }

      const jobData = jobDoc.data();
      const domainExpertise = jobData.SkillAssessment?.DomainExpertise;

      if (!domainExpertise || !domainExpertise.name || !domainExpertise.assessment) {
        logger.warn(`No domain expertise found for job ID: ${docId}`);
        throw new Error('No domain expertise found');
      }

      logger.info('Domain expertise passed to matchResumeWithDomainExpertise:', JSON.stringify(domainExpertise));

      // Call OpenAI API to match resume with domain expertise
      const matchResult = await matchResumeWithDomainExpertise(resumeText, domainExpertise);

      // Update the existing DomainExpertise object with the match results
      const updatedDomainExpertise = {
        name: domainExpertise.name,
        assessment: domainExpertise.assessment,
        importance: domainExpertise.importance,
        matchAssessment: matchResult.assessment,
        score: matchResult.score,
        summary: matchResult.summary
      };

      // Update the job document with the enhanced structure
      await jobDocRef.update({
        'SkillAssessment.DomainExpertise': updatedDomainExpertise,
        'generalData.processingStatus': 'processing'
      });

      logger.info('Updated DomainExpertise structure in Firestore:', JSON.stringify(updatedDomainExpertise));

    } catch (error) {
      logger.error('Error in matchDomainExpertise function:', error);
      throw error;
    }
  });

async function matchResumeWithDomainExpertise(resumeText, domainExpertise) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    logger.error('OpenAI API key not found');
    throw new functions.https.HttpsError('failed-precondition', 'OpenAI API key not found');
  }

  const instruction = `
    You are evaluating a candidate's domain expertise as a highly critical technical CEO. Your task is to analyze how well they match this specific requirement with an extremely high bar for evidence:
    
    Domain: ${domainExpertise.name}
    Description: ${domainExpertise.assessment}
    Importance Level: ${domainExpertise.importance}

    CRITICAL PROCESS - Follow these steps IN ORDER:

    1. First scan the resume:
       - Confirm you see the resume by showing first 100 characters
       - Identify ALL quotes related to this specific domain
       - List sections where domain expertise evidence appears
       - REJECT any vague or general statements

    2. Evidence Analysis:
       - Find VERBATIM quotes demonstrating domain expertise
       - Each quote MUST include ALL THREE of:
           * Detailed technical implementation specifics
           * Named tools, frameworks, or technologies used
           * Quantifiable outcomes with metrics
       - Only use text that appears EXACTLY in the resume
       - Focus ONLY on this specific domain
       - Reject quotes missing any of the three required elements
       - Double-check each quote exists word-for-word

    3. Critical Scoring (IMPORTANT: Return a SINGLE number between 0 and 100):
       - Score 90-100: Multiple strong quotes (3+) showing direct hands-on experience with ALL required elements
       - Score 80-89: Two strong quotes showing direct experience with ALL required elements
       - Score 70-79: One strong quote showing direct experience with ALL required elements
       - Score 40-69: Related experience but missing some required elements
       - Score 1-39: Only tangential domain references
       - Score 0: No relevant domain experience found
       
       MANDATORY SCORE PENALTIES (Apply ALL that apply):
       - If no technical implementation details: -40 points
       - If no specific tools/technologies named: -30 points
       - If no quantifiable metrics: -25 points
       - If experience is over 3 years old: -20 points
       - If only domain terms without context: -50 points
       - Final score MUST be a single integer between 0 and 100

    4. Assessment Rules:
       - First sentence must cite strongest SPECIFIC evidence found, including ALL three elements
       - Second sentence must identify CONCRETE missing requirements
       - Never consider general skills or related domains
       - Base assessment only on explicit domain evidence
       - Must cite specific missing tools or technologies if score below 80
       - Must identify specific metrics gaps if score below 90

    Format your response EXACTLY as:
    {
      "assessment": "Two sentences: specific evidence then gaps",
      "score": <SINGLE INTEGER BETWEEN 0 AND 100>,
      "summary": "Domain-specific strength and weakness (max 15 words)"
    }

    IMPORTANT: The score field MUST contain a single integer between 0 and 100.
    IMPORTANT: Be extremely strict - a score above 70 requires extraordinary evidence.

    The resume text to search through is:
    """
    {resumeText}
    """
  `;

  const promptContent = `${instruction}\n\nResume:\n${resumeText}\nNow go:`;

  const DomainExpertiseMatchingSchema = z.object({
    assessment: z.string(),
    score: z.number(),
    summary: z.string()
  });

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert at structured data extraction." },
        { role: "user", content: promptContent },
      ],
      response_format: zodResponseFormat(DomainExpertiseMatchingSchema, "domain_expertise_matching"),
    });

    const parsedContent = completion.choices[0].message.parsed;

    if (parsedContent.score < 0 || parsedContent.score > 100) {
      throw new Error(`Score out of range: ${parsedContent.score}`);
    }

    logger.info('Parsed content:', JSON.stringify(parsedContent));
    return parsedContent;

  } catch (error) {
    logger.error('Error calling OpenAI API:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    } else {
      throw new functions.https.HttpsError('internal', 'Error calling OpenAI API', { message: error.message });
    }
  }
}

const placeholderResumeText = `
---
`;