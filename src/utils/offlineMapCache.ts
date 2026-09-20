/**
 * Offline Map Cache & Persistence Manager for ViaCamper App
 * 
 * Provides:
 * - Persistent Storage API integration (prevents OS/Browser cache eviction)
 * - Dual-layer storage (IndexedDB + Cache Storage API)
 * - Non-destructive schema upgrades
 * - Offline Map Pack Export & Import (.vcm file backup)
 * - Cloud synchronization of downloaded region preferences via Firebase
 * - High-speed in-memory tile cache & procedural parchment fallback
 */

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

const DB_NAME = "ViaCamperOfflineMap_v3";
const STORE_TILES = "tiles";
const STORE_REGIONS = "regions_meta";
const DB_VERSION = 1;
const CACHE_STORAGE_NAME = "viacamper-offline-tiles-v1";

let dbInstance: IDBDatabase | null = null;
const memoryTileCache = new Map<string, string>();
const MAX_MEMORY_TILES = 300;

export interface StorageStatus {
  isPersisted: boolean;
  count: number;
  sizeMB: number;
  usageMB: number;
  quotaMB: number;
}

export interface DownloadedRegionMeta {
  id: string;
  name: string;
  downloadedAt: number;
  tileCount: number;
  sizeMB: number;
  zoomRange: [number, number];
}

/**
 * Requests browser/OS persistent storage permission.
 * Prevents mobile browsers & WebViews from auto-clearing maps on low memory or app close.
 */
export async function enablePersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage) {
    return false;
  }
  try {
    if (navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      console.log(`[ViaCamper Storage] Persistent storage request result: ${isPersisted}`);
      return isPersisted;
    }
  } catch (e) {
    console.warn("[ViaCamper Storage] Could not request persistent storage:", e);
  }
  return false;
}

/**
 * Checks whether storage is already marked as persistent.
 */
export async function checkIsPersisted(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage) {
    return false;
  }
  try {
    if (navigator.storage.persisted) {
      return await navigator.storage.persisted();
    }
  } catch (e) {
    console.warn("[ViaCamper Storage] Could not check persisted state:", e);
  }
  return false;
}

/**
 * Initializes IndexedDB safely without deleting existing stores.
 */
export function initDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB non supportato"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_TILES)) {
        db.createObjectStore(STORE_TILES);
      }
      if (!db.objectStoreNames.contains(STORE_REGIONS)) {
        db.createObjectStore(STORE_REGIONS, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      // Also silently request persistent storage in background
      enablePersistentStorage().catch(() => {});
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Retrieves a tile from:
 * 1. Fast in-memory cache
 * 2. IndexedDB
 * 3. Cache Storage API (and repairs IndexedDB if found)
 */
export async function getTile(key: string): Promise<string | null> {
  // 1. Check in-memory cache
  if (memoryTileCache.has(key)) {
    return memoryTileCache.get(key) || null;
  }

  // 2. Check IndexedDB
  try {
    const db = await initDb();
    const dbTile = await new Promise<string | null>((resolve) => {
      const transaction = db.transaction(STORE_TILES, "readonly");
      const store = transaction.objectStore(STORE_TILES);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        resolve(null);
      };
    });

    if (dbTile) {
      if (memoryTileCache.size >= MAX_MEMORY_TILES) {
        const firstKey = memoryTileCache.keys().next().value;
        if (firstKey) memoryTileCache.delete(firstKey);
      }
      memoryTileCache.set(key, dbTile);
      return dbTile;
    }
  } catch (e) {}

  // 3. Fallback: Check Cache Storage API
  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open(CACHE_STORAGE_NAME);
      const match = await cache.match(`/offline-tiles/${key}`);
      if (match) {
        const text = await match.text();
        if (text) {
          // Restore back to IndexedDB asynchronously
          saveTile(key, text).catch(() => {});
          memoryTileCache.set(key, text);
          return text;
        }
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Attempts to find an exact tile, or falls back to scaling up a lower-zoom parent tile
 */
export async function getBestTile(z: number, x: number, y: number): Promise<string | null> {
  // First try the exact tile
  const exact = await getTile(`${z}-${x}-${y}`);
  if (exact) return exact;

  // If exact tile not found, try to find a parent tile and crop it
  if (typeof document === "undefined") return null;

  let currentZ = z - 1;
  while (currentZ >= 5) {
    const diff = z - currentZ;
    const factor = Math.pow(2, diff);
    const parentX = Math.floor(x / factor);
    const parentY = Math.floor(y / factor);

    const parentBase64 = await getTile(`${currentZ}-${parentX}-${parentY}`);
    if (parentBase64) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }

          const sWidth = 256 / factor;
          const sHeight = 256 / factor;
          const sx = (x % factor) * sWidth;
          const sy = (y % factor) * sHeight;

          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 256, 256);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => resolve(null);
        img.src = parentBase64;
      });
    }
    currentZ--;
  }

  return null;
}

