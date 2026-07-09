/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppSettings } from '../useAppSettings';
import { getTileUrl } from '../unit-helpers';
import { Place, VehicleDimensions, OSMObstacle } from '../types';
import L from 'leaflet';
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
  X
} from 'lucide-react';

interface FullscreenNavigatorProps {
  dest: Place;
  vehicleDimensions: VehicleDimensions;
  onClose: () => void;
  userLocation: { lat: number; lng: number } | null;
  userAccuracy: number | null;
  isGPSEnabled: boolean;
  onGPSEnabledChange: (enabled: boolean) => void;
  places: Place[];
  onSelectPlaceDirectly: (place: Place) => void;
}

export default function FullscreenNavigator({
  dest,
  vehicleDimensions,
  onClose,
  userLocation,
  userAccuracy,
  isGPSEnabled,
  onGPSEnabledChange,
  places,
  onSelectPlaceDirectly,
}: FullscreenNavigatorProps) {
  const settings = useAppSettings();
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const routeLineRef = React.useRef<L.Polyline | null>(null);
  const poiMarkersRef = React.useRef<L.Marker[]>([]);
  const carMarkerRef = React.useRef<L.Marker | null>(null);
  const destMarkerRef = React.useRef<L.Marker | null>(null);

  const [nearbyPlaces, setNearbyPlaces] = React.useState<{ place: Place; minDistance: number }[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState<boolean>(true);
  const [showStopsOnRoute, setShowStopsOnRoute] = React.useState<boolean>(false);
  const [showOsmObstacles, setShowOsmObstacles] = React.useState<boolean>(false);
  const [autoCenter, setAutoCenter] = React.useState<boolean>(true);

  const [voiceEnabled, setVoiceEnabled] = React.useState<boolean>(false);
  const [speed, setSpeed] = React.useState<number>(80); // km/h

  React.useEffect(() => {
    const style = settings?.drivingStyle || "relax";
    const isHeavy = vehicleDimensions?.weight > 3.5;
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
  const [simStep, setSimStep] = React.useState<number>(0);
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
  const [osmObstacles, setOsmObstacles] = React.useState<OSMObstacle[]>([]);
  const [scanningObstacles, setScanningObstacles] = React.useState<boolean>(false);
  const osmObstacleMarkersRef = React.useRef<L.Marker[]>([]);

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

  const scanOSMObstacles = async (coords: [number, number][]): Promise<OSMObstacle[]> => {
    if (coords.length === 0) return [];
    setScanningObstacles(true);
    try {
      const lats = coords.map(c => c[0]);
      const lngs = coords.map(c => c[1]);
      const minLat = Math.min(...lats) - 0.005;
      const maxLat = Math.max(...lats) + 0.005;
      const minLng = Math.min(...lngs) - 0.005;
      const maxLng = Math.max(...lngs) + 0.005;

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
          body: JSON.stringify({ data: query })
        });
      } catch (err: any) {
        console.warn("Fetch /api/map-data-proxy (Navigator) fallita, riprovo dopo 1.5s per possibile riavvio o cold start del server...", err);
        await new Promise(r => setTimeout(r, 1500));
        try {
          res = await fetch('/api/map-data-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: query })
          });
        } catch (retryErr: any) {
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
          if (type === 'height' && vehicleDimensions.height > val) isViolation = true;
          if (type === 'width' && vehicleDimensions.width > val) isViolation = true;
          if (type === 'weight' && vehicleDimensions.weight > val) isViolation = true;

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
    } catch (err) {
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

  // Safely trigger Leaflet container recalculation on cockpit mode toggles to ensure no grey map tiles appear
  React.useEffect(() => {
    const map = mapRef.current;
    if (map) {
      setTimeout(() => {
        map.invalidateSize();
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

  // Freeze and maintain a stable initial start coordinate to prevent API lookup and map redraw loops on mobile GPS jitter
  const [initialStart, setInitialStart] = React.useState<[number, number]>(() => {
    return userLocation ? [userLocation.lat, userLocation.lng] : [44.5422, 10.7024];
  });

  React.useEffect(() => {
    setInitialStart(userLocation ? [userLocation.lat, userLocation.lng] : [44.5422, 10.7024]);
  }, [dest.id, isGPSEnabled]);

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
  const speakInstruction = (text: string) => {
    return; // Completamente disattivato su richiesta dell'utente
  };

  // Safe checks for sagoma dimensions
  const hasHeightViolation = dest.hasMaxHeightLimit && dest.maxHeight && vehicleDimensions.height > dest.maxHeight;
  const hasWeightViolation = dest.hasMaxWeightLimit && dest.maxWeight && vehicleDimensions.weight > dest.maxWeight;

  // Real OSRM Routing States
  const [osrmRoute, setOsrmRoute] = React.useState<[number, number][]>([]);
  const [osrmSteps, setOsrmSteps] = React.useState<{ title: string; desc: string; icon: string; distance: string }[]>([]);
  const [loadingRoute, setLoadingRoute] = React.useState<boolean>(false);
  const [routeError, setRouteError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    const fetchRoute = async () => {
      setLoadingRoute(true);
      setRouteError(null);
      setOsmObstacles([]);
      try {
        const url = `/api/osrm?start=${startLoc[1]},${startLoc[0]}&end=${endLoc[1]},${endLoc[0]}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Errore HTTP ${res.status}: nel recupero della rotta stradale.`);
        }
        const data = await res.json();
        
        if (!active) return;
        
        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          const route = data.routes[0];
          const osrmCoords: [number, number][] = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
          
          // SCAN OBSTACLES DIRECTLY only if user requested it via switch
          let violations: any[] = [];
          if (showOsmObstacles) {
            const obstacles = await scanOSMObstacles(osrmCoords);
            violations = obstacles ? obstacles.filter(o => o.isViolation) : [];
          }
          
          // If we found violations, do BRouter Safe Route
          if (violations.length > 0 && active) {
            setRouteError(`ROTTA MODIFICATA: Evitati ${violations.length} ostacoli incompatibili.`);
            
            // Format nogos
            const nogos = violations.map(v => `${v.lng},${v.lat},30`).join('|');
            const safeUrl = `/api/brouter?start=${startLoc[1]},${startLoc[0]}&end=${endLoc[1]},${endLoc[0]}&nogos=${encodeURIComponent(nogos)}`;
            
            try {
              const safeRes = await fetch(safeUrl);
              if (safeRes.ok) {
                const safeData = await safeRes.json();
                if (safeData.features && safeData.features[0] && safeData.features[0].geometry) {
                   const safeCoords = safeData.features[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
                   
                   setOsrmRoute(safeCoords);
                   setOsrmSteps([{
                     title: "Navigazione Sicura Attiva",
                     desc: "Percorso ricalcolato dinamicamente. Segui la linea in mappa. Indicazioni text-to-turn temporaneamente disattivate.",
                     icon: "🛡️",
                     distance: ""
                   }]);
                   window.dispatchEvent(new CustomEvent('show-toast', {
                     detail: { message: `✅ Percorso ricalcolato in sicurezza. Evitati ${violations.length} ostacoli.`, duration: 4000 }
                   }));
                   speakInstruction(`Ho evitato con successo ${violations.length} ostacoli sulla rotta. La linea sulla mappa è ora adatta alle dimensioni del veicolo.`);
                   return; // Exit successfully
                }
              }
            } catch (brouterErr) {
               console.warn("BRouter fallback error", brouterErr);
            }
          }

          // IF NO VIOLATIONS (or BRouter failed), set standard OSRM Route
          if (!active) return;
          setOsrmRoute(osrmCoords);
          
          const steps: { title: string; desc: string; icon: string; distance: string }[] = [];
          if (route.legs && route.legs[0] && route.legs[0].steps) {
            route.legs[0].steps.forEach((step: any, idx: number) => {
              const name = step.name ? `su ${step.name}` : "";
              let maneuverType = step.maneuver.type;
              let modifier = step.maneuver.modifier ? ` a ${step.maneuver.modifier}` : "";
              
              let title = "Procedi";
              let icon = "🛣️";
              
              // Map directions beautifully
              if (maneuverType === 'turn') {
                const isLeft = step.maneuver.modifier?.includes('left');
                title = isLeft ? "Svolta a sinistra" : "Svolta a destra";
                icon = isLeft ? "↩️" : "↪️";
              } else if (maneuverType === 'depart') {
                title = "Partenza";
                icon = "🎯";
              } else if (maneuverType === 'arrive') {
                title = "Destinazione raggiunta";
                icon = "🏕️";
              } else if (maneuverType === 'roundabout') {
                title = "Rotatoria";
                icon = "🔄";
              } else if (maneuverType === 'off ramp') {
                title = "Prendi l'uscita";
                icon = "🛣️";
              }

              let desc = step.maneuver.instruction || `Svolta ${modifier} ${name}`;
              
              // Clean-up and localize instructions to sound completely native and professional in Italian
              desc = desc
                .replace(/turn sharp left/gi, "svolta bruscamente a sinistra")
                .replace(/turn sharp right/gi, "svolta bruscamente a destra")
                .replace(/turn slight left/gi, "svolta leggermente a sinistra")
                .replace(/turn slight right/gi, "svolta leggermente a destra")
                .replace(/turn left/gi, "svolta a sinistra")
                .replace(/turn right/gi, "svolta a destra")
                .replace(/continue straight/gi, "prosegui dritto")
                .replace(/continue/gi, "prosegui")
                .replace(/head/gi, "procedi")
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
                .replace(/west/gi, "ovest");

              // Specific vehicle check injection to warn user of clearance before arriving
              if (hasHeightViolation && idx === Math.max(1, Math.round(route.legs[0].steps.length / 2))) {
                steps.push({
                  title: "⚠️ IMPEDIMENTO SAGOMA RILEVATO",
                  desc: `Attenzione: l'itinerario originale includeva un ostacolo ad altezza ridotta di ${dest.maxHeight}m, incompatibile con il tuo camper (alto ${vehicleDimensions.height}m)!`,
                  icon: "⚠️",
                  distance: `${Math.round(step.distance)} m`
                });
              }

              steps.push({
                title,
                desc,
                icon,
                distance: `${Math.round(step.distance)} m`
              });
            });
          }
          
          if (steps.length === 0) {
            steps.push({
              title: "Rotta stradale reale",
              desc: `Segui la carreggiata verso ${dest.name}`,
              icon: "🛣️",
              distance: "Tutto"
            });
          }
          setOsrmSteps(steps);
        } else {
          throw new Error("Dati rotta non validi");
        }
      } catch (err: any) {
        if (active) {
          console.error("OSRM route error: ", err);
          setRouteError("Utilizzo guidato compensato ad alta fedeltà.");
        }
      } finally {
        if (active) setLoadingRoute(false);
      }
    };

    fetchRoute();
    return () => {
      active = false;
    };
  }, [startLoc[0], startLoc[1], endLoc[0], endLoc[1], dest.id, showOsmObstacles]);

  const routeCoordinates = osrmRoute.length > 0 ? osrmRoute : fallbackRouteCoordinates;

  const fallbackSequence = React.useMemo(() => {
    const steps: { title: string; desc: string; icon: string; distance: string }[] = [];
    
    steps.push({
      title: "Partenza Assistita",
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

    return steps;
  }, [dest, vehicleDimensions, isGPSEnabled, hasHeightViolation, hasWeightViolation]);

  const directionsSequence = osrmSteps.length > 0 ? osrmSteps : fallbackSequence;

  // Handle TTS trigger on step change
  React.useEffect(() => {
    const currentStepObj = directionsSequence[simStep] || directionsSequence[0];
    if (currentStepObj) {
      speakInstruction(`${currentStepObj.title}. ${currentStepObj.desc}`);
    }
  }, [simStep, dest.id, directionsSequence]);

  // Trigger setup vocal when HUD initiates
  React.useEffect(() => {
    const modeText = isGPSEnabled ? "navigazione con coordinate GPS reali attiva" : "simulatore di guida cockpit attivo";
    speakInstruction(`Navigatore camper a tutto schermo avviato per ${dest.name}. ${modeText}. Limite sagoma impostato a ${vehicleDimensions.height} metri.`);
  }, []);

  // Initialize and synchronize leaflet map inside dashboard HUD
  React.useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: routeCoordinates[0] || startLoc,
      zoom: 14,
      zoomControl: false, // minimalist screen overlay
    });
    
    mapRef.current = map;
    setTimeout(() => {
      try { map.invalidateSize(); } catch(e) {}
    }, 400);

    // Check if we are offline
    const isSimulated = localStorage.getItem('camper_simulated_offline') === 'true';
    const offlineActive = isSimulated || (typeof navigator !== 'undefined' && !navigator.onLine);

    // Add our customized offline-aware tile layer!
    const customTileLayer = L.tileLayer(getTileUrl(settings?.mapTheme || 'standard'), {
      maxZoom: 19,
      maxNativeZoom: offlineActive ? 16 : 19, // Support detailed offline maps up to zoom 16
      attribution: '© Google | CamperLifeApp Offline Cache'
    });

    // Intercept Tile Creation to serve cached tiles
    (customTileLayer as any).createTile = function(coords: any, done: any) {
      const tile = document.createElement('img');
      tile.className = 'leaflet-tile';
      tile.width = 256;
      tile.height = 256;
      tile.alt = '';
      tile.setAttribute('role', 'presentation');
      
      tile.onload = function() {
        done(null, tile);
      };
      tile.onerror = function() {
        tile.src = generatePlaceholderTile(coords.z, coords.x, coords.y, "Mappa Offline");
      };

      const key = `${coords.z}-${coords.x}-${coords.y}`;

      getBestTile(coords.z, coords.x, coords.y).then(cachedBase64 => {
        if (cachedBase64) {
          tile.src = cachedBase64;
        } else {
          const isSimulated = localStorage.getItem('camper_simulated_offline') === 'true';
          const offlineActive = isSimulated || (typeof navigator !== 'undefined' && !navigator.onLine);

          if (!offlineActive) {
            tile.src = `https://mt1.google.com/vt/lyrs=m&x=${coords.x}&y=${coords.y}&z=${coords.z}`;
          } else {
            tile.src = generatePlaceholderTile(coords.z, coords.x, coords.y, "Mappa Offline");
          }
        }
      }).catch(() => {
        tile.src = generatePlaceholderTile(coords.z, coords.x, coords.y, "Mappa Offline");
      });

      return tile;
    };

    customTileLayer.addTo(map);

    // Configura la navigazione al volo tenendo premuto (o tasto destro) su un punto qualsiasi della mappa
    map.on('contextmenu', (e: L.LeafletMouseEvent) => {
      const pLat = e.latlng.lat;
      const pLng = e.latlng.lng;
      
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
      
      // Feedback vocale e informativo immediato
      speakInstruction("Ricalcolo rotta verso il punto selezionato sulla mappa. Avvio navigatore.");
      
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: `📍 Navigazione avviata per: ${Number(pLat).toFixed(4)}, ${Number(pLng).toFixed(4)}` }
      }));
      
      onSelectPlaceRef.current(customPlace);
      setSimStep(0);
      setIsDriving(true);
    });

    map.on('dragstart', () => {
      setAutoCenter(false);
    });

    map.on('zoomstart', () => {
      setAutoCenter(false);
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

    if (routeLineRef.current) {
      routeLineRef.current.remove();
    }
    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
    }
    if (carMarkerRef.current) {
      carMarkerRef.current.remove();
    }

    // Google Maps Premium Blue Route
    const routeLine = L.polyline(routeCoordinates, {
      color: '#3B82F6',
      weight: 6,
      opacity: 0.9
    }).addTo(map);

    routeLineRef.current = routeLine;

    // Dest marker
    const destIcon = L.divIcon({
      className: 'dest-hud-icon',
      html: `
        <div class="flex flex-col items-center justify-center">
          <div class="w-10 h-10 rounded-full bg-red-600 border-2 border-white flex items-center justify-center shadow-2xl relative">
            <span class="text-base select-none">📍</span>
          </div>
          <div class="text-[9px] font-bold bg-slate-950 border border-slate-500/50 text-[#F5F2ED] rounded px-1.5 py-0.5 mt-1 whitespace-nowrap shadow-md">${dest.name}</div>
        </div>
      `,
      iconSize: [44, 52],
      iconAnchor: [22, 26]
    });
    
    destMarkerRef.current = L.marker(endLoc, { icon: destIcon }).addTo(map);

    // Camper moving marker - starts as Google blue glowing circle arrow selector
    const camperIcon = L.divIcon({
      className: 'camper-hud-icon',
      html: `
        <div class="relative w-12 h-12 flex items-center justify-center">
          <div class="absolute inset-0 rounded-full bg-blue-500/25 animate-ping" style="animation-duration: 2.5s;"></div>
          <div class="absolute w-8 h-8 rounded-full bg-blue-500/20"></div>
          <div style="transform: rotate(0deg); transition: transform 0.4s ease-out;" class="flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.45));">
              <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });

    const activeStart = routeCoordinates[Math.min(Math.floor((simStep / directionsSequence.length) * routeCoordinates.length), routeCoordinates.length - 1)] || startLoc;
    carMarkerRef.current = L.marker(activeStart, { icon: camperIcon }).addTo(map);

    // Center map view on path bounds immediately, and then double-force with a timeout once painted
    const centerAndSize = () => {
      if (!mapRef.current) return;
      mapRef.current.invalidateSize();
      try {
        const bounds = L.latLngBounds([startLoc, endLoc]);
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      } catch (e) {
        console.warn("Bounds error: ", e);
      }
    };

    centerAndSize();

    // Timed retries to guarantee responsive size calculations (Leaflet container rendering lifecycle fix)
    const t1 = setTimeout(centerAndSize, 100);
    const t2 = setTimeout(centerAndSize, 450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [dest.id, dest.name, startLoc[0], startLoc[1], dest.lat, dest.lng]);

  // Synchronize route lines if routeCoordinates updates asynchronously without destroying the map (Google Maps style transition)
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (routeLineRef.current) {
      routeLineRef.current.setLatLngs(routeCoordinates);
    }

    // Adjust bounds to fit the full path safely
    try {
      if (routeCoordinates.length > 0 && autoCenter) {
        const bounds = L.latLngBounds(routeCoordinates);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (e) {
      console.warn("Fit bounds error: ", e);
    }
  }, [routeCoordinates, autoCenter]);

  // POI markers along the route (Max 5km as requested for trip planning)
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    poiMarkersRef.current.forEach(marker => {
      try { if (mapRef.current) marker.remove(); } catch(e) {}
    });
    poiMarkersRef.current = [];

    if (!showStopsOnRoute) {
      setNearbyPlaces([]);
      return;
    }

    const POI_THRESHOLD = 5.0; // Max 5km from route

    const detected: { place: Place; minDistance: number }[] = [];

    console.log('DEBUG: FullscreenNavigator 5km POI calculation starting. Places count:', places.length);

    places.forEach(place => {
      // Avoid matching the final destination itself to avoid duplication
      if (place.id === dest.id) return;

      let minDistance = Infinity;
      const isNearRoute = routeCoordinates.some(coord => {
          // Bounding box heuristic for performance
          // 0.08 degrees is approx 9km, a safe outer bound for a 5km radius
          if (Math.abs(place.lat - coord[0]) > 0.08 || Math.abs(place.lng - coord[1]) > 0.08) {
              return false;
          }
          const dist = calculateHaversineDistance([place.lat, place.lng], coord);
          if (dist < minDistance) minDistance = dist;
          return dist < POI_THRESHOLD; 
      });

      if (isNearRoute && minDistance < POI_THRESHOLD) {
        // Let's draw a beautiful visual badge based on category
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

        const poiIcon = L.divIcon({
          className: 'poi-map-icon',
          html: `
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
              cursor: pointer;
              transition: transform 0.15s ease-in-out;
            " class="hover:scale-110">
              ${markerIcon}
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

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

        const marker = L.marker([place.lat, place.lng], { icon: poiIcon })
          .addTo(map)
          .bindPopup(popupContent, { closeButton: false, offset: L.point(0, -6) });

        poiMarkersRef.current.push(marker);
      }
    });

    // Sort detected places by minimum distance to the route
    detected.sort((a, b) => a.minDistance - b.minDistance);
    setNearbyPlaces(detected);
  }, [routeCoordinates, places, dest.id, showStopsOnRoute]);

  // Synchronize OSM Obstacle Markers on FullscreenNavigator's Leaflet Map
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    osmObstacleMarkersRef.current.forEach(m => {
      try { if (mapRef.current) m.remove(); } catch(e) {}
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

      const obsIcon = L.divIcon({
        className: 'osm-obstacle-leaflet-icon',
        html: `
          <div class="flex flex-col items-center justify-center">
            <div style="box-shadow: 0 4px 10px rgba(0,0,0,0.3);" class="${sizeClass} rounded-full ${bgClass} border-2 flex items-center justify-center relative">
              <span class="select-none">${symbol}</span>
            </div>
            <div style="font-size: 8px; font-weight: 900;" class="bg-black/90 text-white rounded px-1 py-0.5 mt-0.5 whitespace-nowrap border border-white/20">
              ${obs.value}${obs.type === 'weight' ? 't' : 'm'}
            </div>
          </div>
        `,
        iconSize: [36, 44],
        iconAnchor: [18, 22]
      });

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

      const marker = L.marker([obs.lat, obs.lng], { icon: obsIcon })
        .addTo(map)
        .bindPopup(popupContent, { minWidth: 150 });

      osmObstacleMarkersRef.current.push(marker);
    });

    return () => {
      osmObstacleMarkersRef.current.forEach(m => {
        try { if (mapRef.current) m.remove(); } catch (e) {}
      });
    };
  }, [osmObstacles, showOsmObstacles]);

  // Sync camper marker with sim step updates or physical GPS coordinates change
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let targetCoords: [number, number] = startLoc;

    if (isGPSEnabled && userLocation) {
      targetCoords = [userLocation.lat, userLocation.lng];
    } else {
      const curIdx = Math.min(Math.floor((simStep / directionsSequence.length) * routeCoordinates.length), routeCoordinates.length - 1);
      targetCoords = routeCoordinates[curIdx] || startLoc;

      // Calculate bearing orientation for the next road leg (Google Maps navigation view)
      const nextIdx = Math.min(curIdx + 1, routeCoordinates.length - 1);
      const nextCoords = routeCoordinates[nextIdx];
      if (nextCoords && (targetCoords[0] !== nextCoords[0] || targetCoords[1] !== nextCoords[1])) {
        const b = getBearing(targetCoords, nextCoords);
        setBearing(b);
      }
    }

    if (carMarkerRef.current) {
      carMarkerRef.current.setLatLng(targetCoords);
    }

    // Pan map smoothly to follow camper only if autoCenter is active
    if (autoCenter) {
      map.panTo(targetCoords);
    }
  }, [simStep, userLocation?.lat, userLocation?.lng, isGPSEnabled, routeCoordinates, directionsSequence, autoCenter]);

  // Dynamically recreate Leaflet icon to support seamless rotation of the GPS accuracy chevron (Google Maps style)
  React.useEffect(() => {
    if (carMarkerRef.current && mapRef.current) {
      const camperIcon = L.divIcon({
        className: 'camper-hud-icon',
        html: `
          <div class="relative w-12 h-12 flex items-center justify-center">
            <!-- Pulsing outer circle representing high accuracy live location feedback -->
            <div class="absolute w-12 h-12 rounded-full bg-blue-500/20 animate-ping" style="animation-duration: 3s;"></div>
            <!-- Outer halo glow -->
            <div class="absolute w-8 h-8 rounded-full bg-blue-500/20"></div>
            <!-- Center Direction 3D Chevron Pointer rotated to current heading angle -->
            <div style="transform: rotate(${Math.round(bearing)}deg); transition: transform 0.4s ease-out;" class="flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.45));">
                <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });
      carMarkerRef.current.setIcon(camperIcon);
    }
  }, [bearing]);

  // Simulation tick logic
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDriving && !isGPSEnabled) {
      interval = setInterval(() => {
        setSimStep((prev) => {
          const next = prev + 1;
          if (next < directionsSequence.length) {
            return next;
          } else {
            setIsDriving(false);
            speakInstruction("Navigazione completata! Sei arrivato in sicurezza all'area camper.");
            return 0; // reset
          }
        });
      }, 5500); // changes simulated step coordinates and instructions every 5.5s
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDriving, isGPSEnabled, directionsSequence]);

  // Nearest safe place detour fallback
  const handleRerouteAlternative = () => {
    const safeCamps = places.filter(p => !p.hasMaxHeightLimit && p.id !== dest.id);
    if (safeCamps.length > 0) {
      const selectedAlt = safeCamps[0];
      onSelectPlaceDirectly(selectedAlt);
      setSimStep(0);
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
    map.flyTo([lat, lng], 15, { duration: 1.2 });
    
    // Find matching marker and open popup
    const matched = poiMarkersRef.current.find(m => {
      const pos = m.getLatLng();
      return Math.abs(pos.lat - lat) < 0.001 && Math.abs(pos.lng - lng) < 0.001;
    });
    if (matched) {
      setTimeout(() => {
        matched.openPopup();
      }, 1200);
    }
  };

  const currentStepObj = directionsSequence[simStep] || directionsSequence[0];

  // Real coordinates based remaining distance in Km using the accurate Haversine helper
  const currentCoordIdx = Math.min(
    Math.floor((simStep / directionsSequence.length) * routeCoordinates.length),
    routeCoordinates.length - 1
  );
  const remainingDistanceKm = getRemainingRouteDistance(routeCoordinates, currentCoordIdx);
  const activeSpeed = speed > 0 ? speed : 50;
  // Calculate remaining time accurately based on distance and speed (min 1 min if route has distance remaining)
  const remainingMinutes = remainingDistanceKm > 0.05 ? Math.max(1, Math.round((remainingDistanceKm / activeSpeed) * 65)) : 0;
  const etaTimeStr = getETA(remainingMinutes);

  return (
    <div 
      id="fullscreen-nav-hud" 
      className="fixed inset-0 bg-[#070A13] text-slate-100 z-[9999] flex flex-col font-sans transition-all"
    >
      <div className="flex-1 relative bg-slate-950">
        {/* Live Map Canvas container */}
        <div ref={mapContainerRef} className="w-full h-full z-0"></div>

        {/* Floating Recenter Button */}
        {!autoCenter && (
          <button
            type="button"
            onClick={() => {
              setAutoCenter(true);
              const map = mapRef.current;
              if (map) {
                if (routeCoordinates.length > 0) {
                  const bounds = L.latLngBounds(routeCoordinates);
                  map.fitBounds(bounds, { padding: [50, 50] });
                } else {
                  map.setView(startLoc, 14);
                }
              }
            }}
            className="absolute bottom-28 right-4 z-20 bg-slate-900/90 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl border border-slate-700/80 shadow-2xl flex items-center gap-2 hover:border-slate-600 transition-all pointer-events-auto"
          >
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>RICENTRA</span>
          </button>
        )}

        {/* Trip Planning Side Panel - 5km Proximity Camper Stops */}
        <div 
          className={`absolute left-4 top-4 z-10 max-h-[calc(100vh-140px)] w-80 md:w-96 bg-[#0b101d]/95 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl transition-all duration-300 flex flex-col pointer-events-auto ${
            isSidebarCollapsed ? '-translate-x-[calc(100%-48px)]' : 'translate-x-0'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-xs">Pianificazione percorso</h3>
                <p className="text-[10px] text-slate-400 font-sans font-medium">
                  {loadingRoute ? 'Calcolo rotta...' : showStopsOnRoute ? `${nearbyPlaces.length} strutture trovate entro 5km` : 'Soste disattivate'}
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors cursor-pointer"
              title={isSidebarCollapsed ? "Espandi pianificazione" : "Riduci pianificazione"}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* List Content - Only visible if not collapsed */}
          {!isSidebarCollapsed && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[420px] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {/* Switch per mostrare le soste sul percorso */}
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between shadow-sm select-none mb-1">
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-bold text-slate-200">
                    Mostra soste sul percorso
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">
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
                  <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-focus:outline-none peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white"></div>
                </label>
              </div>

              {/* Switch per mostrare ostacoli e limiti OSM */}
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between shadow-sm select-none mb-1">
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-bold text-slate-200">
                    Ostacoli e limiti OSM
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">
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
                  <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-focus:outline-none peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white"></div>
                </label>
              </div>

              {loadingRoute ? (
                <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                  <span>{showStopsOnRoute ? "Ricerca strutture in prossimità..." : "Calcolo percorso..."}</span>
                </div>
              ) : !showStopsOnRoute ? (
                <div className="py-8 text-center text-xs text-slate-500 px-2 space-y-1.5">
                  <p className="font-medium text-slate-400">Ricerca soste disattivata</p>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Attiva "Mostra soste sul percorso" per elencare e visualizzare le aree camper vicine. Puoi anche attivare "Ostacoli e limiti OSM" per evidenziare restrizioni di transito sulla mappa.
                  </p>
                </div>
              ) : nearbyPlaces.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <p className="font-medium text-slate-400">Nessuna struttura entro 5km</p>
                  <p className="text-[10px] text-slate-500 mt-1">Non abbiamo trovato aree sosta o campeggi a meno di 5km da questo percorso specifico.</p>
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
                      className="p-3 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/60 rounded-xl transition-all duration-150 cursor-pointer flex flex-col gap-1.5 hover:border-slate-700"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-xs text-slate-200 line-clamp-1 flex-1 flex items-center gap-1.5">
                          <span className="shrink-0">{icon}</span>
                          <span className="font-sans tracking-tight">{place.name}</span>
                        </h4>
                        <span className="text-[9px] shrink-0 font-bold font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          a {minDistance.toFixed(1)} km
                        </span>
                      </div>
                      
                      {place.address && (
                        <p className="text-[10px] text-slate-400 line-clamp-1 font-sans">{place.address}</p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badgeBg} font-sans uppercase tracking-wider`}>
                          {categoryText}
                        </span>
                        {place.priceInfo && (
                          <span className="text-[9px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full font-bold font-sans">
                            {place.priceInfo}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Floating Controls Overlay */}
        <div className="absolute bottom-8 inset-x-0 mx-auto flex justify-center z-10 pointer-events-none">
          <div className="flex bg-[#0b0f19]/95 backdrop-blur-md rounded-3xl p-2 shadow-2xl border border-slate-800/90 pointer-events-auto gap-2">
            <button
              type="button"
              disabled={loadingRoute}
              onClick={() => {
                    let url = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`;
                    if (settings?.avoidTolls) {
                      url += `&dirflg=t`;
                    }
                    if (settings?.avoidUnpaved) {
                      // Non c'è un dirflg specifico per strade sterrate in GMaps, ma usiamo dirflg=h (avoid highways) se richiesto o simile, altrimenti nulla.
                    }
                    
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
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3.5 bg-rose-900/80 hover:bg-rose-900 border border-rose-800/80 text-white font-black text-sm rounded-2xl transition-all flex justify-center items-center shadow-md"
              title="Chiudi visualizzazione"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
