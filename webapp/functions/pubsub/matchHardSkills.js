const functions = require('firebase-functions');
const admin = require('firebase-admin');
const logger = require("firebase-functions/logger");
require('dotenv').config();
const OpenAI = require('openai');
const { z } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');

const openai = new OpenAI();
const db = admin.firestore();

exports.matchHardSkills = functions.pubsub
  .topic('hard-skills-extracted')
  .onPublish(async (message) => {
    try {
      logger.info('matchHardSkills function called');
      
      // Parse the message data properly from base64
      const messageData = message.data ? 
        JSON.parse(Buffer.from(message.data, 'base64').toString()) :
        {};

      logger.info('Parsed Pub/Sub message data:', messageData);

      const { googleId, docId } = messageData;  // Changed from jobReference to docId

      if (!docId || !googleId) {
        logger.error('Missing docId or googleId in Pub/Sub message.');
        throw new Error('Missing docId or googleId');
      }

      // Retrieve the user's resume
      const userCollectionsRef = db.collection('users').doc(googleId).collection('UserCollections');
      const resumeQuery = userCollectionsRef.where('type', '==', 'Resume').limit(1);
      const resumeSnapshot = await resumeQuery.get();

      let resumeText;

      if (resumeSnapshot.empty) {
        logger.warn(`No resume found for user ID: ${googleId}. Using placeholder resume.`);
        resumeText = placeholderResumeText;
      } else {
        const resumeDoc = resumeSnapshot.docs[0];
        resumeText = resumeDoc.data().extractedText;
      }

      // Retrieve the job document and hard skills
      const jobDocRef = db
        .collection('users')
        .doc(googleId)
        .collection('jobs')
        .doc(docId);  // Changed from jobReference to docId

      const jobDoc = await jobDocRef.get();

      if (!jobDoc.exists) {
        logger.warn(`No job document found for job ID: ${docId}`);
        throw new Error('No job document found');
      }

      const jobData = jobDoc.data();
      const hardSkills = jobData.Requirements?.Hardskills;

      if (!hardSkills || Object.keys(hardSkills).length === 0) {
        logger.warn(`No hard skills found for job ID: ${docId}`);
        throw new Error('No hard skills found');
      }

      // Convert hard skills object to array for processing with new structure
      const hardSkillsArray = Object.entries(hardSkills).map(([key, skill]) => ({
        key: key,
        hardSkill: `${skill.Name}: ${skill.Description}`  // Updated to use new structure
      }));

      logger.info('Processed hard skills array:', JSON.stringify(hardSkillsArray));

      // Call OpenAI API to match resume with hard skills
      const matchResult = await matchResumeWithHardSkills(resumeText, hardSkillsArray);

      // Prepare the Score object to be saved in the job document
      const scoreObject = {
        Hardskills: {
          Total: {
            score: matchResult.totalScore,
            assessment: matchResult.summary
          }
        }
      };

      if (!scoreObject.Score) {
        scoreObject.Score = {};
      }
      if (!scoreObject.Score.Hardskills) {
        scoreObject.Score.Hardskills = {};
      }
      
      matchResult.hardSkillMatches.forEach((match, index) => {
        scoreObject.Score.Hardskills[`HS${index + 1}`] = {
          hardSkill: match.hardSkill,
          score: match.score,
          assessment: match.assessment
        };
      });

      // Update the job document with the new Score object
      await jobDocRef.update(scoreObject);
      logger.info(`HardskillScore saved to job document for job ID: ${docId}, user ID: ${googleId}`);

      await jobDocRef.update({
        'generalData.processingStatus': 'processing'
      });

      logger.info(`Processing status updated to "processing" in generalData for job ID: ${docId}, user ID: ${googleId}`);

    } catch (error) {
      logger.error('Error in matchHardSkills function:', error);
      throw error;  // Rethrow the error to ensure the function fails properly
    }
  });

async function matchResumeWithHardSkills(resumeText, hardSkills) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    logger.error('OpenAI API key not found');
    throw new functions.https.HttpsError('failed-precondition', 'OpenAI API key not found');
  }

  logger.info('Hard skills passed to matchResumeWithHardSkills:', JSON.stringify(hardSkills));

  const instruction = `
    You are an insanely critical and skeptical CEO of the company that has one job to offer for the first time in 10 years. You're tasked with evaluating how well a resume matches a set of hard skills. Your task is to:
    1) For each of the 5 given hard skills, critically analyze the candidate's hard skills. Provide a one-sentence assessment that references specific evidence from the resume, highlighting both strengths and gaps.
    2) Assign an individual score between 1 - 100 to each hard skill, be very critical. your companies future relies on it.
    3) Calculate a total score (1 - 100), giving a critical assessment on the qualifications meeting the requirements.
  
    4) Write a short summary (maximum 15 words) highlighting the biggest strength and weakness, using the format: "Your experience in [area] is [assessment], but [area] is [assessment]."
    
    Format your response as a JSON object with the following structure:
    {
      "hardSkillMatches": [
        {
          "hardSkill": "",
          "assessment": "",
          "score": 0
        },
        // Continue for all hardskills
      ],
      "totalScore": 0,
      "summary": ""
    }
  `;

  const hardSkillsString = hardSkills.map((skill, index) =>
    `Hard Skill ${index + 1}: ${skill.hardSkill}`
  ).join('\n');

  const promptContent = `${instruction}\nThese are the Hard Skills I mentioned:\n${hardSkillsString}\nThese are the qualifications:\n${resumeText}\nNow go:`;

  const HardSkillMatchingSchema = z.object({
    hardSkillMatches: z.array(
      z.object({
        hardSkill: z.string(),
        assessment: z.string(),
        score: z.number(),
      })
    ),
    totalScore: z.number(),
    summary: z.string(),
  });

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert at structured data extraction." },
        { role: "user", content: promptContent },
      ],
      response_format: zodResponseFormat(HardSkillMatchingSchema, "hard_skill_matching"),
    });

    const parsedContent = completion.choices[0].message.parsed;

    // Optional: Add validation for scores here
    parsedContent.hardSkillMatches.forEach((match) => {
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
