import React from 'react';
import { Sun, Moon, Truck, Sparkles, Navigation } from 'lucide-react';
import { VehicleSpecs } from '../types';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  vehicle: VehicleSpecs;
  setVehicleModalOpen: (val: boolean) => void;
  onOpenRollyModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  setDarkMode,
  vehicle,
  setVehicleModalOpen,
  onOpenRollyModal
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#dedad0]/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-300/60 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
        
        {/* Logo ViaCamper */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-emerald-800 dark:bg-emerald-700 flex items-center justify-center text-amber-200 border-2 border-emerald-900/40 shadow-sm">
            <Navigation className="w-5 h-5 rotate-45" />
          </div>
          <div className="leading-tight">
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white font-serif">
              ViaCamper
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300">
              PRO 2026
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Weather Widget Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-200/80 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-stone-300/70 dark:border-slate-700">
            <span className="text-amber-500">☀️</span>
            <span>33°C</span>
          </div>

          {/* AI Rolly Assistant Trigger */}
          <button
            onClick={onOpenRollyModal}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-xs font-bold transition-transform active:scale-95 shadow-xs"
            title="Chiedi all'Assistente AI Rolly"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Rolly AI</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full bg-stone-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-stone-300 dark:hover:bg-slate-700 transition-colors border border-stone-300/70 dark:border-slate-700"
            aria-label="Cambia tema"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Vehicle Selector Pill */}
          <button
            onClick={() => setVehicleModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-200/80 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300/70 dark:border-slate-700 transition-colors max-w-[170px] sm:max-w-xs truncate"
          >
            <Truck className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
            <div className="text-left truncate">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block leading-none">MEZZO</span>
              <span className="font-semibold truncate block leading-tight">{vehicle.modelName}</span>
            </div>
          </button>
        </div>

      </div>
    </header>
  );
};
