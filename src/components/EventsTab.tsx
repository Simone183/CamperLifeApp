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
  Plus,
  Upload,
  Trash2,
  CheckCircle2,
  Edit3,
  Wand2,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { Place } from '../types';
import {
  CURRENT_NOV_SAGRE,
  SAGRE_PLACES,
  SagraEvent,
  getAllSagreEvents,
  fetchLiveSagreUniversal,
  doesSagraMatchDateFilter,
  buildSvgPosterDataUri,
  getTodayIsoDate,
  formatSagraDateBadgeClient,
  syncSagreFromFirestore,
  saveSagraToFirestore,
  approvePendingSagraInFirestore,
  deleteSagraEverywhere,
} from '../data/sagreData';
import { resolveApiUrl } from '../utils/resolveMediaUrl';

export { CURRENT_NOV_SAGRE, SAGRE_PLACES };
export type { SagraEvent };

interface EventsTabProps {
  onBack: () => void;
  userLocation: { lat: number; lng: number } | null;
  currentUser?: {
    email?: string;
    name?: string;
    username?: string;
    role?: string;
    isModerator?: boolean;
  } | null;
  isAdminOverride?: boolean;
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

/**
 * Compresses an uploaded flyer image file into a crisp vertical JPEG Data-URI (~50-80 KB)
 * so it can be stored directly in Firestore and rendered natively in Android WebViews
 * with zero external server dependencies.
 */
function compressFlyerImageToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Errore lettura file immagine'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Immagine non valida'));
      img.onload = () => {
        const maxW = 640;
        const maxH = 880;
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const dataUri = canvas.toDataURL('image/jpeg', 0.78);
        resolve(dataUri);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function compressDataUriToJpeg(srcDataUri: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(srcDataUri);
    img.onload = () => {
      const maxW = 640;
      const maxH = 880;
      let w = img.width;
      let h = img.height;
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(srcDataUri);
        return;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.src = srcDataUri;
  });
}

