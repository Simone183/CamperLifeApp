/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  MapPin,
  Flame,
  Volume2,
  VolumeX,
  Play,
  Square,
  Copy,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Eye,
  Info,
  Sliders,
  Send,
  Lock,
  Compass,
  AlertCircle
} from 'lucide-react';

interface SecurityCriteria {
  lighting: 'dark' | 'dim' | 'bright';
  peersCount: 'zero' | 'some' | 'many';
  visibility: 'hidden' | 'partial' | 'exposed';
  escapeRoutes: 'none' | 'blocked' | 'open';
  policeNearby: 'far' | 'medium' | 'close';
}

export function CamperSecurityTab({ currentUser, userLocation }: { currentUser: any; userLocation: [number, number] | null }) {
  // 1. RISK ASSESSMENT STATES
  const [criteria, setCriteria] = React.useState<SecurityCriteria>({
    lighting: 'dim',
    peersCount: 'some',
    visibility: 'partial',
    escapeRoutes: 'open',
    policeNearby: 'medium'
  });

  const safetyScore = React.useMemo(() => {
    let score = 50;

    // Lighting
    if (criteria.lighting === 'dark') score -= 15;
    if (criteria.lighting === 'bright') score += 15;

    // Peers
    if (criteria.peersCount === 'zero') score -= 20;
    if (criteria.peersCount === 'many') score += 20;

    // Visibility
    if (criteria.visibility === 'hidden') score -= 10;
    if (criteria.visibility === 'exposed') score += 10;

    // Escape Routes
    if (criteria.escapeRoutes === 'none') score -= 25;
    if (criteria.escapeRoutes === 'open') score += 15;

    // Police Nearby
    if (criteria.policeNearby === 'far') score -= 10;
    if (criteria.policeNearby === 'close') score += 10;

    return Math.max(0, Math.min(100, score));
  }, [criteria]);

  const [scoreColor, scoreText, scoreDesc] = React.useMemo(() => {
    if (safetyScore >= 80) {
      return [
        'bg-emerald-500 text-white border-emerald-600',
        'Sosta Altamente Sicura (A+)',
        'Area molto sicura per passare la notte. Presenza di altri equipaggi, buona visibilità e via di fuga libera. Riposo sereno!'
      ];
    } else if (safetyScore >= 55) {
      return [
        'bg-amber-500 text-white border-amber-600',
        'Sosta Moderata / Monitorata (B)',
        'Sicurezza sufficiente, ma si raccomanda cautela. Chiudi tutte le mandate delle serrature esterne e tieni attivi i sensori di perimetro.'
      ];
    } else {
      return [
        'bg-rose-600 text-white border-rose-700',
        'Sosta ad Alto Rischio (C-)',
        'Area isolata, buia o senza adeguate vie di fuga immediate. Si consiglia vivamente di considerare il trasferimento in una zona più frequentata o illuminata prima di coricarsi.'
      ];
    }
  }, [safetyScore]);

  // 2. SOS PRESETS GENERATOR STATES
  const [emergencyType, setEmergencyType] = React.useState<'mechanical' | 'medical' | 'intrusion' | 'weather'>('mechanical');
  const [copiedSOS, setCopiedSOS] = React.useState(false);

  const lat = userLocation ? Number(userLocation[0]).toFixed(6) : '41.902782';
  const lng = userLocation ? Number(userLocation[1]).toFixed(6) : '12.496366';

  const generatedSOSTemplate = React.useMemo(() => {
    const header = "🚨 RICHIESTA ASSISTENZA EMERGENCY CAMPER 🚨";
    const locMessage = `Posizione geografica: https://www.google.com/maps/search/?api=1&query=${lat},${lng}\nCoordinate GPS: ${lat}, ${lng}`;
    
    let cause = '';
    if (emergencyType === 'mechanical') {
      cause = "Siamo fermi con il camper per un guasto meccanico improvviso (panne d'avviamento/impianti). Richiediamo supporto di officina o traino nelle vicinanze.";
    } else if (emergencyType === 'medical') {
      cause = "Emergenza di salute a bordo del camper. Richiediamo intervento sanitario urgente o medico di guardia.";
    } else if (emergencyType === 'intrusion') {
      cause = "Sospetta intrusione o minaccia esterna attiva presso il nostro camper in sosta di notte. Richiediamo forze dell'ordine urgente.";
    } else {
      cause = "Siamo bloccati a causa di condizioni climatiche avverse (neve alta, fango profondo, esondazione fluviale). Richiediamo assistenza per trazione o soccorso civile.";
    }

    return `${header}\n\nTipo: ${cause}\n\n${locMessage}\n\nInviato tramite la Console Sicurezza Attiva ViaCamper.`;
  }, [emergencyType, lat, lng]);

  const handleCopySOS = () => {
    navigator.clipboard.writeText(generatedSOSTemplate);
    setCopiedSOS(true);
    setTimeout(() => setCopiedSOS(false), 2500);
  };

  // 3. ACOUSTIC DETERRENT SIREN STATES (Web Audio API)
  const [sirenPlaying, setSirenPlaying] = React.useState(false);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const oscRef1 = React.useRef<OscillatorNode | null>(null);
  const oscRef2 = React.useRef<OscillatorNode | null>(null);
  const gainRef = React.useRef<GainNode | null>(null);
  const sweepIntervalRef = React.useRef<any>(null);

  const startSiren = React.useCallback(() => {
    try {
      if (sirenPlaying) return;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        alert("Web Audio API non supportata da questo browser.");
        return;
      }

      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';

      // Set moderate volumes to avoid hurting eardrums but be effective
      gainNode.gain.setValueAtTime(0.25, ctx.currentTime);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscRef1.current = osc1;
      oscRef2.current = osc2;
      gainRef.current = gainNode;

      osc1.start();
      osc2.start();
      setSirenPlaying(true);

      // Program intermediate sweep frequencies to create real-sounding retro horn/siren alarms
      let high = false;
      sweepIntervalRef.current = setInterval(() => {
        if (!oscRef1.current || !oscRef2.current || !ctx) return;
        const targetFreq1 = high ? 1100 : 780;
        const targetFreq2 = high ? 520 : 380;
        oscRef1.current.frequency.exponentialRampToValueAtTime(targetFreq1, ctx.currentTime + 0.35);
        oscRef2.current.frequency.exponentialRampToValueAtTime(targetFreq2, ctx.currentTime + 0.45);
        high = !high;
      }, 500);

    } catch (err) {
      console.error("Sirena d'allarme fallita:", err);
    }
  }, [sirenPlaying]);

  const stopSiren = React.useCallback(() => {
    try {
      if (sweepIntervalRef.current) {
        clearInterval(sweepIntervalRef.current);
        sweepIntervalRef.current = null;
      }
      if (oscRef1.current) {
        oscRef1.current.stop();
        oscRef1.current = null;
      }
      if (oscRef2.current) {
        oscRef2.current.stop();
        oscRef2.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      setSirenPlaying(false);
    } catch (err) {
      console.error("Errore arresto sirena:", err);
    }
  }, []);

  // Clean-up AudioContext on component unmount
  React.useEffect(() => {
    return () => {
      if (sweepIntervalRef.current) clearInterval(sweepIntervalRef.current);
      if (oscRef1.current) { try { oscRef1.current.stop(); } catch(e){} }
      if (oscRef2.current) { try { oscRef2.current.stop(); } catch(e){} }
      if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch(e){} }
    };
  }, []);


  // 4. CHANGER SERRATURE & PROTOCOLLO SICUREZZA CHECKLIST (Saves to state internally)
  const [closuresState, setClosuresState] = React.useState({
    finestreOblo: true,
    chiusuraPortiere: true,
    allarmePerimetrale: true,
    trioGasAttivo: true
  });

  const toggleClosure = (key: keyof typeof closuresState) => {
    setClosuresState(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isClosuresPerfect = Object.values(closuresState).every(v => v === true);

  return (
    <div className="space-y-6 font-sans select-none animate-fade-in">
      
      {/* Visual Header */}
      <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4 pointer-events-none">
          <Lock className="w-56 h-56 stroke-[1.12]" />
        </div>
        
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase font-black tracking-widest bg-emerald-600 px-2.5 py-1 rounded-full text-white">
              Sicurezza Attiva 🛡️
            </span>
            <span className="text-[10px] text-slate-350 font-bold bg-[#A45C40]/35 px-2.5 py-1 rounded-full border border-slate-500/25">
              Protocollo Notturno
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Console Sicurezza & Sostbilità Notturna</h2>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Strumenti intelligenti per analizzare il grado di rischio sosta libera, generare moduli SOS con rilievo GPS preciso e attivare deterrenti acustici in caso d'emergenza.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CRITERIA ASSESSMENT & SAFETY RATING */}
        <div className="lg:col-span-6 space-y-5">
          
          {/* Section A: Live Risk Assessment */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 space-y-4">
            <h3 className="font-bold text-[#3E4A35] text-sm flex items-center gap-2 border-b border-stone-100 pb-2.5">
              <Sliders className="w-4.5 h-4.5 text-[#3E4A35]" />
              Valutatore dei Rischi di Sosta Libera
            </h3>

            {/* Assessment Slider/Selectors */}
            <div className="space-y-3.5">
              
              {/* 1. Lighting Indicator */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-wide block">
                  1. Illuminazione Lampioni dell'Area
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'dark', label: '🌑 Buio Totale' },
                    { val: 'dim', label: '🌤️ Penombra/Isolati' },
                    { val: 'bright', label: '💡 Buona Luce' }
                  ].map(item => (
                    <button
                      key={item.val}
                      onClick={() => setCriteria(prev => ({ ...prev, lighting: item.val as any }))}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center ${
                        criteria.lighting === item.val
                          ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-3xs'
                          : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Camper Peers Density */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-wide block">
                  2. Altri Camper Accanto a Te
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'zero', label: '🧑‍🚀 Sei da solo' },
                    { val: 'some', label: '⛺ 1-2 Equipaggi' },
                    { val: 'many', label: '🚐 Più camper' }
                  ].map(item => (
                    <button
                      key={item.val}
                      onClick={() => setCriteria(prev => ({ ...prev, peersCount: item.val as any }))}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center ${
                        criteria.peersCount === item.val
                          ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-3xs'
                          : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Road Visibility / Hidden from main arteries */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-wide block">
                  3. Esposizione & Visibilità Strada
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'hidden', label: '🌲 Molto Nascosto' },
                    { val: 'partial', label: '⚖️ Parziale' },
                    { val: 'exposed', label: '🚗 Molto Esposto' }
                  ].map(item => (
                    <button
                      key={item.val}
                      onClick={() => setCriteria(prev => ({ ...prev, visibility: item.val as any }))}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center ${
                        criteria.visibility === item.val
                          ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-3xs'
                          : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Via di Fuga Libera */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-wide block">
                  4. Via di Fuga per Manovra Rapida
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'none', label: '🛑 Vicolo Cieco' },
                    { val: 'blocked', label: '⚠️ Retromarcia Obbl.' },
                    { val: 'open', label: '🟢 Avanti Libero' }
                  ].map(item => (
                    <button
                      key={item.val}
                      onClick={() => setCriteria(prev => ({ ...prev, escapeRoutes: item.val as any }))}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center ${
                        criteria.escapeRoutes === item.val
                          ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-3xs'
                          : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Section B: Rating Output Card */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 flex flex-col justify-between space-y-4">
            <div className="text-center space-y-1">
              <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">Confidence Rating Sostabilità</span>
              <div className="flex items-baseline justify-center gap-1.5">
                <span className={`text-4.5xl font-black tracking-tighter ${
                  safetyScore >= 80 
                    ? 'text-emerald-600' 
                    : safetyScore >= 55 
                      ? 'text-amber-500' 
                      : 'text-rose-600'
                }`}>{safetyScore}%</span>
                <span className="text-xs font-bold text-slate-400">Puntata Sicurezza</span>
              </div>
            </div>

            {/* Custom Meter Screen */}
            <div className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
              <span className={`text-xs font-black uppercase tracking-wider block ${
                safetyScore >= 80 
                  ? 'text-emerald-700' 
                  : safetyScore >= 55 
                    ? 'text-amber-800' 
                    : 'text-rose-800'
              }`}>
                {scoreText}
              </span>
              <p className="text-[11px] leading-relaxed text-slate-600 font-medium">
                {scoreDesc}
              </p>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[10.5px] leading-relaxed text-stone-500 flex gap-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>La sosta libera responsabile impone di non ostruire mai altri veicoli agrari, non sfoderare tendalini o gradini mobili sul suolo pubblico di notte (configura campeggio abusivo), e rispettare la natura.</span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SOS GENERATOR & DETERRENTS */}
        <div className="lg:col-span-6 space-y-5">
          
          {/* Section C: Web Audio Anti-Theft Alarm Siren testing */}
          {false && (
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-2.5">
              <h3 className="font-bold text-[#3E4A35] text-sm flex items-center gap-2">
                <Volume2 className="w-4.5 h-4.5 text-rose-600 animate-pulse" />
                Deterrente Acustico Anti-Intrusione (Beacon)
              </h3>
              <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase">
                Acustico Activo
              </span>
            </div>

            <p className="text-xs leading-relaxed text-slate-500">
              In caso di rumori sospetti d'attacco o aggiramento di animali selvatici, puoi innescare questo segnale intermittente ad alta frequenza nel browser per scoraggiare e segnalare l'emergenza acusticamente.
            </p>

            <div className="flex items-center gap-3 bg-rose-50/50 border border-rose-150 p-3 rounded-xl">
              {sirenPlaying ? (
                <button
                  onClick={stopSiren}
                  className="w-12 h-12 bg-rose-650 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center rounded-xl cursor-pointer transition-transform shadow-md shrink-0"
                >
                  <Square className="w-6 h-6 fill-white" />
                </button>
              ) : (
                <button
                  onClick={startSiren}
                  className="w-12 h-12 bg-[#3E4A35] hover:bg-[#5A6B4E] active:scale-95 text-white flex items-center justify-center rounded-xl cursor-pointer transition-transform shadow-md shrink-0"
                >
                  <Play className="w-5 h-5 fill-white" />
                </button>
              )}

              <div className="text-xs select-none min-w-0">
                <span className="font-black text-slate-800 block">
                  {sirenPlaying ? "🚨 SIRENA IN CORSO! TONO ATTIVO" : "⏱️ Testa il Deterrente Acustico"}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold block leading-tight truncate">
                  {sirenPlaying ? "Intervallo sinusoidale bitonale d'emergenza in loop." : "Riproduce un segnale sonoro alternato forte."}
                </span>
              </div>
            </div>
          </div>
          )}

          {/* Section D: Emergency SOS Template copy-paste */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 space-y-4">
            <h3 className="font-bold text-[#3E4A35] text-sm flex items-center gap-2 border-b border-stone-100 pb-2.5">
              <Compass className="w-4.5 h-4.5 text-[#3E4A35]" />
              Generatore Messaggio SOS Istantaneo
            </h3>

            {/* Selector for type of support required */}
            <div className="space-y-1">
              <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-wide block">
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
                        ? 'bg-[#3E4A35] text-white border-[#3E4A35]'
                        : 'bg-white hover:bg-slate-50 text-slate-650 border-slate-200'
                    }`}
                  >
                    {opt.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Generated template mockup screen */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10.5px] font-black text-slate-400 uppercase tracking-wider">
                <span>Contenuto SMS / Whatsapp generato</span>
                <span className="text-emerald-700 lowercase font-mono">📍 coordinates attached</span>
              </div>
              
              <div className="bg-slate-900 text-emerald-450 p-3.5 rounded-xl text-[11px] font-mono leading-relaxed border border-slate-950 whitespace-pre-wrap select-text max-h-48 overflow-y-auto min-h-24">
                {generatedSOSTemplate}
              </div>
            </div>

            <button
              onClick={handleCopySOS}
              className={`w-full py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
                copiedSOS 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300/30'
              }`}
            >
              {copiedSOS ? (
                <>
                  <CheckCircle className="w-4 h-4 animate-bounce" />
                  SOS Copiato in Appunti! Pronti all'invio
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copia negli Appunti
                </>
              )}
            </button>
          </div>

          {/* Section E: physical closures checklist for night storage */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 space-y-4">
            <h3 className="font-bold text-[#3E4A35] text-sm flex items-center gap-2 border-b border-stone-100 pb-2.5">
              <Lock className="w-4.5 h-4.5 text-emerald-800" />
              Serrande & Sicurezza Fisica di Bordo
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div
                onClick={() => toggleClosure('finestreOblo')}
                className="flex items-center gap-2.5 p-2 bg-stone-50 border border-stone-150 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors"
              >
                <div className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border transition-all ${
                  closuresState.finestreOblo ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-white border-slate-350'
                }`}>
                  {closuresState.finestreOblo && '✓'}
                </div>
                <div className="min-w-0 pr-1">
                  <span className="font-extrabold text-slate-800 block">Finestre ed oblò</span>
                  <span className="text-[10px] text-slate-450 font-semibold block uppercase leading-none">Doppia Mandata</span>
                </div>
              </div>

              <div
                onClick={() => toggleClosure('chiusuraPortiere')}
                className="flex items-center gap-2.5 p-2 bg-stone-50 border border-stone-150 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors"
              >
                <div className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border transition-all ${
                  closuresState.chiusuraPortiere ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-white border-slate-350'
                }`}>
                  {closuresState.chiusuraPortiere && '✓'}
                </div>
                <div className="min-w-0 pr-1">
                  <span className="font-extrabold text-slate-800 block">Chiusura portiere</span>
                  <span className="text-[10px] text-slate-450 font-semibold block uppercase leading-none">Cabina & Cellula</span>
                </div>
              </div>

              <div
                onClick={() => toggleClosure('allarmePerimetrale')}
                className="flex items-center gap-2.5 p-2 bg-stone-50 border border-stone-150 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors"
              >
                <div className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border transition-all ${
                  closuresState.allarmePerimetrale ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-white border-slate-350'
                }`}>
                  {closuresState.allarmePerimetrale && '✓'}
                </div>
                <div className="min-w-0 pr-1">
                  <span className="font-extrabold text-slate-800 block">Inserimento allarme</span>
                  <span className="text-[10px] text-slate-450 font-semibold block uppercase leading-none">Perimetrale inserito</span>
                </div>
              </div>

              <div
                onClick={() => toggleClosure('trioGasAttivo')}
                className="flex items-center gap-2.5 p-2 bg-stone-50 border border-stone-150 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors"
              >
                <div className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border transition-all ${
                  closuresState.trioGasAttivo ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-white border-slate-350'
                }`}>
                  {closuresState.trioGasAttivo && '✓'}
                </div>
                <div className="min-w-0 pr-1">
                  <span className="font-extrabold text-slate-800 block">Rilevatore TrioGas</span>
                  <span className="text-[10px] text-slate-450 font-semibold block uppercase leading-none">Test Attivo (12V)</span>
                </div>
              </div>
            </div>

            {isClosuresPerfect ? (
              <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-250 rounded-xl flex items-center gap-2 font-semibold text-xs leading-normal">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tutti i controlli fisici e chiusure perimetrali di sicurezza per la notte sono in regola. Sveglia protetta!</span>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 text-amber-900 border border-amber-250 rounded-xl flex items-center gap-2 font-semibold text-xs leading-normal">
                <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                <span>Hai delle chiusure non spuntate. Prima di dormire o lasciare incustodito il mezzo, verifica ogni mandata.</span>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
