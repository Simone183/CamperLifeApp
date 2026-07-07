import React from 'react';
import { 
  Compass, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Volume2, 
  VolumeX, 
  Settings, 
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

export function BubbleLevelTab() {
  const [pitch, setPitch] = React.useState<number>(0); // Front/Back tilt (-10 to 10 deg)
  const [roll, setRoll] = React.useState<number>(0);   // Left/Right tilt (-10 to 10 deg)
  const [offsetPitch, setOffsetPitch] = React.useState<number>(0);
  const [offsetRoll, setOffsetRoll] = React.useState<number>(0);
  const [isSensorActive, setIsSensorActive] = React.useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = React.useState<boolean>(false);
  const [hasSensorPermission, setHasSensorPermission] = React.useState<boolean | null>(null);
  
  // Audio context for the perfect-level calibration beeper
  const audioCtxRef = React.useRef<AudioContext | null>(null);

  // Computed angles (raw angles minus taratura offset)
  const activePitch = Number((pitch - offsetPitch).toFixed(1));
  const activeRoll = Number((roll - offsetRoll).toFixed(1));

  // Determine if camper is perfectly level (defined within a ±0.5 degree threshold)
  const isPerfectLevel = Math.abs(activePitch) <= 0.5 && Math.abs(activeRoll) <= 0.5;

  // Sound triggering effect
  React.useEffect(() => {
    if (isPerfectLevel && soundEnabled) {
      triggerBeep();
    }
  }, [isPerfectLevel, soundEnabled]);

  // Request browser accelerometer permission (specifically required for modern Safari on iOS)
  const requestSensorPermission = async () => {
    if (
      typeof window !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setHasSensorPermission(true);
          startListeningToSensors();
        } else {
          setHasSensorPermission(false);
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { message: '⚠️ Permesso sensori negato. Modalità manuale attiva.' }
          }));
        }
      } catch (err) {
        console.error('Error requesting permission', err);
        setHasSensorPermission(false);
      }
    } else {
      // Browser does not require explicit permission flow (Android Chrome, etc.)
      setHasSensorPermission(true);
      startListeningToSensors();
    }
  };

  const startListeningToSensors = () => {
    setIsSensorActive(true);
    window.addEventListener('deviceorientation', handleDeviceOrientation);
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: '📡 Sensori della livella attivati con successo!' }
    }));
  };

  const stopListeningToSensors = () => {
    setIsSensorActive(false);
    window.removeEventListener('deviceorientation', handleDeviceOrientation);
  };

  React.useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
    };
  }, []);

  const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
    // beta represents front-to-back tilt in degrees (pitch)
    // gamma represents left-to-right tilt in degrees (roll)
    if (e.beta !== null && e.gamma !== null) {
      // Clamping limits to ±15 degrees for UI sanity
      const clampedPitch = Math.max(-15, Math.min(15, e.beta));
      const clampedRoll = Math.max(-15, Math.min(15, e.gamma));
      setPitch(clampedPitch);
      setRoll(clampedRoll);
    }
  };

  // Safe lazy Web Audio buzzer
  const triggerBeep = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // high pure frequency
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15); // soft short decay chirp
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch (e) {
      console.warn('AudioContext beep blocked or unsupported', e);
    }
  };

  // Calibration tool: sets the current raw reading as the flat baseline
  const calibrate = () => {
    setOffsetPitch(pitch);
    setOffsetRoll(roll);
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: '🎯 Livella tarata con successo nella posizione corrente!' }
    }));
  };

  // Reset calibration
  const resetCalibration = () => {
    setOffsetPitch(0);
    setOffsetRoll(0);
  };

  // Ramps Advisor Math: determine exactly which wheels must go up and by how much
  // For a standard camper spacing, 1 DEGREE roughly translates to 2 - 2.5cm height difference per wheel
  const cmPerDegree = 2.2;
  const rollDiffCm = activeRoll * cmPerDegree;
  const pitchDiffCm = activePitch * cmPerDegree;

  const leftSideRampHeight = activeRoll < -0.5 ? Math.abs(rollDiffCm) : 0;
  const rightSideRampHeight = activeRoll > 0.5 ? Math.abs(rollDiffCm) : 0;
  const frontRampHeight = activePitch < -0.5 ? Math.abs(pitchDiffCm) : 0;
  const rearRampHeight = activePitch > 0.5 ? Math.abs(pitchDiffCm) : 0;

  return (
    <div className="space-y-6 font-sans">
      
      {/* Visual Level Dashboard */}
      <div className="bg-gradient-to-br from-[#3E4A35] to-[#2B3523] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full inline-block">
              Strumento di Sosta
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Livella Digitale Camper</h2>
            <p className="text-xs text-stone-300 max-w-lg leading-relaxed">
              Trova l’orizzonte perfetto per dormire sodo, far defluire gli scarichi d'acqua in bagno e far funzionare il frigorifero trivalente al massimo delle sue prestazioni.
            </p>
          </div>

          {/* Sound Controls & Taratura buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                soundEnabled 
                  ? 'bg-emerald-500 border-transparent text-white shadow-md' 
                  : 'bg-white/10 border-white/20 text-stone-300 hover:bg-white/15'
              }`}
              title={soundEnabled ? "Disattiva Beep Acustico" : "Attiva Beep Acustico"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 animate-bounce" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={calibrate}
              className="px-3.5 py-2.5 bg-[#A45C40] hover:bg-[#8D4A30] active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
              title="Tarasulla posizione corrente"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Calibra</span>
            </button>
            {(offsetPitch !== 0 || offsetRoll !== 0) && (
              <button
                onClick={resetCalibration}
                className="p-2.5 bg-red-900/40 hover:bg-red-950/60 border border-red-500/30 rounded-xl text-red-200 text-xs font-bold transition-all cursor-pointer"
                title="Resetta Taratura"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Big visual indicators row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-white/10 items-stretch">
          {/* Pitch metric */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest font-mono">
                Assetto Longitudinale (Pitch)
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono tracking-tight text-white">
                {activePitch > 0 ? `+${activePitch}` : activePitch}°
              </span>
              <span className="text-xs text-stone-400 font-bold">Beccheggio</span>
            </div>
            <div className="text-[10px] text-stone-300 font-medium mt-2 flex items-center gap-1.5">
              {activePitch === 0 ? (
                <span className="text-emerald-450 font-bold">✓ Bilanciato</span>
              ) : activePitch > 0 ? (
                <>
                  <ArrowDown className="w-3.5 h-3.5 text-red-300 shrink-0" />
                  <span>Inclinato verso il Retro</span>
                </>
              ) : (
                <>
                  <ArrowUp className="w-3.5 h-3.5 text-red-300 shrink-0" />
                  <span>Inclinato verso il Fronte</span>
                </>
              )}
            </div>
          </div>

          {/* Roll metric */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest font-mono">
                Assetto Trasversale (Roll)
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono tracking-tight text-white">
                {activeRoll > 0 ? `+${activeRoll}` : activeRoll}°
              </span>
              <span className="text-xs text-stone-400 font-bold">Rollio</span>
            </div>
            <div className="text-[10px] text-stone-300 font-medium mt-2 flex items-center gap-1.5">
              {activeRoll === 0 ? (
                <span className="text-emerald-450 font-bold">✓ Bilanciato</span>
              ) : activeRoll > 0 ? (
                <>
                  <ArrowRight className="w-3.5 h-3.5 text-red-300 shrink-0" />
                  <span>Inclinato a Destra</span>
                </>
              ) : (
                <>
                  <ArrowLeft className="w-3.5 h-3.5 text-red-300 shrink-0" />
                  <span>Inclinato a Sinistra</span>
                </>
              )}
            </div>
          </div>

          {/* Global Diagnosis */}
          <div className={`rounded-2xl p-4 border flex flex-col justify-between transition-all ${
            isPerfectLevel 
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-250' 
              : 'bg-amber-505/10 bg-[#A45C40]/10 border-[#A45C40]/25 text-orange-200'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-widest font-mono">
              Diagnosi di Sosta
            </span>
            <div className="mt-3 flex items-center gap-2.5">
              {isPerfectLevel ? (
                <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0 animate-bounce" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-[#A45C40] shrink-0 animate-pulse" />
              )}
              <div>
                <h4 className="font-extrabold text-sm text-white">
                  {isPerfectLevel ? 'Sosta in Bolla!' : 'Necessari Ralle/Cunei'}
                </h4>
                <p className="text-[10px] text-stone-300 leading-snug mt-0.5">
                  {isPerfectLevel 
                    ? 'Mezzo perfettamente allineato. Goditi la cena e il sonno in piano.'
                    : 'Il camper pende leggermente. Segui il piano cunei sottostante per compensare.'}
                </p>
              </div>
            </div>
            <div className="text-[9px] text-[#F2EFE9] opacity-80 font-mono mt-2 font-bold">
              Tol. di tolleranza raccomandata: ±0.5°
            </div>
          </div>
        </div>

      </div>

      {/* Main Content Area: Interactive Spirit Level & Camper Silhouette Tilters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TAB 1: Real-time Concentric Bubble Tube Level */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4 flex flex-col items-center justify-center">
          <div className="w-full text-left">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#3E4A35]" />
              Bolla di Centramento
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">Bolla sferica a spirale centripeta</p>
          </div>

          {/* Concentric Circle Physical Level container */}
          <div className="w-60 h-60 rounded-full bg-[#18231c] border-4 border-slate-700 relative flex items-center justify-center shadow-xl overflow-hidden mt-2">
            {/* Ambient radar concentric lines */}
            <div className="absolute w-[80%] h-[80%] rounded-full border border-white/5 pointer-events-none"></div>
            <div className="absolute w-[60%] h-[60%] rounded-full border border-[#3E4A35]/35 pointer-events-none flex items-center justify-center">
              <span className="text-[9px] font-black text-white/5 font-mono select-none">2.0°</span>
            </div>
            <div className="absolute w-[40%] h-[40%] rounded-full border border-stone-100/5 pointer-events-none"></div>
            {/* Center bullseye representing normal plane ±0.5° */}
            <div className={`absolute w-[15%] h-[15%] rounded-full border-2 border-dashed pointer-events-none transition-all ${
              isPerfectLevel ? 'border-emerald-400 bg-emerald-500/10' : 'border-emerald-500/20'
            }`}></div>

            {/* Crosshair guide lines */}
            <div className="absolute top-0 bottom-0 left-1/2 -ml-[0.5px] border-l border-dashed border-white/10 pointer-events-none"></div>
            <div className="absolute left-0 right-0 top-1/2 -mt-[0.5px] border-t border-dashed border-white/10 pointer-events-none"></div>

            {/* Axes notation labels */}
            <span className="absolute top-2.5 text-[8px] font-black text-white/40 font-mono">AVANTI (PITCH -)</span>
            <span className="absolute bottom-2.5 text-[8px] font-black text-white/40 font-mono">DIETRO (PITCH +)</span>
            <span className="absolute right-2 text-[8px] font-black text-white/40 font-mono">DX (ROLL +)</span>
            <span className="absolute left-2 text-[8px] font-black text-white/40 font-mono">SX (ROLL -)</span>

            {/* Real bubble element! Position calculated based on roll and pitch */}
            {/* Mapping pitch & roll (-10 to 10 degrees) to container % width */}
            {(() => {
              // Clamp degrees to max ±8 for bubble visualization boundaries
              const visualPitch = Math.max(-8, Math.min(8, activePitch));
              const visualRoll = Math.max(-8, Math.min(8, activeRoll));

              // Bubble offset from center percent (factor of 45% radius)
              const offsetMultiplier = 4.8; 
              const offsetX = visualRoll * offsetMultiplier;
              const offsetY = visualPitch * offsetMultiplier; // positive pitch is behind, goes down

              return (
                <div
                  style={{
                    transform: `translate(${offsetX}px, ${offsetY}px)`,
                    transition: isSensorActive ? 'none' : 'transform 0.15s ease-out'
                  }}
                  className={`w-9 h-9 rounded-full absolute z-30 flex items-center justify-center shadow-lg pointer-events-none ${
                    isPerfectLevel 
                      ? 'bg-gradient-to-tr from-emerald-400 to-emerald-200 border-2 border-emerald-300 ring-4 ring-emerald-500/20' 
                      : 'bg-gradient-to-tr from-amber-400 to-[#A45C40] border-2 border-yellow-200 ring-4 ring-orange-400/15'
                  }`}
                >
                  {/* Subtle dynamic gas bubble reflection glow */}
                  <div className="w-2.5 h-2.5 bg-white/50 rounded-full absolute top-1.5 left-1.5"></div>
                </div>
              );
            })()}

          </div>

          <div className="w-full text-center mt-2">
            <span className="text-[10px] text-slate-400 font-bold lowercase tracking-wider bg-slate-50 px-3 py-1.5 rounded-full inline-block">
              Centra la bolla all’interno del cerchio tratteggiato.
            </span>
          </div>
        </div>

        {/* TAB 2: Dynamic Camper Silhouette Tilt Visualizer */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="w-full text-left">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#3E4A35]" />
              Visualizzatore di Coricato
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">Inclinazione dinamica del tuo mezzo</p>
          </div>

          {/* Render 2D Camper Silhouette inside a frame tilting live */}
          <div className="flex-1 min-h-[170px] bg-slate-50 rounded-xl relative flex items-center justify-center p-4 overflow-hidden border border-slate-100">
            {/* Background horizon lines */}
            <div className="absolute left-4 right-4 top-1/2 -mt-[0.5px] border-t border-slate-350 pointer-events-none opacity-40 z-0"></div>
            <div className="absolute left-1/2 -ml-[0.5px] top-4 bottom-4 border-l border-slate-350 pointer-events-none opacity-40 z-0"></div>

            {/* Tilted camper drawing wrapper */}
            <div 
              style={{ 
                transform: `rotate(${activeRoll}deg)`, 
                transition: isSensorActive ? 'none' : 'transform 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
              }}
              className="relative z-10 flex flex-col items-center justify-center h-full w-full"
            >
              {/* Detailed custom SVG Camper silhouette */}
              <svg 
                viewBox="0 0 160 100" 
                className="w-36 h-28 drop-shadow-xl"
              >
                {/* Camper Body/Cabine */}
                <path d="M20,65 L20,30 Q20,20 30,20 L110,20 Q120,20 125,25 L145,42 L145,65 Q145,68 140,68 L25,68 Q20,68 20,65 Z" fill="#F2EFE9" stroke="#3E4A35" strokeWidth="2.5" />
                <path d="M110,20 L110,68" stroke="#3E4A35" strokeDasharray="1.5 2.5" />
                
                {/* Cab Over (Mansarda o motorhome front line) */}
                <path d="M125,25 L135,40 L110,40 Z" fill="#E2E5DE" />
                
                {/* Windows (Finestre camper) */}
                <rect x="35" y="28" width="22" height="15" rx="3" fill="#A8D1E7" stroke="#3E4A35" strokeWidth="1.5" />
                <rect x="68" y="28" width="22" height="15" rx="3" fill="#A8D1E7" stroke="#3E4A35" strokeWidth="1.5" />
                <path d="M120,33 L132,45 L116,45 Z" fill="#A8D1E7" stroke="#3E4A35" strokeWidth="1.5" />

                {/* Bottom chassis bumper black */}
                <path d="M16,65 L148,65 L144,70 L20,70 Z" fill="#3D3A36" />

                {/* Left/Right camper wheels */}
                <circle cx="45" cy="74" r="11" fill="#1C1B1A" stroke="#E2DED0" strokeWidth="2" />
                <circle cx="45" cy="74" r="5" fill="#E2DED0" stroke="#3D3A36" strokeWidth="1.5" />
                <circle cx="115" cy="74" r="11" fill="#1C1B1A" stroke="#E2DED0" strokeWidth="2" />
                <circle cx="115" cy="74" r="5" fill="#E2DED0" stroke="#3D3A36" strokeWidth="1.5" />

                {/* Cute RV decal stripes */}
                <path d="M22,50 Q60,42 110,50 Q130,53 143,58" fill="none" stroke="#A45C40" strokeWidth="2" />
                <path d="M22,55 Q60,48 110,54 Q125,56 138,62" fill="none" stroke="#E6A15C" strokeWidth="1.5" />
              </svg>

              {/* Dynamic angle tag pinned above */}
              <div className="absolute top-2 bg-[#313A29] px-2 py-0.5 rounded text-[10px] font-black text-white font-mono shadow-sm">
                ROLLIO: {activeRoll}°
              </div>
            </div>

            {/* Slanted warning alerts overlay */}
            {Math.abs(activeRoll) > 3 && (
              <div className="absolute top-3 left-3 bg-[#A45C40] text-white font-black text-[9px] uppercase px-2 py-1 rounded-md animate-pulse shadow flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                Pendenza Eccessiva!
              </div>
            )}
          </div>

          <div className="space-y-1 mt-1 text-center sm:text-left">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Indicatori di Stabilizzazione</span>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-stone-50 border border-stone-200/40 rounded-xl flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>Asse Posteriore:</span>
                <span className={Math.abs(activePitch) < 1 ? 'text-emerald-700' : 'text-[#A45C40]'}>
                  {activePitch}°
                </span>
              </div>
              <div className="p-2 bg-stone-50 border border-stone-200/40 rounded-xl flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>Inclinaz. Laterale:</span>
                <span className={Math.abs(activeRoll) < 1 ? 'text-emerald-700' : 'text-[#A45C40]'}>
                  {activeRoll}°
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 3: Interactive Ramps & Levelers Advice (Cunei & Livellamento) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="w-full text-left">
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#A45C40]" />
              Consigliere Ralle & Cunei
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Spessori d’altezza ruota consigliati</p>
          </div>

          {/* Leveling Action Checklist */}
          <div className="flex-1 space-y-3">
            {isPerfectLevel ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto animate-bounce" />
                <h4 className="font-extrabold text-[#3E4A35] dark:text-emerald-300 text-xs uppercase tracking-wider">Perfettamente Livellato!</h4>
                <p className="text-[10px] text-emerald-800 dark:text-emerald-100 leading-relaxed max-w-[200px] mx-auto font-medium">
                  I cunei non sono necessari. Puoi bloccare il freno a mano e azionare i piedini di stazionamento, se li possiedi.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="block text-[10px] text-stone-500 uppercase font-black tracking-wider leading-none">
                  Compensazione Ruote Richiesta:
                </span>
                
                {/* Left Wheels compensation indicator */}
                {leftSideRampHeight > 0 && (
                  <div className="p-2.5 bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200/50 dark:border-orange-900 rounded-xl flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-orange-550 bg-[#A45C40] dark:bg-orange-400"></span>
                        <h4 className="font-black text-slate-800 dark:text-slate-100 text-xs">Lato Sinistro (Ruote Sinistre)</h4>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Inserisci i cunei sotto entrambe le ruote di sinistra</p>
                    </div>
                    <span className="bg-[#A45C40] dark:bg-orange-600 text-[#F2EFE9] dark:text-orange-50 px-2.5 py-1 rounded text-xs font-black font-mono">
                      ~ {leftSideRampHeight.toFixed(0)} cm
                    </span>
                  </div>
                )}

                {/* Right Wheels compensation indicator */}
                {rightSideRampHeight > 0 && (
                  <div className="p-2.5 bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200/50 dark:border-orange-900 rounded-xl flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#A45C40] dark:bg-orange-400"></span>
                        <h4 className="font-black text-slate-800 dark:text-slate-100 text-xs">Lato Destro (Ruote Destre)</h4>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Inserisci i cunei sotto entrambe le ruote di destra</p>
                    </div>
                    <span className="bg-[#A45C40] dark:bg-orange-600 text-[#F2EFE9] dark:text-orange-50 px-2.5 py-1 rounded text-xs font-black font-mono">
                      ~ {rightSideRampHeight.toFixed(0)} cm
                    </span>
                  </div>
                )}

                {/* Front Wheels compensation indicator */}
                {frontRampHeight > 0 && (
                  <div className="p-2.5 bg-sky-50/50 dark:bg-sky-950/40 border border-sky-200/50 dark:border-sky-900 rounded-xl flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-sky-400"></span>
                        <h4 className="font-black text-slate-800 dark:text-slate-100 text-xs">Asse Anteriore (Fronte)</h4>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Porta in quota le ruote davanti del camper</p>
                    </div>
                    <span className="bg-sky-600 dark:bg-sky-700 text-white px-2.5 py-1 rounded text-xs font-black font-mono">
                      ~ {frontRampHeight.toFixed(0)} cm
                    </span>
                  </div>
                )}

                {/* Rear Wheels compensation indicator */}
                {rearRampHeight > 0 && (
                  <div className="p-2.5 bg-sky-50/50 dark:bg-sky-950/40 border border-sky-200/50 dark:border-sky-900 rounded-xl flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-sky-400"></span>
                        <h4 className="font-black text-slate-800 dark:text-slate-100 text-xs">Asse Posteriore (Retro)</h4>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Solleva le ruote posteriori o allunga i piedini</p>
                    </div>
                    <span className="bg-sky-600 dark:bg-sky-700 text-white px-2.5 py-1 rounded text-xs font-black font-mono">
                      ~ {rearRampHeight.toFixed(0)} cm
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tips notification */}
          <div className="p-3 bg-stone-50 border border-stone-200/40 rounded-xl flex gap-2 text-[10px] text-slate-500 font-medium leading-relaxed">
            <Info className="w-4 h-4 text-[#3E4A35] shrink-0 mt-0.5" />
            <span>
              Tip: Se non hai i cunei multilivello da sosta, puoi far salire le ruote indicate sopra su sassi piatti resistenti o tavolette in legno massiccio.
            </span>
          </div>
        </div>

      </div>

      {/* Manual Emulator Sliders + Live Orientation Toggle Row */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#3E4A35]" />
              Sorgente Dati Livella & Taratua
            </h3>
            <p className="text-xs text-slate-400 font-medium">Scegli tra i sensori giroscopici del telefono o la calibrazione manuale</p>
          </div>

          {/* Sensor Activate Button */}
          <button
            type="button"
            onClick={isSensorActive ? stopListeningToSensors : requestSensorPermission}
            className={`px-4 py-2.5 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer uppercase tracking-wider flex items-center gap-1.5 ${
              isSensorActive 
                ? 'bg-[#3E4A35] dark:bg-emerald-700 text-white hover:bg-[#5A6B4E] dark:hover:bg-emerald-800' 
                : 'bg-stone-100 dark:bg-slate-700 hover:bg-stone-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-stone-200 dark:border-slate-600'
            }`}
          >
            <Compass className={`w-4 h-4 ${isSensorActive ? 'animate-spin' : ''}`} />
            <span>{isSensorActive ? '📡 Sensori Attivi' : '🔌 Attiva Giroscopio'}</span>
          </button>
        </div>

        {/* Sliders for Manual Emulation (perfect for browsers without gyro/accelerometers, especially on desktop preview!) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100/60">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5 uppercase font-black text-[10px] tracking-wider text-slate-400">
                <RotateCcw className="w-3.5 h-3.5 text-[#3E4A35]" />
                Emula Rollio (Destra / Sinistra)
              </span>
              <span className="bg-[#3E4A35]/10 text-[#3E4A35] px-2 py-0.5 rounded font-bold font-mono">
                {roll > 0 ? `+${roll.toFixed(1)}` : roll.toFixed(1)}°
              </span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="0.1"
              disabled={isSensorActive}
              value={roll}
              onChange={(e) => setRoll(parseFloat(e.target.value))}
              className="w-full accent-[#3E4A35] h-1.5 bg-slate-100 rounded-lg cursor-pointer disabled:opacity-50"
            />
            <div className="flex justify-between text-[8px] text-slate-400 font-bold">
              <span>← Sinistra (-12°)</span>
              <span>In piano (0°)</span>
              <span>Destra (+12°) →</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5 uppercase font-black text-[10px] tracking-wider text-slate-400">
                <RotateCcw className="w-3.5 h-3.5 text-[#3E4A35]" />
                Emula Beccheggio (Fronte / Retro)
              </span>
              <span className="bg-[#3E4A35]/10 text-[#3E4A35] px-2 py-0.5 rounded font-bold font-mono">
                {pitch > 0 ? `+${pitch.toFixed(1)}` : pitch.toFixed(1)}°
              </span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="0.1"
              disabled={isSensorActive}
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="w-full accent-[#3E4A35] h-1.5 bg-slate-100 rounded-lg cursor-pointer disabled:opacity-50"
            />
            <div className="flex justify-between text-[8px] text-slate-400 font-bold">
              <span>← Fronte (-12°)</span>
              <span>In piano (0°)</span>
              <span>Retro (+12°) →</span>
            </div>
          </div>
        </div>

        {isSensorActive && (
          <div className="p-3 bg-emerald-50 border border-emerald-250/30 rounded-xl text-[10px] text-emerald-800 font-medium flex items-center gap-1.5">
            <Info className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>I cursori di calibrazione manuale sono disattivati temporaneamente perché la livella sta leggendo in tempo reale l’inclinazione fisica del tuo cellulare o tablet. Disattiva il Giroscopio per ritornare alla regolazione manuale.</span>
          </div>
        )}
      </div>

    </div>
  );
}
