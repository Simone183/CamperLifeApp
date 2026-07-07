import React from 'react';
import { 
  Zap, 
  Droplets, 
  Sun, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  RotateCcw, 
  HelpCircle, 
  Flame, 
  Users, 
  CloudSun,
  ShieldAlert,
  BatteryCharging,
  Sliders,
  TrendingDown,
  Clock
} from 'lucide-react';

interface CustomAppliance {
  id: string;
  name: string;
  powerWatts: number;
  hoursPerDay: number;
  isActive: boolean;
}

const DEFAULT_APPLIANCES: CustomAppliance[] = [
  { id: 'app1', name: 'Frigorifero a Compressore 12V', powerWatts: 35, hoursPerDay: 12, isActive: true }, // Cycles on/off (~12 hours run-time)
  { id: 'app2', name: 'Riscaldatore a Gasolio (Webasto/Truma)', powerWatts: 25, hoursPerDay: 4, isActive: false }, // Heavy winter start/fan use
  { id: 'app3', name: 'Illuminazione LED Interna', powerWatts: 15, hoursPerDay: 5, isActive: true },
  { id: 'app4', name: 'Ricarica Mobile, Tablet & PC', powerWatts: 45, hoursPerDay: 3, isActive: true },
  { id: 'app5', name: 'Inverter 220V + Macchina Caffè / Phon', powerWatts: 1200, hoursPerDay: 0.1, isActive: false },
  { id: 'app6', name: 'Televisore LCD', powerWatts: 24, hoursPerDay: 2, isActive: false }
];

