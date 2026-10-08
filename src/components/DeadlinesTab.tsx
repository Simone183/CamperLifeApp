/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAppSettings } from '../useAppSettings';
import { getCurrencySymbol, getDistanceUnit } from '../unit-helpers';
import { Deadline } from '../types';
import { Calendar, CheckCircle2, AlertTriangle, Clock, Plus, Trash2, ShieldCheck, DollarSign, RefreshCw, Gauge } from 'lucide-react';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { sanitizeForFirestore } from "../utils/firestoreHelper";
import { playAlertSound } from '../utils/soundHelper';
import { INITIAL_DEADLINES } from '../data/mockData';

interface DeadlinesTabProps {
  deadlines?: Deadline[];
  setDeadlines?: React.Dispatch<React.SetStateAction<Deadline[]>>;
}

export function getVehicleCurrentOdometer(): number {
  try {
    const savedTrips = localStorage.getItem('camper_trips');
    let maxOdo = 0;
    if (savedTrips) {
      const trips = JSON.parse(savedTrips);
      if (Array.isArray(trips)) {
        trips.forEach((t: any) => {
          if (t.endOdometer && Number(t.endOdometer) > maxOdo) maxOdo = Number(t.endOdometer);
          if (t.startOdometer && Number(t.startOdometer) > maxOdo) maxOdo = Number(t.startOdometer);
          if (Array.isArray(t.movements)) {
            t.movements.forEach((m: any) => {
              if (m.odometer && Number(m.odometer) > maxOdo) maxOdo = Number(m.odometer);
            });
          }
          if (Array.isArray(t.expenses)) {
            t.expenses.forEach((e: any) => {
              if (e.odometer && Number(e.odometer) > maxOdo) maxOdo = Number(e.odometer);
            });
          }
        });
      }
    }
    const savedFuel = localStorage.getItem('camper_fuel_logs');
    if (savedFuel) {
      const logs = JSON.parse(savedFuel);
      if (Array.isArray(logs)) {
        logs.forEach((l: any) => {
          if (l.odometerKm && Number(l.odometerKm) > maxOdo) maxOdo = Number(l.odometerKm);
        });
      }
    }
    const savedOdo = localStorage.getItem('camper_current_odometer');
    if (savedOdo && Number(savedOdo) > maxOdo) {
      maxOdo = Number(savedOdo);
    }
    return maxOdo;
  } catch (e) {
    return 0;
  }
}

export function calculateNextDeadline(
  item: Deadline,
  completionDateStr?: string,
  completionKmNum?: number
): { nextDueDate: string; nextKm?: number } {
  const baseDateStr = completionDateStr || new Date().toISOString().split('T')[0];
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const baseDate = new Date(y, (m || 1) - 1, d || 1);

  let nextDueDate = item.dueDate;
  if (item.repeatMonths && item.repeatMonths > 0) {
    const nextDate = new Date(baseDate);
    nextDate.setMonth(nextDate.getMonth() + item.repeatMonths);
    const nextY = nextDate.getFullYear();
    const nextM = String(nextDate.getMonth() + 1).padStart(2, '0');
    const nextD = String(nextDate.getDate()).padStart(2, '0');
    nextDueDate = `${nextY}-${nextM}-${nextD}`;
  }

  let nextKm = item.km;
  if (item.repeatKm && item.repeatKm > 0) {
    const currentOdo = (completionKmNum && completionKmNum > 0) ? completionKmNum : (item.km || getVehicleCurrentOdometer());
    nextKm = currentOdo + item.repeatKm;
  }

  return { nextDueDate, nextKm };
}

export function saveCompletedToMaintenanceHistory(log: { title: string; date: string; cost?: number; km?: number; notes?: string; category?: string }) {
  try {
    const saved = localStorage.getItem('camper_maintenance_logs');
    const logs = saved ? JSON.parse(saved) : [];
    const newEntry = {
      id: `mt_auto_${Date.now()}`,
      title: log.title,
      date: log.date,
      cost: log.cost,
      km: log.km,
      category: log.category || 'Manutenzione',
      notes: log.notes ? `[Rinnovo Scadenza] ${log.notes}` : '[Rinnovo Scadenza Programmata]'
    };
    const updated = [newEntry, ...(Array.isArray(logs) ? logs : [])];
    localStorage.setItem('camper_maintenance_logs', JSON.stringify(updated));
  } catch (e) {
    console.error("Error saving completed maintenance history:", e);
  }
}

