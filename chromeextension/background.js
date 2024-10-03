// background.js

// Import the instructions and config scripts if still needed
importScripts('instructions.js');
importScripts('config.js');

console.log('Background script loaded');

// Function to send data to Pub/Sub
async function sendToPubSub(text, url, googleId) {
  console.log('sendToPubSub called with:', { textLength: text.length, url, googleId });

  // Remove the emulator check
  // FIREBASE_CONFIG.useEmulator = await isEmulatorRunning();
  const targetUrl = getTargetUrl();
  
  console.log(`Using ${FIREBASE_CONFIG.useEmulator ? 'emulator' : 'production'} endpoint:`, targetUrl);

   const apiBody = {
    message: {
      text: text,
      url: url,
      googleId: googleId,
      instructions: anthropicInstructions
    }
  };

  console.log('Prepared API body:', { textLength: apiBody.message.text.length, url: apiBody.message.url, googleId: apiBody.message.googleId });

  try {
    console.log('Sending request to Pub/Sub function');
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apiBody)
    });
  
    console.log('Received response from Pub/Sub function');
    
    const responseText = await response.text();
    console.log('Raw Response:', responseText);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('Parsed JSON Response:', responseData);
    } catch (jsonError) {
      throw new Error(`Invalid JSON response: ${jsonError.message}`);
    }
  
    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}: ${responseData.error || responseData.message}`);
    }
  
    // Send a simple status update to the popup
    chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Processing completed.', isLoading: false });
  
    return { success: true };
  } catch (error) {
    console.error('Error calling Pub/Sub function:', error);
    chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Error: ' + error.message, isLoading: false });
    return { success: false, error: error.message };
  }
}

// Function to inject the content script
function injectContentScript(tabId) {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      files: ['content.js']
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error('Error injecting script:', chrome.runtime.lastError.message);
      } else {
        console.log('Content script successfully injected');
      }
    }
  );
}

// Set up a listener for messages sent to the extension
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Background script received message:', request);

  switch (request.action) {
    case "publishText":
      console.log('Handling publishText action');
      chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Sending text to Pub/Sub...', isLoading: true });

      chrome.storage.local.get(['userId'], function(result) {
        const googleId = result.userId || 'anonymous';
        if (!googleId) {
          console.error('No Google ID found');
          chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Error: User not signed in', isLoading: false});
          sendResponse({ success: false, error: 'User not signed in' });
          return;
        }

        // Send text to Pub/Sub with Google ID and URL
        sendToPubSub(request.text, request.url, googleId)
          .then(data => {
            if (data.success) {
              console.log('Successfully sent to Pub/Sub, sending status update');
              // No need to send a detailed response
              sendResponse({ success: true });
            } else {
              console.error('Pub/Sub function returned an error:', data.error);
              chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Error: ' + data.error, isLoading: false});
              sendResponse({ success: false, error: data.error });
            }
          })
          .catch(error => {
            console.error('Error in sendToPubSub:', error);
            chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Error: ' + error.message, isLoading: false});
            sendResponse({ success: false, error: error.message });
          });
      });
      return true; // Indicates that sendResponse will be called asynchronously

    case "statusUpdate":
      // **Forward status updates to the popup script**
      chrome.runtime.sendMessage({ action: 'updateStatus', message: request.message, isLoading: request.isLoading });
      break;

    case "contentScriptReady":
      console.log("Content script is ready");
      // You can add initialization logic here if needed
      break;

    case "triggerMainAction":
      // This action is triggered when the user uses the keyboard shortcut or clicks the extension
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const activeTab = tabs[0];
        if (activeTab && activeTab.id) {
          injectContentScript(activeTab.id);
          // Optionally, send a message to the content script to start processing immediately
          // setTimeout(() => selectAllTextAndProcess(activeTab.id), 100);
        } else {
          console.error('No active tab found');
          chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Error: No active tab found', isLoading: false });
        }
      });
      break;

    default:
      console.log('Unhandled action:', request.action);
      sendResponse({ success: false, error: "Unhandled action" });
      return false; // Indicates that we're not sending a response asynchronously
  }
});

// Listener for keyboard commands
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-feature") {
    console.log("Keyboard shortcut Alt+S was pressed");
    
    // Open the Popup and send a message to trigger the main action
    chrome.action.openPopup(() => {
      // After opening the popup, send a message to start the main action
      chrome.runtime.sendMessage({ action: "triggerMainAction" });
    });
  }
});

console.log('Background script setup complete');
