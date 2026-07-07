/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Place, CommunityMessage, VehicleDimensions, Deadline, ChecklistItem } from '../types';
import { FRANCE_RAW_PLACES } from './francePlaces';
import { ITALIA_RAW_PLACES } from './italiaPlaces';

export const INITIAL_VEHICLE_DIMENSIONS: VehicleDimensions = {
  modelName: 'Fiat Ducato SunLight T67',
  height: 2.95,  // meters
  width: 2.32,   // meters
  weight: 3.5,   // metric tons
  length: 6.96   // meters
};

const HANDCRAFTED_PLACES: Place[] = [
  {
    id: 'p1',
    name: 'Area Sosta Camper Tempesta - Lago di Garda',
    category: 'area_sosta',
    lat: 45.864,
    lng: 10.869,
    address: 'Via Gardesana 22, Torbole sul Garda (TN)',
    priceInfo: '18€ / 24 ore',
    priceEuro: 18,
    rating: 4.6,
    facilities: ['Carico acqua', 'Scarico reflui', 'Elettricità 220V', 'Animali ammessi', 'Raccolta differenziata'],
    imageUrl: 'https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600',
    source: 'inserito_a_mano',
    phone: '+39 0464 505111',
    hasMaxHeightLimit: false,
    hasMaxWeightLimit: false,
    isNarrowAccess: false,
    reviews: [
      {
        id: 'r1_1',
        user: 'Marco & Silvia',
        date: '2026-06-12',
        rating: 5,
        comment: 'Ottima area sosta proprio in riva al lago! Wifi gratuito ben funzionante. Piazzole in piano su ghiaia. Consigliatissima per gli amanti del windsurf.',
        priceUpdated: '18€ / 24 ore',
        vehicleType: 'Semintegrale'
      },
      {
        id: 'r1_2',
        user: 'CamperVagabond',
        date: '2026-06-08',
        rating: 4,
        comment: 'Molto pulita e tranquilla. Luce compresa nel prezzo. Un po\' distante dal centro di Torbole a piedi, ma c\'è una comodissima pista ciclabile adiacente.',
        priceUpdated: '18€ / 24 ore',
        vehicleType: 'Van / Camper puro'
      }
    ]
  },
  {
    id: 'p2',
    name: 'Camping Dolomiti Wellness & Spa',
    category: 'campeggio',
    lat: 46.541,
    lng: 12.131,
    address: 'Località Campo, Cortina d\'Ampezzo (BL)',
    priceInfo: '34€ / notte',
    priceEuro: 34,
    rating: 4.8,
    facilities: ['Carico acqua', 'Scarico reflui', 'Elettricità 220V', 'Bagni riscaldati', 'Aria condizionata', 'Piscina', 'Wi-Fi gratuito'],
    imageUrl: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=600',
    source: 'inserito_a_mano',
    phone: '+39 0436 863222',
    hasMaxHeightLimit: false,
    hasMaxWeightLimit: false,
    isNarrowAccess: true, // Narrow alpine approach
    reviews: [
      {
        id: 'r2_1',
        user: 'Luigi_82',
        date: '2026-06-14',
        rating: 5,
        comment: 'Spettacolare! Vista mozzafiato sulle Tofane. Bagni che sembrano un hotel a 5 stelle con pavimenti riscaldati d\'inverno. Struttura superba.',
        priceUpdated: '34€ / notte + tassa soggiorno',
        vehicleType: 'Motorhome'
      }
    ]
  },
  {
    id: 'p3',
    name: 'Camper Service Autostrada del Sole - Orvieto',
    category: 'camper_service',
    lat: 42.721,
    lng: 12.129,
    address: 'Area Servizio Tevere Est, S.R. 205, Orvieto (TR)',
    priceInfo: 'Gratuito',
    priceEuro: 0,
    rating: 3.8,
    facilities: ['Carico acqua', 'Scarico reflui', 'Illuminazione notturna'],
    imageUrl: 'https://images.unsplash.com/photo-1596524430615-b46475ddff6e?auto=format&fit=crop&q=80&w=600',
    source: 'inserito_a_mano',
    hasMaxHeightLimit: false,
    hasMaxWeightLimit: false,
    isNarrowAccess: false,
    reviews: [
      {
        id: 'r3_1',
        user: 'GirovagoCamper',
        date: '2026-05-20',
        rating: 4,
        comment: 'Servizio di carico e scarico gratuito e perfettamente funzionante. Griglia comoda anche per grandi camper mansardati. Grazie Autostrade.',
        priceUpdated: 'Gratuito',
        vehicleType: 'Mansardato'
      }
    ]
  },
  {
    id: 'p4',
    name: 'Area Sosta Sotto il Ponte Vecchio - Valle D\'Aosta',
    category: 'area_sosta',
    lat: 45.738,
    lng: 7.319,
    address: 'Via Ponte Romano 12, Saint-Vincent (AO)',
    priceInfo: '15€ / notte',
    priceEuro: 15,
    rating: 4.1,
    facilities: ['Carico acqua', 'Scarico reflui', 'Elettricità 220V', 'Ricarica bombole'],
    imageUrl: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&q=80&w=600',
    source: 'inserito_a_mano',
    phone: '+39 0166 513322',
    hasMaxHeightLimit: true,
    maxHeight: 3.10, // Max 3.1m bridge overhead on entry road! Perfect constraint alert!
    hasMaxWeightLimit: true,
    maxWeight: 4.0, // Limits heavyweight trucks
    isNarrowAccess: true,
    reviews: [
      {
        id: 'r4_1',
        user: 'TechCamper',
        date: '2026-06-01',
        rating: 4,
        comment: 'ATTENZIONE: Ponte d\'ingresso molto basso! C\'è scritto 3.10m. Col mio mansardato da 3.05m sono passato al pelo ma col cuore in gola. Area tranquilla ed economica.',
        priceUpdated: '15€ / notte',
        vehicleType: 'Mansardato'
      }
    ]
  },
  {
    id: 'p5',
    name: 'Camping Village Mare Azzurro - Toscana',
    category: 'campeggio',
    lat: 42.791,
    lng: 10.885,
    address: 'Viale dei Pini 140, Castiglione della Pescaia (GR)',
    priceInfo: '29€ / notte',
    priceEuro: 29,
    rating: 4.5,
    facilities: ['Carico acqua', 'Scarico reflui', 'Elettricità 220V', 'Bagni riscaldati', 'Animali ammessi', 'Piscina', 'Ristorante', 'Spiaggia privata'],
    imageUrl: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=600',
    source: 'inserito_a_mano',
    phone: '+39 0564 922111',
    hasMaxHeightLimit: false,
    hasMaxWeightLimit: false,
    isNarrowAccess: false,
    reviews: [
      {
        id: 'r5_1',
        user: 'Chiara_Loves_Camping',
        date: '2026-06-11',
        rating: 5,
        comment: 'Posizionato in una pineta bellissima, all\'ombra naturale! Piazzole molto spaziose. Accesso diretto alla spiaggia di sabbia fine. Personale super gentile.',
        priceUpdated: '29€ piazzola standard + camper',
        vehicleType: 'Semintegrale'
      }
    ]
  },
  {
    id: 'p6',
    name: 'Parcheggio e Camper Stop Alberobello Trulli',
    category: 'area_sosta',
    lat: 40.781,
    lng: 17.241,
    address: 'Via Don Francesco Gigante 2, Alberobello (BA)',
    priceInfo: '20€ / 24h',
    priceEuro: 20,
    rating: 4.2,
    facilities: ['Carico acqua', 'Scarico reflui', 'Elettricità 220V', 'Bagni riscaldati'],
    imageUrl: 'https://images.unsplash.com/photo-1568285634123-0130f146a47a?auto=format&fit=crop&q=80&w=600',
    source: 'inserito_a_mano',
    phone: '+39 080 4321211',
    hasMaxHeightLimit: false,
    hasMaxWeightLimit: true,
    maxWeight: 3.5, // 3.5t dynamic limit
    isNarrowAccess: true, // Typical narrow Apulian historic drystone wall roads on maps
    reviews: [
      {
        id: 'r6_1',
        user: 'PugliaOnTheRoad',
        date: '2026-06-10',
        rating: 4,
        comment: 'Comodissimo per visitare i Trulli a piedi (5 minuti). Custodito giorno e notte. Strada d\'accesso leggermente stretta se si incrocia un altro camper grande. Complessivamente ottima pulizia.',
        priceUpdated: '20€ tutto compreso',
        vehicleType: 'Van / Camper puro'
      }
    ]
  }
];