/**
 * Saves tile both to IndexedDB and Cache Storage API for maximum durability.
 */
export async function saveTile(key: string, base64Data: string): Promise<void> {
  // Update memory cache
  if (memoryTileCache.size >= MAX_MEMORY_TILES) {
    const firstKey = memoryTileCache.keys().next().value;
    if (firstKey) memoryTileCache.delete(firstKey);
  }
  memoryTileCache.set(key, base64Data);

  // 1. Save in IndexedDB
  try {
    const db = await initDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_TILES, "readwrite");
      const store = transaction.objectStore(STORE_TILES);
      const request = store.put(base64Data, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("[Offline Map] IDB save tile error:", e);
  }

  // 2. Save in Cache Storage API as backup
  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open(CACHE_STORAGE_NAME);
      const response = new Response(base64Data, {
        headers: { "Content-Type": "text/plain", "Cache-Control": "max-age=31536000, immutable" },
      });
      await cache.put(`/offline-tiles/${key}`, response);
    } catch (e) {}
  }
}

/**
 * Saves or updates region metadata in IndexedDB
 */
export async function saveDownloadedRegionMeta(regionMeta: DownloadedRegionMeta): Promise<void> {
  try {
    const db = await initDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_REGIONS, "readwrite");
      const store = transaction.objectStore(STORE_REGIONS);
      const request = store.put(regionMeta);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("[Offline Map] Could not save region meta:", e);
  }
}

/**
 * Gets all saved region metadata
 */
export async function getDownloadedRegionsMeta(): Promise<DownloadedRegionMeta[]> {
  try {
    const db = await initDb();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_REGIONS, "readonly");
      const store = transaction.objectStore(STORE_REGIONS);
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => {
        resolve([]);
      };
    });
  } catch (e) {
    return [];
  }
}

/**
 * Clears all cached tiles and region metadata from IndexedDB and Cache API
 */
export async function clearCache(): Promise<void> {
  memoryTileCache.clear();

  try {
    const db = await initDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_TILES, STORE_REGIONS], "readwrite");
      transaction.objectStore(STORE_TILES).clear();
      transaction.objectStore(STORE_REGIONS).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.warn("[Offline Map] Clear IDB error:", e);
  }

  if (typeof caches !== "undefined") {
    try {
      await caches.delete(CACHE_STORAGE_NAME);
    } catch (e) {}
  }
}

/**
 * Returns overall statistics and persistent storage status
 */
export async function getStats(): Promise<{ count: number; sizeMB: number }> {
  try {
    const db = await initDb();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_TILES, "readonly");
      const store = transaction.objectStore(STORE_TILES);

      let count = 0;
      let totalLength = 0;

      const request = store.openCursor();
      request.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          count++;
          if (typeof cursor.value === "string") {
            totalLength += cursor.value.length;
          }
          cursor.continue();
        } else {
          const sizeMB = parseFloat(((totalLength * 0.75) / (1024 * 1024)).toFixed(2));
          resolve({ count, sizeMB });
        }
      };

      request.onerror = () => {
        resolve({ count: 0, sizeMB: 0 });
      };
    });
  } catch (e) {
    return { count: 0, sizeMB: 0 };
  }
}

/**
 * Returns full storage diagnostics (disk quota, persistence, size, regions)
 */
