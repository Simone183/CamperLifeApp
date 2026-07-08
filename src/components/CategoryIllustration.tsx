/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MapPin, Tent, Droplets } from 'lucide-react';

interface CategoryIllustrationProps {
  category: string;
  className?: string;
}

export const CategoryIllustration: React.FC<CategoryIllustrationProps> = ({ category, className = "w-full h-full" }) => {
  // Normalize category key
  const normCategory = category?.toLowerCase().trim() || 'default';

  // Soste (Area Sosta) -> Peach/Orange gradient
  if (normCategory.includes('sosta')) {
    return (
      <div className={`flex items-center justify-center text-white bg-gradient-to-br from-[#FF9E79] to-[#FF8552] ${className}`}>
        <MapPin className="w-1/2 h-1/2 min-w-[20px] min-h-[20px]" />
      </div>
    );
  }

  // Campeggio -> Green gradient
  if (normCategory.includes('campeggio') || normCategory.includes('camping')) {
    return (
      <div className={`flex items-center justify-center text-white bg-gradient-to-br from-[#5A6B4E] to-[#3E4A35] ${className}`}>
        <Tent className="w-1/2 h-1/2 min-w-[20px] min-h-[20px]" />
      </div>
    );
  }

  // Camper Service -> Light Blue gradient
  if (normCategory.includes('service')) {
    return (
      <div className={`flex items-center justify-center text-white bg-gradient-to-br from-[#4EA8DE] to-[#0077B6] ${className}`}>
        <Droplets className="w-1/2 h-1/2 min-w-[20px] min-h-[20px]" />
      </div>
    );
  }

  // Parcheggio -> Italian-style Blue Parking Sign (P)
  if (normCategory.includes('parcheggio') || normCategory.includes('camper')) {
    return (
      <div className={`flex items-center justify-center text-white bg-[#0056b3] font-bold select-none ${className}`}>
        <span className="text-2xl md:text-3xl font-sans tracking-normal leading-none">P</span>
      </div>
    );
  }

  // Default Fallback
  return (
    <div className={`flex items-center justify-center text-white bg-gradient-to-br from-slate-400 to-slate-600 ${className}`}>
      <MapPin className="w-1/2 h-1/2 min-w-[20px] min-h-[20px]" />
    </div>
  );
};

