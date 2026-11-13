import React from 'react';
import { useAppSettings } from '../useAppSettings';
import { getCurrencySymbol, getDistanceUnit, getFuelEfficiencyUnit, getFuelEfficiencyValue } from '../unit-helpers';
import { Fuel, Plus, Trash2, ArrowLeft, RefreshCw, AlertCircle, MapPin, Pencil } from 'lucide-react';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { resolveMediaUrl, resolveApiUrl } from '../utils/resolveMediaUrl';
import { useFamilyCrew } from '../context/FamilyCrewContext';
import { FamilyCrewTabBanner } from './FamilyCrewModal';

interface FuelCardTabProps {
  currentUser: { email: string; nickname?: string } | null;
  trips?: any[];
  onOpenCrewModal?: () => void;
}

export interface FuelLog {
  id: string;
  date: string;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  odometer: number;
  isFullTank: boolean;
  fuelCompany: string;
  createdAt: any;
  tripId?: string;
  tripTitle?: string;
}

function sanitizeFuelLogForFirestore(log: FuelLog): Record<string, any> {
  const clean: Record<string, any> = {
    id: String(log.id || `fuel_${Date.now()}`),
    date: String(log.date || new Date().toISOString().split('T')[0]),
    liters: Number(log.liters) || 0,
    pricePerLiter: Number(log.pricePerLiter) || 0,
    totalCost: Number(log.totalCost) || 0,
    odometer: Number(log.odometer) || 0,
    isFullTank: Boolean(log.isFullTank),
    fuelCompany: String(log.fuelCompany || 'Altro').trim(),
    createdAt: typeof log.createdAt === 'string' ? log.createdAt : new Date().toISOString(),
  };
  if (log.tripId) clean.tripId = String(log.tripId);
  if (log.tripTitle) clean.tripTitle = String(log.tripTitle);
  return clean;
}

