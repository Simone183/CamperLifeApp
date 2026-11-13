import { useState, useEffect } from 'react';
import { AppSettings } from './types';

export function useAppSettings(): AppSettings {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem("camper_app_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!localStorage.getItem("user_google_maps_key")) {
          parsed.mapEngine = "leaflet";
        }
        if (!parsed.ttsGender || parsed.ttsGender === "auto") {
          parsed.ttsGender = "male";
        }
        return parsed;
      }
    } catch (e) {}
    
    return {
      language: "it",
      textSize: "normal",
      theme: "system",
      metric: true,
      dimensionUnit: "metric",
      temperatureUnit: "celsius",
      currency: "EUR",
      fuelUnit: "km_l",
      avoidUnpaved: true,
      mapTheme: "standard",
      defaultPOI: "all",
      deadlineReminder: "15",
      showTopNotifications: true,
      sounds: true,
      vibrations: true,
      weatherAlerts: true,
      drivingStyle: "relax",
      publicProfile: true,
      shareData: false,
      shareLocation: false,
      autoBackup: false,
      wifiOnlySync: true,
      photoQuality: "medium",
      pinEnabled: false,
      mapEngine: "leaflet",
      ttsEnabled: true,
      ttsGender: "male"
    } as AppSettings;
  });

  useEffect(() => {
    const handleSettingsChanged = () => {
      try {
        const saved = localStorage.getItem("camper_app_settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (!parsed.ttsGender || parsed.ttsGender === "auto") {
            parsed.ttsGender = "male";
          }
          setSettings(parsed);
        }
      } catch (e) {}
    };

    window.addEventListener("app-settings-changed", handleSettingsChanged);
    return () => window.removeEventListener("app-settings-changed", handleSettingsChanged);
  }, []);

  return settings;
}
