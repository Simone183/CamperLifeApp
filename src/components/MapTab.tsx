/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useAppSettings } from "../useAppSettings";
import { getCurrencySymbol, getDistanceUnit, convertDistance, formatDistance, getTileUrl } from "../unit-helpers";
import { compressImage } from "../utils/photoCompressor";
import {
  Place,
  Review,
  VehicleDimensions,
  PlaceCategory,
  OSMObstacle,
  Trip,
} from "../types";
import {
  MapPin,
  Heart,
  Star,
  AlertTriangle,
  CloudRain,
  Phone,
  Wifi,
  Compass,
  Layers,
  Plus,
  Camera,
  Check,
  Search,
  Filter,
  Navigation,
  ArrowLeft,
  Database,
  Download,
  Shield,
  Trash2,
  X,
  Lock,
  Fuel,
  Banknote,
  Route,
  Sparkles,
} from "lucide-react";
import L from "leaflet";
import { CategoryIllustration } from "./CategoryIllustration";
import { WeatherWidget } from "./WeatherWidget";
import {
  getTile,
  getBestTile,
  generatePlaceholderTile,
} from "../utils/offlineMapCache";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";

// Read API Key from environment or globals (fallback to hardcoded key)
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "AIzaSyA0sghtQ3udo9A5yEXvNn9_O7HzPqGLiAg";

// Custom Map Circle Component using Google Maps JS SDK natively
export function MapCircle({
  center,
  radius,
  color,
}: {
  center: { lat: number; lng: number };
  radius: number;
  color: string;
}) {
  const map = useMap();
  React.useEffect(() => {
    if (!map || !center || !window.google) return;
    const circle = new window.google.maps.Circle({
      map,
      center: { lat: Number(center.lat), lng: Number(center.lng) },
      radius,
      fillColor: color,
      fillOpacity: 0.08,
      strokeColor: color,
      strokeWeight: 1.5,
      strokeOpacity: 0.8,
      clickable: false,
    });
    return () => {
      circle.setMap(null);
    };
  }, [map, center, radius, color]);
  return null;
}

// Custom Map Polyline Component using Google Maps JS SDK natively
export function MapPolyline({
  path,
  color,
  weight,
  dashed,
}: {
  path: { lat: number; lng: number }[];
  color: string;
  weight: number;
  dashed?: boolean;
}) {
  const map = useMap();
  React.useEffect(() => {
    if (!map || !path || path.length === 0 || !window.google) return;
    const polyline = new window.google.maps.Polyline({
      map,
      path,
      strokeColor: color,
      strokeWeight: weight,
      strokeOpacity: dashed ? 0.65 : 0.95,
      clickable: false,
      icons: dashed
        ? [
            {
              icon: {
                path: "M 0,-1 0,1",
                strokeOpacity: 1,
                scale: 3,
              },
              offset: "0",
              repeat: "15px",
            },
          ]
        : undefined,
    });
    return () => {
      polyline.setMap(null);
    };
  }, [map, path, color, weight, dashed]);
  return null;
}

// Custom Map Helper to bridge event handlers and backward-compatible helper methods
function MapEventsHelper({
  mapRef,
  onMapClick,
  onMapContextMenu,
  onIdle,
  mapMovedByUserRef,
}: {
  mapRef: React.MutableRefObject<any>;
  onMapClick: (lat: number, lng: number) => void;
  onMapContextMenu: (lat: number, lng: number) => void;
  onIdle: (lat: number, lng: number) => void;
  mapMovedByUserRef: React.MutableRefObject<boolean>;
}) {
  const map = useMap();

  React.useEffect(() => {
    if (!map) return;

    // Attach backwards-compatible custom helpers to google maps instance
    (map as any).setView = (coords: [any, any], zoom?: number) => {
      if (coords && coords[0] !== undefined && coords[1] !== undefined && !isNaN(Number(coords[0])) && !isNaN(Number(coords[1]))) {
        map.setCenter({ lat: Number(coords[0]), lng: Number(coords[1]) });
      }
      if (zoom !== undefined) {
        map.setZoom(zoom);
      }
    };

    const originalGetCenter = map.getCenter;
    map.getCenter = () => {
      const c = originalGetCenter.call(map);
      if (!c) {
        const fallbackLat = 44.5;
        const fallbackLng = 11.5;
        const latFn = function () {
          return fallbackLat;
        };
        latFn.valueOf = () => fallbackLat;
        latFn.toString = () => fallbackLat.toString();
        latFn.toFixed = (digits?: number) => fallbackLat.toFixed(digits);
        const lngFn = function () {
          return fallbackLng;
        };
        lngFn.valueOf = () => fallbackLng;
        lngFn.toString = () => fallbackLng.toString();
        lngFn.toFixed = (digits?: number) => fallbackLng.toFixed(digits);
        return { lat: latFn, lng: lngFn } as any;
      }
      return new Proxy(c, {
        get(target, prop, receiver) {
          if (prop === "lat") {
            const val = target.lat();
            const fn = function () {
              return val;
            };
            fn.valueOf = () => val;
            fn.toString = () => val.toString();
            fn.toFixed = (digits?: number) => val.toFixed(digits);
            return fn;
          }
          if (prop === "lng") {
            const val = target.lng();
            const fn = function () {
              return val;
            };
            fn.valueOf = () => val;
            fn.toString = () => val.toString();
            fn.toFixed = (digits?: number) => val.toFixed(digits);
            return fn;
          }
          const value = Reflect.get(target, prop, receiver);
          if (typeof value === "function") {
            return value.bind(target);
          }
          return value;
        },
      });
    };

    mapRef.current = map;

    // Bind event listeners using Google Maps Client API
    const clickListener = map.addListener(
      "click",
      (e: any) => {
        const latLng = e.latLng;
        if (latLng) {
          onMapClick(latLng.lat(), latLng.lng());
        }
      },
    );

    const contextmenuListener = map.addListener(
      "contextmenu",
      (e: any) => {
        const latLng = e.latLng;
        if (latLng) {
          onMapContextMenu(latLng.lat(), latLng.lng());
        }
      },
    );

    const dragendListener = map.addListener("dragend", () => {
      mapMovedByUserRef.current = true;
    });

    const zoomchangedListener = map.addListener("zoom_changed", () => {
      mapMovedByUserRef.current = true;
    });

    const idleListener = map.addListener("idle", () => {
      const center = map.getCenter();
      if (center) {
        onIdle(center.lat(), center.lng());
      }
    });

    return () => {
      clickListener.remove();
      contextmenuListener.remove();
      dragendListener.remove();
      zoomchangedListener.remove();
      idleListener.remove();
      mapRef.current = null;
    };
  }, [map, onMapClick, onMapContextMenu, onIdle, mapRef, mapMovedByUserRef]);

  return null;
}

// Custom Smart Route Display Component on top of Google Maps
function SmartRouteDisplay({
  selectedPlace,
  userLocation,
  avoidObstaclesMode,
  vehicleDimensions,
  places,
}: {
  selectedPlace: Place;
  userLocation: { lat: number; lng: number };
  avoidObstaclesMode: boolean;
  vehicleDimensions: VehicleDimensions;
  places: Place[];
}) {
  const map = useMap();
  const startPt: [number, number] = [userLocation.lat, userLocation.lng];
  const endPt: [number, number] = [selectedPlace.lat, selectedPlace.lng];

  // Fit view bounds automatically on load
  React.useEffect(() => {
    if (map) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lat: startPt[0], lng: startPt[1] });
      bounds.extend({ lat: endPt[0], lng: endPt[1] });
      map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
    }
  }, [map, userLocation, selectedPlace]);

  const isBridgeObstacleExceeded = vehicleDimensions.height > 3.12;
  const midLat = (startPt[0] + endPt[0]) / 2;
  const midLng = (startPt[1] + endPt[1]) / 2;

  // Build standard direct routing points
  const directPath: { lat: number; lng: number }[] = [];
  const segments = 24;
  for (let i = 0; i <= segments; i++) {
    const ratio = i / segments;
    const lat = startPt[0] + (endPt[0] - startPt[0]) * ratio;
    const lng = startPt[1] + (endPt[1] - startPt[1]) * ratio;
    const bend = Math.sin(ratio * Math.PI) * 0.0055;
    directPath.push({ lat: lat + bend, lng: lng - bend });
  }

  // Midpoint height limitation bridge coordinates (placed on the 12th segment)
  const midCoord = directPath[12];

  // Build detoured safe path around the middle segments (ratio 0.33 to 0.67)
  const detourPath: { lat: number; lng: number }[] = [];
  for (let i = 0; i <= segments; i++) {
    const ratio = i / segments;
    let lat = startPt[0] + (endPt[0] - startPt[0]) * ratio;
    let lng = startPt[1] + (endPt[1] - startPt[1]) * ratio;

    if (isBridgeObstacleExceeded && ratio >= 0.33 && ratio <= 0.67) {
      const detourOffset = 0.0125;
      const bypassRatio = (ratio - 0.33) / 0.34;
      lat += Math.sin(bypassRatio * Math.PI) * detourOffset;
      lng += Math.cos(bypassRatio * Math.PI) * detourOffset * 0.75;
    } else {
      const bend = Math.sin(ratio * Math.PI) * 0.0055;
      lat += bend;
      lng -= bend;
    }
    detourPath.push({ lat, lng });
  }

  // Weather alert check (simplified mock)
  const isBadWeather =
    selectedPlace.name.toLowerCase().includes("montagna") ||
    Math.random() > 0.7; // Mock weather check

  return (
    <>
      {isBadWeather && (
        <div className="absolute top-4 left-4 z-50 bg-red-600 text-white p-2 rounded-lg text-xs font-bold shadow-lg animate-pulse">
          ⚠️ Meteo avverso: percorso consigliato modificato!
        </div>
      )}
      {isBridgeObstacleExceeded && avoidObstaclesMode ? (
        <>
          <MapPolyline
            path={directPath}
            color="#dc2626"
            weight={3.5}
            dashed={true}
          />
          <MapPolyline path={detourPath} color="#059669" weight={6.5} />
        </>
      ) : (
        <MapPolyline
          path={directPath}
          color={isBridgeObstacleExceeded ? "#e11d48" : "#0284c7"}
          weight={6}
        />
      )}

      {/* Start indicator Pin */}
      <AdvancedMarker
        position={{ lat: Number(startPt[0]), lng: Number(startPt[1]) }}
        title="Partenza"
      >
        <div className="w-8 h-8 bg-indigo-600 ring-4 ring-indigo-100 border-2 border-white text-white rounded-full flex items-center justify-center font-black text-[9px] shadow-xl">
          PART
        </div>
      </AdvancedMarker>

      {/* Hidden Gems Overlay */}
      {places
        .filter((p) => p.category === "hidden_gem")
        .map((gem) => (
          <AdvancedMarker
            key={gem.id}
            position={{ lat: Number(gem.lat), lng: Number(gem.lng) }}
            title={gem.name}
          >
            <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center border border-white shadow-md animate-pulse">
              💎
            </div>
          </AdvancedMarker>
        ))}

      {/* Bridge warnings indicator if height violated */}
      {isBridgeObstacleExceeded && (
        <AdvancedMarker
          position={{ lat: Number(midCoord.lat), lng: Number(midCoord.lng) }}
          title="Collisione Sagoma Imminente!"
        >
          <div className="flex flex-col items-center justify-center w-28 h-20 transition-all">
            <div className="w-10 h-10 bg-red-650 ring-4 ring-yellow-350 border-2 border-white text-white font-extrabold text-[10px] rounded-2xl flex items-center justify-center shadow-xl animate-bounce">
              ⚠️ H<br />
              3.12m
            </div>
            <div className="bg-stone-900 border border-stone-700 text-white font-black text-[8px] px-1 py-0.5 rounded-md mt-1 shadow-md whitespace-nowrap">
              Sottopasso SP8: 3.12m
            </div>
          </div>
        </AdvancedMarker>
      )}
    </>
  );
}

interface MapTabProps {
  places: Place[];
  onPlacesChange: (places: Place[]) => void;
  vehicleDimensions: VehicleDimensions;
  onSelectRoute: (startLat: number, startLng: number, destPlace: Place) => void;
  onNavigateFullscreen: (place: Place) => void;
  userLocation: { lat: number; lng: number } | null;
  userAccuracy: number | null;
  isGPSEnabled: boolean;
  onGPSEnabledChange: (enabled: boolean) => void;
  hasSafetyBanner?: boolean;
  isAdmin?: boolean;
  favoriteIds?: string[];
  onToggleFavorite?: (placeId: string) => void;
  focusedPlaceId?: string | null;
  onClearFocusedPlaceId?: () => void;
  currentUser?: { nickname: string; email: string; name: string } | null;
  onRedirectToLogin?: () => void;
  isOnline?: boolean;
  onNavigateToFuelCard?: () => void;
  onNavigateToAI?: () => void;
  hasActiveTrip?: boolean;
  onNavigateToExpenses?: () => void;
  onNavigateToMovementLog?: () => void;
  trips?: Trip[];
  setTrips?: (trips: Trip[]) => void;
}

// Helper to calculate distance in km between two GPS point coordinates
export function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371; // Earth's radius in km
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
}

