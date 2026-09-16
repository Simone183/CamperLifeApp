import { PlaceCategory, CamperServiceSubtype } from "../types";

export interface PlaceCategoryInfo {
  category: PlaceCategory;
  categoryLabel?: string;
  serviceSubtype?: CamperServiceSubtype;
  isCity?: boolean;
}

/**
 * Resolves the specific subtype of a camper service (or place).
 * Differentiates between Carico/Scarico Completo, Fontanelle Acqua, Lavanderie Self-Service, and Solo Scarico.
 */
export function resolvePlaceServiceSubtype(place: {
  category?: PlaceCategory | string;
  serviceSubtype?: CamperServiceSubtype;
  categoryLabel?: string;
  name?: string;
  facilities?: string[];
}): CamperServiceSubtype | undefined {
  if (place.serviceSubtype) return place.serviceSubtype;

  const catLower = String(place.category || "").toLowerCase().trim();
  const labelLower = String(place.categoryLabel || "").toLowerCase().trim();
  const nameLower = String(place.name || "").toLowerCase().trim();

  // If place belongs to a primary lodging/parking category, it NEVER has a service subtype
  if (
    catLower === "area_sosta" ||
    catLower === "campeggio" ||
    catLower === "agricampeggio" ||
    catLower === "parcheggio_gratuito" ||
    catLower === "parcheggio_pagamento" ||
    catLower === "parcheggio_diurno" ||
    catLower === "parcheggio_camper" ||
    catLower === "parcheggio" ||
    catLower === "hidden_gem"
  ) {
    return undefined;
  }

  // Check if explicit service or unclassified
  const isExplicitService =
    catLower === "camper_service" ||
    catLower === "service" ||
    catLower === "carico_scarico" ||
    catLower === "fontanella" ||
    catLower === "lavanderia" ||
    catLower === "solo_scarico";

  if (!isExplicitService && catLower !== "") {
    return undefined;
  }

  const facsLower = (place.facilities || []).map((f) => String(f).toLowerCase());

  const hasWater =
    facsLower.some((f) => f.includes("acqua") || f.includes("water") || f.includes("fontana") || f.includes("fontanella")) ||
    nameLower.includes("acqua potabile") ||
    nameLower.includes("fontanella") ||
    labelLower.includes("acqua potabile") ||
    labelLower.includes("fontanella");

  const hasDischarge =
    facsLower.some((f) => f.includes("scarico") || f.includes("waste") || f.includes("dump") || f.includes("grigie") || f.includes("nere")) ||
    nameLower.includes("scarico") ||
    labelLower.includes("scarico");

  const hasLaundry =
    facsLower.some((f) => f.includes("lavand") || f.includes("laundry") || f.includes("lavatric") || f.includes("asciugat")) ||
    catLower === "lavanderia" ||
    labelLower.includes("lavand") ||
    labelLower.includes("laundry") ||
    nameLower.includes("lavanderia") ||
    nameLower.includes("laundromat") ||
    nameLower.includes("speed queen") ||
    nameLower.includes("lavatric");

  // 1. Lavanderia
  if (hasLaundry) {
    return "lavanderia";
  }

  // 2. Fontanella / Solo carico acqua potabile
  if (
    catLower === "fontanella" ||
    labelLower.includes("fontanella") ||
    labelLower.includes("punto acqua potabile") ||
    nameLower.includes("fontanella") ||
    nameLower.includes("fontana pubblica") ||
    nameLower.includes("punto acqua potabile") ||
    (isExplicitService && hasWater && !hasDischarge)
  ) {
    return "fontanella";
  }

  // 3. Solo scarico reflui
  if (
    catLower === "solo_scarico" ||
    labelLower.includes("solo scarico") ||
    nameLower.includes("solo scarico") ||
    nameLower.includes("pozzetto scarico") ||
    (isExplicitService && !hasWater && hasDischarge)
  ) {
    return "solo_scarico";
  }

  // 4. Default Camper Service (Carico / Scarico completo)
  if (
    catLower === "carico_scarico" ||
    catLower === "camper_service" ||
    catLower === "service" ||
    labelLower.includes("c/s") ||
    labelLower.includes("carico") ||
    isExplicitService
  ) {
    return "carico_scarico";
  }

  return undefined;
}

