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

// Notify that the content script has been injected and is ready
chrome.runtime.sendMessage({action: "contentScriptReady"});