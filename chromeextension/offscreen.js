import { getAuthUrl } from './config.js';

// Initialize URL at the top
let _URL;
async function initializeAuthUrl() {
  _URL = await getAuthUrl();
  const iframe = document.createElement('iframe');
  iframe.src = _URL;
  document.documentElement.appendChild(iframe);
}

// Initialize immediately
initializeAuthUrl();

chrome.runtime.onMessage.addListener(handleChromeMessages);

function handleChromeMessages(message, sender, sendResponse) {
  if (message.target !== 'offscreen') {
    return false;
  }

  function handleIframeMessage({data}) {
    try {
      if (data.startsWith('!_{')) {
        return;
      }
      data = JSON.parse(data);
      self.removeEventListener('message', handleIframeMessage);
      sendResponse(data);
    } catch (e) {
      console.log(`json parse failed - ${e.message}`);
    }
  }

  globalThis.addEventListener('message', handleIframeMessage, false);

  setTimeout(() => {
    console.log('Sending initAuth message after delay');
    iframe.contentWindow.postMessage({ initAuth: true }, new URL(_URL).origin);
  }, 500);
  return true;
}