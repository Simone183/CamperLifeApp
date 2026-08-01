export interface NearbyPlace {
  id: string;
  name: string;
  category: 'restaurant' | 'attraction' | 'supermarket' | 'service';
  categoryLabel: string; // e.g., "RISTORANTE", "ATTRAZIONE", "SUPERMERCATO", "DISTRIBUTORE"
  lat: number;
  lng: number;
  distanceKm: number;
  rating?: number; // e.g. 4.8
  rating10?: number; // e.g. 9.6
  userRatingsTotal?: number;
  priceLevel?: number; // 1-4
  address?: string;
  photoUrl?: string;
  openNow?: boolean;
  phone?: string;
  website?: string;
  placeId?: string;
  source: 'google' | 'overpass' | 'fallback';
}

// Haversine distance formula in kilometers
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} M`;
  }
  return `${km.toFixed(1)} KM`;
}

// Dynamic Google Places JS API script loader
let isScriptLoading = false;
let scriptLoadPromise: Promise<boolean> | null = null;

export function loadGooglePlacesScript(apiKey: string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.maps?.places) return Promise.resolve(true);

  const key =
    apiKey ||
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    localStorage.getItem('user_google_maps_key') ||
    '';

  if (!key) return Promise.resolve(false);

  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve) => {
    const existingScript = document.getElementById('google-maps-places-sdk');
    if (existingScript) {
      const check = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(check);
          resolve(true);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        resolve(!!window.google?.maps?.places);
      }, 4000);
      return;
    }

    isScriptLoading = true;
    const script = document.createElement('script');
    script.id = 'google-maps-places-sdk';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.onload = () => {
      isScriptLoading = false;
      resolve(true);
    };
    script.onerror = () => {
      isScriptLoading = false;
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

// Category photo fallbacks (high quality Unsplash imagery for food, attractions, etc.)
const CATEGORY_PHOTOS = {
  restaurant: [
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=600&q=80'
  ],
  attraction: [
    'https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=600&q=80'
  ],
  supermarket: [
    'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'
  ],
  service: [
    'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=600&q=80'
  ]
};

function getRandomPhoto(category: keyof typeof CATEGORY_PHOTOS, index: number = 0): string {
  const list = CATEGORY_PHOTOS[category] || CATEGORY_PHOTOS.restaurant;
  return list[index % list.length];
}

/**
 * Main fetcher function for nearby places using Google Places API JS PlacesService,
 * with fallback to Overpass API (OSM) and realistic local fallback generator.
 */
export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  apiKey: string = ''
): Promise<{ restaurants: NearbyPlace[]; attractions: NearbyPlace[]; all: NearbyPlace[]; source: 'google' | 'overpass' | 'fallback' }> {
  // Try Google Places JS SDK
  try {
    const hasGoogle = await loadGooglePlacesScript(apiKey);
    if (hasGoogle && window.google?.maps?.places) {
      const googleResults = await fetchFromGooglePlacesJS(lat, lng);
      if (googleResults.all.length > 0) {
        return { ...googleResults, source: 'google' };
      }
    }
  } catch (err) {
    console.warn('Google Places JS SDK search failed or not available, trying Overpass API...', err);
  }

  // Try Overpass API (OSM)
  try {
    const overpassResults = await fetchFromOverpassAPI(lat, lng);
    if (overpassResults.all.length > 0) {
      return { ...overpassResults, source: 'overpass' };
    }
  } catch (err) {
    console.warn('Overpass API failed, using smart fallback dataset...', err);
  }

  // Smart Fallback
  const fallbackResults = generateFallbackPlaces(lat, lng);
  return { ...fallbackResults, source: 'fallback' };
}

function extractCoords(item: any, fallbackLat: number, fallbackLng: number): { lat: number; lng: number } {
  const loc = item?.geometry?.location;
  if (!loc) return { lat: fallbackLat, lng: fallbackLng };
  let lat = fallbackLat;
  let lng = fallbackLng;
  
  if (typeof loc.lat === 'function') {
    try { lat = loc.lat(); } catch (e) { lat = typeof loc.lat === 'number' ? loc.lat : fallbackLat; }
  } else if (typeof loc.lat === 'number') {
    lat = loc.lat;
  }

  if (typeof loc.lng === 'function') {
    try { lng = loc.lng(); } catch (e) { lng = typeof loc.lng === 'number' ? loc.lng : fallbackLng; }
  } else if (typeof loc.lng === 'number') {
    lng = loc.lng;
  }

  return { lat, lng };
}

/**
 * Fetch from Google Places PlacesService
 */
function fetchFromGooglePlacesJS(
  lat: number,
  lng: number
): Promise<{ restaurants: NearbyPlace[]; attractions: NearbyPlace[]; all: NearbyPlace[] }> {
  return new Promise((resolve) => {
    const dummyElem = document.createElement('div');
    const service = new window.google.maps.places.PlacesService(dummyElem);
    const center = new window.google.maps.LatLng(lat, lng);

    const restaurants: NearbyPlace[] = [];
    const attractions: NearbyPlace[] = [];

    let completedCalls = 0;

    const checkDone = () => {
      completedCalls++;
      if (completedCalls >= 2) {
        const all = [...restaurants, ...attractions].sort((a, b) => a.distanceKm - b.distanceKm);
        resolve({ restaurants, attractions, all });
      }
    };

    // 1. Restaurants search
    service.nearbySearch(
      {
        location: center,
        radius: 4000,
        type: 'restaurant' as any
      },
      (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          results.slice(0, 10).forEach((item, i) => {
            const { lat: pLat, lng: pLng } = extractCoords(item, lat, lng);
            const dist = calculateDistanceKm(lat, lng, pLat, pLng);
            const photoUrl =
              item.photos && item.photos.length > 0
                ? item.photos[0].getUrl({ maxWidth: 500 })
                : getRandomPhoto('restaurant', i);

            const rating = item.rating || parseFloat((4.2 + (i % 8) * 0.1).toFixed(1));
            const rating10 = parseFloat((rating * 2).toFixed(1));

            restaurants.push({
              id: item.place_id || `g_rest_${i}`,
              name: item.name || 'Ristorante Locale',
              category: 'restaurant',
              categoryLabel: 'RISTORANTE',
              lat: pLat,
              lng: pLng,
              distanceKm: dist,
              rating,
              rating10,
              userRatingsTotal: item.user_ratings_total || 45 + i * 12,
              priceLevel: item.price_level || 2,
              address: item.vicinity || 'Nelle vicinanze',
              photoUrl,
              openNow: item.opening_hours?.isOpen ? (typeof item.opening_hours.isOpen === 'function' ? item.opening_hours.isOpen() : true) : true,
              placeId: item.place_id,
              source: 'google'
            });
          });
        }
        checkDone();
      }
    );

    // 2. Attractions search
    service.nearbySearch(
      {
        location: center,
        radius: 5000,
        type: 'tourist_attraction' as any
      },
      (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          results.slice(0, 10).forEach((item, i) => {
            const { lat: pLat, lng: pLng } = extractCoords(item, lat, lng);
            const dist = calculateDistanceKm(lat, lng, pLat, pLng);
            const photoUrl =
              item.photos && item.photos.length > 0
                ? item.photos[0].getUrl({ maxWidth: 500 })
                : getRandomPhoto('attraction', i);

            const rating = item.rating || parseFloat((4.4 + (i % 6) * 0.1).toFixed(1));
            const rating10 = parseFloat((rating * 2).toFixed(1));

            attractions.push({
              id: item.place_id || `g_attr_${i}`,
              name: item.name || 'Punto di Interesse',
              category: 'attraction',
              categoryLabel: 'VISITE & CULTURA',
              lat: pLat,
              lng: pLng,
              distanceKm: dist,
              rating,
              rating10,
              userRatingsTotal: item.user_ratings_total || 80 + i * 20,
              address: item.vicinity || 'Zona Panoramica',
              photoUrl,
              placeId: item.place_id,
              source: 'google'
            });
          });
        }
        checkDone();
      }
    );
  });
}

/**
 * Fetch from OpenStreetMap Overpass API
 */
async function fetchFromOverpassAPI(
  lat: number,
  lng: number
): Promise<{ restaurants: NearbyPlace[]; attractions: NearbyPlace[]; all: NearbyPlace[] }> {
  const query = `
    [out:json][timeout:6];
    (
      node["amenity"~"restaurant|pub|cafe|trattoria|pizzeria"](around:3500, ${lat}, ${lng});
      node["tourism"~"attraction|museum|viewpoint|artwork|castle"](around:4500, ${lat}, ${lng});
    );
    out body 20;
  `;

  const resp = await fetch(`https://overpass-api.de/api/interpreter`, {
    method: 'POST',
    body: query,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  if (!resp.ok) throw new Error(`Overpass HTTP error ${resp.status}`);

  const data = await resp.json();
  const elements = data.elements || [];

  const restaurants: NearbyPlace[] = [];
  const attractions: NearbyPlace[] = [];

  elements.forEach((elem: any, index: number) => {
    if (!elem.tags || !elem.tags.name) return;

    const pLat = elem.lat || elem.center?.lat || lat;
    const pLng = elem.lon || elem.center?.lon || lng;
    const dist = calculateDistanceKm(lat, lng, pLat, pLng);
    const isFood = elem.tags.amenity && ['restaurant', 'pub', 'cafe', 'pizzeria', 'trattoria'].includes(elem.tags.amenity);

    const baseRating = parseFloat((4.3 + (index % 7) * 0.1).toFixed(1));
    const rating10 = parseFloat((baseRating * 2).toFixed(1));

    const item: NearbyPlace = {
      id: `osm_${elem.id}`,
      name: elem.tags.name,
      category: isFood ? 'restaurant' : 'attraction',
      categoryLabel: isFood ? (elem.tags.cuisine ? elem.tags.cuisine.toUpperCase() : 'RISTORANTE') : 'ATTIVITÀ & CULTURA',
      lat: pLat,
      lng: pLng,
      distanceKm: dist,
      rating: baseRating,
      rating10,
      userRatingsTotal: 30 + (index * 14) % 150,
      address: [elem.tags['addr:street'], elem.tags['addr:housenumber'], elem.tags['addr:city']].filter(Boolean).join(', ') || 'Nelle vicinanze',
      photoUrl: getRandomPhoto(isFood ? 'restaurant' : 'attraction', index),
      phone: elem.tags.phone || elem.tags['contact:phone'],
      website: elem.tags.website || elem.tags['contact:website'],
      source: 'overpass'
    };

    if (isFood) {
      restaurants.push(item);
    } else {
      attractions.push(item);
    }
  });

  restaurants.sort((a, b) => a.distanceKm - b.distanceKm);
  attractions.sort((a, b) => a.distanceKm - b.distanceKm);

  const all = [...restaurants, ...attractions].sort((a, b) => a.distanceKm - b.distanceKm);
  return { restaurants, attractions, all };
}

