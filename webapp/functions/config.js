// functions/config.js
const dotenv = require('dotenv');
const path = require('path');
const functions = require('firebase-functions');
const fs = require('fs');

// Determine which environment to use
const getEnvironment = () => {
  // FIRST check for FUNCTIONS_EMULATOR which is set when running locally
  // This should take priority over project ID
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    functions.logger.info("Using local development environment (emulator)");
    return 'development';
  }
  
  // Check for Firebase project ID to determine environment
  let projectId;
  
  try {
    if (process.env.FIREBASE_CONFIG) {
      projectId = JSON.parse(process.env.FIREBASE_CONFIG).projectId;
    } else {
      projectId = process.env.GCLOUD_PROJECT;
    }
    
    functions.logger.info("Detected Firebase project:", { projectId });
    
    // Check project ID to determine environment
    if (projectId) {
      if (projectId.includes('prod')) {
        functions.logger.info("Using production environment based on project ID");
        return 'production';
      } else if (projectId.includes('staging') || projectId === 'jobille-45494') {
        functions.logger.info("Using staging environment based on project ID");
        return 'staging';
      }
    }
  } catch (error) {
    functions.logger.warn("Error parsing Firebase config:", { error: error.message });
  }
  
  // Default to development as a fallback
  functions.logger.info("No specific environment detected, defaulting to development");
  return 'development';
};

// List of variables that should only be used as secrets, not environment variables
const secretsOnlyVars = [
  'BRIGHTDATA_API_TOKEN',
  'WEBHOOK_SECRET',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'SENDGRID_API_KEY'
];

// Load environment variables
const environment = getEnvironment();
let envLoaded = false;

// Helper function to safely load environment variables
const safelyLoadEnvFile = (envPath) => {
  functions.logger.info(`Loading environment file: ${envPath}`);
  
  try {
    if (fs.existsSync(envPath)) {
      // Parse the .env file without applying to process.env
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      
      // Only apply non-secret variables to process.env
      Object.keys(envConfig).forEach(key => {
        if (!secretsOnlyVars.includes(key)) {
          process.env[key] = envConfig[key];
          functions.logger.info(`Loaded environment variable: ${key}`);
        } else {
          functions.logger.info(`Skipping secret-only variable: ${key}`);
        }
      });
      
      return true;
    }
  } catch (error) {
    functions.logger.error(`Exception when loading ${envPath}:`, { 
      error: error.message,
      stack: error.stack
    });
  }
  
  return false;
};

// For local development, first try .env.local
if (environment === 'development') {
  const localEnvPath = path.resolve(__dirname, '.env.local');
  functions.logger.info(`Checking for local env file: ${localEnvPath}`);
  
  if (safelyLoadEnvFile(localEnvPath)) {
    functions.logger.info(`Successfully loaded environment from .env.local`);
    envLoaded = true;
  }
}

// If local file doesn't exist or we're in staging/production, use environment-specific file
if (!envLoaded) {
  const envPath = path.resolve(__dirname, `.env.${environment}`);
  
  if (safelyLoadEnvFile(envPath)) {
    functions.logger.info(`Successfully loaded environment file: .env.${environment}`);
    envLoaded = true;
  } else {
    functions.logger.warn(`Environment file .env.${environment} not found or could not be loaded`);
  }
}

// Check if we're in the emulator and load secrets from .secret.local
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  functions.logger.info("Loading secrets for local development from .secret.local");
  try {
    const secretsPath = path.resolve(__dirname, '.secret.local');
    functions.logger.info(`Checking for secrets file: ${secretsPath}`);
    
    if (fs.existsSync(secretsPath)) {
      const secretsConfig = dotenv.parse(fs.readFileSync(secretsPath));
      Object.keys(secretsConfig).forEach(key => {
        process.env[key] = secretsConfig[key];
        functions.logger.info(`Loaded secret from .secret.local: ${key}`);
      });
    } else {
      functions.logger.warn(".secret.local file not found");
    }
  } catch (error) {
    functions.logger.error("Error loading .secret.local file:", { 
      error: error.message 
    });
  }
} else {
  // Only remove secrets in non-emulator environments
  secretsOnlyVars.forEach(key => {
    if (process.env[key]) {
      functions.logger.info(`Removing sensitive variable from environment: ${key}`);
      delete process.env[key];
    }
  });
}

// Log the webhook URL (masking most of it for security)
const webhookBaseUrl = process.env.WEBHOOK_BASE_URL;
functions.logger.info("Configuration loaded:", { 
  environment,
  webhookBaseUrl: webhookBaseUrl 
    ? `${webhookBaseUrl.substring(0, 15)}...${webhookBaseUrl.substring(webhookBaseUrl.length - 10)}` 
    : 'undefined'
});

module.exports = {
  environment,
  webhookBaseUrl: process.env.WEBHOOK_BASE_URL,
  // Add other config variables as needed
};