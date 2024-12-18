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
    You are an insanely critical and skeptical CEO of the company that has one job to offer for the first time in 10 years. You're tasked with evaluating how well a resume matches the following domain expertise requirement:
    
    Domain: ${domainExpertise.name}
    Description: ${domainExpertise.assessment}
    Importance Level: ${domainExpertise.importance}

    Your task is to:
    1) Write a critical two-sentence assessment that references specific evidence from the resume, highlighting both strengths and gaps.
    2) Assign a score between 1 - 100, be very critical, your company's future relies on it. Only rate specific expertise mentioned, not genreal skills, e.g. management, or programming
    3) Write a short summary (maximum 15 words) highlighting the biggest strength and weakness.
    
    Format your response as a JSON object with the following structure:
    {
      "assessment": "two sentence assessment",
      "score": 0,
      "summary": "short summary"
    }
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
• Instigated and architected a "single source of truth" database system to store and operate all device related 
data. Reduced the number of activation and maintenance errors by 15% by unifying nine disparate databases 
and spreadsheets across manufacturing, customer success and field service teams. 
planpolitik, Germany, Berlin (the largest civic training company in Europe) Jan 2012 – Dec 2022 
Head of Department, Online Education Services 
• Enabled my company to scale its business model by digitizing their in-person workshops, creating a new market 
for civic education online. I developed a vision and a go-to-market strategy and built a department that doubled 
my company's overall revenue within six years. 
• Created Senaryon, Europe's first SaaS platform for civic simulation games, by hiring and directing the company's 
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