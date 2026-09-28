import { doc, collection, onSnapshot, setDoc, updateDoc, increment, arrayUnion, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { CommunityWeatherAlert, WeatherAlertType, WeatherAlertSeverity } from '../types/weatherAlerts';
import { resolveApiUrl } from '../utils/resolveMediaUrl';

const STORAGE_KEY = 'camper_community_weather_alerts';

/**
 * Calculates Haversine distance in kilometers between two GPS coordinates
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export class CommunityWeatherAlertsService {
  private alerts: CommunityWeatherAlert[] = [];
  private listeners: Array<(alerts: CommunityWeatherAlert[]) => void> = [];
  private unsubscribeFirestore: (() => void) | null = null;

  constructor() {
    this.loadFromLocalStorage();
    this.initFirestoreListener();
  }

  private loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        // Keep non-expired
        this.alerts = Array.isArray(parsed)
          ? parsed.filter(a => new Date(a.expiresAt).getTime() > now)
          : [];
      }
    } catch (e) {}
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.alerts));
    } catch (e) {}
  }

  private initFirestoreListener() {
    if (db) {
      try {
        const alertsRef = collection(db, 'community_weather_alerts');
        this.unsubscribeFirestore = onSnapshot(alertsRef, (snapshot) => {
          const loaded: CommunityWeatherAlert[] = [];
          const now = Date.now();

          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as any;
            const expiresAtMs = new Date(data.expiresAt || 0).getTime();
            if (expiresAtMs > now) {
              loaded.push({
                id: docSnap.id,
                type: data.type || 'storm',
                severity: data.severity || 'severe',
                title: data.title || 'Allerta Meteo',
                description: data.description || '',
                lat: data.lat,
                lng: data.lng,
                locationName: data.locationName,
                reportedBy: data.reportedBy || 'Camperista',
                userEmail: data.userEmail,
                createdAt: data.createdAt || new Date().toISOString(),
                expiresAt: data.expiresAt || new Date(Date.now() + 2.5 * 3600 * 1000).toISOString(),
                hailSize: data.hailSize,
                windSpeedKmh: data.windSpeedKmh,
                source: data.source || 'community',
                verifiedCount: data.verifiedCount || 1,
                verifiedBy: data.verifiedBy || []
              });
            }
          });

          this.alerts = loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          this.saveToLocalStorage();
          this.notifyListeners();
        }, (err) => {
          console.warn('[WeatherAlerts] Firestore snapshot warning:', err);
          this.fetchFromApiFallback();
        });
      } catch (err) {
        console.warn('[WeatherAlerts] Init firestore failed, falling back to API:', err);
        this.fetchFromApiFallback();
      }
    } else {
      this.fetchFromApiFallback();
    }
  }

  public async fetchFromApiFallback() {
    try {
      const url = resolveApiUrl('/api/weather-alerts');
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.alerts)) {
          this.alerts = data.alerts;
          this.saveToLocalStorage();
          this.notifyListeners();
        }
      }
    } catch (e) {}
  }

  public subscribe(callback: (alerts: CommunityWeatherAlert[]) => void): () => void {
    this.listeners.push(callback);
    callback(this.alerts);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(cb => {
      try { cb(this.alerts); } catch (e) {}
    });
  }

  /**
   * Get active alerts within specified maxDistanceKm (default 30km) from user's coordinates
   */
  public getNearbyAlerts(userLat: number, userLng: number, maxDistanceKm: number = 30): CommunityWeatherAlert[] {
    const now = Date.now();
    return this.alerts
      .filter(alert => {
        const isNotExpired = new Date(alert.expiresAt).getTime() > now;
        if (!isNotExpired) return false;
        if (typeof alert.lat !== 'number' || typeof alert.lng !== 'number') return false;
        const dist = calculateDistanceKm(userLat, userLng, alert.lat, alert.lng);
        return dist <= maxDistanceKm;
      })
      .map(alert => ({
        ...alert,
        distanceKm: calculateDistanceKm(userLat, userLng, alert.lat, alert.lng)
      }))
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }

  /**
   * Submits a new weather alert from the user's current GPS location
   */
  public async submitWeatherAlert(params: {
    type: WeatherAlertType;
    severity: WeatherAlertSeverity;
    lat: number;
    lng: number;
    locationName?: string;
    reportedBy: string;
    userEmail?: string;
    hailSize?: 'small' | 'medium' | 'large';
    windSpeedKmh?: number;
    notes?: string;
  }): Promise<CommunityWeatherAlert> {
    const alertId = `walert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    // Convective storms/hail alerts are active for 2.5 hours
    const expiresIso = new Date(Date.now() + 2.5 * 3600 * 1000).toISOString();

    let title = 'Forte Temporale';
    if (params.type === 'hail') {
      const sizeLabel = params.hailSize === 'large' ? 'Chicchi Grandi' : params.hailSize === 'medium' ? 'Chicchi Medi (noci)' : 'Chicchi Piccoli';
      title = `Grandine in corso (${sizeLabel})`;
    } else if (params.type === 'wind') {
      title = `Raffiche di Vento Forte ${params.windSpeedKmh ? `(~${params.windSpeedKmh} km/h)` : ''}`;
    } else if (params.type === 'flood') {
      title = 'Allagamento / Strada Allagata';
    } else if (params.type === 'snow') {
      title = 'Neve / Ghiaccio Improvviso';
    }

    const newAlert: CommunityWeatherAlert = {
      id: alertId,
      type: params.type,
      severity: params.severity,
      title,
      description: params.notes || 'Segnalazione in tempo reale da camperista sul posto.',
      lat: params.lat,
      lng: params.lng,
      locationName: params.locationName || 'Posizione GPS',
      reportedBy: params.reportedBy,
      userEmail: params.userEmail,
      createdAt: nowIso,
      expiresAt: expiresIso,
      hailSize: params.hailSize,
      windSpeedKmh: params.windSpeedKmh,
      source: 'community',
      verifiedCount: 1,
      verifiedBy: params.userEmail ? [params.userEmail] : []
    };

    // 1. Save to local list immediately
    this.alerts = [newAlert, ...this.alerts];
    this.saveToLocalStorage();
    this.notifyListeners();

    // 2. Save to Firestore
    if (db) {
      try {
        const docRef = doc(db, 'community_weather_alerts', alertId);
        await setDoc(docRef, newAlert);
      } catch (fErr) {
        console.warn('[WeatherAlerts] Firestore save failed:', fErr);
      }
    }

    // 3. Save to server backend
    try {
      const url = resolveApiUrl('/api/weather-alerts');
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAlert)
      }).catch(() => {});
    } catch (e) {}

    // 4. Emit global event
    window.dispatchEvent(new CustomEvent('community-weather-alert-created', { detail: newAlert }));
    return newAlert;
  }

  /**
   * Confirm/Verify an existing alert
   */
  public async confirmAlert(alertId: string, userEmail?: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return;

    if (userEmail && alert.verifiedBy?.includes(userEmail)) {
      return; // Already verified by this user
    }

    alert.verifiedCount = (alert.verifiedCount || 1) + 1;
    if (userEmail) {
      alert.verifiedBy = [...(alert.verifiedBy || []), userEmail];
    }

    this.saveToLocalStorage();
    this.notifyListeners();

    if (db) {
      try {
        const docRef = doc(db, 'community_weather_alerts', alertId);
        await updateDoc(docRef, {
          verifiedCount: increment(1),
          ...(userEmail ? { verifiedBy: arrayUnion(userEmail) } : {})
        });
      } catch (e) {}
    }

    try {
      const url = resolveApiUrl('/api/weather-alerts/confirm');
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, userEmail })
      }).catch(() => {});
    } catch (e) {}
  }
}

export const communityWeatherAlertsService = new CommunityWeatherAlertsService();
