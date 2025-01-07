const { onRequest } = require('firebase-functions/v2/https');
const axios = require('axios');
const functions = require('firebase-functions');

// Configuration
const CONFIG = {
  OXY_USERNAME: "mystico_FXPQA",
  OXY_PASSWORD: "ti_QMg2h2WzZMp",
  BASE_URLS: {
    INDEED: 'https://www.indeed.com/jobs',
    INDEED_VIEW_JOB: 'https://www.indeed.com/viewjob',
    OXYLABS: 'https://data.oxylabs.io/v1/queries',
    OXYLABS_RESULTS: 'https://data.oxylabs.io/v1/queries'
  }
};

// Helper Functions
const getAuthHeader = () => {
  const authStr = Buffer.from(`${CONFIG.OXY_USERNAME}:${CONFIG.OXY_PASSWORD}`).toString('base64');
  return {
    "Content-Type": "application/json",
    "Authorization": `Basic ${authStr}`
  };
};

const buildSearchUrl = (keywords, location) => {
  const url = new URL(CONFIG.BASE_URLS.INDEED);
  url.searchParams.set('q', keywords || 'test');
  if (location) {
    url.searchParams.set('l', location);
  }
  return url.toString();
};

const createSearchPayload = (searchUrl) => ({
  source: "universal",
  url: searchUrl,
  render: "html",
  parse: true,
  parsing_instructions: {
    job_listings: {
      _fns: [{ _fn: "css", _args: [".job_seen_beacon"] }],
      _items: {
        job_id: {
          _fns: [{ _fn: "xpath_one", _args: [".//@data-jk"] }]
        },
        job_link: {
          _fns: [{ _fn: "xpath_one", _args: [".//h2[contains(@class,'jobTitle')]/a/@href"] }]
        },
        job_title: {
          _fns: [{ _fn: "xpath_one", _args: [".//h2[contains(@class,'jobTitle')]//span/text()"] }]
        },
        company_name: {
          _fns: [{ _fn: "xpath_one", _args: [".//span[@data-testid='company-name']//text()"] }]
        }
      }
    }
  }
});

const createJobDetailsPayload = (viewJobUrl) => ({
  source: "universal",
  url: viewJobUrl,
  render: "html",
  parse: true,
  wait_for: ["#jobDescriptionText", "[data-testid='jobsearch-JobInfoHeader-title']"],
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
        _args: ["[data-testid='job-location'], [data-testid='jobsearch-JobInfoHeader-companyLocation'], [data-testid='inlineHeader-companyLocation']"]
      }]
    },
    description: {
      _fns: [{
        _fn: "css",
        _args: ["#jobDescriptionText.jobsearch-JobComponent-description"]
      }]
    },
    postingDate: {
      _fns: [{
        _fn: "css",
        _args: [".jobSectionHeader:contains('Job Posting Date') + div, [data-testid='job-posting-date']"]
      }]
    },
    salary: {
      _fns: [{
        _fn: "css",
        _args: ["[data-testid='attribute_snippet_compensation'], .salary-snippet-container"]
      }]
    },
    employmentType: {
      _fns: [{
        _fn: "css",
        _args: ["[data-testid='attribute_snippet_job_type'], .metadata:contains('Job Type') + *"]
      }]
    },
    benefits: {
      _fns: [{
        _fn: "css",
        _args: ["[data-testid='job-benefits-section']"]
      }]
    }
  }
});

// API Calls
const submitSearchJob = async (payload) => {
  const response = await axios.post(
    CONFIG.BASE_URLS.OXYLABS,
    payload,
    { headers: getAuthHeader() }
  );
  return response.data;
};

