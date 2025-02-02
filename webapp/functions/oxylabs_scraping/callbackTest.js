const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');

// Initialize Firebase (for emulator)
if (!admin.apps.length) {
  initializeApp();
}

const db = getFirestore();

// Test data for callbacks
const TEST_DATA = {
  // Search results callback
  searchResults: {
    results: [{
      content: {
        job_listings: [
          {
            job_id: "95fe7345696bacf4",
            job_link: "/rc/clk?jk=95fe7345696bacf4&fccid=71147e0539a0a1b7",
            job_title: "Product Manager, Emerging Franchises",
            company_name: "Activision"
          },
          {
            job_id: "88a3f3774ce33578",
            job_link: "/rc/clk?jk=88a3f3774ce33578&fccid=a5b4499d9e91a5c6",
            job_title: "Strategic Partner Manager, YouTube Product Partnerships",
            company_name: "Google"
          }
        ],
        parse_status_code: 12000
      },
      created_at: "2025-01-23 06:24:47",
      updated_at: "2025-01-23 06:26:13",
      page: 1,
      url: "https://www.indeed.com/jobs?q=product+manager&l=los+angeles&radius=25",
      job_id: "7288079200450277377",
      status_code: 200,
      parser_type: "custom"
    }],
    job: {
      id: "7288079200450277377",
      status: "done",
      created_at: "2025-01-23 06:24:47",
      updated_at: "2025-01-23 06:26:13"
    }
  },
  
  // Job detail results callback
  jobDetailResults: {
    results: [{
      content: {
        jobTitle: "Product Manager, Emerging Franchises",
        location: "Los Angeles, CA",
        description: "Example job description text...",
        postingDate: "Posted 30+ days ago",
        jsonLd: JSON.stringify({
          title: "Product Manager, Emerging Franchises",
          description: "Example job description text...",
          employmentType: "FULL_TIME",
          datePosted: "2024-12-20",
          validThrough: "2025-02-20",
          hiringOrganization: {
            name: "Activision"
          },
          jobLocation: {
            address: {
              addressLocality: "Los Angeles",
              addressRegion: "CA"
            }
          }
        })
      },
      status_code: 200
    }]
  }
};

// Webhook function
exports.callbackTest = onRequest({ 
    timeoutSeconds: 540,
    memory: "1GiB"
}, async (req, res) => {
    const startTime = Date.now();
    
    try {
        // Log the incoming webhook data
        functions.logger.info("Received webhook callback:", {
            body: req.body,
            headers: req.headers,
            timestamp: new Date().toISOString()
        });

        // Determine callback type based on the response structure
        const callbackType = req.body.results?.[0]?.content?.job_listings ? 
            'search' : 'job_detail';

        functions.logger.info("Detected callback type:", { callbackType });

        // Process based on type
        if (callbackType === 'search') {
            await processSearchCallback(req.body);
        } else {
            await processJobDetailCallback(req.body);
        }

        // Send success response
        res.status(200).json({
            success: true,
            message: `Successfully processed ${callbackType} callback`,
            processingTimeMs: Date.now() - startTime
        });

    } catch (error) {
        functions.logger.error("Error processing webhook:", {
            error: error.message,
            stack: error.stack,
            body: req.body
        });

        res.status(500).json({
            success: false,
            error: error.message,
            processingTimeMs: Date.now() - startTime
        });
    }
});

async function processSearchCallback(data) {
    functions.logger.info("Processing search callback");
    
    // Extract job listings
    const jobListings = data.results?.[0]?.content?.job_listings || [];
    
    functions.logger.info("Found job listings:", {
        count: jobListings.length,
        jobIds: jobListings.map(job => job.job_id)
    });

    // Here you would add your logic to process the job listings
    // For example, storing them in Firestore
}

async function processJobDetailCallback(data) {
    functions.logger.info("Processing job detail callback");
    
    const jobDetail = data.results?.[0]?.content;
    
    functions.logger.info("Job detail data:", {
        title: jobDetail?.jobTitle,
        company: jobDetail?.company,
        location: jobDetail?.location
    });

    // Here you would add your logic to process the job detail
    // For example, updating the job document in Firestore
}

// Test helper function
async function simulateCallback(type = 'search') {
    const testData = type === 'search' ? TEST_DATA.searchResults : TEST_DATA.jobDetailResults;
    
    // Create a mock request object
    const req = {
        body: testData,
        headers: {
            'content-type': 'application/json',
        },
    };

    // Create a mock response object
    const res = {
        status: function(statusCode) {
            this.statusCode = statusCode;
            return this;
        },
        json: function(data) {
            this.data = data;
            return this;
        }
    };

    try {
        // Call the webhook function
        await exports.processCallback(req, res);
        
        functions.logger.info("Test callback processed:", {
            type,
            statusCode: res.statusCode,
            response: res.data
        });

        return {
            success: true,
            statusCode: res.statusCode,
            response: res.data
        };

    } catch (error) {
        functions.logger.error("Test callback failed:", {
            type,
            error: error.message
        });

        return {
            success: false,
            error: error.message
        };
    }
}

// Example usage:
// await simulateCallback('search');
// await simulateCallback('job_detail');