// Helper function to calculate distance in km using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Convert raw place [lng, lat, label] package to clean Place structure
function parseRawFrancePlace(index: number, lng: number, lat: number, rawLabel: string): Place {
  let clean = rawLabel.trim();
  
  // Clean custom place accents or short representations
  clean = clean
    .replace(/Penz/gi, 'Penzé')
    .replace(/Scar/gi, 'Scaër')
    .replace(/Guimac/gi, 'Guimaëc')
    .replace(/Langolan/gi, 'Langoëlan')
    .replace(/Vernet/gi, 'Vernet-les-Bains')
    .replace(/Taule Penz/gi, 'Taulé Penzé');
    
  const parts = clean.split(/\s+/);
  
  // Try to extract dynamic digital ID prefix
  let numericId = '';
  if (parts.length > 0 && /^\d+$/.test(parts[0])) {
    numericId = parts.shift() || '';
  }
  
  // Check special class categories suffix (AA = Area Attrezzata / Area Sosta, CS = Camper Service, PS = Punto Sosta)
  let catSuffix = '';
  if (parts.length > 0) {
    const last = parts[parts.length - 1];
    if (['PS', 'CS', 'AA'].includes(last)) {
      catSuffix = parts.pop() || '';
    }
  }
  
  // Remove region code
  if (parts.length > 0) {
    const last = parts[parts.length - 1];
    if (last.startsWith('FR-')) {
      parts.pop();
    }
  }
  
  const coreName = parts.slice(0).join(' ');
  
  let category: 'area_sosta' | 'camper_service' | 'campeggio' = 'area_sosta';
  let name = clean;
  let priceEuro = 0;
  let priceInfo = 'Gratuito';
  let facilities = ['Illuminazione notturna'];
  
  if (catSuffix === 'AA') {
    category = 'area_sosta';
    name = `Area Sosta ${coreName}`;
    priceEuro = 12;
    priceInfo = '12€ / 24h';
    facilities = ['Carico acqua', 'Scarico reflui', 'Elettricità 220V', 'Illuminazione notturna'];
  } else if (catSuffix === 'CS') {
    category = 'camper_service';
    name = `Camper Service ${coreName}`;
    priceEuro = 0;
    priceInfo = 'Gratuito';
    facilities = ['Carico acqua', 'Scarico reflui'];
  } else if (catSuffix === 'PS') {
    category = 'area_sosta';
    name = `Punto Sosta ${coreName}`;
    priceEuro = 0;
    priceInfo = 'Gratuito';
    facilities = ['Sosta camper autorizzata', 'Illuminazione notturna'];
  } else {
    name = coreName || clean;
  }
  
  // Seed lovely Unsplash layouts matching camper/nature vibes
  const imageCatalog = [
    'https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1568285634123-0130f146a47a?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=600'
  ];
  const hashVal = coreName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
  const hashIdx = Math.abs(hashVal) % imageCatalog.length;
  const imageUrl = imageCatalog[hashIdx];
  
  return {
    id: `fr_${numericId || index}`,
    name,
    category,
    lat,
    lng,
    address: `${coreName}, Francia`,
    priceInfo,
    priceEuro,
    rating: Number((4.0 + (hashIdx % 10) / 10).toFixed(1)),
    facilities,
    imageUrl,
    source: 'open_data_francia',
    reviews: []
  };
}

