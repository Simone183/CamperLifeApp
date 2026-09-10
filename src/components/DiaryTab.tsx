import React from "react";
import { useAppSettings } from "../useAppSettings";
import { getCurrencySymbol, formatDistance, getDistanceUnit, getFuelEfficiencyUnit, getFuelEfficiencyValue, formatCurrency } from "../unit-helpers";
import { Trip, DiaryExpense, DiaryPhoto, Place, DiaryMovement, TripMovement } from "../types";
import { normalizeTrip, mergeTrips, recordDeletedId, getDeletedIds, isDeletedId } from "../utils/tripSyncHelper";
import { compressImage } from "../utils/photoCompressor";
import { savePhotoToIndexedDB, getAllPhotosFromIndexedDB, pruneIndexedDBCache } from "../utils/photoStorage";
import { resolveMediaUrl, resolveApiUrl } from "../utils/resolveMediaUrl";
import { CamperImage } from "./CamperImage";
import { TripRouteMap } from "./TripRouteMap";
import { RollyOnboardingGuide } from "./RollyOnboardingGuide";
import { CartoonCamperAvatar } from "./CartoonCamperAvatar";
import { generateTripPDF, exportAIItineraryToPDF } from "../utils/pdfGenerator";
import { formatDateDDMMAA } from "./FuelCardTab";
import {
  BookOpen,
  Plus,
  Trash2,
  Camera,
  Euro,
  Calendar,
  TrendingUp,
  Image as ImageIcon,
  Share2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  ArrowRight,
  Upload,
  Loader2,
  Edit3,
  Save,
  Eye,
  X,
  Fuel,
  Route,
  Navigation,
  Printer,
  FileDown,
  Pencil,
  Map as MapIcon,
  Sparkles,
  RefreshCw,
  Cloud,
  CloudOff,
  Database,
  CheckCircle2,
  AlertCircle,
  Download,
  FileText,
  Check,
} from "lucide-react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useFamilyCrew } from "../context/FamilyCrewContext";
import { FamilyCrewTabBanner } from "./FamilyCrewModal";

const PHOTO_PRESETS = [
  {
    name: "Tramonto in Maremma 🌅",
    url: "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600",
  },
  {
    name: "Dolomiti del Cadore 🏔️",
    url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=600",
  },
  {
    name: "Costa d'Argento 🌊",
    url: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&q=80&w=600",
  },
  {
    name: "Campeggio Sotto le Stelle ✨",
    url: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=600",
  },
];

const INITIAL_TRIPS: Trip[] = [
  {
    id: "t1",
    title: "ESEMPIO: Weekend d'Autunno in Val d'Orcia",
    startDate: "2025-10-10",
    endDate: "2025-10-12",
    description:
      "Questo è un viaggio di esempio per mostrarti come funziona il diario. Puoi modificarlo o cancellarlo in qualsiasi momento.",
    startOdometer: 124500,
    endOdometer: 124820,
    status: "Completato",
    expenses: [
      {
        id: "te1",
        title: "Gasolio Eni Siena",
        amount: 55.0,
        category: "Carburante",
        date: "2025-10-10",
      },
      {
        id: "te2",
        title: "Sosta Pienza comunale",
        amount: 12.0,
        category: "Sosta",
        date: "2025-10-11",
      },
      {
        id: "te3",
        title: "Pranzo Tipico Trattoria",
        amount: 48.0,
        category: "Cibo",
        date: "2025-10-11",
      },
    ],
    photos: [
      {
        id: "tp1",
        url: "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600",
        description:
          "Il nostro amato mansardato immerso nell'abbraccio dorato dei cipressi toscani.",
        date: "2025-10-11",
      },
    ],
    movements: [],
    routePoints: [
      { lat: 43.318, lng: 11.330, name: "Siena (Partenza) 🏰" },
      { lat: 43.058, lng: 11.606, name: "San Quirico d'Orcia 🌳" },
      { lat: 43.076, lng: 11.678, name: "Pienza (Borgo Storico) 🧀" },
      { lat: 43.092, lng: 11.782, name: "Montepulciano (Vigneti) 🍷" }
    ],
  },
];

interface DiaryTabProps {
  currentUser?: { email: string; nickname?: string } | null;
  initialTripId?: string | null;
  initialSubTab?: "list" | "details" | "album";
  onNavigateToPlace: (place: Place) => void;
  onNavigateToAIItinerary?: () => void;
  trips?: Trip[];
  setTrips?: (trips: Trip[]) => void;
  onOpenCrewModal?: () => void;
}

