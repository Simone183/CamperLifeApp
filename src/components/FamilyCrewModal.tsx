import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Share2, 
  Copy, 
  Check, 
  LogOut, 
  Settings, 
  Fuel, 
  BookOpen, 
  CheckSquare, 
  ShoppingBag, 
  Wrench, 
  Sparkles, 
  X, 
  RefreshCw, 
  ShieldCheck, 
  UserCheck, 
  ExternalLink,
  MessageCircle,
  AlertCircle
} from 'lucide-react';
import { useFamilyCrew } from '../context/FamilyCrewContext';
import { CrewSyncModules } from '../types';
import { formatDateDDMMAA } from './FuelCardTab';

interface FamilyCrewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { email: string; nickname?: string; name?: string } | null;
}

export function FamilyCrewModal({ isOpen, onClose, currentUser }: FamilyCrewModalProps) {
  const { 
    currentCrew, 
    isLoading, 
    isOwner, 
    createCrew, 
    joinCrew, 
    leaveCrew, 
    updateCrewSettings, 
    refreshCrew 
  } = useFamilyCrew();

  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [crewName, setCrewName] = useState(currentUser?.nickname ? `Famiglia ${currentUser.nickname} 🚐` : 'Famiglia in Viaggio 🚐');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync module toggles
  const [syncModules, setSyncModules] = useState<CrewSyncModules>({
    fuelCard: true,
    trips: true,
    checklists: true,
    pantry: true,
    maintenance: true
  });

  // Edit crew name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editCrewName, setEditCrewName] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setErrorMessage("Effettua il login per creare un equipaggio.");
      return;
    }
    if (!crewName.trim()) {
      setErrorMessage("Inserisci un nome per l'equipaggio.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    const success = await createCrew(crewName, syncModules);
    setIsSubmitting(false);
    if (!success) {
      setErrorMessage("Errore durante la creazione dell'equipaggio. Riprova.");
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setErrorMessage("Effettua il login per unirti a un equipaggio.");
      return;
    }
    if (!inviteCodeInput.trim()) {
      setErrorMessage("Inserisci un codice invito valido.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    const result = await joinCrew(inviteCodeInput);
    setIsSubmitting(false);
    if (!result.success) {
      setErrorMessage(result.message || "Codice non valido o equipaggio non trovato.");
    } else {
      setInviteCodeInput('');
    }
  };

  const copyCodeToClipboard = () => {
    if (!currentCrew?.code) return;
    navigator.clipboard.writeText(currentCrew.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const shareViaWhatsApp = () => {
    if (!currentCrew) return;
    const text = `🚐 Ciao! Unisciti al nostro equipaggio camper "${currentCrew.name}" su CamperLife App per sincronizzare la carta carburante, la cambusa, le checklist e i diari di viaggio in tempo reale!\n\n🔑 Il codice invito è: *${currentCrew.code}*\n\nApri l'app e inseriscilo nella sezione Equipaggio Famiglia!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const toggleModule = async (module: keyof CrewSyncModules) => {
    if (!currentCrew) return;
    const updated = {
      ...currentCrew.syncModules,
      [module]: !currentCrew.syncModules[module]
    };
    await updateCrewSettings(undefined, updated);
  };

  const handleSaveName = async () => {
    if (!editCrewName.trim() || !currentCrew) return;
    await updateCrewSettings(editCrewName.trim());
    setIsEditingName(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Equipaggio Famiglia
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Live Sync
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Sincronizza carburante, cambusa, checklist e viaggi con la tua famiglia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!currentCrew ? (
            /* --- NOT IN A CREW: CREATE OR JOIN --- */
            <div className="space-y-6">
              <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800">
                <button
                  onClick={() => { setActiveTab('create'); setErrorMessage(null); }}
                  className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl transition ${
                    activeTab === 'create'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 inline mr-1.5" />
                  Crea Nuovo Equipaggio
                </button>
                <button
                  onClick={() => { setActiveTab('join'); setErrorMessage(null); }}
                  className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl transition ${
                    activeTab === 'join'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5 inline mr-1.5" />
                  Unisciti con Codice
                </button>
              </div>

              {activeTab === 'create' ? (
                <form onSubmit={handleCreate} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Nome dell'Equipaggio / Camper
                    </label>
                    <input
                      type="text"
                      value={crewName}
                      onChange={(e) => setCrewName(e.target.value)}
                      placeholder="es. Famiglia Sambucci - Laika Kreos"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:border-amber-500 transition"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-slate-300">
                      Schede da Sincronizzare con i membri:
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <label className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                        syncModules.fuelCard ? 'bg-amber-500/5 border-amber-500/30' : 'bg-slate-950/60 border-slate-800/80 opacity-60'
                      }`}>
                        <input
                          type="checkbox"
                          checked={syncModules.fuelCard}
                          onChange={(e) => setSyncModules(prev => ({ ...prev, fuelCard: e.target.checked }))}
                          className="rounded text-amber-500 focus:ring-0 focus:outline-none"
                        />
                        <Fuel className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-white">Carta Carburante</p>
                          <p className="text-[10px] text-slate-400">Rifornimenti e consumi</p>
                        </div>
                      </label>

                      <label className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                        syncModules.pantry ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-950/60 border-slate-800/80 opacity-60'
                      }`}>
                        <input
                          type="checkbox"
                          checked={syncModules.pantry}
                          onChange={(e) => setSyncModules(prev => ({ ...prev, pantry: e.target.checked }))}
                          className="rounded text-emerald-500 focus:ring-0 focus:outline-none"
                        />
                        <ShoppingBag className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-white">Cambusa & Spesa</p>
                          <p className="text-[10px] text-slate-400">Scorte e lista della spesa</p>
                        </div>
                      </label>

                      <label className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                        syncModules.checklists ? 'bg-blue-500/5 border-blue-500/30' : 'bg-slate-950/60 border-slate-800/80 opacity-60'
                      }`}>
                        <input
                          type="checkbox"
                          checked={syncModules.checklists}
                          onChange={(e) => setSyncModules(prev => ({ ...prev, checklists: e.target.checked }))}
                          className="rounded text-blue-500 focus:ring-0 focus:outline-none"
                        />
                        <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-white">Checklist di Bordo</p>
                          <p className="text-[10px] text-slate-400">Partenza, sosta e controlli</p>
                        </div>
                      </label>

                      <label className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                        syncModules.trips ? 'bg-purple-500/5 border-purple-500/30' : 'bg-slate-950/60 border-slate-800/80 opacity-60'
                      }`}>
                        <input
                          type="checkbox"
                          checked={syncModules.trips}
                          onChange={(e) => setSyncModules(prev => ({ ...prev, trips: e.target.checked }))}
                          className="rounded text-purple-500 focus:ring-0 focus:outline-none"
                        />
                        <BookOpen className="w-4 h-4 text-purple-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-white">Diari di Viaggio</p>
                          <p className="text-[10px] text-slate-400">Tappe, foto e spese</p>
                        </div>
                      </label>

                      <label className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition sm:col-span-2 ${
                        syncModules.maintenance ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-slate-950/60 border-slate-800/80 opacity-60'
                      }`}>
                        <input
                          type="checkbox"
                          checked={syncModules.maintenance}
                          onChange={(e) => setSyncModules(prev => ({ ...prev, maintenance: e.target.checked }))}
                          className="rounded text-cyan-500 focus:ring-0 focus:outline-none"
                        />
                        <Wrench className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-white">Manutenzione & Scadenziere</p>
                          <p className="text-[10px] text-slate-400">Tagliandi, controlli e scadenze documenti</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-2xl text-sm transition shadow-lg flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Crea Equipaggio & Genera Codice Invito
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleJoin} className="space-y-5">
                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
                    💡 <strong>Come funziona?</strong> Inserisci il codice a 6 caratteri (es. <code className="bg-slate-950 px-1.5 py-0.5 rounded font-mono text-amber-300">FAM-XXXX</code>) fornito dal capo equipaggio del camper per sincronizzare all'istante tutte le informazioni sul tuo dispositivo.
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Codice Invito Equipaggio
                    </label>
                    <input
                      type="text"
                      value={inviteCodeInput}
                      onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                      placeholder="es. FAM-8492"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-base font-mono uppercase tracking-widest text-center focus:outline-none focus:border-amber-500 transition"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-2xl text-sm transition shadow-lg flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        Unisciti all'Equipaggio
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* --- IN A CREW: MANAGEMENT DASHBOARD --- */
            <div className="space-y-6">
              
              {/* Crew Card */}
              <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {isEditingName ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editCrewName}
                            onChange={(e) => setEditCrewName(e.target.value)}
                            className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-amber-500"
                          />
                          <button
                            onClick={handleSaveName}
                            className="p-1.5 bg-amber-500 text-slate-950 rounded-lg text-xs font-bold"
                          >
                            Salva
                          </button>
                          <button
                            onClick={() => setIsEditingName(false)}
                            className="p-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs"
                          >
                            Annulla
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-base font-bold text-white">
                            {currentCrew.name}
                          </h3>
                          {isOwner && (
                            <button
                              onClick={() => {
                                setEditCrewName(currentCrew.name);
                                setIsEditingName(true);
                              }}
                              className="text-[11px] text-slate-400 hover:text-amber-400 underline transition"
                            >
                              Modifica
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Creato il {formatDateDDMMAA(currentCrew.createdAt)} &bull; Capo: <span className="text-slate-300 font-semibold">{currentCrew.ownerName}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => refreshCrew()}
                      title="Aggiorna sincronizzazione"
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Invite Code Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-900 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                      Codice Invito Equipaggio
                    </span>
                    <span className="text-xl font-black font-mono tracking-wider text-white">
                      {currentCrew.code}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={copyCodeToClipboard}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCode ? 'Copiato!' : 'Copia'}
                    </button>

                    <button
                      onClick={shareViaWhatsApp}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </button>
                  </div>
                </div>

                {/* Live Sync Status */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Sincronizzazione in tempo reale attiva</span>
                  </div>
                  {currentCrew.updatedBy && (
                    <span>Ultima mod: <strong className="text-slate-300">{currentCrew.updatedBy}</strong></span>
                  )}
                </div>
              </div>

              {/* Members List */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  Membri Connessi ({currentCrew.members?.length || 1})
                </h4>

                <div className="space-y-2">
                  {(currentCrew.members || []).map((member, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-black text-xs">
                          {member.nickname ? member.nickname.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            {member.nickname}
                            {member.role === 'owner' && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-medium">
                                Capo
                              </span>
                            )}
                            {member.email.toLowerCase() === currentUser?.email.toLowerCase() && (
                              <span className="text-[9px] text-slate-500">(Tu)</span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {member.email}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] text-slate-500">
                        {formatDateDDMMAA(member.joinedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Synced Modules Settings */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  Schede Sincronizzate
                </h4>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <Fuel className="w-4 h-4 text-amber-400" />
                      <div>
                        <p className="text-xs font-bold text-white">Carta Carburante</p>
                        <p className="text-[10px] text-slate-400">Rifornimenti, litri e calcolo consumi</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleModule('fuelCard')}
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                        currentCrew.syncModules?.fuelCard !== false ? 'bg-amber-500' : 'bg-slate-800'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        currentCrew.syncModules?.fuelCard !== false ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <ShoppingBag className="w-4 h-4 text-emerald-400" />
                      <div>
                        <p className="text-xs font-bold text-white">Cambusa & Lista Spesa</p>
                        <p className="text-[10px] text-slate-400">Prodotti in dispensa e lista spesa condivisa</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleModule('pantry')}
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                        currentCrew.syncModules?.pantry !== false ? 'bg-emerald-500' : 'bg-slate-800'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        currentCrew.syncModules?.pantry !== false ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <CheckSquare className="w-4 h-4 text-blue-400" />
                      <div>
                        <p className="text-xs font-bold text-white">Checklist di Bordo</p>
                        <p className="text-[10px] text-slate-400">Spunte e verifiche di partenza in tempo reale</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleModule('checklists')}
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                        currentCrew.syncModules?.checklists !== false ? 'bg-blue-500' : 'bg-slate-800'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        currentCrew.syncModules?.checklists !== false ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="w-4 h-4 text-purple-400" />
                      <div>
                        <p className="text-xs font-bold text-white">Diari di Viaggio</p>
                        <p className="text-[10px] text-slate-400">Itinerari, tappe, foto e spese condivise</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleModule('trips')}
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                        currentCrew.syncModules?.trips !== false ? 'bg-purple-500' : 'bg-slate-800'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        currentCrew.syncModules?.trips !== false ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <Wrench className="w-4 h-4 text-cyan-400" />
                      <div>
                        <p className="text-xs font-bold text-white">Manutenzione & Scadenze</p>
                        <p className="text-[10px] text-slate-400">Interventi tecnici e scadenze camper</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleModule('maintenance')}
                      className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                        currentCrew.syncModules?.maintenance !== false ? 'bg-cyan-500' : 'bg-slate-800'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        currentCrew.syncModules?.maintenance !== false ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Leave Crew button */}
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  onClick={async () => {
                    if (window.confirm("Sei sicuro di voler lasciare questo equipaggio?")) {
                      await leaveCrew();
                    }
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 font-semibold text-xs transition flex items-center justify-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {isOwner ? "Elimina / Abbandona Equipaggio" : "Abbandona Equipaggio"}
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

/**
 * Reusable Banner Component displayed inside tabs when family sync is active.
 */
export function FamilyCrewTabBanner({ 
  moduleName, 
  onOpenCrewModal 
}: { 
  moduleName: string; 
  onOpenCrewModal?: () => void; 
}) {
  const { currentCrew } = useFamilyCrew();

  if (!currentCrew) return null;

  return (
    <div 
      onClick={onOpenCrewModal}
      className="cursor-pointer mb-4 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-900 border border-amber-500/20 flex items-center justify-between gap-3 text-xs hover:border-amber-500/40 transition group"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
          <Users className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="text-white font-bold flex items-center gap-1.5">
            Equipaggio: {currentCrew.name}
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </span>
          <span className="text-slate-400 text-[11px]">
            {moduleName} condivisa in tempo reale con {currentCrew.members?.length || 1} membri
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-semibold group-hover:translate-x-0.5 transition">
        <span>Gestisci</span>
        <ExternalLink className="w-3 h-3" />
      </div>
    </div>
  );
}