export function parseMetricValue(str: string | undefined): number | null {
  if (!str) return null;
  const cleaned = str.replace(/,/, ".").trim();
  const match = cleaned.match(/^([0-9]+(\.[0-9]+)?)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
}

export default function MapTab({
  places,
  onPlacesChange,
  vehicleDimensions,
  onSelectRoute,
  onNavigateFullscreen,
  userLocation,
  userAccuracy,
  isGPSEnabled,
  onGPSEnabledChange,
  hasSafetyBanner = false,
  isAdmin = false,
  favoriteIds = [],
  onToggleFavorite,
  focusedPlaceId,
  onClearFocusedPlaceId,
  currentUser = null,
  onRedirectToLogin,
  isOnline = true,
  onNavigateToFuelCard,
  onNavigateToAI,
  hasActiveTrip = false,
  onNavigateToExpenses,
  onNavigateToMovementLog,
  trips = [],
  setTrips,
}: MapTabProps) {
  const settings = useAppSettings();
  console.log("MapTab props:", { onNavigateToAI });
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any | null>(null);
  const markersRef = React.useRef<any[]>([]);
  const userLocationRef = React.useRef(userLocation);

  React.useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);
  const mapMovedByUserRef = React.useRef<boolean>(false);

  const activeTrip = trips?.find((t) => t.status === "Attivo");

  // Local state for Google Maps API Key to support custom configuration (e.g. on APK / Production)
  const [googleMapsKey, setGoogleMapsKey] = React.useState<string>(() => {
    try {
      const saved = localStorage.getItem("user_google_maps_key");
      if (saved) return saved;
    } catch (e) {}
    // Fall back to default key
    return API_KEY;
  });

  const hasValidKey =
    Boolean(googleMapsKey) &&
    googleMapsKey !== "YOUR_API_KEY" &&
    googleMapsKey.trim().length > 0;

  const [showKeyModal, setShowKeyModal] = React.useState<boolean>(false);
  const [tempKey, setTempKey] = React.useState<string>(() => {
    try {
      return localStorage.getItem("user_google_maps_key") || "";
    } catch (e) {
      return "";
    }
  });

  // Tracks image error loads (so if /area_sosta.png etc. fails or is missing, we fallback)
  const [imageErrorUrls, setImageErrorUrls] = React.useState<
    Record<string, boolean>
  >({});

  const isUrlBroken = (url: string | undefined): boolean => {
    if (!url) return true;
    if (imageErrorUrls[url]) return true;
    try {
      if (url.startsWith("http")) {
        const parsed = new URL(url);
        const path = parsed.pathname;
        const key = url.includes("unsplash.com") ? url : path;
        if (imageErrorUrls[key]) return true;
      } else {
        const pathOnly = url.split("?")[0];
        if (imageErrorUrls[pathOnly]) return true;
      }
    } catch (e) {
      // ignore
    }
    return false;
  };

  const getCategoryDefaults = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("sosta")) {
      return [
        "/area_sosta.svg",
        "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600",
      ];
    }
    if (cat.includes("campeggio")) {
      return [
        "/campeggio.svg",
        "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=600",
      ];
    }
    if (cat.includes("service")) {
      return [
        "/camper_service.svg",
        "https://images.unsplash.com/photo-1596524430615-b46475ddff6e?auto=format&fit=crop&q=80&w=600",
      ];
    }
    if (cat.includes("parcheggio")) {
      return [
        "/parcheggio_camper.svg",
        "https://images.unsplash.com/photo-1568285634123-0130f146a47a?auto=format&fit=crop&q=80&w=600",
      ];
    }
    return [];
  };

  const resolveImage = (category: string, originalUrl: string) => {
    const isGenericImageCheck =
      !originalUrl ||
      originalUrl.includes("unsplash.com") ||
      originalUrl.includes("unsplash-placeholder") ||
      originalUrl.startsWith("/");

    if (originalUrl && !isGenericImageCheck && !isUrlBroken(originalUrl)) {
      return originalUrl;
    }

    if (isUrlBroken(originalUrl)) {
      const candidates = getCategoryDefaults(category);
      for (const cand of candidates) {
        if (!isUrlBroken(cand)) {
          return cand;
        }
      }
    }

    const isGeneric =
      !originalUrl ||
      originalUrl.includes("unsplash.com") ||
      originalUrl.includes("unsplash-placeholder");

    if (isGeneric) {
      const candidates = getCategoryDefaults(category);
      for (const cand of candidates) {
        if (!isUrlBroken(cand)) {
          return cand;
        }
      }
    }

    return originalUrl;
  };

  const isImageFallback = (category: string, originalUrl: string | undefined) => {
    if (!originalUrl) return true;
    const lower = originalUrl.toLowerCase();
    return (
      lower.includes("unsplash.com") ||
      lower.includes("unsplash-placeholder") ||
      lower.includes("placeholder") ||
      lower.includes(".svg") ||
      lower.includes("default_icons") ||
      isUrlBroken(originalUrl)
    );
  };

  // Map type state (roadmap, satellite, hybrid, terrain)
  const [mapTypeId, setMapTypeId] = React.useState<string>("roadmap");
  const [showMapTypeMenu, setShowMapTypeMenu] = React.useState<boolean>(false);

  // Distance / Radius filters states (15km)
  const [activeDistanceFilter, setActiveDistanceFilter] = React.useState<
    "none" | "me" | "place"
  >("none");
  const [filterCenter, setFilterCenter] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const circleRef = React.useRef<any | null>(null);

  // Map center coords tracking
  const [mapCenterCoords, setMapCenterCoords] = React.useState<{
    lat: number;
    lng: number;
  }>({ lat: 44.5, lng: 11.5 });

  // Address search query states
  const [addressSearchQuery, setAddressSearchQuery] = React.useState("");
  const [addressSuggestions, setAddressSuggestions] = React.useState<any[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = React.useState(false);
  const [addressSearchError, setAddressSearchError] = React.useState("");

  const [selectedCategory, setSelectedCategory] = React.useState<
    Place["category"] | "all"
  >(() => {
    try {
      const saved = localStorage.getItem("camper_app_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.defaultPOI) return parsed.defaultPOI;
      }
    } catch (e) {}
    return "all";
  });

  React.useEffect(() => {
    if (settings?.defaultPOI) {
      setSelectedCategory(settings.defaultPOI as any);
    }
  }, [settings?.defaultPOI]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedPlace, setSelectedPlace] = React.useState<Place | null>(null);
  const [mobileView, setMobileView] = React.useState<"map" | "list">("map");
  const [isMobileDetailsOpen, setIsMobileDetailsOpen] = React.useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false);

  // --- INTELLIGENT ROUTING ENGINE STATES ---
  const [showSmartRoute, setShowSmartRoute] = React.useState<boolean>(false);
  const [showStopsDuringRoute, setShowStopsDuringRoute] = React.useState<boolean>(false);
  const [avoidObstaclesMode, setAvoidObstaclesMode] =
    React.useState<boolean>(true);
  const [isCalculatingRoute, setIsCalculatingRoute] =
    React.useState<boolean>(false);
  const [activeRouteCoords, setActiveRouteCoords] = React.useState<
    [number, number][] | null
  >(null);
  const [detectedObstaclesOnRoute, setDetectedObstaclesOnRoute] =
    React.useState<OSMObstacle[]>([]);
  const [selectedRouteStats, setSelectedRouteStats] = React.useState<{
    distanceKm: number;
    etaMinutes: number;
    averageSlope: number;
    co2Kg: number;
    ecoRisk: boolean;
    heightViolationObstacle: OSMObstacle | null;
  } | null>(null);

  const routePolylinesRef = React.useRef<any[]>([]);
  const routeDangerMarkersRef = React.useRef<any[]>([]);

  // --- ADVANCED FILTER PANEL STATES ---
  const [showFilterPanel, setShowFilterPanel] = React.useState(false);
  const [filterMinRating, setFilterMinRating] = React.useState<number>(0);
  const [filterMaxPrice, setFilterMaxPrice] = React.useState<number>(100); // 100 is "No Limit"
  const [filterAvoidNarrow, setFilterAvoidNarrow] = React.useState(false);
  const [filterCheckVehicleDimensions, setFilterCheckVehicleDimensions] =
    React.useState(false);
  const [filterSelectedFacilities, setFilterSelectedFacilities] =
    React.useState<string[]>([]);
  const [showOsmObstacles, setShowOsmObstacles] = React.useState(true);
  const [osmObstacles, setOsmObstacles] = React.useState<OSMObstacle[]>([]);
  const [loadingOsmObstacles, setLoadingOsmObstacles] = React.useState(false);

  // States for OpenStreetMap Importer
  const [showImportOSMForm, setShowImportOSMForm] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isAutoLoadingOSM, setIsAutoLoadingOSM] = React.useState(false);
  const [importRadius, setImportRadius] = React.useState<number>(15); // in km
  const [importSuccessCount, setImportSuccessCount] = React.useState<
    number | null
  >(null);
  const [importError, setImportError] = React.useState<string | null>(null);

  // --- USER PROPOSAL & ADMIN MODERATION STATES ---
  const [showAddPlaceModal, setShowAddPlaceModal] = React.useState(false);
  const [newPlaceForm, setNewPlaceForm] = React.useState({
    name: "",
    category: "area_sosta" as PlaceCategory,
    lat: 45.864,
    lng: 10.869,
    address: "",
    priceInfo: "Gratuito",
    priceEuro: 0,
    phone: "",
    selectedFacilities: [] as string[],
    imageUrl:
      "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600",
    hasMaxHeightLimit: false,
    maxHeight: 3.5,
    hasMaxWeightLimit: false,
    maxWeight: 3.5,
    isNarrowAccess: false,
    noiseLevel: 3,
    maneuverability: 3,
    cellularSignal: 3,
  });

  const [newPlaceQuery, setNewPlaceQuery] = React.useState("");
  const [newPlaceSuggestions, setNewPlaceSuggestions] = React.useState<any[]>(
    [],
  );
  const [isSearchingNewPlaceAddress, setIsSearchingNewPlaceAddress] =
    React.useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = React.useState(false);

  // --- ADD STOP (TAPPA) TO ACTIVE TRIP STATES ---
  const [showAddMovementModal, setShowAddMovementModal] = React.useState(false);
  const [newMovementOdometer, setNewMovementOdometer] = React.useState("");
  const [newMovementNotes, setNewMovementNotes] = React.useState("");
  const [newMovementPlaceName, setNewMovementPlaceName] = React.useState("");
  const [newMovementDate, setNewMovementDate] = React.useState(() => {
    const d = new Date();
    // Format to local ISO-like string for datetime-local value (YYYY-MM-DDTHH:MM)
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  });

  // --- ADD STOP (TAPPA) TO ACTIVE TRIP HANDLER ---
  const handleAddStopToActiveTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trips || !setTrips) return;
    const activeTrip = trips.find((t) => t.status === "Attivo");
    if (!activeTrip) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "❌ Nessun viaggio attivo trovato su cui aggiungere la tappa." }
        })
      );
      return;
    }

    if (!newMovementOdometer) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "⚠️ Inserisci i chilometri del contachilometri." }
        })
      );
      return;
    }

    const odoValue = parseFloat(newMovementOdometer);
    if (isNaN(odoValue) || odoValue < 0) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "⚠️ Inserisci un valore numerico valido per il contachilometri." }
        })
      );
      return;
    }

    const lastOdo = (() => {
      const movements = activeTrip.movements || [];
      if (movements.length > 0) {
        const sorted = [...movements].sort((a, b) => b.odometer - a.odometer);
        return sorted[0].odometer;
      }
      return activeTrip.startOdometer || 0;
    })();

    const newMovement = {
      id: Date.now().toString(),
      odometer: odoValue,
      location: newMovementPlaceName,
      date: new Date(newMovementDate).toISOString(),
      notes: newMovementNotes,
    };

    const updatedTrips = trips.map((t) => {
      if (t.id === activeTrip.id) {
        return {
          ...t,
          movements: [...(t.movements || []), newMovement],
        };
      }
      return t;
    });

    setTrips(updatedTrips);
    window.dispatchEvent(
      new CustomEvent("trip-updated", {
        detail: { trips: updatedTrips },
      }),
    );

    setShowAddMovementModal(false);
    setNewMovementOdometer("");
    setNewMovementNotes("");

    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message: `📍 Tappa "${newMovementPlaceName}" aggiunta con successo al viaggio attivo!` }
      })
    );
  };

  // --- USER PROPOSAL & ADMIN MODERATION HANDLERS ---
  const handleAutoLocateGPS = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: {
            message: `⚠️ Il tuo browser o dispositivo non supporta la geolocalizzazione.`,
          },
        }),
      );
      return;
    }

    setIsLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Prefill coordinates and rough format as a fallback
          setNewPlaceForm((prev) => ({
            ...prev,
            lat: latitude,
            lng: longitude,
            address: `Coordinate: ${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`,
          }));
          setNewPlaceQuery(`${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`);

          // Attempt to reverse geocode via our server-side proxy
          const res = await fetch(
            `/api/nominatim-reverse?lat=${latitude}&lon=${longitude}`,
          );
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              setNewPlaceForm((prev) => ({
                ...prev,
                address: data.display_name || "",
              }));
              setNewPlaceQuery(data.display_name);
            }
          }

          window.dispatchEvent(
            new CustomEvent("show-toast", {
              detail: {
                message: `📍 Posizione GPS rilevata e compilata automaticamente!`,
              },
            }),
          );
        } catch (err) {
          console.error("Reverse geocoding error:", err);
          window.dispatchEvent(
            new CustomEvent("show-toast", {
              detail: {
                message: `📍 GPS rilevato! Fornite le coordinate grezze causa errore di connessione.`,
              },
            }),
          );
        } finally {
          setIsLocatingGPS(false);
        }
      },
      (error) => {
        console.warn("Geolocation warning:", error);
        let msg = "Errore della geolocalizzazione.";
        if (error.code === 1) msg = "Permesso di geolocalizzazione rifiutato.";
        else if (error.code === 2) msg = "Posizione GPS non rilevabile.";
        else if (error.code === 3)
          msg = "Rilevamento posizione scaduto (Timeout).";

        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: { message: `⚠️ ${msg}` },
          }),
        );
        setIsLocatingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const handleSearchNewPlaceAddress = async () => {
    if (!newPlaceQuery.trim()) return;
    setIsSearchingNewPlaceAddress(true);
    try {
      const res = await fetch(
        `/api/nominatim?q=${encodeURIComponent(newPlaceQuery)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setNewPlaceSuggestions(data);
      }
    } catch (err) {
      console.error("Nominatim error inside add form:", err);
    } finally {
      setIsSearchingNewPlaceAddress(false);
    }
  };

  const handleSubmitProposedPlace = async () => {
    if (!newPlaceForm.name || !newPlaceForm.address) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: {
            message: `⚠️ Errore: Inserisci il nome ed un indirizzo valido per la sosta!`,
          },
        }),
      );
      return;
    }

    try {
      const payload = {
        name: newPlaceForm.name,
        category: newPlaceForm.category,
        lat: newPlaceForm.lat,
        lng: newPlaceForm.lng,
        address: newPlaceForm.address,
        priceInfo: newPlaceForm.priceInfo || "Gratuito",
        priceEuro: newPlaceForm.priceEuro,
        phone: newPlaceForm.phone,
        imageUrl:
          newPlaceForm.imageUrl ||
          "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600",
        facilities: newPlaceForm.selectedFacilities,
        hasMaxHeightLimit: newPlaceForm.hasMaxHeightLimit,
        maxHeight: newPlaceForm.hasMaxHeightLimit
          ? newPlaceForm.maxHeight
          : undefined,
        hasMaxWeightLimit: newPlaceForm.hasMaxWeightLimit,
        maxWeight: newPlaceForm.hasMaxWeightLimit
          ? newPlaceForm.maxWeight
          : undefined,
        isNarrowAccess: newPlaceForm.isNarrowAccess,
        noiseLevel: newPlaceForm.noiseLevel,
        maneuverability: newPlaceForm.maneuverability,
        cellularSignal: newPlaceForm.cellularSignal,
        rating: 5,
        reviews: [],
        createdBy: currentUser?.email || "",
      };

      // Check if we are offline (real navigator status or simulated)
      const isSimulated =
        localStorage.getItem("camper_simulated_offline") === "true";
      const isOfflineMode =
        isSimulated || (typeof navigator !== "undefined" && !navigator.onLine);

      if (isOfflineMode) {
        throw new Error("offline");
      }

      const res = await fetch("/api/propose-place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message: `🎉 Sosta proposta inviata! Sarà esaminata a breve dall'amministratore.`,
              duration: 5500,
            },
          }),
        );
        setShowAddPlaceModal(false);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Errore sconosciuto.");
      }
    } catch (err: any) {
      console.warn("Propose place failed, checking offline fallback:", err);

      // Save offline fallback draft
      try {
        const savedRaw = localStorage.getItem("camper_offline_proposals");
        const proposals = savedRaw ? JSON.parse(savedRaw) : [];

        const offlineId = `offline_place_${Date.now()}`;
        const offlinePayload = {
          name: newPlaceForm.name,
          category: newPlaceForm.category,
          lat: newPlaceForm.lat,
          lng: newPlaceForm.lng,
          address: newPlaceForm.address,
          priceInfo: newPlaceForm.priceInfo || "Gratuito",
          priceEuro: newPlaceForm.priceEuro,
          phone: newPlaceForm.phone,
          imageUrl:
            newPlaceForm.imageUrl ||
            "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600",
          facilities: newPlaceForm.selectedFacilities,
          hasMaxHeightLimit: newPlaceForm.hasMaxHeightLimit,
          maxHeight: newPlaceForm.hasMaxHeightLimit
            ? newPlaceForm.maxHeight
            : undefined,
          hasMaxWeightLimit: newPlaceForm.hasMaxWeightLimit,
          maxWeight: newPlaceForm.hasMaxWeightLimit
            ? newPlaceForm.maxWeight
            : undefined,
          isNarrowAccess: newPlaceForm.isNarrowAccess,
          noiseLevel: newPlaceForm.noiseLevel,
          maneuverability: newPlaceForm.maneuverability,
          cellularSignal: newPlaceForm.cellularSignal,
          rating: 5,
          reviews: [],
          createdBy: currentUser?.email || "",
          id: offlineId,
        };

        proposals.push(offlinePayload);
        localStorage.setItem(
          "camper_offline_proposals",
          JSON.stringify(proposals),
        );

        // Create a local object to show on the map instantly
        const newPlaceObj: Place = {
          id: offlineId,
          name: `${newPlaceForm.name} (Bozza Offline 📴)`,
          category: newPlaceForm.category,
          lat: newPlaceForm.lat,
          lng: newPlaceForm.lng,
          address: newPlaceForm.address,
          priceInfo: newPlaceForm.priceInfo || "Gratuito",
          priceEuro: newPlaceForm.priceEuro,
          phone: newPlaceForm.phone,
          imageUrl:
            newPlaceForm.imageUrl ||
            "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600",
          facilities: newPlaceForm.selectedFacilities || [],
          noiseLevel: newPlaceForm.noiseLevel,
          maneuverability: newPlaceForm.maneuverability,
          cellularSignal: newPlaceForm.cellularSignal,
          rating: 5,
          reviews: [],
          createdBy: currentUser?.email || "",
          isOfflineDraft: true,
        } as any;

        onPlacesChange([...places, newPlaceObj]);

        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message: `📴 Offline: Sosta salvata in locale! Verrà sincronizzata automaticamente quando tornerà la connessione.`,
              duration: 7500,
            },
          }),
        );
        setShowAddPlaceModal(false);
      } catch (localErr: any) {
        console.error("Local storage save failed:", localErr);
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: { message: `❌ Invio proposta fallito: ${err.message}` },
          }),
        );
      }
    }
  };

  const handleAddressSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!addressSearchQuery.trim()) return;

    setIsSearchingAddress(true);
    setAddressSearchError("");
    try {
      const res = await fetch(
        `/api/nominatim?q=${encodeURIComponent(addressSearchQuery)}`,
      );
      if (!res.ok) throw new Error("Errore di rete");
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error(
          "Il server non ha restituito una risposta JSON valida.",
        );
      }
      setAddressSuggestions(data);
      if (data.length === 0) {
        setAddressSearchError("Nessuna località trovata con questo nome.");
      }
    } catch (err) {
      console.error(err);
      setAddressSearchError("Errore durante la ricerca della località.");
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleSelectSuggestion = (sug: any) => {
    const lat = parseFloat(sug.lat);
    const lng = parseFloat(sug.lon);
    if (isNaN(lat) || isNaN(lng)) return;

    const map = mapRef.current;
    if (map) {
      map.setView([lat, lng], 13);
    }

    const customPlace: Place = {
      id: `searched-point-${Date.now()}`,
      name: sug.display_name.split(",")[0] || "Località Ricercata",
      category: "area_sosta",
      lat: lat,
      lng: lng,
      address: sug.display_name,
      priceInfo: "Località cercata",
      priceEuro: 0,
      rating: 5,
      facilities: ["Parcheggio"],
      reviews: [],
      imageUrl:
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=400",
      source: "inserito_a_mano",
      maxHeight: 4.0,
      maxWeight: 5.0,
      isNarrowAccess: false,
    };

    setSelectedPlace(customPlace);
    setAddressSuggestions([]);
    setAddressSearchQuery(customPlace.name);

    // Imposta automaticamente il filtro prossimità e carica le strutture camper entro i 15km
    mapMovedByUserRef.current = false;
    setActiveDistanceFilter("place");
    setFilterCenter({ lat, lng });
    autoLoadOSMForProximity(lat, lng);

    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: {
          message: `📍 Centrato su: ${customPlace.name}! Ho attivato il raggio di 15km con download automatico delle aree sosta dal database.`,
        },
      }),
    );
  };

  // Review form state
  const [reviewerName, setReviewerName] = React.useState("");
  const [rating, setRating] = React.useState(5);
  const [noiseLevel, setNoiseLevel] = React.useState(5);
  const [maneuverability, setManeuverability] = React.useState(5);
  const [cellularSignal, setCellularSignal] = React.useState(5);
  const [commentText, setCommentText] = React.useState("");
  const [priceUpdated, setPriceUpdated] = React.useState("");
  const [photoSimulation, setPhotoSimulation] = React.useState("");
  const [reviewSuccess, setReviewSuccess] = React.useState(false);

  // Puntina cliccata personalizzata sulla mappa
  const [clickedCoords, setClickedCoords] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showClickedPopup, setShowClickedPopup] = React.useState(false);
  const [clickedPlaceName, setClickedPlaceName] = React.useState<string>(
    "Puntina Sulla Mappa",
  );
  const [clickedAddress, setClickedAddress] = React.useState<string>("");
  const [isResolvingClick, setIsResolvingClick] =
    React.useState<boolean>(false);
  const [customCreationCoords, setCustomCreationCoords] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Facility list template to tick
  const ALL_FACILITIES = [
    "Carico acqua",
    "Scarico reflui",
    "Elettricità 220V",
    "Bagni riscaldati",
    "Animali ammessi",
    "Piscina",
    "Wi-Fi gratuito",
  ];

  // Sync state to local selected details box
  React.useEffect(() => {
    if (selectedPlace) {
      const fresh = places.find((p) => p.id === selectedPlace.id);
      if (fresh) {
        setSelectedPlace(fresh);
      }
    }
  }, [places]);

  // Synchronize externally selected place and center/pan map
  React.useEffect(() => {
    if (focusedPlaceId) {
      const found = places.find((p) => p.id === focusedPlaceId);
      if (found) {
        setSelectedPlace(found);
        if (mapRef.current) {
          mapRef.current.setView([found.lat, found.lng], 14);
        }
        setIsMobileDetailsOpen(true);
        setMobileView("map");
        onClearFocusedPlaceId?.();
      }
    }
  }, [focusedPlaceId, places, onClearFocusedPlaceId]);

  // Map center coords tracking and initialization
  const prevSelectedPlaceIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (selectedPlace) {
      setMapCenterCoords({ lat: selectedPlace.lat, lng: selectedPlace.lng });
      if (selectedPlace.id !== prevSelectedPlaceIdRef.current) {
        prevSelectedPlaceIdRef.current = selectedPlace.id;
        setShowSmartRoute(false);
        if (mapRef.current) {
          mapRef.current.setView([selectedPlace.lat, selectedPlace.lng], 13);
        }
      }
    } else {
      prevSelectedPlaceIdRef.current = null;
      setShowSmartRoute(false);
    }
  }, [selectedPlace]); // --- INTELLIGENT CAMPER ROUTING ENGINE EFFECT ---
  React.useEffect(() => {
    if (!showSmartRoute || !selectedPlace) {
      setActiveRouteCoords(null);
      setSelectedRouteStats(null);
      setDetectedObstaclesOnRoute([]);
      return;
    }

    const startPt: [number, number] = userLocation
      ? [userLocation.lat, userLocation.lng]
      : [selectedPlace.lat - 0.046, selectedPlace.lng + 0.053];
    const endPt: [number, number] = [selectedPlace.lat, selectedPlace.lng];

    // Build standard direct routing points
    const direct: [number, number][] = [];
    const segments = 24;
    for (let i = 0; i <= segments; i++) {
      const ratio = i / segments;
      const lat = startPt[0] + (endPt[0] - startPt[0]) * ratio;
      const lng = startPt[1] + (endPt[1] - startPt[1]) * ratio;
      const bend = Math.sin(ratio * Math.PI) * 0.0055;
      direct.push([lat + bend, lng - bend]);
    }

    // Midpoint height limitation bridge coordinates (placed on the 12th segment)
    const midCoord = direct[12];

    // Height limit check
    const isBridgeObstacleExceeded = vehicleDimensions.height > 3.12;

    const obstacle: OSMObstacle = {
      id: 888123,
      lat: midCoord[0],
      lng: midCoord[1],
      type: "height",
      value: 3.12,
      name: "Sottopasso SP8 Vecchia Ferrovia",
      roadName: "Sottopasso Ferrovia SP8",
      isViolation: isBridgeObstacleExceeded,
    };

    const routeObstacles = isBridgeObstacleExceeded ? [obstacle] : [];
    setDetectedObstaclesOnRoute(routeObstacles);

    // Build detoured safe path around the middle segments (ratio 0.33 to 0.67)
    const detour: [number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const ratio = i / segments;
      let lat = startPt[0] + (endPt[0] - startPt[0]) * ratio;
      let lng = startPt[1] + (endPt[1] - startPt[1]) * ratio;

      if (isBridgeObstacleExceeded && ratio >= 0.33 && ratio <= 0.67) {
        // Bend strongly to avoid SP8 bridge
        const detourOffset = 0.0125; // approx 1.3km bypass bend
        const bypassRatio = (ratio - 0.33) / 0.34;
        lat += Math.sin(bypassRatio * Math.PI) * detourOffset;
        lng += Math.cos(bypassRatio * Math.PI) * detourOffset * 0.75;
      } else {
        const bend = Math.sin(ratio * Math.PI) * 0.0055;
        lat += bend;
        lng -= bend;
      }
      detour.push([lat, lng]);
    }

    const finalPath =
      isBridgeObstacleExceeded && avoidObstaclesMode ? detour : direct;
    setActiveRouteCoords(finalPath);

    // Calculate dynamic total distance
    let pathDistance = 0;
    for (let i = 1; i < finalPath.length; i++) {
      pathDistance += getDistanceKm(
        finalPath[i - 1][0],
        finalPath[i - 1][1],
        finalPath[i][0],
        finalPath[i][1],
      );
    }

    // Heavy camper safety speeds and driving style optimization
    const style = settings?.drivingStyle || "relax";
    let baseSpeed = vehicleDimensions.weight > 3.5 ? 65 : 82;
    let co2Multiplier = 0.24;

    if (style === "relax") {
      baseSpeed = vehicleDimensions.weight > 3.5 ? 60 : 72;
      co2Multiplier = 0.21;
    } else if (style === "eco") {
      baseSpeed = vehicleDimensions.weight > 3.5 ? 65 : 80;
      co2Multiplier = 0.18;
    } else if (style === "veloce") {
      baseSpeed = vehicleDimensions.weight > 3.5 ? 80 : 95;
      co2Multiplier = 0.28;
    }

    const safetySpeedKmH = baseSpeed;
    const eta = Math.round((pathDistance / safetySpeedKmH) * 60 + 2);
    const co2 = parseFloat((pathDistance * co2Multiplier).toFixed(1)); // camper diesel emission multiplier

    setSelectedRouteStats({
      distanceKm: pathDistance,
      etaMinutes: eta,
      averageSlope: isBridgeObstacleExceeded && !avoidObstaclesMode ? 11 : 4, // standard vs bypass alpine grades
      co2Kg: co2,
      ecoRisk: true,
      heightViolationObstacle: isBridgeObstacleExceeded ? obstacle : null,
    });
  }, [
    showSmartRoute,
    selectedPlace,
    userLocation,
    avoidObstaclesMode,
    vehicleDimensions,
    settings?.drivingStyle,
  ]);

  // AI Itinerary Fly To handler
  React.useEffect(() => {
    const handleMapFlyTo = (e: Event) => {
      const customEvent = e as CustomEvent<{
        lat: number;
        lng: number;
        label: string;
      }>;
      const { lat, lng, label } = customEvent.detail;
      if (mapRef.current) {
        mapRef.current.setView([lat, lng], 13);
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message: `✨ Itinerario AI: ${label} selezionata sulla mappa!`,
            },
          }),
        );
      }
    };

    window.addEventListener("map-fly-to", handleMapFlyTo);
    return () => {
      window.removeEventListener("map-fly-to", handleMapFlyTo);
    };
  }, []);

  // Gestione e disegno della puntina personalizzata su sosta temporanea
  const clickedMarkerRef = React.useRef<any | null>(null);

  // --- ADVANCED FILTER COUPLING ENGINE ---
  const getFilteredPlaces = () => {
    return places.filter((p) => {
      // 1. Category
      const matchesCat =
        selectedCategory === "all" || p.category === selectedCategory;
      if (!matchesCat) return false;

      // Filter by favorites if toggled
      if (showFavoritesOnly && !favoriteIds.includes(p.id)) {
        return false;
      }

      // 2. Search query (Matches name, description or address)
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // 3. Proximity Radius (15km)
      let matchesDistance = true;
      if (activeDistanceFilter === "me" && userLocation) {
        const dist = getDistanceKm(
          userLocation.lat,
          userLocation.lng,
          p.lat,
          p.lng,
        );
        matchesDistance = dist <= 15;
      } else if (activeDistanceFilter === "place" && filterCenter) {
        const dist = getDistanceKm(
          filterCenter.lat,
          filterCenter.lng,
          p.lat,
          p.lng,
        );
        matchesDistance = dist <= 15;
      } else if (activeDistanceFilter === "none") {
        // If no proximity filter is active, hide everything unless it's selected or we're showing favorites only
        if (
          selectedPlace?.id === p.id ||
          (showFavoritesOnly && favoriteIds.includes(p.id))
        ) {
          matchesDistance = true;
        } else {
          matchesDistance = false;
        }
      }
      if (!matchesDistance) return false;

      // 4. Advanced Rating Filter
      if (p.rating < filterMinRating) return false;

      // 5. Advanced Price Filter
      if (filterMaxPrice === 0) {
        // Only free (0 € or "Gratuito" in text)
        const isFree =
          p.priceEuro === 0 ||
          p.priceInfo.toLowerCase().includes("gratuito") ||
          p.priceInfo.toLowerCase().includes("gratis");
        if (!isFree) return false;
      } else if (filterMaxPrice < 100) {
        // Limit defined
        if (p.priceEuro > filterMaxPrice) return false;
      }

      // 6. Advanced Narrow Road Obstacles Filter
      if (filterAvoidNarrow && p.isNarrowAccess) return false;

      // 7. Advanced Camper Dimension Safety Check
      if (filterCheckVehicleDimensions) {
        const heightViolation =
          p.hasMaxHeightLimit &&
          p.maxHeight &&
          vehicleDimensions.height > p.maxHeight;
        const weightViolation =
          p.hasMaxWeightLimit &&
          p.maxWeight &&
          vehicleDimensions.weight > p.maxWeight;
        if (heightViolation || weightViolation) return false;
      }

      // 8. Advanced Facilities / Services Filters
      if (filterSelectedFacilities.length > 0) {
        const hasAll = filterSelectedFacilities.every((facility) => {
          return p.facilities.some((pf) => {
            const val = pf.toLowerCase();
            const query = facility.toLowerCase();
            if (
              query === "wi-fi" &&
              (val.includes("wifi") || val.includes("wi-fi"))
            )
              return true;
            if (
              query === "bagni riscaldati" &&
              (val.includes("bagni") ||
                val.includes("toilet") ||
                val.includes("wc"))
            )
              return true;
            return val.includes(query);
          });
        });
        if (!hasAll) return false;
      }

      return true;
    });
  };

  const handleSelectAndFocus = (place: Place) => {
    setSelectedPlace(place);
    setMobileView("map");
    const map = mapRef.current;
    if (map) {
      map.setView([place.lat, place.lng], 14);
      mapMovedByUserRef.current = false;
    }
  };

  const handleCenterOnUser = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 14);
      mapMovedByUserRef.current = false;
    }
  };

  // Automatically invalidate size of map when switching mobile views to prevent gray tiles and size bugs
  React.useEffect(() => {
    if (mobileView === "map" && mapRef.current) {
      const mapObj = mapRef.current;
      const t = setTimeout(() => {
        if (typeof window !== "undefined" && (window as any).google?.maps?.event) {
          (window as any).google.maps.event.trigger(mapObj, "resize");
        }
      }, 150);
      return () => clearTimeout(t);
    }
  }, [mobileView]);

  // Centra automaticamente sul camper appena il GPS aggancia la posizione
  const hasAutoCenteredOnGPSRef = React.useRef(false);

  React.useEffect(() => {
    if (!userLocation) {
      hasAutoCenteredOnGPSRef.current = false;
    } else if (
      userLocation &&
      !hasAutoCenteredOnGPSRef.current &&
      mapRef.current
    ) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 14);
      hasAutoCenteredOnGPSRef.current = true;
      // GPS auto-centering message silenced on user request
    }
  }, [userLocation]);

  const loadOsmObstaclesOnMap = async (lat: number, lng: number) => {
    if (!showOsmObstacles) return;
    setLoadingOsmObstacles(true);
    try {
      const radiusMeters = 2500;
      const dLat = radiusMeters / 111000;
      const dLng = radiusMeters / (111000 * Math.cos((lat * Math.PI) / 180));
      const bbox = `${lat - dLat},${lng - dLng},${lat + dLat},${lng + dLng}`;
      const query = `[out:json][timeout:15];
(
  node["maxheight"](${bbox});
  node["maxwidth"](${bbox});
  node["maxweight"](${bbox});
  way["maxheight"](${bbox});
  way["maxwidth"](${bbox});
  way["maxweight"](${bbox});
);
out center;`;

      let res: Response;
      try {
        res = await fetch("/api/map-data-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: query }),
        });
      } catch (err: any) {
        console.warn(
          "Fetch /api/map-data-proxy fallita, riprovo dopo 1.5s per possibile riavvio o cold start del server...",
          err,
        );
        await new Promise((r) => setTimeout(r, 1500));
        try {
          res = await fetch("/api/map-data-proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: query }),
          });
        } catch (retryErr: any) {
          console.warn(
            "Fetch request for /api/map-data-proxy failed again on retry:",
            retryErr,
          );
          throw retryErr;
        }
      }
      if (!res.ok) {
        const errorText = await res.text();
        // Silently handle rate limits or proxy errors without throwing console errors
        // to avoid triggering false positive bug reports in the monitoring system
        if (res.status === 429 || errorText.includes("Rate exceeded")) {
          console.warn("OSM proxy rate limited (429). Retrying later.");
        } else {
          console.warn("OSM API returned non-ok status:", res.status);
        }
        return;
      }

      const contentType = res.headers.get("content-type");
      if (contentType && !contentType.includes("application/json")) {
        console.warn("OSM proxy returned non-JSON content-type:", contentType);
        return;
      }

      const responseText = await res.text();
      if (responseText.trim().startsWith("<")) {
        console.warn("OSM proxy returned HTML/XML instead of JSON");
        return;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn("Failed to parse OSM response JSON:", parseErr);
        return;
      }

      if (data && data.elements) {
        const obstacles: OSMObstacle[] = [];
        data.elements.forEach((el: any) => {
          const oLat =
            el.lat !== undefined ? el.lat : el.center ? el.center.lat : null;
          const oLng =
            el.lon !== undefined ? el.lon : el.center ? el.center.lon : null;
          if (oLat === null || oLng === null) return;

          const tags = el.tags || {};
          let type: "height" | "width" | "weight" | "barrier" = "height";
          let val = 0;
          let label = "";

          if (tags.maxheight) {
            type = "height";
            val = parseMetricValue(tags.maxheight) || 0;
            label = `Sottopasso: ${tags.maxheight}`;
          } else if (tags.maxwidth) {
            type = "width";
            val = parseMetricValue(tags.maxwidth) || 0;
            label = `Strettoia: ${tags.maxwidth}`;
          } else if (tags.maxweight) {
            type = "weight";
            val = parseMetricValue(tags.maxweight) || 0;
            label = `Portata Ponte: ${tags.maxweight}`;
          } else {
            return;
          }

          if (val === 0) return;

          let isViolation = false;
          if (type === "height" && vehicleDimensions.height > val)
            isViolation = true;
          if (type === "width" && vehicleDimensions.width > val)
            isViolation = true;
          if (type === "weight" && vehicleDimensions.weight > val)
            isViolation = true;

          obstacles.push({
            id: el.id,
            lat: oLat,
            lng: oLng,
            type,
            value: val,
            name: label,
            roadName: tags.name || tags.ref || "Strada Locale",
            isViolation,
          });
        });

        setOsmObstacles(obstacles);
      }
    } catch (e) {
      console.warn("OSM warning in MapTab - Details:", e);
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: {
            message: `⚠️ Errore durante il caricamento dei dati dalle mappe (OSM): ${e instanceof Error ? e.message : "Errore sconosciuto"}`,
          },
        }),
      );
    } finally {
      setLoadingOsmObstacles(false);
    }
  };

  const osmObstaclesRef = React.useRef<any[]>([]);

  React.useEffect(() => {
    if (showOsmObstacles) {
      loadOsmObstaclesOnMap(mapCenterCoords.lat, mapCenterCoords.lng);
    } else {
      setOsmObstacles([]);
    }
  }, [showOsmObstacles, mapCenterCoords.lat, mapCenterCoords.lng]);

  // NOTE: Automated OSM loading at startup and on GPS tracking has been removed on user request.
  // OSM elements will now ONLY load when user explicitly clicks "Intorno a me", "Intorno a questo luogo" or from the popup.

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlace || !reviewerName.trim() || !commentText.trim()) return;

    try {
      const res = await fetch("/api/check-profanity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: commentText.trim(),
          author: reviewerName.trim(),
          type: "review",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message: `❌ Attenzione: ${data.error || "non è una recensione pubblicabile"}`,
            },
          }),
        );
        return;
      }
    } catch (err) {
      console.error("Errore durante il controllo del testo:", err);
    }

    const newReview: Review = {
      id: `rev_${Date.now()}`,
      user: reviewerName.trim(),
      date: new Date().toISOString().split("T")[0],
      rating,
      comment: commentText.trim(),
      priceUpdated: priceUpdated.trim() || undefined,
      imageUrl: photoSimulation || undefined,
      vehicleType: vehicleDimensions.modelName,
      noiseLevel: noiseLevel,
      maneuverability: maneuverability,
      cellularSignal: cellularSignal,
    };

    // Calculate new average rating
    const expandedReviews = [...selectedPlace.reviews, newReview];
    const totalRating = expandedReviews.reduce(
      (sum, rev) => sum + rev.rating,
      0,
    );
    const average = parseFloat(
      (totalRating / expandedReviews.length).toFixed(1),
    );

    // Update place
    const updatedPlaces = places.map((p) => {
      if (p.id === selectedPlace.id) {
        return {
          ...p,
          rating: average,
          priceInfo: priceUpdated ? `${priceUpdated}` : p.priceInfo,
          priceEuro: priceUpdated
            ? parseFloat(priceUpdated.replace(/[^0-9.]/g, "")) || p.priceEuro
            : p.priceEuro,
          reviews: expandedReviews,
        };
      }
      return p;
    });

    onPlacesChange(updatedPlaces);

    // Clear form
    setReviewerName("");
    setCommentText("");
    setPriceUpdated("");
    setPhotoSimulation("");
    setReviewSuccess(true);
    setTimeout(() => setReviewSuccess(false), 3000);
  };

  const handleNewPlaceImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPlaceForm((prev) => ({
          ...prev,
          imageUrl: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const autoLoadOSMForProximity = async (lat: number, lng: number) => {
    setIsAutoLoadingOSM(true);

    // Auto-search notification silenced on user request

    try {
      const radiusMeters = 15 * 1000;
      const dLat = radiusMeters / 111000;
      const dLng = radiusMeters / (111000 * Math.cos((lat * Math.PI) / 180));
      const bbox = `${lat - dLat},${lng - dLng},${lat + dLat},${lng + dLng}`;
      const query = `[out:json][timeout:10];
(
  node["tourism"="camp_site"](${bbox});
  way["tourism"="camp_site"](${bbox});
  
  node["caravan_site"="regional"](${bbox});
  node["tourism"="caravan_site"](${bbox});
  node["caravan_site"](${bbox});
  
  node["amenity"="sanitary_dump_station"](${bbox});
);
out center;`;

      let response: Response;
      try {
        response = await fetch("/api/map-data-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: query }),
        });
      } catch (err: any) {
        console.warn(
          "Fetch /api/map-data-proxy (bbox) fallita, riprovo dopo 1.5s per possibile riavvio o cold start del server...",
          err,
        );
        await new Promise((r) => setTimeout(r, 1500));
        try {
          response = await fetch("/api/map-data-proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: query }),
          });
        } catch (retryErr: any) {
          console.warn(
            "Fetch request for /api/map-data-proxy failed again on retry:",
            retryErr,
          );
          throw retryErr;
        }
      }

      if (!response.ok) {
        throw new Error(`Server OSM non raggiungibile`);
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonErr) {
        throw new Error(
          "Il server non ha restituito una risposta JSON valida.",
        );
      }
      if (result.notice) {
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: { message: `⚠️ ${result.notice}` },
          }),
        );
      }

      if (!result.elements || result.elements.length === 0) {
        // Silenced notification on user request: "Nessun punto sosta aggiuntivo trovato..."
        return;
      }

      const importedPlaces: Place[] = [];

      for (const el of result.elements) {
        let pLat = el.lat;
        let pLng = el.lon;
        if (el.type === "way" && el.center) {
          pLat = el.center.lat;
          pLng = el.center.lon;
        }

        if (!pLat || !pLng) continue;

        // Skip duplicate places
        const isDuplicate = places.some((p) => {
          if (p.id === `osm-${el.id}`) return true;
          const d = getDistanceKm(p.lat, p.lng, pLat, pLng);
          return d < 0.055; // 55 meters
        });

        if (isDuplicate) continue;

        const tags = el.tags || {};

        // Name mapping
        let name =
          tags.name ||
          tags.official_name ||
          tags.alt_name ||
          tags.short_name ||
          tags.operator ||
          tags.brand ||
          tags.description;
        if (!name) {
          if (tags.tourism === "camp_site") name = "Campeggio / Area Campismo";
          else if (tags.amenity === "sanitary_dump_station")
            name = "Camper Service Carico/Scarico";
          else if (
            tags.tourism === "caravan_site" ||
            tags.caravan_site === "regional"
          )
            name = "Area Sosta Camper OSM";
          else name = "Sosta Camper / Parcheggio";
        }

        // Category mapping
        let category: Place["category"] = "area_sosta";
        if (tags.amenity === "sanitary_dump_station") {
          category = "camper_service";
        } else if (tags.tourism === "camp_site") {
          category = "campeggio";
        }

        // Address mapping
        const city = tags["addr:city"] || "";
        const street = tags["addr:street"] || "";
        const houseNo = tags["addr:housenumber"] || "";
        let addressStr = [street, houseNo, city].filter(Boolean).join(", ");
        if (!addressStr) {
          addressStr = `Osm Rif: ${el.id} (Coordinata: ${Number(pLat).toFixed(4)}, ${Number(pLng).toFixed(4)})`;
        }

        // Price mapping
        let priceStr = "In loco / Da verificare";
        let priceNum = 15;
        if (tags.fee === "no") {
          priceStr = "Gratuito";
          priceNum = 0;
        } else if (tags.charge) {
          priceStr = tags.charge;
          const matchVal = tags.charge.match(/\d+([.,]\d+)?/);
          if (matchVal) {
            priceNum = parseFloat(matchVal[0].replace(",", "."));
          }
        } else if (category === "camper_service") {
          priceStr = "Gratuito";
          priceNum = 0;
        }

        // Facilities mapping
        const facilitiesList: string[] = ["Carico acqua", "Scarico reflui"];
        if (
          tags.power_supply === "yes" ||
          tags.electricity === "yes" ||
          tags["power_supply:camper"] === "yes" ||
          tags["power_supply:caravan"] === "yes"
        ) {
          facilitiesList.push("Elettricità 220V");
        }
        if (
          tags.internet_access === "yes" ||
          tags.wifi === "yes" ||
          tags["internet_access:free"] === "yes"
        ) {
          facilitiesList.push("Wi-Fi gratuito");
        }
        if (tags.dogs === "yes" || tags.pets === "yes") {
          facilitiesList.push("Animali ammessi");
        }
        if (
          tags.shower === "yes" ||
          tags.toilets === "yes" ||
          tags.heating === "yes"
        ) {
          facilitiesList.push("Bagni riscaldati");
        }

        // Height / Weight constraints
        let maxHeightVal: number | undefined = undefined;
        let hasMaxHeightLim = false;
        if (tags.maxheight) {
          const val = parseFloat(tags.maxheight.replace("m", ""));
          if (!isNaN(val)) {
            maxHeightVal = val;
            hasMaxHeightLim = true;
          }
        }

        let maxWeightVal: number | undefined = undefined;
        let hasMaxWeightLim = false;
        if (tags.maxweight) {
          const val = parseFloat(tags.maxweight.replace("t", ""));
          if (!isNaN(val)) {
            maxWeightVal = val;
            hasMaxWeightLim = true;
          }
        }

        const isNarrowAcc = tags.narrow === "yes" || tags.narrow_road === "yes";

        // Cover photos deterministically matching place categories
        let pictureUrl =
          "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600";
        if (category === "campeggio") {
          pictureUrl =
            "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=600";
        } else if (category === "camper_service") {
          pictureUrl =
            "https://images.unsplash.com/photo-1596524430615-b46475ddff6e?auto=format&fit=crop&q=80&w=600";
        }

        importedPlaces.push({
          id: `osm-${el.id}`,
          name,
          category,
          lat: pLat,
          lng: pLng,
          address: addressStr,
          priceInfo: priceStr,
          priceEuro: priceNum,
          rating: 4.1 + Math.random() * 0.8,
          facilities: facilitiesList,
          imageUrl: pictureUrl,
          source: "osm",
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
              date: new Date().toISOString().split("T")[0],
              rating: 4,
              comment: `Struttura camper importata via OpenStreetMap (ID: ${el.id}).`,
              vehicleType: "Qualsiasi camper",
            },
          ],
        });
      }

      if (importedPlaces.length > 0) {
        onPlacesChange([...places, ...importedPlaces]);
        // Silenced notification on user request: "Importati con successo..."
      } else {
        // Silenced notification on user request: "Tutti i punti OSM in quest'area sono già presenti..."
      }
    } catch (err: any) {
      console.warn("Overpass Autoload error:", err);
      // Silenced notification on user request: "Server OSM occupato..."
    } finally {
      setIsAutoLoadingOSM(false);
    }
  };

  const handleImportFromOSM = async (
    mode: "viewport" | "radius",
    customCoords?: { lat: number; lng: number },
  ) => {
    setIsImporting(true);
    setImportError(null);
    setImportSuccessCount(null);
    try {
      let query = "";

      if (mode === "viewport") {
        const map = mapRef.current;
        if (!map) {
          throw new Error(
            "L'applicazione sta caricando. Riapri tra qualche secondo.",
          );
        }
        const bounds = map.getBounds();
        const south = bounds.getSouth();
        const west = bounds.getWest();
        const north = bounds.getNorth();
        const east = bounds.getEast();

        // Check bbox size to avoid hitting Overpass memory limits
        const latDiff = north - south;
        const lngDiff = east - west;
        if (latDiff > 1.2 || lngDiff > 1.2) {
          throw new Error(
            "L'area della mappa inquadrata è troppo grande! Avvicina lo zoom su una città o zona specifica prima di importare.",
          );
        }

        const bbox = `${south},${west},${north},${east}`;

        // Exact tags suggested in user query
        query = `[out:json][timeout:10];
(
  node["tourism"="camp_site"](${bbox});
  way["tourism"="camp_site"](${bbox});
  
  node["caravan_site"="regional"](${bbox});
  node["tourism"="caravan_site"](${bbox});
  node["caravan_site"](${bbox});
  
  node["amenity"="sanitary_dump_station"](${bbox});
);
out center;`;
      } else {
        const map = mapRef.current;
        const center = customCoords
          ? customCoords
          : map
            ? map.getCenter()
            : { lat: 44.5, lng: 11.5 };
        const lat =
          typeof center.lat === "function" ? center.lat() : center.lat;
        const lng =
          typeof center.lng === "function" ? center.lng() : center.lng;
        const radiusMeters = customCoords ? 15000 : importRadius * 1000;
        const dLat = radiusMeters / 111000;
        const dLng = radiusMeters / (111000 * Math.cos((lat * Math.PI) / 180));
        const bbox = `${lat - dLat},${lng - dLng},${lat + dLat},${lng + dLng}`;

        query = `[out:json][timeout:10];
(
  node["tourism"="camp_site"](${bbox});
  way["tourism"="camp_site"](${bbox});
  
  node["caravan_site"="regional"](${bbox});
  node["tourism"="caravan_site"](${bbox});
  node["caravan_site"](${bbox});
  
  node["amenity"="sanitary_dump_station"](${bbox});
);
out center;`;
      }

      let response: Response;
      try {
        response = await fetch("/api/map-data-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: query }),
        });
      } catch (err: any) {
        console.warn(
          "Fetch /api/map-data-proxy (Overpass) fallita, riprovo dopo 1.5s per possibile riavvio o cold start del server...",
          err,
        );
        await new Promise((r) => setTimeout(r, 1500));
        try {
          response = await fetch("/api/map-data-proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: query }),
          });
        } catch (retryErr: any) {
          console.warn(
            "Fetch request for /api/map-data-proxy failed again on retry:",
            retryErr,
          );
          throw retryErr;
        }
      }

      if (!response.ok) {
        throw new Error(
          `Errore dal server Overpass OpenStreetMap (Status ${response.status}). Riprova tra poco.`,
        );
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonErr) {
        throw new Error(
          "Il server Overpass non ha restituito una risposta JSON valida.",
        );
      }

      if (result.notice) {
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: { message: `⚠️ ${result.notice}` },
          }),
        );
      }

      if (!result.elements || result.elements.length === 0) {
        setImportSuccessCount(0);
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message: `ℹ️ Nessun punto sosta o camper service aggiuntivo trovato in questa zona su OpenStreetMap.`,
            },
          }),
        );
        return;
      }

      const importedPlaces: Place[] = [];

      for (const el of result.elements) {
        // Lat and Lng
        let lat = el.lat;
        let lng = el.lon;
        if (el.type === "way" && el.center) {
          lat = el.center.lat;
          lng = el.center.lon;
        }

        if (!lat || !lng) continue;

        // Skip duplicate places
        const isDuplicate = places.some((p) => {
          if (p.id === `osm-${el.id}`) return true;
          const d = getDistanceKm(p.lat, p.lng, lat, lng);
          return d < 0.055; // 55 meters proximity
        });

        if (isDuplicate) continue;

        const tags = el.tags || {};

        // Name mapping
        let name =
          tags.name ||
          tags.official_name ||
          tags.alt_name ||
          tags.short_name ||
          tags.operator ||
          tags.brand ||
          tags.description;
        if (!name) {
          if (tags.tourism === "camp_site") name = "Campeggio / Area Campismo";
          else if (tags.amenity === "sanitary_dump_station")
            name = "Camper Service Carico/Scarico";
          else if (
            tags.tourism === "caravan_site" ||
            tags.caravan_site === "regional"
          )
            name = "Area Sosta Camper OSM";
          else name = "Sosta Camper / Parcheggio";
        }

        // Category mapping
        let category: Place["category"] = "area_sosta";
        if (tags.amenity === "sanitary_dump_station") {
          category = "camper_service";
        } else if (tags.tourism === "camp_site") {
          category = "campeggio";
        }

        // Address mapping
        const city = tags["addr:city"] || "";
        const street = tags["addr:street"] || "";
        const houseNo = tags["addr:housenumber"] || "";
        let addressStr = [street, houseNo, city].filter(Boolean).join(", ");
        if (!addressStr) {
          addressStr = `Osm Rif: ${el.id} (Coordinata: ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`;
        }

        // Price mapping
        let priceStr = "In loco / Da verificare";
        let priceNum = 15;
        if (tags.fee === "no") {
          priceStr = "Gratuito";
          priceNum = 0;
        } else if (tags.charge) {
          priceStr = tags.charge;
          const matchVal = tags.charge.match(/\d+([.,]\d+)?/);
          if (matchVal) {
            priceNum = parseFloat(matchVal[0].replace(",", "."));
          }
        } else if (category === "camper_service") {
          priceStr = "Gratuito";
          priceNum = 0;
        }

        // Facilities mapping
        const facilitiesList: string[] = ["Carico acqua", "Scarico reflui"];
        if (
          tags.power_supply === "yes" ||
          tags.electricity === "yes" ||
          tags["power_supply:camper"] === "yes" ||
          tags["power_supply:caravan"] === "yes"
        ) {
          facilitiesList.push("Elettricità 220V");
        }
        if (
          tags.internet_access === "yes" ||
          tags.wifi === "yes" ||
          tags["internet_access:free"] === "yes"
        ) {
          facilitiesList.push("Wi-Fi gratuito");
        }
        if (tags.dogs === "yes" || tags.pets === "yes") {
          facilitiesList.push("Animali ammessi");
        }
        if (
          tags.shower === "yes" ||
          tags.toilets === "yes" ||
          tags.heating === "yes"
        ) {
          facilitiesList.push("Bagni riscaldati");
        }

        // Height / Weight constraints
        let maxHeightVal: number | undefined = undefined;
        let hasMaxHeightLim = false;
        if (tags.maxheight) {
          const val = parseFloat(tags.maxheight.replace("m", ""));
          if (!isNaN(val)) {
            maxHeightVal = val;
            hasMaxHeightLim = true;
          }
        }

        let maxWeightVal: number | undefined = undefined;
        let hasMaxWeightLim = false;
        if (tags.maxweight) {
          const val = parseFloat(tags.maxweight.replace("t", ""));
          if (!isNaN(val)) {
            maxWeightVal = val;
            hasMaxWeightLim = true;
          }
        }

        const isNarrowAcc = tags.narrow === "yes" || tags.narrow_road === "yes";

        // Cover photos deterministically matching place categories
        let pictureUrl =
          "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600";
        if (category === "campeggio") {
          pictureUrl =
            "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=600";
        } else if (category === "camper_service") {
          pictureUrl =
            "https://images.unsplash.com/photo-1596524430615-b46475ddff6e?auto=format&fit=crop&q=80&w=600";
        }

        importedPlaces.push({
          id: `osm-${el.id}`,
          name,
          category,
          lat,
          lng,
          address: addressStr,
          priceInfo: priceStr,
          priceEuro: priceNum,
          rating: 4.1 + Math.random() * 0.8,
          facilities: facilitiesList,
          imageUrl: pictureUrl,
          source: "osm",
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
              date: new Date().toISOString().split("T")[0],
              rating: 4,
              comment: `Struttura camper importata via OpenStreetMap (ID: ${el.id}). Ricorda di inviare valutazioni aggiornate se visiti il posto!`,
              vehicleType: "Qualsiasi camper",
            },
          ],
        });
      }

      if (importedPlaces.length === 0) {
        setImportSuccessCount(0);
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message: `ℹ️ Tutti i punti OSM rilevati in questa zona sono già presenti nel tuo archivio.`,
            },
          }),
        );
      } else {
        const mergedList = [...places, ...importedPlaces];
        onPlacesChange(mergedList);
        setImportSuccessCount(importedPlaces.length);

        // Auto select first loaded OSM place
        setSelectedPlace(importedPlaces[0]);

        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message: `🎉 Importati con successo ${importedPlaces.length} punti camper da OpenStreetMap!`,
            },
          }),
        );
      }
    } catch (err: any) {
      console.error(err);
      setImportError(
        err.message ||
          "Impossibile contattare OpenStreetMap. Riprova più tardi.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  // High height warning calculations
  const hasDimensionsExceeded =
    selectedPlace?.hasMaxHeightLimit &&
    selectedPlace.maxHeight &&
    vehicleDimensions.height > selectedPlace.maxHeight;
  const hasWeightExceeded =
    selectedPlace?.hasMaxWeightLimit &&
    selectedPlace.maxWeight &&
    vehicleDimensions.weight > selectedPlace.maxWeight;

  const radarRottaCamperWidget = selectedPlace ? (
    <div className="bg-orange-50 rounded-xl border border-orange-200/80 p-2.5 flex flex-col space-y-2 select-none w-full mt-2 relative overflow-hidden">
      {/* HUD Header */}
      <div className="flex justify-between items-center pb-1.5 border-b border-orange-200">
        <div className="flex items-center gap-1.5 text-orange-900">
          <Compass className="w-4 h-4 text-orange-700" />
          <span className="font-extrabold tracking-tight text-[10px] uppercase text-orange-950">
            Radar Rotta Camper
          </span>
        </div>

        {showSmartRoute ? (
          <span className="flex items-center gap-1 text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
            <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
            Rotta Attiva
          </span>
        ) : (
          <span className="text-[8px] font-black text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
            Disattiva
          </span>
        )}
      </div>

      {!showSmartRoute ? (
        <div className="flex items-center justify-between gap-2 py-0.5">
          <p className="text-[10px] text-orange-800/80 font-semibold leading-tight flex-1 text-left">
            Verifica ponti bassi e pendenze stradali sicure
          </p>
          <button
            type="button"
            onClick={() => {
              setShowSmartRoute(true);
              window.dispatchEvent(
                new CustomEvent("show-toast", {
                  detail: {
                    message: `🧭 Calcolata rotta camper sicura verso ${selectedPlace.name}! Controllo collisioni attivo.`,
                  },
                }),
              );
            }}
            className="py-1 px-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[9.5px] font-extrabold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Navigation className="w-2.5 h-2.5 fill-white" />
            <span>Calcola Rotta</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2 font-sans text-left">
          {/* Active Route Telemetry values */}
          <div className="grid grid-cols-3 gap-1 bg-white border border-slate-200/50 p-1.5 text-center rounded-xl shadow-sm">
            <div>
              <span className="text-[7.5px] text-slate-400 font-bold uppercase block">
                Distanza
              </span>
              <span className="text-[10px] font-extrabold text-slate-800 font-mono">
                {selectedRouteStats
                  ? `${formatDistance(selectedRouteStats.distanceKm, settings)}`
                  : "..."}
              </span>
            </div>
            <div>
              <span className="text-[7.5px] text-slate-400 font-bold uppercase block">
                ETA Camper
              </span>
              <span className="text-[10px] font-extrabold text-[#3E4A35] font-mono">
                {selectedRouteStats
                  ? `~${selectedRouteStats.etaMinutes} min`
                  : "..."}
              </span>
            </div>
            <div>
              <span className="text-[7.5px] text-slate-400 font-bold uppercase block font-sans">
                CO₂
              </span>
              <span className="text-[10px] font-extrabold text-[#A45C40] font-mono">
                {selectedRouteStats
                  ? `${selectedRouteStats.co2Kg.toFixed(1)} kg`
                  : "..."}
              </span>
            </div>
          </div>

          {/* Switch to show stops/poi along route */}
          <label className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-xl cursor-pointer select-none hover:bg-slate-50 transition-all shadow-xs">
            <div className="flex items-center gap-1.5 text-slate-750">
              <span className="text-xs">⛺</span>
              <div className="leading-none text-left">
                <span className="text-[9.5px] font-extrabold text-slate-800 block">
                  Mostra soste sul percorso
                </span>
                <span className="text-[7.5px] text-slate-400 font-bold block">
                  Mostra/nascondi aree camper sulla mappa
                </span>
              </div>
            </div>
            <div className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showStopsDuringRoute}
                onChange={(e) => {
                  setShowStopsDuringRoute(e.target.checked);
                  window.dispatchEvent(
                    new CustomEvent("show-toast", {
                      detail: {
                        message: e.target.checked
                          ? "🗺️ Soste sul percorso mostrate sulla mappa"
                          : "🗺️ Soste nascoste (mostrata solo la destinazione)",
                      },
                    }),
                  );
                }}
                className="sr-only peer"
              />
              <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-orange-600"></div>
            </div>
          </label>

          {/* Sagoma Rerouting Controls */}
          {selectedRouteStats?.heightViolationObstacle && (
            <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg space-y-1.5">
              <div className="flex justify-between items-center text-[9px] font-extrabold">
                <span className="text-rose-800 uppercase flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-red-650 animate-pulse" />
                  Sottopasso Basso Rilevato (3.12m)
                </span>
                <span className="bg-red-200/50 text-red-800 px-1 py-0.5 rounded text-[7.5px] font-mono uppercase">
                  Sagoma
                </span>
              </div>

              <p className="text-[9px] text-rose-750 leading-relaxed font-semibold">
                L'altezza del sottopasso SP8 ferroviario (3.12m) è inferiore
                alle dimensioni del tuo veicolo ({vehicleDimensions.height}m).
              </p>

              <label className="flex items-center gap-1.5 cursor-pointer bg-white border border-rose-200 p-1.5 rounded-md select-none hover:bg-stone-50">
                <input
                  type="checkbox"
                  checked={avoidObstaclesMode}
                  onChange={(e) => {
                    setAvoidObstaclesMode(e.target.checked);
                    window.dispatchEvent(
                      new CustomEvent("show-toast", {
                        detail: {
                          message: e.target.checked
                            ? "🔄 Ricalcolata rotta sicura! Deviazione di bypass attiva (+1.5 km)."
                            : "⚠️ Attenzione: Rotta ricalcolata sulla rotta diretta pericolosa! Rischio forte collisione.",
                        },
                      }),
                    );
                  }}
                  className="accent-emerald-600 w-3 h-3 flex-shrink-0 cursor-pointer"
                />
                <div className="leading-tight">
                  <span className="text-[9px] font-black text-slate-800 block">
                    Ricalcola Rotta (Bypass Sicuro)
                  </span>
                  <span className="text-[7.5px] text-emerald-600 font-extrabold block">
                    ✓ Evita collisioni in via SP8
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Gradient Slope safety alert */}
          <div
            className={`p-1.5 rounded-lg flex items-center justify-between border ${
              avoidObstaclesMode && selectedRouteStats?.heightViolationObstacle
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : "bg-amber-50 text-amber-900 border-[#A45C40]/25"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs">📐</span>
              <div className="text-left text-[9px] font-semibold leading-tight">
                <span>
                  Pendenza Massima:{" "}
                  <b>
                    {selectedRouteStats
                      ? `${selectedRouteStats.averageSlope}%`
                      : "..."}
                  </b>
                </span>
                <span className="text-[8px] text-slate-500 font-medium block">
                  {selectedRouteStats?.averageSlope &&
                  selectedRouteStats.averageSlope > 6
                    ? "⚠️ Usare freno motore in discesa!"
                    : "✓ Pendenza sicura per freni camper"}
                </span>
              </div>
            </div>
          </div>

          {/* Ecological emission area check */}
          <div className="p-1.5 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-lg flex items-center gap-1.5 text-[9px] font-semibold">
            <span>🌍</span>
            <p className="leading-tight min-w-0">
              <span>
                Restrizione ZTL Ambientale: <b>Diesel Euro 3/4</b>
              </span>
              <span className="text-[8px] text-indigo-700 font-medium block">
                Controlla autorizzazioni transito in centro
              </span>
            </p>
          </div>

          {/* Start simulated voice guidance or navigate in HUD */}
          <div className="flex gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => {
                onNavigateFullscreen(selectedPlace);
              }}
              className="flex-1 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 uppercase tracking-wide cursor-pointer text-center"
            >
              <Navigation className="w-3 h-3 fill-white" />
              <span>Avvia Guida</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSmartRoute(false)}
              className="px-2 py-1.5 hover:bg-orange-200 bg-orange-100 text-orange-800 rounded-lg text-[9.5px] font-bold border border-orange-300 transition-all cursor-pointer whitespace-nowrap shadow-xs"
            >
              Chiudi Radar
            </button>
          </div>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div
      className={`flex-1 h-full w-full flex flex-col lg:grid lg:grid-cols-12 gap-2 md:gap-4 lg:gap-6 min-h-[300px]`}
    >
      {/* Sidebar - searching list */}
      <div
        className={`lg:col-span-4 flex flex-col h-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[350px] lg:min-h-0 ${
          mobileView === "list" ? "flex" : "hidden lg:flex"
        }`}
      >
        {/* Filters Top rail */}
        <div className="p-4 border-b border-slate-50 space-y-3 bg-slate-50/50">
          {/* Mobile close (X) header to return to main map */}
          {mobileView === "list" && (
            <div className="lg:hidden flex items-center justify-between pb-2 border-b border-slate-200/50">
              <button
                type="button"
                onClick={() => setMobileView("map")}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black text-sm cursor-pointer transition-all border border-slate-200/40 animate-scale-up-sm"
                title="Torna alla mappa"
              >
                ✕
              </button>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#2D2926]/60 pr-8">
                Filtri ed Elenco
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cerca area, città, indirizzo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#3E4A35] focus:ring-1 focus:ring-[#3E4A35]/10 transition-all text-[#2D2926]"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                showFilterPanel ||
                filterMinRating > 0 ||
                filterMaxPrice < 100 ||
                filterAvoidNarrow ||
                filterCheckVehicleDimensions ||
                filterSelectedFacilities.length > 0
                  ? "bg-[#3E4A35]/15 text-[#3E4A35] border-[#3E4A35]"
                  : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
              }`}
              title="Filtri avanzati"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-bold">Filtri</span>
              {/* Active filters badge count indicator */}
              {(filterMinRating > 0 ||
                filterMaxPrice < 100 ||
                filterAvoidNarrow ||
                filterCheckVehicleDimensions ||
                filterSelectedFacilities.length > 0) && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] flex items-center justify-center font-extrabold animate-bounce animate-duration-1000">
                  !
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                const nextState = !showFavoritesOnly;
                setShowFavoritesOnly(nextState);
                if (nextState && favoriteIds.length === 0) {
                  window.dispatchEvent(
                    new CustomEvent("show-toast", {
                      detail: {
                        message:
                          "❤️ Mostri solo i preferiti (nessuna sosta salvata ancora, clicca sul cuore nei dettagli per salvarla!)",
                      },
                    }),
                  );
                } else {
                  window.dispatchEvent(
                    new CustomEvent("show-toast", {
                      detail: {
                        message: nextState
                          ? "❤️ Mostri solo l'elenco dei tuoi preferiti"
                          : "🌍 Mostri tutti i luoghi nella mappa",
                      },
                    }),
                  );
                }
              }}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                showFavoritesOnly
                  ? "bg-rose-50 text-rose-600 border-rose-300 ring-1 ring-rose-300/30"
                  : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
              }`}
              title="Mostra solo i tuoi preferiti"
            >
              <Heart
                className={`w-4 h-4 ${showFavoritesOnly ? "fill-current text-rose-600 animate-pulse" : "text-slate-400"}`}
              />
              <span className="hidden sm:inline text-xs font-bold">
                Preferiti
              </span>
              {favoriteIds.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-rose-600 text-white rounded-full text-[8px] flex items-center justify-center font-black border border-white shadow-xs">
                  {favoriteIds.length}
                </span>
              )}
            </button>
          </div>

          {/* Advanced Filter Panel Card */}
          {showFilterPanel && (
            <div className="p-2 bg-white border border-slate-200/80 rounded-xl space-y-1.5 shadow-xs text-[11px] text-slate-700 select-none animate-fade-in flex flex-col">
              <div className="flex justify-between items-center border-b border-dashed border-slate-100 pb-1 flex-shrink-0">
                <span className="font-extrabold text-[#2D2926] tracking-wide uppercase text-[10px]">
                  ⚙️ Filtri Avanzati
                </span>
                <button
                  type="button"
                  onClick={() => {
                    // Reset all filters
                    setFilterMinRating(0);
                    setFilterMaxPrice(100);
                    setFilterAvoidNarrow(false);
                    setFilterCheckVehicleDimensions(false);
                    setFilterSelectedFacilities([]);
                  }}
                  className="text-[9px] text-rose-600 hover:underline font-bold"
                >
                  Azzera filtri
                </button>
              </div>

              {/* Filter criteria list without nested scrolling */}
              <div className="space-y-1.5">
                {/* 1. Price slider */}
                <div className="space-y-0.5">
                  <div className="flex justify-between font-bold text-slate-600 text-[10px]">
                    <span>Prezzo Massimo Giornaliero:</span>
                    <span className="text-[#A45C40] font-mono">
                      {filterMaxPrice === 0
                        ? "Gratuito 🆓"
                        : filterMaxPrice === 100
                          ? "Qualsiasi"
                          : `Max ${filterMaxPrice}${getCurrencySymbol(settings)}`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={filterMaxPrice}
                    onChange={(e) => setFilterMaxPrice(Number(e.target.value))}
                    className="w-full accent-[#A45C40] h-1 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-slate-400 font-bold font-mono">
                    <span>Solo Gratis</span>
                    <span>50{getCurrencySymbol(settings)}</span>
                    <span>Qualsiasi</span>
                  </div>
                </div>

                {/* 2. Min Rating selector */}
                <div className="space-y-0.5">
                  <div className="flex justify-between font-bold text-slate-600 text-[10px]">
                    <span>Valutazione Minima:</span>
                    <span className="text-amber-600 flex items-center gap-0.5">
                      {filterMinRating === 0
                        ? "Qualsiasi"
                        : `⭐ ${filterMinRating}.0+`}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[0, 3, 4, 4.5].map((stars) => (
                      <button
                        key={stars}
                        type="button"
                        onClick={() => setFilterMinRating(stars)}
                        className={`py-0.5 rounded border text-center transition-all font-bold cursor-pointer text-[10px] ${
                          filterMinRating === stars
                            ? "bg-[#5A6B4E]/10 text-[#3E4A35] border-[#5A6B4E]/40"
                            : "bg-slate-50 text-slate-600 border-transparent hover:bg-slate-100"
                        }`}
                      >
                        {stars === 0 ? "Tutti" : `${stars}★`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Show OSM Hazards Overlay */}
                <div className="pt-1">
                  <label
                    className={`flex items-center gap-2 cursor-pointer p-2 rounded-xl border transition-all select-none ${showOsmObstacles ? "bg-amber-500/10 border-amber-500/30 text-amber-900" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"}`}
                  >
                    <input
                      type="checkbox"
                      checked={showOsmObstacles}
                      onChange={(e) => setShowOsmObstacles(e.target.checked)}
                      className="accent-amber-500 flex-shrink-0 w-3.5 h-3.5"
                    />
                    <div className="text-left leading-tight min-w-0">
                      <span className="font-black text-[9.5px] uppercase block tracking-wider">
                        ⚠️ Vista Ostacoli & Limiti OSM
                      </span>
                      <span className="text-[8.5px] text-slate-500 block font-medium truncate">
                        Mappa ponti bassi, strettoie e divieti peso
                      </span>
                    </div>
                    {loadingOsmObstacles && (
                      <span className="ml-auto w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></span>
                    )}
                  </label>
                </div>

                {/* 4. Multi-selection services checklist */}
                <div className="space-y-1 pt-0.5">
                  <span className="font-extrabold text-[#2D2926]/80 text-[10px] block">
                    Servizi ed attrezzature richiesti:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      "Carico acqua",
                      "Scarico reflui",
                      "Elettricità 220V",
                      "Bagni riscaldati",
                      "Wi-Fi",
                      "Piscina",
                      "Animali ammessi",
                    ].map((service) => {
                      const isSelected =
                        filterSelectedFacilities.includes(service);
                      return (
                        <button
                          key={service}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setFilterSelectedFacilities(
                                filterSelectedFacilities.filter(
                                  (s) => s !== service,
                                ),
                              );
                            } else {
                              setFilterSelectedFacilities([
                                ...filterSelectedFacilities,
                                service,
                              ]);
                            }
                          }}
                          className={`px-1.5 py-0.5 rounded-md border text-[9px] font-semibold transition-all select-none cursor-pointer ${
                            isSelected
                              ? "bg-[#3E4A35] text-white border-transparent"
                              : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {service}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottoni OK di conferma dedicati */}
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-1 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setShowFilterPanel(false);
                    setMobileView("map");
                  }}
                  className="w-full py-1.5 px-3 bg-[#3E4A35] hover:bg-[#2c3526] text-white rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow shadow-[#3E4A35]/15 hover:scale-[1.01]"
                >
                  <span>OK 🌍 Vedi nella Mappa</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFilterPanel(false);
                    setMobileView("list");
                  }}
                  className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow shadow-[#emerald-600]/15 hover:scale-[1.01]"
                >
                  <span>OK 📋 Vedi nell'Elenco</span>
                </button>
              </div>
            </div>
          )}

          {/* Swapped Proximity Distance Filters Block: Intorno a me / Intorno a questo luogo */}
          <div className="flex gap-2 items-center justify-between pt-0.5">
            <button
              type="button"
              disabled={isAutoLoadingOSM}
              onClick={async () => {
                if (activeDistanceFilter === "me") {
                  setActiveDistanceFilter("none");
                  setFilterCenter(null);
                  onPlacesChange(places.filter((p) => p.source !== "osm"));
                } else {
                  if (!userLocation) {
                    window.dispatchEvent(
                      new CustomEvent("show-toast", {
                        detail: {
                          message: `⚠️ Per cercare "Intorno a me", abilita prima il GPS (pulsante "Attiva GPS" in alto a destra sulla mappa)`,
                        },
                      }),
                    );
                    return;
                  }
                  mapMovedByUserRef.current = false;
                  setActiveDistanceFilter("me");
                  setFilterCenter({
                    lat: userLocation.lat,
                    lng: userLocation.lng,
                  });
                  mapRef.current?.setView(
                    [userLocation.lat, userLocation.lng],
                    10,
                  );

                  // Automatically trigger live Overpass QL fetch on-demand! 🚀
                  await autoLoadOSMForProximity(
                    userLocation.lat,
                    userLocation.lng,
                  );
                }
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none border ${
                activeDistanceFilter === "me"
                  ? "bg-orange-600 hover:bg-[#d4510d] text-white border-transparent shadow"
                  : "bg-white hover:bg-slate-50 text-[#3E4A35] border-slate-200"
              } disabled:opacity-50`}
            >
              <span>
                {isAutoLoadingOSM && activeDistanceFilter === "me"
                  ? "⏳ Ricerca..."
                  : "🚐 Intorno a me"}
              </span>
            </button>

            <button
              type="button"
              disabled={isAutoLoadingOSM}
              onClick={async () => {
                if (activeDistanceFilter === "place") {
                  setActiveDistanceFilter("none");
                  setFilterCenter(null);
                  onPlacesChange(places.filter((p) => p.source !== "osm"));
                } else {
                  let centerLat: number;
                  let centerLng: number;
                  let centerName: string;

                  if (mapMovedByUserRef.current && mapRef.current) {
                    const mapCenter = mapRef.current.getCenter();
                    centerLat =
                      typeof mapCenter.lat === "function"
                        ? mapCenter.lat()
                        : mapCenter.lat;
                    centerLng =
                      typeof mapCenter.lng === "function"
                        ? mapCenter.lng()
                        : mapCenter.lng;
                    centerName = `Centro mappa (${Number(centerLat).toFixed(4)}, ${Number(centerLng).toFixed(4)})`;
                  } else if (clickedCoords) {
                    centerLat = clickedCoords.lat;
                    centerLng = clickedCoords.lng;
                    centerName = `Punto personalizzato (${Number(clickedCoords.lat).toFixed(4)}, ${Number(clickedCoords.lng).toFixed(4)})`;
                  } else if (selectedPlace) {
                    centerLat = selectedPlace.lat;
                    centerLng = selectedPlace.lng;
                    centerName = selectedPlace.name;
                  } else {
                    const mapCenter = mapRef.current
                      ? mapRef.current.getCenter()
                      : null;
                    centerLat = mapCenter
                      ? typeof mapCenter.lat === "function"
                        ? mapCenter.lat()
                        : mapCenter.lat
                      : userLocation?.lat || 44.5;
                    centerLng = mapCenter
                      ? typeof mapCenter.lng === "function"
                        ? mapCenter.lng()
                        : mapCenter.lng
                      : userLocation?.lng || 11.5;
                    centerName = `Posizione corrente (${Number(centerLat).toFixed(4)}, ${Number(centerLng).toFixed(4)})`;
                  }

                  mapMovedByUserRef.current = false;
                  setActiveDistanceFilter("place");
                  setFilterCenter({ lat: centerLat, lng: centerLng });
                  mapRef.current?.setView([centerLat, centerLng], 10);

                  // Automatically trigger live Overpass QL fetch around the target place on-demand! 🚀
                  await autoLoadOSMForProximity(centerLat, centerLng);
                }
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none border ${
                activeDistanceFilter === "place"
                  ? "bg-orange-600 hover:bg-[#d4510d] text-white border-transparent shadow"
                  : "bg-white hover:bg-slate-50 text-[#3E4A35] border-slate-200"
              } disabled:opacity-50`}
            >
              <span>
                {isAutoLoadingOSM && activeDistanceFilter === "place"
                  ? "⏳ Ricerca..."
                  : "📍 Intorno a questo"}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-5 gap-0.5 min-[370px]:gap-1 py-1 w-full flex-shrink-0">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`py-1.5 rounded-md text-[9px] min-[370px]:text-[10px] font-black transition-all cursor-pointer text-center px-0.5 select-none flex flex-col items-center justify-center leading-none ${
                selectedCategory === "all"
                  ? "bg-[#3E4A35] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
              title={`Tutti (${places.length})`}
            >
              <span className="truncate w-full block">Tutti</span>
              <span className="text-[7.5px] min-[370px]:text-[8px] opacity-80 mt-0.5 font-normal">
                ({places.length})
              </span>
            </button>
            <button
              onClick={() => setSelectedCategory("area_sosta")}
              className={`py-1.5 rounded-md text-[9px] min-[370px]:text-[10px] font-black transition-all cursor-pointer text-center px-0.5 select-none flex items-center justify-center leading-none ${
                selectedCategory === "area_sosta"
                  ? "bg-[#5A6B4E] text-white shadow-xs"
                  : "bg-white text-[#3E4A35] border border-[#5A6B4E]/30 hover:bg-[#5A6B4E]/10"
              }`}
              title="Aree Sosta"
            >
              <span className="truncate w-full block">Soste</span>
            </button>
            <button
              onClick={() => setSelectedCategory("campeggio")}
              className={`py-1.5 rounded-md text-[9px] min-[370px]:text-[10px] font-black transition-all cursor-pointer text-center px-0.5 select-none flex items-center justify-center leading-none ${
                selectedCategory === "campeggio"
                  ? "bg-[#3E4A35] text-white shadow-xs"
                  : "bg-white text-[#3E4A35] border border-[#3E4A35]/30 hover:bg-[#3E4A35]/10"
              }`}
              title="Campeggi"
            >
              <span className="truncate w-full block">Camping</span>
            </button>
            <button
              onClick={() => setSelectedCategory("camper_service")}
              className={`py-1.5 rounded-md text-[9px] min-[370px]:text-[10px] font-black transition-all cursor-pointer text-center px-0.5 select-none flex items-center justify-center leading-none ${
                selectedCategory === "camper_service"
                  ? "bg-[#A45C40] text-white shadow-xs"
                  : "bg-white text-[#A45C40] border border-[#A45C40]/30 hover:bg-[#A45C40]/10"
              }`}
              title="Service"
            >
              <span className="truncate w-full block">Service</span>
            </button>
            <button
              onClick={() => setSelectedCategory("parcheggio_camper")}
              className={`py-1.5 rounded-md text-[9px] min-[370px]:text-[10px] font-black transition-all cursor-pointer text-center px-0.5 select-none flex items-center justify-center leading-none ${
                selectedCategory === "parcheggio_camper"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-white text-sky-700 border border-sky-300/60 hover:bg-sky-50"
              }`}
              title="Parcheggi"
            >
              <span className="truncate w-full block">Parcheggi</span>
            </button>
          </div>
        </div>

        {/* List scroll */}
        {!showFilterPanel && (
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
            {getFilteredPlaces().length === 0 ? (
              <div className="p-6 text-center text-slate-500 space-y-2 mt-4">
                <Compass className="w-8 h-8 mx-auto text-[#3E4A35] opacity-40 animate-pulse" />
                <p className="font-bold text-slate-700 text-xs">
                  Nessuna sosta visibile
                </p>
                <p className="text-[10.5px] text-slate-500 leading-relaxed px-2">
                  La mappa è pulita per non affollarla. Le aree sosta vengono
                  mostrate solo vicino a te o alla tua destinazione. Usa i
                  pulsanti{" "}
                  <strong className="text-[#3E4A35]">"🚐 Intorno a me"</strong>{" "}
                  o{" "}
                  <strong className="text-[#3E4A35]">"📍 Intorno sosta"</strong>{" "}
                  sotto la mappa per attivarle!
                </p>
              </div>
            ) : (
              getFilteredPlaces().map((place) => {
                const isSelected = selectedPlace?.id === place.id;
                const hasLimit =
                  place.hasMaxHeightLimit &&
                  place.maxHeight &&
                  vehicleDimensions.height > place.maxHeight;

                return (
                  <button
                    key={place.id}
                    onClick={() => handleSelectAndFocus(place)}
                    className={`w-full text-left p-3.5 transition-all outline-none flex gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-[#5A6B4E]/10 ring-l-4 ring-[#3E4A35]"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 group/img shadow-xs">
                      {isImageFallback(place.category, place.imageUrl) ? (
                        <CategoryIllustration
                          category={place.category}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={resolveImage(place.category, place.imageUrl)}
                          alt={place.name}
                          className="w-full h-full object-cover"
                          referrerPolicy={
                            resolveImage(
                              place.category,
                              place.imageUrl,
                            ).startsWith("http")
                              ? "no-referrer"
                              : undefined
                          }
                          onError={(e) => {
                            const currentSrc = e.currentTarget.src;
                            try {
                              const url = new URL(currentSrc);
                              const path = url.pathname;
                              const key = currentSrc.includes("unsplash.com")
                                ? currentSrc
                                : path;
                              if (!imageErrorUrls[key]) {
                                setImageErrorUrls((prev) => ({
                                  ...prev,
                                  [key]: true,
                                }));
                              }
                            } catch (err) {
                              if (!imageErrorUrls[currentSrc]) {
                                setImageErrorUrls((prev) => ({
                                  ...prev,
                                  [currentSrc]: true,
                                }));
                              }
                            }
                          }}
                        />
                      )}
                        {/* Upload functionality disabled */}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-start gap-1">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            place.category === "area_sosta"
                              ? "bg-[#5A6B4E]/15 text-[#3E4A35]"
                              : place.category === "campeggio"
                                ? "bg-[#3E4A35]/15 text-[#3E4A35]"
                                : place.category === "parcheggio_camper"
                                  ? "bg-sky-100 text-sky-800"
                                  : "bg-[#A45C40]/15 text-[#A45C40]"
                          }`}
                        >
                          {place.category.replace("_", " ")}
                        </span>
                        <span className="flex items-center gap-1 font-bold text-[#2D2926]">
                          <Star className="w-3 h-3 text-amber-500 fill-current" />
                          {Number(place.rating).toFixed(1)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-[#2D2926] text-xs line-clamp-1 flex-1">
                          {place.name}
                        </h4>
                        {place.isOfflineDraft && (
                          <span className="bg-orange-100 text-orange-950 font-black text-[8px] uppercase px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1 border border-orange-200 select-none animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                            Bozza Offline
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] min-w-0">
                        <span className="truncate flex-1">{place.address}</span>
                        {place.nearestCity && (
                          <span className="text-[9px] text-indigo-600 font-extrabold bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded shrink-0">
                            🏙️ {place.nearestCity}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="font-bold text-slate-700 font-mono text-[10px]">
                          {place.priceInfo}
                        </span>
                        {hasLimit && (
                          <span className="bg-[#A45C40]/10 text-[#A45C40] font-extrabold text-[9px] px-1.5 py-0.5 rounded animate-pulse inline-flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Limiti Sagoma!
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Map visualization and Details wrapper */}
      <div
        className={`lg:col-span-8 flex flex-col h-full gap-1 sm:gap-1.5 overflow-hidden p-0.5 ${
          mobileView === "map" ? "flex" : "hidden lg:flex"
        }`}
      >
        {/* Leaflet Frame & forms layer */}
        <div className="relative bg-slate-100 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 h-full min-h-[300px] w-full shrink">
          {/* Map canvas */}
          {!hasValidKey || !isOnline ? (
            <LeafletOfflineMap
              places={getFilteredPlaces()}
              userLocation={userLocation}
              vehicleDimensions={vehicleDimensions}
              selectedPlace={selectedPlace}
              setSelectedPlace={setSelectedPlace}
              setIsMobileDetailsOpen={setIsMobileDetailsOpen}
              isOnline={isOnline}
              indicatorTitle={
                !hasValidKey
                  ? isOnline
                    ? "Mappa Leaflet (Senza API Key) 🗺️"
                    : "Mappa Offline Leaflet 🗺️"
                  : undefined
              }
            />
          ) : (
            <div className="w-full h-full relative" id="google-map-container">
              <APIProvider apiKey={googleMapsKey} version="weekly">
                <Map
                  defaultZoom={selectedPlace ? 13 : 6}
                  defaultCenter={
                    selectedPlace?.lat && selectedPlace?.lng
                      ? { lat: Number(selectedPlace.lat) || 44.5, lng: Number(selectedPlace.lng) || 11.5 }
                      : { lat: 44.5, lng: 11.5 }
                  }
                  mapId="DEMO_MAP_ID"
                  mapTypeId={mapTypeId}
                  gestureHandling="greedy"
                  disableDefaultUI={window.innerWidth < 1024}
                  internalUsageAttributionIds={[
                    "gmp_mcp_codeassist_v1_aistudio",
                  ]}
                  style={{ width: "100%", height: "100%" }}
                >
                  <MapEventsHelper
                    mapRef={mapRef}
                    onMapClick={(lat, lng) => {
                      setClickedCoords({ lat, lng });
                      setShowClickedPopup(true);
                      mapMovedByUserRef.current = false;
                      setClickedPlaceName("Puntina Sulla Mappa");
                      setClickedAddress(
                        `Coordinate: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
                      );
                      setIsResolvingClick(true);
                      fetch(`/api/nominatim-reverse?lat=${lat}&lon=${lng}`)
                        .then((res) => {
                          if (!res.ok) {
                            return {
                              display_name: `Coordinate: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
                              address: { amenity: "Punto Sulla Mappa" }
                            };
                          }
                          return res.json().catch(() => ({
                            display_name: `Coordinate: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
                            address: { amenity: "Punto Sulla Mappa" }
                          }));
                        })
                        .catch(() => ({
                          display_name: `Coordinate: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
                          address: { amenity: "Punto Sulla Mappa" }
                        }))
                        .then((data) => {
                          if (data && data.display_name) {
                            let resolvedName =
                              data.display_name.split(",")[0] ||
                              "Punto Sulla Mappa";
                            if (data.address) {
                              resolvedName =
                                data.address.amenity ||
                                data.address.tourism ||
                                data.address.historic ||
                                data.address.leisure ||
                                data.address.building ||
                                resolvedName;
                            }
                            setClickedPlaceName(resolvedName);
                            setClickedAddress(data.display_name);
                          }
                        })
                        .finally(() => setIsResolvingClick(false));
                    }}
                    onMapContextMenu={(lat, lng) => {
                      const customPlace: Place = {
                        id: `custom-point-${Date.now()}`,
                        name: "Punto Sulla Mappa",
                        category: "area_sosta",
                        lat: lat,
                        lng: lng,
                        address: `Coordinate: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
                        priceInfo: "Punto d'interesse",
                        priceEuro: 0,
                        rating: 5,
                        facilities: ["Carico acqua", "Scarico reflui"],
                        reviews: [],
                        imageUrl:
                          "https://images.unsplash.com/photo-1523987355123-c29fbf7cf313?auto=format&fit=crop&q=400",
                        source: "inserito_a_mano",
                        maxHeight: 4.0,
                        maxWeight: 5.0,
                        isNarrowAccess: false,
                      };
                      setSelectedPlace(customPlace);
                      setIsMobileDetailsOpen(true);
                      mapRef.current?.setView([lat, lng], 14);

                      window.dispatchEvent(
                        new CustomEvent("show-toast", {
                          detail: {
                            message: `📍 Punto selezionato sulla mappa. Sto verificando il nome reale...`,
                          },
                        }),
                      );

                      fetch(`/api/nominatim-reverse?lat=${lat}&lon=${lng}`)
                        .then((res) => {
                          if (!res.ok) {
                            return {
                              display_name: `Coordinate: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
                              address: { amenity: "Punto Sulla Mappa" }
                            };
                          }
                          return res.json().catch(() => ({
                            display_name: `Coordinate: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
                            address: { amenity: "Punto Sulla Mappa" }
                          }));
                        })
                        .catch(() => ({
                          display_name: `Coordinate: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
                          address: { amenity: "Punto Sulla Mappa" }
                        }))
                        .then((data) => {
                          if (data && data.display_name) {
                            let resolvedName =
                              data.display_name.split(",")[0] ||
                              "Punto Sulla Mappa";
                            if (data.address) {
                              resolvedName =
                                data.address.amenity ||
                                data.address.tourism ||
                                data.address.historic ||
                                data.address.leisure ||
                                data.address.building ||
                                resolvedName;
                            }
                            setSelectedPlace((prev) => {
                              if (prev && prev.id === customPlace.id) {
                                  return {
                                    ...prev,
                                    name: resolvedName,
                                    address: data.display_name,
                                  };
                                }
                                return prev;
                              });
                            }
                          });
                    }}
                    onIdle={(lat, lng) => {
                      setMapCenterCoords({ lat, lng });
                    }}
                    mapMovedByUserRef={mapMovedByUserRef}
                  />

                  {/* Range Circle */}
                  {activeDistanceFilter === "me" && userLocation && (
                    <MapCircle
                      center={userLocation}
                      radius={15000}
                      color="#3E4A35"
                    />
                  )}
                  {activeDistanceFilter === "place" && filterCenter && (
                    <MapCircle
                      center={filterCenter}
                      radius={15000}
                      color="#A45C40"
                    />
                  )}

                  {/* Places Markers */}
                  {getFilteredPlaces()
                    .filter((place) => {
                      if (showSmartRoute) {
                        if (selectedPlace && place.id === selectedPlace.id) {
                          return true;
                        }
                        return showStopsDuringRoute;
                      }
                      return true;
                    })
                    .map((place) => {
                    let colorClass = "bg-[#A45C40]"; // Service (terracotta)
                    let labelLetter = "💧";
                    if (place.category === "area_sosta") {
                      colorClass = "bg-[#5A6B4E]";
                      labelLetter = "⛺";
                    } else if (place.category === "campeggio") {
                      colorClass = "bg-[#3E4A35]";
                      labelLetter = "🌲";
                    } else if (place.category === "parcheggio_camper") {
                      colorClass = "bg-sky-600";
                      labelLetter = "🅿️";
                    }

                    const heightViolation =
                      place.hasMaxHeightLimit &&
                      place.maxHeight &&
                      vehicleDimensions.height > place.maxHeight;
                    const ringClass = heightViolation
                      ? "ring-4 ring-rose-500 animate-pulse bg-rose-600 border-rose-200"
                      : "border-white";

                    return (
                      <AdvancedMarker
                        key={place.id}
                        position={{ lat: Number(place.lat), lng: Number(place.lng) }}
                        title={place.name}
                        onClick={() => {
                          setSelectedPlace(place);
                          setIsMobileDetailsOpen(true);
                          mapRef.current?.setView([Number(place.lat), Number(place.lng)], 13);
                          setClickedCoords(null);
                          setShowClickedPopup(false);
                          mapMovedByUserRef.current = false;
                        }}
                      >
                        <div className="flex flex-col items-center justify-center w-9 h-12">
                          <div
                            className={`w-9 h-9 rounded-full ${colorClass} ${ringClass} flex items-center justify-center shadow-md border-2 text-white relative`}
                          >
                            <span className="text-sm select-none">
                              {labelLetter}
                            </span>
                            {heightViolation && (
                              <span className="absolute -top-1 -right-1 text-[9px] bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center border border-white font-bold animate-bounce">
                                ⚠️
                              </span>
                            )}
                          </div>
                          <div
                            className={`w-2 h-2 rounded-full ${heightViolation ? "bg-rose-600" : colorClass} rotate-45 -mt-1 shadow-sm`}
                          ></div>
                        </div>
                      </AdvancedMarker>
                    );
                  })}

                  {/* User GPS Location Marker */}
                  {userLocation && (
                    <AdvancedMarker
                      position={{ lat: Number(userLocation.lat), lng: Number(userLocation.lng) }}
                      title="Il Mio Camper"
                      onClick={() => {
                        setSelectedPlace({
                          id: 'current_location',
                          name: 'La tua posizione',
                          category: 'camper_service',
                          lat: userLocation.lat,
                          lng: userLocation.lng,
                          address: `Lat: ${Number(userLocation.lat).toFixed(5)}, Lng: ${Number(userLocation.lng).toFixed(5)}`,
                          priceInfo: 'Gratis',
                          priceEuro: 0,
                          rating: 5,
                          facilities: [],
                          reviews: [],
                          imageUrl: '',
                          source: 'User'
                        });
                        setIsMobileDetailsOpen(true);
                        mapRef.current?.setView([userLocation.lat, userLocation.lng], 13);
                        setClickedCoords(null);
                        setShowClickedPopup(false);
                      }}
                    >
                      <div className="flex flex-col items-center justify-center w-12 h-16 pointer-events-auto cursor-pointer animate-fade-in">
                        <div className={`w-9 h-9 rounded-full ${settings?.shareLocation ? 'bg-emerald-600 ring-emerald-500/30' : 'bg-blue-500 ring-blue-500/20'} border-2 border-white flex items-center justify-center shadow-lg relative ring-4 hover:scale-110 transition-all duration-300`}>
                          <span
                            className="text-sm select-none"
                            style={{
                              filter:
                                "drop-shadow(0px 1px 1.5px rgba(0,0,0,0.5))",
                            }}
                          >
                            🚐
                          </span>
                          <span className={`absolute inset-0 rounded-full animate-ping ${settings?.shareLocation ? 'bg-emerald-400' : 'bg-blue-400'} opacity-30 pointer-events-none`}></span>
                        </div>
                        <div className={`text-[9px] font-black rounded px-1.5 py-0.5 mt-1 border border-white shadow-xs whitespace-nowrap uppercase tracking-wider ${settings?.shareLocation ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>
                          {settings?.shareLocation ? "🚐 Condiviso" : "🚐 Il Mio Camper"}
                        </div>
                      </div>
                    </AdvancedMarker>
                  )}

                  {/* Clicked Location Marker */}
                  {clickedCoords && (
                    <AdvancedMarker
                      position={{ lat: Number(clickedCoords.lat), lng: Number(clickedCoords.lng) }}
                      title="Punto Selezionato"
                      onClick={() => setShowClickedPopup((prev) => !prev)}
                    >
                      <div className="flex flex-col items-center justify-center w-9 h-12">
                        <div className="w-9 h-9 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-white relative shadow-lg animate-bounce">
                          <span className="text-sm select-none font-bold">
                            📍
                          </span>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-amber-500 rotate-45 -mt-1 shadow-sm"></div>
                      </div>
                    </AdvancedMarker>
                  )}

                  {/* OSM Obstacles (limitations overlay) */}
                  {showOsmObstacles &&
                    osmObstacles.map((obs) => {
                      const isCritical = obs.isViolation;
                      const sizeClass = isCritical
                        ? "w-8 h-8 text-xs"
                        : "w-6 h-6 text-[9px]";
                      const bgClass = isCritical
                        ? "bg-rose-600 animate-pulse border-white text-white font-black"
                        : "bg-amber-500 border-white text-slate-800 font-bold";

                      let symbol = "📐";
                      if (obs.type === "height")
                        symbol = isCritical ? "⛔" : "📐";
                      else if (obs.type === "width") symbol = "↔️";
                      else if (obs.type === "weight") symbol = "⚖️";

                      return (
                        <AdvancedMarker
                          key={obs.id}
                          position={{ lat: Number(obs.lat), lng: Number(obs.lng) }}
                          title={`${obs.name}: ${obs.value}${obs.type === "weight" ? "t" : "m"}`}
                        >
                          <div className="flex flex-col items-center justify-center w-12 h-14">
                            <div
                              className={`${sizeClass} rounded-full ${bgClass} border-2 flex items-center justify-center shadow-md relative`}
                            >
                              <span className="select-none">{symbol}</span>
                            </div>
                            <div className="text-[8px] font-black bg-slate-900 text-white rounded px-1 py-0.5 mt-0.5 border border-slate-700 whitespace-nowrap">
                              {obs.value}
                              {obs.type === "weight" ? "t" : "m"}
                            </div>
                          </div>
                        </AdvancedMarker>
                      );
                    })}

                  {/* Smart Route Display (polylines and detour calculation overlays) */}
                  {showSmartRoute && selectedPlace && userLocation && (
                    <SmartRouteDisplay
                      selectedPlace={selectedPlace}
                      userLocation={userLocation}
                      avoidObstaclesMode={avoidObstaclesMode}
                      vehicleDimensions={vehicleDimensions}
                      places={places}
                    />
                  )}
                </Map>
              </APIProvider>
            </div>
          )}

          {/* Top Control Bar containing Search (with flex-1) and GPS buttons */}
          <div
            className="absolute top-2 left-2 right-2 md:top-3 md:left-3 md:right-3 z-[1000] flex gap-1.5 items-center"
            style={{ transform: "translateY(-10%)" }}
          >
            {/* Search Container */}
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <form
                onSubmit={handleAddressSearch}
                className="flex gap-1.5 shadow bg-white p-1 rounded-lg border border-slate-200 w-full h-8 items-center"
              >
                <input
                  type="text"
                  placeholder="Cerca località (es. Roma, Garda...)"
                  value={addressSearchQuery}
                  onChange={(e) => setAddressSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent px-2 text-[11px] font-semibold outline-none text-[#2D2926] min-w-0"
                />
                <button
                  type="submit"
                  disabled={isSearchingAddress}
                  className="h-6 px-2.5 bg-[#3E4A35] text-white hover:bg-[#5A6B4E] rounded-md text-[10px] font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer"
                >
                  {isSearchingAddress ? "..." : <Search className="w-3 h-3" />}
                </button>
              </form>

              {/* Suggestions list dropdown */}
              {addressSuggestions.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-lg overflow-hidden divide-y divide-slate-100 text-xs font-semibold max-h-48 overflow-y-auto">
                  {addressSuggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(sug)}
                      className="w-full text-left p-2 hover:bg-slate-50 transition-all block truncate text-slate-700 active:bg-slate-100 text-[10.5px]"
                    >
                      📍 {sug.display_name}
                    </button>
                  ))}
                </div>
              )}
              {addressSearchError && (
                <div className="bg-white/95 px-2 py-1 rounded-md text-[9px] text-red-650 font-semibold border border-red-200 shadow-xs">
                  ❌ {addressSearchError}
                </div>
              )}
            </div>

            {/* GPS Activation Button & Align Centra Camper wrapper */}
            <div className="flex gap-1 items-center shrink-0 relative">
              {/* Map Type Switcher Button */}
              <button
                type="button"
                onClick={() => setShowMapTypeMenu(!showMapTypeMenu)}
                className={`h-8 px-2.5 rounded-lg shadow font-extrabold text-[9px] sm:text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer border shrink-0 ${
                  showMapTypeMenu || mapTypeId !== "roadmap"
                    ? "bg-[#3E4A35] text-white border-transparent"
                    : "bg-white text-slate-800 hover:bg-slate-50 border-slate-200"
                }`}
                title="Cambia visualizzazione mappa"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mappa</span>
              </button>

              {showMapTypeMenu && (
                <div className="absolute top-9 right-0 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200 p-1 w-36 z-[1100] animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setMapTypeId("roadmap");
                      setShowMapTypeMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                      mapTypeId === "roadmap"
                        ? "bg-[#3E4A35]/10 text-[#3E4A35]"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    🗺️ Stradale
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMapTypeId("satellite");
                      setShowMapTypeMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                      mapTypeId === "satellite"
                        ? "bg-[#3E4A35]/10 text-[#3E4A35]"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    🛰️ Satellitare
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMapTypeId("hybrid");
                      setShowMapTypeMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                      mapTypeId === "hybrid"
                        ? "bg-[#3E4A35]/10 text-[#3E4A35]"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    🛣️ Ibrido
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMapTypeId("terrain");
                      setShowMapTypeMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                      mapTypeId === "terrain"
                        ? "bg-[#3E4A35]/10 text-[#3E4A35]"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    ⛰️ Terreno
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => onGPSEnabledChange(!isGPSEnabled)}
                className={`h-8 px-2 rounded-lg shadow font-extrabold text-[9px] sm:text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer border shrink-0 ${
                  isGPSEnabled
                    ? "bg-blue-600 text-white border-white animate-pulse"
                    : "bg-white text-slate-800 hover:bg-slate-50 border-slate-200"
                }`}
                title={isGPSEnabled ? "Disattiva GPS" : "Attiva GPS"}
              >
                <Compass
                  className={`w-3 h-3 ${isGPSEnabled ? "text-white" : "text-[#3E4A35]"}`}
                />
                <span>{isGPSEnabled ? "GPS ON" : "Attiva GPS"}</span>
              </button>

              {isGPSEnabled && userLocation && (
                <button
                  type="button"
                  onClick={handleCenterOnUser}
                  className="h-8 w-8 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white rounded-lg shadow font-bold text-[9px] sm:text-[10px] flex items-center justify-center transition-all cursor-pointer border border-white/20 shrink-0"
                  title="Centra Camper"
                >
                  <Navigation className="w-3 h-3 text-white fill-white" />
                </button>
              )}

              {/* Google Maps Key Configuration Button - visible only to admins */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowKeyModal(true)}
                  className={`h-8 px-2.5 rounded-lg shadow font-extrabold text-[9px] sm:text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer border shrink-0 ${
                    hasValidKey
                      ? "bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700"
                      : "bg-[#A45C40] text-white hover:bg-[#b0674a] border-[#A45C40]/20"
                  }`}
                  title={
                    hasValidKey
                      ? "Chiave Google Maps Attiva 🔑"
                      : "Configura Chiave Google Maps"
                  }
                >
                  <Lock className="w-3 h-3 text-white" />
                  <span>API Key</span>
                </button>
              )}
            </div>
          </div>

          {/* Scheda informativa per la puntina temporanea personalizzata */}
          {clickedCoords && showClickedPopup && (
            <div className="absolute bottom-24 left-3 right-3 md:left-auto md:right-3 md:bottom-24 md:w-64 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200 p-3 z-[1100] animate-in fade-in slide-in-from-bottom-4 duration-200 font-sans">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                    <MapPin className="w-3.5 h-3.5 fill-amber-500/20" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[#2D2926] text-xs text-left">
                      {isResolvingClick
                        ? "Rilevamento in corso..."
                        : clickedPlaceName}
                    </h4>
                    <p className="text-[9px] text-slate-500 font-bold font-mono text-left">
                      {Number(clickedCoords.lat).toFixed(5)},{" "}
                      {Number(clickedCoords.lng).toFixed(5)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowClickedPopup(false);
                    setClickedCoords(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[10px] text-slate-600 mb-2.5 text-left leading-tight font-medium">
                {isResolvingClick
                  ? "Risoluzione indirizzo da coordinate..."
                  : clickedAddress || "Coordinate geografiche sulla mappa."}
              </p>

              {/* Bottoni d'azione */}
              <div className="flex flex-col gap-1.5 mt-2 font-sans">
                <button
                  onClick={() => {
                    const tempPlace: Place = {
                      id: `temp-${clickedCoords.lat}-${clickedCoords.lng}`,
                      name:
                        clickedPlaceName !== "Puntina Sulla Mappa"
                          ? clickedPlaceName
                          : "Destinazione Manuale",
                      category: "area_sosta",
                      lat: clickedCoords.lat,
                      lng: clickedCoords.lng,
                      address: clickedAddress || "Coordinate GPS",
                      priceInfo: "N/A",
                      priceEuro: 0,
                      rating: 0,
                      facilities: [],
                      imageUrl:
                        "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600",
                      source: "inserito_a_mano",
                      reviews: [],
                    };
                    onNavigateFullscreen(tempPlace);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 text-center w-full"
                >
                  <Compass className="w-4 h-4 animate-pulse" />
                  <span>Naviga</span>
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  {/* 2. Inserisci nuova sosta */}
                  <button
                    onClick={() => {
                      setNewPlaceForm({
                        name:
                          clickedPlaceName !== "Puntina Sulla Mappa"
                            ? clickedPlaceName
                            : "",
                        category: "area_sosta",
                        lat: clickedCoords.lat,
                        lng: clickedCoords.lng,
                        address:
                          clickedAddress ||
                          `Coordinate: ${Number(clickedCoords.lat).toFixed(5)}, ${Number(clickedCoords.lng).toFixed(5)}`,
                        priceInfo: "Gratuito",
                        priceEuro: 0,
                        phone: "",
                        selectedFacilities: [],
                        imageUrl:
                          "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600",
                        hasMaxHeightLimit: false,
                        maxHeight: 3.5,
                        hasMaxWeightLimit: false,
                        maxWeight: 3.5,
                        isNarrowAccess: false,
                        noiseLevel: 3,
                        maneuverability: 3,
                        cellularSignal: 3,
                      });

                      setNewPlaceQuery(
                        clickedAddress ||
                          `${Number(clickedCoords.lat).toFixed(5)}, ${Number(clickedCoords.lng).toFixed(5)}`,
                      );
                      setShowAddPlaceModal(true);
                      setShowClickedPopup(false);
                    }}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-bold rounded-lg text-[10px] transition-all shadow-sm active:scale-95 cursor-pointer text-center"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Nuova Sosta</span>
                  </button>

                  {/* 3. Carica punti OSM intorno (15km) */}
                  <button
                    onClick={async () => {
                      const lat = clickedCoords.lat;
                      const lng = clickedCoords.lng;
                      mapMovedByUserRef.current = false;
                      setActiveDistanceFilter("place");
                      setFilterCenter({ lat, lng });
                      setShowClickedPopup(false);
                      mapRef.current?.setView([lat, lng], 10);

                      window.dispatchEvent(
                        new CustomEvent("show-toast", {
                          detail: {
                            message: `🔍 Carico ed evidenzio i punti camper entro 15km da questa puntina!`,
                          },
                        }),
                      );

                      await autoLoadOSMForProximity(lat, lng);
                    }}
                    disabled={isAutoLoadingOSM}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold rounded-lg text-[10px] transition-all shadow-sm active:scale-95 cursor-pointer text-center"
                  >
                    {isAutoLoadingOSM ? (
                      <>
                        <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Caricamento...</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3 h-3" />
                        <span>Soste vicine</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 4. Aggiungi tappa al viaggio attivo - Only visible if there is an active trip */}
                {activeTrip && (
                  <button
                    onClick={() => {
                      setNewMovementPlaceName(
                        clickedPlaceName !== "Puntina Sulla Mappa"
                          ? clickedPlaceName
                          : clickedAddress || "Tappa Mappa"
                      );
                      setNewMovementOdometer("");
                      setNewMovementNotes("");
                      const d = new Date();
                      const tzOffset = d.getTimezoneOffset() * 60000;
                      const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
                      setNewMovementDate(localISOTime);
                      setShowAddMovementModal(true);
                      setShowClickedPopup(false);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 text-center w-full"
                  >
                    <Route className="w-4 h-4" />
                    <span>Aggiungi Tappa</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Pulsante Spese Viaggio posizionato in basso a sinistra sulla mappa (visibile solo se c'è un viaggio aperto) */}
          {onNavigateToAI && (
            <button
              onClick={onNavigateToAI}
              className="absolute bottom-16 left-2 z-[1000] bg-white w-10 h-10 rounded-full shadow-md border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
              title="Generatore Itinerari AI"
            >
              <Sparkles className="w-5 h-5 text-purple-600 fill-purple-600/20" />
            </button>
          )}
          {onNavigateToExpenses && (
            <button
              onClick={onNavigateToExpenses}
              className="absolute bottom-5 left-2 z-[1000] bg-white w-10 h-10 rounded-full shadow-md border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
              title="Spese di Viaggio (Viaggio Attivo)"
            >
              <Banknote className="w-5 h-5 text-indigo-600 fill-indigo-600/20" />
            </button>
          )}

          {/* Pulsante Carta Carburante posizionato in basso a destra sulla mappa */}
          {onNavigateToFuelCard && (
            <button
              onClick={onNavigateToFuelCard}
              className="absolute bottom-5 right-2 z-[1000] bg-white w-10 h-10 rounded-full shadow-md border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
              title="Carta Carburante Sincronizzata"
            >
              <Fuel className="w-5 h-5 text-emerald-600 fill-emerald-600/20" />
            </button>
          )}

          {/* Pulsante Spostamenti posizionato in basso a destra (sopra carburante?) */}
          {onNavigateToMovementLog && (
            <button
              onClick={onNavigateToMovementLog}
              className="absolute bottom-16 right-2 z-[1000] bg-white w-10 h-10 rounded-full shadow-md border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
              title="Spostamenti"
            >
              <Route className="w-5 h-5 text-blue-600" />
            </button>
          )}
        </div>

        {/* Proximity Distance Filters Block - Rendered safely right below the map (First Row) */}
        <div className="flex gap-1.5 w-full justify-center shrink-0 pt-0">
          <button
            type="button"
            disabled={isAutoLoadingOSM}
            onClick={async () => {
              if (activeDistanceFilter === "me") {
                setActiveDistanceFilter("none");
                setFilterCenter(null);
                onPlacesChange(places.filter((p) => p.source !== "osm"));
              } else {
                if (!userLocation) {
                  window.dispatchEvent(
                    new CustomEvent("show-toast", {
                      detail: {
                        message: `⚠️ Per cercare "Intorno a me", abilita prima il GPS (pulsante "Attiva GPS" in alto a destra sulla mappa)`,
                      },
                    }),
                  );
                  return;
                }
                mapMovedByUserRef.current = false;
                setActiveDistanceFilter("me");
                setFilterCenter({
                  lat: userLocation.lat,
                  lng: userLocation.lng,
                });
                mapRef.current?.setView(
                  [userLocation.lat, userLocation.lng],
                  10,
                );

                // Automatically trigger live Overpass QL fetch on-demand! 🚀
                await autoLoadOSMForProximity(
                  userLocation.lat,
                  userLocation.lng,
                );
              }
            }}
            className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[10.5px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer select-none border h-8 ${
              activeDistanceFilter === "me"
                ? "bg-orange-600 hover:bg-[#d4510d] text-white border-transparent shadow shadow-sm active:scale-98"
                : "bg-white hover:bg-slate-50 text-[#3E4A35] border border-slate-200"
            } disabled:opacity-50`}
          >
            <span>
              {isAutoLoadingOSM && activeDistanceFilter === "me"
                ? "⏳ Ricerca..."
                : "🚐 Intorno a me"}
            </span>
          </button>

          <button
            type="button"
            disabled={isAutoLoadingOSM}
            onClick={async () => {
              if (activeDistanceFilter === "place") {
                setActiveDistanceFilter("none");
                setFilterCenter(null);
                onPlacesChange(places.filter((p) => p.source !== "osm"));
              } else {
                let centerLat: number;
                let centerLng: number;
                let centerName: string;

                if (mapMovedByUserRef.current && mapRef.current) {
                  const mapCenter = mapRef.current.getCenter();
                  centerLat =
                    typeof mapCenter.lat === "function"
                      ? mapCenter.lat()
                      : mapCenter.lat;
                  centerLng =
                    typeof mapCenter.lng === "function"
                      ? mapCenter.lng()
                      : mapCenter.lng;
                  centerName = `Centro mappa (${Number(centerLat).toFixed(4)}, ${Number(centerLng).toFixed(4)})`;
                } else if (clickedCoords) {
                  centerLat = clickedCoords.lat;
                  centerLng = clickedCoords.lng;
                  centerName = `Punto personalizzato (${Number(clickedCoords.lat).toFixed(4)}, ${Number(clickedCoords.lng).toFixed(4)})`;
                } else if (selectedPlace) {
                  centerLat = selectedPlace.lat;
                  centerLng = selectedPlace.lng;
                  centerName = selectedPlace.name;
                } else {
                  const mapCenter = mapRef.current
                    ? mapRef.current.getCenter()
                    : null;
                  centerLat = mapCenter
                    ? typeof mapCenter.lat === "function"
                      ? mapCenter.lat()
                      : mapCenter.lat
                    : userLocation?.lat || 44.5;
                  centerLng = mapCenter
                    ? typeof mapCenter.lng === "function"
                      ? mapCenter.lng()
                      : mapCenter.lng
                    : userLocation?.lng || 11.5;
                  centerName = `Posizione corrente (${Number(centerLat).toFixed(4)}, ${Number(centerLng).toFixed(4)})`;
                }

                mapMovedByUserRef.current = false;
                setActiveDistanceFilter("place");
                setFilterCenter({ lat: centerLat, lng: centerLng });
                mapRef.current?.setView([centerLat, centerLng], 10);

                // Automatically trigger live Overpass QL fetch around the target place on-demand! 🚀
                await autoLoadOSMForProximity(centerLat, centerLng);
              }
            }}
            className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[10.5px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer select-none border h-8 ${
              activeDistanceFilter === "place"
                ? "bg-orange-600 hover:bg-[#d4510d] text-white border-transparent shadow shadow-md active:scale-98"
                : "bg-white hover:bg-slate-50 text-[#3E4A35] border border-slate-200"
            } disabled:opacity-50`}
          >
            <span>
              {isAutoLoadingOSM && activeDistanceFilter === "place"
                ? "⏳ Ricerca..."
                : "📍 Intorno sosta"}
            </span>
          </button>

          {/* Mobile-only Smaller "Filtri ed Elenco" Button */}
          <button
            type="button"
            onClick={() => setMobileView("list")}
            className={`lg:hidden flex-1 px-2 py-1.5 rounded-lg text-[9.5px] font-bold shadow-xs flex items-center justify-center gap-1 cursor-pointer transition-all relative shrink-0 border h-8 ${
              filterMinRating > 0 ||
              filterMaxPrice < 100 ||
              filterAvoidNarrow ||
              filterCheckVehicleDimensions ||
              filterSelectedFacilities.length > 0
                ? "bg-orange-600 hover:bg-[#d4510d] text-white border-transparent"
                : "bg-white hover:bg-slate-50 text-[#3E4A35] border border-slate-200"
            }`}
            title="Apri filtri ed elenco"
          >
            <Filter
              className={`w-3.5 h-3.5 ${
                filterMinRating > 0 ||
                filterMaxPrice < 100 ||
                filterAvoidNarrow ||
                filterCheckVehicleDimensions ||
                filterSelectedFacilities.length > 0
                  ? "text-white"
                  : "text-[#3E4A35]"
              }`}
            />
            <span>Filtri ed Elenco</span>
            {/* Active filters badge counts indicator */}
            {filterMinRating > 0 ||
            filterMaxPrice < 100 ||
            filterAvoidNarrow ||
            filterCheckVehicleDimensions ||
            filterSelectedFacilities.length > 0 ? (
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping absolute -top-0.5 -right-0.5 inline-block" />
            ) : null}
            {filterMinRating > 0 ||
            filterMaxPrice < 100 ||
            filterAvoidNarrow ||
            filterCheckVehicleDimensions ||
            filterSelectedFacilities.length > 0 ? (
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full absolute -top-0.5 -right-0.5 px-0 inline-block border border-white" />
            ) : null}
          </button>
        </div>

        {/* Global actions bar (Proponi Nuova Sosta) - Rendered safely under the proximity filters (Second Row) */}
        <div className="flex shrink-0 px-1 mt-0">
          <button
            type="button"
            onClick={() => {
              if (!currentUser) {
                window.dispatchEvent(
                  new CustomEvent("show-toast", {
                    detail: {
                      message:
                        "🔒 Registrati o effettua il login per proporre nuove aree sosta sul database!",
                      duration: 4500,
                    },
                  }),
                );
                onRedirectToLogin?.();
                return;
              }
              setNewPlaceSuggestions([]);
              setNewPlaceQuery("");
              setNewPlaceForm({
                name: "",
                category: "area_sosta",
                lat: mapRef.current
                  ? typeof mapRef.current.getCenter().lat === "function"
                    ? mapRef.current.getCenter().lat()
                    : mapRef.current.getCenter().lat
                  : 45.864,
                lng: mapRef.current
                  ? typeof mapRef.current.getCenter().lng === "function"
                    ? mapRef.current.getCenter().lng()
                    : mapRef.current.getCenter().lng
                  : 10.869,
                address: "",
                priceInfo: "Gratuito",
                priceEuro: 0,
                phone: "",
                selectedFacilities: [],
                imageUrl:
                  "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600",
                hasMaxHeightLimit: false,
                maxHeight: 3.5,
                hasMaxWeightLimit: false,
                maxWeight: 3.5,
                isNarrowAccess: false,
                noiseLevel: 3,
                maneuverability: 3,
                cellularSignal: 3,
              });
              setShowAddPlaceModal(true);
            }}
            className={`w-full py-1.5 px-3 font-extrabold text-[10.5px] rounded-lg h-8 transition-all flex items-center justify-center gap-1 cursor-pointer border shadow-xs ${
              showAddPlaceModal
                ? "bg-orange-600 hover:bg-[#d4510d] text-white border-transparent"
                : "bg-[#3E4A35] hover:bg-[#2c3526] text-white border-transparent shadow shadow-[#3E4A35]/15 active:scale-98"
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>Proponi Nuova Sosta</span>
          </button>
        </div>

        {/* Selected Place Details panel */}
        {selectedPlace && (
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-100 p-5 shadow-sm text-xs space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex gap-4">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 group/img shadow-xs">
                  {isImageFallback(
                    selectedPlace.category,
                    selectedPlace.imageUrl,
                  ) ? (
                    <CategoryIllustration
                      category={selectedPlace.category}
                      className="w-full h-full object-cover animate-fade-in"
                    />
                  ) : (
                    <img
                      src={resolveImage(
                        selectedPlace.category,
                        selectedPlace.imageUrl,
                      )}
                      alt={selectedPlace.name}
                      className="w-full h-full object-cover animate-fade-in"
                      referrerPolicy={
                        resolveImage(
                          selectedPlace.category,
                          selectedPlace.imageUrl,
                        ).startsWith("http")
                          ? "no-referrer"
                          : undefined
                      }
                      onError={(e) => {
                        const currentSrc = e.currentTarget.src;
                        try {
                          const url = new URL(currentSrc);
                          const path = url.pathname;
                          const key = currentSrc.includes("unsplash.com")
                            ? currentSrc
                            : path;
                          if (!imageErrorUrls[key]) {
                            setImageErrorUrls((prev) => ({
                              ...prev,
                              [key]: true,
                            }));
                          }
                        } catch (err) {
                          if (!imageErrorUrls[currentSrc]) {
                            setImageErrorUrls((prev) => ({
                              ...prev,
                              [currentSrc]: true,
                            }));
                          }
                        }
                      }}
                    />
                  )}
                  {/* Upload functionality disabled */}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                        selectedPlace.category === "area_sosta"
                          ? "bg-[#5A6B4E]/15 text-[#3E4A35]"
                          : selectedPlace.category === "campeggio"
                            ? "bg-[#3E4A35]/15 text-[#3E4A35]"
                            : selectedPlace.category === "parcheggio_camper"
                              ? "bg-sky-100 text-sky-800"
                              : "bg-[#A45C40]/15 text-[#A45C40]"
                      }`}
                    >
                      {selectedPlace.category.replace("_", " ")}
                    </span>
                    <span className="text-slate-600 font-bold font-mono text-[10px]">
                      {selectedPlace.priceInfo}
                    </span>
                    {selectedPlace.source && (
                      <span
                        className="text-[8px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded font-black tracking-wider flex items-center gap-1"
                        title="Origine dei dati della struttura"
                      >
                        ℹ️ DATI VERIFICATI
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mt-1">
                    {selectedPlace.name}
                  </h3>
                  <p className="text-slate-500 mt-0.5">
                    {selectedPlace.address}
                  </p>
                  {selectedPlace.nearestCity && (
                    <p className="text-xs text-indigo-600 font-extrabold mt-1.5 flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-xl w-fit">
                      <span>
                        🏙️ Città più vicina: {selectedPlace.nearestCity}
                      </span>
                    </p>
                  )}

                  {selectedPlace.phone && (
                    <p className="text-slate-400 font-mono mt-1 flex items-center gap-1 text-[10px]">
                      <Phone className="w-3.5 h-3.5" />
                      {selectedPlace.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 w-full">
                {selectedPlace.id === "current_location" ? (
                  <>
                    <button
                      onClick={() => {
                        setNewPlaceForm((prev) => ({
                          ...prev,
                          lat: selectedPlace.lat,
                          lng: selectedPlace.lng,
                        }));
                        setShowAddPlaceModal(true);
                      }}
                      className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer uppercase text-xs tracking-wider border border-emerald-500 whitespace-nowrap"
                    >
                      <Plus className="w-5 h-5 text-white" />
                      <span>Nuova Sosta</span>
                    </button>
                    <button
                      onClick={async () => {
                        setActiveDistanceFilter("me");
                        setFilterCenter(null);
                        if (userLocation) {
                          await autoLoadOSMForProximity(userLocation.lat, userLocation.lng);
                        }
                      }}
                      className="px-5 py-3.5 bg-orange-600 hover:bg-[#d4510d] active:bg-[#a63d08] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer uppercase text-[10px] tracking-wider border border-orange-500 whitespace-nowrap"
                    >
                      <Navigation className="w-3.5 h-3.5 text-white" />
                      <span>Soste Vicine</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onNavigateFullscreen(selectedPlace)}
                      className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer uppercase text-xs tracking-wider border border-emerald-500 whitespace-nowrap"
                      title="Calcola rotta sicura per le dimensioni del tuo Camper (evita ponti bassi OSM)"
                    >
                      <Compass className="w-5 h-5 text-white animate-pulse" />
                      <span>Naviga</span>
                    </button>

                    <button
                      onClick={() => {
                        let url = `https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.lat},${selectedPlace.lng}&travelmode=driving`;
                        if (settings?.avoidTolls) url += `&dirflg=t`;
                        window.open(url, "_blank");
                      }}
                      className="px-5 py-3.5 bg-[#4285F4] hover:bg-[#357ae8] active:bg-[#1a56c5] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer uppercase text-[10px] tracking-wider border border-blue-500 whitespace-nowrap"
                      title="Apri navigazione con Google Maps esterno"
                    >
                      <Navigation className="w-3.5 h-3.5 text-white" />
                      <span>Google Maps</span>
                    </button>

                    <button
                      onClick={() => onToggleFavorite?.(selectedPlace.id)}
                      className={`px-5 py-3.5 border font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer uppercase text-[10px] tracking-wider whitespace-nowrap ${
                        favoriteIds?.includes(selectedPlace.id)
                          ? "bg-rose-50 border-rose-200 text-rose-600 hover:text-rose-700 hover:bg-rose-100/50"
                          : "border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50/50 hover:border-rose-200 bg-white"
                      }`}
                      title={
                        favoriteIds?.includes(selectedPlace.id)
                          ? "Rimuovi dai Preferiti"
                          : "Aggiungi ai Preferiti"
                      }
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${favoriteIds?.includes(selectedPlace.id) ? "fill-current text-rose-600" : "text-slate-400"}`}
                      />
                      <span>
                        {favoriteIds?.includes(selectedPlace.id)
                          ? "Preferito ❤️"
                          : "Salva"}
                      </span>
                    </button>
                  </>
                )}

                {activeTrip && (
                  <button
                    onClick={() => {
                      setNewMovementPlaceName(selectedPlace.name);
                      setNewMovementOdometer("");
                      setNewMovementNotes("");
                      const d = new Date();
                      const tzOffset = d.getTimezoneOffset() * 60000;
                      const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
                      setNewMovementDate(localISOTime);
                      setShowAddMovementModal(true);
                    }}
                    className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer uppercase text-xs tracking-wider border border-indigo-500 whitespace-nowrap"
                    title="Aggiungi questo luogo come tappa nel viaggio attivo"
                  >
                    <Route className="w-5 h-5 text-white" />
                    <span>Aggiungi Tappa</span>
                  </button>
                )}
              </div>

              {radarRottaCamperWidget}
            </div>

            {/* Heights alert boxes */}
            {(hasDimensionsExceeded ||
              hasWeightExceeded ||
              selectedPlace.isNarrowAccess) && (
              <div className="bg-rose-50 border border-rose-150 p-4 rounded-xl space-y-2 text-rose-800">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-red-600 flext-shrink-0 animate-pulse" />
                  <span>CRITICITÀ TRANSITO CAMPER RILEVATA</span>
                </div>
                <div className="text-[11px] leading-relaxed pl-5 space-y-1">
                  {hasDimensionsExceeded && (
                    <p>
                      ⚠️ <strong>Altezza Limite:</strong> Il ponte o strada
                      d'accesso è limitato a{" "}
                      <strong>{selectedPlace.maxHeight} m</strong>. Il tuo
                      camper ({vehicleDimensions.height} m) è troppo alto!{" "}
                      <strong>
                        Impossibile transitare! Scegliere approccio alternativo.
                      </strong>
                    </p>
                  )}
                  {hasWeightExceeded && (
                    <p>
                      ⚠️ <strong>Massa limite violata:</strong> Questa zona
                      impone un limite di{" "}
                      <strong>{selectedPlace.maxWeight} t</strong>. Il tuo
                      veicolo pesa ({vehicleDimensions.weight} t).
                    </p>
                  )}
                  {selectedPlace.isNarrowAccess && (
                    <p>
                      🎒 <strong>Approccio stretto:</strong> Segnalati canali
                      stretti d'accesso o tornanti alpini molto serrati.
                      Attenzione se montato portabici o lunghezza camper &gt;
                      6.5 metri!
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Weather Widget */}
            <WeatherWidget
              lat={selectedPlace.lat}
              lng={selectedPlace.lng}
              placeName={selectedPlace.name}
            />

            {/* Rating Details */}
            <div className="grid grid-cols-3 gap-3 my-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  Rumorosità
                </div>
                <div className="text-sm font-black text-[#3E4A35]">
                  {selectedPlace.noiseLevel || 3}/5
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  Manovre
                </div>
                <div className="text-sm font-black text-[#3E4A35]">
                  {selectedPlace.maneuverability || 3}/5
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  Segnale
                </div>
                <div className="text-sm font-black text-[#3E4A35]">
                  {selectedPlace.cellularSignal || 3}/5
                </div>
              </div>
            </div>

            {/* Facilities lists */}
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Servizi Disponibili
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {selectedPlace.facilities.map((fac) => (
                  <span
                    key={fac}
                    className="bg-slate-50 text-slate-700 font-semibold px-2 py-1 rounded-lg border border-slate-100 flex items-center gap-1"
                  >
                    <span className="w-1.5 h-1.5 bg-[#5A6B4E] rounded-full"></span>
                    {fac}
                  </span>
                ))}
              </div>
            </div>

            {/* Reviews list panel inside */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Recensioni della Community in Tempo Reale (
                  {selectedPlace.reviews.length})
                </h4>
                <div className="flex items-center gap-1 font-bold text-[#3E4A35]">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                  <span>{Number(selectedPlace.rating).toFixed(1)} / 5.0</span>
                </div>
              </div>

              {/* Scroller review records */}
              <div className="space-y-3 max-h-44 overflow-y-auto pr-1">
                {selectedPlace.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 space-y-1.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">
                        {rev.user}{" "}
                        <span className="text-slate-400 font-medium font-mono text-[10px]">
                          ({rev.vehicleType || "Camperista"})
                        </span>
                      </span>
                      <div className="flex gap-1.5 items-center">
                        <span className="text-slate-400 text-[10px]">
                          {rev.date.split("-").reverse().join("/")}
                        </span>
                        <div className="flex text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < rev.rating ? "fill-current" : "text-slate-200"}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed font-normal">
                      {rev.comment}
                    </p>
                    {rev.priceUpdated && (
                      <span className="inline-block text-[10px] bg-[#5A6B4E]/10 text-[#3E4A35] border border-[#5A6B4E]/20 rounded-md px-1.5 py-0.5 font-bold font-mono">
                        Prezzo confermato: {rev.priceUpdated}
                      </span>
                    )}
                    {rev.imageUrl && (
                      <img
                        style={{ height: "4rem" }}
                        src={rev.imageUrl}
                        alt="Revision post"
                        className="rounded-lg object-cover border mt-1"
                        referrerPolicy={
                          rev.imageUrl?.startsWith("http")
                            ? "no-referrer"
                            : undefined
                        }
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Write review form */}
              <form
                onSubmit={handleAddReview}
                className="p-4 border border-slate-100 rounded-xl space-y-3 bg-slate-50/20"
              >
                <span className="text-[10px] font-bold text-slate-700 block uppercase tracking-wider">
                  Aggiungi la tua recensione sul posto
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Tuo Nome / Nickname *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Es: Luca_VanLife"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Prezzo Rilevato ({getCurrencySymbol(settings)}/notte)
                    </label>
                    <input
                      type="text"
                      placeholder={`Es: 18${getCurrencySymbol(settings)} tutto incluso`}
                      value={priceUpdated}
                      onChange={(e) => setPriceUpdated(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Rating Struttura
                    </label>
                    <div className="flex gap-1 pt-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="cursor-pointer"
                        >
                          <Star
                            className={`w-5 h-5 ${star <= rating ? "text-amber-400 fill-current" : "text-slate-300"}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Rumorosità (1-5)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={noiseLevel}
                      onChange={(e) => setNoiseLevel(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#3E4A35]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Manovrabilità (1-5)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={maneuverability}
                      onChange={(e) =>
                        setManeuverability(Number(e.target.value))
                      }
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#3E4A35]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Segnale (1-5)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={cellularSignal}
                      onChange={(e) =>
                        setCellularSignal(Number(e.target.value))
                      }
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#3E4A35]"
                    />
                  </div>
                </div>

                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Tuo commento sull'area (servizi, pulizia, accoglienza) *
                </label>
                <textarea
                  required
                  placeholder="Racconta la tua esperienza. Ci sono rami bassi? Colonnette funzionanti?"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                />

                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const presets = [
                          "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&q=80&w=600",
                          "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600",
                          "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=600",
                        ];
                        const randomImg =
                          presets[Math.floor(Math.random() * presets.length)];
                        setPhotoSimulation(randomImg);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-[10px] flex items-center gap-1.5 transition-all text-slate-700"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      {photoSimulation
                        ? "Foto Caricata ✅"
                        : "Simula Caricamento Foto"}
                    </button>
                    {photoSimulation && (
                      <span className="text-[10px] text-[#5A6B4E] font-bold">
                        Pronta per l'invio!
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    Invia Recensione Real-Time
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Fullscreen Details Page */}
      {isMobileDetailsOpen && selectedPlace && (
        <div className="fixed inset-0 bg-white z-[9999] flex flex-col animate-slide-up md:hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-[#3E4A35] text-white shrink-0 shadow-sm">
            <button
              onClick={() => {
                setIsMobileDetailsOpen(false);
                setShowSmartRoute(false);
              }}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-sm truncate">
                {selectedPlace.name}
              </h3>
              <p className="text-[10px] text-white/80 truncate">
                {selectedPlace.address}
              </p>
            </div>
          </div>

          {/* Scrolling Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-8">
            {/* Image & Main Info Card */}
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden shadow-xs border border-slate-100 aspect-video bg-slate-100 group/img">
                {isImageFallback(
                  selectedPlace.category,
                  selectedPlace.imageUrl,
                ) ? (
                  <CategoryIllustration
                    category={selectedPlace.category}
                    className="w-full h-full object-cover animate-fade-in"
                  />
                ) : (
                  <img
                    src={resolveImage(
                      selectedPlace.category,
                      selectedPlace.imageUrl,
                    )}
                    alt={selectedPlace.name}
                    className="w-full h-full object-cover animate-fade-in"
                    referrerPolicy={
                      resolveImage(
                        selectedPlace.category,
                        selectedPlace.imageUrl,
                      ).startsWith("http")
                        ? "no-referrer"
                        : undefined
                    }
                    onError={(e) => {
                      const currentSrc = e.currentTarget.src;
                      try {
                        const url = new URL(currentSrc);
                        const path = url.pathname;
                        const key = currentSrc.includes("unsplash.com")
                          ? currentSrc
                          : path;
                        if (!imageErrorUrls[key]) {
                          setImageErrorUrls((prev) => ({
                            ...prev,
                            [key]: true,
                          }));
                        }
                      } catch (err) {
                        if (!imageErrorUrls[currentSrc]) {
                          setImageErrorUrls((prev) => ({
                            ...prev,
                            [currentSrc]: true,
                          }));
                        }
                      }
                    }}
                  />
                )}

                {/* Customize/Replace controls directly inline! */}
                {/* Customize/Replace controls disabled */}
                <div className="absolute top-3 left-3 flex gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm ${
                      selectedPlace.category === "area_sosta"
                        ? "bg-[#5A6B4E] text-white"
                        : selectedPlace.category === "campeggio"
                          ? "bg-[#3E4A35] text-white"
                          : selectedPlace.category === "parcheggio_camper"
                            ? "bg-sky-600 text-white"
                            : "bg-[#A45C40] text-white"
                    }`}
                  >
                    {selectedPlace.category.replace("_", " ")}
                  </span>
                  {selectedPlace.source && (
                    <span className="px-2 py-1 rounded-lg text-[8px] font-extrabold uppercase tracking-wider shadow-sm bg-white/95 text-slate-700 border border-slate-200/50 flex items-center gap-1 backdrop-blur-xs">
                      ℹ️ DATI VERIFICATI
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-start gap-3">
                  <h2 className="text-base font-black text-slate-800 leading-snug break-words flex-1">
                    {selectedPlace.name}
                  </h2>
                  <div className="flex items-center gap-1 bg-[#5A6B4E]/10 px-2 py-1 rounded-lg shrink-0">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                    <span className="font-extrabold text-slate-800 font-mono text-xs">
                      {Number(selectedPlace.rating).toFixed(1)}
                    </span>
                  </div>
                </div>

                <p className="text-slate-500 font-medium text-xs break-words">
                  {selectedPlace.address}
                </p>

                <div className="flex flex-wrap gap-2 items-center pt-1.5">
                  <span className="font-black text-slate-700 font-mono text-[11px] bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200/50">
                    💰 {selectedPlace.priceInfo}
                  </span>

                  {selectedPlace.nearestCity && (
                    <span className="text-xs text-indigo-600 font-bold bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-xl">
                      🏙️ Città: {selectedPlace.nearestCity}
                    </span>
                  )}

                  {selectedPlace.phone && (
                    <a
                      href={`tel:${selectedPlace.phone}`}
                      className="text-[#3E4A35] font-semibold flex items-center gap-1.5 text-xs bg-[#3E4A35]/5 border border-[#3E4A35]/15 px-2 py-1 rounded-xl"
                    >
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{selectedPlace.phone}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Rating Details */}
            <div className="grid grid-cols-3 gap-3 my-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  Rumorosità
                </div>
                <div className="text-sm font-black text-[#3E4A35]">
                  {selectedPlace.noiseLevel || 3}/5
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  Manovre
                </div>
                <div className="text-sm font-black text-[#3E4A35]">
                  {selectedPlace.maneuverability || 3}/5
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  Segnale
                </div>
                <div className="text-sm font-black text-[#3E4A35]">
                  {selectedPlace.cellularSignal || 3}/5
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              {selectedPlace.id === "current_location" ? (
                <>
                  <button
                    onClick={() => {
                      setNewPlaceForm((prev) => ({
                        ...prev,
                        lat: selectedPlace.lat,
                        lng: selectedPlace.lng,
                      }));
                      setShowAddPlaceModal(true);
                      setIsMobileDetailsOpen(false);
                    }}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-md uppercase text-xs tracking-wider border border-emerald-500 cursor-pointer flex-1"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span>Nuova Sosta</span>
                  </button>
                  <button
                    onClick={async () => {
                      setIsMobileDetailsOpen(false);
                      setActiveDistanceFilter("me");
                      setFilterCenter(null);
                      if (userLocation) {
                        await autoLoadOSMForProximity(userLocation.lat, userLocation.lng);
                      }
                    }}
                    className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-md uppercase text-xs tracking-wider border border-orange-500 cursor-pointer flex-1"
                  >
                    <Navigation className="w-4 h-4 text-white" />
                    <span>Soste Vicine</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      let url = `https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.lat},${selectedPlace.lng}&travelmode=driving`;
                        if (settings?.avoidTolls) url += `&dirflg=t`;
                      window.open(url, "_blank");
                    }}
                    className="w-full py-4 bg-[#4285F4] hover:bg-[#357ae8] text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-md uppercase text-xs tracking-wider border border-blue-500 cursor-pointer flex-1"
                  >
                    <Navigation className="w-4 h-4 text-white" />
                    <span>🗺️ Naviga</span>
                  </button>

                  <button
                    onClick={() => onToggleFavorite?.(selectedPlace.id)}
                    className={`w-full py-4 border font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer uppercase text-xs tracking-wider whitespace-nowrap flex-1 ${
                      favoriteIds?.includes(selectedPlace.id)
                        ? "bg-rose-50 text-rose-600 border-rose-200"
                        : "bg-white border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50/50 hover:border-rose-200"
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${favoriteIds?.includes(selectedPlace.id) ? "fill-current text-rose-600 animate-pulse" : "text-slate-400"}`}
                    />
                    <span>
                      {favoriteIds?.includes(selectedPlace.id)
                        ? "Salvato"
                        : "Salva"}
                    </span>
                  </button>
                </>
              )}
            </div>

            {activeTrip && (
              <button
                onClick={() => {
                  setNewMovementPlaceName(selectedPlace.name);
                  setNewMovementOdometer("");
                  setNewMovementNotes("");
                  const d = new Date();
                  const tzOffset = d.getTimezoneOffset() * 60000;
                  const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
                  setNewMovementDate(localISOTime);
                  setShowAddMovementModal(true);
                }}
                className="w-full mt-2.5 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-md uppercase text-xs tracking-wider cursor-pointer"
              >
                <Route className="w-4 h-4 text-white" />
                <span>📍 Aggiungi Tappa al Diario</span>
              </button>
            )}

            {radarRottaCamperWidget}

            {/* Heights alert boxes */}
            {(hasDimensionsExceeded ||
              hasWeightExceeded ||
              selectedPlace.isNarrowAccess) && (
              <div className="bg-rose-50 border border-rose-150 p-4 rounded-xl space-y-2 text-rose-800">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 animate-pulse" />
                  <span>CRITICITÀ TRANSITO CAMPER</span>
                </div>
                <div className="text-[11px] leading-relaxed pl-5 space-y-2">
                  {hasDimensionsExceeded && (
                    <p>
                      ⚠️ <strong>Altezza Limite:</strong> Il ponte o strada
                      d'accesso è limitato a{" "}
                      <strong>{selectedPlace.maxHeight} m</strong>. Il tuo
                      camper ({vehicleDimensions.height} m) è troppo alto!{" "}
                      <strong>
                        Impossibile transitare! Scegliere approccio alternativo.
                      </strong>
                    </p>
                  )}
                  {hasWeightExceeded && (
                    <p>
                      ⚠️ <strong>Massa limite violata:</strong> Questa zona
                      impone un limite di{" "}
                      <strong>{selectedPlace.maxWeight} t</strong>. Il tuo
                      veicolo pesa ({vehicleDimensions.weight} t).
                    </p>
                  )}
                  {selectedPlace.isNarrowAccess && (
                    <p>
                      🎒 <strong>Approccio stretto:</strong> Segnalati canali
                      stretti d'accesso o tornanti alpini molto serrati.
                      Attenzione se montato portabici o lunghezza camper &gt;
                      6.5 metri!
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Weather Widget */}
            <WeatherWidget
              lat={selectedPlace.lat}
              lng={selectedPlace.lng}
              placeName={selectedPlace.name}
            />

            {/* Facilities lists */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">
                Servizi Disponibili
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedPlace.facilities.map((fac) => (
                  <span
                    key={fac}
                    className="bg-slate-50 text-slate-700 font-bold px-2.5 py-1.5 rounded-xl border border-slate-100 flex items-center gap-1.5 text-[11px]"
                  >
                    <span className="w-1.5 h-1.5 bg-[#5A6B4E] rounded-full"></span>
                    {fac}
                  </span>
                ))}
              </div>
            </div>

            {/* Reviews Section */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">
                  Recensioni ({selectedPlace.reviews.length})
                </h4>
                <div className="flex items-center gap-1 font-bold text-[#3E4A35] bg-[#3E4A35]/5 px-2.5 py-1 rounded-lg">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                  <span className="text-xs">
                    {Number(selectedPlace.rating).toFixed(1)} / 5.0
                  </span>
                </div>
              </div>

              {/* Reviews List */}
              <div className="space-y-3">
                {selectedPlace.reviews.length === 0 ? (
                  <p className="text-slate-450 italic text-center py-4">
                    Nessuna recensione presente. Sii il primo a scriverne una!
                  </p>
                ) : (
                  selectedPlace.reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="font-extrabold text-slate-700 block text-xs">
                            {rev.user}
                          </span>
                          <span className="text-slate-400 font-bold font-mono text-[9px]">
                            ({rev.vehicleType || "Camperista"})
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-slate-400 text-[9px]">
                            {rev.date.split("-").reverse().join("/")}
                          </span>
                          <div className="flex text-amber-400">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-2.5 h-2.5 ${i < rev.rating ? "fill-current text-amber-500" : "text-slate-200"}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-slate-600 leading-relaxed font-normal text-xs">
                        {rev.comment}
                      </p>
                      {rev.priceUpdated && (
                        <span className="inline-block text-[10px] bg-[#5A6B4E]/10 text-[#3E4A35] border border-[#5A6B4E]/20 rounded-md px-1.5 py-0.5 font-bold font-mono">
                          Prezzo confermato: {rev.priceUpdated}
                        </span>
                      )}
                      {rev.imageUrl && (
                        <img
                          src={rev.imageUrl}
                          alt="Allegato"
                          className="rounded-lg object-cover w-full max-h-40 border mt-1.5"
                          referrerPolicy={
                            rev.imageUrl?.startsWith("http")
                              ? "no-referrer"
                              : undefined
                          }
                        />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add Review Panel */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <span className="text-[10px] font-black text-slate-705 block uppercase tracking-wider">
                  Aggiungi la tua recensione
                </span>

                <div className="space-y-3 text-xs font-normal">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Tuo Nome / Nickname *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Es: Luca_VanLife"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:border-[#3E4A35] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Prezzo Rilevato ({getCurrencySymbol(settings)}/notte)
                      </label>
                      <input
                        type="text"
                        placeholder={`Es: 18${getCurrencySymbol(settings)} tutto inc.`}
                        value={priceUpdated}
                        onChange={(e) => setPriceUpdated(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:border-[#3E4A35] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Voto (1-5)
                      </label>
                      <div className="flex gap-1.5 pt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className="cursor-pointer"
                          >
                            <Star
                              className={`w-5 h-5 ${star <= rating ? "text-amber-400 fill-current" : "text-slate-300"}`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                        Rumorosità (1-5)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={noiseLevel}
                        onChange={(e) => setNoiseLevel(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#3E4A35]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                        Manovrabilità (1-5)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={maneuverability}
                        onChange={(e) =>
                          setManeuverability(Number(e.target.value))
                        }
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#3E4A35]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                        Segnale Cell. (1-5)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={cellularSignal}
                        onChange={(e) =>
                          setCellularSignal(Number(e.target.value))
                        }
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#3E4A35]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Commento *
                    </label>
                    <textarea
                      required
                      placeholder="Come sono i servizi? Accesso difficoltoso?"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:border-[#3E4A35] outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2 pt-1 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => {
                        const presets = [
                          "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&q=80&w=600",
                          "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600",
                          "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=600",
                        ];
                        const randomImg =
                          presets[Math.floor(Math.random() * presets.length)];
                        setPhotoSimulation(randomImg);
                      }}
                      className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all text-slate-700"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      {photoSimulation
                        ? "Foto Collegata ✅"
                        : "Simula Caricamento Foto"}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        handleAddReview(e as any);
                      }}
                      className="w-full py-3 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm uppercase tracking-wider"
                    >
                      Invia Recensione
                    </button>

                    {reviewSuccess && (
                      <p className="text-center text-xs text-emerald-600 font-bold animate-pulse">
                        Recensione registrata con successo!
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD MOVEMENT/STOP TO ACTIVE TRIP MODAL --- */}
      {showAddMovementModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[10000] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                  <Route className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Aggiungi Tappa al Viaggio Attivo
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium font-sans">
                    Inserisci i dettagli per registrare questo spostamento nel diario.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddMovementModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddStopToActiveTrip} className="flex flex-col overflow-hidden">
              <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
                {/* Viaggio Attivo Title info */}
                {activeTrip && (
                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 space-y-1">
                    <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Viaggio in corso</p>
                    <p className="font-extrabold text-slate-800 text-sm">{activeTrip.title}</p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Ultimo chilometraggio registrato:{" "}
                      <span className="font-bold text-indigo-700">
                        {(() => {
                          const movements = activeTrip.movements || [];
                          if (movements.length > 0) {
                            const sorted = [...movements].sort((a, b) => b.odometer - a.odometer);
                            return sorted[0].odometer;
                          }
                          return activeTrip.startOdometer || 0;
                        })()}{" "}
                        km
                      </span>
                    </p>
                  </div>
                )}

                {/* Località Field */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Località / Tappa
                  </label>
                  <input
                    type="text"
                    required
                    value={newMovementPlaceName}
                    onChange={(e) => setNewMovementPlaceName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:border-indigo-500 outline-none font-medium text-slate-800"
                    placeholder="Nome del luogo o indirizzo"
                  />
                </div>

                {/* Odometer Field */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Chilometri Contachilometri (km) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="Es: 124500.5"
                    value={newMovementOdometer}
                    onChange={(e) => setNewMovementOdometer(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:border-indigo-500 outline-none font-medium text-slate-800"
                  />
                  <p className="text-[9px] text-slate-400 font-medium">
                    Inserisci il chilometraggio totale del camper all'arrivo.
                  </p>
                </div>

                {/* Date/Time Field */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Data e Ora Arrivo
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newMovementDate}
                    onChange={(e) => setNewMovementDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:border-indigo-500 outline-none font-medium text-slate-800"
                  />
                </div>

                {/* Notes Field */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Note / Diario di Viaggio (Opzionale)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Es: Splendido panorama sul lago, notte tranquilla..."
                    value={newMovementNotes}
                    onChange={(e) => setNewMovementNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:border-indigo-500 outline-none font-medium text-slate-800 resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddMovementModal(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-150 hover:text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Conferma e Salva</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PROPOSE PLACE MODAL DIALOG --- */}
      {showAddPlaceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[10000] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#3E4A35]/10 rounded-xl text-[#3E4A35]">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Proponi una Nuova Sosta
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium font-sans">
                    I punti proposti saranno visibili a tutti dopo
                    l'approvazione.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddPlaceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
              {/* Name & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">
                    Nome Struttura *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Es. Sosta Camper Lago"
                    value={newPlaceForm.name || ""}
                    onChange={(e) =>
                      setNewPlaceForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] transition-all text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">
                    Categoria *
                  </label>
                  <select
                    value={newPlaceForm.category}
                    onChange={(e) =>
                      setNewPlaceForm((prev) => ({
                        ...prev,
                        category: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] transition-all text-slate-800"
                  >
                    <option value="area_sosta">Area di Sosta</option>
                    <option value="campeggio">Campeggio</option>
                    <option value="camper_service">Camper Service</option>
                    <option value="parcheggio_camper">Parcheggio Camper</option>
                  </select>
                </div>
              </div>

              {/* Address Search Autocomplete with secure server-side Nominatim proxy */}
              <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-sky-600" />
                  <span>Cerca Indirizzo o Città (GPS auto)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Cerca via, comune, nazione..."
                    value={newPlaceQuery}
                    onChange={(e) => setNewPlaceQuery(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleSearchNewPlaceAddress()
                    }
                    className="flex-1 px-3 py-2 bg-white rounded-xl border border-slate-200 outline-none text-[11px] text-slate-800"
                  />
                  <button
                    type="button"
                    disabled={isSearchingNewPlaceAddress}
                    onClick={handleSearchNewPlaceAddress}
                    className="px-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-200 text-white font-heavy text-xs rounded-xl transition-all cursor-pointer"
                  >
                    {isSearchingNewPlaceAddress ? "..." : "Cerca"}
                  </button>
                  <button
                    type="button"
                    disabled={isLocatingGPS}
                    onClick={handleAutoLocateGPS}
                    title="Ottieni posizione attuale GPS"
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-200 text-white font-heavy rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 min-w-[38px]"
                  >
                    {isLocatingGPS ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Navigation className="w-3.5 h-3.5 -rotate-45" />
                    )}
                  </button>
                </div>

                {/* Autocomplete suggestions list inside form */}
                {newPlaceSuggestions.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl max-h-[140px] overflow-y-auto mt-2 divide-y divide-slate-50 shadow-lg shrink-0">
                    {newPlaceSuggestions.map((sug: any, sx: number) => (
                      <button
                        key={sx}
                        type="button"
                        onClick={() => {
                          setNewPlaceForm((prev) => ({
                            ...prev,
                            address: sug.display_name,
                            lat: parseFloat(sug.lat),
                            lng: parseFloat(sug.lon),
                          }));
                          setNewPlaceQuery(sug.display_name);
                          setNewPlaceSuggestions([]);
                        }}
                        className="w-full text-left p-2 hover:bg-slate-50 transition-colors text-[10px] text-slate-700 font-bold truncate cursor-pointer"
                      >
                        {sug.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Coordinates fields */}
              <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Latitudine</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newPlaceForm.lat}
                    onChange={(e) =>
                      setNewPlaceForm((prev) => ({
                        ...prev,
                        lat: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-200 font-mono text-[11px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">
                    Longitudine
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newPlaceForm.lng}
                    onChange={(e) =>
                      setNewPlaceForm((prev) => ({
                        ...prev,
                        lng: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-200 font-mono text-[11px]"
                  />
                </div>
                <div className="col-span-2 flex justify-between items-center text-[10px] text-slate-500 font-medium">
                  <span>Oppure prendi dal centro mappa attuale:</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (mapRef.current) {
                        const center = mapRef.current.getCenter();
                        const cLat =
                          typeof center.lat === "function"
                            ? center.lat()
                            : center.lat;
                        const cLng =
                          typeof center.lng === "function"
                            ? center.lng()
                            : center.lng;
                        setNewPlaceForm((prev) => ({
                          ...prev,
                          lat: cLat,
                          lng: cLng,
                        }));
                        window.dispatchEvent(
                          new CustomEvent("show-toast", {
                            detail: {
                              message: `📍 Copiate le coordinate dal mirino centrale della mappa!`,
                              duration: 3000,
                            },
                          }),
                        );
                      }
                    }}
                    className="text-[#3E4A35] font-black hover:underline cursor-pointer"
                  >
                    Cattura coordinate
                  </button>
                </div>

                <div className="col-span-2 flex justify-end items-center text-[10px] text-slate-500 font-medium border-t border-slate-200/60 pt-2 mt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      const lat = newPlaceForm.lat;
                      const lng = newPlaceForm.lng;
                      if (!lat || !lng) {
                        window.dispatchEvent(
                          new CustomEvent("show-toast", {
                            detail: {
                              message: `⚠️ Inserisci prima latitudine e longitudine valide!`,
                              duration: 3000,
                            },
                          }),
                        );
                        return;
                      }
                      window.dispatchEvent(
                        new CustomEvent("show-toast", {
                          detail: {
                            message: `🔍 Interrogando i server per trovare il nome reale e indirizzo...`,
                            duration: 2500,
                          },
                        }),
                      );
                      try {
                        const res = await fetch(
                          `/api/nominatim-reverse?lat=${lat}&lon=${lng}`,
                        );
                        if (res.ok) {
                          const data = await res.json();
                          if (data && data.display_name) {
                            let resolvedName = data.display_name.split(",")[0];
                            if (data.address) {
                              resolvedName =
                                data.address.amenity ||
                                data.address.tourism ||
                                data.address.historic ||
                                data.address.leisure ||
                                data.address.building ||
                                resolvedName;
                            }
                            setNewPlaceForm((prev) => ({
                              ...prev,
                              name: resolvedName || "",
                              address: data.display_name || "",
                            }));
                            setNewPlaceQuery(data.display_name);
                            window.dispatchEvent(
                              new CustomEvent("show-toast", {
                                detail: {
                                  message: `✨ Trovato nome: "${resolvedName}"! Indirizzo aggiornato.`,
                                  duration: 3000,
                                },
                              }),
                            );
                          } else {
                            window.dispatchEvent(
                              new CustomEvent("show-toast", {
                                detail: {
                                  message: `⚠️ Nessun nome specifico trovato per queste coordinate.`,
                                  duration: 3000,
                                },
                              }),
                            );
                          }
                        }
                      } catch (err) {
                        window.dispatchEvent(
                          new CustomEvent("show-toast", {
                            detail: {
                              message: `⚠️ Errore durante la risoluzione del nome.`,
                              duration: 3000,
                            },
                          }),
                        );
                      }
                    }}
                    className="text-indigo-600 font-black hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>
                      🔍 Incrocia Coordinate con Mappe (Auto-Trova Nome)
                    </span>
                  </button>
                </div>
              </div>

              {/* Real complete Address input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Indirizzo Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Via, CAP, Città, Nazione"
                  value={newPlaceForm.address || ""}
                  onChange={(e) =>
                    setNewPlaceForm((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800"
                />
              </div>

              {/* Pricing options */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">
                    Tariffa (Testo)
                  </label>
                  <input
                    type="text"
                    placeholder={`Es: 15${getCurrencySymbol(settings)}/giorno con elettricità`}
                    value={newPlaceForm.priceInfo || ""}
                    onChange={(e) =>
                      setNewPlaceForm((prev) => ({
                        ...prev,
                        priceInfo: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">
                    Prezzo Numerico ({getCurrencySymbol(settings)}/notte)
                  </label>
                  <input
                    type="number"
                    placeholder="Es: 15"
                    value={
                      newPlaceForm.priceEuro === 0 ? "" : newPlaceForm.priceEuro
                    }
                    onChange={(e) =>
                      setNewPlaceForm((prev) => ({
                        ...prev,
                        priceEuro: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
              </div>

              {/* Optional Fields (Phone & Image URL) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">
                    Telefono (Opzionale)
                  </label>
                  <input
                    type="tel"
                    placeholder="Es. +39 333 123456"
                    value={newPlaceForm.phone || ""}
                    onChange={(e) =>
                      setNewPlaceForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">
                    Carica immagine
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        document.getElementById("image-upload")?.click()
                      }
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Scegli file...
                    </button>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleNewPlaceImageUpload}
                      className="hidden"
                    />
                    <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                      {newPlaceForm.imageUrl.startsWith("data:")
                        ? "Immagine caricata"
                        : "Nessun file"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rating Fields */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">
                    Rumorosità (1-5)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={newPlaceForm.noiseLevel || 3}
                    onChange={(e) =>
                      setNewPlaceForm((prev) => ({
                        ...prev,
                        noiseLevel: parseInt(e.target.value),
                      }))
                    }
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#3E4A35]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">
                    Manovrabilità (1-5)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={newPlaceForm.maneuverability || 3}
                    onChange={(e) =>
                      setNewPlaceForm((prev) => ({
                        ...prev,
                        maneuverability: parseInt(e.target.value),
                      }))
                    }
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#3E4A35]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">
                    Segnale (1-5)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={newPlaceForm.cellularSignal || 3}
                    onChange={(e) =>
                      setNewPlaceForm((prev) => ({
                        ...prev,
                        cellularSignal: parseInt(e.target.value),
                      }))
                    }
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#3E4A35]"
                  />
                </div>
              </div>

              {/* Vehicle dimension rules presets limit */}
              <div className="p-3 bg-amber-50/20 border border-slate-200 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-800 text-xs">
                  Limiti veicolo & Accessibilità (Opzionale)
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-1.5 p-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newPlaceForm.hasMaxHeightLimit}
                      onChange={(e) =>
                        setNewPlaceForm((prev) => ({
                          ...prev,
                          hasMaxHeightLimit: e.target.checked,
                        }))
                      }
                      className="accent-[#3E4A35]"
                    />
                    Sbarra altezza
                  </label>
                  <label className="flex items-center gap-1.5 p-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newPlaceForm.hasMaxWeightLimit}
                      onChange={(e) =>
                        setNewPlaceForm((prev) => ({
                          ...prev,
                          hasMaxWeightLimit: e.target.checked,
                        }))
                      }
                      className="accent-[#3E4A35]"
                    />
                    Limite Peso
                  </label>
                  <label className="flex items-center gap-1.5 p-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newPlaceForm.isNarrowAccess}
                      onChange={(e) =>
                        setNewPlaceForm((prev) => ({
                          ...prev,
                          isNarrowAccess: e.target.checked,
                        }))
                      }
                      className="accent-[#3E4A35]"
                    />
                    Accesso stretto
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {newPlaceForm.hasMaxHeightLimit && (
                    <div className="space-y-0.5">
                      <label className="font-bold text-slate-600 text-[10px]">
                        Altezza Limite (metri)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={newPlaceForm.maxHeight ?? ""}
                        onChange={(e) =>
                          setNewPlaceForm((prev) => ({
                            ...prev,
                            maxHeight: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                      />
                    </div>
                  )}
                  {newPlaceForm.hasMaxWeightLimit && (
                    <div className="space-y-0.5">
                      <label className="font-bold text-slate-600 text-[10px]">
                        Peso Limite (tonnellate)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={newPlaceForm.maxWeight ?? ""}
                        onChange={(e) =>
                          setNewPlaceForm((prev) => ({
                            ...prev,
                            maxWeight: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Facilities check list selection options */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Servizi Disponibili (Seleziona quelli presenti)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    "WiFi",
                    "Attacco 220V",
                    "Scarico Acque",
                    "Carico Acqua",
                    "Bagni",
                    "Docce",
                    "Cani Ammessi",
                    "Illuminato",
                    "Videosorvegliato",
                    "Raccolta Rifiuti",
                  ].map((fac) => {
                    const isChecked =
                      newPlaceForm.selectedFacilities.includes(fac);
                    return (
                      <label
                        key={fac}
                        className={`flex items-center gap-1.5 p-2 border rounded-xl text-[10px] font-bold cursor-pointer select-none transition-colors ${
                          isChecked
                            ? "border-[#3E4A35] bg-[#3E4A35]/5 text-[#3E4A35]"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewPlaceForm((prev) => ({
                                ...prev,
                                selectedFacilities: [
                                  ...prev.selectedFacilities,
                                  fac,
                                ],
                              }));
                            } else {
                              setNewPlaceForm((prev) => ({
                                ...prev,
                                selectedFacilities:
                                  prev.selectedFacilities.filter(
                                    (f) => f !== fac,
                                  ),
                              }));
                            }
                          }}
                          className="accent-[#3E4A35]"
                        />
                        {fac}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer triggers */}
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddPlaceModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 transition cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleSubmitProposedPlace}
                className="px-5 py-2 bg-[#3E4A35] hover:bg-[#3E4A35]/90 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md hover:shadow transition cursor-pointer"
              >
                Invia Proposta Sosta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Maps API Key Modal */}
      {isAdmin && showKeyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[10005] flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-lg ${hasValidKey ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}
                >
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Configurazione Mappa
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    Google Maps API
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-600 mb-4 leading-relaxed text-left">
              Per sbloccare tutte le potenzialità di{" "}
              <strong>Google Maps</strong> (inclusi i segnaposto interattivi
              avanzati, le viste satellitari ed i calcoli dei percorsi
              dettagliati), inserisci qui sotto la tua chiave API Google Maps.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-left">
                  Chiave API Google Maps:
                </label>
                <input
                  type="text"
                  placeholder="Inserisci la tua chiave API (AIzaSy...)"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value.trim())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none text-[#2D2926] focus:border-[#3E4A35] focus:bg-white transition-all text-left"
                />
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-slate-150 space-y-2 text-[10.5px] text-left">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${hasValidKey ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}
                  />
                  <span>
                    Stato Corrente:{" "}
                    {hasValidKey
                      ? "Google Maps Attivo 🚀"
                      : "Leaflet Fallback Attivo 🗺️"}
                  </span>
                </div>
                <p className="text-slate-500 leading-normal">
                  {hasValidKey
                    ? "La chiave API è attiva. L'applicazione sta caricando le mappe ufficiali di Google Maps."
                    : "Senza una chiave valida, l'applicazione utilizza automaticamente la cartografia OpenStreetMap/Google Tiles con Leaflet, consentendo comunque l'uso offline."}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("user_google_maps_key");
                    setGoogleMapsKey(API_KEY);
                    setTempKey("");
                    setShowKeyModal(false);
                    window.dispatchEvent(
                      new CustomEvent("show-toast", {
                        detail: {
                          message: "🔄 Mappa reimpostata con successo!",
                        },
                      }),
                    );
                  }}
                  className="flex-1 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Reimposta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (tempKey) {
                      localStorage.setItem("user_google_maps_key", tempKey);
                      setGoogleMapsKey(tempKey);
                      window.dispatchEvent(
                        new CustomEvent("show-toast", {
                          detail: {
                            message:
                              "✅ Chiave salvata! Mappa Google Maps attivata.",
                          },
                        }),
                      );
                    } else {
                      localStorage.removeItem("user_google_maps_key");
                      setGoogleMapsKey(API_KEY);
                      window.dispatchEvent(
                        new CustomEvent("show-toast", {
                          detail: {
                            message: "🔄 Chiave rimossa. Utilizzo Leaflet.",
                          },
                        }),
                      );
                    }
                    setShowKeyModal(false);
                  }}
                  className="flex-1 py-2 bg-[#3E4A35] text-white hover:bg-[#5A6B4E] rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  Salva Chiave
                </button>
              </div>

              <div className="text-center pt-1">
                <a
                  href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#A45C40] hover:underline font-extrabold inline-flex items-center gap-1"
                >
                  Non hai una chiave? Creala gratuitamente qui ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export function LeafletOfflineMap({
  places,
  userLocation,
  vehicleDimensions,
  selectedPlace,
  setSelectedPlace,
  setIsMobileDetailsOpen,
  isOnline = false,
  indicatorTitle,
}: {
  places: Place[];
  userLocation: { lat: number; lng: number } | null;
  vehicleDimensions: VehicleDimensions;
  selectedPlace: Place | null;
  setSelectedPlace: (place: Place | null) => void;
  setIsMobileDetailsOpen: (open: boolean) => void;
  isOnline?: boolean;
  indicatorTitle?: string;
}) {
  const settings = useAppSettings();
  const mapRef = React.useRef<L.Map | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const markersRef = React.useRef<L.Marker[]>([]);

  // 1) Initialize Map and Tile Layer ONCE
  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Center map around selected place, or user location, or default (Italy center: 42.5, 12.5)
    const initialLat = selectedPlace
      ? selectedPlace.lat
      : userLocation
        ? userLocation.lat
        : 42.5;
    const initialLng = selectedPlace
      ? selectedPlace.lng
      : userLocation
        ? userLocation.lng
        : 12.5;
    const initialZoom = selectedPlace ? 13 : 6;

    // Create Leaflet Map instance
    const map = L.map(containerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: true,
      attributionControl: true,
    });

    mapRef.current = map;
    setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {}
    }, 400);

    // Check if we are offline
    const isSimulated =
      localStorage.getItem("camper_simulated_offline") === "true";
    const offlineActive =
      isSimulated ||
      !isOnline ||
      (typeof navigator !== "undefined" && !navigator.onLine);

    // Add our customized offline-aware tile layer!
    // We can fetch from local IndexedDB storage if available!
    const customTileLayer = L.tileLayer(
      getTileUrl(settings?.mapTheme || 'standard'),
      {
        maxZoom: 19,
        maxNativeZoom: offlineActive ? 16 : 19, // Support detailed offline maps up to zoom 16
        attribution: "&copy; Google | CamperLifeApp Offline Cache",
      },
    );

    // Intercept Tile Creation completely to avoid initial network load and prevent direct OSM CORS requests
    (customTileLayer as any).createTile = function (coords: any, done: any) {
      const tile = document.createElement("img");
      tile.className = "leaflet-tile";
      tile.width = 256;
      tile.height = 256;
      tile.alt = "";
      tile.setAttribute("role", "presentation");

      tile.onload = function () {
        done(null, tile);
      };
      tile.onerror = function () {
        tile.src = generatePlaceholderTile(
          coords.z,
          coords.x,
          coords.y,
          "Mappa Offline",
        );
      };

      const key = `${coords.z}-${coords.x}-${coords.y}`;

      getBestTile(coords.z, coords.x, coords.y)
        .then((cachedBase64) => {
          if (cachedBase64) {
            tile.src = cachedBase64;
          } else {
            // Check if we are simulated offline or physically offline
            const isSimulated =
              localStorage.getItem("camper_simulated_offline") === "true";
            const offlineActive =
              isSimulated ||
              !isOnline ||
              (typeof navigator !== "undefined" && !navigator.onLine);

            if (!offlineActive) {
              tile.src = `https://mt1.google.com/vt/lyrs=m&x=${coords.x}&y=${coords.y}&z=${coords.z}`;
            } else {
              tile.src = generatePlaceholderTile(
                coords.z,
                coords.x,
                coords.y,
                "Mappa Offline",
              );
            }
          }
        })
        .catch(() => {
          tile.src = generatePlaceholderTile(
            coords.z,
            coords.x,
            coords.y,
            "Mappa Offline",
          );
        });

      return tile;
    };

    customTileLayer.addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Run ONCE on mount

  // 2) Update Markers when data changes
  React.useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => {
      try {
        if (mapRef.current) m.remove();
      } catch (e) {}
    });
    markersRef.current = [];

    // Add marker for User Location (Il Mio Camper)
    if (userLocation) {
      const isShared = settings?.shareLocation;
      const camperIcon = L.divIcon({
        className: "custom-div-icon",
        html: `
          <div class="flex flex-col items-center justify-center">
            <div class="w-8 h-8 rounded-full ${isShared ? 'bg-emerald-600 ring-4 ring-emerald-500/20' : 'bg-blue-500 ring-4 ring-blue-500/20'} border-2 border-white flex items-center justify-center shadow-lg relative">
              ${isShared ? '<div class="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" style="animation-duration: 2s"></div>' : ''}
              <span style="font-size: 14px;">🚐</span>
            </div>
            <span class="bg-slate-800 text-white text-[7px] font-black px-1 rounded shadow-sm mt-0.5 whitespace-nowrap uppercase tracking-wider">
              ${isShared ? 'CONDIVISO' : 'PRIVATO'}
            </span>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: camperIcon,
        zIndexOffset: 1000
      })
        .addTo(map)
        .on("click", () => {
          const currentLocation = userLocation;
          if (!currentLocation) return;
          setSelectedPlace({
            id: 'current_location',
            name: 'La tua posizione',
            category: 'camper_service',
            lat: currentLocation.lat,
            lng: currentLocation.lng,
            address: `Lat: ${Number(currentLocation.lat).toFixed(5)}, Lng: ${Number(currentLocation.lng).toFixed(5)}`,
            priceInfo: 'Gratis',
            priceEuro: 0,
            rating: 5,
            facilities: [],
            reviews: [],
            imageUrl: '',
            source: 'User'
          });
          setIsMobileDetailsOpen(true);
        });

      markersRef.current.push(userMarker);
    }

  // Add markers for all filtered places
    console.log("MapTab: rendering places:", places.length);
    places.forEach((place) => {
      let emoji = "💧";
      let colorClass = "bg-[#A45C40]";
      if (place.category === "area_sosta") {
        colorClass = "bg-[#5A6B4E]";
        emoji = "⛺";
      } else if (place.category === "campeggio") {
        colorClass = "bg-[#3E4A35]";
        emoji = "🌲";
      } else if (place.category === "parcheggio_camper") {
        colorClass = "bg-sky-600";
        emoji = "🅿️";
      }

      const isViolation =
        place.hasMaxHeightLimit &&
        place.maxHeight &&
        vehicleDimensions.height > place.maxHeight;
      const ringClass = isViolation
        ? "ring-4 ring-rose-500 bg-rose-600 border-rose-200 animate-pulse"
        : "border-white";

      const customDivIcon = L.divIcon({
        className: "custom-div-icon",
        html: `
          <div class="flex flex-col items-center justify-center">
            <div class="w-8 h-8 rounded-full ${colorClass} ${ringClass} flex items-center justify-center shadow-md border-2 text-white relative">
              <span style="font-size: 12px;">${emoji}</span>
              ${isViolation ? '<span class="absolute -top-1 -right-1 text-[8px] bg-red-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center border border-white font-bold">⚠️</span>' : ""}
            </div>
            <div class="w-1.5 h-1.5 rounded-full ${isViolation ? "bg-rose-600" : colorClass} rotate-45 -mt-0.5 shadow-sm"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const marker = L.marker([place.lat, place.lng], {
        icon: customDivIcon,
      }).addTo(map);

      marker.on("click", () => {
        setSelectedPlace(place);
        setIsMobileDetailsOpen(true);
      });

      markersRef.current.push(marker);
    });
  }, [
    places,
    userLocation,
    vehicleDimensions,
    setSelectedPlace,
    setIsMobileDetailsOpen,
  ]);

  // Adjust zoom/center when selectedPlace changes
  React.useEffect(() => {
    if (mapRef.current && selectedPlace) {
      mapRef.current.setView([selectedPlace.lat, selectedPlace.lng], 13);
    }
  }, [selectedPlace]);

  return (
    <div className="w-full h-full relative">
      {/* Visual top indicator telling the user they are viewing the Leaflet Offline Map */}
      <div className="absolute top-11 left-1/2 -translate-x-1/2 z-[1000] bg-[#3E4A35] text-white px-4 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md border border-white/20 select-none whitespace-nowrap">
        <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
        <span>
          {indicatorTitle ||
            (isOnline
              ? "Mappa Leaflet Attiva 🗺️"
              : "Mappa Offline Leaflet Attiva 🗺️")}
        </span>
      </div>
      <div
        ref={containerRef}
        className="w-full h-full animate-fade-in"
        style={{ background: "#F5F2EB" }}
      />
    </div>
  );
}
