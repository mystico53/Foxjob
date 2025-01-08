const { onRequest } = require('firebase-functions/v2/https');
const axios = require('axios');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue } = require("firebase-admin/firestore");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ============= CONFIG =============
const CONFIG = {
  OXY_USERNAME: "mystico_FXPQA",
  OXY_PASSWORD: "ti_QMg2h2WzZMp",
  BASE_URLS: {
    INDEED: 'https://www.indeed.com/jobs',
    INDEED_VIEW_JOB: 'https://www.indeed.com/viewjob',
    OXYLABS: 'https://data.oxylabs.io/v1/queries',
    OXYLABS_RESULTS: 'https://data.oxylabs.io/v1/queries',
    OXYLABS_BATCH: 'https://data.oxylabs.io/v1/queries/batch',
  },
  MAX_JOBS_TO_PROCESS: 1,
  POLLING_MAX_ATTEMPTS: 30,
  POLLING_INITIAL_DELAY: 1000,
  SELECTORS: {
    JOB_CARD: ".job_seen_beacon",
    JOB_ID: ".//@data-jk",
    JOB_LINK: ".//h2[contains(@class,'jobTitle')]/a/@href",
    JOB_TITLE: ".//h2[contains(@class,'jobTitle')]//span/text()",
    COMPANY_NAME: ".//span[@data-testid='company-name']//text()",
    DETAIL_SELECTORS: {
      TITLE: "[data-testid='simpler-jobTitle'], [data-testid='jobsearch-JobInfoHeader-title']",
      LOCATION: "[data-testid='job-location'], [data-testid='jobsearch-JobInfoHeader-companyLocation'], [data-testid='inlineHeader-companyLocation']",
      DESCRIPTION: "#jobDescriptionText.jobsearch-JobComponent-description",
      POSTING_DATE: ".jobSectionHeader:contains('Job Posting Date') + div, [data-testid='job-posting-date']"
    }
  }
};

// ============= AUTH HELPERS =============
const AuthHelpers = {
  getAuthHeader: () => {
    const authStr = Buffer.from(`${CONFIG.OXY_USERNAME}:${CONFIG.OXY_PASSWORD}`).toString('base64');
    return {
      "Content-Type": "application/json",
      "Authorization": `Basic ${authStr}`
    };
  }
};

// ============= URL BUILDERS =============
const UrlBuilders = {
  buildSearchUrl: (keywords, location) => {
    const url = new URL(CONFIG.BASE_URLS.INDEED);
    url.searchParams.set('q', keywords || 'test');
    if (location) {
      url.searchParams.set('l', location);
    }
    return url.toString();
  },

  buildJobDetailsUrl: (jobId) => {
    return `${CONFIG.BASE_URLS.INDEED_VIEW_JOB}?jk=${jobId}`;
  }
};

// ============= PARSING INSTRUCTIONS =============
const ParsingInstructions = {
  searchResults: {
    job_listings: {
      _fns: [{ _fn: "css", _args: [CONFIG.SELECTORS.JOB_CARD] }],
      _items: {
        job_id: {
          _fns: [{ _fn: "xpath_one", _args: [CONFIG.SELECTORS.JOB_ID] }]
        },
        job_link: {
          _fns: [{ _fn: "xpath_one", _args: [CONFIG.SELECTORS.JOB_LINK] }]
        },
        job_title: {
          _fns: [{ _fn: "xpath_one", _args: [CONFIG.SELECTORS.JOB_TITLE] }]
        },
        company_name: {
          _fns: [{ _fn: "xpath_one", _args: [CONFIG.SELECTORS.COMPANY_NAME] }]
        }
      }
    }
  },

  jobDetails: {
    jobTitle: {
      _fns: [{ _fn: "css", _args: [CONFIG.SELECTORS.DETAIL_SELECTORS.TITLE] }]
    },
    location: {
      _fns: [{ _fn: "css", _args: [CONFIG.SELECTORS.DETAIL_SELECTORS.LOCATION] }]
    },
    description: {
      _fns: [{ _fn: "css", _args: [CONFIG.SELECTORS.DETAIL_SELECTORS.DESCRIPTION] }]
    },
    postingDate: {
      _fns: [{ _fn: "css", _args: [CONFIG.SELECTORS.DETAIL_SELECTORS.POSTING_DATE] }]
    }
  }
};

