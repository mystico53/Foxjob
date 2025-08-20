<!-- TestEmailButton.svelte -->
<script>
	import { getFirestore, collection, addDoc } from 'firebase/firestore';
	import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
	import { getAuth, onAuthStateChanged } from 'firebase/auth';
	import { onMount } from 'svelte';

	// Import fonts for the component

	// For status display
	let sending = false;
	let previewing = false;
	let result = null;
	let error = null;

	// Form data
	let recipient = '';
	let subject = 'Test Email from Foxjob';
	let message = 'This is a test email sent from the local development environment.';

	// Hardcoded user ID for testing - this is the most reliable way
	let userId = 'VCvUK0pLeDVXJ0JHJsNBwxLgvdO2';

	// Preview state
	let previewHtml = '';
	let showPreview = false;
	let previewTab = 'desktop'; // desktop or mobile

	// Initialize functions
	let sendEmail;
	let previewEmail;

	onMount(() => {
		// Get Firebase Functions instance
		const functions = getFunctions();

		// Connect to the emulator when in development
		if (window.location.hostname === 'localhost') {
			// Default port for Functions emulator is 5001
			connectFunctionsEmulator(functions, 'localhost', 5001);
		}

		// Reference the cloud functions
		sendEmail = httpsCallable(functions, 'sendEmail');
		previewEmail = httpsCallable(functions, 'previewEmail');
	});

	async function generatePreview() {
		previewing = true;
		error = null;

		try {
			// Call the preview function
			const response = await previewEmail({
				to: recipient.trim() || 'konkaiser@gmail.com',
				subject: subject,
				text: message,
				html: `<p>${message}</p>`,
				userId: userId
			});

			previewHtml = response.data.previewHtml;
			showPreview = true;
			console.log('Preview generated successfully');
		} catch (err) {
			error = err.message;
			console.error('Error generating preview:', err);

			// Fallback to generating a local preview if the function fails
			// This allows testing even when there are backend issues
			generateLocalPreview();
		} finally {
			previewing = false;
		}
	}

	// Generate a simple local preview without calling the Firebase function
	function generateLocalPreview() {
		console.log('Generating local preview');

		// Sample job data
		const mockJobs = [
			{
				title: 'Frontend Developer',
				company: 'WebTech Solutions',
				score: 87,
				description: 'WebTech is a digital agency creating cutting-edge websites and applications.',
				responsibility: 'Developing responsive user interfaces with React and modern CSS.',
				gaps: 'Consider deepening knowledge of state management and performance optimization.',
				preferenceExplanation:
					'This role aligns well with your preference for UI/UX focused positions.'
			},
			{
				title: 'Full Stack Engineer',
				company: 'GrowthLabs',
				score: 82,
				description: 'GrowthLabs builds SaaS products for startups and growing businesses.',
				responsibility: 'Building features across the full stack with Node.js and Vue.',
				gaps: 'Your database skills would benefit from more experience with NoSQL solutions.',
				preferenceExplanation: "This role offers the technical challenge you're looking for."
			},
			{
				title: 'Senior React Developer',
				company: 'InnovateTech',
				score: 75,
				description: 'InnovateTech develops enterprise software solutions for global clients.',
				responsibility: 'Leading development of React components and mentoring junior developers.',
				gaps: 'You may need to strengthen your experience with large-scale application architecture.',
				preferenceExplanation:
					'This position includes the mentoring opportunity you mentioned wanting.'
			}
		];

		// Generate improved HTML template with better mobile responsiveness
		previewHtml = `
          <!DOCTYPE html>
          <html>
          <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${subject}</title>
              <style>
                  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                  @import url('https://fonts.googleapis.com/css2?family=Lalezar&display=swap');
                  
                  /* Disable all transitions and animations */
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
                      background: linear-gradient(to right, #FF9C00 0%, #DC3701 100%);
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
                      background: linear-gradient(to bottom, #FF9C00 0%, #DC3701 100%);
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
                      background: linear-gradient(to right, #FF9C00 0%, #DC3701 100%);
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
                  
                  .action-button {
                      display: inline-block;
                      padding: 10px 20px;
                      background: linear-gradient(to right, #FF9C00 0%, #DC3701 100%);
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
                  
                  .action-button:hover {
                      background: #FF9C00;
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
                      
                      ${mockJobs
												.map(
													(job) => `
                          <div class="job-card">
                              <h3 class="job-title">${job.title}</h3>
                              <div class="job-company">${job.company}</div>
                              
                              <div class="preference-explanation">
                                  "${job.preferenceExplanation}"
                              </div>
                              
                              <div class="score-container">
                                  <div class="score-label">Match Score:</div>
                                  <div class="score-bar-container">
                                      <div class="score-bar" style="width: ${job.score}%;"></div>
                                  </div>
                                  <div class="score-value">${job.score}%</div>
                              </div>
                              
                              <div class="info-section">
                                  <div class="info-label">Company:</div>
                                  <div class="info-text">${job.description}</div>
                                  
                                  <div class="info-label">Your Role:</div>
                                  <div class="info-text">${job.responsibility}</div>
                                  
                                  <div class="info-label">Gap Analysis:</div>
                                  <div class="info-text">${job.gaps}</div>
                              </div>
                              
                              <a href="#" class="action-button">View Job</a>
                          </div>
                      `
												)
												.join('')}
                  </div>
                  
                  <div class="footer">
                      <p>© 2023 Foxjob. All rights reserved.</p>
                      <p><a href="#">Unsubscribe</a> | <a href="#">Email Preferences</a></p>
                  </div>
              </div>
          </body>
          </html>
      `;

		showPreview = true;
	}

	async function sendTestEmail() {
		sending = true;
		error = null;
		result = null;

		try {
			// Log what we're sending
			console.log('Sending email with userId:', userId);

			// Call the function with test data AND userId
			const response = await sendEmail({
				to: recipient.trim() || 'konkaiser@gmail.com',
				subject: subject,
				text: message,
				html: `<p>${message}</p>`,
				userId: userId // The key part - explicitly include the userId
			});

			result = response.data;

			// Update preview if available in the response
			if (result.previewHtml) {
				previewHtml = result.previewHtml;
				showPreview = true;
			}

			console.log('Email sent successfully:', result);
		} catch (err) {
			error = err.message;
			console.error('Error sending email:', err);
		} finally {
			sending = false;
		}
	}
