// src/lib/config/environment.config.js

// All configuration is now pulled from environment variables
const projectIds = {
    development: import.meta.env.VITE_PROJECT_ID || 'jobille-45494', // Fallback for local dev
    staging: import.meta.env.VITE_PROJECT_ID || 'jobille-45494',
    production: import.meta.env.VITE_PROJECT_ID || 'foxjob-prod'
};

// Base URLs constructed from environment variables
export const environmentUrls = {
    development: import.meta.env.VITE_BASE_URL || `http://127.0.0.1:5001/${projectIds.development}/us-central1`,
    staging: import.meta.env.VITE_BASE_URL || `https://us-central1-${projectIds.staging}.cloudfunctions.net`,
    production: import.meta.env.VITE_BASE_URL || `https://us-central1-${projectIds.production}.cloudfunctions.net`
};

// Function-specific configurations with URLs from environment variables
export const cloudFunctions = {
    retryProcessing: {
      path: '/retryProcessing',
      urls: {
        staging: import.meta.env.VITE_RETRY_PROCESSING_URL_STAGING,
        production: import.meta.env.VITE_RETRY_PROCESSING_URL_PROD
      }
    },
    structureResume: {
      path: '/structureResume',
      urls: {
        staging: import.meta.env.VITE_STRUCTURE_RESUME_URL_STAGING,
        production: import.meta.env.VITE_STRUCTURE_RESUME_URL_PROD
      }
    },
    searchJobs: {
      path: '/searchJobs',
      urls: {
        staging: import.meta.env.VITE_SEARCH_JOBS_URL_STAGING,
        production: import.meta.env.VITE_SEARCH_JOBS_URL_PROD
      }
    },
    // Add this new entry for searchBright
    searchBright: {
      path: '/searchBright',
      urls: {
        staging: import.meta.env.VITE_SEARCH_BRIGHT_URL_STAGING,
        production: import.meta.env.VITE_SEARCH_BRIGHT_URL_PROD
      }
    },
    downloadAndProcessSnapshot: {
      path: '/downloadAndProcessSnapshot',
      urls: {
        development: 'https://c2f2-99-8-162-33.ngrok-free.app/jobille-45494/us-central1/downloadAndProcessSnapshot',
        staging: 'https://downloadandprocesssnapshot-kvshkfhmua-uc.a.run.app',
        production: import.meta.env.VITE_DOWNLOAD_PROCESS_SNAPSHOT_URL_PROD || null // Set production URL when ready
      }
    }
  };

/**
 * Gets the complete URL for a cloud function based on the current environment
 * @param {string} functionName - The name of the cloud function
 * @returns {string} The complete URL for the cloud function
 */
export const getCloudFunctionUrl = (functionName) => {
    const mode = import.meta.env.MODE || 'development';
    console.log(`Getting cloud function URL for ${functionName} in ${mode} mode`);

    const functionConfig = cloudFunctions[functionName];
    if (!functionConfig) {
        throw new Error(`Cloud function configuration not found for: ${functionName}`);
    }

    // First check for direct environment variable override
    const envUrlKey = `VITE_${functionName.toUpperCase()}_URL`;
    if (import.meta.env[envUrlKey]) {
        return import.meta.env[envUrlKey];
    }

    // Then check for function-specific override URL for this environment
    if (functionConfig.urls && functionConfig.urls[mode]) {
        return functionConfig.urls[mode];
    }

    // Otherwise, construct URL from base environment URL and function path
    const baseUrl = environmentUrls[mode] || environmentUrls.staging;
    const url = `${baseUrl}${functionConfig.path}`;
    
    return url;
};

/**
 * Gets the project ID for the current environment
 * @returns {string} The project ID
 */
export const getProjectId = () => {
    const mode = import.meta.env.MODE || 'development';
    return projectIds[mode] || projectIds.staging;
};