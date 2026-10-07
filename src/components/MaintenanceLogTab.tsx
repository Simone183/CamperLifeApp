import React from 'react';
import { useAppSettings } from '../useAppSettings';
import { getCurrencySymbol } from '../unit-helpers';
import { 
  Wrench, 
  Droplet, 
  Flame, 
  Zap, 
  Calendar, 
  Plus, 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  ShieldAlert, 
  Hammer, 
  Clock, 
  Info, 
  BookOpen,
  TrendingDown,
  Gauge,
  Thermometer
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useFamilyCrew } from '../context/FamilyCrewContext';
import { FamilyCrewTabBanner } from './FamilyCrewModal';

export interface MaintenanceLog {
  id: string;
  title: string;
  date: string;
  category: 'Estetica' | 'Installazioni' | 'Riparazioni' | 'Pulizie' | 'Generica';
  description: string;
  cost?: number;
  completed: boolean;
  km?: number;
}

const DEFAULT_LOGS: MaintenanceLog[] = [
  { id: 'm1', title: 'Lavaggio esterno completo', date: '2026-09-01', category: 'Generica', description: 'Lavaggio profondo della carrozzeria esterna.', cost: 30, completed: true },
  { id: 'm2', title: 'Lucidatura carrozzeria', date: '2026-09-05', category: 'Estetica', description: 'Trattamento protettivo con cera lucidante.', cost: 50, completed: true },
  { id: 'm3', title: 'Grafitaggio sottoscocca', date: '2026-09-10', category: 'Riparazioni', description: 'Applicazione protettivo grafitato per sottoscocca.', cost: 70, completed: true },
  { id: 'm4', title: 'Sostituzione luci interne', date: '2026-09-20', category: 'Installazioni', description: 'Conversione illuminazione cellula a basso consumo.', cost: 40, completed: true }
];

export function sanitizeMaintenanceLogs(logsList: MaintenanceLog[]): MaintenanceLog[] {
  if (!Array.isArray(logsList) || logsList.length === 0) return DEFAULT_LOGS;
  const legacyKeywords = [
    'Test di Umidità',
    'Trattamento Igienizzante',
    'Sostituzione Filtro Regolatore Gas',
    'Sanificazione Serbatoio',
    'Verifica Sigillature',
    'Controllo Tensione',
    'Infiltrazioni Parentale',
    'Serbatoio Grigie',
    'Truma MonoControl',
    'Acqua Chiara',
    'Tetto & Oblo',
    'pannello solare',
    "Ioni D'argento",
    'acido citrico',
    'Revisione',
    'Assicurazione',
    'Bollo',
    'Tagliando'
  ];
  const cleaned = logsList.filter(item => {
    if (!item || !item.title) return false;
    const t = item.title.toLowerCase();
    return !legacyKeywords.some(kw => t.includes(kw.toLowerCase()));
  });
  if (cleaned.length === 0) {
    return DEFAULT_LOGS;
  }
  return cleaned;
}

