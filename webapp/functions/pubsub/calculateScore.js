const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const admin = require('firebase-admin');
const logger = require("firebase-functions/logger");
require('dotenv').config();
const OpenAI = require('openai');
const { z } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');

const openai = new OpenAI();
const db = admin.firestore();

exports.calculateScore = onMessagePublished(
  {
    topic: 'requirements-gathered',
  },
  async (event) => {
    const message = event.data;  
    try {
      logger.info('calculateScore function called');
      logger.info('Pub/Sub Message:', JSON.stringify(message.json));

      const messageData = event.data.message.json;
      if (!messageData || !messageData.firebaseUid || !messageData.docId) {
        throw new Error('Invalid message format: missing required fields');
      }
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
        resumeText = placeholderResumeText; // Make sure this is defined or imported
      } else {
        const resumeDoc = resumeSnapshot.docs[0];
        resumeText = resumeDoc.data().extractedText;
      }

      // Retrieve the job document and requirements
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
      const requirements = jobData.requirements;

      if (!requirements || Object.keys(requirements).length === 0) {
        logger.warn(`No requirements found for job ID: ${docId}`);
        throw new Error('No requirements found');
      }

      // Convert requirements object to array for processing
      const requirementsArray = Object.entries(requirements).map(([key, value]) => ({
        key: key,
        requirement: value
      }));

      // Call OpenAI API to match resume with job requirements
      const matchResult = await matchResumeWithRequirements(resumeText, requirementsArray);

      // Prepare the Score object to be saved in the job document
      const scoreObject = {
        Score: {
          totalScore: matchResult.totalScore,
          summary: matchResult.summary
        }
      };

      // Add each requirement score to the Score object
      matchResult.requirementMatches.forEach((match, index) => {
        scoreObject.Score[`Requirement${index + 1}`] = {
          requirement: match.requirement,
          score: match.score,
          assessment: match.assessment
        };
      });

      // Update the job document with the new Score object
      await jobDocRef.update(scoreObject);
      logger.info(`Score saved to job document for job ID: ${docId}, user ID: ${firebaseUid}`);

    } catch (error) {
      logger.error('Error in calculateScore function:', error);
    }
  });

async function matchResumeWithRequirements(resumeText, requirements) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    logger.error('OpenAI API key not found');
    throw new functions.https.HttpsError('failed-precondition', 'OpenAI API key not found');
  }

  logger.info('Requirements passed to matchResumeWithRequirements:', JSON.stringify(requirements));

  const instruction = `
    You are an insanely critical and skeptical CEO of the company that has one job to offer for the first time in 10 years. You're tasked with evaluating how well a resume matches given job. Your task is to:

    1) For each of the 6 given requirements, critically analyze the candidate's experience. Provide a one-sentence assessment that references specific evidence from the resume, highlighting both strengths and gaps.

    2) Assign a score between 1 - 100 to each requirement, be very critical. your companies future relies on it.

    3) Calculate a total score (1 - 100), giving a critical assessment on the qualifications meeting the requirements.
  
    4) Write a short summary (maximum 30 words) highlighting the biggest strength and weakness, using the format: "Your experience in [area] is [assessment], but [area] is [assessment]."
    
    Format your response as a JSON object with the following structure:
    {
      "requirementMatches": [
        {
          "requirement": "",
          "assessment": "",
          "score": 0
        },
        // Continue for all requirements
      ],
      "totalScore": 0,
      "summary": ""
    }
  `;

  const requirementsString = requirements.map((req, index) =>
    `Requirement ${index + 1}: ${req.requirement}`
  ).join('\n');

  const promptContent = `${instruction}\nThese are the Requirements I mentioned:\n${requirementsString}\nThese are the qualifications:\n${resumeText}\nNow go:`;

  const ResearchMatchingSchema = z.object({
    requirementMatches: z.array(
      z.object({
        requirement: z.string(),
        assessment: z.string(),
        score: z.number(), // Removed `.min(0).max(100)`
      })
    ),
    totalScore: z.number(), // Removed `.min(0).max(100)`
    summary: z.string(),
  });

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert at structured data extraction." },
        { role: "user", content: promptContent },
      ],
      response_format: zodResponseFormat(ResearchMatchingSchema, "research_matching"),
    });

    const parsedContent = completion.choices[0].message.parsed;

  // Optional: Add validation for scores here
  parsedContent.requirementMatches.forEach((match) => {
    if (match.score < 0 || match.score > 100) {
      throw new Error(`Score out of range: ${match.score}`);
    }
  });

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


