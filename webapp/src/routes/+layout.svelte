<script>import "../app.css";
import Navbar from '$lib/Navbar.svelte';
import { page } from '$app/stores';
import { auth } from '$lib/firebase';
import { onMount } from 'svelte';
import 'iconify-icon';
import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
import { storePopup } from '@skeletonlabs/skeleton';
storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });

let isAuthenticated = false;

onMount(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
        isAuthenticated = !!user;
    });

    return unsubscribe;
});</script>

<div class="flex flex-col min-h-screen">
    {#if isAuthenticated && $page.url.pathname !== '/'}
        <Navbar></Navbar>
    {/if}

    <main class="flex-grow">
        <slot></slot>
    </main>

    
</div>

<style>
    :global(.chip) {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
  </style>