import React, { useEffect, useState, useMemo } from 'react';
import { 
  X, AlertTriangle, ShieldAlert, CloudLightning, 
  Wind, MapPin, RefreshCw, PlusCircle, CheckCircle2, 
  ThumbsUp, Shield, HelpCircle, Radio, Clock, ShieldCheck
} from 'lucide-react';
import { CommunityWeatherAlert, MeteoAlarmWarning } from '../types';
import { communityWeatherAlertsService, calculateDistanceKm } from '../lib/communityWeatherAlertsService';
import { getMeteoAlarmAlerts } from '../lib/weatherService';

interface WeatherRadarModalProps {
  userLocation: { lat: number; lng: number } | null;
  currentUser?: { nickname?: string; email?: string } | null;
  onClose: () => void;
  onOpenReportModal: () => void;
  onShowOnMap?: (lat: number, lng: number) => void;
}

export const WeatherRadarModal: React.FC<WeatherRadarModalProps> = ({
  userLocation,
  currentUser,
  onClose,
  onOpenReportModal,
  onShowOnMap
}) => {
  const [activeTab, setActiveTab] = useState<'nearby_30km' | 'meteoalarm' | 'all_reports'>('nearby_30km');
  const [communityAlerts, setCommunityAlerts] = useState<CommunityWeatherAlert[]>([]);
  const [meteoAlarmWarnings, setMeteoAlarmWarnings] = useState<MeteoAlarmWarning[]>([]);
  const [isLoadingMeteo, setIsLoadingMeteo] = useState<boolean>(true);

  // Subscribe to community alerts
  useEffect(() => {
    const unsub = communityWeatherAlertsService.subscribe((alerts) => {
      setCommunityAlerts(alerts);
    });
    return unsub;
  }, []);

  // Fetch MeteoAlarm warnings
  const loadMeteoAlarm = async () => {
    if (!userLocation) return;
    setIsLoadingMeteo(true);
    try {
      const warnings = await getMeteoAlarmAlerts(userLocation.lat, userLocation.lng);
      setMeteoAlarmWarnings(warnings);
    } catch (e) {
      console.warn('MeteoAlarm load failed:', e);
    } finally {
      setIsLoadingMeteo(false);
    }
  };

  useEffect(() => {
    loadMeteoAlarm();
  }, [userLocation?.lat, userLocation?.lng]);

  // Alerts within 30 km
  const nearbyAlerts = useMemo(() => {
    if (!userLocation) return [];
    return communityWeatherAlertsService.getNearbyAlerts(userLocation.lat, userLocation.lng, 30);
  }, [userLocation, communityAlerts]);

  const handleConfirm = (id: string) => {
    communityWeatherAlertsService.confirmAlert(id, currentUser?.email);
    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { message: '👍 Grazie! La tua conferma rende la segnalazione più autorevole.' }
      })
    );
  };

  return (
    <div 
      className="fixed inset-0 z-[10002] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-700 relative overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700/80 bg-gradient-to-r from-[#3E4A35] via-[#4f5f44] to-[#2d3627] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center text-2xl shadow-inner shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
                  Allerte Meteo & Radar Grandine
                </h3>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" /> LIVE
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                MeteoAlarm Europa + Rete segnalazioni camperisti <span className="underline font-bold">raggio 30 km</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full text-white hover:bg-white/20 transition-all cursor-pointer shrink-0 bg-white/10 active:scale-95"
            title="Chiudi radar allerte"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Action Button: Segnala Maltempo & Mappa */}
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-bold">Monitoraggio e allerte grandine/temporali:</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onShowOnMap && (
              <button
                type="button"
                onClick={() => onShowOnMap(userLocation?.lat || 0, userLocation?.lng || 0)}
                className="px-3.5 py-2 bg-[#3E4A35] hover:bg-[#2e3725] active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Apri Mappa</span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenReportModal}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Segnala Maltempo</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 gap-2 pt-2 bg-slate-50 dark:bg-slate-850">
          <button
            type="button"
            onClick={() => setActiveTab('nearby_30km')}
            className={`pb-2.5 px-3 text-xs font-black border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'nearby_30km'
                ? 'border-[#3E4A35] text-[#3E4A35] dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <span>Segnalazioni Vicine (30 km)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              nearbyAlerts.length > 0 ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
            }`}>
              {nearbyAlerts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('meteoalarm')}
            className={`pb-2.5 px-3 text-xs font-black border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'meteoalarm'
                ? 'border-[#3E4A35] text-[#3E4A35] dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <span>MeteoAlarm Ufficiale</span>
            {meteoAlarmWarnings.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {meteoAlarmWarnings.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all_reports')}
            className={`pb-2.5 px-3 text-xs font-black border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'all_reports'
                ? 'border-[#3E4A35] text-[#3E4A35] dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <span>Tutte le Segnalazioni</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
              {communityAlerts.length}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: NEARBY 30 KM */}
          {activeTab === 'nearby_30km' && (
            <div className="space-y-3">
              {nearbyAlerts.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-2xl">
                    ✅
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    Nessun allarme maltempo entro 30 km
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Nessun camperista ha segnalato grandine, nubifragi o forti raffiche nelle vicinanze della tua posizione GPS attuale.
                  </p>
                </div>
              ) : (
                nearbyAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl shrink-0">
                          {alert.type === 'hail' ? '🧊' : alert.type === 'wind' ? '💨' : '⚡'}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-900 dark:text-white text-sm">
                              {alert.title}
                            </h4>
                            <span className="bg-yellow-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                              📍 a {alert.distanceKm} km
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>Segnalato da @{alert.reportedBy}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {alert.description && (
                      <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 font-medium">
                        "{alert.description}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        {onShowOnMap && (
                          <button
                            type="button"
                            onClick={() => {
                              onShowOnMap(alert.lat, alert.lng);
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-[#3E4A35] text-white hover:bg-[#2d3627] text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Vedi su Mappa</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleConfirm(alert.id)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-200 flex items-center gap-1"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>Conferma ({alert.verifiedCount || 1})</span>
                        </button>
                      </div>

                      <span className="text-[10px] text-slate-400">
                        Attiva fino alle {new Date(alert.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: METEOALARM OFFICIAL */}
          {activeTab === 'meteoalarm' && (
            <div className="space-y-4">
              {isLoadingMeteo ? (
                <div className="py-10 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#3E4A35]" />
                  <p className="text-xs text-slate-500 mt-2">Caricamento bollettini MeteoAlarm...</p>
                </div>
              ) : meteoAlarmWarnings.length === 0 ? (
                <div className="py-10 text-center space-y-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-6 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Nessuna Allerta Severa MeteoAlarm in corso
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                    I parametri meteorologici europei non rilevano al momento condizioni estreme di grandine o burrasca sulla tua zona GPS.
                  </p>
                </div>
              ) : (
                meteoAlarmWarnings.map((warning) => (
                  <div
                    key={warning.id}
                    className={`p-4 rounded-2xl border space-y-3 ${
                      warning.severity === 'Red'
                        ? 'border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-800'
                        : 'border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{warning.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-900 dark:text-white text-sm">
                            {warning.headline}
                          </h4>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white ${
                            warning.severity === 'Red' ? 'bg-red-600' : 'bg-amber-600'
                          }`}>
                            {warning.severity === 'Red' ? 'ALLERTA ROSSA' : 'ALLERTA ARANCIONE'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                          {warning.description}
                        </p>
                      </div>
                    </div>

                    {/* Camper Protection Tips */}
                    {warning.camperAdvice && warning.camperAdvice.length > 0 && (
                      <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700 space-y-1.5">
                        <div className="text-[11px] font-black uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5" />
                          <span>Raccomandazioni di Sicurezza per il Camper:</span>
                        </div>
                        <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 pl-4 list-disc">
                          {warning.camperAdvice.map((tip, idx) => (
                            <li key={idx}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: ALL REPORTS */}
          {activeTab === 'all_reports' && (
            <div className="space-y-3">
              {communityAlerts.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  Nessuna segnalazione attiva al momento.
                </div>
              ) : (
                communityAlerts.map((alert) => {
                  const dist = userLocation
                    ? calculateDistanceKm(userLocation.lat, userLocation.lng, alert.lat, alert.lng)
                    : null;

                  return (
                    <div
                      key={alert.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {alert.type === 'hail' ? '🧊' : alert.type === 'wind' ? '💨' : '⚡'}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                              {alert.title}
                            </h5>
                            {dist !== null && (
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded-md font-bold">
                                a {dist} km
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {alert.locationName} • @{alert.reportedBy} ({new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                          </p>
                        </div>
                      </div>

                      {onShowOnMap && (
                        <button
                          type="button"
                          onClick={() => {
                            onShowOnMap(alert.lat, alert.lng);
                            onClose();
                          }}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
                          title="Mostra posizione su mappa"
                        >
                          <MapPin className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
