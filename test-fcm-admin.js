import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
const app = admin.initializeApp({ projectId: "calm-light-fg02f" });
const db = getFirestore(app, "ai-studio-fbcd1f6d-679b-4649-8f91-6a9b5a40d0b9");

async function test() {
  const d = await db.collection("push_tokens").doc("sambucci.simone@gmail.com").get();
  console.log("simone:", d.exists ? d.data() : "NOT_FOUND");
  
  const d2 = await db.collection("push_tokens").doc("viacamperapp@gmail.com").get();
  console.log("viacamper:", d2.exists ? d2.data() : "NOT_FOUND");
}
test().then(() => process.exit(0)).catch(console.error);
