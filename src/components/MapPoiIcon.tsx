import React from "react";

export type PoiCategoryType = "sosta" | "campeggio" | "parcheggio" | "service" | "natura" | "poi";

export interface PoiCategoryDetails {
  type: PoiCategoryType;
  label: string;
  bgGradient: string;
  gradientColors: [string, string];
  borderBg: string;
  glowColor: string;
  bgHex: string;
  svgPath: React.ReactNode;
  svgHtml: string;
  fullSvgHtml: string;
}

/**
 * Returns precise category configuration, styling and vector glyphs
 * inspired by the premier camper platforms (CamperOnLine, Park4Night, StayFree, CamperLife).
 */
export function getPoiCategoryDetails(
  category: string,
  isViolation: boolean = false,
  feeStatus?: 'free' | 'paid' | 'unknown'
): PoiCategoryDetails {
  if (isViolation) {
    const gradientColors: [string, string] = ["#DC2626", "#991B1B"];
    const bgHex = "#DC2626";
    const glowColor = "rgba(220, 38, 38, 0.65)";
    const svgHtml = `
      <g transform="translate(19, 16.5)">
        <path d="M -8.5 6.5 L 0 -8 L 8.5 6.5 Z" fill="#FFFFFF" />
        <path d="M -6.8 5.5 L 0 -6.5 L 6.8 5.5 Z" fill="#DC2626" />
        <line x1="0" y1="-2.5" x2="0" y2="1.5" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" />
        <circle cx="0" cy="3.6" r="1" fill="#FFFFFF" />
      </g>`;
    const fullSvgHtml = generatePinSvgString("violation", gradientColors, svgHtml, true);

    return {
      type: "poi",
      label: "Soglia Altezza Superata",
      bgGradient: "from-red-600 via-rose-600 to-red-700",
      gradientColors,
      borderBg: "border-red-300",
      glowColor,
      bgHex,
      svgPath: (
        <g transform="translate(19, 16.5)">
          <path d="M -8.5 6.5 L 0 -8 L 8.5 6.5 Z" fill="#FFFFFF" />
          <path d="M -6.8 5.5 L 0 -6.5 L 6.8 5.5 Z" fill="#DC2626" />
          <line x1="0" y1="-2.5" x2="0" y2="1.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="0" cy="3.6" r="1" fill="#FFFFFF" />
        </g>
      ),
      svgHtml,
      fullSvgHtml,
    };
  }

  const normCat = (category || "").toLowerCase();

  let type: PoiCategoryType = "sosta";
  let label = "Area Sosta Camper";
  let gradientColors: [string, string] = ["#0EA5E9", "#0284C7"]; // Celeste luminoso per Area Sosta
  let bgGradient = "from-sky-500 to-sky-700";
  let borderBg = "border-sky-200/90";
  let glowColor = "rgba(14, 165, 233, 0.45)";
  let bgHex = "#0EA5E9";

  if (normCat.includes("gem") || normCat.includes("natura") || normCat.includes("libera") || normCat.includes("wild")) {
    type = "natura";
    label = "Spot Natura / Sosta Libera";
    gradientColors = ["#047857", "#064E3B"];
    bgGradient = "from-emerald-700 to-emerald-900";
    borderBg = "border-emerald-200/90";
    glowColor = "rgba(4, 120, 87, 0.45)";
    bgHex = "#047857";
  } else if (normCat.includes("campeggio") || normCat.includes("camping") || normCat.includes("camp_site")) {
    type = "campeggio";
    label = "Campeggio";
    gradientColors = ["#1C3D2B", "#14291E"];
    bgGradient = "from-[#1C3D2B] to-[#14291E]";
    borderBg = "border-emerald-200/90";
    glowColor = "rgba(28, 61, 43, 0.45)";
    bgHex = "#1C3D2B";
  } else if (normCat.includes("parcheggio") || normCat.includes("parking")) {
    type = "parcheggio";
    label = "Parcheggio Camper";
    if (feeStatus === "paid") {
      gradientColors = ["#D97706", "#B45309"];
      bgGradient = "from-amber-600 to-amber-700";
      borderBg = "border-amber-200/90";
      glowColor = "rgba(217, 119, 6, 0.45)";
      bgHex = "#D97706";
    } else {
      // Blu profondo stile cartello autostradale (netto contrasto con il celeste dell'area sosta)
      gradientColors = ["#1D4ED8", "#1E3A8A"];
      bgGradient = "from-blue-700 to-blue-900";
      borderBg = "border-blue-300/90";
      glowColor = "rgba(29, 78, 216, 0.45)";
      bgHex = "#1D4ED8";
    }
  } else if (
    normCat.includes("service") ||
    normCat.includes("scarico") ||
    normCat.includes("sanitary") ||
    normCat.includes("dump") ||
    normCat.includes("acqua")
  ) {
    type = "service";
    label = "Camper Service";
    // Viola / Indaco per camper service (standard Park4Night e CamperOnLine)
    gradientColors = ["#7C3AED", "#5B21B6"];
    bgGradient = "from-violet-600 to-purple-800";
    borderBg = "border-purple-200/90";
    glowColor = "rgba(124, 58, 237, 0.45)";
    bgHex = "#7C3AED";
  } else {
    // Area Sosta
    type = "sosta";
    label = "Area Sosta Camper";
    if (feeStatus === "free") {
      gradientColors = ["#059669", "#047857"];
      bgGradient = "from-emerald-600 to-emerald-700";
      borderBg = "border-emerald-200/90";
      glowColor = "rgba(5, 150, 105, 0.45)";
      bgHex = "#059669";
    } else if (feeStatus === "paid") {
      gradientColors = ["#D97706", "#B45309"];
      bgGradient = "from-amber-600 to-amber-700";
      borderBg = "border-amber-200/90";
      glowColor = "rgba(217, 119, 6, 0.45)";
      bgHex = "#D97706";
    } else {
      // Celeste cielo brillante per le Aree Sosta Camper (distinguibile al 100%)
      gradientColors = ["#0EA5E9", "#0284C7"];
      bgGradient = "from-sky-500 to-sky-700";
      borderBg = "border-sky-200/90";
      glowColor = "rgba(14, 165, 233, 0.45)";
      bgHex = "#0EA5E9";
    }
  }

  // Generate vector glyph based on category
  const { svgHtml, svgPath } = getGlyphForCategory(type);
  const fullSvgHtml = generatePinSvgString(type + (feeStatus || ""), gradientColors, svgHtml, false);

  return {
    type,
    label,
    bgGradient,
    gradientColors,
    borderBg,
    glowColor,
    bgHex,
    svgPath,
    svgHtml,
    fullSvgHtml,
  };
}

