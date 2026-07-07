import React from 'react';
import { 
  Download, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  Map as MapIcon, 
  Database, 
  X, 
  HelpCircle, 
  Info,
  RefreshCw
} from 'lucide-react';
import { 
  OFFLINE_REGIONS, 
  downloadRegion, 
  getStats, 
  clearCache, 
  OfflineRegion 
} from '../utils/offlineMapCache';

export default function OfflineMapsTab() {
  const [stats, setStats] = React.useState<{ count: number; sizeMB: number }>({ count: 0, sizeMB: 0 });
  const [downloadingRegionId, setDownloadingRegionId] = React.useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = React.useState<{ current: number; total: number; statusText: string }>({
    current: 0,
    total: 0,
    statusText: ""
  });
  const [activeDownloadCancel, setActiveDownloadCancel] = React.useState<{ stop: () => void } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = React.useState(true);
  const [showExplanation, setShowExplanation] = React.useState(false);

  // Load stats on mount
  const refreshStats = async () => {
    setIsLoadingStats(true);
    try {
      const currentStats = await getStats();
      setStats(currentStats);
    } catch (e) {
      console.error("Failed to load map stats:", e);
    } finally {
      setIsLoadingStats(false);
    }
  };

  React.useEffect(() => {
    refreshStats();
  }, []);

  const handleStartDownload = async (region: OfflineRegion) => {
    if (downloadingRegionId) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: "⚠️ C'è già un download in corso! Attendi o annulla quello attivo.", duration: 3000 }
      }));
      return;
    }

    setDownloadingRegionId(region.id);
    setDownloadProgress({ current: 0, total: 1, statusText: "Inizializzazione scaricamento..." });

    try {
      const controller = await downloadRegion(
        region,
        (current, total, statusText) => {
          setDownloadProgress({ current, total, statusText });
        },
        async () => {
          setDownloadingRegionId(null);
          setActiveDownloadCancel(null);
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { message: `🎉 Mappa "${region.name}" scaricata ed installata con successo per l'uso offline!`, duration: 5000 }
          }));
          await refreshStats();
        },
        async (err) => {
          setDownloadingRegionId(null);
          setActiveDownloadCancel(null);
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { message: `❌ Errore durante il caricamento offline: ${err.message || err}`, duration: 5000 }
          }));
          await refreshStats();
        }
      );

      setActiveDownloadCancel(controller);
    } catch (e: any) {
      setDownloadingRegionId(null);
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: `❌ Errore avvio download: ${e.message}`, duration: 4000 }
      }));
    }
  };

  const handleCancelDownload = () => {
    if (activeDownloadCancel) {
      activeDownloadCancel.stop();
      setActiveDownloadCancel(null);
      setDownloadingRegionId(null);
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: "🛑 Scaricamento annullato dall'utente.", duration: 3000 }
      }));
      refreshStats();
    }
  };

  const handleClearCache = async () => {
    try {
      await clearCache();
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: "🗑️ Mappe offline rimosse con successo!", duration: 3000 }
      }));
      await refreshStats();
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: `❌ Errore svuotamento cache: ${e.message}` }
      }));
    }
  };

  const handleDownloadAroundMe = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: "GPS non supportato dal tuo browser.", duration: 3000 }
      }));
      return;
    }

    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: "Acquisizione posizione GPS in corso...", duration: 2000 }
    }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // 10km box approximately (1 degree latitude = ~111km)
        // 0.1 degree is roughly 11km
        const customRegion: OfflineRegion = {
          id: `custom_gps_${Date.now()}`,
          name: "Mappa Intorno a Me (Dettaglio Massimo)",
          description: "Mappa super dettagliata (strade e sentieri) nel raggio di ~10km dalla tua posizione attuale.",
          estimatedSize: "~15 MB",
          zoomRange: [13, 16],
          latMin: latitude - 0.05,
          latMax: latitude + 0.05,
          lngMin: longitude - 0.05,
          lngMax: longitude + 0.05
        };
        handleStartDownload(customRegion);
      },
      (err) => {
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { message: "Errore GPS: " + err.message, duration: 3000 }
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-6">
      {/* Upper header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200/50 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#3E4A35]/10 rounded-2xl text-[#3E4A35]">
            <MapIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-[#3E4A35] text-lg leading-tight">Mappe Cartografiche Offline</h3>
            <p className="text-xs text-slate-500 mt-1">Gestisci la sosta libera e la navigazione GPS anche senza copertura internet.</p>
          </div>
        </div>

        {/* Floating current stats display */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3.5 shadow-2xs self-start sm:self-center">
          <Database className="w-5 h-5 text-[#5A6B4E]" />
          <div>
            <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Archiviazione Mappa</div>
            <div className="text-sm font-black text-[#3E4A35] flex items-center gap-1.5 mt-0.5">
              {isLoadingStats ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
              ) : (
                <span>{stats.sizeMB} MB ({stats.count} tasselli)</span>
              )}
            </div>
          </div>
          {stats.count > 0 && !downloadingRegionId && (
            <button
              onClick={handleClearCache}
              className="px-3 py-1.5 ml-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Svuota cache mappe offline"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Svuota Cache
            </button>
          )}
        </div>
      </div>

      {/* Clever architectural notice explaining browser storage capabilities */}
      <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-4 text-slate-700 text-xs leading-relaxed space-y-2">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-[#A45C40] shrink-0 mt-0.5" />
          <div className="font-semibold text-[#A45C40]">Come funziona il caricamento offline per i camper?</div>
        </div>
        <p>
          I navigatori e le mappe di Google richiedono una connessione continua per scaricare la cartografia vettoriale. 
          Quando sei in viaggio e perdi il segnale (es. gole di montagna, boschi o gallerie), CamperLifeApp attiva un 
          <strong> motore cartografico Leaflet di riserva autonomo</strong>. 
        </p>
        <p>
          Per superare i limiti di memoria del browser (IndexedDB limitato a circa 150MB), utilizziamo un'architettura ibrida 
          ottimizzata: scarichiamo i <strong>punti di sosta reali</strong> e un <strong>set di coordinate chiave (seed)</strong> di città 
          e autostrade. Il resto della mappa viene renderizzato in tempo reale tramite un algoritmo geometrico locale (Parchment offline). 
          Così potrai vedere sempre le soste sulla mappa, conoscere le distanze e orientarti perfettamente anche in mezzo al nulla!
        </p>
      </div>

      {/* Download Progress overlay card if downloading */}
      {downloadingRegionId && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 animate-pulse">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-700 animate-spin" />
              <span className="font-bold text-emerald-900 text-sm">
                Scaricamento ed Elaborazione in corso...
              </span>
            </div>
            <button
              onClick={handleCancelDownload}
              className="px-2.5 py-1 text-[10px] font-black text-rose-800 bg-rose-100 hover:bg-rose-200 rounded-lg border border-rose-200 select-none cursor-pointer transition-all uppercase"
            >
              Annulla Download
            </button>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(100, (downloadProgress.current / downloadProgress.total) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-emerald-800 font-semibold font-mono">
              <span>{downloadProgress.current} / {downloadProgress.total} Tasselli elaborati ({Math.round((downloadProgress.current / downloadProgress.total) * 100)}%)</span>
              <span className="text-emerald-700 italic">{downloadProgress.statusText}</span>
            </div>
          </div>
        </div>
      )}

      {/* Region lists */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-[#3E4A35] text-xs uppercase tracking-wider pl-1">Mappe Regionali Disponibili</h4>
          <button
            onClick={handleDownloadAroundMe}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3E4A35] text-white rounded-lg text-xs font-bold hover:bg-[#2c3625] transition-colors shadow-sm"
          >
            <MapIcon className="w-3.5 h-3.5" />
            Area GPS Attuale (Dettagliata)
          </button>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          {OFFLINE_REGIONS.map((region) => {
            const isSelectedDownloader = downloadingRegionId === region.id;
            
            return (
              <div 
                key={region.id}
                className="bg-white border border-slate-200/85 hover:border-[#3E4A35]/35 rounded-2xl p-4.5 flex flex-col justify-between gap-4 transition-all hover:shadow-xs group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-800 group-hover:text-[#3E4A35] transition-colors text-sm">
                      {region.name}
                    </span>
                    <span className="bg-[#3E4A35]/10 text-[#3E4A35] font-mono text-[10px] px-2 py-0.5 rounded-md font-bold">
                      {region.estimatedSize}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-normal">
                    {region.description}
                  </p>
                  <div className="text-[10px] text-slate-400 font-semibold font-mono">
                    Copertura coordinate: [{region.latMin}°N - {region.latMax}°N, {region.lngMin}°E - {region.lngMax}°E] • Zoom {region.zoomRange[0]}-{region.zoomRange[1]}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-extrabold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Compatibile con Leaflet GPS
                  </span>

                  <button
                    onClick={() => handleStartDownload(region)}
                    disabled={!!downloadingRegionId}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black select-none transition-all duration-150 flex items-center gap-1.5 ${
                      isSelectedDownloader 
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : 'bg-[#3E4A35] text-white hover:bg-[#5A6B4E] shadow-2xs active:scale-95 cursor-pointer'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Scarica Mappa</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Storage and PWA disclaimer */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3.5">
        <HelpCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-slate-600 leading-relaxed">
          <div className="font-bold text-slate-800">Note di Utilizzo e Spazio su Disco</div>
          <p>
            Le mappe offline scaricate vengono memorizzate in modo sicuro nella <strong>cache IndexedDB</strong> del tuo browser. 
            Non verranno eliminate chiudendo l'app o spegnendo il dispositivo. Tuttavia, per garantire che non vengano svuotate 
            se la memoria del telefono è quasi piena, ti consigliamo di installare l'applicazione come **Web App (PWA)** sul tuo 
            schermo principale tramite il pannello di installazione.
          </p>
        </div>
      </div>
    </div>
  );
}
