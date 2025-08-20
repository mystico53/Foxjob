<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let resumeData = null;
	export let uploading = false;

	let pdfjsLib;
	let isLibraryLoaded = false;
	let fileInput;
	let error = null;

	// Initialize PDF.js library
	async function initPdfJs() {
		if (isLibraryLoaded) return;

		return new Promise((resolve) => {
			const script = document.createElement('script');
			script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
			document.head.appendChild(script);

			script.onload = () => {
				pdfjsLib = window['pdfjs-dist/build/pdf'];
				pdfjsLib.GlobalWorkerOptions.workerSrc =
					'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
				isLibraryLoaded = true;
				resolve();
			};
		});
	}

	// Trigger file input click
	function triggerFileInput(event) {
		// Prevent form submission
		event.preventDefault();
		event.stopPropagation();
		
		if (fileInput) {
			fileInput.click();
		}
	}

	// Handle file selection
	async function handleFiles(event) {
		// Prevent form submission
		event.preventDefault();
		event.stopPropagation();
		
		const fileInputElement = event.target;
		if (fileInputElement && fileInputElement.files && fileInputElement.files.length > 0) {
			const file = fileInputElement.files[0];

			if (file.type === 'application/pdf') {
				await processFile(file);
			} else {
				error = 'Please upload a PDF file';
			}
		}
	}

	// Process PDF file
	async function processFile(file) {
		if (!isLibraryLoaded) {
			await initPdfJs();
		}

		uploading = true;
		error = null;

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

			const extractedText = fullText.trim();
			const timestamp = new Date();

			resumeData = {
				extractedText,
				fileName: file.name,
				timestamp,
				status: 'processed'
			};

			// Dispatch event to parent component
			dispatch('resumeUploaded', resumeData);
		} catch (err) {
			console.error('Error processing PDF:', err);
			error = 'Error processing PDF. Please try another file.';
		} finally {
			uploading = false;
		}
	}

	// Remove resume
	function removeResume(event) {
		// Prevent form submission
		event.preventDefault();
		event.stopPropagation();
		
		resumeData = null;
		error = null;
		if (fileInput) {
			fileInput.value = '';
		}
		dispatch('resumeRemoved');
	}
</script>

<div class="compact-resume-uploader">
	<!-- Hidden file input -->
	<input
		bind:this={fileInput}
		id="resume-upload"
		type="file"
		accept=".pdf,application/pdf"
		on:change={handleFiles}
		class="hidden"
	/>

	<div class="flex h-16 items-center rounded-lg border border-gray-300 bg-white px-4">
		{#if !resumeData}
			<!-- Upload state -->
			<div class="flex flex-grow items-center">
				<iconify-icon icon="ep:document" class="mr-3 text-2xl text-gray-400"></iconify-icon>
				<div class="flex-grow">
					<p class="text-sm font-medium text-gray-700">Upload your resume</p>
					<p class="text-xs text-gray-500">PDF format required</p>
				</div>
			</div>
			<button
				type="button"
				on:click={triggerFileInput}
				disabled={uploading}
				class="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:bg-orange-400"
			>
				{#if uploading}
					<iconify-icon icon="svg-spinners:pulse" width="16" height="16"></iconify-icon>
				{:else}
					Browse
				{/if}
			</button>
		{:else}
			<!-- Uploaded state -->
			<div class="flex flex-grow items-center">
				<iconify-icon icon="fluent-color:checkmark-circle-16" class="mr-3 text-2xl"></iconify-icon>
				<div class="flex-grow">
					<p class="text-sm font-medium text-gray-700">{resumeData.fileName}</p>
					<p class="text-xs text-gray-500">Resume uploaded successfully</p>
				</div>
			</div>
			<button
				type="button"
				on:click={removeResume}
				class="rounded-lg bg-gray-300 p-2 text-gray-700 hover:bg-gray-400"
				title="Remove resume"
			>
				<iconify-icon icon="solar:trash-bin-minimalistic-bold" width="16" height="16"
				></iconify-icon>
			</button>
		{/if}
	</div>

	{#if error}
		<div class="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">
			{error}
		</div>
	{/if}
</div>

<style>
	.compact-resume-uploader {
		width: 100%;
	}
</style>
