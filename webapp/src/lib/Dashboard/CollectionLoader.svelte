<script>
	import { onMount } from 'svelte';
	import { FileDropzone } from '@skeletonlabs/skeleton';
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
		onSnapshot
	} from 'firebase/firestore';
	import ExtensionChecker from '$lib/Dashboard/ExtensionChecker.svelte';
	import { setResumeStatus } from '$lib/stores/userStateStore.js';
	import { userStateStore } from '$lib/stores/userStateStore';
	import { tooltipStore } from '$lib/stores/tooltipStore';
	import OnboardingTooltip from '$lib/onboarding/OnboardingTooltip.svelte';

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
				setupResumeListener(); // Move this here
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
		
		const userCollectionsRef = collection(db, 'users', user.uid, 'UserCollections');
		const q = query(
			userCollectionsRef,
			where('type', '==', 'Resume'),
			orderBy('timestamp', 'desc'),
			limit(1)
		);
		
		unsubscribeResumeListener = onSnapshot(q, (snapshot) => {
			console.log('Resume snapshot received:', snapshot.docs.length, 'docs');
			if (!snapshot.empty) {
				const doc = snapshot.docs[0];
				const data = doc.data();
				console.log('Resume data updated:', data.status);
				const timestamp = data.timestamp.toDate();
				updateUIFromData(data, timestamp);
			}
		});
	}

	function updateUIFromData(data, timestamp) {
		currentFileName = data.fileName || 'Unknown';
		
		if (data.status === 'processed' && data.structuredData) {
			resumeUploaded = true;
			resumeStatus = 'processed';
			uploadFeedback = `"${currentFileName}" processed successfully`;
			uploadFeedbackColor = 'variant-filled-surface';
			setResumeStatus(true, currentFileName, timestamp);
		} else if (data.status === 'error') {
			resumeUploaded = false;
			resumeStatus = 'error';
			uploadFeedback = `Error processing "${currentFileName}". Please try again.`;
			uploadFeedbackColor = 'variant-filled-error';
			setResumeStatus(false);
		} else {
			resumeUploaded = true;
			resumeStatus = 'processing';
			uploadFeedback = currentFileName;  // Only change: simplified feedback to just filename
			uploadFeedbackColor = 'variant-filled-surface';  // Changed from warning to surface
			setResumeStatus(true, currentFileName, timestamp);
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
            const timestamp = data.timestamp.toDate();
            currentFileName = data.fileName || 'Unknown';
            
            updateUIFromData(data, timestamp);
        } else {
            uploadFeedback = 'Add your resume to match it with job descriptions';
            resumeUploaded = false;
            setResumeStatus(false);
        }
    } catch (error) {
        console.error('Error checking existing resume:', error);
        uploadFeedback = 'Error checking resume status. Please try again.';
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
				timestamp: serverTimestamp()
			});

			const timestamp = new Date();
			setResumeStatus(true, currentFileName, timestamp);
			uploadFeedback = `Resume "${currentFileName}" successfully uploaded on ${timestamp.toLocaleString()}`;
			uploadFeedbackColor = 'variant-filled-surface';
			resumeUploaded = true;
			tooltipStore.showNavbarTooltip();
		} catch (error) {
			console.error('Error storing extracted text:', error);
			uploadFeedback = 'Error uploading resume. Please try again.';
			uploadFeedbackColor = 'variant-filled-error';
			resumeUploaded = false;
		}
	}

	async function deleteResume() {
		try {
			const userCollectionsRef = collection(db, 'users', user.uid, 'UserCollections');
			const q = query(userCollectionsRef, where('type', '==', 'Resume'));
			const querySnapshot = await getDocs(q);
			setResumeStatus(false);

			if (!querySnapshot.empty) {
				const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
				await Promise.all(deletePromises);

				uploadFeedback = 'Add your resume to match it with job descriptions';

				resumeUploaded = false;
				resumeStatus = '';  // Add this line
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
			{#if resumeStatus === 'processed'}
				<iconify-icon icon="fluent-color:checkmark-circle-16" class="text-2xl"></iconify-icon>
			{:else if resumeStatus === 'processing'}
				<iconify-icon icon="line-md:loading-twotone-loop" class="text-2xl"></iconify-icon>
			{:else if resumeStatus === 'error'}
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
			<div class="relative w-full">
				<FileDropzone
					name="files"
					on:change={handleFiles}
					on:selected={handleFiles}
					on:submit={handleFiles}
					accept=".pdf,application/pdf"
					border="border-2 border-solid border-tertiary-500"
					padding="p-4 py-8"
					rounded="rounded-container-token"
					regionInterface="hover:bg-surface-500/20 transition-colors duration-150"
					class="w-full"
				/>
				<OnboardingTooltip
					title="Step 1"
					description="Upload your resume"
					position="top"
					width="400px"
					offset="1rem"
				/>
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