/*const functions = require('firebase-functions');
const admin = require('firebase-admin');
const logger = require("firebase-functions/logger");
require('dotenv').config();

const db = admin.firestore();

exports.calculateScore = functions.pubsub
  .topic('requirements-gathered')
  .onPublish(async (message) => {
    try {
      logger.info('calculateScore function called');
      logger.info('Pub/Sub Message:', JSON.stringify(message.json));

      const { firebaseUid, docId } = message.json;

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
        resumeText = placeholderResumeText; // Make sure this is defined or imported
      } else {
        const resumeDoc = resumeSnapshot.docs[0];
        resumeText = resumeDoc.data().extractedText;
      }

      // Retrieve the job document and requirements
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
      const requirements = jobData.requirements;

      // Log the requirements
      logger.info(`Requirements for job ID ${docId}:`, JSON.stringify(requirements));

      if (!requirements || Object.keys(requirements).length === 0) {
        logger.warn(`No requirements found for job ID: ${docId}`);
        throw new Error('No requirements found');
      }

      // Convert requirements object to array for processing
      const requirementsArray = Object.entries(requirements).map(([key, value]) => ({
        key: key,
        requirement: value
      }));

      // Log the requirementsArray
      logger.info(`Requirements array for job ID ${docId}:`, JSON.stringify(requirementsArray));

      // Call Anthropic API to match resume with job requirements
      const matchResult = await matchResumeWithRequirements(resumeText, requirementsArray);

      // Prepare the Score object to be saved in the job document
      const scoreObject = {
        Score: {
          totalScore: matchResult.totalScore,
          summary: matchResult.summary
        }
      };

      // Add each requirement score to the Score object
      matchResult.requirementMatches.forEach((match, index) => {
        scoreObject.Score[`Requirement${index + 1}`] = {
          requirement: match.requirement,
          score: match.score,
          assessment: match.assessment
        };
      });

      // Log the scoreObject
      logger.info(`Score object for job ID ${docId}:`, JSON.stringify(scoreObject));

      // Update the job document with the new Score object
      await jobDocRef.update(scoreObject);

      logger.info(`Score saved to job document for job ID: ${docId}, user ID: ${firebaseUid}`);

      await jobDocRef.update({
        'generalData.processingStatus': 'processed'
      });

      logger.info(`Processing status updated to "processed" in generalData for job ID: ${docId}, user ID: ${firebaseUid}`);

    } catch (error) {
      logger.error('Error in calculateScore function:', error);
      // For Pub/Sub functions, we log the error but don't throw it
      // as there's no direct way to return an error to the caller
    }
  });

  async function matchResumeWithRequirements(resumeText, requirements) {
    const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic.api_key;
  
    if (!apiKey) {
      logger.error('Anthropic API key not found');
      throw new functions.https.HttpsError('failed-precondition', 'Anthropic API key not found');
    }
  
    logger.info('Requirements passed to matchResumeWithRequirements:', JSON.stringify(requirements));
  
    const instruction = `
    You are an insanely critical and skeptical CEO of the company that has one job to offer for the first time in 10 years. You're tasked with evaluating how well a resume matches given job. Your task is to:

    1) For each of the 6 given requirements, critically analyze the candidate's experience. Provide a one-sentence assessment that references specific evidence from the resume, highlighting both strengths and gaps.

    2) Assign a score between 1 - 100 to each requirement, be very critical. your companies future relies on it.

    3) Calculate a total score (1 - 100), giving a critical assesment on the qualifications meeting the requirements.
  
    4) Write a short summary (maximum 30 words) highlighting the biggest strength and weakness, using the format: "Your experience in [area] is [assessment], but [area] is [assessment]."
    
    **Important:** Escape double quotes like this ***"assessment": "Experience with a \"single source of truth\" system."*** . DO NOT include unescaped double quotes within strings!
    
    Format your response as a JSON object with the following structure:
    
    {
    "requirementMatches": [
    {
      requirment 1: list the first requirement that i gave you here, be verbose
      "assessment": "five word explanation."
      "score": 0-100,
    },
    {
      requirment 2: list the second requirement that i gave you here, verbose 
      "assessment": "five word explanation."
      "score": 0-100,
    },
    {
      // Continue for all requirements
    }
  ],
  "totalScore": 0,
  "summary": "You're lacking (five words for x) but can provide (five words for y)."
    }
  `;
  
    const requirementsString = requirements.map((req, index) => 
      `Requirement ${index + 1}: ${req.requirement}`
    ).join('\n');
  
    const promptContent = `${instruction}\nThese are the Requirements I mentioned:\n${requirementsString}\nThese are the qualifications:\n${resumeText}\nNow go:`;
  
    // Prepare the messages array as per the Messages API
    const messages = [
      { role: 'user', content: promptContent }
    ];
  
    logger.info('Messages sent to Anthropic API:', JSON.stringify(messages));
  
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
          messages: messages,
          max_tokens: 2048,
          temperature: 0.7,
          // Optional: Include stop_sequences if needed
          // stop_sequences: ['\n\nHuman:'],
        }),
      });
  
      const data = await anthropicResponse.json();
  
      if (!anthropicResponse.ok) {
        logger.error('Anthropic API error response:', data);
        throw new functions.https.HttpsError('internal', `Anthropic API Error: ${JSON.stringify(data)}`);
      }
  
      // The response content is in data.content, which is an array of content blocks
      if (data.content && Array.isArray(data.content) && data.content.length > 0) {
        const contentBlocks = data.content;
        // Extract the text content from the content blocks
        const content = contentBlocks.map(block => block.text || '').join('').trim();
        try {
          const parsedContent = parseJSONSafely(content);
          logger.info('Parsed content:', JSON.stringify(parsedContent));
          return parsedContent;
        } catch (error) {
          logger.error('Error parsing JSON from Anthropic response:', error);
          logger.error('Raw content:', content);
          throw new functions.https.HttpsError('internal', 'Error parsing JSON from Anthropic response', { content });
        }
      } else {
        logger.error('Unexpected Anthropic API response structure:', data);
        throw new functions.https.HttpsError('internal', 'Unexpected Anthropic API response structure', { data });
      }
    } catch (error) {
      logger.error('Error calling Anthropic API:', error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      } else {
        throw new functions.https.HttpsError('internal', 'Error calling Anthropic API', { message: error.message });
      }
    }
  }

// Helper function to parse JSON safely
function parseJSONSafely(jsonString) {
  let errors = [];

  // First, try to parse the string as-is
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    errors.push({ stage: 'Initial parsing', error: e });

    try {
      // Cleaning steps
      let cleanedString = jsonString.trim();

      // Replace problematic escape sequences
      cleanedString = cleanedString.replace(/\\'/g, "'");
      cleanedString = cleanedString.replace(/\\"/g, '"');
      cleanedString = cleanedString.replace(/\\n/g, '');
      cleanedString = cleanedString.replace(/\\r/g, '');
      cleanedString = cleanedString.replace(/\\t/g, '');
      cleanedString = cleanedString.replace(/\\b/g, '');
      cleanedString = cleanedString.replace(/\\f/g, '');
      cleanedString = cleanedString.replace(/[\u0000-\u001F]+/g, '');

      // Escape unescaped double quotes within string values
      cleanedString = escapeUnescapedQuotesInJSON(cleanedString);

      return JSON.parse(cleanedString);
    } catch (cleanError) {
      errors.push({ stage: 'After cleaning', error: cleanError });

      // Try to extract JSON from code block
      const codeBlockMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        try {
          return JSON.parse(codeBlockMatch[1]);
        } catch (codeBlockError) {
          errors.push({ stage: 'From code block', error: codeBlockError });
        }
      }

      // Try to extract JSON from substring
      const jsonStart = jsonString.indexOf('{');
      const jsonEnd = jsonString.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        let jsonSubstring = jsonString.substring(jsonStart, jsonEnd + 1);

        // Escape unescaped quotes in the substring
        jsonSubstring = escapeUnescapedQuotesInJSON(jsonSubstring);

        try {
          return JSON.parse(jsonSubstring);
        } catch (substringError) {
          errors.push({ stage: 'From extracted substring', error: substringError });
        }
      }
    }
  }

  // All parsing attempts failed
  for (const err of errors) {
    logger.error(`Error parsing JSON at stage: ${err.stage}`, err.error);
  }
  logger.error('Raw content:', jsonString);
  throw new functions.https.HttpsError('internal', 'Error parsing JSON from Anthropic response', { content: jsonString });
}

// Helper function to escape unescaped double quotes inside string values
function escapeUnescapedQuotesInJSON(str) {
  let inString = false;
  let escaped = false;
  let result = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (!inString) {
      if (char === '"') {
        inString = true;
        result += char;
      } else {
        result += char;
      }
    } else {
      if (escaped) {
        result += char;
        escaped = false;
      } else {
        if (char === '\\') {
          result += char;
          escaped = true;
        } else if (char === '"') {
          inString = false;
          result += char;
        } else if (char === '\n' || char === '\r') {
          // Skip unescaped newlines within strings
          result += '\\n';
        } else if (char === '"') {
          // Escape unescaped double quotes
          result += '\\"';
        } else {
          result += char;
        }
      }
    }
  }

  return result;
}
*/




