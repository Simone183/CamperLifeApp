import { useState, useEffect } from 'react';
import { AppSettings } from './types';

export function useAppSettings(): AppSettings {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem("camper_app_settings");
      if (saved) return JSON.parse(saved);
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
      avoidTolls: false,
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
      pinEnabled: false
    } as AppSettings;
  });

  useEffect(() => {
    const handleSettingsChanged = () => {
      try {
        const saved = localStorage.getItem("camper_app_settings");
        if (saved) {
          setSettings(JSON.parse(saved));
        }
      } catch (e) {}
    };

    window.addEventListener("app-settings-changed", handleSettingsChanged);
    return () => window.removeEventListener("app-settings-changed", handleSettingsChanged);
  }, []);

  return settings;
}
