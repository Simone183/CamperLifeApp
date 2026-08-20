import React from 'react';
import { motion } from 'motion/react';

interface RollyMascotProps {
  className?: string;
  variant?: 'welcome' | 'map' | 'diary' | 'tools';
}

export const RollyMascot: React.FC<RollyMascotProps> = ({ className = '', variant = 'welcome' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <svg
          width="180"
          height="180"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background Blob */}
          <path d="M100 20C150 20 180 50 180 100C180 150 150 180 100 180C50 180 20 150 20 100C20 50 50 20 100 20Z" fill="#E8F4EC" />

          <g transform="translate(0, 10)">
            {/* Base Shadow */}
            <ellipse cx="100" cy="170" rx="75" ry="12" fill="rgba(0,0,0,0.15)" />

            {/* Tires */}
            <rect x="40" y="135" width="24" height="35" rx="8" fill="#4B5563" stroke="#374151" strokeWidth="4" />
            <rect x="136" y="135" width="24" height="35" rx="8" fill="#4B5563" stroke="#374151" strokeWidth="4" />

            {/* Side Mirrors */}
            {/* Left */}
            <path d="M 38,85 L 45,85" stroke="#374151" strokeWidth="4" />
            <rect x="26" y="70" width="14" height="30" rx="5" fill="#E5E7EB" stroke="#374151" strokeWidth="4" />
            {/* Right */}
            <path d="M 155,85 L 162,85" stroke="#374151" strokeWidth="4" />
            <rect x="160" y="70" width="14" height="30" rx="5" fill="#E5E7EB" stroke="#374151" strokeWidth="4" />

            {/* Main Body Definitions */}
            <defs>
              <path id="body-path" d="M 55,45 L 145,45 C 158,45 162,55 164,75 L 167,130 C 167,145 155,150 140,150 L 60,150 C 45,150 33,145 33,130 L 36,75 C 38,55 42,45 55,45 Z" />
              <clipPath id="body-clip">
                <use href="#body-path" />
              </clipPath>
              <clipPath id="plate-clip">
                <rect x="85" y="142" width="30" height="14" rx="3" />
              </clipPath>
            </defs>

            {/* Roof Box */}
            <rect x="55" y="25" width="90" height="35" rx="15" fill="#F29C38" stroke="#374151" strokeWidth="4" />
            <rect x="65" y="30" width="70" height="12" rx="6" fill="#FCD34D" opacity="0.6" />

            {/* Body Fills */}
            <use href="#body-path" fill="#FFF3D3" />
            <rect x="0" y="100" width="200" height="100" fill="#69B494" clipPath="url(#body-clip)" />
            
            {/* Separating Line */}
            <path d="M 30,100 L 170,100" stroke="#374151" strokeWidth="4" />

            {/* Body Outline */}
            <use href="#body-path" fill="none" stroke="#374151" strokeWidth="4" />

            {/* Visor */}
            <path d="M 44,58 L 156,58 C 158,58 159,60 160,62 L 158,66 L 42,66 L 40,62 C 41,60 42,58 44,58 Z" fill="#F29C38" stroke="#374151" strokeWidth="4" strokeLinejoin="round" />

            {/* Windshield */}
            <path d="M 46,66 L 154,66 C 157,66 158,68 159,71 L 161,95 C 161,98 158,100 155,100 L 45,100 C 42,100 39,98 39,95 L 41,71 C 42,68 43,66 46,66 Z" fill="#B3E5FC" stroke="#374151" strokeWidth="4" strokeLinejoin="round" />
            <path d="M 52,72 L 148,72 C 150,72 151,73 151,75 L 152,85 L 48,85 L 49,75 C 49,73 50,72 52,72 Z" fill="#E1F5FE" opacity="0.6" />

            {/* Face */}
            <ellipse cx="65" cy="85" rx="8" ry="4" fill="#FF8A8A" opacity="0.8" />
            <ellipse cx="135" cy="85" rx="8" ry="4" fill="#FF8A8A" opacity="0.8" />
            
            <circle cx="80" cy="82" r="7" fill="#374151" />
            <circle cx="82" cy="79" r="2.5" fill="white" />
            
            <circle cx="120" cy="82" r="7" fill="#374151" />
            <circle cx="122" cy="79" r="2.5" fill="white" />
            
            <path d="M 92,86 Q 100,94 108,86" fill="none" stroke="#374151" strokeWidth="3" strokeLinecap="round" />

            {/* Grille */}
            <rect x="75" y="112" width="50" height="22" rx="6" fill="#4B5563" stroke="#374151" strokeWidth="4" />
            <line x1="82" y1="119" x2="118" y2="119" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="82" y1="127" x2="118" y2="127" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" />

            {/* Headlights */}
            <circle cx="55" cy="115" r="9" fill="#FDF3D0" stroke="#374151" strokeWidth="4" />
            <circle cx="55" cy="115" r="5" fill="#FCD34D" />
            
            <circle cx="145" cy="115" r="9" fill="#FDF3D0" stroke="#374151" strokeWidth="4" />
            <circle cx="145" cy="115" r="5" fill="#FCD34D" />

            {/* Turn Signals */}
            <circle cx="55" cy="132" r="4" fill="#F97316" stroke="#374151" strokeWidth="3" />
            <circle cx="145" cy="132" r="4" fill="#F97316" stroke="#374151" strokeWidth="3" />

            {/* Bumper */}
            <rect x="25" y="142" width="150" height="18" rx="9" fill="#E5E7EB" stroke="#374151" strokeWidth="4" />

            {/* License Plate */}
            <g clipPath="url(#plate-clip)">
              <rect x="85" y="142" width="10" height="14" fill="#10B981" />
              <rect x="95" y="142" width="10" height="14" fill="#FFFFFF" />
              <rect x="105" y="142" width="10" height="14" fill="#EF4444" />
            </g>
            <rect x="85" y="142" width="30" height="14" rx="3" fill="none" stroke="#374151" strokeWidth="3" />

            {/* Variant Props (Map, Tools, Diary) */}
            {variant === 'map' && (
              <g transform="translate(130, 40) rotate(15)">
                {/* Location Pin */}
                <path d="M15 0 C6.7 0 0 6.7 0 15 C0 26.2 15 40 15 40 C15 40 30 26.2 30 15 C30 6.7 23.3 0 15 0 Z" fill="#EF4444" stroke="#7F1D1D" strokeWidth="2" />
                <circle cx="15" cy="15" r="6" fill="#FFFFFF" />
              </g>
            )}
            
            {variant === 'diary' && (
              <g transform="translate(125, 45) rotate(10)">
                {/* Polaroid Photo */}
                <rect x="0" y="0" width="35" height="40" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="2" />
                <rect x="4" y="4" width="27" height="25" fill="#3B82F6" />
                {/* Mountain inside polaroid */}
                <path d="M4 29 L14 18 L20 24 L26 15 L31 29 Z" fill="#93C5FD" />
              </g>
            )}

            {variant === 'tools' && (
              <g transform="translate(25, 45) rotate(-15)">
                {/* Wrench */}
                <path d="M10 5 C15 5 18 8 18 12 L30 24 L24 30 L12 18 C8 18 5 15 5 10 C5 7 7 5 10 5 Z" fill="#9CA3AF" stroke="#4B5563" strokeWidth="2" />
                <circle cx="10" cy="10" r="3" fill="#E5E7EB" />
              </g>
            )}
          </g>
        </svg>
      </motion.div>
    </div>
  );
};
