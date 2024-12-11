// src/lib/config/environment.config.js

// Project IDs for different environments
const projectIds = {
    development: 'jobille-45494',
    staging: 'jobille-45494',
    production: 'foxjob-prod'
};

// Base URLs for different environments
export const environmentUrls = {
    development: `http://127.0.0.1:5001/${projectIds.development}/us-central1`,
    staging: `https://us-central1-${projectIds.staging}.cloudfunctions.net`,
    production: `https://us-central1-${projectIds.production}.cloudfunctions.net`
};

// Function-specific configurations
export const cloudFunctions = {
    retryProcessing: {
        path: '/retryProcessing',
        // Override URLs for specific environments if needed
        urls: {
            staging: 'https://retryprocessing-kvshkfhmua-uc.a.run.app',
            production: 'https://retryprocessing-fy7t4rjjwa-uc.a.run.app'
        }
    },
    // Example of how to add more functions:
    // extractQualities: {
    //     path: '/extractJobQualities',
    //     urls: {} // Empty means it will use the base environment URLs
    // }
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

    // Check if there's a function-specific override URL for this environment
    if (functionConfig.urls && functionConfig.urls[mode]) {
        return functionConfig.urls[mode];
    }

    // Otherwise, construct URL from base environment URL and function path
    const baseUrl = environmentUrls[mode] || environmentUrls.staging;
    const url = `${baseUrl}${functionConfig.path}`;
    
    console.log(`Using cloud function URL: ${url}`);
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