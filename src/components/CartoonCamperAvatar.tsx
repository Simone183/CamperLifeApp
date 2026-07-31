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
        <rect x="14" y="28" width="72" height="52" rx="12" fill="#FFFFFF" stroke="#1E3A2B" strokeWidth="4" />

        {/* PROMINENT MANSARDA (Overhanging Alcove Roof above the cab) */}
        {/* Curved dome bulging forward at the top */}
        <path
          d="M 12 36 C 12 16, 26 10, 50 10 C 74 10, 88 16, 88 36 C 88 40, 80 44, 50 44 C 20 44, 12 40, 12 36 Z"
          fill="#FFF9E6"
          stroke="#1E3A2B"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* Mansarda Accent Stripe / Window */}
        <path
          d="M 24 22 C 32 16, 68 16, 76 22 C 78 24, 76 27, 50 27 C 24 27, 22 24, 24 22 Z"
          fill="#F59E0B"
          stroke="#1E3A2B"
          strokeWidth="2.5"
        />
        {/* Mansarda cute little window icon */}
        <rect x="42" y="16" width="16" height="8" rx="3" fill="#38BDF8" stroke="#1E3A2B" strokeWidth="2" />
        <line x1="50" y1="16" x2="50" y2="24" stroke="#1E3A2B" strokeWidth="1.5" />

        {/* Cab Lower Body (Emerald Green Trim) */}
        <path
          d="M 14 56 L 86 56 L 86 68 C 86 74, 80 78, 72 78 L 28 78 C 20 78, 14 74, 14 68 Z"
          fill="#10B981"
          stroke="#1E3A2B"
          strokeWidth="4"
        />

        {/* Front Bumper / Grille */}
        <rect x="26" y="70" width="48" height="9" rx="4.5" fill="#E2E8F0" stroke="#1E3A2B" strokeWidth="3" />
        {/* Bumper Grille Lines */}
        <line x1="36" y1="74" x2="42" y2="74" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
        <line x1="58" y1="74" x2="64" y2="74" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />

        {/* Big Front Windshield (The Face Canvas) */}
        <rect
          x="20"
          y="34"
          width="60"
          height="24"
          rx="8"
          fill="#38BDF8"
          stroke="#1E3A2B"
          strokeWidth="3.5"
        />
        {/* Glass Shine Highlight */}
        <path
          d="M 23 37 Q 50 35 77 37 Q 75 41 23 41 Z"
          fill="#FFFFFF"
          opacity="0.4"
        />

        {/* CARTOON EYES */}
        {/* Left Eye */}
        <g id="left-eye">
          <ellipse cx="36" cy="45" rx="5.5" ry="6.5" fill="#0F172A" />
          {/* Pupil highlight */}
          <circle cx="38" cy="43" r="2.2" fill="#FFFFFF" />
          <circle cx="34.5" cy="47" r="1" fill="#FFFFFF" />
        </g>

        {/* Right Eye */}
        <g id="right-eye">
          <ellipse cx="64" cy="45" rx="5.5" ry="6.5" fill="#0F172A" />
          {/* Pupil highlight */}
          <circle cx="66" cy="43" r="2.2" fill="#FFFFFF" />
          <circle cx="62.5" cy="47" r="1" fill="#FFFFFF" />
        </g>

        {/* Happy Eyebrows */}
        <path d="M 31 37 Q 36 34 41 37" stroke="#1E3A2B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M 59 37 Q 64 34 69 37" stroke="#1E3A2B" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* Cute Rosy Cheeks */}
        <ellipse cx="28" cy="51" rx="4" ry="2.5" fill="#F43F5E" opacity="0.65" />
        <ellipse cx="72" cy="51" rx="4" ry="2.5" fill="#F43F5E" opacity="0.65" />

        {/* Big Happy Smile Mouth */}
        <path
          d="M 44 50 Q 50 56 56 50"
          stroke="#1E3A2B"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />

        {/* Side Mirrors (Cute Ears) */}
        <rect x="9" y="40" width="8" height="12" rx="3" fill="#1E3A2B" />
        <rect x="83" y="40" width="8" height="12" rx="3" fill="#1E3A2B" />

        {/* Headlights */}
        <circle cx="18" cy="64" r="5" fill="#FDE047" stroke="#1E3A2B" strokeWidth="2.5" />
        <circle cx="18" cy="64" r="2" fill="#FFFFFF" />

        <circle cx="82" cy="64" r="5" fill="#FDE047" stroke="#1E3A2B" strokeWidth="2.5" />
        <circle cx="82" cy="64" r="2" fill="#FFFFFF" />

        {/* Roof Antenna / Star Sparkle */}
        <path d="M 50 10 L 50 4" stroke="#1E3A2B" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="50" cy="3" r="2.5" fill="#EF4444" />
      </svg>
    </div>
  );
};
