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
        sampleJobs: jobs.slice(0, 3)  // Log first 3 jobs
      });

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