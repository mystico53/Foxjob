<script>
    import { onMount } from 'svelte';
    import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
    import { app, auth as importedAuth } from '$lib/firebase.js';
  
    let auth;
    let provider;
  
    onMount(() => {
      // Initialize Firebase Auth
      
      auth = importedAuth || getAuth(app);
      provider = new GoogleAuthProvider();
  
      // Reference to the parent frame's origin
      const parentOrigin = 'chrome-extension://jednpafjmjheknpcfgijkhklhmnifdln'; // TODO: Replace with your actual extension ID
  
      // Function to send response back to the parent frame
      function sendResponse(result) {
        window.parent.postMessage(JSON.stringify(result), parentOrigin);
      }
  
      // Listen for messages from the parent frame to initiate authentication
      window.addEventListener('message', function(event) {
        const { data } = event;
  
        if (data.initAuth) {
          signInWithPopup(auth, provider)
            .then((userCredential) => {
              // Successful authentication
              sendResponse({ user: userCredential.user });
            })
            .catch((error) => {
              // Handle Errors here.
              sendResponse({ error: { code: error.code, message: error.message } });
            });
        }
      });
    });
  </script>
  
  <main>
    <h1>Authenticating...</h1>
  </main>