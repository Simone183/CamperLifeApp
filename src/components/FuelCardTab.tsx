import React from 'react';
import { useAppSettings } from '../useAppSettings';
import { formatCurrency, getCurrencySymbol, getDistanceUnit, convertDistance, getFuelEfficiencyUnit, formatFuelEfficiency, getFuelEfficiencyValue } from '../unit-helpers';
import { Fuel, Plus, Trash2, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface FuelCardTabProps {
  currentUser: { email: string; nickname?: string } | null;
}

interface FuelLog {
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

export default function FuelCardTab({ currentUser }: FuelCardTabProps) {
  const settings = useAppSettings();
  const [logs, setLogs] = React.useState<FuelLog[]>([]);
  const [loading, setLoading] = React.useState(true);
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
    if (!currentUser?.email) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/fuel-logs/${encodeURIComponent(currentUser.email)}`);
      if (!res.ok) throw new Error("Errore fetch " + res.status);
      const data = await res.json();
      setLogs(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Impossibile scaricare le letture salvate.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) return;

    const lit = parseFloat(liters);
    const price = parseFloat(pricePerLiter);
    const odo = parseInt(odometer, 10);

    if (isNaN(lit) || isNaN(price) || isNaN(odo)) {
      alert("Inserisci valori numerici validi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/fuel-logs/${encodeURIComponent(currentUser.email)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          liters: lit,
          pricePerLiter: price,
          totalCost: lit * price,
          odometer: odo,
          isFullTank,
          fuelCompany
        })
      });
      if (!res.ok) throw new Error("Errore post");
      
      const newLogData = await res.json();
      setLogs(prev => [newLogData.log, ...prev]);

      // Sync Viceversa into active local trip
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
                endOdometer: odo > (t.endOdometer||0) ? odo : t.endOdometer,
                expenses: [...(t.expenses || []), {
                  id: newLogData.log.id,
                  title: `Rifornimento ${fuelCompany} ${lit}L @ ${price}${getCurrencySymbol(settings)}/L${isFullTank ? ' [Pieno ✓]' : ''}`,
                  amount: Number((lit * price).toFixed(2)),
                  category: 'Carburante',
                  date: date,
                  liters: lit,
                  pricePerLiter: price,
                  odometer: odo,
                  fuelCompany: fuelCompany,
                  isFullTank: isFullTank
                }]
              };
            }
            return t;
          });
          if (updated) {
            localStorage.setItem('camper_trips', JSON.stringify(trips));
          }
        }
      } catch(e) {}

      // Sync into active Firestore trip
      if (currentUser?.email) {
        try {
          const docRef = doc(db, "users", currentUser.email, "data", "trips");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && Array.isArray(data.trips)) {
              let trips = [...data.trips];
              let updated = false;
              trips = trips.map((t: any) => {
                if (t.status === 'Attivo' || t.status === 'In Corso') {
                  updated = true;
                  const expensesList = t.expenses || [];
                  const hasExp = expensesList.some((e: any) => e.id === newLogData.log.id);
                  if (!hasExp) {
                    return {
                      ...t,
                      endOdometer: odo > (t.endOdometer || 0) ? odo : t.endOdometer,
                      expenses: [...expensesList, {
                        id: newLogData.log.id,
                        title: `Rifornimento ${fuelCompany} ${lit}L @ ${price}${getCurrencySymbol(settings)}/L${isFullTank ? ' [Pieno ✓]' : ''}`,
                        amount: Number((lit * price).toFixed(2)),
                        category: 'Carburante',
                        date: date,
                        liters: lit,
                        pricePerLiter: price,
                        odometer: odo,
                        fuelCompany: fuelCompany,
                        isFullTank: isFullTank
                      }]
                    };
                  }
                }
                return t;
              });
              if (updated) {
                const cleanedTrips = JSON.parse(JSON.stringify(trips));
                await setDoc(docRef, { trips: cleanedTrips }, { merge: true });
              }
            }
          }
        } catch (fsErr) {
          console.error("Firestore sync error:", fsErr);
        }
      }

      // Reset form
      setLiters('');
      setPricePerLiter('');
      setOdometer('');
      setFuelCompany('Eni');
      setIsFullTank(false);
      setShowAddForm(false);
      
      window.dispatchEvent(new CustomEvent('show-toast', { 
        detail: { message: `⛽ Rifornimento sincronizzato con successo!` } 
      }));
    } catch (err) {
      console.error("Error adding fuel log:", err);
      alert("Errore durante il salvataggio del rifornimento. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (logId: string) => {
    console.log("handleDelete called for logId:", logId, "email:", currentUser?.email);
    if (!currentUser?.email) {
        console.error("No email found");
        return;
    }
    setDeletingLogId(logId);
  };

  const confirmDelete = async () => {
    if (!deletingLogId || !currentUser?.email) return;

    try {
      const res = await fetch(`/api/fuel-logs/${encodeURIComponent(currentUser.email)}/${deletingLogId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Delete failed. Status:", res.status, "Response:", errorText);
        throw new Error(`Errore cancellazione: ${res.status} - ${errorText}`);
      }

      console.log("Delete successful for:", deletingLogId);
      setLogs(prev => prev.filter(l => l.id !== deletingLogId));
      setDeletingLogId(null);
    } catch (error) {
      console.error("Error in confirmDelete:", error);
      alert("Errore durante l'eliminazione.");
      setDeletingLogId(null);
    }
  };

  // Stats calculation
  const totalFuelCost = logs.reduce((sum, log) => sum + (log.totalCost || 0), 0);
  const totalLiters = logs.reduce((sum, log) => sum + (log.liters || 0), 0);
  const avgPrice = totalLiters > 0 ? (totalFuelCost / totalLiters).toFixed(3) : '0.000';

  // Calculate {getFuelEfficiencyUnit(settings)} using consecutive full tanks if possible, otherwise simple estimation
  let averageConsumption = '---';
  if (logs.length >= 2) {
    const sortedLogs = [...logs].sort((a, b) => a.odometer - b.odometer);
    const startOdo = sortedLogs[0].odometer;
    const endOdo = sortedLogs[sortedLogs.length - 1].odometer;
    const distanceCoved = endOdo - startOdo;
    
    // Sum liters of all logs EXCEPT the first one (since first log fills the tank for the interval)
    // For simplicity of estimation over all entries:
    const litersBurned = sortedLogs.slice(1).reduce((sum, l) => sum + l.liters, 0);

    if (distanceCoved > 0 && litersBurned > 0) {
      averageConsumption = getFuelEfficiencyValue(litersBurned, distanceCoved, settings);
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
          className="bg-[#3E4A35] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#5A6B4E] transition"
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

      {loading && (
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
      {!loading && !error && logs.length > 0 && (
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
              className="text-slate-400 hover:text-slate-600 p-1"
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
                  className="w-full bg-white border border-slate-300 p-2 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Litri inseriti</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={liters}
                    onChange={e => setLiters(e.target.value)}
                    placeholder="es. 45.5"
                    className="w-full bg-white border border-slate-300 py-2 pl-3 pr-8 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                  <span className="absolute right-3 top-2 text-slate-400 font-black text-sm">L</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Prezzo al Litro</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={pricePerLiter}
                    onChange={e => setPricePerLiter(e.target.value)}
                    placeholder="es. 1.759"
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
                  type="number"
                  required
                  value={odometer}
                  onChange={e => setOdometer(e.target.value)}
                  placeholder="es. 125000"
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
      {!loading && !error && logs.length > 0 && !showAddForm && (
        <div className="space-y-2.5">
          {logs.map((log) => {
            const cColor = log.fuelCompany.toLowerCase().includes('eni') ? 'bg-yellow-400 text-slate-900' :
                           log.fuelCompany.toLowerCase().includes('q8') ? 'bg-blue-600 text-white' :
                           log.fuelCompany.toLowerCase().includes('esso') ? 'bg-red-500 text-white' :
                           log.fuelCompany.toLowerCase().includes('ip') ? 'bg-green-600 text-white' :
                           log.fuelCompany.toLowerCase().includes('tamoil') ? 'bg-emerald-600 text-white' :
                           'bg-slate-200 text-slate-700';

            return (
              <div key={log.id} className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all hover:border-[#3E4A35]/30">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex flex-col items-center justify-center shrink-0 shadow-inner font-black text-[10px] tracking-tight truncate px-1 border border-black/10 ${cColor}`}>
                    {log.fuelCompany.substring(0, 4)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-slate-800 text-sm">
                        {log.totalCost.toFixed(2)} {getCurrencySymbol(settings)}
                      </h4>
                      {log.isFullTank && <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">Pieno</span>}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 font-mono">
                      <span>{log.date}</span>
                      <span>&bull;</span>
                      <span>{log.odometer.toLocaleString()} {getDistanceUnit(settings)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-12 sm:pl-0">
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-blue-700">{log.liters.toFixed(2)} L</div>
                    <div className="text-[10px] text-slate-400 font-mono">{log.pricePerLiter.toFixed(3)} {getCurrencySymbol(settings)}/L</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(log.id)}
                    className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
