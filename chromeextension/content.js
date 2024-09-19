chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getSelection") {
    const selectedText = window.getSelection().toString();
    const currentURL = window.location.href;
    sendResponse({
      success: true, 
      text: selectedText,
      url: currentURL
    });
  }
});