// src/lib/config/environment.config.js
export const cloudFunctionUrls = {
    development: 'http://127.0.0.1:5001/jobille-45494/us-central1',
    staging: 'https://retryprocessing-kvshkfhmua-uc.a.run.app',
    production: 'https://retryprocessing-fy7t4rjjwa-uc.a.run.app'
};

export const getCloudFunctionUrl = (functionName) => {
    const mode = import.meta.env.MODE;
    console.log(`Getting cloud function URL for ${functionName} in ${mode} mode`);
    
    const urls = {
        retryProcessing: cloudFunctionUrls[mode] || cloudFunctionUrls.staging
    };
    
    const url = urls[functionName];
    console.log(`Using cloud function URL: ${url}`);
    return url;
};