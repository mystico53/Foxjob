// counter.js

const Counter = {
    increment: function() {
        console.log('Counter.increment called');
        return new Promise((resolve) => {
          chrome.storage.sync.get(['count', 'lastDate'], function(data) {
            console.log('Current data:', data);
            const today = new Date().toDateString();
            if (data.lastDate !== today) {
              console.log('New day, resetting counter');
              chrome.storage.sync.set({count: 1, lastDate: today}, () => {
                console.log('Counter reset to 1');
                resolve(1);
              });
            } else {
              const newCount = (data.count || 0) + 1;
              console.log('Incrementing counter to', newCount);
              chrome.storage.sync.set({count: newCount, lastDate: today}, () => {
                console.log('Counter updated to', newCount);
                resolve(newCount);
              });
            }
          });
        });
      },
    
      get: function() {
        console.log('Counter.get called');
        return new Promise((resolve) => {
          chrome.storage.sync.get(['count'], function(data) {
            console.log('Current count:', data.count || 0);
            resolve(data.count || 0);
          });
        });
      },
  
    reset: function() {
      return new Promise((resolve) => {
        chrome.storage.sync.set({count: 0, lastDate: new Date().toDateString()}, resolve);
      });
    },
  
    resetAtMidnight: function() {
      const now = new Date();
      const night = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1, // the next day
        0, 0, 0 // at 00:00:00 hours
      );
      const msToMidnight = night.getTime() - now.getTime();
  
      setTimeout(() => {
        this.reset().then(() => {
          this.resetAtMidnight(); // Schedule the next reset
        });
      }, msToMidnight);
    }
  };
  
  // Export the Counter object
  export default Counter;