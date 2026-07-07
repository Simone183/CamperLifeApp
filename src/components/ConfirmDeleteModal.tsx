import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const ConfirmDeleteModal = ({ onConfirm, onCancel }: { onConfirm: () => void, onCancel: () => void }) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
        <div className="flex items-center gap-3 text-red-600">
          <AlertTriangle className="w-8 h-8" />
          <h3 className="font-bold text-lg">Conferma Eliminazione</h3>
        </div>
        <p className="text-slate-600 text-sm">Sei sicuro di voler eliminare questa sosta? Questa operazione non può essere annullata.</p>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Annulla</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg">Elimina</button>
        </div>
      </div>
    </div>
  );
};
