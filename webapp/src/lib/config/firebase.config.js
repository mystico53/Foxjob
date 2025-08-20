// src/lib/config/firebase.config.js
const configs = {
	development: {
		apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
		authDomain: 'jobille-45494.web.app',
		projectId: 'jobille-45494',
		storageBucket: 'jobille-45494.appspot.com',
		messagingSenderId: 'dummy-sender-id',
		appId: 'dummy-app-id',
		measurementId: 'dummy-measurement-id'
	},
	staging: {
		apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
		authDomain: 'jobille-45494.web.app',
		projectId: 'jobille-45494',
		storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
		messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
		appId: import.meta.env.VITE_FIREBASE_APP_ID,
		measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
		clientId: import.meta.env.FIREBASE_CLIENT_ID
	},
	production: {
		apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
		authDomain: 'foxjob-prod.firebaseapp.com',
		projectId: 'foxjob-prod',
		storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
		messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
		appId: import.meta.env.VITE_FIREBASE_APP_ID,
		measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
	}
};

export const getFirebaseConfig = () => {
	const mode = import.meta.env.MODE;
	// console.log('Current environment:', mode);
	// console.log('Available env variables:', {
	//   hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
	//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
	// });
	const config = configs[mode] || configs.staging;
	/*console.log('Using Firebase config:', {
    authDomain: config.authDomain,
    projectId: config.projectId,
    mode: mode
  });*/
	return config;
};
