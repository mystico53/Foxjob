// Error logging function for critical issues
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

  function handleIframeMessage({data}) {
    try {
      if (data.startsWith('!_{')) {
        return;
      }
      const parsedData = JSON.parse(data);
      self.removeEventListener('message', handleIframeMessage);
      sendResponse(parsedData);
    } catch (e) {
      logError('Failed to parse message:', {
        error: e.message,
        dataType: typeof data
      });
    }
  }

  globalThis.addEventListener('message', handleIframeMessage, false);
  
  const initMessage = { initAuth: true };
  
  setTimeout(() => {
    try {
      iframe.contentWindow.postMessage(initMessage, new URL(_URL).origin);
    } catch (e) {
      logError('Failed to send init message:', e);
    }
  }, 500);

  return true;
});