<!-- HowItWorks.svelte -->
<script>
	import { onDestroy } from 'svelte';
	import demoVideo from '../../assets/demovid.webm';

	const steps = [
		{
			number: 1,
			title: 'Upload your resume',
			description: ''
		},
		{
			number: 2,
			title: 'Setup your agent',
			description: ''
		},
		{
			number: 3,
			title: 'Daily matches in your inbox',
			description: ''
		}
	];

	let video;
	let isPlaying = false;
	let isMuted = true;
	let progress = 0;
	let duration = 0;
	let animationFrameId;

	function togglePlay(event) {
		event.preventDefault();
		if (video) {
			if (isPlaying) {
				video.pause();
			} else {
				video.play().catch((error) => {
					console.error('Play failed:', error);
				});
			}
			isPlaying = !isPlaying;
		}
	}

	function toggleMute(event) {
		event.preventDefault();
		if (video) {
			video.muted = !video.muted;
			isMuted = video.muted;
		}
	}

	function stopVideo(event) {
		event.preventDefault();
		if (video) {
			video.pause();
			video.currentTime = 0;
			isPlaying = false;
		}
	}

	function handleVideoStateChange() {
		isPlaying = !video.paused;
	}

	function updateProgress() {
		if (video) {
			animationFrameId = requestAnimationFrame(() => {
				progress = (video.currentTime / video.duration) * 100;
			});
		}
	}

	function handleTimelineClick(event) {
		const rect = event.currentTarget.getBoundingClientRect();
		const clickPosition = (event.clientX - rect.left) / rect.width;
		if (video) {
			video.currentTime = clickPosition * video.duration;
		}
	}

	onDestroy(() => {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
	});
</script>

<div class="bg-tertiary-300 container mx-auto px-4 py-16">
	<h2 class="h2 mb-12 py-8 text-center font-bold">How it works (Video needs to be updated)</h2>

	<div class="mb-12 grid grid-cols-1 gap-8 px-8 md:grid-cols-3">
		{#each steps as step}
			<div class="flex flex-col items-start px-8">
				<div class="mb-4 flex items-center gap-4">
					<iconify-icon icon="fluent-color:checkmark-circle-16" class="text-2xl"></iconify-icon>
					<h3 class="font-base">
						<span class="font-semibold">Step {step.number}: </span>
						<span class="font-medium">{step.title}</span>
					</h3>
				</div>
				<p class="text-base">{step.description}</p>
			</div>
		{/each}
	</div>

	<!-- Demo Video Area -->
	<div class="mx-auto max-w-4xl" role="region" aria-label="Video player">
		<div class="relative w-full overflow-hidden rounded-lg shadow-lg">
			<!-- svelte-ignore a11y-media-has-caption -->
			<video
				bind:this={video}
				bind:duration
				class="w-full cursor-pointer"
				on:click={togglePlay}
				on:play={handleVideoStateChange}
				on:pause={handleVideoStateChange}
				on:ended={handleVideoStateChange}
				on:timeupdate={updateProgress}
				loop
				playsinline
				src={demoVideo}
				aria-label="Demo video"
			>
				<track kind="captions" src="path/to/captions.vtt" label="English captions" />
				Your browser does not support the video tag.
			</video>

			<!-- Progress Bar -->
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<div
				class="group absolute bottom-0 left-0 right-0 h-1 cursor-pointer bg-gray-600/50"
				on:click={handleTimelineClick}
				on:keydown={e => {
					if (e.key === 'ArrowRight') {
						if (video) video.currentTime += 5;
					} else if (e.key === 'ArrowLeft') {
						if (video) video.currentTime -= 5;
					}
				}}
				role="slider"
				tabindex="0"
				aria-label="Video progress"
				aria-valuemin="0"
				aria-valuemax="100"
				aria-valuenow={progress}
				aria-valuetext={`${Math.round(progress)}%`}
			>
				<div
					class="h-full bg-white/90 transition-[width] duration-300 ease-linear"
					style="width: {progress}%"
					aria-hidden="true"
				></div>
				<div
					class="absolute bottom-0 left-0 right-0 h-1 scale-y-0 transform bg-white/10 transition-transform duration-200 group-hover:scale-y-100"
					aria-hidden="true"
				></div>
			</div>

			<!-- Controls Overlay -->
			<div class="absolute bottom-4 right-4 flex items-center rounded-full bg-black/40" role="toolbar" aria-label="Video controls">
				<!-- Volume Control -->
				<button
					type="button"
					class="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-black/20"
					on:click={toggleMute}
					aria-label={video?.muted ? "Unmute video" : "Mute video"}
					aria-pressed={video?.muted}
				>
					<iconify-icon icon={video?.muted ? 'mdi:volume-off' : 'mdi:volume-high'} class="text-lg" aria-hidden="true"
					></iconify-icon>
				</button>

				<!-- Stop Button -->
				<button
					type="button"
					class="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-black/20"
					on:click={stopVideo}
					aria-label="Stop video"
				>
					<iconify-icon icon="mdi:stop" class="text-lg" aria-hidden="true"></iconify-icon>
				</button>

				<!-- Play/Pause Button -->
				<button
					type="button"
					class="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-black/20"
					on:click={togglePlay}
					aria-label={isPlaying ? "Pause video" : "Play video"}
					aria-pressed={isPlaying}
				>
					<iconify-icon icon={isPlaying ? 'mdi:pause' : 'mdi:play'} class="text-lg" aria-hidden="true"></iconify-icon>
				</button>
			</div>

			<!-- Center Play Button (shown when paused) -->
			{#if !isPlaying}
				<button
					type="button"
					class="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
					on:click={togglePlay}
					aria-label="Play video"
				>
					<iconify-icon icon="mdi:play-circle" class="text-6xl text-white" aria-hidden="true"></iconify-icon>
				</button>
			{/if}
		</div>
	</div>
</div>
