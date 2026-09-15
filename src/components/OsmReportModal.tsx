import React, { useState, useEffect, useRef } from "react";
import {
  X,
  MapPin,
  Camera,
  AlertTriangle,
  Upload,
  CheckCircle2,
  RefreshCw,
  Info,
  ChevronRight,
  Trash2,
  ShieldAlert,
  ArrowUpDown,
  ArrowLeftRight,
  Weight,
  Ban,
  Compass,
} from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export type OsmReportType =
  | "height_limit"
  | "width_limit"
  | "weight_limit"
  | "camper_ban"
  | "narrow_road"
  | "road_error"
  | "other";

export interface OsmReportData {
  id?: string;
  reportType: OsmReportType;
  reportTypeLabel: string;
  value?: number;
  unit?: "m" | "t";
  lat: number;
  lng: number;
  address?: string;
  description: string;
  photoUrl?: string;
  reporterEmail?: string;
  reporterName?: string;
  status: "pending" | "verified_on_osm" | "rejected";
  osmNodeOrWayUrl?: string;
  createdAt: string;
}

interface OsmReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLat?: number;
  currentLng?: number;
  currentUser?: {
    email?: string;
    nickname?: string;
    name?: string;
  } | null;
  onReportSubmitted?: (report: OsmReportData) => void;
}

/**
 * Visual road sign component replicating authentic European restriction signs
 */
