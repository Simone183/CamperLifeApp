import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { resolveApiUrl } from './resolveMediaUrl';

const DB_NAME = 'viacamper_media_db';
const STORE_NAME = 'permanent_photos';
const DB_VERSION = 1;

/**
 * Open local IndexedDB for permanent client-side media storage
 */
function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const database = req.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Store photo Base64 permanently in local IndexedDB
 */
export async function savePhotoToLocalDb(id: string, base64: string, mimeType = 'image/jpeg'): Promise<void> {
  try {
    const database = await openMediaDb();
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id, base64, mimeType, savedAt: new Date().toISOString() });
  } catch (err) {
    console.warn('[PhotoPersistence] Local DB save error:', err);
  }
}

/**
 * Retrieve photo Base64 from local IndexedDB
 */
export async function getPhotoFromLocalDb(id: string): Promise<string | null> {
  try {
    const database = await openMediaDb();
    return new Promise((resolve) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result && req.result.base64) {
          const res = req.result;
          const mime = res.mimeType || 'image/jpeg';
          const dataUrl = res.base64.startsWith('data:') ? res.base64 : `data:${mime};base64,${res.base64}`;
          resolve(dataUrl);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Attempt to restore a missing or failed image from Firestore directly or local IndexedDB
 */
export async function recoverPhoto(urlOrPath: string): Promise<string | null> {
  if (!urlOrPath) return null;

  // Extract ID from URL (e.g. /api/photos/photo_123.jpg -> photo_123)
  let cleanId = urlOrPath;
  if (cleanId.includes('/')) {
    cleanId = cleanId.substring(cleanId.lastIndexOf('/') + 1);
  }
  cleanId = cleanId.replace(/\.[a-zA-Z0-9]+$/, '');

  // 1. Try local IndexedDB
  const localData = await getPhotoFromLocalDb(cleanId);
  if (localData) {
    return localData;
  }

  // 2. Try direct Firestore query on `shared_photos`
  try {
    if (db) {
      const photoDocRef = doc(db, 'shared_photos', cleanId);
      const docSnap = await getDoc(photoDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.base64) {
          const mime = data.mimeType || 'image/jpeg';
          const fullDataUrl = data.base64.startsWith('data:') ? data.base64 : `data:${mime};base64,${data.base64}`;
          // Save back to local DB for next instant load
          savePhotoToLocalDb(cleanId, data.base64, mime);
          return fullDataUrl;
        }
      }
    }
  } catch (firestoreErr) {
    console.warn('[PhotoPersistence] Firestore direct recovery error:', firestoreErr);
  }

  return null;
}

/**
 * Permanently upload and store photo in both Cloud (Firestore + Cloud Run API) and local IndexedDB
 */
export async function persistCommunityPhoto(
  base64Data: string,
  fileName?: string
): Promise<{ url: string; photoId: string }> {
  const photoId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  // 1. Clean base64 string
  let rawBase64 = base64Data;
  let mimeType = 'image/jpeg';
  if (base64Data.startsWith('data:')) {
    const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      rawBase64 = match[2];
    }
  }

  // 2. Save to local IndexedDB (instant zero-loss local backup)
  await savePhotoToLocalDb(photoId, rawBase64, mimeType);

  // 3. Save to Firestore `shared_photos` directly (permanent database backup)
  try {
    if (db) {
      const photoDocRef = doc(db, 'shared_photos', photoId);
      await setDoc(photoDocRef, {
        base64: rawBase64,
        mimeType,
        fileName: fileName || `${photoId}.jpg`,
        createdAt: new Date().toISOString(),
      });
      console.log(`[PhotoPersistence] Saved directly to Firestore shared_photos: ${photoId}`);
    }
  } catch (fErr) {
    console.warn('[PhotoPersistence] Firestore direct save warning:', fErr);
  }

  // 4. Also call server /api/upload to synchronize with server storage
  let finalUrl = `/api/photos/${photoId}`;
  try {
    const uploadRes = await fetch(resolveApiUrl('/api/upload'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fileName || `${photoId}.jpg`,
        base64: base64Data,
        photoId,
      }),
    });
    if (uploadRes.ok) {
      const data = await uploadRes.json();
      if (data && data.url) {
        finalUrl = data.url;
      }
    }
  } catch (upErr) {
    console.warn('[PhotoPersistence] Backend upload fallback to direct photo URL:', upErr);
  }

  return {
    url: finalUrl,
    photoId,
  };
}
