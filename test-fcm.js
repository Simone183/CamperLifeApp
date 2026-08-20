import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const app = initializeApp({ projectId: "calm-light-fg02f" });
const db = getFirestore(app);

async function test() {
  const d = await getDoc(doc(db, "push_tokens", "sambucci.simone@gmail.com"));
  console.log("simone:", d.exists() ? d.data() : "NOT_FOUND");
  
  const d2 = await getDoc(doc(db, "push_tokens", "viacamperapp@gmail.com"));
  console.log("viacamper:", d2.exists() ? d2.data() : "NOT_FOUND");
}
test().then(() => process.exit(0));
