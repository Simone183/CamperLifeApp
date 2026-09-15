/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { getPoiCategoryDetails } from './MapPoiIcon';

interface CategoryIllustrationProps {
  category: string;
  className?: string;
  feeStatus?: 'free' | 'paid' | 'unknown';
}

export const CategoryIllustration: React.FC<CategoryIllustrationProps> = ({
  category,
  className = "w-full h-full",
  feeStatus,
}) => {
  const details = getPoiCategoryDetails(category, false, feeStatus);
  const gradId = React.useId().replace(/:/g, "_");

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden select-none ${className}`}
      style={{
        background: `linear-gradient(135deg, ${details.gradientColors[0]}, ${details.gradientColors[1]})`,
      }}
      title={details.label}
    >
      {/* Subtle radial lighting texture */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-black pointer-events-none" />

      {/* Identical vector map pin with white outline and centered silhouette */}
      <div
        className="relative z-10 flex items-center justify-center"
        style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.35))" }}
      >
        <svg
          className="w-10 h-12 md:w-11 md:h-13"
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
      </div>
    </div>
  );
};


