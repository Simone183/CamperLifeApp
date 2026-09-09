/**
 * Robust IndexedDB client-side photo cache & storage for ViaCamper.
 * Preserves high-res diary photos locally so they never get wiped when
 * ephemeral Cloud Run containers restart or when network is offline.
 */

const DB_NAME = "viacamper_photos_db";
const DB_VERSION = 1;
const STORE_NAME = "photos";

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported"));
      return;
    }

    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });

  return dbPromise;
}

export async function savePhotoToIndexedDB(photoId: string, dataUrl: string): Promise<void> {
  if (!photoId || !dataUrl || !dataUrl.startsWith("data:image/")) return;
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const putReq = store.put({ id: photoId, data: dataUrl, updatedAt: Date.now() });
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });
  } catch (e) {
    console.warn("[PhotoStorage] Failed to save to IndexedDB:", e);
  }
}

export async function getPhotoFromIndexedDB(photoId: string): Promise<string | null> {
  if (!photoId) return null;
  try {
    const db = await getDB();
    return await new Promise<string | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(photoId);
      getReq.onsuccess = () => {
        if (getReq.result && getReq.result.data) {
          resolve(getReq.result.data);
        } else {
          resolve(null);
        }
      };
      getReq.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

export async function getAllPhotosFromIndexedDB(): Promise<Record<string, string>> {
  try {
    const db = await getDB();
    return await new Promise<Record<string, string>>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const map: Record<string, string> = {};
        if (Array.isArray(req.result)) {
          for (const item of req.result) {
            if (item && item.id && item.data) {
              map[item.id] = item.data;
            }
          }
        }
        resolve(map);
      };
      req.onerror = () => resolve({});
    });
  } catch (e) {
    return {};
  }
}

/**
 * Automatically cleans up older cached photos from IndexedDB if the count exceeds maxEntries (LRU cache).
 * Keeps the most recent photos locally for lightning-fast offline access while avoiding phone storage overflow.
 */
export async function pruneIndexedDBCache(maxEntries = 300): Promise<number> {
  try {
    const db = await getDB();
    return await new Promise<number>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        if (items.length <= maxEntries) {
          resolve(0);
          return;
        }
        // Sort oldest first
        items.sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
        const toRemove = items.slice(0, items.length - maxEntries);
        for (const item of toRemove) {
          if (item && item.id) {
            store.delete(item.id);
          }
        }
        resolve(toRemove.length);
      };
      req.onerror = () => resolve(0);
    });
  } catch (e) {
    return 0;
  }
}

