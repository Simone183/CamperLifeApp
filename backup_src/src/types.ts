/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlaceCategory = 'area_sosta' | 'camper_service' | 'campeggio' | 'parcheggio_camper';

export interface Review {
  id: string;
  user: string;
  date: string;
  rating: number;
  comment: string;
  priceUpdated?: string;
  imageUrl?: string;
  vehicleType?: string;
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
}

export interface ChecklistItem {
  id: string;
  text: string;
  category: 'Partenza' | 'Sosta' | 'Sicurezza' | 'Alimentari & Cucina';
  checked: boolean;
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
}

