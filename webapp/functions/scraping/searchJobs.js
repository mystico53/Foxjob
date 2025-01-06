const { onRequest } = require('firebase-functions/v2/https');
const axios = require('axios');
const functions = require('firebase-functions');

// Hardcoded credentials
const OXY_USERNAME = "mystico_FXPQA";
const OXY_PASSWORD = "ti_QMg2h2WzZMp";

exports.searchJobs = onRequest({ timeoutSeconds: 120 }, async (req, res) => {
  const startTime = Date.now();
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

    const payload = {
      source: "universal",
      url: searchUrl,
      render: "html",
      parse: true,
      wait_for: [".job_seen_beacon"],  // Wait for specific element
      timeout: 60000,
      limit: 2,
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
        timeout: 75000  // reduced from 60000
      }
    );

    functions.logger.info("Initial search request completed in:", { 
      timeMs: Date.now() - startTime 
    });

    functions.logger.info("Complete Oxylabs response structure:", {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      responseSize: JSON.stringify(response.data).length
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
    if (!firstResult.content) {
      functions.logger.warn("First result content details:", {
        firstResult: firstResult
      });
      return res.status(200).json({ error: "No content in first result" });
    }

    const content = firstResult.content;
    if (!content.job_listings || !Array.isArray(content.job_listings)) {
      functions.logger.warn("Job listings structure issue:", {
        content: content,
        jobListingsType: typeof content.job_listings,
        jobListingsValue: content.job_listings
      });
      return res.status(200).json({ jobs: [] });
    }

    // Get first job details
    if (content.job_listings.length > 0) {
      const firstJob = content.job_listings[0];
      functions.logger.info("Attempting to fetch details for first job:", {
        id: firstJob.job_id,
        title: firstJob.job_title,
        company: firstJob.company_name,
        timeMs: Date.now() - startTime
      });
    
      const viewJobUrl = `https://www.indeed.com/viewjob?jk=${firstJob.job_id}`;
      functions.logger.info("Constructed job detail URL:", { url: viewJobUrl });
    
      try {
        // First stage - verify page loads
        functions.logger.info("Starting initial page load verification");
        const verifyPage = await axios.post(
          "https://realtime.oxylabs.io/v1/queries",
          {
            source: "universal",
            url: viewJobUrl,
            render: "html",
            parse: false
          },
          {
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Basic ${authStr}`
            },
            timeout: 45000
          }
        );
    
        functions.logger.info("Verification stage complete", {
          hasContent: !!verifyPage.data.results[0].content,
          contentLength: verifyPage.data.results[0].content?.length || 0,
          timeMs: Date.now() - startTime
        });
    
        // If we got HTML successfully, then try parsing
        if (verifyPage.data.results[0].content) {
          const htmlContent = verifyPage.data.results[0].content;
  
          functions.logger.info("HTML Content Analysis:", {
            // Look for key elements we might want to parse
            hasJobTitle: htmlContent.includes('jobsearch-JobInfoHeader-title'),
            hasLocation: htmlContent.includes('jobsearch-JobInfoHeader-companyLocation'),
            hasCompany: htmlContent.includes('jobsearch-CompanyInfoContainer'),
            hasDescription: htmlContent.includes('jobDescriptionText'),
            // Get all data-testid attributes to see what's available
            dataTestIds: htmlContent.match(/data-testid="([^"]+)"/g)?.slice(0, 10),
            // Get all class names containing 'jobsearch'
            jobsearchClasses: htmlContent.match(/class="[^"]*jobsearch[^"]*"/g)?.slice(0, 10)
          });

          // Then proceed with the simple payload
          const jobDetailsPayload = {
            source: "universal",
            url: viewJobUrl,
            render: "html",
            parse: true,
            timeout: 45000,
            "parsing_instructions": {
              "jobTitle": {
                "_fns": [{
                  "_fn": "css", 
                  "_args": ["[data-testid='simpler-jobTitle'], [data-testid='jobsearch-JobInfoHeader-title']"]
                }]
              },
              "location": {
                "_fns": [{
                  "_fn": "css",
                  "_args": ["[data-testid='job-location'], [data-testid='jobsearch-JobInfoHeader-companyLocation'], [data-testid='inlineHeader-companyLocation']"]
                }]
              },
              "description": {
                "_fns": [{
                  "_fn": "css",
                  "_args": ["[data-testid='vjJobDetails-test']"]
                }]
              }
              }
          };
    
          functions.logger.info("Starting parsing attempt");
          const detailsResponse = await axios.post(
            "https://realtime.oxylabs.io/v1/queries",
            jobDetailsPayload,
            {
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${authStr}`
              },
              timeout: 75000
            }
          );
    
          functions.logger.info("Parsing complete", {
            status: detailsResponse.status,
            hasResults: !!detailsResponse.data.results,
            timeMs: Date.now() - startTime,
            // Add these new logging details:
            parsedData: detailsResponse.data.results?.[0]?.content,
            fullResponse: detailsResponse.data
          });
    
          return res.json({
            jobs: content.job_listings,
            count: content.job_listings.length,
            rawJobDetailsResponse: detailsResponse.data,
            verificationStatus: "Success"
          });
        } else {
          // If verification failed
          return res.json({
            jobs: content.job_listings,
            count: content.job_listings.length,
            error: "Page verification failed",
            verificationStatus: "Failed"
          });
        }
    
      } catch (error) {
        functions.logger.error("Error in job details process:", {
          error: error.message,
          stack: error.stack,
          url: viewJobUrl,
          timeMs: Date.now() - startTime,
          stage: error.config?.url.includes('verify') ? 'verification' : 'parsing'
        });
        return res.json({
          jobs: content.job_listings,
          count: content.job_listings.length,
          error: `Failed during ${error.config?.url.includes('verify') ? 'verification' : 'parsing'} stage`
        });
      }
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