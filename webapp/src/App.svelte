<script>
  import { onMount } from "svelte";
  import { auth } from "./lib/firebase";

  let user = null;

  onMount(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      user = currentUser;
    });

    return unsubscribe;
  });
</script>

<main>
  <h1>Welcome to Jobille</h1>
  {#if user}
    <p>You are logged in as {user.email}</p>
  {:else}
    <p>You are not logged in</p>
  {/if}
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>
