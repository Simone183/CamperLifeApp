import React from 'react';
import { 
  User, Camera, Mail, Calendar, AtSign, MapPin, 
  Truck, FileText, Check, Save, ArrowLeft, 
  Sparkles, ShieldCheck, X, RefreshCw, AlertCircle, LogIn
} from 'lucide-react';
import { compressImage } from '../utils/photoCompressor';
import ProfilePhotoCropper from './ProfilePhotoCropper';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface UserProfileData {
  name: string;
  surname: string;
  nickname: string;
  dob: string;
  email: string;
  city?: string;
  camperModel?: string;
  bio?: string;
  profilePhoto?: string | null;
  isModerator?: boolean;
  moderatorRoles?: any;
}

interface ProfileSettingsTabProps {
  currentUser: {
    nickname: string;
    email: string;
    name?: string;
    surname?: string;
    dob?: string;
    city?: string;
    camperModel?: string;
    bio?: string;
    profilePhoto?: string;
    isModerator?: boolean;
    moderatorRoles?: any;
    approved?: boolean;
  } | null;
  onUpdateUser: (updatedUser: any) => void;
  onBack: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToRegistration?: () => void;
  firestore?: any;
}

export default function ProfileSettingsTab({
  currentUser,
  onUpdateUser,
  onBack,
  onNavigateToLogin,
  onNavigateToRegistration,
  firestore
}: ProfileSettingsTabProps) {
  // Form State
  const [name, setName] = React.useState(currentUser?.name || '');
  const [surname, setSurname] = React.useState(currentUser?.surname || '');
  const [nickname, setNickname] = React.useState(currentUser?.nickname || '');
  const [dob, setDob] = React.useState(currentUser?.dob || '');
  const [email, setEmail] = React.useState(currentUser?.email || '');
  const [city, setCity] = React.useState(currentUser?.city || '');
  const [camperModel, setCamperModel] = React.useState(currentUser?.camperModel || '');
  const [bio, setBio] = React.useState(currentUser?.bio || '');
  const [profilePhoto, setProfilePhoto] = React.useState<string | null>(currentUser?.profilePhoto || null);

  // UI state
  const [isLoading, setIsLoading] = React.useState(false);
  const [isFetching, setIsFetching] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Photo Cropper state
  const [pendingPhotoSrc, setPendingPhotoSrc] = React.useState<string | null>(null);
  const [showCropper, setShowCropper] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Calculate age if dob is provided
  const calculatedAge = React.useMemo(() => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 && age < 130 ? age : null;
  }, [dob]);

  // Load latest data from Firestore on mount
  React.useEffect(() => {
    const cleanEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
    if (!cleanEmail) {
      // Check local storage for offline / guest data
      try {
        const saved = localStorage.getItem('camper_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.name && !name) setName(parsed.name);
          if (parsed.surname && !surname) setSurname(parsed.surname);
          if (parsed.nickname && !nickname) setNickname(parsed.nickname);
          if (parsed.dob && !dob) setDob(parsed.dob);
          if (parsed.email && !email) setEmail(parsed.email);
          if (parsed.city && !city) setCity(parsed.city);
          if (parsed.camperModel && !camperModel) setCamperModel(parsed.camperModel);
          if (parsed.bio && !bio) setBio(parsed.bio);
          if (parsed.profilePhoto && !profilePhoto) setProfilePhoto(parsed.profilePhoto);
        }
      } catch (e) {}
      return;
    }

    let isMounted = true;
    const loadFirestoreProfile = async () => {
      setIsFetching(true);
      try {
        let data: any = null;
        if (firestore) {
          const snap = await firestore.collection('users').doc(cleanEmail).get();
          if (snap && snap.exists) {
            data = snap.data();
          }
        } else if (db) {
          const userDocRef = doc(db, 'users', cleanEmail);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            data = snap.data();
          }
        }

        if (isMounted && data) {
          if (data.name) setName(data.name);
          if (data.surname) setSurname(data.surname);
          if (data.nickname) setNickname(data.nickname);
          if (data.dob) setDob(data.dob);
          if (data.email) setEmail(data.email);
          if (data.city) setCity(data.city);
          if (data.camperModel) setCamperModel(data.camperModel);
          if (data.bio) setBio(data.bio);
          if (data.profilePhoto || data.avatarUrl) {
            setProfilePhoto(data.profilePhoto || data.avatarUrl);
          }
        }
      } catch (err) {
        console.warn('[ProfileSettingsTab] Errore caricamento profilo Firestore:', err);
      } finally {
        if (isMounted) setIsFetching(false);
      }
    };

    loadFirestoreProfile();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.email]);

  // Handle Photo selection from camera / file manager
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Seleziona un file immagine valido (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPendingPhotoSrc(event.target.result as string);
        setShowCropper(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle cropped image
  const handleCropComplete = async (croppedImageBase64: string) => {
    setShowCropper(false);
    setPendingPhotoSrc(null);
    try {
      // Compress cropped image to ~120-150px avatar size (<50KB)
      const compressed = await compressImage(croppedImageBase64, 'low');
      setProfilePhoto(compressed);

      // Auto-save photo immediately if user is logged in
      if (currentUser?.email) {
        const cleanEmail = currentUser.email.toLowerCase().trim();
        const updatedObj = {
          ...currentUser,
          profilePhoto: compressed
        };
        onUpdateUser(updatedObj);
        localStorage.setItem('camper_user', JSON.stringify(updatedObj));
        localStorage.setItem('camper_profile_photo_' + cleanEmail, compressed);

        if (db) {
          try {
            await setDoc(doc(db, 'users', cleanEmail), { profilePhoto: compressed }, { merge: true });
          } catch (e) {}
        }
        window.dispatchEvent(new CustomEvent('user-updated', { detail: updatedObj }));
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: '📸 Foto profilo social aggiornata!' } }));
      }
    } catch (err) {
      console.warn('Compress error:', err);
      setProfilePhoto(croppedImageBase64);
    }
  };

  // Handle Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    if (!nickname.trim()) {
      setErrorMessage('Inserisci un nickname valido per il social.');
      return;
    }

    setIsLoading(true);
    const cleanEmail = (email || currentUser?.email || '').toLowerCase().trim();
    const cleanName = name.trim();
    const cleanSurname = surname.trim();
    const cleanNickname = nickname.trim();
    const cleanCity = city.trim();
    const cleanCamperModel = camperModel.trim();
    const cleanBio = bio.trim();

    const updatedUserObject = {
      ...(currentUser || {}),
      email: cleanEmail || 'ospite@viacamper.app',
      name: cleanName,
      surname: cleanSurname,
      nickname: cleanNickname,
      dob: dob || '',
      city: cleanCity,
      camperModel: cleanCamperModel,
      bio: cleanBio,
      profilePhoto: profilePhoto || null,
      updatedAt: new Date().toISOString()
    };

    try {
      // 1. Save in local storage
      localStorage.setItem('camper_user', JSON.stringify(updatedUserObject));
      if (cleanEmail) {
        localStorage.setItem('camper_profile_info_' + cleanEmail, JSON.stringify(updatedUserObject));
      }

      // 2. Update React Context / App state
      onUpdateUser(updatedUserObject);

      // 3. Save to Firestore if user has an email
      if (cleanEmail && cleanEmail !== 'ospite@viacamper.app') {
        const payloadToMerge: any = {
          name: cleanName,
          surname: cleanSurname,
          nickname: cleanNickname,
          dob: dob || '',
          city: cleanCity,
          camperModel: cleanCamperModel,
          bio: cleanBio,
          profilePhoto: profilePhoto || null,
          updatedAt: new Date().toISOString()
        };

        if (firestore) {
          try {
            await firestore.collection('users').doc(cleanEmail).set(payloadToMerge, { merge: true });
          } catch (fErr) {
            console.warn('Firestore adapter save warning:', fErr);
          }
        } else if (db) {
          try {
            await setDoc(doc(db, 'users', cleanEmail), payloadToMerge, { merge: true });
          } catch (dbErr) {
            console.warn('Firestore SDK save warning:', dbErr);
          }
        }

        // 3b. Also sync to backend API
        try {
          fetch('/api/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, ...payloadToMerge })
          }).catch(() => {});
        } catch (apiErr) {}
      }

      // 4. Dispatch global events
      window.dispatchEvent(new CustomEvent('user-updated', { detail: updatedUserObject }));
      window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: updatedUserObject }));
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: { message: '✅ Profilo aggiornato e sincronizzato con successo!' }
        })
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('[ProfileSettingsTab] Errore salvataggio:', err);
      setErrorMessage(err?.message || 'Errore durante il salvataggio del profilo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={onBack}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-[#3E4A35] dark:text-emerald-400 transition-colors cursor-pointer"
              title="Torna alle Impostazioni"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-black text-[#3E4A35] dark:text-emerald-400 tracking-tight flex items-center gap-2">
                <span>👤 Profilo Utente</span>
                {currentUser?.isModerator && (
                  <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300">
                    <ShieldCheck className="w-3 h-3" /> Moderatore
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Gestisci i tuoi dati anagrafici, il nickname social e la foto profilo della community.
              </p>
            </div>
          </div>

          {isFetching && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              <span>Sincronizzazione dati...</span>
            </div>
          )}
        </div>
      </div>

      {/* Guest / Non-logged warning */}
      {!currentUser && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <p className="font-bold">Accesso ospite</p>
              <p className="text-amber-700 dark:text-amber-300/90 text-[11px]">
                I dati compilati saranno salvati su questo dispositivo. Per sincronizzarli sul cloud e partecipare alla community, accedi o registrati.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {onNavigateToLogin && (
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="flex-1 sm:flex-none px-3.5 py-1.5 bg-[#3E4A35] hover:bg-[#2d3627] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-transform active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" /> Accedi
              </button>
            )}
            {onNavigateToRegistration && (
              <button
                type="button"
                onClick={onNavigateToRegistration}
                className="flex-1 sm:flex-none px-3.5 py-1.5 bg-white dark:bg-slate-700 text-[#3E4A35] dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50 transition-transform active:scale-95"
              >
                Registrati
              </button>
            )}
          </div>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* SECTION 1: FOTO PROFILO SOCIAL */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-700/60 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-[#3E4A35] dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>Foto Profilo & Avatar Social</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Questa foto sarà visibile accanto ai tuoi messaggi in Chat Live, nei post del Social e nel Forum.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
            {/* Avatar Preview */}
            <div className="relative group shrink-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-emerald-500/20 dark:border-emerald-500/30 bg-slate-100 dark:bg-slate-700 flex items-center justify-center shadow-md">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Foto Profilo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                    <User className="w-12 h-12" />
                    <span className="text-[10px] font-bold mt-1 uppercase">Nessuna Foto</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 p-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full shadow-lg border-2 border-white dark:border-slate-800 transition-transform active:scale-95 cursor-pointer"
                title="Carica o scatta una foto"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Photo Action Buttons */}
            <div className="flex-1 text-center sm:text-left space-y-2.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-[#3E4A35] hover:bg-[#2d3627] active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{profilePhoto ? 'Cambia Foto Profilo' : 'Carica Foto Profilo'}</span>
                </button>

                {profilePhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfilePhoto(null);
                      if (currentUser?.email) {
                        const updatedObj = { ...currentUser, profilePhoto: null };
                        onUpdateUser(updatedObj);
                        localStorage.setItem('camper_user', JSON.stringify(updatedObj));
                        localStorage.removeItem('camper_profile_photo_' + currentUser.email.toLowerCase().trim());
                      }
                    }}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 active:scale-95 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Rimuovi</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Formati supportati: JPG, PNG, WebP. L'immagine verrà ritagliata in formato rotondo perfetto ed ottimizzata per il caricamento rapido.
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </div>

        {/* SECTION 2: DATI ANAGRAFICI & SOCIAL */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-700/60 pb-3">
            <h3 className="text-sm font-black text-[#3E4A35] dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              <span>Dati Personali & Community</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Compilati automaticamente in fase di registrazione, modificabili in qualsiasi momento.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#3E4A35] dark:text-emerald-400" />
                <span>Nome</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Simone"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
              />
            </div>

            {/* Cognome */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#3E4A35] dark:text-emerald-400" />
                <span>Cognome</span>
              </label>
              <input
                type="text"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="Es. Sambucci"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
              />
            </div>

            {/* Nickname Social */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Nickname Social (Visibile nella Community)</span>
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold">*Obbligatorio</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                  @
                </div>
                <input
                  type="text"
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ''))}
                  placeholder="Es. Sam83"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                />
              </div>
            </div>

            {/* Data di Nascita */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#3E4A35] dark:text-emerald-400" />
                  <span>Data di Nascita</span>
                </span>
                {calculatedAge !== null && (
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded-full">
                    {calculatedAge} anni
                  </span>
                )}
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#3E4A35] dark:text-emerald-400" />
                <span>Indirizzo Email Account</span>
              </label>
              <input
                type="email"
                disabled={Boolean(currentUser?.email)}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Es. nome@esempio.com"
                className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-medium outline-none transition-all ${
                  currentUser?.email
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                    : 'bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500'
                }`}
              />
            </div>

            {/* Città / Provenienza */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#3E4A35] dark:text-emerald-400" />
                <span>Città / Regione di Provenienza</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Es. Roma, Lazio"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
              />
            </div>

            {/* Modello Camper */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#3E4A35] dark:text-emerald-400" />
                <span>Il Tuo Camper / Mezzo</span>
              </label>
              <input
                type="text"
                value={camperModel}
                onChange={(e) => setCamperModel(e.target.value)}
                placeholder="Es. Autoroller 3 Mansardato / Fiat Ducato Van"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
              />
            </div>

            {/* Biografia / Breve Presentazione */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#3E4A35] dark:text-emerald-400" />
                <span>Presentazione / Biografia nella Community</span>
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Racconta qualcosa di te e delle tue mete preferite in camper..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Error / Success feedback */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>Profilo aggiornato e sincronizzato con successo con la community!</span>
          </div>
        )}

        {/* Save Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Annulla
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Salvataggio in corso...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salva Modifiche Profilo</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Cropper Modal for Avatar */}
      {showCropper && pendingPhotoSrc && (
        <ProfilePhotoCropper
          imageSrc={pendingPhotoSrc}
          aspect="circle"
          title="Ritaglia Foto Profilo Social"
          onCrop={handleCropComplete}
          onCancel={() => {
            setShowCropper(false);
            setPendingPhotoSrc(null);
          }}
        />
      )}
    </div>
  );
}
