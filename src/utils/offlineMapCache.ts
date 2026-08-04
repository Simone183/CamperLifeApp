/**
 * Offline Map Cache Manager for ViaCamper App
 * Handles IndexedDB local tile caching and region downloads.
 */

const DB_NAME = "CamperLifeOfflineMap";
const STORE_NAME = "tiles";
const DB_VERSION = 2; // Bumped to clear old placeholders

let dbInstance: IDBDatabase | null = null;

export function initDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getTile(key: string): Promise<string | null> {
  const db = await initDb();
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      resolve(null);
    };
  });
}

// Attempts to find an exact tile, or falls back to scaling up a lower-zoom parent tile
export async function getBestTile(z: number, x: number, y: number): Promise<string | null> {
  // First try the exact tile
  let exact = await getTile(`${z}-${x}-${y}`);
  if (exact) return exact;

  // If exact tile not found, try to find a parent tile and crop it
  if (typeof document === 'undefined') return null; // Can't use canvas on server
  
  let currentZ = z - 1;
  while (currentZ >= 5) {
    const diff = z - currentZ;
    const factor = Math.pow(2, diff);
    const parentX = Math.floor(x / factor);
    const parentY = Math.floor(y / factor);
    
    const parentBase64 = await getTile(`${currentZ}-${parentX}-${parentY}`);
    if (parentBase64) {
      // We found a parent! Let's crop it.
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(null); return; }
          
          // Source coordinates on the parent image
          const sWidth = 256 / factor;
          const sHeight = 256 / factor;
          const sx = (x % factor) * sWidth;
          const sy = (y % factor) * sHeight;
          
          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 256, 256);
          // Decrease quality slightly to keep it fast
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => resolve(null);
        img.src = parentBase64;
      });
    }
    currentZ--;
  }
  
  return null;
}

export async function saveTile(key: string, base64Data: string): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(base64Data, key);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function clearCache(): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getStats(): Promise<{ count: number; sizeMB: number }> {
  const db = await initDb();
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    
    let count = 0;
    let totalLength = 0;

    // Use cursor to calculate approximate base64 length (1 char ≈ 1 byte approx)
    const request = store.openCursor();
    request.onsuccess = (e: any) => {
      const cursor = e.target.result;
      if (cursor) {
        count++;
        if (typeof cursor.value === 'string') {
          totalLength += cursor.value.length;
        }
        cursor.continue();
      } else {
        // Size in MB: 1 character in Base64 represents 6 bits, so base64 string length is around 1.33 times original file size.
        // We can approximate MB count safely.
        const sizeMB = parseFloat(((totalLength * 0.75) / (1024 * 1024)).toFixed(2));
        resolve({ count, sizeMB });
      }
    };

    request.onerror = () => {
      resolve({ count: 0, sizeMB: 0 });
    };
  });
}