/**
 * Checks if a place/search suggestion represents a pure city, municipality, or administrative locality
 * rather than a specific camper place, business, or campsite.
 */
export function isCityOrLocality(item: {
  types?: string[];
  name?: string;
  display_name?: string;
  category?: string;
  categoryLabel?: string;
  isCity?: boolean;
}): boolean {
  if (item.isCity) return true;

  const types = (item.types || []).map((t: string) => String(t).toLowerCase());
  const nameLower = (item.name || item.display_name || "").toLowerCase();

  // If it contains explicit camper indicators, it is NOT just a city
  const camperKeywords = [
    "campground",
    "rv_park",
    "caravan_site",
    "camper",
    "camping",
    "campeggio",
    "area sosta",
    "sosta camper",
    "area camper",
    "agricamper",
    "sosta attrezzata",
    "parcheggio camper",
    "camper service",
  ];
  if (
    camperKeywords.some((kw) => types.includes(kw) || nameLower.includes(kw))
  ) {
    return false;
  }

  // Check city / administrative / locality types
  const cityTypes = [
    "locality",
    "administrative_area_level_1",
    "administrative_area_level_2",
    "administrative_area_level_3",
    "administrative_area_level_4",
    "administrative_area_level_5",
    "political",
    "country",
    "postal_code",
    "sublocality",
    "sublocality_level_1",
    "neighborhood",
    "colloquial_area",
    "city",
    "town",
    "village",
    "hamlet",
    "municipality",
    "boundary",
    "administrative",
  ];

  const hasCityType = types.some((t) => cityTypes.includes(t));
  if (hasCityType) {
    // If it also has specific business or POI types, it is a POI inside the city
    const poiTypes = [
      "restaurant",
      "cafe",
      "bar",
      "bakery",
      "supermarket",
      "gas_station",
      "car_repair",
      "car_dealer",
      "tourist_attraction",
      "museum",
      "lodging",
      "hotel",
      "pharmacy",
      "store",
      "establishment",
      "point_of_interest",
    ];
    // If types ONLY consist of city/administrative types, or name is purely the locality
    const nonCityPoiTypes = types.filter((t) => poiTypes.includes(t));
    if (nonCityPoiTypes.length === 0 || (types.includes("locality") && nonCityPoiTypes.length <= 1 && types.includes("political"))) {
      return true;
    }
  }

  return false;
}

/**
 * Intelligently detects place category and label from Google Places/OSM types, name, or explicit fields.
 */
