import React from 'react';
import { motion } from 'motion/react';

interface RollyMascotProps {
  className?: string;
  variant?: 'welcome' | 'map' | 'diary' | 'tools';
}

export const RollyMascot: React.FC<RollyMascotProps> = ({ className = '', variant = 'welcome' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <motion.svg
        width="180"
        height="180"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        {/* Background Blob */}
        <path d="M100 20C150 20 180 50 180 100C180 150 150 180 100 180C50 180 20 150 20 100C20 50 50 20 100 20Z" fill="#E8F4EC" />

        <g transform="translate(0, 10)">
          {/* Wheels */}
          <circle cx="65" cy="145" r="14" fill="#333333" />
          <circle cx="65" cy="145" r="6" fill="#DDDDDD" />
          
          <circle cx="135" cy="145" r="14" fill="#333333" />
          <circle cx="135" cy="145" r="6" fill="#DDDDDD" />

          {/* Shadow under vehicle */}
          <ellipse cx="100" cy="155" rx="50" ry="6" fill="rgba(0,0,0,0.15)" />

          {/* Roof Box */}
          <rect x="70" y="45" width="60" height="15" rx="7" fill="#F28C28" stroke="#3E4A35" strokeWidth="2.5" />
          <rect x="80" y="45" width="40" height="15" fill="#FFA54F" />

          {/* Main Body - Bottom (Mint Green) */}
          <path d="M50 100 H150 V130 C150 138.284 143.284 145 135 145 H65 C56.7157 145 50 138.284 50 130 V100 Z" fill="#82CBA9" stroke="#3E4A35" strokeWidth="2.5" />
          
          {/* Main Body - Top (Cream) */}
          <path d="M55 55 H145 C147.761 55 150 57.2386 150 60 V100 H50 V60 C50 57.2386 52.2386 55 55 55 Z" fill="#F4EBD0" stroke="#3E4A35" strokeWidth="2.5" />

          {/* Windshield */}
          <rect x="65" y="65" width="70" height="30" rx="6" fill="#C7E9EE" stroke="#3E4A35" strokeWidth="2.5" />
          
          {/* Windshield Reflection */}
          <path d="M70 68 L85 85" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
          <path d="M78 68 L88 78" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.6" />

          {/* Kawaii Face on Windshield */}
          <circle cx="85" cy="82" r="3.5" fill="#2D3748" />
          <circle cx="115" cy="82" r="3.5" fill="#2D3748" />
          
          {/* Sparkle in eyes */}
          <circle cx="84" cy="81" r="1" fill="#FFFFFF" />
          <circle cx="114" cy="81" r="1" fill="#FFFFFF" />

          {/* Mouth */}
          <path d="M96 85 Q100 89 104 85" stroke="#2D3748" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* Blush */}
          <circle cx="75" cy="85" r="4" fill="#FF8A8A" opacity="0.5" />
          <circle cx="125" cy="85" r="4" fill="#FF8A8A" opacity="0.5" />

          {/* Headlights */}
          <circle cx="62" cy="115" r="5" fill="#FFF59D" stroke="#3E4A35" strokeWidth="2" />
          <circle cx="138" cy="115" r="5" fill="#FFF59D" stroke="#3E4A35" strokeWidth="2" />

          {/* Bumper */}
          <rect x="80" y="130" width="40" height="8" rx="4" fill="#DDDDDD" stroke="#3E4A35" strokeWidth="2" />
          
          {/* Front Grille */}
          <line x1="90" y1="115" x2="110" y2="115" stroke="#3E4A35" strokeWidth="2" strokeLinecap="round" />
          <line x1="92" y1="120" x2="108" y2="120" stroke="#3E4A35" strokeWidth="2" strokeLinecap="round" />
          
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
      </motion.svg>
    </div>
  );
};
