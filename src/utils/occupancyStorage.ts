import { OccupancyStatus, PlaceOccupancyReport } from "../types";

const STORAGE_KEY = "camper_place_occupancy_v1";
export const THREE_HOURS_MS = 3 * 60 * 60 * 1000; // 3 hours = 10,800,000 ms

export interface OccupancyConfig {
  id: OccupancyStatus;
  label: string;
  shortLabel: string;
  bgColor: string; // Tailwind class for background
  bgGradient: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
  hexColor: string;
  icon: string;
}

export const OCCUPANCY_CONFIGS: Record<OccupancyStatus, OccupancyConfig> = {
  molto_posto: {
    id: "molto_posto",
    label: "Molti posti",
    shortLabel: "Molti posti",
    bgColor: "bg-blue-600 hover:bg-blue-500 text-white",
    bgGradient: "from-blue-600 to-sky-500",
    borderColor: "border-blue-400",
    textColor: "text-blue-700 dark:text-blue-300",
    badgeBg: "bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800",
    badgeText: "text-blue-800 dark:text-blue-200",
    hexColor: "#2563eb",
    icon: "🔵",
  },
  vari_posti: {
    id: "vari_posti",
    label: "Vari posti",
    shortLabel: "Vari posti",
    bgColor: "bg-emerald-600 hover:bg-emerald-500 text-white",
    bgGradient: "from-emerald-600 to-teal-500",
    borderColor: "border-emerald-400",
    textColor: "text-emerald-700 dark:text-emerald-300",
    badgeBg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800",
    badgeText: "text-emerald-800 dark:text-emerald-200",
    hexColor: "#16a34a",
    icon: "🟢",
  },
  pochi_posti: {
    id: "pochi_posti",
    label: "Pochi posti",
    shortLabel: "Pochi posti",
    bgColor: "bg-amber-500 hover:bg-amber-400 text-white",
    bgGradient: "from-amber-500 to-yellow-500",
    borderColor: "border-amber-400",
    textColor: "text-amber-800 dark:text-amber-300",
    badgeBg: "bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800",
    badgeText: "text-amber-900 dark:text-amber-200",
    hexColor: "#f59e0b",
    icon: "🟡",
  },
  tutto_pieno: {
    id: "tutto_pieno",
    label: "Tutto pieno",
    shortLabel: "Tutto pieno",
    bgColor: "bg-red-600 hover:bg-red-500 text-white",
    bgGradient: "from-red-600 to-rose-600",
    borderColor: "border-red-400",
    textColor: "text-red-700 dark:text-red-300",
    badgeBg: "bg-red-100 dark:bg-red-950/60 border-red-300 dark:border-red-800",
    badgeText: "text-red-800 dark:text-red-200",
    hexColor: "#dc2626",
    icon: "🔴",
  },
};

export function getAllOccupancyReports(): Record<string, PlaceOccupancyReport> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: Record<string, PlaceOccupancyReport> = JSON.parse(raw);
    const now = Date.now();
    let cleaned = false;

    // Prune entries older than 3 hours
    Object.keys(parsed).forEach((placeId) => {
      if (!parsed[placeId] || now - parsed[placeId].timestamp >= THREE_HOURS_MS) {
        delete parsed[placeId];
        cleaned = true;
      }
    });

    if (cleaned) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }

    return parsed;
  } catch (err) {
    console.error("[OccupancyStorage] Error reading reports:", err);
    return {};
  }
}

export function getOccupancyReport(placeId: string): PlaceOccupancyReport | null {
  if (!placeId) return null;
  const reports = getAllOccupancyReports();
  const report = reports[placeId];
  if (!report) return null;

  const age = Date.now() - report.timestamp;
  if (age >= THREE_HOURS_MS) {
    // Expired
    delete reports[placeId];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    } catch {}
    return null;
  }

  return report;
}

export function saveOccupancyReport(
  placeId: string,
  status: OccupancyStatus,
  reportedBy?: string
): PlaceOccupancyReport {
  const reports = getAllOccupancyReports();
  const newReport: PlaceOccupancyReport = {
    status,
    timestamp: Date.now(),
    reportedBy,
  };

  reports[placeId] = newReport;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (err) {
    console.error("[OccupancyStorage] Failed to write localStorage:", err);
  }

  // Notify listeners across components
  window.dispatchEvent(
    new CustomEvent("place-occupancy-changed", {
      detail: { placeId, report: newReport },
    })
  );

  return newReport;
}

export function clearOccupancyReport(placeId: string): void {
  const reports = getAllOccupancyReports();
  if (reports[placeId]) {
    delete reports[placeId];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    } catch {}

    window.dispatchEvent(
      new CustomEvent("place-occupancy-changed", {
        detail: { placeId, report: null },
      })
    );
  }
}

export function formatTimeAgo(timestamp: number): { timeAgo: string; expiresDiff: string } {
  const now = Date.now();
  const diffMs = Math.max(0, now - timestamp);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  let timeAgo = "";
  if (diffMins < 1) {
    timeAgo = "proprio ora";
  } else if (diffMins < 60) {
    timeAgo = `${diffMins} min fa`;
  } else {
    const minsRem = diffMins % 60;
    timeAgo = `${diffHours}h ${minsRem}m fa`;
  }

  const msRemaining = Math.max(0, THREE_HOURS_MS - diffMs);
  const minsRemaining = Math.floor(msRemaining / 60000);
  const hoursRem = Math.floor(minsRemaining / 60);
  const minsRem = minsRemaining % 60;

  let expiresDiff = "";
  if (hoursRem > 0) {
    expiresDiff = `${hoursRem}h ${minsRem}m`;
  } else {
    expiresDiff = `${minsRem}m`;
  }

  return { timeAgo, expiresDiff };
}
