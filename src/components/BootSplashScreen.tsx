/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

interface BootSplashScreenProps {
  onComplete: () => void;
}

export default function BootSplashScreen({ onComplete }: BootSplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [flickerClass, setFlickerClass] = useState('opacity-0');

  useEffect(() => {
    // 1. Initial fade in with a couple of brief brightness "crackle" pulses
    const timer1 = setTimeout(() => {
      setFlickerClass('animate-power-crackle');
    }, 150);

    // 2. Play power-on sounds / effect duration (approx 2.2 seconds)
    const timer2 = setTimeout(() => {
      setIsVisible(false);
    }, 2200);

    // 3. Complete splash transition and fade out
    const timer3 = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  const handleSkip = () => {
    setIsVisible(false);
    // Smooth transition trigger
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#020204] cursor-pointer selection:bg-transparent select-none transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      id="boot-splash-container"
    >
      {/* Dynamic CSS Keyframes Injection */}
      <style>{`
        @keyframes powerCrackle {
          0% {
            opacity: 0;
            transform: scale(0.92);
            filter: brightness(0.2) contrast(1.5);
          }
          5% {
            opacity: 0.8;
            transform: scale(0.95);
            filter: brightness(1.8) drop-shadow(0 0 15px #38bdf8);
          }
          7% {
            opacity: 0.3;
            transform: scale(0.94);
            filter: brightness(0.6);
          }
          11% {
            opacity: 0.9;
            transform: scale(0.97);
            filter: brightness(1.5) drop-shadow(0 0 20px #0284c7);
          }
          14% {
            opacity: 0.2;
            transform: scale(0.96);
            filter: brightness(0.4);
          }
          20% {
            opacity: 1;
            transform: scale(1);
            filter: brightness(1) drop-shadow(0 0 8px rgba(56, 189, 248, 0.3));
          }
          75% {
            filter: brightness(1.1) drop-shadow(0 0 12px rgba(56, 189, 248, 0.4));
          }
          100% {
            opacity: 1;
            transform: scale(1.02);
            filter: brightness(1) drop-shadow(0 0 8px rgba(56, 189, 248, 0.2));
          }
        }

        .animate-power-crackle {
          animation: powerCrackle 2.3s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        @keyframes thunderPulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.6; }
        }

        .lightning-bg-pulse {
          animation: thunderPulse 1.8s ease-in-out infinite;
        }
      `}</style>

      {/* Grid Pattern and Ambient Backlit Glow */}
      <div className="absolute inset-0 tech-grid-bg opacity-15 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none lightning-bg-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container Content */}
      <div className={`relative flex flex-col items-center justify-center max-w-lg px-6 ${flickerClass}`}>
        
        {/* Emblem Wrapper */}
        <div className="w-64 h-64 md:w-80 md:h-80 flex items-center justify-center transform hover:scale-[1.03] transition duration-300">
          <img 
            src="https://raw.githubusercontent.com/usmc6123/Workshop-Ragnarok/main/assets/3dlogo.jpg" 
            alt="Workshop: Ragnarök" 
            className="w-full h-full object-cover rounded-full border-4 border-slate-700/60 shadow-[0_0_25px_rgba(245,158,11,0.3)] select-none"
          />
        </div>

        {/* Subtitle / Loading Prompt */}
        <div className="mt-8 text-center space-y-1.5 pointer-events-none">
          <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-amber-500/80">
            Workshop Boot Sequence
          </div>
          <div className="text-xs text-slate-500 font-mono flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />
            <span>Powering grid controllers...</span>
          </div>
        </div>
      </div>

      {/* Click-to-Skip Prompt Bar */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleSkip();
        }}
        className="absolute bottom-10 text-[10px] font-mono tracking-[0.2em] text-slate-600 hover:text-amber-500/80 uppercase px-4 py-1.5 rounded bg-slate-900/40 border border-slate-800/60 hover:border-amber-500/35 transition cursor-pointer select-none"
        id="skip-splash-btn"
      >
        Skip Power-On (Tap Anywhere)
      </button>
    </div>
  );
}
