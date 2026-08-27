import React from 'react';

interface CartoonCamperAvatarProps {
  className?: string;
  size?: number;
}

export const CartoonCamperAvatar: React.FC<CartoonCamperAvatarProps> = ({
  className = "w-10 h-10",
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm overflow-visible"
      >
        {/* Soft Shadow Base */}
        <ellipse cx="50" cy="92" rx="36" ry="6" fill="#000000" opacity="0.15" />

        {/* Wheels */}
        <g id="wheels">
          {/* Left Wheel */}
          <rect x="18" y="76" width="16" height="14" rx="4" fill="#1E293B" />
          <rect x="21" y="79" width="10" height="8" rx="2" fill="#64748B" />
          {/* Right Wheel */}
          <rect x="66" y="76" width="16" height="14" rx="4" fill="#1E293B" />
          <rect x="69" y="79" width="10" height="8" rx="2" fill="#64748B" />
        </g>

        {/* Main Camper Body (Mansardato) */}
        {/* Rear/Main Box */}
        <rect x="14" y="24" width="72" height="56" rx="10" fill="#FFFDF7" stroke="#1E293B" strokeWidth="3.5" />

        {/* TOP ORANGE DOME ROOF POD */}
        <path
          d="M 34 14 C 34 6 66 6 66 14 Z"
          fill="#F97316"
          stroke="#1E293B"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M 40 10 C 44 8 56 8 60 10" stroke="#FDBA74" strokeWidth="1.5" strokeLinecap="round" />

        {/* PROMINENT OVERCAB MANSARDA (Alcove above the cab) */}
        <path
          d="M 12 34 C 12 16, 26 12, 50 12 C 74 12, 88 16, 88 34 C 88 38, 80 42, 50 42 C 20 42, 12 38, 12 34 Z"
          fill="#FFF8E7"
          stroke="#1E293B"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Mansarda Orange Visor Band */}
        <path
          d="M 22 24 C 30 18, 70 18, 78 24 C 80 26, 76 29, 50 29 C 24 29, 20 26, 22 24 Z"
          fill="#F97316"
          stroke="#1E293B"
          strokeWidth="2"
        />
        {/* Mansarda Cyan Center Window */}
        <rect x="42" y="19" width="16" height="7" rx="2.5" fill="#38BDF8" stroke="#1E293B" strokeWidth="1.8" />
        <rect x="44" y="20" width="8" height="2" rx="1" fill="#FFFFFF" fillOpacity="0.8" />

        {/* Cab Lower Body (Vintage Sage Green Trim) */}
        <path
          d="M 14 56 L 86 56 L 86 68 C 86 74, 80 78, 72 78 L 28 78 C 20 78, 14 74, 14 68 Z"
          fill="#52A87B"
          stroke="#1E293B"
          strokeWidth="3.5"
        />

        {/* Front Bumper / Grille */}
        <rect x="24" y="68" width="52" height="10" rx="4" fill="#E2E8F0" stroke="#1E293B" strokeWidth="2.5" />
        {/* Radiator Grille */}
        <rect x="36" y="58" width="28" height="9" rx="2.5" fill="#334155" stroke="#1E293B" strokeWidth="1.8" />
        <line x1="40" y1="62" x2="60" y2="62" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />

        {/* Italian License Plate */}
        <g transform="translate(41, 71)">
          <rect x="0" y="0" width="18" height="6" rx="1" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1" />
          <rect x="0.5" y="0.5" width="3.5" height="5" fill="#16A34A" />
          <rect x="14" y="0.5" width="3.5" height="5" fill="#EF4444" />
        </g>

        {/* Big Front Windshield (The Face Canvas) */}
        <rect
          x="20"
          y="34"
          width="60"
          height="23"
          rx="7"
          fill="#BAE6FD"
          stroke="#1E293B"
          strokeWidth="3"
        />
        {/* Glass Shine Highlight */}
        <path
          d="M 23 37 Q 50 35 77 37 Q 75 40 23 40 Z"
          fill="#FFFFFF"
          opacity="0.5"
        />

        {/* CARTOON EYES */}
        {/* Left Eye */}
        <g id="left-eye">
          <ellipse cx="36" cy="45" rx="5" ry="6" fill="#0F172A" />
          <circle cx="37.5" cy="43.5" r="2" fill="#FFFFFF" />
          <circle cx="34.5" cy="47" r="1" fill="#FFFFFF" />
        </g>

        {/* Right Eye */}
        <g id="right-eye">
          <ellipse cx="64" cy="45" rx="5" ry="6" fill="#0F172A" />
          <circle cx="65.5" cy="43.5" r="2" fill="#FFFFFF" />
          <circle cx="62.5" cy="47" r="1" fill="#FFFFFF" />
        </g>

        {/* Happy Eyebrows */}
        <path d="M 31 37 Q 36 34 41 37" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M 59 37 Q 64 34 69 37" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* Cute Rosy Cheeks */}
        <ellipse cx="27" cy="50" rx="4" ry="2.2" fill="#FB7185" opacity="0.85" />
        <ellipse cx="73" cy="50" rx="4" ry="2.2" fill="#FB7185" opacity="0.85" />

        {/* Big Happy Smile Mouth */}
        <path
          d="M 45 49 Q 50 54 55 49"
          stroke="#1E293B"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Side Mirrors */}
        <rect x="10" y="40" width="7" height="12" rx="2.5" fill="#CBD5E1" stroke="#1E293B" strokeWidth="2" />
        <rect x="83" y="40" width="7" height="12" rx="2.5" fill="#E2E8F0" stroke="#1E293B" strokeWidth="2" />

        {/* Headlights */}
        <circle cx="19" cy="63" r="4.5" fill="#FEF08A" stroke="#1E293B" strokeWidth="2" />
        <circle cx="19" cy="63" r="2" fill="#FFFFFF" />

        <circle cx="81" cy="63" r="4.5" fill="#FEF08A" stroke="#1E293B" strokeWidth="2" />
        <circle cx="81" cy="63" r="2" fill="#FFFFFF" />
      </svg>
    </div>
  );
};

