
<script>
    import { marked } from 'marked';

    const tosContent = `# Terms of Service for Foxjob

Last Updated: December 1st, 2024

## 1. Acceptance of Terms

By accessing and using Foxjob ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.

## 2. Description of Service

Foxjob provides an AI-powered job application management platform that helps users track, analyze, and optimize their job search process.

## 3. User Account Requirements

- You must provide accurate information when creating an account
- You are responsible for maintaining the security of your account
- You must notify us immediately of any unauthorized access
- One person may only create one account

## 4. Acceptable Use

You agree not to:
- Use the Service for any illegal purpose
- Submit false or misleading information
- Attempt to access other users' accounts
- Interfere with or disrupt the Service
- Attempt to circumvent any limitations of the Service

## 5. Data Usage and Privacy

- Your use of the Service is also governed by our Privacy Policy
- We process your data as described in our Privacy Policy
- You retain ownership of your content
- You grant us license to use your data to provide the Service

## 6. Service Limitations

- We provide the Service on an "as is" and "as available" basis
- We may modify or discontinue features without notice
- We do not guarantee accuracy of job matching or analysis
- Service availability may vary and maintenance may occur

## 7. Intellectual Property

- All Service content and features are owned by Foxjob
- You may not copy, modify, or reverse engineer any part of the Service
- You may not use our branding or logos without permission

## 8. Third-Party Services

Our Service integrates with:
- Google Authentication
- Anthropic's AI services
- Firebase/Firestore
You may be subject to their respective terms of service.

## 9. Termination

We may suspend or terminate your account for:
- Violation of these Terms
- Extended period of inactivity
- At your request
- For any reason at our discretion

## 10. Disclaimer of Warranties

THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.

## 11. Limitation of Liability

We shall not be liable for any indirect, incidental, special, or consequential damages.

## 12. Changes to Terms

- We may update these Terms at any time
- We will notify you of significant changes
- Continued use after changes constitutes acceptance

## 13. Governing Law

These Terms are governed by the laws of Germany.

## 14. Contact Information

For questions about these Terms:

Konstantin Kaiser
Email: konkaiser@gmail.com`;

    const htmlContent = marked(tosContent);

    function goBack() {
        window.history.back();
    }
</script>

<svelte:head>
    <title>Terms of Service | Foxjob</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
    <!-- Back button -->
    <button on:click={goBack} class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4">
        ← Back
    </button>
    <!-- ToS content -->
    {@html htmlContent}
</div>

<style>
    :global(h1) {
        @apply text-3xl font-bold mb-4;
    }
    :global(h2) {
        @apply text-2xl font-semibold mt-6 mb-3;
    }
    :global(p) {
        @apply mb-4;
    }
    :global(ul) {
        @apply list-disc list-inside mb-4;
    }

    button {
        @apply mb-4;
    }
</style>