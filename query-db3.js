import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  "projectId": "calm-light-fg02f",
  "appId": "1:17441453721:web:b0f4028724ea2bb276aa08",
  "apiKey": "AIzaSyBrLUDywyD1lgs6WyS1fd6dvegBjExJxTM",
  "authDomain": "calm-light-fg02f.firebaseapp.com",
  "storageBucket": "calm-light-fg02f.firebasestorage.app",
  "messagingSenderId": "17441453721",
  "measurementId": ""
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-camperlifeapp-fbcd1f6d-679b-4649-8f91-6a9b5a40d0b9");

async function check() {
  const usersRef = collection(db, "users", "sambucci.simone@gmail.com", "trips");
  const snap = await getDocs(usersRef);
  console.log("trips collection length:", snap.docs.length);
}
check().catch(console.error);
