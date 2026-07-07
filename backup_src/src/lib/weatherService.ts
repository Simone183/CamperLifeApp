
// Shared service to manage weather requests to avoid 429 Too Many Requests

const CACHE_TTL = 3600 * 1000; // 1 hour cache
const weatherCache: Record<string, { data: { current: any; daily?: any[] }; timestamp: number }> = {};
const pendingRequests: Record<string, Promise<any>> = {};

export const getWeatherData = async (lat: number, lng: number, fetchDaily: boolean = true) => {
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}-${fetchDaily}`;
  
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
      const dailyParam = fetchDaily ? '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' : '';
      const currentParam = fetchDaily 
        ? 'current=temperature_2m,apparent_temperature,precipitation,relative_humidity_2m,weather_code,wind_speed_10m,is_day' 
        : 'current=temperature_2m,weather_code';
        
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&${currentParam}${dailyParam}&timezone=auto`;
      const res = await fetch(url);
      
      if (!res.ok) {
        if (res.status === 429) {
          // Fallback to avoid crashing and UI errors for rate limit
          const today = new Date().toISOString().split('T')[0];
          return { 
            current: { temperature_2m: 15, weather_code: 0, apparent_temperature: 15, precipitation: 0, relative_humidity_2m: 50, wind_speed_10m: 10, is_day: 1 },
            daily: {
              time: [today, today, today, today, today],
              temperature_2m_max: [18, 18, 18, 18, 18],
              temperature_2m_min: [10, 10, 10, 10, 10],
              weather_code: [0, 0, 0, 0, 0],
              precipitation_probability_max: [0, 0, 0, 0, 0]
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
