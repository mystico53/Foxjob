// pipeline-config.js
const pipelineSteps = {
  
/*//extract_job_description ********************************************************************* 
**********************************************************************/ 
  extractJobDescription: {
    name: 'extract_job_description',
    instructions: "Extract and faithfully reproduce the following job posting, including all details about the position, company, and application process. Do not summarize, condense, or omit any information. The goal is to create an exact replica of the original job posting, ensuring all content and nuances are captured.\n\nHere is the job posting to extract:\n\n{TEXT}",
    inputs: [{
      path: 'texts.rawText',
      placeholder: '{TEXT}'
    }],
    outputPath: 'texts.extractedText',
    outputTransform: {
      type: 'direct'
    },
    triggerTopic: 'raw-text-stored',
    nextTopic: 'job-description-extracted',
    fallbackValue: 'na',
    collectionPath: ['jobs'],
    api: 'anthropic'
  },

  /*//extract_Jobs_Responsibilites ********************************************************************* 
**********************************************************************/ 
  extractJobsResponsibilities: {
    name: 'extract_Jobs_Responsibilites',
    instructions: `You will be given a job posting to analyze. Extract and summarize in two parts:
1. A single sentence describing what the company does and their domain expertise
2. A single sentence describing what the role is about at a high level

Format your response exactly like this:
Company: [One sentence description]
Role: [One sentence description]

Do not include any specific requirements or qualifications.

Job posting to analyze:
{TEXT}`,
    inputs: [{
      path: 'texts.extractedText',
      placeholder: '{TEXT}'
    }],
    outputPath: 'jobdetails.jobsresponsibilities',
    outputTransform: {
      type: 'direct'
    },
    triggerTopic: 'job-description-extracted debug',
    fallbackValue: 'na',
    collectionPath: ['jobs'],
    api: 'anthropic'
  },

  
  /*//extract_all_skills_needed ********************************************************************* 
**********************************************************************/ 

  extractAllSkillsNeeded: {
    name: 'extract_all_skills_needed',
    instructions: `Extract all skills mentioned from this job description, be neutral and comprehensive. if the job description structures the skills in categories, such as e.g "required,must have, preferred, bonus, mininum," keep them and add it in brackets behind the name. if it doesnt mention it, dont create the brackets.

Format your response as a JSON object with the following structure:

{
  "skill1": {
    "name": "name of skill (single word)",
    "description": "one short sentence description of this skill (if mentioned required/preferred/etc, otherwise leave blank ())"
  },
  "skill2": {
    "name": "name of skill (single word)",
    "description": "one short sentence description of this skill (if mentioned required/preferred/etc, otherwise leave blank ())"
  }
  // ... not more than 10
}

Here's the job description to analyze:

{TEXT}

Provide only the JSON response without any additional text or explanations.`,
    inputs: [{
      path: 'texts.extractedText',
      placeholder: '{TEXT}'
    }],
    outputPath: 'allSkills',
    outputTransform: {
      type: 'numbered',
      pattern: 'skill{n}',
      fields: {
        name: 'name',
        description: 'description'
      }
    },
    triggerTopic: 'job-description-extracted',
    nextTopic: 'skills-needed-extracted',
    fallbackValue: {},
    collectionPath: ['jobs'],
    api: 'anthropic'
  },

  /*//match_top_skills test********************************************************************* 
**********************************************************************/ 

matchTopSkills: {
  name: 'match_top_skills',
  instructions: `Read the skills and add the word "fun" in front of each one.

Format your response as a JSON object with the following structure:

{
  "skill1": {
    "add fun": "fun + name of skill",
  }
  // ... continue for all skills
}

Here are the skills {ALLSKILLS}.

Provide only the JSON response without any additional text or explanations.`,
inputs: [
  {
    path: 'allSkills',
    placeholder: '{ALLSKILLS}',
  },
],
  outputPath: 'allSkills',
  outputTransform: {
    type: 'extend',
    pattern: 'skill{n}',
    fields: {
      funname: 'funname',
    }
  },
  triggerTopic: 'skills-needed-extracted',
  fallbackValue: {},
  collectionPath: ['jobs'],
  api: 'anthropic'
},

  /*//match_top_skills backup********************************************************************* 
**********************************************************************/ /*

matchTopSkills: {
  name: 'match_top_skills',
  instructions: `Based on job and its responsibilities, rank the following skills by importance. Then split them into three equally sized categories:

1. must have
2. should have
3. could have

Format your response as a JSON object with the following structure:

{
  "skill1": {
    "name": "name of skill (single word)",
    "description": "why it is important",
    "category": "must have/could have/should have"
  },
  "skill2": {
    "name": "name of skill (single word)",
    "description": "why it is important",
    "category": "must have/could have/should have"
  }
  // ... continue for all skills
}

Here's the jobs responsibilities and the skills to analyze:

{RESPONSIBILITIES}, {TEXT}

Provide only the JSON response without any additional text or explanations.`,
inputs: [
  {
    path: 'allSkills',  // First input from allSkills
    placeholder: '{TEXT}',
    separator: '\n\nJob Responsibilities:\n'
  },
  {
    path: 'jobdetails.jobsresponsibilities',  // Second input from jobdetails
    placeholder: '{RESPONSIBILITIES}'
  }
],
  outputPath: 'topSkills',
  outputTransform: {
    type: 'numbered',
    pattern: 'skill{n}',
    fields: {
      name: 'name',
      description: 'description',
      category: 'category'
    }
  },
  triggerTopic: 'skills-needed-extracted',
  fallbackValue: {},
  collectionPath: ['jobs'],
  api: 'anthropic'
},*/

  /*//extract_Domain_Expertise********************************************************************* 
**********************************************************************/ 

  extractDomainExpertise: {
    name: 'extract_Domain_Expertise',
    instructions: `if true: extract where specific domain expertise is discussed and what words are used (e.g. "required, preferred, passion, bonus, etc.") respond in this format. a lot of jbo descriptions do not indicate it strongly - that's ok too. 

    Domain expertise is the in-depth knowledge and specialized skills in a particular field, industry, or area of work. It involves having a thorough understanding of the nuances, best practices, trends, challenges, and key concepts specific to that field. Ignore any standard skills that are expected for this kind of job and mark them as no_strong_indication.

only pick one domain, not two. if you have more than one, pick the more domain specific one (eg. dentist-tech instead of health cloud software)

if it is not strongly mentioned or formulated in a general way that applies to all proper candidates: reply with "no strong indication"

instructions: Extract domain expertise requirements from the job description and analyze how they are characterized. Format your response as a JSON object according to the following structure:

{
  "domain_expertise": {
    "field": "specific domain area in ELI5 words (use 'not specified' if no specific domain is mentioned)",
    "requirement_level": "ENUM: ['required', 'preferred', 'bonus', 'passionate', 'no_strong_indication']",
    "context": "direct quote from the text that supports this classification (leave empty if none found)",
    "justification": "brief explanation of why this classification was chosen (1-2 sentences)"
  }
}

Format rules:
- Use only one domain expertise field (the most prominently mentioned)
- For requirement_level, use exactly one of the predefined ENUM values
- If multiple requirement levels are mentioned, choose the strongest one
- If domain expertise is mentioned but without clear requirement level, use 'no_strong_indication'
- Context should be a direct quote if available
- Justification should explain the reasoning behind the classification

Here's the job description to analyze:

{TEXT}

Provide only the JSON response without any additional text or explanations.`,
    inputs: [{
      path: 'texts.extractedText',
      placeholder: '{TEXT}'
    }],
    outputPath: 'jobdetails.domainExpertise',
    outputTransform: {
      type: 'fixed',
      fields: {
        domain_expertise: {
          field: 'field',
          requirement_level: 'requirement_level',
          context: 'context',
          justification: 'justification'
        }
      }
    },
    triggerTopic: 'job-description-extracted debug',
    fallbackValue: 'na',
    collectionPath: ['jobs'],
    api: 'anthropic'
  },

    /*//match_resume_with_top_skills********************************************************************* 
  **********************************************************************/ 

  matchResumeWithTopSkills: {
    name: 'match_resume_with_top_skills',
    instructions: `Compare the resume with the top skills. divide the skills in two buckets "Capable" and "Gaps" based on how well the candidate matches the top skills (required is more important than preferred, or bonus)

  Format your response as a JSON object with the following structure:

  {
  "criteria1": {
    "name": "name of skill (single word)",
    "description": "why you picked the category",
    "category": "gap or capable"
  },
  "criteria2": {
    "name": "name of skill (single word)",
    "description": "why you picked the category",
    "category": "gap or capable"
  }
  // ... continue for all skills
  }

  Here's the jobs top skills {TEXT} and the resume '{RESUME}' to analyze:

  Provide only the JSON response without any additional text or explanations.`,
    inputs: [
      {
        path: 'jobs.topSkills',
        placeholder: '{TEXT}',
        separator: '\n\nResume:\n'
      },
      {
        path: 'UserCollections.extractedText',
        placeholder: '{RESUME}'
      }
    ],
    outputPath: 'matchGaps',
    outputTransform: {
      type: 'numbered',
      pattern: 'criteria{n}',
      fields: {
        name: 'name',
        description: 'description',
        category: 'category'
      }
    },
    triggerTopic: 'skills-needed-extracted debug',
    fallbackValue: {},
    collectionPath: [
      { collectionPath: 'jobs' }, // uses default docId
      { collectionPath: 'UserCollections', customDocId: 'resume' } // uses 'resume' as docId
    ],
    api: 'anthropic'
  }
};


module.exports = { pipelineSteps };