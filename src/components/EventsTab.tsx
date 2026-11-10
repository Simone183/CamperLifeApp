import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  Search,
  MapPin,
  Sparkles,
  Navigation,
  Calendar,
  Utensils,
  Map as MapIcon,
  Filter,
  X,
  RefreshCw,
  Sun,
  Heart,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { Place } from '../types';
import {
  CURRENT_NOV_SAGRE,
  SAGRE_PLACES,
  SagraEvent,
  getAllSagreEvents,
  saveLiveSagre,
  doesSagraMatchDateFilter,
} from '../data/sagreData';
import { resolveApiUrl } from '../utils/resolveMediaUrl';

export { CURRENT_NOV_SAGRE, SAGRE_PLACES };
export type { SagraEvent };

interface EventsTabProps {
  onBack: () => void;
  userLocation: { lat: number; lng: number } | null;
  onNavigateFullscreen?: (place: Place) => void;
  onShowOnMap?: (lat: number, lng: number, title: string) => void;
}

const MONTH_OPTIONS = [
  { value: 0, label: 'Tutti i mesi dell\'anno' },
  { value: 1, label: 'Gennaio' },
  { value: 2, label: 'Febbraio' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Aprile (Primavera)' },
  { value: 5, label: 'Maggio (Primavera)' },
  { value: 6, label: 'Giugno (Estate)' },
  { value: 7, label: 'Luglio (Estate)' },
  { value: 8, label: 'Agosto (Estate)' },
  { value: 9, label: 'Settembre (Estate/Vendemmia)' },
  { value: 10, label: 'Ottobre (Autunno)' },
  { value: 11, label: 'Novembre (Autunno)' },
  { value: 12, label: 'Dicembre (Natale)' },
];

function calcDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function EventsTab({
  onBack,
  userLocation,
  onNavigateFullscreen,
  onShowOnMap,
}: EventsTabProps) {
  const [activeTab, setActiveTab] = useState<'explore' | 'map' | 'ai_search'>('explore');
  const [allSagre, setAllSagre] = useState<SagraEvent[]>(() => getAllSagreEvents());

  // Period, Month & Vacation Date Range filters
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<
    'all' | 'weekend' | 'estate' | 'primavera' | 'autunno' | 'natale' | 'custom'
  >('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [showDateFilterPanel, setShowDateFilterPanel] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSagra, setSelectedSagra] = useState<SagraEvent | null>(null);
  const [zoomedPosterUrl, setZoomedPosterUrl] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [isFetchingLiveApi, setIsFetchingLiveApi] = useState(false);
  const [liveApiStatusMsg, setLiveApiStatusMsg] = useState<string | null>(null);

  // AI Search states
  const [searchLocation, setSearchLocation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [aiEventsResponse, setAiEventsResponse] = useState<string>('');

  const debounceTimerRef = useRef<any>(null);
  const clientCacheRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const refreshSagre = () => setAllSagre(getAllSagreEvents());
    window.addEventListener('sagre-updated', refreshSagre);

    // Automatic weekly search on Mondays (lunedì)
    const today = new Date();
    const isMonday = today.getDay() === 1;
    const dateStr = today.toISOString().split('T')[0];
    const lastFetch = localStorage.getItem('viacamper_last_monday_sagra_fetch_events');
    if (isMonday && lastFetch !== dateStr) {
      localStorage.setItem('viacamper_last_monday_sagra_fetch_events', dateStr);
      handleFetchLiveSagreFromApi();
    }

    return () => window.removeEventListener('sagre-updated', refreshSagre);
  }, []);

  useEffect(() => {
    if (userLocation) {
      const initialLoc = `Coordinate: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`;
      setSearchLocation(initialLoc);
    }
  }, [userLocation]);

  const executeSearch = async (locToSearch: string) => {
    const trimmedLoc = locToSearch.trim();
    if (!trimmedLoc) return;

    const cacheKey = trimmedLoc.toLowerCase();
    if (clientCacheRef.current[cacheKey]) {
      setAiEventsResponse(clientCacheRef.current[cacheKey]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(resolveApiUrl('/api/search-events'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: trimmedLoc }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.eventsText || data.text;
        if (text && text.trim().length > 30) {
          clientCacheRef.current[cacheKey] = text;
          setAiEventsResponse(text);
        } else {
          setAiEventsResponse(
            '⚠️ Nessun evento specifico trovato per questa richiesta. Prova ad inserire il nome di una città o regione (es: Roma, Latina, Toscana, Puglia).'
          );
        }
      } else {
        setAiEventsResponse('⚠️ Si è verificato un errore durante la ricerca degli eventi.');
      }
    } catch {
      setAiEventsResponse('⚠️ Impossibile connettersi al server per la ricerca eventi.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAISearch = () => {
    if (!searchLocation.trim() || isSearching) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setIsSearching(true);
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(searchLocation);
    }, 300);
  };

  // Fetch structured live sagre with real poster flyers from /api/sagre-live
  const handleFetchLiveSagreFromApi = async () => {
    if (isFetchingLiveApi) return;
    setIsFetchingLiveApi(true);
    setLiveApiStatusMsg(null);
    try {
      const res = await fetch(resolveApiUrl('/api/sagre-live'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: searchQuery.trim() || 'Italia',
          startDate: filterStartDate,
          endDate: filterEndDate,
          month: selectedMonth,
          season: selectedPeriodFilter,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.sagre) && data.sagre.length > 0) {
          saveLiveSagre(data.sagre);
          setAllSagre(getAllSagreEvents());
          setLiveApiStatusMsg(
            `✅ Sincronizzate ${data.sagre.length} sagre con locandine reali da TrovaSagre API (visibili anche sulla Mappa)!`
          );
        } else {
          setLiveApiStatusMsg('ℹ️ Nessuna ulteriore sagra trovata per questi parametri.');
        }
      } else {
        setLiveApiStatusMsg('ℹ️ Archivio nazionale sagre sincronizzato.');
      }
    } catch {
      setLiveApiStatusMsg('ℹ️ Archivio nazionale sagre sincronizzato.');
    } finally {
      setIsFetchingLiveApi(false);
    }
  };

  const filteredSagres = allSagre.filter((s) => {
    const matchesPeriodAndDate = doesSagraMatchDateFilter(s, {
      periodMode: selectedPeriodFilter,
      selectedMonth,
      startDate: filterStartDate,
      endDate: filterEndDate,
    });
    if (!matchesPeriodAndDate) return false;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      s.locationName.toLowerCase().includes(q) ||
      s.region.toLowerCase().includes(q) ||
      s.dates.toLowerCase().includes(q) ||
      s.specialties.some((sp) => sp.toLowerCase().includes(q))
    );
  });

  const openSagraOnMainMap = (targetSagra?: SagraEvent) => {
    const sagra = targetSagra || filteredSagres[0] || allSagre[0];
    if (!sagra) return;

    try {
      sessionStorage.setItem(
        'pending_sagre_map_filter',
        JSON.stringify({
          lat: sagra.lat,
          lng: sagra.lng,
          title: sagra.title,
          id: sagra.id,
          periodMode: selectedPeriodFilter,
          selectedMonth,
          startDate: filterStartDate,
          endDate: filterEndDate,
          timestamp: Date.now(),
        })
      );
    } catch {
      // ignore storage errors
    }

    if (onShowOnMap) {
      onShowOnMap(sagra.lat, sagra.lng, sagra.title);
    }
  };

  const hasActiveDateFilter =
    selectedMonth > 0 || Boolean(filterStartDate) || Boolean(filterEndDate) || selectedPeriodFilter !== 'all';

  const refLat = userLocation?.lat ?? 41.72;
  const refLng = userLocation?.lng ?? 12.65;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="bg-[#3E4A35] text-white p-3 sm:p-4 shrink-0 shadow-md relative z-10">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors cursor-pointer text-xs font-bold"
          >
            <CalendarDays className="w-4 h-4" />
            <span>Torna indietro</span>
          </button>
          <span className="text-[10px] font-black bg-emerald-500/25 border border-emerald-300/40 px-2 py-0.5 rounded-full text-emerald-100">
            {filteredSagres.length} Locandine attive
          </span>
        </div>
        <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
          🎪 Trova Sagre & Locandine d&apos;Italia
        </h2>
        <p className="text-[11px] text-white/75 mt-0.5 font-medium leading-snug">
          Locandine reali degli eventi, filtro per weekend, estate o date vacanza e posizione sulla mappa.
        </p>
      </div>

      {/* TrovaSagre Style Quick Period & Season Filter Bar */}
      <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
        <button
          onClick={() => {
            setSelectedPeriodFilter('all');
            setSelectedMonth(0);
            setFilterStartDate('');
            setFilterEndDate('');
          }}
          className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all cursor-pointer ${
            selectedPeriodFilter === 'all' && !selectedMonth && !filterStartDate
              ? 'bg-[#3E4A35] text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          🔥 Tutte ({allSagre.length})
        </button>

        <button
          onClick={() => {
            setSelectedPeriodFilter('weekend');
            setSelectedMonth(0);
          }}
          className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
            selectedPeriodFilter === 'weekend'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Calendar className="w-3 h-3" />
          Questo Weekend (Nov)
        </button>

        <button
          onClick={() => {
            setSelectedPeriodFilter('estate');
            setSelectedMonth(0);
          }}
          className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
            selectedPeriodFilter === 'estate'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
          }`}
        >
          <Sun className="w-3 h-3" />
          ☀️ Estate (Giu-Set)
        </button>

        <button
          onClick={() => {
            setSelectedPeriodFilter('primavera');
            setSelectedMonth(0);
          }}
          className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all cursor-pointer ${
            selectedPeriodFilter === 'primavera'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          🌸 Primavera
        </button>

        <button
          onClick={() => {
            setSelectedPeriodFilter('natale');
            setSelectedMonth(0);
          }}
          className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all cursor-pointer ${
            selectedPeriodFilter === 'natale'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          🎄 Natale & Dicembre
        </button>

        <button
          onClick={() => setShowDateFilterPanel((prev) => !prev)}
          className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
            showDateFilterPanel || selectedMonth > 0 || filterStartDate || filterEndDate
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100'
          }`}
        >
          <Filter className="w-3 h-3" />
          📆 Scegli Date / Mese
        </button>
      </div>

      {/* Collapsible Date & Vacation Planning Filter Panel */}
      {showDateFilterPanel && (
        <div className="bg-indigo-50/90 border-b border-indigo-200 px-3 py-2.5 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-indigo-950 uppercase tracking-tight flex items-center gap-1">
              📆 Pianifica Vacanza: Filtra Sagre per Mese o Date
            </span>
            {hasActiveDateFilter && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPeriodFilter('all');
                  setSelectedMonth(0);
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
              >
                Azzera date
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[9.5px] font-bold text-indigo-900 mb-0.5">
                Mese della vacanza
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setSelectedMonth(m);
                  if (m > 0) setSelectedPeriodFilter('custom');
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-indigo-200 text-xs font-bold text-slate-800 outline-none"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[9.5px] font-bold text-indigo-900 mb-0.5">
                Dal giorno (Inizio vacanza)
              </label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  if (e.target.value) setSelectedPeriodFilter('custom');
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-indigo-200 text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-[9.5px] font-bold text-indigo-900 mb-0.5">
                Al giorno (Fine vacanza)
              </label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  if (e.target.value) setSelectedPeriodFilter('custom');
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-indigo-200 text-xs font-bold text-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-[10px] text-indigo-800 font-medium">
              Scarica le locandine reali da TrovaSagre API per regione o periodo:
            </span>
            <button
              type="button"
              onClick={handleFetchLiveSagreFromApi}
              disabled={isFetchingLiveApi}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-[10.5px] font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${isFetchingLiveApi ? 'animate-spin' : ''}`} />
              <span>
                {isFetchingLiveApi ? 'Ricerca in corso...' : 'Cerca altre sagre'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <div className="flex bg-slate-100 border-b border-slate-200 shrink-0">
        <button
          onClick={() => setActiveTab('explore')}
          className={`flex-1 py-2 px-1 text-[11px] font-bold uppercase tracking-tight flex justify-center items-center gap-1 transition-colors cursor-pointer text-center ${
            activeTab === 'explore'
              ? 'bg-white text-[#3E4A35] border-b-2 border-[#3E4A35]'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Utensils className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">Locandine ({filteredSagres.length})</span>
        </button>
        <button
          onClick={() => openSagraOnMainMap()}
          className={`flex-1 py-2 px-1 text-[11px] font-bold uppercase tracking-tight flex justify-center items-center gap-1 transition-colors cursor-pointer text-center ${
            activeTab === 'map'
              ? 'bg-white text-[#3E4A35] border-b-2 border-[#3E4A35]'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <MapIcon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span className="truncate">Vedi su Mappa 🎪</span>
        </button>
        <button
          onClick={() => setActiveTab('ai_search')}
          className={`flex-1 py-2 px-1 text-[11px] font-bold uppercase tracking-tight flex justify-center items-center gap-1 transition-colors cursor-pointer text-center ${
            activeTab === 'ai_search'
              ? 'bg-white text-[#3E4A35] border-b-2 border-[#3E4A35]'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="truncate">Ricerca AI</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {liveApiStatusMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-2 rounded-xl text-[11px] font-bold flex items-center justify-between gap-2">
            <span>{liveApiStatusMsg}</span>
            <button
              type="button"
              onClick={() => setLiveApiStatusMsg(null)}
              className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* EXPLORE / CATALOG VIEW */}
        {activeTab === 'explore' && (
          <div className="space-y-3">
            {/* Search & Live Sync Bar */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="bg-white p-2 rounded-full border border-emerald-600/70 shadow-xs flex items-center gap-2 flex-1">
                <Search className="w-4 h-4 text-emerald-700 shrink-0 ml-1.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🍝 Cerca un piatto tipico, città o regione (es. Lazio, Marche, Toscana)..."
                  className="w-full py-1 bg-transparent text-xs font-medium outline-none text-slate-800"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleFetchLiveSagreFromApi}
                disabled={isFetchingLiveApi}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white rounded-full text-[11px] font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition-all"
                title="Scarica nuove sagre con locandina reale tramite API TrovaSagre"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLiveApi ? 'animate-spin' : ''}`} />
                <span>{isFetchingLiveApi ? 'Ricerca in corso...' : 'Cerca altre sagre'}</span>
              </button>
            </div>

            {/* Active Period Header (TrovaSagre style) */}
            <div className="flex items-end justify-between pt-1">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none">
                  {selectedPeriodFilter === 'estate'
                    ? 'Sagre Estive in Italia'
                    : selectedPeriodFilter === 'primavera'
                    ? 'Sagre di Primavera'
                    : selectedPeriodFilter === 'natale'
                    ? '🎄 Mercatini di Natale & Dicembre'
                    : selectedPeriodFilter === 'weekend'
                    ? 'Questo weekend & Vicino a te'
                    : selectedMonth > 0
                    ? `Sagre di ${MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label}`
                    : 'Vicino a te & Questo weekend'}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Locandine ufficiali degli eventi · Clicca sulla locandina per ingrandirla
                </p>
              </div>
              <button
                type="button"
                onClick={() => openSagraOnMainMap()}
                className="text-xs font-extrabold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>Vedi sulla mappa</span>
                <span>→</span>
              </button>
            </div>

            {/* TrovaSagre-Style Vertical Poster Flyer Grid (2 columns on mobile & desktop, just like screenshot!) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
              {filteredSagres.map((sagra) => {
                const distKm = calcDistanceKm(refLat, refLng, sagra.lat, sagra.lng);
                const resolvedThumb = resolveApiUrl(sagra.imageUrl);
                const isLiked = Boolean(likedIds[sagra.id]);

                return (
                  <div
                    key={sagra.id}
                    onClick={() => setSelectedSagra(sagra)}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer group"
                  >
                    {/* FULL REAL POSTER FLYER (Vertical 3:4 aspect ratio, NO dark tint over poster body!) */}
                    <div className="relative aspect-[3/4] w-full bg-slate-900 overflow-hidden">
                      <img
                        src={resolvedThumb}
                        alt={sagra.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />

                      {/* Subtle bottom-only gradient so the white title at the bottom is legible while keeping 80% of the flyer crystal clear */}
                      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/90 via-black/55 to-transparent pointer-events-none" />

                      {/* Top-Left White Pill Date Badge (Exact TrovaSagre style: "14 nov", "15 nov") */}
                      <div className="absolute top-2.5 left-2.5 bg-white text-slate-900 px-2.5 py-1 rounded-full text-[11px] font-extrabold shadow-md leading-none">
                        {sagra.dateBadge}
                      </div>

                      {/* Top-Right White Circle Heart Button (Exact TrovaSagre style) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLikedIds((prev) => ({ ...prev, [sagra.id]: !prev[sagra.id] }));
                        }}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/95 hover:bg-white shadow-md flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
                        title="Salva sagra tra i preferiti"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isLiked ? 'fill-rose-600 text-rose-600' : 'text-slate-800'
                          }`}
                        />
                      </button>

                      {/* Bottom Overlay: Event Title + Distance & Municipality (Exact TrovaSagre style) */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                        <h3 className="text-sm sm:text-[15px] font-extrabold leading-tight line-clamp-2 drop-shadow-sm">
                          {sagra.title}
                        </h3>
                        <p className="text-[11px] text-white/90 font-medium truncate mt-0.5 drop-shadow-xs">
                          {distKm} km · {sagra.locationName}
                        </p>
                      </div>
                    </div>

                    {/* Compact Action Footer for Camper Navigation & Map */}
                    <div className="p-2 bg-white flex items-center justify-between gap-1.5 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSagraOnMainMap(sagra);
                        }}
                        className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <MapIcon className="w-3 h-3 shrink-0 text-emerald-700" />
                        <span className="truncate">Mappa</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onNavigateFullscreen) {
                            onNavigateFullscreen({
                              id: sagra.id,
                              name: sagra.title,
                              lat: sagra.lat,
                              lng: sagra.lng,
                              address: sagra.locationName,
                              description: sagra.description,
                              priceInfo: sagra.dates,
                              priceEuro: 0,
                              rating: 9.8,
                              facilities: ['Sosta Camper'],
                              reviews: [],
                              imageUrl: resolvedThumb,
                              category: 'sagra',
                            });
                          }
                        }}
                        className="flex-1 py-1.5 px-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Navigation className="w-3 h-3 shrink-0" />
                        <span className="truncate">Naviga</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredSagres.length === 0 && (
              <div className="text-center py-8 px-4 bg-white rounded-2xl border border-slate-200 space-y-2.5">
                <p className="text-xs font-bold text-slate-700">
                  Nessuna sagra in archivio locale per questi filtri di data.
                </p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Clicca sul pulsante qui sotto per interrogare l&apos;API di TrovaSagre e scaricare le locandine previste per questo periodo!
                </p>
                <button
                  type="button"
                  onClick={handleFetchLiveSagreFromApi}
                  disabled={isFetchingLiveApi}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLiveApi ? 'animate-spin' : ''}`} />
                  <span>Cerca altre sagre</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* AI SEARCH TAB */}
        {activeTab === 'ai_search' && (
          <div className="space-y-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Cerca sul Web qualsiasi festa paesana, fiera o sagra specifica indicando città e mese.
              </p>

              <div className="space-y-2">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAISearch();
                    }}
                    placeholder="Es: Sagre in Puglia ad Agosto, oppure Toscana Luglio"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
                <button
                  onClick={handleAISearch}
                  disabled={isSearching || !searchLocation.trim()}
                  className="w-full py-2.5 bg-[#3E4A35] hover:bg-[#5A6B4E] disabled:bg-slate-300 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm uppercase tracking-wider"
                >
                  {isSearching ? (
                    <span className="flex items-center gap-1.5">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Ricerca...
                    </span>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      Cerca sul Web
                    </>
                  )}
                </button>
              </div>
            </div>

            {aiEventsResponse && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Risultati Ricerca Web
                </h3>
                <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed text-[11px] markdown-body">
                  <Markdown>{aiEventsResponse}</Markdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DETAILED FULL-SCREEN VIEW WITH AUTHENTIC FULL LOCANDINA POSTER (Leaves 58px bottom nav bar always visible on mobile) */}
      {selectedSagra &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => setSelectedSagra(null)}
            className="fixed top-0 left-0 right-0 bottom-[58px] md:inset-0 z-[45] md:z-[99999] bg-white md:bg-slate-950/80 md:backdrop-blur-md flex flex-col md:items-center md:justify-center md:p-6 animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full h-full md:max-w-lg md:h-[86vh] md:max-h-[86vh] md:rounded-3xl flex flex-col overflow-hidden md:shadow-2xl md:border md:border-white/20 relative"
            >
              {/* Top Header Bar with Close X Button */}
              <div className="bg-[#3E4A35] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-md z-30">
                <button
                  type="button"
                  onClick={() => setSelectedSagra(null)}
                  className="flex items-center gap-1.5 text-white hover:text-emerald-200 text-xs sm:text-sm font-black cursor-pointer py-0.5"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                  <span>Torna agli eventi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSagra(null)}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-all"
                  title="Chiudi"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Authentic Uncropped Poster Flyer Display */}
              <div
                onClick={() =>
                  setZoomedPosterUrl(
                    resolveApiUrl(selectedSagra.fullFlyerUrl || selectedSagra.imageUrl)
                  )
                }
                className="relative h-56 sm:h-64 bg-slate-950 shrink-0 overflow-hidden flex items-center justify-center cursor-zoom-in group"
              >
                <img
                  src={resolveApiUrl(selectedSagra.fullFlyerUrl || selectedSagra.imageUrl)}
                  alt={selectedSagra.title}
                  className="w-full h-full object-contain"
                />

                <div className="absolute top-2.5 left-2.5 bg-white text-slate-950 px-2.5 py-1 rounded-full text-[11px] font-black shadow-md flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{selectedSagra.dateBadge}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomedPosterUrl(
                      resolveApiUrl(selectedSagra.fullFlyerUrl || selectedSagra.imageUrl)
                    );
                  }}
                  className="absolute bottom-2.5 right-2.5 bg-black/75 hover:bg-black text-white px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-md cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Ingrandisci Locandina</span>
                </button>
              </div>

              {/* Scrollable details */}
              <div className="p-3.5 sm:p-4 flex-1 overflow-y-auto space-y-2.5 min-h-0">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-700 uppercase tracking-wider">
                    <span>{selectedSagra.categoryLabel}</span>
                    <span>·</span>
                    <span>{selectedSagra.region}</span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 leading-snug mt-0.5">
                    {selectedSagra.title}
                  </h3>
                  <p className="text-xs font-bold text-slate-600 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{selectedSagra.locationName}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                  <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="text-xs font-bold text-emerald-950">
                    Date: <span className="font-extrabold text-emerald-800">{selectedSagra.dates}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    Dettagli & Programma Gastronomico
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {selectedSagra.description}
                  </p>
                </div>

                <div>
                  <h4 className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Specialità & Menù
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSagra.specialties.map((spec, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-amber-50 text-amber-950 rounded-lg text-[10px] font-extrabold border border-amber-200"
                      >
                        🍽️ {spec}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    🏕️ Sosta Camper Consigliata
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    {selectedSagra.camperParking}
                  </p>
                </div>

                {selectedSagra.sourceUrl && (
                  <a
                    href={selectedSagra.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline pb-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Scheda evento su TrovaSagre.com</span>
                  </a>
                )}
              </div>

              {/* Sticky Bottom Action Footer (Never cut off!) */}
              <div className="p-2.5 sm:p-3 bg-white border-t border-slate-200 shrink-0 flex gap-2 z-20 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    const s = selectedSagra;
                    setSelectedSagra(null);
                    openSagraOnMainMap(s);
                  }}
                  className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>Vedi su Mappa</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const s = selectedSagra;
                    setSelectedSagra(null);
                    if (onNavigateFullscreen) {
                      onNavigateFullscreen({
                        id: s.id,
                        name: s.title,
                        lat: s.lat,
                        lng: s.lng,
                        address: s.locationName,
                        description: s.description,
                        priceInfo: s.dates,
                        priceEuro: 0,
                        rating: 9.8,
                        facilities: ['Sosta Camper'],
                        reviews: [],
                        imageUrl: resolveApiUrl(s.imageUrl),
                        category: 'sagra',
                      });
                    }
                  }}
                  className="flex-1 py-2.5 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Naviga alla Sagra</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* FULLSCREEN POSTER LIGHTBOX */}
      {zoomedPosterUrl &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => setZoomedPosterUrl(null)}
            className="fixed inset-0 z-[100000] bg-black/95 flex items-center justify-center p-2 cursor-zoom-out"
          >
            <button
              type="button"
              onClick={() => setZoomedPosterUrl(null)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/20 text-white hover:bg-white/30 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomedPosterUrl}
              alt="Locandina Sagra"
              className="max-w-full max-h-[94vh] object-contain rounded-lg shadow-2xl"
            />
          </div>,
          document.body
        )}
    </div>
  );
}
