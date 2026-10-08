import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from './firebase';
import { sanitizeForFirestore } from '../utils/firestoreHelper';

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
    const cleanedData = sanitizeForFirestore(newData);
    setDoc(docRef, cleanedData, { merge: true });
  };

  return [data, saveData] as const;
}
