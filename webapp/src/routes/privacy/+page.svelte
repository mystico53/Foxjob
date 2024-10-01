<script>
    import { marked } from 'marked';

    const privacyContent = `# Privacy Statement for Job Description Summarizer Chrome Extension

Last Updated: [October 1st, 2024]

## 1. Introduction

This privacy statement explains how our Job Description Summarizer Chrome Extension ("the Extension") collects, uses, and protects your data. We are committed to ensuring the privacy and security of our users.

## 2. Information We Collect

The Extension collects the following data:

- Your Google ID (obtained through Google OAuth)
- The content of the webpage you're viewing when you activate the Extension
- The URL of the webpage you're viewing when you activate the Extension

We do not collect your email address or any other personal information beyond what is listed above.

## 3. How We Use Your Information

We use the collected information to:

- Authenticate you using your Google ID
- Process and summarize job descriptions you submit
- Associate summarized job descriptions with your Google ID for your future reference

## 4. Data Sharing and Third Parties

We share the collected webpage content with Anthropic, a third-party service provider, for the purpose of summarizing job descriptions using their Language Model (LLM) service. We do not share your Google ID or any other personal information with Anthropic.

## 5. Data Retention

We retain the collected data until you choose to delete it. You can request deletion of your data by contacting us (see Section 10).

## 6. Data Security

We implement industry-standard security measures, including SSL encryption, to protect your data from unauthorized access, alteration, disclosure, or destruction.

## 7. Your Rights

You have the right to:

- Request access to the data we hold about you
- Request modification of your data
- Request deletion of your data

To exercise these rights, please contact us using the information provided in Section 10.

## 8. Cookies and Tracking

The Extension does not use cookies or any other tracking technologies.

## 9. Changes to This Privacy Statement

We may update this privacy statement from time to time. We will notify users of any significant changes through the Extension or our website.

## 10. Contact Information

If you have any questions, concerns, or requests regarding your privacy or this privacy statement, please contact:

Konstantin Kaiser
Email: konkaiser@gmail.com

## 11. Compliance with Privacy Regulations

While we strive to protect your privacy, we cannot guarantee compliance with specific regulations such as GDPR or CCPA. If you have concerns about how this may affect you, please contact us for more information.

By using the Extension, you agree to the collection and use of information as described in this privacy statement.`;

    const htmlContent = marked(privacyContent);

    function goBack() {
        window.history.back();
    }
</script>

<svelte:head>
    <title>Privacy Policy | Jobille</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
    <!-- Back button -->
    <button on:click={goBack} class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4">
        ← Back
    </button>
    <!-- Privacy content -->
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
        @apply mb-4; /* Adds some margin at the bottom to create space between the button and content */
    }
</style>
