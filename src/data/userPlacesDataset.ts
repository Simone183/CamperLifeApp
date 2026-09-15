/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Place, PlaceCategory } from "../types";
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
  const tipoUpper = String(item.tipo || item.category || "").toUpperCase().trim();
  
  let category: PlaceCategory = "area_sosta";
  if (tipoUpper === "C" || tipoUpper === "CAMP" || tipoUpper.includes("CAMPEGGI")) {
    category = "campeggio";
  } else if (tipoUpper === "DS" || tipoUpper === "CS" || tipoUpper.includes("SERVICE") || tipoUpper.includes("DUMP")) {
    category = "camper_service";
  } else if (tipoUpper === "P" || tipoUpper === "PJ" || tipoUpper === "PSS" || tipoUpper === "ACC_P" || tipoUpper === "APN" || tipoUpper === "OR" || tipoUpper.includes("PARCH") || tipoUpper.includes("PARKING")) {
    category = "parcheggio_camper";
  } else if (tipoUpper === "AS" || tipoUpper === "AA" || tipoUpper === "ASS" || tipoUpper.includes("SOSTA")) {
    category = "area_sosta";
  }

  const facilities: string[] = [];
  const servizi = item.servizi || {};
  if (servizi.acqua) facilities.push("Carico acqua");
  if (servizi.scarico_grigie || servizi.scarico_nere || servizi.scarico) facilities.push("Scarico reflui");
  if (servizi.elettricita || servizi.corrente) facilities.push("Elettricità 220V");
  if (servizi.rifiuti) facilities.push("Raccolta differenziata");
  if (servizi.wc) facilities.push("Servizi igienici");
  if (servizi.docce) facilities.push("Docce calde");
  if (servizi.wifi) facilities.push("Wi-Fi gratuito");

  const title = item.titolo || item.name || "Area Sosta Camper";
  const rating = typeof item.voto === "number" ? item.voto : (typeof item.rating === "number" ? item.rating : 4.2);

  let defaultImg = "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600";
  if (category === "campeggio") {
    defaultImg = "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=600";
  } else if (category === "parcheggio_camper") {
    defaultImg = "https://images.unsplash.com/photo-1513311068348-19c8fbdc0bb6?auto=format&fit=crop&q=80&w=600";
  } else if (category === "camper_service") {
    defaultImg = "https://images.unsplash.com/photo-1527786356703-4b100091cd2c?auto=format&fit=crop&q=80&w=600";
  }

  return {
    id: docId,
    name: title,
    category,
    lat: Number(item.lat),
    lng: Number(item.lng),
    address: item.address || item.indirizzo || title,
    priceInfo: item.priceInfo || (item.gratis ? "Gratuito" : "Verificare in loco"),
    priceEuro: typeof item.priceEuro === "number" ? item.priceEuro : (item.gratis ? 0 : 10),
    rating,
    facilities: Array.isArray(item.facilities) && item.facilities.length > 0 ? item.facilities : facilities,
    imageUrl: item.imageUrl || item.foto || defaultImg,
    source: "inserito_a_mano",
    reviews: Array.isArray(item.reviews) ? item.reviews : []
  };
}

const combinedRawPlaces = [...USER_RAW_PLACES, ...userPlacesData];
export const USER_PROVIDED_PLACES: Place[] = combinedRawPlaces.map((item, idx) => parseUserRawPlace(item, idx));