export function MaintenanceLogTab({ onOpenCrewModal }: { onOpenCrewModal?: () => void } = {}) {
  const settings = useAppSettings();
  const { currentCrew, syncCrewSection, isModuleSynced } = useFamilyCrew();
  const [loadedFromFirestore, setLoadedFromFirestore] = React.useState(false);

  // Logs state
  const [logs, setLogs] = React.useState<MaintenanceLog[]>(() => {
    try {
      const saved = localStorage.getItem('camper_maintenance_logs');
      if (saved) {
        return sanitizeMaintenanceLogs(JSON.parse(saved));
      }
    } catch (e) {}
    return DEFAULT_LOGS;
  });

  // Used to prevent circular updates between local state and cloud/context
  const isSyncingRef = React.useRef(false);

  // Sync from family crew if updated
  React.useEffect(() => {
    if (currentCrew && (currentCrew.syncModules?.maintenance !== false) && Array.isArray(currentCrew.sharedData?.maintenance)) {
      const incoming = sanitizeMaintenanceLogs(currentCrew.sharedData.maintenance);
      setLogs(prev => {
          if (JSON.stringify(incoming) !== JSON.stringify(prev)) {
            isSyncingRef.current = true;
            return incoming;
          }
          return prev;
      });
    }
  }, [currentCrew?.sharedData?.maintenance, currentCrew?.syncModules]);

  // Form states for adding log
  const [newTitle, setNewTitle] = React.useState('');
  const [newDate, setNewDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [newCat, setNewCat] = React.useState<MaintenanceLog['category']>('Generica');
  const [newDesc, setNewDesc] = React.useState('');
  const [newCost, setNewCost] = React.useState<number>(0);
  const [newKm, setNewKm] = React.useState<number>(0);

  // Sync logs with Firestore
  React.useEffect(() => {
    const docRef = doc(db, "user_data", "maintenance_logs");
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.logs) {
          const sanitized = sanitizeMaintenanceLogs(data.logs);
          setLogs(sanitized);
          try {
            localStorage.setItem('camper_maintenance_logs', JSON.stringify(sanitized));
          } catch (e) {}
        }
      } else {
        setDoc(docRef, { logs: DEFAULT_LOGS }, { merge: true }).catch(() => {});
      }
      setLoadedFromFirestore(true);
    }, (error) => {
      console.error("MaintenanceLogTab Firestore sync error:", error);
      setLoadedFromFirestore(true);
    });
    return unsubscribe;
  }, []);

  React.useEffect(() => {
    if (!loadedFromFirestore) return;
    const docRef = doc(db, "user_data", "maintenance_logs");
    setDoc(docRef, { logs }, { merge: true }).catch(() => {});
    try {
      localStorage.setItem('camper_maintenance_logs', JSON.stringify(logs));
    } catch (e) {}
  }, [logs, loadedFromFirestore]);


  // Sync to Family Crew
  const syncToFamilyCrew = (newLogs: MaintenanceLog[]) => {
    if (currentCrew && isModuleSynced('maintenance')) {
      syncCrewSection('maintenance', newLogs).catch(() => {});
    }
  };


  const handleToggleLogCompleted = (id: string) => {
    setLogs(prev => {
      const nextLogs = prev.map(log => {
        if (log.id === id) {
          return { ...log, completed: !log.completed };
        }
        return log;
      });
      syncToFamilyCrew(nextLogs);
      return nextLogs;
    });
  };

  const handleUpdateLogDate = (id: string, newDate: string) => {
    setLogs(prev => prev.map(log => {
      if (log.id === id) {
        return { ...log, date: newDate };
      }
      return log;
    }));
  };

  const handleUpdateLogCost = (id: string, newCost: number | undefined) => {
    setLogs(prev => prev.map(log => {
      if (log.id === id) {
        return { ...log, cost: newCost };
      }
      return log;
    }));
  };

  const handleUpdateLogKm = (id: string, newKm: number | undefined) => {
    setLogs(prev => prev.map(log => {
      if (log.id === id) {
        return { ...log, km: newKm };
      }
      return log;
    }));
  };

  const handleDeleteLog = (id: string) => {
    setLogs(prev => prev.filter(log => log.id !== id));
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: '🗑️ Annotazione di manutenzione rimossa.' }
    }));
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newLog: MaintenanceLog = {
      id: `mt_n_${Date.now()}`,
      title: newTitle.trim(),
      date: newDate,
      category: newCat,
      description: newDesc.trim(),
      cost: newCost > 0 ? newCost : undefined,
      km: newKm > 0 ? newKm : undefined,
      completed: false
    };

    setLogs(prev => {
        const nextLogs = [newLog, ...prev];
        syncToFamilyCrew(nextLogs);
        return nextLogs;
    });
    setNewTitle('');
    setNewDesc('');
    setNewCost(0);
    setNewKm(0);
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: `🔧 Registrata attività: ${newLog.title}` }
    }));
  };

  const handleResetToDefault = () => {
    if (confirm('Sei sicuro di voler ripristinare la cronologia manutenzioni standard? Attenzione: sovrascriverà i dati salvati.')) {
      try {
        localStorage.removeItem('camper_maintenance_logs');
      } catch (e) {}
      setLogs(DEFAULT_LOGS);
      if (currentCrew && isModuleSynced('maintenance')) {
        syncCrewSection('maintenance', DEFAULT_LOGS).catch(() => {});
      }
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: '🔄 Cronologia manutenzione ripristinata ai valori standard!' }
      }));
    }
  };

  // Helper stats
  const totalCompletedCount = logs.filter(l => l.completed).length;
  const totalPendingCount = logs.filter(l => !l.completed).length;
  const totalInvestment = logs.reduce((sum, current) => sum + (current.cost || 0), 0);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Family Crew Banner */}
      <FamilyCrewTabBanner moduleName="Manutenzione & Scadenziere" onOpenCrewModal={onOpenCrewModal} />

      {/* Banner Header */}
      <div className="bg-gradient-to-br from-[#3E4A35] to-[#2B3523] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black tracking-widest bg-amber-500/20 text-yellow-300 border border-yellow-500/30 px-2.5 py-1 rounded-full inline-block">
              Registrazione lavori fatti e spese sostenute
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <Wrench className="w-6 h-6 text-yellow-300" />
              Registro lavori fatti
            </h2>
            <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
              Previeni le infiltrazioni (il nemico numero uno del camperista!) e controlla gli impianti domestici di rinfresco, riscaldamento e idraulici con tabelle di controllo e l’igrometro digitale virtuale, registra i lavori effettuati su tutto il mezzo e la spesa sostenuta.
            </p>
          </div>

          <button
            onClick={handleResetToDefault}
            className="px-3.5 py-2 bg-[#A45C40] hover:bg-[#8D4A30] active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5 uppercase tracking-wider shrink-0"
            title="Ripristina dati iniziali"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ripristina Log</span>
          </button>
        </div>

        {/* Global Stats bar */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10 text-center md:text-left">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="block text-[8px] text-stone-350 font-bold uppercase tracking-widest">Controlli</span>
            <span className="text-xl font-mono font-black text-emerald-300 leading-tight block">{totalCompletedCount} <span className="text-base">completati</span></span>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="block text-[8px] text-stone-350 font-bold uppercase tracking-widest">Interventi</span>
            <span className="text-xl font-mono font-black text-amber-300 leading-tight block text-center">
              <span className="block">{totalPendingCount}</span>
              <span className="block text-base">attivi</span>
            </span>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="block text-[8px] text-stone-350 font-bold uppercase tracking-widest text-center">Spesa Totale</span>
            <span className="text-xl font-mono font-black text-rose-300 leading-tight block text-center mt-2">{getCurrencySymbol(settings)}{totalInvestment}</span>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center justify-center">
            <span className="text-xs font-bold text-white">Pronto a partire!</span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN (7/12) - Checklist & History */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Active Maintenance Activities Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-4">
            
            <div className="border-b border-stone-100 dark:border-slate-700 pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">Cronologia Registro lavori fatti ed Impiantistica</h3>
                <p className="text-[11px] text-slate-400 font-medium">Batti spunta sulle attività completate per tenere aggiornato l'algoritmo di sicurezza</p>
              </div>
            </div>

            {/* List entries */}
            <div className="divide-y divide-slate-100 space-y-2">
              {logs.map(log => {
                let badgeColor = 'bg-stone-50 text-slate-600 border-stone-100';
                let iconEl = <Wrench className="w-3.5 h-3.5 text-slate-600" />;

                if (log.category === 'Estetica') {
                  badgeColor = 'bg-pink-50 text-pink-700 border-pink-150';
                  iconEl = <Droplet className="w-3.5 h-3.5 text-pink-500" />;
                } else if (log.category === 'Installazioni') {
                  badgeColor = 'bg-blue-50 text-blue-700 border-blue-150';
                  iconEl = <Zap className="w-3.5 h-3.5 text-blue-500" />;
                } else if (log.category === 'Riparazioni') {
                  badgeColor = 'bg-orange-50 text-orange-700 border-orange-150';
                  iconEl = <Hammer className="w-3.5 h-3.5 text-orange-500" />;
                } else if (log.category === 'Pulizie') {
                  badgeColor = 'bg-cyan-50 text-cyan-800 border-cyan-200';
                  iconEl = <Droplet className="w-3.5 h-3.5 text-cyan-600" />;
                }

                return (
                  <div 
                    key={log.id} 
                    className={`pt-3.5 pb-2 flex items-start justify-between gap-4 ${
                      log.completed ? 'opacity-60 bg-stone-50/50 dark:bg-stone-900/50 rounded-xl px-2' : ''
                    }`}
                  >
                    
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Check completing toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleLogCompleted(log.id)}
                        className={`mt-1 cursor-pointer shrink-0 ${log.completed ? 'text-emerald-500' : 'text-slate-350 hover:text-[#3E4A35]'}`}
                        title={log.completed ? "Segna come incompiuto" : "Completa attività"}
                      >
                        {log.completed ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <div className="w-5 h-5 rounded-md border-2 border-stone-300" />
                        )}
                      </button>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`font-extrabold text-xs leading-snug text-[#2D2926] dark:text-slate-100 ${log.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                            {log.title}
                          </h4>
                          <span className={`px-2 py-0.5 border rounded text-[8px] font-black uppercase flex items-center gap-1 ${badgeColor}`}>
                            {iconEl}
                            {log.category}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                          {log.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-bold font-mono">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Scadenza:</span>
                            <input
                              type="date"
                              value={log.date}
                              onChange={(e) => handleUpdateLogDate(log.id, e.target.value)}
                              className="text-[10px] text-slate-600 dark:text-slate-300 font-mono font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 outline-none focus:border-[#3E4A35]"
                            />
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span>Costo ({getCurrencySymbol(settings)}):</span>
                            <input
                              type="number"
                              value={log.cost !== undefined ? log.cost : ''}
                              onChange={(e) => handleUpdateLogCost(log.id, e.target.value ? parseFloat(e.target.value) : undefined)}
                              placeholder="--"
                              className="w-16 text-[10px] text-slate-600 dark:text-slate-300 font-mono font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 outline-none focus:border-[#3E4A35]"
                            />
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span>Km:</span>
                            <input
                              type="number"
                              value={log.km !== undefined ? log.km : ''}
                              onChange={(e) => handleUpdateLogKm(log.id, e.target.value ? parseInt(e.target.value) : undefined)}
                              placeholder="--"
                              className="w-20 text-[10px] text-slate-600 dark:text-slate-300 font-mono font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 outline-none focus:border-[#3E4A35]"
                            />
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteLog(log.id)}
                      className="p-1 px-1.5 text-red-500 hover:text-red-700 font-extrabold text-[#A45C40] hover:scale-110 transition-all cursor-pointer"
                      title="Elimina"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                  </div>
                );
              })}
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN (5/12) - Humidity Control & Add New entry form */}
        <div className="lg:col-span-5 space-y-6">
          


          {/* Section B: Add Log Entry Form */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#A45C40]" />
              Annota nuovo Controllo Impianti
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">Registra un filtro cambiato, una sigillatura o un controllo igrometrico positivo</p>

            <form onSubmit={handleAddLog} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[9px] uppercase font-bold text-slate-500">Nome Attività / Controllo</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Sostituzione pompa Shurflo, Igienizzazione..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 bg-stone-50 rounded-lg text-[#2D2926] focus:bg-white focus:outline-none focus:border-[#3E4A35]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-slate-500">Data Scadenza / Esecuzione</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-stone-200 bg-stone-50 rounded-lg text-[#2D2926] focus:bg-white focus:outline-none focus:border-[#3E4A35]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-slate-500">Macrocategoria</label>
                  <select
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-stone-200 bg-stone-50 rounded-lg text-[#2D2926] focus:bg-white focus:outline-none focus:border-[#3E4A35] cursor-pointer"
                  >
                    <option value="Estetica">Estetica</option>
                    <option value="Installazioni">Installazioni</option>
                    <option value="Riparazioni">Riparazioni</option>
                    <option value="Pulizie">Pulizie</option>
                    <option value="Generica">Generica</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-slate-500">Costo ({getCurrencySymbol(settings)})</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Es. 45"
                    value={newCost || ''}
                    onChange={(e) => setNewCost(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-xs border border-stone-200 bg-stone-50 rounded-lg text-[#2D2926] focus:bg-white focus:outline-none focus:border-[#3E4A35] font-mono text-center font-bold"
                  />
                </div>

                <div className="col-span-1 space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-slate-500">Km effettuati</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Es. 45000"
                    value={newKm || ''}
                    onChange={(e) => setNewKm(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-xs border border-stone-200 bg-stone-50 rounded-lg text-[#2D2926] focus:bg-white focus:outline-none focus:border-[#3E4A35] font-mono text-center font-bold"
                  />
                </div>

                <div className="col-span-1 space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-slate-500">Note / Descrizione</label>
                  <input
                    type="text"
                    placeholder="Es. Sostituito..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-200 bg-stone-50 rounded-lg text-[#2D2926] focus:bg-white focus:outline-none focus:border-[#3E4A35]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-black rounded-lg text-xs tracking-wider transition-all uppercase cursor-pointer text-center shadow-sm"
              >
                Incolla Attività nel Registro
              </button>
            </form>
          </div>

          {/* Section C: Educational camper protection rules */}
          <div className="bg-stone-50 dark:bg-slate-800 rounded-2xl border border-stone-200 dark:border-slate-700 p-4 space-y-2 text-[10.5px] leading-relaxed text-stone-600 dark:text-slate-400 font-medium">
            <p className="text-stone-500 font-semibold leading-relaxed">
              Consiglio per gli impianti: lascia aperti i rubinetti del camper (a pompa e termostati spenti!) durante le gelate invernali per evitare che le tubature in plastica scoppino a causa del ghiaccio!
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
