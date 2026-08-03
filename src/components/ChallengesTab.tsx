import React, { useState } from 'react';
import { 
  Trophy, 
  Camera, 
  MapPin, 
  Sparkles, 
  Award, 
  TrendingUp, 
  Upload, 
  CheckCircle2, 
  Heart, 
  Plus, 
  Share2, 
  Flame, 
  Star, 
  Users, 
  ChevronRight,
  Info,
  Gift,
  X,
  Compass,
  MessageSquare,
  Image as ImageIcon
} from 'lucide-react';
import { CartoonCamperAvatar } from './CartoonCamperAvatar';
import { RollyOnboardingGuide } from './RollyOnboardingGuide';
import { compressImage } from '../utils/photoCompressor';

export interface ChallengeSubmission {
  id: string;
  challengeId: string;
  userName: string;
  userAvatar: string;
  userBadge: string;
  placeName: string;
  location: string;
  imageUrl: string;
  caption: string;
  likes: number;
  likedByMe?: boolean;
  date: string;
  isExample?: boolean;
}

export interface ChallengeItem {
  id: string;
  title: string;
  badgeTag: string;
  icon: string;
  description: string;
  reward: string;
  xpPoints: number;
  progress: number;
  maxProgress: number;
  unit: string;
  endDate: string;
  isCompleted?: boolean;
}

const INITIAL_CHALLENGES: ChallengeItem[] = [
  {
    id: 'ch_sea_view',
    title: 'Sfida #1: A caccia di foto vista mare 🌊',
    badgeTag: 'Vista Mare',
    icon: '🌊',
    description: 'Pubblica una foto scattata dal tuo camper o da un\'area sosta con affaccio diretto sul mare o sulla costa.',
    reward: 'Badge "Vista Mare Master" + Partecipazione Estrazione Kit Camperist',
    xpPoints: 100,
    progress: 0,
    maxProgress: 1,
    unit: 'foto',
    endDate: '31 Agosto 2026'
  },
  {
    id: 'ch_new_stop',
    title: 'Sfida #2: Cacciatore di Nuove Soste 🚐',
    badgeTag: 'Esploratore',
    icon: '🧭',
    description: 'Aggiungi o proponi 3 nuove aree sosta, agricamper o punti camper service non ancora presenti in mappa.',
    reward: 'Badge "Pioneer Soste" + 150 Punti XP',
    xpPoints: 150,
    progress: 1,
    maxProgress: 3,
    unit: 'soste',
    endDate: '15 Settembre 2026'
  },
  {
    id: 'ch_top_review',
    title: 'Sfida #3: Recensore DOC con Foto 📸',
    badgeTag: 'Recensore',
    icon: '⭐',
    description: 'Lascia 2 recensioni dettagliate inserendo giudizio su ombra, segnale 4G/5G, livello terreno e foto.',
    reward: 'Badge "Guida Trasparente" + 80 Punti XP',
    xpPoints: 80,
    progress: 1,
    maxProgress: 2,
    unit: 'recensioni',
    endDate: '20 Settembre 2026'
  }
];

