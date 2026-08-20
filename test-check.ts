import { ClientFirestoreAdapter } from './src/client-firestore.ts';

const config = { projectId: "calm-light-fg02f" };
const dbId = "ai-studio-fbcd1f6d-679b-4649-8f91-6a9b5a40d0b9";
const db = new ClientFirestoreAdapter(config.projectId, dbId);

async function check() {
  const usersRef = db.collection("users");
  const snap = await usersRef.get();
  snap.forEach(doc => {
    const d = doc.data();
    if (d.nickname === "Cluchy87" || !d.approved) {
       console.log(doc.id, d.nickname, d.approved);
    }
  });
}
check().catch(console.error);
