// background.js

// Import the instructions and config scripts
importScripts('instructions.js');
importScripts('config.js');

console.log('Background script loaded');

// Modified sendTextToFirebase function to include googleId and url
async function sendTextToFirebase(text, url, googleId) {
  console.log('sendTextToFirebase called with:', { textLength: text.length, url, googleId });

  // Check if emulator is running and update config
  FIREBASE_CONFIG.useEmulator = await isEmulatorRunning();
  const targetUrl = FIREBASE_CONFIG.useEmulator ? FIREBASE_CONFIG.emulatorUrl : FIREBASE_CONFIG.productionUrl;
  
  console.log(`Using ${FIREBASE_CONFIG.useEmulator ? 'emulator' : 'production'} endpoint:`, targetUrl);

  const apiBody = {
    text: text,
    url: url,
    googleId: googleId,
    instructions: anthropicInstructions
  };

  console.log('Prepared API body:', { textLength: apiBody.text.length, url: apiBody.url, googleId: apiBody.googleId });

  chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Processing text...', isLoading: true });
  chrome.runtime.sendMessage({ action: 'textCollected' });

  try {
    console.log('Sending request to Firebase function');
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apiBody)
    });
    
    console.log('Received response from Firebase function');
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    console.log('Firebase Function Response:', data);

    if (data.error) {
      // Handle error returned from Firebase function
      return { success: false, error: data.error };
    }

    // Assuming the successful response contains a 'result' object
    return { success: true, result: data.result };
  } catch (error) {
    console.error('Error calling Firebase function:', error);
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
    case "sendTextToFirebase":
      console.log('Handling sendTextToFirebase action');
      chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Sending text to Firebase...', isLoading: true  });

      chrome.storage.local.get(['userId'], function(result) {
        const googleId = result.userId || 'anonymous';
        if (!googleId) {
          console.error('No Google ID found');
          chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Error: User not signed in', isLoading: false});
          sendResponse({ success: false, error: 'User not signed in' });
          return;
        }

        // Send text to Firebase with Google ID and URL
        sendTextToFirebase(request.text, request.url, googleId)
          .then(data => {
            if (data.success) {
              console.log('Successfully sent to Firebase, sending response');
              chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Processing completed.', isLoading: false });
              sendResponse({ success: true, result: data.result });
            } else {
              console.error('Firebase function returned an error:', data.error);
              chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Error: ' + data.error, isLoading: false});
              sendResponse({ success: false, error: data.error });
            }
          })
          .catch(error => {
            console.error('Error in sendTextToFirebase:', error);
            chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Error: ' + error.message, isLoading: false});
            sendResponse({ success: false, error: error.message });
          });
      });
      return true; // Keep the message channel open for sendResponse

    case "statusUpdate":
      // **Forward status updates to the popup script**
      chrome.runtime.sendMessage({ action: 'updateStatus', message: request.message });
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
