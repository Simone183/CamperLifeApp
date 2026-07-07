import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from './firebase';

export function useFirestoreSync<T>(collectionPath: string, docId: string, defaultValue: T) {
  const [data, setData] = useState<T>(defaultValue);
  
  useEffect(() => {
    const docRef = doc(db, collectionPath, docId);
    
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        setData(doc.data() as T);
      }
    });
    return unsubscribe;
  }, [collectionPath, docId]);

  const saveData = (newData: T) => {
    const docRef = doc(db, collectionPath, docId);
    // Sanitize the object to remove any 'undefined' properties which are unsupported by Firestore
    const cleanedData = JSON.parse(JSON.stringify(newData));
    setDoc(docRef, cleanedData, { merge: true });
  };

  return [data, saveData] as const;
}
