import React, { useState } from 'react';
import { Clapperboard, Sparkles, CheckCircle2 } from 'lucide-react';

export default function VideoEditorView() {
  const [clicked, setClicked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleButtonClick = () => {
    if (clicked) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setClicked(true);
    }, 1500);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setClicked(false);
  };

  return (
    <div className="relative min-h-[calc(100vh-120px)] flex flex-col items-center justify-center p-6 select-none" id="video-editor-view-container">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d0e14] via-[#0d0e14]/90 to-[#0d0e14] pointer-events-none z-0" />
      
      {/* Visual Accent Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Main minimal card wrapper */}
      <div className="relative z-10 max-w-md w-full text-center space-y-8 p-10 rounded-2xl border border-white/5 bg-[#12131a]/80 backdrop-blur-xl shadow-2xl">
        
        {/* Sleek icon pairing */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
          <Clapperboard className="w-8 h-8 animate-pulse" />
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <h1 className="text-xl font-black text-white tracking-widest uppercase font-sans">
            Video Production Suite
          </h1>
          <p className="text-xs font-mono text-slate-400 max-w-xs mx-auto">
            {clicked 
              ? 'Video engine initialized successfully.' 
              : 'Launch the high-performance localized rendering pipeline.'
            }
          </p>
        </div>

        {/* The single beautiful button */}
        <div className="pt-2">
          <button
            onClick={handleButtonClick}
            disabled={loading}
            className={`
              relative w-full overflow-hidden rounded-xl py-4 px-6 font-black text-xs uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer shadow-lg
              ${clicked 
                ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-amber-500/10'
              }
              ${loading ? 'animate-pulse' : ''}
            `}
            id="video-suite-action-btn"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Initializing Pipeline...
              </span>
            ) : clicked ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Suite Ready
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Initialize Video Suite
              </span>
            )}
          </button>

          {/* Hidden/Subtle Reset option if clicked */}
          {clicked && (
            <button
              onClick={handleReset}
              className="mt-4 text-[10px] font-mono text-slate-500 hover:text-slate-300 underline cursor-pointer transition"
            >
              Reset State
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
