<script>
	import { marked } from 'marked';

	const privacyContent = `# Privacy Statement for Foxjob

Last Updated: December 1st, 2024

## 1. Introduction

This privacy statement explains how Foxjob ("Service"), including both our web application and Chrome Extension, collects, uses, and protects your data. We are committed to ensuring the privacy and security of our users.

## 2. Information We Collect

Our Service collects the following data:

### Web Application
- Your Google account information (including display name and email address)
- Resume data when uploaded (optional)
- Your interactions with job listings
- Usage data and preferences
- Job matching and assessment results

### Chrome Extension
- The content of job description pages you're viewing when you activate the Extension
- The URL of the webpage you're viewing when you activate the Extension
- Your interaction data with job descriptions and summaries

## 3. How We Use Your Information

We use the collected information to:
- Create and manage your user account
- Authenticate you using Google Sign-In
- Process and analyze job descriptions
- Generate personalized job matches and recommendations
- Track your job application progress
- Analyze resume compatibility with job requirements
- Send important notifications about your account and matches
- Improve our service based on usage patterns

## 4. Data Storage and Security

Your data is:
- Stored securely in Google Cloud Firestore
- Protected by Firebase Security Rules
- Encrypted during transmission using SSL/TLS
- Accessible only by you and our authorized system processes
- Never sold to third parties
- Backed up regularly to prevent data loss

## 5. Data Sharing and Third Parties

We share data with the following service providers:
- Google Firebase for authentication and data storage
- Anthropic for job description analysis and matching using their Language Model (LLM) service

These providers are bound by strict data protection agreements and only process data for specified purposes.

## 6. Your Rights

You have the right to:
- Access your personal data
- Correct inaccurate data
- Request deletion of your data
- Export your data
- Withdraw consent for data processing
- Lodge a complaint with supervisory authorities

## 7. Data Retention

We retain your data until:
- You request its deletion
- You delete your account
- The data is no longer necessary for our services
- Account inactivity exceeds 24 months

## 8. Legal Basis for Processing

We process your data based on:
- Your explicit consent
- The necessity to perform our service contract with you
- Our legitimate interests in providing and improving our services

## 9. Children's Privacy

Our service is not intended for users under 16 years of age. We do not knowingly collect data from children under 16.

## 10. Changes to This Privacy Statement

We will notify you of any material changes to this privacy statement through our website, extension, or email. Continued use of our services after changes constitutes acceptance of the updated privacy statement.

## 11. Contact Information

For privacy-related inquiries or to exercise your data rights:

Konstantin Kaiser
Email: konkaiser@gmail.com

## 12. Your Data Protection Rights

If you are in the EU/EEA, you have additional rights under GDPR. If you are in California, you have rights under CCPA. Contact us to learn more about your specific rights.

By using our services, you acknowledge this privacy statement and consent to the collection and processing of your data as described above.`;

	const htmlContent = marked(privacyContent);

	function goBack() {
		window.history.back();
	}
</script>

<svelte:head>
	<title>Privacy Policy | Foxjob</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<!-- Back button -->
	<button
		on:click={goBack}
		class="mb-4 rounded bg-[#DC3701] px-4 py-2 font-bold text-white hover:brightness-110"
	>
		← Back
	</button>
	<!-- Privacy content -->
	{@html htmlContent}
</div>

<style>
	:global(h1) {
		@apply mb-4 text-3xl font-bold;
	}
	:global(h2) {
		@apply mb-3 mt-6 text-2xl font-semibold;
	}
	:global(h3) {
		@apply mb-2 mt-4 text-xl font-semibold;
	}
	:global(p) {
		@apply mb-4;
	}
	:global(ul) {
		@apply mb-4 list-inside list-disc;
	}

	button {
		@apply mb-4;
	}
</style>