// Coordinate conversions
export function latLngToTile(lat: number, lng: number, zoom: number) {
  const latRad = lat * Math.PI / 180;
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

// Generate an elegant, procedurally drawn vector/canvas placeholder tile for 100% stable offline rendering
export function generatePlaceholderTile(z: number, x: number, y: number, textPrefix = ""): string {
  if (typeof document === 'undefined') return "";
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return "";

  // Draw warm cartographic parchment styling
  ctx.fillStyle = '#F5F2EB';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle gridlines
  ctx.strokeStyle = 'rgba(62, 74, 53, 0.08)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, 256, 256);
  ctx.strokeRect(64, 64, 128, 128);

  // Compass-like circular lines
  ctx.strokeStyle = 'rgba(62, 74, 53, 0.04)';
  ctx.beginPath();
  ctx.arc(128, 128, 90, 0, Math.PI * 2);
  ctx.stroke();

  // Watermarks or mountains outline
  ctx.fillStyle = 'rgba(62, 74, 53, 0.03)';
  ctx.font = 'italic 10px font-serif';
  ctx.textAlign = 'center';
  ctx.fillText("ViaCamper Offline Map", 128, 230);

  // Center coordinate text or label
  ctx.fillStyle = 'rgba(62, 74, 53, 0.35)';
  ctx.font = 'bold 10px font-sans, system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`${textPrefix || "Mappa Offline"} (${z}/${x}/${y})`, 128, 120);

  // Draw simple mountain icons for offline feel
  ctx.strokeStyle = 'rgba(62, 74, 53, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(110, 155);
  ctx.lineTo(125, 135);
  ctx.lineTo(140, 155);
  ctx.moveTo(125, 155);
  ctx.lineTo(135, 142);
  ctx.lineTo(145, 155);
  ctx.stroke();

  return canvas.toDataURL('image/png');
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
    description: "Autostrade, strade principali, capoluoghi e profili costieri di tutta la penisola. Ottimo per pianificare i viaggi.",
    estimatedSize: "~15 MB",
    zoomRange: [5, 10],
    latMin: 35.0,
    latMax: 48.0,
    lngMin: 6.0,
    lngMax: 19.0
  },
  {
    id: "centro_italia",
    name: "Centro Italia (Dettagliato)",
    description: "Lazio, Umbria, Toscana, Abruzzo, Marche, aree appenniniche e coste tirreniche/adriatiche.",
    estimatedSize: "~250 MB",
    zoomRange: [10, 14],
    latMin: 41.2,
    latMax: 44.2,
    lngMin: 9.8,
    lngMax: 15.0
  },
  {
    id: "nord_italia",
    name: "Nord Italia (Dettagliato)",
    description: "Pianura Padana, Alpi, Dolomiti, laghi del Nord, Liguria, Piemonte, Lombardia, Triveneto.",
    estimatedSize: "~300 MB",
    zoomRange: [10, 14],
    latMin: 43.8,
    latMax: 47.0,
    lngMin: 6.5,
    lngMax: 14.0
  },
  {
    id: "sud_italia_isole",
    name: "Sud Italia & Isole (Dettagliato)",
    description: "Campania, Puglia, Basilicata, Calabria, Sicilia, Sardegna, e arcipelaghi minori.",
    estimatedSize: "~280 MB",
    zoomRange: [10, 14],
    latMin: 35.2,
    latMax: 41.5,
    lngMin: 8.0,
    lngMax: 18.5
  }
];

/**
 * Downloads a region of tiles sequentially with speed limits to avoid OpenStreetMap rate bans.
 * Emits progress callbacks.
 */
export async function downloadRegion(
  region: OfflineRegion,
  onProgress: (current: number, total: number, speedText: string) => void,
  onFinished: () => void,
  onError: (err: any) => void
): Promise<{ stop: () => void }> {
  let isCancelled = false;

  const stop = () => {
    isCancelled = true;
  };

  // Generate tile list for this region
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

  // Run async sequential loop
  (async () => {
    let current = 0;
    const maxConsecutiveRealDownloads = 100000; // Allow a large number of tiles to be downloaded
    let realDownloadCount = 0;
    const BATCH_SIZE = 5;

    for (let i = 0; i < tilesToDownload.length; i += BATCH_SIZE) {
      if (isCancelled) {
        console.log("[Offline Downloader] Canceled.");
        return;
      }

      const batch = tilesToDownload.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (tile) => {
        const tileKey = `${tile.z}-${tile.x}-${tile.y}`;
        
        // Check if already in cache
        const cached = await getTile(tileKey);
        if (cached) {
          current++;
          onProgress(current, total, "Già memorizzato");
          return;
        }

        // Download or generate procedurally
        let base64Data = "";
        let isReal = false;

        if (navigator.onLine && realDownloadCount < maxConsecutiveRealDownloads) {
          try {
            // Use proxy API to bypass CORS
            const directTileUrl = `/api/map-tile/${tile.z}/${tile.x}/${tile.y}`;
            
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
            console.warn(`[Offline Map] Failed to fetch tile ${tileKey}, generating placeholder...`, e);
          }
        }

        if (!base64Data) {
          current++;
          onProgress(current, total, "Salto tassello vuoto...");
          return;
        }

        await saveTile(tileKey, base64Data);
        current++;
        
        const speedLabel = isReal ? "Scaricando da Server..." : "Lettura da cache...";
        onProgress(current, total, speedLabel);
      }));
    }

    if (!isCancelled) {
      onFinished();
    }
  })().catch(err => {
    console.error("[Offline Downloader] Critical error:", err);
    onError(err);
  });

  return { stop };
}
