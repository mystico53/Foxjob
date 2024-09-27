<script>
    import { onMount } from 'svelte';
    import { auth, db } from '$lib/firebase';
    import { collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, orderBy, limit } from 'firebase/firestore';
  
    let dropZone;
    let fileInput;
    let extractedText = '';
    let pdfjsLib;
    let isLibraryLoaded = false;
    let user = null;
    let uploadFeedback = '';
    let uploadFeedbackColor = '';

    onMount(async () => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      document.head.appendChild(script);
  
      script.onload = () => {
        pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        isLibraryLoaded = true;
      };
  
      const unsubscribe = auth.onAuthStateChanged((currentUser) => {
        user = currentUser;
        if (user) {
          checkExistingResume();
        }
      });
  
      return () => unsubscribe();
    });

    async function checkExistingResume() {
      try {
        const userCollectionsRef = collection(db, 'users', user.uid, 'UserCollections');
        const q = query(userCollectionsRef, 
          where("type", "==", "Resume"),
          orderBy("timestamp", "desc"),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const data = doc.data();
          const timestamp = data.timestamp.toDate();
          uploadFeedback = `Resume successfully uploaded on ${timestamp.toLocaleString()}`;
          uploadFeedbackColor = 'green';
        } else {
          uploadFeedback = "Please upload your resume to match it with job descriptions";
          uploadFeedbackColor = 'yellow';
        }
      } catch (error) {
        console.error('Error checking existing resume:', error);
        if (error.code === 'failed-precondition') {
          uploadFeedback = "Database index not set up. Please contact the administrator.";
        } else {
          uploadFeedback = "Error checking resume status. Please try again.";
        }
        uploadFeedbackColor = 'red';
      }
    }

    function handleDragOver(event) {
      event.preventDefault();
    }
  
    function handleDrop(event) {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file && file.type === 'application/pdf') {
        processFile(file);
      }
    }
  
    function handleFileInput(event) {
      const file = event.target.files[0];
      if (file && file.type === 'application/pdf') {
        processFile(file);
      }
    }
  
    async function processFile(file) {
      if (!isLibraryLoaded) {
        console.error('PDF.js library not loaded yet. Please try again in a moment.');
        return;
      }

      if (!user) {
        console.error('User not authenticated');
        return;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const strings = textContent.items.map(item => item.str);
          
          // Group strings that are close together
          const lines = [];
          let currentLine = strings[0] || '';
          
          for (let j = 1; j < strings.length; j++) {
            const prevItem = textContent.items[j - 1];
            const currentItem = textContent.items[j];
            
            if (Math.abs(prevItem.transform[5] - currentItem.transform[5]) < 5) {
              // Items are on the same line
              currentLine += ' ' + strings[j];
            } else {
              // New line
              lines.push(currentLine);
              currentLine = strings[j];
            }
          }
          lines.push(currentLine);
          
          fullText += lines.join('\n') + '\n\n';
        }

        extractedText = fullText.trim();
        console.log(extractedText);

        // Store the extracted text in Firestore
        await storeExtractedText(extractedText);

      } catch (error) {
        console.error('Error processing PDF:', error);
        extractedText = 'Error processing PDF. Please try another file.';
        uploadFeedback = "Error processing PDF. Please try again.";
        uploadFeedbackColor = 'red';
      }
    }

    async function storeExtractedText(text) {
      try {
        const userCollectionsRef = collection(db, 'users', user.uid, 'UserCollections');
        
        // Delete existing resume documents
        const q = query(userCollectionsRef, where("type", "==", "Resume"));
        const querySnapshot = await getDocs(q);
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        // Add new resume document
        const docRef = await addDoc(userCollectionsRef, {
          type: 'Resume',
          extractedText: text,
          timestamp: serverTimestamp()
        });
        console.log('New resume stored successfully');
        
        // Update feedback
        const timestamp = new Date();
        uploadFeedback = `Resume successfully uploaded on ${timestamp.toLocaleString()}`;
        uploadFeedbackColor = 'green';
      } catch (error) {
        console.error('Error storing extracted text:', error);
        uploadFeedback = "Error uploading resume. Please try again.";
        uploadFeedbackColor = 'red';
      }
    }
</script>
  
<div class="container">
  <h1>Match</h1>
  <div 
    bind:this={dropZone}
    on:dragover={handleDragOver}
    on:drop={handleDrop}
    class="drop-zone"
    role="button"
    tabindex="0"
    aria-label="Drop zone for PDF files. Click to select a file or drag and drop here."
    on:keydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        fileInput.click();
      }
    }}
  >
    <p>Drag and drop a PDF file here</p>
    <p>or</p>
    <input 
      type="file" 
      accept=".pdf" 
      on:change={handleFileInput} 
      bind:this={fileInput}
      style="display: none;"
      id="file-input"
    />
    <label for="file-input" class="file-input-label">Choose a file</label>
  </div>
  {#if uploadFeedback}
    <p class="feedback" style="color: {uploadFeedbackColor};">{uploadFeedback}</p>
  {/if}
  {#if extractedText}
    <div class="extracted-text">
      <h2>Extracted Text:</h2>
      <pre>{extractedText}</pre>
    </div>
  {/if}
</div>
  
<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }

  .drop-zone {
    border: 2px dashed #ccc;
    border-radius: 20px;
    width: 100%;
    padding: 20px;
    text-align: center;
    cursor: pointer;
  }

  .drop-zone:hover, .drop-zone:focus {
    background-color: #f0f0f0;
    outline: none;
  }

  .file-input-label {
    display: inline-block;
    padding: 10px 20px;
    background-color: #4CAF50;
    color: white;
    cursor: pointer;
    border-radius: 5px;
  }

  .extracted-text {
    margin-top: 20px;
    border: 1px solid #ccc;
    padding: 10px;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .feedback {
    margin-top: 10px;
    font-weight: bold;
  }
</style>