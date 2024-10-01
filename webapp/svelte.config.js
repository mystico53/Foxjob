// svelte.config.js
import adapter from '@sveltejs/adapter-node';
import preprocess from 'svelte-preprocess';

const config = {
  preprocess: preprocess(),

  kit: {
    adapter: adapter({
      // default options are sufficient, but you can customize if needed
      out: 'build'
    }),
    // Adjust paths if your app is hosted under a subpath
    paths: {
      base: '',
      assets: ''
    }
  }
};

export default config;
