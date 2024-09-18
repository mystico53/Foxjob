// background.js

// Import the instructions
importScripts('instructions.js');

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "processWithOpenAI") {
    chrome.storage.local.get(['openaiApiKey'], function(result) {
      if (!result.openaiApiKey) {
        sendResponse({success: false, error: "API Key not found"});
        return;
      }

      // Use the instructions from instructions.js
      const apiBody = {
        model: openAIInstructions.model,
        messages: openAIInstructions.messages.map(msg => {
          if (msg.role === "user") {
            return {...msg, content: msg.content.replace("{TEXT}", request.text)};
          }
          return msg;
        })
      };

      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${result.openaiApiKey}`
        },
        body: JSON.stringify(apiBody)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('API Response:', data); // Log the entire response
        if (data.choices && data.choices[0] && data.choices[0].message) {
          sendResponse({success: true, result: data.choices[0].message.content});
        } else {
          console.error('Unexpected API response structure:', data);
          sendResponse({success: false, error: "Unexpected API response structure"});
        }
      })
      .catch(error => {
        console.error('Error:', error);
        sendResponse({success: false, error: error.toString()});
      });
    });

    return true; // Indicates that the response is sent asynchronously
  }
});