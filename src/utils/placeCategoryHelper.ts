import { PlaceCategory } from "../types";

export interface PlaceCategoryInfo {
  category: PlaceCategory;
  categoryLabel?: string;
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
}): PlaceCategoryInfo {
  // If explicitly provided with a custom label, return it
  if (sug.categoryLabel) {
    return {
      category: (sug.category as PlaceCategory) || "area_sosta",
      categoryLabel: sug.categoryLabel.toUpperCase(),
    };
  }

  const types = (sug.types || []).map((t: string) => String(t).toLowerCase());
  const nameLower = (sug.name || sug.display_name || "").toLowerCase();

  // 1. Camper-specific categories first (highest priority)
  if (
    types.includes("campground") ||
    types.includes("rv_park") ||
    nameLower.includes("camping") ||
    nameLower.includes("campeggio")
  ) {
    return { category: "campeggio", categoryLabel: "CAMPEGGIO" };
  }

  if (
    types.includes("sanitary_dump_station") ||
    nameLower.includes("camper service") ||
    nameLower.includes("carico/scarico") ||
    nameLower.includes("carico scarico")
  ) {
    return { category: "camper_service", categoryLabel: "CAMPER SERVICE" };
  }

  if (
    types.includes("caravan_site") ||
    nameLower.includes("area sosta") ||
    nameLower.includes("sosta camper") ||
    nameLower.includes("area camper") ||
    nameLower.includes("agricamper") ||
    nameLower.includes("sosta attrezzata")
  ) {
    return { category: "area_sosta", categoryLabel: "AREA SOSTA" };
  }

  if (
    types.includes("parking") ||
    (nameLower.includes("parcheggio") && !nameLower.includes("parcheggio camper"))
  ) {
    return { category: "parcheggio_camper", categoryLabel: "PARCHEGGIO" };
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
  if (sug.category === "campeggio") return { category: "campeggio", categoryLabel: "CAMPEGGIO" };
  if (sug.category === "camper_service") return { category: "camper_service", categoryLabel: "CAMPER SERVICE" };
  if (sug.category === "parcheggio_camper") return { category: "parcheggio_camper", categoryLabel: "PARCHEGGIO" };
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
  source?: string;
}): string | null {
  if (place.categoryLabel) {
    return place.categoryLabel.toUpperCase();
  }

  if (place.category === "campeggio") return "CAMPEGGIO";
  if (place.category === "camper_service") return "CAMPER SERVICE";
  if (place.category === "parcheggio_camper") return "PARCHEGGIO";
  if (place.category === "hidden_gem") return "GEMMA NASCOSTA";

  // If search place without specific category label
  if (place.source && (place.source.includes("google") || place.source === "osm")) {
    return null;
  }

  // Verified app database place
  if (place.category === "area_sosta") {
    return "AREA SOSTA";
  }

  return null;
}
