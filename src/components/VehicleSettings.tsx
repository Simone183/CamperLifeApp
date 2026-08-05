/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAppSettings } from '../useAppSettings';
import { convertDimensionToDisplay, convertWeightTonnesToDisplay, getWeightUnitTonnes, getDimensionUnit, parseDimToNumber } from '../unit-helpers';
import { VehicleDimensions, CamperGalleryPhoto, CamperMembership } from '../types';
import ProfilePhotoCropper from './ProfilePhotoCropper';
import {
  Truck,
  Check,
  AlertTriangle,
  Camera,
  Upload,
  Image as ImageIcon,
  Trash2,
  Plus,
  FileText,
  Wrench,
  Zap,
  Droplets,
  Flame,
  Sun,
  Battery,
  Shield,
  Tag,
  Printer,
  Maximize2,
  X,
  Info,
  Disc,
  Sparkles,
  Gauge,
  Fuel,
  Users,
  Bed,
  Compass,
  Share2,
  Calendar,
  ArrowRight,
  Clock,
  CheckSquare,
  CreditCard,
  QrCode,
  ExternalLink,
  Award,
  Copy,
  Link2,
  ShieldCheck,
  Scan,
  Edit3
} from 'lucide-react';

interface VehicleSettingsProps {
  dimensions: VehicleDimensions;
  onChange: (dims: VehicleDimensions) => void;
  onNavigateToDeadlines?: () => void;
}

// Preset list of camper accessories
const PRESET_ACCESSORIES = [
  'Climatizzatore Cabina',
  'Climatizzatore Cellula',
  'Tendalino',
  'Portabici',
  'Pannello Solare',
  'Inverter Onda Pura',
  'Sospensioni ad Aria',
  'Antifurto / Tracker GPS',
  'Retrocamera',
  'Gradino Elettrico',
  'Piedini di Stazionamento',
  'Parabola Satellite / TV',
  'Attacco Esterno Gas',
  'Doccetta Esterna',
  'Truma DuoControl / MonoControl',
  'Batteria al Litio LiFePO4',
  'Moquette Sagomata',
  'Oscuranti Plissettati Cabina'
];

