import React, { useRef, useState, useCallback } from 'react';

const STATUS_LABELS = [
  "ON THE CLOCK",
  "WRENCHES READY",
  "FULLY CHARGED",
  "SUITED UP",
];

export default function JobsPanelVideo({ sources }) {
  const [index, setIndex] = useState(0);
  const [statusLabel] = useState(
    () => STATUS_LABELS[Math.floor(Math.random() * STATUS_LABELS.length)]
  );
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
        overflow: 'hidden',
        borderRadius: 12,
        backgroundColor: 'transparent',
        // Soft fade at all edges so the video dissolves into the page
        // background instead of reading as a hard-edged rectangle.
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
          // Slightly desaturate/darken the garage background so it
          // recedes into the page's dark theme rather than competing
          // with it; the glowing cats still read as the bright focal point.
          filter: 'brightness(0.85) saturate(0.9)',
        }}
      >
        <source src={sources[index]} type="video/mp4" />
      </video>

      {/* Dark gradient wash tying the video into the page's color palette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(11,18,16,0.45) 0%, rgba(11,18,16,0.05) 35%, rgba(11,18,16,0.05) 70%, rgba(11,18,16,0.75) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Floating status badge, styled like the ticket status badges elsewhere in the app */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 999,
          background: 'rgba(14, 25, 20, 0.7)',
          border: '1px solid rgba(217,123,46,0.4)',
          backdropFilter: 'blur(4px)',
          fontSize: 11,
          fontFamily: 'monospace',
          letterSpacing: '0.05em',
          color: '#f2a65a',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#4ade80',
            boxShadow: '0 0 6px #4ade80',
          }}
        />
        {statusLabel}
      </div>
    </div>
  );
}
