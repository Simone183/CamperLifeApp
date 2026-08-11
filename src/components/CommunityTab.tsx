/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CommunityMessage, ChallengeSubmission, ChallengeItem } from '../types';
import { sanitizeCommunityMessagesList } from '../utils/communitySanitizer';
import { CartoonCamperAvatar } from './CartoonCamperAvatar';
import ProfilePhotoCropper from './ProfilePhotoCropper';
import { moderateText, getRollyWarningText } from '../utils/rollyModerator';
import { compressImage } from '../utils/photoCompressor';
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
  ArrowLeft,
  Camera,
  MapPin,
  ThumbsUp,
  ShieldCheck
} from 'lucide-react';

function getRelativeTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp || 'Di recente';
    const dateStr = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} ${timeStr}`;
  } catch {
    return timestamp || 'Di recente';
  }
}

function renderTextWithHashtagsAndMentions(text: string) {
  if (!text) return null;
  const parts = text.split(/(\s+)/);
  return parts.map((part, i) => {
    if (part.startsWith('#') && part.length > 1) {
      return (
        <span key={i} className="font-extrabold text-[#3E4A35] dark:text-[#A3B896] hover:underline cursor-pointer">
          {part}
        </span>
      );
    }
    if (part.startsWith('@') && part.length > 1) {
      return (
        <span key={i} className="inline-flex items-center font-extrabold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 dark:bg-emerald-500/25 px-1.5 py-0.5 rounded-md mx-0.5 text-[0.9em] border border-emerald-500/20 shadow-2xs">
          {part}
        </span>
      );
    }
    return part;
  });
}

function QuotedReplyBox({ replyTo }: { replyTo?: { id: string; user: string; text: string } }) {
  if (!replyTo) return null;
  return (
    <div className="mb-2 p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border-l-4 border-emerald-600 dark:border-emerald-500 text-xs shadow-2xs">
      <div className="font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 text-[11px]">
        <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Risposta a</span>
        <span className="bg-emerald-200/80 dark:bg-emerald-800/80 text-emerald-950 dark:text-emerald-100 px-1.5 py-0.2 rounded font-black">
          @{replyTo.user}
        </span>
      </div>
      <p className="italic line-clamp-2 text-slate-600 dark:text-slate-300 text-[11px] mt-1 pl-1 border-l border-emerald-300/50 dark:border-emerald-800/50">
        "{replyTo.text}"
      </p>
    </div>
  );
}

function UserMentionPickerModal({
  isOpen,
  onClose,
  users,
  onSelectUser,
}: {
  isOpen: boolean;
  onClose: () => void;
  users: string[];
  onSelectUser: (username: string) => void;
}) {
  const [query, setQuery] = React.useState('');

  if (!isOpen) return null;

  const filtered = users.filter((u) =>
    u.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-4 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 font-extrabold text-xs text-slate-800 dark:text-slate-100">
            <span className="text-base">🏷️</span>
            <span>Tagga un Utente della Community</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca nickname..."
            className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-600"
            autoFocus
          />
        </div>

        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 italic">
              Nessun utente trovato per "{query}"
            </div>
          ) : (
            filtered.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => {
                  onSelectUser(u);
                  onClose();
                }}
                className="w-full text-left p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-700/60 flex items-center justify-between gap-2.5 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0 uppercase shadow-2xs">
                    {u[0]}
                  </div>
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                    @{u}
                  </span>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-md shrink-0">
                  Tagga
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

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
    profilePhoto?: string;
  } | null;
  challengeSubmissions?: ChallengeSubmission[];
  onChallengeSubmissionsChange?: (subs: ChallengeSubmission[]) => void;
  challenges?: ChallengeItem[];
  onViewTrip?: (tripId: string) => void;
}

function UserAvatar({
  avatar,
  avatarUrl,
  user,
  avatarColor,
  size = 'w-10 h-10',
  textSize = 'text-sm',
  myProfilePhoto,
  activeUserName,
  currentUser
}: {
  avatar?: string;
  avatarUrl?: string;
  user?: string;
  avatarColor?: string;
  size?: string;
  textSize?: string;
  myProfilePhoto?: string | null;
  activeUserName?: string;
  currentUser?: any;
}) {
  const safeUser = user || '';
  const isRolly = (safeUser && safeUser.toLowerCase().includes('rolly')) || avatar === '🤖' || avatar === 'Rolly' || avatar === 'rolly';

  if (isRolly) {
    return <CartoonCamperAvatar className={`${size} shrink-0`} />;
  }

  const normUser = safeUser.trim().toLowerCase();
  const isMe =
    normUser === 'sam83' ||
    normUser === 'tu' ||
    normUser === 'tu (camperista)' ||
    normUser.startsWith('tu (') ||
    (activeUserName && normUser === activeUserName.trim().toLowerCase()) ||
    (currentUser?.email && normUser === currentUser.email.trim().toLowerCase()) ||
    (currentUser?.nickname && normUser === currentUser.nickname.trim().toLowerCase()) ||
    (currentUser?.name && normUser === currentUser.name.trim().toLowerCase());

  let photo = avatarUrl || (avatar && (avatar.startsWith('data:') || avatar.startsWith('http') || avatar.startsWith('/')) ? avatar : null);

  // Fallback to active user's profile photo if rendering current user's avatar
  if (!photo && isMe && myProfilePhoto) {
    photo = myProfilePhoto;
  }

  if (photo) {
    return (
      <div className={`${size} rounded-full overflow-hidden shrink-0 shadow-xs border border-slate-200/80 dark:border-slate-700 bg-slate-100 dark:bg-slate-800`}>
        <img src={photo} alt={safeUser} className="w-full h-full object-cover" />
      </div>
    );
  }

  const initial = (avatar && avatar.length <= 4 && !avatar.startsWith('data:') && !avatar.startsWith('http') && !avatar.startsWith('/'))
    ? avatar
    : (safeUser ? safeUser[0].toUpperCase() : 'U');

  return (
    <div className={`${size} rounded-full ${avatarColor || 'bg-[#3E4A35]'} text-white font-black flex items-center justify-center ${textSize} shadow-xs shrink-0 uppercase`}>
      {initial}
    </div>
  );
}

export default function CommunityTab({
  messages,
  onChange,
  isAdmin,
  onOpenChallenges,
  currentUser,
  challengeSubmissions,
  onChallengeSubmissionsChange,
  challenges,
  onViewTrip
}: CommunityTabProps) {
  // Sanitize messages array to filter out any remaining fake replies, fake likes, or fake posts
  const sanitizedMessages = React.useMemo(() => sanitizeCommunityMessagesList(messages), [messages]);

  // View mode: 'social' (Social Feed), 'feed' (Forum Argomenti), 'chat' (WhatsApp style), 'sos' (Emergency SOS focus)
  const [viewMode, setViewMode] = React.useState<'social' | 'feed' | 'chat' | 'sos'>('social');
  const [socialSubFilter, setSocialSubFilter] = React.useState<'all' | 'media' | 'popular' | 'mine'>('all');
  const [quickSocialText, setQuickSocialText] = React.useState('');
  const [postLocationName, setPostLocationName] = React.useState('');
  const [doubleTapLikedId, setDoubleTapLikedId] = React.useState<string | null>(null);
  const [copiedPostId, setCopiedPostId] = React.useState<string | null>(null);
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
  const [postTargetType, setPostTargetType] = React.useState<'social' | 'forum' | 'chat'>('social');

  // Media Attachment States
  const [postMedia, setPostMedia] = React.useState<{ url: string; type: 'image' | 'video'; name: string } | null>(null);
  const [replyMedia, setReplyMedia] = React.useState<{ [msgId: string]: { url: string; type: 'image' | 'video'; name: string } }>({});
  const [mediaModal, setMediaModal] = React.useState<{ url: string; type: 'image' | 'video' } | null>(null);

  // Quoted Reply & User Tagging States
  const [quotedTarget, setQuotedTarget] = React.useState<{ id: string; user: string; text: string; msgId?: string } | null>(null);
  const [showMentionPicker, setShowMentionPicker] = React.useState(false);
  const [activeMentionTargetKey, setActiveMentionTargetKey] = React.useState<'chat' | 'social' | 'postModal' | string>('chat');

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

  // Unique community usernames list for tagging autocomplete
  const communityUsersList = React.useMemo(() => {
    const set = new Set<string>();
    sanitizedMessages.forEach((m) => {
      if (m.user) set.add(m.user.replace(/ \(Camperista\)/, '').replace(/^Tu$/, '').trim());
      m.replies?.forEach((r) => {
        if (r.user) set.add(r.user.replace(/ \(Camperista\)/, '').replace(/^Tu$/, '').trim());
      });
    });
    if (activeUserName) set.add(activeUserName.replace(/ \(Camperista\)/, '').trim());
    if (currentUser?.nickname) set.add(currentUser.nickname.trim());
    return Array.from(set).filter(
      (u) => u && !u.toLowerCase().includes('rolly') && u !== 'Tu' && u.length > 1
    );
  }, [sanitizedMessages, activeUserName, currentUser]);

  const handleTagUser = React.useCallback((username: string, targetKey: 'chat' | 'social' | 'postModal' | string) => {
    const cleanUser = username.replace(/ \(Camperista\)/, '').trim();
    const tagStr = `@${cleanUser} `;

    if (targetKey === 'chat' || targetKey === 'postModal') {
      setPostText((prev) => (prev.includes(tagStr) ? prev : `${prev ? prev + ' ' : ''}${tagStr}`));
    } else if (targetKey === 'social') {
      setQuickSocialText((prev) => (prev.includes(tagStr) ? prev : `${prev ? prev + ' ' : ''}${tagStr}`));
    } else {
      setReplyTexts((prev) => {
        const current = prev[targetKey] || '';
        return {
          ...prev,
          [targetKey]: current.includes(tagStr) ? current : `${current ? current + ' ' : ''}${tagStr}`,
        };
      });
      setExpandedReplies((prev) => ({ ...prev, [targetKey]: true }));
    }

    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message: `🎯 Utente @${cleanUser} taggato nel messaggio!` },
      })
    );
  }, []);

  const handleStartReply = React.useCallback((target: { id: string; user: string; text: string; msgId?: string }) => {
    const cleanUser = target.user.replace(/ \(Camperista\)/, '').trim();
    setQuotedTarget({
      id: target.id,
      user: cleanUser,
      text: target.text,
      msgId: target.msgId,
    });

    if (target.msgId) {
      setExpandedReplies((prev) => ({ ...prev, [target.msgId!]: true }));
    }

    // Auto-tag user in appropriate input field
    if (viewMode === 'chat') {
      handleTagUser(cleanUser, 'chat');
    } else if (viewMode === 'social' && !target.msgId) {
      handleTagUser(cleanUser, 'social');
    } else if (target.msgId) {
      handleTagUser(cleanUser, target.msgId);
    } else {
      handleTagUser(cleanUser, target.id);
    }

    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message: `💬 Stai rispondendo a @${cleanUser}` },
      })
    );
  }, [viewMode, handleTagUser]);

  const currentUserAvatar = activeUserName.slice(0, 2).toUpperCase();
  const currentUserColor = 'bg-[#5A6B4E]';

  // Profile photo state management
  const [myProfilePhoto, setMyProfilePhoto] = React.useState<string | null>(() => {
    if (currentUser?.profilePhoto) return currentUser.profilePhoto;
    try {
      const savedPhoto = localStorage.getItem('camper_profile_photo');
      if (savedPhoto) return savedPhoto;
      const savedUser = localStorage.getItem('camper_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.profilePhoto) return u.profilePhoto;
      }
    } catch {}
    return null;
  });

  const profilePhotoInputRef = React.useRef<HTMLInputElement>(null);
  const [pendingCropPhotoSrc, setPendingCropPhotoSrc] = React.useState<string | null>(null);
  const [showPhotoCropper, setShowPhotoCropper] = React.useState(false);

  React.useEffect(() => {
    if (currentUser?.profilePhoto) {
      setMyProfilePhoto(currentUser.profilePhoto);
    }
  }, [currentUser?.profilePhoto]);

  React.useEffect(() => {
    const handleSync = () => {
      try {
        const photo = localStorage.getItem('camper_profile_photo');
        if (photo) setMyProfilePhoto(photo);
      } catch {}
    };
    window.addEventListener('camper_profile_photo_updated', handleSync);
    return () => window.removeEventListener('camper_profile_photo_updated', handleSync);
  }, []);

  const handleSaveCroppedPhoto = async (croppedBase64: string) => {
    let compressed = croppedBase64;
    try {
      compressed = await compressImage(croppedBase64, 'low');
    } catch {}

    setMyProfilePhoto(compressed);
    localStorage.setItem('camper_profile_photo', compressed);

    try {
      const saved = localStorage.getItem('camper_user');
      const uObj = saved ? JSON.parse(saved) : {};
      uObj.profilePhoto = compressed;
      uObj.nickname = uObj.nickname || activeUserName;
      localStorage.setItem('camper_user', JSON.stringify(uObj));
    } catch {}

    window.dispatchEvent(new Event('camper_profile_photo_updated'));

    const updatedMessages = messages.map(m => {
      const u = m.user.toLowerCase();
      if (
        u === activeUserName.toLowerCase() ||
        u === 'sam83' ||
        u === 'tu (camperista)' ||
        u.includes('tu') ||
        (currentUser?.email && u === currentUser.email.toLowerCase())
      ) {
        return {
          ...m,
          avatarUrl: compressed,
          avatar: compressed
        };
      }
      return m;
    });
    onChange(updatedMessages);

    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: { message: "📸 Foto profilo aggiornata! Ora è visibile in chat, forum e bacheca social." },
      })
    );
  };

  const handleUploadProfilePhoto = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "⚠️ Seleziona un file immagine valido (JPG, PNG, WebP)." },
        })
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawBase64 = event.target?.result as string;
      if (!rawBase64) return;
      setPendingCropPhotoSrc(rawBase64);
      setShowPhotoCropper(true);
    };
    reader.readAsDataURL(file);
  };

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

    // Rolly is always online in chat
    if (username && username.includes('Rolly')) {
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

  const handleQuickSocialSubmit = () => {
    if (!quickSocialText.trim() && !postMedia) return;
    const userPhoto = myProfilePhoto || currentUser?.profilePhoto || (currentUser as any)?.avatarUrl;
    
    // Rolly AI Moderation check
    const rawText = quickSocialText.trim() || '📸 Scatto in camper!';
    const mod = moderateText(rawText);

    const newMsg: CommunityMessage = {
      id: `m_soc_${Date.now()}`,
      user: activeUserName,
      avatar: userPhoto || currentUserAvatar,
      avatarUrl: userPhoto,
      avatarColor: currentUserColor,
      text: mod.cleanText,
      timestamp: new Date().toISOString(),
      likes: 0,
      likedByCurrentUser: false,
      tag: postTag || 'Generale',
      type: 'social',
      locationName: postLocationName.trim() || undefined,
      mediaUrl: postMedia?.url,
      mediaType: postMedia?.type,
      isModerated: mod.hasProfanity,
      replyTo: quotedTarget ? { id: quotedTarget.id, user: quotedTarget.user, text: quotedTarget.text } : undefined,
      replies: mod.hasProfanity
        ? [
            {
              id: `reply_rolly_mod_${Date.now()}`,
              user: 'Rolly - Assistente ViaCamper',
              text: getRollyWarningText(activeUserName, 'social'),
              timestamp: new Date().toISOString(),
              avatar: 'Rolly',
              avatarColor: 'bg-[#3E4A35]',
              isModerated: true,
            },
          ]
        : [],
    };
    onChange([newMsg, ...messages]);
    setQuickSocialText('');
    setPostMedia(null);
    setPostLocationName('');
    setQuotedTarget(null);
    
    if (mod.hasProfanity) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "🛡️ Moderazione Rolly: Il linguaggio è stato censurato per il rispetto del regolamento!" },
        })
      );
    } else {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "✨ Post pubblicato nella Bacheca Social!" },
        })
      );
    }
  };

  const handleCreatePost = (e?: React.FormEvent, overrideTargetType?: 'social' | 'forum' | 'chat') => {
    if (e) e.preventDefault();
    if (!postText.trim() && !postMedia) return;

    const targetType: 'social' | 'forum' | 'chat' =
      overrideTargetType || postTargetType || (viewMode === 'chat' ? 'chat' : viewMode === 'social' ? 'social' : 'forum');

    const effectiveTag: CommunityMessage['tag'] =
      viewMode === 'sos' || postTag === 'SOS'
        ? 'SOS'
        : selectedTag !== 'Tutti'
        ? selectedTag
        : postTag;

    const userPhoto = myProfilePhoto || currentUser?.profilePhoto || (currentUser as any)?.avatarUrl;

    // Rolly AI Moderation Check
    const titleMod = moderateText(postTitle.trim());
    const textMod = moderateText(postText.trim());
    const hasProfanity = titleMod.hasProfanity || textMod.hasProfanity;

    const newMsg: CommunityMessage = {
      id: `m_${Date.now()}`,
      user: activeUserName,
      avatar: userPhoto || currentUserAvatar,
      avatarUrl: userPhoto,
      avatarColor: currentUserColor,
      title: targetType === 'forum' ? (titleMod.cleanText || undefined) : undefined,
      text: textMod.cleanText,
      timestamp: new Date().toISOString(),
      likes: 0,
      likedByCurrentUser: false,
      tag: effectiveTag,
      type: targetType,
      locationName: postLocationName.trim() || undefined,
      isResolved: false,
      mediaUrl: postMedia?.url,
      mediaType: postMedia?.type,
      isModerated: hasProfanity,
      replyTo: quotedTarget ? { id: quotedTarget.id, user: quotedTarget.user, text: quotedTarget.text } : undefined,
      replies: hasProfanity && targetType !== 'chat'
        ? [
            {
              id: `reply_rolly_mod_${Date.now()}`,
              user: 'Rolly - Assistente ViaCamper',
              text: getRollyWarningText(activeUserName, targetType),
              timestamp: new Date().toISOString(),
              avatar: 'Rolly',
              avatarColor: 'bg-[#3E4A35]',
              isModerated: true,
            },
          ]
        : [],
    };

    let updated = [newMsg, ...messages];

    // If profanity in Chat Live, Rolly immediately sends an automated public warning chat message right after the user message
    if (hasProfanity && targetType === 'chat') {
      const rollyWarningMsg: CommunityMessage = {
        id: `m_rolly_mod_${Date.now() + 1}`,
        user: 'Rolly - Assistente ViaCamper',
        avatar: 'Rolly',
        avatarColor: 'bg-[#3E4A35]',
        text: getRollyWarningText(activeUserName, 'chat'),
        timestamp: new Date(Date.now() + 100).toISOString(),
        likes: 0,
        likedByCurrentUser: false,
        tag: 'Generale',
        type: 'chat',
        replies: [],
        isModerated: true,
      };
      updated = [rollyWarningMsg, newMsg, ...messages];
    }

    onChange(updated);

    if (targetType === 'forum') {
      setSelectedForumCategory(effectiveTag);
      setSelectedDiscussionId(newMsg.id);
    }

    setPostTitle('');
    setPostText('');
    setPostMedia(null);
    setPostLocationName('');
    setQuotedTarget(null);
    setShowCreatePostModal(false);

    if (hasProfanity) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "🛡️ Rolly Moderatore: Linguaggio non appropriato censurato col richiamo automatico!" },
        })
      );
    }
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
    let targetMsg: CommunityMessage | undefined;
    const updated = messages.map((m) => {
      if (m.id === id) {
        const liked = !m.likedByCurrentUser;
        targetMsg = {
          ...m,
          likedByCurrentUser: liked,
          likes: liked ? m.likes + 1 : Math.max(0, m.likes - 1),
        };
        return targetMsg;
      }
      return m;
    });
    onChange(updated);

    if (targetMsg && targetMsg.challengeSubmissionId && challengeSubmissions && onChallengeSubmissionsChange) {
      const subId = targetMsg.challengeSubmissionId;
      const updatedSubs = challengeSubmissions.map((sub) => {
        if (sub.id === subId) {
          return {
            ...sub,
            likes: targetMsg!.likes,
            likedByMe: targetMsg!.likedByCurrentUser,
          };
        }
        return sub;
      });
      onChallengeSubmissionsChange(updatedSubs);
    }
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

    const userPhoto = myProfilePhoto || currentUser?.profilePhoto || (currentUser as any)?.avatarUrl;

    // Rolly AI Moderation Check
    const mod = moderateText(text.trim());
    const hasProfanity = mod.hasProfanity;

    const userReply = {
      id: `reply_${Date.now()}`,
      user: activeUserName,
      text: mod.cleanText,
      timestamp: new Date().toISOString(),
      avatar: userPhoto || activeUserName.substring(0, 2).toUpperCase(),
      avatarUrl: userPhoto,
      avatarColor: currentUserColor,
      mediaUrl: currentMedia?.url,
      mediaType: currentMedia?.type,
      isModerated: hasProfanity,
      replyTo: quotedTarget ? { id: quotedTarget.id, user: quotedTarget.user, text: quotedTarget.text } : undefined,
    };

    const newReplies = [userReply];

    if (hasProfanity) {
      newReplies.push({
        id: `reply_rolly_mod_${Date.now() + 1}`,
        user: 'Rolly - Assistente ViaCamper',
        text: getRollyWarningText(activeUserName, 'reply'),
        timestamp: new Date(Date.now() + 100).toISOString(),
        avatar: 'Rolly',
        avatarUrl: undefined,
        avatarColor: 'bg-[#3E4A35]',
        mediaUrl: undefined,
        mediaType: undefined,
        isModerated: true,
        replyTo: undefined,
      });
    }

    onChange(
      messages.map((m) => {
        if (m.id === msgId) {
          const currentReplies = m.replies || [];
          return {
            ...m,
            replies: [...currentReplies, ...newReplies],
          };
        }
        return m;
      })
    );

    setReplyTexts(prev => ({ ...prev, [msgId]: '' }));
    setQuotedTarget(null);
    setReplyMedia(prev => {
      const next = { ...prev };
      delete next[msgId];
      return next;
    });
    // Automatically expand replies when user comments
    setExpandedReplies(prev => ({ ...prev, [msgId]: true }));

    if (hasProfanity) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "🛡️ Rolly Moderatore: Linguaggio inopportuno censurato ed emesso richiamo!" },
        })
      );
    }
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

  // Filtered messages calculation - Strictly separates Social vs Forum vs Chat Live vs SOS
  const filteredMessages = sanitizedMessages.filter((m) => {
    const isSocialMsg = m.type === 'social';
    const isChatMsg = m.type === 'chat';
    const isForumMsg = m.type === 'forum' || (!m.type && !isSocialMsg);

    if (viewMode === 'social') {
      if (!isSocialMsg && !(m.type === 'forum' && m.mediaUrl)) return false;
      if (socialSubFilter === 'media' && !m.mediaUrl) return false;
      if (socialSubFilter === 'popular' && m.likes < 3) return false;
      if (socialSubFilter === 'mine' && !(m.user === activeUserName || (currentUser?.email && m.user === currentUser.email))) return false;
    } else if (viewMode === 'chat') {
      if (!isChatMsg) return false;
    } else if (viewMode === 'sos') {
      if (m.tag !== 'SOS' || m.user.toLowerCase().includes('rolly')) return false;
    } else {
      // viewMode === 'feed' (Forum) - exclude chat, social, and SOS emergency posts
      if (isChatMsg || isSocialMsg || m.tag === 'SOS') return false;
    }

    if (selectedTag !== 'Tutti' && m.tag !== selectedTag) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = m.text.toLowerCase().includes(q);
      const matchUser = m.user.toLowerCase().includes(q);
      const matchTitle = m.title?.toLowerCase().includes(q);
      const matchLoc = m.locationName?.toLowerCase().includes(q);
      const matchReplies = m.replies?.some(r => r.text.toLowerCase().includes(q) || r.user.toLowerCase().includes(q));
      return matchText || matchUser || matchTitle || matchLoc || matchReplies;
    }
    return true;
  });

  // Sort social posts by timestamp descending (newest on top, older ones below)
  if (viewMode === 'social') {
    filteredMessages.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
  }

  const activeSosCount = sanitizedMessages.filter(m => (m.type === 'forum' || !m.type) && m.tag === 'SOS' && !m.isResolved && !m.user.toLowerCase().includes('rolly')).length;
  const currentModeTotalCount = sanitizedMessages.filter(m => {
    if (viewMode === 'social') return m.type === 'social' || (m.type === 'forum' && m.mediaUrl);
    if (viewMode === 'chat') return m.type === 'chat';
    if (viewMode === 'sos') return m.tag === 'SOS' && !m.user.toLowerCase().includes('rolly');
    return (m.type === 'forum' || !m.type) && m.type !== 'social' && m.tag !== 'SOS';
  }).length;

  return (
    <div className="space-y-5">
      {/* Hidden Profile Photo Input */}
      <input
        type="file"
        ref={profilePhotoInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleUploadProfilePhoto(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />

      {/* User Profile Photo Card & Upload Banner */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-3 sm:p-3.5 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            onClick={() => profilePhotoInputRef.current?.click()}
            className="relative group cursor-pointer shrink-0"
            title="Clicca per caricare o cambiare la tua foto profilo"
          >
            <UserAvatar
              avatarUrl={myProfilePhoto || undefined}
              user={activeUserName}
              avatarColor={currentUserColor}
              size="w-11 h-11"
              myProfilePhoto={myProfilePhoto}
              activeUserName={activeUserName}
              currentUser={currentUser}
            />
            <div className="absolute -bottom-1 -right-1 bg-[#3E4A35] text-white dark:bg-[#A3B896] dark:text-slate-950 p-1 rounded-full shadow-md group-hover:scale-110 transition-transform">
              <Camera className="w-3 h-3" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-black text-slate-900 dark:text-slate-100 text-sm">
              <span className="truncate">{activeUserName}</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 px-1.5 py-0.2 rounded font-extrabold uppercase shrink-0">Online</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {myProfilePhoto ? 'Foto profilo personalizzata attiva' : 'Nessuna foto profilo caricata (mostra iniziali)'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => profilePhotoInputRef.current?.click()}
          className="px-3.5 py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] dark:bg-[#A3B896] dark:hover:bg-[#889B7B] text-white dark:text-slate-950 text-xs font-black rounded-xl transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Camera className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{myProfilePhoto ? 'Cambia Foto Profilo' : 'Carica Foto Profilo'}</span>
          <span className="sm:hidden">{myProfilePhoto ? 'Cambia Foto' : 'Carica Foto'}</span>
        </button>
      </div>
      {/* Admin Mode Status Banner */}
      {isAdmin && (
        <div className="bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/40 rounded-2xl p-3 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200 font-bold shadow-xs">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>Modalità Amministratore Attiva:</span>
            <span className="font-normal opacity-90">Puoi eliminare qualsiasi messaggio da Social, Chat Live, Forum e SOS.</span>
          </div>
          <span className="text-[10px] bg-amber-500/20 dark:bg-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold shrink-0">
            Admin Moderazione
          </span>
        </div>
      )}

      {/* Rolly AI Moderation Status Banner */}
      <div className="bg-[#3E4A35]/10 dark:bg-[#A3B896]/15 border border-[#3E4A35]/30 dark:border-[#A3B896]/30 rounded-2xl p-2.5 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#3E4A35] dark:text-[#A3B896] font-semibold shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <CartoonCamperAvatar className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-black text-[#3E4A35] dark:text-[#A3B896] mr-1">Rolly Moderatore IA:</span>
            <span className="text-slate-700 dark:text-slate-200 text-[11px]">
              Protezione attiva 24/7 in Chat Live, Forum e Social (blocco parolacce, censura e richiami automatici).
            </span>
          </div>
        </div>
        <span className="text-[10px] bg-[#3E4A35] text-white dark:bg-[#A3B896] dark:text-slate-950 px-2.5 py-1 rounded-full font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-700" />
          <span>In Prima Linea</span>
        </span>
      </div>

      {/* Contest Banner - Compact Mobile Friendly - Hidden in SOS mode */}
      {viewMode !== 'sos' && (
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
      )}

      {/* Main Mode Navigation Bar: 4-column grid for Social, Forum, Chat Live, SOS */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-2 shadow-xs space-y-2">
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => setViewMode('social')}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 text-center cursor-pointer ${
              viewMode === 'social'
                ? 'bg-[#3E4A35] text-white dark:bg-[#A3B896] dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span className="text-[10px] sm:text-xs">Social</span>
          </button>

          <button
            onClick={() => {
              setViewMode('feed');
              setSelectedForumCategory(null);
              setSelectedDiscussionId(null);
            }}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 text-center cursor-pointer ${
              viewMode === 'feed'
                ? 'bg-[#3E4A35] text-white dark:bg-[#A3B896] dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Flame className="w-4 h-4 shrink-0" />
            <span className="text-[10px] sm:text-xs">Forum</span>
          </button>

          <button
            onClick={() => setViewMode('chat')}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 text-center cursor-pointer ${
              viewMode === 'chat'
                ? 'bg-[#3E4A35] text-white dark:bg-[#A3B896] dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center gap-0.5">
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse sm:hidden" />
            </div>
            <span className="text-[10px] sm:text-xs">Chat Live</span>
          </button>

          <button
            onClick={() => setViewMode('sos')}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 text-center cursor-pointer relative ${
              viewMode === 'sos'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60'
            }`}
          >
            <div className="flex items-center gap-0.5">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              {activeSosCount > 0 && (
                <span className="px-1 rounded-full bg-rose-500 text-white font-black text-[9px] animate-pulse sm:hidden">
                  {activeSosCount}
                </span>
              )}
            </div>
            <span className="text-[10px] sm:text-xs">SOS</span>
          </button>
        </div>

        <button
          onClick={() => {
            const target = viewMode === 'chat' ? 'chat' : viewMode === 'social' ? 'social' : 'forum';
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
          <span>
            {viewMode === 'social'
              ? 'Pubblica uno Scatto / Pensiero Social'
              : viewMode === 'chat'
              ? 'Scrivi in Chat Live'
              : viewMode === 'sos'
              ? 'Segnala Emergenza SOS'
              : 'Nuovo Post nel Forum'}
          </span>
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
            placeholder={
              viewMode === 'chat'
                ? "Cerca nella chat live..."
                : viewMode === 'sos'
                ? "Cerca nelle richieste di soccorso SOS..."
                : "Cerca discussioni, soste, consigli..."
            }
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

        {/* Category Wrap Pills - Shown ONLY for Chat mode */}
        {viewMode === 'chat' && (
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
              const count = sanitizedMessages.filter((m) => m.type === 'chat' && m.tag === tag).length;
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
      {viewMode === 'social' ? (
        /* SOCIAL FEED VIEW (Bacheca Foto, Video e Scatti On The Road) */
        <div className="space-y-4">
          {/* Quick Post Composer Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div onClick={() => profilePhotoInputRef.current?.click()} className="relative group cursor-pointer shrink-0" title="Cambia foto profilo">
                <UserAvatar
                  avatarUrl={myProfilePhoto || currentUser?.profilePhoto}
                  user={activeUserName}
                  avatarColor={currentUserColor}
                  size="w-9 h-9"
                  myProfilePhoto={myProfilePhoto}
                  activeUserName={activeUserName}
                  currentUser={currentUser}
                />
                <div className="absolute -bottom-1 -right-1 bg-[#3E4A35] text-white p-0.5 rounded-full text-[8px] shadow-xs">
                  <Camera className="w-2.5 h-2.5" />
                </div>
              </div>
              <input
                type="text"
                value={quickSocialText}
                onChange={(e) => setQuickSocialText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleQuickSocialSubmit(); }}
                placeholder="Scrivi un pensiero o scatto..."
                className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#3E4A35] dark:focus:border-[#A3B896] transition-all truncate"
              />
            </div>

            {/* Optional Location & Tags Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <input
                  type="text"
                  value={postLocationName}
                  onChange={(e) => setPostLocationName(e.target.value)}
                  placeholder="Aggiungi posizione (es. Lago di Braies)"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-[#3E4A35] truncate"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                {postMedia ? (
                  <div className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <span className="truncate max-w-[120px] font-bold">{postMedia.name}</span>
                    <button onClick={() => setPostMedia(null)} className="p-0.5 text-rose-500 hover:text-rose-700 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
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
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#5A6B4E]" />
                      <span>Foto / Video</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleQuickSocialSubmit}
                  className="px-4 py-1.5 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                >
                  <Send className="w-3 h-3" />
                  <span>Pubblica</span>
                </button>
              </div>
            </div>

            {/* Quick Hashtags Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-400">Hashtags:</span>
              {['#vanlife', '#viacamper', '#dolomiti', '#sostalibera', '#vistaMare', '#onTheRoad'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    if (!quickSocialText.includes(tag)) {
                      setQuickSocialText(prev => (prev ? `${prev} ${tag}` : tag));
                    }
                  }}
                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md text-[10px] font-extrabold text-[#3E4A35] dark:text-[#A3B896] transition-all cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Social Feed Sub-filters */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-2 shadow-2xs space-y-1.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full">
              {[
                { id: 'all', label: 'Tutti i Post', icon: '✨' },
                { id: 'media', label: 'Solo Foto & Video', icon: '📷' },
                { id: 'popular', label: 'Più Popolari', icon: '🔥' },
                { id: 'mine', label: 'I Miei Post', icon: '👤' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setSocialSubFilter(sub.id as any)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                    socialSubFilter === sub.id
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-sm shrink-0">{sub.icon}</span>
                  <span className="truncate text-[11px] sm:text-xs">{sub.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Social Post Feed Items */}
          <div className="bg-[#EDE9E1] dark:bg-slate-900/40 border border-stone-300/60 dark:border-slate-800 rounded-3xl p-3.5 sm:p-5 shadow-inner space-y-4">
            {filteredMessages.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-8 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-400 mx-auto flex items-center justify-center text-xl">
                  📸
                </div>
                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">Nessun post social trovato</h4>
                <p className="text-slate-500 text-xs max-w-sm mx-auto">
                  Sii il primo a pubblicare uno scatto della tua avventura in camper o un pensiero con la community!
                </p>
                <button
                  onClick={() => {
                    setPostTargetType('social');
                    setShowCreatePostModal(true);
                  }}
                  className="px-4 py-2 bg-[#3E4A35] text-white font-bold text-xs rounded-xl hover:bg-[#5A6B4E] cursor-pointer"
                >
                  Crea il Primo Post Social
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMessages.map((msg) => {
                  const isLiked = msg.likedByCurrentUser;
                  const relTime = getRelativeTime(msg.timestamp);
                  const showDoubleTapAnim = doubleTapLikedId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden transition-all hover:shadow-md space-y-3"
                    >
                    {/* Header: Author & Spot Location */}
                    <div className="p-4 pb-0 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          avatar={msg.avatar}
                          avatarUrl={msg.avatarUrl}
                          user={msg.user}
                          avatarColor={msg.avatarColor}
                          size="w-10 h-10"
                          myProfilePhoto={myProfilePhoto}
                          activeUserName={activeUserName}
                          currentUser={currentUser}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs truncate">
                              {msg.user}
                            </span>
                            {msg.challengeSubmissionId && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100/90 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 flex items-center gap-1 shadow-2xs">
                                🏆 Concorso: {msg.challengeTitle || 'Foto Contest'}
                              </span>
                            )}
                            {viewMode !== 'social' && (
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getTagStyle(msg.tag)}`}>
                                {msg.tag}
                              </span>
                            )}
                            {msg.isModerated && !msg.user.includes('Rolly') && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700 flex items-center gap-1 shadow-2xs">
                                🛡️ Censurato da Rolly
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {relTime}
                            </span>
                            {msg.locationName && (
                              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold truncate">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span>{msg.locationName}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Delete Action ('X' button in top right) */}
                      {(viewMode === 'social' || isAdmin || msg.user === activeUserName || msg.user.includes('Tu') || msg.user === 'Tu (Camperista)') && (
                        <button
                          type="button"
                          onClick={() => requestDeleteMessage(msg.id, msg.text)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors"
                          title="Elimina post"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Post Text & Hashtags & Quotes */}
                    <div className="px-4 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line space-y-1.5">
                      <QuotedReplyBox replyTo={msg.replyTo} />
                      <div>{renderTextWithHashtagsAndMentions(msg.text)}</div>
                    </div>

                    {/* Navigation card to view shared trip */}
                    {(() => {
                      const hasTripSnippet = msg.text.includes("Puoi esplorare la mappa") || msg.text.includes("Viaggi Condivisi della Community");
                      const isTripPost = hasTripSnippet || !!msg.sharedTripId || msg.id.startsWith("m_trip_");
                      if (!isTripPost) return null;

                      let tripId = msg.sharedTripId;
                      if (!tripId && msg.id.startsWith("m_trip_")) {
                        const parts = msg.id.split("_");
                        if (parts.length >= 3) {
                          tripId = parts.slice(2, parts.length - 1).join("_");
                        }
                      }

                      return (
                        <div className="mx-4 mt-3 mb-1 p-3 bg-[#F4F1EA]/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 min-w-0">
                            <span className="text-xl shrink-0">🗺️</span>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-900 dark:text-white">Diario di Viaggio Condiviso</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Vedi l'itinerario e le tappe di questo viaggio</p>
                            </div>
                          </div>
                          {onViewTrip && (
                            <button
                              onClick={() => {
                                if (tripId) {
                                  onViewTrip(tripId);
                                } else {
                                  window.dispatchEvent(
                                    new CustomEvent("show-toast", {
                                      detail: { message: "⚠️ Impossibile caricare il dettaglio per questo vecchio post." },
                                    })
                                  );
                                }
                              }}
                              className="px-3 py-1.5 bg-[#3E4A35] hover:bg-[#3E4A35]/90 text-white rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-xs uppercase tracking-wider"
                            >
                              <span>Apri Viaggio</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* Media Attachment (Photo / Video) with Double-Tap Heart */}
                    {msg.mediaUrl && (
                      <div
                        className="relative bg-slate-950 overflow-hidden cursor-pointer group"
                        onDoubleClick={() => {
                          if (!isLiked) handleLike(msg.id);
                          setDoubleTapLikedId(msg.id);
                          setTimeout(() => setDoubleTapLikedId(null), 1000);
                        }}
                        onClick={() => setMediaModal({ url: msg.mediaUrl!, type: msg.mediaType || 'image' })}
                      >
                        {msg.mediaType === 'video' ? (
                          <div className="relative aspect-video flex items-center justify-center bg-black">
                            <video src={msg.mediaUrl} className="w-full h-full object-cover max-h-[380px]" />
                            <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center group-hover:bg-slate-950/20 transition-all">
                              <div className="w-12 h-12 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <Play className="w-6 h-6 ml-1 fill-current" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={msg.mediaUrl}
                            alt="Scatto social camper"
                            className="w-full h-auto max-h-[420px] object-cover hover:scale-[1.01] transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />
                        )}

                        {/* Double tap heart animation overlay */}
                        {showDoubleTapAnim && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none animate-in zoom-in duration-200">
                            <Heart className="w-20 h-20 text-rose-500 fill-rose-500 drop-shadow-lg animate-pulse" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Social Post Interactive Footer (Like, Comment, Share) */}
                    <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-4">
                        {/* Like Button */}
                        <button
                          onClick={() => handleLike(msg.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                            isLiked
                              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                          <span>{msg.likes > 0 ? msg.likes : 'Mi piace'}</span>
                        </button>

                        {/* Comment Button */}
                        <button
                          onClick={() => setExpandedReplies(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4 text-[#5A6B4E]" />
                          <span>{msg.replies && msg.replies.length > 0 ? `${msg.replies.length} Commenti` : 'Commenta'}</span>
                        </button>
                      </div>

                      {/* Share Link Button */}
                      <button
                        onClick={() => {
                          setCopiedPostId(msg.id);
                          navigator.clipboard?.writeText(window.location.href);
                          window.dispatchEvent(
                            new CustomEvent("show-toast", {
                              detail: { message: "🔗 Link al post copiato negli appunti!" },
                            })
                          );
                          setTimeout(() => setCopiedPostId(null), 2500);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer text-slate-500"
                      >
                        <Share2 className="w-4 h-4 text-slate-400" />
                        <span className="hidden sm:inline">{copiedPostId === msg.id ? 'Copiato!' : 'Condividi'}</span>
                      </button>
                    </div>

                    {/* Comment Thread (Expanded or when has replies) */}
                    {expandedReplies[msg.id] && (
                      <div className="p-3 sm:p-4 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700/60 space-y-3 max-w-full overflow-hidden">
                        <h5 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs flex items-center justify-between">
                          <span>Commenti ({msg.replies?.length || 0})</span>
                          <span className="text-[10px] font-normal text-slate-400">Scrivi con la community</span>
                        </h5>

                        {msg.replies && msg.replies.length > 0 && (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {msg.replies.map((reply) => (
                              <div
                                key={reply.id}
                                className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-2xs space-y-1.5"
                              >
                                <QuotedReplyBox replyTo={reply.replyTo} />

                                <div className="flex justify-between items-center gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <UserAvatar
                                      avatar={reply.avatar}
                                      avatarUrl={reply.avatarUrl}
                                      user={reply.user}
                                      avatarColor={reply.avatarColor}
                                      size="w-6 h-6"
                                      textSize="text-[10px]"
                                      myProfilePhoto={myProfilePhoto}
                                      activeUserName={activeUserName}
                                      currentUser={currentUser}
                                    />
                                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">{reply.user}</span>
                                    <span className="text-[9px] text-slate-400 shrink-0">{getRelativeTime(reply.timestamp)}</span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleStartReply({ id: reply.id, user: reply.user, text: reply.text, msgId: msg.id })}
                                      className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                                      title="Rispondi a questo commento"
                                    >
                                      <MessageSquare className="w-3 h-3" />
                                      <span>Rispondi</span>
                                    </button>

                                    {isAdmin && (
                                      <button
                                        onClick={() => handleDeleteReply(msg.id, reply.id)}
                                        className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                                        title="Elimina commento"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="text-xs text-slate-700 dark:text-slate-300 pl-8">
                                  {renderTextWithHashtagsAndMentions(reply.text)}
                                </div>

                                {reply.mediaUrl && (
                                  <div className="pl-8 pt-1">
                                    <img
                                      src={reply.mediaUrl}
                                      alt="Allegato commento"
                                      className="w-24 h-24 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90"
                                      onClick={() => setMediaModal({ url: reply.mediaUrl!, type: reply.mediaType || 'image' })}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Quoted Banner inside comment box if active for this message */}
                        {quotedTarget && (quotedTarget.msgId === msg.id || quotedTarget.id === msg.id) && (
                          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/80 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 overflow-hidden text-emerald-900 dark:text-emerald-200 text-[11px]">
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">
                                <strong className="font-extrabold">Rispondi a @{quotedTarget.user}:</strong> "{quotedTarget.text}"
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setQuotedTarget(null)}
                              className="p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-full text-slate-500 cursor-pointer shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Reply Input */}
                        <div className="flex items-center gap-1.5 sm:gap-2 pt-1 min-w-0 max-w-full">
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
                            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                              replyMedia[msg.id]
                                ? 'bg-[#3E4A35] text-white border-[#3E4A35]'
                                : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                            title="Allegazione foto/video"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMentionTargetKey(msg.id);
                              setShowMentionPicker(true);
                            }}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-extrabold text-xs cursor-pointer flex items-center justify-center shrink-0"
                            title="Tagga un utente della community"
                          >
                            <span className="font-black text-xs text-[#3E4A35] dark:text-[#A3B896]">@</span>
                          </button>
                          <input
                            type="text"
                            placeholder="Aggiungi un commento..."
                            value={replyTexts[msg.id] || ''}
                            onChange={(e) => setReplyTexts(prev => ({ ...prev, [msg.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateReply(msg.id); }}
                            className="flex-1 w-0 min-w-0 px-2.5 sm:px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#3E4A35]"
                          />
                          <button
                            onClick={() => handleCreateReply(msg.id)}
                            className="px-2.5 sm:px-3 py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 whitespace-nowrap"
                          >
                            <Send className="w-3.5 h-3.5 shrink-0" />
                            <span>Invia</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      ) : viewMode === 'chat' ? (
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
                      <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                        <UserAvatar
                          avatar={msg.avatar}
                          avatarUrl={msg.avatarUrl}
                          user={msg.user}
                          avatarColor={msg.avatarColor}
                          size="w-5 h-5"
                          textSize="text-[8px]"
                          myProfilePhoto={myProfilePhoto}
                          activeUserName={activeUserName}
                          currentUser={currentUser}
                        />
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
                      <span>{getRelativeTime(msg.timestamp)}</span>
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
                      {/* Quoted Message if replying */}
                      <QuotedReplyBox replyTo={msg.replyTo} />

                      {msg.text && (
                        <p className="whitespace-pre-wrap">
                          {renderTextWithHashtagsAndMentions(msg.text)}
                        </p>
                      )}
                      {msg.isModerated && !msg.user.includes('Rolly') && (
                        <div className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded mt-1">
                          <span>🛡️ Censurato da Rolly</span>
                        </div>
                      )}

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

                      {/* Like & Reply button footer for chat bubble */}
                      <div className={`mt-2 pt-1.5 border-t flex items-center justify-between gap-2 text-[10px] ${
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

                        <button
                          type="button"
                          onClick={() => handleStartReply({ id: msg.id, user: msg.user, text: msg.text })}
                          className={`flex items-center gap-1 font-bold transition-all cursor-pointer hover:scale-105 ${
                            isMe ? 'text-white/90 hover:text-white' : 'hover:text-emerald-600 dark:hover:text-emerald-400'
                          }`}
                          title="Rispondi e cita questo messaggio"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Rispondi</span>
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
            {quotedTarget && (
              <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/80 border-t border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 overflow-hidden text-emerald-900 dark:text-emerald-200">
                  <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="truncate">
                    <span className="font-extrabold">Risposta a @{quotedTarget.user}: </span>
                    <span className="italic opacity-90">"{quotedTarget.text}"</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setQuotedTarget(null)}
                  className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-full text-slate-500 cursor-pointer shrink-0"
                  title="Annulla citazione"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

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
              <button
                type="button"
                onClick={() => {
                  setActiveMentionTargetKey('chat');
                  setShowMentionPicker(true);
                }}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-extrabold text-xs transition-all cursor-pointer shrink-0 flex items-center justify-center"
                title="Tagga un utente della community"
              >
                <span className="font-black text-sm text-[#3E4A35] dark:text-[#A3B896]">@</span>
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
      ) : viewMode === 'sos' ? (
        /* DEDICATED SOS EMERGENCY REQUESTS STREAM */
        <div className="space-y-4">
          {/* List of SOS Emergency Posts */}
          {filteredMessages.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-8 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-xl font-bold">
                💚
              </div>
              <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">Nessuna richiesta di SOS al momento</h4>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                Tutto tranquillo sulla strada! Se hai bisogno di aiuto o supporto d'emergenza, puoi lanciare una richiesta SOS.
              </p>
              <button
                onClick={() => {
                  setPostTag('SOS');
                  setPostText('⚠️ RICHIESTA SOS: ');
                  setShowCreatePostModal(true);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs"
              >
                Lancia una Richiesta SOS
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMessages.map((msg) => {
                const isResolved = msg.isResolved;
                const relTime = getRelativeTime(msg.timestamp);

                return (
                  <div
                    key={msg.id}
                    className={`bg-white dark:bg-slate-800 rounded-2xl border ${
                      isResolved
                        ? 'border-emerald-200 dark:border-emerald-900/60'
                        : 'border-rose-300 dark:border-rose-900/80 shadow-md'
                    } overflow-hidden transition-all space-y-3`}
                  >
                    {/* Emergency Banner Header */}
                    <div className={`px-4 py-2.5 ${
                      isResolved
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200'
                    } flex items-center justify-between gap-2 border-b border-rose-100 dark:border-rose-900/40`}>
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                        <AlertOctagon className={`w-4 h-4 ${isResolved ? 'text-emerald-600' : 'text-rose-600 animate-pulse'}`} />
                        <span>{isResolved ? '✅ SOS RISOLTO / COMPLETATO' : '🚨 RICHIESTA SOS ATTIVA'}</span>
                      </div>
                      <button
                        onClick={() => handleResolve(msg.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          isResolved
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        }`}
                      >
                        {isResolved ? 'Riapri SOS' : 'Segna come Risolto'}
                      </button>
                    </div>

                    {/* Author & Location Info */}
                    <div className="px-4 pt-1 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          avatar={msg.avatar}
                          avatarUrl={msg.avatarUrl}
                          user={msg.user}
                          avatarColor={msg.avatarColor}
                          size="w-10 h-10"
                          myProfilePhoto={myProfilePhoto}
                          activeUserName={activeUserName}
                          currentUser={currentUser}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs truncate">
                              {msg.user}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {relTime}
                            </span>
                            {msg.locationName && (
                              <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400 font-bold truncate">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span>{msg.locationName}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer shrink-0"
                          title="Elimina richiesta SOS (Admin)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* SOS Text */}
                    <div className="px-4 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {renderTextWithHashtagsAndMentions(msg.text)}
                    </div>

                    {/* Media Attachment if present */}
                    {msg.mediaUrl && (
                      <div
                        className="mx-4 rounded-xl overflow-hidden bg-slate-950 cursor-pointer"
                        onClick={() => setMediaModal({ url: msg.mediaUrl!, type: msg.mediaType || 'image' })}
                      >
                        {msg.mediaType === 'video' ? (
                          <video src={msg.mediaUrl} controls className="w-full max-h-72 object-cover" />
                        ) : (
                          <img src={msg.mediaUrl} alt="Foto SOS" className="w-full max-h-72 object-cover hover:scale-[1.01] transition-transform" />
                        )}
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <button
                          onClick={() => setExpandedReplies(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-all cursor-pointer text-xs"
                        >
                          <MessageSquare className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Risposte ({msg.replies?.length || 0})</span>
                        </button>

                        <button
                          onClick={() => handleLike(msg.id)}
                          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer text-xs ${
                            msg.likedByCurrentUser
                              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${msg.likedByCurrentUser ? 'fill-rose-500 text-rose-500' : ''}`} />
                          <span>{msg.likes > 0 ? msg.likes : 'Supporto'}</span>
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setCopiedPostId(msg.id);
                          navigator.clipboard?.writeText(window.location.href);
                          window.dispatchEvent(
                            new CustomEvent("show-toast", {
                              detail: { message: "🔗 Link alla richiesta SOS copiato!" },
                            })
                          );
                          setTimeout(() => setCopiedPostId(null), 2500);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer shrink-0"
                        title="Condividi SOS"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* SOS Comment / Support Thread */}
                    {expandedReplies[msg.id] && (
                      <div className="p-3 sm:p-4 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700/60 space-y-3 max-w-full overflow-hidden">
                        <h5 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs flex items-center justify-between">
                          <span>Risposte di Supporto ({msg.replies?.length || 0})</span>
                          <span className="text-[10px] font-normal text-slate-400">Offri indicazioni o aiuto</span>
                        </h5>

                        {msg.replies && msg.replies.length > 0 && (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {msg.replies.map((reply) => (
                              <div
                                key={reply.id}
                                className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-2xs space-y-1.5"
                              >
                                <div className="flex justify-between items-center gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-rose-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                                      {reply.user[0]}
                                    </div>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">{reply.user}</span>
                                    <span className="text-[9px] text-slate-400 shrink-0">{getRelativeTime(reply.timestamp)}</span>
                                  </div>

                                  {isAdmin && (
                                    <button
                                      onClick={() => handleDeleteReply(msg.id, reply.id)}
                                      className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer shrink-0"
                                      title="Elimina commento"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                <p className="text-xs text-slate-700 dark:text-slate-300 pl-8">{reply.text}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply Input for SOS */}
                        <div className="flex items-center gap-1.5 sm:gap-2 pt-1 min-w-0 max-w-full">
                          <input
                            type="text"
                            placeholder="Offri supporto o informazioni..."
                            value={replyTexts[msg.id] || ''}
                            onChange={(e) => setReplyTexts(prev => ({ ...prev, [msg.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateReply(msg.id); }}
                            className="flex-1 w-0 min-w-0 px-2.5 sm:px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-rose-500"
                          />
                          <button
                            onClick={() => handleCreateReply(msg.id)}
                            className="px-2.5 sm:px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 whitespace-nowrap"
                          >
                            <Send className="w-3.5 h-3.5 shrink-0" />
                            <span>Invia</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
                  const catMessages = sanitizedMessages.filter((m) => (m.type === 'forum' || !m.type) && m.tag === catKey);
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
                          <span className="shrink-0 text-[10px]">{getRelativeTime(latestMsg.timestamp)}</span>
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
                const categoryDiscussions = sanitizedMessages.filter((m) => {
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
                            <UserAvatar
                              avatar={msg.avatar}
                              avatarUrl={msg.avatarUrl}
                              user={msg.user}
                              avatarColor={msg.avatarColor}
                              size="w-8 h-8"
                              textSize="text-xs"
                              myProfilePhoto={myProfilePhoto}
                              activeUserName={activeUserName}
                              currentUser={currentUser}
                            />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-start gap-1.5">
                                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs sm:text-sm group-hover:text-[#3E4A35] dark:group-hover:text-[#A3B896] transition-colors leading-snug break-words">
                                  {msg.title || msg.text}
                                </h4>
                                {isRolly && (
                                  <span className="text-[8px] bg-[#3E4A35] text-white px-1.5 py-0.2 rounded-full font-black uppercase shrink-0 mt-0.5 flex items-center gap-1">
                                    🚐 Rolly
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-2 flex-wrap">
                                <span>Aperta da <strong className="text-slate-700 dark:text-slate-300">{msg.user}</strong></span>
                                <span>•</span>
                                <span>{getRelativeTime(msg.timestamp)}</span>
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
                const msg = sanitizedMessages.find((m) => m.id === selectedDiscussionId);
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
                        <UserAvatar
                          avatar={msg.avatar}
                          avatarUrl={msg.avatarUrl}
                          user={msg.user}
                          avatarColor={msg.avatarColor}
                          size="w-10 h-10"
                          myProfilePhoto={myProfilePhoto}
                          activeUserName={activeUserName}
                          currentUser={currentUser}
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5 flex-wrap">
                            <span>{msg.user === 'Tu (Camperista)' || msg.user.includes('Tu') ? activeUserName : msg.user}</span>
                            {isRolly && (
                              <span className="text-[9px] bg-[#3E4A35] text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1">
                                🚐 Assistente ViaCamper
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
                            <span>{getRelativeTime(msg.timestamp)}</span>
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
                                  <UserAvatar
                                    avatar={reply.avatar}
                                    avatarUrl={reply.avatarUrl}
                                    user={reply.user}
                                    avatarColor={reply.avatarColor}
                                    size="w-5 h-5"
                                    textSize="text-[9px]"
                                    myProfilePhoto={myProfilePhoto}
                                    activeUserName={activeUserName}
                                    currentUser={currentUser}
                                  />
                                  {reply.user === 'Tu (Camperista)' || reply.user.includes('Tu') ? activeUserName : reply.user}
                                  {(reply.user === activeUserName || reply.user.includes('Tu')) && (
                                    <span className="text-[9px] bg-[#3E4A35]/15 dark:bg-[#A3B896]/20 text-[#3E4A35] dark:text-[#A3B896] px-1.5 py-0.2 rounded font-mono font-bold">
                                      Tu
                                    </span>
                                  )}
                                  {reply.isModerated && !reply.user.includes('Rolly') && (
                                    <span className="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 px-1.5 py-0.2 rounded font-extrabold shrink-0 border border-amber-300 dark:border-amber-700">
                                      🛡️ Censurato da Rolly
                                    </span>
                                  )}
                                </span>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                  <span>{getRelativeTime(reply.timestamp)}</span>
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
                {postTargetType === 'social'
                  ? 'Pubblica uno Scatto / Pensiero Social'
                  : postTargetType === 'chat'
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
              {/* Destination selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Destinazione Post:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPostTargetType('social')}
                    className={`p-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-1 ${
                      postTargetType === 'social'
                        ? 'bg-[#3E4A35] text-white border-[#3E4A35] dark:bg-[#A3B896] dark:text-slate-950'
                        : 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Social</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostTargetType('forum')}
                    className={`p-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-1 ${
                      postTargetType === 'forum'
                        ? 'bg-[#3E4A35] text-white border-[#3E4A35] dark:bg-[#A3B896] dark:text-slate-950'
                        : 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Forum</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostTargetType('chat')}
                    className={`p-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-1 ${
                      postTargetType === 'chat'
                        ? 'bg-[#3E4A35] text-white border-[#3E4A35] dark:bg-[#A3B896] dark:text-slate-950'
                        : 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Chat Live</span>
                  </button>
                </div>
              </div>

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

              {postTargetType === 'social' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Posizione / Spot (facoltativo):
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={postLocationName}
                      onChange={(e) => setPostLocationName(e.target.value)}
                      placeholder="Es. Passo Gardena, Lago di Braies, Costa Smeralda..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#3E4A35]"
                    />
                  </div>
                </div>
              )}

              {postTargetType !== 'social' && (
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
              )}

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Testo del Messaggio / Pensiero:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMentionTargetKey('postModal');
                      setShowMentionPicker(true);
                    }}
                    className="text-[11px] font-extrabold text-[#3E4A35] dark:text-[#A3B896] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>🏷️ Tagga Utente</span>
                  </button>
                </div>
                <textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  placeholder="Scrivi qui consigli di viaggio, la descrizione dello scatto, o un pensiero per la community..."
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

      {showPhotoCropper && pendingCropPhotoSrc && (
        <ProfilePhotoCropper
          imageSrc={pendingCropPhotoSrc}
          onCrop={async (croppedBase64) => {
            await handleSaveCroppedPhoto(croppedBase64);
            setShowPhotoCropper(false);
            setPendingCropPhotoSrc(null);
          }}
          onCancel={() => {
            setShowPhotoCropper(false);
            setPendingCropPhotoSrc(null);
          }}
        />
      )}

      {/* User Mention Picker Modal */}
      <UserMentionPickerModal
        isOpen={showMentionPicker}
        onClose={() => setShowMentionPicker(false)}
        users={communityUsersList}
        onSelectUser={(u) => handleTagUser(u, activeMentionTargetKey)}
      />
    </div>
  );
}
