import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Utensils,
  Compass,
  Star,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Navigation,
  Phone,
  Globe,
  Search,
  Filter,
  X,
  ChevronRight,
  Info,
  Building2,
  ShoppingBag,
  Fuel,
  RefreshCw,
  Heart,
  Route
} from 'lucide-react';
import {
  fetchNearbyPlaces,
  NearbyPlace,
  formatDistance
} from '../services/googlePlacesService';

interface NearbyPlacesWidgetProps {
  lat: number;
  lng: number;
  placeName?: string;
  onNavigateToPlace?: (place: { lat: number; lng: number; name: string; photoUrl?: string }) => void;
  onNavigateToAIItinerary?: (prompt?: string) => void;
  className?: string;
}

export default function NearbyPlacesWidget({
  lat,
  lng,
  placeName = 'questa posizione',
  onNavigateToPlace,
  onNavigateToAIItinerary,
  className = ''
}: NearbyPlacesWidgetProps) {
  const [restaurants, setRestaurants] = useState<NearbyPlace[]>([]);
  const [attractions, setAttractions] = useState<NearbyPlace[]>([]);
  const [allPlaces, setAllPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dataSource, setDataSource] = useState<'google' | 'overpass' | 'fallback'>('fallback');
  const [isAllModalOpen, setIsAllModalOpen] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'restaurant' | 'attraction'>('all');
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [maxDistance, setMaxDistance] = useState<number>(5); // 5km

  const apiKey =
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    localStorage.getItem('user_google_maps_key') ||
    '';

  const loadData = async () => {
    if (!lat || !lng) return;
    setLoading(true);
    try {
      const res = await fetchNearbyPlaces(lat, lng, apiKey);
      setRestaurants(res.restaurants);
      setAttractions(res.attractions);
      setAllPlaces(res.all);
      setDataSource(res.source);
    } catch (err) {
      console.error('Error fetching nearby places:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [lat, lng, apiKey]);

  const filteredPlaces = allPlaces.filter((p) => {
    if (p.distanceKm > maxDistance) return false;
    if (activeCategory !== 'all' && p.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.categoryLabel.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className={`space-y-6 text-slate-900 ${className}`}>
      {/* 1. Attività vicine / Visite */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">
              Attività vicine
            </h3>
          </div>
          {attractions.length > 0 && (
            <button
              onClick={() => {
                setActiveCategory('attraction');
                setIsAllModalOpen(true);
              }}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer transition-colors"
            >
              Vedi tutte <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Attractions Carousel */}
        {loading ? (
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-32 h-32 rounded-2xl bg-slate-100 animate-pulse shrink-0 border border-slate-200/60"
              />
            ))}
          </div>
        ) : attractions.length === 0 ? (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs italic">
            Nessuna attività segnalata nelle immediate vicinanze.
          </div>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
            {attractions.slice(0, 8).map((place) => (
              <div
                key={place.id}
                onClick={() => setSelectedPlace(place)}
                className="w-32 sm:w-40 shrink-0 snap-start cursor-pointer group rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
              >
                <div className="relative h-22 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={place.photoUrl}
                    alt={place.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  {/* Rating pill (Matching screenshot orange badge) */}
                  {place.rating && (
                    <div className="absolute top-1.5 left-1.5 z-10 bg-amber-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-md border border-white/20">
                      <Star className="w-2.5 h-2.5 fill-current text-white" />
                      <span>{place.rating10 || (place.rating * 2).toFixed(1)}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-2 space-y-0.5 flex-1 flex flex-col justify-between">
                  <h4 className="font-extrabold text-xs text-slate-800 line-clamp-1 group-hover:text-amber-700 transition-colors">
                    {place.name}
                  </h4>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">
                    {place.categoryLabel} · {formatDistance(place.distanceKm)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Ristoranti vicini */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Utensils className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">
              Ristoranti vicini
            </h3>
          </div>
          <button
            onClick={() => {
              setActiveCategory('restaurant');
              setIsAllModalOpen(true);
            }}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer transition-colors"
          >
            Vedi tutti <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Restaurants Carousel */}
        {loading ? (
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-32 h-32 rounded-2xl bg-slate-100 animate-pulse shrink-0 border border-slate-200/60"
              />
            ))}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs italic">
            Nessun ristorante trovato nelle vicinanze.
          </div>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
            {restaurants.slice(0, 10).map((place) => (
              <div
                key={place.id}
                onClick={() => setSelectedPlace(place)}
                className="w-32 sm:w-40 shrink-0 snap-start cursor-pointer group rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
              >
                {/* Photo & Badge */}
                <div className="relative h-22 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={place.photoUrl}
                    alt={place.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  {/* Rating Badge */}
                  {place.rating && (
                    <div className="absolute top-1.5 left-1.5 z-10 bg-amber-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-md border border-white/20">
                      <Star className="w-2.5 h-2.5 fill-current text-white" />
                      <span>{place.rating10 || (place.rating * 2).toFixed(1)}</span>
                    </div>
                  )}
                  <div className="absolute bottom-1.5 right-1.5 bg-black/40 backdrop-blur-xs text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>

                {/* Details */}
                <div className="p-2 space-y-0.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-extrabold text-xs text-slate-800 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                        {place.name}
                      </h4>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-400 shrink-0 opacity-70 group-hover:text-emerald-600" />
                    </div>
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 truncate mt-0.5">
                      {place.categoryLabel} · {formatDistance(place.distanceKm)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Source Attribution footer line (matching screenshot) */}
        <div className="flex items-center justify-between pt-1 px-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            LUOGHI DA {dataSource === 'google' ? 'GOOGLE PLACES' : dataSource === 'overpass' ? 'OPENSTREETMAP' : 'LIVELOCAL'}
          </span>
          <button
            onClick={() => loadData()}
            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Aggiorna
          </button>
        </div>
      </div>

      {/* 3. "Chiedi a Rolly" / "Assistente AI Camper" Card */}
      <div
        onClick={() => {
          const promptText = `Cosa c'è di interessante da fare e dove mangiare specialità tipiche nei dintorni di ${placeName}? Consigli per camperisti.`;
          if (onNavigateToAIItinerary) {
            onNavigateToAIItinerary(promptText);
          }
        }}
        className="bg-[#1a382b] hover:bg-[#142d22] text-white p-4 rounded-2xl border border-emerald-800/40 shadow-lg cursor-pointer transition-all flex items-center justify-between gap-3 group"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 text-emerald-300">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h4 className="font-black text-sm text-white tracking-tight flex items-center gap-2">
              Chiedi all'Assistente AI
              <span className="text-[9px] font-bold uppercase bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded-full">
                Guida Camper
              </span>
            </h4>
            <p className="text-xs text-white/80 line-clamp-1 mt-0.5 font-medium">
              Vale la pena? Cosa fare nei dintorni? Dove mangiare prodotti tipici?
            </p>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-amber-400 group-hover:text-slate-900 transition-colors flex items-center justify-center shrink-0">
          <ArrowRight className="w-4 h-4 text-white group-hover:text-slate-900" />
        </div>
      </div>

      {/* 4. Modal "Vedi tutti i locali" */}
      {isAllModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
              <div>
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                  <Compass className="w-5 h-5 text-amber-600" />
                  Locali e Attività nei dintorni
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Vicino a <strong className="text-slate-700 dark:text-slate-200">{placeName}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsAllModalOpen(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter controls */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cerca per nome o categoria..."
                  className="w-full bg-transparent text-xs font-medium text-slate-800 dark:text-white focus:outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                    activeCategory === 'all'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Tutti ({allPlaces.length})
                </button>
                <button
                  onClick={() => setActiveCategory('restaurant')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeCategory === 'restaurant'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5" /> Ristoranti ({restaurants.length})
                </button>
                <button
                  onClick={() => setActiveCategory('attraction')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeCategory === 'attraction'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" /> Attività & Visite ({attractions.length})
                </button>
              </div>
            </div>

            {/* List View */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredPlaces.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs italic">
                  Nessun luogo corrisponde ai filtri selezionati.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredPlaces.map((place) => (
                    <div
                      key={place.id}
                      onClick={() => setSelectedPlace(place)}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 flex gap-3 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <img
                        src={place.photoUrl}
                        alt={place.name}
                        className="w-20 h-20 rounded-xl object-cover shrink-0 bg-slate-100"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-extrabold text-xs text-slate-800 dark:text-white truncate group-hover:text-emerald-600">
                              {place.name}
                            </h4>
                            {place.rating && (
                              <span className="text-[10px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-0.5">
                                ★ {place.rating10 || (place.rating * 2).toFixed(1)}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate mt-0.5">
                            {place.categoryLabel} · {formatDistance(place.distanceKm)}
                          </p>
                          {place.address && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">
                              {place.address}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onNavigateToPlace) {
                                onNavigateToPlace({ lat: place.lat, lng: place.lng, name: place.name, photoUrl: place.photoUrl });
                                setIsAllModalOpen(false);
                              }
                            }}
                            className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-emerald-100 transition-colors"
                          >
                            <Navigation className="w-3 h-3" /> Naviga
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Detail Modal for single place */}
      {selectedPlace && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[10001] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="relative h-48 w-full bg-slate-100">
              <img
                src={selectedPlace.photoUrl}
                alt={selectedPlace.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setSelectedPlace(null)}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-xs transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              {selectedPlace.rating && (
                <div className="absolute bottom-3 left-3 bg-amber-500 text-white font-black text-xs px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{selectedPlace.rating10 || (selectedPlace.rating * 2).toFixed(1)} / 10</span>
                </div>
              )}
            </div>

            <div className="p-5 space-y-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 inline-block mb-1.5">
                  {selectedPlace.categoryLabel}
                </span>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                  {selectedPlace.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {selectedPlace.address || 'Posizione nelle vicinanze'} · Distanza: {formatDistance(selectedPlace.distanceKm)}
                </p>
              </div>

              {/* Complete Camper Action Buttons */}
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  {onNavigateToPlace && (
                    <button
                      onClick={() => {
                        onNavigateToPlace({ lat: selectedPlace.lat, lng: selectedPlace.lng, name: selectedPlace.name, photoUrl: selectedPlace.photoUrl });
                        setSelectedPlace(null);
                        setIsAllModalOpen(false);
                      }}
                      className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer col-span-2 sm:col-span-1"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Naviga Qui</span>
                    </button>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${selectedPlace.name} ${selectedPlace.lat},${selectedPlace.lng}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all cursor-pointer border border-slate-200 dark:border-slate-700 col-span-2 sm:col-span-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Google Maps</span>
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent("simulate-camper-location", {
                          detail: { lat: selectedPlace.lat, lng: selectedPlace.lng },
                        })
                      );
                      window.dispatchEvent(
                        new CustomEvent("show-toast", {
                          detail: { message: `🚐 Camper posizionato a: ${selectedPlace.name}` }
                        })
                      );
                    }}
                    className="py-2.5 px-3 border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 hover:bg-amber-100 font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <span>🚐 Imposta Camper</span>
                  </button>

                  <button
                    onClick={() => {
                      try {
                        const saved = localStorage.getItem("camper_app_favorites");
                        const favs = saved ? JSON.parse(saved) : [];
                        const exists = favs.includes(selectedPlace.id);
                        const next = exists ? favs.filter((id: string) => id !== selectedPlace.id) : [...favs, selectedPlace.id];
                        localStorage.setItem("camper_app_favorites", JSON.stringify(next));
                        window.dispatchEvent(
                          new CustomEvent("show-toast", {
                            detail: { message: exists ? "Rimosso dai preferiti" : "❤️ Aggiunto ai preferiti!" }
                          })
                        );
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="py-2.5 px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <Heart className="w-4 h-4 text-rose-500" />
                    <span>Salva</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
