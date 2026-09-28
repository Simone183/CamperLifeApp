export type WeatherAlertType = 'hail' | 'storm' | 'wind' | 'flood' | 'snow' | 'meteoalarm';
export type WeatherAlertSeverity = 'moderate' | 'severe' | 'extreme';

export interface CommunityWeatherAlert {
  id: string;
  type: WeatherAlertType;
  severity: WeatherAlertSeverity;
  title: string;
  description: string;
  lat: number;
  lng: number;
  locationName?: string;
  reportedBy: string;
  userEmail?: string;
  createdAt: string; // ISO string
  expiresAt: string; // ISO string (e.g. 2.5 hours after report)
  hailSize?: 'small' | 'medium' | 'large'; // pisello / noce / palla da tennis
  windSpeedKmh?: number;
  source: 'community' | 'meteoalarm';
  verifiedCount?: number;
  verifiedBy?: string[];
  distanceKm?: number; // Calculated on client relative to current user
}

export interface MeteoAlarmWarning {
  id: string;
  event: string;
  headline: string;
  description: string;
  severity: 'Yellow' | 'Orange' | 'Red';
  urgency: string;
  effective: string;
  expires: string;
  areaDesc?: string;
  camperAdvice: string[];
  icon: string;
}
