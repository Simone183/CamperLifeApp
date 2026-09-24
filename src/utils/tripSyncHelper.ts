import { Trip, DiaryExpense, TripMovement, TripStop, DiaryPhoto } from "../types";
import { savePhotoToIndexedDB, deletePhotoFromIndexedDB } from "./photoStorage";

export const SICILIA_PURGED_PHOTO_IDS = new Set<string>([
  "photo_1790087208782",
  "photo_1790087208783",
  "photo_1790087208784",
  "photo_1790087208785",
  "photo_1790087295632",
  "photo_1790087295634",
  "photo_1790087295635",
  "photo_1790087295636",
  "photo_1790087295637",
  "photo_1790088702498",
  "photo_1790088702499",
  "photo_1790088702500",
  "photo_1790088702501",
  "photo_1790088702502",
  "photo_1790088702503",
  "photo_1790088702504",
  "photo_1790088702505",
]);

export function isSiciliaTrip(trip: any): boolean {
  if (!trip) return false;
  const id = String(trip.id || "");
  const title = String(trip.title || "").toLowerCase();
  return id === "trip_1787575589438" || title.includes("sicilia");
}

export function isSicilia29AugPhoto(photo: any, isSicilia = false): boolean {
  if (!photo) return false;
  const pid = String(photo.id || "");
  if (SICILIA_PURGED_PHOTO_IDS.has(pid)) return true;
  if (!isSicilia) return false;
  const d = String(photo.date || "").trim();
  const is29Aug = (
    d === "2026-08-29" ||
    d === "29/08/26" ||
    d === "29/08/2026" ||
    d.startsWith("2026-08-29") ||
    d.startsWith("29/08/26") ||
    d.startsWith("29/08/2026")
  );
  // Only purge 29 Aug photos if they are legacy ghost placeholders with no valid image or marked recovered
  if (is29Aug) {
    const url = String(photo.url || "");
    const isGhost = !url || url.startsWith("/uploads/") || photo.description === "Foto recuperata dalla memoria";
    if (isGhost) return true;
  }
  return false;
}

export type DeletionType = 'photos' | 'trips' | 'expenses' | 'movements';

/**
 * Get the set of deleted entity IDs stored in localStorage for the user.
 * This guarantees tombstones persist across page refreshes and cloud merges.
 */