export function formatDateDDMMAA(dateStr?: string | null): string {
  if (!dateStr) return '';
  const clean = String(dateStr).trim().split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    const yy = yyyy.length === 4 ? yyyy.slice(-2) : yyyy;
    return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yy}`;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      return `${dd}/${mm}/${yy}`;
    }
  } catch {}
  return clean;
}

export function sortFuelLogsDesc(arr: FuelLog[]): FuelLog[] {
  return [...arr].sort((a, b) => {
    // 1. Descending date (e.g. 2026-08-17 before 2026-07-25)
    const dateA = a.date || '';
    const dateB = b.date || '';
    if (dateA !== dateB) {
      return dateB.localeCompare(dateA);
    }
    // 2. Descending odometer
    const odoA = Number(a.odometer) || 0;
    const odoB = Number(b.odometer) || 0;
    if (odoA !== odoB) {
      return odoB - odoA;
    }
    // 3. Descending createdAt
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

function mergeAndDeduplicateFuelLogs(lists: FuelLog[][], deletedIds: Set<string>): FuelLog[] {
  const byId = new Map<string, FuelLog>();

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      if (!raw || !raw.id) continue;
      const id = String(raw.id);
      if (deletedIds.has(id)) continue;
      if (id === 'te1' || raw.tripId === 'trip-example-10-oct-2020' || String(raw.tripId || '').startsWith('trip-example')) {
        continue;
      }

      const totalCost = Number(raw.totalCost ?? (raw as any).costEuro ?? 0);
      const liters = Number(raw.liters ?? 0);
      const pricePerLiter = Number(raw.pricePerLiter ?? 0) || (totalCost > 0 && liters > 0 ? Number((totalCost / liters).toFixed(3)) : 0);
      const odometer = Number(raw.odometer ?? 0);
      if (totalCost <= 0 && liters <= 0) continue;

      // Normalize DD/MM/YYYY if any came from navigator
      let normDate = String(raw.date || '').trim();
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(normDate)) {
        const [dd, mm, yyyy] = normDate.split('/');
        normDate = `${yyyy}-${mm}-${dd}`;
      }

      const prev = byId.get(id);
      const entry: FuelLog = {
        id,
        date: normDate || prev?.date || new Date().toISOString().split('T')[0],
        liters: liters > 0 ? liters : (prev?.liters || 0),
        pricePerLiter: pricePerLiter > 0 ? pricePerLiter : (prev?.pricePerLiter || 0),
        totalCost: totalCost > 0 ? totalCost : (prev?.totalCost || 0),
        odometer: odometer > 0 ? odometer : (prev?.odometer || 0),
        isFullTank: Boolean(raw.isFullTank ?? prev?.isFullTank),
        fuelCompany: String(raw.fuelCompany || prev?.fuelCompany || 'Altro').trim(),
        createdAt: raw.createdAt || prev?.createdAt || new Date().toISOString(),
        tripId: raw.tripId || prev?.tripId,
        tripTitle: raw.tripTitle || prev?.tripTitle,
      };
      byId.set(id, entry);
    }
  }

  // Also deduplicate entries that have different IDs but identical date + totalCost (and either identical/close odometer or one has 0 liters)
  const dedupedList: FuelLog[] = [];
  for (const item of byId.values()) {
    const matchIdx = dedupedList.findIndex((existing) => {
      if (existing.date !== item.date) return false;
      const sameCost = Math.abs(Number(existing.totalCost || 0) - Number(item.totalCost || 0)) < 0.05;
      if (!sameCost) return false;
      const odoA = Number(existing.odometer) || 0;
      const odoB = Number(item.odometer) || 0;
      if (odoA > 0 && odoB > 0 && Math.abs(odoA - odoB) <= 50) return true;
      if ((Number(existing.liters) === 0 && Number(item.liters) > 0) || (Number(item.liters) === 0 && Number(existing.liters) > 0)) return true;
      return false;
    });

    if (matchIdx === -1) {
      dedupedList.push(item);
    } else {
      const existing = dedupedList[matchIdx];
      const preferItem = Number(item.liters) > Number(existing.liters);
      dedupedList[matchIdx] = {
        ...existing,
        ...item,
        id: preferItem ? item.id : existing.id,
        liters: Number(item.liters) > 0 ? Number(item.liters) : Number(existing.liters),
        pricePerLiter: Number(item.pricePerLiter) > 0 ? Number(item.pricePerLiter) : Number(existing.pricePerLiter),
        totalCost: Number(item.totalCost) > 0 ? Number(item.totalCost) : Number(existing.totalCost),
        odometer: preferItem && Number(item.odometer) > 0 ? Number(item.odometer) : (Number(existing.odometer) > 0 ? Number(existing.odometer) : Number(item.odometer)),
        isFullTank: Boolean(item.isFullTank || existing.isFullTank),
        fuelCompany: (preferItem ? item.fuelCompany : existing.fuelCompany) || item.fuelCompany || existing.fuelCompany,
        tripId: item.tripId || existing.tripId,
        tripTitle: item.tripTitle || existing.tripTitle,
      };
    }
  }

  // Second pass: if a 0-liter diary expense is the exact sum of 2+ measured (liters > 0) refuelings within 2 days & 50 km
  // (e.g. Laguna di Orbetello 113.36 € = 12.02 € + 101.34 €), propagate its trip metadata and omit the duplicate 0L summary row
  const finalDeduped = dedupedList.filter((item) => {
    if (Number(item.liters) > 0) return true;
    const itemTime = new Date(item.date).getTime();
    if (isNaN(itemTime)) return true;
    const nearbyMeasured = dedupedList.filter((m) => {
      if (Number(m.liters) <= 0) return false;
      const mTime = new Date(m.date).getTime();
      if (isNaN(mTime) || Math.abs(mTime - itemTime) > 86400000 * 2) return false;
      const odoA = Number(item.odometer) || 0;
      const odoB = Number(m.odometer) || 0;
      return odoA === 0 || odoB === 0 || Math.abs(odoA - odoB) <= 50;
    });
    if (nearbyMeasured.length >= 2) {
      const sumCost = nearbyMeasured.reduce((s, m) => s + (Number(m.totalCost) || 0), 0);
      if (Math.abs(sumCost - (Number(item.totalCost) || 0)) < 0.15) {
        nearbyMeasured.forEach((m) => {
          if (!m.tripId && item.tripId) m.tripId = item.tripId;
          if (!m.tripTitle && item.tripTitle) m.tripTitle = item.tripTitle;
        });
        return false;
      }
    }
    return true;
  });

  return sortFuelLogsDesc(finalDeduped);
}

function extractFuelLogsFromTrips(trips: any[]): FuelLog[] {
  if (!Array.isArray(trips)) return [];
  const extracted: FuelLog[] = [];
  for (const trip of trips) {
    if (!trip || trip.id === 'trip-example-10-oct-2020' || String(trip.id || '').startsWith('trip-example')) continue;
    for (const exp of (trip.expenses || [])) {
      if (!exp || exp.id === 'te1') continue;
      if (exp.category === 'Carburante' || exp.liters || exp.pricePerLiter || exp.fuelCompany) {
        let liters = Number(exp.liters) || 0;
        let pricePerLiter = Number(exp.pricePerLiter) || 0;
        const amount = Number(exp.amount) || 0;
        if (!liters && exp.title) {
          const match = String(exp.title).match(/([\d.,]+)\s*L/i);
          if (match) liters = parseFloat(match[1].replace(',', '.')) || 0;
        }
        if (!pricePerLiter && exp.title) {
          const match = String(exp.title).match(/@\s*([\d.,]+)/i);
          if (match) pricePerLiter = parseFloat(match[1].replace(',', '.')) || 0;
        }
        if (!pricePerLiter && liters > 0 && amount > 0) {
          pricePerLiter = Number((amount / liters).toFixed(3));
        }
        if (!liters && pricePerLiter > 0 && amount > 0) {
          liters = Number((amount / pricePerLiter).toFixed(2));
        }
        const totalCost = amount || Number((liters * pricePerLiter).toFixed(2)) || 0;
        if (totalCost > 0 || liters > 0) {
          extracted.push({
            id: String(exp.id || `fuel_trip_${trip.id}_${exp.date || Date.now()}`),
            date: exp.date || trip.startDate || new Date().toISOString().split('T')[0],
            liters,
            pricePerLiter,
            totalCost,
            odometer: Number(exp.odometer) || 0,
            isFullTank: Boolean(exp.isFullTank),
            fuelCompany: String(exp.fuelCompany || 'Altro').trim(),
            createdAt: exp.date ? new Date(exp.date).toISOString() : new Date().toISOString(),
            tripId: trip.id,
            tripTitle: trip.title,
          });
        }
      }
    }
  }
  return extracted;
}

export default function FuelCardTab({ currentUser, trips: propsTrips, onOpenCrewModal }: FuelCardTabProps) {
  const settings = useAppSettings();
  const { currentCrew, syncCrewSection, isModuleSynced } = useFamilyCrew();
  const emailLower = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';

  const getDeletedLogIds = React.useCallback((): Set<string> => {
    if (!emailLower) return new Set();
    try {
      const raw = localStorage.getItem(`camper_deleted_fuel_logs_${emailLower}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set(parsed.map(String));
      }
    } catch {}
    return new Set();
  }, [emailLower]);

  const addDeletedLogId = React.useCallback((id: string) => {
    if (!emailLower || !id) return;
    try {
      const set = getDeletedLogIds();
      set.add(String(id));
      localStorage.setItem(`camper_deleted_fuel_logs_${emailLower}`, JSON.stringify(Array.from(set)));
    } catch {}
  }, [emailLower, getDeletedLogIds]);

  const [allTrips, setAllTrips] = React.useState<any[]>(() => {
    if (propsTrips && propsTrips.length > 0) return propsTrips;
    if (!emailLower) return [];
    try {
      const cached = localStorage.getItem(`camper_trips_${emailLower}`) || localStorage.getItem('camper_trips');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  React.useEffect(() => {
    if (propsTrips && propsTrips.length > 0) {
      setAllTrips(propsTrips);
    }
  }, [propsTrips]);

  const getLogTripInfo = React.useCallback(
    (log: FuelLog) => {
      if (!allTrips || allTrips.length === 0) return null;
      // 1. Explicit match by tripId or tripTitle
      if (log.tripId) {
        const found = allTrips.find((t) => t.id === log.tripId);
        if (found) return found;
      }
      if (log.tripTitle) {
        const found = allTrips.find((t) => t.title === log.tripTitle);
        if (found) return found;
      }
      // 2. Match by expense ID inside trip.expenses
      const expMatch = allTrips.find((t) =>
        (t.expenses || []).some((e: any) => e.id === log.id)
      );
      if (expMatch) return expMatch;

      // 3. Match by date range (if log.date falls inside trip dates +/- 1 day)
      if (log.date) {
        const logTime = new Date(log.date).getTime();
        if (!isNaN(logTime)) {
          const dateMatch = allTrips.find((t) => {
            if (!t.startDate) return false;
            const start = new Date(t.startDate).getTime() - 86400000;
            const end = t.endDate
              ? new Date(t.endDate).getTime() + 86400000
              : start + 30 * 86400000;
            return logTime >= start && logTime <= end;
          });
          if (dateMatch) return dateMatch;
        }
      }

      return null;
    },
    [allTrips]
  );

  const [logs, setLogs] = React.useState<FuelLog[]>(() => {
    if (!emailLower) return [];
    try {
      const deletedIds = new Set<string>(
        JSON.parse(localStorage.getItem(`camper_deleted_fuel_logs_${emailLower}`) || '[]')
      );
      const cachedRaw = localStorage.getItem(`camper_fuel_logs_${emailLower}`);
      const cached = cachedRaw ? JSON.parse(cachedRaw) : [];
      const autoRaw = localStorage.getItem('camper_last_fuel_logs');
      const autoLogs = autoRaw ? JSON.parse(autoRaw) : [];
      const savedTripsRaw = localStorage.getItem(`camper_trips_${emailLower}`) || localStorage.getItem('camper_trips');
      const tripLogs = savedTripsRaw ? extractFuelLogsFromTrips(JSON.parse(savedTripsRaw)) : [];
      return mergeAndDeduplicateFuelLogs([cached, autoLogs, tripLogs], deletedIds);
    } catch {}
    return [];
  });

  // Merge family crew shared fuel logs when updated
  React.useEffect(() => {
    if (currentCrew && isModuleSynced('fuelCard') && Array.isArray(currentCrew.sharedData?.fuelLogs) && currentCrew.sharedData.fuelLogs.length > 0) {
      setLogs(prev => {
        const mergedList = mergeAndDeduplicateFuelLogs([prev, currentCrew.sharedData!.fuelLogs!], getDeletedLogIds());
        localStorage.setItem(`camper_fuel_logs_${emailLower}`, JSON.stringify(mergedList));
        return mergedList;
      });
    }
  }, [currentCrew, isModuleSynced, emailLower, getDeletedLogIds]);

  const [loading, setLoading] = React.useState(logs.length === 0);
  const [error, setError] = React.useState<string | null>(null);
  const [deletingLogId, setDeletingLogId] = React.useState<string | null>(null);

  const [logAction, setLogAction] = React.useState<'add' | 'edit' | null>(null);
  const [editingLog, setEditingLog] = React.useState<FuelLog | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form states
  const [date, setDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [totalCost, setTotalCost] = React.useState('');
  const [liters, setLiters] = React.useState('');
  const [pricePerLiter, setPricePerLiter] = React.useState('');
  const [odometer, setOdometer] = React.useState('');
  const [fuelCompany, setFuelCompany] = React.useState('Eni');
  const [isFullTank, setIsFullTank] = React.useState(false);
  const [selectedTripId, setSelectedTripId] = React.useState<string>('auto');

  const fetchLogs = React.useCallback(async () => {
    if (!emailLower) {
      setLoading(false);
      return;
    }

    const deletedIds = getDeletedLogIds();
    const collectedSources: FuelLog[][] = [];

    try {
      // A. Local cached logs & Android Auto / Navigator logs
      try {
        const cachedRaw = localStorage.getItem(`camper_fuel_logs_${emailLower}`);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          if (Array.isArray(parsed)) collectedSources.push(parsed);
        }
      } catch {}

      try {
        const autoLogsRaw = localStorage.getItem('camper_last_fuel_logs');
        if (autoLogsRaw) {
          const autoLogs = JSON.parse(autoLogsRaw);
          if (Array.isArray(autoLogs)) collectedSources.push(autoLogs);
        }
      } catch {}

      // B. Direct Firestore subcollection users/{emailLower}/fuelLogs (Always query directly for 100% native Android & Web reliability)
      const firestoreLogIds = new Set<string>();
      try {
        const logsRef = collection(db, "users", emailLower, "fuelLogs");
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout Firestore fuelLogs")), 5000)
        );
        const snapshot: any = await Promise.race([getDocs(logsRef), timeoutPromise]);
        if (snapshot && !snapshot.empty) {
          const fsLogs = snapshot.docs.map((docSnap: any) => {
            firestoreLogIds.add(docSnap.id);
            return {
              id: docSnap.id,
              ...docSnap.data()
            };
          }) as FuelLog[];
          collectedSources.push(fsLogs);
        }
      } catch (fsErr) {
        console.warn("[FuelCardTab] Direct Firestore fuelLogs fetch notice:", fsErr);
      }

      // C. Direct Firestore users/{emailLower}/data/trips to recover any refuelings added in DiaryTab across devices
      try {
        const tripsDocRef = doc(db, "users", emailLower, "data", "trips");
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout Firestore trips")), 5000)
        );
        const tripsSnap: any = await Promise.race([getDoc(tripsDocRef), timeoutPromise]);
        if (tripsSnap && tripsSnap.exists()) {
          const tData = tripsSnap.data();
          if (tData && Array.isArray(tData.trips)) {
            setAllTrips(prev => (prev.length === 0 ? tData.trips : prev));
            const fromCloudTrips = extractFuelLogsFromTrips(tData.trips);
            if (fromCloudTrips.length > 0) collectedSources.push(fromCloudTrips);
          }
        }
      } catch (fsTripErr) {
        console.warn("[FuelCardTab] Direct Firestore trips fetch notice:", fsTripErr);
      }

      // D. Local user trips in localStorage
      try {
        const savedTrips = localStorage.getItem(`camper_trips_${emailLower}`) || localStorage.getItem('camper_trips');
        if (savedTrips) {
          const parsedTrips = JSON.parse(savedTrips);
          const fromLocalTrips = extractFuelLogsFromTrips(parsedTrips);
          if (fromLocalTrips.length > 0) collectedSources.push(fromLocalTrips);
        }
      } catch {}

      // E. Backend REST API (only parse if JSON content-type, avoiding HTML interstitials on native WebView)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(resolveMediaUrl(`/api/fuel-logs/${encodeURIComponent(emailLower)}`), {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data)) {
            collectedSources.push(data);
          }
        }
      } catch {}

      // Merge all sources without ever losing local or trip refuelings
      const mergedValidLogs = mergeAndDeduplicateFuelLogs(collectedSources, deletedIds);

      setLogs(mergedValidLogs);
      try {
        localStorage.setItem(`camper_fuel_logs_${emailLower}`, JSON.stringify(mergedValidLogs));
        localStorage.setItem('camper_last_fuel_logs', JSON.stringify(mergedValidLogs));
      } catch {}
      setError(null);

      // F. Backfill any local/trip logs that are missing in Firestore users/{emailLower}/fuelLogs so all devices stay in sync
      if (mergedValidLogs.length > 0) {
        (async () => {
          for (const log of mergedValidLogs) {
            if (log && log.id && !firestoreLogIds.has(log.id) && !deletedIds.has(log.id)) {
              try {
                await setDoc(
                  doc(db, "users", emailLower, "fuelLogs", log.id),
                  sanitizeFuelLogForFirestore(log),
                  { merge: true }
                );
              } catch {}
            }
          }
        })().catch(() => {});
      }
    } catch (err) {
      console.error("Error in fetchLogs:", err);
    } finally {
      setLoading(false);
    }
  }, [emailLower, getDeletedLogIds]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Real-time Firestore listener on users/{emailLower}/fuelLogs so changes on one device appear live on the other
  React.useEffect(() => {
    if (!emailLower) return;
    const logsRef = collection(db, "users", emailLower, "fuelLogs");
    const unsubscribe = onSnapshot(
      logsRef,
      (snapshot) => {
        if (!snapshot) return;
        const deletedIds = getDeletedLogIds();
        const remoteLogs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data()
        })) as FuelLog[];
        setLogs((prev) => {
          const merged = mergeAndDeduplicateFuelLogs([prev, remoteLogs], deletedIds);
          try {
            localStorage.setItem(`camper_fuel_logs_${emailLower}`, JSON.stringify(merged));
            localStorage.setItem('camper_last_fuel_logs', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      },
      (err) => {
        console.warn("[FuelCardTab] Realtime snapshot notice:", err);
      }
    );
    return () => unsubscribe();
  }, [emailLower, getDeletedLogIds]);

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailLower) {
      alert("Accedi per registrare i rifornimenti.");
      return;
    }

    // Sanitize and support both comma and dot decimal separators
    const cleanCostStr = String(totalCost).trim().replace(',', '.');
    const cleanLitStr = String(liters).trim().replace(',', '.');
    const cleanPriceStr = String(pricePerLiter).trim().replace(',', '.');
    const cleanOdoStr = String(odometer).trim().replace(/[^\d]/g, '');

    let cost = parseFloat(cleanCostStr);
    const lit = parseFloat(cleanLitStr);
    const price = parseFloat(cleanPriceStr);
    const odo = parseInt(cleanOdoStr, 10);

    // Compute cost if missing but liters and price are present
    if ((isNaN(cost) || cost <= 0) && !isNaN(lit) && lit > 0 && !isNaN(price) && price > 0) {
      cost = Number((lit * price).toFixed(2));
      setTotalCost(cost.toFixed(2));
    }

    if (isNaN(cost) || cost <= 0) {
      alert("Inserisci almeno l'importo speso del rifornimento!");
      return;
    }

    const finalLiters = (!isNaN(lit) && lit > 0) ? Number(lit.toFixed(2)) : (cost > 0 && !isNaN(price) && price > 0 ? Number((cost / price).toFixed(2)) : 0);
    const finalPrice = (!isNaN(price) && price > 0) ? Number(price.toFixed(3)) : (cost > 0 && !isNaN(lit) && lit > 0 ? Number((cost / lit).toFixed(3)) : 0);
    const finalOdo = (!isNaN(odo) && odo > 0) ? odo : 0;

    setIsSubmitting(true);
    const newLogId = `fuel_${Date.now()}`;

    // Resolve trip association
    let targetTripId: string | undefined = undefined;
    let targetTripTitle: string | undefined = undefined;

    if (selectedTripId === 'auto') {
      const activeTrip = allTrips.find((t) => t.status === 'In Corso' || t.status === 'Attivo');
      if (activeTrip) {
        targetTripId = activeTrip.id;
        targetTripTitle = activeTrip.title;
      } else if (date) {
        const dateTime = new Date(date).getTime();
        const matched = allTrips.find((t) => {
          if (!t.startDate) return false;
          const s = new Date(t.startDate).getTime() - 86400000;
          const e = t.endDate ? new Date(t.endDate).getTime() + 86400000 : s + 30 * 86400000;
          return dateTime >= s && dateTime <= e;
        });
        if (matched) {
          targetTripId = matched.id;
          targetTripTitle = matched.title;
        }
      }
    } else if (selectedTripId !== 'none') {
      const selectedTrip = allTrips.find((t) => t.id === selectedTripId);
      if (selectedTrip) {
        targetTripId = selectedTrip.id;
        targetTripTitle = selectedTrip.title;
      }
    }

    const newLog: FuelLog = {
      id: newLogId,
      date: date || new Date().toISOString().split('T')[0],
      liters: finalLiters,
      pricePerLiter: finalPrice,
      totalCost: Number(cost.toFixed(2)),
      odometer: finalOdo,
      isFullTank,
      fuelCompany: fuelCompany.trim() || 'Eni',
      createdAt: new Date().toISOString(),
      tripId: targetTripId,
      tripTitle: targetTripTitle,
    };

    try {
      // 1. Instant Optimistic local update sorted with new ones always on top
      const updatedLogs = sortFuelLogsDesc([newLog, ...logs.filter(l => l.id !== newLog.id)]);
      setLogs(updatedLogs);
      localStorage.setItem(`camper_fuel_logs_${emailLower}`, JSON.stringify(updatedLogs));
      localStorage.setItem('camper_last_fuel_logs', JSON.stringify(updatedLogs));

      // 2. Direct Firestore write to users/{emailLower}/fuelLogs/{newLog.id} (Guarantees cloud sync on Android & Web)
      try {
        await setDoc(
          doc(db, "users", emailLower, "fuelLogs", newLog.id),
          sanitizeFuelLogForFirestore(newLog),
          { merge: true }
        );
      } catch (fsErr) {
        console.warn("[FuelCardTab] Direct Firestore write notice (queued offline):", fsErr);
      }

      // 3. Sync into local trip expenses
      try {
        const savedTrips = emailLower ? localStorage.getItem(`camper_trips_${emailLower}`) : null;
        if (savedTrips) {
          let trips = JSON.parse(savedTrips);
          let updated = false;
          trips = trips.map((t: any) => {
            const isTarget = targetTripId ? t.id === targetTripId : (t.status === 'In Corso' || t.status === 'Attivo');
            if (isTarget) {
              updated = true;
              const litText = newLog.liters > 0 ? ` ${newLog.liters}L` : '';
              const priceText = newLog.pricePerLiter > 0 ? ` @ ${newLog.pricePerLiter}${getCurrencySymbol(settings)}/L` : '';
              return {
                ...t,
                endOdometer: finalOdo > (t.endOdometer || 0) ? finalOdo : t.endOdometer,
                expenses: [
                  ...(t.expenses || []),
                  {
                    id: newLog.id,
                    title: `Rifornimento ${newLog.fuelCompany}${litText}${priceText}${isFullTank ? ' [Pieno ✓]' : ''}`.trim(),
                    amount: newLog.totalCost,
                    category: 'Carburante',
                    date: newLog.date,
                    liters: newLog.liters > 0 ? newLog.liters : undefined,
                    pricePerLiter: newLog.pricePerLiter > 0 ? newLog.pricePerLiter : undefined,
                    odometer: finalOdo > 0 ? finalOdo : undefined,
                    fuelCompany: newLog.fuelCompany,
                    isFullTank: isFullTank
                  }
                ]
              };
            }
            return t;
          });
          if (updated && emailLower) {
            localStorage.setItem(`camper_trips_${emailLower}`, JSON.stringify(trips));
            window.dispatchEvent(new CustomEvent("trip-updated", { detail: { trips } }));
          }
        }
      } catch (tripErr) {
        console.warn("Could not sync into local trip expenses:", tripErr);
      }

      // 4. Persist to Backend REST API (with server-side local cache & background sync)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        await fetch(resolveMediaUrl(`/api/fuel-logs/${encodeURIComponent(emailLower)}`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newLog),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (apiErr) {
        console.info("Fuel log saved via direct Firestore & local cache:", apiErr);
      }

      // 5. Sync to Family Crew if active
      if (currentCrew && isModuleSynced('fuelCard')) {
        syncCrewSection('fuelLogs', updatedLogs).catch(() => {});
      }

      // 6. Background sync into Firestore trip without blocking UI
      (async () => {
        try {
          const tripDocRef = doc(db, "users", emailLower, "data", "trips");
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 4000)
          );
          const docSnap: any = await Promise.race([getDoc(tripDocRef), timeoutPromise]);
          if (docSnap && docSnap.exists()) {
            const data = docSnap.data();
            if (data && Array.isArray(data.trips)) {
              let trips = [...data.trips];
              let updated = false;
              trips = trips.map((t: any) => {
                const isTarget = targetTripId ? t.id === targetTripId : (t.status === 'Attivo' || t.status === 'In Corso');
                if (isTarget) {
                  updated = true;
                  const expensesList = t.expenses || [];
                  const hasExp = expensesList.some((exp: any) => exp.id === newLogId);
                  if (!hasExp) {
                    const litText = newLog.liters > 0 ? ` ${newLog.liters}L` : '';
                    const priceText = newLog.pricePerLiter > 0 ? ` @ ${newLog.pricePerLiter}${getCurrencySymbol(settings)}/L` : '';
                    return {
                      ...t,
                      endOdometer: finalOdo > (t.endOdometer || 0) ? finalOdo : t.endOdometer,
                      expenses: [
                        ...expensesList,
                        {
                          id: newLogId,
                          title: `Rifornimento ${newLog.fuelCompany}${litText}${priceText}${isFullTank ? ' [Pieno ✓]' : ''}`.trim(),
                          amount: newLog.totalCost,
                          category: 'Carburante',
                          date: newLog.date,
                          liters: newLog.liters,
                          pricePerLiter: newLog.pricePerLiter,
                          odometer: finalOdo > 0 ? finalOdo : undefined,
                          fuelCompany: newLog.fuelCompany,
                          isFullTank: isFullTank
                        }
                      ]
                    };
                  }
                }
                return t;
              });
              if (updated) {
                const cleanedTrips = JSON.parse(JSON.stringify(trips));
                await setDoc(tripDocRef, { trips: cleanedTrips }, { merge: true });
              }
            }
          }
        } catch (fsTripErr) {
          console.warn("Trip sync non-blocking error:", fsTripErr);
        }
      })().catch(() => {});

      // Reset form
      setTotalCost('');
      setLiters('');
      setPricePerLiter('');
      setOdometer('');
      setFuelCompany('Eni');
      setIsFullTank(false);
      setLogAction(null);

      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: { message: `⛽ Rifornimento di ${newLog.liters > 0 ? `${newLog.liters}L` : `${newLog.totalCost}€`} salvato e sincronizzato sul Cloud!`, duration: 4000 }
        })
      );
    } catch (err: any) {
      console.error("Error adding fuel log:", err);
      alert("Errore durante il salvataggio del rifornimento. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (logId: string) => {
    if (!emailLower) return;
    setDeletingLogId(logId);
  };

  const handleEdit = (log: FuelLog) => {
    setEditingLog(log);
    setLogAction('edit');
    setDate(log.date);
    setTotalCost((log.totalCost || 0).toString());
    setLiters((log.liters || 0).toString());
    setPricePerLiter((log.pricePerLiter || 0).toString());
    setOdometer((log.odometer || '').toString());
    setFuelCompany(log.fuelCompany);
    setIsFullTank(log.isFullTank || false);
    setSelectedTripId(log.tripId || 'auto');
  };

  const handleEditLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailLower || !editingLog) return;
    
    setIsSubmitting(true);

    const cleanCost = Number(String(totalCost).replace(',', '.')) || 0;
    const cleanLit = Number(String(liters).replace(',', '.')) || 0;
    const cleanPrice = Number(String(pricePerLiter).replace(',', '.')) || (cleanCost > 0 && cleanLit > 0 ? Number((cleanCost / cleanLit).toFixed(3)) : 0);

    const updatedLog: FuelLog = {
      ...editingLog,
      date,
      totalCost: cleanCost,
      liters: cleanLit,
      pricePerLiter: cleanPrice,
      odometer: Number(String(odometer).replace(/[^\d]/g, '')) || 0,
      fuelCompany: fuelCompany.trim() || 'Eni',
      isFullTank,
      tripId: selectedTripId === 'auto' ? editingLog.tripId : (selectedTripId === 'none' ? undefined : selectedTripId),
    };

    try {
      // 1. Local State Update
      const updatedLogs = sortFuelLogsDesc(logs.map(l => l.id === editingLog.id ? updatedLog : l));
      setLogs(updatedLogs);
      localStorage.setItem(`camper_fuel_logs_${emailLower}`, JSON.stringify(updatedLogs));
      localStorage.setItem('camper_last_fuel_logs', JSON.stringify(updatedLogs));

      // 2. Direct Firestore Update
      try {
        await setDoc(
          doc(db, "users", emailLower, "fuelLogs", editingLog.id),
          sanitizeFuelLogForFirestore(updatedLog),
          { merge: true }
        );
      } catch (fsErr) {
        console.warn("[FuelCardTab] Direct Firestore update notice:", fsErr);
      }

      // 3. API PUT (non-blocking fallback)
      fetch(resolveMediaUrl(`/api/fuel-logs/${encodeURIComponent(emailLower)}/${encodeURIComponent(editingLog.id)}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLog)
      }).catch(() => {});

      // 4. Sync to Family Crew if active
      if (currentCrew && isModuleSynced('fuelCard')) {
        syncCrewSection('fuelLogs', updatedLogs).catch(() => {});
      }

      // 5. Reset
      setLogAction(null);
      setEditingLog(null);
      
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: { message: "✏️ Rifornimento aggiornato e sincronizzato!" }
        })
      );
    } catch (err) {
      console.error("Error updating log:", err);
      alert("Errore durante l'aggiornamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingLogId || !emailLower) return;
    const targetId = deletingLogId;
    setDeletingLogId(null);

    // Record deletion so merge doesn't resurrect it from old trip caches
    addDeletedLogId(targetId);

    // 1. Optimistic removal
    const updated = logs.filter(l => l.id !== targetId);
    setLogs(updated);
    localStorage.setItem(`camper_fuel_logs_${emailLower}`, JSON.stringify(updated));
    localStorage.setItem('camper_last_fuel_logs', JSON.stringify(updated));

    // 2. Direct Firestore delete from users/{emailLower}/fuelLogs/{targetId}
    try {
      await deleteDoc(doc(db, "users", emailLower, "fuelLogs", targetId));
    } catch (fsErr) {
      console.warn("[FuelCardTab] Direct Firestore delete notice:", fsErr);
    }

    // 3. Cloud deletion via backend API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        await fetch(resolveMediaUrl(`/api/fuel-logs/${encodeURIComponent(emailLower)}/${encodeURIComponent(targetId)}`), {
          method: 'DELETE',
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (apiErr) {
      console.info("Fuel log deleted via direct Firestore:", apiErr);
    }

    // 4. Sync to Family Crew if active
    if (currentCrew && isModuleSynced('fuelCard')) {
      syncCrewSection('fuelLogs', updated).catch(() => {});
    }

    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { message: "🗑️ Rifornimento eliminato con successo." }
      })
    );
  };

  // Stats calculation
  const totalFuelCost = logs.reduce((sum, log) => sum + (Number(log.totalCost) || 0), 0);
  const totalLiters = logs.reduce((sum, log) => sum + (Number(log.liters) || 0), 0);
  const logsWithLiters = logs.filter((l) => Number(l.liters) > 0 && Number(l.totalCost) > 0);
  const totalCostForLogsWithLiters = logsWithLiters.reduce((sum, l) => sum + (Number(l.totalCost) || 0), 0);
  const totalLitersForAvg = logsWithLiters.reduce((sum, l) => sum + (Number(l.liters) || 0), 0);
  const avgPrice = totalLitersForAvg > 0 ? (totalCostForLogsWithLiters / totalLitersForAvg).toFixed(3) : '0.000';

  // Calculate consumption accurately using only consecutive odometer segments where both endpoints have measured liters (> 0).
  // This prevents unmeasured diary refuelings (where liters === 0) from artificially inflating the distance covered!
  let averageConsumption = '---';
  const logsWithOdo = logs
    .filter((l) => typeof l.odometer === 'number' && l.odometer > 0)
    .sort((a, b) => a.odometer - b.odometer);

  if (logsWithOdo.length >= 2) {
    let distanceCovered = 0;
    let litersBurned = 0;

    for (let i = 1; i < logsWithOdo.length; i++) {
      const prev = logsWithOdo[i - 1];
      const curr = logsWithOdo[i];
      const dist = (Number(curr.odometer) || 0) - (Number(prev.odometer) || 0);
      const prevLiters = Number(prev.liters) || 0;
      const currLiters = Number(curr.liters) || 0;

      if (dist > 0 && prevLiters > 0 && currLiters > 0) {
        distanceCovered += dist;
        litersBurned += currLiters;
      }
    }

    if (distanceCovered > 0 && litersBurned > 0) {
      averageConsumption = getFuelEfficiencyValue(litersBurned, distanceCovered, settings);
    }
  }

  if (!currentUser) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <Fuel className="w-12 h-12 text-[#3E4A35]/30 mx-auto mb-4" />
        <h2 className="text-lg font-black text-[#3E4A35] mb-2">Carta Carburante Sincronizzata</h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
          Effettua l'accesso per poter salvare i rifornimenti del tuo camper in cloud e sincronizzarli tra i tuoi dispositivi.
        </p>
        <button
          onClick={() => {
            const btn = document.querySelector('[onClick*="login"]');
            if (btn instanceof HTMLElement) btn.click();
          }}
          className="bg-[#3E4A35] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#5A6B4E] transition cursor-pointer"
        >
          Vai al Login
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans max-w-2xl mx-auto">
      {/* Settings / Title Area */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <Fuel className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#3E4A35] tracking-tight leading-none">
              Carta Carburante
            </h2>
            <p className="text-[#3E4A35]/60 text-[11px] sm:text-xs font-bold mt-1">
              Cloud Sync attivo per <span className="text-emerald-700">{currentUser.email}</span>
            </p>
          </div>
        </div>
        {!logAction && (
          <button
            onClick={() => setLogAction('add')}
            className="w-10 h-10 rounded-xl bg-[#3E4A35] hover:bg-[#5A6B4E] text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer shrink-0"
            title="Aggiungi Rifornimento"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Family Crew Banner */}
      <FamilyCrewTabBanner moduleName="Carta Carburante" onOpenCrewModal={onOpenCrewModal} />

      {loading && logs.length === 0 && (
        <div className="flex justify-center p-8">
          <RefreshCw className="w-6 h-6 text-[#3E4A35] animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex gap-3 text-red-800 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* DASHBOARD STATS */}
      {logs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col justify-center">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Spesa Totale</span>
            <div className="text-lg sm:text-xl font-mono font-bold text-stone-800 dark:text-stone-100">{totalFuelCost.toFixed(2)} {getCurrencySymbol(settings)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col justify-center">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Litri Erogati</span>
            <div className="text-lg sm:text-xl font-mono font-bold text-blue-700 dark:text-blue-300">{totalLiters.toFixed(1)} L</div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col justify-center">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Prezzo Medio</span>
            <div className="text-lg sm:text-xl font-mono font-bold text-slate-700 dark:text-slate-200">{avgPrice} {getCurrencySymbol(settings)}/L</div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col justify-center">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Consumo Medio</span>
            <div className="flex items-baseline gap-1">
              <div className="text-lg sm:text-xl font-mono font-bold text-emerald-700 dark:text-emerald-300">{averageConsumption}</div>
              {averageConsumption !== '---' && <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">{getFuelEfficiencyUnit(settings)}</span>}
            </div>
          </div>
        </div>
      )}

      {/* ADD LOG FORM */}
      {logAction && (
        <div className="bg-slate-50 border border-slate-300 rounded-2xl p-4 sm:p-5 shadow-inner">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Fuel className="w-4 h-4 text-emerald-600" />
              Nuovo Rifornimento
            </h3>
            <button
              onClick={() => { setLogAction(null); setEditingLog(null); }}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={logAction === 'add' ? handleAddLog : handleEditLog} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 p-2 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Company (Esso, Eni...)</label>
                <input
                  type="text"
                  required
                  value={fuelCompany}
                  onChange={e => setFuelCompany(e.target.value)}
                  placeholder="Es. Eni, Q8, Esso, Aurol..."
                  className="w-full bg-white border border-slate-300 p-2 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>
            </div>

            {/* Total Cost - Can be entered alone */}
            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300">
                  Importo Speso ({getCurrencySymbol(settings)}) *
                </label>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                  Basta anche solo questo
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={totalCost}
                  onChange={e => {
                    const val = e.target.value;
                    setTotalCost(val);
                    const clean = parseFloat(val.replace(',', '.'));
                    if (!isNaN(clean) && clean > 0) {
                      const cleanLit = parseFloat(String(liters).replace(',', '.'));
                      const cleanPrice = parseFloat(String(pricePerLiter).replace(',', '.'));
                      if (!isNaN(cleanLit) && cleanLit > 0 && isNaN(cleanPrice)) {
                        setPricePerLiter((clean / cleanLit).toFixed(3));
                      } else if (!isNaN(cleanPrice) && cleanPrice > 0 && isNaN(cleanLit)) {
                        setLiters((clean / cleanPrice).toFixed(2));
                      }
                    }
                  }}
                  placeholder="es. 50,00"
                  className="w-full bg-white border-2 border-emerald-500 py-2 pl-3 pr-8 rounded-xl text-base font-mono font-black text-emerald-900 dark:text-emerald-200 focus:ring-2 focus:ring-emerald-500/30 outline-none"
                />
                <span className="absolute right-3 top-2.5 text-emerald-600 font-black text-sm">{getCurrencySymbol(settings)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black uppercase text-slate-500">Litri inseriti</label>
                  <span className="text-[8.5px] text-slate-400">Opzionale</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={liters}
                    onChange={e => {
                      const val = e.target.value;
                      setLiters(val);
                      const cleanLit = parseFloat(val.replace(',', '.'));
                      const cleanPrice = parseFloat(String(pricePerLiter).replace(',', '.'));
                      if (!isNaN(cleanLit) && cleanLit > 0 && !isNaN(cleanPrice) && cleanPrice > 0) {
                        setTotalCost((cleanLit * cleanPrice).toFixed(2));
                      } else if (!isNaN(cleanLit) && cleanLit > 0 && totalCost) {
                        const cleanCost = parseFloat(String(totalCost).replace(',', '.'));
                        if (!isNaN(cleanCost) && cleanCost > 0 && !pricePerLiter) {
                          setPricePerLiter((cleanCost / cleanLit).toFixed(3));
                        }
                      }
                    }}
                    placeholder="es. 48,73"
                    className="w-full bg-white border border-slate-300 py-2 pl-3 pr-8 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                  <span className="absolute right-3 top-2 text-slate-400 font-black text-sm">L</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black uppercase text-slate-500">Prezzo al Litro</label>
                  <span className="text-[8.5px] text-slate-400">Opzionale</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={pricePerLiter}
                    onChange={e => {
                      const val = e.target.value;
                      setPricePerLiter(val);
                      const cleanPrice = parseFloat(val.replace(',', '.'));
                      const cleanLit = parseFloat(String(liters).replace(',', '.'));
                      if (!isNaN(cleanPrice) && cleanPrice > 0 && !isNaN(cleanLit) && cleanLit > 0) {
                        setTotalCost((cleanLit * cleanPrice).toFixed(2));
                      } else if (!isNaN(cleanPrice) && cleanPrice > 0 && totalCost) {
                        const cleanCost = parseFloat(String(totalCost).replace(',', '.'));
                        if (!isNaN(cleanCost) && cleanCost > 0 && !liters) {
                          setLiters((cleanCost / cleanPrice).toFixed(2));
                        }
                      }
                    }}
                    placeholder="es. 2,099"
                    className="w-full bg-white border border-slate-300 py-2 pl-3 pr-8 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                  <span className="absolute right-3 top-2 text-slate-400 font-black text-sm">{getCurrencySymbol(settings)}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black uppercase text-slate-500">Contachilometri (Odo)</label>
                <span className="text-[8.5px] text-slate-400">Opzionale</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={odometer}
                  onChange={e => setOdometer(e.target.value)}
                  placeholder="es. 127894"
                  className="w-full bg-white border border-slate-300 py-2 pl-3 pr-10 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
                <span className="absolute right-3 top-2 text-slate-400 font-black text-sm text-[10px] mt-0.5">{getDistanceUnit(settings)}</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                Collega a Viaggio
              </label>
              <select
                value={selectedTripId}
                onChange={(e) => setSelectedTripId(e.target.value)}
                className="w-full bg-white border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              >
                <option value="auto">✨ Rileva in automatico da data o stato attivo</option>
                <option value="none">🏠 Nessun viaggio (Uso quotidiano / Fuori viaggio)</option>
                {allTrips.map((t) => (
                  <option key={t.id} value={t.id}>
                    🗺️ {t.title} ({formatDateDDMMAA(t.startDate)}{t.endDate ? ` - ${formatDateDDMMAA(t.endDate)}` : ''})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-emerald-50 p-3 rounded-xl border border-emerald-100/50">
              <input
                type="checkbox"
                id="ft"
                checked={isFullTank}
                onChange={e => setIsFullTank(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
              />
              <label htmlFor="ft" className="text-xs font-bold text-emerald-900 cursor-pointer select-none border-b border-transparent hover:border-emerald-300">
                Fatto il Pieno (Serbatoio Colmo)
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl transition-colors shadow-sm cursor-pointer mt-2 ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isSubmitting ? 'Salvataggio...' : 'Trascrivi Rifornimento'}
            </button>
          </form>
        </div>
      )}

      {/* LOGS LIST */}
      {logs.length > 0 && !logAction && (
        <div className="space-y-2.5">
          {logs.map((log) => {
            const companyLower = (log.fuelCompany || '').toLowerCase();
            const cColor = companyLower.includes('eni') ? 'bg-yellow-400 text-slate-900' :
                           companyLower.includes('q8') ? 'bg-blue-600 text-white' :
                           companyLower.includes('esso') ? 'bg-red-500 text-white' :
                           companyLower.includes('ip') ? 'bg-green-600 text-white' :
                           companyLower.includes('tamoil') ? 'bg-emerald-600 text-white' :
                           'bg-slate-200 text-slate-700';

            const trip = getLogTripInfo(log);

            return (
              <div key={log.id} className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all hover:border-[#3E4A35]/30">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex flex-col items-center justify-center shrink-0 shadow-inner font-black text-[10px] tracking-tight truncate px-1 border border-black/10 ${cColor}`}>
                    {(log.fuelCompany || 'Eni').substring(0, 4)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-slate-800 text-sm">
                        {(log.totalCost || 0).toFixed(2)} {getCurrencySymbol(settings)}
                      </h4>
                      {log.isFullTank && <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">Pieno</span>}
                      {trip ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/80 shrink-0">
                          <MapPin className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          {trip.title}
                        </span>
                      ) : log.tripTitle ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/80 shrink-0">
                          <MapPin className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          {log.tripTitle}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/80 dark:border-slate-700 shrink-0">
                          Uso quotidiano
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 font-mono mt-0.5">
                      <span className="font-semibold text-slate-700">{formatDateDDMMAA(log.date)}</span>
                      <span>&bull;</span>
                      <span>{log.odometer && log.odometer > 0 ? `${log.odometer.toLocaleString()} ${getDistanceUnit(settings)}` : 'km n.d.'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-12 sm:pl-0">
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-blue-700">{(log.liters || 0).toFixed(2)} L</div>
                    <div className="text-[10px] text-slate-400 font-mono">{(log.pricePerLiter || 0).toFixed(3)} {getCurrencySymbol(settings)}/L</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEdit(log)}
                    className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                    title="Modifica rifornimento"
                  >
                    <Pencil className="w-4 h-4 pointer-events-none" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(log.id)}
                    className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Elimina rifornimento"
                  >
                    <Trash2 className="w-4 h-4 pointer-events-none" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && logs.length === 0 && !logAction && (
        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-8 text-center">
          <Fuel className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">Nessun rifornimento registrato.</p>
          <p className="text-xs text-slate-400 mt-1">Aggiungi il tuo primo pieno in cloud.</p>
        </div>
      )}

      {deletingLogId && (
        <ConfirmDeleteModal
          onConfirm={confirmDelete}
          onCancel={() => setDeletingLogId(null)}
        />
      )}
    </div>
  );
}
