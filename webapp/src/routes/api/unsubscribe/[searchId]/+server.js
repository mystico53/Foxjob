import { error, json } from '@sveltejs/kit';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth as getClientAuth, signInWithCustomToken } from 'firebase/auth';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, url }) {
    try {
        const searchId = params.searchId;
        if (!searchId) {
            throw error(400, 'Search ID is required');
        }

        // Get the custom token from the URL
        const customToken = url.searchParams.get('token');
        if (!customToken) {
            throw error(401, 'Authentication token is required');
        }

        // Initialize Firebase Admin if not already initialized
        if (!getApps().length) {
            initializeApp();
        }

        // Get the client auth instance
        const clientAuth = getClientAuth();
        
        try {
            // Sign in with the custom token to get an ID token
            const userCredential = await signInWithCustomToken(clientAuth, customToken);
            const user = userCredential.user;
            const userId = user.uid;

            // Get Firestore instance
            const db = getFirestore();

            // Update the search query
            const searchQueryRef = db.collection('users').doc(userId).collection('searchQueries').doc(searchId);
            
            // Update isActive to false
            await searchQueryRef.update({
                isActive: false,
                updatedAt: new Date().toISOString()
            });

            return json({
                success: true,
                message: 'Successfully unsubscribed from search notifications'
            });
        } catch (err) {
            console.error('Error verifying token:', err);
            throw error(401, 'Invalid or expired token');
        }
    } catch (err) {
        console.error('Error unsubscribing:', err);
        if (err.status === 401) {
            throw error(401, err.body?.message || 'Authentication failed');
        }
        throw error(500, 'Failed to unsubscribe from search notifications');
    }
} 