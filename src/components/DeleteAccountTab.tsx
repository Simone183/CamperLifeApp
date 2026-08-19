import React, { useState } from "react";
import {
  UserX,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  ShieldAlert,
  Info,
  Loader2,
} from "lucide-react";
import { User } from "../types";
import { resolveMediaUrl } from "../utils/resolveMediaUrl";

interface DeleteAccountTabProps {
  currentUser: User | null;
  onDeleteSuccess: () => void;
  onCancel: () => void;
}

export const DeleteAccountTab: React.FC<DeleteAccountTabProps> = ({
  currentUser,
  onDeleteSuccess,
  onCancel,
}) => {
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = confirmCheckbox;

  const handleDelete = async () => {
    if (!currentUser?.email) {
      setErrorMsg("Nessun utente registrato trovato nella sessione.");
      return;
    }

    if (!canSubmit) return;

    setIsDeleting(true);
    setErrorMsg(null);

    try {
      const response = await fetch(resolveMediaUrl("/api/user/delete-account"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: currentUser.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Impossibile completare l'eliminazione dell'account."
        );
      }

      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: {
            message: "🗑️ Account ed i dati associati sono stati eliminati con successo.",
            duration: 4500,
          },
        })
      );

      onDeleteSuccess();
    } catch (err: any) {
      console.error("Error deleting account:", err);
      // Fallback: even if network fails, force local logout and deletion
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {}
      onDeleteSuccess();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-2 px-1 sm:px-3">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-red-600 via-rose-700 to-red-800 text-white rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center gap-3.5 mb-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/25 shrink-0 shadow-xs">
            <UserX className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-red-200 block">
              Gestione Account & Privacy (GDPR Art. 17)
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Cancellazione Definitiva Account
            </h2>
          </div>
        </div>
        <p className="text-xs text-red-100 leading-relaxed font-medium">
          In questa sezione puoi esercitare il tuo Diritto all'Oblio ed eliminare in qualsiasi momento il tuo profilo utente e tutti i dati personali salvati su ViaCamper.
        </p>
      </div>

      {/* User Info Bar */}
      {currentUser ? (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {currentUser.profilePhoto ? (
              <img
                src={currentUser.profilePhoto}
                alt={currentUser.nickname}
                className="w-10 h-10 rounded-full object-cover border border-[#3E4A35]/30 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#3E4A35] text-white font-black text-sm flex items-center justify-center uppercase shrink-0">
                {currentUser.nickname?.[0] || "U"}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-800 truncate">
                {currentUser.nickname}
              </p>
              <p className="text-[11px] font-bold text-slate-500 truncate">
                {currentUser.email}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-lg font-black text-[10px] tracking-wider uppercase shrink-0">
            Account Attivo
          </span>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs font-bold text-amber-850 flex items-center gap-2.5">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Al momento non sei autenticato con un account registrato.</span>
        </div>
      )}

      {/* What happens on deletion section */}
      <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-3.5">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600" />
          <span>Cosa comporta l'eliminazione dell'account?</span>
        </h3>

        <div className="text-xs text-slate-700 space-y-2.5 leading-relaxed">
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-start gap-2.5">
            <Trash2 className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800">Cancellazione Dati Cloud</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Il tuo account su Firebase Firestore, il profilo utente, le preferenze ed il diario di bordo sincronizzato sul cloud verranno rimossi permanentemente dai nostri server.
              </p>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800">Consumi & Preferiti</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Tutti i dati storici registrati nella Carta Carburante e la lista dei posti camper preferiti associati alla tua email verranno cancellati.
              </p>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800">Contenuti Pubblici Community (UGC)</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Le recensioni ed i luoghi camper da te segnalati in precedenza sulla mappa rimarranno consultabili a beneficio della community, ma saranno totalmente scollegati dal tuo profilo e resi anonimi.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation form */}
      {currentUser && (
        <div className="bg-red-50/60 rounded-2xl p-5 border border-red-200/80 space-y-4">
          <h4 className="text-xs font-black text-red-900 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>Conferma Richiesta Eliminazione</span>
          </h4>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmCheckbox}
                onChange={(e) => setConfirmCheckbox(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer shrink-0"
              />
              <span className="text-xs font-bold text-slate-800 leading-snug">
                Confermo di voler cancellare definitivamente il mio account ed accetto la rimozione permanente di tutti i miei dati utente associati a <strong>{currentUser.email}</strong>.
              </span>
            </label>

            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-bold text-slate-600">
                Spunta la casella di conferma sopra e clicca sul pulsante rosso per eliminare definitivamente il tuo account.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-xs font-bold text-red-800">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className="w-full sm:w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer select-none active:scale-95 flex items-center justify-center gap-2 border border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Annulla e Torna a Strumenti</span>
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={!canSubmit || isDeleting}
              className={`w-full sm:w-1/2 py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer select-none active:scale-95 flex items-center justify-center gap-2 shadow-sm ${
                canSubmit && !isDeleting
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/60"
              }`}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Eliminazione in corso...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>CANCELLA DEFINITIVAMENTE ACCOUNT</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
