//webapp\functions\scraping\OxylabsService.js

const functions = require('firebase-functions');
const axios = require('axios');

// Config
const CONFIG = {
  OXY_USERNAME: "mystico_FXPQA",
  OXY_PASSWORD: "ti_QMg2h2WzZMp",
  BASE_URL: 'https://data.oxylabs.io/v1/queries',
  CALLBACK_URL: 'https://6ae3-71-146-184-34.ngrok-free.app/jobille-45494/us-central1/handleOxylabsCallback'
};

const OxylabsService = {
  getAuthHeader: () => {
    const authStr = Buffer.from(`${CONFIG.OXY_USERNAME}:${CONFIG.OXY_PASSWORD}`).toString('base64');
    return {
      "Content-Type": "application/json",
      "Authorization": `Basic ${authStr}`
    };
  },

  createJobDetailsPayload: (jobId) => ({
    source: "universal",
    url: `https://www.indeed.com/viewjob?jk=${jobId}`,
    render: "html",
    parse: true,
    callback_url: CONFIG.CALLBACK_URL,
    parsing_instructions: {
      jobTitle: {
        _fns: [{ _fn: "css", _args: ["[data-testid='jobsearch-JobInfoHeader-title']"] }]
      },
      location: {
        _fns: [{ _fn: "css", _args: ["[data-testid='job-location'], [data-testid='jobsearch-JobInfoHeader-companyLocation'], [data-testid='inlineHeader-companyLocation']"] }]
      },
      description: {
        _fns: [{ _fn: "css", _args: ["#jobDescriptionText.jobsearch-JobComponent-description"] }]
      },
      postingDate: {
        _fns: [{ _fn: "css", _args: ["[data-testid='job-posting-date']"] }]
      }
    }
  }),

  submitNewJobRequest: async (jobId) => {
    try {
      const payload = OxylabsService.createJobDetailsPayload(jobId);
      
      const response = await axios.post(
        CONFIG.BASE_URL,
        payload,
        { headers: OxylabsService.getAuthHeader() }
      );
  
      return {
        success: true,
        oxylabsId: response.data.id
      };
    } catch (error) {
      functions.logger.error("Failed to submit new job request:", {
        jobId,
        error: error.message
      });
      return {
        success: false,
        error: error.message
      };
    }
  },

  fetchQueryResults: async (queryId) => {
    try {
      functions.logger.info("Fetching results for query:", { queryId });
      
      const response = await axios.get(
        `${CONFIG.BASE_URL}/${queryId}/results`,
        { headers: OxylabsService.getAuthHeader() }
      );

      functions.logger.info("Retrieved results for query:", { 
        queryId,
        status: response.status,
        hasResults: Boolean(response.data?.results?.[0]?.content)
      });

      return response.data;
    } catch (error) {
      functions.logger.error("Failed to fetch query results:", {
        queryId,
        error: error.message
      });
      throw error;
    }
  }
};

module.exports = OxylabsService;