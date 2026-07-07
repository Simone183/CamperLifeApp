/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChecklistItem } from '../types';
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  CheckCircle, 
  RotateCcw, 
  Sparkles, 
  Loader2, 
  Brain,
  Wand2,
  Info
} from 'lucide-react';
import { useFirestoreSync } from '../lib/firestoreSync';

export default function ChecklistTab() {
  const [items, setItems] = useFirestoreSync<ChecklistItem[]>("user_data", "checklist", []);
  const [newItemText, setNewItemText] = React.useState('');
  const [newCategory, setNewCategory] = React.useState<ChecklistItem['category']>('Partenza');

  const categories: Array<ChecklistItem['category']> = ['Partenza', 'Sosta', 'Sicurezza', 'Alimentari & Cucina'];

  // AI Checklist Generator states
  const [destType, setDestType] = React.useState('Montagna 🏔️');
  const [season, setSeason] = React.useState('Estate ☀️');
  const [crew, setCrew] = React.useState('Coppia 👩‍❤️‍👨');
  const [parkingStyle, setParkingStyle] = React.useState('Misto');
  const [notes, setNotes] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [generatedItems, setGeneratedItems] = React.useState<Array<{ text: string; category: ChecklistItem['category']; selected: boolean }>>([]);

  const destOptions = [
    { label: 'Montagna 🏔️ (Neve, Pesi, Altitudine)', value: 'Montagna 🏔️' },
    { label: 'Mare / Spiaggia 🌊 (Caldo, Sabbia, Sale)', value: 'Mare / Spiaggia 🌊' },
    { label: 'Città d’Arte 🏛️ (ZTL, Manovre strette)', value: 'Città d’Arte 🏛️' },
    { label: 'Lago & Natura 🌲 (Umidità, Insetti)', value: 'Lago & Natura 🌲' },
    { label: 'Estero / Lungo Raggio 🗺️ (Documenti, Pedaggi)', value: 'Estero / Lungo Raggio 🗺️' }
  ];

  const seasonOptions = [
    { label: 'Inverno Rigido ❄️', value: 'Inverno ❄️' },
    { label: 'Estate Calda ☀️', value: 'Estate ☀️' },
    { label: 'Primavera/Autunno 🍂', value: 'Primavera/Autunno 🍂' }
  ];

  const crewOptions = [
    { label: 'Solo / In Coppia 👩‍❤️‍👨', value: 'Solo / Coppia 👩‍❤️‍👨' },
    { label: 'Famiglia con Bambini 👨‍👩‍👧‍👦', value: 'Famiglia con Bambini 👨‍👩‍👧‍👦' },
    { label: 'Con Animali Domestici 🐶', value: 'Con Animali Domestici 🐶' }
  ];

  const parkingOptions = [
    { label: 'Sosta Libera / Off-Grid 🏕️', value: 'Sosta Libera / Off-Grid' },
    { label: 'Aree Sosta e Campeggi 🔌', value: 'Campeggi / Aree Attrezzate' },
    { label: 'Misto / Avventura 🗺️', value: 'Misto' }
  ];

  const toggleCheck = (id: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setItems(updated);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    const newItem: ChecklistItem = {
      id: `c_${Date.now()}`,
      text: newItemText.trim(),
      category: newCategory,
      checked: false,
    };

    setItems([...items, newItem]);
    setNewItemText('');
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const [showResetConfirm, setShowResetConfirm] = React.useState(false);

  const handleResetChecklist = () => {
    setShowResetConfirm(true);
  };

  const confirmResetChecklist = () => {
    const reset = items.map(item => ({ ...item, checked: false }));
    setItems(reset);
    setShowResetConfirm(false);
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: '🔄 Tutte le spunte della checklist sono state azzerate con successo!' }
    }));
  };

  const handleGenerateAI = async () => {
    setLoading(true);
    setGeneratedItems([]);
    try {
      const res = await fetch('/api/generate-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationType: destType,
          season,
          crew,
          parkingStyle,
          additionalNotes: notes
        })
      });
      const data = await res.json();
      if (data.success && data.items) {
        setGeneratedItems(data.items.map((item: any) => ({ ...item, selected: true })));
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { message: '🪄 Checklist personalizzata generata con successo!' }
        }));
      } else {
        alert(data.error || 'Errore imprevisto durante la generazione.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Errore di connessione: impossibile generare la checklist.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportSelected = (mode: 'append' | 'replace') => {
    const selectedItemsToImport = generatedItems
      .filter((item) => item.selected)
      .map((item, index) => ({
        id: `c_ai_${Date.now()}_${index}`,
        text: item.text,
        category: item.category,
        checked: false,
      }));

    if (selectedItemsToImport.length === 0) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: '⚠️ Seleziona almeno un elemento da importare!' }
      }));
      return;
    }

    if (mode === 'replace') {
      setItems(selectedItemsToImport);
    } else {
      setItems([...items, ...selectedItemsToImport]);
    }

    setGeneratedItems([]);
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: `✅ Importati ${selectedItemsToImport.length} controlli personalizzati!` }
    }));
  };

  // Group by category
  const getItemsByCat = (cat: ChecklistItem['category']) => {
    return items.filter((item) => item.category === cat);
  };

  const total = items.length;
  const completed = items.filter((i) => i.checked).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-gradient-to-r from-[#3E4A35] to-[#5A6B4E] rounded-2xl shadow-md p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-stone-200 text-xs font-semibold uppercase tracking-wider">
              Controllo Sicurezza Viaggio
            </span>
            <h1 className="text-2xl font-bold mt-1">Checklist per la Sosta & Viaggio</h1>
            <p className="text-stone-100 text-sm mt-1 max-w-xl">
              Fai un controllo approfondito prima di girare la chiave. Un camper sicuro previene spiacevoli inconvenienti su strada.
            </p>
          </div>
          <button
            onClick={handleResetChecklist}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-xl font-bold text-sm transition-all cursor-pointer border border-white/20"
          >
            <RotateCcw className="w-4 h-4" />
            Azzera Spunte
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 bg-black/10 rounded-xl p-4 border border-white/10">
          <div className="flex justify-between text-sm font-semibold mb-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-[#F5F2ED]" />
              Verifiche Sicurezza Completate
            </span>
            <span>
              {completed} di {total} ({percentage}%)
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
            <div
              className="bg-white h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          {percentage === 100 ? (
            <p className="text-xs text-white font-bold mt-2 animate-pulse flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Siete pronti per partire in totale sicurezza! Strada libera e buon viaggio!
            </p>
          ) : (
            <p className="text-xs text-stone-200 mt-2">
              Mancano ancora {total - completed} controlli essenziali prima di immettersi in marcia.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: AI Assistant & Custom Adder stacked */}
        <div className="space-y-6 h-fit">
          {/* AI Intelligent Checklist Generator */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#A45C40]" />
              Checklist Intelligente AI
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-medium leading-relaxed">
              Genera istantaneamente una lista di controlli e dotazioni su misura per il tuo tipo di viaggio in camper.
            </p>
            
            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                  Destinazione
                </label>
                <select
                  value={destType}
                  onChange={(e) => setDestType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] transition-all text-xs text-slate-700 bg-white font-medium"
                >
                  {destOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                    Stagione
                  </label>
                  <select
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] transition-all text-xs text-slate-700 bg-white font-medium"
                  >
                    {seasonOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                    Equipaggio
                  </label>
                  <select
                    value={crew}
                    onChange={(e) => setCrew(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] transition-all text-xs text-slate-700 bg-white font-medium"
                  >
                    {crewOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                  Stile di Sosta
                </label>
                <select
                  value={parkingStyle}
                  onChange={(e) => setParkingStyle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] transition-all text-xs text-slate-700 bg-white font-medium"
                >
                  {parkingOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                  Note Aggiuntive (opzionale)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Es. camper d'epoca, portabici posteriore..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] transition-all text-xs text-slate-700 font-medium"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={loading}
                className="w-full py-3 bg-[#A45C40] hover:bg-[#8D4A30] active:bg-[#A45C40] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Generazione in corso...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
                    Inizia Generazione AI
                  </>
                )}
              </button>
            </div>

            {/* Generated Items Interactive Preview inline */}
            {generatedItems.length > 0 && (
              <div className="mt-4 p-4 bg-orange-50/50 border border-orange-200 rounded-xl space-y-3 animate-fade-in text-sans text-xs">
                <div className="flex justify-between items-center border-b border-orange-200/40 pb-2">
                  <span className="font-bold text-[#A45C40] uppercase tracking-wider flex items-center gap-1 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-[#A45C40]" />
                    Controlli Consigliati AI ({generatedItems.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setGeneratedItems([])}
                    className="text-slate-400 hover:text-slate-600 font-bold"
                  >
                    Annulla
                  </button>
                </div>

                {/* Scrollable list */}
                <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                  {generatedItems.map((item, index) => (
                    <div 
                      key={index} 
                      onClick={() => {
                        const copy = [...generatedItems];
                        copy[index].selected = !copy[index].selected;
                        setGeneratedItems(copy);
                      }}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                        item.selected 
                          ? 'bg-white border-orange-200 shadow-2xs' 
                          : 'bg-[#F2EFE9]/40 border-stone-200/40 opacity-60'
                      }`}
                    >
                      <div className="mt-0.5">
                        {item.selected ? (
                          <CheckSquare className="w-4 h-4 text-[#A45C40] shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </div>
                      <div className="space-y-0.5 text-left">
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-100 text-[#A45C40] font-mono">
                          {item.category}
                        </span>
                        <p className="font-bold text-slate-800 leading-snug text-[11px]">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Import Buttons */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleImportSelected('append')}
                    className="w-full py-2.5 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Aggiungi alla mia lista ({generatedItems.filter(i => i.selected).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Sicuro di voler SOVRASCRIVERE l\'intera checklist con quella generata dall\'AI? Questa operazione cancellerà tutti i controlli attuali.')) {
                        handleImportSelected('replace');
                      }
                    }}
                    className="w-full py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Sovrascrivi checklist
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Add Item Panel */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm h-fit">
            <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#3E4A35]" />
              Aggiungi Controllo Custom
            </h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">
                  Descrizione dell'azione
                </label>
                <textarea
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder="Es: Chiudere rubinetto bombola gas secondaria..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] focus:ring-4 focus:ring-[#3E4A35]/10 transition-all text-sm text-slate-800 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">
                  Categoria della Checklist
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ChecklistItem['category'])}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] focus:ring-4 focus:ring-[#3E4A35]/10 transition-all text-sm text-slate-705 bg-white font-medium"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#3E4A35] hover:bg-[#5A6B4E] active:bg-[#3E4A35] text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer text-sm flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Aggiungi alla Lista
              </button>
            </form>
          </div>
        </div>

        {/* Divided Checklists */}
        <div className="lg:col-span-2 space-y-4">
          {categories.map((cat) => {
            const catItems = getItemsByCat(cat);
            return (
              <div
                key={cat}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3"
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        cat === 'Partenza'
                          ? 'bg-[#A45C40]'
                          : cat === 'Sosta'
                          ? 'bg-[#5A6B4E]'
                          : cat === 'Sicurezza'
                          ? 'bg-[#3E4A35]'
                          : 'bg-emerald-500'
                      }`}
                    ></span>
                    {cat}
                  </h4>
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full font-mono">
                    {catItems.filter((i) => i.checked).length}/{catItems.length} OK
                  </span>
                </div>

                {catItems.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    Nessun elemento presente in questa categoria. Aggiungine uno!
                  </p>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {catItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between gap-3 py-3 transition-colors ${
                          item.checked ? 'opacity-60' : ''
                        }`}
                      >
                        <button
                          onClick={() => toggleCheck(item.id)}
                          className="flex items-start gap-3 flex-1 text-left cursor-pointer"
                        >
                          <div className="pt-0.5">
                            {item.checked ? (
                              <CheckSquare className="w-5 h-5 text-[#5A6B4E] flex-shrink-0" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400 flex-shrink-0 hover:text-[#5A6B4E]" />
                            )}
                          </div>
                          <span
                            className={`text-sm text-slate-700 leading-relaxed ${
                              item.checked ? 'line-through text-slate-400 font-medium' : 'font-medium text-slate-800'
                            }`}
                          >
                            {item.text}
                          </span>
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 px-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 transform scale-102 transition-all duration-300">
            <div className="flex items-center justify-center w-14 h-14 bg-red-50 text-red-600 rounded-2xl mx-auto mb-5">
              <RotateCcw className="w-7 h-7" />
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">
              Azzerare la Checklist?
            </h3>
            
            <p className="text-sm text-slate-500 text-center leading-relaxed mb-6">
              Stai per rimuovere la spunta a tutti i controlli della Checklist per la Sosta & Viaggio. Questa operazione è utile per iniziare un nuovo viaggio o percorso da zero.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex gap-3 text-left">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5">Avviso di sicurezza</span>
                <p className="text-xs text-amber-700 leading-relaxed">
                  I controlli non completati attiveranno nuovamente i banner di attenzione nella schermata principale.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-2xl font-black text-xs tracking-wide transition-all cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={confirmResetChecklist}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-2xl font-black text-xs tracking-wide shadow-lg shadow-red-100 transition-all cursor-pointer"
              >
                Sì, azzera tutto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
