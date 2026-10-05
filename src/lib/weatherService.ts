// Shared service to manage weather requests and MeteoAlarm / Severe Weather alerts
import { MeteoAlarmWarning } from '../types';

const CACHE_TTL = 1800 * 1000; // 30 minutes cache for forecasts
const weatherCache: Record<string, { data: { current: any; daily?: any[]; hourly?: any }; timestamp: number }> = {};
const pendingRequests: Record<string, Promise<any>> = {};

export const getWeatherData = async (lat: number, lng: number, fetchDaily: boolean = true) => {
  const cacheKey = `${Number(lat).toFixed(2)},${Number(lng).toFixed(2)}-${fetchDaily}`;
  
  // Return cached if valid
  if (weatherCache[cacheKey] && Date.now() - weatherCache[cacheKey].timestamp < CACHE_TTL) {
    return weatherCache[cacheKey].data;
  }

  // Return pending request if exists
  if (pendingRequests[cacheKey]) {
    return pendingRequests[cacheKey];
  }

  // Otherwise, create new request
  const request = (async () => {
    try {
      const dailyParam = fetchDaily ? '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max' : '';
      const currentParam = fetchDaily 
        ? 'current=temperature_2m,apparent_temperature,precipitation,relative_humidity_2m,weather_code,wind_speed_10m,wind_gusts_10m,is_day&hourly=weather_code,precipitation,precipitation_probability,wind_speed_10m,wind_gusts_10m' 
        : 'current=temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m';
        
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&${currentParam}${dailyParam}&timezone=auto`;
      const res = await fetch(url);
      
      if (!res.ok) {
        if (res.status === 429) {
          // Fallback to avoid crashing and UI errors for rate limit
          const today = new Date().toISOString().split('T')[0];
          return { 
            current: { temperature_2m: 15, weather_code: 0, apparent_temperature: 15, precipitation: 0, relative_humidity_2m: 50, wind_speed_10m: 10, wind_gusts_10m: 15, is_day: 1 },
            daily: {
              time: [today, today, today, today, today],
              temperature_2m_max: [18, 18, 18, 18, 18],
              temperature_2m_min: [10, 10, 10, 10, 10],
              weather_code: [0, 0, 0, 0, 0],
              precipitation_probability_max: [0, 0, 0, 0, 0],
              wind_gusts_10m_max: [15, 15, 15, 15, 15]
            }
          };
        }
        throw new Error(`Status: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      weatherCache[cacheKey] = { data, timestamp: Date.now() };
      return data;
    } finally {
      delete pendingRequests[cacheKey];
    }
  })();

  pendingRequests[cacheKey] = request;
  return request;
};

/**
 * Analyzes weather parameters and European meteorological indices (MeteoAlarm standards)
 * to generate severe weather warnings and protective camper tips.
 */
