// src/lib/config/environment.config.js
export const cloudFunctionUrls = {
    staging: 'https://retryprocessing-kvshkfhmua-uc.a.run.app',
    production: 'https://retryprocessing-fy7t4rjjwa-uc.a.run.app' // Replace with your actual production URL
};

export const getCloudFunctionUrl = (functionName) => {
    const urls = {
        retryProcessing: cloudFunctionUrls[import.meta.env.MODE] || cloudFunctionUrls.staging
    };
    
    return urls[functionName];
};