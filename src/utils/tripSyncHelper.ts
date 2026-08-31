import { Trip, DiaryExpense, TripMovement, TripStop, DiaryPhoto } from "../types";

export function normalizeTrip(rawTrip: any): Trip {
  if (!rawTrip || typeof rawTrip !== "object") {
    return {
      id: `trip_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: "Viaggio Senza Titolo",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      expenses: [],
      movements: [],
      stops: [],
      photos: [],
      routePoints: [],
    } as Trip;
  }

  const cleanExpenses: DiaryExpense[] = Array.isArray(rawTrip.expenses)
    ? rawTrip.expenses.map((e: any, idx: number) => {
        const item: DiaryExpense = {
          id: String(e?.id || `exp_${Date.now()}_${idx}`),
          title: String(e?.title || "Spesa"),
          amount: typeof e?.amount === "number" && !isNaN(e.amount) ? e.amount : parseFloat(e?.amount) || 0,
          category: e?.category || "Altro",
          date: String(e?.date || new Date().toISOString().split("T")[0]),
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
    ? rawTrip.movements.map((m: any, idx: number) => ({
        id: String(m?.id || `mov_${Date.now()}_${idx}`),
        location: String(m?.location || "Tappa"),
        odometer: typeof m?.odometer === "number" && !isNaN(m.odometer) ? m.odometer : parseFloat(m?.odometer) || 0,
        date: String(m?.date || new Date().toISOString()),
        notes: String(m?.notes || ""),
      }))
    : [];

  const cleanStops: TripStop[] = Array.isArray(rawTrip.stops)
    ? rawTrip.stops.map((s: any, idx: number) => ({
        id: String(s?.id || `stop_${Date.now()}_${idx}`),
        name: String(s?.name || "Sosta"),
        lat: typeof s?.lat === "number" ? s.lat : 0,
        lng: typeof s?.lng === "number" ? s.lng : 0,
        expenses: typeof s?.expenses === "number" ? s.expenses : 0,
        category: s?.category || "Sosta Libera",
        notes: String(s?.notes || ""),
      }))
    : [];

  const cleanPhotos: DiaryPhoto[] = Array.isArray(rawTrip.photos)
    ? rawTrip.photos.map((p: any, idx: number) => {
        const photoItem: DiaryPhoto = {
          id: String(p?.id || `photo_${Date.now()}_${idx}`),
          url: String(p?.url || ""),
          description: String(p?.description || ""),
          date: String(p?.date || new Date().toISOString().split("T")[0]),
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
  } as Trip;
}

export function mergeTrips(localTrips: any[], cloudTrips: any[]): Trip[] {
  const normLocal = (Array.isArray(localTrips) ? localTrips : []).map(normalizeTrip);
  const normCloud = (Array.isArray(cloudTrips) ? cloudTrips : []).map(normalizeTrip);

  const tripMap = new Map<string, Trip>();

  // Cloud trips first
  for (const cTrip of normCloud) {
    if (cTrip.id) {
      tripMap.set(cTrip.id, cTrip);
    }
  }

  // Local trips merge
  for (const lTrip of normLocal) {
    if (!lTrip.id) continue;
    const existing = tripMap.get(lTrip.id);

    if (!existing) {
      tripMap.set(lTrip.id, lTrip);
    } else {
      // Merge expenses by ID
      const expMap = new Map<string, DiaryExpense>();
      existing.expenses.forEach(e => expMap.set(e.id, e));
      lTrip.expenses.forEach(e => expMap.set(e.id, e));

      // Merge movements by ID
      const movMap = new Map<string, TripMovement>();
      existing.movements.forEach(m => movMap.set(m.id, m));
      lTrip.movements.forEach(m => movMap.set(m.id, m));

      // Merge stops by ID
      const stopMap = new Map<string, TripStop>();
      existing.stops.forEach(s => stopMap.set(s.id, s));
      lTrip.stops.forEach(s => stopMap.set(s.id, s));

      // Merge photos by ID or URL
      const photoMap = new Map<string, DiaryPhoto>();
      existing.photos.forEach(p => photoMap.set(p.id || p.url, p));
      lTrip.photos.forEach(p => photoMap.set(p.id || p.url, p));

      const mergedRoutePoints = lTrip.routePoints.length >= existing.routePoints.length
        ? lTrip.routePoints
        : existing.routePoints;

      const mergedTrip: Trip = {
        ...existing,
        ...lTrip,
        startOdometer: lTrip.startOdometer || existing.startOdometer,
        endOdometer: Math.max(lTrip.endOdometer || 0, existing.endOdometer || 0) || undefined,
        expenses: Array.from(expMap.values()),
        movements: Array.from(movMap.values()),
        stops: Array.from(stopMap.values()),
        photos: Array.from(photoMap.values()),
        routePoints: mergedRoutePoints,
      };

      tripMap.set(lTrip.id, mergedTrip);
    }
  }

  return Array.from(tripMap.values());
}
