import React, { useState, useEffect } from 'react';
import { CartoonCamperAvatar } from './CartoonCamperAvatar';
import { 
  X, 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  ChevronRight, 
  RotateCcw,
  Lightbulb,
  Compass,
  MapPin,
  BookOpen,
  DollarSign,
  Bot,
  CheckSquare,
  Scale,
  Zap,
  ShoppingBag,
  Calendar,
  Users,
  Truck,
  Shield,
  Download,
  PartyPopper,
  Settings
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
    title: 'Mappa, Soste & Navigatore 3D Camper',
    subtitle: 'Trova aree sosta, campeggi, camper service e naviga in totale sicurezza.',
    features: [
      {
        icon: '🚐',
        title: 'Intorno a me (GPS)',
        description: 'Trova subito le aree sosta, i campeggi e i camper service entro 15 km dal tuo camper.'
      },
      {
        icon: '📍',
        title: 'Intorno sosta (Google Places)',
        description: 'Scopri ristoranti, attrazioni e servizi utili attorno ad una specifica area sosta o cittadina.'
      },
      {
        icon: '🧭',
        title: 'Navigazione GPS 3D',
        description: 'Avvia il navigatore vocale 3D con calcolo percorso OSRM/BRouter ottimizzato per camper.'
      },
      {
        icon: '➕',
        title: 'Proponi Nuova Sosta',
        description: 'Condividi un punto sosta o camper service scoperto da te con tutta la community.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Prima di un lungo viaggio, verifica le dimensioni del tuo mezzo nella Scheda Mezzo così il navigatore eviterà automaticamente ponti bassi e strettoie!'
  },
  diary: {
    key: 'diary',
    badge: '📖 Diario di Bordo',
    title: 'Diario di Bordo & Ricordi di Viaggio',
    subtitle: 'Registra itinerari, tappe, chilometraggi, foto ed emozioni dei tuoi viaggi.',
    features: [
      {
        icon: '➕',
        title: 'Nuovo Viaggio',
        description: 'Crea un nuovo itinerario di viaggio specificando date, destinazione e equipaggio.'
      },
      {
        icon: '📌',
        title: 'Registra Movimento / Tappa',
        description: 'Aggiungi ogni fermata, i chilometri parziali percorsi e i litri di carburante consumati.'
      },
      {
        icon: '🗺️',
        title: 'Mappa Interattiva Itinerario',
        description: 'Visualizza sulla mappa il percorso svolto con tutte le tappe collegate.'
      },
      {
        icon: '📸',
        title: 'Note & Foto Ricordo',
        description: 'Conserva note personali, foto e suggerimenti per ricordare i posti più belli.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Registrando litri e chilometri ad ogni pieno, l\'app calcolerà in automatico i tuoi consumi reali in km/L!'
  },
  work_log: {
    key: 'work_log',
    badge: '⛽ Spese & Lavori',
    title: 'Gestione Spese, Carburante & Manutenzioni',
    subtitle: 'Tieni sotto controllo ogni costo del tuo camper per viaggiare senza sorprese.',
    features: [
      {
        icon: '➕',
        title: 'Aggiungi Spesa',
        description: 'Registra uscite per Carburante, Soste, Autostrada, Accessori o Manutenzione.'
      },
      {
        icon: '📊',
        title: 'Statistiche & Consumi',
        description: 'Analizza i totali mensili e il costo medio al chilometro del tuo camper.'
      },
      {
        icon: '🔧',
        title: 'Registro Lavori & Fai-da-te',
        description: 'Annota le riparazioni effettuate in officina o i lavoretti di bricolage.'
      },
      {
        icon: '📄',
        title: 'Scontrini e Ricevute',
        description: 'Conserva la foto delle ricevute per garanzie e scadenze future.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Filtra le spese per categoria per capire subito quanto incide il carburante rispetto ai costi di sosta!'
  },
  ai_itinerary: {
    key: 'ai_itinerary',
    badge: '🤖 Generatore AI Rolly',
    title: 'Pianificatore Itinerari AI Rolly',
    subtitle: 'Pianifica itinerari camper perfetti in pochi secondi grazie all\'Intelligenza Artificiale.',
    features: [
      {
        icon: '🎯',
        title: 'Crea Itinerario Su Misura',
        description: 'Scegli destinazione, giorni a disposizione e stile di viaggio (Relax, Enogastronomia, Natura).'
      },
      {
        icon: '🚐',
        title: 'Filtri Specifici Camper',
        description: 'Richiedi sosta libera, campeggi con piscina o aree attrezzate con allaccio 220V.'
      },
      {
        icon: '💾',
        title: 'Salva nel Diario',
        description: 'Importa l\'itinerario generato direttamente nel tuo Diario di Bordo con un solo tap!'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Chiedimi consiglio anche sui piatti tipici da assaggiare o sui borghi panoramici lungo la rotta!'
  },
  checklist: {
    key: 'checklist',
    badge: '☑️ Pre-Partenza',
    title: 'Checklist Sicurezza e Controlli Camper',
    subtitle: 'Evita dimenticanze prima di accendere il motore per viaggiare in sicurezza.',
    features: [
      {
        icon: '☑️',
        title: 'Spunte Pre-Partenza',
        description: 'Controlla gas chiuso, antenna TV giù, gradino rientrato e cavo 220V staccato.'
      },
      {
        icon: '➕',
        title: 'Voci Personalizzate',
        description: 'Aggiungi i tuoi controlli personali su misura per la tua cellula.'
      },
      {
        icon: '🔄',
        title: 'Azzera Spunte',
        description: 'Resetta le spunte alla partenza successiva per ricominciare da capo in un tap.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Fai fare un giro di ispezione visivo attorno al camper anche a un passeggero per verificare portelloni e finestre aperte!'
  },
  bubble_level: {
    key: 'bubble_level',
    badge: '⚖️ Livella 3D',
    title: 'Livella Digitale Camper 3D',
    subtitle: 'Metti perfettamente in bolla il tuo camper per dormire comodo e far funzionare il frigo.',
    features: [
      {
        icon: '🎯',
        title: 'Visualizzatore Pendenza',
        description: 'Mostra l\'inclinazione longitudinale e trasversale in gradi con grafica in tempo reale.'
      },
      {
        icon: '🛞',
        title: 'Guida Posizionamento Cunei',
        description: 'Ti indica sotto quale ruota mettere i tacchi e di quanti centimetri sollevare il mezzo.'
      },
      {
        icon: '⚙️',
        title: 'Taratura Zero',
        description: 'Metti lo smartphone sul tavolo del camper e calibra lo zero assoluto.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Un camper perfettamente in bolla garantisce il massimo rendimento del frigorifero trivalente e il corretto scarico delle acque grigie!'
  },
  weight_calculator: {
    key: 'weight_calculator',
    badge: '⚖️ Carico Pesi',
    title: 'Calcolatore Carico & Massa Camper',
    subtitle: 'Verifica di non superare la massa omologata (es. 3500 kg) per viaggiare a norma.',
    features: [
      {
        icon: '⚖️',
        title: 'Peso Tara vs Carico Reale',
        description: 'Inserisci tara, serbatoio acqua, bombole gas, passeggeri e attrezzatura.'
      },
      {
        icon: '⚠️',
        title: 'Allarme Sovrappeso',
        description: 'Ricevi un avviso visivo immediato se superi i limiti della tua patente.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Viaggiare col serbatoio acque chiare al 20% durante i trasferimenti autostradali riduce il carico ed evita sanzioni all\'estero!'
  },
  offgrid_estimator: {
    key: 'offgrid_estimator',
    badge: '🔋 Autonomia Off-Grid',
    title: 'Calcolatore Autonomia Sosta Libera',
    subtitle: 'Stima quanti giorni puoi sostare senza corrente 220V in base a batterie e solare.',
    features: [
      {
        icon: '🔋',
        title: 'Capacità Batteria Servizi',
        description: 'Imposta gli Ah e la tipologia di batteria (AGM, GEL o Litio LiFePO4).'
      },
      {
        icon: '☀️',
        title: 'Pannello Solare (Watt)',
        description: 'Specifica la potenza del tuo impianto fotovoltaico per calcolare la resa diurna.'
      },
      {
        icon: '⚡',
        title: 'Consumo Utenze',
        description: 'Seleziona frigo, luci, pompa, riscaldamento e inverter per vedere le ore di autonomia.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Ricorda che le batterie al Litio si possono scaricare fino al 90%, mentre le AGM tradizionali soffrono sotto il 50%!'
  },
  pantry_shopping: {
    key: 'pantry_shopping',
    badge: '🛒 Cambusa & Spesa',
    title: 'Cambusa Camper & Lista della Spesa',
    subtitle: 'Organizza le provviste del camper per non rimanere mai senza cibo o prodotti tecnici.',
    features: [
      {
        icon: '🥫',
        title: 'Inventario Cambusa',
        description: 'Tieni traccia degli alimenti stipati nei pensili e nel frigorifero.'
      },
      {
        icon: '🛒',
        title: 'Lista della Spesa',
        description: 'Spunta velocemente quello che manca prima di partire per il supermercato.'
      },
      {
        icon: '🚽',
        title: 'Prodotti Indispensabili',
        description: 'Non dimenticare il liquido per il WC chimico e le compresse sanificanti per l\'acqua!'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Fai una scorta di alimenti a lunga conservazione per quando decidi di fare sosta libera isolata in natura!'
  },
  deadlines: {
    key: 'deadlines',
    badge: '📅 Scadenziere',
    title: 'Scadenziere Documenti & Manutenzioni',
    subtitle: 'Non dimenticare mai revisione ministeriale, bollo, assicurazione e tagliandi.',
    features: [
      {
        icon: '🚨',
        title: 'Conto alla Rovescia',
        description: 'Mostra i giorni rimanenti per ogni scadenza attiva sul tuo camper.'
      },
      {
        icon: '➕',
        title: 'Aggiungi Scadenza',
        description: 'Registra revisione, bollo, polizza, tagliando e test infiltrazioni cellula.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Fai effettuare il controllo infiltrazioni ogni 12 mesi per preservare la struttura in vetroresina/alluminio della cellula!'
  },
  community: {
    key: 'community',
    badge: '💬 Community',
    title: 'Bacheca, Chat & Eventi Camperisti',
    subtitle: 'Scambia consigli in tempo reale e partecipa a raduni e sagre locali.',
    features: [
      {
        icon: '🗣️',
        title: 'Messaggi & Suggerimenti',
        description: 'Chiedi informazioni su viabilità, passo di montagna e qualità delle aree sosta.'
      },
      {
        icon: '🎪',
        title: 'Sagre ed Eventi',
        description: 'Trova le feste di paese e le manifestazioni vicine al tuo itinerario.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Rispetta sempre la natura ed il vicinato nelle aree sosta per far accogliere sempre con il sorriso tutti i camperisti!'
  },
  challenges: {
    key: 'challenges',
    badge: '🏆 Sfide & Concorsi',
    title: 'Sfide, Concorsi & Badge Camperisti',
    subtitle: 'Partecipa ai concorsi foto, segnala nuove soste e guadagna badge per la community.',
    features: [
      {
        icon: '🌊',
        title: 'Sfide Fotografiche',
        description: 'Scatta foto con vista mare, tramonti dal camper e borghi storici per vincere badge.'
      },
      {
        icon: '🧭',
        title: 'Aggiungi & Segnala Soste',
        description: 'Invia nuove aree sosta o camper service e accumula punti XP per la classifica.'
      },
      {
        icon: '👑',
        title: 'Classifica & Badge',
        description: 'Scala la classifica della community e sblocca badge di livello esclusivi.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Ogni foto ed area sosta inviata aiuta migliaia di equipaggi in viaggio in tutta Italia ed Europa!'
  },
  dimensions: {
    key: 'dimensions',
    badge: '🚐 Scheda Mezzo',
    title: 'Scheda Mezzo e Dimensioni Camper',
    subtitle: 'Imposta dimensioni e caratteristiche per una navigazione GPS senza rischi.',
    features: [
      {
        icon: '📏',
        title: 'Misure Esterne',
        description: 'Registra altezza, lunghezza e larghezza massima compresi accessori.'
      },
      {
        icon: '🧭',
        title: 'Protezione Navigatore',
        description: 'Il navigatore eviterà sottopassi bassi e strade con limite di larghezza.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Nel calcolo dell\'altezza totale, ricordati di aggiungere i centimetri di antenna parabolica, oblo e climatizzatore da tetto!'
  },
  sosta_libera_tools: {
    key: 'sosta_libera_tools',
    badge: '🌲 Sosta Libera',
    title: 'Pannello Strumenti Sosta Libera',
    subtitle: 'Strumenti dedicati per chi ama la sosta autonoma in natura.',
    features: [
      {
        icon: '💧',
        title: 'Punti Acqua e Carico',
        description: 'Mappa delle fontanelle per riempire i serbatoi anche in viaggio.'
      },
      {
        icon: '🔋',
        title: 'Monitor Risorse',
        description: 'Calcola la durata di gas ed energia per le tue notti in libertà.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: In sosta libera non scaricare mai acque grigie o nere al di fuori degli appositi pozzetti di scarico camper!'
  },
  camper_security: {
    key: 'camper_security',
    badge: '🛡️ Sicurezza Sosta',
    title: 'Sicurezza Attiva e Sosta Notturna',
    subtitle: 'Consigli e liste di controllo per dormire sonni tranquilli durante i tuoi viaggi.',
    features: [
      {
        icon: '🌙',
        title: 'Checklist Notturna',
        description: 'Pannelli oscuranti, antifurto, sensori gas e cunei inseriti.'
      },
      {
        icon: '🚨',
        title: 'Chiamata Rapida SOS',
        description: 'Numeri di emergenza e soccorso stradale a portata di tap.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Se sosti in aree autostradali o non custodite, attiva il rilevatore triovalente gas e blocca le portiere anteriori!'
  },
  offline_maps: {
    key: 'offline_maps',
    badge: '📥 Mappe Offline',
    title: 'Mappe & Cartografia Offline',
    subtitle: 'Scarica le mappe per consultare soste e navigatore senza connessione internet.',
    features: [
      {
        icon: '🗺️',
        title: 'Download Mappe',
        description: 'Salva le mappe in locale prima di viaggiare in zone senza campo.'
      },
      {
        icon: '📴',
        title: 'Mappa Soste Offline',
        description: 'Consulta punti sosta e informazioni senza consumo di dati mobile.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Scarica le mappe dell\'area prima di attraversare valichi di montagna o di viaggiare all\'estero!'
  },
  events: {
    key: 'events',
    badge: '🎪 Sagre ed Eventi',
    title: 'Feste, Sagre & Raduni Camper',
    subtitle: 'Scopri eventi popolari ed enogastronomici da raggiungere in camper.',
    features: [
      {
        icon: '🍷',
        title: 'Sagre Enogastronomiche',
        description: 'Feste tradizionali, degustazioni di prodotti tipici e mostre mercati.'
      },
      {
        icon: '📍',
        title: 'Sosta Vicina all\'Evento',
        description: 'Trova l\'area sosta o il parcheggio camper più vicino all\'evento.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Le sagre di paese sono l\'occasione migliore per scoprire le tradizioni locali e acquistare prodotti a chilometro zero!'
  },
  general: {
    key: 'general',
    badge: '⚙️ Impostazioni',
    title: 'Impostazioni App e Personalizzazione',
    subtitle: 'Configura l\'applicazione e gestisci i consigli dell\'Assistente AI Rolly.',
    features: [
      {
        icon: '🎨',
        title: 'Tema & Grafica',
        description: 'Scegli tra modalità chiara e scura per una guida notturna confortevole.'
      },
      {
        icon: '🔄',
        title: 'Ripristina Consigli Rolly',
        description: 'Riattiva le spiegazioni guidate di Rolly per tutte le sezioni dell\'app.'
      }
    ],
    rollyTip: '💡 Consiglio di Rolly: Puoi riaprire questa guida in qualsiasi momento premendo il pulsante "💡 Guida Rolly" presente in alto in ogni scheda!'
  }
};

interface RollyOnboardingGuideProps {
  sectionKey: string;
  autoShow?: boolean; // Default true (only shows if not seen before)
  onClose?: () => void;
  // Optional button trigger mode
  showHelpButton?: boolean;
  className?: string;
}

export function RollyOnboardingGuide({
  sectionKey,
  autoShow = true,
  onClose,
  showHelpButton = true,
  className = ''
}: RollyOnboardingGuideProps) {
  const guide = ROLLY_GUIDES[sectionKey] || ROLLY_GUIDES.general;
  const storageKey = `rolly_guide_seen_${sectionKey}`;

  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    if (autoShow) {
      const hasSeen = localStorage.getItem(storageKey);
      if (!hasSeen) {
        setIsOpen(true);
      }
    }
  }, [sectionKey, autoShow, storageKey]);

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
                <span>Come funziona &amp; Tasti principali</span>
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
