import React from 'react';
import { Camera, MapPin, Mic, X, ShieldCheck, Check } from 'lucide-react';

interface AppPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (permissions: { location: boolean; camera: boolean; microphone: boolean }) => void;
}

export function AppPermissionModal({ isOpen, onClose, onApply }: AppPermissionModalProps) {
  const [locationEnabled, setLocationEnabled] = React.useState(true);
  const [cameraEnabled, setCameraEnabled] = React.useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = React.useState(true);

  if (!isOpen) return null;

  const handleApply = async () => {
    try {
      localStorage.setItem('viacamper_perm_location', String(locationEnabled));
      localStorage.setItem('viacamper_perm_camera', String(cameraEnabled));
      localStorage.setItem('viacamper_perm_microphone', String(microphoneEnabled));
      localStorage.setItem('viacamper_perm_configured', 'true');
      localStorage.setItem('viacamper_perm_configured_v2', 'true');
      localStorage.setItem('viacamper_perm_configured_v3', 'true');
      localStorage.setItem('viacamper_bg_location_disclosed', 'true');
      localStorage.setItem('viacamper_bg_location_disclosed_v2', 'true');
    } catch (e) {
      console.warn('Errore salvataggio permessi:', e);
    }

    // Trigger native Android runtime permission dialog & Foreground Location Service notification AFTER user accepts Prominent Disclosure
    if (locationEnabled && typeof window !== 'undefined') {
      try {
        const bridge = (window as any).AndroidNativeTTS;
        if (bridge && typeof bridge.requestLocationAndStartForegroundService === 'function') {
          bridge.requestLocationAndStartForegroundService();
        }
      } catch (e) {
        // ignore
      }

      if (navigator.geolocation) {
        try {
          navigator.geolocation.getCurrentPosition(
            () => {},
            (err) => console.log('GPS Permission request:', err.message),
            { timeout: 5000, enableHighAccuracy: true }
          );
        } catch (e) {
          // ignore
        }
      }
    }

    if (onApply) {
      onApply({ location: locationEnabled, camera: cameraEnabled, microphone: microphoneEnabled });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-4 shadow-2xl space-y-2.5 relative">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header - Prominent Disclosure */}
        <div className="flex items-center gap-2.5 pr-6">
          <div className="p-2 rounded-xl bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              Informativa Posizione in Background
            </h3>
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-700 dark:text-emerald-400 block">
              Prominent Disclosure • Autorizzazioni ViaCamper
            </span>
          </div>
        </div>

        {/* Highlighted Prominent Disclosure Box required by Google Play Console */}
        <div className="p-2.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/50 border-2 border-emerald-500/70 dark:border-emerald-600/70 space-y-1.5">
          <div className="flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200 font-black text-[11px] leading-tight">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Perché ViaCamper richiede la posizione in background:</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 leading-snug">
            <strong>ViaCamper</strong> raccoglie e utilizza i dati sulla posizione geografica del dispositivo <strong>anche in background</strong> (quando l'app è ridotta a icona o lo schermo è spento) esclusivamente per consentire il funzionamento continuo del <strong>Navigatore Camper Turn-by-Turn</strong>, la guida vocale su <strong>Android Auto</strong> e gli avvisi di sicurezza lungo il percorso.
          </p>
          <div className="px-2.5 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/90 border border-emerald-200 dark:border-emerald-800/80 text-[10px] font-medium text-slate-600 dark:text-slate-300 leading-tight">
            🔔 Notifica persistente mostrata in background:<br />
            <strong className="text-slate-900 dark:text-white">"ViaCamper • Android Auto attivo - Tracciamento GPS camper in tempo reale"</strong>
          </div>
        </div>

        {/* Compact Toggles List */}
        <div className="space-y-1.5">
          {/* Geolocation */}
          <div
            onClick={() => setLocationEnabled((prev) => !prev)}
            className={`py-2 px-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
              locationEnabled
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`p-1.5 rounded-lg shrink-0 ${
                  locationEnabled ? 'bg-[#3E4A35] text-white dark:bg-[#A3B896] dark:text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-[11px] text-slate-900 dark:text-slate-100 block leading-tight">
                  Posizione Geografica (GPS & Background)
                </span>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight block truncate">
                  Navigazione camper, Android Auto e tracciamento attivo.
                </span>
              </div>
            </div>

            <div
              className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 shrink-0 ${
                locationEnabled ? 'bg-[#3E4A35] dark:bg-[#A3B896]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                  locationEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* Camera */}
          <div
            onClick={() => setCameraEnabled((prev) => !prev)}
            className={`py-2 px-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
              cameraEnabled
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`p-1.5 rounded-lg shrink-0 ${
                  cameraEnabled ? 'bg-[#3E4A35] text-white dark:bg-[#A3B896] dark:text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-[11px] text-slate-900 dark:text-slate-100 block leading-tight">
                  Fotocamera
                </span>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight block truncate">
                  Foto in diretta e condivisione storie nel diario di bordo.
                </span>
              </div>
            </div>

            <div
              className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 shrink-0 ${
                cameraEnabled ? 'bg-[#3E4A35] dark:bg-[#A3B896]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                  cameraEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* Microphone */}
          <div
            onClick={() => setMicrophoneEnabled((prev) => !prev)}
            className={`py-2 px-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
              microphoneEnabled
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`p-1.5 rounded-lg shrink-0 ${
                  microphoneEnabled ? 'bg-[#3E4A35] text-white dark:bg-[#A3B896] dark:text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-[11px] text-slate-900 dark:text-slate-100 block leading-tight">
                  Microfono
                </span>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight block truncate">
                  Video e note vocali durante le tappe dei viaggi.
                </span>
              </div>
            </div>

            <div
              className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 shrink-0 ${
                microphoneEnabled ? 'bg-[#3E4A35] dark:bg-[#A3B896]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                  microphoneEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-1.5 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2.5 rounded-xl text-xs font-extrabold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            Più tardi
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>Ho capito e accetto</span>
          </button>
        </div>
      </div>
    </div>
  );
}
