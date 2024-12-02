// Error logging function for critical issues
console.log('Offscreen document loaded.');  
function logError(message, error = null) {
  console.error(message, error);
  chrome.runtime.sendMessage({
    type: 'error-log',
    message: message,
    error: error
  });
}

// Get and validate auth URL
const urlParams = new URLSearchParams(window.location.search);
const _URL = urlParams.get('authUrl');
if (!_URL) {
    logError('No auth URL provided');
    throw new Error('Missing auth URL');
}

// Create and append iframe
const iframe = document.createElement('iframe');
iframe.src = _URL;
document.documentElement.appendChild(iframe);

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') {
    return false;
  }

  let responseSent = false;

  function handleIframeMessage({ data }) {
    try {
      if (data.startsWith('!_{')) {
        return;
      }
      const parsedData = JSON.parse(data);
      globalThis.removeEventListener('message', handleIframeMessage);
      sendResponse(parsedData);
      responseSent = true;
    } catch (e) {
      logError('Failed to parse message:', {
        error: e.message,
        dataType: typeof data
      });
      if (!responseSent) {
        sendResponse({ error: e.message });
        responseSent = true;
      }
    }
  }

  globalThis.addEventListener('message', handleIframeMessage, false);
  
  const initMessage = { initAuth: true };
  
  setTimeout(() => {
    try {
      iframe.contentWindow.postMessage(initMessage, new URL(_URL).origin);
    } catch (e) {
      logError('Failed to send init message:', e);
      if (!responseSent) {
        sendResponse({ error: e.message });
        responseSent = true;
      }
    }
  }, 500);

  // Set a timeout to ensure sendResponse is called
  setTimeout(() => {
    if (!responseSent) {
      sendResponse({ error: 'Timeout waiting for iframe response' });
      responseSent = true;
    }
  }, 7000); // Adjust timeout as needed

  return true;
});