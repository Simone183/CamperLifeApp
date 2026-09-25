import { Trip, DiaryExpense, TripMovement, TripStop, DiaryPhoto } from "../types";
import { savePhotoToIndexedDB, deletePhotoFromIndexedDB } from "./photoStorage";
import { cleanTravelStoryText } from "./cleanStoryText";

export const SICILIA_PURGED_PHOTO_IDS = new Set<string>();

export function isSiciliaTrip(_trip: any): boolean {
  return false;
}

export function isSicilia29AugPhoto(_photo: any, _isSicilia = false): boolean {
  return false;
}

export type DeletionType = 'photos' | 'trips' | 'expenses' | 'movements';

/**
 * Get the set of deleted entity IDs stored in localStorage for the user.
 * This guarantees tombstones persist across page refreshes and cloud merges.
 */
export function getDeletedIds(type: DeletionType, email?: string): Set<string> {
  const cleanEmail = (email || '').toLowerCase().trim();
  const set = new Set<string>();
  try {
    const key = cleanEmail ? `camper_deleted_${type}_${cleanEmail}` : `camper_deleted_${type}_guest`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const id of parsed) {
          if (!id || typeof id !== 'string') continue;
          const trimmed = id.trim();
          if (!trimmed) continue;
          // Protect against generic index IDs accidentally purging records across trips
          if (/^(exp|mov|photo)_(\d+|.*_\d+)$/.test(trimmed)) continue;
          set.add(trimmed);
        }
      }
    }
  } catch {}
  return set;
}

/**
 * Permanently record a deletion tombstone so that no cloud sync or merge can ever resurrect it.
 */
export function recordDeletedId(type: DeletionType, id: string, email?: string): void {
  const cleanEmail = (email || '').toLowerCase().trim();
  if (!id || typeof id !== 'string') return;
  const trimmed = id.trim();
  if (!trimmed || /^(exp|mov|photo)_(\d+|.*_\d+)$/.test(trimmed)) return;
  try {
    const key = cleanEmail ? `camper_deleted_${type}_${cleanEmail}` : `camper_deleted_${type}_guest`;
    const set = getDeletedIds(type, cleanEmail);
    set.add(trimmed);
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn(`[Tombstone] Error recording deleted ${type}:`, err);
  }
}