export async function getFullStorageStatus(): Promise<StorageStatus> {
  const stats = await getStats();
  let isPersisted = false;
  let usageMB = stats.sizeMB;
  let quotaMB = 0;

  if (typeof navigator !== "undefined" && navigator.storage) {
    try {
      if (navigator.storage.persisted) {
        isPersisted = await navigator.storage.persisted();
      }
      if (navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        if (est.usage) usageMB = parseFloat((est.usage / (1024 * 1024)).toFixed(1));
        if (est.quota) quotaMB = parseFloat((est.quota / (1024 * 1024)).toFixed(1));
      }
    } catch (e) {}
  }

  return {
    isPersisted,
    count: stats.count,
    sizeMB: stats.sizeMB,
    usageMB,
    quotaMB,
  };
}

/**
 * EXPORT OFFLINE MAP PACKAGE (.vcm file)
 * Allows saving a complete backup to the phone's Download directory.
 * Survives full app uninstalls & reinstalls.
 */
export async function exportOfflineMapPackage(): Promise<{ blob: Blob; filename: string; count: number }> {
  const db = await initDb();
  const regions = await getDownloadedRegionsMeta();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_TILES, "readonly");
    const store = transaction.objectStore(STORE_TILES);

    const tilesData: Record<string, string> = {};
    let count = 0;

    const request = store.openCursor();
    request.onsuccess = (e: any) => {
      const cursor = e.target.result;
      if (cursor) {
        tilesData[cursor.key as string] = cursor.value;
        count++;
        cursor.continue();
      } else {
        const payload = {
          app: "ViaCamper",
          type: "OfflineMapPackage",
          version: 1,
          exportedAt: new Date().toISOString(),
          regions,
          count,
          tiles: tilesData,
        };

        const jsonString = JSON.stringify(payload);
        const blob = new Blob([jsonString], { type: "application/json" });
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `ViaCamper_Mappe_Offline_${dateStr}.vcm`;

        resolve({ blob, filename, count });
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * IMPORT OFFLINE MAP PACKAGE (.vcm file)
 * Restores tiles directly into IndexedDB & Cache Storage in 1 click.
 */
export async function importOfflineMapPackage(file: File): Promise<{ count: number; regionsCount: number }> {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!data || data.type !== "OfflineMapPackage" || !data.tiles) {
    throw new Error("Formato pacchetto mappe non valido. Seleziona un file .vcm valido generato da ViaCamper.");
  }

  const db = await initDb();
  let count = 0;

  // 1. Restore tiles into IndexedDB
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_TILES, "readwrite");
    const store = transaction.objectStore(STORE_TILES);

    const entries = Object.entries(data.tiles as Record<string, string>);
    entries.forEach(([k, v]) => {
      store.put(v, k);
      count++;
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  // 2. Restore regions meta if present
  let regionsCount = 0;
  if (Array.isArray(data.regions)) {
    for (const r of data.regions) {
      await saveDownloadedRegionMeta(r);
      regionsCount++;
    }
  }

  // 3. Populate Cache Storage
  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open(CACHE_STORAGE_NAME);
      const entries = Object.entries(data.tiles as Record<string, string>);
      for (const [k, v] of entries.slice(0, 500)) {
        const response = new Response(v, {
          headers: { "Content-Type": "text/plain", "Cache-Control": "max-age=31536000, immutable" },
        });
        await cache.put(`/offline-tiles/${k}`, response);
      }
    } catch (e) {}
  }

  // 4. Request persistent storage again
  await enablePersistentStorage();

  return { count, regionsCount };
}

/**
 * Syncs user's downloaded regions metadata with Firebase Firestore
 */
export async function syncOfflineRegionsToCloud(userEmail: string): Promise<void> {
  if (!userEmail) return;
  try {
    const cleanEmail = userEmail.toLowerCase().trim();
    const regions = await getDownloadedRegionsMeta();
    const stats = await getStats();

    const docRef = doc(db, "users", cleanEmail, "camper_data", "offline_maps");
    await setDoc(
      docRef,
      {
        regions,
        stats,
        lastSyncedAt: Date.now(),
      },
      { merge: true }
    );
    console.log("[ViaCamper Cloud] Offline maps metadata synced to cloud.");
  } catch (e) {
    console.warn("[ViaCamper Cloud] Could not sync offline regions to cloud:", e);
  }
}

/**
 * Fetches user's saved offline regions from Firebase Firestore
 */
