// content.js

// Wrap the entire content script in an IIFE
(function() {
  if (window.contentScriptInitialized) {
    console.log('Content script already initialized');
    return;
  }
  window.contentScriptInitialized = true;

  let isProcessing = false;
  const debounceTime = 1000; // 1 second

  // Function to select all text on the page
  function selectAllText() {
    const body = document.body;
    const range = document.createRange();
    range.selectNodeContents(body);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    return selection.toString();
  }

  function deselectText() {
    window.getSelection().removeAllRanges();
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const debouncedSendMessage = debounce((request, sender, sendResponse) => {
    if (isProcessing) {
      console.log('Already processing, ignoring request');
      sendResponse({success: false, error: 'Already processing'});
      return;
    }

    isProcessing = true;
    console.log('Selecting all text');

    // **Send status update to background script**
    //chrome.runtime.sendMessage({ action: 'statusUpdate', message: 'Selecting all text...' });

    const selectedText = selectAllText();
    console.log('Selected text length:', selectedText.length);
    const currentUrl = document.location.href;
    console.log('Debug - Current URL:', currentUrl);

    console.log('Sending text to Firebase');

    chrome.runtime.sendMessage({
      action: "publishText",
      text: selectedText,
      url: currentUrl
    }, function(response) {
      if (response && response.success) {
        sendResponse({ success: true, result: response.result });
      } else {
        sendResponse({ success: false, error: response ? response.error : 'No response from background script' });
      }
      isProcessing = false;
    });

    setTimeout(deselectText, 100);
  }, debounceTime);

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Content script received message:', request);

    if (request.action === "selectAllText") {
      debouncedSendMessage(request, sender, sendResponse);
      return true; // Keeps the message channel open for the asynchronous response
    } else if (request.action === "ping") {
      // Respond to ping messages to confirm content script is loaded
      sendResponse({ status: 'alive' });
    }
  });

  console.log('Content script loaded and ready');
  chrome.runtime.sendMessage({action: "contentScriptReady"});
})();
