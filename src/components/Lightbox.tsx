/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react';

interface LightboxProps {
  imageSrc: string;
  imageAlt: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function Lightbox({ imageSrc, imageAlt, isOpen, onClose }: LightboxProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const touchStartDist = useRef<number | null>(null);
  const touchStartScale = useRef<number>(1);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Reset scale and position when opening
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Zoom helpers
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.3, 5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.3, 0.5));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Drag/Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile pinch-to-zoom & panning
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single finger drag
      const touch = e.touches[0];
      setIsDragging(true);
      dragStart.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
      touchStartDist.current = null;
    } else if (e.touches.length === 2) {
      // Double finger pinch-to-zoom
      setIsDragging(false);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      touchStartDist.current = dist;
      touchStartScale.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.current.x,
        y: touch.clientY - dragStart.current.y,
      });
    } else if (e.touches.length === 2 && touchStartDist.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const factor = dist / touchStartDist.current;
      const newScale = Math.min(Math.max(touchStartScale.current * factor, 0.5), 5);
      setScale(newScale);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartDist.current = null;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950/98 p-4 md:p-6"
      id="lightbox-backdrop"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      tabIndex={0}
    >
      {/* Top bar */}
      <div className="w-full flex items-center justify-between z-10 bg-slate-900/40 backdrop-blur-md rounded-lg p-3 border border-slate-800/50">
        <div className="flex flex-col">
          <span className="text-xs text-amber-500 font-mono tracking-wider font-semibold uppercase">Technical Drawing</span>
          <span className="text-xs md:text-sm text-slate-300 font-sans font-medium line-clamp-1">{imageAlt || 'Diagram Detail'}</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          title="Close Lightbox (Esc)"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image Stage */}
      <div 
        className="relative flex-1 w-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        id="lightbox-canvas-area"
      >
        <div 
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="relative max-h-full max-w-full origin-center"
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt={imageAlt}
            draggable={false}
            referrerPolicy="no-referrer"
            className="max-h-[80vh] max-w-[90vw] md:max-h-[85vh] md:max-w-[85vw] object-contain rounded shadow-2xl pointer-events-none"
          />
        </div>

        {/* Floating guide */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-850 text-[10px] text-slate-400 font-mono tracking-wider uppercase pointer-events-none text-center">
          Drag to Pan • Pinch or Scroll to Zoom
        </div>
      </div>

      {/* Toolbar Controls */}
      <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-full border border-slate-800/80 flex items-center gap-4 z-10 shadow-lg">
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-800 transition-all"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <span className="text-xs font-mono font-medium text-slate-300 min-w-[40px] text-center bg-slate-950/80 px-2.5 py-1 rounded-full border border-slate-850">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-800 transition-all"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <div className="w-px h-4 bg-slate-800" />
        <button
          onClick={handleReset}
          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-800 transition-all flex items-center gap-1 text-xs font-mono font-medium"
          title="Reset Zoom"
          aria-label="Reset Zoom and Centering"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}
