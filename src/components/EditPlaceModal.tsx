import React from 'react';
import { Save, X, MapPin } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY || localStorage.getItem("user_google_maps_key") || "";

export const EditPlaceModal = ({ place, onSave, onCancel }: { place: any, onSave: (p: any) => void, onCancel: () => void }) => {
  const [formData, setFormData] = React.useState({ ...place });
  const [showMap, setShowMap] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMapClick = (e: any) => {
    if (e.detail && e.detail.latLng) {
      setFormData(prev => ({ ...prev, lat: e.detail.latLng.lat.toString(), lng: e.detail.latLng.lng.toString() }));
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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-4">
        <h3 className="font-bold text-lg text-slate-800">Modifica Luogo</h3>
        <div className="space-y-3">
          <input name="name" value={formData.name} onChange={handleChange} placeholder="Nome" className="w-full px-3 py-2 border rounded-lg" />
          <input name="address" value={formData.address} onChange={handleChange} placeholder="Indirizzo" className="w-full px-3 py-2 border rounded-lg" />
          <div className="grid grid-cols-2 gap-2">
            <input name="lat" value={formData.lat} onChange={handleChange} placeholder="Latitudine" className="w-full px-3 py-2 border rounded-lg" />
            <input name="lng" value={formData.lng} onChange={handleChange} placeholder="Longitudine" className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <button onClick={() => setShowMap(true)} className="w-full px-4 py-2 bg-indigo-100 text-indigo-700 font-bold rounded-lg flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4" /> Seleziona posizione su mappa
          </button>
          <textarea name="description" value={formData.description || ''} onChange={handleChange} placeholder="Descrizione" className="w-full px-3 py-2 border rounded-lg" />
          <input name="facilities" value={formData.facilities?.join(', ') || ''} onChange={(e) => setFormData(prev => ({ ...prev, facilities: e.target.value.split(',').map(s => s.trim()) }))} placeholder="Servizi (separati da virgola)" className="w-full px-3 py-2 border rounded-lg" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Annulla</button>
          <button onClick={() => onSave(formData)} className="px-4 py-2 bg-[#3E4A35] text-white font-bold rounded-lg flex items-center gap-2"><Save className="w-4 h-4" /> Salva</button>
        </div>
      </div>
    </div>
  );
};
