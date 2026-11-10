import type { Place, PlaceCategory } from '../types.ts';

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
  isRealFlyer?: boolean;
  section: 'vicino' | 'weekend' | 'natale' | 'primavera' | 'estate' | 'tutte';
  sourceUrl?: string;
}

export const ITALIA_SAGRE_ARCHIVE: SagraEvent[] = [
  // ================= NOVEMBRE / AUTUNNO (CON LOCANDINE REALI TROVASAGRE) =================
  {
    id: 'sagra_sessano',
    title: 'Castagnata a Sessano',
    category: 'sagra',
    categoryLabel: 'Sagra della Castagna',
    locationName: 'Strada Sessano, Borgo Podgora, Latina (LT)',
    region: 'Lazio',
    dates: 'Sabato 14 Novembre 2026',
    dateBadge: '14 nov',
    startDate: '2026-11-14',
    endDate: '2026-11-14',
    month: 11,
    season: 'autunno',
    lat: 41.518748,
    lng: 12.8792659,
    description: 'Parrocchia S. Maria di Sessano (Borgo Podgora - LT): Menù Adulti (€20) con Pasta alla Forestale (ragù bianco con funghi), Saltimbocca alla Romana, Spezzatino di manzo al vino bianco, contorno, frutta e castagne arrosto con vino novello. Tombolata con ricchi premi.',
    specialties: ['Castagne Arrosto', 'Vino Novello', 'Pasta alla Forestale', 'Saltimbocca alla Romana'],
    camperParking: 'Parcheggio camper in Strada Sessano (Borgo Podgora) presso Casa Betlemme.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fflyer_af4ea46c-2dd0-4be2-9cbc-006b469edace.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fuploads%2Fflyer_af4ea46c-2dd0-4be2-9cbc-006b469edace.jpg',
    isRealFlyer: true,
    section: 'vicino',
    sourceUrl: 'https://trovasagre.com/evento/castagnata-strada-sessano-latina-lt-2026'
  },
  {
    id: 'sagra_oliolive',
    title: 'Oliolive Castel Madama',
    category: 'sagra',
    categoryLabel: 'Olio & Prodotti Tipici',
    locationName: 'Castel Madama (RM)',
    region: 'Lazio',
    dates: '14 e 15 Novembre 2026',
    dateBadge: '14 nov',
    startDate: '2026-11-14',
    endDate: '2026-11-15',
    month: 11,
    season: 'autunno',
    lat: 41.9746,
    lng: 12.8672,
    description: 'Tradizione, prodotti del territorio, conferenze, musica e buon cibo a Castel Madama con degustazione del nuovo olio extravergine d\'oliva nelle cantine storiche.',
    specialties: ['Olio Extravergine Novello', 'Bruschette Calde', 'Prodotti Tipici Laziali'],
    camperParking: 'Area parcheggio segnalata all\'ingresso di Castel Madama.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fflyer_84007c9c-7b09-419a-8e4f-afcb30206cd9.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fuploads%2Fflyer_84007c9c-7b09-419a-8e4f-afcb30206cd9.jpg',
    isRealFlyer: true,
    section: 'vicino',
    sourceUrl: 'https://trovasagre.com/evento/oliolive-castel-madama-rm-2026'
  },
  {
    id: 'sagra_fagiolone',
    title: 'XIII Sagra del Fagiolone',
    category: 'sagra',
    categoryLabel: 'Sagra Tradizionale',
    locationName: 'Vallepietra (RM)',
    region: 'Lazio',
    dates: 'Domenica 15 Novembre 2026',
    dateBadge: '15 nov',
    startDate: '2026-11-15',
    endDate: '2026-11-15',
    month: 11,
    season: 'autunno',
    lat: 41.9263492,
    lng: 13.2314835,
    description: 'Comune e Pro Loco di Vallepietra presentano la XIII Sagra del Fagiolone: lasagne o sagne e fagioli, fagioloni giganti in umido con salsicce, fagioloni in bianco e bevanda inclusa in tensostruttura coperta e riscaldata in Piazza Italia.',
    specialties: ['Fagioloni in umido con Salsiccia', 'Sagne e Fagioli', 'Fagioloni in Bianco'],
    camperParking: 'Parcheggio comunale gratuito in loc. San Giovanni a Vallepietra.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fbatch_1e5df168-d6cf-4359-9a01-000fc31b983b.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fuploads%2Fbatch_1e5df168-d6cf-4359-9a01-000fc31b983b.jpeg',
    isRealFlyer: true,
    section: 'weekend',
    sourceUrl: 'https://trovasagre.com/evento/sagra-del-fagiolone-vallepietra-2026'
  },
  {
    id: 'sagra_winenot',
    title: 'Wine not – Le vie del vino rosso',
    category: 'vino',
    categoryLabel: 'Vino & Cantine',
    locationName: 'Veroli (FR)',
    region: 'Lazio',
    dates: 'Domenica 15 Novembre 2026',
    dateBadge: '15 nov',
    startDate: '2026-11-15',
    endDate: '2026-11-15',
    month: 11,
    season: 'autunno',
    lat: 41.6908,
    lng: 13.4178,
    description: 'Il meglio del vino italiano in una giornata nel Centro Storico di Veroli: percorso di degustazione tra cantine storiche, calici di vino rosso e gastronomia ciociara.',
    specialties: ['Vini Rossi DOCG', 'Taglieri Ciociari', 'Percorso in Cantina'],
    camperParking: 'Parcheggio panoramico per camper sotto le mura di Veroli.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fflyer_92089b5c-a6ae-4594-8c24-81debc39771c.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fuploads%2Fflyer_92089b5c-a6ae-4594-8e4f-81debc39771c.jpg',
    isRealFlyer: true,
    section: 'weekend',
    sourceUrl: 'https://trovasagre.com/evento/wine-not-le-vie-del-vino-rosso-veroli-lazio-2026'
  },
  {
    id: 'sagra_streetfood_sonnino',
    title: 'Street Food alla Sonninese',
    category: 'sagra',
    categoryLabel: 'Gastronomia Borgo',
    locationName: 'Sonnino (LT)',
    region: 'Lazio',
    dates: 'Domenica 15 Novembre 2026',
    dateBadge: '15 nov',
    startDate: '2026-11-15',
    endDate: '2026-11-15',
    month: 11,
    season: 'autunno',
    lat: 41.4152375,
    lng: 13.2427971,
    description: 'Edizione d\'autunno nel borgo di Sonnino: la "maltagliata" ai ceci, minestra di pane, polenta con sugo di salsiccia, spezzatino di scottona e olio d\'oliva Itrana.',
    specialties: ['Maltagliata ai Ceci', 'Minestra di Pane', 'Polenta al Sugo', 'Spezzatino di Scottona'],
    camperParking: 'Area parcheggio panoramica all\'ingresso di Sonnino.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fbatch_5be48a57-05e1-4cd1-a90e-4996e4d6ad81.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fuploads%2Fbatch_5be48a57-05e1-4cd1-a90e-4996e4d6ad81.png',
    isRealFlyer: true,
    section: 'weekend',
    sourceUrl: 'https://trovasagre.com/evento/street-food-alla-sonninese-sonnino-lt-2026'
  },
  {
    id: 'sagra_anguillara_polenta',
    title: 'San Martino Castagne e Vino',
    category: 'sagra',
    categoryLabel: 'Castagne & Vino sul Lago',
    locationName: 'Anguillara Sabazia (RM)',
    region: 'Lazio',
    dates: '14 e 15 Novembre 2026',
    dateBadge: '15 nov',
    startDate: '2026-11-14',
    endDate: '2026-11-15',
    month: 11,
    season: 'autunno',
    lat: 42.0886,
    lng: 12.2775,
    description: 'Festa di San Martino vista Lago di Bracciano con stand gastronomici, polenta, caldarroste e vino novello.',
    specialties: ['Caldarroste', 'Vino Novello', 'Polenta Tradizionale'],
    camperParking: 'Area sosta camper comunale in Via della Mainella a 400m dal lago.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fscrape_9b17ab20-14c4-4c9b-8abf-de3cecb34fb3.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fscrape_9b17ab20-14c4-4c9b-8abf-de3cecb34fb3.webp',
    isRealFlyer: true,
    section: 'weekend',
    sourceUrl: 'https://trovasagre.com/evento/san-martino-castagne-e-vino-anguillara-sabazia-rm-2026'
  },
  {
    id: 'sagra_pane_olio_montelibretti',
    title: 'Pane, olio e... in Sabina',
    category: 'sagra',
    categoryLabel: 'Olio DOP Sabina',
    locationName: 'Montelibretti / Sabina (RM)',
    region: 'Lazio',
    dates: '14 - 16 Novembre 2026',
    dateBadge: '14 nov-16 nov',
    startDate: '2026-11-14',
    endDate: '2026-11-16',
    month: 11,
    season: 'autunno',
    lat: 42.1353,
    lng: 12.7381,
    description: 'Visita ai frantoi della Sabina, bruschetta gigante in piazza con Olio Extravergine DOP novello, fregnacce alla sabinese e musica popolare.',
    specialties: ['Olio DOP Sabina', 'Bruschettoni Caldi', 'Fregnacce Sabinesi'],
    camperParking: 'Parcheggio camper comunale panoramico a Montelibretti.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fflyer_78e417e0-7456-4105-856e-0c2b1c879846.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fuploads%2Fflyer_78e417e0-7456-4105-856e-0c2b1c879846.jpg',
    isRealFlyer: true,
    section: 'weekend',
    sourceUrl: 'https://trovasagre.com/evento/pane-olio-e-montelibretti-rm-2026'
  },
  {
    id: 'sagra_bruschetta_monteleone',
    title: 'Sagra della Bruschetta – L\'Oro Verde',
    category: 'sagra',
    categoryLabel: 'Olio Nuovo Sabina',
    locationName: 'Monteleone Sabino (RI)',
    region: 'Lazio',
    dates: 'Domenica 15 Novembre 2026',
    dateBadge: '15 nov',
    startDate: '2026-11-15',
    endDate: '2026-11-15',
    month: 11,
    season: 'autunno',
    lat: 42.23255,
    lng: 12.8591,
    description: 'A Monteleone Sabino l\'oro verde va in scena alla tradizionale Sagra della Bruschetta con olio extravergine appena franto, zuppe e salsicce alla brace.',
    specialties: ['Bruschetta all\'Olio Nuovo', 'Fregnacce', 'Salsicce alla Brace'],
    camperParking: 'Area sosta camper presso il Santuario di Santa Vittoria.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fflyer_103a2bdb-e3d0-4f35-9381-cc0ef0e6dabc.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fuploads%2Fflyer_103a2bdb-e3d0-4f35-9381-cc0ef0e6dabc.jpg',
    isRealFlyer: true,
    section: 'weekend',
    sourceUrl: 'https://trovasagre.com/evento/monteleone-sabino-ri-loro-verde-va-in-scena-alla-sagra-della-bruschetta-15-novembre-monteleone-sabino-ri-2026'
  },
  {
    id: 'sagra_subiaco_divino',
    title: 'Borgo diVino in tour a Subiaco',
    category: 'vino',
    categoryLabel: 'Degustazione nei Borghi',
    locationName: 'Subiaco (RM)',
    region: 'Lazio',
    dates: '14 e 15 Novembre 2026',
    dateBadge: '14 nov-15 nov',
    startDate: '2026-11-14',
    endDate: '2026-11-15',
    month: 11,
    season: 'autunno',
    lat: 41.9258,
    lng: 13.0947,
    description: 'Weekend di degustazioni enogastronomiche nella Rocca dei Borgia e nel centro storico di Subiaco tra i Borghi più belli d\'Italia.',
    specialties: ['Cesanese del Piglio DOCG', 'Juane Sublacensi', 'Taglieri di Montagna'],
    camperParking: 'Area sosta camper Subiaco lungo il fiume Aniene.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fscrape_a811dc78-3c0d-4155-b5e9-05a59441d57b.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fscrape_a811dc78-3c0d-4155-b5e9-05a59441d57b.webp',
    isRealFlyer: true,
    section: 'weekend',
    sourceUrl: 'https://trovasagre.com/evento/borgo-divino-tour-2026-subiaco-2026'
  },
  {
    id: 'sagra_marche_polentata',
    title: 'Polentata Tradizionale Marchigiana',
    category: 'storica',
    categoryLabel: 'Sagra Marche',
    locationName: 'Monte Urano (FM)',
    region: 'Marche',
    dates: '14 e 15 Novembre 2026',
    dateBadge: '14 nov',
    startDate: '2026-11-14',
    endDate: '2026-11-15',
    month: 11,
    season: 'autunno',
    lat: 43.2058,
    lng: 13.6722,
    description: 'Stand gastronomici coperti in Zona Centro - Giardini Pubblici a Monte Urano (FM): polenta calda a pranzo e cena con sughi della tradizione marchigiana.',
    specialties: ['Polenta al Ragù Marchigiano', 'Polenta Salsiccia e Costine', 'Vino Cotto'],
    camperParking: 'Parcheggio camper adiacente ai Giardini Pubblici di Monte Urano.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fbatch_3dd643a1-4e1a-44e5-a802-1cd3209e2604.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fbatch_3dd643a1-4e1a-44e5-a802-1cd3209e2604.webp',
    isRealFlyer: true,
    section: 'weekend',
    sourceUrl: 'https://trovasagre.com/evento/polentata-zona-centro-giardini-pubblici-monte-urano-fm-2026'
  },
  {
    id: 'sagra_marche_appassimenti',
    title: 'Appassimenti Aperti a Serrapetrona',
    category: 'vino',
    categoryLabel: 'Vernaccia DOCG Marche',
    locationName: 'Serrapetrona (MC)',
    region: 'Marche',
    dates: 'Domenica 15 Novembre 2026',
    dateBadge: '15 nov',
    startDate: '2026-11-14',
    endDate: '2026-11-15',
    month: 11,
    season: 'autunno',
    lat: 43.1764,
    lng: 13.1905,
    description: 'Degustazione della Vernaccia di Serrapetrona DOCG con gli appassimenti delle uve aperti nelle cantine storiche e piatti tipici maceratesi.',
    specialties: ['Vernaccia di Serrapetrona DOCG', 'Ciauscolo IGP', 'Vincisgrassi'],
    camperParking: 'Area sosta camper attrezzata comunale a Serrapetrona.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fbatch_adea46a7-c4a8-4327-9330-b413a799343f.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fbatch_adea46a7-c4a8-4327-9330-b413a799343f.webp',
    isRealFlyer: true,
    section: 'weekend',
    sourceUrl: 'https://trovasagre.com/evento/appassimenti-aperti-serrapetrona-macerata-2026'
  },
  {
    id: 'sagra_toscana_picio',
    title: 'Sagra del Picio e dello Gnocco',
    category: 'sagra',
    categoryLabel: 'Sagra Toscana',
    locationName: 'Fiesole (FI)',
    region: 'Toscana',
    dates: '13 - 15 Novembre 2026',
    dateBadge: '13-15 nov',
    startDate: '2026-11-13',
    endDate: '2026-11-15',
    month: 11,
    season: 'autunno',
    lat: 43.8069,
    lng: 11.2946,
    description: 'A Fiesole weekend dedicato ai pici fatti a mano all\'aglione, al ragù di cinghiale e agli gnocchi ripieni con vista su Firenze.',
    specialties: ['Pici all\'Aglione', 'Pici al Cinghiale', 'Gnocchi Toscani'],
    camperParking: 'Parcheggio camper panoramico a Fiesole.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fflyer_eb7b215f-1437-4d31-afe7-107a4acb1ef4.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fuploads%2Fflyer_eb7b215f-1437-4d31-afe7-107a4acb1ef4.jpg',
    isRealFlyer: true,
    section: 'weekend',
    sourceUrl: 'https://trovasagre.com/evento/sagra-del-picio-e-dello-gnocco-fiesole-fi-2026'
  },
  {
    id: 'sagra_toscana_cinghiale_chianni',
    title: '48ª Sagra del Cinghiale di Chianni',
    category: 'storica',
    categoryLabel: 'Sagra Storica Toscana',
    locationName: 'Chianni (PI)',
    region: 'Toscana',
    dates: '12 - 15 Novembre 2026',
    dateBadge: '12-15 nov',
    startDate: '2026-11-12',
    endDate: '2026-11-15',
    month: 11,
    season: 'autunno',
    lat: 43.4816,
    lng: 10.6428,
    description: 'Una delle sagre storiche più celebri della Toscana: pappardelle sul cinghiale, cinghiale in salmì con olive, polenta e zuppa toscana.',
    specialties: ['Pappardelle al Cinghiale', 'Cinghiale in Salmì', 'Polenta e Funghi'],
    camperParking: 'Area camper attrezzata comunale a Chianni.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fflyer_adbb2012-0167-4111-940c-28fa8b870c19.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fuploads%2Fflyer_adbb2012-0167-4111-940c-28fa8b870c19.jpg',
    isRealFlyer: true,
    section: 'weekend',
    sourceUrl: 'https://trovasagre.com/evento/sagra-del-cinghiale-chianni-pisa-2026'
  },
  {
    id: 'sagra_emilia_tartofla',
    title: '43° Tartófla – Festival del Tartufo Bianco',
    category: 'storica',
    categoryLabel: 'Tartufo Bianco',
    locationName: 'Savigno, Valsamoggia (BO)',
    region: 'Emilia-Romagna',
    dates: '14 e 15 Novembre 2026',
    dateBadge: '14-15 nov',
    startDate: '2026-11-14',
    endDate: '2026-11-15',
    month: 11,
    season: 'autunno',
    lat: 44.3986,
    lng: 11.0769,
    description: 'Il grande festival internazionale del Tartufo Bianco pregiato dei Colli Bolognesi con mostra mercato, tagliatelle al tartufo e crescentine.',
    specialties: ['Tagliatelle al Tartufo Bianco', 'Uova al Tartufo', 'Crescentine e Tigelle'],
    camperParking: 'Area sosta camper dedicata a Savigno durante la fiera.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fflyer_1cd7904e-f8d9-4aa2-bef2-19ddc970e4fd.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fuploads%2Fflyer_1cd7904e-f8d9-4aa2-bef2-19ddc970e4fd.jpg',
    isRealFlyer: true,
    section: 'weekend',
    sourceUrl: 'https://trovasagre.com/evento/43-tartofla-festival-internazionale-del-tartufo-bianco-savigno-emilia-romagna-bo-2026'
  },
  {
    id: 'sagra_puglia_cardoncello',
    title: 'Sagra del Fungo Cardoncello sulla Murgia',
    category: 'sagra',
    categoryLabel: 'Sapori della Murgia',
    locationName: 'Ruvo di Puglia (BA)',
    region: 'Puglia',
    dates: '13 - 15 Novembre 2026',
    dateBadge: '13-15 nov',
    startDate: '2026-11-13',
    endDate: '2026-11-15',
    month: 11,
    season: 'autunno',
    lat: 41.1169,
    lng: 16.4847,
    description: 'Nel centro storico di Ruvo di Puglia degustazione del fungo cardoncello della Murgia, cavatelli, salsiccia a punta di coltello e vino Nero di Troia.',
    specialties: ['Fungo Cardoncello Arrosto', 'Cavatelli ai Cardoncelli', 'Nero di Troia DOC'],
    camperParking: 'Parcheggio camper in zona Parco Belvedere / Pineta Comunale.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fflyer_29b472aa-00b2-4d60-a522-7537fc169271.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fuploads%2Fflyer_29b472aa-00b2-4d60-a522-7537fc169271.jpg',
    isRealFlyer: true,
    section: 'weekend',
    sourceUrl: 'https://trovasagre.com/evento/sagra-del-fungo-cardoncello-ruvo-di-puglia-puglia-2026'
  },

  // ================= DICEMBRE / INVERNO & NATALE (CON LOCANDINE REALI TROVASAGRE) =================
  {
    id: 'sagra_natale_aprilia',
    title: 'Mercatino delle Pulci Speciale Natale',
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
    lat: 41.5944018,
    lng: 12.6560314,
    description: 'Un evento dedicato ai bambini! Mercatino natalizio in Piazza Roma ad Aprilia dedicato al riuso, al collezionismo, dolci natalizi e hobbistica per i più piccoli.',
    specialties: ['Mercatino di Natale', 'Dolciumi per Bambini', 'Caldarroste e Vin Brulé'],
    camperParking: 'Parcheggio comunale in Via dei Mille ad Aprilia.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fext_7c964510-2b46-4851-a838-2582a8c70e57.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fuploads%2Fext_7c964510-2b46-4851-a838-2582a8c70e57.jpg',
    isRealFlyer: true,
    section: 'natale'
  },
  {
    id: 'sagra_giftland_roma',
    title: 'Giftland – La città del regalo',
    category: 'natale',
    categoryLabel: 'Mercatini di Natale',
    locationName: 'Ex Deposito ATAC San Paolo, Roma (RM)',
    region: 'Lazio',
    dates: '5 - 20 Dicembre 2026',
    dateBadge: '5-20 dic',
    startDate: '2026-12-05',
    endDate: '2026-12-20',
    month: 12,
    season: 'inverno',
    lat: 41.854422,
    lng: 12.484762,
    description: 'Il grande villaggio natalizio al coperto a Roma con oltre 200 espositori di artigianato, area food & beverage natalizia e spettacoli.',
    specialties: ['Street Food Natalizio', 'Dolci Artigianali', 'Vin Brulé e Birre'],
    camperParking: 'Area sosta camper Roma Ostiense / Cristoforo Colombo.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fmercatino_0c4515b7-02aa-4b5d-aa9b-d351c31727c4.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fuploads%2Fmercatino_0c4515b7-02aa-4b5d-aa9b-d351c31727c4.jpg',
    isRealFlyer: true,
    section: 'natale'
  },
  {
    id: 'sagra_lanterne_saracinesco',
    title: 'Notte delle Lanterne',
    category: 'natale',
    categoryLabel: 'Festa nel Borgo',
    locationName: 'Saracinesco (RM)',
    region: 'Lazio',
    dates: 'Sabato 5 Dicembre 2026',
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
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fbatch_9b3c2be8-8079-444e-b28d-cbf6ab2643e9.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fbatch_9b3c2be8-8079-444e-b28d-cbf6ab2643e9.webp',
    isRealFlyer: true,
    section: 'natale',
    sourceUrl: 'https://trovasagre.com/evento/notte-delle-lanterne-saracinesco-rm-2026'
  },
  {
    id: 'sagra_mosciarella_capranica',
    title: '45^ Sagra della Mosciarella',
    category: 'storica',
    categoryLabel: 'Castagna Mosciarella',
    locationName: 'Capranica Prenestina (RM)',
    region: 'Lazio',
    dates: 'Domenica 6 Dicembre 2026',
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
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fscrape_87475810-e9c8-465a-acc0-9d5c06c3d30c.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fscrape_87475810-e9c8-465a-acc0-9d5c06c3d30c.webp',
    isRealFlyer: true,
    section: 'natale',
    sourceUrl: 'https://trovasagre.com/evento/45-sagra-della-mosciarella-capranica-prenestina-rm-2026'
  },
  {
    id: 'sagra_natale_monterotondo',
    title: 'Natale Mentanese & Mercatini',
    category: 'natale',
    categoryLabel: 'Mercatini & Gastronomia',
    locationName: 'Mentana / Monterotondo (RM)',
    region: 'Lazio',
    dates: '12 e 13 Dicembre 2026',
    dateBadge: '12 dic-13 dic',
    startDate: '2026-12-12',
    endDate: '2026-12-13',
    month: 12,
    season: 'inverno',
    lat: 42.0369,
    lng: 12.6461,
    description: 'Villaggio di Natale nel borgo storico con casette in legno, piatti caldi della tradizione invernale, frittelle e spettacoli.',
    specialties: ['Zuppe Invernali', 'Frittelle Calde', 'Cioccolata e Dolci'],
    camperParking: 'Parcheggio camper zona Stadio / Passeggiata.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fbatch_db429895-1855-4d89-bd45-801c430898ff.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fbatch_db429895-1855-4d89-bd45-801c430898ff.webp',
    isRealFlyer: true,
    section: 'natale',
    sourceUrl: 'https://trovasagre.com/evento/natale-mentanese-mentana-rm-2026'
  },
  {
    id: 'sagra_acilia_dicembre',
    title: 'Pura Vigna – Festa del Vino e Sapori',
    category: 'vino',
    categoryLabel: 'Vino & Gastronomia',
    locationName: 'Via di Macchia Palocco, Acilia / Roma (RM)',
    region: 'Lazio',
    dates: '12 e 13 Dicembre 2026',
    dateBadge: '12 dic-13 dic',
    startDate: '2026-12-12',
    endDate: '2026-12-13',
    month: 12,
    season: 'inverno',
    lat: 41.7664,
    lng: 12.3611,
    description: 'Degustazione di vini naturali e artigianali con stand gastronomici romani tra Acilia e Casal Palocco.',
    specialties: ['Vini Artigianali', 'Porchetta Calda', 'Piatti Tradizionali Romani'],
    camperParking: 'Area sosta camper Ostia Antica a pochi minuti.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fext_900c6605-7468-4791-905e-50a871030549.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fext_900c6605-7468-4791-905e-50a871030549.webp',
    isRealFlyer: true,
    section: 'natale',
    sourceUrl: 'https://trovasagre.com/evento/pura-vigna-via-di-macchia-palocco-roma-rm-2026'
  },

  // ================= PRIMAVERA (APRILE - MAGGIO) =================
  {
    id: 'sagra_carciofo_ladispoli',
    title: 'Sagra del Carciofo Romanesco IGP',
    category: 'storica',
    categoryLabel: 'Sagra di Primavera',
    locationName: 'Ladispoli (RM)',
    region: 'Lazio',
    dates: '16 - 18 Aprile 2027',
    dateBadge: '16-18 apr',
    startDate: '2027-04-16',
    endDate: '2027-04-18',
    month: 4,
    season: 'primavera',
    lat: 41.9544,
    lng: 12.0742,
    description: 'La grande festa di primavera sul litorale laziale con carciofi alla giudia, alla romana, fritti e sculture di carciofi in piazza.',
    specialties: ['Carciofo alla Giudia', 'Carciofo alla Romana', 'Fettuccine ai Carciofi'],
    camperParking: 'Aree sosta camper sul lungomare di Ladispoli.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fflyer_c8a35a4a-8faa-4cc6-80c4-a4c9fb35eb04.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fuploads%2Fflyer_c8a35a4a-8faa-4cc6-80c4-a4c9fb35eb04.jpg',
    isRealFlyer: true,
    section: 'primavera'
  },
  {
    id: 'sagra_pesce_camogli',
    title: 'Sagra del Pesce & Frittura in Piazza',
    category: 'storica',
    categoryLabel: 'Sagra Storica Ligure',
    locationName: 'Camogli (GE)',
    region: 'Liguria',
    dates: 'Domenica 9 Maggio 2027',
    dateBadge: '9 mag',
    startDate: '2027-05-09',
    endDate: '2027-05-09',
    month: 5,
    season: 'primavera',
    lat: 44.3486,
    lng: 9.1558,
    description: 'Celebre frittura di pesce azzurro nella padella gigante da 4 metri di diametro direttamente sul porticciolo di Camogli.',
    specialties: ['Frittura di Pesce Azzurro', 'Focaccia Ligure', 'Vermentino'],
    camperParking: 'Parcheggio camper in Via Franco Molfino (zona Ruta/Recco con bus).',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fflyer_2105f53d-9c5e-47c0-a965-ab8bc8f817eb.webp',
    fullFlyerUrl: '/api/sagre-flyer?path=%2Fuploads%2Fflyer_2105f53d-9c5e-47c0-a965-ab8bc8f817eb.jpg',
    isRealFlyer: true,
    section: 'primavera'
  },

  // ================= ESTATE (GIUGNO - LUGLIO - AGOSTO - SETTEMBRE) =================
  {
    id: 'sagra_tellina_ostia',
    title: 'Sagra della Tellina del Borghetto dei Pescatori',
    category: 'sagra',
    categoryLabel: 'Sagra Estiva di Mare',
    locationName: 'Lido di Ostia (RM)',
    region: 'Lazio',
    dates: '25 - 27 Giugno 2027',
    dateBadge: '25-27 giu',
    startDate: '2027-06-25',
    endDate: '2027-06-27',
    month: 6,
    season: 'estate',
    lat: 41.7256,
    lng: 12.3022,
    description: 'Quintali di spaghetti alle telline fresche pescate sul litorale romano, frittura di paranza e serate musicali nel caratteristico Borghetto dei Pescatori.',
    specialties: ['Spaghetti alle Telline', 'Frittura di Paranza', 'Soutè di Cozze'],
    camperParking: 'Area sosta camper Lungomare di Ostia / Pineta di Castel Fusano.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fflyer_2105f53d-9c5e-47c0-a965-ab8bc8f817eb.webp',
    isRealFlyer: true,
    section: 'estate'
  },
  {
    id: 'sagra_porcini_ariano',
    title: 'Sagra del Fungo Porcino e Fettuccine',
    category: 'sagra',
    categoryLabel: 'Sagra Estiva Castelli',
    locationName: 'Lariano / Velletri (RM)',
    region: 'Lazio',
    dates: '10 - 12 Luglio 2027',
    dateBadge: '10-12 lug',
    startDate: '2027-07-10',
    endDate: '2027-07-12',
    month: 7,
    season: 'estate',
    lat: 41.7258,
    lng: 12.8389,
    description: 'Fresco estivo nei boschi dei Castelli Romani con fettuccine fatte a mano ai funghi porcini, cellitti, pane casareccio di Lariano IGP e carne alla brace.',
    specialties: ['Fettuccine ai Funghi Porcini', 'Pane di Lariano IGP', 'Carne alla Brace'],
    camperParking: 'Ampio parcheggio gratuito per camper presso l\'area fieristica di Lariano.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fflyer_29b472aa-00b2-4d60-a522-7537fc169271.webp',
    isRealFlyer: true,
    section: 'estate'
  },
  {
    id: 'sagra_municeddha_salento',
    title: 'Festa della Municeddha e Pizzica Salentina',
    category: 'storica',
    categoryLabel: 'Grande Sagra del Salento',
    locationName: 'Cannole / Otranto (LE)',
    region: 'Puglia',
    dates: '10 - 13 Agosto 2027',
    dateBadge: '10-13 ago',
    startDate: '2027-08-10',
    endDate: '2027-08-13',
    month: 8,
    season: 'estate',
    lat: 40.1583,
    lng: 18.3667,
    description: 'La più grande sagra estiva del Salento a pochi km dalle spiagge di Otranto: municeddhe soffritte e arrosto, pittule calde, pezzetti di cavallo al sugo e concerti di pizzica.',
    specialties: ['Municeddhe Salentine', 'Pittule Calde', 'Pasticciotto Leccese', 'Negroamaro'],
    camperParking: 'Aree parcheggio camper gratuite segnalate all\'ingresso di Cannole.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fbatch_1f027506-4838-45d5-836f-dc3f3e8eebd7.webp',
    isRealFlyer: true,
    section: 'estate'
  },
  {
    id: 'sagra_tortello_maremma',
    title: 'Sagra del Tortello Maremmano e Cinghiale',
    category: 'sagra',
    categoryLabel: 'Sagra di Ferragosto',
    locationName: 'Capalbio / Orbetello (GR)',
    region: 'Toscana',
    dates: '13 - 16 Agosto 2027',
    dateBadge: '13-16 ago',
    startDate: '2027-08-13',
    endDate: '2027-08-16',
    month: 8,
    season: 'estate',
    lat: 42.4542,
    lng: 11.4225,
    description: 'Ideale per le vacanze estive in camper sulla costa toscana: tortelli maremmani fatti a mano con ragù di cinghiale, acquacotta e Morellino di Scansano.',
    specialties: ['Tortelli Maremmani', 'Acquacotta', 'Morellino di Scansano DOCG'],
    camperParking: 'Area sosta camper Capalbio Scalo e Feniglia.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fflyer_adbb2012-0167-4111-940c-28fa8b870c19.webp',
    isRealFlyer: true,
    section: 'estate'
  },
  {
    id: 'sagra_bistecca_chianti',
    title: 'Sagra della Bistecca alla Fiorentina & Chianti',
    category: 'sagra',
    categoryLabel: 'Carne & Vino Chianti',
    locationName: 'Greve in Chianti (FI)',
    region: 'Toscana',
    dates: '4 - 6 Settembre 2027',
    dateBadge: '4-6 set',
    startDate: '2027-09-04',
    endDate: '2027-09-06',
    month: 9,
    season: 'estate',
    lat: 43.5861,
    lng: 11.3164,
    description: 'Nel cuore del Chianti, stand gastronomici con Bistecca alla Fiorentina sulla brace di quercia, ribollita e degustazione di Chianti Classico Gallo Nero.',
    specialties: ['Bistecca alla Fiorentina', 'Chianti Classico DOCG', 'Cantuccini e Vin Santo'],
    camperParking: 'Area sosta camper comunale gratuita a Greve in Chianti.',
    imageUrl: '/api/sagre-flyer?path=%2Fthumbs%2Fflyer_eb7b215f-1437-4d31-afe7-107a4acb1ef4.webp',
    isRealFlyer: true,
    section: 'estate'
  }
];

