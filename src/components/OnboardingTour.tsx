import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { FeatureTutorialIllustration } from './FeatureTutorialIllustration';

interface TourStep {
  title: string;
  subtitle: string;
  content: string;
  variant: 'welcome' | 'map' | 'diary' | 'tools';
}

const steps: TourStep[] = [
  {
    title: "Benvenuto su ViaCamper!",
    subtitle: "Tutto per il tuo viaggio in camper",
    content: "L'app completa per camperisti e vanlifers: trova subito le migliori aree sosta e campeggi, naviga in sicurezza con limiti per camper, tieni il diario di bordo e usa gli strumenti di bordo dedicati.",
    variant: "welcome"
  },
  {
    title: "Mappa, Soste & GPS 3D",
    subtitle: "Trova tutto ciò che serve per il tuo mezzo",
    content: "Esplora oltre 10.000 punti sosta con recensioni, foto, servizi e tariffe aggiornate. Avvia il navigatore 3D con limiti di altezza e peso per evitare ponti bassi e strade strette!",
    variant: "map"
  },
  {
    title: "Diario di Bordo & Ricordi",
    subtitle: "Conserva per sempre ogni avventura",
    content: "Registra ogni tappa, calcola i consumi reali in km/L, aggiungi note, scontrini e scatta foto dei tuoi posti del cuore per creare un archivio di viaggio indimenticabile.",
    variant: "diary"
  },
  {
    title: "Strumenti & Sicurezza Camper",
    subtitle: "Tutto sotto controllo prima di partire",
    content: "Usa la livella digitale 3D, calcola la distribuzione dei pesi, verifica l'autonomia energetica in sosta libera e controlla la checklist pre-partenza per viaggiare senza pensieri.",
    variant: "tools"
  }
];

export const OnboardingTour = ({ onComplete }: { onComplete: () => void }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const stepData = steps[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl max-w-md w-full text-center relative overflow-hidden border border-slate-200 dark:border-slate-800"
          initial={{ scale: 0.95, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* Close button */}
          <button
            onClick={onComplete}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 p-2 rounded-full transition-colors absolute top-4 right-4 z-20 shadow-xs cursor-pointer"
            title="Salta tutorial"
          >
            <X size={18} />
          </button>

          {/* Feature Illustration Component */}
          <div className="mb-4">
            <FeatureTutorialIllustration variant={stepData.variant} />
          </div>

          {/* Step Indicator Dots */}
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentStep
                    ? 'w-7 bg-[#1C3D2B] dark:bg-emerald-500'
                    : 'w-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
                }`}
                title={`Vai al passo ${idx + 1}`}
              />
            ))}
          </div>

          {/* Title & Subtitle */}
          <div className="mb-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 mb-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              {stepData.subtitle}
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {stepData.title}
            </h2>
          </div>

          {/* Content Description */}
          <p className="text-slate-600 dark:text-slate-300 mb-5 text-xs sm:text-sm leading-relaxed font-medium px-2 min-h-[58px] flex items-center justify-center">
            {stepData.content}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={prevStep}
                className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-98"
              >
                <ArrowLeft size={16} />
                <span>Indietro</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onComplete}
                className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold text-xs sm:text-sm transition-all flex items-center justify-center cursor-pointer active:scale-98"
              >
                <span>Salta</span>
              </button>
            )}

            <button
              type="button"
              onClick={nextStep}
              className="flex-1 bg-[#1C3D2B] hover:bg-[#142d20] text-white py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
            >
              <span>{currentStep < steps.length - 1 ? "Avanti" : "Inizia l'Avventura! 🚀"}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