export function sanitizeDeadlines(items: Deadline[]): Deadline[] {
  if (!Array.isArray(items) || items.length === 0) return INITIAL_DEADLINES;
  return items.filter(Boolean).map(item => {
    let title = item.title || "";
    if (title.toLowerCase().includes("fiat ducato")) {
      title = "Sostituzione Filtri e Tagliando";
    }
    const cleaned: any = { ...item, title };
    if (cleaned.price === undefined || cleaned.price === null || isNaN(cleaned.price)) {
      delete cleaned.price;
    }
    if (cleaned.km === undefined || cleaned.km === null || isNaN(cleaned.km)) {
      delete cleaned.km;
    }
    if (cleaned.notes === undefined || cleaned.notes === null) {
      delete cleaned.notes;
    }
    return cleaned as Deadline;
  });
}

export default function DeadlinesTab({ deadlines: propDeadlines, setDeadlines: propSetDeadlines }: DeadlinesTabProps = {}) {
  const settings = useAppSettings();
  const [localDeadlines, setLocalDeadlines] = React.useState<Deadline[]>(() => {
    try {
      const saved = localStorage.getItem("camper_deadlines");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return sanitizeDeadlines(parsed);
      }
    } catch (e) {
      console.error("Error reading camper_deadlines:", e);
    }
    return INITIAL_DEADLINES;
  });

  const deadlines = sanitizeDeadlines(propDeadlines !== undefined ? propDeadlines : localDeadlines);
  const setDeadlines = propSetDeadlines !== undefined ? propSetDeadlines : setLocalDeadlines;
  const [filter, setFilter] = React.useState<'all' | 'pending' | 'urgent' | 'completed'>('all');
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [loadedFromFirestore, setLoadedFromFirestore] = React.useState(false);

  // Current vehicle odometer dynamically updated
  const currentOdometer = getVehicleCurrentOdometer();

  // Firestore sync
  React.useEffect(() => {
    const docRef = doc(db, "user_data", "deadlines");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.deadlines) {
          const sanitized = sanitizeDeadlines(data.deadlines);
          setDeadlines(sanitized);
          if (JSON.stringify(sanitized) !== JSON.stringify(data.deadlines)) {
            const cloudPayload = sanitizeForFirestore({ deadlines: sanitized });
            setDoc(docRef, cloudPayload, { merge: true }).catch(() => {});
          }
        }
      }
      setLoadedFromFirestore(true);
    });
    return unsubscribe;
  }, [setDeadlines]);

  React.useEffect(() => {
    if (!loadedFromFirestore) return;
    const docRef = doc(db, "user_data", "deadlines");
    const cloudPayload = sanitizeForFirestore({ deadlines });
    setDoc(docRef, cloudPayload, { merge: true }).catch(err => {
      console.error("Error saving deadlines to Firestore:", err);
    });
    try {
      localStorage.setItem("camper_deadlines", JSON.stringify(deadlines));
    } catch (e) {}
  }, [deadlines, loadedFromFirestore]);

  // New item form state
  const [title, setTitle] = React.useState('');
  const [category, setCategory] = React.useState<Deadline['category']>('Manutenzione');
  const [dueDate, setDueDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [km, setKm] = React.useState('');
  const [kmThreshold, setKmThreshold] = React.useState('');
  const [recurringType, setRecurringType] = React.useState<'none' | 'time' | 'km' | 'both'>('none');
  const [repeatMonths, setRepeatMonths] = React.useState('');
  const [repeatKm, setRepeatKm] = React.useState('');

  const toggleDone = (id: string) => {
    const target = deadlines.find(d => d.id === id);
    if (!target) return;

    if (!target.done) {
      const todayStr = new Date().toISOString().split('T')[0];
      const currentOdo = getVehicleCurrentOdometer() || target.km || 0;

      const isRecurring = target.recurringType === 'time' || target.recurringType === 'km' || target.recurringType === 'both' || (target.repeatMonths && target.repeatMonths > 0) || (target.repeatKm && target.repeatKm > 0);

      if (isRecurring) {
        const { nextDueDate, nextKm } = calculateNextDeadline(target, todayStr, currentOdo);

        // 1. Save completed job into Maintenance Log history
        saveCompletedToMaintenanceHistory({
          title: target.title,
          date: todayStr,
          cost: target.price,
          km: currentOdo > 0 ? currentOdo : target.km,
          notes: target.notes,
          category: target.category
        });

        // 2. Automatically update deadline to next recurrence cycle
        setDeadlines(deadlines.map(d => {
          if (d.id === id) {
            return {
              ...d,
              dueDate: nextDueDate,
              km: nextKm,
              done: false, // Reset done for next recurrence cycle!
              lastCompletedDate: todayStr,
              lastCompletedKm: currentOdo > 0 ? currentOdo : target.km
            };
          }
          return d;
        }));

        try { playAlertSound(); } catch (e) {}
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { 
            message: `🔄 Lavoro completato e registrato nello storico! Prossima scadenza programmata per il ${nextDueDate}${nextKm ? ` (a ${nextKm.toLocaleString()} Km)` : ''}.` 
          }
        }));
        return;
      }
    }

    setDeadlines(deadlines.map(d => d.id === id ? { ...d, done: !d.done } : d));
  };

  const updateDueDate = (id: string, newDate: string) => {
    setDeadlines(deadlines.map(d => d.id === id ? { ...d, dueDate: newDate } : d));
  };

  const updatePrice = (id: string, newPrice: number | undefined) => {
    setDeadlines(deadlines.map(d => {
      if (d.id === id) {
        const item = { ...d };
        if (newPrice !== undefined && !isNaN(newPrice)) {
          item.price = newPrice;
        } else {
          delete item.price;
        }
        return item;
      }
      return d;
    }));
  };

  const updateKm = (id: string, newKm: number | undefined) => {
    setDeadlines(deadlines.map(d => {
      if (d.id === id) {
        const item = { ...d };
        if (newKm !== undefined && !isNaN(newKm)) {
          item.km = newKm;
        } else {
          delete item.km;
        }
        return item;
      }
      return d;
    }));
  };

  const removeDeadline = (id: string) => {
    setDeadlines(deadlines.filter(d => d.id !== id));
  };

  const handleEdit = (item: Deadline) => {
    setEditingId(item.id);
    setTitle(item.title);
    setCategory(item.category);
    setDueDate(item.dueDate);
    setNotes(item.notes || '');
    setPrice(item.price?.toString() || '');
    setKm(item.km?.toString() || '');
    setKmThreshold(item.kmThreshold?.toString() || '');
    setRecurringType(item.recurringType || (item.repeatMonths && item.repeatKm ? 'both' : item.repeatMonths ? 'time' : item.repeatKm ? 'km' : 'none'));
    setRepeatMonths(item.repeatMonths?.toString() || '');
    setRepeatKm(item.repeatKm?.toString() || '');
    setShowAddForm(true);
  };

  const handleAddDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    const parsedRepeatMonths = (recurringType === 'time' || recurringType === 'both') && repeatMonths ? parseInt(repeatMonths) : undefined;
    const parsedRepeatKm = (recurringType === 'km' || recurringType === 'both') && repeatKm ? parseInt(repeatKm) : undefined;

    if (editingId) {
      setDeadlines(deadlines.map(d => d.id === editingId ? {
        ...d,
        title: title.trim(),
        category,
        dueDate,
        notes: notes.trim() || undefined,
        price: price ? parseFloat(price) : undefined,
        km: km ? parseFloat(km) : undefined,
        kmThreshold: kmThreshold ? parseFloat(kmThreshold) : undefined,
        recurringType: recurringType !== 'none' ? recurringType : undefined,
        repeatMonths: parsedRepeatMonths,
        repeatKm: parsedRepeatKm,
      } : d));
      setEditingId(null);
    } else {
      const newItem: Deadline = {
        id: `d_${Date.now()}`,
        title: title.trim(),
        category,
        dueDate,
        done: false,
        notes: notes.trim() || undefined,
        price: price ? parseFloat(price) : undefined,
        km: km ? parseFloat(km) : undefined,
        kmThreshold: kmThreshold ? parseFloat(kmThreshold) : undefined,
        recurringType: recurringType !== 'none' ? recurringType : undefined,
        repeatMonths: parsedRepeatMonths,
        repeatKm: parsedRepeatKm,
      };
      setDeadlines([...deadlines, newItem]);
    }
    
    setTitle('');
    setDueDate('');
    setNotes('');
    setPrice('');
    setKm('');
    setKmThreshold('');
    setRecurringType('none');
    setRepeatMonths('');
    setRepeatKm('');
    setShowAddForm(false);
  };

  // Helper to calculate days remaining from today
  const getDaysRemaining = (dateStr: string) => {
    if (!dateStr) return 999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = dateStr.split('-').map(Number);
    const due = new Date(y, (m || 1) - 1, d || 1);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getUrgency = (deadline: Deadline) => {
    if (deadline.done) return 'completed';
    const days = getDaysRemaining(deadline.dueDate);
    const reminderDays = parseInt(settings.deadlineReminder || "15");

    let isKmUrgent = false;
    let isKmExpired = false;

    if (deadline.km && currentOdometer > 0) {
      const kmDiff = deadline.km - currentOdometer;
      if (kmDiff <= 0) isKmExpired = true;
      else if (kmDiff <= 1000) isKmUrgent = true;
    }

    if (days < 0 || isKmExpired) return 'expired';
    if (days <= reminderDays || isKmUrgent) return 'urgent';
    return 'safe';
  };

  const filteredDeadlines = deadlines.filter(d => {
    if (filter === 'completed') return d.done;
    if (filter === 'pending') return !d.done;
    if (filter === 'urgent') return !d.done && (getDaysRemaining(d.dueDate) <= parseInt(settings.deadlineReminder || "15") || (d.km && currentOdometer > 0 && d.km - currentOdometer <= 1000));
    return true; // all
  });

  const getCategoryColor = (cat: Deadline['category']) => {
    switch (cat) {
      case 'Revisione': return 'bg-[#A45C40]/15 text-[#A45C40] hover:bg-[#A45C40]/25';
      case 'Assicurazione': return 'bg-[#5A6B4E]/15 text-[#3E4A35] hover:bg-[#5A6B4E]/25';
      case 'Bollo': return 'bg-[#F2EFE9] dark:bg-slate-700 text-[#2D2926] dark:text-slate-100 border border-[#2D2926]/10 dark:border-slate-600 hover:bg-[#F2EFE9]/90 dark:hover:bg-slate-600';
      case 'Tubo gas': return 'bg-[#A45C40]/20 text-[#A45C40] hover:bg-[#A45C40]/30';
      default: return 'bg-[#3E4A35]/15 text-[#3E4A35] hover:bg-[#3E4A35]/25';
    }
  };

  const pendingCount = deadlines.filter(d => !d.done).length;
  const urgentCount = deadlines.filter(d => !d.done && (getDaysRemaining(d.dueDate) <= 30 || (d.km && currentOdometer > 0 && d.km - currentOdometer <= 1000))).length;

  return (
    <div className="space-y-6 font-sans">
      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total expenses */}
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Spesa Manutenzioni</h3>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {getCurrencySymbol(settings)}{(deadlines.filter(d => d.done && d.price).reduce((acc, curr) => acc + (curr.price || 0), 0)).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-400">Totale investito nei controlli salvati</p>
          </div>
        </div>

        {/* Deadlines coming */}
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scadenze in Arrivo</h3>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{pendingCount} da fare</p>
            <p className="text-[10px] text-slate-400">Revisioni, bolli e tagliandi da effettuare</p>
          </div>
        </div>

        {/* Urgent Alert */}
        <div className={`border rounded-2xl p-5 shadow-sm flex items-center gap-4 ${
          urgentCount > 0 ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-100 dark:border-rose-800 text-rose-900 dark:text-rose-100' : 'bg-emerald-50/50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
        }`}>
          <div className={`p-3 rounded-xl ${
            urgentCount > 0 ? 'bg-rose-100 dark:bg-rose-800 text-rose-600 dark:text-rose-200' : 'bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-200'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-bold opacity-65 uppercase tracking-wider">Allerta Critica</h3>
            <p className="text-2xl font-black mt-0.5">
              {urgentCount > 0 ? `${urgentCount} Urgente` : 'Nessuna Urgenza'}
            </p>
            <p className="text-[10px] opacity-75">
              {urgentCount > 0 ? 'Entro 30 giorni o alla soglia km!' : 'Tutti i controlli sono in regola!'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-5 border-b border-slate-50 dark:border-slate-700">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'all' ? 'bg-slate-800 dark:bg-slate-600 text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
              }`}
            >
              Tutte
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'pending' ? 'bg-[#5A6B4E] text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
              }`}
            >
              Da Fare ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('urgent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'urgent' ? 'bg-[#A45C40] text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
              }`}
            >
              Scadute / Urgenti ({urgentCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'completed' ? 'bg-[#3E4A35] dark:bg-emerald-700 text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
              }`}
            >
              Completate
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (confirm('Sei sicuro di voler ripristinare le scadenze standard? Attenzione: questa azione sovrascriverà le modifiche locali e sul Cloud.')) {
                  try {
                    for (let i = 0; i < localStorage.length; i++) {
                      const k = localStorage.key(i);
                      if (k && k.includes('camper_deadlines')) {
                        localStorage.removeItem(k);
                      }
                    }
                  } catch (e) {}
                  const docRef = doc(db, "user_data", "deadlines");
                  setDoc(docRef, { deadlines: INITIAL_DEADLINES }, { merge: false }).catch(() => {});
                  setDeadlines(INITIAL_DEADLINES);
                  window.dispatchEvent(new CustomEvent('show-toast', {
                    detail: { message: '🔄 Scadenze ripristinate con successo ai valori standard!' }
                  }));
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              Ripristina Default
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#3E4A35] dark:bg-emerald-700 hover:bg-[#5A6B4E] dark:hover:bg-emerald-600 active:bg-[#3E4A35] text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nuova Scadenza
            </button>
          </div>

        </div>

        {/* Add Form Container */}
        {showAddForm && (
          <form onSubmit={handleAddDeadline} className="mb-6 p-5 border border-[#5A6B4E]/20 bg-[#5A6B4E]/5 rounded-2xl space-y-4 animate-fade-in">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#3E4A35] dark:text-emerald-400" />
              {editingId ? 'Modifica Scadenza / Rinnovo' : 'Aggiungi Scadenza Camper con Rinnovo Automatico'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Titolo Scadenza *</label>
                <input
                  type="text"
                  required
                  placeholder="Es: Tagliando, Bollo, Revisione..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#3E4A35] rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Categoria *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Deadline['category'])}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#3E4A35] rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200"
                >
                  <option value="Manutenzione">Manutenzione</option>
                  <option value="Revisione">Revisione</option>
                  <option value="Assicurazione">Assicurazione</option>
                  <option value="Bollo">Bollo</option>
                  <option value="Tubo gas">Tubo gas</option>
                  <option value="Controllo infiltrazioni e sigillature">Controllo infiltrazioni e sigillature</option>
                  <option value="Sostituzione Filtri e Tagliando">Sostituzione Filtri e Tagliando</option>
                  <option value="Sostituzione Pneumatici">Sostituzione Pneumatici</option>
                  <option value="Kit frizione">Kit frizione</option>
                  <option value="Kit distribuzione completa">Kit distribuzione completa</option>
                  <option value="Pulizia riscaldamento cellula">Pulizia riscaldamento cellula</option>
                  <option value="Pulizia bruciatore frigo">Pulizia bruciatore frigo</option>
                  <option value="Controllo guarnizioni oblo e finestre">Controllo guarnizioni oblo e finestre</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Prossima Data Scadenza *</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#3E4A35] rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-500 mb-1">Note Aggiuntive</label>
                <input
                  type="text"
                  placeholder="Es: Ricambio acquistato, note officina..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#3E4A35] rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Prezzo Presunto ({getCurrencySymbol(settings)})</label>
                <input
                  type="number"
                  placeholder="Es: 150"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#3E4A35] rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Soglia Target Km ({getDistanceUnit(settings)})</label>
                <input
                  type="number"
                  placeholder="Es: 60000"
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#3E4A35] rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Recurrence & Auto-Renewal Configurator */}
              <div className="md:col-span-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-black uppercase text-[#3E4A35] dark:text-emerald-400 flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-[#3E4A35] dark:text-emerald-400" />
                    Rinnovo Automatico & Ricorrenza (Ripeti Scadenza)
                  </label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Quando clicchi "Segna come fatta", ricalcola da sola la prossima data o chilometraggio!</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'none', label: 'Nessuna (Singola)' },
                    { id: 'time', label: 'A Tempo (Ogni X Mesi)' },
                    { id: 'km', label: 'Chilometrica (Ogni X Km)' },
                    { id: 'both', label: 'Entrambe (Tempo + Km)' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setRecurringType(opt.id as any)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                        recurringType === opt.id 
                          ? 'bg-[#3E4A35] dark:bg-emerald-700 text-white border-[#3E4A35] dark:border-emerald-600 shadow-xs' 
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {(recurringType === 'time' || recurringType === 'both') && (
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-200/50 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-200">
                        ✍️ Imposta Intervallo di Tempo Personalizzato (Inserisci Mesi Manualmente)
                      </label>
                      {repeatMonths && parseInt(repeatMonths) > 0 && (
                        <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-300 shrink-0">
                          Rinnovo impostato a {repeatMonths} {parseInt(repeatMonths) === 1 ? 'Mese' : 'Mesi'} {parseInt(repeatMonths) >= 12 ? `(${(parseInt(repeatMonths) / 12).toFixed(1)} Anni)` : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="120"
                          placeholder="Es: 4 (per 4 mesi)"
                          value={repeatMonths}
                          onChange={(e) => setRepeatMonths(e.target.value)}
                          className="w-36 px-3 py-2 border-2 border-emerald-500/50 dark:border-emerald-600/50 outline-none focus:border-emerald-600 rounded-xl bg-white dark:bg-slate-800 text-xs font-mono font-extrabold text-slate-800 dark:text-slate-100 shadow-xs"
                        />
                        <span className="text-xs font-black text-slate-500">Mesi</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Preimpostazioni rapide:</span>
                        {[
                          { label: '4 Mesi', value: '4' },
                          { label: '6 Mesi', value: '6' },
                          { label: '1 Anno (12m)', value: '12' },
                          { label: '2 Anni (24m)', value: '24' },
                          { label: '3 Anni (36m)', value: '36' },
                          { label: '5 Anni (60m)', value: '60' },
                        ].map(p => (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => setRepeatMonths(p.value)}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                              repeatMonths === p.value
                                ? 'bg-emerald-600 text-white border-emerald-600 font-black shadow-2xs'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {(recurringType === 'km' || recurringType === 'both') && (
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-200/50 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-200">
                        ✍️ Imposta Intervallo Chilometrico Personalizzato (Inserisci Km Manualmente)
                      </label>
                      {repeatKm && parseInt(repeatKm) > 0 && (
                        <span className="text-[10px] font-black text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded-md border border-blue-300 shrink-0">
                          Rinnovo ogni {Number(repeatKm).toLocaleString()} Km
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="100"
                          step="100"
                          placeholder="Es: 12000 (per 12.000 Km)"
                          value={repeatKm}
                          onChange={(e) => setRepeatKm(e.target.value)}
                          className="w-44 px-3 py-2 border-2 border-blue-500/50 dark:border-blue-600/50 outline-none focus:border-blue-600 rounded-xl bg-white dark:bg-slate-800 text-xs font-mono font-extrabold text-slate-800 dark:text-slate-100 shadow-xs"
                        />
                        <span className="text-xs font-black text-slate-500">Km</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Preimpostazioni rapide:</span>
                        {[
                          { label: '7.500 Km', value: '7500' },
                          { label: '10.000 Km', value: '10000' },
                          { label: '12.000 Km', value: '12000' },
                          { label: '15.000 Km (Tagliando)', value: '15000' },
                          { label: '20.000 Km', value: '20000' },
                          { label: '30.000 Km', value: '30000' },
                          { label: '100.000 Km', value: '100000' },
                        ].map(p => (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => setRepeatKm(p.value)}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                              repeatKm === p.value
                                ? 'bg-blue-600 text-white border-blue-600 font-black shadow-2xs'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#3E4A35] dark:bg-emerald-700 hover:bg-[#5A6B4E] text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer"
              >
                {editingId ? 'Salva Modifiche Scadenza' : 'Salva Scadenza col Rinnovo'}
              </button>
            </div>
          </form>
        )}

        {/* Deadlines List */}
        {filteredDeadlines.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <ShieldCheck className="w-12 h-12 text-[#3E4A35] dark:text-emerald-400 mx-auto mb-3 opacity-80" />
            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Nessuna scadenza trovata</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Non ci sono scadenze per i filtri selezionati. Aggiungi i bolli, la revisione e i tagliandi del camper per ricevere gli avvisi automatici!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDeadlines.map((item) => {
              const urgency = getUrgency(item);
              const days = getDaysRemaining(item.dueDate);

              return (
                <div
                  key={item.id}
                  className={`border rounded-2xl p-4 transition-all relative ${
                    item.done
                      ? 'border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50'
                      : urgency === 'expired'
                      ? 'border-rose-200 dark:border-rose-900 bg-rose-50/10 dark:bg-rose-950'
                      : urgency === 'urgent'
                      ? 'border-amber-200 dark:border-amber-800 bg-amber-50/10 dark:bg-amber-950'
                      : 'border-slate-150 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getCategoryColor(item.category)}`}>
                      {item.category}
                    </span>

                    {/* Badge for time left */}
                    {!item.done && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        urgency === 'expired'
                          ? 'bg-rose-100 dark:bg-rose-800 text-rose-700 dark:text-rose-200'
                          : urgency === 'urgent'
                          ? 'bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200 font-extrabold'
                          : 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200'
                      }`}>
                        {days < 0 ? `Scaduta da ${Math.abs(days)}g` : days === 0 ? 'Oggi!' : `Mancano ${days}g`}
                      </span>
                    )}
                  </div>

                  <h4 className={`font-bold mt-2.5 text-slate-800 dark:text-slate-100 text-sm ${item.done ? 'line-through opacity-50' : ''}`}>
                    {item.title}
                  </h4>

                  {item.notes && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed italic pr-4">
                      {item.notes}
                    </p>
                  )}

                  {/* Recurrence & Last Completed Badges */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                    {item.repeatMonths && (
                      <span className="px-2 py-0.5 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded-md text-[10px] font-bold flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 text-sky-500" />
                        Rinnovo: ogni {item.repeatMonths === 12 ? '1 Anno' : item.repeatMonths === 24 ? '2 Anni' : item.repeatMonths === 60 ? '5 Anni' : `${item.repeatMonths} mesi`}
                      </span>
                    )}

                    {item.repeatKm && (
                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md text-[10px] font-bold flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-indigo-500" />
                        Ogni {item.repeatKm.toLocaleString()} Km
                      </span>
                    )}

                    {item.lastCompletedDate && (
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md text-[10px] font-medium flex items-center gap-1">
                        ✓ Ultimo: {item.lastCompletedDate} {item.lastCompletedKm ? `(${item.lastCompletedKm.toLocaleString()} km)` : ''}
                      </span>
                    )}

                    {item.km && currentOdometer > 0 && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                        item.km - currentOdometer <= 0
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-300'
                          : item.km - currentOdometer <= 1000
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {item.km - currentOdometer <= 0
                          ? `🚨 Superato di ${Math.abs(item.km - currentOdometer).toLocaleString()} km`
                          : `Mancano ${(item.km - currentOdometer).toLocaleString()} km`
                        }
                      </span>
                    )}
                  </div>

                  {/* Price & Km info (fully editable) */}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 items-center text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Costo ({getCurrencySymbol(settings)}):</span>
                      <input
                        type="number"
                        value={item.price !== undefined ? item.price : ''}
                        onChange={(e) => updatePrice(item.id, e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="--"
                        className="w-16 text-[10px] text-slate-700 dark:text-slate-300 font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 outline-none focus:border-[#3E4A35]"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Soglia Km:</span>
                      <input
                        type="number"
                        value={item.km !== undefined ? item.km : ''}
                        onChange={(e) => updateKm(item.id, e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="--"
                        className="w-20 text-[10px] text-slate-700 dark:text-slate-300 font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 outline-none focus:border-[#3E4A35]"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100/60 dark:border-slate-700/60 w-full overflow-hidden">
                    <button
                      onClick={() => toggleDone(item.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        item.done
                          ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-[#3E4A35] dark:bg-emerald-700 text-white hover:bg-[#5A6B4E] dark:hover:bg-emerald-600 shadow-sm'
                      }`}
                    >
                      {item.done ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          Effettuata
                        </>
                      ) : (
                        'Segna come fatta'
                      )}
                    </button>

                    <div className="flex flex-wrap items-center gap-2 max-w-full">
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5 shrink-0">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold shrink-0">Scade:</span>
                        <input
                          type="date"
                          value={item.dueDate}
                          onChange={(e) => updateDueDate(item.id, e.target.value)}
                          className="text-[10px] text-slate-600 dark:text-slate-300 font-mono font-medium bg-transparent outline-none max-w-[110px] focus:border-[#3E4A35]"
                        />
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0 bg-slate-50/80 dark:bg-slate-900/80 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors cursor-pointer shrink-0"
                          title="Modifica"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeDeadline(item.id)}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950 transition-colors cursor-pointer shrink-0"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
