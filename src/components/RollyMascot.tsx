import React from 'react';
import { motion } from 'motion/react';

interface RollyMascotProps {
  className?: string;
  variant?: 'welcome' | 'map' | 'diary' | 'tools';
}

export const RollyMascot: React.FC<RollyMascotProps> = ({ className = '', variant = 'welcome' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className} w-44 h-44 mx-auto`}>
      <motion.div
        initial={{ y: 6, scale: 0.95, opacity: 0 }}
        animate={{ y: [0, -4, 0], scale: 1, opacity: 1 }}
        transition={{
          y: { repeat: Infinity, duration: 3, ease: "easeInOut" },
          scale: { duration: 0.3 },
          opacity: { duration: 0.3 }
        }}
        className="w-full h-full flex items-center justify-center"
      >
        <svg
          viewBox="0 0 340 380"
          className="w-full h-full drop-shadow-md select-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Defs for gradients & filters */}
          <defs>
            <linearGradient id="roofBoxGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F98A2C" />
              <stop offset="100%" stopColor="#D95F12" />
            </linearGradient>
            <linearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E2F5FC" />
              <stop offset="100%" stopColor="#B3E3F5" />
            </linearGradient>
            <linearGradient id="greenBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#67BD90" />
              <stop offset="100%" stopColor="#52A87B" />
            </linearGradient>
          </defs>

          {/* Ground Soft Shadow */}
          <ellipse cx="175" cy="335" rx="120" ry="22" fill="#1E293B" fillOpacity="0.14" />
          <ellipse cx="160" cy="333" rx="85" ry="14" fill="#0F172A" fillOpacity="0.18" />

          {/* MAIN VEHICLE GROUP */}
          <g id="rolly-camper" transform="translate(10, 0)">

            {/* 1. WHEELS */}
            {/* Rear Right Wheel */}
            <g id="wheel-rear-right">
              <ellipse cx="265" cy="245" rx="16" ry="24" fill="#2D3748" stroke="#1E293B" strokeWidth="4" />
              <ellipse cx="265" cy="245" rx="8" ry="12" fill="#94A3B8" stroke="#1E293B" strokeWidth="2.5" />
            </g>

            {/* Front Left Wheel */}
            <g id="wheel-front-left">
              <ellipse cx="76" cy="285" rx="16" ry="24" fill="#2D3748" stroke="#1E293B" strokeWidth="4" />
              <ellipse cx="76" cy="285" rx="8" ry="12" fill="#64748B" stroke="#1E293B" strokeWidth="2.5" />
            </g>

            {/* Front Right Wheel */}
            <g id="wheel-front-right">
              <ellipse cx="195" cy="285" rx="18" ry="26" fill="#2D3748" stroke="#1E293B" strokeWidth="4" />
              <ellipse cx="195" cy="285" rx="9" ry="13" fill="#94A3B8" stroke="#1E293B" strokeWidth="2.5" />
              <ellipse cx="195" cy="285" rx="4" ry="6" fill="#F1F5F9" />
            </g>

            {/* 2. REAR BODY & SIDE PANELS */}
            {/* Side Wall (Mint green bottom half) - Straightened */}
            <path
              d="M 170 230 L 290 175 L 290 220 L 170 280 Z"
              fill="url(#greenBodyGrad)"
              stroke="#1E293B"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* Side Wall (Cream upper half) - Straightened */}
            <path
              d="M 170 145 L 290 90 L 290 175 L 170 230 Z"
              fill="#F7EED6"
              stroke="#1E293B"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* ROOF STRUCTURE */}
            {/* Main Roof Arch - Straightened */}
            <path
              d="M 105 82 L 170 148 L 290 90 L 225 60 Z"
              fill="#EDE1BF"
              stroke="#1E293B"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* ROOF BOX (Top Orange Luggage Box) */}
            <path
              d="M 125 65 C 125 45 155 30 195 34 C 230 37 245 52 242 68 L 195 75 C 158 73 132 71 125 65 Z"
              fill="url(#roofBoxGrad)"
              stroke="#1E293B"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Roof Box Highlight */}
            <path
              d="M 135 56 C 140 45 162 38 192 40 C 215 42 228 49 228 58 L 190 62 C 158 60 142 59 135 56 Z"
              fill="#FDBA74"
            />

            {/* OVERCAB ALCOVE BROW (Cream overhang above windshield) */}
            <path
              d="M 52 128 C 48 105 65 82 98 72 C 130 62 165 72 172 95 C 176 108 175 132 168 145 L 68 180 C 55 168 53 145 52 128 Z"
              fill="#FAF2DC"
              stroke="#1E293B"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* OVERCAB ORANGE VISOR & CENTRAL BLUE LIGHT */}
            <path
              d="M 58 146 C 56 134 64 122 84 116 L 152 132 C 158 142 155 152 146 158 L 78 166 C 63 164 59 154 58 146 Z"
              fill="url(#roofBoxGrad)"
              stroke="#1E293B"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Central blue light badge on visor */}
            <rect
              x="96"
              y="122"
              width="36"
              height="20"
              rx="8"
              transform="rotate(13 96 122)"
              fill="#7DD3FC"
              stroke="#1E293B"
              strokeWidth="3.5"
            />
            <rect
              x="102"
              y="125"
              width="24"
              height="6"
              rx="3"
              transform="rotate(13 102 125)"
              fill="#FFFFFF"
              fillOpacity="0.8"
            />

            {/* SIDE WINDOWS & DOOR */}
            {/* Overcab small side window */}
            <path
              d="M 195 110 L 222 99 L 222 120 L 195 131 Z"
              fill="#BAE6FD"
              stroke="#1E293B"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            <line x1="209" y1="104" x2="209" y2="125" stroke="#1E293B" strokeWidth="2.5" />

            {/* Side main rectangular window */}
            <path
              d="M 255 134 L 284 122 L 284 152 L 255 164 Z"
              fill="#BAE6FD"
              stroke="#1E293B"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            <line x1="270" y1="128" x2="270" y2="158" stroke="#1E293B" strokeWidth="2.5" />

            {/* Side entry door */}
            <path
              d="M 228 148 L 248 140 C 251 139 253 141 253 144 L 253 236 C 253 238 251 240 248 241 L 228 249 C 225 250 223 248 223 245 L 223 153 C 223 150 225 148 228 148 Z"
              fill="#67BD90"
              stroke="#1E293B"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {/* Door window */}
            <path
              d="M 231 156 L 244 150 C 246 149 247 150 247 152 L 247 180 C 247 182 246 183 244 184 L 231 189 C 229 190 228 189 228 187 L 228 159 C 228 157 229 156 231 156 Z"
              fill="#BAE6FD"
              stroke="#1E293B"
              strokeWidth="2.5"
            />
            {/* Door Handle */}
            <ellipse cx="246" cy="200" rx="2.5" ry="4" fill="#1E293B" />

            {/* Cabin side driver window */}
            <path
              d="M 180 170 L 210 157 C 213 156 215 158 215 161 L 215 198 C 215 201 212 203 209 204 L 180 216 Z"
              fill="#BAE6FD"
              stroke="#1E293B"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />

            {/* 3. FRONT HOOD & NOSE (Cream Upper / Mint Lower) */}
            {/* Front hood cream */}
            <path
              d="M 60 178 L 170 146 L 178 212 L 60 240 Z"
              fill="#FAF2DC"
              stroke="#1E293B"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* Front nose mint green */}
            <path
              d="M 58 238 L 178 210 C 183 209 186 212 186 217 L 182 254 C 182 258 178 261 172 263 L 60 286 C 53 287 48 282 48 276 L 48 245 C 48 240 53 238 58 238 Z"
              fill="url(#greenBodyGrad)"
              stroke="#1E293B"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* 4. WINDSHIELD (KAWAII FACE) */}
            <path
              d="M 64 175 L 165 148 C 169 147 171 150 171 154 L 167 210 C 167 214 163 216 159 217 L 64 238 C 59 239 56 236 56 231 L 60 180 C 60 177 62 175 64 175 Z"
              fill="url(#glassGrad)"
              stroke="#1E293B"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* Windshield Reflection Bar */}
            <path
              d="M 68 180 L 158 155 C 161 154 163 156 163 159 L 162 170 L 68 194 Z"
              fill="#FFFFFF"
              fillOpacity="0.75"
            />

            {/* KAWAII SWEET EYES & SMILE */}
            {/* Left Eye */}
            <g transform="translate(85, 194)">
              <ellipse cx="0" cy="0" rx="9" ry="10" fill="#1E293B" />
              <circle cx="-3" cy="-3" r="3.5" fill="#FFFFFF" />
              <circle cx="3" cy="3" r="1.8" fill="#FFFFFF" />
            </g>

            {/* Right Eye */}
            <g transform="translate(138, 180)">
              <ellipse cx="0" cy="0" rx="9" ry="10" fill="#1E293B" />
              <circle cx="-3" cy="-3" r="3.5" fill="#FFFFFF" />
              <circle cx="3" cy="3" r="1.8" fill="#FFFFFF" />
            </g>

            {/* Pink Cheeks */}
            <ellipse cx="72" cy="206" rx="8" ry="5" fill="#FFAAA6" fillOpacity="0.9" />
            <ellipse cx="152" cy="190" rx="8" ry="5" fill="#FFAAA6" fillOpacity="0.9" />

            {/* Mouth Smile */}
            <path
              d="M 100 203 C 108 213 120 209 124 199"
              fill="none"
              stroke="#1E293B"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* 5. FRONT DETAILS: LIGHTS, GRILLE, BUMPER, PLATE */}
            {/* Left Headlight */}
            <g transform="translate(56, 255)">
              <circle cx="0" cy="0" r="11" fill="#FEF08A" stroke="#1E293B" strokeWidth="3.5" />
              <circle cx="0" cy="0" r="7" fill="#FACC15" />
              <circle cx="-2" cy="-2" r="2.5" fill="#FFFFFF" />
              {/* Amber Indicator Below */}
              <circle cx="0" cy="15" r="5" fill="#FB923C" stroke="#1E293B" strokeWidth="2.5" />
            </g>

            {/* Right Headlight */}
            <g transform="translate(158, 235)">
              <circle cx="0" cy="0" r="11" fill="#FEF08A" stroke="#1E293B" strokeWidth="3.5" />
              <circle cx="0" cy="0" r="7" fill="#FACC15" />
              <circle cx="-2" cy="-2" r="2.5" fill="#FFFFFF" />
              {/* Amber Indicator Below */}
              <circle cx="0" cy="15" r="5" fill="#FB923C" stroke="#1E293B" strokeWidth="2.5" />
            </g>

            {/* Radiator Grille */}
            <path
              d="M 74 256 L 140 240 C 143 239 145 241 145 244 L 144 264 C 144 267 142 269 139 270 L 73 285 C 70 286 68 284 68 281 L 69 261 C 69 258 71 256 74 256 Z"
              fill="#334155"
              stroke="#1E293B"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            <line x1="78" y1="264" x2="135" y2="251" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
            <line x1="78" y1="274" x2="135" y2="261" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />

            {/* Front Bumper Bar */}
            <path
              d="M 45 270 L 178 240 C 184 238 188 242 188 248 L 184 268 C 184 273 179 276 173 278 L 52 302 C 45 303 40 298 40 291 L 42 278 C 42 273 44 270 45 270 Z"
              fill="#E2E8F0"
              stroke="#1E293B"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* Italian License Plate */}
            <g transform="translate(86, 278) rotate(-7)">
              <rect x="0" y="0" width="38" height="16" rx="3.5" fill="#FFFFFF" stroke="#1E293B" strokeWidth="3" />
              {/* Green Left Band */}
              <path d="M 1.5 1.5 L 12 1.5 L 12 14.5 L 1.5 14.5 Z" fill="#16A34A" />
              {/* White Center with cute dots */}
              <circle cx="17" cy="8" r="1.5" fill="#1E293B" />
              <circle cx="22" cy="8" r="1.5" fill="#1E293B" />
              {/* Red Right Band */}
              <path d="M 26.5 1.5 L 36.5 1.5 L 36.5 14.5 L 26.5 14.5 Z" fill="#EF4444" />
            </g>

            {/* 6. SIDE MIRRORS */}
            {/* Passenger Side Mirror */}
            <path d="M 54 200 L 42 198" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
            <rect x="30" y="186" width="15" height="26" rx="6" fill="#CBD5E1" stroke="#1E293B" strokeWidth="3.5" />
            {/* Driver Side Mirror */}
            <path d="M 178 182 L 192 180" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
            <rect x="188" y="168" width="16" height="28" rx="6" fill="#E2E8F0" stroke="#1E293B" strokeWidth="3.5" />

            {/* 7. PROPS PER TOUR STEPS */}
            {variant === 'map' && (
              <g transform="translate(215, 25) rotate(14)">
                <path
                  d="M 22 0 C 9.8 0 0 9.8 0 22 C 0 38.5 22 58 22 58 C 22 58 44 38.5 44 22 C 44 9.8 34.2 0 22 0 Z"
                  fill="#EF4444"
                  stroke="#1E293B"
                  strokeWidth="3.5"
                />
                <circle cx="22" cy="20" r="9" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.5" />
                <path d="M 12 12 C 15 6 22 6 26 8" stroke="#FCA5A5" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            )}

            {variant === 'diary' && (
              <g transform="translate(210, 30) rotate(12)">
                <rect x="0" y="0" width="46" height="54" rx="4" fill="#FFFFFF" stroke="#1E293B" strokeWidth="3.5" />
                <rect x="5" y="5" width="36" height="34" rx="2" fill="#38BDF8" stroke="#1E293B" strokeWidth="2" />
                <path d="M 5 36 L 17 20 L 26 30 L 33 22 L 41 36 Z" fill="#16A34A" />
                <path d="M 17 20 L 21 26 L 14 26 Z" fill="#FFFFFF" />
                <circle cx="34" cy="13" r="4" fill="#FACC15" />
              </g>
            )}

            {variant === 'tools' && (
              <g transform="translate(15, 80) rotate(-22)">
                <path
                  d="M 12 6 C 18 6 22 10 22 15 L 38 31 C 41 34 41 39 38 42 C 35 45 30 45 27 42 L 11 26 C 6 26 2 22 2 16 C 2 12 5 8 8 6 Z"
                  fill="#94A3B8"
                  stroke="#1E293B"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="16" r="4" fill="#E2E8F0" stroke="#1E293B" strokeWidth="2" />
              </g>
            )}
          </g>
        </svg>
      </motion.div>
    </div>
  );
};
