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

  // Vintage hand-drawn sketch style SVG
  // Colors choice:
  // - Dark Forest Green for lines: #3E4A35
  // - Deep Charcoal: #2C3527
  // - Warm Amber Accent: #BFA15F
  // - Background: #F4F1EA (warm paper tone)

  switch (normCategory) {
    case 'area_sosta':
      return (
        <svg
          viewBox="0 0 100 100"
          className={`${className} bg-[#F4F1EA] text-[#3E4A35]`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle nature circle boundary */}
          <circle cx="50" cy="50" r="44" stroke="#3E4A35" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.3" />
          
          {/* Mountains in background */}
          <path
            d="M16 68 L36 34 L56 68 M40 68 L62 25 L84 68"
            stroke="#3E4A35"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.45"
          />
          {/* Mountain snow cap accents */}
          <path d="M29 46 L36 34 L43 46 Q39 42 29 46 Z" fill="#3E4A35" opacity="0.15" />
          <path d="M54 39 L62 25 L70 39 Q66 35 54 39 Z" fill="#3E4A35" opacity="0.15" />

          {/* Sun / Moon and little stars */}
          <circle cx="74" cy="26" r="6" stroke="#BFA15F" strokeWidth="2" fill="none" />
          <circle cx="24" cy="22" r="1.5" fill="#BFA15F" />
          <circle cx="34" cy="18" r="1" fill="#BFA15F" />

          {/* Cute Camper Outline */}
          {/* Body */}
          <path
            d="M24 72 L24 53 C24 50 26 48 29 48 L61 48 C64 48 68 51 69 54 L72 61 C74 65 74 68 74 72 Z"
            fill="#FFFFFF"
            stroke="#2C3527"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Camper windows */}
          <rect
            x="30"
            y="54"
            width="12"
            height="8"
            rx="2"
            fill="#F4F1EA"
            stroke="#2C3527"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M48 54 H62 V62 H48 Z"
            fill="#F4F1EA"
            stroke="#2C3527"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Vertical door line */}
          <path d="M45 48 V72" stroke="#2C3527" strokeWidth="2" />

          {/* Pine tree at the side */}
          <path
            d="M78 72 V62 M74 62 L78 54 L82 62 Z M75 56 L78 49 L81 56 Z"
            stroke="#3E4A35"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Ground line */}
          <path d="M10 72 H90" stroke="#2C3527" strokeWidth="3" strokeLinecap="round" />

          {/* Wheels */}
          <circle cx="34" cy="74" r="6" fill="#F4F1EA" stroke="#2C3527" strokeWidth="3" />
          <circle cx="34" cy="74" r="2" fill="#2C3527" />
          
          <circle cx="62" cy="74" r="6" fill="#F4F1EA" stroke="#2C3527" strokeWidth="3" />
          <circle cx="62" cy="74" r="2" fill="#2C3527" />

          {/* Status Label (Mini) */}
          <rect x="35" y="84" width="30" height="8" rx="3" fill="#3E4A35" />
          <text x="50" y="90" fill="#F4F1EA" fontSize="5" fontWeight="900" textAnchor="middle" letterSpacing="0.5">SOSTA</text>
        </svg>
      );

    case 'campeggio':
      return (
        <svg
          viewBox="0 0 100 100"
          className={`${className} bg-[#F4F1EA] text-[#3E4A35]`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Natural perimeter */}
          <circle cx="50" cy="50" r="44" stroke="#3E4A35" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.3" />

          {/* High mountain sketch */}
          <path
            d="M12 68 L40 22 L68 68 M42 68 L66 28 L90 68"
            stroke="#3E4A35"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.4"
          />

          {/* Crescent Moon & Stars */}
          <path
            d="M74 20 C74 24 71 27 67 27 C69 25 70 22 69 20 C69 17 71 15 74 15 C72 16 74 18 74 20 Z"
            fill="#BFA15F"
          />
          <circle cx="26" cy="26" r="1.5" fill="#BFA15F" />
          <circle cx="32" cy="18" r="1" fill="#BFA15F" />

          {/* Classic Outdoor Tent (A-Frame) */}
          <path
            d="M20 70 L46 36 L72 70 Z"
            fill="#FFFFFF"
            stroke="#2C3527"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Tent door/opening */}
          <path
            d="M46 36 V70 M46 48 L32 70 H60 Z"
            fill="#F4F1EA"
            stroke="#2C3527"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Pine Trees flanking the tent */}
          <path
            d="M15 70 V58 M10 58 L15 48 L20 58 Z M11 51 L15 42 L19 51 Z"
            stroke="#3E4A35"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M80 70 V54 M75 54 L80 43 L85 54 Z M76 46 L80 37 L84 46 Z"
            stroke="#3E4A35"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Cozy Campfire */}
          <path d="M40 70 L52 70 M43 70 L49 64 M49 70 L43 64" stroke="#2C3527" strokeWidth="2.5" strokeLinecap="round" />
          <path
            d="M46 64 Q43 58 46 54 Q49 58 46 64 Z"
            fill="#BFA15F"
            stroke="#2C3527"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-pulse"
          />

          {/* Ground line */}
          <path d="M8 70 H92" stroke="#2C3527" strokeWidth="3" strokeLinecap="round" />

          {/* Status Label (Mini) */}
          <rect x="33" y="80" width="34" height="8" rx="3" fill="#3E4A35" />
          <text x="50" y="86" fill="#F4F1EA" fontSize="4.5" fontWeight="900" textAnchor="middle" letterSpacing="0.5">CAMPING</text>
        </svg>
      );

    case 'camper_service':
      return (
        <svg
          viewBox="0 0 100 100"
          className={`${className} bg-[#F4F1EA] text-[#3E4A35]`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle perimeter */}
          <circle cx="50" cy="50" r="44" stroke="#3E4A35" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.3" />

          {/* Water Drops / Spray from top right */}
          <path
            d="M74 24 C74 27 72 29 70 29 C68 29 66 27 68 24 C68 21 72 18 74 18 C74 18 74 21 74 24 Z"
            fill="#BFA15F"
            stroke="#2C3527"
            strokeWidth="1.5"
          />
          <path
            d="M82 30 C82 32.5 80.5 34 79 34 C77.5 34 76 32.5 77.2 30 C77.2 27.5 80.5 25 82 25 Z"
            fill="#BFA15F"
            stroke="#2C3527"
            strokeWidth="1.5"
          />

          {/* Tap Structure */}
          <path
            d="M85 58 V42 H76 M80 42 V38 Q80 36 78 36 H74"
            stroke="#2C3527"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Valve wheel handle */}
          <path d="M82 36 H88" stroke="#3E4A35" strokeWidth="2.5" strokeLinecap="round" />

          {/* Camper Profile layout */}
          <path
            d="M18 68 L18 51 C18 48 20 46 23 46 L53 46 C56 46 59 49 60 52 L63 58 C65 61 65 64 65 68 Z"
            fill="#FFFFFF"
            stroke="#2C3527"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Rear ladder or utility symbol */}
          <path d="M15 50 V64 M12 53 H18 M12 58 H18" stroke="#3E4A35" strokeWidth="1.8" strokeLinecap="round" />

          {/* Side logo / Stripe detail */}
          <path d="M24 58 H54" stroke="#BFA15F" strokeWidth="3" strokeLinecap="round" opacity="0.8" />

          {/* Wheels */}
          <circle cx="28" cy="70" r="5.5" fill="#F4F1EA" stroke="#2C3527" strokeWidth="3" />
          <circle cx="28" cy="70" r="1.5" fill="#2C3527" />

          <circle cx="52" cy="70" r="5.5" fill="#F4F1EA" stroke="#2C3527" strokeWidth="3" />
          <circle cx="52" cy="70" r="1.5" fill="#2C3527" />

          {/* Water drainage grid / wave under camper */}
          <path
            d="M62 68 H74"
            stroke="#2C3527"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M60 72 C63 74 65 74 68 72 C71 70 73 70 76 72"
            stroke="#BFA15F"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Ground line */}
          <path d="M8 68 H92" stroke="#2C3527" strokeWidth="3" strokeLinecap="round" />

          {/* Status Label (Mini) */}
          <rect x="31" y="80" width="38" height="8" rx="3" fill="#3E4A35" />
          <text x="50" y="86" fill="#F4F1EA" fontSize="4.5" fontWeight="900" textAnchor="middle" letterSpacing="0.5">SERVICES</text>
        </svg>
      );

    case 'parcheggio_camper':
    default:
      return (
        <svg
          viewBox="0 0 100 100"
          className={`${className} bg-[#F4F1EA] text-[#3E4A35]`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle perimeter */}
          <circle cx="50" cy="50" r="44" stroke="#3E4A35" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.3" />

          {/* Modern Park shield badge */}
          <rect
            x="64"
            y="18"
            width="18"
            height="18"
            rx="5"
            fill="#3E4A35"
            stroke="#2C3527"
            strokeWidth="2.5"
          />
          <text
            x="73"
            y="31"
            fill="#FFFFFF"
            fontSize="12"
            fontWeight="bold"
            fontFamily="monospace"
            textAnchor="middle"
          >
            P
          </text>

          {/* Scenic Pines behind camper */}
          <path
            d="M12 68 V56 M8 56 L12 46 L16 56 Z M9 49 L12 40 L15 49 Z"
            stroke="#3E4A35"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.6"
          />
          <path
            d="M74 68 V59 M70 59 L74 50 L78 59 Z"
            stroke="#3E4A35"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.6"
          />

          {/* Camper side outline */}
          <path
            d="M20 68 V52 C20 49 22 47 25 47 H55 Q59 47 61 50 L64 56 C66 59 66 62 66 68 Z"
            fill="#FFFFFF"
            stroke="#2C3527"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Window */}
          <rect
            x="26"
            y="52"
            width="10"
            height="8"
            rx="1.5"
            fill="#F4F1EA"
            stroke="#2C3527"
            strokeWidth="2.5"
          />
          <path
            d="M42 52 H56 V59 H42 Z"
            fill="#F4F1EA"
            stroke="#2C3527"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Ground */}
          <path d="M8 68 H92" stroke="#2C3527" strokeWidth="3" strokeLinecap="round" />

          {/* Wheels */}
          <circle cx="30" cy="70" r="5.5" fill="#F4F1EA" stroke="#2C3527" strokeWidth="3" />
          <circle cx="30" cy="70" r="1.5" fill="#2C3527" />

          <circle cx="54" cy="70" r="5.5" fill="#F4F1EA" stroke="#2C3527" strokeWidth="3" />
          <circle cx="54" cy="70" r="1.5" fill="#2C3527" />

          {/* Status Label (Mini) */}
          <rect x="32" y="80" width="36" height="8" rx="3" fill="#3E4A35" />
          <text x="50" y="86" fill="#F4F1EA" fontSize="4.5" fontWeight="900" textAnchor="middle" letterSpacing="0.5">PARKING</text>
        </svg>
      );
  }
};
