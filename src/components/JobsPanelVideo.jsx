import React, { useRef, useState, useCallback } from 'react';
import MechanicSlogan from './MechanicSlogan';

function StatOverlay({ icon, label, value, style }) {
  return (
    <div
      style={{
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        textShadow: '0 2px 6px rgba(0,0,0,0.85), 0 1px 2px rgba(0,0,0,0.9)',
        ...style,
      }}
    >
      <span
        style={{
          display: 'flex',
          color: '#f2a65a',
          flexShrink: 0,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
        }}
      >
        {icon}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(226, 232, 220, 0.75)',
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: '#f2a65a',
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

const WrenchIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const OilCanIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 22h12l2-14H5L3 22z" />
    <path d="M9 8V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" />
    <path d="M17 8l3-2" />
  </svg>
);

const CarIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 13l1.5-4.5A2 2 0 0 1 6.4 7h11.2a2 2 0 0 1 1.9 1.5L21 13" />
    <path d="M3 13h18v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4z" />
    <circle cx="7.5" cy="17.5" r="1.5" />
    <circle cx="16.5" cy="17.5" r="1.5" />
  </svg>
);

export default function JobsPanelVideo({ sources }) {
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

      <StatOverlay
        icon={WrenchIcon}
        label="Avg Repair Time"
        value="3.2 HRS"
        style={{ top: '18%', left: '10%', zIndex: 2 }}
      />
      <StatOverlay
        icon={OilCanIcon}
        label="Low Stock"
        value="3 ITEMS"
        style={{ top: '46%', left: '10%', zIndex: 2 }}
      />
      <StatOverlay
        icon={CarIcon}
        label="Queue"
        value="12 VEHICLES"
        style={{ top: '68%', left: '10%', zIndex: 2 }}
      />
    </div>
  );
}
