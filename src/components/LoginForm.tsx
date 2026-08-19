import React from 'react';
import { ArrowLeft, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

interface LoginFormProps {
  onBack: () => void;
  onSuccess: (user: { nickname: string; email: string; name: string; favorites: string[]; isModerator?: boolean; moderatorRoles?: any; profilePhoto?: string }) => void;
  onSwitchToRegistration?: () => void;
  hideBack?: boolean;
  firestore?: any;
}

export default function LoginForm({ onBack, onSuccess, onSwitchToRegistration, hideBack, firestore }: LoginFormProps) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const [showResetModal, setShowResetModal] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [resetMsg, setResetMsg] = React.useState<string | null>(null);
  const [isResetting, setIsResetting] = React.useState(false);

  const handleResetPassword = async () => {
    if (!resetEmail) {
      setResetMsg('⚠️ Inserisci la tua email.');
      return;
    }
    setResetMsg(null);
    setIsResetting(true);
    try {
      const targetUrl = resolveMediaUrl('/api/reset-password');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      let res;
      try {
        res = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ email: resetEmail.toLowerCase().trim(), newPassword })
        });
      } finally {
        clearTimeout(timeoutId);
      }
      const data = await res.json();
      if (!res.ok) {
        setResetMsg(`⚠️ ${data.error || 'Errore nel ripristino password.'}`);
        setIsResetting(false);
        return;
      }
      setResetMsg(data.message || '✅ Password aggiornata con successo! Ora puoi accedere.');
      setTimeout(() => {
        if (data.success) {
          setEmail(resetEmail);
          if (newPassword) setPassword(newPassword);
          setShowResetModal(false);
        }
      }, 2000);
    } catch (err: any) {
      console.warn("Reset password API failed, attempting direct Firestore fallback...", err);
      if (firestore) {
        try {
          const formattedEmail = resetEmail.toLowerCase().trim();
          const userRef = firestore.collection("users").doc(formattedEmail);
          const userDoc = await userRef.get();
          if (!userDoc.exists) {
            throw new Error("Nessun utente trovato con questo indirizzo email.");
          }
          await userRef.update({ password: newPassword });
          setResetMsg('✅ Password aggiornata con successo! Ora puoi accedere.');
          setTimeout(() => {
            setEmail(resetEmail);
            if (newPassword) setPassword(newPassword);
            setShowResetModal(false);
          }, 2000);
        } catch (dbErr: any) {
          setResetMsg(`⚠️ ${dbErr.message || 'Errore nel ripristino password.'}`);
        }
      } else {
        setResetMsg(`⚠️ ${err.message || 'Errore di connessione.'}`);
      }
    } finally {
      setIsResetting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const cleanEmail = email.toLowerCase().trim();
    const cleanPass = password.trim();

    const isNativeOrExternal = typeof window !== "undefined" && (
      typeof (window as any).Capacitor !== "undefined" ||
      window.location.protocol.startsWith("capacitor") ||
      window.location.protocol.startsWith("file:") ||
      !window.location.hostname.includes("run.app")
    );

    const runFirestoreLogin = async () => {
      const formattedEmail = cleanEmail;
      const userDocSnap = await firestore.collection("users").doc(formattedEmail).get();
      if (!userDocSnap.exists) {
        throw new Error("Nessun account registrato con questa email.");
      }
      const userData = userDocSnap.data();
      if (userData.deleted === true) {
        throw new Error("Questo account è stato eliminato definitivamente.");
      }
      const storedPass = String(userData.password || '').trim();
      if (storedPass !== cleanPass) {
        throw new Error("Password errata. Se non la ricordi, usa la funzione 'Password dimenticata?'.");
      }
      const isSuper = formattedEmail === "sambucci.simone@gmail.com" || formattedEmail === "viacamperapp@gmail.com";
      if (!isSuper && userData.approved === false) {
        throw new Error("Il tuo account è in attesa di approvazione da parte di un moderatore.");
      }
      const hasAnyModRole = Boolean(
        userData.moderatorRoles && (
          userData.moderatorRoles.community === true ||
          userData.moderatorRoles.places === true ||
          userData.moderatorRoles.itineraries === true
        )
      );
      const isMod = isSuper || (Boolean(userData.isModerator) && hasAnyModRole);
      const userObj = {
        email: formattedEmail,
        name: userData.name,
        nickname: userData.nickname,
        profilePhoto: userData.profilePhoto || userData.avatarUrl || "",
        favorites: userData.favorites || [],
        isModerator: isMod,
        moderatorRoles: isSuper
          ? { community: true, places: true, itineraries: true }
          : (hasAnyModRole ? userData.moderatorRoles : { community: false, places: false, itineraries: false })
      };
      window.dispatchEvent(new CustomEvent('show-toast', { 
        detail: { message: `🔑 Accesso eseguito! Bentornato, ${userObj.nickname}.`, duration: 4000 } 
      }));
      onSuccess(userObj);
    };

    try {
      const targetUrl = resolveMediaUrl('/api/login');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      let res;
      try {
        res = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ email: cleanEmail, password: cleanPass })
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Errore durante l\'accesso.');
        setIsLoading(false);
        return;
      }

      const isSuper = cleanEmail === "sambucci.simone@gmail.com" || cleanEmail === "viacamperapp@gmail.com";
      const hasAnyModRole = Boolean(
        data.user?.moderatorRoles && (
          data.user.moderatorRoles.community === true ||
          data.user.moderatorRoles.places === true ||
          data.user.moderatorRoles.itineraries === true
        )
      );
      const isMod = isSuper || (Boolean(data.user?.isModerator) && hasAnyModRole);
      const userObj = {
        ...data.user,
        email: cleanEmail,
        isModerator: isMod,
        moderatorRoles: isSuper
          ? { community: true, places: true, itineraries: true }
          : (hasAnyModRole ? data.user.moderatorRoles : { community: false, places: false, itineraries: false })
      };

      window.dispatchEvent(new CustomEvent('show-toast', { 
        detail: { message: `🔑 Accesso eseguito! Bentornato, ${userObj.nickname}.`, duration: 4000 } 
      }));
      onSuccess(userObj);
      return;
    } catch (err: any) {
      console.warn("Login API failed, attempting direct Firestore fallback...", err);
      if (firestore) {
        try {
          await runFirestoreLogin();
        } catch (dbErr: any) {
          setError(dbErr.message || "Errore di connessione o password errata.");
        }
      } else {
        setError(err.message || 'Errore di connessione.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {!hideBack && (
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-[#3E4A35] font-bold text-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Torna agli strumenti
        </button>
      )}

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-sm mx-auto">
        <h2 className="text-xl font-black text-slate-900 mb-6 text-center">Login a ViaCamper</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-100 text-center">
            ⚠️ {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input 
              type="email" 
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3E4A35]/20"
              required
            />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3E4A35]/20"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer flex items-center justify-center h-5 w-5"
              title={showPassword ? "Nascondi password" : "Mostra password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="text-xs text-slate-500 hover:text-[#3E4A35] font-bold underline cursor-pointer"
            >
              Password dimenticata?
            </button>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className={`w-full py-2.5 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-black text-sm rounded-lg transition-all cursor-pointer shadow-md ${isLoading ? 'opacity-65 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Connessione...' : 'Accedi'}
          </button>
        </form>

        {showResetModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
              <h3 className="font-black text-lg text-slate-900 text-center">Recupera / Imposta Password</h3>
              <p className="text-xs text-slate-600 text-center">
                Inserisci l'email del tuo account per ricevere la tua password o impostarne una nuova.
              </p>
              {resetMsg && (
                <div className={`p-3 text-xs font-bold rounded-lg text-center ${resetMsg.includes('⚠️') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {resetMsg}
                </div>
              )}
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="La tua email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#3E4A35]/20"
                />
                <input
                  type="password"
                  placeholder="Nuova Password (opzionale)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#3E4A35]/20"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={isResetting}
                  className="flex-1 py-2 bg-[#3E4A35] text-white font-bold text-xs rounded-lg hover:bg-[#5A6B4E] cursor-pointer"
                >
                  {isResetting ? 'Invio...' : 'Ripristina'}
                </button>
              </div>
            </div>
          </div>
        )}

        {onSwitchToRegistration && (
          <div className="mt-6 text-center text-xs text-slate-500 font-medium">
            Non hai un account?{' '}
            <button
              onClick={onSwitchToRegistration}
              className="text-[#3E4A35] font-black hover:underline cursor-pointer"
            >
              Registrati ora
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
