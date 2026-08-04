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
  BookOpen,
  Share2,
  X,
  CheckCircle2,
  Map as MapIcon,
  FileDown,
  FileText,
  Trash2,
  FolderHeart,
  Eye,
  Calendar,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import { Place, VehicleDimensions, PlaceCategory, Trip, AIItineraryResult, AIDayStop } from '../types';
import { parseDimToNumber } from '../unit-helpers';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CartoonCamperAvatar } from './CartoonCamperAvatar';
import { exportAIItineraryToPDF } from '../utils/pdfGenerator';
import { RollyCommunityItinerariesModal } from './RollyCommunityItinerariesModal';
import { getRealRegionalImage } from '../utils/regionalImageHelper';

interface AIItineraryTabProps {
  vehicleDimensions: VehicleDimensions;
  onAddPlace: (place: Place) => void;
  onShowOnMap: (lat: number, lng: number, label: string) => void;
  savedPlaces: Place[];
  currentUser?: { nickname: string; email: string; name: string; isModerator?: boolean; } | null;
  trips?: Trip[];
  setTrips?: (trips: Trip[]) => void;
  onNavigateToTripPlanner?: (tripId: string) => void;
}

export default function AIItineraryTab({ 
  vehicleDimensions, 
  onAddPlace, 
  onShowOnMap,
  savedPlaces,
  currentUser,
  trips,
  setTrips,
  onNavigateToTripPlanner,
}: AIItineraryTabProps) {
  // Input Form States
  const [startLocation, setStartLocation] = React.useState('');
  const [endLocation, setEndLocation] = React.useState('');
  const [waypoints, setWaypoints] = React.useState<string[]>([]);
  const [newWaypoint, setNewWaypoint] = React.useState('');
  const [duration, setDuration] = React.useState(3);
  const [interests, setInterests] = React.useState<string[]>(['Natura e Montagna', 'Enogastronomia']);
  const [travelStyle, setTravelStyle] = React.useState('Scenico (ritmo rilassato)');

  const handleAddWaypoint = () => {
    const trimmed = newWaypoint.trim();
    if (!trimmed) return;
    if (waypoints.some(w => w.toLowerCase() === trimmed.toLowerCase())) {
      setNewWaypoint('');
      return;
    }
    setWaypoints(prev => [...prev, trimmed]);
    setNewWaypoint('');
  };

  const handleRemoveWaypoint = (index: number) => {
    setWaypoints(prev => prev.filter((_, idx) => idx !== index));
  };
  
  // App States
  const [loading, setLoading] = React.useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<AIItineraryResult | null>(null);
  const [savedItineraries, setSavedItineraries] = React.useState<AIItineraryResult[]>([]);
  const [showSavedModal, setShowSavedModal] = React.useState(false);
  const [showCommunityItinerariesModal, setShowCommunityItinerariesModal] = React.useState(false);

  // Export states
  const [showExportModal, setShowExportModal] = React.useState(false);
  const [selectedTripTargetId, setSelectedTripTargetId] = React.useState<string>("new");
  const [exportSuccessTripId, setExportSuccessTripId] = React.useState<string | null>(null);
  const [exportMode, setExportMode] = React.useState<"replace" | "append">("replace");

  const handleConfirmExport = () => {
    if (!result) return;

    const routePoints = result.days.map((day) => ({
      lat: Number(day.stopCoordinate.lat),
      lng: Number(day.stopCoordinate.lng),
      name: `Giorno ${day.dayNumber}: ${day.stopPlaceName || day.title}`,
      timestamp: new Date().toISOString()
    }));

    let targetId = selectedTripTargetId;
    const currentTrips: Trip[] = trips || (() => {
      try {
        const saved = localStorage.getItem("camper_trips");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    })();

    let updatedTrips: Trip[] = [];

    if (selectedTripTargetId === "new") {
      targetId = `trip_ai_${Date.now()}`;
      const newTrip: Trip = {
        id: targetId,
        title: result.title || "Itinerario AI",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + result.days.length * 86400000).toISOString().split("T")[0],
        description: result.description || "Itinerario generato con CamperLifeApp AI",
        status: "Pianificato",
        expenses: [],
        photos: [],
        movements: [],
        routePoints: routePoints,
        aiItinerary: result,
      };
      updatedTrips = [newTrip, ...currentTrips];
    } else {
      updatedTrips = currentTrips.map((t) => {
        if (t.id === selectedTripTargetId) {
          const existingPoints = t.routePoints || [];
          const newRoutePoints = exportMode === "append" ? [...existingPoints, ...routePoints] : routePoints;
          
          let updatedAiItinerary = result;
          if (exportMode === "append" && t.aiItinerary) {
            updatedAiItinerary = {
              title: t.aiItinerary.title,
              description: t.aiItinerary.description,
              totalKm: `${t.aiItinerary.totalKm || ''} / ${result.totalKm}`,
              totalDrivingTime: `${t.aiItinerary.totalDrivingTime || ''} + ${result.totalDrivingTime}`,
              days: [...t.aiItinerary.days, ...result.days.map((d, idx) => ({ ...d, dayNumber: t.aiItinerary!.days.length + idx + 1 }))],
            };
          }

          return {
            ...t,
            routePoints: newRoutePoints,
            aiItinerary: updatedAiItinerary,
          };
        }
        return t;
      });
    }

    if (setTrips) {
      setTrips(updatedTrips);
    }
    localStorage.setItem("camper_trips", JSON.stringify(updatedTrips));
    window.dispatchEvent(
      new CustomEvent("trip-updated", {
        detail: { trips: updatedTrips },
      })
    );

    setExportSuccessTripId(targetId);
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message: `✅ ${routePoints.length} tappe esportate con successo nella Pianificazione Percorso!` },
      })
    );
  };

  // Load itineraries from Firestore and LocalStorage
  const loadAllItineraries = React.useCallback(async () => {
    let list: AIItineraryResult[] = [];

    // 1. Try local storage saved itineraries
    try {
      const localSaved = localStorage.getItem('camper_ai_saved_itineraries');
      if (localSaved) {
        const parsed = JSON.parse(localSaved);
        if (Array.isArray(parsed)) {
          list = parsed;
        }
      }
    } catch (e) {
      console.error("Errore lettura local itineraries", e);
    }

    // 2. Try single legacy itinerary if not present in list
    try {
      const singleLegacy = localStorage.getItem('camper_ai_itinerary_result');
      if (singleLegacy) {
        const parsedLegacy = JSON.parse(singleLegacy) as AIItineraryResult;
        if (parsedLegacy && parsedLegacy.title) {
          const legacyId = parsedLegacy.id || `itinerary_legacy_${parsedLegacy.title.replace(/\s+/g, '_')}`;
          const exists = list.some(item => item.id === legacyId || item.title === parsedLegacy.title);
          if (!exists) {
            list.unshift({ 
              ...parsedLegacy, 
              id: legacyId, 
              createdAt: parsedLegacy.createdAt || new Date().toISOString() 
            });
          }
        }
      }
    } catch (e) {}

    // 3. Try Firestore if user logged in
    if (currentUser?.email) {
      try {
        const email = currentUser.email.toLowerCase();
        const docRefCurrent = doc(db, 'users', email, 'itineraries', 'current');
        const docSnapCurrent = await getDoc(docRefCurrent);
        if (docSnapCurrent.exists()) {
          const currentData = docSnapCurrent.data() as AIItineraryResult;
          const currentId = currentData.id || 'itinerary_legacy_current';
          const exists = list.some(i => i.id === currentId || i.title === currentData.title);
          if (!exists) {
            list.unshift({
              ...currentData,
              id: currentId,
              createdAt: currentData.createdAt || new Date().toISOString()
            });
          }
        }

        // Fetch user itineraries collection
        const itinerariesColl = collection(db, 'users', email, 'itineraries');
        const querySnap = await getDocs(itinerariesColl);
        querySnap.forEach((docSnap) => {
          if (docSnap.id === 'current') return;
          const data = docSnap.data() as AIItineraryResult;
          const docId = docSnap.id;
          const item: AIItineraryResult = {
            ...data,
            id: data.id || docId,
            createdAt: data.createdAt || new Date().toISOString()
          };
          const idx = list.findIndex(i => i.id === item.id || (i.title === item.title && i.days?.length === item.days?.length));
          if (idx >= 0) {
            list[idx] = item;
          } else {
            list.push(item);
          }
        });
      } catch (err) {
        console.error("Errore caricamento itinerari da Firestore:", err);
      }
    }

    // Ensure unique IDs
    list = list.map((item, idx) => ({
      ...item,
      id: item.id || `itinerary_${Date.now()}_${idx}`
    }));

    setSavedItineraries(list);
    localStorage.setItem('camper_ai_saved_itineraries', JSON.stringify(list));
  }, [currentUser]);

  React.useEffect(() => {
    loadAllItineraries();
  }, [loadAllItineraries]);

  // Cycle through loading messages
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
          endLocation,
          waypoints,
          duration,
          interests,
          travelStyle,
          vehicleType: vehicleDimensions.modelName || 'Mansardato',
          vehicleDims: {
            length: parseDimToNumber(vehicleDimensions.length),
            width: parseDimToNumber(vehicleDimensions.width),
            height: parseDimToNumber(vehicleDimensions.height)
          }
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Impossibile contattare CamperLifeApp AI.");
      }

      const data = await response.json();
      if (data.success && data.itinerary) {
        const newId = `itinerary_ai_${Date.now()}`;
        const newItinerary: AIItineraryResult = {
          ...data.itinerary,
          id: newId,
          createdAt: new Date().toISOString(),
          startLocation,
          endLocation,
          waypoints: [...waypoints],
          duration,
          travelStyle,
          interests
        };

        setResult(newItinerary);

        const updatedSaved = [newItinerary, ...savedItineraries.filter(i => i.id !== newId)];
        setSavedItineraries(updatedSaved);
        localStorage.setItem('camper_ai_saved_itineraries', JSON.stringify(updatedSaved));
        localStorage.setItem('camper_ai_itinerary_result', JSON.stringify(newItinerary));

        // Save to Firestore if user is logged in
        if (currentUser?.email) {
          try {
            const email = currentUser.email.toLowerCase();
            const docRef = doc(db, 'users', email, 'itineraries', newId);
            await setDoc(docRef, newItinerary);

            const docRefCurrent = doc(db, 'users', email, 'itineraries', 'current');
            await setDoc(docRefCurrent, newItinerary);
          } catch (e) {
            console.error("Errore salvataggio Firestore:", e);
          }
        }
        
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: "✨ Itinerario '" + newItinerary.title + "' generato e salvato nei tuoi Itinerari!" } 
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
    const isAdded = savedPlaces.some(p => 
      Number(p.lat).toFixed(4) === Number(stop.stopCoordinate.lat).toFixed(4) && 
      Number(p.lng).toFixed(4) === Number(stop.stopCoordinate.lng).toFixed(4)
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
      priceInfo: "Consigliata da CamperLifeApp AI - Giorno " + stop.dayNumber,
      priceEuro: 15,
      rating: 4.5,
      facilities: ["Carico Acqua", "Scarico Grigie", "Scarico Nere fontanella", "Elettricità"],
      reviews: [{
        id: `review_ai`,
        user: "CamperLifeApp AI",
        date: new Date().toLocaleDateString('it-IT'),
        rating: 5,
        comment: `Punto di sosta eccellente integrato nell'itinerario consigliato. Consigli camperistici: ${stop.camperTips}`
      }],
      imageUrl: "/area_sosta.png",
      source: "CamperLifeApp AI Planner"
    };

    onAddPlace(newPlace);
    window.dispatchEvent(new CustomEvent('show-toast', { 
      detail: { message: "✅ '" + stop.stopPlaceName + "' importato con successo su Mappa Soste!" } 
    }));
  };

  const handleExportPDF = async () => {
    if (!result) return;
    try {
      await exportAIItineraryToPDF(result, vehicleDimensions);
      window.dispatchEvent(new CustomEvent('show-toast', { 
        detail: { message: "📄 PDF dell'itinerario scaricato con successo!" } 
      }));
    } catch (err) {
      console.error("Errore esportazione PDF:", err);
      window.dispatchEvent(new CustomEvent('show-toast', { 
        detail: { message: "❌ Impossibile generare il PDF dell'itinerario." } 
      }));
    }
  };

  const handleDeleteItinerary = async (itinerary: AIItineraryResult, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!itinerary.id) return;
    if (!confirm(`Sei sicuro di voler eliminare l'itinerario "${itinerary.title}"?`)) return;

    const targetId = itinerary.id;
    const updated = savedItineraries.filter(i => i.id !== targetId);
    setSavedItineraries(updated);
    localStorage.setItem('camper_ai_saved_itineraries', JSON.stringify(updated));

    if (currentUser?.email) {
      try {
        const docRef = doc(db, 'users', currentUser.email.toLowerCase(), 'itineraries', targetId);
        await deleteDoc(docRef);
      } catch (err) {
        console.error("Errore eliminazione Firestore:", err);
      }
    }

    if (result?.id === targetId || result?.title === itinerary.title) {
      if (updated.length > 0) {
        setResult(updated[0]);
        localStorage.setItem('camper_ai_itinerary_result', JSON.stringify(updated[0]));
      } else {
        setResult(null);
        localStorage.removeItem('camper_ai_itinerary_result');
      }
    }

    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: `🗑️ Itinerario "${itinerary.title}" eliminato.` }
    }));
  };

  const handleSelectItinerary = (itinerary: AIItineraryResult) => {
    setResult(itinerary);
    setShowSavedModal(false);
    localStorage.setItem('camper_ai_itinerary_result', JSON.stringify(itinerary));
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: `📍 Caricato itinerario: "${itinerary.title}"` }
    }));
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Rolly Companion Top Header */}
      <div className="bg-[#FAF8F3] dark:bg-[#131912] p-4.5 rounded-3xl border border-stone-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <CartoonCamperAvatar className="w-12 h-12 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold text-[#1C241D] dark:text-white tracking-tight leading-tight">
                Rolly
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
                Il tuo compagno di viaggio in camper ed intelligenza artificiale
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#1C3D2B]/10 dark:bg-emerald-950/40 py-1.5 px-3 rounded-xl border border-[#1C3D2B]/20 text-xs max-w-full">
            <Truck className="w-4 h-4 text-[#1C3D2B] dark:text-emerald-400 shrink-0" />
            <span className="font-bold text-[#1C3D2B] dark:text-emerald-300 text-[11px] truncate max-w-[220px] sm:max-w-xs">
              {vehicleDimensions.modelName || 'Camper'} ({vehicleDimensions.height}m h)
            </span>
          </div>
        </div>

        {/* Speech Bubble Greeting Card matching reference photo */}
        <div className="bg-[#F5F2EA] dark:bg-[#1B2419] p-4 rounded-2xl border border-[#E5DFD3] dark:border-slate-800 flex gap-3.5 items-start">
          <CartoonCamperAvatar className="w-11 h-11 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-slate-800 dark:text-slate-200">
            <p className="leading-relaxed font-medium">
              Ehi, Camperista! Ti aiuto a tracciare percorsi perfetti, verificare sottopassi e scoprire soste mozzafiato escludendo barriere superiori a <strong>{vehicleDimensions.height}m</strong>. Dove ti piacerebbe andare?
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-1">
              Assistente attivo gratuitamente per itinerari illimitati · <span className="text-emerald-700 dark:text-emerald-400 font-bold">CamperLife App AI</span>
            </p>
          </div>
        </div>
      </div>

      {/* Prominent Large Rolly & Community Itineraries Feature Banner */}
      <div 
        onClick={() => setShowCommunityItinerariesModal(true)}
        className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1C3D2B] via-[#2D5A40] to-[#3E4A35] p-5 sm:p-6 text-white shadow-lg border border-emerald-500/30 cursor-pointer hover:shadow-xl hover:border-emerald-400/60 transition-all duration-300 transform active:scale-[0.99]"
      >
        {/* Decorative background image / gradient overlay */}
        <div className="absolute -right-8 -bottom-10 opacity-20 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none">
          <Compass className="w-64 h-64 text-emerald-200 animate-[spin_40s_linear_infinite]" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-400 text-stone-950 font-black text-[11px] uppercase tracking-wider px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-900 animate-bounce" />
                <span>Consigliati da Rolly AI & Community</span>
              </span>
              <span className="bg-white/15 text-emerald-100 font-bold text-[11px] px-3 py-1 rounded-full backdrop-blur-xs border border-white/10">
                🌟 Nuova Tappa Ogni Settimana
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white group-hover:text-amber-200 transition-colors">
              🗺️ Itinerari Creati da Rolly e dalla Community
            </h3>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-medium">
              Sfoglia i 5 itinerari curati con foto reali per Toscana, Dolomiti, Calabria, Sardegna e Umbria, oppure proponi il tuo viaggio per la community!
            </p>
          </div>

          <div className="shrink-0 pt-2 md:pt-0">
            <button
              type="button"
              className="w-full sm:w-auto px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-sm rounded-2xl shadow-md flex items-center justify-center gap-2.5 transition-all group-hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-amber-900" />
              <span>Esplora gli Itinerari ora</span>
              <ChevronRight className="w-5 h-5 text-stone-900 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Itineraries Toolbar */}
      <div className="bg-white dark:bg-stone-850 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        {/* Centered full-width Itinerari Rolly button */}
        <button
          type="button"
          onClick={() => setShowCommunityItinerariesModal(true)}
          className="w-full px-4 py-3 bg-gradient-to-r from-[#1C3D2B] via-[#2D5A40] to-[#3E4A35] hover:from-[#142C1F] hover:to-[#2D3727] text-white text-xs sm:text-sm font-black rounded-xl transition-all shadow-md flex items-center justify-center text-center gap-2.5 cursor-pointer active:scale-[0.99] border border-emerald-500/30"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
          <span className="truncate">🗺️ Itinerari Rolly e Community (5+)</span>
        </button>

        {/* Side-by-side buttons: I Miei Salvati & Crea Nuovo */}
        <div className="grid grid-cols-2 gap-2.5 w-full">
          <button
            type="button"
            onClick={() => setShowSavedModal(true)}
            className="w-full px-3 sm:px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 border border-amber-200 text-amber-900 dark:text-amber-200 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center justify-center text-center gap-1.5 cursor-pointer active:scale-95"
          >
            <FolderHeart className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">I Miei Salvati ({savedItineraries.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setResult(null)}
            className={`w-full px-3 sm:px-4 py-2.5 border text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center justify-center text-center gap-1.5 cursor-pointer active:scale-95 ${
              !result
                ? 'bg-[#3E4A35] text-white border-[#3E4A35]'
                : 'bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 text-slate-700 dark:text-stone-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">➕ Crea Nuovo</span>
          </button>
        </div>

        {result && (
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700 bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 px-3 py-1.5 rounded-xl w-full text-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[11px] text-emerald-950 dark:text-emerald-300 truncate">
              Attivo: <strong>{result.title}</strong>
            </span>
          </div>
        )}
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
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-black bg-[#3E4A35]/10 text-[#3E4A35] px-2.5 py-0.5 rounded-full inline-block">
                    Itinerario Salvato ✓
                  </span>
                  {savedItineraries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setShowSavedModal(true)}
                      className="text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-full transition-all cursor-pointer"
                    >
                      Cambia Itinerario ({savedItineraries.length})
                    </button>
                  )}
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 leading-tight">{result.title}</h3>
                <p className="text-xs text-slate-500">{result.description}</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="px-3.5 py-2.5 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white text-xs font-black rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  title="Scarica itinerario in formato PDF"
                >
                  <FileDown className="w-4 h-4 text-orange-200" />
                  <span>Esporta PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    localStorage.removeItem('camper_ai_itinerary_result');
                    window.dispatchEvent(new CustomEvent('show-toast', {
                      detail: { message: "⚪ Itinerario disattivato." }
                    }));
                  }}
                  className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  title="Disattiva questo itinerario"
                >
                  <XCircle className="w-4 h-4 text-amber-700" />
                  <span>Disattiva Itinerario</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowExportModal(true);
                    setExportSuccessTripId(null);
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Share2 className="w-4 h-4 text-amber-300" />
                  <span>Esporta in Percorso</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  title="Crea un altro itinerario mantenendo salvato questo"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Crea Altro</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDeleteItinerary(result, e)}
                  className="p-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  title="Elimina questo itinerario salvato"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900">{result.totalDrivingTime}</span>
                    <span className="text-[9px] font-black bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200 uppercase tracking-wider shrink-0">+15% Camper</span>
                  </div>
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
                Number(p.lat).toFixed(4) === Number(day.stopCoordinate.lat).toFixed(4) || 
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

                    <div className="md:mt-4 text-right md:text-left flex flex-col md:items-start items-end gap-1">
                      <span className="text-[11px] font-black bg-[#E7EBDC] text-[#3E4A35] py-0.5 px-2 rounded-md inline-block max-w-full truncate" title="Tempo di guida maggiorato del 15% per andatura camper">
                        {day.drivingSegment}
                      </span>
                      <span className="text-[8px] font-black text-orange-600 uppercase tracking-widest block">tempo +15% camper</span>
                    </div>
                  </div>

                  {/* Details Block */}
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <div className="w-full sm:w-36 h-24 shrink-0 rounded-xl overflow-hidden border border-slate-200/80 shadow-2xs">
                        <img
                          src={day.imageUrl || getRealRegionalImage(day.title + ' ' + day.stopPlaceName + ' ' + day.description + ' ' + result.title)}
                          alt={day.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="space-y-1 flex-1">
                        <h4 className="text-sm font-extrabold text-slate-900">{day.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed text-justify">{day.description}</p>
                      </div>
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
                        📍 GPS Coords: {Number(day.stopCoordinate.lat).toFixed(5)}, {Number(day.stopCoordinate.lng).toFixed(5)} ({day.stopCoordinate.label})
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

          {/* Export to PDF Card at bottom of itinerary */}
          <div className="p-5 bg-white rounded-3xl border border-stone-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-[#3E4A35]/10 text-[#3E4A35] rounded-2xl shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Esporta Itinerario Completo in PDF
                </h4>
                <p className="text-xs text-slate-500">
                  Scarica una copia stampabile del viaggio con tappe, consigli camper e coordinate GPS.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportPDF}
              className="w-full sm:w-auto px-5 py-3 bg-[#3E4A35] hover:bg-[#5A6B4E] active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <FileDown className="w-4 h-4 text-orange-200" />
              <span>Scarica PDF Itinerario 📄</span>
            </button>
          </div>
        </div>
      ) : (
        /* Form configuration view */
        <form onSubmit={handleGenerate} className="bg-white rounded-3xl border border-stone-250/20 p-5 sm:p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Nuovo Itinerario AI</h3>
              <p className="text-xs text-slate-500">Crea un nuovo percorso camper personalizzato</p>
            </div>

          </div>

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
              <span className="text-[10px] text-slate-500 block leading-tight">La località da cui desideri cominciare.</span>
            </div>

            {/* End point (optional) */}
            <div className="space-y-2">
              <label htmlFor="end_loc" className="block text-xs font-black text-[#3E4A35] uppercase tracking-wide">
                Luogo di Destinazione <span className="text-slate-400 font-normal lowercase">(Opzionale)</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  id="end_loc"
                  type="text"
                  value={endLocation}
                  onChange={(e) => setEndLocation(e.target.value)}
                  placeholder="Es: Lecce, Roma, Milano..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F4F6F0] border border-[#3E4A35]/15 focus:border-[#3E4A35] focus:ring-1 focus:ring-[#3E4A35] rounded-xl text-sm transition-all text-slate-900 outline-hidden font-medium"
                />
              </div>
              <span className="text-[10px] text-slate-500 block leading-tight">L'ultima tappa del viaggio. Se vuoto, genererà un itinerario circolare o libero.</span>
            </div>

            {/* Intermediate Waypoints (Tappe Intermedie) */}
            <div className="md:col-span-2 space-y-2.5 bg-[#F4F6F0]/80 p-4 rounded-2xl border border-[#3E4A35]/15">
              <div className="flex items-center justify-between">
                <label htmlFor="waypoint_input" className="block text-xs font-black text-[#3E4A35] uppercase tracking-wide">
                  📍 Tappe Intermedie <span className="text-slate-400 font-normal lowercase">(Opzionale - località in cui vuoi passare)</span>
                </label>
                {waypoints.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setWaypoints([])}
                    className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Svuota tappe
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Inserisci i luoghi o le città intermedie in cui desideri passare lungo il percorso. L'AI genererà il tragitto facendoti toccare queste tappe.
              </p>
              
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Navigation className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="waypoint_input"
                    type="text"
                    value={newWaypoint}
                    onChange={(e) => setNewWaypoint(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddWaypoint();
                      }
                    }}
                    placeholder="Es: Firenze, Assisi, Orvieto, Matera..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-[#3E4A35]/20 focus:border-[#3E4A35] focus:ring-1 focus:ring-[#3E4A35] rounded-xl text-sm transition-all text-slate-900 outline-hidden font-medium"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddWaypoint}
                  className="px-3.5 py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Aggiungi Tappa</span>
                </button>
              </div>

              {/* Displayed waypoints list */}
              {waypoints.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Tappe programmate ({waypoints.length}):</span>
                  {waypoints.map((wp, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-amber-300 rounded-lg text-xs font-extrabold text-slate-800 shadow-2xs"
                    >
                      <span className="text-[10px] font-black text-amber-600 font-mono">#{idx + 1}</span>
                      <span>{wp}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveWaypoint(idx)}
                        className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer ml-1"
                        title="Rimuovi tappa"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
                {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>
                    {d} {d === 1 ? 'Giorno' : 'Giorni'}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 block leading-tight">Pianifica fino a un massimo di 30 giorni consecutivi di tappa.</span>
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

            {/* Active Camper dimensions visualization block */}
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
            La tecnologia di CamperLifeApp AI analizza la rete stradale del punto di partenza prescelto. Calcola per ciascun giorno una sosta camper reale o credibile (completa di coordinate geografiche lette dal server), estrae consigli utili basati sulle dimensioni reali dei tuoi ingombri ("{vehicleDimensions.height}m"), e seleziona tappe di interesse culturale e ricreativo uniche.
          </p>
        </div>
      </div>

      {/* SAVED ITINERARIES MODAL / DRAWER */}
      {showSavedModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1200] flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 space-y-5 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderHeart className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Itinerari AI Salvati ({savedItineraries.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSavedModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {savedItineraries.length === 0 ? (
              <div className="p-8 text-center space-y-3 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                <Sparkles className="w-10 h-10 text-stone-300 mx-auto" />
                <p className="text-xs text-slate-600 font-bold">Nessun itinerario salvato al momento.</p>
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setShowSavedModal(false);
                  }}
                  className="px-4 py-2 bg-[#3E4A35] text-white text-xs font-extrabold rounded-xl shadow-xs cursor-pointer"
                >
                  ➕ Genera il tuo primo itinerario
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {savedItineraries.map((it) => {
                  const isActive = result?.id === it.id || (result?.title === it.title && result?.days?.length === it.days?.length);
                  return (
                    <div
                      key={it.id || it.title}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        isActive
                          ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/20 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-slate-900">{it.title}</h4>
                            {isActive ? (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-600 text-white flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Attivo in uso</span>
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                Inattivo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1">{it.description}</p>
                          {it.waypoints && it.waypoints.length > 0 && (
                            <div className="flex items-center gap-1.5 text-[11px] text-amber-900 font-semibold pt-0.5">
                              <Navigation className="w-3 h-3 text-amber-600" />
                              <span>Tappe intermedie:</span>
                              <span className="font-extrabold">{it.waypoints.join(" → ")}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold text-slate-400 block font-mono">
                            {it.createdAt ? new Date(it.createdAt).toLocaleDateString('it-IT') : 'Salvato'}
                          </span>
                          <span className="text-xs font-black text-[#3E4A35]">
                            {it.days?.length || 0} Giorni · {it.totalKm}
                          </span>
                        </div>
                      </div>

                      {/* Actions Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isActive ? (
                            <button
                              type="button"
                              onClick={() => {
                                setResult(null);
                                localStorage.removeItem('camper_ai_itinerary_result');
                                window.dispatchEvent(new CustomEvent('show-toast', {
                                  detail: { message: "⚪ Itinerario disattivato. Ora sei sulla schermata di creazione." }
                                }));
                              }}
                              className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5 text-amber-700" />
                              <span>Disattiva Itinerario</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSelectItinerary(it)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                              <span>Attiva e Visualizza</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setResult(it);
                              setShowSavedModal(false);
                              setShowExportModal(true);
                            }}
                            className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5 text-teal-600" />
                            <span>Esporta in Percorso</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              await exportAIItineraryToPDF(it, vehicleDimensions);
                              window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `📄 PDF "${it.title}" scaricato!` } }));
                            }}
                            className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteItinerary(it, e)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-all cursor-pointer"
                          title="Elimina questo itinerario salvato"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setShowSavedModal(false);
                }}
                className="px-4 py-2.5 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-emerald-300" />
                <span>➕ Crea un Altro Itinerario AI</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSavedModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT TO PLANNED ROUTE MODAL */}
      {showExportModal && result && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowExportModal(false)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-slate-700 rounded-full hover:bg-stone-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 pr-6">
              <div className="flex items-center gap-2 text-emerald-800">
                <MapIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Esporta in Pianificazione Percorso
                </h3>
              </div>
              <p className="text-xs text-stone-500">
                Trasferisci le <strong>{result.days.length} tappe</strong> dell&apos;itinerario AI nella mappa di pianificazione percorso per la navigazione.
              </p>
            </div>

            {exportSuccessTripId ? (
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-4 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-emerald-900">
                    Tappe Esportate con Successo!
                  </h4>
                  <p className="text-xs text-emerald-700">
                    L&apos;itinerario &quot;{result.title}&quot; è stato inserito nella pianificazione percorso del viaggio.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
                  {onNavigateToTripPlanner && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowExportModal(false);
                        onNavigateToTripPlanner(exportSuccessTripId);
                      }}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all hover:scale-[1.02]"
                    >
                      <MapIcon className="w-4 h-4" />
                      <span>Vai alla Pianificazione Percorso 🗺️</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowExportModal(false)}
                    className="px-4 py-2.5 bg-white border border-stone-200 hover:bg-stone-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    Chiudi
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Select Trip Target */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                    Seleziona Destinazione:
                  </label>
                  <select
                    value={selectedTripTargetId}
                    onChange={(e) => setSelectedTripTargetId(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="new">➕ Crea Nuovo Viaggio: &quot;{result.title}&quot;</option>
                    {(trips || []).map((t) => (
                      <option key={t.id} value={t.id}>
                        🚐 {t.title} ({t.status}) {t.routePoints && t.routePoints.length > 0 ? `[${t.routePoints.length} tappe presenti]` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mode Option if existing trip is selected */}
                {selectedTripTargetId !== "new" && (
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-wide block">
                      Gestione Tappe Esistenti:
                    </span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="exportMode"
                          value="replace"
                          checked={exportMode === "replace"}
                          onChange={() => setExportMode("replace")}
                          className="accent-emerald-600"
                        />
                        Sostituisci tappe
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="exportMode"
                          value="append"
                          checked={exportMode === "append"}
                          onChange={() => setExportMode("append")}
                          className="accent-emerald-600"
                        />
                        Aggiungi in coda
                      </label>
                    </div>
                  </div>
                )}

                {/* Preview of stages */}
                <div className="space-y-1.5">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide block">
                    Anteprima Tappe ({result.days.length}):
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {result.days.map((day) => (
                      <div
                        key={day.dayNumber}
                        className="p-2.5 bg-stone-50 border border-stone-150 rounded-xl flex items-center gap-2 text-xs"
                      >
                        <span className="w-5 h-5 rounded-full bg-[#3E4A35] text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                          {day.dayNumber}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-800 block truncate">
                            {day.stopPlaceName || day.title}
                          </span>
                          <span className="text-[10px] text-stone-500 font-mono block">
                            {day.stopCoordinate.lat.toFixed(4)}, {day.stopCoordinate.lng.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowExportModal(false)}
                    className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmExport}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Conferma Esportazione</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Community & Rolly Itineraries Modal */}
      <RollyCommunityItinerariesModal
        isOpen={showCommunityItinerariesModal}
        onClose={() => setShowCommunityItinerariesModal(false)}
        currentUser={currentUser}
        onLoadItineraryIntoRolly={(selectedAIResult) => {
          setResult(selectedAIResult);
        }}
        onSaveTripToDiary={(tripTitle, days) => {
          if (setTrips) {
            const newTrip: Trip = {
              id: `trip_comm_${Date.now()}`,
              title: tripTitle,
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date(Date.now() + (days?.length || 3) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              description: tripTitle,
              status: 'Pianificato',
              expenses: [],
              photos: [],
              movements: [],
              aiItinerary: {
                title: tripTitle,
                description: tripTitle,
                totalKm: '150 km',
                totalDrivingTime: '3h',
                days: days || []
              }
            };

            const updatedTrips = [newTrip, ...(trips || [])];
            setTrips(updatedTrips);
            localStorage.setItem('camper_trips', JSON.stringify(updatedTrips));
          }
        }}
      />
    </div>
  );
}
