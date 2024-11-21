<!-- OnboardingProgress.svelte -->
<script>
	import { userStateStore } from '$lib/stores/userStateStore.js';
	import { ProgressBar } from '@skeletonlabs/skeleton';

	$: progressValue =
		$userStateStore.resume.isUploaded &&
		($userStateStore.extension.isProductionInstalled || $userStateStore.extension.isDevInstalled)
			? 100
			: $userStateStore.resume.isUploaded ||
				  $userStateStore.extension.isProductionInstalled ||
				  $userStateStore.extension.isDevInstalled
				? 50
				: 0;

	$: statusMessage = (() => {
		const resumeStatus = $userStateStore.resume.isUploaded
			? '✓ Resume uploaded'
			: '⨯ Upload your resume';
		const extensionStatus = $userStateStore.extension.checkComplete
			? $userStateStore.extension.isProductionInstalled || $userStateStore.extension.isDevInstalled
				? '✓ Extension installed'
				: '⨯ Install the extension'
			: 'Checking extension...';

		if (progressValue === 100) {
			return "All set! You're ready to go!";
		}

		return `${resumeStatus} • ${extensionStatus}`;
	})();
</script>

<div class="space-y-4 p-4 text-center">
	<div class="space-y-2">
		<ProgressBar
			value={progressValue}
			max={100}
			class="!bg-surface-500/30"
			meter={progressValue === 100 ? 'bg-success-500' : 'bg-primary-500'}
		/>
		<p class={progressValue === 100 ? 'text-success-500' : 'text-primary-500'}>
			{statusMessage}
		</p>
	</div>
</div>
