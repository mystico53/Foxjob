// popup.js

import Counter from './counter.js';
import { getServiceUrl } from './extension-config.js';

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
  Counter.get().then(count => {
    const counterElement = document.getElementById('counterNumber');
    if (counterElement) {
      
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
      const libraryUrl = getServiceUrl('library');
      chrome.tabs.create({ url: libraryUrl });
    });
  }

  // Initialize scan button
  const scanButton = document.getElementById('scanButton');
  if (scanButton) {
    scanButton.addEventListener('click', () => {
      injectContentScriptAndProcess();
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
      } else {
          console.log('User is signed out');
          showSignedOutState();
      }
  });

  // Set up message listeners
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
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
  // Using chrome.tabs.query with activeTab permission
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const activeTab = tabs[0];
    
    if (!activeTab || !activeTab.id) {
      console.error('No active tab found');
      updateStatus('Error: No active tab found');
      return;
    }

    // With activeTab, we should focus on the scripting permission instead of URL checking
    chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: () => {
        // This runs in the context of the page
        return { url: window.location.href };
      }
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        updateStatus('Cannot access this page');
        return;
      }

      const result = results?.[0]?.result;
      if (!result?.url) {
        updateStatus('Cannot access page URL');
        return;
      }

      // Now proceed with your content script injection
      chrome.tabs.sendMessage(activeTab.id, { action: "ping" }, function(response) {
        if (chrome.runtime.lastError || !response) {
          // Inject content script
          chrome.scripting.executeScript(
            {
              target: { tabId: activeTab.id },
              files: ['content.js']
            },
            function() {
              if (chrome.runtime.lastError) {
                updateStatus('Error injecting script: ' + chrome.runtime.lastError.message);
              } else {
                setTimeout(() => selectAllTextAndProcess(activeTab.id), 100);
              }
            }
          );
        } else {
          selectAllTextAndProcess(activeTab.id);
        }
      });
    });
  });
}

function selectAllTextAndProcess(tabId) {
  // Start with clean state
  hideGiphy();
  
  // First reset the progress bar with no transition
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.transition = 'none';
    progressBar.style.width = '0%';
    progressBar.offsetHeight; // Force reflow
    
    // Start new animation in the next frame
    requestAnimationFrame(() => {
      progressBar.style.transition = 'width 1500ms linear';
      progressBar.style.width = '100%';
    });
  }
  
  statusDiv.textContent = 'Processing text...';

  try {
    chrome.tabs.sendMessage(tabId, { action: "selectAllText" }, async function(response) {
      if (chrome.runtime.lastError) {
        console.error("Runtime error:", chrome.runtime.lastError);
        statusDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
        hideGiphy();
        resetProgress();
        return;
      }

      if (response && response.success) {
        if (progressBar) {
          // Complete the progress immediately
          progressBar.style.transition = 'none';
          progressBar.style.width = '100%';
        }
        statusDiv.textContent = 'Ready For Next Scan';
        showGiphy();
      } else if (response && response.error) {
        statusDiv.textContent = 'Error: ' + response.error;
        console.error('Processing error:', response.error);
        hideGiphy();
        resetProgress();
      } else {
        statusDiv.textContent = 'Unexpected response from processing.';
        console.error('Unexpected response:', response);
        hideGiphy();
        resetProgress();
      }
    });
  } catch (error) {
    console.error("Error sending message:", error);
    statusDiv.textContent = 'Error: Unable to communicate with the page';
    hideGiphy();
    resetProgress();
  }
}
/*
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
}*/

document.addEventListener('DOMContentLoaded', function() {
  // Get version from manifest
  const version = chrome.runtime.getManifest().version;
  // Update version display
  document.querySelector('.version-number').textContent = `v${version}`;
});

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
    if (isLoading) {
      hideGiphy();
    }
  } else {
    console.error('Status div not found');
  }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
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
  } else if (request.action === 'triggerScan') {
      // Trigger the scan action
      injectContentScriptAndProcess();
  }
});