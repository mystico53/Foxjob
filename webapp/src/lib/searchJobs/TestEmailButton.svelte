<!-- TestEmailButton.svelte -->
<script>
    import { getFirestore, collection, addDoc } from "firebase/firestore";
    import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
    import { getAuth, onAuthStateChanged } from "firebase/auth";
    import { onMount } from "svelte";
    
    // For status display
    let sending = false;
    let result = null;
    let error = null;
    
    // Form data
    let recipient = "";
    let subject = "Test Email from Foxjob";
    let message = "This is a test email sent from the local development environment.";
    
    // Hardcoded user ID for testing - this is the most reliable way
    let userId = "VCvUK0pLeDVXJ0JHJsNBwxLgvdO2";
    
    async function sendTestEmail() {
      sending = true;
      error = null;
      result = null;
      
      try {
        // Get Firebase Functions instance
        const functions = getFunctions();
        
        // Connect to the emulator when in development
        if (window.location.hostname === "localhost") {
          // Default port for Functions emulator is 5001
          connectFunctionsEmulator(functions, "localhost", 5001);
        }
        
        // Reference the cloud function
        const sendEmail = httpsCallable(functions, 'sendEmail');
        
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
  <h2>SendGrid Email Test</h2>
  
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
    
    <button type="submit" disabled={sending}>
      {sending ? 'Sending...' : 'Send Test Email with Top Jobs'}
    </button>
  </form>
  
  {#if result}
    <div class="result success">
      <p>✅ Email sent successfully!</p>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </div>
  {/if}
  
  {#if error}
    <div class="result error">
      <p>❌ Error sending email:</p>
      <pre>{error}</pre>
    </div>
  {/if}
</div>
  
<style>
  .email-test-container {
    max-width: 500px;
    margin: 0 auto;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
  }
  
  .form-group {
    margin-bottom: 15px;
  }
  
  label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }
  
  input, textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  .help-text {
    font-size: 12px;
    color: #666;
    margin-top: 4px;
  }
  
  button {
    background-color: #4285f4;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
  }
  
  button:disabled {
    background-color: #a9c8fa;
    cursor: not-allowed;
  }
  
  .result {
    margin-top: 20px;
    padding: 10px;
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
  }
</style>