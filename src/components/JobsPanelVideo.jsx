import React, { useRef, useState, useCallback } from 'react';
import MechanicSlogan from './MechanicSlogan';

function StatPlate({ iconPaths, label, value, style }) {
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
          <g
            transform="translate(330,592) scale(11) translate(-12,-12)"
            filter={`url(#statGlow-${label})`}
            stroke="#ffc177"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {iconPaths.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          <text
            x="700"
            y="470"
            fontFamily="'JetBrains Mono', monospace"
            fontWeight="600"
            fontSize="120"
            letterSpacing="4"
            fill="rgba(226,232,220,0.9)"
            style={{ textTransform: 'uppercase' }}
          >
            {label}
          </text>
          <text
            x="700"
            y="730"
            fontFamily="'JetBrains Mono', monospace"
            fontWeight="800"
            fontSize="210"
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

const WRENCH_PATHS = [
  "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
];

const PACKAGE_PATHS = [
  "M16.5 9.4 7.5 4.21",
  "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  "M3.27 6.96 12 12.01l8.73-5.05",
  "M12 22.08V12",
];

const CAR_PATHS = [
  "M3 13l1.5-4.5A2 2 0 0 1 6.4 7h11.2a2 2 0 0 1 1.9 1.5L21 13",
  "M3 13h18v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4z",
];

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

      <StatPlate
        iconPaths={WRENCH_PATHS}
        label="Avg Repair"
        value="3.2 HRS"
        style={{ top: '30%', left: '4%', zIndex: 2 }}
      />
      <StatPlate
        iconPaths={PACKAGE_PATHS}
        label="Low Stock"
        value="3 ITEMS"
        style={{ top: '52%', left: '4%', zIndex: 2 }}
      />
      <StatPlate
        iconPaths={CAR_PATHS}
        label="Queue"
        value="12 VEHICLES"
        style={{ top: '74%', left: '4%', zIndex: 2 }}
      />
    </div>
  );
}
