import React from 'react';

export interface RollyMascotIconProps {
  className?: string;
  size?: number;
  animate?: boolean;
  waving?: boolean;
  accessory?: 'none' | 'map' | 'headset';
  showSpeechBubble?: boolean;
  speechText?: string;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * High-fidelity animated 3D/cartoon mascot for Rolly (ViaCamper's beloved camper companion).
 * Faithfully crafted according to the official character model sheet:
 * - Vintage-modern cream & mint green mansardato body
 * - Tangerine orange roof dome & visor trim
 * - Big expressive kawaii anime eyes with sparkling catchlights and blink animation
 * - Sweet joyful smile & soft pink blush cheeks
 * - Luminous round headlights with warm glow
 * - Italian flag license plate & chrome bumpers
 * - Micro-animations: suspension float/bounce, blinking eyes, waving map hand
 */
export const RollyMascotIcon: React.FC<RollyMascotIconProps> = ({
  className = "w-12 h-12",
  size,
  animate = true,
  waving = false,
  accessory = 'none',
  showSpeechBubble = false,
  speechText,
  onClick,
}) => {
  const dynamicStyle = size ? { width: size, height: size } : undefined;

  return (
    <div
      onClick={onClick}
      style={dynamicStyle}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''
      } ${className}`}
    >
      {/* Optional Speech Bubble above Rolly */}
      {showSpeechBubble && speechText && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap bg-white dark:bg-slate-900 text-slate-800 dark:text-amber-100 text-[11px] font-black px-2.5 py-1 rounded-full shadow-lg border border-amber-400/80 animate-bounce pointer-events-none flex items-center gap-1">
          <span>✨</span>
          <span>{speechText}</span>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-slate-900 border-r border-b border-amber-400/80 transform rotate-45" />
        </div>
      )}

      {/* SVG Canvas with rich gradients and drop-shadows */}
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full overflow-visible ${animate ? 'rolly-suspension-float' : ''}`}
      >
        <defs>
          {/* Soft Ground Shadow Gradient */}
          <radialGradient id="rollyGroundShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0F172A" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
          </radialGradient>

          {/* Roof Orange Dome Gradient */}
          <linearGradient id="rollyRoofOrange" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FB923C" />
            <stop offset="60%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>

          {/* Cream Upper Mansarda Body Gradient */}
          <linearGradient id="rollyCreamBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFDF7" />
            <stop offset="80%" stopColor="#FEF3C7" />
            <stop offset="100%" stopColor="#FDE68A" />
          </linearGradient>

          {/* Mint Seafoam Lower Body Gradient */}
          <linearGradient id="rollyMintBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5EEAD4" />
            <stop offset="40%" stopColor="#2DD4BF" />
            <stop offset="100%" stopColor="#0D9488" />
          </linearGradient>

          {/* Windshield Glass Gradient */}
          <linearGradient id="rollyWindshield" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E0F2FE" />
            <stop offset="50%" stopColor="#BAE6FD" />
            <stop offset="100%" stopColor="#7DD3FC" />
          </linearGradient>

          {/* Glass Specular Reflection */}
          <linearGradient id="rollyGlassShine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* Chrome Headlight Gradient */}
          <radialGradient id="rollyHeadlightGlow" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="45%" stopColor="#FEF08A" />
            <stop offset="85%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </radialGradient>

          {/* Headlight Ray Flare */}
          <radialGradient id="rollyHeadlightFlare" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FEF08A" stopOpacity="0" />
          </radialGradient>

          {/* Cheek Blush Radial */}
          <radialGradient id="rollyBlush" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FB7185" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FB7185" stopOpacity="0" />
          </radialGradient>

          {/* Map Gradient */}
          <linearGradient id="rollyMapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="100%" stopColor="#FDE047" />
          </linearGradient>
        </defs>

        {/* 1. Ground Shadow (Squashes with suspension) */}
        <ellipse
          cx="60"
          cy="110"
          rx="44"
          ry="7"
          fill="url(#rollyGroundShadow)"
          className={animate ? 'rolly-shadow-pulse' : ''}
        />

        {/* 2. Wheels with rubber tread & silver rims */}
        <g id="wheels">
          {/* Left Front Wheel */}
          <rect x="22" y="90" width="18" height="18" rx="5" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
          <circle cx="31" cy="99" r="5" fill="#64748B" />
          <circle cx="31" cy="99" r="2.5" fill="#CBD5E1" />

          {/* Right Front Wheel */}
          <rect x="80" y="90" width="18" height="18" rx="5" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
          <circle cx="89" cy="99" r="5" fill="#64748B" />
          <circle cx="89" cy="99" r="2.5" fill="#CBD5E1" />
        </g>

        {/* 3. Main Body Structure (Warm Cream Mansardato) */}
        <rect
          x="18"
          y="28"
          width="84"
          height="68"
          rx="14"
          fill="url(#rollyCreamBody)"
          stroke="#1E293B"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* 4. Roof Orange Skylight Pod Dome */}
        <g id="roof-pod">
          <path
            d="M 40 18 C 40 8, 80 8, 80 18 Z"
            fill="url(#rollyRoofOrange)"
            stroke="#1E293B"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Highlight on dome */}
          <path
            d="M 47 13 C 52 10, 68 10, 73 13"
            stroke="#FED7AA"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* 5. Prominent Alcove Mansarda (The overcab front bulge) */}
        <path
          d="M 14 38 C 14 18, 30 14, 60 14 C 90 14, 106 18, 106 38 C 106 44, 96 48, 60 48 C 24 48, 14 44, 14 38 Z"
          fill="url(#rollyCreamBody)"
          stroke="#1E293B"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Mansarda Orange Visor / Sunshade Brow */}
        <path
          d="M 24 28 C 34 22, 86 22, 96 28 C 98 32, 92 34, 60 34 C 28 34, 22 32, 24 28 Z"
          fill="url(#rollyRoofOrange)"
          stroke="#1E293B"
          strokeWidth="2.5"
        />

        {/* Mansarda Small Attic Window */}
        <rect
          x="50"
          y="20"
          width="20"
          height="8.5"
          rx="3"
          fill="#38BDF8"
          stroke="#1E293B"
          strokeWidth="2"
        />
        <rect x="52" y="22" width="10" height="2" rx="1" fill="#FFFFFF" fillOpacity="0.85" />

        {/* 6. Lower Body / Apron (Vintage Seafoam Mint Green) */}
        <path
          d="M 18 66 L 102 66 L 102 82 C 102 90, 94 94, 84 94 L 36 94 C 26 94, 18 90, 18 82 Z"
          fill="url(#rollyMintBody)"
          stroke="#1E293B"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Mint Body Accent Stripe & Highlights */}
        <path
          d="M 20 68 L 100 68"
          stroke="#99F6E4"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* 7. Windshield (The Face Canvas) */}
        <rect
          x="25"
          y="38"
          width="70"
          height="28"
          rx="9"
          fill="url(#rollyWindshield)"
          stroke="#1E293B"
          strokeWidth="3.2"
        />

        {/* Diagonal Windshield Specular Reflection */}
        <path
          d="M 28 42 L 52 42 L 36 63 L 28 63 Z"
          fill="url(#rollyGlassShine)"
        />
        <path
          d="M 62 42 L 72 42 L 54 63 L 44 63 Z"
          fill="url(#rollyGlassShine)"
        />

        {/* 8. FACIAL EXPRESSION - The Soul of Rolly */}
        {/* Animated Blinking Eyes Group */}
        <g id="rolly-eyes" className={animate ? 'rolly-blink-group' : ''}>
          {/* Left Eye */}
          <g id="left-eye">
            <ellipse cx="43" cy="51" rx="6.5" ry="7.5" fill="#0B132B" />
            {/* Catchlights */}
            <circle cx="45" cy="49" r="2.6" fill="#FFFFFF" />
            <circle cx="41.5" cy="53.5" r="1.3" fill="#FFFFFF" />
          </g>

          {/* Right Eye */}
          <g id="right-eye">
            <ellipse cx="77" cy="51" rx="6.5" ry="7.5" fill="#0B132B" />
            {/* Catchlights */}
            <circle cx="79" cy="49" r="2.6" fill="#FFFFFF" />
            <circle cx="75.5" cy="53.5" r="1.3" fill="#FFFFFF" />
          </g>
        </g>

        {/* Cute Eyebrows */}
        <path
          d="M 37 42 Q 43 38 49 42"
          stroke="#1E293B"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 71 42 Q 77 38 83 42"
          stroke="#1E293B"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Soft Rosy Cheeks (Blush) */}
        <ellipse cx="33" cy="57" rx="5" ry="3" fill="url(#rollyBlush)" />
        <ellipse cx="87" cy="57" rx="5" ry="3" fill="url(#rollyBlush)" />

        {/* Big Cheerful Smile */}
        <path
          d="M 54 56 Q 60 62 66 56"
          stroke="#1E293B"
          strokeWidth="2.8"
          strokeLinecap="round"
          fill="#BE123C"
        />

        {/* 9. Front Grille & Radiator */}
        <rect
          x="44"
          y="69"
          width="32"
          height="11"
          rx="3"
          fill="#1E293B"
          stroke="#0F172A"
          strokeWidth="2"
        />
        {/* Grille Bars */}
        <line x1="48" y1="73" x2="72" y2="73" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="48" y1="77" x2="72" y2="77" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />

        {/* 10. Front Bumper with Italian License Plate */}
        <rect
          x="28"
          y="82"
          width="64"
          height="12"
          rx="4"
          fill="#E2E8F0"
          stroke="#1E293B"
          strokeWidth="2.5"
        />

        {/* Italian License Plate */}
        <g transform="translate(48, 85)">
          <rect x="0" y="0" width="24" height="7" rx="1.5" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1.2" />
          {/* Euro Green Band (left) */}
          <rect x="0.5" y="0.5" width="4" height="6" fill="#16A34A" rx="0.5" />
          {/* Italian Red Band (right) */}
          <rect x="19.5" y="0.5" width="4" height="6" fill="#EF4444" rx="0.5" />
          {/* Text/dots representation */}
          <circle cx="8" cy="3.5" r="0.8" fill="#1E293B" />
          <circle cx="12" cy="3.5" r="0.8" fill="#1E293B" />
          <circle cx="16" cy="3.5" r="0.8" fill="#1E293B" />
        </g>

        {/* 11. Vintage Headlights with Light Flare & Chrome Ring */}
        {/* Left Headlight */}
        <g id="left-headlight" className={animate ? 'rolly-headlight-pulse' : ''}>
          <circle cx="23" cy="74" r="8" fill="url(#rollyHeadlightFlare)" />
          <circle cx="23" cy="74" r="5.5" fill="url(#rollyHeadlightGlow)" stroke="#1E293B" strokeWidth="2.2" />
          <circle cx="21.5" cy="72.5" r="2" fill="#FFFFFF" fillOpacity="0.9" />
        </g>

        {/* Right Headlight */}
        <g id="right-headlight" className={animate ? 'rolly-headlight-pulse' : ''}>
          <circle cx="97" cy="74" r="8" fill="url(#rollyHeadlightFlare)" />
          <circle cx="97" cy="74" r="5.5" fill="url(#rollyHeadlightGlow)" stroke="#1E293B" strokeWidth="2.2" />
          <circle cx="95.5" cy="72.5" r="2" fill="#FFFFFF" fillOpacity="0.9" />
        </g>

        {/* 12. Side Mirrors */}
        <rect x="11" y="46" width="7" height="15" rx="3" fill="#CBD5E1" stroke="#1E293B" strokeWidth="2.2" />
        <line x1="18" y1="53" x2="25" y2="53" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" />

        <rect x="102" y="46" width="7" height="15" rx="3" fill="#E2E8F0" stroke="#1E293B" strokeWidth="2.2" />
        <line x1="95" y1="53" x2="102" y2="53" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" />

        {/* 13. Accessories / Pose */}
        {/* Headset (like Waze/CaraMaps navigator style) */}
        {accessory === 'headset' && (
          <g id="navigator-headset">
            {/* Headband over mansarda */}
            <path
              d="M 12 36 C 12 10, 108 10, 108 36"
              fill="none"
              stroke="#047857"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Left Ear Cushion */}
            <ellipse cx="12" cy="40" rx="4" ry="7" fill="#065F46" stroke="#1E293B" strokeWidth="2" />
            {/* Right Ear Cushion */}
            <ellipse cx="108" cy="40" rx="4" ry="7" fill="#065F46" stroke="#1E293B" strokeWidth="2" />
            {/* Microphone Boom */}
            <path
              d="M 108 42 Q 100 62 82 60"
              fill="none"
              stroke="#047857"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="80" cy="60" r="3" fill="#F59E0B" stroke="#1E293B" strokeWidth="1.5" />
          </g>
        )}

        {/* Waving Hand holding Map */}
        {(waving || accessory === 'map') && (
          <g id="waving-hand-with-map" className={animate ? 'rolly-waving-arm' : ''}>
            {/* Folded Travel Map */}
            <g transform="translate(94, 24) rotate(12)">
              <polygon
                points="0,0 18,-4 22,16 4,20"
                fill="url(#rollyMapGrad)"
                stroke="#1E293B"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              {/* Map folds & mini route */}
              <line x1="6" y1="-1" x2="8" y2="18" stroke="#F59E0B" strokeWidth="1.2" />
              <line x1="12" y1="-3" x2="14" y2="17" stroke="#F59E0B" strokeWidth="1.2" />
              <path d="M 2 8 Q 8 6 12 12 T 18 10" stroke="#EF4444" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            </g>

            {/* White Cartoon Glove Hand */}
            <circle cx="98" cy="38" r="5" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2" />
            <circle cx="95" cy="34" r="3" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1.5" />
          </g>
        )}
      </svg>
    </div>
  );
};
