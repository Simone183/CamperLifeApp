import React from 'react';
import { 
  Sparkles, 
  MapPin, 
  Clock, 
  Truck, 
  Route, 
  Plus, 
  Check, 
  Navigation, 
  AlertCircle, 
  Compass, 
  PlusCircle, 
  BookOpen
} from 'lucide-react';
import { Place, VehicleDimensions, PlaceCategory } from '../types';

interface AIItineraryTabProps {
  vehicleDimensions: VehicleDimensions;
  onAddPlace: (place: Place) => void;
  onShowOnMap: (lat: number, lng: number, label: string) => void;
  savedPlaces: Place[];
}

interface AIDayStop {
  dayNumber: number;
  title: string;
  description: string;
  stopPlaceName: string;
  drivingSegment: string;
  activities: string[];
  camperTips: string;
  stopCoordinate: {
    lat: number;
    lng: number;
    label: string;
  };
}

interface AIItineraryResult {
  title: string;
  description: string;
  totalKm: string;
  totalDrivingTime: string;
  days: AIDayStop[];
}

export default function AIItineraryTab({ 
  vehicleDimensions, 
  onAddPlace, 
  onShowOnMap,
  savedPlaces 
}: AIItineraryTabProps) {
  // Input Form States
  const [startLocation, setStartLocation] = React.useState('');
  const [duration, setDuration] = React.useState(3);
  const [interests, setInterests] = React.useState<string[]>(['nature', 'food']);
  const [travelStyle, setTravelStyle] = React.useState('Scenico (ritmo rilassato)');
  
  // App States
  const [loading, setLoading] = React.useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<AIItineraryResult | null>(() => {
    const saved = localStorage.getItem('camper_ai_itinerary_result');
    return saved ? JSON.parse(saved) : null;
  });

  // Cycle through loading messages to provide the ultimate contextual wait experience
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const LOADING_MESSAGES = [
    "Analisi del punto di partenza e ricerca dei passi montani limitrofi...",
    "Filtro aree con portali barriera ed escludo sottopassi inferiori a " + vehicleDimensions.height + "m...",
    "Calcolo dei percorsi stradali ideali per " + (vehicleDimensions.modelName || 'il tuo camper') + "...",
    "Verifica aree di sosta camper e campeggi idonei in zona...",
    "Ordinamento delle tappe per massimizzare la facilità di manovra del mezzo...",
    "Selezione delle migliori attività di tipo: " + interests.join(", ") + "...",
    "Scrittura dell'itinerario in lingua italiana e posizionamento GPS in corso..."
  ];

  const handleInterestToggle = (id: string) => {
    setInterests(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startLocation.trim()) {
      setError("Inserisci una località di partenza valida.");
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingMsgIdx(0);

    try {
      const response = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startLocation,
          duration,
          interests,
          travelStyle,
          vehicleType: vehicleDimensions.modelName || 'Mansardato',
          vehicleDims: {
            length: vehicleDimensions.length,
            width: vehicleDimensions.width,
            height: vehicleDimensions.height
          }
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Impossibile contattare CamperLife AI.");
      }

      const data = await response.json();
      if (data.success && data.itinerary) {
        setResult(data.itinerary);
        localStorage.setItem('camper_ai_itinerary_result', JSON.stringify(data.itinerary));
        
        // Fire custom event to show a beautiful toast
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: "✨ Itinerario '" + data.itinerary.title + "' generato con successo!" } 
        }));
      } else {
        throw new Error("Formato risposta itinerario non valido.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Qualcosa è andato storto durante la generazione dell'itinerario.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStopToMap = (stop: AIDayStop) => {
    // Check if place is already added to avoid duplicates
    const isAdded = savedPlaces.some(p => 
      p.lat.toFixed(4) === stop.stopCoordinate.lat.toFixed(4) && 
      p.lng.toFixed(4) === stop.stopCoordinate.lng.toFixed(4)
    );

    if (isAdded) {
      window.dispatchEvent(new CustomEvent('show-toast', { 
        detail: { message: "ℹ️ Questa sosta è già registrata sul tuo database!" } 
      }));
      return;
    }

    const newPlace: Place = {
      id: `ai_stop_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: stop.stopPlaceName,
      category: 'area_sosta',
      lat: stop.stopCoordinate.lat,
      lng: stop.stopCoordinate.lng,
      address: stop.stopPlaceName + ", " + stop.drivingSegment.split("->").pop()?.trim() || "Itinerario AI",
      priceInfo: "Consigliata da CamperLife AI - Giorno " + stop.dayNumber,
      priceEuro: 15,
      rating: 4.5,
      facilities: ["Carico Acqua", "Scarico Grigie", "Scarico Nere fontanella", "Elettricità"],
      reviews: [{
        id: `review_ai`,
        user: "CamperLife AI",
        date: new Date().toLocaleDateString('it-IT'),
        rating: 5,
        comment: `Punto di sosta eccellente integrato nell'itinerario consigliato. Consigli camperistici: ${stop.camperTips}`
      }],
      imageUrl: "/area_sosta.png",
      source: "CamperLife AI Planner"
    };

    onAddPlace(newPlace);
    window.dispatchEvent(new CustomEvent('show-toast', { 
      detail: { message: "✅ '" + stop.stopPlaceName + "' importato con successo su Mappa Soste!" } 
    }));
  };

  const clearCurrentItinerary = () => {
    if (confirm("Vuoi rimuovere l'itinerario corrente e crearne uno nuovo?")) {
      setResult(null);
      localStorage.removeItem('camper_ai_itinerary_result');
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro section */}
      <div className="bg-[#222E1F] text-[#ECF1EB] p-5 rounded-2xl border border-[#3E4A35]/15 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-orange-200">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="text-[10px] uppercase font-black tracking-wider">Algoritmo di Navigazione Sagomata AI</span>
          </div>
          <h2 className="text-lg font-black mt-1">Generatore di Itinerari Personalizzato</h2>
          <p className="text-xs text-[#86997F] mt-1 leading-relaxed max-w-xl">
            Sfrutta l'intelligenza artificiale per tracciare un itinerario ottimizzato in base all'altezza ("{vehicleDimensions.height}m"), larghezza, peso del tuo camper, e ai tuoi interessi.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#1B2419] py-1.5 px-3 rounded-lg border border-[#86997F]/15 shrink-0 text-xs">
          <Truck className="w-4 h-4 text-emerald-400" />
          <div className="leading-tight">
            <span className="block text-[10px] text-slate-400 font-medium">Veicolo Attivo:</span>
            <span className="font-bold text-[#ECF1EB]">{vehicleDimensions.modelName || 'Configurato'} ({vehicleDimensions.height}m h)</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-xs flex flex-col items-center justify-center text-center space-y-6 min-h-[350px]">
          {/* Pulsating Compass Logo */}
          <div className="relative">
            <div className="absolute inset-0 bg-[#3E4A35]/10 rounded-full blur-xl scale-125 animate-ping" />
            <div className="p-5 bg-[#3E4A35] rounded-3xl text-white relative shadow-md">
              <Compass className="w-12 h-12 animate-[spin_5s_linear_infinite]" />
            </div>
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider animate-pulse">Generazione Itinerario AI...</h3>
            <p className="text-sm text-[#5A6B4E] font-medium leading-relaxed transition-all duration-500">
              "{LOADING_MESSAGES[loadingMsgIdx]}"
            </p>
          </div>
          <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-700 animate-[loading_2s_infinite]" style={{ width: '40%' }}></div>
          </div>
        </div>
      ) : result ? (
        /* Itinerary Result Display View */
        <div className="space-y-6">
          <div className="bg-[#F4F6F0] p-6 rounded-3xl border border-stone-250/25 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black bg-[#3E4A35]/10 text-[#3E4A35] px-2.5 py-0.5 rounded-full inline-block">
                  Itinerario Camper Selezionato
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 leading-tight">{result.title}</h3>
                <p className="text-xs text-slate-500">{result.description}</p>
              </div>
              <button
                onClick={clearCurrentItinerary}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl transition-all self-start sm:self-auto cursor-pointer"
              >
                Nuovo Itinerario
              </button>
            </div>

            {/* General Trip Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200/50">
              <div className="p-3 bg-white rounded-xl border border-slate-200/55 flex items-center gap-3">
                <div className="p-2 bg-[#3E4A35]/5 text-[#3E4A35] rounded-lg">
                  <Route className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Chilometri Totali</span>
                  <span className="text-sm font-extrabold text-slate-900">{result.totalKm}</span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200/55 flex items-center gap-3">
                <div className="p-2 bg-[#3E4A35]/5 text-[#3E4A35] rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Tempo al Volante</span>
                  <span className="text-sm font-extrabold text-slate-900">{result.totalDrivingTime}</span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200/55 flex items-center gap-3">
                <div className="p-2 bg-[#3E4A35]/5 text-[#3E4A35] rounded-lg">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-bold uppercase font-sans">Sagoma Verificata</span>
                  <span className="text-sm font-extrabold text-emerald-800">Camper {vehicleDimensions.height}m OK ✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* Days Chronology */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase text-[#3E4A35] tracking-wider">Cronologia Tappe Giorno per Giorno</h4>
            
            {result.days.map((day) => {
              const isPlaceSaved = savedPlaces.some(p => 
                p.lat.toFixed(4) === day.stopCoordinate.lat.toFixed(4) || 
                p.name.toLowerCase().trim() === day.stopPlaceName.toLowerCase().trim()
              );

              return (
                <div key={day.dayNumber} className="bg-white rounded-2xl border border-slate-200/60 p-4 sm:p-5 flex flex-col md:flex-row gap-5 hover:border-emerald-350 hover:shadow-xs transition-all">
                  {/* Day Badge Column */}
                  <div className="md:w-36 flex flex-row md:flex-col justify-between items-center md:items-start pb-3 md:pb-0 border-b md:border-b-0 md:border-r border-slate-100 shrink-0">
                    <div>
                      <div className="w-10 h-10 bg-[#3E4A35] text-white rounded-xl font-bold flex items-center justify-center text-lg shadow-sm">
                        {day.dayNumber}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#3E4A35]/75 mt-1 block">
                        Giorno {day.dayNumber}
                      </span>
                    </div>

                    <div className="md:mt-4 text-right md:text-left">
                      <span className="text-[11px] font-black bg-[#E7EBDC] text-[#3E4A35] py-0.5 px-2 rounded-md inline-block max-w-full truncate">
                        {day.drivingSegment}
                      </span>
                    </div>
                  </div>

                  {/* Details Block */}
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-extrabold text-slate-900">{day.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed text-justify">{day.description}</p>
                    </div>

                    {/* Recommended Sosta & Interaction Row */}
                    <div className="p-4 bg-[#F4F6F0] rounded-xl border border-stone-250/20 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2 max-w-md">
                          <MapPin className="w-4.5 h-4.5 text-[#3E4A35] shrink-0 mt-0.5" />
                          <div>
                            <span className="block text-[9px] uppercase tracking-wider font-extrabold text-[#3E4A35]/80">Area Sosta Consigliata:</span>
                            <span className="text-xs font-extrabold text-slate-900 block truncate">{day.stopPlaceName}</span>
                          </div>
                        </div>

                        {/* Interactive Buttons */}
                        <div className="flex flex-row items-center gap-1.5 self-stretch sm:self-auto shrink-0 justify-end">
                          <button
                            onClick={() => onShowOnMap(day.stopCoordinate.lat, day.stopCoordinate.lng, day.stopCoordinate.label)}
                            className="flex-1 sm:flex-none py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-[#3E4A35] text-[11px] font-bold rounded-lg shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer select-none"
                            title="Individua e centra temporaneamente la mappa sosta"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            Mostra Sosta
                          </button>

                          <button
                            disabled={isPlaceSaved}
                            onClick={() => handleAddStopToMap(day)}
                            className={`flex-1 sm:flex-none py-1.5 px-3 border text-[11px] font-black rounded-lg shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer select-none ${
                              isPlaceSaved 
                                ? 'bg-emerald-50 border-emerald-250/50 text-emerald-800 cursor-not-allowed opacity-90' 
                                : 'bg-[#3E4A35] hover:bg-[#5A6B4E] border-[#3E4A35] text-white'
                            }`}
                          >
                            {isPlaceSaved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            {isPlaceSaved ? 'Salvato' : 'Includi su Map'}
                          </button>
                        </div>
                      </div>

                      {/* GPS coords label */}
                      <span className="text-[9px] text-[#5A6B4E] uppercase font-mono block">
                        📍 GPS Coords: {day.stopCoordinate.lat.toFixed(5)}, {day.stopCoordinate.lng.toFixed(5)} ({day.stopCoordinate.label})
                      </span>
                    </div>

                    {/* Day Activities */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">Attività suggerite:</span>
                      <ul className="text-xs text-slate-700 space-y-1 pl-4 list-disc">
                        {day.activities.map((act, i) => (
                          <li key={i}>{act}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Driver & Camper Tip block */}
                    <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-2 text-amber-900">
                      <Truck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-800">Consiglio Camper:</span>
                        <p className="text-[11px] text-amber-950 font-medium leading-relaxed">{day.camperTips}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Form configuration view */
        <form onSubmit={handleGenerate} className="bg-white rounded-3xl border border-stone-250/20 p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Start point */}
            <div className="space-y-2">
              <label htmlFor="start_loc" className="block text-xs font-black text-[#3E4A35] uppercase tracking-wide">
                Località di Partenza
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  id="start_loc"
                  type="text"
                  value={startLocation}
                  onChange={(e) => setStartLocation(e.target.value)}
                  placeholder="Es: Siena, Trento, Aosta, Bari..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F4F6F0] border border-[#3E4A35]/15 focus:border-[#3E4A35] focus:ring-1 focus:ring-[#3E4A35] rounded-xl text-sm transition-all text-slate-900 outline-hidden font-medium"
                />
              </div>
              <span className="text-[10px] text-slate-500 block leading-tight">La località, provincia o indirizzo da cui desideri cominciare il tuo viaggio.</span>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label htmlFor="duration_days" className="block text-xs font-black text-[#3E4A35] uppercase tracking-wide font-sans">
                Durata dell'itinerario (Giorni)
              </label>
              <select
                id="duration_days"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full py-2.5 px-3 bg-[#F4F6F0] border border-[#3E4A35]/15 focus:border-[#3E4A35] rounded-xl text-sm font-medium outline-hidden select-none cursor-pointer text-slate-900"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(d => (
                  <option key={d} value={d}>
                    {d} {d === 1 ? 'Giorno' : 'Giorni'}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 block leading-tight">Pianifica fino a un massimo di 10 giorni consecutivi di tappa.</span>
            </div>

            {/* Travel Style */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-[#3E4A35] uppercase tracking-wide">
                Stile di Viaggio in Camper
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                {[
                  { id: "Lento (panoramico, sosta prolungata)", label: "Lento e Panoramico" },
                  { id: "Bilanciato (ritmo medio-caratteristico)", label: "Bilanciato" },
                  { id: "Intenso (tanti km, maratona esplorativa)", label: "Intenso" }
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setTravelStyle(st.id)}
                    className={`flex-1 py-2 px-3 border rounded-xl text-xs font-extrabold uppercase tracking-wide transition-all cursor-pointer ${
                      travelStyle === st.id
                        ? 'bg-[#3E4A35] dark:bg-emerald-700 text-white border-[#3E4A35] dark:border-emerald-600 shadow-xs'
                        : 'bg-[#F4F6F0] dark:bg-slate-950 hover:bg-[#E7EBDC] dark:hover:bg-slate-900 border-[#3E4A35]/15 dark:border-slate-700 text-[#3E4A35] dark:text-slate-300'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-slate-500 block leading-tight">Determina quanti chilometri di guida al giorno verranno pianificati.</span>
            </div>

            {/* Active Camper dimensions visualization block (Read-Only validation info!) */}
            <div className="p-4 rounded-xl bg-[#5A6B4E]/5 border border-[#5A6B4E]/15 space-y-1.5 flex flex-col justify-center">
              <span className="text-[10px] font-black uppercase text-[#3E4A35] tracking-tight block">Ingombro verificato per il viaggio:</span>
              <div className="text-xs font-bold text-slate-800 space-y-0.5">
                <p>📏 Altezza Massima: <strong className="text-emerald-800">{vehicleDimensions.height} m</strong></p>
                <p>📐 Lunghezza Mezzo: <strong className="text-slate-900">{vehicleDimensions.length} m</strong></p>
                <p>⚖️ Massa Complessiva: <strong className="text-slate-900">{vehicleDimensions.weight} t</strong></p>
              </div>
              <span className="text-[9px] text-[#5A6B4E] leading-snug block pt-1">
                L'AI eviterà la pianificazione di itinerari stradali che passano per colli montani o vicoli urbani inaccessibili per queste misure.
              </span>
            </div>
          </div>

          {/* Core Interests Checklist */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-black text-[#3E4A35] uppercase tracking-wide">
              Interessi Principali del Viaggio (Seleziona uno o più)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'Natura e Montagna', label: '🌲 Natura & Montagna' },
                { id: "Città d'Arte & Storia", label: '🏰 Storia & Borghi' },
                { id: 'Enogastronomia', label: '🍷 Enogastronomia' },
                { id: 'Mare & Laghi', label: '🌊 Mare & Laghi' },
                { id: 'Relax & Terme', label: '🛀 Relax & Terme' },
                { id: 'Sport & Avventura', label: '🧗 Sport & Trekking' }
              ].map((interest) => {
                const isSelected = interests.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => handleInterestToggle(interest.id)}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold text-left border cursor-pointer select-none transition-all flex items-center justify-between ${
                      isSelected 
                        ? 'bg-emerald-50 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20' 
                        : 'bg-[#F4F6F0] dark:bg-slate-950 hover:bg-[#E7EBDC] dark:hover:bg-slate-900 border-[#3E4A35]/15 dark:border-slate-700 text-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <span>{interest.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-700 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-semibold">
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3.5 bg-[#3E4A35] hover:bg-[#5A6B4E] active:scale-95 text-white text-xs uppercase tracking-wider font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
          >
            <Sparkles className="w-4 h-4 text-orange-200" />
            Traccia Itinerario con Intelligenza Artificiale
          </button>
        </form>
      )}

      {/* Guide explanation/Credits section */}
      <div className="p-4 bg-stone-50 border border-slate-100 rounded-2xl flex items-start gap-3">
        <BookOpen className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Come Funziona la Pianificazione?</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed text-justify">
            La tecnologia di CamperLife AI analizza la rete stradale del punto di partenza prescelto. Calcola per ciascun giorno una sosta camper reale o credibile (completa di coordinate geografiche lette dal server), estrae consigli utili basati sulle dimensioni reali dei tuoi ingombri ("{vehicleDimensions.height}m"), e seleziona tappe di interesse culturale e ricreativo uniche.
          </p>
        </div>
      </div>
    </div>
  );
}
