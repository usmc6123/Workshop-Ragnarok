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
  const fontSize = text.length > 18 ? 15 : text.length > 13 ? 19 : 24;

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
        <div
          style={{
            position: 'absolute',
            top: '19%',
            left: '20%',
            right: '20%',
            bottom: '38%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 800,
              fontSize,
              color: '#ffb35c',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              textShadow:
                '0 0 8px rgba(255,179,92,0.75), 0 0 16px rgba(255,140,40,0.45), 0 2px 4px rgba(0,0,0,0.6)',
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.3s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {text}
          </span>
        </div>
      </div>
    </div>
  );
}
