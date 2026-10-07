import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  AlertTriangle, ShieldAlert, X, ChevronRight, 
  MapPin, Check, Volume2, ShieldCheck, Clock, ThumbsUp
} from 'lucide-react';
import { CommunityWeatherAlert, MeteoAlarmWarning } from '../types';
import { communityWeatherAlertsService } from '../lib/communityWeatherAlertsService';
import { getMeteoAlarmAlerts } from '../lib/weatherService';
import { playAlertSound } from '../utils/soundHelper';
import { sendWeatherAlertPushNotification } from '../utils/localNotifications';

interface WeatherAlertBannerProps {
  userLocation: { lat: number; lng: number } | null;
  currentUser?: { nickname?: string; email?: string } | null;
  onOpenRadarModal?: () => void;
  onShowOnMap?: (lat: number, lng: number) => void;
}

export const WeatherAlertBanner: React.FC<WeatherAlertBannerProps> = ({
  userLocation,
  currentUser,
  onOpenRadarModal,
  onShowOnMap
}) => {
  const [communityAlerts, setCommunityAlerts] = useState<CommunityWeatherAlert[]>([]);
  const [meteoAlarmWarnings, setMeteoAlarmWarnings] = useState<MeteoAlarmWarning[]>([]);
  
  // Persist dismissed alert IDs in sessionStorage & localStorage so dismissing lasts and doesn't re-open
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const savedSession = sessionStorage.getItem('camper_dismissed_weather_alerts');
      const savedLocal = localStorage.getItem('camper_dismissed_weather_alerts');
      const parsedSession = savedSession ? JSON.parse(savedSession) : [];
      const parsedLocal = savedLocal ? JSON.parse(savedLocal) : [];
      return Array.from(new Set([...(Array.isArray(parsedSession) ? parsedSession : []), ...(Array.isArray(parsedLocal) ? parsedLocal : [])]));
    } catch (e) {
      return [];
    }
  });
  
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
  const pushedAlertIdsRef = useRef<Set<string>>(new Set());

  // Subscribe to community alerts
  useEffect(() => {
    const unsub = communityWeatherAlertsService.subscribe((alerts) => {
      setCommunityAlerts(alerts);
    });
    return unsub;
  }, []);

  // Rounded GPS coordinates to avoid re-fetching on minor GPS jitter
  const roundedLat = userLocation ? Math.round(userLocation.lat * 100) / 100 : null;
  const roundedLng = userLocation ? Math.round(userLocation.lng * 100) / 100 : null;

  // Fetch MeteoAlarm official warnings periodically for user coordinates
  useEffect(() => {
    if (roundedLat === null || roundedLng === null) return;
    let active = true;

    const checkMeteoAlarm = async () => {
      try {
        const warnings = await getMeteoAlarmAlerts(roundedLat, roundedLng);
        if (active) setMeteoAlarmWarnings(warnings);
      } catch (e) {}
    };

    checkMeteoAlarm();
    const interval = setInterval(checkMeteoAlarm, 15 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [roundedLat, roundedLng]);

  // Filter alerts within 30 km
  const nearbyAlerts = useMemo(() => {
    if (!userLocation) return [];
    return communityWeatherAlertsService.getNearbyAlerts(userLocation.lat, userLocation.lng, 30);
  }, [userLocation, communityAlerts]);

  // Dismiss all active alerts when user clicks X to prevent re-opening other warnings from same batch
  const handleDismissAllActive = (currentId?: string) => {
    const idsToDismiss = new Set<string>(dismissedIds);
    if (currentId) idsToDismiss.add(currentId);
    nearbyAlerts.forEach(a => idsToDismiss.add(a.id));
    meteoAlarmWarnings.forEach(w => idsToDismiss.add(w.id));
    const updated = Array.from(idsToDismiss);
    setDismissedIds(updated);
    try {
      sessionStorage.setItem('camper_dismissed_weather_alerts', JSON.stringify(updated));
      localStorage.setItem('camper_dismissed_weather_alerts', JSON.stringify(updated));
    } catch (e) {}
  };

  // Find most critical active alert not dismissed
  const activeAlert = useMemo(() => {
    const activeComm = nearbyAlerts.find(a => !dismissedIds.includes(a.id));
    if (activeComm) return { type: 'community' as const, data: activeComm };

    const activeMeteo = meteoAlarmWarnings.find(w => !dismissedIds.includes(w.id));
    if (activeMeteo) return { type: 'meteoalarm' as const, data: activeMeteo };

    return null;
  }, [nearbyAlerts, meteoAlarmWarnings, dismissedIds]);

  // Send Android / Web push notification & play sound when a new severe alert appears
  useEffect(() => {
    if (!activeAlert) return;

    const isCommunity = activeAlert.type === 'community';
    const commData = isCommunity ? (activeAlert.data as CommunityWeatherAlert) : null;
    const meteoData = !isCommunity ? (activeAlert.data as MeteoAlarmWarning) : null;
    const alertId = isCommunity ? commData?.id : meteoData?.id;

    if (alertId && !pushedAlertIdsRef.current.has(alertId) && !dismissedIds.includes(alertId)) {
      pushedAlertIdsRef.current.add(alertId);

      const title = isCommunity 
        ? (commData?.title || 'Segnalazione Allerta Meteo') 
        : (meteoData?.headline || 'Allerta MeteoALARM');
      const body = isCommunity 
        ? (commData?.description || 'Allerta segnalata nelle tue vicinanze entro 30 km.') 
        : (meteoData?.description || 'Presta attenzione ai pericoli meteo nella tua zona.');

      // Send Android native & Web push notification
      sendWeatherAlertPushNotification(title, body, alertId).catch(() => {});

      // Play alert sound
      try {
        playAlertSound();
      } catch (e) {}
    }
  }, [activeAlert, dismissedIds]);

  if (!activeAlert) return null;

  const handleConfirm = (id: string) => {
    setConfirmedIds(prev => [...prev, id]);
    communityWeatherAlertsService.confirmAlert(id, currentUser?.email);
    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { message: '👍 Grazie! La tua conferma aiuta tutti i camperisti in zona.' }
      })
    );
  };

  const isCommunity = activeAlert.type === 'community';
  const commData = isCommunity ? (activeAlert.data as CommunityWeatherAlert) : null;
  const meteoData = !isCommunity ? (activeAlert.data as MeteoAlarmWarning) : null;

  const isHail = commData?.type === 'hail' || meteoData?.event?.toLowerCase().includes('grandine');
  const isWind = commData?.type === 'wind' || meteoData?.event?.toLowerCase().includes('vento');

  return (
    <div 
      className="fixed top-12 sm:top-14 left-0 right-0 px-3 sm:px-4 pointer-events-none animate-slide-down"
      style={{ zIndex: 9999999 }}
    >
      <div className="max-w-3xl mx-auto pointer-events-auto bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-2xl border-2 border-white/60 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          {/* Icon */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 border border-white/40 flex items-center justify-center shrink-0 text-2xl shadow-md">
            {isHail ? '🧊' : isWind ? '💨' : '⚡'}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="bg-white/25 text-white text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {isCommunity ? 'SEGNALAZIONE CAMPERISTI (ENTRO 30 KM)' : 'ALLERTA METEOALARM'}
              </span>

              {isCommunity && commData?.distanceKm !== undefined && (
                <span className="bg-yellow-400 text-slate-950 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full shadow-xs">
                  📍 A {commData.distanceKm} km da te!
                </span>
              )}
            </div>

            <h4 className="text-sm sm:text-base font-black tracking-tight mt-1 text-white leading-snug">
              {isCommunity ? commData?.title : meteoData?.headline}
            </h4>

            <p className="text-xs text-white/90 mt-0.5 line-clamp-2">
              {isCommunity ? commData?.description : meteoData?.description}
            </p>

            {/* Camper safety advice pill */}
            <div className="mt-2 text-[11px] bg-black/25 rounded-xl px-2.5 py-1.5 text-white/95 font-medium flex items-center gap-1.5 border border-white/15">
              <ShieldAlert className="w-4 h-4 text-yellow-300 shrink-0" />
              <span>
                {isHail
                  ? 'Consiglio Camper: Chiudere tutti gli oblò sul tetto e verificare riparo protetto.'
                  : isWind
                  ? 'Consiglio Camper: Riavvolgere immediatamente il tendalino e chiudere finestre.'
                  : 'Consiglio Camper: Prestare attenzione a torrenti, sottopassi e alberi.'}
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-1">
              {isCommunity && commData && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (onShowOnMap) onShowOnMap(commData.lat, commData.lng);
                    }}
                    className="px-3 py-1 bg-white text-rose-700 hover:bg-white/90 text-xs font-extrabold rounded-lg cursor-pointer transition-all shadow-xs flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>Vedi su Mappa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConfirm(commData.id)}
                    disabled={confirmedIds.includes(commData.id)}
                    className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1"
                  >
                    <ThumbsUp className="w-3 h-3" />
                    <span>Confermo ({commData.verifiedCount || 1})</span>
                  </button>
                </>
              )}

              {onOpenRadarModal && (
                <button
                  type="button"
                  onClick={onOpenRadarModal}
                  className="px-2.5 py-1 bg-black/30 hover:bg-black/40 text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1"
                >
                  <span>Tutti i dettagli</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={() => {
              const id = isCommunity ? commData?.id : meteoData?.id;
              handleDismissAllActive(id);
            }}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer shrink-0"
            title="Chiudi avviso meteo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
