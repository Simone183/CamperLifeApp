/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Place, PlaceCategory } from '../types';
import { Heart, Search, Compass, MapPin, Trash2, Star, ArrowRight } from 'lucide-react';
import { CategoryIllustration } from './CategoryIllustration';

interface FavoritesTabProps {
  favoriteIds: string[];
  places: Place[];
  onToggleFavorite: (placeId: string) => void;
  onShowOnMap: (placeId: string) => void;
  onGoToMap: () => void;
}

export default function FavoritesTab({
  favoriteIds,
  places,
  onToggleFavorite,
  onShowOnMap,
  onGoToMap
}: FavoritesTabProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<PlaceCategory | 'all'>('all');

  const getCoverPhotoForPlace = (place: Place) => {
    const serverPhotos = (place.reviews || [])
      .map(rev => rev.imageUrl)
      .filter((url): url is string => Boolean(url));
    
    let localPhotos: string[] = [];
    try {
      const savedPhotos = localStorage.getItem(`camper_photos_${place.id}`);
      if (savedPhotos) {
        localPhotos = JSON.parse(savedPhotos);
      }
    } catch (e) {
      // ignore
    }

    let localReviewsPhotos: string[] = [];
    try {
      const savedReviews = localStorage.getItem(`camper_reviews_${place.id}`);
      if (savedReviews) {
        const parsed = JSON.parse(savedReviews);
        if (Array.isArray(parsed)) {
          localReviewsPhotos = parsed
            .map((rev: any) => rev.imageUrl)
            .filter((url: any) => Boolean(url));
        }
      }
    } catch (e) {
      // ignore
    }

    const allPhotos = [...serverPhotos, ...localPhotos, ...localReviewsPhotos];
    return allPhotos[0] || null;
  };

  // Filter actual place objects that are favorited
  const favoritePlaces = places.filter(p => favoriteIds.includes(p.id));

  // Filter based on search query and category tab filter
  const filteredPlaces = favoritePlaces.filter(p => {
    const matchesQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  const getCategoryLabel = (category: PlaceCategory) => {
    switch (category) {
      case 'area_sosta':
        return 'Area Sosta';
      case 'campeggio':
        return 'Campeggio';
      case 'camper_service':
        return 'Camper Service';
      case 'parcheggio_camper':
        return 'Parcheggio Camper';
      default:
        return category;
    }
  };

  const getCategoryTheme = (category: PlaceCategory) => {
    switch (category) {
      case 'area_sosta':
        return 'bg-[#5A6B4E]/15 text-[#3E4A35] border-[#5A6B4E]/20';
      case 'campeggio':
        return 'bg-[#3E4A35]/15 text-[#3E4A35] border-[#3E4A35]/20';
      case 'parcheggio_camper':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      default:
        return 'bg-[#A45C40]/15 text-[#A45C40] border-[#A45C40]/20';
    }
  };

  return (
    <div className="space-y-6" id="favorites-section">
      {/* Bento Header */}
      <div className="bg-gradient-to-br from-rose-50 to-rose-100/60 dark:from-rose-950 dark:to-rose-900 border border-rose-200 dark:border-rose-900 rounded-3xl p-6 relative overflow-hidden shadow-xs">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-black tracking-widest bg-rose-600/10 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 px-2.5 py-1 rounded-full border border-rose-250/20 dark:border-rose-900 flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 fill-current text-rose-600 dark:text-rose-400 animate-pulse" />
              I Miei Preferiti ({favoritePlaces.length})
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">Le Tue Soste del Cuore</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
            Gestisci la lista personalizzata delle aree sosta, campeggi e parcheggi che hai salvato. Clicca su "Mostra sulla Mappa" per aprirli istantaneamente nel navigatore di bordo e pianificare la rotta.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
          <Heart className="w-48 h-48 text-rose-600 fill-current" />
        </div>
      </div>

      {favoritePlaces.length === 0 ? (
        /* Dynamic Empty State */
        <div className="bg-white dark:bg-slate-800 border border-stone-200/60 dark:border-slate-700 rounded-3xl py-12 px-6 text-center max-w-md mx-auto space-y-5 shadow-xs">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-rose-100 dark:border-rose-900">
            <Heart className="w-8 h-8 fill-current text-rose-400" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-slate-900 dark:text-slate-100 font-extrabold text-base">Ancora nessun preferito salvato</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
              Esplora la mappa interattiva d'Italia e d'Europa, apri i dettagli di un campeggio o di un'area sosta e clicca sul pulsante con il <span className="font-bold text-rose-600">Cuore ❤️</span> per aggiungerlo qui!
            </p>
          </div>
          <button
            onClick={onGoToMap}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#3E4A35] dark:bg-emerald-700 hover:bg-[#2D3626] dark:hover:bg-emerald-800 text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer uppercase tracking-wider hover:scale-[1.02]"
          >
            <Compass className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Esplora la Mappa</span>
          </button>
        </div>
      ) : (
        /* Places List Present */
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white dark:bg-slate-800 p-3 border border-slate-150 dark:border-slate-700 rounded-2xl shadow-2xs">
            {/* Search input bar */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca tra i preferiti per nome o indirizzo..."
                className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3E4A35] dark:focus:ring-emerald-500 focus:border-[#3E4A35] dark:focus:border-emerald-500 bg-slate-50/50 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            {/* Category selection filters */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none scroll-smooth">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold whitespace-nowrap transition-all border ${
                  selectedCategory === 'all'
                    ? 'bg-[#3E4A35] text-white border-[#3E4A35] shadow-xs font-black'
                    : 'bg-stone-50 text-slate-650 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Tutti
              </button>
              {(['area_sosta', 'campeggio', 'parcheggio_camper', 'camper_service'] as PlaceCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold whitespace-nowrap transition-all border ${
                    selectedCategory === cat
                      ? 'bg-[#3E4A35] text-white border-[#3E4A35] shadow-xs font-black'
                      : 'bg-stone-50 text-slate-650 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {getCategoryLabel(cat)}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          {filteredPlaces.length === 0 ? (
            <div className="text-center py-10 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <p className="text-slate-500 text-xs font-medium">Nessuna sosta corrisponde alla ricerca corrente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPlaces.map(place => (
                <div
                  key={place.id}
                  className="bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 hover:border-slate-350 dark:hover:border-slate-600 hover:shadow-md rounded-2xl p-4 transition-all flex flex-col justify-between group shadow-2xs h-full"
                >
                  <div className="flex gap-4">
                    {/* Visual Place Representation */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700 flex-shrink-0 relative">
                      {getCoverPhotoForPlace(place) ? (
                        <img
                          src={getCoverPhotoForPlace(place)!}
                          alt={place.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 animate-fade-in"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <CategoryIllustration category={place.category} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border ${getCategoryTheme(place.category)}`}>
                          {getCategoryLabel(place.category)}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 font-bold font-mono text-[9px] bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-150 dark:border-slate-700">
                          {place.priceInfo}
                        </span>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[9px]">{place.rating.toFixed(1)}</span>
                        </div>
                      </div>

                      <h4 className="font-black text-slate-850 dark:text-slate-100 text-sm truncate leading-snug group-hover:text-[#3E4A35] dark:group-hover:text-emerald-400 transition-colors">
                        {place.name}
                      </h4>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate" title={place.address}>
                        {place.address}
                      </p>
                    </div>
                  </div>

                  {/* Button bar */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3 font-semibold text-xs">
                    {/* Unfavorite */}
                    <button
                      onClick={() => onToggleFavorite(place.id)}
                      className="px-2.5 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5 text-[11px] font-bold cursor-pointer"
                      title="Rimuovi dai Preferiti"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Rimuovi</span>
                    </button>

                    {/* Show on Map / Navigate */}
                    <button
                      onClick={() => onShowOnMap(place.id)}
                      className="px-4 py-1.5 bg-[#3E4A35]/10 hover:bg-[#3E4A35] text-[#3E4A35] hover:text-white font-extrabold rounded-lg flex items-center gap-1.5 transition-all text-[11px] cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Mostra sulla Mappa</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
