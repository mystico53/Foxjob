document.addEventListener('DOMContentLoaded', function() {
  const sendButton = document.getElementById('sendButton');
  const statusDiv = document.getElementById('status');

  if (!sendButton || !statusDiv) {
    console.error('Required DOM elements not found');
    return;
  }

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
          statusDiv.textContent = 'Text sent to console';
          console.log('Selected text:', response.text);
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