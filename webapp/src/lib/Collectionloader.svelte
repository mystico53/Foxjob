<script>
    import { onMount } from 'svelte';
    import { FileDropzone } from '@skeletonlabs/skeleton';
    import { auth, db } from '$lib/firebase';
    import { collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, orderBy, limit } from 'firebase/firestore';
  
    let pdfjsLib;
    let isLibraryLoaded = false;
    let user = null;
    let uploadFeedback = '';
    let uploadFeedbackColor = 'variant-filled-surface';
    let resumeUploaded = false;
    let extractedText = '';
    let currentFileName = '';

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
                currentFileName = data.fileName || 'Unknown';
                uploadFeedback = `Resume "${currentFileName}" successfully uploaded on ${timestamp.toLocaleString()}`;
                uploadFeedbackColor = 'variant-filled-success';
                resumeUploaded = true;
            } else {
                uploadFeedback = "Please upload your resume to match it with job descriptions";
                uploadFeedbackColor = 'variant-filled-warning';
                resumeUploaded = false;
            }
        } catch (error) {
            console.error('Error checking existing resume:', error);
            uploadFeedback = "Error checking resume status. Please try again.";
            uploadFeedbackColor = 'variant-filled-error';
            resumeUploaded = false;
        }
    }

    async function handleFiles(event) {
        const fileInput = event.target;
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            currentFileName = file.name;
            console.log('File selected:', file);
            if (file.type === 'application/pdf') {
                await processFile(file);
            } else {
                uploadFeedback = "Please upload a PDF file";
                uploadFeedbackColor = 'variant-filled-error';
            }
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
                
                const lines = [];
                let currentLine = strings[0] || '';
                
                for (let j = 1; j < strings.length; j++) {
                    const prevItem = textContent.items[j - 1];
                    const currentItem = textContent.items[j];
                    
                    if (Math.abs(prevItem.transform[5] - currentItem.transform[5]) < 5) {
                        currentLine += ' ' + strings[j];
                    } else {
                        lines.push(currentLine);
                        currentLine = strings[j];
                    }
                }
                lines.push(currentLine);
                fullText += lines.join('\n') + '\n\n';
            }

            extractedText = fullText.trim();
            await storeExtractedText(extractedText);

        } catch (error) {
            console.error('Error processing PDF:', error);
            extractedText = 'Error processing PDF. Please try another file.';
            uploadFeedback = "Error processing PDF. Please try again.";
            uploadFeedbackColor = 'variant-filled-error';
        }
    }

    async function storeExtractedText(text) {
        try {
            const userCollectionsRef = collection(db, 'users', user.uid, 'UserCollections');
            
            const q = query(userCollectionsRef, where("type", "==", "Resume"));
            const querySnapshot = await getDocs(q);
            const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);

            await addDoc(userCollectionsRef, {
                type: 'Resume',
                extractedText: text,
                fileName: currentFileName,
                timestamp: serverTimestamp()
            });
            
            const timestamp = new Date();
            uploadFeedback = `Resume "${currentFileName}" successfully uploaded on ${timestamp.toLocaleString()}`;
            uploadFeedbackColor = 'variant-filled-success';
            resumeUploaded = true;
        } catch (error) {
            console.error('Error storing extracted text:', error);
            uploadFeedback = "Error uploading resume. Please try again.";
            uploadFeedbackColor = 'variant-filled-error';
            resumeUploaded = false;
        }
    }

    async function deleteResume() {
        try {
            const userCollectionsRef = collection(db, 'users', user.uid, 'UserCollections');
            const q = query(userCollectionsRef, where("type", "==", "Resume"));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all(deletePromises);
                
                uploadFeedback = `Resume "${currentFileName}" deleted successfully`;
                uploadFeedbackColor = 'variant-filled-success';
                resumeUploaded = false;
                extractedText = '';
                currentFileName = '';
            } else {
                uploadFeedback = "No resume found to delete";
                uploadFeedbackColor = 'variant-filled-warning';
            }
        } catch (error) {
            console.error('Error deleting resume:', error);
            uploadFeedback = "Error deleting resume. Please try again.";
            uploadFeedbackColor = 'variant-filled-error';
        }
    }
</script>

<div class="card p-4 w-full max-w-sm">
    <h2 class="text-[20px] font-bold">Your resume</h2>
    {#if !resumeUploaded}
        <FileDropzone 
            name="files" 
            on:change={handleFiles} 
            on:selected={handleFiles} 
            on:submit={handleFiles} 
            accept=".pdf,application/pdf"
            border="border-2 border-dashed border-primary-500"
            padding="p-4 py-8"
            rounded="rounded-container-token"
            regionInterface="hover:bg-surface-500/20 transition-colors duration-150"
        />
    {/if}
    
    {#if uploadFeedback}
        <div class="alert {uploadFeedbackColor} mt-4">
            <p>{uploadFeedback}</p>
        </div>
    {/if}
    
    {#if resumeUploaded}
        <button on:click={deleteResume} class="btn variant-ghost-tertiary btn-sm mt-2 w-full">
            Delete Resume
        </button>
    {/if}
</div>

<style>
</style>