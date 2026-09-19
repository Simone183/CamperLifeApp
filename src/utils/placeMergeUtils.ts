/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Place, Review, PlaceCategory, CamperServiceSubtype, PlaceSeasonalPrice } from "../types";

/**
 * Calculates great-circle distance between two GPS points in Kilometers (Haversine formula).
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
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

/**
 * Threshold in kilometers to consider two camper spots as the same location.
 * 0.100 km = 100 meters.
 */
export const PROXIMITY_MERGE_DISTANCE_KM = 0.100;

/**
 * Returns true if a place name is a generic placeholder (often generated from OSM tags or raw tables)
 */
export function isGenericPlaceName(name?: string): boolean {
  if (!name || !name.trim()) return true;
  const lower = name.toLowerCase().trim();
  return (
    lower === "area sosta camper osm" ||
    lower === "sosta camper / parcheggio" ||
    lower === "campeggio / area campismo" ||
    lower === "camper service carico/scarico" ||
    lower === "area di sosta" ||
    lower === "area sosta camper" ||
    lower === "parcheggio camper" ||
    lower === "area sosta" ||
    lower === "punto sosta camper" ||
    lower === "area sosta camper / parcheggio" ||
    lower.startsWith("area sosta camper osm") ||
    lower.startsWith("sosta camper / parcheggio") ||
    lower.startsWith("camper service carico/scarico")
  );
}

/**
 * Normalizes any rating to a 10-point scale.
 * If rating is in the legacy 1-5 scale (i.e. > 0 and <= 5.0), it multiplies by 2.
 * If rating is 0 or undefined, returns 0.
 */
export function normalizeRatingTo10(rating?: number): number {
  if (typeof rating !== "number" || isNaN(rating) || rating <= 0) return 0;
  if (rating <= 5.0) {
    return parseFloat((rating * 2).toFixed(1));
  }
  return parseFloat(Math.min(10, rating).toFixed(1));
}

/**
 * Normalizes a review's rating and sub-metrics to the 10-point scale if they were given in the legacy 1-5 scale.
 */
export function normalizeReview(r: Review): Review {
  if (!r) return r;
  let normalizedRating = r.rating;
  if (typeof r.rating === "number" && r.rating > 0 && r.rating <= 5) {
    normalizedRating = Math.round(r.rating * 2);
  }
  const normSub = (val?: number) => {
    if (typeof val !== "number" || isNaN(val) || val <= 0) return undefined;
    if (val <= 5) return Math.round(val * 2);
    return Math.min(10, Math.round(val));
  };

  return {
    ...r,
    rating: normalizedRating,
    noiseLevel: normSub(r.noiseLevel),
    maneuverability: normSub(r.maneuverability),
    cellularSignal: normSub(r.cellularSignal),
    groundLevelness: normSub(r.groundLevelness),
    shade: normSub(r.shade),
    cleanliness: normSub(r.cleanliness),
  };
}

/**
 * Returns a human-friendly label and color for a 1-10 rating score.
 */
