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
  CALLBACK_URL: 'https://e02f-71-146-184-34.ngrok-free.app/jobille-45494/us-central1/handleOxylabsCallback',
  MAX_JOBS_TO_PROCESS: 5,
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

    if (params.start) {
      url.searchParams.set('start', params.start);
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
    callback_url: CONFIG.CALLBACK_URL,
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

const extractIndeedJobId = (url) => {
  if (!url) return url;
  if (url.includes('jk=')) {
    const match = url.match(/jk=([^&]+)/);
    return match ? match[1] : url;
  }
  return url;
};

const ApiService = {
  submitSearchJob: async (payload) => {
    await delay(2000 + Math.random() * 2000);
    
    functions.logger.info("Submitting search job to Oxylabs:", {
      url: payload.url,
      callback_url: payload.callback_url, // Log callback URL
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
    try {
      const response = await axios.get(
        `${CONFIG.BASE_URLS.OXYLABS}/${jobId}`,
        { headers: AuthHelpers.getAuthHeader() }
      );
      
      // Add detailed error logging for faulted/failed states
      if (response.data.status === 'faulted' || response.data.status === 'failed') {
        // Log complete response data
        functions.logger.error("Job failure details:", {
          jobId,
          status: response.data.status,
          url: response.data.url,
          createdAt: response.data.created_at,
          updatedAt: response.data.updated_at,
          context: response.data.context,
          statuses: response.data.statuses,
          clientNotes: response.data.client_notes,
          // Add these additional fields
          session_info: response.data.session_info,
          storage_type: response.data.storage_type,
          storage_url: response.data.storage_url,
          render_status: response.data.render_status,
          parsing_status: response.data.parsing_status,
          // Log any error codes/messages that might be nested
          errors: response.data.errors || response.data.error,
          // Log the full raw response for complete investigation
          rawResponse: response.data
        });

        // Also log the last known good state
        if (response.data.statuses && response.data.statuses.length > 0) {
          functions.logger.info("Last known states before failure:", {
            jobId,
            statusHistory: response.data.statuses
          });
        }
      }
      return response.data;
    } catch (error) {
      // Log API error details
      functions.logger.error("Job status check failed:", {
        jobId,
        errorResponse: error.response?.data,
        errorStatus: error.response?.status,
        errorHeaders: error.response?.headers,
        // Add these
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack
      });
      throw error;
    }
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

        // functions.logger.info("Batch job submission - FULL STRUCTURE:", {
        //   type: "JOB_DETAILS",
        //   response: {
        //     queries: queries.map(query => ({
        //       id: query.id,
        //       url: query.url,
        //       status: query.status,
        //       created_at: query.created_at,
        //       _links: query._links,
        //       fullData: JSON.stringify(query, null, 2)
        //     }))
        //   }
        // });

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

  getAllBatchResults: async (jobConfigs) => {
    functions.logger.info("Starting to fetch all batch results", {
      totalJobs: jobConfigs.length
    });

    // Use Promise.allSettled instead of Promise.all to handle partial failures
    const results = await Promise.allSettled(
      jobConfigs.map(config => 
        PollingService.pollForResults(config.oxylabsId, CONFIG.POLLING_MAX_ATTEMPTS, 3, {
          indeedJobId: config.indeedJobId,
          url: config.url
        })
      )
    );

    // Process the results
    const successfulResults = [];
    const failedResults = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResults.push({
          jobId: jobConfigs[index].indeedJobId,  // Use Indeed ID
          data: result.value
        });
      } else {
        failedResults.push({
          jobId: jobConfigs[index].indeedJobId,  // Use Indeed ID
          error: result.reason.message
        });
      }
    });

    functions.logger.info("Batch results processing complete", {
      totalJobs: jobConfigs.length,
      successfulJobs: successfulResults.length,
      failedJobs: failedResults.length
    });

    if (failedResults.length > 0) {
      functions.logger.warn("Some jobs failed in batch", {
        failedJobs: failedResults
      });
    }

    return {
      successful: successfulResults,
      failed: failedResults
    };
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

    // functions.logger.info("Job results - FULL STRUCTURE:", {
    //   type: "JOB_RESULTS",
    //   jobId,
    //   response: {
    //     fullData: JSON.stringify(response.data, null, 2),
    //     results: response.data.results?.[0],
    //     parsing: {
    //       content: response.data.results?.[0]?.content,
    //       jsonLd: response.data.results?.[0]?.content?.jsonLd
    //     }
    //   }
    // });

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

  pollForResults: async (jobId, maxAttempts = CONFIG.POLLING_MAX_ATTEMPTS, totalRetries = 3, config = null) => {
    let retryCount = 0;
    let currentOxylabsId = jobId;
    
    // Initialize config, preserving URL type
    let originalConfig = config || { 
      url: null,
      indeedJobId: null,
      isSearchJob: jobId.includes('/jobs?')
    };
  
    // If we have a plain URL, set it as original
    if (typeof jobId === 'string' && (jobId.includes('/jobs?') || jobId.includes('/viewjob?'))) {
      originalConfig.url = jobId;
      originalConfig.isSearchJob = jobId.includes('/jobs?');
    }
    
    while (retryCount < totalRetries) {
      let attempts = 0;
      let elapsedTime = 0;
      
      functions.logger.debug(`Started polling job`, {
        oxylabsId: currentOxylabsId,
        indeedJobId: originalConfig.indeedJobId,
        originalUrl: originalConfig.url,
        retry: `${retryCount + 1}/${totalRetries}`
      });
  
      try {
        while (attempts < maxAttempts) {
          attempts++;
          const nextDelay = PollingService.calculateNextDelay(elapsedTime);
          
          try {
            const jobStatus = await ApiService.checkJobStatus(currentOxylabsId);
            
            // If job faults, immediately try new submission
            if (jobStatus.status === 'faulted' || jobStatus.status === 'failed') {
              functions.logger.warn({
                message: `Job faulted - Initiating immediate retry`,
                oxylabsId: currentOxylabsId,
                indeedJobId: originalConfig.indeedJobId,
                attempts,
                durationMs: elapsedTime
              });
              throw new Error('Job faulted - Immediate retry needed');
            }
            
            if (jobStatus.status === 'done') {
              functions.logger.info({
                message: 'Job completed',
                oxylabsId: currentOxylabsId,
                indeedJobId: originalConfig.indeedJobId,
                totalAttempts: attempts,
                durationMs: elapsedTime,
                finalStatus: jobStatus.status,
                retryCount
              });
              return await ApiService.getJobResults(currentOxylabsId);
            }
  
            if (!['pending', 'running'].includes(jobStatus.status)) {
              throw new Error(`Unknown status: ${jobStatus.status}`);
            }
  
          } catch (error) {
            // If it's a fault, break immediately to retry
            if (error.message.includes('faulted') || error.message.includes('Immediate retry needed')) {
              throw error;
            }
  
            await new Promise(resolve => setTimeout(resolve, nextDelay));
            elapsedTime += nextDelay;
            continue;
          }
  
          await new Promise(resolve => setTimeout(resolve, nextDelay));
          elapsedTime += nextDelay;
        }
        
        throw new Error(`Max attempts (${maxAttempts}) reached after ${elapsedTime}ms`);
  
      } catch (error) {
        retryCount++;
        
        if (retryCount >= totalRetries) {
          throw error;
        }
  
        // Create new submission
        let jobUrl;
        if (originalConfig.url) {
          jobUrl = originalConfig.url;
        } else if (originalConfig.isSearchJob) {
          throw new Error('Search job retry attempted without original URL');
        } else {
          jobUrl = `${CONFIG.BASE_URLS.INDEED_VIEW_JOB}?jk=${originalConfig.indeedJobId}`;
        }
        
        const payload = originalConfig.isSearchJob ? 
          PayloadBuilders.createSearchPayload(jobUrl) :
          PayloadBuilders.createBatchJobDetailsPayload([jobUrl]);
  
        const submission = originalConfig.isSearchJob ?
          await ApiService.submitSearchJob(payload) :
          await ApiService.submitBatchJob(payload);
        
        currentOxylabsId = originalConfig.isSearchJob ? 
          submission.id :
          submission.ids[0];
        
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
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
  // Track state across all processing
  state: {
    activeJobs: new Set(),
    MAX_CONCURRENT_JOBS: 13,
    rateLimit: {
      limit: null,
      remaining: null,
      isLimited: false,
      lastUpdated: null
    },
    processedJobs: {
      successful: [],
      failed: [],
      pending: 0
    }
  },

  getRateLimitInfo: (headers) => {
    if (!headers) return null;
    
    // Find the specific render request headers
    const renderLimitHeader = Object.keys(headers).find(key => 
      key.toLowerCase().includes('ratelimit') && 
      key.toLowerCase().includes('render-requests') && 
      key.toLowerCase().includes('limit')
    );
    const renderRemainingHeader = Object.keys(headers).find(key => 
      key.toLowerCase().includes('ratelimit') && 
      key.toLowerCase().includes('render-requests') && 
      key.toLowerCase().includes('remaining')
    );

    return {
      limit: parseInt(headers[renderLimitHeader]) || null,
      remaining: parseInt(headers[renderRemainingHeader]) || null,
      isLimited: headers[renderRemainingHeader] ? 
                 parseInt(headers[renderRemainingHeader]) <= 0 : 
                 false
    };
  },

  updateRateLimits: (headers) => {
    if (!headers) return;
    
    const rateLimitInfo = JobProcessor.getRateLimitInfo(headers);
    if (!rateLimitInfo) return;
    
    JobProcessor.state.rateLimit = {
      ...rateLimitInfo,
      lastUpdated: new Date()
    };

    functions.logger.info("Rate limits updated:", {
      current: JobProcessor.state.rateLimit,
      activeJobs: JobProcessor.state.activeJobs.size
    });

    return JobProcessor.state.rateLimit;
  },

  canStartNewJob: () => {
    const { remaining, isLimited } = JobProcessor.state.rateLimit;
    const currentActiveJobs = JobProcessor.state.activeJobs.size;
    
    // Check both rate limits and concurrent job limit
    return (remaining === null || remaining > 0) && 
           !isLimited && 
           currentActiveJobs < JobProcessor.state.MAX_CONCURRENT_JOBS;
  },

  processJobsInRollingBatches: async (userId, jobs, startTime) => {
    // Reset state for new processing run
    JobProcessor.state = {
      activeJobs: new Set(),
      MAX_CONCURRENT_JOBS: 13,
      rateLimit: {
        limit: null,
        remaining: null,
        isLimited: false,
        lastUpdated: null
      },
      processedJobs: {
        successful: [],
        failed: [],
        pending: jobs.length
      }
    };

    let currentIndex = 0;
    let waitTimeMs = 5000;

    functions.logger.info("Starting concurrent job processing:", {
      totalJobs: jobs.length,
      maxConcurrentJobs: JobProcessor.state.MAX_CONCURRENT_JOBS
    });

    // Create a function to process a single job
    const processJob = async (job) => {
      try {
        const jobUrl = `${CONFIG.BASE_URLS.INDEED_VIEW_JOB}?jk=${job.job_id}`;
        JobProcessor.state.activeJobs.add(job.job_id);
    
        const batchPayload = PayloadBuilders.createBatchJobDetailsPayload([jobUrl]);
        const submission = await ApiService.submitBatchJob(batchPayload);
        
        if (submission.headers) {
          JobProcessor.updateRateLimits(submission.headers);
        }
    
        const result = await ApiService.getAllBatchResults([{
          oxylabsId: submission.ids[0],
          indeedJobId: job.job_id,
          url: jobUrl
        }]);
        
        if (result.successful && result.successful.length > 0) {
          const jobDetails = await JobProcessor.processIndividualJob(
            userId, 
            job, 
            result.successful[0]
          );
    
          if (jobDetails.verificationStatus === 'Success') {
            JobProcessor.state.processedJobs.successful.push(jobDetails);
          } else {
            JobProcessor.state.processedJobs.failed.push(jobDetails);
          }
        } else if (result.failed && result.failed.length > 0) {
          JobProcessor.state.processedJobs.failed.push({
            basicInfo: job,
            verificationStatus: "Failed",
            error: result.failed[0].error
          });
        }
      } catch (error) {
        functions.logger.error("Job processing failed:", {
          jobId: job.job_id,
          error: error.message
        });
        JobProcessor.state.processedJobs.failed.push({
          basicInfo: job,
          verificationStatus: "Failed",
          error: error.message
        });
      } finally {
        JobProcessor.state.activeJobs.delete(job.job_id);
        JobProcessor.state.processedJobs.pending--;
    
        // After this job completes, try to start a new one if there are jobs remaining
        if (currentIndex < jobs.length && JobProcessor.canStartNewJob()) {
          const nextJob = jobs[currentIndex++];
          processJob(nextJob);
        }
    
        // Log progress
        functions.logger.info("Job progress:", {
          processedJobs: currentIndex,
          totalJobs: jobs.length,
          activeJobs: JobProcessor.state.activeJobs.size,
          rateLimit: JobProcessor.state.rateLimit,
          successfulSoFar: JobProcessor.state.processedJobs.successful.length,
          failedSoFar: JobProcessor.state.processedJobs.failed.length,
          pending: JobProcessor.state.processedJobs.pending
        });
      }
    };

    // Start initial batch of concurrent jobs
    const initialBatchSize = Math.min(
      JobProcessor.state.MAX_CONCURRENT_JOBS,
      jobs.length
    );

    const initialPromises = [];
    for (let i = 0; i < initialBatchSize; i++) {
      const job = jobs[currentIndex++];
      initialPromises.push(processJob(job));
    }

    // Wait for all jobs to complete
    while (JobProcessor.state.processedJobs.pending > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const totalTimeMs = Date.now() - startTime;
    functions.logger.info("Completed job processing:", {
      totalJobs: jobs.length,
      successful: JobProcessor.state.processedJobs.successful.length,
      failed: JobProcessor.state.processedJobs.failed.length,
      timeMs: totalTimeMs
    });

    return {
      successful: JobProcessor.state.processedJobs.successful,
      failed: JobProcessor.state.processedJobs.failed,
      stats: {
        totalAttempted: jobs.length,
        successfulJobs: JobProcessor.state.processedJobs.successful.length,
        failedJobs: JobProcessor.state.processedJobs.failed.length,
        processingTimeMs: totalTimeMs
      }
    };
  },

  processIndividualJob: async (userId, job, result) => {
    try {
      const content = result.data.results?.[0]?.content;
      if (!content) {
        throw new Error('No content in response');
      }

      let jobDetails = {};
      
      // Your existing JSON-LD parsing logic...
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
        } catch (error) {
          functions.logger.error("Error parsing JSON-LD:", {
            error: error.message,
            jobId: job.job_id
          });
        }
      }

      // Your existing selector data processing...
      const selectorData = {
        title: content?.jobTitle,
        description: HtmlAnalyzer.extractCleanContent(content?.description),
        location: content?.location,
        company: content?.companyName,
        salary: content?.salary,
        employmentType: content?.employmentType
      };

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
        verificationStatus: "Success"
      };

      await FirestoreService.saveJobToUserCollection(userId, details);
      return details;

    } catch (error) {
      return {
        basicInfo: job,
        verificationStatus: "Failed",
        error: error.message
      };
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
    // Create URLs for both pages
    const pageUrls = [0].map(start => 
      UrlBuilders.buildSearchUrl(q, l, {
        jt,
        fromage,
        radius: radius || "25",
        salary,
        experience: explvl,
        remote,
        start
      })
    );
    
    // Create batch payload for search URLs
    const batchPayload = {
      url: pageUrls,
      source: "universal",
      render: "html",
      parse: true,
      callback_url: CONFIG.CALLBACK_URL,
      parsing_instructions: ParsingInstructions.searchResults
    };

    // Submit batch job for searches
    functions.logger.info("Submitting batch search job:", {
      urls: pageUrls,
      callback_url: CONFIG.CALLBACK_URL
    });

    let batchSubmission;
    try {
      batchSubmission = await ApiService.submitBatchJob(batchPayload);
    } catch (error) {
      functions.logger.error("Failed to submit batch search job:", {
        error: error.message,
        urls: pageUrls
      });
      throw error;
    }

    functions.logger.info("Batch search job submitted:", {
      totalQueries: batchSubmission.queries.length,
      submissionIds: batchSubmission.ids,
      callback_url: CONFIG.CALLBACK_URL
    });

    // Return immediately since results will come through callback
    return res.json({
      status: 'submitted',
      userId,
      searchIds: batchSubmission.ids,
      stats: {
        totalSubmissions: pageUrls.length,
        successfulSubmissions: batchSubmission.queries.length,
        submissionTimeMs: Date.now() - startTime
      }
    });

  } catch (error) {
    functions.logger.error("searchJobs Error", {
      error: error.message || error,
      stack: error.stack,
      timeMs: Date.now() - startTime
    });
    return res.status(500).json({ error: "Internal server error" });
  }
});