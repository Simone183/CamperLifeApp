import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import firebaseConfig from "./firebase-applet-config.json";

const app = initializeApp({
  projectId: firebaseConfig.projectId
});

const bucketName = `${firebaseConfig.projectId}.appspot.com`;
const bucket = getStorage(app).bucket(bucketName);

async function test() {
  try {
    const [exists] = await bucket.exists();
    console.log("Bucket", bucketName, "exists:", exists);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
