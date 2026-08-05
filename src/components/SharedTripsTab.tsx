import React, { useState } from 'react';
import { Trip } from '../types';
import { Share2, Calendar, Edit3, Trash2, AlertTriangle, X } from 'lucide-react';

interface Props {
  trips: Trip[];
  onViewTrip: (tripId: string) => void;
  setTrips?: (trips: Trip[]) => void;
}

export default function SharedTripsTab({ trips, onViewTrip, setTrips }: Props) {
  const sharedTrips = trips.filter(t => t.isShared);

  const [confirmAction, setConfirmAction] = useState<{
    type: 'edit' | 'delete';
    trip: Trip;
  } | null>(null);

  const getDisplayDates = (trip: Trip) => {
    const allDates: string[] = [];
    if (trip.startDate) allDates.push(trip.startDate);
    if (trip.endDate) allDates.push(trip.endDate);

    (trip.movements || []).forEach((m) => {
      if (m.date) allDates.push(m.date.split("T")[0]);
    });
    
    (trip.expenses || []).forEach((e) => {
      if (e.date) allDates.push(e.date.split("T")[0]);
    });

    if (allDates.length === 0) {
      return { start: "", end: "" };
    }

    allDates.sort();
    
    const format = (d: string) => {
      if (!d) return "";
      const parts = d.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return d;
    };
    
    return {
      start: format(allDates[0]),
      end: format(allDates[allDates.length - 1]),
    };
  };

  const handleExecuteAction = () => {
    if (!confirmAction) return;
    const { type, trip } = confirmAction;

    if (type === 'edit') {
      onViewTrip(trip.id);
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: `✏️ Modifica viaggio "${trip.title}" aperta.` }
        })
      );
    } else if (type === 'delete' && setTrips) {
      const updated = trips.map(t => t.id === trip.id ? { ...t, isShared: false } : t);
      setTrips(updated);
      localStorage.setItem("camper_trips", JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: `🗑️ Viaggio rimosso dai viaggi condivisi.` }
        })
      );
    }
    setConfirmAction(null);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Share2 className="text-[#3E4A35]" />
        Viaggi Condivisi dalla Community
      </h2>
      <p className="text-gray-600">Esplora i diari di bordo condivisi dagli altri camperisti e gestisci le tue condivisioni.</p>

      {sharedTrips.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
          <p className="text-gray-500 italic">Al momento non ci sono viaggi condivisi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sharedTrips.map(trip => (
            <div key={trip.id} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3 relative group">
              <div className="flex justify-between items-start gap-2">
                <h4 className="font-bold text-lg text-slate-800">{trip.title}</h4>
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setConfirmAction({ type: 'edit', trip })}
                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                    title="Modifica viaggio condiviso (richiede conferma)"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmAction({ type: 'delete', trip })}
                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    title="Rimuovi / Cancella condivisione (richiede conferma)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {getDisplayDates(trip).start}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button 
                  onClick={() => onViewTrip(trip.id)}
                  className="flex-1 px-4 py-2 bg-[#3E4A35] text-white font-bold rounded-xl text-sm hover:bg-[#5A6B4E] transition-all cursor-pointer"
                >
                  Visualizza Diario 📖
                </button>
                <button 
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("open-trip-share-modal", {
                        detail: { trip }
                      })
                    );
                  }}
                  className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-xl text-sm hover:bg-indigo-100 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Condividi o riconfigura questo viaggio"
                >
                  <Share2 className="w-4 h-4" />
                  Condividi 🚀
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal for Edit or Delete */}
      {confirmAction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {confirmAction.type === 'edit' ? 'Conferma Modifica' : 'Conferma Rimozione'}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmAction.type === 'edit'
                ? `Sei sicuro di voler modificare il viaggio "${confirmAction.trip.title}"? Verrai reindirizzato al diario.`
                : `Sei sicuro di voler rimuovere "${confirmAction.trip.title}" dai viaggi condivisi della community?`}
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button 
                onClick={() => setConfirmAction(null)} 
                className="px-4 py-2 text-slate-600 text-xs font-bold hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Annulla
              </button>
              <button 
                onClick={handleExecuteAction} 
                className={`px-4 py-2 text-white text-xs font-black rounded-xl cursor-pointer shadow-md ${
                  confirmAction.type === 'edit' ? 'bg-[#3E4A35] hover:bg-[#5A6B4E]' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {confirmAction.type === 'edit' ? 'Modifica Viaggio ✏️' : 'Conferma Rimozione 🗑️'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
