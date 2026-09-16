import React from 'react';
import { Save, X, MapPin } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';

const getApiKey = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY || window.localStorage.getItem("user_google_maps_key") || "";
    }
  } catch (e) {
    // Ignore storage restriction
  }
  return import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY || "";
};

export const EditPlaceModal = ({ place, onSave, onCancel }: { place: any, onSave: (p: any) => void, onCancel: () => void }) => {
  const API_KEY = React.useMemo(() => getApiKey(), []);
  const [formData, setFormData] = React.useState({ ...place });
  const [showMap, setShowMap] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getLabelForCategoryAndSubtype = (cat: string, sub?: string) => {
    if (cat === 'lavanderia' || sub === 'lavanderia') return '🧺 Lavanderia Self-Service';
    if (cat === 'fontanella' || sub === 'fontanella') return '🚰 Fontanella / Acqua Potabile';
    if (cat === 'solo_scarico' || sub === 'solo_scarico') return '🕳️ Solo Scarico Reflui';
    if (cat === 'carico_scarico' || sub === 'carico_scarico') return '💧 Camper Service (C/S)';
    if (cat === 'camper_service') {
      if (sub === 'lavanderia') return '🧺 Lavanderia Self-Service';
      if (sub === 'fontanella') return '🚰 Fontanella / Acqua';
      if (sub === 'solo_scarico') return '🕳️ Solo Scarico';
      return '💧 Camper Service (C/S)';
    }
    if (cat === 'agricampeggio') return '🌱 Agricampeggio / Agriturismo';
    if (cat === 'campeggio') return '⛺ Campeggio';
    if (cat === 'parcheggio_gratuito') return '🅿️ Parcheggio Gratuito (Free)';
    if (cat === 'parcheggio_pagamento') return '🅿️ Parcheggio a Pagamento';
    if (cat === 'parcheggio_diurno') return '🅿️ Parcheggio Solo Giorno (Diurno)';
    if (cat === 'parcheggio_camper') return '🅿️ Parcheggio Camper';
    if (cat === 'hidden_gem') return '💎 Hidden Gem';
    return '🚐 Area di Sosta';
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'lavanderia') {
      setFormData(prev => ({
        ...prev,
        category: 'lavanderia',
        serviceSubtype: 'lavanderia',
        categoryLabel: '🧺 Lavanderia Self-Service'
      }));
    } else if (val === 'fontanella') {
      setFormData(prev => ({
        ...prev,
        category: 'fontanella',
        serviceSubtype: 'fontanella',
        categoryLabel: '🚰 Fontanella / Acqua Potabile'
      }));
    } else if (val === 'solo_scarico') {
      setFormData(prev => ({
        ...prev,
        category: 'solo_scarico',
        serviceSubtype: 'solo_scarico',
        categoryLabel: '🕳️ Solo Scarico Reflui'
      }));
    } else if (val === 'carico_scarico') {
      setFormData(prev => ({
        ...prev,
        category: 'camper_service',
        serviceSubtype: 'carico_scarico',
        categoryLabel: '💧 Camper Service (Carico/Scarico)'
      }));
    } else if (val === 'camper_service') {
      setFormData(prev => ({
        ...prev,
        category: 'camper_service',
        serviceSubtype: prev.serviceSubtype || 'carico_scarico',
        categoryLabel: getLabelForCategoryAndSubtype('camper_service', prev.serviceSubtype || 'carico_scarico')
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        category: val as any,
        serviceSubtype: undefined,
        categoryLabel: getLabelForCategoryAndSubtype(val)
      }));
    }
  };

  const handleSubtypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      category: val === 'lavanderia' || val === 'fontanella' || val === 'solo_scarico' ? val as any : 'camper_service',
      serviceSubtype: val as any,
      categoryLabel: getLabelForCategoryAndSubtype(val === 'lavanderia' || val === 'fontanella' || val === 'solo_scarico' ? val : 'camper_service', val)
    }));
  };

  const handleMapClick = (e: any) => {
    if (e.detail && e.detail.latLng) {
      setFormData(prev => ({ ...prev, lat: e.detail.latLng.lat, lng: e.detail.latLng.lng }));
    }
    setShowMap(false);
  };

  if (showMap) {
    if (!API_KEY) {
      return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
            <h3 className="font-bold text-lg text-slate-800">Errore Configurazione</h3>
            <p className="text-slate-600 mt-2">Chiave API Google Maps non configurata.</p>
            <button onClick={() => setShowMap(false)} className="mt-4 px-4 py-2 bg-slate-100 rounded-lg">Chiudi</button>
          </div>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-4 w-full max-w-lg shadow-xl h-[500px] flex flex-col">
          <APIProvider apiKey={API_KEY}>
            <Map
              defaultCenter={{ lat: parseFloat(formData.lat) || 45.4642, lng: parseFloat(formData.lng) || 9.1900 }}
              defaultZoom={13}
              onClick={handleMapClick}
              mapId="DEMO_MAP_ID"
              style={{ flex: 1, width: '100%', borderRadius: '1rem' }}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            >
              <AdvancedMarker position={{ lat: parseFloat(formData.lat) || 45.4642, lng: parseFloat(formData.lng) || 9.1900 }} />
            </Map>
          </APIProvider>
          <button onClick={() => setShowMap(false)} className="mt-2 px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Annulla</button>
        </div>
      </div>
    );
  }

  const currentCategorySelectValue = 
    formData.category === 'lavanderia' || formData.serviceSubtype === 'lavanderia'
      ? 'lavanderia'
      : formData.category === 'fontanella' || formData.serviceSubtype === 'fontanella'
        ? 'fontanella'
        : formData.category === 'solo_scarico' || formData.serviceSubtype === 'solo_scarico'
          ? 'solo_scarico'
          : formData.category === 'carico_scarico' || (formData.category === 'camper_service' && formData.serviceSubtype === 'carico_scarico')
            ? 'carico_scarico'
            : (formData.category || 'area_sosta');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h3 className="font-black text-xl text-[#3E4A35]">Modifica Sosta</h3>
            <p className="text-xs text-slate-500">Aggiorna dati, posizione e tipologia sosta (aggiornamento automatico icona e scheda)</p>
          </div>
          <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs font-medium">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Nome Sosta</label>
            <input name="name" value={formData.name || ''} onChange={handleChange} placeholder="Nome sosta" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3E4A35]" />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Indirizzo / Località</label>
            <input name="address" value={formData.address || ''} onChange={handleChange} placeholder="Indirizzo" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3E4A35]" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Latitudine</label>
              <input name="lat" value={formData.lat || ''} onChange={handleChange} placeholder="Latitudine" className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Longitudine</label>
              <input name="lng" value={formData.lng || ''} onChange={handleChange} placeholder="Longitudine" className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs" />
            </div>
          </div>

          <button onClick={() => setShowMap(true)} type="button" className="w-full px-4 py-2.5 bg-[#3E4A35]/10 hover:bg-[#3E4A35]/15 text-[#3E4A35] font-black rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer">
            <MapPin className="w-4 h-4" /> Seleziona posizione precisa su mappa interattiva
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tipologia / Categoria</label>
              <select
                value={currentCategorySelectValue}
                onChange={handleCategoryChange}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-[#3E4A35]"
              >
                <option value="area_sosta">🚐 Area di Sosta</option>
                <option value="parcheggio_gratuito">🅿️ Parcheggio Gratuito (Free)</option>
                <option value="parcheggio_pagamento">🅿️ Parcheggio a Pagamento</option>
                <option value="parcheggio_diurno">🅿️ Parcheggio Solo Giorno (Diurno)</option>
                <option value="campeggio">⛺ Campeggio</option>
                <option value="agricampeggio">🌱 Agricampeggio / Agriturismo</option>
                <option value="camper_service">🚐 Camper Service (Generico)</option>
                <option value="carico_scarico">💧 C/S (Carico e Scarico)</option>
                <option value="fontanella">🚰 Fontanella / Acqua Potabile</option>
                <option value="lavanderia">🧺 Lavanderia Self-Service</option>
                <option value="solo_scarico">🕳️ Solo Scarico Reflui</option>
                <option value="hidden_gem">✨ Hidden Gem (Posto Segreto)</option>
              </select>
            </div>

            {formData.category === 'camper_service' && (
              <div>
                <label className="font-bold text-purple-900 block mb-1">Sottotipo Servizio</label>
                <select
                  value={formData.serviceSubtype || 'carico_scarico'}
                  onChange={handleSubtypeChange}
                  className="w-full px-3 py-2.5 border border-purple-300 bg-purple-50 rounded-xl text-xs font-bold text-purple-900 focus:ring-2 focus:ring-purple-500"
                >
                  <option value="carico_scarico">💧 Carico e Scarico (C/S)</option>
                  <option value="fontanella">🚰 Fontanella / Solo Acqua</option>
                  <option value="lavanderia">🧺 Lavanderia Self-Service</option>
                  <option value="solo_scarico">🕳️ Solo Scarico Reflui</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Info Prezzo</label>
              <input name="priceInfo" value={formData.priceInfo || ''} onChange={handleChange} placeholder="es. Gratuito o 12€ / 24h" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Prezzo (€)</label>
              <input type="number" name="priceEuro" value={formData.priceEuro ?? 0} onChange={handleChange} placeholder="0" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Descrizione / Note</label>
            <textarea name="description" value={formData.description || ''} onChange={handleChange} rows={2} placeholder="Descrizione della sosta..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3E4A35]" />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Servizi (separati da virgola)</label>
            <input name="facilities" value={Array.isArray(formData.facilities) ? formData.facilities.join(', ') : (formData.facilities || '')} onChange={(e) => setFormData(prev => ({ ...prev, facilities: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="Carico acqua, Elettricità, Wi-Fi..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t">
          <button onClick={onCancel} type="button" className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-xs transition-colors cursor-pointer">Annulla</button>
          <button onClick={() => onSave(formData)} type="button" className="px-5 py-2.5 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-md transition-colors cursor-pointer">
            <Save className="w-4 h-4" /> Salva Modifiche
          </button>
        </div>
      </div>
    </div>
  );
};
