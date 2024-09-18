document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKey');
  const saveKeyButton = document.getElementById('saveKey');
  const sendButton = document.getElementById('sendButton');
  const statusDiv = document.getElementById('status');
  const apiKeyFoundDiv = document.getElementById('apiKeyFound');
  const apiKeyInputSection = document.getElementById('apiKeyInputSection');

  // Load saved API key
  chrome.storage.local.get(['openaiApiKey'], function(result) {
    if (result.openaiApiKey) {
      apiKeyFoundDiv.style.display = 'block';
      apiKeyInputSection.style.display = 'none';
      statusDiv.textContent = 'Ready to process text';
    } else {
      apiKeyFoundDiv.style.display = 'none';
      apiKeyInputSection.style.display = 'block';
      statusDiv.textContent = 'Please enter an API Key';
    }
  });

  saveKeyButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.local.set({openaiApiKey: apiKey}, function() {
        apiKeyFoundDiv.style.display = 'block';
        apiKeyInputSection.style.display = 'none';
        statusDiv.textContent = 'API Key saved. Ready to process text';
      });
    } else {
      statusDiv.textContent = 'Please enter a valid API Key';
    }
  });

  sendButton.addEventListener('click', async function() {
    try {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      if (!tab) {
        statusDiv.textContent = 'No active tab found';
        return;
      }

      // Inject the content script
      await chrome.scripting.executeScript({
        target: {tabId: tab.id},
        files: ['content.js']
      });

      // Send message to the content script
      chrome.tabs.sendMessage(tab.id, {action: "getSelection"}, function(response) {
        if (chrome.runtime.lastError) {
          statusDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
        } else if (response && response.success) {
          statusDiv.textContent = 'Processing text with OpenAI...';
          chrome.runtime.sendMessage({action: "processWithOpenAI", text: response.text}, function(aiResponse) {
            if (aiResponse.success) {
              // Convert the response to HTML
              const formattedResponse = aiResponse.result
                .replace(/\n\n/g, '<br><br>')  // Convert double line breaks to <br> tags
                .replace(/•/g, '&bull;')  // Convert bullet points to HTML entities
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Convert **bold** to <strong> tags
                .replace(/\n/g, '<br>');  // Convert single line breaks to <br> tags

              // Create a new div for the formatted response
              const responseDiv = document.createElement('div');
              responseDiv.innerHTML = formattedResponse;
              responseDiv.style.maxHeight = '300px';  // Set a max height
              responseDiv.style.overflowY = 'auto';  // Add a scrollbar if content exceeds max height
              responseDiv.style.border = '1px solid #ccc';
              responseDiv.style.padding = '10px';
              responseDiv.style.marginTop = '10px';
              responseDiv.style.backgroundColor = '#f9f9f9';  // Light gray background
              responseDiv.style.borderRadius = '5px';  // Rounded corners
              responseDiv.style.fontFamily = 'Arial, sans-serif';  // Set font
              responseDiv.style.fontSize = '14px';  // Set font size

              // Clear previous content and append the new response
              statusDiv.textContent = 'Analysis complete:';
              statusDiv.appendChild(responseDiv);
            } else {
              statusDiv.textContent = 'Error: ' + aiResponse.error;
            }
          });
        } else {
          statusDiv.textContent = 'No text selected or error occurred';
        }
      });
    } catch (error) {
      statusDiv.textContent = 'Error: ' + error.message;
      console.error('Error:', error);
    }
  });
});