import { AppSettings } from './types';

export function formatCurrency(amount: number, settings: AppSettings): string {
  const currencySymbol = settings.currency === 'USD' ? '$' : settings.currency === 'GBP' ? '£' : '€';
  const prefix = settings.currency === 'USD' || settings.currency === 'GBP' ? currencySymbol : '';
  const suffix = settings.currency === 'EUR' ? ' €' : '';
  return `${prefix}${amount.toFixed(2)}${suffix}`;
}

export function formatCurrencyNoDecimals(amount: number, settings: AppSettings): string {
  const currencySymbol = settings.currency === 'USD' ? '$' : settings.currency === 'GBP' ? '£' : '€';
  const prefix = settings.currency === 'USD' || settings.currency === 'GBP' ? currencySymbol : '';
  const suffix = settings.currency === 'EUR' ? ' €' : '';
  return `${prefix}${amount.toFixed(0)}${suffix}`;
}

export function getCurrencySymbol(settings: AppSettings): string {
  return settings.currency === 'USD' ? '$' : settings.currency === 'GBP' ? '£' : '€';
}

export function formatDistance(km: number, settings: AppSettings): string {
  if (settings.metric === false) {
    return `${(km * 0.621371).toFixed(0)} mi`;
  }
  return `${km.toFixed(0)} km`;
}

export function getDistanceUnit(settings: AppSettings): string {
  return settings.metric === false ? 'mi' : 'km';
}

export function convertDistance(km: number, settings: AppSettings): number {
  return settings.metric === false ? km * 0.621371 : km;
}

export function formatDimension(meters: number, settings: AppSettings): string {
  if (settings.dimensionUnit === 'imperial') {
    return `${(meters * 3.28084).toFixed(1)} ft`;
  }
  return `${meters.toFixed(2)} m`;
}

export function getDimensionUnit(settings: AppSettings): string {
  return settings.dimensionUnit === 'imperial' ? 'ft' : 'm';
}

export function formatWeight(kg: number, settings: AppSettings): string {
  if (settings.dimensionUnit === 'imperial') {
    return `${(kg * 2.20462).toFixed(0)} lbs`;
  }
  return `${kg.toFixed(0)} kg`;
}

export function getWeightUnit(settings: AppSettings): string {
  return settings.dimensionUnit === 'imperial' ? 'lbs' : 'kg';
}

export function formatTemperature(celsius: number, settings: AppSettings): string {
  if (settings.temperatureUnit === 'fahrenheit') {
    return `${(celsius * 9/5 + 32).toFixed(0)}°F`;
  }
  return `${celsius.toFixed(0)}°C`;
}

export function getTemperatureUnit(settings: AppSettings): string {
  return settings.temperatureUnit === 'fahrenheit' ? '°F' : '°C';
}

export function formatFuelEfficiency(liters: number, km: number, settings: AppSettings): string {
  if (settings.fuelUnit === 'l_100km') {
    return `${((liters / km) * 100).toFixed(1)} L/100km`;
  } else if (settings.fuelUnit === 'mpg') {
    const gallons = liters * 0.264172;
    const miles = km * 0.621371;
    return `${(miles / gallons).toFixed(1)} MPG`;
  }
  return `${(km / liters).toFixed(1)} km/L`;
}

export function getFuelEfficiencyUnit(settings: AppSettings): string {
  if (settings.fuelUnit === 'l_100km') return 'L/100km';
  if (settings.fuelUnit === 'mpg') return 'MPG';
  return 'km/L';
}

export function getFuelEfficiencyValue(liters: number, km: number, settings: AppSettings): string {
  if (settings.fuelUnit === 'l_100km') {
    return ((liters / km) * 100).toFixed(1);
  } else if (settings.fuelUnit === 'mpg') {
    const gallons = liters * 0.264172;
    const miles = km * 0.621371;
    return (miles / gallons).toFixed(1);
  }
  return (km / liters).toFixed(1);
}

export function formatSpeed(kmh: number, settings: AppSettings): string {
  if (settings.metric === false) {
    return `${(kmh * 0.621371).toFixed(0)} mph`;
  }
  return `${kmh.toFixed(0)} km/h`;
}

export function getSpeedUnit(settings: AppSettings): string {
  return settings.metric === false ? 'mph' : 'km/h';
}

export function convertDimensionToDisplay(meters: number, settings: AppSettings): number {
  return settings.dimensionUnit === 'imperial' ? meters * 3.28084 : meters;
}

export function convertDimensionToMetric(displayValue: number, settings: AppSettings): number {
  return settings.dimensionUnit === 'imperial' ? displayValue / 3.28084 : displayValue;
}

export function convertWeightTonnesToDisplay(tonnes: number, settings: AppSettings): number {
  if (settings.dimensionUnit === 'imperial') {
    return tonnes * 2204.62;
  }
  return tonnes; // in tonnes
}

export function convertWeightDisplayToTonnes(displayValue: number, settings: AppSettings): number {
  if (settings.dimensionUnit === 'imperial') {
    return displayValue / 2204.62;
  }
  return displayValue; // tonnes
}

export function getWeightUnitTonnes(settings: AppSettings): string {
  return settings.dimensionUnit === 'imperial' ? 'lbs' : 't';
}

export function getTileUrl(mapTheme: string): string {
  switch (mapTheme) {
    case 'satellite':
      return 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
    case 'hybrid':
      return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
    case 'standard':
    default:
      return 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
  }
}