export function OffGridEstimatorTab() {
  // Crew and consumption habits
  const [crewCount, setCrewCount] = React.useState<number>(2);
  const [waterStyle, setWaterStyle] = React.useState<'eco' | 'normal' | 'comfort'>('normal');
  const [showerFrequency, setShowerFrequency] = React.useState<'none' | 'eco' | 'daily'>('eco');

  // Hydric storage state
  const [freshWaterTank, setFreshWaterTank] = React.useState<number>(100); // in liters
  const [greyWaterTank, setGreyWaterTank] = React.useState<number>(90);    // in liters
  const [blackWaterTank, setBlackWaterTank] = React.useState<number>(18);   // in liters (cassette chemical toilet)

  // Electric storage capacity state
  const [batteryCapacityAh, setBatteryCapacityAh] = React.useState<number>(100); // 100 Ah
  const [batteryType, setBatteryType] = React.useState<'lead' | 'lithium'>('lead'); // Lead (50% usable) or Lithium LiFePO4 (90% usable)
  
  // Power source inputs
  const [solarPowerWatts, setSolarPowerWatts] = React.useState<number>(150); // solar panel wattage
  const [weatherCondition, setWeatherCondition] = React.useState<'summer' | 'autumn' | 'winter'>('autumn');

  // Load custom appliances state
  const [appliances, setAppliances] = React.useState<CustomAppliance[]>(() => {
    const saved = localStorage.getItem('camper_offgrid_appliances');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return DEFAULT_APPLIANCES; }
    }
    return DEFAULT_APPLIANCES;
  });

  // Custom tool addition input state
  const [newAppName, setNewAppName] = React.useState('');
  const [newAppPower, setNewAppPower] = React.useState<number>(20);
  const [newAppHours, setNewAppHours] = React.useState<number>(2);

  // Sync state to localstorage
  React.useEffect(() => {
    localStorage.setItem('camper_offgrid_appliances', JSON.stringify(appliances));
  }, [appliances]);

  const toggleAppliance = (id: string) => {
    setAppliances(prev => prev.map(app => {
      if (app.id === id) {
        return { ...app, isActive: !app.isActive };
      }
      return app;
    }));
  };

  const updateApplianceHours = (id: string, hours: number) => {
    setAppliances(prev => prev.map(app => {
      if (app.id === id) {
        return { ...app, hoursPerDay: Math.max(0, Math.min(24, hours)) };
      }
      return app;
    }));
  };

  const deleteAppliance = (id: string) => {
    setAppliances(prev => prev.filter(app => app.id !== id));
  };

  const addCustomAppliance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim() || newAppPower <= 0 || newAppHours <= 0) return;

    const newApp: CustomAppliance = {
      id: Date.now().toString(),
      name: newAppName.trim(),
      powerWatts: newAppPower,
      hoursPerDay: newAppHours,
      isActive: true
    };

    setAppliances(prev => [...prev, newApp]);
    setNewAppName('');
    setNewAppPower(20);
    setNewAppHours(2);
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: `➕ Utenza inserita: ${newApp.name}` }
    }));
  };

  const resetEstimator = () => {
    if (confirm('Ripristinare tutti i parametri ai valori standard off-grid?')) {
      setCrewCount(2);
      setWaterStyle('normal');
      setShowerFrequency('eco');
      setFreshWaterTank(100);
      setGreyWaterTank(90);
      setBlackWaterTank(18);
      setBatteryCapacityAh(100);
      setBatteryType('lead');
      setSolarPowerWatts(150);
      setWeatherCondition('autumn');
      setAppliances(DEFAULT_APPLIANCES);
      localStorage.removeItem('camper_offgrid_appliances');
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: '🔄 Parametri di autonomia ripristinati con successo!' }
      }));
    }
  };

  // Math simulation calculations
  
  // A. Hydric calculation (Water consumption per day)
  // Base consumption: Eco = 6L, Normal = 12L, Comfort = 20L per person/day
  // Shower consumption: Daily = 18L, Eco = 10L, None = 0L per person/day
  const dailyWaterConsumption = React.useMemo(() => {
    let baseLiters = 12;
    if (waterStyle === 'eco') baseLiters = 6;
    if (waterStyle === 'comfort') baseLiters = 20;

    let showerLiters = 10;
    if (showerFrequency === 'none') showerLiters = 0;
    if (showerFrequency === 'daily') showerLiters = 18;

    // Standard chemical WC toilet flush uses about 1.5L per flush (average 4 flushes per person/day)
    const toiletLiters = 6;

    return crewCount * (baseLiters + showerLiters + toiletLiters);
  }, [crewCount, waterStyle, showerFrequency]);

  // Combined Fresh water Autonomy in Days
  const freshWaterDays = React.useMemo(() => {
    if (dailyWaterConsumption <= 0) return 99;
    return Number((freshWaterTank / dailyWaterConsumption).toFixed(1));
  }, [freshWaterTank, dailyWaterConsumption]);

  // Combined Grey water tank overflow (it collects showers & sinks, roughly 85% of consumed fresh water)
  const greyWaterDays = React.useMemo(() => {
    const dailyGreyProduction = dailyWaterConsumption * 0.85;
    if (dailyGreyProduction <= 0) return 99;
    return Number((greyWaterTank / dailyGreyProduction).toFixed(1));
  }, [greyWaterTank, dailyWaterConsumption]);

  // Chemical cassette toilet tank overflow limit
  // Standard cassette is 18L. Crew typically fills it up with 2.5L per person/day
  const toiletCassetteDays = React.useMemo(() => {
    const dailyCassetteVolume = crewCount * 2.8; // liters of urine, wash, flush chemicals
    if (dailyCassetteVolume <= 0) return 99;
    return Number((blackWaterTank / dailyCassetteVolume).toFixed(1));
  }, [blackWaterTank, crewCount]);

  // B. Electrical calculation (Ah consumption / yield per day)
  // We compute in Watts and translate to Ah (at 12V DC standard vehicle voltage)
  const dailyPowerConsumptionWh = React.useMemo(() => {
    return appliances
      .filter(app => app.isActive)
      .reduce((sum, app) => sum + (app.powerWatts * app.hoursPerDay), 0);
  }, [appliances]);

  const dailyPowerConsumptionAh = React.useMemo(() => {
    // Wh / 12V = Ah
    return Number((dailyPowerConsumptionWh / 12).toFixed(1));
  }, [dailyPowerConsumptionWh]);

  // Solar daily generation mathematically modeled:
  // Summer: 5 hours equivalent full solar sun power
  // Autumn: 2 hours average equivalent power
  // Winter: 0.5 hours average equivalent power
  const solarDailyYieldWh = React.useMemo(() => {
    let multiplier = 2; // autumn
    if (weatherCondition === 'summer') multiplier = 4.8;
    if (weatherCondition === 'winter') multiplier = 0.6;

    // Typical panel efficiency factors (dirt, angle on flat roof, cables loss: ~25% loss)
    const efficiencyFactor = 0.75;
    return solarPowerWatts * multiplier * efficiencyFactor;
  }, [solarPowerWatts, weatherCondition]);

  const solarDailyYieldAh = React.useMemo(() => {
    return Number((solarDailyYieldWh / 12).toFixed(1));
  }, [solarDailyYieldWh]);

  // Net electrical balance per day
  const dailyNetAhBalance = Number((solarDailyYieldAh - dailyPowerConsumptionAh).toFixed(1));

  // Battery DOD (Depth of Discharge) allowance
  // Lead-Gel/AGM: 50% DOD. Lithium LiFePO4: 90% DOD.
  const usableBatteryCapacityAh = React.useMemo(() => {
    const dodFactor = batteryType === 'lead' ? 0.5 : 0.9;
    return batteryCapacityAh * dodFactor;
  }, [batteryCapacityAh, batteryType]);

  // Battery remaining autonomy in Days or Infinite
  const electricalAutonomyDays = React.useMemo(() => {
    if (dailyNetAhBalance >= 0) {
      return 'infinite'; // Solar power generates more than or equal to daily consumption
    }
    // Net drawing
    const negativeBalance = Math.abs(dailyNetAhBalance);
    if (negativeBalance <= 0.1) return 99;
    return Number((usableBatteryCapacityAh / negativeBalance).toFixed(1));
  }, [dailyNetAhBalance, usableBatteryCapacityAh]);

  // C. Combined global safety rating for Off-Grid
  // The global off-grid autonomy is the MINIMUM of all resource days
  const activeElecDaysValue = typeof electricalAutonomyDays === 'number' ? electricalAutonomyDays : 10; // set safety roof if infinite
  
  const globalAutonomyDays = React.useMemo(() => {
    const limits = [freshWaterDays, greyWaterDays, toiletCassetteDays];
    if (typeof electricalAutonomyDays === 'number') {
      limits.push(electricalAutonomyDays);
    }
    return Math.min(...limits);
  }, [freshWaterDays, greyWaterDays, toiletCassetteDays, electricalAutonomyDays]);

  // Determine critical bottleneck
  const bottleneckResource = React.useMemo(() => {
    const res = [
      { name: 'Acqua Chiara (Finita)', days: freshWaterDays, icon: <Droplets className="w-4 h-4 text-sky-500" /> },
      { name: 'Serbatoio Grigie (Pieno)', days: greyWaterDays, icon: <Droplets className="w-4 h-4 text-slate-500" /> },
      { name: 'Cassetta WC (Piena)', days: toiletCassetteDays, icon: <Info className="w-4 h-4 text-orange-500" /> }
    ];
    if (typeof electricalAutonomyDays === 'number') {
      res.push({ name: 'Carica Batteria Utenze', days: electricalAutonomyDays, icon: <Zap className="w-4 h-4 text-yellow-500" /> });
    }
    
    res.sort((a, b) => a.days - b.days);
    return res[0];
  }, [freshWaterDays, greyWaterDays, toiletCassetteDays, electricalAutonomyDays]);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Off-Grid Autonomy Header */}
      <div className="bg-gradient-to-br from-[#3E4A35] to-[#2B3523] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full inline-block">
              Simulatore Off-Grid
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <Sun className="w-6 h-6 text-yellow-300 animate-spin" style={{ animationDuration: '10s' }} />
              Calcolatore di Autonomia Energetica e Idrica
            </h2>
            <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
              Pianifica la sosta libera perfetta! Stima la quantità di giorni in cui sarai autonomo prima di dover svuotare i serbatoi scuri o rimanere con la batteria scarica in mezzo alla natura.
            </p>
          </div>

          <button
            onClick={resetEstimator}
            className="px-3.5 py-2 bg-[#A45C40] hover:bg-[#8D4A30] active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5 uppercase tracking-wider shrink-0"
            title="Ripristina alle configurazioni standard"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ripristina</span>
          </button>
        </div>

        {/* Global Days Score block */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          
          <div className="md:col-span-1 bg-white/10 rounded-2xl p-4 text-center border border-white/5 flex flex-col justify-center items-center h-full min-h-[140px]">
            <Clock className="w-6 h-6 text-emerald-350 mb-1" />
            <span className="block text-[8px] font-bold text-stone-300 uppercase tracking-widest">
              AUTONOMIA LIBERA MASSIMA
            </span>
            <span className="text-4xl font-extrabold font-mono text-emerald-300 my-1">
              {globalAutonomyDays === 99 ? '∞' : globalAutonomyDays} <span className="text-xs">Giorni</span>
            </span>
            <span className="text-[9.5px] text-stone-200">Risoluzione di Sicurezza</span>
          </div>

          <div className="md:col-span-2 space-y-2">
            <span className="text-[10px] uppercase font-black text-stone-300 block">Stato delle Risorse Vitali:</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                <span className="block text-[8px] text-stone-400 font-bold uppercase">Acqua Chiara residua</span>
                <span className="font-extrabold font-mono text-sky-200">{freshWaterDays} giorni ({freshWaterTank}L)</span>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                <span className="block text-[8px] text-stone-400 font-bold uppercase">Raccolta Acque Grigie</span>
                <span className="font-extrabold font-mono text-slate-350">{greyWaterDays} giorni prima del colmo</span>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                <span className="block text-[8px] text-stone-400 font-bold uppercase">Cassetta WC Chimico</span>
                <span className="font-extrabold font-mono text-orange-250">{toiletCassetteDays} giorni prima del colmo</span>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
                <span className="block text-[8px] text-stone-400 font-bold uppercase">Energia Servizi 12V</span>
                <span className="font-extrabold font-mono text-yellow-300">
                  {electricalAutonomyDays === 'infinite' ? '∞ Bilancio Attivo' : `${electricalAutonomyDays} giorni`}
                </span>
              </div>
            </div>
          </div>

          {/* Critical Bottleneck Analysis */}
          <div className="md:col-span-1 bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex flex-col justify-between h-full min-h-[140px] text-amber-205">
            <div className="flex gap-1.5 items-center">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider font-mono">
                Primo Limite Libera
              </span>
            </div>
            <div className="my-2 text-left">
              <div className="flex items-center gap-1">
                {bottleneckResource.icon}
                <h4 className="font-extrabold text-sm text-white">{bottleneckResource.name}</h4>
              </div>
              <p className="text-[10px] text-stone-300 leading-snug mt-1 inline-block">
                La tua sosta libera si interromperà in {bottleneckResource.days} giorni a causa di questo fattore limitante.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Main Form Fields Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7/12) - Resource Inputs & Setup */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Crew & Hydric Habits */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-[#3E4A35]" />
              Equipaggio & Riserve di Acqua
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Crew Count input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Camperisti a Bordo</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCrewCount(prev => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center font-black"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-black font-mono text-sm">{crewCount}</span>
                  <button
                    type="button"
                    onClick={() => setCrewCount(prev => Math.min(8, prev + 1))}
                    className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center font-black"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Water consumption habit style */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Stile di Risparmio</label>
                <select
                  value={waterStyle}
                  onChange={(e) => setWaterStyle(e.target.value as any)}
                  className="w-full text-xs border border-stone-200 px-2.5 py-1.5 bg-stone-50 rounded-lg cursor-pointer"
                >
                  <option value="eco">Rigido (Lavaggio Eco 6L/giorno)</option>
                  <option value="normal">Regolare (Doccia/Piatti standard 12L)</option>
                  <option value="comfort">Senza freni (Scorrevole Comfort 20L)</option>
                </select>
              </div>

              {/* Shower frequency on board */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Docce nel Camper</label>
                <select
                  value={showerFrequency}
                  onChange={(e) => setShowerFrequency(e.target.value as any)}
                  className="w-full text-xs border border-stone-200 px-2.5 py-1.5 bg-stone-50 rounded-lg cursor-pointer"
                >
                  <option value="none">Sforzo zero / Nessuna doccia interna</option>
                  <option value="eco">Docce rapide Eco (1 a testa ogni 2 giorni)</option>
                  <option value="daily">Doccia calda giornaliera (Siamo in fiera)</option>
                </select>
              </div>

            </div>

            {/* Slider parameters for Tanks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-550">
                  <span>Capacità Acqua Chiara</span>
                  <span className="text-[#3E4A35] font-black">{freshWaterTank} L</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="200"
                  step="10"
                  value={freshWaterTank}
                  onChange={(e) => setFreshWaterTank(parseInt(e.target.value))}
                  className="w-full accent-[#3E4A35] h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-555">
                  <span>Capacità Serbatoio Grigie</span>
                  <span className="text-[#3E4A35] font-black">{greyWaterTank} L</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="180"
                  step="10"
                  value={greyWaterTank}
                  onChange={(e) => setGreyWaterTank(parseInt(e.target.value))}
                  className="w-full accent-[#3E4A35] h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-555">
                  <span>Capacità Cassetta WC chemical</span>
                  <span className="text-[#3E4A35] font-black">{blackWaterTank} L</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="40"
                  step="2"
                  value={blackWaterTank}
                  onChange={(e) => setBlackWaterTank(parseInt(e.target.value))}
                  className="w-full accent-[#3E4A35] h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
              </div>

            </div>

          </div>

          {/* Section 2: Electric Configuration (Battery, Solar, Weather) */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#3E4A35]" />
              Parametri Energetici & Meteo di Ricarica
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Battery type selector */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Tipologia Batteria Servizi</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBatteryType('lead')}
                    className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                      batteryType === 'lead'
                        ? 'bg-[#3E4A35] text-white border-transparent shadow shadow-[#3E4A35]/20'
                        : 'bg-white text-slate-600 border-stone-200 hover:bg-stone-50'
                    }`}
                    title="Batteria classica AGM o al Piombo-Gel. Scarica massima prudenziale raccomandata: 50% per non solfatarla."
                  >
                    AGM/PIOMBO (50%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatteryType('lithium')}
                    className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                      batteryType === 'lithium'
                        ? 'bg-[#3E4A35] text-white border-transparent shadow shadow-[#3E4A35]/20'
                        : 'bg-white text-slate-600 border-stone-200 hover:bg-stone-50'
                    }`}
                    title="Batteria ultraleggera al Litio LiFePO4. Sconto di scarica quasi totale fino al 90% senza degradamento strutturale."
                  >
                    LITIO LIFEPO4 (90%)
                  </button>
                </div>
              </div>

              {/* Weather Condition selector */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Condizioni Meteo Solari</label>
                <select
                  value={weatherCondition}
                  onChange={(e) => setWeatherCondition(e.target.value as any)}
                  className="w-full text-xs border border-stone-200 px-2.5 py-1.5 bg-stone-50 rounded-lg cursor-pointer font-bold"
                >
                  <option value="summer">☀️ Estate / Sole pieno (Autonomia Max)</option>
                  <option value="autumn">☁️ Mezza Stagione / Nuvoloso temperato</option>
                  <option value="winter">🌧️ Inverno rigido / Nebbia (Resa Solare 10%)</option>
                </select>
              </div>

              {/* Slider for Solar Panels wattage */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-550 leading-none">
                  <span>Potenza Pannelli Solari</span>
                  <span className="text-[#3E4A35] font-black font-mono">{solarPowerWatts} W</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="25"
                  value={solarPowerWatts}
                  onChange={(e) => setSolarPowerWatts(parseInt(e.target.value))}
                  className="w-full accent-[#3E4A35] h-1.5 bg-slate-100 rounded-lg cursor-pointer mt-1"
                />
              </div>

            </div>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500">
                  <span>Capacità Nominale Batteria</span>
                  <span className="text-[#3E4A35] font-black">{batteryCapacityAh} Ah</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="300"
                  step="10"
                  value={batteryCapacityAh}
                  onChange={(e) => setBatteryCapacityAh(parseInt(e.target.value))}
                  className="w-full accent-[#3E4A35] h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
              </div>

              {/* Informative advice on net balance */}
              <div className="p-3 bg-stone-50 rounded-xl text-[10px] text-stone-500 font-medium flex gap-2">
                <Info className="w-4 h-4 text-[#3E4A35] shrink-0 mt-0.5" />
                <span>
                  Resa solare calcolata per oggi: <b className="text-yellow-600">{solarDailyYieldAh} Ah/giorno</b> (equivalentemente {solarDailyYieldWh} Wh) immessi in batteria, contro un consumo di <b className="text-orange-600">{dailyPowerConsumptionAh} Ah</b>.
                </span>
              </div>

            </div>

          </div>

        </div>

        {/* Right Column (5/12) - On board appliances checklist & Custom entry */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Active loads checklist */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-[#3E4A35]" />
              Utenze Elettriche Attive
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">Attiva o regola le ore di funzionamento di ciascuna utenza</p>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
               {appliances.map(app => (
                <div 
                  key={app.id} 
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-left ${
                    app.isActive ? 'bg-[#3E4A35]/5 dark:bg-emerald-900/10 border-[#3E4A35]/15 dark:border-emerald-800' : 'bg-stone-50/50 dark:bg-slate-800 border-stone-200/50 dark:border-slate-700 opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={app.isActive}
                      onChange={() => toggleAppliance(app.id)}
                      className="mt-1 accent-[#3E4A35] dark:accent-emerald-500 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-[#2D2926] dark:text-slate-100 text-xs leading-snug truncate">
                        {app.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Potenza: <b>{app.powerWatts}W</b> (~{(app.powerWatts / 12).toFixed(1)}A a 12V)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      max="24"
                      value={app.hoursPerDay}
                      disabled={!app.isActive}
                      onChange={(e) => updateApplianceHours(app.id, parseFloat(e.target.value) || 0)}
                      className="w-12 bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-600 rounded px-1 text-center font-mono text-xs font-bold py-0.5 dark:text-slate-200"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">ore/g</span>

                    {/* Delete Custom Appliance */}
                    {!DEFAULT_APPLIANCES.find(d => d.id === app.id) && (
                      <button
                        type="button"
                        onClick={() => deleteAppliance(app.id)}
                        className="px-1 text-red-500 hover:text-red-700 transition-all cursor-pointer font-bold"
                        title="Elimina"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-[10px] bg-stone-50 border border-stone-200/40 p-2.5 rounded-xl font-bold font-mono">
              <span>Totale Carico Giornaliero:</span>
              <span className="text-[#A45C40] text-xs font-black">
                {dailyPowerConsumptionWh} Wh ({dailyPowerConsumptionAh} Ah)
              </span>
            </div>

          </div>

          {/* Custom Appliance Form */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#A45C40]" />
              Includi Altro Consumo Extra
            </h3>

            <form onSubmit={addCustomAppliance} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[9px] uppercase font-bold text-slate-500">Nome Utenza</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Sifone nebulizzatore, PC Gaming..."
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 bg-stone-50 rounded-lg text-[#2D2926] focus:bg-white focus:outline-none focus:border-[#3E4A35]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-slate-500">Potenza Assorbita (W)</label>
                  <input
                    type="number"
                    min="1"
                    max="2200"
                    value={newAppPower}
                    onChange={(e) => setNewAppPower(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-xs border border-stone-200 bg-stone-50 rounded-lg text-[#2D2926] focus:bg-white focus:outline-none focus:border-[#3E4A35] font-mono text-center font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-slate-500">Ore di Utilizzo Standard</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    max="24"
                    value={newAppHours}
                    onChange={(e) => setNewAppHours(Math.max(0.1, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-xs border border-stone-200 bg-stone-50 rounded-lg text-[#2D2926] focus:bg-white focus:outline-none focus:border-[#3E4A35] font-mono text-center font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-black rounded-lg text-xs tracking-wider transition-all uppercase cursor-pointer text-center shadow-sm"
              >
                Includi nel Bilancio
              </button>
            </form>
          </div>

          {/* Education OffGrid Tips */}
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-4 space-y-2 text-[10.5px] leading-relaxed text-stone-600 font-medium font-sans">
            <span className="text-[9px] uppercase tracking-wider font-black text-[#A45C40] block">
              💡 Consigli per Moltiplicare l'Autonomia:
            </span>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                **Docce Esterne**: In estate usa un sacco solare nero all'esterno per risparmiare il serbatoio delle acque grigie.
              </li>
              <li>
                **Attrezzi a Gas**: Se possiedi il frigo a gas trivalente, usalo al gas durante la libera off-grid invece della batteria.
              </li>
              <li>
                **Sostituisci Batteria**: Una batteria al Litio LiFePO4 raddoppia quasi l'autonomia rispetto ad AGM pesando un terzo!
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
