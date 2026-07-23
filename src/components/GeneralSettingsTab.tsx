import React from 'react';
import { Settings, Moon, Sun, Bell, Volume2, HardDrive, RefreshCw, Smartphone, AlertTriangle, LayoutDashboard, CheckSquare, Heart, CloudSun, Map, Shield } from 'lucide-react';
import { DashboardSettings } from '../types';

interface Props {
  isDarkMode: boolean;
  onThemeChange: (dark: boolean) => void;
  showTopNotifications: boolean;
  onToggleTopNotifications: (show: boolean) => void;
  dashboardSettings: DashboardSettings;
  onUpdateDashboardSettings: (settings: DashboardSettings) => void;
}

export default function GeneralSettingsTab({ isDarkMode, onThemeChange, showTopNotifications, onToggleTopNotifications, dashboardSettings, onUpdateDashboardSettings }: Props) {
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
      sounds, vibrations, ttsEnabled, weatherAlerts, drivingStyle, publicProfile, shareData, shareLocation,
      autoBackup, wifiOnlySync, photoQuality, pinEnabled, appPin, mapEngine
    };
    localStorage.setItem("camper_app_settings", JSON.stringify(appSettings));
    
    // Dispatch to App
    window.dispatchEvent(new CustomEvent("app-settings-changed", { detail: { textSize, pinEnabled, appPin, ttsEnabled } }));

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
    sounds, vibrations, ttsEnabled, weatherAlerts, drivingStyle, publicProfile, shareData, shareLocation,
    autoBackup, wifiOnlySync, photoQuality, pinEnabled, mapEngine
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

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 animate-fade-in pb-20">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-[#3E4A35]/10 text-[#3E4A35] dark:bg-slate-700 dark:text-slate-200 rounded-2xl">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#2D2926] dark:text-white tracking-tight">
            {language === 'en' ? 'General Settings' : language === 'fr' ? 'Paramètres Généraux' : 'Impostazioni Generali'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {language === 'en' ? 'System preferences, backup and interface' : language === 'fr' ? 'Préférences système, sauvegarde et interface' : 'Preferenze di sistema, backup e interfaccia'}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Aspetto e Tema */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <Moon className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">Aspetto</h3>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#2D2926] dark:text-white">Tema Scuro</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Usa la modalità notturna per l'interfaccia</p>
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Regola la grandezza del testo nell'app</p>
              </div>
              <select
                value={textSize}
                onChange={(e) => setTextSize(e.target.value)}
                className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer"
              >
                <option value="small">Piccolo</option>
                <option value="normal">Normale</option>
                <option value="large">Grande</option>
              </select>
            </div>
          </div>
        </section>

        {/* Unità di Misura */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">Sistema</h3>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#2D2926] dark:text-white">Unità Misure Veicolo</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Scegli tra Metri/Kg e Piedi/Libbre</p>
              </div>
              <select
                value={dimensionUnit}
                onChange={(e) => setDimensionUnit(e.target.value)}
                className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer"
              >
                <option value="metric">Metri / Kg</option>
                <option value="imperial">Piedi / Libbre</option>
              </select>
            </div>
            <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#2D2926] dark:text-white">Sistema Metrico</p>
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
                <p className="font-bold text-[#2D2926] dark:text-white">Unità di Misura Temperatura</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Scegli tra Celsius e Fahrenheit</p>
              </div>
              <select
                value={temperatureUnit}
                onChange={(e) => setTemperatureUnit(e.target.value)}
                className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer"
              >
                <option value="celsius">Celsius (°C)</option>
                <option value="fahrenheit">Fahrenheit (°F)</option>
              </select>
            </div>
            <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#2D2926] dark:text-white">Lingua dell'App</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Seleziona la lingua principale</p>
              </div>
              <select
                value={language}
                onChange={handleLanguageChange}
                className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer"
              >
                <option value="it">Italiano</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
              </select>
            </div>
            <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#2D2926] dark:text-white">Valuta</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Scegli la valuta per i prezzi</p>
              </div>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer"
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Formato visualizzazione consumi</p>
              </div>
              <select
                value={fuelUnit}
                onChange={(e) => setFuelUnit(e.target.value)}
                className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer"
              >
                <option value="km_l">km/l</option>
                <option value="l_100km">l/100km</option>
              </select>
            </div>
          </div>
        </section>

        {/* Navigazione e Mappe */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <Map className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">Navigazione e Mappe</h3>
          </div>
          <div className="p-5 space-y-5">
            <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#2D2926] dark:text-white">Evita Strade Sterrate</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Prediligi percorsi asfaltati adatti ai camper</p>
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Scegli tra Google Maps (online 3D) o Leaflet (ultra-veloce/offline)</p>
              </div>
              <select
                value={mapEngine}
                onChange={(e) => {
                  setMapEngine(e.target.value);
                  window.dispatchEvent(new CustomEvent("app-settings-changed", { detail: { mapEngine: e.target.value } }));
                }}
                className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer"
              >
                <option value="google">Google Maps (Interattivo/3D)</option>
                <option value="leaflet">Leaflet (Rapido 5G/Offline)</option>
              </select>
            </div>
            <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#2D2926] dark:text-white">Tema Mappa</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Stile di visualizzazione predefinito</p>
              </div>
              <select
                value={mapTheme}
                onChange={(e) => setMapTheme(e.target.value)}
                className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer"
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Scegli cosa mostrare all'avvio</p>
              </div>
              <select
                value={defaultPOI}
                onChange={(e) => setDefaultPOI(e.target.value)}
                className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer"
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ottimizza percorsi in base al consumo</p>
              </div>
              <select
                value={drivingStyle}
                onChange={(e) => setDrivingStyle(e.target.value)}
                className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer"
              >
                <option value="relax">Relax / Lento</option>
                <option value="eco">Eco / Risparmio</option>
                <option value="veloce">Veloce (Autostrade)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Notifiche, Suoni e Vibrazione */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">Notifiche e Suoni</h3>
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
                className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer"
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="font-bold text-[#2D2926] dark:text-white">Sintesi Vocale Notifiche</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Leggi ad alta voce le notifiche ricevute</p>
                </div>
              </div>
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`w-12 h-6 shrink-0 rounded-full relative transition-colors ${ttsEnabled ? 'bg-[#3E4A35]' : 'bg-slate-200 dark:bg-slate-600'}`}
              >
                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${ttsEnabled ? 'translate-x-6' : ''}`} />
              </button>
            </div>
            <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="font-bold text-[#2D2926] dark:text-white">Effetti Sonori</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Suoni alla pressione dei tasti</p>
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
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Avvisi per maltempo lungo il percorso</p>
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
                  <p className="font-bold text-[#2D2926] dark:text-white">Vibrazione Aps</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Feedback aptico sulle azioni</p>
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

        {/* Personalizzazione Dashboard */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-slate-500" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">Moduli Dashboard</h3>
            </div>
            <button onClick={toggleAllDashboardSettings} className="text-xs font-bold text-[#3E4A35] hover:opacity-80">
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

        {/* Privacy e Condivisione */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">Privacy e Condivisione</h3>
          </div>
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#2D2926] dark:text-white">Visibilità Camper su Mappa</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mostra la tua posizione agli altri utenti</p>
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Permetti ad altri utenti di vedere i tuoi viaggi condivisi</p>
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Aiuta a migliorare l'app condividendo statistiche di utilizzo anonime</p>
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
                <p className="font-bold text-[#2D2926] dark:text-white">Protezione con PIN</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Richiedi un PIN per accedere all'app</p>
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

        {/* Backup Dati */}
        <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">Gestione Dati</h3>
          </div>
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#2D2926] dark:text-white">Backup Automatico</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sincronizza diari e spese in background</p>
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
                <p className="font-bold text-[#2D2926] dark:text-white">Solo Wi-Fi (Risparmio Dati)</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Esegui backup e download foto solo in Wi-Fi</p>
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Scegli la risoluzione per risparmiare spazio</p>
              </div>
              <select
                value={photoQuality}
                onChange={(e) => setPhotoQuality(e.target.value)}
                className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl px-3 py-1.5 text-sm outline-none cursor-pointer"
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
              className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isBackingUp ? 'animate-spin' : ''}`} />
              {isBackingUp ? 'Backup in corso...' : 'Esegui Backup Ora'}
            </button>
            <div className="h-px bg-slate-100 dark:bg-slate-700 w-full" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#2D2926] dark:text-white">Memoria Cache</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">124 MB occupati sul dispositivo</p>
              </div>
              <button
                onClick={handleClearCache}
                disabled={isClearingCache}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {isClearingCache ? 'Pulizia...' : 'Svuota Cache'}
              </button>
            </div>
          </div>
        </section>

      </div>

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
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-sm transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSavePin}
                className="flex-1 px-4 py-3 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-bold rounded-xl text-sm transition-colors"
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
