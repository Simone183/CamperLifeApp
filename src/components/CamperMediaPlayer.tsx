import React from "react";
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Radio, 
  Music, 
  X, 
  Volume1, 
  Disc, 
  RefreshCw,
  ListMusic,
  FolderOpen,
  Upload,
  Square
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface MediaTrack {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  cover: string;
  isRadio: boolean;
}

const RADIO_STATIONS: MediaTrack[] = [
  {
    id: "rds",
    title: "RDS",
    subtitle: "100% Grandi Successi",
    url: "https://stream.rdstv.radio/index.m3u8",
    cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=150&auto=format&fit=crop&q=60",
    isRadio: true
  },
  {
    id: "radio_italia",
    title: "Radio Italia",
    subtitle: "Solo Musica Italiana",
    url: "https://radioitaliasmi.akamaized.net/hls/live/2093120/RISMI/master.m3u8",
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=60",
    isRadio: true
  },
  {
    id: "rtl",
    title: "RTL 102.5",
    subtitle: "Very Normal People",
    url: "https://streamingv2.shoutcast.com/rtl-1025",
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150&auto=format&fit=crop&q=60",
    isRadio: true
  },
  {
    id: "virgin",
    title: "Virgin Radio",
    subtitle: "Style Rock",
    url: "https://icecast.unitedradio.it/Virgin.mp3",
    cover: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=150&auto=format&fit=crop&q=60",
    isRadio: true
  },
  {
    id: "kiss_kiss",
    title: "Radio Kiss Kiss",
    subtitle: "Play Everywhere",
    url: "https://58f12ffd2447a.streamlock.net/KKMulti/livestream/playlist.m3u8",
    cover: "https://images.unsplash.com/photo-1516280440614-37939bbacd6a?w=150&auto=format&fit=crop&q=60",
    isRadio: true
  },
  {
    id: "radio105",
    title: "Radio 105",
    subtitle: "Proud to be Happy",
    url: "https://icecast.unitedradio.it/Radio105.mp3",
    cover: "https://images.unsplash.com/photo-1487180142328-054b783fc471?w=150&auto=format&fit=crop&q=60",
    isRadio: true
  },
  {
    id: "rmc",
    title: "Radio Monte Carlo",
    subtitle: "La Radio di Gran Classe",
    url: "https://icecast.unitedradio.it/RMC.mp3",
    cover: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=150&auto=format&fit=crop&q=60",
    isRadio: true
  },
  {
    id: "subasio",
    title: "Radio Subasio",
    subtitle: "Ogni Giorno Insieme",
    url: "https://icecast.unitedradio.it/Subasio.mp3",
    cover: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=150&auto=format&fit=crop&q=60",
    isRadio: true
  }
];

