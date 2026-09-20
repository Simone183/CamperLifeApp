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
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  HardDrive,
  Upload,
  FileArchive,
  Cloud,
  Compass,
  Check
} from 'lucide-react';
import { 
  OFFLINE_REGIONS, 
  downloadRegion, 
  getFullStorageStatus, 
  clearCache, 
  enablePersistentStorage,
  exportOfflineMapPackage,
  importOfflineMapPackage,
  syncOfflineRegionsToCloud,
  fetchCloudOfflineRegions,
  getDownloadedRegionsMeta,
  OfflineRegion,
  StorageStatus,
  DownloadedRegionMeta
} from '../utils/offlineMapCache';

interface OfflineMapsTabProps {
  userEmail?: string;
}

export default function OfflineMapsTab({ userEmail }: OfflineMapsTabProps) {
  const [storageStatus, setStorageStatus] = React.useState<StorageStatus>({
    isPersisted: false,
    count: 0,
    sizeMB: 0,
    usageMB: 0,
    quotaMB: 0
  });
  const [downloadedMeta, setDownloadedMeta] = React.useState<DownloadedRegionMeta[]>([]);
  const [downloadingRegionId, setDownloadingRegionId] = React.useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = React.useState<{ current: number; total: number; statusText: string }>({
    current: 0,
    total: 0,
    statusText: ""
  });
  const [activeDownloadCancel, setActiveDownloadCancel] = React.useState<{ stop: () => void } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = React.useState(false);
  const [cloudRegions, setCloudRegions] = React.useState<DownloadedRegionMeta[]>([]);
  const [customRadiusKm, setCustomRadiusKm] = React.useState<number>(15);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Load stats and persistent status on mount
  const refreshStorageData = async () => {
    setIsLoadingStats(true);
    try {
      const status = await getFullStorageStatus();
      setStorageStatus(status);
      const metas = await getDownloadedRegionsMeta();
      setDownloadedMeta(metas);

      if (userEmail) {
        const cloudData = await fetchCloudOfflineRegions(userEmail);
        setCloudRegions(cloudData);
      }
    } catch (e) {
      console.error("Failed to load map storage status:", e);
    } finally {
      setIsLoadingStats(false);
    }
  };

  React.useEffect(() => {
    refreshStorageData();
    // Silently attempt to activate persistent storage
    enablePersistentStorage().then((persisted) => {
      if (persisted) {
        setStorageStatus((prev) => ({ ...prev, isPersisted: true }));
      }
    });
  }, [userEmail]);

  const handleRequestPersistence = async () => {
    const granted = await enablePersistentStorage();
    if (granted) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: "🛡️ Protezione permanente attivata! Le mappe non verranno cancellate dalla memoria.", duration: 4000 }
      }));
    } else {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: "ℹ️ Archiviazione gestita dal browser. Ti consigliamo di installare l'app come PWA.", duration: 4000 }
      }));
    }
    await refreshStorageData();
  };

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
            detail: { message: `🎉 Mappa "${region.name}" salvata con successo per l'uso offline!`, duration: 5000 }
          }));
          await refreshStorageData();
        },
        async (err) => {
          setDownloadingRegionId(null);
          setActiveDownloadCancel(null);
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { message: `❌ Errore durante il caricamento offline: ${err.message || err}`, duration: 5000 }
          }));
          await refreshStorageData();
        },
        userEmail
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
        detail: { message: "🛑 Scaricamento annullato.", duration: 3000 }
      }));
      refreshStorageData();
    }
  };

  const handleClearCache = async () => {
    if (!window.confirm("Sei sicuro di voler eliminare tutte le mappe offline scaricate? Dovrai riscaricarle se non hai esportato un backup.")) {
      return;
    }

    try {
      await clearCache();
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: "🗑️ Cache mappe offline svuotata.", duration: 3000 }
      }));
      await refreshStorageData();
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
        // 1 deg lat ≈ 111 km, so delta = radius / 111
        const deltaLat = customRadiusKm / 111;
        const deltaLng = customRadiusKm / (111 * Math.cos((latitude * Math.PI) / 180));

        const customRegion: OfflineRegion = {
          id: `custom_gps_${Math.round(latitude * 100)}_${Math.round(longitude * 100)}_${customRadiusKm}km`,
          name: `Mappa GPS (${customRadiusKm} km attorno a me)`,
          description: `Copertura ad alto dettaglio (zoom 10-15) nel raggio di ${customRadiusKm} km dalla tua posizione attuale.`,
          estimatedSize: customRadiusKm <= 20 ? "~15 MB" : customRadiusKm <= 35 ? "~35 MB" : "~75 MB",
          zoomRange: [10, 15],
          latMin: latitude - deltaLat,
          latMax: latitude + deltaLat,
          lngMin: longitude - deltaLng,
          lngMax: longitude + deltaLng
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

  // Export package to disk (.vcm file)
  const handleExportPackage = async () => {
    if (storageStatus.count === 0) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: "ℹ️ Nessuna mappa presente da esportare. Scarica prima una regione!", duration: 4000 }
      }));
      return;
    }

    setIsExporting(true);
    try {
      const { blob, filename, count } = await exportOfflineMapPackage();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: `✅ Pacchetto di ${count} tasselli salvato in Download (${filename})!`, duration: 6000 }
      }));
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: `❌ Errore durante l'esportazione: ${e.message}`, duration: 5000 }
      }));
    } finally {
      setIsExporting(false);
    }
  };

  // Import package from disk (.vcm file)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await importOfflineMapPackage(file);
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: `🎉 Ripristino completato! ${result.count} tasselli e ${result.regionsCount} regioni ripristinate con successo.`, duration: 6000 }
      }));
      await refreshStorageData();
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: `❌ Errore importazione backup: ${err.message}`, duration: 5000 }
      }));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSyncCloud = async () => {
    if (!userEmail) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: "Accedi al tuo account ViaCamper per sincronizzare le preferenze mappe sul Cloud.", duration: 4000 }
      }));
      return;
    }

    setIsSyncingCloud(true);
    try {
      await syncOfflineRegionsToCloud(userEmail);
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: "☁️ Preferenze regioni offline sincronizzate con successo nel tuo account Cloud!", duration: 4000 }
      }));
      await refreshStorageData();
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: "❌ Errore sincronizzazione Cloud: " + e.message, duration: 4000 }
      }));
    } finally {
      setIsSyncingCloud(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper header section with persistent storage badge */}
      <div className="bg-slate-50 border border-slate-200/80 p-4 sm:p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#3E4A35]/10 rounded-2xl text-[#3E4A35]">
              <MapIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#3E4A35] text-lg leading-tight">Mappe Cartografiche Offline</h3>
              <p className="text-xs text-slate-500 mt-0.5">Navigazione GPS e consultazione soste libera senza copertura internet.</p>
            </div>
          </div>

          {/* Persistent status badge & controls */}
          <div className="flex flex-wrap items-center gap-2">
            {storageStatus.isPersisted ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Memoria Protetta da Pulizie OS</span>
              </div>
            ) : (
              <button
                onClick={handleRequestPersistence}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                title="Richiedi al browser di non cancellare mai le mappe"
              >
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Attiva Protezione Memoria</span>
              </button>
            )}

            <button
              onClick={refreshStorageData}
              disabled={isLoadingStats}
              className="p-2 text-slate-600 hover:text-[#3E4A35] bg-white border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Ricarica stato memoria"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingStats ? 'animate-spin text-[#3E4A35]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Storage stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/60">
          <div className="bg-white border border-slate-200/70 rounded-xl p-3 flex items-center gap-3 shadow-2xs">
            <Database className="w-5 h-5 text-[#5A6B4E] shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Mappe Scaricate</div>
              <div className="text-sm font-black text-[#3E4A35] truncate">
                {storageStatus.sizeMB} MB ({storageStatus.count} tasselli)
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/70 rounded-xl p-3 flex items-center gap-3 shadow-2xs">
            <HardDrive className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Spazio Totale Dispositivo</div>
              <div className="text-sm font-black text-slate-800 truncate">
                {storageStatus.quotaMB > 0 ? `${(storageStatus.quotaMB / 1024).toFixed(1)} GB liberi` : 'Illimitato'}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/70 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs">
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Gestione Cache</div>
              <div className="text-xs font-semibold text-slate-600 truncate">
                {downloadedMeta.length} aree registrate
              </div>
            </div>
            {storageStatus.count > 0 && !downloadingRegionId && (
              <button
                onClick={handleClearCache}
                className="px-2.5 py-1 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                title="Svuota cache mappe offline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Svuota
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BACKUP & RESTORE CARD (Soluzione per reinstallazioni e aggiornamenti app) */}
      <div className="bg-gradient-to-br from-[#3E4A35]/5 via-white to-amber-500/5 border border-[#3E4A35]/20 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-2 bg-[#3E4A35] text-white rounded-xl shrink-0 mt-0.5">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#3E4A35] text-sm sm:text-base">
                Salvataggio e Ripristino Mappe su File (.vcm)
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Salva una copia delle mappe nella cartella <strong>Download</strong> del tuo dispositivo. Se disinstalli l'app, aggiorni il sistema o cambi telefono, potrai <strong>ripristinare tutte le mappe istantaneamente</strong> senza doverle riscaricare da internet!
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              onClick={handleExportPackage}
              disabled={isExporting || storageStatus.count === 0}
              className="px-3 py-2 bg-[#3E4A35] text-white hover:bg-[#2c3625] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              title="Scarica un file .vcm di backup con tutte le tue mappe"
            >
              {isExporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Esporta Backup (.vcm)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="px-3 py-2 bg-white text-[#3E4A35] border border-[#3E4A35]/40 hover:bg-[#3E4A35]/5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              title="Carica un file .vcm salvato in precedenza"
            >
              {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>Ripristina da File</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".vcm,.json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Cloud Sync Status */}
        {userEmail && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Cloud className="w-4 h-4 text-[#5A6B4E]" />
              <span>
                Account Cloud: <strong>{userEmail}</strong> • {cloudRegions.length > 0 ? `${cloudRegions.length} aree collegate al profilo` : "Nessuna regione sincronizzata"}
              </span>
            </div>
            <button
              onClick={handleSyncCloud}
              disabled={isSyncingCloud}
              className="text-xs font-bold text-[#3E4A35] hover:underline flex items-center gap-1 cursor-pointer"
            >
              {isSyncingCloud ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              <span>Sincronizza Cloud</span>
            </button>
          </div>
        )}
      </div>

      {/* Download Progress overlay card if downloading */}
      {downloadingRegionId && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 animate-pulse">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-700 animate-spin" />
              <span className="font-bold text-emerald-900 text-sm">
                Salvataggio cartografia offline in corso...
              </span>
            </div>
            <button
              onClick={handleCancelDownload}
              className="px-2.5 py-1 text-[10px] font-black text-rose-800 bg-rose-100 hover:bg-rose-200 rounded-lg border border-rose-200 select-none cursor-pointer transition-all uppercase"
            >
              Annulla
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
              <span>{downloadProgress.current} / {downloadProgress.total} Tasselli ({Math.round((downloadProgress.current / downloadProgress.total) * 100)}%)</span>
              <span className="text-emerald-700 italic">{downloadProgress.statusText}</span>
            </div>
          </div>
        </div>
      )}

      {/* Custom GPS Area Downloader */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm">Mappa ad Alto Dettaglio Attorno a Te (GPS)</h4>
              <p className="text-xs text-slate-500">Scarica strade, sentieri e punti di sosta attorno alle tue coordinate correnti.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-700">
              {[15, 30, 50].map((r) => (
                <button
                  key={r}
                  onClick={() => setCustomRadiusKm(r)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    customRadiusKm === r ? 'bg-white text-[#3E4A35] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>

            <button
              onClick={handleDownloadAroundMe}
              disabled={!!downloadingRegionId}
              className="px-3.5 py-1.5 bg-[#3E4A35] hover:bg-[#2c3625] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Scarica Raggio {customRadiusKm} km</span>
            </button>
          </div>
        </div>
      </div>

      {/* Region lists */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-[#3E4A35] text-xs uppercase tracking-wider pl-1">
            Pacchetti Regionali Italia & Montagna
          </h4>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          {OFFLINE_REGIONS.map((region) => {
            const isSelectedDownloader = downloadingRegionId === region.id;
            const isAlreadyDownloaded = downloadedMeta.some((m) => m.id === region.id);
            const metaInfo = downloadedMeta.find((m) => m.id === region.id);
            
            return (
              <div 
                key={region.id}
                className={`bg-white border rounded-2xl p-4.5 flex flex-col justify-between gap-4 transition-all group ${
                  isAlreadyDownloaded 
                    ? 'border-emerald-300/80 bg-emerald-50/10 shadow-2xs' 
                    : 'border-slate-200/85 hover:border-[#3E4A35]/35 hover:shadow-xs'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-800 group-hover:text-[#3E4A35] transition-colors text-sm">
                        {region.name}
                      </span>
                      {isAlreadyDownloaded && (
                        <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-700" />
                          Installata
                        </span>
                      )}
                    </div>
                    <span className="bg-[#3E4A35]/10 text-[#3E4A35] font-mono text-[10px] px-2 py-0.5 rounded-md font-bold">
                      {region.estimatedSize}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-normal">
                    {region.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold font-mono">
                    <span>Coord: [{region.latMin}°N - {region.latMax}°N]</span>
                    <span>Zoom {region.zoomRange[0]}-{region.zoomRange[1]}</span>
                  </div>

                  {metaInfo && (
                    <div className="text-[11px] text-emerald-700 font-semibold">
                      Ultimo aggiornamento: {new Date(metaInfo.downloadedAt).toLocaleDateString('it-IT')} ({metaInfo.tileCount} tasselli memorizzati)
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-extrabold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Compatibile Leaflet & GPS
                  </span>

                  <button
                    onClick={() => handleStartDownload(region)}
                    disabled={!!downloadingRegionId}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black select-none transition-all duration-150 flex items-center gap-1.5 ${
                      isSelectedDownloader 
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : isAlreadyDownloaded
                        ? 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-2xs active:scale-95 cursor-pointer'
                        : 'bg-[#3E4A35] text-white hover:bg-[#5A6B4E] shadow-2xs active:scale-95 cursor-pointer'
                    }`}
                  >
                    {isAlreadyDownloaded ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Aggiorna Mappa</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Scarica Mappa</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Guide notice explaining offline cartography & persistence */}
      <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-4 text-slate-700 text-xs leading-relaxed space-y-2">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-[#A45C40] shrink-0 mt-0.5" />
          <div className="font-semibold text-[#A45C40]">Come garantiamo che le mappe rimangano salvate?</div>
        </div>
        <p>
          1. <strong>Doppio Livello di Memoria (IndexedDB + Cache Storage)</strong>: Le mappe vengono salvate contemporaneamente in due storage locali indipendenti per resistere a chiusure dell'app o interruzioni di rete.
        </p>
        <p>
          2. <strong>Archiviazione Persistente</strong>: L'applicazione richiede al sistema operativo il flag di persistenza per evitare che la pulizia automatica di memoria di Android/iOS cancelli le cartografie.
        </p>
        <p>
          3. <strong>Backup su File (.vcm)</strong>: Se devi disinstallare l'app o cambiare smartphone, usa la funzione <em>"Esporta Backup (.vcm)"</em> sopra per salvare il pacchetto nel tuo telefono: quando reinstallerai l'app potrai ricaricare tutto in 1 secondo senza consumare dati internet!
        </p>
      </div>
    </div>
  );
}
