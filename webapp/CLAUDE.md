# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a job matching web application built with SvelteKit and Firebase. The application helps users find job opportunities by analyzing job descriptions against their skills and preferences, using AI-powered matching algorithms. The system scrapes job data from various sources (primarily through BrightData), processes it through multiple AI analysis stages, and provides users with scored job matches.

## Key Architecture Components

### Frontend (SvelteKit)

- **Framework**: SvelteKit with static adapter for Firebase hosting
- **UI Library**: Skeleton Labs UI components with TailwindCSS
- **State Management**: Svelte stores for auth, jobs, search queries, and user preferences
- **Authentication**: Firebase Auth with Google OAuth integration
- **Key Routes**: `/list` (job dashboard), `/workflow` (job details), `/admin` (admin panel)

### Backend (Firebase Functions)

- **Processing Pipeline**: Multi-stage PubSub-based job analysis system
- **AI Services**: Integration with OpenAI, Anthropic, and Google Gemini APIs
- **Job Processing Stages**:
  1. Job text extraction and description parsing
  2. Skills extraction (hard skills, domain expertise)
  3. Job requirements analysis
  4. Candidate matching with embeddings
  5. Preference matching and final scoring
- **Job Sources**: BrightData web scraping, webhook integrations
- **Email System**: SendGrid for automated job notifications (this doesnt work due to sendgrid policy changes, will need to be updated in the future)

### Data Architecture

- **Firestore Collections**:
  - `users/{uid}/scrapedJobs` - User's job data with AI analysis
  - `users/{uid}/searchQueries` - Saved search configurations
  - `users/{uid}/work_preferences` - User preference answers
  - `jobBatches` - Batch processing tracking
  - `feedback` - User feedback collection

## Common Commands

### Development

```bash
# Start development server (uses development environment)
npm run dev

# Start with production config (for testing prod settings locally)
npm run dev:prod

# Build for different environments
npm run build          # Standard build
npm run build:prod     # Production build
npm run build:staging  # Staging build
```

### Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests with Playwright
npm run test:integration
```

### Code Quality

```bash
# Check code formatting
npm run lint

# Auto-format code
npm run format
```

### Firebase Functions Development

```bash
# From functions directory:
npm run serve          # Start local emulator
npm run shell          # Firebase functions shell
npm run logs           # View function logs

# From root directory:
firebase emulators:start --only functions,firestore,auth
```

### Deployment

**Staging Environment:**

```bash
npm run deploy:staging          # Deploy hosting to staging
npm run deploy:functions        # Deploy functions to staging
```

**ngrok**

is used for local development to receive brightdata snapshots

```bash
ngrok http 5001
```

**Production Environment:**

```bash
npm run deploy:prod             # Deploy hosting to production
npm run deploy:functions:prod   # Deploy functions to production
npm run deploy:rules:prod       # Deploy Firestore rules to production
```

## Environment Configuration

The application uses a multi-tier configuration system:

1. **Firebase Functions Config**: Environment variables via `firebase functions:config:set`
2. **Local Environment Files**: `.env` files for development
3. **Default Fallbacks**: Hardcoded values in `functions/config.js`

Key configuration files:

- `functions/config.js` - Centralized configuration management
- `src/lib/config/firebase.config.js` - Firebase client configuration
- `src/lib/config/environment.config.js` - Environment-specific URLs

Refer to `ENVIRONMENT_URL_CONFIG_GUIDE.md` for detailed configuration instructions.

## Key Store Patterns

### Job Store (`src/lib/stores/jobStore.js`)

- Manages job data with batch-based loading for recent jobs
- Handles sorting, filtering, and search functionality
- Key methods: `loadJobsForTimeFilter()`, `updateStatus()`, `hideJob()`

### Auth Store (`src/lib/stores/authStore.js`)

- Manages Firebase Auth state with automatic Firestore user document creation
- Handles sign-in/sign-out with proper cleanup

## Firebase Functions Architecture

### Processing Pipeline

The job processing pipeline uses PubSub for asynchronous processing:

1. **Job Ingestion**: `handleBrightdataWebhook` → `downloadAndProcessSnapshot`
2. **AI Analysis Chain**: `extractJobDescription` → `summarizeJobDescription` → `extractJobRequirements` → `extractHardSkills` → `extractDomainExpertise` (this part is not integrated since it is outdated)
3. **Matching**: `embeddingMatch` → `matchHardSkills` → `matchDomainExpertise` → `preferenceMatch` → `finalVerdict`
4. **Notification**: `processEmailRequests` → `sendEmail`

### Key Function Categories

- **Job Scraping**: `functions/brightdata_scraping/` - BrightData integration, webhook handling
- **AI Processing**: `functions/pubsub/` - PubSub-triggered AI analysis functions
- **Matching Pipeline**: `functions/matchpipeline/` - Job-candidate matching logic
- **Assessment**: `functions/assessments/` - Resume processing and gap analysis

## Development Workflow

### Adding New Features

1. Update relevant stores in `src/lib/stores/`
2. Create/modify Svelte components in `src/lib/` or `src/routes/`
3. Add Firebase functions in appropriate category directories
4. Update Firestore rules if new data patterns are introduced
5. Test with local emulators before deployment

### Testing AI Functions

Use the `testPubSub` function for testing individual pipeline stages:

```javascript
// Trigger from admin panel or directly
functions.httpsCallable('testPubSub')({
	topic: 'process-job-text',
	data: { jobId: 'test-job-id', userId: 'test-user' }
});
```

### Monitoring and Debugging

- Function logs: `firebase functions:log`
- Real-time debugging via Firebase Console
- Admin panel at `/admin` for system monitoring and testing
- PostHog integration for user analytics

## Important Considerations

### Security

- API keys managed via Firebase Functions config and environment variables
- Firestore security rules enforce user-based data access
- Authentication required for all protected routes

### Rate Limiting

- AI API calls implement exponential backoff
- BrightData scraping respects API quotas
- Email sending limited to prevent spam

### Data Processing

- Job batches tracked for efficient loading and processing status
- PubSub ensures reliable processing of job analysis pipeline
- Resume processing uses structured text extraction with AI

### Deployment Notes

- Always test functions in staging before production deployment
- Monitor function execution costs and quotas
- Keep environment configurations synchronized between staging and production