/**
 * Generate fallback realistic places around coordinates
 */
function generateFallbackPlaces(
  lat: number,
  lng: number
): { restaurants: NearbyPlace[]; attractions: NearbyPlace[]; all: NearbyPlace[] } {
  const restNames = [
    { name: 'La Galleria di Sopra', cat: 'RISTORANTE', r: 4.9, r10: 9.8, offset: [0.008, 0.005] },
    { name: 'Radici Cocktails & Osteria', cat: 'OSTERIA & COCKTAILS', r: 4.7, r10: 9.4, offset: [-0.005, 0.009] },
    { name: 'Trattoria del Borgo Antico', cat: 'TRATTORIA TIPICA', r: 4.8, r10: 9.6, offset: [0.012, -0.004] },
    { name: 'Ristorante Bellavista Panorama', cat: 'RISTORANTE PANORAMICO', r: 4.6, r10: 9.2, offset: [-0.009, -0.008] },
    { name: 'Pizzeria & Focacceria del Lago', cat: 'PIZZERIA', r: 4.7, r10: 9.4, offset: [0.004, 0.015] }
  ];

  const attrNames = [
    { name: 'Belvedere Panoramico & Sentiero', cat: 'VISTA PANORAMICA', r: 4.9, r10: 9.8, offset: [0.006, 0.007] },
    { name: 'Palazzo Storico & Giardini', cat: 'MONUMENTO & GIARDINI', r: 4.8, r10: 9.6, offset: [-0.008, 0.003] },
    { name: 'Borgo Antico & Vicoli Storici', cat: 'CENTRO STORICO', r: 4.9, r10: 9.7, offset: [0.002, -0.006] },
    { name: 'Museo di Arte & Civiltà Locale', cat: 'MUSEO & CULTURA', r: 4.6, r10: 9.1, offset: [-0.011, 0.012] }
  ];

  const restaurants: NearbyPlace[] = restNames.map((r, i) => {
    const pLat = lat + r.offset[0];
    const pLng = lng + r.offset[1];
    const dist = calculateDistanceKm(lat, lng, pLat, pLng);
    return {
      id: `fb_rest_${i}`,
      name: r.name,
      category: 'restaurant',
      categoryLabel: r.cat,
      lat: pLat,
      lng: pLng,
      distanceKm: dist,
      rating: r.r,
      rating10: r.r10,
      userRatingsTotal: 120 + i * 45,
      address: 'Centro Storico',
      photoUrl: CATEGORY_PHOTOS.restaurant[i % CATEGORY_PHOTOS.restaurant.length],
      openNow: true,
      source: 'fallback'
    };
  });

  const attractions: NearbyPlace[] = attrNames.map((a, i) => {
    const pLat = lat + a.offset[0];
    const pLng = lng + a.offset[1];
    const dist = calculateDistanceKm(lat, lng, pLat, pLng);
    return {
      id: `fb_attr_${i}`,
      name: a.name,
      category: 'attraction',
      categoryLabel: a.cat,
      lat: pLat,
      lng: pLng,
      distanceKm: dist,
      rating: a.r,
      rating10: a.r10,
      userRatingsTotal: 210 + i * 80,
      address: 'Dintorni Panoramici',
      photoUrl: CATEGORY_PHOTOS.attraction[i % CATEGORY_PHOTOS.attraction.length],
      source: 'fallback'
    };
  });

  restaurants.sort((a, b) => a.distanceKm - b.distanceKm);
  attractions.sort((a, b) => a.distanceKm - b.distanceKm);

  const all = [...restaurants, ...attractions].sort((a, b) => a.distanceKm - b.distanceKm);
  return { restaurants, attractions, all };
}