export default function EventsTab({
  onBack,
  userLocation,
  currentUser,
  isAdminOverride,
  onNavigateFullscreen,
  onShowOnMap,
}: EventsTabProps) {
  const isAdmin = Boolean(
    isAdminOverride ||
      currentUser?.role === 'admin' ||
      currentUser?.isModerator ||
      (currentUser?.email &&
        ['sambucci.simone@gmail.com', 'viacamperapp@gmail.com'].includes(
          currentUser.email.toLowerCase().trim()
        ))
  );

  const [activeTab, setActiveTab] = useState<'explore' | 'map' | 'ai_search'>('explore');
  const [allSagre, setAllSagre] = useState<SagraEvent[]>(() => getAllSagreEvents());
  const [pendingSagre, setPendingSagre] = useState<SagraEvent[]>([]);

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

  // Add / Edit Sagra + Flyer Modal State (Admin & Users)
  const [showAddSagraModal, setShowAddSagraModal] = useState(false);
  const [editingSagraId, setEditingSagraId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formLocationName, setFormLocationName] = useState('');
  const [formRegion, setFormRegion] = useState('Lazio');
  const [formCategory, setFormCategory] = useState<'sagra' | 'natale' | 'storica' | 'vino'>('sagra');
  const [formCategoryLabel, setFormCategoryLabel] = useState('Sagra & Gastronomia');
  const [formStartDate, setFormStartDate] = useState(() => getTodayIsoDate());
  const [formEndDate, setFormEndDate] = useState(() => getTodayIsoDate());
  const [formLat, setFormLat] = useState<string>('');
  const [formLng, setFormLng] = useState<string>('');
  const [formDescription, setFormDescription] = useState('');
  const [formSpecialties, setFormSpecialties] = useState('');
  const [formCamperParking, setFormCamperParking] = useState('');
  const [formFlyerDataUri, setFormFlyerDataUri] = useState<string>('');
  const [formExtraPhotos, setFormExtraPhotos] = useState<string[]>([]);
  const [webFlyerCandidates, setWebFlyerCandidates] = useState<string[]>([]);
  const [isSearchingWebFlyers, setIsSearchingWebFlyers] = useState(false);
  const [isAutoFillingAi, setIsAutoFillingAi] = useState(false);
  const [isSavingSagra, setIsSavingSagra] = useState(false);
  const flyerInputRef = useRef<HTMLInputElement | null>(null);
  const extraPhotosInputRef = useRef<HTMLInputElement | null>(null);

  // AI Search states
  const [searchLocation, setSearchLocation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [aiEventsResponse, setAiEventsResponse] = useState<string>('');

  const debounceTimerRef = useRef<any>(null);
  const clientCacheRef = useRef<Record<string, string>>({});

  const refreshLocalAndFirestore = async () => {
    const { pending } = await syncSagreFromFirestore();
    setPendingSagre(pending);
    setAllSagre(getAllSagreEvents());
  };

  useEffect(() => {
    const refreshSagre = () => setAllSagre(getAllSagreEvents());
    window.addEventListener('sagre-updated', refreshSagre);

    refreshLocalAndFirestore();
    handleFetchLiveSagreFromApi();

    return () => window.removeEventListener('sagre-updated', refreshSagre);
  }, []);

  useEffect(() => {
    if (userLocation) {
      const initialLoc = `Coordinate: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`;
      setSearchLocation(initialLoc);
    }
  }, [userLocation]);

  const openNewSagraModal = (sagraToEdit?: SagraEvent) => {
    if (sagraToEdit) {
      setEditingSagraId(sagraToEdit.id);
      setFormTitle(sagraToEdit.title);
      setFormLocationName(sagraToEdit.locationName);
      setFormRegion(sagraToEdit.region || 'Italia');
      setFormCategory(sagraToEdit.category || 'sagra');
      setFormCategoryLabel(sagraToEdit.categoryLabel || 'Sagra & Gastronomia');
      setFormStartDate(sagraToEdit.startDate || getTodayIsoDate());
      setFormEndDate(sagraToEdit.endDate || sagraToEdit.startDate || getTodayIsoDate());
      setFormLat(String(sagraToEdit.lat || ''));
      setFormLng(String(sagraToEdit.lng || ''));
      setFormDescription(sagraToEdit.description || '');
      setFormSpecialties((sagraToEdit.specialties || []).join(', '));
      setFormCamperParking(sagraToEdit.camperParking || '');
      setFormFlyerDataUri(sagraToEdit.fullFlyerUrl || sagraToEdit.imageUrl || '');
      setFormExtraPhotos(Array.isArray(sagraToEdit.extraPhotos) ? sagraToEdit.extraPhotos : []);
      setWebFlyerCandidates([]);
    } else {
      const today = getTodayIsoDate();
      setEditingSagraId(null);
      setFormTitle('');
      setFormLocationName('');
      setFormRegion('Lazio');
      setFormCategory('sagra');
      setFormCategoryLabel('Sagra & Gastronomia');
      setFormStartDate(today);
      setFormEndDate(today);
      setFormLat(userLocation ? userLocation.lat.toFixed(4) : '41.7200');
      setFormLng(userLocation ? userLocation.lng.toFixed(4) : '12.6500');
      setFormDescription('');
      setFormSpecialties('');
      setFormCamperParking('');
      setFormFlyerDataUri('');
      setFormExtraPhotos([]);
      setWebFlyerCandidates([]);
    }
    setShowAddSagraModal(true);
  };

  const handleFlyerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressFlyerImageToDataUri(file);
      setFormFlyerDataUri(compressed);
    } catch {
      setLiveApiStatusMsg('⚠️ Impossibile leggere il file della locandina.');
    }
  };

  const handleExtraPhotosFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList: File[] = Array.from(files);
    try {
      const compressedList: string[] = [];
      for (const f of fileList) {
        const dataUri = await compressFlyerImageToDataUri(f);
        compressedList.push(dataUri);
      }
      setFormExtraPhotos((prev) => [...prev, ...compressedList].slice(0, 8));
    } catch {
      setLiveApiStatusMsg('⚠️ Errore nel caricamento di una delle foto aggiuntive.');
    } finally {
      e.target.value = '';
    }
  };

  const handleFindFlyersOnWebForForm = async () => {
    if (!formTitle.trim() && !formLocationName.trim()) {
      setLiveApiStatusMsg('⚠️ Inserisci prima il Nome della Sagra e il Comune per cercare le locandine sul web.');
      return;
    }
    setIsSearchingWebFlyers(true);
    try {
      const res = await fetch(resolveApiUrl('/api/sagre-find-flyers'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          locationName: formLocationName.trim(),
          maxCount: 5,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.flyers) && data.flyers.length > 0) {
          const compressedAll: string[] = [];
          for (const rawUri of data.flyers) {
            compressedAll.push(await compressDataUriToJpeg(rawUri));
          }
          setWebFlyerCandidates(compressedAll);
          if (!formFlyerDataUri || !formFlyerDataUri.startsWith('data:image/')) {
            setFormFlyerDataUri(compressedAll[0]);
          }
        } else {
          setLiveApiStatusMsg('ℹ️ Nessuna locandina trovata automaticamente sul web per questo titolo.');
        }
      }
    } catch {
      // ignore
    } finally {
      setIsSearchingWebFlyers(false);
    }
  };

  const handleAutoFillWithAiAndGeocode = async () => {
    if (!formTitle.trim() && !formLocationName.trim()) {
      setLiveApiStatusMsg('⚠️ Inserisci almeno il Titolo o il Comune prima di auto-compilare.');
      return;
    }
    setIsAutoFillingAi(true);
    try {
      // 1. Try Nominatim geocoding for accurate municipality coordinates
      if (formLocationName.trim()) {
        try {
          const nomRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&accept-language=it&q=${encodeURIComponent(
              formLocationName.trim()
            )}`
          );
          if (nomRes.ok) {
            const nomArr = await nomRes.json();
            if (Array.isArray(nomArr) && nomArr.length > 0) {
              setFormLat(Number(nomArr[0].lat).toFixed(4));
              setFormLng(Number(nomArr[0].lon).toFixed(4));
            }
          }
        } catch {
          // ignore
        }
      }

      // 2. Call AI autofill endpoint to generate original description, specialties, camper parking & coordinates
      const res = await fetch(resolveApiUrl('/api/sagre-ai-autofill'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          locationName: formLocationName.trim(),
          rawNotes: formSpecialties.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.locationName) setFormLocationName(data.locationName);
        if (data.region) setFormRegion(data.region);
        if (typeof data.lat === 'number' && (!formLat || formLat === '41.7200')) {
          setFormLat(data.lat.toFixed(4));
        }
        if (typeof data.lng === 'number' && (!formLng || formLng === '12.6500')) {
          setFormLng(data.lng.toFixed(4));
        }
        if (data.category && ['sagra', 'natale', 'storica', 'vino'].includes(data.category)) {
          setFormCategory(data.category);
        }
        if (data.categoryLabel) setFormCategoryLabel(data.categoryLabel);
        if (data.description) setFormDescription(data.description);
        if (Array.isArray(data.specialties) && data.specialties.length > 0) {
          setFormSpecialties(data.specialties.join(', '));
        }
        if (data.camperParking) setFormCamperParking(data.camperParking);
      }
    } catch {
      // If offline/unavailable, fill sensible defaults
      if (!formDescription.trim()) {
        setFormDescription(
          `Appuntamento enogastronomico con ${formTitle.trim() || 'prodotti tipici'} a ${
            formLocationName.trim() || 'centro storico'
          }: stand gastronomici e piatti della tradizione locale.`
        );
      }
      if (!formCamperParking.trim()) {
        setFormCamperParking(
          `Parcheggio camper consigliato presso l'area comunale di ${formLocationName.trim() || 'paese'}.`
        );
      }
    } finally {
      setIsAutoFillingAi(false);
    }
  };

  const handleSaveSagraForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formLocationName.trim() || !formStartDate) {
      return;
    }
    setIsSavingSagra(true);
    try {
      const sDate = formStartDate.slice(0, 10);
      const eDate = (formEndDate || formStartDate).slice(0, 10);
      const dInfo = formatSagraDateBadgeClient(sDate, eDate);

      // Ensure coordinates are resolved if empty
      let latNum = parseFloat(formLat);
      let lngNum = parseFloat(formLng);
      if (isNaN(latNum) || isNaN(lngNum)) {
        try {
          const nomRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&accept-language=it&q=${encodeURIComponent(
              formLocationName.trim()
            )}`
          );
          if (nomRes.ok) {
            const nomArr = await nomRes.json();
            if (Array.isArray(nomArr) && nomArr.length > 0) {
              latNum = parseFloat(nomArr[0].lat);
              lngNum = parseFloat(nomArr[0].lon);
            }
          }
        } catch {
          // ignore
        }
      }
      if (isNaN(latNum)) latNum = userLocation?.lat ?? 41.72;
      if (isNaN(lngNum)) lngNum = userLocation?.lng ?? 12.65;

      const specs = formSpecialties
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const defaultPoster =
        'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80';
      const chosenPoster = formFlyerDataUri.trim() || defaultPoster;

      const sagraObj: SagraEvent = {
        id: editingSagraId || `custom_sagra_${Date.now()}`,
        title: formTitle.trim(),
        category: formCategory,
        categoryLabel: formCategoryLabel.trim() || 'Sagra & Gastronomia',
        locationName: formLocationName.trim(),
        region: formRegion.trim() || 'Italia',
        dates: dInfo.readable,
        dateBadge: dInfo.badge,
        startDate: sDate,
        endDate: eDate >= sDate ? eDate : sDate,
        month: dInfo.month,
        season: dInfo.season,
        lat: latNum,
        lng: lngNum,
        description:
          formDescription.trim() ||
          `Festa gastronomica e prodotti tipici a ${formLocationName.trim()}.`,
        specialties:
          specs.length > 0 ? specs : ['Stand Gastronomici', 'Piatti Tipici Locali'],
        camperParking:
          formCamperParking.trim() ||
          `Area sosta o parcheggio camper comunale a ${formLocationName.trim()}.`,
        imageUrl: chosenPoster,
        fullFlyerUrl: chosenPoster,
        extraPhotos: formExtraPhotos,
        isRealFlyer: Boolean(formFlyerDataUri.trim()),
        section:
          dInfo.season === 'estate'
            ? 'estate'
            : dInfo.month === 12
            ? 'natale'
            : 'weekend',
        submittedByEmail: currentUser?.email || 'anonimo',
        submittedByName: currentUser?.name || currentUser?.username || 'Camperista',
      };

      await saveSagraToFirestore(sagraObj, isAdmin);
      await refreshLocalAndFirestore();
      setShowAddSagraModal(false);

      if (isAdmin) {
        setLiveApiStatusMsg(
          `✅ Sagra "${sagraObj.title}" pubblicata con successo su Firebase! È ora visibile a tutti gli utenti e sulla mappa.`
        );
      } else {
        setLiveApiStatusMsg(
          `✅ Grazie! La sagra "${sagraObj.title}" è stata inviata all'amministratore per l'approvazione.`
        );
      }
    } catch {
      setLiveApiStatusMsg('⚠️ Errore durante il salvataggio della sagra.');
    } finally {
      setIsSavingSagra(false);
    }
  };

  const handleApprovePending = async (sagra: SagraEvent) => {
    try {
      await approvePendingSagraInFirestore(sagra);
      await refreshLocalAndFirestore();
      setLiveApiStatusMsg(`✅ Sagra "${sagra.title}" approvata e pubblicata per tutti gli utenti!`);
    } catch {
      setLiveApiStatusMsg('⚠️ Errore durante l\'approvazione.');
    }
  };

  const handleDeleteSagra = async (sagra: SagraEvent) => {
    try {
      await deleteSagraEverywhere(sagra.id);
      if (selectedSagra?.id === sagra.id) {
        setSelectedSagra(null);
      }
      await refreshLocalAndFirestore();
      setLiveApiStatusMsg(`🗑️ Sagra "${sagra.title}" rimossa.`);
    } catch {
      setLiveApiStatusMsg('⚠️ Errore durante l\'eliminazione.');
    }
  };

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

  const handleFetchLiveSagreFromApi = async () => {
    if (isFetchingLiveApi) return;
    setIsFetchingLiveApi(true);
    setLiveApiStatusMsg(null);
    try {
      const synced = await fetchLiveSagreUniversal({
        location: searchQuery.trim() || 'Italia',
        startDate: filterStartDate,
        endDate: filterEndDate,
        month: selectedMonth,
        season: selectedPeriodFilter,
        userLat: userLocation?.lat,
        userLng: userLocation?.lng,
      });
      await refreshLocalAndFirestore();
      if (synced.length > 0) {
        setLiveApiStatusMsg(
          `✅ Sincronizzate ${synced.length} sagre ed eventi gastronomici aggiornati (visibili anche sulla Mappa)!`
        );
      } else {
        setLiveApiStatusMsg('ℹ️ Nessuna ulteriore sagra trovata per questi parametri.');
      }
    } catch {
      setLiveApiStatusMsg('ℹ️ Archivio nazionale sagre sincronizzato.');
    } finally {
      setIsFetchingLiveApi(false);
    }
  };

  const handleFetchAllItalySagre = async () => {
    if (isFetchingLiveApi) return;
    setSelectedPeriodFilter('all');
    setSelectedMonth(0);
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchQuery('');
    setIsFetchingLiveApi(true);
    setLiveApiStatusMsg('🇮🇹 Ricerca in corso di tutte le sagre ed eventi confermati in tutta Italia (Nord, Centro, Sud e Isole)...');
    try {
      const synced = await fetchLiveSagreUniversal({
        location: 'Tutta Italia',
        startDate: '',
        endDate: '',
        month: 0,
        season: 'all',
        userLat: userLocation?.lat,
        userLng: userLocation?.lng,
        fetchAllItaly: true,
      });
      await refreshLocalAndFirestore();
      const totalNow = getAllSagreEvents().length;
      if (synced.length > 0 || totalNow > 0) {
        setLiveApiStatusMsg(
          `✅ Ricerca completata in tutta Italia! Trovate e sincronizzate ${totalNow} sagre attive da Nord a Sud.`
        );
      } else {
        setLiveApiStatusMsg('ℹ️ Archivio nazionale sagre d\'Italia aggiornato.');
      }
    } catch {
      setLiveApiStatusMsg('ℹ️ Archivio nazionale sagre d\'Italia sincronizzato.');
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
        <div className="flex items-center justify-between mb-1.5 gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors cursor-pointer text-xs font-bold"
          >
            <CalendarDays className="w-4 h-4" />
            <span>Torna indietro</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => openNewSagraModal()}
              className="px-2.5 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10.5px] font-black flex items-center gap-1 shadow-sm cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isAdmin ? 'Aggiungi Sagra + Locandina (Admin)' : 'Segnala una Sagra'}</span>
            </button>
            <span className="text-[10px] font-black bg-emerald-500/25 border border-emerald-300/40 px-2 py-0.5 rounded-full text-emerald-100 hidden sm:inline-block">
              {filteredSagres.length} Attive
            </span>
          </div>
        </div>
        <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
          🎪 Sagre, Fiere & Locandine d&apos;Italia
        </h2>
        <p className="text-[11px] text-white/75 mt-0.5 font-medium leading-snug">
          Eventi gastronomici confermati, filtro per weekend o vacanza e posizione sulla mappa.
        </p>
      </div>

      {/* Quick Period & Season Filter Bar */}
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
          Questo Weekend
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
              Cerca nuove sagre ed eventi gastronomici confermati per regione o in tutta Italia:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleFetchLiveSagreFromApi}
                disabled={isFetchingLiveApi}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-[10.5px] font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
              >
                <RefreshCw className={`w-3 h-3 ${isFetchingLiveApi ? 'animate-spin' : ''}`} />
                <span>
                  {isFetchingLiveApi ? 'Ricerca...' : 'Cerca altre sagre'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleFetchAllItalySagre}
                disabled={isFetchingLiveApi}
                className="px-3 py-1.5 bg-[#3E4A35] hover:bg-[#5A6B4E] disabled:bg-slate-300 text-white rounded-xl text-[10.5px] font-black flex items-center gap-1 shadow-xs cursor-pointer transition-all"
              >
                <span>🇮🇹 Cerca tutte</span>
              </button>
            </div>
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

      <div className="flex-1 overflow-y-auto px-2 py-3 sm:p-4 space-y-3">
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

        {/* ADMIN PENDING USER SUBMISSIONS BAR */}
        {isAdmin && pendingSagre.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                🔔 {pendingSagre.length} Sagre segnalate dagli utenti in attesa di approvazione
              </span>
            </div>
            <div className="space-y-2">
              {pendingSagre.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-xl p-2.5 border border-amber-200 flex items-center justify-between gap-2.5"
                >
                  <img
                    src={resolveApiUrl(p.imageUrl)}
                    alt={p.title}
                    onClick={() => setZoomedPosterUrl(resolveApiUrl(p.fullFlyerUrl || p.imageUrl))}
                    className="w-12 h-16 object-cover rounded-lg border border-slate-200 shrink-0 cursor-zoom-in"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black text-slate-900 truncate">{p.title}</div>
                    <div className="text-[10.5px] font-bold text-slate-600 truncate">
                      📍 {p.locationName} · 📅 {p.dates}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Segnalata da: {p.submittedByName || p.submittedByEmail || 'Utente'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openNewSagraModal(p)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      title="Modifica prima di approvare"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprovePending(p)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approva</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSagra(p)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                      title="Rifiuta ed elimina"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
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

              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => openNewSagraModal()}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-full text-[11px] font-black flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                  <span>{isAdmin ? '+ Nuova Sagra' : 'Segnala Sagra'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleFetchLiveSagreFromApi}
                  disabled={isFetchingLiveApi}
                  className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white rounded-full text-[11px] font-black flex items-center justify-center gap-1 shadow-xs cursor-pointer shrink-0 transition-all"
                  title="Cerca nuove sagre per il filtro o la zona selezionata"
                >
                  <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isFetchingLiveApi ? 'animate-spin' : ''}`} />
                  <span>{isFetchingLiveApi ? 'Ricerca...' : 'Cerca altre sagre'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleFetchAllItalySagre}
                  disabled={isFetchingLiveApi}
                  className="px-3 py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] disabled:bg-slate-300 text-white rounded-full text-[11px] font-black flex items-center justify-center gap-1 shadow-xs cursor-pointer shrink-0 transition-all"
                  title="Cerca tutte le sagre d'Italia da Nord a Sud"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-amber-300 shrink-0 ${isFetchingLiveApi ? 'animate-spin' : ''}`} />
                  <span>🇮🇹 Cerca tutte</span>
                </button>
              </div>
            </div>

            {/* Active Period Header */}
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
                  Locandine degli eventi · Tocca una scheda per i dettagli o per ingrandire la locandina
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

            {/* Vertical Poster Flyer Grid (2 columns on mobile, 3 on desktop) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3.5">
              {filteredSagres.map((sagra) => {
                const distKm = calcDistanceKm(refLat, refLng, sagra.lat, sagra.lng);
                const resolvedThumb = resolveApiUrl(sagra.imageUrl);
                const isLiked = Boolean(likedIds[sagra.id]);

                return (
                  <div
                    key={sagra.id}
                    onClick={() => setSelectedSagra(sagra)}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer group min-w-0"
                  >
                    {/* Dedicated Top Bar: Full Date on Left (never truncated), Edit/Delete/Favorite on Right */}
                    <div className="px-1.5 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-1 shrink-0">
                      <span className="bg-emerald-700 text-white px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-black leading-tight whitespace-nowrap shrink-0 shadow-2xs">
                        {sagra.dateBadge}
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openNewSagraModal(sagra);
                              }}
                              className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-2xs flex items-center justify-center cursor-pointer transition-transform active:scale-90"
                              title="Admin: Cambia locandina o modifica sagra"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSagra(sagra);
                              }}
                              className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-2xs flex items-center justify-center cursor-pointer transition-transform active:scale-90"
                              title="Admin: Elimina sagra"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLikedIds((prev) => ({ ...prev, [sagra.id]: !prev[sagra.id] }));
                          }}
                          className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
                          title="Salva sagra tra i preferiti"
                        >
                          <Heart
                            className={`w-3 h-3 ${
                              isLiked ? 'fill-rose-600 text-rose-600' : 'text-slate-700'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* VERTICAL 3:4 POSTER FLYER (Top of flyer is 100% uncovered) */}
                    <div className="relative aspect-[3/4] w-full bg-slate-900 overflow-hidden">
                      <img
                        src={resolvedThumb}
                        alt={sagra.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const img = e.currentTarget;
                          const svgPoster = buildSvgPosterDataUri(sagra);
                          if (img.src !== svgPoster) {
                            img.src = svgPoster;
                          }
                        }}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />

                      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/95 via-black/65 to-transparent pointer-events-none" />

                      {/* Bottom Poster Overlay */}
                      <div className="absolute bottom-2 left-2 right-2 text-white">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="inline-block bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-md text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider shadow-xs truncate">
                            {sagra.categoryLabel}
                          </span>
                          {sagra.extraPhotos && sagra.extraPhotos.length > 0 && (
                            <span className="inline-block bg-white/95 text-slate-950 px-1.5 py-0.5 rounded-md text-[8.5px] font-black shadow-xs shrink-0">
                              +{sagra.extraPhotos.length} foto
                            </span>
                          )}
                        </div>
                        <h3 className="text-xs sm:text-[15px] font-extrabold leading-tight line-clamp-2 drop-shadow-sm">
                          {sagra.title}
                        </h3>
                        <p className="text-[10.5px] sm:text-[11px] text-white/90 font-medium truncate mt-0.5 drop-shadow-xs">
                          {distKm} km · {sagra.locationName}
                        </p>
                      </div>
                    </div>

                    {/* 2-Column Grid Action Footer: Mappa & Naviga always visible in full without truncation */}
                    <div className="p-1.5 bg-white grid grid-cols-2 gap-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSagraOnMainMap(sagra);
                        }}
                        className="w-full min-w-0 py-1.5 px-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-[10.5px] sm:text-[11px] font-extrabold flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <MapIcon className="w-3 h-3 shrink-0 text-emerald-700" />
                        <span>Mappa</span>
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
                        className="w-full min-w-0 py-1.5 px-1 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white rounded-xl text-[10.5px] sm:text-[11px] font-extrabold flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Navigation className="w-3 h-3 shrink-0" />
                        <span>Naviga</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredSagres.length === 0 && (
              <div className="text-center py-8 px-4 bg-white rounded-2xl border border-slate-200 space-y-2.5">
                <p className="text-xs font-bold text-slate-700">
                  Le date ufficiali delle sagre per questo periodo o zona non sono ancora state pubblicate dagli organizzatori.
                </p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Puoi premere il pulsante qui sotto per verificare sul web se Comuni o Pro Loco hanno appena pubblicato nuove date confermate, oppure inserire direttamente una sagra con locandina.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleFetchLiveSagreFromApi}
                    disabled={isFetchingLiveApi}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLiveApi ? 'animate-spin' : ''}`} />
                    <span>Verifica nuove date pubblicate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openNewSagraModal()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{isAdmin ? 'Aggiungi Sagra + Locandina' : 'Segnala una Sagra'}</span>
                  </button>
                </div>
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

      {/* ADD / EDIT SAGRA + LOCANDINA MODAL (ADMIN & USERS) */}
      {showAddSagraModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => setShowAddSagraModal(false)}
            className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Modal Header */}
              <div className="bg-[#3E4A35] text-white px-4 py-3.5 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm sm:text-base font-black flex items-center gap-1.5">
                    🎪{' '}
                    {editingSagraId
                      ? 'Modifica Sagra / Cambia Locandina'
                      : isAdmin
                      ? 'Aggiungi Sagra + Locandina (Admin)'
                      : 'Segnala una Sagra + Locandina'}
                  </h3>
                  <p className="text-[10.5px] text-emerald-100 font-medium">
                    {isAdmin
                      ? 'Pubblicazione immediata su Firebase per tutti gli utenti (si auto-elimina dopo la data di fine).'
                      : 'La tua segnalazione sarà visibile a tutti dopo la verifica dell\'amministratore.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSagraModal(false)}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSagraForm} className="p-4 overflow-y-auto space-y-3 text-xs flex-1">
                {/* 1. Upload Flyer Image */}
                <div className="bg-slate-50 border-2 border-dashed border-emerald-600/50 rounded-2xl p-3 flex items-center gap-3">
                  {formFlyerDataUri ? (
                    <img
                      src={resolveApiUrl(formFlyerDataUri)}
                      alt="Anteprima Locandina"
                      className="w-20 h-28 object-cover rounded-xl border border-slate-300 shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-28 rounded-xl bg-emerald-950/10 border border-emerald-600/30 flex flex-col items-center justify-center text-emerald-800 shrink-0 text-center p-1">
                      <Upload className="w-5 h-5 mb-1" />
                      <span className="text-[9px] font-extrabold leading-tight">Nessuna locandina</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <label className="block font-black text-slate-800 text-xs">
                      📸 Foto della Locandina Ufficiale
                    </label>
                    <p className="text-[10.5px] text-slate-500 leading-snug">
                      Carica l&apos;immagine della locandina dal telefono o dal PC. Viene ottimizzata e salvata nel tuo Firebase.
                    </p>
                    <input
                      ref={flyerInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFlyerFileChange}
                      className="hidden"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => flyerInputRef.current?.click()}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[11px] font-black inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{formFlyerDataUri ? 'Cambia da Dispositivo' : 'Carica da Dispositivo'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleFindFlyersOnWebForForm}
                        disabled={isSearchingWebFlyers}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-[11px] font-black inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Search className={`w-3.5 h-3.5 ${isSearchingWebFlyers ? 'animate-spin' : ''}`} />
                        <span>
                          {isSearchingWebFlyers ? 'Cerco sul Web...' : '🔍 Cerca Locandina sul Web'}
                        </span>
                      </button>
                      {formFlyerDataUri && (
                        <button
                          type="button"
                          onClick={() => setFormFlyerDataUri('')}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-[10.5px] font-bold cursor-pointer"
                        >
                          Rimuovi foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Web Flyer Candidates Picker */}
                {webFlyerCandidates.length > 0 && (
                  <div className="bg-indigo-50/90 border border-indigo-200 rounded-2xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-black text-indigo-950">
                        🌐 Locandine trovate sul Web ({webFlyerCandidates.length}) — Clicca per usare come principale o aggiungere in basso:
                      </span>
                      <button
                        type="button"
                        onClick={() => setWebFlyerCandidates([])}
                        className="text-[10px] font-bold text-indigo-700 hover:underline cursor-pointer"
                      >
                        Chiudi
                      </button>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {webFlyerCandidates.map((candUri, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-indigo-300 bg-slate-900 group"
                        >
                          <img
                            src={candUri}
                            alt={`Candidata ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1 flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => setFormFlyerDataUri(candUri)}
                              className="w-full py-0.5 bg-amber-400 text-slate-950 rounded text-[8.5px] font-black cursor-pointer"
                            >
                              Principale
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setFormExtraPhotos((prev) =>
                                  prev.includes(candUri) ? prev : [...prev, candUri].slice(0, 8)
                                )
                              }
                              className="w-full py-0.5 bg-emerald-600 text-white rounded text-[8.5px] font-black cursor-pointer"
                            >
                              + In basso
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Title & Municipality + AI Magic Auto-Fill Button */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">
                      Nome della Sagra / Evento *
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Es. Sagra della Castagna e Vino Novello"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">
                      Comune e Provincia *
                    </label>
                    <input
                      type="text"
                      required
                      value={formLocationName}
                      onChange={(e) => setFormLocationName(e.target.value)}
                      placeholder="Es. Soriano nel Cimino (VT)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                {/* AI Auto-Fill Button */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 flex items-center justify-between gap-2">
                  <span className="text-[10.5px] font-bold text-amber-950 leading-snug">
                    💡 Hai scritto Titolo e Comune? Compila in automatico GPS, Regione, Piatti, Sosta Camper e Descrizione rielaborata:
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoFillWithAiAndGeocode}
                    disabled={isAutoFillingAi}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-200 text-slate-950 rounded-xl text-[10.5px] font-black flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                  >
                    <Wand2 className={`w-3.5 h-3.5 ${isAutoFillingAi ? 'animate-spin' : ''}`} />
                    <span>{isAutoFillingAi ? 'Compilazione...' : '✨ Auto-compila AI'}</span>
                  </button>
                </div>

                {/* 3. Start Date & End Date (Auto-expiration date) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">
                      Data Inizio *
                    </label>
                    <input
                      type="date"
                      required
                      value={formStartDate}
                      onChange={(e) => {
                        setFormStartDate(e.target.value);
                        if (!formEndDate || formEndDate < e.target.value) {
                          setFormEndDate(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">
                      Data Fine (Scadenza automatica) *
                    </label>
                    <input
                      type="date"
                      required
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* 4. Region & Category Label */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Regione</label>
                    <input
                      type="text"
                      value={formRegion}
                      onChange={(e) => setFormRegion(e.target.value)}
                      placeholder="Es. Lazio, Toscana..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">
                      Etichetta Categoria (sul badge)
                    </label>
                    <input
                      type="text"
                      value={formCategoryLabel}
                      onChange={(e) => setFormCategoryLabel(e.target.value)}
                      placeholder="Es. Castagne & Vino Novello"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 outline-none"
                    />
                  </div>
                </div>

                {/* 5. Specialties & Camper Parking */}
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Piatti Tipici / Specialità (separati da virgola)
                  </label>
                  <input
                    type="text"
                    value={formSpecialties}
                    onChange={(e) => setFormSpecialties(e.target.value)}
                    placeholder="Es. Gnocchi al Cinghiale, Polenta, Caldarroste"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Descrizione Evento (con parole tue o generata da AI)
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Breve descrizione della festa e degli stand gastronomici..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-1">
                    <label className="block font-bold text-slate-600 text-[10.5px] mb-0.5">
                      Coordinate GPS (Lat / Lng)
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={formLat}
                        onChange={(e) => setFormLat(e.target.value)}
                        placeholder="Lat"
                        className="w-1/2 px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-mono"
                      />
                      <input
                        type="text"
                        value={formLng}
                        onChange={(e) => setFormLng(e.target.value)}
                        placeholder="Lng"
                        className="w-1/2 px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-mono"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-600 text-[10.5px] mb-0.5">
                      🏕️ Sosta Camper Consigliata
                    </label>
                    <input
                      type="text"
                      value={formCamperParking}
                      onChange={(e) => setFormCamperParking(e.target.value)}
                      placeholder="Es. Parcheggio camper comunale in Via Roma"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px]"
                    />
                  </div>
                </div>

                {/* 6. Additional Flyers / Menu / Event Photos at the bottom */}
                <div className="bg-amber-50/60 border-2 border-dashed border-amber-400 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <label className="block font-black text-slate-800 text-xs">
                        📄 Altri Volantini, Menù o Foto dell&apos;Evento ({formExtraPhotos.length}/8)
                      </label>
                      <p className="text-[10.5px] text-slate-500 leading-snug">
                        Aggiungi eventuali altre locandine della Pro Loco (es. programma serate, menù stand gastronomici, mappa parcheggi).
                      </p>
                    </div>
                    <input
                      ref={extraPhotosInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleExtraPhotosFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => extraPhotosInputRef.current?.click()}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-[11px] font-black inline-flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Aggiungi Altre Foto</span>
                    </button>
                  </div>

                  {formExtraPhotos.length > 0 && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                      {formExtraPhotos.map((photoUri, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-[3/4] rounded-xl overflow-hidden border border-amber-300 bg-slate-900 group"
                        >
                          <img
                            src={resolveApiUrl(photoUri)}
                            alt={`Volantino aggiuntivo ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setFormExtraPhotos((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md cursor-pointer"
                            title="Rimuovi questa foto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Footer */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddSagraModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingSagra}
                    className="px-5 py-2 rounded-xl bg-[#3E4A35] hover:bg-[#5A6B4E] disabled:bg-slate-300 text-white font-black text-xs cursor-pointer shadow-md"
                  >
                    {isSavingSagra
                      ? 'Salvataggio...'
                      : isAdmin
                      ? 'Pubblica Sagra Subito'
                      : 'Invia Segnalazione Sagra'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* DETAILED FULL-SCREEN VIEW WITH FULL LOCANDINA POSTER */}
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
              {/* Top Header Bar with Close X & Admin Edit/Delete */}
              <div className="bg-[#3E4A35] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-md z-30">
                <button
                  type="button"
                  onClick={() => setSelectedSagra(null)}
                  className="flex items-center gap-1.5 text-white hover:text-emerald-200 text-xs sm:text-sm font-black cursor-pointer py-0.5"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                  <span>Torna agli eventi</span>
                </button>
                <div className="flex items-center gap-1.5">
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const s = selectedSagra;
                          setSelectedSagra(null);
                          openNewSagraModal(s);
                        }}
                        className="px-2.5 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10.5px] font-black flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Cambia Locandina / Modifica</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSagra(selectedSagra)}
                        className="p-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                        title="Elimina Sagra"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedSagra(null)}
                    className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-all"
                    title="Chiudi"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Poster Flyer Display */}
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
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const img = e.currentTarget;
                    const svgPoster = buildSvgPosterDataUri(selectedSagra);
                    if (img.src !== svgPoster) {
                      img.src = svgPoster;
                    }
                  }}
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

                {/* Additional Flyers / Menus / Event Photos Gallery at the bottom */}
                {selectedSagra.extraPhotos && selectedSagra.extraPhotos.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <h4 className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📄 Altri Volantini, Menù & Locandine ({selectedSagra.extraPhotos.length})</span>
                      <span className="text-[9.5px] font-normal text-slate-400">· Tocca per ingrandire</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {selectedSagra.extraPhotos.map((extraUri, idx) => (
                        <div
                          key={idx}
                          onClick={() => setZoomedPosterUrl(resolveApiUrl(extraUri))}
                          className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 cursor-zoom-in group shadow-xs"
                        >
                          <img
                            src={resolveApiUrl(extraUri)}
                            alt={`${selectedSagra.title} - Locandina ${idx + 2}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute bottom-1.5 right-1.5 bg-black/75 text-white px-2 py-0.5 rounded-lg text-[9.5px] font-bold flex items-center gap-1">
                            <Maximize2 className="w-2.5 h-2.5" />
                            <span>Locandina {idx + 2}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSagra.sourceUrl && !selectedSagra.sourceUrl.includes('trovasagre.com') && (
                  <a
                    href={selectedSagra.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline pb-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Fonte ufficiale evento</span>
                  </a>
                )}
              </div>

              {/* Sticky Bottom Action Footer */}
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
              referrerPolicy="no-referrer"
              onError={(e) => {
                const img = e.currentTarget;
                if (selectedSagra) {
                  const svgPoster = buildSvgPosterDataUri(selectedSagra);
                  if (img.src !== svgPoster) {
                    img.src = svgPoster;
                  }
                }
              }}
              className="max-w-full max-h-[94vh] object-contain rounded-lg shadow-2xl"
            />
          </div>,
          document.body
        )}
    </div>
  );
}

export function AdminSagreModerationSection({
  userLocation,
  currentUser,
}: {
  userLocation: { lat: number; lng: number } | null;
  currentUser?: {
    email?: string;
    name?: string;
    username?: string;
    role?: string;
    isModerator?: boolean;
  } | null;
}) {
  const [allSagre, setAllSagre] = useState<SagraEvent[]>(() => getAllSagreEvents());
  const [pendingSagre, setPendingSagre] = useState<SagraEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Add / Edit Form state inside Admin Panel
  const [showForm, setShowForm] = useState(false);
  const [editingSagraId, setEditingSagraId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formLocationName, setFormLocationName] = useState('');
  const [formRegion, setFormRegion] = useState('Lazio');
  const [formCategory, setFormCategory] = useState<'sagra' | 'natale' | 'storica' | 'vino'>('sagra');
  const [formCategoryLabel, setFormCategoryLabel] = useState('Sagra & Gastronomia');
  const [formStartDate, setFormStartDate] = useState(() => getTodayIsoDate());
  const [formEndDate, setFormEndDate] = useState(() => getTodayIsoDate());
  const [formLat, setFormLat] = useState<string>('');
  const [formLng, setFormLng] = useState<string>('');
  const [formDescription, setFormDescription] = useState('');
  const [formSpecialties, setFormSpecialties] = useState('');
  const [formCamperParking, setFormCamperParking] = useState('');
  const [formFlyerDataUri, setFormFlyerDataUri] = useState<string>('');
  const [formExtraPhotos, setFormExtraPhotos] = useState<string[]>([]);
  const [webFlyerCandidates, setWebFlyerCandidates] = useState<string[]>([]);
  const [isSearchingWebFlyers, setIsSearchingWebFlyers] = useState(false);
  const [isBatchFindingFlyers, setIsBatchFindingFlyers] = useState(false);
  const [findingSagraId, setFindingSagraId] = useState<string | null>(null);
  const [isAutoFillingAi, setIsAutoFillingAi] = useState(false);
  const [isSavingSagra, setIsSavingSagra] = useState(false);
  const flyerInputRef = useRef<HTMLInputElement | null>(null);
  const extraPhotosInputRef = useRef<HTMLInputElement | null>(null);

  const refreshData = async () => {
    setIsSyncing(true);
    try {
      const { pending } = await syncSagreFromFirestore();
      setPendingSagre(pending);
      setAllSagre(getAllSagreEvents());
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const onUpdated = () => setAllSagre(getAllSagreEvents());
    window.addEventListener('sagre-updated', onUpdated);
    refreshData();
    return () => window.removeEventListener('sagre-updated', onUpdated);
  }, []);

  const openEditor = (sagra?: SagraEvent) => {
    if (sagra) {
      setEditingSagraId(sagra.id);
      setFormTitle(sagra.title);
      setFormLocationName(sagra.locationName);
      setFormRegion(sagra.region || 'Italia');
      setFormCategory(sagra.category || 'sagra');
      setFormCategoryLabel(sagra.categoryLabel || 'Sagra & Gastronomia');
      setFormStartDate(sagra.startDate || getTodayIsoDate());
      setFormEndDate(sagra.endDate || sagra.startDate || getTodayIsoDate());
      setFormLat(String(sagra.lat || ''));
      setFormLng(String(sagra.lng || ''));
      setFormDescription(sagra.description || '');
      setFormSpecialties((sagra.specialties || []).join(', '));
      setFormCamperParking(sagra.camperParking || '');
      setFormFlyerDataUri(sagra.fullFlyerUrl || sagra.imageUrl || '');
      setFormExtraPhotos(Array.isArray(sagra.extraPhotos) ? sagra.extraPhotos : []);
      setWebFlyerCandidates([]);
    } else {
      const today = getTodayIsoDate();
      setEditingSagraId(null);
      setFormTitle('');
      setFormLocationName('');
      setFormRegion('Lazio');
      setFormCategory('sagra');
      setFormCategoryLabel('Sagra & Gastronomia');
      setFormStartDate(today);
      setFormEndDate(today);
      setFormLat(userLocation ? userLocation.lat.toFixed(4) : '41.7200');
      setFormLng(userLocation ? userLocation.lng.toFixed(4) : '12.6500');
      setFormDescription('');
      setFormSpecialties('');
      setFormCamperParking('');
      setFormFlyerDataUri('');
      setFormExtraPhotos([]);
      setWebFlyerCandidates([]);
    }
    setShowForm(true);
  };

  const handleFindFlyersOnWebInAdminForm = async () => {
    if (!formTitle.trim() && !formLocationName.trim()) {
      setStatusMsg('⚠️ Inserisci almeno il Titolo e il Comune per cercare le locandine sul web.');
      return;
    }
    setIsSearchingWebFlyers(true);
    try {
      const res = await fetch(resolveApiUrl('/api/sagre-find-flyers'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          locationName: formLocationName.trim(),
          maxCount: 5,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.flyers) && data.flyers.length > 0) {
          const compressedAll: string[] = [];
          for (const rawUri of data.flyers) {
            compressedAll.push(await compressDataUriToJpeg(rawUri));
          }
          setWebFlyerCandidates(compressedAll);
          if (!formFlyerDataUri || !formFlyerDataUri.startsWith('data:image/')) {
            setFormFlyerDataUri(compressedAll[0]);
          }
          setStatusMsg(`✅ Trovate ${compressedAll.length} locandine sul web! La prima è stata impostata come principale.`);
        } else {
          setStatusMsg('ℹ️ Nessuna locandina trovata automaticamente per questo titolo.');
        }
      }
    } catch {
      setStatusMsg('⚠️ Errore durante la ricerca locandine sul web.');
    } finally {
      setIsSearchingWebFlyers(false);
    }
  };

  const handleAutoAttachFlyerForSingleSagra = async (sagra: SagraEvent) => {
    setFindingSagraId(sagra.id);
    try {
      const res = await fetch(resolveApiUrl('/api/sagre-find-flyers'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: sagra.title,
          locationName: sagra.locationName,
          maxCount: 3,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.flyers) && data.flyers.length > 0) {
          const mainCompressed = await compressDataUriToJpeg(data.flyers[0]);
          const extraCompressed: string[] = [];
          for (const extraRaw of data.flyers.slice(1, 3)) {
            extraCompressed.push(await compressDataUriToJpeg(extraRaw));
          }
          const updated: SagraEvent = {
            ...sagra,
            imageUrl: mainCompressed,
            fullFlyerUrl: mainCompressed,
            extraPhotos: [...(sagra.extraPhotos || []), ...extraCompressed].slice(0, 8),
            isRealFlyer: true,
          };
          await saveSagraToFirestore(updated, true);
          await refreshData();
          setStatusMsg(`✅ Locandina trovata sul web e salvata per "${sagra.title}"!`);
          return;
        }
      }
      setStatusMsg(`ℹ️ Nessuna locandina trovata sul web per "${sagra.title}".`);
    } catch {
      setStatusMsg('⚠️ Errore durante la ricerca automatica della locandina.');
    } finally {
      setFindingSagraId(null);
    }
  };

  const handleBatchAutoAttachAllMissingFlyers = async () => {
    const missing = allSagre.filter((s) => !s.imageUrl.startsWith('data:image/'));
    if (missing.length === 0) {
      setStatusMsg('✅ Tutte le sagre attive hanno già una locandina salvata su Firebase!');
      return;
    }
    setIsBatchFindingFlyers(true);
    let updatedCount = 0;
    try {
      for (const s of missing) {
        setStatusMsg(`🔍 Ricerca locandina sul web per "${s.title}" (${updatedCount + 1}/${missing.length})...`);
        try {
          const res = await fetch(resolveApiUrl('/api/sagre-find-flyers'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: s.title,
              locationName: s.locationName,
              maxCount: 2,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.flyers) && data.flyers.length > 0) {
              const mainCompressed = await compressDataUriToJpeg(data.flyers[0]);
              const extraCompressed: string[] = [];
              if (data.flyers.length > 1) {
                extraCompressed.push(await compressDataUriToJpeg(data.flyers[1]));
              }
              await saveSagraToFirestore(
                {
                  ...s,
                  imageUrl: mainCompressed,
                  fullFlyerUrl: mainCompressed,
                  extraPhotos: [...(s.extraPhotos || []), ...extraCompressed].slice(0, 8),
                  isRealFlyer: true,
                },
                true
              );
              updatedCount++;
            }
          }
        } catch {
          // continue with next
        }
      }
      await refreshData();
      setStatusMsg(`✅ Completato! Trovate e salvate in automatico su Firebase le locandine per ${updatedCount} sagre.`);
    } finally {
      setIsBatchFindingFlyers(false);
    }
  };

  const handleFlyerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressFlyerImageToDataUri(file);
      setFormFlyerDataUri(compressed);
    } catch {
      setStatusMsg('⚠️ Impossibile leggere il file della locandina.');
    }
  };

  const handleExtraPhotosFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList: File[] = Array.from(files);
    try {
      const compressedList: string[] = [];
      for (const f of fileList) {
        const dataUri = await compressFlyerImageToDataUri(f);
        compressedList.push(dataUri);
      }
      setFormExtraPhotos((prev) => [...prev, ...compressedList].slice(0, 8));
    } catch {
      setStatusMsg('⚠️ Errore nel caricamento di una delle foto aggiuntive.');
    } finally {
      e.target.value = '';
    }
  };

  const handleAutoFillWithAi = async () => {
    if (!formTitle.trim() && !formLocationName.trim()) {
      setStatusMsg('⚠️ Inserisci almeno il Titolo o il Comune prima di auto-compilare.');
      return;
    }
    setIsAutoFillingAi(true);
    try {
      if (formLocationName.trim()) {
        try {
          const nomRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&accept-language=it&q=${encodeURIComponent(
              formLocationName.trim()
            )}`
          );
          if (nomRes.ok) {
            const nomArr = await nomRes.json();
            if (Array.isArray(nomArr) && nomArr.length > 0) {
              setFormLat(Number(nomArr[0].lat).toFixed(4));
              setFormLng(Number(nomArr[0].lon).toFixed(4));
            }
          }
        } catch {
          // ignore
        }
      }

      const res = await fetch(resolveApiUrl('/api/sagre-ai-autofill'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          locationName: formLocationName.trim(),
          rawNotes: formSpecialties.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.locationName) setFormLocationName(data.locationName);
        if (data.region) setFormRegion(data.region);
        if (typeof data.lat === 'number' && (!formLat || formLat === '41.7200')) {
          setFormLat(data.lat.toFixed(4));
        }
        if (typeof data.lng === 'number' && (!formLng || formLng === '12.6500')) {
          setFormLng(data.lng.toFixed(4));
        }
        if (data.category && ['sagra', 'natale', 'storica', 'vino'].includes(data.category)) {
          setFormCategory(data.category);
        }
        if (data.categoryLabel) setFormCategoryLabel(data.categoryLabel);
        if (data.description) setFormDescription(data.description);
        if (Array.isArray(data.specialties) && data.specialties.length > 0) {
          setFormSpecialties(data.specialties.join(', '));
        }
        if (data.camperParking) setFormCamperParking(data.camperParking);
      }
    } finally {
      setIsAutoFillingAi(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formLocationName.trim() || !formStartDate) return;
    setIsSavingSagra(true);
    try {
      const sDate = formStartDate.slice(0, 10);
      const eDate = (formEndDate || formStartDate).slice(0, 10);
      const dInfo = formatSagraDateBadgeClient(sDate, eDate);

      let latNum = parseFloat(formLat);
      let lngNum = parseFloat(formLng);
      if (isNaN(latNum) || isNaN(lngNum)) {
        try {
          const nomRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&accept-language=it&q=${encodeURIComponent(
              formLocationName.trim()
            )}`
          );
          if (nomRes.ok) {
            const nomArr = await nomRes.json();
            if (Array.isArray(nomArr) && nomArr.length > 0) {
              latNum = parseFloat(nomArr[0].lat);
              lngNum = parseFloat(nomArr[0].lon);
            }
          }
        } catch {
          // ignore
        }
      }
      if (isNaN(latNum)) latNum = userLocation?.lat ?? 41.72;
      if (isNaN(lngNum)) lngNum = userLocation?.lng ?? 12.65;

      const specs = formSpecialties
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const defaultPoster =
        'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80';
      const chosenPoster = formFlyerDataUri.trim() || defaultPoster;

      const sagraObj: SagraEvent = {
        id: editingSagraId || `custom_sagra_${Date.now()}`,
        title: formTitle.trim(),
        category: formCategory,
        categoryLabel: formCategoryLabel.trim() || 'Sagra & Gastronomia',
        locationName: formLocationName.trim(),
        region: formRegion.trim() || 'Italia',
        dates: dInfo.readable,
        dateBadge: dInfo.badge,
        startDate: sDate,
        endDate: eDate >= sDate ? eDate : sDate,
        month: dInfo.month,
        season: dInfo.season,
        lat: latNum,
        lng: lngNum,
        description:
          formDescription.trim() ||
          `Festa gastronomica e prodotti tipici a ${formLocationName.trim()}.`,
        specialties: specs.length > 0 ? specs : ['Stand Gastronomici', 'Piatti Tipici Locali'],
        camperParking:
          formCamperParking.trim() ||
          `Area sosta o parcheggio camper comunale a ${formLocationName.trim()}.`,
        imageUrl: chosenPoster,
        fullFlyerUrl: chosenPoster,
        extraPhotos: formExtraPhotos,
        isRealFlyer: Boolean(formFlyerDataUri.trim()),
        section:
          dInfo.season === 'estate' ? 'estate' : dInfo.month === 12 ? 'natale' : 'weekend',
        submittedByEmail: currentUser?.email || 'admin@viacamper.app',
        submittedByName: currentUser?.name || 'Admin ViaCamper',
      };

      await saveSagraToFirestore(sagraObj, true);
      await refreshData();
      setShowForm(false);
      setStatusMsg(`✅ Sagra "${sagraObj.title}" salvata e pubblicata con successo!`);
    } catch {
      setStatusMsg('⚠️ Errore durante il salvataggio della sagra.');
    } finally {
      setIsSavingSagra(false);
    }
  };

  const handleApprove = async (sagra: SagraEvent) => {
    await approvePendingSagraInFirestore(sagra);
    await refreshData();
    setStatusMsg(`✅ Sagra "${sagra.title}" approvata e pubblicata!`);
  };

  const handleDelete = async (sagra: SagraEvent) => {
    await deleteSagraEverywhere(sagra.id);
    await refreshData();
    setStatusMsg(`🗑️ Sagra "${sagra.title}" eliminata.`);
  };

  const filtered = allSagre.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      s.locationName.toLowerCase().includes(q) ||
      s.region.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-3 sm:p-5 flex-1 space-y-4 font-sans">
      {/* Top Action Banner */}
      <div className="bg-[#3E4A35]/5 border border-[#3E4A35]/15 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="font-black text-[#3E4A35] text-xs sm:text-sm flex items-center gap-1.5">
            🎪 Gestione Sagre, Fiere & Locandine ({allSagre.length} attive)
          </h4>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Inserisci nuove sagre con locandina, modifica quelle esistenti o approva le segnalazioni degli utenti. Le sagre scadute vengono eliminate automaticamente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleBatchAutoAttachAllMissingFlyers}
            disabled={isBatchFindingFlyers || isSyncing}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            title="Cerca sul web e allega in automatico le locandine per tutte le sagre che ancora non ne hanno una"
          >
            <Wand2 className={`w-4 h-4 ${isBatchFindingFlyers ? 'animate-spin' : ''}`} />
            <span>
              {isBatchFindingFlyers
                ? 'Ricerca locandine in corso...'
                : '🪄 Cerca Locandine sul Web (Tutte)'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => openEditor()}
            className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Aggiungi Sagra + Locandina</span>
          </button>
          <button
            type="button"
            onClick={refreshData}
            disabled={isSyncing}
            className="px-3 py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Ricarica</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between">
          <span>{statusMsg}</span>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* OVERLAY MODAL FOR ADD / EDIT SAGRA IN ADMIN PANEL */}
      {showForm &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => setShowForm(false)}
            className="fixed inset-0 z-[100001] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans"
            >
              {/* Modal Header */}
              <div className="bg-[#3E4A35] text-white px-4 py-3.5 flex items-center justify-between shrink-0">
                <div>
                  <h5 className="font-black text-white text-sm sm:text-base flex items-center gap-1.5">
                    🎪{' '}
                    {editingSagraId
                      ? 'Modifica Sagra / Cambia Locandina'
                      : 'Nuova Sagra + Locandina'}
                  </h5>
                  <p className="text-[10.5px] text-emerald-100 font-medium">
                    Modifica i dati o le locandine: quando salvi, torni esattamente al punto della lista in cui ti trovavi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={handleSave}
                className="p-4 overflow-y-auto space-y-3 text-xs flex-1"
              >
                {/* Upload Flyer */}
                <div className="bg-slate-50 border-2 border-dashed border-emerald-600/50 rounded-2xl p-3 flex items-center gap-3">
                  {formFlyerDataUri ? (
                    <img
                      src={resolveApiUrl(formFlyerDataUri)}
                      alt="Anteprima Locandina"
                      className="w-20 h-28 object-cover rounded-xl border border-slate-300 shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-28 rounded-xl bg-emerald-950/10 border border-emerald-600/30 flex flex-col items-center justify-center text-emerald-800 shrink-0 text-center p-1">
                      <Upload className="w-5 h-5 mb-1" />
                      <span className="text-[9px] font-extrabold leading-tight">
                        Nessuna locandina
                      </span>
                    </div>
                  )}
                  <div className="flex-1 space-y-1.5">
                    <label className="block font-black text-slate-800 text-xs">
                      📸 Foto della Locandina Ufficiale
                    </label>
                    <p className="text-[10.5px] text-slate-500">
                      Carica la foto o screenshot della locandina dal telefono o PC, oppure cercala automaticamente sul web.
                    </p>
                    <input
                      ref={flyerInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFlyerFileChange}
                      className="hidden"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => flyerInputRef.current?.click()}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[11px] font-black inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {formFlyerDataUri
                            ? 'Cambia da PC/Telefono'
                            : 'Carica da PC/Telefono'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={handleFindFlyersOnWebInAdminForm}
                        disabled={isSearchingWebFlyers}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-[11px] font-black inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Search
                          className={`w-3.5 h-3.5 ${
                            isSearchingWebFlyers ? 'animate-spin' : ''
                          }`}
                        />
                        <span>
                          {isSearchingWebFlyers
                            ? 'Cerco sul Web...'
                            : '🔍 Cerca Locandina sul Web'}
                        </span>
                      </button>
                      {formFlyerDataUri && (
                        <button
                          type="button"
                          onClick={() => setFormFlyerDataUri('')}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-[10.5px] font-bold cursor-pointer"
                        >
                          Rimuovi foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {webFlyerCandidates.length > 0 && (
                  <div className="bg-indigo-50/90 border border-indigo-200 rounded-2xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-black text-indigo-950">
                        🌐 Locandine trovate sul Web ({webFlyerCandidates.length}) — Clicca per usare come principale o aggiungere in basso:
                      </span>
                      <button
                        type="button"
                        onClick={() => setWebFlyerCandidates([])}
                        className="text-[10px] font-bold text-indigo-700 hover:underline cursor-pointer"
                      >
                        Chiudi
                      </button>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {webFlyerCandidates.map((candUri, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-indigo-300 bg-slate-900"
                        >
                          <img
                            src={candUri}
                            alt={`Candidata ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1 flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => setFormFlyerDataUri(candUri)}
                              className="w-full py-0.5 bg-amber-400 text-slate-950 rounded text-[8.5px] font-black cursor-pointer"
                            >
                              Principale
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setFormExtraPhotos((prev) =>
                                  prev.includes(candUri)
                                    ? prev
                                    : [...prev, candUri].slice(0, 8)
                                )
                              }
                              className="w-full py-0.5 bg-emerald-600 text-white rounded text-[8.5px] font-black cursor-pointer"
                            >
                              + In basso
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">
                      Nome della Sagra / Evento *
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Es. Sagra della Castagna e Vino Novello"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">
                      Comune e Provincia *
                    </label>
                    <input
                      type="text"
                      required
                      value={formLocationName}
                      onChange={(e) => setFormLocationName(e.target.value)}
                      placeholder="Es. Soriano nel Cimino (VT)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 flex items-center justify-between gap-2">
                  <span className="text-[10.5px] font-bold text-amber-950">
                    💡 Premi per compilare in automatico GPS, Regione, Piatti, Sosta Camper e Descrizione:
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoFillWithAi}
                    disabled={isAutoFillingAi}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-200 text-slate-950 rounded-xl text-[10.5px] font-black flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Wand2
                      className={`w-3.5 h-3.5 ${
                        isAutoFillingAi ? 'animate-spin' : ''
                      }`}
                    />
                    <span>
                      {isAutoFillingAi ? 'Compilazione...' : '✨ Auto-compila AI'}
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">
                      Data Inizio *
                    </label>
                    <input
                      type="date"
                      required
                      value={formStartDate}
                      onChange={(e) => {
                        setFormStartDate(e.target.value);
                        if (!formEndDate || formEndDate < e.target.value) {
                          setFormEndDate(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">
                      Data Fine (Scadenza automatica) *
                    </label>
                    <input
                      type="date"
                      required
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">
                      Regione
                    </label>
                    <input
                      type="text"
                      value={formRegion}
                      onChange={(e) => setFormRegion(e.target.value)}
                      placeholder="Es. Lazio, Toscana..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">
                      Etichetta Categoria
                    </label>
                    <input
                      type="text"
                      value={formCategoryLabel}
                      onChange={(e) => setFormCategoryLabel(e.target.value)}
                      placeholder="Es. Castagne & Vino Novello"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Piatti Tipici / Specialità (separati da virgola)
                  </label>
                  <input
                    type="text"
                    value={formSpecialties}
                    onChange={(e) => setFormSpecialties(e.target.value)}
                    placeholder="Es. Gnocchi al Cinghiale, Polenta, Caldarroste"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Descrizione Evento
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Breve descrizione della festa..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-slate-600 text-[10.5px] mb-0.5">
                      Coordinate GPS (Lat / Lng)
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={formLat}
                        onChange={(e) => setFormLat(e.target.value)}
                        placeholder="Lat"
                        className="w-1/2 px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-mono"
                      />
                      <input
                        type="text"
                        value={formLng}
                        onChange={(e) => setFormLng(e.target.value)}
                        placeholder="Lng"
                        className="w-1/2 px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-mono"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-600 text-[10.5px] mb-0.5">
                      🏕️ Sosta Camper Consigliata
                    </label>
                    <input
                      type="text"
                      value={formCamperParking}
                      onChange={(e) => setFormCamperParking(e.target.value)}
                      placeholder="Es. Parcheggio camper comunale in Via Roma"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px]"
                    />
                  </div>
                </div>

                {/* Upload Additional Flyers / Photos at the bottom of the form */}
                <div className="bg-amber-50/60 border-2 border-dashed border-amber-400 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <label className="block font-black text-slate-800 text-xs">
                        📄 Altri Volantini, Menù o Foto dell&apos;Evento ({formExtraPhotos.length}/8)
                      </label>
                      <p className="text-[10.5px] text-slate-500">
                        Aggiungi eventuali altri volantini della Pro Loco (es. programma serate, menù stand gastronomici, seconda pagina locandina).
                      </p>
                    </div>
                    <input
                      ref={extraPhotosInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleExtraPhotosFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => extraPhotosInputRef.current?.click()}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-[11px] font-black inline-flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Aggiungi Altre Foto</span>
                    </button>
                  </div>

                  {formExtraPhotos.length > 0 && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                      {formExtraPhotos.map((photoUri, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-[3/4] rounded-xl overflow-hidden border border-amber-300 bg-slate-900"
                        >
                          <img
                            src={resolveApiUrl(photoUri)}
                            alt={`Volantino aggiuntivo ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setFormExtraPhotos((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md cursor-pointer"
                            title="Rimuovi questa foto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingSagra}
                    className="px-5 py-2 rounded-xl bg-[#3E4A35] hover:bg-[#5A6B4E] disabled:bg-slate-300 text-white font-black text-xs cursor-pointer shadow-md"
                  >
                    {isSavingSagra ? 'Salvataggio...' : 'Salva e Pubblica Subito'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* PENDING USER SUBMISSIONS */}
      {pendingSagre.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3.5 space-y-2.5">
          <h5 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
            🔔 Sagre segnalate dagli utenti in attesa di approvazione ({pendingSagre.length})
          </h5>
          <div className="space-y-2">
            {pendingSagre.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl p-3 border border-amber-200 flex items-center justify-between gap-3"
              >
                <img
                  src={resolveApiUrl(p.imageUrl)}
                  alt={p.title}
                  className="w-12 h-16 object-cover rounded-lg border border-slate-200 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-slate-900 truncate">{p.title}</div>
                  <div className="text-[11px] font-bold text-slate-600 truncate">
                    📍 {p.locationName} ({p.region}) · 📅 {p.dates}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Inviata da: {p.submittedByName || p.submittedByEmail || 'Utente'}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditor(p)}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold cursor-pointer"
                  >
                    Modifica
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(p)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer"
                  >
                    Approva
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold cursor-pointer"
                  >
                    Rifiuta
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH & ALL ACTIVE SAGRE LIST */}
      <div className="space-y-2.5">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Cerca tra le sagre attive per nome, comune o regione..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#3E4A35]"
        />

        <div className="space-y-2">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 hover:border-slate-300 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={resolveApiUrl(s.imageUrl)}
                  alt={s.title}
                  onError={(e) => {
                    const img = e.currentTarget;
                    const svg = buildSvgPosterDataUri(s);
                    if (img.src !== svg) img.src = svg;
                  }}
                  className="w-12 h-16 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-900"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                      {s.title}
                    </span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[9px] font-black uppercase rounded-md">
                      {s.dateBadge}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
                    📍 {s.locationName} ({s.region}) · Scadenza: {s.endDate}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={() => handleAutoAttachFlyerForSingleSagra(s)}
                  disabled={findingSagraId === s.id || isBatchFindingFlyers}
                  className="px-2.5 py-1.5 text-amber-950 bg-amber-300 hover:bg-amber-400 disabled:bg-slate-200 rounded-lg text-xs font-black transition-colors cursor-pointer flex items-center gap-1"
                  title="Cerca automaticamente sul web la locandina di questa sagra e salvala su Firebase"
                >
                  <Search className={`w-3.5 h-3.5 ${findingSagraId === s.id ? 'animate-spin' : ''}`} />
                  <span>{findingSagraId === s.id ? 'Cerco...' : '🔍 Auto-Locandina'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openEditor(s)}
                  className="px-3 py-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modifica</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(s)}
                  className="px-3 py-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Elimina</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

