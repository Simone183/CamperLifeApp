import React, { useState } from 'react';
import { Trip } from '../types';
import { Share2, X, Check, Euro } from 'lucide-react';

interface Props {
  trip: Trip | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmShare: (options: { shareToSocial: boolean; shareToSharedTrips: boolean; includeExpenses: boolean }) => void;
}

export function TripShareModal({ trip, isOpen, onClose, onConfirmShare }: Props) {
  const [shareToSocial, setShareToSocial] = useState(true);
  const [shareToSharedTrips, setShareToSharedTrips] = useState(true);
  const [includeExpenses, setIncludeExpenses] = useState(true);

  if (!isOpen || !trip) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Condividi Viaggio</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[240px]">{trip.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest block">
              📍 Dove desideri condividere?
            </label>
            <div className="grid grid-cols-1 gap-2">
              <label 
                onClick={() => setShareToSocial(!shareToSocial)}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                  shareToSocial 
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-bold' 
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5 text-sm">
                  <span>💬 Bacheca Social (Community Feed)</span>
                </div>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${shareToSocial ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                  {shareToSocial && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </label>

              <label 
                onClick={() => setShareToSharedTrips(!shareToSharedTrips)}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                  shareToSharedTrips 
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-bold' 
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5 text-sm">
                  <span>🗺️ Viaggi Condivisi (Community Itineraries)</span>
                </div>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${shareToSharedTrips ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                  {shareToSharedTrips && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-700">
            <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest block">
              🔒 Opzioni Privacy & Dati
            </label>
            <label 
              onClick={() => setIncludeExpenses(!includeExpenses)}
              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                includeExpenses 
                  ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold' 
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5 text-sm">
                <Euro className="w-4 h-4 text-amber-600" />
                <span>Includi spese registrate ({trip.expenses?.length || 0} voci)</span>
              </div>
              <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${includeExpenses ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                {includeExpenses && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-1">
              {includeExpenses ? "Le spese e il totale monetario saranno visibili nel post/viaggio condiviso." : "Le spese saranno nascoste per maggiore privacy."}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
          <button 
            onClick={onClose}
            className="px-4 py-2.5 text-slate-600 dark:text-slate-300 text-xs font-extrabold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Annulla
          </button>
          <button 
            onClick={() => {
              if (!shareToSocial && !shareToSharedTrips) {
                window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: "⚠️ Seleziona almeno una destinazione di condivisione!" } }));
                return;
              }
              onConfirmShare({ shareToSocial, shareToSharedTrips, includeExpenses });
              onClose();
            }}
            className="px-5 py-2.5 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            Condividi ora 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
