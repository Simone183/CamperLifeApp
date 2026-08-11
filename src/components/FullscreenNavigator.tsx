/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppSettings } from '../useAppSettings';
import { getTileUrl, getCurrencySymbol, parseDimToNumber, formatMeters } from '../unit-helpers';
import { Place, VehicleDimensions, OSMObstacle, NavigationStep } from '../types';
import maplibregl from 'maplibre-gl';
import { getTile, getBestTile, generatePlaceholderTile } from '../utils/offlineMapCache';
import { applyTtsVoiceAndPitch, speakSampleTts, TtsGender } from '../utils/ttsHelper';
import { 
  ArrowLeft, 
  Compass, 
  Volume2, 
  VolumeX, 
  AlertTriangle, 
  ShieldCheck, 
  MapPin, 
  Navigation, 
  RefreshCw, 
  Sliders, 
  ShieldAlert, 
  Check, 
  Route, 
  Map, 
  Activity, 
  TrendingUp, 
  ChevronRight, 
  ChevronLeft,
  AlertCircle,
  Maximize,
  Minimize,
  X,
  Play,
  Pause,
  Music,
  Settings,
  SkipForward,
  SkipBack,
  Radio,
  Gauge,
  Locate,
  Sun
} from 'lucide-react';
import CamperMediaPlayer from './CamperMediaPlayer';
import { requestScreenWakeLock, releaseScreenWakeLock } from '../utils/wakeLockHelper';

interface FullscreenNavigatorProps {
  dest: Place;
  navigationMode: 'google' | 'internal';
  vehicleDimensions: VehicleDimensions;
  onClose: () => void;
  userLocation: { lat: number; lng: number } | null;
  userAccuracy: number | null;
  isGPSEnabled: boolean;
  onGPSEnabledChange: (enabled: boolean) => void;
  places: Place[];
  onSelectPlaceDirectly: (place: Place) => void;
  currentUser?: { email: string; nickname?: string; name?: string; isModerator?: boolean } | null;
  onMinimizeChange?: (isMinimized: boolean) => void;
}

let globalLastSpokenText = "";
let globalLastSpokenTime = 0;

function getItalianOrdinalExit(exitNum: number | string | undefined): { word: string; abbreviation: string } {
  const num = typeof exitNum === 'number' ? exitNum : parseInt(String(exitNum || ''), 10);
  if (isNaN(num) || num <= 0) return { word: "uscita", abbreviation: "uscita" };
  const ordinals: Record<number, string> = {
    1: "prima",
    2: "seconda",
    3: "terza",
    4: "quarta",
    5: "quinta",
    6: "sesta",
    7: "settima",
    8: "ottava",
    9: "nona",
    10: "decima"
  };
  const word = ordinals[num] || `${num}ª`;
  return {
    word: `${word} uscita`,
    abbreviation: `${num}ª uscita`
  };
}