export function getRating10Descriptor(score: number): { label: string; colorClass: string; bgClass: string } {
  if (score >= 9.0) return { label: "Eccellente", colorClass: "text-emerald-600 dark:text-emerald-400", bgClass: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800" };
  if (score >= 8.0) return { label: "Ottimo", colorClass: "text-teal-600 dark:text-teal-400", bgClass: "bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800" };
  if (score >= 7.0) return { label: "Buono", colorClass: "text-amber-600 dark:text-amber-400", bgClass: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800" };
  if (score >= 6.0) return { label: "Sufficiente", colorClass: "text-orange-600 dark:text-orange-400", bgClass: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800" };
  if (score > 0) return { label: "Scarso", colorClass: "text-rose-600 dark:text-rose-400", bgClass: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800" };
  return { label: "Non valutato", colorClass: "text-slate-500", bgClass: "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" };
}

const CATEGORY_PRIORITY: Record<PlaceCategory, number> = {
  campeggio: 7,
  agricampeggio: 6,
  camper_service: 5,
  carico_scarico: 5,
  solo_scarico: 4,
  fontanella: 4,
  lavanderia: 4,
  hidden_gem: 3,
  area_sosta: 2,
  parcheggio_pagamento: 1,
  parcheggio_diurno: 1,
  parcheggio_gratuito: 1,
  parcheggio_camper: 1,
};

/**
 * Unifies two place records that refer to the same physical camper stop within 100 meters.
 */
export function mergeTwoPlaces(base: Place, incoming: Place): Place {
  // 1. Choose the best name
  const baseGeneric = isGenericPlaceName(base.name);
  const incomingGeneric = isGenericPlaceName(incoming.name);
  let bestName = base.name;

  if (baseGeneric && !incomingGeneric) {
    bestName = incoming.name;
  } else if (!baseGeneric && incomingGeneric) {
    bestName = base.name;
  } else if (incoming.name && incoming.name.length > (base.name || "").length) {
    bestName = incoming.name;
  }

  // 2. Choose the best category & subtype
  const baseCatPrio = CATEGORY_PRIORITY[base.category] || 0;
  const incCatPrio = CATEGORY_PRIORITY[incoming.category] || 0;
  let bestCategory: PlaceCategory = base.category;
  let bestSubtype: CamperServiceSubtype | undefined = base.serviceSubtype || incoming.serviceSubtype;

  if (incCatPrio > baseCatPrio) {
    bestCategory = incoming.category;
    if (incoming.serviceSubtype) {
      bestSubtype = incoming.serviceSubtype;
    }
  } else if (base.category === "area_sosta" && incoming.category && incoming.category !== "area_sosta") {
    // If base is generic area_sosta with no camper services, prefer incoming's true category (e.g. parking, day-only, nature spot)
    const hasBaseServices = (base.facilities || []).some(f => 
      f.toLowerCase().includes("carico") || 
      f.toLowerCase().includes("scarico") || 
      f.toLowerCase().includes("elettricit")
    );
    if (!hasBaseServices) {
      bestCategory = incoming.category;
      if (incoming.serviceSubtype) {
        bestSubtype = incoming.serviceSubtype;
      }
    }
  }

  const bestCategoryLabel = (bestCategory === incoming.category ? incoming.categoryLabel : base.categoryLabel) || 
    incoming.categoryLabel || 
    base.categoryLabel;

  // 3. Merge facilities uniquely
  const mergedFacilities = Array.from(
    new Set([...(base.facilities || []), ...(incoming.facilities || [])])
  ).filter(Boolean);

  // 4. Address: pick the longer and more descriptive
  let bestAddress = base.address || "";
  if (!bestAddress || (incoming.address && incoming.address.length > bestAddress.length)) {
    bestAddress = incoming.address;
  }

  // 5. Description: combine or pick the most descriptive
  let bestDescription = base.description || "";
  if (!bestDescription) {
    bestDescription = incoming.description || "";
  } else if (incoming.description && incoming.description !== bestDescription) {
    if (!bestDescription.includes(incoming.description)) {
      bestDescription = `${bestDescription}\n\n${incoming.description}`;
    }
  }

  // 6. Phone number
  const bestPhone = base.phone || incoming.phone || undefined;

  // 7. Nearest city
  const bestNearestCity = base.nearestCity || incoming.nearestCity || undefined;

  // 8. Price & Seasonal Prices
  let bestPriceInfo = base.priceInfo || incoming.priceInfo || "Verificare in loco";
  let bestPriceEuro = typeof base.priceEuro === "number" ? base.priceEuro : (typeof incoming.priceEuro === "number" ? incoming.priceEuro : 0);
  if (base.priceEuro === 0 && incoming.priceEuro && incoming.priceEuro > 0) {
    bestPriceEuro = incoming.priceEuro;
    bestPriceInfo = incoming.priceInfo || bestPriceInfo;
  }

  const seasonalPriceMap = new globalThis.Map<string, PlaceSeasonalPrice>();
  (base.seasonalPrices || []).forEach((sp) => seasonalPriceMap.set(`${sp.period}_${sp.priceEuro}`, sp));
  (incoming.seasonalPrices || []).forEach((sp) => seasonalPriceMap.set(`${sp.period}_${sp.priceEuro}`, sp));
  const mergedSeasonalPrices = Array.from(seasonalPriceMap.values());

  // 9. Reviews: merge uniquely and normalize ratings to 10-point scale
  const reviewMap = new globalThis.Map<string, Review>();
  (base.reviews || []).map(normalizeReview).forEach((r) => reviewMap.set(r.id || `${r.user}_${r.date}_${r.comment}`, r));
  (incoming.reviews || []).map(normalizeReview).forEach((r) => reviewMap.set(r.id || `${r.user}_${r.date}_${r.comment}`, r));
  const mergedReviews = Array.from(reviewMap.values());

  // 10. Rating (1-10 scale) & Sub-metrics (1-10 scale)
  const baseRating10 = normalizeRatingTo10(base.rating);
  const incRating10 = normalizeRatingTo10(incoming.rating);
  let bestRating = baseRating10 || incRating10 || 0;
  if (mergedReviews.length > 0) {
    const total = mergedReviews.reduce((sum, r) => sum + (r.rating || 8), 0);
    bestRating = parseFloat((total / mergedReviews.length).toFixed(1));
  } else if (incRating10 > 0 && (!baseRating10 || incRating10 > baseRating10)) {
    bestRating = incRating10;
  }

  const mergeSubMetric = (key: keyof Review, bVal?: number, iVal?: number): number | undefined => {
    const revsWith = mergedReviews.filter(r => typeof r[key] === "number" && (r[key] as number) > 0);
    if (revsWith.length > 0) {
      const sum = revsWith.reduce((acc, r) => acc + (r[key] as number), 0);
      return parseFloat((sum / revsWith.length).toFixed(1));
    }
    const bNorm = typeof bVal === "number" && bVal > 0 ? (bVal <= 5 ? bVal * 2 : bVal) : undefined;
    const iNorm = typeof iVal === "number" && iVal > 0 ? (iVal <= 5 ? iVal * 2 : iVal) : undefined;
    return bNorm || iNorm || undefined;
  };

  const bestNoise = mergeSubMetric("noiseLevel", base.noiseLevel, incoming.noiseLevel);
  const bestManeuver = mergeSubMetric("maneuverability", base.maneuverability, incoming.maneuverability);
  const bestSignal = mergeSubMetric("cellularSignal", base.cellularSignal, incoming.cellularSignal);
  const bestGround = mergeSubMetric("groundLevelness", base.groundLevelness, incoming.groundLevelness);
  const bestShade = mergeSubMetric("shade", base.shade, incoming.shade);
  const bestClean = mergeSubMetric("cleanliness", base.cleanliness, incoming.cleanliness);

  // 11. Image URL (avoid placeholder/stock unsplash if user uploaded photo or real photo is available)
  let bestImageUrl = base.imageUrl || incoming.imageUrl;
  const isBaseDefault = !base.imageUrl || base.imageUrl.includes("unsplash.com");
  const isIncDefault = !incoming.imageUrl || incoming.imageUrl.includes("unsplash.com");
  if (isBaseDefault && !isIncDefault && incoming.imageUrl) {
    bestImageUrl = incoming.imageUrl;
  }

  // 12. Safety and Vehicle Limit Attributes
  const hasMaxHeightLimit = Boolean(base.hasMaxHeightLimit || incoming.hasMaxHeightLimit);
  let maxHeight: number | undefined = undefined;
  if (base.maxHeight && incoming.maxHeight) {
    maxHeight = Math.min(base.maxHeight, incoming.maxHeight);
  } else {
    maxHeight = base.maxHeight || incoming.maxHeight;
  }

  const hasMaxWeightLimit = Boolean(base.hasMaxWeightLimit || incoming.hasMaxWeightLimit);
  let maxWeight: number | undefined = undefined;
  if (base.maxWeight && incoming.maxWeight) {
    maxWeight = Math.min(base.maxWeight, incoming.maxWeight);
  } else {
    maxWeight = base.maxWeight || incoming.maxWeight;
  }

  const isNarrowAccess = Boolean(base.isNarrowAccess || incoming.isNarrowAccess);

  // 13. Source Tracking
  const baseSource = base.source || "catalogo";
  const incomingSource = incoming.source || "catalogo";
  const sourceMerged = baseSource === incomingSource ? baseSource : `${baseSource}, ${incomingSource}`;

  return {
    ...base,
    id: base.id, // preserve primary ID for state/selection stability
    name: bestName,
    category: bestCategory,
    categoryLabel: bestCategoryLabel,
    serviceSubtype: bestSubtype,
    address: bestAddress,
    description: bestDescription,
    phone: bestPhone,
    nearestCity: bestNearestCity,
    priceInfo: bestPriceInfo,
    priceEuro: bestPriceEuro,
    seasonalPrices: mergedSeasonalPrices.length > 0 ? mergedSeasonalPrices : undefined,
    facilities: mergedFacilities,
    reviews: mergedReviews,
    rating: bestRating,
    noiseLevel: bestNoise,
    maneuverability: bestManeuver,
    cellularSignal: bestSignal,
    groundLevelness: bestGround,
    shade: bestShade,
    cleanliness: bestClean,
    imageUrl: bestImageUrl,
    hasMaxHeightLimit,
    maxHeight,
    hasMaxWeightLimit,
    maxWeight,
    isNarrowAccess,
    source: sourceMerged,
  };
}

/**
 * Deduplicates and unifies all places within 100 meters (0.100 km).
 * Combines data from different databases into single unified camper stops.
 */
export function mergeNearbyPlaces(
  places: Place[],
  maxDistanceKm: number = PROXIMITY_MERGE_DISTANCE_KM
): Place[] {
  if (!places || places.length <= 1) return places || [];

  // Use a spatial grid to achieve O(N) / O(N log N) performance instead of O(N^2)
  // 1 degree latitude ~ 111 km. Grid size ~ 0.002 degrees (~200m)
  const GRID_SIZE = 0.002;
  const grid = new globalThis.Map<string, Place[]>();

  const getGridKeys = (lat: number, lng: number): string[] => {
    const latIndex = Math.floor(lat / GRID_SIZE);
    const lngIndex = Math.floor(lng / GRID_SIZE);
    const keys: string[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        keys.push(`${latIndex + dx}:${lngIndex + dy}`);
      }
    }
    return keys;
  };

  const mergedResults: Place[] = [];

  for (const candidate of places) {
    if (typeof candidate.lat !== "number" || typeof candidate.lng !== "number" || isNaN(candidate.lat) || isNaN(candidate.lng)) {
      continue;
    }

    const neighborKeys = getGridKeys(candidate.lat, candidate.lng);
    let matchedPlace: Place | null = null;
    let matchedIndex = -1;

    for (const key of neighborKeys) {
      const bucket = grid.get(key);
      if (!bucket) continue;

      for (const existing of bucket) {
        const dist = calculateDistanceKm(existing.lat, existing.lng, candidate.lat, candidate.lng);
        if (dist <= maxDistanceKm) {
          matchedPlace = existing;
          matchedIndex = mergedResults.indexOf(existing);
          break;
        }
      }
      if (matchedPlace) break;
    }

    if (matchedPlace && matchedIndex !== -1) {
      // Unify both places
      const unified = mergeTwoPlaces(matchedPlace, candidate);
      mergedResults[matchedIndex] = unified;

      // Update grid bucket reference
      const primaryKey = `${Math.floor(unified.lat / GRID_SIZE)}:${Math.floor(unified.lng / GRID_SIZE)}`;
      const bucket = grid.get(primaryKey);
      if (bucket) {
        const bIdx = bucket.indexOf(matchedPlace);
        if (bIdx !== -1) {
          bucket[bIdx] = unified;
        }
      }
    } else {
      // New distinct spot
      mergedResults.push(candidate);
      const primaryKey = `${Math.floor(candidate.lat / GRID_SIZE)}:${Math.floor(candidate.lng / GRID_SIZE)}`;
      if (!grid.has(primaryKey)) {
        grid.set(primaryKey, []);
      }
      grid.get(primaryKey)!.push(candidate);
    }
  }

  return mergedResults;
}