export function detectPlaceCategoryAndLabel(sug: {
  types?: string[];
  name?: string;
  display_name?: string;
  category?: string;
  categoryLabel?: string;
  isCity?: boolean;
}): PlaceCategoryInfo {
  // If explicitly provided with a custom label, return it
  if (sug.categoryLabel) {
    return {
      category: (sug.category as PlaceCategory) || "area_sosta",
      categoryLabel: sug.categoryLabel.toUpperCase(),
      isCity: sug.isCity || sug.categoryLabel.toUpperCase().includes("CITTÀ"),
    };
  }

  // 0. Check if this is a city / locality
  if (isCityOrLocality(sug)) {
    return {
      category: "area_sosta",
      categoryLabel: "CITTÀ / COMUNE",
      isCity: true,
    };
  }

  const types = (sug.types || []).map((t: string) => String(t).toLowerCase());
  const nameLower = (sug.name || sug.display_name || "").toLowerCase();

  // 1. Camper-specific categories first (highest priority)
  // Lavanderie
  if (
    types.includes("laundry") ||
    types.includes("washing_machine") ||
    types.includes("dry_cleaning") ||
    nameLower.includes("lavanderia") ||
    nameLower.includes("laundromat") ||
    nameLower.includes("speed queen") ||
    nameLower.includes("lavasecco") ||
    nameLower.includes("wash & dry")
  ) {
    return {
      category: "camper_service",
      serviceSubtype: "lavanderia",
      categoryLabel: "LAVANDERIA SELF-SERVICE",
    };
  }

  // Fontanelle / Punti acqua potabile
  if (
    types.includes("drinking_water") ||
    types.includes("water_point") ||
    nameLower.includes("fontanella") ||
    nameLower.includes("fontana pubblica") ||
    nameLower.includes("acqua potabile") ||
    nameLower.includes("punto acqua") ||
    nameLower.includes("carico acqua")
  ) {
    return {
      category: "camper_service",
      serviceSubtype: "fontanella",
      categoryLabel: "FONTANELLA ACQUA",
    };
  }

  // Solo Scarico
  if (
    nameLower.includes("solo scarico") ||
    nameLower.includes("pozzetto scarico") ||
    nameLower.includes("scarico reflui")
  ) {
    return {
      category: "camper_service",
      serviceSubtype: "solo_scarico",
      categoryLabel: "SOLO SCARICO REFLUI",
    };
  }

  // Camper Service C/S generico
  if (
    types.includes("sanitary_dump_station") ||
    nameLower.includes("camper service") ||
    nameLower.includes("carico/scarico") ||
    nameLower.includes("carico scarico")
  ) {
    return {
      category: "camper_service",
      serviceSubtype: "carico_scarico",
      categoryLabel: "CAMPER SERVICE (C/S)",
    };
  }

  // Agricampeggio & Agriturismi con sosta camper
  if (
    types.includes("farm") ||
    types.includes("agritourism") ||
    types.includes("agricamper") ||
    nameLower.includes("agricamp") ||
    nameLower.includes("agrituris") ||
    nameLower.includes("azienda agricola") ||
    nameLower.includes("fattoria didattica") ||
    nameLower.includes("sosta in fattoria") ||
    nameLower.includes("accueil a la ferme")
  ) {
    return { category: "agricampeggio", categoryLabel: "AGRICAMPEGGIO" };
  }

  if (
    types.includes("campground") ||
    types.includes("rv_park") ||
    nameLower.includes("camping") ||
    nameLower.includes("campeggio")
  ) {
    return { category: "campeggio", categoryLabel: "CAMPEGGIO" };
  }

  if (
    types.includes("caravan_site") ||
    nameLower.includes("area sosta") ||
    nameLower.includes("sosta camper") ||
    nameLower.includes("area camper") ||
    nameLower.includes("sosta attrezzata")
  ) {
    return { category: "area_sosta", categoryLabel: "AREA SOSTA" };
  }

  // Parcheggio Solo Giorno
  if (
    nameLower.includes("solo giorno") ||
    nameLower.includes("solo diurno") ||
    nameLower.includes("sosta diurna") ||
    nameLower.includes("divieto notturno") ||
    nameLower.includes("sosta notturna vietata") ||
    nameLower.includes("no overnight") ||
    nameLower.includes("parking jour") ||
    nameLower.includes("jour uniquement") ||
    nameLower.includes("day only")
  ) {
    return { category: "parcheggio_diurno", categoryLabel: "PARCHEGGIO SOLO GIORNO" };
  }

  // Parcheggio a Pagamento
  if (
    nameLower.includes("parcheggio a pagamento") ||
    nameLower.includes("parcheggio a ticket") ||
    nameLower.includes("parcometro") ||
    nameLower.includes("tariffa oraria") ||
    nameLower.includes("parking payant") ||
    nameLower.includes("paid parking")
  ) {
    return { category: "parcheggio_pagamento", categoryLabel: "PARCHEGGIO A PAGAMENTO" };
  }

  // Parcheggio Gratuito
  if (
    nameLower.includes("parcheggio gratuito") ||
    nameLower.includes("parcheggio gratis") ||
    nameLower.includes("free parking") ||
    nameLower.includes("parking gratuit")
  ) {
    return { category: "parcheggio_gratuito", categoryLabel: "PARCHEGGIO FREE" };
  }

  if (
    types.includes("parking") ||
    (nameLower.includes("parcheggio") && !nameLower.includes("parcheggio camper"))
  ) {
    return { category: "parcheggio_gratuito", categoryLabel: "PARCHEGGIO FREE" };
  }

  // 2. Specific Business & Commercial Places (Google Places or OSM)

  // Ristoranti / Pizzerie / Ricevimenti / Trattorie
  if (
    types.includes("restaurant") ||
    types.includes("meal_takeaway") ||
    types.includes("meal_delivery") ||
    nameLower.includes("ristorante") ||
    nameLower.includes("trattoria") ||
    nameLower.includes("osteria") ||
    nameLower.includes("pizzeria") ||
    nameLower.includes("ricevimenti") ||
    nameLower.includes("tavola calda") ||
    nameLower.includes("grill") ||
    nameLower.includes("bistrot")
  ) {
    return { category: "area_sosta", categoryLabel: "RISTORANTE" };
  }

  // Bar / Caffè / Pub
  if (
    types.includes("bar") ||
    types.includes("pub") ||
    types.includes("night_club") ||
    types.includes("cafe") ||
    nameLower.includes("bar ") ||
    nameLower.startsWith("bar ") ||
    nameLower === "bar" ||
    nameLower.includes("caffè") ||
    nameLower.includes("caffe") ||
    nameLower.includes("pub")
  ) {
    return { category: "area_sosta", categoryLabel: "BAR" };
  }

  // Pasticceria / Panificio
  if (
    types.includes("bakery") ||
    nameLower.includes("pasticceria") ||
    nameLower.includes("panificio") ||
    nameLower.includes("forno")
  ) {
    return { category: "area_sosta", categoryLabel: "PASTICCERIA / BAR" };
  }

  // Autoricambi / Ricambi
  if (
    types.includes("auto_parts") ||
    types.includes("car_parts") ||
    nameLower.includes("ricambio") ||
    nameLower.includes("ricambi") ||
    nameLower.includes("autoricambi") ||
    nameLower.includes("spare parts")
  ) {
    return { category: "area_sosta", categoryLabel: "AUTORICAMBI" };
  }

  // Officina / Meccanico / Gommista / Elettrauto
  if (
    types.includes("car_repair") ||
    nameLower.includes("officina") ||
    nameLower.includes("meccanico") ||
    nameLower.includes("gommista") ||
    nameLower.includes("elettrauto") ||
    nameLower.includes("carrozzeria")
  ) {
    return { category: "area_sosta", categoryLabel: "OFFICINA MECCANICA" };
  }

  // Concessionario / Noleggio
  if (
    types.includes("car_dealer") ||
    types.includes("car_rental") ||
    nameLower.includes("concessionario") ||
    nameLower.includes("noleggio")
  ) {
    return { category: "area_sosta", categoryLabel: "CONCESSIONARIO" };
  }

  // Distributore Carburante / Benzinai
  if (
    types.includes("gas_station") ||
    nameLower.includes("distributore") ||
    nameLower.includes("benzina") ||
    nameLower.includes("gasolio") ||
    nameLower.includes("carburanti") ||
    nameLower.includes("eni station") ||
    nameLower.includes("q8") ||
    nameLower.includes("tamoil")
  ) {
    return { category: "area_sosta", categoryLabel: "DISTRIBUTORE CARBURANTE" };
  }

  // Supermercato / Alimentari
  if (
    types.includes("supermarket") ||
    types.includes("grocery_or_supermarket") ||
    nameLower.includes("supermercato") ||
    nameLower.includes("hypermarket") ||
    nameLower.includes("alimentari") ||
    nameLower.includes("conad") ||
    nameLower.includes("coop") ||
    nameLower.includes("lidl") ||
    nameLower.includes("eurospin") ||
    nameLower.includes("carrefour")
  ) {
    return { category: "area_sosta", categoryLabel: "SUPERMERCATO" };
  }

  // Negozi / Shopping
  if (
    types.includes("store") ||
    types.includes("shopping_mall") ||
    nameLower.includes("negozio") ||
    nameLower.includes("bazar")
  ) {
    return { category: "area_sosta", categoryLabel: "NEGOZIO" };
  }

  // Agriturismo / Hotel / Alloggio
  if (
    types.includes("lodging") ||
    types.includes("hotel") ||
    types.includes("motel") ||
    nameLower.includes("agriturismo") ||
    nameLower.includes("hotel") ||
    nameLower.includes("albergo") ||
    nameLower.includes("b&b") ||
    nameLower.includes("bed and breakfast") ||
    nameLower.includes("resort")
  ) {
    return { category: "area_sosta", categoryLabel: "HOTEL / ALLOGGIO" };
  }

  // Farmacia / Salute
  if (
    types.includes("pharmacy") ||
    types.includes("hospital") ||
    nameLower.includes("farmacia") ||
    nameLower.includes("ospedale")
  ) {
    return { category: "area_sosta", categoryLabel: "FARMACIA" };
  }

  // Punto di Interesse / Cultura
  if (
    types.includes("tourist_attraction") ||
    types.includes("museum") ||
    types.includes("art_gallery") ||
    types.includes("point_of_interest") ||
    nameLower.includes("museo") ||
    nameLower.includes("castello") ||
    nameLower.includes("monumento") ||
    nameLower.includes("duomo") ||
    nameLower.includes("chiesa")
  ) {
    return { category: "area_sosta", categoryLabel: "PUNTO DI INTERESSE" };
  }

  // Parco / Natura
  if (
    types.includes("park") ||
    types.includes("natural_feature") ||
    nameLower.includes("parco") ||
    nameLower.includes("riserva")
  ) {
    return { category: "area_sosta", categoryLabel: "PARCO / NATURA" };
  }

  // 3. Check explicit category if camper category
  if (sug.category === "agricampeggio") return { category: "agricampeggio", categoryLabel: "AGRICAMPEGGIO" };
  if (sug.category === "campeggio") return { category: "campeggio", categoryLabel: "CAMPEGGIO" };
  if (sug.category === "camper_service") {
    const subtype = resolvePlaceServiceSubtype({ category: "camper_service", name: sug.name, categoryLabel: sug.categoryLabel });
    let label = "CAMPER SERVICE (C/S)";
    if (subtype === "fontanella") label = "FONTANELLA ACQUA";
    else if (subtype === "lavanderia") label = "LAVANDERIA SELF-SERVICE";
    else if (subtype === "solo_scarico") label = "SOLO SCARICO REFLUI";
    else if (subtype === "carico_scarico") label = "C/S COMPLETO";
    return { category: "camper_service", serviceSubtype: subtype, categoryLabel: label };
  }
  if (sug.category === "parcheggio_gratuito") return { category: "parcheggio_gratuito", categoryLabel: "PARCHEGGIO FREE" };
  if (sug.category === "parcheggio_pagamento") return { category: "parcheggio_pagamento", categoryLabel: "PARCHEGGIO A PAGAMENTO" };
  if (sug.category === "parcheggio_diurno") return { category: "parcheggio_diurno", categoryLabel: "PARCHEGGIO SOLO GIORNO" };
  if (sug.category === "parcheggio_camper") return { category: "parcheggio_camper", categoryLabel: "PARCHEGGIO" };
  if (sug.category === "carico_scarico") return { category: "carico_scarico", serviceSubtype: "carico_scarico", categoryLabel: "C/S COMPLETO" };
  if (sug.category === "solo_scarico") return { category: "solo_scarico", serviceSubtype: "solo_scarico", categoryLabel: "SOLO SCARICO REFLUI" };
  if (sug.category === "fontanella") return { category: "fontanella", serviceSubtype: "fontanella", categoryLabel: "FONTANELLA ACQUA" };
  if (sug.category === "lavanderia") return { category: "lavanderia", serviceSubtype: "lavanderia", categoryLabel: "LAVANDERIA SELF-SERVICE" };
  if (sug.category === "hidden_gem") return { category: "hidden_gem", categoryLabel: "GEMMA NASCOSTA" };

  // 4. Fallback for unclassified search places:
  // Return undefined for categoryLabel so no false "AREA SOSTA" is displayed
  return { category: "area_sosta", categoryLabel: undefined };
}

