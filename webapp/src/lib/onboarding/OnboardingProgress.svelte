<script>
	import { userStateStore } from '../../stores/userStateStore';
</script>

<div class="p-4 text-center">
	{#if $userStateStore.resume.isUploaded}
		<p class="text-success-500">Resume uploaded ✓</p>
	{:else}
		<p class="text-error-500">Resume not uploaded</p>
	{/if}
</div>
