// background.js

// Import the instructions and config scripts if still needed
importScripts('instructions.js');
importScripts('config.js');

console.log('Background script loaded');

// Constants for Offscreen Document Management
const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html'; // Ensure this path is correct
let creatingOffscreenDocument; // Global promise to manage offscreen document creation

// Helper function to check if the offscreen document is already active
async function hasDocument() {
  const matchedClients = await clients.matchAll();
  return matchedClients.some(
    (c) => c.url === chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)
  );
}

// Function to set up the offscreen document
async function setupOffscreenDocument(path) {
  console.log('setupOffscreenDocument called with path:', path);
  if (!(await hasDocument())) {
    console.log('No offscreen document found. Proceeding to create one.');
    if (creatingOffscreenDocument) {
      console.log('Offscreen document is already being created. Awaiting...');
      await creatingOffscreenDocument;
    } else {
      console.log('Creating offscreen document now.');
      try {
        creatingOffscreenDocument = chrome.offscreen.createDocument({
          url: path,
          reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
          justification: 'authentication'
        });
        
        // Wait until the document is fully created
        await creatingOffscreenDocument;
        console.log('Offscreen document created successfully.');
      } catch (error) {
        console.error('Error creating offscreen document:', error);
        throw error;
      } finally {
        creatingOffscreenDocument = null;
      }
    }
  } else {
    console.log('Offscreen document already exists.');
  }
}



async function closeOffscreenDocument() {
  if (!(await hasDocument())) {
    return;
  }
  await chrome.offscreen.closeDocument();
}

// Function to request authentication
function getAuth() {
  console.log('getAuth: Function called');
  return new Promise(async (resolve, reject) => {
    console.log('getAuth: Promise executor started');
    try {
      console.log('getAuth: Sending firebase-auth message');
      const auth = await chrome.runtime.sendMessage({
        type: 'firebase-auth',
        target: 'offscreen'
      });
      console.log('getAuth: Received response:', auth);

      if (auth?.name !== 'FirebaseError') {
        console.log('getAuth: Authentication successful, resolving promise');
        resolve(auth);
      } else {
        console.warn('getAuth: Received FirebaseError, rejecting promise');
        reject(auth);
      }
    } catch (error) {
      console.error('getAuth: Error occurred during authentication', error);
      reject(error);
    }
  }).then(result => {
    console.log('getAuth: Promise resolved successfully');
    return result;
  }).catch(error => {
    console.error('getAuth: Promise rejected', error);
    throw error;
  });
}
async function firebaseAuth() {
  await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);

  const auth = await getAuth()
    .then((auth) => {
      console.log('User Authenticated', auth);
      return auth;
    })
    .catch(err => {
      if (err.code === 'auth/operation-not-allowed') {
        console.error('You must enable an OAuth provider in the Firebase' +
                      ' console in order to use signInWithPopup. This sample' +
                      ' uses Google by default.');
      } else {
        console.error(err);
        return err;
      }
    })
    .finally(closeOffscreenDocument)

  return auth;
}

// Function to handle Sign-Out
async function firebaseSignOut() {
  // Since Firebase is handled via the offscreen document, implement sign-out logic accordingly
  // This might involve sending a sign-out message to the offscreen document if implemented
  // For simplicity, we'll clear the stored user information

  chrome.storage.local.remove(['userId', 'userName'], () => {
    console.log('User information removed from storage');

    // Notify the popup of the auth state change
    chrome.runtime.sendMessage({ action: 'authStateChanged', user: null, userName: null });
  });

  return { success: true };
}

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

  // Handle authentication messages based on 'type' and 'target'
  if (request.type === 'firebase-auth' && request.target === 'offscreen') {
    // Handle authentication requests
    firebaseAuth().then(auth => {
      // Authentication successful
      sendResponse({ success: true, uid: auth.uid, displayName: auth.displayName });
    }).catch(error => {
      // Authentication failed
      sendResponse({ success: false, error: error });
    });
    return true; // Indicates that sendResponse will be called asynchronously
  }

  // Handle authentication results
  if (request.type === 'firebase-auth-result') {
    if (request.user) {
      console.log('Received authenticated user:', request.user);
      // Optionally, perform additional actions with the authenticated user
    } else if (request.error) {
      console.error('Received authentication error:', request.error);
      // Optionally, notify the user or take corrective actions
    }
    return false; // No response needed
  }

  // Handle Sign-Out Messages
  if (request.type === 'sign-out') {
    firebaseSignOut().then(response => {
      sendResponse(response);
    }).catch(error => {
      sendResponse({ success: false, error: error });
    });
    return true; // Indicates that sendResponse will be called asynchronously
  }

  // Handle Start Authentication
  if (request.type === 'start-auth') {
    firebaseAuth().then(response => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Indicates that sendResponse will be called asynchronously
  }

  // Existing action-based message handling
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
