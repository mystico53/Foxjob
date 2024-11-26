
function debugLog(message, data = null) {
  console.log(message, data);  // Keep local console.log
  chrome.runtime.sendMessage({
    type: 'debug-log',
    message: message,
    data: data
  });
}
    
    
    const urlParams = new URLSearchParams(window.location.search);
    const _URL = urlParams.get('authUrl');
    if (!_URL) {
        console.error('No auth URL provided');
        throw new Error('Missing auth URL');
    }
    console.log('Offscreen: Auth URL:', _URL);
    console.log('Offscreen: Current URL:', window.location.href);
    console.log('Offscreen: Document origin:', window.location.origin);

    const iframe = document.createElement('iframe');
iframe.src = _URL;
document.documentElement.appendChild(iframe);

// In offscreen.js
// In offscreen.js
// In offscreen.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') {
    return false;
  }

  function handleIframeMessage({data}) {
    try {
      if (data.startsWith('!_{')) {
        debugLog('Ignoring internal message starting with !_{');
        return;
      }
      debugLog('Received raw message from iframe:', data);
      debugLog('Message type:', typeof data);
      debugLog('Message length:', data.length);
      data = JSON.parse(data);
      debugLog('Parsed message:', data);
      self.removeEventListener('message', handleIframeMessage);
      sendResponse(data);
    } catch (e) {
      debugLog('json parse failed:', {
        error: e.message,
        originalData: data,
        dataType: typeof data
      });
    }
  }

  globalThis.addEventListener('message', handleIframeMessage, false);
  
  const initMessage = { initAuth: true };
  
  // Log context before sending
  debugLog('Context and Message Details:', {
    // Message details
    messageObject: initMessage,
    messageString: JSON.stringify(initMessage),
    messageStringified: JSON.stringify(initMessage, null, 2),
    messageType: typeof initMessage,
    messageKeys: Object.keys(initMessage),
    messageDescriptor: Object.getOwnPropertyDescriptor(initMessage, 'initAuth'),
    
    // URL and Origin details
    fullURL: _URL,
    targetOrigin: new URL(_URL).origin,
    currentOrigin: window.location.origin,
    currentURL: window.location.href,
    
    // Iframe details
    iframeExists: !!iframe,
    iframeContentWindow: !!iframe.contentWindow,
    iframeSrc: iframe.src,
    iframeReadyState: document.readyState,
    
    // Environment
    extensionId: chrome.runtime.id,
    timeStamp: new Date().toISOString()
  });

  setTimeout(() => {
    debugLog('Pre-send state:', {
      iframeExists: !!iframe,
      iframeContentWindow: !!iframe.contentWindow,
      documentState: document.readyState,
      currentTime: new Date().toISOString()
    });
    iframe.contentWindow.postMessage(initMessage, new URL(_URL).origin);
    debugLog('Message sent, post-send state:', {
      messageObject: initMessage,
      targetOrigin: new URL(_URL).origin,
      time: new Date().toISOString()
    });
  }, 500);

  return true;
});