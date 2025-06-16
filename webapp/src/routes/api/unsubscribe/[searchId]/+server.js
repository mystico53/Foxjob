import { error, json } from '@sveltejs/kit';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, url }) {
    try {
        const searchId = params.searchId;
        if (!searchId) {
            throw error(400, 'Search ID is required');
        }

        // Get the user token from the URL
        const token = url.searchParams.get('token');
        if (!token) {
            throw error(401, 'Authentication token is required');
        }

        // Verify the token
        const auth = getAuth();
        const decodedToken = await auth.verifyIdToken(token);
        const userId = decodedToken.uid;

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
        console.error('Error unsubscribing:', err);
        throw error(500, 'Failed to unsubscribe from search notifications');
    }
} 