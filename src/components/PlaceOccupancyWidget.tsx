import React, { useState, useEffect } from "react";
import { OccupancyStatus, PlaceOccupancyReport } from "../types";
import {
  OCCUPANCY_CONFIGS,
  getOccupancyReport,
  saveOccupancyReport,
  clearOccupancyReport,
  formatTimeAgo,
} from "../utils/occupancyStorage";
import { Clock, CheckCircle2, AlertCircle, RefreshCw, Users } from "lucide-react";

interface PlaceOccupancyWidgetProps {
  placeId: string;
  placeName: string;
  userNickname?: string;
  className?: string;
}

export const PlaceOccupancyWidget: React.FC<PlaceOccupancyWidgetProps> = ({
  placeId,
  placeName,
  userNickname,
  className = "",
}) => {
  const [report, setReport] = useState<PlaceOccupancyReport | null>(() =>
    getOccupancyReport(placeId)
  );

  const [timeInfo, setTimeInfo] = useState<{ timeAgo: string; expiresDiff: string }>(
    () => (report ? formatTimeAgo(report.timestamp) : { timeAgo: "", expiresDiff: "" })
  );

  // Sync state on placeId change or custom event
  useEffect(() => {
    const update = () => {
      const current = getOccupancyReport(placeId);
      setReport(current);
      if (current) {
        setTimeInfo(formatTimeAgo(current.timestamp));
      }
    };

    update();

    // Timer to update "time ago" and auto-expire after 3 hours
    const interval = setInterval(update, 20000); // refresh every 20s

    const handleCustomEvent = (e: any) => {
      if (e.detail?.placeId === placeId) {
        update();
      }
    };

    window.addEventListener("place-occupancy-changed", handleCustomEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener("place-occupancy-changed", handleCustomEvent);
    };
  }, [placeId]);

  const handleSelectStatus = (status: OccupancyStatus) => {
    const newReport = saveOccupancyReport(placeId, status, userNickname);
    setReport(newReport);
    setTimeInfo(formatTimeAgo(newReport.timestamp));

    const config = OCCUPANCY_CONFIGS[status];

    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: {
          message: `${config.icon} Segnalato: "${config.label}" per ${placeName}!`,
          duration: 3500,
        },
      })
    );
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearOccupancyReport(placeId);
    setReport(null);

    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: {
          message: `🔄 Segnalazione azzerata per ${placeName}`,
          duration: 2500,
        },
      })
    );
  };

  const activeConfig = report ? OCCUPANCY_CONFIGS[report.status] : null;

  return (
    <div
      className={`bg-slate-200 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-4 shadow-xs transition-all space-y-3.5 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-300/80 dark:border-slate-700/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs tracking-tight">
              Disponibilità Posti in Tempo Reale
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Aiuta la community segnalando l'affollamento
            </p>
          </div>
        </div>

        {report && (
          <button
            onClick={handleReset}
            className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Azzera la segnalazione attuale"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Azzera</span>
          </button>
        )}
      </div>

      {/* Active Status Display Banner */}
      {report && activeConfig ? (
        <div
          className={`p-3 rounded-xl border ${activeConfig.badgeBg} flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all animate-fade-in`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl shrink-0">{activeConfig.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-black text-xs ${activeConfig.badgeText}`}>
                  {activeConfig.label}
                </span>
                <span className="bg-white/80 dark:bg-slate-900/80 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  {timeInfo.timeAgo}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {report.reportedBy ? `Segnalato da ${report.reportedBy}` : "Segnalazione utenti community"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-slate-800 shrink-0 self-start sm:self-center">
            <Clock className="w-3 h-3 text-indigo-500" />
            <span>Azzeramento tra: <strong className="text-slate-700 dark:text-slate-200 font-mono">{timeInfo.expiresDiff}</strong></span>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-[11px] text-slate-700 dark:text-slate-300 font-medium flex items-center justify-center gap-2 shadow-2xs">
          <AlertCircle className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>Nessuna segnalazione recente (si azzera ogni 3 ore).</span>
        </div>
      )}

      {/* 4 Colored Action Buttons */}
      <div>
        <p className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
          Sei sul posto? Seleziona lo stato attuale:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* 1. Molti posti (BLU) */}
          <button
            type="button"
            onClick={() => handleSelectStatus("molto_posto")}
            className={`px-3 py-2.5 rounded-xl font-black text-xs transition-all flex flex-col items-center justify-center gap-1 shadow-sm border cursor-pointer active:scale-95 ${
              report?.status === "molto_posto"
                ? "bg-blue-600 text-white border-blue-700 ring-2 ring-blue-400 shadow-md scale-[1.02]"
                : "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white border-blue-500 opacity-90 hover:opacity-100"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>🔵</span>
              <span className="truncate">Molti posti</span>
            </div>
            {report?.status === "molto_posto" && (
              <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" /> Attivo
              </span>
            )}
          </button>

          {/* 2. Vari posti (VERDE) */}
          <button
            type="button"
            onClick={() => handleSelectStatus("vari_posti")}
            className={`px-3 py-2.5 rounded-xl font-black text-xs transition-all flex flex-col items-center justify-center gap-1 shadow-sm border cursor-pointer active:scale-95 ${
              report?.status === "vari_posti"
                ? "bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400 shadow-md scale-[1.02]"
                : "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border-emerald-500 opacity-90 hover:opacity-100"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>🟢</span>
              <span className="truncate">Vari posti</span>
            </div>
            {report?.status === "vari_posti" && (
              <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" /> Attivo
              </span>
            )}
          </button>

          {/* 3. Pochi posti (GIALLO) */}
          <button
            type="button"
            onClick={() => handleSelectStatus("pochi_posti")}
            className={`px-3 py-2.5 rounded-xl font-black text-xs transition-all flex flex-col items-center justify-center gap-1 shadow-sm border cursor-pointer active:scale-95 ${
              report?.status === "pochi_posti"
                ? "bg-amber-500 text-slate-900 border-amber-600 ring-2 ring-amber-400 shadow-md scale-[1.02]"
                : "bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-900 border-amber-400 opacity-90 hover:opacity-100"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>🟡</span>
              <span className="truncate">Pochi posti</span>
            </div>
            {report?.status === "pochi_posti" && (
              <span className="text-[9px] bg-black/15 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" /> Attivo
              </span>
            )}
          </button>

          {/* 4. Tutto pieno (ROSSO) */}
          <button
            type="button"
            onClick={() => handleSelectStatus("tutto_pieno")}
            className={`px-3 py-2.5 rounded-xl font-black text-xs transition-all flex flex-col items-center justify-center gap-1 shadow-sm border cursor-pointer active:scale-95 ${
              report?.status === "tutto_pieno"
                ? "bg-red-600 text-white border-red-700 ring-2 ring-red-400 shadow-md scale-[1.02]"
                : "bg-red-600 hover:bg-red-500 active:bg-red-700 text-white border-red-500 opacity-90 hover:opacity-100"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>🔴</span>
              <span className="truncate">Tutto pieno</span>
            </div>
            {report?.status === "tutto_pieno" && (
              <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" /> Attivo
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Info footer */}
      <div className="text-[9px] text-slate-400 text-center font-medium pt-1">
        ⏱️ Le segnalazioni scadono e si azzerano automaticamente dopo 3 ore per garantire dati sempre aggiornati.
      </div>
    </div>
  );
};

export default PlaceOccupancyWidget;
