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
  category: 'infiltrazioni' | 'gas' | 'acqua' | 'elettrico' | 'motore' | 'generica';
  description: string;
  cost?: number;
  completed: boolean;
  km?: number;
}

const DEFAULT_LOGS: MaintenanceLog[] = [
  { id: 'm1', title: 'Test di Umidità / Infiltrazioni Parentale', date: '2026-04-10', category: 'infiltrazioni', description: 'Controllo con igrometro su angoli dinette, mansarda e doccia. Valori rilevati uniformi tra 10% e 14%. Tutto conforme.', cost: 0, completed: true },
  { id: 'm2', title: 'Trattamento Igienizzante Serbatoio Grige', date: '2026-05-18', category: 'acqua', description: 'Pulizia chimica con enzimi antiodore per eliminare depositi grassi e saponi accumulati.', cost: 15, completed: true },
  { id: 'm3', title: 'Sostituzione Filtro Regolatore Gas Truma MonoControl', date: '2026-06-01', category: 'gas', description: 'Controllo pressione e montaggio nuovo filtro protettivo per olii pesanti del GPL.', cost: 38, completed: true },
  { id: 'm4', title: 'Sanificazione Serbatoio Acqua Chiara con Ioni D\'argento', date: '2026-06-15', category: 'acqua', description: 'Pulizia completa con agente a base di cloro e inserimento della rete agli ioni d\'argento per conservazione a lungo termine.', cost: 24, completed: true },
  { id: 'm5', title: 'Verifica Sigillature Tetto & Oblo', date: '2026-07-15', category: 'infiltrazioni', description: 'Ispezione esterna del sigillante siliconico perimetrale e rimessa a nuovo dei punti usurati con Terostat.', cost: 0, completed: false },
  { id: 'm6', title: 'Controllo Tensione e capacità della piastra solare', date: '2026-08-01', category: 'elettrico', description: 'Rimozione polvere dai pannelli solari anteriori e misurazione dell\'amperaggio di ricarica in uscita dal regolatore MPPT.', cost: 0, completed: false }
];

// Interactive mock hygrometer sectors for cell leakage checks
interface SectorLeakage {
  id: string;
  name: string;
  value: number; // humidity percentage (e.g. 5% - 40%)
  lastChecked: string;
}

