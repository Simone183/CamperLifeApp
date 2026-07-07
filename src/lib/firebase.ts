import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize standard Firebase default app if it doesn't exist
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Get the Firestore instance with the correct database ID
export const db = initializeFirestore(
  app,
  { experimentalForceLongPolling: true } as any,
  firebaseConfig.firestoreDatabaseId,
);
