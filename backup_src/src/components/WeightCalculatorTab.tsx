import React from 'react';
import { 
  Scale, 
  Trash2, 
  Plus, 
  RotateCcw, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  TrendingUp, 
  Compass,
  ArrowRightLeft,
  Settings,
  Flame,
  Droplet,
  Users,
  Luggage,
  Wrench
} from 'lucide-react';

interface CargoItem {
  id: string;
  name: string;
  weight: number; // in kg
  category: 'crew' | 'liquids' | 'equipment' | 'luggage' | 'accessories';
  position: 'front' | 'center' | 'rear'; // weight distribution zones
  quantity: number;
}

const DEFAULT_ITEMS: CargoItem[] = [
  // Passeggeri & Equipaggio
  { id: '1', name: 'Conducente (Incluso in ordine di marcia)', weight: 75, category: 'crew', position: 'front', quantity: 1 },
  { id: '2', name: 'Passeggero Anteriore', weight: 70, category: 'crew', position: 'front', quantity: 1 },
  { id: '3', name: 'Passeggeri Posteriori (Bambini/Amici)', weight: 65, category: 'crew', position: 'center', quantity: 0 },
  { id: '4', name: 'Cane / Animali domestici', weight: 15, category: 'crew', position: 'center', quantity: 0 },
  
  // Serbatoi & Liquidi
  { id: '5', name: 'Serbatoio Acqua Chiara (120L)', weight: 120, category: 'liquids', position: 'center', quantity: 0 }, // 0 means empty, can be toggled
  { id: '6', name: 'Serbatoio Acqua Grigia (Frazione di carico)', weight: 40, category: 'liquids', position: 'center', quantity: 0 },
  { id: '7', name: 'Bombole Gas GPL x2', weight: 25, category: 'liquids', position: 'front', quantity: 2 },
  { id: '8', name: 'Serbatoio Carburante Diesel', weight: 70, category: 'liquids', position: 'front', quantity: 1 },

  // Attrezzatura & Camping
  { id: '9', name: 'Tavolo e sedie da campeggio', weight: 18, category: 'equipment', position: 'rear', quantity: 1 },
  { id: '10', name: 'E-Bike con batteria', weight: 26, category: 'equipment', position: 'rear', quantity: 0 },
  { id: '11', name: 'Cavi elettrici & Cunei di sosta', weight: 12, category: 'equipment', position: 'rear', quantity: 1 },
  { id: '12', name: 'Tendalino esterno montato', weight: 35, category: 'equipment', position: 'center', quantity: 1 },

  // Bagagli & Personale
  { id: '13', name: 'Cambusa / Alimenti a bordo', weight: 25, category: 'luggage', position: 'center', quantity: 1 },
  { id: '14', name: 'Stoviglie, pentole & caffettiera', weight: 15, category: 'luggage', position: 'center', quantity: 1 },
  { id: '15', name: 'Abbigliamento per equipaggio', weight: 20, category: 'luggage', position: 'center', quantity: 1 },
  { id: '16', name: 'Confezioni acqua potabile', weight: 9, category: 'luggage', position: 'center', quantity: 2 },

  // Accessori extra
  { id: '17', name: 'Batteria Servizi Addizionale LiFePO4', weight: 18, category: 'accessories', position: 'center', quantity: 1 },
  { id: '18', name: 'Pannelli Solari fotovoltaici', weight: 15, category: 'accessories', position: 'front', quantity: 1 },
  { id: '19', name: 'Condizionatore Cellula 220V', weight: 30, category: 'accessories', position: 'center', quantity: 0 },
];

