import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Trash2,
  X,
  AlertTriangle,
  Bell,
  RefreshCw,
} from 'lucide-react';
import {
  CalendarEventDraft,
  GoogleCalendarRemoteEvent,
  buildGoogleCalendarTemplateUrl,
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  getAccessToken,
  googleSignIn,
  initAuth,
  listViaCamperCalendarEvents,
  subscribeCalendarAuth,
} from '../utils/googleCalendar';
import { User } from 'firebase/auth';

export function openGoogleCalendarModal(
  draftOrList?: CalendarEventDraft | CalendarEventDraft[]
) {
  const drafts = !draftOrList
    ? []
    : Array.isArray(draftOrList)
    ? draftOrList
    : [draftOrList];
  window.dispatchEvent(
    new CustomEvent('open-google-calendar-modal', {
      detail: { drafts },
    })
  );
}

export function GoogleSignInMaterialButton({
  onClick,
  disabled,
  label = 'Accedi con Google Calendar',
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="gsi-material-button inline-flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border border-slate-300 shadow-sm font-bold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-60"
    >
      <div className="gsi-material-button-state" />
      <div className="gsi-material-button-content-wrapper flex items-center gap-2.5">
        <div className="gsi-material-button-icon w-4 h-4 shrink-0">
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            className="w-full h-full block"
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
        </div>
        <span className="gsi-material-button-contents">{label}</span>
      </div>
    </button>
  );
}

