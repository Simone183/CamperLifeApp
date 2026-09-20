import { CommunityItinerary } from '../types';

export const INITIAL_ROLLY_CURATED_ITINERARIES: CommunityItinerary[] = [
  {
    id: 'rolly_curated_1',
    title: 'Giro Classico del Chianti e Borghi Senesi',
    description: 'Un viaggio incantevole tra vigne a perdita d’occhio, strade panoramiche tra i cipressi e degustazioni enogastronomiche nel cuore della Toscana.',
    authorName: 'Rolly AI 🤖',
    createdAt: '2026-01-10T10:00:00.000Z',
    durationDays: 4,
    startLocation: 'Greve in Chianti (FI)',
    endLocation: 'Pienza (SI)',
    waypoints: ['Greve in Chianti', 'Radda in Chianti', 'Siena', 'San Quirico d’Orcia', 'Pienza'],
    travelStyle: 'Scenico & Enogastronomico',
    interests: ['Enogastronomia', 'Borghi Storici', 'Natura'],
    totalKm: '185 km',
    status: 'approved',
    source: 'rolly_curated',
    imageUrl: 'https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1528164344705-47542687990d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80'
    ],
    days: [
      {
        dayNumber: 1,
        title: 'Tappa 1: Greve & Radda in Chianti',
        description: 'Partenza dalla celebre piazza triangolare di Greve in Chianti con visita alle enoteche storiche, poi rotta verso le colline fino a Radda.',
        stopPlaceName: 'Area Sosta Camper Radda in Chianti',
        drivingSegment: '32 km (circa 45 min)',
        activities: ['Passeggiata nel centro di Greve', 'Degustazione Chianti Classico', 'Tramonto sulle colline di Radda'],
        camperTips: 'Strade collinari con curve dolci, prestare attenzione nei borghi stretti. Sosta camper comoda e panoramica.',
        stopCoordinate: { lat: 43.486, lng: 11.374, label: 'Radda in Chianti' },
        imageUrl: 'https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=800&q=80'
      },
      {
        dayNumber: 2,
        title: 'Tappa 2: Monteriggioni & Siena',
        description: 'Guida verso il castello turrito di Monteriggioni e arrivo ai piedi delle mura di Siena per una visita a Piazza del Campo e al Duomo.',
        stopPlaceName: 'Area Sosta Camper Fagiolone (Siena)',
        drivingSegment: '48 km (circa 1h)',
        activities: ['Giro sulle mura di Monteriggioni', 'Passeggiata in Piazza del Campo a Siena', 'Cena tipica senese'],
        camperTips: 'A Siena parcheggiare all’area Fagiolone o al Palasport; collegate bene con i bus per il centro.',
        stopCoordinate: { lat: 43.318, lng: 11.330, label: 'Siena' },
        imageUrl: 'https://images.unsplash.com/photo-1528164344705-47542687990d?auto=format&fit=crop&w=800&q=80'
      },
      {
        dayNumber: 3,
        title: 'Tappa 3: Val d’Orcia & San Quirico',
        description: 'Discesa verso la mitica Val d’Orcia patrimonio UNESCO, con fermata ai famosi cipressini di San Quirico e cappella di Vitaleta.',
        stopPlaceName: 'Area Camper San Quirico d’Orcia',
        drivingSegment: '55 km (circa 1h 10m)',
        activities: ['Foto ai cipressini iconici della Val d’Orcia', 'Visita agli Horti Leonini', 'Relax serale nel borgo'],
        camperTips: 'Fondo stradale buono, ampi spazi di sosta lungo i punti panoramici della SP146.',
        stopCoordinate: { lat: 43.058, lng: 11.606, label: 'San Quirico d’Orcia' },
        imageUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80'
      },
      {
        dayNumber: 4,
        title: 'Tappa 4: Pienza & Montepulciano',
        description: 'La città ideale del Rinascimento famosa per il Pecorino di Pienza, concludendo il tour a Montepulciano tra palazzi ed enoteche sotterranee.',
        stopPlaceName: 'Area Sosta Camper Pienza (Via di del Canneto)',
        drivingSegment: '50 km (circa 1h)',
        activities: ['Assaggio Pecorino stagionato a Pienza', 'Visita alle cantine sotterranee di Montepulciano', 'Saluto finale alla Maremma e Chianti'],
        camperTips: 'A Pienza l’area di sosta è vicinissima al centro storico, dotata di CS e vista sulla valle.',
        stopCoordinate: { lat: 43.076, lng: 11.678, label: 'Pienza' },
        imageUrl: 'https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80'
      }
    ]
  },
  {
    id: 'rolly_curated_2',
    title: 'Costa degli Dei e Panorami della Calabria',
    description: 'Un itinerario mozzafiato lungo il Tirreno calabrese: scogliere a picco sul mare, spiagge turchesi e la magica vista sulle Isole Eolie.',
    authorName: 'Rolly AI 🤖',
    createdAt: '2026-01-15T10:00:00.000Z',
    durationDays: 5,
    startLocation: 'Pizzo Calabro (VV)',
    endLocation: 'Scilla e Chianalea (RC)',
    waypoints: ['Pizzo Calabro', 'Tropea', 'Capo Vaticano', 'Nicotera', 'Scilla'],
    travelStyle: 'Mare & Relax',
    interests: ['Mare & Spiagge', 'Enogastronomia', 'Panorami Mozafiato'],
    totalKm: '140 km',
    status: 'approved',
    source: 'rolly_curated',
    imageUrl: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80'
    ],
    days: [
      {
        dayNumber: 1,
        title: 'Tappa 1: Pizzo Calabro & Tartufo di Pizzo',
        description: 'Visita al Castello Murat, passeggiata nel borgo a picco sul mare e imperdibile degustazione del Tartufo di Pizzo originale.',
        stopPlaceName: 'Camping & Area Sosta Pizzo Beach',
        drivingSegment: '30 km',
        activities: ['Visita Chiesetta di Piedigrotta', 'Assaggio Tartufo di Pizzo', 'Bagno al tramonto'],
        camperTips: 'Strada costiera SS18 molto scorrevole; attenzione ai parcheggi in centro a Pizzo nei mesi estivi.',
        stopCoordinate: { lat: 38.735, lng: 16.101, label: 'Pizzo Calabro' },
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'
      },
      {
        dayNumber: 2,
        title: 'Tappa 2: Tropea la Perla del Tirreno',
        description: 'Sosta a Tropea, il santuario di Santa Maria dell’Isola e le viuzze affacciate sul mare cristallino.',
        stopPlaceName: 'Camping Cicco della Relax (Tropea Mare)',
        drivingSegment: '30 km (circa 40 min)',
        activities: ['Spiaggia sotto il centro di Tropea', 'Aperitivo con cipolla rossa dolce di Tropea', 'Passeggiata serale'],
        camperTips: 'A Tropea conviene sostare nei campeggi sul mare ai piedi della rupe e salire in centro a piedi.',
        stopCoordinate: { lat: 38.679, lng: 15.898, label: 'Tropea' },
        imageUrl: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80'
      },
      {
        dayNumber: 3,
        title: 'Tappa 3: Capo Vaticano & Tramonto Eoliano',
        description: 'Belvedere di Capo Vaticano, tra le spiagge e insenature più belle d’Italia con vista diretta su Stromboli in eruzione.',
        stopPlaceName: 'Area Sosta Camper Capo Vaticano',
        drivingSegment: '15 km (circa 25 min)',
        activities: ['Snorkeling nella baia di Grotticelle', 'Foto dal Belvedere del Faro di Capo Vaticano'],
        camperTips: 'Sosta ombreggiata vicina alle spiagge con pendenze moderate. Ideale per rilassarsi.',
        stopCoordinate: { lat: 38.619, lng: 15.832, label: 'Capo Vaticano' },
        imageUrl: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80'
      },
      {
        dayNumber: 4,
        title: 'Tappa 4: Nicotera Marina & Palmi',
        description: 'Proseguimento verso sud attraversando Nicotera e la Costa Viola di Palmi con affaccio sullo Stretto di Messina.',
        stopPlaceName: 'Area Camper Palmi Tonnara',
        drivingSegment: '40 km (circa 50 min)',
        activities: ['Bagno alla Tonnara di Palmi', 'Belvedere di Sant’Elia'],
        camperTips: 'Strada panoramica bellissima, la salita a Sant’Elia offre tornanti ampi adatti anche a mansardati.',
        stopCoordinate: { lat: 38.358, lng: 15.850, label: 'Palmi' },
        imageUrl: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=800&q=80'
      },
      {
        dayNumber: 5,
        title: 'Tappa 5: Scilla & Borgo di Chianalea',
        description: 'Arrivo a Scilla, il borgo dei pescatori di Chianalea con le case direttamente poggiate sulle onde del mare.',
        stopPlaceName: 'Area Sosta Scilla Porticciolo',
        drivingSegment: '25 km (circa 30 min)',
        activities: ['Cena di pesce fresco sulle palafitte di Chianalea', 'Castello Ruffo di Scilla'],
        camperTips: 'A Scilla non entrare con il camper nel borgo stretto! Parcheggiare all’area riservata vicino alla stazione/porto.',
        stopCoordinate: { lat: 38.253, lng: 15.717, label: 'Scilla' },
        imageUrl: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80'
      }
    ]
  },
  {
    id: 'rolly_curated_3',
    title: 'Grande Anello delle Dolomiti in Camper',
    description: 'Tra i passi mitici della Val Gardena, Alta Badia, Cortina e le maestose Tre Cime di Lavaredo.',
    authorName: 'Rolly AI 🤖',
    createdAt: '2026-01-20T10:00:00.000Z',
    durationDays: 6,
    startLocation: 'Ortisei (BZ)',
    endLocation: 'Misurina & Tre Cime (BL)',
    waypoints: ['Ortisei', 'Passo Gardena', 'Corvara', 'Passo Falzarego', 'Cortina d’Ampezzo', 'Lago di Misurina'],
    travelStyle: 'Montagna & Avventura',
    interests: ['Montagna & Trekking', 'Natura', 'Panorami Mozzafiato'],
    totalKm: '210 km',
    status: 'approved',
    source: 'rolly_curated',
    imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80'
    ],
    days: [
      {
        dayNumber: 1,
        title: 'Tappa 1: Val Gardena & Ortisei',
        description: 'Immersione nelle valli ladine con escursione all’Alpe di Siusi o al Seceda, circondati dalle pareti di roccia dolomitica.',
        stopPlaceName: 'Camping Seiser Alm / Area Sosta Ortisei',
        drivingSegment: '40 km',
        activities: ['Funicolare Seceda', 'Passeggiata nel centro in legno di Ortisei'],
        camperTips: 'Area sosta ben attrezzata. Verificare sempre le condizioni meteo e l’ingombro del camper sui tornanti.',
        stopCoordinate: { lat: 46.575, lng: 11.671, label: 'Ortisei' },
        imageUrl: 'https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=800&q=80'
      },
      {
        dayNumber: 2,
        title: 'Tappa 2: Passo Gardena & Alta Badia',
        description: 'Spettacolare traversata del Passo Gardena a 2.121m tra il Gruppo del Sella e il Cir, scendendo verso Corvara.',
        stopPlaceName: 'Area Camper Colfosco (Alta Badia)',
        drivingSegment: '25 km (circa 45 min)',
        activities: ['Aperitivo in quota al Passo Gardena', 'Giro ad anello a Colfosco'],
        camperTips: 'Tornanti ampi e panoramici. Guidare usando il freno motore per non surriscaldare i freni.',
        stopCoordinate: { lat: 46.551, lng: 11.851, label: 'Corvara in Badia' },
        imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80'
      },
      {
        dayNumber: 3,
        title: 'Tappa 3: Passo Falzarego & Lagazuoi',
        description: 'Salita al Passo Falzarego e funicolare per il Piccolo Lagazuoi con le storiche gallerie della Grande Guerra.',
        stopPlaceName: 'Sosta Camper Passo Falzarego',
        drivingSegment: '30 km (circa 50 min)',
        activities: ['Visita gallerie del Lagazuoi', 'Panorama a 360° sulla Marmolada e Tofane'],
        camperTips: 'Possibilità di sosta diurna al passo. Notte ventilata e fresca a oltre 2000 metri.',
        stopCoordinate: { lat: 46.518, lng: 12.008, label: 'Passo Falzarego' },
        imageUrl: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=800&q=80'
      },
      {
        dayNumber: 4,
        title: 'Tappa 4: Cortina d’Ampezzo',
        description: 'Discesa nella Conca d’Ampezzo, passeggiata lungo Corso Italia e vista sulle Tofane e sul Cristallo.',
        stopPlaceName: 'Camping Rochester / Area Sosta Cortina',
        drivingSegment: '20 km (circa 30 min)',
        activities: ['Passeggiata in centro a Cortina', 'Aperitivo ampezzano'],
        camperTips: 'I campeggi a Cortina sono ben serviti da navette bus frequentissime verso il centro.',
        stopCoordinate: { lat: 46.537, lng: 12.135, label: 'Cortina d’Ampezzo' },
        imageUrl: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=800&q=80'
      },
      {
        dayNumber: 5,
        title: 'Tappa 5: Lago di Misurina & Tre Cime',
        description: 'Arrivo alle sponde del Lago di Misurina e salita verso il Rifugio Auronzo ai piedi delle iconiche Tre Cime di Lavaredo.',
        stopPlaceName: 'Area Camper Misurina (300m dal lago)',
        drivingSegment: '25 km (circa 40 min)',
        activities: ['Giro ad anello delle Tre Cime di Lavaredo', 'Giro in pedalò sul Lago di Misurina'],
        camperTips: 'Strada a pedaggio per il Rifugio Auronzo; l’area sosta a Misurina è comodissima ed economica.',
        stopCoordinate: { lat: 46.578, lng: 12.254, label: 'Lago di Misurina' },
        imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80'
      },
      {
        dayNumber: 6,
        title: 'Tappa 6: San Candido & Val Pusteria',
        description: 'Conclusione in bellezza nella ciclabile della Val Pusteria fino alla collegiata di San Candido.',
        stopPlaceName: 'Area Camper San Candido / Dobbiaco',
        drivingSegment: '35 km (circa 40 min)',
        activities: ['Ciclopedonale San Candido - Lienz', 'Strudel e brezel tradizionali'],
        camperTips: 'Area camper dotata di tutti i servizi CS, allaccio 220V e vicinissima alla pista ciclabile.',
        stopCoordinate: { lat: 46.733, lng: 12.282, label: 'San Candido' },
        imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'
      }
    ]
  },
  {
    id: 'rolly_curated_4',
    title: 'Maremma Selvaggia, Spiagge e Terme Naturali',
    description: 'Natura incontaminata, terme naturali gratuite a Saturnia, cavalli maremmani e i borghi del tufo di Pitigliano e Sorano.',
    authorName: 'Rolly AI 🤖',
    createdAt: '2026-01-25T10:00:00.000Z',
    durationDays: 3,
    startLocation: 'Cascate del Mulino - Saturnia (GR)',
    endLocation: 'Pitigliano e Capalbio (GR)',
    waypoints: ['Saturnia', 'Pitigliano', 'Sorano', 'Capalbio', 'Parco dell’Uccellina'],
    travelStyle: 'Natura & Terme',
    interests: ['Terme & Relax', 'Borghi del Tufo', 'Natura'],
    totalKm: '120 km',
    status: 'approved',
    source: 'rolly_curated',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'
    ],
    days: [
      {
        dayNumber: 1,
        title: 'Tappa 1: Terme di Saturnia & Cascate del Mulino',
        description: 'Bagno rigenerante nelle celebri terme sulforee all’aperto a 37.5°C immerse nella campagna maremmana.',
        stopPlaceName: 'Area Camper Alveare del Pinzi (Saturnia)',
        drivingSegment: '20 km',
        activities: ['Bagno alle Cascate del Mulino', 'Relax sul prato', 'Cena maremmana con pici e acquacotta'],
        camperTips: 'L’area L’Alveare del Pinzi dista soli 15 minuti a piedi dalle Cascate del Mulino con navetta attiva.',
        stopCoordinate: { lat: 42.648, lng: 11.513, label: 'Saturnia' },
        imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80'
      },
      {
        dayNumber: 2,
        title: 'Tappa 2: I Borghi del Tufo - Pitigliano & Sorano',
        description: 'La scenografica vista di Pitigliano scolpita nella rupe di tufo, la Piccola Gerusalemme e le vie cave etrusche.',
        stopPlaceName: 'Area Sosta Camper Pitigliano (Piazza del Mercato)',
        drivingSegment: '30 km (circa 35 min)',
        activities: ['Esplorazione delle Vie Cave Etrusche', 'Giro nel quartiere ebraico di Pitigliano'],
        camperTips: 'Vista notturna illuminata di Pitigliano da non perdere. Area sosta ben segnalata.',
        stopCoordinate: { lat: 42.634, lng: 11.666, label: 'Pitigliano' },
        imageUrl: 'https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80'
      },
      {
        dayNumber: 3,
        title: 'Tappa 3: Giardino dei Tarocchi & Capalbio',
        description: 'Arte surreale nel magico Giardino dei Tarocchi di Niki de Saint Phalle e passeggiata sulle mura di Capalbio.',
        stopPlaceName: 'Area Camper Capalbio Marina',
        drivingSegment: '45 km (circa 50 min)',
        activities: ['Visita al Giardino dei Tarocchi', 'Spiaggia incontaminata dell’Ultima Spiaggia'],
        camperTips: 'Sosta comoda vicino al mare. Il Giardino dei Tarocchi richiede la prenotazione del biglietto orario.',
        stopCoordinate: { lat: 42.458, lng: 11.421, label: 'Capalbio' },
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'
      }
    ]
  },
  {
    id: 'rolly_curated_5',
    title: 'Laghi Lombardi e Prealpi Incantate',
    description: 'Un viaggio elegante tra le ville e le acque scintillanti del Lago di Como, Lago d’Iseo con Montisola e il Garda Trentino.',
    authorName: 'Rolly AI 🤖',
    createdAt: '2026-01-28T10:00:00.000Z',
    durationDays: 4,
    startLocation: 'Como & Lecco (CO)',
    endLocation: 'Riva del Garda (TN)',
    waypoints: ['Como', 'Bellagio', 'Lago d’Iseo', 'Monte Isola', 'Riva del Garda'],
    travelStyle: 'Panoramico & Laghi',
    interests: ['Laghi & Spiagge', 'Borghi & Ville', 'Natura'],
    totalKm: '190 km',
    status: 'approved',
    source: 'rolly_curated',
    imageUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'
    ],
    days: [
      {
        dayNumber: 1,
        title: 'Tappa 1: Lago di Como & Bellagio',
        description: 'Navigazione tra Como e Bellagio, giardini di Villa Melzi e passeggiata sulle sponde del Lario.',
        stopPlaceName: 'Area Sosta Camper Mandello del Lario',
        drivingSegment: '55 km',
        activities: ['Traghetto da Bellagio a Varenna', 'Passeggiata degli Innamorati a Varenna'],
        camperTips: 'Utilizzare la sponda lecchese (SS36) per la guida camper più agevole senza strettoie severe.',
        stopCoordinate: { lat: 45.918, lng: 9.320, label: 'Mandello del Lario' },
        imageUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80'
      },
      {
        dayNumber: 2,
        title: 'Tappa 2: Lago d’Iseo & Franciacorta',
        description: 'Lungo le bollicine della Franciacorta fino a Sulzano e traghetto per Monte Isola, l’isola lacustre più grande d’Europa.',
        stopPlaceName: 'Area Camper Iseo / Camping Sassabanek',
        drivingSegment: '65 km (circa 1h 10m)',
        activities: ['Giro in bicicletta a Monte Isola', 'Degustazione bollicine in Franciacorta'],
        camperTips: 'L’isola di Monte Isola è priva di auto: sosta ideale ad Iseo e battello ogni 15 minuti.',
        stopCoordinate: { lat: 45.660, lng: 10.052, label: 'Iseo' },
        imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80'
      },
      {
        dayNumber: 3,
        title: 'Tappa 3: Val Sabbia & Lago d’Idro',
        description: 'Sosta sulle acque tranquille del Lago d’Idro, un’oasi di pace ideale per sport d’acqua e totale relax.',
        stopPlaceName: 'Area Camper Anfo (Lago d’Idro)',
        drivingSegment: '45 km (circa 50 min)',
        activities: ['Visita alla Rocca d’Anfo', 'Passeggiata lungolago'],
        camperTips: 'Area sosta fronte lago molto tranquilla e rilassante.',
        stopCoordinate: { lat: 45.768, lng: 10.495, label: 'Lago d’Idro' },
        imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80'
      },
      {
        dayNumber: 4,
        title: 'Tappa 4: Riva del Garda & Cascata del Varone',
        description: 'Ingresso nel Trentino tra le fucine di pietra di Riva del Garda, sentiero del Ponale e spettacolare Cascata del Varone.',
        stopPlaceName: 'Area Camper Brione (Riva del Garda)',
        drivingSegment: '35 km (circa 40 min)',
        activities: ['Passeggiata sul Sentiero del Ponale', 'Visita alle gola della Cascata del Varone'],
        camperTips: 'L’area camper Brione a Riva del Garda è moderna, automatizzata e vicinissima alla ciclabile del lago.',
        stopCoordinate: { lat: 45.885, lng: 10.841, label: 'Riva del Garda' },
        imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'
      }
    ]
  }
];