/**
 * Returns distinct, high-contrast SVG glyphs matching top camper apps:
 * - sosta: Authentic European Mansardato camper profile
 * - parcheggio: Bold highway standard P
 * - campeggio: Canadian ridge camping tent with opening & guy lines
 * - service: Official camper service tap + water droplet + discharge grille
 * - natura: Symmetrical alpine evergreen pine tree (Abete)
 */
function getGlyphForCategory(type: PoiCategoryType): { svgHtml: string; svgPath: React.ReactNode } {
  switch (type) {
    case "sosta": {
      const svgHtml = `
        <g transform="translate(19, 16.5)">
          <!-- Mansardato Camper Body -->
          <path d="M -9.5 -3.2 C -9.5 -5.4 -8.5 -6.6 -6.5 -6.6 L 3.5 -6.6 C 5 -6.6 6.5 -5.8 7.5 -4.5 C 8.2 -3.5 8 -2.4 6.8 -2 L 5.5 -1.7 L 8 1.6 C 8.6 2.3 9.2 2.6 10 2.6 L 10.5 2.6 C 11 2.6 11.5 3 11.5 3.7 L 11.5 4.8 L 9.5 4.8 A 2.5 2.5 0 0 0 4.5 4.8 L -3 4.8 A 2.5 2.5 0 0 0 -8 4.8 L -9.5 4.8 Z" fill="#FFFFFF" />
          <!-- Cab Window -->
          <path d="M 4.8 -1.2 L 7.2 1.4 C 7.4 1.7 7.2 2.1 6.8 2.1 L 3.8 2.1 L 3.8 -1.2 Z" fill="#0f172a" fill-opacity="0.8" />
          <!-- Living Area Window -->
          <rect x="-6.5" y="-4.6" width="5.2" height="3.8" rx="0.8" fill="#0f172a" fill-opacity="0.8" />
          <!-- Habitation Door Seam -->
          <line x1="0.6" y1="-4.6" x2="0.6" y2="4.2" stroke="#0f172a" stroke-width="0.7" stroke-opacity="0.3" />
          <!-- Wheels -->
          <circle cx="7" cy="4.8" r="2.2" fill="#0f172a" stroke="#FFFFFF" stroke-width="0.8" />
          <circle cx="7" cy="4.8" r="0.8" fill="#FFFFFF" />
          <circle cx="-5.5" cy="4.8" r="2.2" fill="#0f172a" stroke="#FFFFFF" stroke-width="0.8" />
          <circle cx="-5.5" cy="4.8" r="0.8" fill="#FFFFFF" />
        </g>
      `;
      const svgPath = (
        <g transform="translate(19, 16.5)">
          <path d="M -9.5 -3.2 C -9.5 -5.4 -8.5 -6.6 -6.5 -6.6 L 3.5 -6.6 C 5 -6.6 6.5 -5.8 7.5 -4.5 C 8.2 -3.5 8 -2.4 6.8 -2 L 5.5 -1.7 L 8 1.6 C 8.6 2.3 9.2 2.6 10 2.6 L 10.5 2.6 C 11 2.6 11.5 3 11.5 3.7 L 11.5 4.8 L 9.5 4.8 A 2.5 2.5 0 0 0 4.5 4.8 L -3 4.8 A 2.5 2.5 0 0 0 -8 4.8 L -9.5 4.8 Z" fill="#FFFFFF" />
          <path d="M 4.8 -1.2 L 7.2 1.4 C 7.4 1.7 7.2 2.1 6.8 2.1 L 3.8 2.1 L 3.8 -1.2 Z" fill="#0f172a" fillOpacity={0.8} />
          <rect x="-6.5" y="-4.6" width="5.2" height="3.8" rx="0.8" fill="#0f172a" fillOpacity={0.8} />
          <line x1="0.6" y1="-4.6" x2="0.6" y2="4.2" stroke="#0f172a" strokeWidth="0.7" strokeOpacity={0.3} />
          <circle cx="7" cy="4.8" r="2.2" fill="#0f172a" stroke="#FFFFFF" strokeWidth="0.8" />
          <circle cx="7" cy="4.8" r="0.8" fill="#FFFFFF" />
          <circle cx="-5.5" cy="4.8" r="2.2" fill="#0f172a" stroke="#FFFFFF" strokeWidth="0.8" />
          <circle cx="-5.5" cy="4.8" r="0.8" fill="#FFFFFF" />
        </g>
      );
      return { svgHtml, svgPath };
    }

    case "parcheggio": {
      const svgHtml = `
        <g transform="translate(19, 16.5)">
          <path d="M -5.2 -7 H 0.8 C 3.8 -7 6.2 -4.8 6.2 -1.9 C 6.2 1.1 3.8 3.3 0.8 3.3 H -1.8 V 7.5 H -5.2 Z M -1.8 -3.8 V 0.1 H 0.5 C 1.7 0.1 2.7 -0.7 2.7 -1.9 C 2.7 -3.1 1.7 -3.8 0.5 -3.8 Z" fill="#FFFFFF" fill-rule="evenodd" />
        </g>
      `;
      const svgPath = (
        <g transform="translate(19, 16.5)">
          <path d="M -5.2 -7 H 0.8 C 3.8 -7 6.2 -4.8 6.2 -1.9 C 6.2 1.1 3.8 3.3 0.8 3.3 H -1.8 V 7.5 H -5.2 Z M -1.8 -3.8 V 0.1 H 0.5 C 1.7 0.1 2.7 -0.7 2.7 -1.9 C 2.7 -3.1 1.7 -3.8 0.5 -3.8 Z" fill="#FFFFFF" fillRule="evenodd" />
        </g>
      );
      return { svgHtml, svgPath };
    }

    case "campeggio": {
      const svgHtml = `
        <g transform="translate(19, 16.5)">
          <path d="M 0 -8 L 10 7 L 7.5 7 L 0 -3 L -7.5 7 L -10 7 Z" fill="#FFFFFF" />
          <path d="M 0 -3 L 5 7 L -5 7 Z" fill="#0f172a" fill-opacity="0.65" />
          <line x1="0" y1="-8" x2="0" y2="7" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" />
          <line x1="-10" y1="7" x2="-12" y2="8.5" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" />
          <line x1="10" y1="7" x2="12" y2="8.5" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" />
          <path d="M 0 -8 L 2.5 -9.5 L 0 -11 Z" fill="#FFFFFF" />
        </g>
      `;
      const svgPath = (
        <g transform="translate(19, 16.5)">
          <path d="M 0 -8 L 10 7 L 7.5 7 L 0 -3 L -7.5 7 L -10 7 Z" fill="#FFFFFF" />
          <path d="M 0 -3 L 5 7 L -5 7 Z" fill="#0f172a" fillOpacity={0.65} />
          <line x1="0" y1="-8" x2="0" y2="7" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="-10" y1="7" x2="-12" y2="8.5" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="10" y1="7" x2="12" y2="8.5" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M 0 -8 L 2.5 -9.5 L 0 -11 Z" fill="#FFFFFF" />
        </g>
      );
      return { svgHtml, svgPath };
    }

    case "service": {
      const svgHtml = `
        <g transform="translate(19, 16.5)">
          <path d="M -8 -1.5 L -8 -5 C -8 -6.4 -6.9 -7.5 -5.5 -7.5 L -1.5 -7.5 C -0.1 -7.5 1 -6.4 1 -5 L 1 -3 L -1 -3 L -1 -5 C -1 -5.3 -1.2 -5.5 -1.5 -5.5 L -5.5 -5.5 C -5.8 -5.5 -6 -5.3 -6 -5 L -6 -1.5 Z" fill="#FFFFFF" />
          <rect x="-4.5" y="-9.5" width="5" height="1.8" rx="0.9" fill="#FFFFFF" />
          <path d="M 0.5 -1.5 C 0.5 -1.5 3.5 2 3.5 3.8 C 3.5 5.5 2.1 6.8 0.5 6.8 C -1.1 6.8 -2.5 5.5 -2.5 3.8 C -2.5 2 0.5 -1.5 0.5 -1.5 Z" fill="#FFFFFF" />
          <line x1="-7" y1="5.5" x2="-3.5" y2="5.5" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" />
          <line x1="-7" y1="7.5" x2="-3.5" y2="7.5" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" />
          <line x1="4.5" y1="5.5" x2="8" y2="5.5" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" />
          <line x1="4.5" y1="7.5" x2="8" y2="7.5" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" />
        </g>
      `;
      const svgPath = (
        <g transform="translate(19, 16.5)">
          <path d="M -8 -1.5 L -8 -5 C -8 -6.4 -6.9 -7.5 -5.5 -7.5 L -1.5 -7.5 C -0.1 -7.5 1 -6.4 1 -5 L 1 -3 L -1 -3 L -1 -5 C -1 -5.3 -1.2 -5.5 -1.5 -5.5 L -5.5 -5.5 C -5.8 -5.5 -6 -5.3 -6 -5 L -6 -1.5 Z" fill="#FFFFFF" />
          <rect x="-4.5" y="-9.5" width="5" height="1.8" rx="0.9" fill="#FFFFFF" />
          <path d="M 0.5 -1.5 C 0.5 -1.5 3.5 2 3.5 3.8 C 3.5 5.5 2.1 6.8 0.5 6.8 C -1.1 6.8 -2.5 5.5 -2.5 3.8 C -2.5 2 0.5 -1.5 0.5 -1.5 Z" fill="#FFFFFF" />
          <line x1="-7" y1="5.5" x2="-3.5" y2="5.5" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="-7" y1="7.5" x2="-3.5" y2="7.5" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="4.5" y1="5.5" x2="8" y2="5.5" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="4.5" y1="7.5" x2="8" y2="7.5" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      );
      return { svgHtml, svgPath };
    }

    case "natura": {
      const svgHtml = `
        <g transform="translate(19, 16.5)">
          <path d="M 0 -8.5 L 3.8 -4 L 2.2 -4 L 5.8 0.8 L 3.8 0.8 L 7.8 5.6 L -7.8 5.6 L -3.8 0.8 L -5.8 0.8 L -2.2 -4 L -3.8 -4 Z" fill="#FFFFFF" />
          <rect x="-1.2" y="5.6" width="2.4" height="2.8" rx="0.5" fill="#FFFFFF" />
        </g>
      `;
      const svgPath = (
        <g transform="translate(19, 16.5)">
          <path d="M 0 -8.5 L 3.8 -4 L 2.2 -4 L 5.8 0.8 L 3.8 0.8 L 7.8 5.6 L -7.8 5.6 L -3.8 0.8 L -5.8 0.8 L -2.2 -4 L -3.8 -4 Z" fill="#FFFFFF" />
          <rect x="-1.2" y="5.6" width="2.4" height="2.8" rx="0.5" fill="#FFFFFF" />
        </g>
      );
      return { svgHtml, svgPath };
    }

    default: {
      return getGlyphForCategory("sosta");
    }
  }
}

