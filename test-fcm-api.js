import admin from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
const app = admin.initializeApp({ projectId: "calm-light-fg02f" });

async function test() {
  try {
    const res = await getMessaging(app).sendEachForMulticast({
      tokens: ["dummy-token"],
      notification: { title: "Test" }
    });
    console.log("FCM Response:", res);
  } catch (e) {
    console.error("FCM Error:", e);
  }
}
test().then(() => process.exit(0)).catch(console.error);
