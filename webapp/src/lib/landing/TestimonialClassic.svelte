<script>
	export let text = 'Imagine if someone actually read your resume before suggesting jobs.';
	export let name = 'John Doe, 42, Job Seeker';
	export let avatar = '/images/avatar-placeholder.png';
</script>

<div class="flex w-full flex-col items-center justify-center px-0 py-12">
	<div
		class="flex w-[90%] flex-col items-center rounded-xl bg-white px-4 py-8 shadow-lg dark:bg-gray-900 md:flex-row md:px-16"
	>
		<!-- Left: Testimonial Text -->
		<div class="flex flex-1 flex-col items-center px-6 text-center md:items-start md:text-left">
			<blockquote class="m-12 text-2xl italic leading-relaxed text-gray-800 dark:text-gray-200">
				"{text}"
			</blockquote>
		</div>
		<!-- Right: Avatar and Name -->
		<div class="mt-4 flex flex-col items-center md:ml-4 md:mt-0">
			<img src={avatar} alt="Avatar" class="mb-2 h-24 w-24 rounded-full object-cover" />
			<div class="text-center text-base font-semibold text-gray-600 dark:text-gray-400">{name}</div>
		</div>
	</div>
</div>

<style>
	/* Responsive tweaks if needed */
</style>