/**
 * Generates an SVG string for a teardrop map pin with white border and crisp drop shadow.
 */
function generatePinSvgString(
  id: string,
  gradientColors: [string, string],
  innerGlyphHtml: string,
  isViolation: boolean = false
): string {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  return `
    <svg class="map-pin-svg" viewBox="0 0 38 44" width="38" height="44" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; overflow: visible;">
      <defs>
        <linearGradient id="pin-grad-${safeId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${gradientColors[0]}" />
          <stop offset="100%" stop-color="${gradientColors[1]}" />
        </linearGradient>
      </defs>
      <!-- Teardrop Pin Silhouette -->
      <path d="M 19 43 C 17.2 40 5.5 26.5 5.5 17 A 13.5 13.5 0 1 1 32.5 17 C 32.5 26.5 20.8 40 19 43 Z"
            fill="url(#pin-grad-${safeId})"
            stroke="#FFFFFF"
            stroke-width="2.4"
            stroke-linejoin="round" />
      <!-- Inner Glyph -->
      ${innerGlyphHtml}
      <!-- Optional Warning Badge -->
      ${
        isViolation
          ? `
        <g transform="translate(26, 6)">
          <circle cx="0" cy="0" r="5" fill="#EF4444" stroke="#FFFFFF" stroke-width="1.5" />
          <text x="0" y="2.5" font-size="7" font-weight="900" text-anchor="middle" fill="#FFFFFF">!</text>
        </g>
      `
          : ""
      }
    </svg>
  `;
}

