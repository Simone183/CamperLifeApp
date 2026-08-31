import React, { useState } from 'react';
import { SocialPost, TabType } from '../types';
import {
  Heart, MessageSquare, Share2, Search, MapPin, Camera, Rocket, X, Bell,
  Sparkles, Flame, User, Image as ImageIcon, Shield, Trophy, ArrowLeft,
  Lightbulb, Send, AlertTriangle, Paperclip, AtSign, PlusCircle, CheckCircle
} from 'lucide-react';

interface SocialTabProps {
  posts: SocialPost[];
  onAddPost: (post: Partial<SocialPost>) => void;
  onNavigateToTools?: () => void;
}

export const SocialTab: React.FC<SocialTabProps> = ({ posts, onAddPost, onNavigateToTools }) => {
  const [activeSubTab, setActiveSubTab] = useState<'social' | 'forum' | 'chat' | 'sos'>('social');
  const [searchQuery, setSearchQuery] = useState('');
  const [newPostText, setNewPostText] = useState('');
  const [locationTag, setLocationTag] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'media' | 'popular' | 'my'>('all');
  const [likedPostIds, setLikedPostIds] = useState<Record<string, boolean>>({});
  const [dismissedPostIds, setDismissedPostIds] = useState<Record<string, boolean>>({});
  const [showPublishedToast, setShowPublishedToast] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Chat Live State
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'msg-1',
      author: 'Rolly - Assistente ViaCamper',
      avatar: '🚌',
      isBot: true,
      text: '💡 La chat live è uno spazio aperto a tutti i camperisti per scambiarsi saluti e dritte al volo sulla strada! Buona permanenza! 🛣️',
      time: '12:30',
      likes: 3
    },
    {
      id: 'msg-2',
      author: 'Rolly - Assistente ViaCamper',
      avatar: '🚌',
      isBot: true,
      text: '👋 Benvenuti nella Chat Live di ViaCamper! Scrivete qui per scambiarvi consigli in tempo reale o condividere informazioni pratiche mentre siete in viaggio. 🚐💬',
      time: '12:31',
      likes: 5
    }
  ]);
  const [newChatMessage, setNewChatMessage] = useState('');

  // SOS Emergency Requests
  const [sosList, setSosList] = useState([
    {
      id: 'sos-1',
      author: 'Marco & Elena (Fiat Ducato)',
      location: 'Passo del Pordoi (TN)',
      phone: '+39 347 1234567',
      issue: 'Batteria servizi scarica e guasto alternatore. Cerchiamo cavi o supporto meccanico in zona.',
      time: '10 minuti fa',
      status: 'IN ATTESA'
    }
  ]);
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosLocation, setSosLocation] = useState('');
  const [sosIssue, setSosIssue] = useState('');
  const [sosPhone, setSosPhone] = useState('');

  const hashtags = ['#vanlife', '#viacamper', '#dolomiti', '#sostalibera', '#vistaMare', '#onTheRoad'];

  const handleAddHashtag = (tag: string) => {
    if (!newPostText.includes(tag)) {
      setNewPostText(prev => (prev ? `${prev} ${tag}` : tag));
    }
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    onAddPost({
      authorName: 'Sam83',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      date: new Date().toLocaleDateString('it-IT') + ' ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      content: newPostText,
      category: 'FOTO',
      likes: 0,
      commentsCount: 0,
      locationTag: locationTag.trim() || 'Agrigento',
      image: 'https://images.unsplash.com/photo-1548625361-185b1a382c49?auto=format&fit=crop&w=800&q=80'
    });

    setNewPostText('');
    setLocationTag('');
    setShowPublishedToast(true);
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim()) return;

    setChatMessages(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        author: 'Sam83',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        isBot: false,
        text: newChatMessage,
        time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        likes: 0
      }
    ]);
    setNewChatMessage('');
  };

  const handleSendSos = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sosIssue.trim()) return;

    setSosList(prev => [
      {
        id: `sos-${Date.now()}`,
        author: 'Sam83',
        location: sosLocation || 'Posizione Attuale',
        phone: sosPhone || '+39 333 9988776',
        issue: sosIssue,
        time: 'Ora',
        status: 'IN ATTESA'
      },
      ...prev
    ]);
    setShowSosModal(false);
    setSosLocation('');
    setSosIssue('');
    setSosPhone('');
  };

  const toggleLike = (id: string) => {
    setLikedPostIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const dismissPost = (id: string) => {
    setDismissedPostIds(prev => ({ ...prev, [id]: true }));
  };

  const filteredPosts = posts
    .filter(p => !dismissedPostIds[p.id])
    .filter(p => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return p.content.toLowerCase().includes(q) ||
             p.authorName.toLowerCase().includes(q) ||
             (p.locationTag && p.locationTag.toLowerCase().includes(q));
    })
    .filter(p => {
      if (activeFilter === 'media') return !!p.image;
      if (activeFilter === 'popular') return p.likes > 10;
      if (activeFilter === 'my') return p.authorName === 'Sam83';
      return true;
    });

  return (
    <div className="pb-28 pt-3 max-w-2xl mx-auto px-4 space-y-4 font-sans">
      
      {/* 1. Top Bar: Return to Tools & Guide */}
      <div className="flex items-center justify-between">
        <button
          onClick={onNavigateToTools}
          className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Torna a Strumenti</span>
        </button>

        <button
          onClick={() => setShowGuideModal(true)}
          className="px-3.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
        >
          <span>🚌💡</span>
          <span>Guida</span>
        </button>
      </div>

      {/* 2. User Profile Banner Card (Screenshot 11) */}
      <div className="bg-[#e0ded5] dark:bg-slate-900 rounded-2xl p-4 border border-slate-300 dark:border-slate-800 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
              alt="Profilo Sam83"
              className="w-12 h-12 rounded-full object-cover border-2 border-emerald-800 shadow-xs"
            />
            <div className="absolute -bottom-1 -right-1 bg-emerald-700 text-white p-1 rounded-full text-[10px]">
              📷
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Sam83</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                ONLINE
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Foto profilo personalizzata attiva</p>
          </div>
        </div>

        <button className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 flex items-center gap-1 transition-colors">
          <Camera className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden sm:inline">Cambia Foto</span>
        </button>
      </div>

      {/* 3. Rolly Moderatore Banner (Screenshot 11) */}
      <div className="bg-[#1E293B] text-white rounded-2xl p-4 shadow-sm border border-slate-800 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-emerald-800 text-amber-200 shrink-0 mt-0.5">
          <Shield className="w-5 h-5" />
        </div>
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-900 text-emerald-200 text-[10px] font-extrabold tracking-wider uppercase">
              🛡️ IN PRIMA LINEA
            </span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-sans">
            Rolly Moderatore IA: Protezione attiva 24/7 in Chat Live, Forum e Social (blocco parolacce, censura e richiami automatici).
          </p>
        </div>
      </div>

      {/* 4. Concorso Attivo Banner (Screenshot 11) */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white rounded-2xl p-4 shadow-md flex items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-950/40 text-amber-100 text-[10px] font-extrabold tracking-wider uppercase">
            🏆 CONCORSO ATTIVO
          </span>
          <h4 className="font-extrabold text-sm sm:text-base font-serif">Sfida #1: Foto Vista Mare 🌊</h4>
          <p className="text-xs text-amber-100/90 leading-tight max-w-md">
            Pubblica una foto con vista mare, aggiungi spot e accumula punti per vincere il Badge Esclusivo!
          </p>
        </div>
        <button className="px-3.5 py-2 rounded-xl bg-white text-orange-900 hover:bg-amber-50 text-xs font-extrabold shadow-sm shrink-0 transition-transform active:scale-95">
          Partecipa Ora &gt;
        </button>
      </div>

      {/* 5. Subtab Navigation Bar */}
      <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-stone-200 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 text-xs font-extrabold">
        <button
          onClick={() => setActiveSubTab('social')}
          className={`py-2.5 rounded-xl flex items-center justify-center gap-1 transition-all ${
            activeSubTab === 'social'
              ? 'bg-[#1E293B] text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-stone-300/60 dark:hover:bg-slate-800'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Social</span>
        </button>

        <button
          onClick={() => setActiveSubTab('forum')}
          className={`py-2.5 rounded-xl flex items-center justify-center gap-1 transition-all ${
            activeSubTab === 'forum'
              ? 'bg-[#1E293B] text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-stone-300/60 dark:hover:bg-slate-800'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span>Forum</span>
        </button>

        <button
          onClick={() => setActiveSubTab('chat')}
          className={`py-2.5 rounded-xl flex items-center justify-center gap-1 transition-all ${
            activeSubTab === 'chat'
              ? 'bg-[#1E293B] text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-stone-300/60 dark:hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
          <span>Chat Live</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sos')}
          className={`py-2.5 rounded-xl flex items-center justify-center gap-1 transition-all ${
            activeSubTab === 'sos'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-rose-700 dark:text-rose-400 hover:bg-stone-300/60 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>SOS</span>
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
        </button>
      </div>

      {/* SUBTAB 1: SOCIAL FEED (Screenshot 8) */}
      {activeSubTab === 'social' && (
        <div className="space-y-4">
          {/* Create Post Form Card */}
          <form onSubmit={handleCreatePost} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-300/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex gap-3">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                alt="Sam83"
                className="w-10 h-10 rounded-full object-cover border border-emerald-800 shrink-0"
              />
              <textarea
                rows={2}
                placeholder="Scrivi un pensiero o scatto..."
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pl-12">
              <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
              <input
                type="text"
                placeholder="Aggiungi posizione (es. Lago di Braies)"
                value={locationTag}
                onChange={(e) => setLocationTag(e.target.value)}
                className="w-full text-xs text-slate-700 dark:text-slate-300 bg-transparent border-none focus:outline-none placeholder-slate-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pl-12 text-xs">
              <span className="text-slate-400 font-semibold text-[11px]">Hashtags:</span>
              {hashtags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddHashtag(tag)}
                  className="px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 text-slate-600 dark:text-slate-300 text-[11px] font-medium transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Camera className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <span>Foto / Video</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#1E293B] hover:bg-[#0F172A] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>Pubblica</span>
              </button>
            </div>
          </form>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Cerca discussioni, soste, consigli..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-xs"
            />
          </div>

          {/* Filter Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeFilter === 'all'
                  ? 'bg-[#1E293B] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Tutti i Post</span>
            </button>

            <button
              onClick={() => setActiveFilter('media')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeFilter === 'media'
                  ? 'bg-[#1E293B] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Solo Foto & Video</span>
            </button>

            <button
              onClick={() => setActiveFilter('popular')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeFilter === 'popular'
                  ? 'bg-[#1E293B] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span>Più Popolari</span>
            </button>

            <button
              onClick={() => setActiveFilter('my')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeFilter === 'my'
                  ? 'bg-[#1E293B] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>I Miei Post</span>
            </button>
          </div>

          {/* Feed Post List */}
          <div className="space-y-4">
            {filteredPosts.map((post) => {
              const isLiked = !!likedPostIds[post.id];
              return (
                <div
                  key={post.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-300/80 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={post.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                        alt={post.authorName}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                          {post.authorName}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>🕒 {post.date}</span>
                          {post.locationTag && (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" />
                              <span>{post.locationTag}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => dismissPost(post.id)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                      title="Nascondi post"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                    {post.content}
                  </p>

                  {post.image && (
                    <div className="rounded-xl overflow-hidden aspect-16/9 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-800">
                      <img src={post.image} alt="Media post" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex items-center gap-6 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <button
                      onClick={() => toggleLike(post.id)}
                      className={`flex items-center gap-1.5 transition-colors ${
                        isLiked ? 'text-rose-600 font-bold' : 'hover:text-rose-600'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                      <span>{isLiked ? 'Ti piace' : 'Mi piace'}</span>
                      {post.likes > 0 && <span className="text-[11px]">({post.likes + (isLiked ? 1 : 0)})</span>}
                    </button>

                    <button className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors">
                      <MessageSquare className="w-4 h-4" />
                      <span>Commenta</span>
                      {post.commentsCount > 0 && <span className="text-[11px]">({post.commentsCount})</span>}
                    </button>

                    <button className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors ml-auto">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: FORUM COMMUNITY (Screenshot 7) */}
      {activeSubTab === 'forum' && (
        <div className="space-y-4">
          <div className="bg-[#3e5337] text-white rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-950 text-amber-200">
                  FORUM COMMUNITY
                </span>
                <h3 className="text-xl font-bold font-serif text-amber-100 mt-1">Seleziona un Argomento</h3>
              </div>
              <button className="px-3 py-2 rounded-xl bg-amber-200 text-slate-950 hover:bg-amber-300 text-xs font-extrabold flex items-center gap-1 shadow-xs">
                <span>+ Nuova Discussione</span>
              </button>
            </div>
            <p className="text-xs text-amber-100/90 leading-relaxed font-sans">
              Scegli la categoria di tuo interesse per consultare tutte le discussioni aperte dalla community e dall'assistente Rolly.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Cerca discussioni nel forum..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="space-y-3">
            {/* Category 1 */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-300/80 dark:border-slate-800 hover:border-emerald-600 transition-colors cursor-pointer space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>💬</span>
                  <span>Generale & Vita On The Road</span>
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  9 DISCUSSIONI • 0 RISPOSTE
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Consigli di viaggio, allestimento camper, esperienze della community e consigli utili.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold flex items-center justify-between">
                <span>Ultimo: ⚡ Autonomia Energetica in Camp...</span>
                <span className="text-slate-400">15/07/2026 14:02</span>
              </div>
            </div>

            {/* Category 2 */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-300/80 dark:border-slate-800 hover:border-emerald-600 transition-colors cursor-pointer space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🚐</span>
                  <span>Sosta, Campeggi & Agricamper</span>
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  4 DISCUSSIONI • 0 RISPOSTE
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Segnalazioni, opinioni e recensioni su aree sosta, campeggi, agricamper e sosta libera.
              </p>
            </div>

            {/* Category 3 */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-300/80 dark:border-slate-800 hover:border-emerald-600 transition-colors cursor-pointer space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🔧</span>
                  <span>Meccanica, Fai da Te & Manutenzione</span>
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  3 DISCUSSIONI • 0 RISPOSTE
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Riparazioni, modifiche, accessori e consigli meccanici per tutte le marche di camper.
              </p>
            </div>

            {/* Category 4 */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-300/80 dark:border-slate-800 hover:border-emerald-600 transition-colors cursor-pointer space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🚨</span>
                  <span>Sicurezza & Emergenze in Viaggio</span>
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  2 DISCUSSIONI • 0 RISPOSTE
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Consigli di sicurezza, segnalazioni pericoli e supporto tra camperisti.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: CHAT LIVE (Screenshot 6) */}
      {activeSubTab === 'chat' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="px-3 py-1.5 rounded-xl bg-[#1E293B] text-white">Sosta (1)</span>
            <span className="px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Incontro (0)</span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-300/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Canale Chat Live • Camperisti d'Italia ({chatMessages.length} messaggi)
                </h3>
              </div>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="p-3 rounded-2xl bg-stone-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{msg.avatar}</span>
                      <span>{msg.author}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">{msg.time}</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-sans pl-6">
                    {msg.text}
                  </p>
                  <div className="flex items-center gap-3 pl-6 pt-1 text-[11px] font-bold text-slate-500">
                    <button className="hover:text-rose-600 flex items-center gap-1">
                      <span>Mi piace</span>
                      {msg.likes > 0 && <span>({msg.likes})</span>}
                    </button>
                    <button className="hover:text-emerald-700">Rispondi</button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChatMessage} className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800">
                <Paperclip className="w-4 h-4" />
              </button>
              <button type="button" className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800">
                <AtSign className="w-4 h-4" />
              </button>
              <input
                type="text"
                placeholder="Scrivi un messaggio in chat..."
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              />
              <button type="submit" className="p-2.5 rounded-xl bg-emerald-800 text-white font-bold hover:bg-emerald-900">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUBTAB 4: SOS EMERGENZE */}
      {activeSubTab === 'sos' && (
        <div className="space-y-4">
          <div className="bg-rose-950 text-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-800 text-rose-100 uppercase tracking-wider">
                🚨 SOCCORSO CAMPERISTI
              </span>
              <h3 className="text-xl font-bold font-serif text-white mt-1">Richiesta Aiuto SOS</h3>
              <p className="text-xs text-rose-200 leading-relaxed max-w-sm mt-0.5">
                Segnala un problema meccanico, una gomma a terra o una richiesta urgente di supporto in zona.
              </p>
            </div>
            <button
              onClick={() => setShowSosModal(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-md shrink-0"
            >
              + Invia SOS
            </button>
          </div>

          <div className="space-y-3">
            {sosList.map((sos) => (
              <div key={sos.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-rose-200 dark:border-rose-900 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">{sos.author}</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    {sos.status}
                  </span>
                </div>
                <p className="text-xs text-rose-800 dark:text-rose-400 font-bold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{sos.location}</span>
                </p>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-sans">{sos.issue}</p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400">{sos.time}</span>
                  <a href={`tel:${sos.phone}`} className="px-3 py-1 rounded-lg bg-emerald-700 text-white text-xs font-bold">
                    Chiama {sos.phone}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOS Form Modal */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form onSubmit={handleSendSos} className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Invia Segnalazione SOS</span>
              </h3>
              <button type="button" onClick={() => setShowSosModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Posizione o Città *</label>
                <input
                  type="text"
                  placeholder="es. Passo Pordoi / Autostrada A1 km 140"
                  required
                  value={sosLocation}
                  onChange={(e) => setSosLocation(e.target.value)}
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Telefono per Contatto URGENTE *</label>
                <input
                  type="text"
                  placeholder="+39 333 ..."
                  required
                  value={sosPhone}
                  onChange={(e) => setSosPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Descrizione del Problema *</label>
                <textarea
                  rows={3}
                  placeholder="Spiega brevemente il guasto o l'assistenza richiesta..."
                  required
                  value={sosIssue}
                  onChange={(e) => setSosIssue(e.target.value)}
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowSosModal(false)} className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold">
                Annulla
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-rose-700 text-white text-xs font-bold shadow-md">
                Pubblica SOS
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold font-serif text-slate-900 dark:text-white flex items-center gap-2">
                <span>🚌💡 Guida alla Community Social</span>
              </h3>
              <button onClick={() => setShowGuideModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p>• <strong>Bacheca Social</strong>: Condividi foto e momenti del tuo viaggio on the road con altri camperisti.</p>
              <p>• <strong>Forum & Chat Live</strong>: Fai domande tecniche o scambia consigli veloci sulle soste in tempo reale.</p>
              <p>• <strong>Rolly Moderatore IA</strong>: Filtro automatico attivo 24/7 per una community sicura, educata e senza spam.</p>
            </div>
            <button
              onClick={() => setShowGuideModal(false)}
              className="mt-6 w-full py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-sm"
            >
              Ho Capito
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showPublishedToast && (
        <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-50 bg-[#1E293B] text-white rounded-xl p-3 shadow-lg flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Post pubblicato nella Bacheca Social!</span>
          </div>
          <button onClick={() => setShowPublishedToast(false)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};

