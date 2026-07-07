import React from 'react';
import { useAppSettings } from '../useAppSettings';
import { getCurrencySymbol, formatCurrency, getDistanceUnit } from '../unit-helpers';
import { 
  Calendar, 
  Wrench, 
  DollarSign, 
  Gauge, 
  CheckCircle2, 
  Clock, 
  ArrowUpDown, 
  Plus, 
  Trash2, 
  Search, 
  SlidersHorizontal,
  Info,
  TrendingUp
} from 'lucide-react';
import { Deadline } from '../types';
import { MaintenanceLog } from './MaintenanceLogTab';

interface WorkLogTabProps {
  deadlines: Deadline[];
  onChange: (deadlines: Deadline[]) => void;
}

interface UnifiedWorkItem {
  id: string;
  source: 'deadlines' | 'maintenance';
  title: string;
  date: string;
  category: string;
  done: boolean;
  cost?: number;
  km?: number;
  notes?: string;
}

const DEFAULT_MAINTENANCE_LOGS: MaintenanceLog[] = [
  { id: 'm1', title: 'Test di Umidità / Infiltrazioni Parentale', date: '2026-04-10', category: 'infiltrazioni', description: 'Controllo con igrometro su angoli dinette, mansarda e doccia. Valori rilevati uniformi tra 10% e 14%. Tutto conforme.', cost: 0, completed: true },
  { id: 'm2', title: 'Trattamento Igienizzante Serbatoio Grige', date: '2026-05-18', category: 'acqua', description: 'Pulizia chimica con enzimi antiodore per eliminare depositi grassi e saponi accumulati.', cost: 15, completed: true },
  { id: 'm3', title: 'Sostituzione Filtro Regolatore Gas Truma MonoControl', date: '2026-06-01', category: 'gas', description: 'Controllo pressione e montaggio nuovo filtro protettivo per olii pesanti del GPL.', cost: 38, completed: true },
  { id: 'm4', title: 'Sanificazione Serbatoio Acqua Chiara con Ioni D\'argento', date: '2026-06-15', category: 'acqua', description: 'Pulizia completa con agente a base di cloro e inserimento della rete agli ioni d\'argento per conservazione a lungo termine.', cost: 24, completed: true },
  { id: 'm5', title: 'Verifica Sigillature Tetto & Oblo', date: '2026-07-15', category: 'infiltrazioni', description: 'Ispezione esterna del sigillante siliconico perimetrale e rimessa a nuovo dei punti usurati con Terostat.', cost: 0, completed: false },
  { id: 'm6', title: 'Controllo Tensione e capacità della piastra solare', date: '2026-08-01', category: 'elettrico', description: 'Rimozione polvere dai pannelli solari anteriori e misurazione dell\'amperaggio di ricarica in uscita dal regolatore MPPT.', cost: 0, completed: false }
];

