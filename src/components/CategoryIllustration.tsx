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

  switch (normCategory) {
    case 'area_sosta':
      return <img src="/area_sosta.jpg" alt="Area di Sosta" className={className} />;
    case 'campeggio':
      return <img src="/campeggio.jpg" alt="Campeggio" className={className} />;
    case 'camper_service':
      return <img src="/camper_service.jpg" alt="Camper Service" className={className} />;
    case 'parcheggio_camper':
    default:
      return <img src="/parcheggio_camper.jpg" alt="Parcheggio Camper" className={className} />;
  }
};
