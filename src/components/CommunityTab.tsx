/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CommunityMessage } from '../types';
import {
  MessageSquare,
  Heart,
  Send,
  AlertOctagon,
  CheckCircle,
  Trash2,
  ChevronRight,
  Search,
  MessageCircle,
  Filter,
  Flame,
  Radio,
  Clock,
  User,
  Sparkles,
  Share2,
  X,
  Plus,
  Paperclip,
  Image as ImageIcon,
  Film,
  Play,
  ArrowLeft
} from 'lucide-react';

interface CommunityTabProps {
  messages: CommunityMessage[];
  onChange: (messages: CommunityMessage[]) => void;
  isAdmin?: boolean;
  onOpenChallenges?: () => void;
  currentUser?: {
    nickname?: string;
    name?: string;
    email?: string;
    isModerator?: boolean;
  } | null;
}

export default function CommunityTab({ messages, onChange, isAdmin, onOpenChallenges, currentUser }: CommunityTabProps) {
  // View mode: 'feed' (Social/Forum), 'chat' (WhatsApp style), 'sos' (Emergency SOS focus)
  const [viewMode, setViewMode] = React.useState<'feed' | 'chat' | 'sos'>('feed');
  const [selectedTag, setSelectedTag] = React.useState<CommunityMessage['tag'] | 'Tutti'>('Tutti');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Forum 3-Level Hierarchy State: Level 1 (null, null) -> Level 2 (category, null) -> Level 3 (category, discussionId)
  const [selectedForumCategory, setSelectedForumCategory] = React.useState<CommunityMessage['tag'] | null>(null);
  const [selectedDiscussionId, setSelectedDiscussionId] = React.useState<string | null>(null);

  // Category metadata for Level 1 Argomenti
  const forumCategoryMeta: Record<CommunityMessage['tag'], { title: string; desc: string; icon: string; bg: string; border: string }> = {
    Generale: {
      title: 'Generale & Vita On The Road',
      desc: 'Consigli di viaggio, allestimento camper, esperienze della community e consigli utili.',
      icon: '💬',
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      border: 'border-emerald-500/30',
    },
    Sosta: {
      title: 'Sosta, Campeggi & Agricamper',
      desc: 'Segnalazioni, opinioni e recensioni su aree sosta, campeggi e sosta libera in sicurezza.',
      icon: '🚐',
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      border: 'border-amber-500/30',
    },
    Meteo: {
      title: 'Meteo, Vento & Viaggi Invernali',
      desc: 'Bollettini meteo per camperisti, consigli per la guida con vento e catene da neve.',
      icon: '🌤️',
      bg: 'bg-sky-500/10 dark:bg-sky-500/20',
      border: 'border-sky-500/30',
    },
    Incontro: {
      title: 'Incontri, Raduni & Carovane',
      desc: 'Organizza o partecipa a raduni tra camperisti, aperitivi in compagnia e uscite weekend.',
      icon: '👥',
      bg: 'bg-purple-500/10 dark:bg-purple-500/20',
      border: 'border-purple-500/30',
    },
    SOS: {
      title: 'SOS & Meccanica Fai-da-Te',
      desc: 'Guasti, fusibili, impianto elettrico, pannelli solari e richiesta di assistenza rapida.',
      icon: '🛠️',
      bg: 'bg-rose-500/10 dark:bg-rose-500/20',
      border: 'border-rose-500/30',
    },
  };
  
  // Post & Reply states
  const [postTitle, setPostTitle] = React.useState('');
  const [postText, setPostText] = React.useState('');
  const [postTag, setPostTag] = React.useState<CommunityMessage['tag']>('Generale');
  const [expandedReplies, setExpandedReplies] = React.useState<{ [key: string]: boolean }>({});
  const [replyTexts, setReplyTexts] = React.useState<{ [key: string]: string }>({});
  const [showCreatePostModal, setShowCreatePostModal] = React.useState(false);
  const [postTargetType, setPostTargetType] = React.useState<'forum' | 'chat'>('forum');

  // Media Attachment States
  const [postMedia, setPostMedia] = React.useState<{ url: string; type: 'image' | 'video'; name: string } | null>(null);
  const [replyMedia, setReplyMedia] = React.useState<{ [msgId: string]: { url: string; type: 'image' | 'video'; name: string } }>({});
  const [mediaModal, setMediaModal] = React.useState<{ url: string; type: 'image' | 'video' } | null>(null);

  const postFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (url: string, type: 'image' | 'video', name: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video');
    const isImage = file.type.startsWith('image');

    if (!isImage && !isVideo) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "⚠️ Seleziona un file immagine (JPG, PNG) o video (MP4, MOV)." },
        })
      );
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "⚠️ File troppo grande (massimo 25MB)." },
        })
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onSuccess(event.target.result as string, isVideo ? 'video' : 'image', file.name);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Keep target type synchronized with current view mode when mode changes
  React.useEffect(() => {
    setPostTargetType(viewMode === 'chat' ? 'chat' : 'forum');
  }, [viewMode]);

  // Registered user name (e.g. Sam83)
  const activeUserName = React.useMemo(() => {
    if (currentUser?.nickname && currentUser.nickname.trim()) {
      return currentUser.nickname.trim();
    }
    if (currentUser?.name && currentUser.name.trim()) {
      return currentUser.name.trim();
    }
    try {
      const saved = localStorage.getItem('camper_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.nickname?.trim()) return u.nickname.trim();
        if (u.name?.trim()) return u.name.trim();
      }
    } catch {
      // fallback
    }
    return 'Sam83';
  }, [currentUser]);

  const currentUserAvatar = activeUserName.slice(0, 2).toUpperCase();
  const currentUserColor = 'bg-[#5A6B4E]';

  // User presence logic for live chat
  const isUserOnlineInChat = React.useCallback((username: string, timestamp?: string) => {
    if (!username) return false;
    // Current user is always online
    if (
      username === activeUserName ||
      username.includes('Tu') ||
      username === 'Tu (Camperista)' ||
      (currentUser?.email && username === currentUser.email)
    ) {
      return true;
    }

    // Check if timestamp is within last 1 hour or if user is active mock chatter
    if (timestamp) {
      const timeAgo = Date.now() - new Date(timestamp).getTime();
      if (!isNaN(timeAgo) && timeAgo < 60 * 60 * 1000) {
        return true;
      }
    }

    // Specific active live chat users
    if (['Elena_Camper91', 'Marco_Van78'].includes(username)) {
      return true;
    }

    return false;
  }, [activeUserName, currentUser]);

  const tags: Array<CommunityMessage['tag']> = ['Generale', 'Meteo', 'SOS', 'Sosta', 'Incontro'];

  // Toggle replies visibility for a message
  const toggleReplies = (msgId: string) => {
    setExpandedReplies(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // Delete Confirmation state for Moderation
  const [deleteConfirmTarget, setDeleteConfirmTarget] = React.useState<{
    type: 'message' | 'reply';
    msgId: string;
    replyId?: string;
    snippet?: string;
  } | null>(null);

  const requestDeleteMessage = (msgId: string, text?: string) => {
    setDeleteConfirmTarget({
      type: 'message',
      msgId,
      snippet: text ? (text.length > 80 ? text.slice(0, 80) + '...' : text) : undefined,
    });
  };

  const requestDeleteReply = (msgId: string, replyId: string, text?: string) => {
    setDeleteConfirmTarget({
      type: 'reply',
      msgId,
      replyId,
      snippet: text ? (text.length > 80 ? text.slice(0, 80) + '...' : text) : undefined,
    });
  };

  const confirmDelete = () => {
    if (!deleteConfirmTarget) return;

    if (deleteConfirmTarget.type === 'message') {
      onChange(messages.filter((m) => m.id !== deleteConfirmTarget.msgId));
    } else if (deleteConfirmTarget.type === 'reply' && deleteConfirmTarget.replyId) {
      onChange(
        messages.map((m) => {
          if (m.id === deleteConfirmTarget.msgId) {
            return {
              ...m,
              replies: (m.replies || []).filter((r) => r.id !== deleteConfirmTarget.replyId),
            };
          }
          return m;
        })
      );
    }

    setDeleteConfirmTarget(null);

    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: {
          message: deleteConfirmTarget.type === 'message' ? "🗑️ Messaggio eliminato con successo!" : "🗑️ Risposta eliminata con successo!",
        },
      })
    );
  };

  const handleDeleteMessage = (msgId: string) => {
    requestDeleteMessage(msgId);
  };

  const handleDeleteReply = (msgId: string, replyId: string) => {
    requestDeleteReply(msgId, replyId);
  };

  const handleCreatePost = (e?: React.FormEvent, overrideTargetType?: 'forum' | 'chat') => {
    if (e) e.preventDefault();
    if (!postText.trim() && !postMedia) return;

    const targetType: 'forum' | 'chat' = overrideTargetType || postTargetType || (viewMode === 'chat' ? 'chat' : 'forum');

    const effectiveTag: CommunityMessage['tag'] =
      viewMode === 'sos' || postTag === 'SOS'
        ? 'SOS'
        : selectedTag !== 'Tutti'
        ? selectedTag
        : postTag;

    const newMsg: CommunityMessage = {
      id: `m_${Date.now()}`,
      user: activeUserName,
      avatar: currentUserAvatar,
      avatarColor: currentUserColor,
      title: targetType === 'forum' ? (postTitle.trim() || undefined) : undefined,
      text: postText.trim(),
      timestamp: new Date().toISOString(),
      likes: 0,
      likedByCurrentUser: false,
      tag: effectiveTag,
      type: targetType,
      isResolved: false,
      mediaUrl: postMedia?.url,
      mediaType: postMedia?.type,
      replies: [],
    };

    const updated = [newMsg, ...messages];
    onChange(updated);

    if (targetType === 'forum') {
      setSelectedForumCategory(effectiveTag);
      setSelectedDiscussionId(newMsg.id);
    }

    setPostTitle('');
    setPostText('');
    setPostMedia(null);
    setShowCreatePostModal(false);
  };

  const simulateReply = (msgId: string, type: 'SOS_RESP' | 'GEN_RESP') => {
    const responses = {
      SOS_RESP: [
        { user: 'BeppeVan', text: 'Sono a circa 15 km da voi! Se vi serve una mano posso raggiungervi con qualche attrezzo. Fatemi sapere!' },
        { user: 'Simo_FamilyOnRoad', text: 'Forza ragazzi! Teneteci aggiornati, noi camperisti ci aiutiamo sempre.' }
      ],
      GEN_RESP: [
        { user: 'Elena_Camper91', text: 'Ottima segnalazione! Segnata per il mio prossimo viaggio 🚐💨' },
        { user: 'Pietro_Anto', text: 'Grazie della condivisione, utilissimo!' }
      ]
    };

    const lines = responses[type];
    const picked = lines[Math.floor(Math.random() * lines.length)];

    onChange(
      messages.map((m) => {
        if (m.id === msgId) {
          if (m.isResolved) return m;
          const currentReplies = m.replies || [];
          return {
            ...m,
            replies: [
              ...currentReplies,
              {
                id: `reply_${Date.now()}`,
                user: picked.user,
                text: picked.text,
                timestamp: new Date().toISOString()
              }
            ]
          };
        }
        return m;
      })
    );
  };

  const handleLike = (id: string) => {
    const updated = messages.map((m) => {
      if (m.id === id) {
        const liked = !m.likedByCurrentUser;
        return {
          ...m,
          likedByCurrentUser: liked,
          likes: liked ? m.likes + 1 : m.likes - 1,
        };
      }
      return m;
    });
    onChange(updated);
  };

  const handleResolve = (msgId: string) => {
    onChange(
      messages.map((m) => {
        if (m.id === msgId) {
          return {
            ...m,
            isResolved: true
          };
        }
        return m;
      })
    );
  };

  const handleCreateReply = (msgId: string) => {
    const targetMsg = messages.find(m => m.id === msgId);
    if (targetMsg?.isResolved) return;

    const text = replyTexts[msgId] || '';
    const currentMedia = replyMedia[msgId];
    if (!text.trim() && !currentMedia) return;

    onChange(
      messages.map((m) => {
        if (m.id === msgId) {
          const currentReplies = m.replies || [];
          return {
            ...m,
            replies: [
              ...currentReplies,
              {
                id: `reply_${Date.now()}`,
                user: activeUserName,
                text: text.trim(),
                timestamp: new Date().toISOString(),
                mediaUrl: currentMedia?.url,
                mediaType: currentMedia?.type,
              }
            ]
          };
        }
        return m;
      })
    );

    setReplyTexts(prev => ({ ...prev, [msgId]: '' }));
    setReplyMedia(prev => {
      const next = { ...prev };
      delete next[msgId];
      return next;
    });
    // Automatically expand replies when user comments
    setExpandedReplies(prev => ({ ...prev, [msgId]: true }));
  };

  const getTagStyle = (tag: CommunityMessage['tag'], isResolved?: boolean) => {
    if (tag === 'SOS' && isResolved) {
      return 'bg-emerald-600 text-white font-bold';
    }
    switch (tag) {
      case 'SOS': return 'bg-rose-600 text-white font-black animate-pulse';
      case 'Meteo': return 'bg-sky-600 text-white font-bold';
      case 'Sosta': return 'bg-[#3E4A35] text-white font-bold';
      case 'Incontro': return 'bg-amber-600 text-white font-bold';
      default: return 'bg-slate-600 text-white font-bold';
    }
  };

  // Filtered messages calculation - Strictly separates Forum & Bacheca vs Chat Live vs SOS
  const filteredMessages = messages.filter((m) => {
    const isChatMsg = m.type === 'chat';
    const isForumMsg = m.type === 'forum' || !m.type; // default legacy messages to forum

    if (viewMode === 'chat') {
      if (!isChatMsg) return false;
    } else if (viewMode === 'sos') {
      if (!isForumMsg || m.tag !== 'SOS') return false;
    } else {
      // viewMode === 'feed' (Forum & Bacheca) - exclude chat AND exclude SOS emergency posts
      if (!isForumMsg || m.tag === 'SOS') return false;
    }

    if (selectedTag !== 'Tutti' && m.tag !== selectedTag) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = m.text.toLowerCase().includes(q);
      const matchUser = m.user.toLowerCase().includes(q);
      const matchReplies = m.replies?.some(r => r.text.toLowerCase().includes(q) || r.user.toLowerCase().includes(q));
      return matchText || matchUser || matchReplies;
    }
    return true;
  });

  const activeSosCount = messages.filter(m => (m.type === 'forum' || !m.type) && m.tag === 'SOS' && !m.isResolved).length;
  const currentModeTotalCount = messages.filter(m => {
    if (viewMode === 'chat') return m.type === 'chat';
    if (viewMode === 'sos') return (m.type === 'forum' || !m.type) && m.tag === 'SOS';
    return (m.type === 'forum' || !m.type) && m.tag !== 'SOS';
  }).length;

  return (
    <div className="space-y-5">
      {/* Admin Mode Status Banner */}
      {isAdmin && (
        <div className="bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/40 rounded-2xl p-3 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200 font-bold shadow-xs">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>Modalità Amministratore Attiva:</span>
            <span className="font-normal opacity-90">Puoi eliminare qualsiasi messaggio da Chat Live, Forum e SOS.</span>
          </div>
          <span className="text-[10px] bg-amber-500/20 dark:bg-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold shrink-0">
            Admin Moderazione
          </span>
        </div>
      )}

      {/* Contest Banner - Compact Mobile Friendly */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-slate-950 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border border-amber-400/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-950 text-amber-400 rounded-xl shadow-md text-xl shrink-0">
            🏆
          </div>
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950 text-amber-300 font-black text-[9px] uppercase tracking-wider">
              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
              <span>Concorso Attivo</span>
            </div>
            <h3 className="font-black text-slate-950 text-xs sm:text-sm leading-tight mt-0.5 truncate">
              Sfida #1: Foto Vista Mare 🌊
            </h3>
            <p className="text-slate-900/90 text-[11px] mt-0.5 line-clamp-1 sm:line-clamp-none">
              Pubblica una foto con vista mare, aggiungi spot e scala la classifica!
            </p>
          </div>
        </div>
        {onOpenChallenges && (
          <button
            type="button"
            onClick={onOpenChallenges}
            className="w-full sm:w-auto px-4 py-2 bg-slate-950 hover:bg-slate-900 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <span>Partecipa Ora</span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
          </button>
        )}
      </div>

      {/* Main Mode Navigation Bar: 3-column equal grid on mobile, zero overflow scroll */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-2 shadow-xs space-y-2">
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => {
              setViewMode('feed');
              setSelectedForumCategory(null);
              setSelectedDiscussionId(null);
            }}
            className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 text-center cursor-pointer ${
              viewMode === 'feed'
                ? 'bg-[#3E4A35] text-white dark:bg-[#A3B896] dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Flame className="w-4 h-4 shrink-0" />
            <span className="text-[11px] sm:text-xs">Forum</span>
          </button>

          <button
            onClick={() => setViewMode('chat')}
            className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 text-center cursor-pointer ${
              viewMode === 'chat'
                ? 'bg-[#3E4A35] text-white dark:bg-[#A3B896] dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse sm:hidden" />
            </div>
            <span className="text-[11px] sm:text-xs">Chat Live</span>
          </button>

          <button
            onClick={() => setViewMode('sos')}
            className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 text-center cursor-pointer relative ${
              viewMode === 'sos'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60'
            }`}
          >
            <div className="flex items-center gap-1">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              {activeSosCount > 0 && (
                <span className="px-1 rounded-full bg-rose-500 text-white font-black text-[9px] animate-pulse sm:hidden">
                  {activeSosCount}
                </span>
              )}
            </div>
            <span className="text-[11px] sm:text-xs">SOS</span>
          </button>
        </div>

        <button
          onClick={() => {
            const target = viewMode === 'chat' ? 'chat' : 'forum';
            setPostTargetType(target);
            if (viewMode === 'sos') {
              setPostTag('SOS');
              if (!postText) setPostText('⚠️ RICHIESTA SOS: ');
            } else if (selectedTag !== 'Tutti') {
              setPostTag(selectedTag);
            } else if (postTag === 'SOS') {
              setPostTag('Generale');
            }
            setShowCreatePostModal(true);
          }}
          className="w-full py-2.5 bg-[#5A6B4E] hover:bg-[#3E4A35] text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{viewMode === 'chat' ? 'Scrivi in Chat Live' : viewMode === 'sos' ? 'Segnala Emergenza SOS' : 'Nuovo Post nel Forum'}</span>
        </button>
      </div>

      {/* Filter & Search Toolbar - Wrapped Filters, Zero Scroll */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-3 shadow-xs space-y-2.5">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={viewMode === 'chat' ? "Cerca nella chat live..." : "Cerca discussioni, soste, consigli..."}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-[#3E4A35] dark:focus:border-[#A3B896] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Wrap Pills - Shown for Chat & SOS modes */}
        {viewMode !== 'feed' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <button
              onClick={() => setSelectedTag('Tutti')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedTag === 'Tutti'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Tutti ({currentModeTotalCount})
            </button>
            {tags.map((tag) => {
              const count = messages.filter((m) => {
                if (viewMode === 'chat') return m.type === 'chat' && m.tag === tag;
                if (viewMode === 'sos') return (m.type === 'forum' || !m.type) && m.tag === 'SOS';
                return m.tag === tag;
              }).length;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    selectedTag === tag
                      ? 'bg-[#3E4A35] text-white dark:bg-[#A3B896] dark:text-slate-950'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span>{tag}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* SOS Banner in Emergency Mode or if Active SOS */}
      {viewMode === 'sos' && (
        <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-900 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex gap-3.5 items-start">
            <div className="p-3 bg-red-600 text-white rounded-2xl animate-bounce shrink-0">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-red-950 dark:text-red-200 text-sm sm:text-base">
                Rete di Soccorso Reciproco Camperisti
              </h3>
              <p className="text-red-800 dark:text-red-300/90 text-xs mt-0.5">
                Utilizza questo canale esclusivamente per guasti meccanici, veicoli bloccati nel fango/neve, o emergenze in viaggio.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setPostTag('SOS');
              setPostText('⚠️ RICHIESTA SOS: Ho bisogno di supporto nelle vicinanze per: ');
              setShowCreatePostModal(true);
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 active:scale-95"
          >
            Lancia SOS Ora
          </button>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      {viewMode === 'chat' ? (
        /* WHATSAPP / DIRECT CHAT STREAM VIEW */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[520px]">
          {/* Stream Header */}
          <div className="p-3.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                Canale Chat Live • Camperisti d'Italia
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              {filteredMessages.length} messaggi
            </span>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F4F6F0]/40 dark:bg-slate-900/50">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Nessun messaggio trovato in chat. Inviane uno ora!
              </div>
            ) : (
              filteredMessages.slice().reverse().map((msg) => {
                const isMe = msg.user === activeUserName || msg.user.includes('Tu') || (currentUser?.email && msg.user === currentUser.email);
                const displayName = (msg.user.includes('Tu') || msg.user === 'Tu (Camperista)') ? activeUserName : msg.user;
                const isOnline = isUserOnlineInChat(msg.user, msg.timestamp);
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
                      <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isOnline
                              ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]'
                              : 'bg-rose-500'
                          }`}
                          title={isOnline ? 'Utente Online' : 'Utente Offline'}
                        />
                        <span>{displayName}</span>
                      </div>
                      <span>•</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${getTagStyle(msg.tag, msg.isResolved)}`}>
                        {msg.tag}
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => requestDeleteMessage(msg.id, msg.text)}
                          title="Elimina messaggio chat (Admin)"
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-all cursor-pointer ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div
                      className={`max-w-[85%] sm:max-w-[70%] p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                        isMe
                          ? 'bg-[#3E4A35] text-white rounded-br-none'
                          : msg.tag === 'SOS'
                          ? 'bg-rose-50 text-rose-950 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-100 rounded-bl-none'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/70 dark:border-slate-700 rounded-bl-none'
                      }`}
                    >
                      {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                      {/* Attached Media in Chat Bubble */}
                      {msg.mediaUrl && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 max-w-full">
                          {msg.mediaType === 'video' ? (
                            <video src={msg.mediaUrl} controls className="w-full max-h-60 object-contain rounded-xl bg-black" />
                          ) : (
                            <div
                              className="relative group cursor-pointer"
                              onClick={() => setMediaModal({ url: msg.mediaUrl!, type: 'image' })}
                            >
                              <img src={msg.mediaUrl} alt="Foto allegata" className="w-full max-h-60 object-cover rounded-xl" />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-[10px] text-white bg-black/60 px-2 py-0.5 rounded-full font-bold">Ingrandisci</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Like button & footer for chat bubble */}
                      <div className={`mt-2 pt-1.5 border-t flex items-center justify-between text-[10px] ${
                        isMe ? 'border-white/20 text-white/90' : 'border-slate-200/60 dark:border-slate-700/60 text-slate-500 dark:text-slate-400'
                      }`}>
                        <button
                          type="button"
                          onClick={() => handleLike(msg.id)}
                          className={`flex items-center gap-1 font-bold transition-all cursor-pointer hover:scale-105 ${
                            msg.likedByCurrentUser
                              ? (isMe ? 'text-rose-300' : 'text-rose-600 dark:text-rose-400')
                              : (isMe ? 'text-white/80 hover:text-rose-200' : 'hover:text-rose-600 dark:hover:text-rose-400')
                          }`}
                          title="Metti 'Mi Piace'"
                        >
                          <Heart className={`w-3.5 h-3.5 ${msg.likedByCurrentUser ? 'fill-current' : ''}`} />
                          <span>{msg.likes > 0 ? msg.likes : 'Mi piace'}</span>
                        </button>
                      </div>

                      {/* Nested Chat Replies if any */}
                      {msg.replies && msg.replies.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 space-y-1.5">
                          {msg.replies.map(r => {
                            const rUser = (r.user === 'Tu (Camperista)' || r.user.includes('Tu')) ? activeUserName : r.user;
                            const rIsOnline = isUserOnlineInChat(r.user, r.timestamp);
                            return (
                              <div key={r.id} className="text-[11px] bg-black/5 dark:bg-white/5 p-1.5 rounded-lg flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                        rIsOnline ? 'bg-emerald-500' : 'bg-rose-500'
                                      }`}
                                      title={rIsOnline ? 'Utente Online' : 'Utente Offline'}
                                    />
                                    <span className="font-bold opacity-80 shrink-0">{rUser}: </span>
                                    <span className="truncate">{r.text}</span>
                                  </div>
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => requestDeleteReply(msg.id, r.id, r.text)}
                                      title="Elimina risposta (Admin)"
                                      className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 p-0.5 shrink-0 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                {r.mediaUrl && (
                                  <div className="mt-1 max-w-full">
                                    {r.mediaType === 'video' ? (
                                      <video src={r.mediaUrl} controls className="max-h-36 rounded-lg object-contain bg-black" />
                                    ) : (
                                      <img
                                        src={r.mediaUrl}
                                        alt="Allegato"
                                        className="max-h-36 rounded-lg object-cover cursor-pointer hover:opacity-95"
                                        onClick={() => setMediaModal({ url: r.mediaUrl!, type: 'image' })}
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Chat Bottom Input Bar */}
          <div>
            {postMedia && (
              <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden text-xs text-slate-700 dark:text-slate-300">
                  {postMedia.type === 'video' ? <Film className="w-4 h-4 text-rose-500 shrink-0" /> : <ImageIcon className="w-4 h-4 text-[#5A6B4E] shrink-0" />}
                  <span className="truncate font-semibold">{postMedia.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPostMedia(null)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 cursor-pointer"
                  title="Rimuovi allegato"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={(e) => handleCreatePost(e, 'chat')} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex gap-2 items-center">
              <input
                type="file"
                ref={postFileInputRef}
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, (url, type, name) => setPostMedia({ url, type, name }))}
              />
              <button
                type="button"
                onClick={() => postFileInputRef.current?.click()}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  postMedia
                    ? 'bg-[#3E4A35] text-white border-[#3E4A35]'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title="Allegato foto o video"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder={selectedTag !== 'Tutti' ? `Scrivi in ${selectedTag}...` : "Scrivi un messaggio in chat..."}
                className="flex-1 min-w-0 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#3E4A35] dark:focus:border-[#A3B896] truncate"
              />
              <button
                type="submit"
                className="px-3.5 py-2.5 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Invia</span>
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* FORUM 3-LEVEL DRILL-DOWN VIEW */
        <div className="space-y-4">
          {/* LEVEL 1: CATEGORIES / ARGOMENTI VIEW */}
          {!selectedForumCategory && (
            <div className="space-y-4">
              {/* Forum Level 1 Header */}
              <div className="bg-gradient-to-r from-[#3E4A35]/10 via-[#5A6B4E]/10 to-[#3E4A35]/15 dark:from-[#3E4A35]/30 dark:to-[#5A6B4E]/30 border border-[#3E4A35]/20 dark:border-[#A3B896]/30 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#3E4A35] text-white rounded-md text-[10px] font-black uppercase tracking-wider">
                      FORUM COMMUNITY
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                      Seleziona un Argomento
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    Scegli la categoria di tuo interesse per consultare tutte le discussioni aperte dalla community e dall'assistente Rolly.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPostTag('Generale');
                    setPostTitle('');
                    setPostText('');
                    setPostTargetType('forum');
                    setShowCreatePostModal(true);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-[#3E4A35] hover:bg-[#5A6B4E] dark:bg-[#A3B896] dark:hover:bg-[#8CA37E] dark:text-slate-950 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuova Discussione</span>
                </button>
              </div>

              {/* Categories Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {(['Generale', 'Sosta', 'Meteo', 'Incontro', 'SOS'] as CommunityMessage['tag'][]).map((catKey) => {
                  const meta = forumCategoryMeta[catKey];
                  const catMessages = messages.filter((m) => (m.type === 'forum' || !m.type) && m.tag === catKey);
                  const totalReplies = catMessages.reduce((acc, m) => acc + (m.replies?.length || 0), 0);
                  const latestMsg = catMessages[0];

                  return (
                    <div
                      key={catKey}
                      onClick={() => {
                        setSelectedForumCategory(catKey);
                        setSelectedDiscussionId(null);
                      }}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-4 sm:p-5 shadow-xs hover:border-[#3E4A35]/50 dark:hover:border-[#A3B896]/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 ${meta.bg} border ${meta.border}`}>
                            {meta.icon}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base group-hover:text-[#3E4A35] dark:group-hover:text-[#A3B896] transition-colors">
                              {meta.title}
                            </h3>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              {catMessages.length} {catMessages.length === 1 ? 'discussione' : 'discussioni'} • {totalReplies} risposte
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#3E4A35] dark:group-hover:text-[#A3B896] transition-colors shrink-0 mt-1" />
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                        {meta.desc}
                      </p>

                      {latestMsg && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                          <span className="truncate flex-1 min-w-0 font-medium text-slate-700 dark:text-slate-300">
                            Ultimo: <span className="font-semibold">{latestMsg.title || latestMsg.text}</span>
                          </span>
                          <span className="shrink-0 text-[10px]">{new Date(latestMsg.timestamp).toLocaleDateString('it-IT')}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LEVEL 2: DISCUSSION LIST VIEW (Only Titles & Metadata) */}
          {selectedForumCategory && !selectedDiscussionId && (
            <div className="space-y-3">
              {/* Navigation Back Breadcrumb */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setSelectedForumCategory(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#3E4A35] dark:text-[#A3B896] hover:underline cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                  <span>Torna a Tutti gli Argomenti</span>
                </button>
                <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap shrink-0">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${getTagStyle(selectedForumCategory, false)}`}>
                    {selectedForumCategory}
                  </span>
                  <button
                    onClick={() => {
                      setPostTag(selectedForumCategory);
                      setPostTitle('');
                      setPostText('');
                      setPostTargetType('forum');
                      setShowCreatePostModal(true);
                    }}
                    className="px-3 py-1.5 bg-[#3E4A35] hover:bg-[#5A6B4E] dark:bg-[#A3B896] dark:hover:bg-[#8CA37E] dark:text-slate-950 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>Nuova Discussione</span>
                  </button>
                </div>
              </div>

              {/* Discussion Titles List */}
              {(() => {
                const categoryDiscussions = messages.filter((m) => {
                  const isForum = m.type === 'forum' || !m.type;
                  const matchesCat = m.tag === selectedForumCategory;
                  if (!isForum || !matchesCat) return false;
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    (m.title && m.title.toLowerCase().includes(q)) ||
                    m.text.toLowerCase().includes(q) ||
                    m.user.toLowerCase().includes(q)
                  );
                });

                if (categoryDiscussions.length === 0) {
                  return (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center text-slate-400">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs sm:text-sm font-semibold">Nessuna discussione trovata in questo argomento.</p>
                      <button
                        onClick={() => {
                          setPostTag(selectedForumCategory);
                          setPostTitle('');
                          setPostText('');
                          setPostTargetType('forum');
                          setShowCreatePostModal(true);
                        }}
                        className="mt-3 px-4 py-2 bg-[#3E4A35] text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" /> Apri la Prima Discussione
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60 shadow-xs overflow-hidden">
                    {categoryDiscussions.map((msg) => {
                      const repliesCount = msg.replies?.length || 0;
                      const isRolly = msg.user.includes('Rolly') || msg.avatar === '🤖';

                      return (
                        <div
                          key={msg.id}
                          onClick={() => setSelectedDiscussionId(msg.id)}
                          className="p-3.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors cursor-pointer flex items-start justify-between gap-3 group"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5 ${msg.avatarColor}`}>
                              {msg.user === activeUserName || msg.user.includes('Tu') ? currentUserAvatar : msg.avatar}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-start gap-1.5">
                                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs sm:text-sm group-hover:text-[#3E4A35] dark:group-hover:text-[#A3B896] transition-colors leading-snug break-words">
                                  {msg.title || msg.text}
                                </h4>
                                {isRolly && (
                                  <span className="text-[8px] bg-[#3E4A35] text-white px-1.5 py-0.2 rounded-full font-black uppercase shrink-0 mt-0.5">
                                    🤖 Rolly
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-2 flex-wrap">
                                <span>Aperta da <strong className="text-slate-700 dark:text-slate-300">{msg.user}</strong></span>
                                <span>•</span>
                                <span>{new Date(msg.timestamp).toLocaleDateString('it-IT')} {new Date(msg.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold">
                              <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 px-2 py-1 rounded-lg">
                                <MessageSquare className="w-3.5 h-3.5 text-[#3E4A35] dark:text-[#A3B896]" />
                                {repliesCount}
                              </span>
                              <span className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 px-2 py-1 rounded-lg">
                                <Heart className="w-3.5 h-3.5 text-rose-500" />
                                {msg.likes}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#3E4A35] dark:group-hover:text-[#A3B896] transition-colors" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* LEVEL 3: DISCUSSION DETAIL VIEW (Title, Body, Media, Likes, Replies) */}
          {selectedForumCategory && selectedDiscussionId && (
            <div className="space-y-4">
              {/* Navigation Back Breadcrumb */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setSelectedDiscussionId(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#3E4A35] dark:text-[#A3B896] hover:underline cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                  <span>Torna all'Elenco Discussioni ({selectedForumCategory})</span>
                </button>
                <span className={`self-start sm:self-auto px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${getTagStyle(selectedForumCategory, false)}`}>
                  {selectedForumCategory}
                </span>
              </div>

              {/* Main Discussion Thread Card */}
              {(() => {
                const msg = messages.find((m) => m.id === selectedDiscussionId);
                if (!msg) {
                  return (
                    <div className="bg-white dark:bg-slate-800 p-6 text-center text-slate-400 rounded-2xl">
                      Discussione non trovata o eliminata.
                    </div>
                  );
                }

                const replies = msg.replies || [];
                const isRolly = msg.user.includes('Rolly') || msg.avatar === '🤖';

                return (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-4 sm:p-6 space-y-4">
                    {/* Header Author Info */}
                    <div className="flex justify-between items-start gap-3 border-b border-slate-100 dark:border-slate-700/80 pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0 ${msg.avatarColor}`}>
                          {msg.user === activeUserName || msg.user.includes('Tu') ? currentUserAvatar : msg.avatar}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5 flex-wrap">
                            <span>{msg.user === 'Tu (Camperista)' || msg.user.includes('Tu') ? activeUserName : msg.user}</span>
                            {isRolly && (
                              <span className="text-[9px] bg-[#3E4A35] text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                                🤖 Assistente CamperLife
                              </span>
                            )}
                            {(msg.user === activeUserName || msg.user.includes('Tu') || msg.user === currentUser?.email) && (
                              <span className="text-[9px] bg-[#3E4A35]/15 dark:bg-[#A3B896]/20 text-[#3E4A35] dark:text-[#A3B896] px-1.5 py-0.2 rounded font-mono font-bold">
                                Tu
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(msg.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} • {new Date(msg.timestamp).toLocaleDateString('it-IT')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              requestDeleteMessage(msg.id, msg.text);
                              setSelectedDiscussionId(null);
                            }}
                            title="Elimina Post (Admin)"
                            className="p-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Elimina</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Topic Title */}
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 leading-snug">
                      {msg.title || msg.text}
                    </h2>

                    {/* Topic Text */}
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal whitespace-pre-wrap">
                      {msg.text}
                    </p>

                    {/* Topic Media */}
                    {msg.mediaUrl && (
                      <div className="my-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900">
                        {msg.mediaType === 'video' ? (
                          <video src={msg.mediaUrl} controls className="w-full max-h-96 object-contain" />
                        ) : (
                          <div
                            className="relative group cursor-pointer"
                            onClick={() => setMediaModal({ url: msg.mediaUrl!, type: 'image' })}
                          >
                            <img src={msg.mediaUrl} alt="Foto allegata" className="w-full max-h-96 object-cover" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-xs text-white bg-black/70 px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 backdrop-blur-xs">
                                <ImageIcon className="w-4 h-4" /> Ingrandisci immagine
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Topic Actions */}
                    <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-700/80 pt-3 text-xs">
                      <button
                        onClick={() => handleLike(msg.id)}
                        className={`flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
                          msg.likedByCurrentUser ? 'text-rose-600' : 'text-slate-500 hover:text-rose-600 dark:text-slate-400'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${msg.likedByCurrentUser ? 'fill-current' : ''}`} />
                        <span>{msg.likes} Mi piace</span>
                      </button>

                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{replies.length} {replies.length === 1 ? 'risposta' : 'risposte'}</span>
                      </div>
                    </div>

                    {/* Replies Section */}
                    <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <h3 className="font-extrabold text-[#3E4A35] dark:text-[#A3B896] text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Risposte degli utenti ({replies.length})
                      </h3>

                      {replies.length > 0 ? (
                        <div className="space-y-3">
                          {replies.map((reply) => (
                            <div key={reply.id} className="bg-slate-50 dark:bg-slate-900/70 rounded-2xl p-3.5 sm:p-4 space-y-2 border border-slate-200/60 dark:border-slate-700/60">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  {reply.user === 'Tu (Camperista)' || reply.user.includes('Tu') ? activeUserName : reply.user}
                                  {(reply.user === activeUserName || reply.user.includes('Tu')) && (
                                    <span className="text-[9px] bg-[#3E4A35]/15 dark:bg-[#A3B896]/20 text-[#3E4A35] dark:text-[#A3B896] px-1.5 py-0.2 rounded font-mono font-bold">
                                      Tu
                                    </span>
                                  )}
                                </span>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                  <span>{new Date(reply.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} • {new Date(reply.timestamp).toLocaleDateString('it-IT')}</span>
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => requestDeleteReply(msg.id, reply.id, reply.text)}
                                      className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                                      title="Elimina risposta (Admin)"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal whitespace-pre-wrap">
                                {reply.text}
                              </p>

                              {reply.mediaUrl && (
                                <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-w-md">
                                  {reply.mediaType === 'video' ? (
                                    <video src={reply.mediaUrl} controls className="w-full max-h-60 object-contain bg-black" />
                                  ) : (
                                    <img
                                      src={reply.mediaUrl}
                                      alt="Foto allegata"
                                      className="w-full max-h-60 object-cover cursor-pointer hover:opacity-95"
                                      onClick={() => setMediaModal({ url: reply.mediaUrl!, type: 'image' })}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl text-center">
                          Ancora nessuna risposta a questa discussione. Sii il primo a rispondere!
                        </p>
                      )}

                      {/* Add Reply Input Form */}
                      <div className="pt-2">
                        {replyMedia[msg.id] && (
                          <div className="mb-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 overflow-hidden">
                              {replyMedia[msg.id].type === 'video' ? <Film className="w-4 h-4 text-rose-500 shrink-0" /> : <ImageIcon className="w-4 h-4 text-[#5A6B4E] shrink-0" />}
                              <span className="truncate font-medium">{replyMedia[msg.id].name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setReplyMedia(prev => {
                                  const next = { ...prev };
                                  delete next[msg.id];
                                  return next;
                                });
                              }}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="flex gap-2 items-center">
                          <input
                            type="file"
                            id={`reply_file_${msg.id}`}
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={(e) =>
                              handleFileUpload(e, (url, type, name) =>
                                setReplyMedia(prev => ({ ...prev, [msg.id]: { url, type, name } }))
                              )
                            }
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById(`reply_file_${msg.id}`)?.click()}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                              replyMedia[msg.id]
                                ? 'bg-[#3E4A35] text-white border-[#3E4A35]'
                                : 'bg-slate-100 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                            }`}
                            title="Allegazione foto/video"
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                          <input
                            type="text"
                            placeholder="Aggiungi una risposta a questa discussione..."
                            value={replyTexts[msg.id] || ''}
                            onChange={(e) => setReplyTexts(prev => ({ ...prev, [msg.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateReply(msg.id); }}
                            className="flex-1 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#3E4A35]"
                          />
                          <button
                            onClick={() => handleCreateReply(msg.id)}
                            className="px-4 py-2.5 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Invia Risposta</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* CREATE POST MODAL DIALOG */}
      {showCreatePostModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5A6B4E]" />
                {postTargetType === 'chat'
                  ? 'Scrivi un Messaggio in Chat Live'
                  : postTag === 'SOS'
                    ? 'Segnala un\'Emergenza SOS'
                    : 'Pubblica un Post nel Forum'}
              </h3>
              <button
                onClick={() => setShowCreatePostModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              {postTargetType === 'forum' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Titolo dell'Argomento (Titolo Discussione):
                  </label>
                  <input
                    type="text"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="Es. Consigli per prima uscita sulla neve o scelta della batteria al litio..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#3E4A35]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Seleziona Canale / Categoria:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setPostTag(tag)}
                      className={`p-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
                        postTag === tag
                          ? 'bg-[#3E4A35] text-white border-[#3E4A35] dark:bg-[#A3B896] dark:text-slate-950'
                          : 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Testo del Messaggio:
                </label>
                <textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  placeholder="Scrivi qui consigli di viaggio, informazioni sulle condizioni stradali o domande per la community..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#3E4A35]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Allegato Media (Foto o Video facoltativo):
                </label>
                {postMedia ? (
                  <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {postMedia.type === 'video' ? (
                        <Film className="w-5 h-5 text-rose-500 shrink-0" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-[#5A6B4E] shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {postMedia.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPostMedia(null)}
                      className="px-2 py-1 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold hover:bg-rose-200 cursor-pointer"
                    >
                      Rimuovi
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      ref={postFileInputRef}
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, (url, type, name) => setPostMedia({ url, type, name }))}
                    />
                    <button
                      type="button"
                      onClick={() => postFileInputRef.current?.click()}
                      className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Paperclip className="w-4 h-4 text-[#5A6B4E]" />
                      <span>Carica una foto o un video</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePostModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Pubblica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Message / Reply Deletion */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                  Conferma Eliminazione
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  Azione Moderatore
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Sei sicuro di voler eliminare definitivamente {deleteConfirmTarget.type === 'message' ? 'questo messaggio' : 'questa risposta'}?
            </p>

            {deleteConfirmTarget.snippet && (
              <p className="text-xs italic p-2.5 bg-slate-100 dark:bg-slate-900/70 rounded-xl text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 break-words">
                "{deleteConfirmTarget.snippet}"
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs transition-colors cursor-pointer shadow-sm active:scale-95"
              >
                Elimina Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Lightbox Preview Modal */}
      {mediaModal && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setMediaModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
            <button
              type="button"
              onClick={() => setMediaModal(null)}
              className="absolute -top-12 right-0 p-2 text-white bg-slate-800/80 hover:bg-slate-700 rounded-full cursor-pointer shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            {mediaModal.type === 'video' ? (
              <video src={mediaModal.url} controls autoPlay className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
            ) : (
              <img src={mediaModal.url} alt="Media ingrandito" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
