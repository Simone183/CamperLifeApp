import React from 'react';

interface CamperLifeIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

export function CamperLifeIcon({ size = 44, className, ...props }: CamperLifeIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 500"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      <defs>
        {/* Curved path for top text "CAMPER LIFE" - wider arc for beautiful spacing */}
        <path id="badge-top-path" d="M 75,250 A 175,175 0 0,1 425,250" fill="none" />
        {/* Curved path for bottom text "APP" */}
        <path id="badge-bottom-path" d="M 425,250 A 175,175 0 0,1 75,250" fill="none" />
        
        {/* Circular clipping path for the detailed center scene */}
        <clipPath id="scenery-clip">
          <circle cx="250" cy="250" r="148" />
        </clipPath>
      </defs>

      {/* --- BACKGROUND BACKGROUND & OUTER DOUBLE CIRCLES --- */}
      {/* Absolute white bg inside bounds to make black lines pop on any app header bg */}
      <circle cx="250" cy="250" r="235" fill="#ffffff" />
      
      {/* Outer borders */}
      <circle cx="250" cy="250" r="235" fill="none" stroke="currentColor" strokeWidth="8" />
      <circle cx="250" cy="250" r="223" fill="none" stroke="currentColor" strokeWidth="2.5" />
      
      {/* Inner scenery frame border */}
      <circle cx="250" cy="250" r="152" fill="none" stroke="currentColor" strokeWidth="6" />

      {/* --- TYPOGRAPHY: CAMPER LIFE & APP in elegant Serif style --- */}
      <text fontStyle="normal" fontWeight="900" fill="currentColor">
        <textPath href="#badge-top-path" startOffset="50%" textAnchor="middle" className="font-serif select-none" style={{ fontSize: '42px', letterSpacing: '4px' }}>
          CAMPER LIFE
        </textPath>
      </text>

      <text fontStyle="normal" fontWeight="900" fill="currentColor">
        <textPath href="#badge-bottom-path" startOffset="50%" textAnchor="middle" className="font-serif select-none" style={{ fontSize: '38px', letterSpacing: '10px' }}>
          APP
        </textPath>
      </text>

      {/* --- MAIN CORE SCENERY (Clipped to Central Circle) --- */}
      <g clipPath="url(#scenery-clip)">
        {/* White scenery background filling */}
        <circle cx="250" cy="250" r="148" fill="#ffffff" />

        {/* --- SKYLINE ELEMENTS --- */}
        {/* Distant Sun on upper right */}
        <g stroke="currentColor" strokeWidth="1.5" fill="none">
          <circle cx="325" cy="175" r="26" />
          {/* Ray lines */}
          <line x1="325" y1="140" x2="325" y2="134" />
          <line x1="300" y1="155" x2="295" y2="152" />
          <line x1="350" y1="155" x2="355" y2="152" />
          <line x1="289" y1="175" x2="284" y2="175" />
          <line x1="361" y1="175" x2="366" y2="175" />
          <line x1="298" y1="195" x2="294" y2="198" />
          <line x1="352" y1="195" x2="356" y2="198" />
        </g>

        {/* Flying Wild Birds (woodcut stroke style) */}
        <path d="M 221,126 Q 227,118 233,124 Q 239,118 245,126" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M 283,131 Q 289,124 295,129 Q 301,124 307,131" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M 197,144 Q 202,138 207,142 Q 212,138 217,144" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />

        {/* --- MOUNTAINS IN THE BACKROUND --- */}
        {/* Left mountains cluster */}
        <polygon points="100,280 185,178 260,280" fill="#ffffff" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        {/* Hatching shadows */}
        <path d="M 185,178 L 185,280 M 185,188 L 202,210 L 185,200 L 210,230 M 185,215 L 218,252 L 185,230 M 185,245 L 230,280" stroke="currentColor" strokeWidth="1.5" />

        {/* Central main majestic peak */}
        <polygon points="144,280 270,135 375,280" fill="#ffffff" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
        {/* Mountain Ridge line and clean woodcut style right-side shade hatchings */}
        <path d="M 270,135 L 255,280" stroke="currentColor" strokeWidth="3.5" />
        <g stroke="currentColor" strokeWidth="1.5">
          <line x1="270" y1="135" x2="305" y2="185" />
          <line x1="268" y1="155" x2="310" y2="215" />
          <line x1="266" y1="175" x2="318" y2="245" />
          <line x1="264" y1="195" x2="320" y2="272" />
          <line x1="262" y1="215" x2="302" y2="271" />
          <line x1="260" y1="235" x2="285" y2="270" />
        </g>

        {/* Right side mountain */}
        <polygon points="275,280 345,172 410,280" fill="#ffffff" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <path d="M 345,172 L 350,280" stroke="currentColor" strokeWidth="3" />
        <g stroke="currentColor" strokeWidth="1.5">
          <line x1="345" y1="172" x2="368" y2="205" />
          <line x1="346" y1="192" x2="378" y2="235" />
          <line x1="347" y1="212" x2="388" y2="265" />
          <line x1="348" y1="232" x2="378" y2="275" />
        </g>

        {/* --- FOREGROUND ENVIRONMENT --- */}
        {/* Road (winding from bottom-left to center, where the camper sits) */}
        {/* Left border of road */}
        <path d="M 125,320 Q 185,295 240,265 T 325,255" fill="none" stroke="currentColor" strokeWidth="3" />
        {/* Right border of road */}
        <path d="M 175,340 Q 230,305 285,272 T 345,260" fill="none" stroke="currentColor" strokeWidth="3" />

        {/* Road surface horizontal texture lines (woodcut look) */}
        <g stroke="currentColor" strokeWidth="1.2">
          <line x1="135" y1="316" x2="148" y2="321" />
          <line x1="150" y1="310" x2="165" y2="317" />
          <line x1="168" y1="304" x2="185" y2="311" />
          <line x1="188" y1="298" x2="205" y2="305" />
          <line x1="211" y1="291" x2="228" y2="299" />
          <line x1="235" y1="284" x2="252" y2="291" />
          <line x1="258" y1="278" x2="274" y2="284" />
          <line x1="280" y1="271" x2="295" y2="276" />
        </g>

        {/* River/Water Stream (winding down the right side to the bottom center) */}
        <path d="M 330,265 Q 260,295 210,320 T 260,395" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M 345,273 Q 295,305 245,335 T 295,398" fill="none" stroke="currentColor" strokeWidth="3.5" />
        
        {/* River flowing waves details */}
        <g stroke="currentColor" strokeWidth="1.5" fill="none">
          <path d="M 310,290 Q 275,308 245,322" />
          <path d="M 285,315 Q 255,330 228,342" strokeDasharray="3,3" />
          <path d="M 268,335 Q 248,350 248,365" />
          <path d="M 252,350 Q 235,362 250,380" strokeDasharray="4,2" />
          <path d="M 245,328 Q 230,342 220,358" />
          <path d="M 270,356 Q 285,372 268,392" />
        </g>

        {/* --- COZY FOREGROUND VEGETATION / PINE TREES --- */}
        {/* Big Pine Tree Left 1 */}
        <g fill="currentColor" stroke="currentColor" strokeWidth="1">
          <polygon points="190,295 165,295 178,260" />
          <polygon points="187,270 168,270 178,242" />
          <polygon points="184,248 172,248 178,225" />
          <rect x="176" y="295" width="4" height="20" fill="currentColor" />
        </g>
        {/* Big Pine Tree Left 2 (Slightly smaller, layered) */}
        <g fill="currentColor" stroke="currentColor" strokeWidth="1">
          <polygon points="155,290 135,290 145,260" />
          <polygon points="152,268 138,268 145,242" />
          <path d="M 141,248 L 149,248 L 145,230 Z" />
          <rect x="143" y="290" width="4" height="15" fill="currentColor" />
        </g>
        {/* Tall Pine Tree Left 3 */}
        <g fill="currentColor" stroke="currentColor" strokeWidth="1">
          <polygon points="215,290 195,290 205,255" />
          <polygon points="212,263 198,263 205,235" />
          <polygon points="209,242 201,242 205,220" />
          <rect x="203" y="290" width="3.5" height="18" fill="currentColor" />
        </g>

        {/* Small pine trees silhouette on right horizon background */}
        <path d="M 326,250 L 322,238 L 324,238 L 321,228 L 323,228 L 320,215 L 317,215 L 315,228 L 317,228 L 314,238 L 316,238 Z" fill="currentColor" />
        <path d="M 338,252 L 334,240 L 336,240 L 333,230 L 335,230 L 332,218 L 329,218 L 327,230 L 329,230 L 326,240 L 328,240 Z" fill="currentColor" />
        <path d="M 314,251 L 311,241 L 313,241 L 310,232 L 312,232 L 309,221 L 307,221 L 305,232 L 307,232 L 304,241 L 306,241 Z" fill="currentColor" />

        {/* --- DETAILED CAMPER VAN (MANSARDATO / OVERCAB MOTORHOME) --- */}
        {/* Driving down the road (Angled 3/4 front view representing the image extremely well) */}
        <g transform="translate(195, 175) scale(1.05)">
          {/* Camper shadow on road */}
          <ellipse cx="60" cy="85" rx="34" ry="7" fill="rgba(0,0,0,0.3)" />

          {/* Undercoating cabin frame structure */}
          <path d="M 28,52 C 28,45 32,38 41,38 L 86,34 C 91,34 94,37 94,42 L 95,74 C 95,78 91,80 84,80 L 38,82 C 32,82 28,78 28,72 Z" fill="#ffffff" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
          
          {/* Detailed Overcab Alcove (Mansarda) projecting elegantly forward above the cabin windshield (looking exactly like standard motorhomes) */}
          <path d="M 28,44 Q 13,44 14,54 Q 15,62 28,62 Z" fill="#ffffff" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round" />
          
          {/* Cab windshield window and side cabin window elements */}
          <path d="M 18,54 H 36 V 61 H 22 Z" fill="currentColor" stroke="currentColor" strokeWidth="1" />
          <path d="M 38,52 H 52 V 61 H 38 Z" fill="currentColor" stroke="currentColor" strokeWidth="1" />
          
          {/* Camper Living Body big side windows */}
          <rect x="58" y="48" width="18" height="11" rx="2" fill="currentColor" />
          <rect x="80" y="48" width="10" height="11" rx="2" fill="currentColor" />

          {/* Front Bumper, grille and light details */}
          {/* Grille */}
          <rect x="18" y="67" width="16" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M 22,67 V 75 M 26,67 V 75 M 30,67 V 75" stroke="currentColor" strokeWidth="1" />
          {/* Headlights */}
          <circle cx="15" cy="71" r="2.5" fill="#ffffff" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="37" cy="71" r="2.5" fill="#ffffff" stroke="currentColor" strokeWidth="1.2" />
          {/* Front License plate */}
          <rect x="21" y="77" width="10" height="3.5" fill="#ffffff" stroke="currentColor" strokeWidth="1" />

          {/* Side elegant camper design decal curve stripes */}
          <path d="M 46,71 Q 68,69 88,67" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 50,75 Q 70,73 90,71" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />

          {/* Black Rubber Tires with silver steel wheels rims */}
          {/* Front Left tire */}
          <g>
            <rect x="25" y="78" width="8" height="9" rx="2" fill="currentColor" />
          </g>
          {/* Front Right Tire (main viewpoint) */}
          <g>
            <circle cx="36" cy="80" r="8" fill="currentColor" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="36" cy="80" r="4.5" fill="#ffffff" />
            <circle cx="36" cy="80" r="1.5" fill="currentColor" />
          </g>
          {/* Rear Wheels Dual block style */}
          <g>
            <circle cx="76" cy="78" r="9" fill="currentColor" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="76" cy="78" r="5" fill="#ffffff" />
            <circle cx="76" cy="78" r="1.8" fill="currentColor" />
          </g>
        </g>

        {/* Little tufts of wild grass in foreground and stream bank */}
        <path d="M 110,335 L 114,328 L 118,335 M 114,335 L 116,325" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M 330,345 L 334,339 L 338,345" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M 183,365 L 186,358 L 191,365" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
