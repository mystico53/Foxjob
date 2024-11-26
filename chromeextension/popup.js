// popup.js

import Counter from './counter.js';

let statusDiv;
let popupContainer;
let collectedStatusDiv;
let libraryButton;
let giphyContainer;
let signInView;
let mainAppView;

document.addEventListener('DOMContentLoaded', initializePopup);

document.addEventListener('DOMContentLoaded', initializePopup);

function updateCounter() {
  console.log('updateCounter called');
  Counter.get().then(count => {
    console.log('Retrieved count:', count);
    const counterElement = document.getElementById('counterNumber');
    if (counterElement) {
      console.log('Updating counter element');
      counterElement.textContent = `${count}`;
    } else {
      console.error('Counter element not found');
    }
  }).catch(error => {
    console.error('Error getting counter:', error);
  });
}

function initializePopup() {
  // Get all DOM elements
  statusDiv = document.getElementById('status');
  popupContainer = document.getElementById('popup-container');
  collectedStatusDiv = document.getElementById('collectedStatus');
  libraryButton = document.getElementById('libraryButton');
  giphyContainer = document.querySelector('.giphy-container');
  signInView = document.getElementById('signInView');
  mainAppView = document.getElementById('mainAppView');

  // Initialize library button
  if (libraryButton) {
    libraryButton.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://jobille-45494.web.app/' });
    });
  }

  // Initialize scan button
  const scanButton = document.getElementById('scanButton');
  if (scanButton) {
    scanButton.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://jobille-45494.web.app/' });
    });
  }

  // Initialize sign in/out buttons
  const signInButton = document.getElementById('signInButton');
  const signInOutButton = document.getElementById('signInOutButton');
  
  if (signInButton) {
      signInButton.addEventListener('click', handleSignIn);
  }
  if (signInOutButton) {
      signInOutButton.addEventListener('click', handleSignOut);
  }

  // Check initial auth state - only need to do this once
  chrome.storage.local.get(['userId', 'userName'], function(result) {
      if (result.userId) {
          console.log('User is signed in');
          showSignedInState(result.userName);
          injectContentScriptAndProcess();
      } else {
          console.log('User is signed out');
          showSignedOutState();
      }
  });

  // Set up message listeners
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      console.log('Message received:', request);
      if (request.action === 'updateCounter') {
          updateCounter();
      } else if (request.action === 'updateStatus') {
          updateStatus(request.message, request.isLoading);
      } else if (request.action === 'authStateChanged') {
          if (request.user) {
              showSignedInState(request.user.displayName);
          } else {
              showSignedOutState();
          }
      }
  });

  updateCounter();
}

// New functions to handle Giphy visibility
function showGiphy() {
  if (giphyContainer) {
    giphyContainer.classList.add('visible');
  }
}

function hideGiphy() {
  if (giphyContainer) {
    giphyContainer.classList.remove('visible');
  }
}

function showSignedInState(userName) {
  signInView.classList.remove('active');
  mainAppView.classList.add('active');
  
  const counterColumn = document.getElementById('counterColumn');
  const contentColumn = document.getElementById('contentColumn');
  
  counterColumn.classList.add('logged-in');
  contentColumn.classList.add('with-counter');
  
  const signInOutButton = document.getElementById('signInOutButton');
  if (signInOutButton) {
      signInOutButton.textContent = `Sign Out`;
      signInOutButton.title = `Signed in`;
  }
  
  updateStatus('Ready to process text');
  
  hideGiphy();
}

function showSignedOutState() {
  signInView.classList.add('active');
  mainAppView.classList.remove('active');
  
  const counterColumn = document.getElementById('counterColumn');
  const contentColumn = document.getElementById('contentColumn');
  
  counterColumn.classList.remove('logged-in');
  contentColumn.classList.remove('with-counter');
  
  const signInOutButton = document.getElementById('signInOutButton');
  if (signInOutButton) {
      signInOutButton.textContent = 'Sign In';
      signInOutButton.title = '';
  }
  
  updateStatus('Please sign in to process text');
  
  hideGiphy();
}

function handleSignIn() {
  chrome.runtime.sendMessage({ type: 'start-auth' }, (response) => {
      if (response.success) {
          console.log('Authentication initiated');
          updateStatus('Authentication in progress...');
      } else {
          console.error('Authentication initiation failed:', response.error);
          updateStatus('Error: ' + response.error);
      }
  });
}

function handleSignOut() {
  chrome.runtime.sendMessage({ type: 'sign-out' }, (response) => {
      if (response.success) {
          console.log('User signed out');
          showSignedOutState();
      } else {
          console.error('Sign-out failed:', response.error);
          updateStatus('Error: ' + response.error);
      }
  });
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
  updateStatus('Processing text...', true);
  hideGiphy();

  try {
    chrome.tabs.sendMessage(tabId, { action: "selectAllText" }, async function(response) {
      if (chrome.runtime.lastError) {
        console.error("Runtime error:", chrome.runtime.lastError);
        updateStatus('Error: ' + chrome.runtime.lastError.message);
        hideGiphy();
        return;
      }

      if (response && response.success) {
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
          // Immediately set to 100% without animation
          progressBar.style.transition = 'none';
          progressBar.style.width = '100%';
        }
        if (statusDiv) {
          statusDiv.textContent = 'Ready For Next Scan';
          showGiphy();
        }
      } else if (response && response.error) {
        updateStatus('Error: ' + response.error);
        console.error('Processing error:', response.error);
        hideGiphy();
      } else {
        updateStatus('Unexpected response from processing.');
        console.error('Unexpected response:', response);
        hideGiphy();
      }
    });
  } catch (error) {
    console.error("Error sending message:", error);
    updateStatus('Error: Unable to communicate with the page');
    hideGiphy();
  }
}

function startProgress() {
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.transition = 'width 1500ms linear';
    progressBar.style.width = '0%';
    // Force a reflow
    progressBar.offsetHeight;
    progressBar.style.width = '100%';
  } else {
    console.error('Progress bar not found');
  }
}

function resetProgress() {
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.transition = 'none';
    progressBar.style.width = '0%';
  } else {
    console.error('Progress bar not found');
  }
}

// Updated updateStatus function
function updateStatus(message, isLoading = false) {
  if (statusDiv) {
    statusDiv.textContent = message;
    if (isLoading && message !== 'Completed') {
      startProgress();
      hideGiphy(); // Hide Giphy when loading starts
    } else if (message === 'Completed') {
      resetProgress();
      showGiphy(); // Show Giphy when completed
    } else {
      resetProgress();
      hideGiphy(); // Hide Giphy for other status messages
    }
  } else {
    console.error('Status div not found');
  }
}