function parseRawItaliaPlace(index: number, lng: number, lat: number, rawLabel: string): Place {
  let clean = rawLabel.trim();
  const parts = clean.split(/\s+/);
  
  // Try to extract dynamic digital ID prefix
  let numericId = '';
  if (parts.length > 0 && /^\d+$/.test(parts[0])) {
    numericId = parts.shift() || '';
  }
  
  // Check special class categories suffix (AA = Area Attrezzata / Area Sosta, CS = Camper Service, PS = Punto Sosta)
  let catSuffix = '';
  if (parts.length > 0) {
    const last = parts[parts.length - 1];
    if (['PS', 'CS', 'AA'].includes(last)) {
      catSuffix = parts.pop() || '';
    }
  }
  
  // Remove region code (IT-X)
  if (parts.length > 0) {
    const last = parts[parts.length - 1];
    if (last.startsWith('IT-')) {
      parts.pop();
    }
  }
  
  const coreName = parts.slice(0).join(' ');
  
  let category: 'area_sosta' | 'camper_service' | 'campeggio' = 'area_sosta';
  let name = clean;
  let priceEuro = 0;
  let priceInfo = 'Gratuito';
  let facilities = ['Illuminazione notturna'];
  
  if (catSuffix === 'AA') {
    category = 'area_sosta';
    name = `Area Sosta ${coreName}`;
    priceEuro = 14;
    priceInfo = '14€ / 24h';
    facilities = ['Carico acqua', 'Scarico reflui', 'Elettricità 220V', 'Illuminazione notturna'];
  } else if (catSuffix === 'CS') {
    category = 'camper_service';
    name = `Camper Service ${coreName}`;
    priceEuro = 0;
    priceInfo = 'Gratuito';
    facilities = ['Carico acqua', 'Scarico reflui'];
  } else if (catSuffix === 'PS') {
    category = 'area_sosta';
    name = `Punto Sosta ${coreName}`;
    priceEuro = 0;
    priceInfo = 'Gratuito';
    facilities = ['Sosta camper autorizzata', 'Illuminazione notturna'];
  } else {
    name = coreName || clean;
  }
  
  // Unsplash layouts matching camper/nature vibes
  const imageCatalog = [
    'https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1568285634123-0130f146a47a?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=600'
  ];
  const hashVal = coreName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
  const hashIdx = Math.abs(hashVal) % imageCatalog.length;
  const imageUrl = imageCatalog[hashIdx];
  
  return {
    id: `it_${numericId || index}`,
    name,
    category,
    lat,
    lng,
    address: `${coreName}, Italia`,
    priceInfo,
    priceEuro,
    rating: Number((4.1 + (hashIdx % 10) / 10).toFixed(1)),
    facilities,
    imageUrl,
    source: 'open_data_italia',
    reviews: []
  };
}

