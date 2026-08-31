import React, { useState } from 'react';
import { Trip, TripStop } from '../types';
import { X, Calendar, MapPin, Euro, Plus, Share2, Download, Trash2, Camera, Navigation } from 'lucide-react';

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
  const [activeSubTab, setActiveSubTab] = useState<'STOPS' | 'EXPENSES' | 'SETTINGS'>('STOPS');
  
  // Add Stop State
  const [showAddStop, setShowAddStop] = useState(false);
  const [stopName, setStopName] = useState('');
  const [stopDate, setStopDate] = useState(new Date().toLocaleDateString('it-IT'));
  const [stopExpenses, setStopExpenses] = useState('0');
  const [stopNotes, setStopNotes] = useState('');

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

    const updatedStops = [...trip.stops, newStop];
    const newBudget = updatedStops.reduce((acc, s) => acc + (s.expenses || 0), 0);

    onUpdateTrip({
      ...trip,
      stops: updatedStops,
      budgetEuro: newBudget
    });

    setStopName('');
    setStopNotes('');
    setShowAddStop(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
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
            <span>📷 {trip.photosCount} Foto</span>
            <span>💶 {trip.budgetEuro}€ Totali</span>
            <span>🛣️ {trip.kmTotal} km</span>
          </div>

          <button
            onClick={() => onShareTrip(trip)}
            className="px-3 py-1 rounded-lg bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-1 hover:bg-amber-300"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Condividi 🚀</span>
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic">
            "{trip.description || 'Nessuna descrizione o nota generale inserita per questo viaggio.'}"
          </p>

          <div className="flex items-center justify-between pt-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>TAPPE REGISTRATE ({trip.stops.length})</span>
            </h3>

            <button
              onClick={() => setShowAddStop(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Aggiungi Tappa</span>
            </button>
          </div>

          {/* Stops List */}
          <div className="space-y-3">
            {trip.stops.map((stop, idx) => (
              <div key={stop.id} className="p-4 rounded-xl bg-stone-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-800 text-white text-[10px] flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span>{stop.name}</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">{stop.date}</span>
                </div>
                {stop.notes && <p className="text-xs text-slate-600 dark:text-slate-300 pl-7">{stop.notes}</p>}
                {stop.expenses ? (
                  <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 pl-7">Spesa: {stop.expenses}€</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Add Stop Modal Form Overlay */}
        {showAddStop && (
          <form onSubmit={handleAddStop} className="p-4 bg-emerald-50 dark:bg-slate-800 border-t border-emerald-200 dark:border-slate-700 space-y-3 shrink-0">
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

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              if (confirm('Sei sicuro di voler eliminare questo viaggio dal diario?')) {
                onDeleteTrip(trip.id);
                onClose();
              }
            }}
            className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            <span>Elimina Viaggio</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs"
          >
            Chiudi Scheda
          </button>
        </div>

      </div>
    </div>
  );
};
