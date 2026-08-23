/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Place, CommunityMessage, ChecklistItem, Deadline, VehicleDimensions, PlaceCategory } from './types';
import {
  INITIAL_PLACES,
  INITIAL_COMMUNITY_MESSAGES,
  DEFAULT_CHECKLIST,
  INITIAL_DEADLINES,
  INITIAL_VEHICLE_DIMENSIONS
} from './data/mockData';

// Modular Tab Components
import MapTab from './components/MapTab';
import NavTab from './components/NavTab';
import ChecklistTab from './components/ChecklistTab';
import DeadlinesTab from './components/DeadlinesTab';
import CommunityTab from './components/CommunityTab';
import VehicleSettings from './components/VehicleSettings';
import DiaryTab from './components/DiaryTab';
import FullscreenNavigator from './components/FullscreenNavigator';
import RegistrationForm from './components/RegistrationForm';
import LoginForm from './components/LoginForm';
import AIItineraryTab from './components/AIItineraryTab';
import FavoritesTab from './components/FavoritesTab';
import FuelCardTab from './components/FuelCardTab';
import { BubbleLevelTab } from './components/BubbleLevelTab';
import { WeightCalculatorTab } from './components/WeightCalculatorTab';
import { OffGridEstimatorTab } from './components/OffGridEstimatorTab';
import { SostaLiberaToolsTab } from './components/SostaLiberaToolsTab';
import { CamperSecurityTab } from './components/CamperSecurityTab';
import { PantryShoppingTab } from './components/PantryShoppingTab';
import { MaintenanceLogTab } from './components/MaintenanceLogTab';
import { CamperLifeIcon } from './components/CamperLifeIcon';
import { HeaderGPSWeather } from './components/HeaderGPSWeather';
import { WeatherWidget } from './components/WeatherWidget';

// Icons
import {
  Map,
  Compass,
  CheckSquare,
  Calendar,
  MessageSquare,
  Settings,
  Truck,
  ShieldAlert,
  ChevronRight,
  BookOpen,
  Sliders,
  Sparkles,
  Search,
  Bell,
  Shield,
  Lock,
  X,
  Trash2,
  Check,
  MapPin,
  Database,
  Download,
  Scale,
  Globe,
  Smartphone,
  Share,
  ExternalLink,
  ArrowLeft,
  Send,
  Inbox,
  Camera,
  Image,
  Clock,
  Sun,
  Moon,
  ShoppingBag,
  Wrench,
  Heart,
  LogOut,
  Users,
  Eye,
  EyeOff,
  Fuel
} from 'lucide-react';