const CAMPER_TRACKS: MediaTrack[] = [
  {
    id: "camper_track_1",
    title: "Chitarra Falò",
    subtitle: "Relax Sotto le Stelle",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    cover: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_2",
    title: "Sunset Highway",
    subtitle: "Guida Verso il Tramonto",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    cover: "https://images.unsplash.com/photo-1506015391300-4802dc74de2e?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_3",
    title: "Viaggio Lofi",
    subtitle: "Chill Beats On-The-Road",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    cover: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_4",
    title: "Foresta Mattutina",
    subtitle: "Natura e Chitarra Acustica",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    cover: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_5",
    title: "Camper Rock",
    subtitle: "Classic Drive Playlist",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    cover: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_6",
    title: "Alba in Montagna",
    subtitle: "Risveglio ad Alta Quota",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    cover: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_7",
    title: "Spiaggia Solitaria",
    subtitle: "Rumore delle Onde & Chill",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    cover: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_8",
    title: "On the Road Again",
    subtitle: "Country Folk d'Altri Tempi",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    cover: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_9",
    title: "Sentiero Selvaggio",
    subtitle: "Esplorazione e Chitarre Folk",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    cover: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_10",
    title: "Notte Stellata",
    subtitle: "Sotto la Via Lattea",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
    cover: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_11",
    title: "Nebbia d'Autunno",
    subtitle: "Melodia Nostalgica nel Bosco",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3",
    cover: "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_12",
    title: "Vento di Libertà",
    subtitle: "Sintetizzatori Ambientali",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3",
    cover: "https://images.unsplash.com/photo-1472214222541-d510753a4907?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_13",
    title: "Passo dello Stelvio",
    subtitle: "Guida sulle Curve Alpine",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3",
    cover: "https://images.unsplash.com/photo-1486916856992-e4db22c8df33?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_14",
    title: "Pioggia sul Camper",
    subtitle: "Sotto la Veranda",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3",
    cover: "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_15",
    title: "Inseguendo il Sole",
    subtitle: "Summer Acoustic Pop",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3",
    cover: "https://images.unsplash.com/photo-1433832597046-4f10e10ac764?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_16",
    title: "Orizzonti Lontani",
    subtitle: "Chitarra Elettrica Ambientale",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3",
    cover: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_17",
    title: "Caffè del Mattino",
    subtitle: "Acoustic Jazz Duo",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    cover: "https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_18",
    title: "Brezza di Laguna",
    subtitle: "Deep Chillout",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    cover: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_19",
    title: "Verso Nord",
    subtitle: "Sognando la Scandinavia",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    cover: "https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_20",
    title: "Isola nel Vento",
    subtitle: "Caldo Sunset Guitar",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    cover: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_21",
    title: "Rifugio Alpino",
    subtitle: "Atmosfere di Baita in Legno",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    cover: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_22",
    title: "Strade del Sud",
    subtitle: "Southern Blues Rock",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    cover: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_23",
    title: "Baia del Tramonto",
    subtitle: "Lo-fi Sunset Beat",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    cover: "https://images.unsplash.com/photo-1495954484750-af469f2f9be5?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_24",
    title: "Chitarra e Falò",
    subtitle: "Campfire Acoustic Jam",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    cover: "https://images.unsplash.com/photo-1508873696983-2df519f0397e?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_25",
    title: "Viaggio d'Inverno",
    subtitle: "Indie Ambient Folk",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    cover: "https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_26",
    title: "Dune del Deserto",
    subtitle: "Ethno Chill & Handpan",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
    cover: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_27",
    title: "Foresta di Pino",
    subtitle: "Sotto le Fronde dei Pini",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3",
    cover: "https://images.unsplash.com/photo-1511497584788-876760111969?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_28",
    title: "Faro Solitario",
    subtitle: "Oceanic Soundscapes",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3",
    cover: "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_29",
    title: "Bivacco Notturno",
    subtitle: "Cielo Stellato & Crickets",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3",
    cover: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_30",
    title: "Camper Groove",
    subtitle: "Funky Road Trip Bass",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3",
    cover: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_31",
    title: "Lago di Carezza",
    subtitle: "Riflessi di Smeraldo",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3",
    cover: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_32",
    title: "Vento di Ponente",
    subtitle: "Sailing Mood & Soft Synths",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3",
    cover: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_33",
    title: "La Via Emilia",
    subtitle: "On the Road italiano",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    cover: "https://images.unsplash.com/photo-1543872084-c7bd3822856f?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_34",
    title: "Cascate del Silenzio",
    subtitle: "Pace Naturale & Piano",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    cover: "https://images.unsplash.com/photo-1432406186174-2b24f4a6011d?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_35",
    title: "Gipsy Caravan",
    subtitle: "Folk Swing & Violini",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    cover: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_36",
    title: "Prati Verdi",
    subtitle: "Folk Acustico Irlandese",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    cover: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_37",
    title: "Sotto la Pioggia",
    subtitle: "Lofi Pioggia & Tazza di Tè",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    cover: "https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_38",
    title: "Onde di Smeraldo",
    subtitle: "Surf Rock Chill",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    cover: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_39",
    title: "Sulla Cresta",
    subtitle: "Indie Rock per Grandi Altezze",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    cover: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_40",
    title: "Strade Bianche",
    subtitle: "Gravel Bike & Dust Folk",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    cover: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_41",
    title: "Coyote Trail",
    subtitle: "Deserto del Nevada Mood",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    cover: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_42",
    title: "In Volo Libero",
    subtitle: "Synthwave del Viaggiatore",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
    cover: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_43",
    title: "Sentiero dei Limoni",
    subtitle: "Brezza Costiera Amalfitana",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3",
    cover: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_44",
    title: "Luce del Nord",
    subtitle: "Ambient Polare",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3",
    cover: "https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_45",
    title: "Canyon Echo",
    subtitle: "Eco del West & Chitarra slide",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3",
    cover: "https://images.unsplash.com/photo-1474015977313-cccd97cd64f9?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_46",
    title: "Notte di Luna Nuova",
    subtitle: "Meditazione sotto la Tenda",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3",
    cover: "https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_47",
    title: "Easy Rider",
    subtitle: "Southern Country Drive",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3",
    cover: "https://images.unsplash.com/photo-1447968954315-3f0c44f7313c?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_48",
    title: "Vento d'Estate",
    subtitle: "Warm Pop Beat",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3",
    cover: "https://images.unsplash.com/photo-1501426026826-31c667bdf23d?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_49",
    title: "Islanda Dream",
    subtitle: "Sognando Geyser & Ghiacciai",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    cover: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  },
  {
    id: "camper_track_50",
    title: "La Grande Avventura",
    subtitle: "Epica del Viaggiatore",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    cover: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=150&auto=format&fit=crop&q=60",
    isRadio: false
  }
];

