import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight } from 'lucide-react';

interface TourStep {
  title: string;
  content: string;
}

const steps: TourStep[] = [
  {
    title: "Benvenuto su CamperLifeApp!",
    content: "Scopri le migliori aree sosta, campeggi e servizi per il tuo viaggio."
  },
  {
    title: "Mappa e Navigazione",
    content: "Usa la mappa per trovare luoghi e navigare verso la tua prossima tappa."
  },
  {
    title: "Diario di Viaggio",
    content: "Tieni traccia delle tue avventure e pianifica i tuoi itinerari."
  },
  {
    title: "Strumenti e Impostazioni",
    content: "Accedi a strumenti utili come il calcolatore di peso, checklist e molto altro."
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
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full -translate-y-[25vh]"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-900">{steps[currentStep].title}</h2>
            <button onClick={onComplete} className="text-slate-500 hover:text-slate-700">
              <X size={20} />
            </button>
          </div>
          <p className="text-slate-600 mb-6 text-sm">{steps[currentStep].content}</p>
          <button
            onClick={nextStep}
            className="w-full bg-[#5A6B4E] hover:bg-[#3E4A35] text-white py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition"
          >
            {currentStep < steps.length - 1 ? "Prossimo" : "Inizia!"}
            <ArrowRight size={18} />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