// Generates special Rolly Itineraries dynamically for every week of the year
export const ROLLY_52_WEEKLY_CATALOG = [
  {
    week: 1,
    title: "Le Terme e i Borghi del Tufo nella Tuscia Laziale",
    desc: "Inizio d'anno tra sorgenti termali calde naturali, necropoli etrusche e le vie cave di Pitigliano e Sorano.",
    start: "Viterbo (VT)",
    end: "Pitigliano (GR)",
    days: 4,
    km: "115 km",
    imageUrl: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Terme dei Papi & Viterbo Medievale", lat: 42.417, lng: 12.108, img: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=800&q=80" },
      { name: "Civita di Bagnoregio la Città che Muore", lat: 42.628, lng: 12.113, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" },
      { name: "Bolsena & Lungolago", lat: 42.645, lng: 11.986, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
      { name: "Pitigliano & Vie Cave nel Tufo", lat: 42.634, lng: 11.666, img: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 2,
    title: "I Castelli della Val d'Aosta e il Fascino del Bianco",
    desc: "Tra le imponenti fortezze di Fénis e Bard fino ai paesaggi innevati del Gran Paradiso.",
    start: "Forte di Bard (AO)",
    end: "Cogne & Lillaz (AO)",
    days: 3,
    km: "95 km",
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Forte di Bard & Donnas", lat: 45.603, lng: 7.744, img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80" },
      { name: "Castello di Fénis", lat: 45.737, lng: 7.489, img: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80" },
      { name: "Cogne & Cascate di Lillaz", lat: 45.608, lng: 7.355, img: "https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 3,
    title: "Le Langhe e il Roero: Colline UNESCO e Grandi Vini",
    desc: "Tra vigneti pettinati, panchine giganti e borghi storici come Alba, Barolo e La Morra.",
    start: "Alba (CN)",
    end: "Monforte d'Alba (CN)",
    days: 4,
    km: "85 km",
    imageUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Alba Capitale del Tartufo", lat: 44.698, lng: 8.035, img: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80" },
      { name: "Barolo & Castello Falletti", lat: 44.610, lng: 7.942, img: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=800&q=80" },
      { name: "La Morra & Belvedere Panoramico", lat: 44.639, lng: 7.933, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" },
      { name: "Monforte d'Alba & Auditorium Horszowski", lat: 44.582, lng: 8.029, img: "https://images.unsplash.com/photo-1528164344705-47542687990d?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 4,
    title: "La Riviera dei Fiori e il Ponente Ligure",
    desc: "Sulla rotta del sole tra Finale Ligure, Cervo sul mare e il borgo antico di Dolceacqua.",
    start: "Finale Ligure (SV)",
    end: "Dolceacqua & Bordighera (IM)",
    days: 4,
    km: "120 km",
    imageUrl: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Finalborgo & Varigotti", lat: 44.172, lng: 8.328, img: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80" },
      { name: "Cervo Ligure il Borgo dei Corallini", lat: 43.926, lng: 8.114, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
      { name: "Sanremo la Città dei Fiori", lat: 43.816, lng: 7.776, img: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80" },
      { name: "Dolceacqua & Ponte dei Doria", lat: 43.850, lng: 7.623, img: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 5,
    title: "I Laghi della Brianza e il Triangolo Lariano",
    desc: "Itinerario rilassante tra il Lago di Como, Bellagio, Varenna e la quiete del Lago di Pusiano.",
    start: "Lecco (LC)",
    end: "Bellagio (CO)",
    days: 3,
    km: "75 km",
    imageUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Lecco & Lungolago Manzoniano", lat: 45.856, lng: 9.390, img: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80" },
      { name: "Varenna & Castello di Vezio", lat: 46.011, lng: 9.283, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" },
      { name: "Bellagio la Perla del Lago", lat: 45.987, lng: 9.262, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 6,
    title: "La Strada del Vino Valpolicella & Lessinia Veronese",
    desc: "Degustazioni di Amarone, ponti naturali di pietra e l'altopiano verde della Lessinia.",
    start: "Negrar di Valpolicella (VR)",
    end: "Ponte di Veja (VR)",
    days: 3,
    km: "65 km",
    imageUrl: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Negrar & San Floriano", lat: 45.531, lng: 10.938, img: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=800&q=80" },
      { name: "Molina & Parco delle Cascate", lat: 45.617, lng: 10.916, img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80" },
      { name: "Ponte di Veja & Parco della Lessinia", lat: 45.606, lng: 10.970, img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 7,
    title: "I Colli Euganei e le Terme di Abano e Montegrotto",
    desc: "Relax termale, abbazie benedettine e il borgo medievale di Arquà Petrarca.",
    start: "Abano Terme (PD)",
    end: "Arquà Petrarca (PD)",
    days: 3,
    km: "55 km",
    imageUrl: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Abano Terme & Parco Urbano Termale", lat: 45.358, lng: 11.789, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" },
      { name: "Abbazia di Praglia", lat: 45.365, lng: 11.716, img: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=800&q=80" },
      { name: "Arquà Petrarca & Casa del Poeta", lat: 45.270, lng: 11.722, img: "https://images.unsplash.com/photo-1528164344705-47542687990d?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 8,
    title: "Il Delta del Po e le Valli di Comacchio",
    desc: "Un viaggio magico tra fenicotteri rosa, canali d'acqua dolce, ponti secenteschi e spiagge selvagge.",
    start: "Comacchio (FE)",
    end: "Porto Tolle (RO)",
    days: 4,
    km: "110 km",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Comacchio & Trepponti", lat: 44.693, lng: 12.181, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
      { name: "Saline di Comacchio & Fenicotteri", lat: 44.675, lng: 12.210, img: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80" },
      { name: "Abbazia di Pomposa", lat: 44.832, lng: 12.176, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" },
      { name: "Sacca di Scardovari & Porto Tolle", lat: 44.882, lng: 12.395, img: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 9,
    title: "La Val Trebbia e l'Appennino Piacentino",
    desc: "Definita da Hemingway 'la valle più bella del mondo', tra Bobbio, il Ponte Gobbo e borghi fortificati.",
    start: "Rivergaro (PC)",
    end: "Bobbio (PC)",
    days: 3,
    km: "70 km",
    imageUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Castello di Rivalta", lat: 44.951, lng: 9.593, img: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=800&q=80" },
      { name: "Bobbio & Ponte del Diavolo", lat: 44.770, lng: 9.387, img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80" },
      { name: "Mezzano Scotti & Meandri del Trebbia", lat: 44.796, lng: 9.467, img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 10,
    title: "La Riviera del Conero e i Borghi delle Marche",
    desc: "Tra la falesia bianca a picco sull'Adriatico, Sirolo, Numana e le Grotte sotterranee di Frasassi.",
    start: "Genga & Frasassi (AN)",
    end: "Sirolo & Monte Conero (AN)",
    days: 4,
    km: "130 km",
    imageUrl: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Grotte di Frasassi & Tempio del Valadier", lat: 43.401, lng: 12.964, img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80" },
      { name: "Recanati & Colle dell'Infinito", lat: 43.403, lng: 13.550, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" },
      { name: "Sirolo & Spiaggia delle Due Sorelle", lat: 43.518, lng: 13.615, img: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80" },
      { name: "Portonovo & Baia del Conero", lat: 43.560, lng: 13.589, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 11,
    title: "L'Umbria Verde: Lago Trasimeno, Assisi & Marmore",
    desc: "Cuore verde d'Italia tra acque calme, spiritualità, borghi d'arte e il getto imponente delle Marmore.",
    start: "Castiglione del Lago (PG)",
    end: "Terni & Cascata delle Marmore (TR)",
    days: 5,
    km: "160 km",
    imageUrl: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Lago Trasimeno & Passignano", lat: 43.128, lng: 12.136, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" },
      { name: "Assisi & Basilica di San Francesco", lat: 43.070, lng: 12.617, img: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=800&q=80" },
      { name: "Spello il Borgo dei Fiori", lat: 42.991, lng: 12.671, img: "https://images.unsplash.com/photo-1528164344705-47542687990d?auto=format&fit=crop&w=800&q=80" },
      { name: "Cascata delle Marmore & Valnerina", lat: 42.551, lng: 12.716, img: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 12,
    title: "Il Parco Nazionale d'Abruzzo, Scanno e la Val di Sangro",
    desc: "Sulle tracce dell'orso bruno marsicano, tra il lago a forma di cuore di Scanno e la faggeta di Opi.",
    start: "Pescasseroli (AQ)",
    end: "Lago di Scanno (AQ)",
    days: 4,
    km: "90 km",
    imageUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Pescasseroli Centro Parco", lat: 41.794, lng: 13.789, img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80" },
      { name: "Opi & Val Fondillo", lat: 41.782, lng: 13.829, img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80" },
      { name: "Villetta Barrea & Cervi sul Lago", lat: 41.776, lng: 13.937, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" },
      { name: "Lago di Scanno & Sentiero del Cuore", lat: 41.916, lng: 13.876, img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 13,
    title: "La Costa dei Trabocchi e le Colline Chietine",
    desc: "Lungo l'antica ferrovia ora ciclabile vista mare, tra macchine da pesca in legno e arrosticini.",
    start: "Ortona (CH)",
    end: "Vasto Marina (CH)",
    days: 3,
    km: "60 km",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Ortona & Castello Aragonese", lat: 42.355, lng: 14.403, img: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=800&q=80" },
      { name: "San Vito Chietino & Trabocco Turchino", lat: 42.302, lng: 14.444, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
      { name: "Riserva Naturale di Punta Aderci", lat: 42.181, lng: 14.686, img: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80" },
      { name: "Vasto & Golfo d'Oro", lat: 42.112, lng: 14.708, img: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 14,
    title: "Il Promontorio del Gargano e la Foresta Umbra",
    desc: "Dalla magica falesia di Vieste al silenzio secolare dei faggi della Foresta Umbra e San Giovanni Rotondo.",
    start: "Peschici (FG)",
    end: "Vieste & Baia delle Zagare (FG)",
    days: 5,
    km: "145 km",
    imageUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Peschici la Città Bianca sul Mare", lat: 41.946, lng: 16.014, img: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80" },
      { name: "Foresta Umbra Riserva UNESCO", lat: 41.815, lng: 15.992, img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80" },
      { name: "Vieste & Pizzomunno", lat: 41.882, lng: 16.180, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
      { name: "Baia delle Zagare & Faraglioni", lat: 41.758, lng: 16.147, img: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 15,
    title: "La Costa del Cilento: Da Paestum a Palinuro",
    desc: "Templi dorici della Magna Grecia, grotte marine turchesi e la quiete incontaminata di Marina di Camerota.",
    start: "Paestum (SA)",
    end: "Marina di Camerota (SA)",
    days: 5,
    km: "125 km",
    imageUrl: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Templi di Paestum & Mozzarella di Bufala", lat: 40.421, lng: 15.005, img: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=800&q=80" },
      { name: "Acciaroli & Pioppi Patria Dieta Mediterranea", lat: 40.178, lng: 15.027, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
      { name: "Capo Palinuro & Arco Naturale", lat: 40.033, lng: 15.281, img: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80" },
      { name: "Marina di Camerota & Baia Infreschi", lat: 39.998, lng: 15.378, img: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 16,
    title: "La Basilicata Misteriosa: Matera e le Piccole Dolomiti Lucane",
    desc: "Dai Sassi millenari scavati nella calcarenite fino al Volo dell'Angelo tra Pietrapertosa e Castelmezzano.",
    start: "Matera (MT)",
    end: "Castelmezzano (PZ)",
    days: 4,
    km: "110 km",
    imageUrl: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Matera Sassi & Parco della Murgia", lat: 40.666, lng: 16.608, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" },
      { name: "Craco la Città Fantasma", lat: 40.379, lng: 16.440, img: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=800&q=80" },
      { name: "Pietrapertosa & Vetta Lucana", lat: 40.518, lng: 16.062, img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80" },
      { name: "Castelmezzano Borgo Presepe", lat: 40.530, lng: 16.046, img: "https://images.unsplash.com/photo-1528164344705-47542687990d?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 17,
    title: "La Sicilia Orientale: Taormina, l'Etna e Ortigia",
    desc: "Tra la lava nera dell'Etna a oltre 2000m, il Teatro Antico di Taormina e il barocco dorato di Siracusa.",
    start: "Taormina (ME)",
    end: "Siracusa & Ortigia (SR)",
    days: 5,
    km: "170 km",
    imageUrl: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Taormina & Giardini Naxos", lat: 37.852, lng: 15.286, img: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=800&q=80" },
      { name: "Rifugio Sapienza & Crateri Etna", lat: 37.699, lng: 14.998, img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80" },
      { name: "Aci Trezza & Faraglioni dei Ciclopi", lat: 37.562, lng: 15.161, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
      { name: "Siracusa & Isola di Ortigia", lat: 37.060, lng: 15.293, img: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 18,
    title: "La Sicilia Occidentale: San Vito Lo Capo e le Saline di Trapani",
    desc: "La sabbia corallina di San Vito, la riserva dello Zingaro, il tempio dorico di Segesta e i mulini a vento.",
    start: "Castellammare del Golfo (TP)",
    end: "Trapani & Saline di Marsala (TP)",
    days: 5,
    km: "140 km",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Scopello & Faraglioni della Tonnara", lat: 38.072, lng: 12.822, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
      { name: "San Vito Lo Capo Spiaggia Caraibica", lat: 38.176, lng: 12.734, img: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80" },
      { name: "Erice Borgo Medievale in Quota", lat: 38.037, lng: 12.587, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" },
      { name: "Saline di Trapani e Laguna dello Stagnone", lat: 37.868, lng: 12.472, img: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 19,
    title: "Il Nord della Sardegna: Stintino, Castelsardo e Gallura",
    desc: "Dall'acqua trasparente della Pelosa alla rocca sul mare di Castelsardo fino alle rocce di Capo Testa.",
    start: "Stintino (SS)",
    end: "Santa Teresa Gallura (SS)",
    days: 5,
    km: "155 km",
    imageUrl: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Stintino & La Pelosa", lat: 40.963, lng: 8.209, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
      { name: "Castelsardo Borgo Antico", lat: 40.914, lng: 8.712, img: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80" },
      { name: "Isola Rossa & Costa Paradiso", lat: 41.011, lng: 8.874, img: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80" },
      { name: "Capo Testa & Santa Teresa", lat: 41.242, lng: 9.146, img: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 20,
    title: "Il Golfo di Orosei e l'Ogliastra in Sardegna",
    desc: "Scogliere selvagge, le dune di sabbia di Capo Comino e le gole spettacolari di Su Gorropu.",
    start: "San Teodoro (SS)",
    end: "Cala Gonone & Baunei (NU)",
    days: 5,
    km: "135 km",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "San Teodoro & Spiaggia La Cinta", lat: 40.778, lng: 9.673, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
      { name: "Orosei & Oasi di Biderosa", lat: 40.380, lng: 9.700, img: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80" },
      { name: "Cala Gonone & Grotte del Bue Marino", lat: 40.281, lng: 9.636, img: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80" },
      { name: "Altopiano del Golgo & Baunei", lat: 40.082, lng: 9.673, img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 21,
    title: "Il Salento dei Due Mari: Da Otranto a Gallipoli",
    desc: "Dall'alba sulla punta più a est d'Italia a Punta Palascia fino al tramonto sulle mura di Gallipoli e Leuca.",
    start: "Otranto (LE)",
    end: "Gallipoli (LE)",
    days: 5,
    km: "140 km",
    imageUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Otranto & Cava di Bauxite", lat: 40.146, lng: 18.490, img: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80" },
      { name: "Santa Cesarea Terme & Castro Marina", lat: 40.035, lng: 18.461, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
      { name: "Santa Maria di Leuca Finibus Terrae", lat: 39.799, lng: 18.358, img: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80" },
      { name: "Gallipoli la Città Bella", lat: 40.056, lng: 17.992, img: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 22,
    title: "Le Gole dell'Alcantara e i Nebrodi in Sicilia",
    desc: "Formazioni basaltiche prismatiche scavate dall'acqua gelida e la foresta verde dei monti Nebrodi.",
    start: "Giardini Naxos (ME)",
    end: "Cesarò & Lago Biviere (ME)",
    days: 4,
    km: "110 km",
    imageUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Gole dell'Alcantara & Motta Camastra", lat: 37.879, lng: 15.176, img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80" },
      { name: "Castiglione di Sicilia Borgo Medievale", lat: 37.882, lng: 15.120, img: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=800&q=80" },
      { name: "Randazzo la Città Nera", lat: 37.918, lng: 14.945, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 23,
    title: "La Val Pusteria e le Valli di Tures e Aurina",
    desc: "Castelli tirolesi, le cascate di Riva e la quiete montana al confine settentrionale d'Italia.",
    start: "Brunico (BZ)",
    end: "Campo Tures & Predoi (BZ)",
    days: 4,
    km: "80 km",
    imageUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Brunico & Plan de Corones", lat: 46.796, lng: 11.936, img: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80" },
      { name: "Castel Taufers & Cascate di Riva", lat: 46.919, lng: 11.954, img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80" },
      { name: "Predoi & Miniera di Rame", lat: 47.042, lng: 12.106, img: "https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 24,
    title: "Il Lago Maggiore, le Isole Borromee e la Val Formazza",
    desc: "Dalle rive fiorite di Stresa fino al salto spettacolare di 143 metri della Cascata del Toce.",
    start: "Arona & Stresa (VB)",
    end: "Cascata del Toce & Val Formazza (VB)",
    days: 4,
    km: "115 km",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Arona & Statua del San Carlone", lat: 45.760, lng: 8.560, img: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80" },
      { name: "Stresa & Isole Borromee", lat: 45.885, lng: 8.540, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
      { name: "Cascata del Toce a Formazza", lat: 46.406, lng: 8.414, img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 25,
    title: "La Costa dei Trabocchi e il Parco della Majella",
    desc: "Dall'azzurro dell'Adriatico di Fossacesia fino all'eremo scavato nella roccia di San Bartolomeo.",
    start: "Fossacesia Marina (CH)",
    end: "Caramanico Terme & Majella (PE)",
    days: 4,
    km: "105 km",
    imageUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Abbazia di San Giovanni in Venere", lat: 42.241, lng: 14.498, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" },
      { name: "Guardiagrele la Città della Pietra", lat: 42.219, lng: 14.221, img: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=800&q=80" },
      { name: "Caramanico Terme & Valle dell'Orfento", lat: 42.158, lng: 14.004, img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 26,
    title: "Le Cinque Terre e il Golfo dei Poeti",
    desc: "Tra i vigneti terrazzati a picco sul mare di Riomaggiore, Porto Venere e il borgo di Lerici.",
    start: "Levanto (SP)",
    end: "Porto Venere & Lerici (SP)",
    days: 4,
    km: "85 km",
    imageUrl: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Levanto la Porta delle Cinque Terre", lat: 44.170, lng: 9.613, img: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80" },
      { name: "Monterosso al Mare", lat: 44.145, lng: 9.654, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
      { name: "Porto Venere & Chiesa di San Pietro", lat: 44.050, lng: 9.833, img: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 27,
    title: "Il Gran Sasso e il Piccolo Tibet di Campo Imperatore",
    desc: "L'altopiano sconfinato a 1800m, Rocca Calascio al tramonto e i borghi medievali di Santo Stefano di Sessanio.",
    start: "Santo Stefano di Sessanio (AQ)",
    end: "Campo Imperatore & Fonte Vetica (AQ)",
    days: 3,
    km: "75 km",
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Santo Stefano di Sessanio", lat: 42.343, lng: 13.662, img: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=800&q=80" },
      { name: "Rocca Calascio & Castello delle Aquile", lat: 42.329, lng: 13.693, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" },
      { name: "Campo Imperatore & Arrosticini a Fonte Vetica", lat: 42.443, lng: 13.558, img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 28,
    title: "Il Parco Nazionale del Pollino tra Basilicata e Calabria",
    desc: "I pini loricati millenari, le gole del Raganello e i borghi arbereshe di Civita.",
    start: "Rotonda (PZ)",
    end: "Civita & Gole del Raganello (CS)",
    days: 4,
    km: "95 km",
    imageUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Rotonda Sede del Parco", lat: 39.954, lng: 16.039, img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80" },
      { name: "Colle dell'Impiso & Pini Loricati", lat: 39.919, lng: 16.186, img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80" },
      { name: "Civita & Ponte del Diavolo", lat: 39.831, lng: 16.314, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 29,
    title: "I Laghi della Carinzia e il Tarvisiano in Friuli",
    desc: "Laghi alpini di Fusine dai colori smeraldo, la foresta millenaria di Tarvisio e il Santuario del Monte Lussari.",
    start: "Venzone la Città della Lavanda (UD)",
    end: "Laghi di Fusine & Tarvisio (UD)",
    days: 4,
    km: "100 km",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Venzone Monumento Nazionale", lat: 46.332, lng: 13.139, img: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=800&q=80" },
      { name: "Monte Lussari con la Cabinovia", lat: 46.516, lng: 13.528, img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80" },
      { name: "Laghi di Fusine Superiore e Inferiore", lat: 46.478, lng: 13.667, img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 30,
    title: "La Val di Non e i Canyon del Trentino",
    desc: "Il Lago di Tovel famoso per le sue acque turchesi, il Santuario di San Romedio e il Canyon Rio Sass.",
    start: "Cles (TN)",
    end: "Lago di Tovel (TN)",
    days: 3,
    km: "65 km",
    imageUrl: "https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Cles & Lago di Santa Giustina", lat: 46.365, lng: 11.036, img: "https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=800&q=80" },
      { name: "Santuario di San Romedio sulla Rupe", lat: 46.363, lng: 11.119, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" },
      { name: "Lago di Tovel Cuore del Brenta", lat: 46.261, lng: 10.949, img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 31,
    title: "Il Lago d'Iseo, Montisola e le Piramidi di Zone",
    desc: "L'isola lacustre più grande d'Europa, la Franciacorta e le curiose piramidi di terra di Zone.",
    start: "Iseo & Franciacorta (BS)",
    end: "Zone & Pisogne (BS)",
    days: 3,
    km: "60 km",
    imageUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Iseo & Riserva Torbiere del Sebino", lat: 45.659, lng: 10.050, img: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80" },
      { name: "Sulzano & Traghetto per Montisola", lat: 45.691, lng: 10.100, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
      { name: "Piramidi di Terra di Zone", lat: 45.761, lng: 10.117, img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 32,
    title: "Il Monte Amiata e la Val d'Orcia Segreta",
    desc: "La vetta vulcanica coperta di faggi, i bagni termali di Bagni San Filippo e l'Abbazia di Sant'Antimo.",
    start: "Abbadia San Salvatore (SI)",
    end: "Bagno Vignoni (SI)",
    days: 4,
    km: "90 km",
    imageUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Abbadia San Salvatore & Vetta Amiata", lat: 42.880, lng: 11.676, img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80" },
      { name: "Bagni San Filippo & Balena Bianca", lat: 42.928, lng: 11.701, img: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=800&q=80" },
      { name: "Bagno Vignoni & Piazza delle Sorgenti", lat: 43.029, lng: 11.620, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 33,
    title: "Le Grotte di Castellana e l'Anello dei Trulli in Valle d'Itria",
    desc: "Un tuffo nella magia bianca di Alberobello, la scogliera di Polignano a Mare e le stalattiti di Castellana.",
    start: "Polignano a Mare (BA)",
    end: "Ostuni la Città Bianca (BR)",
    days: 4,
    km: "135 km",
    imageUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Polignano a Mare & Monopoli", lat: 40.996, lng: 17.218, img: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80" },
      { name: "Grotte di Castellana & Alberobello", lat: 40.783, lng: 17.236, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" },
      { name: "Locorotondo & Ostuni", lat: 40.728, lng: 17.578, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 34,
    title: "La Costa Viola e lo Stretto di Scilla in Calabria",
    desc: "Il borgo marinaro di Chianalea di Scilla, il monte Sant'Elia e le acque limpide di Bagnara Calabra.",
    start: "Palmi & Marinella (RC)",
    end: "Scilla & Reggio Calabria (RC)",
    days: 4,
    km: "90 km",
    imageUrl: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Palmi & Monte Sant'Elia", lat: 38.358, lng: 15.850, img: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=800&q=80" },
      { name: "Scilla Chianalea dei Pescatori", lat: 38.253, lng: 15.717, img: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80" },
      { name: "Reggio Calabria & Bronzi di Riace", lat: 38.111, lng: 15.648, img: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 35,
    title: "Il Barocco del Val di Noto e le Spiagge di Vendicari",
    desc: "I capolavori barocchi di Noto, Modica e Ragusa Ibla uniti alla riserva naturale dei fenicotteri di Vendicari.",
    start: "Noto (SR)",
    end: "Ragusa Ibla & Scicli (RG)",
    days: 5,
    km: "125 km",
    imageUrl: "https://images.unsplash.com/photo-1528164344705-47542687990d?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Noto Capitale del Barocco", lat: 36.892, lng: 15.068, img: "https://images.unsplash.com/photo-1528164344705-47542687990d?auto=format&fit=crop&w=800&q=80" },
      { name: "Oasi Faunistica di Vendicari & Marzamemi", lat: 36.786, lng: 15.093, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
      { name: "Modica la Città del Cioccolato", lat: 36.858, lng: 14.762, img: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=800&q=80" },
      { name: "Ragusa Ibla & Scicli", lat: 36.925, lng: 14.743, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 36,
    title: "La Costa Verde e le Dune di Piscinas in Sardegna",
    desc: "Miniere abbandonate di Ingurtosu, dune di sabbia dorata alte 60 metri e mare aperto selvaggio.",
    start: "Buggerru & Cala Domestica (SU)",
    end: "Piscinas & Montevecchio (SU)",
    days: 4,
    km: "95 km",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Buggerru & Galleria Henry", lat: 39.398, lng: 8.441, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
      { name: "Cala Domestica & Falesie", lat: 39.373, lng: 8.380, img: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80" },
      { name: "Dune di Piscinas & Ingurtosu", lat: 39.542, lng: 8.455, img: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 37,
    title: "Il Montefeltro e la Valle del Metauro tra Marche e Romagna",
    desc: "La città ideale di Urbino di Raffaello, la fortezza inespugnabile di San Leo e la gola del Furlo.",
    start: "San Leo (RN)",
    end: "Gola del Furlo & Fossombrone (PU)",
    days: 4,
    km: "110 km",
    imageUrl: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "San Leo & Rocca di Cagliostro", lat: 43.897, lng: 12.343, img: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=800&q=80" },
      { name: "Urbino Patrimonio UNESCO", lat: 43.726, lng: 12.636, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" },
      { name: "Riserva Naturale Statale Gola del Furlo", lat: 43.649, lng: 12.724, img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 38,
    title: "L'Anello dei Trulli e delle Grotte di Castellana in Puglia",
    desc: "Un tuffo nella magia bianca di Alberobello, la scogliera di Polignano a Mare e le stalattiti di Castellana.",
    start: "Polignano a Mare (BA)",
    end: "Ostuni la Città Bianca (BR)",
    days: 4,
    km: "135 km",
    imageUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Polignano a Mare & Monopoli", lat: 40.996, lng: 17.218, img: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80" },
      { name: "Grotte di Castellana & Alberobello", lat: 40.783, lng: 17.236, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" },
      { name: "Locorotondo & Ostuni", lat: 40.728, lng: 17.578, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 39,
    title: "I Boschi del Casentino e i Santuari della Verna e Camaldoli",
    desc: "Foliage autunnale, foreste secolari, il silenzio di San Francesco alla Verna e i castelli di Poppi.",
    start: "Poppi & Castello dei Conti Guidi (AR)",
    end: "Santuario della Verna & Camaldoli (AR)",
    days: 3,
    km: "75 km",
    imageUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Poppi & Eremo di Camaldoli", lat: 43.834, lng: 11.758, img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80" },
      { name: "Santuario Francescano della Verna", lat: 43.708, lng: 11.933, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" }
    ]
  },
  {
    week: 40,
    title: "La Val Gardena, l'Alpe di Siusi e il Foliage Dolomitico",
    desc: "Il magico contrasto tra larici dorati d'autunno e le vette innevate del Sassolungo e del Gruppo del Sella.",
    start: "Ortisei (BZ)",
    end: "Alpe di Siusi & Castelrotto (BZ)",
    days: 4,
    km: "85 km",
    imageUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80",
    stops: [
      { name: "Ortisei & Seceda", lat: 46.575, lng: 11.671, img: "https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=800&q=80" },
      { name: "Alpe di Siusi & Compatsch", lat: 46.541, lng: 11.616, img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80" },
      { name: "Castelrotto & Siusi allo Sciliar", lat: 46.568, lng: 11.559, img: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80" }
    ]
  }
];

export function buildItineraryFromCatalogItem(item: any, isCurrentWeek: boolean): CommunityItinerary {
  return {
    id: `rolly_weekly_special_w${item.week}`,
    title: isCurrentWeek 
      ? `🌟 Itinerario Rolly della Settimana #${item.week}: ${item.title}`
      : `Itinerario Rolly Settimana #${item.week}: ${item.title}`,
    description: item.desc,
    authorName: isCurrentWeek ? 'Rolly AI 🤖 (Speciale Settimanale)' : 'Rolly AI 🤖',
    createdAt: new Date(Date.now() - (38 - item.week) * 7 * 24 * 3600 * 1000).toISOString(),
    durationDays: item.days,
    startLocation: item.start,
    endLocation: item.end,
    waypoints: item.stops.map((s: any) => s.name),
    travelStyle: 'Proposta Settimanale Rolly AI',
    interests: ['Natura', 'Borghi', 'Panorami', 'Cultura'],
    totalKm: item.km,
    status: 'approved',
    source: 'rolly_weekly',
    isWeeklySpecial: isCurrentWeek,
    weeklyBadgeText: isCurrentWeek 
      ? `Proposta Rolly Settimana ${item.week} (In Corso)`
      : `Proposta Rolly Settimana ${item.week}`,
    imageUrl: item.imageUrl,
    days: item.stops.map((stop: any, idx: number) => ({
      dayNumber: idx + 1,
      title: `Giorno ${idx + 1}: ${stop.name}`,
      description: `Esplorazione consigliata da Rolly per la tappa di ${stop.name}. Sosta consigliata e percorsi sicuri per il tuo camper.`,
      stopPlaceName: `Area Sosta Camper ${stop.name}`,
      drivingSegment: `30-45 km tra le tappe`,
      activities: [`Passeggiata nel borgo di ${stop.name}`, `Scatto panoramico`, `Prodotti tipici locali`],
      camperTips: `Verifica sempre le restrizioni di sagoma e altezza. Area sosta comoda con Carico/Scarico.`,
      stopCoordinate: { lat: stop.lat, lng: stop.lng, label: stop.name },
      imageUrl: stop.img
    }))
  };
}

export function getWeeklySpecialRollyItinerary(): CommunityItinerary {
  const epoch = new Date('2026-01-01T00:00:00Z').getTime();
  const now = new Date().getTime();
  const currentWeek = Math.max(1, Math.min(52, Math.floor((now - epoch) / (7 * 24 * 60 * 60 * 1000)) + 1));
  
  const catalogItem = ROLLY_52_WEEKLY_CATALOG.find(c => c.week === currentWeek) || ROLLY_52_WEEKLY_CATALOG[ROLLY_52_WEEKLY_CATALOG.length - 1];
  return buildItineraryFromCatalogItem(catalogItem, true);
}

export function getAllRollyCuratedItineraries(): CommunityItinerary[] {
  const epoch = new Date('2026-01-01T00:00:00Z').getTime();
  const now = new Date().getTime();
  const currentWeek = Math.max(1, Math.min(52, Math.floor((now - epoch) / (7 * 24 * 60 * 60 * 1000)) + 1));

  // 1. Featured current week proposal
  const currentWeekItem = ROLLY_52_WEEKLY_CATALOG.find(c => c.week === currentWeek) || ROLLY_52_WEEKLY_CATALOG[ROLLY_52_WEEKLY_CATALOG.length - 1];
  const featuredWeekly = buildItineraryFromCatalogItem(currentWeekItem, true);

  // 2. All past published weekly proposals from week (currentWeek - 1) down to week 1
  const pastWeeklies = ROLLY_52_WEEKLY_CATALOG
    .filter(c => c.week < currentWeek)
    .sort((a, b) => b.week - a.week)
    .map(c => buildItineraryFromCatalogItem(c, false));

  // 3. Any upcoming catalog items ready for future weeks
  const futureCatalog = ROLLY_52_WEEKLY_CATALOG
    .filter(c => c.week > currentWeek)
    .sort((a, b) => a.week - b.week)
    .map(c => buildItineraryFromCatalogItem(c, false));

  return [featuredWeekly, ...pastWeeklies, ...futureCatalog, ...INITIAL_ROLLY_CURATED_ITINERARIES];
}

