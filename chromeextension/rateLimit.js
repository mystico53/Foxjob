// rateLimit.js

const RateLimit = {
    checkAndTrack: function() {
      return new Promise((resolve) => {
        const now = Date.now();
        const oneMinuteAgo = now - 60000; // 1 minute in milliseconds
        
        chrome.storage.local.get(['actionTimestamps'], function(data) {
          let timestamps = data.actionTimestamps || [];
          
          // Remove timestamps older than 1 minute
          timestamps = timestamps.filter(time => time > oneMinuteAgo);
          
          // Check if we're within rate limit
          if (timestamps.length >= 3) {
            console.log('Rate limit exceeded: 3 actions per minute');
            // Store filtered timestamps anyway to maintain cleanup
            chrome.storage.local.set({ actionTimestamps: timestamps });
            resolve(false);
            return;
          }
          
          // Add new timestamp and store
          timestamps.push(now);
          chrome.storage.local.set({ actionTimestamps: timestamps }, () => {
            console.log(`Action tracked. Actions in last minute: ${timestamps.length}`);
            resolve(true);
          });
        });
      });
    },
  
    reset: function() {
      return new Promise((resolve) => {
        chrome.storage.local.set({ actionTimestamps: [] }, resolve);
      });
    }
  };
  
  export default RateLimit;