function processAllPlaces(): Place[] {
  const resultList: Place[] = [...HANDCRAFTED_PLACES];
  
  // 1. Process France Raw Places
  FRANCE_RAW_PLACES.forEach(([lng, lat, rawLabel], index) => {
    const freshPlace = parseRawFrancePlace(index, lng, lat, rawLabel);
    
    // Check if there is already a duplicate within our chosen 1.5km proximity limit in our parsed list
    let duplicateIndex = -1;
    for (let i = 0; i < resultList.length; i++) {
      const dist = calculateDistance(resultList[i].lat, resultList[i].lng, freshPlace.lat, freshPlace.lng);
      if (dist < 1.5) {
        duplicateIndex = i;
        break;
      }
    }
    
    if (duplicateIndex !== -1) {
      // Duplicate found! We merge the data
      const existing = resultList[duplicateIndex];
      
      const cleanFreshName = freshPlace.name.replace(/Area Sosta |Camper Service |Punto Sosta /g, '').trim();
      if (!existing.name.includes(cleanFreshName) && existing.name !== freshPlace.name) {
        existing.name = `${existing.name} & ${cleanFreshName}`;
      }
      
      // Combine facilities list uniquely
      const combinedFacilities = new Set([...existing.facilities, ...freshPlace.facilities]);
      existing.facilities = Array.from(combinedFacilities);
      
      // Upgrade category if fresh is higher utility
      if (freshPlace.category === 'area_sosta' && existing.category === 'camper_service') {
        existing.category = 'area_sosta';
        existing.priceInfo = freshPlace.priceInfo;
        existing.priceEuro = freshPlace.priceEuro;
      }
    } else {
      resultList.push(freshPlace);
    }
  });

  // 2. Process Italia Raw Places
  ITALIA_RAW_PLACES.forEach(([lng, lat, rawLabel], index) => {
    const freshPlace = parseRawItaliaPlace(index, lng, lat, rawLabel);
    
    // Check if there is already a duplicate within our chosen 1.5km proximity limit in our parsed list
    let duplicateIndex = -1;
    for (let i = 0; i < resultList.length; i++) {
      const dist = calculateDistance(resultList[i].lat, resultList[i].lng, freshPlace.lat, freshPlace.lng);
      if (dist < 1.5) {
        duplicateIndex = i;
        break;
      }
    }
    
    if (duplicateIndex !== -1) {
      // Duplicate found! We merge the data
      const existing = resultList[duplicateIndex];
      
      const cleanFreshName = freshPlace.name.replace(/Area Sosta |Camper Service |Punto Sosta /g, '').trim();
      if (!existing.name.includes(cleanFreshName) && existing.name !== freshPlace.name) {
        existing.name = `${existing.name} & ${cleanFreshName}`;
      }
      
      // Combine facilities list uniquely
      const combinedFacilities = new Set([...existing.facilities, ...freshPlace.facilities]);
      existing.facilities = Array.from(combinedFacilities);
      
      // Upgrade category if fresh is higher utility
      if (freshPlace.category === 'area_sosta' && existing.category === 'camper_service') {
        existing.category = 'area_sosta';
        existing.priceInfo = freshPlace.priceInfo;
        existing.priceEuro = freshPlace.priceEuro;
      }
    } else {
      resultList.push(freshPlace);
    }
  });
  
  return resultList;
}

