<script>
	import { auth } from './firebase';
	import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
	import { goto } from '$app/navigation';

	async function signInWithGoogle() {
		const provider = new GoogleAuthProvider();
		try {
			const result = await signInWithPopup(auth, provider);
			console.log('User signed in:', result.user);
			goto('/cards');
		} catch (error) {
			console.error('Error signing in with Google', error);
		}
	}
</script>

<button on:click={signInWithGoogle}> Sign in with Google </button>
