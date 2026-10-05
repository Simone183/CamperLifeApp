import React, { useEffect, useState } from 'react';
import { useAppSettings } from '../useAppSettings';
import { formatTemperature, formatSpeed } from '../unit-helpers';
import { 
  Sun, 
  CloudSun, 
  Cloud, 
  CloudFog, 
  CloudDrizzle, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  Wind, 
  Thermometer, 
  Droplets,
  Calendar,
  Umbrella,
  Loader2,
  AlertTriangle,
  ShieldAlert,
  Radio,
  PlusCircle,
  ChevronRight
} from 'lucide-react';
import { getWeatherData, getMeteoAlarmAlerts } from '../lib/weatherService';
import { MeteoAlarmWarning } from '../types';
import { communityWeatherAlertsService } from '../lib/communityWeatherAlertsService';

interface WeatherWidgetProps {
  lat: number;
  lng: number;
  placeName?: string;
  onOpenRadar?: () => void;
  onOpenReport?: () => void;
}

interface CurrentWeather {
  temperature: number;
  apparentTemperature?: number;
  humidity: number;
  windSpeed: number;
  windGusts?: number;
  precipitation: number;
  weatherCode: number;
  isDay: boolean;
}

interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipitationProbability?: number;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ 
  lat, 
  lng, 
  placeName,
  onOpenRadar,
  onOpenReport
}) => {
  const settings = useAppSettings();
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [daily, setDaily] = useState<DailyForecast[]>([]);
  const [warnings, setWarnings] = useState<MeteoAlarmWarning[]>([]);
  const [nearbyCommunityAlertsCount, setNearbyCommunityAlertsCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'today' | 'forecast'>('today');

  const getWeatherIcon = (code: number, sizeClass = "w-6 h-6") => {
    switch (code) {
      case 0:
        return <Sun className={`${sizeClass} text-amber-500 animate-[spin_40s_linear_infinite]`} />;
      case 1:
        return <CloudSun className={`${sizeClass} text-amber-500`} />;
      case 2:
        return <CloudSun className={`${sizeClass} text-slate-400`} />;
      case 3:
        return <Cloud className={`${sizeClass} text-slate-400`} />;
      case 45:
      case 48:
        return <CloudFog className={`${sizeClass} text-slate-400`} />;
      case 51:
      case 53:
      case 55:
      case 56:
      case 57:
        return <CloudDrizzle className={`${sizeClass} text-sky-400`} />;
      case 61:
      case 63:
      case 65:
      case 66:
      case 67:
      case 80:
      case 81:
      case 82:
        return <CloudRain className={`${sizeClass} text-sky-500`} />;
      case 71:
      case 73:
      case 75:
      case 77:
      case 85:
      case 86:
        return <CloudSnow className={`${sizeClass} text-blue-400`} />;
      case 95:
      case 96:
      case 99:
        return <CloudLightning className={`${sizeClass} text-yellow-600`} />;
      default:
        return <Cloud className={`${sizeClass} text-slate-400`} />;
    }
  };

  const getWeatherLabel = (code: number) => {
    switch (code) {
      case 0: return 'Sereno';
      case 1: return 'Prevalenza Sole';
      case 2: return 'Poco Nuvoloso';
      case 3: return 'Coperto';
      case 45: return 'Nebbia';
      case 48: return 'Nebbia Brillante';
      case 51: return 'Pioggerella Leggera';
      case 53: return 'Pioggerella Moderata';
      case 55: return 'Pioggerella Intensa';
      case 56: return 'Gelicidio Leggero';
      case 57: return 'Gelicidio Forte';
      case 61: return 'Pioggia Leggera';
      case 63: return 'Pioggia Moderata';
      case 65: return 'Pioggia Forte';
      case 66: return 'Pioggia Congelante Lieve';
      case 67: return 'Pioggia Congelante Forte';
      case 71: return 'Neve Leggera';
      case 73: return 'Neve Moderata';
      case 75: return 'Fitta Nevicata';
      case 77: return 'Nevischio / Gragnola';
      case 80: return 'Rovesci di Pioggia Lieve';
      case 81: return 'Rovesci di Pioggia Moderata';
      case 82: return 'Forti Rovesci / Acquazzone';
      case 85: return 'Rovesci di Neve Lieve';
      case 86: return 'Rovesci di Neve Forte';
      case 95: return 'Temporale';
      case 96: return 'Temporale con Grandine Fine';
      case 99: return 'Temporale con Forte Grandinata';
      default: return 'Variabile';
    }
  };

  const formatDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Oggi';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Domani';
    } else {
      return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
    }
  };

  useEffect(() => {
    let active = true;

    const fetchWeatherAndAlerts = async () => {
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [data, meteoAlerts] = await Promise.all([
          getWeatherData(lat, lng),
          getMeteoAlarmAlerts(lat, lng)
        ]);

        if (!active) return;

        if (data && data.current) {
          const fetchedCurrent: CurrentWeather = {
            temperature: data.current.temperature_2m,
            apparentTemperature: data.current.apparent_temperature,
            humidity: data.current.relative_humidity_2m,
            windSpeed: data.current.wind_speed_10m,
            windGusts: data.current.wind_gusts_10m,
            precipitation: data.current.precipitation,
            weatherCode: data.current.weather_code,
            isDay: data.current.is_day === 1
          };

          const fetchedDaily: DailyForecast[] = [];
          if (data.daily && Array.isArray(data.daily.time)) {
            data.daily.time.slice(0, 5).forEach((dateStr: string, idx: number) => {
              fetchedDaily.push({
                date: dateStr,
                tempMax: Math.round(data.daily.temperature_2m_max[idx]),
                tempMin: Math.round(data.daily.temperature_2m_min[idx]),
                weatherCode: data.daily.weather_code[idx],
                precipitationProbability: data.daily.precipitation_probability_max ? data.daily.precipitation_probability_max[idx] : undefined
              });
            });
          }

          setCurrent(fetchedCurrent);
          setDaily(fetchedDaily);
          setWarnings(meteoAlerts || []);
          setError(null);
        } else {
          throw new Error('Dati meteo non validi.');
        }
      } catch (err: any) {
        if (!active) return;
        console.warn('Weather fetch warning:', err.message);
        setError('Impossibile caricare il meteo al momento.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchWeatherAndAlerts();

    // Check community alerts nearby
    const checkComm = () => {
      if (typeof lat === 'number' && typeof lng === 'number') {
        const nearby = communityWeatherAlertsService.getNearbyAlerts(lat, lng, 30);
        setNearbyCommunityAlertsCount(nearby.length);
      }
    };
    checkComm();
    const unsub = communityWeatherAlertsService.subscribe(checkComm);

    return () => {
      active = false;
      unsub();
    };
  }, [lat, lng]);

  if (!settings.weatherAlerts) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 my-3 text-center border border-slate-200 dark:border-slate-700 animate-pulse">
        <p className="text-xs font-semibold text-slate-500 flex items-center justify-center gap-1.5">
          <Loader2 className="w-4 h-4 animate-spin text-slate-400"/>
          Caricamento meteo & radar allerte...
        </p>
      </div>
    );
  }

  if (error || !current) {
    return (
      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 my-3 border border-slate-200 dark:border-slate-700 text-center">
        <p className="text-xs font-medium text-slate-500">Meteo non disponibile</p>
      </div>
    );
  }

  const hasSevereWarnings = warnings.length > 0 || nearbyCommunityAlertsCount > 0;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 my-3 shadow-xs space-y-3">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
        <div className="flex items-center gap-2">
          {getWeatherIcon(current.weatherCode, "w-5 h-5")}
          <div>
            <span className="font-black text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              {placeName || 'Meteo & Allerte'}
            </span>
          </div>
        </div>

        {/* Toggle view mode */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px]">
          <button
            onClick={() => setViewMode('today')}
            className={`px-2.5 py-1 font-bold rounded-md transition-all cursor-pointer ${
              viewMode === 'today' 
                ? 'bg-[#3E4A35] text-white shadow-xs' 
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            Oggi
          </button>
          <button
            onClick={() => setViewMode('forecast')}
            className={`px-2.5 py-1 font-bold rounded-md transition-all cursor-pointer ${
              viewMode === 'forecast' 
                ? 'bg-[#3E4A35] text-white shadow-xs' 
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            5 Giorni
          </button>
        </div>
      </div>

      {/* Severe Weather / MeteoAlarm Warning Banner */}
      {hasSevereWarnings && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
              <span>
                {nearbyCommunityAlertsCount > 0
                  ? `⚠️ ${nearbyCommunityAlertsCount} Segnalazione/i entro 30 km!`
                  : `⚠️ ${warnings[0]?.headline || 'Allerta Meteo Severa'}`}
              </span>
            </div>
            {onOpenRadar && (
              <button
                type="button"
                onClick={onOpenRadar}
                className="text-[10px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-md cursor-pointer hover:bg-rose-700 transition-colors"
              >
                Vedi Allerte
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mode View: Today */}
      {viewMode === 'today' ? (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-[#3E4A35] dark:text-emerald-400 tracking-tight">
                  {formatTemperature(current.temperature, settings)}
                </span>
                {current.apparentTemperature !== undefined && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    (Percepiti {formatTemperature(current.apparentTemperature, settings)})
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                {getWeatherLabel(current.weatherCode)}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 text-right">
              <div className="flex items-center gap-1 justify-end text-xs font-bold text-slate-700 dark:text-slate-200">
                <Wind className="w-3.5 h-3.5 text-cyan-600" />
                <span>{formatSpeed(current.windSpeed, settings)}</span>
              </div>
              {current.windGusts && current.windGusts > current.windSpeed && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block mt-0.5">
                  Raffiche: {formatSpeed(current.windGusts, settings)}
                </span>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px] flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-blue-500" /> Umidità
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{current.humidity}%</span>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px] flex items-center gap-1">
                <Umbrella className="w-3.5 h-3.5 text-sky-500" /> Pioggia
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{current.precipitation} mm</span>
            </div>
          </div>
        </div>
      ) : (
        /* 5-Day Forecast */
        <div className="space-y-1.5 animate-fade-in">
          {daily.map((day) => (
            <div 
              key={day.date} 
              className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-700/30"
            >
              <div className="flex items-center gap-2">
                {getWeatherIcon(day.weatherCode, "w-4 h-4")}
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                    {formatDayName(day.date)}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {getWeatherLabel(day.weatherCode)}
                  </p>
                </div>
              </div>

              <div className="text-right text-xs font-mono font-bold">
                <span className="text-slate-400">{day.tempMin}°</span>
                <span className="text-slate-300 mx-1">/</span>
                <span className="text-slate-900 dark:text-white">{day.tempMax}°</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Bar: Allerte & Segnala Button */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
        {onOpenRadar && (
          <button
            type="button"
            onClick={onOpenRadar}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-[#3E4A35] dark:text-emerald-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span>Radar Allerte (30 km)</span>
          </button>
        )}

        {onOpenReport && (
          <button
            type="button"
            onClick={onOpenReport}
            className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95"
            title="Segnala grandine o temporale nella tua posizione"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Segnala</span>
          </button>
        )}
      </div>
    </div>
  );
};