export const RoadSignGraphic: React.FC<{
  type: OsmReportType;
  value?: number;
  unit?: "m" | "t";
  className?: string;
  size?: number;
}> = ({ type, value, unit, className = "", size = 64 }) => {
  if (type === "height_limit") {
    const displayVal = value ? value.toFixed(1).replace(".", ",") + "m" : "2,8m";
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        className={`shrink-0 drop-shadow-sm select-none ${className}`}
      >
        <circle cx="32" cy="32" r="27.5" fill="#FFFFFF" stroke="#DC2626" strokeWidth="7" />
        {/* Top triangle pointing down */}
        <polygon points="32,10.5 27,16.5 37,16.5" fill="#18181B" />
        {/* Bottom triangle pointing up */}
        <polygon points="32,53.5 27,47.5 37,47.5" fill="#18181B" />
        {/* Value in middle */}
        <text
          x="32"
          y="32.5"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#18181B"
          fontSize="14"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="-0.5px"
        >
          {displayVal}
        </text>
      </svg>
    );
  }

  if (type === "width_limit") {
    const displayVal = value ? value.toFixed(1).replace(".", ",") + "m" : "2,3m";
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        className={`shrink-0 drop-shadow-sm select-none ${className}`}
      >
        <circle cx="32" cy="32" r="27.5" fill="#FFFFFF" stroke="#DC2626" strokeWidth="7" />
        {/* Left triangle pointing inwards */}
        <polygon points="10.5,32 16.5,27 16.5,37" fill="#18181B" />
        {/* Right triangle pointing inwards */}
        <polygon points="53.5,32 47.5,27 47.5,37" fill="#18181B" />
        {/* Value in middle with optimal font size and clearance - fully readable */}
        <text
          x="32"
          y="32.5"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#18181B"
          fontSize="13.5"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="-0.5px"
        >
          {displayVal}
        </text>
      </svg>
    );
  }

  if (type === "weight_limit") {
    const displayVal = value
      ? (value === 10 || value % 1 === 0 ? `${value.toFixed(0)}t` : `${value.toFixed(1).replace(".", ",")}t`)
      : "3,5t";
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        className={`shrink-0 drop-shadow-sm select-none ${className}`}
      >
        <circle cx="32" cy="32" r="27.5" fill="#FFFFFF" stroke="#DC2626" strokeWidth="7" />
        <text
          x="32"
          y="32.5"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#18181B"
          fontSize="15"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="-0.5px"
        >
          {displayVal}
        </text>
      </svg>
    );
  }

  if (type === "camper_ban") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        className={`shrink-0 drop-shadow-sm select-none ${className}`}
      >
        {/* Authentic European Camper Prohibition Sign: white circle with thick red border */}
        <circle cx="32" cy="32" r="27.5" fill="#FFFFFF" stroke="#DC2626" strokeWidth="7" />

        {/* Camper silhouette in center (Fig. II 59) */}
        <g fill="#18181B">
          <path d="M 48 24 L 26 24 C 23 24 20 25.5 17.5 27.5 C 16.5 28.5 17 29.5 18.5 29.5 L 22 29.5 L 16.5 35 C 16 35.5 15.5 36.5 15.5 37.5 L 15.5 39.5 C 15.5 40 16 40.5 16.5 40.5 L 19 40.5 C 19 38.5 20.8 37 23 37 C 25.2 37 27 38.5 27 40.5 L 38 40.5 C 38 38.5 39.8 37 42 37 C 44.2 37 46 38.5 46 40.5 L 48 40.5 C 48.6 40.5 49 40 49 39.5 L 49 25 C 49 24.4 48.6 24 48 24 Z" />
          {/* Wheels */}
          <circle cx="23" cy="40.5" r="3.2" />
          <circle cx="42" cy="40.5" r="3.2" />
        </g>
        {/* Wheel Rims (white center) */}
        <circle cx="23" cy="40.5" r="1.3" fill="#FFFFFF" />
        <circle cx="42" cy="40.5" r="1.3" fill="#FFFFFF" />

        {/* Windows */}
        <path d="M 21.5 30.5 L 18 34.5 L 22.5 34.5 L 22.5 30.5 Z" fill="#FFFFFF" />
        <rect x="25.5" y="26.5" width="8" height="5.5" rx="1" fill="#FFFFFF" />
        <rect x="36.5" y="26.5" width="8" height="5.5" rx="1" fill="#FFFFFF" />
      </svg>
    );
  }

  if (type === "narrow_road") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        className={`shrink-0 drop-shadow-sm select-none ${className}`}
      >
        {/* Warning Triangle */}
        <polygon
          points="32,7 57,53 7,53"
          fill="#FFFFFF"
          stroke="#DC2626"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        {/* Zig-Zag Arrow */}
        <path
          d="M 30 46 L 36 38 L 27 28 L 35 19"
          stroke="#18181B"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <polygon points="35,14 41,22 32,21" fill="#18181B" />
      </svg>
    );
  }

  if (type === "road_error") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        className={`shrink-0 drop-shadow-sm select-none ${className}`}
      >
        {/* Standard European Generic Prohibition Sign (Divieto di transito - Art. 116 CdS) */}
        <circle cx="32" cy="32" r="27.5" fill="#FFFFFF" stroke="#DC2626" strokeWidth="7" />
      </svg>
    );
  }

  // Generic danger warning triangle
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={`shrink-0 drop-shadow-sm select-none ${className}`}
    >
      <polygon
        points="32,7 57,53 7,53"
        fill="#FFFFFF"
        stroke="#DC2626"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <line x1="32" y1="23" x2="32" y2="37" stroke="#18181B" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="32" cy="45" r="2.8" fill="#18181B" />
    </svg>
  );
};

