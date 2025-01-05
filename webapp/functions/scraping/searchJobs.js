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
            job_title: {
              _fns: [
                {
                  _fn: "xpath_one",
                  _args: [".//h2[contains(@class,'jobTitle')]/a/span/text()"]
                }
              ]
            },
            company_name: {
              _fns: [
                {
                  _fn: "xpath_one",
                  _args: [".//span[@data-testid='company-name']/text()"]
                }
              ]
            },
            location: {
              _fns: [
                {
                  _fn: "xpath_one",
                  _args: [".//div[@data-testid='text-location']//text()"]
                }
              ]
            },
            salary_range: {
              _fns: [
                {
                  _fn: "xpath_one",
                  _args: [".//div[contains(@class, 'salary-snippet-container') or contains(@class, 'estimated-salary')]//text()"]
                }
              ]
            },
            date_posted: {
              _fns: [
                {
                  _fn: "xpath_one",
                  _args: [".//span[@class='date']/text()"]
                }
              ]
            },
            job_description: {
              _fns: [
                {
                  _fn: "xpath_one",
                  _args: ["normalize-space(.//div[@class='job-snippet'])"]
                }
              ]
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

    functions.logger.info("Got response from Oxylabs", {
      status: response.status,
      statusText: response.statusText
    });

    if (!response.data.results) {
      functions.logger.warn("No 'results' field in Oxylabs response");
      return res.status(200).json({ error: "No results field" });
    }

    const { results } = response.data;
    if (!Array.isArray(results) || results.length === 0) {
      functions.logger.warn("Results array is empty");
      return res.status(200).json({ error: "Empty results array" });
    }

    const firstResult = results[0];
    if (!firstResult.content) {
      functions.logger.warn("results[0].content is missing");
      return res.status(200).json({ error: "No content in first result" });
    }

    const content = firstResult.content;
    
    // Return the job listings array directly
    if (!content.job_listings || !Array.isArray(content.job_listings)) {
      functions.logger.warn("No job listings found or invalid format");
      return res.status(200).json({ jobs: [] });
    }

    functions.logger.info("Found jobs", { 
      count: content.job_listings.length,
      sample: content.job_listings[0] 
    });
    
    return res.json({ 
      jobs: content.job_listings,
      count: content.job_listings.length
    });

  } catch (error) {
    functions.logger.error("searchJobs Error", {
      error: error.message || error,
      stack: error.stack
    });
    return res.status(500).json({ error: "Internal server error" });
  }
});