// ======== Placeholder Resume Text ========

const placeholderResumeText = `
---
Los Angeles | www.konkaiser.com | Greencard-Holder | konkaiser@gmail.com | LinkedIn | (925) 860 3801  
Summary 
Senior Product Manager with ten years of experience conceiving, building, and scaling three award-winning 
educational software products from 0 to 100,000+ paying students. I hired and managed three cross-functional 
teams with up to 15 reports on a day-to-day basis. 
Experience 
Freewire Technologies, USA, CA, Oakland (IoT SaaS-Platform for EV Charging) Jan 2023 – Jan 2024 
Senior Product Manager 
• Increased the Net Promoter Score of our SaaS platform by 15 percentage points (as measured in customer 
surveys), cutting its clickstream complexity by 60%, by facilitating a design thinking process with Customer 
Success and Sales Teams, directing enginnering teams in Mexico and India to ensure quality in the UI overhaul.  
• Accelerated feature release intervals from bi-annual to monthly by implementing agile JIRA workflows for 40 
engineers and five PMs, and developed and facilitated five multiplayer Figjam workshops with them and the VP 
of Software to ensure acceptance and adoption. 
• Instigated and architected a “single source of truth” database system to store and operate all device related 
data. Reduced the number of activation and maintenance errors by 15% by unifying nine disparate databases 
and spreadsheets across manufacturing, customer success and field service teams. 
planpolitik, Germany, Berlin (the largest civic training company in Europe) Jan 2012 – Dec 2022 
Head of Department, Online Education Services 
• Enabled my company to scale its business model by digitizing their in-person workshops, creating a new market 
for civic education online. I developed a vision and a go-to-market strategy and built a department that doubled 
my company's overall revenue within six years. 
• Created Senaryon, Europe’s first SaaS platform for civic simulation games, by hiring and directing the company’s 
first Software Engineer and Product Designer to develop and test an MVP within three months, selling the engine 
to 50+ governmental bodies, 2,500+ schools, and 250+ universities, reaching 50,000 students. 
• Initiated, built, and launched two novel educational software products (EU-Lab, Junait) by hiring and directing 
three cross-functional teams (Software Engineering, UX/UI, Instructional Design, Customer Support) through all 
steps of the development cycle, growing them from 0 to 25,000+ users. 
Senior Product Manager 
• Increased students' learning outcomes by 35% through collaborating closely with UX Researchers at the 
University of Göttingen (Germany) and UX Designers at the University of Arts Berlin (Germany). 
• Reached 40,000 additional users by pivoting from universities to high schools, introducing a mobile-friendly 
design system, real-time grading system and shorter game formats. 
Teacher, Presenter, Thought Leader 
• Created 10+ training formats and facilitated them with more than 30,000 students in-person, visiting 300+ 
schools and 50+ universities in eight countries. 
• Spoke at 30 national and international conferences and published four (1, 2, 3, 4) peer-reviewed articles on 
challenges and success factors for online collaboration. 
Education 
• MA (2011, GPA: 3.7) and BA (2008, GPA: 4.0) Politcal Science at the Free University of Berlin, Germany. 
• Harvard Computer Science 50 (Certificate), proficient in SQL Data Analysis, Backend Modeling and APIs as well as 
Frontend Frameworks and Wireframing. 
Extracurriculars 
• Won two international and four national awards for creating innovative education technology (such as the 
Games4Change Award, New York, $10,000 for first place amongst 190 submissions, and the United Nations 
PeaceApp-Award, Cyprus, $5,000 for first place amongst 100 submissions). 
---
`;
