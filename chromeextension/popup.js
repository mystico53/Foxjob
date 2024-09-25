let statusDiv;
let generatedContentDiv;
let popupContainer;
let currentApiType = '';

document.addEventListener('DOMContentLoaded', initializePopup);

function initializePopup() {
  statusDiv = document.getElementById('status');
  generatedContentDiv = document.getElementById('generatedContent');
  popupContainer = document.getElementById('popup-container');

  document.getElementById('apiSelector').addEventListener('change', handleApiSelectorChange);
  document.getElementById('saveApiKey').addEventListener('click', saveApiKey);
  document.getElementById('deleteApiKey').addEventListener('click', deleteApiKey);
  document.getElementById('signInOutButton').addEventListener('click', handleSignInOut);

  // Load saved API keys and update UI
  chrome.storage.local.get(['openaiApiKey', 'anthropicApiKey', 'userId', 'preferredApi'], function(result) {
      if (result.openaiApiKey) {
          updateApiKeyStatus('openai', true);
      }
      if (result.anthropicApiKey) {
          updateApiKeyStatus('anthropic', true);
      }
      updateSignInButtonState(!!result.userId);
      
      // Load preferred API
      if (result.preferredApi) {
          const apiSelector = document.getElementById('apiSelector');
          apiSelector.value = result.preferredApi;
          currentApiType = result.preferredApi;
          apiSelector.dispatchEvent(new Event('change'));
      }

      // Automatically process text if an API key is available
      if (result.openaiApiKey || result.anthropicApiKey) {
          injectContentScriptAndProcess();
      } else {
          updateStatus('Please enter an API key to process text');
      }
  });

  // Initial resize
  resizePopup();

  // Listen for window resize events
  window.addEventListener('resize', resizePopup);
}


function saveApiPreference(apiType) {
  chrome.storage.local.set({ preferredApi: apiType }, () => {
      console.log('API preference saved:', apiType);
  });
}

function handleApiSelectorChange() {
    const selector = document.getElementById('apiSelector');
    currentApiType = selector.value;
    
    if (currentApiType) {
        chrome.storage.local.get(`${currentApiType}ApiKey`, function(result) {
            if (result[`${currentApiType}ApiKey`]) {
                updateApiKeyStatus(currentApiType, true);
            } else {
                document.getElementById('apiKeyInputSection').style.display = 'block';
                document.getElementById('apiKeyStatus').style.display = 'none';
            }
        });
    } else {
        document.getElementById('apiKeyInputSection').style.display = 'none';
        document.getElementById('apiKeyStatus').style.display = 'none';
    }
}

function saveApiKey() {
  const apiKey = document.getElementById('apiKeyInput').value.trim();
  if (apiKey && currentApiType) {
      chrome.storage.local.set({ [`${currentApiType}ApiKey`]: apiKey }, function() {
          console.log(`Saved ${currentApiType} API key:`, apiKey); // Add this line
          updateApiKeyStatus(currentApiType, true);
          updateStatus(`${currentApiType.charAt(0).toUpperCase() + currentApiType.slice(1)} API Key saved. Selecting all text...`);
          injectContentScriptAndProcess();
      });
  } else {
      updateStatus('Please enter a valid API Key');
  }
}

function deleteApiKey() {
    if (currentApiType) {
        chrome.storage.local.remove(`${currentApiType}ApiKey`, function() {
            updateApiKeyStatus(currentApiType, false);
            updateStatus(`${currentApiType.charAt(0).toUpperCase() + currentApiType.slice(1)} API Key deleted. Please enter a new one.`);
        });
    }
}

function handleApiSelectorChange() {
    const selector = document.getElementById('apiSelector');
    currentApiType = selector.value;
    
    if (currentApiType) {
        saveApiPreference(currentApiType);  // Add this line
        chrome.storage.local.get(`${currentApiType}ApiKey`, function(result) {
            if (result[`${currentApiType}ApiKey`]) {
                updateApiKeyStatus(currentApiType, true);
            } else {
                document.getElementById('apiKeyInputSection').style.display = 'block';
                document.getElementById('apiKeyStatus').style.display = 'none';
            }
        });
    } else {
        document.getElementById('apiKeyInputSection').style.display = 'none';
        document.getElementById('apiKeyStatus').style.display = 'none';
    }
}

function updateApiKeyStatus(apiType, keyFound) {
    const selector = document.getElementById('apiSelector');
    const statusText = document.getElementById('apiKeyStatusText');
    const inputSection = document.getElementById('apiKeyInputSection');
    const statusSection = document.getElementById('apiKeyStatus');

    if (keyFound) {
        selector.querySelector(`option[value="${apiType}"]`).textContent = `${apiType.charAt(0).toUpperCase() + apiType.slice(1)} (API key ready)`;
        statusText.textContent = `${apiType.charAt(0).toUpperCase() + apiType.slice(1)} API key is ready`;
        inputSection.style.display = 'none';
        statusSection.style.display = 'block';
    } else {
        selector.querySelector(`option[value="${apiType}"]`).textContent = apiType.charAt(0).toUpperCase() + apiType.slice(1);
        inputSection.style.display = 'block';
        statusSection.style.display = 'none';
    }
}

function handleSignInOut() {
    const button = document.getElementById('signInOutButton');
    if (button.textContent === 'Sign In') {
        signIn();
    } else {
        signOut();
    }
}

function updateSignInButtonState(isSignedIn) {
    const button = document.getElementById('signInOutButton');
    button.textContent = isSignedIn ? 'Sign Out' : 'Sign In';
}

function signIn() {
    console.log("Sign-in function called");
    if (typeof window.signIn === 'function') {
        console.log("Calling signIn function");
        window.signIn();
    } else {
        console.error('signIn function not found');
        updateStatus('Error: Sign-in function not available');
    }
}

function signOut() {
    console.log("Sign-out function called");
    if (typeof window.signOut === 'function') {
        console.log("Calling signOut function");
        window.signOut();
    } else {
        console.error('signOut function not found');
        updateStatus('Error: Sign-out function not available');
    }
}

function injectContentScriptAndProcess() {
  if (!currentApiType) {
      updateStatus('Please select an API provider');
      return;
  }

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

  updateStatus(`Processing text with ${currentApiType.charAt(0).toUpperCase() + currentApiType.slice(1)}...`);
  chrome.runtime.sendMessage({
      action: `processWith${currentApiType.charAt(0).toUpperCase() + currentApiType.slice(1)}`,
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