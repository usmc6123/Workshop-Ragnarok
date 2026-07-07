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

function wrapSlogan(text) {
  if (text.length <= 13) return [text];
  const words = text.split(' ');
  if (words.length === 1) return [text];

  let bestSplit = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const line1 = words.slice(0, i).join(' ');
    const line2 = words.slice(i).join(' ');
    const diff = Math.abs(line1.length - line2.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestSplit = i;
    }
  }
  return [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')];
}

export default function MechanicSlogan() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % SLOGANS.length);
        setVisible(true);
      }, 300);
    }, 6000);
    return () => clearInterval(cycle);
  }, []);

  const text = SLOGANS[index];
  const lines = wrapSlogan(text);
  const longestLine = Math.max(...lines.map((l) => l.length));
  const fontSize = longestLine > 14 ? 155 : longestLine > 10 ? 195 : 245;
  const lineHeight = fontSize * 1.05;
  const startY = 800 - ((lines.length - 1) * lineHeight) / 2;

  return (
    <div
      style={{
        position: 'absolute',
        top: '1%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '92%',
        zIndex: 3,
        pointerEvents: 'none',
      }}
    >
      <div style={{ position: 'relative', width: '100%' }}>
        <img
          src="/slogan-frame.png"
          alt=""
          style={{ width: '100%', display: 'block' }}
        />
        <svg
          viewBox="0 0 2814 1536"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        >
          <defs>
            <filter id="signGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="14" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <text
            x="1407"
            y={startY}
            textAnchor="middle"
            fontFamily="'JetBrains Mono', monospace"
            fontWeight="800"
            fontSize={fontSize}
            fill="#ffc177"
            filter="url(#signGlow)"
            style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
          >
            {lines.map((line, i) => (
              <tspan key={i} x="1407" dy={i === 0 ? 0 : lineHeight}>
                {line}
              </tspan>
            ))}
          </text>
        </svg>
      </div>
    </div>
  );
}
