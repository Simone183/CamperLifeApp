import { ClientFirestoreAdapter } from './src/client-firestore.ts';

const config = { projectId: "calm-light-fg02f" };
const dbId = "ai-studio-camperlifeapp-fbcd1f6d-679b-4649-8f91-6a9b5a40d0b9";
const db = new ClientFirestoreAdapter(config.projectId, dbId);

async function markRead() {
  const query = await db.collection("notifications").get();
  let count = 0;
  for (const doc of query.docs) {
    const data = doc.data();
    if (data.read === false) {
      await db.collection("notifications").doc(doc.id).update({ read: true });
      count++;
    }
  }
  console.log(`Marked ${count} notifications as read.`);
}
markRead().catch(console.error);
