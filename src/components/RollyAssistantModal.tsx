import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { VehicleSpecs } from '../types';

interface RollyAssistantModalProps {
  vehicle: VehicleSpecs;
  onClose: () => void;
}

export const RollyAssistantModal: React.FC<RollyAssistantModalProps> = ({ vehicle, onClose }) => {
  const [messages, setMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([
    {
      sender: 'ai',
      text: `Ciao! Sono Rolly, il tuo assistente di bordo ViaCamper 🚐✨\nPosso aiutarti con consigli sulla sosta libera, calcolo consumi gas/batterie o raccomandazioni per itinerari panorami.`
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMsg = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg,
          context: { vehicle }
        })
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { sender: 'ai', text: 'Scusami, si è verificato un errore di connessione con il servizio AI.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'ai', text: 'Per soste libere o allacci elettrici ti suggerisco di controllare sempre i cartelli locali.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[560px]">
        
        {/* Header */}
        <div className="p-4 bg-emerald-800 text-white rounded-t-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm font-serif">Rolly - Assistente Camper AI</h3>
              <p className="text-[10px] text-emerald-200">Powered by Gemini 2.5 Flash</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg hover:bg-emerald-700 text-emerald-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat History */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-stone-50 dark:bg-slate-950/40">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.sender === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-emerald-800 text-amber-300 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`p-3.5 rounded-2xl text-xs max-w-[85%] leading-relaxed whitespace-pre-line shadow-2xs ${
                m.sender === 'user'
                  ? 'bg-emerald-800 text-white rounded-tr-none font-medium'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700 font-sans'
              }`}>
                {m.text}
              </div>

              {m.sender === 'user' && (
                <div className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium italic">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
              <span>Rolly sta elaborando la risposta...</span>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl flex gap-2">
          <input
            type="text"
            placeholder="Fai una domanda a Rolly (es. dove scaricare a Pienza)..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 p-2.5 rounded-xl bg-stone-100 dark:bg-slate-800 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
