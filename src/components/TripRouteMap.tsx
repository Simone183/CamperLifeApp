import React from "react";
import L from "leaflet";
import { Trip } from "../types";
import {
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Plus,
  Search,
  Compass,
  MapPin,
  Map as MapIcon,
  ArrowUp,
  ArrowDown,
  Navigation,
  Check,
  X,
  Edit2,
  Share2
} from "lucide-react";
import TripVideoShareModal from "./TripVideoShareModal";

interface TripRouteMapProps {
  trip: Trip;
  onSaveRoute: (routePoints: Array<{ lat: number; lng: number; name?: string }>) => void;
  onNavigateToPlace?: (place: any) => void;
}

const geocodeCache: Record<string, { lat: number; lng: number }> = {
  "roma": { lat: 41.9028, lng: 12.4964 },
  "milano": { lat: 45.4642, lng: 9.1900 },
  "torino": { lat: 45.0703, lng: 7.6869 },
  "napoli": { lat: 40.8518, lng: 14.2681 },
  "venezia": { lat: 45.4408, lng: 12.3155 },
  "firenze": { lat: 43.7696, lng: 11.2558 },
  "bologna": { lat: 44.4949, lng: 11.3426 },
  "genova": { lat: 44.4056, lng: 8.9463 },
  "palermo": { lat: 38.1157, lng: 13.3615 },
  "bari": { lat: 41.1171, lng: 16.8719 },
};

