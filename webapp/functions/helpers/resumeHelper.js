const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');

const db = admin.firestore();

/**
 * Helper function to retrieve resume data for a user
 * First tries to get resume from the searchQuery (new location)
 * Falls back to UserCollections (old location) if not found
 * @param {string} firebaseUid - User's Firebase UID
 * @param {string} searchQueryId - Optional search query ID to look for resume in specific agent
 * @returns {Promise<Object|null>} Resume data or null if not found
 */
async function getUserResume(firebaseUid, searchQueryId = null) {
	try {
		let resumeText = null;
		let resumeData = null;

		// Option 1: Try to get resume from specific searchQuery if provided
		if (searchQueryId) {
			try {
				const searchQueryRef = db
					.collection('users')
					.doc(firebaseUid)
					.collection('searchQueries')
					.doc(searchQueryId);

				const searchQueryDoc = await searchQueryRef.get();

				if (searchQueryDoc.exists()) {
					const queryData = searchQueryDoc.data();
					if (queryData.resume) {
						logger.info(`Resume found in searchQuery ${searchQueryId}`);
						return {
							extractedText: queryData.resume.extractedText,
							structuredData: queryData.resume.structuredData,
							fileName: queryData.resume.fileName,
							timestamp: queryData.resume.timestamp,
							source: 'searchQuery'
						};
					}
				}
			} catch (error) {
				logger.warn(`Error getting resume from searchQuery ${searchQueryId}:`, error);
			}
		}

		// Option 2: Try to get resume from any searchQuery (new system)
		if (!resumeData) {
			try {
				const searchQueriesRef = db
					.collection('users')
					.doc(firebaseUid)
					.collection('searchQueries');

				const searchQueriesSnapshot = await searchQueriesRef.get();

				for (const doc of searchQueriesSnapshot.docs) {
					const data = doc.data();
					if (data.resume && data.resume.extractedText) {
						logger.info(`Resume found in searchQuery ${doc.id} (fallback search)`);
						return {
							extractedText: data.resume.extractedText,
							structuredData: data.resume.structuredData,
							fileName: data.resume.fileName,
							timestamp: data.resume.timestamp,
							source: 'searchQuery'
						};
					}
				}
			} catch (error) {
				logger.warn('Error searching for resume in searchQueries:', error);
			}
		}

		// Option 3: Fallback to old UserCollections location
		try {
			const userCollectionsRef = db
				.collection('users')
				.doc(firebaseUid)
				.collection('UserCollections');

			const resumeQuery = userCollectionsRef.where('type', '==', 'Resume').limit(1);
			const resumeSnapshot = await resumeQuery.get();

			if (!resumeSnapshot.empty) {
				const resumeDoc = resumeSnapshot.docs[0];
				const data = resumeDoc.data();
				logger.info(`Resume found in UserCollections (legacy location)`);
				return {
					extractedText: data.extractedText,
					structuredData: data.structuredData,
					fileName: data.fileName,
					timestamp: data.timestamp,
					source: 'userCollections'
				};
			}
		} catch (error) {
			logger.warn('Error getting resume from UserCollections:', error);
		}

		logger.warn(`No resume found for user ${firebaseUid}`);
		return null;
	} catch (error) {
		logger.error('Error in getUserResume:', error);
		return null;
	}
}

/**
 * Save resume data to a specific searchQuery
 * @param {string} firebaseUid - User's Firebase UID
 * @param {string} searchQueryId - Search query ID to store resume in
 * @param {Object} resumeData - Resume data to store
 * @returns {Promise<boolean>} Success status
 */
async function saveResumeToSearchQuery(firebaseUid, searchQueryId, resumeData) {
	try {
		const searchQueryRef = db
			.collection('users')
			.doc(firebaseUid)
			.collection('searchQueries')
			.doc(searchQueryId);

		await searchQueryRef.update({
			resume: {
				extractedText: resumeData.extractedText,
				structuredData: resumeData.structuredData || null,
				fileName: resumeData.fileName,
				timestamp: resumeData.timestamp || admin.firestore.FieldValue.serverTimestamp(),
				status: resumeData.status || 'processed'
			},
			resumeUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
		});

		logger.info(`Resume saved to searchQuery ${searchQueryId} for user ${firebaseUid}`);
		return true;
	} catch (error) {
		logger.error(`Error saving resume to searchQuery ${searchQueryId}:`, error);
		return false;
	}
}

/**
 * Copy resume from UserCollections to all searchQueries for a user
 * This helps with the migration from old to new system
 * @param {string} firebaseUid - User's Firebase UID
 * @returns {Promise<number>} Number of searchQueries updated
 */
async function migrateResumeToSearchQueries(firebaseUid) {
	try {
		// Get resume from UserCollections
		const userCollectionsRef = db
			.collection('users')
			.doc(firebaseUid)
			.collection('UserCollections');

		const resumeQuery = userCollectionsRef.where('type', '==', 'Resume').limit(1);
		const resumeSnapshot = await resumeQuery.get();

		if (resumeSnapshot.empty) {
			logger.info(`No resume in UserCollections to migrate for user ${firebaseUid}`);
			return 0;
		}

		const resumeData = resumeSnapshot.docs[0].data();

		// Get all searchQueries for the user
		const searchQueriesRef = db.collection('users').doc(firebaseUid).collection('searchQueries');

		const searchQueriesSnapshot = await searchQueriesRef.get();

		let updatedCount = 0;
		const batch = db.batch();

		for (const queryDoc of searchQueriesSnapshot.docs) {
			const queryData = queryDoc.data();

			// Only update if the searchQuery doesn't already have a resume
			if (!queryData.resume) {
				batch.update(queryDoc.ref, {
					resume: {
						extractedText: resumeData.extractedText,
						structuredData: resumeData.structuredData || null,
						fileName: resumeData.fileName,
						timestamp: resumeData.timestamp,
						status: resumeData.status || 'processed'
					},
					resumeUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
				});
				updatedCount++;
			}
		}

		if (updatedCount > 0) {
			await batch.commit();
			logger.info(`Migrated resume to ${updatedCount} searchQueries for user ${firebaseUid}`);
		}

		return updatedCount;
	} catch (error) {
		logger.error(`Error migrating resume for user ${firebaseUid}:`, error);
		return 0;
	}
}

module.exports = {
	getUserResume,
	saveResumeToSearchQuery,
	migrateResumeToSearchQueries
};