export default function FullscreenNavigator({
  dest,
  navigationMode,
  vehicleDimensions,
  onClose,
  userLocation,
  userAccuracy,
  isGPSEnabled,
  onGPSEnabledChange,
  places,
  onSelectPlaceDirectly,
  currentUser = null,
  onMinimizeChange,
}: FullscreenNavigatorProps) {
  const settings = useAppSettings();
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const hasInitiallyFitBounds = React.useRef(false);
  const hasInitiallyFitPreviewBounds = React.useRef(false);
  const mapRef = React.useRef<maplibregl.Map | null>(null);
  const poiMarkersRef = React.useRef<maplibregl.Marker[]>([]);
  const carMarkerRef = React.useRef<maplibregl.Marker | null>(null);
  const markerAnimFrameRef = React.useRef<number | null>(null);
  const destMarkerRef = React.useRef<maplibregl.Marker | null>(null);

  const [nearbyPlaces, setNearbyPlaces] = React.useState<{ place: Place; minDistance: number }[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState<boolean>(true);
  const [showStopsOnRoute, setShowStopsOnRoute] = React.useState<boolean>(false);
  const [showOsmObstacles, setShowOsmObstacles] = React.useState<boolean>(true);
  const [autoCenter, setAutoCenter] = React.useState<boolean>(true);

  const [voiceEnabled, setVoiceEnabled] = React.useState<boolean>(false);
  const [speed, setSpeed] = React.useState<number>(80); // km/h
  const [currentDetectedSpeed, setCurrentDetectedSpeed] = React.useState<number | null>(null);

  // Tunnel / Dead Reckoning Mode state (cruise speed 90 km/h when GPS signal is lost inside tunnels)
  const [isTunnelDeadReckoning, setIsTunnelDeadReckoning] = React.useState<boolean>(false);
  const [tunnelStepTick, setTunnelStepTick] = React.useState<number>(0);
  const lastGpsUpdateRef = React.useRef<{ lat: number; lng: number; time: number } | null>(null);
  const vehicleHeadingRef = React.useRef<number | null>(null);
  const tunnelRouteIndexRef = React.useRef<number>(0);
  const wasInTunnelRef = React.useRef<boolean>(false);

  // Mantiene lo schermo attivo per tutta la durata della navigazione per evitare lo standby del telefono
  React.useEffect(() => {
    requestScreenWakeLock();

    // Re-acquire wake lock on click/touch anywhere on screen if released by system
    const handleUserInteraction = () => {
      requestScreenWakeLock();
    };

    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      releaseScreenWakeLock();
    };
  }, []);

  // Real-time GPS speed tracking
  React.useEffect(() => {
    if (!isGPSEnabled || typeof window === 'undefined' || !('geolocation' in navigator)) {
      setCurrentDetectedSpeed(null);
      return;
    }

    let lastPos: { lat: number; lng: number; timestamp: number } | null = null;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (pos.coords.speed !== null && pos.coords.speed !== undefined && !isNaN(pos.coords.speed) && pos.coords.speed >= 0) {
          const kmh = Math.round(pos.coords.speed * 3.6);
          setCurrentDetectedSpeed(kmh);
        } else {
          const now = pos.timestamp || Date.now();
          if (lastPos) {
            const dtSeconds = (now - lastPos.timestamp) / 1000;
            if (dtSeconds > 0.5) {
              const distKm = calculateHaversineDistance(
                [lastPos.lat, lastPos.lng],
                [pos.coords.latitude, pos.coords.longitude]
              );
              const kmh = Math.round((distKm / dtSeconds) * 3600);
              if (distKm * 1000 < 1.5) {
                setCurrentDetectedSpeed(0);
              } else if (kmh < 220) {
                setCurrentDetectedSpeed(kmh);
              }
            }
          } else {
            setCurrentDetectedSpeed(0);
          }
          lastPos = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: now };
        }
      },
      (err) => {
        console.warn("GPS speed watcher warning:", err);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 1000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isGPSEnabled]);

  React.useEffect(() => {
    const style = settings?.drivingStyle || "relax";
    const isHeavy = parseDimToNumber(vehicleDimensions?.weight) > 3.5;
    let targetSpeed = 80;
    if (style === "relax") {
      targetSpeed = isHeavy ? 60 : 70;
    } else if (style === "eco") {
      targetSpeed = isHeavy ? 65 : 80;
    } else if (style === "veloce") {
      targetSpeed = isHeavy ? 80 : 95;
    }
    setSpeed(targetSpeed);
  }, [settings?.drivingStyle, vehicleDimensions?.weight]);
  const [isPreview, setIsPreview] = React.useState<boolean>(true);
  const [isMinimized, setIsMinimized] = React.useState<boolean>(false);
  const handleSetMinimized = (val: boolean) => {
    setIsMinimized(val);
    if (onMinimizeChange) {
      onMinimizeChange(val);
    }
  };
  const [simStep, setSimStep] = React.useState<number>(0);

  // Function to initialize or recreate MapLibre map instance cleanly without triggering React re-renders
  const initMapInstance = React.useCallback(() => {
    if (!mapContainerRef.current) return;

    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (e) {}
      mapRef.current = null;
    }

    const mapStyle: any = {
      version: 8,
      sources: {
        'raster-tiles': {
          type: 'raster',
          tiles: ["/api/map-tile/{z}/{x}/{y}?lyrs=m"],
          tileSize: 256,
          attribution: 'Dati cartografici © contributori di OpenStreetMap © CARTO',
          maxzoom: 18
        }
      },
      layers: [
        {
          id: 'simple-tiles',
          type: 'raster',
          source: 'raster-tiles',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    };

    const initialCenter: [number, number] = displayedRouteCoordinates[0] 
      ? [displayedRouteCoordinates[0][1], displayedRouteCoordinates[0][0]] 
      : [startLoc[1], startLoc[0]];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: initialCenter,
      zoom: 14,
      pitch: 0,
      bearing: 0,
      attributionControl: false
    });

    mapRef.current = map;

    map.on('load', () => {
      addRouteLayer(map, displayedRouteCoordinates);
    });

    map.on('contextmenu', (e: maplibregl.MapMouseEvent) => {
      const pLat = e.lngLat.lat;
      const pLng = e.lngLat.lng;
      
      const customPlace: Place = {
        id: `custom-point-${Date.now()}`,
        name: "Punto Sulla Mappa",
        category: "area_sosta",
        lat: pLat,
        lng: pLng,
        address: `Coordinate: ${Number(pLat).toFixed(5)}, ${Number(pLng).toFixed(5)}`,
        priceInfo: "Gratuito",
        priceEuro: 0,
        rating: 5,
        facilities: ["Carico acqua", "Scarico reflui"],
        reviews: [],
        imageUrl: "https://images.unsplash.com/photo-1523987355523-c29fbf7cf313?auto=format&fit=crop&q=80&w=400",
        source: 'inserito_a_mano',
        maxHeight: 4.0,
        maxWeight: 5.0,
        isNarrowAccess: false
      };
      
      speakInstruction("Ricalcolo rotta verso il punto selezionato sulla mappa. Avvio navigatore.");
      
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: `📍 Navigazione avviata per: ${Number(pLat).toFixed(4)}, ${Number(pLng).toFixed(4)}` }
      }));
      
      onSelectPlaceRef.current(customPlace);
      setSimStep(0);
      setSimRouteIndex(0);
      setIsDriving(true);
      setAutoCenter(true);
    });

    map.on('dragstart', (e: any) => {
      if (e && e.originalEvent) {
        setAutoCenter(false);
      }
    });

    map.on('zoomstart', (e: any) => {
      if (e && e.originalEvent) {
        setAutoCenter(false);
      }
    });

    const canvas = map.getCanvas();
    const handleContextLost = (e: Event) => {
      console.warn("[FullscreenNavigator] WebGL context lost - preventing default");
      e.preventDefault();
    };
    const handleContextRestored = () => {
      console.log("[FullscreenNavigator] WebGL context restored");
      if (mapRef.current) {
        try {
          mapRef.current.resize();
          mapRef.current.triggerRepaint();
          addRouteLayer(mapRef.current, displayedRouteCoordinates);
        } catch (e) {}
      }
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);
  }, []);

  // Initialize MapLibre GL map on mount
  React.useEffect(() => {
    initMapInstance();

    return () => {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (e) {}
        mapRef.current = null;
      }
    };
  }, [initMapInstance]);

  // Handle restoring map canvas when leaving minimized mode
  React.useEffect(() => {
    if (!isMinimized) {
      if (!mapRef.current) {
        initMapInstance();
      } else {
        const map = mapRef.current;
        const canvas = map.getCanvas();
        const gl = canvas?.getContext('webgl') || canvas?.getContext('webgl2');

        if (!gl || gl.isContextLost()) {
          console.warn("[FullscreenNavigator] WebGL context lost or missing on restore, recreating map instance...");
          initMapInstance();
        } else {
          const doResize = () => {
            try {
              map.resize();
              map.triggerRepaint();
              addRouteLayer(map, displayedRouteCoordinates);
              if (autoCenter && userLocation) {
                map.jumpTo({
                  center: [userLocation.lng, userLocation.lat]
                });
              }
            } catch (e) {
              console.warn("[FullscreenNavigator] Map restore resize error:", e);
            }
          };

          doResize();

          const raf1 = requestAnimationFrame(doResize);
          const raf2 = requestAnimationFrame(() => requestAnimationFrame(doResize));
          const timer1 = setTimeout(doResize, 50);
          const timer2 = setTimeout(doResize, 150);
          const timer3 = setTimeout(doResize, 300);
          const timer4 = setTimeout(doResize, 600);

          return () => {
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
            clearTimeout(timer4);
          };
        }
      }
    }
  }, [isMinimized, initMapInstance]);

  // Observer & event listeners to recover map canvas on container resize, tab switch or window focus
  React.useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const handleResizeOrRepaint = () => {
      if (mapRef.current) {
        try {
          const map = mapRef.current;
          map.resize();
          map.triggerRepaint();
        } catch (e) {
          // ignore
        }
      }
    };

    const observer = new ResizeObserver(() => {
      handleResizeOrRepaint();
    });
    observer.observe(container);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleResizeOrRepaint();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleResizeOrRepaint);
    window.addEventListener('resize', handleResizeOrRepaint);

    return () => {
      observer.disconnect();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleResizeOrRepaint);
      window.removeEventListener('resize', handleResizeOrRepaint);
    };
  }, []);
  const [simRouteIndex, setSimRouteIndex] = React.useState<number>(0);
  const [isDriving, setIsDriving] = React.useState<boolean>(true);
  const [customError, setCustomError] = React.useState<string | null>(null);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = React.useState<boolean>(false);
  const [isMapFullscreenMode, setIsMapFullscreenMode] = React.useState<boolean>(true);
  const [isAndroidAutoMode, setIsAndroidAutoMode] = React.useState<boolean>(false);
  const [favoriteIdsSet, setFavoriteIdsSet] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('camper_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [bearing, setBearing] = React.useState<number>(0);
  const [deviceHeading, setDeviceHeading] = React.useState<number | null>(null);
  const [compassPermission, setCompassPermission] = React.useState<'default' | 'granted' | 'denied'>('default');
  const [useCompass, setUseCompass] = React.useState<boolean>(false);
  const [isMusicPlayerOpen, setIsMusicPlayerOpen] = React.useState<boolean>(false);
  const [isAudioPlaying, setIsAudioPlaying] = React.useState<boolean>(false);

  // Media state synchronized from CamperMediaPlayer
  const [mediaState, setMediaState] = React.useState<{
    isPlaying: boolean;
    currentTrack: any;
    isLoading: boolean;
    hasError: boolean;
    sourceMode: string;
    hasTrack: boolean;
  }>({
    isPlaying: false,
    currentTrack: null,
    isLoading: false,
    hasError: false,
    sourceMode: "radio",
    hasTrack: false
  });

  const [hasBeenPlayed, setHasBeenPlayed] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (mediaState.isPlaying) {
      setHasBeenPlayed(true);
    }
  }, [mediaState.isPlaying]);

  React.useEffect(() => {
    const handleStateChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setMediaState(customEvent.detail);
      }
    };

    const handleStopped = () => {
      setHasBeenPlayed(false);
    };

    window.addEventListener("camper-media-state", handleStateChange);
    window.addEventListener("camper-media-stopped", handleStopped);
    
    // Request initial state on mount
    const reqEvent = new CustomEvent("camper-media-request-state");
    window.dispatchEvent(reqEvent);

    return () => {
      window.removeEventListener("camper-media-state", handleStateChange);
      window.removeEventListener("camper-media-stopped", handleStopped);
    };
  }, []);

  const sendPrevCommand = () => {
    window.dispatchEvent(new CustomEvent("camper-media-command", { detail: { action: "prev" } }));
  };

  const sendPlayPauseCommand = () => {
    window.dispatchEvent(new CustomEvent("camper-media-command", { detail: { action: "togglePlay" } }));
  };

  const sendNextCommand = () => {
    window.dispatchEvent(new CustomEvent("camper-media-command", { detail: { action: "next" } }));
  };

  // --- FUEL COST LOGS & ESTIMATES ---
  const [fuelLogs, setFuelLogs] = React.useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('camper_last_fuel_logs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  React.useEffect(() => {
    if (!currentUser?.email) return;
    const fetchFuelLogs = async () => {
      try {
        const res = await fetch(`/api/fuel-logs/${encodeURIComponent(currentUser.email)}`);
        if (res.ok) {
          const data = await res.json();
          setFuelLogs(data);
          try {
            localStorage.setItem('camper_last_fuel_logs', JSON.stringify(data));
          } catch (e) {}
        }
      } catch (err) {
        console.warn("[FullscreenNavigator] Failed to fetch fuel logs:", err);
      }
    };
    fetchFuelLogs();
  }, [currentUser]);

  const getCamperFuelStats = () => {
    let lastPrice = 1.80; // standard default
    let hasRealPrice = false;
    let hasRealConsumption = false;
    let consumptionKmPerL = 10; // standard default

    const style = settings?.drivingStyle || "relax";
    if (style === "relax") {
      consumptionKmPerL = 11;
    } else if (style === "eco") {
      consumptionKmPerL = 12.5;
    } else if (style === "veloce") {
      consumptionKmPerL = 9;
    }

    if (fuelLogs && fuelLogs.length > 0) {
      const sortedByDate = [...fuelLogs].sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0).getTime();
        const dateB = new Date(b.date || b.createdAt || 0).getTime();
        return dateB - dateA; // descending
      });

      if (sortedByDate.length > 0) {
        lastPrice = sortedByDate[0].pricePerLiter;
        hasRealPrice = true;
      }

      const sortedByOdo = [...fuelLogs]
        .filter(l => typeof l.odometer === 'number' && l.odometer > 0)
        .sort((a, b) => a.odometer - b.odometer);

      if (sortedByOdo.length >= 2) {
        const startOdo = sortedByOdo[0].odometer;
        const endOdo = sortedByOdo[sortedByOdo.length - 1].odometer;
        const distanceCovered = endOdo - startOdo;
        const litersBurned = sortedByOdo.slice(1).reduce((sum, l) => sum + (l.liters || 0), 0);

        if (distanceCovered > 0 && litersBurned > 0) {
          consumptionKmPerL = distanceCovered / litersBurned;
          hasRealConsumption = true;
        }
      }
    }

    return {
      lastPrice,
      consumptionKmPerL,
      hasRealPrice,
      hasRealConsumption
    };
  };

  const getCompassDirection = (deg: number | null) => {
    if (deg === null) return "N";
    const index = Math.round(deg / 45) % 8;
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return directions[index];
  };

  // We will listen to device orientation events.
  const startCompassListener = React.useCallback(() => {
    let hasAbsoluteFired = false;
    let lastHeading = -1;
    let lastUpdate = 0;

    const updateHeading = (heading: number) => {
      const now = Date.now();
      const h = Math.round(heading);
      
      if (lastHeading === -1) {
        setDeviceHeading(h);
        lastHeading = h;
        lastUpdate = now;
        return;
      }

      let diff = Math.abs(h - lastHeading);
      if (diff > 180) diff = 360 - diff;

      // Update if changed by at least 3 degrees to avoid micro-jitters,
      // AND throttle to max 1 update per 400ms so map.easeTo has time to complete
      if (diff >= 2 || (now - lastUpdate > 1000)) {
        if (now - lastUpdate > 400) {
          setDeviceHeading(h);
          lastHeading = h;
          lastUpdate = now;
        }
      }
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      let heading: number | null = null;
      
      // iOS
      if ('webkitCompassHeading' in event) {
        heading = (event as any).webkitCompassHeading;
      } else if (event.alpha !== null && event.alpha !== undefined) {
        // If deviceorientationabsolute already fired, ignore this relative one to prevent jumping
        if (hasAbsoluteFired) return;
        heading = (360 - event.alpha) % 360;
      }

      if (heading !== null && heading !== undefined) {
        updateHeading(heading);
      }
    };

    const handleAbsoluteOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null && event.alpha !== undefined) {
        hasAbsoluteFired = true; // prevent relative fallback from firing
        const heading = (360 - event.alpha) % 360;
        updateHeading(heading);
      }
    };

    window.addEventListener('deviceorientationabsolute', handleAbsoluteOrientation as EventListener);
    window.addEventListener('deviceorientation', handleOrientation as EventListener);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleAbsoluteOrientation as EventListener);
      window.removeEventListener('deviceorientation', handleOrientation as EventListener);
    };
  }, []);

  const requestCompassPermission = async () => {
    if (typeof window === 'undefined') return false;

    // Check iOS first
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setCompassPermission('granted');
          startCompassListener();
          return true;
        } else {
          setCompassPermission('denied');
          return false;
        }
      } catch (err) {
        console.error('Error requesting compass permission:', err);
        setCompassPermission('denied');
        return false;
      }
    } else {
      // Android / Desktop - doesn't require explicit popup permission, start listener immediately
      setCompassPermission('granted');
      startCompassListener();
      return true;
    }
  };

  // Automatically start listening on Android and non-iOS systems where requestPermission is not a function
  React.useEffect(() => {
    const hasiOSPermissionReq = typeof DeviceOrientationEvent !== 'undefined' && 
      typeof (DeviceOrientationEvent as any).requestPermission === 'function';
    
    if (!hasiOSPermissionReq) {
      const cleanup = startCompassListener();
      setCompassPermission('granted');
      return cleanup;
    }
  }, [startCompassListener]);

  // Handle first interaction for silent permission promotion on iOS
  React.useEffect(() => {
    const handleFirstInteractionGlobal = async () => {
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof (DeviceOrientationEvent as any).requestPermission === 'function' &&
        compassPermission === 'default'
      ) {
        try {
          const response = await (DeviceOrientationEvent as any).requestPermission();
          if (response === 'granted') {
            setCompassPermission('granted');
            startCompassListener();
          }
        } catch (err) {
          console.warn('Silent iOS orientation request deferred:', err);
        }
      }
      window.removeEventListener('touchstart', handleFirstInteractionGlobal);
      window.removeEventListener('click', handleFirstInteractionGlobal);
    };

    window.addEventListener('touchstart', handleFirstInteractionGlobal);
    window.addEventListener('click', handleFirstInteractionGlobal);

    return () => {
      window.removeEventListener('touchstart', handleFirstInteractionGlobal);
      window.removeEventListener('click', handleFirstInteractionGlobal);
    };
  }, [compassPermission, startCompassListener]);

  const [osmObstacles, setOsmObstacles] = React.useState<OSMObstacle[]>([]);
  const [scanningObstacles, setScanningObstacles] = React.useState<boolean>(false);
  const osmObstacleMarkersRef = React.useRef<maplibregl.Marker[]>([]);

  // Calculation of heading bearing direction
  const getBearing = (start: [number, number], end: [number, number]) => {
    const rad = Math.PI / 180;
    const lat1 = start[0] * rad;
    const lat2 = end[0] * rad;
    const lon1 = start[1] * rad;
    const lon2 = end[1] * rad;
    
    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const brng = Math.atan2(y, x) / rad;
    return (brng + 360) % 360;
  };

  // Helper to calculate distance between two coordinates in km using Haversine formula
  const calculateHaversineDistance = (p1: [number, number], p2: [number, number]): number => {
    const R = 6371; // Earth radius in km
    const dLat = (p2[0] - p1[0]) * Math.PI / 180;
    const dLon = (p2[1] - p1[1]) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Helper to calculate minimum distance from user coordinate to polyline in meters (using point-to-segment perpendicular distance)
  const calculateDistanceToPolylineMeters = React.useCallback((p: [number, number], polyline: [number, number][]): number => {
    if (!polyline || polyline.length === 0) return Infinity;
    if (polyline.length === 1) return calculateHaversineDistance(p, polyline[0]) * 1000;

    const latP = p[0];
    const lngP = p[1];
    const cosLat = Math.cos((latP * Math.PI) / 180);

    let minMeters = Infinity;

    for (let i = 0; i < polyline.length - 1; i++) {
      const a = polyline[i];
      const b = polyline[i + 1];

      // Convert coordinates to local meters relative to point A
      const vx = (b[1] - a[1]) * 111000 * cosLat;
      const vy = (b[0] - a[0]) * 111000;

      const ux = (lngP - a[1]) * 111000 * cosLat;
      const uy = (latP - a[0]) * 111000;

      const lenSq = vx * vx + vy * vy;
      let t = 0;
      if (lenSq > 0) {
        t = (ux * vx + uy * vy) / lenSq;
        if (t < 0) t = 0;
        else if (t > 1) t = 1;
      }

      const projX = ux - t * vx;
      const projY = uy - t * vy;
      const distMeters = Math.sqrt(projX * projX + projY * projY);

      if (distMeters < minMeters) {
        minMeters = distMeters;
      }
    }

    return minMeters;
  }, []);

  const findClosestCoordinateIndex = (targetLoc: [number, number], coords: [number, number][]): number => {
    if (coords.length === 0) return 0;
    let closestIdx = 0;
    let minDist = calculateHaversineDistance(targetLoc, coords[0]);
    for (let i = 1; i < coords.length; i++) {
      const dist = calculateHaversineDistance(targetLoc, coords[i]);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }
    return closestIdx;
  };

  const getDistanceToCoordinateIndex = (coords: [number, number][], fromIdx: number, toIdx: number): number => {
    if (fromIdx >= toIdx) return 0;
    let dist = 0;
    for (let i = fromIdx; i < toIdx; i++) {
      dist += calculateHaversineDistance(coords[i], coords[i + 1]);
    }
    return dist * 1000; // in meters
  };

  const parseMetricValue = (str: string | undefined): number | null => {
    if (!str) return null;
    const cleaned = str.replace(/,/, '.').trim();
    const match = cleaned.match(/^([0-9]+(\.[0-9]+)?)/);
    if (match) {
      return parseFloat(match[1]);
    }
    return null;
  };

  const isNearRoute = (obstacleLat: number, obstacleLng: number, routeCoords: [number, number][], thresholdMeters = 400) => {
    const degThreshold = thresholdMeters / 111000;
    return routeCoords.some(coord => {
      if (Math.abs(coord[0] - obstacleLat) > degThreshold || Math.abs(coord[1] - obstacleLng) > degThreshold) {
        return false;
      }
      const dist = calculateHaversineDistance([obstacleLat, obstacleLng], coord);
      return (dist * 1000) < thresholdMeters;
    });
  };

  const scanOSMObstacles = async (coords: [number, number][], signal?: AbortSignal): Promise<OSMObstacle[]> => {
    if (coords.length === 0) return [];
    setScanningObstacles(true);
    try {
      let minLat = coords[0][0];
      let maxLat = coords[0][0];
      let minLng = coords[0][1];
      let maxLng = coords[0][1];
      for (let i = 1; i < coords.length; i++) {
        const [lat, lng] = coords[i];
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      }
      minLat -= 0.005;
      maxLat += 0.005;
      minLng -= 0.005;
      maxLng += 0.005;

      const latDelta = maxLat - minLat;
      const lngDelta = maxLng - minLng;
      
      let query = "";
      if (latDelta > 0.4 || lngDelta > 0.4) {
        const pointsToQuery = [
          coords[0],
          coords[Math.floor(coords.length / 2)],
          coords[coords.length - 1]
        ];
        query = `[out:json][timeout:15];
(
  node["maxheight"](around:2500,${pointsToQuery[0][0]},${pointsToQuery[0][1]});
  node["maxheight"](around:2500,${pointsToQuery[1][0]},${pointsToQuery[1][1]});
  node["maxheight"](around:2500,${pointsToQuery[2][0]},${pointsToQuery[2][1]});
  node["maxwidth"](around:2500,${pointsToQuery[0][0]},${pointsToQuery[0][1]});
  node["maxwidth"](around:2500,${pointsToQuery[1][0]},${pointsToQuery[1][1]});
  node["maxwidth"](around:2500,${pointsToQuery[2][0]},${pointsToQuery[2][1]});
  node["maxweight"](around:2500,${pointsToQuery[0][0]},${pointsToQuery[0][1]});
  node["maxweight"](around:2500,${pointsToQuery[1][0]},${pointsToQuery[1][1]});
  node["maxweight"](around:2500,${pointsToQuery[2][0]},${pointsToQuery[2][1]});
);
out body;`;
      } else {
        query = `[out:json][timeout:15];
(
  node["maxheight"](${minLat},${minLng},${maxLat},${maxLng});
  node["maxwidth"](${minLat},${minLng},${maxLat},${maxLng});
  node["maxweight"](${minLat},${minLng},${maxLat},${maxLng});
  way["maxheight"](${minLat},${minLng},${maxLat},${maxLng});
  way["maxwidth"](${minLat},${minLng},${maxLat},${maxLng});
  way["maxweight"](${minLat},${minLng},${maxLat},${maxLng});
);
out center;`;
      }

      let res: Response;
      try {
        res = await fetch('/api/map-data-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: query }),
          signal
        });
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
        console.warn("Fetch /api/map-data-proxy (Navigator) fallita, riprovo dopo 1.5s per possibile riavvio o cold start del server...", err);
        await new Promise(r => setTimeout(r, 1500));
        try {
          res = await fetch('/api/map-data-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: query }),
            signal
          });
        } catch (retryErr: any) {
          if (retryErr.name === 'AbortError') throw retryErr;
          console.error("Fetch request for /api/map-data-proxy failed again on retry:", retryErr);
          throw retryErr;
        }
      }
      if (!res.ok) throw new Error("Overpass error");
      const data = await res.json();
      
      if (data && data.elements) {
        const obstacles: OSMObstacle[] = [];
        data.elements.forEach((el: any) => {
          const oLat = el.lat !== undefined ? el.lat : (el.center ? el.center.lat : null);
          const oLng = el.lon !== undefined ? el.lon : (el.center ? el.center.lon : null);
          if (oLat === null || oLng === null) return;

          const isNear = isNearRoute(oLat, oLng, coords, 30); 
          if (!isNear) return;

          const tags = el.tags || {};
          let type: 'height' | 'width' | 'weight' | 'barrier' = 'height';
          let val = 0;
          let label = "";

          if (tags.maxheight) {
            type = 'height';
            val = parseMetricValue(tags.maxheight) || 0;
            label = `Sottopasso: ${tags.maxheight}`;
          } else if (tags.maxwidth) {
            type = 'width';
            val = parseMetricValue(tags.maxwidth) || 0;
            label = `Strettoia: ${tags.maxwidth}`;
          } else if (tags.maxweight) {
            type = 'weight';
            val = parseMetricValue(tags.maxweight) || 0;
            label = `Portata Ponte: ${tags.maxweight}`;
          } else {
            return;
          }

          if (val === 0) return;

          let isViolation = false;
          if (type === 'height' && parseDimToNumber(vehicleDimensions.height) > val) isViolation = true;
          if (type === 'width' && parseDimToNumber(vehicleDimensions.width) > val) isViolation = true;
          if (type === 'weight' && parseDimToNumber(vehicleDimensions.weight) > val) isViolation = true;

          obstacles.push({
            id: el.id,
            lat: oLat,
            lng: oLng,
            type,
            value: val,
            name: label,
            roadName: tags.name || tags.ref || "Strada Locale",
            isViolation
          });
        });

        // Deduplicate obstacles by ID just in case
        const uniqueObstacles = obstacles.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
        setOsmObstacles(uniqueObstacles);
        return uniqueObstacles;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return [];
      console.error("OSM Obstacle scanning error:", err);
    } finally {
      setScanningObstacles(false);
    }
    return [];
  };

  // Helper to get total remaining distance in km from current coordinate index
  const getRemainingRouteDistance = (coords: [number, number][], startIndex: number): number => {
    if (coords.length < 2 || startIndex >= coords.length - 1) return 0;
    let totalKm = 0;
    for (let i = startIndex; i < coords.length - 1; i++) {
      totalKm += calculateHaversineDistance(coords[i], coords[i + 1]);
    }
    return totalKm;
  };

  const getETA = (minsRemaining: number) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minsRemaining);
    return now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const onSelectPlaceRef = React.useRef(onSelectPlaceDirectly);
  React.useEffect(() => {
    onSelectPlaceRef.current = onSelectPlaceDirectly;
  }, [onSelectPlaceDirectly]);

  const formatRemainingTime = (totalMins: number): string => {
    if (totalMins < 60) {
      return `${totalMins} min`;
    }
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (mins === 0) {
      return `${hours} h`;
    }
    return `${hours} h ${mins} min`;
  };

  // Safely trigger MapLibre GL container recalculation on cockpit mode toggles
  React.useEffect(() => {
    const map = mapRef.current;
    if (map) {
      setTimeout(() => {
        map.resize();
      }, 150);
    }
  }, [isMapFullscreenMode]);

  const toggleBrowserFullscreen = () => {
    try {
      const container = document.getElementById("fullscreen-nav-hud");
      if (!container) return;

      if (!document.fullscreenElement) {
        container.requestFullscreen().then(() => {
          setIsBrowserFullscreen(true);
        }).catch((err) => {
          console.warn("Fullscreen permission denied inside iframe environment: ", err);
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { message: "ℹ️ Schermo intero virtuale attivo. Apri l'app in scheda separata per lo schermo intero di sistema." }
          }));
        });
      } else {
        document.exitFullscreen().then(() => {
          setIsBrowserFullscreen(false);
        }).catch(() => {
          setIsBrowserFullscreen(false);
        });
      }
    } catch (e) {
      console.warn("Fullscreen API not fully supported on this device/browser context: ", e);
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: "ℹ️ Questa modalità viene visualizzata a tutto schermo nel browser." }
      }));
    }
  };

  // Sync fullscreen state if user exits via browser default escape controls
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const [osrmRoute, setOsrmRoute] = React.useState<[number, number][]>([]);
  // Freeze and maintain a stable initial start coordinate to prevent API lookup and map redraw loops on mobile GPS jitter
  const [initialStart, setInitialStart] = React.useState<[number, number]>(() => {
    return userLocation ? [userLocation.lat, userLocation.lng] : [44.5422, 10.7024];
  });
  const lastRecalcPos = React.useRef<[number, number] | null>(null);
  const isRecalculatedRef = React.useRef<boolean>(false);
  const onRouteCountRef = React.useRef<number>(0);

  const startLoc = initialStart;
  const endLoc: [number, number] = [dest.lat, dest.lng];

  // Fallback preset coordinates in case OSRM is offline or during cold loading
  const fallbackRouteCoordinates = React.useMemo(() => {
    const lat1 = startLoc[0];
    const lng1 = startLoc[1];
    const lat2 = endLoc[0];
    const lng2 = endLoc[1];

    // Main road intersections to simulate real physical city street routes (Google Maps style turns)
    const keyNodes: [number, number][] = [
      [lat1, lng1],
      [lat1 + (lat2 - lat1) * 0.2, lng1 + (lng2 - lng1) * 0.05],
      [lat1 + (lat2 - lat1) * 0.35, lng1 + (lng2 - lng1) * 0.1],
      [lat1 + (lat2 - lat1) * 0.4, lng1 + (lng2 - lng1) * 0.5],
      [lat1 + (lat2 - lat1) * 0.75, lng1 + (lng2 - lng1) * 0.55],
      [lat1 + (lat2 - lat1) * 0.8, lng2],
      [lat2, lng2]
    ];

    // Intrapolate between key road intersections to create many minor coordinates for smooth progression
    const interpolated: [number, number][] = [];
    for (let i = 0; i < keyNodes.length - 1; i++) {
      const from = keyNodes[i];
      const to = keyNodes[i+1];
      const subSteps = 4; // 4 segments per leg
      for (let j = 0; j < subSteps; j++) {
        const factor = j / subSteps;
        const lat = from[0] + (to[0] - from[0]) * factor;
        const lng = from[1] + (to[1] - from[1]) * factor;
        interpolated.push([lat, lng]);
      }
    }
    interpolated.push([lat2, lng2]);
    return interpolated;
  }, [startLoc[0], startLoc[1], endLoc[0], endLoc[1]]);

  // Sound and vocal guidance helper with robust speech queue and dual-stage alerts (Preavviso + Prossimità)
  const lastSpokenTextRef = React.useRef<string>("");
  const lastSpokenStepRef = React.useRef<number>(-1);
  const previousIsPreviewRef = React.useRef<boolean>(true);
  const prevDestIdRef = React.useRef<string>(dest.id);
  const spokenPreavvisoRef = React.useRef<Record<number, boolean>>({});
  const spokenProssimitaRef = React.useRef<Record<number, boolean>>({});
  const hasShownOffRoadToastRef = React.useRef<boolean>(false);
  const lastPeriodicStraightSpeechTimeRef = React.useRef<number>(0);

  // Speech Queue & State Management for smooth uninterrupted playback across long navigation sessions
  const speechQueueRef = React.useRef<{ text: string; priority: 'immediate' | 'advance' | 'info'; timestamp: number }[]>([]);
  const isSpeakingRef = React.useRef<boolean>(false);
  const spokenHistoryRef = React.useRef<Record<string, number>>({});
  const lastRecalcSpeechTimeRef = React.useRef<number>(0);
  const isFetchInProgressRef = React.useRef<boolean>(false);
  const lastRecalcTimestampRef = React.useRef<number>(0);
  const activeUtteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);
  const speechTimeoutRef = React.useRef<any>(null);
  const lastSpeechTimeRef = React.useRef<number>(0);

  const processSpeechQueue = React.useCallback(() => {
    if (typeof window === "undefined" || !('speechSynthesis' in window)) return;
    
    // Resume speechSynthesis if browser paused or suspended audio context
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (_) {}

    if (isSpeakingRef.current) return;
    if (speechQueueRef.current.length === 0) return;

    // Priority order: 'immediate' (3) > 'advance' (2) > 'info' (1)
    speechQueueRef.current.sort((a, b) => {
      const pMap = { immediate: 3, advance: 2, info: 1 };
      return pMap[b.priority] - pMap[a.priority];
    });

    const nextItem = speechQueueRef.current.shift();
    if (!nextItem) return;

    // Drop stale items older than 14 seconds
    if (Date.now() - nextItem.timestamp > 14000) {
      processSpeechQueue();
      return;
    }

    const msg = new SpeechSynthesisUtterance(nextItem.text);
    msg.rate = 1.0;
    applyTtsVoiceAndPitch(msg, settings?.ttsGender || 'auto');

    // Retain strong reference to prevent V8 garbage collection mid-speech
    activeUtteranceRef.current = msg;
    (window as any)._activeUtterance = msg;
    isSpeakingRef.current = true;
    lastSpeechTimeRef.current = Date.now();

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }

    // Safety watchdog timer: force reset if onend/onerror fails to fire within expected duration
    const maxSpeechDuration = Math.min(10000, Math.max(4000, nextItem.text.length * 150));
    speechTimeoutRef.current = setTimeout(() => {
      console.warn("[TTS Watchdog] Utterance timeout reached. Forcibly releasing lock.");
      isSpeakingRef.current = false;
      activeUtteranceRef.current = null;
      (window as any)._activeUtterance = null;
      try { window.speechSynthesis.cancel(); } catch (_) {}
      setTimeout(() => processSpeechQueue(), 100);
    }, maxSpeechDuration);

    msg.onstart = () => {
      isSpeakingRef.current = true;
      lastSpeechTimeRef.current = Date.now();
    };

    msg.onend = () => {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      isSpeakingRef.current = false;
      activeUtteranceRef.current = null;
      (window as any)._activeUtterance = null;
      setTimeout(() => processSpeechQueue(), 100);
    };

    msg.onerror = (e) => {
      console.warn("SpeechSynthesis utterance error:", e);
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      isSpeakingRef.current = false;
      activeUtteranceRef.current = null;
      (window as any)._activeUtterance = null;
      setTimeout(() => processSpeechQueue(), 100);
    };

    try {
      // Unfreeze browser TTS engine right before speaking
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(msg);
    } catch (e) {
      console.warn("SpeechSynthesis speak error:", e);
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      isSpeakingRef.current = false;
      activeUtteranceRef.current = null;
      (window as any)._activeUtterance = null;
      setTimeout(() => processSpeechQueue(), 100);
    }
  }, []);

  // Continuous watchdog & keep-alive monitor to prevent browser TTS engine freeze / standby drop during long driving sessions
  React.useEffect(() => {
    if (typeof window === "undefined" || !('speechSynthesis' in window)) return;

    const keepAliveInterval = setInterval(() => {
      const synth = window.speechSynthesis;
      if (!synth) return;

      const now = Date.now();
      const timeSinceSpeech = now - lastSpeechTimeRef.current;

      // 1. Always keep audio context / synth active
      try {
        if (synth.paused) {
          synth.resume();
        }
      } catch (_) {}

      // 2. Detect stuck lock (e.g. Chrome speaking === true bug or lost onend event after >8s)
      if (isSpeakingRef.current && timeSinceSpeech > 8000) {
        console.warn("[TTS Keep-Alive Watchdog] Releasing stuck speech lock after 8s inactivity.");
        isSpeakingRef.current = false;
        activeUtteranceRef.current = null;
        (window as any)._activeUtterance = null;
        if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        try { synth.cancel(); } catch (_) {}
        processSpeechQueue();
      }

      // 3. Periodic engine keep-alive pulse during long silent driving periods (>12s of silence)
      // Dispatches a micro silent pulse so mobile Chrome/Safari Web Speech IPC background worker never goes idle
      if (!isSpeakingRef.current && timeSinceSpeech > 12000 && speechQueueRef.current.length === 0) {
        try {
          synth.cancel();
          synth.resume();
          const silentMsg = new SpeechSynthesisUtterance(" ");
          silentMsg.volume = 0.01;
          silentMsg.lang = 'it-IT';
          (window as any)._silentKeepAlive = silentMsg;
          synth.speak(silentMsg);
          lastSpeechTimeRef.current = now;
        } catch (_) {}
      }
    }, 2000);

    return () => clearInterval(keepAliveInterval);
  }, [processSpeechQueue]);

  const speakInstruction = React.useCallback((text: string, priority: 'immediate' | 'advance' | 'info' = 'info') => {
    if (!text || typeof window === "undefined" || !('speechSynthesis' in window)) return;
    
    // Clean emojis, extraneous characters, and formatting for natural Italian speech
    let cleanText = text
      .replace(/navigazione/gi, "")
      .replace(/[👋👋🏻👋🏼👋🏽👋🏾👋🏿🚗🚐📍⏱️⛰️🌲🌅🏕️🗺️🚨⛔⚠️⚓🌦️🌧️⛈️⛱️💤🔋🚰🎵📻📻✨🔄🚦]/g, "")
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
      .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, "")
      .replace(/\p{Extended_Pictographic}/gu, "");

    // Convert degree symbols & ordinal numbers to spoken Italian words so SpeechSynthesis never pronounces "gradi"
    cleanText = cleanText
      .replace(/\b1°\s*uscita\b/gi, "prima uscita")
      .replace(/\b2°\s*uscita\b/gi, "seconda uscita")
      .replace(/\b3°\s*uscita\b/gi, "terza uscita")
      .replace(/\b4°\s*uscita\b/gi, "quarta uscita")
      .replace(/\b5°\s*uscita\b/gi, "quinta uscita")
      .replace(/\b6°\s*uscita\b/gi, "sesta uscita")
      .replace(/\b7°\s*uscita\b/gi, "settima uscita")
      .replace(/\b8°\s*uscita\b/gi, "ottava uscita")
      .replace(/\b1ª\s*uscita\b/gi, "prima uscita")
      .replace(/\b2ª\s*uscita\b/gi, "seconda uscita")
      .replace(/\b3ª\s*uscita\b/gi, "terza uscita")
      .replace(/\b4ª\s*uscita\b/gi, "quarta uscita")
      .replace(/\b5ª\s*uscita\b/gi, "quinta uscita")
      .replace(/\b6ª\s*uscita\b/gi, "sesta uscita")
      .replace(/\b1°\b/g, "prima")
      .replace(/\b2°\b/g, "seconda")
      .replace(/\b3°\b/g, "terza")
      .replace(/\b4°\b/g, "quarta")
      .replace(/\b5°\b/g, "quinta")
      .replace(/\b1ª\b/g, "prima")
      .replace(/\b2ª\b/g, "seconda")
      .replace(/\b3ª\b/g, "terza")
      .replace(/\b4ª\b/g, "quarta")
      .replace(/\b5ª\b/g, "quinta")
      .replace(/alla rotonda,?\s+alla rotonda/gi, "alla rotonda")
      .replace(/prendi la,?\s+prendi la/gi, "prendi la")
      .replace(/uscita,?\s+uscita/gi, "uscita")
      .replace(/,\s+([A-Z])/g, (m, p1) => `, ${p1.toLowerCase()}`)
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    const now = Date.now();

    // Guarantee that "ricalcolo" / "ricalcolo del percorso" is spoken only ONCE per recalculation event (25s window)
    if (/ricalcolo/i.test(cleanText)) {
      const lastRecalcTime = lastRecalcSpeechTimeRef.current || 0;
      if (now - lastRecalcTime < 25000) {
        console.log("[TTS] Suppressed duplicate 'Ricalcolo' voice alert within 25s window:", cleanText);
        return;
      }
      lastRecalcSpeechTimeRef.current = now;
    }

    // Check recent spoken history to avoid repeating identical sentence within 10 seconds
    const lastTime = spokenHistoryRef.current[cleanText] || 0;
    if (now - lastTime < 10000) {
      return;
    }

    spokenHistoryRef.current[cleanText] = now;

    // Clean up old history items
    for (const key of Object.keys(spokenHistoryRef.current)) {
      if (now - spokenHistoryRef.current[key] > 30000) {
        delete spokenHistoryRef.current[key];
      }
    }

    if (priority === 'immediate') {
      // For immediate turn warnings ("Ora, svolta a destra"), clear any low-priority background speech and speak immediately
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      activeUtteranceRef.current = null;
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
      isSpeakingRef.current = false;
      speechQueueRef.current = [{ text: cleanText, priority, timestamp: now }];
      processSpeechQueue();
    } else {
      // For advance warnings, queue cleanly without interrupting active speech abruptly
      if (!speechQueueRef.current.some(item => item.text === cleanText)) {
        speechQueueRef.current.push({ text: cleanText, priority, timestamp: now });
        processSpeechQueue();
      }
    }
  }, [processSpeechQueue]);

  // Real-time off-route recalculation listener (triggers when driver strays > 20m away from route)
  React.useEffect(() => {
    if (userLocation && !isTunnelDeadReckoning) {
      const isDefaultModena = Math.abs(initialStart[0] - 44.5422) < 0.0001 && Math.abs(initialStart[1] - 10.7024) < 0.0001;
      if (isDefaultModena) {
        // If we were on default Modena, update immediately as GPS has resolved
        setInitialStart([userLocation.lat, userLocation.lng]);
        lastRecalcPos.current = [userLocation.lat, userLocation.lng];
      } else if (!isPreview) { // Only recalculate route due to off-track deviation during active navigation, not during preview!
        const userPos = [userLocation.lat, userLocation.lng] as [number, number];
        let minDistanceMeters = Infinity;

        if (osrmRoute && osrmRoute.length > 0) {
          minDistanceMeters = calculateDistanceToPolylineMeters(userPos, osrmRoute);
        } else {
          minDistanceMeters = calculateHaversineDistance(initialStart, userPos) * 1000;
        }
        
        let distFromLastRecalcMeters = Infinity;
        if (lastRecalcPos.current) {
          distFromLastRecalcMeters = calculateHaversineDistance(lastRecalcPos.current, userPos) * 1000;
        }

        // When user is back on route (<= 20m), reset lastRecalcPos so future off-route triggers immediately.
        // We require 5 consecutive ticks on-track or driving 50m to avoid rapid reset due to GPS noise or initial route snapping.
        if (minDistanceMeters <= 20) {
          onRouteCountRef.current = onRouteCountRef.current + 1;
          if (onRouteCountRef.current >= 5 || distFromLastRecalcMeters > 50) {
            lastRecalcPos.current = null;
          }
        } else {
          onRouteCountRef.current = 0;

          // Recalculate route when off route (>20m).
          // Guard: If a route fetch is already in progress OR a recalculation was triggered less than 8s ago, DO NOT trigger again!
          const now = Date.now();
          const timeSinceLastRecalc = now - lastRecalcTimestampRef.current;

          if (!isFetchInProgressRef.current && timeSinceLastRecalc > 8000) {
            if (lastRecalcPos.current === null || distFromLastRecalcMeters > 100) {
              console.log(`Off-route detected (${Math.round(minDistanceMeters)}m deviation, ${Math.round(distFromLastRecalcMeters)}m from last alert). Triggering route recalculation.`);
              
              // Calculate vehicle motion heading vector along the mistaken road
              if (lastRecalcPos.current) {
                const motionHeading = getBearing(lastRecalcPos.current, userPos);
                vehicleHeadingRef.current = Math.round(motionHeading);
              } else if (lastGpsUpdateRef.current) {
                const motionHeading = getBearing([lastGpsUpdateRef.current.lat, lastGpsUpdateRef.current.lng], userPos);
                vehicleHeadingRef.current = Math.round(motionHeading);
              }

              isFetchInProgressRef.current = true;
              lastRecalcTimestampRef.current = now;

              window.dispatchEvent(new CustomEvent('show-toast', {
                detail: { message: `📍 Ricalcolo percorso`, duration: 3000 }
              }));

              // Spoken ONCE per off-route event
              speakInstruction("Ricalcolo del percorso", 'immediate');

              isRecalculatedRef.current = true;
              setInitialStart([userLocation.lat, userLocation.lng]);
              lastRecalcPos.current = [userLocation.lat, userLocation.lng];
            }
          }
        }
      }
    }
  }, [userLocation?.lat, userLocation?.lng, isGPSEnabled, isTunnelDeadReckoning, dest.id, osrmRoute, isPreview, speakInstruction, calculateDistanceToPolylineMeters]);

  // Safe checks for sagoma dimensions
  const hasHeightViolation = dest.hasMaxHeightLimit && dest.maxHeight && parseDimToNumber(vehicleDimensions.height) > dest.maxHeight;
  const hasWeightViolation = dest.hasMaxWeightLimit && dest.maxWeight && parseDimToNumber(vehicleDimensions.weight) > dest.maxWeight;

  // Dynamically generate turn-by-turn routing steps from geometry when not provided directly by the routing server
  const generateStepsFromGeometry = (coords: [number, number][]): NavigationStep[] => {
    if (coords.length < 2) return [];

    const steps: NavigationStep[] = [];
    
    steps.push({
      title: "Inizia viaggio",
      desc: `Inizia il viaggio verso ${dest.name}.`,
      icon: "🎯",
      distance: "0 m",
      coordinateIndex: 0
    });

    let accumDistance = 0;

    for (let i = 1; i < coords.length - 1; i++) {
      const pPrev = coords[i - 1];
      const pCurr = coords[i];
      const pNext = coords[i + 1];

      const distSeg = calculateHaversineDistance(pPrev, pCurr) * 1000; // in meters
      accumDistance += distSeg;

      const heading1 = getBearing(pPrev, pCurr);
      const heading2 = getBearing(pCurr, pNext);

      let diff = heading2 - heading1;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;

      const absDiff = Math.abs(diff);

      if (absDiff > 25 && accumDistance > 50) {
        let title = "Navigazione";
        let icon = "🛣️";
        let desc = "";

        const distStr = accumDistance < 1000 
          ? `${Math.round(accumDistance)} m` 
          : `${(accumDistance / 1000).toFixed(1).replace('.', ',')} km`;

        if (diff < -60) {
          title = "Svolta a sinistra";
          icon = "↩️";
          desc = `Fra ${distStr}, svolta a sinistra.`;
        } else if (diff < -15) {
          title = "Svolta leggermente a sinistra";
          icon = "↩️";
          desc = `Fra ${distStr}, mantieni la sinistra e svolta leggermente a sinistra.`;
        } else if (diff > 60) {
          title = "Svolta a destra";
          icon = "↪️";
          desc = `Fra ${distStr}, svolta a destra.`;
        } else if (diff > 15) {
          title = "Svolta leggermente a destra";
          icon = "↪️";
          desc = `Fra ${distStr}, mantieni la destra e svolta leggermente a destra.`;
        }

        if (desc) {
          if (steps.length > 0) {
            steps[steps.length - 1].distance = distStr;
          }

          steps.push({
            title,
            desc,
            icon,
            distance: "0 m",
            coordinateIndex: i
          });

          accumDistance = 0;
        }
      }
    }

    const finalDist = accumDistance + calculateHaversineDistance(coords[coords.length - 2], coords[coords.length - 1]) * 1000;
    const finalDistStr = finalDist < 1000 
      ? `${Math.round(finalDist)} m` 
      : `${(finalDist / 1000).toFixed(1)} km`;
    
    if (steps.length > 0) {
      steps[steps.length - 1].distance = finalDistStr;
    }

    steps.push({
      title: "Destinazione raggiunta",
      desc: `Sei giunto all'ingresso di ${dest.name}.`,
      icon: "🏕️",
      distance: "0 m",
      coordinateIndex: coords.length - 1
    });

    return steps;
  };

  // Real OSRM Routing States
  const [osrmSteps, setOsrmSteps] = React.useState<NavigationStep[]>([]);
  const [loadingRoute, setLoadingRoute] = React.useState<boolean>(false);
  const [routeError, setRouteError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchRoute = async () => {
      setLoadingRoute(true);
      setRouteError(null);
      setOsmObstacles([]);
      try {
        let url = `/api/osrm?start=${startLoc[1]},${startLoc[0]}&end=${endLoc[1]},${endLoc[0]}`;
        const activeHeading = (useCompass && deviceHeading !== null) 
          ? deviceHeading 
          : (vehicleHeadingRef.current !== null ? vehicleHeadingRef.current : bearing);
        if (typeof activeHeading === 'number' && activeHeading >= 0) {
          url += `&heading=${Math.round(activeHeading)}`;
        }

        const res = await fetch(url, { signal });
        let data: any = null;
        if (res.ok) {
          try {
            data = await res.json();
          } catch (jsonErr) {
            console.warn("Error parsing OSRM JSON:", jsonErr);
          }
        }
        
        if (!active) return;
        
        if (data && data.code === 'Ok' && data.routes && data.routes[0]) {
          const route = data.routes[0];
          const osrmCoords: [number, number][] = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
          
          // INSTANTLY render the standard route and directions to satisfy immediate user visual request
          setOsrmRoute(osrmCoords);
          lastRecalcPos.current = [startLoc[0], startLoc[1]];
          onRouteCountRef.current = 10;
          setTimeout(() => {
            isFetchInProgressRef.current = false;
          }, 2500);

          // Check if start or end coordinate was snapped to the nearest road (distance > 25 meters)
          if (osrmCoords.length > 0) {
            const startDist = calculateHaversineDistance(startLoc, osrmCoords[0]) * 1000;
            const endDist = calculateHaversineDistance(endLoc, osrmCoords[osrmCoords.length - 1]) * 1000;
            if (startDist > 25 || endDist > 25) {
              if (sessionStorage.getItem('hasShownOffRoadToast') !== 'true') {
                sessionStorage.setItem('hasShownOffRoadToast', 'true');
                let snapMsg = "";
                if (startDist > 25 && endDist > 25) {
                  snapMsg = "📍 Inizio e arrivo fuori strada: navigazione avviata e terminata dalle strade asfaltate più vicine.";
                } else if (startDist > 25) {
                  snapMsg = "📍 Ti trovi fuori strada: navigazione avviata in automatico dalla strada più vicina.";
                } else {
                  snapMsg = "📍 Arrivo fuori strada: il percorso termina sulla strada segnalata più vicina.";
                }
                window.dispatchEvent(new CustomEvent('show-toast', {
                  detail: { message: snapMsg, duration: 5000 }
                }));
                if (startDist > 25) {
                  speakInstruction("Sei fuori strada. Ho fatto partire il percorso in automatico dalla strada più vicina.");
                } else {
                  speakInstruction("La destinazione è fuori strada. Il percorso termina sulla strada segnalata più vicina.");
                }
              }
            }
          }
          
          const steps: NavigationStep[] = [];
          if (route.legs && route.legs[0] && route.legs[0].steps) {
            route.legs[0].steps.forEach((step: any, idx: number) => {
              const targetLoc: [number, number] = [step.maneuver.location[1], step.maneuver.location[0]];
              const coordIdx = findClosestCoordinateIndex(targetLoc, osrmCoords);
              const name = step.name ? `su ${step.name}` : "";
              let maneuverType = step.maneuver.type;
              
              // Localize modifier properly to prevent English leftovers like "a right" or "a left"
              let rawModifier = step.maneuver.modifier;
              let modifier = "";
              if (rawModifier) {
                if (rawModifier === 'left') modifier = " a sinistra";
                else if (rawModifier === 'right') modifier = " a destra";
                else if (rawModifier === 'sharp left') modifier = " bruscamente a sinistra";
                else if (rawModifier === 'sharp right') modifier = " bruscamente a destra";
                else if (rawModifier === 'slight left') modifier = " leggermente a sinistra";
                else if (rawModifier === 'slight right') modifier = " leggermente a destra";
                else if (rawModifier === 'uturn') modifier = " facendo inversione a U";
                else if (rawModifier === 'straight') modifier = " dritto";
                else modifier = ` a ${rawModifier}`;
              }
              
              let title = "Navigazione";
              let icon = "🛣️";
              
              const stepHasTrafficLight = Boolean(
                (step.intersections && step.intersections.some((inter: any) => 
                  (inter.classes && inter.classes.includes('traffic_signals'))
                )) ||
                step.maneuver?.type === 'traffic light' ||
                step.mode === 'traffic_signals' ||
                /semaforo|traffic_light|traffic_signals/i.test(step.name || "") ||
                /semaforo|traffic_light|traffic_signals/i.test(step.maneuver?.instruction || "")
              );

              const isRoundabout = Boolean(
                maneuverType === 'roundabout' ||
                maneuverType === 'rotary' ||
                maneuverType === 'roundabout turn' ||
                maneuverType === 'exit roundabout' ||
                rawModifier === 'roundabout' ||
                /roundabout|rotatoria|rotonda/i.test(step.maneuver?.type || "") ||
                /roundabout|rotatoria|rotonda/i.test(step.maneuver?.instruction || "")
              );

              let exitNumber = step.maneuver?.exit;
              if (!exitNumber) {
                const matchExit = (step.maneuver?.instruction || "").match(/(?:exit|uscita|\b)(\d+)(?:st|nd|rd|th|°|ª)?/i);
                if (matchExit) {
                  exitNumber = parseInt(matchExit[1], 10);
                }
              }

              let desc = step.maneuver.instruction || `Svolta ${modifier} ${name}`;

              if (isRoundabout) {
                icon = stepHasTrafficLight ? "🚦" : "🔄";
                const exitOrdinal = exitNumber ? getItalianOrdinalExit(exitNumber) : null;
                
                if (exitOrdinal && exitOrdinal.word !== "uscita") {
                  const exitTitleCap = exitOrdinal.word.charAt(0).toUpperCase() + exitOrdinal.word.slice(1);
                  title = stepHasTrafficLight 
                    ? `🚦 Semaforo e Rotatoria - ${exitTitleCap}`
                    : `Rotatoria - ${exitTitleCap}`;
                  desc = stepHasTrafficLight
                    ? `Al semaforo della rotonda, prendi la ${exitOrdinal.word} ${name}`.trim()
                    : `Alla rotonda, prendi la ${exitOrdinal.word} ${name}`.trim();
                } else {
                  let dirText = "prosegui dritto";
                  if (rawModifier?.includes('left')) dirText = "svolta a sinistra";
                  else if (rawModifier?.includes('right')) dirText = "svolta a destra";
                  title = stepHasTrafficLight ? "🚦 Semaforo e Rotatoria" : "Rotatoria";
                  desc = stepHasTrafficLight
                    ? `Al semaforo della rotonda, ${dirText} ${name}`.trim()
                    : `Alla rotonda, ${dirText} ${name}`.trim();
                }
              } else if (maneuverType === 'turn') {
                const isLeft = step.maneuver.modifier?.includes('left');
                title = isLeft ? "Svolta a sinistra" : "Svolta a destra";
                icon = isLeft ? "↩️" : "↪️";
              } else if (maneuverType === 'depart') {
                title = "Inizia viaggio";
                icon = "🎯";
              } else if (maneuverType === 'arrive') {
                title = "Destinazione raggiunta";
                icon = "🏕️";
              } else if (maneuverType === 'off ramp') {
                title = "Prendi l'uscita";
                icon = "🛣️";
              }

              if (stepHasTrafficLight && !isRoundabout) {
                icon = "🚦";
                if (!/semaforo/i.test(desc) && !/semaforo/i.test(title)) {
                  if (maneuverType === 'turn' || rawModifier?.includes('left') || rawModifier?.includes('right')) {
                    const isLeft = rawModifier?.includes('left');
                    title = isLeft ? "🚦 Semaforo - Svolta a sinistra" : "🚦 Semaforo - Svolta a destra";
                    desc = `Al semaforo, svolta${modifier} ${name}`.trim();
                  } else {
                    title = "🚦 Semaforo - Prosegui dritto";
                    desc = `Al semaforo, prosegui dritto ${name}`.trim();
                  }
                }
              }
              
              // Clean-up and localize instructions to sound completely native and professional in Italian
              desc = desc
                .replace(/turn sharp left/gi, "svolta bruscamente a sinistra")
                .replace(/turn sharp right/gi, "svolta bruscamente a destra")
                .replace(/turn slight left/gi, "svolta leggermente a sinistra")
                .replace(/turn slight right/gi, "svolta leggermente a destra")
                .replace(/turn left/gi, "svolta a sinistra")
                .replace(/turn right/gi, "svolta a destra")
                .replace(/continue straight/gi, "prosegui dritto")
                .replace(/svolta\s+dritto/gi, "prosegui dritto")
                .replace(/continue/gi, "prosegui")
                .replace(/merge/gi, "immettiti")
                .replace(/at the roundabout/gi, "alla rotonda")
                .replace(/take the first/gi, "prendi la prima")
                .replace(/take the second/gi, "prendi la seconda")
                .replace(/take the third/gi, "prendi la terza")
                .replace(/take the fourth/gi, "prendi la quarta")
                .replace(/take the/gi, "prendi la")
                .replace(/exit/gi, "uscita")
                .replace(/\b1°\s*uscita\b/gi, "prima uscita")
                .replace(/\b2°\s*uscita\b/gi, "seconda uscita")
                .replace(/\b3°\s*uscita\b/gi, "terza uscita")
                .replace(/\b4°\s*uscita\b/gi, "quarta uscita")
                .replace(/\b5°\s*uscita\b/gi, "quinta uscita")
                .replace(/alla rotonda,?\s+alla rotonda/gi, "alla rotonda")
                .replace(/prendi la,?\s+prendi la/gi, "prendi la")
                .replace(/destination/gi, "destinazione")
                .replace(/on your/gi, "sulla tua")
                .replace(/keep left/gi, "mantieni la sinistra")
                .replace(/keep right/gi, "mantieni la destra")
                .replace(/make a u-turn/gi, "fai inversione a U")
                .replace(/north-east/gi, "nord-est")
                .replace(/north-west/gi, "nord-ovest")
                .replace(/south-east/gi, "sud-est")
                .replace(/south-west/gi, "sud-ovest")
                .replace(/northeast/gi, "nord-est")
                .replace(/northwest/gi, "nord-ovest")
                .replace(/southeast/gi, "sud-est")
                .replace(/southwest/gi, "sud-ovest")
                .replace(/north/gi, "nord")
                .replace(/south/gi, "sud")
                .replace(/east/gi, "est")
                .replace(/west/gi, "ovest")
                .replace(/\bonto\b/gi, "su")
                .replace(/\bleft\b/gi, "sinistra")
                .replace(/\bright\b/gi, "destra")
                .replace(/^(?:ora\s+)?svolta\s+a\s+([a-z]+),\s+svolta\s+a\s+\1\s+/gi, "svolta a $1 ")
                .replace(/^ora\s+/gi, "");

              // Keep instructions as they are to ensure they are read exactly as written
              desc = desc.trim();


              // Convert any distances >= 1000 in the text from meters to kilometers
              desc = desc.replace(/\b(\d+)\s*(?:metri|meters|m\b)/gi, (match, numStr) => {
                const meters = parseInt(numStr, 10);
                if (meters >= 1000) {
                  const km = meters / 1000;
                  return `${km.toFixed(1).replace('.', ',')} km`;
                }
                return match;
              });

              // Specific custom guidance based on recalculation
              if (isRecalculatedRef.current) {
                const isUTurn = rawModifier === 'uturn' || /u-turn|inversione/i.test(step.maneuver?.instruction || "") || /inversione/i.test(desc);
                if (isUTurn) {
                  title = "Inversione di marcia";
                  desc = "Fai inversione di marcia non appena possibile";
                  icon = "🔄";
                } else if (isRoundabout && (exitNumber >= 3 || /inversione|torna indietro/i.test(step.maneuver?.instruction || "") || /inversione|torna indietro/i.test(desc))) {
                  title = "Rotatoria - Inversione";
                  desc = "Prosegui fino alla rotatoria per fare inversione di marcia";
                  icon = "🔄";
                } else if (idx === 1 && (maneuverType === 'turn' || rawModifier === 'left' || rawModifier === 'right' || rawModifier?.includes('left') || rawModifier?.includes('right'))) {
                  const isLeft = rawModifier?.includes('left') || desc.toLowerCase().includes('sinistra');
                  title = isLeft ? "Nuovo Percorso - Svolta a sinistra" : "Nuovo Percorso - Svolta a destra";
                  desc = `Svolta a ${isLeft ? "sinistra" : "destra"} alla prossima occasione ${name}`.trim();
                  icon = isLeft ? "↩️" : "↪️";
                } else if (idx === 1 && (maneuverType === 'continue' || rawModifier === 'straight' || maneuverType === 'depart')) {
                  desc = `Prosegui dritto sulla nuova strada per raggiungere la destinazione ${name}`.trim();
                }
              }

              // Specific vehicle check injection to warn user of clearance before arriving
              if (hasHeightViolation && idx === Math.max(1, Math.round(route.legs[0].steps.length / 2))) {
                steps.push({
                  title: "⚠️ IMPEDIMENTO SAGOMA RILEVATO",
                  desc: `Attenzione: l'itinerario originale includeva un ostacolo ad altezza ridotta di ${dest.maxHeight}m, incompatibile con il tuo camper (alto ${vehicleDimensions.height}m)!`,
                  icon: "⚠️",
                  distance: formatMeters(step.distance),
                  coordinateIndex: coordIdx
                });
              }

              steps.push({
                title,
                desc,
                icon,
                distance: formatMeters(step.distance),
                coordinateIndex: coordIdx,
                streetName: step.name || "",
                maneuverType: step.maneuver.type || "",
                modifier: step.maneuver.modifier || "",
                hasTrafficLight: stepHasTrafficLight
              });
            });
          }
          
          if (steps.length === 0) {
            steps.push({
              title: "Rotta stradale reale",
              desc: `Segui la carreggiata verso ${dest.name}`,
              icon: "🛣️",
              distance: "Tutto",
              coordinateIndex: 0
            });
          }

          // Generate tailored vocal recalculation instruction based on recalculated route steps
          let customRecalcSpeech = "";
          if (isRecalculatedRef.current && route.legs && route.legs[0] && route.legs[0].steps) {
            const rawSteps = route.legs[0].steps;
            let foundRoundabout: any = null;
            let foundUTurn: any = null;
            let foundTurn: any = null;

            for (let i = 0; i < Math.min(3, rawSteps.length); i++) {
              const st = rawSteps[i];
              const mType = st.maneuver?.type || "";
              const mMod = st.maneuver?.modifier || "";
              const stInst = st.maneuver?.instruction || "";

              const isRo = Boolean(
                mType === 'roundabout' || mType === 'rotary' || mType === 'roundabout turn' ||
                mMod === 'roundabout' || /roundabout|rotatoria|rotonda/i.test(mType) || /roundabout|rotatoria|rotonda/i.test(stInst)
              );
              const isUT = Boolean(
                mMod === 'uturn' || mType === 'uturn' || /u-turn|inversione/i.test(stInst) || /inversione/i.test(st.name || "")
              );

              if (isRo && !foundRoundabout) foundRoundabout = st;
              else if (isUT && !foundUTurn) foundUTurn = st;
              else if ((mType === 'turn' || mMod.includes('left') || mMod.includes('right')) && !foundTurn) foundTurn = st;
            }

            if (foundRoundabout) {
              let exitNum = foundRoundabout.maneuver?.exit;
              if (!exitNum) {
                const matchExit = (foundRoundabout.maneuver?.instruction || "").match(/(?:exit|uscita|\b)(\d+)(?:st|nd|rd|th|°|ª)?/i);
                if (matchExit) exitNum = parseInt(matchExit[1], 10);
              }
              const exitOrd = exitNum ? getItalianOrdinalExit(exitNum) : null;

              if (exitOrd && exitOrd.word !== "uscita") {
                customRecalcSpeech = `Prosegui sulla strada attuale fino alla rotatoria e prendi la ${exitOrd.word} per rientrare sull'itinerario.`;
              } else {
                customRecalcSpeech = `Prosegui sulla strada attuale fino alla rotatoria per invertire la marcia o rientrare sull'itinerario.`;
              }
            } else if (foundTurn) {
              const mod = foundTurn.maneuver?.modifier || "";
              const isLeft = mod.includes('left');
              const stName = foundTurn.name ? `su ${foundTurn.name}` : "";
              customRecalcSpeech = `Prosegui sulla strada attuale e svolta a ${isLeft ? 'sinistra' : 'destra'} ${stName} per seguire il nuovo itinerario.`;
            } else if (foundUTurn) {
              customRecalcSpeech = `Prosegui fino al prossimo punto sicuro per effettuare l'inversione di marcia.`;
            } else {
              customRecalcSpeech = `Nuovo itinerario calcolato: prosegui dritto sulla strada attuale.`;
            }
          }

          setOsrmSteps(steps);

          if (customRecalcSpeech) {
            speakInstruction(customRecalcSpeech, 'immediate');
            window.dispatchEvent(new CustomEvent('show-toast', {
              detail: { message: customRecalcSpeech, duration: 5000 }
            }));
          }

          isRecalculatedRef.current = false;
          setLoadingRoute(false);

          // SCAN OBSTACLES DIRECTLY in the background so it is completely non-blocking!
          if (showOsmObstacles) {
            setTimeout(async () => {
              if (!active) return;
              try {
                const obstacles = await scanOSMObstacles(osrmCoords, signal);
                const violations = obstacles ? obstacles.filter(o => o.isViolation) : [];
                
                // If we found violations, notify the user so they can drive safely but keep the real high-fidelity OSRM route!
                if (violations.length > 0 && active) {
                  setRouteError(`ATTENZIONE: Rilevati ${violations.length} ostacoli incompatibili.`);
                  
                  window.dispatchEvent(new CustomEvent('show-toast', {
                    detail: { message: `⚠️ Rilevati ${violations.length} ostacoli per camper sul percorso! Guida con attenzione.`, duration: 5000 }
                  }));
                  speakInstruction(`Attenzione: ho rilevato ${violations.length} ostacoli incompatibili con le dimensioni del tuo camper lungo il percorso. Fai attenzione ai segnali stradali.`);
                }
              } catch (err: any) {
                if (err.name === 'AbortError') return;
                console.warn("Background obstacles scan error:", err);
              }
            }, 50);
          }
        } else {
          throw new Error("Dati rotta OSRM non disponibili o non validi. Tentativo BRouter...");
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        if (active) {
          console.warn("OSRM routing service failed, falling back to high-fidelity BRouter...", err);
          try {
            const brouterUrl = `/api/brouter?start=${startLoc[1]},${startLoc[0]}&end=${endLoc[1]},${endLoc[0]}`;
            const brouterRes = await fetch(brouterUrl, { signal });
            if (!brouterRes.ok) {
              throw new Error(`Entrambi i servizi di routing (OSRM & BRouter) hanno fallito.`);
            }
            const brouterData = await brouterRes.json();
            if (active && brouterData.features && brouterData.features[0] && brouterData.features[0].geometry) {
              const brouterCoords = brouterData.features[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
              setOsrmRoute(brouterCoords);

              // Check if start or end coordinate was snapped to the nearest road (distance > 25 meters)
              if (brouterCoords.length > 0) {
                const startDist = calculateHaversineDistance(startLoc, brouterCoords[0]) * 1000;
                const endDist = calculateHaversineDistance(endLoc, brouterCoords[brouterCoords.length - 1]) * 1000;
                if (startDist > 25 || endDist > 25) {
                  if (sessionStorage.getItem('hasShownOffRoadToast') !== 'true') {
                    sessionStorage.setItem('hasShownOffRoadToast', 'true');
                    let snapMsg = "";
                    if (startDist > 25 && endDist > 25) {
                      snapMsg = "📍 Inizio e arrivo fuori strada: navigazione avviata e terminata dalle strade asfaltate più vicine.";
                    } else if (startDist > 25) {
                      snapMsg = "📍 Ti trovi fuori strada: navigazione avviata in automatico dalla strada più vicina.";
                    } else {
                      snapMsg = "📍 Arrivo fuori strada: il percorso termina sulla strada segnalata più vicina.";
                    }
                    window.dispatchEvent(new CustomEvent('show-toast', {
                      detail: { message: snapMsg, duration: 5000 }
                    }));
                    if (startDist > 25) {
                      speakInstruction("Sei fuori strada. Ho fatto partire il percorso in automatico dalla strada più vicina.");
                    } else {
                      speakInstruction("La destinazione è fuori strada. Il percorso termina sulla strada segnalata più vicina.");
                    }
                  }
                }
              }
              const backupSteps = generateStepsFromGeometry(brouterCoords);
              setOsrmSteps(backupSteps);
              console.log("Successfully retrieved high-fidelity backup route via BRouter.");
            } else {
              throw new Error("Dati BRouter non validi.");
            }
          } catch (brouterErr: any) {
            if (brouterErr.name === 'AbortError') return;
            console.error("OSRM and BRouter fallback failed: ", brouterErr);
            setRouteError("Servizio di navigazione offline. Utilizzo guidato di emergenza.");
          }
        }
      } finally {
        if (active) {
          setLoadingRoute(false);
          setTimeout(() => {
            isFetchInProgressRef.current = false;
          }, 1500);
        }
      }
    };

    fetchRoute();
    return () => {
      active = false;
      controller.abort();
    };
  }, [startLoc[0], startLoc[1], endLoc[0], endLoc[1], dest.id, showOsmObstacles]);

  const routeCoordinates = osrmRoute.length > 0 ? osrmRoute : fallbackRouteCoordinates;

  // Monitor incoming GPS fixes and manage Tunnel Dead Reckoning state transitions
  React.useEffect(() => {
    if (!isGPSEnabled || !userLocation) return;
    const now = Date.now();
    const prev = lastGpsUpdateRef.current;
    
    // Check if new GPS coordinates have arrived
    if (!prev || prev.lat !== userLocation.lat || prev.lng !== userLocation.lng) {
      lastGpsUpdateRef.current = { lat: userLocation.lat, lng: userLocation.lng, time: now };
      
      if (isTunnelDeadReckoning) {
        setIsTunnelDeadReckoning(false);
        if (wasInTunnelRef.current) {
          wasInTunnelRef.current = false;
          speakInstruction("Segnale GPS ripristinato. Navigazione in tempo reale ripresa.");
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { message: "📶 Segnale GPS ripristinato!" }
          }));
        }
      }
    }
  }, [userLocation?.lat, userLocation?.lng, isGPSEnabled, isTunnelDeadReckoning, speakInstruction]);

  // Dead Reckoning Interval loop (90 km/h cruising speed inside tunnels / GPS dead zones)
  React.useEffect(() => {
    if (!isGPSEnabled || isPreview || routeCoordinates.length === 0) {
      if (isTunnelDeadReckoning) setIsTunnelDeadReckoning(false);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const lastTime = lastGpsUpdateRef.current?.time || 0;
      const timeSinceLastFix = now - lastTime;

      // If no fresh GPS fix received for > 3.5 seconds (tunnel or lost signal)
      if (timeSinceLastFix > 3500) {
        if (!isTunnelDeadReckoning) {
          setIsTunnelDeadReckoning(true);
          wasInTunnelRef.current = true;
          // Start dead reckoning from last known GPS position on the route
          let startIdx = 0;
          if (lastGpsUpdateRef.current) {
            startIdx = findClosestCoordinateIndex([lastGpsUpdateRef.current.lat, lastGpsUpdateRef.current.lng], routeCoordinates);
          } else if (userLocation) {
            startIdx = findClosestCoordinateIndex([userLocation.lat, userLocation.lng], routeCoordinates);
          }
          tunnelRouteIndexRef.current = startIdx;
          speakInstruction("Assenza di segnale GPS. Attivata navigazione in galleria a 90 chilometri orari.");
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { message: "🚇 Modalità Galleria (GPS Assente): navigazione stimata a 90 km/h" }
          }));
        } else {
          // Cruise speed = 90 km/h (25 m/s). Interval runs every 800ms -> ~20 meters per tick
          const deltaMeters = (90 * 1000 / 3600) * 0.8;
          let curIdx = tunnelRouteIndexRef.current;
          let distAcc = 0;
          while (curIdx < routeCoordinates.length - 1 && distAcc < deltaMeters) {
            const p1 = routeCoordinates[curIdx];
            const p2 = routeCoordinates[curIdx + 1];
            const segDistMeters = calculateHaversineDistance(p1, p2) * 1000;
            distAcc += segDistMeters;
            curIdx++;
          }
          tunnelRouteIndexRef.current = Math.min(curIdx, routeCoordinates.length - 1);
          setTunnelStepTick(prev => prev + 1);
        }
      }
    }, 800);

    return () => clearInterval(interval);
  }, [isGPSEnabled, isPreview, routeCoordinates, isTunnelDeadReckoning, userLocation?.lat, userLocation?.lng, speakInstruction]);

  // Derive effective user location (real GPS fix or Dead Reckoning coordinate)
  const effectiveUserLocation = React.useMemo(() => {
    if (isGPSEnabled && isTunnelDeadReckoning && routeCoordinates.length > 0) {
      const tunnelPt = routeCoordinates[tunnelRouteIndexRef.current] || routeCoordinates[0];
      return { lat: tunnelPt[0], lng: tunnelPt[1] };
    }
    return userLocation;
  }, [isGPSEnabled, isTunnelDeadReckoning, userLocation, routeCoordinates, tunnelStepTick]);

  const displayedRouteCoordinates = React.useMemo(() => {
    const loc = effectiveUserLocation;
    if (isGPSEnabled && loc && routeCoordinates.length > 0 && !isPreview) {
      const userPos: [number, number] = [loc.lat, loc.lng];
      let closestIdx = 0;
      if (isTunnelDeadReckoning) {
        closestIdx = tunnelRouteIndexRef.current;
      } else {
        let minDist = calculateHaversineDistance(userPos, routeCoordinates[0]);
        for (let i = 1; i < routeCoordinates.length; i++) {
          const dist = calculateHaversineDistance(userPos, routeCoordinates[i]);
          if (dist < minDist) {
            minDist = dist;
            closestIdx = i;
          }
        }
      }
      return routeCoordinates.slice(closestIdx);
    }
    return routeCoordinates;
  }, [routeCoordinates, isGPSEnabled, effectiveUserLocation?.lat, effectiveUserLocation?.lng, isPreview, isTunnelDeadReckoning, tunnelStepTick]);

  const fallbackSequence = React.useMemo((): NavigationStep[] => {
    const steps: NavigationStep[] = [];
    
    steps.push({
      title: "Inizio Assistito",
      desc: isGPSEnabled 
        ? `Rilevamento GPS in corso. Percorri la carreggiata verso ${dest.name}`
        : `Avvia il camper ed entra in strada principale procedendo in direzione nord-est`,
      icon: "🎯",
      distance: "Ora"
    });

    steps.push({
      title: "Incrocio e Verifica Sagoma",
      desc: "Supera la rotonda prendendo la seconda uscita. Sistema di altezza camper controllato.",
      icon: "🛣️",
      distance: "1.2 km"
    });

    if (dest.isNarrowAccess) {
      steps.push({
        title: "Allerta Svolta Stretta",
        desc: "Attenzione: strada d'approccio stretta e rami sporgenti rilevati nell'ultimo km d'ingresso",
        icon: "🌲",
        distance: "400 m"
      });
    }

    if (hasHeightViolation) {
      steps.push({
        title: "BLOCCO TRANSITO: Sottopasso Basso",
        desc: `🚨 PERICOLO: Il camper è alto ${vehicleDimensions.height}m ma il sottopasso consente max ${dest.maxHeight}m! EFFETTUA INVERSIONE!`,
        icon: "⚠️",
        distance: "200 m"
      });
    } else if (hasWeightViolation) {
      steps.push({
        title: "BLOCCO PORTATA: Limite Peso",
        desc: `🚨 PERICOLO: Peso veicolo ${vehicleDimensions.weight}t supera la portata strutturale di ${dest.maxWeight}t!`,
        icon: "⚖️",
        distance: "300 m"
      });
    } else {
      steps.push({
        title: "Svolta finale d'arrivo",
        desc: `Svolta a destra. Sei giunto all'ingresso di ${dest.name}. Prezzo medio: ${dest.priceInfo}`,
        icon: "🏕️",
        distance: "100 m"
      });
    }

    const finalSteps: NavigationStep[] = steps.map((step, idx) => {
      const coordIdx = Math.min(
        Math.floor((idx / steps.length) * routeCoordinates.length),
        routeCoordinates.length - 1
      );
      return {
        ...step,
        coordinateIndex: coordIdx
      };
    });

    return finalSteps;
  }, [dest, vehicleDimensions, isGPSEnabled, hasHeightViolation, hasWeightViolation, routeCoordinates]);

  const directionsSequence = osrmSteps.length > 0 ? osrmSteps : fallbackSequence;

  // Consolidated user location, active step tracking, and dual-stage TTS distance voice alerts (1km & 50m)
  React.useEffect(() => {
    // If preview mode is active, handle once-off preview message and skip active voice alerts
    if (isPreview) {
      lastSpokenStepRef.current = -1;
      lastSpokenTextRef.current = "";
      if (previousIsPreviewRef.current !== isPreview) {
        previousIsPreviewRef.current = isPreview;
      }
      return;
    }

    const justStartedNavigation = previousIsPreviewRef.current === true && isPreview === false;
    previousIsPreviewRef.current = isPreview;

    const destChanged = prevDestIdRef.current !== dest.id;
    if (destChanged) {
      prevDestIdRef.current = dest.id;
    }
    const simReset = !isGPSEnabled && simRouteIndex === 0;

    // Reset spoken refs when starting navigation, changing destination, or resetting simulation
    if (justStartedNavigation || destChanged || simReset) {
      spokenPreavvisoRef.current = {};
      spokenProssimitaRef.current = {};
      hasShownOffRoadToastRef.current = false;
      lastPeriodicStraightSpeechTimeRef.current = Date.now();
    }

    // Determine the current user index on the route
    let currentRouteIdx = 0;
    if (isGPSEnabled && effectiveUserLocation && routeCoordinates.length > 0) {
      if (isTunnelDeadReckoning) {
        currentRouteIdx = tunnelRouteIndexRef.current;
      } else {
        const userPos = [effectiveUserLocation.lat, effectiveUserLocation.lng] as [number, number];
        currentRouteIdx = findClosestCoordinateIndex(userPos, routeCoordinates);
      }
    } else {
      currentRouteIdx = Math.min(simRouteIndex, routeCoordinates.length - 1);
    }

    if (routeCoordinates.length === 0 || directionsSequence.length === 0) {
      return;
    }

    // Determine active simStep based on actual coordinateIndex of steps
    let activeStepIndex = 0;
    for (let i = 0; i < directionsSequence.length; i++) {
      const stepIdx = directionsSequence[i].coordinateIndex ?? Math.min(
        Math.floor((i / directionsSequence.length) * routeCoordinates.length),
        routeCoordinates.length - 1
      );
      if (stepIdx <= currentRouteIdx) {
        activeStepIndex = i;
      } else {
        break;
      }
    }

    if (activeStepIndex !== simStep) {
      setSimStep(activeStepIndex);
    }

    if (justStartedNavigation) {
      const currentStepObj = directionsSequence[activeStepIndex] || directionsSequence[0];
      const cleanTitle = currentStepObj?.title && currentStepObj.title.toLowerCase() !== "navigazione" ? currentStepObj.title : "";
      const cleanDesc = (currentStepObj?.desc || "").replace(/^(?:Svolta a sinistra su|Svolta a destra su|Svolta leggermente a sinistra su|Svolta leggermente a destra su|Svolta bruscamente a sinistra su|Svolta bruscamente a destra su|Svolta|Prendi l'uscita)\s+/i, "Continua su ");
      const stepText = (cleanTitle && !cleanDesc.toLowerCase().includes(cleanTitle.toLowerCase()))
        ? `${cleanTitle}. ${cleanDesc}`
        : cleanDesc;
      
      lastSpokenStepRef.current = activeStepIndex;
      speakInstruction(`Avvio navigazione verso ${dest.name}. ${stepText}`, 'info');
      return;
    }

    // Now track distances to subsequent maneuver points for Preavviso (~500m/1km) and In Prossimità (~50m) alerts
    for (let stepIdx = activeStepIndex; stepIdx < directionsSequence.length; stepIdx++) {
      const stepObj = directionsSequence[stepIdx];
      if (!stepObj) continue;

      const targetCoordIdx = stepObj.coordinateIndex ?? Math.min(
        Math.floor((stepIdx / directionsSequence.length) * routeCoordinates.length),
        routeCoordinates.length - 1
      );

      // Only alert on upcoming maneuvers
      if (targetCoordIdx <= currentRouteIdx) {
        continue;
      }

      // Calculate accurate real-road distance in meters along the actual path points
      const distanceToTurn = getDistanceToCoordinateIndex(routeCoordinates, currentRouteIdx, targetCoordIdx);

      const rawAction = (stepObj.desc || stepObj.title || "").trim();
      if (!rawAction) continue;

      // Adaptive proximity trigger threshold based on current speed (~4 seconds before turn or min 30m / max 80m)
      const speedMs = speed / 3.6;
      const triggerProssimita = Math.min(80, Math.max(30, speedMs * 4));

      // STAGE 1: Preavviso (~300m to 800m before maneuver) - Esclusa la prelettura per "prosegui dritto" / "continua dritto"
      if (distanceToTurn <= 800 && distanceToTurn >= 180) {
        if (!spokenPreavvisoRef.current[stepIdx]) {
          spokenPreavvisoRef.current[stepIdx] = true;

          const isTrafficLightStep = Boolean(
            stepObj.hasTrafficLight ||
            /semaforo|traffic_light|traffic_signals/i.test(stepObj.desc || "") ||
            /semaforo|traffic_light|traffic_signals/i.test(stepObj.title || "")
          );

          // Escludi la prelettura se l'indicazione richiede solo di proseguire dritto SENZA semaforo
          const isStraightInstruction = !isTrafficLightStep && (
            stepObj.maneuverType === 'straight' ||
            stepObj.maneuverType === 'continue' ||
            stepObj.maneuverType === 'new name' ||
            stepObj.maneuverType === 'notification' ||
            /prosegui\s+dritto|proseguire\s+dritto|continua\s+dritto|procedi\s+dritto|vada\s+dritto|vai\s+dritto|continua\s+su|prosegui\s+su|procedi\s+su|prosegui\s+per|continua\s+per|\bdritto\b/i.test(rawAction) ||
            /prosegui\s+dritto|proseguire\s+dritto|continua\s+dritto|procedi\s+dritto|\bdritto\b/i.test(stepObj.title || "")
          );

          if (!isStraightInstruction) {
            let distText = "Tra 500 metri, ";
            if (distanceToTurn >= 750) {
              distText = "Tra un chilometro, ";
            } else if (distanceToTurn < 400) {
              distText = "Tra 300 metri, ";
            }

            const advanceMessage = `${distText}${rawAction}`;
            speakInstruction(advanceMessage, 'advance');
            break; // Alert processed for this turn
          }
        }
      }

      // STAGE 2: In prossimità della svolta (~30m to 80m before turn)
      if (distanceToTurn <= triggerProssimita && distanceToTurn > 0) {
        if (!spokenProssimitaRef.current[stepIdx]) {
          spokenProssimitaRef.current[stepIdx] = true;

          const immediateMessage = `Ora, ${rawAction}`;
          speakInstruction(immediateMessage, 'immediate');
          lastPeriodicStraightSpeechTimeRef.current = Date.now();
          break; // Alert processed
        }
      }
    }

    // STAGE 3: Reminder periodico ogni 4 minuti (240.000 ms) su rettilineo senza svolte imminenti (escluse le autostrade)
    const now = Date.now();
    if (now - lastPeriodicStraightSpeechTimeRef.current >= 240000) {
      lastPeriodicStraightSpeechTimeRef.current = now;

      const currentStepObj = directionsSequence[activeStepIndex] || directionsSequence[0];
      const descText = (currentStepObj?.desc || "").toLowerCase();
      const titleText = (currentStepObj?.title || "").toLowerCase();
      const streetName = currentStepObj?.streetName || "";

      // Controlla se ci troviamo su autostrada (esclusione esplicita come richiesto)
      const isAutostrada = /autostrada|pedaggio|toll/i.test(descText) ||
                           /autostrada|pedaggio|toll/i.test(titleText) ||
                           /\bA[1-9][0-9]?\b/i.test(descText) ||
                           /\bA[1-9][0-9]?\b/i.test(titleText) ||
                           /\bA[1-9][0-9]?\b/i.test(streetName);

      if (!isAutostrada) {
        let roadLabel = "";
        if (streetName) {
          roadLabel = streetName;
        } else if (currentStepObj?.desc) {
          // Pulisci indicazioni di svolta o prefissi per estrarre il nome pulito della strada
          roadLabel = currentStepObj.desc
            .replace(/^(?:Svolta a sinistra su|Svolta a destra su|Svolta leggermente a sinistra su|Svolta leggermente a destra su|Svolta bruscamente a sinistra su|Svolta bruscamente a destra su|Svolta|Prendi l'uscita|Continua su|Prosegui su)\s+/i, "")
            .trim();
        }

        const speechMsg = roadLabel 
          ? `Prosegui dritto su ${roadLabel}`
          : "Prosegui dritto";

        speakInstruction(speechMsg, 'info');
      }
    }
  }, [
    simStep,
    isPreview,
    directionsSequence,
    dest.id,
    isGPSEnabled,
    isTunnelDeadReckoning,
    tunnelStepTick,
    vehicleDimensions.height,
    effectiveUserLocation?.lat,
    effectiveUserLocation?.lng,
    routeCoordinates,
    simRouteIndex,
    speed
  ]);

  // Helper to add OSRM route line layer in MapLibre GL
  const addRouteLayer = (mapInstance: maplibregl.Map, coords: [number, number][]) => {
    if (!mapInstance.isStyleLoaded()) return;

    const geojson: any = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coords.map(c => [c[1], c[0]]) // MapLibre expects [lng, lat]
      }
    };

    if (mapInstance.getSource('route')) {
      const source = mapInstance.getSource('route') as maplibregl.GeoJSONSource;
      if (source && typeof source.setData === 'function') {
        source.setData(geojson);
      }
    } else {
      mapInstance.addSource('route', {
        type: 'geojson',
        data: geojson
      });

      mapInstance.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3B82F6',
          'line-width': 7,
          'line-opacity': 0.9
        }
      });
    }
  };

  // Update markers and paths when dest.id changes
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
    }
    if (carMarkerRef.current) {
      carMarkerRef.current.remove();
    }

    // Create custom Destination HTML element
    const destEl = document.createElement('div');
    destEl.className = 'dest-hud-marker';
    destEl.innerHTML = `
      <div class="flex flex-col items-center justify-center">
        <div class="w-10 h-10 rounded-full bg-red-600 border-2 border-white flex items-center justify-center shadow-2xl relative">
          <span class="text-base select-none">📍</span>
        </div>
        <div class="text-[9px] font-bold bg-slate-950 border border-slate-500/50 text-[#F5F2ED] rounded px-1.5 py-0.5 mt-1 whitespace-nowrap shadow-md">${dest.name}</div>
      </div>
    `;

    const activeEnd = displayedRouteCoordinates[displayedRouteCoordinates.length - 1] || endLoc;

    destMarkerRef.current = new maplibregl.Marker({ element: destEl })
      .setLngLat([activeEnd[1], activeEnd[0]])
      .addTo(map);

    // Create custom Camper HTML element
    const carEl = document.createElement('div');
    carEl.className = 'camper-hud-marker';
    carEl.innerHTML = `
      <div class="relative w-12 h-12 flex items-center justify-center">
        <div class="absolute w-12 h-12 rounded-full bg-blue-500/25 animate-ping" style="animation-duration: 2.5s;"></div>
        <div class="absolute w-8 h-8 rounded-full bg-blue-500/20"></div>
        <div class="camper-chevron-container flex items-center justify-center" style="transform: rotate(0deg); transition: transform 0.4s ease-out;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.45));">
            <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    `;

    const activeStart = displayedRouteCoordinates[0] || startLoc;
    
    carMarkerRef.current = new maplibregl.Marker({ element: carEl })
      .setLngLat([activeStart[1], activeStart[0]])
      .addTo(map);

    // Center map view on path bounds immediately, and then double-force with a timeout once painted
    const centerAndSize = () => {
      if (!mapRef.current || hasInitiallyFitBounds.current || hasInitiallyFitPreviewBounds.current) return;
      try {
        const bounds = new maplibregl.LngLatBounds();
        const activeStart = displayedRouteCoordinates[0] || startLoc;
        bounds.extend([activeStart[1], activeStart[0]]);
        const activeEndVal = displayedRouteCoordinates[displayedRouteCoordinates.length - 1] || endLoc;
        bounds.extend([activeEndVal[1], activeEndVal[0]]);
        if (isPreview) {
          mapRef.current.fitBounds(bounds, {
            padding: { top: 260, bottom: 200, left: 70, right: 70 }
          });
        } else {
          mapRef.current.fitBounds(bounds, { padding: 50 });
        }
      } catch (e) {
        console.warn("Bounds error: ", e);
      }
    };

    centerAndSize();

    // Timed retries to guarantee responsive size calculations
    const t1 = setTimeout(centerAndSize, 100);
    const t2 = setTimeout(centerAndSize, 450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [dest.id, dest.name, startLoc[0], startLoc[1], dest.lat, dest.lng, isPreview]);

  React.useEffect(() => {
    hasInitiallyFitBounds.current = false;
    hasInitiallyFitPreviewBounds.current = false;
  }, [dest.id]);

  // Synchronize route lines if routeCoordinates updates asynchronously without destroying the map
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let flyTimeout: NodeJS.Timeout;

    const updateRoute = () => {
      addRouteLayer(map, displayedRouteCoordinates);

      if (displayedRouteCoordinates.length > 0) {
        const activeStart = displayedRouteCoordinates[0];
        const activeEnd = displayedRouteCoordinates[displayedRouteCoordinates.length - 1];
        if (carMarkerRef.current) {
          carMarkerRef.current.setLngLat([activeStart[1], activeStart[0]]);
        }
        if (destMarkerRef.current) {
          destMarkerRef.current.setLngLat([activeEnd[1], activeEnd[0]]);
        }
      }

      // Adjust bounds to fit the full path safely
      try {
        if (displayedRouteCoordinates.length > 0) {
          if (isPreview) {
            // Force overhead vista dall'alto
            map.resize();
            map.setPitch(0);
            map.setBearing(0);

            const bounds = new maplibregl.LngLatBounds();
            displayedRouteCoordinates.forEach(c => bounds.extend([c[1], c[0]]));
            
            map.fitBounds(bounds, {
              padding: { top: 260, bottom: 200, left: 70, right: 70 },
              animate: false
            });
            hasInitiallyFitPreviewBounds.current = true;
            return;
          }

          // Active navigation mode
          if (!hasInitiallyFitBounds.current) {
            hasInitiallyFitBounds.current = true;
            const activeStart = displayedRouteCoordinates[0] || startLoc;
            const nextCoords = displayedRouteCoordinates[1];
            let initBearing = 0;
            if (nextCoords && (activeStart[0] !== nextCoords[0] || activeStart[1] !== nextCoords[1])) {
              initBearing = getBearing(activeStart, nextCoords);
              setBearing(initBearing);
            }
            const targetBearing = (useCompass && deviceHeading !== null)
              ? deviceHeading
              : initBearing;

            map.flyTo({
              center: [activeStart[1], activeStart[0]],
              zoom: 17.5,
              pitch: 55,
              bearing: Math.round(targetBearing),
              padding: { top: window.innerHeight * 0.4, bottom: 50, left: 0, right: 0 },
              duration: 1500
            });
          } else if (autoCenter) {
            const activeStart = displayedRouteCoordinates[0] || startLoc;
            const nextCoords = displayedRouteCoordinates[1];
            let initBearing = 0;
            if (nextCoords && (activeStart[0] !== nextCoords[0] || activeStart[1] !== nextCoords[1])) {
              initBearing = getBearing(activeStart, nextCoords);
              setBearing(initBearing);
            }
            const targetBearing = (useCompass && deviceHeading !== null)
              ? deviceHeading
              : initBearing;
            
            map.easeTo({
              center: [activeStart[1], activeStart[0]],
              zoom: map.getZoom() < 17 ? 17.5 : map.getZoom(),
              pitch: map.getPitch() < 40 ? 55 : map.getPitch(),
              bearing: Math.round(targetBearing),
              padding: { top: window.innerHeight * 0.4, bottom: 50, left: 0, right: 0 },
              duration: 800,
              easing: (t) => t
            });
          }
        }
      } catch (e) {
        console.warn("Fit bounds/camera error: ", e);
      }
    };

    if (map.isStyleLoaded()) {
      updateRoute();
    } else {
      map.once('load', updateRoute);
    }

    return () => {
      if (flyTimeout) clearTimeout(flyTimeout);
    };
  }, [displayedRouteCoordinates, isPreview]);

  // Keep camper marker perfectly positioned at the padded center during camera movements in active navigation
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapMove = () => {
      if (autoCenter && !isPreview && carMarkerRef.current) {
        const container = map.getContainer();
        const rect = container.getBoundingClientRect();
        const padding = map.getPadding();
        const topPadding = padding.top || 0;
        const bottomPadding = padding.bottom || 0;
        const leftPadding = padding.left || 0;
        const rightPadding = padding.right || 0;
        
        const x = leftPadding + (rect.width - leftPadding - rightPadding) / 2;
        const y = topPadding + (rect.height - topPadding - bottomPadding) / 2;
        
        try {
          const lngLat = map.unproject([x, y]);
          carMarkerRef.current.setLngLat(lngLat);
        } catch (e) {
          // fallback
        }
      }
    };

    map.on('move', handleMapMove);
    return () => {
      map.off('move', handleMapMove);
    };
  }, [autoCenter, isPreview]);

  // POI markers along the route (Max 5km as requested for trip planning)
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    poiMarkersRef.current.forEach(marker => {
      try { marker.remove(); } catch(e) {}
    });
    poiMarkersRef.current = [];

    if (!showStopsOnRoute) {
      setNearbyPlaces([]);
      return;
    }

    const POI_THRESHOLD = 5.0; // Max 5km from route

    const detected: { place: Place; minDistance: number }[] = [];

    places.forEach(place => {
      // Avoid matching the final destination itself to avoid duplication
      if (place.id === dest.id) return;

      let minDistance = Infinity;
      const isNearRoute = routeCoordinates.some(coord => {
          if (Math.abs(place.lat - coord[0]) > 0.08 || Math.abs(place.lng - coord[1]) > 0.08) {
              return false;
          }
          const dist = calculateHaversineDistance([place.lat, place.lng], coord);
          if (dist < minDistance) minDistance = dist;
          return dist < POI_THRESHOLD; 
      });

      if (isNearRoute && minDistance < POI_THRESHOLD) {
        let markerBg = "#FF8552"; // peach/orange for sosta
        let markerIcon = "📍";
        let categoryName = "Area Sosta";
        
        const normCat = (place.category || "").toLowerCase();
        if (normCat.includes('campeggio') || normCat.includes('camping')) {
          markerBg = "#5A6B4E"; // green
          markerIcon = "⛺";
          categoryName = "Campeggio";
        } else if (normCat.includes('parcheggio') || normCat.includes('parcheggio_camper')) {
          markerBg = "#0056b3"; // blue
          markerIcon = "🅿️";
          categoryName = "Parcheggio Camper";
        } else if (normCat.includes('service')) {
          markerBg = "#0077B6"; // blue
          markerIcon = "💧";
          categoryName = "Camper Service";
        } else if (normCat.includes('camper')) {
          markerBg = "#0056b3"; // blue
          markerIcon = "🅿️";
          categoryName = "Parcheggio Camper";
        }

        detected.push({ place, minDistance });

        // Create HTML marker element for POI
        const poiEl = document.createElement('div');
        poiEl.className = 'poi-map-marker cursor-pointer hover:scale-110 transition-transform';
        poiEl.innerHTML = `
          <div style="
            background-color: ${markerBg}; 
            width: 30px; 
            height: 30px; 
            border-radius: 50%; 
            border: 2.5px solid #ffffff; 
            box-shadow: 0 3px 8px rgba(0,0,0,0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
          ">
            ${markerIcon}
          </div>
        `;

        const popupContent = `
          <div style="
            font-family: 'Inter', system-ui, -apple-system, sans-serif; 
            font-size: 12px; 
            color: #0f172a; 
            max-width: 220px; 
            padding: 8px;
            background: #ffffff;
            border-radius: 12px;
          ">
            <span style="
              background-color: ${markerBg}20; 
              color: ${markerBg}; 
              font-weight: 800; 
              font-size: 9px; 
              text-transform: uppercase; 
              letter-spacing: 0.05em; 
              padding: 2px 6px; 
              border-radius: 9999px;
              display: inline-block;
              margin-bottom: 6px;
            ">
              ${categoryName} • a ${minDistance.toFixed(1)} km
            </span>
            <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 800; line-height: 1.3; color: #0f172a;">${place.name}</h4>
            <p style="margin: 0; color: #475569; font-size: 10px; line-height: 1.4;">${place.address || 'Posizione registrata'}</p>
            ${place.priceInfo ? `<p style="margin: 6px 0 0 0; font-weight: 700; font-size: 10px; color: #0284c7; background: #e0f2fe; display: inline-block; padding: 2px 6px; border-radius: 6px;">${place.priceInfo}</p>` : ''}
          </div>
        `;

        poiEl.addEventListener('click', (e) => {
          e.stopPropagation();
          setAutoCenter(false);
        });

        const popup = new maplibregl.Popup({ closeButton: false, offset: 15 })
          .setHTML(popupContent);

        const marker = new maplibregl.Marker({ element: poiEl })
          .setLngLat([place.lng, place.lat])
          .setPopup(popup)
          .addTo(map);

        poiMarkersRef.current.push(marker);
      }
    });

    // Sort detected places by minimum distance to the route
    detected.sort((a, b) => a.minDistance - b.minDistance);
    setNearbyPlaces(detected);
  }, [routeCoordinates, places, dest.id, showStopsOnRoute]);

  // Synchronize OSM Obstacle Markers on FullscreenNavigator's MapLibre GL Map
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    osmObstacleMarkersRef.current.forEach(m => {
      try { m.remove(); } catch(e) {}
    });
    osmObstacleMarkersRef.current = [];

    if (!showOsmObstacles) return;

    osmObstacles.forEach(obs => {
      const isCritical = obs.isViolation;
      const sizeClass = isCritical ? 'w-8 h-8 text-xs' : 'w-6 h-6 text-[9px]';
      const bgClass = isCritical ? 'bg-rose-600 animate-pulse border-white text-white font-black' : 'bg-amber-500 border-white text-slate-900 font-bold';
      
      let symbol = "📐";
      if (obs.type === 'height') symbol = isCritical ? "⛔" : "📐";
      else if (obs.type === 'width') symbol = "↔️";
      else if (obs.type === 'weight') symbol = "⚖️";

      const obsEl = document.createElement('div');
      obsEl.className = 'osm-obstacle-marker cursor-pointer';
      obsEl.innerHTML = `
        <div class="flex flex-col items-center justify-center">
          <div style="box-shadow: 0 4px 10px rgba(0,0,0,0.3);" class="${sizeClass} rounded-full ${bgClass} border-2 flex items-center justify-center relative">
            <span class="select-none">${symbol}</span>
          </div>
          <div style="font-size: 8px; font-weight: 900;" class="bg-black/90 text-white rounded px-1 py-0.5 mt-0.5 whitespace-nowrap border border-white/20">
            ${obs.value}${obs.type === 'weight' ? 't' : 'm'}
          </div>
        </div>
      `;

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; font-size: 11px; max-width: 190px; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
            <span style="font-size: 14px;">${isCritical ? '🚨' : '⚠️'}</span>
            <strong style="color: ${isCritical ? '#e11d48' : '#d97706'}; font-weight: 800; text-transform: uppercase; font-size: 9.5px; tracking-wider;">
              ${isCritical ? 'Ostacolo Sagoma Bloccante' : 'Avviso Transito OSM'}
            </strong>
          </div>
          <h4 style="margin: 0; font-size: 12px; font-weight: bold; color: #0f172a;">${obs.name}</h4>
          <p style="margin: 2px 0; color: #475569; font-size: 10px;">Rilevato su: <strong>${obs.roadName}</strong></p>
          <div style="margin-top: 6px; padding: 5px; border-radius: 6px; background: ${isCritical ? '#fff1f2' : '#fef3c7'}; color: ${isCritical ? '#9f1239' : '#92400e'}; font-size: 10px; font-weight: 700; border: 1px solid ${isCritical ? '#fecdd3' : '#fde68a'};">
            ${isCritical 
               ? `Rilevamento Sagoma: Il tuo mezzo (${vehicleDimensions.height}m) NON PASSA!` 
               : `Rilevamento Sagoma: Grado di passaggio idoneo.`}
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 15 })
        .setHTML(popupContent);

      const marker = new maplibregl.Marker({ element: obsEl })
        .setLngLat([obs.lng, obs.lat])
        .setPopup(popup)
        .addTo(map);

      osmObstacleMarkersRef.current.push(marker);
    });

    return () => {
      osmObstacleMarkersRef.current.forEach(m => {
        try { m.remove(); } catch (e) {}
      });
    };
  }, [osmObstacles, showOsmObstacles]);

  // Sync camper marker with sim step updates or physical GPS coordinates change
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let targetCoords: [number, number] = startLoc;
    let currentBearing = bearing;

    if (isGPSEnabled && effectiveUserLocation) {
      const userPos: [number, number] = [effectiveUserLocation.lat, effectiveUserLocation.lng];
      if (routeCoordinates.length > 0) {
        let closestIdx = 0;
        let minDist = 0;
        if (isTunnelDeadReckoning) {
          closestIdx = tunnelRouteIndexRef.current;
        } else {
          minDist = calculateHaversineDistance(userPos, routeCoordinates[0]);
          for (let i = 1; i < routeCoordinates.length; i++) {
            const dist = calculateHaversineDistance(userPos, routeCoordinates[i]);
            if (dist < minDist) {
              minDist = dist;
              closestIdx = i;
            }
          }
        }
        const closestPt = routeCoordinates[closestIdx];

        // Always use real user location or dead reckoning location for smooth movement
        targetCoords = userPos;

        // Calculate bearing orientation for the current road segment
        const nextIdx = Math.min(closestIdx + 1, routeCoordinates.length - 1);
        const nextCoords = routeCoordinates[nextIdx];
        let b = bearing;
        if (minDist > 0.02 && vehicleHeadingRef.current !== null) {
          // Off-route (>20m deviation): orientation follows the vehicle's true motion vector along the mistaken road
          b = vehicleHeadingRef.current;
        } else if (nextCoords && (targetCoords[0] !== nextCoords[0] || targetCoords[1] !== nextCoords[1])) {
          b = getBearing(targetCoords, nextCoords);
        }
        currentBearing = b;
        setBearing(b);
      } else {
        targetCoords = userPos;
      }
    } else {
      const curIdx = Math.min(simRouteIndex, routeCoordinates.length - 1);
      targetCoords = routeCoordinates[curIdx] || startLoc;

      // Calculate bearing orientation for the next road segment (Google Maps navigation view)
      const nextIdx = Math.min(curIdx + 1, routeCoordinates.length - 1);
      const nextCoords = routeCoordinates[nextIdx];
      if (nextCoords && (targetCoords[0] !== nextCoords[0] || targetCoords[1] !== nextCoords[1])) {
        const b = getBearing(targetCoords, nextCoords);
        currentBearing = b;
        setBearing(b);
      }
    }

    if (autoCenter && !isPreview) {
      if (markerAnimFrameRef.current) {
        cancelAnimationFrame(markerAnimFrameRef.current);
        markerAnimFrameRef.current = null;
      }
      const map = mapRef.current;
      if (map && carMarkerRef.current) {
        const container = map.getContainer();
        const rect = container.getBoundingClientRect();
        const padding = map.getPadding();
        const topPadding = padding.top || 0;
        const bottomPadding = padding.bottom || 0;
        const leftPadding = padding.left || 0;
        const rightPadding = padding.right || 0;
        const x = leftPadding + (rect.width - leftPadding - rightPadding) / 2;
        const y = topPadding + (rect.height - topPadding - bottomPadding) / 2;
        try {
          const lngLat = map.unproject([x, y]);
          carMarkerRef.current.setLngLat(lngLat);
        } catch (e) {
          carMarkerRef.current.setLngLat([targetCoords[1], targetCoords[0]]);
        }
      }
    } else if (carMarkerRef.current) {
      const startLngLat = carMarkerRef.current.getLngLat();
      const endLng = targetCoords[1];
      const endLat = targetCoords[0];
      
      const newCenter = [endLng, endLat];
      const last = lastEaseStateRef.current;
      const centerChanged = last.center[0] !== newCenter[0] || last.center[1] !== newCenter[1];
      
      let dur = 400;
      if (!isGPSEnabled && centerChanged) dur = 800;
      else if (isGPSEnabled && centerChanged) dur = 1000;
      if (!autoCenter || !centerChanged) dur = 400;

      const startTime = performance.now();
      
      const animateMarker = (now: number) => {
        let progress = (now - startTime) / dur;
        if (progress > 1) progress = 1;
        
        const currentLng = startLngLat.lng + (endLng - startLngLat.lng) * progress;
        const currentLat = startLngLat.lat + (endLat - startLngLat.lat) * progress;
        
        carMarkerRef.current?.setLngLat([currentLng, currentLat]);
        
        if (progress < 1) {
          markerAnimFrameRef.current = requestAnimationFrame(animateMarker);
        }
      };
      
      if (markerAnimFrameRef.current) cancelAnimationFrame(markerAnimFrameRef.current);
      markerAnimFrameRef.current = requestAnimationFrame(animateMarker);
    }

    // Pan/rotate map smoothly to follow camper only if autoCenter is active
    if (autoCenter && !isPreview) {
      const activeBearing = (useCompass && deviceHeading !== null)
        ? deviceHeading
        : currentBearing;

const newCenter = [targetCoords[1], targetCoords[0]];
      const newBearing = Math.round(activeBearing);
      
      const last = lastEaseStateRef.current;
      const centerChanged = last.center[0] !== newCenter[0] || last.center[1] !== newCenter[1];
      const bearingChanged = last.bearing !== newBearing;
      
      if (centerChanged || bearingChanged) {
        lastEaseStateRef.current = { center: newCenter, bearing: newBearing };
        
        let dur = 400;
        if (!isGPSEnabled && centerChanged) dur = 800;
        else if (isGPSEnabled && centerChanged) dur = 1000;

        map.easeTo({
          center: newCenter as [number, number],
          bearing: newBearing,
          pitch: 55,
          zoom: 17.5,
          padding: { top: window.innerHeight * 0.4, bottom: 50, left: 0, right: 0 },
          duration: dur,
          easing: (t) => t
        });
      }
    }
  }, [simRouteIndex, effectiveUserLocation?.lat, effectiveUserLocation?.lng, isGPSEnabled, isTunnelDeadReckoning, tunnelStepTick, routeCoordinates, autoCenter, deviceHeading, useCompass, isPreview]);

  // Dynamically rotate camper chevron inside the HTML marker to support seamless navigation heading
  React.useEffect(() => {
    if (carMarkerRef.current) {
      const el = carMarkerRef.current.getElement();
      const chev = el?.querySelector('.camper-chevron-container') as HTMLElement;
      if (chev) {
        let targetRotation = 0;
        if (autoCenter) {
          if (useCompass && deviceHeading !== null) {
            targetRotation = Math.round(bearing - deviceHeading);
          } else {
            targetRotation = 0;
          }
        } else {
          targetRotation = Math.round(bearing);
        }
        chev.style.transform = `rotate(${targetRotation}deg)`;
      }
    }
  }, [bearing, autoCenter, isGPSEnabled, deviceHeading, useCompass]);

  const simRouteIndexRef = React.useRef(simRouteIndex);
  const lastEaseStateRef = React.useRef({ center: [0,0], bearing: 0 });
  React.useEffect(() => {
    simRouteIndexRef.current = simRouteIndex;
  }, [simRouteIndex]);

  // Simulation tick logic (high-fidelity smooth road-following simulation)
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDriving && !isGPSEnabled && routeCoordinates.length > 0) {
      interval = setInterval(() => {
        const currentIdx = simRouteIndexRef.current;
        const nextIdx = currentIdx + 1;
        if (nextIdx < routeCoordinates.length) {
          setSimRouteIndex(nextIdx);
          let stepIndex = 0;
          for (let i = 0; i < directionsSequence.length; i++) {
            const stepIdx = directionsSequence[i].coordinateIndex ?? Math.min(
              Math.floor((i / directionsSequence.length) * routeCoordinates.length),
              routeCoordinates.length - 1
            );
            if (stepIdx <= nextIdx) {
              stepIndex = i;
            } else {
              break;
            }
          }
          setSimStep(stepIndex);
        } else {
          setIsDriving(false);
          speakInstruction("Navigazione completata! Sei arrivato in sicurezza all'area camper.");
          setSimStep(directionsSequence.length - 1);
          setSimRouteIndex(0); // reset
        }
      }, 800); // moves one precise road coordinate point every 800ms for a stunning fluid real-time movement
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDriving, isGPSEnabled, routeCoordinates, directionsSequence]);

  // Nearest safe place detour fallback
  const handleRerouteAlternative = () => {
    const safeCamps = places.filter(p => !p.hasMaxHeightLimit && p.id !== dest.id);
    if (safeCamps.length > 0) {
      const selectedAlt = safeCamps[0];
      onSelectPlaceDirectly(selectedAlt);
      setSimStep(0);
      setSimRouteIndex(0);
      setIsDriving(false);
      speakInstruction(`Deviazione di emergenza attivata! Nuova destinazione sicura impostata su ${selectedAlt.name}.`);
    } else {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: "⚠️ Nessun percorso alternativo sicuro disponibile al momento nelle vicinanze. Si consiglia la sosta d'emergenza." }
      }));
    }
  };

  // Focus on a POI coordinate and fly to it, then programmatically toggle popup
  const centerAndPopPOI = (lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;
    setAutoCenter(false);
    map.flyTo({ center: [lng, lat], zoom: 15, duration: 1200 });
    
    // Find matching marker and open popup
    const matched = poiMarkersRef.current.find(m => {
      const pos = m.getLngLat();
      return Math.abs(pos.lat - lat) < 0.001 && Math.abs(pos.lng - lng) < 0.001;
    });
    if (matched) {
      setTimeout(() => {
        matched.togglePopup();
      }, 1200);
    }
  };

  const baseStepObj = directionsSequence[simStep] || directionsSequence[0];

  // Calculate dynamic HUD instructions
  const currentStepObj = (() => {
    if (directionsSequence.length === 0) {
      return {
        title: "Calcolo rotta",
        desc: `Calcolo percorso camper per ${dest.name}...`,
        icon: "🧭",
        distance: "In corso"
      };
    }

    // Find current route coordinate index
    const currentRouteIdx = (isGPSEnabled && !isPreview && effectiveUserLocation) 
      ? (isTunnelDeadReckoning ? tunnelRouteIndexRef.current : findClosestCoordinateIndex([effectiveUserLocation.lat, effectiveUserLocation.lng], routeCoordinates))
      : Math.min(simRouteIndex, routeCoordinates.length - 1);

    // Calculate active step index dynamically based on actual coordinate index
    let hudActiveStepIdx = 0;
    for (let i = 0; i < directionsSequence.length; i++) {
      const stepIdx = directionsSequence[i].coordinateIndex ?? Math.min(
        Math.floor((i / directionsSequence.length) * routeCoordinates.length),
        routeCoordinates.length - 1
      );
      if (stepIdx <= currentRouteIdx) {
        hudActiveStepIdx = i;
      } else {
        break;
      }
    }

    const hudBaseStepObj = directionsSequence[hudActiveStepIdx] || directionsSequence[0];
    const nextStepObj = directionsSequence[hudActiveStepIdx + 1];

    // Find the exact coordinate index where the next maneuver takes place
    const targetCoordIdx = nextStepObj?.coordinateIndex ?? (routeCoordinates.length - 1);

    // Calculate the remaining distance to the next maneuver
    const distanceToTurn = getDistanceToCoordinateIndex(routeCoordinates, currentRouteIdx, targetCoordIdx);

    if (nextStepObj && distanceToTurn > 150) {
      const currentStreet = hudBaseStepObj?.streetName || "";
      let computedDesc = "";
      if (currentStreet) {
        computedDesc = `Continua su ${currentStreet}`;
      } else if (hudBaseStepObj?.desc) {
        computedDesc = hudBaseStepObj.desc.replace(/^(?:Svolta a sinistra su|Svolta a destra su|Svolta leggermente a sinistra su|Svolta leggermente a destra su|Svolta bruscamente a sinistra su|Svolta bruscamente a destra su|Svolta|Prendi l'uscita)\s+/i, "Continua su ");
      } else {
        computedDesc = `Prosegui verso ${dest.name}`;
      }

      return {
        ...hudBaseStepObj,
        icon: hudBaseStepObj?.icon || "⬆️",
        desc: computedDesc,
        title: "Continua",
        distance: formatMeters(distanceToTurn)
      };
    } else if (nextStepObj && distanceToTurn <= 150 && distanceToTurn > 0) {
      return {
        ...nextStepObj,
        distance: formatMeters(distanceToTurn)
      };
    }

    // Default or preview fallback
    return hudBaseStepObj || {
      title: "Inizio Percorso",
      desc: `Procedi in direzione di ${dest.name}`,
      icon: "🛣️",
      distance: "Ora"
    };
  })();

  // Real coordinates based remaining distance in Km using the accurate Haversine helper
  const currentCoordIdx = (isGPSEnabled && !isPreview) ? 0 : Math.min(simRouteIndex, routeCoordinates.length - 1);
  const remainingDistanceKm = getRemainingRouteDistance(
    (isGPSEnabled && !isPreview) ? displayedRouteCoordinates : routeCoordinates, 
    currentCoordIdx
  );
  const activeSpeed = speed > 0 ? speed : 50;
  // Calculate remaining time accurately based on distance and speed (min 1 min if route has distance remaining)
  const remainingMinutes = remainingDistanceKm > 0.05 ? Math.max(1, Math.round((remainingDistanceKm / activeSpeed) * 85)) : 0;
  const etaTimeStr = getETA(remainingMinutes);

  const displayDetectedSpeed = React.useMemo(() => {
    if (isTunnelDeadReckoning) {
      return 90;
    }
    if (currentDetectedSpeed !== null && currentDetectedSpeed >= 0) {
      return currentDetectedSpeed;
    }
    if (isDriving) {
      return Math.min(115, Math.max(25, Math.round(speed + (Math.sin(simStep * 0.4) * 5))));
    }
    return 0;
  }, [currentDetectedSpeed, isDriving, speed, simStep, isTunnelDeadReckoning]);

  const { lastPrice, consumptionKmPerL, hasRealPrice, hasRealConsumption } = getCamperFuelStats();
  const fuelCost = (remainingDistanceKm / consumptionKmPerL) * lastPrice;

  const getCamperTollStats = () => {
    let tollCost = 0;
    let autostradaKm = 0;
    
    const stepsToAnalyze = directionsSequence;
    
    if (stepsToAnalyze && stepsToAnalyze.length > 0) {
      stepsToAnalyze.forEach((step: any) => {
        const desc = (step.desc || step.title || "").toLowerCase();
        const title = (step.title || "").toLowerCase();
        
        // Match Italian autostrada identifiers like "A1", "A14", etc. but exclude "A90" (GRA which is free)
        const hasAutostradaWord = desc.includes("autostrada") || title.includes("autostrada") || desc.includes("pedaggio") || desc.includes("toll") || desc.includes("tollbooth");
        const hasAutostradaRef = /\bA[1-9][0-9]?\b/i.test(desc) || /\bA[1-9][0-9]?\b/i.test(title);
        const isGRA = /\bA90\b/i.test(desc) || /\bA90\b/i.test(title) || desc.includes("raccordo") || title.includes("raccordo");
        
        if ((hasAutostradaWord || hasAutostradaRef) && !isGRA) {
          // Parse distance
          let distMeters = 0;
          if (typeof step.distance === 'number') {
            distMeters = step.distance;
          } else if (typeof step.distance === 'string') {
            const clean = step.distance.toLowerCase().replace(/,/g, ".");
            if (clean.includes("km")) {
              distMeters = parseFloat(clean) * 1000;
            } else if (clean.includes("m")) {
              distMeters = parseFloat(clean);
            }
          }
          autostradaKm += distMeters / 1000;
        }
      });
    }

    const tollRatePerKm = 0.095; // Average Class B camper toll rate in Italy
    
    // If driving style is "veloce" (highway) and the route is long, but for some reason 0 autostrada steps are detected
    // (e.g. fallback route or generic OSRM names), let's fallback to a realistic heuristic:
    // if driving style is "veloce" and remainingDistanceKm > 20km, assume about 65% of the route is on highway.
    // if driving style is "eco" and remainingDistanceKm > 30km, assume about 30% of the route is on highway.
    if (autostradaKm === 0 && remainingDistanceKm > 20) {
      const style = settings?.drivingStyle || "relax";
      if (style === "veloce") {
        autostradaKm = remainingDistanceKm * 0.65;
      } else if (style === "eco") {
        autostradaKm = remainingDistanceKm * 0.30;
      }
    }
    
    tollCost = autostradaKm * tollRatePerKm;
    
    return {
      tollCost,
      autostradaKm
    };
  };

  const tollStats = getCamperTollStats();

  const formatDuration = (mins: number) => {
    if (mins < 60) {
      return `${mins} min`;
    }
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    if (m === 0) {
      return `${hrs} h`;
    }
    return `${hrs} h ${m} min`;
  };

  // Minimized Mode Floating Active Widget Overlay (Compact Pill Button)
  
  return (
    <div 
      id="fullscreen-nav-hud"
      className={isMinimized 
        ? "fixed inset-0 pointer-events-none z-[99999] font-sans" 
        : "fixed inset-0 bg-[#070A13] text-slate-100 z-[99999] font-sans transition-all overflow-hidden"
      }
    >
      {/* Unified map container to keep map instance alive without collapsing to 0x0 */}
      <div 
        ref={mapContainerRef} 
        className={isMinimized 
          ? "fixed inset-0 w-full h-full opacity-0 pointer-events-none -z-50" 
          : "absolute inset-0 w-full h-full z-0"
        } 
      />

      {isMinimized ? (
        <div className="fixed bottom-20 right-3 sm:bottom-6 sm:right-6 pointer-events-auto font-sans animate-fade-in">
          {/* Small Floating Navigation Pill */}
          <div className="flex items-center gap-1.5 p-1.5 pl-3 bg-[#0b101d]/95 hover:bg-[#0f172a] border border-emerald-500/60 shadow-[0_8px_30px_rgba(0,0,0,0.6)] rounded-full text-slate-100 transition-all hover:scale-[1.03] active:scale-95 group">
            {/* Restore / Expand trigger button */}
            <button
              type="button"
              onClick={() => handleSetMinimized(false)}
              className="flex items-center gap-2 cursor-pointer text-left focus:outline-hidden"
              title="Clicca per ripristinare il navigatore a schermo intero"
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>

              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <Navigation className="w-3.5 h-3.5 fill-emerald-400/20" />
                </div>
                <div className="flex flex-col min-w-0 max-w-[130px] sm:max-w-[200px]">
                  <span className="text-[11px] font-black text-slate-100 truncate leading-tight">
                    {dest.name}
                  </span>
                  <span className="text-[9px] font-extrabold text-emerald-400 font-mono truncate leading-tight">
                    {remainingDistanceKm > 0 ? `${remainingDistanceKm.toFixed(1)} km` : "In corso"} • {etaTimeStr}
                  </span>
                </div>
              </div>

              <div className="w-7 h-7 rounded-full bg-slate-800 group-hover:bg-emerald-600 text-slate-300 group-hover:text-white flex items-center justify-center shrink-0 transition-colors ml-1">
                <Maximize className="w-3.5 h-3.5" />
              </div>
            </button>

            <div className="h-5 w-px bg-slate-800/80 mx-0.5"></div>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 transition-all cursor-pointer"
              title="Chiudi e termina navigazione"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 pointer-events-none z-30">
          {/* Top Active Directions HUD Overlay & Optional Preview Stats */}
          <div className="absolute top-4 inset-x-0 mx-auto max-w-2xl z-40 px-4 pointer-events-none flex flex-col gap-2">
            {/* Primary Directions HUD Box */}
            <div className="bg-[#0b101d]/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-2xl flex items-center gap-3 sm:gap-4 pointer-events-auto">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xl sm:text-2xl shrink-0">
                {currentStepObj?.icon || "🛣️"}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-extrabold text-[9.5px] uppercase tracking-wider shrink-0">
                    {isPreview ? "Anteprima Percorso" : "Indicazione"}
                  </span>
                  <h4 className="text-slate-300 font-bold text-xs truncate">
                    {dest.name}
                  </h4>
                </div>
                <p className="text-slate-100 font-extrabold text-sm sm:text-base font-sans leading-snug line-clamp-2">
                  {currentStepObj?.desc || currentStepObj?.title || `Procedi verso ${dest.name}`}
                </p>
              </div>
              {currentStepObj?.distance && (
                <div className="shrink-0 bg-slate-900 border border-slate-800 px-2.5 sm:px-3 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-black text-emerald-400 shadow-inner">
                  {currentStepObj.distance}
                </div>
              )}
            </div>

            {/* Tunnel Dead Reckoning Mode Indicator Badge */}
            {isTunnelDeadReckoning && !isPreview && (
              <div className="bg-amber-500/95 text-slate-950 font-bold px-3.5 py-2 rounded-xl shadow-2xl border border-amber-300/80 animate-pulse text-xs flex items-center justify-between pointer-events-auto">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">🚇</span>
                  <span className="font-extrabold text-slate-950 truncate">Modalità Galleria (GPS Assente)</span>
                </div>
                <span className="font-mono bg-slate-950 text-amber-300 px-2.5 py-0.5 rounded-md text-[11px] font-black border border-amber-400/40 shrink-0 ml-2">
                  Crociera 90 km/h
                </span>
              </div>
            )}

            {/* Preview Route Cost & Distance Stats Bar */}
            {isPreview && (
              <div className="grid grid-cols-5 divide-x divide-slate-800/60 bg-[#0b101d]/95 backdrop-blur-md py-3 px-2 rounded-2xl border border-slate-800 shadow-xl text-center pointer-events-auto">
                <div className="flex flex-col items-center justify-center px-1">
                  <span className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block truncate max-w-full">
                    <span className="inline sm:hidden">Distanza</span>
                    <span className="hidden sm:inline">Totale Distanza</span>
                  </span>
                  <span className="text-sm sm:text-lg font-black text-emerald-400 font-mono truncate max-w-full">{remainingDistanceKm.toFixed(1)} km</span>
                </div>
                <div className="flex flex-col items-center justify-center px-1">
                  <span className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block truncate max-w-full">
                    <span className="inline sm:hidden">Tempo</span>
                    <span className="hidden sm:inline">Tempo Percorrenza</span>
                  </span>
                  <span className="text-sm sm:text-lg font-black text-slate-200 truncate max-w-full">{formatDuration(remainingMinutes)}</span>
                </div>
                <div className="flex flex-col items-center justify-center px-1">
                  <span className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block truncate max-w-full">
                    <span className="inline sm:hidden">Arrivo</span>
                    <span className="hidden sm:inline">Orario di Arrivo</span>
                  </span>
                  <span className="text-sm sm:text-lg font-black text-slate-200 truncate max-w-full">{etaTimeStr}</span>
                </div>
                <div className="flex flex-col items-center justify-center px-1" title={hasRealPrice ? `Spesa stimata basata sul tuo ultimo rifornimento (${lastPrice.toFixed(3)} ${getCurrencySymbol(settings)}/L) e consumo (${consumptionKmPerL.toFixed(1)} km/L)` : `Spesa stimata basata su prezzo carburante di default (${lastPrice.toFixed(2)} ${getCurrencySymbol(settings)}/L)`}>
                  <span className="text-[9px] sm:text-xs font-bold text-amber-400/90 uppercase tracking-wider block truncate max-w-full">
                    <span className="inline sm:hidden">Spesa Carb.</span>
                    <span className="hidden sm:inline">Spesa Carburante</span>
                  </span>
                  <span className="text-sm sm:text-lg font-black text-[#A45C40] font-mono truncate max-w-full">{fuelCost.toFixed(2)} {getCurrencySymbol(settings)}</span>
                </div>
                <div className="flex flex-col items-center justify-center px-1" title={`Spesa pedaggio stimata basata sulle tratte autostradali rilevate (${tollStats.autostradaKm.toFixed(1)} km a 0.095 ${getCurrencySymbol(settings)}/km)`}>
                  <span className="text-[9px] sm:text-xs font-bold text-amber-400/90 uppercase tracking-wider block truncate max-w-full">
                    <span className="inline sm:hidden">Spesa Ped.</span>
                    <span className="hidden sm:inline">Spesa Pedaggio</span>
                  </span>
                  <span className="text-sm sm:text-lg font-black text-[#A45C40] font-mono truncate max-w-full">
                    {tollStats.tollCost > 0 ? `${tollStats.tollCost.toFixed(2)} ${getCurrencySymbol(settings)}` : "0.00 " + getCurrencySymbol(settings)}
                  </span>
                </div>
              </div>
            )}

            {/* Vertical Stack: Minimize & Close Buttons right under top HUD bar on right side */}
            <div className="flex justify-end pointer-events-auto pt-0.5">
              <div className="flex flex-col gap-2 bg-[#0b101d]/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800/90 shadow-2xl">
                {/* Minimize button */}
                <button
                  type="button"
                  onClick={() => handleSetMinimized(true)}
                  className="p-2.5 sm:p-3 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 font-bold rounded-xl border border-slate-700 transition-all flex justify-center items-center cursor-pointer shadow-md active:scale-95 shrink-0"
                  title="Riduci a finestra fluttuante"
                >
                  <Minimize className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {/* Close button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2.5 sm:p-3 bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400 hover:text-rose-300 font-bold rounded-xl transition-all flex justify-center items-center cursor-pointer shadow-md active:scale-95 shrink-0"
                  title="Chiudi e termina navigazione"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>

        {/* Bottom Actions or Route Stats HUD Bar */}
        {isPreview ? (
          <div className="absolute bottom-0 inset-x-0 z-10">
            <div className="bg-[#0b101d]/98 backdrop-blur-md border-t border-slate-800/90 rounded-t-3xl px-6 py-4 pb-6 shadow-[0_-8px_30px_rgb(0,0,0,0.5)] flex items-center justify-center pointer-events-auto font-sans">
              {/* Large Naviga button to start navigation */}
              <button
                type="button"
                onClick={() => {
                  setIsPreview(false);
                  setIsDriving(true);
                }}
                className="w-full max-w-md px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 cursor-pointer shadow-lg active:scale-95 text-lg border border-emerald-400/20"
              >
                <Navigation className="w-6 h-6 fill-white animate-pulse" />
                <span>NAVIGA</span>
              </button>
            </div>
          </div>
        ) : (
          /* Bottom Route Stats HUD Bar (Active Navigation) */
          <div className="absolute bottom-0 inset-x-0 z-10 pointer-events-none">
            <div className="bg-[#0b101d]/98 backdrop-blur-md border-t border-slate-800/90 rounded-t-3xl px-4 sm:px-8 py-3.5 sm:py-5 pb-5 sm:pb-7 shadow-[0_-8px_30px_rgb(0,0,0,0.5)] flex items-center justify-between pointer-events-auto font-sans gap-2 sm:gap-6">
              <div className="flex-1 min-w-0 flex items-center justify-between gap-2 sm:gap-4 md:gap-8 py-0.5">
                <div className="flex flex-col items-start shrink-0">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Arrivo</span>
                  <span className="text-base sm:text-2xl md:text-3xl font-black text-slate-100 leading-tight">{etaTimeStr}</span>
                </div>

                <div className="h-8 sm:h-10 w-px bg-slate-800/80 shrink-0" />

                <div className="flex flex-col items-start shrink-0">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Distanza</span>
                  <span className="text-base sm:text-2xl md:text-3xl font-black text-emerald-400 font-mono leading-tight">{remainingDistanceKm.toFixed(1)} <span className="text-xs sm:text-base font-bold text-emerald-400/80">km</span></span>
                </div>

                <div className="h-8 sm:h-10 w-px bg-slate-800/80 shrink-0" />

                <div className="flex flex-col items-start shrink-0">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Tempo</span>
                  <span className="text-base sm:text-2xl md:text-3xl font-black text-slate-100 leading-tight">{formatDuration(remainingMinutes)}</span>
                </div>

                <div className="h-8 sm:h-10 w-px bg-slate-800/80 shrink-0" />

                <div className="flex flex-col items-start shrink-0 bg-slate-900/90 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-2xl border border-slate-800 shadow-inner">
                  <span className="text-[10px] sm:text-xs font-bold text-amber-400/90 uppercase tracking-wider flex items-center gap-1">
                    <Gauge className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
                    <span>Velocità</span>
                  </span>
                  <span className="text-base sm:text-2xl md:text-3xl font-black text-amber-400 font-mono leading-tight">
                    {displayDetectedSpeed} <span className="text-xs sm:text-sm font-bold text-amber-300/80">km/h</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Right Map Controls (Music, Compass & Recenter) */}
        <div className="absolute bottom-28 right-4 z-20 flex flex-col-reverse gap-3 pointer-events-none items-end">
          {/* Recenter Button (bottom-most in the right stack if shown) */}
          {!autoCenter && (
            <button
              type="button"
              onClick={() => {
                setAutoCenter(true);
                const map = mapRef.current;
                if (map) {
                  let target: [number, number] = startLoc;
                  if (isGPSEnabled && userLocation) {
                    target = [userLocation.lat, userLocation.lng];
                  } else {
                    const curIdx = Math.min(simRouteIndex, routeCoordinates.length - 1);
                    target = routeCoordinates[curIdx] || startLoc;
                  }
                  const targetBearing = (useCompass && deviceHeading !== null)
                    ? deviceHeading
                    : bearing;

                  map.flyTo({
                    center: [target[1], target[0]],
                    zoom: 17,
                    bearing: targetBearing,
                    pitch: 60,
                    essential: true
                  });
                }
              }}
              className="p-3 bg-slate-900/90 border border-slate-700 rounded-2xl shadow-xl pointer-events-auto hover:bg-slate-800 transition-all text-emerald-400"
              title="Centra mappa"
            >
              <Locate className="w-6 h-6" />
            </button>
          )}

          {/* Camper Cockpit Media Player Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMusicPlayerOpen(!isMusicPlayerOpen)}
            className={`w-[52px] h-[52px] rounded-xl border shadow-2xl transition-all duration-200 pointer-events-auto cursor-pointer flex items-center justify-center relative ${
              isAudioPlaying 
                ? 'border-emerald-500/80 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                : isMusicPlayerOpen
                  ? 'border-emerald-500/50 bg-[#0b101d]/95 text-emerald-400'
                  : 'border-slate-800 bg-[#0b101d]/95 text-white hover:bg-slate-800 hover:border-slate-700'
            }`}
            title="Cockpit Audio Camper (Radio & Playlist)"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <Music className={`w-5 h-5 ${isAudioPlaying ? "animate-pulse" : ""}`} />
            </div>
            {/* Pulsing indicator dot if audio is playing in the background but panel is closed */}
            {isAudioPlaying && !isMusicPlayerOpen && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            )}
            {isAudioPlaying && !isMusicPlayerOpen && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-400 rounded-full" />
            )}
          </button>

          {/* Compass Control Button */}
          <button
            type="button"
            onClick={async () => {
              if (compassPermission !== 'granted') {
                const granted = await requestCompassPermission();
                if (granted) {
                  window.dispatchEvent(new CustomEvent('show-toast', {
                    detail: { message: "🧭 Bussola reale attivata con successo! Ruota il telefono per allineare la mappa." }
                  }));
                } else {
                  window.dispatchEvent(new CustomEvent('show-toast', {
                    detail: { message: "⚠️ Per attivare la bussola reale, abilita l'accesso ai sensori di orientamento nelle impostazioni del browser o clicca nuovamente." }
                  }));
                }
              } else {
                const newVal = !useCompass;
                setUseCompass(newVal);
                window.dispatchEvent(new CustomEvent('show-toast', {
                  detail: { message: newVal ? "🧭 Allineamento bussola reale attivo" : "🧭 Bussola reale disattivata (orientamento fisso)" }
                }));
              }
            }}
            className={`w-[52px] h-[52px] rounded-xl border ${useCompass ? 'border-emerald-500 bg-slate-900/95' : 'border-slate-800 bg-[#0b101d]/95'} shadow-2xl hover:bg-slate-800 hover:border-slate-700 transition-all pointer-events-auto cursor-pointer flex items-center justify-center`}
            title="Allinea mappa con la bussola reale del telefono"
          >
            <div 
              className="relative w-6 h-6 flex items-center justify-center transition-transform duration-200 ease-out"
              style={{ transform: `rotate(${deviceHeading !== null ? -deviceHeading : 0}deg)` }}
            >
              {/* Custom SVG Compass Needle */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Compass Rose Ring */}
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={1} strokeDasharray="2 2" className="text-slate-500" />
                {/* North Pointer (Red) */}
                <path d="M12 2L15 12H9L12 2Z" fill="#EF4444" />
                {/* South Pointer (Slate) */}
                <path d="M12 22L15 12H9L12 22Z" fill="#94A3B8" />
                {/* Pivot Center Pin */}
                <circle cx="12" cy="12" r="1.5" fill="#FFFFFF" />
              </svg>
            </div>
          </button>
        </div>

        {/* Floating Mini Media Player Control Bar (bottom-center, aligned at bottom-28) */}
        {mediaState.currentTrack && hasBeenPlayed && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 h-[52px] px-3 bg-[#0b101d]/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl flex items-center justify-between pointer-events-auto w-[80%] max-w-[255px] md:w-[325px]">
            {/* Album Cover / Radio Icon on the Left */}
            <div className="flex items-center shrink-0">
              <div className="w-8 h-8 rounded overflow-hidden border border-slate-800/80 flex items-center justify-center bg-slate-900 shadow-inner">
                {mediaState.currentTrack.cover ? (
                  <img 
                    src={mediaState.currentTrack.cover} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                    alt="album art" 
                  />
                ) : mediaState.currentTrack.isRadio ? (
                  <Radio className="w-4.5 h-4.5 text-emerald-400" />
                ) : (
                  <Music className="w-4.5 h-4.5 text-emerald-400" />
                )}
              </div>
            </div>

            {/* Song Info Stack in the Middle */}
            <div className="flex flex-col justify-center min-w-0 flex-1 px-1 select-none text-left">
              <span className="text-[10px] font-bold text-emerald-400 uppercase truncate block">
                {mediaState.currentTrack.title}
              </span>
              <span className="text-[8px] text-slate-300 truncate leading-none mt-0.5 font-medium">
                {mediaState.currentTrack.subtitle || (mediaState.sourceMode === "radio" ? "Radio FM" : "Media Player")}
              </span>
            </div>

            {/* Large Controls Cluster on the Right */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={sendPrevCommand}
                className="w-7 h-7 flex items-center justify-center hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Brano precedente"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={sendPlayPauseCommand}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all cursor-pointer border ${
                  mediaState.isPlaying 
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-500/50" 
                    : "bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:border-slate-650"
                }`}
                title={mediaState.isPlaying ? "Pausa" : "Riproduci"}
              >
                {mediaState.isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={sendNextCommand}
                className="w-7 h-7 flex items-center justify-center hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Brano successivo"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Unconditionally rendered audio player so background streaming continues when minimized */}
        <CamperMediaPlayer 
          isOpen={isMusicPlayerOpen}
          onClose={() => setIsMusicPlayerOpen(false)}
          onPlayingStateChange={setIsAudioPlaying}
        />

        {/* Pulsante di espansione fluttuante (spostato in basso per allineamento orizzontale a bottom-28) */}
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`w-[52px] h-[52px] absolute left-4 bottom-28 z-20 rounded-xl border shadow-2xl transition-all duration-200 pointer-events-auto cursor-pointer flex items-center justify-center ${
            !isSidebarCollapsed
              ? 'border-emerald-500/50 bg-[#070c17]/95 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
              : 'border-slate-800 bg-[#0b101d]/95 text-white hover:bg-slate-800 hover:border-slate-700'
          }`}
          title="Impostazioni Navigatore"
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <Settings className={`w-5 h-5 transition-all duration-200 ${!isSidebarCollapsed ? 'text-emerald-400 animate-spin' : 'text-slate-300'}`} style={{ animationDuration: !isSidebarCollapsed ? '10s' : undefined }} />
          </div>
        </button>

        {/* Trip Planning Side Panel - 5km Proximity Camper Stops */}
        <div 
          className={`absolute bottom-[170px] left-4 md:bottom-38 md:left-auto md:right-32 z-30 max-h-[calc(100vh-200px)] w-[300px] md:w-[320px] bg-[#070c17]/95 backdrop-blur-md border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 pointer-events-auto ${
            isSidebarCollapsed 
              ? 'opacity-0 scale-95 pointer-events-none translate-y-3' 
              : 'opacity-100 scale-100 pointer-events-auto translate-y-0'
          }`}
          id="navigator-settings-container"
        >
          {/* Header */}
          <div className="px-3 py-2.5 bg-[#0d1527] border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-black text-slate-100 uppercase tracking-wider">
                Impostazioni Navigatore
              </span>
            </div>
            
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(true)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Chiudi impostazioni"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 max-h-[340px] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {/* Anti-Standby indicator */}
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between shadow-sm select-none">
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                  <Sun className="w-3 h-3 text-amber-400 animate-pulse" />
                  Schermo Sempre Attivo
                </span>
                <span className="text-[8px] text-emerald-400/80 font-medium">
                  Anti-Standby attivo durante la guida
                </span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full text-[9px] font-extrabold uppercase tracking-wide">
                ON
              </span>
            </div>
            {/* Switch per mostrare le soste sul percorso */}
            <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between shadow-sm select-none">
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-slate-200">
                  Mostra soste sul percorso
                </span>
                <span className="text-[8px] text-slate-400 font-medium">
                  Cerca aree camper entro 5km
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showStopsOnRoute}
                  onChange={(e) => setShowStopsOnRoute(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-7 h-4 bg-slate-800 rounded-full peer peer-focus:outline-none peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white animate-none"></div>
              </label>
            </div>

            {/* Switch per mostrare ostacoli e limiti OSM */}
            <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between shadow-sm select-none">
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-slate-200">
                  Ostacoli e limiti OSM
                </span>
                <span className="text-[8px] text-slate-400 font-medium">
                  Mostra limiti altezza/larghezza/peso
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOsmObstacles}
                  onChange={(e) => setShowOsmObstacles(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-7 h-4 bg-slate-800 rounded-full peer peer-focus:outline-none peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white animate-none"></div>
              </label>
            </div>

            {/* Voce Navigatore: Auto / Femminile / Maschile */}
            <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col gap-1.5 shadow-sm select-none">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-200 flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-emerald-400" />
                  Voce Guida GPS
                </span>
                <button
                  type="button"
                  onClick={() => speakSampleTts(settings?.ttsGender || 'auto')}
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all cursor-pointer"
                >
                  Prova
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(['auto', 'female', 'male'] as const).map((g) => {
                  const currentG = settings?.ttsGender || 'auto';
                  const isSel = currentG === g;
                  const label = g === 'auto' ? '⚙️ Auto' : g === 'female' ? '♀️ Donna' : '♂️ Uomo';
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        try {
                          const saved = localStorage.getItem("camper_app_settings");
                          const parsed = saved ? JSON.parse(saved) : {};
                          parsed.ttsGender = g;
                          localStorage.setItem("camper_app_settings", JSON.stringify(parsed));
                          window.dispatchEvent(new CustomEvent("app-settings-changed", { detail: { ttsGender: g } }));
                          speakSampleTts(g);
                        } catch (_) {}
                      }}
                      className={`py-1 text-[9px] font-bold rounded-lg border transition-all cursor-pointer text-center ${
                        isSel
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {loadingRoute ? (
              <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                <span>{showStopsOnRoute ? "Ricerca strutture in prossimità..." : "Calcolo percorso..."}</span>
              </div>
            ) : !showStopsOnRoute ? (
              <div className="py-6 text-center text-xs text-slate-500 px-2 space-y-1.5">
                <p className="font-medium text-slate-400 text-[11px]">Ricerca soste disattivata</p>
                <p className="text-[9px] text-slate-500 leading-normal">
                  Attiva "Mostra soste sul percorso" per elencare e visualizzare le aree camper vicine. Puoi anche attivare "Ostacoli e limiti OSM" per evidenziare restrizioni di transito sulla mappa.
                </p>
              </div>
            ) : nearbyPlaces.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                <p className="font-medium text-slate-400 text-[11px]">Nessuna struttura entro 5km</p>
                <p className="text-[9px] text-slate-500 mt-1">Non abbiamo trovato aree sosta o campeggi a meno di 5km da questo percorso specifico.</p>
              </div>
            ) : (
              nearbyPlaces.map(({ place, minDistance }) => {
                let badgeBg = "bg-orange-500/15 text-orange-400 border-orange-500/30";
                let categoryText = "Area Sosta";
                let icon = "📍";
                
                const normCat = (place.category || "").toLowerCase();
                if (normCat.includes('campeggio') || normCat.includes('camping')) {
                  badgeBg = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
                  categoryText = "Campeggio";
                  icon = "⛺";
                } else if (normCat.includes('parcheggio') || normCat.includes('parcheggio_camper')) {
                  badgeBg = "bg-blue-500/15 text-blue-400 border-blue-500/30";
                  categoryText = "Parcheggio";
                  icon = "🅿️";
                } else if (normCat.includes('service')) {
                  badgeBg = "bg-sky-500/15 text-sky-400 border-sky-500/30";
                  categoryText = "Camper Service";
                  icon = "💧";
                } else if (normCat.includes('camper')) {
                  badgeBg = "bg-blue-500/15 text-blue-400 border-blue-500/30";
                  categoryText = "Parcheggio";
                  icon = "🅿️";
                }

                return (
                  <div
                    key={place.id}
                    onClick={() => centerAndPopPOI(place.lat, place.lng)}
                    className="p-2 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/60 rounded-xl transition-all duration-150 cursor-pointer flex flex-col gap-1 hover:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className="font-bold text-[11px] text-slate-200 line-clamp-1 flex-1 flex items-center gap-1">
                        <span className="shrink-0">{icon}</span>
                        <span className="font-sans tracking-tight">{place.name}</span>
                      </h4>
                      <span className="text-[8px] shrink-0 font-bold font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">
                        a {minDistance.toFixed(1)} km
                      </span>
                    </div>
                    
                    {place.address && (
                      <p className="text-[9px] text-slate-400 line-clamp-1 font-sans">{place.address}</p>
                    )}
                    
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${badgeBg} font-sans uppercase tracking-wider`}>
                        {categoryText}
                      </span>
                      {place.priceInfo && (
                        <span className="text-[8px] text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded-full font-bold font-sans">
                          {place.priceInfo}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Floating Controls Overlay */}
        {((navigationMode === 'internal' && !isGPSEnabled) || navigationMode === 'google') && (
          <div className="absolute bottom-24 inset-x-0 mx-auto flex justify-center z-10 pointer-events-none">
            <div className="flex bg-[#0b0f19]/95 backdrop-blur-md rounded-3xl p-2 shadow-2xl border border-slate-800/90 pointer-events-auto gap-2">
              {navigationMode === 'internal' && !isGPSEnabled && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsDriving(!isDriving)}
                    className={`px-5 py-3.5 text-white font-extrabold text-xs sm:text-sm rounded-2xl border flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                      isDriving 
                      ? 'bg-amber-600/90 border-amber-500 hover:bg-amber-700' 
                      : 'bg-emerald-600/90 border-emerald-500 hover:bg-emerald-700'
                    }`}
                    title={isDriving ? "Pausa simulatore di guida" : "Avvia simulatore di guida"}
                  >
                    {isDriving ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
                    <span>{isDriving ? "PAUSA" : "SIMULA"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      // Offset position along a branch direction to simulate taking a wrong turn onto a new road
                      const curIdx = Math.min(simRouteIndex, displayedRouteCoordinates.length - 1);
                      const currNode = displayedRouteCoordinates[curIdx] || startLoc;
                      const nextNode = displayedRouteCoordinates[Math.min(curIdx + 1, displayedRouteCoordinates.length - 1)] || currNode;
                      
                      const currHeading = getBearing(currNode, nextNode);
                      const branchHeading = (currHeading + 35) % 360; // 35 degrees offset onto mistaken road
                      const devRad = branchHeading * Math.PI / 180;
                      
                      // Offset position ~40m forward along the mistaken road vector
                      const devLat = currNode[0] + (0.00038 * Math.cos(devRad));
                      const devLng = currNode[1] + (0.00038 * Math.sin(devRad));
                      
                      vehicleHeadingRef.current = Math.round(branchHeading);
                      
                      speakInstruction("Ricalcolo del percorso", 'immediate');
                      window.dispatchEvent(new CustomEvent('show-toast', {
                        detail: { message: "📍 Ricalcolo del percorso", duration: 4000 }
                      }));
                      
                      isRecalculatedRef.current = true;
                      setInitialStart([devLat, devLng]);
                      lastRecalcPos.current = [devLat, devLng];
                      setSimRouteIndex(0);
                    }}
                    className="px-4 py-3.5 bg-rose-600/90 border border-rose-500 hover:bg-rose-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
                    title="Simula errore di percorso per testare il ricalcolo a 20m con annuncio vocale"
                  >
                    <RefreshCw className="w-4 h-4 text-white" />
                    <span>DEVIA STRADA</span>
                  </button>
                </>
              )}
              {navigationMode === 'google' && (
                <button
                  type="button"
                  disabled={loadingRoute}
                  onClick={() => {
                        let url = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`;
                        
                        if (!isGPSEnabled && startLoc) {
                            url += `&origin=${startLoc[0]},${startLoc[1]}`;
                        }
                        
                        if (osrmRoute && osrmRoute.length > 20) {
                            const waypoints = [];
                            const numWaypoints = 3;
                            const step = Math.floor(osrmRoute.length / (numWaypoints + 1));
                            for (let i = 1; i <= numWaypoints; i++) {
                                const pt = osrmRoute[i * step];
                                if (pt) {
                                  waypoints.push(`${pt[0]},${pt[1]}`);
                                }
                            }
                            if (waypoints.length > 0) {
                              url += `&waypoints=${waypoints.join('%7C')}`;
                            }
                        }
                        
                        window.open(url, '_blank');
                  }}
                  className={`px-8 py-3.5 text-white font-extrabold text-sm rounded-2xl border flex items-center gap-2.5 transition-all shadow-md ${
                    loadingRoute 
                    ? 'bg-orange-600 border-orange-500 opacity-90 cursor-not-allowed' 
                    : 'bg-[#4285F4] hover:bg-[#357ae8] border-blue-500 cursor-pointer'
                  }`}
                  title={loadingRoute ? "Calcolo rotta in corso..." : routeError ? "La rotta contiene ostacoli evitabili calcolati. Procedere verso Google Maps." : "Apri Google Maps"}
                >
                  <Navigation className={`w-5 h-5 text-white ${!loadingRoute ? 'animate-pulse' : ''}`} />
                  <span>{loadingRoute ? "Attendi..." : "Naviga"}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    )}
  </div>
);
}
