/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { getPoiCategoryDetails } from './MapPoiIcon';
import { CamperServiceSubtype } from '../types';

export type CategoryIllustrationSize = 'sm' | 'md' | 'lg' | 'hero';

interface CategoryIllustrationProps {
  category: string;
  className?: string;
  feeStatus?: 'free' | 'paid' | 'unknown';
  serviceSubtype?: CamperServiceSubtype;
  categoryLabel?: string;
  name?: string;
  size?: CategoryIllustrationSize;
  showLabel?: boolean;
}

export const CategoryIllustration: React.FC<CategoryIllustrationProps> = ({
  category,
  className = "w-full h-full",
  feeStatus,
  serviceSubtype,
  categoryLabel,
  name,
  size = "md",
  showLabel = size === "hero",
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

  const isHero = size === "hero";

  const pinSizeClass = {
    sm: "w-7 h-8",
    md: "w-10 h-12 md:w-11 md:h-13",
    lg: "w-16 h-18 sm:w-18 sm:h-20",
    hero: "w-24 h-28 sm:w-28 sm:h-32 md:w-32 md:h-36",
  }[size];

  const shadowStyle = isHero
    ? { filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.45)) drop-shadow(0 2px 4px rgba(0,0,0,0.25))" }
    : { filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.35))" };

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden select-none ${className}`}
      style={{
        background: `linear-gradient(135deg, ${details.gradientColors[0]}, ${details.gradientColors[1]})`,
      }}
      title={details.label}
    >
      {/* Subtle radial lighting texture */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-black pointer-events-none" />

      {/* Decorative ambient halo rings for hero mode */}
      {isHero && (
        <>
          <div className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-white/20 bg-white/5 pointer-events-none" />
          <div className="absolute w-52 h-52 sm:w-64 sm:h-64 rounded-full border border-white/10 pointer-events-none" />
        </>
      )}

      {/* Vector map pin with white outline and centered silhouette */}
      <div
        className="relative z-10 flex flex-col items-center justify-center"
        style={shadowStyle}
      >
        <svg
          className={`${pinSizeClass} transition-transform duration-300`}
          viewBox="0 0 38 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`illustr-grad-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={details.gradientColors[0]} />
              <stop offset="100%" stopColor={details.gradientColors[1]} />
            </linearGradient>
          </defs>
          <path
            d="M 19 43 C 17.2 40 5.5 26.5 5.5 17 A 13.5 13.5 0 1 1 32.5 17 C 32.5 26.5 20.8 40 19 43 Z"
            fill={`url(#illustr-grad-${gradId})`}
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {details.svgPath}
        </svg>

        {/* Clear category label pill in Hero mode */}
        {showLabel && (
          <div className="mt-2 sm:mt-2.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/25 text-white font-black text-[11px] sm:text-xs tracking-wider uppercase shadow-md flex items-center gap-1.5 pointer-events-none">
            <span>{details.label}</span>
          </div>
        )}
      </div>
    </div>
  );
};


