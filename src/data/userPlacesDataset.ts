/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Place, PlaceCategory } from "../types";
import { resolvePlaceServiceSubtype, getPlaceBadgeText } from "../utils/placeCategoryHelper";
import userPlacesData from '../../user_places.json';

export const USER_RAW_PLACES = [
    {
        "id":  "54742",
        "titolo":  "Peisey-Nancroix,  D87",
        "tipo":  "P",
        "lat":  45.518501,
        "lng":  6.80004,
        "voto":  4.82,
        "servizi":  { "acqua":  false, "scarico_grigie":  false, "scarico_nere":  false, "elettricita":  false, "rifiuti":  false, "wc":  true, "docce":  false, "wifi":  false }
    },
    {
        "id":  "91451",
        "titolo":  "Tignes, 10 Avenue de la Grande Motte",
        "tipo":  "PJ",
        "lat":  45.454141,
        "lng":  6.897868,
        "voto":  2.5,
        "servizi":  { "acqua":  true, "scarico_grigie":  false, "scarico_nere":  false, "elettricita":  false, "rifiuti":  true, "wc":  true, "docce":  false, "wifi":  false }
    }
];

export function parseUserRawPlace(item: any, index: number | string): Place {
  return parseSostaFirestoreDoc(item, index);
}

export function parseSostaFirestoreDoc(item: any, fallbackId?: number | string): Place {
  const docId = String(item.id || item.docId || fallbackId || `sosta_${Date.now()}`);
  const rawCat = String(item.category || "").toLowerCase().trim();
  const tipoUpper = String(item.tipo || item.category || "").toUpperCase().trim();
  const title = item.titolo || item.name || "Area Sosta Camper";
  const titleLower = title.toLowerCase();
  const descLower = String(item.descrizione || item.description || item.address || item.indirizzo || "").toLowerCase();
  const priceStr = String(item.priceInfo || item.tariffa || item.prezzo || "").toLowerCase();

  const isFreeExplicit = item.gratis === true || item.feeStatus === "free" || item.isFree === true || priceStr.includes("gratuit") || priceStr.includes("free") || priceStr.includes("kostenlos") || (typeof item.priceEuro === "number" && item.priceEuro === 0);
  const isPaidExplicit = item.gratis === false || item.feeStatus === "paid" || item.isFree === false || (typeof item.priceEuro === "number" && item.priceEuro > 0) || priceStr.includes("€") || priceStr.includes("euro") || priceStr.includes("pagamento") || priceStr.includes("payant") || priceStr.includes("ticket") || priceStr.includes("parcometro") || priceStr.includes("tariffa");

  const servizi = item.servizi || {};
  const hasWater = Boolean(servizi.acqua);
  const hasDischarge = Boolean(servizi.scarico_grigie || servizi.scarico_nere || servizi.scarico);

  let category: PlaceCategory = "area_sosta";
  let serviceSubtype: "carico_scarico" | "fontanella" | "lavanderia" | "solo_scarico" | undefined = undefined;

  // 1. Agricampeggio & Fattorie
  if (
    rawCat === "agricampeggio" ||
    tipoUpper === "F" ||
    tipoUpper === "FERME" ||
    titleLower.includes("agriturism") ||
    titleLower.includes("agricamp") ||
    titleLower.includes("agricamper") ||
    titleLower.includes("azienda agricola") ||
    titleLower.includes("fattoria didattica") ||
    titleLower.includes("sosta in fattoria") ||
    descLower.includes("accueil a la ferme")
  ) {
    category = "agricampeggio";
  }
  // 2. Lavanderia Self-Service
  else if (
    rawCat === "lavanderia" ||
    titleLower.includes("lavanderia") ||
    titleLower.includes("laundromat") ||
    titleLower.includes("speed queen") ||
    titleLower.includes("lavasecco") ||
    titleLower.includes("lavatrici a gettoni")
  ) {
    category = "lavanderia";
    serviceSubtype = "lavanderia";
  }
  // 3. Fontanella / Punto Acqua Potabile
  else if (
    rawCat === "fontanella" ||
    tipoUpper === "EP" ||
    titleLower.includes("fontanella") ||
    titleLower.includes("fontana pubblica") ||
    titleLower.includes("punto acqua potabile") ||
    ((tipoUpper === "DS" || rawCat === "camper_service") && hasWater && !hasDischarge)
  ) {
    category = "fontanella";
    serviceSubtype = "fontanella";
  }
  // 4. Solo Scarico Reflui
  else if (
    rawCat === "solo_scarico" ||
    tipoUpper === "SOLO_SCARICO" ||
    titleLower.includes("solo scarico") ||
    titleLower.includes("pozzetto scarico") ||
    ((tipoUpper === "DS" || rawCat === "camper_service") && !hasWater && hasDischarge)
  ) {
    category = "solo_scarico";
    serviceSubtype = "solo_scarico";
  }
  // 5. Campeggio
  else if (
    rawCat === "campeggio" ||
    tipoUpper === "C" ||
    tipoUpper === "CAMP" ||
    titleLower.includes("camping ") ||
    titleLower.startsWith("camping") ||
    titleLower.includes("campeggio ") ||
    titleLower.startsWith("campeggio")
  ) {
    category = "campeggio";
  }
  // 6. Parcheggio Solo Giorno
  else if (
    rawCat === "parcheggio_diurno" ||
    tipoUpper === "PJ" ||
    tipoUpper === "PSD" ||
    tipoUpper === "PD" ||
    titleLower.includes("solo giorno") ||
    titleLower.includes("solo diurno") ||
    titleLower.includes("sosta diurna") ||
    titleLower.includes("divieto notturno") ||
    titleLower.includes("sosta notturna vietata") ||
    titleLower.includes("no overnight") ||
    titleLower.includes("parking jour")
  ) {
    category = "parcheggio_diurno";
  }
  // 7. Parcheggio a Pagamento
  else if (
    rawCat === "parcheggio_pagamento" ||
    tipoUpper === "PSS" ||
    tipoUpper === "ACC_P" ||
    tipoUpper === "PP" ||
    titleLower.includes("parcheggio a pagamento") ||
    titleLower.includes("parcometro") ||
    titleLower.includes("parking payant") ||
    ((tipoUpper === "P" || tipoUpper === "PN" || tipoUpper === "APN") && isPaidExplicit && !isFreeExplicit)
  ) {
    category = "parcheggio_pagamento";
  }
  // 8. Parcheggio Gratuito
  else if (
    rawCat === "parcheggio_gratuito" ||
    rawCat === "parcheggio_camper" ||
    rawCat === "parcheggio" ||
    tipoUpper === "P" ||
    tipoUpper === "PN" ||
    tipoUpper === "APN" ||
    tipoUpper === "ACC_G" ||
    titleLower.includes("parcheggio gratuito") ||
    titleLower.includes("parcheggio free") ||
    titleLower.includes("free parking")
  ) {
    category = "parcheggio_gratuito";
  }
  // 9. C/S Completo
  else if (
    rawCat === "carico_scarico" ||
    tipoUpper === "CS" ||
    titleLower.includes("carico e scarico") ||
    titleLower.includes("carico/scarico") ||
    titleLower.includes("c/s completo") ||
    ((tipoUpper === "DS" || rawCat === "camper_service") && hasWater && hasDischarge) ||
    tipoUpper === "DS"
  ) {
    category = "carico_scarico";
    serviceSubtype = "carico_scarico";
  }
  // 10. Camper Service generico
  else if (rawCat === "camper_service" || tipoUpper.includes("SERVICE")) {
    category = "camper_service";
    serviceSubtype = "carico_scarico";
  }
  // 11. Hidden Gem
  else if (rawCat === "hidden_gem") {
    category = "hidden_gem";
  }
  // 12. Area Sosta Camper (Default per ASS, AS, AA, AR, ACC_PR, OR e aree attrezzate)
  else {
    category = "area_sosta";
  }

  const facilities: string[] = [];
  if (servizi.acqua) facilities.push("Carico acqua");
  if (servizi.scarico_grigie || servizi.scarico_nere || servizi.scarico) facilities.push("Scarico reflui");
  if (servizi.elettricita || servizi.corrente) facilities.push("Elettricità 220V");
  if (servizi.rifiuti) facilities.push("Raccolta differenziata");
  if (servizi.wc) facilities.push("Servizi igienici");
  if (servizi.docce) facilities.push("Docce calde");
  if (servizi.wifi) facilities.push("Wi-Fi gratuito");

  const rawRating = typeof item.voto === "number" ? item.voto : (typeof item.rating === "number" ? item.rating : 8.4);
  // Normalize legacy 1-5 scale into 1-10 scale
  const rating = rawRating > 0 && rawRating <= 5.0 ? parseFloat((rawRating * 2).toFixed(1)) : rawRating;

  let defaultImg = "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600";
  if (category === "campeggio") {
    defaultImg = "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=600";
  } else if (category === "agricampeggio") {
    defaultImg = "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&q=80&w=600";
  } else if (category === "parcheggio_gratuito" || category === "parcheggio_pagamento" || category === "parcheggio_diurno") {
    defaultImg = "https://images.unsplash.com/photo-1513311068348-19c8fbdc0bb6?auto=format&fit=crop&q=80&w=600";
  } else if (category === "camper_service" || category === "carico_scarico" || category === "lavanderia" || category === "fontanella" || category === "solo_scarico") {
    defaultImg = "https://images.unsplash.com/photo-1527786356703-4b100091cd2c?auto=format&fit=crop&q=80&w=600";
  }

  const finalFacilities = Array.isArray(item.facilities) && item.facilities.length > 0 ? item.facilities : facilities;
  const finalServiceSubtype = item.serviceSubtype || serviceSubtype || resolvePlaceServiceSubtype({
    category,
    serviceSubtype: item.serviceSubtype || serviceSubtype,
    name: title,
    facilities: finalFacilities,
    categoryLabel: item.tipo || item.categoryLabel
  });
  const categoryLabel = item.categoryLabel || getPlaceBadgeText({ category, serviceSubtype: finalServiceSubtype, name: title });

  const rawReviews = Array.isArray(item.reviews) ? item.reviews : [];
  const normalizedReviews = rawReviews.map((r: any) => {
    if (!r) return r;
    if (typeof r.rating === "number" && r.rating > 0 && r.rating <= 5) {
      return { ...r, rating: Math.round(r.rating * 2) };
    }
    return r;
  });

  return {
    id: docId,
    name: title,
    category,
    categoryLabel,
    serviceSubtype: finalServiceSubtype,
    lat: Number(item.lat),
    lng: Number(item.lng),
    address: item.address || item.indirizzo || title,
    priceInfo: item.priceInfo || (item.gratis ? "Gratuito" : "Verificare in loco"),
    priceEuro: typeof item.priceEuro === "number" ? item.priceEuro : (item.gratis ? 0 : 10),
    rating,
    facilities: finalFacilities,
    imageUrl: item.imageUrl || item.foto || defaultImg,
    source: "inserito_a_mano",
    reviews: normalizedReviews
  };
}

const combinedRawPlaces = [...USER_RAW_PLACES, ...userPlacesData];
export const USER_PROVIDED_PLACES: Place[] = combinedRawPlaces.map((item, idx) => parseUserRawPlace(item, idx));