export function WeightCalculatorTab() {
  const [items, setItems] = React.useState<CargoItem[]>(() => {
    const saved = localStorage.getItem('camper_cargo_items');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return DEFAULT_ITEMS; }
    }
    return DEFAULT_ITEMS;
  });

  // Base vehicle configurations
  const [massaOrdineMarcia, setMassaOrdineMarcia] = React.useState<number>(2950); // M.O.M: camper + typical fluids + fuel + driver 75kg
  const [massaMassima, setMassaMassima] = React.useState<number>(3500); // Standard driving license B limit is always 3500kg

  // Custom Item entry State
  const [newItemName, setNewItemName] = React.useState('');
  const [newItemWeight, setNewItemWeight] = React.useState<number>(10);
  const [newItemCat, setNewItemCat] = React.useState<CargoItem['category']>('luggage');
  const [newItemPos, setNewItemPos] = React.useState<CargoItem['position']>('center');

  // Sync to local storage
  React.useEffect(() => {
    localStorage.setItem('camper_cargo_items', JSON.stringify(items));
  }, [items]);

  const updateItemQty = (id: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const updateItemPosition = (id: string, pos: CargoItem['position']) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, position: pos };
      }
      return item;
    }));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: '🗑️ Elemento rimosso dal calcolo.' }
    }));
  };

  const addNewCargo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || newItemWeight <= 0) return;

    const newItem: CargoItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      weight: newItemWeight,
      category: newItemCat,
      position: newItemPos,
      quantity: 1
    };

    setItems(prev => [...prev, newItem]);
    setNewItemName('');
    setNewItemWeight(10);
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: `➕ Aggiunto: ${newItem.name} (${newItem.weight} kg)` }
    }));
  };

  const resetToDefault = () => {
    if (confirm('Sei sicuro di voler ripristinare la lista di carico standard?')) {
      setItems(DEFAULT_ITEMS);
      localStorage.removeItem('camper_cargo_items');
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: '🔄 Elenco dei pesi ripristinato alla configurazione di default.' }
      }));
    }
  };

  // Math totals
  const totalCargoWeight = React.useMemo(() => {
    return items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
  }, [items]);

  const totalVehicleWeight = massaOrdineMarcia + totalCargoWeight;
  const payloadCapacityRemaining = massaMassima - totalVehicleWeight;
  const percentUsed = (totalVehicleWeight / massaMassima) * 100;

  // Weight distribution calculations across FRONT, CENTER, REAR axles
  // Typically, weight on FRONT and REAR are crucial.
  // Front weight = sum of front-loaded items + ~55% of center-loaded items
  // Rear weight = sum of rear-loaded items + ~45% of center-loaded items
  const distributionMath = React.useMemo(() => {
    let frontWeight = 0;
    let centerWeight = 0;
    let rearWeight = 0;

    items.forEach(item => {
      const itemTot = item.weight * item.quantity;
      if (item.position === 'front') frontWeight += itemTot;
      else if (item.position === 'center') centerWeight += itemTot;
      else if (item.position === 'rear') rearWeight += itemTot;
    });

    // We assume the Base M.O.M of 2950kg is distributed:
    // ~1500kg Front (including heavy motor engine, driver etc) and ~1450kg Rear
    const baseFront = massaOrdineMarcia * 0.51;
    const baseRear = massaOrdineMarcia * 0.49;

    // Distribute center cargo weight roughly 45% Front / 55% Rear to model typical camper centers of gravity
    const calculatedFront = baseFront + frontWeight + (centerWeight * 0.45);
    const calculatedRear = baseRear + rearWeight + (centerWeight * 0.55);
    const calculatedTotal = calculatedFront + calculatedRear;

    const frontPercentage = calculatedTotal > 0 ? (calculatedFront / calculatedTotal) * 100 : 50;
    const rearPercentage = calculatedTotal > 0 ? (calculatedRear / calculatedTotal) * 100 : 50;

    return {
      frontKg: Math.round(calculatedFront),
      rearKg: Math.round(calculatedRear),
      frontPct: Math.round(frontPercentage),
      rearPct: Math.round(rearPercentage)
    };
  }, [items, massaOrdineMarcia]);

  // Guidelines status advisor:
  // Fines are heavy over 3500kg. Over 3% tolerance in Italy / Europe there are fine risks plus immediate block of circulation!
  const isOverweight = totalVehicleWeight > massaMassima;
  const warningToleranceLimit = massaMassima * 1.05; // 5% tolerance
  const isCriticallyOverweight = totalVehicleWeight > warningToleranceLimit;

  // Axle balance classification
  // If rear is more than 65% of weight, steering wheels (frontal) lack friction - very dangerous under heavy rain!
  // If front is more than 55% of weight, steering is overloaded.
  const balanceState = React.useMemo(() => {
    const rearPct = distributionMath.rearPct;
    if (rearPct > 63) {
      return {
        label: '❌ Sbilanciato al Retro (Pericolo)',
        color: 'text-red-650 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-700 dark:text-red-200',
        desc: 'Il garage posteriore è sovraccarico! Le ruote anteriori perdono aderenza in salita e sotto la pioggia forte. Sposta parte dei bagagli al centro.'
      };
    }
    if (rearPct < 45) {
      return {
        label: '⚠️ Sbilanciato all\'Anteriore',
        color: 'text-amber-700 bg-amber-50 dark:bg-amber-950 border-amber-250 dark:border-amber-900 dark:text-amber-200',
        desc: 'Il peso grava troppo sull\'asse anteriore. Sterzata affaticata e consumo asimmetrico delle gomme.'
      };
    }
    return {
      label: '✓ Ottimo Bilanciamento Spaziale',
      color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-900 dark:text-emerald-200',
      desc: 'Il baricentro del veicolo è ideale. Garantisce massima stabilità in frenata di emergenza e aderenza ottimale sulle ruote motrici.'
    };
  }, [distributionMath]);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Visual Header Dashboard */}
      <div className="bg-gradient-to-br from-[#3E4A35] to-[#2B3523] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full inline-block">
              Sicurezza & Codice Stradale
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <Scale className="w-6 h-6 text-yellow-300" />
              Calcolatore Pesi & Bilanciamento Camper
            </h2>
            <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
              In Europa, la **patente B** impone un limite tassativo di **3500 kg**. Simula il peso reale caricando serbatoi, passeggeri e attrezzature prima di accendere il motore ed evita pesanti multe e pericoli di frenata.
            </p>
          </div>

          <button
            onClick={resetToDefault}
            className="px-3.5 py-2 bg-[#A45C40] hover:bg-[#8D4A30] active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5 uppercase tracking-wider shrink-0"
            title="Azzera la lista pesi alle condizioni standard"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Carico</span>
          </button>
        </div>

        {/* Dynamic Weight Bar Graphic */}
        <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-baseline gap-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-mono font-black text-white">
                {totalVehicleWeight.toLocaleString('it-IT')} <span className="text-lg">kg</span>
              </span>
              <span className="text-xs text-stone-300 font-semibold">Peso Stimato del Camper</span>
            </div>
            
            <div className="text-right">
              <span className="text-xs font-bold text-stone-300 block">
                Limite Patente B: <span className="text-white font-mono font-black">{massaMassima} kg</span>
              </span>
              {payloadCapacityRemaining >= 0 ? (
                <span className="text-xs text-emerald-350 font-bold">
                  Carico disponibile residuo: <span className="underline font-black">{Math.round(payloadCapacityRemaining)} kg</span>
                </span>
              ) : (
                <span className="text-xs text-red-400 font-black flex items-center gap-1 justify-end">
                  <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
                  Sovraccarico di {Math.abs(Math.round(payloadCapacityRemaining))} kg!
                </span>
              )}
            </div>
          </div>

          {/* Progress bar representing weight usage */}
          <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden relative border border-white/5">
            <div 
              style={{ width: `${Math.min(100, percentUsed)}%` }}
              className={`h-full rounded-full transition-all duration-350 ${
                isCriticallyOverweight 
                  ? 'bg-gradient-to-r from-red-500 to-rose-600'
                  : isOverweight
                    ? 'bg-gradient-to-r from-orange-400 to-red-500'
                    : percentUsed > 90
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-400'
                      : 'bg-gradient-to-r from-emerald-400 to-[#E6A15C]'
              }`}
            ></div>
            <div className="absolute top-0 bottom-0 left-[84%] border-l-2 border-red-500/80 z-10" title="Zona d'allarme sanzionabile in Europa (>3%)"></div>
            <div className="absolute top-0 bottom-0 left-[100%] border-l border-white/40 z-10"></div>
          </div>

          <div className="flex justify-between items-center text-[10px] text-stone-400 font-bold font-mono">
            <span>M.O.M Base: {massaOrdineMarcia} kg</span>
            <span>90% Carico: {Math.round(massaMassima * 0.9)} kg</span>
            <span>Massa Consentita: {massaMassima} kg</span>
          </div>
        </div>

      </div>

      {/* Grid Layout: Controls, Custom Add Form, Camper Distribution balance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8/12) - Loading Lists */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-5">
          <div className="flex justify-between items-center flex-wrap gap-2 pb-2 border-b border-stone-100 dark:border-slate-700">
            <div>
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">Elenco del Carico a Bordo</h3>
              <p className="text-[11px] text-slate-400 font-medium">Incrementa o decrementa la quantità per ricalcolare istantaneamente</p>
            </div>

            {/* Quick config sliders */}
            <div className="flex gap-4 text-xs font-bold text-slate-600 bg-stone-50 p-1.5 rounded-lg border border-stone-200/50">
              <label className="flex items-center gap-1.5">
                <span className="text-[10px] text-stone-500 uppercase">M.O.M Base:</span>
                <input 
                  type="number" 
                  value={massaOrdineMarcia} 
                  onChange={(e) => setMassaOrdineMarcia(Math.max(1000, parseInt(e.target.value) || 0))}
                  className="w-16 bg-white border border-stone-300 rounded px-1.5 py-0.5 font-mono text-center text-[#3E4A35]"
                />
                <span className="text-[10px] text-stone-400">kg</span>
              </label>
            </div>
          </div>

          {/* Grouped Category Listing */}
          <div className="space-y-6">
            {(['crew', 'liquids', 'equipment', 'luggage', 'accessories'] as const).map(cat => {
              const catItems = items.filter(item => item.category === cat);
              if (catItems.length === 0) return null;

              let catName = 'Bagagli Personali';
              let catIcon = <Luggage className="w-4 h-4" />;
              let catHeaderColor = 'text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-900 border-amber-100 dark:border-amber-800';

              if (cat === 'crew') {
                catName = 'Passeggeri & Equipaggio';
                catIcon = <Users className="w-4 h-4" />;
                catHeaderColor = 'text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-900 border-indigo-100 dark:border-indigo-800';
              } else if (cat === 'liquids') {
                catName = 'Serbatoi, Acqua & Combustibili';
                catIcon = <Droplet className="w-4 h-4" />;
                catHeaderColor = 'text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-900 border-blue-100 dark:border-blue-800';
              } else if (cat === 'equipment') {
                catName = 'Attrezzatura Camping & Biciclette';
                catIcon = <Flame className="w-4 h-4" />;
                catHeaderColor = 'text-emerald-700 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-900 border-emerald-100 dark:border-emerald-800';
              } else if (cat === 'accessories') {
                catName = 'Accessori Camper & Upgrade Fisici';
                catIcon = <Wrench className="w-4 h-4" />;
                catHeaderColor = 'text-stone-700 dark:text-stone-200 bg-stone-50 dark:bg-slate-700 border-stone-200/70 dark:border-slate-600';
              }

              const categorySubtotal = catItems.reduce((acc, current) => acc + (current.weight * current.quantity), 0);

              return (
                <div key={cat} className="space-y-2">
                  <div className={`p-2 rounded-xl border flex justify-between items-center ${catHeaderColor}`}>
                    <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      {catIcon}
                      {catName}
                    </span>
                    <span className="text-[10px] font-black font-mono">
                      Subtotale: {categorySubtotal} kg
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 font-sans">
                    {catItems.map(item => {
                      const itemTot = item.weight * item.quantity;
                      return (
                        <div key={item.id} className="py-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="min-w-0 pr-2">
                            <h4 className="font-extrabold text-[#2D2926] dark:text-slate-100 text-xs leading-snug">{item.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold font-mono">
                                Ciascuno: <span className="text-[#A45C40] dark:text-orange-400">{item.weight} kg</span>
                              </span>
                              <span className="text-[9px] text-[#A45C40]">•</span>
                              
                              {/* Interactive Axle Position Selector for balance simulation */}
                              <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200/40">
                                <button
                                  type="button"
                                  onClick={() => updateItemPosition(item.id, 'front')}
                                  className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded ${
                                    item.position === 'front' ? 'bg-[#3E4A35] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                  title="Posizionato sul davanti del camper (es. Gavone anteriore, cabina)"
                                >
                                  Davanti
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateItemPosition(item.id, 'center')}
                                  className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded ${
                                    item.position === 'center' ? 'bg-[#3E4A35] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                  title="Posizionato al centro del camper (es. Serbatoi acque calpestabili, armadi, dinette)"
                                >
                                  Centro
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateItemPosition(item.id, 'rear')}
                                  className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded ${
                                    item.position === 'rear' ? 'bg-[#3E4A35] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                  title="Posizionato nel garage posteriore o sul portabici posteriore"
                                >
                                  Garage/Retro
                                </button>
                              </div>

                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto shrink-0 border-t border-dashed border-stone-150 pt-2.5 sm:pt-0 sm:border-0">
                            {/* Quantity buttons */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateItemQty(item.id, -1)}
                                className="w-6 h-6 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 border border-stone-200/50 cursor-pointer font-black select-none text-xs"
                              >
                                -
                              </button>
                              <span className="w-6 text-center font-black text-xs text-[#2D2926] font-mono">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateItemQty(item.id, 1)}
                                className="w-6 h-6 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 border border-stone-200/50 cursor-pointer font-black select-none text-xs"
                              >
                                +
                              </button>
                            </div>

                            {/* Total Line Weight label */}
                            <div className="text-right min-w-[70px]">
                              <span className="text-xs font-black font-mono text-[#A45C40]">
                                {itemTot} kg
                              </span>
                            </div>

                            {/* Optional delete button for custom cargo */}
                            {items.length > DEFAULT_ITEMS.length && !DEFAULT_ITEMS.find(d => d.id === item.id) && (
                              <button
                                type="button"
                                onClick={() => deleteItem(item.id)}
                                className="p-1 rounded bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-800 transition-all cursor-pointer"
                                title="Rimuovi questo bagaglio personalizzato"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Column (5/12) - Weight Distribution Visualizer & Custom cargo addition */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section A: Visual Balance & Axle distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-4">
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#3E4A35] dark:text-emerald-400" />
              Bilanciamento su Assali
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">Calcolo del baricentro spaziale</p>

            {/* Camper Chassis side visualization */}
            <div className="bg-[#1C1B1A] p-4 rounded-xl flex flex-col items-center justify-center overflow-hidden border border-stone-800 select-none text-white font-mono relative">
              <div className="absolute right-2 top-2 bg-stone-800 border border-stone-700 rounded px-1.5 py-0.5 text-[8px] font-bold text-stone-300">
                L: ~7.0 m
              </div>

              {/* Chassis shape with axles weights overlays */}
              <div className="w-full max-w-[280px] h-28 relative flex items-center justify-center">
                {/* Horizontal frame rail */}
                <div className="absolute top-[68%] left-[10%] right-[10%] h-2.5 bg-stone-600 border border-stone-500 rounded"></div>

                {/* Front engine cabin indicator */}
                <div className="absolute top-[28%] right-[10%] w-[25%] h-[40%] bg-stone-700/80 rounded-tl-3xl border border-stone-500 flex items-center justify-center text-[9px] font-bold text-[#E2E5DE]">
                  Motore
                </div>

                {/* Camper habitation block */}
                <div className="absolute top-[16%] left-[10%] right-[28%] h-[52%] bg-stone-800/90 rounded-t-lg border border-stone-500/80 p-1 text-[8px] text-stone-400 flex flex-col justify-end">
                  <span>DINÈTE & SERBATOI</span>
                </div>

                {/* Rear Heavy Garage icon */}
                <div className="absolute top-[32%] left-[12%] w-[18%] h-[36%] bg-[#A45C40]/25 border border-[#A45C40]/50 rounded text-[7px] text-orange-200 flex items-center justify-center text-center leading-tight">
                  Gavone<br/>Garage
                </div>

                {/* FRONT WHEEL and REAR WHEEL */}
                <div className="absolute bottom-[2%] right-[22%] flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-black border-2 border-stone-500 flex items-center justify-center text-[8px] font-bold text-yellow-300">
                    {distributionMath.frontPct}%
                  </div>
                  <span className="text-[8px] text-stone-400 mt-0.5">Asse Anteriore</span>
                </div>

                <div className="absolute bottom-[2%] left-[22%] flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-black border-2 border-stone-500 flex items-center justify-center text-[8px] font-bold text-yellow-300">
                    {distributionMath.rearPct}%
                  </div>
                  <span className="text-[8px] text-stone-400 mt-0.5">Asse Posteriore</span>
                </div>
              </div>

              {/* Axle numerical readouts */}
              <div className="grid grid-cols-2 gap-4 w-full border-t border-stone-800 pt-3 mt-1.5 text-center">
                <div>
                  <span className="block text-[8px] text-stone-400 font-bold uppercase">Asse Posteriore</span>
                  <span className="text-sm font-black text-white">{distributionMath.rearKg} kg</span>
                </div>
                <div>
                  <span className="block text-[8px] text-stone-400 font-bold uppercase">Asse Anteriore</span>
                  <span className="text-sm font-black text-white">{distributionMath.frontKg} kg</span>
                </div>
              </div>

            </div>

            {/* Diagnostics recommendation indicator box */}
            <div className={`p-4 rounded-xl border flex flex-col gap-1.5 ${balanceState.color}`}>
              <h4 className="font-extrabold text-xs uppercase tracking-wider">{balanceState.label}</h4>
              <p className="text-[10px] leading-relaxed font-semibold opacity-95">{balanceState.desc}</p>
            </div>
          </div>

          {/* Section B: Custom cargo addition Form */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-4">
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#A45C40]" />
              Aggiungi Altro Bagaglio
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">Registra i tuoi pacchi e accessori personalizzati</p>

            <form onSubmit={addNewCargo} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Nome del Bagaglio / Oggetto</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Tavola da Surf, Cassetta degli attrezzi..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 dark:border-slate-600 bg-stone-50 dark:bg-slate-900 rounded-lg text-[#2D2926] dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-[#3E4A35] dark:focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Peso Stimato (kg)</label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={newItemWeight}
                    onChange={(e) => setNewItemWeight(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-xs border border-stone-200 dark:border-slate-600 bg-stone-50 dark:bg-slate-900 rounded-lg text-[#2D2926] dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-[#3E4A35] dark:focus:border-emerald-400 font-mono text-center font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Posizionamento</label>
                  <select
                    value={newItemPos}
                    onChange={(e) => setNewItemPos(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-stone-200 dark:border-slate-600 bg-stone-50 dark:bg-slate-900 rounded-lg text-[#2D2926] dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-[#3E4A35] dark:focus:border-emerald-400 cursor-pointer"
                  >
                    <option value="front">Anteriore (Gabinetto/Cabina)</option>
                    <option value="center">Centro (Dinette/Sottofondi)</option>
                    <option value="rear">Posteriore (Garage/Portabici)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Categoria Merceologica</label>
                <select
                  value={newItemCat}
                  onChange={(e) => setNewItemCat(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 dark:border-slate-600 bg-stone-50 dark:bg-slate-900 rounded-lg text-[#2D2926] dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-[#3E4A35] dark:focus:border-emerald-400 cursor-pointer"
                >
                  <option value="luggage">Bagagli / Personale</option>
                  <option value="equipment">Attrezzatura Camping</option>
                  <option value="accessories">Accessorio Fisso</option>
                  <option value="crew">Equipaggio</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-black rounded-lg text-xs tracking-wider transition-all uppercase cursor-pointer text-center shadow-sm"
              >
                Includi nel Calcolo
              </button>
            </form>
          </div>

          {/* Section C: Educational camper tips */}
          <div className="bg-stone-50 dark:bg-slate-800 rounded-2xl border border-stone-200 dark:border-slate-700 p-4 space-y-2 text-[10.5px] leading-relaxed text-stone-600 dark:text-slate-400 font-medium font-sans">
            <span className="text-[9px] uppercase tracking-wider font-black text-[#A45C40] dark:text-orange-400 block">
              💡 Strategie Furbe Anti-Sanzione:
            </span>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                **Svuota le Acque Grigie**: Viaggia sempre con le acque di scarico a zero.
              </li>
              <li>
                **Valvola Travel-Lock (20 litri)**: Riempi l’acqua chiara sul luogo di arrivo, tieni solo una piccola riserva per il viaggio.
              </li>
              <li>
                **Spesa sul posto**: Evita casse d’acqua pesanti caricate alla partenza; compra bevande e cibi freschi vicino alla destinazione.
              </li>
              <li>
                **Bombole in Vetroresina**: Sostituisci quelle classiche in ferro con bombole ultraleggere in vetroresina per tagliare fino a 20-30 kg dall'asse anteriore.
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
