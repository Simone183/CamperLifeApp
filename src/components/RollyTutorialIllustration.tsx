import React from 'react';
import { motion } from 'motion/react';

interface RollyTutorialIllustrationProps {
  variant: 'welcome' | 'map' | 'diary' | 'tools';
}

export const RollyTutorialIllustration: React.FC<RollyTutorialIllustrationProps> = ({ variant }) => {
  return (
    <div className="w-full h-52 sm:h-56 relative flex items-center justify-center overflow-hidden rounded-2xl select-none">
      {/* Dynamic Animated Vector Scene matching the reference comic storyboard */}
      <motion.div
        key={variant}
        initial={{ opacity: 0, scale: 0.94, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: -6 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 w-full h-full flex items-center justify-center"
      >
        <svg
          viewBox="0 0 380 230"
          className="w-full h-full max-h-56 drop-shadow-md overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* DEFINITIONS & GRADIENTS */}
          <defs>
            <linearGradient id="skyGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E0F2FE" />
              <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="skySunset" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FED7AA" />
              <stop offset="50%" stopColor="#FDBA74" />
              <stop offset="100%" stopColor="#DDD6FE" />
            </linearGradient>
            <linearGradient id="rollyCream" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFDF5" />
              <stop offset="100%" stopColor="#F6EEDB" />
            </linearGradient>
            <linearGradient id="rollyMansarda" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF9E8" />
              <stop offset="100%" stopColor="#F5ECCF" />
            </linearGradient>
            <linearGradient id="rollySageGreen" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5EAF85" />
              <stop offset="100%" stopColor="#438F68" />
            </linearGradient>
            <linearGradient id="rollyOrangeDome" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FB923C" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
            <linearGradient id="rollyGlass" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E0F2FE" />
              <stop offset="100%" stopColor="#BAE6FD" />
            </linearGradient>
            <linearGradient id="metalArm" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#94A3B8" />
            </linearGradient>
            <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64748B" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>

          {/* BACKGROUND CARD */}
          <rect x="2" y="2" width="376" height="226" rx="18" fill="url(#skyGrad1)" stroke="#CBD5E1" strokeWidth="1.5" />

          {/* ========================================================================= */}
          {/* STEP 1: WELCOME & ONBOARDING (Panel 1 from comic) */}
          {/* ========================================================================= */}
          {variant === 'welcome' && (
            <g id="step-welcome">
              {/* Sun & Italian Hills */}
              <circle cx="56" cy="42" r="26" fill="#FEF08A" fillOpacity="0.6" />
              <circle cx="56" cy="42" r="18" fill="#FACC15" />
              <path d="M 0 155 Q 80 110 160 145 T 380 135 L 380 228 L 0 228 Z" fill="#D1FAE5" />
              <path d="M 0 168 Q 110 130 220 160 T 380 150 L 380 228 L 0 228 Z" fill="#A7F3D0" />

              {/* Tuscan Cypress Trees */}
              <g transform="translate(18, 105)">
                <ellipse cx="6" cy="24" rx="7" ry="24" fill="#047857" />
                <rect x="4" y="44" width="4" height="12" fill="#78350F" />
              </g>
              <g transform="translate(34, 115)">
                <ellipse cx="5" cy="20" rx="5" ry="18" fill="#059669" />
                <rect x="3" y="34" width="4" height="10" fill="#78350F" />
              </g>

              {/* Road */}
              <path d="M 0 190 L 380 190 L 380 228 L 0 228 Z" fill="url(#roadGrad)" />
              <line x1="20" y1="208" x2="360" y2="208" stroke="#FDE047" strokeWidth="3" strokeDasharray="14 12" />

              {/* Smartphone mockup on the right displaying "WELCOME ViaCamper" */}
              <g transform="translate(262, 38)">
                {/* Phone Drop Shadow */}
                <rect x="0" y="0" width="86" height="152" rx="14" fill="#0F172A" fillOpacity="0.15" transform="translate(4, 4)" />
                {/* Phone Body */}
                <rect x="0" y="0" width="86" height="152" rx="14" fill="#0F172A" stroke="#334155" strokeWidth="2.5" />
                {/* Screen Glass */}
                <rect x="4" y="6" width="78" height="140" rx="10" fill="#F8FAFC" />
                {/* Screen Header */}
                <rect x="4" y="6" width="78" height="24" rx="8" fill="#1C3D2B" />
                <text x="43" y="21" fill="#FFFFFF" fontSize="7.5" fontWeight="900" textAnchor="middle" letterSpacing="0.5">
                  VIACAMPER
                </text>
                {/* Mini App UI inside phone */}
                <circle cx="43" cy="54" r="16" fill="#E2E8F0" />
                {/* Mini Rolly inside phone */}
                <rect x="32" y="46" width="22" height="16" rx="4" fill="#5EAF85" />
                <rect x="32" y="42" width="22" height="6" rx="2" fill="#FFF9E8" />
                <circle cx="39" cy="52" r="1.5" fill="#0F172A" />
                <circle cx="47" cy="52" r="1.5" fill="#0F172A" />
                {/* Welcome Card Pill */}
                <rect x="12" y="80" width="62" height="14" rx="7" fill="#10B981" />
                <text x="43" y="90" fill="#FFFFFF" fontSize="6.5" fontWeight="800" textAnchor="middle">
                  INIZIA ORA
                </text>
                {/* Mini Map preview lines */}
                <line x1="12" y1="106" x2="74" y2="106" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="116" x2="60" y2="116" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="126" x2="48" y2="126" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
              </g>

              {/* Friendly Speech Bubble from Rolly */}
              <g transform="translate(68, 22)">
                <rect x="0" y="0" width="128" height="34" rx="10" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2" />
                <polygon points="40,34 32,44 48,34" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2" />
                <polygon points="38,33 33,42 46,33" fill="#FFFFFF" />
                <text x="64" y="14" fill="#1E293B" fontSize="8.5" fontWeight="900" textAnchor="middle">
                  Ciao! Sono Rolly 👋
                </text>
                <text x="64" y="26" fill="#047857" fontSize="7.5" fontWeight="700" textAnchor="middle">
                  Creiamo il tuo percorso!
                </text>
              </g>

              {/* Rolly Character in 3/4 Isometric Perspective waving */}
              <g transform="translate(56, 68)">
                {/* Waving Robot Arm (Reaches up towards speech bubble) */}
                <g id="waving-arm">
                  {/* Shoulder Joint on flank */}
                  <circle cx="132" cy="74" r="5" fill="#475569" stroke="#1E293B" strokeWidth="1.5" />
                  {/* Bicep */}
                  <path d="M 134 72 L 158 52" stroke="url(#metalArm)" strokeWidth="6" strokeLinecap="round" />
                  <path d="M 134 72 L 158 52" stroke="#1E293B" strokeWidth="7" strokeLinecap="round" strokeOpacity="0.2" />
                  {/* Elbow Joint */}
                  <circle cx="158" cy="52" r="4.5" fill="#64748B" stroke="#1E293B" strokeWidth="1.5" />
                  {/* Forearm */}
                  <path d="M 158 52 L 174 24" stroke="url(#metalArm)" strokeWidth="5.5" strokeLinecap="round" />
                  {/* Hand Wrist & Fingers Waving */}
                  <circle cx="174" cy="24" r="4" fill="#F8FAFC" stroke="#1E293B" strokeWidth="1.5" />
                  {/* Cute mechanical 3-finger wave */}
                  <path d="M 174 22 C 172 16, 178 12, 182 14 C 185 16, 182 22, 177 24" fill="#F8FAFC" stroke="#1E293B" strokeWidth="1.5" />
                  <path d="M 177 22 C 180 18, 186 16, 188 20 C 188 23, 182 26, 178 25" fill="#F8FAFC" stroke="#1E293B" strokeWidth="1.5" />
                </g>

                {/* 3/4 ISOMETRIC CAMPER VEHICLE */}
                {/* Ground Shadow */}
                <ellipse cx="88" cy="124" rx="82" ry="12" fill="#0F172A" fillOpacity="0.22" />

                {/* Left/Front Wheels */}
                {/* Front Left Wheel */}
                <g transform="translate(24, 98)">
                  <rect x="0" y="0" width="16" height="24" rx="6" fill="#1E293B" stroke="#0F172A" strokeWidth="1.5" />
                  <rect x="3" y="4" width="10" height="16" rx="3" fill="#64748B" />
                  <circle cx="8" cy="12" r="3" fill="#CBD5E1" />
                </g>
                {/* Front Right Wheel */}
                <g transform="translate(68, 102)">
                  <rect x="0" y="0" width="14" height="22" rx="5" fill="#1E293B" stroke="#0F172A" strokeWidth="1.5" />
                  <rect x="2" y="3" width="10" height="16" rx="3" fill="#64748B" />
                  <circle cx="7" cy="11" r="3" fill="#CBD5E1" />
                </g>
                {/* Rear Right Wheel */}
                <g transform="translate(132, 98)">
                  <rect x="0" y="0" width="16" height="24" rx="6" fill="#1E293B" stroke="#0F172A" strokeWidth="1.5" />
                  <rect x="3" y="4" width="10" height="16" rx="3" fill="#64748B" />
                  <circle cx="8" cy="12" r="3" fill="#CBD5E1" />
                </g>

                {/* MAIN CAMPER BODY: FLANK & FRONT (3/4 PERSPECTIVE) */}
                {/* 1. Main Side Flank (Right side perspective) */}
                {/* Cream Upper Side Body */}
                <path
                  d="M 80 18 L 152 24 C 158 24 162 28 162 34 L 162 76 L 80 72 Z"
                  fill="url(#rollyCream)"
                  stroke="#1E293B"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />
                {/* Sage Green Lower Side Body */}
                <path
                  d="M 80 72 L 162 76 L 162 98 C 162 104 158 108 152 108 L 80 106 Z"
                  fill="url(#rollySageGreen)"
                  stroke="#1E293B"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />

                {/* Side Awning Cassette (Veranda on the roofline) */}
                <rect x="86" y="24" width="70" height="6" rx="2" fill="#E2E8F0" stroke="#1E293B" strokeWidth="1.5" />
                <path d="M 86 30 Q 92 34 98 30 Q 104 34 110 30 Q 116 34 122 30 Q 128 34 134 30 Q 140 34 146 30 Q 152 34 156 30" fill="none" stroke="#EA580C" strokeWidth="2" />

                {/* Side Camper Entrance Door */}
                <path d="M 94 40 L 114 42 L 114 102 L 94 100 Z" fill="#52A87B" stroke="#1E293B" strokeWidth="2" />
                {/* Door Window */}
                <rect x="98" y="46" width="12" height="18" rx="3" fill="#BAE6FD" stroke="#1E293B" strokeWidth="1.5" />
                {/* Door Handle */}
                <circle cx="98" cy="74" r="1.5" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1" />

                {/* Side Windows (Living Area) */}
                <path d="M 124 44 L 152 46 L 152 68 L 124 66 Z" fill="#BAE6FD" stroke="#1E293B" strokeWidth="2" />
                <line x1="138" y1="45" x2="138" y2="67" stroke="#1E293B" strokeWidth="1.5" />

                {/* 2. OVERCAB (MANSARDA) & ORANGE ROOF POD */}
                {/* Top Orange Dome Skylight Pod */}
                <path
                  d="M 52 2 C 52 -6 88 -6 98 2 C 104 7 100 12 90 12 L 46 10 C 44 6 48 3 52 2 Z"
                  fill="url(#rollyOrangeDome)"
                  stroke="#1E293B"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                {/* Top Dome Shine */}
                <path d="M 58 1 C 64 -3 84 -3 90 1" stroke="#FDBA74" strokeWidth="2" strokeLinecap="round" />

                {/* Overcab Mansarda Curving Forward */}
                <path
                  d="M 8 36 C 8 14 26 8 68 8 C 104 8 116 16 116 36 C 116 42 108 46 64 46 C 20 46 8 42 8 36 Z"
                  fill="url(#rollyMansarda)"
                  stroke="#1E293B"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />

                {/* Mansarda Front Orange Visor Band */}
                <path
                  d="M 18 24 C 28 18 84 18 96 24 C 98 28 92 32 58 32 C 24 32 16 28 18 24 Z"
                  fill="url(#rollyOrangeDome)"
                  stroke="#1E293B"
                  strokeWidth="2.5"
                />

                {/* Mansarda Cyan Center Window / Visor Vent */}
                <rect x="46" y="20" width="22" height="9" rx="3.5" fill="#38BDF8" stroke="#1E293B" strokeWidth="2" />
                <rect x="49" y="21" width="12" height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.8" />

                {/* Mansarda Side Window (Facing perspective) */}
                <rect x="94" y="20" width="14" height="12" rx="2.5" fill="#7DD3FC" stroke="#1E293B" strokeWidth="2" />
                <line x1="101" y1="20" x2="101" y2="32" stroke="#1E293B" strokeWidth="1.5" />

                {/* 3. FRONT CABIN & WINDSHIELD (KAWAII FACE) */}
                {/* Cream Front Face Panel */}
                <path
                  d="M 12 40 L 80 40 L 80 72 L 12 72 Z"
                  fill="url(#rollyCream)"
                  stroke="#1E293B"
                  strokeWidth="3"
                />
                {/* Sage Green Lower Front Cab */}
                <path
                  d="M 12 72 L 80 72 L 80 104 C 80 110 74 114 66 114 L 20 114 C 14 114 12 110 12 104 Z"
                  fill="url(#rollySageGreen)"
                  stroke="#1E293B"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />

                {/* Big Windshield Glass (The Face) */}
                <rect x="16" y="44" width="60" height="26" rx="8" fill="url(#rollyGlass)" stroke="#1E293B" strokeWidth="3" />
                {/* Windshield Shine Highlight */}
                <path d="M 20 48 Q 46 45 72 48 Q 68 53 20 53 Z" fill="#FFFFFF" fillOpacity="0.6" />

                {/* KAWAII SWEET EYES */}
                {/* Left Eye */}
                <g transform="translate(32, 57)">
                  <ellipse cx="0" cy="0" rx="5" ry="6" fill="#0F172A" />
                  <circle cx="-1.5" cy="-2" r="2" fill="#FFFFFF" />
                  <circle cx="1.5" cy="2" r="1" fill="#FFFFFF" />
                </g>
                {/* Right Eye */}
                <g transform="translate(60, 57)">
                  <ellipse cx="0" cy="0" rx="5" ry="6" fill="#0F172A" />
                  <circle cx="-1.5" cy="-2" r="2" fill="#FFFFFF" />
                  <circle cx="1.5" cy="2" r="1" fill="#FFFFFF" />
                </g>

                {/* Rosy Blush Cheeks */}
                <ellipse cx="24" cy="63" rx="4.5" ry="2.5" fill="#FB7185" fillOpacity="0.85" />
                <ellipse cx="68" cy="63" rx="4.5" ry="2.5" fill="#FB7185" fillOpacity="0.85" />

                {/* Smiling Happy Mouth */}
                <path d="M 42 61 Q 46 66 50 61" fill="none" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />

                {/* Side Mirrors */}
                <rect x="6" y="52" width="6" height="12" rx="2.5" fill="#CBD5E1" stroke="#1E293B" strokeWidth="2" />
                <rect x="76" y="52" width="6" height="12" rx="2.5" fill="#E2E8F0" stroke="#1E293B" strokeWidth="2" />

                {/* Headlights */}
                {/* Left Headlight */}
                <circle cx="20" cy="84" r="6" fill="#FEF08A" stroke="#1E293B" strokeWidth="2" />
                <circle cx="20" cy="84" r="4" fill="#FACC15" />
                <circle cx="20" cy="94" r="2.5" fill="#FB923C" stroke="#1E293B" strokeWidth="1.5" />
                {/* Right Headlight */}
                <circle cx="72" cy="84" r="6" fill="#FEF08A" stroke="#1E293B" strokeWidth="2" />
                <circle cx="72" cy="84" r="4" fill="#FACC15" />
                <circle cx="72" cy="94" r="2.5" fill="#FB923C" stroke="#1E293B" strokeWidth="1.5" />

                {/* Radiator Grille */}
                <rect x="30" y="80" width="32" height="12" rx="3.5" fill="#334155" stroke="#1E293B" strokeWidth="2" />
                <line x1="34" y1="84" x2="58" y2="84" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="34" y1="88" x2="58" y2="88" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />

                {/* Front Bumper */}
                <rect x="14" y="96" width="64" height="10" rx="4" fill="#E2E8F0" stroke="#1E293B" strokeWidth="2.5" />

                {/* Italian License Plate */}
                <g transform="translate(36, 100)">
                  <rect x="0" y="0" width="20" height="8" rx="1.5" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1.2" />
                  <rect x="1" y="1" width="4" height="6" fill="#16A34A" />
                  <rect x="15" y="1" width="4" height="6" fill="#EF4444" />
                </g>
              </g>
            </g>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: RICERCA & MAPPA (Panel 2 from comic) */}
          {/* ========================================================================= */}
          {variant === 'map' && (
            <g id="step-map">
              {/* Map background grid */}
              <rect x="12" y="12" width="356" height="206" rx="14" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />

              {/* Giant Glowing Digital Map of Italy Table */}
              <g transform="translate(140, 42)">
                {/* 3D Map Table Surface */}
                <path d="M 10 70 L 110 30 L 210 50 L 110 110 Z" fill="#E0F2FE" stroke="#0284C7" strokeWidth="2.5" />
                <path d="M 10 70 L 110 110 L 110 125 L 10 85 Z" fill="#0369A1" />
                <path d="M 110 110 L 210 50 L 210 65 L 110 125 Z" fill="#075985" />

                {/* Italy Peninsula shape glowing on map */}
                <path
                  d="M 60 52 Q 100 42 140 50 Q 120 75 100 90 Q 80 75 60 52 Z"
                  fill="#86EFAC"
                  stroke="#16A34A"
                  strokeWidth="2"
                />

                {/* POI Pins on the interactive map */}
                {/* Pin 1: Camping */}
                <g transform="translate(80, 56)">
                  <circle cx="8" cy="8" r="8" fill="#10B981" stroke="#065F46" strokeWidth="1.5" />
                  <path d="M 5 11 L 8 5 L 11 11 Z" fill="#FFFFFF" />
                </g>
                {/* Pin 2: Area Sosta */}
                <g transform="translate(125, 48)">
                  <circle cx="8" cy="8" r="8" fill="#3B82F6" stroke="#1E40AF" strokeWidth="1.5" />
                  <text x="8" y="11" fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle">P</text>
                </g>
                {/* Pin 3: Colosseo / Attraction */}
                <g transform="translate(110, 72)">
                  <circle cx="8" cy="8" r="9" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
                  <text x="8" y="11.5" fill="#FFFFFF" fontSize="7.5" fontWeight="bold" textAnchor="middle">★</text>
                </g>

                {/* Floating Filter Card */}
                <g transform="translate(-10, -15)">
                  <rect x="0" y="0" width="76" height="48" rx="8" fill="#FFFFFF" stroke="#64748B" strokeWidth="1.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))" />
                  <text x="38" y="12" fill="#0F172A" fontSize="6.5" fontWeight="bold" textAnchor="middle">FILTRI SOSTA</text>
                  <rect x="8" y="18" width="60" height="4" rx="2" fill="#E2E8F0" />
                  <rect x="8" y="18" width="40" height="4" rx="2" fill="#10B981" />
                  <rect x="8" y="28" width="60" height="4" rx="2" fill="#E2E8F0" />
                  <rect x="8" y="28" width="28" height="4" rx="2" fill="#3B82F6" />
                  <text x="38" y="42" fill="#10B981" fontSize="6" fontWeight="bold" textAnchor="middle">⭐⭐⭐⭐⭐ 4.8</text>
                </g>
              </g>

              {/* Rolly Character Leaning on the map table (Matching Comic Panel 2) */}
              <g transform="translate(24, 60)">
                {/* Robot Arms Touching Table */}
                <g id="arm-touching-map">
                  <path d="M 120 70 L 155 78" stroke="url(#metalArm)" strokeWidth="6" strokeLinecap="round" />
                  <circle cx="155" cy="78" r="4.5" fill="#64748B" stroke="#1E293B" strokeWidth="1.5" />
                  <path d="M 155 78 L 180 88" stroke="url(#metalArm)" strokeWidth="5" strokeLinecap="round" />
                  <circle cx="180" cy="88" r="3.5" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1.5" />
                </g>

                {/* Ground Shadow */}
                <ellipse cx="70" cy="130" rx="60" ry="10" fill="#0F172A" fillOpacity="0.2" />

                {/* Front Wheel */}
                <rect x="18" y="104" width="14" height="22" rx="5" fill="#1E293B" />
                <rect x="21" y="107" width="8" height="16" rx="2" fill="#64748B" />
                {/* Rear Wheel */}
                <rect x="105" y="104" width="14" height="22" rx="5" fill="#1E293B" />
                <rect x="108" y="107" width="8" height="16" rx="2" fill="#64748B" />

                {/* Flank */}
                <path d="M 64 22 L 126 26 L 126 76 L 64 74 Z" fill="url(#rollyCream)" stroke="#1E293B" strokeWidth="3" />
                <path d="M 64 74 L 126 76 L 126 104 L 64 104 Z" fill="url(#rollySageGreen)" stroke="#1E293B" strokeWidth="3" />
                <rect x="74" y="38" width="18" height="60" rx="3" fill="#52A87B" stroke="#1E293B" strokeWidth="2" />
                <rect x="100" y="44" width="20" height="22" rx="2" fill="#BAE6FD" stroke="#1E293B" strokeWidth="2" />

                {/* Mansarda & Top Orange Dome */}
                <path d="M 40 4 C 40 -3 72 -3 80 4 C 86 8 82 12 74 12 L 36 10 Z" fill="url(#rollyOrangeDome)" stroke="#1E293B" strokeWidth="2.5" />
                <path d="M 6 34 C 6 14 22 8 58 8 C 92 8 100 16 100 34 C 100 40 92 44 54 44 C 16 44 6 40 6 34 Z" fill="url(#rollyMansarda)" stroke="#1E293B" strokeWidth="3" />
                <path d="M 14 22 C 22 18 70 18 80 22 C 82 25 76 28 48 28 C 20 28 12 25 14 22 Z" fill="url(#rollyOrangeDome)" stroke="#1E293B" strokeWidth="2" />
                <rect x="38" y="18" width="18" height="8" rx="3" fill="#38BDF8" stroke="#1E293B" strokeWidth="1.5" />

                {/* Front Face */}
                <path d="M 10 40 L 64 40 L 64 74 L 10 74 Z" fill="url(#rollyCream)" stroke="#1E293B" strokeWidth="3" />
                <path d="M 10 74 L 64 74 L 64 106 L 10 106 Z" fill="url(#rollySageGreen)" stroke="#1E293B" strokeWidth="3" />
                <rect x="14" y="44" width="46" height="24" rx="6" fill="url(#rollyGlass)" stroke="#1E293B" strokeWidth="2.5" />

                {/* Kawaii Eyes Looking Right at the Map */}
                <g transform="translate(28, 55)">
                  <ellipse cx="0" cy="0" rx="4.5" ry="5.5" fill="#0F172A" />
                  <circle cx="1" cy="-1.5" r="1.8" fill="#FFFFFF" />
                </g>
                <g transform="translate(48, 55)">
                  <ellipse cx="0" cy="0" rx="4.5" ry="5.5" fill="#0F172A" />
                  <circle cx="1" cy="-1.5" r="1.8" fill="#FFFFFF" />
                </g>
                <ellipse cx="20" cy="62" rx="3.5" ry="2" fill="#FB7185" />
                <ellipse cx="56" cy="62" rx="3.5" ry="2" fill="#FB7185" />
                <path d="M 34 60 Q 38 64 42 60" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" fill="none" />

                {/* Headlights & Bumper */}
                <circle cx="16" cy="84" r="5" fill="#FEF08A" stroke="#1E293B" strokeWidth="2" />
                <circle cx="58" cy="84" r="5" fill="#FEF08A" stroke="#1E293B" strokeWidth="2" />
                <rect x="24" y="80" width="26" height="10" rx="3" fill="#334155" stroke="#1E293B" strokeWidth="1.5" />
                <rect x="12" y="96" width="52" height="9" rx="3" fill="#E2E8F0" stroke="#1E293B" strokeWidth="2" />
              </g>
            </g>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: NAVIGAZIONE & DIARIO (Panel 3 from comic) */}
          {/* ========================================================================= */}
          {variant === 'diary' && (
            <g id="step-diary">
              {/* Coastal Sunset Horizon */}
              <rect x="2" y="2" width="376" height="226" rx="18" fill="url(#skySunset)" />
              {/* Sun dipping in the ocean */}
              <circle cx="100" cy="140" r="32" fill="#FEF08A" fillOpacity="0.8" />
              <path d="M 0 140 Q 95 135 190 140 T 380 140 L 380 228 L 0 228 Z" fill="#0284C7" />
              <path d="M 0 145 Q 95 140 190 145 T 380 145 L 380 228 L 0 228 Z" fill="#0369A1" fillOpacity="0.6" />

              {/* Cliff & Curving Highway */}
              <path d="M 0 155 Q 120 120 240 170 T 380 160 L 380 228 L 0 228 Z" fill="#15803D" />
              <path d="M 0 180 Q 140 145 280 185 L 380 195 L 380 228 L 0 228 Z" fill="url(#roadGrad)" />
              <line x1="20" y1="200" x2="360" y2="215" stroke="#FDE047" strokeWidth="3" strokeDasharray="16 12" />

              {/* Scenic Highway Sign (Colosseo / Roma 150km) */}
              <g transform="translate(18, 52)">
                <rect x="0" y="0" width="98" height="42" rx="6" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.15))" />
                <path d="M 12 28 L 12 14 L 18 20 M 12 14 L 6 20" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <text x="56" y="16" fill="#FFFFFF" fontSize="7" fontWeight="bold" textAnchor="middle">PROSSIMA TAPPA</text>
                <text x="56" y="27" fill="#FDE047" fontSize="8" fontWeight="900" textAnchor="middle">Roma • 150 km</text>
                <text x="56" y="36" fill="#BAE6FD" fontSize="6" fontWeight="bold" textAnchor="middle">Navigatore Sagomato 3D</text>
                {/* Sign Post */}
                <rect x="46" y="42" width="6" height="50" fill="#64748B" />
              </g>

              {/* Floating Polaroid Photo (Diario di Bordo) */}
              <g transform="translate(275, 34) rotate(8)">
                <rect x="0" y="0" width="76" height="90" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.2))" />
                <rect x="6" y="6" width="64" height="60" rx="2" fill="#BAE6FD" />
                {/* Mountain peak in polaroid */}
                <polygon points="38,18 14,56 62,56" fill="#64748B" />
                <polygon points="38,18 30,32 46,32" fill="#FFFFFF" />
                <text x="38" y="79" fill="#1E293B" fontSize="6.5" fontWeight="bold" textAnchor="middle">Ricordi di Viaggio ❤️</text>
              </g>

              {/* Rolly driving joyfully on the highway (Matching Comic Panel 3) */}
              <g transform="translate(130, 85)">
                {/* Ground Shadow */}
                <ellipse cx="65" cy="98" rx="64" ry="10" fill="#0F172A" fillOpacity="0.25" />

                {/* Wheels */}
                <rect x="14" y="78" width="14" height="20" rx="5" fill="#1E293B" />
                <rect x="16" y="80" width="10" height="16" rx="3" fill="#64748B" />
                <rect x="88" y="78" width="14" height="20" rx="5" fill="#1E293B" />
                <rect x="90" y="80" width="10" height="16" rx="3" fill="#64748B" />

                {/* Flank */}
                <path d="M 52 16 L 108 20 L 108 58 L 52 56 Z" fill="url(#rollyCream)" stroke="#1E293B" strokeWidth="2.5" />
                <path d="M 52 56 L 108 58 L 108 80 L 52 78 Z" fill="url(#rollySageGreen)" stroke="#1E293B" strokeWidth="2.5" />
                <rect x="60" y="30" width="16" height="46" rx="2" fill="#52A87B" stroke="#1E293B" strokeWidth="1.5" />
                <rect x="82" y="32" width="18" height="18" rx="2" fill="#BAE6FD" stroke="#1E293B" strokeWidth="1.5" />

                {/* Mansarda & Top Orange Dome */}
                <path d="M 32 2 C 32 -4 60 -4 68 2 C 72 6 70 10 62 10 L 30 8 Z" fill="url(#rollyOrangeDome)" stroke="#1E293B" strokeWidth="2" />
                <path d="M 6 26 C 6 10 20 6 48 6 C 76 6 84 12 84 26 C 84 32 76 36 44 36 C 12 36 6 32 6 26 Z" fill="url(#rollyMansarda)" stroke="#1E293B" strokeWidth="2.5" />
                <path d="M 12 18 C 18 14 56 14 66 18 C 68 20 62 23 40 23 C 18 23 10 20 12 18 Z" fill="url(#rollyOrangeDome)" stroke="#1E293B" strokeWidth="1.8" />
                <rect x="32" y="15" width="14" height="6" rx="2.5" fill="#38BDF8" stroke="#1E293B" strokeWidth="1.5" />

                {/* Front Face */}
                <path d="M 8 30 L 52 30 L 52 58 L 8 58 Z" fill="url(#rollyCream)" stroke="#1E293B" strokeWidth="2.5" />
                <path d="M 8 58 L 52 58 L 52 82 L 8 82 Z" fill="url(#rollySageGreen)" stroke="#1E293B" strokeWidth="2.5" />
                <rect x="12" y="34" width="38" height="20" rx="5" fill="url(#rollyGlass)" stroke="#1E293B" strokeWidth="2.2" />

                {/* Eyes Driving with joy */}
                <ellipse cx="23" cy="44" rx="4" ry="4.5" fill="#0F172A" />
                <circle cx="24" cy="42.5" r="1.5" fill="#FFFFFF" />
                <ellipse cx="39" cy="44" rx="4" ry="4.5" fill="#0F172A" />
                <circle cx="40" cy="42.5" r="1.5" fill="#FFFFFF" />
                <ellipse cx="17" cy="49" rx="3" ry="1.8" fill="#FB7185" />
                <ellipse cx="45" cy="49" rx="3" ry="1.8" fill="#FB7185" />
                <path d="M 28 47 Q 31 51 34 47" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" fill="none" />

                {/* Headlights & Bumper */}
                <circle cx="14" cy="66" r="4.5" fill="#FEF08A" stroke="#1E293B" strokeWidth="1.8" />
                <circle cx="46" cy="66" r="4.5" fill="#FEF08A" stroke="#1E293B" strokeWidth="1.8" />
                <rect x="20" y="64" width="20" height="8" rx="2.5" fill="#334155" stroke="#1E293B" strokeWidth="1.5" />
                <rect x="10" y="76" width="42" height="8" rx="3" fill="#E2E8F0" stroke="#1E293B" strokeWidth="2" />
              </g>
            </g>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: STRUMENTI & SOSTA LIBERA (Panel 4 from comic) */}
          {/* ========================================================================= */}
          {variant === 'tools' && (
            <g id="step-tools">
              {/* Peaceful Sunset Campsite */}
              <rect x="2" y="2" width="376" height="226" rx="18" fill="url(#skySunset)" />
              <circle cx="310" cy="60" r="30" fill="#FDE047" fillOpacity="0.8" />
              <path d="M 0 145 Q 110 115 220 140 T 380 130 L 380 228 L 0 228 Z" fill="#4ADE80" fillOpacity="0.6" />
              <path d="M 0 165 Q 120 140 240 160 T 380 155 L 380 228 L 0 228 Z" fill="#16A34A" />

              {/* Rolly Parked with Extended Awning (Veranda aperta), Table & Chairs (Matching Comic Panel 4) */}
              <g transform="translate(58, 62)">
                {/* EXTENDED AWNING (Tettoia aperta) */}
                {/* Fabric Canopy */}
                <path
                  d="M 64 24 L 14 42 L 14 46 L 64 28 Z"
                  fill="#E2E8F0"
                  stroke="#1E293B"
                  strokeWidth="2"
                />
                <path d="M 14 42 L 14 46 L 64 28 L 64 24 Z" fill="#EA580C" fillOpacity="0.8" />
                {/* Awning Aluminum Poles */}
                <line x1="14" y1="46" x2="14" y2="124" stroke="#64748B" strokeWidth="2.5" />
                <line x1="64" y1="28" x2="64" y2="124" stroke="#64748B" strokeWidth="2" strokeDasharray="3 3" opacity="0.4" />

                {/* Cozy Camping Table & Chairs under Awning */}
                <g transform="translate(18, 92)">
                  {/* Camping Table */}
                  <rect x="10" y="16" width="26" height="4" rx="1" fill="#78350F" stroke="#1E293B" strokeWidth="1.2" />
                  <line x1="14" y1="20" x2="10" y2="32" stroke="#475569" strokeWidth="1.8" />
                  <line x1="32" y1="20" x2="36" y2="32" stroke="#475569" strokeWidth="1.8" />
                  {/* Mug on table */}
                  <rect x="20" y="11" width="5" height="5" rx="1" fill="#EF4444" />
                  {/* Chair Left */}
                  <path d="M 2 18 L 8 18 L 8 26 L 2 26 Z" fill="#0284C7" stroke="#1E293B" strokeWidth="1" />
                  <line x1="4" y1="26" x2="2" y2="32" stroke="#475569" strokeWidth="1.5" />
                  <line x1="6" y1="26" x2="8" y2="32" stroke="#475569" strokeWidth="1.5" />
                </g>

                {/* Rolly Vehicle Body */}
                <ellipse cx="105" cy="126" rx="68" ry="11" fill="#0F172A" fillOpacity="0.22" />

                {/* Wheels */}
                <rect x="46" y="102" width="14" height="22" rx="5" fill="#1E293B" />
                <rect x="48" y="104" width="10" height="16" rx="3" fill="#64748B" />
                <rect x="124" y="102" width="14" height="22" rx="5" fill="#1E293B" />
                <rect x="126" y="104" width="10" height="16" rx="3" fill="#64748B" />

                {/* Flank */}
                <path d="M 88 20 L 148 24 L 148 72 L 88 68 Z" fill="url(#rollyCream)" stroke="#1E293B" strokeWidth="3" />
                <path d="M 88 68 L 148 72 L 148 102 L 88 100 Z" fill="url(#rollySageGreen)" stroke="#1E293B" strokeWidth="3" />
                <rect x="96" y="34" width="18" height="60" rx="2" fill="#52A87B" stroke="#1E293B" strokeWidth="1.8" />
                <rect x="120" y="38" width="22" height="20" rx="2" fill="#BAE6FD" stroke="#1E293B" strokeWidth="1.8" />

                {/* Mansarda & Top Orange Dome */}
                <path d="M 62 2 C 62 -4 92 -4 100 2 C 104 6 102 10 94 10 L 58 8 Z" fill="url(#rollyOrangeDome)" stroke="#1E293B" strokeWidth="2.5" />
                <path d="M 28 30 C 28 12 44 6 78 6 C 110 6 118 14 118 30 C 118 36 110 40 74 40 C 38 40 28 36 28 30 Z" fill="url(#rollyMansarda)" stroke="#1E293B" strokeWidth="3" />
                <path d="M 36 20 C 44 15 88 15 98 20 C 100 23 94 26 68 26 C 42 26 34 23 36 20 Z" fill="url(#rollyOrangeDome)" stroke="#1E293B" strokeWidth="2" />
                <rect x="58" y="16" width="16" height="7" rx="3" fill="#38BDF8" stroke="#1E293B" strokeWidth="1.5" />

                {/* Front Face */}
                <path d="M 32 36 L 86 36 L 86 68 L 32 68 Z" fill="url(#rollyCream)" stroke="#1E293B" strokeWidth="2.8" />
                <path d="M 32 68 L 86 68 L 86 104 L 32 104 Z" fill="url(#rollySageGreen)" stroke="#1E293B" strokeWidth="2.8" />
                <rect x="36" y="40" width="46" height="24" rx="6" fill="url(#rollyGlass)" stroke="#1E293B" strokeWidth="2.5" />

                {/* Relaxed / Happy Eyes */}
                <g transform="translate(48, 51)">
                  <ellipse cx="0" cy="0" rx="4.5" ry="5.5" fill="#0F172A" />
                  <circle cx="1.2" cy="-1.5" r="1.8" fill="#FFFFFF" />
                </g>
                <g transform="translate(70, 51)">
                  <ellipse cx="0" cy="0" rx="4.5" ry="5.5" fill="#0F172A" />
                  <circle cx="1.2" cy="-1.5" r="1.8" fill="#FFFFFF" />
                </g>
                <ellipse cx="40" cy="57" rx="4" ry="2" fill="#FB7185" />
                <ellipse cx="78" cy="57" rx="4" ry="2" fill="#FB7185" />
                <path d="M 55 56 Q 59 61 63 56" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" fill="none" />

                {/* Headlights & Bumper */}
                <circle cx="38" cy="78" r="5" fill="#FEF08A" stroke="#1E293B" strokeWidth="2" />
                <circle cx="80" cy="78" r="5" fill="#FEF08A" stroke="#1E293B" strokeWidth="2" />
                <rect x="46" y="75" width="26" height="10" rx="3" fill="#334155" stroke="#1E293B" strokeWidth="1.5" />
                <rect x="34" y="94" width="54" height="9" rx="3" fill="#E2E8F0" stroke="#1E293B" strokeWidth="2" />
              </g>

              {/* Floating Tool Badges on the right */}
              {/* 1. Spirit Bubble Level Gauge */}
              <g transform="translate(258, 42)">
                <rect x="0" y="0" width="102" height="34" rx="8" fill="#F59E0B" stroke="#D97706" strokeWidth="2" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))" />
                <rect x="14" y="7" width="74" height="20" rx="10" fill="#22C55E" stroke="#15803D" strokeWidth="1.5" />
                <line x1="46" y1="7" x2="46" y2="27" stroke="#15803D" strokeWidth="1.5" />
                <line x1="56" y1="7" x2="56" y2="27" stroke="#15803D" strokeWidth="1.5" />
                <circle cx="51" cy="17" r="5.5" fill="#FFFFFF" fillOpacity="0.9" />
                <text x="51" y="5" fill="#78350F" fontSize="6.5" fontWeight="bold" textAnchor="middle">LIVELLA 3D</text>
              </g>

              {/* 2. Battery & Solar Autonomy Badge */}
              <g transform="translate(268, 92)">
                <rect x="0" y="0" width="92" height="36" rx="8" fill="#0284C7" stroke="#0369A1" strokeWidth="2" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))" />
                <circle cx="18" cy="18" r="10" fill="#FDE047" />
                <path d="M 18 12 L 14 19 L 18 19 L 17 24 L 23 17 L 19 17 Z" fill="#EA580C" />
                <text x="54" y="18" fontSize="10" fontWeight="900" fill="#FFFFFF" textAnchor="middle">100%</text>
                <text x="54" y="27" fontSize="6" fontWeight="bold" fill="#BAE6FD" textAnchor="middle">AUTONOMIA</text>
              </g>
            </g>
          )}
        </svg>
      </motion.div>
    </div>
  );
};

