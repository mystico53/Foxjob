document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKey');
  const saveKeyButton = document.getElementById('saveKey');
  const sendButton = document.getElementById('sendButton');
  const statusDiv = document.getElementById('status');
  const apiKeyFoundDiv = document.getElementById('apiKeyFound');
  const apiKeyInputSection = document.getElementById('apiKeyInputSection');

  // Load saved API key
  chrome.storage.local.get(['openaiApiKey'], function(result) {
    if (result.openaiApiKey) {
      apiKeyFoundDiv.style.display = 'block';
      apiKeyInputSection.style.display = 'none';
      statusDiv.textContent = 'Ready to process text';
    } else {
      apiKeyFoundDiv.style.display = 'none';
      apiKeyInputSection.style.display = 'block';
      statusDiv.textContent = 'Please enter an API Key';
    }
  });

  saveKeyButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.local.set({openaiApiKey: apiKey}, function() {
        apiKeyFoundDiv.style.display = 'block';
        apiKeyInputSection.style.display = 'none';
        statusDiv.textContent = 'API Key saved. Ready to process text';
      });
    } else {
      statusDiv.textContent = 'Please enter a valid API Key';
    }
  });

  sendButton.addEventListener('click', async function() {
    try {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      if (!tab) {
        statusDiv.textContent = 'No active tab found';
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
          statusDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
        } else if (response && response.success) {
          statusDiv.textContent = 'Processing text with OpenAI...';
          chrome.runtime.sendMessage({
            action: "processWithOpenAI", 
            text: response.text,
            url: response.url
          }, function(aiResponse) {
            if (aiResponse.success) {
              displayResults(aiResponse.result);
            } else {
              statusDiv.textContent = 'Error: ' + aiResponse.error;
            }
          });
        } else {
          statusDiv.textContent = 'No text selected or error occurred';
        }
      });
    } catch (error) {
      statusDiv.textContent = 'Error: ' + error.message;
      console.error('Error:', error);
    }
  });
});

function displayResults(result) {
  const generatedContentDiv = document.getElementById('generatedContent');

  generatedContentDiv.innerHTML = `
    <h3>\u{1F3E2} ${result.companyInfo.name} (${result.companyInfo.industry})</h3>
    <p class="summary">${result.jobSummary}</p>
    <p><span class="bold">\u{1F3AF} Areas of Focus:</span></p>
    <ul>
      ${result.areasOfFocus.map(area => `<li>${area}</li>`).join('')}
    </ul>
    <p><span class="bold">\u{1F527} Mandatory Skills:</span></p>
    <ul>
      ${result.mandatorySkills.map(skill => `<li>${skill}</li>`).join('')}
    </ul>
    <p><span class="bold">\u{1F4B0} Compensation:</span></p>
    <ul>
      <li>${result.compensation}</li>
    </ul>
  `;

  statusDiv.textContent = 'Analysis complete';
}