// ============= PAYLOAD BUILDERS =============
const PayloadBuilders = {
  createSearchPayload: (searchUrl) => ({
    source: "universal",
    url: searchUrl,
    render: "html",
    parse: true,
    parsing_instructions: ParsingInstructions.searchResults
  }),

  createJobDetailsPayload: (viewJobUrl) => ({
    source: "universal",
    url: viewJobUrl,
    render: "html",
    parse: true,
    parsing_instructions: ParsingInstructions.jobDetails
  })
};

// ============= HTML ANALYZER =============
const HtmlAnalyzer = {
  analyzeContent: (htmlContent) => {
    return {
      hasJobTitle: htmlContent.includes('jobsearch-JobInfoHeader-title'),
      hasLocation: htmlContent.includes('jobsearch-JobInfoHeader-companyLocation'),
      hasCompany: htmlContent.includes('jobsearch-CompanyInfoContainer'),
      hasDescription: htmlContent.includes('jobDescriptionText'),
      dataTestIds: htmlContent.match(/data-testid="([^"]+)"/g)?.slice(0, 10),
      jobsearchClasses: htmlContent.match(/class="[^"]*jobsearch[^"]*"/g)?.slice(0, 10)
    };
  },

  extractCleanContent: (content) => {
    if (!content) return "No description available.";
    if (Array.isArray(content)) {
      return content
        .map(item => (typeof item === 'string' ? item.replace(/<[^>]*>/g, '').trim() : item))
        .filter(Boolean);
    }
    return content.replace(/<[^>]*>/g, '').trim();
  },
  
};

// ============= API SERVICE =============
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const ApiService = {
  submitSearchJob: async (payload) => {
    // Add delay of 1-2 seconds before making request
    await delay(2000 + Math.random() * 2000); // Random delay between 2-4 seconds
    functions.logger.info("Delaying:", delay);

    functions.logger.info("Submitting search job to Oxylabs:", {
      url: payload.url,
      source: payload.source,
      hasParsingInstructions: !!payload.parsing_instructions
    });

    const response = await axios.post(
      CONFIG.BASE_URLS.OXYLABS,
      payload,
      { headers: AuthHelpers.getAuthHeader() }
    );

    functions.logger.info("Search job submission response:", {
      jobId: response.data.id,
      status: response.data.status,
      timeMs: response.data.time_taken
    });

    return response.data;
  },

  checkJobStatus: async (jobId) => {
    // No need for delay here as this is just checking status
    functions.logger.debug("Checking job status:", { jobId });
    
    const response = await axios.get(
      `${CONFIG.BASE_URLS.OXYLABS}/${jobId}`,
      { headers: AuthHelpers.getAuthHeader() }
    );

    functions.logger.info("Job status response:", {
      jobId,
      status: response.data.status,
      progress: response.data.progress
    });

    return response.data;
  },

  submitBatchJob: async (payload) => {
    functions.logger.info("Submitting batch job to Oxylabs:", {
      urlCount: payload.url.length,
      source: payload.source
    });

    const response = await axios.post(
      CONFIG.BASE_URLS.OXYLABS_BATCH,
      payload,
      { headers: AuthHelpers.getAuthHeader() }
    );

    const { queries } = response.data;

    if (!queries || !queries.length) {
      throw new Error('No queries returned in batch response');
    }

    // Log each query's basic info
    queries.forEach(query => {
      functions.logger.info("Batch query created:", {
        id: query.id,
        url: query.url,
        status: query.status,
        createdAt: query.created_at
      });
    });

    // Return structured data with query information
    return {
      ids: queries.map(query => query.id),
      queries: queries.map(query => ({
        id: query.id,
        url: query.url,
        status: query.status,
        created_at: query.created_at,
        results_url: query._links.find(link => link.rel === 'results')?.href
      }))
    };
  },

  getAllBatchResults: async (jobIds) => {
    const results = await Promise.all(
      jobIds.map(jobId => PollingService.pollForResults(jobId))
    );
    
    return results;
  },

  getJobResults: async (jobId) => {
    // Add delay before fetching results
    await delay(1000 + Math.random() * 1000); // Random delay between 1-2 seconds

    functions.logger.info("Fetching job results:", { jobId });
    
    const response = await axios.get(
      `${CONFIG.BASE_URLS.OXYLABS}/${jobId}/results`,
      { headers: AuthHelpers.getAuthHeader() }
    );

    functions.logger.info("Job results received:", {
      jobId,
      hasContent: !!response.data.results?.[0]?.content,
      contentSize: JSON.stringify(response.data).length
    });

    return response.data;
  }
};