/**
 * Gets human readable badge text to display or null if nothing should be shown.
 */
export function getPlaceBadgeText(place: {
  category?: PlaceCategory;
  categoryLabel?: string;
  serviceSubtype?: CamperServiceSubtype;
  name?: string;
  facilities?: string[];
  source?: string;
}): string | null {
  const subtype = resolvePlaceServiceSubtype(place);
  if (subtype === "fontanella") return "🚰 FONTANELLA ACQUA";
  if (subtype === "lavanderia") return "🧺 LAVANDERIA SELF-SERVICE";
  if (subtype === "solo_scarico") return "🕳️ SOLO SCARICO REFLUI";
  if (subtype === "carico_scarico") return "💧 C/S COMPLETO";

  if (place.categoryLabel) {
    const labelUpper = place.categoryLabel.toUpperCase();
    if (labelUpper.includes("LAVAND") || labelUpper.includes("LAUNDRY")) return "🧺 LAVANDERIA SELF-SERVICE";
    if (labelUpper.includes("FONTAN")) return "🚰 FONTANELLA ACQUA";
    if (labelUpper.includes("SOLO SCARICO")) return "🕳️ SOLO SCARICO REFLUI";
    if (labelUpper.includes("AGRICAMP")) return "🚜 AGRICAMPEGGIO";
    if (labelUpper.includes("SOLO GIORNO") || labelUpper.includes("DIURNO")) return "☀️ PARCHEGGIO SOLO GIORNO";
    if (labelUpper.includes("PAGAMENTO") || labelUpper.includes("TICKET")) return "🅿️ PARCHEGGIO A PAGAMENTO";
    if (labelUpper.includes("GRATUIT") || labelUpper.includes("FREE")) return "🅿️ PARCHEGGIO FREE";
    if (place.category !== "camper_service" || !labelUpper.includes("CAMPER SERVICE")) {
      return labelUpper;
    }
  }

  if (place.category === "agricampeggio") return "🚜 AGRICAMPEGGIO";
  if (place.category === "parcheggio_gratuito") return "🅿️ PARCHEGGIO FREE";
  if (place.category === "parcheggio_pagamento") return "🅿️ PARCHEGGIO A PAGAMENTO";
  if (place.category === "parcheggio_diurno") return "☀️ PARCHEGGIO SOLO GIORNO";
  if (place.category === "parcheggio_camper") return "🅿️ PARCHEGGIO";
  if (place.category === "carico_scarico") return "💧 C/S COMPLETO";
  if (place.category === "camper_service") return "🔧 CAMPER SERVICE";
  if (place.category === "solo_scarico") return "🕳️ SOLO SCARICO REFLUI";
  if (place.category === "fontanella") return "🚰 FONTANELLA ACQUA";
  if (place.category === "lavanderia") return "🧺 LAVANDERIA SELF-SERVICE";
  if (place.category === "campeggio") return "⛺ CAMPEGGIO";
  if (place.category === "hidden_gem") return "💎 GEMMA NASCOSTA";

  // If search place without specific category label
  if (place.source && (place.source.includes("google") || place.source === "osm")) {
    return null;
  }

  // Verified app database place
  if (place.category === "area_sosta") {
    return "🚐 AREA SOSTA";
  }

  return null;
}