</script>

<div class="email-test-container">
	<h2 style="font-family: 'Lalezar', cursive; color: #FF9C00; font-size: 32px;">
		Foxjob Email Test
	</h2>

	<div class="tabs">
		<div
			class="tab {!showPreview ? 'active' : ''}"
			on:click={() => (showPreview = false)}
			on:keydown={(e) => e.key === 'Enter' && (showPreview = false)}
			role="tab"
			tabindex="0"
			aria-selected={!showPreview}
		>
			Configuration
		</div>
		<div
			class="tab {showPreview ? 'active' : ''}"
			on:click={() => (showPreview = true)}
			on:keydown={(e) => e.key === 'Enter' && (showPreview = true)}
			role="tab"
			tabindex="0"
			aria-selected={showPreview}
		>
			Preview
		</div>
	</div>

	{#if !showPreview}
		<form on:submit|preventDefault={sendTestEmail}>
			<div class="form-group">
				<label for="recipient">Recipient Email:</label>
				<input
					type="email"
					id="recipient"
					bind:value={recipient}
					placeholder="konkaiser@gmail.com"
				/>
			</div>

			<div class="form-group">
				<label for="subject">Subject:</label>
				<input type="text" id="subject" bind:value={subject} required />
			</div>

			<div class="form-group">
				<label for="message">Message:</label>
				<textarea id="message" bind:value={message} rows="4" required></textarea>
			</div>

			<div class="form-group">
				<label for="userId">User ID:</label>
				<input type="text" id="userId" bind:value={userId} />
				<p class="help-text">This user ID will be used to find top job matches</p>
			</div>

			<div class="button-group">
				<button type="button" class="secondary" on:click={generatePreview} disabled={previewing}>
					{previewing ? 'Generating...' : 'Preview Email'}
				</button>

				<button type="submit" disabled={sending}>
					{sending ? 'Sending...' : 'Send Test Email with Top Jobs'}
				</button>
			</div>
		</form>

		{#if result}
			<div class="result success">
				<p>✅ Email sent successfully!</p>
				<pre>{JSON.stringify(result, null, 2)}</pre>
			</div>
		{/if}

		{#if error}
			<div class="result error">
				<p>❌ Error:</p>
				<pre>{error}</pre>
			</div>
		{/if}
	{:else}
		<!-- Preview Area -->
		<div class="preview-container">
			<div class="preview-controls">
				<div class="preview-tabs">
					<button
						class={previewTab === 'desktop' ? 'active' : ''}
						on:click={() => (previewTab = 'desktop')}
					>
						Desktop
					</button>
					<button
						class={previewTab === 'mobile' ? 'active' : ''}
						on:click={() => (previewTab = 'mobile')}
					>
						Mobile
					</button>
				</div>
				<button class="back-button" on:click={() => (showPreview = false)}>
					Back to Configuration
				</button>
			</div>

			<div class="preview-frame {previewTab}">
				{#if previewHtml}
					{@html `<iframe srcdoc="${previewHtml.replace(/"/g, '&quot;')}" frameborder="0" class="${previewTab}"></iframe>`}
				{:else}
					<div class="no-preview">
						<p>No preview available yet. Click "Preview Email" to generate a preview.</p>
						{#if error}
							<div class="preview-error">
								<p>
									Note: There was an error connecting to the preview service, but the local preview
									will still work.
								</p>
								<button on:click={generateLocalPreview} class="secondary"
									>Generate Local Preview</button
								>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			{#if error && showPreview}
				<div class="preview-note">
					<p>
						⚠️ Note: This is a local preview. Some data may not reflect actual database content.
					</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Import fonts if not imported in script */
	@import url('https://fonts.googleapis.com/css2?family=Lalezar&family=Inter:wght@400;500;600;700&display=swap');
	@import url('https://fonts.googleapis.com/css2?family=Lalezar&display=swap');

	.email-test-container {
		max-width: 800px;
		margin: 0 auto;
		padding: 20px;
		border: 1px solid #ddd;
		border-radius: 8px;
		background-color: #fff;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		font-family: 'Inter', Arial, sans-serif;
	}

	h2 {
		margin-top: 0;
		color: #333;
		border-bottom: 1px solid #eee;
		padding-bottom: 10px;
	}

	.tabs {
		display: flex;
		border-bottom: 1px solid #ddd;
		margin-bottom: 20px;
	}

	.tab {
		padding: 10px 20px;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: none;
	}

	.tab.active {
		border-bottom: 2px solid #ff9c00;
		color: #ff9c00;
		font-weight: bold;
	}

	.form-group {
		margin-bottom: 15px;
	}

	label {
		display: block;
		margin-bottom: 5px;
		font-weight: bold;
		color: #555;
	}

	input,
	textarea {
		width: 100%;
		padding: 10px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 14px;
	}

	input:focus,
	textarea:focus {
		outline: none;
		border-color: #4285f4;
		box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
	}

	.help-text {
		font-size: 12px;
		color: #666;
		margin-top: 4px;
	}

	.button-group {
		display: flex;
		gap: 10px;
		margin-top: 20px;
	}

	button {
		background: #ff9c00;
		color: white;
		border: none;
		padding: 10px 16px;
		border-radius: 4px;
		cursor: pointer;
		font-weight: bold;
		transition: none;
	}

	button.secondary {
		background: #f8f9fa;
		color: #ff9c00;
		border: 1px solid #dadce0;
	}

	button:hover {
		background: #ff9c00;
	}

	button.secondary:hover {
		background: #f8f9fa;
	}

	button:disabled {
		background: #ffcc80;
		opacity: 0.7;
		cursor: not-allowed;
	}

	button.secondary:disabled {
		background-color: #f8f9fa;
		color: #bdc1c6;
		border-color: #e8eaed;
	}

	.result {
		margin-top: 20px;
		padding: 15px;
		border-radius: 4px;
	}

	.success {
		background-color: #e6f4ea;
		border: 1px solid #34a853;
	}

	.error {
		background-color: #fce8e6;
		border: 1px solid #ea4335;
	}

	pre {
		white-space: pre-wrap;
		word-break: break-all;
		background: rgba(0, 0, 0, 0.04);
		padding: 8px;
		border-radius: 4px;
		font-size: 12px;
		max-height: 200px;
		overflow-y: auto;
	}

	/* Preview section styles */
	.preview-container {
		display: flex;
		flex-direction: column;
		gap: 15px;
	}

	.preview-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.preview-tabs {
		display: flex;
		gap: 10px;
	}

	.preview-tabs button {
		background-color: #f1f3f4;
		color: #3c4043;
		padding: 8px 16px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: none;
	}

	.preview-tabs button.active {
		background: #ff9c00;
		color: white;
	}

	.back-button {
		background-color: transparent;
		color: #ff9c00;
		border: none;
		cursor: pointer;
		font-weight: normal;
		padding: 8px 12px;
		transition: none;
	}

	.back-button:hover {
		background-color: transparent;
	}

	.preview-frame {
		border: 1px solid #ddd;
		border-radius: 4px;
		background-color: #f8f9fa;
		height: 600px;
		overflow: hidden;
	}

	.preview-frame.mobile {
		display: flex;
		justify-content: center;
		padding: 20px 0;
	}

	.no-preview {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		height: 100%;
		color: #666;
		text-align: center;
		padding: 20px;
	}

	.preview-error {
		margin-top: 20px;
		padding: 15px;
		background-color: #fef7f6;
		border: 1px solid #fdded8;
		border-radius: 4px;
		max-width: 80%;
	}

	.preview-note {
		margin-top: 10px;
		padding: 8px 15px;
		background-color: #fff8e5;
		border-left: 3px solid #fbbc04;
		font-size: 14px;
	}
</style>
