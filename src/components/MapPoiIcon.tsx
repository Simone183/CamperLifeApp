import React from "react";

export type PoiCategoryType = "sosta" | "campeggio" | "parcheggio" | "service" | "poi";

export interface PoiCategoryDetails {
  type: PoiCategoryType;
  label: string;
  bgGradient: string;
  borderBg: string;
  glowColor: string;
  bgHex: string;
  svgPath: React.ReactNode;
  svgHtml: string;
}

export function getPoiCategoryDetails(
  category: string,
  isViolation: boolean = false,
  feeStatus?: 'free' | 'paid' | 'unknown'
): PoiCategoryDetails {
  if (isViolation) {
    return {
      type: "poi",
      label: "Soglia Altezza Superata",
      bgGradient: "from-rose-600 via-red-600 to-rose-700",
      borderBg: "border-rose-200",
      glowColor: "rgba(225, 29, 72, 0.6)",
      bgHex: "#e11d48",
      svgPath: (
        <svg className="w-5 h-5 text-white drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="currentColor" fillOpacity="0.25"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
      svgHtml: `
        <svg class="w-5 h-5 text-white drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="currentColor" fill-opacity="0.25"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>`
    };
  }

  const normCat = (category || "").toLowerCase();
  
  // Default base styling based on category
  let bgGradient = "from-amber-500 via-amber-600 to-orange-600";
  let borderBg = "border-amber-200/90";
  let glowColor = "rgba(245, 158, 11, 0.5)";
  let bgHex = "#f59e0b";
  let type: PoiCategoryType = "sosta";
  let label = "Area Sosta";

  if (normCat.includes("campeggio") || normCat.includes("camping")) {
      type = "campeggio";
      label = "Campeggio";
      bgGradient = "from-emerald-500 via-emerald-600 to-teal-700";
      borderBg = "border-emerald-200/90";
      glowColor = "rgba(16, 185, 129, 0.5)";
      bgHex = "#10b981";
  } else if (normCat.includes("parcheggio")) {
      type = "parcheggio";
      label = "Parcheggio Camper";
      bgGradient = "from-blue-600 via-indigo-600 to-indigo-700";
      borderBg = "border-blue-200/90";
      glowColor = "rgba(37, 99, 235, 0.5)";
      bgHex = "#2563eb";
  } else if (!normCat.includes("sosta")) {
      type = "service";
      label = "Camper Service";
      bgGradient = "from-cyan-500 via-sky-600 to-blue-600";
      borderBg = "border-cyan-200/90";
      glowColor = "rgba(6, 182, 212, 0.5)";
      bgHex = "#06b6d4";
  }

  // Override color if fee status is known
  if (feeStatus === 'free') {
      bgGradient = "from-green-500 via-green-600 to-emerald-600";
      borderBg = "border-green-200/90";
      glowColor = "rgba(16, 185, 129, 0.5)";
      bgHex = "#10b981";
  } else if (feeStatus === 'paid') {
      bgGradient = "from-orange-500 via-orange-600 to-red-600";
      borderBg = "border-orange-200/90";
      glowColor = "rgba(249, 115, 22, 0.5)";
      bgHex = "#f97316";
  }

  return {
    type,
    label,
    bgGradient,
    borderBg,
    glowColor,
    bgHex,
    svgPath: (
        <svg className="w-5 h-5 text-white drop-shadow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {type === "sosta" && <><path d="M3 17h18" /><path d="M4 17V8a2 2 0 0 1 2-2h9l4 4v7" fill="currentColor" fillOpacity="0.2" /><circle cx="7.5" cy="17.5" r="1.5" fill="currentColor" /><circle cx="16.5" cy="17.5" r="1.5" fill="currentColor" /></>}
          {type === "campeggio" && <><path d="M19 20L12 4 5 20h14z" fill="currentColor" fillOpacity="0.25" /><path d="M12 4v16" /></>}
          {type === "parcheggio" && <><path d="M9 17V7h5a3.5 3.5 0 0 1 0 7H9" /><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" fillOpacity="0.15" /></>}
          {type === "service" && <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />}
        </svg>
    ),
    svgHtml: `
        <svg class="w-5 h-5 text-white drop-shadow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${type === "sosta" ? '<path d="M3 17h18" /><path d="M4 17V8a2 2 0 0 1 2-2h9l4 4v7" fill="currentColor" fill-opacity="0.2" /><circle cx="7.5" cy="17.5" r="1.5" fill="currentColor" /><circle cx="16.5" cy="17.5" r="1.5" fill="currentColor" />' : ''}
          ${type === "campeggio" ? '<path d="M19 20L12 4 5 20h14z" fill="currentColor" fill-opacity="0.25" /><path d="M12 4v16" />' : ''}
          ${type === "parcheggio" ? '<path d="M9 17V7h5a3.5 3.5 0 0 1 0 7H9" /><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" fill-opacity="0.15" />' : ''}
          ${type === "service" ? '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />' : ''}
        </svg>`
  };
}


export interface MapPoiIconProps {
  category: string;
  isViolation?: boolean;
  isSelected?: boolean;
}

/**
 * React Marker Component for Google Maps / React Leaflet
 */
export const MapPoiIcon: React.FC<MapPoiIconProps> = ({
  category,
  isViolation = false,
  isSelected = false,
}) => {
  const details = getPoiCategoryDetails(category, isViolation);

  return (
    <div className={`relative group cursor-pointer flex flex-col items-center select-none transition-transform duration-200 hover:scale-110 ${isSelected ? "scale-110 z-50" : ""}`}>
      {/* Outer badge */}
      <div
        className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${details.bgGradient} border-2 ${details.borderBg} flex items-center justify-center text-white shadow-lg relative ${
          isViolation ? "ring-4 ring-rose-500 animate-pulse" : ""
        }`}
        style={{
          boxShadow: `0 4px 12px ${details.glowColor}`,
        }}
      >
        {details.svgPath}
        {isViolation && (
          <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center border-2 border-white font-extrabold shadow-md">
            ⚠️
          </span>
        )}
      </div>
      {/* Teardrop Tip */}
      <div
        className={`w-2.5 h-2.5 bg-gradient-to-br ${details.bgGradient} border-r-2 border-b-2 ${details.borderBg} rotate-45 -mt-1.5 shadow-sm`}
      ></div>
    </div>
  );
};

/**
 * Leaflet L.divIcon HTML string generator
 */
export function getMapPoiIconHtml(category: string, isViolation: boolean = false): { html: string; iconSize: [number, number]; iconAnchor: [number, number] } {
  const details = getPoiCategoryDetails(category, isViolation);

  const html = `
    <div class="relative group cursor-pointer flex flex-col items-center select-none transition-transform duration-200 hover:scale-110">
      <div 
        class="w-9 h-9 rounded-2xl bg-gradient-to-br ${details.bgGradient} border-2 ${details.borderBg} flex items-center justify-center text-white shadow-lg relative ${isViolation ? 'ring-4 ring-rose-500 animate-pulse' : ''}"
        style="box-shadow: 0 4px 12px ${details.glowColor};"
      >
        ${details.svgHtml}
        ${isViolation ? '<span class="absolute -top-1.5 -right-1.5 text-[9px] bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center border-2 border-white font-extrabold shadow-md">⚠️</span>' : ''}
      </div>
      <div class="w-2.5 h-2.5 bg-gradient-to-br ${details.bgGradient} border-r-2 border-b-2 ${details.borderBg} rotate-45 -mt-1.5 shadow-sm"></div>
    </div>
  `;

  return {
    html,
    iconSize: [36, 42],
    iconAnchor: [18, 42],
  };
}
