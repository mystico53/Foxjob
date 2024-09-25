let statusDiv;
let generatedContentDiv;
let popupContainer;

document.addEventListener('DOMContentLoaded', initializePopup);

function initializePopup() {
  statusDiv = document.getElementById('status');
  generatedContentDiv = document.getElementById('generatedContent');
  popupContainer = document.getElementById('popup-container');

  document.getElementById('signInOutButton').addEventListener('click', handleSignInOut);

  // Check initial auth state
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      console.log('User is signed in');
      updateSignInButtonState(true, user.email);
      updateStatus('Signed in. Ready to process text.');
      injectContentScriptAndProcess();
    } else {
      console.log('User is signed out');
      updateSignInButtonState(false);
      updateStatus('Please sign in to process text');
    }
  });

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateStatus') {
      updateStatus(request.message, request.isLoading);
    }
  });

  // Initial resize
  resizePopup();

  // Listen for window resize events
  window.addEventListener('resize', resizePopup);
}

function handleSignInOut() {
    const button = document.getElementById('signInOutButton');
    if (button.textContent.startsWith('Sign In')) {
      window.signIn();
    } else {
      window.signOut();
    }
  }

function injectContentScriptAndProcess() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];

    // Inject content script only if it's not already injected
    chrome.tabs.sendMessage(activeTab.id, {action: "ping"}, function(response) {
      if (chrome.runtime.lastError || !response) {
        // Content script not found, inject it
        chrome.scripting.executeScript(
          {
            target: {tabId: activeTab.id},
            files: ['content.js']
          },
          function() {
            if (chrome.runtime.lastError) {
              updateStatus('Error injecting script: ' + chrome.runtime.lastError.message);
            } else {
              selectAllTextAndProcess(activeTab.id);
            }
          }
        );
      } else {
        // Content script already injected
        selectAllTextAndProcess(activeTab.id);
      }
    });
  });
}

function selectAllTextAndProcess(tabId) {
  updateStatus('Selecting and processing text...', true);
  chrome.tabs.sendMessage(tabId, {action: "selectAllText"}, function(response) {
    if (chrome.runtime.lastError) {
      updateStatus('Error: ' + chrome.runtime.lastError.message);
    } else if (response && response.success) {
      updateStatus('Processing completed.');
      displayResults(response.result);
    } else {
      updateStatus('Failed to process text');
    }
  });
}

function displayResults(result) {
  generatedContentDiv.innerHTML = `
    <h3>${result.companyInfo.name} (${result.companyInfo.industry})</h3>
    <p class="companyInfo">${result.companyInfo.companyFocus}</p>
    <p><span class="bold">Job Title:</span> ${result.jobInfo.jobTitle}</p>
    <p><span class="bold">Type:</span> ${result.jobInfo.remoteType}</p>
    <p class="summary">${result.jobInfo.jobSummary}</p>
    <p><span class="bold">Why it could be fun:</span></p>
    <ul>
      ${result.areasOfFun.map(area => `<li>${area}</li>`).join('')}
    </ul>
    <p><span class="bold">Mandatory Skills:</span></p>
    <ul>
      ${result.mandatorySkills.map(skill => `<li>${skill}</li>`).join('')}
    </ul>
    <p><span class="bold">Compensation:</span> ${result.compensation}</p>
  `;

  updateStatus('Analysis complete');
  resizePopup();
}

function resizePopup() {
  const contentHeight = popupContainer.scrollHeight;
  const maxHeight = 600; // Maximum height of the popup
  const newHeight = Math.min(contentHeight, maxHeight);
  popupContainer.style.height = `${newHeight}px`;

  // Enable scrolling on generatedContent if the content exceeds maxHeight
  if (contentHeight > maxHeight) {
    generatedContentDiv.style.overflowY = 'auto';
    generatedContentDiv.style.maxHeight = `${maxHeight - 150}px`; // Adjust for other elements
  } else {
    generatedContentDiv.style.overflowY = 'visible';
    generatedContentDiv.style.maxHeight = 'none';
  }
}

// These functions are now called from auth.js, but we keep them here for compatibility
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
  document.getElementById('loadingSpinner').style.display = 'block';
}

function hideSpinner() {
  document.getElementById('loadingSpinner').style.display = 'none';
}

// This function is called from auth.js
function updateSignInButtonState(isSignedIn, email = '') {
    const button = document.getElementById('signInOutButton');
    if (isSignedIn) {
      button.textContent = `Sign Out (${email})`;
      button.title = `Signed in as ${email}`;
    } else {
      button.textContent = 'Sign In';
      button.title = '';
    }
  }

function logCurrentUserId() {
    const userId = window.getCurrentUserId();
    if (userId) {
      console.log('Current user Google ID:', userId);
    } else {
      console.log('No user is currently signed in');
    }
  }