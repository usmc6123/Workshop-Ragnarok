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
        backgroundImage: `radial-gradient(circle at center, rgba(245, 158, 11, 0.15) 0%, rgba(10, 10, 12, 0.98) 100%), url('https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=1600')`,
        backgroundBlendMode: 'multiply'
      }}
    >
      {/* Decorative cyber grid lines to match industrial digital interface look */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.015)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10 flex flex-col items-center">
        
        {/* Neon Glowing Logo Ring Container */}
        <div className="relative inline-flex items-center justify-center mb-6">
          {/* Outer glowing neon ring */}
          <div className="absolute inset-0 rounded-full border-4 border-[#ff9900] shadow-[0_0_20px_#ff9900,0_0_40px_#f59e0b,inset_0_0_15px_#ff9900]" />
          {/* Inner ring & Logo */}
          <div className="relative p-1 bg-black/30 rounded-full overflow-hidden">
            <img 
              src="https://raw.githubusercontent.com/usmc6123/images/main/newlogo.jpg" 
              alt="Ragnarök Logo" 
              className="w-[140px] h-[140px] rounded-full object-cover relative z-10"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black tracking-[0.25em] text-[#ffb300] drop-shadow-[0_0_15px_rgba(255,179,0,0.8)] font-sans uppercase">
            RAGNARÖK
          </h1>
          <p className="text-white font-mono tracking-widest text-xs uppercase mt-3">
            Workshop Service Manual Library
          </p>
        </div>

        {/* Card Body - Dark Brushed Metal Plate */}
        <div className="w-full relative bg-gradient-to-b from-[#2c2e33] to-[#181a1c] border-2 border-[#121315] rounded-[24px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* Inner brushed metal bezel edge highlights */}
          <div className="absolute inset-[1px] rounded-[22px] border border-white/5 pointer-events-none" />
          
          {/* Top Amber Accent plate with tiny rivets */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-3.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-b-xl border-x-2 border-b-2 border-amber-700 shadow-[0_2px_10px_rgba(245,158,11,0.4)] flex justify-around items-center px-6">
            <span className="w-1.5 h-1.5 rounded-full bg-black/40" />
            <span className="w-1.5 h-1.5 rounded-full bg-black/40" />
          </div>

          {/* Bottom Amber Accent plate with tiny rivets */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-3.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-t-xl border-x-2 border-t-2 border-amber-700 shadow-[0_-2px_10px_rgba(245,158,11,0.4)] flex justify-around items-center px-6">
            <span className="w-1.5 h-1.5 rounded-full bg-black/40" />
            <span className="w-1.5 h-1.5 rounded-full bg-black/40" />
          </div>

          {/* 4 Corner Rivets / Bolts */}
          {/* Top Left Bolt */}
          <div className="absolute top-4 left-4 w-6 h-6 rounded-full bg-gradient-to-br from-[#737882] via-[#3d3f44] to-[#191a1c] border border-black/70 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.2),2px_2px_4px_rgba(0,0,0,0.6)] flex items-center justify-center">
            <div className="w-3.5 h-[2px] bg-[#121315]/80 rounded-sm rotate-45" />
          </div>
          {/* Top Right Bolt */}
          <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-gradient-to-br from-[#737882] via-[#3d3f44] to-[#191a1c] border border-black/70 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.2),2px_2px_4px_rgba(0,0,0,0.6)] flex items-center justify-center">
            <div className="w-3.5 h-[2px] bg-[#121315]/80 rounded-sm -rotate-45" />
          </div>
          {/* Bottom Left Bolt */}
          <div className="absolute bottom-4 left-4 w-6 h-6 rounded-full bg-gradient-to-br from-[#737882] via-[#3d3f44] to-[#191a1c] border border-black/70 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.2),2px_2px_4px_rgba(0,0,0,0.6)] flex items-center justify-center">
            <div className="w-3.5 h-[2px] bg-[#121315]/80 rounded-sm -rotate-12" />
          </div>
          {/* Bottom Right Bolt */}
          <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full bg-gradient-to-br from-[#737882] via-[#3d3f44] to-[#191a1c] border border-black/70 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.2),2px_2px_4px_rgba(0,0,0,0.6)] flex items-center justify-center">
            <div className="w-3.5 h-[2px] bg-[#121315]/80 rounded-sm rotate-[70deg]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            {error && (
              <div className="bg-red-950/20 border border-red-900/40 text-red-400 p-3.5 rounded-lg text-xs font-mono flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-white font-mono text-sm uppercase tracking-wider mb-2 font-medium">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="block w-full px-4 py-3.5 bg-[#111215] border border-slate-700/60 rounded-lg text-sm font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500/50 transition duration-200"
              />
            </div>

            <div>
              <label className="block text-white font-mono text-sm uppercase tracking-wider mb-2 font-medium">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-4 pr-12 py-3.5 bg-[#111215] border border-slate-700/60 rounded-lg text-sm font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500/50 transition duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-500 hover:text-amber-500/80 transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#ff9900] hover:bg-[#e68a00] active:bg-[#cc7a00] text-black font-black text-lg uppercase rounded-lg tracking-[0.2em] transition duration-200 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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

          {/* Footer inside the card to match Variation 1 precisely */}
          <p className="text-center text-[9px] font-mono text-neutral-500 mt-6 tracking-wider uppercase">
            AUTHORIZED HOMELAB PERSONNEL ONLY • SYS_ID 4000
          </p>
        </div>
      </div>
    </div>
  );
}
