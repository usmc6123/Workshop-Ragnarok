import React, { useRef, useState, useCallback } from 'react';
import MechanicSlogan from './MechanicSlogan';

function StatPlate({ label, value, style }) {
  return (
    <div style={{ position: 'absolute', width: '58%', ...style }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <img
          src="/stat-plate-frame.png"
          alt=""
          style={{ width: '100%', display: 'block' }}
        />
        <svg
          viewBox="0 0 3584 1184"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <defs>
            <filter id={`statGlow-${label}`} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="10" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <text
            x="1792"
            y="470"
            textAnchor="middle"
            fontFamily="'JetBrains Mono', monospace"
            fontWeight="600"
            fontSize="140"
            letterSpacing="4"
            fill="rgba(226,232,220,0.9)"
            style={{ textTransform: 'uppercase' }}
          >
            {label}
          </text>
          <text
            x="1792"
            y="730"
            textAnchor="middle"
            fontFamily="'JetBrains Mono', monospace"
            fontWeight="800"
            fontSize="245"
            fill="#ffc177"
            filter={`url(#statGlow-${label})`}
          >
            {value}
          </text>
        </svg>
      </div>
    </div>
  );
}

export default function JobsPanelVideo({ 
  sources, 
  hoursPendingValue = "14.5 HRS", 
  lowStockValue = "3 ITEMS", 
  queueValue = "12 VEHICLES" 
}) {
  const [index, setIndex] = useState(0);
  const videoRef = useRef(null);

  const handleEnded = useCallback(() => {
    setIndex((prev) => (prev + 1) % sources.length);
  }, [sources.length]);

  const handleRef = useCallback((node) => {
    videoRef.current = node;
    if (node) {
      node.muted = true;
      node.load();
      node.play().catch(() => {});
    }
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 420,
        aspectRatio: '9 / 16',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          borderRadius: 12,
          maskImage:
            'radial-gradient(ellipse at center, black 55%, transparent 90%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 55%, transparent 90%)',
        }}
      >
        <video
          key={index}
          ref={handleRef}
          autoPlay
          muted={true}
          playsInline
          preload="auto"
          onEnded={handleEnded}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.85) saturate(0.9)',
          }}
        >
          <source src={sources[index]} type="video/mp4" />
        </video>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(11,18,16,0.45) 0%, rgba(11,18,16,0.05) 35%, rgba(11,18,16,0.05) 70%, rgba(11,18,16,0.75) 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      <MechanicSlogan />

      <StatPlate
        label="Hours Pending"
        value={hoursPendingValue}
        style={{ top: '30%', left: '4%', zIndex: 2 }}
      />
      <StatPlate
        label="Low Stock"
        value={lowStockValue}
        style={{ top: '42%', left: '4%', zIndex: 2 }}
      />
      <StatPlate
        label="Queue"
        value={queueValue}
        style={{ top: '54%', left: '4%', zIndex: 2 }}
      />
    </div>
  );
}
