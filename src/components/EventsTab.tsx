import React, { useState } from 'react';
import { CalendarDays, Search, MapPin, Sparkles, Navigation, Plus, Users, Calendar } from 'lucide-react';
import Markdown from 'react-markdown';
import { Place } from '../types';

interface EventsTabProps {
  onBack: () => void;
  userLocation: { lat: number; lng: number } | null;
  onNavigateFullscreen?: (place: Place) => void;
}

export default function EventsTab({ onBack, userLocation, onNavigateFullscreen }: EventsTabProps) {
  const [activeTab, setActiveTab] = useState<'ai_search' | 'community'>('ai_search');
  const [searchLocation, setSearchLocation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [aiEventsResponse, setAiEventsResponse] = useState<string>('');

  const handleAISearch = async () => {
    if (!searchLocation.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch('/api/search-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: searchLocation })
      });
      if (res.ok) {
        const data = await res.json();
        setAiEventsResponse(data.eventsText || data.text || 'Nessun risultato trovato.');
      } else {
        setAiEventsResponse("⚠️ Si è verificato un errore durante la ricerca degli eventi.");
      }
    } catch (err) {
      console.error(err);
      setAiEventsResponse("⚠️ Impossibile connettersi al server per la ricerca eventi.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseMyLocation = () => {
    if (userLocation) {
      setSearchLocation(`Coordinate: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`);
      return;
    }

    if (typeof window !== 'undefined' && navigator.geolocation) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: "⏳ Rilevamento posizione in corso..." }
      }));
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setSearchLocation(`Coordinate: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
        },
        (error) => {
          console.warn("GPS fetch warning: ", error);
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { message: "⚠️ Impossibile rilevare la posizione GPS. Accetta i permessi di localizzazione." }
          }));
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: "⚠️ Geolocation non supportata da questo browser." }
      }));
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-[#3E4A35] text-white p-4 shrink-0 shadow-md relative z-10">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-white/80 hover:text-white mb-2 transition-colors cursor-pointer"
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Torna indietro</span>
        </button>
        <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
          Feste, Sagre ed Eventi
        </h2>
        <p className="text-xs text-white/70 mt-1 font-medium">
          Scopri gli eventi locali vicino a te con l'AI o condividili con la community.
        </p>
      </div>

      <div className="flex bg-white border-b border-slate-200 shrink-0">
        <button
          onClick={() => setActiveTab('ai_search')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex justify-center items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'ai_search' ? 'text-[#3E4A35] border-b-2 border-[#3E4A35]' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${activeTab === 'ai_search' ? 'text-amber-500' : ''}`} />
          Ricerca AI Live
        </button>
        <button
          onClick={() => setActiveTab('community')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex justify-center items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'community' ? 'text-[#3E4A35] border-b-2 border-[#3E4A35]' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users className="w-4 h-4" />
          Bacheca Community
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'ai_search' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs text-slate-600 mb-4 leading-relaxed font-medium">
                Il nostro assistente AI cercherà in tempo reale sul Web le feste, sagre, fiere ed eventi camperisti in programma nella zona che desideri.
              </p>
              
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dove cerchiamo?</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      placeholder="Es: Firenze, Toscana oppure Lago di Garda"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#3E4A35]/20 focus:border-[#3E4A35] outline-none"
                    />
                  </div>
                  <button
                    onClick={handleUseMyLocation}
                    className="p-2.5 bg-slate-100 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                    title="Usa la mia posizione"
                  >
                    <Navigation className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={handleAISearch}
                  disabled={isSearching || !searchLocation.trim()}
                  className="w-full py-3 bg-[#3E4A35] hover:bg-[#5A6B4E] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm uppercase tracking-wider mt-2"
                >
                  {isSearching ? (
                    <span className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Ricerca in corso sul Web...
                    </span>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Cerca Eventi
                    </>
                  )}
                </button>
              </div>
            </div>

            {aiEventsResponse && (
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Risultati Ricerca AI
                </h3>
                <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed text-[13px] markdown-body">
                  <Markdown>{aiEventsResponse}</Markdown>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'community' && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-start gap-3">
              <Calendar className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-orange-900 uppercase tracking-wider mb-1">In arrivo prossimamente</h4>
                <p className="text-xs text-orange-800/80 leading-relaxed">
                  Stiamo costruendo il database condiviso degli eventi! Presto potrai segnalare le sagre del tuo paese e vedere quelle segnalate dagli altri camperisti, complete di coordinate per la sosta.
                </p>
                <button className="mt-3 py-1.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                  Proponi un Evento (Beta)
                </button>
              </div>
            </div>
            
            <div className="text-center py-12 px-4 bg-white rounded-xl border border-slate-100 shadow-sm border-dashed">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <CalendarDays className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 mb-1">Nessun evento in bacheca</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                La community sta appena iniziando a popolare questa sezione.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
