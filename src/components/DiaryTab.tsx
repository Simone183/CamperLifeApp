import React from "react";
import { useAppSettings } from "../useAppSettings";
import { getCurrencySymbol, formatDistance, getDistanceUnit, getFuelEfficiencyUnit, getFuelEfficiencyValue, formatCurrency } from "../unit-helpers";
import { Trip, DiaryExpense, DiaryPhoto, Place, DiaryMovement } from "../types";
import { compressImage } from "../utils/photoCompressor";
import { TripRouteMap } from "./TripRouteMap";
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
} from "lucide-react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

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
    startDate: "2026-10-10",
    endDate: "2026-10-12",
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
        date: "2026-10-10",
      },
      {
        id: "te2",
        title: "Sosta Pienza comunale",
        amount: 12.0,
        category: "Sosta",
        date: "2026-10-11",
      },
      {
        id: "te3",
        title: "Pranzo Tipico Trattoria",
        amount: 48.0,
        category: "Cibo",
        date: "2026-10-11",
      },
    ],
    photos: [
      {
        id: "tp1",
        url: "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600",
        description:
          "Il nostro amato mansardato immerso nell'abbraccio dorato dei cipressi toscani.",
        date: "2026-10-11",
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
  initialSubTab?: "list" | "details";
  onNavigateToPlace: (place: Place) => void;
  trips?: Trip[];
  setTrips?: (trips: Trip[]) => void;
}

export default function DiaryTab({
  currentUser,
  initialTripId,
  initialSubTab,
  onNavigateToPlace,
  trips: propsTrips,
  setTrips: propsSetTrips,
}: DiaryTabProps) {
  const settings = useAppSettings();
  const [internalTrips, setInternalTrips] = React.useState<Trip[]>(() => {
    const saved = localStorage.getItem("camper_trips");
    return saved ? JSON.parse(saved) : INITIAL_TRIPS;
  });

  const trips = propsTrips || internalTrips;
  const setTrips = propsSetTrips || setInternalTrips;

  // Selected Trip inside details view
  const [selectedTripId, setSelectedTripId] = React.useState<string | null>(
    () => {
      if (initialTripId) return initialTripId;
      return trips.length > 0 ? trips[0].id : null;
    },
  );

  // Sub-tab selection inside travel diary ('list' contains list/creation of trips, 'details' contains active trip details)
  const [diarySubTab, setDiarySubTab] = React.useState<"list" | "details">(
    () => {
      if (initialSubTab) return initialSubTab;
      return "list";
    },
  );

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
    React.useState<DiaryExpense["category"]>("Carburante");
  const [expenseDate, setExpenseDate] = React.useState("");
  const [editingExpenseId, setEditingExpenseId] = React.useState<string | null>(null);

  // Fuel-specific states
  const [fuelLiters, setFuelLiters] = React.useState("");
  const [fuelPricePerLiter, setFuelPricePerLiter] = React.useState("");
  const [fuelOdometer, setFuelOdometer] = React.useState("");
  const [fuelCompany, setFuelCompany] = React.useState("Eni");
  const [fuelIsFullTank, setFuelIsFullTank] = React.useState(false);
  const [expenseSubMode, setExpenseSubMode] = React.useState<
    "general" | "refuel" | "movement"
  >("general");

  // Movement-specific states
  const [movementOdometer, setMovementOdometer] = React.useState("");
  const [movementLocation, setMovementLocation] = React.useState("");
  const [movementNotes, setMovementNotes] = React.useState("");
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
  const [dragActive, setDragActive] = React.useState(false);

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

  React.useEffect(() => {
    localStorage.setItem("camper_trips", JSON.stringify(trips));
  }, [trips]);

  const activeTrip = trips.find((t) => t.id === selectedTripId);

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
    if (activeTrip.status === "Attivo") {
      const movements = activeTrip.movements || [];
      const validMovements = movements.filter(
        (m) => typeof m.odometer === "number" && !isNaN(m.odometer)
      ) as Array<Required<Pick<DiaryMovement, 'odometer'>> & DiaryMovement>;

      if (validMovements.length <= 1) {
        tripDistance = 0;
      } else {
        const sortedMovements = [...validMovements].sort((a, b) => a.odometer - b.odometer);
        const startOdo = sortedMovements[0].odometer;

        const allOdometers = [
          ...validMovements.map((m) => m.odometer),
          ...refuels.map((r) => r.odometer),
        ].filter((o): o is number => typeof o === "number" && !isNaN(o));

        if (allOdometers.length > 0) {
          const maxOdo = Math.max(...allOdometers);
          tripDistance = maxOdo > startOdo ? maxOdo - startOdo : 0;
        }
      }
    } else {
      if (
        activeTrip.startOdometer &&
        activeTrip.endOdometer &&
        activeTrip.endOdometer > activeTrip.startOdometer
      ) {
        tripDistance = activeTrip.endOdometer - activeTrip.startOdometer;
      } else {
        const odometers = refuels
          .map((r) => r.odometer)
          .filter((o): o is number => o !== undefined);
        if (odometers.length >= 2) {
          tripDistance = Math.max(...odometers) - Math.min(...odometers);
        }
      }
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
      movements: [],
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
      const filtered = trips.filter((t) => t.id !== tripId);
      setTrips(filtered);
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
    const filtered = trips.filter((t) => t.id !== selectedTripId);
    setTrips(filtered);
    const nextId = filtered.length > 0 ? filtered[0].id : null;
    setSelectedTripId(nextId);
    setDiarySubTab("list");
    setShowDeleteConfirm(false);
  };

  // Add Expense to Trip handler
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId) return;

    let finalTitle = expenseTitle.trim();
    let finalAmount = parseFloat(expenseAmount);
    let finalCategory = expenseCategory;

    const litersNum = fuelLiters ? parseFloat(fuelLiters) : undefined;
    const pricePerLiterNum = fuelPricePerLiter
      ? parseFloat(fuelPricePerLiter)
      : undefined;
    const odometerNum = fuelOdometer ? parseInt(fuelOdometer, 10) : undefined;

    if (expenseSubMode === "refuel") {
      finalCategory = "Carburante";
      if (!fuelCompany) {
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: { message: "⚠️ Seleziona una compagnia di rifornimento!" },
          }),
        );
        return;
      }

      // Compute amount if missing
      if (!finalAmount && litersNum && pricePerLiterNum) {
        finalAmount = Math.round(litersNum * pricePerLiterNum * 100) / 100;
      }

      if (isNaN(finalAmount) || finalAmount <= 0) {
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message:
                "⚠️ Errore: Inserisci dei litri e prezzo al litro validi o l'importo totale!",
            },
          }),
        );
        return;
      }

      const litersText = litersNum ? ` ${litersNum}L` : "";
      const priceText = pricePerLiterNum ? ` @ ${pricePerLiterNum}${getCurrencySymbol(settings)}/L` : "";
      const pienoText = fuelIsFullTank ? " [Pieno ✓]" : "";
      finalTitle = `Rifornimento ${fuelCompany}${litersText}${priceText}${pienoText}`;
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

    const newExpense: DiaryExpense = {
      id: editingExpenseId || "exp_" + Date.now(),
      title: finalTitle,
      amount: finalAmount,
      category: finalCategory,
      date: expenseDate || new Date().toISOString().split("T")[0],
      ...(expenseSubMode === "refuel"
        ? {
            liters: litersNum,
            pricePerLiter: pricePerLiterNum,
            odometer: odometerNum,
            fuelCompany: fuelCompany,
            isFullTank: fuelIsFullTank,
          }
        : {}),
    };

    const updated = trips.map((t) => {
      if (t.id === selectedTripId) {
        let endOdo = t.endOdometer;
        if (odometerNum && (!endOdo || odometerNum > endOdo)) {
          endOdo = odometerNum;
        }

        let newExpenses = [...t.expenses];
        if (editingExpenseId) {
          newExpenses = newExpenses.map((e) =>
            e.id === editingExpenseId ? newExpense : e
          );
        } else {
          newExpenses.push(newExpense);
        }

        return {
          ...t,
          endOdometer: endOdo,
          expenses: newExpenses,
        };
      }
      return t;
    });

    setTrips(updated);

    if (expenseSubMode === "refuel" && currentUser?.email) {
      fetch(`/api/fuel-logs/${encodeURIComponent(currentUser.email)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newExpense.id,
          date: newExpense.date,
          liters: litersNum || 0,
          pricePerLiter: pricePerLiterNum || 0,
          totalCost: finalAmount,
          odometer: odometerNum || 0,
          isFullTank: fuelIsFullTank,
          fuelCompany: fuelCompany || "Sconosciuta",
        }),
      }).catch((err) => console.error("Fuel sync error:", err));
    }

    // Reset general fields
    setExpenseTitle("");
    setExpenseAmount("");
    setExpenseDate("");

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
      setFuelLiters(expense.liters ? expense.liters.toString() : "");
      setFuelPricePerLiter(expense.pricePerLiter ? expense.pricePerLiter.toString() : "");
      setFuelOdometer(expense.odometer ? expense.odometer.toString() : "");
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
  };

  // Handle adding a new movement
  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId || !movementLocation || !movementOdometer) return;

    const newMovement = {
      id: Date.now().toString(),
      odometer: parseFloat(movementOdometer),
      location: movementLocation,
      date: expenseDate || new Date().toISOString(),
      notes: movementNotes,
    };

    const updated = trips.map((t) => {
      if (t.id === selectedTripId) {
        return { ...t, movements: [...(t.movements || []), newMovement] };
      }
      return t;
    });
    setTrips(updated);

    setMovementLocation("");
    setMovementOdometer("");
    setMovementNotes("");
    setExpenseDate("");

    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message: "📍 Spostamento registrato!" },
      }),
    );
  };

  const handleDeleteMovement = (movementId: string) => {
    const updated = trips.map((t) => {
      if (t.id === selectedTripId) {
        const movementToDelete = (t.movements || []).find((m) => m.id === movementId);
        const updatedMovements = (t.movements || []).filter((m) => m.id !== movementId);
        let updatedRoutePoints = t.routePoints || [];
        
        if (movementToDelete) {
          const locToDelete = movementToDelete.location.toLowerCase().trim();
          updatedRoutePoints = (t.routePoints || []).filter((rp) => {
            if (!rp.name) return true;
            const rpName = rp.name.toLowerCase().trim();
            return !rpName.includes(locToDelete) && !locToDelete.includes(rpName);
          });
        }

        return {
          ...t,
          movements: updatedMovements,
          routePoints: updatedRoutePoints,
        };
      }
      return t;
    });
    setTrips(updated);
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
      if (t.id === selectedTripId) {
        return {
          ...t,
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
    window.dispatchEvent(
      new CustomEvent("trip-updated", {
        detail: { trips: updated },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message: "✅ Chilometri salvati con successo!" },
      }),
    );
  };

  // Delete Expense handler
  const handleDeleteExpense = (expenseId: string) => {
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
    const updated = trips.map((t) => {
      if (t.id === selectedTripId) {
        return { ...t, status: newStatus };
      }
      return t;
    });
    setTrips(updated);
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

  // Save custom route points handler
  const handleSaveRoute = (routePoints: Array<{ lat: number; lng: number; name?: string }>) => {
    if (!selectedTripId) return;
    const updated = trips.map((t) => {
      if (t.id === selectedTripId) {
        const oldRoutePoints = t.routePoints || [];
        const oldMovements = t.movements || [];
        
        // Find which location names were removed
        const removedPoints = [
          ...oldRoutePoints.map(rp => rp.name || ""),
          ...oldMovements.map(m => m.location)
        ].filter(name => {
          if (!name) return false;
          const cleanName = name.toLowerCase().trim();
          // Check if it exists in the new routePoints
          return !routePoints.some((newRp) => {
            const newRpName = (newRp.name || "").toLowerCase().trim();
            return newRpName && (newRpName.includes(cleanName) || cleanName.includes(newRpName));
          });
        });

        let updatedMovements = oldMovements;
        if (removedPoints.length > 0) {
          updatedMovements = oldMovements.filter((m) => {
            const mLocation = m.location.toLowerCase().trim();
            return !removedPoints.some((removedName) => {
              const cleanRemoved = removedName.toLowerCase().trim();
              return cleanRemoved && (cleanRemoved.includes(mLocation) || mLocation.includes(cleanRemoved));
            });
          });
        }

        return {
          ...t,
          routePoints,
          movements: updatedMovements,
        };
      }
      return t;
    });
    setTrips(updated);
  };

  // File upload processing and API storage
  const processAndUploadFile = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);

    // Validate if it is an image
    if (!file.type.startsWith("image/")) {
      setUploadError("Il file selezionato non è un'immagine valida.");
      setIsUploading(false);
      return;
    }

    // Limit files to 15MB on client side
    if (file.size > 15 * 1024 * 1024) {
      setUploadError(
        "L'immagine supera la dimensione massima consentita di 15 MB.",
      );
      setIsUploading(false);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;

        // Apply compression quality from settings
        let finalBase64 = base64;
        if (settings?.photoQuality) {
          finalBase64 = await compressImage(base64, settings.photoQuality);
        }

        // Show a message if Solo Wi-Fi is active
        if (settings?.wifiOnlySync) {
          window.dispatchEvent(
            new CustomEvent("show-toast", {
              detail: {
                message: "ℹ️ Solo Wi-Fi attivo: caricamento ottimizzato per risparmio dati.",
              },
            }),
          );
        }

        // POST to our backend upload API
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: file.name,
            base64: finalBase64,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.url) {
            setUploadedImageUrl(data.url);
            window.dispatchEvent(
              new CustomEvent("show-toast", {
                detail: {
                  message: `📸 Foto "${file.name}" caricata con successo!`,
                },
              }),
            );
          } else {
            throw new Error(data.error || "Errore sconosciuto sul server.");
          }
        } else {
          const errData = await response.json();
          throw new Error(
            errData.error || `Codice di errore: ${response.status}`,
          );
        }
      } catch (err: any) {
        console.error("Upload process error:", err);
        setUploadError(`Caricamento fallito: ${err.message}`);
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      setUploadError("Errore durante la lettura locale del file.");
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processAndUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files[0]) {
      await processAndUploadFile(e.target.files[0]);
    }
  };

  // Add Photo with description handler
  const handleAddPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId) return;

    let url = "";
    if (photoType === "upload") {
      url = uploadedImageUrl;
      if (!url) {
        setUploadError(
          "Carica prima un'immagine usando il box o seleziona un'altra modalità.",
        );
        return;
      }
    } else if (photoType === "preset") {
      url = photoPresetUrl;
    } else if (photoType === "url") {
      url = photoCustomUrl;
    }

    if (!url.trim()) {
      setUploadError("Specifica un link valido per la foto.");
      return;
    }

    const newPhoto: DiaryPhoto = {
      id: "photo_" + Date.now(),
      url: url,
      description: photoDesc || "Nessuna descrizione inserita.",
      date: new Date().toISOString().split("T")[0],
      locationName: photoLocationName || undefined,
    };

    const updated = trips.map((t) => {
      if (t.id === selectedTripId) {
        return {
          ...t,
          photos: [...t.photos, newPhoto],
        };
      }
      return t;
    });

    setTrips(updated);
    setPhotoDesc("");
    setPhotoLocationName("");
    setPhotoCustomUrl("");
    setUploadedImageUrl("");
    setUploadError(null);
  };

  // Delete Photo handler
  const handleDeletePhoto = (photoId: string) => {
    const updated = trips.map((t) => {
      if (t.id === selectedTripId) {
        return {
          ...t,
          photos: t.photos.filter((p) => p.id !== photoId),
        };
      }
      return t;
    });
    setTrips(updated);
  };

  // Calculate stats for current active trip
  const totalExpensesOfActive = activeTrip
    ? activeTrip.expenses.reduce((sum, exp) => sum + exp.amount, 0)
    : 0;
    
  const getTripDistance = (trip: Trip) => {
    const movements = trip.movements || [];
    const validMovements = movements.filter(
      (m) => typeof m.odometer === "number" && !isNaN(m.odometer)
    ).map((m) => m.odometer);
    
    const refuelOdometers = (trip.expenses || [])
      .filter((e) => e.category === "Carburante" && typeof e.odometer === "number" && !isNaN(e.odometer))
      .map((e) => e.odometer as number);

    const allOdometers = [
      ...validMovements,
      ...refuelOdometers,
    ];

    if (typeof trip.startOdometer === "number" && !isNaN(trip.startOdometer)) {
      allOdometers.push(trip.startOdometer);
    }
    
    if (trip.status === "Completato" && typeof trip.endOdometer === "number" && !isNaN(trip.endOdometer)) {
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
      {/* Top Welcome Panel */}
      {diarySubTab === "list" && !showAddTrip && (
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
          <button
            onClick={() => setShowAddTrip(!showAddTrip)}
            className="px-4 py-2.5 bg-orange-200 hover:bg-orange-300 text-[#3E4A35] dark:bg-orange-600 dark:hover:bg-orange-700 dark:text-white font-black rounded-xl text-xs transition-transform flex items-center gap-1.5 shadow-sm shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nuovo Viaggio
          </button>
        </div>
      )}

      {diarySubTab === "list" ? (
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
                      Km Start (Odo)
                    </label>
                    <input
                      type="number"
                      placeholder="Km alla partenza"
                      value={newStartOdo}
                      onChange={(e) => setNewStartOdo(e.target.value)}
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-250 outline-none bg-white text-slate-700 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Km End (Odo)
                    </label>
                    <input
                      type="number"
                      placeholder="Km all'arrivo"
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
                    Descrizione & Sogni
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
                  {trips.map((trip) => {
                    const isSelected = selectedTripId === trip.id;
                    const totalSpent = trip.expenses.reduce(
                      (sum, e) => sum + e.amount,
                      0,
                    );

                    return (
                      <div
                        key={trip.id}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest("button"))
                            return;
                          setSelectedTripId(trip.id);
                          setDiarySubTab("details");
                        }}
                        className={`p-4 rounded-xl border transition-all text-left cursor-pointer flex flex-col justify-between relative overflow-hidden group hover:shadow-md h-[180px] ${
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
                          <div className="flex gap-2.5 items-center text-[10px] text-slate-500 font-semibold font-mono">
                            <span>📷 {trip.photos.length}</span>
                            <span>•</span>
                            <span>💶 {totalSpent.toFixed(0)}{getCurrencySymbol(settings)}</span> <span>•</span> <span>🛣️ {formatDistance(getTripDistance(trip), settings)}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-1 bg-[#3E4A35]/5 group-hover:bg-[#3E4A35] text-[#3E4A35] group-hover:text-white rounded-lg text-[10px] font-black transition-all flex items-center gap-0.5 uppercase shadow-xs">
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
                              Km Start (Odo)
                            </label>
                            <input
                              type="number"
                              value={editStartOdo}
                              onChange={(e) => setEditStartOdo(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                              Km End (Odo)
                            </label>
                            <input
                              type="number"
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
                            Descrizione & Sogni
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
                      <div className="flex justify-between items-start gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black tracking-widest text-[#5A6B4E] uppercase">
                              Diario Attivo
                            </span>

                            <select
                              value={activeTrip.status}
                              onChange={(e) =>
                                handleUpdateTripStatus(
                                  e.target.value as Trip["status"],
                                )
                              }
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black font-mono uppercase tracking-wider cursor-pointer outline-none border-none ${
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

                            <button
                              onClick={startEditingActiveTrip}
                              className="p-1 text-slate-400 hover:text-[#3E4A35] hover:bg-stone-100 rounded-lg transition-all cursor-pointer"
                              title="Modifica dettagli del viaggio"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                const updated = trips.map((t) =>
                                  t.id === activeTrip.id
                                    ? { ...t, isShared: !t.isShared }
                                    : t,
                                );
                                setTrips(updated);
                                window.dispatchEvent(
                                  new CustomEvent("show-toast", {
                                    detail: {
                                      message: `🔗 Viaggio ${!activeTrip.isShared ? "reso pubblico!" : "reso privato!"}`,
                                    },
                                  }),
                                );
                              }}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeTrip.isShared ? "bg-indigo-100 text-indigo-700" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"}`}
                              title={
                                activeTrip.isShared
                                  ? "Viaggio condiviso (clicca per rendere privato)"
                                  : "Condividi questo viaggio"
                              }
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          </div>
                          <h2 className="text-xl font-bold tracking-tight text-[#2D2926] mt-1">
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
                        <div className="flex gap-4">
                          <div className="bg-[#F5F2ED]/60 border border-slate-150 p-2 px-3 rounded-xl text-center">
                            <span className="text-[8px] font-bold text-slate-400 uppercase block">
                              Distanza
                            </span>
                            <span className="text-sm font-black text-slate-750 font-mono">
                              {odometerDiff > 0 ? `${formatDistance(odometerDiff, settings)}` : "---"}
                            </span>
                          </div>
                          <div className="bg-[#A45C40]/10 border border-transparent p-2 px-3 rounded-xl text-center">
                            <span className="text-[8px] font-bold text-[#A45C40] uppercase block">
                              Budget Speso
                            </span>
                            <span className="text-sm font-black text-[#A45C40] font-mono">
                              {totalExpensesOfActive.toFixed(2)} {getCurrencySymbol(settings)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 mt-3 leading-relaxed bg-[#F5F2ED]/40 p-3 rounded-xl border border-[#3E4A35]/5 italic relative group">
                        &quot;
                        {activeTrip.description ||
                          "Nessuna descrizione o nota inserita per questa escursione."}
                        &quot;
                        <button
                          onClick={startEditingActiveTrip}
                          className="absolute right-2 bottom-2 p-1.5 bg-white text-[10px] font-black text-[#3E4A35] hover:bg-[#3E4A35] hover:text-white rounded border border-[#3E4A35]/20 transition-all shadow-xs cursor-pointer"
                        >
                          Modifica nota
                        </button>
                      </p>
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
                        className={`flex-1 min-w-[30%] py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          expenseSubMode === "movement"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-500 hover:text-blue-600"
                        }`}
                      >
                        <Route className="w-3.5 h-3.5 text-blue-400" />
                        Spostamenti ({(activeTrip.movements || []).length})
                      </button>
                    </div>

                    {expenseSubMode === "general" ? (
                      /* ---------------- GENERAL EXPENSES VIEW ---------------- */
                      <div className="space-y-4 animate-fade-in">
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
                                ⛺ Area di Sosta / Camping
                              </option>
                              <option value="Altro">🏷️ Altro / Extra</option>
                            </select>
                          </div>
                          <div className="space-y-1">
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
                                            ? "Sosta"
                                            : exp.category}
                                      </span>
                                      <p className="text-xs font-bold text-slate-800 line-clamp-1">
                                        {exp.title}
                                      </p>
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                                      {exp.date}
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
                      </div>
                    ) : expenseSubMode === "refuel" ? (
                      /* ---------------- FUEL REFUELING DIARY VIEW ---------------- */
                      <div className="space-y-4 animate-fade-in font-sans">
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                            ⛽ Nuovo Rifornimento Carburante
                          </h3>
                        </div>

                        {/* Refueling Form */}
                        <form
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
                              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                Litri (L)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                required
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
                                  }
                                }}
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-emerald-500 text-slate-800 font-bold font-mono"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                Prezzo al litro ({getCurrencySymbol(settings)}/L)
                              </label>
                              <input
                                type="number"
                                step="0.001"
                                required
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
                                  }
                                }}
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-emerald-500 text-slate-800 font-bold font-mono"
                              />
                            </div>

                            {/* Computed Total Cost & Current Odometer */}
                            <div className="space-y-1">
                              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                Importo Speso ({getCurrencySymbol(settings)})
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                required
                                placeholder="Totale scontrino"
                                value={expenseAmount}
                                onChange={(e) =>
                                  setExpenseAmount(e.target.value)
                                }
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none bg-emerald-50/30 text-emerald-800 font-black font-mono focus:border-emerald-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                Contachilometri ({getDistanceUnit(settings)})
                              </label>
                              <input
                                type="number"
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
                              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
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
                                          {exp.date}
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
                      </div>
                    ) : expenseSubMode === "movement" ? (
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                            <Route className="w-3.5 h-3.5 text-blue-600" />
                            Spostamenti
                          </h3>
                        </div>

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

                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                          {(activeTrip.movements || []).length === 0 ? (
                            <p className="text-xs text-slate-400 py-4 text-center">
                              Nessun spostamento registrato.
                            </p>
                          ) : (
                            (activeTrip.movements || []).map((m) => (
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
                                            placeholder="Km"
                                            value={tempOdoValue}
                                            onChange={(e) => setTempOdoValue(e.target.value)}
                                            className="w-20 px-1 py-0.5 border border-slate-300 rounded text-[10px] font-mono focus:border-indigo-500 outline-none"
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
                                          {m.odometer !== undefined && m.odometer !== null ? (
                                            <span className="text-[10px] font-black uppercase text-blue-800 font-mono">
                                              {m.odometer} Km
                                            </span>
                                          ) : (
                                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-150 animate-pulse">
                                              ⚠️ Inserisci Km
                                            </span>
                                          )}
                                          <button
                                            onClick={() => {
                                              setEditingOdoId(m.id);
                                              setTempOdoValue(m.odometer !== undefined ? m.odometer.toString() : "");
                                            }}
                                            className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                                            title="Modifica o inserisci i chilometri manualmente"
                                          >
                                            {m.odometer !== undefined ? "Modifica" : "Inserisci"}
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

                                  <button
                                    onClick={() => handleDeleteMovement(m.id)}
                                    className="text-slate-350 hover:text-red-500 rounded p-1 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}

                    {/* Comprehensive overall Category budget breakdown progress bars */}
                    {activeTrip.expenses.length > 0 && (
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
                                    {cat}
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
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-[#3E4A35]" />
                      Scatti & Ricordi Fotografici ({activeTrip.photos.length})
                    </h3>

                    {/* Add Photo Form - Real Uploading interface */}
                    <form
                      onSubmit={handleAddPhoto}
                      className="p-4 bg-stone-50 rounded-xl border border-stone-100 space-y-3 font-sans"
                    >
                      {/* Intestazione Caricamento Foto */}
                      <div className="flex gap-2.5 items-center pb-2 border-b border-stone-150 flex-wrap">
                        <span className="text-[10.5px] font-black pb-1.5 border-b-2 text-[#3E4A35] border-[#3E4A35] flex items-center gap-1">
                          <Upload className="w-3.5 h-3.5" />
                          Carica foto 📷
                        </span>
                      </div>

                      {photoType === "upload" && (
                        <div className="space-y-2">
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
                            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[110px] relative ${
                              dragActive
                                ? "border-[#3E4A35] bg-[#3E4A35]/5 scale-[0.99]"
                                : uploadedImageUrl
                                  ? "border-emerald-500/50 bg-emerald-50/10"
                                  : "border-slate-200 hover:border-[#3E4A35]/40 hover:bg-slate-50/50"
                            }`}
                          >
                            <input
                              id="diary-file-input"
                              type="file"
                              accept="image/*"
                              onChange={handleFileInputChange}
                              className="hidden"
                            />

                            {isUploading ? (
                              <div className="space-y-2 flex flex-col items-center">
                                <Loader2 className="w-6 h-6 text-[#3E4A35] animate-spin" />
                                <p className="text-[10px] text-slate-500 font-bold font-sans">
                                  Caricamento in corso...
                                </p>
                              </div>
                            ) : uploadedImageUrl ? (
                              <div className="space-y-1.5 flex flex-col items-center">
                                <div className="relative w-16 h-12 rounded-lg overflow-hidden border border-emerald-500 shadow-xs">
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
                                    <span className="text-white text-[9px] font-black">
                                      ✓
                                    </span>
                                  </div>
                                </div>
                                <p className="text-[10px] text-emerald-600 font-black">
                                  Foto caricata con successo!
                                </p>
                                <p className="text-[9px] text-[#3E4A35] underline cursor-pointer font-bold">
                                  Cambia foto
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <Upload className="w-5 h-5 text-slate-400 mx-auto" />
                                <p className="text-[10.5px] text-slate-600 font-bold">
                                  Trascina qui la foto dallo smartphone/PC o{" "}
                                  <span className="text-[#3E4A35] underline font-bold">
                                    sfoglia
                                  </span>
                                </p>
                                <p className="text-[9px] text-slate-400">
                                  PNG, JPG, WEBP fino a 15MB
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

                    {/* Photo logs display */}
                    <div className="grid grid-cols-2 gap-3 max-h-[225px] overflow-y-auto pr-1">
                      {activeTrip.photos.length === 0 ? (
                        <div className="col-span-2 text-xs text-slate-400 py-8 text-center bg-white border border-slate-100 rounded-lg">
                          <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                          Nessuno scatto caricato. Scatta o simula la prima foto
                          della vacanza!
                        </div>
                      ) : (
                        activeTrip.photos.map((photo, idx) => (
                          <div
                            key={photo.id}
                            className="bg-stone-50 rounded-xl overflow-hidden border border-slate-150 relative group cursor-pointer"
                            onClick={() => setSelectedLightboxPhotoIndex(idx)}
                          >
                            <div className="relative w-full h-24 overflow-hidden bg-stone-100">
                              <img
                                src={photo.url}
                                alt={photo.description}
                                referrerPolicy={
                                  photo.url?.startsWith("http")
                                    ? "no-referrer"
                                    : undefined
                                }
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />

                              {/* Hover overlay with Eye zoom icon */}
                              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="p-1.5 bg-white/10 backdrop-blur-xs text-white rounded-full border border-white/20">
                                  <Eye className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>

                            <div className="p-1.5 space-y-1">
                              <p className="text-[10px] text-slate-700 leading-tight line-clamp-2">
                                {photo.description}
                              </p>
                              {photo.locationName && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-blue-50 text-blue-800 rounded text-[9px] font-bold">
                                  <MapPin className="w-2.5 h-2.5" />
                                  {photo.locationName}
                                </span>
                              )}
                            </div>

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
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Visual Trip Route Tracker & Interactive Camper */}
                <div className="mt-6 border-t border-stone-100 pt-6">
                  <TripRouteMap trip={activeTrip} onSaveRoute={handleSaveRoute} onNavigateToPlace={onNavigateToPlace} />
                </div>
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
        activeTrip.photos[selectedLightboxPhotoIndex] && (
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
                <img
                  src={activeTrip.photos[selectedLightboxPhotoIndex].url}
                  alt={
                    activeTrip.photos[selectedLightboxPhotoIndex].description
                  }
                  referrerPolicy={
                    activeTrip.photos[
                      selectedLightboxPhotoIndex
                    ].url?.startsWith("http")
                      ? "no-referrer"
                      : undefined
                  }
                  className="max-w-full max-h-[75vh] object-contain select-none"
                />

                {activeTrip.photos.length > 1 && (
                  <>
                    {/* Left Sliding button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newIdx =
                          (selectedLightboxPhotoIndex -
                            1 +
                            activeTrip.photos.length) %
                          activeTrip.photos.length;
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
                          activeTrip.photos.length;
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
              <div className="w-full bg-stone-950 p-5 border-t border-stone-855 text-stone-200 text-left space-y-1.5 font-sans">
                <div className="flex justify-between items-center text-[10px] text-stone-400 font-bold font-mono">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-stone-500" />
                    Scattata il:{" "}
                    {activeTrip.photos[selectedLightboxPhotoIndex].date}
                  </span>
                  <span>
                    Foto {selectedLightboxPhotoIndex + 1} di{" "}
                    {activeTrip.photos.length}
                  </span>
                </div>
                <p className="text-xs md:text-sm font-semibold tracking-wide text-white leading-relaxed">
                  {activeTrip.photos[selectedLightboxPhotoIndex].description}
                </p>
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
    </div>
  );
}
