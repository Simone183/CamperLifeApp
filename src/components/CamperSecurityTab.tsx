/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Copy,
  CheckCircle,
  Compass
} from 'lucide-react';

export function CamperSecurityTab({ currentUser, userLocation }: { currentUser: any; userLocation: [number, number] | null }) {
  const [emergencyType, setEmergencyType] = React.useState<'mechanical' | 'medical' | 'intrusion' | 'weather'>('mechanical');
  const [copiedSOS, setCopiedSOS] = React.useState(false);

  const lat = userLocation ? Number(userLocation[0]).toFixed(6) : '41.902782';
  const lng = userLocation ? Number(userLocation[1]).toFixed(6) : '12.496366';

  const generatedSOSTemplate = React.useMemo(() => {
    const header = "🚨 RICHIESTA ASSISTENZA EMERGENZA CAMPER 🚨";
    const locMessage = `Posizione geografica: https://www.google.com/maps/search/?api=1&query=${lat},${lng}\nCoordinate GPS: ${lat}, ${lng}`;
    
    let cause = '';
    if (emergencyType === 'mechanical') {
      cause = "Siamo fermi con il camper per un guasto meccanico improvviso (panne d'avviamento/impianti). Richiediamo supporto di officina o traino nelle vicinanze.";
    } else if (emergencyType === 'medical') {
      cause = "Emergenza di salute a bordo del camper. Richiediamo intervento sanitario urgente o medico di guardia.";
    } else if (emergencyType === 'intrusion') {
      cause = "Sospetta intrusione o minaccia esterna attiva presso il nostro camper in sosta. Richiediamo forze dell'ordine urgente.";
    } else {
      cause = "Siamo bloccati a causa di condizioni climatiche avverse (neve alta, fango profondo, esondazione fluviale). Richiediamo assistenza per trazione o soccorso civile.";
    }

    return `${header}\n\nTipo: ${cause}\n\n${locMessage}\n\nInviato tramite ViaCamper.`;
  }, [emergencyType, lat, lng]);

  const handleCopySOS = () => {
    navigator.clipboard.writeText(generatedSOSTemplate);
    setCopiedSOS(true);
    setTimeout(() => setCopiedSOS(false), 2500);
  };

  return (
    <div className="w-full space-y-2.5 font-sans select-none animate-fade-in">
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/60 dark:border-slate-700 p-3.5 sm:p-5 space-y-3.5 shadow-xs">
        <h3 className="font-bold text-[#3E4A35] dark:text-emerald-400 text-sm flex items-center gap-2 border-b border-stone-100 dark:border-slate-700 pb-2">
          <Compass className="w-4 h-4 text-[#3E4A35] dark:text-emerald-400" />
          Generatore Messaggio SOS Istantaneo
        </h3>

        <div className="space-y-1">
          <label className="text-[10.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
            Seleziona Tipo Emergenza
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { typ: 'mechanical', title: '🔧 Guasto Mecc.' },
              { typ: 'medical', title: '🩹 Emergenza Medica' },
              { typ: 'intrusion', title: '👮 Intrusione/Furto' },
              { typ: 'weather', title: '🌧️ Clima/Blocco' }
            ].map(opt => (
              <button
                key={opt.typ}
                onClick={() => setEmergencyType(opt.typ as any)}
                className={`py-2 px-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  emergencyType === opt.typ
                    ? 'bg-[#3E4A35] text-white border-[#3E4A35] dark:bg-emerald-600 dark:border-emerald-500'
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
              >
                {opt.title}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Contenuto SMS / Whatsapp generato</span>
            <span className="text-emerald-600 dark:text-emerald-400 lowercase font-mono">📍 coordinate GPS incluse</span>
          </div>
          
          <div className="bg-slate-950 text-emerald-300 p-3.5 rounded-xl text-[11px] font-mono font-semibold leading-relaxed border border-emerald-900/40 whitespace-pre-wrap select-text max-h-48 overflow-y-auto min-h-24 shadow-inner">
            {generatedSOSTemplate}
          </div>
        </div>

        <button
          onClick={handleCopySOS}
          className={`w-full py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
            copiedSOS 
              ? 'bg-emerald-600 text-white border border-emerald-700' 
              : 'bg-stone-100 hover:bg-stone-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 border border-slate-300/60 dark:border-slate-600'
          }`}
        >
          {copiedSOS ? (
            <>
              <CheckCircle className="w-4 h-4 animate-bounce" />
              SOS Copiato negli Appunti! Pronto all'invio
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copia negli Appunti
            </>
          )}
        </button>
      </div>
    </div>
  );
}