export function MaintenanceLogTab({ onOpenCrewModal }: { onOpenCrewModal?: () => void } = {}) {
  const settings = useAppSettings();
  const { currentCrew, syncCrewSection, isModuleSynced } = useFamilyCrew();
  // Logs state
  const [logs, setLogs] = React.useState<MaintenanceLog[]>(DEFAULT_LOGS);
  const [loadedFromFirestore, setLoadedFromFirestore] = React.useState(false);

  // Sync from family crew if updated
  React.useEffect(() => {
    if (currentCrew && isModuleSynced('maintenance') && Array.isArray(currentCrew.sharedData?.maintenance) && currentCrew.sharedData.maintenance.length > 0) {
      setLogs(currentCrew.sharedData.maintenance);
    }
  }, [currentCrew, isModuleSynced]);

  // Leakage sector testing state
  const [sectors, setSectors] = React.useState<SectorLeakage[]>([
    { id: 's1', name: 'Angolo Anteriore Sinistro (Mansarda / Cupolino)', value: 12, lastChecked: '2026-06-19' },
    { id: 's2', name: 'Fiancata Centrale Dinette (Finestra)', value: 11, lastChecked: '2026-06-19' },
    { id: 's3', name: 'Rivestimento Interno Bagno & Doccia', value: 15, lastChecked: '2026-06-19' },
    { id: 's4', name: 'Angolo Posteriore Destro (Garage / Sotto-letto)', value: 13, lastChecked: '2026-06-19' },
  ]);

  // Form states for adding log
  const [newTitle, setNewTitle] = React.useState('');
  const [newDate, setNewDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [newCat, setNewCat] = React.useState<MaintenanceLog['category']>('infiltrazioni');
  const [newDesc, setNewDesc] = React.useState('');
  const [newCost, setNewCost] = React.useState<number>(0);
  const [newKm, setNewKm] = React.useState<number>(0);

  // Sync logs with Firestore
  React.useEffect(() => {
    // Note: Assuming maintenance log should be synced per user
    // For this example, using a global user_data/maintenance_logs
    const docRef = doc(db, "user_data", "maintenance_logs");
    
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.logs) setLogs(data.logs);
      }
      setLoadedFromFirestore(true);
    }, (error) => {
      console.error("MaintenanceLogTab Firestore sync error:", error);
      setLoadedFromFirestore(true);
    });
    return unsubscribe;
  }, []);

  const saveLogsToFirestore = (newLogs: MaintenanceLog[]) => {
    const docRef = doc(db, "user_data", "maintenance_logs");
    // Sanitize the object to remove any 'undefined' properties which are unsupported by Firestore
    const cleanedLogs = JSON.parse(JSON.stringify(newLogs));
    setDoc(docRef, { logs: cleanedLogs }, { merge: true });

    // Also sync to Family Crew
    if (currentCrew && isModuleSynced('maintenance')) {
      syncCrewSection('maintenance', cleanedLogs).catch(() => {});
    }
  };

  React.useEffect(() => {
    if (!loadedFromFirestore) return; // Prevent overwriting cloud data on initial load
    saveLogsToFirestore(logs);
  }, [logs, loadedFromFirestore]);

  // Adjust interactive Sector humidity simulation to show real-time feedback
  const handleSectorHumiditySimulate = (id: string, val: number) => {
    setSectors(prev => prev.map(sec => {
      if (sec.id === id) {
        return { ...sec, value: val, lastChecked: new Date().toISOString().split('T')[0] };
      }
      return sec;
    }));
  };

  const handleToggleLogCompleted = (id: string) => {
    setLogs(prev => prev.map(log => {
      if (log.id === id) {
        return { ...log, completed: !log.completed };
      }
      return log;
    }));
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

    setLogs(prev => [newLog, ...prev]);
    setNewTitle('');
    setNewDesc('');
    setNewCost(0);
    setNewKm(0);
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: `🔧 Registrata attività: ${newLog.title}` }
    }));
  };

  const handleResetToDefault = () => {
    if (confirm('Sei sicuro di voler ripristinare la cronologia manutenzioni standard?')) {
      setLogs(DEFAULT_LOGS);
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: '🔄 Cronologia manutenzione ripristinata ai valori standard.' }
      }));
    }
  };

  // Helper stats
  const totalCompletedCount = logs.filter(l => l.completed).length;
  const totalPendingCount = logs.filter(l => !l.completed).length;
  const totalInvestment = logs.reduce((sum, current) => sum + (current.cost || 0), 0);

  // Sector Leakage diagnostic risk mapping
  // Healthy: < 15% humidity
  // Watchout: 15% - 20%
  // Danger of Wood rot (Infiltrazione attiva): > 20%
  const getSectorRiskStatus = (val: number) => {
    if (val > 20) {
      return {
        label: 'PERICOLO INFILTRAZIONE 🚨',
        color: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900',
        desc: 'Umidità critica! Alto rischio di marcire delle traverse in legno strutturali del camper. Ispezionare subito le sigillature esterne o la mansarda.'
      };
    }
    if (val >= 16) {
      return {
        label: 'ATTENZIONE / SOSPETTO ⚠️',
        color: 'text-amber-850 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900',
        desc: 'Umidità moderatamente elevata. Potrebbe trattarsi di condensa o di un microtrafilamento iniziale. Tenere sotto controllo.'
      };
    }
    return {
      label: 'CONFORME / ASCIUTTO ✓',
      color: 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 border-emerald-100 dark:border-emerald-900',
      desc: 'Struttura perfettamente sana. Legno asciutto e nessuna infiltrazione rilevata.'
    };
  };

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
              Integrità Strutturale & Sigillature
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <Wrench className="w-6 h-6 text-yellow-300" />
              Registro Manutenzione Cellula & Antisgocciolo
            </h2>
            <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
              Previeni le infiltrazioni (il nemico numero uno del camperista!) e controlla gli impianti domestici di rinfresco, riscaldamento e idraulici con tabelle di controllo e l’igrometro digitale virtuale.
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
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-100 rounded-xl p-3 flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-[10px] font-bold leading-tight">Umidità Media Cellula: <b className="text-white block text-xs">12.5% (Ottimo)</b></span>
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
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">Cronologia Manutentiva ed Impiantistica</h3>
                <p className="text-[11px] text-slate-400 font-medium">Batti spunta sulle attività completate per tenere aggiornato l'algoritmo di sicurezza</p>
              </div>
            </div>

            {/* List entries */}
            <div className="divide-y divide-slate-100 space-y-2">
              {logs.map(log => {
                let badgeColor = 'bg-stone-50 text-slate-600 border-stone-100';
                let iconEl = <Wrench className="w-3.5 h-3.5 text-slate-600" />;

                if (log.category === 'infiltrazioni') {
                  badgeColor = 'bg-red-50 text-red-700 border-red-150';
                  iconEl = <Droplet className="w-3.5 h-3.5 text-red-500" />;
                } else if (log.category === 'gas') {
                  badgeColor = 'bg-orange-50 text-orange-700 border-orange-150';
                  iconEl = <Flame className="w-3.5 h-3.5 text-orange-500" />;
                } else if (log.category === 'acqua') {
                  badgeColor = 'bg-blue-50 text-blue-700 border-blue-150';
                  iconEl = <Droplet className="w-3.5 h-3.5 text-blue-500" />;
                } else if (log.category === 'elettrico') {
                  badgeColor = 'bg-yellow-50 text-yellow-800 border-yellow-200';
                  iconEl = <Zap className="w-3.5 h-3.5 text-yellow-600" />;
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
          
          {/* Section A: Hygrometer Simulation Control */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-4">
            
            <div className="flex items-start gap-1.5">
              <Droplet className="w-5 h-5 text-blue-500 shrink-0" />
              <div>
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">Igrometro di Cella Integrato</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-400 font-medium leading-relaxed">Seleziona e simula i livelli di umidità negli angoli sensibili del camper per valutare infiltrazioni attive.</p>
              </div>
            </div>

            {/* Simulated sectors list */}
            <div className="space-y-4">
              {sectors.map(sec => {
                const diag = getSectorRiskStatus(sec.value);
                return (
                  <div key={sec.id} className="p-3 bg-stone-50 dark:bg-slate-900 border border-stone-200/50 dark:border-slate-700 rounded-xl space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-100 block pr-2 truncate">{sec.name}</span>
                      <span className="text-xs font-mono font-black text-slate-900 dark:text-slate-200 shrink-0">{sec.value}% RF</span>
                    </div>

                    {/* Simple Slider to change simulated value on the fly */}
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="5"
                        max="35"
                        step="1"
                        value={sec.value}
                        onChange={(e) => handleSectorHumiditySimulate(sec.id, parseInt(e.target.value))}
                        className="w-full accent-[#3E4A35] h-1 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Diagnostic read out */}
                    <div className={`p-2.5 rounded-lg border text-[10px] leading-relaxed transition-all ${diag.color}`}>
                      <span className="font-black uppercase tracking-wider block mb-0.5">{diag.label}</span>
                      <span className="opacity-95 font-medium block">{diag.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

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
                    <option value="infiltrazioni">Antisgocciolo / Sigillature</option>
                    <option value="gas">GPL & Riscaldamento</option>
                    <option value="acqua">Impianto Idrico & Pompe</option>
                    <option value="elettrico">Batterie, 12V & Solare</option>
                    <option value="generica">Generico Manutenzione</option>
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
            <span className="text-[9px] uppercase tracking-wider font-black text-[#A45C40] dark:text-orange-400 block flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-[#A45C40] shrink-0" />
              Senza infiltrazioni = Valore camper preservato:
            </span>
            <p>
              Le infiltrazioni d’acqua svalutano il valore di un camper del <b>-70% in breve tempo</b>. Esegui il test igrometrico fai-da-te <b>due volte all'anno</b> (soprattutto dopo la stagione delle piogge autunnali e invernali).
            </p>
            <p className="text-stone-500 font-semibold leading-relaxed">
              Consiglio per gli impianti: lascia aperti i rubinetti del camper (a pompa e termostati spenti!) durante le gelate invernali per evitare che le tubature in plastica scoppino a causa del ghiaccio!
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
