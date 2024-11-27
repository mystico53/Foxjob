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
          // Calculate wait time until oldest timestamp expires
          const oldestValidTimestamp = timestamps[0];
          const waitTimeMs = oldestValidTimestamp + 60000 - now;
          const waitTimeSec = Math.ceil(waitTimeMs / 1000);
          
          console.log(`Only three jobs/minute during testing. Come back in ${waitTimeSec} sec!`);
          
          // Store filtered timestamps anyway to maintain cleanup
          chrome.storage.local.set({ actionTimestamps: timestamps });
          resolve({
            allowed: false,
            waitTime: waitTimeSec
          });
          return;
        }
        
        // Add new timestamp and store
        timestamps.push(now);
        chrome.storage.local.set({ actionTimestamps: timestamps }, () => {
          console.log(`Action tracked. Actions in last minute: ${timestamps.length}`);
          resolve({
            allowed: true,
            waitTime: 0
          });
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