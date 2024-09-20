import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5000, // Match Firebase emulator hosting port
  },
  optimizeDeps: {
    exclude: ['firebase', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/analytics']
  },
  resolve: {
    alias: {
      '$lib': '/src/lib'
    }
  }
});