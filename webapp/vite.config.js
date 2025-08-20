import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	// Load env file based on `mode` in the current working directory.
	// Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
	const env = loadEnv(mode, process.cwd(), '');

	return {
		plugins: [sveltekit()],
		build: {
			outDir: 'dist',
			emptyOutDir: true
		},
		server: {
			port: 5000
		},
		optimizeDeps: {
			exclude: [
				'firebase',
				'firebase/app',
				'firebase/auth',
				'firebase/firestore',
				'firebase/analytics',
				'@sveltejs/kit',
				'iconify-icon',
				'@floating-ui/dom',
				'devalue'
			],
			include: ['esm-env']
		},
		resolve: {
			alias: {
				$lib: '/src/lib'
			},
			conditions: ['browser', 'development', 'module']
		},
		define: {
			'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
		}
	};
});