export default function GoogleCalendarModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [drafts, setDrafts] = useState<CalendarEventDraft[]>([]);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [savedResults, setSavedResults] = useState<GoogleCalendarRemoteEvent[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Remote events list & delete confirmation state
  const [activeView, setActiveView] = useState<'confirm_add' | 'list_remote'>('confirm_add');
  const [remoteEvents, setRemoteEvents] = useState<GoogleCalendarRemoteEvent[]>([]);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<GoogleCalendarRemoteEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsubInit = initAuth(
      (u, t) => {
        setUser(u);
        setUserEmail(u?.email || null);
        setToken(t);
        setNeedsAuth(false);
      },
      () => {
        setToken(null);
        setNeedsAuth(true);
      }
    );

    const unsubState = subscribeCalendarAuth((state) => {
      setUser(state.user);
      setUserEmail(state.userEmail);
      setToken(state.token);
      setNeedsAuth(state.needsAuth);
    });

    return () => {
      unsubInit();
      unsubState();
    };
  }, [isOpen]);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const custom = e as CustomEvent<{ drafts?: CalendarEventDraft[] }>;
      const incoming = Array.isArray(custom.detail?.drafts) ? custom.detail!.drafts : [];
      setDrafts(incoming);
      setSavedResults([]);
      setErrorMsg(null);
      setEventToDelete(null);
      setActiveView(incoming.length > 0 ? 'confirm_add' : 'list_remote');
      setIsOpen(true);
    };

    window.addEventListener('open-google-calendar-modal', handleOpen);
    return () => window.removeEventListener('open-google-calendar-modal', handleOpen);
  }, []);

  const fetchRemoteEvents = async (activeToken?: string | null) => {
    const tk = activeToken || token || (await getAccessToken());
    if (!tk) {
      setNeedsAuth(true);
      return;
    }
    setIsLoadingRemote(true);
    setErrorMsg(null);
    try {
      const items = await listViaCamperCalendarEvents(tk);
      setRemoteEvents(items);
    } catch (err: any) {
      if (err?.message === 'AUTH_EXPIRED') {
        setNeedsAuth(true);
      } else {
        setErrorMsg('Impossibile caricare gli eventi da Google Calendar.');
      }
    } finally {
      setIsLoadingRemote(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeView === 'list_remote' && !needsAuth && token) {
      fetchRemoteEvents(token);
    }
  }, [isOpen, activeView, needsAuth, token]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        if (activeView === 'list_remote') {
          await fetchRemoteEvents(result.accessToken);
        }
      } else {
        setErrorMsg(
          'Se il browser blocca la finestra popup, usa il pulsante "Apri direttamente in Google Calendar" qui sotto.'
        );
      }
    } catch {
      setErrorMsg(
        'Connessione popup bloccata dal browser. Usa il pulsante "Apri direttamente in Google Calendar" qui sotto.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleConfirmSaveToCalendar = async () => {
    if (drafts.length === 0) return;
    const activeToken = token || (await getAccessToken());
    if (!activeToken) {
      setNeedsAuth(true);
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      const created: GoogleCalendarRemoteEvent[] = [];
      for (const draft of drafts) {
        const res = await createGoogleCalendarEvent(activeToken, draft);
        created.push(res);
      }
      setSavedResults(created);
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: {
            message:
              created.length === 1
                ? `📅 "${drafts[0].title}" salvato sul tuo Google Calendar!`
                : `📅 Salvati ${created.length} promemoria sul tuo Google Calendar!`,
          },
        })
      );
    } catch (err: any) {
      if (err?.message === 'AUTH_EXPIRED') {
        setNeedsAuth(true);
        setErrorMsg('Sessione Google Calendar scaduta. Accedi nuovamente per confermare.');
      } else {
        setErrorMsg(err?.message || 'Errore durante il salvataggio su Google Calendar.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDeleteRemoteEvent = async () => {
    if (!eventToDelete) return;
    const activeToken = token || (await getAccessToken());
    if (!activeToken) {
      setNeedsAuth(true);
      return;
    }
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await deleteGoogleCalendarEvent(activeToken, eventToDelete.id);
      setRemoteEvents((prev) => prev.filter((ev) => ev.id !== eventToDelete.id));
      setEventToDelete(null);
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: { message: '🗑️ Evento rimosso da Google Calendar.' },
        })
      );
    } catch (err: any) {
      if (err?.message === 'AUTH_EXPIRED') {
        setNeedsAuth(true);
      } else {
        setErrorMsg("Impossibile eliminare l'evento selezionato da Google Calendar.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const updateSingleDraftField = (
    index: number,
    field: keyof CalendarEventDraft,
    value: any
  ) => {
    setDrafts((prev) =>
      prev.map((d, idx) => (idx === index ? { ...d, [field]: value } : d))
    );
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-[100005] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150 font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#3E4A35] to-[#2B3523] text-white px-4 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white leading-tight">
                Google Calendar · ViaCamper
              </h3>
              <p className="text-[10.5px] text-emerald-100/90 font-medium">
                {userEmail || user?.email
                  ? `Collegato come ${userEmail || user?.email}`
                  : 'Salva sagre, eventi e scadenze manutenzione'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Switcher */}
        <div className="px-4 pt-3 pb-2 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {drafts.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveView('confirm_add')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  activeView === 'confirm_add'
                    ? 'bg-[#3E4A35] text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Conferma Salvataggio ({drafts.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveView('list_remote')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeView === 'list_remote'
                  ? 'bg-[#3E4A35] text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              I Miei Eventi Salvati
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Authentication Prompt when token is not yet in memory */}
          {needsAuth && (
            <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-3 text-center">
              <div className="space-y-1">
                <h4 className="font-black text-amber-950 dark:text-amber-200 text-xs sm:text-sm">
                  Collega il tuo account Google Calendar
                </h4>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  Per sincronizzare automaticamente i promemoria sul tuo calendario, accedi con Google qui sotto.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <GoogleSignInMaterialButton
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  label={
                    isLoggingIn
                      ? 'Connessione a Google Calendar...'
                      : 'Sign in with Google'
                  }
                />
                {drafts.length === 1 && (
                  <a
                    href={buildGoogleCalendarTemplateUrl(drafts[0])}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-sm transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Apri direttamente in Google Calendar</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 font-bold text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* VIEW 1: EXPLICIT CONFIRMATION DIALOG FOR SAVING EVENT(S) */}
          {activeView === 'confirm_add' && (
            <>
              {savedResults.length > 0 ? (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 space-y-3 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <div className="space-y-1">
                    <h4 className="font-black text-emerald-950 dark:text-emerald-200 text-sm">
                      {savedResults.length === 1
                        ? 'Evento aggiunto a Google Calendar!'
                        : `${savedResults.length} eventi aggiunti a Google Calendar!`}
                    </h4>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                      Il promemoria è ora attivo sul tuo calendario Google e sincronizzato sui tuoi dispositivi.
                    </p>
                  </div>

                  {savedResults.length === 1 && savedResults[0].htmlLink && (
                    <a
                      href={savedResults[0].htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Apri in Google Calendar</span>
                    </a>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <p className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">
                      {drafts.length === 1
                        ? 'Confermi di voler aggiungere questo evento al tuo Google Calendar?'
                        : `Confermi di voler aggiungere ${drafts.length} scadenze al tuo Google Calendar?`}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Verifica i dettagli qui sotto prima di confermare l&apos;operazione.
                    </p>
                  </div>

                  {drafts.length === 1 ? (
                    <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                          Titolo Evento su Google Calendar
                        </label>
                        <input
                          type="text"
                          value={drafts[0].title}
                          onChange={(e) =>
                            updateSingleDraftField(0, 'title', e.target.value)
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-100 text-xs outline-none focus:border-[#3E4A35]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                            Data Inizio
                          </label>
                          <input
                            type="date"
                            value={drafts[0].startDate}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateSingleDraftField(0, 'startDate', val);
                              if (!drafts[0].endDate || drafts[0].endDate < val) {
                                updateSingleDraftField(0, 'endDate', val);
                              }
                            }}
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-100 text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                            Data Fine
                          </label>
                          <input
                            type="date"
                            value={drafts[0].endDate || drafts[0].startDate}
                            onChange={(e) =>
                              updateSingleDraftField(0, 'endDate', e.target.value)
                            }
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-100 text-xs outline-none"
                          />
                        </div>
                      </div>

                      {drafts[0].location !== undefined && (
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                            Luogo / Comune
                          </label>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200">
                            <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <input
                              type="text"
                              value={drafts[0].location || ''}
                              onChange={(e) =>
                                updateSingleDraftField(0, 'location', e.target.value)
                              }
                              className="w-full bg-transparent outline-none font-medium text-xs"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                          <Bell className="w-3 h-3 text-amber-500" />
                          <span>Avviso Promemoria Automatico</span>
                        </label>
                        <select
                          value={drafts[0].reminderDaysBefore ?? 2}
                          onChange={(e) =>
                            updateSingleDraftField(
                              0,
                              'reminderDaysBefore',
                              Number(e.target.value)
                            )
                          }
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-200 text-xs outline-none"
                        >
                          <option value={1}>1 giorno prima</option>
                          <option value={2}>2 giorni prima</option>
                          <option value={3}>3 giorni prima</option>
                          <option value={7}>7 giorni prima (1 settimana)</option>
                          <option value={15}>15 giorni prima</option>
                          <option value={30}>30 giorni prima (1 mese)</option>
                        </select>
                      </div>

                      {drafts[0].description && (
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                            Note e Dettagli
                          </label>
                          <textarea
                            rows={3}
                            value={drafts[0].description}
                            onChange={(e) =>
                              updateSingleDraftField(0, 'description', e.target.value)
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-[11px] outline-none"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800">
                      {drafts.map((d, i) => (
                        <div
                          key={d.id || i}
                          className="p-3 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                              {d.title}
                            </div>
                            <div className="text-[10.5px] text-slate-500">
                              📅 Scadenza: {d.startDate}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={buildGoogleCalendarTemplateUrl(d)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center gap-1"
                              title="Apri direttamente in Google Calendar"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Apri</span>
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                setDrafts((prev) => prev.filter((_, idx) => idx !== i))
                              }
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              title="Escludi da questo salvataggio"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* VIEW 2: LIST SAVED REMOTE EVENTS + EXPLICIT DELETE CONFIRMATION */}
          {activeView === 'list_remote' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-700 dark:text-slate-200 text-xs">
                  Promemoria ViaCamper su Google Calendar
                </span>
                {!needsAuth && (
                  <button
                    type="button"
                    onClick={() => fetchRemoteEvents()}
                    disabled={isLoadingRemote}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${isLoadingRemote ? 'animate-spin' : ''}`}
                    />
                    <span>Aggiorna</span>
                  </button>
                )}
              </div>

              {/* Explicit Confirmation Dialog before Deleting an Event from Google Calendar */}
              {eventToDelete && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-300 dark:border-rose-700 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-black text-rose-950 dark:text-rose-100 text-xs">
                        Confermi l&apos;eliminazione da Google Calendar?
                      </h5>
                      <p className="text-[11px] text-rose-800 dark:text-rose-200 mt-0.5">
                        L&apos;evento <b>&ldquo;{eventToDelete.summary}&rdquo;</b> verrà rimosso definitivamente dal tuo Google Calendar.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEventToDelete(null)}
                      disabled={isDeleting}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs cursor-pointer"
                    >
                      Annulla
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDeleteRemoteEvent}
                      disabled={isDeleting}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer"
                    >
                      {isDeleting ? 'Eliminazione...' : 'Conferma ed Elimina'}
                    </button>
                  </div>
                </div>
              )}

              {!needsAuth && !isLoadingRemote && remoteEvents.length === 0 && (
                <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500">
                  Nessun promemoria ViaCamper trovato nei prossimi mesi su Google Calendar.
                </div>
              )}

              <div className="space-y-2">
                {remoteEvents.map((ev) => {
                  const startLabel =
                    ev.start?.date ||
                    (ev.start?.dateTime ? ev.start.dateTime.slice(0, 10) : '');
                  return (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">
                          {ev.summary}
                        </div>
                        <div className="text-[10.5px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>📅 {startLabel}</span>
                          {ev.location && (
                            <span className="truncate">· 📍 {ev.location}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {ev.htmlLink && (
                          <a
                            href={ev.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Apri in Google Calendar"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setEventToDelete(ev)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Elimina da Google Calendar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 font-bold text-xs cursor-pointer"
          >
            {savedResults.length > 0 || activeView === 'list_remote'
              ? 'Chiudi'
              : 'Annulla'}
          </button>

          {activeView === 'confirm_add' &&
            savedResults.length === 0 &&
            drafts.length > 0 && (
              <button
                type="button"
                onClick={needsAuth ? handleLogin : handleConfirmSaveToCalendar}
                disabled={isSaving || isLoggingIn}
                className="px-4 py-2 rounded-xl bg-[#3E4A35] hover:bg-[#5A6B4E] disabled:opacity-50 text-white font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {isSaving
                    ? 'Salvataggio in corso...'
                    : needsAuth
                    ? 'Accedi con Google per Continuare'
                    : drafts.length === 1
                    ? 'Conferma e Salva su Google Calendar'
                    : `Conferma e Salva (${drafts.length}) su Calendar`}
                </span>
              </button>
            )}
        </div>
      </div>
    </div>,
    document.body
  );
}
