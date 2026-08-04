/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAppSettings } from '../useAppSettings';
import { formatSpeed, parseDimToNumber, formatMeters } from '../unit-helpers';
import { Place, VehicleDimensions } from '../types';
import { applyTtsVoiceAndPitch } from '../utils/ttsHelper';
import { Compass, Volume2, VolumeX, Play, Pause, AlertTriangle, ArrowUpRight, ArrowLeftRight, Navigation, RefreshCw, Eye, EyeOff, Search, Map, ShieldAlert, Check } from 'lucide-react';

interface NavTabProps {
  activeDestination: Place | null;
  vehicleDimensions: VehicleDimensions;
  places: Place[];
  onSelectPlaceDirectly: (place: Place) => void;
  onNavigateFullscreen?: () => void;
  userLocation: { lat: number; lng: number } | null;
  userAccuracy: number | null;
  isGPSEnabled: boolean;
  onGPSEnabledChange: (enabled: boolean) => void;
}

interface SimulatedStep {
  distanceLeft: number; // meters
  heading: string;
  instruction: string;
  warning?: string;
  isViolation?: boolean;
}

let navTabLastSpokenText = "";
let navTabLastSpokenTime = 0;

export default function NavTab({
  activeDestination,
  vehicleDimensions,
  places,
  onSelectPlaceDirectly,
  onNavigateFullscreen,
  userLocation,
  userAccuracy,
  isGPSEnabled,
  onGPSEnabledChange,
}: NavTabProps) {
  const settings = useAppSettings();
  const [isDriving, setIsDriving] = React.useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = React.useState<number>(0);
  const [voiceEnabled, setVoiceEnabled] = React.useState<boolean>(true);
  const [simulatedSpeed, setSimulatedSpeed] = React.useState<number>(55); // km/h
  const [distanceTraveled, setDistanceTraveled] = React.useState<number>(0);
  const [customDestination, setCustomDestination] = React.useState<Place | null>(null);

  // Haversine formula to compute distance in meters
  const calculateDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Sound and Vocal Guidance helper
  const speakInstruction = (text: string) => {
    if (!voiceEnabled || !text) return;
    
    // Clean emojis and double spaces
    const cleanText = text
      .replace(/[👋👋🏻👋🏼👋🏽👋🏾👋🏿🚗🚐📍⏱️⛰️🌲🌅🏕️🗺️🚨⛔⚠️⚓🌦️🌧️⛈️⛱️💤🔋🚰🎵📻📻✨]/g, "")
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
      .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, "")
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    // Temporal deduplication using the module-level variables (e.g., 4 seconds)
    const now = Date.now();
    if (navTabLastSpokenText === cleanText && (now - navTabLastSpokenTime) < 4000) {
      return;
    }
    navTabLastSpokenText = cleanText;
    navTabLastSpokenTime = now;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      applyTtsVoiceAndPitch(utterance, settings.ttsGender || 'auto');
      window.speechSynthesis.speak(utterance);
    }
  };

  // Compute a list of instructions based on destination
  const dest = customDestination || activeDestination || places[0];

  // Computed live distance from user device's sensor
  const liveDistance = React.useMemo(() => {
    if (!userLocation || !dest) return null;
    return calculateDistanceInMeters(userLocation.lat, userLocation.lng, dest.lat, dest.lng);
  }, [userLocation, dest]);

  const stepsList = React.useMemo((): SimulatedStep[] => {
    if (!dest) {
      return [
        { distanceLeft: 1200, heading: "NORD", instruction: "Dritto su S.S. Gardesana Est" }
      ];
    }

    const needsHeightViolation = dest.hasMaxHeightLimit && dest.maxHeight && parseDimToNumber(vehicleDimensions.height) > dest.maxHeight;
    const needsWeightViolation = dest.hasMaxWeightLimit && dest.maxWeight && parseDimToNumber(vehicleDimensions.weight) > dest.maxWeight;

    // IF REAL GPS IS CONNECTED AND ACTIVE
    if (isGPSEnabled && userLocation && liveDistance !== null) {
      const distanceMeters = Math.round(liveDistance);
      const list: SimulatedStep[] = [];

      if (distanceMeters > 5000) {
        list.push({
          distanceLeft: distanceMeters,
          heading: "NW",
          instruction: `Navigazione GPS Reale: Rimani su statale per ${(distanceMeters / 1000).toFixed(1)} km verso ${dest.address.split(',')[0]} (Destinazione: ${dest.name})`
        });
      } else if (distanceMeters > 1500) {
        list.push({
          distanceLeft: distanceMeters,
          heading: "NW",
          instruction: `Mantieni la carreggiata in avvicinamento a ${dest.name}. La sosta dista ${(distanceMeters / 1000).toFixed(1)} km.`
        });
      } else if (distanceMeters > 400) {
        list.push({
          distanceLeft: distanceMeters,
          heading: "EST",
          instruction: `Consigliata svolta a destra tra circa ${Math.max(100, distanceMeters - 200)} metri per imboccare la corsia di decelerazione d'ingresso.`
        });
      }

      if (dest.isNarrowAccess) {
        list.push({
          distanceLeft: Math.min(distanceMeters, 350),
          heading: "NORD",
          instruction: `Attenzione: Accesso stretto secondario per ${dest.name}! Riduci l'andatura.`,
          warning: "Carreggiata stretta imminente: Larghezza camper consigliata max 2.20m."
        });
      }

      if (needsHeightViolation) {
        list.push({
          distanceLeft: Math.min(distanceMeters, 200),
          heading: "EST",
          instruction: `BLOCCO NAVIGAZIONE: Altezza massima consentita di ${dest.maxHeight} metri superata!`,
          warning: `🚨 ALLERTA SAGOMA: Il tuo camper è alto ${vehicleDimensions.height}m mentre la sosta ha un limite di ${dest.maxHeight}m. Scegli un'area sosta alternativa!`,
          isViolation: true
        });
      } else if (needsWeightViolation) {
        list.push({
          distanceLeft: Math.min(distanceMeters, 250),
          heading: "EST",
          instruction: `Limite di portata ponte: ${dest.maxWeight} tonnellate!`,
          warning: `Rilevamento peso: Il tuo camper pesa ${vehicleDimensions.weight}t. Questa rotta è inibita!`,
          isViolation: true
        });
      } else {
        list.push({
          distanceLeft: Math.min(distanceMeters, 150),
          heading: "EST",
          instruction: `Sei arrivato! Il punto di sosta ${dest.name} si trova sulla tua destra.`
        });
      }

      return list;
    }

    // Simulators default list
    const list: SimulatedStep[] = [
      {
        distanceLeft: 2200,
        heading: "NE",
        instruction: `Imbocca la statale principale in direzione ${dest.address.split(',')[1] || 'Destinazione'}`
      },
      {
        distanceLeft: 1400,
        heading: "NE",
        instruction: "Alla rotonda prendi la 2ª uscita su via Nazionale"
      },
      {
        distanceLeft: 700,
        heading: "EST",
        instruction: "Svolta a destra tra 200 metri e imbocca la strada collinare d'accesso"
      }
    ];

    if (dest.isNarrowAccess) {
      list.push({
        distanceLeft: 450,
        heading: "NORD",
        instruction: "Attenzione: Accesso secondario e carreggiata molto stretta! Ridurre la velocità ed evitare sorpassi.",
        warning: "Strettoia imminente: Consigliata larghezza massima 2.20m."
      });
    }

    if (needsHeightViolation) {
      list.push({
        distanceLeft: 250,
        heading: "EST",
        instruction: `BLOCCO NAVIGAZIONE: Sottopassaggio ferroviario limitato a ${dest.maxHeight} metri!`,
        warning: `🚨 PERICOLO ALTEZZA: Il tuo camper è alto ${vehicleDimensions.height}m. IMPOSSIBILE PROSEGUIRE! Rischio collisione catastrofica. Effettua inversione ad U!`,
        isViolation: true
      });
    } else if (needsWeightViolation) {
      list.push({
        distanceLeft: 300,
        heading: "EST",
        instruction: `Restrizione di portata su ponte: limite massimo ${dest.maxWeight} tonnellate!`,
        warning: `Adempimento Tonico: Il tuo mezzo pesa ${vehicleDimensions.weight}t. Scegli rotta alternativa.`,
        isViolation: true
      });
    } else {
      list.push({
        distanceLeft: 150,
        heading: "EST",
        instruction: `Destinazione d'arrivo ${dest.name} sulla destra. Benvenuto!`
      });
    }

    return list;
  }, [dest, vehicleDimensions, isGPSEnabled, userLocation, liveDistance]);

  const currentStep = stepsList[currentStepIndex] || stepsList[0];

  // GPS routing automated step synchronization based on physical distance
  React.useEffect(() => {
    if (isGPSEnabled && liveDistance !== null) {
      const distanceMeters = Math.round(liveDistance);
      if (distanceMeters > 5000) {
        setCurrentStepIndex(0);
      } else if (distanceMeters > 1500) {
        setCurrentStepIndex(Math.min(1, stepsList.length - 1));
      } else if (distanceMeters > 400) {
        setCurrentStepIndex(Math.min(2, stepsList.length - 1));
      } else {
        setCurrentStepIndex(Math.max(0, stepsList.length - 1));
      }
    }
  }, [isGPSEnabled, liveDistance, stepsList]);

  // Simulation play ticker (only active when live GPS is off)
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isDriving && !isGPSEnabled) {
      timer = setInterval(() => {
        // progress distance
        setCurrentStepIndex((prev) => {
          const nextIndex = prev + 1;
          if (nextIndex < stepsList.length) {
            const nextStepObj = stepsList[nextIndex];
            // speak the new instruction!
            speakInstruction(nextStepObj.instruction + (nextStepObj.warning ? '. ' + nextStepObj.warning : ''));
            return nextIndex;
          } else {
            setIsDriving(false);
            speakInstruction("Sei arrivato a destinazione in sicurezza.");
            return 0; // reset
          }
        });
      }, 7000); // changes step every 7 seconds
    }
    return () => clearInterval(timer);
  }, [isDriving, isGPSEnabled, stepsList]);

  // Vocal alerts on step change to guarantee driving focus
  React.useEffect(() => {
    if (currentStep) {
      speakInstruction(currentStep.instruction + (currentStep.warning ? '. ' + currentStep.warning : ''));
    }
  }, [currentStepIndex, dest?.id]);

  const handleTogglePlay = () => {
    if (isGPSEnabled) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: "ℹ️ La navigazione GPS reale è automatica e segue i tuoi spostamenti fisici. Non serve avviare la simulazione." }
      }));
      return;
    }
    const nextState = !isDriving;
    setIsDriving(nextState);
  };

  const currentWarning = currentStep?.warning;

  return (
    <div className="space-y-6">
      {/* Driving Dashboard Layout */}
      <div className="bg-[#2D2926] text-[#F5F2ED] rounded-3xl p-6 shadow-xl border border-white/5 flex flex-col gap-6 relative overflow-hidden">
        {/* Subtle radial ambient map lighting */}
        <div className="absolute right-0 bottom-0 w-80 h-80 bg-[#5A6B4E]/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* HUD Top Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-[#5A6B4E]/20 text-[#5A6B4E] rounded-2xl border border-[#5A6B4E]/30">
              <Navigation className="w-6 h-6 animate-pulse" />
            </span>
            <div>
              <span className="text-[10px] font-black tracking-widest text-[#5A6B4E] uppercase">Modalità Guida Attiva</span>
              <h2 className="text-xl font-bold font-sans tracking-tight text-white">{dest?.name || 'Seleziona una meta'}</h2>
              <p className="text-xs text-slate-350">{dest?.address || 'Via e coordinate non impostate'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Real GPS Toggle button */}
            <button
              onClick={() => {
                onGPSEnabledChange(!isGPSEnabled);
                if (!isGPSEnabled) {
                  speakInstruction("Ricerca segnale satellitare. Consenti permessi di geolocalizzazione.");
                } else {
                  speakInstruction("Simulatore di viaggio ripristinato.");
                }
              }}
              className={`p-3 rounded-2xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                isGPSEnabled 
                  ? 'bg-blue-600 text-white border border-blue-400 animate-pulse' 
                  : 'bg-white/5 text-slate-350 border border-white/10 hover:bg-white/10'
              }`}
              title={isGPSEnabled ? 'Disattiva segnale GPS reale' : 'Attiva tracciamento GPS reale'}
            >
              <span className={`w-2 h-2 rounded-full ${isGPSEnabled ? 'bg-white animate-ping' : 'bg-slate-500'}`}></span>
              <span>{isGPSEnabled ? 'GPS ATTIVO' : 'USA GPS REALE'}</span>
            </button>

            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                speakInstruction(voiceEnabled ? "" : "Voce attiva");
              }}
              className={`p-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                voiceEnabled ? 'bg-[#5A6B4E]/25 text-white border border-[#5A6B4E]/40' : 'bg-white/5 text-slate-400 border border-white/10'
              }`}
              title={voiceEnabled ? 'Disattiva messaggi vocali' : 'Attiva messaggi vocali'}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              <span className="hidden sm:inline">{voiceEnabled ? 'Voce ON' : 'Muto'}</span>
            </button>

            <button
              onClick={() => {
                setCurrentStepIndex(0);
                setIsDriving(false);
              }}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl border border-slate-700 transition-all text-xs font-bold"
              title="Ricalcola Percorso"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {onNavigateFullscreen && (
              <button
                onClick={onNavigateFullscreen}
                className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl border border-emerald-550 transition-all text-xs font-black animate-pulse flex items-center gap-1.5 cursor-pointer shadow-md"
                title="Espandi a tutto schermo"
              >
                <Compass className="w-5 h-5" />
                <span>TUTTO SCHERMO</span>
              </button>
            )}
          </div>
        </div>

        {/* Driving core indicators: Speed, heights, violations info */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Main direction card - Designed with massive text for easy glance at the wheel */}
          <div className="md:col-span-8 bg-white/5 p-6 rounded-2xl border border-white/10 flex flex-col justify-between min-h-[220px]">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[11px] font-mono tracking-widest text-slate-400 font-bold uppercase">
                <span>
                  {isGPSEnabled && userLocation 
                    ? `Distanza reale: ${formatMeters(currentStep?.distanceLeft, true)}`
                    : `Prossima Manovra a ${formatMeters(currentStep?.distanceLeft, true)}`
                  }
                </span>
                <span>
                  {isGPSEnabled && userLocation 
                    ? `COORD: ${userLocation.lat.toFixed(5)}°, ${userLocation.lng.toFixed(5)}°`
                    : `BUSSOLA: ${currentStep?.heading}`
                  }
                </span>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-4 bg-[#A45C40] text-white font-black rounded-2xl mt-1 text-2xl">
                  <ArrowUpRight className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 font-sans tracking-tight leading-snug">
                    {currentStep?.instruction}
                  </h1>
                </div>
              </div>
            </div>

            {/* Vocal simulation transcript */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 mt-4 flex items-center gap-2.5 text-white/90 font-medium text-xs">
              <Volume2 className="w-4 h-4 text-[#5A6B4E] flex-shrink-0" />
              <span>Vocale ViaCamper: &quot;{currentStep?.instruction}&quot;</span>
            </div>
          </div>

          {/* Quick instrumentation values: Speed, Height set, Clock */}
          <div className="md:col-span-4 grid grid-cols-2 gap-4">
            {/* Speedometer */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center flex flex-col justify-center">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                {isGPSEnabled ? 'Stato Segnale' : 'Velocità'}
              </span>
              <p className={`text-3xl font-black font-mono mt-1 ${isGPSEnabled ? 'text-blue-400 text-xl' : 'text-[#5A6B4E]'}`}>
                {isGPSEnabled ? 'CONNESSO' : (isDriving ? `${formatSpeed(simulatedSpeed, settings)}` : '${formatSpeed(0, settings)}')}
              </p>
              <span className="text-[10px] text-white/55 font-mono">
                {isGPSEnabled ? 'Aggiornamenti Live' : 'km/h simulator'}
              </span>

              {isGPSEnabled ? (
                <div className="mt-3 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <span className="text-[9px] text-blue-300 font-extrabold block">Accuratezza: ±{userAccuracy ? Math.round(userAccuracy) : 15}m</span>
                </div>
              ) : (
                <div className="flex justify-center gap-2 mt-3.5">
                  <button
                    onClick={() => setSimulatedSpeed((s) => Math.max(10, s - 10))}
                    disabled={!isDriving}
                    className="px-2 py-1 bg-white/10 hover:bg-white/15 disabled:opacity-40 rounded font-bold font-mono text-xs text-white"
                  >
                    -
                  </button>
                  <button
                    onClick={() => setSimulatedSpeed((s) => Math.min(130, s + 10))}
                    disabled={!isDriving}
                    className="px-2 py-1 bg-white/10 hover:bg-white/15 disabled:opacity-40 rounded font-bold font-mono text-xs text-white"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            {/* Configured Height visual lock gauge */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center flex flex-col justify-center">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Altezza Camper</span>
              <p className="text-3xl font-black text-[#5A6B4E] font-mono mt-1">{vehicleDimensions.height}m</p>
              <p className="text-[9px] text-white/50 truncate mt-1">L: {vehicleDimensions.width}m • Peso: {vehicleDimensions.weight}t</p>
              <div className="text-[9px] mt-2 text-[#5A6B4E] font-bold bg-[#5A6B4E]/10 border border-[#5A6B4E]/20 py-0.5 rounded-full">
                Sagoma Attiva
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Critical Safety Alerts Area during driving */}
        {currentWarning && (
          <div className="p-5 bg-rose-950/70 border-2 border-red-500 rounded-2xl animate-pulse space-y-3">
            <div className="flex items-center gap-2 text-red-400 font-black text-sm uppercase tracking-wider">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span>Rilevato Pericolo Critico di Sagoma</span>
            </div>
            <p className="text-rose-100 text-xs font-semibold leading-relaxed">
              {currentWarning}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // reroute or find nearest area
                  const safeSpot = places.find(p => !p.hasMaxHeightLimit) || places[0];
                  setCustomDestination(safeSpot);
                  setCurrentStepIndex(0);
                  setIsDriving(false);
                  speakInstruction("Ricalcolo rotta sicuro attivato. Evitato ostacolo basso.");
                }}
                className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl"
              >
                Deviazione Automatica d'Emergenza
              </button>
            </div>
          </div>
        )}

        {/* Driving controls (Huge Touch Controls for Guide Safety) */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch border-t border-white/10 pt-5">
          <button
            onClick={handleTogglePlay}
            className={`flex-1 py-4.5 rounded-2xl font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer transition-all ${
              isDriving
                ? 'bg-[#A45C40] hover:bg-[#A45C40]/90 text-white shadow-lg'
                : 'bg-[#3E4A35] hover:bg-[#5A6B4E] active:bg-[#3E4A35] text-white shadow-lg'
            }`}
          >
            {isDriving ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                Sospendi Simulazione Guida
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                Avvia Viaggio & Assistenza Vocale
              </>
            )}
          </button>

          <div className="flex gap-2">
            {places.slice(0, 3).map((place) => {
              const isSelected = dest?.id === place.id;
              return (
                <button
                  key={place.id}
                  onClick={() => {
                    setCustomDestination(place);
                    setCurrentStepIndex(0);
                    setIsDriving(false);
                  }}
                  className={`px-3 py-2.5 rounded-xl border text-[10px] font-bold truncate max-w-[120px] transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#5A6B4E]/30 border-[#5A6B4E] text-[#F5F2ED]'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {place.name.split('-')[0] || place.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Safety info cards / Driving assistance fast clicks */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-[#3E4A35] text-xs uppercase tracking-wider">Tasti Rapidi per il Conducente (Un Tocco alla Guida)</h3>
        <p className="text-slate-500 text-xs">Pulsanti giganti pensati per essere azionati in sicurezza con un singolo tocco mentre il camper è in sosta d'emergenza o area di sosta temporanea.</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => {
              // Direct message broadcast sample
              window.dispatchEvent(new CustomEvent('show-toast', {
                detail: { message: "✅ Segnalazione inviata! Grazie per aver protetto la community." }
              }));
            }}
            className="p-4 bg-[#5A6B4E]/10 hover:bg-[#5A6B4E]/15 text-[#3E4A35] border border-[#5A6B4E]/25 rounded-2xl text-center space-y-1.5 cursor-pointer transition-colors"
          >
            <span className="text-xl">🚰</span>
            <div className="font-bold text-xs">Carico/Scarico Libero</div>
            <div className="text-[9px] text-[#3E4A35]">Presenza acqua OK</div>
          </button>

          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('show-toast', {
                detail: { message: "🚧 Grazie! Limite di sagoma segnalato alla community per verifica." }
              }));
            }}
            className="p-4 bg-[#A45C40]/10 hover:bg-[#A45C40]/15 text-[#A45C40] border border-[#A45C40]/25 rounded-2xl text-center space-y-1.5 cursor-pointer transition-colors"
          >
            <span className="text-xl">🚧</span>
            <div className="font-bold text-xs">Segnala Sottopasso Basso</div>
            <div className="text-[9px] text-[#A45C40]">Inserisci ostacolo max m</div>
          </button>

          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('show-toast', {
                detail: { message: "🚨 SOS stradale locale allertato per la tua posizione di sicurezza." }
              }));
            }}
            className="p-4 bg-[#A45C40]/10 hover:bg-[#A45C40]/15 text-[#A45C40] border border-[#A45C40]/25 rounded-2xl text-center space-y-1.5 cursor-pointer transition-colors"
          >
            <span className="text-xl">🚨</span>
            <div className="font-bold text-xs">SOS Foratura / Guasto</div>
            <div className="text-[9px] text-[#A45C40]">Chiedi soccorso vicino</div>
          </button>

          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('show-toast', {
                detail: { message: "💶 Grazie! Prezzo dell'area sosta aggiornato con successo." }
              }));
            }}
            className="p-4 bg-[#5A6B4E]/10 hover:bg-[#5A6B4E]/15 text-[#3E4A35] border border-[#5A6B4E]/25 rounded-2xl text-center space-y-1.5 cursor-pointer transition-colors"
          >
            <span className="text-xl">💶</span>
            <div className="font-bold text-xs">Segnala Variazione Tariffa</div>
            <div className="text-[9px] text-[#3E4A35]">Foto cartello prezzi</div>
          </button>
        </div>
      </div>
    </div>
  );
}
