// background.js
import { anthropicInstructions } from './instructions.js';
import { 
  getServiceUrl, 
  updateExtensionIcon, 
  getEnvironmentName,
  getFirebaseConfig
} from './config.js';
import Counter from './counter.js';
import RateLimit from './rateLimit.js';

// Debug logger
const debugLog = (step, data) => {
  console.log(`🔐 Auth Debug [${step}]:`, data);
};

// Initialize
updateExtensionIcon().catch(error => {
  console.error('Failed to update extension icon:', error);
});

Counter.resetAtMidnight();

// Get Firebase configuration
const firebaseConfig = getFirebaseConfig();
debugLog('Firebase Config', {
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId
});

// OAuth configuration using Firebase settings
const AUTH_CONFIG = {
  client_id: firebaseConfig.apiKey,
  scopes: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ]
};

// Authentication function using Chrome Identity API with Firebase
async function authenticate() {
  try {
    debugLog('Start Auth', 'Beginning authentication flow');

    // Get OAuth token
    debugLog('Token Request', {
      interactive: true,
      scopes: AUTH_CONFIG.scopes
    });

    const token = await chrome.identity.getAuthToken({ 
      interactive: true,
      scopes: AUTH_CONFIG.scopes 
    });

    debugLog('Token Received', {
      tokenExists: !!token,
      tokenType: typeof token,
      token: token ? `${token.token.substring(0, 10)}...` : null
    });

    // Get user info
    debugLog('User Info Request', 'Fetching user info from Google');
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        'Authorization': `Bearer ${token.token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    const userInfo = await response.json();
    debugLog('User Info Received', {
      sub: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      verified_email: userInfo.email_verified
    });

    // Store auth data
    const userData = {
      userId: userInfo.sub,
      userName: userInfo.name,
      userEmail: userInfo.email,
      accessToken: token.token,
      authTime: new Date().toISOString()
    };

    debugLog('Storing User Data', {
      ...userData,
      accessToken: '***hidden***'
    });

    await chrome.storage.local.set(userData);

    // Broadcast auth state change
    const authState = {
      action: 'authStateChanged',
      user: {
        uid: userInfo.sub,
        displayName: userInfo.name,
        email: userInfo.email
      }
    };

    debugLog('Broadcasting Auth State', authState);
    chrome.runtime.sendMessage(authState);

    return userInfo;
  } catch (error) {
    debugLog('Auth Error', {
      message: error.message,
      stack: error.stack
    });

    chrome.runtime.sendMessage({
      action: 'authStateChanged',
      user: null,
      error: error.message
    });
    throw error;
  }
}

// Sign out function
async function signOut() {
  try {
    debugLog('Sign Out', 'Starting sign out process');

    const { accessToken } = await chrome.storage.local.get('accessToken');
    debugLog('Token Retrieval', { hasToken: !!accessToken });

    if (accessToken) {
      debugLog('Removing Token', 'Removing cached auth token');
      await chrome.identity.removeCachedAuthToken({ token: accessToken });
    }

    debugLog('Clearing Storage', 'Removing user data from storage');
    await chrome.storage.local.remove([
      'userId', 
      'userName', 
      'userEmail', 
      'accessToken',
      'authTime'
    ]);

    debugLog('Broadcasting', 'Sending sign out notification');
    chrome.runtime.sendMessage({ 
      action: 'authStateChanged', 
      user: null 
    });

    return { success: true };
  } catch (error) {
    debugLog('Sign Out Error', {
      message: error.message,
      stack: error.stack
    });
    return { success: false, error: error.message };
  }
}

// Rest of your existing code remains the same...
async function sendToPubSub(text, url, googleId) {
  let targetUrl;
  try {
    targetUrl = getServiceUrl('publishJob');
    const environment = getEnvironmentName();
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

function incrementCounter() {
  Counter.increment().then(newCount => {
    chrome.runtime.sendMessage({ action: 'updateCounter', count: newCount });
  }).catch(error => {
    console.error('Error incrementing counter:', error);
  });
}

async function handlePublishText(request, sender, sendResponse) {
  // Check rate limit first with the new response format
  const rateLimit = await RateLimit.checkAndTrack();
  if (!rateLimit.allowed) {
    console.warn(`Only three jobs/minute during testing. Come back in ${rateLimit.waitTime} sec!`);
    sendResponse({ 
      success: false, 
      error: `Only three jobs/minute during testing. Come back in ${rateLimit.waitTime} sec!`
    });
    
    // Update UI with rate limit message
    chrome.runtime.sendMessage({ 
      action: 'updateStatus', 
      message: `Only three jobs/minute during testing. Come back in ${rateLimit.waitTime} sec!`, 
      isLoading: false
    });
    return;
  }

  chrome.storage.local.get(['userId'], function(result) {
    const googleId = result.userId || 'anonymous';
    if (!googleId) {
      console.error('No Google ID found');
      chrome.runtime.sendMessage({ 
        action: 'updateStatus', 
        message: 'Error: User not signed in', 
        isLoading: false
      });
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
          chrome.runtime.sendMessage({ 
            action: 'updateStatus', 
            message: 'Error: ' + data.error, 
            isLoading: false
          });
          sendResponse({ success: false, error: data.error });
        }
      })
      .catch(error => {
        console.error('Error in sendToPubSub:', error);
        chrome.runtime.sendMessage({ 
          action: 'updateStatus', 
          message: 'Error: ' + error.message, 
          isLoading: false
        });
        sendResponse({ success: false, error: error.message });
      });
  });
  return true; // Keep message channel open for async response
}

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  debugLog('Message Received', { 
    type: request.type, 
    action: request.action 
  });

  // Handle authentication actions
  switch (request.type) {
    case 'start-auth':
      authenticate()
        .then(() => {
          debugLog('Auth Success', 'Authentication completed');
          sendResponse({ success: true });
        })
        .catch(error => {
          debugLog('Auth Failure', error.message);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'sign-out':
      signOut()
        .then(response => {
          debugLog('Sign Out Complete', response);
          sendResponse(response);
        })
        .catch(error => {
          debugLog('Sign Out Error', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'check-auth':
      chrome.storage.local.get(['userId', 'accessToken', 'authTime'], result => {
        const authStatus = {
          isAuthenticated: !!(result.userId && result.accessToken),
          lastAuthTime: result.authTime
        };
        debugLog('Auth Check', authStatus);
        sendResponse(authStatus);
      });
      return true;
  }

  // Handle non-auth actions
  switch (request.action) {
    case "publishText":
      handlePublishText(request, sender, sendResponse);
      return true; // Keep channel open for async response
  
    case "statusUpdate":
      chrome.runtime.sendMessage({ 
        action: 'updateStatus', 
        message: request.message, 
        isLoading: request.isLoading 
      });
      break;
  
    case "contentScriptReady":
      break;
  
    case "triggerScan":
      console.log("Triggering scan from command");
      chrome.runtime.sendMessage({ action: "triggerScan" });
      break;
  
    default:
      console.log('Unhandled action:', request.action);
      sendResponse({ success: false, error: "Unhandled action" });
  }

  return false;
});

// Your existing command and external message handlers remain the same...
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-feature") {
    chrome.action.openPopup();
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: "triggerScan" });
    }, 300);
  }
});

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.message === "version") {
    sendResponse({ version: chrome.runtime.getManifest().version });
  }
  return true;
});