const checkJobStatus = async (jobId) => {
  const response = await axios.get(
    `${CONFIG.BASE_URLS.OXYLABS}/${jobId}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

const getJobResults = async (jobId) => {
  const response = await axios.get(
    `${CONFIG.BASE_URLS.OXYLABS}/${jobId}/results`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

// Poll for results with exponential backoff
const pollForResults = async (jobId, maxAttempts = 10, initialDelay = 1000) => {
  let attempts = 0;
  let delay = initialDelay;

  while (attempts < maxAttempts) {
    const jobStatus = await checkJobStatus(jobId);
    
    if (jobStatus.status === 'done') {
      return await getJobResults(jobId);
    } else if (jobStatus.status === 'faulted') {
      throw new Error(`Job failed: ${jobId}`);
    }

    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, delay));
    delay *= 2;
    attempts++;
  }
  
  throw new Error('Max polling attempts reached');
};

const getJobDetails = async (jobId, basicInfo, startTime) => {
  try {
    const viewJobUrl = `${CONFIG.BASE_URLS.INDEED_VIEW_JOB}?jk=${jobId}`;
    functions.logger.info("Getting details for job:", {
      id: jobId,
      url: viewJobUrl,
      timeMs: Date.now() - startTime
    });

    // Submit job details request
    const detailsPayload = createJobDetailsPayload(viewJobUrl);
    const detailsJob = await submitSearchJob(detailsPayload);
    
    // Poll for details results
    const detailsResponse = await pollForResults(detailsJob.id);
    
    functions.logger.info("Retrieved details for job", {
      id: jobId,
      timeMs: Date.now() - startTime,
      hasContent: !!detailsResponse?.results?.[0]?.content
    });

    return {
      basicInfo,
      detailsResponse,
      timeTaken: Date.now() - startTime
    };

  } catch (error) {
    functions.logger.error("Error getting job details:", {
      error: error.message || error,
      stack: error.stack,
      jobId,
      timeMs: Date.now() - startTime
    });
    
    return {
      basicInfo,
      error: error.message || "Failed to fetch job details",
      timeTaken: Date.now() - startTime
    };
  }
};

// Main Function
exports.searchJobs = onRequest({ 
  timeoutSeconds: 540,
  memory: "1GiB"
}, async (req, res) => {
  const startTime = Date.now();
  try {
    const { keywords, location } = req.query;
    const searchUrl = buildSearchUrl(keywords, location);
    functions.logger.info("Search URL:", { url: searchUrl });

    // Submit the search job
    const searchPayload = createSearchPayload(searchUrl);
    const jobSubmission = await submitSearchJob(searchPayload);
    functions.logger.info("Job submitted:", { 
      jobId: jobSubmission.id,
      status: jobSubmission.status
    });

    // Poll for results
    const results = await pollForResults(jobSubmission.id);
    functions.logger.info("Results retrieved:", {
      timeMs: Date.now() - startTime
    });

    // Process and return results
    if (results.results && results.results[0]?.content?.job_listings) {
      const jobs = results.results[0].content.job_listings;
      
      // Log the results we got back
      functions.logger.info("Job listings retrieved:", {
        totalJobs: jobs.length,
        page: results.results[0].content.page,
        totalJobsCount: results.results[0].content.totalJobs,
        sampleJobs: jobs.slice(0, 3)  // Log first 3 jobs
      });

      // Get job details if there are jobs
      if (jobs.length > 0) {
        functions.logger.info("Starting to process jobs for details", {
          totalJobs: jobs.length,
          processingJobs: Math.min(jobs.length, 3)
        });
        
        const jobDetailsPromises = jobs.slice(0, 3).map(async (job) => {
          functions.logger.info("Fetching details for job:", {
            id: job.job_id,
            title: job.job_title,
            company: job.company_name
          });

          return getJobDetails(job.job_id, job, startTime);
        });

        const jobDetailsResults = await Promise.all(jobDetailsPromises);
        
        // Log detailed information for each job
        functions.logger.info("All job details retrieved", {
          count: jobDetailsResults.length,
          jobs: jobDetailsResults.map(result => {
            const jobContent = result.detailsResponse?.results?.[0]?.content;
            const basicInfo = result.basicInfo;
            return {
              basicInfo: {
                id: basicInfo.job_id,
                title: basicInfo.job_title,
                company: basicInfo.company_name,
              },
              details: {
                title: jobContent?.jobTitle,
                location: jobContent?.location,
                datePosted: jobContent?.postingDate,
                salary: jobContent?.salary,
                employmentType: jobContent?.employmentType,
                benefits: jobContent?.benefits,
                hasDescription: !!jobContent?.description,
                descriptionLength: jobContent?.description?.length,
                hasCompanyInfo: !!jobContent?.companyInfo
              }
            };
          })
        });

        return res.json({
          jobs: jobs,
          count: jobs.length,
          jobDetails: jobDetailsResults
        });
      }

      return res.json({
        jobs: jobs,
        count: jobs.length
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