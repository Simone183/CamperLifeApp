import React, { useState } from 'react';
import { 
  X, AlertTriangle, CloudLightning, Wind, 
  Droplets, Snowflake, MapPin, Send, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { communityWeatherAlertsService } from '../lib/communityWeatherAlertsService';
import { WeatherAlertType, WeatherAlertSeverity } from '../types/weatherAlerts';

interface ReportWeatherModalProps {
  userLocation: { lat: number; lng: number } | null;
  currentUser?: { nickname?: string; email?: string } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReportWeatherModal: React.FC<ReportWeatherModalProps> = ({
  userLocation,
  currentUser,
  onClose,
  onSuccess
}) => {
  const [selectedType, setSelectedType] = useState<WeatherAlertType>('hail');
  const [severity, setSeverity] = useState<WeatherAlertSeverity>('severe');
  const [hailSize, setHailSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [windSpeedKmh, setWindSpeedKmh] = useState<number>(60);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successSent, setSuccessSent] = useState<boolean>(false);

  const alertTypes: Array<{
    id: WeatherAlertType;
    title: string;
    icon: string;
    desc: string;
    color: string;
  }> = [
    {
      id: 'hail',
      title: 'Grandine in corso',
      icon: '🧊',
      desc: 'Chicchi di grandine che possono danneggiare oblò e carrozzeria',
      color: 'border-cyan-500 bg-cyan-50 text-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200'
    },
    {
      id: 'storm',
      title: 'Forte Temporale / Nubifragio',
      icon: '⚡',
      desc: 'Pioggia torrenziale e fulmini continui ad alta intensità',
      color: 'border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200'
    },
    {
      id: 'wind',
      title: 'Raffiche di Vento Pericolose',
      icon: '💨',
      desc: 'Vento forte che rischia di ribaltare tendalini o deviare il camper',
      color: 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
    },
    {
      id: 'flood',
      title: 'Allagamenti / Strade Interrotte',
      icon: '🌊',
      desc: 'Acqua alta sulla carreggiata, sottopassi allagati o fossi esondati',
      color: 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200'
    },
    {
      id: 'snow',
      title: 'Neve / Ghiaccio Improvviso',
      icon: '❄️',
      desc: 'Gelicidio o bufera con asfalto scivoloso per i mezzi pesanti',
      color: 'border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userLocation) {
      alert('Posizione GPS non disponibile. Attiva il GPS per inviare la segnalazione meteo.');
      return;
    }

    setIsSubmitting(true);
    try {
      await communityWeatherAlertsService.submitWeatherAlert({
        type: selectedType,
        severity,
        lat: userLocation.lat,
        lng: userLocation.lng,
        locationName: 'Posizione GPS Attuale',
        reportedBy: currentUser?.nickname || 'Camperista sul posto',
        userEmail: currentUser?.email,
        hailSize: selectedType === 'hail' ? hailSize : undefined,
        windSpeedKmh: selectedType === 'wind' ? windSpeedKmh : undefined,
        notes: notes.trim()
      });

      setSuccessSent(true);
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: {
            message: '📡 Segnalazione meteo inviata! I camperisti entro 30 km sono stati avvisati.',
            duration: 5000
          }
        })
      );

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Error submitting weather alert:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[10003] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-700 relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          title="Chiudi finestra"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
              Segnala Allerta Meteo
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Avvisa i camperisti <span className="font-bold text-amber-600 dark:text-amber-400">entro 30 km</span> dalla tua posizione
            </p>
          </div>
        </div>

        {successSent ? (
          <div className="py-8 text-center space-y-3 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white">
              Segnalazione Inviata!
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto">
              Grazie per aver condiviso l'informazione. La notifica di pericolo è ora attiva per tutti i camper vicini.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* GPS Location pill */}
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200/70 dark:border-slate-600 text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {userLocation
                    ? `Posizione GPS: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
                    : 'GPS non rilevato'}
                </span>
              </div>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                Raggio: 30 km
              </span>
            </div>

            {/* Select Alert Type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Tipo di Pericolo / Fenomeno in corso:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {alertTypes.map((type) => {
                  const isSelected = selectedType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSelectedType(type.id)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        isSelected
                          ? `${type.color} ring-2 ring-amber-500 shadow-xs scale-[1.01]`
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-2xl shrink-0">{type.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-black leading-tight">{type.title}</div>
                        <div className="text-[10px] opacity-75 mt-0.5 line-clamp-1">{type.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hail Specific Options */}
            {selectedType === 'hail' && (
              <div className="p-3 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-cyan-950 dark:text-cyan-200">
                  Dimensione stimata chicchi di grandine:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'small', label: 'Piccoli', sub: '< 1 cm (pisello)' },
                    { id: 'medium', label: 'Medi', sub: '1-3 cm (noce)' },
                    { id: 'large', label: 'Grandi', sub: '> 3 cm (uovo)' }
                  ].map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setHailSize(size.id as any)}
                      className={`p-2 rounded-xl text-center border text-xs cursor-pointer transition-all ${
                        hailSize === size.id
                          ? 'bg-cyan-700 text-white border-cyan-700 font-black shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="font-bold">{size.label}</div>
                      <div className="text-[9px] opacity-80">{size.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Wind Specific Options */}
            {selectedType === 'wind' && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-amber-950 dark:text-amber-200">
                  Intensità raffiche stimate: ~{windSpeedKmh} km/h
                </label>
                <input
                  type="range"
                  min={40}
                  max={120}
                  step={5}
                  value={windSpeedKmh}
                  onChange={(e) => setWindSpeedKmh(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-amber-800 dark:text-amber-300 font-bold">
                  <span>40 km/h (Tendalino a rischio)</span>
                  <span>80+ km/h (Burrasca violenta)</span>
                </div>
              </div>
            )}

            {/* Severity selector */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Livello di Gravità:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'moderate', label: 'Moderato', color: 'border-yellow-400 text-yellow-800 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/40' },
                  { id: 'severe', label: 'Severo / Forte', color: 'border-orange-500 text-orange-800 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/40' },
                  { id: 'extreme', label: 'Estremo / Violento', color: 'border-red-600 text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-950/40' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSeverity(s.id as any)}
                    className={`py-1.5 px-2 rounded-xl text-center text-xs font-black border cursor-pointer transition-all ${
                      severity === s.id ? `${s.color} ring-2 ring-current shadow-xs` : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Dettagli / Consigli utili (opzionale):
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Es. Grandina forte all'uscita autostrada Arezzo, cercare riparo sotto pensiline"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !userLocation}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Invio in corso...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Invia Allerta (Entro 30 km)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
