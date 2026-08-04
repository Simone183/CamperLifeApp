import React from 'react';
import { Trip } from '../types';
import { Share2, Calendar } from 'lucide-react';

interface Props {
  trips: Trip[];
  onViewTrip: (tripId: string) => void;
}

export default function SharedTripsTab({ trips, onViewTrip }: Props) {
  const sharedTrips = trips.filter(t => t.isShared);

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

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Share2 className="text-[#3E4A35]" />
        Viaggi Condivisi dalla Community
      </h2>
      <p className="text-gray-600">Esplora i diari di bordo condivisi dagli altri camperisti.</p>

      {sharedTrips.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
          <p className="text-gray-500 italic">Al momento non ci sono viaggi condivisi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sharedTrips.map(trip => (
            <div key={trip.id} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <h4 className="font-bold text-lg text-slate-800">{trip.title}</h4>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {getDisplayDates(trip).start}
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => onViewTrip(trip.id)}
                  className="flex-1 px-4 py-2 bg-[#3E4A35] text-white font-bold rounded-xl text-sm hover:bg-[#5A6B4E] transition-all cursor-pointer"
                >
                  Visualizza Diario
                </button>
                <button 
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("share-trip-to-social", {
                        detail: { trip }
                      })
                    );
                  }}
                  className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-xl text-sm hover:bg-indigo-100 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Pubblica questo viaggio sulla Bacheca Social della Community"
                >
                  <Share2 className="w-4 h-4" />
                  Social 💬
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
