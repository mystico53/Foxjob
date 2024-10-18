// background.js

console.log('Background script loaded with new debug - version 1');

import { anthropicInstructions } from './instructions.js';
import { FIREBASE_CONFIG, getTargetUrl } from './config.js';
import Counter from './counter.js';

console.log('Background script loaded');

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
      chrome.storage.local.set({
        userId: auth.user.uid,
        userName: auth.user.displayName,
        userEmail: auth.user.email
      }, function() {
        console.log('User data stored in chrome.storage.local');
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
    console.log('User information removed from storage');
    chrome.runtime.sendMessage({ action: 'authStateChanged', user: null, userName: null });
  });

  return { success: true };
}

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

function incrementCounter(){
  console.log('Calling Counter.increment()');
      Counter.increment().then(newCount => {
        console.log('Counter incremented, new count:', newCount);
        chrome.runtime.sendMessage({ action: 'updateCounter', count: newCount });
      }).catch(error => {
        console.error('Error incrementing counter:', error);
      });
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Background script received message:', request);

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
      console.log('Handling publishText action from tab:', sender.tab.id);
      chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Sending text to Pub/Sub...', isLoading: true });

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

    default:
      console.log('Unhandled action:', request.action);
      sendResponse({ success: false, error: "Unhandled action" });
      return false; // Indicates that we're not sending a response asynchronously
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-feature") {
    console.log("Keyboard shortcut Alt+S was pressed");
    chrome.action.openPopup();
  }
});

console.log('Background script setup complete');
