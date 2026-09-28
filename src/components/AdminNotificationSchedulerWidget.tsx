import React from 'react';
import { Bell, RefreshCw, Send, CheckCircle2, AlertTriangle, Smartphone, Shield, Sparkles } from 'lucide-react';
import { 
  scheduleLocalPromoNotifications, 
  sendTestLocalNotification, 
  getScheduledNotificationsCount 
} from '../utils/localNotifications';

export function AdminNotificationSchedulerWidget() {
  const [scheduledCount, setScheduledCount] = React.useState<number | null>(null);
  const [isScheduling, setIsScheduling] = React.useState<boolean>(false);
  const [isSendingServerTest, setIsSendingServerTest] = React.useState<boolean>(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const refreshCount = React.useCallback(async () => {
    const count = await getScheduledNotificationsCount();
    setScheduledCount(count);
  }, []);

  React.useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  const handleForceSchedule = async () => {
    setIsScheduling(true);
    setStatusMessage("Elaborazione e programmazione 50 notifiche in corso...");
    try {
      const res = await scheduleLocalPromoNotifications(true);
      await refreshCount();
      if (res.success) {
        setStatusMessage(`✅ Riprogrammate con successo ${res.count} notifiche locali sul dispositivo (1 ogni 2 giorni alle 14:00)!`);
      } else {
        setStatusMessage(`ℹ️ Stato programmazione: ${res.reason || "Eseguita"}`);
      }
    } catch (err: any) {
      setStatusMessage(`⚠️ Si è verificato un errore: ${err?.message || err}`);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleSendLocalTest = async () => {
    setStatusMessage("Programmazione notifica di prova locale tra 3 secondi...");
    const res = await sendTestLocalNotification();
    setStatusMessage(res.message);
  };

  const handleSendServerPushTest = async () => {
    setIsSendingServerTest(true);
    setStatusMessage("Invio notifica Push di prova dal server a tutti gli utenti registrati...");
    try {
      const response = await fetch("/api/admin/trigger-promo-test", { method: "POST" });
      const data = await response.json();
      if (response.ok && data.success) {
        setStatusMessage(`🎉 Push inviato con successo a tutti i dispositivi! ("${data.promo?.title}")`);
      } else {
        setStatusMessage(`⚠️ Errore invio push server: ${data.error || "Risposta non valida"}`);
      }
    } catch (err: any) {
      setStatusMessage(`⚠️ Errore di rete invio push: ${err?.message || err}`);
    } finally {
      setIsSendingServerTest(false);
    }
  };

  return (
    <div className="space-y-5 text-slate-800 dark:text-slate-100">
      {/* Banner riservato moderatori */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3.5 rounded-xl flex items-center gap-3 text-amber-900 dark:text-amber-200">
        <Shield className="w-5 h-5 text-amber-600 shrink-0" />
        <div className="text-xs">
          <span className="font-extrabold block">Strumento Esclusivo Moderatori</span>
          Questo pannello è visibile soltanto agli amministratori e moderatori per gestire le notifiche automatiche dell'applicazione.
        </div>
      </div>

      {/* Stato notifiche locali */}
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

      {/* Comandi Moderatore */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Azioni & Test Notifiche
        </h4>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={isScheduling}
            onClick={handleForceSchedule}
            className="px-4 py-2 bg-[#3E4A35] hover:bg-[#2d3627] text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isScheduling ? "animate-spin" : ""}`} />
            {isScheduling ? "Riprogrammazione in corso..." : "Forza Riprogrammazione 50 Notifiche (Locali)"}
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
            <Send className={`w-4 h-4 ${isSendingServerTest ? "animate-spin" : ""}`} />
            {isSendingServerTest ? "Invio Push in corso..." : "Invia Push di Prova a Tutti gli Utenti"}
          </button>
        </div>
      </div>

      {/* Output / Feedback status message */}
      {statusMessage && (
        <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 flex items-start gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
}
