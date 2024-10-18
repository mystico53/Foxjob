// popup.js

import Counter from './counter.js';

let statusDiv;
let popupContainer;
let collectedStatusDiv;

document.addEventListener('DOMContentLoaded', initializePopup);

function updateCounter() {
  console.log('updateCounter called');
  Counter.get().then(count => {
    console.log('Retrieved count:', count);
    const counterElement = document.getElementById('counter');
    if (counterElement) {
      console.log('Updating counter element');
      counterElement.textContent = `Today's count: ${count}`;
    } else {
      console.error('Counter element not found');
    }
  }).catch(error => {
    console.error('Error getting counter:', error);
  });
}

function initializePopup() {
  statusDiv = document.getElementById('status');
  popupContainer = document.getElementById('popup-container');
  collectedStatusDiv = document.getElementById('collectedStatus');

  const signInOutButton = document.getElementById('signInOutButton');
  if (signInOutButton) {
    signInOutButton.addEventListener('click', handleSignInOut);
  } else {
    console.error('Sign In/Out button not found');
  }

  // Check initial auth state from storage
  chrome.storage.local.get(['userId', 'userName'], function(result) {
    if (result.userId) {
      console.log('User is signed in');
      updateSignInButtonState(true, result.userName);
      updateStatus('Signed in. Processing text...');

      // Automatically trigger the main action
      injectContentScriptAndProcess();
    } else {
      console.log('User is signed out');
      updateSignInButtonState(false);
      updateStatus('Please sign in to process text');
    }
  });

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Message received:', request);
  if (request.action === 'updateCounter') {
    console.log('Updating counter with new count:', request.count);
    updateCounter();
  }
    
    if (request.action === 'updateStatus') {
      updateStatus(request.message, request.isLoading);
    } else if (request.action === 'authStateChanged') {
      if (request.user) {
        updateSignInButtonState(true, request.user.displayName);
        updateStatus('Signed in. Ready to process text.');
      } else {
        updateSignInButtonState(false);
        updateStatus('Please sign in to process text');
      }
    }
  });

  updateCounter();
}

function handleSignInOut() {
  const button = document.getElementById('signInOutButton');
  if (button.textContent.startsWith('Sign In')) {
    // Initiate sign-in via background.js
    chrome.runtime.sendMessage({ type: 'start-auth' }, (response) => {
      if (response.success) {
        console.log('Authentication initiated');
        updateStatus('Authentication in progress...');
      } else {
        console.error('Authentication initiation failed:', response.error);
        updateStatus('Error: ' + response.error);
      }
    });
  } else {
    // Initiate sign-out via background.js
    chrome.runtime.sendMessage({ type: 'sign-out' }, (response) => {
      if (response.success) {
        console.log('User signed out');
        updateSignInButtonState(false);
        updateStatus('Signed out successfully.');
      } else {
        console.error('Sign-out failed:', response.error);
        updateStatus('Error: ' + response.error);
      }
    });
  }
}

function injectContentScriptAndProcess() {
  chrome.windows.getAll({ windowTypes: ['normal'] }, function(windows) {
    let lastFocusedWindow = windows.find(w => w.focused);

    if (!lastFocusedWindow) {
      // If no window is focused, default to the first one
      lastFocusedWindow = windows[0];
    }

    chrome.tabs.query({ active: true, windowId: lastFocusedWindow.id }, function(tabs) {
      const activeTab = tabs[0];

      if (!activeTab || !activeTab.id || activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://')) {
        console.error('No valid active tab found');
        updateStatus('Error: No valid active tab found');
        return;
      }

      // Proceed with your logic to inject content scripts and process
      chrome.tabs.sendMessage(activeTab.id, { action: "ping" }, function(response) {
        if (chrome.runtime.lastError || !response) {
          // Content script is not injected, inject it now
          chrome.scripting.executeScript(
            {
              target: { tabId: activeTab.id },
              files: ['content.js']
            },
            function() {
              if (chrome.runtime.lastError) {
                updateStatus('Error injecting script: ' + chrome.runtime.lastError.message);
              } else {
                // Add a small delay before processing
                setTimeout(() => selectAllTextAndProcess(activeTab.id), 100);
              }
            }
          );
        } else {
          // Content script is already injected
          selectAllTextAndProcess(activeTab.id);
        }
      });
    });
  });
}

function selectAllTextAndProcess(tabId) {
  updateStatus('Selecting and processing text...', true);

  try {
    chrome.tabs.sendMessage(tabId, { action: "selectAllText" }, async function(response) {
      if (chrome.runtime.lastError) {
        console.error("Runtime error:", chrome.runtime.lastError);
        updateStatus('Error: ' + chrome.runtime.lastError.message);
        return;
      }

      if (response && response.success) {
        // Directly update the status without expecting a message
        updateStatus('Processing completed.');
      } else if (response && response.error) {
        updateStatus('Error: ' + response.error);
        console.error('Processing error:', response.error);
      } else {
        updateStatus('Unexpected response from processing.');
        console.error('Unexpected response:', response);
      }
    });
  } catch (error) {
    console.error("Error sending message:", error);
    updateStatus('Error: Unable to communicate with the page');
  }
}

function checkTabExistsAndProcess(tabId) {
  chrome.tabs.get(tabId, function(tab) {
    if (chrome.runtime.lastError) {
      console.error("Tab does not exist:", chrome.runtime.lastError);
      updateStatus('Error: Tab no longer exists');
    } else {
      selectAllTextAndProcess(tabId);
    }
  });
}

/*
function resizePopup() {
  const contentHeight = popupContainer.scrollHeight;
  const maxHeight = 600; // Maximum height of the popup
  const newHeight = Math.min(contentHeight, maxHeight);
  popupContainer.style.height = `${newHeight}px`;

  // Enable scrolling on popupContainer if the content exceeds maxHeight
  if (contentHeight > maxHeight) {
    popupContainer.style.overflowY = 'auto';
    popupContainer.style.maxHeight = `${maxHeight - 50}px`; // Adjust for other elements
  } else {
    popupContainer.style.overflowY = 'visible';
    popupContainer.style.maxHeight = 'none';
  }
}*/

// These functions are now called from background.js via messages
function updateStatus(message, isLoading = false) {
  if (statusDiv) {
    statusDiv.textContent = message;
    if (isLoading) {
      showSpinner();
    } else {
      hideSpinner();
    }
  } else {
    console.error('Status div not found');
  }
}

function showSpinner() {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) {
    spinner.style.display = 'block';
  } else {
    console.error('Loading spinner not found');
  }
}

function hideSpinner() {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) {
    spinner.style.display = 'none';
  } else {
    console.error('Loading spinner not found');
  }
}

function updateSignInButtonState(isSignedIn, displayName = '') {
  const button = document.getElementById('signInOutButton');
  if (button) {
    if (isSignedIn) {
      button.textContent = `Sign Out (${displayName})`;
      button.title = `Signed in as ${displayName}`;
    } else {
      button.textContent = 'Sign In';
      button.title = '';
    }
  } else {
    console.error('Sign In/Out button not found');
  }
}

function logCurrentUserId() {
  chrome.storage.local.get(['userId'], function(result) {
    const userId = result.userId;
    if (userId) {
      console.log('Current user Google ID:', userId);
    } else {
      console.log('No user is currently signed in');
    }
  });
}
