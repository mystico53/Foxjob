// Import the instructions
importScripts('instructions.js');

console.log('Background script loaded');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Add the sendTextToFirebase function
async function sendTextToFirebase(text, url) {
  console.log('sendTextToFirebase called with:', { text, url });

  const apiBody = {
    text: text,
    url: url
  };

  console.log('Prepared API body:', apiBody);

  try {
    const response = await fetch('https://processtext-kvshkfhmua-uc.a.run.app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apiBody)
    });

    const data = await response.json();

    console.log('Firebase Function Response:', data);

    return data;
  } catch (error) {
    console.error('Error calling Firebase function:', error);
    throw error;
  }
}

async function fetchWithRetry(url, options, maxRetries = 5, baseDelay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Attempt ${i + 1} of ${maxRetries}`);
      const response = await fetch(url, options);
      console.log('Fetch response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Error response body:', errorBody);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) throw error;
      
      if (error.message.includes('429')) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`Rate limited. Retrying after ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  throw new Error('Max retries reached');
}

// Simple queue system
const queue = [];
let isProcessing = false;

function addToQueue(task) {
  return new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    processQueue();
  });
}

async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;
  const { task, resolve, reject } = queue.shift();
  try {
    const result = await task();
    resolve(result);
  } catch (error) {
    reject(error);
  } finally {
    isProcessing = false;
    processQueue();
  }
}

async function processWithOpenAI(apiKey, text, url) {
  const apiBody = {
    model: openAIInstructions.model,
    messages: openAIInstructions.messages.map(msg => {
      if (msg.role === "user") {
        return {...msg, content: msg.content.replace("{TEXT}", text) + `\n\nURL: ${url}`};
      }
      return msg;
    })
  };

  console.log('Prepared OpenAI API body:', apiBody);

  const data = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(apiBody)
  });

  console.log('OpenAI API Response:', data);
  if (data.choices && data.choices[0] && data.choices[0].message) {
    const content = data.choices[0].message.content.trim();
    console.log('Raw content from OpenAI API:', content);
    const jsonContent = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    console.log('JSON content after cleaning:', jsonContent);
    return JSON.parse(jsonContent);
  } else {
    throw new Error("Unexpected OpenAI API response structure");
  }
}

async function processWithAnthropic(apiKey, text, url) {
  console.log('Using Anthropic API key:', apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 5));
  const apiBody = {
    model: anthropicInstructions.model,
    max_tokens: 1024,
    messages: [
      { role: "user", content: anthropicInstructions.prompt.replace("{TEXT}", text + `\n\nURL: ${url}`) }
    ]
  };

  console.log('Prepared Anthropic API body:', apiBody);

  const data = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true' // Add this line
    },
    body: JSON.stringify(apiBody)
  });

  console.log('Anthropic API Response:', data);
  if (data.content && data.content.length > 0 && data.content[0].type === 'text') {
    const content = data.content[0].text.trim();
    console.log('Raw content from Anthropic API:', content);
    try {
      const jsonContent = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      console.log('JSON content after cleaning:', jsonContent);
      return JSON.parse(jsonContent);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      console.error('Raw content:', content);
      throw new Error("Error parsing Anthropic response");
    }
  } else {
    throw new Error("Unexpected Anthropic API response structure");
  }
}

// Set up a listener for messages sent to the extension
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Message received:', request);

  // Handle different actions based on the 'action' property of the request
  switch (request.action) {
    case "sendTextToFirebase":
      // Send text to Firebase
      sendTextToFirebase(request.text, request.url)
        .then(data => {
          sendResponse({ success: true, result: data.result });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      break;

    case "processWithLocalFunction":
      console.log('Processing with local function');
      // Add local processing to the queue
      addToQueue(() => processWithLocalFunction(request.text, request.url))
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.toString() }));
      break;

    case "processWithOpenAI":
    case "processWithAnthropic":
      console.log(`Processing with ${request.action === "processWithOpenAI" ? "OpenAI" : "Anthropic"}`);
      
      // Determine which API key to use based on the action
      const apiKeyName = request.action === "processWithOpenAI" ? 'openaiApiKey' : 'anthropicApiKey';
      
      // Add API processing to the queue
      addToQueue(() => new Promise((resolve, reject) => {
        // Retrieve the appropriate API key from local storage
        chrome.storage.local.get([apiKeyName], function(result) {
          console.log('API Key retrieved:', result[apiKeyName] ? 'Key found' : 'Key not found');

          if (!result[apiKeyName]) {
            console.error('API Key not found');
            reject(new Error("API Key not found"));
            return;
          }

          // Choose the correct processing function based on the action
          const processFunction = request.action === "processWithOpenAI" ? processWithOpenAI : processWithAnthropic;

          // Process the request using the selected function and API key
          processFunction(result[apiKeyName], request.text, request.url)
            .then(resolve)
            .catch(reject);
        });
      }))
      .then(result => sendResponse({success: true, result}))
      .catch(error => sendResponse({success: false, error: error.toString()}));
      break;

    default:
      console.log('Unhandled action:', request.action);
      sendResponse({ success: false, error: "Unhandled action" });
      return false; // Indicates that we're not sending a response asynchronously
  }

  return true; // Indicates that the response will be sent asynchronously
});

console.log('Background script setup complete');