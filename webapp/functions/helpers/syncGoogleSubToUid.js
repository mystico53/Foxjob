const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();

exports.syncGoogleSubToUid = onDocumentWritten('users/{userId}', async (event) => {
    console.log("Function triggered by change in 'users' collection.");

    const userId = event.params.userId;
    console.log(`Processing userId: ${userId}`);

    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    console.log("Before data:", beforeData);
    console.log("After data:", afterData);

    const mappingRef = db.collection('googleSubToUid');

    // Handle deletion
    if (!afterData && beforeData && beforeData.googleSubId) {
        console.log(`User document deleted. Removing mapping for googleSubId: ${beforeData.googleSubId}`);
        try {
            await mappingRef.doc(beforeData.googleSubId).delete();
            console.log(`Successfully deleted mapping for googleSubId: ${beforeData.googleSubId}`);
        } catch (error) {
            console.error(`Error deleting mapping for googleSubId: ${beforeData.googleSubId}`, error);
        }
        return;
    }

    // Handle creation or update
    if (afterData && afterData.googleSubId) {
        console.log(`User document created/updated. Processing googleSubId: ${afterData.googleSubId}`);
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
    }

    console.log("Function execution completed for userId:", userId);
});
