import React from 'react';
import { 
  Bell, 
  RefreshCw, 
  Send, 
  CheckCircle2, 
  Smartphone, 
  Shield, 
  Sparkles, 
  Image as ImageIcon, 
  Trash2, 
  Upload, 
  Clock, 
  Megaphone, 
  Info, 
  AlertTriangle,
  History,
  Tag,
  Smile
} from 'lucide-react';
import { 
  scheduleLocalPromoNotifications, 
  sendTestLocalNotification, 
  getScheduledNotificationsCount 
} from '../utils/localNotifications';
import { compressImage } from '../utils/photoCompressor';
import { resolveApiUrl, resolveMediaUrl } from '../utils/resolveMediaUrl';

interface PushHistoryItem {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  category?: string;
  sentBy?: string;
  sentAt?: string;
}

export function AdminNotificationSchedulerWidget() {
  const [activeTab, setActiveTab] = React.useState<'create' | 'history' | 'automated'>('create');
  
  // Custom Push Form state
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [category, setCategory] = React.useState<'update' | 'promo' | 'tip' | 'warning'>('update');
  const [imageUrl, setImageUrl] = React.useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const [isSendingCustomPush, setIsSendingCustomPush] = React.useState(false);
  const [customPushStatus, setCustomPushStatus] = React.useState<string | null>(null);

  // Push History state
  const [historyList, setHistoryList] = React.useState<PushHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);

  // Automated Scheduler state
  const [scheduledCount, setScheduledCount] = React.useState<number | null>(null);
  const [isScheduling, setIsScheduling] = React.useState<boolean>(false);
  const [isSendingServerTest, setIsSendingServerTest] = React.useState<boolean>(false);
  const [automatedStatus, setAutomatedStatus] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const refreshCount = React.useCallback(async () => {
    const count = await getScheduledNotificationsCount();
    setScheduledCount(count);
  }, []);

  const loadHistory = React.useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(resolveApiUrl('/api/admin/push-history'));
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.history)) {
          setHistoryList(data.history);
        }
      }
    } catch (err) {
      console.warn('[Push History] Error loading history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  React.useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  React.useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  // Quick Emoji helper
  const quickEmojis = ['🚀', '📢', '🚐', '🏕️', '🌟', '💡', '⚠️', '🛠️', '🎉', '🎁', '🗺️', '⛽', '📸', '💬', '📍', '🇮🇹', '🇪🇺'];

  const appendEmojiToTitle = (emoji: string) => {
    setTitle(prev => prev + ' ' + emoji);
  };

  const appendEmojiToBody = (emoji: string) => {
    setBody(prev => prev + ' ' + emoji);
  };

  // Image upload handler
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Seleziona un file immagine valido (JPG, PNG, WEBP).');
      return;
    }

    setIsUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawBase64 = event.target?.result as string;
        if (rawBase64) {
          const compressed = await compressImage(rawBase64, 'medium');
          setImageUrl(compressed);
        }
        setIsUploadingImage(false);
      };
      reader.onerror = () => {
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Errore caricamento foto notifica:', err);
      setIsUploadingImage(false);
    }
  };

  // Send Custom Moderator Push
  const handleSendCustomPush = async () => {
    if (!title.trim() || !body.trim()) {
      setCustomPushStatus('⚠️ Titolo e testo della notifica sono obbligatori.');
      return;
    }

    if (!window.confirm(`Sei sicuro di voler inviare questa notifica push a TUTTI gli utenti dell'app ViaCamper?\n\nTitolo: ${title}`)) {
      return;
    }

    setIsSendingCustomPush(true);
    setCustomPushStatus('Inoltro notifica Push in corso a tutti i dispositivi registrati...');

    try {
      const res = await fetch(resolveApiUrl('/api/admin/send-custom-push'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          imageUrl: imageUrl || null,
          category,
          sentBy: 'Moderatore ViaCamper',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCustomPushStatus(`🎉 NOTIFICA INVIATA CON SUCCESSO!\n"${title.trim()}" trasmesso a tutti i camperisti.`);
        // Reset form after successful broadcast
        setTitle('');
        setBody('');
        setImageUrl('');
        loadHistory();
      } else {
        setCustomPushStatus(`❌ Errore invio notifica: ${data.error || 'Risposta del server non valida'}`);
      }
    } catch (err: any) {
      setCustomPushStatus(`⚠️ Errore di rete: ${err?.message || err}`);
    } finally {
      setIsSendingCustomPush(false);
    }
  };

  // Force Automated Local Schedule
  const handleForceSchedule = async () => {
    setIsScheduling(true);
    setAutomatedStatus('Elaborazione e programmazione 50 notifiche in corso...');
    try {
      const res = await scheduleLocalPromoNotifications(true);
      await refreshCount();
      if (res.success) {
        setAutomatedStatus(`✅ Riprogrammate con successo ${res.count} notifiche locali sul dispositivo (1 ogni 2 giorni alle 14:00)!`);
      } else {
        setAutomatedStatus(`ℹ️ Stato programmazione: ${res.reason || 'Eseguita'}`);
      }
    } catch (err: any) {
      setAutomatedStatus(`⚠️ Si è verificato un errore: ${err?.message || err}`);
    } finally {
      setIsScheduling(false);
    }
  };

  // Local test push
  const handleSendLocalTest = async () => {
    setAutomatedStatus('Programmazione notifica di prova locale tra 3 secondi...');
    const res = await sendTestLocalNotification();
    setAutomatedStatus(res.message);
  };

  // Server test push
  const handleSendServerPushTest = async () => {
    setIsSendingServerTest(true);
    setAutomatedStatus('Invio notifica Push di prova dal server a tutti gli utenti registrati...');
    try {
      const response = await fetch('/api/admin/trigger-promo-test', { method: 'POST' });
      const data = await response.json();
      if (response.ok && data.success) {
        setAutomatedStatus(`🎉 Push inviato con successo a tutti i dispositivi! ("${data.promo?.title}")`);
      } else {
        setAutomatedStatus(`⚠️ Errore invio push server: ${data.error || 'Risposta non valida'}`);
      }
    } catch (err: any) {
      setAutomatedStatus(`⚠️ Errore di rete invio push: ${err?.message || err}`);
    } finally {
      setIsSendingServerTest(false);
    }
  };

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'promo':
        return <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold text-[9px] uppercase border border-amber-200">📢 Promozione</span>;
      case 'tip':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold text-[9px] uppercase border border-emerald-200">💡 Consiglio</span>;
      case 'warning':
        return <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-extrabold text-[9px] uppercase border border-rose-200">⚠️ Avviso</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-extrabold text-[9px] uppercase border border-blue-200">🚀 Novità App</span>;
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans">
      {/* Moderation Shield Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 dark:border-amber-800/60 p-4 rounded-2xl flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-xl">
            <Shield className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <span className="font-black text-sm block">Centro Notifiche & Comunicazioni Moderatore</span>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
              Crea ed invia avvisi, aggiornamenti e promozioni in tempo reale con emoji e foto allegata a tutti i dispositivi degli utenti.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'create'
              ? 'bg-[#3E4A35] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Megaphone className="w-4 h-4 text-amber-300" />
          <span>📣 Crea Notifica Push</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#3E4A35] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <History className="w-4 h-4 text-blue-300" />
          <span>📜 Storico Inviate</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('automated')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'automated'
              ? 'bg-[#3E4A35] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Clock className="w-4 h-4 text-emerald-300" />
          <span>⚙️ Programmazione Automatica</span>
        </button>
      </div>

      {/* TAB 1: CREATE CUSTOM PUSH */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Column */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
              <Megaphone className="w-4 h-4 text-[#3E4A35]" />
              Componi Messaggio Pubblicitario o Avviso
            </h4>

            {/* Category Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block">
                Tipo di Notifica
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'update', label: '🚀 Aggiornamento', color: 'border-blue-300 bg-blue-50 text-blue-900' },
                  { id: 'promo', label: '📢 Promozione', color: 'border-amber-300 bg-amber-50 text-amber-900' },
                  { id: 'tip', label: '💡 Consiglio', color: 'border-emerald-300 bg-emerald-50 text-emerald-900' },
                  { id: 'warning', label: '⚠️ Avviso', color: 'border-rose-300 bg-rose-50 text-rose-900' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as any)}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-extrabold text-center transition-all cursor-pointer ${
                      category === cat.id
                        ? `${cat.color} font-black shadow-3xs ring-2 ring-[#3E4A35]`
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                  Titolo Notifica Push *
                </label>
                <span className="text-[10px] text-slate-400 font-mono">{title.length}/60 car.</span>
              </div>
              <input
                type="text"
                maxLength={60}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="es. 🚀 Nuova versione 2.4.66 disponibile! Scopri le tappe AI"
                className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:border-[#3E4A35] outline-none"
              />
              {/* Quick Emojis Bar */}
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mr-1">
                  <Smile className="w-3 h-3" /> Emoji Titolo:
                </span>
                {quickEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => appendEmojiToTitle(emoji)}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-sm transition-transform active:scale-125 cursor-pointer"
                    title={`Aggiungi ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Body Textarea */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                  Testo / Messaggio *
                </label>
                <span className="text-[10px] text-slate-400 font-mono">{body.length}/200 car.</span>
              </div>
              <textarea
                rows={3}
                maxLength={200}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="es. Abbiamo integrato la ricerca veloce delle aree sosta, il calcolo dei consumi e nuove mappe. Apri l'app ora per esplorare!"
                className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:border-[#3E4A35] outline-none resize-none"
              />
              {/* Quick Emojis Bar for Body */}
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mr-1">
                  <Smile className="w-3 h-3" /> Emoji Testo:
                </span>
                {quickEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => appendEmojiToBody(emoji)}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-sm transition-transform active:scale-125 cursor-pointer"
                    title={`Aggiungi ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Upload / URL */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <label className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block">
                🖼️ Foto o Banner Pubblicitario (Opzionale)
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Upload className={`w-3.5 h-3.5 ${isUploadingImage ? 'animate-spin' : ''}`} />
                  <span>{isUploadingImage ? 'Elaborazione foto...' : 'Carica Foto da File'}</span>
                </button>

                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Rimuovi Foto</span>
                  </button>
                )}
              </div>

              {/* Direct URL input fallback */}
              <div className="pt-1">
                <input
                  type="text"
                  value={imageUrl.startsWith('data:') ? 'Foto locale elaborata ✓' : imageUrl}
                  onChange={(e) => {
                    if (!imageUrl.startsWith('data:')) setImageUrl(e.target.value);
                  }}
                  placeholder="Oppure incolla URL immagine HTTPS (es. https://...)"
                  readOnly={imageUrl.startsWith('data:')}
                  className="w-full text-[11px] font-mono px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                />
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2.5">
              <button
                type="button"
                disabled={isSendingCustomPush || !title.trim() || !body.trim()}
                onClick={handleSendCustomPush}
                className="px-5 py-3 bg-[#3E4A35] hover:bg-[#2d3627] text-white text-xs font-black rounded-xl shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <Send className={`w-4 h-4 text-amber-300 ${isSendingCustomPush ? 'animate-spin' : ''}`} />
                <span>{isSendingCustomPush ? 'Inoltro Push in corso...' : '🚀 Invia Notifica Push a Tutti'}</span>
              </button>

              <button
                type="button"
                onClick={handleSendLocalTest}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              >
                <Bell className="w-4 h-4 text-amber-300" />
                <span>Test Locale (3 sec)</span>
              </button>
            </div>

            {customPushStatus && (
              <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 flex items-start gap-2 animate-fade-in whitespace-pre-line">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{customPushStatus}</span>
              </div>
            )}
          </div>

          {/* Live Smartphone Mockup Column */}
          <div className="lg:col-span-5 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-500" />
              Anteprima Notifica Smartphone
            </h4>

            {/* Smartphone Outer Frame */}
            <div className="mx-auto max-w-[310px] bg-slate-900 rounded-[38px] p-3 shadow-2xl border-4 border-slate-800 text-slate-100 relative select-none">
              {/* Camera Notch */}
              <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-3 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-700"></div>
              </div>

              {/* Status Bar */}
              <div className="flex justify-between items-center text-[10px] font-mono px-3 text-slate-400 mb-4">
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <div className="flex items-center gap-1">
                  <span>5G</span>
                  <span>🔋 85%</span>
                </div>
              </div>

              {/* Push Notification Card inside Smartphone */}
              <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl p-3.5 border border-slate-700/80 shadow-lg space-y-2 animate-pulse-subtle">
                <div className="flex justify-between items-center border-b border-slate-700/50 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#3E4A35] flex items-center justify-center text-xs shadow-2xs">
                      🚐
                    </div>
                    <span className="font-extrabold text-[11px] text-white">ViaCamper</span>
                    <span className="text-[9px] text-slate-400">• Adesso</span>
                  </div>
                  {getCategoryBadge(category)}
                </div>

                <div className="space-y-1">
                  <h5 className="font-extrabold text-xs text-white leading-snug">
                    {title.trim() || 'Titolo della notifica...'}
                  </h5>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                    {body.trim() || 'Testo ed eventuale messaggio pubblicitario della notifica...'}
                  </p>
                </div>

                {/* Attached Banner Photo in Preview */}
                {imageUrl && (
                  <div className="pt-1.5 overflow-hidden rounded-xl">
                    <img
                      src={resolveMediaUrl(imageUrl)}
                      alt="Banner Notifica"
                      className="w-full h-32 object-cover rounded-xl border border-slate-700 shadow-xs"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Home indicator bar */}
              <div className="w-28 h-1 bg-slate-700 rounded-full mx-auto mt-6"></div>
            </div>

            <p className="text-[10.5px] text-slate-400 text-center italic">
              Così apparirà la notifica push sui telefoni Android & iOS degli utenti.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: PUSH HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-500" />
              Storico Notifiche Push Inviate ({historyList.length})
            </h4>
            <button
              type="button"
              onClick={loadHistory}
              disabled={isLoadingHistory}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors cursor-pointer"
              title="Aggiorna storico"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="py-12 text-center text-slate-400 space-y-2 animate-pulse">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#3E4A35]" />
              <p className="text-xs font-bold">Caricamento storico notifiche...</p>
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Nessuna notifica personalizzata inviata in precedenza.
              </p>
              <p className="text-[11px] text-slate-400">
                Le notifiche trasmesse dai moderatori appariranno qui in ordine cronologico.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyList.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getCategoryBadge(item.category)}
                      <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">
                        {item.title}
                      </h5>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                      {item.body}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono pt-1">
                      <span>👤 {item.sentBy || 'Moderatore'}</span>
                      <span>📅 {item.sentAt ? new Date(item.sentAt).toLocaleString('it-IT') : 'Data non disponibile'}</span>
                    </div>
                  </div>

                  {item.imageUrl && (
                    <div className="shrink-0">
                      <img
                        src={resolveMediaUrl(item.imageUrl)}
                        alt="Foto notifica"
                        className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUTOMATED SCHEDULER */}
      {activeTab === 'automated' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-stone-50 dark:bg-slate-800 p-4 rounded-xl border border-stone-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Notifiche Locali Programmate
                </span>
                <Smartphone className="w-4 h-4 text-[#3E4A35]" />
              </div>
              <div className="text-2xl font-black text-[#2D2926] dark:text-white flex items-center gap-2">
                {scheduledCount !== null ? (
                  <>
                    <span>{scheduledCount}</span>
                    <span className="text-xs font-normal text-slate-500">su 50 previste</span>
                  </>
                ) : (
                  <span className="text-sm font-normal text-slate-400 animate-pulse">Verifica in corso...</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Cadenza: <strong className="text-slate-700 dark:text-slate-200">1 notifica ogni 48 ore alle 14:00</strong>.
              </p>
            </div>

            <div className="bg-stone-50 dark:bg-slate-800 p-4 rounded-xl border border-stone-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Server FCM Push Scheduler
                </span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Modulo Cloud Sync Attivo
              </div>
              <p className="text-[11px] text-slate-500">
                Il server controlla ogni ora se sono trascorse 48 ore dall'ultimo invio globale agli utenti.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Azioni & Test Automazione
            </h4>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                disabled={isScheduling}
                onClick={handleForceSchedule}
                className="px-4 py-2 bg-[#3E4A35] hover:bg-[#2d3627] text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isScheduling ? 'animate-spin' : ''}`} />
                {isScheduling ? 'Riprogrammazione in corso...' : 'Forza Riprogrammazione 50 Notifiche (Locali)'}
              </button>

              <button
                type="button"
                onClick={handleSendLocalTest}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              >
                <Bell className="w-4 h-4 text-amber-300" />
                Test Notifica Locale (3 sec)
              </button>

              <button
                type="button"
                disabled={isSendingServerTest}
                onClick={handleSendServerPushTest}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <Send className={`w-4 h-4 ${isSendingServerTest ? 'animate-spin' : ''}`} />
                {isSendingServerTest ? 'Invio Push in corso...' : 'Invia Push di Prova a Tutti gli Utenti'}
              </button>
            </div>

            {automatedStatus && (
              <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 flex items-start gap-2 animate-fade-in mt-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{automatedStatus}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