export const OsmReportModal: React.FC<OsmReportModalProps> = ({
  isOpen,
  onClose,
  currentLat = 41.8902,
  currentLng = 12.4922,
  currentUser,
  onReportSubmitted,
}) => {
  const [reportType, setReportType] = useState<OsmReportType>("height_limit");
  const [lat, setLat] = useState<number>(currentLat);
  const [lng, setLng] = useState<number>(currentLng);
  const [address, setAddress] = useState<string>("");
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);

  // Numeric values
  const [heightValue, setHeightValue] = useState<number>(2.8);
  const [widthValue, setWidthValue] = useState<number>(2.3);
  const [weightValue, setWeightValue] = useState<number>(3.5);

  const [description, setDescription] = useState<string>("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial coords when opened
  useEffect(() => {
    if (isOpen) {
      if (currentLat && currentLng) {
        setLat(currentLat);
        setLng(currentLng);
        fetchAddressFromCoords(currentLat, currentLng);
      }
      setSubmitSuccess(false);
    }
  }, [isOpen, currentLat, currentLng]);

  // Reverse geocode coords to human address
  const fetchAddressFromCoords = async (latitude: number, longitude: number) => {
    try {
      setIsGeocoding(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "it" } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const parts = [
            data.address?.road || data.address?.pedestrian || data.address?.path,
            data.address?.house_number,
            data.address?.city || data.address?.town || data.address?.village,
            data.address?.county,
          ].filter(Boolean);
          setAddress(parts.length > 0 ? parts.join(", ") : data.display_name);
        }
      }
    } catch {
      // Non blocking
    } finally {
      setIsGeocoding(false);
    }
  };

  // GPS Refresh
  const handleGetGpsPosition = () => {
    if (!navigator.geolocation) {
      alert("Geolocalizzazione non supportata da questo browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setLat(newLat);
        setLng(newLng);
        fetchAddressFromCoords(newLat, newLng);
      },
      (err) => {
        setIsLocating(false);
        console.warn("GPS error:", err);
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message: "⚠️ Impossibile rilevare posizione GPS automatica. Usa le coordinate della mappa.",
              duration: 3500,
            },
          })
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Image compression & preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
  };

  const processImageFile = (file: File) => {
    setPhotoFileName(file.name);
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize canvas to max 1280px for light firestore storage
        const maxDim = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.78);
          setPhotoPreview(compressedDataUrl);
        } else {
          setPhotoPreview(event.target?.result as string);
        }
        setIsUploading(false);
      };
      img.onerror = () => {
        setIsUploading(false);
        setPhotoPreview(event.target?.result as string);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Submit report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let numericVal: number | undefined;
    let unitVal: "m" | "t" | undefined;
    let label = "Segnalazione Mappa OSM";

    if (reportType === "height_limit") {
      numericVal = heightValue;
      unitVal = "m";
      label = `Limite Altezza / Sottopasso (${heightValue.toFixed(1)}m)`;
    } else if (reportType === "width_limit") {
      numericVal = widthValue;
      unitVal = "m";
      label = `Limite Larghezza / Strettoia (${widthValue.toFixed(1)}m)`;
    } else if (reportType === "weight_limit") {
      numericVal = weightValue;
      unitVal = "t";
      const formattedWeight = weightValue === 10 || weightValue % 1 === 0 ? `${weightValue.toFixed(0)}t` : `${weightValue.toFixed(1)}t`;
      label = `Limite di Peso (${formattedWeight})`;
    } else if (reportType === "camper_ban") {
      label = "Divieto Transito Camper / ZTL";
    } else if (reportType === "narrow_road") {
      label = "Strada Tortuosa / Impraticabile";
    } else if (reportType === "road_error") {
      label = "Vietato / Divieto di Transito";
    } else {
      label = "Altra Segnalazione Mappa";
    }

    const reportData: OsmReportData = {
      reportType,
      reportTypeLabel: label,
      value: numericVal,
      unit: unitVal,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      address: address.trim() || undefined,
      description: description.trim(),
      photoUrl: photoPreview || undefined,
      reporterEmail: currentUser?.email || "anonimo@viacamper.app",
      reporterName: currentUser?.nickname || currentUser?.name || "Camperista Community",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Save in Firestore osmMapReports collection
      const docRef = await addDoc(collection(db, "osmMapReports"), reportData);
      reportData.id = docRef.id;

      // 2. Also register in local storage backup so reports are never lost
      try {
        const existingReports = JSON.parse(localStorage.getItem("camper_osm_reports") || "[]");
        existingReports.unshift(reportData);
        localStorage.setItem("camper_osm_reports", JSON.stringify(existingReports.slice(0, 50)));
      } catch {
        // Ignore local storage error
      }

      // 3. Notify Admin in adminNotifications collection for badge alert
      try {
        await addDoc(collection(db, "adminNotifications"), {
          type: "osm_report",
          reason: `Nuova segnalazione OSM: ${label} a ${address || `[${lat.toFixed(4)}, ${lng.toFixed(4)}]`}`,
          author: reportData.reporterName,
          content: description || `Segnalato limite di sagoma o strada: ${label}`,
          reportId: docRef.id,
          timestamp: new Date().toISOString(),
        });
      } catch {
        // Non-blocking
      }

      setSubmitSuccess(true);
      if (onReportSubmitted) {
        onReportSubmitted(reportData);
      }

      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: {
            message: "✅ Segnalazione inviata all'amministratore per aggiornamento OSM!",
            duration: 4500,
          },
        })
      );

      // Auto close after 2 seconds
      setTimeout(() => {
        setIsSubmitting(false);
        setSubmitSuccess(false);
        setDescription("");
        setPhotoPreview(null);
        onClose();
      }, 1800);
    } catch (err) {
      console.error("Error submitting OSM report:", err);
      // Fallback in local storage so user doesn't lose work
      try {
        const existingReports = JSON.parse(localStorage.getItem("camper_osm_reports") || "[]");
        existingReports.unshift(reportData);
        localStorage.setItem("camper_osm_reports", JSON.stringify(existingReports.slice(0, 50)));
        setSubmitSuccess(true);
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message: "💾 Segnalazione salvata in locale (in attesa di connessione)!",
              duration: 4500,
            },
          })
        );
        setTimeout(() => {
          setIsSubmitting(false);
          setSubmitSuccess(false);
          onClose();
        }, 1800);
      } catch {
        alert("Errore nell'invio della segnalazione. Riprova più tardi.");
        setIsSubmitting(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with warning sign motif */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-15 pointer-events-none">
            <ShieldAlert className="w-32 h-32" />
          </div>

          <div className="flex items-center gap-3 relative z-10 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 shadow-inner">
              <AlertTriangle className="w-6 h-6 text-amber-200 fill-amber-300/30" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                  Segnala Ostacolo
                </h2>
                <span className="bg-white/25 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full backdrop-blur-xs tracking-wider shrink-0">
                  OpenStreetMap
                </span>
              </div>
              <p className="text-xs text-rose-100 font-medium truncate">
                Invia dati e foto di sottopassi o cartelli di divieto non presenti su OSM
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 z-10 active:scale-95 disabled:opacity-50"
            title="Chiudi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1">
          {submitSuccess ? (
            <div className="py-10 flex flex-col items-center justify-center text-center space-y-3 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white">
                Segnalazione Inviata con Successo!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm">
                Grazie per il tuo contributo alla community! L&apos;amministratore verificherà
                le coordinate GPS e la foto del cartello per inserire l&apos;ostacolo su OpenStreetMap.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* GPS coordinates & location card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-100">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Posizione Rilevata</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-md">
                      GPS Auto
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGetGpsPosition}
                    disabled={isLocating}
                    className="flex items-center gap-1 text-[11px] font-black text-rose-700 dark:text-rose-400 hover:text-rose-800 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-xl border border-rose-200 dark:border-rose-900 transition-all cursor-pointer active:scale-95 disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLocating ? "animate-spin" : ""}`} />
                    <span>{isLocating ? "Rilevo..." : "Aggiorna GPS"}</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-slate-400">Lat:</span>
                  <span>{lat.toFixed(5)}</span>
                  <span className="text-slate-400 ml-2">Lng:</span>
                  <span>{lng.toFixed(5)}</span>
                </div>

                {/* Address representation */}
                <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1 pt-0.5">
                  <Compass className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="truncate">
                    {isGeocoding
                      ? "Ricerca via in corso..."
                      : address || "Punto sulla mappa selezionato"}
                  </span>
                </div>
              </div>

              {/* Step 1: Select obstacle / restriction type */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">
                  1. Seleziona tipo di ostacolo o cartello
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {/* Height limit */}
                  <button
                    type="button"
                    onClick={() => setReportType("height_limit")}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-center text-center gap-1.5 select-none ${
                      reportType === "height_limit"
                        ? "bg-rose-50 border-rose-500 shadow-xs ring-2 ring-rose-500/20 dark:bg-rose-950/40"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <RoadSignGraphic type="height_limit" value={heightValue} size={46} />
                    <span className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                      Limite Altezza
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">
                      Sottopassi / Ponti
                    </span>
                  </button>

                  {/* Width limit */}
                  <button
                    type="button"
                    onClick={() => setReportType("width_limit")}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-center text-center gap-1.5 select-none ${
                      reportType === "width_limit"
                        ? "bg-rose-50 border-rose-500 shadow-xs ring-2 ring-rose-500/20 dark:bg-rose-950/40"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <RoadSignGraphic type="width_limit" value={widthValue} size={46} />
                    <span className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                      Limite Larghezza
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">
                      Strade Strette
                    </span>
                  </button>

                  {/* Weight limit */}
                  <button
                    type="button"
                    onClick={() => setReportType("weight_limit")}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-center text-center gap-1.5 select-none ${
                      reportType === "weight_limit"
                        ? "bg-rose-50 border-rose-500 shadow-xs ring-2 ring-rose-500/20 dark:bg-rose-950/40"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <RoadSignGraphic type="weight_limit" value={weightValue} size={46} />
                    <span className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                      Limite di Peso
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">
                      Portata Ponti
                    </span>
                  </button>

                  {/* Camper ban */}
                  <button
                    type="button"
                    onClick={() => setReportType("camper_ban")}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-center text-center gap-1.5 select-none ${
                      reportType === "camper_ban"
                        ? "bg-rose-50 border-rose-500 shadow-xs ring-2 ring-rose-500/20 dark:bg-rose-950/40"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <RoadSignGraphic type="camper_ban" size={46} />
                    <span className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                      Divieto Camper
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">
                      ZTL / Divieti sosta
                    </span>
                  </button>

                  {/* Narrow road */}
                  <button
                    type="button"
                    onClick={() => setReportType("narrow_road")}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-center text-center gap-1.5 select-none ${
                      reportType === "narrow_road"
                        ? "bg-rose-50 border-rose-500 shadow-xs ring-2 ring-rose-500/20 dark:bg-rose-950/40"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <RoadSignGraphic type="narrow_road" size={46} />
                    <span className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                      Strada Tortuosa
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">
                      Non praticabile
                    </span>
                  </button>

                  {/* Vietato */}
                  <button
                    type="button"
                    onClick={() => setReportType("road_error")}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-center text-center gap-1.5 select-none ${
                      reportType === "road_error"
                        ? "bg-rose-50 border-rose-500 shadow-xs ring-2 ring-rose-500/20 dark:bg-rose-950/40"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <RoadSignGraphic type="road_error" size={46} />
                    <span className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                      Vietato
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">
                      Divieto di transito
                    </span>
                  </button>
                </div>
              </div>

              {/* Step 2: Value selector (if height, width or weight) */}
              {reportType === "height_limit" && (
                <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-black text-rose-950 dark:text-rose-200 flex items-center gap-1.5 min-w-0">
                      <ArrowUpDown className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="truncate">Altezza Massima Indicata (Metri):</span>
                    </label>
                    <span className="text-sm sm:text-base font-black text-rose-700 font-mono bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-lg border border-rose-300 shrink-0 whitespace-nowrap">
                      {heightValue.toFixed(1)} m
                    </span>
                  </div>

                  {/* Quick preset buttons - 2 rows of 5 */}
                  <div className="grid grid-cols-5 gap-1">
                    {[2.2, 2.5, 2.7, 2.8, 3.0, 3.2, 3.4, 3.5, 3.7, 3.9].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setHeightValue(val)}
                        className={`w-full py-1.5 rounded-xl text-xs font-black text-center whitespace-nowrap transition-all cursor-pointer ${
                          heightValue === val
                            ? "bg-rose-600 text-white shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-rose-100/50"
                        }`}
                      >
                        {val.toFixed(1)}m
                      </button>
                    ))}
                  </div>

                  <input
                    type="range"
                    min="1.8"
                    max="4.5"
                    step="0.05"
                    value={heightValue}
                    onChange={(e) => setHeightValue(parseFloat(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </div>
              )}

              {reportType === "width_limit" && (
                <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-black text-rose-950 dark:text-rose-200 flex items-center gap-1.5 min-w-0">
                      <ArrowLeftRight className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="truncate">Larghezza Massima Indicata (Metri):</span>
                    </label>
                    <span className="text-sm sm:text-base font-black text-rose-700 font-mono bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-lg border border-rose-300 shrink-0 whitespace-nowrap">
                      {widthValue.toFixed(1)} m
                    </span>
                  </div>

                  {/* Quick preset buttons - 2 rows of 5 */}
                  <div className="grid grid-cols-5 gap-1">
                    {[1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setWidthValue(val)}
                        className={`w-full py-1.5 rounded-xl text-xs font-black text-center whitespace-nowrap transition-all cursor-pointer ${
                          widthValue === val
                            ? "bg-rose-600 text-white shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-rose-100/50"
                        }`}
                      >
                        {val.toFixed(1)}m
                      </button>
                    ))}
                  </div>

                  <input
                    type="range"
                    min="1.8"
                    max="3.2"
                    step="0.05"
                    value={widthValue}
                    onChange={(e) => setWidthValue(parseFloat(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </div>
              )}

              {reportType === "weight_limit" && (
                <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-black text-rose-950 dark:text-rose-200 flex items-center gap-1.5 min-w-0">
                      <Weight className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="truncate">Massa Massima Indicata (Tonnellate):</span>
                    </label>
                    <span className="text-sm sm:text-base font-black text-rose-700 font-mono bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-lg border border-rose-300 shrink-0 whitespace-nowrap">
                      {weightValue === 10 || weightValue % 1 === 0 ? weightValue.toFixed(0) : weightValue.toFixed(1)} t
                    </span>
                  </div>

                  {/* Quick preset buttons - exactly 1 row of 6 side by side */}
                  <div className="grid grid-cols-6 gap-1">
                    {[2.5, 3.0, 3.5, 5.0, 7.5, 10.0].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setWeightValue(val)}
                        className={`w-full py-1.5 rounded-xl text-xs font-black text-center whitespace-nowrap transition-all cursor-pointer ${
                          weightValue === val
                            ? "bg-rose-600 text-white shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-rose-100/50"
                        }`}
                      >
                        {val === 10 ? "10t" : `${val.toFixed(1)}t`}
                      </button>
                    ))}
                  </div>

                  <input
                    type="range"
                    min="2.0"
                    max="10.0"
                    step="0.5"
                    value={weightValue}
                    onChange={(e) => setWeightValue(parseFloat(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </div>
              )}

              {/* Step 3: Photo upload */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                  2. Foto del cartello o dell&apos;ostacolo (consigliata)
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {photoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 group">
                    <img
                      src={photoPreview}
                      alt="Anteprima cartello"
                      className="w-full h-48 sm:h-56 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-between p-3">
                      <span className="text-white text-xs font-medium truncate max-w-[200px]">
                        {photoFileName || "Foto cartello caricata"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreview(null);
                          setPhotoFileName("");
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1 shadow-md transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Rimuovi</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) processImageFile(file);
                    }}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-5 text-center flex flex-col items-center justify-center gap-2 hover:border-rose-400 hover:bg-rose-50/20 transition-all cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                        Scatta una foto o carica dalla galleria
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        La foto permette all&apos;amministratore di verificare con certezza il cartello stradale
                      </span>
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Scegli Foto
                    </button>
                  </div>
                )}
              </div>

              {/* Step 4: Description text */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                  3. Descrizione / Note aggiuntive
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="es. Sottopasso ferroviario con altezza 2.9m non presente nella mappa OSM. Strada stretta adiacente alla ferrovia con senso unico alternato..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 transition-all resize-none"
                />
              </div>

              {/* Step 5: User identification badge */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400">
                <span>Segnalato da:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {currentUser?.nickname || currentUser?.name || currentUser?.email || "Camperista Community"}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Invio in corso...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Invia Segnalazione</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
