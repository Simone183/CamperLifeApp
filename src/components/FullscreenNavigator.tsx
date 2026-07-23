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
  Gauge
} from 'lucide-react';
import CamperMediaPlayer from './CamperMediaPlayer';

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
}

let globalLastSpokenText = "";
let globalLastSpokenTime = 0;

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
  const [simStep, setSimStep] = React.useState<number>(0);
  const [simRouteIndex, setSimRouteIndex] = React.useState<number>(0);
  const [isDriving, setIsDriving] = React.useState<boolean>(false);
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

  React.useEffect(() => {
    if (userLocation) {
      const isDefaultModena = Math.abs(initialStart[0] - 44.5422) < 0.0001 && Math.abs(initialStart[1] - 10.7024) < 0.0001;
      if (isDefaultModena) {
        // If we were on default Modena, update immediately as GPS has resolved
        setInitialStart([userLocation.lat, userLocation.lng]);
        lastRecalcPos.current = [userLocation.lat, userLocation.lng];
      } else if (!isPreview) { // Only recalculate route due to off-track deviation during active navigation, not during preview!
        let minDistanceToRoute = Infinity;
        if (osrmRoute && osrmRoute.length > 0) {
          const userPos = [userLocation.lat, userLocation.lng] as [number, number];
          for (let i = 0; i < osrmRoute.length; i++) {
            const dist = calculateHaversineDistance(userPos, osrmRoute[i]);
            if (dist < minDistanceToRoute) minDistanceToRoute = dist;
          }
        } else {
          minDistanceToRoute = calculateHaversineDistance(initialStart, [userLocation.lat, userLocation.lng]);
        }
        
        let distFromLastRecalc = Infinity;
        if (lastRecalcPos.current) {
          distFromLastRecalc = calculateHaversineDistance(lastRecalcPos.current, [userLocation.lat, userLocation.lng]);
        }

        if (minDistanceToRoute > 0.05 && distFromLastRecalc > 0.05) { // Recalculate if > 50m away from route (or start location) to correct wrong directions, with debounce
          console.log("Off-route detected, triggering recalculation. Distance to route:", minDistanceToRoute);
          setInitialStart([userLocation.lat, userLocation.lng]);
          lastRecalcPos.current = [userLocation.lat, userLocation.lng];
        }
      }
    }
  }, [userLocation?.lat, userLocation?.lng, isGPSEnabled, dest.id, osrmRoute, isPreview]);

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

  // Sound and vocal guidance helper with robust try-catch for mobile constraints
  const lastSpokenTextRef = React.useRef<string>("");
  const lastSpokenStepRef = React.useRef<number>(-1);
  const previousIsPreviewRef = React.useRef<boolean>(true);
  const prevDestIdRef = React.useRef<string>(dest.id);
  const spoken1kmRef = React.useRef<Record<number, boolean>>({});
  const spoken50mRef = React.useRef<Record<number, boolean>>({});
  const hasShownOffRoadToastRef = React.useRef<boolean>(false);

  const speakInstruction = (text: string) => {
    if (!text) return;
    
    // Clean emojis and double spaces
    const cleanText = text
      .replace(/navigazione/gi, "")
      .replace(/[👋👋🏻👋🏼👋🏽👋🏾👋🏿🚗🚐📍⏱️⛰️🌲🌅🏕️🗺️🚨⛔⚠️⚓🌦️🌧️⛈️⛱️💤🔋🚰🎵📻📻✨]/g, "")
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
      .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, "")
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    // Temporal deduplication using the module-level variables (e.g., 4 seconds)
    console.log("Speaking text:", cleanText);
    const now = Date.now();
    if (globalLastSpokenText === cleanText && (now - globalLastSpokenTime) < 4000) {
      return;
    }
    globalLastSpokenText = cleanText;
    globalLastSpokenTime = now;

    if (typeof window !== "undefined" && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance(cleanText);
      msg.lang = 'it-IT';
      msg.rate = 1.0;
      msg.pitch = 1.0;
      try {
        window.speechSynthesis.speak(msg);
      } catch (e) {
        console.warn("SpeechSynthesis error:", e);
      }
    }
  };

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
              
              // Map directions beautifully
              if (maneuverType === 'turn') {
                const isLeft = step.maneuver.modifier?.includes('left');
                title = isLeft ? "Svolta a sinistra" : "Svolta a destra";
                icon = isLeft ? "↩️" : "↪️";
              } else if (maneuverType === 'depart') {
                title = "Inizia viaggio";
                icon = "🎯";
              } else if (maneuverType === 'arrive') {
                title = "Destinazione raggiunta";
                icon = "🏕️";
              } else if (maneuverType === 'roundabout') {
                const exitNumber = step.maneuver.exit;
                title = exitNumber ? `Rotatoria - uscita numero ${exitNumber}` : "Rotatoria";
                icon = "🔄";
              } else if (maneuverType === 'off ramp') {
                title = "Prendi l'uscita";
                icon = "🛣️";
              }

              let desc = step.maneuver.instruction || `Svolta ${modifier} ${name}`;
              
              if (maneuverType === 'roundabout' && step.maneuver.exit) {
                desc = `Prendi la ${step.maneuver.exit}° uscita alla ${desc}`;
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
                modifier: step.maneuver.modifier || ""
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
          setOsrmSteps(steps);
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
        if (active) setLoadingRoute(false);
      }
    };

    fetchRoute();
    return () => {
      active = false;
      controller.abort();
    };
  }, [startLoc[0], startLoc[1], endLoc[0], endLoc[1], dest.id, showOsmObstacles]);

  const routeCoordinates = osrmRoute.length > 0 ? osrmRoute : fallbackRouteCoordinates;

  const displayedRouteCoordinates = React.useMemo(() => {
    if (isGPSEnabled && userLocation && routeCoordinates.length > 0 && !isPreview) {
      const userPos: [number, number] = [userLocation.lat, userLocation.lng];
      let closestIdx = 0;
      let minDist = calculateHaversineDistance(userPos, routeCoordinates[0]);
      for (let i = 1; i < routeCoordinates.length; i++) {
        const dist = calculateHaversineDistance(userPos, routeCoordinates[i]);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = i;
        }
      }
      return routeCoordinates.slice(closestIdx);
    }
    return routeCoordinates;
  }, [routeCoordinates, isGPSEnabled, userLocation?.lat, userLocation?.lng, isPreview]);

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
      spoken1kmRef.current = {};
      spoken50mRef.current = {};
      hasShownOffRoadToastRef.current = false;
    }

    // Determine the current user index on the route
    let currentRouteIdx = 0;
    if (isGPSEnabled && userLocation && routeCoordinates.length > 0) {
      const userPos = [userLocation.lat, userLocation.lng] as [number, number];
      currentRouteIdx = findClosestCoordinateIndex(userPos, routeCoordinates);
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
      speakInstruction(stepText);
      return;
    }

    // Now track distances to subsequent maneuver points for the 1km and 50m turn alerts
    // Search forward from the current step to find the next meaningful turn maneuver
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

      // Calculate accurate real-road distance (along the actual path points) from our current position to the turn point
      const distanceToTurn = getDistanceToCoordinateIndex(routeCoordinates, currentRouteIdx, targetCoordIdx);

      // Calculate adaptive warning distances based on current speed
      const speedMs = speed / 3.6;
      const trigger1km = Math.min(1000, Math.max(200, speedMs * 45)); // Max 1km, or 45 seconds, min 200m
      const trigger50m = Math.min(50, Math.max(15, speedMs * 3));    // Max 50m, or 3 seconds, min 15m

      // 1. First Warning Stage: adaptive distance (approx 1km or 45s before)
      if (distanceToTurn <= trigger1km && distanceToTurn > (trigger50m + 20)) {
        if (!spoken1kmRef.current[stepIdx]) {
          spoken1kmRef.current[stepIdx] = true;
          // Calculate precise distance string
          let distanceStr = "";
          if (distanceToTurn >= 1000) {
            const km = Math.round(distanceToTurn / 100) / 10;
            distanceStr = km === 1 ? "un chilometro" : `${km.toString().replace('.', ',')} chilometri`;
          } else {
            const roundedMeters = distanceToTurn > 50 
              ? Math.round(distanceToTurn / 10) * 10 
              : Math.round(distanceToTurn / 5) * 5;
            distanceStr = `${roundedMeters} metri`;
          }
          // Speak instruction indicating turn with precise distance
          console.log("Step title for TTS:", stepObj.title);
          const titleToSpeak = stepObj.title && stepObj.title.toLowerCase() !== "navigazione" ? stepObj.title + ". " : "";
          const speakText = `${titleToSpeak}${stepObj.desc || ""}`;
          const speakTextWithDist = `Tra ${distanceStr}: ${speakText}`;
          speakInstruction(speakTextWithDist);
          break; // alert spoken, don't cascade to avoid overwhelming SpeechSynthesis
        }
      }

      // 2. Second Warning Stage / Re-reading Stage: adaptive distance (approx 50m or 3s before)
      if (distanceToTurn <= trigger50m && distanceToTurn > 0) {
        if (!spoken50mRef.current[stepIdx]) {
          spoken50mRef.current[stepIdx] = true;
          // Re-read the exact same instruction
          const titleToSpeak = stepObj.title && stepObj.title.toLowerCase() !== "navigazione" ? stepObj.title + ". " : "";
          const speakText = `${titleToSpeak}${stepObj.desc || ""}`;
          speakInstruction(speakText);
          break; // alert spoken
        }
      }
    }
  }, [
    simStep,
    isPreview,
    directionsSequence,
    dest.id,
    isGPSEnabled,
    vehicleDimensions.height,
    userLocation?.lat,
    userLocation?.lng,
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

  // Initialize and synchronize MapLibre GL map inside dashboard HUD
  React.useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
    
    // Robust public raster styles to avoid unstable vector tile CORS / fetch errors (MVT)
    const mapStyle: any = {
      version: 8,
      sources: {
        'raster-tiles': {
          type: 'raster',
          tiles: [
            "/api/map-tile/{z}/{x}/{y}?lyrs=m"
          ],
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
      pitch: 0, // Starts at 0 for preview overhead vista dall'alto
      bearing: 0,
      attributionControl: false
    });
    
    // Increase cache size for better performance on low bandwidth
    // map.setTileCacheSize(1000); // Removed as maplibre doesn't support this method directly on the map instance
    
    mapRef.current = map;

    map.on('load', () => {
      addRouteLayer(map, displayedRouteCoordinates);
    });

    // Configura la navigazione al volo tenendo premuto (o tasto destro) su un punto qualsiasi della mappa
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

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Run ONCE on mount

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

    if (isGPSEnabled && userLocation) {
      const userPos: [number, number] = [userLocation.lat, userLocation.lng];
      if (routeCoordinates.length > 0) {
        let closestIdx = 0;
        let minDist = calculateHaversineDistance(userPos, routeCoordinates[0]);
        for (let i = 1; i < routeCoordinates.length; i++) {
          const dist = calculateHaversineDistance(userPos, routeCoordinates[i]);
          if (dist < minDist) {
            minDist = dist;
            closestIdx = i;
          }
        }
        const closestPt = routeCoordinates[closestIdx];

        // Always use real user location for smooth movement
        targetCoords = userPos;

        // Calculate bearing orientation for the current road segment
        const nextIdx = Math.min(closestIdx + 1, routeCoordinates.length - 1);
        const nextCoords = routeCoordinates[nextIdx];
        if (nextCoords && (targetCoords[0] !== nextCoords[0] || targetCoords[1] !== nextCoords[1])) {
          const b = getBearing(targetCoords, nextCoords);
          currentBearing = b;
          setBearing(b);
        }
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
  }, [simRouteIndex, userLocation?.lat, userLocation?.lng, isGPSEnabled, routeCoordinates, autoCenter, deviceHeading, useCompass, isPreview]);

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
    if (directionsSequence.length === 0) return null;

    // Find current route coordinate index
    const currentRouteIdx = (isGPSEnabled && !isPreview && userLocation) 
      ? findClosestCoordinateIndex([userLocation.lat, userLocation.lng], routeCoordinates)
      : Math.min(simRouteIndex, routeCoordinates.length - 1);

    // Calculate active step index dynamically based on actual coordinate index to prevent any state lag!
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

    if (!isPreview && nextStepObj && distanceToTurn > 150) {
      // Determine the name of the current street we are traveling on
      const currentStreet = hudBaseStepObj?.streetName || "";
      let computedDesc = "";
      if (currentStreet) {
        computedDesc = `Continua su ${currentStreet}`;
      } else if (hudBaseStepObj?.desc) {
        // Fallback: strip any maneuver keywords from current instruction to make it sound like a continuous drive
        computedDesc = hudBaseStepObj.desc.replace(/^(?:Svolta a sinistra su|Svolta a destra su|Svolta leggermente a sinistra su|Svolta leggermente a destra su|Svolta bruscamente a sinistra su|Svolta bruscamente a destra su|Svolta|Prendi l'uscita)\s+/i, "Continua su ");
      } else {
        computedDesc = "Continua su questa strada";
      }

      return {
        ...hudBaseStepObj,
        icon: "⬆️",
        desc: computedDesc,
        title: "Continua",
        distance: formatMeters(distanceToTurn)
      };
    } else if (!isPreview && nextStepObj && distanceToTurn <= 150 && distanceToTurn > 0) {
      // Near the maneuver (<= 150m): show the upcoming maneuver itself
      return {
        ...nextStepObj,
        distance: formatMeters(distanceToTurn)
      };
    }

    // Default or preview fallback
    return hudBaseStepObj;
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
    if (currentDetectedSpeed !== null && currentDetectedSpeed >= 0) {
      return currentDetectedSpeed;
    }
    if (isDriving) {
      return Math.min(115, Math.max(25, Math.round(speed + (Math.sin(simStep * 0.4) * 5))));
    }
    return 0;
  }, [currentDetectedSpeed, isDriving, speed, simStep]);

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

  return (
    <div 
      id="fullscreen-nav-hud" 
      className="fixed inset-0 bg-[#070A13] text-slate-100 z-[9999] flex flex-col font-sans transition-all"
    >
      <div className="flex-1 relative bg-slate-950">
        {/* Live Map Canvas container */}
        <div ref={mapContainerRef} className="w-full h-full z-0"></div>

        {/* Top Preview Stats Bar or Active Directions HUD Overlay */}
        {isPreview ? (
          <div className="absolute top-4 inset-x-0 mx-auto max-w-3xl z-10 px-4">
            <div className="bg-[#0b101d]/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-4 pointer-events-auto">
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
                  🗺️
                </div>
                <div className="text-left min-w-0">
                  <h4 className="text-slate-100 font-black text-sm tracking-tight">
                    Anteprima Percorso Interno
                  </h4>
                  <p className="text-[11px] text-slate-400 font-sans truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                    Destinazione: <span className="text-amber-400 font-bold">{dest.name}</span>
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-5 divide-x divide-slate-800/60 bg-slate-900/60 py-2 rounded-xl border border-slate-800/80 w-full lg:w-[580px] text-center">
                <div className="flex flex-col items-center justify-center px-1">
                  <span className="text-[7.5px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider block truncate max-w-full">
                    <span className="inline sm:hidden">Distanza</span>
                    <span className="hidden sm:inline">Totale Distanza</span>
                  </span>
                  <span className="text-[11px] sm:text-sm font-black text-emerald-400 font-mono truncate max-w-full">{remainingDistanceKm.toFixed(1)} km</span>
                </div>
                <div className="flex flex-col items-center justify-center px-1">
                  <span className="text-[7.5px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider block truncate max-w-full">
                    <span className="inline sm:hidden">Tempo</span>
                    <span className="hidden sm:inline">Tempo Percorrenza</span>
                  </span>
                  <span className="text-[11px] sm:text-sm font-black text-slate-200 truncate max-w-full">{formatDuration(remainingMinutes)}</span>
                </div>
                <div className="flex flex-col items-center justify-center px-1">
                  <span className="text-[7.5px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider block truncate max-w-full">
                    <span className="inline sm:hidden">Arrivo</span>
                    <span className="hidden sm:inline">Orario di Arrivo</span>
                  </span>
                  <span className="text-[11px] sm:text-sm font-black text-slate-200 truncate max-w-full">{etaTimeStr}</span>
                </div>
                <div className="flex flex-col items-center justify-center px-1" title={hasRealPrice ? `Spesa stimata basata sul tuo ultimo rifornimento (${lastPrice.toFixed(3)} ${getCurrencySymbol(settings)}/L) e consumo (${consumptionKmPerL.toFixed(1)} km/L)` : `Spesa stimata basata su prezzo carburante di default (${lastPrice.toFixed(2)} ${getCurrencySymbol(settings)}/L)`}>
                  <span className="text-[7.5px] sm:text-[9px] font-bold text-amber-400/90 uppercase tracking-wider block truncate max-w-full">
                    <span className="inline sm:hidden">Spesa Carb.</span>
                    <span className="hidden sm:inline">Spesa Carburante</span>
                  </span>
                  <span className="text-[11px] sm:text-sm font-black text-[#A45C40] font-mono truncate max-w-full">{fuelCost.toFixed(2)} {getCurrencySymbol(settings)}</span>
                </div>
                <div className="flex flex-col items-center justify-center px-1" title={`Spesa pedaggio stimata basata sulle tratte autostradali rilevate (${tollStats.autostradaKm.toFixed(1)} km a 0.095 ${getCurrencySymbol(settings)}/km)`}>
                  <span className="text-[7.5px] sm:text-[9px] font-bold text-amber-400/90 uppercase tracking-wider block truncate max-w-full">
                    <span className="inline sm:hidden">Spesa Ped.</span>
                    <span className="hidden sm:inline">Spesa Pedaggio</span>
                  </span>
                  <span className="text-[11px] sm:text-sm font-black text-[#A45C40] font-mono truncate max-w-full">
                    {tollStats.tollCost > 0 ? `${tollStats.tollCost.toFixed(2)} ${getCurrencySymbol(settings)}` : "0.00 " + getCurrencySymbol(settings)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Top Directions HUD Overlay (Active Navigation) */
          <div className="absolute top-4 inset-x-0 mx-auto max-w-lg z-10 px-4 pointer-events-none">
            <div className="bg-[#0b101d]/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl flex items-center gap-4 pointer-events-auto">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0">
                {currentStepObj?.icon || "🛣️"}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-slate-100 font-bold text-sm sm:text-base font-sans leading-snug line-clamp-2">
                  {currentStepObj?.desc || currentStepObj?.title || "Segui la rotta sulla mappa"}
                </p>
              </div>
              {currentStepObj?.distance && (
                <div className="shrink-0 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs font-bold text-emerald-400">
                  {currentStepObj.distance}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Actions or Route Stats HUD Bar */}
        {isPreview ? (
          <div className="absolute bottom-0 inset-x-0 z-10">
            <div className="bg-[#0b101d]/98 backdrop-blur-md border-t border-slate-800/90 rounded-t-3xl px-6 py-5 pb-7 shadow-[0_-8px_30px_rgb(0,0,0,0.5)] flex items-center justify-between gap-4 pointer-events-auto font-sans">
              {/* X button for closing/returning back */}
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-200 font-bold rounded-2xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow-md text-sm shrink-0"
                title="Torna alla mappa"
              >
                <X className="w-5 h-5 text-rose-400" />
                <span>Indietro</span>
              </button>

              {/* Large Naviga button to start navigation */}
              <button
                type="button"
                onClick={() => {
                  setIsPreview(false);
                  setIsDriving(true);
                }}
                className="flex-1 max-w-md px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-lg active:scale-95 text-base border border-emerald-400/20"
              >
                <Navigation className="w-5 h-5 fill-white animate-pulse" />
                <span>NAVIGA</span>
              </button>
            </div>
          </div>
        ) : (
          /* Bottom Route Stats HUD Bar (Active Navigation) */
          <div className="absolute bottom-0 inset-x-0 z-10 pointer-events-none">
            <div className="bg-[#0b101d]/98 backdrop-blur-md border-t border-slate-800/90 rounded-t-3xl px-3 sm:px-6 py-2.5 sm:py-4 pb-4 sm:pb-5 shadow-[0_-8px_30px_rgb(0,0,0,0.5)] flex items-center justify-between pointer-events-auto font-sans gap-1.5 sm:gap-4">
              <div className="flex-1 min-w-0 flex items-center justify-between gap-1 sm:gap-3 md:gap-6 py-0.5">
                <div className="flex flex-col items-start shrink-0">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-tight sm:tracking-wider">Arrivo</span>
                  <span className="text-xs sm:text-sm font-black text-slate-200">{etaTimeStr}</span>
                </div>

                <div className="h-5 sm:h-6 w-px bg-slate-800/60 shrink-0" />

                <div className="flex flex-col items-start shrink-0">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-tight sm:tracking-wider">Distanza</span>
                  <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono">{remainingDistanceKm.toFixed(1)} km</span>
                </div>

                <div className="h-5 sm:h-6 w-px bg-slate-800/60 shrink-0" />

                <div className="flex flex-col items-start shrink-0">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-tight sm:tracking-wider">Tempo</span>
                  <span className="text-xs sm:text-sm font-black text-slate-200">{formatDuration(remainingMinutes)}</span>
                </div>

                <div className="h-5 sm:h-6 w-px bg-slate-800/60 shrink-0" />

                <div className="flex flex-col items-start shrink-0 bg-slate-900/90 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-xl border border-slate-800 shadow-2xs">
                  <span className="text-[9px] sm:text-[10px] font-bold text-amber-400/90 uppercase tracking-tight sm:tracking-wider flex items-center gap-0.5 sm:gap-1">
                    <Gauge className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 shrink-0" />
                    <span>Velocità</span>
                  </span>
                  <span className="text-xs sm:text-sm font-black text-amber-400 font-mono leading-none sm:leading-normal">
                    {displayDetectedSpeed} <span className="text-[9px] sm:text-[10px] font-bold text-amber-300/80">km/h</span>
                  </span>
                </div>
              </div>

              {/* X to close */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 sm:p-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 font-bold rounded-2xl transition-all flex justify-center items-center cursor-pointer shadow-md shrink-0 ml-1"
                title="Chiudi navigazione"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
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
                    zoom: 17.5,
                    pitch: 55,
                    bearing: Math.round(targetBearing),
                    padding: { top: window.innerHeight * 0.4, bottom: 50, left: 0, right: 0 },
                    duration: 1000
                  });
                }
              }}
              className="w-[52px] h-[52px] rounded-xl bg-[#0b101d]/95 text-white border border-slate-800 shadow-2xl hover:bg-slate-800 hover:border-slate-700 transition-all pointer-events-auto cursor-pointer flex items-center justify-center"
              title="Ricentra mappa"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <Compass className="w-6 h-6 text-emerald-400" />
              </div>
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
          className={`absolute top-[45%] left-1/2 md:top-auto md:bottom-38 md:left-auto md:right-32 z-30 max-h-[calc(100vh-240px)] w-[288px] md:w-[306px] bg-[#070c17]/95 backdrop-blur-md border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 pointer-events-auto ${
            isSidebarCollapsed 
              ? 'opacity-0 scale-95 pointer-events-none -translate-x-1/2 -translate-y-1/2 md:translate-x-0 md:translate-y-0' 
              : 'opacity-100 scale-100 pointer-events-auto -translate-x-1/2 -translate-y-1/2 md:translate-x-0 md:translate-y-0'
          }`}
          id="navigator-settings-container"
        >
          {/* Header */}
          <div className="px-3 py-2 bg-[#0d1527] border-b border-slate-800/80 flex items-center justify-between">
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
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 max-h-[220px] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
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
                <button
                  type="button"
                  onClick={() => setIsDriving(!isDriving)}
                  className={`px-6 py-3.5 text-white font-extrabold text-sm rounded-2xl border flex items-center gap-2.5 transition-all shadow-md cursor-pointer ${
                    isDriving 
                    ? 'bg-amber-600/90 border-amber-500 hover:bg-amber-700' 
                    : 'bg-emerald-600/90 border-emerald-500 hover:bg-emerald-700'
                  }`}
                  title={isDriving ? "Pausa simulatore di guida" : "Avvia simulatore di guida"}
                >
                  {isDriving ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
                  <span>{isDriving ? "PAUSA" : "SIMULA"}</span>
                </button>
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
    </div>
  );
}
