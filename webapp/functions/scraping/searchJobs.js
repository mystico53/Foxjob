const { onRequest } = require('firebase-functions/v2/https');
const axios = require('axios');
const functions = require('firebase-functions');

// Configuration
const CONFIG = {
  OXY_USERNAME: "mystico_FXPQA",
  OXY_PASSWORD: "ti_QMg2h2WzZMp",
  TIMEOUTS: {
    FUNCTION: 240,
    SEARCH: 90000,     // reduced from 60000 as per original
    VERIFY: 90000,     // specific to verification stage
    DETAILS: 90000     // for detailed parsing
  },
  BASE_URLS: {
    INDEED: 'https://www.indeed.com/jobs',
    INDEED_VIEW_JOB: 'https://www.indeed.com/viewjob',
    OXYLABS: 'https://realtime.oxylabs.io/v1/queries'
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
  wait_for: [".job_seen_beacon"],
  timeout: 60000,  // Original timeout value
  limit: 2,
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
      timeout: CONFIG.TIMEOUTS.DETAILS,
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
        _args: ["[data-testid='vjJobDetails-test']"]
      }]
    }
  }
});

// API Calls
const makeOxylabsRequest = async (payload, customTimeout = CONFIG.TIMEOUTS.SEARCH) => {
  const response = await axios.post(
    CONFIG.BASE_URLS.OXYLABS,
    payload,
    {
      headers: getAuthHeader(),
      timeout: customTimeout
    }
  );
  
  // Log complete response structure
  functions.logger.info("Complete Oxylabs response structure:", {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    responseSize: JSON.stringify(response.data).length
  });
  
  return response;
};

const verifyJobPage = async (viewJobUrl) => {
  const verifyPayload = {
    source: "universal",
    url: viewJobUrl,
    render: "html",
    parse: false
  };

  return makeOxylabsRequest(verifyPayload, CONFIG.TIMEOUTS.VERIFY);
};

const analyzeHtmlContent = (htmlContent) => {
  return {
    hasJobTitle: htmlContent.includes('jobsearch-JobInfoHeader-title'),
    hasLocation: htmlContent.includes('jobsearch-JobInfoHeader-companyLocation'),
    hasCompany: htmlContent.includes('jobsearch-CompanyInfoContainer'),
    hasDescription: htmlContent.includes('jobDescriptionText'),
    dataTestIds: htmlContent.match(/data-testid="([^"]+)"/g)?.slice(0, 10),
    jobsearchClasses: htmlContent.match(/class="[^"]*jobsearch[^"]*"/g)?.slice(0, 10)
  };
};

const getJobDetails = async (jobId, firstJob, startTime) => {
  const viewJobUrl = `${CONFIG.BASE_URLS.INDEED_VIEW_JOB}?jk=${jobId}`;
  functions.logger.info("Constructed job detail URL:", { url: viewJobUrl });

  try {
    // Verify page loads
    const verifyPage = await verifyJobPage(viewJobUrl);
    const htmlContent = verifyPage.data.results[0].content;

    if (!htmlContent) {
      return { error: "Page verification failed" };
    }

    // Log HTML content analysis
    functions.logger.info("HTML Content Analysis:", analyzeHtmlContent(htmlContent));

    // Get detailed job information
    const detailsResponse = await makeOxylabsRequest(createJobDetailsPayload(viewJobUrl));

    functions.logger.info("Parsing complete", {
      status: detailsResponse.status,
      timeMs: Date.now() - startTime,
      fullJobData: {
        rawResponse: detailsResponse.data,
        jobContent: detailsResponse.data.results?.[0]?.content,
        parsedTitle: detailsResponse.data.results?.[0]?.content?.jobTitle,
        parsedLocation: detailsResponse.data.results?.[0]?.content?.location,
        parsedDescription: detailsResponse.data.results?.[0]?.content?.description,
        allParsedFields: Object.keys(detailsResponse.data.results?.[0]?.content || {}),
        responseStatus: detailsResponse.status,
        jobId: firstJob.job_id,
        searchJobTitle: firstJob.job_title,
        searchCompanyName: firstJob.company_name,
        fullHtmlContent: detailsResponse.data.results?.[0]?.content || null
      }
    });

    return {
      detailsResponse: detailsResponse.data,
      verificationStatus: "Success"
    };

  } catch (error) {
    functions.logger.error("Error in job details process:", {
      error: error.message,
      stack: error.stack,
      url: viewJobUrl,
      timeMs: Date.now() - startTime,
      stage: error.config?.url.includes('verify') ? 'verification' : 'parsing'
    });
    return {
      error: `Failed during ${error.config?.url.includes('verify') ? 'verification' : 'parsing'} stage`
    };
  }
};

// Main Function
exports.searchJobs = onRequest({ timeoutSeconds: CONFIG.TIMEOUTS.FUNCTION }, async (req, res) => {
  const startTime = Date.now();
  try {
    const { keywords, location } = req.query;
    const searchUrl = buildSearchUrl(keywords, location);
    functions.logger.info("Search URL:", { url: searchUrl });

    const searchPayload = createSearchPayload(searchUrl);
    functions.logger.info("Sending payload to Oxylabs", { payload: searchPayload });

    const response = await makeOxylabsRequest(searchPayload);
    functions.logger.info("Initial search request completed in:", { 
      timeMs: Date.now() - startTime 
    });

    // Validate response structure
    if (!response.data.results) {
      functions.logger.warn("No 'results' field in Oxylabs response", {
        responseKeys: Object.keys(response.data)
      });
      return res.status(200).json({ error: "No results field" });
    }

    const { results } = response.data;
    if (!Array.isArray(results) || results.length === 0) {
      functions.logger.warn("Results array details:", {
        isArray: Array.isArray(results),
        length: results.length,
        type: typeof results,
        sample: results
      });
      return res.status(200).json({ error: "Empty results array" });
    }

    const firstResult = results[0];
    if (!firstResult.content?.job_listings || !Array.isArray(firstResult.content.job_listings)) {
      return res.status(200).json({ jobs: [] });
    }

    const content = firstResult.content;
    
    // Get job details if there are jobs
    if (content.job_listings.length > 0) {
      const firstJob = content.job_listings[0];
      functions.logger.info("Attempting to fetch details for first job:", {
        id: firstJob.job_id,
        title: firstJob.job_title,
        company: firstJob.company_name,
        timeMs: Date.now() - startTime
      });

      const jobDetails = await getJobDetails(firstJob.job_id, firstJob, startTime);
      
      return res.json({
        jobs: content.job_listings,
        count: content.job_listings.length,
        ...jobDetails
      });
    }

    // Fallback return if no jobs to get details for
    return res.json({ 
      jobs: content.job_listings,
      count: content.job_listings.length
    });

  } catch (error) {
    functions.logger.error("searchJobs Error", {
      error: error.message || error,
      stack: error.stack,
      errorType: error.constructor.name,
      errorKeys: Object.keys(error),
      timeMs: Date.now() - startTime,
      phase: error.config ? 'axios' : 'processing'
    });
    return res.status(500).json({ error: "Internal server error" });
  }
});