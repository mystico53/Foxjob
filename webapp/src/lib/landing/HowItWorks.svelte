<!-- HowItWorks.svelte -->
<script>
    import demoVideo from '../../assets/demovid.webm';
    
    const steps = [
        {
            number: 1,
            title: 'Set up',
            description: 'Upload your resume and install our Chrome extension (takes 32 secs).'
        },
        {
            number: 2,
            title: 'Scan away!',
            description: 'Analyse any job description with a buttonpress, no more reading.'
        },
        {
            number: 3,
            title: 'Your score',
            description: 'Only three out of 25 jobs are a match, focus on those.'
        }
    ];

    let video;
    let isPlaying = false;

    function togglePlay() {
        if (video) {
            if (isPlaying) {
                video.pause();
            } else {
                video.play();
            }
            isPlaying = !isPlaying;
        }
    }

    function handleVideoLoad() {
        if (video) {
            video.play().catch(err => {
                console.log('Auto-play prevented:', err);
            });
        }
    }
</script>

<div class="bg-tertiary-300 container mx-auto px-4 py-16">
    <h2 class="h2 mb-12 py-8 text-center font-bold">How we match you</h2>

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
    <div class="mx-auto max-w-4xl">
        <div class="relative w-full overflow-hidden rounded-lg shadow-lg">
            <video
                bind:this={video}
                class="w-full"
                on:click={togglePlay}
                on:loadeddata={handleVideoLoad}
                loop
                muted
                playsinline
                src={demoVideo}
            >
                Your browser does not support the video tag.
            </video>

            <!-- Play/Pause Overlay -->
            <button
                class="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity duration-300"
                on:click={togglePlay}
            >
                <iconify-icon
                    icon={isPlaying ? "mdi:pause-circle" : "mdi:play-circle"}
                    class="text-white text-6xl"
                ></iconify-icon>
            </button>
        </div>
    </div>
</div>