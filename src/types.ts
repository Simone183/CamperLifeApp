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
  mapEngine?: string; // "google" | "leaflet"
  ttsEnabled: boolean;
  ttsGender?: 'auto' | 'female' | 'male';
}

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  categoryLabel?: string;
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
  avatarUrl?: string;
  avatarColor: string;
  title?: string; // Titolo dell'argomento di discussione per il forum
  text: string;
  timestamp: string;
  likes: number;
  likedByCurrentUser?: boolean;
  tag: 'SOS' | 'Meteo' | 'Generale' | 'Incontro' | 'Sosta';
  isResolved?: boolean;
  type?: 'forum' | 'chat' | 'social';
  locationName?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  challengeSubmissionId?: string;
  challengeId?: string;
  challengeTitle?: string;
  isExpiredChallenge?: boolean;
  isModerated?: boolean;
  replies?: Array<{
    id: string;
    user: string;
    text: string;
    timestamp: string;
    avatar?: string;
    avatarUrl?: string;
    avatarColor?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    isModerated?: boolean;
  }>;
}

export interface User {
  email: string;
  nickname: string;
  name: string;
  surname?: string;
  dob?: string;
  profilePhoto?: string;
  favorites?: string[];
  isModerator?: boolean;
  approved?: boolean;
}

export interface ChallengeSubmission {
  id: string;
  challengeId: string;
  userName: string;
  userAvatar: string;
  userBadge: string;
  placeName: string;
  location: string;
  imageUrl: string;
  caption: string;
  likes: number;
  likedByMe?: boolean;
  date: string;
  isExample?: boolean;
  communityMessageId?: string;
}

export interface ChallengeItem {
  id: string;
  title: string;
  badgeTag: string;
  icon: string;
  description: string;
  reward: string;
  xpPoints: number;
  progress: number;
  maxProgress: number;
  unit: string;
  endDate: string;
  isCompleted?: boolean;
  isExpired?: boolean;
}

export interface CamperGalleryPhoto {
  id: string;
  url: string;
  title?: string;
  category?: 'Esterno' | 'Interno' | 'Libretto' | 'Impianti' | 'Altro';
  dateAdded?: string;
}

export interface CamperMembership {
  id: string;
  clubName: string; // e.g. Agricamper Italia, ACSI Camping Card, PleinAir Club, Camperlife, CCI, etc.
  cardNumber?: string;
  holderName?: string;
  expiryDate?: string;
  qrOrBarCodeUrl?: string; // QR code or barcode image for scanning at reception
  websiteUrl?: string;     // Direct link to club app/portal
  notes?: string;          // Discounts, benefits or pin codes
}

export interface VehicleDimensions {
  modelName: string;
  height: number | string; // m
  width: number | string;  // m
  weight: number | string; // t
  length: number | string; // m

  // Dati Anagrafici & Brand
  brand?: string;                  // Marca (es. Sunlight, McLouis, Hymer)
  chassisBrand?: string;           // Telaio / Meccanica (es. Fiat Ducato, Ford Transit)
  vehicleType?: string;            // Mansardato, Semintegrale, Motorhome, Van, Caravan, ecc.
  registrationYear?: string;       // Anno immatricolazione
  licensePlate?: string;           // Targa
  vinNumber?: string;              // VIN / N. Telaio
  
  // Meccanica & Prestazioni
  displacementHpKw?: string;       // Cilindrata & Potenza (es. 2.2 Multijet 140 CV)
  engineType?: string;             // Diesel, Benzina, Ibrido, Elettrico, GPL
  euroCategory?: string;           // Euro 6d-Final, Euro 6, Euro 5...
  tractionType?: string;           // Anteriore, Posteriore, 4x4
  grossWeightRating?: number | string; // PTT Max Omologata (es. 3.5 t o 3500 kg)
  seatsHomologated?: number | string;  // Posti omologati viaggio
  bedsCount?: number | string;         // Posti letto
  
  // Impianti & Autonomia
  freshWaterTank?: number | string;    // L
  greyWaterTank?: number | string;     // L
  blackWaterTank?: string;             // Cassetta 18L, Nautico 50L, ecc.
  heatingType?: string;                // Truma Combi, Webasto, Alde...
  batteryCapacity?: string;            // es. 100Ah LiFePO4
  solarPanelWatts?: number | string;   // Wp
  inverterWatts?: number | string;     // W
  gasBottlesInfo?: string;             // es. 2x10kg Bombole Vetrresina / GPL
  
  // Pneumatici & Pressioni
  tireSize?: string;                   // es. 225/75 R16 CP
  tirePressureFrontBar?: number | string; // bar
  tirePressureRearBar?: number | string;  // bar

  // Accessori Installati
  accessories?: string[];              // list of installed options/accessories

  // Foto & Media
  mainPhotoUrl?: string;               // Main camper image
  galleryPhotos?: CamperGalleryPhoto[];// Gallery of photos (interior, engine, documents)

  // Tessere, Convenzioni & Club
  memberships?: CamperMembership[];    // Agricamper, ACSI, PleinAir, Camperlife, CCI, etc.

  // Note Libere
  notes?: string;                      // Free notes, key codes, maintenance info
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

export interface AIDayStop {
  dayNumber: number;
  title: string;
  description: string;
  stopPlaceName: string;
  drivingSegment: string;
  activities: string[];
  camperTips: string;
  stopCoordinate: {
    lat: number;
    lng: number;
    label: string;
  };
}

export interface AIItineraryResult {
  id?: string;
  title: string;
  description: string;
  totalKm: string;
  totalDrivingTime: string;
  days: AIDayStop[];
  createdAt?: string;
  startLocation?: string;
  endLocation?: string;
  waypoints?: string[];
  duration?: number;
  travelStyle?: string;
  interests?: string[];
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
  aiItinerary?: AIItineraryResult;
}

export interface NavigationStep {
  title: string;
  desc: string;
  icon: string;
  distance: string;
  coordinateIndex?: number;
  streetName?: string;
  maneuverType?: string;
  modifier?: string;
  hasTrafficLight?: boolean;
}

