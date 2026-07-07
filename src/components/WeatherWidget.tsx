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
  Loader2
} from 'lucide-react';
import { getWeatherData } from '../lib/weatherService';

interface WeatherWidgetProps {
  lat: number;
  lng: number;
  placeName?: string;
}

interface CurrentWeather {
  temperature: number;
  apparentTemperature?: number;
  humidity: number;
  windSpeed: number;
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

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ lat, lng, placeName }) => {
  const settings = useAppSettings();
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [daily, setDaily] = useState<DailyForecast[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'today' | 'forecast'>('today');

  const cacheKey = `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;

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
    }

    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    const formatted = date.toLocaleDateString('it-IT', options);
    // Capitalize first letter
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    // Check cache first
    // Note: cache handling is now centralized in weatherService

    const fetchWeather = async () => {
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        console.warn('WeatherWidget: Missing or invalid coordinates', { lat, lng });
        setError(null); // Just don't show weather if coords are invalid
        setLoading(false);
        return;
      }
      try {
        const data = await getWeatherData(lat, lng);
        
        if (!active) return;

        if (data.current && data.daily) {
          const fetchedCurrent: CurrentWeather = {
            temperature: Math.round(data.current.temperature_2m),
            apparentTemperature: Math.round(data.current.apparent_temperature),
            humidity: Math.round(data.current.relative_humidity_2m),
            windSpeed: Math.round(data.current.wind_speed_10m),
            precipitation: data.current.precipitation,
            weatherCode: data.current.weather_code,
            isDay: data.current.is_day === 1
          };

          const fetchedDaily: DailyForecast[] = data.daily.time.slice(0, 5).map((timeStr: string, idx: number) => ({
            date: timeStr,
            tempMax: Math.round(data.daily.temperature_2m_max[idx]),
            tempMin: Math.round(data.daily.temperature_2m_min[idx]),
            weatherCode: data.daily.weather_code[idx],
            precipitationProbability: data.daily.precipitation_probability_max 
              ? Math.round(data.daily.precipitation_probability_max[idx]) 
              : undefined
          }));

          setCurrent(fetchedCurrent);
          setDaily(fetchedDaily);
        } else {
          throw new Error('Dati meteo non validi.');
        }
        setLoading(false);
      } catch (err: any) {
        if (active) {
          console.warn('Weather fetch warning: rate limit or network issue', err.message);
          // Don't show red error Box for rate limits to improve UI experience if weather is secondary
          if (err.message && err.message.includes('429')) {
             setError('Meteo temporaneamente non disponibile per limite richieste.');
          } else {
             setError(err.message || 'Errore durante la connessione al servizio.');
          }
          setLoading(false);
        }
      }
    };

    fetchWeather();

    return () => {
      active = false;
    };
  }, [lat, lng, cacheKey]);

  if (!settings.weatherAlerts) {
    return null; // Or show a placeholder saying disabled
  }

  if (loading) {
    return (
      <div className="bg-[#F4F6F0] rounded-2xl p-4 border border-[#3E4A35]/10 mt-4 flex items-center justify-center min-h-[140px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#3E4A35]" />
          <span className="text-xs text-[#3E4A35] font-semibold">Caricamento meteo...</span>
        </div>
      </div>
    );
  }

  if (error || !current) {
    const isRateLimit = error && (error.includes('limite richieste') || error.includes('429'));
    
    if (isRateLimit) {
      return (
        <div className="bg-[#F4F6F0] rounded-2xl p-3 sm:p-4 border border-[#3E4A35]/15 mt-4 text-center">
          <p className="text-xs font-semibold text-slate-500 flex items-center justify-center gap-1.5">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400"/>
            Aggiornamento meteo in attesa
          </p>
        </div>
      );
    }
    
    return (
      <div className="bg-red-50/50 rounded-2xl p-4 border border-red-200/50 mt-4 text-center">
        <p className="text-xs font-semibold text-red-700">Meteo non disponibile al momento</p>
        <p className="text-[10px] text-red-500 mt-1">{error || 'Connessione a Open-Meteo fallita'}</p>
      </div>
    );
  }

  return (
    <div className="bg-[#F4F6F0] rounded-2xl p-3 sm:p-4 border border-[#3E4A35]/15 mt-4 group">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#3E4A35]/10 pb-2 mb-3">
        <div className="flex items-center gap-1.5">
          {getWeatherIcon(current.weatherCode, "w-5 h-5")}
          <span className="font-extrabold text-xs text-[#3E4A35] uppercase tracking-wide">
            Previsioni Meteo
          </span>
        </div>

        {/* Toggle view mode */}
        <div className="flex bg-[#E7EBDC] p-0.5 rounded-lg border border-[#3E4A35]/10">
          <button
            onClick={() => setViewMode('today')}
            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
              viewMode === 'today' 
                ? 'bg-[#3E4A35] text-white shadow-sm' 
                : 'text-[#3E4A35] hover:bg-[#3E4A35]/5'
            }`}
          >
            Oggi
          </button>
          <button
            onClick={() => setViewMode('forecast')}
            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
              viewMode === 'forecast' 
                ? 'bg-[#3E4A35] text-white shadow-sm' 
                : 'text-[#3E4A35] hover:bg-[#3E4A35]/5'
            }`}
          >
            5 Giorni
          </button>
        </div>
      </div>

      {/* Mode View: Today */}
      {viewMode === 'today' ? (
        <div className="animate-fade-in">
          {/* Main big temp and detail card */}
          <div className="flex items-center justify-between gap-2.5">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-[#3E4A35] tracking-tight">{formatTemperature(current.temperature, settings)}</span>
                {current.apparentTemperature !== undefined && (
                  <span className="text-slate-500 text-[10px] font-medium font-mono">Perc. {current.apparentTemperature}°</span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-700 mt-0.5">
                {getWeatherLabel(current.weatherCode)}
              </p>
            </div>

            <div className="p-1 px-2.5 bg-[#E7EBDC] rounded-xl flex items-center justify-center border border-[#3E4A35]/10">
              {getWeatherIcon(current.weatherCode, "w-10 h-10")}
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-1.5 mt-3">
            <div className="bg-[#E7EBDC]/50 rounded-xl p-2 flex flex-col items-center justify-center border border-[#3E4A35]/5">
              <Thermometer className="w-3.5 h-3.5 text-[#3E4A35]/70 mb-1" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Min / Max</span>
              <span className="text-xs font-black text-[#3E4A35] mt-1 font-mono">
                {daily[0] ? `${daily[0].tempMin}° / ${daily[0].tempMax}°` : '-- / --'}
              </span>
            </div>

            <div className="bg-[#E7EBDC]/50 rounded-xl p-2 flex flex-col items-center justify-center border border-[#3E4A35]/5">
              <Wind className="w-3.5 h-3.5 text-sky-600 mb-1" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Vento</span>
              <span className="text-xs font-black text-[#3E4A35] mt-1 font-mono">
                {formatSpeed(current.windSpeed, settings)}
              </span>
            </div>

            <div className="bg-[#E7EBDC]/50 rounded-xl p-2 flex flex-col items-center justify-center border border-[#3E4A35]/5">
              <Droplets className="w-3.5 h-3.5 text-blue-500 mb-1" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Umidità</span>
              <span className="text-xs font-black text-[#3E4A35] mt-1 font-mono">
                {current.humidity}%
              </span>
            </div>
          </div>

          {current.precipitation > 0 && (
            <div className="mt-2.5 flex items-center gap-1.5 bg-blue-50/70 border border-blue-200/50 p-1.5 rounded-xl">
              <Umbrella className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[10px] font-bold text-blue-700">Precipitazioni: {current.precipitation} mm in corso</span>
            </div>
          )}
        </div>
      ) : (
        /* Mode View: 5-Day Forecast */
        <div className="space-y-1.5 animate-fade-in">
          {daily.map((day, idx) => (
            <div 
              key={day.date} 
              className={`flex items-center justify-between p-2 rounded-xl border border-transparent transition-all ${
                idx === 0 ? 'bg-[#E7EBDC] border-[#3E4A35]/15' : 'bg-white/40 hover:bg-[#E7EBDC]/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-[#E7EBDC]/60 flex items-center justify-center">
                  {getWeatherIcon(day.weatherCode, "w-4 h-4")}
                </div>
                <div>
                  <p className="text-[11px] font-black text-[#3E4A35] leading-none">
                    {formatDayName(day.date)}
                  </p>
                  <p className="text-[9px] font-bold text-slate-500 mt-0.5 leading-none">
                    {getWeatherLabel(day.weatherCode)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {day.precipitationProbability !== undefined && day.precipitationProbability > 10 && (
                  <span className="text-[9px] font-bold font-mono text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    💧{day.precipitationProbability}%
                  </span>
                )}
                <div className="text-right font-mono text-[10px]">
                  <span className="text-slate-500 font-medium">{day.tempMin}°</span>
                  <span className="text-slate-400 mx-1">/</span>
                  <span className="text-[#3E4A35] font-extrabold">{day.tempMax}°</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
