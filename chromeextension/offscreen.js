// This URL must point to the public site
const _URL = 'https://jobille-45494.web.app/auth/signin';
console.log(`Initializing with URL: ${_URL}`);

const iframe = document.createElement('iframe');
iframe.src = _URL;
document.documentElement.appendChild(iframe);
console.log('iframe created and appended to document');

chrome.runtime.onMessage.addListener(handleChromeMessages);
console.log('Chrome message listener added');

function handleChromeMessages(message, sender, sendResponse) {
  console.log('Received Chrome message:', message);

  // Extensions may have an number of other reasons to send messages, so you
  // should filter out any that are not meant for the offscreen document.
  if (message.target !== 'offscreen') {
    console.log('Message not intended for offscreen document. Ignoring.');
    return false;
  }

  function handleIframeMessage({data}) {
    console.log('Received iframe message:', data);
    try {
      if (data.startsWith('!_{')) {
        console.log('Received Firebase internal message. Ignoring.');
        // Other parts of the Firebase library send messages using postMessage.
        // You don't care about them in this context, so return early.
        return;
      }
      data = JSON.parse(data);
      console.log('Parsed iframe message data:', data);
      self.removeEventListener('message', handleIframeMessage);
      console.log('Removed iframe message listener');

      sendResponse(data);
      console.log('Sent response back to Chrome');
    } catch (e) {
      console.error(`JSON parse failed - ${e.message}`, e);
    }
  }

  globalThis.addEventListener('message', handleIframeMessage, false);
  console.log('Added iframe message listener');

  // Initialize the authentication flow in the iframed document. You must set the
  // second argument (targetOrigin) of the message in order for it to be successfully
  // delivered.
  const targetOrigin = new URL(_URL).origin;
console.log(`Preparing to post initAuth message to iframe`);
console.log(`Target URL: ${_URL}`);
console.log(`Extracted origin: ${targetOrigin}`);

// Log the iframe's current URL
console.log(`Current iframe URL: ${iframe.src}`);

// Log the iframe's readyState
console.log(`Iframe readyState: ${iframe.contentDocument ? iframe.contentDocument.readyState : 'unavailable'}`);

// Attempt to post the message
try {
  console.log(`Attempting to post message: ${JSON.stringify({"initAuth": true})}`);
  iframe.contentWindow.postMessage({"initAuth": true}, targetOrigin);
  console.log(`Message posted successfully`);
} catch (error) {
  console.error(`Error posting message to iframe:`, error);
}

// Check if the iframe's content window is accessible
if (iframe.contentWindow) {
  console.log(`Iframe contentWindow is accessible`);
} else {
  console.warn(`Iframe contentWindow is not accessible. This may be due to cross-origin restrictions.`);
}

// Log the current origin
console.log(`Current page origin: ${window.location.origin}`);

// Check if the origins match
if (window.location.origin === targetOrigin) {
  console.log(`Current origin matches target origin`);
} else {
  console.warn(`Current origin does not match target origin. This may cause cross-origin issues.`);
}

  return true;
}

console.log('offscreen.js script loaded and initialized');

window.addEventListener('message', function(event) {
    if (event.origin === "https://jobille-45494.web.app") {
      console.log("Received response from auth page:", event.data);
      // Handle the authentication response here
      // For example:
      if (event.data.user) {
        console.log("Authentication successful. User:", event.data.user);
        // You might want to send this information back to your background script
        chrome.runtime.sendMessage({type: 'auth-success', user: event.data.user});
      } else if (event.data.error) {
        console.log("Authentication failed. Error:", event.data.error);
        // You might want to send this information back to your background script
        chrome.runtime.sendMessage({type: 'auth-error', error: event.data.error});
      }
    }
  });