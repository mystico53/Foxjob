const functions = require('firebase-functions');
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

      const { googleId, jobReference } = message.json;

      if (!jobReference || !googleId) {
        logger.error('Missing jobReference or googleId in Pub/Sub message.');
        throw new Error('Missing jobReference or googleId');
      }

      // Retrieve the user's resume
      const userCollectionsRef = db.collection('users').doc(googleId).collection('UserCollections');
      const resumeQuery = userCollectionsRef.where('type', '==', 'Resume').limit(1);
      const resumeSnapshot = await resumeQuery.get();

      let resumeText;

      if (resumeSnapshot.empty) {
        logger.warn(`No resume found for user ID: ${googleId}. Using placeholder resume.`);
        resumeText = placeholderResumeText; // Make sure this is defined or imported
      } else {
        const resumeDoc = resumeSnapshot.docs[0];
        resumeText = resumeDoc.data().extractedText;
      }

      // Retrieve the job document and requirements
      const jobDocRef = db
        .collection('users')
        .doc(googleId)
        .collection('jobs')
        .doc(jobReference);

      const jobDoc = await jobDocRef.get();

      if (!jobDoc.exists) {
        logger.warn(`No job document found for job ID: ${jobReference}`);
        throw new Error('No job document found');
      }

      const jobData = jobDoc.data();
      const requirements = jobData.requirements;

      if (!requirements || Object.keys(requirements).length === 0) {
        logger.warn(`No requirements found for job ID: ${jobReference}`);
        throw new Error('No requirements found');
      }

      // Convert requirements object to array for processing
      const requirementsArray = Object.entries(requirements).map(([key, value]) => ({
        key: key,
        requirement: value
      }));

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

      // Update the job document with the new Score object
      await jobDocRef.update(scoreObject);

      logger.info(`Score saved to job document for job ID: ${jobReference}, user ID: ${googleId}`);

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

  const instruction = `You are an insanely critical and skeptical CEO of the company that has one job to offer for the first time in 10 years. You're tasked with evaluating how well a resume matches given job. Your task is to:

1) For each of the 6 given requirements, critically analyze the candidate's experience. Provide a one-sentence assessment that references specific evidence from the resume, highlighting both strengths and gaps.

2) Assign a score between 1 - 100 to each requirement, be very critical. your companies future relies on it.

3) Calculate a total score (1 - 100) based on the weakest link.

4) Write a short summary (maximum 30 words) highlighting the biggest strength and weakness, using the format: "Your experience in [area] is [assessment], but [area] is [assessment]."

Format your response as a JSON object with the following structure:

{
  "requirementMatches": [
    {
      
      "score": 0,
      "assessment": "A few short words as explanation, ultra short."
    },
    {
      
      "score": 0,
      "assessment": "A few short words as explanation, ultra short."
    },
    {
      // Continue for all requirements
    }
  ],
  "totalScore": 0,
  "summary": "Your experience in [area] is [assessment], but [area] is [assessment]."
}`;

  const prompt = `${instruction}\nJob Requirements:\n${requirements}\nResume:\n${resumeText}\n\n`;

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
      throw new functions.https.HttpsError('internal', `Anthropic API Error: ${JSON.stringify(data)}`);
    }

    if (data.content && data.content.length > 0 && data.content[0].type === 'text') {
      const content = data.content[0].text.trim();
      try {
        const jsonContent = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        return JSON.parse(jsonContent);
      } catch (error) {
        logger.error('Error parsing JSON from Anthropic response:', error);
        throw new functions.https.HttpsError('internal', 'Error parsing JSON from Anthropic response');
      }
    } else {
      logger.error('Unexpected Anthropic API response structure:', data);
      throw new functions.https.HttpsError('internal', 'Unexpected Anthropic API response structure');
    }
  } catch (error) {
    logger.error('Error calling Anthropic API:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    } else {
      throw new functions.https.HttpsError('internal', 'Error calling Anthropic API', error.message);
    }
  }
}


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
