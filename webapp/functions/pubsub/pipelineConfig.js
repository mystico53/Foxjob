// pipeline-config.js
const pipelineSteps = {
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
    collections: ['users', 'jobs'],
    api: 'anthropic'
  },

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
    triggerTopic: 'job-description-extracted',
    fallbackValue: 'na',
    collections: ['users', 'jobs'],
    api: 'anthropic'
  },

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
    collections: ['users', 'jobs'],
    api: 'anthropic'
  }
};

module.exports = { pipelineSteps };