const INITIAL_SUBMISSIONS: ChallengeSubmission[] = [
  {
    id: 'sub_1',
    challengeId: 'ch_sea_view',
    userName: 'Elena & Marco (VanLife)',
    userAvatar: 'EM',
    userBadge: 'VIP Camperist',
    placeName: 'Sosta Panoramica Capo Caccia (Esempio)',
    location: 'Alghero (SS), Sardegna',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    caption: 'Svegliarsi con il rumore delle onde del mare e la scogliera di fronte! Sosta fantastica e ombreggiata.',
    likes: 42,
    likedByMe: false,
    date: 'Oggi, 11:30',
    isExample: true
  },
  {
    id: 'sub_2',
    challengeId: 'ch_sea_view',
    userName: 'Beppe & Knaus 600',
    userAvatar: 'BK',
    userBadge: 'FotoReporter',
    placeName: 'Agricampeggio Riviera delle Palme (Esempio)',
    location: 'Grottammare (AP), Marche',
    imageUrl: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=800&q=80',
    caption: 'Tramonto spettacolare direttamente dalla dinette. Allaccio 220V e pista ciclabile a 20 metri.',
    likes: 29,
    likedByMe: true,
    date: 'Ieri, 19:45',
    isExample: true
  },
  {
    id: 'sub_3',
    challengeId: 'ch_new_stop',
    userName: 'Simo_FamilyOnRoad',
    userAvatar: 'SF',
    userBadge: 'Pioneer Soste',
    placeName: 'Area Camper Verde Salento (Esempio)',
    location: 'Otranto (LE), Puglia',
    imageUrl: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=800&q=80',
    caption: 'Nuova area sosta a conduzione familiare aperta da 2 mesi. Fondo in erba, ombra e carico/scarico comodissimo.',
    likes: 18,
    likedByMe: false,
    date: '2 giorni fa',
    isExample: true
  }
];

const LEADERBOARD_USERS = [
  { rank: 1, name: 'Elena & Marco', points: 1420, badges: '🏆 Master Camperist', avatar: 'EM', stopsAdded: 18, isExample: true },
  { rank: 2, name: 'Beppe & Knaus 600', points: 1180, badges: '📸 FotoReporter', avatar: 'BK', stopsAdded: 14, isExample: true },
  { rank: 3, name: 'Simo_FamilyOnRoad', points: 950, badges: '🧭 Pioneer Soste', avatar: 'SF', stopsAdded: 11, isExample: true },
  { rank: 4, name: 'Tu (Camperista)', points: 380, badges: '🌊 Vista Mare Explorer', avatar: 'TU', stopsAdded: 3, isUser: true, isExample: false },
  { rank: 5, name: 'Pietro&Anto Camper', points: 340, badges: '⭐ Recensore DOC', avatar: 'PA', stopsAdded: 4, isExample: true }
];