export default function WorkLogTab({ deadlines, onChange }: WorkLogTabProps) {
  const settings = useAppSettings();
  // Maintenance logs loaded from local storage (or default)
  const [maintenanceLogs, setMaintenanceLogs] = React.useState<MaintenanceLog[]>(() => {
    const saved = localStorage.getItem('camper_maintenance_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return DEFAULT_MAINTENANCE_LOGS; }
    }
    return DEFAULT_MAINTENANCE_LOGS;
  });

  // State to refresh local storage when changed
  const saveMaintenanceLogs = (logsList: MaintenanceLog[]) => {
    setMaintenanceLogs(logsList);
    localStorage.setItem('camper_maintenance_logs', JSON.stringify(logsList));
    // Trigger storage event so other tabs sync up
    window.dispatchEvent(new Event('storage'));
  };

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterSource, setFilterSource] = React.useState<'all' | 'deadlines' | 'maintenance'>('all');
  const [filterStatus, setFilterStatus] = React.useState<'all' | 'completed' | 'pending'>('all');
  const [isDescending, setIsDescending] = React.useState(true);
  const [showAddForm, setShowAddForm] = React.useState(false);

  // Form states for direct addition
  const [newSource, setNewSource] = React.useState<'deadlines' | 'maintenance'>('deadlines');
  const [newTitle, setNewTitle] = React.useState('');
  const [newDate, setNewDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [newCost, setNewCost] = React.useState('');
  const [newKm, setNewKm] = React.useState('');
  const [newNotes, setNewNotes] = React.useState('');
  const [newDeadlineCategory, setNewDeadlineCategory] = React.useState<Deadline['category']>('Manutenzione');
  const [newMaintCategory, setNewMaintCategory] = React.useState<MaintenanceLog['category']>('generica');

  // Unified items
  const mappedDeadlines: UnifiedWorkItem[] = deadlines.map(d => ({
    id: d.id,
    source: 'deadlines',
    title: d.title,
    date: d.dueDate,
    category: d.category,
    done: d.done,
    cost: d.price,
    km: d.km,
    notes: d.notes,
  }));

  const mappedMaintenance: UnifiedWorkItem[] = maintenanceLogs.map(m => ({
    id: m.id,
    source: 'maintenance',
    title: m.title,
    date: m.date,
    category: m.category,
    done: m.completed,
    cost: m.cost,
    km: m.km,
    notes: m.description,
  }));

  const combinedItems = [...mappedDeadlines, ...mappedMaintenance];

  // Inline updater
  const handleUpdateItem = (id: string, source: 'deadlines' | 'maintenance', field: 'date' | 'cost' | 'km' | 'done', value: any) => {
    if (source === 'deadlines') {
      onChange(deadlines.map(d => {
        if (d.id === id) {
          if (field === 'date') return { ...d, dueDate: value };
          if (field === 'cost') return { ...d, price: value };
          if (field === 'km') return { ...d, km: value };
          if (field === 'done') return { ...d, done: value };
        }
        return d;
      }));
    } else {
      const updated = maintenanceLogs.map(m => {
        if (m.id === id) {
          if (field === 'date') return { ...m, date: value };
          if (field === 'cost') return { ...m, cost: value };
          if (field === 'km') return { ...m, km: value };
          if (field === 'done') return { ...m, completed: value };
        }
        return m;
      });
      saveMaintenanceLogs(updated);
    }
  };

  const handleDeleteItem = (id: string, source: 'deadlines' | 'maintenance') => {
    if (confirm('Sei sicuro di voler eliminare questa voce? Verrà eliminata permanentemente dal relativo registro.')) {
      if (source === 'deadlines') {
        onChange(deadlines.filter(d => d.id !== id));
      } else {
        const updated = maintenanceLogs.filter(m => m.id !== id);
        saveMaintenanceLogs(updated);
      }
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: '🗑️ Voce rimossa dal registro.' }
      }));
    }
  };

  const handleAddJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;

    const parsedCost = newCost ? parseFloat(newCost) : undefined;
    const parsedKm = newKm ? parseInt(newKm) : undefined;

    if (newSource === 'deadlines') {
      const newItem: Deadline = {
        id: `d_${Date.now()}`,
        title: newTitle.trim(),
        category: newDeadlineCategory,
        dueDate: newDate,
        done: true, // Registrato come già completato di default quando si annota uno storico lavori
        notes: newNotes.trim() || undefined,
        price: parsedCost,
        km: parsedKm
      };
      onChange([...deadlines, newItem]);
    } else {
      const newItem: MaintenanceLog = {
        id: `mt_n_${Date.now()}`,
        title: newTitle.trim(),
        date: newDate,
        category: newMaintCategory,
        description: newNotes.trim(),
        cost: parsedCost,
        km: parsedKm,
        completed: true // Di default completato se inserito come storico lavori
      };
      saveMaintenanceLogs([newItem, ...maintenanceLogs]);
    }

    // Reset Form
    setNewTitle('');
    setNewCost('');
    setNewKm('');
    setNewNotes('');
    setShowAddForm(false);
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: `✅ Nuovo lavoro registrato e sincronizzato con successo!` }
    }));
  };

  // Filter and sort combined list
  const filteredItems = combinedItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = filterSource === 'all' ? true : item.source === filterSource;
    const matchesStatus = filterStatus === 'all' ? true : 
                          filterStatus === 'completed' ? item.done : !item.done;

    return matchesSearch && matchesSource && matchesStatus;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    const dateA = new Date(a.date).getTime() || 0;
    const dateB = new Date(b.date).getTime() || 0;
    return isDescending ? dateB - dateA : dateA - dateB;
  });

  // Calculate top level stats
  const totalCost = combinedItems.reduce((acc, curr) => acc + (curr.cost || 0), 0);
  const totalJobs = combinedItems.length;
  const completedJobs = combinedItems.filter(c => c.done).length;
  const averageCost = combinedItems.filter(c => c.cost && c.cost > 0).length > 0
    ? totalCost / combinedItems.filter(c => c.cost && c.cost > 0).length
    : 0;

  return (
    <div className="space-y-6 animate-fade-in" id="work-log-tab">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Costo Totale */}
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4.5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Costo Totale Lavori</h3>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {getCurrencySymbol(settings)}{totalCost.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[9px] text-slate-400 dark:text-slate-500">Sincronizzato da entrambi i registri</p>
          </div>
        </div>

        {/* KPI 2: Totale Lavori */}
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4.5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[#3E4A35]/10 text-[#3E4A35] dark:text-emerald-300 rounded-xl">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Lavori Tracciati</h3>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {completedJobs} / {totalJobs} <span className="text-xs font-normal text-slate-400">fatti</span>
            </p>
            <p className="text-[9px] text-slate-400 dark:text-slate-500">Ordina scadenze e manutenzione</p>
          </div>
        </div>

        {/* KPI 3: Media Spesa */}
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4.5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Costo Medio Lavoro</h3>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {getCurrencySymbol(settings)}{averageCost.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-[9px] text-slate-400 dark:text-slate-500">Su interventi con costo registrato</p>
          </div>
        </div>

        {/* KPI 4: Info Chilometri */}
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4.5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-xl">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Intervallo Chilometri</h3>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {combinedItems.filter(c => c.km).length > 0 
                ? `${Math.max(...combinedItems.map(c => c.km || 0)).toLocaleString('it-IT')} {getDistanceUnit(settings)}` 
                : 'Nessun km'}
            </p>
            <p className="text-[9px] text-slate-400 dark:text-slate-500">Chilometraggio massimo registrato</p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
        
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-5 border-b border-slate-50 dark:border-slate-700">
          <div className="space-y-1">
            <h2 className="text-base font-black text-slate-800 dark:text-slate-100">Registro Lavori Unificato & Sincronizzato</h2>
            <p className="text-xs text-slate-400 dark:text-slate-400">Una vista cronologica globale con sincronizzazione bidirezionale immediata.</p>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#3E4A35] dark:bg-emerald-700 hover:bg-[#5A6B4E] dark:hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Annota Lavoro Storico
          </button>
        </div>

        {/* Add Form Container */}
        {showAddForm && (
          <form onSubmit={handleAddJob} className="mb-6 p-5 border border-[#3E4A35]/20 bg-emerald-50/10 rounded-2xl space-y-4 animate-fade-in">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#3E4A35]" />
              Registra Lavoro / Intervento Storico
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Registro di Destinazione *</label>
                <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#3E4A35] rounded-xl bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300"
                >
                  <option value="deadlines">Scadenziario di Bordo (Revisioni, Bollo, Gas, ecc.)</option>
                  <option value="maintenance">Registro Manutenzione Cellula (Idrico, Infiltrazioni, ecc.)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Titolo dell'Intervento *</label>
                <input
                  type="text"
                  required
                  placeholder="Es: Sostituzione pompa Shurflo o Tagliando completo"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#3E4A35] rounded-xl bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Data Esecuzione *</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#3E4A35] rounded-xl bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300"
                />
              </div>

              <div>
                {newSource === 'deadlines' ? (
                  <>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Categoria Scadenziere</label>
                    <select
                      value={newDeadlineCategory}
                      onChange={(e) => setNewDeadlineCategory(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#3E4A35] rounded-xl bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <option value="Manutenzione">Manutenzione</option>
                      <option value="Revisione">Revisione</option>
                      <option value="Assicurazione">Assicurazione</option>
                      <option value="Bollo">Bollo</option>
                      <option value="Bombole Gas">Bombole Gas</option>
                    </select>
                  </>
                ) : (
                  <>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Categoria Manutenzione</label>
                    <select
                      value={newMaintCategory}
                      onChange={(e) => setNewMaintCategory(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#3E4A35] rounded-xl bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <option value="infiltrazioni">Antisgocciolo / Sigillature</option>
                      <option value="gas">GPL & Riscaldamento</option>
                      <option value="acqua">Impianto Idrico & Pompe</option>
                      <option value="elettrico">Batterie, 12V & Solare</option>
                      <option value="generica">Generico Manutenzione</option>
                    </select>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Costo Sostenuto ({getCurrencySymbol(settings)})</label>
                <input
                  type="number"
                  placeholder="Es: 180"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#3E4A35] rounded-xl bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Chilometraggio ({getDistanceUnit(settings)})</label>
                <input
                  type="number"
                  placeholder="Es: 42000"
                  value={newKm}
                  onChange={(e) => setNewKm(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#3E4A35] rounded-xl bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Note & Dettagli</label>
                <input
                  type="text"
                  placeholder="Es: Marca dei filtri, note particolari sul montaggio..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#3E4A35] rounded-xl bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white rounded-xl font-bold text-xs shadow-sm"
              >
                Salva e Sincronizza
              </button>
            </div>
          </form>
        )}

        {/* Filters and Controls Bar */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between bg-slate-50/60 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/60 mb-6">
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca per titolo, categoria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 focus:border-[#3E4A35] text-slate-700 dark:text-slate-300"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full lg:w-auto items-center justify-end">
            <div className="flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-1.5">Filtra:</span>
            </div>

            {/* Filter Source */}
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as any)}
              className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer outline-none focus:border-[#3E4A35]"
            >
              <option value="all">Tutti i Registri</option>
              <option value="deadlines">Scadenziario Bordo</option>
              <option value="maintenance">Manutenzione Cellula</option>
            </select>

            {/* Filter Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer outline-none focus:border-[#3E4A35]"
            >
              <option value="all">Tutti gli Stati</option>
              <option value="completed">Eseguiti / Fatti</option>
              <option value="pending">In Attesa</option>
            </select>

            {/* Sorting Toggle */}
            <button
              onClick={() => setIsDescending(!isDescending)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>{isDescending ? 'Più recenti' : 'Più vecchi'}</span>
            </button>
          </div>
        </div>

        {/* Content Display (Responsive Table) */}
        {sortedItems.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/20">
            <Info className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Nessun lavoro o manutenzione corrispondente ai filtri impostati.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-wider">
                  <th className="py-3 px-2">Data</th>
                  <th className="py-3 px-2">Registro</th>
                  <th className="py-3 px-2">Titolo Lavoro / Intervento</th>
                  <th className="py-3 px-2 text-center">Stato</th>
                  <th className="py-3 px-2">Costo ({getCurrencySymbol(settings)})</th>
                  <th className="py-3 px-2">Chilometri ({getDistanceUnit(settings)})</th>
                  <th className="py-3 px-2 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {sortedItems.map((item) => {
                  return (
                    <tr 
                      key={`${item.source}-${item.id}`} 
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors text-xs ${item.done ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-slate-100 font-medium'}`}
                    >
                      {/* Date (Editable Input) */}
                      <td className="py-3 px-2 whitespace-nowrap">
                        <input
                          type="date"
                          value={item.date}
                          onChange={(e) => handleUpdateItem(item.id, item.source, 'date', e.target.value)}
                          className="px-2 py-0.5 rounded text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#3E4A35]"
                        />
                      </td>

                      {/* Source Badge */}
                      <td className="py-3 px-2 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          item.source === 'deadlines' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                            : 'bg-stone-50 text-stone-700 border border-stone-200'
                        }`}>
                          {item.source === 'deadlines' ? 'Scadenziario' : 'Cella & Impianti'}
                        </span>
                      </td>

                      {/* Title & Notes */}
                      <td className="py-3 px-2 min-w-[200px] max-w-[300px]">
                        <div>
                          <div className={`font-bold text-slate-800 dark:text-slate-100 ${item.done ? '' : 'text-[#3E4A35]'}`}>{item.title}</div>
                          {item.notes && <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate" title={item.notes}>{item.notes}</div>}
                        </div>
                      </td>

                      {/* Done Status */}
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => handleUpdateItem(item.id, item.source, 'done', !item.done)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black transition-colors ${
                            item.done 
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          }`}
                          title="Fai click per cambiare lo stato di completamento"
                        >
                          {item.done ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Fatto
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
                              Da fare
                            </>
                          )}
                        </button>
                      </td>

                      {/* Cost Input */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <span className="text-[10px] text-slate-300">{getCurrencySymbol(settings)}</span>
                          <input
                            type="number"
                            value={item.cost !== undefined ? item.cost : ''}
                            onChange={(e) => handleUpdateItem(item.id, item.source, 'cost', e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder="--"
                            className="w-16 px-1.5 py-0.5 rounded text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none text-center focus:border-[#3E4A35] font-mono font-bold"
                          />
                        </div>
                      </td>

                      {/* Kilometers Input */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={item.km !== undefined ? item.km : ''}
                            onChange={(e) => handleUpdateItem(item.id, item.source, 'km', e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder="--"
                            className="w-20 px-1.5 py-0.5 rounded text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none text-center focus:border-[#3E4A35] font-mono font-bold"
                          />
                          <span className="text-[9px] text-slate-400 font-bold uppercase">{getDistanceUnit(settings)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => handleDeleteItem(item.id, item.source)}
                          className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                          title="Elimina permanentemente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
      
    </div>
  );
}
