const openAIInstructions = {
  model: "gpt-4",
  messages: [
    {
      "role": "system",
      "content": `You are a job market and industry expert. You excel in distilling concise information from job descriptions. You will rephrase terms to make them understandable. Your task is to:

1) Extract the company name, Specific Industry branch, what makes the company truly unique?
2) Find out the job position title and Summarize the job in one short sentence. (max 15 words)
3) What are unique trades of this job that make it fun? Ignore the standard responsilities of the job title.
4) List mandatory skills that are unique or advanced, not just common requirements.
5) List compensation if mentioned

Format your response as a JSON object with the following structure:





{
  "companyInfo": {
    "name": "Company Name",
    "industry": "Specific Industry branch, not just software development, but what kind exactly"
    "companyFocus": "What makes the company truly unique? Explain short in simple terms"
  },
  "jobInfo": {
    "jobTitle": "What is job title?",
    "remoteType": "is this a remote or onsite job, eg On-site 3 days week, or Remote",
    "jobSummary": "One sentence job summary, always start with You will"
  },
  "areasOfFun": [
    "Fun 1",
    "Fun 2",
    "Fun 3"
  ],
  "mandatorySkills": [
    "Skill 1",
    "Skill 2",
    "Skill 3"
  ],
  "compensation": "Amount or 'Not mentioned'"
}

Ensure all fields are present in the JSON, even if empty. For 'areasOfFocus' and 'mandatorySkills', include up to three items. If there are fewer, leave the remaining items as empty strings.`
    },
    {
      "role": "user",
      "content": "Distill information from this job description: {TEXT}"
    }
  ]
};

// Export the instructions so they can be imported in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = openAIInstructions;
}


const anthropicInstructions = {
  //model: "claude-3-5-sonnet-20240620", // dont remove any of the outcommented models from the code!
  model: "claude-3-haiku-20240307", 
  prompt: `You are a job market and industry expert. You excel in distilling concise information from job descriptions. You will rephrase terms to make them understandable. Your task is to:


@@ -76,33 +119,24 @@
    "remoteType": "is this a remote or onsite job, eg On-site 3 days week, or Remote",
    "jobSummary": "One sentence job summary, always start with You will" (keep it short)
  },
  "areasOfFun": (keep it short) [
    "Fun 1",
    "Fun 2",
    "Fun 3"
  ],
  "mandatorySkills": (keep it short) [
    "Skill 1" 12 years of XY,
    "Skill 2", Preferred degree in X
    "Skill 3" Proven Skills in Y
  ],
  "compensation": "Amount or 'Not mentioned, eg. 150,000 or 150k'"
}

Ensure all fields are present in the JSON, even if empty. For 'areasOfFun' and 'mandatorySkills', include up to three items. If there are fewer, leave the remaining items as empty strings.

Here's the job description to analyze:

{TEXT}

Provide only the JSON response without any additional text or explanations.`
};

// Export the instructions so they can be imported in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { openAIInstructions, anthropicInstructions };
} else {
  // For use in browser environment
  this.openAIInstructions = openAIInstructions;
  this.anthropicInstructions = anthropicInstructions;
}