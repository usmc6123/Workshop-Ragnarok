import React, { useState, useEffect } from 'react';

const SLOGANS = [
  "WRENCHES UP!",
  "CLAWS ON THE JOB",
  "PAWS READY TO ROLL",
  "MEOW WE WORK",
  "NINE LIVES, ONE GARAGE",
  "FUR REAL FIXED RIGHT",
  "PURR-FORMANCE GUARANTEED",
  "CATS THAT CRANK",
];

export default function MechanicSlogan({ intervalMs = 6000 }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % SLOGANS.length);
        setVisible(true);
      }, 300);
    }, intervalMs);
    return () => clearInterval(cycle);
  }, [intervalMs]);

  return (
    <div
      style={{
        position: 'absolute',
        top: '2%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '78%',
        zIndex: 3,
        pointerEvents: 'none',
      }}
    >
      <svg viewBox="0 0 300 150" width="100%" style={{ display: 'block' }}>
        <defs>
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur1" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="metalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a3530" />
            <stop offset="50%" stopColor="#241f1b" />
            <stop offset="100%" stopColor="#171310" />
          </linearGradient>
        </defs>

        <line x1="70" y1="0" x2="85" y2="22" stroke="#5a5650" strokeWidth="2" />
        <line x1="230" y1="0" x2="215" y2="22" stroke="#5a5650" strokeWidth="2" />
        <circle cx="70" cy="0" r="3" fill="#5a5650" />
        <circle cx="230" cy="0" r="3" fill="#5a5650" />

        <polygon
          points="150,20 250,42 250,120 50,120 50,42"
          fill="url(#metalGrad)"
          stroke="#4a453e"
          strokeWidth="2"
        />
        <polygon
          points="150,20 250,42 250,120 50,120 50,42"
          fill="none"
          stroke="#6b6459"
          strokeWidth="1"
          opacity="0.5"
        />

        <circle cx="60" cy="52" r="3.5" fill="#7a7268" />
        <circle cx="240" cy="52" r="3.5" fill="#7a7268" />
        <circle cx="60" cy="110" r="3.5" fill="#7a7268" />
        <circle cx="240" cy="110" r="3.5" fill="#7a7268" />

        <text
          x="150"
          y="88"
          textAnchor="middle"
          fontFamily="'JetBrains Mono', monospace"
          fontWeight="800"
          fontSize={SLOGANS[index].length > 16 ? 16 : 20}
          fill="#ffb35c"
          filter="url(#neonGlow)"
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.3s ease',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          {SLOGANS[index]}
        </text>
      </svg>
    </div>
  );
}
