import React from 'react';
import { useAppSettings } from '../useAppSettings';
import { getCurrencySymbol, getDistanceUnit, getFuelEfficiencyUnit, getFuelEfficiencyValue } from '../unit-helpers';
import { Fuel, Plus, Trash2, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import { useFamilyCrew } from '../context/FamilyCrewContext';
import { FamilyCrewTabBanner } from './FamilyCrewModal';

interface FuelCardTabProps {
  currentUser: { email: string; nickname?: string } | null;
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

export default function FuelCardTab({ currentUser, onOpenCrewModal }: FuelCardTabProps) {
  const settings = useAppSettings();
  const { currentCrew, syncCrewSection, isModuleSynced } = useFamilyCrew();
  const emailLower = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';

  const [logs, setLogs] = React.useState<FuelLog[]>(() => {
    if (!emailLower) return [];
    try {
      const cached = localStorage.getItem(`camper_fuel_logs_${emailLower}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return sortFuelLogsDesc(parsed);
      }
    } catch {}
    return [];
  });

  // Merge family crew shared fuel logs when updated
  React.useEffect(() => {
    if (currentCrew && isModuleSynced('fuelCard') && Array.isArray(currentCrew.sharedData?.fuelLogs) && currentCrew.sharedData.fuelLogs.length > 0) {
      setLogs(prev => {
        const mergedMap = new Map<string, FuelLog>();
        prev.forEach(l => mergedMap.set(l.id, l));
        currentCrew.sharedData!.fuelLogs!.forEach((l: FuelLog) => mergedMap.set(l.id, l));
        const mergedList = sortFuelLogsDesc(Array.from(mergedMap.values()));
        localStorage.setItem(`camper_fuel_logs_${emailLower}`, JSON.stringify(mergedList));
        return mergedList;
      });
    }
  }, [currentCrew, isModuleSynced, emailLower]);

  const [loading, setLoading] = React.useState(logs.length === 0);
  const [error, setError] = React.useState<string | null>(null);
  const [deletingLogId, setDeletingLogId] = React.useState<string | null>(null);

  const [showAddForm, setShowAddForm] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form states
  const [date, setDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [liters, setLiters] = React.useState('');
  const [pricePerLiter, setPricePerLiter] = React.useState('');
  const [odometer, setOdometer] = React.useState('');
  const [fuelCompany, setFuelCompany] = React.useState('Eni');
  const [isFullTank, setIsFullTank] = React.useState(false);

  const fetchLogs = React.useCallback(async () => {
    if (!emailLower) {
      setLoading(false);
      return;
    }

    try {
      // 1. Try fetching via REST API endpoint with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      let fetchedLogs: FuelLog[] | null = null;

      try {
        const res = await fetch(resolveMediaUrl(`/api/fuel-logs/${encodeURIComponent(emailLower)}`), {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            fetchedLogs = data;
          }
        }
      } catch (apiErr) {
        clearTimeout(timeoutId);
      }

      // 2. Fallback to direct Firestore if API was not reachable
      if (!fetchedLogs || fetchedLogs.length === 0) {
        try {
          const logsRef = collection(db, `users/${emailLower}/fuelLogs`);
          const q = query(logsRef, orderBy("createdAt", "desc"));
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout Firestore")), 4000)
          );
          const snapshot: any = await Promise.race([getDocs(q), timeoutPromise]);
          if (snapshot && !snapshot.empty) {
            fetchedLogs = snapshot.docs.map((docSnap: any) => ({
              id: docSnap.id,
              ...docSnap.data()
            })) as FuelLog[];
          }
        } catch (fsErr) {
          console.warn("Direct Firestore fetch error:", fsErr);
        }
      }

      // 3. Fallback: extract from local camper_trips if no logs found yet
      if (!fetchedLogs || fetchedLogs.length === 0) {
        try {
          const savedTrips = localStorage.getItem('camper_trips');
          if (savedTrips) {
            const trips = JSON.parse(savedTrips);
            if (Array.isArray(trips)) {
              const extracted: FuelLog[] = [];
              for (const trip of trips) {
                for (const exp of (trip.expenses || [])) {
                  if ((exp.category === 'Carburante' || exp.liters) && (exp.liters > 0 || exp.pricePerLiter > 0)) {
                    let liters = exp.liters;
                    let pricePerLiter = exp.pricePerLiter;
                    if (!liters && exp.title) {
                      const match = exp.title.match(/([\d.,]+)\s*L/i);
                      if (match) liters = parseFloat(match[1].replace(',', '.'));
                    }
                    if (!pricePerLiter && exp.title) {
                      const match = exp.title.match(/@\s*([\d.,]+)/i);
                      if (match) pricePerLiter = parseFloat(match[1].replace(',', '.'));
                    }
                    if (liters > 0) {
                      extracted.push({
                        id: exp.id || `fuel_${Date.now()}_${Math.random()}`,
                        date: exp.date || trip.startDate || new Date().toISOString().split('T')[0],
                        liters: liters || 0,
                        pricePerLiter: pricePerLiter || (exp.amount && liters ? Number((exp.amount / liters).toFixed(3)) : 0),
                        totalCost: exp.amount || Number(((liters || 0) * (pricePerLiter || 0)).toFixed(2)),
                        odometer: exp.odometer || 0,
                        isFullTank: !!exp.isFullTank,
                        fuelCompany: exp.fuelCompany || "Eni",
                        createdAt: exp.date ? new Date(exp.date).toISOString() : new Date().toISOString()
                      });
                    }
                  }
                }
              }
              if (extracted.length > 0) {
                fetchedLogs = extracted;
              }
            }
          }
        } catch (tripErr) {
          console.warn("Error extracting fuel logs from trips:", tripErr);
        }
      }

      if (fetchedLogs && fetchedLogs.length > 0) {
        const validLogs = sortFuelLogsDesc(
          fetchedLogs.filter(l => (l.liters && l.liters > 0) || (l.totalCost && l.totalCost > 0))
        );
        setLogs(validLogs);
        localStorage.setItem(`camper_fuel_logs_${emailLower}`, JSON.stringify(validLogs));
        setError(null);
      } else if (fetchedLogs) {
        // Only set empty if local logs were also empty
        setLogs(prev => prev.length > 0 ? sortFuelLogsDesc(prev) : []);
      }
    } catch (err) {
      console.error("Error in fetchLogs:", err);
    } finally {
      setLoading(false);
    }
  }, [emailLower]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailLower) {
      alert("Accedi per registrare i rifornimenti.");
      return;
    }

    // Sanitize and support both comma and dot decimal separators
    const cleanLitStr = String(liters).trim().replace(',', '.');
    const cleanPriceStr = String(pricePerLiter).trim().replace(',', '.');
    const cleanOdoStr = String(odometer).trim().replace(/[^\d]/g, '');

    const lit = parseFloat(cleanLitStr);
    const price = parseFloat(cleanPriceStr);
    const odo = parseInt(cleanOdoStr, 10);

    if (isNaN(lit) || lit <= 0 || isNaN(price) || price <= 0 || isNaN(odo) || odo <= 0) {
      alert("Inserisci valori numerici validi per litri, prezzo al litro e contachilometri.");
      return;
    }

    setIsSubmitting(true);
    const newLogId = `fuel_${Date.now()}`;
    const newLog: FuelLog = {
      id: newLogId,
      date: date || new Date().toISOString().split('T')[0],
      liters: Number(lit.toFixed(2)),
      pricePerLiter: Number(price.toFixed(3)),
      totalCost: Number((lit * price).toFixed(2)),
      odometer: odo,
      isFullTank,
      fuelCompany: fuelCompany.trim() || 'Eni',
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Instant Optimistic local update sorted with new ones always on top
      const updatedLogs = sortFuelLogsDesc([newLog, ...logs.filter(l => l.id !== newLog.id)]);
      setLogs(updatedLogs);
      localStorage.setItem(`camper_fuel_logs_${emailLower}`, JSON.stringify(updatedLogs));

      // 2. Sync into local active trip expenses
      try {
        const savedTrips = localStorage.getItem('camper_trips');
        if (savedTrips) {
          let trips = JSON.parse(savedTrips);
          let updated = false;
          trips = trips.map((t: any) => {
            if (t.status === 'In Corso' || t.status === 'Attivo') {
              updated = true;
              return {
                ...t,
                endOdometer: odo > (t.endOdometer || 0) ? odo : t.endOdometer,
                expenses: [
                  ...(t.expenses || []),
                  {
                    id: newLog.id,
                    title: `Rifornimento ${newLog.fuelCompany} ${newLog.liters}L @ ${newLog.pricePerLiter}${getCurrencySymbol(settings)}/L${isFullTank ? ' [Pieno ✓]' : ''}`,
                    amount: newLog.totalCost,
                    category: 'Carburante',
                    date: newLog.date,
                    liters: newLog.liters,
                    pricePerLiter: newLog.pricePerLiter,
                    odometer: odo,
                    fuelCompany: newLog.fuelCompany,
                    isFullTank: isFullTank
                  }
                ]
              };
            }
            return t;
          });
          if (updated) {
            localStorage.setItem('camper_trips', JSON.stringify(trips));
          }
        }
      } catch (tripErr) {
        console.warn("Could not sync into local trip expenses:", tripErr);
      }

      // 3. Persist to Backend REST API (with server-side local cache & background sync)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        await fetch(resolveMediaUrl(`/api/fuel-logs/${encodeURIComponent(emailLower)}`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newLog),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (apiErr) {
        console.info("Fuel log saved locally in cache (offline/background):", apiErr);
      }

      // 4. Sync to Family Crew if active
      if (currentCrew && isModuleSynced('fuelCard')) {
        syncCrewSection('fuelLogs', updatedLogs).catch(() => {});
      }

      // 4. Background sync into active Firestore trip without blocking UI
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
                if (t.status === 'Attivo' || t.status === 'In Corso') {
                  updated = true;
                  const expensesList = t.expenses || [];
                  const hasExp = expensesList.some((exp: any) => exp.id === newLogId);
                  if (!hasExp) {
                    return {
                      ...t,
                      endOdometer: odo > (t.endOdometer || 0) ? odo : t.endOdometer,
                      expenses: [
                        ...expensesList,
                        {
                          id: newLogId,
                          title: `Rifornimento ${newLog.fuelCompany} ${newLog.liters}L @ ${newLog.pricePerLiter}${getCurrencySymbol(settings)}/L${isFullTank ? ' [Pieno ✓]' : ''}`,
                          amount: newLog.totalCost,
                          category: 'Carburante',
                          date: newLog.date,
                          liters: newLog.liters,
                          pricePerLiter: newLog.pricePerLiter,
                          odometer: odo,
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
      setLiters('');
      setPricePerLiter('');
      setOdometer('');
      setFuelCompany('Eni');
      setIsFullTank(false);
      setShowAddForm(false);

      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: { message: `⛽ Rifornimento di ${newLog.liters}L salvato con successo!`, duration: 4000 }
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

  const confirmDelete = async () => {
    if (!deletingLogId || !emailLower) return;
    const targetId = deletingLogId;
    setDeletingLogId(null);

    // 1. Optimistic removal
    const updated = logs.filter(l => l.id !== targetId);
    setLogs(updated);
    localStorage.setItem(`camper_fuel_logs_${emailLower}`, JSON.stringify(updated));

    // 2. Cloud deletion via backend API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      try {
        await fetch(resolveMediaUrl(`/api/fuel-logs/${encodeURIComponent(emailLower)}/${encodeURIComponent(targetId)}`), {
          method: 'DELETE',
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (apiErr) {
      console.info("Fuel log deleted locally:", apiErr);
    }

    // 3. Sync to Family Crew if active
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
  const totalFuelCost = logs.reduce((sum, log) => sum + (log.totalCost || 0), 0);
  const totalLiters = logs.reduce((sum, log) => sum + (log.liters || 0), 0);
  const avgPrice = totalLiters > 0 ? (totalFuelCost / totalLiters).toFixed(3) : '0.000';

  // Calculate consumption
  let averageConsumption = '---';
  if (logs.length >= 2) {
    const sortedLogs = [...logs].sort((a, b) => a.odometer - b.odometer);
    const startOdo = sortedLogs[0].odometer;
    const endOdo = sortedLogs[sortedLogs.length - 1].odometer;
    const distanceCovered = endOdo - startOdo;
    const litersBurned = sortedLogs.slice(1).reduce((sum, l) => sum + l.liters, 0);

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
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
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
      {showAddForm && (
        <div className="bg-slate-50 border border-slate-300 rounded-2xl p-4 sm:p-5 shadow-inner">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Fuel className="w-4 h-4 text-emerald-600" />
              Nuovo Rifornimento
            </h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleAddLog} className="space-y-4">
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Litri inseriti</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={liters}
                    onChange={e => setLiters(e.target.value)}
                    placeholder="es. 48,73"
                    className="w-full bg-white border border-slate-300 py-2 pl-3 pr-8 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                  <span className="absolute right-3 top-2 text-slate-400 font-black text-sm">L</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Prezzo al Litro</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={pricePerLiter}
                    onChange={e => setPricePerLiter(e.target.value)}
                    placeholder="es. 2,099"
                    className="w-full bg-white border border-slate-300 py-2 pl-3 pr-8 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                  <span className="absolute right-3 top-2 text-slate-400 font-black text-sm">{getCurrencySymbol(settings)}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Contachilometri (Odo)</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={odometer}
                  onChange={e => setOdometer(e.target.value)}
                  placeholder="es. 127894"
                  className="w-full bg-white border border-slate-300 py-2 pl-3 pr-10 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
                <span className="absolute right-3 top-2 text-slate-400 font-black text-sm text-[10px] mt-0.5">{getDistanceUnit(settings)}</span>
              </div>
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
      {logs.length > 0 && !showAddForm && (
        <div className="space-y-2.5">
          {logs.map((log) => {
            const companyLower = (log.fuelCompany || '').toLowerCase();
            const cColor = companyLower.includes('eni') ? 'bg-yellow-400 text-slate-900' :
                           companyLower.includes('q8') ? 'bg-blue-600 text-white' :
                           companyLower.includes('esso') ? 'bg-red-500 text-white' :
                           companyLower.includes('ip') ? 'bg-green-600 text-white' :
                           companyLower.includes('tamoil') ? 'bg-emerald-600 text-white' :
                           'bg-slate-200 text-slate-700';

            return (
              <div key={log.id} className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all hover:border-[#3E4A35]/30">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex flex-col items-center justify-center shrink-0 shadow-inner font-black text-[10px] tracking-tight truncate px-1 border border-black/10 ${cColor}`}>
                    {(log.fuelCompany || 'Eni').substring(0, 4)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-slate-800 text-sm">
                        {(log.totalCost || 0).toFixed(2)} {getCurrencySymbol(settings)}
                      </h4>
                      {log.isFullTank && <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">Pieno</span>}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 font-mono">
                      <span className="font-semibold text-slate-700">{formatDateDDMMAA(log.date)}</span>
                      <span>&bull;</span>
                      <span>{(log.odometer || 0).toLocaleString()} {getDistanceUnit(settings)}</span>
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

      {!loading && !error && logs.length === 0 && !showAddForm && (
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
