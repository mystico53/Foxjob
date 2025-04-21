<script>
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase';
	import { 
		collection,
		addDoc,
		serverTimestamp,
		query,
		where,
		getDocs,
		deleteDoc,
		orderBy,
		limit,
		onSnapshot,
		doc,
		updateDoc
	} from 'firebase/firestore';
	import { 
		setResumeStatus, 
		setQuestionsStatus,
		setWorkPreferencesLoading, 
		setQuestionsAvailable,
		setSavedAnswer,
		userStateStore 
	} from '$lib/stores/userStateStore';
	import { tooltipStore } from '$lib/stores/tooltipStore';
	import PreferenceProgressCounter from '$lib/preferences/PreferenceProgressCounter.svelte';

	let pdfjsLib;
	let isLibraryLoaded = false;
	let user = null;
	let uploadFeedback = '';
	let uploadFeedbackColor = 'variant-filled-surface';
	let resumeUploaded = false;
	let extractedText = '';
	let currentFileName = '';
	let resumeStatus = '';
	let unsubscribeResumeListener = null;
	let fileInput;

	onMount(async () => {
		const script = document.createElement('script');
		script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
		document.head.appendChild(script);

		script.onload = () => {
			pdfjsLib = window['pdfjs-dist/build/pdf'];
			pdfjsLib.GlobalWorkerOptions.workerSrc =
				'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
			isLibraryLoaded = true;
		};

		const unsubscribe = auth.onAuthStateChanged((currentUser) => {
			user = currentUser;
			if (user) {
				checkExistingResume();
				setupResumeListener();
			} else {
				// Cleanup if user logs out
				if (unsubscribeResumeListener) {
					unsubscribeResumeListener();
					unsubscribeResumeListener = null;
				}
			}
		});
		
		// Combine both cleanup functions into a single return
		return () => {
			unsubscribe();
			if (unsubscribeResumeListener) unsubscribeResumeListener();
		};
	});

	async function setupResumeListener() {
		if (!user) {
			console.log('No user, not setting up listener');
			return;
		}
		
		console.log('Setting up resume listener for user:', user.uid);
		
		// Resume listener
		const userCollectionsRef = collection(db, 'users', user.uid, 'UserCollections');
		const resumeQuery = query(
			userCollectionsRef,
			where('type', '==', 'Resume'),
			orderBy('timestamp', 'desc'),
			limit(1)
		);
		
		// Work preferences listener
		const workPreferencesRef = doc(db, 'users', user.uid, 'UserCollections', 'work_preferences');
		
		// Set up resume listener
		const resumeUnsubscribe = onSnapshot(resumeQuery, (snapshot) => {
			if (!snapshot.empty) {
				const doc = snapshot.docs[0];
				const data = doc.data();
				// Pass data directly to updateUIFromData and let it handle timestamp safely
				updateUIFromData(data, null);
			}
		});
		
		// Set up work preferences listener
		const workPrefsUnsubscribe = onSnapshot(workPreferencesRef, (docSnapshot) => {
			if (docSnapshot.exists()) {
				const data = docSnapshot.data();
				
				// Update the store based on document status
				if (data.status === 'pending') {
					setQuestionsStatus('pending');
					setQuestionsAvailable(false);
				} else if (data.status === 'error') {
					setQuestionsStatus('error');
					setQuestionsAvailable(false);
				} else {
					// Check if questions are actually available
					const hasQuestions = data.question1 && 
									   data.question2 && 
									   data.question3 && 
									   data.question4 && 
									   data.question5;
					
					if (hasQuestions) {
						setQuestionsStatus('ready');
						setQuestionsAvailable(true);
					}
				}
			} else {
				// Document doesn't exist yet
				console.log('Work preferences document does not exist yet');
				setQuestionsStatus('');
				setQuestionsAvailable(false);
			}
		}, (error) => {
			console.error('Error listening to work preferences:', error);
			setQuestionsStatus('error');
		});
		
		// Combined cleanup function
		const originalUnsubscribe = unsubscribeResumeListener;
		unsubscribeResumeListener = () => {
			resumeUnsubscribe();
			workPrefsUnsubscribe();
			if (originalUnsubscribe) originalUnsubscribe();
		};
	}

	function updateUIFromData(data, timestamp) {
		currentFileName = data.fileName || 'Unknown';
		
		// Convert timestamp safely
		let formattedTimestamp = null;
		if (timestamp) {
			// If it's already a Date object
			formattedTimestamp = timestamp;
		} else if (data.timestamp && typeof data.timestamp.toDate === 'function') {
			// If it's a Firestore timestamp
			formattedTimestamp = data.timestamp.toDate();
		}
		
		if (data.status === 'processed' && data.structuredData) {
			resumeUploaded = true;
			resumeStatus = 'processed';
			uploadFeedback = `"${currentFileName}" processed successfully`;
			uploadFeedbackColor = 'variant-filled-surface';
			setResumeStatus(true, currentFileName, formattedTimestamp, 'processed');
			setWorkPreferencesLoading(false);
		} else if (data.status === 'error') {
			resumeUploaded = false;
			resumeStatus = 'error';
			uploadFeedback = `Error processing "${currentFileName}". Please try again.`;
			uploadFeedbackColor = 'variant-filled-error';
			setResumeStatus(false, currentFileName, formattedTimestamp, 'error');
		} else {
			resumeUploaded = true;
			resumeStatus = 'processing';
			uploadFeedback = currentFileName;
			uploadFeedbackColor = 'variant-filled-surface';
			setResumeStatus(true, currentFileName, formattedTimestamp, 'processing');
		}
	}

	async function checkExistingResume() {
		try {
			const userCollectionsRef = collection(db, 'users', user.uid, 'UserCollections');
			const q = query(
				userCollectionsRef,
				where('type', '==', 'Resume'),
				orderBy('timestamp', 'desc'),
				limit(1)
			);
			const querySnapshot = await getDocs(q);

			if (!querySnapshot.empty) {
				const doc = querySnapshot.docs[0];
				const data = doc.data();
				currentFileName = data.fileName || 'Unknown';
				
				// Simply pass data to updateUIFromData and let it handle timestamp
				updateUIFromData(data, null);
			} else {
				uploadFeedback = 'Add your resume to match it with job descriptions';
				resumeUploaded = false;
				setResumeStatus(false, '', null, '');
			}
		} catch (error) {
			console.error('Error checking existing resume:', error);
			uploadFeedback = 'Error checking resume status. Please try again.';
			uploadFeedbackColor = 'variant-filled-error';
			resumeUploaded = false;
			setResumeStatus(false, '', null, 'error');
		}
	}

	// Function to trigger file input click
	function triggerFileInput() {
		if (fileInput) {
			fileInput.click();
		}
	}

	async function handleFiles(event) {
		const fileInputElement = event.target;
		if (fileInputElement && fileInputElement.files && fileInputElement.files.length > 0) {
			const file = fileInputElement.files[0];
			currentFileName = file.name;
			console.log('File selected:', file);
			if (file.type === 'application/pdf') {
				await processFile(file);
			} else {
				uploadFeedback = 'Please upload a PDF file';
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
				const strings = textContent.items.map((item) => item.str);

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
			uploadFeedback = 'Error processing PDF. Please try again.';
			uploadFeedbackColor = 'variant-filled-error';
		}
	}

	async function storeExtractedText(text) {
		try {
			const userCollectionsRef = collection(db, 'users', user.uid, 'UserCollections');

			const q = query(userCollectionsRef, where('type', '==', 'Resume'));
			const querySnapshot = await getDocs(q);
			const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
			await Promise.all(deletePromises);

			await addDoc(userCollectionsRef, {
				type: 'Resume',
				extractedText: text,
				fileName: currentFileName,
				timestamp: serverTimestamp(),
				status: 'processing' // Add initial processing status
			});

			const timestamp = new Date();
			setResumeStatus(true, currentFileName, timestamp, 'processing');
			
			// Reset work preferences status to pending since we uploaded a new resume
			setQuestionsStatus('pending');
			setQuestionsAvailable(false);
			
			uploadFeedback = `Uploading "${currentFileName}", please wait while processing...`;
			uploadFeedbackColor = 'variant-filled-surface';
			resumeUploaded = true;
			resumeStatus = 'processing';
			tooltipStore.showNavbarTooltip();
		} catch (error) {
			console.error('Error storing extracted text:', error);
			uploadFeedback = 'Error uploading resume. Please try again.';
			uploadFeedbackColor = 'variant-filled-error';
			resumeUploaded = false;
			setResumeStatus(false, '', null, 'error');
		}
	}

	async function deleteResume() {
		try {
			const userCollectionsRef = collection(db, 'users', user.uid, 'UserCollections');
			
			// 1. Update store state first
			setResumeStatus(false, '', null, '');
			setQuestionsStatus('');
			setQuestionsAvailable(false);
			
			// Reset all saved answers to false
			setSavedAnswer(1, false);
			setSavedAnswer(2, false);
			setSavedAnswer(3, false);
			setSavedAnswer(4, false);
			setSavedAnswer(5, false);

			// 2. Delete the work_preferences document completely
			const workPreferencesRef = doc(db, 'users', user.uid, 'UserCollections', 'work_preferences');
			try {
				await deleteDoc(workPreferencesRef);
				console.log("Work preferences document deleted successfully");
			} catch (error) {
				console.error("Error deleting work preferences:", error);
			}

			// 3. Delete the resume document
			const q = query(userCollectionsRef, where('type', '==', 'Resume'));
			const querySnapshot = await getDocs(q);

			if (!querySnapshot.empty) {
				const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
				await Promise.all(deletePromises);

				uploadFeedback = 'Add your resume to match it with job descriptions';
				
				resumeUploaded = false;
				resumeStatus = '';
				extractedText = '';
				currentFileName = '';
			} else {
				uploadFeedback = 'No resume found to delete';
				uploadFeedbackColor = 'variant-filled-warning';
			}
		} catch (error) {
			console.error('Error deleting resume:', error);
			uploadFeedback = 'Error deleting resume. Please try again.';
			uploadFeedbackColor = 'variant-filled-error';
		}
	}
</script>

<div class="flex h-full w-full flex-col">
	<div class="flex items-center justify-between py-2">
		<h2 class="m-0 text-xl font-bold">Your resume</h2>
		{#if resumeUploaded}
		<div>
			<!-- Show checkmark as soon as resume is uploaded -->
			<iconify-icon icon="fluent-color:checkmark-circle-16" class="text-2xl"></iconify-icon>
			{#if resumeStatus === 'error'}
				<iconify-icon icon="fluent:error-circle-12-filled" class="text-2xl text-error-500"></iconify-icon>
			{/if}
			<button on:click={deleteResume}>
				<iconify-icon icon="solar:trash-bin-minimalistic-bold" class="text-2xl"></iconify-icon>
			</button>
		</div>
		{/if}
	</div>
	<div class="flex flex-1 flex-col items-center justify-center">
		{#if !$userStateStore.resume.isUploaded}
			<div class="relative w-full flex justify-center">
				<!-- Hidden file input -->
				<input
					bind:this={fileInput}
					type="file"
					accept=".pdf,application/pdf"
					on:change={handleFiles}
					class="hidden"
				/>
				
				<!-- Primary button to trigger file selection -->
				<button
					on:click={triggerFileInput}
					class="btn variant-filled-primary"
				>
					Upload Resume
				</button>
			</div>
		{/if}

		{#if uploadFeedback}
			<div
				class="alert {uploadFeedbackColor} mt-4 flex w-full flex-col items-center gap-2 text-center"
			>
				{#if resumeUploaded}
					<iconify-icon
						icon="healthicons:i-documents-accepted-outline"
						class="text-6xl text-gray-500"
					></iconify-icon>
				{:else}
					<iconify-icon icon="ep:document" class="text-6xl text-gray-500"></iconify-icon>
				{/if}
				<p>{uploadFeedback}</p>
			</div>
		{/if}
	</div>
</div>

<style>
</style>