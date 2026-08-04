import React from 'react';
import { 
  Settings, Moon, Sun, Bell, Volume2, HardDrive, RefreshCw, 
  Smartphone, AlertTriangle, LayoutDashboard, CheckSquare, 
  Heart, CloudSun, Map, Shield, User, ChevronRight, ArrowLeft, Search, Sliders
} from 'lucide-react';
import { DashboardSettings } from '../types';
import { speakSampleTts, TtsGender } from '../utils/ttsHelper';
import { resetAllRollyGuides } from './RollyOnboardingGuide';
import { CartoonCamperAvatar } from './CartoonCamperAvatar';

interface Props {
  isDarkMode: boolean;
  onThemeChange: (dark: boolean) => void;
  showTopNotifications: boolean;
  onToggleTopNotifications: (show: boolean) => void;
  dashboardSettings: DashboardSettings;
  onUpdateDashboardSettings: (settings: DashboardSettings) => void;
}

type CategoryId = 'aspect' | 'system' | 'navigation' | 'audio_notifications' | 'dashboard_modules' | 'privacy_security' | 'data_backup';

interface CategoryDef {
  id: CategoryId;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
}

export default function GeneralSettingsTab({ 
  isDarkMode, 
  onThemeChange, 
  showTopNotifications, 
  onToggleTopNotifications, 
  dashboardSettings, 
  onUpdateDashboardSettings 
}: Props) {
  // Category selection state
  const [activeCategory, setActiveCategory] = React.useState<CategoryId | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Try to load initial settings from localStorage
  const initialSettings = React.useMemo(() => {
    try {
      const saved = localStorage.getItem("camper_app_settings");
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {};
  }, []);

  const [metric, setMetric] = React.useState(initialSettings.metric ?? true);
  const [sounds, setSounds] = React.useState(initialSettings.sounds ?? true);
  const [vibrations, setVibrations] = React.useState(initialSettings.vibrations ?? true);
  const [ttsEnabled, setTtsEnabled] = React.useState(initialSettings.ttsEnabled ?? true);
  const [ttsGender, setTtsGender] = React.useState<TtsGender>(initialSettings.ttsGender ?? 'auto');
  const [autoBackup, setAutoBackup] = React.useState(initialSettings.autoBackup ?? false);
  const [isBackingUp, setIsBackingUp] = React.useState(false);

  // New settings states
  const [avoidUnpaved, setAvoidUnpaved] = React.useState(initialSettings.avoidUnpaved ?? true);
  const [publicProfile, setPublicProfile] = React.useState(initialSettings.publicProfile ?? true);
  const [shareData, setShareData] = React.useState(initialSettings.shareData ?? false);
  const [wifiOnlySync, setWifiOnlySync] = React.useState(initialSettings.wifiOnlySync ?? true);
  const [language, setLanguage] = React.useState(initialSettings.language ?? "it");
  const [temperatureUnit, setTemperatureUnit] = React.useState(initialSettings.temperatureUnit ?? "celsius");
  const [currency, setCurrency] = React.useState(initialSettings.currency ?? "EUR");
  const [fuelUnit, setFuelUnit] = React.useState(initialSettings.fuelUnit ?? "km_l");
  const [pinEnabled, setPinEnabled] = React.useState(initialSettings.pinEnabled ?? false);
  const [appPin, setAppPin] = React.useState(initialSettings.appPin ?? "");
  const [isClearingCache, setIsClearingCache] = React.useState(false);
  const [defaultPOI, setDefaultPOI] = React.useState(initialSettings.defaultPOI ?? "all");
  const [dimensionUnit, setDimensionUnit] = React.useState(initialSettings.dimensionUnit ?? "metric");
  const [photoQuality, setPhotoQuality] = React.useState(initialSettings.photoQuality ?? "medium");
  const [deadlineReminder, setDeadlineReminder] = React.useState(initialSettings.deadlineReminder ?? "15");
  const [mapTheme, setMapTheme] = React.useState(initialSettings.mapTheme ?? "standard");
  const [mapEngine, setMapEngine] = React.useState(initialSettings.mapEngine ?? "google");
  const [shareLocation, setShareLocation] = React.useState(initialSettings.shareLocation ?? false);
  const [weatherAlerts, setWeatherAlerts] = React.useState(initialSettings.weatherAlerts ?? true);
  const [drivingStyle, setDrivingStyle] = React.useState(initialSettings.drivingStyle ?? "relax");
  const [textSize, setTextSize] = React.useState(initialSettings.textSize ?? "normal");

  const [showPinModal, setShowPinModal] = React.useState(false);
  const [tempPin, setTempPin] = React.useState("");
  const [confirmPin, setConfirmPin] = React.useState("");
  const [pinError, setPinError] = React.useState("");

  const handleTogglePin = () => {
    if (pinEnabled) {
      setPinEnabled(false);
      setAppPin("");
    } else {
      setShowPinModal(true);
      setTempPin("");
      setConfirmPin("");
      setPinError("");
    }
  };

  const handleSavePin = () => {
    if (tempPin.length < 4) {
      setPinError(language === 'en' ? "PIN must be at least 4 digits" : language === 'fr' ? "Le code PIN doit comporter au moins 4 chiffres" : "Il PIN deve essere di almeno 4 cifre");
      return;
    }
    if (tempPin !== confirmPin) {
      setPinError(language === 'en' ? "PINs do not match" : language === 'fr' ? "Les codes PIN ne correspondent pas" : "I PIN non coincidono");
      return;
    }
    setAppPin(tempPin);
    setPinEnabled(true);
    setShowPinModal(false);
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message: language === 'en' ? "🔒 PIN set successfully!" : language === 'fr' ? "🔒 Code PIN défini avec succès!" : "🔒 PIN impostato con successo!" },
      })
    );
  };

  // Save settings on any change and apply text size
  React.useEffect(() => {
    const appSettings = {
      language, textSize, metric, dimensionUnit, temperatureUnit, currency, fuelUnit,
      avoidUnpaved, mapTheme, defaultPOI, deadlineReminder,
      sounds, vibrations, ttsEnabled, ttsGender, weatherAlerts, drivingStyle, publicProfile, shareData, shareLocation,
      autoBackup, wifiOnlySync, photoQuality, pinEnabled, appPin, mapEngine
    };
    localStorage.setItem("camper_app_settings", JSON.stringify(appSettings));
    
    // Dispatch to App
    window.dispatchEvent(new CustomEvent("app-settings-changed", { detail: { textSize, pinEnabled, appPin, ttsEnabled, ttsGender } }));

    // Apply text size locally
    if (textSize === "small") {
      document.documentElement.style.fontSize = "12px";
    } else if (textSize === "large") {
      document.documentElement.style.fontSize = "22px";
    } else {
      document.documentElement.style.fontSize = "16px";
    }
  }, [
    language, textSize, metric, dimensionUnit, temperatureUnit, currency, fuelUnit,
    avoidUnpaved, mapTheme, defaultPOI, deadlineReminder,
    sounds, vibrations, ttsEnabled, ttsGender, weatherAlerts, drivingStyle, publicProfile, shareData, shareLocation,
    autoBackup, wifiOnlySync, photoQuality, pinEnabled, appPin, mapEngine
  ]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    window.dispatchEvent(new CustomEvent("app-settings-changed", { detail: { language: newLang } }));
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message: newLang === 'en' ? 'Language partially updated.' : newLang === 'fr' ? 'Langue partiellement mise à jour.' : 'Lingua aggiornata in parte.' },
      })
    );
  };

  const handleClearCache = () => {
    setIsClearingCache(true);
    setTimeout(() => {
      setIsClearingCache(false);
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "🧹 Cache locale svuotata con successo!" },
        }),
      );
    }, 1200);
  };

  const handleBackup = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      setIsBackingUp(false);
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "✅ Backup manuale completato con successo!" },
        }),
      );
    }, 1500);
  };

  const handleChangeDashboardSetting = (key: keyof DashboardSettings) => {
    onUpdateDashboardSettings({ ...dashboardSettings, [key]: !dashboardSettings[key] });
  };

  const allSelected = Object.values(dashboardSettings).every(value => value === true);
  const toggleAllDashboardSettings = () => {
    const nextValue = !allSelected;
    const newSettings = { ...dashboardSettings };
    Object.keys(newSettings).forEach(key => {
      if (key !== 'showTopNotifications') {
        newSettings[key as keyof DashboardSettings] = nextValue;
      }
    });
    onUpdateDashboardSettings(newSettings);
  };

  const categories: CategoryDef[] = [
    {
      id: 'aspect',
      title: 'Aspetto & Schermo',
      subtitle: 'Tema scuro, dimensioni del testo e contrasto',
      icon: Moon,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800'
    },
    {
      id: 'system',
      title: 'Sistema & Unità',
      subtitle: 'Lingua, sistema metrico, valuta e consumi',
      icon: Settings,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
    },
    {
      id: 'navigation',
      title: 'Navigazione & Mappe',
      subtitle: 'Evita sterrate, motore mappa, stile guida e PDI',
      icon: Map,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
    },
    {
      id: 'audio_notifications',
      title: 'Notifiche & Voce GPS',
      subtitle: 'Sintesi vocale, genere voce, suoni e vibrazione',
      icon: Bell,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
    },
    {
      id: 'dashboard_modules',
      title: 'Moduli Dashboard',
      subtitle: 'Personalizza i riquadri visibili nella Home',
      icon: LayoutDashboard,
      color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800'
    },
    {
      id: 'privacy_security',
      title: 'Privacy & Protezione',
      subtitle: 'Condivisione posizione, profilo pubblico e PIN App',
      icon: Shield,
      color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
    },
    {
      id: 'data_backup',
      title: 'Gestione Dati & Backup',
      subtitle: 'Sincronizzazione Wi-Fi, qualità foto, backup e cache',
      icon: HardDrive,
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
    }
  ];

  // Render individual sections based on category
  const renderAspectSection = () => (
    <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <Moon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Aspetto e Interfaccia</h3>
      </div>
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Tema Scuro</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Usa la modalità notturna per l'interfaccia dell'app</p>
          </div>
          <button
            onClick={() => onThemeChange(!isDarkMode)}
            className={`w-12 h-6 shrink-0 rounded-full relative transition-colors ${isDarkMode ? 'bg-[#3E4A35]' : 'bg-slate-200 dark:bg-slate-600'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isDarkMode ? 'translate-x-6' : ''}`} />
          </button>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Dimensioni Testo</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Regola la grandezza dei caratteri in tutte le schede</p>
          </div>
          <select
            value={textSize}
            onChange={(e) => setTextSize(e.target.value)}
            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer border border-slate-200 dark:border-slate-600"
          >
            <option value="small">Piccolo (Compatto)</option>
            <option value="normal">Normale (Standard)</option>
            <option value="large">Grande (Accessibile)</option>
          </select>
        </div>
      </div>
    </section>
  );

  const renderSystemSection = () => (
    <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Sistema e Unità di Misura</h3>
      </div>
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Unità Misure Veicolo</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Scegli tra Metri/Kg e Piedi/Libbre</p>
          </div>
          <select
            value={dimensionUnit}
            onChange={(e) => setDimensionUnit(e.target.value)}
            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer border border-slate-200 dark:border-slate-600"
          >
            <option value="metric">Metri / Kg</option>
            <option value="imperial">Piedi / Libbre</option>
          </select>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Sistema Metrico Generico</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Usa Km, Kg e Litri ({metric ? 'Attivo' : 'Disattivo'})</p>
          </div>
          <button
            onClick={() => setMetric(!metric)}
            className={`w-12 h-6 shrink-0 rounded-full relative transition-colors ${metric ? 'bg-[#3E4A35]' : 'bg-slate-200 dark:bg-slate-600'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${metric ? 'translate-x-6' : ''}`} />
          </button>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Unità Temperatura</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Scegli tra Celsius e Fahrenheit per il meteo</p>
          </div>
          <select
            value={temperatureUnit}
            onChange={(e) => setTemperatureUnit(e.target.value)}
            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer border border-slate-200 dark:border-slate-600"
          >
            <option value="celsius">Celsius (°C)</option>
            <option value="fahrenheit">Fahrenheit (°F)</option>
          </select>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Lingua dell'App</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Seleziona la lingua principale dell'interfaccia</p>
          </div>
          <select
            value={language}
            onChange={handleLanguageChange}
            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer border border-slate-200 dark:border-slate-600"
          >
            <option value="it">Italiano 🇮🇹</option>
            <option value="en">English 🇬🇧</option>
            <option value="fr">Français 🇫🇷</option>
            <option value="de">Deutsch 🇩🇪</option>
            <option value="es">Español 🇪🇸</option>
          </select>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Valuta Predefinita</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Scegli la valuta per costi e spese</p>
          </div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer border border-slate-200 dark:border-slate-600"
          >
            <option value="EUR">Euro (€)</option>
            <option value="USD">Dollari ($)</option>
            <option value="GBP">Sterline (£)</option>
            <option value="CHF">Franchi (CHF)</option>
          </select>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Consumi Carburante</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Formato per calcolo consumi e registro</p>
          </div>
          <select
            value={fuelUnit}
            onChange={(e) => setFuelUnit(e.target.value)}
            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer border border-slate-200 dark:border-slate-600"
          >
            <option value="km_l">km / Litro</option>
            <option value="l_100km">Litri / 100km</option>
          </select>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Guide Assistente AI Rolly</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Riattiva le spiegazioni automatiche di Rolly per la prima visita in ogni sezione</p>
          </div>
          <button
            type="button"
            onClick={() => resetAllRollyGuides()}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:hover:bg-amber-900 dark:text-amber-200 dark:border-amber-700 font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <CartoonCamperAvatar className="w-4 h-4 shrink-0" />
            <span>Ripristina Guide Rolly</span>
          </button>
        </div>
      </div>
    </section>
  );

  const renderNavigationSection = () => (
    <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <Map className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Navigazione e Mappe</h3>
      </div>
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Evita Strade Sterrate</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Prediligi percorsi asfaltati ideali per il camper</p>
          </div>
          <button
            onClick={() => setAvoidUnpaved(!avoidUnpaved)}
            className={`w-12 h-6 shrink-0 rounded-full relative transition-colors ${avoidUnpaved ? 'bg-[#3E4A35]' : 'bg-slate-200 dark:bg-slate-600'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${avoidUnpaved ? 'translate-x-6' : ''}`} />
          </button>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Motore Mappa</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Google Maps (3D/Interattivo) o Leaflet (Ultra-veloce/Offline)</p>
          </div>
          <select
            value={mapEngine}
            onChange={(e) => {
              setMapEngine(e.target.value);
              window.dispatchEvent(new CustomEvent("app-settings-changed", { detail: { mapEngine: e.target.value } }));
            }}
            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer border border-slate-200 dark:border-slate-600"
          >
            <option value="google">Google Maps (3D/Online)</option>
            <option value="leaflet">Leaflet (Rapido/Offline)</option>
          </select>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Tema Grafico Mappa</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Stile grafico predefinito per la cartografia</p>
          </div>
          <select
            value={mapTheme}
            onChange={(e) => setMapTheme(e.target.value)}
            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer border border-slate-200 dark:border-slate-600"
          >
            <option value="standard">Standard</option>
            <option value="satellite">Satellite</option>
            <option value="hybrid">Ibrida</option>
            <option value="dark">Scura</option>
          </select>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Filtro PDI Predefinito</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tipologia punti di interesse visibili all'avvio</p>
          </div>
          <select
            value={defaultPOI}
            onChange={(e) => setDefaultPOI(e.target.value)}
            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer border border-slate-200 dark:border-slate-600"
          >
            <option value="all">Tutti i servizi</option>
            <option value="area_sosta">Aree di sosta</option>
            <option value="campeggio">Campeggi</option>
            <option value="parcheggio_camper">Parcheggi</option>
          </select>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Stile di Guida</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Calcola itinerari ottimizzati per consumo o velocità</p>
          </div>
          <select
            value={drivingStyle}
            onChange={(e) => setDrivingStyle(e.target.value)}
            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer border border-slate-200 dark:border-slate-600"
          >
            <option value="relax">Relax / Lento</option>
            <option value="eco">Eco / Risparmio Carburante</option>
            <option value="veloce">Veloce (Autostrade)</option>
          </select>
        </div>
      </div>
    </section>
  );

  const renderAudioNotificationsSection = () => (
    <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Notifiche & Sintesi Vocale GPS</h3>
      </div>
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-slate-400" />
            <div>
              <p className="font-bold text-[#2D2926] dark:text-white">Promemoria Scadenze</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Preavviso per bollo, assicurazione e revisione</p>
            </div>
          </div>
          <select
            value={deadlineReminder}
            onChange={(e) => setDeadlineReminder(e.target.value)}
            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer border border-slate-200 dark:border-slate-600"
          >
            <option value="7">7 giorni prima</option>
            <option value="15">15 giorni prima</option>
            <option value="30">30 giorni prima</option>
          </select>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-slate-400" />
            <div>
              <p className="font-bold text-[#2D2926] dark:text-white">Barra Notifiche Avvisi</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Mostra barra avvisi in caso di modalità offline</p>
            </div>
          </div>
          <button
            onClick={() => onToggleTopNotifications(!showTopNotifications)}
            className={`w-12 h-6 shrink-0 rounded-full relative transition-colors ${showTopNotifications ? 'bg-[#3E4A35]' : 'bg-slate-200 dark:bg-slate-600'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${showTopNotifications ? 'translate-x-6' : ''}`} />
          </button>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        
        {/* Sintesi Vocale */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-bold text-[#2D2926] dark:text-white">Sintesi Vocale & Istruzioni</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Leggi ad alta voce notifiche e guida navigatore GPS</p>
              </div>
            </div>
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`w-12 h-6 shrink-0 rounded-full relative transition-colors ${ttsEnabled ? 'bg-[#3E4A35]' : 'bg-slate-200 dark:bg-slate-600'}`}
            >
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${ttsEnabled ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          {ttsEnabled && (
            <div className="pl-8 pt-1 flex flex-col gap-2.5 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Selezione Voce & Tono Guida:
                </span>
                <button
                  type="button"
                  onClick={() => speakSampleTts(ttsGender)}
                  className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/50 rounded-lg hover:bg-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Ascolta Prova
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTtsGender('auto');
                    speakSampleTts('auto');
                  }}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    ttsGender === 'auto'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span>⚙️ Auto</span>
                  <span className="text-[9px] font-normal opacity-80">Sistema</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTtsGender('female');
                    speakSampleTts('female');
                  }}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    ttsGender === 'female'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span>♀️ Femminile</span>
                  <span className="text-[9px] font-normal opacity-80">Voce Chiara</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTtsGender('male');
                    speakSampleTts('male');
                  }}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    ttsGender === 'male'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span>♂️ Maschile</span>
                  <span className="text-[9px] font-normal opacity-80">Voce Profonda</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-slate-400" />
            <div>
              <p className="font-bold text-[#2D2926] dark:text-white">Effetti Sonori</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Suoni di conferma alla pressione dei pulsanti</p>
            </div>
          </div>
          <button
            onClick={() => setSounds(!sounds)}
            className={`w-12 h-6 shrink-0 rounded-full relative transition-colors ${sounds ? 'bg-[#3E4A35]' : 'bg-slate-200 dark:bg-slate-600'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${sounds ? 'translate-x-6' : ''}`} />
          </button>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CloudSun className="w-5 h-5 text-slate-400" />
            <div>
              <p className="font-bold text-[#2D2926] dark:text-white">Allerta Meteo</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Avvisi automatici per maltempo lungo il percorso</p>
            </div>
          </div>
          <button
            onClick={() => setWeatherAlerts(!weatherAlerts)}
            className={`w-12 h-6 shrink-0 rounded-full relative transition-colors ${weatherAlerts ? 'bg-[#3E4A35]' : 'bg-slate-200 dark:bg-slate-600'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${weatherAlerts ? 'translate-x-6' : ''}`} />
          </button>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-slate-400" />
            <div>
              <p className="font-bold text-[#2D2926] dark:text-white">Vibrazione App</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Feedback aptico sulle interazioni touch</p>
            </div>
          </div>
          <button
            onClick={() => setVibrations(!vibrations)}
            className={`w-12 h-6 shrink-0 rounded-full relative transition-colors ${vibrations ? 'bg-[#3E4A35]' : 'bg-slate-200 dark:bg-slate-600'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${vibrations ? 'translate-x-6' : ''}`} />
          </button>
        </div>
      </div>
    </section>
  );

  const renderDashboardModulesSection = () => (
    <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Moduli Visibili in Home</h3>
        </div>
        <button onClick={toggleAllDashboardSettings} className="text-xs font-bold text-[#3E4A35] dark:text-emerald-400 hover:opacity-80">
          {allSelected ? "Disattiva Tutti" : "Attiva Tutti"}
        </button>
      </div>
      <div className="p-5 space-y-4">
        {[
          { key: 'showChecklists', label: 'Checklist Pre-partenza', icon: CheckSquare },
          { key: 'showAIItinerary', label: 'Itinerario AI', icon: LayoutDashboard },
          { key: 'showBubbleLevel', label: 'Livella', icon: LayoutDashboard },
          { key: 'showWeightCalculator', label: 'Calcolatore Peso', icon: LayoutDashboard },
          { key: 'showOffGridEstimator', label: 'Stima Off-Grid', icon: LayoutDashboard },
          { key: 'showSostaLiberaTools', label: 'Strumenti Sosta Libera', icon: LayoutDashboard },
          { key: 'showCamperSecurity', label: 'Sicurezza Camper', icon: AlertTriangle },
          { key: 'showPantryShopping', label: 'Dispensa & Spesa', icon: LayoutDashboard },
          { key: 'showMaintenanceLog', label: 'Registro Manutenzione', icon: LayoutDashboard },
          { key: 'showFavorites', label: 'Preferiti', icon: Heart },
          { key: 'showFuelCard', label: 'Carta Carburante', icon: LayoutDashboard },
          { key: 'showEvents', label: 'Eventi', icon: CloudSun },
          { key: 'showOfflineMaps', label: 'Mappe Offline', icon: LayoutDashboard },
          { key: 'showDeadlines', label: 'Scadenziere', icon: LayoutDashboard },
          { key: 'showCommunity', label: 'Bacheca & Chat Locale', icon: LayoutDashboard },
          { key: 'showSharedTrips', label: 'Viaggi Condivisi', icon: LayoutDashboard },
          { key: 'showDimensions', label: 'Il Mio Camper, misure e info', icon: LayoutDashboard },
        ].map(({ key, label, icon: Icon }, index) => {
          const isChecked = dashboardSettings[key as keyof DashboardSettings];
          return (
            <div key={key}>
              {index > 0 && <div className="h-px bg-slate-100 dark:bg-slate-700 w-full mb-4" />}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-bold text-[#2D2926] dark:text-white">{label}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleChangeDashboardSetting(key as keyof DashboardSettings)}
                  className={`w-12 h-6 shrink-0 rounded-full relative transition-colors ${isChecked ? 'bg-[#3E4A35]' : 'bg-slate-200 dark:bg-slate-600'}`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isChecked ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  const renderPrivacySecuritySection = () => (
    <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <Shield className="w-5 h-5 text-rose-600 dark:text-rose-400" />
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Privacy e Protezione</h3>
      </div>
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Visibilità Camper su Mappa</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mostra la tua posizione approssimativa agli altri camperisti</p>
          </div>
          <button
            onClick={() => setShareLocation(!shareLocation)}
            className={`w-12 h-6 shrink-0 rounded-full relative transition-colors ${shareLocation ? 'bg-[#3E4A35]' : 'bg-slate-200 dark:bg-slate-600'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${shareLocation ? 'translate-x-6' : ''}`} />
          </button>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Visibilità Profilo Pubblico</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Permetti ad altri utenti di vedere i tuoi viaggi e resoconti condivisi</p>
          </div>
          <button
            onClick={() => setPublicProfile(!publicProfile)}
            className={`w-12 h-6 shrink-0 rounded-full relative transition-colors ${publicProfile ? 'bg-[#3E4A35]' : 'bg-slate-200 dark:bg-slate-600'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${publicProfile ? 'translate-x-6' : ''}`} />
          </button>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Condivisione Dati Anonimi</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Aiuta a migliorare l'app inviando statistiche tecniche anonime</p>
          </div>
          <button
            onClick={() => setShareData(!shareData)}
            className={`w-12 h-6 shrink-0 rounded-full relative transition-colors ${shareData ? 'bg-[#3E4A35]' : 'bg-slate-200 dark:bg-slate-600'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${shareData ? 'translate-x-6' : ''}`} />
          </button>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Protezione Accesso con PIN</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Richiedi un codice segreto di 4 cifre all'avvio dell'app</p>
          </div>
          <button
            onClick={handleTogglePin}
            className={`w-12 h-6 shrink-0 rounded-full relative transition-colors ${pinEnabled ? 'bg-[#3E4A35]' : 'bg-slate-200 dark:bg-slate-600'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${pinEnabled ? 'translate-x-6' : ''}`} />
          </button>
        </div>
      </div>
    </section>
  );

  const renderDataBackupSection = () => (
    <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <HardDrive className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Gestione Dati e Backup</h3>
      </div>
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Backup Automatico Cloud</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sincronizza diari, scadenze e preferiti in background</p>
          </div>
          <button
            onClick={() => setAutoBackup(!autoBackup)}
            className={`w-12 h-6 shrink-0 rounded-full relative transition-colors ${autoBackup ? 'bg-[#3E4A35]' : 'bg-slate-200 dark:bg-slate-600'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${autoBackup ? 'translate-x-6' : ''}`} />
          </button>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Sincronizzazione Solo Wi-Fi</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Risparmia giga mobili eseguendo il backup solo in Wi-Fi</p>
          </div>
          <button
            onClick={() => setWifiOnlySync(!wifiOnlySync)}
            className={`w-12 h-6 shrink-0 rounded-full relative transition-colors ${wifiOnlySync ? 'bg-[#3E4A35]' : 'bg-slate-200 dark:bg-slate-600'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${wifiOnlySync ? 'translate-x-6' : ''}`} />
          </button>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Qualità Foto Diario</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Scegli la risoluzione delle foto per ottimizzare lo spazio</p>
          </div>
          <select
            value={photoQuality}
            onChange={(e) => setPhotoQuality(e.target.value)}
            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer border border-slate-200 dark:border-slate-600"
          >
            <option value="high">Alta (Originale)</option>
            <option value="medium">Media (Consigliata)</option>
            <option value="low">Bassa (Salvaspazio)</option>
          </select>
        </div>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <button 
          onClick={handleBackup}
          disabled={isBackingUp}
          className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isBackingUp ? 'animate-spin' : ''}`} />
          {isBackingUp ? 'Backup in corso...' : 'Esegui Backup Manuale Ora'}
        </button>
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-[#2D2926] dark:text-white">Memoria Cache Locale</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">124 MB di dati temporanei sul dispositivo</p>
          </div>
          <button
            onClick={handleClearCache}
            disabled={isClearingCache}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold rounded-xl text-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isClearingCache ? 'Pulizia...' : 'Svuota Cache'}
          </button>
        </div>
      </div>
    </section>
  );

  const renderCategoryContent = (id: CategoryId) => {
    switch (id) {
      case 'aspect': return renderAspectSection();
      case 'system': return renderSystemSection();
      case 'navigation': return renderNavigationSection();
      case 'audio_notifications': return renderAudioNotificationsSection();
      case 'dashboard_modules': return renderDashboardModulesSection();
      case 'privacy_security': return renderPrivacySecuritySection();
      case 'data_backup': return renderDataBackupSection();
      default: return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 animate-fade-in pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#3E4A35]/10 text-[#3E4A35] dark:bg-slate-700 dark:text-slate-200 rounded-2xl">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#2D2926] dark:text-white tracking-tight">
              {language === 'en' ? 'General Settings' : language === 'fr' ? 'Paramètres Généraux' : 'Impostazioni Generali'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Scegli una categoria per gestire le preferenze dell'app
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca impostazione..."
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-xl outline-none focus:border-[#3E4A35] dark:focus:border-[#5A6B4E]"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* SEARCH MODE OR CATEGORY VIEW OR MAIN CATEGORIES GRID */}
      {searchQuery.trim() !== '' ? (
        /* Render all matching sections when searching */
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              🔍 Risultati ricerca per: "{searchQuery}"
            </span>
            <button 
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 underline cursor-pointer"
            >
              Cancella ricerca
            </button>
          </div>
          {renderAspectSection()}
          {renderSystemSection()}
          {renderNavigationSection()}
          {renderAudioNotificationsSection()}
          {renderDashboardModulesSection()}
          {renderPrivacySecuritySection()}
          {renderDataBackupSection()}
        </div>
      ) : activeCategory === null ? (
        /* MAIN CATEGORIES GRID (Pulsanti Categorie) */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Categorie Disponibili ({categories.length})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {categories.map((cat) => {
              const IconComp = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="group bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all text-left flex items-start justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`p-3 rounded-2xl border transition-transform group-hover:scale-105 ${cat.color}`}>
                      <IconComp className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-base text-[#2D2926] dark:text-white group-hover:text-[#3E4A35] dark:group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                        {cat.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {cat.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:text-[#3E4A35] dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0 mt-1">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* INSIDE A SPECIFIC CATEGORY VIEW */
        <div className="space-y-6 animate-fade-in">
          {/* Back button and Category Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <button
              onClick={() => setActiveCategory(null)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl transition-colors flex items-center gap-2 w-fit cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Tutte le Categorie
            </button>

            {/* Category Switcher Horizontal Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pb-1 sm:pb-0">
              {categories.map((c) => {
                const isCurrent = activeCategory === c.id;
                const IconC = c.icon;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      isCurrent
                        ? 'bg-[#3E4A35] text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <IconC className="w-3.5 h-3.5" />
                    <span>{c.title.split('&')[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Category Content */}
          {renderCategoryContent(activeCategory)}
        </div>
      )}

      {/* Modal PIN */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2926]/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-xl animate-scale-up border border-slate-100 dark:border-slate-700">
            <h3 className="text-xl font-black text-[#2D2926] dark:text-white text-center mb-2">Imposta PIN</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">Inserisci un PIN di 4 cifre per proteggere l'app</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Nuovo PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={tempPin}
                  onChange={(e) => setTempPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-center text-xl tracking-widest outline-none focus:border-[#3E4A35] dark:focus:border-[#5A6B4E]"
                  placeholder="••••"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Conferma PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-center text-xl tracking-widest outline-none focus:border-[#3E4A35] dark:focus:border-[#5A6B4E]"
                  placeholder="••••"
                />
              </div>

              {pinError && <p className="text-red-500 text-xs font-bold text-center">{pinError}</p>}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowPinModal(false)}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={handleSavePin}
                className="flex-1 px-4 py-3 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-bold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Salva PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