export default function VehicleSettings({ dimensions, onChange, onNavigateToDeadlines }: VehicleSettingsProps) {
  const settings = useAppSettings();
  const [localDims, setLocalDims] = useState<VehicleDimensions>(dimensions);
  const [activeSubTab, setActiveSubTab] = useState<'anagrafica' | 'misure' | 'meccanica' | 'impianti' | 'tessere' | 'galleria' | 'accessori'>('anagrafica');
  const [successMsg, setSuccessMsg] = useState<boolean>(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [showPassportModal, setShowPassportModal] = useState<boolean>(false);

  // Membership Card States & Modals
  const [showCardModal, setShowCardModal] = useState<boolean>(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardClubName, setCardClubName] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardHolder, setCardHolder] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardWebUrl, setCardWebUrl] = useState<string>('');
  const [cardNotes, setCardNotes] = useState<string>('');
  const [cardQrUrl, setCardQrUrl] = useState<string>('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const [fullscreenQr, setFullscreenQr] = useState<{
    clubName: string;
    qrUrl?: string;
    cardNumber?: string;
    holderName?: string;
  } | null>(null);

  const qrFileRef = useRef<HTMLInputElement>(null);

  // New photo upload modal/state
  const [newPhotoCategory, setNewPhotoCategory] = useState<'Esterno' | 'Interno' | 'Libretto' | 'Impianti' | 'Altro'>('Interno');
  const [newPhotoTitle, setNewPhotoTitle] = useState<string>('');
  const [newPhotoUrlInput, setNewPhotoUrlInput] = useState<string>('');
  const [customAccessoryInput, setCustomAccessoryInput] = useState<string>('');

  const mainPhotoFileRef = useRef<HTMLInputElement>(null);
  const galleryPhotoFileRef = useRef<HTMLInputElement>(null);

  const [pendingMainPhotoSrc, setPendingMainPhotoSrc] = useState<string | null>(null);
  const [showMainPhotoCropper, setShowMainPhotoCropper] = useState<boolean>(false);

  useEffect(() => {
    setLocalDims(dimensions);
  }, [dimensions]);

  const updateField = <K extends keyof VehicleDimensions>(field: K, value: VehicleDimensions[K]) => {
    setLocalDims((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onChange(localDims);
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
    }, 3000);
  };

  // Membership Cards Helpers
  const openNewCardModal = (presetClub?: string) => {
    setEditingCardId(null);
    setCardClubName(presetClub || '');
    setCardNumber('');
    setCardHolder(localDims.modelName ? 'Socio Camper' : '');
    setCardExpiry('');
    setCardWebUrl(
      presetClub === 'Agricamper Italia' ? 'https://www.agricamper-italia.com' :
      presetClub === 'ACSI CampingCard' ? 'https://www.campingcard.it' :
      presetClub === 'PleinAir Club' ? 'https://www.pleinairclub.it' :
      presetClub === 'CamperLife Club' ? 'https://www.camperlife.it' :
      presetClub === 'CCI International' ? 'https://www.ficc.org' : ''
    );
    setCardNotes(
      presetClub === 'Agricamper Italia' ? 'Sosta gratuita 24h presso fattorie, aziende agricole e cantine vinicole.' :
      presetClub === 'ACSI CampingCard' ? 'Sconti tariffe fisse scontate nei campeggi in bassa stagione.' :
      presetClub === 'PleinAir Club' ? 'Sconti su traghetti, sosta camper, assicurazioni e musei.' : ''
    );
    setCardQrUrl('');
    setShowCardModal(true);
  };

  const openEditCardModal = (card: CamperMembership) => {
    setEditingCardId(card.id);
    setCardClubName(card.clubName || '');
    setCardNumber(card.cardNumber || '');
    setCardHolder(card.holderName || '');
    setCardExpiry(card.expiryDate || '');
    setCardWebUrl(card.websiteUrl || '');
    setCardNotes(card.notes || '');
    setCardQrUrl(card.qrOrBarCodeUrl || '');
    setShowCardModal(true);
  };

  const handleSaveCard = () => {
    if (!cardClubName.trim()) return;

    let finalQrUrl = cardQrUrl;
    if (!finalQrUrl && cardNumber.trim()) {
      finalQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(cardNumber.trim() + '-' + cardClubName.trim())}`;
    }

    const newCard: CamperMembership = {
      id: editingCardId || 'card_' + Date.now(),
      clubName: cardClubName.trim(),
      cardNumber: cardNumber.trim(),
      holderName: cardHolder.trim(),
      expiryDate: cardExpiry.trim(),
      websiteUrl: cardWebUrl.trim(),
      notes: cardNotes.trim(),
      qrOrBarCodeUrl: finalQrUrl
    };

    const existingCards = localDims.memberships || [];
    let updated: CamperMembership[];
    if (editingCardId) {
      updated = existingCards.map(c => c.id === editingCardId ? newCard : c);
    } else {
      updated = [newCard, ...existingCards];
    }

    updateField('memberships', updated);
    setShowCardModal(false);
  };

  const handleDeleteCard = (cardId: string) => {
    const existingCards = localDims.memberships || [];
    updateField('memberships', existingCards.filter(c => c.id !== cardId));
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 800, 0.85);
      setCardQrUrl(compressed);
    } catch (err) {
      console.error('Error uploading QR code image:', err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Compress image to JPEG base64 to store easily in LocalStorage/Firestore
  const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleMainPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPendingMainPhotoSrc(event.target.result as string);
        setShowMainPhotoCropper(true);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value so user can upload the same image again if they want
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleAddGalleryPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1200, 0.82);
      const newPhoto: CamperGalleryPhoto = {
        id: 'photo_' + Date.now(),
        url: compressed,
        title: newPhotoTitle.trim() || file.name.replace(/\.[^/.]+$/, ''),
        category: newPhotoCategory,
        dateAdded: new Date().toLocaleDateString('it-IT')
      };
      const existing = localDims.galleryPhotos || [];
      updateField('galleryPhotos', [newPhoto, ...existing]);
      setNewPhotoTitle('');
      if (galleryPhotoFileRef.current) galleryPhotoFileRef.current.value = '';
    } catch (err) {
      console.error('Error uploading gallery photo:', err);
    }
  };

  const handleAddGalleryPhotoUrl = () => {
    if (!newPhotoUrlInput.trim()) return;
    const newPhoto: CamperGalleryPhoto = {
      id: 'photo_' + Date.now(),
      url: newPhotoUrlInput.trim(),
      title: newPhotoTitle.trim() || 'Foto Camper',
      category: newPhotoCategory,
      dateAdded: new Date().toLocaleDateString('it-IT')
    };
    const existing = localDims.galleryPhotos || [];
    updateField('galleryPhotos', [newPhoto, ...existing]);
    setNewPhotoUrlInput('');
    setNewPhotoTitle('');
  };

  const handleRemoveGalleryPhoto = (photoId: string) => {
    const existing = localDims.galleryPhotos || [];
    updateField('galleryPhotos', existing.filter(p => p.id !== photoId));
  };

  const toggleAccessory = (accName: string) => {
    const currentList = localDims.accessories || [];
    if (currentList.includes(accName)) {
      updateField('accessories', currentList.filter(a => a !== accName));
    } else {
      updateField('accessories', [...currentList, accName]);
    }
  };

  const handleAddCustomAccessory = () => {
    if (!customAccessoryInput.trim()) return;
    const currentList = localDims.accessories || [];
    if (!currentList.includes(customAccessoryInput.trim())) {
      updateField('accessories', [...currentList, customAccessoryInput.trim()]);
    }
    setCustomAccessoryInput('');
  };

  // Safety checks
  const isTooTall = parseDimToNumber(localDims.height) >= 3.0;
  const isHeavy = parseDimToNumber(localDims.weight) > 3.5;
  const isVeryLong = parseDimToNumber(localDims.length) >= 7.0;

  return (
    <div id="vehicle-settings" className="space-y-6">
      {/* --- HERO CAMPER CARD HEADER --- */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-[#2A3324] rounded-3xl p-6 text-white shadow-xl border border-slate-700/60">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-[#5A6B4E]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          {/* Cover Photo / Avatar */}
          <div className="relative group shrink-0">
            <div className="w-32 h-32 md:w-36 md:h-36 rounded-2xl overflow-hidden bg-slate-800 border-2 border-white/20 shadow-xl flex items-center justify-center relative">
              {localDims.mainPhotoUrl ? (
                <img
                  src={localDims.mainPhotoUrl}
                  alt={localDims.modelName || 'Camper'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="flex flex-col items-center text-slate-400 gap-1 p-4 text-center">
                  <Truck className="w-10 h-10 text-slate-500" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">Aggiungi Foto</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => mainPhotoFileRef.current?.click()}
              className="absolute -bottom-2 -right-2 p-2.5 bg-[#5A6B4E] hover:bg-[#6c805d] active:scale-95 text-white rounded-xl shadow-lg border border-white/20 transition-all cursor-pointer flex items-center justify-center"
              title="Cambia Foto Copertina"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              type="file"
              ref={mainPhotoFileRef}
              onChange={handleMainPhotoUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Title & Key Badge Info */}
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="px-2.5 py-1 bg-[#5A6B4E]/40 border border-[#5A6B4E]/60 text-emerald-300 text-[11px] font-black uppercase tracking-wider rounded-lg">
                {localDims.vehicleType || 'Camper'}
              </span>
              {localDims.brand && (
                <span className="px-2.5 py-1 bg-white/10 text-slate-200 text-[11px] font-bold uppercase tracking-wider rounded-lg border border-white/10">
                  {localDims.brand}
                </span>
              )}
              {localDims.licensePlate && (
                <span className="px-2 py-0.5 bg-yellow-400 text-slate-950 font-mono font-black text-xs rounded border border-yellow-500 shadow-sm uppercase tracking-widest">
                  {localDims.licensePlate}
                </span>
              )}
              {localDims.euroCategory && (
                <span className="px-2.5 py-1 bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[10px] font-extrabold uppercase rounded-lg">
                  {localDims.euroCategory}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              {localDims.modelName || 'Il Mio Camper'}
            </h1>

            <p className="text-xs text-slate-300 font-medium max-w-xl leading-relaxed">
              {localDims.chassisBrand ? `${localDims.chassisBrand} · ` : ''}
              {localDims.displacementHpKw ? `${localDims.displacementHpKw} · ` : ''}
              {localDims.registrationYear ? `Anno ${localDims.registrationYear}` : 'Scheda Informativa e Sagoma per Navigatore'}
            </p>

            {/* Quick Metrics Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs font-mono font-semibold text-slate-200">
              <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5">
                <span className="text-slate-400 text-[10px] font-sans">Alt:</span>
                <span className="text-amber-300 font-extrabold">{localDims.height ?? '-'} {getDimensionUnit(settings)}</span>
              </div>
              <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5">
                <span className="text-slate-400 text-[10px] font-sans">Lun:</span>
                <span className="text-emerald-300 font-extrabold">{localDims.length ?? '-'} {getDimensionUnit(settings)}</span>
              </div>
              <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5">
                <span className="text-slate-400 text-[10px] font-sans">Lar:</span>
                <span>{localDims.width ?? '-'} {getDimensionUnit(settings)}</span>
              </div>
              <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5">
                <span className="text-slate-400 text-[10px] font-sans">Peso:</span>
                <span>{localDims.weight ?? '-'} {getWeightUnitTonnes(settings)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Scadenze, Passport & Save */}
          <div className="shrink-0 flex flex-col gap-2 w-full md:w-auto">
            {onNavigateToDeadlines && (
              <button
                type="button"
                onClick={onNavigateToDeadlines}
                className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/35 active:scale-95 text-amber-200 text-xs font-extrabold rounded-xl border border-amber-400/40 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm group"
                title="Apri lo Scadenziere per vedere revisioni, tagliandi, manutenzioni e lavori fatti o da fare"
              >
                <Calendar className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>Scadenze & Manutenzioni</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowPassportModal(true)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-extrabold rounded-xl border border-white/20 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Carta d'Identità Camper</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit()}
              className="px-4 py-2.5 bg-[#5A6B4E] hover:bg-[#6c805d] active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Salva Modifiche</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- SUB-TAB NAVIGATION BAR (STACKED VERTICALLY FOR MOBILE FIT) --- */}
      <div className="w-full pb-2 border-b border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 w-full">
          {[
            { id: 'anagrafica', label: 'Anagrafica', icon: FileText },
            { id: 'misure', label: 'Misure & Sagoma', icon: Truck },
            { id: 'meccanica', label: 'Meccanica & Gomme', icon: Gauge },
            { id: 'impianti', label: 'Impianti & Serbatoi', icon: Zap },
            { id: 'tessere', label: 'Tessere & Club', icon: CreditCard },
            { id: 'galleria', label: 'Galleria Foto', icon: ImageIcon },
            { id: 'accessori', label: 'Accessori & Note', icon: Wrench },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`w-full px-4 py-3 text-xs font-black rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 text-left shadow-xs ${
                  isActive
                    ? 'bg-[#283321] text-amber-300 border-2 border-amber-400 shadow-md'
                    : 'bg-slate-700 hover:bg-slate-800 text-white border border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-300' : 'text-slate-300'}`} />
                  <span className="truncate">{tab.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {tab.id === 'galleria' && localDims.galleryPhotos?.length ? (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-600 text-slate-200'}`}>
                      {localDims.galleryPhotos.length}
                    </span>
                  ) : null}
                  {tab.id === 'tessere' && localDims.memberships?.length ? (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-300 text-amber-950'}`}>
                      {localDims.memberships.length}
                    </span>
                  ) : null}
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-amber-400 shadow-2xs" />
                  )}
                </div>
              </button>
            );
          })}

          {onNavigateToDeadlines && (
            <button
              type="button"
              onClick={onNavigateToDeadlines}
              className="w-full px-4 py-3 text-xs font-black rounded-2xl bg-amber-700 hover:bg-amber-800 text-white border border-amber-600 transition-all cursor-pointer flex items-center justify-between gap-3 text-left shadow-xs active:scale-98"
              title="Vai alla scheda dello Scadenziere per registrare o controllare manutenzioni e scadenze"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Calendar className="w-4 h-4 text-amber-200 shrink-0" />
                <span className="truncate">Scadenziere & Lavori</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-amber-200 shrink-0 opacity-90" />
            </button>
          )}
        </div>
      </div>

      {/* --- CONTENT FORM --- */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-6">

        {/* TAB 1: ANAGRAFICA */}
        {activeSubTab === 'anagrafica' && (
          <div className="space-y-6 animate-fade-in">
            {/* Quick Link Banner to Scadenziere & Manutenzioni */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50/80 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-amber-950 text-xs sm:text-sm tracking-tight flex items-center gap-2">
                    <span>Scadenziere, Tagliandi & Manutenzioni Camper</span>
                  </h4>
                  <p className="text-[11px] text-amber-900/80 mt-0.5 leading-snug">
                    Controlla e gestisci scadenze legali (revisione, bollo, assicurazione), tagliandi, garanzie infiltrazioni e il registro dei lavori fatti o da fare.
                  </p>
                </div>
              </div>
              {onNavigateToDeadlines && (
                <button
                  type="button"
                  onClick={onNavigateToDeadlines}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 self-end sm:self-auto"
                >
                  <span>Apri Scadenziere & Lavori</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Dati Identificativi & Anagrafica Veicolo</h3>
                <p className="text-xs text-slate-500">Informazioni generali del tuo camper o caravan.</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                Identificazione
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Model Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nome Completo / Modello Camper
                </label>
                <input
                  type="text"
                  value={localDims.modelName || ''}
                  onChange={(e) => updateField('modelName', e.target.value)}
                  placeholder="Es: Sunlight T67, McLouis Glamys 22, Hymer B-Klasse 544"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] focus:ring-4 focus:ring-[#3E4A35]/15 transition-all text-slate-800 font-semibold text-sm"
                />
              </div>

              {/* Brand */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Marca Allestitore / Costruttore
                </label>
                <input
                  type="text"
                  value={localDims.brand || ''}
                  onChange={(e) => updateField('brand', e.target.value)}
                  placeholder="Es: Sunlight, McLouis, Hymer, Roller Team, Knaus, Mobilvetta"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-medium text-xs"
                />
              </div>

              {/* Tipologia Camper */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tipologia Mezzo
                </label>
                <select
                  value={localDims.vehicleType || 'Semintegrale'}
                  onChange={(e) => updateField('vehicleType', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-medium text-xs bg-white"
                >
                  <option value="Semintegrale">Semintegrale (Profilato)</option>
                  <option value="Mansardato">Mansardato</option>
                  <option value="Motorhome">Motorhome (Integrale)</option>
                  <option value="Van">Pure Van / Camperpuro (Furgonato)</option>
                  <option value="Caravan">Caravan / Roulotte</option>
                  <option value="Camper Cavo">Camper Monococca</option>
                  <option value="Pickup">Pickup con Cellula Scarrabile</option>
                </select>
              </div>

              {/* License Plate */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Targa Veicolo
                </label>
                <input
                  type="text"
                  value={localDims.licensePlate || ''}
                  onChange={(e) => updateField('licensePlate', e.target.value.toUpperCase())}
                  placeholder="Es: AB 123 CD"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-mono font-bold text-xs uppercase"
                />
              </div>

              {/* Registration Year */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Anno Immatricolazione
                </label>
                <input
                  type="text"
                  value={localDims.registrationYear || ''}
                  onChange={(e) => updateField('registrationYear', e.target.value)}
                  placeholder="Es: 2021"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-medium text-xs"
                />
              </div>

              {/* VIN / Telaio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Numero di Telaio (VIN)
                </label>
                <input
                  type="text"
                  value={localDims.vinNumber || ''}
                  onChange={(e) => updateField('vinNumber', e.target.value.toUpperCase())}
                  placeholder="Es: ZFA25000001234567"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-mono text-xs uppercase"
                />
              </div>

              {/* Homologated Seats */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Posti Omologati Viaggio
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={localDims.seatsHomologated ?? ''}
                    onChange={(e) => updateField('seatsHomologated', e.target.value)}
                    placeholder="Es: 4"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-bold text-xs"
                  />
                  <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Beds */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Posti Letto
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={localDims.bedsCount ?? ''}
                    onChange={(e) => updateField('bedsCount', e.target.value)}
                    placeholder="Es: 4"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-bold text-xs"
                  />
                  <Bed className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MISURE & SAGOMA */}
        {activeSubTab === 'misure' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Misure & Sagoma per Navigatore Smart</h3>
                <p className="text-xs text-slate-500">I dati fisici usati dall'algoritmo per evitare ponti bassi e limiti di peso.</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg">
                Sicurezza Stradale
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Height */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Altezza Massima ({getDimensionUnit(settings) === 'ft' ? 'piedi' : 'metri'})
                </label>
                <p className="text-[11px] text-slate-500 mb-1.5">Misurata dal suolo compresi oblò, antenna TV o pannelli</p>
                <div className="relative">
                  <input
                    type="text"
                    value={localDims.height ?? ''}
                    onChange={(e) => updateField('height', e.target.value)}
                    className={`w-full pl-4 pr-12 py-3 rounded-xl border outline-none text-slate-800 font-bold font-mono focus:ring-4 focus:ring-[#3E4A35]/15 transition-all ${
                      isTooTall ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200 focus:border-[#3E4A35]'
                    }`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                    {getDimensionUnit(settings)}
                  </span>
                </div>
              </div>

              {/* Length */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Lunghezza Totale ({getDimensionUnit(settings) === 'ft' ? 'piedi' : 'metri'})
                </label>
                <p className="text-[11px] text-slate-500 mb-1.5">Compreso eventuale portabici o portamoto posteriore aperto</p>
                <div className="relative">
                  <input
                    type="text"
                    value={localDims.length ?? ''}
                    onChange={(e) => updateField('length', e.target.value)}
                    className={`w-full pl-4 pr-12 py-3 rounded-xl border outline-none text-slate-800 font-bold font-mono focus:ring-4 focus:ring-[#3E4A35]/15 transition-all ${
                      isVeryLong ? 'border-amber-300' : 'border-slate-200 focus:border-[#3E4A35]'
                    }`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                    {getDimensionUnit(settings)}
                  </span>
                </div>
              </div>

              {/* Width */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Larghezza ({getDimensionUnit(settings) === 'ft' ? 'piedi' : 'metri'})
                </label>
                <p className="text-[11px] text-slate-500 mb-1.5">Inclusi specchietti retrovisori chiusi</p>
                <div className="relative">
                  <input
                    type="text"
                    value={localDims.width ?? ''}
                    onChange={(e) => updateField('width', e.target.value)}
                    className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-bold font-mono"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                    {getDimensionUnit(settings)}
                  </span>
                </div>
              </div>

              {/* Weight */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Massa Effettiva in Ordine di Marcia ({getWeightUnitTonnes(settings) === 'lbs' ? 'libbre' : 'tonnellate'})
                </label>
                <p className="text-[11px] text-slate-500 mb-1.5">Con passeggeri, serbatoi e bagaglio</p>
                <div className="relative">
                  <input
                    type="text"
                    value={localDims.weight ?? ''}
                    onChange={(e) => updateField('weight', e.target.value)}
                    className={`w-full pl-4 pr-12 py-3 rounded-xl border outline-none text-slate-800 font-bold font-mono focus:ring-4 focus:ring-[#3E4A35]/15 transition-all ${
                      isHeavy ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200 focus:border-[#3E4A35]'
                    }`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                    t
                  </span>
                </div>
              </div>

              {/* Gross Weight Rating / PTT */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Massa Max Omologata a Libretto (PTT in t)
                </label>
                <input
                  type="text"
                  value={localDims.grossWeightRating ?? ''}
                  onChange={(e) => updateField('grossWeightRating', e.target.value)}
                  placeholder="Es: 3.5 (per patente B) o 4.25"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-mono text-xs"
                />
              </div>
            </div>

            {/* Informative Alerts dynamic */}
            {(isTooTall || isHeavy || isVeryLong) && (
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex gap-2 text-amber-900 font-bold text-xs items-center">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Avvertenza di Navigazione Sagomata</span>
                </div>
                <ul className="list-disc pl-5 text-[11px] text-amber-800 space-y-1 leading-relaxed">
                  {isTooTall && (
                    <li>
                      <strong>Altezza ({parseFloat(convertDimensionToDisplay(parseDimToNumber(localDims.height), settings).toFixed(2))}{getDimensionUnit(settings)}) ≥ {parseFloat(convertDimensionToDisplay(3.0, settings).toFixed(2))} {getDimensionUnit(settings)}:</strong> Attenzione ai sottopassi ferroviari d'epoca e ai rami bassi in campeggio.
                    </li>
                  )}
                  {isHeavy && (
                    <li>
                      <strong>Peso ({parseFloat(convertWeightTonnesToDisplay(parseDimToNumber(localDims.weight), settings).toFixed(2))}{getWeightUnitTonnes(settings)}) &gt; {parseFloat(convertWeightTonnesToDisplay(3.5, settings).toFixed(2))} {getWeightUnitTonnes(settings)}:</strong> Richiede Patente C o C1. Verificare restrizioni sui ponti secondari.
                    </li>
                  )}
                  {isVeryLong && (
                    <li>
                      <strong>Lunghezza ({parseFloat(convertDimensionToDisplay(parseDimToNumber(localDims.length), settings).toFixed(2))}{getDimensionUnit(settings)}) ≥ {parseFloat(convertDimensionToDisplay(7.0, settings).toFixed(2))} {getDimensionUnit(settings)}:</strong> Prestare attenzione nei tornanti montani alpini e nell'angolo di sbalzo posteriore.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MECCANICA & PNEUMATICI */}
        {activeSubTab === 'meccanica' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Meccanica, Motore & Pneumatici</h3>
                <p className="text-xs text-slate-500">Specifiche di motore, telaio, classe ambientale e gomme.</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                Motore & Telaio
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Chassis / Engine Brand */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Marca Telaio / Meccanica
                </label>
                <input
                  type="text"
                  value={localDims.chassisBrand || ''}
                  onChange={(e) => updateField('chassisBrand', e.target.value)}
                  placeholder="Es: Fiat Ducato, Ford Transit, Mercedes Sprinter, IVECO"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-medium text-xs"
                />
              </div>

              {/* Displacement / Power */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Cilindrata & Potenza (CV / kW)
                </label>
                <input
                  type="text"
                  value={localDims.displacementHpKw || ''}
                  onChange={(e) => updateField('displacementHpKw', e.target.value)}
                  placeholder="Es: 2.2 Multijet - 140 CV (103 kW)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-medium text-xs"
                />
              </div>

              {/* Fuel Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Alimentazione Motore
                </label>
                <select
                  value={localDims.engineType || 'Diesel'}
                  onChange={(e) => updateField('engineType', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-medium text-xs bg-white"
                >
                  <option value="Diesel">Diesel / Gasolio</option>
                  <option value="Benzina">Benzina</option>
                  <option value="Ibrido">Ibrido / Plug-In</option>
                  <option value="Elettrico">Elettrico 100%</option>
                  <option value="GPL/Metano">GPL / Metano</option>
                </select>
              </div>

              {/* Euro Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Categoria Euro / Emissioni
                </label>
                <select
                  value={localDims.euroCategory || 'Euro 6d-Final'}
                  onChange={(e) => updateField('euroCategory', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-medium text-xs bg-white"
                >
                  <option value="Euro 6d-Final">Euro 6d-Final / 6e</option>
                  <option value="Euro 6d-Temp">Euro 6d-Temp</option>
                  <option value="Euro 6">Euro 6 (b/c)</option>
                  <option value="Euro 5">Euro 5</option>
                  <option value="Euro 4">Euro 4</option>
                  <option value="Euro 3">Euro 3</option>
                  <option value="Euro 2">Euro 2</option>
                  <option value="Euro 1">Euro 1</option>
                </select>
              </div>

              {/* Traction */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Trazione
                </label>
                <select
                  value={localDims.tractionType || 'Anteriore'}
                  onChange={(e) => updateField('tractionType', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-medium text-xs bg-white"
                >
                  <option value="Anteriore">Trazione Anteriore</option>
                  <option value="Posteriore">Trazione Posteriore</option>
                  <option value="Integrale 4x4">Integrale / 4x4</option>
                  <option value="Gemellato">Posteriore Gemellato</option>
                </select>
              </div>

              {/* Tire Size */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Misura Pneumatici
                </label>
                <input
                  type="text"
                  value={localDims.tireSize || ''}
                  onChange={(e) => updateField('tireSize', e.target.value)}
                  placeholder="Es: 225/75 R16 CP (Camping Pneu)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-mono text-xs"
                />
              </div>

              {/* Tire Pressure Front */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pressione Anteriore (bar)
                </label>
                <input
                  type="text"
                  value={localDims.tirePressureFrontBar ?? ''}
                  onChange={(e) => updateField('tirePressureFrontBar', e.target.value)}
                  placeholder="Es: 5.0 bar"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-mono text-xs"
                />
              </div>

              {/* Tire Pressure Rear */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pressione Posteriore (bar)
                </label>
                <input
                  type="text"
                  value={localDims.tirePressureRearBar ?? ''}
                  onChange={(e) => updateField('tirePressureRearBar', e.target.value)}
                  placeholder="Es: 5.5 bar"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-mono text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: IMPIANTI & SERBATOI */}
        {activeSubTab === 'impianti' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Impianti di Bordo & Autonomia</h3>
                <p className="text-xs text-slate-500">Serbatoi acqua, energia, riscaldamento e bombole gas.</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 px-2.5 py-1 rounded-lg">
                Vivibilità & Utility
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fresh Water Tank */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-sky-500" />
                  <span>Serbatoio Acqua Chiara (Litri)</span>
                </label>
                <input
                  type="number"
                  value={localDims.freshWaterTank ?? ''}
                  onChange={(e) => updateField('freshWaterTank', e.target.value)}
                  placeholder="Es: 120"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-bold text-xs"
                />
              </div>

              {/* Grey Water Tank */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-slate-400" />
                  <span>Serbatoio Acqua Grigia (Litri)</span>
                </label>
                <input
                  type="number"
                  value={localDims.greyWaterTank ?? ''}
                  onChange={(e) => updateField('greyWaterTank', e.target.value)}
                  placeholder="Es: 90"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-bold text-xs"
                />
              </div>

              {/* Black Water Tank */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Serbatoio Acque Nere / WC
                </label>
                <input
                  type="text"
                  value={localDims.blackWaterTank || ''}
                  onChange={(e) => updateField('blackWaterTank', e.target.value)}
                  placeholder="Es: Cassetta Thetford C220 18L o Nautico 50L"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-medium text-xs"
                />
              </div>

              {/* Heating */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span>Sistema Riscaldamento</span>
                </label>
                <input
                  type="text"
                  value={localDims.heatingType || ''}
                  onChange={(e) => updateField('heatingType', e.target.value)}
                  placeholder="Es: Truma Combi 6 Gas, Webasto Diesel, Alde 3020"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-medium text-xs"
                />
              </div>

              {/* Service Battery */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Battery className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Batteria Servizi</span>
                </label>
                <input
                  type="text"
                  value={localDims.batteryCapacity || ''}
                  onChange={(e) => updateField('batteryCapacity', e.target.value)}
                  placeholder="Es: 100Ah LiFePO4 (Litio), 2x 100Ah AGM"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-medium text-xs"
                />
              </div>

              {/* Solar Panel Watts */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pannelli Solari (Watt complessivi)</span>
                </label>
                <input
                  type="number"
                  value={localDims.solarPanelWatts ?? ''}
                  onChange={(e) => updateField('solarPanelWatts', e.target.value)}
                  placeholder="Es: 200"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-bold text-xs"
                />
              </div>

              {/* Inverter Watts */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Inverter 230V (Watt)</span>
                </label>
                <input
                  type="number"
                  value={localDims.inverterWatts ?? ''}
                  onChange={(e) => updateField('inverterWatts', e.target.value)}
                  placeholder="Es: 1500"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-bold text-xs"
                />
              </div>

              {/* Gas Bottles */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Vano Gas / Bombole
                </label>
                <input
                  type="text"
                  value={localDims.gasBottlesInfo || ''}
                  onChange={(e) => updateField('gasBottlesInfo', e.target.value)}
                  placeholder="Es: 2x 10kg Vetrresina con MonoControl CS o Bombolone GPL"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 font-medium text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB: TESSERE SOCI, CONVENZIONI & CODICI QR */}
        {activeSubTab === 'tessere' && (
          <div className="space-y-6 animate-fade-in">
            {/* Subtab Header */}
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                  <span>Tessere Soci, Convenzioni & Codici QR</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conserva i tuoi codici associazione (Agricamper, ACSI, PleinAir, CCI, Camperlife) e mostra il QR code al check-in in campeggio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openNewCardModal()}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Aggiungi Tessera / Convenzione</span>
              </button>
            </div>

            {/* Quick Presets for Associations */}
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-2.5">
              <span className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider block flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>Aggiungi Rapidamente una Convenzione Tipica Camperisti:</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  'Agricamper Italia',
                  'ACSI CampingCard',
                  'PleinAir Club',
                  'CamperLife Club',
                  'CCI International',
                  'CampingKey Europe'
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => openNewCardModal(preset)}
                    className="px-3 py-1.5 bg-white hover:bg-amber-100/80 active:scale-95 text-amber-950 font-bold text-xs rounded-xl border border-amber-200/90 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3 h-3 text-amber-600" />
                    <span>{preset}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Membership Cards Grid */}
            {(!localDims.memberships || localDims.memberships.length === 0) ? (
              <div className="text-center py-12 px-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Nessuna Tessera o Convenzione Salvata</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Aggiungi le tue tessere club per avere sempre a portata di mano numeri di socio, sconti su campeggi e traghetti, e il codice QR da scannerizzare alla reception!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openNewCardModal()}
                  className="px-4 py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crea la Prima Tessera</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {localDims.memberships.map((card) => {
                  const isAgricamper = card.clubName.toLowerCase().includes('agri');
                  const isAcsi = card.clubName.toLowerCase().includes('acsi');
                  const isPleinAir = card.clubName.toLowerCase().includes('pleinair');

                  return (
                    <div
                      key={card.id}
                      className={`relative rounded-3xl border transition-all duration-300 hover:shadow-lg overflow-hidden flex flex-col justify-between ${
                        isAgricamper
                          ? 'bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white border-emerald-700/60'
                          : isAcsi
                          ? 'bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-950 text-white border-blue-700/60'
                          : isPleinAir
                          ? 'bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 text-white border-amber-700/60'
                          : 'bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 text-white border-slate-700/60'
                      }`}
                    >
                      {/* Top Bar of Digital Card */}
                      <div className="p-5 pb-3 flex items-start justify-between gap-3 border-b border-white/10">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md shadow-xs shrink-0">
                            <CreditCard className="w-5 h-5 text-amber-300" />
                          </div>
                          <div>
                            <span className="text-[10px] font-black tracking-widest text-white/70 uppercase block">
                              MEMBER CLUB CARD
                            </span>
                            <h4 className="font-black text-base text-white tracking-tight leading-tight">
                              {card.clubName}
                            </h4>
                          </div>
                        </div>

                        {card.expiryDate && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 uppercase tracking-wider shrink-0 shadow-2xs">
                            Scade: {card.expiryDate}
                          </span>
                        )}
                      </div>

                      {/* Body of Digital Card */}
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                          {/* Details Column */}
                          <div className="space-y-2">
                            {card.cardNumber && (
                              <div>
                                <span className="text-[10px] uppercase font-bold text-white/60 block">
                                  N. Tessera / Codice Socio
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-sm font-extrabold text-amber-300 tracking-wider bg-black/30 px-2.5 py-1 rounded-lg border border-white/10">
                                    {card.cardNumber}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(card.cardNumber!, card.id)}
                                    className="p-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 rounded-lg transition-all cursor-pointer"
                                    title="Copia numero di tessera"
                                  >
                                    {copiedCodeId === card.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}

                            {card.holderName && (
                              <div>
                                <span className="text-[10px] uppercase font-bold text-white/60 block">
                                  Intestatario
                                </span>
                                <span className="font-bold text-xs text-white/95 uppercase tracking-wide">
                                  {card.holderName}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* QR Code Preview Thumbnail */}
                          {card.qrOrBarCodeUrl && (
                            <div className="flex flex-col items-center justify-center p-2 bg-white rounded-2xl border border-white/20 shadow-md">
                              <img
                                src={card.qrOrBarCodeUrl}
                                alt="QR Code"
                                className="w-24 h-24 object-contain rounded-lg cursor-pointer hover:scale-105 transition-transform"
                                onClick={() =>
                                  setFullscreenQr({
                                    clubName: card.clubName,
                                    qrUrl: card.qrOrBarCodeUrl,
                                    cardNumber: card.cardNumber,
                                    holderName: card.holderName
                                  })
                                }
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setFullscreenQr({
                                    clubName: card.clubName,
                                    qrUrl: card.qrOrBarCodeUrl,
                                    cardNumber: card.cardNumber,
                                    holderName: card.holderName
                                  })
                                }
                                className="mt-1 text-[10px] font-black text-slate-800 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                              >
                                <Scan className="w-3 h-3 text-amber-600" />
                                <span>Ingrandisci QR</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Notes / Benefits */}
                        {card.notes && (
                          <div className="p-2.5 bg-black/25 rounded-xl border border-white/10 text-xs text-white/85 leading-snug font-medium">
                            <span className="font-bold text-amber-300 text-[10px] uppercase block mb-0.5">
                              Convenzioni & Benefici:
                            </span>
                            {card.notes}
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="p-3 bg-black/40 border-t border-white/10 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {card.websiteUrl && (
                            <a
                              href={card.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-extrabold text-xs rounded-xl border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
                              <span>Portale / App Web</span>
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditCardModal(card)}
                            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
                            title="Modifica Tessera"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCard(card.id)}
                            className="p-2 bg-red-500/20 hover:bg-red-500/35 text-red-200 rounded-xl transition-all cursor-pointer"
                            title="Elimina Tessera"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: GALLERIA FOTO & DOCUMENTI */}
        {activeSubTab === 'galleria' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Galleria Foto, Interni & Libretto</h3>
                <p className="text-xs text-slate-500">Salva foto degli interni, dettagli cabina, libretto circolazione e schemi impianti.</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-1 rounded-lg">
                Archivio Fotografico
              </span>
            </div>

            {/* Upload Control Box */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[180px]">
                  <input
                    type="text"
                    value={newPhotoTitle}
                    onChange={(e) => setNewPhotoTitle(e.target.value)}
                    placeholder="Titolo foto (es: Libretto di circolazione, Dinette...)"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#3E4A35]"
                  />
                </div>

                <select
                  value={newPhotoCategory}
                  onChange={(e) => setNewPhotoCategory(e.target.value as any)}
                  className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#3E4A35]"
                >
                  <option value="Interno">Interno</option>
                  <option value="Esterno">Esterno</option>
                  <option value="Libretto">Libretto / Documenti</option>
                  <option value="Impianti">Impianti / Fusibili</option>
                  <option value="Altro">Altro</option>
                </select>

                <button
                  type="button"
                  onClick={() => galleryPhotoFileRef.current?.click()}
                  className="px-4 py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] active:scale-95 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Carica Foto</span>
                </button>

                <input
                  type="file"
                  ref={galleryPhotoFileRef}
                  onChange={handleAddGalleryPhotoFile}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Or URL Input fallback */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newPhotoUrlInput}
                  onChange={(e) => setNewPhotoUrlInput(e.target.value)}
                  placeholder="Oppure inserisci URL foto..."
                  className="flex-1 px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#3E4A35]"
                />
                <button
                  type="button"
                  onClick={handleAddGalleryPhotoUrl}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Aggiungi URL
                </button>
              </div>
            </div>

            {/* Gallery Grid */}
            {localDims.galleryPhotos && localDims.galleryPhotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {localDims.galleryPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 aspect-video sm:aspect-square flex flex-col justify-end shadow-sm"
                  >
                    <img
                      src={photo.url}
                      alt={photo.title || 'Foto'}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20 opacity-90 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10 p-2.5 text-white space-y-0.5">
                      <span className="px-1.5 py-0.5 bg-white/20 backdrop-blur-xs text-[9px] font-black uppercase rounded text-slate-100">
                        {photo.category || 'Foto'}
                      </span>
                      <p className="text-xs font-bold truncate leading-tight">{photo.title || 'Foto Camper'}</p>
                    </div>

                    {/* Action buttons */}
                    <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setLightboxPhoto(photo.url)}
                        className="p-1.5 bg-black/60 hover:bg-black/90 text-white rounded-lg transition-all cursor-pointer"
                        title="Ingrandisci"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryPhoto(photo.id)}
                        className="p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-all cursor-pointer"
                        title="Elimina"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-2">
                <ImageIcon className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">Nessuna foto caricata in galleria</p>
                <p className="text-[11px] text-slate-400">Carica le foto dei tuoi viaggi, libretto o dinette.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: ACCESSORI & NOTE */}
        {activeSubTab === 'accessori' && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Equipaggiamento, Accessori & Note Libere</h3>
                <p className="text-xs text-slate-500">Seleziona le dotazioni installate sul tuo camper e annota codici utili.</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg">
                Dotazioni
              </span>
            </div>

            {/* Accessory Check Grid */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Accessori & Optionals Installati
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {PRESET_ACCESSORIES.map((accName) => {
                  const isSelected = (localDims.accessories || []).includes(accName);
                  return (
                    <button
                      key={accName}
                      type="button"
                      onClick={() => toggleAccessory(accName)}
                      className={`px-3.5 py-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#5A6B4E]/10 border-[#3E4A35] text-[#3E4A35] shadow-xs'
                          : 'bg-slate-50/60 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{accName}</span>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ml-2 ${
                          isSelected ? 'bg-[#3E4A35] border-[#3E4A35] text-white' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Accessory */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={customAccessoryInput}
                  onChange={(e) => setCustomAccessoryInput(e.target.value)}
                  placeholder="Aggiungi altro accessorio (es: Vanghette, Veranda solare...)"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-[#3E4A35]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomAccessory}
                  className="px-4 py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Aggiungi</span>
                </button>
              </div>
            </div>

            {/* Notes Field */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Note Generali & Informazioni Utili
              </label>
              <textarea
                rows={4}
                value={localDims.notes || ''}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Codici autoradio, dati tagliando, numeri chiavi, note ricambi..."
                className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:border-[#3E4A35] text-slate-800 text-xs font-medium leading-relaxed resize-y"
              />
            </div>
          </div>
        )}

        {/* --- BOTTOM SAVE BAR --- */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-6 py-3 bg-[#3E4A35] hover:bg-[#5A6B4E] active:bg-[#3E4A35] text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2 text-xs uppercase tracking-wider"
            >
              <Check className="w-4 h-4" />
              <span>Salva Profilo Camper</span>
            </button>

            {successMsg && (
              <div className="flex items-center gap-1.5 text-emerald-600 font-extrabold text-xs animate-fade-in bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                <Check className="w-4 h-4 bg-emerald-500 text-white rounded-full p-0.5" />
                <span>Scheda Salvata con successo!</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowPassportModal(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Visualizza Carta d'Identità</span>
          </button>
        </div>
      </form>

      {/* --- LIGHTBOX MODAL --- */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxPhoto}
            alt="Anteprima Foto"
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* --- CAMPER PASSPORT MODAL (Carta d'Identità Camper Stampabile) --- */}
      {showPassportModal && (
        <div
          className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in"
          onClick={() => setShowPassportModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 relative my-auto max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowPassportModal(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-all cursor-pointer z-10"
              title="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Passport Header */}
            <div className="flex items-center gap-3 sm:gap-4 border-b border-slate-200 pb-3 sm:pb-4 pr-10 shrink-0">
              <div className="p-2.5 sm:p-3 bg-[#3E4A35] text-white rounded-2xl shadow-md shrink-0">
                <Truck className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[#3E4A35] block truncate">
                  CAMPER LIFE APP · CARTA D'IDENTITÀ VEICOLO
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-800 truncate">
                  {localDims.modelName || 'Scheda Tecnico Informativa Camper'}
                </h2>
                <p className="text-xs text-slate-500 truncate">
                  {localDims.brand ? `${localDims.brand} · ` : ''}
                  {localDims.vehicleType || 'Camper'}
                  {localDims.licensePlate ? ` · Targa: ${localDims.licensePlate}` : ''}
                </p>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto pr-1 space-y-4 sm:space-y-6 flex-1 py-3 my-1">
              {/* Main Image if exists */}
              {localDims.mainPhotoUrl && (
                <div className="h-40 sm:h-52 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
                  <img src={localDims.mainPhotoUrl} alt="Camper" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Data Grid Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 text-xs">
                <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Dimensioni (A x L x P)</span>
                  <span className="font-extrabold text-slate-800 font-mono">
                    {localDims.height || '-'}m x {localDims.width || '-'}m x {localDims.length || '-'}m
                  </span>
                </div>

                <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Massa / PTT</span>
                  <span className="font-extrabold text-slate-800 font-mono">
                    {localDims.weight || '-'}t / PTT: {localDims.grossWeightRating || '3.5'}t
                  </span>
                </div>

                <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Motore & Classe</span>
                  <span className="font-extrabold text-slate-800">
                    {localDims.engineType || 'Diesel'} ({localDims.euroCategory || 'Euro 6'})
                  </span>
                </div>

                <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Telaio / VIN</span>
                  <span className="font-mono text-[11px] font-extrabold text-slate-800 truncate block">
                    {localDims.vinNumber || 'N.D.'}
                  </span>
                </div>

                <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Posti Omologati / Letto</span>
                  <span className="font-extrabold text-slate-800">
                    {localDims.seatsHomologated || '-'} / {localDims.bedsCount || '-'}
                  </span>
                </div>

                <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Acqua Chiara / Grigia</span>
                  <span className="font-extrabold text-slate-800">
                    {localDims.freshWaterTank || '-'}L / {localDims.greyWaterTank || '-'}L
                  </span>
                </div>
              </div>

              {/* Accessories list */}
              {localDims.accessories && localDims.accessories.length > 0 && (
                <div className="space-y-1.5">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Dotazioni & Accessori Principali</span>
                  <div className="flex flex-wrap gap-1.5">
                    {localDims.accessories.map((acc) => (
                      <span key={acc} className="px-2.5 py-1 bg-[#3E4A35]/10 text-[#3E4A35] font-extrabold text-[11px] rounded-lg">
                        {acc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {localDims.notes && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-amber-900 block text-[10px] uppercase">Note di Servizio</span>
                  <p className="text-amber-800 font-medium whitespace-pre-wrap">{localDims.notes}</p>
                </div>
              )}
            </div>

            {/* Print action */}
            <div className="pt-3 flex justify-end gap-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setShowPassportModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Chiudi
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Stampa / Salva PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT CARD MODAL --- */}
      {showCardModal && (
        <div
          className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in"
          onClick={() => setShowCardModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 relative my-auto max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowCardModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-xs">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800">
                  {editingCardId ? 'Modifica Tessera / Convenzione' : 'Aggiungi Tessera o Convenzione'}
                </h3>
                <p className="text-xs text-slate-500">
                  Inserisci i dettagli del tuo club camperista, codice socio e QR Code.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Club Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome Club / Associazione *
                </label>
                <input
                  type="text"
                  value={cardClubName}
                  onChange={(e) => setCardClubName(e.target.value)}
                  placeholder="Es. Agricamper Italia, ACSI, PleinAir, CCI..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-amber-500 font-bold text-xs"
                />
              </div>

              {/* Card Number & Holder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    N. Tessera / Codice Socio
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="Es. AGRI-2026-9814"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-amber-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Intestatario Tessera
                  </label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="Nome e Cognome"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-amber-500 font-medium text-xs"
                  />
                </div>
              </div>

              {/* Expiry Date & Web Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Scadenza Tessera
                  </label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="Es. 31/12/2026"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-amber-500 font-medium text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Link Portale / App (URL)
                  </label>
                  <input
                    type="url"
                    value={cardWebUrl}
                    onChange={(e) => setCardWebUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-amber-500 font-medium text-xs"
                  />
                </div>
              </div>

              {/* Notes & Discounts */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Note, Sconti & Dettagli Convenzione
                </label>
                <textarea
                  value={cardNotes}
                  onChange={(e) => setCardNotes(e.target.value)}
                  placeholder="Es. Sosta gratuita 24h nelle fattorie, 15% di sconto sui traghetti, codice promo..."
                  rows={2}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-amber-500 font-medium text-xs"
                />
              </div>

              {/* QR Code Image Upload / Custom QR URL */}
              <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/80 space-y-2">
                <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-amber-600" />
                  <span>Immagine QR Code / Codice a Barre / Foto Tessera</span>
                </label>
                <p className="text-[11px] text-amber-900/80 leading-tight">
                  Carica lo screenshot del QR code o della tessera dal tuo telefono. Se lasci vuoto ma inserisci il numero tessera, verrà generato automaticamente un QR Code scansionabile.
                </p>

                {cardQrUrl ? (
                  <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-amber-200">
                    <img src={cardQrUrl} alt="QR Preview" className="w-16 h-16 object-contain rounded-lg" />
                    <div className="flex-1">
                      <span className="text-xs font-extrabold text-slate-800 block">Immagine Caricata</span>
                      <button
                        type="button"
                        onClick={() => setCardQrUrl('')}
                        className="text-[11px] text-red-600 font-bold hover:underline cursor-pointer"
                      >
                        Rimuovi Immagine
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => qrFileRef.current?.click()}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Carica Foto / QR Code</span>
                    </button>
                    <input
                      type="file"
                      ref={qrFileRef}
                      accept="image/*"
                      onChange={handleQrUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCardModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleSaveCard}
                disabled={!cardClubName.trim()}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Salva Tessera</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FULLSCREEN QR CODE MODAL FOR CHECK-IN RECEPTION --- */}
      {fullscreenQr && (
        <div
          className="fixed inset-0 z-[10001] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setFullscreenQr(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setFullscreenQr(null)}
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 block">
                MOSTRA AL CHECK-IN / RECEPTION
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                {fullscreenQr.clubName}
              </h3>
              {fullscreenQr.cardNumber && (
                <p className="text-xs font-mono font-extrabold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg inline-block mt-1">
                  N. Tessera: {fullscreenQr.cardNumber}
                </p>
              )}
            </div>

            {fullscreenQr.qrUrl ? (
              <div className="p-4 bg-white border-2 border-slate-900 rounded-2xl shadow-inner inline-block mx-auto">
                <img
                  src={fullscreenQr.qrUrl}
                  alt="QR Code Reception"
                  className="w-56 h-56 object-contain mx-auto"
                />
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-8">Nessun QR Code disponibile</p>
            )}

            {fullscreenQr.holderName && (
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Intestatario: {fullscreenQr.holderName}
              </p>
            )}

            <button
              type="button"
              onClick={() => setFullscreenQr(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-extrabold text-xs rounded-xl cursor-pointer"
            >
              Chiudi Schermata
            </button>
          </div>
        </div>
      )}

      {showMainPhotoCropper && pendingMainPhotoSrc && (
        <ProfilePhotoCropper
          imageSrc={pendingMainPhotoSrc}
          aspect="rect"
          title="Ritaglia Foto Camper"
          onCrop={(croppedBase64) => {
            updateField('mainPhotoUrl', croppedBase64);
            setShowMainPhotoCropper(false);
            setPendingMainPhotoSrc(null);
          }}
          onCancel={() => {
            setShowMainPhotoCropper(false);
            setPendingMainPhotoSrc(null);
          }}
        />
      )}
    </div>
  );
}