export default function DiaryTab({
  currentUser,
  initialTripId,
  initialSubTab,
  onNavigateToPlace,
  onNavigateToAIItinerary,
  trips: propsTrips,
  setTrips: propsSetTrips,
  onOpenCrewModal,
}: DiaryTabProps) {
  const settings = useAppSettings();
  const { currentCrew, syncCrewSection, isModuleSynced } = useFamilyCrew();
  const emailKey = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';

  const [internalTrips, setInternalTrips] = React.useState<Trip[]>(() => {
    if (propsTrips !== undefined) return propsTrips;
    if (emailKey) {
      const saved = localStorage.getItem(`camper_trips_${emailKey}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
      }
      return [];
    }
    return [];
  });

  // Keep internal state aligned when propsTrips changes from App.tsx
  React.useEffect(() => {
    if (propsTrips !== undefined) {
      setInternalTrips(propsTrips);
    }
  }, [propsTrips]);

  // When emailKey changes, reset or load scoped trips
  React.useEffect(() => {
    if (propsTrips === undefined) {
      if (emailKey) {
        const saved = localStorage.getItem(`camper_trips_${emailKey}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              setInternalTrips(parsed);
              return;
            }
          } catch {}
        }
      }
      setInternalTrips([]);
    }
  }, [emailKey, propsTrips]);

  const trips = propsTrips !== undefined ? propsTrips : internalTrips;
  const setTrips = propsSetTrips || setInternalTrips;

  const tripsRef = React.useRef(trips);
  React.useEffect(() => {
    tripsRef.current = trips;
  }, [trips]);

  // Selected Trip inside details view
  const [selectedTripId, setSelectedTripId] = React.useState<string | null>(
    () => {
      if (initialTripId) return initialTripId;
      return trips.length > 0 ? trips[0].id : null;
    },
  );

  // Sync selectedTripId when trips or initialTripId changes
  React.useEffect(() => {
    if (initialTripId) {
      setSelectedTripId(initialTripId);
    } else if (selectedTripId && !trips.some((t) => t.id === selectedTripId)) {
      setSelectedTripId(trips.length > 0 ? trips[0].id : null);
    } else if (!selectedTripId && trips.length > 0) {
      setSelectedTripId(trips[0].id);
    }
  }, [trips, initialTripId, selectedTripId]);

  // Sub-tab selection inside travel diary ('list' contains list/creation of trips, 'details' contains active trip details, 'album' contains global photos)
  const [diarySubTab, setDiarySubTab] = React.useState<"list" | "details" | "album">(
    () => {
      if (initialSubTab) return initialSubTab as "list" | "details" | "album";
      return "list";
    },
  );

  const [isSyncingCloud, setIsSyncingCloud] = React.useState(false);
  const isSyncingInProgressRef = React.useRef(false);
  const pendingSyncAfterCurrentRef = React.useRef(false);
  const [autoSyncState, setAutoSyncState] = React.useState<"idle" | "saving" | "synced" | "offline" | "error">("idle");
  const [lastSyncedTime, setLastSyncedTime] = React.useState<string>("");
  const isInitialSyncMounted = React.useRef(false);
  const lastSyncedTripsHashRef = React.useRef<string>("");
  const autoSyncDebounceTimerRef = React.useRef<any>(null);
  const [showSyncModal, setShowSyncModal] = React.useState(false);
  const [cloudStatusInfo, setCloudStatusInfo] = React.useState<{
    loading: boolean;
    expenses?: number;
    movements?: number;
    photos?: number;
    trips?: number;
    error?: string;
  } | null>(null);

  const computeTripsFingerprint = React.useCallback((tripsList: Trip[]): string => {
    if (!Array.isArray(tripsList) || tripsList.length === 0) return "";
    return tripsList
      .map((t) => {
        const expStr = (t.expenses || [])
          .map((e) => `${e.id || ''}_${e.amount || 0}_${e.category || ''}_${e.date || ''}`)
          .sort()
          .join(",");
        const movStr = (t.movements || [])
          .map((m) => `${m.id || ''}_${m.location || ''}_${m.odometer || ''}_${m.date || ''}`)
          .sort()
          .join(",");
        const phoStr = (t.photos || [])
          .map((p) => `${p.id || p.url || ''}`)
          .sort()
          .join(",");
        const stpStr = (t.stops || [])
          .map((s) => `${s.id || ''}_${s.name || ''}`)
          .sort()
          .join(",");
        return `${t.id}:${t.title || ''}:${t.startDate || ''}:${t.endDate || ''}:${t.startOdometer || 0}:${t.endOdometer || 0}:${t.status || ''}:[${expStr}]:[${movStr}]:[${phoStr}]:[${stpStr}]`;
      })
      .sort()
      .join("|");
  }, []);

  const getActiveUserEmail = () => {
    return (
      currentUser?.email ||
      localStorage.getItem("camper_user_email") ||
      (() => {
        try {
          const u = localStorage.getItem("camper_user");
          return u ? JSON.parse(u).email : "";
        } catch {
          return "";
        }
      })() ||
      "sambucci.simone@gmail.com"
    ).toLowerCase().trim();
  };

  const syncWithCloud = React.useCallback(
    async (tripsToSync: Trip[], isManual = false) => {
      const cleanEmail = getActiveUserEmail();
      if (!cleanEmail) return;

      if (!navigator.onLine) {
        setAutoSyncState("offline");
        if (isManual) {
          window.dispatchEvent(
            new CustomEvent("show-toast", {
              detail: {
                message: "📴 Dispositivo offline: i dati sono salvati al sicuro sul telefono e verranno sincronizzati appena torni online.",
              },
            })
          );
        }
        return;
      }

      if (isSyncingInProgressRef.current) {
        console.log("[Cloud Sync] Sync already in progress, queuing follow-up sync.");
        pendingSyncAfterCurrentRef.current = true;
        return;
      }
      isSyncingInProgressRef.current = true;

      if (isManual) {
        setIsSyncingCloud(true);
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message: "⏳ Sincronizzazione con il Cloud in corso...",
            },
          })
        );
      }
      setAutoSyncState("saving");

      const watchdogTimer = setTimeout(() => {
        if (isSyncingInProgressRef.current) {
          console.warn("[Cloud Sync] Safety watchdog triggered, resetting sync states.");
          isSyncingInProgressRef.current = false;
          setIsSyncingCloud(false);
          setAutoSyncState("idle");
        }
      }, 16000);

      try {
        const deletedIds = {
          photos: Array.from(getDeletedIds('photos', cleanEmail)),
          expenses: Array.from(getDeletedIds('expenses', cleanEmail)),
          movements: Array.from(getDeletedIds('movements', cleanEmail)),
          trips: Array.from(getDeletedIds('trips', cleanEmail)),
        };

        // Direct sync with server (server loads existing backup, deep merges, and writes to Firestore & disk)
        const res = await fetch("/api/user-trips/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, trips: tripsToSync, deletedIds }),
          signal: AbortSignal.timeout(15000),
        });

        let finalTrips = tripsToSync;
        if (res.ok) {
          const resData = await res.json().catch(() => ({}));
          if (resData.trips && Array.isArray(resData.trips)) {
            finalTrips = resData.trips.map((t: Trip) => normalizeTrip(t, cleanEmail));
          }
        }

        const newHash = computeTripsFingerprint(finalTrips);
        lastSyncedTripsHashRef.current = newHash;

        if (computeTripsFingerprint(tripsRef.current) !== newHash) {
          setTrips(finalTrips);
        }

        try {
          localStorage.setItem(`camper_trips_${cleanEmail}`, JSON.stringify(finalTrips));
        } catch (e) {}

        if (currentCrew && isModuleSynced("trips")) {
          syncCrewSection("trips", finalTrips).catch(() => {});
        }

        // Record last sync time & state
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setLastSyncedTime(timeStr);
        setAutoSyncState("synced");

        // Return to idle after 3.5 seconds so button displays clean synced state
        setTimeout(() => {
          setAutoSyncState((prev) => (prev === "synced" ? "idle" : prev));
        }, 3500);

        // Notify App and other components (without emitting sync-trips-now to prevent infinite loop)
        window.dispatchEvent(
          new CustomEvent("trip-updated", {
            detail: { trips: finalTrips },
          })
        );

        if (isManual) {
          const totExp = finalTrips.reduce((acc, t) => acc + (t.expenses?.length || 0), 0);
          const totMov = finalTrips.reduce((acc, t) => acc + (t.movements?.length || 0), 0);
          const totPho = finalTrips.reduce((acc, t) => acc + (t.photos?.length || 0), 0);

          setCloudStatusInfo({
            loading: false,
            trips: finalTrips.length,
            expenses: totExp,
            movements: totMov,
            photos: totPho,
          });

          window.dispatchEvent(
            new CustomEvent("show-toast", {
              detail: {
                message: `☁️ Sincronizzazione completata! ${finalTrips.length} viaggi, ${totExp} spese, ${totMov} tappe e ${totPho} foto sincronizzate.`,
              },
            })
          );
        }
      } catch (e) {
        console.warn("[Cloud Sync] Error during sync:", e);
        setAutoSyncState(navigator.onLine ? "error" : "offline");
        setTimeout(() => {
          setAutoSyncState((prev) => (prev === "error" ? "idle" : prev));
        }, 5000);
        if (isManual) {
          window.dispatchEvent(
            new CustomEvent("show-toast", {
              detail: {
                message: "⚠️ Errore o timeout durante la sincronizzazione. Riprova più tardi.",
              },
            })
          );
        }
      } finally {
        clearTimeout(watchdogTimer);
        isSyncingInProgressRef.current = false;
        setIsSyncingCloud(false);
        if (pendingSyncAfterCurrentRef.current) {
          pendingSyncAfterCurrentRef.current = false;
          setTimeout(() => {
            syncWithCloud(tripsRef.current, false);
          }, 400);
        }
      }
    },
    [currentCrew, isModuleSynced, emailKey, computeTripsFingerprint]
  );

  const handleCloudSyncClick = () => {
    syncWithCloud(tripsRef.current, true);
  };

  const handleExportBackupJson = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trips, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `viaggi_camper_backup_${new Date().toISOString().split("T")[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "📥 File di backup salvato! Invialo al tablet o conservalo." },
        })
      );
    } catch (e) {
      console.error("Backup export error:", e);
    }
  };

  const handleImportBackupJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const imported = JSON.parse(text);
        if (Array.isArray(imported)) {
          const cleanEmail = getActiveUserEmail();
          const merged = mergeTrips(trips, imported, cleanEmail);
          setTrips(merged);
          localStorage.setItem(`camper_trips_${cleanEmail}`, JSON.stringify(merged));
          
          await fetch("/api/user-trips/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: cleanEmail, trips: merged }),
          }).catch(() => {});
          
          const totExp = merged.reduce((acc, t) => acc + (t.expenses?.length || 0), 0);
          window.dispatchEvent(
            new CustomEvent("show-toast", {
              detail: { message: `✅ Backup importato! Presenti ${totExp} spese e viaggi aggiornati.` },
            })
          );
        } else {
          alert("Il file non contiene un elenco di viaggi valido.");
        }
      } catch (err) {
        alert("Errore nella lettura del file JSON di backup.");
      }
    };
    reader.readAsText(file);
  };

  const checkCloudStatus = async () => {
    setCloudStatusInfo({ loading: true });
    const cleanEmail = getActiveUserEmail();
    try {
      const res = await fetch(`/api/user-trips/${encodeURIComponent(cleanEmail)}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = await res.json();
        const cTrips = Array.isArray(data?.trips) ? data.trips : [];
        const exp = cTrips.reduce((acc: number, t: any) => acc + (t.expenses?.length || 0), 0);
        const mov = cTrips.reduce((acc: number, t: any) => acc + (t.movements?.length || 0), 0);
        const pho = cTrips.reduce((acc: number, t: any) => acc + (t.photos?.length || 0), 0);
        setCloudStatusInfo({
          loading: false,
          trips: cTrips.length,
          expenses: exp,
          movements: mov,
          photos: pho,
        });
      } else {
        setCloudStatusInfo({ loading: false, error: "Server non raggiungibile." });
      }
    } catch (err: any) {
      setCloudStatusInfo({ loading: false, error: err.message || "Errore di connessione." });
    }
  };

  // UI forms toggles
  const [showAddTrip, setShowAddTrip] = React.useState(false);

  // New Trip form state
  const [newTitle, setNewTitle] = React.useState("");
  const [newStart, setNewStart] = React.useState("");
  const [newEnd, setNewEnd] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [newStatus, setNewStatus] =
    React.useState<Trip["status"]>("Completato");
  const [newStartOdo, setNewStartOdo] = React.useState("");
  const [newEndOdo, setNewEndOdo] = React.useState("");

  // New Expense form state
  const [expenseTitle, setExpenseTitle] = React.useState("");
  const [expenseAmount, setExpenseAmount] = React.useState("");
  const [expenseCategory, setExpenseCategory] =
    React.useState<DiaryExpense["category"]>("Autostrada");
  const [expenseDate, setExpenseDate] = React.useState("");
  const [editingExpenseId, setEditingExpenseId] = React.useState<string | null>(null);

  // Fuel-specific states
  const expenseFormRef = React.useRef<HTMLFormElement>(null);
  const [fuelLiters, setFuelLiters] = React.useState("");
  const [fuelPricePerLiter, setFuelPricePerLiter] = React.useState("");
  const [fuelOdometer, setFuelOdometer] = React.useState("");
  const [fuelCompany, setFuelCompany] = React.useState("Eni");
  const [fuelIsFullTank, setFuelIsFullTank] = React.useState(false);
  const [expenseSubMode, setExpenseSubMode] = React.useState<
    "general" | "refuel" | "movement" | "planned" | "photo"
  >("general");

  // Movement-specific states
  const [movementOdometer, setMovementOdometer] = React.useState("");
  const [movementLocation, setMovementLocation] = React.useState("");
  const [movementDate, setMovementDate] = React.useState("");
  const [movementNotes, setMovementNotes] = React.useState("");
  const [editingMovementId, setEditingMovementId] = React.useState<string | null>(null);
  const [editingOdoId, setEditingOdoId] = React.useState<string | null>(null);
  const [tempOdoValue, setTempOdoValue] = React.useState<string>("");

  // New Photo Form state
  const [photoDesc, setPhotoDesc] = React.useState("");
  const [photoLocationName, setPhotoLocationName] = React.useState("");
  const [photoPresetUrl, setPhotoPresetUrl] = React.useState(
    PHOTO_PRESETS[0].url,
  );
  const [photoCustomUrl, setPhotoCustomUrl] = React.useState("");
  const [photoType, setPhotoType] = React.useState<"upload" | "preset" | "url">(
    "upload",
  );
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = React.useState<string>("");
  const [uploadedImages, setUploadedImages] = React.useState<Array<{ url: string; name: string }>>([]);
  const [dragActive, setDragActive] = React.useState(false);

  // Album Foto search, filter, and lightbox states
  const [selectedAlbumTripId, setSelectedAlbumTripId] = React.useState<string>("");
  const [albumSearchQuery, setAlbumSearchQuery] = React.useState<string>("");
  const [selectedAlbumPhotoIndex, setSelectedAlbumPhotoIndex] = React.useState<number | null>(null);

  // Active Trip Editing states
  const [isEditingTrip, setIsEditingTrip] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState("");
  const [editStart, setEditStart] = React.useState("");
  const [editEnd, setEditEnd] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");
  const [editStatus, setEditStatus] =
    React.useState<Trip["status"]>("Completato");
  const [editStartOdo, setEditStartOdo] = React.useState("");
  const [editEndOdo, setEditEndOdo] = React.useState("");

  // Lightbox index/photo selection state
  const [selectedLightboxPhotoIndex, setSelectedLightboxPhotoIndex] =
    React.useState<number | null>(null);

  // State to control Custom Delete Confirmation Modal
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [photoToDelete, setPhotoToDelete] = React.useState<string | null>(null);
  const [showDeleteAllPhotosConfirm, setShowDeleteAllPhotosConfirm] = React.useState(false);

  // Photo Edit Details Modal State
  const [photoToEdit, setPhotoToEdit] = React.useState<DiaryPhoto | null>(null);
  const [editPhotoDesc, setEditPhotoDesc] = React.useState("");
  const [editPhotoLoc, setEditPhotoLoc] = React.useState("");
  const [editPhotoDate, setEditPhotoDate] = React.useState("");

  // PDF Export Modal State
  const [showPdfExportModal, setShowPdfExportModal] = React.useState(false);
  const [pdfPaperSize, setPdfPaperSize] = React.useState<"a4" | "a5">("a4");
  const [pdfIncludeMovements, setPdfIncludeMovements] = React.useState(true);
  const [pdfIncludeExpenses, setPdfIncludeExpenses] = React.useState(true);
  const [pdfIncludePhotos, setPdfIncludePhotos] = React.useState(true);
  const [pdfRingBinderMargin, setPdfRingBinderMargin] = React.useState(true);
  const [pdfShowHoleGuides, setPdfShowHoleGuides] = React.useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

  React.useEffect(() => {
    if (emailKey) {
      try {
        localStorage.setItem(`camper_trips_${emailKey}`, JSON.stringify(trips));
      } catch (e) {
        console.error("Error writing trips in DiaryTab:", e);
      }
    }

    // Sync to Family Crew if member
    const handler = setTimeout(() => {
      if (currentCrew && isModuleSynced('trips') && Array.isArray(currentCrew.sharedData?.trips)) {
        const isAlreadySynced = JSON.stringify(trips) === JSON.stringify(currentCrew.sharedData.trips);
        if (!isAlreadySynced) {
          syncCrewSection('trips', trips).catch(() => {});
        }
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [trips, currentCrew?.sharedData?.trips, isModuleSynced, emailKey]);

  // Autonomous Background Auto-Sync to Cloud whenever trips change (photos, expenses, stages, etc.)
  React.useEffect(() => {
    const currentHash = computeTripsFingerprint(trips);

    // Skip on initial mount
    if (!isInitialSyncMounted.current) {
      isInitialSyncMounted.current = true;
      lastSyncedTripsHashRef.current = currentHash;
      return;
    }

    // Don't sync if data hasn't changed or is empty
    if (!currentHash || trips.length === 0 || lastSyncedTripsHashRef.current === currentHash) {
      return;
    }

    if (!navigator.onLine) {
      setAutoSyncState("offline");
      return;
    }

    if (autoSyncDebounceTimerRef.current) {
      clearTimeout(autoSyncDebounceTimerRef.current);
    }

    // Debounce by 2000ms to batch sequential user actions (typing, adding multiple photos/expenses)
    autoSyncDebounceTimerRef.current = setTimeout(() => {
      syncWithCloud(tripsRef.current, false);
    }, 2000);

    return () => {
      if (autoSyncDebounceTimerRef.current) {
        clearTimeout(autoSyncDebounceTimerRef.current);
      }
    };
  }, [trips, syncWithCloud, computeTripsFingerprint]);

  // When device recovers internet connectivity, automatically sync pending local updates
  React.useEffect(() => {
    const handleOnline = () => {
      if (
        lastSyncedTripsHashRef.current !== computeTripsFingerprint(tripsRef.current) ||
        autoSyncState === "offline"
      ) {
        syncWithCloud(tripsRef.current, false);
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [autoSyncState, syncWithCloud, computeTripsFingerprint]);

  // Sync incoming trips from Family Crew without overwriting local trip updates
  React.useEffect(() => {
    if (currentCrew && isModuleSynced('trips') && Array.isArray(currentCrew.sharedData?.trips)) {
      const merged = mergeTrips(tripsRef.current, currentCrew.sharedData!.trips!, emailKey);
      if (JSON.stringify(merged) !== JSON.stringify(tripsRef.current)) {
        setTrips(merged);
      }
    }
  }, [currentCrew?.sharedData?.trips, isModuleSynced, emailKey]);

  React.useEffect(() => {
    const handleOpenPlanned = (e: any) => {
      if (e.detail?.tripId) {
        setSelectedTripId(e.detail.tripId);
      }
      setExpenseSubMode("planned");
    };
    window.addEventListener("open-diary-planned", handleOpenPlanned);
    return () => window.removeEventListener("open-diary-planned", handleOpenPlanned);
  }, []);

  const activeTrip = trips.find((t) => t.id === selectedTripId);

  // Local storage orphan photos state and scanner
  const [localOrphanPhotosCount, setLocalOrphanPhotosCount] = React.useState<number>(0);
  const [isRestoringLocalPhotos, setIsRestoringLocalPhotos] = React.useState<boolean>(false);
  const [isBatchImporting, setIsBatchImporting] = React.useState<boolean>(false);
  const [batchImportProgress, setBatchImportProgress] = React.useState<{ current: number; total: number } | null>(null);

  // Scan IndexedDB for photos stored locally on this device that are missing from activeTrip.photos
  const scanLocalOrphanPhotos = React.useCallback(async () => {
    if (!activeTrip) return 0;
    try {
      const idbPhotos = await getAllPhotosFromIndexedDB();
      const storedIds = Object.keys(idbPhotos);
      if (storedIds.length === 0) {
        setLocalOrphanPhotosCount(0);
        return 0;
      }
      const currentIds = new Set((activeTrip?.photos || []).map((p) => p.id));
      const deletedPhotos = getDeletedIds('photos', emailKey);
      const orphanIds = storedIds.filter((id) => !currentIds.has(id) && !deletedPhotos.has(id));
      setLocalOrphanPhotosCount(orphanIds.length);
      return orphanIds.length;
    } catch (e) {
      console.warn("Scan local photos error:", e);
      return 0;
    }
  }, [activeTrip, emailKey]);

  React.useEffect(() => {
    scanLocalOrphanPhotos();
  }, [scanLocalOrphanPhotos]);

  // Active trip photos strictly filtered from deletions and tombstones
  const activeTripPhotos = React.useMemo(() => {
    if (!activeTrip || !Array.isArray(activeTrip.photos)) return [];
    const deletedPhotos = getDeletedIds('photos', emailKey);
    return activeTrip.photos.filter((p) => {
      if (!p || p.deleted) return false;
      const pId = String(p.id || '');
      const pUrl = String(p.url || '');
      return !deletedPhotos.has(pId) && (!pUrl || !deletedPhotos.has(pUrl));
    });
  }, [activeTrip, emailKey]);

  // Gallery pagination: loads 24 photos at a time for 60fps mobile fluid rendering
  const [visiblePhotosCount, setVisiblePhotosCount] = React.useState<number>(24);

  // Reset pagination when selected trip changes
  React.useEffect(() => {
    setVisiblePhotosCount(24);
  }, [selectedTripId]);

  // Periodic LRU cleanup of old cached photos to keep mobile device memory optimal
  React.useEffect(() => {
    pruneIndexedDBCache(350).catch(() => {});
  }, []);

  const displayedTripPhotos = React.useMemo(() => {
    return activeTripPhotos.slice(0, visiblePhotosCount);
  }, [activeTripPhotos, visiblePhotosCount]);

  // All photos aggregated across all trips, strictly excluding tombstones
  const allPhotos = React.useMemo(() => {
    const deletedPhotos = getDeletedIds('photos', emailKey);
    const photosList: Array<DiaryPhoto & { tripId: string; tripTitle: string }> = [];
    trips.forEach((trip) => {
      if (trip.photos) {
        trip.photos.forEach((photo) => {
          if (photo.deleted) return;
          const photoId = String(photo.id || '');
          const photoUrl = String(photo.url || '');
          if (deletedPhotos.has(photoId) || (photoUrl && deletedPhotos.has(photoUrl))) {
            return;
          }
          photosList.push({
            ...photo,
            tripId: trip.id,
            tripTitle: trip.title,
          });
        });
      }
    });
    // Sort by date descending, fallback to id
    return photosList.sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      if (dateB !== dateA) {
        return dateB.localeCompare(dateA);
      }
      return b.id.localeCompare(a.id);
    });
  }, [trips, emailKey]);

  // Filtered photos based on album search query and selected trip filter
  const filteredPhotos = React.useMemo(() => {
    return allPhotos.filter((photo) => {
      if (photo.deleted) return false;
      const matchTrip = selectedAlbumTripId ? photo.tripId === selectedAlbumTripId : true;
      const searchLower = albumSearchQuery.toLowerCase().trim();
      const matchSearch = searchLower
        ? photo.description.toLowerCase().includes(searchLower) ||
          (photo.locationName && photo.locationName.toLowerCase().includes(searchLower)) ||
          photo.tripTitle.toLowerCase().includes(searchLower)
        : true;
      return matchTrip && matchSearch;
    });
  }, [allPhotos, selectedAlbumTripId, albumSearchQuery]);

  // Global album pagination
  const [visibleAlbumPhotosCount, setVisibleAlbumPhotosCount] = React.useState<number>(36);

  React.useEffect(() => {
    setVisibleAlbumPhotosCount(36);
  }, [albumSearchQuery, selectedAlbumTripId]);

  const displayedAlbumPhotos = React.useMemo(() => {
    return filteredPhotos.slice(0, visibleAlbumPhotosCount);
  }, [filteredPhotos, visibleAlbumPhotosCount]);

  // Refuel / expense stats memo
  const fuelStats = React.useMemo(() => {
    if (!activeTrip)
      return {
        totalFuelCost: 0,
        totalLiters: 0,
        avgPricePerLiter: 0,
        tripDistance: 0,
        kmPerLiter: null,
      };

    const refuels = activeTrip.expenses
      .filter((e) => e.category === "Carburante" && e.liters !== undefined)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalFuelCost = activeTrip.expenses
      .filter((e) => e.category === "Carburante")
      .reduce((sum, e) => sum + e.amount, 0);

    const totalLiters = refuels.reduce((sum, r) => sum + (r.liters || 0), 0);

    let avgPricePerLiter = 0;
    if (totalLiters > 0) {
      const totalWeightedPrice = refuels.reduce(
        (sum, r) => sum + (r.liters || 0) * (r.pricePerLiter || 0),
        0,
      );
      avgPricePerLiter = totalWeightedPrice / totalLiters;
    } else {
      const sampleCost = activeTrip.expenses.filter(
        (e) => e.category === "Carburante",
      );
      if (sampleCost.length > 0) {
        avgPricePerLiter = 1.829; // approximate fallback
      }
    }

    let tripDistance = 0;
    const movements = activeTrip.movements || [];
    const validMovements = movements.filter(
      (m) => typeof m.odometer === "number" && !isNaN(m.odometer) && m.odometer > 0
    ) as Array<Required<Pick<DiaryMovement, 'odometer'>> & DiaryMovement>;

    const allOdometers = [
      ...validMovements.map((m) => m.odometer),
      ...refuels.map((r) => r.odometer),
    ].filter((o): o is number => typeof o === "number" && !isNaN(o) && o > 0);

    if (typeof activeTrip.startOdometer === "number" && !isNaN(activeTrip.startOdometer) && activeTrip.startOdometer > 0) {
      allOdometers.push(activeTrip.startOdometer);
    }
    if (typeof activeTrip.endOdometer === "number" && !isNaN(activeTrip.endOdometer) && activeTrip.endOdometer > 0) {
      allOdometers.push(activeTrip.endOdometer);
    }

    if (allOdometers.length >= 2) {
      const minOdo = Math.min(...allOdometers);
      const maxOdo = Math.max(...allOdometers);
      tripDistance = maxOdo > minOdo ? maxOdo - minOdo : 0;
    }

    let kmPerLiter: number | null = null;
    if (tripDistance > 0 && totalLiters > 0) {
      kmPerLiter = tripDistance / totalLiters;
    }

    return {
      totalFuelCost,
      totalLiters,
      avgPricePerLiter,
      tripDistance,
      kmPerLiter,
    };
  }, [activeTrip]);

  // Create new Trip handler
  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const initialMovements = newStartOdo ? [{
      id: "mov_" + Date.now(),
      odometer: Number(newStartOdo),
      location: "Partenza", 
      date: newStart || new Date().toISOString().split("T")[0],
      notes: "Partenza viaggio",
    }] : [];

    const created: Trip = {
      id: "trip_" + Date.now(),
      title: newTitle,
      startDate: newStart || new Date().toISOString().split("T")[0],
      endDate: newEnd || new Date().toISOString().split("T")[0],
      description: newDesc,
      status: newStatus,
      startOdometer: newStartOdo ? Number(newStartOdo) : undefined,
      endOdometer: newEndOdo ? Number(newEndOdo) : undefined,
      expenses: [],
      photos: [],
      movements: initialMovements,
    };

    const updated = [created, ...trips];
    setTrips(updated);
    setSelectedTripId(created.id);
    setDiarySubTab("details");
    setShowAddTrip(false);

    // Reset fields
    setNewTitle("");
    setNewStart("");
    setNewEnd("");
    setNewDesc("");
    setNewStatus("Completato");
    setNewStartOdo("");
    setNewEndOdo("");
  };

  // Delete Trip handler
  const handleDeleteTrip = (tripId: string) => {
    if (
      confirm(
        "Vuoi davvero eliminare questo viaggio ed eliminare tutte le sue spese e foto?",
      )
    ) {
      recordDeletedId('trips', tripId, emailKey);
      if (tripId === "trip-example-10-oct-2025" && currentUser?.email) {
        localStorage.setItem(`example_deleted_${currentUser.email.toLowerCase().trim()}`, "true");
      }
      const filtered = trips.filter((t) => t.id !== tripId);
      setTrips(filtered);
      if (emailKey) {
        try {
          localStorage.setItem(`camper_trips_${emailKey}`, JSON.stringify(filtered));
        } catch (e) {}
      }
      if (currentCrew && isModuleSynced('trips')) {
        syncCrewSection('trips', filtered).catch(() => {});
      }
      window.dispatchEvent(
        new CustomEvent("trip-updated", {
          detail: { trips: filtered },
        }),
      );
      if (selectedTripId === tripId) {
        const nextId = filtered.length > 0 ? filtered[0].id : null;
        setSelectedTripId(nextId);
        if (!nextId) {
          setDiarySubTab("list");
        }
      }
    }
  };

  // Delete Active Trip handler (called from custom confirm modal in details)
  const handleDeleteActiveTrip = () => {
    if (!selectedTripId) return;
    recordDeletedId('trips', selectedTripId, emailKey);
    const filtered = trips.filter((t) => t.id !== selectedTripId);
    setTrips(filtered);
    if (emailKey) {
      try {
        localStorage.setItem(`camper_trips_${emailKey}`, JSON.stringify(filtered));
      } catch (e) {}
    }
    if (currentCrew && isModuleSynced('trips')) {
      syncCrewSection('trips', filtered).catch(() => {});
    }
    window.dispatchEvent(
      new CustomEvent("trip-updated", {
        detail: { trips: filtered },
      }),
    );
    const nextId = filtered.length > 0 ? filtered[0].id : null;
    setSelectedTripId(nextId);
    setDiarySubTab("list");
    setShowDeleteConfirm(false);
  };

  // Helper to parse odometer input values cleanly even if formatted with dots, spaces or commas
  const parseOdometerInput = (val: string | number | undefined | null): number | undefined => {
    if (val === undefined || val === null) return undefined;
    const str = String(val).trim();
    if (str === "") return undefined;
    const clean = str.replace(/[^0-9]/g, "");
    if (clean === "") return undefined;
    const n = parseInt(clean, 10);
    return isNaN(n) ? undefined : n;
  };

  // Add Expense to Trip handler
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId) return;

    let finalTitle = expenseTitle.trim();
    let finalAmount = parseFloat(expenseAmount.toString().replace(',', '.'));
    let finalCategory = expenseCategory;

    const litersNum = fuelLiters ? parseFloat(fuelLiters.toString().replace(',', '.')) : undefined;
    const pricePerLiterNum = fuelPricePerLiter
      ? parseFloat(fuelPricePerLiter.toString().replace(',', '.'))
      : undefined;
    const odometerNum = parseOdometerInput(fuelOdometer);

    if (expenseSubMode === "refuel") {
      finalCategory = "Carburante";
      const company = (fuelCompany || "Distributore").trim();

      // Compute amount if missing but liters & price exist
      if ((isNaN(finalAmount) || finalAmount <= 0) && litersNum && pricePerLiterNum) {
        finalAmount = Math.round(litersNum * pricePerLiterNum * 100) / 100;
        setExpenseAmount(finalAmount.toFixed(2));
      }

      if (isNaN(finalAmount) || finalAmount <= 0) {
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message:
                "⚠️ Inserisci l'importo speso per registrare il rifornimento!",
            },
          }),
        );
        return;
      }

      const litersText = litersNum ? ` ${litersNum}L` : "";
      const priceText = pricePerLiterNum ? ` @ ${pricePerLiterNum}${getCurrencySymbol(settings)}/L` : "";
      const pienoText = fuelIsFullTank ? " [Pieno ✓]" : "";
      finalTitle = `Rifornimento ${company}${litersText}${priceText}${pienoText}`.trim();
    } else {
      if (!finalTitle) {
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: { message: "⚠️ Inserisci la descrizione della spesa!" },
          }),
        );
        return;
      }
      if (isNaN(finalAmount) || finalAmount <= 0) {
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message: "⚠️ Inserisci un importo valido superiore a 0!",
            },
          }),
        );
        return;
      }
    }

    // Locate existing expense if in edit mode to preserve any extra properties
    let existingExpense: DiaryExpense | undefined;
    if (editingExpenseId) {
      for (const t of trips) {
        const found = (t.expenses || []).find((exp) => String(exp.id) === String(editingExpenseId));
        if (found) {
          existingExpense = found;
          break;
        }
      }
    }

    const mergedExpense: DiaryExpense = {
      ...(existingExpense || {}),
      id: editingExpenseId || "exp_" + Date.now(),
      title: finalTitle,
      amount: finalAmount,
      category: finalCategory,
      date: expenseDate || new Date().toISOString().split("T")[0],
    };

    if (expenseSubMode === "refuel") {
      if (litersNum !== undefined && !isNaN(litersNum)) mergedExpense.liters = litersNum;
      if (pricePerLiterNum !== undefined && !isNaN(pricePerLiterNum)) mergedExpense.pricePerLiter = pricePerLiterNum;
      if (odometerNum !== undefined) {
        mergedExpense.odometer = odometerNum;
      } else {
        delete (mergedExpense as any).odometer;
      }
      if (fuelCompany) mergedExpense.fuelCompany = fuelCompany;
      if (fuelIsFullTank !== undefined) mergedExpense.isFullTank = fuelIsFullTank;
    }

    const updated = trips.map((t) => {
      const hasEditingExp = editingExpenseId && (t.expenses || []).some((exp) => String(exp.id) === String(editingExpenseId));
      if (t.id === selectedTripId || hasEditingExp) {
        let newExpenses = [...(t.expenses || [])];
        if (editingExpenseId) {
          newExpenses = newExpenses.map((exp) =>
            String(exp.id) === String(editingExpenseId) ? mergedExpense : exp
          );
        } else {
          newExpenses.push(mergedExpense);
        }

        // Recalculate trip endOdometer safely from all movements and all expenses
        const allOdos = [
          t.startOdometer,
          ...(t.movements || []).map((m: any) => Number(m.odometer) || 0),
          ...newExpenses.map((exp: any) => Number(exp.odometer) || 0),
        ].filter((n) => typeof n === "number" && n > 0);
        const endOdo = allOdos.length > 0 ? Math.max(...allOdos) : (odometerNum || t.endOdometer);

        return {
          ...t,
          endOdometer: endOdo,
          expenses: newExpenses,
        };
      }
      return t;
    });

    setTrips(updated);

    if (emailKey) {
      try {
        localStorage.setItem(`camper_trips_${emailKey}`, JSON.stringify(updated));
      } catch (e) {}
    }

    if (currentCrew && isModuleSynced('trips')) {
      syncCrewSection('trips', updated).catch(() => {});
    }

    window.dispatchEvent(
      new CustomEvent("trip-updated", {
        detail: { trips: updated },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("sync-trips-now", {
        detail: { trips: updated },
      }),
    );

    if (expenseSubMode === "refuel" && currentUser?.email) {
      fetch(`/api/fuel-logs/${encodeURIComponent(currentUser.email)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: mergedExpense.id,
          date: mergedExpense.date,
          liters: litersNum || 0,
          pricePerLiter: pricePerLiterNum || 0,
          totalCost: finalAmount,
          odometer: odometerNum !== undefined ? odometerNum : 0,
          isFullTank: fuelIsFullTank,
          fuelCompany: fuelCompany || "Sconosciuta",
        }),
      }).catch((err) => console.error("Fuel sync error:", err));
    }

    // Reset general fields
    setExpenseTitle("");
    setExpenseAmount("");
    setExpenseDate("");
    setExpenseCategory("Autostrada");

    // Reset fuel fields
    setFuelLiters("");
    setFuelPricePerLiter("");
    setFuelOdometer("");
    setFuelIsFullTank(false);
    setEditingExpenseId(null);

    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: {
          message:
            editingExpenseId
              ? "✅ Spesa aggiornata con successo!"
              : expenseSubMode === "refuel"
                ? "⛽ Rifornimento salvato!"
                : "💸 Spesa aggiunta!",
        },
      }),
    );
  };

  const handleEditExpense = (expense: DiaryExpense) => {
    setEditingExpenseId(expense.id);
    if (expense.category === "Carburante") {
      setExpenseSubMode("refuel");
      setFuelCompany(expense.fuelCompany || "Eni");
      setFuelLiters(expense.liters !== undefined && expense.liters !== null ? expense.liters.toString() : "");
      setFuelPricePerLiter(expense.pricePerLiter !== undefined && expense.pricePerLiter !== null ? expense.pricePerLiter.toString() : "");
      setFuelOdometer(expense.odometer !== undefined && expense.odometer !== null ? expense.odometer.toString() : "");
      setFuelIsFullTank(expense.isFullTank || false);
      setExpenseAmount(expense.amount.toString());
      setExpenseDate(expense.date);
    } else {
      setExpenseSubMode("general");
      setExpenseTitle(expense.title);
      setExpenseAmount(expense.amount.toString());
      setExpenseCategory(expense.category);
      setExpenseDate(expense.date);
    }

    setTimeout(() => {
      expenseFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  // Handle adding/editing a new movement
  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId) return;

    if (!movementLocation.trim()) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "⚠️ Inserisci la tappa / luogo dello spostamento!" },
        }),
      );
      return;
    }

    const parsedOdometer = parseOdometerInput(movementOdometer);
    if (parsedOdometer === undefined || isNaN(parsedOdometer) || parsedOdometer < 0) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "⚠️ Inserisci un chilometraggio valido!" },
        }),
      );
      return;
    }

    if (editingMovementId) {
      // Edit mode
      const updated = trips.map((t) => {
        const hasMovement = (t.movements || []).some((m) => m.id === editingMovementId);
        if (t.id === selectedTripId || hasMovement) {
          let endOdo = t.endOdometer;
          if (!endOdo || parsedOdometer > endOdo) {
            endOdo = parsedOdometer;
          }
          const updatedMovements = (t.movements || []).map((m) =>
            m.id === editingMovementId
              ? {
                  ...m,
                  odometer: parsedOdometer,
                  location: movementLocation.trim(),
                  date: movementDate || m.date,
                  notes: movementNotes.trim(),
                }
              : m
          );
          return { ...t, endOdometer: endOdo, movements: updatedMovements };
        }
        return t;
      });
      setTrips(updated);
      if (emailKey) {
        try {
          localStorage.setItem(`camper_trips_${emailKey}`, JSON.stringify(updated));
        } catch (e) {}
      }
      if (currentCrew && isModuleSynced('trips')) {
        syncCrewSection('trips', updated).catch(() => {});
      }
      window.dispatchEvent(
        new CustomEvent("trip-updated", {
          detail: { trips: updated },
        }),
      );
      window.dispatchEvent(new CustomEvent("sync-trips-now", { detail: { trips: updated } }));
      setEditingMovementId(null);
    } else {
      // Add mode
      const newMovement: TripMovement = {
        id: "mov_" + Date.now(),
        odometer: parsedOdometer,
        location: movementLocation.trim(),
        date: movementDate || new Date().toISOString(),
        notes: movementNotes.trim(),
      };

      const updated = trips.map((t) => {
        if (t.id === selectedTripId) {
          let endOdo = t.endOdometer;
          if (!endOdo || parsedOdometer > endOdo) {
            endOdo = parsedOdometer;
          }
          return {
            ...t,
            endOdometer: endOdo,
            movements: [...(t.movements || []), newMovement],
          };
        }
        return t;
      });
      setTrips(updated);
      if (emailKey) {
        try {
          localStorage.setItem(`camper_trips_${emailKey}`, JSON.stringify(updated));
        } catch (e) {}
      }
      if (currentCrew && isModuleSynced('trips')) {
        syncCrewSection('trips', updated).catch(() => {});
      }
      window.dispatchEvent(
        new CustomEvent("trip-updated", {
          detail: { trips: updated },
        }),
      );
      window.dispatchEvent(new CustomEvent("sync-trips-now", { detail: { trips: updated } }));
    }

    setMovementLocation("");
    setMovementOdometer("");
    setMovementNotes("");
    setMovementDate("");
    setExpenseDate("");

    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message: editingMovementId ? "✅ Spostamento aggiornato!" : "📍 Spostamento registrato!" },
      }),
    );
  };

  const handleDeleteMovement = (movementId: string) => {
    recordDeletedId('movements', movementId, emailKey);
    const updated = trips.map((t) => {
      if (t.id === selectedTripId) {
        const updatedMovements = (t.movements || []).filter((m) => m.id !== movementId);
        return {
          ...t,
          movements: updatedMovements,
        };
      }
      return t;
    });
    setTrips(updated);
    if (emailKey) {
      try {
        localStorage.setItem(`camper_trips_${emailKey}`, JSON.stringify(updated));
      } catch (e) {}
    }
    if (currentCrew && isModuleSynced('trips')) {
      syncCrewSection('trips', updated).catch(() => {});
    }
    window.dispatchEvent(
      new CustomEvent("trip-updated", {
        detail: { trips: updated },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message: "🗑️ Spostamento rimosso definitivamente." },
      }),
    );
  };

  // Save/Update Odometer handler
  const handleSaveOdometer = (movementId: string, valueStr: string) => {
    const parsed = parseFloat(valueStr);
    if (isNaN(parsed) || parsed < 0) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "⚠️ Inserisci un chilometraggio valido." },
        }),
      );
      return;
    }

    const updated = trips.map((t) => {
      const hasMovement = (t.movements || []).some((m) => m.id === movementId);
      if (t.id === selectedTripId || hasMovement) {
        let endOdo = t.endOdometer;
        if (!endOdo || parsed > endOdo) {
          endOdo = parsed;
        }
        return {
          ...t,
          endOdometer: endOdo,
          movements: (t.movements || []).map((m) => {
            if (m.id === movementId) {
              return { ...m, odometer: parsed };
            }
            return m;
          }),
        };
      }
      return t;
    });

    setTrips(updated);
    setEditingOdoId(null);
    if (emailKey) {
      try {
        localStorage.setItem(`camper_trips_${emailKey}`, JSON.stringify(updated));
      } catch (e) {}
    }
    if (currentCrew && isModuleSynced('trips')) {
      syncCrewSection('trips', updated).catch(() => {});
    }
    window.dispatchEvent(
      new CustomEvent("trip-updated", {
        detail: { trips: updated },
      }),
    );
    window.dispatchEvent(new CustomEvent("sync-trips-now", { detail: { trips: updated } }));
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message: `✅ Chilometri aggiornati a ${parsed} km!` },
      }),
    );
  };

  // Delete Expense handler
  const handleDeleteExpense = (expenseId: string) => {
    recordDeletedId('expenses', expenseId, emailKey);
    const updated = trips.map((t) => {
      if (t.id === selectedTripId) {
        return {
          ...t,
          expenses: t.expenses.filter((e) => e.id !== expenseId),
        };
      }
      return t;
    });
    setTrips(updated);
    if (emailKey) {
      try {
        localStorage.setItem(`camper_trips_${emailKey}`, JSON.stringify(updated));
      } catch (e) {}
    }
    if (currentCrew && isModuleSynced('trips')) {
      syncCrewSection('trips', updated).catch(() => {});
    }
    window.dispatchEvent(
      new CustomEvent("trip-updated", {
        detail: { trips: updated },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message: "🗑️ Spesa eliminata definitivamente." },
      }),
    );

    if (currentUser?.email) {
      fetch(
        `/api/fuel-logs/${encodeURIComponent(currentUser.email)}/${expenseId}`,
        {
          method: "DELETE",
        },
      ).catch((err) => console.error("Fuel sync del error:", err));
    }
  };

  // Start Editing Active Trip helper
  const startEditingActiveTrip = () => {
    if (!activeTrip) return;
    setEditTitle(activeTrip.title || "");
    setEditStart(activeTrip.startDate || "");
    setEditEnd(activeTrip.endDate || "");
    setEditDesc(activeTrip.description || "");
    setEditStatus(activeTrip.status || "Completato");
    setEditStartOdo(
      activeTrip.startOdometer ? String(activeTrip.startOdometer) : "",
    );
    setEditEndOdo(activeTrip.endOdometer ? String(activeTrip.endOdometer) : "");
    setIsEditingTrip(true);
  };

  // Update Trip Status handler
  const handleUpdateTripStatus = (newStatus: Trip["status"]) => {
    if (!selectedTripId) return;
    let targetTrip: Trip | undefined;
    const updated = trips.map((t) => {
      if (t.id === selectedTripId) {
        const isNowCompleted = newStatus === "Completato";
        const willBeShared = isNowCompleted ? true : t.isShared;
        targetTrip = { ...t, status: newStatus, isShared: willBeShared };
        return targetTrip;
      }
      return t;
    });
    setTrips(updated);

    if (targetTrip && newStatus === "Completato") {
      window.dispatchEvent(
        new CustomEvent("open-trip-share-modal", {
          detail: { trip: targetTrip },
        })
      );
    }
  };

  // Save Trip Edit handler
  const handleSaveTripEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId || !editTitle.trim()) return;

    const updated = trips.map((t) => {
      if (t.id === selectedTripId) {
        return {
          ...t,
          title: editTitle,
          startDate: editStart || new Date().toISOString().split("T")[0],
          endDate: editEnd || new Date().toISOString().split("T")[0],
          description: editDesc,
          status: editStatus,
          startOdometer: editStartOdo ? Number(editStartOdo) : undefined,
          endOdometer: editEndOdo ? Number(editEndOdo) : undefined,
        };
      }
      return t;
    });

    setTrips(updated);
    setIsEditingTrip(false);
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message: `✅ Diario di viaggio "${editTitle}" aggiornato!` },
      }),
    );
  };

  // Save custom route points handler (Pianificazione percorso)
  const handleSaveRoute = (routePoints: Array<{ lat: number; lng: number; name?: string }>) => {
    console.log("DiaryTab: Saving routePoints:", routePoints);
    if (!selectedTripId) return;
    const updated = trips.map((t) => {
      if (t.id === selectedTripId) {
        return {
          ...t,
          routePoints,
        };
      }
      return t;
    });
    setTrips(updated);
  };

  const handleExportItineraryPDFFromDiary = async () => {
    if (!activeTrip) return;
    try {
      let itineraryToExport = activeTrip.aiItinerary;
      if (!itineraryToExport) {
        if (!activeTrip.routePoints || activeTrip.routePoints.length === 0) {
          window.dispatchEvent(
            new CustomEvent("show-toast", {
              detail: { message: "⚠️ Nessuna tappa o itinerario salvato da esportare in PDF." }
            })
          );
          return;
        }
        itineraryToExport = {
          title: activeTrip.title,
          description: activeTrip.description || `Pianificazione del viaggio: ${activeTrip.title}`,
          totalKm: "",
          totalDrivingTime: "",
          days: activeTrip.routePoints.map((pt, idx) => ({
            dayNumber: idx + 1,
            title: pt.name || `Tappa ${idx + 1}`,
            description: `Coordinate GPS: ${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)}`,
            stopPlaceName: pt.name || `Tappa ${idx + 1}`,
            drivingSegment: "",
            camperTips: "",
            stopCoordinate: { lat: pt.lat, lng: pt.lng, label: pt.name || `Tappa ${idx + 1}` },
            activities: [],
          }))
        };
      }
      await exportAIItineraryToPDF(itineraryToExport);
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "📄 PDF dell'itinerario scaricato con successo!" }
        })
      );
    } catch (err) {
      console.error("Errore esportazione PDF itinerario:", err);
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "❌ Impossibile generare il PDF dell'itinerario." }
        })
      );
    }
  };

  // Multiple files upload processing and API storage
  const processAndUploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        setUploadError("Uno o più file selezionati non sono immagini valide.");
        setIsUploading(false);
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setUploadError(
          `L'immagine "${file.name}" supera la dimensione massima consentita di 15 MB.`
        );
        setIsUploading(false);
        return;
      }
      validFiles.push(file);
    }

    // Process each file in parallel using high-performance client-side compression
    const uploadPromises = validFiles.map((file) => {
      return new Promise<{ url: string; name: string }>(async (resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64 = reader.result as string;

            // Apply compression quality from settings (defaults to medium for optimal speed and memory)
            const quality = settings?.photoQuality || "medium";
            let finalBase64 = base64;
            try {
              finalBase64 = await compressImage(base64, quality);
            } catch (cErr) {
              console.warn("Compressione immagine non riuscita, uso originale:", cErr);
            }

            // Immediately resolve with the compressed base64 Data URL so it is 100% offline-ready & instant
            resolve({ url: finalBase64, name: file.name });
          } catch (err: any) {
            reject(err);
          }
        };

        reader.onerror = () => {
          reject(new Error("Errore durante la lettura locale del file."));
        };

        reader.readAsDataURL(file);
      });
    });

    try {
      if (settings?.wifiOnlySync) {
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message: "ℹ️ Solo Wi-Fi attivo: caricamento ottimizzato per risparmio dati.",
            },
          }),
        );
      }

      const results = await Promise.allSettled(uploadPromises);
      const succeeded = results
        .filter((r): r is PromiseFulfilledResult<{ url: string; name: string }> => r.status === "fulfilled")
        .map((r) => r.value);
      const failedCount = results.filter((r) => r.status === "rejected").length;

      if (succeeded.length > 0) {
        setUploadedImages((prev) => [...prev, ...succeeded]);
        setUploadedImageUrl(succeeded[succeeded.length - 1].url);
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message: `📸 ${succeeded.length} foto caricate con successo!${
                failedCount > 0 ? ` (${failedCount} fallite)` : ""
              }`,
            },
          }),
        );
      }
      if (failedCount > 0 && succeeded.length === 0) {
        const firstError = (results.find((r) => r.status === "rejected") as PromiseRejectedResult)?.reason?.message || "Errore sconosciuto";
        setUploadError(`Caricamento fallito: ${firstError}`);
      }
    } catch (err: any) {
      console.error("Upload process error:", err);
      setUploadError(`Caricamento fallito: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processAndUploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      await processAndUploadFiles(e.target.files);
    }
    e.target.value = "";
  };

  // Add Photo with description handler
  const handleAddPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId) return;

    let urls: Array<{ url: string; name: string }> = [];
    if (photoType === "upload") {
      urls = uploadedImages;
      if (urls.length === 0 && uploadedImageUrl) {
        urls = [{ url: uploadedImageUrl, name: "Foto caricata" }];
      }
      if (urls.length === 0) {
        setUploadError(
          "Carica prima almeno un'immagine usando il box o seleziona un'altra modalità.",
        );
        return;
      }
    } else if (photoType === "preset") {
      urls = [{ url: photoPresetUrl, name: "Preset" }];
    } else if (photoType === "url") {
      urls = [{ url: photoCustomUrl, name: "Custom URL" }];
    }

    if (urls.length === 0) {
      setUploadError("Specifica un link valido per la foto.");
      return;
    }

    const newPhotos: DiaryPhoto[] = urls.map((img, idx) => {
      let finalDesc = photoDesc;
      if (!finalDesc) {
        const nameWithoutExt = img.name.split(".")[0];
        finalDesc = nameWithoutExt || "Nessuna descrizione inserita.";
      }
      const photoId = "photo_" + (Date.now() + idx);
      return {
        id: photoId,
        url: `/api/photos/${photoId}`,
        description: finalDesc,
        date: new Date().toISOString().split("T")[0],
        locationName: photoLocationName || undefined,
      };
    });

    const updated = trips.map((t) => {
      if (t.id === selectedTripId) {
        return {
          ...t,
          photos: [...t.photos, ...newPhotos],
        };
      }
      return t;
    });

    for (let i = 0; i < urls.length; i++) {
      const img = urls[i];
      const p = newPhotos[i];
      if (img.url && img.url.startsWith("data:image/")) {
        // 1. Persistent local IndexedDB storage (instant display)
        savePhotoToIndexedDB(p.id, img.url);

        // 2. Direct Firestore shared_photos upload for multi-device sync
        try {
          const match = img.url.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
          const rawData = match ? match[2] : img.url;
          const mimeType = match ? `image/${match[1] === "jpeg" ? "jpg" : match[1]}` : "image/jpeg";
          setDoc(doc(db, "shared_photos", p.id), {
            base64: rawData,
            mimeType,
            updatedAt: new Date().toISOString(),
          }).catch((err) => console.warn("Firestore photo upload notice:", err));
        } catch (fErr) {}

        // 3. Server-side API with resolved mobile URL
        try {
          fetch(resolveApiUrl(`/api/photos/${p.id}`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64: img.url }),
          }).catch(() => {});
        } catch (sErr) {}
      }
    }

    setTrips(updated);
    if (emailKey) {
      try {
        localStorage.setItem(`camper_trips_${emailKey}`, JSON.stringify(updated));
      } catch (e) {}
    }
    window.dispatchEvent(
      new CustomEvent("trip-updated", { detail: { trips: updated } })
    );
    window.dispatchEvent(
      new CustomEvent("sync-trips-now", { detail: { trips: updated } })
    );

    setPhotoDesc("");
    setPhotoLocationName("");
    setPhotoCustomUrl("");
    setUploadedImageUrl("");
    setUploadedImages([]);
    setUploadError(null);

    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: {
          message: `✅ ${newPhotos.length} ${newPhotos.length === 1 ? 'foto aggiunta' : 'foto aggiunte'} al diario!`,
        },
      }),
    );
  };

  // Replace / Re-upload a single photo from gallery or camera
  const handleReplacePhoto = async (photoId: string, file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawBase64 = event.target?.result as string;
        if (!rawBase64) return;
        const compressed = await compressImage(rawBase64, "medium");
        await savePhotoToIndexedDB(photoId, compressed);

        // Upload to Firestore shared_photos for cross-device sync
        try {
          const match = compressed.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
          const rawData = match ? match[2] : compressed;
          const mimeType = match ? `image/${match[1] === "jpeg" ? "jpg" : match[1]}` : "image/jpeg";
          setDoc(doc(db, "shared_photos", photoId), {
            base64: rawData,
            mimeType,
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        } catch (e) {}

        // Upload to server
        try {
          fetch(resolveApiUrl(`/api/photos/${photoId}`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64: compressed }),
          }).catch(() => {});
        } catch (e) {}

        const updated = trips.map((t) => {
          if (t.id === selectedTripId) {
            return {
              ...t,
              photos: t.photos.map((p) => (p.id === photoId ? { ...p, url: `/api/photos/${photoId}` } : p)),
            };
          }
          return t;
        });

        setTrips(updated);
        if (emailKey) {
          try {
            localStorage.setItem(`camper_trips_${emailKey}`, JSON.stringify(updated));
          } catch (e) {}
        }
        window.dispatchEvent(
          new CustomEvent("trip-updated", { detail: { trips: updated } })
        );
        syncWithCloud(updated, false);
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message: "✅ Foto ripristinata e salvata nel Cloud!",
            },
          }),
        );
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error replacing photo:", err);
    }
  };

  // Restore orphan photos found in local IndexedDB into this trip
  const handleRestoreOrphanPhotos = async () => {
    if (!selectedTripId || !activeTrip) return;
    setIsRestoringLocalPhotos(true);
    try {
      const idbPhotos = await getAllPhotosFromIndexedDB();
      const currentIds = new Set((activeTrip?.photos || []).map((p) => p.id));
      const deletedPhotos = getDeletedIds('photos', emailKey);

      const recovered: DiaryPhoto[] = [];
      const entries = Object.entries(idbPhotos);
      for (const [id, base64] of entries) {
        if (!currentIds.has(id) && !deletedPhotos.has(id)) {
          const match = id.match(/photo_(\d+)/);
          let photoDate = activeTrip?.startDate || new Date().toISOString().split("T")[0];
          if (match) {
            const ts = Number(match[1]);
            if (!isNaN(ts) && ts > 1000000000000) {
              photoDate = new Date(ts).toISOString().split("T")[0];
            }
          }
          recovered.push({
            id,
            url: `/api/photos/${id}`,
            description: "Foto recuperata dalla memoria",
            date: photoDate,
          });

          // Upload to Firestore shared_photos for cross-device sync
          try {
            const matchB64 = base64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
            const rawData = matchB64 ? matchB64[2] : base64;
            const mimeType = matchB64 ? `image/${matchB64[1] === "jpeg" ? "jpg" : matchB64[1]}` : "image/jpeg";
            setDoc(doc(db, "shared_photos", id), {
              base64: rawData,
              mimeType,
              updatedAt: new Date().toISOString(),
            }).catch(() => {});
          } catch (e) {}

          // Post to server
          try {
            fetch(resolveApiUrl(`/api/photos/${id}`), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ base64 }),
            }).catch(() => {});
          } catch (e) {}
        }
      }

      if (recovered.length > 0) {
        const updated = trips.map((t) => {
          if (t.id === selectedTripId) {
            return {
              ...t,
              photos: [...t.photos, ...recovered],
            };
          }
          return t;
        });

        setTrips(updated);
        if (emailKey) {
          try {
            localStorage.setItem(`camper_trips_${emailKey}`, JSON.stringify(updated));
          } catch (e) {}
        }
        window.dispatchEvent(
          new CustomEvent("trip-updated", { detail: { trips: updated } })
        );
        window.dispatchEvent(
          new CustomEvent("sync-trips-now", { detail: { trips: updated } })
        );
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message: `🎉 Ripristinate con successo ${recovered.length} foto dalla memoria locale!`,
            },
          })
        );
        setLocalOrphanPhotosCount(0);
      } else {
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: { message: "Nessuna foto aggiuntiva trovata nella memoria locale." },
          })
        );
      }
    } catch (err: any) {
      console.error("Error restoring orphan photos:", err);
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "Errore durante il ripristino delle foto: " + (err?.message || "") },
        })
      );
    } finally {
      setIsRestoringLocalPhotos(false);
    }
  };

  // Batch import multiple photos directly from gallery into this trip
  const handleBatchAddGalleryPhotos = async (files: FileList | File[]) => {
    if (!files || files.length === 0 || !selectedTripId) return;
    const fileArray = Array.from(files);
    setIsBatchImporting(true);
    setBatchImportProgress({ current: 0, total: fileArray.length });

    const newPhotosToAdd: DiaryPhoto[] = [];
    const now = Date.now();

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setBatchImportProgress({ current: i + 1, total: fileArray.length });
      try {
        const rawBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        if (!rawBase64) continue;

        const compressed = await compressImage(rawBase64, "medium");
        const photoId = `photo_${now}_${i}`;

        // 1. Save locally to IndexedDB
        await savePhotoToIndexedDB(photoId, compressed);

        // 2. Upload to Firestore shared_photos for cross-device sync
        try {
          const match = compressed.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
          const rawData = match ? match[2] : compressed;
          const mimeType = match ? `image/${match[1] === "jpeg" ? "jpg" : match[1]}` : "image/jpeg";
          setDoc(doc(db, "shared_photos", photoId), {
            base64: rawData,
            mimeType,
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        } catch (e) {}

        // 3. Upload to server
        try {
          fetch(resolveApiUrl(`/api/photos/${photoId}`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64: compressed }),
          }).catch(() => {});
        } catch (e) {}

        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

        newPhotosToAdd.push({
          id: photoId,
          url: `/api/photos/${photoId}`,
          description: cleanName || "Foto ricordo di viaggio",
          date: activeTrip?.startDate || new Date().toISOString().split("T")[0],
        });
      } catch (err) {
        console.warn("Error processing gallery photo:", err);
      }
    }

    if (newPhotosToAdd.length > 0) {
      const updated = trips.map((t) => {
        if (t.id === selectedTripId) {
          return {
            ...t,
            photos: [...t.photos, ...newPhotosToAdd],
          };
        }
        return t;
      });

      setTrips(updated);
      if (emailKey) {
        try {
          localStorage.setItem(`camper_trips_${emailKey}`, JSON.stringify(updated));
        } catch (e) {}
      }
      window.dispatchEvent(
        new CustomEvent("trip-updated", { detail: { trips: updated } })
      );
      window.dispatchEvent(
        new CustomEvent("sync-trips-now", { detail: { trips: updated } })
      );
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: {
            message: `🎉 Aggiunte con successo ${newPhotosToAdd.length} foto al viaggio!`,
          },
        })
      );
    }
    setIsBatchImporting(false);
    setBatchImportProgress(null);
  };

  // Batch re-upload multiple photos from gallery to match missing photos
  const handleBatchReloadPhotos = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    const missingPhotos = (activeTripPhotos || []).filter(
      (p) => p.url && (p.url.startsWith("/uploads/") || p.url.includes("trip_photo_"))
    );

    if (missingPhotos.length === 0) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "Tutte le foto del viaggio risultano già collegate!" },
        }),
      );
      return;
    }

    let count = 0;

    const reloadedPhotoIds = new Set<string>();

    for (let i = 0; i < Math.min(fileArray.length, missingPhotos.length); i++) {
      const file = fileArray[i];
      const targetPhoto = missingPhotos[i];
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const compressed = await compressImage(base64, "medium");
        await savePhotoToIndexedDB(targetPhoto.id, compressed);

        // Upload to Firestore shared_photos
        try {
          const match = compressed.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
          const rawData = match ? match[2] : compressed;
          const mimeType = match ? `image/${match[1] === "jpeg" ? "jpg" : match[1]}` : "image/jpeg";
          setDoc(doc(db, "shared_photos", targetPhoto.id), {
            base64: rawData,
            mimeType,
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        } catch (e) {}

        // Upload to server
        try {
          fetch(resolveApiUrl(`/api/photos/${targetPhoto.id}`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64: compressed }),
          }).catch(() => {});
        } catch (e) {}

        reloadedPhotoIds.add(targetPhoto.id);
        count++;
      } catch (e) {
        console.warn("Error in batch photo reload:", e);
      }
    }

    if (count > 0) {
      const updated = trips.map((t) => {
        if (t.id === selectedTripId) {
          return {
            ...t,
            photos: t.photos.map((p) => {
              if (reloadedPhotoIds.has(p.id)) {
                return { ...p, url: `/api/photos/${p.id}` };
              }
              return p;
            }),
          };
        }
        return t;
      });

      setTrips(updated);
      if (emailKey) {
        try {
          localStorage.setItem(`camper_trips_${emailKey}`, JSON.stringify(updated));
        } catch (e) {}
      }
      window.dispatchEvent(
        new CustomEvent("trip-updated", { detail: { trips: updated } })
      );
      syncWithCloud(updated, false);
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: {
            message: `✅ ${count} ${count === 1 ? 'foto ripristinata' : 'foto ripristinate'} e salvate nel Cloud!`,
          },
        }),
      );
    }
  };

  // Delete Photo handler
  const handleDeletePhoto = (photoId: string) => {
    recordDeletedId('photos', photoId, emailKey);
    const updated = trips.map((t) => {
      const containsPhoto = t.photos && t.photos.some((p) => p.id === photoId);
      if (containsPhoto) {
        return {
          ...t,
          photos: t.photos.filter((p) => p.id !== photoId),
        };
      }
      return t;
    });
    setTrips(updated);
    if (emailKey) {
      try {
        localStorage.setItem(`camper_trips_${emailKey}`, JSON.stringify(updated));
      } catch (e) {}
    }
    if (currentCrew && isModuleSynced('trips')) {
      syncCrewSection('trips', updated).catch(() => {});
    }
    window.dispatchEvent(
      new CustomEvent("trip-updated", {
        detail: { trips: updated },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message: "🗑️ Foto eliminata definitivamente." },
      }),
    );
  };

  // Delete all photos for current active trip
  const handleDeleteAllTripPhotos = () => {
    if (!activeTrip || !selectedTripId) return;
    const currentPhotos = activeTrip.photos || [];
    currentPhotos.forEach((p) => {
      recordDeletedId('photos', p.id, emailKey);
    });
    const updated = trips.map((t) => {
      if (t.id === selectedTripId) {
        return {
          ...t,
          photos: [],
        };
      }
      return t;
    });
    setTrips(updated);
    if (emailKey) {
      try {
        localStorage.setItem(`camper_trips_${emailKey}`, JSON.stringify(updated));
      } catch (e) {}
    }
    if (currentCrew && isModuleSynced('trips')) {
      syncCrewSection('trips', updated).catch(() => {});
    }
    window.dispatchEvent(
      new CustomEvent("trip-updated", {
        detail: { trips: updated },
      }),
    );
    syncWithCloud(updated, false);
    setShowDeleteAllPhotosConfirm(false);
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message: "🗑️ Tutte le foto del viaggio sono state eliminate." },
      }),
    );
  };

  // Open Edit Photo Modal
  const handleOpenEditPhoto = (p: DiaryPhoto) => {
    setPhotoToEdit(p);
    setEditPhotoDesc(p.description === "Foto recuperata dalla memoria" ? "" : p.description);
    setEditPhotoLoc(p.locationName || "");
    setEditPhotoDate(p.date || activeTrip?.startDate || new Date().toISOString().split("T")[0]);
  };

  // Save Photo details (description, locationName, date)
  const handleSavePhotoDetails = (goToNext: boolean = false) => {
    if (!photoToEdit || !selectedTripId) return;

    const targetId = photoToEdit.id;
    const nextDesc = editPhotoDesc.trim() || "Foto di viaggio";
    const nextLoc = editPhotoLoc.trim() || undefined;
    const nextDate = editPhotoDate || photoToEdit.date;

    const updatedTrips = trips.map((t) => {
      if (t.id === selectedTripId) {
        return {
          ...t,
          photos: t.photos.map((p) => {
            if (p.id === targetId) {
              return {
                ...p,
                description: nextDesc,
                locationName: nextLoc,
                date: nextDate,
              };
            }
            return p;
          }),
        };
      }
      return t;
    });

    setTrips(updatedTrips);
    if (emailKey) {
      try {
        localStorage.setItem(`camper_trips_${emailKey}`, JSON.stringify(updatedTrips));
      } catch (e) {}
    }
    window.dispatchEvent(new CustomEvent("trip-updated", { detail: { trips: updatedTrips } }));
    syncWithCloud(updatedTrips, false);

    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message: "✅ Dettagli foto salvati e sincronizzati nel Cloud!" },
      })
    );

    if (goToNext) {
      const currentList = activeTrip?.photos || [];
      const currIdx = currentList.findIndex((p) => p.id === targetId);
      let nextPhoto = currentList.slice(currIdx + 1).find((p) => p.description === "Foto recuperata dalla memoria");
      if (!nextPhoto && currIdx + 1 < currentList.length) {
        nextPhoto = currentList[currIdx + 1];
      }
      if (nextPhoto) {
        handleOpenEditPhoto(nextPhoto);
        return;
      }
    }

    setPhotoToEdit(null);
  };

  // Quick suggestions for locationName based on movements and existing trip locations
  const suggestedLocations = React.useMemo(() => {
    if (!activeTrip) return [];
    const set = new Set<string>();
    (activeTrip.movements || []).forEach((m: any) => {
      if (m.location?.trim()) set.add(m.location.trim());
      if (m.locationName?.trim()) set.add(m.locationName.trim());
      if (m.notes?.trim() && m.notes.length < 35 && !m.notes.includes("coordinate") && !m.notes.includes("chilometri")) {
        set.add(m.notes.trim());
      }
    });
    (activeTrip.photos || []).forEach((p) => {
      if (p.locationName?.trim()) set.add(p.locationName.trim());
    });
    if (activeTrip.title?.toLowerCase().includes("sicilia")) {
      ["Messina", "Capo Peloro", "Scala dei Turchi", "Agrigento", "Ortigia", "Siracusa", "Palermo", "Cefalù", "Trapani", "Noto", "Ragusa", "Taormina", "Catania"].forEach(loc => set.add(loc));
    }
    return Array.from(set).filter(Boolean).slice(0, 15);
  }, [activeTrip]);

  // Calculate stats for current active trip
  const totalExpensesOfActive = activeTrip && activeTrip.includeExpenses !== false
    ? activeTrip.expenses.reduce((sum, exp) => sum + exp.amount, 0)
    : 0;
    
  const getTripDistance = (trip: Trip) => {
    const movements = trip.movements || [];
    const validMovements = movements.filter(
      (m) => typeof m.odometer === "number" && !isNaN(m.odometer) && m.odometer > 0
    ).map((m) => m.odometer);
    
    const refuelOdometers = (trip.expenses || [])
      .filter((e) => e.category === "Carburante" && typeof e.odometer === "number" && !isNaN(e.odometer) && e.odometer > 0)
      .map((e) => e.odometer as number);

    const allOdometers = [
      ...validMovements,
      ...refuelOdometers,
    ];

    if (typeof trip.startOdometer === "number" && !isNaN(trip.startOdometer) && trip.startOdometer > 0) {
      allOdometers.push(trip.startOdometer);
    }
    
    if (typeof trip.endOdometer === "number" && !isNaN(trip.endOdometer) && trip.endOdometer > 0) {
      allOdometers.push(trip.endOdometer);
    }

    if (allOdometers.length < 2) {
      return 0;
    }
    
    const minOdo = Math.min(...allOdometers);
    const maxOdo = Math.max(...allOdometers);
    
    return maxOdo > minOdo ? maxOdo - minOdo : 0;
  };

  const odometerDiff = activeTrip ? getTripDistance(activeTrip) : 0;

  // Helper to parse dates in various formats (YYYY-MM-DD, DD/MM/YYYY, ISO, etc.)
  const parseDateToTimestamp = (dateStr?: string | number | null): number => {
    if (!dateStr) return 0;
    if (typeof dateStr === "number") return isNaN(dateStr) ? 0 : dateStr;
    const trimmed = String(dateStr).trim();
    if (!trimmed) return 0;

    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const parsed = new Date(year, month, day).getTime();
      if (!isNaN(parsed)) return parsed;
    }

    const parsed = new Date(trimmed).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  const getTripEffectiveDate = (trip: Trip): number => {
    const timestamps: number[] = [];

    if (trip.startDate) {
      const t = parseDateToTimestamp(trip.startDate);
      if (t > 0) timestamps.push(t);
    }
    if (trip.endDate) {
      const t = parseDateToTimestamp(trip.endDate);
      if (t > 0) timestamps.push(t);
    }
    (trip.movements || []).forEach((m) => {
      if (m.date) {
        const t = parseDateToTimestamp(m.date);
        if (t > 0) timestamps.push(t);
      }
    });
    (trip.expenses || []).forEach((e) => {
      if (e.date) {
        const t = parseDateToTimestamp(e.date);
        if (t > 0) timestamps.push(t);
      }
    });
    (trip.photos || []).forEach((p) => {
      if (p.date) {
        const t = parseDateToTimestamp(p.date);
        if (t > 0) timestamps.push(t);
      }
    });

    if (timestamps.length > 0) {
      return Math.min(...timestamps);
    }

    if (trip.id && trip.id.startsWith("trip_")) {
      const ts = parseInt(trip.id.replace("trip_", ""), 10);
      if (!isNaN(ts) && ts > 0) return ts;
    }

    return 0;
  };

  // Saved trips sorted chronologically: from newest (top) to oldest (bottom)
  const sortedTrips = React.useMemo(() => {
    return [...trips].sort((a, b) => {
      const dateA = getTripEffectiveDate(a);
      const dateB = getTripEffectiveDate(b);
      return dateB - dateA;
    });
  }, [trips]);

  const getDisplayDates = (trip: Trip) => {
    const allDates: string[] = [];
    if (trip.startDate) allDates.push(trip.startDate);
    if (trip.endDate) allDates.push(trip.endDate);

    (trip.movements || []).forEach((m) => {
      if (m.date) allDates.push(m.date.split("T")[0]);
    });
    
    (trip.expenses || []).forEach((e) => {
      if (e.date) allDates.push(e.date.split("T")[0]);
    });

    if (allDates.length === 0) {
      return { start: "", end: "" };
    }

    allDates.sort();
    
    const format = (d: string) => {
      if (!d) return "";
      const parts = d.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return d;
    };
    
    return {
      start: format(allDates[0]),
      end: format(allDates[allDates.length - 1]),
    };
  };

  return (
    <div id="diary-container" className="space-y-6">
      {/* Family Crew Banner */}
      <FamilyCrewTabBanner moduleName="Diari di Viaggio" onOpenCrewModal={onOpenCrewModal} />

      {/* Top Welcome Panel */}
      {diarySubTab !== "details" && !showAddTrip && (
        <div className="bg-gradient-to-r from-[#3E4A35] to-[#5A6B4E] text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-white/70 text-xs font-bold uppercase tracking-wider">
              Memorie On The Road
            </span>
            <h1 className="text-2xl font-bold flex items-center gap-2 mt-1">
              <BookOpen className="w-6 h-6 text-orange-200" />
              Diario di Bordo & Viaggi
            </h1>
            <p className="text-white/80 text-xs mt-1 max-w-xl">
              Tieni traccia delle tappe indimenticabili, dei tuoi percorsi,
              archivia scatti fotografici panoramici e tieni sotto controllo il
              budget delle spese di viaggio.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full md:w-auto md:min-w-[340px] shrink-0 mt-2 md:mt-0">
            {/* Colonna Sinistra - In Alto: Guida */}
            <div className="w-full flex">
              <RollyOnboardingGuide
                sectionKey="diary"
                className="!w-full !h-full !min-h-[40px] !py-2.5 !rounded-xl !justify-center shadow-xs"
              />
            </div>

            {/* Colonna Destra - In Alto: Sincronizza Cloud */}
            <button
              onClick={handleCloudSyncClick}
              disabled={isSyncingCloud}
              className={`w-full min-h-[40px] px-2.5 py-2.5 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer disabled:opacity-80 ${
                autoSyncState === "saving" || isSyncingCloud
                  ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
                  : autoSyncState === "offline"
                  ? "bg-stone-700/80 hover:bg-stone-700 text-amber-200 border border-amber-300/30"
                  : autoSyncState === "synced"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
              title={
                autoSyncState === "saving" || isSyncingCloud
                  ? "Salvataggio e sincronizzazione Cloud automatica in corso..."
                  : autoSyncState === "offline"
                  ? "Dispositivo offline: le tue foto e spese sono salvate sul telefono e si sincronizzeranno in automatico appena torni sotto rete."
                  : lastSyncedTime
                  ? `Sincronizzato automaticamente col Cloud alle ${lastSyncedTime}. Clicca per sincronizzare subito.`
                  : "Sincronizzazione Cloud automatica attiva. Clicca per sincronizzare subito."
              }
            >
              {autoSyncState === "saving" || isSyncingCloud ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Salvo... ☁️</span>
                </>
              ) : autoSyncState === "offline" ? (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-amber-300" />
                  <span>Offline 📴</span>
                </>
              ) : autoSyncState === "synced" ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Cloud ✓ {lastSyncedTime ? `(${lastSyncedTime})` : ""}</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-white" />
                  <span>Sincronizza Cloud ☁️</span>
                </>
              )}
            </button>

            {/* Colonna Sinistra - In Basso: Nuovo Viaggio */}
            <button
              onClick={() => {
                setDiarySubTab("list");
                setShowAddTrip(true);
              }}
              className="w-full min-h-[40px] px-3 py-2.5 bg-orange-200 hover:bg-orange-300 text-[#3E4A35] dark:bg-orange-600 dark:hover:bg-orange-700 dark:text-white font-black rounded-xl text-xs transition-transform flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuovo Viaggio</span>
            </button>

            {/* Colonna Destra - In Basso: Stato & Backup */}
            <button
              onClick={() => {
                checkCloudStatus();
                setShowSyncModal(true);
              }}
              className="w-full min-h-[40px] px-3 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer backdrop-blur-xs"
              title="Apri pannello diagnostica sincronizzazione e backup file"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Stato & Backup</span>
            </button>
          </div>
        </div>
      )}

      {/* View Switcher: Viaggi vs Album */}
      {diarySubTab !== "details" && !showAddTrip && (
        <div className="flex border-b border-slate-200/80 pb-px gap-6 font-sans select-none animate-fade-in">
          <button
            onClick={() => setDiarySubTab("list")}
            className={`pb-3 text-xs font-black tracking-wider uppercase transition-all relative flex items-center gap-1.5 cursor-pointer ${
              diarySubTab === "list"
                ? "text-[#3E4A35] font-black border-b-2 border-[#3E4A35]"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            I Miei Viaggi
          </button>
          <button
            onClick={() => setDiarySubTab("album")}
            className={`pb-3 text-xs font-black tracking-wider uppercase transition-all relative flex items-center gap-1.5 cursor-pointer ${
              diarySubTab === "album"
                ? "text-[#3E4A35] font-black border-b-2 border-[#3E4A35]"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Foto e ricordi
            {allPhotos.length > 0 && (
              <span className="ml-1 bg-[#3E4A35]/10 text-[#3E4A35] text-[10px] px-2 py-0.5 rounded-full font-bold">
                {allPhotos.length}
              </span>
            )}
          </button>
        </div>
      )}

      {diarySubTab === "album" ? (
        <div className="space-y-6 animate-fade-in font-sans">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-[#3E4A35] uppercase tracking-wider whitespace-nowrap">
                Filtra per Viaggio:
              </span>
              <select
                value={selectedAlbumTripId}
                onChange={(e) => setSelectedAlbumTripId(e.target.value)}
                className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 outline-none focus:border-[#3E4A35] w-full sm:w-[220px] cursor-pointer"
              >
                <option value="">Tutti i viaggi ({trips.length})</option>
                {sortedTrips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.title} ({trip.photos?.length || 0})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-[300px]">
              <input
                type="text"
                value={albumSearchQuery}
                onChange={(e) => setAlbumSearchQuery(e.target.value)}
                placeholder="Cerca per descrizione, luogo, viaggio..."
                className="w-full text-xs font-medium pl-3 pr-8 py-2 rounded-lg border border-slate-200 outline-none focus:border-[#3E4A35] bg-white text-slate-800"
              />
              {albumSearchQuery && (
                <button
                  onClick={() => setAlbumSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Photos Grid */}
          {filteredPhotos.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-3 bg-[#F2EFE9]/10 rounded-2xl border border-dashed border-stone-200 select-none">
              <ImageIcon className="w-12 h-12 text-stone-300 mx-auto" />
              <p className="text-sm font-bold text-[#3E4A35]/80">
                Nessuna foto trovata
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {albumSearchQuery || selectedAlbumTripId
                  ? "Prova a modificare i filtri o la ricerca per trovare i tuoi ricordi."
                  : "Inizia caricando delle foto all'interno dei dettagli di un viaggio per popolare questo album!"}
              </p>
              {(albumSearchQuery || selectedAlbumTripId) && (
                <button
                  onClick={() => {
                    setAlbumSearchQuery("");
                    setSelectedAlbumTripId("");
                  }}
                  className="px-3.5 py-1.5 bg-[#3E4A35] text-white rounded-lg text-xs font-bold hover:bg-[#5A6B4E] cursor-pointer"
                >
                  Azzera Filtri
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayedAlbumPhotos.map((photo) => {
                const originalIdx = filteredPhotos.findIndex((p) => p.id === photo.id);
                return (
                <div
                  key={photo.id}
                  className="group bg-white rounded-xl border border-slate-100 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative cursor-pointer font-sans"
                  onClick={() => setSelectedAlbumPhotoIndex(originalIdx >= 0 ? originalIdx : 0)}
                >
                  {/* Photo Container */}
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-50">
                    <CamperImage
                      src={photo.url}
                      photoId={photo.id}
                      thumbnail={true}
                      alt={photo.description}
                      onReplace={(file) => handleReplacePhoto(photo.id, file)}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    
                    {/* Dark gradient bottom overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent p-2 pt-6 flex flex-col justify-end text-white opacity-90 group-hover:opacity-100 transition-opacity">
                      {photo.locationName && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-[#3E4A35]/80 text-orange-100 px-1 py-0.5 rounded backdrop-blur-xs w-max mb-1 max-w-full truncate">
                          <MapPin className="w-2.5 h-2.5 text-orange-200 shrink-0" />
                          <span className="truncate">{photo.locationName}</span>
                        </span>
                      )}
                      {photo.date && (
                        <span className="text-[8px] font-semibold text-stone-300 flex items-center gap-0.5">
                          <Calendar className="w-2 h-2 text-stone-400 shrink-0" />
                          {photo.date.split("-").reverse().join("/")}
                        </span>
                      )}
                    </div>

                    {/* Quick navigation to Trip details */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTripId(photo.tripId);
                        setDiarySubTab("details");
                      }}
                      className="absolute top-2 left-2 px-2 py-1 bg-white/90 hover:bg-white text-[#3E4A35] rounded-md text-[9px] font-black shadow-sm transition-all flex items-center gap-1 opacity-0 group-hover:opacity-100 border border-slate-200 z-10"
                      title="Vai ai dettagli del viaggio"
                    >
                      <Route className="w-2.5 h-2.5" />
                      Vedi Viaggio
                    </button>

                    {/* Delete Photo */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoToDelete(photo.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-red-600 text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10"
                      title="Elimina foto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>

                    {/* Zoom icon on center hover */}
                    <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="p-2 bg-white/20 backdrop-blur-md text-white rounded-full border border-white/30">
                        <Eye className="w-4 h-4" />
                      </span>
                    </div>
                  </div>

                  {/* Photo details bottom bar */}
                  <div className="p-2 bg-stone-50 border-t border-stone-100 space-y-1">
                    <p className="text-[10px] font-black text-[#3E4A35] truncate" title={photo.tripTitle}>
                      {photo.tripTitle}
                    </p>
                    <p className="text-[9px] text-slate-500 leading-tight line-clamp-2 min-h-[24px]">
                      {photo.description || "Nessuna descrizione"}
                    </p>
                  </div>
                </div>
              );
              })}
            </div>
          )}

          {/* Pagination controls for album gallery */}
          {filteredPhotos.length > 36 && (
            <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 bg-stone-50/80 p-3 rounded-xl text-stone-600 animate-fade-in">
              <span className="text-xs font-medium text-stone-600">
                Mostrati <strong className="text-stone-900 font-bold">{displayedAlbumPhotos.length}</strong> di <strong className="text-stone-900 font-bold">{filteredPhotos.length}</strong> scatti
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {displayedAlbumPhotos.length < filteredPhotos.length ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setVisibleAlbumPhotosCount((prev) => Math.min(prev + 36, filteredPhotos.length))}
                      className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-800 text-xs font-bold rounded-lg border border-stone-200 shadow-2xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                      Carica altri 36
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibleAlbumPhotosCount(filteredPhotos.length)}
                      className="px-3 py-1.5 bg-[#3E4A35] hover:bg-[#2d3627] text-white text-xs font-bold rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
                    >
                      Mostra tutti ({filteredPhotos.length})
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setVisibleAlbumPhotosCount(36)}
                    className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 text-xs font-bold rounded-lg border border-stone-200 shadow-2xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    Riduci a 36
                  </button>
                )}
              </div>
            </div>
          )}

          {/* PHOTO ALBUM LIGHTBOX */}
          {selectedAlbumPhotoIndex !== null && filteredPhotos[selectedAlbumPhotoIndex] && (
            <div
              className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all animate-fade-in"
              onClick={() => setSelectedAlbumPhotoIndex(null)}
            >
              <div
                className="relative max-w-4xl w-full bg-stone-900 rounded-3xl overflow-hidden shadow-2xl border border-stone-800 flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header controls */}
                <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                  <button
                    onClick={() => {
                      const photo = filteredPhotos[selectedAlbumPhotoIndex];
                      setSelectedAlbumPhotoIndex(null);
                      setSelectedTripId(photo.tripId);
                      setDiarySubTab("details");
                    }}
                    className="p-2 bg-black/60 hover:bg-[#3E4A35] text-white rounded-full transition-all cursor-pointer shadow-md select-none border border-white/10 text-[10px] font-black flex items-center gap-1 px-3"
                    title="Vedi viaggio"
                  >
                    <Route className="w-3.5 h-3.5" />
                    Apri Viaggio
                  </button>
                  <button
                    onClick={() => setSelectedAlbumPhotoIndex(null)}
                    className="p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-all cursor-pointer shadow-md select-none border border-white/10"
                    title="Chiudi"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Main Picture content and navigation */}
                <div className="relative w-full aspect-video md:aspect-[4/3] bg-black flex items-center justify-center group overflow-hidden">
                  <CamperImage
                    src={filteredPhotos[selectedAlbumPhotoIndex].url}
                    photoId={filteredPhotos[selectedAlbumPhotoIndex].id}
                    alt={filteredPhotos[selectedAlbumPhotoIndex].description}
                    onReplace={(file) => handleReplacePhoto(filteredPhotos[selectedAlbumPhotoIndex].id, file)}
                    className="max-w-full max-h-[75vh] object-contain select-none"
                  />

                  {filteredPhotos.length > 1 && (
                    <>
                      {/* Left button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newIdx = (selectedAlbumPhotoIndex - 1 + filteredPhotos.length) % filteredPhotos.length;
                          setSelectedAlbumPhotoIndex(newIdx);
                        }}
                        className="absolute left-4 p-3 bg-black/50 hover:bg-black/85 text-white rounded-full transition-all cursor-pointer shadow-md select-none border border-white/5 active:scale-90"
                      >
                        ❮
                      </button>

                      {/* Right button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newIdx = (selectedAlbumPhotoIndex + 1) % filteredPhotos.length;
                          setSelectedAlbumPhotoIndex(newIdx);
                        }}
                        className="absolute right-4 p-3 bg-black/50 hover:bg-black/85 text-white rounded-full transition-all cursor-pointer shadow-md select-none border border-white/5 active:scale-90"
                      >
                        ❯
                      </button>
                    </>
                  )}
                </div>

                {/* Bottom Caption bar */}
                <div className="w-full bg-stone-950 p-5 border-t border-stone-855 text-stone-200 text-left space-y-1.5 font-sans">
                  <div className="flex justify-between items-center text-[10px] text-stone-400 font-bold font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-stone-500" />
                      Scattata il: {filteredPhotos[selectedAlbumPhotoIndex].date || "N/D"}
                      {filteredPhotos[selectedAlbumPhotoIndex].locationName && (
                        <>
                          <span className="mx-1">•</span>
                          <MapPin className="w-3 h-3 text-stone-500" />
                          {filteredPhotos[selectedAlbumPhotoIndex].locationName}
                        </>
                      )}
                    </span>
                    <span>
                      Foto {selectedAlbumPhotoIndex + 1} di {filteredPhotos.length}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block text-[10px] uppercase font-bold text-orange-200 font-sans">
                      Da: {filteredPhotos[selectedAlbumPhotoIndex].tripTitle}
                    </span>
                    <p className="text-xs md:text-sm font-semibold tracking-wide text-white leading-relaxed">
                      {filteredPhotos[selectedAlbumPhotoIndex].description || "Nessuna descrizione."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : diarySubTab === "list" ? (
        <div className="space-y-4 animate-fade-in">
          {/* Create Trip Form inline dropdown */}
          {showAddTrip && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 max-w-2xl mx-auto animate-fade-in">
              <div className="flex justify-between items-center pb-2 border-b border-stone-100 font-sans">
                <span className="text-xs font-black text-[#3E4A35] uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-orange-400 animate-pulse" />➕
                  Inizia Nuovo Registro Viaggio
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddTrip(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer select-none"
                >
                  X
                </button>
              </div>

              <form onSubmit={handleCreateTrip} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Titolo del Viaggio
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Es: Splendido Ponente Ligure"
                    className="w-full text-xs font-medium px-3 py-2.5 rounded-lg border border-slate-250 outline-none focus:border-[#3E4A35] bg-white text-slate-800 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Data Inizio
                    </label>
                    <input
                      type="date"
                      value={newStart}
                      onChange={(e) => setNewStart(e.target.value)}
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-250 outline-none bg-white text-slate-700 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Data Fine
                    </label>
                    <input
                      type="date"
                      value={newEnd}
                      onChange={(e) => setNewEnd(e.target.value)}
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-250 outline-none bg-white text-slate-700 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      KM Partenza
                    </label>
                    <input
                      type="number"
                      placeholder="KM alla partenza"
                      value={newStartOdo}
                      onChange={(e) => setNewStartOdo(e.target.value)}
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-250 outline-none bg-white text-slate-700 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      KM Arrivo
                    </label>
                    <input
                      type="number"
                      placeholder="KM all'arrivo"
                      value={newEndOdo}
                      onChange={(e) => setNewEndOdo(e.target.value)}
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-250 outline-none bg-white text-slate-700 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Stato Viaggio
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) =>
                      setNewStatus(e.target.value as Trip["status"])
                    }
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-250 outline-none bg-white font-black text-slate-700"
                  >
                    <option value="Completato">Completato</option>
                    <option value="Attivo">In Corso (Attivo)</option>
                    <option value="Pianificato">
                      Pianificato per il futuro
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Racconto
                  </label>
                  <textarea
                    rows={3}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Luoghi da visitare, aree carico, note sul tragitto..."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-250 outline-none bg-white text-slate-700 font-semibold"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#3E4A35] text-white text-xs font-black rounded-lg transition-colors hover:bg-[#5A6B4E] cursor-pointer shadow-sm active:scale-98"
                >
                  Registra Diario
                </button>
              </form>
            </div>
          )}

          {/* Trips selector wrapper */}
          {!showAddTrip && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div className="flex justify-between items-center pb-1">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#3E4A35]" />I Tuoi Viaggi
                  Registrati ({trips.length})
                </h3>
              </div>

              {trips.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-3 bg-[#F2EFE9]/10 rounded-2xl border border-dashed border-stone-200 font-sans select-none">
                  <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
                  <p className="text-sm font-bold text-[#3E4A35]/80">
                    Nessun viaggio pianificato o completato.
                  </p>
                  <p className="text-xs text-slate-400">
                    Clicca &quot;Nuovo Viaggio&quot; per iniziare ad annotare
                    sogni, foto e spese!
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddTrip(true)}
                    className="px-4 py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Inizia ora
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-sans">
                  {sortedTrips.map((trip) => {
                    const isSelected = selectedTripId === trip.id;
                    const totalSpent = trip.includeExpenses !== false
                      ? trip.expenses.reduce((sum, e) => sum + e.amount, 0)
                      : 0;

                    return (
                      <div
                        key={trip.id}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest("button"))
                            return;
                          setSelectedTripId(trip.id);
                          setDiarySubTab("details");
                        }}
                        className={`p-4 rounded-xl border transition-all text-left cursor-pointer flex flex-col justify-between relative overflow-hidden group hover:shadow-md min-h-[184px] h-auto ${
                          isSelected
                            ? "border-[#3E4A35] bg-[#5A6B4E]/20 ring-2 ring-[#3E4A35]/15"
                            : trip.status === "Completato"
                              ? "border-stone-300 hover:border-[#3E4A35]/50 bg-stone-200"
                              : trip.status === "Attivo"
                                ? "border-amber-300 hover:border-[#3E4A35]/50 bg-amber-200"
                                : "border-sky-300 hover:border-[#3E4A35]/50 bg-sky-200"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <span
                              className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                trip.status === "Completato"
                                  ? "bg-[#3E4A35]/15 text-[#3E4A35]"
                                  : trip.status === "Attivo"
                                    ? "bg-orange-100 text-amber-800 animate-pulse"
                                    : "bg-indigo-50 text-indigo-700"
                              }`}
                            >
                              {trip.status}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {getDisplayDates(trip).start}
                            </span>
                          </div>
                          <h4 className="font-bold text-[#2D2926] text-sm mt-2.5 line-clamp-1 group-hover:text-[#3E4A35] transition-colors">
                            {trip.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1 italic line-clamp-2 h-10 leading-relaxed cursor-pointer">
                            {trip.description
                              ? `“${trip.description}”`
                              : "Nessuna descrizione o nota inserita."}
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-2">
                          <div className="flex gap-2 sm:gap-2.5 items-center text-slate-600 font-mono">
                            {/* KM percorsi */}
                            <div className="flex flex-col items-center justify-center text-center" title="Chilometri percorsi">
                              <span className="text-xs leading-none">🛣️</span>
                              <span className="text-[9.5px] font-bold mt-1 leading-tight whitespace-nowrap">
                                {formatDistance(getTripDistance(trip), settings)}
                              </span>
                            </div>

                            <span className="text-slate-300 font-sans select-none">•</span>

                            {/* Soldi spesi */}
                            <div className="flex flex-col items-center justify-center text-center" title="Spese totali">
                              <span className="text-xs leading-none">💶</span>
                              <span className="text-[9.5px] font-bold mt-1 leading-tight whitespace-nowrap">
                                {totalSpent.toFixed(0)}{getCurrencySymbol(settings)}
                              </span>
                            </div>

                            <span className="text-slate-300 font-sans select-none">•</span>

                            {/* Foto */}
                            <div className="flex flex-col items-center justify-center text-center" title="Foto scattate">
                              <span className="text-xs leading-none">📷</span>
                              <span className="text-[9.5px] font-bold mt-1 leading-tight whitespace-nowrap">
                                {trip.photos.length}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.dispatchEvent(
                                  new CustomEvent("open-trip-share-modal", {
                                    detail: { trip },
                                  })
                                );
                              }}
                              className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all flex items-center gap-0.5 uppercase shadow-2xs cursor-pointer active:scale-95 ${
                                trip.isShared
                                  ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                  : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                              }`}
                              title="Condividi questo viaggio sulla Bacheca Social"
                            >
                              <Share2 className="w-2 h-2 shrink-0" />
                              <span>{trip.isShared ? "Social 💬" : "Condividi 🚀"}</span>
                            </button>
                            <span className="px-1.5 py-0.5 bg-[#3E4A35]/5 group-hover:bg-[#3E4A35] text-[#3E4A35] group-hover:text-white rounded-md text-[8.5px] font-extrabold transition-all flex items-center gap-0.5 uppercase shadow-xs">
                              Apri 📖
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* Back button and breadcrumb bar when opening trip details */}
          <div className="flex justify-between items-center bg-[#F2EFE9]/45 border border-stone-200 rounded-2xl p-3 px-4 shadow-xs select-none">
            <button
              onClick={() => setDiarySubTab("list")}
              className="px-3 py-1.5 text-xs font-black text-[#3E4A35] hover:bg-[#3E4A35]/10 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-sans"
            >
              ← Torna all'Elenco Viaggi
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-bold font-mono hidden sm:inline">
                Sotto-Scheda:{" "}
                <span className="text-[#3E4A35] underline">
                  {activeTrip?.title}
                </span>
              </span>
              {activeTrip && (
                <button
                  type="button"
                  onClick={() => setShowPdfExportModal(true)}
                  className="px-3 py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 rounded-lg flex items-center gap-1.5 transition-all border border-emerald-200/60 shadow-xs cursor-pointer select-none active:scale-95 font-sans"
                  title="Genera e scarica un PDF stampabile in formato A4 o A5"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600" /> Esporta Diario
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 text-xs font-black text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-sans border border-red-200/60"
                title="Elimina definitivo questo viaggio"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Elimina Viaggio
              </button>
            </div>
          </div>

          <div className="lg:col-span-12">
            {activeTrip ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-6">
                {/* Trip General Header card */}
                <div className="border-b border-stone-100 pb-4">
                  {isEditingTrip ? (
                    <form
                      onSubmit={handleSaveTripEdit}
                      className="space-y-4 bg-[#F2EFE9]/25 border border-stone-250 p-4 rounded-xl"
                    >
                      <div className="flex justify-between items-center pb-1.5 border-b border-stone-150">
                        <span className="text-[10px] font-black text-[#3E4A35] uppercase tracking-wider flex items-center gap-1.5">
                          <Edit3 className="w-3.5 h-3.5" /> Modifica Dettagli
                          del Viaggio
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEditingTrip(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs font-bold transition-all cursor-pointer select-none"
                        >
                          Annulla
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                            Titolo del Viaggio
                          </label>
                          <input
                            type="text"
                            required
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 bg-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                              Data Inizio
                            </label>
                            <input
                              type="date"
                              value={editStart}
                              onChange={(e) => setEditStart(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                              Data Fine
                            </label>
                            <input
                              type="date"
                              value={editEnd}
                              onChange={(e) => setEditEnd(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                              KM Partenza
                            </label>
                            <input
                              type="number"
                              placeholder="KM alla partenza"
                              value={editStartOdo}
                              onChange={(e) => setEditStartOdo(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                              KM Arrivo
                            </label>
                            <input
                              type="number"
                              placeholder="KM all'arrivo"
                              value={editEndOdo}
                              onChange={(e) => setEditEndOdo(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                              Stato Viaggio
                            </label>
                            <select
                              value={editStatus}
                              onChange={(e) =>
                                setEditStatus(e.target.value as Trip["status"])
                              }
                              className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-bold"
                            >
                              <option value="Completato">Completato</option>
                              <option value="Attivo">In Corso (Attivo)</option>
                              <option value="Pianificato">
                                Pianificato per il futuro
                              </option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                            Racconto
                          </label>
                          <textarea
                            rows={3}
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="submit"
                          className="flex-1 py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer select-none"
                        >
                          <Save className="w-3.5 h-3.5" /> Salva ed Applica
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingTrip(false)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer select-none"
                        >
                          Annulla
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 w-full">
                        <div className="min-w-0 w-full sm:flex-1">
                          <div className="flex flex-wrap items-center gap-2 w-full">
                            <span className="text-[10px] font-black tracking-widest text-[#5A6B4E] uppercase shrink-0">
                              Diario Attivo
                            </span>

                            <select
                              value={activeTrip.status}
                              onChange={(e) =>
                                handleUpdateTripStatus(
                                  e.target.value as Trip["status"],
                                )
                              }
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black font-mono uppercase tracking-wider cursor-pointer outline-none border-none shrink-0 ${
                                activeTrip.status === "Completato"
                                  ? "bg-[#3E4A35]/10 text-[#3E4A35]"
                                  : "bg-orange-100 text-amber-800"
                              }`}
                            >
                              <option value="Completato">Completato</option>
                              <option value="Attivo">In Corso (Attivo)</option>
                              <option value="Pianificato">
                                Pianificato per il futuro
                              </option>
                            </select>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                onClick={startEditingActiveTrip}
                                className="p-1 text-slate-400 hover:text-[#3E4A35] hover:bg-stone-100 rounded-lg transition-all cursor-pointer shrink-0"
                                title="Modifica dettagli del viaggio"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  const nextIsShared = !activeTrip.isShared;
                                  const updated = trips.map((t) =>
                                    t.id === activeTrip.id
                                      ? { ...t, isShared: nextIsShared }
                                      : t,
                                  );
                                  setTrips(updated);
                                  if (nextIsShared) {
                                    window.dispatchEvent(
                                      new CustomEvent("open-trip-share-modal", {
                                        detail: { trip: activeTrip },
                                      })
                                    );
                                  } else {
                                    window.dispatchEvent(
                                      new CustomEvent("show-toast", {
                                        detail: {
                                          message: `🔒 Viaggio "${activeTrip.title}" reso privato.`,
                                        },
                                      }),
                                    );
                                  }
                                }}
                                className={`p-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${activeTrip.isShared ? "bg-indigo-100 text-indigo-700 font-bold" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"}`}
                                title={
                                  activeTrip.isShared
                                    ? "Viaggio condiviso sul Social (clicca per rendere privato)"
                                    : "Condividi questo viaggio sul Social"
                                }
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  window.dispatchEvent(
                                    new CustomEvent("open-trip-share-modal", {
                                      detail: { trip: activeTrip },
                                    })
                                  );
                                }}
                                className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
                                title="Condividi sulla Bacheca Social della Community"
                              >
                                <Share2 className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate max-w-[130px] sm:max-w-none">{activeTrip.isShared ? "Pubblicato 💬" : "Condividi 👥"}</span>
                              </button>
                              <button
                                onClick={handleCloudSyncClick}
                                disabled={isSyncingCloud}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95 disabled:opacity-80 ${
                                  autoSyncState === "saving" || isSyncingCloud
                                    ? "bg-amber-500 text-white animate-pulse"
                                    : autoSyncState === "offline"
                                    ? "bg-stone-600 text-amber-200"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                }`}
                                title={
                                  autoSyncState === "saving" || isSyncingCloud
                                    ? "Salvataggio Cloud automatico in corso..."
                                    : autoSyncState === "offline"
                                    ? "Offline: salvato localmente"
                                    : lastSyncedTime
                                    ? `Cloud sincronizzato (${lastSyncedTime})`
                                    : "Sincronizza Cloud"
                                }
                              >
                                {autoSyncState === "saving" || isSyncingCloud ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 shrink-0 animate-spin" />
                                    <span className="truncate max-w-[130px] sm:max-w-none">Salvataggio...</span>
                                  </>
                                ) : autoSyncState === "offline" ? (
                                  <>
                                    <CloudOff className="w-3 h-3 shrink-0 text-amber-300" />
                                    <span className="truncate max-w-[130px] sm:max-w-none">Offline</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-200" />
                                    <span className="truncate max-w-[130px] sm:max-w-none">{lastSyncedTime ? `Cloud ✓ (${lastSyncedTime})` : "Cloud ✓"}</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  checkCloudStatus();
                                  setShowSyncModal(true);
                                }}
                                className="flex items-center gap-1 px-2 py-1 bg-stone-100 hover:bg-stone-200 text-[#3E4A35] rounded-lg text-[11px] font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
                                title="Apri diagnostica sincronizzazione e backup file"
                              >
                                <Database className="w-3.5 h-3.5 shrink-0 text-[#3E4A35]" />
                                <span className="truncate max-w-[130px] sm:max-w-none">Backup</span>
                              </button>
                            </div>
                          </div>
                          <h2 className="text-xl font-bold tracking-tight text-[#2D2926] mt-2 break-words leading-snug w-full">
                            {activeTrip.title}
                          </h2>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-semibold font-mono">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{getDisplayDates(activeTrip).start}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span>{getDisplayDates(activeTrip).end}</span>
                          </div>
                        </div>

                        {/* Trip Odometer & quick stats indicator */}
                        <div className="flex gap-4 flex-wrap sm:flex-nowrap items-center">
                          <div className="bg-[#F5F2ED]/60 border border-slate-150 p-2 px-3 rounded-xl text-center min-w-[75px]">
                            <span className="text-[8px] font-bold text-slate-400 uppercase block">
                              Distanza
                            </span>
                            <span className="text-sm font-black text-slate-750 font-mono">
                              {odometerDiff > 0 ? `${formatDistance(odometerDiff, settings)}` : "---"}
                            </span>
                          </div>
                          <div className="bg-[#A45C40]/10 border border-transparent p-2 px-3 rounded-xl text-center min-w-[90px]">
                            <span className="text-[8px] font-bold text-[#A45C40] uppercase block">
                              Budget Speso
                            </span>
                            <span className="text-sm font-black text-[#A45C40] font-mono">
                              {totalExpensesOfActive.toFixed(2)} {getCurrencySymbol(settings)}
                            </span>
                          </div>
                        </div>
                      </div>


                  </div>
                  )}
                </div>

                {/* TWO SECTIONS GRID: PHOTOS & EXPENSES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* 1. EXPENSES & REFUELING LOG SECTION */}
                  <div className="space-y-4">
                    {/* Toggle Selector for Spese vs Rifornimenti vs Spostamenti */}
                    <div className="flex p-1 bg-stone-100 rounded-xl border border-stone-200/30 gap-1 flex-wrap md:flex-nowrap">
                      <button
                        type="button"
                        onClick={() => setExpenseSubMode("general")}
                        className={`flex-1 min-w-[30%] py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          expenseSubMode === "general"
                            ? "bg-white text-slate-800 shadow-xs border border-slate-200/50"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <Euro className="w-3.5 h-3.5 text-[#A45C40]" />
                        Spese (
                        {
                          activeTrip.expenses.filter(
                            (e) => e.category !== "Carburante",
                          ).length
                        }
                        )
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpenseSubMode("refuel")}
                        className={`flex-1 min-w-[30%] py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          expenseSubMode === "refuel"
                            ? "bg-[#3E4A35] text-white shadow-xs"
                            : "text-slate-500 hover:text-[#3E4A35]"
                        }`}
                      >
                        <Fuel className="w-3.5 h-3.5 text-emerald-500" />
                        Rifornimenti (
                        {
                          activeTrip.expenses.filter(
                            (e) => e.category === "Carburante",
                          ).length
                        }
                        )
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpenseSubMode("movement")}
                        className={`flex-1 min-w-[20%] py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          expenseSubMode === "movement"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-500 hover:text-blue-600"
                        }`}
                      >
                        <Route className="w-3.5 h-3.5 text-blue-400" />
                        Spostamenti ({(activeTrip.movements || []).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpenseSubMode("planned")}
                        className={`flex-1 min-w-[20%] py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          expenseSubMode === "planned"
                            ? "bg-amber-600 text-white shadow-xs"
                            : "text-slate-500 hover:text-amber-600"
                        }`}
                      >
                        <MapIcon className="w-3.5 h-3.5 text-amber-400" />
                        Pianificazione ({(activeTrip.routePoints || []).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpenseSubMode("photo")}
                        className={`flex-1 min-w-[20%] py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          expenseSubMode === "photo"
                            ? "bg-purple-600 text-white shadow-xs"
                            : "text-slate-500 hover:text-purple-600"
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5 text-purple-400" />
                        Foto e ricordi ({activeTripPhotos.length})
                      </button>
                    </div>

                    {expenseSubMode === "photo" ? (
                      <div className="space-y-4 animate-fade-in">
                        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <Camera className="w-4 h-4 text-[#3E4A35]" />
                          Scatti & Ricordi Fotografici ({activeTripPhotos.length})
                        </h3>

                        {/* Add Photo Form - Real Uploading interface */}
                        <form
                          onSubmit={handleAddPhoto}
                          className="p-4 bg-stone-50 rounded-xl border border-stone-100 space-y-3 font-sans"
                        >
                          {/* Intestazione Caricamento Foto */}
                          <div className="flex justify-between items-center pb-2 border-b border-stone-150 flex-wrap gap-2">
                            <span className="text-[10.5px] font-black text-[#3E4A35] flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5" />
                              Aggiungi Foto al Diario
                            </span>
                            {(uploadedImages.length > 0 || uploadedImageUrl) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadedImages([]);
                                  setUploadedImageUrl("");
                                }}
                                className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Rimuovi tutte</span>
                              </button>
                            )}
                          </div>

                          {/* Hidden File Inputs for Camera and Gallery/Files */}
                          <input
                            id="diary-camera-input"
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileInputChange}
                            className="hidden"
                          />
                          <input
                            id="diary-file-input"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileInputChange}
                            className="hidden"
                          />

                          {photoType === "upload" && (
                            <div className="space-y-2.5">
                              {/* Pulsante Scatta Foto Diretta */}
                              <button
                                type="button"
                                onClick={() =>
                                  document.getElementById("diary-camera-input")?.click()
                                }
                                className="w-full py-2.5 px-3 bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-500/50 rounded-xl flex items-center justify-center gap-2.5 transition cursor-pointer text-slate-700 hover:text-emerald-900 group shadow-xs active:scale-[0.99]"
                              >
                                <div className="w-7 h-7 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                                  <Camera className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                  <span className="text-xs font-bold block leading-tight">
                                    Scatta Foto
                                  </span>
                                  <span className="text-[10px] text-slate-400 block leading-tight">
                                    Usa direttamente la fotocamera
                                  </span>
                                </div>
                              </button>

                              {/* Drag & Drop zone / Sfoglia file / Previews */}
                              <div
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                onClick={() =>
                                  document
                                    .getElementById("diary-file-input")
                                    ?.click()
                                }
                                className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[95px] relative ${
                                  dragActive
                                    ? "border-[#3E4A35] bg-[#3E4A35]/5 scale-[0.99]"
                                    : (uploadedImages.length > 0 || uploadedImageUrl)
                                      ? "border-emerald-500/50 bg-emerald-50/15"
                                      : "border-slate-200 hover:border-[#3E4A35]/40 hover:bg-slate-50/50"
                                }`}
                              >
                                {isUploading ? (
                                  <div className="space-y-2 flex flex-col items-center">
                                    <Loader2 className="w-6 h-6 text-[#3E4A35] animate-spin" />
                                    <p className="text-[10px] text-slate-500 font-bold font-sans">
                                      Elaborazione e compressione foto in corso...
                                    </p>
                                  </div>
                                ) : uploadedImages.length > 0 ? (
                                  <div className="space-y-2.5 w-full">
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[160px] overflow-y-auto p-1">
                                      {uploadedImages.map((img, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-emerald-500/50 shadow-xs group bg-slate-100">
                                          <img
                                            src={img.url}
                                            alt={img.name}
                                            className="w-full h-full object-cover"
                                            referrerPolicy={
                                              img.url?.startsWith("http")
                                                ? "no-referrer"
                                                : undefined
                                            }
                                          />
                                          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center pointer-events-none">
                                            <span className="text-white text-[9px] font-black bg-emerald-600/90 rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                                              ✓
                                            </span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(evt) => {
                                              evt.stopPropagation();
                                              setUploadedImages((prev) => prev.filter((_, i) => i !== idx));
                                              if (uploadedImages.length === 1) {
                                                setUploadedImageUrl("");
                                              } else if (uploadedImageUrl === img.url) {
                                                const remaining = uploadedImages.filter((_, i) => i !== idx);
                                                setUploadedImageUrl(remaining[remaining.length - 1].url);
                                              }
                                            }}
                                            className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 text-white rounded-md transition-all z-20 flex items-center justify-center active:scale-95 cursor-pointer"
                                            title="Rimuovi"
                                          >
                                            <X className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="flex items-center justify-between px-1 flex-wrap gap-1">
                                      <p className="text-[10px] text-emerald-700 font-bold">
                                        ✓ {uploadedImages.length} {uploadedImages.length === 1 ? 'foto pronta' : 'foto pronte'} per il diario
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            document.getElementById("diary-camera-input")?.click();
                                          }}
                                          className="text-[10px] text-[#3E4A35] font-bold hover:underline flex items-center gap-0.5"
                                        >
                                          <Camera className="w-2.5 h-2.5" />
                                          Scatta altra
                                        </button>
                                        <span className="text-slate-300">•</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            document.getElementById("diary-file-input")?.click();
                                          }}
                                          className="text-[10px] text-indigo-700 font-bold hover:underline flex items-center gap-0.5"
                                        >
                                          <ImageIcon className="w-2.5 h-2.5" />
                                          Sfoglia altre
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : uploadedImageUrl ? (
                                  <div className="space-y-2 flex flex-col items-center">
                                    <div className="relative w-16 h-14 rounded-lg overflow-hidden border border-emerald-500 shadow-xs">
                                      <img
                                        src={uploadedImageUrl}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                        referrerPolicy={
                                          uploadedImageUrl?.startsWith("http")
                                            ? "no-referrer"
                                            : undefined
                                        }
                                      />
                                      <div className="absolute inset-0 bg-emerald-500/25 flex items-center justify-center">
                                        <span className="text-white text-[9px] font-black bg-emerald-600/90 rounded-full w-4 h-4 flex items-center justify-center">
                                          ✓
                                        </span>
                                      </div>
                                    </div>
                                    <p className="text-[10px] text-emerald-700 font-bold">
                                      Foto caricata e pronta per il salvataggio!
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-1 py-1">
                                    <Upload className="w-5 h-5 text-slate-400 mx-auto" />
                                    <p className="text-[10.5px] text-slate-600 font-bold">
                                      Oppure trascina qui le foto o{" "}
                                      <span className="text-[#3E4A35] underline font-bold">
                                        sfoglia i file
                                      </span>
                                    </p>
                                    <p className="text-[9px] text-slate-400">
                                      PNG, JPG, WEBP fino a 15MB con compressione automatica
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {uploadError && (
                            <p className="text-[9.5px] text-red-500 font-black bg-red-50 p-1.5 rounded-lg border border-red-100 flex items-center gap-1 select-none">
                              ⚠️ {uploadError}
                            </p>
                          )}

                          <input
                            type="text"
                            required
                            placeholder="Scrivi un pensiero o descrizione..."
                            value={photoDesc}
                            onChange={(e) => setPhotoDesc(e.target.value)}
                            className="w-full text-xs px-2.5 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-[#3E4A35] font-semibold"
                          />

                          {/* Select Tappa for Photo */}
                          {activeTrip.movements && activeTrip.movements.length > 0 && (
                            <div className="space-y-1 animate-fade-in">
                              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                📍 Associa alla Tappa del Viaggio
                              </label>
                              <select
                                value={photoLocationName}
                                onChange={(e) => setPhotoLocationName(e.target.value)}
                                className="w-full text-xs px-2.5 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-[#3E4A35] bg-white font-semibold text-slate-700"
                              >
                                <option value="">Nessuna tappa specifica (Generico)</option>
                                {Array.from(new Set(activeTrip.movements.map((m) => m.location))).map((loc) => (
                                  <option key={loc} value={loc}>
                                    {loc}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={isUploading}
                            className={`w-full py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 select-none ${
                              isUploading ? "opacity-60 cursor-not-allowed" : ""
                            }`}
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Caricamento...
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                Salva Foto nel Diario
                              </>
                            )}
                          </button>
                        </form>

                        {/* Banner: Local Storage Photo Recovery */}
                        {localOrphanPhotosCount > 0 && (
                          <div className="mb-3 bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-emerald-900 shadow-xs animate-fade-in">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700 shrink-0">
                                <Sparkles className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-emerald-950">
                                  Trovate {localOrphanPhotosCount} {localOrphanPhotosCount === 1 ? 'foto salvata' : 'foto salvate'} nella memoria locale
                                </h4>
                                <p className="text-[11px] text-emerald-800">
                                  Foto presenti nella memoria interna del dispositivo non ancora visibili in questo diario.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={isRestoringLocalPhotos}
                              onClick={handleRestoreOrphanPhotos}
                              className="px-3 py-1.5 bg-[#3E4A35] hover:bg-[#2d3627] text-white text-[11px] font-bold rounded-lg shadow-xs active:scale-95 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                            >
                              {isRestoringLocalPhotos ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Ripristino...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Ripristina Tutte ({localOrphanPhotosCount})
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Batch Import Progress indicator */}
                        {isBatchImporting && batchImportProgress && (
                          <div className="mb-3 bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-900 shadow-xs animate-fade-in">
                            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                              <span className="flex items-center gap-1.5">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                Elaborazione e salvataggio foto...
                              </span>
                              <span>
                                {batchImportProgress.current} / {batchImportProgress.total} (
                                {Math.round((batchImportProgress.current / batchImportProgress.total) * 100)}%)
                              </span>
                            </div>
                            <div className="w-full bg-blue-200/60 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-[#3E4A35] h-full transition-all duration-200"
                                style={{
                                  width: `${(batchImportProgress.current / batchImportProgress.total) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Gallery Fast Actions Bar */}
                        <div className="flex items-center justify-between gap-2 mb-2 px-1">
                          <span className="text-[11px] font-bold text-slate-600">
                            Scatti nel diario ({activeTripPhotos.length})
                          </span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              id="batch-add-photos"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files) handleBatchAddGalleryPhotos(e.target.files);
                                e.target.value = "";
                              }}
                            />
                            <label
                              htmlFor="batch-add-photos"
                              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-bold rounded-lg cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1 transition-all"
                              title="Seleziona e aggiungi molteplici foto dalla galleria"
                            >
                              <Upload className="w-3 h-3 text-[#3E4A35]" />
                              Carica Multiplo
                            </label>
                            {activeTripPhotos.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setShowDeleteAllPhotosConfirm(true)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold rounded-lg cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1 transition-all"
                                title="Elimina tutte le foto di questo viaggio per ricaricarle da zero"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                Svuota tutte
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => scanLocalOrphanPhotos()}
                              className="p-1 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-[10px] font-medium transition-colors"
                              title="Scansiona memoria locale per foto non collegate"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Banner if photos need re-upload */}
                        {(() => {
                          const missingPhotos = (activeTripPhotos || []).filter(
                            (p) => p.url && (p.url.startsWith("/uploads/") || p.url.includes("trip_photo_"))
                          );
                          if (missingPhotos.length === 0) return null;
                          return (
                            <div className="mb-3 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-amber-900 dark:text-amber-200 shadow-xs">
                              <div className="flex items-start gap-2.5">
                                <Camera className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-xs font-bold block">
                                    {missingPhotos.length} {missingPhotos.length === 1 ? "foto richiede" : "foto richiedono"} di essere ricaricate dalla galleria
                                  </span>
                                  <span className="text-[10.5px] text-amber-700 dark:text-amber-300">
                                    Questi scatti iniziali non erano stati salvati nel Cloud. Tocca "Ricarica foto" per selezionarli dalla galleria o tocca le singole schede qui sotto.
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0 flex items-center gap-1.5 w-full sm:w-auto justify-end">
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  id="batch-reload-photos"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files) handleBatchReloadPhotos(e.target.files);
                                  }}
                                />
                                <label
                                  htmlFor="batch-reload-photos"
                                  className="w-full sm:w-auto text-center px-3 py-1.5 bg-[#3E4A35] hover:bg-[#2d3627] text-white text-[11px] font-bold rounded-lg cursor-pointer shadow-xs active:scale-95 flex items-center justify-center gap-1.5 transition-all"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  Ricarica foto dalla galleria
                                </label>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Banner for recovered photos with generic description */}
                        {(() => {
                          const recoveredPhotos = (activeTripPhotos || []).filter(
                            (p) => p.description === "Foto recuperata dalla memoria"
                          );
                          if (recoveredPhotos.length === 0) return null;
                          return (
                            <div className="mb-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-blue-900 dark:text-blue-200 shadow-xs">
                              <div className="flex items-start gap-2.5">
                                <Pencil className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-xs font-bold block">
                                    {recoveredPhotos.length} {recoveredPhotos.length === 1 ? "foto ha" : "foto hanno"} la dicitura automatica "Foto recuperata"
                                  </span>
                                  <span className="text-[10.5px] text-blue-700 dark:text-blue-300">
                                    Questi scatti sono stati recuperati senza titolo e posizione originale. Tocca la matita su ciascuna foto o premi il pulsante per completare velocemente luogo e descrizione.
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenEditPhoto(recoveredPhotos[0])}
                                className="w-full sm:w-auto text-center px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-bold rounded-lg cursor-pointer shadow-xs active:scale-95 flex items-center justify-center gap-1.5 transition-all shrink-0"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Compila dettagli foto
                              </button>
                            </div>
                          );
                        })()}

                        {/* Photo logs display with Fast Thumbnails and Lazy Rendering */}
                        <div className="grid grid-cols-2 gap-3 max-h-[450px] overflow-y-auto pr-1">
                          {activeTripPhotos.length === 0 ? (
                            <div className="col-span-2 text-xs text-slate-400 py-8 text-center bg-white border border-slate-100 rounded-lg">
                              <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                              Nessuno scatto caricato. Scatta o simula la prima foto
                              della vacanza!
                            </div>
                          ) : (
                            displayedTripPhotos.map((photo) => {
                              const originalIdx = activeTripPhotos.findIndex((p) => p.id === photo.id);
                              const isMissing = photo.url && (photo.url.startsWith("/uploads/") || photo.url.includes("trip_photo_"));
                              const isRecovered = photo.description === "Foto recuperata dalla memoria";

                              return (
                                <div
                                  key={photo.id}
                                  className={`rounded-xl overflow-hidden border relative group cursor-pointer transition-all ${
                                    isMissing
                                      ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 hover:border-amber-400"
                                      : isRecovered
                                      ? "bg-stone-50 rounded-xl border-amber-200/80 dark:border-amber-900/50 hover:border-amber-400"
                                      : "bg-stone-50 rounded-xl border-slate-150"
                                  }`}
                                  onClick={() => {
                                    if (isMissing) {
                                      const input = document.getElementById(`replace-photo-${photo.id}`) as HTMLInputElement;
                                      input?.click();
                                    } else {
                                      setSelectedLightboxPhotoIndex(originalIdx >= 0 ? originalIdx : 0);
                                    }
                                  }}
                                >
                                  <div className="relative w-full h-24 overflow-hidden bg-stone-100 dark:bg-stone-800">
                                    {isMissing ? (
                                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100/80 transition-colors">
                                        <div className="w-7 h-7 rounded-full bg-amber-200/80 dark:bg-amber-800/60 flex items-center justify-center mb-1 text-amber-800 dark:text-amber-200">
                                          <Camera className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200 leading-tight">
                                          Tocca per ricaricare
                                        </span>
                                        <span className="text-[8.5px] text-amber-700 dark:text-amber-400">
                                          dalla galleria
                                        </span>
                                      </div>
                                    ) : (
                                      <>
                                        <CamperImage
                                          src={photo.url}
                                          photoId={photo.id}
                                          thumbnail={true}
                                          alt={photo.description}
                                          onReplace={(file) => handleReplacePhoto(photo.id, file)}
                                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />

                                        {/* Hover overlay with Eye zoom icon */}
                                        <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <span className="p-1.5 bg-white/10 backdrop-blur-xs text-white rounded-full border border-white/20">
                                            <Eye className="w-3.5 h-3.5" />
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  <div className="p-2 space-y-1">
                                    <div className="flex items-start justify-between gap-1">
                                      <p className={`text-[10px] leading-tight line-clamp-2 ${
                                        isRecovered
                                          ? "text-amber-800 dark:text-amber-300 italic font-medium"
                                          : "text-slate-700 dark:text-slate-200 font-medium"
                                      }`}>
                                        {photo.description}
                                      </p>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEditPhoto(photo);
                                        }}
                                        className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded text-stone-400 hover:text-[#3E4A35] shrink-0 transition-colors"
                                        title="Modifica descrizione e posizione"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                    </div>

                                    {photo.locationName ? (
                                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 rounded text-[9px] font-bold">
                                        <MapPin className="w-2.5 h-2.5" />
                                        {photo.locationName}
                                      </span>
                                    ) : isRecovered ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEditPhoto(photo);
                                        }}
                                        className="text-[9px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-0.5 pt-0.5"
                                      >
                                        <Pencil className="w-2.5 h-2.5" /> Aggiungi luogo e titolo
                                      </button>
                                    ) : null}
                                  </div>

                                  {/* Re-upload photo from gallery input and button */}
                                  <input
                                    id={`replace-photo-${photo.id}`}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        handleReplacePhoto(photo.id, e.target.files[0]);
                                      }
                                    }}
                                  />
                                  {!isMissing && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const input = document.getElementById(`replace-photo-${photo.id}`) as HTMLInputElement;
                                        input?.click();
                                      }}
                                      className="absolute top-1.5 left-1.5 p-1.5 bg-black/50 hover:bg-[#3E4A35] text-white rounded-lg transition-colors z-10 opacity-80 group-hover:opacity-100"
                                      title="Ricarica / Sostituisci foto dalla galleria"
                                    >
                                      <Camera className="w-3 h-3" />
                                    </button>
                                  )}

                                  {/* Edit button on card hover */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditPhoto(photo);
                                    }}
                                    className="absolute top-1.5 right-8 p-1.5 bg-black/50 hover:bg-[#3E4A35] text-white rounded-lg transition-colors z-10 opacity-80 group-hover:opacity-100"
                                    title="Modifica descrizione e posizione"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPhotoToDelete(photo.id);
                                    }}
                                    className="absolute top-1.5 right-1.5 p-1.5 bg-black/50 hover:bg-red-600 text-white rounded-lg transition-colors z-10"
                                    title="Rimuovi foto"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Pagination controls for large photo collections */}
                        {activeTripPhotos.length > 24 && (
                          <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 bg-stone-50/80 p-2.5 rounded-xl text-stone-600 animate-fade-in">
                            <span className="text-[11px] font-medium text-stone-600">
                              Mostrati <strong className="text-stone-900 font-bold">{displayedTripPhotos.length}</strong> di <strong className="text-stone-900 font-bold">{activeTripPhotos.length}</strong> scatti
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {displayedTripPhotos.length < activeTripPhotos.length ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setVisiblePhotosCount((prev) => Math.min(prev + 24, activeTripPhotos.length))}
                                    className="px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-800 text-[10px] font-bold rounded-lg border border-stone-200 shadow-2xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                    Carica altri 24
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setVisiblePhotosCount(activeTripPhotos.length)}
                                    className="px-2.5 py-1.5 bg-[#3E4A35] hover:bg-[#2d3627] text-white text-[10px] font-bold rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
                                  >
                                    Mostra tutti ({activeTripPhotos.length})
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setVisiblePhotosCount(24)}
                                  className="px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-700 text-[10px] font-bold rounded-lg border border-stone-200 shadow-2xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                  Riduci a 24
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : expenseSubMode === "general" ? (
                      /* ---------------- GENERAL EXPENSES VIEW ---------------- */
                      <div className="space-y-4 animate-fade-in">
                        {activeTrip.includeExpenses === false ? (
                          <div className="p-8 text-center bg-stone-50 rounded-xl border border-stone-200/60 text-slate-500 space-y-2">
                            <span className="text-2xl">🔒</span>
                            <p className="text-xs font-bold text-slate-700">Le spese di questo viaggio sono nascoste per privacy.</p>
                          </div>
                        ) : (
                          <>
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                            💸 Nuova Spesa di Viaggio
                          </h3>
                        </div>

                        {/* General Expense Form */}
                        <form
                          onSubmit={handleAddExpense}
                          className="p-3 bg-stone-50 rounded-xl border border-stone-100 space-y-2"
                        >
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              required
                              placeholder="Voce di spesa (es. Spesa Coop, Traghetto, Souvenir)"
                              value={expenseTitle}
                              onChange={(e) => setExpenseTitle(e.target.value)}
                              className="col-span-2 w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-[#A45C40] text-slate-800 font-bold"
                            />
                            <input
                              type="number"
                              step="0.01"
                              required
                              placeholder={`Importo ${getCurrencySymbol(settings)}`}
                              value={expenseAmount}
                              onChange={(e) => setExpenseAmount(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-[#A45C40] text-slate-800 font-bold font-mono"
                            />
                            <select
                              value={expenseCategory}
                              onChange={(e) =>
                                setExpenseCategory(
                                  e.target.value as DiaryExpense["category"],
                                )
                              }
                              className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 outline-none bg-white text-slate-800 font-bold"
                            >
                              <option value="Autostrada">🛣️ Autostrada</option>
                              <option value="Cibo">🛒 Alimentari/Spesa</option>
                              <option value="Sosta">
                                ⛺ Area Sosta / Camping / Parcheggio
                              </option>
                              <option value="Altro">🏷️ Altro / Extra</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">
                              Data
                            </label>
                            <input
                              type="date"
                              value={expenseDate}
                              onChange={(e) => setExpenseDate(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none bg-white font-bold"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="flex-1 py-1.5 bg-[#A45C40]/90 hover:bg-[#A45C40] text-white rounded-lg text-[11px] font-black uppercase tracking-wider cursor-pointer"
                            >
                              {editingExpenseId ? "Aggiorna Spesa" : "Aggiungi Spesa"}
                            </button>
                            {editingExpenseId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingExpenseId(null);
                                  setExpenseTitle("");
                                  setExpenseAmount("");
                                  setExpenseDate("");
                                  setExpenseCategory("Autostrada");
                                }}
                                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-black uppercase tracking-wider cursor-pointer"
                              >
                                Annulla
                              </button>
                            )}
                          </div>
                        </form>

                        {/* General Expenses list */}
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {activeTrip.expenses.filter(
                            (e) => e.category !== "Carburante",
                          ).length === 0 ? (
                            <p className="text-xs text-slate-400 py-6 text-center">
                              Nessuna spesa di viaggio inserita.
                            </p>
                          ) : (
                            activeTrip.expenses
                              .filter((e) => e.category !== "Carburante")
                              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                              .map((exp) => (
                                <div
                                  key={exp.id}
                                  className="flex justify-between items-center p-2.5 bg-white border border-slate-100 rounded-lg hover:border-slate-200"
                                >
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                                        {exp.category === "Cibo"
                                          ? "Cibo"
                                          : exp.category === "Sosta"
                                            ? "Sosta/Parcheggio"
                                            : exp.category}
                                      </span>
                                      <p className="text-xs font-bold text-slate-800 line-clamp-1">
                                        {exp.title}
                                      </p>
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                                      {formatDateDDMMAA(exp.date)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-[#A45C40] font-mono">
                                      -{exp.amount.toFixed(2)} {getCurrencySymbol(settings)}
                                    </span>
                                    <button
                                      onClick={() => handleEditExpense(exp)}
                                      className="text-slate-350 hover:text-blue-500 rounded p-1 transition-colors cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteExpense(exp.id)
                                      }
                                      className="text-slate-350 hover:text-red-500 rounded p-1 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))
                          )}
                        </div>
                          </>
                        )}
                      </div>
                    ) : expenseSubMode === "refuel" ? (
                      /* ---------------- FUEL REFUELING DIARY VIEW ---------------- */
                      <div className="space-y-4 animate-fade-in font-sans">
                        {activeTrip.includeExpenses === false ? (
                          <div className="p-8 text-center bg-stone-50 rounded-xl border border-stone-200/60 text-slate-500 space-y-2">
                            <span className="text-2xl">🔒</span>
                            <p className="text-xs font-bold text-slate-700">I rifornimenti e le spese di questo viaggio sono nascosti per privacy.</p>
                          </div>
                        ) : (
                          <>
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                            {editingExpenseId ? "✏️ Modifica Rifornimento Carburante" : "⛽ Nuovo Rifornimento Carburante"}
                          </h3>
                        </div>

                        {/* Refueling Form */}
                        <form
                          ref={expenseFormRef}
                          onSubmit={handleAddExpense}
                          className="p-3 bg-stone-50 rounded-xl border border-stone-100 space-y-3"
                        >
                          <div className="grid grid-cols-2 gap-2.5">
                            {/* Distributor Brand */}
                            <div className="col-span-2 space-y-1">
                              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                Brand distributore
                              </label>
                              <select
                                value={fuelCompany}
                                required
                                onChange={(e) => setFuelCompany(e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none bg-white text-slate-800 font-bold"
                              >
                                <option value="Eni">🟡 Eni</option>
                                <option value="Q8">
                                  🔵 Q8 (Kuwait Petroleum)
                                </option>
                                <option value="Esso">🔴 Esso</option>
                                <option value="IP">🟢 IP (Gruppo API)</option>
                                <option value="Tamoil">🟢 Tamoil</option>
                                <option value="Coop">🔴 EnerCoop</option>
                                <option value="Repsol">🟠 Repsol</option>
                                <option value="Pompa Bianca">
                                  ⚪ Pompa Bianca (No-Brand)
                                </option>
                                <option value="Altro">🏕️ Altro brand</option>
                              </select>
                            </div>

                            {/* Liters & Cost Per Liter */}
                            <div className="space-y-1">
                              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                                <span>Litri (L)</span>
                                <span className="text-[8px] text-slate-400 font-normal">Opzionale</span>
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Es. 54.20"
                                value={fuelLiters}
                                onChange={(e) => {
                                  const liters = e.target.value;
                                  setFuelLiters(liters);
                                  if (fuelPricePerLiter) {
                                    const computed =
                                      (parseFloat(liters) || 0) *
                                      (parseFloat(fuelPricePerLiter) || 0);
                                    setExpenseAmount(
                                      computed > 0 ? computed.toFixed(2) : "",
                                    );
                                  } else if (expenseAmount && parseFloat(liters) > 0) {
                                    const p = parseFloat(expenseAmount) / parseFloat(liters);
                                    if (p > 0) setFuelPricePerLiter(p.toFixed(3));
                                  }
                                }}
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-emerald-500 text-slate-800 font-bold font-mono"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                                <span>Prezzo al litro ({getCurrencySymbol(settings)}/L)</span>
                                <span className="text-[8px] text-slate-400 font-normal">Opzionale</span>
                              </label>
                              <input
                                type="number"
                                step="0.001"
                                placeholder="Es. 1.789"
                                value={fuelPricePerLiter}
                                onChange={(e) => {
                                  const price = e.target.value;
                                  setFuelPricePerLiter(price);
                                  if (fuelLiters) {
                                    const computed =
                                      (parseFloat(fuelLiters) || 0) *
                                      (parseFloat(price) || 0);
                                    setExpenseAmount(
                                      computed > 0 ? computed.toFixed(2) : "",
                                    );
                                  } else if (expenseAmount && parseFloat(price) > 0) {
                                    const l = parseFloat(expenseAmount) / parseFloat(price);
                                    if (l > 0) setFuelLiters(l.toFixed(2));
                                  }
                                }}
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-emerald-500 text-slate-800 font-bold font-mono"
                              />
                            </div>

                            {/* Computed Total Cost & Current Odometer */}
                            <div className="space-y-1">
                              <label className="block text-[9px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest flex items-center justify-between">
                                <span>Importo Speso ({getCurrencySymbol(settings)}) *</span>
                                <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                  Basta anche solo questo
                                </span>
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                required
                                placeholder="Es. 50.00 (oppure calcolato)"
                                value={expenseAmount}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setExpenseAmount(val);
                                  const num = parseFloat(val);
                                  if (num > 0) {
                                    if (fuelLiters && !fuelPricePerLiter && parseFloat(fuelLiters) > 0) {
                                      setFuelPricePerLiter((num / parseFloat(fuelLiters)).toFixed(3));
                                    } else if (!fuelLiters && fuelPricePerLiter && parseFloat(fuelPricePerLiter) > 0) {
                                      setFuelLiters((num / parseFloat(fuelPricePerLiter)).toFixed(2));
                                    }
                                  }
                                }}
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border-2 border-emerald-500 outline-none bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 font-black font-mono focus:border-emerald-600 focus:bg-emerald-50"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                                <span>Contachilometri ({getDistanceUnit(settings)})</span>
                                <span className="text-[8px] text-slate-400 font-normal">Opzionale</span>
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder={`Min: ${activeTrip.startOdometer || 0}`}
                                value={fuelOdometer}
                                onChange={(e) =>
                                  setFuelOdometer(e.target.value)
                                }
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-emerald-500 text-slate-800 font-bold font-mono"
                              />
                            </div>

                            {/* Full Tank Checkbox */}
                            <div className="col-span-2 flex items-center gap-1.5 py-0.5 select-none text-slate-650 font-sans">
                              <input
                                type="checkbox"
                                id="fuelIsFull"
                                checked={fuelIsFullTank}
                                onChange={(e) =>
                                  setFuelIsFullTank(e.target.checked)
                                }
                                className="w-4 h-4 rounded text-emerald-600 border-slate-350 focus:ring-emerald-500 cursor-pointer"
                              />
                              <label
                                htmlFor="fuelIsFull"
                                className="text-[11px] font-bold cursor-pointer"
                              >
                                Fatto il Pieno di Carburante (Serbatoio Pieno ✓)
                              </label>
                            </div>

                            {/* Date */}
                            <div className="col-span-2 space-y-1">
                              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                Data del rifornimento
                              </label>
                              <input
                                type="date"
                                value={expenseDate}
                                onChange={(e) => setExpenseDate(e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none bg-white font-bold"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Fuel className="w-3.5 h-3.5" />
                              {editingExpenseId ? "Aggiorna Rifornimento" : "Registra Rifornimento"}
                            </button>
                            {editingExpenseId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingExpenseId(null);
                                  setFuelCompany("Eni");
                                  setFuelLiters("");
                                  setFuelPricePerLiter("");
                                  setFuelOdometer("");
                                  setExpenseAmount("");
                                  setFuelIsFullTank(false);
                                  setExpenseDate("");
                                }}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer"
                              >
                                Annulla
                              </button>
                            )}
                          </div>
                        </form>

                        {/* Power fuel statistics dashboard info card */}
                        <div className="bg-emerald-50/40 border border-emerald-100/50 p-3 rounded-xl grid grid-cols-2 gap-2 text-sans select-none">
                          <div className="col-span-2 border-b border-emerald-100/30 pb-1.5 mb-1 flex items-center gap-1">
                            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">
                              📊 Prestazioni & Consumo Medio
                            </span>
                          </div>

                          <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-xs text-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase block">
                              Consumo Camper
                            </span>
                            <span className="text-xs font-black text-emerald-800 font-mono block mt-0.5">
                              {fuelStats.kmPerLiter
                                ? `${getFuelEfficiencyValue(fuelStats.totalLiters, fuelStats.tripDistance, settings)} ${getFuelEfficiencyUnit(settings)}`
                                : "---"}
                            </span>
                          </div>

                          <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-xs text-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase block">
                              Speso Carburante
                            </span>
                            <span className="text-xs font-black text-[#A45C40] font-mono block mt-0.5">
                              {fuelStats.totalFuelCost.toFixed(2)} {getCurrencySymbol(settings)}
                            </span>
                            <span className="text-[8px] text-slate-400 font-bold block">
                              {fuelStats.totalLiters.toFixed(1)} Litri erogati
                            </span>
                          </div>

                          {fuelStats.avgPricePerLiter > 0 && (
                            <div className="p-1.5 bg-stone-100/30 rounded-lg text-center text-slate-650 font-bold text-[9px] col-span-2">
                              Prezzo medio ponderato alla pompa:{" "}
                              <span className="font-mono text-emerald-700">
                                {fuelStats.avgPricePerLiter.toFixed(3)} {getCurrencySymbol(settings)}/L
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Fuel Refuels lists */}
                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                          {activeTrip.expenses.filter(
                            (e) => e.category === "Carburante",
                          ).length === 0 ? (
                            <p className="text-xs text-slate-400 py-4 text-center">
                              Nessun rifornimento registrato.
                            </p>
                          ) : (
                            activeTrip.expenses
                              .filter((e) => e.category === "Carburante")
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map((exp) => {
                                const brandColor =
                                  exp.fuelCompany === "Eni"
                                    ? "bg-yellow-400 text-slate-900"
                                    : exp.fuelCompany === "Q8"
                                      ? "bg-blue-600 text-white"
                                      : exp.fuelCompany === "Esso"
                                        ? "bg-red-500 text-white"
                                        : exp.fuelCompany === "IP"
                                          ? "bg-green-600 text-white"
                                          : exp.fuelCompany === "Tamoil"
                                            ? "bg-emerald-600 text-white"
                                            : exp.fuelCompany === "Coop"
                                              ? "bg-red-700 text-white"
                                              : "bg-slate-100 text-slate-700";

                                return (
                                  <div
                                    key={exp.id}
                                    className="p-2.5 bg-white border border-slate-100 rounded-lg hover:border-slate-200 transition-all font-sans relative group"
                                  >
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-1.5">
                                          <span
                                            className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${brandColor} font-mono`}
                                          >
                                            {exp.fuelCompany || "Carburante"}
                                          </span>
                                          {exp.isFullTank && (
                                            <span className="text-[8px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                              PIENO ✓
                                            </span>
                                          )}
                                        </div>

                                        {exp.liters && exp.pricePerLiter ? (
                                          <div className="text-[10px] text-slate-500 font-semibold font-mono space-y-0.5">
                                            <div>
                                              Erogato:{" "}
                                              <b className="text-slate-800">
                                                {exp.liters.toFixed(2)} Litri
                                              </b>{" "}
                                              @ {exp.pricePerLiter.toFixed(3)}{" "}
                                              {getCurrencySymbol(settings)}/L
                                            </div>
                                            {exp.odometer && (
                                              <div className="text-[9px] text-[#3E4A35] font-bold">
                                                Chilometri segnati:{" "}
                                                {exp.odometer.toLocaleString()}{" "}
                                                km
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <p className="text-xs font-bold text-slate-800">
                                            {exp.title}
                                          </p>
                                        )}
                                        <span className="text-[9px] text-slate-400 font-mono block">
                                          {formatDateDDMMAA(exp.date)}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-black text-[#A45C40] font-mono">
                                          -{exp.amount.toFixed(2)} {getCurrencySymbol(settings)}
                                        </span>
                                        <button
                                          onClick={() => handleEditExpense(exp)}
                                          className="text-slate-350 hover:text-blue-500 rounded p-1 transition-colors cursor-pointer"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleDeleteExpense(exp.id)
                                          }
                                          className="text-slate-350 hover:text-red-500 rounded p-1 transition-colors cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>
                          </>
                        )}
                      </div>
                    ) : expenseSubMode === "movement" ? (
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                            <Route className="w-3.5 h-3.5 text-blue-600" />
                            Spostamenti
                          </h3>
                        </div>

                        {/* Add/Edit Movement Form */}
                        <form onSubmit={handleAddMovement} className="p-4 bg-stone-50 rounded-xl border border-stone-100 space-y-3 font-sans">
                          <h3 className="text-xs font-black text-[#3E4A35] uppercase tracking-wider mb-2">
                            {editingMovementId ? "Modifica Spostamento" : "Nuovo Spostamento"}
                          </h3>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Luogo
                            </label>
                            <input
                              type="text"
                              placeholder="Luogo (es. Roma)"
                              value={movementLocation}
                              onChange={(e) => setMovementLocation(e.target.value)}
                              className="w-full text-xs px-2.5 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-[#3E4A35] font-semibold bg-white text-slate-800"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              KM
                            </label>
                            <input
                              type="number"
                              placeholder="KM"
                              value={movementOdometer}
                              onChange={(e) => setMovementOdometer(e.target.value)}
                              className="w-full text-xs px-2.5 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-[#3E4A35] font-semibold bg-white text-slate-800"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Data
                            </label>
                            <input
                              type="date"
                              value={movementDate ? new Date(movementDate).toISOString().split('T')[0] : ""}
                              onChange={(e) => setMovementDate(e.target.value)}
                              className="w-full text-xs px-2.5 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-[#3E4A35] font-semibold bg-white text-slate-800"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Note (opzionale)
                            </label>
                            <input
                              type="text"
                              placeholder="Note (opzionale)"
                              value={movementNotes}
                              onChange={(e) => setMovementNotes(e.target.value)}
                              className="w-full text-xs px-2.5 py-2.5 rounded-lg border border-slate-200 outline-none focus:border-[#3E4A35] font-semibold bg-white text-slate-800"
                            />
                          </div>
                          <button
                            type="submit"
                            className="w-full py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
                          >
                            {editingMovementId ? "Salva Modifiche" : "Aggiungi Spostamento"}
                          </button>
                          {editingMovementId && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMovementId(null);
                                setMovementLocation("");
                                setMovementOdometer("");
                                setMovementDate("");
                                setMovementNotes("");
                              }}
                              className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                            >
                              Annulla
                            </button>
                          )}
                        </form>


                        {/* Automatic GPS tracking notification card */}
                        <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100/80 text-left space-y-2 animate-fade-in">
                          <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest font-mono">
                              Monitoraggio GPS Attivo
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-slate-700 leading-relaxed">
                            Le tappe e gli spostamenti vengono **registrati in automatico** in tempo reale durante il viaggio. Non è richiesto alcun inserimento manuale: basta tenere l'app aperta!
                          </p>
                          <div className="text-[9px] font-bold text-emerald-700 bg-emerald-100/40 px-2 py-1 rounded-md inline-block">
                            🛰️ Rilevamento automatico di città e paesi
                          </div>
                        </div>

                        <div className="space-y-2">
                          {(activeTrip.movements || []).length === 0 ? (
                            <p className="text-xs text-slate-400 py-4 text-center">
                              Nessun spostamento registrato.
                            </p>
                          ) : (
                            (activeTrip.movements || [])
                                .slice()
                                .sort((a, b) => (a.odometer || 0) - (b.odometer || 0))
                                .map((m) => (
                              <div
                                key={m.id}
                                className="p-2.5 bg-white border border-slate-100 rounded-lg hover:border-slate-200 transition-all font-sans relative group"
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {editingOdoId === m.id ? (
                                        <form
                                          onSubmit={(e) => {
                                            e.preventDefault();
                                            handleSaveOdometer(m.id, tempOdoValue);
                                          }}
                                          className="flex items-center gap-1"
                                        >
                                          <input
                                            type="number"
                                            step="0.1"
                                            placeholder="es. 128600"
                                            value={tempOdoValue}
                                            onChange={(e) => setTempOdoValue(e.target.value)}
                                            className="w-24 px-1.5 py-0.5 border border-slate-300 rounded text-[11px] font-mono focus:border-indigo-500 outline-none"
                                            autoFocus
                                          />
                                          <button
                                            type="submit"
                                            className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-bold cursor-pointer transition-colors"
                                          >
                                            Salva
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditingOdoId(null)}
                                            className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[9px] cursor-pointer transition-colors"
                                          >
                                            Annulla
                                          </button>
                                        </form>
                                      ) : (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {m.odometer !== undefined && m.odometer !== null && m.odometer > 0 ? (
                                            <span className="text-[10px] font-black uppercase text-blue-800 font-mono">
                                              {m.odometer} Km
                                            </span>
                                          ) : (
                                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                              ⚠️ {m.odometer === 0 ? "Km non impostati (0)" : "Inserisci Km"}
                                            </span>
                                          )}
                                          <button
                                            onClick={() => {
                                              setEditingOdoId(m.id);
                                              setTempOdoValue(m.odometer && m.odometer > 0 ? m.odometer.toString() : "");
                                            }}
                                            className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                                            title="Modifica o inserisci i chilometri manualmente"
                                          >
                                            {m.odometer && m.odometer > 0 ? "Modifica" : "Inserisci Km"}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-xs font-bold text-slate-800 flex justify-between items-center min-w-0">
                                      <span className="truncate">{m.location}</span>
                                      {(() => {
                                        const routePoints = activeTrip.routePoints || [];
                                        const foundRp = routePoints.find((r) => {
                                            const rName = (r.name || "").toLowerCase().trim();
                                            const mLocation = (m.location || "").toLowerCase().trim();
                                            return rName && mLocation && (rName.includes(mLocation) || mLocation.includes(rName));
                                        });
                                        
                                        return (
                                        <button
                                          onClick={async () => {
                                            if (foundRp) {
                                                onNavigateToPlace({
                                                  id: "place_" + Date.now(),
                                                  name: m.location,
                                                  category: "area_sosta",
                                                  lat: foundRp.lat,
                                                  lng: foundRp.lng,
                                                  address: m.location,
                                                  priceInfo: "Non specificato",
                                                  priceEuro: 0,
                                                  rating: 0,
                                                  facilities: [],
                                                  reviews: [],
                                                  imageUrl: "",
                                                });
                                            } else {
                                                // Try geocoding
                                                try {
                                                    const res = await fetch(`/api/nominatim?q=${encodeURIComponent(m.location)}`);
                                                    const data = await res.json();
                                                    if (Array.isArray(data) && data.length > 0) {
                                                        onNavigateToPlace({
                                                          id: "place_" + Date.now(),
                                                          name: m.location,
                                                          category: "area_sosta",
                                                          lat: parseFloat(data[0].lat),
                                                          lng: parseFloat(data[0].lon),
                                                          address: m.location,
                                                          priceInfo: "Non specificato",
                                                          priceEuro: 0,
                                                          rating: 0,
                                                          facilities: [],
                                                          reviews: [],
                                                          imageUrl: "",
                                                        });
                                                    } else {
                                                        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "⚠️ Impossibile trovare le coordinate per questa località." } }));
                                                    }
                                                } catch (e) {
                                                    console.error("Geocoding error", e);
                                                    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "⚠️ Errore durante la ricerca della posizione." } }));
                                                }
                                            }
                                          }}
                                          className="p-1.5 bg-[#3E4A35] text-white rounded-lg hover:bg-[#5A6B4E] cursor-pointer ml-2 shrink-0"
                                          title="Avvia navigazione"
                                        >
                                          <Navigation className="w-3.5 h-3.5" />
                                        </button>
                                        );
                                      })()}
                                    </div>
                                    {m.notes && (
                                      <p className="text-[10px] text-slate-500 italic">
                                        {m.notes}
                                      </p>
                                    )}
                                    <span className="text-[9px] text-slate-400 font-mono block">
                                      {new Date(m.date).toLocaleDateString()}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        // Edit functionality: fill state with m values
                                        setMovementLocation(m.location);
                                        setMovementOdometer(m.odometer && m.odometer > 0 ? String(m.odometer) : "");
                                        setMovementNotes(m.notes || "");
                                        setMovementDate(m.date ? (m.date.includes('T') ? m.date.split('T')[0] : m.date) : "");
                                        // Keep track of which one is being edited
                                        // For now let's reuse state or create new one if needed, 
                                        // actually let's just trigger edit mode
                                        setEditingMovementId(m.id);
                                      }}
                                      className="text-slate-350 hover:text-blue-500 rounded p-1 transition-colors cursor-pointer"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMovement(m.id)}
                                      className="text-slate-350 hover:text-red-500 rounded p-1 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="mt-4 border-t border-stone-100 pt-4">
                          <TripRouteMap trip={activeTrip} mode="movements" onSaveRoute={handleSaveRoute} onNavigateToPlace={onNavigateToPlace} />
                        </div>
                      </div>
                    ) : null}

                    {/* Pianificazione Percorso Section */}
                    {expenseSubMode === "planned" && (
                      <div className="space-y-4 animate-fade-in mt-3">
                        <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <h3 className="font-bold text-amber-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                              <MapIcon className="w-4 h-4 text-amber-600" />
                              Pianificazione Percorso (Progetto / Bozza)
                            </h3>
                            <p className="text-xs text-slate-600">
                              Progetta il tuo tragitto futuro definendo le tappe previste. Questa pianificazione è separata dagli spostamenti reali che effettuerai e registrerai durante il viaggio.
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap shrink-0 self-start sm:self-center">
                            {(activeTrip.aiItinerary || (activeTrip.routePoints && activeTrip.routePoints.length > 0)) && (
                              <button
                                type="button"
                                onClick={handleExportItineraryPDFFromDiary}
                                className="px-3.5 py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] active:scale-95 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02]"
                                title="Scarica itinerario o pianificazione in PDF"
                              >
                                <FileDown className="w-4 h-4 text-amber-200" />
                                <span>Esporta PDF Itinerario</span>
                              </button>
                            )}
                            {onNavigateToAIItinerary && (
                              <button
                                type="button"
                                onClick={onNavigateToAIItinerary}
                                className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] border border-emerald-500/30"
                              >
                                <CartoonCamperAvatar className="w-4 h-4 shrink-0" />
                                <span>Generatore Itinerari AI Rolly</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <TripRouteMap trip={activeTrip} mode="planned" onSaveRoute={handleSaveRoute} onNavigateToPlace={onNavigateToPlace} onNavigateToAIItinerary={onNavigateToAIItinerary} />
                      </div>
                    )}

                    {/* Comprehensive overall Category budget breakdown progress bars */}
                    {expenseSubMode === "general" && activeTrip.expenses.length > 0 && activeTrip.includeExpenses !== false && (
                      <div className="p-3 bg-[#F2EFE9]/40 border border-slate-200/60 rounded-xl space-y-2 text-sans select-none mt-3 animate-fade-in">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                            📊 Ripartizione Totale Spese di Viaggio
                          </span>
                          <span className="text-[10px] font-black text-[#A45C40] font-mono bg-[#A45C40]/10 px-1.5 py-0.5 rounded">
                            Tot: {totalExpensesOfActive.toFixed(2)} {getCurrencySymbol(settings)}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {(
                            [
                              "Carburante",
                              "Autostrada",
                              "Cibo",
                              "Sosta",
                              "Altro",
                            ] as DiaryExpense["category"][]
                          ).map((cat) => {
                            const spent = activeTrip.expenses
                              .filter((e) => e.category === cat)
                              .reduce((sum, e) => sum + e.amount, 0);
                            const percentage =
                              totalExpensesOfActive > 0
                                ? (spent / totalExpensesOfActive) * 100
                                : 0;
                            if (spent === 0) return null;

                            let bgColor = "bg-stone-400";
                            if (cat === "Carburante") {
                              bgColor = "bg-emerald-600";
                            } else if (cat === "Autostrada") {
                              bgColor = "bg-cyan-500";
                            } else if (cat === "Cibo") {
                              bgColor = "bg-amber-500";
                            } else if (cat === "Sosta") {
                              bgColor = "bg-[#A45C40]";
                            }

                            return (
                              <div key={cat} className="space-y-0.5">
                                <div className="flex justify-between text-[9px] font-black text-slate-600">
                                  <span className="flex items-center gap-1.5 text-slate-700">
                                    <span
                                      className={`w-2 h-2 rounded-full ${bgColor}`}
                                    />
                                    {cat === "Sosta" ? "Sosta / Camping / Parcheggio" : cat}
                                  </span>
                                  <span className="font-mono">
                                    {spent.toFixed(2)} {getCurrencySymbol(settings)} (
                                    {Math.round(percentage)}%)
                                  </span>
                                </div>
                                <div className="w-full h-1 bg-slate-200/60 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${bgColor} transition-all duration-500`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. PHOTOS SECTION WITH PRESENTS & DESC */}
                  {/* PHOTOS MOVED TO FOTO E RICORDI TAB */}
                </div>


                {expenseSubMode === "photo" && (
                <div className="mt-6 p-4 bg-[#F5F2ED]/40 rounded-xl border border-[#3E4A35]/10 animate-fade-in">
                  <h3 className="text-xs font-black text-[#3E4A35] uppercase tracking-wider mb-2">
                    Racconto
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {activeTrip.description ||
                      "Nessuna storia o racconto inserito per questa escursione."}
                  </p>
                  <button
                    onClick={startEditingActiveTrip}
                    className="mt-3 px-3 py-1.5 bg-white text-[10px] font-black text-[#3E4A35] hover:bg-[#3E4A35] hover:text-white rounded border border-[#3E4A35]/20 transition-all shadow-xs cursor-pointer"
                  >
                    Modifica racconto
                  </button>
                </div>
              )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 space-y-2">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-bold">Nessun viaggio selezionato</p>
                <button
                  type="button"
                  onClick={() => setDiarySubTab("list")}
                  className="px-4 py-2 bg-[#3E4A35] text-white rounded-lg text-xs font-black font-sans cursor-pointer shadow-xs active:scale-95"
                >
                  Sfoglia Elenco Viaggi
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GORGEOUS LIGHTBOX MODAL */}
      {selectedLightboxPhotoIndex !== null &&
        activeTrip &&
        activeTripPhotos[selectedLightboxPhotoIndex] && (
          <div
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all animate-fade-in"
            onClick={() => setSelectedLightboxPhotoIndex(null)}
          >
            <div
              className="relative max-w-4xl w-full bg-stone-900 rounded-3xl overflow-hidden shadow-2xl border border-stone-800 flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header controls inside Lightbox */}
              <div className="absolute top-4 right-4 z-50">
                <button
                  onClick={() => setSelectedLightboxPhotoIndex(null)}
                  className="p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-full transition-all cursor-pointer shadow-md select-none border border-white/10"
                  title="Chiudi visualizzatore"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Picture content and navigation */}
              <div className="relative w-full aspect-video md:aspect-[4/3] bg-black flex items-center justify-center group overflow-hidden">
                <CamperImage
                  src={activeTripPhotos[selectedLightboxPhotoIndex].url}
                  photoId={activeTripPhotos[selectedLightboxPhotoIndex].id}
                  alt={
                    activeTripPhotos[selectedLightboxPhotoIndex].description
                  }
                  onReplace={(file) =>
                    handleReplacePhoto(
                      activeTripPhotos[selectedLightboxPhotoIndex].id,
                      file
                    )
                  }
                  className="max-w-full max-h-[75vh] object-contain select-none"
                />

                {activeTripPhotos.length > 1 && (
                  <>
                    {/* Left Sliding button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newIdx =
                          (selectedLightboxPhotoIndex -
                            1 +
                            activeTripPhotos.length) %
                          activeTripPhotos.length;
                        setSelectedLightboxPhotoIndex(newIdx);
                      }}
                      className="absolute left-4 p-3 bg-black/50 hover:bg-black/85 text-white rounded-full transition-all cursor-pointer shadow-md select-none border border-white/5 active:scale-90"
                    >
                      ❮
                    </button>

                    {/* Right Sliding button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newIdx =
                          (selectedLightboxPhotoIndex + 1) %
                          activeTripPhotos.length;
                        setSelectedLightboxPhotoIndex(newIdx);
                      }}
                      className="absolute right-4 p-3 bg-black/50 hover:bg-black/85 text-white rounded-full transition-all cursor-pointer shadow-md select-none border border-white/5 active:scale-90"
                    >
                      ❯
                    </button>
                  </>
                )}
              </div>

              {/* Bottom Caption bar with descriptions and Date */}
              <div className="w-full bg-stone-950 p-5 border-t border-stone-855 text-stone-200 text-left space-y-2 font-sans">
                <div className="flex justify-between items-center text-[10px] text-stone-400 font-bold font-mono">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-stone-500" />
                    Scattata il:{" "}
                    {activeTripPhotos[selectedLightboxPhotoIndex].date}
                  </span>
                  <span>
                    Foto {selectedLightboxPhotoIndex + 1} di{" "}
                    {activeTripPhotos.length}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-xs md:text-sm font-semibold tracking-wide text-white leading-relaxed">
                      {activeTripPhotos[selectedLightboxPhotoIndex].description}
                    </p>
                    {activeTripPhotos[selectedLightboxPhotoIndex].locationName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-900/60 border border-blue-700/50 text-blue-200 rounded-md text-[10px] font-bold">
                        <MapPin className="w-3 h-3 text-blue-300" />
                        {activeTripPhotos[selectedLightboxPhotoIndex].locationName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditPhoto(activeTripPhotos[selectedLightboxPhotoIndex])}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#3E4A35] hover:bg-[#2d3627] text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all border border-[#526346] shrink-0 active:scale-95"
                    >
                      <Pencil className="w-3 h-3" />
                      Modifica dettagli
                    </button>

                    <input
                      id="lightbox-replace-photo"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleReplacePhoto(
                            activeTripPhotos[selectedLightboxPhotoIndex].id,
                            e.target.files[0]
                          );
                        }
                      }}
                    />
                    <label
                      htmlFor="lightbox-replace-photo"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all border border-stone-700 shrink-0 active:scale-95"
                    >
                      <Camera className="w-3 h-3" />
                      Ricarica / Sostituisci
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* PHOTO DETAILS EDIT MODAL */}
      {photoToEdit && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPhotoToEdit(null)}
        >
          <div
            className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4 font-sans animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with thumbnail preview */}
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 shrink-0 border border-stone-200 dark:border-stone-700 shadow-xs">
                  <CamperImage
                    src={photoToEdit.url}
                    photoId={photoToEdit.id}
                    thumbnail={true}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                    Modifica Scatto Fotografico
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Aggiungi titolo, posizione e data a questa foto
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPhotoToEdit(null)}
                className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input Form */}
            <div className="space-y-3.5 text-xs">
              {/* Description field */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Titolo / Descrizione
                </label>
                <input
                  type="text"
                  value={editPhotoDesc}
                  onChange={(e) => setEditPhotoDesc(e.target.value)}
                  placeholder="es. Tramonto sul mare, Duomo di Cefalù..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-[#3E4A35]"
                  autoFocus
                />
              </div>

              {/* Location field with suggestion pills */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Luogo / Posizione (Tappa o città)
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={editPhotoLoc}
                    onChange={(e) => setEditPhotoLoc(e.target.value)}
                    placeholder="es. Taormina, Scala dei Turchi, Ortigia..."
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-[#3E4A35]"
                  />
                </div>

                {/* Quick suggestions from trip movements */}
                {suggestedLocations.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <span className="text-[10px] font-medium text-stone-400 block">
                      Suggerimenti rapidi dalle tappe:
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                      {suggestedLocations.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setEditPhotoLoc(loc)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                            editPhotoLoc === loc
                              ? "bg-[#3E4A35] text-white border-[#3E4A35]"
                              : "bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700"
                          }`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Date field */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Data dello scatto
                </label>
                <input
                  type="date"
                  value={editPhotoDate}
                  onChange={(e) => setEditPhotoDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-[#3E4A35]"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setPhotoToEdit(null)}
                className="px-3 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                Annulla
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSavePhotoDetails(true)}
                  className="px-3 py-2 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 rounded-xl transition-all border border-blue-200 dark:border-blue-900/50 flex items-center gap-1 active:scale-95"
                  title="Salva e compila subito la foto successiva"
                >
                  <span>Salva e successiva</span>
                  <span>❯</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSavePhotoDetails(false)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#3E4A35] hover:bg-[#2d3627] rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Salva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && activeTrip && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-stone-200 space-y-4 text-center font-sans animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-stone-900">
                Elimina questo Viaggio?
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Sei sicuro di voler eliminare definitivamente il viaggio{" "}
                <span className="font-bold text-stone-855 italic">
                  &quot;{activeTrip.title}&quot;
                </span>
                ? Questa azione rimuoverà permanentemente tutte le tappe, spese
                e scatti fotografici inseriti.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer select-none active:scale-95"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleDeleteActiveTrip}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer select-none active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sì, Elimina
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PHOTO DELETE CONFIRMATION MODAL */}
      {photoToDelete && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPhotoToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-stone-200 space-y-4 text-center font-sans animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-stone-900">
                Elimina questa Foto?
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Sei sicuro di voler eliminare definitivamente questo ricordo fotografico dal diario? Non potrai recuperarlo.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer select-none active:scale-95"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeletePhoto(photoToDelete);
                  setPhotoToDelete(null);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer select-none active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sì, Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALL PHOTOS DELETE CONFIRMATION MODAL */}
      {showDeleteAllPhotosConfirm && activeTrip && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowDeleteAllPhotosConfirm(false)}
        >
          <div
            className="bg-white dark:bg-stone-900 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-stone-200 dark:border-stone-800 space-y-4 text-center font-sans animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-stone-900 dark:text-white">
                Svuotare tutte le foto del viaggio?
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Verranno rimosse tutte le <strong className="text-stone-900 dark:text-stone-200">{activeTripPhotos.length} foto</strong> di questo viaggio per consentirti di ricaricarle da zero con il nuovo salvataggio Cloud.
              </p>
              <p className="text-[11px] text-stone-400 dark:text-stone-500">
                Tappe, spese e chilometri del viaggio rimarranno intatti.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteAllPhotosConfirm(false)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-bold transition-all cursor-pointer select-none active:scale-95"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleDeleteAllTripPhotos}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer select-none active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sì, Svuota tutte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF EXPORT MODAL */}
      {showPdfExportModal && activeTrip && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => {
            if (!isGeneratingPdf) setShowPdfExportModal(false);
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-5 font-sans animate-scale-up text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-base font-black text-stone-950 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-emerald-600" />
                  Stampa Diario di Viaggio
                </h3>
                <p className="text-xs text-stone-500 font-medium">
                  Esporta e conserva la tua copia cartacea del viaggio
                </p>
              </div>
              {!isGeneratingPdf && (
                <button
                  onClick={() => setShowPdfExportModal(false)}
                  className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-600 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Form selections */}
            <div className="space-y-4">
              {/* Formato Carta (A4 / A5) */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase text-stone-400 tracking-wider">
                  Dimensioni Foglio (Formato)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPdfPaperSize("a4")}
                    disabled={isGeneratingPdf}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-20 cursor-pointer select-none ${
                      pdfPaperSize === "a4"
                        ? "border-emerald-600 bg-emerald-50/40 text-stone-900 ring-2 ring-emerald-500/10"
                        : "border-stone-200 bg-white hover:border-stone-300 text-stone-700 hover:bg-stone-50/50"
                    }`}
                  >
                    <span className="text-sm font-black">A4 Standard</span>
                    <span className="text-[10px] text-stone-400 font-medium leading-tight">
                      210 x 297 mm • Ideale per raccoglitori grandi
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPdfPaperSize("a5")}
                    disabled={isGeneratingPdf}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-20 cursor-pointer select-none ${
                      pdfPaperSize === "a5"
                        ? "border-emerald-600 bg-emerald-50/40 text-stone-900 ring-2 ring-emerald-500/10"
                        : "border-stone-200 bg-white hover:border-stone-300 text-stone-700 hover:bg-stone-50/50"
                    }`}
                  >
                    <span className="text-sm font-black">A5 Compatto</span>
                    <span className="text-[10px] text-stone-400 font-medium leading-tight">
                      148 x 210 mm • Ideale per taccuini di bordo
                    </span>
                  </button>
                </div>
              </div>

              {/* Sezioni da Includere */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-stone-400 tracking-wider">
                  Sezioni da Includere nel PDF
                </label>
                
                <div className="space-y-2.5 bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                  {/* Riepilogo (Sempre incluso) */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-700">Riepilogo e Statistiche Generali</span>
                    <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-100/60 px-1.5 py-0.5 rounded font-mono">Incluso</span>
                  </div>

                  {/* Racconto (Sempre incluso se presente) */}
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-stone-200/60">
                    <span className="font-semibold text-stone-700">Il Racconto (Storia scritta)</span>
                    <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-100/60 px-1.5 py-0.5 rounded font-mono">Incluso</span>
                  </div>

                  {/* Spostamenti */}
                  <label className="flex items-center justify-between text-xs pt-1.5 border-t border-stone-200/60 cursor-pointer select-none">
                    <span className="font-semibold text-stone-700">Registro Spostamenti e Tappe</span>
                    <input
                      type="checkbox"
                      checked={pdfIncludeMovements}
                      onChange={(e) => setPdfIncludeMovements(e.target.checked)}
                      disabled={isGeneratingPdf}
                      className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4 accent-emerald-600"
                    />
                  </label>

                  {/* Spese */}
                  <label className="flex items-center justify-between text-xs pt-1.5 border-t border-stone-200/60 cursor-pointer select-none">
                    <span className="font-semibold text-stone-700">Rendiconto Spese di Viaggio</span>
                    <input
                      type="checkbox"
                      checked={pdfIncludeExpenses}
                      onChange={(e) => setPdfIncludeExpenses(e.target.checked)}
                      disabled={isGeneratingPdf}
                      className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4 accent-emerald-600"
                    />
                  </label>

                  {/* Foto */}
                  <label className="flex items-center justify-between text-xs pt-1.5 border-t border-stone-200/60 cursor-pointer select-none">
                    <span className="font-semibold text-stone-700">Galleria Foto e Ricordi</span>
                    <input
                      type="checkbox"
                      checked={pdfIncludePhotos}
                      onChange={(e) => setPdfIncludePhotos(e.target.checked)}
                      disabled={isGeneratingPdf}
                      className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4 accent-emerald-600"
                    />
                  </label>
                </div>
              </div>

              {/* Opzioni di Impaginazione / Raccoglitore ad Anelli */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-stone-400 tracking-wider">
                  Impaginazione e Raccoglitore ad Anelli
                </label>
                <div className="space-y-2 bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                  <label className="flex items-start justify-between gap-3 text-xs cursor-pointer select-none">
                    <div>
                      <span className="font-bold text-stone-800 block">
                        Margine sinistro per foratura raccoglitore
                      </span>
                      <span className="text-[11px] text-stone-500 leading-tight block mt-0.5">
                        Aggiunge 25mm di margine sul lato sinistro per permettere di fare i buchi senza tagliare testi o tabelle.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={pdfRingBinderMargin}
                      onChange={(e) => setPdfRingBinderMargin(e.target.checked)}
                      disabled={isGeneratingPdf}
                      className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4 accent-emerald-600 mt-0.5"
                    />
                  </label>

                  {pdfRingBinderMargin && (
                    <label className="flex items-start justify-between gap-3 text-xs pt-2 border-t border-stone-200/60 cursor-pointer select-none">
                      <div>
                        <span className="font-bold text-stone-800 block">
                          Segni guida fori stampati
                        </span>
                        <span className="text-[11px] text-stone-500 leading-tight block mt-0.5">
                          Stampa dei piccoli riferimenti discreti per allineare perfettamente la perforatrice per raccoglitori.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={pdfShowHoleGuides}
                        onChange={(e) => setPdfShowHoleGuides(e.target.checked)}
                        disabled={isGeneratingPdf}
                        className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4 accent-emerald-600 mt-0.5"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2.5 pt-2">
              {!isGeneratingPdf ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowPdfExportModal(false)}
                    className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer select-none active:scale-95"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsGeneratingPdf(true);
                      try {
                        await generateTripPDF(activeTrip, pdfPaperSize, settings, {
                          includeMovements: pdfIncludeMovements,
                          includeExpenses: pdfIncludeExpenses,
                          includePhotos: pdfIncludePhotos,
                          ringBinderMargin: pdfRingBinderMargin,
                          showHoleGuides: pdfShowHoleGuides,
                        });
                        window.dispatchEvent(
                          new CustomEvent("show-toast", {
                            detail: {
                              message: `📄 PDF del viaggio generato e scaricato con margine per raccoglitore!`,
                            },
                          })
                        );
                        setShowPdfExportModal(false);
                      } catch (err) {
                        console.error("PDF generation failed:", err);
                        window.dispatchEvent(
                          new CustomEvent("show-toast", {
                            detail: {
                              message: `❌ Errore durante la generazione del PDF.`,
                            },
                          })
                        );
                      } finally {
                        setIsGeneratingPdf(false);
                      }
                    }}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer select-none active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    Genera PDF
                  </button>
                </>
              ) : (
                <div className="w-full py-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-center gap-2.5 text-xs text-[#3E4A35] font-black font-mono">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  Elaborazione impaginazione e foto...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Sync & Backup Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-gradient-to-r from-[#3E4A35] to-[#2D3725] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-sm tracking-wide">Centro Sincronizzazione & Backup ☁️</h3>
              </div>
              <button
                onClick={() => setShowSyncModal(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Account info */}
              <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200/80 dark:border-stone-700/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono text-stone-500 font-bold block">Account Attivo</span>
                  <span className="font-bold text-stone-800 dark:text-stone-200">{getActiveUserEmail()}</span>
                </div>
                <button
                  onClick={checkCloudStatus}
                  className="px-2.5 py-1 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 text-stone-700 dark:text-stone-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${cloudStatusInfo?.loading ? "animate-spin" : ""}`} />
                  Verifica Cloud
                </button>
              </div>

              {/* Status Comparison Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Local device */}
                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Questo Dispositivo</span>
                  </div>
                  <div className="space-y-1 font-mono text-[11px] text-stone-600 dark:text-stone-300">
                    <div className="flex justify-between">
                      <span>Viaggi:</span>
                      <span className="font-bold text-stone-800 dark:text-stone-100">{trips.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Spese:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {trips.reduce((acc, t) => acc + (t.expenses?.length || 0), 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tappe:</span>
                      <span className="font-bold text-stone-800 dark:text-stone-100">
                        {trips.reduce((acc, t) => acc + (t.movements?.length || 0), 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Foto:</span>
                      <span className="font-bold text-stone-800 dark:text-stone-100">
                        {trips.reduce((acc, t) => acc + (t.photos?.length || 0), 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cloud Server */}
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl">
                  <div className="flex items-center gap-1.5 text-indigo-800 dark:text-indigo-300 font-bold mb-2">
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Dati nel Cloud</span>
                  </div>
                  {cloudStatusInfo?.loading ? (
                    <div className="py-3 flex items-center justify-center gap-2 text-indigo-600 font-mono text-[11px]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Controllo...
                    </div>
                  ) : cloudStatusInfo?.error ? (
                    <div className="text-rose-600 text-[10px]">{cloudStatusInfo.error}</div>
                  ) : (
                    <div className="space-y-1 font-mono text-[11px] text-stone-600 dark:text-stone-300">
                      <div className="flex justify-between">
                        <span>Viaggi:</span>
                        <span className="font-bold text-stone-800 dark:text-stone-100">{cloudStatusInfo?.trips ?? "--"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Spese:</span>
                        <span className="font-bold text-indigo-700 dark:text-indigo-400">
                          {cloudStatusInfo?.expenses ?? "--"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tappe:</span>
                        <span className="font-bold text-stone-800 dark:text-stone-100">
                          {cloudStatusInfo?.movements ?? "--"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Foto:</span>
                        <span className="font-bold text-stone-800 dark:text-stone-100">
                          {cloudStatusInfo?.photos ?? "--"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Autonomous Sync Status Banner */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sincronizzazione Automatica Attiva ⚡</span>
                </div>
                <p className="text-emerald-700 dark:text-emerald-400 text-[11px] leading-relaxed">
                  Ogni volta che aggiungi foto, spese o tappe di viaggio, ViaCamper le salva sul telefono e le sincronizza automaticamente in Cloud in background, senza che tu debba premere nulla.
                  {lastSyncedTime && (
                    <span className="block mt-0.5 font-semibold">
                      Ultima sincronizzazione automatica: ore {lastSyncedTime}
                    </span>
                  )}
                </p>
              </div>

              {/* Sync Action */}
              <button
                onClick={handleCloudSyncClick}
                disabled={isSyncingCloud}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingCloud || autoSyncState === "saving" ? "animate-spin" : ""}`} />
                <span>
                  {isSyncingCloud || autoSyncState === "saving"
                    ? "Sincronizzazione in corso..."
                    : "Forza Sincronizzazione Subito (Manuale)"}
                </span>
              </button>

              {/* Direct File Transfer Section */}
              <div className="pt-3 border-t border-stone-200 dark:border-stone-800">
                <h4 className="font-bold text-stone-800 dark:text-stone-200 mb-1 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-stone-500" />
                  Trasferimento Diretto via File (100% Garantito)
                </h4>
                <p className="text-[11px] text-stone-500 mb-3 leading-relaxed">
                  Se hai già tutte le spese sul cellulare e vuoi portarle sul tablet all'istante senza passare dal Cloud:
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportBackupJson}
                    className="py-2 px-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-[#3E4A35] dark:text-stone-200 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 border border-stone-300 dark:border-stone-700 cursor-pointer active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Esporta Backup (.json)</span>
                  </button>

                  <label className="py-2 px-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-[#3E4A35] dark:text-stone-200 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 border border-stone-300 dark:border-stone-700 cursor-pointer active:scale-95 text-center">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Importa Backup (.json)</span>
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImportBackupJson(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Help box */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                <strong>💡 Istruzioni rapide:</strong>
                <ol className="list-decimal list-inside mt-1 space-y-1 text-[10.5px]">
                  <li>Sul cellulare premi <strong>Esporta Backup (.json)</strong> e salva il file.</li>
                  <li>Invia il file al tablet (via WhatsApp, Telegram, Email o Drive).</li>
                  <li>Sul tablet premi <strong>Importa Backup (.json)</strong>: tutte le 52 spese e le foto appariranno all'istante!</li>
                </ol>
              </div>
            </div>

            <div className="p-3 bg-stone-100 dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700 flex justify-end">
              <button
                onClick={() => setShowSyncModal(false)}
                className="px-4 py-1.5 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 text-stone-700 dark:text-stone-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
