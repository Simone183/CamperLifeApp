import React from 'react';
import {
  Sun,
  Battery,
  Droplets,
  Wrench,
  Search,
  Compass,
  Zap,
  Flame,
  Gauge,
  Info,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

interface TroubleshootingIssue {
  id: string;
  category: 'electric' | 'water' | 'gas' | 'appliances';
  title: string;
  symptom: string;
  cause: string;
  steps: string[];
  severity: 'low' | 'medium' | 'high';
}

const TROUBLESHOOTING_GUIDES: TroubleshootingIssue[] = [
  {
    id: 't1',
    category: 'gas',
    title: "Il fornello non rimane acceso (Termocoppia)",
    symptom: "Rilasciando la manopola del gas dopo l'accensione, la fiamma si spegne immediatamente.",
    cause: "La sicurezza magnetica (termocoppia) non è abbastanza calda, è arrugginita, allentata o guasta.",
    severity: 'medium',
    steps: [
      "Tieni premuto il pomello a fondo per almeno 10-15 secondi dopo che la fiamma si è accesa per dare tempo alla termocoppia di generare la micro-corrente.",
      "Se spenge ancora, controlla che la punta di metallo vicino al bruciatore sia investita bene dalla fiamma. Se è storta, raddrizzala delicatamente.",
      "Pulisci la punta della termocoppia con una paglietta di ferro fine o carta vetrata leggera per asportare ossido o fuliggine.",
      "Se il bruciatore è sporco e la fiamma è debole o gialla, pulisci i fori con uno spazzolino per assicurare che lambisca la termocoppia."
    ]
  },
  {
    id: 't2',
    category: 'water',
    title: "La pompa dell'acqua gira continuamente",
    symptom: "La pompa a pressostato (es. Fiamma/Shurflo) continua a ronzare anche con tutti i rubinetti chiusi.",
    cause: "Mancanza di acqua, bolla d'aria nel circuito, pressostato da calibrare, perdita d'acqua o valvola antigelo (FrostControl) aperta.",
    severity: 'high',
    steps: [
      "Verifica subito il livello del serbatoio acque chiare. Se è vuoto, spegni la pompa per evitare colpi di calore e usura delle membrane.",
      "Controlla il riscaldatore (boiler): se la temperatura esterna è scesa sotto i 4°C, la valvola magnetica FrostControl della Truma potrebbe essersi aperta scaricando l'acqua sotto il pianale. Richiudila girando la manopola blu a croce e premendo il pulsante celeste in basso.",
      "Ispeziona il filtro di aspirazione della pompa (bicchiere di plastica trasparente). Se è crepato, la pompa aspira aria ed il pressostato non stacca.",
      "Verifica che non vi siano perdite visibili sotto il lavello, in bagno o nel vano garage.",
      "Regola la vite del pressostato sulla testa della pompa (vite a brugola/taglio centrale): girala leggermente in senso antiorario per facilitare lo stacco a pressione inferiore."
    ]
  },
  {
    id: 't3',
    category: 'electric',
    title: "Tensione batteria bassa all'avvio riscaldatore (Webasto/Eberspacher/Truma)",
    symptom: "Il riscaldamento parte, la ventola gira per un minuto e poi si spegne visualizzando errore di sotto-tensione (Battery Sag) o blocco.",
    cause: "I riscaldatori a gasolio richiedono un forte assorbimento iniziale (~10-15 Ampere per 2-3 minuti) per incandescere la candeletta di accensione. Se la batteria dei servizi ha resistenza interna alta o è quasi scarica, la tensione crolla sotto i 10.5V solo temporaneamente, attivando la protezione del riscaldatore.",
    severity: 'high',
    steps: [
      "Avvia il motore del camper per 10 minuti. L'alternatore caricherà la batteria portando la tensione a circa 14V, fornendo la corrente utile alla fase di accensione del riscaldatore.",
      "Una volta spenta la candeletta d'accensione (dopo ~3 minuti) e stabilizzato il bruciatore a regime minimo (~1-2 Ampere), puoi tranquillamente spegnere il motore della motrice.",
      "Prendi nota di questo evento: è un chiaro sintomo che la tua batteria dei servizi (soprattutto se AGM o piombo) sta esaurendo il suo ciclo di vita o ha i morsetti ossidati."
    ]
  },
  {
    id: 't4',
    category: 'appliances',
    title: "Frigorifero trivalente non raffredda a Gas in libera",
    symptom: "Il frigorifero trivalente commuta a gas, la fiammella pilota è accesa (o il led arancione non lampeggia), ma la cella interna rimane calda.",
    cause: "I frigoriferi ad assorbimento richiedono che il camper sia perfettamente in bolla per consentire al flusso di ammoniaca di circolare per gravità. Alternativamente, l'ossido sul bruciatore riduce il calore o i passaggi dei fumi sono intasati.",
    severity: 'medium',
    steps: [
      "Usa la Livella Digitale del camper per assicurarti di essere entro ±1° di inclinazione. Se il camper è troppo inclinato, l'ammoniaca si blocca compromettendo totalmente il ciclo termico.",
      "Verifica il colore della fiammella pilota dal vetrino interno in basso: deve essere di un bel blu vivido. Se è gialla e debole, il bruciatore a gas è sporco di polvere o ragnatele. Soffia con aria compressa nella griglia inferiore esterna.",
      "In estate con temperature sopra i 30°C, l'aria calda ristagna dietro il frigo. Rimuovi momentaneamente le griglie di plastica bianche esterne sul fianco del camper per aumentare l'aerazione del condensatore (ricordati di rimontarle prima di rimetterti in viaggio!)."
    ]
  },
  {
    id: 't5',
    category: 'electric',
    title: "Il pannello solare non ricarica (Spia Regolatore spenta/rossa)",
    symptom: "Anche in pieno sole, la corrente di carica sul display segna 0.0A o il regolatore MPPT mostra un LED di errore.",
    cause: "Morsetti lenti, fusibile bruciato sulla linea batteria-regolatore, o blocco logico del microprocessore MPPT.",
    severity: 'medium',
    steps: [
      "Controlla il fusibile stagno volante posizionato sul cavo positivo tra la batteria servizi e il regolatore solare. Se è interrotto, sostituiscilo.",
      "REGLA D'ORO dei regolatori solari: scollega sempre prima i pannelli (positivo solare) e poi la batteria. Per resettare l'MPPT, togli corrente a entrambi, attendi 2 minuti, quindi ricollega PRIMA la batteria (così il regolatore capisce se l'impianto è a 12V o 24V) e DOPO i pannelli solari.",
      "Verifica che non ci siano foglie, rami o sporco pesante sul pannello sul tetto, o che una parte del modulo non sia all'ombra di un oblò o dell'antenna TV (anche l'ombra su una singola cella può dimezzare la resa dell'intero pannello in serie)."
    ]
  }
];

export function SostaLiberaToolsTab() {
  const [activeToolSection, setActiveToolSection] = React.useState<'solar' | 'battery' | 'diagnostics' | 'tyres'>('solar');

  // 1. SOLAR PANEL ALIGNMENT UTILITY STATES
  const [panelSetup, setPanelSetup] = React.useState<'flat' | 'tilted15' | 'tilted30'>('flat');
  const [camperHeading, setCamperHeading] = React.useState<number>(180); // 0=Nord, 90=Est, 180=Sud, 270=Ovest
  const [season, setSeason] = React.useState<'summer' | 'equinox' | 'winter'>('equinox');
  const [targetTilt, setTargetTilt] = React.useState<number>(0); // Custom mechanical panel tilt angle

  // Simulated sun parameters based on season (central Italy latitude ~42°N)
  // Summer: Max elevation ~71°, Azimuth around 180° at midday
  // Equinox: Max elevation ~48°, Azimuth 180°
  // Winter: Max elevation ~25°, Azimuth 180°
  const sunElevation = season === 'summer' ? 71 : season === 'winter' ? 25 : 48;
  const sunAzimuth = 180; // Assuming midday optimization

  // Calculate dynamic solar collection efficiency (percentage 0-100)
  const solarEfficiency = React.useMemo(() => {
    // Relative heading difference between sun azimuth and camper profile
    // Flat panels are heavily dependent on sun elevation only, tilted panels depend heavily on orientation
    const azimuthDiff = Math.abs(camperHeading - sunAzimuth);
    const normalizedDiff = azimuthDiff > 180 ? 360 - azimuthDiff : azimuthDiff;

    if (panelSetup === 'flat') {
      // Flat roof panel: angle of incidence is just sun elevation.
      // Efficiency is maximum in summer (high sun) and decreases in winter (flat sun)
      // sin of elevation roughly maps to direct perpendicular rays
      const eff = Math.sin((sunElevation * Math.PI) / 180) * 100;
      return Math.round(Math.max(20, Math.min(100, eff)));
    } else {
      // Tilted panel setup (either 15 or 30 degrees tilt)
      const tiltAngle = panelSetup === 'tilted15' ? 15 : 30;
      
      // Optimal tilt angle = latitude - sunElevation. If we tilt towards South:
      // We assume panels are mounted facing the rear or side of the camper.
      // Let's assume tilted towards the rear. If camper faces North (0), rear is South (180), catching direct sun.
      // If camper faces South (180), rear is North (0), completely shaded or suboptimal.
      const optimalCamperHeading = 0; // facing North means rear tilts South
      const headingMisalignment = Math.abs(camperHeading - optimalCamperHeading);
      const alignedDiff = headingMisalignment > 180 ? 360 - headingMisalignment : headingMisalignment;

      // Calculate combined offset
      const tiltBenefit = Math.cos(((sunElevation - (90 - tiltAngle)) * Math.PI) / 180);
      const headingPenalty = Math.cos((alignedDiff * Math.PI) / 180); // 1 = perfect, -1 = opposite

      let totalEff = ((tiltBenefit + 1) / 2) * ((headingPenalty + 1) / 2) * 105;
      
      // Compensate for ambient diffuse skylight
      if (totalEff < 15) totalEff = 15;

      return Math.round(Math.min(100, totalEff));
    }
  }, [panelSetup, camperHeading, season]);

  // Translate heading degrees to Cardinal string
  const getCardinalDirection = (deg: number) => {
    const d = (deg % 360 + 360) % 360;
    if (d >= 337.5 || d < 22.5) return 'NORD (⬆️)';
    if (d >= 22.5 && d < 67.5) return 'NORD-EST (↗️)';
    if (d >= 67.5 && d < 112.5) return 'EST (➡️)';
    if (d >= 112.5 && d < 157.5) return 'SUD-EST (↘️)';
    if (d >= 157.5 && d < 202.5) return 'SUD (⬇️)';
    if (d >= 202.5 && d < 247.5) return 'SUD-OVEST (↙️)';
    if (d >= 247.5 && d < 292.5) return 'OVEST (⬅️)';
    return 'NORD-OVEST (↖️)';
  };

  // 2. BATTERY STATE OF CHARGE VOLTAGE STATES
  const [batteryChemistry, setBatteryChemistry] = React.useState<'lifepo4' | 'agm' | 'gel'>('lifepo4');
  const [voltage, setVoltage] = React.useState<number>(13.2);

  const batterySoCResult = React.useMemo(() => {
    const v = voltage;
    let percentage = 0;
    let text = '';
    let colorClass = 'text-[#3E4A35]';
    let alertClass = 'bg-stone-50 border-stone-200';
    let recommendations: string[] = [];

    if (batteryChemistry === 'lifepo4') {
      // Typical LiFePO4 Voltage curve
      if (v >= 13.5) { percentage = 100; text = "Piena Carica / Fine Assorbimento"; }
      else if (v >= 13.3) { percentage = 90; text = "Ottima Autonomia"; }
      else if (v >= 13.18) { percentage = 70; text = "Zona Nominale (Medio Contributo)"; }
      else if (v >= 13.1) { percentage = 50; text = "Metà Carica (Tensione Stabile)"; }
      else if (v >= 13.0) { percentage = 30; text = "Riserva Iniziale"; }
      else if (v >= 12.8) { percentage = 15; text = "Batteria Quasi Scarica (Sotto-Soglia)"; }
      else { percentage = 1; text = "Protezione BMS Imminente (Deep Discharge)"; }

      if (percentage <= 20) {
        colorClass = 'text-rose-700 font-bold';
        alertClass = 'bg-rose-50 border-rose-150';
        recommendations = [
          "Spegni utenze ad alto assorbimento (Inverter, riscaldamenti, phon).",
          "Avvia il motore della motrice o collega il generatore per ricaricare istantaneamente.",
          "Attendi il sole del mattino affinché l'MPPT solare ripristini la carica di galleggiamento."
        ];
      } else if (percentage < 80) {
        colorClass = 'text-amber-805 font-semibold';
        alertClass = 'bg-amber-50 border-amber-200/50';
        recommendations = [
          "La tensione del Litio rimane piatta (~13.1V) per l'80% del ciclo. Questo è normale.",
          "Cerca di non scendere sotto i 12.0V effettivi sotto carico pesante."
        ];
      } else {
        colorClass = 'text-emerald-800 font-bold';
        alertClass = 'bg-emerald-50 border-emerald-150';
        recommendations = [
          "Impianto in equilibrio perfetto.",
          "Il litio LiFePO4 tollera volentieri cariche parziali senza alcun effetto memoria!"
        ];
      }
    } else if (batteryChemistry === 'agm') {
      // AGM Lead Acid Voltage Curve
      if (v >= 12.8) { percentage = 100; text = "Batteria al 100% (A Riposo)"; }
      else if (v >= 12.65) { percentage = 85; text = "Buona Ricarica"; }
      else if (v >= 12.45) { percentage = 70; text = "Livello Moderato"; }
      else if (v >= 12.2) { percentage = 50; text = "Soglia di Attenzione (50% Scarica)"; }
      else if (v >= 12.05) { percentage = 30; text = "Scarica Profonda AGM"; }
      else if (v >= 11.8) { percentage = 15; text = "Danno Biologico in Corso"; }
      else { percentage = 0; text = "Completamente Scarica (Rischio Solfatazione)"; }

      if (percentage <= 50) {
        colorClass = 'text-rose-700 font-bold';
        alertClass = 'bg-rose-50 border-rose-150';
        recommendations = [
          "In una batteria ad acido/AGM, scaricare oltre il 50% dimezza la vita utile della batteria!",
          "Ricarica la batteria AGM immediatamente per evitare che le piastre si solfatino permanentemente.",
          "Non utilizzare assolutamente l'Inverter a bordo in questo stato."
        ];
      } else if (percentage < 90) {
        colorClass = 'text-amber-805 font-semibold';
        alertClass = 'bg-amber-50/70 border-amber-200/40';
        recommendations = [
          "AGM performa ottimamente tra l'80% e il 100%.",
          "Ricordati di completare una carica al 100% almeno una volta alla settimana per mescolare l'elettrolita."
        ];
      } else {
        colorClass = 'text-emerald-800 font-bold';
        alertClass = 'bg-emerald-50 border-emerald-150';
        recommendations = [
          "Carica ottimale.",
          "Se sei allacciato alla colonnina a 220V, il caricabatterie la sosterrà a circa 13.8V - 14.4V in bulk."
        ];
      }
    } else {
      // GEL Lead Acid Voltage Curve
      if (v >= 12.85) { percentage = 100; text = "Batteria Gel al 100%"; }
      else if (v >= 12.68) { percentage = 85; text = "Ottimo Stato Gel"; }
      else if (v >= 12.48) { percentage = 70; text = "Resa Media"; }
      else if (v >= 12.25) { percentage = 50; text = "Consumo Parziale (50%)"; }
      else if (v >= 12.1) { percentage = 35; text = "Tensione Debole"; }
      else if (v >= 11.9) { percentage = 15; text = "Criticità Gel Elevata"; }
      else { percentage = 0; text = "Completamente Scarica / Solfatazione"; }

      if (percentage <= 50) {
        colorClass = 'text-rose-700 font-bold';
        alertClass = 'bg-rose-50 border-rose-150';
        recommendations = [
          "Le batterie Gel soffrono molto le correnti d'avvio violente quando sono degradate.",
          "Isola l'utenza e avvia il sistema di rigenerazione. Ha bisogno di una ricarica lenta e prolungata."
        ];
      } else {
        colorClass = 'text-emerald-850 font-semibold';
        alertClass = 'bg-emerald-50/50 border-emerald-100';
        recommendations = [
          "Il gel sopporta scariche ripetute meglio dell'AGM classico ma detesta le ricariche rapide ad alta tensione dell'alternatore senza idoneo regolatore d'ascolto."
        ];
      }
    }

    return { percentage, text, colorClass, alertClass, recommendations };
  }, [batteryChemistry, voltage]);

  // Set preset voltage based on chemical selector
  const handleChemistryChange = (chem: 'lifepo4' | 'agm' | 'gel') => {
    setBatteryChemistry(chem);
    if (chem === 'lifepo4') setVoltage(13.2);
    else if (chem === 'agm') setVoltage(12.65);
    else setVoltage(12.6);
  };

  // 3. TYRE PRESSURE (BAR ⇄ PSI) STATES
  const [tyreWeight, setTyreWeight] = React.useState<number>(3500); // Standard camper mass Kg
  const [pressureBar, setPressureBar] = React.useState<number>(5.5);

  const calculatedPsi = React.useMemo(() => {
    return Number((pressureBar * 14.5038).toFixed(1));
  }, [pressureBar]);

  // Recommended tyre pressure guidelines based on weight loading
  const tyreAdvice = React.useMemo(() => {
    if (tyreWeight > 3500) {
      return {
        front: "5.0 Bar (72.5 PSI) - Rinforzato 'Camper'",
        rear: "5.5 Bar (79.7 PSI) - Pieno Carico / Gemellato",
        alert: "⚠️ Attenzione: Sopra i 3500 Kg assicurati di utilizzare pneumatici specifici marcati 'CP' (Camping Michelin/Continental) con valvole metalliche ad alta pressione."
      };
    } else if (tyreWeight > 3100) {
      return {
        front: "4.5 Bar (65.3 PSI) - Comfort di marcia",
        rear: "5.0 Bar (72.5 PSI) - Rigidezza spalla ottimale",
        alert: "✓ Ottimale per furgonati lunghi 6 metri o semintegrali medi."
      };
    } else {
      // Light campers / campervans / Westfalia
      return {
        front: "3.5 Bar (50.8 PSI) - Assorbimento asperità",
        rear: "4.0 Bar (58.0 PSI) - Tenuta trazione posteriore",
        alert: "✓ Ideale per van compatti o piccoli profilati monoscocca leggeri."
      };
    }
  }, [tyreWeight]);

  // 4. DIAGNOSTICS MANUAL UTILITY SEARCH STATES
  const [diagSearch, setDiagSearch] = React.useState('');
  const [diagCategory, setDiagCategory] = React.useState<'all' | 'electric' | 'water' | 'gas' | 'appliances'>('all');

  const filteredGuides = React.useMemo(() => {
    return TROUBLESHOOTING_GUIDES.filter(guide => {
      const matchSearch = 
        guide.title.toLowerCase().includes(diagSearch.toLowerCase()) || 
        guide.symptom.toLowerCase().includes(diagSearch.toLowerCase()) ||
        guide.cause.toLowerCase().includes(diagSearch.toLowerCase());
      const matchCategory = diagCategory === 'all' || guide.category === diagCategory;
      return matchSearch && matchCategory;
    });
  }, [diagSearch, diagCategory]);


  return (
    <div className="space-y-6 font-sans">
      
      {/* Dynamic Master Banner */}
      <div className="bg-gradient-to-br from-[#1E293B] to-[#334155] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden select-none">
        <div className="absolute right-0 bottom-0 opacity-15 translate-x-3 translate-y-3 pointer-events-none">
          <Compass className="w-48 h-48 stroke-[1.25]" />
        </div>
        
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[9.5px] uppercase font-black tracking-widest bg-orange-600 px-2.5 py-1 rounded-full text-white animate-pulse">
              Edge Tool Offline 📡
            </span>
            <span className="text-[10px] text-slate-300 font-bold bg-[#3E4A35]/40 px-2.5 py-1 rounded-full border border-slate-500/25">
              Sosta Libera Libera
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Pannello Sosta Libera</h2>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Kit di strumenti elettronici e simulazioni istantanee progettate per funzionare anche nel cuore dei boschi senza connessione internet o copertura cellulare.
          </p>
        </div>
      </div>

      {/* Internal Navigation Grid */}
      <div className="grid grid-cols-4 gap-1 sm:gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-sm shrink-0">
        <button
          onClick={() => setActiveToolSection('solar')}
          className={`py-2 px-1 text-center rounded-xl text-[10.5px] font-black transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 min-h-[44px] ${
            activeToolSection === 'solar'
              ? 'bg-[#3E4A35] text-white shadow-md scale-102'
              : 'text-slate-650 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span className="leading-tight">Sole & Resa</span>
        </button>
        <button
          onClick={() => setActiveToolSection('battery')}
          className={`py-2 px-1 text-center rounded-xl text-[10.5px] font-black transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 min-h-[44px] ${
            activeToolSection === 'battery'
              ? 'bg-[#3E4A35] text-white shadow-md scale-102'
              : 'text-slate-650 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Battery className="w-3.5 h-3.5" />
          <span className="leading-tight">Stato Batteria</span>
        </button>
        <button
          onClick={() => setActiveToolSection('tyres')}
          className={`py-2 px-1 text-center rounded-xl text-[10.5px] font-black transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 min-h-[44px] ${
            activeToolSection === 'tyres'
              ? 'bg-[#3E4A35] text-white shadow-md scale-102'
              : 'text-slate-650 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Gauge className="w-3.5 h-3.5" />
          <span className="leading-tight">Pesi & Gomme</span>
        </button>
        <button
          onClick={() => setActiveToolSection('diagnostics')}
          className={`py-2 px-1 text-center rounded-xl text-[10.5px] font-black transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 min-h-[44px] ${
            activeToolSection === 'diagnostics'
              ? 'bg-[#3E4A35] text-white shadow-md scale-102'
              : 'text-slate-650 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span className="leading-tight">Risolvi Guasti</span>
        </button>
      </div>

      {/* SECTION 1: SOLAR POSITION SIMULATION */}
      {activeToolSection === 'solar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 select-none animate-fade-in">
          {/* Slider controls pane: Left side */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/60 p-5 space-y-4">
            <h3 className="font-bold text-[#3E4A35] text-sm flex items-center gap-2 border-b border-stone-100 pb-2.5">
              <Sun className="w-4.5 h-4.5 text-amber-500 fill-amber-100" />
              Simulatore Allineamento Solare
            </h3>

            {/* A. Install season selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase">1. Stagione di sosta</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['summer', 'equinox', 'winter'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setSeason(s)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      season === s
                        ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-650 border-slate-200'
                    }`}
                  >
                    {s === 'summer' && '☀️ Estate'}
                    {s === 'equinox' && '⛅ Equinozio'}
                    {s === 'winter' && '❄️ Inverno'}
                  </button>
                ))}
              </div>
            </div>

            {/* B. Panel mechanical setup selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-black text-slate-500 uppercase">2. Configurazione Pannelli</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['flat', 'tilted15', 'tilted30'] as const).map(setup => (
                  <button
                    key={setup}
                    onClick={() => setPanelSetup(setup)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      panelSetup === setup
                        ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-650 border-slate-200'
                    }`}
                  >
                    {setup === 'flat' && 'Roof Flat (0°)'}
                    {setup === 'tilted15' && 'Inclinato 15°'}
                    {setup === 'tilted30' && 'Inclinato 30°'}
                  </button>
                ))}
              </div>
            </div>

            {/* C. Camper Heading orientation selector slider */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-black text-slate-500 uppercase">3. Orientamento del Camper</label>
                <span className="text-xs font-black text-[#A45C40]">{camperHeading}° {getCardinalDirection(camperHeading)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="359"
                value={camperHeading}
                onChange={(e) => setCamperHeading(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#3E4A35]"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1 select-none">
                <span>N (0°)</span>
                <span>E (90°)</span>
                <span>S (180°)</span>
                <span>O (270°)</span>
              </div>
            </div>

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Info className="w-4 h-4 text-[#3E4A35] shrink-0" />
                <span>Come ottimizzare?</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                {panelSetup === 'flat' 
                  ? "I tuoi pannelli sono piani sul tetto. L'orientamento del camper è ininfluente. L'efficienza dipende unicamente dall'angolo solare zenitale." 
                  : "Con pannelli inclinati verso la coda del camper, l'orientamento perfetto di parcheggio è col muso verso NORD (0°) così che i moduli rimangano rivolti a SUD catturando i raggi perpendicolari del sole."}
              </p>
            </div>
          </div>

          {/* Graphical Compass Visualization: Right side */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/60 p-5 flex flex-col justify-between space-y-4">
            <div className="text-center space-y-1">
              <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">Resa Fotovoltaica Stimata</span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-slate-800">{solarEfficiency}%</span>
                <span className="text-xs font-bold text-slate-500">di potenza nominale</span>
              </div>
            </div>

            {/* Rotating UI Compass Overlay */}
            <div className="flex items-center justify-center p-4">
              <div className="relative w-44 h-44 rounded-full border border-slate-200/50 flex items-center justify-center shadow-inner bg-slate-50/50 select-none">
                {/* Fixed Sun Indicator inside */}
                <div className="absolute top-1 select-none text-center flex flex-col items-center">
                  <Sun className="w-5 h-5 text-amber-500 animate-pulse" />
                  <span className="text-[7.5px] font-black text-amber-600 tracking-wider">midday sun (South)</span>
                </div>

                {/* Rotating Compass Ring */}
                <div 
                  className="absolute inset-2 rounded-full border border-dashed border-[#3E4A35]/20 flex items-center justify-center transition-transform duration-100 ease-out font-mono text-[9px] font-black text-[#3E4A35]/60"
                  style={{ transform: `rotate(${-camperHeading}deg)` }}
                >
                  <span className="absolute top-2 font-black text-[#A45C40]">N</span>
                  <span className="absolute right-2 font-bold">E</span>
                  <span className="absolute bottom-2 font-bold">S</span>
                  <span className="absolute left-2 font-bold">O</span>
                  
                  {/* Visual drawing of camper silhouette on the rotating compass compass overlay */}
                  <div className="w-8 h-12 bg-[#3E4A35]/20 border border-[#3E4A35] rounded-md absolute flex flex-col items-center justify-between pb-1 select-none shadow-sm">
                    {/* Windshield */}
                    <div className="w-6 h-2.5 bg-sky-300 rounded-t-sm mt-1 border-b border-sky-400 opacity-80" />
                    {/* Panels */}
                    <div className="w-5 h-4 bg-slate-705 border border-slate-600 rounded-xs flex flex-wrap content-center gap-0.5 p-0.5 justify-center">
                      <div className="w-1.5 h-1 bg-sky-200 rounded-3xs" />
                      <div className="w-1.5 h-1 bg-sky-200 rounded-3xs" />
                    </div>
                    {/* Camper front indicator arrow dot */}
                    <div className="absolute -top-1.5 w-1.5 h-1.5 bg-[#A45C40] rounded-full" />
                  </div>
                </div>

                {/* Circular Center Dial Mask */}
                <div className="absolute inset-14 bg-white/40 backdrop-blur-3xs rounded-full pointer-events-none flex items-center justify-center border border-slate-200/30">
                  <div className="text-center font-bold font-sans text-[11px] text-slate-700 leading-none">
                    🧭 {getCardinalDirection(camperHeading)}
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Status message depending on yield percentage */}
            <div className={`p-3 rounded-xl border flex items-start gap-2 text-xs font-semibold leading-relaxed ${
              solarEfficiency > 80 
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                : solarEfficiency > 50 
                  ? 'bg-amber-50 text-amber-900 border-amber-200' 
                  : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}>
              {solarEfficiency > 80 ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p><b>Orientamento Eccellente!</b> I tuoi pannelli solari cattureranno la massima irradiazione disponibile in questo momento della sosta.</p>
                </>
              ) : solarEfficiency > 50 ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p><b>Rendimento Moderato.</b> Puoi incrementare la resa spostando o ruotando il camper rispetto all'orizzonte solare meridionale.</p>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p><b>Rendimento Scadente!</b> I moduli fotovoltaici sono in forte angolo cieco o completamente in ombra. Tensione batteria esposta a degrado repentino.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: BATTERY CHECKER */}
      {activeToolSection === 'battery' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 select-none animate-fade-in">
          {/* Slider controls: Left */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/60 p-5 space-y-4">
            <h3 className="font-bold text-[#3E4A35] text-sm flex items-center gap-2 border-b border-stone-100 pb-2.5">
              <Zap className="w-4.5 h-4.5 text-emerald-600 fill-emerald-100" />
              Soglie Tensione ed Elettrochimica
            </h3>

            {/* Select Chemistry */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase">Tecnologia Batteria Servizi</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['lifepo4', 'agm', 'gel'] as const).map(chem => (
                  <button
                    key={chem}
                    onClick={() => handleChemistryChange(chem)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      batteryChemistry === chem
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-650 border-slate-200'
                    }`}
                  >
                    {chem === 'lifepo4' && '🔋 Litio (LiFePO4)'}
                    {chem === 'agm' && '⚡ AGM Piombo'}
                    {chem === 'gel' && '📦 GEL Piombo'}
                  </button>
                ))}
              </div>
            </div>

            {/* Input voltage with slider */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-black text-slate-500 uppercase">Tensione Rilevata (Volt cc)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.05"
                    min="10.0"
                    max="14.8"
                    value={voltage}
                    onChange={(e) => setVoltage(parseFloat(e.target.value) || 12.0)}
                    className="w-16 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-center text-xs font-black text-[#3E4A35]"
                  />
                  <span className="text-xs font-bold text-slate-500">Volt</span>
                </div>
              </div>
              
              <input
                type="range"
                min={batteryChemistry === 'lifepo4' ? '11.0' : '10.5'}
                max={batteryChemistry === 'lifepo4' ? '14.6' : '13.8'}
                step="0.1"
                value={voltage}
                onChange={(e) => setVoltage(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1 select-none">
                <span>Scarica (Deap)</span>
                <span>Nominale</span>
                <span>Float / Ricarica</span>
              </div>
            </div>

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
              <span className="text-[10.5px] font-black text-slate-600 uppercase tracking-widest block">Metodo di Lettura</span>
              <p className="text-[10.5px] text-slate-500 leading-normal">
                Per misurare fedelmente la tensione a riposo (Stato SoC reale), spegni tutte le luci, la pompa ed eventuali riscaldatori per almeno 15-20 minuti, e controlla che l'impianto solare non stia attivamente pompando tensione (fasi serali o interrotte).
              </p>
            </div>
          </div>

          {/* Results Details Display Panel: Right */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/60 p-5 flex flex-col justify-between space-y-4">
            <div className="text-center space-y-1">
              <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">Stato di Carica</span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-slate-800">{batterySoCResult.percentage}%</span>
                <span className="text-xs font-bold text-slate-500">SoC Disponibile</span>
              </div>
              <span className={`text-xs font-extrabold ${batterySoCResult.colorClass} block pt-1`}>
                {batterySoCResult.text}
              </span>
            </div>

            {/* Simulated Battery Progress Visual Bar */}
            <div className="w-full bg-slate-100 border border-slate-200 rounded-2xl h-6 relative overflow-hidden flex items-center shadow-inner">
              <div 
                className={`h-full transition-all duration-300 flex items-center justify-end px-2.5 ${
                  batterySoCResult.percentage > 50 
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500' 
                    : batterySoCResult.percentage > 20 
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400' 
                      : 'bg-gradient-to-r from-red-600 to-red-500'
                }`}
                style={{ width: `${Math.max(4, batterySoCResult.percentage)}%` }}
              />
              <span className="absolute left-1/2 transform -translate-x-1/2 text-[10px] sm:text-xs font-black text-slate-700 font-mono">
                {voltage.toFixed(2)}V CC ({batteryChemistry.toUpperCase()})
              </span>
            </div>

            {/* Recommendations block list depending of current charge */}
            <div className={`p-4 rounded-xl border space-y-2 select-none ${batterySoCResult.alertClass}`}>
              <span className="text-xs font-bold flex items-center gap-1.5 text-slate-700">
                <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-50" />
                Linee Guida di Bordo Off-grid:
              </span>
              <ul className="space-y-1">
                {batterySoCResult.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-xs text-slate-650 flex items-start gap-1.5 leading-relaxed font-medium">
                    <span className="text-emerald-500 shrink-0 select-none">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: WEIGHT & TYRES CONVERTER */}
      {activeToolSection === 'tyres' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 select-none animate-fade-in">
          {/* Slider input metrics: Left */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/60 p-5 space-y-4">
            <h3 className="font-bold text-[#3E4A35] text-sm flex items-center gap-2 border-b border-stone-100 pb-2.5">
              <Gauge className="w-4.5 h-4.5 text-slate-700" />
              Carico & Pressione Ideale
            </h3>

            {/* Weight inputs */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-black text-slate-500 uppercase">Massa stimata Camper (Kg)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="50"
                    min="2500"
                    max="4500"
                    value={tyreWeight}
                    onChange={(e) => setTyreWeight(parseInt(e.target.value) || 3100)}
                    className="w-16 px-1 py-0.5 bg-slate-50 border border-slate-200 rounded text-center text-xs font-black text-[#3E4A35]"
                  />
                  <span className="text-xs font-bold text-slate-500">Kg</span>
                </div>
              </div>
              <input
                type="range"
                min="2500"
                max="4200"
                step="50"
                value={tyreWeight}
                onChange={(e) => setTyreWeight(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#3E4A35]"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1 select-none">
                <span>Westfalia (2.8t)</span>
                <span>Standard (3.5t)</span>
                <span>Patente C (&gt;4.0t)</span>
              </div>
            </div>

            {/* Pressure converter */}
            <div className="space-y-2 pt-1 border-t border-stone-100 pt-3">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-black text-slate-500 uppercase">Convertitore Bar ⇄ PSI</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="8.0"
                    value={pressureBar}
                    onChange={(e) => setPressureBar(parseFloat(e.target.value) || 3.0)}
                    className="w-14 px-1 py-0.5 bg-slate-50 border border-slate-200 rounded text-center text-xs font-black text-[#3E4A35]"
                  />
                  <span className="text-xs font-semibold text-slate-500">Bar</span>
                </div>
              </div>
              <input
                type="range"
                min="2.0"
                max="6.5"
                step="0.1"
                value={pressureBar}
                onChange={(e) => setPressureBar(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#3E4A35]"
              />
              <p className="text-[10px] text-slate-400 font-mono text-right font-semibold">
                ⇄ Equivalente a <b>{calculatedPsi} PSI</b> della pompa dell'officina
              </p>
            </div>
          </div>

          {/* Guidelines output pane: Right */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/60 p-5 flex flex-col justify-between space-y-4">
            <h4 className="font-extrabold text-[#3E4A35] text-xs uppercase tracking-wider">
              Pressioni Consigliate a Freddo ({tyreWeight} Kg)
            </h4>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                <span className="text-[10px] text-slate-400 font-black uppercase block">Gomme Anteriori</span>
                <span className="text-sm font-extrabold text-slate-800 font-mono block pt-1">{tyreAdvice.front}</span>
                <span className="text-[8px] text-slate-400 font-medium">Motrice</span>
              </div>
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                <span className="text-[10px] text-slate-400 font-black uppercase block">Gomme Posteriori</span>
                <span className="text-sm font-extrabold text-[#A45C40] font-mono block pt-1">{tyreAdvice.rear}</span>
                <span className="text-[8px] text-slate-400 font-medium">Asse di carico / Sbalzo</span>
              </div>
            </div>

            <div className="p-3 bg-stone-50 text-slate-800 border border-slate-200 rounded-xl space-y-1 text-xs font-medium">
              <span className="font-bold flex items-center gap-1.5 text-[#3E4A35]">
                <Info className="w-4 h-4 shrink-0 text-[#3E4A35]" />
                Nota importante sui Pesi:
              </span>
              <p className="leading-relaxed text-[10.5px] text-slate-600">
                I valori indicati sono da considerarsi stime orientative basate sui carichi medi. <strong>Per la pressione ottimale e omologata consigliata, è assolutamente tassativo fare riferimento al manuale di uso e manutenzione del proprio veicolo e a quanto espressamente riportato sulla spalla del pneumatico montato sul mezzo.</strong>
              </p>
            </div>

            <div className="p-3.5 bg-blue-50 text-blue-900 border border-blue-150 rounded-xl space-y-1 text-xs font-medium">
              <span className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Regola di Sicurezza in Autostrada:
              </span>
              <p className="leading-relaxed text-[11px] text-blue-950 font-medium">
                Pressioni inferiori ai 4 Bar in grossi camper su telaio Ducato/Ford causano un surriscaldamento irreparabile della spalla del pneumatico ad alta velocità, esponendo il veicolo a gravi rischi di scoppio. Mantieni sempre i valori specificati!
              </p>
            </div>

            <p className="text-[10.5px] text-orange-755 font-bold italic border-t border-stone-100 pt-2 text-center leading-tight">
              {tyreAdvice.alert}
            </p>
          </div>
        </div>
      )}

      {/* SECTION 4: OFFLINE TROUBLESHOOTING KNOWLEDGE MANUAL */}
      {activeToolSection === 'diagnostics' && (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-5 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <h3 className="font-bold text-[#3E4A35] text-sm flex items-center gap-2">
              <Wrench className="w-4.5 h-4.5 text-stone-700" />
              Pronto Soccorso Tecnico Camperista
            </h3>
            
            <div className="relative shrink-0 w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={diagSearch}
                onChange={(e) => setDiagSearch(e.target.value)}
                placeholder="Cerca guasto (es. riscaldatore, gas, pompa...)"
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#3E4A35] transition-all"
              />
            </div>
          </div>

          {/* Quick Categories filter inside Diagnostis */}
          <div className="flex flex-wrap gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
            {(['all', 'electric', 'water', 'gas', 'appliances'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setDiagCategory(cat)}
                className={`flex-1 py-1.5 text-center text-[10px] font-black uppercase rounded-md transition-all cursor-pointer ${
                  diagCategory === cat
                    ? 'bg-[#3E4A35] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {cat === 'all' && 'Tutti'}
                {cat === 'electric' && 'Elettrico'}
                {cat === 'water' && 'Acqua'}
                {cat === 'gas' && 'Gas'}
                {cat === 'appliances' && 'Elettrod.'}
              </button>
            ))}
          </div>

          <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredGuides.length > 0 ? (
              filteredGuides.map(guide => (
                <div key={guide.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  {/* Guide Header */}
                  <div className="bg-slate-50 border-b border-slate-150 px-4 py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">
                        {guide.category === 'electric' && '⚡'}
                        {guide.category === 'water' && '💧'}
                        {guide.category === 'gas' && '🔥'}
                        {guide.category === 'appliances' && '⚙️'}
                      </span>
                      <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm leading-tight">
                        {guide.title}
                      </h4>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      guide.severity === 'high' 
                        ? 'bg-rose-100 text-rose-800' 
                        : 'bg-amber-150 text-amber-800'
                    }`}>
                      {guide.severity === 'high' ? 'Alta priorità' : 'Moderata'}
                    </span>
                  </div>

                  {/* Guide Body */}
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed border-b border-stone-100 pb-3">
                      <div>
                        <span className="font-black text-rose-700 uppercase text-[9px] block mb-0.5">Sintomo:</span>
                        <p className="font-medium text-slate-600 text-[11px] leading-normal">{guide.symptom}</p>
                      </div>
                      <div>
                        <span className="font-black text-slate-500 uppercase text-[9px] block mb-0.5">Causa Probabile:</span>
                        <p className="font-medium text-slate-650 text-[11px] leading-normal">{guide.cause}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="font-black text-emerald-800 uppercase text-[9.5px] tracking-wider block">
                        🛠️ Procedura di Risoluzione Rapida:
                      </span>
                      <ol className="space-y-1.5 list-decimal list-inside text-xs font-semibold leading-relaxed text-slate-700">
                        {guide.steps.map((step, idx) => (
                          <li key={idx} className="pl-1">
                            <span className="text-slate-600 font-medium pl-1">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                <span className="text-xl">🔍</span>
                <p className="text-xs font-medium text-slate-500">Nessuna voce trovata per "{diagSearch}". Prova termini semplici o usa i filtri di categoria su.</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
