import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Navigation, Compass, Star, Route, Camera, BookOpen, ShieldCheck, SunMedium, Sparkles } from 'lucide-react';

interface FeatureIllustrationProps {
  variant: 'welcome' | 'map' | 'diary' | 'tools';
}

interface PhotoStepData {
  imageUrl: string;
  fallbackUrl: string;
  badge: string;
  badgeIcon: React.ReactNode;
  tag: string;
  highlights: string[];
}

const photoDataMap: Record<string, PhotoStepData> = {
  welcome: {
    imageUrl: 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=900&q=85',
    fallbackUrl: 'https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=900&q=85',
    badge: 'VIAGGI & LIBERTÀ',
    badgeIcon: <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '16s' }} />,
    tag: 'Italia & Europa',
    highlights: ['10.000+ Soste', 'Navigatore Sagomato', 'Community']
  },
  map: {
    imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=85',
    fallbackUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=900&q=85',
    badge: 'MAPPA & GPS SOSTE',
    badgeIcon: <Navigation className="w-3.5 h-3.5 text-sky-400" />,
    tag: 'Filtri & Servizi',
    highlights: ['Aree Sosta 24h', 'Camper Service', 'Ponti & ZTL']
  },
  diary: {
    imageUrl: 'https://images.unsplash.com/photo-1527786356703-4b100091cd2c?auto=format&fit=crop&w=900&q=85',
    fallbackUrl: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=900&q=85',
    badge: 'DIARIO DI BORDO',
    badgeIcon: <BookOpen className="w-3.5 h-3.5 text-amber-400" />,
    tag: 'I Tuoi Ricordi',
    highlights: ['Traccia Km & Spese', 'Foto Tappe', 'Consumi km/L']
  },
  tools: {
    imageUrl: 'https://images.unsplash.com/photo-1516939884455-1445c8652f83?auto=format&fit=crop&w=900&q=85',
    fallbackUrl: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=900&q=85',
    badge: 'STRUMENTI DI BORDO',
    badgeIcon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
    tag: 'Sicurezza & Comfort',
    highlights: ['Livella 3D Assi', 'Autonomia Solare', 'Checklist']
  }
};

export const FeatureTutorialIllustration: React.FC<FeatureIllustrationProps> = ({ variant }) => {
  const data = photoDataMap[variant] || photoDataMap.welcome;
  const [imgSrc, setImgSrc] = useState(data.imageUrl);
  const [hasError, setHasError] = useState(false);

  // Sync state when variant changes
  React.useEffect(() => {
    setImgSrc(data.imageUrl);
    setHasError(false);
  }, [variant, data.imageUrl]);

  return (
    <div className="w-full h-48 sm:h-52 relative overflow-hidden rounded-2xl select-none shadow-md border border-slate-200/80 dark:border-slate-800">
      <motion.div
        key={variant}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative w-full h-full"
      >
        {/* Real High-Res Photography */}
        {!hasError ? (
          <img
            src={imgSrc}
            alt={data.badge}
            referrerPolicy="no-referrer"
            onError={() => {
              if (imgSrc !== data.fallbackUrl) {
                setImgSrc(data.fallbackUrl);
              } else {
                setHasError(true);
              }
            }}
            className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1C3D2B] via-slate-900 to-slate-950 flex items-center justify-center">
            <Compass className="w-12 h-12 text-emerald-400/40" />
          </div>
        )}

        {/* Sophisticated Dark Gradient Overlay for Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/20" />

        {/* Top Floating Badge & Location Tag */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/20 px-2.5 py-1 rounded-full text-white text-xs font-black tracking-wide shadow-sm">
            {data.badgeIcon}
            <span>{data.badge}</span>
          </div>

          <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md border border-white/25 px-2.5 py-1 rounded-full text-white text-[10px] font-extrabold shadow-sm">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>{data.tag}</span>
          </div>
        </div>

        {/* Bottom Feature Micro-Pills Overlay */}
        <div className="absolute bottom-3 left-3 right-3 z-10">
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {data.highlights.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900/80 backdrop-blur-md border border-white/15 px-2.5 py-1 rounded-lg text-white text-[11px] font-bold shadow-xs flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