export const CURRENT_NOV_SAGRE: SagraEvent[] = ITALIA_SAGRE_ARCHIVE;

const LIVE_SAGRE_STORAGE_KEY = 'viacamper_live_sagre_v2_flyers';

export function loadLiveSagre(): SagraEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LIVE_SAGRE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLiveSagre(newItems: SagraEvent[]): SagraEvent[] {
  const existing = loadLiveSagre();
  const map = new Map<string, SagraEvent>();
  existing.forEach(item => map.set(item.id, item));
  newItems.forEach(item => map.set(item.id, item));
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
  const live = loadLiveSagre();
  const map = new Map<string, SagraEvent>();
  ITALIA_SAGRE_ARCHIVE.forEach(s => map.set(s.id, s));
  live.forEach(s => map.set(s.id, s));
  return Array.from(map.values());
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
    source: 'TrovaSagre',
    categoryLabel: `${s.categoryLabel} (${s.dateBadge})`,
    eventStartDate: s.startDate,
    eventEndDate: s.endDate,
    eventDateBadge: s.dateBadge,
    eventSeason: s.season,
    eventMonth: s.month,
    eventSpecialties: s.specialties
  };
}

export function getAllSagrePlaces(): Place[] {
  return getAllSagreEvents().map(sagraToPlace);
}

