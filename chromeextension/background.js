// background.js

// Import the instructions
importScripts('instructions.js');

console.log('Background script loaded');

// Add the sendTextToFirebase function
async function sendTextToFirebase(text, url) {
  console.log('sendTextToFirebase called with:', { textLength: text.length, url });

  const apiBody = {
    text: text,
    url: url,
    instructions: anthropicInstructions
  };

  console.log('Prepared API body:', { textLength: apiBody.text.length, url: apiBody.url });

  // **Send status update to popup script**
  chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Processing text...', isLoading: true });

  try {
    console.log('Sending request to Firebase function');
    const response = await fetch('https://processtext-kvshkfhmua-uc.a.run.app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apiBody)
    });

    console.log('Received response from Firebase function');
    const data = await response.json();

    console.log('Firebase Function Response:', data);

    return data;
  } catch (error) {
    console.error('Error calling Firebase function:', error);
    throw error;
  }
}

// Set up a listener for messages sent to the extension
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Background script received message:', request);

  // Handle different actions based on the 'action' property of the request
  switch (request.action) {
    case "sendTextToFirebase":
      console.log('Handling sendTextToFirebase action');
      // **Send status update to popup script**
      chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Sending text to Firebase...', isLoading: true  });

      // Send text to Firebase
      sendTextToFirebase(request.text, request.url)
        .then(data => {
          console.log('Successfully sent to Firebase, sending response');
          // **Send status update to popup script**
          chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Processing completed.', isLoading: false });
          sendResponse({ success: true, result: data.result });
        })
        .catch(error => {
          console.error('Error in sendTextToFirebase:', error);
          // **Send error update to popup script**
          chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Error: ' + error.message, isLoading: false});
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keeps the message channel open for the asynchronous response

    case "statusUpdate":
      // **Forward status updates to the popup script**
      chrome.runtime.sendMessage({ action: 'updateStatus', message: request.message });
      break;

    case "contentScriptReady":
      console.log("Content script is ready");
      // You can add any initialization logic here if needed
      break;

    default:
      console.log('Unhandled action:', request.action);
      sendResponse({ success: false, error: "Unhandled action" });
      return false; // Indicates that we're not sending a response asynchronously
  }
});

console.log('Background script setup complete');
