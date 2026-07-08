/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CategoryIllustrationProps {
  category: string;
  className?: string;
}

export const CategoryIllustration: React.FC<CategoryIllustrationProps> = ({ category, className = "w-full h-full" }) => {
  // Normalize category key
  const normCategory = category?.toLowerCase().trim() || 'default';

  if (normCategory.includes('sosta')) {
    return <img src="/area_sosta.jpg" alt="Area di Sosta" className={className} />;
  }
  if (normCategory.includes('campeggio') || normCategory.includes('camping')) {
    return <img src="/campeggio.jpg" alt="Campeggio" className={className} />;
  }
  if (normCategory.includes('service')) {
    return <img src="/camper_service.jpg" alt="Camper Service" className={className} />;
  }
  if (normCategory.includes('parcheggio') || normCategory.includes('camper')) {
    return <img src="/parcheggio_camper.jpg" alt="Parcheggio Camper" className={className} />;
  }

  return <img src="/parcheggio_camper.jpg" alt="Parcheggio Camper" className={className} />;
};