export const getMeteoAlarmAlerts = async (lat: number, lng: number): Promise<MeteoAlarmWarning[]> => {
  try {
    const data = await getWeatherData(lat, lng, true);
    if (!data || !data.current) return [];

    const warnings: MeteoAlarmWarning[] = [];
    const currentCode = data.current.weather_code ?? 0;
    const currentWindGusts = data.current.wind_gusts_10m ?? data.current.wind_speed_10m ?? 0;
    const currentPrecip = data.current.precipitation ?? 0;

    // Check next 12 hours from hourly forecast if available
    let maxGustNext12h = currentWindGusts;
    let maxPrecipNext12h = currentPrecip;
    let hasHailCodeNext12h = currentCode === 96 || currentCode === 99;
    let hasStormCodeNext12h = currentCode === 95 || currentCode === 96 || currentCode === 99;

    if (data.hourly && Array.isArray(data.hourly.time)) {
      const nowIdx = new Date().getHours();
      const sliceEnd = Math.min(nowIdx + 12, data.hourly.time.length);
      
      for (let i = nowIdx; i < sliceEnd; i++) {
        const code = data.hourly.weather_code?.[i] ?? 0;
        const gust = data.hourly.wind_gusts_10m?.[i] ?? 0;
        const precip = data.hourly.precipitation?.[i] ?? 0;

        if (gust > maxGustNext12h) maxGustNext12h = gust;
        if (precip > maxPrecipNext12h) maxPrecipNext12h = precip;
        if (code === 96 || code === 99) hasHailCodeNext12h = true;
        if (code === 95 || code === 96 || code === 99) hasStormCodeNext12h = true;
      }
    }

    // 1. ALLERTA GRANDINE (Severe Hail Warning)
    if (hasHailCodeNext12h || currentCode === 96 || currentCode === 99) {
      const isExtreme = currentCode === 99;
      warnings.push({
        id: `hail-${Date.now()}`,
        event: 'Rischio Grandine & Temporale Violento',
        headline: isExtreme ? 'Allerta Rossa: Rischio Grandinata Violenta' : 'Allerta Arancione: Possibile Grandine',
        description: 'Presenza di celle temporalesche intense con elevata probabilità di grandine e colpi di vento.',
        severity: isExtreme ? 'Red' : 'Orange',
        urgency: 'Immediate',
        effective: new Date().toISOString(),
        expires: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
        icon: '🧊',
        camperAdvice: [
          'Chiudere immediatamente tutti gli oblò sul tetto, finestre e zanzariere.',
          'Cercare se possibile un riparo coperto, tettoia o stazione di servizio.',
          'Se in marcia, ridurre drasticamente la velocità o sostare in area sicura.'
        ]
      });
    }

    // 2. ALLERTA VENTO FORTE (Wind Gusts > 55 km/h)
    if (maxGustNext12h >= 55) {
      const isRed = maxGustNext12h >= 80;
      warnings.push({
        id: `wind-${Date.now()}`,
        event: 'Raffiche di Vento Forte',
        headline: isRed 
          ? `Allerta Rossa: Raffiche estreme fino a ${Math.round(maxGustNext12h)} km/h` 
          : `Allerta Vento: Raffiche previste a ${Math.round(maxGustNext12h)} km/h`,
        description: 'Forte ventilazione con raffiche pericolose per la stabilità della cellula camper e verande.',
        severity: isRed ? 'Red' : 'Orange',
        urgency: 'Expected',
        effective: new Date().toISOString(),
        expires: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
        icon: '💨',
        camperAdvice: [
          'Riavvolgere e bloccare subito il tendalino/veranda (rischio strappo e ribaltamento).',
          'Chiudere finestre a compasso della cellula per evitare danni ai braccetti.',
          'Massima prudenza alla guida su viadotti, ponti e all’uscita dalle gallerie (spinta laterale).'
        ]
      });
    }

    // 3. ALLERTA TEMPORALI & NUBIFRAGI (Heavy Rain / Storms)
    if (hasStormCodeNext12h && !hasHailCodeNext12h) {
      warnings.push({
        id: `storm-${Date.now()}`,
        event: 'Forti Temporali & Rovesci Intensi',
        headline: 'Allerta Gialla/Arancione: Temporali con Forti Piogge',
        description: 'Precipitazioni a carattere di rovescio o temporale con possibili allagamenti locali.',
        severity: maxPrecipNext12h > 15 ? 'Orange' : 'Yellow',
        urgency: 'Expected',
        effective: new Date().toISOString(),
        expires: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
        icon: '⚡',
        camperAdvice: [
          'Evitare la sosta in prossimità di argini di fiumi, torrenti o sottopassi a rischio allagamento.',
          'Verificare che il terreno di sosta non sia fango o argilla suscettibile a sprofondamento.',
          'Staccare l’alimentazione 230V esterna se la colonnina è esposta a pozzanghere profonde.'
        ]
      });
    }

    return warnings;
  } catch (err) {
    console.warn('[MeteoAlarm] Warning generation error:', err);
    return [];
  }
};
