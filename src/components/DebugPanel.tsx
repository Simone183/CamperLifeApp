import React, { useState, useEffect } from 'react';
import { X, Trash2, Terminal, Bell } from 'lucide-react';

export const DebugPanelContent = () => {
  const [logs, setLogs] = useState<{ type: 'log' | 'error', message: string, timestamp: string }[]>([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const handleLog = (e: any) => {
      setLogs(prev => [...prev, e.detail]);
    };
    window.addEventListener('debug-log', handleLog);
    return () => window.removeEventListener('debug-log', handleLog);
  }, []);

  const handleTriggerPromoPush = async () => {
    setIsSending(true);
    try {
      const response = await fetch("/api/admin/trigger-promo-test", { method: "POST" });
      const data = await response.json();
      if (data.success) {
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: { message: `✅ Push inviato! "${data.promo.title}"` },
          })
        );
        setLogs(prev => [...prev, {
          type: 'log',
          message: `[Promo Push Admin] Inviato con successo: "${data.promo.title}"`,
          timestamp: new Date().toLocaleTimeString()
        }]);
      } else {
        throw new Error(data.error || "Errore sconosciuto");
      }
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: `❌ Errore: ${err.message}` },
        })
      );
      setLogs(prev => [...prev, {
        type: 'error',
        message: `[Promo Push Admin] Errore nell'invio: ${err.message}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-black/90 text-white rounded-xl p-4 shadow-inner min-h-0 overflow-hidden">
      <div className="flex justify-between items-center mb-3 border-b border-white/20 pb-2 shrink-0">
        <h2 className="text-sm font-mono flex items-center gap-2 text-slate-200">
          <Terminal size={16} className="text-[#A5C396]" />
          <span>Console Moderatore & Debug</span>
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleTriggerPromoPush}
            disabled={isSending}
            className="px-2.5 py-1 bg-[#3E4A35] hover:bg-[#5A6B4E] disabled:bg-stone-800 text-white font-extrabold text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
          >
            <Bell size={12} />
            <span>{isSending ? "Invio..." : "Invia Push Prova"}</span>
          </button>
          <button onClick={() => setLogs([])} className="p-1 hover:bg-white/20 rounded">
            <Trash2 size={14} className="text-slate-400" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-1 bg-black/30 p-2.5 rounded-lg border border-white/10 min-h-0">
        {logs.length === 0 ? (
          <div className="text-gray-500 italic text-center py-6">Nessun log in console...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`p-0.5 leading-relaxed ${log.type === 'error' ? 'text-red-400' : 'text-gray-300'}`}>
              <span className="text-gray-500 mr-1">[{log.timestamp}]</span>
              <span>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const DebugPanel = () => {
  const [isVisible, setIsVisible] = useState(false);

  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-[9999] bg-black/80 text-white p-2 rounded-full shadow-lg"
      >
        <Terminal size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-1/2 bg-black/90 text-white z-[9999] flex flex-col p-4 shadow-2xl">
      <div className="flex justify-between items-center mb-2 border-b border-white/20 pb-2">
        <h2 className="text-lg font-mono">Debug Console</h2>
        <div className="flex gap-2">
            <button onClick={() => setIsVisible(false)} className="p-1 hover:bg-white/20 rounded"><X size={16}/></button>
        </div>
      </div>
      <DebugPanelContent />
    </div>
  );
};
