import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const app = admin.initializeApp({
  projectId: "calm-light-fg02f"
});

const firestoreDb = getFirestore(app);
const firebaseDbId = "ai-studio-camperlifeapp-fbcd1f6d-679b-4649-8f91-6a9b5a40d0b9";
firestoreDb.settings({ databaseId: firebaseDbId, ignoreUndefinedProperties: true });

async function markRead() {
  const query = await firestoreDb.collection("notifications").get();
  let count = 0;
  for (const doc of query.docs) {
    const data = doc.data();
    if (data.read === false) {
      await firestoreDb.collection("notifications").doc(doc.id).update({ read: true });
      count++;
    }
  }
  console.log(`Marked ${count} notifications as read.`);
}
markRead().then(() => process.exit(0)).catch(console.error);
