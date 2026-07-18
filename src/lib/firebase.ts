import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, setLogLevel } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Silence standard Firestore SDK logs
try {
  setLogLevel("silent");
} catch (e) {}

// Initialize standard Firebase default app if it doesn't exist
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Get the Firestore instance with the correct database ID
export const db = initializeFirestore(
  app,
  { experimentalForceLongPolling: true },
  firebaseConfig.firestoreDatabaseId,
);