interface CamperMediaPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayingStateChange: (isPlaying: boolean) => void;
}

export default function CamperMediaPlayer({ 
  isOpen, 
  onClose, 
  onPlayingStateChange 
}: CamperMediaPlayerProps) {
  const [sourceMode, setSourceMode] = React.useState<"radio" | "playlist" | "local">("radio");
  const [currentIdx, setCurrentIdx] = React.useState<number>(0);
  const [isPlaying, setIsPlaying] = React.useState<boolean>(false);
  const [volume, setVolume] = React.useState<number>(0.8);
  const [isMuted, setIsMuted] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [hasError, setHasError] = React.useState<boolean>(false);
  const [showList, setShowList] = React.useState<boolean>(false);
  const [localTracks, setLocalTracks] = React.useState<MediaTrack[]>([]);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const isChangingTrackRef = React.useRef<boolean>(false);
  const hlsRef = React.useRef<any>(null);

  const onPlayingStateChangeRef = React.useRef(onPlayingStateChange);
  React.useEffect(() => {
    onPlayingStateChangeRef.current = onPlayingStateChange;
  }, [onPlayingStateChange]);

  const tracks = sourceMode === "radio" 
    ? RADIO_STATIONS 
    : sourceMode === "playlist" 
      ? CAMPER_TRACKS 
      : localTracks;

  const currentTrack = tracks[currentIdx] || (tracks.length > 0 ? tracks[0] : null);

  const currentTrackRef = React.useRef<MediaTrack | null>(null);
  React.useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  // Sync state to window for external controls (e.g. Navigation Cockpit mini-player)
  React.useEffect(() => {
    const dispatchState = () => {
      const event = new CustomEvent("camper-media-state", {
        detail: {
          isPlaying,
          currentTrack,
          isLoading,
          hasError,
          sourceMode,
          hasTrack: !!currentTrack
        }
      });
      window.dispatchEvent(event);
    };

    dispatchState();

    const handleRequestState = () => {
      dispatchState();
    };

    window.addEventListener("camper-media-request-state", handleRequestState);
    return () => {
      window.removeEventListener("camper-media-request-state", handleRequestState);
    };
  }, [isPlaying, currentTrack, isLoading, hasError, sourceMode]);

  // Handle external commands
  React.useEffect(() => {
    const handleCommand = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { action } = customEvent.detail || {};
      if (action === "togglePlay") {
        togglePlay();
      } else if (action === "stop") {
        handleStop();
      } else if (action === "next") {
        handleNext();
      } else if (action === "prev") {
        handlePrev();
      }
    };

    window.addEventListener("camper-media-command", handleCommand);
    return () => {
      window.removeEventListener("camper-media-command", handleCommand);
    };
  }, [isPlaying, currentTrack, tracks, currentIdx]);

  // Revoke blob URLs on unmount to prevent memory leaks
  React.useEffect(() => {
    return () => {
      localTracks.forEach((track) => {
        if (track.url.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(track.url);
          } catch (e) {
            console.warn("Failed to revoke object URL:", e);
          }
        }
      });
    };
  }, [localTracks]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newTracks: MediaTrack[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      
      // Clean extension from name
      let title = file.name;
      const lastDot = title.lastIndexOf(".");
      if (lastDot !== -1) {
        title = title.substring(0, lastDot);
      }

      newTracks.push({
        id: `local_${file.name}_${Date.now()}_${i}`,
        title: title,
        subtitle: "File audio locale",
        url: url,
        cover: "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=150&auto=format&fit=crop&q=60",
        isRadio: false
      });
    }

    const nextIdx = localTracks.length;
    setLocalTracks((prev) => [...prev, ...newTracks]);
    setSourceMode("local");
    setCurrentIdx(nextIdx);
    setShowList(false);
    setIsPlaying(true);
    onPlayingStateChangeRef.current(true);
    setHasError(false);
    setIsLoading(true);

    // Auto-play the newly loaded first track synchronously inside user gesture thread
    if (audioRef.current && newTracks[0]) {
      try {
        isChangingTrackRef.current = true;
        audioRef.current.pause();
        audioRef.current.src = newTracks[0].url;
        audioRef.current.load();
        audioRef.current.play().catch(err => {
          console.warn("Autoplay block or error for local file:", err);
          isChangingTrackRef.current = false;
          setIsPlaying(false);
          onPlayingStateChangeRef.current(false);
          setIsLoading(false);
        });
      } catch (err) {
        console.warn("Error playing first local track:", err);
        isChangingTrackRef.current = false;
        setIsPlaying(false);
        onPlayingStateChangeRef.current(false);
        setIsLoading(false);
      }
    }
  };

  // Keep track of audio element
  React.useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    // Listeners
    const handlePlay = () => {
      isChangingTrackRef.current = false;
      setIsPlaying(true);
      onPlayingStateChangeRef.current(true);
      setHasError(false);
      setIsLoading(false);
    };

    const handlePause = () => {
      if (isChangingTrackRef.current) {
        console.log("Ignoring pause event during track transition");
        return;
      }
      setIsPlaying(false);
      onPlayingStateChangeRef.current(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlaying = () => {
      isChangingTrackRef.current = false;
      setIsLoading(false);
      setHasError(false);
    };

    const handleError = (e: any) => {
      isChangingTrackRef.current = false;
      const mediaError = audioRef.current?.error;
      
      // Use console.warn/log instead of console.error so standard/sandbox/headless issues are not flagged as failures
      console.warn("Audio playback issue/status:", mediaError ? { code: mediaError.code, message: mediaError.message } : e);
      
      // If there's no current track, or if the audio element's source is empty, ignore the error
      if (!currentTrackRef.current || !audioRef.current || !audioRef.current.src || audioRef.current.src === window.location.href) {
        return;
      }

      // MEDIA_ERR_ABORTED (code 1) is triggered when we change source or pause loading, which is harmless and normal.
      if (mediaError?.code === 1) {
        return;
      }

      setHasError(true);
      setIsLoading(false);
      setIsPlaying(false);
      onPlayingStateChangeRef.current(false);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("error", handleError as any);

    return () => {
      audio.pause();
      audio.src = "";
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch (e) {
          console.warn("Failed to destroy Hls on unmount:", e);
        }
        hlsRef.current = null;
      }
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("error", handleError as any);
      audioRef.current = null;
    };
  }, []);

  // Synchronize audio source when currentTrack changes or when we play
  React.useEffect(() => {
    if (audioRef.current && currentTrack) {
      const isM3U8 = currentTrack.url.includes(".m3u8") || currentTrack.url.includes("playlist_video") || currentTrack.url.includes("index.m3u8");
      
      // Stop and destroy previous HLS instance if any
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch (e) {
          console.warn("Failed to destroy Hls:", e);
        }
        hlsRef.current = null;
      }

      const wasPlaying = isPlaying;
      isChangingTrackRef.current = true;
      audioRef.current.pause();

      if (isM3U8) {
        // If HLS is supported natively (like Safari)
        if (audioRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          audioRef.current.src = currentTrack.url;
          audioRef.current.load();
          if (wasPlaying) {
            setIsLoading(true);
            audioRef.current.play().catch(err => {
              console.warn("Autoplay block or error:", err);
              isChangingTrackRef.current = false;
              setIsPlaying(false);
              onPlayingStateChangeRef.current(false);
              setIsLoading(false);
            });
          } else {
            isChangingTrackRef.current = false;
          }
        } 
        // If HLS.js is supported
        else {
          import('hls.js').then((HlsModule) => {
            const HlsClass = HlsModule.default;
            if (HlsClass.isSupported() && audioRef.current) {
              const hls = new HlsClass({
                enableWorker: true,
                lowLatencyMode: true,
              });
              hlsRef.current = hls;
              hls.loadSource(currentTrack.url);
              hls.attachMedia(audioRef.current);
              hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
                if (wasPlaying && audioRef.current) {
                  setIsLoading(true);
                  audioRef.current.play().catch(err => {
                    console.warn("Autoplay block or error in Hls.js trigger:", err);
                    isChangingTrackRef.current = false;
                    setIsPlaying(false);
                    onPlayingStateChangeRef.current(false);
                    setIsLoading(false);
                  });
                } else {
                  isChangingTrackRef.current = false;
                }
              });
              hls.on(HlsClass.Events.ERROR, (event, data) => {
                if (data.fatal) {
                  console.warn("HLS.js fatal error:", data);
                  setHasError(true);
                  setIsLoading(false);
                  setIsPlaying(false);
                  onPlayingStateChangeRef.current(false);
                }
              });
            } else {
              // Fallback if not supported
              if (audioRef.current) {
                audioRef.current.src = currentTrack.url;
                audioRef.current.load();
                if (wasPlaying) {
                  audioRef.current.play().catch(() => {});
                }
              }
            }
          }).catch(err => {
            console.error("Failed to load hls.js dynamically:", err);
            isChangingTrackRef.current = false;
          });
        }
      } else {
        // Standard non-HLS audio stream (e.g. mp3, aac)
        audioRef.current.src = currentTrack.url;
        audioRef.current.load();
        if (wasPlaying) {
          setIsLoading(true);
          audioRef.current.play().catch(err => {
            console.warn("Autoplay block or error:", err);
            isChangingTrackRef.current = false;
            setIsPlaying(false);
            onPlayingStateChangeRef.current(false);
            setIsLoading(false);
          });
        } else {
          isChangingTrackRef.current = false;
        }
      }
    } else if (audioRef.current && !currentTrack) {
      audioRef.current.pause();
      audioRef.current.src = "";
      setIsPlaying(false);
      onPlayingStateChangeRef.current(false);
      isChangingTrackRef.current = false;
    }
  }, [currentTrack?.id, sourceMode]);

  // Synchronize volume and mute states
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      setHasError(false);
      audioRef.current.play().catch(err => {
        if (err && err.name === "AbortError") {
          console.warn("La richiesta di play è stata interrotta (AbortError):", err.message);
        } else {
          console.warn("Errore avvio riproduzione:", err);
        }
        setIsLoading(false);
        setIsPlaying(false);
        onPlayingStateChangeRef.current(false);
        
        // Autoplay restrictions or rapid clicking interruptions are not genuine stream errors
        if (err && err.name !== "NotAllowedError" && err.name !== "AbortError") {
          setHasError(true);
        }
      });
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      try {
        if (audioRef.current.duration && isFinite(audioRef.current.duration)) {
          audioRef.current.currentTime = 0;
        }
      } catch (e) {
        // Safe check
      }
    }
    setIsPlaying(false);
    onPlayingStateChangeRef.current(false);
    window.dispatchEvent(new CustomEvent("camper-media-stopped"));
  };

  const handleNext = () => {
    if (tracks.length === 0) return;
    setCurrentIdx((prev) => (prev + 1) % tracks.length);
  };

  const handlePrev = () => {
    if (tracks.length === 0) return;
    setCurrentIdx((prev) => (prev - 1 + tracks.length) % tracks.length);
  };

  const selectTrack = (idx: number) => {
    if (tracks.length === 0) return;
    
    const targetTrack = tracks[idx];
    if (!targetTrack) return;

    setCurrentIdx(idx);
    setShowList(false);
    setIsPlaying(true);
    onPlayingStateChangeRef.current(true);
    setHasError(false);
    setIsLoading(true);

    if (audioRef.current) {
      try {
        isChangingTrackRef.current = true;
        audioRef.current.pause();
        audioRef.current.src = targetTrack.url;
        audioRef.current.load();
        
        // play() is called synchronously in the user gesture event loop thread, satisfying browser autoplay policies!
        audioRef.current.play().catch(err => {
          console.warn("Play blocked/error in selectTrack:", err);
          isChangingTrackRef.current = false;
          setIsPlaying(false);
          onPlayingStateChangeRef.current(false);
          setIsLoading(false);
          if (err && err.name !== "NotAllowedError" && err.name !== "AbortError") {
            setHasError(true);
          }
        });
      } catch (err) {
        console.warn("Error loading/playing track in selectTrack:", err);
        isChangingTrackRef.current = false;
        setIsPlaying(false);
        onPlayingStateChangeRef.current(false);
        setIsLoading(false);
        setHasError(true);
      }
    }
  };

  const switchMode = (mode: "radio" | "playlist" | "local") => {
    setSourceMode(mode);
    setCurrentIdx(0);
    setShowList(false);
  };

  return (
    <>
      {/* Equalizer CSS keyframes embedded to avoid global file modification */}
      <style>{`
        @keyframes camperEqualizer {
          0%, 100% { height: 4px; }
          50% { height: 26px; }
        }
        .equalizer-bar {
          animation: camperEqualizer 1s ease-in-out infinite;
        }
      `}</style>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-[170px] right-4 md:bottom-38 md:left-auto md:right-32 z-30 w-[300px] md:w-[320px] bg-[#070c17]/95 backdrop-blur-md border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
            id="camper-media-player-container"
          >
            {/* Header */}
            <div className="px-3 py-2 bg-[#0d1527] border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Disc className={`w-4 h-4 text-emerald-400 ${isPlaying && !isLoading ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }} />
                <span className="text-[11px] font-black text-slate-100 uppercase tracking-wider">
                  Cockpit Audio Camper
                </span>
              </div>
              <button 
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Minimizza in background"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Content Tab switcher */}
            <div className="grid grid-cols-3 border-b border-slate-800/60 text-center">
              <button
                type="button"
                onClick={() => switchMode("radio")}
                className={`py-1.5 text-[9px] sm:text-[10px] font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  sourceMode === "radio" 
                    ? "text-emerald-400 border-emerald-400 bg-emerald-500/5" 
                    : "text-slate-400 border-transparent hover:text-slate-200"
                }`}
                title="Sintonizza Radio FM Italia"
              >
                <Radio className="w-3 h-3" />
                Radio FM
              </button>
              <button
                type="button"
                onClick={() => switchMode("playlist")}
                className={`py-1.5 text-[9px] sm:text-[10px] font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  sourceMode === "playlist" 
                    ? "text-emerald-400 border-emerald-400 bg-emerald-500/5" 
                    : "text-slate-400 border-transparent hover:text-slate-200"
                }`}
                title="Playlist integrate nel camper"
              >
                <Music className="w-3 h-3" />
                Playlist
              </button>
              <button
                type="button"
                onClick={() => switchMode("local")}
                className={`py-1.5 text-[9px] sm:text-[10px] font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  sourceMode === "local" 
                    ? "text-emerald-400 border-emerald-400 bg-emerald-500/5" 
                    : "text-slate-400 border-transparent hover:text-slate-200"
                }`}
                title="Riproduci file audio dal tuo dispositivo"
              >
                <FolderOpen className="w-3 h-3" />
                File Locali
              </button>
            </div>

            {/* Display Body */}
            <div className="p-2.5 flex flex-col gap-2 relative min-h-[90px] justify-center">
              <AnimatePresence mode="wait">
                {!showList ? (
                  sourceMode === "local" && localTracks.length === 0 ? (
                    <motion.div
                      key="no-local-tracks"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col items-center justify-center py-4 text-center"
                    >
                      <FolderOpen className="w-10 h-10 text-slate-500 mb-2 animate-pulse" />
                      <p className="text-xs text-slate-400 max-w-[220px] leading-relaxed font-bold">
                        Riproduci i tuoi file MP3 ed audio dal tuo dispositivo!
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-3 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-[#070c17] rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 hover:scale-105"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Scegli file audio
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={currentTrack?.id || "empty"}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-3.5"
                    >
                      {/* Album Art Cover */}
                      <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-slate-700/60 bg-slate-800 flex-shrink-0 shadow-lg">
                        {currentTrack && currentTrack.cover ? (
                          <img 
                            src={currentTrack.cover} 
                            alt={currentTrack.title} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        
                        {/* Active equalizer overlay over album cover */}
                        {isPlaying && !isLoading && (
                          <div className="absolute inset-0 flex items-center justify-center gap-[2px] bg-black/40">
                            <div className="w-[2.5px] bg-emerald-400 rounded-full equalizer-bar" style={{ animationDelay: "0.1s", animationDuration: "0.8s" }} />
                            <div className="w-[2.5px] bg-emerald-400 rounded-full equalizer-bar" style={{ animationDelay: "0.3s", animationDuration: "1.1s" }} />
                            <div className="w-[2.5px] bg-emerald-400 rounded-full equalizer-bar" style={{ animationDelay: "0.5s", animationDuration: "0.7s" }} />
                          </div>
                        )}
                      </div>

                      {/* Track Titles / Station Titles */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black text-white truncate uppercase tracking-tight">
                          {currentTrack?.title || "Nessun brano"}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                          {currentTrack?.subtitle || "Seleziona una canzone"}
                        </p>
                        
                        {/* Streaming status / error badges */}
                        <div className="mt-1 flex items-center gap-1">
                          {isLoading && (
                            <span className="inline-flex items-center gap-1 text-[8px] font-bold text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded border border-amber-400/20 uppercase tracking-wider animate-pulse">
                              <RefreshCw className="w-2 h-2 animate-spin" />
                              Connessione...
                            </span>
                          )}
                          {!isLoading && isPlaying && (
                            <span className="inline-flex items-center gap-1 text-[8px] font-bold text-emerald-400 bg-emerald-400/10 px-1 py-0.5 rounded border border-emerald-400/20 uppercase tracking-wider">
                              <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping" />
                              Riproduzione
                            </span>
                          )}
                          {!isLoading && !isPlaying && !hasError && currentTrack && (
                            <span className="inline-flex items-center gap-1 text-[8px] font-bold text-slate-400 bg-slate-800 px-1 py-0.5 rounded border border-slate-700 uppercase tracking-wider">
                              In Pausa
                            </span>
                          )}
                          {hasError && (
                            <span className="inline-flex items-center gap-1 text-[8px] font-bold text-red-400 bg-red-400/10 px-1 py-0.5 rounded border border-red-400/20 uppercase tracking-wider">
                              Errore Stream
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                ) : (
                  // Track / Station List view
                  <motion.div
                    key="tracklist"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="max-h-[90px] overflow-y-auto pr-1 space-y-1 custom-scrollbar flex flex-col"
                  >
                    {tracks.map((track, idx) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => selectTrack(idx)}
                        className={`w-full text-left px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center justify-between cursor-pointer ${
                          currentIdx === idx 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {track.cover ? (
                            <img 
                              src={track.cover} 
                              alt="" 
                              className="w-4 h-4 rounded object-cover flex-shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : null}
                          <span className="truncate">{track.title}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-normal truncate max-w-[120px]">
                          {track.subtitle}
                        </span>
                      </button>
                    ))}
                    {sourceMode === "local" && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full text-center py-1.5 border border-dashed border-slate-700 hover:border-emerald-500/50 rounded-lg text-[11px] font-bold text-slate-400 hover:text-emerald-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                      >
                        <Upload className="w-3 h-3" />
                        Scegli altri file
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Interactive Control Panel */}
            <div className="px-3.5 py-2.5 bg-[#050912]/95 border-t border-slate-800/60 flex flex-col gap-2.5">
              {/* Main Buttons */}
              <div className="flex items-center justify-between">
                {/* Playlist list view toggle */}
                <button
                  type="button"
                  onClick={() => setShowList(!showList)}
                  className={`p-2 rounded-xl transition-all border cursor-pointer ${
                    showList 
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" 
                      : "border-slate-800 bg-[#0d1527]/50 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                  title="Mostra lista canali"
                >
                  <ListMusic className="w-4 h-4" />
                </button>

                {/* Media Playback Controls */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="p-2 rounded-xl border border-slate-800 bg-[#0d1527]/50 text-slate-300 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
                    title="Precedente"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={togglePlay}
                    className={`p-3 rounded-full transition-all cursor-pointer flex items-center justify-center shadow-lg ${
                      hasError 
                        ? "bg-red-500 text-white hover:bg-red-600" 
                        : isPlaying 
                          ? "bg-emerald-500 text-[#070c17] hover:bg-emerald-400 hover:scale-105 active:scale-95" 
                          : "bg-slate-100 text-[#070c17] hover:bg-white hover:scale-105 active:scale-95"
                    }`}
                    title={isPlaying ? "Metti in pausa" : "Riproduci"}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={handleStop}
                    className="p-2 rounded-xl border border-slate-800 bg-[#0d1527]/50 text-slate-300 hover:text-white hover:border-slate-700 transition-all cursor-pointer flex items-center justify-center"
                    title="Stop"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="p-2 rounded-xl border border-slate-800 bg-[#0d1527]/50 text-slate-300 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
                    title="Successivo"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                {/* Speaker Mute button */}
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    isMuted 
                      ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20" 
                      : "border-slate-800 bg-[#0d1527]/50 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                  title={isMuted ? "Riapri audio" : "Silenzia"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Volume Slider Controls */}
              <div className="flex items-center gap-2">
                <Volume1 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    if (isMuted) setIsMuted(false);
                  }}
                  className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 hover:accent-emerald-300"
                  style={{
                    background: `linear-gradient(to right, #34d399 0%, #34d399 ${volume * 100}%, #1e293b ${volume * 100}%, #1e293b 100%)`
                  }}
                  title={`Volume: ${Math.round(volume * 100)}%`}
                />
                <Volume2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/*"
        multiple
        className="hidden"
      />
    </>
  );
}
