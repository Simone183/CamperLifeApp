/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CommunityMessage } from '../types';
import { MessageSquare, Heart, Send, AlertOctagon, Share2, PlusCircle, HelpCircle, User } from 'lucide-react';

interface CommunityTabProps {
  messages: CommunityMessage[];
  onChange: (messages: CommunityMessage[]) => void;
}

export default function CommunityTab({ messages, onChange }: CommunityTabProps) {
  const [selectedTag, setSelectedTag] = React.useState<CommunityMessage['tag'] | 'Tutti'>('Tutti');
  const [postText, setPostText] = React.useState('');
  const [postTag, setPostTag] = React.useState<CommunityMessage['tag']>('Generale');
  const [replyTexts, setReplyTexts] = React.useState<{ [key: string]: string }>({});

  const currentUser = 'Tu (Camperista)';
  const currentUserAvatar = 'TU';
  const currentUserColor = 'bg-[#5A6B4E]';

  const tags: Array<CommunityMessage['tag']> = ['Generale', 'Meteo', 'SOS', 'Sosta', 'Incontro'];

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim()) return;

    const newMsg: CommunityMessage = {
      id: `m_${Date.now()}`,
      user: currentUser,
      avatar: currentUserAvatar,
      avatarColor: currentUserColor,
      text: postText.trim(),
      timestamp: new Date().toISOString(),
      likes: 0,
      likedByCurrentUser: false,
      tag: postTag,
      replies: [],
    };

    const updated = [newMsg, ...messages];
    onChange(updated);
    setPostText('');

    // Trigger funny simulation to respond!
    if (postTag === 'SOS') {
      setTimeout(() => {
        simulateReply(newMsg.id, "SOS_RESP");
      }, 3500);
    } else {
      setTimeout(() => {
        simulateReply(newMsg.id, "GEN_RESP");
      }, 5000);
    }
  };

  const simulateReply = (msgId: string, type: 'SOS_RESP' | 'GEN_RESP') => {
    const responses = {
      SOS_RESP: [
        { user: 'BeppeVan', text: 'Sono a circa 15 km da voi! Se vi serve una mano posso raggiungervi con qualche attrezzo pesante. Fatemi sapere se avete sbloccato!' },
        { user: 'Simo_FamilyOnRoad', text: 'Forza ragazzi! Teneteci aggiornati, noi camperisti ci aiutiamo sempre.' }
      ],
      GEN_RESP: [
        { user: 'Elena_Camper91', text: 'Grande consiglio! Segnato per il mio prossimo itinerario di luglio 🚐💨' },
        { user: 'Pietro&Anto', text: 'Grazie della condivisione, ottima info!' }
      ]
    };

    const lines = responses[type];
    const picked = lines[Math.floor(Math.random() * lines.length)];

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

  const handleCreateReply = (msgId: string) => {
    const text = replyTexts[msgId];
    if (!text || !text.trim()) return;

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
                user: currentUser,
                text: text.trim(),
                timestamp: new Date().toISOString()
              }
            ]
          };
        }
        return m;
      })
    );

    setReplyTexts(prev => ({ ...prev, [msgId]: '' }));
  };

  const getTagStyle = (tag: CommunityMessage['tag']) => {
    switch (tag) {
      case 'SOS': return 'bg-[#A45C40] text-white animate-pulse';
      case 'Meteo': return 'bg-[#5A6B4E] text-white';
      case 'Sosta': return 'bg-[#3E4A35] text-white';
      case 'Incontro': return 'bg-[#5A6B4E] text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (selectedTag === 'Tutti') return true;
    return m.tag === selectedTag;
  });

  return (
    <div className="space-y-6">
      {/* SOS Signal quick action box */}
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-4 items-start">
          <div className="p-3 bg-red-500 dark:bg-red-600 text-white rounded-2xl animate-bounce">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-red-900 dark:text-red-300 text-base">Hai bisogno di soccorso immediato?</h3>
            <p className="text-red-700 dark:text-red-200/90 text-xs mt-1 max-w-xl">
              Pubblica un segnale di <strong className="dark:text-red-100">SOS Community</strong>. Tutti i camperisti attivi nelle vicinanze riceveranno una notifica ad alta visibilità per prestarti assistenza rapida o strumenti d'officina.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setPostTag('SOS');
            setPostText('⚠️ Richiesta SOS di emergenza nel raggio di 20km: ');
            const el = document.getElementById('community-post-box');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="w-full sm:w-auto px-5 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          Lancia SOS Community
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Thread and Tag filters */}
        <div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Filtra per Categoria</h3>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setSelectedTag('Tutti')}
                className={`text-left px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex justify-between items-center ${
                  selectedTag === 'Tutti' ? 'bg-[#5A6B4E]/10 dark:bg-[#5A6B4E]/20 text-[#3E4A35] dark:text-[#A3B896]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <span>🌐 Tutti i canali</span>
                <span className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-500 dark:text-slate-400">
                  {messages.length}
                </span>
              </button>

              {tags.map((tag) => {
                const count = messages.filter((m) => m.tag === tag).length;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`text-left px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex justify-between items-center ${
                      selectedTag === tag ? 'bg-[#5A6B4E]/10 dark:bg-[#5A6B4E]/20 text-[#3E4A35] dark:text-[#A3B896]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        tag === 'SOS' ? 'bg-[#A45C40]' : tag === 'Meteo' ? 'bg-[#5A6B4E]' : tag === 'Sosta' ? 'bg-[#3E4A35]' : tag === 'Incontro' ? 'bg-[#5A6B4E]' : 'bg-slate-400'
                      }`} />
                      {tag}
                    </span>
                    <span className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-500 dark:text-slate-400">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="p-4 bg-slate-50/70 dark:bg-slate-700/50 rounded-xl space-y-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Statistiche Community</span>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Camperisti online:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">142</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">SOS attivi in Italia:</span>
                <span className="font-bold text-red-600 dark:text-red-400">1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messaging Board Feed */}
        <div id="community-post-box" className="lg:col-span-2 space-y-4">
          {/* Create Post Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-3">Scrivi un Post per la Community</h3>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="Condividi aggiornamenti sul traffico, meteo, condizioni stradali o consiglia un'area sosta deliziosa..."
                rows={3}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:border-[#3E4A35] dark:focus:border-[#A3B896] focus:ring-4 focus:ring-[#3E4A35]/10 dark:focus:ring-[#A3B896]/10 transition-all text-sm text-slate-800 dark:text-slate-200 leading-relaxed placeholder-slate-400 dark:placeholder-slate-500"
              />

              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Canale:</span>
                  <div className="flex gap-1 overflow-x-auto py-1">
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setPostTag(tag)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          postTag === tag
                            ? 'bg-[#3E4A35] text-white dark:bg-[#A3B896] dark:text-slate-900'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#3E4A35] hover:bg-[#5A6B4E] active:bg-[#3E4A35] text-white font-bold rounded-xl transition-all shadow-md cursor-pointer text-xs flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Invia Post
                </button>
              </div>
            </form>
          </div>

          {/* Messages Lists */}
          <div className="space-y-4">
            {filteredMessages.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-2xl p-8 text-center text-slate-400 dark:text-slate-500">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Nessun messaggio in questa bacheca.</p>
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-2xl border p-5 space-y-4 shadow-sm transition-all ${
                    msg.tag === 'SOS'
                      ? 'border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 ring-2 ring-red-100/50 dark:ring-red-900/20'
                      : 'border-slate-200 bg-white dark:bg-slate-800/80 hover:border-slate-300 hover:shadow-md dark:hover:bg-slate-800 dark:border-slate-700'
                  }`}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${msg.avatarColor}`}>
                        {msg.avatar}
                      </div>
                      <div>
                        <div className={`font-bold ${msg.tag === 'SOS' ? 'text-red-950 dark:text-red-200' : 'text-black dark:text-slate-200'} text-sm`}>{msg.user}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {new Date(msg.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} • Oggi
                        </div>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getTagStyle(msg.tag)}`}>
                      {msg.tag}
                    </span>
                  </div>

                  {/* Body Text */}
                  <p className={`text-sm ${msg.tag === 'SOS' ? 'text-red-950 dark:text-red-200' : 'text-black dark:text-slate-200'} leading-relaxed whitespace-pre-wrap font-medium`}>
                    {msg.text}
                  </p>

                  {/* Likes and Reply trigger */}
                  <div className="flex gap-4 items-center text-slate-500 dark:text-slate-400 text-xs border-y border-slate-100 dark:border-slate-700 py-2.5">
                    <button
                      onClick={() => handleLike(msg.id)}
                      className={`flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
                        msg.likedByCurrentUser ? 'text-red-500' : 'hover:text-red-500 dark:hover:text-red-400'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${msg.likedByCurrentUser ? 'fill-current' : ''}`} />
                      <span>{msg.likes}</span>
                    </button>
                    <div className="flex items-center gap-1 font-semibold">
                      <MessageSquare className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <span>{msg.replies?.length || 0} risposte</span>
                    </div>
                  </div>

                  {/* Thread Replies */}
                  {msg.replies && msg.replies.length > 0 && (
                    <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-600 space-y-3.5 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                      {msg.replies.map((reply) => (
                        <div key={reply.id} className="text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className={`font-bold text-xs flex items-center gap-1 ${msg.tag === 'SOS' ? 'text-red-950 dark:text-red-200' : 'text-black dark:text-slate-300'}`}>
                              <User className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                              {reply.user}
                            </span>
                            <span className="text-[9px] text-slate-500 dark:text-slate-400">
                              {new Date(reply.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className={`leading-relaxed ${msg.tag === 'SOS' ? 'text-red-900 dark:text-red-200' : 'text-black dark:text-slate-300'}`}>{reply.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Reply Inline */}
                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Scrivi una risposta d'aiuto..."
                      value={replyTexts[msg.id] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReplyTexts(prev => ({ ...prev, [msg.id]: val }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateReply(msg.id);
                      }}
                      className="flex-1 px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 outline-none focus:border-[#3E4A35] dark:focus:border-[#A3B896] rounded-xl bg-white/80 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                    />
                    <button
                      onClick={() => handleCreateReply(msg.id)}
                      className="p-2.5 bg-[#3E4A35] hover:bg-[#5A6B4E] active:bg-[#3E4A35] dark:bg-slate-600 dark:hover:bg-slate-500 text-white rounded-xl transition-all cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