// ============= POLLING SERVICE =============
const PollingService = {
  calculateNextDelay: (elapsedTime) => {
    // Start with shorter intervals and gradually increase
    if (elapsedTime === 0) return 5000;  // Start with 5s
    if (elapsedTime < 30000) return 10000;  // 10s intervals until 30s
    if (elapsedTime < 60000) return 15000;  // 15s intervals until 60s
    if (elapsedTime < 120000) return 20000; // 20s intervals until 120s
    return 30000;  // 30s intervals after 120s
  },

  pollForResults: async (jobId, maxAttempts = CONFIG.POLLING_MAX_ATTEMPTS) => {
    let attempts = 0;
    let elapsedTime = 0;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;

    functions.logger.info("Starting polling for results:", {
      jobId,
      maxAttempts,
      initialDelay: 5000
    });

    while (attempts < maxAttempts) {
      attempts++;
      const nextDelay = PollingService.calculateNextDelay(elapsedTime);
      
      try {
        functions.logger.debug("Polling attempt:", {
          jobId,
          attempt: attempts,
          elapsedTime,
          nextDelay,
          consecutiveErrors
        });

        const jobStatus = await ApiService.checkJobStatus(jobId);
        
        // Reset consecutive errors on successful API call
        consecutiveErrors = 0;
        
        if (jobStatus.status === 'done') {
          functions.logger.info("Polling successful:", {
            jobId,
            totalAttempts: attempts,
            totalTimeMs: elapsedTime
          });
          return await ApiService.getJobResults(jobId);
        }
        
        if (jobStatus.status === 'faulted') {
          throw new Error(`Job faulted with status: ${JSON.stringify(jobStatus)}`);
        }

        // Additional status handling
        if (jobStatus.status === 'failed') {
          throw new Error(`Job failed with status: ${JSON.stringify(jobStatus)}`);
        }

        if (!['pending', 'running'].includes(jobStatus.status)) {
          throw new Error(`Unknown job status: ${jobStatus.status}`);
        }

      } catch (error) {
        consecutiveErrors++;
        
        functions.logger.error("Polling attempt error:", {
          jobId,
          attempt: attempts,
          error: error.message,
          consecutiveErrors,
          elapsedTime
        });

        // If we hit too many consecutive errors, abort
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          throw new Error(`Polling aborted after ${consecutiveErrors} consecutive errors: ${error.message}`);
        }

        // On error, we might want to wait a bit longer before retrying
        await new Promise(resolve => setTimeout(resolve, nextDelay * 1.5));
        elapsedTime += nextDelay * 1.5;
        continue;
      }

      await new Promise(resolve => setTimeout(resolve, nextDelay));
      elapsedTime += nextDelay;
    }
    
    throw new Error(`Max polling attempts (${maxAttempts}) reached after ${elapsedTime}ms`);
  }
}

