import React, { useState, useEffect } from 'react';
import { CartoonCamperAvatar } from './CartoonCamperAvatar';
import { 
  X, 
  Sparkles, 
  Lightbulb
} from 'lucide-react';

export interface SectionGuideData {
  key: string;
  badge: string;
  title: string;
  subtitle: string;
  icon?: any;
  features: {
    icon: string;
    title: string;
    description: string;
  }[];
  rollyTip: string;
}

export const ROLLY_GUIDES: Record<string, SectionGuideData> = {
  map_nav: {
    key: 'map_nav',
    badge: '🗺️ Mappa & Navigatore',
    title: 'Mappa, Soste, Carburante & Navigatore 3D',
    subtitle: 'Trova aree sosta, campeggi, distributori con prezzi aggiornati, sagre e naviga in sicurezza.',
    features: [
      {
        icon: '🚐',
        title: 'Intorno a me & Filtri Soste',
        description: 'Trova subito aree sosta, campeggi, agricampeggi, camper service e parcheggi entro 15 km dal tuo camper o nella località cercata.'
      },
      {
        icon: '⛽',
        title: 'Distributori Carburante con Prezzi Aggiornati',
        description: 'Attiva il pulsante carburante sulla mappa per vedere i distributori vicini con i prezzi aggiornati di Diesel, Benzina e GPL e individuare subito il più economico.'
      },
      {
        icon: '🎪',
        title: 'Sagre ed Eventi su Mappa',
        description: 'Visualizza direttamente sulla mappa le sagre e gli eventi con locandina ufficiale, date e l\'area sosta camper più vicina.'
      },
      {
        icon: '📍',
        title: 'Intorno Sosta (Servizi & Attrazioni)',
        description: 'Scopri ristoranti, supermercati, farmacie e attrazioni attorno a una specifica area sosta.'
      },
      {
        icon: '🧭',
        title: 'Navigatore 3D Sagomato & Proponi Sosta',
        description: 'Avvia il navigatore vocale 3D (Voce uomo o Voce donna) calibrato sulle misure del tuo camper, oppure condividi una nuova sosta con la community.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Attiva i distributori sulla mappa prima di fare rifornimento per risparmiare sul pieno, e verifica sempre le misure del mezzo nella scheda "Il Mio Camper"!'
  },
  diary: {
    key: 'diary',
    badge: '📖 Diario di Bordo',
    title: 'Diario di Bordo, Tappe & Ricordi di Viaggio',
    subtitle: 'Registra itinerari, movimenti, spese, foto ed esporta o condividi i tuoi viaggi.',
    features: [
      {
        icon: '➕',
        title: 'Nuovo Viaggio & Tappe (Movimenti)',
        description: 'Crea un nuovo viaggio, registra ogni tappa con chilometri percorsi e visualizza la mappa interattiva dell\'intero itinerario.'
      },
      {
        icon: '💶',
        title: 'Spese di Viaggio & Riepilogo Costi',
        description: 'Annota le spese di carburante, soste, autostrada, cambusa e ristoranti per avere il riepilogo economico completo del viaggio.'
      },
      {
        icon: '📸',
        title: 'Album Fotografico & Racconto',
        description: 'Carica le foto ricordo ordinate per data, scrivi il racconto di bordo o digitalizza gli appunti scritti a mano tramite scansione foto.'
      },
      {
        icon: '📄',
        title: 'Esporta PDF & Condividi con la Community',
        description: 'Scarica l\'intero diario di viaggio impaginato in PDF oppure pubblicalo nella sezione Viaggi Condivisi della community.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Puoi sincronizzare il Diario di Bordo in tempo reale con il tuo Equipaggio Famiglia così tutti i compagni di viaggio possono aggiungere foto e spese!'
  },
  tools_hub: {
    key: 'tools_hub',
    badge: '🧰 Strumenti di Bordo',
    title: 'Pannello Strumenti & Configurazione Camper',
    subtitle: 'Tutti gli strumenti essenziali selezionati per la gestione del mezzo, il viaggio e la sosta.',
    features: [
      {
        icon: '🛡️',
        title: 'Equipaggio & Partenza',
        description: 'Checklist Pre-partenza per non dimenticare nessun controllo di sicurezza e Dispensa & Spesa Smart anti-spreco.'
      },
      {
        icon: '📊',
        title: 'Risorse di Bordo',
        description: 'Carta Carburante Sincronizzata per consumi km/L, Scadenziere manutenzioni (bollo, assicurazione, revisione) e Registro lavori fatti.'
      },
      {
        icon: '🗺️',
        title: 'Rotta & Esplorazione',
        description: 'Generatore Itinerari AI Rolly, Soste & Aree Preferite ed Eventi Camper con sagre, feste e locandine ufficiali.'
      },
      {
        icon: '🏕️',
        title: 'Vita in Piazzola & Emergenza',
        description: 'Livella Digitale Camper con calcolo cunei e Generatore Messaggio SOS Istantaneo con coordinate GPS esatte.'
      },
      {
        icon: '👥',
        title: 'Community & Impostazioni Mezzo',
        description: 'Bacheca & Chat Locale, Sfide & Badge, Viaggi Condivisi, scheda Il Mio Camper (misure e info) e Mappe Offline.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Dalle Impostazioni Generali puoi scegliere quali moduli mostrare o nascondere per personalizzare il tuo pannello Strumenti!'
  },
  work_log: {
    key: 'work_log',
    badge: '🛠️ Registro Lavori',
    title: 'Registro Lavori Fatti & Manutenzioni',
    subtitle: 'Lo storico unificato di tutti gli interventi meccanici, tagliandi e lavori sulla cellula.',
    features: [
      {
        icon: '🔧',
        title: 'Aggiungi Intervento o Manutenzione',
        description: 'Registra tagliandi motore, sostituzione cinghia, freni, pneumatici, sigillature o migliorie fai-da-te con data, km e spesa.'
      },
      {
        icon: '💧',
        title: 'Controllo Infiltrazioni & Igrometro',
        description: 'Annota i controlli annuali della scocca e i valori di umidità rilevati nei punti critici della cellula abitativa.'
      },
      {
        icon: '📊',
        title: 'Riepilogo Costi & Storico per Anno',
        description: 'Consulta il totale investito nella cura del camper e filtra rapidamente gli interventi per categoria o parola chiave.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Un registro lavori sempre aggiornato mantiene il camper affidabile nel tempo e ne aumenta il valore in caso di rivendita!'
  },
  ai_itinerary: {
    key: 'ai_itinerary',
    badge: '🤖 Generatore AI Rolly',
    title: 'Generatore Itinerari AI Rolly',
    subtitle: 'Pianifica itinerari camper completi di tappe e punti sosta calcolati sulle misure del tuo mezzo.',
    features: [
      {
        icon: '🎯',
        title: 'Crea Itinerario Su Misura',
        description: 'Inserisci meta, punto di partenza, numero di giorni e stile di viaggio (Natura, Borghi, Mare, Montagna, Enogastronomia).'
      },
      {
        icon: '🚐',
        title: 'Tappe con Aree Sosta & Mappa',
        description: 'Ottieni il programma giorno per giorno con aree sosta, campeggi o parcheggi compatibili con le dimensioni del tuo camper.'
      },
      {
        icon: '💾',
        title: 'Naviga, Salva nel Diario o Esporta PDF',
        description: 'Invia le tappe al navigatore sulla mappa, importa il viaggio nel Diario di Bordo o scarica il programma in PDF.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Puoi anche sfogliare gli itinerari già creati e condivisi dagli altri camperisti per prendere subito ispirazione!'
  },
  checklist: {
    key: 'checklist',
    badge: '☑️ Pre-Partenza',
    title: 'Checklist Pre-partenza',
    subtitle: 'Controlli rapidi e rigorosi prima di mettere in moto per viaggiare in totale sicurezza.',
    features: [
      {
        icon: '☑️',
        title: 'Controlli di Sicurezza Prima della Marcia',
        description: 'Verifica oblò e finestre chiusi, gradino elettrico rientrato, antenna abbassata, bombole gas, frigorifero e cavo 220V scollegato.'
      },
      {
        icon: '➕',
        title: 'Voci Personalizzate & Sincronizzate',
        description: 'Aggiungi i controlli specifici del tuo camper e condividi la checklist con il tuo Equipaggio Famiglia.'
      },
      {
        icon: '🔄',
        title: 'Azzera Spunte in un Tocco',
        description: 'Resetta tutte le voci completate prima della partenza successiva per ricominciare il controllo da capo.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Se restano controlli non spuntati, vedrai un comodo promemoria con il numero di voci mancanti prima di partire!'
  },
  bubble_level: {
    key: 'bubble_level',
    badge: '⚖️ Livella Camper',
    title: 'Livella Digitale Camper',
    subtitle: 'Metti perfettamente in bolla il camper in piazzola usando i sensori del telefono.',
    features: [
      {
        icon: '🎯',
        title: 'Inclinazione in Tempo Reale',
        description: 'Visualizza i gradi di pendenza longitudinale (avanti/indietro) e laterale (destra/sinistra) con bolla grafica ad alta precisione.'
      },
      {
        icon: '🛞',
        title: 'Calcolo Altezza Cunei per Ruota',
        description: 'Ti mostra sotto quale ruota posizionare i cunei e di quanti centimetri esatti sollevare il camper in base a passo e carreggiata.'
      },
      {
        icon: '⚙️',
        title: 'Taratura Zero & Bip Acustico',
        description: 'Appoggia lo smartphone sul tavolo o piano del camper per calibrare lo zero e attiva il suono guida mentre sali sui cunei.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Mettere il camper in bolla è fondamentale per dormire bene, far scaricare correttamente i lavandini e far funzionare al meglio il frigo trivalente!'
  },
  pantry_shopping: {
    key: 'pantry_shopping',
    badge: '🛒 Dispensa & Spesa',
    title: 'Dispensa & Spesa Smart',
    subtitle: 'Organizza i viveri a bordo, condividi la lista della spesa ed evita sprechi in viaggio.',
    features: [
      {
        icon: '🥫',
        title: 'Inventario Dispensa & Scadenze',
        description: 'Tieni traccia di alimenti, bevande e prodotti stipati nei pensili e in frigorifero con indicazione delle scadenze.'
      },
      {
        icon: '🛒',
        title: 'Lista della Spesa Condivisa',
        description: 'Aggiungi ciò che manca e spunta gli acquisti al supermercato in sincronizzazione con il tuo Equipaggio Famiglia.'
      },
      {
        icon: '🍳',
        title: 'Prodotti Camper & Ricette Salva-Risorse',
        description: 'Gestisci le scorte tecniche (liquido WC, carta disgregante, gas) e scopri idee di cucina veloce a bordo con una sola pentola.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Sposta con un tocco i prodotti finiti dalla Dispensa direttamente alla Lista della Spesa per non dimenticare nulla!'
  },
  deadlines: {
    key: 'deadlines',
    badge: '📅 Scadenziere',
    title: 'Scadenziere Manutenzioni & Documenti',
    subtitle: 'Tieni sotto controllo bollo, assicurazione, revisione, tagliando e controlli periodici.',
    features: [
      {
        icon: '🚨',
        title: 'Conto alla Rovescia & Avvisi',
        description: 'Visualizza subito i giorni mancanti a ogni scadenza con avvisi automatici per quelle imminenti o scadute.'
      },
      {
        icon: '➕',
        title: 'Aggiungi e Rinnova Scadenze',
        description: 'Registra assicurazione, revisione ministeriale, bollo, tagliando, controllo infiltrazioni e scadenza gomme o bombole.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Imposta il preavviso scadenze nelle Impostazioni Generali (7, 15 o 30 giorni prima) per ricevere sempre il promemoria in tempo!'
  },
  community: {
    key: 'community',
    badge: '💬 Community',
    title: 'Bacheca, Chat Locale & Forum Camperisti',
    subtitle: 'Parla con altri equipaggi, scambia consigli di viaggio e condividi foto ed esperienze.',
    features: [
      {
        icon: '📱',
        title: 'Bacheca Social & Foto',
        description: 'Pubblica post, foto dei tuoi viaggi e consigli, e interagisci con i contenuti degli altri camperisti.'
      },
      {
        icon: '💬',
        title: 'Forum per Categorie & Chat',
        description: 'Partecipa alle discussioni su Soste, Meteo, Incontri, Meccanica/SOS e scrivi nella chat della community.'
      },
      {
        icon: '🏆',
        title: 'Accesso a Sfide & Badge',
        description: 'Passa rapidamente ai concorsi fotografici e accumula punti XP aiutando gli altri equipaggi.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Usa la categoria Meccanica/SOS per chiedere un consiglio rapido ad altri camperisti esperti!'
  },
  favorites: {
    key: 'favorites',
    badge: '❤️ Soste Preferite',
    title: 'Soste & Aree Preferite',
    subtitle: 'La tua raccolta personale di punti sosta, campeggi, agricampeggi e parcheggi del cuore.',
    features: [
      {
        icon: '❤️',
        title: 'Punti Sosta Salvati',
        description: 'Ritrova in un attimo tutte le aree sosta e i campeggi che hai salvato con il cuore dalla mappa.'
      },
      {
        icon: '🗂️',
        title: 'Filtra per Categoria & Cerca',
        description: 'Filtra i tuoi preferiti tra Aree Sosta, Campeggi, Camper Service e Parcheggi o cerca per località.'
      },
      {
        icon: '🧭',
        title: 'Mostra su Mappa o Avvia Navigatore',
        description: 'Centra la sosta sulla mappa o avvia direttamente la navigazione 3D verso la destinazione.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Salva tra i preferiti le aree sosta comode lungo le direttrici autostradali per averle subito pronte durante i lunghi trasferimenti!'
  },
  maintenance_log: {
    key: 'maintenance_log',
    badge: '🔧 Manutenzione Cellula',
    title: 'Registro Manutenzione Cellula & Infiltrazioni',
    subtitle: 'Monitora lo stato della scocca, gli impianti di bordo e le rilevazioni di umidità.',
    features: [
      {
        icon: '🛠️',
        title: 'Storico Interventi Cellula',
        description: 'Annota controlli sigillature, impianti acqua/gas, oblò e accessori installati sulla cellula.'
      },
      {
        icon: '💧',
        title: 'Controllo Umidità & Infiltrazioni',
        description: 'Registra le misurazioni dell\'igrometro nei punti critici per prevenire infiltrazioni nel tempo.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Lubrificare periodicamente le guarnizioni di oblò e finestre con spray al silicone le mantiene morbide e a tenuta stagna!'
  },
  challenges: {
    key: 'challenges',
    badge: '🏆 Sfide & Concorsi',
    title: 'Sfide, Concorsi & Badge Camperisti',
    subtitle: 'Partecipa ai concorsi fotografici, contribuisci alle soste e sblocca i badge della community.',
    features: [
      {
        icon: '📸',
        title: 'Concorsi Fotografici',
        description: 'Condividi i tuoi scatti migliori in camper (vista mare, tramonti, montagna e borghi) e vota le foto della community.'
      },
      {
        icon: '📍',
        title: 'Contributi & Nuove Soste',
        description: 'Segnala nuove aree sosta o aggiornamenti utili per guadagnare punti esperienza (XP).'
      },
      {
        icon: '👑',
        title: 'Classifica & Badge Esclusivi',
        description: 'Sali di livello nella classifica camperisti e colleziona i badge sul tuo profilo.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Ogni recensione o nuova area sosta segnalata rende il viaggio più semplice e sicuro per tutta la community!'
  },
  dimensions: {
    key: 'dimensions',
    badge: '🚐 Il Mio Camper',
    title: 'Il Mio Camper: Misure, Info & Carta d\'Identità',
    subtitle: 'Configura altezza, lunghezza, larghezza e peso per il navigatore sagomato e conserva i dati del mezzo.',
    features: [
      {
        icon: '📏',
        title: 'Misure Sagoma per Navigatore Sicuro',
        description: 'Imposta altezza, lunghezza, larghezza e massa del camper per calcolare percorsi sicuri evitando ponti bassi e strettoie.'
      },
      {
        icon: '📋',
        title: 'Carta d\'Identità & Dati Tecnici',
        description: 'Conserva modello, targa, anno, motorizzazione, telaio e dotazioni del veicolo sempre a portata di mano.'
      },
      {
        icon: '🛞',
        title: 'Passo e Carreggiata per Livella',
        description: 'I dati dimensionali aiutano anche la Livella Digitale a calcolare i centimetri esatti per i cunei.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Quando inserisci l\'altezza del camper, aggiungi sempre 10-15 cm di margine per climatizzatore a tetto, parabola o oblò!'
  },
  camper_security: {
    key: 'camper_security',
    badge: '🚨 Emergenza GPS',
    title: 'Generatore Messaggio SOS Istantaneo',
    subtitle: 'Crea in un tocco un messaggio di emergenza con coordinate GPS esatte e link posizione.',
    features: [
      {
        icon: '🚨',
        title: 'Scelta Rapida Tipo di Emergenza',
        description: 'Seleziona tra Guasto Meccanico, Emergenza Medica, Intrusione/Furto o Blocco per Meteo/Clima.'
      },
      {
        icon: '📍',
        title: 'Coordinate GPS & Link Google Maps',
        description: 'Il messaggio include automaticamente le tue coordinate GPS attuali e il link cliccabile su Google Maps.'
      },
      {
        icon: '📲',
        title: 'Copia e Invia Subito',
        description: 'Copia il testo negli appunti con un tap per inviarlo via WhatsApp, SMS o Telegram ai soccorsi o ai familiari.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: In caso di guasto in strade secondarie o zone di campagna senza numero civico, le coordinate GPS permettono al soccorso stradale di trovarti subito!'
  },
  offline_maps: {
    key: 'offline_maps',
    badge: '📥 Mappe Offline',
    title: 'Mappe Cartografiche Offline',
    subtitle: 'Scarica i pacchetti regionali per consultare mappa e punti sosta anche senza copertura internet.',
    features: [
      {
        icon: '🗺️',
        title: 'Download Regioni Italiane',
        description: 'Salva nella memoria del dispositivo la cartografia delle regioni che visiterai.'
      },
      {
        icon: '📴',
        title: 'Consultazione Senza Rete Dati',
        description: 'Visualizza la mappa e le aree sosta salvate anche in montagna o in zone prive di segnale cellulare.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Scarica i pacchetti mappa sotto rete Wi-Fi prima di partire per le zone montane o costiere più isolate!'
  },
  events: {
    key: 'events',
    badge: '🎪 Sagre ed Eventi',
    title: 'Eventi Camper, Sagre & Locandine Ufficiali',
    subtitle: 'Scopri sagre enogastronomiche, feste di paese, fiere e raduni con locandina ufficiale e sosta camper vicina.',
    features: [
      {
        icon: '🖼️',
        title: 'Sagre ed Eventi con Locandina Ufficiale',
        description: 'Sfoglia le sagre e le manifestazioni con la loro locandina ufficiale (ingrandibile a tutto schermo), date, programma e specialità gastronomiche.'
      },
      {
        icon: '📅',
        title: 'Filtri per Mese, Stagione o Date Vacanza',
        description: 'Filtra gli eventi per weekend, stagione, mese dell\'anno oppure imposta le date esatte delle tue ferie.'
      },
      {
        icon: '🚐',
        title: 'Mappa Eventi & Sosta Camper Consigliata',
        description: 'Visualizza ogni sagra sulla mappa, scopri l\'area sosta o parcheggio camper più vicino e avvia subito il navigatore.'
      },
      {
        icon: '🔍',
        title: 'Aggiornamento Live & Ricerca per Zona',
        description: 'Cerca sagre ed eventi in qualsiasi città o regione per pianificare il tuo prossimo weekend in camper.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Tocca la locandina ufficiale di una sagra per ingrandirla e leggere tutti gli orari degli stand gastronomici e i parcheggi dedicati!'
  },
  fuel_card: {
    key: 'fuel_card',
    badge: '⛽ Carta Carburante',
    title: 'Carta Carburante Sincronizzata & Consumi',
    subtitle: 'Registra i rifornimenti in cloud, monitora la spesa e calcola la media reale in km/L.',
    features: [
      {
        icon: '⛽',
        title: 'Registra Pieno o Scansiona Scontrino',
        description: 'Inserisci litri, prezzo al litro, costo totale e chilometri odometro, oppure leggi i dati dallo scontrino.'
      },
      {
        icon: '📊',
        title: 'Media Consumi km/L & Statistiche',
        description: 'Calcola automaticamente i km/L percorsi tra un pieno e l\'altro e monitora l\'andamento dei costi.'
      },
      {
        icon: '☁️',
        title: 'Storico Sincronizzato in Cloud',
        description: 'Tutti i rifornimenti sono salvati in cloud e condivisi con i membri del tuo Equipaggio Famiglia.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Spunta "Pieno Completo" quando riempi il serbatoio fino allo scatto della pompa per ottenere il calcolo km/L più accurato!'
  },
  shared_trips: {
    key: 'shared_trips',
    badge: '🗺️ Viaggi Condivisi',
    title: 'Viaggi Condivisi della Community',
    subtitle: 'Esplora i diari di bordo e gli itinerari reali condivisi dagli altri camperisti.',
    features: [
      {
        icon: '👥',
        title: 'Itinerari Reali della Community',
        description: 'Sfoglia i viaggi pubblicati dagli altri equipaggi completi di tappe, chilometraggi, giorni e foto.'
      },
      {
        icon: '📖',
        title: 'Dettagli Tappe & Racconti',
        description: 'Apri ogni viaggio per leggere il diario completo, vedere il percorso sulla mappa e prendere spunto per la tua prossima meta.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Quando completi un bel viaggio nel tuo Diario di Bordo, condividilo per ispirare gli altri camperisti della community!'
  },
  profile: {
    key: 'profile',
    badge: '👤 Profilo Utente',
    title: 'Profilo Utente & Nickname Social',
    subtitle: 'Gestisci i tuoi dati personali, il nickname pubblico e la foto profilo per la community.',
    features: [
      {
        icon: '📸',
        title: 'Foto Profilo & Avatar',
        description: 'Carica e ritaglia la tua foto profilo o quella del tuo camper per farti riconoscere in Bacheca e nei Viaggi Condivisi.'
      },
      {
        icon: '🏷️',
        title: 'Nickname & Dati Account',
        description: 'Imposta il tuo nickname (@nome) e aggiorna i tuoi recapiti associati all\'account ViaCamper.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Scegli una bella foto del tuo camper come immagine profilo per farti riconoscere dagli altri equipaggi in sosta!'
  },
  dashboard_settings: {
    key: 'dashboard_settings',
    badge: '📱 Personalizza Strumenti',
    title: 'Moduli Visibili in Strumenti',
    subtitle: 'Scegli quali strumenti mostrare o nascondere per mantenere l\'app leggera e su misura per te.',
    features: [
      {
        icon: '👁️',
        title: 'Attiva o Nascondi Singoli Moduli',
        description: 'Abilita solo gli strumenti che usi davvero in viaggio (Checklist, Dispensa, Carta Carburante, Eventi, Livella, SOS, ecc.).'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Puoi riattivare qualsiasi modulo in ogni momento con un semplice interruttore!'
  },
  general: {
    key: 'general',
    badge: '⚙️ Impostazioni',
    title: 'Impostazioni Generali & Preferenze',
    subtitle: 'Configura equipaggio famiglia, aspetto, mappe, voce navigatore, moduli visibili e backup.',
    features: [
      {
        icon: '👨‍👩‍👧‍👦',
        title: 'Equipaggio Famiglia & Condivisione',
        description: 'Collega il partner o i familiari con un codice invito per sincronizzare Diario, Dispensa, Checklist e Carta Carburante.'
      },
      {
        icon: '🗺️',
        title: 'Navigazione, Mappe & Voce GPS',
        description: 'Scegli lo stile mappa, le preferenze di guida e la voce del navigatore (Voce uomo o Voce donna).'
      },
      {
        icon: '👁️',
        title: 'Moduli Visibili & Aspetto',
        description: 'Scegli il tema chiaro/scuro, la dimensione del testo e quali strumenti mostrare nella scheda Strumenti.'
      },
      {
        icon: '💾',
        title: 'Backup Cloud & Ripristino Guide Rolly',
        description: 'Gestisci il backup automatico dei tuoi dati e riattiva quando vuoi le guide illustrative di Rolly.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Puoi consultare la guida aggiornata di ogni sezione in qualsiasi momento toccando il pulsante "💡 Guida Rolly" in alto!'
  }
};

interface RollyOnboardingGuideProps {
  sectionKey: string;
  autoShow?: boolean; // Default true (only shows if not seen before)
  onClose?: () => void;
  // Optional button trigger mode
  showHelpButton?: boolean;
  className?: string;
  requireAuth?: boolean;
  onRequireAuth?: () => void;
}

export function RollyOnboardingGuide({
  sectionKey,
  autoShow = true,
  onClose,
  showHelpButton = true,
  className = '',
  requireAuth = false,
  onRequireAuth,
}: RollyOnboardingGuideProps) {
  const guide = ROLLY_GUIDES[sectionKey] || ROLLY_GUIDES.general;
  const storageKey = `rolly_guide_seen_${sectionKey}`;

  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    if (autoShow && !requireAuth) {
      const hasSeen = localStorage.getItem(storageKey);
      if (!hasSeen) {
        setIsOpen(true);
      }
    }
  }, [sectionKey, autoShow, storageKey, requireAuth]);

  const handleDismiss = (dontShowAgain: boolean = true) => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(storageKey, 'true');
      } catch (e) {}
    }
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleOpen = () => {
    if (requireAuth) {
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: {
            message: '🔒 Effettua il login o registrati per utilizzare Rolly!',
            duration: 4000,
          },
        }),
      );
      onRequireAuth?.();
      return;
    }
    setIsOpen(true);
  };

  const hasHeightClass = className.includes('h-') || className.includes('!h-');
  const baseHeightClass = hasHeightClass ? '' : 'h-8';

  return (
    <>
      {/* Help Button trigger if requested */}
      {showHelpButton && (
        <button
          type="button"
          onClick={handleOpen}
          className={`${baseHeightClass} inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 rounded-lg sm:rounded-xl bg-amber-50 hover:bg-amber-100/90 dark:bg-amber-950/60 dark:hover:bg-amber-900/70 border border-amber-300/80 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-[10.5px] sm:text-xs font-black transition-all shadow-xs cursor-pointer select-none active:scale-95 shrink-0 ${className}`}
          title="Mostra la guida di Rolly per questa sezione"
        >
          <CartoonCamperAvatar className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          <span className="hidden xs:inline">💡 Guida Rolly</span>
          <span className="xs:hidden">💡 Guida</span>
        </button>
      )}

      {/* Rolly Modal Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-md overflow-y-auto p-2.5 sm:p-4 flex flex-col justify-center animate-in fade-in duration-200"
          onClick={() => handleDismiss(true)}
        >
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[82vh] sm:max-h-[85vh] m-auto animate-in zoom-in-95 duration-200 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#1C3D2B] via-[#2D5A40] to-[#1C3D2B] text-white p-3.5 sm:p-5 relative shrink-0">
              <button
                type="button"
                onClick={() => handleDismiss(true)}
                className="absolute top-3 right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/90 flex items-center justify-center transition-all cursor-pointer z-10"
                title="Chiudi guida"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 pr-6">
                <CartoonCamperAvatar className="w-11 h-11 sm:w-13 sm:h-13 shrink-0 drop-shadow-md" />
                <div className="space-y-0.5 min-w-0">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                    {guide.badge}
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight tracking-tight">
                    {guide.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-emerald-100/90 leading-snug">
                    {guide.subtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-3.5 sm:p-5 space-y-3 overflow-y-auto scrollbar-thin flex-1 min-h-0 text-slate-800 dark:text-slate-100">
              <div className="flex items-center gap-2 text-[11px] sm:text-xs font-extrabold text-[#1C3D2B] dark:text-emerald-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span>Come funziona &amp; Funzioni disponibili</span>
              </div>

              {/* Feature List */}
              <div className="grid grid-cols-1 gap-2">
                {guide.features.map((feat, idx) => (
                  <div 
                    key={idx}
                    className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-2.5 transition-all hover:border-emerald-500/30"
                  >
                    <span className="text-lg sm:text-xl shrink-0 p-1 bg-white dark:bg-slate-700 rounded-lg sm:rounded-xl shadow-xs border border-slate-200/50 dark:border-slate-600/50">
                      {feat.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        {feat.title}
                      </h4>
                      <p className="text-[11px] sm:text-[11.5px] text-slate-600 dark:text-slate-300 leading-normal mt-0.5">
                        {feat.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Rolly's Camper Tip Box */}
              <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-1 text-amber-950 dark:text-amber-200">
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800 dark:text-amber-300">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Il consiglio del tuo compagno Rolly</span>
                </div>
                <p className="text-[11px] sm:text-[11.5px] leading-relaxed italic text-amber-900/90 dark:text-amber-200/90 pl-5">
                  "{guide.rollyTip}"
                </p>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="p-3 sm:px-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDismiss(true)}
                className="w-full sm:w-auto px-5 py-2 sm:py-2.5 rounded-xl bg-[#1C3D2B] hover:bg-[#142d22] text-white font-extrabold text-xs sm:text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Ho capito, grazie Rolly! 🚀</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Helper function to reset all Rolly guides in localStorage
 */
export function resetAllRollyGuides() {
  try {
    Object.keys(ROLLY_GUIDES).forEach(key => {
      localStorage.removeItem(`rolly_guide_seen_${key}`);
    });
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: '💡 Tutte le guide di Rolly sono state ripristinate!' }
    }));
  } catch (e) {}
}
