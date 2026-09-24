import React, { useState } from 'react';
import { Trip, TripStop, TripSosta, DiaryExpense } from '../types';
import { X, Calendar, MapPin, Euro, Plus, Share2, Trash2, Phone, Home, Truck, ShieldCheck, Compass } from 'lucide-react';

interface TripDetailModalProps {
  trip: Trip;
  onClose: () => void;
  onUpdateTrip: (updated: Trip) => void;
  onDeleteTrip: (id: string) => void;
  onShareTrip: (trip: Trip) => void;
}

export const TripDetailModal: React.FC<TripDetailModalProps> = ({
  trip,
  onClose,
  onUpdateTrip,
  onDeleteTrip,
  onShareTrip
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'STOPS' | 'SOSTE' | 'EXPENSES'>('STOPS');
  
  // Add Stop State
  const [showAddStop, setShowAddStop] = useState(false);
  const [stopName, setStopName] = useState('');
  const [stopDate, setStopDate] = useState(new Date().toLocaleDateString('it-IT'));
  const [stopExpenses, setStopExpenses] = useState('0');
  const [stopNotes, setStopNotes] = useState('');

  // Add Sosta State
  const [showAddSosta, setShowAddSosta] = useState(false);
  const [sostaName, setSostaName] = useState('');
  const [sostaAddress, setSostaAddress] = useState('');
  const [sostaPhone, setSostaPhone] = useState('');
  const [sostaType, setSostaType] = useState<'area_sosta' | 'campeggio' | 'agricampeggio' | 'parcheggio' | 'altro'>('area_sosta');
  const [sostaDate, setSostaDate] = useState(new Date().toLocaleDateString('it-IT'));
  const [sostaExpense, setSostaExpense] = useState('0');
  const [sostaNotes, setSostaNotes] = useState('');

  const handleAddStop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stopName.trim()) return;

    const newStop: TripStop = {
      id: `stop-${Date.now()}`,
      name: stopName,
      date: stopDate,
      expenses: parseFloat(stopExpenses) || 0,
      notes: stopNotes
    };

    const updatedStops = [...(trip.stops || []), newStop];
    const newStopExpenseVal = parseFloat(stopExpenses) || 0;

    // Synchronize expense into trip.expenses as well
    const newExpenseEntry: DiaryExpense = {
      id: `exp-${Date.now()}`,
      title: `Tappa: ${stopName}`,
      amount: newStopExpenseVal,
      category: 'Tappa',
      description: `Tappa: ${stopName}`,
      amountEuro: newStopExpenseVal,
      date: stopDate
    };

    const updatedExpenses = [...(trip.expenses || []), newExpenseEntry];
    const newBudget = updatedExpenses.reduce((acc, exp) => acc + (exp.amountEuro || 0), 0);

    onUpdateTrip({
      ...trip,
      stops: updatedStops,
      expenses: updatedExpenses,
      budgetEuro: newBudget
    });

    setStopName('');
    setStopNotes('');
    setStopExpenses('0');
    setShowAddStop(false);
  };

  const handleAddSosta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sostaName.trim()) return;

    const expenseVal = parseFloat(sostaExpense) || 0;

    const newSosta: TripSosta = {
      id: `sosta-${Date.now()}`,
      name: sostaName,
      type: sostaType,
      address: sostaAddress,
      phone: sostaPhone,
      date: sostaDate,
      expenseEuro: expenseVal,
      notes: sostaNotes
    };

    const updatedSoste = [...(trip.soste || []), newSosta];

    // Synchronize sosta expense with trip.expenses and budgetEuro
    const newExpenseEntry: DiaryExpense = {
      id: `exp-sosta-${Date.now()}`,
      title: `${sostaType.replace('_', ' ')}: ${sostaName}`,
      amount: expenseVal,
      category: 'Sosta',
      description: `${sostaType.replace('_', ' ')}: ${sostaName} (${sostaAddress || 'Indirizzo non specificato'})`,
      amountEuro: expenseVal,
      date: sostaDate
    };

    const updatedExpenses = [...(trip.expenses || []), newExpenseEntry];
    const newBudget = updatedExpenses.reduce((acc, exp) => acc + (exp.amountEuro || 0), 0);

    onUpdateTrip({
      ...trip,
      soste: updatedSoste,
      expenses: updatedExpenses,
      budgetEuro: newBudget
    });

    setSostaName('');
    setSostaAddress('');
    setSostaPhone('');
    setSostaNotes('');
    setSostaExpense('0');
    setShowAddSosta(false);
  };

  const totalSosteExpense = (trip.soste || []).reduce((acc, s) => acc + (s.expenseEuro || 0), 0);
  const totalTripExpense = (trip.expenses || []).reduce((acc, e) => acc + (e.amountEuro || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 my-auto flex flex-col max-h-[90vh]">
        
        {/* Header with cover image */}
        <div className="relative h-44 sm:h-52 rounded-t-2xl overflow-hidden bg-slate-900 shrink-0">
          <img
            src={trip.coverPhoto || 'https://images.unsplash.com/photo-1548625361-185b1a382c49?auto=format&fit=crop&w=800&q=80'}
            alt={trip.title}
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                trip.status === 'ATTIVO' ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-700 text-slate-200'
              }`}>
                {trip.status}
              </span>
              
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white font-serif">{trip.title}</h2>
              <p className="text-xs text-amber-200 flex items-center gap-2 mt-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{trip.startDate} {trip.endDate ? `— ${trip.endDate}` : ''}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Modal Stats Subheader */}
        <div className="bg-stone-100 dark:bg-slate-800 px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
          <div className="flex items-center gap-4">
            <span>📷 {trip.photosCount || (trip.photos || []).length} Foto</span>
            <span>💶 {totalTripExpense}€ Spese Totali</span>
            <span>🛣️ {trip.kmTotal || 0} km</span>
          </div>

          <button
            onClick={() => onShareTrip(trip)}
            className="px-3 py-1 rounded-lg bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-1 hover:bg-amber-300"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Condividi 🚀</span>
          </button>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900 px-5 pt-2 gap-2 shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('STOPS')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'STOPS'
                ? 'border-emerald-700 text-emerald-800 dark:text-emerald-400 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Tappe ({trip.stops?.length || 0})</span>
          </button>
          
          <button
            onClick={() => setActiveSubTab('SOSTE')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'SOSTE'
                ? 'border-emerald-700 text-emerald-800 dark:text-emerald-400 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Soste & Camper Service ({trip.soste?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('EXPENSES')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'EXPENSES'
                ? 'border-emerald-700 text-emerald-800 dark:text-emerald-400 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Euro className="w-3.5 h-3.5" />
            <span>Spese Sincronizzate ({trip.expenses?.length || 0})</span>
          </button>
        </div>

        {/* Modal Content Scrollable Area with Gray Background container behind photo links, memories, and stops */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-stone-50/70 dark:bg-slate-900">
          
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            "{trip.description || 'Nessuna descrizione o nota generale inserita per questo viaggio.'}"
          </p>

          {/* TAB 1: TAPPE */}
          {activeSubTab === 'STOPS' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pt-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span>ELENCO TAPPE ITINERARIO</span>
                </h3>

                <button
                  onClick={() => setShowAddStop(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Aggiungi Tappa</span>
                </button>
              </div>

              {/* Stops List with Gray Background */}
              <div className="space-y-2.5">
                {(!trip.stops || trip.stops.length === 0) ? (
                  <p className="text-xs text-slate-400 italic text-center py-6 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    Nessuna tappa registrata in questo viaggio.
                  </p>
                ) : (
                  trip.stops.map((stop, idx) => (
                    <div key={stop.id} className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-800 text-white text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span>{stop.name}</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">{stop.date}</span>
                      </div>
                      {stop.notes && <p className="text-xs text-slate-600 dark:text-slate-300 pl-7">{stop.notes}</p>}
                      {typeof stop.expenses === 'number' && stop.expenses > 0 ? (
                        <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 pl-7">Spesa: {stop.expenses}€</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>

              {/* Add Stop Form */}
              {showAddStop && (
                <form onSubmit={handleAddStop} className="p-4 bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 rounded-xl space-y-3 mt-3">
                  <h4 className="text-xs font-extrabold text-emerald-900 dark:text-emerald-300 uppercase">Nuova Tappa Itinerario</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-semibold">
                    <input
                      type="text"
                      placeholder="Nome Tappa / Luogo"
                      required
                      value={stopName}
                      onChange={(e) => setStopName(e.target.value)}
                      className="p-2 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Data"
                      value={stopDate}
                      onChange={(e) => setStopDate(e.target.value)}
                      className="p-2 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Spesa (€)"
                      value={stopExpenses}
                      onChange={(e) => setStopExpenses(e.target.value)}
                      className="p-2 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Note di viaggio o dettagli tappa..."
                    value={stopNotes}
                    onChange={(e) => setStopNotes(e.target.value)}
                    className="w-full p-2 rounded-lg border text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowAddStop(false)} className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold">Annulla</button>
                    <button type="submit" className="px-4 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-bold">Salva Tappa</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: SOSTE (Aree sosta, campeggi, agricampeggi, parcheggi) */}
          {activeSubTab === 'SOSTE' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pt-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                  <span>AREE SOSTA & CAMPEGGI REGISTRATI ({trip.soste?.length || 0})</span>
                </h3>

                <button
                  onClick={() => setShowAddSosta(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Registra Sosta</span>
                </button>
              </div>

              {/* Soste List */}
              <div className="space-y-2.5">
                {(!trip.soste || trip.soste.length === 0) ? (
                  <p className="text-xs text-slate-400 italic text-center py-6 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    Nessuna sosta, campeggio o agricampeggio registrato per questo viaggio.
                  </p>
                ) : (
                  trip.soste.map((sosta, idx) => (
                    <div key={sosta.id} className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-black uppercase">
                            {sosta.type.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">{sosta.name}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">{sosta.date}</span>
                      </div>

                      {sosta.address && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{sosta.address}</span>
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        {sosta.phone ? (
                          <a href={`tel:${sosta.phone}`} className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
                            <Phone className="w-3 h-3" />
                            <span>{sosta.phone}</span>
                          </a>
                        ) : <span className="text-[11px] text-slate-400">Nessun telefono</span>}

                        <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                          {sosta.expenseEuro > 0 ? `${sosta.expenseEuro} € (Spesa Sincronizzata)` : 'Gratuito'}
                        </span>
                      </div>

                      {sosta.notes && <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1 border-t border-slate-100 dark:border-slate-700/50">{sosta.notes}</p>}
                    </div>
                  ))
                )}
              </div>

              {/* Add Sosta Form */}
              {showAddSosta && (
                <form onSubmit={handleAddSosta} className="p-4 bg-purple-50 dark:bg-slate-800 border border-purple-200 dark:border-slate-700 rounded-xl space-y-3 mt-3">
                  <h4 className="text-xs font-extrabold text-purple-900 dark:text-purple-300 uppercase">Registra Nuova Sosta / Campeggio</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold">
                    <div>
                      <label className="block text-[10px] text-slate-600 mb-1">Nome Sosta / Struttura *</label>
                      <input
                        type="text"
                        placeholder="Es. Area Sosta Camper Comunale"
                        required
                        value={sostaName}
                        onChange={(e) => setSostaName(e.target.value)}
                        className="w-full p-2 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-600 mb-1">Tipologia</label>
                      <select
                        value={sostaType}
                        onChange={(e) => setSostaType(e.target.value as any)}
                        className="w-full p-2 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        <option value="area_sosta">Area Sosta Camper</option>
                        <option value="campeggio">Campeggio</option>
                        <option value="agricampeggio">Agricampeggio</option>
                        <option value="parcheggio">Parcheggio</option>
                        <option value="altro">Altro / Sosta Libera</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-600 mb-1">Indirizzo</label>
                      <input
                        type="text"
                        placeholder="Via, Città"
                        value={sostaAddress}
                        onChange={(e) => setSostaAddress(e.target.value)}
                        className="w-full p-2 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-600 mb-1">Telefono</label>
                      <input
                        type="text"
                        placeholder="+39 ..."
                        value={sostaPhone}
                        onChange={(e) => setSostaPhone(e.target.value)}
                        className="w-full p-2 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-600 mb-1">Data Sosta</label>
                      <input
                        type="text"
                        value={sostaDate}
                        onChange={(e) => setSostaDate(e.target.value)}
                        className="w-full p-2 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-600 mb-1">Costo / Spesa (€) (Sincronizzato)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={sostaExpense}
                        onChange={(e) => setSostaExpense(e.target.value)}
                        className="w-full p-2 rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-1">Note e Servizi (es. camper service, elettricità)</label>
                    <textarea
                      rows={2}
                      value={sostaNotes}
                      onChange={(e) => setSostaNotes(e.target.value)}
                      className="w-full p-2 rounded-lg border text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowAddSosta(false)} className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold">Annulla</button>
                    <button type="submit" className="px-4 py-1.5 rounded-lg bg-purple-700 text-white text-xs font-bold">Registra Sosta</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: SPESE */}
          {activeSubTab === 'EXPENSES' && (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Euro className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>SPESE E COSTI SINCRONIZZATI ({trip.expenses?.length || 0})</span>
              </h3>

              <div className="space-y-2">
                {(!trip.expenses || trip.expenses.length === 0) ? (
                  <p className="text-xs text-slate-400 italic text-center py-6 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    Nessuna spesa registrata per questo viaggio.
                  </p>
                ) : (
                  trip.expenses.map((exp) => (
                    <div key={exp.id} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-between text-xs font-semibold">
                      <div>
                        <span className="font-extrabold text-slate-900 dark:text-white block">{exp.description}</span>
                        <span className="text-slate-400 text-[11px]">{exp.category} • {exp.date}</span>
                      </div>
                      <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">{exp.amountEuro} €</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 rounded-b-2xl">
          <button
            onClick={() => {
              if (confirm('Sei sicuro di voler eliminare questo viaggio dal diario?')) {
                onDeleteTrip(trip.id);
                onClose();
              }
            }}
            className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Elimina Viaggio</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs cursor-pointer"
          >
            Chiudi Scheda
          </button>
        </div>

      </div>
    </div>
  );
};
