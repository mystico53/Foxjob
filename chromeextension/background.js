// background.js
import { anthropicInstructions } from './instructions.js';
import { 
  getServiceUrl, 
  updateExtensionIcon, 
  USE_EMULATOR,
  getEnvironmentName,
  getCurrentEnvironment 
} from './config.js';
import Counter from './counter.js';
import RateLimit from './rateLimit.js';

updateExtensionIcon().catch(error => {
  console.error('Failed to update extension icon:', error);
});

Counter.resetAtMidnight();

const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';
let creatingOffscreenDocument;

async function hasDocument() {
  const matchedClients = await clients.matchAll();
  return matchedClients.some(
    (c) => c.url === chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)
  );
}

async function closeExistingDocument() {
  try {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    
    if (existingContexts.length > 0) {
      await chrome.offscreen.closeDocument();
    }
  } catch (error) {
    console.error('Error closing existing document:', error);
  }
}

async function setupOffscreenDocument(path, authUrl) {
  // First, ensure any existing document is closed
  await closeExistingDocument();
  
  try {
    creatingOffscreenDocument = chrome.offscreen.createDocument({
      url: `${path}?authUrl=${encodeURIComponent(authUrl)}`,
      reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
      justification: 'authentication'
    });
    await creatingOffscreenDocument;
  } catch (error) {
    console.error('Error creating offscreen document:', error);
    throw error;
  } finally {
    creatingOffscreenDocument = null;
  }
}

// Modify closeOffscreenDocument to be more robust
async function closeOffscreenDocument() {
  try {
    await closeExistingDocument();
  } catch (error) {
    console.error('Error in closeOffscreenDocument:', error);
  }
}


// In background.js
function getAuth() {
  return new Promise(async (resolve, reject) => {
    try {
      const auth = await chrome.runtime.sendMessage({
        type: 'firebase-auth',
        target: 'offscreen'
      });

      if (auth?.name !== 'FirebaseError') {
        resolve(auth);
      } else {
        console.error('Firebase authentication error:', auth);
        reject(auth);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      reject(error);
    }
  });
}

// In background.js, modify firebaseAuth:
async function firebaseAuth() {
  const authUrl = getServiceUrl('authSignin');
  
  try {
    await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH, authUrl);
    const auth = await getAuth();
    
    if (auth && auth.error) {
      console.error("Authentication error:", auth.error.message);
      throw new Error(auth.error.message || 'Authentication failed');
    }
    
    if (!auth || !auth.user) {
      console.error("Invalid auth response - no user data received");
      throw new Error('Authentication failed - no user data received');
    }
    
    chrome.storage.local.set({
      userId: auth.user.uid,
      userName: auth.user.displayName,
      userEmail: auth.user.email
    }, function() {
      chrome.runtime.sendMessage({
        action: 'authStateChanged',
        user: auth.user,
        userName: auth.user.displayName
      });
    });

    return auth;
  } catch (err) {
    console.error('Authentication error:', err.message);
    chrome.runtime.sendMessage({
      action: 'authStateChanged',
      user: null,
      error: err.message
    });
    throw err;
  } finally {
    await closeOffscreenDocument();
  }
}

async function firebaseSignOut() {
  chrome.storage.local.remove(['userId', 'userName'], () => {

    chrome.runtime.sendMessage({ action: 'authStateChanged', user: null, userName: null });
  });

  return { success: true };
}

async function sendToPubSub(text, url, googleId) {
  let targetUrl;
  try {
    targetUrl = getServiceUrl('publishJob');
    const environment = USE_EMULATOR ? 'emulator' : getEnvironmentName();
    console.log(`Using ${environment} endpoint`);
  } catch (error) {
    console.error('Failed to determine target URL:', error);
    chrome.runtime.sendMessage({ 
      action: 'updateStatus', 
      message: 'Error: Failed to determine target URL', 
      isLoading: false 
    });
    return { success: false, error: 'Failed to determine target URL' };
  }

  const apiBody = {
    message: {
      text: text,
      url: url,
      googleId: googleId,
      instructions: anthropicInstructions
    }
  };

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apiBody)
    });

    const responseText = await response.text();

    let responseData;
    try {
      responseData = JSON.parse(responseText);

    } catch (jsonError) {
      console.error('Failed to parse JSON response:', jsonError);
      throw new Error(`Invalid JSON response: ${jsonError.message}`);
    }

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}: ${responseData.error || responseData.message}`);
    }

    console.log('Request succeeded:', responseData);
    return { success: true, data: responseData };
  } catch (error) {
    console.error('Error calling Pub/Sub function:', error);
    chrome.runtime.sendMessage({ 
      action: 'updateStatus', 
      message: 'Error: ' + error.message, 
      isLoading: false 
    });
    return { success: false, error: error.message };
  }
}


function incrementCounter(){
  
      Counter.increment().then(newCount => {
        chrome.runtime.sendMessage({ action: 'updateCounter', count: newCount });
      }).catch(error => {
        console.error('Error incrementing counter:', error);
      });
}

async function handlePublishText(request, sender, sendResponse) {
  // Check rate limit first
  const canProceed = await RateLimit.checkAndTrack();
  if (!canProceed) {
    console.error('Rate limit reached: Maximum 3 actions per minute allowed');
    sendResponse({ success: false, error: 'Rate limit reached: Please wait before trying again' });
    return;
  }

  chrome.storage.local.get(['userId'], function(result) {
    const googleId = result.userId || 'anonymous';
    if (!googleId) {
      console.error('No Google ID found');
      chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Error: User not signed in', isLoading: false});
      sendResponse({ success: false, error: 'User not signed in' });
      return;
    }

    incrementCounter();

    // Send text to Pub/Sub with Google ID and URL
    sendToPubSub(request.text, request.url, googleId)
      .then(data => {
        if (data.success) {

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
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.target === 'offscreen') {
    // Do not handle messages intended for the offscreen document
    return;
  }

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
    if (request.action === "publishText") {
      handlePublishText(request, sender, sendResponse);
      return true; // Keep the message channel open for async response
    }

    case "statusUpdate":
      // **Forward status updates to the popup script**
      chrome.runtime.sendMessage({ action: 'updateStatus', message: request.message, isLoading: request.isLoading });
      break;

    case "contentScriptReady":
      break;

    default:
      console.log('Unhandled action:', request.action);
      sendResponse({ success: false, error: "Unhandled action" });
      return false; // Indicates that we're not sending a response asynchronously
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-feature") {
    // First open the popup
    chrome.action.openPopup();
    
    // Wait a brief moment for the popup to initialize
    setTimeout(() => {
      // Send a message to trigger the main action
      chrome.runtime.sendMessage({ action: "triggerScan" });
    }, 300); // Adjust timeout as needed
  }
});

chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {
      if (request.message === "version") {
          sendResponse({ version: chrome.runtime.getManifest().version });
      }
      return true;  // Important: keeps the message channel open for async response
  }
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'debug-log') {
    console.log('Offscreen Debug:', message.message, message.data);
  }
});