export function ChallengesTab({
  onOpenAddPlace,
  currentUser
}: {
  onOpenAddPlace?: () => void;
  currentUser?: { name?: string; surname?: string; nickname?: string; email?: string } | null;
}) {
  const [challenges, setChallenges] = useState<ChallengeItem[]>(INITIAL_CHALLENGES);
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>(INITIAL_SUBMISSIONS);
  const [userXp, setUserXp] = useState<number>(380);
  const [activeTab, setActiveTab] = useState<'sfide' | 'gallery' | 'leaderboard'>('sfide');

  // Modal for participating in a challenge
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeItem | null>(null);
  const [modalPlaceName, setModalPlaceName] = useState('');
  const [modalLocation, setModalLocation] = useState('');
  const [modalCaption, setModalCaption] = useState('');
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          const compressed = await compressImage(base64, 'medium');
          setModalImage(compressed);
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error compressing image:', err);
      setIsUploading(false);
    }
  };

  const handleToggleLike = (subId: string) => {
    setSubmissions(prev =>
      prev.map(sub => {
        if (sub.id === subId) {
          const isLiked = sub.likedByMe;
          return {
            ...sub,
            likedByMe: !isLiked,
            likes: isLiked ? sub.likes - 1 : sub.likes + 1
          };
        }
        return sub;
      })
    );
  };

  const handleSubmitChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallenge || !modalPlaceName.trim()) return;

    const senderName = currentUser?.name
      ? `${currentUser.name} ${currentUser.surname || ''}`.trim()
      : currentUser?.nickname || currentUser?.email || 'Tu (Camperista)';

    const newSub: ChallengeSubmission = {
      id: `sub_${Date.now()}`,
      challengeId: selectedChallenge.id,
      userName: senderName,
      userAvatar: senderName.substring(0, 2).toUpperCase(),
      userBadge: 'Explorer Camperist',
      placeName: modalPlaceName.trim(),
      location: modalLocation.trim() || 'Italia',
      imageUrl: modalImage || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      caption: modalCaption.trim() || 'Partecipazione alla sfida CamperLife App!',
      likes: 1,
      likedByMe: true,
      date: 'Appena adesso'
    };

    setSubmissions([newSub, ...submissions]);

    // Send email notification to admin via backend API
    fetch('/api/notify-photo-submission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'concorso',
        userName: senderName,
        userEmail: currentUser?.email || '',
        title: selectedChallenge.title,
        placeName: modalPlaceName.trim(),
        location: modalLocation.trim() || 'Italia',
        imageUrl: modalImage || newSub.imageUrl,
        caption: modalCaption.trim() || 'Partecipazione al concorso fotografico CamperLife App!'
      })
    }).catch(err => console.warn('[ChallengesTab] Error triggering photo notification email:', err));

    // Update challenge progress
    setChallenges(prev =>
      prev.map(ch => {
        if (ch.id === selectedChallenge.id) {
          const newProgress = Math.min(ch.maxProgress, ch.progress + 1);
          const isCompleted = newProgress >= ch.maxProgress;
          return {
            ...ch,
            progress: newProgress,
            isCompleted
          };
        }
        return ch;
      })
    );

    // Award XP
    const pointsAwarded = selectedChallenge.xpPoints;
    setUserXp(prev => prev + pointsAwarded);

    // Toast
    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { message: `🎉 Sfida inviata con successo! +${pointsAwarded} Punti XP guadagnati!` }
      })
    );

    // Reset modal
    setSelectedChallenge(null);
    setModalPlaceName('');
    setModalLocation('');
    setModalCaption('');
    setModalImage(null);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-br from-[#1C3D2B] via-[#2A543B] to-[#142E20] rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden border border-emerald-800/50">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <Trophy className="w-3.5 h-3.5" /> Gamification &amp; Concorsi
              </span>
              <RollyOnboardingGuide sectionKey="community" className="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
              Sfide, Concorsi &amp; Badge Camperisti 🏆
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Partecipa alle sfide fotografiche, aggiungi e recensisci aree sosta. Guadagna punti XP, sblocca badge di livello e partecipa all'estrazione dei premi mensili per la community!
            </p>
          </div>

          {/* User Score Stats Widget */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex items-center gap-4 shrink-0 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 text-slate-950 font-black text-xl flex items-center justify-center shadow-md">
              TU
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Livello 4 - Explorer</span>
              </div>
              <div className="text-xl font-black text-white leading-none">
                {userXp} <span className="text-xs font-normal text-emerald-200">XP</span>
              </div>
              <div className="text-[10px] text-emerald-100/80 font-medium">
                #4 in Classifica della Community
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 border-b border-stone-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('sfide')}
          className={`px-2 py-2 sm:px-4 sm:py-2.5 rounded-xl font-extrabold text-[11px] sm:text-xs md:text-sm transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer ${
            activeTab === 'sfide'
              ? 'bg-[#1C3D2B] text-white shadow-md'
              : 'bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 hover:bg-stone-200/80'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
          <span className="truncate">
            <span className="hidden xs:inline">Sfide Attive</span>
            <span className="xs:hidden">Sfide</span>
          </span>
          <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-800 dark:text-amber-200 text-[9px] sm:text-[10px] shrink-0">
            {challenges.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gallery')}
          className={`px-2 py-2 sm:px-4 sm:py-2.5 rounded-xl font-extrabold text-[11px] sm:text-xs md:text-sm transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer ${
            activeTab === 'gallery'
              ? 'bg-[#1C3D2B] text-white shadow-md'
              : 'bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 hover:bg-stone-200/80'
          }`}
        >
          <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
          <span className="truncate">
            <span className="hidden sm:inline">Bacheca Foto &amp; Soste</span>
            <span className="hidden xs:inline sm:hidden">Bacheca Foto</span>
            <span className="xs:hidden">Foto</span>
          </span>
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-800 dark:text-emerald-200 text-[9px] sm:text-[10px] shrink-0">
            {submissions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`px-2 py-2 sm:px-4 sm:py-2.5 rounded-xl font-extrabold text-[11px] sm:text-xs md:text-sm transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'bg-[#1C3D2B] text-white shadow-md'
              : 'bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 hover:bg-stone-200/80'
          }`}
        >
          <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 shrink-0" />
          <span className="truncate">
            <span className="hidden sm:inline">Classifica Top Camperisti</span>
            <span className="hidden xs:inline sm:hidden">Classifica Top</span>
            <span className="xs:hidden">Classifica</span>
          </span>
        </button>
      </div>

      {/* TAB 1: ACTIVE CHALLENGES */}
      {activeTab === 'sfide' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500 animate-bounce" />
                Concorsi e Sfide della Settimana
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Metti alla prova le tue abilità da camperista e vinci premi per la tua cellula.
              </p>
            </div>
            
            {onOpenAddPlace && (
              <button
                type="button"
                onClick={onOpenAddPlace}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Proponi Nuova Sosta</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.map(ch => {
              const pct = Math.round((ch.progress / ch.maxProgress) * 100);
              return (
                <div
                  key={ch.id}
                  className={`bg-white dark:bg-slate-800 rounded-3xl p-5 border transition-all flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md ${
                    ch.isCompleted 
                      ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/10' 
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-3xl p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700/80 border border-slate-200/50 dark:border-slate-600 shrink-0">
                        {ch.icon}
                      </span>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider">
                          +{ch.xpPoints} XP
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Scade il {ch.endDate}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-base leading-snug">
                        {ch.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                        {ch.description}
                      </p>
                    </div>

                    {/* Reward details */}
                    <div className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex items-center gap-2 text-amber-950 dark:text-amber-200 text-xs">
                      <Gift className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-bold text-[11px] leading-tight">
                        Premio: {ch.reward}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>Avanzamento</span>
                        <span>{ch.progress} / {ch.maxProgress} {ch.unit} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2">
                    {ch.isCompleted ? (
                      <div className="w-full py-2.5 rounded-xl bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 font-black text-xs flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Sfida Completata! 🏆</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedChallenge(ch)}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#1C3D2B] hover:bg-[#142d22] text-white font-extrabold text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Camera className="w-4 h-4 text-amber-400" />
                        <span>Partecipa &amp; Carica Foto</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: GALLERY / SUBMISSIONS */}
      {activeTab === 'gallery' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-600" />
                Foto e Soste Inviate dalla Community
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Vota le foto più belle e prendi spunto per la tua prossima fermata in camper.
              </p>
            </div>
          </div>

          {/* Info Banner for Example Data */}
          <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2.5">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Nota dimostrativa:</strong> I contributi mostrati di seguito sono contenuti di <strong>Esempio</strong>. Quando caricherai una tua foto apparirà qui in tempo reale!
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {submissions.map(sub => (
              <div
                key={sub.id}
                className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video bg-slate-100 overflow-hidden group">
                    <img
                      src={sub.imageUrl}
                      alt={sub.placeName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/70 backdrop-blur-md text-white font-bold text-[10px] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      <span className="truncate max-w-[160px]">{sub.placeName}</span>
                    </div>
                    {sub.isExample && (
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-sm">
                        Esempio
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {sub.userAvatar}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                            <span>{sub.userName}</span>
                            {sub.isExample && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 text-[9px] font-black">
                                (Esempio)
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            {sub.userBadge}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">{sub.date}</span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                      "{sub.caption}"
                    </p>

                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>{sub.location}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(sub.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      sub.likedByMe
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${sub.likedByMe ? 'fill-rose-600 text-rose-600' : ''}`} />
                    <span>{sub.likes} {sub.likes === 1 ? 'Mi piace' : 'Mi piace'}</span>
                  </button>

                  <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-950/80 border border-amber-200/80 dark:border-amber-800/60 px-2.5 py-1 rounded-lg">
                    {sub.isExample ? 'Foto di Esempio' : 'Concorso Valido'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Classifica Camperisti del Mese
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              I membri della community che hanno contribuito maggiormente con soste, foto e recensioni.
            </p>
          </div>

          {/* Info Banner for Leaderboard Example */}
          <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2.5">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Nota dimostrativa:</strong> I punteggi e i profili degli altri utenti in classifica sono dati di <strong>Esempio</strong> a scopo illustrativo.
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {LEADERBOARD_USERS.map(user => (
              <div
                key={user.rank}
                className={`py-3.5 px-3 sm:px-4 rounded-2xl flex items-center justify-between gap-3 transition-colors ${
                  user.isUser
                    ? 'bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                    user.rank === 1 ? 'bg-amber-400 text-slate-950 shadow-md' :
                    user.rank === 2 ? 'bg-slate-300 text-slate-900' :
                    user.rank === 3 ? 'bg-amber-700 text-white' :
                    'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    #{user.rank}
                  </div>

                  <div className="w-10 h-10 rounded-2xl bg-[#1C3D2B] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {user.avatar}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                        {user.name}
                      </span>
                      {user.isUser ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] uppercase">
                          Tu
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-[9px]">
                          Esempio
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      {user.badges} • {user.stopsAdded} soste aggiunte
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-base font-black text-slate-900 dark:text-white">
                    {user.points} <span className="text-xs font-medium text-slate-400">XP</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: PARTICIPATE IN A CHALLENGE */}
      {selectedChallenge && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-md overflow-y-auto p-3 sm:p-5 flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setSelectedChallenge(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1C3D2B] via-[#2D5A40] to-[#1C3D2B] text-white p-5 relative shrink-0">
              <button
                type="button"
                onClick={() => setSelectedChallenge(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 pr-8">
                <span className="text-3xl p-2 bg-white/10 rounded-2xl">
                  {selectedChallenge.icon}
                </span>
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                    Concorso +{selectedChallenge.xpPoints} XP
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight mt-0.5">
                    {selectedChallenge.title}
                  </h3>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitChallenge} className="p-5 space-y-4 text-slate-800 dark:text-slate-100">
              <div className="space-y-1">
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  Nome Area Sosta / Luogo Panoramico *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Es. Sosta Capo Caccia, Parcheggio Mare..."
                  value={modalPlaceName}
                  onChange={e => setModalPlaceName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  Località / Comune
                </label>
                <input
                  type="text"
                  placeholder="Es. Alghero (SS), Sardegna"
                  value={modalLocation}
                  onChange={e => setModalLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  Foto per la Sfida
                </label>
                {modalImage ? (
                  <div className="relative rounded-2xl overflow-hidden aspect-video border border-slate-200">
                    <img src={modalImage} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setModalImage(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 cursor-pointer transition-colors bg-slate-50 dark:bg-slate-800/50">
                    <Upload className="w-6 h-6 text-emerald-600 mb-1" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isUploading ? 'Compressione foto...' : 'Scatta o seleziona foto'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">JPEG, PNG fino a 10MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  Note / Descrizione del Luogo
                </label>
                <textarea
                  rows={2}
                  placeholder="Racconta brevemente com'è la sosta e la vista..."
                  value={modalCaption}
                  onChange={e => setModalCaption(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedChallenge(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={!modalPlaceName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#1C3D2B] hover:bg-[#142d22] disabled:opacity-50 text-white font-extrabold text-xs transition-all shadow-md active:scale-98 cursor-pointer flex items-center gap-1.5"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Invia &amp; Guadagna +{selectedChallenge.xpPoints} XP</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
