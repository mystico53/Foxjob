<script>
  export let text = "Imagine if someone actually read your resume before suggesting jobs.";
  export let name = "John Doe, 42, Job Seeker";
  export let avatar = "/images/avatar-placeholder.png";
</script>

<div class="flex flex-col items-center justify-center py-12 px-0 w-full">
  <div class="flex flex-col md:flex-row items-center bg-white dark:bg-gray-900 rounded-xl shadow-lg w-[90%] px-4 md:px-16 py-8">
    <!-- Left: Testimonial Text -->
    <div class="flex-1 flex flex-col items-center md:items-start text-center md:text-left px-6">
      <blockquote class="text-2xl italic text-gray-800 dark:text-gray-200 m-12 leading-relaxed">
        "{text}"
      </blockquote>
    </div>
    <!-- Right: Avatar and Name -->
    <div class="flex flex-col items-center mt-4 md:mt-0 md:ml-4">
      <img src={avatar} alt="Avatar" class="w-24 h-24 rounded-full mb-2 object-cover" />
      <div class="text-base text-gray-600 dark:text-gray-400 font-semibold text-center">{name}</div>
    </div>
  </div>
</div>

<style>
  /* Responsive tweaks if needed */
</style> 