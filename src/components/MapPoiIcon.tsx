import React from "react";
import { CamperServiceSubtype } from "../types";
import { resolvePlaceServiceSubtype } from "../utils/placeCategoryHelper";

export type PoiCategoryType =
  | "sosta"
  | "agricampeggio"
  | "campeggio"
  | "parcheggio_gratuito"
  | "parcheggio_pagamento"
  | "parcheggio_diurno"
  | "parcheggio"
  | "service"
  | "carico_scarico"
  | "fontanella"
  | "lavanderia"
  | "solo_scarico"
  | "natura"
  | "poi";

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
 * inspired by premier camper platforms (CamperOnLine, Park4Night, StayFree, CamperLife).
 */
export function getPoiCategoryDetails(
  category: string,
  isViolation: boolean = false,
  feeStatus?: 'free' | 'paid' | 'unknown',
  serviceSubtype?: CamperServiceSubtype,
  categoryLabel?: string,
  name?: string
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
          <line x1="0" y1="-2.5" x2="0" y2="1.5" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" />
          <circle cx="0" cy="3.6" r="1" fill="#FFFFFF" />
        </g>
      ),
      svgHtml,
      fullSvgHtml,
    };
  }

  const normCat = (category || "").toLowerCase().trim();
  const normLabel = (categoryLabel || "").toLowerCase().trim();
  const normName = (name || "").toLowerCase().trim();

  let type: PoiCategoryType = "sosta";
  let label = "Area Sosta Camper";
  let gradientColors: [string, string] = ["#0EA5E9", "#0284C7"]; // Celeste luminoso per Area Sosta
  let bgGradient = "from-sky-500 to-sky-700";
  let borderBg = "border-sky-200/90";
  let glowColor = "rgba(14, 165, 233, 0.45)";
  let bgHex = "#0EA5E9";

  // 1. Area Sosta Camper (Check explicit category first)
  if (
    normCat === "area_sosta" ||
    normLabel === "area sosta" ||
    normLabel === "area sosta camper" ||
    normLabel === "area camper"
  ) {
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
      gradientColors = ["#0EA5E9", "#0284C7"];
      bgGradient = "from-sky-500 to-sky-700";
      borderBg = "border-sky-200/90";
      glowColor = "rgba(14, 165, 233, 0.45)";
      bgHex = "#0EA5E9";
    }
  }
  // 2. Agricampeggio & Agriturismo
  else if (
    normCat === "agricampeggio" ||
    normLabel.includes("agricamp") ||
    normLabel.includes("agritur") ||
    normLabel.includes("agricamper")
  ) {
    type = "agricampeggio";
    label = "Agricampeggio";
    gradientColors = ["#65A30D", "#65A30D"]; // Verde oliva scuro solid
    bgGradient = "bg-lime-700";
    borderBg = "border-lime-900/20";
    glowColor = "rgba(101, 163, 13, 0.45)";
    bgHex = "#65A30D";
  }
  // 3. Campeggio
  else if (
    normCat === "campeggio" ||
    normCat === "camping" ||
    normLabel.includes("campeggio") ||
    normLabel.includes("camping")
  ) {
    type = "campeggio";
    label = "Campeggio";
    gradientColors = ["#166534", "#14532D"]; // Verde Bosco Scuro
    bgGradient = "from-emerald-800 to-emerald-950";
    borderBg = "border-emerald-200/90";
    glowColor = "rgba(22, 101, 52, 0.45)";
    bgHex = "#166534";
  }
  // 4. Parcheggio Solo Giorno
  else if (
    normCat === "parcheggio_diurno" ||
    normLabel.includes("solo giorno") ||
    normLabel.includes("diurno")
  ) {
    type = "parcheggio_diurno";
    label = "Parcheggio Solo Giorno";
    gradientColors = ["#CA8A04", "#CA8A04"]; // Giallo scuro solid
    bgGradient = "bg-amber-600";
    borderBg = "border-amber-900/20";
    glowColor = "rgba(202, 138, 4, 0.45)";
    bgHex = "#CA8A04";
  }
  // 5. Parcheggio a Pagamento
  else if (
    normCat === "parcheggio_pagamento" ||
    normLabel.includes("parcheggio a pagamento") ||
    normLabel.includes("ticket") ||
    ((normCat.includes("parcheggio") || normCat.includes("parking")) && feeStatus === "paid")
  ) {
    type = "parcheggio_pagamento";
    label = "Parcheggio a Pagamento";
    gradientColors = ["#B91C1C", "#B91C1C"]; // Rosso scuro solid
    bgGradient = "bg-red-700";
    borderBg = "border-red-900/20";
    glowColor = "rgba(185, 28, 28, 0.45)";
    bgHex = "#B91C1C";
  }
  // 6. Parcheggio Gratuito
  else if (
    normCat === "parcheggio_gratuito" ||
    normCat === "parcheggio_camper" ||
    normCat === "parcheggio" ||
    normLabel.includes("parcheggio free") ||
    normLabel.includes("parcheggio gratuito")
  ) {
    type = "parcheggio_gratuito";
    label = "Parcheggio Free";
    gradientColors = ["#1D4ED8", "#1D4ED8"]; // Blu scuro solid
    bgGradient = "bg-blue-700";
    borderBg = "border-blue-900/20";
    glowColor = "rgba(29, 78, 216, 0.45)";
    bgHex = "#1D4ED8";
  }
  // 7. Fontanella / Solo carico acqua
  else if (
    normCat === "fontanella" ||
    serviceSubtype === "fontanella" ||
    normLabel.includes("fontanella") ||
    normLabel.includes("acqua potabile")
  ) {
    type = "fontanella";
    label = "Fontanella Acqua Potabile";
    gradientColors = ["#0284C7", "#0369A1"]; // Azzurro Acqua brillante
    bgGradient = "from-sky-600 to-cyan-700";
    borderBg = "border-cyan-200/90";
    glowColor = "rgba(2, 132, 199, 0.45)";
    bgHex = "#0284C7";
  }
  // 8. Solo Scarico Reflui
  else if (
    normCat === "solo_scarico" ||
    serviceSubtype === "solo_scarico" ||
    normLabel.includes("solo scarico")
  ) {
    type = "solo_scarico";
    label = "Solo Scarico Reflui";
    gradientColors = ["#27272A", "#09090B"]; // Nero / Antracite Profondo
    bgGradient = "from-zinc-800 to-zinc-950";
    borderBg = "border-zinc-500/90";
    glowColor = "rgba(24, 24, 27, 0.65)";
    bgHex = "#18181B";
  }
  // 9. Lavanderia Self-Service
  else if (
    normCat === "lavanderia" ||
    serviceSubtype === "lavanderia" ||
    normLabel.includes("lavand")
  ) {
    type = "lavanderia";
    label = "Lavanderia Self-Service";
    gradientColors = ["#D946EF", "#9333EA"]; // Fuchsia / Magenta
    bgGradient = "from-fuchsia-500 to-purple-700";
    borderBg = "border-fuchsia-200/90";
    glowColor = "rgba(217, 70, 239, 0.45)";
    bgHex = "#D946EF";
  }
  // 10. C/S Completo
  else if (
    normCat === "carico_scarico" ||
    serviceSubtype === "carico_scarico" ||
    normLabel.includes("c/s completo") ||
    normLabel.includes("carico e scarico") ||
    normLabel.includes("carico/scarico")
  ) {
    type = "carico_scarico";
    label = "C/S Completo";
    gradientColors = ["#7C3AED", "#5B21B6"]; // Viola / Indaco Profondo
    bgGradient = "from-violet-600 to-purple-800";
    borderBg = "border-purple-200/90";
    glowColor = "rgba(124, 58, 237, 0.45)";
    bgHex = "#7C3AED";
  }
  // 11. Camper Service generico
  else if (
    normCat === "camper_service" ||
    normCat === "service" ||
    normLabel.includes("service")
  ) {
    type = "service";
    label = "Camper Service";
    gradientColors = ["#0891B2", "#0E7490"]; // Teal / Ciano Scuro per distinguerlo da C/S Completo
    bgGradient = "from-cyan-600 to-teal-800";
    borderBg = "border-cyan-200/90";
    glowColor = "rgba(8, 145, 178, 0.45)";
    bgHex = "#0891B2";
  }
  // 12. Spot Natura / Hidden Gem
  else if (
    normCat.includes("gem") ||
    normCat.includes("natura") ||
    normCat.includes("libera") ||
    normCat.includes("wild")
  ) {
    type = "natura";
    label = "Spot Natura / Sosta Libera";
    gradientColors = ["#047857", "#064E3B"];
    bgGradient = "from-emerald-700 to-emerald-900";
    borderBg = "border-emerald-200/90";
    glowColor = "rgba(4, 120, 87, 0.45)";
    bgHex = "#047857";
  }
  // 13. Fallback name-based matching ONLY when category is empty or undefined
  else {
    const resolvedSubtype =
      serviceSubtype ||
      resolvePlaceServiceSubtype({
        category,
        serviceSubtype,
        categoryLabel,
        name,
      });

    if (
      resolvedSubtype === "fontanella" ||
      normName.includes("fontanella") ||
      normName.includes("fontana pubblica") ||
      normName.includes("punto acqua potabile")
    ) {
      type = "fontanella";
      label = "Fontanella Acqua Potabile";
      gradientColors = ["#0284C7", "#0369A1"];
      bgGradient = "from-sky-600 to-cyan-700";
      borderBg = "border-cyan-200/90";
      glowColor = "rgba(2, 132, 199, 0.45)";
      bgHex = "#0284C7";
    } else if (
      resolvedSubtype === "solo_scarico" ||
      normName.includes("solo scarico") ||
      normName.includes("pozzetto scarico")
    ) {
      type = "solo_scarico";
      label = "Solo Scarico Reflui";
      gradientColors = ["#27272A", "#09090B"];
      bgGradient = "from-zinc-800 to-zinc-950";
      borderBg = "border-zinc-500/90";
      glowColor = "rgba(24, 24, 27, 0.65)";
      bgHex = "#18181B";
    } else if (
      resolvedSubtype === "lavanderia" ||
      normName.includes("lavanderia") ||
      normName.includes("laundromat") ||
      normName.includes("speed queen")
    ) {
      type = "lavanderia";
      label = "Lavanderia Self-Service";
      gradientColors = ["#D946EF", "#9333EA"];
      bgGradient = "from-fuchsia-500 to-purple-700";
      borderBg = "border-fuchsia-200/90";
      glowColor = "rgba(217, 70, 239, 0.45)";
      bgHex = "#D946EF";
    } else if (
      normName.includes("agricamp") ||
      normName.includes("agrituris") ||
      normName.includes("azienda agricola") ||
      normName.includes("fattoria didattica")
    ) {
      type = "agricampeggio";
      label = "Agricampeggio";
      gradientColors = ["#84CC16", "#65A30D"];
      bgGradient = "from-lime-500 to-lime-700";
      borderBg = "border-lime-200/90";
      glowColor = "rgba(132, 204, 22, 0.45)";
      bgHex = "#84CC16";
    } else if (
      normName.includes("camping ") ||
      normName.startsWith("camping") ||
      normName.includes("campeggio ") ||
      normName.startsWith("campeggio")
    ) {
      type = "campeggio";
      label = "Campeggio";
      gradientColors = ["#166534", "#14532D"];
      bgGradient = "from-emerald-800 to-emerald-950";
      borderBg = "border-emerald-200/90";
      glowColor = "rgba(22, 101, 52, 0.45)";
      bgHex = "#166534";
    } else if (
      normName.includes("solo giorno") ||
      normName.includes("solo diurno") ||
      normName.includes("sosta diurna") ||
      normName.includes("parking jour")
    ) {
      type = "parcheggio_diurno";
      label = "Parcheggio Solo Giorno";
      gradientColors = ["#EAB308", "#CA8A04"];
      bgGradient = "from-yellow-500 to-amber-600";
      borderBg = "border-yellow-200/90";
      glowColor = "rgba(234, 179, 8, 0.45)";
      bgHex = "#EAB308";
    } else if (
      normName.includes("pagamento") ||
      normName.includes("parcometro") ||
      normName.includes("ticket") ||
      feeStatus === "paid"
    ) {
      type = "parcheggio_pagamento";
      label = "Parcheggio a Pagamento";
      gradientColors = ["#EF4444", "#DC2626"];
      bgGradient = "from-red-500 to-red-700";
      borderBg = "border-red-200/90";
      glowColor = "rgba(239, 68, 68, 0.45)";
      bgHex = "#DC2626";
    } else if (normName.includes("parcheggio") || normName.includes("parking")) {
      type = "parcheggio_gratuito";
      label = "Parcheggio Free";
      gradientColors = ["#2563EB", "#1D4ED8"];
      bgGradient = "from-blue-600 to-blue-800";
      borderBg = "border-blue-200/90";
      glowColor = "rgba(37, 99, 235, 0.45)";
      bgHex = "#2563EB";
    } else {
      type = "sosta";
      label = "Area Sosta Camper";
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
 * - agricampeggio: Farm tractor & wheat ear
 * - parcheggio_gratuito / parcheggio: Highway standard P
 * - parcheggio_pagamento: Highway P with Euro symbol
 * - parcheggio_diurno: Highway P with Sun
 * - campeggio: Canadian ridge camping tent with opening & guy lines
 * - carico_scarico: Official camper service tap + water droplet + discharge grille
 * - service: Service tap & gear/wrench
 * - fontanella: Classic public water tap / fountain with water droplets
 * - lavanderia: Self-service laundromat washing machine with drum & control buttons
 * - solo_scarico: Discharge drain grille with directional drainage arrow
 * - natura: Symmetrical alpine evergreen pine tree (Abete)
 */
function getGlyphForCategory(type: PoiCategoryType): { svgHtml: string; svgPath: React.ReactNode } {
  switch (type) {
    case "agricampeggio": {
      const svgHtml = `
        <g transform="translate(19, 16.5)">
          <!-- Tractor / Farm Barn Glyph -->
          <circle cx="5" cy="4" r="3.2" fill="#FFFFFF" />
          <circle cx="5" cy="4" r="1.4" fill="#65A30D" />
          <circle cx="-5" cy="5" r="2.2" fill="#FFFFFF" />
          <circle cx="-5" cy="5" r="1" fill="#65A30D" />
          <path d="M -5 3 L -1 3 L 1 -1 L 5 -1 L 5 1.5 L 2 1.5 L 1 3 L 3 3" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          <path d="M 1 -1 L 1 -5 L 4.5 -5 L 5 -1 Z" fill="#FFFFFF" />
          <line x1="-3.5" y1="-5.5" x2="-3.5" y2="1" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" />
          <path d="M -6.5 -3.5 C -5 -5.5 -2.5 -5.5 -1.5 -3.5" stroke="#FFFFFF" stroke-width="1.2" fill="none" stroke-linecap="round" />
        </g>
      `;
      const svgPath = (
        <g transform="translate(19, 16.5)">
          <circle cx="5" cy="4" r="3.2" fill="#FFFFFF" />
          <circle cx="5" cy="4" r="1.4" fill="#65A30D" />
          <circle cx="-5" cy="5" r="2.2" fill="#FFFFFF" />
          <circle cx="-5" cy="5" r="1" fill="#65A30D" />
          <path d="M -5 3 L -1 3 L 1 -1 L 5 -1 L 5 1.5 L 2 1.5 L 1 3 L 3 3" stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M 1 -1 L 1 -5 L 4.5 -5 L 5 -1 Z" fill="#FFFFFF" />
          <line x1="-3.5" y1="-5.5" x2="-3.5" y2="1" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" />
          <path d="M -6.5 -3.5 C -5 -5.5 -2.5 -5.5 -1.5 -3.5" stroke="#FFFFFF" strokeWidth={1.2} fill="none" strokeLinecap="round" />
        </g>
      );
      return { svgHtml, svgPath };
    }

    case "parcheggio_pagamento": {
      const svgHtml = `
        <g transform="translate(19, 16.5)">
          <!-- P letter on left, Euro on right -->
          <path d="M -7 -6.5 H -2.5 C -0.5 -6.5 1 -5 1 -3 C 1 -1 -0.5 0.5 -2.5 0.5 H -5 V 6.5 H -7 Z M -5 -4.5 V -1.5 H -2.5 C -1.6 -1.5 -0.9 -2.2 -0.9 -3 C -0.9 -3.8 -1.6 -4.5 -2.5 -4.5 Z" fill="#FFFFFF" fill-rule="evenodd" />
          <path d="M 6.5 -2.5 C 5.8 -4 4 -4.5 2.5 -3.8 C 1.2 -3.2 0.5 -1.5 0.8 0 C 1 1.5 2.2 2.8 3.8 2.8 C 5.2 2.8 6.5 1.8 7 0.5" stroke="#FFFFFF" stroke-width="1.3" fill="none" stroke-linecap="round" />
          <line x1="0" y1="-1" x2="4.5" y2="-1" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" />
          <line x1="0" y1="0.5" x2="4.5" y2="0.5" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" />
        </g>
      `;
      const svgPath = (
        <g transform="translate(19, 16.5)">
          <path d="M -7 -6.5 H -2.5 C -0.5 -6.5 1 -5 1 -3 C 1 -1 -0.5 0.5 -2.5 0.5 H -5 V 6.5 H -7 Z M -5 -4.5 V -1.5 H -2.5 C -1.6 -1.5 -0.9 -2.2 -0.9 -3 C -0.9 -3.8 -1.6 -4.5 -2.5 -4.5 Z" fill="#FFFFFF" fillRule="evenodd" />
          <path d="M 6.5 -2.5 C 5.8 -4 4 -4.5 2.5 -3.8 C 1.2 -3.2 0.5 -1.5 0.8 0 C 1 1.5 2.2 2.8 3.8 2.8 C 5.2 2.8 6.5 1.8 7 0.5" stroke="#FFFFFF" strokeWidth={1.3} fill="none" strokeLinecap="round" />
          <line x1="0" y1="-1" x2="4.5" y2="-1" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" />
          <line x1="0" y1="0.5" x2="4.5" y2="0.5" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" />
        </g>
      );
      return { svgHtml, svgPath };
    }

    case "parcheggio_diurno": {
      const svgHtml = `
        <g transform="translate(19, 16.5)">
          <!-- P letter + Sun -->
          <path d="M -6.5 -6.5 H -2 C -0.2 -6.5 1.2 -5.2 1.2 -3.4 C 1.2 -1.6 -0.2 -0.3 -2 -0.3 H -4.5 V 6.5 H -6.5 Z M -4.5 -4.5 V -2.3 H -2 C -1.3 -2.3 -0.8 -2.8 -0.8 -3.4 C -0.8 -4 -1.3 -4.5 -2 -4.5 Z" fill="#FFFFFF" fill-rule="evenodd" />
          <!-- Sun glyph -->
          <circle cx="4.5" cy="0" r="2.2" fill="#FFFFFF" />
          <line x1="4.5" y1="-3.8" x2="4.5" y2="-2.6" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" />
          <line x1="4.5" y1="2.6" x2="4.5" y2="3.8" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" />
          <line x1="1.7" y1="0" x2="0.5" y2="0" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" />
          <line x1="8.5" y1="0" x2="7.3" y2="0" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" />
        </g>
      `;
      const svgPath = (
        <g transform="translate(19, 16.5)">
          <path d="M -6.5 -6.5 H -2 C -0.2 -6.5 1.2 -5.2 1.2 -3.4 C 1.2 -1.6 -0.2 -0.3 -2 -0.3 H -4.5 V 6.5 H -6.5 Z M -4.5 -4.5 V -2.3 H -2 C -1.3 -2.3 -0.8 -2.8 -0.8 -3.4 C -0.8 -4 -1.3 -4.5 -2 -4.5 Z" fill="#FFFFFF" fillRule="evenodd" />
          <circle cx="4.5" cy="0" r="2.2" fill="#FFFFFF" />
          <line x1="4.5" y1="-3.8" x2="4.5" y2="-2.6" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" />
          <line x1="4.5" y1="2.6" x2="4.5" y2="3.8" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" />
          <line x1="1.7" y1="0" x2="0.5" y2="0" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" />
          <line x1="8.5" y1="0" x2="7.3" y2="0" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" />
        </g>
      );
      return { svgHtml, svgPath };
    }

    case "fontanella": {
      const svgHtml = `
        <g transform="translate(19, 16.5)">
          <path d="M -7 7 L -7 5 C -7 5 -5 4 -5 0 L -5 -4 C -5 -6 -3.5 -7.5 -1.5 -7.5 L 2.5 -7.5 C 4.5 -7.5 6 -6 6 -4 L 6 -1.5 L 4 -1.5 L 4 -4 C 4 -4.8 3.3 -5.5 2.5 -5.5 L -1.5 -5.5 C -2.3 -5.5 -3 -4.8 -3 -4 L -3 0 C -3 4 -5 5 -5 5 L -5 7 Z" fill="#FFFFFF" />
          <path d="M 4 -1.5 L 6 -1.5 L 6.5 0.5 L 3.5 0.5 Z" fill="#FFFFFF" />
          <path d="M 5 2.5 C 5 2.5 6.8 4.2 6.8 5.2 C 6.8 6.2 5.9 7 5 7 C 4.1 7 3.2 6.2 3.2 5.2 C 3.2 4.2 5 2.5 5 2.5 Z" fill="#FFFFFF" />
          <line x1="-8" y1="7.5" x2="8" y2="7.5" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" />
        </g>
      `;
      const svgPath = (
        <g transform="translate(19, 16.5)">
          <path d="M -7 7 L -7 5 C -7 5 -5 4 -5 0 L -5 -4 C -5 -6 -3.5 -7.5 -1.5 -7.5 L 2.5 -7.5 C 4.5 -7.5 6 -6 6 -4 L 6 -1.5 L 4 -1.5 L 4 -4 C 4 -4.8 3.3 -5.5 2.5 -5.5 L -1.5 -5.5 C -2.3 -5.5 -3 -4.8 -3 -4 L -3 0 C -3 4 -5 5 -5 5 L -5 7 Z" fill="#FFFFFF" />
          <path d="M 4 -1.5 L 6 -1.5 L 6.5 0.5 L 3.5 0.5 Z" fill="#FFFFFF" />
          <path d="M 5 2.5 C 5 2.5 6.8 4.2 6.8 5.2 C 6.8 6.2 5.9 7 5 7 C 4.1 7 3.2 6.2 3.2 5.2 C 3.2 4.2 5 2.5 5 2.5 Z" fill="#FFFFFF" />
          <line x1="-8" y1="7.5" x2="8" y2="7.5" stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" />
        </g>
      );
      return { svgHtml, svgPath };
    }

    case "lavanderia": {
      const svgHtml = `
        <g transform="translate(19, 16.5)">
          <rect x="-7.5" y="-7.5" width="15" height="15" rx="2.5" fill="#FFFFFF" />
          <line x1="-6" y1="-4.2" x2="-2" y2="-4.2" stroke="#9333EA" stroke-width="1" stroke-linecap="round" />
          <circle cx="3.5" cy="-4.2" r="0.9" fill="#9333EA" />
          <circle cx="5.5" cy="-4.2" r="0.9" fill="#9333EA" />
          <circle cx="0" cy="1.8" r="4.8" fill="#9333EA" />
          <circle cx="0" cy="1.8" r="3.6" fill="#FFFFFF" />
          <path d="M -2.2 2.6 C -1.2 1.4 0 3.2 2 2 C 2 2.8 1.5 3.5 0 3.5 C -1.5 3.5 -2.2 2.6 -2.2 2.6 Z" fill="#9333EA" />
        </g>
      `;
      const svgPath = (
        <g transform="translate(19, 16.5)">
          <rect x="-7.5" y="-7.5" width="15" height="15" rx={2.5} fill="#FFFFFF" />
          <line x1="-6" y1="-4.2" x2="-2" y2="-4.2" stroke="#9333EA" strokeWidth={1} strokeLinecap="round" />
          <circle cx="3.5" cy="-4.2" r="0.9" fill="#9333EA" />
          <circle cx="5.5" cy="-4.2" r="0.9" fill="#9333EA" />
          <circle cx="0" cy="1.8" r="4.8" fill="#9333EA" />
          <circle cx="0" cy="1.8" r="3.6" fill="#FFFFFF" />
          <path d="M -2.2 2.6 C -1.2 1.4 0 3.2 2 2 C 2 2.8 1.5 3.5 0 3.5 C -1.5 3.5 -2.2 2.6 -2.2 2.6 Z" fill="#9333EA" />
        </g>
      );
      return { svgHtml, svgPath };
    }

    case "solo_scarico": {
      const svgHtml = `
        <g transform="translate(19, 16.5)">
          <!-- Black and white heavy duty drain grille with down arrow -->
          <rect x="-7.5" y="-3.5" width="15" height="11" rx="1.5" fill="#FFFFFF" />
          <rect x="-6" y="-2" width="12" height="8" rx="0.8" fill="#18181B" />
          <line x1="-4" y1="-1" x2="-4" y2="5" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" />
          <line x1="-1.3" y1="-1" x2="-1.3" y2="5" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" />
          <line x1="1.3" y1="-1" x2="1.3" y2="5" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" />
          <line x1="4" y1="-1" x2="4" y2="5" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" />
          <path d="M 0 -8 L 3.5 -4.5 L 1.2 -4.5 L 1.2 -1.5 L -1.2 -1.5 L -1.2 -4.5 L -3.5 -4.5 Z" fill="#FFFFFF" />
        </g>
      `;
      const svgPath = (
        <g transform="translate(19, 16.5)">
          <rect x="-7.5" y="-3.5" width="15" height="11" rx={1.5} fill="#FFFFFF" />
          <rect x="-6" y="-2" width="12" height="8" rx={0.8} fill="#18181B" />
          <line x1="-4" y1="-1" x2="-4" y2="5" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" />
          <line x1="-1.3" y1="-1" x2="-1.3" y2="5" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" />
          <line x1="1.3" y1="-1" x2="1.3" y2="5" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" />
          <line x1="4" y1="-1" x2="4" y2="5" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" />
          <path d="M 0 -8 L 3.5 -4.5 L 1.2 -4.5 L 1.2 -1.5 L -1.2 -1.5 L -1.2 -4.5 L -3.5 -4.5 Z" fill="#FFFFFF" />
        </g>
      );
      return { svgHtml, svgPath };
    }

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
          <line x1="0.6" y1="-4.6" x2="0.6" y2="4.2" stroke="#0f172a" strokeWidth={0.7} strokeOpacity={0.3} />
          <circle cx="7" cy="4.8" r="2.2" fill="#0f172a" stroke="#FFFFFF" strokeWidth={0.8} />
          <circle cx="7" cy="4.8" r="0.8" fill="#FFFFFF" />
          <circle cx="-5.5" cy="4.8" r="2.2" fill="#0f172a" stroke="#FFFFFF" strokeWidth={0.8} />
          <circle cx="-5.5" cy="4.8" r="0.8" fill="#FFFFFF" />
        </g>
      );
      return { svgHtml, svgPath };
    }

    case "parcheggio_gratuito":
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
          <line x1="0" y1="-8" x2="0" y2="7" stroke="#FFFFFF" strokeWidth={1.3} strokeLinecap="round" />
          <line x1="-10" y1="7" x2="-12" y2="8.5" stroke="#FFFFFF" strokeWidth={1.3} strokeLinecap="round" />
          <line x1="10" y1="7" x2="12" y2="8.5" stroke="#FFFFFF" strokeWidth={1.3} strokeLinecap="round" />
          <path d="M 0 -8 L 2.5 -9.5 L 0 -11 Z" fill="#FFFFFF" />
        </g>
      );
      return { svgHtml, svgPath };
    }

    case "carico_scarico": {
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
          <rect x="-4.5" y="-9.5" width="5" height="1.8" rx={0.9} fill="#FFFFFF" />
          <path d="M 0.5 -1.5 C 0.5 -1.5 3.5 2 3.5 3.8 C 3.5 5.5 2.1 6.8 0.5 6.8 C -1.1 6.8 -2.5 5.5 -2.5 3.8 C -2.5 2 0.5 -1.5 0.5 -1.5 Z" fill="#FFFFFF" />
          <line x1="-7" y1="5.5" x2="-3.5" y2="5.5" stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" />
          <line x1="-7" y1="7.5" x2="-3.5" y2="7.5" stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" />
          <line x1="4.5" y1="5.5" x2="8" y2="5.5" stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" />
          <line x1="4.5" y1="7.5" x2="8" y2="7.5" stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" />
        </g>
      );
      return { svgHtml, svgPath };
    }

    case "service": {
      const svgHtml = `
        <g transform="translate(19, 16.5)">
          <!-- Wrench and water drop glyph for service station -->
          <path d="M -6.5 -6.5 C -4.5 -8.5 -1.5 -8.5 0.5 -6.5 C 1.2 -5.8 1.6 -4.8 1.6 -3.8 L -1.2 -1 L -3.8 -1 L -3.8 -3.6 L -1 -6.2 C -1.8 -6.6 -2.8 -6.6 -3.6 -5.8 C -4.8 -4.6 -4.8 -2.6 -3.6 -1.4 L -6.5 1.5 C -7.3 2.3 -7.3 3.6 -6.5 4.4 L -4.4 6.5 C -3.6 7.3 -2.3 7.3 -1.5 6.5 L 1.4 3.6 C 2.6 4.8 4.6 4.8 5.8 3.6 C 7 -2.4 4 -7.2 0.5 -6.5 Z" fill="#FFFFFF" opacity="0.95" />
          <circle cx="4" cy="-3.5" r="2.2" fill="#FFFFFF" />
        </g>
      `;
      const svgPath = (
        <g transform="translate(19, 16.5)">
          <path d="M -6.5 -6.5 C -4.5 -8.5 -1.5 -8.5 0.5 -6.5 C 1.2 -5.8 1.6 -4.8 1.6 -3.8 L -1.2 -1 L -3.8 -1 L -3.8 -3.6 L -1 -6.2 C -1.8 -6.6 -2.8 -6.6 -3.6 -5.8 C -4.8 -4.6 -4.8 -2.6 -3.6 -1.4 L -6.5 1.5 C -7.3 2.3 -7.3 3.6 -6.5 4.4 L -4.4 6.5 C -3.6 7.3 -2.3 7.3 -1.5 6.5 L 1.4 3.6 C 2.6 4.8 4.6 4.8 5.8 3.6 C 7 -2.4 4 -7.2 0.5 -6.5 Z" fill="#FFFFFF" opacity={0.95} />
          <circle cx="4" cy="-3.5" r={2.2} fill="#FFFFFF" />
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
          <rect x="-1.2" y="5.6" width="2.4" height="2.8" rx={0.5} fill="#FFFFFF" />
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
  serviceSubtype?: CamperServiceSubtype;
  categoryLabel?: string;
  name?: string;
}

/**
 * React Marker Component for Google Maps AdvancedMarker
 */
export const MapPoiIcon: React.FC<MapPoiIconProps> = ({
  category,
  isViolation = false,
  isSelected = false,
  feeStatus,
  serviceSubtype,
  categoryLabel,
  name,
}) => {
  const details = getPoiCategoryDetails(
    category,
    isViolation,
    feeStatus,
    serviceSubtype,
    categoryLabel,
    name
  );
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
            <circle cx="0" cy="0" r="5" fill="#EF4444" stroke="#FFFFFF" strokeWidth={1.5} />
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
  feeStatus?: 'free' | 'paid' | 'unknown',
  serviceSubtype?: CamperServiceSubtype,
  categoryLabel?: string,
  name?: string
): { html: string; iconSize: [number, number]; iconAnchor: [number, number] } {
  const details = getPoiCategoryDetails(
    category,
    isViolation,
    feeStatus,
    serviceSubtype,
    categoryLabel,
    name
  );

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
  serviceSubtype?: CamperServiceSubtype;
  categoryLabel?: string;
  name?: string;
}> = ({
  category,
  className = "",
  size = 18,
  feeStatus,
  showShadow = true,
  serviceSubtype,
  categoryLabel,
  name,
}) => {
  const details = getPoiCategoryDetails(
    category,
    false,
    feeStatus,
    serviceSubtype,
    categoryLabel,
    name
  );
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
  serviceSubtype?: CamperServiceSubtype;
  categoryLabel?: string;
  name?: string;
}> = ({
  category,
  feeStatus,
  className = "",
  pinSize = 15,
  serviceSubtype,
  categoryLabel,
  name,
}) => {
  const details = getPoiCategoryDetails(
    category,
    false,
    feeStatus,
    serviceSubtype,
    categoryLabel,
    name
  );

  let badgeStyle = "bg-sky-50 text-sky-950 border-sky-200";
  if (details.type === "agricampeggio") {
    badgeStyle = "bg-lime-50 text-lime-950 border-lime-300";
  } else if (details.type === "parcheggio_gratuito" || details.type === "parcheggio") {
    badgeStyle = "bg-blue-50 text-blue-950 border-blue-300";
  } else if (details.type === "parcheggio_pagamento") {
    badgeStyle = "bg-red-50 text-red-950 border-red-300";
  } else if (details.type === "parcheggio_diurno") {
    badgeStyle = "bg-amber-50 text-amber-950 border-amber-300";
  } else if (details.type === "campeggio") {
    badgeStyle = "bg-emerald-50 text-emerald-950 border-emerald-300";
  } else if (details.type === "carico_scarico") {
    badgeStyle = "bg-violet-50 text-violet-950 border-violet-300";
  } else if (details.type === "service") {
    badgeStyle = "bg-cyan-50 text-cyan-950 border-cyan-300";
  } else if (details.type === "fontanella") {
    badgeStyle = "bg-sky-50 text-sky-950 border-sky-300";
  } else if (details.type === "lavanderia") {
    badgeStyle = "bg-fuchsia-50 text-fuchsia-950 border-fuchsia-300";
  } else if (details.type === "solo_scarico") {
    badgeStyle = "bg-zinc-100 text-zinc-950 border-zinc-400";
  } else if (details.type === "natura") {
    badgeStyle = "bg-emerald-50 text-emerald-950 border-emerald-200";
  }

  const displayLabel = categoryLabel || details.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9.5px] font-black tracking-wide border shadow-2xs ${badgeStyle} ${className}`}
    >
      <MapCategoryPinMini
        category={category}
        size={pinSize}
        feeStatus={feeStatus}
        serviceSubtype={serviceSubtype}
        categoryLabel={categoryLabel}
        name={name}
      />
      <span>{displayLabel}</span>
    </span>
  );
};

