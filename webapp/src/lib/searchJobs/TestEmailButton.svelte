<!-- TestEmailButton.svelte -->
<script>
  import { getFirestore, collection, addDoc } from "firebase/firestore";
  import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
  import { getAuth, onAuthStateChanged } from "firebase/auth";
  import { onMount } from "svelte";
  
  // Import fonts for the component
  
  // For status display
  let sending = false;
  let previewing = false;
  let result = null;
  let error = null;
  
  // Form data
  let recipient = "";
  let subject = "Test Email from Foxjob";
  let message = "This is a test email sent from the local development environment.";
  
  // Hardcoded user ID for testing - this is the most reliable way
  let userId = "VCvUK0pLeDVXJ0JHJsNBwxLgvdO2";
  
  // Preview state
  let previewHtml = "";
  let showPreview = false;
  let previewTab = "desktop"; // desktop or mobile
  
  // Initialize functions
  let sendEmail;
  let previewEmail;
  
  onMount(() => {
      // Get Firebase Functions instance
      const functions = getFunctions();
      
      // Connect to the emulator when in development
      if (window.location.hostname === "localhost") {
          // Default port for Functions emulator is 5001
          connectFunctionsEmulator(functions, "localhost", 5001);
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
              to: recipient.trim() || "konkaiser@gmail.com",   
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
  
  // Generate a preview locally without calling the Firebase function
  function generateLocalPreview() {
      console.log('Generating local preview');
      
      // Sample job data
      const mockJobs = [
          {
              title: "Frontend Developer",
              company: "WebTech Solutions",
              score: "87%",
              description: "WebTech is a digital agency creating cutting-edge websites and applications.",
              responsibility: "Developing responsive user interfaces with React and modern CSS.",
              gaps: "Consider deepening knowledge of state management and performance optimization."
          },
          {
              title: "Full Stack Engineer",
              company: "GrowthLabs",
              score: "82%",
              description: "GrowthLabs builds SaaS products for startups and growing businesses.",
              responsibility: "Building features across the full stack with Node.js and Vue.",
              gaps: "Your database skills would benefit from more experience with NoSQL solutions."
          }
      ];
      
      // Generate simple HTML template
      previewHtml = `
          <!DOCTYPE html>
          <html>
          <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${subject}</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <header style="text-align: center; padding: 24px; border-bottom: 2px solid #eee;">
                  <div style="display: inline-block; text-align: center;">
                      <!-- Logo replacement with styled text -->
                      <div style="font-family: 'Lalezar', cursive; font-size: 36px; line-height: 1; letter-spacing: 0.02em; background: linear-gradient(to right, #fd5440 0%, #ff9c00 100%); -webkit-background-clip: text; background-clip: text; color: transparent;">FOXJOB</div>
                  </div>
              </header>
              
              <div style="padding: 15px; border-radius: 5px; background-color: #fff;">
                  <p>${message}</p>
              </div>
              
              <div style="padding: 24px; padding-top: 20px; border-bottom: 1px solid #eee;">
                  <h2 style="color: #333; font-size: 22px; margin-bottom: 20px; font-weight: 700; border-bottom: 2px solid #fd5440; padding-bottom: 8px; display: inline-block;">Your Top Matched Jobs</h2>
                  
                  ${mockJobs.map(job => `
                      <div style="margin-bottom: 20px; padding: 18px; border: 1px solid #eee; border-radius: 8px; background-color: #f9f9f9; border-left: 4px solid #fd5440;">
                          <h3 style="color: #B45309; margin-bottom: 12px; font-size: 18px; font-weight: 700;">${job.title} at ${job.company}</h3>
                          <p style="margin: 10px 0;"><strong style="color: #555;">Match Score:</strong> <span style="color: #B45309; font-weight: bold;">${job.score}</span></p>
                          <p style="margin: 10px 0;"><strong style="color: #555;">Company:</strong> ${job.description}</p>
                          <p style="margin: 10px 0;"><strong style="color: #555;">Your Role:</strong> ${job.responsibility}</p>
                          <p style="margin: 10px 0;"><strong style="color: #555;">Gap Analysis:</strong> ${job.gaps}</p>
                      </div>
                  `).join('')}
              </div>
              
              <footer style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666;">
                  <p>© 2025 Foxjob. All rights reserved.</p>
                  <p><a href="https://www.foxjob.io/unsubscribe" style="color: #1a73e8; text-decoration: none;">Unsubscribe</a> | <a href="https://www.foxjob.io/preferences" style="color: #1a73e8; text-decoration: none;">Email Preferences</a></p>
              </footer>
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
              to: recipient.trim() || "konkaiser@gmail.com",   
              subject: subject,
              text: message,
              html: `<p>${message}</p>`,
              userId: userId  // The key part - explicitly include the userId
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
  <h2 style="font-family: 'Lalezar', cursive; background: linear-gradient(to right, #fd5440 0%, #ff9c00 100%); -webkit-background-clip: text; background-clip: text; color: transparent; font-size: 32px;">Foxjob Email Test</h2>
  
  <div class="tabs">
      <div 
          class="tab {!showPreview ? 'active' : ''}" 
          on:click={() => showPreview = false}
          on:keydown={e => e.key === 'Enter' && (showPreview = false)}
          role="tab"
          tabindex="0"
          aria-selected={!showPreview}
      >
          Configuration
      </div>
      <div 
          class="tab {showPreview ? 'active' : ''}" 
          on:click={() => showPreview = true}
          on:keydown={e => e.key === 'Enter' && (showPreview = true)}
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
              <input 
                  type="text" 
                  id="subject" 
                  bind:value={subject} 
                  required
              />
          </div>
          
          <div class="form-group">
              <label for="message">Message:</label>
              <textarea 
                  id="message" 
                  bind:value={message} 
                  rows="4" 
                  required
              ></textarea>
          </div>
          
          <div class="form-group">
              <label for="userId">User ID:</label>
              <input 
                  type="text" 
                  id="userId" 
                  bind:value={userId} 
              />
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
                      on:click={() => previewTab = 'desktop'}
                  >
                      Desktop
                  </button>
                  <button 
                      class={previewTab === 'mobile' ? 'active' : ''} 
                      on:click={() => previewTab = 'mobile'}
                  >
                      Mobile
                  </button>
              </div>
              <button class="back-button" on:click={() => showPreview = false}>
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
                              <p>Note: There was an error connecting to the preview service, but the local preview will still work.</p>
                              <button on:click={generateLocalPreview} class="secondary">Generate Local Preview</button>
                          </div>
                      {/if}
                  </div>
              {/if}
          </div>
          
          {#if error && showPreview}
              <div class="preview-note">
                  <p>⚠️ Note: This is a local preview. Some data may not reflect actual database content.</p>
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
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
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
  }
  
  .tab.active {
      border-bottom: 2px solid #fd5440;
      color: #B45309;
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
  
  input, textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
  }
  
  input:focus, textarea:focus {
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
      background-color: #fd5440;
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      transition: background-color 0.2s;
  }
  
  button.secondary {
      background-color: #f8f9fa;
      color: #B45309;
      border: 1px solid #dadce0;
  }
  
  button:hover {
      background-color: #B45309;
  }
  
  button.secondary:hover {
      background-color: #f1f3f4;
  }
  
  button:disabled {
      background-color: #a9c8fa;
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
      background: rgba(0,0,0,0.04);
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
  }
  
  .preview-tabs button.active {
      background-color: #fd5440;
      color: white;
  }
  
  .back-button {
      background-color: transparent;
      color: #B45309;
      border: none;
      cursor: pointer;
      font-weight: normal;
      padding: 8px 12px;
  }
  
  .back-button:hover {
      background-color: #f1f3f4;
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