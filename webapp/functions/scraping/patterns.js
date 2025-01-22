// patterns.js

module.exports = {
    BLACKLIST: [
      // Company/HR boilerplate
      /equal opportunity/i,
      /eeo/i,
      /discrimination/i,
      /benefits include/i,
      /salary/i,
      /\$[\d,]+/,
      /compensation/i,
      /about (us|our company)/i,
      /recruitment scams/i,
      /location/i,
      /headquartered/i,
      /our mission/i,
      /our values/i,
      /our culture/i,
      /why work (at|with) us/i,
      /what we offer/i,
      /perks/i,
      /benefits package/i,
      /work-life balance/i,
      /flexible/i,
      /\b401k\b/i,
      /insurance/i,
      /pto/i,
      /paid time off/i,
      /hybrid/i,
      /remote work/i,
      /work from home/i,
      /wfh/i,
      /founded/i,
      /company description/i,
      /forward-looking/i,
      /affirmative action/i,
      /military/i,
      /veteran/i,
      /disability/i,
      /reasonable accommodation/i,
      /drug[\s-]?test/i,
      /background check/i,
      /clearance/i,
      /relocation/i,
      /travel required/i,
      /\% travel\b/i,
    ],
  
    WHITELIST: [
      // Skills/Requirements
      /skills?:/i,
      /required skills?:/i,
      /qualifications?:/i,
      /proficient in/i,
      /experience with/i,
      /knowledge of/i,
      /familiar with/i,
      /ability to/i,
      /expert in/i,
      /solid understanding of/i,
      /competencies/i,
      /requirements?:/i,
      /must have/i,
      /preferred/i,
      /basic/i,
      /advanced/i,
      /demonstrated/i,
      /proven/i,
      /track record/i,
      /proficiency/i,
      /expertise in/i,
      /understanding of/i,
      /background in/i,
      /years of experience/i,
      /hands-?on/i,
      /certification/i,
      /degree/i,
      
      // Responsibilities
      /responsibilities?:/i,
      /duties?:/i,
      /responsible for/i,
      /in this role/i,
      /this role/i,
      /you will/i,
      /including/i,
      /your day-to-day/i,
      /you'll do things like/i,
      /core duties/i,
      /position overview/i,
      /job summary/i,
      /the ideal candidate/i,
      /we're looking for/i,
      /key responsibilities/i,
      /essential functions/i,
      /primary duties/i,
      /role description/i,
      /job description/i,
      /position description/i,
      /what you'll do/i,
      /what you'll own/i,
      /what you'll be doing/i,
      /objectives?:/i,
      /main tasks?:/i,
      /day to day/i,
      /accountab(le|ilities)/i,
      /key areas of focus/i,
      /success in this role/i,
      /expected to/i,
      /will be tasked with/i
    ]
  };