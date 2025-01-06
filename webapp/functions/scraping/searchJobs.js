const { onRequest } = require('firebase-functions/v2/https');
const axios = require('axios');
const functions = require('firebase-functions');

// Hardcoded credentials
const OXY_USERNAME = "mystico_FXPQA";
const OXY_PASSWORD = "ti_QMg2h2WzZMp";

exports.searchJobs = onRequest(async (req, res) => {
  try {
    const { keywords, location } = req.query;

    // Build the Indeed URL
    const url = new URL('https://www.indeed.com/jobs');
    url.searchParams.set('q', keywords || 'test');
    if (location) {
      url.searchParams.set('l', location);
    }

    const searchUrl = url.toString();
    functions.logger.info("Search URL:", { url: searchUrl });

    // Enhanced payload using the correct Oxylabs structure for multiple items
    const payload = {
      source: "universal",
      url: searchUrl,
      render: "html",
      parse: true,
      parsing_instructions: {
        job_listings: {
          _fns: [
            {
              _fn: "css",
              _args: [".job_seen_beacon"]
            }
          ],
          _items: {
            job_id: {
              _fns: [{
                _fn: "xpath_one",
                _args: [".//@data-jk"]
              }]
            },
            job_link: {
              _fns: [{
                _fn: "xpath_one",
                _args: [".//h2[contains(@class,'jobTitle')]/a/@href"]
              }]
            },
            job_title: {
              _fns: [{
                _fn: "xpath_one",
                _args: [".//h2[contains(@class,'jobTitle')]//span/text()"]
              }]
            },
            company_name: {
              _fns: [{
                _fn: "xpath_one",
                _args: [".//span[@data-testid='company-name']//text()"]
              }]
            }
          }
        }
      }
    };

    functions.logger.info("Sending payload to Oxylabs", { payload });

    const authStr = Buffer.from(`${OXY_USERNAME}:${OXY_PASSWORD}`).toString('base64');
    const response = await axios.post(
      "https://realtime.oxylabs.io/v1/queries",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${authStr}`
        },
        timeout: 60000
      }
    );

    // Log the entire response structure
    functions.logger.info("Complete Oxylabs response structure:", {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      responseSize: JSON.stringify(response.data).length
    });

    // Log the results array structure
    functions.logger.info("Results array structure:", {
      hasResults: !!response.data.results,
      resultsLength: response.data.results ? response.data.results.length : 0,
      resultsType: response.data.results ? typeof response.data.results : 'undefined'
    });

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
    // Log the structure of the first result
    functions.logger.info("First result structure:", {
      hasContent: !!firstResult.content,
      contentKeys: firstResult.content ? Object.keys(firstResult.content) : [],
      firstResultKeys: Object.keys(firstResult)
    });

    if (!firstResult.content) {
      functions.logger.warn("First result content details:", {
        firstResult: firstResult
      });
      return res.status(200).json({ error: "No content in first result" });
    }

    const content = firstResult.content;
    
    // Log detailed content structure
    functions.logger.info("Content structure:", {
      hasJobListings: !!content.job_listings,
      jobListingsType: typeof content.job_listings,
      isJobListingsArray: Array.isArray(content.job_listings),
      contentKeys: Object.keys(content)
    });

    if (!content.job_listings || !Array.isArray(content.job_listings)) {
      functions.logger.warn("Job listings structure issue:", {
        content: content,
        jobListingsType: typeof content.job_listings,
        jobListingsValue: content.job_listings
      });
      return res.status(200).json({ jobs: [] });
    }

    // Log details about each job listing
    content.job_listings.forEach((job, index) => {
      functions.logger.info(`Job ${index + 1} details:`, {
        hasTitle: !!job.job_title,
        hasCompany: !!job.company_name,
        hasLocation: !!job.location,
        hasSalary: !!job.salary_range,
        hasDate: !!job.date_posted,
        hasDescription: !!job.job_description,
        descriptionLength: job.job_description ? job.job_description.length : 0,
        altDescriptionLength: job.job_description_alt ? job.job_description_alt.length : 0,
        description: job.job_description,
        altDescription: job.job_description_alt,
        allFields: Object.keys(job)
      });
    });

    content.job_listings.forEach((job, index) => {
      functions.logger.info(`Job ${index + 1} identification:`, {
        job_id: job.job_id,
        job_link: job.job_link,
        title: job.job_title,
      });
    });

    functions.logger.info("Final jobs summary", { 
      count: content.job_listings.length,
      sample: content.job_listings[0],
      allJobsHaveTitle: content.job_listings.every(job => !!job.job_title),
      allJobsHaveCompany: content.job_listings.every(job => !!job.company_name),
      missingFields: content.job_listings.reduce((acc, job) => {
        Object.keys(job).forEach(key => {
          if (!job[key]) acc[key] = (acc[key] || 0) + 1;
        });
        return acc;
      }, {})
    });
    
    return res.json({ 
      jobs: content.job_listings,
      count: content.job_listings.length
    });

  } catch (error) {
    functions.logger.error("searchJobs Error", {
      error: error.message || error,
      stack: error.stack,
      errorType: error.constructor.name,
      errorKeys: Object.keys(error)
    });
    return res.status(500).json({ error: "Internal server error" });
  }
});