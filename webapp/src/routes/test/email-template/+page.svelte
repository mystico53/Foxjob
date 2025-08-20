<script>
	import TestEmailButton from '$lib/searchJobs/TestEmailButton.svelte';
	import { onMount } from 'svelte';

	let iframeDoc;
	let showRawHtml = false;

	// Sample email template for testing without Firebase
	const sampleHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sample Foxjob Email</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Lalezar&display=swap');
        
        * {
          transition: none !important;
          animation: none !important;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
        }
        
        .header {
          padding: 24px 20px;
          text-align: center;
        }
        
        .header-content {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .logo-img {
          width: 48px;
          height: 48px;
        }
        
        .logo-text {
          display: none;
        }
        
        .content {
          padding: 20px;
        }
        
        .message {
          padding: 0 0 20px 0;
        }
        
        .section-header {
          font-size: 20px;
          font-weight: 700;
          color: #333;
          margin: 24px 0 16px 0;
          padding-bottom: 8px;
          position: relative;
        }
        
        .section-header:after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          width: 60px;
          height: 3px;
          background: linear-gradient(to right, #FF9C00 30%, #FF9C00 70%, #DC3701 100%);
          border-radius: 3px;
        }
        
        .job-card {
          margin-bottom: 20px;
          padding: 18px;
          border-radius: 8px;
          background-color: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          border: 1px solid #eee;
          position: relative;
          overflow: hidden;
        }
        
        .job-card:before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: #FF9C00;
        }
        
        .job-title {
          font-size: 17px;
          font-weight: 600;
          color: #222;
          margin: 0 0 10px 0;
          padding-left: 8px;
        }
        
        .job-company {
          font-size: 15px;
          font-weight: 500;
          color: #555;
          margin: 0 0 12px 0;
          padding-left: 8px;
        }
        
        .preference-explanation {
          font-style: italic;
          font-size: 14px;
          color: #666;
          margin: 12px 0;
          padding: 10px;
          background-color: #f9f9f9;
          border-radius: 4px;
          border-left: 2px solid #FF9C00;
        }
        
        .score-container {
          margin: 12px 0;
          display: flex;
          align-items: center;
        }
        
        .score-label {
          font-size: 14px;
          font-weight: 600;
          color: #555;
          margin-right: 10px;
          min-width: 90px;
        }
        
        .score-bar-container {
          flex-grow: 1;
          height: 8px;
          background-color: #f0f0f0;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .score-bar {
          height: 100%;
          border-radius: 4px;
          background: #FF9C00;
          width: 85%;
        }
        
        .score-value {
          font-size: 14px;
          font-weight: 600;
          color: #222;
          margin-left: 10px;
        }
        
        .info-section {
          margin: 12px 0;
          padding-left: 8px;
        }
        
        .info-label {
          font-size: 14px;
          font-weight: 600;
          color: #444;
          margin-bottom: 2px;
        }
        
        .info-text {
          font-size: 14px;
          color: #555;
          margin: 0 0 12px 0;
        }
        
        .action-button {
          display: inline-block;
          padding: 10px 20px;
          background: #FF9C00;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          font-size: 14px;
          margin-top: 6px;
          text-align: center;
        }
        
        .footer {
          margin-top: 30px;
          padding: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        
        .footer a {
          color: #555;
          text-decoration: none;
        }
        
        .action-button:hover {
          background: #FF9C00;
        }
        
        /* Mobile Optimizations */
        @media only screen and (max-width: 480px) {
          .email-container {
            width: 100% !important;
          }
          
          .content {
            padding: 15px;
          }
          
          .job-card {
            padding: 15px;
          }
          
          .job-title {
            font-size: 16px;
          }
          
          .score-container {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .score-bar-container {
            width: 100%;
            margin: 6px 0;
          }
          
          .score-value {
            margin-left: 0;
          }
          
          .action-button {
            display: block;
            width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="header-content">
            <img src="https://foxjob.io/images/icon128.png" alt="Foxjob" class="logo-img">
          </div>
        </div>
        
        <div class="content">
          <div class="message">
            <p>Your personalized job matches are ready.</p>
          </div>
          
          <div class="job-card">
            <h3 class="job-title">Frontend Developer</h3>
            <div class="job-company">WebTech Solutions</div>
            
            <div class="preference-explanation">
              "This role aligns well with your preference for UI/UX focused positions."
            </div>
            
            <div class="score-container">
              <div class="score-label">Match Score:</div>
              <div class="score-bar-container">
                <div class="score-bar" style="width: 85%;"></div>
              </div>
              <div class="score-value">85%</div>
            </div>
            
            <div class="info-section">
              <div class="info-label">Company:</div>
              <div class="info-text">WebTech is a digital agency creating cutting-edge websites and applications.</div>
              
              <div class="info-label">Your Role:</div>
              <div class="info-text">Developing responsive user interfaces with React and modern CSS.</div>
              
              <div class="info-label">Gap Analysis:</div>
              <div class="info-text">Consider deepening knowledge of state management and performance optimization.</div>
            </div>
            
            <a href="#" class="action-button">View Job</a>
          </div>
          
          <div class="job-card">
            <h3 class="job-title">Full Stack Engineer</h3>
            <div class="job-company">GrowthLabs</div>
            
            <div class="preference-explanation">
              "This role offers the technical challenge you're looking for."
            </div>
            
            <div class="score-container">
              <div class="score-label">Match Score:</div>
              <div class="score-bar-container">
                <div class="score-bar" style="width: 78%;"></div>
              </div>
              <div class="score-value">78%</div>
            </div>
            
            <div class="info-section">
              <div class="info-label">Company:</div>
              <div class="info-text">GrowthLabs builds SaaS products for startups and growing businesses.</div>
              
              <div class="info-label">Your Role:</div>
              <div class="info-text">Building features across the full stack with Node.js and Vue.</div>
              
              <div class="info-label">Gap Analysis:</div>
              <div class="info-text">Your database skills would benefit from more experience with NoSQL solutions.</div>
            </div>
            
            <a href="#" class="action-button">View Job</a>
          </div>
        </div>
        
        <div class="footer">
          <p>© 2023 Foxjob. All rights reserved.</p>
          <p><a href="#">Unsubscribe</a> | <a href="#">Email Preferences</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

	// Load the sample email in an iframe for testing
	onMount(() => {
		const iframe = document.getElementById('email-preview');
		if (iframe) {
			iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
			iframeDoc.open();
			iframeDoc.write(sampleHtml);
			iframeDoc.close();
		}
	});

	function toggleResponsiveMode() {
		const iframe = document.getElementById('email-preview');
		if (iframe.classList.contains('mobile-view')) {
			iframe.classList.remove('mobile-view');
		} else {
			iframe.classList.add('mobile-view');
		}
	}

	function toggleRawHtml() {
		showRawHtml = !showRawHtml;
	}
</script>

<div class="email-test-page">
	<h1>Email Template Tester</h1>

	<div class="tabs">
		<button class="tab active">Static Preview</button>
		<button class="tab">Live Test</button>
	</div>

	<div class="preview-controls">
		<button on:click={toggleResponsiveMode}>Toggle Mobile View</button>
		<button on:click={toggleRawHtml}>Show {showRawHtml ? 'Preview' : 'HTML'}</button>
	</div>

	{#if showRawHtml}
		<div class="raw-html">
			<pre>{sampleHtml}</pre>
		</div>
	{:else}
		<div class="preview-container">
			<iframe id="email-preview" title="Email Preview" frameborder="0"></iframe>
		</div>
	{/if}

	<div class="live-tester">
		<h2>Send Live Test Email</h2>
		<p>Use the form below to test sending the email through Firebase Functions:</p>
		<TestEmailButton />
	</div>
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
	@import url('https://fonts.googleapis.com/css2?family=Lalezar&display=swap');

	.email-test-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
		font-family:
			'Inter',
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			Oxygen,
			Ubuntu,
			Cantarell,
			'Open Sans',
			'Helvetica Neue',
			sans-serif;
	}

	h1 {
		font-size: 28px;
		font-weight: 700;
		color: #333;
		margin: 0 0 24px 0;
		padding-bottom: 12px;
		border-bottom: 1px solid #eee;
		position: relative;
	}

	h1:after {
		content: '';
		position: absolute;
		bottom: -1px;
		left: 0;
		width: 80px;
		height: 3px;
		background: #ff9c00;
		border-radius: 3px;
	}

	.tabs {
		display: flex;
		margin-bottom: 20px;
		gap: 10px;
	}

	.tab {
		padding: 10px 16px;
		background: #f5f5f5;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: 500;
		transition: none;
	}

	.tab.active {
		background: #ff9c00;
		color: white;
	}

	.preview-controls {
		display: flex;
		gap: 10px;
		margin-bottom: 16px;
	}

	.preview-controls button {
		padding: 8px 12px;
		background: #f5f5f5;
		border: 1px solid #ddd;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		transition: none;
	}

	.preview-controls button:hover {
		background: #f5f5f5;
	}

	.preview-container {
		border: 1px solid #ddd;
		border-radius: 4px;
		background-color: #f8f9fa;
		height: 600px;
		overflow: hidden;
		margin-bottom: 30px;
	}

	iframe {
		width: 100%;
		height: 100%;
		border: none;
	}

	.raw-html {
		border: 1px solid #ddd;
		border-radius: 4px;
		background-color: #f8f9fa;
		height: 600px;
		overflow: auto;
		margin-bottom: 30px;
	}

	pre {
		margin: 0;
		padding: 16px;
		font-family: monospace;
		font-size: 14px;
		white-space: pre-wrap;
		word-break: break-all;
	}

	.live-tester {
		padding: 20px;
		background-color: #fff;
		border: 1px solid #ddd;
		border-radius: 8px;
		margin-top: 30px;
	}

	h2 {
		font-size: 22px;
		font-weight: 600;
		color: #333;
		margin: 0 0 16px 0;
	}

	p {
		color: #555;
		margin-bottom: 20px;
	}
</style>
