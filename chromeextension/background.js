// Import the instructions
importScripts('instructions.js');

console.log('Background script loaded');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, maxRetries = 5, baseDelay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Attempt ${i + 1} of ${maxRetries}`);
      const response = await fetch(url, options);
      console.log('Fetch response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, i);
        console.log(`Rate limited. Retrying after ${delay}ms`);
        await sleep(delay);
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) throw error;
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

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Message received:', request);

  if (request.action === "processWithOpenAI") {
    console.log('Processing with OpenAI');

    addToQueue(() => new Promise((resolve, reject) => {
      chrome.storage.local.get(['openaiApiKey'], function(result) {
        console.log('API Key retrieved:', result.openaiApiKey ? 'Key found' : 'Key not found');

        if (!result.openaiApiKey) {
          console.error('API Key not found');
          reject(new Error("API Key not found"));
          return;
        }

        const apiBody = {
          model: openAIInstructions.model,
          messages: openAIInstructions.messages.map(msg => {
            if (msg.role === "user") {
              return {...msg, content: msg.content.replace("{TEXT}", request.text) + `\n\nURL: ${request.url}`};
            }
            return msg;
          })
        };

        console.log('Prepared API body:', apiBody);

        fetchWithRetry('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${result.openaiApiKey}`
          },
          body: JSON.stringify(apiBody)
        })
        .then(data => {
          console.log('API Response:', data);
          if (data.choices && data.choices[0] && data.choices[0].message) {
            const content = data.choices[0].message.content.trim();
            console.log('Raw content from API:', content);
            try {
              const jsonContent = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
              console.log('JSON content after cleaning:', jsonContent);
              const parsedResult = JSON.parse(jsonContent);
              console.log('Parsed result:', parsedResult);
              resolve(parsedResult);
            } catch (error) {
              console.error('Error parsing JSON:', error);
              console.error('Raw content:', content);
              reject(new Error("Error parsing response"));
            }
          } else {
            console.error('Unexpected API response structure:', data);
            reject(new Error("Unexpected API response structure"));
          }
        })
        .catch(error => {
          console.error('Fetch error:', error);
          reject(error);
        });
      });
    }))
    .then(result => sendResponse({success: true, result}))
    .catch(error => sendResponse({success: false, error: error.toString()}));

    return true; // Indicates that the response is sent asynchronously
  } else {
    console.log('Unhandled action:', request.action);
  }
});

console.log('Background script setup complete');