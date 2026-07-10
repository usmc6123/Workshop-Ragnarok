import React, { useRef, useState, useCallback, useEffect } from 'react';

interface CustomersHeaderVideoProps {
  sources: string[];
}

export default function CustomersHeaderVideo({ sources }: CustomersHeaderVideoProps) {
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleEnded = useCallback(() => {
    setIndex((prev) => (prev + 1) % sources.length);
  }, [sources.length]);

  const handleRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node) {
      node.muted = true;
      node.load();
      node.play().catch((err) => {
        console.warn("[DEBUG] CustomersHeaderVideo playback failed:", err);
      });
    }
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden rounded-xl bg-slate-950 z-0 select-none">
      <video
        key={index}
        ref={handleRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={handleEnded}
        className="absolute inset-0 w-full h-full object-cover brightness-110 contrast-100"
        style={{
          maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)',
        }}
      >
        <source src={sources[index]} type="video/mp4" />
      </video>

      {/* Dark semi-transparent overlay/scrim */}
      <div className="absolute inset-0 bg-slate-950/25 mix-blend-multiply pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg-theme via-transparent to-bg-theme/40 pointer-events-none" />
    </div>
  );
}
