import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore, setLogLevel } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Silence standard Firestore SDK logs
try {
  setLogLevel("silent");
} catch (e) {}

// Initialize standard Firebase default app if it doesn't exist
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Get the Firestore instance with the correct database ID
const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

function getDbInstance() {
  try {
    if (dbId) {
      return initializeFirestore(app, { experimentalForceLongPolling: true }, dbId);
    } else {
      return initializeFirestore(app, { experimentalForceLongPolling: true });
    }
  } catch (e) {
    try {
      return dbId ? getFirestore(app, dbId) : getFirestore(app);
    } catch (innerErr) {
      console.warn("[Firebase] Fallback getFirestore error:", innerErr);
      return getFirestore(app);
    }
  }
}

export const db = getDbInstance();

