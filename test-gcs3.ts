import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import firebaseConfig from "./firebase-applet-config.json";

const app = initializeApp({
  projectId: firebaseConfig.projectId
});

async function test() {
  const bucket1 = getStorage(app).bucket(); // default
  try {
    const [exists] = await bucket1.exists();
    console.log("Default bucket exists:", exists);
  } catch (e) {
    console.log("Default bucket error:", e.message);
  }
}
test();
