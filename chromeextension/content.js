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

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "selectAllText") {
    const selectedText = selectAllText();
    sendResponse({success: true, text: selectedText});
    setTimeout(deselectText, 100);
  }
  return true; // Indicates that the response is sent asynchronously
});

// Replace 'Your test text here' with any sample text you want to test
chrome.runtime.sendMessage({
  action: "processWithLocalFunction",
  text: "Your test text here",
  url: window.location.href
}, function(response) {
  if (response.success) {
    console.log('Response from local function:', response.result);
  } else {
    console.error('Error calling local function:', response.error);
  }
});


// Notify that the content script has been injected and is ready
chrome.runtime.sendMessage({action: "contentScriptReady"});