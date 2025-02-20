const { onRequest } = require('firebase-functions/v2/https');
const axios = require('axios');
const functions = require('firebase-functions');

const CONFIG = {
  BRIGHTDATA_DATASET_ID: 'gd_lpfll7v5hcqtkxl6l',
  BASE_URL: 'https://api.brightdata.com/datasets/v3/trigger',
  // Add webhook base URL - update this with your ngrok URL
  WEBHOOK_BASE_URL: 'https://d255-71-146-184-34.ngrok-free.app/jobille-45494/us-central1/handleBrightdataWebhook'
};

exports.searchBright = onRequest({ 
  timeoutSeconds: 540,
  memory: "1GiB",
  secrets: ["BRIGHTDATA_API_TOKEN", "WEBHOOK_SECRET"]
}, async (req, res) => {
  const startTime = Date.now();  
  
  try {
    const { userId, searchParams, limit } = req.body;
    
    // Validate inputs
    if (!userId || !searchParams?.length) {
      return res.status(400).json({ error: "userId and searchParams are required" });
    }

    const apiToken = process.env.BRIGHTDATA_API_TOKEN;
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!apiToken || !webhookSecret) {
      functions.logger.error("Missing required secrets");
      return res.status(500).json({ error: "API configuration error" });
    }

    // Get first search param
    const search = searchParams[0];
    
    const requestData = {
      keyword: `"${search.keyword}"`, // Single quotes around the whole keyword
      location: search.location,
      country: search.country,
      time_range: search.time_range,
      job_type: search.job_type || undefined,
      experience_level: search.experience_level || undefined,
      remote: search.remote || undefined,
      company: search.company || undefined
    };

    // Remove empty fields
    Object.keys(requestData).forEach(key => 
      requestData[key] === undefined && delete requestData[key]
    );

    const webhookUrl = `${CONFIG.WEBHOOK_BASE_URL}?userId=${encodeURIComponent(userId)}`;

    const url = new URL(CONFIG.BASE_URL);
    url.searchParams.append('dataset_id', CONFIG.BRIGHTDATA_DATASET_ID);
    url.searchParams.append('include_errors', 'true');
    url.searchParams.append('type', 'discover_new');
    url.searchParams.append('discover_by', 'keyword');
    url.searchParams.append('format', 'json');
    url.searchParams.append('uncompressed_webhook', 'true');

    // Set webhook and notify URLs
    url.searchParams.append('webhook', webhookUrl);
    url.searchParams.append('notify', webhookUrl);

    // Set auth headers for both webhook and notify
    url.searchParams.append('webhook_headers.Authorization', `Bearer ${webhookSecret}`);
    url.searchParams.append('notify_headers.Authorization', `Bearer ${webhookSecret}`);

    const enforced_limit = Math.min(limit || 101, 101);
    url.searchParams.append('limit_per_input', enforced_limit.toString());

    // Add the detailed logging
    console.log("Final Brightdata URL:", url.toString());
    console.log("Request headers:", {
      'Authorization': 'Bearer ' + apiToken.substring(0,5) + '...',
      'Content-Type': 'application/json'
    });
    console.log("Raw request data:", requestData);
    console.log("Stringified request data:", JSON.stringify(requestData));
    console.log("Quoted keyword:", requestData.keyword);

    const response = await axios({
      method: 'post',
      url: url.toString(),
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      data: requestData
    });

    functions.logger.info("Brightdata API Response:", {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
      timeMs: Date.now() - startTime,
      webhookUrl: webhookUrl.replace(webhookSecret, '****')
    });

    return res.json({
      status: 'success',
      response: response.data,
      stats: {
        timeMs: Date.now() - startTime
      }
    });

  } catch (error) {
    functions.logger.error("Error in searchJobsLinkedIn:", {
      error: error.message,
      stack: error.stack,
      response: error.response?.data,
      timeMs: Date.now() - startTime
    });

    return res.status(500).json({ 
      error: "Internal server error",
      details: error.response?.data || error.message
    });
  }
});;