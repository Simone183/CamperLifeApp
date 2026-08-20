import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight } from 'lucide-react';

interface TourStep {
  title: string;
  content: string;
  variant: 'welcome' | 'map' | 'diary' | 'tools';
}

const steps: TourStep[] = [
  {
    title: "Benvenuto su ViaCamper!",
    content: "Scopri le migliori aree sosta, campeggi e servizi per il tuo viaggio.",
    variant: "welcome"
  },
  {
    title: "Mappa e Navigazione",
    content: "Usa la mappa per trovare luoghi e navigare verso la tua prossima tappa.",
    variant: "map"
  },
  {
    title: "Diario di Viaggio",
    content: "Tieni traccia delle tue avventure e pianifica i tuoi itinerari.",
    variant: "diary"
  },
  {
    title: "Strumenti e Impostazioni",
    content: "Accedi a strumenti utili come il calcolatore di peso, checklist e molto altro.",
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

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center relative overflow-hidden"
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
        >
          {/* Header Graphic (Icon Placeholder) */}
          <div className="w-full bg-slate-50/50 rounded-2xl mb-6 relative pt-4 pb-2 flex items-center justify-center">
             <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center border border-slate-200">
               <span className="text-4xl">🚐</span>
             </div>
          </div>

          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{steps[currentStep].title}</h2>
            <button onClick={onComplete} className="text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-full transition-colors absolute top-4 right-4 z-10 shadow-sm">
              <X size={18} />
            </button>
          </div>

          <p className="text-slate-600 mb-8 text-sm leading-relaxed font-medium px-2">{steps[currentStep].content}</p>

          <button
            onClick={nextStep}
            className="w-full bg-[#3E4A35] hover:bg-[#2C3525] text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
          >
            {currentStep < steps.length - 1 ? "Prossimo" : "Inizia l'Avventura"}
            <ArrowRight size={18} />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
