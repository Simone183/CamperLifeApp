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

// Generates 1 special new Rolly Itinerary dynamically every week based on current date!
export function getWeeklySpecialRollyItinerary(): CommunityItinerary {
  const epoch = new Date('2026-01-01T00:00:00Z').getTime();
  const now = new Date().getTime();
  const weekNum = Math.floor((now - epoch) / (7 * 24 * 60 * 60 * 1000)) + 1;

  const weeklyPool = [
    {
      title: "I Castelli e la Natura Selvaggia della Valle d’Aosta",
      desc: "Dalle imponenti fortezze medievali di Fénis e Bard fino ai maestosi paesaggi del Gran Paradiso.",
      start: "Forte di Bard (AO)",
      end: "Cogne & Gran Paradiso (AO)",
      days: 4,
      km: "110 km",
      imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
      stops: [
        { name: "Forte di Bard & Donnas", lat: 45.603, lng: 7.744, img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80" },
        { name: "Castello di Fénis", lat: 45.737, lng: 7.489, img: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80" },
        { name: "Cogne & Cascati di Lillaz", lat: 45.608, lng: 7.355, img: "https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=800&q=80" }
      ]
    },
    {
      title: "L’Anello dei Trulli e delle Grotte di Castellana in Puglia",
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
      title: "La Riviera Ligure di Ponente & I Borghi degli Ulivi",
      desc: "Sulla rotta dei fiori tra Finale Ligure, Cervo con la sua chiesa sul mare e il principato di Seborga.",
      start: "Finale Ligure (SV)",
      end: "Sanremo & Seborga (IM)",
      days: 3,
      km: "95 km",
      imageUrl: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80",
      stops: [
        { name: "Finalborgo & Noli", lat: 44.172, lng: 8.328, img: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80" },
        { name: "Cervo Ligure sul mare", lat: 43.926, lng: 8.114, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
        { name: "Sanremo & Principato di Seborga", lat: 43.816, lng: 7.776, img: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80" }
      ]
    },
    {
      title: "L’Umbria Verde: Lago Trasimeno, Assisi & Cascate delle Marmore",
      desc: "Cuore verde d'Italia tra acque calme, spiritualità, tartufo nero di Norcia e il getto imponente delle Marmore.",
      start: "Castiglione del Lago (PG)",
      end: "Terni & Cascata delle Marmore (TR)",
      days: 5,
      km: "160 km",
      imageUrl: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=1200&q=80",
      stops: [
        { name: "Lago Trasimeno & Passignano", lat: 43.128, lng: 12.136, img: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=800&q=80" },
        { name: "Assisi & Spello", lat: 43.070, lng: 12.617, img: "https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?auto=format&fit=crop&w=800&q=80" },
        { name: "Cascata delle Marmore", lat: 42.551, lng: 12.716, img: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80" }
      ]
    }
  ];

  const template = weeklyPool[(weekNum - 1) % weeklyPool.length];

  return {
    id: `rolly_weekly_special_w${weekNum}`,
    title: `🌟 Itinerario Rolly della Settimana #${weekNum}: ${template.title}`,
    description: template.desc,
    authorName: 'Rolly AI 🤖 (Speciale Settimanale)',
    createdAt: new Date().toISOString(),
    durationDays: template.days,
    startLocation: template.start,
    endLocation: template.end,
    waypoints: template.stops.map(s => s.name),
    travelStyle: 'Speciale Settimanale Rolly',
    interests: ['Natura', 'Borghi', 'Panorami', 'Cultura'],
    totalKm: template.km,
    status: 'approved',
    source: 'rolly_weekly',
    isWeeklySpecial: true,
    weeklyBadgeText: `Proposta Rolly Settimana ${weekNum}`,
    imageUrl: template.imageUrl,
    days: template.stops.map((stop, idx) => ({
      dayNumber: idx + 1,
      title: `Giorno ${idx + 1}: ${stop.name}`,
      description: `Esplorazione consigliata da Rolly per la tappa di ${stop.name}. Sosta consigliata e percorsi sicuri per il tuo camper.`,
      stopPlaceName: `Area Sosta Camper ${stop.name}`,
      drivingSegment: `30-40 km tra le tappe`,
      activities: [`Passeggiata nel borgo di ${stop.name}`, `Scatto panoramico`, `Prodotti tipici locali`],
      camperTips: `Verifica sempre le restrizioni di altezza del tuo veicolo. Sosta comoda con Carico/Scarico.`,
      stopCoordinate: { lat: stop.lat, lng: stop.lng, label: stop.name },
      imageUrl: stop.img
    }))
  };
}

export function getAllRollyCuratedItineraries(): CommunityItinerary[] {
  const weekly = getWeeklySpecialRollyItinerary();
  return [weekly, ...INITIAL_ROLLY_CURATED_ITINERARIES];
}
