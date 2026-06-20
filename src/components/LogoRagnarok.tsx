/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: number | string;
  glow?: boolean;
}

const LOGO_PATHS = [
  '/assets/logo.png',
  '/assets/logo.jpg',
  '/assets/logo.jpeg',
  '/assets/logo.webp',
];

export default function LogoRagnarok({ className = '', size = '100%', glow = true }: LogoProps) {
  const [pathIndex, setPathIndex] = useState(0);
  const [useFallback, setUseFallback] = useState(false);

  const handleImageError = () => {
    if (pathIndex < LOGO_PATHS.length - 1) {
      setPathIndex((prev) => prev + 1);
    } else {
      setUseFallback(true);
    }
  };

  if (!useFallback) {
    return (
      <img
        src={LOGO_PATHS[pathIndex]}
        alt="Workshop: Ragnarök Logo"
        className={`${className} object-contain`}
        style={{ width: size, height: size }}
        onError={handleImageError}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 500 500"
      width={size}
      height={size}
      className={`${className} select-none`}
      xmlns="http://www.w3.org/2000/svg"
      id="ragnarok-emblem-svg"
    >
      <defs>
        {/* Metal highlights gradient */}
        <linearGradient id="metal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="25%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#f1f5f9" />
          <stop offset="75%" stopColor="#475569" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        <linearGradient id="wrench-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>

        {/* Gold rust/grime/fire workshop overlay */}
        <linearGradient id="dust-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d97706" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#78350f" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
        </linearGradient>

        {/* Lightning cyan glow filter */}
        <filter id="lightning-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur1" />
          <feGaussianBlur stdDeviation="12" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Electric blue-white glow filter */}
        <filter id="lightning-neon" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#0284c7" floodOpacity="0.8" />
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#38bdf8" floodOpacity="0.9" />
          <feDropShadow dx="0" dy="0" stdDeviation="0.5" floodColor="#ffffff" floodOpacity="1" />
        </filter>

        {/* Heavy metal shadow for depth structure */}
        <filter id="gear-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="5" stdDeviation="5" floodColor="#000000" floodOpacity="0.9" />
        </filter>
      </defs>

      {/* Background Circular Shield Block */}
      <g filter="url(#gear-shadow)" id="ragnarok-outer-ring">
        {/* Outer rugged circle */}
        <circle cx="250" cy="250" r="185" fill="#090d16" stroke="url(#metal-grad)" strokeWidth="12" />
        {/* Inner track border */}
        <circle cx="250" cy="250" r="162" fill="#030712" stroke="#1e293b" strokeWidth="4" />
        <circle cx="250" cy="250" r="150" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 11" opacity="0.3" />
        
        {/* Cracked workshop scars inside shield */}
        <path d="M 140 160 L 165 175 L 160 195" stroke="#334155" strokeWidth="2.5" fill="none" opacity="0.5" />
        <path d="M 330 150 L 310 170 L 320 185" stroke="#334155" strokeWidth="2.5" fill="none" opacity="0.5" />
        <path d="M 220 340 L 235 325" stroke="#334155" strokeWidth="2" fill="none" opacity="0.4" />
        <path d="M 285 345 L 275 330" stroke="#334155" strokeWidth="2" fill="none" opacity="0.4" />
      </g>

      {/* Crossed Wrenches */}
      <g id="crossed-wrenches" filter="url(#gear-shadow)">
        {/* Shaft 1 (rotated -45 for X) */}
        <g transform="rotate(-45 250 250)">
          <rect x="234" y="60" width="32" height="380" rx="6" fill="url(#metal-grad)" />
          {/* Inner groove for mechanical accent */}
          <rect x="242" y="80" width="16" height="340" rx="2" fill="#0f172a" />
          
          {/* C-Wrench Head Top */}
          <path d="M 210 80 C 210 40, 290 40, 290 80 C 290 102, 270 114, 250 114 C 230 114, 210 102, 210 80 Z" fill="url(#metal-grad)" />
          {/* Top jaws cutout angled */}
          <rect x="236" y="32" width="28" height="42" rx="3" fill="#030712" transform="rotate(15 250 80)" />
          
          {/* C-Wrench Head Bottom */}
          <path d="M 210 420 C 210 380, 290 380, 290 420 C 290 442, 270 454, 250 454 C 230 454, 210 442, 210 420 Z" fill="url(#metal-grad)" />
          {/* Bottom jaws cutout angled */}
          <rect x="236" y="386" width="28" height="42" rx="3" fill="#030712" transform="rotate(15 250 420)" />
        </g>

        {/* Shaft 2 (rotated 45 for X) */}
        <g transform="rotate(45 250 250)">
          <rect x="234" y="60" width="32" height="380" rx="6" fill="url(#metal-grad)" />
          <rect x="242" y="80" width="16" height="340" rx="2" fill="#0f172a" />
          
          {/* C-Wrench Head Top */}
          <path d="M 210 80 C 210 40, 290 40, 290 80 C 290 102, 270 114, 250 114 C 230 114, 210 102, 210 80 Z" fill="url(#metal-grad)" />
          <rect x="236" y="32" width="28" height="42" rx="3" fill="#030712" transform="rotate(-15 250 80)" />
          
          {/* C-Wrench Head Bottom */}
          <path d="M 210 420 C 210 380, 290 380, 290 420 C 290 442, 270 454, 250 454 C 230 454, 210 442, 210 420 Z" fill="url(#metal-grad)" />
          <rect x="236" y="386" width="28" height="42" rx="3" fill="#030712" transform="rotate(-15 250 420)" />
        </g>
      </g>

      {/* Workshop rust coating mix blend */}
      <circle cx="250" cy="250" r="182" fill="url(#dust-grad)" className="mix-blend-color-burn" pointerEvents="none" />

      {/* Epic Central Lightning Bolt */}
      <g filter={glow ? 'url(#lightning-neon)' : 'url(#gear-shadow)'} id="central-lightning-bolt">
        {/* Core Electric Bolt */}
        <path
          d="M 275 35 L 180 250 L 255 250 L 160 465 L 340 220 L 265 220 Z"
          fill="url(#metal-grad)"
          stroke="#bae6fd"
          strokeWidth="3.5"
        />
        {/* Glowing electric fluid inside bolt */}
        <path
          d="M 270 50 L 193 240 L 252 240 L 175 440 L 322 230 L 263 230 Z"
          fill="#ffffff"
          opacity="0.95"
        />
      </g>

      {/* Secondary lightning crackles outside bolt */}
      {glow && (
        <g stroke="#38bdf8" strokeWidth="2.5" fill="none" opacity="0.85" id="ambient-bolt-sparks" className="lightning-sparks animate-pulse">
          <path d="M 295 100 Q 340 90 350 115 T 390 110" />
          <path d="M 165 190 Q 120 180 110 205 T 75 200" />
          <path d="M 330 300 Q 380 310 390 285 T 435 305" />
          <path d="M 195 380 Q 160 405 170 425 T 135 445" />
        </g>
      )}

      {/* Logos & Branding Typography Overlays */}
      <g filter="url(#gear-shadow)" id="brand-typography-overlay">
        {/* Curving WORKSHOP above the shield */}
        <path id="circle-text-curve" d="M 85 240 A 165 165 0 0 1 415 240" fill="none" />
        <text className="font-sans font-extrabold tracking-[0.24em] text-[20px] fill-slate-300 uppercase">
          <textPath href="#circle-text-curve" startOffset="50%" textAnchor="middle">
            WORKSHOP
          </textPath>
        </text>

        {/* Big RAGNARÖK Title below shield center */}
        <g transform="translate(250, 400)">
          {/* Custom drawing text using Metal Mania display font */}
          <text
            textAnchor="middle"
            className="font-[Metal-Mania] tracking-[6px] text-[58px] fill-amber-500 uppercase font-black"
            stroke="#030712"
            strokeWidth="3"
            style={{ fontFamily: '"Metal Mania", "Cinzel", serif' }}
          >
            RAGNARÖK
          </text>
        </g>
      </g>
    </svg>
  );
}
