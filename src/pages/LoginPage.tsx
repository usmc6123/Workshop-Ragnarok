import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Wrench } from 'lucide-react';

interface LoginPageProps {
  onSuccess: () => void;
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center px-4 relative select-none overflow-hidden py-12"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.35)), url('https://raw.githubusercontent.com/usmc6123/images/main/loginpagebackground.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="w-full max-w-[420px] relative z-10 flex flex-col items-center">
        
        {/* Neon Glowing Logo Ring Container */}
        <div className="relative inline-flex items-center justify-center mb-5">
          {/* Subtle amber glowing outer ring */}
          <div className="absolute inset-0 rounded-full border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.5),inset_0_0_10px_rgba(245,158,11,0.25)]" />
          {/* Inner ring & Logo */}
          <div className="relative p-0.5 bg-black/40 rounded-full overflow-hidden">
            <img 
              src="https://raw.githubusercontent.com/usmc6123/images/main/newlogo.jpg" 
              alt="Ragnarök Logo" 
              className="w-20 h-20 rounded-full object-cover relative z-10"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black tracking-[0.25em] text-[#ff9900] drop-shadow-[0_0_10px_rgba(255,153,0,0.7)] font-sans uppercase">
            RAGNARÖK
          </h1>
          <p className="text-gray-300 font-mono tracking-wider text-xs uppercase mt-2">
            Workshop Service Manual Library
          </p>
        </div>

        {/* Card Body - Dark Translucent Panel with Backdrop Blur */}
        <div className="w-full relative bg-[#0a0a0f]/75 backdrop-blur-md border border-amber-500/20 rounded-2xl p-8 shadow-[0_0_20px_rgba(245,158,11,0.15),0_15px_35px_rgba(0,0,0,0.6)] overflow-hidden">
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-950/40 border border-red-900/50 text-red-400 p-3.5 rounded-lg text-xs font-mono flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-amber-500 font-mono text-[10px] uppercase tracking-widest mb-2 font-bold">
                USERNAME
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="block w-full px-4 py-3 bg-black/40 border border-neutral-850 rounded-lg text-sm font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 transition duration-200"
              />
            </div>

            <div>
              <label className="block text-amber-500 font-mono text-[10px] uppercase tracking-widest mb-2 font-bold">
                PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-4 pr-12 py-3 bg-black/40 border border-neutral-850 rounded-lg text-sm font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 transition duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-500 hover:text-amber-500 transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:from-amber-600 active:to-orange-600 text-black font-black text-base uppercase rounded-lg tracking-[0.2em] transition duration-200 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transform hover:scale-[1.01] active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Wrench className="w-5 h-5 animate-spin text-black" />
                  Authenticating...
                </>
              ) : (
                'LOGIN'
              )}
            </button>
          </form>
        </div>

        {/* Footer below the card as requested */}
        <p className="text-center text-[9px] font-mono text-neutral-500 mt-6 tracking-wider uppercase select-none">
          AUTHORIZED HOMELAB PERSONNEL ONLY • SYS_ID 4000
        </p>
      </div>
    </div>
  );
}