export const SAGRE_PLACES: Place[] = ITALIA_SAGRE_ARCHIVE.map(sagraToPlace);

export interface SagraFilterCriteria {
  periodMode: 'all' | 'weekend' | 'autunno' | 'natale' | 'primavera' | 'estate' | 'custom';
  selectedMonth?: number; // 0 = all, 1..12
  startDate?: string;     // YYYY-MM-DD
  endDate?: string;       // YYYY-MM-DD
}

/**
 * Matches a SagraEvent or Place against period, month, or custom vacation date range.
 * Handles recurring annual sagre by matching either exact YYYY-MM-DD overlap OR MM-DD seasonal window.
 */
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
  // 1. Month filter if explicitly selected (1..12)
  if (filter.selectedMonth && filter.selectedMonth > 0) {
    const itemMonth = item.month || (item.startDate ? parseInt(item.startDate.split('-')[1], 10) : 0);
    const endMonth = item.endDate ? parseInt(item.endDate.split('-')[1], 10) : itemMonth;
    if (itemMonth !== filter.selectedMonth && endMonth !== filter.selectedMonth) {
      return false;
    }
  }

  // 2. Custom date range (Dal ... Al ...) for vacation planning
  if (filter.startDate || filter.endDate) {
    const iStart = item.startDate || '';
    const iEnd = item.endDate || iStart;
    if (!iStart) return true;

    const fStart = filter.startDate || '2020-01-01';
    const fEnd = filter.endDate || '2035-12-31';

    // Exact date overlap check
    const exactOverlap = iStart <= fEnd && iEnd >= fStart;
    if (exactOverlap) return true;

    // Also check recurring annual MM-DD overlap if user is planning a summer/holiday trip within a single year
    const fStartYear = fStart.slice(0, 4);
    const fEndYear = fEnd.slice(0, 4);
    if (fStartYear === fEndYear) {
      const fStartMD = fStart.slice(5); // MM-DD
      const fEndMD = fEnd.slice(5);     // MM-DD
      const iStartMD = iStart.slice(5);
      const iEndMD = iEnd.slice(5);
      if (fStartMD <= fEndMD && iStartMD <= fEndMD && iEndMD >= fStartMD) {
        return true;
      }
    }
    return false;
  }

  // 3. Quick Period Pills
  switch (filter.periodMode) {
    case 'all':
    case 'custom':
      return true;
    case 'weekend':
      return item.section === 'weekend' || item.section === 'vicino' || item.month === 11;
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