export function unrecordDeletedId(type: DeletionType, id: string, email?: string): void {
  const cleanEmail = (email || '').toLowerCase().trim();
  if (!id || typeof id !== 'string') return;
  const trimmed = id.trim();
  if (!trimmed) return;
  try {
    const key = cleanEmail ? `camper_deleted_${type}_${cleanEmail}` : `camper_deleted_${type}_guest`;
    const set = getDeletedIds(type, cleanEmail);
    if (set.has(trimmed)) {
      set.delete(trimmed);
      localStorage.setItem(key, JSON.stringify(Array.from(set)));
    }
  } catch {}
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

  const tripId = String(rawTrip.id || `trip_${Date.now()}`);

  // When normalizing an active trip record, do NOT destructively purge its own items.
  // If an expense, movement, or photo is present in the object, keep it.
  const cleanExpenses: DiaryExpense[] = Array.isArray(rawTrip.expenses)
    ? rawTrip.expenses
        .filter((e: any) => e && (e as any).deleted !== true)
        .map((e: any, idx: number) => {
          const expId = String(e?.id || `exp_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`);
          if (userEmail) unrecordDeletedId('expenses', expId, userEmail);
          const item: DiaryExpense = {
            id: expId,
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
        .filter((m: any) => m && (m as any).deleted !== true)
        .map((m: any, idx: number) => {
          const movId = String(m?.id || `mov_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`);
          if (userEmail) unrecordDeletedId('movements', movId, userEmail);
          return {
            id: movId,
            location: String(m?.location || "Tappa"),
            odometer: typeof m?.odometer === "number" && !isNaN(m.odometer) ? m.odometer : parseFloat(m?.odometer) || 0,
            date: String(m?.date || "2025-01-01"),
            notes: String(m?.notes || ""),
          };
        })
    : [];

  const cleanStops: TripStop[] = Array.isArray(rawTrip.stops)
    ? rawTrip.stops.map((s: any, idx: number) => ({
        id: String(s?.id || `stop_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`),
        name: String(s?.name || "Sosta"),
        lat: typeof s?.lat === "number" ? s.lat : 0,
        lng: typeof s?.lng === "number" ? s.lng : 0,
        expenses: typeof s?.expenses === "number" ? s.expenses : 0,
        category: s?.category || "Sosta Libera",
        notes: String(s?.notes || ""),
      }))
    : [];

  const cleanPhotos: DiaryPhoto[] = Array.isArray(rawTrip.photos)
    ? rawTrip.photos
        .filter((p: any) => p && p.deleted !== true)
        .map((p: any, idx: number) => {
          const photoId = String(p?.id || `photo_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`);
          if (userEmail) unrecordDeletedId('photos', photoId, userEmail);
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
          if (p?.time) {
            photoItem.time = String(p.time);
          }
          if (p?.dateSource) {
            photoItem.dateSource = p.dateSource;
          }
          if (p?.locationName) {
            photoItem.locationName = String(p.locationName);
          }
          if (p?.isStarred !== undefined) {
            photoItem.isStarred = Boolean(p.isStarred);
          }
          if (p?.deleted !== undefined) {
            photoItem.deleted = Boolean(p.deleted);
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

  let normalizedStatus: Trip["status"] = rawTrip.status;
  if (normalizedStatus === "Completato" || (normalizedStatus as any) === "COMPLETATO") {
    normalizedStatus = "Completato";
  } else if (normalizedStatus === "Pianificato" || (normalizedStatus as any) === "PIANIFICATO") {
    normalizedStatus = "Pianificato";
  } else if (normalizedStatus === "Attivo" || (normalizedStatus as any) === "ATTIVO" || normalizedStatus === "In corso") {
    normalizedStatus = "Attivo";
  } else if (!normalizedStatus) {
    normalizedStatus = "Attivo";
  }

  return {
    ...rawTrip,
    id: tripId,
    title: String(rawTrip.title || "Viaggio Senza Titolo"),
    startDate: String(rawTrip.startDate || new Date().toISOString().split("T")[0]),
    endDate: String(rawTrip.endDate || new Date().toISOString().split("T")[0]),
    description: cleanTravelStoryText(String(rawTrip.description || "")),
    status: normalizedStatus,
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

  // If items exist locally in localTrip, they CANNOT be considered deleted tombstones
  for (const exp of localTrip.expenses || []) {
    if (exp?.id && deletedExpenses.has(exp.id)) {
      unrecordDeletedId('expenses', exp.id, userEmail);
      deletedExpenses.delete(exp.id);
    }
  }
  for (const mov of localTrip.movements || []) {
    if (mov?.id && deletedMovements.has(mov.id)) {
      unrecordDeletedId('movements', mov.id, userEmail);
      deletedMovements.delete(mov.id);
    }
  }
  for (const p of localTrip.photos || []) {
    if (p?.id && deletedPhotos.has(p.id)) {
      unrecordDeletedId('photos', p.id, userEmail);
      deletedPhotos.delete(p.id);
    }
  }

  // 1. Merge expenses: all local expenses + any cloud expense not locally deleted
  const expenseMap = new Map<string, DiaryExpense>();
  for (const exp of localTrip.expenses || []) {
    if (exp?.id) {
      expenseMap.set(exp.id, exp);
    }
  }
  for (const exp of cloudTrip.expenses || []) {
    if (exp?.id && !deletedExpenses.has(exp.id)) {
      if (expenseMap.has(exp.id)) {
        const localExp = expenseMap.get(exp.id)!;
        const localOdo = typeof localExp.odometer === 'number' && localExp.odometer > 0 ? localExp.odometer : undefined;
        const cloudOdo = typeof exp.odometer === 'number' && exp.odometer > 0 ? exp.odometer : undefined;
        const bestOdo = localOdo !== undefined ? localOdo : cloudOdo;
        
        const merged: DiaryExpense = {
          ...exp,
          ...localExp,
          ...(bestOdo !== undefined ? { odometer: bestOdo } : {}),
          liters: localExp.liters !== undefined ? localExp.liters : exp.liters,
          pricePerLiter: localExp.pricePerLiter !== undefined ? localExp.pricePerLiter : exp.pricePerLiter,
          fuelCompany: localExp.fuelCompany || exp.fuelCompany,
          isFullTank: localExp.isFullTank !== undefined ? localExp.isFullTank : exp.isFullTank,
        };
        expenseMap.set(exp.id, merged);
      } else {
        expenseMap.set(exp.id, exp);
      }
    }
  }

  // 2. Merge movements: all local movements + any cloud movement not locally deleted
  const movementMap = new Map<string, TripMovement>();
  for (const mov of localTrip.movements || []) {
    if (mov?.id) {
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
        movementMap.set(mov.id, mov);
      }
    }
  }

  // 3. Merge photos: all local photos + any cloud photo not locally deleted
  const photoMap = new Map<string, DiaryPhoto>();
  for (const p of localTrip.photos || []) {
    if (p?.id) {
      photoMap.set(p.id, p);
    }
  }
  for (const p of cloudTrip.photos || []) {
    if (p?.id && !deletedPhotos.has(p.id)) {
      if (!photoMap.has(p.id)) {
        photoMap.set(p.id, p);
      } else {
        const localPhoto = photoMap.get(p.id)!;
        const isBetterUrl = (u?: string) => u && (u.startsWith("data:") || u.startsWith("/api/photos/") || u.startsWith("blob:"));
        const starred = localPhoto.isStarred !== undefined ? localPhoto.isStarred : p.isStarred;
        if (isBetterUrl(p.url) && !isBetterUrl(localPhoto.url)) {
          photoMap.set(p.id, { ...localPhoto, ...p, url: p.url, isStarred: starred });
        } else if (isBetterUrl(localPhoto.url)) {
          photoMap.set(p.id, { ...p, ...localPhoto, url: localPhoto.url, isStarred: starred });
        } else {
          photoMap.set(p.id, { ...localPhoto, ...p, isStarred: starred });
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
    if (!lDesc && cDesc) {
      bestDescription = cloudTrip.description;
    } else if (lDesc && !cDesc) {
      bestDescription = localTrip.description;
    } else if (cDesc.length > lDesc.length) {
      bestDescription = cloudTrip.description;
    } else {
      bestDescription = localTrip.description || cloudTrip.description || "";
    }
  }

  const bestTitle = isCloudNewer ? (cloudTrip.title || localTrip.title) : (localTrip.title || cloudTrip.title);
  
  // Trip status: A trip marked "Completato" must NEVER be reopened to "Attivo" or "In corso"
  // unless the opposing side was explicitly modified with a strictly newer timestamp.
  let bestStatus = localTrip.status || cloudTrip.status || "Completato";
  const isLocalCompleted = localTrip.status === "Completato" || localTrip.status === "COMPLETATO";
  const isCloudCompleted = cloudTrip.status === "Completato" || cloudTrip.status === "COMPLETATO";

  if (isLocalCompleted || isCloudCompleted) {
    if (isLocalCompleted && !isCloudCompleted) {
      // Local marked completed: keep completed unless cloud has a strictly newer timestamp where user actively reopened it
      bestStatus = (isCloudNewer && cloudTrip.status) ? cloudTrip.status : "Completato";
    } else if (isCloudCompleted && !isLocalCompleted) {
      // Cloud marked completed: keep completed unless local has a strictly newer timestamp where user actively reopened it
      bestStatus = (isLocalNewer && localTrip.status) ? localTrip.status : "Completato";
    } else {
      bestStatus = "Completato";
    }
  } else {
    bestStatus = isLocalNewer ? (localTrip.status || cloudTrip.status || "Attivo") : (cloudTrip.status || localTrip.status || "Attivo");
  }

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
    description: cleanTravelStoryText(bestDescription),
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
