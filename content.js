// content.js
console.log("Content script loaded");

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("Message received in content script:", request);
  if (request.action === "getSelection") {
    let selectedText = window.getSelection().toString();
    console.log("Selected text:", selectedText);
    sendResponse({success: true, text: selectedText});
  }
  return true;
});