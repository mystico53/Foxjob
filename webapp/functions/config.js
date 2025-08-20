// functions/config.js
const dotenv = require('dotenv');
const path = require('path');
const functions = require('firebase-functions');
const fs = require('fs');

// Determine which environment to use
const getEnvironment = () => {
	if (process.env.FUNCTIONS_EMULATOR === 'true') {
		functions.logger.info('Using local development environment (emulator)');
		return 'development';
	}

	let projectId = process.env.GCLOUD_PROJECT;
	if (process.env.FIREBASE_CONFIG) {
		try {
			projectId = JSON.parse(process.env.FIREBASE_CONFIG).projectId;
		} catch (error) {
			functions.logger.warn('Error parsing Firebase config');
		}
	}

	functions.logger.info('Detected Firebase project:', { projectId });

	if (projectId) {
		if (projectId.includes('prod')) return 'production';
		if (projectId.includes('staging') || projectId === 'jobille-45494') return 'staging';
	}

	return 'development';
};

// Load environment variables
const environment = getEnvironment();

// For local development
if (process.env.FUNCTIONS_EMULATOR === 'true') {
	// Load environment file
	const envPath = path.resolve(__dirname, '.env.local');
	if (fs.existsSync(envPath)) {
		dotenv.config({ path: envPath });
		functions.logger.info('Loaded environment from .env.local');
	}

	// Load secrets file
	const secretsPath = path.resolve(__dirname, '.secret.local');
	if (fs.existsSync(secretsPath)) {
		dotenv.config({ path: secretsPath });
		functions.logger.info('Loaded secrets from .secret.local');
	}
} else {
	// For staging/production, just load non-secret environment variables
	const envPath = path.resolve(__dirname, `.env.${environment}`);
	if (fs.existsSync(envPath)) {
		dotenv.config({ path: envPath });
		functions.logger.info(`Loaded environment from .env.${environment}`);
	}

	// No need to handle secrets - v2 functions do this automatically
}

functions.logger.info('Configuration loaded:', {
	environment,
	webhookBaseUrl: process.env.WEBHOOK_BASE_URL
		? `${process.env.WEBHOOK_BASE_URL.substring(0, 15)}...`
		: 'undefined'
});

module.exports = {
	environment,
	webhookBaseUrl: process.env.WEBHOOK_BASE_URL
};
