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

async function setupOffscreenDocument(path) {

  if (!(await hasDocument())) {
    console.log('No offscreen document found. Proceeding to create one.');
    if (creatingOffscreenDocument) {

      await creatingOffscreenDocument;
    } else {

      try {
        creatingOffscreenDocument = chrome.offscreen.createDocument({
          url: path,
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

function getAuth() {

  return new Promise(async (resolve, reject) => {

    try {

      const auth = await chrome.runtime.sendMessage({
        type: 'firebase-auth',
        target: 'offscreen'
      });

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
    })
    .catch(err => {
      console.error(err);
      return err;
    })
    .finally(closeOffscreenDocument);

  return auth;
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
    console.log(`Using ${environment} endpoint:`, targetUrl);
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
    chrome.action.openPopup();
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
