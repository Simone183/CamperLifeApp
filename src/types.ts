/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlaceCategory = 'area_sosta' | 'camper_service' | 'campeggio' | 'parcheggio_camper' | 'hidden_gem';

export interface Review {
  id: string;
  user: string;
  date: string;
  rating: number;
  comment: string;
  priceUpdated?: string;
  imageUrl?: string;
  vehicleType?: string;
  noiseLevel?: number; // 1-5
  maneuverability?: number; // 1-5
  cellularSignal?: number; // 1-5
  groundLevelness?: number; // 1-5
  shade?: number; // 1-5
  cleanliness?: number; // 1-5
}

export interface DashboardSettings {
  showTopNotifications?: boolean;
  showChecklists: boolean;
  showAIItinerary: boolean;
  showBubbleLevel: boolean;
  showWeightCalculator: boolean;
  showOffGridEstimator: boolean;
  showSostaLiberaTools: boolean;
  showCamperSecurity: boolean;
  showPantryShopping: boolean;
  showMaintenanceLog: boolean;
  showFavorites: boolean;
  showFuelCard: boolean;
  showEvents: boolean;
  showOfflineMaps: boolean;
  showDeadlines: boolean;
  showCommunity: boolean;
  showSharedTrips: boolean;
  showDimensions: boolean;
}

export interface AppSettings {
  language: string;
  textSize: string;
  theme: string;
  metric: boolean;
  dimensionUnit: string;
  temperatureUnit: string;
  currency: string;
  fuelUnit: string;
  avoidTolls: boolean;
  avoidUnpaved: boolean;
  mapTheme: string;
  defaultPOI: string;
  deadlineReminder: string;
  showTopNotifications: boolean;
  sounds: boolean;
  vibrations: boolean;
  weatherAlerts: boolean;
  drivingStyle: string;
  publicProfile: boolean;
  shareData: boolean;
  shareLocation: boolean;
  autoBackup: boolean;
  wifiOnlySync: boolean;
  photoQuality: string;
  pinEnabled: boolean;
  appPin?: string;
}

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  address: string;
  priceInfo: string;
  priceEuro: number; // For interactive editing
  rating: number;
  noiseLevel?: number;
  maneuverability?: number;
  cellularSignal?: number;
  groundLevelness?: number;
  shade?: number;
  cleanliness?: number;
  facilities: string[];
  reviews: Review[];
  imageUrl: string;
  source?: string;
  phone?: string;
  hasMaxHeightLimit?: boolean;
  maxHeight?: number; // m
  hasMaxWeightLimit?: boolean;
  maxWeight?: number; // t
  isNarrowAccess?: boolean;
  nearestCity?: string;
  isOfflineDraft?: boolean;
  createdBy?: string;
}

export interface CommunityMessage {
  id: string;
  user: string;
  avatar: string;
  avatarColor: string;
  text: string;
  timestamp: string;
  likes: number;
  likedByCurrentUser?: boolean;
  tag: 'SOS' | 'Meteo' | 'Generale' | 'Incontro' | 'Sosta';
  isResolved?: boolean;
  replies?: Array<{
    id: string;
    user: string;
    text: string;
    timestamp: string;
  }>;
}

export interface VehicleDimensions {
  modelName: string;
  height: number; // m
  width: number;  // m
  weight: number; // t
  length: number; // m
}

export interface OSMObstacle {
  id: number;
  lat: number;
  lng: number;
  type: 'height' | 'width' | 'weight' | 'barrier';
  value: number; // e.g. 2.8 (m or t)
  name: string;
  roadName: string;
  isViolation: boolean;
}

export interface Deadline {
  id: string;
  title: string;
  category: 'Manutenzione' | 'Revisione' | 'Assicurazione' | 'Bollo' | 'Bombole Gas';
  dueDate: string;
  done: boolean;
  notes?: string;
  price?: number;
  km?: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  category: 'Partenza' | 'Sosta' | 'Sicurezza' | 'Alimentari & Cucina';
  checked: boolean;
}

export interface DiaryMovement {
  id: string;
  odometer?: number;
  location: string;
  date: string;
  notes?: string;
}

export interface DiaryExpense {
  id: string;
  title: string;
  amount: number;
  category: 'Carburante' | 'Autostrada' | 'Cibo' | 'Sosta' | 'Altro';
  date: string;
  liters?: number;
  pricePerLiter?: number;
  odometer?: number;
  fuelCompany?: string;
  isFullTank?: boolean;
}

export interface DiaryPhoto {
  id: string;
  url: string;
  description: string;
  date: string;
  locationName?: string; // Tappa in cui è stata scattata la foto
}

export interface Trip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  description: string;
  startOdometer?: number;
  endOdometer?: number;
  status: 'Pianificato' | 'Attivo' | 'Completato';
  expenses: DiaryExpense[];
  photos: DiaryPhoto[];
  movements: DiaryMovement[];
  isShared?: boolean;
  routePoints?: Array<{
    lat: number;
    lng: number;
    name?: string;
    timestamp?: string;
  }>;
}