const geocodeLocation = async (location: string): Promise<{ lat: number; lng: number } | null> => {
  const cleanLoc = location.trim().toLowerCase();
  if (geocodeCache[cleanLoc]) {
    return geocodeCache[cleanLoc];
  }
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`, {
      headers: {
        "User-Agent": "CamperLifeApp/2.0 (sambucci.simone@gmail.com)"
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        geocodeCache[cleanLoc] = coords;
        return coords;
      }
    }
  } catch (err) {
    console.error("Geocoding failed for " + location, err);
  }
  return null;
};

export function TripRouteMap({ trip, onSaveRoute, onNavigateToPlace }: TripRouteMapProps) {
  const [editMode, setEditMode] = React.useState(false);
  const [points, setPoints] = React.useState<Array<{ lat: number; lng: number; name?: string }>>([]);
  const [isSatellite, setIsSatellite] = React.useState(false);
  const justSavedRef = React.useRef(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  // Animation states
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [progressIndex, setProgressIndex] = React.useState(0);
  const [animationSpeed, setAnimationSpeed] = React.useState(15); // Default to 15x for very snappy movement
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);

  const handleAddCurrentGPS = () => {
    if (!navigator.geolocation) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "❌ Geolocalizzazione non supportata dal tuo browser." }
        })
      );
      return;
    }

    setIsLocating(true);
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message: "🛰️ Acquisizione della posizione GPS in corso..." }
      })
    );

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: { message: "📍 Posizione GPS trovata. Risoluzione indirizzo..." }
          })
        );

        let resolvedName = `Tappa GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
        try {
          const res = await fetch(`/api/nominatim-reverse?lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              resolvedName = data.display_name.split(",")[0] || resolvedName;
              if (data.address) {
                resolvedName = data.address.village || data.address.town || data.address.city || data.address.road || resolvedName;
              }
            }
          }
        } catch (err) {
          console.error("GPS Reverse geocoding error:", err);
        }

        setPoints((prev) => [...prev, { lat: latitude, lng: longitude, name: resolvedName }]);
        setIsLocating(false);
        
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 12);
        }

        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: { message: `📍 Tappa aggiunta tramite GPS: ${resolvedName}` }
          })
        );
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsLocating(false);
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: { message: "❌ Errore GPS: impossibile ottenere la posizione." }
          })
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Refs for leaflet
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const tileLayerRef = React.useRef<L.TileLayer | null>(null);
  const camperMarkerRef = React.useRef<L.Marker | null>(null);
  const fullPolylineRef = React.useRef<L.Polyline | null>(null);
  const passedPolylineRef = React.useRef<L.Polyline | null>(null);
  const markersRef = React.useRef<L.Marker[]>([]);
  const requestRef = React.useRef<number | null>(null);
  const isPlayingRef = React.useRef(false);

  const [photoPoints, setPhotoPoints] = React.useState<Array<{ id: string; url: string; description: string; lat: number; lng: number; locationName: string }>>([]);
  const [isGeocoding, setIsGeocoding] = React.useState(false);

  const pointsRef = React.useRef(points);
  React.useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  // Sync points state with prop when trip or mode changes
  React.useEffect(() => {
    if (editMode) {
      if (trip.routePoints && trip.routePoints.length > 0) {
        setPoints(trip.routePoints);
      } else if (pointsRef.current.length > 0) {
        // Keep current points (which contains the geocoded movements) so they can be edited or deleted
      } else {
        setPoints([]);
      }
      setIsPlaying(false);
      isPlayingRef.current = false;
      setProgressIndex(0);
      return;
    }

    if (justSavedRef.current) {
        justSavedRef.current = false;
        return;
    }

    const hasMovements = trip.movements && trip.movements.length > 0;
    if (hasMovements) {
      let isSubscribed = true;
      setIsGeocoding(true);

      const geocodeAllMovements = async () => {
        const resolvedPoints: Array<{ lat: number; lng: number; name?: string }> = [];
        
        for (const mov of trip.movements) {
          if (!isSubscribed) return;
          const locName = mov.location;
          const coords = await geocodeLocation(locName);
          if (coords) {
            resolvedPoints.push({
              lat: coords.lat,
              lng: coords.lng,
              name: locName,
            });
          }
        }
        
        if (isSubscribed) {
          setPoints(resolvedPoints);
          setIsGeocoding(false);
        }
      };
      
      geocodeAllMovements();
      return () => {
        isSubscribed = false;
      };
    } else if (trip.routePoints && trip.routePoints.length > 0) {
      setPoints(trip.routePoints);
      setIsPlaying(false);
      isPlayingRef.current = false;
      setProgressIndex(0);
    } else {
      setPoints([]);
      setIsPlaying(false);
      isPlayingRef.current = false;
      setProgressIndex(0);
    }

  }, [trip, editMode]);

  // Geocode photos matching their assigned locationNames
  React.useEffect(() => {
    let isSubscribed = true;
    const geocodePhotos = async () => {
      const resolvedPhotos: typeof photoPoints = [];
      for (const photo of trip.photos || []) {
        if (!isSubscribed) return;
        if (photo.locationName) {
          const coords = await geocodeLocation(photo.locationName);
          if (coords) {
            resolvedPhotos.push({
              id: photo.id,
              url: photo.url,
              description: photo.description,
              lat: coords.lat,
              lng: coords.lng,
              locationName: photo.locationName,
            });
          }
        }
      }
      if (isSubscribed) {
        setPhotoPoints(resolvedPhotos);
      }
    };
    geocodePhotos();
    return () => {
      isSubscribed = false;
    };
  }, [trip.id, trip.photos]);

  // Real road route coordinates state
  const [roadCoords, setRoadCoords] = React.useState<L.LatLng[]>([]);
  const [isRoutingLoading, setIsRoutingLoading] = React.useState(false);

  // Generate fallback smooth list of coordinates between points for the animation (linear interpolation)
  const interpolatedCoords = React.useMemo(() => {
    if (points.length < 2) return [];
    const stepsPerSegment = 30; // Number of intermediate steps between stops
    const coords: L.LatLng[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      for (let step = 0; step <= stepsPerSegment; step++) {
        const t = step / stepsPerSegment;
        const lat = p1.lat + (p2.lat - p1.lat) * t;
        const lng = p1.lng + (p2.lng - p1.lng) * t;
        
        // Avoid duplicate coordinates at segment joints
        if (step === stepsPerSegment && i < points.length - 2) {
          continue;
        }
        coords.push(new L.LatLng(lat, lng));
      }
    }
    return coords;
  }, [points]);

  // Fetch actual driving road coordinates from OSRM proxy
  React.useEffect(() => {
    if (points.length < 2) {
      setRoadCoords([]);
      return;
    }

    let isSubscribed = true;
    setIsRoutingLoading(true);

    const fetchAllSegments = async () => {
      try {
        const fetchPromises = [];
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i];
          const p2 = points[i + 1];
          const url = `/api/osrm?start=${p1.lng},${p1.lat}&end=${p2.lng},${p2.lat}`;
          fetchPromises.push(
            fetch(url)
              .then(async (res) => {
                if (!res.ok) {
                  throw new Error(`Failed to fetch segment ${i}`);
                }
                const data = await res.json();
                if (data && data.routes && data.routes[0] && data.routes[0].geometry) {
                  const geom = data.routes[0].geometry;
                  if (geom.type === "LineString") {
                    return geom.coordinates.map((c: number[]) => new L.LatLng(c[1], c[0]));
                  }
                }
                // Fallback to straight line for this segment
                const segmentCoords: L.LatLng[] = [];
                const steps = 30;
                for (let step = 0; step <= steps; step++) {
                  const t = step / steps;
                  segmentCoords.push(
                    new L.LatLng(
                      p1.lat + (p2.lat - p1.lat) * t,
                      p1.lng + (p2.lng - p1.lng) * t
                    )
                  );
                }
                return segmentCoords;
              })
              .catch((err) => {
                console.error(`OSRM segment error ${i}:`, err);
                // Fallback to straight line
                const segmentCoords: L.LatLng[] = [];
                const steps = 30;
                for (let step = 0; step <= steps; step++) {
                  const t = step / steps;
                  segmentCoords.push(
                    new L.LatLng(
                      p1.lat + (p2.lat - p1.lat) * t,
                      p1.lng + (p2.lng - p1.lng) * t
                    )
                  );
                }
                return segmentCoords;
              })
          );
        }

        const segmentsResults = await Promise.all(fetchPromises);
        if (!isSubscribed) return;

        const allCoords: L.LatLng[] = [];
        segmentsResults.forEach((segment) => {
          allCoords.push(...segment);
        });

        // Filter out duplicate consecutive points
        const cleanCoords = allCoords.filter((coord, idx) => {
          if (idx === 0) return true;
          const prev = allCoords[idx - 1];
          return coord.lat !== prev.lat || coord.lng !== prev.lng;
        });

        setRoadCoords(cleanCoords);
      } catch (err) {
        console.error("Error building real road route:", err);
      } finally {
        if (isSubscribed) {
          setIsRoutingLoading(false);
        }
      }
    };

    fetchAllSegments();

    return () => {
      isSubscribed = false;
    };
  }, [points]);

  // Combine real road coordinates with linear fallback coordinates
  const finalCoords = React.useMemo(() => {
    return roadCoords.length >= 2 ? roadCoords : interpolatedCoords;
  }, [roadCoords, interpolatedCoords]);

  // Keep ref in sync
  React.useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Animation loop
  React.useEffect(() => {
    const lastTimeRef = { current: 0 };

    const animate = (time: number) => {
      if (!isPlayingRef.current) return;
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;

      const msPerFrame = 30; // Constant ~33 frames per second

      if (delta >= msPerFrame) {
        setProgressIndex((prev) => {
          // Advance by step size proportional to animationSpeed
          const step = Math.max(1, Math.round(animationSpeed));
          const nextIndex = prev + step;
          if (nextIndex >= finalCoords.length - 1) {
            setIsPlaying(false);
            isPlayingRef.current = false;
            return finalCoords.length - 1;
          }
          return nextIndex;
        });
        lastTimeRef.current = time;
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPlaying, finalCoords, animationSpeed]);

  // Auto-play the camper animation when a trip is marked as "Completato"
  React.useEffect(() => {
    if (!editMode && trip.status === "Completato" && finalCoords.length >= 2) {
      const timer = setTimeout(() => {
        setProgressIndex(0);
        setIsPlaying(true);
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: { message: "🎉 Viaggio Completato! Ecco il riepilogo animato del tuo tragitto con le foto delle tappe." }
          })
        );
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [trip.status, trip.id, editMode, finalCoords.length]);

  // Initialize and update Leaflet Map
  React.useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Build Map
    const mapInstance = L.map(container, {
      center: [43.0, 11.5], // Center in Val d'Orcia/Central Italy by default
      zoom: 8,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    const initialUrl = isSatellite
      ? "/api/map-tile/{z}/{x}/{y}?lyrs=s"
      : "/api/map-tile/{z}/{x}/{y}?lyrs=m";
    const initialAttr = isSatellite
      ? "Tiles &copy; Esri &mdash; Source: Esri"
      : "Dati cartografici © contributori di OpenStreetMap";

    const layer = L.tileLayer(initialUrl, {
      attribution: initialAttr
    }).addTo(mapInstance);
    tileLayerRef.current = layer;

    mapRef.current = mapInstance;

    // Click handler for EDIT mode to insert points
    if (editMode) {
      mapInstance.on("click", async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        
        // Show temporary toast
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: { message: "📍 Tappa selezionata sulla mappa. Risoluzione indirizzo..." }
          })
        );

        // Fetch reverse geocoding to get a clean name
        let resolvedName = `Tappa ${points.length + 1}`;
        try {
          const res = await fetch(`/api/nominatim-reverse?lat=${lat}&lon=${lng}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              resolvedName = data.display_name.split(",")[0] || resolvedName;
              if (data.address) {
                resolvedName = data.address.village || data.address.town || data.address.city || data.address.road || resolvedName;
              }
            }
          }
        } catch (err) {
          console.error("Reverse geocoding error:", err);
        }

        setPoints((prev) => [...prev, { lat, lng, name: resolvedName }]);
      });
    }

    return () => {
      mapInstance.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
    };
  }, [editMode, trip.id]); // Recreate map only when mode or trip changes

  // Dynamically swap tile layers when isSatellite changes
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const url = isSatellite
      ? "/api/map-tile/{z}/{x}/{y}?lyrs=s"
      : "/api/map-tile/{z}/{x}/{y}?lyrs=m";
    const attr = isSatellite
      ? "Tiles &copy; Esri &mdash; Source: Esri"
      : "© OpenStreetMap contributors";

    const newTileLayer = L.tileLayer(url, { attribution: attr }).addTo(map);
    tileLayerRef.current = newTileLayer;
  }, [isSatellite]);

  // Update map layer markings (markers, polylines, camper)
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 1. Clear previous markers & polylines
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (fullPolylineRef.current) {
      fullPolylineRef.current.remove();
      fullPolylineRef.current = null;
    }
    if (passedPolylineRef.current) {
      passedPolylineRef.current.remove();
      passedPolylineRef.current = null;
    }
    if (camperMarkerRef.current) {
      camperMarkerRef.current.remove();
      camperMarkerRef.current = null;
    }

    if (points.length === 0) return;

    // 2. Add Stop Markers
    points.forEach((pt, idx) => {
      const isStart = idx === 0;
      const isEnd = idx === points.length - 1;
      
      let markerColor = "bg-[#3E4A35] text-white";
      if (isStart) markerColor = "bg-emerald-600 text-white font-black";
      if (isEnd && points.length > 1) markerColor = "bg-rose-600 text-white font-black";

      const stopIcon = L.divIcon({
        className: "custom-stop-marker",
        html: `
          <div class="flex items-center justify-center">
            <div class="w-6 h-6 rounded-full ${markerColor} border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-md transform hover:scale-110 transition-transform">
              ${idx + 1}
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([pt.lat, pt.lng], { icon: stopIcon })
        .addTo(map)
        .bindPopup(`
          <div class="p-1 text-xs">
            <strong class="text-slate-800">Tappa ${idx + 1}: ${pt.name || "Punto"}</strong>
            <p class="text-[9px] text-slate-500 mt-0.5 font-mono">Lat: ${pt.lat.toFixed(4)}, Lng: ${pt.lng.toFixed(4)}</p>
          </div>
        `);

      markersRef.current.push(marker);
    });

    // 3. Draw full planned path line
    if (finalCoords.length >= 2) {
      fullPolylineRef.current = L.polyline(finalCoords, {
        color: "#3E4A35",
        weight: 3.5,
        opacity: 0.7,
      }).addTo(map);

      // Fit bounds to show entire route
      const bounds = L.latLngBounds(finalCoords);
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 12);
    }

    // 4. Draw traveled path & animated camper
    if (finalCoords.length >= 2) {
      const startCoord = finalCoords[progressIndex] || finalCoords[0];

      // Draw custom animated camper icon
      const camperIcon = L.divIcon({
        className: "camper-animated-icon",
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 bg-amber-500 rounded-full animate-ping opacity-25"></div>
            <div class="w-8 h-8 bg-amber-500 border-2 border-white rounded-full flex items-center justify-center shadow-lg text-sm select-none transform hover:scale-115 transition-transform">
              🚐
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      camperMarkerRef.current = L.marker([startCoord.lat, startCoord.lng], { icon: camperIcon })
        .addTo(map)
        .bindPopup(`
          <div class="p-1.5 text-xs text-center font-sans">
            <span class="text-[10px] font-bold text-amber-600 block uppercase tracking-wider">In Viaggio 🚐</span>
            <span class="font-black text-slate-800 text-[11px] block mt-0.5">
              ${getCurrentSegmentName()}
            </span>
          </div>
        `);

      // Passed Route Line
      const passedPath = finalCoords.slice(0, progressIndex + 1);
      passedPolylineRef.current = L.polyline(passedPath, {
        color: "#f59e0b", // Amber 500
        weight: 4.5,
        opacity: 0.9,
      }).addTo(map);

      // Center camera on camper when animating
      if (isPlaying) {
        map.setView([startCoord.lat, startCoord.lng], map.getZoom(), { animate: true });
      }
    }

    // 5. Add Photo Markers on the Map
    photoPoints.forEach((ph) => {
      const photoIcon = L.divIcon({
        className: "custom-photo-marker",
        html: `
          <div class="relative group cursor-pointer">
            <!-- Tiny Polaroid container -->
            <div class="w-13 h-14 bg-white p-0.5 pb-2 rounded shadow-lg border border-slate-200 transform hover:scale-125 hover:-rotate-3 transition-all duration-305">
              <img src="${ph.url}" class="w-10 h-7 mx-auto mt-0.5 object-cover rounded-xs" />
              <div class="w-full flex items-center justify-center mt-0.5">
                <span class="text-[5px] font-bold text-slate-500 font-sans truncate max-w-full block text-center">${ph.locationName}</span>
              </div>
            </div>
            <!-- Pin indicator -->
            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-rose-500 rounded-full border border-white shadow-sm animate-pulse"></div>
          </div>
        `,
        iconSize: [52, 57],
        iconAnchor: [26, 52] // Anchor point at bottom middle of the pin
      });

      const photoMarker = L.marker([ph.lat, ph.lng], { icon: photoIcon })
        .addTo(map)
        .bindPopup(`
          <div class="p-1 font-sans w-48 text-left">
            <div class="w-full h-28 overflow-hidden rounded-lg bg-stone-100 border border-slate-100">
              <img src="${ph.url}" class="w-full h-full object-cover" />
            </div>
            <p class="text-[11px] font-bold text-slate-850 mt-1.5 leading-tight">${ph.description}</p>
            <div class="flex items-center gap-1 mt-1 text-[9px] text-blue-850 font-black uppercase font-mono">
              <span>📍 Tappa:</span>
              <span>${ph.locationName}</span>
            </div>
          </div>
        `, {
          maxWidth: 200,
          closeButton: false,
        });

      markersRef.current.push(photoMarker);
    });

  }, [points, finalCoords, progressIndex, editMode, photoPoints]);

  // Helper to determine what segment/location the camper is currently passing
  const getCurrentSegmentName = () => {
    if (points.length === 0) return "";
    if (points.length === 1) return points[0].name || "Inizio";
    
    // Find the approximate stop index
    const totalSteps = finalCoords.length;
    if (totalSteps === 0) return "";
    
    const stopSegmentLength = totalSteps / (points.length - 1);
    const stopIndex = Math.floor(progressIndex / stopSegmentLength);
    
    if (stopIndex >= points.length - 1) {
      return `Arrivato a: ${points[points.length - 1].name || "Destinazione"}`;
    }
    
    const fromStop = points[stopIndex]?.name || "Tappa " + (stopIndex + 1);
    const toStop = points[stopIndex + 1]?.name || "Tappa " + (stopIndex + 2);
    
    return `Da: ${fromStop} ➔ A: ${toStop}`;
  };

  // Search places using OSM Nominatim API proxy
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    console.log("TripRouteMap: Searching for:", searchQuery);
    setIsSearching(true);
    try {
      const res = await fetch(`/api/nominatim?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      console.log("TripRouteMap: Search result:", data);
      if (Array.isArray(data)) {
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Add searched point
  const handleAddSearchResult = (result: any) => {
    console.log("TripRouteMap: Adding search result:", result);
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "DEBUG: handleAddSearchResult called" } }));
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    let name = result.display_name.split(",")[0] || "Tappa";
    if (result.address) {
      name = result.address.village || result.address.town || result.address.city || result.address.road || name;
    }

    setPoints((prev) => [...prev, { lat, lng, name }]);
    setSearchQuery("");
    setSearchResults([]);

    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 12);
    }
  };

  // List manipulation helpers
  const handleRemovePoint = (index: number) => {
    setPoints((prev) => prev.filter((_, idx) => idx !== index));
    setProgressIndex(0);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setPoints((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
    setProgressIndex(0);
  };

  const handleMoveDown = (index: number) => {
    if (index === points.length - 1) return;
    setPoints((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
    setProgressIndex(0);
  };

  const handleEditPointName = (index: number, newName: string) => {
    setPoints((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], name: newName };
      return copy;
    });
  };

  // Save changes
  const handleSave = () => {
    justSavedRef.current = true;
    onSaveRoute(points);
    setEditMode(false);
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message: "🗺️ Percorso del viaggio salvato correttamente!" }
      })
    );
  };

  return (
    <div className="bg-[#FAF9F6] border border-stone-200 rounded-2xl p-4 shadow-xs space-y-4">
      {/* Title & Modes Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#3E4A35]/10 rounded-lg">
            <MapIcon className="w-4 h-4 text-[#3E4A35]" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">
              Pianificazione percorso 🗺️
            </h3>
            <p className="text-[10px] text-stone-500 font-sans flex items-center gap-1">
              {points.length === 0 
                ? "Nessun tracciato inserito per questo viaggio." 
                : `${points.length} tappe salvate nel tragitto`}
              {isRoutingLoading && (
                <span className="text-amber-600 animate-pulse font-bold ml-1.5 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 animate-spin" /> Calcolo tracciato stradale...
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-1.5 text-[10px] font-black text-[#3E4A35] hover:text-white bg-white hover:bg-[#3E4A35] border border-stone-250 hover:border-transparent py-1.5 px-3 rounded-lg transition-all shadow-2xs cursor-pointer"
            >
              <Edit2 className="w-3 h-3" />
              Configura Percorso
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setEditMode(false)}
                className="flex items-center gap-1 text-[10px] font-black text-slate-500 hover:text-slate-800 bg-white border border-stone-200 py-1.5 px-3 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-3 h-3" />
                Annulla
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 text-[10px] font-black text-white bg-emerald-600 hover:bg-emerald-700 py-1.5 px-3 rounded-lg transition-all shadow-2xs cursor-pointer"
              >
                <Check className="w-3 h-3" />
                Salva Percorso
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* LEFT PANEL (STOPS MANAGER) */}
        <div className="lg:col-span-1 space-y-4 font-sans border-r border-stone-150/50 pr-0 lg:pr-4">
            
            {/* Search Stop - Only visible in EDIT mode */}
            {editMode && (
              <form onSubmit={handleSearch} className="space-y-1.5 relative">
                <div className="flex justify-between items-center gap-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Cerca Città o Luogo da aggiungere
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCurrentGPS}
                    disabled={isLocating}
                    className="text-[9px] font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1 bg-sky-100/80 hover:bg-sky-200/80 p-1 px-2 rounded-md transition-all cursor-pointer border border-sky-200"
                  >
                    <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                    {isLocating ? "Rilevamento GPS..." : "Aggiungi con GPS"}
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="es. Pienza, San Quirico d'Orcia"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-bold bg-white"
                  />
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="bg-[#3E4A35] hover:bg-[#2d3725] text-white p-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center disabled:opacity-50 cursor-pointer"
                  >
                    {isSearching ? "..." : <Search className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="absolute z-10 bg-white border border-stone-200 rounded-lg shadow-lg mt-1 w-72 max-h-48 overflow-y-auto divide-y divide-stone-100">
                    {searchResults.map((res, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddSearchResult(res)}
                        className="w-full text-left p-2 hover:bg-stone-50 text-[10px] font-bold text-slate-700 block transition-colors truncate"
                      >
                        📍 {res.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </form>
            )}

            {/* List of Stops */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Tappe del Viaggio ({points.length})
                </span>
                {editMode && points.length > 0 && (
                  <button
                    onClick={() => setPoints([])}
                    className="text-[9px] font-black text-rose-600 hover:underline"
                  >
                    Cancella tutto
                  </button>
                )}
              </div>

              {points.length === 0 ? (
                <div className="p-4 bg-stone-50 border border-stone-150 rounded-xl text-center text-[10.5px] text-stone-400">
                  {editMode 
                    ? "Nessuna tappa inserita. Fai clic sulla mappa a destra oppure cerca un luogo qui sopra!"
                    : "Nessuna tappa inserita per questo viaggio."}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                  {points.map((pt, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-white border border-stone-150 rounded-xl flex items-center justify-between gap-2 shadow-2xs group hover:border-[#3E4A35]/30 transition-all"
                    >
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="w-4 h-4 rounded-full bg-[#3E4A35]/10 text-[#3E4A35] font-mono text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        {editMode ? (
                          <input
                            type="text"
                            value={pt.name || ""}
                            onChange={(e) => handleEditPointName(idx, e.target.value)}
                            className="text-[11px] font-bold text-slate-700 bg-transparent border-b border-transparent focus:border-stone-300 outline-none w-full py-0.5 truncate"
                            placeholder={`Tappa ${idx + 1}`}
                          />
                        ) : (
                          <span className="text-[11px] font-bold text-slate-800 truncate">
                            {pt.name || `Tappa ${idx + 1}`}
                          </span>
                        )}
                      </div>

                      {/* Controls & Navigation Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Navigatore Button - Always visible! */}
                        {onNavigateToPlace && (
                          <button
                            onClick={() => {
                              onNavigateToPlace({
                                id: "place_" + Date.now(),
                                name: pt.name || `Tappa ${idx + 1}`,
                                category: "area_sosta",
                                lat: pt.lat,
                                lng: pt.lng,
                                address: pt.name || "",
                                priceInfo: "Non specificato",
                                priceEuro: 0,
                                rating: 0,
                                facilities: [],
                                reviews: [],
                                imageUrl: "",
                              });
                            }}
                            className="p-1 px-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white rounded-lg flex items-center gap-0.5 text-[9px] font-black uppercase transition-all shadow-3xs cursor-pointer"
                            title="Avvia Navigatore 🧭"
                          >
                            <Navigation className="w-2.5 h-2.5 fill-current" />
                            <span>Naviga</span>
                          </button>
                        )}

                        {editMode && (
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => handleMoveUp(idx)}
                              disabled={idx === 0}
                              className="p-1 text-stone-400 hover:text-[#3E4A35] disabled:opacity-30"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleMoveDown(idx)}
                              disabled={idx === points.length - 1}
                              className="p-1 text-stone-400 hover:text-[#3E4A35] disabled:opacity-30"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleRemovePoint(idx)}
                              className="p-1 text-stone-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        {/* MAP STAGE CONTAINER */}
        <div className="relative lg:col-span-2">
          {/* Leaflet container */}
          <div
            ref={mapContainerRef}
            className="w-full h-[320px] rounded-xl border border-stone-200 shadow-inner overflow-hidden z-0"
          />

          {/* Map Type Switch Overlay */}
          <div className="absolute bottom-2 left-2 z-[400] flex bg-white/95 backdrop-blur-xs p-0.5 rounded-lg shadow-md border border-stone-200/80 gap-0.5 font-sans">
            <button
              onClick={() => setIsSatellite(false)}
              className={`text-[9px] font-black px-2 py-1 rounded-md transition-all cursor-pointer ${
                !isSatellite
                  ? "bg-[#3E4A35] text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Standard
            </button>
            <button
              onClick={() => setIsSatellite(true)}
              className={`text-[9px] font-black px-2 py-1 rounded-md transition-all cursor-pointer ${
                isSatellite
                  ? "bg-[#3E4A35] text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              🛰️ Satellite
            </button>
          </div>

          {/* EDIT MODE FLOATING TIP */}
          {editMode && (
            <div className="absolute top-2 right-2 bg-[#3E4A35] text-white text-[9px] font-black uppercase py-1 px-2.5 rounded-lg shadow-md flex items-center gap-1 select-none z-10 pointer-events-none">
              <Compass className="w-3 h-3 animate-spin" style={{ animationDuration: "3s" }} />
              Modalità Modifica: Fai clic sulla mappa per inserire tappe!
            </div>
          )}

          {/* VIEW MODE: NO POINTS INFO COVER */}
          {!editMode && points.length === 0 && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4 z-10 select-none">
              <Compass className="w-10 h-10 text-stone-300 animate-pulse mb-2" />
              <p className="text-xs font-bold text-slate-700">Vuoi tracciare il percorso di questo viaggio?</p>
              <p className="text-[10px] text-stone-500 max-w-[280px] mt-1">
                Fai clic sul pulsante <strong>&quot;Configura Percorso&quot;</strong> in alto a destra per inserire le tappe del viaggio direttamente sulla mappa!
              </p>
              <button
                onClick={() => setEditMode(true)}
                className="mt-3 bg-[#3E4A35] hover:bg-[#2d3725] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm cursor-pointer"
              >
                Aggiungi le Tappe Ora 📍
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIEW MODE: ANIMATION CONTROLLER BAR */}
      {!editMode && points.length >= 2 && (
        <div className="bg-stone-50 border border-stone-150/60 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3 justify-between select-none font-sans">
          
          {/* Play/Pause/Reset Controls */}
          <div className="flex items-center gap-1.5">
            {!isPlaying ? (
              <button
                onClick={() => {
                  if (progressIndex >= finalCoords.length - 1) {
                    setProgressIndex(0);
                  }
                  setIsPlaying(true);
                }}
                className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-900 text-[10px] font-black uppercase py-1.5 px-3 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Anima Viaggio van
              </button>
            ) : (
              <button
                onClick={() => setIsPlaying(false)}
                className="flex items-center gap-1 bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-black uppercase py-1.5 px-3 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                Pausa
              </button>
            )}

            <button
              onClick={() => {
                setIsPlaying(false);
                setProgressIndex(0);
              }}
              title="Reset percorso"
              className="p-1.5 bg-white border border-stone-250 hover:bg-stone-50 text-slate-600 rounded-lg shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              title="Esporta video social"
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase py-1.5 px-3 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              Esporta Video o Cartolina 🎬
            </button>
          </div>

          {/* Progress Slider Track */}
          <div className="flex-1 w-full flex items-center gap-3">
            <span className="text-[10px] font-bold text-stone-400 font-mono">Inizio</span>
            <input
              type="range"
              min={0}
              max={Math.max(0, finalCoords.length - 1)}
              value={progressIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setProgressIndex(parseInt(e.target.value));
              }}
              className="flex-1 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-[10px] font-bold text-stone-400 font-mono">Arrivo</span>
          </div>

          {/* Animation Speed selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black text-stone-400 uppercase">Velocità:</span>
            <div className="bg-white border border-stone-250 rounded-lg p-0.5 flex">
              {([1, 5, 10, 15, 30] as const).map((speed) => (
                <button
                  key={speed}
                  onClick={() => setAnimationSpeed(speed)}
                  className={`text-[9px] font-black py-0.5 px-1.5 rounded-md transition-all cursor-pointer ${
                    animationSpeed === speed
                      ? "bg-amber-500 text-slate-900 shadow-3xs"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE: LIVE CAMPER FEEDBACK PANEL */}
      {!editMode && points.length >= 2 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3 animate-fade-in select-none">
          <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 rounded-full flex items-center justify-center text-lg shadow-2xs">
            🚐
          </div>
          <div className="flex-1">
            <span className="text-[8px] font-black text-amber-800 uppercase tracking-widest block">
              Posizione Attuale Camper in tempo reale
            </span>
            <span className="text-xs font-black text-slate-800 block mt-0.5">
              {getCurrentSegmentName()}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[8px] font-black text-stone-400 uppercase block">Progresso Viaggio</span>
            <span className="text-xs font-black text-slate-800 font-mono">
              {finalCoords.length > 0 
                ? `${Math.round((progressIndex / (finalCoords.length - 1)) * 100)}%`
                : "0%"}
            </span>
          </div>
        </div>
      )}

      <TripVideoShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        trip={trip}
        finalCoords={finalCoords}
        photoPoints={photoPoints}
        points={points}
      />
    </div>
  );
}