export default function App() {
  // --- Persistent States from LocalStorage / Defaults ---
  const [vehicleDimensions, setVehicleDimensions] = React.useState<VehicleDimensions>(() => {
    const saved = localStorage.getItem('camper_dimensions');
    return saved ? JSON.parse(saved) : INITIAL_VEHICLE_DIMENSIONS;
  });

  const [places, setPlaces] = React.useState<Place[]>(() => {
    const saved = localStorage.getItem('camper_places');
    let parsed: Place[] = [];
    if (saved) {
      try {
        const savedList: Place[] = JSON.parse(saved);
        const initialMap = new Map<string, Place>(INITIAL_PLACES.map(p => [p.id, p]));
        savedList.forEach(savedPlace => {
          initialMap.set(savedPlace.id, savedPlace);
        });
        parsed = Array.from(initialMap.values());
      } catch (e) {
        parsed = INITIAL_PLACES;
      }
    } else {
      parsed = INITIAL_PLACES;
    }
    return parsed.map((p: any) => {
      if (p.name === "Camper Service Gratis / Scarico" || p.name === "Camper service gratis/scarico" || p.name === "Camper Service Gratis/Scarico" || p.name === "Camper service gratis / scarico") {
        return { ...p, name: "Camper Service Carico/Scarico" };
      }
      return p;
    });
  });

  const [communityMessages, setCommunityMessages] = React.useState<CommunityMessage[]>(() => {
    const saved = localStorage.getItem('camper_messages');
    if (saved) {
      let parsed = JSON.parse(saved);
      // Rimuovi o aggiorna i vecchi messaggi di esempio (m1, m2, m3, m4)
      parsed = parsed.filter((m: CommunityMessage) => !['m3', 'm4'].includes(m.id));
      parsed = parsed.map((m: CommunityMessage) => {
        if (m.id === 'm1') return INITIAL_COMMUNITY_MESSAGES.find(i => i.id === 'm1') || m;
        if (m.id === 'm2') return INITIAL_COMMUNITY_MESSAGES.find(i => i.id === 'm2') || m;
        return m;
      });
      return parsed.length > 0 ? parsed : INITIAL_COMMUNITY_MESSAGES;
    }
    return INITIAL_COMMUNITY_MESSAGES;
  });

  const [checklistItems, setChecklistItems] = React.useState<ChecklistItem[]>(() => {
    const saved = localStorage.getItem('camper_checklist');
    return saved ? JSON.parse(saved) : DEFAULT_CHECKLIST;
  });

  const [deadlines, setDeadlines] = React.useState<Deadline[]>(() => {
    const saved = localStorage.getItem('camper_deadlines');
    return saved ? JSON.parse(saved) : INITIAL_DEADLINES;
  });

  // Persistent Favorites State from LocalStorage
  const [favoriteIds, setFavoriteIds] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('camper_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Keep favorites in sync with localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem('camper_favorites', JSON.stringify(favoriteIds));
    } catch (e) {
      console.error('Error saving favorites', e);
    }
  }, [favoriteIds]);

  // Focused Place ID to auto center-pan map
  const [focusedPlaceId, setFocusedPlaceId] = React.useState<string | null>(null);

  const handleToggleFavorite = (placeId: string) => {
    if (!currentUser) {
      window.dispatchEvent(new CustomEvent('show-toast', { 
        detail: { message: "🔒 Registrati o effettua il login per salvare le tue soste preferite!", duration: 4500 } 
      }));
      setActiveTab('settings_tools');
      setSettingsSubTab('login');
      return;
    }

    setFavoriteIds(prev => {
      const exists = prev.includes(placeId);
      let updated;
      if (exists) {
        updated = prev.filter(id => id !== placeId);
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: "💔 Rimossa dai preferiti!" } 
        }));
      } else {
        updated = [...prev, placeId];
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: "❤️ Aggiunta ai tuoi preferiti!" } 
        }));
      }

      // Sync favorites with Firestore for logged-in user
      fetch('/api/user/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, favorites: updated })
      }).catch(err => {
        console.error("Error syncing favorites to Firestore:", err);
      });

      return updated;
    });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setFavoriteIds([]);
    localStorage.removeItem('camper_user');
    window.dispatchEvent(new CustomEvent('show-toast', { 
      detail: { message: "👋 Arrivederci! Sconnesso con successo.", duration: 3000 } 
    }));
    setSettingsSubTab('hub');
  };

  // Active navigation tab: ONLY THREE primary sections as requested!
  const [activeTab, setActiveTab] = React.useState<'map_nav' | 'diary' | 'settings_tools'>('map_nav');
  
  // Sub-tabs for Map & Navigator
  const [mapNavSubTab, setMapNavSubTab] = React.useState<'map' | 'nav'>('map');
  
  // Sub-tabs for Settings, Chat, Checklist & Deadlines
  const [settingsSubTab, setSettingsSubTab] = React.useState<'hub' | 'dimensions' | 'community' | 'checklist' | 'deadlines' | 'install' | 'feedback' | 'registration' | 'login' | 'ai_itinerary' | 'bubble_level' | 'weight_calculator' | 'offgrid_estimator' | 'pantry_shopping' | 'maintenance_log' | 'favorites' | 'fuel_card' | 'copyright' | 'sosta_libera_tools' | 'camper_security'>('hub');

  const [showGPSWeatherModal, setShowGPSWeatherModal] = React.useState<boolean>(false);

  // --- PWA Installation Status States ---
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isInstallable, setIsInstallable] = React.useState<boolean>(false);
  const [isInstalled, setIsInstalled] = React.useState<boolean>(false);
  const [isInIframe, setIsInIframe] = React.useState<boolean>(false);

  React.useEffect(() => {
    setIsInIframe(window.self !== window.top);

    const handleBeforeInstall = (e: any) => {
      // Prevent chrome from showing standard install banner
      e.preventDefault();
      // Store event
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Initial check
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback message if trigged manually but standard prompt doesn't exist
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { message: "Su iOS Safari, clicca sul pulsante 'Condividi' in basso e seleziona 'Aggiungi alla schermata Home'!" }
        }));
      } else {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { message: "Usa il menu del browser (i tre puntini in alto a destra) e clicca su 'Installa' o 'Aggiungi a schermata home' per scaricare CamperLife!" }
        }));
      }
      return;
    }
    // Show prompt
    deferredPrompt.prompt();
    // Wait response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Install prompt outcome: ${outcome}`);
    // Clear prompt
    setDeferredPrompt(null);
    setIsInstallable(false);
  };
  
  // Destination selected from the map to populate the driving router
  const [navDestination, setNavDestination] = React.useState<Place | null>(() => {
    return INITIAL_PLACES[0]; // Lakeview Garda as initial anchor
  });

  // Immersive Fullscreen Navigation Active
  const [isFullscreenNav, setIsFullscreenNav] = React.useState<boolean>(false);
  const [toolsCategory, setToolsCategory] = React.useState<'all' | 'safety' | 'planning' | 'camping' | 'community'>('all');

  // --- ADMIN MODERATION STATES ---
  const [showAdminPanel, setShowAdminPanel] = React.useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = React.useState(false);
  const [adminPassword, setAdminPassword] = React.useState('');
  const [showAdminPassword, setShowAdminPassword] = React.useState(false);
  const [pendingPlaces, setPendingPlaces] = React.useState<Place[]>([]);
  const [adminSubTab, setAdminSubTab] = React.useState<'pending' | 'osm' | 'feedback' | 'users'>('pending');
  const [feedbacks, setFeedbacks] = React.useState<any[]>([]);
  const [adminReplies, setAdminReplies] = React.useState<{[key: string]: string}>({});
  const [adminUsers, setAdminUsers] = React.useState<any[]>([]);
  const [adminUsersSearch, setAdminUsersSearch] = React.useState('');
  const [adminUsersLoading, setAdminUsersLoading] = React.useState(false);
  const [selectedUserEmailForProposals, setSelectedUserEmailForProposals] = React.useState<string | null>(null);
  const [userProposals, setUserProposals] = React.useState<any[]>([]);
  const [userProposalsLoading, setUserProposalsLoading] = React.useState(false);
  const [showUserProposalsModal, setShowUserProposalsModal] = React.useState(false);

  // --- USER FEEDBACK STATES ---
  const [feedbackName, setFeedbackName] = React.useState('');
  const [feedbackCategory, setFeedbackCategory] = React.useState<'suggerimento' | 'segnalazione' | 'altro'>('suggerimento');
  const [feedbackMessage, setFeedbackMessage] = React.useState('');
  const [feedbackPhoto, setFeedbackPhoto] = React.useState<string | null>(null);
  const [fullImageModal, setFullImageModal] = React.useState<string | null>(null);
  const [feedbackIsSending, setFeedbackIsSending] = React.useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = React.useState(false);
  const [userFeedbacks, setUserFeedbacks] = React.useState<any[]>([]);
  
  // Real user authentication states
  const [currentUser, setCurrentUser] = React.useState<{ nickname: string; email: string; name: string } | null>(() => {
    try {
      const saved = localStorage.getItem('camper_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [isRegistered, setIsRegistered] = React.useState<boolean>(() => {
    try {
      if (localStorage.getItem('camper_user')) return true;
      return localStorage.getItem('camper_is_registered') === 'true';
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    if (settingsSubTab === 'feedback') {
      const loadUserFeedbacksList = async () => {
        try {
          const res = await fetch('/api/admin/feedbacks');
          if (res.ok) {
            const data = await res.json();
            setUserFeedbacks(data);
          }
        } catch (err) {
          console.error("Error fetching feedbacks for user:", err);
        }
      };
      loadUserFeedbacksList();
    }
  }, [settingsSubTab]);

  // --- ADMIN OSM IMPORT STATES ---
  const [osmImportRadius, setOsmImportRadius] = React.useState<number>(15);
  const [osmIsImporting, setOsmIsImporting] = React.useState<boolean>(false);
  const [osmImportSuccessCount, setOsmImportSuccessCount] = React.useState<number | null>(null);
  const [osmImportError, setOsmImportError] = React.useState<string | null>(null);
  const [osmCenterLat, setOsmCenterLat] = React.useState<number>(41.9028); // Roma center
  const [osmCenterLng, setOsmCenterLng] = React.useState<number>(12.4964);

  // --- Toast/Notification State ---
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [hasActiveTrip, setHasActiveTrip] = React.useState<boolean>(() => {
    const saved = localStorage.getItem('camper_trips');
    if (saved) {
      const trips = JSON.parse(saved);
      return trips.some((t: any) => t.status === 'Attivo');
    }
    return false;
  });

  React.useEffect(() => {
    const handleToastEvent = (e: any) => {
      if (e.detail && e.detail.message) {
        setToastMessage(e.detail.message);
      }
    };
    const handleTripStatusEvent = (e: any) => {
      if (e.detail && typeof e.detail.hasActiveTrip === 'boolean') {
        setHasActiveTrip(e.detail.hasActiveTrip);
      }
    };
    window.addEventListener('show-toast', handleToastEvent);
    window.addEventListener('trip-status-changed', handleTripStatusEvent);
    return () => {
      window.removeEventListener('show-toast', handleToastEvent);
      window.removeEventListener('trip-status-changed', handleTripStatusEvent);
    };
  }, []);

  React.useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => {
        setToastMessage(null);
      }, 4500);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // --- ADMIN MODERATION HANDLERS ---
  const handleAdminLogin = () => {
    if (adminPassword === 'admin') {
      setIsAdminLoggedIn(true);
      fetchPendingPlaces();
      fetchAdminUsers();
    } else {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: `❌ Accesso Negato: Password di amministrazione non valida.` }
      }));
    }
  };

  const fetchPendingPlaces = async () => {
    try {
      const res = await fetch('/api/admin/pending-places');
      if (res.ok) {
        const data = await res.json();
        setPendingPlaces(data);
      }
    } catch (err) {
      console.error("Fetch pending error:", err);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch('/api/admin/feedbacks');
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data);
      }
    } catch (err) {
      console.error("Fetch feedbacks error:", err);
    }
  };

  const fetchAdminUsers = async () => {
    setAdminUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data);
      }
    } catch (err) {
      console.error("Fetch admin users error:", err);
    } finally {
      setAdminUsersLoading(false);
    }
  };

  const fetchUserProposals = async (email: string) => {
    setSelectedUserEmailForProposals(email);
    setUserProposalsLoading(true);
    setShowUserProposalsModal(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}/proposals`);
      if (res.ok) {
        const data = await res.json();
        setUserProposals(data);
      } else {
        setUserProposals([]);
      }
    } catch (err) {
      console.error("Fetch user proposals error:", err);
      setUserProposals([]);
    } finally {
      setUserProposalsLoading(false);
    }
  };

  const handleDeleteAdminUser = async (email: string) => {
    if (!confirm(`Sei sicuro di voler eliminare definitivamente l'utente ${email}? Questa azione non è reversibile.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { message: `Utente rimosso con successo.` }
        }));
        fetchAdminUsers();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Errore durante l\'eliminazione.');
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      alert('Impossibile rimuovere l\'utente in questo momento.');
    }
  };

  const handleReplyFeedback = async (id: string) => {
    const replyText = adminReplies[id];
    if (!replyText || !replyText.trim()) return;
    try {
      const res = await fetch('/api/admin/reply-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, reply: replyText }),
      });
      if (res.ok) {
        // Refresh & show toast
        fetchFeedbacks();
        setAdminReplies(prev => ({ ...prev, [id]: '' }));
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { message: 'Risposta inviata all\'utente! ✓' }
        }));
      } else {
        const errData = await res.json();
        alert(errData.error || 'Errore durante la risposta.');
      }
    } catch (err) {
      console.error("Error replying to feedback:", err);
    }
  };

  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleImportFromOSM = async (lat: number, lng: number, radiusKm: number) => {
    setOsmIsImporting(true);
    setOsmImportError(null);
    setOsmImportSuccessCount(null);
    try {
      const radiusMeters = radiusKm * 1000;
      
      const query = `[out:json][timeout:60];
(
  node["tourism"="camp_site"](around:${radiusMeters},${lat},${lng});
  way["tourism"="camp_site"](around:${radiusMeters},${lat},${lng});
  
  node["caravan_site"="regional"](around:${radiusMeters},${lat},${lng});
  node["tourism"="caravan_site"](around:${radiusMeters},${lat},${lng});
  node["caravan_site"](around:${radiusMeters},${lat},${lng});
  
  node["amenity"="sanitary_dump_station"](around:${radiusMeters},${lat},${lng});
);
out center;`;

      const response = await fetch('/api/overpass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: query })
      });
      
      if (!response.ok) {
        throw new Error(`Errore dal server Overpass OpenStreetMap. Per favore riprova.`);
      }
      
      let result;
      try {
        result = await response.json();
      } catch (jsonErr) {
        throw new Error("Il server Overpass non ha restituito una risposta JSON valida.");
      }
      if (!result.elements || result.elements.length === 0) {
        setOsmImportSuccessCount(0);
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { message: `ℹ️ Nessun punto sosta o camper service aggiuntivo trovato in questa zona su OpenStreetMap.` }
        }));
        return;
      }
      
      const importedPlaces: Place[] = [];
      
      for (const el of result.elements) {
        // Lat and Lng
        let elLat = el.lat;
        let elLng = el.lon;
        if (el.type === 'way' && el.center) {
          elLat = el.center.lat;
          elLng = el.center.lon;
        }
        
        if (!elLat || !elLng) continue;
        
        // Skip duplicate places
        const isDuplicate = places.some(p => {
          if (p.id === `osm-${el.id}`) return true;
          const d = getDistanceKm(p.lat, p.lng, elLat, elLng);
          return d < 0.055; // 55 meters proximity
        });
        
        if (isDuplicate) continue;
        
        const tags = el.tags || {};
        
        // Name mapping
        let name = tags.name || tags.operator || tags.brand || tags.description;
        if (!name) {
          if (tags.tourism === 'camp_site') name = "Campeggio / Area Campismo";
          else if (tags.amenity === 'sanitary_dump_station') name = "Camper Service Carico/Scarico";
          else if (tags.tourism === 'caravan_site' || tags.caravan_site === 'regional') name = "Area Sosta Camper OSM";
          else name = "Sosta Camper / Parcheggio";
        }
        
        // Category mapping
        let category: Place['category'] = 'area_sosta';
        if (tags.amenity === 'sanitary_dump_station') {
          category = 'camper_service';
        } else if (tags.tourism === 'camp_site') {
          category = 'campeggio';
        }
        
        // Address mapping
        const city = tags["addr:city"] || "";
        const street = tags["addr:street"] || "";
        const houseNo = tags["addr:housenumber"] || "";
        let addressStr = [street, houseNo, city].filter(Boolean).join(', ');
        if (!addressStr) {
          addressStr = `Osm Rif: ${el.id} (Coordinata: ${elLat.toFixed(4)}, ${elLng.toFixed(4)})`;
        }
        
        // Price mapping
        let priceStr = "In loco / Da verificare";
        let priceNum = 15;
        if (tags.fee === 'no') {
          priceStr = "Gratuito";
          priceNum = 0;
        } else if (tags.charge) {
          priceStr = tags.charge;
          const matchVal = tags.charge.match(/\d+([.,]\d+)?/);
          if (matchVal) {
            priceNum = parseFloat(matchVal[0].replace(',', '.'));
          }
        } else if (category === 'camper_service') {
          priceStr = "Gratuito";
          priceNum = 0;
        }
        
        // Facilities mapping
        const facilitiesList: string[] = ['Carico acqua', 'Scarico reflui'];
        if (tags.power_supply === 'yes' || tags.electricity === 'yes' || tags["power_supply:camper"] === 'yes' || tags["power_supply:caravan"] === 'yes') {
          facilitiesList.push('Elettricità 220V');
        }
        if (tags.internet_access === 'yes' || tags.wifi === 'yes' || tags["internet_access:free"] === 'yes') {
          facilitiesList.push('Wi-Fi gratuito');
        }
        if (tags.dogs === 'yes' || tags.pets === 'yes') {
          facilitiesList.push('Animali ammessi');
        }
        if (tags.shower === 'yes' || tags.toilets === 'yes' || tags.heating === 'yes') {
          facilitiesList.push('Bagni riscaldati');
        }
        
        // Height / Weight constraints
        let maxHeightVal: number | undefined = undefined;
        let hasMaxHeightLim = false;
        if (tags.maxheight) {
          const val = parseFloat(tags.maxheight.replace('m', ''));
          if (!isNaN(val)) {
            maxHeightVal = val;
            hasMaxHeightLim = true;
          }
        }
        
        let maxWeightVal: number | undefined = undefined;
        let hasMaxWeightLim = false;
        if (tags.maxweight) {
          const val = parseFloat(tags.maxweight.replace('t', ''));
          if (!isNaN(val)) {
            maxWeightVal = val;
            hasMaxWeightLim = true;
          }
        }
        
        const isNarrowAcc = tags.narrow === 'yes' || tags.narrow_road === 'yes';
        
        // Cover photos deterministically matching place categories
        let pictureUrl = 'https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600';
        if (category === 'campeggio') {
          pictureUrl = 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=600';
        } else if (category === 'camper_service') {
          pictureUrl = 'https://images.unsplash.com/photo-1596524430615-b46475ddff6e?auto=format&fit=crop&q=80&w=600';
        }
        
        importedPlaces.push({
          id: `osm-${el.id}`,
          name,
          category,
          lat: elLat,
          lng: elLng,
          address: addressStr,
          priceInfo: priceStr,
          priceEuro: priceNum,
          rating: 4.1 + Math.random() * 0.8,
          facilities: facilitiesList,
          imageUrl: pictureUrl,
          source: 'osm',
          phone: tags.phone || tags["contact:phone"] || undefined,
          hasMaxHeightLimit: hasMaxHeightLim,
          maxHeight: maxHeightVal,
          hasMaxWeightLimit: hasMaxWeightLim,
          maxWeight: maxWeightVal,
          isNarrowAccess: isNarrowAcc,
          reviews: [
            {
              id: `rev-osm-${el.id}-1`,
              user: "Community OpenStreetMap",
              date: new Date().toISOString().split('T')[0],
              rating: 4,
              comment: `Struttura camper importata via OpenStreetMap (ID: ${el.id}). Ricorda di inviare valutazioni aggiornate se visiti il posto!`,
              vehicleType: "Qualsiasi camper"
            }
          ]
        });
      }
      
      if (importedPlaces.length === 0) {
        setOsmImportSuccessCount(0);
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { message: `ℹ️ Tutti i punti OSM rilevati in questa zona sono già presenti nel tuo archivio.` }
        }));
      } else {
        const mergedList = [...places, ...importedPlaces];
        setPlaces(mergedList);
        localStorage.setItem('camper_places', JSON.stringify(mergedList));
        setOsmImportSuccessCount(importedPlaces.length);
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { message: `🎉 Importati con successo ${importedPlaces.length} nuovi punti sosta da OSM!` }
        }));
      }
    } catch (err: any) {
      setOsmImportError(err.message || 'Errore di connessione col server Overpass.');
    } finally {
      setOsmIsImporting(false);
    }
  };

  const handleApprovePlace = async (id: string) => {
    try {
      const res = await fetch('/api/admin/approve-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { message: `🎉 Punto sosta approvato con successo! È ora condiviso con tutti sulla mappa.` }
        }));
        fetchPendingPlaces();
        refreshPublicPlaces();
      } else {
        throw new Error("Errore sul server.");
      }
    } catch (err: any) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: `❌ Impossibile approvare: ${err.message}` }
      }));
    }
  };

  const handleRejectPlace = async (id: string) => {
    try {
      const res = await fetch('/api/admin/reject-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { message: `🗑️ Punto sosta rifiutato ed eliminato con successo.` }
        }));
        fetchPendingPlaces();
      } else {
        throw new Error("Errore sul server.");
      }
    } catch (err: any) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: `❌ Impossibile eliminare: ${err.message}` }
      }));
    }
  };

  const refreshPublicPlaces = async () => {
    try {
      const res = await fetch('/api/public-places');
      if (res.ok) {
        const approvedPlaces = await res.json();
        setPlaces(prevPlaces => {
          const basePlaces = prevPlaces.filter(p => !p.id.startsWith('user_place_'));
          const merged = [...basePlaces, ...approvedPlaces];
          localStorage.setItem('camper_places', JSON.stringify(merged));
          return merged;
        });
      }
    } catch (err) {
      console.error("Refresh public places error:", err);
    }
  };

  const fetchCommunityMessages = async () => {
    try {
      const res = await fetch('/api/community-messages');
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setCommunityMessages(data);
          localStorage.setItem('camper_messages', JSON.stringify(data));
        }
      }
    } catch (err) {
      console.error("Error loading live community chat:", err);
    }
  };

  const handleCommunityChange = async (newMessages: CommunityMessage[]) => {
    // 1. Instantly update UI locally for fluid UX (Optimistic Update)
    setCommunityMessages(newMessages);
    localStorage.setItem('camper_messages', JSON.stringify(newMessages));

    // 2. Synchronise change events directly with Firestore DB
    try {
      if (newMessages.length > communityMessages.length) {
        // A new chat post was created
        const addedMsg = newMessages[0];
        await fetch('/api/community-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(addedMsg)
        });
      } else if (newMessages.length === communityMessages.length) {
        // Look for likes or thread response update
        for (let i = 0; i < newMessages.length; i++) {
          const oldMsg = communityMessages.find(m => m.id === newMessages[i].id);
          const newMsg = newMessages[i];
          if (!oldMsg) continue;

          if (oldMsg.likes !== newMsg.likes) {
            await fetch('/api/community-messages/like', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: newMsg.id, likes: newMsg.likes })
            });
            break;
          }

          const oldReplies = oldMsg.replies || [];
          const newReplies = newMsg.replies || [];
          if (newReplies.length > oldReplies.length) {
            const addedReply = newReplies[newReplies.length - 1];
            await fetch('/api/community-messages/reply', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: newMsg.id, reply: addedReply })
            });
            break;
          }
        }
      }
    } catch (err) {
      console.error("Failed to sync community messaging event with Firestore:", err);
    }
  };

  // Setup periodic sync interval to keep stopping points and community chat fully synchronized in real-time
  React.useEffect(() => {
    refreshPublicPlaces();
    fetchCommunityMessages();

    const interval = setInterval(() => {
      refreshPublicPlaces();
      fetchCommunityMessages();
    }, 15000); // Poll Firestore updates very gently every 15 seconds

    return () => clearInterval(interval);
  }, []);

  // --- Dark Mode State ---
  const [isDarkMode, setIsDarkMode] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('camper_dark_mode');
      return saved === 'true';
    }
    return false;
  });

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('camper_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  // --- GPS / Real Geolocation States ---
  const [userLocation, setUserLocation] = React.useState<{ lat: number; lng: number } | null>(null);
  const [userAccuracy, setUserAccuracy] = React.useState<number | null>(null);
  const [isGPSEnabled, setIsGPSEnabled] = React.useState<boolean>(false);

  const handleRequestSingleGPS = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          window.dispatchEvent(new CustomEvent('show-toast', { 
            detail: { message: "✅ Posizione rilevata con successo! Meteo GPS caricato." } 
          }));
        },
        (error) => {
          console.error("GPS fetch error: ", error);
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

  // Watch GPS Position of device
  React.useEffect(() => {
    let watchId: number | null = null;
    if (isGPSEnabled && typeof window !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setUserAccuracy(position.coords.accuracy);
        },
        (error) => {
          console.error("GPS Watch error: ", error);
          window.dispatchEvent(new CustomEvent('show-toast', { 
            detail: { message: "⚠️ Segnale GPS non disponibile. Verifica i permessi di localizzazione sul tuo smartphone." }
          }));
          setIsGPSEnabled(false);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    } else {
      setUserLocation(null);
      setUserAccuracy(null);
    }
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isGPSEnabled]);

  // Attiva automaticamente il GPS quando si entra nella scheda "mappa & navigatore", e lo disattiva nelle altre per risparmiare batteria
  React.useEffect(() => {
    if (activeTab === 'map_nav') {
      setIsGPSEnabled(true);
    } else {
      setIsGPSEnabled(false);
    }
  }, [activeTab]);

  // --- Sync States with LocalStorage on Change ---
  React.useEffect(() => {
    fetch('/api/public-places')
      .then(res => {
        if (!res.ok) throw new Error("Network response error");
        return res.json();
      })
      .then((serverPlaces: Place[]) => {
        if (Array.isArray(serverPlaces)) {
          setPlaces(prevPlaces => {
            // Rimuove i vecchi punti "user_place_" salvati in locale per evitare duplicati
            // e integra i punti approvati aggiornati e sincronizzati provenienti dal server.
            const basePlaces = prevPlaces.filter(p => !p.id.startsWith('user_place_'));
            return [...basePlaces, ...serverPlaces];
          });
        }
      })
      .catch(err => {
        console.warn("Impossibile caricare i punti pubblici condivisi (funzionamento offline attivo):", err);
      });
  }, []);

  React.useEffect(() => {
    localStorage.setItem('camper_dimensions', JSON.stringify(vehicleDimensions));
  }, [vehicleDimensions]);

  React.useEffect(() => {
    localStorage.setItem('camper_places', JSON.stringify(places));
  }, [places]);

  React.useEffect(() => {
    localStorage.setItem('camper_messages', JSON.stringify(communityMessages));
  }, [communityMessages]);

  React.useEffect(() => {
    localStorage.setItem('camper_checklist', JSON.stringify(checklistItems));
  }, [checklistItems]);

  React.useEffect(() => {
    localStorage.setItem('camper_deadlines', JSON.stringify(deadlines));
  }, [deadlines]);

  // Utility to handle selecting route from map or cards
  const handleSelectRouteFromMap = (startLat: number, startLng: number, dest: Place) => {
    setNavDestination(dest);
    setActiveTab('map_nav'); // Swap to Mappa & Guida main tab
    setMapNavSubTab('nav');  // Swap internally to Navigatore HUD
    setIsFullscreenNav(true);
  };

  const handleSelectPlaceDirectly = (place: Place) => {
    setNavDestination(place);
  };

  // Safe checks for deadlines and checklists for header alerts count
  const pendingDeadlines = deadlines.filter(d => !d.done);
  const urgentDeadlinesCount = pendingDeadlines.filter(d => {
    const today = new Date('2026-06-15');
    const due = new Date(d.dueDate);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff <= 30;
  }).length;

  const incompleteChecklistCount = checklistItems.filter(i => !i.checked).length;
  const totalWarnings = incompleteChecklistCount + urgentDeadlinesCount;

  return (
    <div id="root-container" className="min-h-screen bg-[#D1CDBF] flex flex-col font-sans text-[#2D2926] selection:bg-[#5A6B4E]/30 selection:text-[#2D2926] pb-[50px] md:pb-0">
      
      {/* Top Warning Banner if any safety checkpoints are uncompleted */}
      {incompleteChecklistCount > 0 && (
        <div className="bg-[#A45C40] text-white font-bold px-3 py-2 md:py-3 text-center text-[11px] min-[375px]:text-xs sm:text-sm md:text-base flex gap-1.5 sm:gap-2.5 items-center justify-center border-b border-[#A45C40]/20 active:opacity-90 shadow-sm sticky top-0 z-40">
          <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0 animate-pulse" />
          <span className="leading-tight">Attenzione: {incompleteChecklistCount} controlli di sicurezza mancanti!</span>
          <button 
            onClick={() => {
              setActiveTab('settings_tools');
              setSettingsSubTab('checklist');
            }} 
            className="underline hover:text-orange-100 transition-colors ml-1 sm:ml-2 font-black shrink-0 cursor-pointer text-[10px] min-[375px]:text-[11px] sm:text-xs md:text-sm"
          >
            Controlla →
          </button>
        </div>
      )}

      {/* Main Bar Navigation Header - Compact responsiveness with sticky top */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#3E4A35]/10 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 md:py-2 flex flex-row justify-between items-center gap-2">
          
          {/* Logo Brand */}
          <div 
            className="flex items-center gap-1.5 sm:gap-3 cursor-pointer select-none shrink-0"
            onClick={() => {
              setActiveTab('map_nav');
              setMapNavSubTab('map');
            }}
          >
            <div className="text-[#3E4A35] transition-all hover:scale-105 duration-300 drop-shadow-sm shrink-0 flex items-center justify-center">
              <img 
                src="/logo.svg" 
                alt="CamperLife Logo" 
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-xl" 
              />
            </div>
            <div className="shrink-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-xl font-black text-[#2D2926] tracking-tight font-sans">Camper Life It</h1>
              </div>
              <p className="text-[10px] text-[#2D2926]/75 hidden sm:block">Mappe sosta, navigatore sagomato & community</p>
            </div>
          </div>

          {/* Header GPS Weather Widget */}
          <HeaderGPSWeather 
            lat={userLocation ? userLocation.lat : null}
            lng={userLocation ? userLocation.lng : null}
            onClick={() => setShowGPSWeatherModal(true)}
            onRequestGPS={handleRequestSingleGPS}
          />

          {/* Dark Mode Theme Toggle */}
          <button
            onClick={() => {
              setIsDarkMode(!isDarkMode);
              window.dispatchEvent(new CustomEvent('show-toast', { 
                detail: { message: !isDarkMode ? "🌙 Vista Notturna attiva! Mappe e pannelli impostati sul tramonto." : "☀️ Vista Diurna ripristinata!" } 
              }));
            }}
            className="p-1.5 sm:p-2 bg-[#F4F6F0] hover:bg-[#E7EBDC] text-[#3E4A35] rounded-xl border border-[#3E4A35]/15 transition-all cursor-pointer shadow-xs shrink-0 active:scale-95 flex items-center justify-center relative group"
            title={isDarkMode ? "Passa a Vista Giorno" : "Passa a Vista Notturna"}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-500 animate-[spin_15s_linear_infinite]" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 group-hover:text-amber-600 transition-colors" />
            )}
            <span className="sr-only">Tema</span>
          </button>

          {/* Quick Active vehicle summary panel */}
          <div className="flex items-center gap-1 sm:gap-2 bg-[#D1CDBF]/50 backdrop-blur-xs py-1 px-1.5 sm:px-3 rounded-xl border border-[#3E4A35]/10 shrink-0">
            <button 
              onClick={() => {
                setActiveTab('settings_tools');
                setSettingsSubTab('dimensions');
              }}
              className="text-left group flex items-center gap-1 sm:gap-2"
            >
              <div className="p-1 bg-white rounded-lg border border-[#3E4A35]/10 group-hover:bg-[#D1CDBF] transition-colors hidden sm:block shrink-0">
                <Truck className="w-4 h-4 text-[#5A6B4E]" />
              </div>
              <div className="max-w-[70px] sm:max-w-[140px] truncate">
                <div className="text-[7px] sm:text-[8px] font-bold text-[#2D2926]/60 uppercase tracking-wider leading-none">Mezzo</div>
                <div className="text-[10px] sm:text-xs font-bold text-[#2D2926] group-hover:text-[#3E4A35] transition-colors truncate">
                  {vehicleDimensions.modelName}
                </div>
              </div>
            </button>
            <ChevronRight className="w-3 h-3 text-[#2D2926]/30 hidden md:block shrink-0" />
            
            {/* Quick action button to edit profile properties */}
            <button
              onClick={() => {
                setActiveTab('settings_tools');
                setSettingsSubTab('dimensions');
              }}
              className="p-1 text-[#2D2926]/60 hover:text-[#3E4A35] hover:bg-[#D1CDBF] rounded-lg transition-all cursor-pointer hidden sm:block shrink-0"
              title="Dimensioni camper"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Controls Navigation Rail - DESKTOP ONLY (Matches exactly the three request icons) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 hidden md:block border-t border-[#3E4A35]/5">
          <nav className="flex space-x-2 py-2">
            <button
              onClick={() => { setActiveTab('map_nav'); setMapNavSubTab('map'); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'map_nav'
                  ? 'bg-[#3E4A35] text-white shadow-md'
                  : 'text-[#2D2926]/70 hover:bg-[#3E4A35]/10 hover:text-[#2D2926]'
              }`}
            >
              <Compass className="w-4 h-4" />
              1. Mappa & Navigatore
            </button>

            <button
              onClick={() => setActiveTab('diary')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'diary'
                  ? 'bg-[#3E4A35] text-white shadow-md'
                  : 'text-[#2D2926]/70 hover:bg-[#3E4A35]/10 hover:text-[#2D2926]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              2. Diario di Viaggio
            </button>

            <button
              onClick={() => { setActiveTab('settings_tools'); setSettingsSubTab('hub'); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap relative ${
                activeTab === 'settings_tools'
                  ? 'bg-[#3E4A35] text-white shadow-md'
                  : 'text-[#2D2926]/70 hover:bg-[#3E4A35]/10'
              }`}
            >
              <Sliders className="w-4 h-4" />
              3. Impostazioni & Strumenti
              {totalWarnings > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#A45C40] text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border border-white">
                  {totalWarnings}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Work Area Container */}
      <main id="main-content" className={`flex-1 max-w-7xl w-full mx-auto md:px-8 ${
        activeTab === 'map_nav' ? 'px-2 pt-1.5 pb-1 md:pt-4 md:pb-4' : 'px-4 sm:px-6 lg:px-8 pt-4 pb-2 md:pb-4'
      }`}>
        
        {/* Render Category 1: Mappa & Navigatore with sub segmentation */}
        {activeTab === 'map_nav' && (
          <div className="space-y-2 md:space-y-4 h-full flex flex-col">
            <MapTab
              places={places}
              onPlacesChange={setPlaces}
              vehicleDimensions={vehicleDimensions}
              onSelectRoute={handleSelectRouteFromMap}
              onNavigateFullscreen={(place) => {
                setNavDestination(place);
                setIsFullscreenNav(true);
                setIsGPSEnabled(true);
              }}
              userLocation={userLocation}
              userAccuracy={userAccuracy}
              isGPSEnabled={isGPSEnabled}
              onGPSEnabledChange={setIsGPSEnabled}
              hasSafetyBanner={incompleteChecklistCount > 0}
              isAdmin={isAdminLoggedIn}
              favoriteIds={favoriteIds}
              onToggleFavorite={handleToggleFavorite}
              focusedPlaceId={focusedPlaceId}
              onClearFocusedPlaceId={() => setFocusedPlaceId(null)}
              currentUser={currentUser}
              onRedirectToLogin={() => {
                setActiveTab('settings_tools');
                setSettingsSubTab('login');
              }}
            />
          </div>
        )}

        {/* Render Category 2: Diario di Viaggio */}
        {activeTab === 'diary' && (
          <DiaryTab currentUser={currentUser} />
        )}

        {/* Render Category 3: Impostazioni holding vehicle dimensions, chat, checklist, deadlines */}
        {activeTab === 'settings_tools' && (
          <div className="space-y-6">
            
            {settingsSubTab === 'hub' ? (
              <div className="space-y-6">
                {/* Clean introductory tile with bento flavor */}
                <div className="bg-gradient-to-br from-[#3E4A35] to-[#5A6B4E] rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
                  <div className="relative z-10 space-y-2">
                    <span className="text-[10px] uppercase font-black tracking-widest bg-white/20 px-2.5 py-1 rounded-full text-white">
                      Pannello Strumenti di Bordo
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">Gestione & Configurazione Camper</h2>
                    <p className="text-xs text-white/80 max-w-xl leading-relaxed">
                      Monitora lo stato di manutenzione, gestisci le dimensioni per il navigatore sagomato, controlla la sicurezza pre-partenza e rimani in contatto con la community.
                    </p>
                  </div>
                  <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                    <Sliders className="w-48 h-48" />
                  </div>
                </div>

                {/* Category Quick Filter Pills */}
                <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/50">
                  <button
                    onClick={() => setToolsCategory('all')}
                    className={`flex-1 min-w-[100px] text-center py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                      toolsCategory === 'all'
                        ? 'bg-[#3E4A35] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    🎛️ Tutti
                  </button>
                  <button
                    onClick={() => setToolsCategory('safety')}
                    className={`flex-1 min-w-[100px] text-center py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                      toolsCategory === 'safety'
                        ? 'bg-[#3E4A35] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    🛡️ Sicurezza
                  </button>
                  <button
                    onClick={() => setToolsCategory('planning')}
                    className={`flex-1 min-w-[100px] text-center py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                      toolsCategory === 'planning'
                        ? 'bg-[#3E4A35] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    🗺️ Itinerario & Cambusa
                  </button>
                  <button
                    onClick={() => setToolsCategory('camping')}
                    className={`flex-1 min-w-[100px] text-center py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                      toolsCategory === 'camping'
                        ? 'bg-[#3E4A35] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    🏕️ Sosta & Bordo
                  </button>
                  <button
                    onClick={() => setToolsCategory('community')}
                    className={`flex-1 min-w-[100px] text-center py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                      toolsCategory === 'community'
                        ? 'bg-[#3E4A35] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    👥 Community & App
                  </button>
                </div>

                {/* High-density, elegant Grouped List Layout instead of massive dispersive Bento Grid */}
                <div className="space-y-4.5">
                  {/* Category 1: Safety & Vehicle */}
                  {(toolsCategory === 'all' || toolsCategory === 'safety') && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700 shadow-xs overflow-hidden">
                      <div className="bg-slate-50/70 dark:bg-slate-700/50 border-b border-rose-50 dark:border-slate-700 px-4.5 py-2.5 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-[#3E4A35]/80 dark:text-slate-300 tracking-widest flex items-center gap-1.5">
                          🛡️ Sicurezza & Controllo Veicolo
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold bg-slate-200/40 dark:bg-slate-600 px-2 py-0.5 rounded-full">
                          {vehicleDimensions.height ? `${vehicleDimensions.height}m Altezza` : 'Sagoma'}
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {/* 1. Dati & Sagoma Camper */}
                        <div
                          onClick={() => setSettingsSubTab('dimensions')}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-all group active:scale-[0.995]"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                            <div className="p-2.5 rounded-xl shrink-0 bg-[#3E4A35]/15 text-[#3E4A35] border border-[#3E4A35]/5 group-hover:scale-105 transition-transform">
                              <Truck className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-[#3E4A35]/90 text-sm tracking-tight leading-tight group-hover:text-[#3E4A35] transition-colors">
                                Misure & Sagoma Camper
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                Altezza, larghezza, peso e lunghezza per ponti e restrizioni.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="bg-[#5A6B4E]/10 text-[#3E4A35] px-2 py-0.5 rounded-md font-extrabold text-[10px] hidden sm:inline-block">
                              {vehicleDimensions.modelName || 'Vuoto'} ({vehicleDimensions.height}m)
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#3E4A35] group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {/* 2. Checklist di Sicurezza */}
                        <div
                          onClick={() => setSettingsSubTab('checklist')}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-all group active:scale-[0.995]"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                            <div className="p-2.5 rounded-xl shrink-0 bg-emerald-50 text-emerald-800 border border-emerald-100 group-hover:scale-105 transition-transform">
                              <CheckSquare className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-[#3E4A35]/90 text-sm tracking-tight leading-tight group-hover:text-[#3E4A35] transition-colors">
                                Checklist Pre-Partenza
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                Controlli rigorosi (valvole, finestre sollevate, bombole) prima della marcia.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            {incompleteChecklistCount > 0 ? (
                              <span className="text-[#A45C40] bg-[#A45C40]/10 px-2 py-0.5 rounded-md font-extrabold text-[10px] hidden sm:inline-block">
                                ⚠️ {incompleteChecklistCount} mancanti
                              </span>
                            ) : (
                              <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-extrabold text-[10px] hidden sm:inline-block">
                                ✅ Pronto
                              </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#3E4A35] group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {/* 3. Scadenziere Camper */}
                        <div
                          onClick={() => setSettingsSubTab('deadlines')}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-all group active:scale-[0.995]"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                            <div className="p-2.5 rounded-xl shrink-0 bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-100 border border-blue-100/50 dark:border-blue-700 group-hover:scale-105 transition-transform">
                              <Calendar className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-[#3E4A35]/90 text-sm tracking-tight leading-tight group-hover:text-[#3E4A35] transition-colors">
                                Scadenziere di Bordo
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                Tagliando, bombole gas, bollo, assicurazione e scadenze impianti.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            {urgentDeadlinesCount > 0 ? (
                              <span className="text-[#A45C40] bg-[#A45C40]/10 px-2 py-0.5 rounded-md font-extrabold text-[10px] animate-pulse hidden sm:inline-block">
                                🚨 {urgentDeadlinesCount} Imminenti
                              </span>
                            ) : (
                              <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-extrabold text-[10px] hidden sm:inline-block">
                                📅 In Regola
                              </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#3E4A35] group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {/* 4. Calcolatore Carico Utile */}
                        <div
                          onClick={() => setSettingsSubTab('weight_calculator')}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-all group active:scale-[0.995]"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                            <div className="p-2.5 rounded-xl shrink-0 bg-amber-50 dark:bg-amber-900 text-amber-800 dark:text-amber-100 border border-amber-100 dark:border-amber-700 group-hover:scale-105 transition-transform">
                              <Scale className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-[#3E4A35]/90 text-sm tracking-tight leading-tight group-hover:text-[#3E4A35] transition-colors">
                                Bilanciamento & Carico Utile
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                Calcolo pesi di bagagli, acqua e passeggeri sotto i 3500 kg (Patente B).
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-extrabold text-[10px] hidden sm:inline-block">
                              Patente B
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#3E4A35] group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {/* 5. Registro di Manutenzione della Cellula */}
                        <div
                          onClick={() => setSettingsSubTab('maintenance_log')}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-all group active:scale-[0.995]"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                            <div className="p-2.5 rounded-xl shrink-0 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-100 border border-stone-200 dark:border-stone-700 group-hover:scale-105 transition-transform">
                              <Wrench className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-[#3E4A35]/90 text-sm tracking-tight leading-tight group-hover:text-[#3E4A35] transition-colors">
                                Registro Manutenzione Cellula
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                Traccia lavaggi, ispezioni infiltrazioni, bombole e sigillature.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="bg-blue-100/50 text-blue-800 px-2 py-0.5 rounded-md font-extrabold text-[10px] hidden sm:inline-block">
                              Sigillato
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#3E4A35] group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {/* Carta Carburante */}
                        <div
                          onClick={() => setSettingsSubTab('fuel_card')}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-all group active:scale-[0.995]"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                            <div className="p-2.5 rounded-xl shrink-0 bg-emerald-50 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-100 border border-emerald-100/50 dark:border-emerald-700 group-hover:scale-105 transition-transform">
                              <Fuel className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-[#3E4A35]/90 text-sm tracking-tight leading-tight group-hover:text-[#3E4A35] transition-colors">
                                Carta Carburante Sincronizzata
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                Log rifornimenti in cloud, costo totale e medie consumo.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="bg-emerald-100/50 text-emerald-800 px-2 py-0.5 rounded-md font-extrabold text-[10px] hidden sm:inline-block">
                              Cloud
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#3E4A35] group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {/* Sicurezza Attiva & Sosta Notturna */}
                        <div
                          onClick={() => setSettingsSubTab('camper_security')}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-all group active:scale-[0.995]"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                            <div className="p-2.5 rounded-xl shrink-0 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-450 border border-rose-100 dark:border-rose-900 group-hover:scale-105 transition-transform">
                              <ShieldAlert className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-[#3E4A35]/90 text-sm tracking-tight leading-tight group-hover:text-[#2D2926] transition-colors">
                                Sicurezza Attiva & Sosta Notturna
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                Valutatore rischio sosta libera, generatore SOS con GPS e sirena d'allarme.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md font-extrabold text-[10px] hidden sm:inline-block">
                              Deterrente 🛡️
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#3E4A35] group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category 2: Planning & Fridge */}
                  {(toolsCategory === 'all' || toolsCategory === 'planning') && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700 shadow-xs overflow-hidden">
                      <div className="bg-slate-50/70 dark:bg-slate-700/50 border-b border-emerald-50 dark:border-slate-700 px-4.5 py-2.5 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-[#3E4A35]/80 dark:text-slate-300 tracking-widest flex items-center gap-1.5">
                          🗺️ Pianificazione & Cambusa
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold bg-slate-200/40 dark:bg-slate-600 px-2 py-0.5 rounded-full">
                          {favoriteIds.length} Salvati
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {/* 6. Generatore Itinerari AI */}
                        <div
                          onClick={() => setSettingsSubTab('ai_itinerary')}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-all group active:scale-[0.995]"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                            <div className="p-2.5 rounded-xl shrink-0 bg-emerald-50 dark:bg-emerald-900 text-emerald-850 dark:text-emerald-100 border border-emerald-100/50 dark:border-emerald-700 group-hover:scale-105 transition-transform">
                              <Sparkles className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-[#3E4A35]/90 text-sm tracking-tight leading-tight group-hover:text-[#3E4A35] transition-colors flex items-center gap-1.5">
                                Generatore Itinerari AI
                                <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black tracking-widest px-1 py-0.5 rounded uppercase">
                                  PRO
                                </span>
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                Percorsi personalizzati e aree consigliate calcolate in base alle misure.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-extrabold text-[10px] hidden sm:inline-block">
                              Smart AI 🤖
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#3E4A35] group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {/* 7. Soste Preferite */}
                        <div
                          onClick={() => setSettingsSubTab('favorites')}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-all group active:scale-[0.995]"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                            <div className="p-2.5 rounded-xl shrink-0 bg-rose-50 dark:bg-rose-900 text-rose-600 dark:text-rose-100 border border-rose-100 dark:border-rose-700 group-hover:scale-105 transition-transform">
                              <Heart className="w-5 h-5 fill-current" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-[#3E4A35]/90 text-sm tracking-tight leading-tight group-hover:text-[#3E4A35] transition-colors">
                                Soste & Aree Preferite
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                La tua selezione personale di punti sosta, campeggi e parcheggi segreti.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md font-extrabold text-[10px] hidden sm:inline-block">
                              ❤️ {favoriteIds.length} Elementi
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {/* 8. Menu Cambusa e Spesa Intelligente */}
                        <div
                          onClick={() => setSettingsSubTab('pantry_shopping')}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-all group active:scale-[0.995]"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                            <div className="p-2.5 rounded-xl shrink-0 bg-amber-50 dark:bg-amber-900 text-amber-800 dark:text-amber-100 border border-amber-100 dark:border-amber-700 group-hover:scale-105 transition-transform">
                              <ShoppingBag className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-[#3E4A35]/90 text-sm tracking-tight leading-tight group-hover:text-[#3E4A35] transition-colors">
                                Dispensa & Spesa Smart
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                Organizza i viveri a bordo, pianifica le ricette salva-risorse ed evita sprechi.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="bg-amber-100/70 text-amber-900 px-2 py-0.5 rounded-md font-extrabold text-[10px] hidden sm:inline-block">
                              Anti-Spreco
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#3E4A35] group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category 3: Life on board */}
                  {(toolsCategory === 'all' || toolsCategory === 'camping') && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700 shadow-xs overflow-hidden">
                      <div className="bg-slate-50/70 dark:bg-slate-700/50 border-b border-indigo-50 dark:border-slate-700 px-4.5 py-2.5 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-[#3E4A35]/80 dark:text-slate-300 tracking-widest flex items-center gap-1.5">
                          🏕️ Sosta & Vita a Bordo
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold bg-slate-200/40 dark:bg-slate-600 px-2 py-0.5 rounded-full">
                          Utility
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {/* 9. Autonomia Energetica e Idrica */}
                        <div
                          onClick={() => setSettingsSubTab('offgrid_estimator')}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-all group active:scale-[0.995]"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                            <div className="p-2.5 rounded-xl shrink-0 bg-emerald-50 text-emerald-800 border border-emerald-100 group-hover:scale-105 transition-transform">
                              <Sun className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-[#3E4A35]/90 text-sm tracking-tight leading-tight group-hover:text-[#3E4A35] transition-colors">
                                Autonomia Off-Grid
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                Simula riserva idrica, carica batterie e consumi energetici per la sosta in libera.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-extrabold text-[10px] hidden sm:inline-block">
                              Simulatore
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#3E4A35] group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {/* 10. Livella Digitale Camper */}
                        <div
                          onClick={() => setSettingsSubTab('bubble_level')}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-all group active:scale-[0.995]"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                            <div className="p-2.5 rounded-xl shrink-0 bg-amber-50 text-amber-700 border border-amber-100 group-hover:scale-105 transition-transform">
                              <Compass className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-[#3E4A35]/90 text-sm tracking-tight leading-tight group-hover:text-[#3E4A35] transition-colors">
                                Livella Digitale Camper
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                Allinea il camper in asse inclinazione usando l'accelerometro del telefono.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="bg-orange-50 text-amber-805 px-2 py-0.5 rounded-md font-extrabold text-[10px] hidden sm:inline-block">
                              Sosta Regolata
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#3E4A35] group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {/* 10-bis. Strumenti Sosta Libera & Off-grid */}
                        <div
                          onClick={() => setSettingsSubTab('sosta_libera_tools')}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-all group active:scale-[0.995]"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                            <div className="p-2.5 rounded-xl shrink-0 bg-[#A45C40]/10 text-[#A45C40] border border-[#A45C40]/20 group-hover:scale-105 transition-transform">
                              <Sliders className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-[#3E4A35]/90 text-sm tracking-tight leading-tight group-hover:text-[#3E4A35] transition-colors flex items-center gap-1.5">
                                Strumenti & Edge Utilities sosta
                                <span className="bg-orange-600 text-white text-[8px] font-black tracking-widest px-1 py-0.5 rounded uppercase">
                                  OFFLINE
                                </span>
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                Allineamento solare fotovoltaico, stato carica batterie in Volt e risoluzione guasti fai-da-te.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-md font-extrabold text-[10px] hidden sm:inline-block">
                              Multi-Edge 📡
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#3E4A35] group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category 4: Community & App */}
                  {(toolsCategory === 'all' || toolsCategory === 'community') && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700 shadow-xs overflow-hidden">
                      <div className="bg-slate-50/70 dark:bg-slate-700/50 border-b border-stone-100 dark:border-slate-700 px-4.5 py-2.5 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-[#3E4A35]/80 dark:text-slate-300 tracking-widest flex items-center gap-1.5">
                          🗣️ Community & Piattaforma
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold bg-slate-200/40 dark:bg-slate-600 px-2 py-0.5 rounded-full">
                          App
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {/* 11. Bacheca e Chat Community */}
                        <div
                          onClick={() => setSettingsSubTab('community')}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-all group active:scale-[0.995]"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                            <div className="p-2.5 rounded-xl shrink-0 bg-[#3E4A35]/15 text-[#3E4A35] border border-[#3E4A35]/5 group-hover:scale-105 transition-transform">
                              <MessageSquare className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-[#3E4A35]/90 text-sm tracking-tight leading-tight group-hover:text-[#3E4A35] transition-colors">
                                Bacheca & Chat Locale
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                Parla con altri equipaggi vicini, ricevi pareri e condividi curiosità locali.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="bg-[#3E4A35]/10 text-[#3E4A35] px-2 py-0.5 rounded-md font-extrabold text-[10px] hidden sm:inline-block">
                              Disponibile
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#3E4A35] group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {/* 12. Installa App (PWA) removed from here and placed at bottom */}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sleek Bottom Account & Utility Strip */}
                <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 sm:p-5 space-y-4 mt-6">
                  {/* Status Indicator */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pb-3.5 border-b border-slate-200/40">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black text-[#3E4A35]/80 uppercase tracking-wider">Stato Collegamento</span>
                    </div>
                    <span className="text-xs font-extrabold text-slate-600">
                      {currentUser ? `Profilo Attivo: ${currentUser.nickname}` : 'Modalità Ospite (Storage Locale)'}
                    </span>
                  </div>

                  {/* High Density, Equal-Width Grid of Action Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 w-full">
                    {/* Installa App Button */}
                    <button
                      type="button"
                      onClick={() => setSettingsSubTab('install')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none active:scale-95 flex items-center justify-center gap-1.5 border relative w-full ${
                        isInstalled
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200/40'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200/40'
                      }`}
                    >
                      <Smartphone className={`w-3.5 h-3.5 shrink-0 ${isInstalled ? 'text-emerald-600' : 'text-indigo-600 animate-pulse'}`} />
                      <span className="truncate">{isInstalled ? 'App Installata' : 'Installa App'}</span>
                      {isInstallable && !isInstalled && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#A45C40] animate-ping" />
                      )}
                    </button>

                    {currentUser ? (
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="px-3 py-2.5 bg-red-50 hover:bg-red-100 hover:text-red-950 text-red-800 border border-red-200/45 rounded-xl text-xs font-black transition-all cursor-pointer select-none active:scale-95 text-center flex items-center justify-center gap-1.5 w-full truncate"
                      >
                        <LogOut className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span className="truncate">Esci</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSettingsSubTab('login')}
                        className="px-3 py-2.5 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white rounded-xl text-xs font-black transition-all cursor-pointer select-none active:scale-95 text-center flex items-center justify-center gap-1.5 w-full truncate"
                      >
                        <Lock className="w-3.5 h-3.5 text-white shrink-0" />
                        <span className="truncate">Registrati / Accedi</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSettingsSubTab('feedback')}
                      className="px-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-850 border border-amber-200/50 rounded-xl text-xs font-black transition-all cursor-pointer select-none active:scale-95 flex items-center justify-center gap-1.5 w-full"
                    >
                      <Send className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">Aiuto & Feedback</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettingsSubTab('copyright')}
                      className="px-3 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-850 border border-sky-200/50 rounded-xl text-xs font-black transition-all cursor-pointer select-none active:scale-95 flex items-center justify-center gap-1.5 w-full"
                    >
                      <Scale className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span className="truncate">Tutela & Licenza</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        fetchPendingPlaces();
                        fetchFeedbacks();
                        setShowAdminPanel(true);
                      }}
                      className="px-3 py-2.5 bg-slate-50 hover:bg-slate-200/60 text-slate-700 border border-slate-250/50 rounded-xl text-xs font-black transition-all cursor-pointer select-none active:scale-95 flex items-center justify-center gap-1.5 w-full col-span-2 sm:col-span-1"
                    >
                      <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">Moderazione</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Page Breadcrumb / Navigation back bar */}
                <div className="flex flex-row justify-between items-center bg-white rounded-2xl border border-slate-100 p-3 shadow-xs">
                  <button
                    onClick={() => setSettingsSubTab('hub')}
                    className="flex items-center gap-2 group text-[#3E4A35] hover:text-[#5A6B4E] font-black text-xs transition-all py-2 px-3.5 bg-slate-50 rounded-xl border border-slate-200/60 cursor-pointer select-none active:scale-95"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                    <span>Torna a Strumenti</span>
                  </button>
                  
                  {/* Small heading telling where we are */}
                  <span className="text-[10px] font-black uppercase text-[#3E4A35]/65 pr-2 tracking-wider hidden xs:block">
                    Strumenti &gt; {settingsSubTab === 'dimensions' && 'Dati Camper'}
                    {settingsSubTab === 'checklist' && 'Checklist Sicurezza'}
                    {settingsSubTab === 'deadlines' && 'Scandenziere'}
                    {settingsSubTab === 'community' && 'Bacheca & Chat'}
                    {settingsSubTab === 'registration' && 'Registrazione'}
                    {settingsSubTab === 'login' && 'Login'}
                    {settingsSubTab === 'install' && 'Installazione'}
                    {settingsSubTab === 'feedback' && 'Segnalazione & Opinione'}
                    {settingsSubTab === 'ai_itinerary' && 'Generatore Itinerari AI'}
                    {settingsSubTab === 'bubble_level' && 'Livella Digitale Camper'}
                    {settingsSubTab === 'weight_calculator' && 'Bilanciamento & Carico'}
                    {settingsSubTab === 'offgrid_estimator' && 'Autonomia Off-Grid'}
                    {settingsSubTab === 'pantry_shopping' && 'Cambusa & Spesa Intelligente'}
                    {settingsSubTab === 'maintenance_log' && 'Registro Manutenzione Cellula'}
                    {settingsSubTab === 'favorites' && 'Soste Preferite'}
                    {settingsSubTab === 'copyright' && 'Tutela & Licenza D’Autore'}
                    {settingsSubTab === 'sosta_libera_tools' && 'Pannello Sosta Libera'}
                    {settingsSubTab === 'camper_security' && 'Sicurezza Attiva & Sosta Notturna'}
                  </span>
                </div>

                {/* The actual view content inside the subtab */}
                <div className="bg-white rounded-2xl border border-stone-250/30 p-2 sm:p-5 shadow-xs">
                  {settingsSubTab === 'dimensions' && (
                    <VehicleSettings
                      dimensions={vehicleDimensions}
                      onChange={setVehicleDimensions}
                    />
                  )}

                  {settingsSubTab === 'checklist' && (
                    <ChecklistTab
                      items={checklistItems}
                      onChange={setChecklistItems}
                    />
                  )}

                  {settingsSubTab === 'deadlines' && (
                    <DeadlinesTab
                      deadlines={deadlines}
                      onChange={setDeadlines}
                    />
                  )}
                  {settingsSubTab === 'registration' && (
                    <RegistrationForm 
                      onBack={() => setSettingsSubTab('hub')} 
                      onSuccess={(user) => {
                        setIsRegistered(true);
                        localStorage.setItem('camper_is_registered', 'true');
                        setSettingsSubTab('login');
                        window.dispatchEvent(new CustomEvent('show-toast', { 
                          detail: { message: `🎉 Registrazione completata! Ora puoi effettuare il login.`, duration: 4000 } 
                        }));
                      }}
                      onSwitchToLogin={() => setSettingsSubTab('login')}
                    />
                  )}
                  {settingsSubTab === 'login' && (
                    <LoginForm 
                      onBack={() => setSettingsSubTab('hub')} 
                      onSuccess={(user) => {
                        const sanitizedUser = { email: user.email, nickname: user.nickname, name: user.name };
                        setCurrentUser(sanitizedUser);
                        localStorage.setItem('camper_user', JSON.stringify(sanitizedUser));
                        setIsRegistered(true);
                        localStorage.setItem('camper_is_registered', 'true');
                        if (user.favorites) {
                          setFavoriteIds(user.favorites);
                        }
                        setSettingsSubTab('hub');
                      }}
                      onSwitchToRegistration={() => setSettingsSubTab('registration')}
                    />
                  )}

                  {settingsSubTab === 'community' && (
                    <CommunityTab
                      messages={communityMessages}
                      onChange={handleCommunityChange}
                    />
                  )}

                  {settingsSubTab === 'install' && (
                    <div className="bg-white rounded-2xl p-5 sm:p-6 space-y-6">
                      {/* Top Header Card */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                        <div className="flex items-start gap-3.5">
                          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/50 text-[#3E4A35]">
                            <Smartphone className="w-6 h-6 text-amber-800" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                              Installa CamperLife sul tuo dispositivo
                              <span className="text-[10px] bg-emerald-100 text-emerald-850 font-black tracking-wider uppercase px-2 py-0.5 rounded-full">
                                PWA Funzionante
                              </span>
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">La tua mappa stradale offline, diario di bordo e checklist di navigazione sempre a portata di dito.</p>
                          </div>
                        </div>
                        
                        {/* Status badge */}
                        <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 self-start md:self-auto">
                          <span className={`w-2.5 h-2.5 rounded-full ${isInstalled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                          <span>{isInstalled ? 'App Installata e Attiva' : 'Prontamente Installabile'}</span>
                        </div>
                      </div>

                      {/* Informazione Importante per Iframe / AI Studio */}
                      {isInIframe && (
                        <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/30 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-amber-100 rounded-xl text-amber-900 shrink-0 mt-0.5">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">🔍 Anteprima Protetta Rilevata</h4>
                              <p className="text-xs text-amber-900/90 leading-relaxed">
                                Attualmente stai visualizzando CamperLife all'interno della finestra di modifica integrata di <strong>Google AI Studio</strong>. I browser di oggi blinderanno sempre l'installazione delle PWA dentro un riquadro iframe per sicurezza!
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/15">
                            <p className="text-[11px] text-amber-950 font-medium">
                              Per rendere installabile l'app sul tuo telefono o sul tuo PC, <strong>aprila in una nuova scheda</strong> del browser!
                            </p>
                            <button
                              onClick={() => window.open(window.location.href, '_blank')}
                              className="w-full sm:w-auto px-4 py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-white" />
                              Apri in Nuova Scheda
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Highlighting Offline benefits for RV travelers */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-[#D1CDBF] border border-[#3E4A35]/10 flex gap-3">
                          <Globe className="w-5 h-5 text-[#3E4A35] shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-bold text-[#2D2926]">Viaggia Offline</h4>
                            <p className="text-[11px] text-[#2D2926]/75 mt-0.5">Le aree sosta salvate, le checklist di sicurezza e il diario di viaggio funzionano anche senza internet.</p>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-[#D1CDBF] border border-[#3E4A35]/10 flex gap-3">
                          <Sparkles className="w-5 h-5 text-[#3E4A35] shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-bold text-[#2D2926]">Schermo Intero</h4>
                            <p className="text-[11px] text-[#2D2926]/75 mt-0.5">Elimina le barre di ricerca del browser per avere più spazio sulla mappa del navigatore sagomato.</p>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-[#D1CDBF] border border-[#3E4A35]/10 flex gap-3">
                          <Download className="w-5 h-5 text-[#3E4A35] shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-bold text-[#2D2926]">Icona Rapida</h4>
                            <p className="text-[11px] text-[#2D2926]/75 mt-0.5">Aggiunge un'icona nativa bellissima per lanciare CamperLife istantaneamente direttamente dallo schermo.</p>
                          </div>
                        </div>
                      </div>

                      {/* Manual / Automated Trigger Action Card */}
                      <div className="p-5 rounded-2xl bg-[#3E4A35]/5 border border-[#3E4A35]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-center sm:text-left">
                          <h4 className="text-xs font-bold text-[#3E4A35] uppercase tracking-wider">Installazione istantanea sul tuo dispositivo</h4>
                          <p className="text-[11px] text-slate-600 mt-1">Siamo pronti ad installare CamperLife. Clicca il tasto a destra per lanciare la configurazione guidata.</p>
                        </div>

                        <button
                          onClick={handleInstallClick}
                          className="w-full sm:w-auto px-5 py-3 bg-[#3E4A35] text-white hover:bg-[#5A6B4E] active:scale-95 transition-all text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 shrink-0 select-none"
                        >
                          <Download className="w-4 h-4 text-white" />
                          Scarica ed Installa Ora
                        </button>
                      </div>

                      {/* Customized instructions based on OS platform */}
                      <div className="space-y-4 pt-2">
                        <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#3E4A35] border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4" />
                          Guida all'installazione sui vari Sistemi Operativi
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* Apple iOS/iPadOS Safari Section */}
                          <div className="p-5 rounded-xl border border-slate-100 bg-amber-50/20 space-y-3.5">
                            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 uppercase text-[9px] font-black">Apple</span>
                              <span>Su iPhone & iPad (iOS Safari)</span>
                            </div>
                            <ol className="text-xs text-slate-700 space-y-2.5 pl-4 list-decimal">
                              <li>
                                Apri questa pagina usando il browser nativo di Apple <strong>Safari</strong>.
                              </li>
                              <li className="flex items-center gap-1.5 flex-wrap">
                                Tocca il tasto di condivisione di Apple in basso <span className="p-1 inline-block bg-white rounded-md border border-slate-200"><Share className="w-3.5 h-3.5 inline text-sky-600" /></span> (pulsante con un quadrato e una freccia verso l'alto).
                              </li>
                              <li>
                                Scorri il menu a comparsa verso il basso e seleziona <strong>"Aggiungi alla schermata Home"</strong>.
                              </li>
                              <li>
                                Conferma premendo su <strong>"Aggiungi"</strong> nell'angolo in alto a destra. L'icona apparirà sul tuo iPhone!
                              </li>
                            </ol>
                          </div>

                          {/* Android / Chrome PC Section */}
                          <div className="p-5 rounded-xl border border-slate-100 bg-slate-50 space-y-3.5">
                            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                              <span className="px-2 py-0.5 rounded-full bg-[#3E4A35]/10 text-[#3E4A35] border border-[#3E4A35]/25 uppercase text-[9px] font-black">Android & PC</span>
                              <span>Su Android Chrome, Windows, Mac</span>
                            </div>
                            <ol className="text-xs text-slate-700 space-y-2.5 pl-4 list-decimal">
                              <li>
                                Tocca il pulsante <strong className="underline">"Scarica ed Installa Ora"</strong> qui sopra.
                              </li>
                              <li>
                                Se non si avvia, tocca i tre puntini del browser <strong className="text-slate-800">⋮</strong> (in alto a destra).
                              </li>
                              <li>
                                Tocca la voce <strong>"Installa applicazione"</strong> o <strong>"Aggiungi a schermata Home"</strong>.
                              </li>
                              <li>
                                Il telefono o PC scaricherà in background la webapp creando l'icona e l'avvio autonomo offline.
                              </li>
                            </ol>
                          </div>
                        </div>
                      </div>

                      {/* Beautiful vector badge explaining SW update */}
                      <div className="bg-[#5A6B4E]/5 border border-[#5A6B4E]/10 p-3.5 rounded-xl text-[11px] text-slate-600 leading-relaxed">
                        ⚙️ <strong>Aggiornamenti trasparenti:</strong> Una volta installata, l'app si aggiorna automaticamente all'avvio scaricando i nuovi pacchetti in background tramite Service Worker. Le impostazioni del tuo camper e i diari di bordo rimangono al sicuro immagazzinati offline nel database locale del browser.
                      </div>
                    </div>
                  )}

                  {settingsSubTab === 'feedback' && (
                    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 font-sans">
                      {/* Header block with elegant colors */}
                      <div className="bg-[#3E4A35] text-white p-6 rounded-2xl shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-[#5A6B4E]/20 rounded-full blur-2xl pointer-events-none" />
                        <div>
                          <span className="text-[#F2EFE9]/70 text-[9px] font-black uppercase tracking-wider block">Supporto & Idee</span>
                          <h2 className="text-xl font-bold mt-0.5">Suggerimenti ed Opinioni</h2>
                          <p className="text-xs text-[#F2EFE9]/80 mt-1">La tua voce è fondamentale per far crescere CamperLife. Raccontaci la tua esperienza o segnala problemi.</p>
                        </div>
                        <div className="p-3 bg-[#5A6B4E]/40 border border-[#F2EFE9]/10 rounded-2xl text-amber-200 shrink-0">
                          <Send className="w-6 h-6 animate-pulse" />
                        </div>
                      </div>

                      {/* Main feedback submitting form */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Form area (Left Side) */}
                        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-xs">
                          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center gap-2">
                            ✍️ Compila la tua segnalazione
                          </h3>
                          
                          {feedbackSuccess ? (
                            <div className="bg-emerald-50 border border-emerald-250 p-6 rounded-xl text-center space-y-3.5 py-8 animate-in fade-in zoom-in-95 duration-200">
                              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-black text-xl mx-auto">✓</div>
                              <div className="space-y-1">
                                <h4 className="text-emerald-950 font-extrabold text-sm">Feedback Inviato con Successo!</h4>
                                <p className="text-[11.5px] text-emerald-800 max-w-xs mx-auto leading-relaxed">
                                  La tua opinione è stata registrata nella nostra console. L'amministratore risponderà direttamente qui sotto!
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setFeedbackSuccess(false);
                                  setFeedbackPhoto(null);
                                }}
                                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-850 text-white rounded-lg text-xs font-bold transition-all cursor-pointer mx-auto block"
                              >
                                Invia un'altra segnalazione
                              </button>
                            </div>
                          ) : (
                            <form 
                              onSubmit={async (e) => {
                                e.preventDefault();
                                if (!feedbackName.trim() || !feedbackMessage.trim()) return;
                                setFeedbackIsSending(true);
                                try {
                                  const res = await fetch('/api/feedback', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      name: feedbackName,
                                      category: feedbackCategory,
                                      message: feedbackMessage,
                                      photo: feedbackPhoto
                                    })
                                  });
                                  if (res.ok) {
                                    setFeedbackSuccess(true);
                                    setFeedbackMessage('');
                                    setFeedbackPhoto(null);
                                    // Refresh local feedback list to show new submission
                                    const listRes = await fetch('/api/admin/feedbacks');
                                    if (listRes.ok) {
                                      const data = await listRes.json();
                                      setUserFeedbacks(data);
                                    }
                                  } else {
                                    const errData = await res.json();
                                    alert(errData.error || 'Errore durante l\'invio.');
                                  }
                                } catch (err) {
                                  console.error("Error sending feedback:", err);
                                  alert("Impossibile contattare il server.");
                                } finally {
                                  setFeedbackIsSending(false);
                                }
                              }}
                              className="space-y-4">
<div>
                                <label className="block text-xs font-bold text-slate-705 mb-1.5">La tua Firma / Nome</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Es: Marco V. / Camperista91"
                                  value={feedbackName}
                                  onChange={e => setFeedbackName(e.target.value)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium outline-none text-slate-805 focus:border-[#3E4A35] focus:ring-4 focus:ring-[#3E4A35]/10 bg-stone-50/25 transition-all text-stone-900"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-705 mb-2">Tipologia della Segnalazione</label>
                                <div className="grid grid-cols-3 gap-2">
                                  {(['suggerimento', 'segnalazione', 'altro'] as const).map((cat) => (
                                    <button
                                      key={cat}
                                      type="button"
                                      onClick={() => setFeedbackCategory(cat)}
                                      className={`py-2 px-1 text-[10.5px] rounded-xl font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                        feedbackCategory === cat 
                                          ? 'bg-[#3E4A35] text-white border-[#3E4A35] shadow-xs' 
                                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-605'
                                      }`}
                                    >
                                      <span>
                                        {cat === 'suggerimento' && '💡 Suggerimento'}
                                        {cat === 'segnalazione' && '⚠️ Bug/Anomalia'}
                                        {cat === 'altro' && '💬 Altro'}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-705 mb-1.5">Descrizione del Suggerimento o Segnalazione</label>
                                <textarea
                                  required
                                  rows={4}
                                  placeholder="Raccontaci tutto qui... Che cosa vorresti migliorare o quale problema hai riscontrato?"
                                  value={feedbackMessage}
                                  onChange={e => setFeedbackMessage(e.target.value)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium outline-none text-slate-805 focus:border-[#3E4A35] focus:ring-4 focus:ring-[#3E4A35]/10 bg-stone-50/25 transition-all resize-none leading-relaxed text-stone-900"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-705 mb-1.5">Foto o Screenshot (Opzionale)</label>
                                {feedbackPhoto ? (
                                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 mt-1 max-w-[280px]">
                                    <img src={feedbackPhoto} className="max-w-full h-auto object-cover max-h-48" alt="Feedback attachment Preview" />
                                    <button
                                      type="button"
                                      onClick={() => setFeedbackPhoto(null)}
                                      className="absolute top-2 right-2 p-1.5 bg-red-650 hover:bg-red-750 text-white rounded-full transition shadow-md cursor-pointer flex items-center justify-center"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <label className="border-2 border-dashed border-slate-200 hover:border-[#3E4A35] rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-stone-50/25 hover:bg-[#3E4A35]/5 transition-all group">
                                    <Camera className="w-6 h-6 text-slate-400 group-hover:text-[#3E4A35] transition-all" />
                                    <span className="text-[10.5px] font-bold text-slate-600 group-hover:text-[#3E4A35] transition-all text-center">Trascina o clicca per caricare un'immagine o screenshot</span>
                                    <span className="text-[8.5px] text-slate-400">PNG, JPG fino a 5MB</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          if (file.size > 5 * 1024 * 1024) {
                                            alert("L'immagine supera il limite di 5 MB.");
                                            return;
                                          }
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            setFeedbackPhoto(reader.result as string);
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                )}
                              </div>

                              <button
                                type="submit"
                                disabled={feedbackIsSending}
                                className="w-full py-3 bg-[#3E4A35] hover:bg-[#5A6B4E] disabled:bg-[#3E4A35]/50 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 select-none"
                              >
                                {feedbackIsSending ? (
                                  <>
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Invio in corso...</span>
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-3.5 h-3.5 text-white" />
                                    <span>Invia Segnalazione all'Amministratore</span>
                                  </>
                                )}
                              </button>
                            </form>
                          )}
                        </div>

                        {/* List area (Right Side) showing replies from administrative console */}
                        <div className="lg:col-span-5 bg-[#D1CDBF] rounded-2xl border border-stone-200/50 p-5 space-y-4">
                          <h3 className="text-sm font-black text-[#3E4A35] uppercase tracking-wide border-b border-[#3E4A35]/10 pb-2 flex items-center gap-2">
                            <Inbox className="w-4 h-4 text-[#3E4A35]" />
                            Bacheca Risposte
                          </h3>
                          <p className="text-[10.5px] text-stone-550 leading-relaxed">
                            Resta sintonizzato! Puoi visualizzare le tue segnalazioni ed eventuali risposte inviate dall'amministratore di CamperLife direttamente qui sotto in tempo reale.
                          </p>

                          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                            {userFeedbacks.length === 0 ? (
                              <div className="text-center py-10 text-stone-400 space-y-2 select-none">
                                <Inbox className="w-10 h-10 text-stone-300 mx-auto" />
                                <p className="text-[11px] font-bold">Nessun messaggio inviato.</p>
                                <p className="text-[10px]">Invia il tuo primo suggerimento a sinistra per vederlo apparire qui!</p>
                              </div>
                            ) : (
                              [...userFeedbacks].reverse().map((f) => (
                                <div key={f.id} className="p-3 bg-white rounded-xl border border-stone-200/60 shadow-xs space-y-2">
                                  <div className="flex justify-between items-start gap-2 flex-wrap">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[11px] font-black text-[#3E4A35]">{f.name}</span>
                                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                        f.category === 'suggerimento' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                                        f.category === 'segnalazione' ? 'bg-red-50 text-red-700 border border-red-200' :
                                        'bg-slate-50 text-slate-700 border border-slate-200'
                                      }`}>
                                        {f.category}
                                      </span>
                                    </div>
                                    <span className="text-[8px] text-[#2D2926]/40 font-mono">
                                      {new Date(f.createdAt).toLocaleDateString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>

                                  <p className="text-[11px] text-slate-700 leading-relaxed italic bg-stone-50/40 p-2 rounded-lg border border-dashed border-stone-105">
                                    &quot;{f.message}&quot;
                                  </p>

                                  {f.photo && (
                                    <div className="mt-1.5 rounded-lg overflow-hidden border border-slate-200 max-w-[120px] relative group hover:cursor-pointer shadow-xs">
                                      <img 
                                        src={f.photo} 
                                        alt="Allegato o Screenshot" 
                                        className="max-h-20 w-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-200"
                                        onClick={() => setFullImageModal(f.photo)}
                                      />
                                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                        <span className="text-[8px] text-white bg-black/60 px-1 py-0.5 rounded font-black uppercase tracking-wider">Zoom</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Answer from admin */}
                                  {f.reply ? (
                                    <div className="p-2.5 bg-green-50 border border-green-200/50 rounded-lg space-y-1 animate-in fade-in duration-150">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-green-900 uppercase tracking-widest flex items-center gap-1">
                                          🛡️ Risposta Amministratore
                                        </span>
                                        {f.repliedAt && (
                                          <span className="text-[8px] text-green-600/70 font-mono">
                                            {new Date(f.repliedAt).toLocaleDateString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] font-bold text-green-950 leading-relaxed font-sans">{f.reply}</p>
                                    </div>
                                  ) : (
                                    <div className="text-[9.5px] text-zinc-400 font-bold flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                      <span>In attesa di moderazione...</span>
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsSubTab === 'copyright' && (
                    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 font-sans">
                      {/* Top Header Card with premium aesthetic */}
                      <div className="bg-gradient-to-br from-[#3E4A35] via-[#4D5D42] to-[#5A6B4E] text-white p-6 rounded-2xl shadow-md relative overflow-hidden">
                        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                        <div className="relative z-10 space-y-2">
                          <span className="text-[9px] uppercase font-black tracking-widest bg-white/20 px-2.5 py-1 rounded-full text-white">
                            Registro di Tutela Legale
                          </span>
                          <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                            <Scale className="w-6 h-6 text-emerald-300 shrink-0" />
                            Diritto d'Autore & Licenza
                          </h2>
                          <p className="text-xs text-white/95 max-w-xl leading-relaxed">
                            CamperLife è protetto da copyright ed è software proprietario privato. Tutti i diritti di riproduzione, marchi ed algoritmi sono riservati.
                          </p>
                        </div>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {/* Status Card (Left Column) */}
                        <div className="md:col-span-4 bg-[#F2EFE9] rounded-2xl p-5 border border-stone-200/60 flex flex-col items-center text-center justify-between space-y-4">
                          <div className="w-16 h-16 bg-[#3E4A35]/15 text-[#3E4A35] rounded-2xl flex items-center justify-center border border-[#3E4A35]/20">
                            <Lock className="w-8 h-8" />
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase text-[#3E4A35]/80 tracking-widest">
                              PROPRIETARIO DEGLI ASSET
                            </span>
                            <h3 className="text-base font-extrabold text-slate-800">
                              Simone Sambucci
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium">
                              sambucci.simone@gmail.com
                            </p>
                          </div>

                          <div className="bg-emerald-500/10 text-emerald-800 px-3 py-1.5 rounded-full font-black text-[10px] tracking-wider uppercase border border-emerald-500/20 w-full">
                            🔒 100% Blindato & Riservato
                          </div>
                        </div>

                        {/* Interactive Legal Protection & Copy Area (Right Column) */}
                        <div className="md:col-span-8 bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-sm">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                            <span>📜 Certificato di Proprietà Esclusiva</span>
                          </h4>

                          <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
                            <p>
                              Tutti gli elementi dell'applicazione <strong>CamperLife</strong>, inclusi il codice sorgente, l'infrastruttura del database locale ed i formati grafici sono di esclusiva titolarità di <strong>Simone Sambucci</strong>.
                            </p>
                            <p>
                              In quanto licenza <strong>"All Rights Reserved" (Tutti i diritti riservati)</strong>, per legge è vietata qualsiasi forma di duplicazione o distribuzione non concordata con l'autore. L'hosting o la pubblicazione pubblica del codice (es. GitHub pubblico) costituisce violazione del diritto d'autore (L. 633/1941) e verrà perseguito civilmente e penalmente.
                            </p>
                          </div>

                          <div className="bg-amber-500/5 border border-amber-500/15 p-4 rounded-xl space-y-2">
                            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                              💡 Come duplicare in sicurezza?
                            </div>
                            <p className="text-xs text-amber-800 leading-relaxed">
                              Se intendi fare modifiche sperimentali sul codice senza rischiare di danneggiare questa versione stabile di CamperLife, puoi scaricare il file <strong>ZIP privato</strong> tramite il menu <strong className="text-[#3E4A35]">Esporta</strong> del PC o duplicare l'applet in sandbox private protette di Google AI Studio.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`CONTRATTO DI LICENZA SOFTWARE PROPRIETARIO (ALL RIGHTS RESERVED)
PROJECT NAME: CamperLife
COPYRIGHT HOLDER: Simone Sambucci (sambucci.simone@gmail.com)
YEAR: 2026
Tutti i diritti esclusivi riservati. È vietata la copia e riproduzione.`);
                              window.dispatchEvent(new CustomEvent('show-toast', { 
                                detail: { message: '📋 Copiata nota di copyright negli appunti!' } 
                              }));
                            }}
                            className="w-full py-2.5 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
                          >
                            <span>📋 Copia Dichiarazione di Copyright</span>
                          </button>
                        </div>
                      </div>

                      {/* Full License Code block displayer */}
                      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 space-y-3.5">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-[#3E4A35]/80 tracking-widest">
                            TESTO COMPLETO DELLA LICENZA PROPRIETARIA
                          </span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-755">
                            LICENSE File
                          </span>
                        </div>
                        <div className="bg-slate-900 text-slate-100 font-mono text-[10.5px] p-4 rounded-xl overflow-x-auto max-h-[180px] leading-relaxed select-all">
                          <p className="text-emerald-400 font-bold mb-2">// CONTRATTO DI LICENZA SOFTWARE PROPRIETARIO (ALL RIGHTS RESERVED)</p>
                          <p className="mb-1">PROJECT NAME: CamperLife</p>
                          <p className="mb-1 font-bold">COPYRIGHT OWNER: Simone Sambucci (sambucci.simone@gmail.com)</p>
                          <p className="mb-1">YEAR: 2026</p>
                          <p className="mt-2 text-slate-400">Tutti i diritti di proprietà intellettuale relativi al software CamperLife (incluso codice sorgente, database blueprint in Firebase, icone e layout di navigazione) appartengono in via esclusiva ad ogni effetto di legge a Simone Sambucci. È vietata la distribuzione non autorizzata.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsSubTab === 'ai_itinerary' && (
                    <AIItineraryTab
                      vehicleDimensions={vehicleDimensions}
                      onAddPlace={(newPlace) => {
                        setPlaces(prevPlaces => {
                          const updatedPlaces = [...prevPlaces, newPlace];
                          localStorage.setItem('camper_places', JSON.stringify(updatedPlaces));
                          return updatedPlaces;
                        });
                      }}
                      onShowOnMap={(lat, lng, label) => {
                        setActiveTab('map_nav');
                        setMapNavSubTab('map');
                        window.dispatchEvent(new CustomEvent('map-fly-to', {
                          detail: { lat, lng, label }
                        }));
                      }}
                      savedPlaces={places}
                    />
                  )}

                  {settingsSubTab === 'bubble_level' && (
                    <BubbleLevelTab />
                  )}

                  {settingsSubTab === 'weight_calculator' && (
                    <WeightCalculatorTab />
                  )}

                  {settingsSubTab === 'offgrid_estimator' && (
                    <OffGridEstimatorTab />
                  )}

                  {settingsSubTab === 'sosta_libera_tools' && (
                    <SostaLiberaToolsTab />
                  )}

                  {settingsSubTab === 'camper_security' && (
                    <CamperSecurityTab currentUser={currentUser} userLocation={userLocation} />
                  )}

                  {settingsSubTab === 'pantry_shopping' && (
                    <PantryShoppingTab />
                  )}

                  {settingsSubTab === 'maintenance_log' && (
                    <MaintenanceLogTab />
                  )}

                  {settingsSubTab === 'favorites' && (
                    <FavoritesTab
                      favoriteIds={favoriteIds}
                      places={places}
                      onToggleFavorite={handleToggleFavorite}
                      onShowOnMap={(placeId) => {
                        setFocusedPlaceId(placeId);
                        setActiveTab('map_nav');
                      }}
                      onGoToMap={() => {
                        setActiveTab('map_nav');
                      }}
                    />
                  )}

                  {settingsSubTab === 'fuel_card' && (
                    <FuelCardTab currentUser={currentUser} />
                  )}


                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* Persistent Sticky Bottom Navigation Bar with EXACTLY THREE icons/tabs optimized for mobile hand fingers */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 h-[50px] px-0.5 flex justify-around items-center md:hidden z-50 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        
        {/* Tab 1: Mappa & Navigatore */}
        <button
          onClick={() => {
            setActiveTab('map_nav');
            setMapNavSubTab('map');
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 px-1 rounded-xl transition-all ${
            activeTab === 'map_nav' ? 'text-[#3E4A35] font-black' : 'text-[#2D2926]/50 font-semibold'
          }`}
        >
          <Compass className={`w-5 h-5 mb-0.5 ${activeTab === 'map_nav' ? 'text-[#3E4A35]' : 'text-slate-400'}`} />
          <span className="text-[9px] tracking-tight leading-none">Mappa & Nav</span>
        </button>

        {/* Tab 2: Diario (Creare viaggi, spese, foto, ecc) */}
        <button
          onClick={() => {
            setActiveTab('diary');
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 px-1 rounded-xl transition-all relative ${
            activeTab === 'diary' ? 'text-[#3E4A35] font-black' : 'text-[#2D2926]/50 font-semibold'
          }`}
        >
          <BookOpen className={`w-5 h-5 mb-0.5 ${activeTab === 'diary' ? 'text-[#3E4A35]' : 'text-slate-400'}`} />
          <span className="text-[9px] tracking-tight leading-none">Diario Viaggio</span>
          {hasActiveTrip && <span className="absolute top-1.5 right-6 w-1.5 h-1.5 bg-[#5A6B4E] rounded-full animate-ping" />}
        </button>

        {/* Tab 3: Impostazioni al cui interno c'è sagoma, chat, checklist, ecc */}
        <button
          onClick={() => {
            setActiveTab('settings_tools');
            setSettingsSubTab('hub');
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 px-1 rounded-xl transition-all relative ${
            activeTab === 'settings_tools' ? 'text-[#3E4A35] font-black' : 'text-[#2D2926]/50 font-semibold'
          }`}
        >
          <Sliders className={`w-5 h-5 mb-0.5 ${activeTab === 'settings_tools' ? 'text-[#3E4A35]' : 'text-slate-400'}`} />
          <span className="text-[9px] tracking-tight leading-none">Strumenti & Imp</span>
          {totalWarnings > 0 && (
            <span className="absolute top-1 right-6 bg-[#A45C40] text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
              {totalWarnings}
            </span>
          )}
        </button>
      </div>

      {/* Safety info Alert panel bar */}
      <div className="bg-[#3E4A35] text-white/80 text-xs py-3.5 border-t border-[#3E4A35]/25 text-center mt-auto hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#A45C40] rounded-full animate-ping"></span>
            <span className="font-semibold text-[11px] text-white">CamperLife Sicurezza Marittima & Fluviale OK</span>
          </div>
          <p className="text-[10px] text-white/70">
            © {new Date().getFullYear()} CamperLife • Codice & Design di Proprietà Esclusiva di Simone Sambucci. Tutti i diritti riservati.
          </p>
          <div className="flex gap-3 text-[10px] text-white/70">
            <span>Mappe: Leaflet & OSM</span>
            <span>Voci: SpeechAPI</span>
          </div>
        </div>
      </div>

      {isFullscreenNav && navDestination && (
        <FullscreenNavigator
          dest={navDestination}
          vehicleDimensions={vehicleDimensions}
          onClose={() => setIsFullscreenNav(false)}
          userLocation={userLocation}
          userAccuracy={userAccuracy}
          isGPSEnabled={isGPSEnabled}
          onGPSEnabledChange={setIsGPSEnabled}
          places={places}
          onSelectPlaceDirectly={handleSelectPlaceDirectly}
        />
      )}

      {/* --- ADMIN MODERATION CONTROL PANEL --- */}
      {showAdminPanel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-amber-50 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 rounded-xl text-amber-800">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Pannello di Moderazione Amministrativa</h3>
                  <p className="text-[10px] text-slate-500 font-medium font-sans">Gestisci le richieste di sosta e campeggi inserite dai viaggiatori.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAdminPanel(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Admin Login Box if not authenticated */}
            {!isAdminLoggedIn ? (
              <div className="p-8 text-center flex flex-col items-center justify-center space-y-4 my-6 font-sans">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Lock className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-850 text-sm">Accesso Console Amministrativa</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">Inserisci la password di amministrazione predefinita per approvare i punti sosta e renderli visibili a tutti.</p>
                </div>
                 <div className="flex items-center gap-2 max-w-xs w-full pt-1">
                  <div className="relative flex-1">
                    <input
                      type={showAdminPassword ? "text" : "password"}
                      placeholder="Inserisci la password (admin)"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                      className="w-full pl-4 pr-10 py-2 border border-slate-200 rounded-xl outline-none text-xs text-center font-bold tracking-widest focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer flex items-center justify-center"
                      title={showAdminPassword ? "Nascondi password" : "Mostra password"}
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={handleAdminLogin}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-4 py-2 rounded-xl transition cursor-pointer shrink-0"
                  >
                    Entra
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400 font-bold font-sans">ℹ️ Credenziale di test: <span className="font-mono bg-zinc-100 px-1 rounded text-zinc-650">admin</span></p>
              </div>
            ) : (
              /* If authenticated: display pending queue & OSM Importer tabs */
              <div className="flex-1 flex flex-col min-h-0 font-sans">
                
                {/* Admin Subtabs Selector */}
                <div className="flex bg-slate-100 p-1 border-b border-slate-200 gap-1 shrink-0 select-none">
                  <button
                    type="button"
                    onClick={() => setAdminSubTab('pending')}
                    className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      adminSubTab === 'pending'
                        ? 'bg-[#3E4A35] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-[#3E4A35]/5 hover:text-slate-805'
                    }`}
                  >
                    <span>📋 Soste ({pendingPlaces.length})</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      fetchFeedbacks();
                      setAdminSubTab('feedback');
                    }}
                    className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      adminSubTab === 'feedback'
                        ? 'bg-[#3E4A35] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-[#3E4A35]/5 hover:text-slate-805'
                    }`}
                  >
                    <Send className="w-3 h-3 text-orange-200" />
                    <span>💬 Suggerimenti ({feedbacks.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminSubTab('osm')}
                    className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      adminSubTab === 'osm'
                        ? 'bg-[#3E4A35] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-[#3E4A35]/5 hover:text-slate-805'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5 text-sky-505" />
                    <span>📥 OSM Import</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      fetchAdminUsers();
                      setAdminSubTab('users');
                    }}
                    className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      adminSubTab === 'users'
                        ? 'bg-[#3E4A35] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-[#3E4A35]/5 hover:text-slate-805'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-rose-500" />
                    <span>👥 Iscritti ({adminUsers.length})</span>
                  </button>
                </div>

                {/* Sub Tab: pending places queue moderation */}
                {adminSubTab === 'pending' && (
                  <div className="p-5 flex-1 overflow-y-auto space-y-4 shrink min-h-0">
                    {pendingPlaces.length === 0 ? (
                      <div className="text-center py-16 flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xl">✓</div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs">Nessuna Sosta in Attesa</h4>
                          <p className="text-[10.5px] text-slate-500 max-w-xs mt-1">Ottimo lavoro! Tutte le richieste sosta inserite dagli utenti sono state moderate correttamente.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-xs text-[#3E4A35] font-extrabold bg-[#3E4A35]/5 p-2 rounded-lg border border-[#3E4A35]/15 inline-block select-none">
                          Richieste in attesa di approvazione: <span className="font-black underline text-sm">{pendingPlaces.length}</span>
                        </p>
                        
                        {pendingPlaces.map((p) => (
                          <div key={p.id} className="p-4 border border-slate-200 rounded-xl space-y-3 bg-stone-50/40 hover:border-slate-300 transition-all">
                            
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-black text-slate-850 text-sm leading-tight">{p.name}</h4>
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase text-white tracking-wider ${
                                    p.category === 'area_sosta' ? 'bg-emerald-600' :
                                    p.category === 'campeggio' ? 'bg-sky-600' :
                                    p.category === 'parcheggio_camper' ? 'bg-indigo-600' : 'bg-orange-500'
                                  }`}>
                                    {p.category.replace('_', ' ')}
                                  </span>
                                </div>
                                <p className="text-[10.5px] text-slate-500 font-semibold flex items-center gap-1 mt-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                  <span className="line-clamp-1">{p.address}</span>
                                </p>
                              </div>
                              
                              <div className="font-mono text-[9px] bg-slate-105 text-slate-600 font-bold px-2 py-0.5 rounded-lg border border-slate-200 shrink-0">
                                {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                              </div>
                            </div>

                            {/* Detail summary blocks specs */}
                            <div className="flex flex-wrap items-center gap-4 text-[10.5px] border-t border-b border-dashed border-slate-200 py-2.5">
                              <div>
                                <span className="font-bold text-slate-450 uppercase tracking-wider text-[9px]">Tariffa:</span>{' '}
                                <span className="font-black text-[#3E4A35] bg-[#3E4A35]/5 border border-[#3E4A35]/15 px-2 py-0.5 rounded-lg mt-0.5">
                                  {p.priceInfo || 'Non specificata'} ({p.priceEuro} €)
                                </span>
                              </div>
                              {p.phone && (
                                <div>
                                  <span className="font-bold text-slate-450 uppercase tracking-wider text-[9px]">Contatto:</span>{' '}
                                  <span className="text-slate-800 font-bold">{p.phone}</span>
                                </div>
                              )}

                              {/* Optionals dimensions block */}
                              {(p.hasMaxHeightLimit || p.hasMaxWeightLimit || p.isNarrowAccess) && (
                                <div className="w-full flex gap-1.5 mt-1">
                                  {p.hasMaxHeightLimit && (
                                    <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                                      H. max: {p.maxHeight}m
                                    </span>
                                  )}
                                  {p.hasMaxWeightLimit && (
                                    <span className="bg-red-50 text-red-700 border border-red-100 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                                      Peso max: {p.maxWeight}t
                                    </span>
                                  )}
                                  {p.isNarrowAccess && (
                                    <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                                      Accesso stretto ⚠️
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {/* Facilities check pills list */}
                              {p.facilities && p.facilities.length > 0 && (
                                <div className="w-full flex flex-wrap gap-1 mt-1">
                                  {p.facilities.map((f: string) => (
                                    <span key={f} className="bg-slate-105 border border-slate-200 text-slate-750 font-medium px-2 py-0.5 rounded-md text-[9px]">
                                      {f}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Action moderator panel triggers rows */}
                            <div className="flex justify-between items-center gap-2 pt-1 pb-0.5">
                              <button
                                type="button"
                                onClick={() => handleRejectPlace(p.id)}
                                className="py-2 px-3 border border-red-200 hover:border-red-400 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Rifiuta ed Elimina
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApprovePlace(p.id)}
                                className="py-2 px-4 bg-[#3E4A35] hover:bg-[#3E4A35]/95 text-white font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow transition-all"
                              >
                                <Check className="w-4 h-4" />
                                Accetta e Pubblica Sulla Mappa
                              </button>
                            </div>

                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub Tab: suggestions and feedback replies moderation */}
                {adminSubTab === 'feedback' && (
                  <div className="p-5 flex-1 overflow-y-auto space-y-4 shrink min-h-0 font-sans">
                    <div className="bg-[#3E4A35]/5 border border-[#3E4A35]/10 p-3.5 rounded-xl text-[11px] text-[#3E4A35] leading-relaxed">
                      💬 <strong>Dashboard Segnalazioni & Suggerimenti:</strong> Da qui puoi visionare tutti i feedback reali o di testing lasciati dagli utenti nell'apposita scheda "Invia Suggerimento" e inviare loro una risposta ufficiale che vedranno all'istante.
                    </div>

                    {feedbacks.length === 0 ? (
                      <div className="text-center py-16 flex flex-col items-center justify-center space-y-3">
                        <Inbox className="w-10 h-10 text-stone-300 mx-auto" />
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs">Nessun feedback presente</h4>
                          <p className="text-[10.5px] text-slate-500 max-w-xs mt-1">Nessun utente ha ancora inserito opinioni o segnalazioni.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {[...feedbacks].reverse().map((f) => (
                          <div key={f.id} className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-3">
                            <div className="flex justify-between items-start gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-slate-900">{f.name}</span>
                                <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  f.category === 'suggerimento' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                                  f.category === 'segnalazione' ? 'bg-red-50 text-red-700 border border-red-200' :
                                  'bg-slate-50 text-slate-700 border border-slate-200'
                                }`}>
                                  {f.category}
                                </span>
                              </div>
                              <span className="text-[9px] text-[#2D2926]/40 font-mono">
                                {new Date(f.createdAt).toLocaleString()}
                              </span>
                            </div>

                            <p className="text-xs text-slate-700 bg-stone-50 p-3 rounded-lg border border-stone-200/45 italic leading-relaxed">
                              &quot;{f.message}&quot;
                            </p>

                            {f.photo && (
                              <div className="rounded-xl overflow-hidden border border-slate-200 max-w-[200px] relative group hover:cursor-pointer shadow-xs">
                                <img 
                                  src={f.photo} 
                                  alt="Screenshot o Foto Allegata" 
                                  className="max-h-36 w-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-200"
                                  onClick={() => setFullImageModal(f.photo)}
                                />
                                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                  <span className="text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Ingrandisci</span>
                                </div>
                              </div>
                            )}

                            {/* Reply area */}
                            <div className="pt-2 border-t border-slate-100 space-y-2">
                              {f.reply ? (
                                <div className="space-y-2">
                                  <div className="p-3 bg-green-50 border border-green-200/50 rounded-xl space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9.5px] font-black text-green-900 uppercase tracking-widest flex items-center gap-1">
                                        🛡️ Tua Risposta inviata
                                      </span>
                                      {f.repliedAt && (
                                        <span className="text-[8px] text-green-600/70 font-mono">
                                          {new Date(f.repliedAt).toLocaleString()}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs font-bold text-green-950 leading-relaxed">{f.reply}</p>
                                  </div>

                                  {/* Allow edit */}
                                  <details className="group">
                                    <summary className="text-[10px] text-stone-500 font-bold hover:text-[#3E4A35] transition-all cursor-pointer select-none">
                                      ✍️ Modifica Risposta
                                    </summary>
                                    <div className="pt-2 flex gap-2">
                                      <input
                                        type="text"
                                        placeholder="Nuova risposta..."
                                        value={adminReplies[f.id] || ''}
                                        onChange={(e) => setAdminReplies(prev => ({ ...prev, [f.id]: e.target.value }))}
                                        className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-xs outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleReplyFeedback(f.id)}
                                        className="px-3.5 py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white text-[11px] font-black rounded-lg cursor-pointer transition-all"
                                      >
                                        Aggiorna
                                      </button>
                                    </div>
                                  </details>
                                </div>
                              ) : (
                                <div className="space-y-1.5 pt-1">
                                  <label className="block text-[9.5px] font-black text-slate-500 uppercase tracking-wider">Invia una Risposta:</label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Scrivi qui la tua risposta all'utente..."
                                      value={adminReplies[f.id] || ''}
                                      onChange={(e) => setAdminReplies(prev => ({ ...prev, [f.id]: e.target.value }))}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleReplyFeedback(f.id);
                                      }}
                                      className="flex-1 px-3.5 py-2 border border-slate-250 rounded-xl text-xs font-medium outline-none focus:border-[#3E4A35] focus:ring-4 focus:ring-[#3E4A35]/10 bg-stone-50/20 text-slate-900 transition-all placeholder:text-slate-400"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleReplyFeedback(f.id)}
                                      className="px-4 py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white text-xs font-black rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center select-none"
                                    >
                                      Rispondi
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub Tab: OpenStreetMap (OSM) Importer UI inside Moderazione Admin */}
                {adminSubTab === 'osm' && (
                  <div className="p-5 flex-1 overflow-y-auto space-y-4 shrink min-h-0">
                    <div className="space-y-4 font-sans">
                      <div className="bg-sky-50 text-sky-850 rounded-2xl p-4 border border-sky-100 text-xs leading-relaxed space-y-2">
                        <h4 className="font-extrabold text-sm text-sky-900 flex items-center gap-2">
                          <Database className="w-4 h-4 text-sky-750 shrink-0" />
                          Strumenti OSM Gestione Territoriale
                        </h4>
                        <p>
                          Questo modulo interroga i server di produzione ufficiali di <strong>OpenStreetMap</strong> mediante Overpass. Sincronizzerà campeggi, agricampeggi, camper stop e pozzetti di scarico sanitari sul tuo database locale di CamperLife.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {/* Latitude input field */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Latitudine Centro</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={osmCenterLat}
                            onChange={(e) => setOsmCenterLat(parseFloat(e.target.value) || 41.9028)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none focus:border-sky-500"
                          />
                        </div>

                        {/* Longitude input field */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Longitudine Centro</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={osmCenterLng}
                            onChange={(e) => setOsmCenterLng(parseFloat(e.target.value) || 12.4964)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      {/* Map coordinate quick preset buttons */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] font-black text-[#3E4A35] uppercase tracking-widest block">Seleziona un'area di test in Italia:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { name: "🇮🇹 Roma (Centro)", lat: 41.9028, lng: 12.4964 },
                            { name: "🗻 Garda (Lago)", lat: 45.5480, lng: 10.7060 },
                            { name: "🍷 Firenze (Toscana)", lat: 43.7696, lng: 11.2558 },
                            { name: "🏔️ Milano / Como", lat: 45.4642, lng: 9.1900 },
                            { name: "🌊 Napoli (Costa)", lat: 40.8522, lng: 14.26815 },
                            { name: "⛵ Bari (Puglia)", lat: 41.1171, lng: 16.8719 },
                            { name: "🎯 Palermo (Sicilia)", lat: 38.1157, lng: 13.3615 }
                          ].map(preset => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => {
                                setOsmCenterLat(preset.lat);
                                setOsmCenterLng(preset.lng);
                              }}
                              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 font-bold rounded-lg text-[10px] transition-all cursor-pointer select-none"
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Distance Radius range selector */}
                      <div className="border border-slate-155 rounded-2xl p-4 bg-stone-50/50 hover:bg-stone-50/80 transition-all space-y-3 mt-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-705">Raggio di azione:</span>
                          <span className="font-mono bg-sky-50 text-sky-700 font-extrabold px-2 py-0.5 rounded-lg text-xs leading-none">
                            {osmImportRadius} km
                          </span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="40"
                          step="5"
                          value={osmImportRadius}
                          onChange={(e) => setOsmImportRadius(parseInt(e.target.value))}
                          className="w-full accent-sky-600 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-zinc-400 font-bold select-none">
                          <span>5 km</span>
                          <span>20 km</span>
                          <span>40 km</span>
                        </div>
                      </div>

                      {/* Run Action */}
                      <div className="pt-3">
                        <button
                          type="button"
                          disabled={osmIsImporting}
                          onClick={() => handleImportFromOSM(osmCenterLat, osmCenterLng, osmImportRadius)}
                          className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-300 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer uppercase tracking-wider"
                        >
                          <Download className="w-4 h-4" />
                          {osmIsImporting ? "Inizializzazione interrogazione Overpass QL..." : "Esegui Importazione OSM"}
                        </button>
                      </div>

                      {/* Loaders and feedbacks */}
                      {osmIsImporting && (
                        <div className="bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-100 flex items-center gap-2 font-bold text-xs animate-pulse">
                          <div className="w-4.5 h-4.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                          <span>Scaricamento geometrie in corso. La query richiede circa 5-10 secondi sul server centrale OSM...</span>
                        </div>
                      )}

                      {osmImportSuccessCount !== null && (
                        <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-xl border border-emerald-100 font-bold text-xs space-y-1">
                          <p className="font-extrabold text-emerald-950 text-sm">🎉 Risultato Importazione</p>
                          {osmImportSuccessCount > 0 ? (
                            <p>Abbiamo decodificato ed aggiunto con successo <span className="underline font-black">{osmImportSuccessCount}</span> nuovi punti sosta, camper service e camping alla mappa del tuo CamperLife offline!</p>
                          ) : (
                            <p>Tutti i punti OpenStreetMap per le coordinate ed il raggio inquadrati sono già stati incamerati. Nessun duplicato inserito.</p>
                          )}
                        </div>
                      )}

                      {osmImportError && (
                        <div className="bg-rose-50 text-rose-850 p-3 rounded-xl border border-rose-100 font-bold text-xs">
                          ❌ Errore: {osmImportError}
                        </div>
                      )}

                    </div>
                  </div>
                )}

                {adminSubTab === 'users' && (
                  <div className="p-5 flex-1 overflow-y-auto space-y-4 shrink min-h-0">
                    <div className="space-y-4 font-sans">
                      <div className="bg-rose-50/50 text-rose-950 rounded-2xl p-4 border border-rose-100 text-xs leading-relaxed space-y-2">
                        <h4 className="font-extrabold text-sm text-rose-900 flex items-center gap-2">
                          <Users className="w-4 h-4 text-rose-700 shrink-0" />
                          Anagrafica Camperisti Iscritti
                        </h4>
                        <p>
                          Da questa sezione puoi visualizzare l'elenco degli utenti registrati, i dati personali forniti e la data della loro iscrizione.
                        </p>
                      </div>

                      {/* Search Bar & Stats */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-1">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                          <input
                            type="text"
                            placeholder="Cerca utente per nickname, email o nome..."
                            value={adminUsersSearch}
                            onChange={(e) => setAdminUsersSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-rose-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={fetchAdminUsers}
                          disabled={adminUsersLoading}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shrink-0"
                        >
                          <Database className="w-3.5 h-3.5 text-slate-500" />
                          {adminUsersLoading ? "Caricamento..." : "Ricarica"}
                        </button>
                      </div>

                      {/* Users Count and Alert for New Users */}
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                        <span>Totale Iscritti: {adminUsers.length}</span>
                        {adminUsers.filter(u => {
                          const registrationTime = new Date(u.createdAt || 0).getTime();
                          const differenceInHrs = (Date.now() - registrationTime) / (1000 * 60 * 60);
                          return differenceInHrs <= 24;
                        }).length > 0 && (
                          <span className="bg-[#E11D48] text-white font-extrabold px-2 py-0.5 rounded-full text-[9px] animate-pulse">
                            🆕 Nuove registrazioni nelle ultime 24h: {
                              adminUsers.filter(u => {
                                const registrationTime = new Date(u.createdAt || 0).getTime();
                                const differenceInHrs = (Date.now() - registrationTime) / (1000 * 60 * 60);
                                return differenceInHrs <= 24;
                              }).length
                            }
                          </span>
                        )}
                      </div>

                      {/* Users list / grid */}
                      {adminUsersLoading ? (
                        <div className="text-center py-12 text-xs text-slate-400 font-bold animate-pulse">
                          Recuperando l'elenco dei camperisti iscritti nel database...
                        </div>
                      ) : adminUsers.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl">
                          <p className="text-xs text-slate-400 font-bold">Nessun utente registrato nel sistema.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {adminUsers
                            .filter(u => {
                              const s = adminUsersSearch.toLowerCase().trim();
                              if (!s) return true;
                              return (
                                u.nickname?.toLowerCase().includes(s) ||
                                u.email?.toLowerCase().includes(s) ||
                                u.name?.toLowerCase().includes(s) ||
                                u.surname?.toLowerCase().includes(s)
                              );
                            })
                            .map((u) => {
                              // Check if registered within 48 hours for highlight
                              const registrationTime = new Date(u.createdAt || 0).getTime();
                              const isNew = (Date.now() - registrationTime) / (1000 * 60 * 60) <= 48;
                              
                              return (
                                <div
                                  key={u.email}
                                  className={`border rounded-2xl p-4 transition-all relative ${
                                    isNew 
                                      ? 'bg-rose-50/20 border-rose-200 hover:border-rose-300' 
                                      : 'bg-white border-slate-150 hover:border-slate-300'
                                  }`}
                                >
                                  {isNew && (
                                    <span className="absolute top-3 right-3 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider select-none animate-bounce">
                                      Nuovo
                                    </span>
                                  )}
                                  
                                  <div className="space-y-2">
                                    <div className="flex items-start gap-2.5">
                                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 capitalize text-sm select-none shrink-0">
                                        {u.name ? u.name[0] : (u.nickname ? u.nickname[0] : 'U')}
                                      </div>
                                      <div className="min-w-0">
                                        <h5 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5 flex-wrap">
                                          <span>{u.nickname || 'Senza Nickname'}</span>
                                          <span className="text-[10px] text-slate-400 font-normal">({u.email})</span>
                                        </h5>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                          <strong>Nominativo:</strong> {u.name || 'N/D'} {u.surname || 'N/D'}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-50/50 p-2.5 rounded-xl text-[10.5px]">
                                      <div>
                                        <span className="text-slate-400 font-bold block">Registrato il:</span>
                                        <span className="font-semibold text-slate-700">
                                          {u.createdAt ? new Date(u.createdAt).toLocaleString('it-IT') : 'N/D'}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 font-bold block">Nascita:</span>
                                        <span className="font-semibold text-slate-705">
                                          {u.dob ? new Date(u.dob).toLocaleDateString('it-IT') : 'N/D'}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 font-bold block">Preferiti salvati:</span>
                                        <span className="font-semibold text-slate-700">{u.favoritesCount || 0} soste</span>
                                      </div>
                                      <div
                                        onClick={() => fetchUserProposals(u.email)}
                                        className="cursor-pointer hover:bg-rose-50 p-1 rounded-lg transition-all border border-transparent hover:border-rose-200"
                                        title="Clicca per visualizzare le proposte di questo utente"
                                      >
                                        <span className="text-slate-400 font-bold block flex items-center gap-1">
                                          Proposte sosta: <span className="text-[9px] bg-rose-500 text-white rounded px-1 scale-90 origin-left">VEDI</span>
                                        </span>
                                        <span className="font-extrabold text-[#E11D48] underline decoration-dotted">
                                          {u.proposalsCount || 0} proposte
                                        </span>
                                      </div>
                                    </div>

                                    {/* Delete Button */}
                                    <div className="flex justify-end pt-1">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteAdminUser(u.email)}
                                        className="text-[10px] text-rose-650 hover:text-rose-800 font-bold flex items-center gap-1 px-2.5 py-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3" />
                                        <span>Rimuovi Camperista</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {showUserProposalsModal && selectedUserEmailForProposals && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-slate-100 font-sans">
                      {/* Header */}
                      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-emerald-600" />
                            <span>Proposte di Sosta</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Gestisci e analizza le proposte inviate da <strong className="text-rose-750">{selectedUserEmailForProposals}</strong>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserProposalsModal(false);
                            setSelectedUserEmailForProposals(null);
                            setUserProposals([]);
                          }}
                          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-xs cursor-pointer transition"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Proposals List Pane */}
                      <div className="p-5 overflow-y-auto flex-1 space-y-3 min-h-0 bg-slate-50/50">
                        {userProposalsLoading ? (
                          <div className="text-center py-12 text-xs text-slate-450 font-bold animate-pulse">
                            Caricamento proposte del camperista...
                          </div>
                        ) : userProposals.length === 0 ? (
                          <div className="text-center py-12 border border-dashed border-slate-200 bg-white rounded-2xl p-6">
                            <p className="text-xs text-slate-400 font-bold">Nessuna proposta inviata da questo utente.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {userProposals.map((prop) => (
                              <div key={prop.id} className="bg-white border border-slate-150 rounded-2xl p-4 shadow-xs hover:border-slate-300 transition-all">
                                <div className="flex flex-col sm:flex-row gap-4">
                                  {prop.imageUrl && (
                                    <img
                                      src={prop.imageUrl}
                                      alt={prop.name}
                                      className="w-full sm:w-28 h-20 object-cover rounded-xl border border-slate-100 shrink-0"
                                      referrerPolicy="no-referrer"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <h5 className="font-extrabold text-xs text-slate-800">{prop.name}</h5>
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                        prop.status === 'approved' 
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                                      }`}>
                                        {prop.status === 'approved' ? 'Approvata' : 'In Sospeso'}
                                      </span>
                                    </div>
                                    <div className="text-[10.5px] text-zinc-500 font-medium">
                                      <span>Categoria: <strong>{prop.category}</strong></span>
                                      {prop.address && <span className="block italic text-zinc-400 mt-0.5">{prop.address}</span>}
                                    </div>
                                    <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1">
                                      <span>Lat: {prop.lat?.toFixed(5)}</span>
                                      <span>Lng: {prop.lng?.toFixed(5)}</span>
                                      <span>Tariffa: <strong className="text-slate-600">{prop.priceInfo}</strong></span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserProposalsModal(false);
                            setSelectedUserEmailForProposals(null);
                            setUserProposals([]);
                          }}
                          className="px-4 py-2 bg-[#3E4A35] hover:bg-[#3E4A35]/90 text-white font-bold text-xs rounded-xl cursor-pointer transition shadow-xs"
                        >
                          Chiudi Elenco
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Secure admin foot panel controls */}
                <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50 shrink-0 select-none">
                  <button
                    onClick={() => {
                      setIsAdminLoggedIn(false);
                      setAdminPassword('');
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl font-bold text-xs select-none transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnetti Amministratore</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdminPanel(false)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 transition cursor-pointer"
                  >
                    Chiudi
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Toast System */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-36 md:bottom-24 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-slate-900/95 backdrop-blur-md text-white px-4 py-3.5 rounded-2xl shadow-2xl border border-slate-700/60 z-[10001] flex items-start gap-3"
          >
            <div className="flex-1 text-xs font-bold leading-relaxed">
              {toastMessage}
            </div>
            <button
               onClick={() => setToastMessage(null)}
               className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider shrink-0 px-2 cursor-pointer"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zoomed Screenshot Full Image Modal */}
      <AnimatePresence>
        {fullImageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 z-[10005] flex items-center justify-center p-4 backdrop-blur-xs select-none"
            onClick={() => setFullImageModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-stone-900 border border-white/10 flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={fullImageModal} 
                alt="Allegato Fullscreen" 
                className="max-w-full max-h-[85vh] object-contain rounded-t-2xl" 
              />
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setFullImageModal(null)}
                  className="p-2.5 bg-black/60 hover:bg-black/80 border border-white/10 text-white rounded-full transition cursor-pointer flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GPS Weather Detailed Modal */}
      <AnimatePresence>
        {showGPSWeatherModal && userLocation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setShowGPSWeatherModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200/80 p-5 flex flex-col relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowGPSWeatherModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md">
                  METEO POSIZIONE GPS
                </span>
                <h3 className="text-lg font-black text-slate-800 mt-2">La tua Posizione</h3>
                <p className="text-[11px] font-mono text-slate-500">
                  Lat: {userLocation.lat.toFixed(5)}° · Lng: {userLocation.lng.toFixed(5)}°
                </p>
              </div>

              {/* Render the full-fledged, custom component we created! */}
              <WeatherWidget lat={userLocation.lat} lng={userLocation.lng} placeName="La tua posizione" />

              <button
                onClick={() => setShowGPSWeatherModal(false)}
                className="mt-4 w-full py-3 bg-[#3E4A35] hover:bg-[#5A6B4E] active:bg-[#2e3725] text-white font-extrabold rounded-2xl transition-all cursor-pointer text-xs uppercase tracking-wider shadow-md"
              >
                Chiudi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
