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
    } catch (e) {
      console.warn('Errore salvataggio permessi:', e);
    }

    // Trigger standard browser geolocation prompt if enabled
    if (locationEnabled && typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {},
        (err) => console.log('GPS Permission request:', err.message),
        { timeout: 5000 }
      );
    }

    // Trigger standard browser camera and mic prompt if enabled
    if ((cameraEnabled || microphoneEnabled) && typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: cameraEnabled,
          audio: microphoneEnabled,
        });
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        console.log('Media Permission request:', err.message);
      }
    }

    if (onApply) {
      onApply({ location: locationEnabled, camera: cameraEnabled, microphone: microphoneEnabled });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-5 relative">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1.5 pr-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#3E4A35]/10 dark:bg-[#A3B896]/20 text-[#3E4A35] dark:text-[#A3B896]">
              <ShieldCheck className="w-5.5 h-5.5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Richiesta di Accesso
              </h3>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#3E4A35] dark:text-[#A3B896]">
                Autorizzazioni ViaCamper
              </span>
            </div>
          </div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
            L'applicazione richiede l'accesso ai seguenti permessi sul tuo dispositivo:
          </p>
        </div>

        {/* Toggles List */}
        <div className="space-y-2.5">
          {/* Camera */}
          <div
            onClick={() => setCameraEnabled((prev) => !prev)}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
              cameraEnabled
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  cameraEnabled ? 'bg-[#3E4A35] text-white dark:bg-[#A3B896] dark:text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}
              >
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 block">
                  Fotocamera
                </span>
                <span className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 leading-tight block">
                  Per scattare foto in diretta e condividere storie nel diario di bordo.
                </span>
              </div>
            </div>

            {/* Switch Toggle */}
            <div
              className={`w-11 h-6 rounded-full transition-colors flex items-center p-0.5 shrink-0 ${
                cameraEnabled ? 'bg-[#3E4A35] dark:bg-[#A3B896]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  cameraEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* Microphone */}
          <div
            onClick={() => setMicrophoneEnabled((prev) => !prev)}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
              microphoneEnabled
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  microphoneEnabled ? 'bg-[#3E4A35] text-white dark:bg-[#A3B896] dark:text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}
              >
                <Mic className="w-4 h-4" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 block">
                  Microfono
                </span>
                <span className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 leading-tight block">
                  Per registrare video e note vocali durante le tappe dei viaggi.
                </span>
              </div>
            </div>

            {/* Switch Toggle */}
            <div
              className={`w-11 h-6 rounded-full transition-colors flex items-center p-0.5 shrink-0 ${
                microphoneEnabled ? 'bg-[#3E4A35] dark:bg-[#A3B896]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  microphoneEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* Geolocation */}
          <div
            onClick={() => setLocationEnabled((prev) => !prev)}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
              locationEnabled
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  locationEnabled ? 'bg-[#3E4A35] text-white dark:bg-[#A3B896] dark:text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}
              >
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 block">
                  Posizione Geografica (GPS)
                </span>
                <span className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 leading-tight block">
                  Per localizzare il camper sulla mappa e calcolare percorsi e soste vicine.
                </span>
              </div>
            </div>

            {/* Switch Toggle */}
            <div
              className={`w-11 h-6 rounded-full transition-colors flex items-center p-0.5 shrink-0 ${
                locationEnabled ? 'bg-[#3E4A35] dark:bg-[#A3B896]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  locationEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-extrabold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2.5 bg-[#3E4A35] hover:bg-[#5A6B4E] dark:bg-[#A3B896] dark:hover:bg-[#8CA37E] dark:text-slate-950 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Applica Autorizzazioni</span>
          </button>
        </div>
      </div>
    </div>
  );
}