export async function fetchCloudOfflineRegions(userEmail: string): Promise<DownloadedRegionMeta[]> {
  if (!userEmail) return [];
  try {
    const cleanEmail = userEmail.toLowerCase().trim();
    const docRef = doc(db, "users", cleanEmail, "camper_data", "offline_maps");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.regions)) {
        return data.regions;
      }
    }
  } catch (e) {
    console.warn("[ViaCamper Cloud] Could not fetch cloud offline regions:", e);
  }
  return [];
}

// Coordinate conversions
export function latLngToTile(lat: number, lng: number, zoom: number) {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

// Generate procedurally drawn vector parchment tile for 100% stable offline rendering
export function generatePlaceholderTile(
  z: number,
  x: number,
  y: number,
  textPrefix = ""
): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Draw warm cartographic parchment styling
  ctx.fillStyle = "#F5F2EB";
  ctx.fillRect(0, 0, 256, 256);

  // Subtle gridlines
  ctx.strokeStyle = "rgba(62, 74, 53, 0.08)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, 256, 256);
  ctx.strokeRect(64, 64, 128, 128);

  // Compass-like circular lines
  ctx.strokeStyle = "rgba(62, 74, 53, 0.04)";
  ctx.beginPath();
  ctx.arc(128, 128, 90, 0, Math.PI * 2);
  ctx.stroke();

  // Watermarks or mountains outline
  ctx.fillStyle = "rgba(62, 74, 53, 0.03)";
  ctx.font = "italic 10px font-serif";
  ctx.textAlign = "center";
  ctx.fillText("ViaCamper Offline Map", 128, 230);

  // Center coordinate text or label
  ctx.fillStyle = "rgba(62, 74, 53, 0.35)";
  ctx.font = "bold 10px font-sans, system-ui";
  ctx.textAlign = "center";
  ctx.fillText(`${textPrefix || "Mappa Offline"} (${z}/${x}/${y})`, 128, 120);

  // Draw simple mountain icons for offline feel
  ctx.strokeStyle = "rgba(62, 74, 53, 0.15)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(110, 155);
  ctx.lineTo(125, 135);
  ctx.lineTo(140, 155);
  ctx.moveTo(125, 155);
  ctx.lineTo(135, 142);
  ctx.lineTo(145, 155);
  ctx.stroke();

  return canvas.toDataURL("image/png");
}