// ============= FIRESTORE SERVICE =============
const FirestoreService = {
  saveJobToUserCollection: async (userId, jobDetail) => {
    // Add debug logging to see what we're trying to save
    functions.logger.debug("Attempting to save job with details:", {
      userId,
      jobDetailId: jobDetail?.basicInfo?.job_id,
      basicInfo: jobDetail?.basicInfo
    });

    if (!userId || !jobDetail?.basicInfo?.job_id) {
      throw new Error(`Invalid document path parameters. userId: ${userId}, jobId: ${jobDetail?.basicInfo?.job_id}`);
    }

    const docRef = db.collection('users')
                    .doc(userId)
                    .collection('scrapedjobs')
                    .doc(jobDetail.basicInfo.job_id);  
    
    functions.logger.info("Saving job to Firestore:", {
      userId,
      jobId: jobDetail.basicInfo.job_id,
      hasDetails: !!jobDetail.details
    });
                     
    const cleanedDetails = {
      ...jobDetail,
      details: {
        ...jobDetail.details,
        description: HtmlAnalyzer.extractCleanContent(jobDetail.details?.description|| "No description available."),
        title: HtmlAnalyzer.extractCleanContent(jobDetail.details?.title),
        location: HtmlAnalyzer.extractCleanContent(jobDetail.details?.location)
      },
      lastUpdated: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp()
    };

    try {
      await docRef.set(cleanedDetails, { merge: true });
      functions.logger.info("Successfully saved job to Firestore:", {
        userId,
        jobId: jobDetail.basicInfo.job_id,
        timeMs: Date.now()
      });
    } catch (error) {
      functions.logger.error("Error saving job to Firestore:", {
        userId,
        jobId: jobDetail.basicInfo.job_id,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
};

// ============= JOB PROCESSOR =============
const JobProcessor = {
  processJobDetails: async (userId, jobs, startTime) => {
    functions.logger.info("Starting batch job processing:", {
      userId,
      totalJobs: jobs.length,
      jobsToProcess: Math.min(jobs.length, CONFIG.MAX_JOBS_TO_PROCESS)
    });

    try {
      // Prepare URLs for batch processing
      const jobUrls = jobs
        .slice(0, CONFIG.MAX_JOBS_TO_PROCESS)
        .map(job => `${CONFIG.BASE_URLS.INDEED_VIEW_JOB}?jk=${job.job_id}`);

        const batchPayload = {
          url: jobUrls,
          source: "universal",
          render: "html",
          parse: true,
          parsing_instructions: {
            jobTitle: {
              _fns: [{
                _fn: "css",
                _args: ["[data-testid='simpler-jobTitle'], [data-testid='jobsearch-JobInfoHeader-title']"]
              }]
            },
            location: {
              _fns: [{
                _fn: "css",
                _args: ["[data-testid='job-location'], [data-testid='jobsearch-JobInfoHeader-companyLocation']"]
              }]
            },
            description: {
              _fns: [{
                _fn: "css",
                _args: ["#jobDescriptionText.jobsearch-JobComponent-description"]
              }]
            }
          }
        };

      const batchSubmission = await ApiService.submitBatchJob(batchPayload);

      functions.logger.info("Batch jobs created:", {
        totalQueries: batchSubmission.queries.length,
        queryIds: batchSubmission.ids,
      });

      functions.logger.info("Batch submission response:", batchSubmission);      

      // Get all results from batch processing
      const batchResults = await ApiService.getAllBatchResults(batchSubmission.ids);

      functions.logger.info("Batch results:", batchResults);

      // Process and save results
      const processedResults = await Promise.all(
        batchResults.map(async (result, index) => {
          const job = jobs[index];
          const queryInfo = batchSubmission.queries[index];

          const details = {
            basicInfo: job,
            verificationStatus: "Success",
            queryInfo: {
              id: queryInfo.id,
              created_at: queryInfo.created_at,
              status: queryInfo.status
            },
            rawResult: result
          };

          await FirestoreService.saveJobToUserCollection(userId, details);
          return details;
        })
      );

      functions.logger.info("Completed batch job processing:", {
        userId,
        totalProcessed: processedResults.length,
        successfulJobs: processedResults.filter(r => r !== null).length,
        totalTimeMs: Date.now() - startTime
      });

      return processedResults;

    } catch (error) {
      functions.logger.error("Error in batch processing:", {
        userId,
        error: error.message,
        stack: error.stack,
        timeMs: Date.now() - startTime
      });
      throw error;
    }
  }
};

// ============= MAIN FUNCTION =============
exports.searchJobs = onRequest({ 
  timeoutSeconds: 540,
  memory: "1GiB"
}, async (req, res) => {
  const startTime = Date.now();
  const { userId, keywords, location } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const searchUrl = UrlBuilders.buildSearchUrl(keywords, location);
    functions.logger.info("Search URL:", { url: searchUrl });

    const searchPayload = PayloadBuilders.createSearchPayload(searchUrl);
    const jobSubmission = await ApiService.submitSearchJob(searchPayload);
    const results = await PollingService.pollForResults(jobSubmission.id);

    if (results.results?.[0]?.content?.job_listings) {
      const jobs = results.results[0].content.job_listings;
      const jobDetailsResults = await JobProcessor.processJobDetails(userId, jobs, startTime);
      
      return res.json({
        userId,
        jobs: jobs,
        count: jobs.length,
        jobDetails: jobDetailsResults
      });
    }

    return res.json({ jobs: [], count: 0 });

  } catch (error) {
    functions.logger.error("searchJobs Error", {
      error: error.message || error,
      stack: error.stack,
      timeMs: Date.now() - startTime
    });
    return res.status(500).json({ error: "Internal server error" });
  }
});