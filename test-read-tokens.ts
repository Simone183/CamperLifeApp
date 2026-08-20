import { ClientFirestoreAdapter } from './src/client-firestore.ts';

const config = { projectId: "calm-light-fg02f" };
const dbId = "ai-studio-fbcd1f6d-679b-4649-8f91-6a9b5a40d0b9";
const db = new ClientFirestoreAdapter(config.projectId, dbId);

async function test() {
  const d1 = await db.collection("push_tokens").doc("sambucci.simone@gmail.com").get();
  console.log("simone:", d1.exists ? d1.data() : "NOT_FOUND");
  
  const d2 = await db.collection("push_tokens").doc("viacamperapp@gmail.com").get();
  console.log("viacamperapp:", d2.exists ? d2.data() : "NOT_FOUND");
}
test().catch(console.error);
