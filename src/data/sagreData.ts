import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Place, PlaceCategory } from '../types.ts';
import { normalizeSagraFlyerUrl, resolveApiUrl } from '../utils/resolveMediaUrl';

export interface SagraEvent {
  id: string;
  title: string;
  category: 'sagra' | 'natale' | 'storica' | 'vino';
  categoryLabel: string;
  locationName: string;
  region: string;
  dates: string;
  dateBadge: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  month: number;     // 1..12
  season: 'autunno' | 'inverno' | 'primavera' | 'estate';
  lat: number;
  lng: number;
  description: string;
  specialties: string[];
  camperParking: string;
  imageUrl: string;
  fullFlyerUrl?: string;
  extraPhotos?: string[];
  isRealFlyer?: boolean;
  section: 'vicino' | 'weekend' | 'natale' | 'primavera' | 'estate' | 'tutte';
  sourceUrl?: string;
  status?: 'approved' | 'pending';
  submittedByEmail?: string;
  submittedByName?: string;
  createdAt?: string;
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatSagraDateBadgeClient(dateStart?: string | null, dateEnd?: string | null): {
  badge: string;
  readable: string;
  month: number;
  season: 'primavera' | 'estate' | 'autunno' | 'inverno';
} {
  const shortMonths = ['', 'gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  const fullMonths = [
    '', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
  ];
  const todayIso = getTodayIsoDate();
  const start = (dateStart || todayIso).slice(0, 10);
  const end = (dateEnd || start).slice(0, 10);
  const y1 = start.slice(0, 4);
  const m1 = parseInt(start.slice(5, 7), 10) || 11;
  const d1 = parseInt(start.slice(8, 10), 10) || 1;
  const m2 = parseInt(end.slice(5, 7), 10) || m1;
  const d2 = parseInt(end.slice(8, 10), 10) || d1;

  const season: 'primavera' | 'estate' | 'autunno' | 'inverno' =
    m1 >= 6 && m1 <= 9
      ? 'estate'
      : m1 >= 3 && m1 <= 5
      ? 'primavera'
      : m1 === 12 || m1 <= 2
      ? 'inverno'
      : 'autunno';

  if (start === end || (d1 === d2 && m1 === m2)) {
    return {
      badge: `${d1} ${shortMonths[m1]}`,
      readable: `${d1} ${fullMonths[m1]} ${y1}`,
      month: m1,
      season,
    };
  }
  if (m1 === m2) {
    return {
      badge: `${d1}-${d2} ${shortMonths[m1]}`,
      readable: `${d1} - ${d2} ${fullMonths[m1]} ${y1}`,
      month: m1,
      season,
    };
  }
  return {
    badge: `${d1} ${shortMonths[m1]}-${d2} ${shortMonths[m2]}`,
    readable: `${d1} ${fullMonths[m1]} - ${d2} ${fullMonths[m2]} ${y1}`,
    month: m1,
    season,
  };
}

/**
 * Generates an inline SVG Data-URI graphic poster fallback for a real sagra ONLY if the
 * phone has weak internet and cannot load the culinary photo from the CDN.
 */
export function buildSvgPosterDataUri(sagra: {
  title: string;
  locationName: string;
  dates: string;
  categoryLabel?: string;
  specialties?: string[];
}): string {
  const safeTitle = (sagra.title || 'Sagra Tradizionale').replace(/[&<>'"]/g, '');
  const safeLoc = (sagra.locationName || 'Italia').replace(/[&<>'"]/g, '');
  const safeDates = (sagra.dates || '').replace(/[&<>'"]/g, '');
  const safeCat = (sagra.categoryLabel || 'Festa Gastronomica').replace(/[&<>'"]/g, '');
  const spec1 = (sagra.specialties?.[0] || 'Stand Gastronomici Coperti').replace(/[&<>'"]/g, '');
  const spec2 = (sagra.specialties?.[1] || 'Prodotti Tipici Locali').replace(/[&<>'"]/g, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3E4A35"/>
        <stop offset="50%" stop-color="#2A3424"/>
        <stop offset="100%" stop-color="#171E13"/>
      </linearGradient>
    </defs>
    <rect width="600" height="800" fill="url(#bg)"/>
    <rect x="24" y="24" width="552" height="752" rx="22" fill="none" stroke="#F59E0B" stroke-width="4" stroke-dasharray="10,6"/>
    <rect x="60" y="64" width="480" height="48" rx="24" fill="#F59E0B"/>
    <text x="300" y="96" font-family="sans-serif" font-size="22" font-weight="900" fill="#1E293B" text-anchor="middle">${safeCat.toUpperCase()}</text>
    <text x="300" y="210" font-family="serif" font-size="38" font-weight="900" fill="#FFFFFF" text-anchor="middle">${safeTitle.slice(0, 26)}</text>
    <text x="300" y="260" font-family="serif" font-size="32" font-weight="800" fill="#FDE68A" text-anchor="middle">${safeTitle.slice(26, 54)}</text>
    <line x1="120" y1="305" x2="480" y2="305" stroke="#F59E0B" stroke-width="2"/>
    <text x="300" y="365" font-family="sans-serif" font-size="26" font-weight="800" fill="#10B981" text-anchor="middle">📍 ${safeLoc}</text>
    <text x="300" y="420" font-family="sans-serif" font-size="24" font-weight="800" fill="#FFFFFF" text-anchor="middle">📅 ${safeDates}</text>
    <rect x="70" y="470" width="460" height="140" rx="18" fill="#FFFFFF" fill-opacity="0.1"/>
    <text x="300" y="515" font-family="sans-serif" font-size="22" font-weight="700" fill="#FDE68A" text-anchor="middle">🍽️ ${spec1}</text>
    <text x="300" y="560" font-family="sans-serif" font-size="22" font-weight="700" fill="#FDE68A" text-anchor="middle">🍷 ${spec2}</text>
    <text x="300" y="690" font-family="sans-serif" font-size="20" font-weight="800" fill="#A7F3D0" text-anchor="middle">🚐 AREA SOSTA CAMPER CONSIGLIATA</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Returns true if the sagra's endDate (or startDate) is strictly before today's local YYYY-MM-DD.
 * Once a sagra's real endDate has passed, it is permanently hidden and never shifted to unconfirmed future dates.
 */
export function isSagraExpired(item: { endDate?: string; startDate?: string }): boolean {
  const end = (item.endDate || item.startDate || '').slice(0, 10);
  if (!end || end.length < 10) return false;
  return end < getTodayIsoDate();
}

// Confirmed 2026 events. As soon as each event's endDate passes, `isSagraExpired` permanently removes it.
const CONFIRMED_ITALIA_SAGRE_ARCHIVE: SagraEvent[] = [
  {
    id: 'vc_broccostella_vino',
    title: 'Broccostella di Vino & Sapori Ciociari',
    category: 'vino',
    categoryLabel: 'Vino & Degustazioni',
    locationName: 'Broccostella (FR)',
    region: 'Lazio',
    dates: '22 Novembre 2026',
    dateBadge: '22 nov',
    startDate: '2026-11-22',
    endDate: '2026-11-22',
    month: 11,
    season: 'autunno',
    lat: 41.7024,
    lng: 13.6391,
    description: 'Percorso enogastronomico e degustazione di vini locali e piatti tipici ciociari nel centro storico di Broccostella (FR).',
    specialties: ['Vini Rossi Ciociari', 'Piatti Tradizionali', 'Caldarroste'],
    camperParking: 'Parcheggio camper comunale a Broccostella.',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=80',
    section: 'vicino',
  },
  {
    id: 'vc_vallerotonda_novello',
    title: 'Festa di San Martino – Sagra del Vino Novello',
    category: 'vino',
    categoryLabel: 'Castagne & Vino Novello',
    locationName: 'Vallerotonda (FR)',
    region: 'Lazio',
    dates: '22 Novembre 2026',
    dateBadge: '22 nov',
    startDate: '2026-11-22',
    endDate: '2026-11-22',
    month: 11,
    season: 'autunno',
    lat: 41.5498,
    lng: 13.9139,
    description: 'Festa di San Martino e Sagra del Vino Novello nel borgo di Vallerotonda con stand gastronomici, polenta, salsicce e castagne.',
    specialties: ['Vino Novello', 'Castagne Arrosto', 'Polenta e Salsiccia'],
    camperParking: 'Parcheggio camper panoramico all\'ingresso di Vallerotonda.',
    imageUrl: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=900&q=80',
    section: 'vicino',
  },
  {
    id: 'vc_marrone_antrodocano',
    title: 'Festa del Marrone Antrodocano',
    category: 'sagra',
    categoryLabel: 'Castagne & Sapori Reatini',
    locationName: 'Borgo Velino / Antrodoco (RI)',
    region: 'Lazio',
    dates: '21 - 22 Novembre 2026',
    dateBadge: '21-22 nov',
    startDate: '2026-11-21',
    endDate: '2026-11-22',
    month: 11,
    season: 'autunno',
    lat: 42.4043,
    lng: 13.0513,
    description: 'Degustazione del pregiato Marrone Antrodocano a Borgo Velino (RI) con stand gastronomici coperti, zuppe autunnali, carne alla brace e caldarroste.',
    specialties: ['Marrone Antrodocano', 'Zuppe Reatine', 'Carne alla Brace'],
    camperParking: 'Area parcheggio camper a Borgo Velino / Antrodoco.',
    imageUrl: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=900&q=80',
    section: 'vicino',
  },
  {
    id: 'vc_sismano_autunno',
    title: 'Taverna Sapori d\'Autunno in Umbria',
    category: 'sagra',
    categoryLabel: 'Sagra Umbra & Tartufo',
    locationName: 'Sismano, Avigliano Umbro (TR)',
    region: 'Umbria',
    dates: '20 - 29 Novembre 2026',
    dateBadge: '20-29 nov',
    startDate: '2026-11-20',
    endDate: '2026-11-29',
    month: 11,
    season: 'autunno',
    lat: 42.6885,
    lng: 12.4421,
    description: 'Taverna tipica autunnale nel castello di Sismano (TR) con piatti della tradizione umbra, tartufo, cinghiale e vini locali.',
    specialties: ['Umbricelli al Tartufo', 'Cinghiale alla Cacciatora', 'Torta al Testo'],
    camperParking: 'Parcheggio camper adiacente al borgo di Sismano.',
    imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=80',
    section: 'weekend',
  },
  {
    id: 'vc_olio_montecchio',
    title: 'Festa dell\'Olio Nuovo nei Frantoi',
    category: 'sagra',
    categoryLabel: 'Olio Extravergine DOP',
    locationName: 'Montecchio (TR)',
    region: 'Umbria',
    dates: '20 - 22 Novembre 2026',
    dateBadge: '20-22 nov',
    startDate: '2026-11-20',
    endDate: '2026-11-22',
    month: 11,
    season: 'autunno',
    lat: 42.6631,
    lng: 12.2869,
    description: 'Celebrazione dell\'olio extravergine novello nei frantoi e nelle piazze di Montecchio con bruschette calde, legumi e cucina contadina.',
    specialties: ['Olio Extravergine Novello', 'Bruschette Calde', 'Zuppa di Legumi'],
    camperParking: 'Area sosta camper comunale a Montecchio.',
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=80',
    section: 'weekend',
  },
  {
    id: 'vc_fettunta_impruneta',
    title: 'Festa della Fettunta – Olio Nuovo Toscano',
    category: 'sagra',
    categoryLabel: 'Olio Nuovo & Bruschetta',
    locationName: 'Impruneta (FI)',
    region: 'Toscana',
    dates: '21 - 29 Novembre 2026',
    dateBadge: '21-29 nov',
    startDate: '2026-11-21',
    endDate: '2026-11-29',
    month: 11,
    season: 'autunno',
    lat: 43.6857,
    lng: 11.2543,
    description: 'Storica Festa della Fettunta a Impruneta: degustazione dell\'olio extravergine novello dei frantoi fiorentini su pane toscano abbrustolito, ribollita e peposo.',
    specialties: ['Fettunta all\'Olio Nuovo', 'Peposo all\'Imprunetina', 'Ribollita Toscana'],
    camperParking: 'Area sosta camper comunale in Via della Fonte a Impruneta.',
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=80',
    section: 'weekend',
  },
  {
    id: 'vc_brunello_montalcino',
    title: 'Rassegna del Brunello e Sapori di Montalcino',
    category: 'vino',
    categoryLabel: 'Grandi Vini Toscani',
    locationName: 'Montalcino (SI)',
    region: 'Toscana',
    dates: '19 - 23 Novembre 2026',
    dateBadge: '19-23 nov',
    startDate: '2026-11-19',
    endDate: '2026-11-23',
    month: 11,
    season: 'autunno',
    lat: 43.0551,
    lng: 11.4892,
    description: 'Degustazione delle nuove annate di Brunello e Rosso di Montalcino nelle enoteche storiche del borgo con pici fatti a mano e pecorino.',
    specialties: ['Brunello di Montalcino DOCG', 'Pici Toscani', 'Pecorino di Pienza'],
    camperParking: 'Area attrezzata camper comunale panoramica a Montalcino.',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=80',
    section: 'weekend',
  },
  {
    id: 'vc_fabriano_sapori',
    title: 'Festa d\'Autunno & Sapori delle Marche',
    category: 'sagra',
    categoryLabel: 'Festa nel Borgo',
    locationName: 'Fabriano (AN)',
    region: 'Marche',
    dates: '22 Novembre 2026',
    dateBadge: '22 nov',
    startDate: '2026-11-22',
    endDate: '2026-11-22',
    month: 11,
    season: 'autunno',
    lat: 43.3383,
    lng: 12.9084,
    description: 'Festa d\'autunno a Fabriano con stand gastronomici, salame di Fabriano presidio Slow Food, crescia sfogliata e spettacoli dal vivo.',
    specialties: ['Salame di Fabriano', 'Crescia Sfogliata', 'Verdicchio di Matelica'],
    camperParking: 'Area sosta camper attrezzata in Via Giovanni XXIII a Fabriano.',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80',
    section: 'weekend',
  },
  {
    id: 'vc_cavolo_verza_montalto',
    title: 'Fiera Storica del Cavolo Verza',
    category: 'storica',
    categoryLabel: 'Sagra Storica Piemontese',
    locationName: 'Montalto Dora (TO)',
    region: 'Piemonte',
    dates: '18 - 22 Novembre 2026',
    dateBadge: '18-22 nov',
    startDate: '2026-11-18',
    endDate: '2026-11-22',
    month: 11,
    season: 'autunno',
    lat: 45.4894,
    lng: 7.8622,
    description: 'Tradizionale Fiera del Cavolo Verza di Montalto Dora nel Canavese: zuppa a base di pane, verza e toma, involtini di verza (capunet) e bagna cauda.',
    specialties: ['Zuppa di Cavolo Verza', 'Capunet Piemontesi', 'Bagna Cauda'],
    camperParking: 'Area attrezzata camper dedicata presso il campo sportivo di Montalto Dora.',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
    section: 'weekend',
  },
  {
    id: 'vc_fiera_autunno_roncofreddo',
    title: 'Fiera Gastronomica d\'Autunno in Romagna',
    category: 'sagra',
    categoryLabel: 'Sapori di Romagna',
    locationName: 'Roncofreddo (FC)',
    region: 'Emilia-Romagna',
    dates: '21 - 22 Novembre 2026',
    dateBadge: '21-22 nov',
    startDate: '2026-11-21',
    endDate: '2026-11-22',
    month: 11,
    season: 'autunno',
    lat: 44.0429,
    lng: 12.318,
    description: 'Fiera gastronomica nel borgo collinare di Roncofreddo: cappelletti romagnoli, formaggio di fossa, piadina, castagne e vini di Romagna.',
    specialties: ['Cappelletti al Ragù', 'Formaggio di Fossa', 'Piadina Romagnola'],
    camperParking: 'Parcheggio camper panoramico all\'ingresso del borgo di Roncofreddo.',
    imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=80',
    section: 'weekend',
  },
  {
    id: 'vc_spiedo_pizzighettone',
    title: 'Rassegna dello Spiedo e Polenta alle Casematte',
    category: 'sagra',
    categoryLabel: 'Spiedo & Polenta',
    locationName: 'Pizzighettone (CR)',
    region: 'Lombardia',
    dates: '22 Novembre 2026',
    dateBadge: '22 nov',
    startDate: '2026-11-22',
    endDate: '2026-11-22',
    month: 11,
    season: 'autunno',
    lat: 45.1853,
    lng: 9.7764,
    description: 'Nelle storiche Casematte delle mura riscaldate a legna di Pizzighettone, degustazione dello Spiedo a lenta cottura con polenta fumante.',
    specialties: ['Spiedo Tradizionale', 'Polenta Taragna', 'Salumi Cremonesi'],
    camperParking: 'Area sosta camper attrezzata in Piazza d\'Armi a Pizzighettone.',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
    section: 'weekend',
  },
  {
    id: 'vc_natale_aprilia',
    title: 'Mercatino di Natale & Festa in Piazza',
    category: 'natale',
    categoryLabel: 'Mercatini di Natale',
    locationName: 'Piazza Roma, Aprilia (LT)',
    region: 'Lazio',
    dates: '8 Dicembre 2026',
    dateBadge: '8 dic',
    startDate: '2026-12-08',
    endDate: '2026-12-08',
    month: 12,
    season: 'inverno',
    lat: 41.5944,
    lng: 12.656,
    description: 'Mercatino natalizio in Piazza Roma ad Aprilia dedicato all\'artigianato, dolci natalizi, caldarroste e animazione per famiglie.',
    specialties: ['Mercatino di Natale', 'Dolciumi Natalizi', 'Caldarroste e Vin Brulé'],
    camperParking: 'Parcheggio comunale in Via dei Mille ad Aprilia.',
    imageUrl: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=900&q=80',
    section: 'natale',
  },
  {
    id: 'vc_lanterne_saracinesco',
    title: 'Notte delle Lanterne & Polenta nel Borgo',
    category: 'natale',
    categoryLabel: 'Festa nel Borgo',
    locationName: 'Saracinesco (RM)',
    region: 'Lazio',
    dates: '5 Dicembre 2026',
    dateBadge: '5 dic',
    startDate: '2026-12-05',
    endDate: '2026-12-05',
    month: 12,
    season: 'inverno',
    lat: 42.0031,
    lng: 12.9533,
    description: 'Suggestiva festa serale nel borgo più alto della Valle dell\'Aniene con lanterne luminose, polenta calda e vin brulé.',
    specialties: ['Polenta di Montagna', 'Vin Brulé', 'Castagne'],
    camperParking: 'Parcheggio panoramico ai piedi del borgo di Saracinesco.',
    imageUrl: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=900&q=80',
    section: 'natale',
  },
  {
    id: 'vc_mosciarella_capranica',
    title: 'Sagra della Mosciarella sui Monti Prenestini',
    category: 'storica',
    categoryLabel: 'Castagna Mosciarella',
    locationName: 'Capranica Prenestina (RM)',
    region: 'Lazio',
    dates: '6 Dicembre 2026',
    dateBadge: '6 dic',
    startDate: '2026-12-06',
    endDate: '2026-12-06',
    month: 12,
    season: 'inverno',
    lat: 41.8622,
    lng: 12.9539,
    description: 'Celebrazione della Mosciarella, la pregiata castagna essiccata nei caratteristici casitti in pietra dei Monti Prenestini.',
    specialties: ['Zuppa di Mosciarelle e Ceci', 'Polenta con Spuntature', 'Dolci di Castagne'],
    camperParking: 'Parcheggio camper comunale all\'ingresso di Capranica Prenestina.',
    imageUrl: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=900&q=80',
    section: 'natale',
  },
];

export const ITALIA_SAGRE_ARCHIVE: SagraEvent[] = CONFIRMED_ITALIA_SAGRE_ARCHIVE.filter(
  (s) => !isSagraExpired(s)
);
export const EXTRA_TROVASAGRE_LIVE_EVENTS: SagraEvent[] = ITALIA_SAGRE_ARCHIVE;
export const CURRENT_NOV_SAGRE: SagraEvent[] = ITALIA_SAGRE_ARCHIVE;

const LIVE_SAGRE_STORAGE_KEY = 'viacamper_live_sagre_v5_confirmed';
const DELETED_SAGRE_IDS_KEY = 'viacamper_deleted_sagre_ids_v1';
const LEGACY_KEYS = [
  'viacamper_live_sagre_v2_flyers',
  'viacamper_live_sagre_v3_dynamic',
  'viacamper_live_sagre_v4_legal',
];

function getDeletedSagreIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_SAGRE_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function addDeletedSagraId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const set = getDeletedSagreIds();
    set.add(id);
    localStorage.setItem(DELETED_SAGRE_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

function sanitizeSagraItem(item: SagraEvent): SagraEvent {
  // Keep data:image/... base64 flyers untouched!
  const isDataUri = Boolean(item.imageUrl && item.imageUrl.startsWith('data:image/'));
  const cleanUrl = isDataUri
    ? item.imageUrl
    : normalizeSagraFlyerUrl(item.imageUrl, `${item.title} ${item.categoryLabel}`);
  return {
    ...item,
    imageUrl: cleanUrl,
    fullFlyerUrl: item.fullFlyerUrl && item.fullFlyerUrl.startsWith('data:image/')
      ? item.fullFlyerUrl
      : cleanUrl,
    extraPhotos: Array.isArray(item.extraPhotos) ? item.extraPhotos.filter(Boolean) : [],
    sourceUrl: item.sourceUrl && item.sourceUrl.includes('trovasagre.com') ? undefined : item.sourceUrl,
  };
}

export function loadLiveSagre(): SagraEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    for (const k of LEGACY_KEYS) {
      localStorage.removeItem(k);
    }
    const deletedIds = getDeletedSagreIds();
    const raw = localStorage.getItem(LIVE_SAGRE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed
      .map(sanitizeSagraItem)
      .filter((item) => !isSagraExpired(item) && !deletedIds.has(item.id) && item.status !== 'pending');
    if (valid.length !== parsed.length) {
      try {
        localStorage.setItem(LIVE_SAGRE_STORAGE_KEY, JSON.stringify(valid));
      } catch {
        // ignore storage quota errors
      }
    }
    return valid;
  } catch {
    return [];
  }
}

export function saveLiveSagre(newItems: SagraEvent[]): SagraEvent[] {
  const deletedIds = getDeletedSagreIds();
  const existing = loadLiveSagre();
  const map = new Map<string, SagraEvent>();
  newItems
    .filter((item) => !isSagraExpired(item) && !deletedIds.has(item.id) && item.status !== 'pending')
    .forEach((item) => map.set(item.id, sanitizeSagraItem(item)));
  existing
    .filter((item) => !isSagraExpired(item) && !deletedIds.has(item.id) && item.status !== 'pending')
    .forEach((item) => {
      if (!map.has(item.id)) {
        map.set(item.id, sanitizeSagraItem(item));
      }
    });
  const merged = Array.from(map.values());
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LIVE_SAGRE_STORAGE_KEY, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent('sagre-updated', { detail: { count: merged.length } }));
    } catch {
      // ignore storage quota errors
    }
  }
  return merged;
}

export function getAllSagreEvents(): SagraEvent[] {
  const deletedIds = getDeletedSagreIds();
  const live = loadLiveSagre();
  const map = new Map<string, SagraEvent>();
  live
    .filter((s) => !isSagraExpired(s) && !deletedIds.has(s.id) && s.status !== 'pending')
    .forEach((s) => map.set(s.id, sanitizeSagraItem(s)));
  CONFIRMED_ITALIA_SAGRE_ARCHIVE
    .filter((s) => !isSagraExpired(s) && !deletedIds.has(s.id))
    .forEach((s) => {
      if (!map.has(s.id)) {
        map.set(s.id, sanitizeSagraItem(s));
      }
    });
  return Array.from(map.values());
}

/**
 * Syncs custom sagre and flyers from Firebase Firestore (`sagre_events` collection).
 * Automatically deletes any expired sagre from Firestore so the database stays clean.
 * Returns `{ approved, pending }`.
 */
export async function syncSagreFromFirestore(): Promise<{
  approved: SagraEvent[];
  pending: SagraEvent[];
}> {
  try {
    const colRef = collection(db, 'sagre_events');
    const snap = await getDocs(colRef);
    const approved: SagraEvent[] = [];
    const pending: SagraEvent[] = [];

    for (const d of snap.docs) {
      const data = d.data() as SagraEvent & { deleted?: boolean };
      if (!data || !data.title) continue;
      const item: SagraEvent = { ...data, id: data.id || d.id };

      if (data.deleted) {
        addDeletedSagraId(item.id);
        continue;
      }

      // Auto-purge expired sagre directly from Firestore
      if (isSagraExpired(item)) {
        deleteDoc(doc(db, 'sagre_events', d.id)).catch(() => {});
        continue;
      }

      if (item.status === 'pending') {
        pending.push(sanitizeSagraItem(item));
      } else {
        approved.push(sanitizeSagraItem({ ...item, status: 'approved' }));
      }
    }

    if (approved.length > 0) {
      saveLiveSagre(approved);
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sagre-updated'));
    }

    return { approved, pending };
  } catch {
    return { approved: [], pending: [] };
  }
}

/**
 * Saves a new or updated Sagra + Flyer to Firebase Firestore (`sagre_events`).
 * If `isAdmin` is true, `status` is `'approved'` and immediately visible to all users.
 * If submitted by a regular user, `status` is `'pending'` until approved by Admin.
 */
export async function saveSagraToFirestore(
  sagra: SagraEvent,
  isAdmin: boolean
): Promise<SagraEvent> {
  const finalStatus: 'approved' | 'pending' = isAdmin ? 'approved' : 'pending';
  const record: SagraEvent = {
    ...sagra,
    status: finalStatus,
    createdAt: sagra.createdAt || new Date().toISOString(),
  };

  await setDoc(doc(db, 'sagre_events', record.id), record, { merge: true });

  if (finalStatus === 'approved') {
    saveLiveSagre([record]);
  }
  return record;
}

/**
 * Approves a user-submitted pending sagra in Firestore so all users see it immediately.
 */
export async function approvePendingSagraInFirestore(sagra: SagraEvent): Promise<void> {
  const approvedRecord: SagraEvent = {
    ...sagra,
    status: 'approved',
  };
  await setDoc(doc(db, 'sagre_events', sagra.id), approvedRecord, { merge: true });
  saveLiveSagre([approvedRecord]);
}

/**
 * Deletes a sagra both locally and in Firebase Firestore.
 */
export async function deleteSagraEverywhere(sagraId: string): Promise<void> {
  addDeletedSagraId(sagraId);
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LIVE_SAGRE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((s: SagraEvent) => s.id !== sagraId);
          localStorage.setItem(LIVE_SAGRE_STORAGE_KEY, JSON.stringify(filtered));
        }
      }
      window.dispatchEvent(new CustomEvent('sagre-updated'));
    } catch {
      // ignore
    }
  }
  try {
    if (sagraId.startsWith('vc_')) {
      // Mark built-in archive ID as deleted in Firestore so all devices hide it too
      await setDoc(doc(db, 'sagre_events', sagraId), { id: sagraId, deleted: true }, { merge: true });
    } else {
      await deleteDoc(doc(db, 'sagre_events', sagraId));
    }
  } catch {
    // ignore
  }
}

/**
 * Fetches ONLY confirmed live sagre via `/api/sagre-live` (Google Search Grounding) + Firestore.
 * Never invents or rolls dates forward.
 */
export async function fetchLiveSagreUniversal(params: {
  location?: string;
  startDate?: string;
  endDate?: string;
  month?: number;
  season?: string;
  userLat?: number;
  userLng?: number;
  fetchAllItaly?: boolean;
}): Promise<SagraEvent[]> {
  const loc = (params.location || 'Italia').trim();
  const sDate = (params.startDate || '').trim();
  const eDate = (params.endDate || '').trim();
  const month = Number(params.month) || 0;
  const season = (params.season || '').trim();
  const uLat = typeof params.userLat === 'number' ? params.userLat : 41.72;
  const uLng = typeof params.userLng === 'number' ? params.userLng : 12.65;
  const fetchAllItaly = Boolean(params.fetchAllItaly);

  // 1. Always sync custom/admin sagre from Firestore first
  const { approved: firestoreApproved } = await syncSagreFromFirestore();

  // 2. Query confirmed web sagre via backend Google Search Grounding
  try {
    const res = await fetch(resolveApiUrl('/api/sagre-live'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: loc,
        startDate: sDate,
        endDate: eDate,
        month,
        season,
        lat: uLat,
        lng: uLng,
        fetchAllItaly,
      }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (Array.isArray(data.sagre) && data.sagre.length > 0) {
        const valid = data.sagre.map(sanitizeSagraItem).filter((s: SagraEvent) => !isSagraExpired(s));
        if (valid.length > 0) {
          saveLiveSagre([...firestoreApproved, ...valid]);
          return [...firestoreApproved, ...valid];
        }
      }
    }
  } catch {
    // Fall through
  }

  return firestoreApproved;
}

export function sagraToPlace(s: SagraEvent): Place {
  return {
    id: s.id,
    name: s.title,
    category: 'sagra' as PlaceCategory,
    lat: Number(s.lat),
    lng: Number(s.lng),
    address: s.locationName,
    description: `📅 ${s.dates}\n\n${s.description}\n\n🍽️ Specialità: ${(s.specialties || []).join(', ')}\n🏕️ Sosta Camper: ${s.camperParking}`,
    rating: 9.8,
    reviews: [],
    priceInfo: s.dates,
    priceEuro: 0,
    facilities: ['Sosta Camper', ...(s.specialties || []).slice(0, 3)],
    imageUrl: s.imageUrl,
    verified: true,
    feeStatus: 'free',
    phone: '',
    source: 'Eventi Ufficiali',
    categoryLabel: `${s.categoryLabel} (${s.dateBadge})`,
    eventStartDate: s.startDate,
    eventEndDate: s.endDate,
    eventDateBadge: s.dateBadge,
    eventSeason: s.season,
    eventMonth: s.month,
    eventSpecialties: s.specialties,
    eventExtraPhotos: s.extraPhotos,
  };
}

export function getAllSagrePlaces(): Place[] {
  return getAllSagreEvents().map(sagraToPlace);
}

export const SAGRE_PLACES: Place[] = getAllSagreEvents().map(sagraToPlace);

export interface SagraFilterCriteria {
  periodMode: 'all' | 'weekend' | 'autunno' | 'natale' | 'primavera' | 'estate' | 'custom';
  selectedMonth?: number; // 0 = all, 1..12
  startDate?: string;     // YYYY-MM-DD
  endDate?: string;       // YYYY-MM-DD
}

export function doesSagraMatchDateFilter(
  item: {
    startDate?: string;
    endDate?: string;
    month?: number;
    season?: string;
    category?: string;
    section?: string;
  },
  filter: SagraFilterCriteria
): boolean {
  if (isSagraExpired(item)) {
    return false;
  }

  if (filter.selectedMonth && filter.selectedMonth > 0) {
    const itemMonth = item.month || (item.startDate ? parseInt(item.startDate.split('-')[1], 10) : 0);
    const endMonth = item.endDate ? parseInt(item.endDate.split('-')[1], 10) : itemMonth;
    if (itemMonth !== filter.selectedMonth && endMonth !== filter.selectedMonth) {
      return false;
    }
  }

  if (filter.startDate || filter.endDate) {
    const iStart = item.startDate || '';
    const iEnd = item.endDate || iStart;
    if (!iStart) return true;

    const fStart = filter.startDate || '2020-01-01';
    const fEnd = filter.endDate || '2035-12-31';

    return iStart <= fEnd && iEnd >= fStart;
  }

  switch (filter.periodMode) {
    case 'all':
    case 'custom':
      return true;
    case 'weekend':
      return item.section === 'weekend' || item.section === 'vicino' || Boolean(item.startDate);
    case 'autunno':
      return item.season === 'autunno' || item.month === 10 || item.month === 11;
    case 'natale':
      return item.category === 'natale' || item.season === 'inverno' || item.month === 12 || item.month === 1;
    case 'primavera':
      return item.season === 'primavera' || item.month === 3 || item.month === 4 || item.month === 5;
    case 'estate':
      return item.season === 'estate' || item.month === 6 || item.month === 7 || item.month === 8 || item.month === 9;
    default:
      return true;
  }
}
