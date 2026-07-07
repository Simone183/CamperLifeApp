import React from 'react';
import { ArrowLeft, User, Lock, Mail, Calendar, AtSign, Eye, EyeOff } from 'lucide-react';

interface RegistrationFormProps {
  onBack: () => void;
  onSuccess: (user: { nickname: string; email: string; name: string }) => void;
  onSwitchToLogin?: () => void;
  hideBack?: boolean;
}

export default function RegistrationForm({ onBack, onSuccess, onSwitchToLogin, hideBack }: RegistrationFormProps) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [name, setName] = React.useState('');
  const [surname, setSurname] = React.useState('');
  const [dob, setDob] = React.useState('');
  const [nickname, setNickname] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, surname, dob, nickname })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Impossibile completare la registrazione.');
      }

      onSuccess(data.user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Errore di connessione con il server.');
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
        <h2 className="text-xl font-black text-slate-900 mb-6 text-center">Registrati a CamperLifeApp</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-100 text-center">
            ⚠️ {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3E4A35]/20"
                required
              />
            </div>
            <div className="relative flex-1">
              <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cognome"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3E4A35]/20"
                required
              />
            </div>
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input 
              type="date" 
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3E4A35]/20 text-slate-500"
              required
            />
          </div>

          <div className="relative">
            <AtSign className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Nickname (visibile in chat)"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3E4A35]/20"
              required
            />
          </div>

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
            {isLoading ? 'Registrazione in corso...' : 'Registrati'}
          </button>
        </form>

        {onSwitchToLogin && (
          <div className="mt-6 text-center text-xs text-slate-500 font-medium">
            Hai già un account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-[#3E4A35] font-black hover:underline cursor-pointer"
            >
              Accedi ora
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
