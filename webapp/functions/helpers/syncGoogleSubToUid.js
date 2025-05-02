const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();

exports.syncGoogleSubToUid = onDocumentUpdated('users/{userId}', async (event) => {
    console.log("Function triggered by update in 'users' collection.");

    const userId = event.params.userId;
    console.log(`Processing userId: ${userId}`);

    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    console.log("Before data:", beforeData);
    console.log("After data:", afterData);

    // Check if googleSubId has actually changed
    if (beforeData?.googleSubId === afterData?.googleSubId) {
        console.log(`No change to googleSubId for userId: ${userId}. Skipping processing.`);
        return;
    }

    const mappingRef = db.collection('googleSubToUid');

    // Handle deletion of googleSubId from document
    if (beforeData?.googleSubId && !afterData?.googleSubId) {
        console.log(`GoogleSubId removed. Removing mapping for googleSubId: ${beforeData.googleSubId}`);
        try {
            await mappingRef.doc(beforeData.googleSubId).delete();
            console.log(`Successfully deleted mapping for googleSubId: ${beforeData.googleSubId}`);
        } catch (error) {
            console.error(`Error deleting mapping for googleSubId: ${beforeData.googleSubId}`, error);
        }
        return;
    }

    // Handle addition or update of googleSubId
    if (afterData?.googleSubId) {
        console.log(`GoogleSubId changed/added. Processing googleSubId: ${afterData.googleSubId}`);
        const mappingData = {
            firebaseUid: userId,
            createdAt: beforeData?.createdAt || FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        console.log("Mapping data to upsert:", mappingData);

        try {
            await mappingRef.doc(afterData.googleSubId).set(mappingData, { merge: true });
            console.log(`Successfully upserted mapping for googleSubId: ${afterData.googleSubId}`);
        } catch (error) {
            console.error(`Error upserting mapping for googleSubId: ${afterData.googleSubId}`, error);
        }

        // Clean up old mapping if googleSubId changed
        if (beforeData?.googleSubId && beforeData.googleSubId !== afterData.googleSubId) {
            try {
                await mappingRef.doc(beforeData.googleSubId).delete();
                console.log(`Successfully deleted old mapping for googleSubId: ${beforeData.googleSubId}`);
            } catch (error) {
                console.error(`Error deleting old mapping for googleSubId: ${beforeData.googleSubId}`, error);
            }
        }
    }

    console.log("Function execution completed for userId:", userId);
});
