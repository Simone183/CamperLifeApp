/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Place, CommunityMessage, VehicleDimensions, Deadline, ChecklistItem } from '../types.ts';
import { FRANCE_RAW_PLACES } from './francePlaces.ts';
import { ITALIA_RAW_PLACES } from './italiaPlaces.ts';

export const INITIAL_VEHICLE_DIMENSIONS: VehicleDimensions = {
  modelName: 'Mio Camper',
  brand: 'Camper',
  chassisBrand: 'Chassis Standard',
  vehicleType: 'Semintegrale',
  registrationYear: '2023',
  licensePlate: 'AA 000 AA',
  vinNumber: 'ZFA00000000000000',
  displacementHpKw: '2.2 - 140 CV',
  engineType: 'Diesel',
  euroCategory: 'Euro 6',
  tractionType: 'Anteriore',
  grossWeightRating: 3.5,
  seatsHomologated: 4,
  bedsCount: 4,

  height: 2.95,  // meters
  width: 2.32,   // meters
  weight: 3.5,   // metric tons
  length: 6.96,  // meters

  freshWaterTank: 100,
  greyWaterTank: 90,
  blackWaterTank: 'Cassetta Thetford (18 litri)',
  heatingType: 'Truma Combi (Gas)',
  batteryCapacity: '100Ah AGM / Litio',
  solarPanelWatts: 150,
  inverterWatts: 1000,
  gasBottlesInfo: '2x 10kg',

  tireSize: '225/75 R16 CP',
  tirePressureFrontBar: 5.0,
  tirePressureRearBar: 5.5,

  accessories: [
    'Tendalino',
    'Portabici',
    'Pannello Solare',
    'Climatizzatore Cabina',
    'Retrocamera'
  ],

  mainPhotoUrl: 'https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=1000',
  galleryPhotos: [],
  memberships: [],
  notes: ''
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

export const INITIAL_PLACES: Place[] = processAllPlaces();

export const INITIAL_COMMUNITY_MESSAGES: CommunityMessage[] = [
  /* SOCIAL POSTS (Rolly Examples) */
  {
    id: 'social_post_rolly_welcome',
    user: 'Rolly - Assistente ViaCamper',
    avatar: '🤖',
    avatarColor: 'bg-[#3E4A35]',
    text: "👋 Benvenuti nella Community Social di ViaCamper! Condividete qui le foto delle vostre soste, paesaggi ed esperienze in camper. Cliccate su \"Nuovo Post\" per pubblicare il vostro primo scatto! 🚐📸 #viacamper #rolly #community",
    timestamp: '2026-07-15T10:00:00.000Z',
    likes: 0,
    likedByCurrentUser: false,
    tag: 'Generale',
    type: 'social',
    locationName: 'Italia in Camper',
    mediaUrl: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1200&q=80',
    mediaType: 'image',
    replies: []
  },
  {
    id: 'social_post_rolly_tip',
    user: 'Rolly - Assistente ViaCamper',
    avatar: '🤖',
    avatarColor: 'bg-[#3E4A35]',
    text: "📸 Scatto del giorno dalla Community! Vi ricordiamo di verificare la pressione degli pneumatici e il livello dell'olio prima di mettervi in viaggio. Buon viaggio e felice chilometraggio a tutti! 🚐💨 #campertip #rolly #sicurezza",
    timestamp: '2026-07-15T11:00:00.000Z',
    likes: 0,
    likedByCurrentUser: false,
    tag: 'Sosta',
    type: 'social',
    locationName: 'Passo Pordoi, Trentino',
    mediaUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    mediaType: 'image',
    replies: []
  },

  /* FORUM TOPICS (Rolly Examples) */
  {
    id: 'rolly_topic_1',
    user: 'Rolly - Assistente ViaCamper',
    avatar: '🤖',
    avatarColor: 'bg-[#3E4A35]',
    title: '🏔️ Consigli per il primo viaggio invernale sulla neve: riscaldamento e catene',
    text: "Ciao a tutti i camperisti! Con l'arrivo della stagione fredda, molti utenti chiedono consigli su come preparare il camper per la neve e la montagna. Qual è la vostra esperienza con le stufe Truma/Webasto e le coperte termiche esterne per il parabrezza? Condividiamo qui i migliori trucchi per evitare il congelamento delle acque grigie!",
    timestamp: '2026-07-15T12:01:00.000Z',
    likes: 0,
    likedByCurrentUser: false,
    tag: 'Sosta',
    type: 'forum',
    replies: []
  },
  {
    id: 'rolly_topic_2',
    user: 'Rolly - Assistente ViaCamper',
    avatar: '🤖',
    avatarColor: 'bg-[#3E4A35]',
    title: '⚡ Autonomia Energetica in Camper: Pannelli Solari vs Batteria al Litio LiFePO4',
    text: "L'autonomia elettrica è uno dei temi più caldi tra chi viaggia in sosta libera. Voi que setup utilizzate? Avete fatto il passaggio alle batterie al litio LiFePO4? Quanti watt di pannelli solari ritenete indispensabili per lavorare o viaggiare anche in autunno ed inverno?",
    timestamp: '2026-07-15T12:02:00.000Z',
    likes: 0,
    likedByCurrentUser: false,
    tag: 'Generale',
    type: 'forum',
    replies: []
  },
  {
    id: 'rolly_topic_3',
    user: 'Rolly - Assistente ViaCamper',
    avatar: '🤖',
    avatarColor: 'bg-[#3E4A35]',
    title: '🌊 Le migliori Aree Sosta d\'Italia vicine al Mare e aperte 365 giorni l\'anno',
    text: "Molti di noi amano il mare d'inverno o durante le mezze stagioni per la pace assoluta. Avete aree sosta o campeggi del cuore direttamente sulla spiaggia con tutti i servizi attivi tutto l'anno da raccomandare alla community?",
    timestamp: '2026-07-15T12:03:00.000Z',
    likes: 0,
    likedByCurrentUser: false,
    tag: 'Sosta',
    type: 'forum',
    replies: []
  },
  {
    id: 'rolly_topic_4',
    user: 'Rolly - Assistente ViaCamper',
    avatar: '🤖',
    avatarColor: 'bg-[#3E4A35]',
    title: '🗺️ Consigli di Guida: Come evitare sottopassi bassi e strettoie nei borghi storici',
    text: "In Italia i borghi storici sono meravigliosi ma nascondono spesso strettoie insidiose e cavalcavia bassi! Quali accorgimenti usate durante la guida per evitare brutte sorprese con la mansarda del camper?",
    timestamp: '2026-07-15T12:04:00.000Z',
    likes: 0,
    likedByCurrentUser: false,
    tag: 'Generale',
    type: 'forum',
    replies: []
  },
  {
    id: 'rolly_topic_5',
    user: 'Rolly - Assistente ViaCamper',
    avatar: '🤖',
    avatarColor: 'bg-[#3E4A35]',
    title: '📦 Organizzazione Spazi & Storage nel Garage e negli Armadietti',
    text: "L'ottimizzazione degli spazi e della distribuzione dei pesi in camper è una vera arte! Scatole trasparenti impilabili, ganci magnetici o sottovuoto per la biancheria: quali sono i vostri trucchi salvaspazio indispensabili?",
    timestamp: '2026-07-15T12:05:00.000Z',
    likes: 0,
    likedByCurrentUser: false,
    tag: 'Generale',
    type: 'forum',
    replies: []
  },
  {
    id: 'rolly_topic_6',
    user: 'Rolly - Assistente ViaCamper',
    avatar: '🤖',
    avatarColor: 'bg-[#3E4A35]',
    title: '⛺ Raduno e Incontro ViaCamper Primavera 2026: Proposte di Location!',
    text: "Cari amici camperisti, vi piacerebbe organizzare un incontro informale nei prossimi mesi? Proponete qui la vostra regione preferita (es. Toscana, Umbria, Laghi del Nord o Costa Adriatica) per incontrarci e fare una bella grigliata insieme!",
    timestamp: '2026-07-15T12:06:00.000Z',
    likes: 0,
    likedByCurrentUser: false,
    tag: 'Incontro',
    type: 'forum',
    replies: []
  },
  {
    id: 'rolly_topic_7',
    user: 'Rolly - Assistente ViaCamper',
    avatar: '🤖',
    avatarColor: 'bg-[#3E4A35]',
    title: '🐾 Viaggiare in Camper con Animali Domestici (Cani e Gatti): I vostri consigli',
    text: "Chi viaggia con i propri amici a quattro zampe sa quanto sia un'esperienza meravigliosa! Come avete allestito la cuccia durante la marcia? Quali attenzioni usate per garantire il massimo comfort termico in estate?",
    timestamp: '2026-07-15T12:07:00.000Z',
    likes: 0,
    likedByCurrentUser: false,
    tag: 'Generale',
    type: 'forum',
    replies: []
  },
  {
    id: 'rolly_topic_8',
    user: 'Rolly - Assistente ViaCamper',
    avatar: '🤖',
    avatarColor: 'bg-[#3E4A35]',
    title: '🌱 Gestione Cassetta WC Chimico e Additivi Ecologici Bio',
    text: "Rispettare l'ambiente nelle operazioni di camper service è fondamentale. Molti camperisti stanno passando ai fluidi disgreganti biodegradabili o al sistema di ventilazione SOG. Qual è la vostra opinione ed esperienza?",
    timestamp: '2026-07-15T12:08:00.000Z',
    likes: 0,
    likedByCurrentUser: false,
    tag: 'Sosta',
    type: 'forum',
    replies: []
  },
  {
    id: 'rolly_topic_9',
    user: 'Rolly - Assistente ViaCamper',
    avatar: '🤖',
    avatarColor: 'bg-[#3E4A35]',
    title: '🛠️ Cassetta degli Attrezzi d\'Emergenza: Cosa tenere sempre a bordo?',
    text: "I piccoli imprevisti tecnici fanno parte dell'avventura! Oltre a nastro americano multiuso e fascette da elettricista, quali utensili, multimetro, fusibili and ricambi non dovrebbero mai mancare a bordo?",
    timestamp: '2026-07-15T12:09:00.000Z',
    likes: 0,
    likedByCurrentUser: false,
    tag: 'Generale',
    type: 'forum',
    replies: []
  },
  {
    id: 'rolly_topic_10',
    user: 'Rolly - Assistente ViaCamper',
    avatar: '🤖',
    avatarColor: 'bg-[#3E4A35]',
    title: '🍳 Cucina On The Road: Le vostre ricette pratiche e il Fornetto Versilia',
    text: "Quali sono i vostri piatti forti da preparare sui fornelli del camper? Usate il celebre fornetto Versilia per ciambelloni e focacce senza bisogno del forno tradizionale? Condividiamo le ricette più veloci e gustose!",
    timestamp: '2026-07-15T12:10:00.000Z',
    likes: 0,
    likedByCurrentUser: false,
    tag: 'Generale',
    type: 'forum',
    replies: []
  },
  {
    id: 'rolly_topic_11',
    user: 'Rolly - Assistente ViaCamper',
    avatar: '🤖',
    avatarColor: 'bg-[#3E4A35]',
    title: '💨 Bollettino Vento e Raffiche sulle Coste: Come orientare la sosta',
    text: "Il vento forte o le raffiche improvvise possono rendere poco piacevole la notte in mansardato o van. Come verificate le correnti di vento prima di posizionare il camper e da che parte orientate il veicolo?",
    timestamp: '2026-07-15T12:11:00.000Z',
    likes: 0,
    likedByCurrentUser: false,
    tag: 'Meteo',
    type: 'forum',
    replies: []
  },
  {
    id: 'rolly_topic_12',
    user: 'Rolly - Assistente ViaCamper',
    avatar: '🤖',
    avatarColor: 'bg-[#3E4A35]',
    title: '🚐 Mansardato vs Semintegrale vs Motorhome vs Van: Esperienze a confronto',
    text: "Ogni tipologia di veicolo risponde a esigenze di viaggio diverse! Chi ha provato più modelli nel corso degli anni, quali vantaggi e svantaggi ha riscontrato? Vi va di raccontare la vostra evoluzione camperistica?",
    timestamp: '2026-07-15T12:12:00.000Z',
    likes: 0,
    likedByCurrentUser: false,
    tag: 'Generale',
    type: 'forum',
    replies: []
  },
  {
    id: 'rolly_topic_13',
    user: 'Rolly - Assistente ViaCamper',
    avatar: '🤖',
    avatarColor: 'bg-[#3E4A35]',
    title: '❄️ Manutenzione Invernale and Rimessaggio: La Check-list per evitare danni',
    text: "Quando il camper resta fermo qualche settimana nei mesi freddi, pochi gesti salvano da brutte sorprese alla riapertura! Voi quali accorgimenti usate per proteggere impianti idrici, batterie e guarnizioni dei finestrini?",
    timestamp: '2026-07-15T12:13:00.000Z',
    likes: 0,
    likedByCurrentUser: false,
    tag: 'Generale',
    type: 'forum',
    replies: []
  },
  {
    id: 'rolly_topic_14',
    user: 'Rolly - Assistente ViaCamper',
    avatar: '🤖',
    avatarColor: 'bg-[#3E4A35]',
    title: '🇪🇺 Prima Volta all\'Estero in Camper: Consigli per la Francia, Spagna e Nord Europa',
    text: "Organizzare il primo viaggio oltreconfine in camper richiede qualche piccola informazione preventiva su autostrade, bollini ambientali e regolamenti di sosta. Quali paesi ritenete più 'camper-friendly' in Europa?",
    timestamp: '2026-07-15T12:14:00.000Z',
    likes: 0,
    likedByCurrentUser: false,
    tag: 'Sosta',
    type: 'forum',
    replies: []
  },
  {
    id: 'rolly_topic_15',
    user: 'Rolly - Assistente ViaCamper',
    avatar: '🤖',
    avatarColor: 'bg-[#3E4A35]',
    title: '🔒 Sicurezza durante le Soste Notturne: Sistemi antifurto e buon senso',
    text: "Dormire tranquilli e rilassati è fondamentale per una vacanza indimenticabile. Quali sistemi di sicurezza (es. catene alle portiere cabina, antifurti perimetrali, rilevatori di gas o chiusure supplementari) utilizzate?",
    timestamp: '2026-07-15T12:15:00.000Z',
    likes: 0,
    likedByCurrentUser: false,
    tag: 'Generale',
    type: 'forum',
    replies: []
  },

  /* LIVE CHAT MESSAGES (Rolly Examples) */
  {
    id: 'chat_rolly_welcome',
    user: 'Rolly - Assistente ViaCamper',
    avatar: '🤖',
    avatarColor: 'bg-[#3E4A35]',
    text: '👋 Benvenuti nella Chat Live di ViaCamper! Scrivete qui per scambiarvi consigli in tempo reale o condividere informazioni pratiche mentre siete in viaggio. 🚐💬',
    timestamp: '2026-07-15T13:01:00.000Z',
    likes: 0,
    likedByCurrentUser: false,
    tag: 'Generale',
    type: 'chat',
    replies: []
  },
  {
    id: 'chat_rolly_tip',
    user: 'Rolly - Assistente ViaCamper',
    avatar: '🤖',
    avatarColor: 'bg-[#3E4A35]',
    text: '💡 La chat live è uno spazio aperto a tutti i camperisti per scambiarsi saluti e dritte al volo sulla strada! Buona permanenza! 🛣️',
    timestamp: '2026-07-15T13:02:00.000Z',
    likes: 0,
    likedByCurrentUser: false,
    tag: 'Sosta',
    type: 'chat',
    replies: []
  }
];

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  // Partenza
  { id: 'c1', text: 'Chiudere tutte le finestre e l\'oblò del tetto', category: 'Partenza', checked: false },
  { id: 'c2', text: 'Ritirare il gradino d\'ingresso elettrico/manuale', category: 'Partenza', checked: false },
  { id: 'c3', text: 'Spegnere la pompa dell\'acqua interna', category: 'Partenza', checked: false },
  { id: 'c4', text: 'Commutare il frigorifero su modalità 12V (in viaggio)', category: 'Partenza', checked: false },
  { id: 'c5', text: 'Chiudere la serranda del serbatoio delle acque grigie', category: 'Partenza', checked: false },
  { id: 'c6', text: 'Chiudere la valvola della bombola del gas principale', category: 'Partenza', checked: false },
  { id: 'c7', text: 'Bloccare tutte le antine degli armadietti e cassetti', category: 'Partenza', checked: false },
  { id: 'c8', text: 'Fissare o riporre in sicurezza oggetti sui ripiani', category: 'Partenza', checked: false },
  
  // Sosta
  { id: 'c9', text: 'Posizionare i cunei di livellamento sotto le ruote', category: 'Sosta', checked: false },
  { id: 'c10', text: 'Collegare il cavo elettrico 220V alla colonnina', category: 'Sosta', checked: false },
  { id: 'c11', text: 'Aprire la bombola del gas e accendere frigo a gas', category: 'Sosta', checked: false },
  { id: 'c12', text: 'Livellare il camper con i piedini stabilizzatori (se presenti)', category: 'Sosta', checked: false },

  // Sicurezza
  { id: 'c13', text: 'Verificare pressione degli pneumatici (incluso ruota scorta)', category: 'Sicurezza', checked: false },
  { id: 'c14', text: 'Controllare data di scadenza della bombola gas e tubi flessibili', category: 'Sicurezza', checked: false },
  { id: 'c15', text: 'Verificare funzionamento del rilevatore di fumo e gas nocivi (TrioGas)', category: 'Sicurezza', checked: false },
  { id: 'c16', text: 'Controllare estintore a bordo (pressione in zona verde)', category: 'Sicurezza', checked: false },
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
