import React, { useRef, useState, useCallback } from 'react';

export default function JobsPanelVideo({ sources }) {
  const [index, setIndex] = useState(0);
  const videoRef = useRef(null);

  const handleEnded = useCallback(() => {
    setIndex((prev) => (prev + 1) % sources.length);
  }, [sources.length]);

  const handleRef = useCallback((node) => {
    videoRef.current = node;
    if (node) {
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
        backgroundColor: '#0b1210',
        border: '1px solid #2a332e',
      }}
    >
      <video
        key={index}
        ref={handleRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={handleEnded}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      >
        <source src={sources[index]} type="video/mp4" />
      </video>
    </div>
  );
}
