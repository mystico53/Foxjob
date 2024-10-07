const functions = require('firebase-functions');
const admin = require('firebase-admin');
const logger = require("firebase-functions/logger");
const fetch = require('node-fetch');
require('dotenv').config();

const db = admin.firestore();

exports.calculateScore = functions.pubsub
  .topic('requirements-gathered')
  .onPublish(async (message) => {
    try {
      logger.info('calculateScore function called');
      logger.info('Pub/Sub Message:', JSON.stringify(message.json));

      const { jobReference, googleId } = message.json;

      if (!jobReference || !googleId) {
        logger.error('Missing jobReference or googleId in Pub/Sub message.');
        return;
      }

      // Retrieve the user's resume
      const userCollectionsRef = db.collection('users').doc(googleId).collection('UserCollections');
      const resumeQuery = userCollectionsRef.where('type', '==', 'Resume').limit(1);
      const resumeSnapshot = await resumeQuery.get();

      let resumeText;

      if (resumeSnapshot.empty) {
        logger.warn(`No resume found for user ID: ${googleId}. Using placeholder resume.`);
        resumeText = placeholderResumeText; // Use the placeholder text
      } else {
        const resumeDoc = resumeSnapshot.docs[0];
        resumeText = resumeDoc.data().extractedText;
      }

      // Retrieve the job requirements
      const requirementsRef = db
        .collection('users')
        .doc(googleId)
        .collection('jobs')
        .doc(jobReference)
        .collection('requirements')
        .doc('document');

      const requirementsDoc = await requirementsRef.get();

      if (!requirementsDoc.exists) {
        logger.warn(`No requirements found for job ID: ${jobReference}`);
        return;
      }

      const requirements = requirementsDoc.data().requirements;

      // Call Anthropic API to match resume with job requirements
      const matchResult = await matchResumeWithRequirements(resumeText, requirements);

      // Save the match result to the specified Firestore path
      const scoreRef = db
        .collection('users')
        .doc(googleId)
        .collection('jobs')
        .doc(jobReference)
        .collection('score') 
        .doc('document');

      await scoreRef.set({ matchResult });

      logger.info(`Match result saved to score document for job ID: ${jobReference}, user ID: ${googleId}`);
    } catch (error) {
      logger.error('Error in calculateScore function:', error);
    }
  });

async function matchResumeWithRequirements(resumeText, requirements) {
  const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic.api_key;

  if (!apiKey) {
    logger.error('Anthropic API key not found');
    throw new Error('Anthropic API key not found');
  }

  const instruction = `You are an AI assistant tasked with critically evaluating how well a resume matches given job requirements. Your task is to:

1) Match each of the 6 given requirements with the candidate's experience, being very overly critical in your assessment (one short sentence).
2) Score each requirement match on a scale of 0-100, where 100 is a perfect match and 0 is no match at all.
3) Calculate a total score based on the average of these 6 requirement scores.
4) Write a short summary (max 30 words) highlighting the biggest pro and the biggest con for why the candidate is or isn't a good fit. Use the format "Your experience in [area] is [assessment], but [area] is [assessment]."

Format your response as a JSON object with the following structure:

{
  "requirementMatches": [
    {
      "requirement": "Requirement 1",
      "score": 0,
      "assessment": "Brief one short sentence explanation of score"
    },
    {
      "requirement": "Requirement 2",
      "score": 0,
      "assessment": "Brief one short sentence explanation of score"
    },
    {
      "requirement": "Requirement 3",
      "score": 0,
      "assessment": "Brief one short sentence explanation of score"
    },
    {
      "requirement": "Requirement 4",
      "score": 0,
      "assessment": "Brief one short sentence explanation of score"
    },
    {
      "requirement": "Requirement 5",
      "score": 0,
      "assessment": "Brief one short sentence explanation of score"
    },
    {
      "requirement": "Requirement 6",
      "score": 0,
      "assessment": "Brief one short sentence explanation of score"
    }
  ],
  "totalScore": 0,
  "summary": "Your experience in [area] is [assessment], but [area] is [assessment]."
}`;

  const prompt = `${instruction}\n\nResume:\n${resumeText}\n\nJob Requirements:\n${requirements}`;

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
