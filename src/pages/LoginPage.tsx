import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Wrench, Lock, User } from 'lucide-react';
import { LOGO_URL } from '../constants/branding';

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
      className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4 relative select-none overflow-hidden"
      style={{
        backgroundImage: `radial-gradient(circle at center, rgba(245, 158, 11, 0.05) 0%, rgba(10, 10, 15, 0) 70%)`
      }}
    >
      {/* Decorative cyber grid lines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            <img 
              src={LOGO_URL} 
              alt="Workshop Logo" 
              className="w-16 h-16 rounded-full object-cover border-2 border-amber-500/30"
            />
          </div>
          <h1 className="text-3xl font-black tracking-wider text-slate-100 font-mono uppercase">
            RAGNARÖK
          </h1>
          <p className="text-xs font-mono tracking-widest text-amber-500/70 uppercase mt-1">
            Homelab Car Service Manual Library
          </p>
        </div>

        {/* Card Body */}
        <div className="bg-[#12131a] border border-[#1e202d] rounded-2xl p-8 shadow-2xl relative">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
          
          <h2 className="text-lg font-mono font-bold text-slate-200 uppercase mb-6 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-500" /> Secure Terminal Access
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-950/20 border border-red-900/40 text-red-400 p-3.5 rounded-xl text-xs font-mono flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                Username Identifier
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="block w-full pl-10 pr-4 py-3 bg-[#0d0e12] border border-[#212330] rounded-xl text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                Access Passcode
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-10 py-3 bg-[#0d0e12] border border-[#212330] rounded-xl text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-350 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono font-bold text-sm uppercase rounded-xl tracking-wider transition duration-200 shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Wrench className="w-4 h-4 animate-spin text-slate-950" />
                  Authenticating...
                </>
              ) : (
                'Initialize Session'
              )}
            </button>
          </form>
        </div>
        
        <p className="text-center text-[10px] font-mono text-slate-600 mt-6 select-none uppercase tracking-widest">
          Authorized homelab personnel only • sys_id 4000
        </p>
      </div>
    </div>
  );
}
