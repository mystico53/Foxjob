// counter.js

const Counter = {
  checkNewDay: function(data) {
    const today = new Date().toDateString();
    return {
      isNewDay: !data.lastDate || data.lastDate !== today,
      today
    };
  },

  increment: function() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['count', 'lastDate'], function(data) {
        const { isNewDay, today } = Counter.checkNewDay(data);
        if (isNewDay) {
          chrome.storage.sync.set({count: 1, lastDate: today}, () => {
            console.log('New day, counter reset to 1');
            resolve(1);
          });
        } else {
          const newCount = (data.count || 0) + 1;
          chrome.storage.sync.set({count: newCount, lastDate: today}, () => {
            console.log('Counter updated to', newCount);
            resolve(newCount);
          });
        }
      });
    });
  },
  
  get: function() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['count', 'lastDate'], function(data) {
        const { isNewDay, today } = Counter.checkNewDay(data);
        if (isNewDay) {
          // Reset count if it's a new day
          chrome.storage.sync.set({count: 0, lastDate: today}, () => {
            console.log('New day detected during get(), counter reset to 0');
            resolve(0);
          });
        } else {
          resolve(data.count || 0);
        }
      });
    });
  },

  reset: function() {
    return new Promise((resolve) => {
      chrome.storage.sync.set({
        count: 0, 
        lastDate: new Date().toDateString()
      }, () => {
        console.log('Counter manually reset to 0');
        resolve();
      });
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
        console.log('Midnight reset executed');
        this.resetAtMidnight(); // Schedule the next reset
      });
    }, msToMidnight);
  }
};

export default Counter;