export const INITIAL_PLACES: Place[] = HANDCRAFTED_PLACES;

export const INITIAL_COMMUNITY_MESSAGES: CommunityMessage[] = [
  {
    id: 'm1',
    user: 'Sistema',
    avatar: 'S',
    avatarColor: 'bg-emerald-500',
    text: 'ESEMPIO: Ciao a tutti! Sono appena arrivato all\'Area Sosta del Lago di Garda. La vista è splendida, ma c\'è un po\' di vento.',
    timestamp: new Date().toISOString(),
    likes: 2,
    likedByCurrentUser: false,
    tag: 'Meteo',
    replies: [
      {
        id: 'mr1',
        user: 'CamperistaVagabondo',
        text: 'ESEMPIO: Benvenuto! Spero che il vento si plachi presto per farti godere la vacanza!',
        timestamp: new Date().toISOString()
      }
    ]
  },
  {
    id: 'm2',
    user: 'GiuliaVanLife',
    avatar: 'GV',
    avatarColor: 'bg-violet-500',
    text: 'ESEMPIO: Qualcuno conosce un buon campeggio aperto in questa stagione sulle Dolomiti? Grazie in anticipo!',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    likes: 0,
    likedByCurrentUser: false,
    tag: 'Sosta',
    replies: []
  }
];

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  // Partenza
  { id: 'c1', text: 'Chiudere tutte le finestre e l\'oblò del tetto', category: 'Partenza', checked: true },
  { id: 'c2', text: 'Ritirare il gradino d\'ingresso elettrico/manuale', category: 'Partenza', checked: true },
  { id: 'c3', text: 'Spegnere la pompa dell\'acqua interna', category: 'Partenza', checked: false },
  { id: 'c4', text: 'Commutare il frigorifero su modalità 12V (in viaggio)', category: 'Partenza', checked: false },
  { id: 'c5', text: 'Chiudere la serranda del serbatoio delle acque grigie', category: 'Partenza', checked: false },
  { id: 'c6', text: 'Chiudere la valvola della bombola del gas principale', category: 'Partenza', checked: true },
  { id: 'c7', text: 'Bloccare tutte le antine degli armadietti e cassetti', category: 'Partenza', checked: true },
  { id: 'c8', text: 'Fissare o riporre in sicurezza oggetti sui ripiani', category: 'Partenza', checked: false },
  
  // Sosta
  { id: 'c9', text: 'Posizionare i cunei di livellamento sotto le ruote', category: 'Sosta', checked: false },
  { id: 'c10', text: 'Collegare il cavo elettrico 220V alla colonnina', category: 'Sosta', checked: false },
  { id: 'c11', text: 'Aprire la bombola del gas e accendere frigo a gas', category: 'Sosta', checked: false },
  { id: 'c12', text: 'Livellare il camper con i piedini stabilizzatori (se presenti)', category: 'Sosta', checked: false },

  // Sicurezza
  { id: 'c13', text: 'Verificare pressione degli pneumatici (incluso ruota scorta)', category: 'Sicurezza', checked: true },
  { id: 'c14', text: 'Controllare data di scadenza della bombola gas e tubi flessibili', category: 'Sicurezza', checked: true },
  { id: 'c15', text: 'Verificare funzionamento del rilevatore di fumo e gas nocivi (TrioGas)', category: 'Sicurezza', checked: true },
  { id: 'c16', text: 'Controllare estintore a bordo (pressione in zona verde)', category: 'Sicurezza', checked: true },
  { id: 'c17', text: 'Rifornire cassetta di pronto soccorso', category: 'Sicurezza', checked: false }
];

