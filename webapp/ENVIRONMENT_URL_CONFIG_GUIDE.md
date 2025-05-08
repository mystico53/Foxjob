# Environment URL Configuration Guide

This guide explains how to use the centralized environment URL configuration for your application.

## Configuration Strategy

The application uses a tiered approach to configuration:

1. **Firebase Functions Configuration**: Environment variables stored in Firebase Functions Config
2. **Environment Files**: Local `.env` files for development
3. **Default Fallbacks**: Hardcoded values as a last resort

## Updating Environment URLs

### Using the Script

The `update-env-urls.ps1` script sets all environment-specific URLs for both production and staging environments:

```
.\update-env-urls.ps1
```

After running the script, you need to deploy your functions:

```
firebase use prod
firebase deploy --only functions

firebase use staging
firebase deploy --only functions
```

### Manual Updates

You can manually update configuration values using Firebase CLI:

```
firebase use prod
firebase functions:config:set webhook.base_url="https://your-url-here"

firebase use staging
firebase functions:config:set webhook.base_url="https://your-staging-url-here"
```

## Accessing Configuration in Code

### Backend (Firebase Functions)

In your Firebase Functions, access configuration values through:

```javascript
// 1. Import the config module
const config = require('../config');

// 2. Access environment-specific values
const webhookBaseUrl = config.webhookBaseUrl;

// Or directly from Firebase config (as fallback)
const searchFunctionUrl = functions.config().search.function_url;

// 3. Use in your code
const webhookUrl = `${webhookBaseUrl}?userId=${userId}`;
```

### Updating Hardcoded URLs

Update these files that contain hardcoded URLs:

1. `functions/brightdata_scraping/emailProcessor.js` (lines 108-122)

   ```javascript
   // Replace hardcoded URLs with config values
   let baseUrl = functions.config().app.workflow_url || 'https://jobille-45494.web.app/workflow/';
   ```

2. `functions/brightdata_scraping/handleBrightdataWebhook.js` (lines 492-505)

   ```javascript
   // Replace hardcoded URLs with config values
   const searchPageUrl = functions.config().app.search_url || 'https://jobille-45494.web.app/list';
   ```

3. `functions/brightdata_scraping/runScheduledSearches.js` (line 15)
   ```javascript
   // Replace hardcoded URL with config value
   SEARCH_FUNCTION_URL: functions.config().search.function_url ||
   	'https://searchbright-kvshkfhmua-uc.a.run.app';
   ```

## Frontend Configuration

For the frontend, update the `src/lib/config/environment.config.js` file to use environment variables:

```javascript
export const cloudFunctions = {
	downloadAndProcessSnapshot: {
		path: '/downloadAndProcessSnapshot',
		urls: {
			development: import.meta.env.VITE_DOWNLOAD_AND_PROCESS_SNAPSHOT_URL,
			staging:
				import.meta.env.VITE_DOWNLOAD_PROCESS_SNAPSHOT_URL_STAGING ||
				'https://downloadandprocesssnapshot-kvshkfhmua-uc.a.run.app',
			production:
				import.meta.env.VITE_DOWNLOAD_PROCESS_SNAPSHOT_URL_PROD ||
				'https://downloadandprocesssnapshot-fy7t4rjjwa-uc.a.run.app'
		}
	}
	// Add other functions here...
};
```

## Recommended Updates

1. **Remove Hardcoded URLs**: Replace all hardcoded URLs with config values
2. **Centralize Configuration**: Use the config module consistently across the codebase
3. **Environment Variables**: Set environment variables in CI/CD pipelines
4. **Documentation**: Keep this guide updated as configuration changes