export interface MapPoiIconProps {
  category: string;
  isViolation?: boolean;
  isSelected?: boolean;
  feeStatus?: 'free' | 'paid' | 'unknown';
}

/**
 * React Marker Component for Google Maps AdvancedMarker
 */
export const MapPoiIcon: React.FC<MapPoiIconProps> = ({
  category,
  isViolation = false,
  isSelected = false,
  feeStatus,
}) => {
  const details = getPoiCategoryDetails(category, isViolation, feeStatus);
  const gradId = React.useId().replace(/:/g, "_");

  return (
    <div
      className={`relative cursor-pointer select-none transition-transform duration-200 custom-map-pin ${
        isSelected ? "scale-115 z-50" : "hover:scale-115"
      }`}
      style={{
        width: 38,
        height: 44,
        transformOrigin: "19px 43px",
        filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.35))",
      }}
    >
      <svg
        className="w-[38px] h-[44px]"
        viewBox="0 0 38 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`pin-grad-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={details.gradientColors[0]} />
            <stop offset="100%" stopColor={details.gradientColors[1]} />
          </linearGradient>
        </defs>

        {/* Outer Teardrop Pin Body */}
        <path
          d="M 19 43 C 17.2 40 5.5 26.5 5.5 17 A 13.5 13.5 0 1 1 32.5 17 C 32.5 26.5 20.8 40 19 43 Z"
          fill={`url(#pin-grad-${gradId})`}
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />

        {/* Pictogram */}
        {details.svgPath}

        {/* Violation Warning Badge */}
        {isViolation && (
          <g transform="translate(26, 6)">
            <circle cx="0" cy="0" r="5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5" />
            <text x="0" y="2.5" fontSize="7" fontWeight="900" textAnchor="middle" fill="#FFFFFF">
              !
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

/**
 * Leaflet L.divIcon HTML string generator
 */
export function getMapPoiIconHtml(
  category: string,
  isViolation: boolean = false,
  feeStatus?: 'free' | 'paid' | 'unknown'
): { html: string; iconSize: [number, number]; iconAnchor: [number, number] } {
  const details = getPoiCategoryDetails(category, isViolation, feeStatus);

  const html = `
    <div class="custom-map-pin" style="width: 38px; height: 44px; cursor: pointer; transform-origin: 19px 43px;">
      ${details.fullSvgHtml}
    </div>
  `;

  return {
    html,
    iconSize: [38, 44],
    iconAnchor: [19, 43],
  };
}

/**
 * Mini vector map pin for filter buttons, lists, badges, and cards
 * Uses the exact same teardrop pin shape, outline, gradient, and vector glyph as the map markers.
 */
export const MapCategoryPinMini: React.FC<{
  category: string;
  className?: string;
  size?: number; // width in px, default 18
  feeStatus?: 'free' | 'paid' | 'unknown';
  showShadow?: boolean;
}> = ({ category, className = "", size = 18, feeStatus, showShadow = true }) => {
  const details = getPoiCategoryDetails(category, false, feeStatus);
  const gradId = React.useId().replace(/:/g, "_");
  const height = Math.round((size * 44) / 38);

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{
        width: size,
        height,
        filter: showShadow ? "drop-shadow(0 1.5px 2px rgba(0,0,0,0.25))" : undefined,
      }}
      title={details.label}
    >
      <svg
        width={size}
        height={height}
        viewBox="0 0 38 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`mini-pin-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={details.gradientColors[0]} />
            <stop offset="100%" stopColor={details.gradientColors[1]} />
          </linearGradient>
        </defs>
        <path
          d="M 19 43 C 17.2 40 5.5 26.5 5.5 17 A 13.5 13.5 0 1 1 32.5 17 C 32.5 26.5 20.8 40 19 43 Z"
          fill={`url(#mini-pin-${gradId})`}
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        {details.svgPath}
      </svg>
    </div>
  );
};

/**
 * Compact Category Badge containing the mini map pin and category name
 */
export const MapCategoryBadge: React.FC<{
  category: string;
  feeStatus?: 'free' | 'paid' | 'unknown';
  className?: string;
  pinSize?: number;
}> = ({ category, feeStatus, className = "", pinSize = 15 }) => {
  const details = getPoiCategoryDetails(category, false, feeStatus);

  let badgeStyle = "bg-sky-50 text-sky-950 border-sky-200";
  if (details.type === "parcheggio") {
    badgeStyle = "bg-blue-50 text-blue-950 border-blue-200";
  } else if (details.type === "campeggio") {
    badgeStyle = "bg-[#1C3D2B]/10 text-[#1C3D2B] border-[#1C3D2B]/25";
  } else if (details.type === "service") {
    badgeStyle = "bg-purple-50 text-purple-950 border-purple-200";
  } else if (details.type === "natura") {
    badgeStyle = "bg-emerald-50 text-emerald-950 border-emerald-200";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9.5px] font-black tracking-wide border shadow-2xs ${badgeStyle} ${className}`}
    >
      <MapCategoryPinMini category={category} size={pinSize} feeStatus={feeStatus} />
      <span>{details.label}</span>
    </span>
  );
};