export const INITIAL_DEADLINES: Deadline[] = [
  {
    id: 'd1',
    title: 'Revisione Ministeriale Obbligatoria (M.C.T.C.)',
    category: 'Revisione',
    dueDate: '2026-10-15', // a few months in future
    done: false,
    notes: 'Da effettuare presso centro autorizzato. Obbligatoria ogni 2 anni per camper entro 3.5t.',
    price: 80
  },
  {
    id: 'd2',
    title: 'Rinnovo Assicurazione RCA + Assistenza Stradale Camper',
    category: 'Assicurazione',
    dueDate: '2026-07-31', // very close!
    done: false,
    notes: 'Ricontrollare se l\'assistenza copre il traino stradale per mezzi sopra i 6.5 metri e pesanti!',
    price: 380
  },
  {
    id: 'd3',
    title: 'Controllo Infiltrazioni e Sigillature Pareti',
    category: 'Manutenzione',
    dueDate: '2026-09-01', // Standard update
    done: false,
    notes: 'Annuale, fondamentale per mantenere la garanzia e prevenire infiltrazioni.',
    price: 120
  },
  {
    id: 'd4',
    title: 'Sostituzione Filtri e Tagliando Motore Fiat Ducato',
    category: 'Manutenzione',
    dueDate: '2026-05-10', // Past deadline! Show orange/red alert!
    done: true,
    notes: 'Cambio olio Selenia, filtro aria, filtro gasolio effettuato a 48,500 km.',
    price: 250
  },
  {
    id: 'd5',
    title: 'Pagamento Tassa Automobilistica (Bollo)',
    category: 'Bollo',
    dueDate: '2026-08-31',
    done: false,
    notes: 'Tassa regionale camper.',
    price: 45
  },
  {
    id: 'd6',
    title: 'Sostituzione Scadenza Tubo Gas Gomma Gialla',
    category: 'Bombole Gas',
    dueDate: '2026-06-30', // Very soon!
    done: false,
    notes: 'Tubo flessibile arancione/giallo scade dopo 5 anni. Fondamentale per la sicurezza a bordo.',
    price: 15
  }
];