export interface OfflineRegion {
  id: string;
  name: string;
  description: string;
  estimatedSize: string;
  zoomRange: [number, number];
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

export const OFFLINE_REGIONS: OfflineRegion[] = [
  {
    id: "italia_macro",
    name: "Italia Intera (Semplificata)",
    description:
      "Autostrade, strade statali, capoluoghi e profili costieri di tutta la penisola. Ottimo per pianificare viaggi lunghi.",
    estimatedSize: "~15 MB",
    zoomRange: [5, 10],
    latMin: 35.0,
    latMax: 48.0,
    lngMin: 6.0,
    lngMax: 19.0,
  },
  {
    id: "nord_italia",
    name: "Nord Italia (Dettagliato)",
    description:
      "Pianura Padana, Alpi, Dolomiti, Laghi del Nord, Liguria, Piemonte, Lombardia, Veneto, Trentino, Friuli.",
    estimatedSize: "~220 MB",
    zoomRange: [10, 14],
    latMin: 43.8,
    latMax: 47.0,
    lngMin: 6.5,
    lngMax: 14.0,
  },
  {
    id: "centro_italia",
    name: "Centro Italia (Dettagliato)",
    description:
      "Toscana, Umbria, Marche, Lazio, Abruzzo, Molise, aree appenniniche, coste tirreniche e adriatiche.",
    estimatedSize: "~180 MB",
    zoomRange: [10, 14],
    latMin: 41.2,
    latMax: 44.2,
    lngMin: 9.8,
    lngMax: 15.0,
  },
  {
    id: "sud_italia_isole",
    name: "Sud Italia & Isole (Dettagliato)",
    description:
      "Campania, Puglia, Basilicata, Calabria, Sicilia, Sardegna e arcipelaghi minori.",
    estimatedSize: "~210 MB",
    zoomRange: [10, 14],
    latMin: 35.2,
    latMax: 41.5,
    lngMin: 8.0,
    lngMax: 18.5,
  },
  {
    id: "alpi_montagna",
    name: "Passi Alpini & Dolomiti (Alta Quota)",
    description:
      "Zone montane a rischio assenza segnale: Valle d'Aosta, Valtellina, Alto Adige, Dolomiti Bellunesi, Carnia.",
    estimatedSize: "~85 MB",
    zoomRange: [10, 15],
    latMin: 45.6,
    latMax: 47.1,
    lngMin: 6.8,
    lngMax: 13.0,
  },
];

/**
 * Downloads a region of tiles sequentially with progress reporting.
 * Automatically activates persistent storage upon download.
 */
export async function downloadRegion(
  region: OfflineRegion,
  onProgress: (current: number, total: number, speedText: string) => void,
  onFinished: () => void,
  onError: (err: any) => void,
  userEmail?: string
): Promise<{ stop: () => void }> {
  let isCancelled = false;

  // Request persistent storage so downloaded tiles are never wiped by OS
  enablePersistentStorage().catch(() => {});

  const stop = () => {
    isCancelled = true;
  };

  const tilesToDownload: { z: number; x: number; y: number }[] = [];

  for (let z = region.zoomRange[0]; z <= region.zoomRange[1]; z++) {
    const tileStart = latLngToTile(region.latMax, region.lngMin, z);
    const tileEnd = latLngToTile(region.latMin, region.lngMax, z);

    const xMin = Math.min(tileStart.x, tileEnd.x);
    const xMax = Math.max(tileStart.x, tileEnd.x);
    const yMin = Math.min(tileStart.y, tileEnd.y);
    const yMax = Math.max(tileStart.y, tileEnd.y);

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        tilesToDownload.push({ z, x, y });
      }
    }
  }

  const total = tilesToDownload.length;
  console.log(`[Offline Downloader] Starting download for "${region.name}". Total tiles: ${total}`);

  (async () => {
    let current = 0;
    const maxConsecutiveRealDownloads = 100000;
    let realDownloadCount = 0;
    const BATCH_SIZE = 6;

    for (let i = 0; i < tilesToDownload.length; i += BATCH_SIZE) {
      if (isCancelled) {
        console.log("[Offline Downloader] Canceled.");
        return;
      }

      const batch = tilesToDownload.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (tile) => {
          const tileKey = `${tile.z}-${tile.x}-${tile.y}`;

          // Check if already in cache
          const cached = await getTile(tileKey);
          if (cached) {
            current++;
            onProgress(current, total, "Già memorizzato");
            return;
          }

          let base64Data = "";
          let isReal = false;

          if (navigator.onLine && realDownloadCount < maxConsecutiveRealDownloads) {
            try {
              const directTileUrl = `https://mt1.google.com/vt/lyrs=m&x=${tile.x}&y=${tile.y}&z=${tile.z}`;
              const res = await fetch(directTileUrl);
              if (res.ok) {
                const blob = await res.blob();
                base64Data = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                });
                realDownloadCount++;
                isReal = true;
              }
            } catch (e) {
              // Fallback to OSM style if google direct tile fails
              try {
                const osmUrl = `https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`;
                const osmRes = await fetch(osmUrl);
                if (osmRes.ok) {
                  const blob = await osmRes.blob();
                  base64Data = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                  });
                  realDownloadCount++;
                  isReal = true;
                }
              } catch (osmErr) {}
            }
          }

          if (!base64Data) {
            // Generate local vector parchment tile so the zoom level is never black/broken
            base64Data = generatePlaceholderTile(tile.z, tile.x, tile.y, region.name);
          }

          await saveTile(tileKey, base64Data);
          current++;

          const speedLabel = isReal ? "Scaricando da Server..." : "Generazione cartografica...";
          onProgress(current, total, speedLabel);
        })
      );
    }

    if (!isCancelled) {
      // Save metadata
      const stats = await getStats();
      await saveDownloadedRegionMeta({
        id: region.id,
        name: region.name,
        downloadedAt: Date.now(),
        tileCount: total,
        sizeMB: stats.sizeMB,
        zoomRange: region.zoomRange,
      });

      if (userEmail) {
        syncOfflineRegionsToCloud(userEmail).catch(() => {});
      }

      onFinished();
    }
  })().catch((err) => {
    console.error("[Offline Downloader] Critical error:", err);
    onError(err);
  });

  return { stop };
}
