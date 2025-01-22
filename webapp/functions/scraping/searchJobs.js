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
  MAX_JOBS_TO_PROCESS: 3,
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
  },
  LOGGING: {
    DEVELOPMENT: 'DEBUG',
    STAGING: 'INFO',
    PRODUCTION: 'INFO'
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

// ============= URL BUILDERS =============s
const UrlBuilders = {
  buildSearchUrl: (keywords, location, params = {}) => {
    const url = new URL(CONFIG.BASE_URLS.INDEED);
    url.searchParams.set('q', keywords);
    
    if (location) {
      url.searchParams.set('l', location);
    }
    
    // Add job type (fulltime, parttime, contract, temporary, internship)
    if (params.jt) {
      url.searchParams.set('jt', params.jt);
    }
    
    // Add date posted (1, 3, 7, 14 days)
    if (params.fromage) {
      url.searchParams.set('fromage', params.fromage);
    }
    
    // Add radius (5, 10, 25, 50 miles)
    if (params.radius) {
      url.searchParams.set('radius', params.radius);
    }
    
    // Add salary (30000, 50000, 75000, 100000, 125000, 150000)
    if (params.salary) {
      url.searchParams.set('salary', params.salary);
    }
    
    // Add experience level (entry_level, mid_level, senior_level)
    if (params.experience) {
      url.searchParams.set('explvl', params.experience);
    }
    
    // Add remote flag
    if (params.remote === 'true') {
      url.searchParams.set('remote', '1');
    }

    // Log the final URL for debugging
    functions.logger.debug("Built search URL:", {
      baseUrl: url.origin + url.pathname,
      params: Object.fromEntries(url.searchParams.entries())
    });
    
    return url.toString();
  },

  buildJobDetailsUrl: (jobId) => {
    // If we receive a full URL, extract just the job ID
    if (typeof jobId === 'string' && jobId.includes('jk=')) {
      const match = jobId.match(/jk=([^&]+)/);
      if (match) {
        jobId = match[1];
      }
    }
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

  createBatchJobDetailsPayload: (jobUrls) => ({
    url: jobUrls,
    source: "universal",
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

    // Add delay before batch submission
    await delay(2000 + Math.random() * 2000);

    try {
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

        functions.logger.info("Batch submission successful:", {
            totalQueries: queries.length,
            firstQueryId: queries[0]?.id,
            responseStatus: response.status
        });

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
    } catch (error) {
        functions.logger.error("Batch submission error details:", {
            status: error.response?.status,
            statusText: error.response?.statusText,
            headers: error.response?.headers,  // Might contain rate limit info
            data: error.response?.data,        // Might contain error details
            config: {
                url: error.config?.url,
                method: error.config?.method,
                headers: error.config?.headers
            }
        });

        functions.logger.error("Full error context:", {
            message: error.message,
            code: error.code,
            stack: error.stack
        });

        // Rethrow with more context if available
        if (error.response?.data) {
            throw new Error(`Batch submission failed: ${JSON.stringify(error.response.data)}`);
        }
        throw error;
    }
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
    if (elapsedTime === 0) return 5000;
    if (elapsedTime < 30000) return 10000;
    if (elapsedTime < 60000) return 15000;
    if (elapsedTime < 120000) return 20000;
    return 30000;
  },

  pollForResults: async (jobId, maxAttempts = CONFIG.POLLING_MAX_ATTEMPTS) => {
    let attempts = 0;
    let elapsedTime = 0;
    let consecutiveErrors = 0;
    let lastLoggedStatus = null;
    const MAX_CONSECUTIVE_ERRORS = 3;
    
    functions.logger.debug(`Started polling job ${jobId}`);

    while (attempts < maxAttempts) {
      attempts++;
      const nextDelay = PollingService.calculateNextDelay(elapsedTime);
      
      try {
        const jobStatus = await ApiService.checkJobStatus(jobId);
        
        // First, check for terminal states before any other processing
        if (jobStatus.status === 'faulted' || jobStatus.status === 'failed') {
          functions.logger.error({
            message: `Job entered terminal state: ${jobStatus.status}`,
            jobId,
            attempts,
            durationMs: elapsedTime,
            url: jobStatus.url,
            errorDetails: {
              status: jobStatus.status,
              updatedAt: jobStatus.updated_at,
              clientNotes: jobStatus.client_notes
            }
          });
          // Exit immediately on terminal states
          return Promise.reject(new Error(`Job ${jobStatus.status} - ${jobStatus.client_notes || 'No additional details'}`));
        }

        // Reset error counter on successful response
        consecutiveErrors = 0;
        
        // Log status transitions
        if (jobStatus.status !== lastLoggedStatus) {
          functions.logger.debug(`Job ${jobId} transitioned to ${jobStatus.status}`);
          lastLoggedStatus = jobStatus.status;
        }
        
        // Handle successful completion
        if (jobStatus.status === 'done') {
          functions.logger.info({
            message: 'Job completed',
            jobId,
            totalAttempts: attempts,
            durationMs: elapsedTime,
            finalStatus: jobStatus.status
          });
          return await ApiService.getJobResults(jobId);
        }

        // Validate status is one we expect
        if (!['pending', 'running'].includes(jobStatus.status)) {
          throw new Error(`Unknown status: ${jobStatus.status}`);
        }

      } catch (error) {
        consecutiveErrors++;
        
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          functions.logger.error({
            message: 'Polling aborted due to consecutive errors',
            jobId,
            attempts,
            consecutiveErrors,
            error: error.message
          });
          throw error;
        }

        functions.logger.warn({
          message: 'Retryable error encountered',
          jobId,
          attempt: attempts,
          consecutiveErrors,
          error: error.message
        });

        await new Promise(resolve => setTimeout(resolve, nextDelay * 1.5));
        elapsedTime += nextDelay * 1.5;
        continue;
      }

      await new Promise(resolve => setTimeout(resolve, nextDelay));
      elapsedTime += nextDelay;
    }
    
    functions.logger.error({
      message: 'Max polling attempts reached',
      jobId,
      attempts: maxAttempts,
      totalDurationMs: elapsedTime
    });
    throw new Error(`Max attempts (${maxAttempts}) reached after ${elapsedTime}ms`);
  }
}

// ============= FIRESTORE SERVICE =============
// Helper function to recursively remove undefined values and replace them with null
const sanitizeForFirestore = (obj) => {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item));
  }
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitizeForFirestore(v)])
    );
  }
  return obj;
};

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
                     
    const cleanedDetails = sanitizeForFirestore({
      ...jobDetail,
      details: {
        ...jobDetail.details,
        description: HtmlAnalyzer.extractCleanContent(jobDetail.details?.description || "No description available."),
        title: HtmlAnalyzer.extractCleanContent(jobDetail.details?.title || ""),
        location: HtmlAnalyzer.extractCleanContent(jobDetail.details?.location || ""),
      },
      lastUpdated: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp()
    });

    // First check if the document exists
    const doc = await docRef.get();
    if (!doc.exists) {
        // Only create if it doesn't exist
        await docRef.set(cleanedDetails);
    } else {
        // Update if it exists
        await docRef.update(cleanedDetails);
    } 

    try {
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
      // Process jobs in batches of 5
      const jobsToProcess = jobs.slice(0, CONFIG.MAX_JOBS_TO_PROCESS);
      
      // Prepare URLs for batch processing
      const jobUrls = jobsToProcess.map(job => 
        `${CONFIG.BASE_URLS.INDEED_VIEW_JOB}?jk=${job.job_id}`
      );

      const batchPayload = PayloadBuilders.createBatchJobDetailsPayload(jobUrls);

      functions.logger.info("Debug - Full Batch Payload:", {
        totalUrls: jobUrls.length,
        firstUrl: jobUrls[0],
        payload: JSON.stringify(batchPayload, null, 2)
      });

      const batchSubmission = await ApiService.submitBatchJob(batchPayload);

      functions.logger.info("Batch jobs created:", {
        totalQueries: batchSubmission.queries.length,
        queryIds: batchSubmission.ids
      });

      // Get all results from batch processing
      const batchResults = await ApiService.getAllBatchResults(batchSubmission.ids);

      // Process and save results
      const processedResults = await Promise.all(
        batchResults.map(async (result, index) => {
          const job = jobsToProcess[index];
          const queryInfo = batchSubmission.queries[index];
          const content = result.results?.[0]?.content;

          let jobDetails = {};
          
          // Try to parse JSON-LD data first
          if (content?.jsonLd) {
            try {
              const jsonLd = JSON.parse(content.jsonLd);
              jobDetails = {
                title: jsonLd.title,
                description: HtmlAnalyzer.extractCleanContent(jsonLd.description),
                location: jsonLd.jobLocation?.address ? 
                  `${jsonLd.jobLocation.address.addressLocality}, ${jsonLd.jobLocation.address.addressRegion}` : 
                  null,
                salary: jsonLd.baseSalary ? {
                  min: jsonLd.baseSalary.value.minValue,
                  max: jsonLd.baseSalary.value.maxValue,
                  currency: jsonLd.baseSalary.currency,
                  unit: jsonLd.baseSalary.value.unitText
                } : null,
                company: jsonLd.hiringOrganization?.name,
                employmentType: jsonLd.employmentType,
                datePosted: jsonLd.datePosted,
                validThrough: jsonLd.validThrough
              };

              functions.logger.info("Successfully parsed JSON-LD data", {
                jobId: job.job_id,
                hasDescription: !!jobDetails.description,
                hasSalary: !!jobDetails.salary
              });
            } catch (error) {
              functions.logger.error("Error parsing JSON-LD:", {
                error: error.message,
                jobId: job.job_id
              });
            }
          }

          // Merge with or fallback to CSS selector data
          const selectorData = {
            title: content?.jobTitle,
            description: HtmlAnalyzer.extractCleanContent(content?.description),
            location: content?.location,
            company: content?.companyName,
            salary: content?.salary,
            employmentType: content?.employmentType
          };

          // Combine both sources, preferring JSON-LD when available
          const combinedDetails = {
            title: jobDetails.title || selectorData.title,
            description: jobDetails.description || selectorData.description,
            location: jobDetails.location || selectorData.location,
            company: jobDetails.company || selectorData.company,
            salary: jobDetails.salary || selectorData.salary,
            employmentType: jobDetails.employmentType || selectorData.employmentType,
            datePosted: jobDetails.datePosted,
            validThrough: jobDetails.validThrough
          };

          const details = {
            basicInfo: job,
            details: combinedDetails,
            verificationStatus: "Success",
            queryInfo: {
              id: queryInfo.id,
              created_at: queryInfo.created_at,
              status: queryInfo.status
            }
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
  const { 
    userId, 
    q,           // keywords
    l,           // location
    jt,          // job type
    fromage,     // date posted
    radius,      // search radius
    salary,      // minimum salary
    explvl,      // experience level
    remote       // remote only
  } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const searchUrl = UrlBuilders.buildSearchUrl(q, l, {
      jt,
      fromage,
      radius,
      salary,
      experience: explvl,
      remote
    });
    
    functions.logger.info("Search URL:", { 
      url: searchUrl,
      params: {
        keywords: q,
        location: l,
        jobType: jt,
        datePosted: fromage,
        radius,
        salary,
        experience: explvl,
        remote
      }
    });

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