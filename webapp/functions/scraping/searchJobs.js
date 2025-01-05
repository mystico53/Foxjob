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

    // Minimal Oxylabs payload - exactly as in your working version
    const payload = {
      source: "universal",
      url: searchUrl,
      render: "html",
      parse: true,
      parsing_instructions: {
        one_job_title: {
          _fns: [
            {
              _fn: "xpath_one",
              _args: ["(//h2[contains(@class,'jobTitle')]/a/span/text())[1]"]
            }
          ]
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

    // Log the entire data object
    const fullDataStr = JSON.stringify(response.data);
    functions.logger.info("Oxylabs response.data", {
      truncated: fullDataStr.substring(0, 2000) + (fullDataStr.length > 2000 ? "...(truncated)" : "")
    });

    if (!response.data.results) {
      functions.logger.warn("No 'results' field in Oxylabs response");
      return res.status(200).json({ one_job_title: null, note: "No results field" });
    }

    const { results } = response.data;
    if (!Array.isArray(results) || results.length === 0) {
      functions.logger.warn("Results array is empty");
      return res.status(200).json({ one_job_title: null, note: "Empty results array" });
    }

    const firstResult = results[0];
    if (!firstResult.content) {
      functions.logger.warn("results[0].content is missing");
      return res.status(200).json({ one_job_title: null, note: "No content in first result" });
    }

    const content = firstResult.content;
    if (!content.one_job_title) {
      functions.logger.warn("content.one_job_title is missing or null");
      return res.status(200).json({
        one_job_title: null, 
        note: "one_job_title not found - might be no matching jobTitle"
      });
    }

    functions.logger.info("Found job title", { one_job_title: content.one_job_title });
    return res.json({ one_job_title: content.one_job_title });

  } catch (error) {
    functions.logger.error("searchJobs Error", {
      error: error.message || error,
      stack: error.stack
    });
    return res.status(500).json({ error: "Internal server error" });
  }
});