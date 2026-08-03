import React from 'react';
import { ArrowLeft, Lock, Mail, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onBack: () => void;
  onSuccess: (user: { nickname: string; email: string; name: string; favorites: string[]; isModerator?: boolean; profilePhoto?: string }) => void;
  onSwitchToRegistration?: () => void;
  hideBack?: boolean;
}

export default function LoginForm({ onBack, onSuccess, onSwitchToRegistration, hideBack }: LoginFormProps) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Errore durante l\'accesso.');
      }

      window.dispatchEvent(new CustomEvent('show-toast', { 
        detail: { message: `🔑 Accesso eseguito! Bentornato, ${data.user.nickname}.`, duration: 4000 } 
      }));
      onSuccess(data.user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Errore di connessione o password errata.');
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
        <h2 className="text-xl font-black text-slate-900 mb-6 text-center">Login a CamperLifeApp</h2>

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
          
          <button 
            type="submit"
            disabled={isLoading}
            className={`w-full py-2.5 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-black text-sm rounded-lg transition-all cursor-pointer shadow-md ${isLoading ? 'opacity-65 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Connessione...' : 'Accedi'}
          </button>
        </form>

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
