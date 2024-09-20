// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDiiK5-8yzXxhpSV-B-Prm-8FLtlJjeZO8",
    authDomain: "jobille-45494.firebaseapp.com",
    projectId: "jobille-45494",
    storageBucket: "jobille-45494.appspot.com",
    messagingSenderId: "656035288386",
    appId: "1:656035288386:web:d034b9b6afc86f92fba4db",
    measurementId: "G-B9037MYKGY"
};

try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
  
  function signIn() {
    console.log("Sign-in function called");
    
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        updateStatus('Sign-in failed: ' + chrome.runtime.lastError.message);
        return;
      }
      
      if (!token) {
        console.error('No token received');
        updateStatus('Sign-in failed: No token received');
        return;
      }
  
      const credential = firebase.auth.GoogleAuthProvider.credential(null, token);
      firebase.auth().signInWithCredential(credential)
        .then((result) => {
          const user = result.user;
          console.log("Sign-in successful", user);
          chrome.storage.local.set({ userId: user.uid }, () => {
            console.log('User ID saved');
            updateStatus('Signed in successfully');
          });
        })
        .catch((error) => {
          console.error('Sign-in error:', error);
          updateStatus('Sign-in failed: ' + error.message);
        });
    });
  }
  
  // Expose the signIn function to the global scope
  window.signIn = signIn;
  
  // Function to update status (define it here if not already defined in popup.js)
  function updateStatus(message) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
      statusDiv.textContent = message;
    } else {
      console.error('Status div not found');
    }
  }