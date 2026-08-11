import React, { useState, useEffect } from "react";
import {
  OCCUPANCY_CONFIGS,
  getOccupancyReport,
  formatTimeAgo,
} from "../utils/occupancyStorage";
import { PlaceOccupancyReport } from "../types";

interface PlaceOccupancyBadgeProps {
  placeId: string;
  size?: "sm" | "md";
  className?: string;
}

export const PlaceOccupancyBadge: React.FC<PlaceOccupancyBadgeProps> = ({
  placeId,
  size = "md",
  className = "",
}) => {
  const [report, setReport] = useState<PlaceOccupancyReport | null>(() =>
    getOccupancyReport(placeId)
  );

  useEffect(() => {
    const update = () => setReport(getOccupancyReport(placeId));
    update();

    const handleCustomEvent = (e: any) => {
      if (e.detail?.placeId === placeId) {
        update();
      }
    };

    window.addEventListener("place-occupancy-changed", handleCustomEvent);
    return () =>
      window.removeEventListener("place-occupancy-changed", handleCustomEvent);
  }, [placeId]);

  if (!report) return null;

  const config = OCCUPANCY_CONFIGS[report.status];
  if (!config) return null;

  const { timeAgo } = formatTimeAgo(report.timestamp);

  if (size === "sm") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border ${config.badgeBg} ${config.badgeText} shadow-2xs ${className}`}
        title={`Stato affollamento: ${config.label} (${timeAgo})`}
      >
        <span className="text-[10px]">{config.icon}</span>
        <span>{config.shortLabel}</span>
        <span className="opacity-60 text-[8px] font-mono">({timeAgo})</span>
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black border ${config.badgeBg} ${config.badgeText} shadow-xs ${className}`}
    >
      <span className="text-xs">{config.icon}</span>
      <span>{config.label}</span>
      <span className="text-[9px] font-semibold opacity-70 border-l border-slate-300 dark:border-slate-700 pl-1.5 ml-0.5">
        {timeAgo}
      </span>
    </div>
  );
};

export default PlaceOccupancyBadge;
