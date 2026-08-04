import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Compass,
  MapPin,
  Calendar,
  Clock,
  User,
  Plus,
  CheckCircle2,
  Send,
  AlertCircle,
  Route,
  Share2,
  Check,
  ChevronRight,
  BookOpen,
  Filter
} from 'lucide-react';
import { CommunityItinerary, AIItineraryResult, Trip } from '../types';
import { getAllRollyCuratedItineraries } from '../data/rollyItineraries';
import { CartoonCamperAvatar } from './CartoonCamperAvatar';
import { getRealRegionalImage } from '../utils/regionalImageHelper';

interface RollyCommunityItinerariesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { nickname: string; email: string; name: string; isModerator?: boolean } | null;
  onLoadItineraryIntoRolly: (itinerary: AIItineraryResult) => void;
  onSaveTripToDiary?: (tripTitle: string, days: any[]) => void;
}

export function RollyCommunityItinerariesModal({
  isOpen,
  onClose,
  currentUser,
  onLoadItineraryIntoRolly,
  onSaveTripToDiary
}: RollyCommunityItinerariesModalProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'rolly' | 'community'>('all');
  const [communityItineraries, setCommunityItineraries] = useState<CommunityItinerary[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New Itinerary Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState(3);
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [waypointsText, setWaypointsText] = useState('');
  const [travelStyle, setTravelStyle] = useState('Scenico (ritmo rilassato)');
  const [authorName, setAuthorName] = useState(currentUser?.nickname || currentUser?.name || 'Camperista');
  const [authorEmail, setAuthorEmail] = useState(currentUser?.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Load community itineraries from API / LocalStorage
  const fetchCommunityItineraries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/community-itineraries');
      if (res.ok) {
        const data = await res.json();
        if (data.itineraries) {
          setCommunityItineraries(data.itineraries);
        }
      }
    } catch (err) {
      console.warn('Could not fetch community itineraries from server:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCommunityItineraries();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const rollyCurated = getAllRollyCuratedItineraries();
  const allItineraries: CommunityItinerary[] = [
    ...rollyCurated,
    ...communityItineraries.filter(c => c.status === 'approved')
  ];

  const filteredItineraries = allItineraries.filter(item => {
    if (activeFilter === 'rolly') return item.source === 'rolly_curated' || item.source === 'rolly_weekly';
    if (activeFilter === 'community') return item.source === 'community';
    return true;
  });

  const handleSubmitNewItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Inserisci titolo e descrizione per il tuo itinerario.');
      return;
    }

    setSubmitting(true);
    const waypoints = waypointsText
      .split(',')
      .map(w => w.trim())
      .filter(Boolean);

    // Build day stops based on waypoints or default
    const dayStops = waypoints.length > 0
      ? waypoints.map((wp, idx) => ({
          dayNumber: idx + 1,
          title: `Giorno ${idx + 1}: ${wp}`,
          description: `Esplorazione e sosta nella località di ${wp}.`,
          stopPlaceName: `Area Sosta Camper ${wp}`,
          drivingSegment: 'Percorso giornaliero panoramico',
          activities: [`Visita a ${wp}`, `Ristorante tipico`, `Passeggiata`],
          camperTips: 'Sosta sicura in area attrezzata camper.',
          stopCoordinate: { lat: 43.0 + idx * 0.2, lng: 11.0 + idx * 0.2, label: wp }
        }))
      : Array.from({ length: durationDays }).map((_, idx) => ({
          dayNumber: idx + 1,
          title: `Giorno ${idx + 1}: ${idx === 0 ? startLocation || title : 'Sosta Panoramica'}`,
          description: `Tappa ${idx + 1} dell'itinerario ${title}`,
          stopPlaceName: `Area Camper Tappa ${idx + 1}`,
          drivingSegment: 'Spostamento in camper',
          activities: ['Relax', 'Passeggiata'],
          camperTips: 'Verificare dimensioni percorsi',
          stopCoordinate: { lat: 42.5 + idx * 0.3, lng: 12.0 + idx * 0.3, label: `Tappa ${idx + 1}` }
        }));

    const payload = {
      title,
      description,
      authorName: authorName || 'Camperista Anonymous',
      authorEmail,
      durationDays,
      startLocation,
      endLocation,
      waypoints,
      travelStyle,
      days: dayStops
    };

    try {
      const res = await fetch('/api/propose-community-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          setSubmitSuccess(false);
          setShowAddForm(false);
          // reset form
          setTitle('');
          setDescription('');
          setStartLocation('');
          setEndLocation('');
          setWaypointsText('');
        }, 2200);

        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: {
              message: '📩 Itinerario inviato al moderatore! Verrà pubblicato appena approvato.'
            }
          })
        );
      } else {
        const errData = await res.json();
        alert(errData.error || "Errore durante l'invio dell'itinerario.");
      }
    } catch (err) {
      console.error('Error submitting itinerary:', err);
      alert('Impossibile inviare l\'itinerario in questo momento.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectItinerary = (itin: CommunityItinerary) => {
    const aiResult: AIItineraryResult = {
      id: itin.id,
      title: itin.title,
      description: itin.description,
      totalKm: itin.totalKm || '150 km',
      totalDrivingTime: '3h 30m stimate',
      days: itin.days,
      startLocation: itin.startLocation,
      endLocation: itin.endLocation,
      waypoints: itin.waypoints,
      duration: itin.durationDays,
      travelStyle: itin.travelStyle,
      createdAt: itin.createdAt
    };

    onLoadItineraryIntoRolly(aiResult);
    onClose();

    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: {
          message: `✨ Itinerario "${itin.title}" caricato con successo in Rolly!`
        }
      })
    );
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
      <div className="bg-stone-50 dark:bg-stone-900 w-full max-w-4xl rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-[#1C3D2B] via-[#2D5A40] to-[#3E4A35] p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <CartoonCamperAvatar className="w-9 h-9" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  Catalogo Completo Rolly
                </span>
                <span className="text-[10px] font-bold text-emerald-200/80">
                  • 1 nuovo a settimana 🌟
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white mt-0.5">
                Itinerari creati da Rolly e dalla Community
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filter Tabs */}
        <div className="bg-white dark:bg-stone-800 p-3 sm:p-4 border-b border-stone-200 dark:border-stone-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-[#3E4A35] text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              Tutti ({allItineraries.length})
            </button>
            <button
              onClick={() => setActiveFilter('rolly')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'rolly'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Creati da Rolly ({rollyCurated.length})</span>
            </button>
            <button
              onClick={() => setActiveFilter('community')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'community'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100'
              }`}
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Community ({allItineraries.filter(i => i.source === 'community').length})</span>
            </button>
          </div>

          {/* Action to propose new itinerary */}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ml-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Proponi un Itinerario</span>
          </button>
        </div>

        {/* Form Modal / Collapsible Section to submit new itinerary */}
        {showAddForm && (
          <div className="p-5 bg-amber-50/90 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 shrink-0 overflow-y-auto max-h-[50vh]">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-500 text-white rounded-lg">
                  <Compass className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-black text-amber-950 dark:text-amber-200 uppercase tracking-wider">
                  Proponi un Nuovo Itinerario alla Community
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-stone-400 hover:text-stone-700 text-xs font-bold"
              >
                Chiudi ✕
              </button>
            </div>

            <p className="text-xs text-amber-900/80 dark:text-amber-300/80 mb-4 leading-relaxed">
              Il tuo itinerario verrà verificato dal moderatore prima di essere pubblicato per tutti i camperisti della community! Riceverai un'email di conferma ad approvazione avvenuta.
            </p>

            {submitSuccess ? (
              <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">Itinerario inviato con successo!</h4>
                  <p className="text-xs text-emerald-800">
                    Notifica inviata al moderatore. Verrà reso disponibile nell'app una volta verificato.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitNewItinerary} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Titolo dell'Itinerario *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="es: Tour dei Castelli della Lunigiana"
                      className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Durata (Giorni)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={durationDays}
                      onChange={e => setDurationDays(Number(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Descrizione e Consigli Camper *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Racconta brevemente il percorso, consigli sulle aree di sosta e particolarità per i camper..."
                    className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Punto di Partenza
                    </label>
                    <input
                      type="text"
                      value={startLocation}
                      onChange={e => setStartLocation(e.target.value)}
                      placeholder="es: La Spezia"
                      className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Punto di Arrivo
                    </label>
                    <input
                      type="text"
                      value={endLocation}
                      onChange={e => setEndLocation(e.target.value)}
                      placeholder="es: Pontremoli"
                      className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Tappe Principali (separate da virgola)
                    </label>
                    <input
                      type="text"
                      value={waypointsText}
                      onChange={e => setWaypointsText(e.target.value)}
                      placeholder="es: Aulla, Fivizzano, Filattiera"
                      className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-xl font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Il Tuo Nome / Nickname
                    </label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={e => setAuthorName(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                      La Tua Email (per notifica approvazione)
                    </label>
                    <input
                      type="email"
                      value={authorEmail}
                      onChange={e => setAuthorEmail(e.target.value)}
                      placeholder="email@esempio.it"
                      className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-xl font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 border border-stone-300 rounded-xl font-bold text-stone-700 hover:bg-stone-100 cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Inviando...' : 'Invia per Moderazione'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Main List Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {filteredItineraries.map(itin => {
            const isWeekly = itin.isWeeklySpecial;
            const isExpanded = expandedId === itin.id;

            return (
              <div
                key={itin.id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isWeekly
                    ? 'bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-emerald-900/10 border-amber-300 dark:border-amber-700 shadow-md'
                    : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 shadow-2xs hover:shadow-md'
                }`}
              >
                {/* Weekly Special Top Banner if applicable */}
                {isWeekly && (
                  <div className="bg-gradient-to-r from-amber-500 to-emerald-600 text-white px-4 py-1.5 flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                      <span>{itin.weeklyBadgeText || 'Itinerario Rolly della Settimana 🌟'}</span>
                    </span>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                      Aggiornato Settimanalmente
                    </span>
                  </div>
                )}

                {/* Hero Cover Photo */}
                {(() => {
                  const coverSrc = itin.imageUrl || getRealRegionalImage(itin.title + ' ' + itin.startLocation + ' ' + itin.endLocation);
                  return (
                    <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-stone-900 group">
                      <img
                        src={coverSrc}
                        alt={itin.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-95"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent flex flex-col justify-between p-4">
                        <div className="flex items-center justify-between gap-2">
                          {itin.source === 'rolly_curated' || itin.source === 'rolly_weekly' ? (
                            <span className="text-[10px] font-black uppercase bg-emerald-900/90 text-emerald-200 backdrop-blur-md border border-emerald-400/40 px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
                              Creato da Rolly AI 🤖
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase bg-indigo-900/90 text-indigo-200 backdrop-blur-md border border-indigo-400/40 px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                              <User className="w-3.5 h-3.5 text-indigo-300" />
                              Community ({itin.authorName})
                            </span>
                          )}

                          <span className="text-[11px] font-black bg-black/60 text-white backdrop-blur-md border border-white/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            {itin.durationDays} Giorni {itin.totalKm ? `• ${itin.totalKm}` : ''}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-lg sm:text-xl font-black text-white leading-tight drop-shadow-md">
                            {itin.title}
                          </h3>
                          <p className="text-xs text-stone-200 line-clamp-1 mt-0.5 font-medium drop-shadow-sm">
                            📍 {itin.startLocation || 'Partenza'} {itin.endLocation ? `➔ ${itin.endLocation}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="p-4 sm:p-5 space-y-3">
                  {!itin.imageUrl && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {itin.source === 'rolly_curated' || itin.source === 'rolly_weekly' ? (
                            <span className="text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              Creato da Rolly AI
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <User className="w-3 h-3 text-indigo-600" />
                              Community ({itin.authorName})
                            </span>
                          )}

                          <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            {itin.durationDays} Giorni
                          </span>

                          {itin.totalKm && (
                            <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
                              <Route className="w-3.5 h-3.5 text-stone-400" />
                              {itin.totalKm}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 leading-snug">
                          {itin.title}
                        </h3>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed flex-1">
                      {itin.description}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleSelectItinerary(itin)}
                        className="px-4 py-2.5 bg-[#1C3D2B] hover:bg-[#142C1F] text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95 border border-emerald-600/40"
                      >
                        <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
                        <span>Carica in Rolly AI</span>
                      </button>

                      {onSaveTripToDiary && (
                        <button
                          onClick={() => {
                            onSaveTripToDiary(itin.title, itin.days);
                            window.dispatchEvent(
                              new CustomEvent('show-toast', {
                                detail: {
                                  message: `📖 Itinerario "${itin.title}" aggiunto al tuo Diario dei Viaggi!`
                                }
                              })
                            );
                          }}
                          className="p-2.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 border border-amber-200/80 text-amber-900 dark:text-amber-200 rounded-xl transition-all cursor-pointer"
                          title="Aggiungi al Diario Viaggi"
                        >
                          <BookOpen className="w-4 h-4 text-amber-600" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Waypoints Pills */}
                  {itin.waypoints && itin.waypoints.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-stone-400 uppercase">Tappe principali:</span>
                      {itin.waypoints.map((wp, idx) => (
                        <span
                          key={idx}
                          className="bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold border border-stone-200 dark:border-stone-600"
                        >
                          📍 {wp}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Toggle Days detail */}
                  <div className="pt-2 border-t border-stone-100 dark:border-stone-700/60 flex items-center justify-between">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : itin.id)}
                      className="text-xs font-black text-[#1C3D2B] dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isExpanded ? 'Nascondi Dettaglio Giorni ▲' : '📸 Vedi Foto & Dettaglio Tappe Giorno per Giorno ▼'}</span>
                    </button>

                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                      {itin.travelStyle}
                    </span>
                  </div>

                  {/* Accordion Days List with Day Photos */}
                  {isExpanded && (
                    <div className="pt-3 space-y-3 border-t border-stone-200 dark:border-stone-700/80 mt-2">
                      {itin.days.map((day) => (
                        <div
                          key={day.dayNumber}
                          className="p-3.5 bg-stone-50 dark:bg-stone-850 rounded-2xl border border-stone-200/80 dark:border-stone-700 text-xs space-y-2"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-[#1C3D2B] dark:text-emerald-400 uppercase text-[11px] flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-[#1C3D2B] text-white flex items-center justify-center text-[10px]">
                                {day.dayNumber}
                              </span>
                              {day.title}
                            </span>
                            <span className="text-[10px] font-semibold text-stone-600 bg-stone-200 dark:bg-stone-700 px-2.5 py-0.5 rounded-md">
                              🚗 {day.drivingSegment}
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 items-start">
                            {(() => {
                              const dayImg = day.imageUrl || getRealRegionalImage(day.title + ' ' + day.stopPlaceName + ' ' + day.description + ' ' + itin.title);
                              return (
                                <div className="w-full sm:w-32 h-24 shrink-0 rounded-xl overflow-hidden border border-stone-200 shadow-2xs">
                                  <img
                                    src={dayImg}
                                    alt={day.title}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                  />
                                </div>
                              );
                            })()}

                            <div className="space-y-1.5 flex-1">
                              <p className="text-stone-700 dark:text-stone-300 font-medium leading-relaxed">
                                {day.description}
                              </p>

                              {day.stopPlaceName && (
                                <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 flex items-center gap-1">
                                  <span>🏕️ Sosta consigliata:</span> <strong>{day.stopPlaceName}</strong>
                                </p>
                              )}

                              {day.camperTips && (
                                <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded-xl text-[11px] text-amber-900 dark:text-amber-300 border border-amber-200/60 font-medium">
                                  <strong>💡 Consiglio Camper Rolly:</strong> {day.camperTips}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-100 dark:bg-stone-850 border-t border-stone-200 dark:border-stone-700 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Ogni settimana Rolly genera e pubblica un nuovo itinerario speciale per i camperisti!</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-300 dark:bg-stone-700 hover:bg-stone-400 text-stone-800 dark:text-stone-200 font-bold rounded-xl transition-all cursor-pointer"
          >
            Chiudi
          </button>
        </div>

      </div>
    </div>
  );
}
