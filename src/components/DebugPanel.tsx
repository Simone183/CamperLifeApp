import React, { useState, useEffect } from 'react';
import { X, Trash2, Terminal } from 'lucide-react';

export const DebugPanelContent = () => {
  const [logs, setLogs] = useState<{ type: 'log' | 'error', message: string, timestamp: string }[]>([]);

  useEffect(() => {
    const handleLog = (e: any) => {
      setLogs(prev => [...prev, e.detail]);
    };
    window.addEventListener('debug-log', handleLog);
    return () => window.removeEventListener('debug-log', handleLog);
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full bg-black/90 text-white rounded-xl p-4 shadow-inner">
      <div className="flex justify-between items-center mb-2 border-b border-white/20 pb-2">
        <h2 className="text-lg font-mono">Debug Console</h2>
        <button onClick={() => setLogs([])} className="p-1 hover:bg-white/20 rounded"><Trash2 size={16}/></button>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1">
        {logs.map((log, i) => (
          <div key={i} className={`p-1 ${log.type === 'error' ? 'text-red-400' : 'text-gray-300'}`}>
            [{log.timestamp}] {log.message}
          </div>
        ))}
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
