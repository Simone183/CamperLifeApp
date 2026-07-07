import React from 'react';
import { Trip, DiaryMovement } from '../types';
import { MapPin, Trash2, ArrowLeft, Navigation } from 'lucide-react';

interface MovementLogProps {
  trip: Trip;
  onUpdateTrip: (trip: Trip) => void;
  onBack: () => void;
}

export function MovementLog({ trip, onUpdateTrip, onBack }: MovementLogProps) {
  const [odometer, setOdometer] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [date, setDate] = React.useState('');
  const [isLocating, setIsLocating] = React.useState(false);

  const handleGetGPSLocation = () => {
    if (!navigator.geolocation) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "❌ Geolocalizzazione non supportata dal tuo browser." }
        })
      );
      return;
    }

    setIsLocating(true);
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message: "🛰️ Rilevamento della posizione GPS in corso..." }
      })
    );

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`/api/nominatim-reverse?lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            let placeName = `Posizione GPS (${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)})`;
            if (data && data.display_name) {
              placeName = data.display_name.split(",")[0] || placeName;
              if (data.address) {
                placeName = data.address.village || data.address.town || data.address.city || data.address.road || placeName;
              }
            }
            setLocation(placeName);
            window.dispatchEvent(
              new CustomEvent("show-toast", {
                detail: { message: `📍 Posizione rilevata: ${placeName}` }
              })
            );
          } else {
            setLocation(`${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`);
          }
        } catch (err) {
          console.error("Reverse geocoding error:", err);
          setLocation(`${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsLocating(false);
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: { message: "❌ Impossibile ottenere la posizione GPS." }
          })
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const addMovement = () => {
    if (!odometer || !location) return;
    const newMovement: DiaryMovement = {
      id: Date.now().toString(),
      odometer: parseFloat(odometer),
      location,
      date: date || new Date().toISOString(),
      notes
    };
    onUpdateTrip({ ...trip, movements: [...(trip.movements || []), newMovement] });
    setOdometer('');
    setLocation('');
    setNotes('');
    setDate('');
  };

  const deleteMovement = (movementId: string) => {
    const movementToDelete = (trip.movements || []).find((m) => m.id === movementId);
    const updatedMovements = (trip.movements || []).filter((m) => m.id !== movementId);
    let updatedRoutePoints = trip.routePoints || [];

    if (movementToDelete) {
      const locToDelete = movementToDelete.location.toLowerCase().trim();
      updatedRoutePoints = (trip.routePoints || []).filter((rp) => {
        if (!rp.name) return true;
        const rpName = rp.name.toLowerCase().trim();
        return !rpName.includes(locToDelete) && !locToDelete.includes(rpName);
      });
    }

    onUpdateTrip({
      ...trip,
      movements: updatedMovements,
      routePoints: updatedRoutePoints,
    });
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-lg border border-stone-200 h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="p-2 hover:bg-stone-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-stone-600" />
        </button>
        <h2 className="text-lg font-black text-stone-800">Spostamenti</h2>
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <input 
                type="number" 
                placeholder="Km" 
                value={odometer} 
                onChange={(e) => setOdometer(e.target.value)}
                className="p-2 border rounded-lg"
            />
            <div className="relative flex items-center min-w-0">
                <input 
                    type="text" 
                    placeholder="Località" 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-2 pr-8 border rounded-lg text-sm"
                />
                <button
                    type="button"
                    onClick={handleGetGPSLocation}
                    disabled={isLocating}
                    className="absolute right-2 text-sky-600 hover:text-sky-800 disabled:opacity-50 cursor-pointer"
                    title="Rileva posizione GPS attuale"
                >
                    <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin border-transparent' : ''}`} />
                </button>
            </div>
        </div>
        <input 
            type="text" 
            placeholder="Note" 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2 border rounded-lg"
        />
        <div className="space-y-1">
          <label className="block text-xs font-bold text-stone-500">Data dello spostamento</label>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2 border rounded-lg bg-white"
          />
        </div>
        <button onClick={addMovement} className="w-full bg-[#3E4A35] text-white p-2 rounded-lg font-bold">
            Aggiungi Spostamento
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {(trip.movements || []).map(m => (
            <div key={m.id} className="p-3 border rounded-lg flex justify-between items-center text-sm">
                <div>
                    <span className="font-bold">
                      {m.odometer !== undefined && m.odometer !== null ? `${m.odometer} Km` : "⚠️ Km da inserire (nel Diario)"}
                    </span> - {m.location}
                    <div className="text-xs text-stone-500">{new Date(m.date).toLocaleDateString()}</div>
                </div>
                <button onClick={() => deleteMovement(m.id)} className="text-red-500">
                    <Trash2 className="w-4 h-4"/>
                </button>
            </div>
        ))}
      </div>
    </div>
  );
}
