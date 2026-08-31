import React, { useState } from 'react';
import { VehicleSpecs, FuelLog } from '../types';
import {
  Truck, CheckSquare, Fuel, Flame, Battery, Shield, AlertCircle, Plus,
  Calculator, ChevronRight, Compass, Wrench, Settings, MapPin, Download,
  Radio, Wifi, Smartphone, LogOut, HelpCircle, FileText, Lock, X
} from 'lucide-react';

interface ToolsTabProps {
  vehicle: VehicleSpecs;
  setVehicle: (v: VehicleSpecs) => void;
  fuelLogs: FuelLog[];
  onAddFuelLog: (log: Partial<FuelLog>) => void;
}

export const ToolsTab: React.FC<ToolsTabProps> = ({
  vehicle,
  setVehicle,
  fuelLogs,
  onAddFuelLog
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [openModal, setOpenModal] = useState<string | null>(null);

  // Pre-trip Checklist state
  const [checklist, setChecklist] = useState([
    { id: 1, text: 'Cunei di livellamento ritirati', checked: true },
    { id: 2, text: 'Cavo elettrico 220V staccato e riposto', checked: true },
    { id: 3, text: 'Gradino di ingresso rientrato', checked: true },
    { id: 4, text: 'Finestre e oblò del tetto ben chiusi', checked: false },
    { id: 5, text: 'Bombola del gas chiusa in sicurezza', checked: true },
    { id: 6, text: 'Sportelli interni e frigorifero bloccati', checked: false },
    { id: 7, text: 'Pressione pneumatici e luci sosta verificate', checked: true }
  ]);

  // Weight calculator variables
  const [passengerCount, setPassengerCount] = useState(2);
  const [waterWeightKg, setWaterWeightKg] = useState(80);
  const [luggageWeightKg, setLuggageWeightKg] = useState(120);
  const [bikesWeightKg, setBikesWeightKg] = useState(30);

  const totalEstimatedWeightTons = (
    vehicle.weightTons +
    (passengerCount * 75 + waterWeightKg + luggageWeightKg + bikesWeightKg) / 1000
  ).toFixed(2);

  // Fuel log form state
  const [fuelLiters, setFuelLiters] = useState('60');
  const [fuelCost, setFuelCost] = useState('100');
  const [fuelOdometer, setFuelOdometer] = useState('149500');

  const toggleChecklist = (id: number) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleAddFuel = (e: React.FormEvent) => {
    e.preventDefault();
    const l = parseFloat(fuelLiters) || 0;
    const c = parseFloat(fuelCost) || 0;
    const km = parseInt(fuelOdometer) || 150000;
    onAddFuelLog({
      date: new Date().toLocaleDateString('it-IT'),
      liters: l,
      costEuro: c,
      odometerKm: km,
      pricePerLiter: l > 0 ? parseFloat((c / l).toFixed(3)) : 1.65
    });
    setFuelLiters('');
    setFuelCost('');
  };

  return (
    <div className="pb-28 pt-4 max-w-3xl mx-auto px-4 space-y-5 font-sans">
      
      {/* 1. Header Banner matching Screenshot 10 */}
      <div className="bg-[#3e5337] dark:bg-[#2b3a27] text-white rounded-2xl p-5 sm:p-6 shadow-sm border border-[#34472d] space-y-2">
        <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-950 text-amber-200 tracking-wider">
          PANNELLO STRUMENTI DI BORDO
        </span>
        <h1 className="text-xl sm:text-2xl font-extrabold font-serif text-amber-100 leading-tight">
          Gestione & Configurazione Camper
        </h1>
        <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed max-w-xl">
          Monitora lo stato di manutenzione, gestisci le dimensioni per il navigatore sagomato, controlla la sicurezza pre-partenza e rimani in contatto con la community.
        </p>
      </div>

      {/* 2. Category Filter Pills matching Screenshot 10 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold no-scrollbar">
        {[
          { id: 'ALL', label: '🎛️ Tutti' },
          { id: 'EQUIP', label: '🛡️ Equipaggio & Partenza' },
          { id: 'BORDO', label: '📊 Risorse di Bordo' },
          { id: 'ROTTA', label: '🗺️ Rotta & Esplorazione' },
          { id: 'PIAZZOLA', label: '🏕️ Vita in Piazzola' },
          { id: 'COMMUNITY', label: '👥 Community' },
          { id: 'SETTINGS', label: '⚙️ Impostazioni' }
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-2 rounded-xl border shrink-0 transition-colors ${
              selectedCategory === cat.id
                ? 'bg-[#1E293B] text-white border-[#1E293B] shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 3. Organized Sections & Tool Cards */}
      <div className="space-y-6">
        
        {/* SECTION 1: EQUIPAGGIO & PARTENZA */}
        {(selectedCategory === 'ALL' || selectedCategory === 'EQUIP') && (
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              EQUIPAGGIO & PARTENZA
            </h3>

            <div className="grid grid-cols-1 gap-3">
              <div
                onClick={() => setOpenModal('CHECKLIST')}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-300/80 dark:border-slate-800 hover:border-emerald-600 transition-all cursor-pointer shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Checklist Pre-partenza</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Controlli rigorosi (valvole, finestre sollevate, bombole) prima della marcia.</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>

              <div
                onClick={() => setOpenModal('DISPENSA')}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-300/80 dark:border-slate-800 hover:border-emerald-600 transition-all cursor-pointer shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    <span>🛒</span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Dispensa & Spesa Smart</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Organizza i viveri a bordo, pianifica le ricette salva-risorse ed evita sprechi.</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>

              <div
                onClick={() => setOpenModal('WEIGHT')}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-300/80 dark:border-slate-800 hover:border-emerald-600 transition-all cursor-pointer shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Bilanciamento & Carico Utile</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Calcolo pesi di bagagli, acqua e passeggeri sotto i 3500 kg (Patente B).</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: RISORSE DI BORDO */}
        {(selectedCategory === 'ALL' || selectedCategory === 'BORDO') && (
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              RISORSE DI BORDO
            </h3>

            <div className="grid grid-cols-1 gap-3">
              <div
                onClick={() => setOpenModal('FUEL')}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-300/80 dark:border-slate-800 hover:border-emerald-600 transition-all cursor-pointer shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                    <Fuel className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Carta Carburante Sincronizzata</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Log rifornimenti in cloud, costo totale e medie consumo.</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>

              <div
                onClick={() => setOpenModal('SCADENZE')}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-300/80 dark:border-slate-800 hover:border-emerald-600 transition-all cursor-pointer shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                    <span>📅</span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Scadenziere di Bordo</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Tagliando, bombole gas, bollo, assicurazione e scadenze impianti.</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>

              <div
                onClick={() => setOpenModal('MANUTENZIONE')}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-300/80 dark:border-slate-800 hover:border-emerald-600 transition-all cursor-pointer shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Registro Manutenzione Cellula</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Traccia lavaggi, ispezioni infiltrazioni, bombole e sigillature.</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: ROTTA & ESPLORAZIONE */}
        {(selectedCategory === 'ALL' || selectedCategory === 'ROTTA') && (
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              ROTTA & ESPLORAZIONE
            </h3>

            <div className="grid grid-cols-1 gap-3">
              <div
                onClick={() => setOpenModal('ROLLY_ITINERARI')}
                className="bg-gradient-to-r from-[#1E293B] to-[#0F172A] text-white rounded-2xl p-4 border border-slate-800 hover:border-amber-400 transition-all cursor-pointer shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300">
                    <span>🚌</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-amber-200">Generatore Itinerari AI Rolly</h4>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950">PRO</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">Percorsi personalizzati e aree consigliate calcolate in base alle misure.</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-amber-300" />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: IMPOSTAZIONI */}
        {(selectedCategory === 'ALL' || selectedCategory === 'SETTINGS') && (
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              IMPOSTAZIONI
            </h3>

            <div className="grid grid-cols-1 gap-3">
              <div
                onClick={() => setOpenModal('VEHICLE')}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-300/80 dark:border-slate-800 hover:border-emerald-600 transition-all cursor-pointer shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Il Mio Camper, misure e info</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Altezza, larghezza, peso e lunghezza per ponti e restrizioni.</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 4. Bottom Box Status matching Screenshot 1 */}
      <div className="bg-[#e0ded5] dark:bg-slate-900 rounded-2xl p-5 border border-slate-300 dark:border-slate-800 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-300/80 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              CONNESSIONE RETE
            </span>
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">📊 ONLINE</span>
          </div>

          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <span>Profilo: <strong>Sam83</strong></span>
            <button className="text-rose-600 hover:text-rose-800 font-bold underline">🗑️ Cancella account</button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-bold">
          <button className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 hover:bg-slate-50">
            <Smartphone className="w-4 h-4 text-emerald-700" />
            <span>Installa App</span>
          </button>

          <button className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 hover:bg-slate-50">
            <LogOut className="w-4 h-4 text-amber-700" />
            <span>Esci</span>
          </button>

          <button className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 hover:bg-slate-50">
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <span>Aiuto & Feedback</span>
          </button>

          <button className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 hover:bg-slate-50">
            <FileText className="w-4 h-4 text-purple-600" />
            <span>Tutela & Licenza</span>
          </button>

          <button className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 hover:bg-slate-50">
            <Shield className="w-4 h-4 text-rose-600" />
            <span>Moderazione</span>
          </button>
        </div>
      </div>

      {/* MODALS for Tools */}
      
      {/* 1. Checklist Modal */}
      {openModal === 'CHECKLIST' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-700" />
                <span>🎒 Checklist Prima della Partenza</span>
              </h3>
              <button onClick={() => setOpenModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleChecklist(item.id)}
                  className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
                    item.checked
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-slate-800 dark:text-slate-200'
                      : 'bg-stone-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border font-bold text-xs ${
                    item.checked ? 'bg-emerald-800 text-white border-emerald-900' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {item.checked && '✓'}
                  </div>
                  <span className="text-xs sm:text-sm font-semibold">{item.text}</span>
                </div>
              ))}
            </div>

            <button onClick={() => setOpenModal(null)} className="w-full py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-xs">
              Salva e Chiudi
            </button>
          </div>
        </div>
      )}

      {/* 2. Weight Calculator Modal */}
      {openModal === 'WEIGHT' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-700" />
                <span>🚐 Calcolatore Peso & Sagoma Camper</span>
              </h3>
              <button onClick={() => setOpenModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl bg-stone-100 dark:bg-slate-800">
                <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Misure Sagoma</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">{vehicle.lengthMeters}m x {vehicle.heightMeters}m</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950/60">
                <span className="text-[10px] uppercase font-extrabold text-amber-800 block">Peso Stimato</span>
                <span className="text-sm font-extrabold text-amber-950 dark:text-amber-200">{totalEstimatedWeightTons} t / 3.50 t</span>
              </div>
            </div>

            <div className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Passeggeri: {passengerCount}</label>
                <input type="range" min="1" max="6" value={passengerCount} onChange={(e) => setPassengerCount(parseInt(e.target.value))} className="w-full accent-emerald-700" />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Acqua Serbatoio: {waterWeightKg}L</label>
                <input type="range" min="0" max="120" value={waterWeightKg} onChange={(e) => setWaterWeightKg(parseInt(e.target.value))} className="w-full accent-emerald-700" />
              </div>
            </div>

            <button onClick={() => setOpenModal(null)} className="w-full py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-xs">
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* 3. Fuel Log Modal */}
      {openModal === 'FUEL' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Fuel className="w-5 h-5 text-purple-700" />
                <span>⛽ Carta Carburante Sincronizzata</span>
              </h3>
              <button onClick={() => setOpenModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFuel} className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-50 dark:bg-slate-800/80 p-4 rounded-xl text-xs font-bold">
              <div>
                <label className="block text-slate-600 mb-1">Litri</label>
                <input type="number" step="0.1" value={fuelLiters} onChange={(e) => setFuelLiters(e.target.value)} className="w-full p-2 rounded-lg border bg-white dark:bg-slate-900" />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Costo €</label>
                <input type="number" step="0.1" value={fuelCost} onChange={(e) => setFuelCost(e.target.value)} className="w-full p-2 rounded-lg border bg-white dark:bg-slate-900" />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Km Odometer</label>
                <input type="number" value={fuelOdometer} onChange={(e) => setFuelOdometer(e.target.value)} className="w-full p-2 rounded-lg border bg-white dark:bg-slate-900" />
              </div>
              <button type="submit" className="col-span-1 sm:col-span-3 py-2 rounded-lg bg-emerald-800 text-white font-bold text-xs mt-2">
                + Registra Rifornimento
              </button>
            </form>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {fuelLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-stone-50 dark:bg-slate-800 flex items-center justify-between text-xs font-semibold">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">{log.date} • {log.location || 'Rifornimento'}</span>
                    <span className="text-slate-500 text-[11px]">{log.liters} L @ {log.pricePerLiter}€/L</span>
                  </div>
                  <span className="font-extrabold text-emerald-800 text-sm">{log.costEuro} €</span>
                </div>
              ))}
            </div>

            <button onClick={() => setOpenModal(null)} className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs">
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* 4. Vehicle Specs Modal */}
      {openModal === 'VEHICLE' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-slate-700" />
                <span>🚐 Configurazione Mezzo</span>
              </h3>
              <button onClick={() => setOpenModal(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block text-slate-600 mb-1">Modello Camper</label>
                <input
                  type="text"
                  value={vehicle.modelName}
                  onChange={(e) => setVehicle({ ...vehicle, modelName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1">Lunghezza (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={vehicle.lengthMeters}
                    onChange={(e) => setVehicle({ ...vehicle, lengthMeters: parseFloat(e.target.value) || 6.99 })}
                    className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Altezza (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={vehicle.heightMeters}
                    onChange={(e) => setVehicle({ ...vehicle, heightMeters: parseFloat(e.target.value) || 3.10 })}
                    className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>
            </div>

            <button onClick={() => setOpenModal(null)} className="w-full py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-xs">
              Aggiorna Sagoma
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

