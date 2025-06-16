const { onRequest } = require('firebase-functions/v2/https');
const axios = require('axios');
const functions = require('firebase-functions');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const secretManager = new SecretManagerServiceClient();

exports.getBrightdataSnapshots = onRequest({ 
  cors: true,
  maxInstances: 10,
  secrets: ["BRIGHTDATA_API_TOKEN"] 
}, async (req, res) => {
  //console.log('Dataset ID:', req.query.datasetId);
  
  try {
    const [apiTokenVersion] = await secretManager.accessSecretVersion({
      name: 'projects/656035288386/secrets/BRIGHTDATA_API_TOKEN/versions/latest'
    });
    const apiToken = apiTokenVersion.payload.data.toString();

    if (!apiToken) {
      functions.logger.error("Missing required BRIGHTDATA_API_TOKEN secret");
      return res.status(500).json({ error: "API configuration error" });
    }

    const response = await axios({
      method: 'get',
      url: `https://api.brightdata.com/datasets/v3/snapshots?dataset_id=${req.query.datasetId}`,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    functions.logger.info("Brightdata API Response:", {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    });

    return res.json({
        data: response.data
      });

  } catch (error) {
    functions.logger.error("Error in getBrightdataSnapshots:", {
      error: error.message,
      stack: error.stack,
      response: error.response?.data
    });

    return res.status(500).json({ 
      error: "Internal server error",
      details: error.response?.data || error.message
    });
  }
});