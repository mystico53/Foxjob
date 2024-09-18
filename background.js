// background.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "processWithOpenAI") {
    chrome.storage.local.get(['openaiApiKey'], function(result) {
      if (!result.openaiApiKey) {
        sendResponse({success: false, error: "API Key not found"});
        return;
      }

      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${result.openaiApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {"role": "system", "content": "You are a helpful assistant that adds 'AAA' to the given text."},
            {"role": "user", "content": `Add 'AAA' to the following text: ${request.text}`}
          ]
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.choices && data.choices[0] && data.choices[0].message) {
          sendResponse({success: true, result: data.choices[0].message.content});
        } else {
          sendResponse({success: false, error: "Unexpected API response"});
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