// @ts-check
import { join } from 'path';

// 1. Import the Skeleton plugin
import { skeleton } from '@skeletonlabs/tw-plugin';

// 2. Import your custom theme
import { myCustomTheme } from './src/my-custom-theme.ts';

import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
	// 3. Opt for dark mode to be handled via the class method
	darkMode: 'class',
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		// 4. Append the path to the Skeleton package
		join(require.resolve('@skeletonlabs/skeleton'), '../**/*.{html,js,svelte,ts}')
	],
	theme: {
		extend: {
			fontSize: {
				base: '16px' // This changes the base font size
			}
		}
	},
	plugins: [
		forms,
		skeleton({
			themes: {
				preset: ['modern'], // Keep your preset theme
				custom: [
					myCustomTheme // Add your custom theme
				]
			}
		})
	]
};
