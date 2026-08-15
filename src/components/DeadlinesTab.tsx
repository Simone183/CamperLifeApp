/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAppSettings } from '../useAppSettings';
import { getCurrencySymbol, getDistanceUnit } from '../unit-helpers';
import { Deadline } from '../types';
import { Calendar, CheckCircle2, AlertTriangle, Clock, Plus, Trash2, ShieldCheck, DollarSign } from 'lucide-react';

interface DeadlinesTabProps {
  deadlines?: Deadline[];
  setDeadlines?: React.Dispatch<React.SetStateAction<Deadline[]>>;
}

export default function DeadlinesTab({ deadlines: propDeadlines, setDeadlines: propSetDeadlines }: DeadlinesTabProps = {}) {
  const settings = useAppSettings();
  const [localDeadlines, setLocalDeadlines] = React.useState<Deadline[]>(() => {
    try {
      const saved = localStorage.getItem("camper_deadlines");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Error reading camper_deadlines:", e);
    }
    return [];
  });

  const deadlines = propDeadlines !== undefined ? propDeadlines : localDeadlines;
  const setDeadlines = propSetDeadlines !== undefined ? propSetDeadlines : setLocalDeadlines;
  const [filter, setFilter] = React.useState<'all' | 'pending' | 'urgent' | 'completed'>('all');
  const [showAddForm, setShowAddForm] = React.useState(false);

  // New item form state
  const [title, setTitle] = React.useState('');
  const [category, setCategory] = React.useState<Deadline['category']>('Manutenzione');
  const [dueDate, setDueDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [km, setKm] = React.useState('');

  const toggleDone = (id: string) => {
    setDeadlines(deadlines.map(d => d.id === id ? { ...d, done: !d.done } : d));
  };

  const updateDueDate = (id: string, newDate: string) => {
    setDeadlines(deadlines.map(d => d.id === id ? { ...d, dueDate: newDate } : d));
  };

  const updatePrice = (id: string, newPrice: number | undefined) => {
    setDeadlines(deadlines.map(d => d.id === id ? { ...d, price: newPrice } : d));
  };

  const updateKm = (id: string, newKm: number | undefined) => {
    setDeadlines(deadlines.map(d => d.id === id ? { ...d, km: newKm } : d));
  };

  const removeDeadline = (id: string) => {
    setDeadlines(deadlines.filter(d => d.id !== id));
  };

  const handleAddDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    const newItem: Deadline = {
      id: `d_${Date.now()}`,
      title: title.trim(),
      category,
      dueDate,
      done: false,
      notes: notes.trim() || undefined,
      price: price ? parseFloat(price) : undefined,
      km: km ? parseFloat(km) : undefined,
    };

    setDeadlines([...deadlines, newItem]);
    setTitle('');
    setDueDate('');
    setNotes('');
    setPrice('');
    setKm('');
    setShowAddForm(false);
  };

  // Helper to calculate days remaining
  const getDaysRemaining = (dateStr: string) => {
    const today = new Date('2026-06-15'); // Using current context date as pivot
    const due = new Date(dateStr);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgency = (deadline: Deadline) => {
    if (deadline.done) return 'completed';
    const days = getDaysRemaining(deadline.dueDate);
    const reminderDays = parseInt(settings.deadlineReminder || "15");
    if (days < 0) return 'expired';
    if (days <= reminderDays) return 'urgent';
    return 'safe';
  };

  const filteredDeadlines = deadlines.filter(d => {
    if (filter === 'completed') return d.done;
    if (filter === 'pending') return !d.done;
    if (filter === 'urgent') return !d.done && getDaysRemaining(d.dueDate) <= parseInt(settings.deadlineReminder || "15");
    return true; // all
  });

  const getCategoryColor = (cat: Deadline['category']) => {
    switch (cat) {
      case 'Revisione': return 'bg-[#A45C40]/15 text-[#A45C40] hover:bg-[#A45C40]/25';
      case 'Assicurazione': return 'bg-[#5A6B4E]/15 text-[#3E4A35] hover:bg-[#5A6B4E]/25';
      case 'Bollo': return 'bg-[#F2EFE9] dark:bg-slate-700 text-[#2D2926] dark:text-slate-100 border border-[#2D2926]/10 dark:border-slate-600 hover:bg-[#F2EFE9]/90 dark:hover:bg-slate-600';
      case 'Bombole Gas': return 'bg-[#A45C40]/20 text-[#A45C40] hover:bg-[#A45C40]/30';
      default: return 'bg-[#3E4A35]/15 text-[#3E4A35] hover:bg-[#3E4A35]/25';
    }
  };

  const pendingCount = deadlines.filter(d => !d.done).length;
  const urgentCount = deadlines.filter(d => !d.done && getDaysRemaining(d.dueDate) <= 30).length;

  return (
    <div className="space-y-6">
      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total expenses */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Spesa Manutenzioni</h3>
            <p className="text-2xl font-black text-slate-800 mt-0.5">
              {getCurrencySymbol(settings)}{deadlines.filter(d => d.done && d.price).reduce((acc, curr) => acc + (curr.price || 0), 0)}
            </p>
            <p className="text-[10px] text-slate-400">Totale investito nei controlli salvati</p>
          </div>
        </div>

        {/* Deadlines coming */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scadenze in Arrivo</h3>
            <p className="text-2xl font-black text-slate-800 mt-0.5">{pendingCount} da fare</p>
            <p className="text-[10px] text-slate-400">Revisioni ed adempimenti stradali</p>
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
              {urgentCount > 0 ? 'Entro i prossimi 30 giorni!' : 'Tutti i controlli sono in regola!'}
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

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#3E4A35] dark:bg-emerald-700 hover:bg-[#5A6B4E] dark:hover:bg-emerald-600 active:bg-[#3E4A35] text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nuova Scadenza
          </button>
        </div>

        {/* Add Form Container */}
        {showAddForm && (
          <form onSubmit={handleAddDeadline} className="mb-6 p-5 border border-[#5A6B4E]/20 bg-[#5A6B4E]/5 rounded-2xl space-y-4 animate-fade-in">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#3E4A35]" />
              Aggiungi Scadenza Camper
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Titolo Scadenza *</label>
                <input
                  type="text"
                  required
                  placeholder="Es: Ricarica climatizzatore cabina"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 outline-none focus:border-[#3E4A35] rounded-xl bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Categoria *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Deadline['category'])}
                  className="w-full px-3 py-2 border border-slate-200 outline-none focus:border-[#3E4A35] rounded-xl bg-white text-sm text-slate-700"
                >
                  <option value="Manutenzione">Manutenzione</option>
                  <option value="Revisione">Revisione</option>
                  <option value="Assicurazione">Assicurazione</option>
                  <option value="Bollo">Bollo</option>
                  <option value="Bombole Gas">Bombole Gas</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Data Scadenza *</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 outline-none focus:border-[#3E4A35] rounded-xl bg-white text-sm"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-500 mb-1">Note Aggiuntive</label>
                <input
                  type="text"
                  placeholder="Es: Ricambio acquistato..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 outline-none focus:border-[#3E4A35] rounded-xl bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Prezzo Speso ({getCurrencySymbol(settings)})</label>
                <input
                  type="number"
                  placeholder="Es: 150"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 outline-none focus:border-[#3E4A35] rounded-xl bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Chilometraggio ({getDistanceUnit(settings)})</label>
                <input
                  type="number"
                  placeholder="Es: 45000"
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 outline-none focus:border-[#3E4A35] rounded-xl bg-white text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white rounded-xl font-bold text-xs shadow-sm"
              >
                Salva Scadenza
              </button>
            </div>
          </form>
        )}

        {/* Deadlines List */}
        {filteredDeadlines.length === 0 ? (
          <div className="text-center py-10">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">Nessuna scadenza trovata in questa categoria.</p>
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
                      <span className="text-[10px] uppercase font-bold text-slate-400">Km effettuati:</span>
                      <input
                        type="number"
                        value={item.km !== undefined ? item.km : ''}
                        onChange={(e) => updateKm(item.id, e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="--"
                        className="w-20 text-[10px] text-slate-700 dark:text-slate-300 font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 outline-none focus:border-[#3E4A35]"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100/60 dark:border-slate-700/60">
                    <button
                      onClick={() => toggleDone(item.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        item.done
                          ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-[#3E4A35] dark:bg-emerald-700 text-white hover:bg-[#5A6B4E] dark:hover:bg-emerald-600 shadow-sm'
                      }`}
                    >
                      {item.done ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          Effettuata
                        </>
                      ) : (
                        'Segna come fatta'
                      )}
                    </button>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Scade:</span>
                        <input
                          type="date"
                          value={item.dueDate}
                          onChange={(e) => updateDueDate(item.id, e.target.value)}
                          className="text-[10px] text-slate-600 dark:text-slate-300 font-mono font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 outline-none focus:border-[#3E4A35]"
                        />
                      </div>
                      <button
                        onClick={() => removeDeadline(item.id)}
                        className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
