let statusDiv;
let generatedContentDiv;
let popupContainer;

document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKey');
  const saveKeyButton = document.getElementById('saveKey');
  const sendButton = document.getElementById('sendButton');
  statusDiv = document.getElementById('status');
  const apiKeyFoundDiv = document.getElementById('apiKeyFound');
  const apiKeyInputSection = document.getElementById('apiKeyInputSection');
  generatedContentDiv = document.getElementById('generatedContent');
  popupContainer = document.getElementById('popup-container');

  // Load saved API key
  chrome.storage.local.get(['openaiApiKey'], function(result) {
    if (result.openaiApiKey) {
      apiKeyFoundDiv.style.display = 'block';
      apiKeyInputSection.style.display = 'none';
      updateStatus('Ready to process text');
    } else {
      apiKeyFoundDiv.style.display = 'none';
      apiKeyInputSection.style.display = 'block';
      updateStatus('Please enter an API Key');
    }
  });

  saveKeyButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.local.set({openaiApiKey: apiKey}, function() {
        apiKeyFoundDiv.style.display = 'block';
        apiKeyInputSection.style.display = 'none';
        updateStatus('API Key saved. Ready to process text');
      });
    } else {
      updateStatus('Please enter a valid API Key');
    }
  });

  sendButton.addEventListener('click', processSelectedText);

  // Initial resize
  resizePopup();

  // Listen for window resize events
  window.addEventListener('resize', resizePopup);
});

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

async function processSelectedText() {
  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tab) {
      updateStatus('No active tab found');
      return;
    }

    // Inject the content script
    await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      files: ['content.js']
    });

    // Send message to the content script
    chrome.tabs.sendMessage(tab.id, {action: "getSelection"}, function(response) {
      if (chrome.runtime.lastError) {
        updateStatus('Error: ' + chrome.runtime.lastError.message);
      } else if (response && response.success) {
        updateStatus('Processing text with OpenAI...');
        chrome.runtime.sendMessage({
          action: "processWithOpenAI", 
          text: response.text,
          url: response.url
        }, function(aiResponse) {
          if (aiResponse.success) {
            displayResults(aiResponse.result);
          } else {
            updateStatus('Error: ' + aiResponse.error);
          }
        });
      } else {
        updateStatus('No text selected or error occurred');
      }
    });
  } catch (error) {
    updateStatus('Error: ' + error.message);
    console.error('Error:', error);
  }
}

function displayResults(result) {
  generatedContentDiv.innerHTML = `
    <h3>${result.companyInfo.name} (${result.companyInfo.industry})</h3>
    <p class="summary">${result.jobSummary}</p>
    <p><span class="bold">Areas of Focus:</span></p>
    <ul>
      ${result.areasOfFocus.map(area => `<li>${area}</li>`).join('')}
    </ul>
    <p><span class="bold">Mandatory Skills:</span></p>
    <ul>
      ${result.mandatorySkills.map(skill => `<li>${skill}</li>`).join('')}
    </ul>
    <p><span class="bold">Compensation:</span></p>
    <ul>
      <li>${result.compensation}</li>
    </ul>
  `;

  updateStatus('Analysis complete');
  resizePopup();
}

function updateStatus(message) {
  if (statusDiv) {
    statusDiv.textContent = message;
  } else {
    console.error('Status div not found');
  }
}