export function getDeletedIds(type: DeletionType, email?: string): Set<string> {
  const cleanEmail = (email || '').toLowerCase().trim();
  if (!cleanEmail) {
    try {
      const guestRaw = localStorage.getItem(`camper_deleted_${type}_guest`);
      if (guestRaw) {
        const parsed = JSON.parse(guestRaw);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch {}
    return new Set();
  }
  try {
    const raw = localStorage.getItem(`camper_deleted_${type}_${cleanEmail}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
}

/**
 * Permanently record a deletion tombstone so that no cloud sync or merge can ever resurrect it.
 */
export function recordDeletedId(type: DeletionType, id: string, email?: string): void {
  const cleanEmail = (email || '').toLowerCase().trim();
  if (!id) return;
  try {
    const key = cleanEmail ? `camper_deleted_${type}_${cleanEmail}` : `camper_deleted_${type}_guest`;
    const set = getDeletedIds(type, cleanEmail);
    set.add(id);
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn(`[Tombstone] Error recording deleted ${type}:`, err);
  }
}

export function isDeletedId(type: DeletionType, id: string, email?: string): boolean {
  if (!id) return false;
  return getDeletedIds(type, email).has(id);
}

export function normalizeTrip(rawTrip: any, userEmail?: string): Trip {
  if (!rawTrip || typeof rawTrip !== "object") {
    return {
      id: "trip_default",
      title: "Viaggio Senza Titolo",
      startDate: "2025-01-01",
      endDate: "2025-01-01",
      expenses: [],
      movements: [],
      stops: [],
      photos: [],
      routePoints: [],
    } as Trip;
  }

  const deletedPhotos = getDeletedIds('photos', userEmail);
  const deletedExpenses = getDeletedIds('expenses', userEmail);
  const deletedMovements = getDeletedIds('movements', userEmail);

  const cleanExpenses: DiaryExpense[] = Array.isArray(rawTrip.expenses)
    ? rawTrip.expenses
        .filter((e: any) => e && !deletedExpenses.has(String(e.id || '')))
        .map((e: any, idx: number) => {
          const item: DiaryExpense = {
            id: String(e?.id || `exp_${idx}`),
            title: String(e?.title || "Spesa"),
            amount: typeof e?.amount === "number" && !isNaN(e.amount) ? e.amount : parseFloat(e?.amount) || 0,
            category: e?.category || "Altro",
            date: String(e?.date || "2025-01-01"),
          };
          if (e?.liters !== undefined && e?.liters !== null && !isNaN(Number(e.liters))) {
            item.liters = Number(e.liters);
          }
          if (e?.pricePerLiter !== undefined && e?.pricePerLiter !== null && !isNaN(Number(e.pricePerLiter))) {
            item.pricePerLiter = Number(e.pricePerLiter);
          }
          if (e?.odometer !== undefined && e?.odometer !== null && !isNaN(Number(e.odometer))) {
            item.odometer = Number(e.odometer);
          }
          if (e?.fuelCompany) {
            item.fuelCompany = String(e.fuelCompany);
          }
          if (e?.isFullTank !== undefined) {
            item.isFullTank = Boolean(e.isFullTank);
          }
          return item;
        })
    : [];

  const cleanMovements: TripMovement[] = Array.isArray(rawTrip.movements)
    ? rawTrip.movements
        .filter((m: any) => m && !deletedMovements.has(String(m.id || '')))
        .map((m: any, idx: number) => ({
          id: String(m?.id || `mov_${idx}`),
          location: String(m?.location || "Tappa"),
          odometer: typeof m?.odometer === "number" && !isNaN(m.odometer) ? m.odometer : parseFloat(m?.odometer) || 0,
          date: String(m?.date || "2025-01-01"),
          notes: String(m?.notes || ""),
        }))
    : [];

  const cleanStops: TripStop[] = Array.isArray(rawTrip.stops)
    ? rawTrip.stops.map((s: any, idx: number) => ({
        id: String(s?.id || `stop_${idx}`),
        name: String(s?.name || "Sosta"),
        lat: typeof s?.lat === "number" ? s.lat : 0,
        lng: typeof s?.lng === "number" ? s.lng : 0,
        expenses: typeof s?.expenses === "number" ? s.expenses : 0,
        category: s?.category || "Sosta Libera",
        notes: String(s?.notes || ""),
      }))
    : [];

  const isSicilia = isSiciliaTrip(rawTrip);
  const cleanPhotos: DiaryPhoto[] = Array.isArray(rawTrip.photos)
    ? rawTrip.photos
        .filter((p: any) => {
          if (!p) return false;
          if (p.deleted === true) return false;
          const photoId = String(p.id || '');
          const photoUrl = String(p.url || '');
          if (deletedPhotos.has(photoId) || (photoUrl && deletedPhotos.has(photoUrl))) {
            return false;
          }
          if (isSicilia29AugPhoto(p, isSicilia)) {
            deletePhotoFromIndexedDB(photoId).catch(() => {});
            return false;
          }
          return true;
        })
        .map((p: any, idx: number) => {
          const photoId = String(p?.id || `photo_${idx}`);
          let photoUrl = String(p?.url || "");
          if (photoUrl.startsWith("data:image/")) {
            // Offload base64 data to IndexedDB to keep trip documents ultra-lightweight (<1MB)
            savePhotoToIndexedDB(photoId, photoUrl).catch(() => {});
            photoUrl = `/api/photos/${photoId}`;
          }
          const photoItem: DiaryPhoto = {
            id: photoId,
            url: photoUrl,
            description: String(p?.description || ""),
            date: String(p?.date || "2025-01-01"),
          };
          if (p?.locationName) {
            photoItem.locationName = String(p.locationName);
          }
          return photoItem;
        })
    : [];

  const cleanRoutePoints = Array.isArray(rawTrip.routePoints)
    ? rawTrip.routePoints.map((pt: any) => ({
        lat: typeof pt?.lat === "number" ? pt.lat : 0,
        lng: typeof pt?.lng === "number" ? pt.lng : 0,
        ...(pt?.name ? { name: String(pt.name) } : {}),
      }))
    : [];

  return {
    ...rawTrip,
    id: String(rawTrip.id || `trip_${Date.now()}`),
    title: String(rawTrip.title || "Viaggio Senza Titolo"),
    startDate: String(rawTrip.startDate || new Date().toISOString().split("T")[0]),
    endDate: String(rawTrip.endDate || new Date().toISOString().split("T")[0]),
    description: String(rawTrip.description || ""),
    status: rawTrip.status || "In corso",
    expenses: cleanExpenses,
    movements: cleanMovements,
    stops: cleanStops,
    photos: cleanPhotos,
    routePoints: cleanRoutePoints,
    ...(rawTrip.updatedAt ? { updatedAt: String(rawTrip.updatedAt) } : {}),
  } as Trip;
}

/**
 * Intelligently merges a single trip from local and cloud versions.
 * Preserves all distinct expenses, movements, photos and stops, while respecting local deletions.
 */
export function mergeSingleTrip(localTrip: Trip, cloudTrip: Trip, userEmail?: string): Trip {
  const deletedExpenses = getDeletedIds('expenses', userEmail);
  const deletedMovements = getDeletedIds('movements', userEmail);
  const deletedPhotos = getDeletedIds('photos', userEmail);

  // 1. Merge expenses by ID or by exact signature
  const expenseMap = new Map<string, DiaryExpense>();
  for (const exp of localTrip.expenses || []) {
    if (exp?.id && !deletedExpenses.has(exp.id)) {
      expenseMap.set(exp.id, exp);
    }
  }
  for (const exp of cloudTrip.expenses || []) {
    if (exp?.id && !deletedExpenses.has(exp.id)) {
      if (expenseMap.has(exp.id)) {
        const localExp = expenseMap.get(exp.id)!;
        const merged: DiaryExpense = { ...exp, ...localExp };
        if (localExp.odometer === undefined) {
          delete (merged as any).odometer;
        }
        expenseMap.set(exp.id, merged);
      } else {
        const isDuplicate = Array.from(expenseMap.values()).some(
          existing => existing.date === exp.date && Math.abs(Number(existing.amount) - Number(exp.amount)) < 0.01 && existing.title === exp.title
        );
        if (!isDuplicate) {
          expenseMap.set(exp.id, exp);
        }
      }
    }
  }

  // 2. Merge movements by ID
  const movementMap = new Map<string, TripMovement>();
  for (const mov of localTrip.movements || []) {
    if (mov?.id && !deletedMovements.has(mov.id)) {
      movementMap.set(mov.id, mov);
    }
  }
  for (const mov of cloudTrip.movements || []) {
    if (mov?.id && !deletedMovements.has(mov.id)) {
      if (movementMap.has(mov.id)) {
        const localMov = movementMap.get(mov.id)!;
        const localOdo = typeof localMov.odometer === 'number' ? localMov.odometer : parseFloat(localMov.odometer as any);
        const cloudOdo = typeof mov.odometer === 'number' ? mov.odometer : parseFloat(mov.odometer as any);
        let bestOdo = localOdo;
        if ((isNaN(localOdo) || localOdo <= 0) && !isNaN(cloudOdo) && cloudOdo > 0) {
          bestOdo = cloudOdo;
        }
        movementMap.set(mov.id, {
          ...mov,
          ...localMov,
          odometer: bestOdo,
        });
      } else {
        const isDuplicate = Array.from(movementMap.values()).some(
          existing => existing.date === mov.date && existing.location === mov.location && existing.odometer === mov.odometer
        );
        if (!isDuplicate) {
          movementMap.set(mov.id, mov);
        }
      }
    }
  }

  // 3. Merge photos by ID or URL
  const isSicilia = isSiciliaTrip(localTrip) || isSiciliaTrip(cloudTrip);
  const photoMap = new Map<string, DiaryPhoto>();
  for (const p of localTrip.photos || []) {
    if (p?.id && !deletedPhotos.has(p.id)) {
      if (isSicilia29AugPhoto(p, isSicilia)) {
        deletePhotoFromIndexedDB(p.id).catch(() => {});
        continue;
      }
      photoMap.set(p.id, p);
    }
  }
  for (const p of cloudTrip.photos || []) {
    if (p?.id && !deletedPhotos.has(p.id)) {
      if (isSicilia29AugPhoto(p, isSicilia)) {
        deletePhotoFromIndexedDB(p.id).catch(() => {});
        continue;
      }
      if (!photoMap.has(p.id)) {
        const urlExists = Array.from(photoMap.values()).some(existing => existing.url === p.url);
        if (!urlExists) {
          photoMap.set(p.id, p);
        }
      } else {
        const localPhoto = photoMap.get(p.id)!;
        const isBetterUrl = (u?: string) => u && (u.startsWith("data:") || u.startsWith("/api/photos/") || u.startsWith("blob:"));
        if (isBetterUrl(p.url) && !isBetterUrl(localPhoto.url)) {
          photoMap.set(p.id, { ...localPhoto, ...p, url: p.url });
        } else if (isBetterUrl(localPhoto.url)) {
          photoMap.set(p.id, { ...p, ...localPhoto, url: localPhoto.url });
        } else {
          photoMap.set(p.id, { ...localPhoto, ...p });
        }
      }
    }
  }

  // 4. Merge stops by ID
  const stopMap = new Map<string, TripStop>();
  for (const s of localTrip.stops || []) {
    if (s?.id) stopMap.set(s.id, s);
  }
  for (const s of cloudTrip.stops || []) {
    if (s?.id && !stopMap.has(s.id)) stopMap.set(s.id, s);
  }

  // 5. Merge route points
  const localPoints = localTrip.routePoints || [];
  const cloudPoints = cloudTrip.routePoints || [];
  const mergedPoints = localPoints.length >= cloudPoints.length ? localPoints : cloudPoints;

  // 6. Intelligent merge for trip metadata & Racconto (description)
  const localUpdated = localTrip.updatedAt ? new Date(localTrip.updatedAt).getTime() : 0;
  const cloudUpdated = cloudTrip.updatedAt ? new Date(cloudTrip.updatedAt).getTime() : 0;
  const isCloudNewer = !isNaN(cloudUpdated) && cloudUpdated > (isNaN(localUpdated) ? 0 : localUpdated);
  const isLocalNewer = !isNaN(localUpdated) && localUpdated > (isNaN(cloudUpdated) ? 0 : cloudUpdated);

  // Description / Racconto merging
  const lDesc = (localTrip.description || "").trim();
  const cDesc = (cloudTrip.description || "").trim();
  let bestDescription = localTrip.description || cloudTrip.description || "";

  if (isCloudNewer && cDesc) {
    bestDescription = cloudTrip.description;
  } else if (isLocalNewer && lDesc) {
    bestDescription = localTrip.description;
  } else {
    // If timestamps are equal, absent, or one side is empty:
    if (!lDesc && cDesc) {
      bestDescription = cloudTrip.description;
    } else if (lDesc && !cDesc) {
      bestDescription = localTrip.description;
    } else if (cDesc.length > lDesc.length) {
      // Prefer richer description (e.g. mobile OCR transcribed story)
      bestDescription = cloudTrip.description;
    } else {
      bestDescription = localTrip.description || cloudTrip.description || "";
    }
  }

  const bestTitle = isCloudNewer ? (cloudTrip.title || localTrip.title) : (localTrip.title || cloudTrip.title);
  const bestStatus = isCloudNewer ? (cloudTrip.status || localTrip.status) : (localTrip.status || cloudTrip.status);
  const bestStartDate = isCloudNewer ? (cloudTrip.startDate || localTrip.startDate) : (localTrip.startDate || cloudTrip.startDate);
  const bestEndDate = isCloudNewer ? (cloudTrip.endDate || localTrip.endDate) : (localTrip.endDate || cloudTrip.endDate);

  const bestStartOdo = (isCloudNewer && cloudTrip.startOdometer !== undefined)
    ? cloudTrip.startOdometer
    : (localTrip.startOdometer !== undefined ? localTrip.startOdometer : cloudTrip.startOdometer);

  const bestEndOdo = (isCloudNewer && cloudTrip.endOdometer !== undefined)
    ? cloudTrip.endOdometer
    : (localTrip.endOdometer !== undefined ? localTrip.endOdometer : cloudTrip.endOdometer);

  const finalUpdatedAt = cloudUpdated > localUpdated
    ? cloudTrip.updatedAt
    : (localTrip.updatedAt || cloudTrip.updatedAt || new Date().toISOString());

  return {
    ...localTrip,
    title: bestTitle,
    description: bestDescription,
    startDate: bestStartDate,
    endDate: bestEndDate,
    status: bestStatus,
    startOdometer: bestStartOdo,
    endOdometer: bestEndOdo,
    expenses: Array.from(expenseMap.values()).sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    movements: Array.from(movementMap.values()).sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    photos: Array.from(photoMap.values()),
    stops: Array.from(stopMap.values()),
    routePoints: mergedPoints,
    updatedAt: finalUpdatedAt,
  };
}

/**
 * Merges local and cloud trips.
 * Automatically merges the details (expenses, movements, photos) when a trip exists on both devices,
 * while strictly honoring local deletions (tombstones).
 */
export function mergeTrips(localTrips: any[], cloudTrips: any[], userEmail?: string): Trip[] {
  const normLocal = (Array.isArray(localTrips) ? localTrips : []).map((t) => normalizeTrip(t, userEmail));
  const normCloud = (Array.isArray(cloudTrips) ? cloudTrips : []).map((t) => normalizeTrip(t, userEmail));

  const deletedTrips = getDeletedIds('trips', userEmail);
  const tripMap = new Map<string, Trip>();

  // If local is completely empty (e.g. fresh login on a new device), cloud initializes state
  if (normLocal.length === 0) {
    for (const cTrip of normCloud) {
      if (cTrip.id && !deletedTrips.has(cTrip.id)) {
        tripMap.set(cTrip.id, cTrip);
      }
    }
    return Array.from(tripMap.values());
  }

  // Load local trips
  for (const lTrip of normLocal) {
    if (!lTrip.id || deletedTrips.has(lTrip.id)) continue;
    tripMap.set(lTrip.id, lTrip);
  }

  // Merge cloud trips
  for (const cTrip of normCloud) {
    if (!cTrip.id) continue;
    if (deletedTrips.has(cTrip.id)) continue;

    if (tripMap.has(cTrip.id)) {
      const localVersion = tripMap.get(cTrip.id)!;
      // Deep merge the trip details so expenses, movements, photos from both devices are preserved!
      const mergedTrip = mergeSingleTrip(localVersion, cTrip, userEmail);
      tripMap.set(cTrip.id, mergedTrip);
    } else {
      // Entirely new trip from cloud
      tripMap.set(cTrip.id, cTrip);
    }
  }

  return Array.from(tripMap.values());
}
