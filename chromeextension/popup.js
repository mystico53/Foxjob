let statusDiv;
let generatedContentDiv;
let popupContainer;

document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKey');
  const saveKeyButton = document.getElementById('saveKey');
  const signInButton = document.getElementById('signInButton');
  const deleteKeyButton = document.getElementById('deleteKey');
  const signOutButton = document.getElementById('signOutButton');
  statusDiv = document.getElementById('status');
  const apiKeyFoundDiv = document.getElementById('apiKeyFound');
  const apiKeyInputSection = document.getElementById('apiKeyInputSection');
  generatedContentDiv = document.getElementById('generatedContent');
  popupContainer = document.getElementById('popup-container');

  // Load saved API key
  chrome.storage.local.get(['openaiApiKey', 'userId'], function(result) {
    if (result.openaiApiKey) {
      apiKeyFoundDiv.style.display = 'block';
      apiKeyInputSection.style.display = 'none';
      deleteKeyButton.style.display = 'block';
      updateStatus('API key found. Selecting all text...');
      injectContentScriptAndProcess();
    } else {
      apiKeyFoundDiv.style.display = 'none';
      apiKeyInputSection.style.display = 'block';
      deleteKeyButton.style.display = 'none';
      updateStatus('Please enter an API Key');
    }

    if (result.userId) {
      signInButton.style.display = 'none';
      signOutButton.style.display = 'block';
    } else {
      signInButton.style.display = 'block';
      signOutButton.style.display = 'none';
    }
  });

  saveKeyButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.local.set({openaiApiKey: apiKey}, function() {
        apiKeyFoundDiv.style.display = 'block';
        apiKeyInputSection.style.display = 'none';
        deleteKeyButton.style.display = 'block';
        updateStatus('API Key saved. Selecting all text...');
        injectContentScriptAndProcess();
      });
    } else {
      updateStatus('Please enter a valid API Key');
    }
  });

  deleteKeyButton.addEventListener('click', function() {
    chrome.storage.local.remove('openaiApiKey', function() {
      apiKeyFoundDiv.style.display = 'none';
      apiKeyInputSection.style.display = 'block';
      deleteKeyButton.style.display = 'none';
      apiKeyInput.value = '';
      updateStatus('API Key deleted. Please enter a new one.');
    });
  });

  signInButton.addEventListener('click', function() {
    console.log("Sign-in button clicked");
    if (typeof signIn === 'function') {
      console.log("Calling signIn function");
      signIn();
    } else {
      console.error('signIn function not found');
      updateStatus('Error: Sign-in function not available');
    }
  });

  signOutButton.addEventListener('click', function() {
    console.log("Sign-out button clicked");
    if (typeof signOut === 'function') {
      console.log("Calling signOut function");
      signOut();
    } else {
      console.error('signOut function not found');
      updateStatus('Error: Sign-out function not available');
    }
  });

  // Initial resize
  resizePopup();

  // Listen for window resize events
  window.addEventListener('resize', resizePopup);
});

function injectContentScriptAndProcess() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
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
  });
}

function selectAllTextAndProcess(tabId) {
  chrome.tabs.sendMessage(tabId, {action: "selectAllText"}, function(response) {
    if (chrome.runtime.lastError) {
      updateStatus('Error: ' + chrome.runtime.lastError.message);
    } else if (response && response.success) {
      updateStatus('All text selected. Processing...');
      processSelectedText(tabId, response.text);
    } else {
      updateStatus('Failed to select text');
    }
  });
}

function processSelectedText(tabId, selectedText) {
  if (!selectedText) {
    updateStatus('No text selected or found');
    return;
  }

  updateStatus('Processing text with OpenAI...');
  chrome.runtime.sendMessage({
    action: "processWithOpenAI", 
    text: selectedText,
    url: tabId // You might want to get the actual URL here
  }, function(aiResponse) {
    if (aiResponse.success) {
      displayResults(aiResponse.result);
    } else {
      updateStatus('Error: ' + aiResponse.error);
    }
  });
}

function displayResults(result) {
  generatedContentDiv.innerHTML = `
    <h3>${result.companyInfo.name} (${result.companyInfo.industry})</h3>
    <p class="companyInfo">${result.companyInfo.companyFocus}</p>
    <p><span class="bold">Job Title:</span> ${result.jobInfo.jobTitle}</p>
    <p><span class="bold">Type: </span> ${result.jobInfo.remoteType}</p>

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

function updateStatus(message) {
  if (statusDiv) {
    statusDiv.textContent = message;
  } else {
    console.error('Status div not found');
  }
}

// Add this function to handle sign-out
function handleSignOut() {
  chrome.storage.local.remove('userId', function() {
    signInButton.style.display = 'block';
    signOutButton.style.display = 'none';
    updateStatus('Signed out successfully');
  });
}