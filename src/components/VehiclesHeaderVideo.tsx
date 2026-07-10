import React, { useRef, useState, useCallback, useEffect } from 'react';

interface VehiclesHeaderVideoProps {
  sources: string[];
}

export default function VehiclesHeaderVideo({ sources }: VehiclesHeaderVideoProps) {
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
        console.warn("[DEBUG] VehiclesHeaderVideo playback failed:", err);
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
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          maskImage: 'radial-gradient(ellipse at center, black 65%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 65%, transparent 100%)',
        }}
      >
        <source src={sources[index]} type="video/mp4" />
      </video>

      {/* Dark semi-transparent overlay/scrim - matches dashboard brightness */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.15) 100%)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg-theme via-transparent to-bg-theme/40 pointer-events-none" />
    </div>
  );
}
