// pubsub/pipelineConfig.js

const pipelineSteps = {
  extractJobDescription: {
    name: 'extract_job_description',
    instructions: "Extract and faithfully reproduce the entire job posting, including all details about the position, company, and application process. Maintain the original structure, tone, and level of detail. Include the job title, location, salary (if provided), company overview, full list of responsibilities and qualifications (both required and preferred), unique aspects of the role or company, benefits, work environment details, and any specific instructions or encouragement for applicants. Preserve all original phrasing, formatting, and stylistic elements such as questions, exclamations, or creative language. Do not summarize, condense, or omit any information. The goal is to create an exact replica of the original job posting, ensuring all content and nuances are captured.",
    inputPath: 'texts.rawText',
    outputPath: 'texts.extractedText',
    triggerTopic: 'raw-text-stored',
    nextTopic: 'job-description-extracted',
    fallbackValue: 'na',
    collections: ['users', 'jobs'],
    api: 'anthropic', // Specify the API to use
  },

  extractAllSkillsNeeded: {
    name: 'extract_all_skills_needed',
    instructions: "List all skills needed for this job in a neutral and comprehensive way. If there is a structure of mandatory/required and or preferred/minimum, etc. keep these.",
    inputPath: 'texts.extractedText',
    outputPath: 'needed.skills',
    triggerTopic: 'job-description-extracted',
    nextTopic: 'skills-needed-extracted',
    fallbackValue: 'na',
    collections: ['users', 'jobs'],
    api: 'openai', // Use OpenAI API for this step
  },

  // Add other pipeline steps as needed...
};

module.exports = pipelineSteps;
