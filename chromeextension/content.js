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
  console.log('Content script received message:', request);

  if (request.action === "selectAllText") {
    console.log('Selecting all text');
    const selectedText = selectAllText();
    console.log('Selected text length:', selectedText.length);

    const prompt = "summarize this job description based on company, title, responsibilities, compensation";
    const currentUrl = window.location.href;
    
    console.log('Sending text to Firebase');
    chrome.runtime.sendMessage({
      action: "sendTextToFirebase",
      text: prompt + "\n\n" + selectedText,
      url: currentUrl
    }, function(response) {
      console.log('Received response from background script:', response);
      if (response && response.success) {
        console.log('Response from Firebase function:', response.result);
        sendResponse({success: true, result: response.result});
      } else {
        console.error('Error calling Firebase function:', response ? response.error : 'No response');
        sendResponse({success: false, error: response ? response.error : 'No response from background script'});
      }
    });
    
    setTimeout(deselectText, 100);

    return true; // Keeps the message channel open for the asynchronous response
  }
});

console.log('Content script loaded and ready');
chrome.runtime.sendMessage({action: "contentScriptReady"});