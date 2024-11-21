Remove-Item -Recurse -Force .svelte-kit
npm run build
firebase deploy --only hosting
