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
          updateStatus('Sign-in failed: ' + chrome.runtime.lastError.message, isLoading, false);
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
                  updateStatus('Signed in successfully', false);
                  updateSignInButtonState(true);
              });
          })
          .catch((error) => {
              console.error('Sign-in error:', error);
              updateStatus('Sign-in failed: ' + error.message, false);
          });
  });
}

function signOut() {
  console.log("Sign-out function called");

  firebase.auth().signOut().then(() => {
      console.log('User signed out from Firebase');
      chrome.identity.clearAllCachedAuthTokens(() => {
          console.log('Cleared all cached auth tokens');
          chrome.storage.local.remove('userId', () => {
              console.log('User ID removed from storage');
              updateStatus('Signed out successfully', false);
              updateSignInButtonState(false);
          });
      });
  }).catch((error) => {
      console.error('Sign-out error:', error);
      updateStatus('Sign-out failed: ' + error.message, false);
  });
}

function updateSignInButtonState(isSignedIn) {
  const signInOutButton = document.getElementById('signInOutButton');
  if (signInOutButton) {
    signInOutButton.textContent = isSignedIn ? 'Sign Out' : 'Sign In';
  } else {
    console.error('Sign in/out button not found');
  }
}

// Function to update status (define it here if not already defined in popup.js)
function updateStatus(message) {
  const statusDiv = document.getElementById('status');
  if (statusDiv) {
      statusDiv.textContent = message;
  } else {
      console.error('Status div not found');
  }
}

function saveApiPreference(apiType) {
  chrome.storage.local.set({ preferredApi: apiType }, () => {
    console.log('API preference saved:', apiType);
  });
}

function loadApiPreference() {
  chrome.storage.local.get(['preferredApi'], (result) => {
    const apiSelector = document.getElementById('apiSelector');
    if (apiSelector && result.preferredApi) {
      apiSelector.value = result.preferredApi;
      // Trigger the change event to update the UI
      apiSelector.dispatchEvent(new Event('change'));
    }
  });
}

// Expose the signIn and signOut functions to the global scope
window.signIn = signIn;
window.signOut = signOut;

// Check initial auth state
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    console.log('User is signed in');
    updateSignInButtonState(true);
  } else {
    console.log('User is signed out');
    updateSignInButtonState(false);
  }
  loadApiPreference();
});