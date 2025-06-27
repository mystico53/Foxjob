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
      } catch (err) {
          error = err.message;
          // Fallback to generating a local preview if the function fails
          // This allows testing even when there are backend issues
          generateLocalPreview();
      } finally {
          previewing = false;
      }
  }
  
  // Generate a simple local preview without calling the Firebase function
  async function generateLocalPreview() {
    isGenerating = true;
    errorMessage = '';
    
    try {
      const response = await fetch(previewUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: uid,
          searchId: searchId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Update the preview state
      previewGenerated = true;
      previewData = data;
      
    } catch (err) {
      errorMessage = err.message || 'Failed to generate preview';
    } finally {
      isGenerating = false;
    }
  }
  
  async function sendTestEmail() {
    isSending = true;
    errorMessage = '';
    
    try {
      const response = await fetch(emailUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: uid,
          searchId: searchId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      successMessage = 'Test email sent successfully!';
      
    } catch (err) {
      errorMessage = err.message || 'Failed to send test email';
    } finally {
      isSending = false;
    }
  }
</script>

<div class="email-test-container">
  <h2 style="font-family: 'Lalezar', cursive; color: #FF9C00; font-size: 32px;">Foxjob Email Test</h2>
  
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
      transition: none;
  }
  
  .tab.active {
      border-bottom: 2px solid #FF9C00;
      color: #FF9C00;
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
      background: #FF9C00;
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
      color: #FF9C00;
      border: 1px solid #dadce0;
  }
  
  button:hover {
      background: #FF9C00;
  }
  
  button.secondary:hover {
      background: #f8f9fa;
  }
  
  button:disabled {
      background: #FFCC80;
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
      transition: none;
  }
  
  .preview-tabs button.active {
      background: #FF9C00;
      color: white;
  }
  
  .back-button {
      background-color: transparent;
      color: #FF9C00;
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