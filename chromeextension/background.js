// background.js

// Import the instructions
importScripts('instructions.js');

console.log('Background script loaded');

// Modified sendTextToFirebase function to include googleId and url
async function sendTextToFirebase(text, url, googleId) {
  console.log('sendTextToFirebase called with:', { textLength: text.length, url, googleId });

  const apiBody = {
    text: text,
    url: url,
    googleId: googleId,
    instructions: anthropicInstructions
  };

  console.log('Prepared API body:', { textLength: apiBody.text.length, url: apiBody.url, googleId: apiBody.googleId });

  chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Processing text...', isLoading: true });

  chrome.runtime.sendMessage({ action: 'textCollected' });

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

// Funktion zum Injizieren des Content-Skripts
function injectContentScript(tabId) {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      files: ['content.js']
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error('Fehler beim Injektieren des Skripts:', chrome.runtime.lastError.message);
      } else {
        console.log('Content-Skript erfolgreich injiziert');
      }
    }
  );
}

// Set up a listener for messages sent to the extension
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Background script received message:', request);

  switch (request.action) {
    case "sendTextToFirebase":
      console.log('Handling sendTextToFirebase action');
      chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Sending text to Firebase...', isLoading: true  });

      chrome.storage.local.get(['userId'], function(result) {
        const googleId = result.userId || 'anonymous';
        if (!googleId) {
          console.error('No Google ID found');
          chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Error: User not signed in', isLoading: false});
          sendResponse({ success: false, error: 'User not signed in' });
          return;
        }

        // Send text to Firebase with Google ID and URL
        sendTextToFirebase(request.text, request.url, googleId)
          .then(data => {
            console.log('Successfully sent to Firebase, sending response');
            chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Processing completed.', isLoading: false });
            sendResponse({ success: true, result: data.result });
          })
          .catch(error => {
            console.error('Error in sendTextToFirebase:', error);
            chrome.runtime.sendMessage({ action: 'updateStatus', message: 'Error: ' + error.message, isLoading: false});
            sendResponse({ success: false, error: error.message });
          });
      });
      return true;

    case "statusUpdate":
      // **Forward status updates to the popup script**
      chrome.runtime.sendMessage({ action: 'updateStatus', message: request.message });
      break;

    case "contentScriptReady":
      console.log("Content script is ready");
      // Du kannst hier Initialisierungslogik hinzufügen, falls benötigt
      break;

    case "triggerMainAction":
      // Diese Aktion wird ausgelöst, wenn der Benutzer die Tastenkombination verwendet oder die Erweiterung klickt
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const activeTab = tabs[0];
        if (activeTab && activeTab.id) {
          injectContentScript(activeTab.id);
          // Optionally, you can send a message to the content script to start processing immediately
          // setTimeout(() => selectAllTextAndProcess(activeTab.id), 100);
        } else {
          console.error('Kein aktiver Tab gefunden');
        }
      });
      break;

    default:
      console.log('Unhandled action:', request.action);
      sendResponse({ success: false, error: "Unhandled action" });
      return false; // Indicates that we're not sending a response asynchronously
  }
});

// Listener für Tastenkombinationen
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-feature") {
    console.log("Keyboard shortcut Alt+S was pressed");
    
    // Öffne das Popup und sende eine Nachricht, um die Hauptaktion auszulösen
    chrome.action.openPopup(() => {
      // Nach dem Öffnen des Popups, sende eine Nachricht, um die Hauptaktion zu starten
      chrome.runtime.sendMessage({ action: "triggerMainAction" });
    });
  }
});

console.log('Background script setup complete');
