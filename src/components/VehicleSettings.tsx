/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAppSettings } from '../useAppSettings';
import { convertDimensionToDisplay, convertDimensionToMetric, convertWeightTonnesToDisplay, convertWeightDisplayToTonnes, getWeightUnitTonnes, getDimensionUnit } from '../unit-helpers';
import { VehicleDimensions } from '../types';
import { Truck, Check, AlertTriangle, HelpCircle } from 'lucide-react';

interface VehicleSettingsProps {
  dimensions: VehicleDimensions;
  onChange: (dims: VehicleDimensions) => void;
}

export default function VehicleSettings({ dimensions, onChange }: VehicleSettingsProps) {
  const settings = useAppSettings();
  const [localDims, setLocalDims] = React.useState<VehicleDimensions>(dimensions);
  const [successMsg, setSuccessMsg] = React.useState<boolean>(false);

  React.useEffect(() => {
    setLocalDims(dimensions);
  }, [dimensions]);

  const handleChange = (field: keyof VehicleDimensions, value: string | number) => {
    let numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value;

    if (field === 'height' || field === 'width' || field === 'length') {
      numericValue = convertDimensionToMetric(numericValue, settings);
    } else if (field === 'weight') {
      numericValue = convertWeightDisplayToTonnes(numericValue, settings);
    }

    setLocalDims((prev) => ({
      ...prev,
      [field]: numericValue,
    }));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalDims((prev) => ({
      ...prev,
      modelName: e.target.value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange(localDims);
    triggerSuccess();
  };

  const triggerSuccess = () => {
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
    }, 3000);
  };

  // Warnings for height parameters
  const isTooTall = localDims.height >= 3.0;
  const isHeavy = localDims.weight > 3.5;
  const isVeryLong = localDims.length >= 7.0;

  return (
    <div id="vehicle-settings" className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-[#5A6B4E]/15 text-[#3E4A35] rounded-xl">
          <Truck className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Profilo delle Dimensioni</h2>
          <p className="text-sm text-slate-550">I dati sul camper servono per calcolare percorsi sicuri.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Model Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Modello del Camper / Veicolo
            </label>
            <input
              type="text"
              value={localDims.modelName || ''}
              onChange={handleNameChange}
              placeholder="Es: Fiat Ducato Granduca 67"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] focus:ring-4 focus:ring-[#3E4A35]/15 transition-all text-slate-800 font-medium"
            />
          </div>

          {/* Height */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Altezza Massima (${getDimensionUnit(settings) === 'ft' ? 'piedi' : 'metri'})
            </label>
            <p className="text-[11px] text-slate-500 mb-1.5">Compresa antenna o pannelli solari</p>
            <div className="relative">
              <input
                type="number"
                step="0.05"
                value={localDims.height || ''}
                onChange={(e) => handleChange('height', e.target.value)}
                className={`w-full pl-4 pr-12 py-3 rounded-xl border outline-none text-slate-800 font-semibold font-mono focus:ring-4 focus:ring-[#3E4A35]/15 transition-all ${
                  isTooTall ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200 focus:border-[#3E4A35]'
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium font-mono">
                {getDimensionUnit(settings)}
              </span>
            </div>
          </div>

          {/* Length */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Lunghezza Totale (${getDimensionUnit(settings) === 'ft' ? 'piedi' : 'metri'})
            </label>
            <p className="text-[11px] text-slate-500 mb-1.5">Compreso porta-biciclette posteriore</p>
            <div className="relative">
              <input
                type="number"
                step="0.05"
                value={localDims.length || ''}
                onChange={(e) => handleChange('length', e.target.value)}
                className={`w-full pl-4 pr-12 py-3 rounded-xl border outline-none text-slate-800 font-semibold font-mono focus:ring-4 focus:ring-[#3E4A35]/15 transition-all ${
                  isVeryLong ? 'border-amber-300' : 'border-slate-200 focus:border-[#3E4A35]'
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium font-mono">
                {getDimensionUnit(settings)}
              </span>
            </div>
          </div>

          {/* Width */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Larghezza (${getDimensionUnit(settings) === 'ft' ? 'piedi' : 'metri'})
            </label>
            <p className="text-[11px] text-slate-500 mb-1.5">Inclusi specchietti retrovisori chiusi</p>
            <div className="relative">
              <input
                type="number"
                step="0.05"
                value={localDims.width || ''}
                onChange={(e) => handleChange('width', e.target.value)}
                className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] focus:ring-4 focus:ring-[#3E4A35]/15 transition-all text-slate-800 font-semibold font-mono"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium font-mono">
                {getDimensionUnit(settings)}
              </span>
            </div>
          </div>

          {/* Weight */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Massa a pieno carico (${getWeightUnitTonnes(settings) === 'lbs' ? 'libbre' : 'tonnellate'})
            </label>
            <p className="text-[11px] text-slate-500 mb-1.5">Molto importante per ponti e restrizioni C</p>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={localDims.weight || ''}
                onChange={(e) => handleChange('weight', e.target.value)}
                className={`w-full pl-4 pr-12 py-3 rounded-xl border outline-none text-slate-800 font-semibold font-mono focus:ring-4 focus:ring-[#3E4A35]/15 transition-all ${
                  isHeavy ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200 focus:border-[#3E4A35]'
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium font-mono">
                t
              </span>
            </div>
          </div>
        </div>

        {/* Informative Alerts dynamic */}
        {(isTooTall || isHeavy || isVeryLong) && (
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <div className="flex gap-2 text-amber-800 font-semibold text-xs items-center">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Avvertenza di Sicurezza Camper</span>
            </div>
            <ul className="list-disc pl-5 text-[11px] text-amber-700 space-y-1 leading-relaxed">
              {isTooTall && (
                <li>
                  <strong>Altezza ({parseFloat(convertDimensionToDisplay(localDims.height, settings).toFixed(2))}{getDimensionUnit(settings)}) ≥ {parseFloat(convertDimensionToDisplay(3.0, settings).toFixed(2))} {getDimensionUnit(settings)}:</strong> Massima attenzione ai ponti ferroviari storici, passaggi coperti nel centro città e ai rami bassi nelle aree sosta naturali.
                </li>
              )}
              {isHeavy && (
                <li>
                  <strong>Peso ({parseFloat(convertWeightTonnesToDisplay(localDims.weight, settings).toFixed(2))}{getWeightUnitTonnes(settings)}) &gt; {parseFloat(convertWeightTonnesToDisplay(3.5, settings).toFixed(2))} {getWeightUnitTonnes(settings)}:</strong> Richiede patente C o superiore. Molte strade secondarie montane e ponti impongono un divieto assoluto oltre le 3.5t.
                </li>
              )}
              {isVeryLong && (
                <li>
                  <strong>Lunghezza ({parseFloat(convertDimensionToDisplay(localDims.length, settings).toFixed(2))}{getDimensionUnit(settings)}) ≥ {parseFloat(convertDimensionToDisplay(7.0, settings).toFixed(2))} {getDimensionUnit(settings)}:</strong> Ampio raggio di sterzata richiesto. Prestare grande cura nei tornanti montani alpini e nelle piccole rotatorie.
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="flex gap-3 items-center pt-2">
          <button
            type="submit"
            className="flex-1 sm:flex-initial px-6 py-3 bg-[#3E4A35] hover:bg-[#5A6B4E] active:bg-[#3E4A35] text-white font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            Salva Profilo Veicolo
          </button>
          {successMsg && (
            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs animate-fade-in">
              <Check className="w-4 h-4 bg-emerald-100 rounded-full p-0.5" />
              <span>Impostazioni salvate!</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
