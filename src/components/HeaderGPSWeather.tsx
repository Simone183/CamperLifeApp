import React, { useEffect, useState } from 'react';
import { useAppSettings } from '../useAppSettings';
import { formatTemperature } from '../unit-helpers';
import { 
  Sun, 
  CloudSun, 
  Cloud, 
  CloudFog, 
  CloudDrizzle, 
  CloudRain, 
  CloudSnow, 
  CloudLightning,
  Compass,
  Loader2
} from 'lucide-react';
import { getWeatherData } from '../lib/weatherService';

interface HeaderGPSWeatherProps {
  lat: number | null;
  lng: number | null;
  onClick: () => void;
  onRequestGPS: () => void;
}

export const HeaderGPSWeather: React.FC<HeaderGPSWeatherProps> = ({ 
  lat, 
  lng, 
  onClick, 
  onRequestGPS 
}) => {
  const settings = useAppSettings();
  const [temp, setTemp] = useState<number | null>(null);
  const [code, setCode] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const getWeatherIcon = (weatherCode: number) => {
    const s = "w-4.5 h-4.5 sm:w-5 sm:h-5";
    switch (weatherCode) {
      case 0:
        return <Sun className={`${s} text-amber-500 animate-[spin_40s_linear_infinite]`} />;
      case 1:
      case 2:
        return <CloudSun className={`${s} text-amber-500`} />;
      case 3:
        return <Cloud className={`${s} text-slate-400`} />;
      case 45:
      case 48:
        return <CloudFog className={`${s} text-slate-400`} />;
      case 51:
      case 53:
      case 55:
        return <CloudDrizzle className={`${s} text-sky-400`} />;
      case 61:
      case 63:
      case 65:
      case 80:
      case 81:
      case 82:
        return <CloudRain className={`${s} text-sky-500 animate-pulse`} />;
      case 71:
      case 73:
      case 75:
        return <CloudSnow className={`${s} text-blue-400`} />;
      case 95:
      case 96:
      case 99:
        return <CloudLightning className={`${s} text-yellow-500`} />;
      default:
        return <Cloud className={`${s} text-slate-400`} />;
    }
  };

  useEffect(() => {
    if (lat === null || lng === null) return;

    let active = true;
    setLoading(true);

    const fetchCompact = async () => {
      try {
        const data = await getWeatherData(lat, lng, false);
        if (active && data.current) {
          setTemp(Math.round(data.current.temperature_2m));
          setCode(data.current.weather_code);
        }
      } catch (err: any) {
        console.warn("Compact weather fetch warning:", err.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchCompact();

    // Refresh every 30 minutes
    const interval = setInterval(fetchCompact, 30 * 60 * 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [lat, lng]);

  if (lat === null || lng === null) {
    return (
      <button
        onClick={onRequestGPS}
        className="h-8.5 min-[360px]:h-9 sm:h-10 flex items-center justify-center gap-1 min-[360px]:gap-1.5 px-2 min-[360px]:px-2.5 sm:px-3.5 bg-amber-50/90 hover:bg-amber-100/90 text-[#3E4A35] dark:bg-slate-700 dark:text-white rounded-xl border border-amber-200 dark:border-slate-500 text-[10.5px] min-[360px]:text-[11.5px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap active:scale-95 shrink-0"
        title="Attiva GPS per caricare il meteo locale"
      >
        <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-[#3E4A35] dark:text-white animate-[spin_5s_linear_infinite]" />
        <span className="hidden xs:inline">Attiva Meteo GPS</span>
        <span className="xs:hidden">Meteo</span>
      </button>
    );
  }

  if (loading && temp === null) {
    return (
      <div className="h-8.5 min-[360px]:h-9 sm:h-10 flex items-center justify-center gap-1.5 px-2 min-[360px]:px-2.5 sm:px-3.5 bg-[#F4F6F0] rounded-xl border border-[#3E4A35]/10 text-[10.5px] min-[360px]:text-[11px] text-slate-500 font-semibold shrink-0">
        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-[#3E4A35]" />
        <span className="hidden sm:inline">Attendi...</span>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="h-8.5 min-[360px]:h-9 sm:h-10 flex items-center justify-center gap-1.5 px-2 min-[360px]:px-2.5 sm:px-3 bg-[#F4F6F0] hover:bg-[#E7EBDC] active:bg-[#D1CDBF]/70 text-[#3E4A35] dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white rounded-xl border border-[#3E4A35]/15 dark:border-slate-500 transition-all cursor-pointer shadow-xs active:scale-95 text-[11px] min-[360px]:text-xs sm:text-[13px] font-black shrink-0"
      title="Meteo GPS della tua posizione (Clicca per dettagli)"
    >
      <div className="flex items-center gap-1 min-[360px]:gap-1.5">
        {code !== null ? getWeatherIcon(code) : <Sun className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-500" />}
        <span className="text-[#3E4A35] dark:text-white font-mono font-extrabold tracking-tight text-[11px] min-[360px]:text-xs sm:text-[13px]">
          {temp !== null ? `${formatTemperature(temp, settings)}` : settings.temperatureUnit === 'fahrenheit' ? '--°F' : '--°C'}
        </span>
      </div>
      <span className="text-[9px] sm:text-[9.5px] bg-[#3E4A35]/10 text-[#3E4A35] dark:bg-slate-500 dark:text-white font-black px-1.5 py-0.5 rounded-md hidden md:inline">
        GPS METEO
      </span>
    </button>
  );
};
