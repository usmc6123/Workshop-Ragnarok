import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { SiteBlock, BlockStyle, ThemeConfig, DeviceBreakpoint, MediaTransform } from '../types';
import {
  GRID_COLUMNS, ROW_UNIT_PX, GridPosition,
  clampCol, clampColSpan, clampRow, clampRowSpan, positionFromStyle,
} from '../constants/siteGrid';
import { blockMeta } from '../constants/siteBlockTypes';
import SiteBlockView, { parseJson, getMediaTransform } from './SiteBlockRenderers';
import { Copy, Trash2, Settings2, Move, Lock, ZoomIn, ZoomOut, RotateCcw, RotateCw, Check, Eye, EyeOff } from 'lucide-react';

type HandleDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface TransformEditTarget {
  blockId: number;
  mediaKey: string;
}

// Finds the nearest ancestor (inclusive) carrying data-media-key, starting
// from wherever the user actually right-clicked — this is how we figure out
// WHICH image in a multi-image block (e.g. one photo out of an Image Gallery)
// they meant, without SiteGridCanvas needing to know each block type's
// internal layout.
function findMediaKey(target: EventTarget | null): string | null {
  let el = target as HTMLElement | null;
  while (el) {
    const key = el.dataset?.mediaKey;
    if (key) return key;
    el = el.parentElement;
  }
  return null;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
function clampZoom(z: number) { return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z)); }
function maxPanPercent(zoom: number) { return 50 * (1 - 1 / zoom); }
function clampPan(v: number, zoom: number) { const m = maxPanPercent(zoom); return Math.max(-m, Math.min(m, v)); }

// The interactive "Zoom & Position" layer — a transparent, precisely-
// positioned box overlaid exactly on top of whichever media element is being
// adjusted (found via data-media-key, sized in percentages relative to the
// block so it stays correct regardless of the canvas's own zoom-to-fit
// scale). Scroll to zoom, drag to pan; both are computed relative to the
// overlay's own on-screen size so the feel is consistent at any canvas scale
// or media zoom level.
function TransformOverlay({
  containerEl, mediaKey, transform, onChange, onDone,
}: {
  containerEl: HTMLElement;
  mediaKey: string;
  transform: MediaTransform;
  onChange: (next: MediaTransform) => void;
  onDone: () => void;
}) {
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null);

  const measure = useCallback(() => {
    const mediaEl = containerEl.querySelector<HTMLElement>(`[data-media-key="${mediaKey}"]`);
    if (!mediaEl) { setRect(null); return; }
    const containerRect = containerEl.getBoundingClientRect();
    const mediaRect = mediaEl.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return;
    setRect({
      left: ((mediaRect.left - containerRect.left) / containerRect.width) * 100,
      top: ((mediaRect.top - containerRect.top) / containerRect.height) * 100,
      width: (mediaRect.width / containerRect.width) * 100,
      height: (mediaRect.height / containerRect.height) * 100,
    });
  }, [containerEl, mediaKey]);

  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(containerEl);
    return () => observer.disconnect();
  }, [measure, containerEl]);

  // React's synthetic onWheel is attached passively at the root, so calling
  // preventDefault() from it does NOT reliably stop the page underneath from
  // scrolling too (a known React/browser gotcha, not a bug in the handler
  // itself) — the fix is a real native listener with { passive: false },
  // which is the only way the browser honors preventDefault() on wheel.
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const t = transformRef.current;
      const nextZoom = clampZoom(t.zoom - e.deltaY * 0.0015);
      onChangeRef.current({ zoom: nextZoom, x: clampPan(t.x, nextZoom), y: clampPan(t.y, nextZoom) });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [rect]);

  // Escape or right-click both exit the mode — right-click intentionally
  // does NOT open the normal block context menu while this is active, since
  // that would be a confusing double-mode; treat it purely as an exit.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDone(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startTx: transform.x, startTy: transform.y };
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !overlayRef.current) return;
    e.stopPropagation();
    const box = overlayRef.current.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    // Screen-pixel drag distance -> percent of the media's own box -> divided
    // by zoom, since `translate(x%, y%) scale(zoom)` applies the scale AFTER
    // the translate, amplifying it — without dividing here, dragging would
    // feel like it accelerates the more zoomed in you are.
    const dxPercent = ((e.clientX - drag.startX) / box.width) * 100 / transform.zoom;
    const dyPercent = ((e.clientY - drag.startY) / box.height) * 100 / transform.zoom;
    onChange({
      zoom: transform.zoom,
      x: clampPan(drag.startTx + dxPercent, transform.zoom),
      y: clampPan(drag.startTy + dyPercent, transform.zoom),
    });
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  if (!rect) return null;

  return (
    <div
      ref={overlayRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onDone(); }}
      className="absolute z-40 cursor-grab active:cursor-grabbing ring-2 ring-amber-400 rounded-lg bg-black/10"
      style={{ left: `${rect.left}%`, top: `${rect.top}%`, width: `${rect.width}%`, height: `${rect.height}%` }}
    >
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute -top-9 left-0 flex items-center gap-1 px-1.5 h-7 rounded-lg bg-[#1a1c24] border border-white/10 shadow-lg z-50"
      >
        <button onClick={() => onChange({ ...transform, zoom: clampZoom(transform.zoom - 0.2) })} className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer" title="Zoom out">
          <ZoomOut className="w-3 h-3" />
        </button>
        <span className="text-[9px] font-mono text-slate-400 w-9 text-center">{Math.round(transform.zoom * 100)}%</span>
        <button onClick={() => onChange({ ...transform, zoom: clampZoom(transform.zoom + 0.2) })} className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer" title="Zoom in">
          <ZoomIn className="w-3 h-3" />
        </button>
        <button onClick={() => onChange({ ...transform, rotate: ((transform.rotate || 0) + 90) % 360 })} className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer" title="Rotate 90°">
          <RotateCw className="w-3 h-3" />
        </button>
        <button onClick={() => onChange({ zoom: 1, x: 0, y: 0, rotate: 0 })} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer" title="Reset">
          <RotateCcw className="w-3 h-3" />
        </button>
        <button onClick={onDone} className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 cursor-pointer" title="Done">
          <Check className="w-3 h-3" />
        </button>
      </div>
      <p className="absolute -bottom-6 left-0 text-[9px] text-slate-500 font-mono whitespace-nowrap">Scroll to zoom, drag to reposition — right-click or Esc to exit</p>
    </div>
  );
}

// Tablet still renders the real 12-column grid (only phones collapse to a
// single stacked column, matching the 640px breakpoint SitePageView uses) —
// it just previews at a narrower canvas width so multi-column rows can be
// checked for cramping before they ever hit a real tablet.
const MAX_WIDTH_PX: Record<DeviceBreakpoint, number> = { desktop: 1152, tablet: 768, mobile: 375 };

const HANDLE_CURSOR: Record<HandleDir, string> = {
  n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
  ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize',
};

interface DragState {
  blockId: number;
  mode: 'move' | 'resize';
  handle?: HandleDir;
  startPointerX: number;
  startPointerY: number;
  startPos: GridPosition;
  colWidthPx: number;
  scale: number;
}

export default function SiteGridCanvas({
  blocks, selectedId, device, theme, dark, accent,
  onSelect, onContentChange, onStyleChange, onDuplicate, onDelete, onPositionChange, onContextMenu, onOpenInspector,
  transformEditTarget, onTransformChange, onExitTransformEdit,
}: {
  blocks: SiteBlock[];
  selectedId: number | null;
  device: DeviceBreakpoint;
  theme: ThemeConfig;
  dark: boolean;
  accent: string;
  onSelect: (id: number | null) => void;
  onContentChange: (blockId: number, content: any) => void;
  onStyleChange?: (blockId: number, style: BlockStyle) => void;
  onDuplicate: (block: SiteBlock) => void;
  onDelete: (block: SiteBlock) => void;
  onPositionChange: (blockId: number, position: GridPosition) => void;
  onContextMenu: (block: SiteBlock, x: number, y: number, mediaKey: string | null) => void;
  onOpenInspector: (block: SiteBlock) => void;
  transformEditTarget: TransformEditTarget | null;
  onTransformChange: (blockId: number, mediaKey: string, next: MediaTransform) => void;
  onExitTransformEdit: () => void;
}) {
  // The canvas's own content ALWAYS renders at the device's true design width
  // (1152/768/375px) so column widths, row heights, and drag math never
  // change — it's then visually scaled down as a single rigid unit to fit
  // whatever space is actually available. Before this, the canvas rendered
  // at whatever width its flex container happened to give it (which shrinks
  // whenever the inspector panel opens) while row height stayed a fixed
  // pixel amount — so opening the inspector didn't just make the preview
  // smaller, it visibly distorted every block's aspect ratio, and the "page
  // width preview" label became a lie the moment the panel was narrower than
  // the claimed width. Scaling as a whole fixes both: proportions never
  // distort, and what you see is always geometrically the live site, just
  // zoomed out.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const blockContentRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [availableWidth, setAvailableWidth] = useState(1152);
  const [liveOverrides, setLiveOverrides] = useState<Record<number, GridPosition>>({});
  const dragState = useRef<DragState | null>(null);
  const isMobilePreview = device === 'mobile';
  const designWidth = MAX_WIDTH_PX[device];
  const scale = Math.min(1, availableWidth / designWidth) || 1;

  useEffect(() => {
    const measure = () => { if (wrapperRef.current) setAvailableWidth(wrapperRef.current.clientWidth); };
    measure();
    const observer = new ResizeObserver(measure);
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [device]);

  const positions = blocks.reduce<Record<number, GridPosition>>((acc, b, idx) => {
    acc[b.id] = liveOverrides[b.id] || positionFromStyle(parseJson<BlockStyle>(b.style, {}), idx * 12);
    return acc;
  }, {});

  const totalRows = Math.max(20, ...blocks.map(b => positions[b.id].grid_row + positions[b.id].grid_row_span)) + 4;
  const colWidthPx = designWidth / GRID_COLUMNS;

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const drag = dragState.current;
    if (!drag) return;
    // Mouse movement is in real screen pixels, but the canvas is visually
    // shrunk by `scale` — so a screen-pixel delta corresponds to a bigger
    // delta in the canvas's own (unscaled) coordinate space.
    const dx = (e.clientX - drag.startPointerX) / drag.scale;
    const dy = (e.clientY - drag.startPointerY) / drag.scale;
    const dCol = dx / drag.colWidthPx;
    const dRow = dy / ROW_UNIT_PX;
    let next: GridPosition = { ...drag.startPos };

    if (drag.mode === 'move') {
      next.grid_col = clampCol(drag.startPos.grid_col + dCol);
      next.grid_col_span = clampColSpan(next.grid_col, drag.startPos.grid_col_span);
      next.grid_row = clampRow(drag.startPos.grid_row + dRow);
    } else {
      const h = drag.handle!;
      if (h.includes('e')) next.grid_col_span = clampColSpan(drag.startPos.grid_col, drag.startPos.grid_col_span + dCol);
      if (h.includes('w')) {
        const newCol = clampCol(drag.startPos.grid_col + dCol);
        const delta = drag.startPos.grid_col - newCol;
        next.grid_col = newCol;
        next.grid_col_span = clampColSpan(newCol, drag.startPos.grid_col_span + delta);
      }
      if (h.includes('s')) next.grid_row_span = clampRowSpan(drag.startPos.grid_row_span + dRow);
      if (h.includes('n')) {
        const newRow = clampRow(drag.startPos.grid_row + dRow);
        const delta = drag.startPos.grid_row - newRow;
        next.grid_row = newRow;
        next.grid_row_span = clampRowSpan(drag.startPos.grid_row_span + delta);
      }
    }
    setLiveOverrides(prev => ({ ...prev, [drag.blockId]: next }));
  }, []);

  const handlePointerUp = useCallback(() => {
    const drag = dragState.current;
    if (!drag) return;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    const finalPos = liveOverrides[drag.blockId];
    dragState.current = null;
    if (finalPos) onPositionChange(drag.blockId, finalPos);
  }, [handlePointerMove, liveOverrides, onPositionChange]);

  const startDrag = (e: React.PointerEvent, block: SiteBlock, mode: 'move' | 'resize', handle?: HandleDir) => {
    if (isMobilePreview) return; // mobile preview is read-only — it shows the real collapsed stacking order, not an editable layout
    e.preventDefault();
    e.stopPropagation();
    onSelect(block.id);
    dragState.current = {
      blockId: block.id,
      mode,
      handle,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      startPos: positions[block.id],
      colWidthPx,
      scale,
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const HANDLES: HandleDir[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  // Toolbar sits 32px above the block by default; when a block is dragged near
  // the canvas's own top edge there isn't 32px of room above it, and since the
  // canvas has overflow-hidden, the toolbar (and the top-row resize handles,
  // which sit 5px above) get clipped and become invisible/unclickable. Below
  // this threshold we flip both to render just inside the block's top edge.
  const TOOLBAR_CLEARANCE_PX = 36;
  const getHandlePos = (nearTop: boolean): Record<HandleDir, React.CSSProperties> => ({
    n: { top: nearTop ? 5 : -5, left: '50%', transform: 'translateX(-50%)' },
    s: { bottom: -5, left: '50%', transform: 'translateX(-50%)' },
    e: { right: -5, top: '50%', transform: 'translateY(-50%)' },
    w: { left: -5, top: '50%', transform: 'translateY(-50%)' },
    ne: { top: nearTop ? 5 : -5, right: -5 },
    nw: { top: nearTop ? 5 : -5, left: -5 },
    se: { bottom: -5, right: -5 },
    sw: { bottom: -5, left: -5 },
  });

  // In mobile preview, blocks render stacked full-width in (row, col) order —
  // exactly what SitePageView's own mobile collapse produces — so what's
  // shown here is a true preview, not a guess.
  const orderedForMobile = [...blocks].sort((a, b) => {
    const pa = positions[a.id], pb = positions[b.id];
    return (pa.grid_row - pb.grid_row) || (pa.grid_col - pb.grid_col);
  });

  const canvasHeight = isMobilePreview ? undefined : totalRows * ROW_UNIT_PX;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
        <span>{isMobilePreview ? 'Mobile preview — stacked order, matches the live site' : device === 'tablet' ? 'Tablet-width preview — grid layout still applies' : 'Page width preview — matches the live site\'s max width'}</span>
        <span>{designWidth}px{scale < 1 ? ` (zoomed to ${Math.round(scale * 100)}% to fit — proportions match the live site exactly)` : ''}</span>
      </div>
      {/* Measures available space only — the canvas itself always renders at
          the device's true design width, then gets visually scaled down as a
          rigid unit to fit here, so proportions never distort. This sizing
          box reserves the actual SHRUNK footprint in the surrounding layout
          (a transform alone wouldn't do that — the browser would still think
          the canvas takes up its full unscaled size). */}
      <div ref={wrapperRef} className="w-full">
        <div className="mx-auto" style={{ width: designWidth * scale, height: canvasHeight ? canvasHeight * scale : undefined }}>
          <div
            ref={canvasRef}
            onPointerDown={() => onSelect(null)}
            className="relative rounded-2xl border-2 border-dashed border-[#2a2d3a] bg-[#0a0b0f] overflow-hidden transition-all duration-300"
            style={{ width: designWidth, height: canvasHeight, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          >
        {!isMobilePreview && (
          <div className="absolute inset-0 pointer-events-none flex">
            {Array.from({ length: GRID_COLUMNS }).map((_, i) => (
              <div key={i} className="flex-1 border-r border-white/[0.03] last:border-r-0" />
            ))}
          </div>
        )}

        {isMobilePreview ? (
          <div className="flex flex-col gap-4 p-4">
            {orderedForMobile.map(block => {
              const blockStyle = parseJson<BlockStyle>(block.style, {});
              if (blockStyle.invisible) return null;
              return (
                <div key={block.id} className="rounded-xl overflow-hidden" style={{ minHeight: positions[block.id].grid_row_span * ROW_UNIT_PX * 0.6 }}>
                  <SiteBlockView block={block} dark={dark} accent={accent} headingFont={theme.heading_font} bodyFont={theme.body_font} subdomain="" editable={false} device="mobile" />
                </div>
              );
            })}
          </div>
        ) : blocks.map(block => {
          const blockStyle = parseJson<BlockStyle>(block.style, {});
          const isInvisible = blockStyle.invisible === true;
          const isSelected = selectedId === block.id;

          if (isInvisible && !isSelected) {
            return null;
          }

          const pos = positions[block.id];
          const isDragging = dragState.current?.blockId === block.id;
          const nearTop = pos.grid_row * ROW_UNIT_PX < TOOLBAR_CLEARANCE_PX;
          const handlePos = getHandlePos(nearTop);
          // A locked block's stacking is pinned regardless of selection — this
          // is what actually fixes "clicking the background pushes the video
          // behind it": without a lock, ANY selected block jumps to z-20,
          // which can outrank a block that was previously brought to front.
          const zLock = blockStyle.z_lock;
          const zIndexClass = isSelected ? 'z-40' : zLock === 'front' ? 'z-30' : zLock === 'back' ? 'z-0' : 'z-10';
          const borderClass = isSelected
            ? isInvisible
              ? 'border-dashed border-amber-500/80 shadow-[0_0_0_2px_rgba(245,158,11,0.35),0_8px_24px_rgba(0,0,0,0.4)] bg-amber-500/5'
              : 'border-amber-400 shadow-[0_0_0_2px_rgba(245,158,11,0.35),0_8px_24px_rgba(0,0,0,0.4)]'
            : 'border-transparent hover:border-white/20';

          const editingTransform = transformEditTarget?.blockId === block.id ? transformEditTarget : null;

          return (
            <div
              key={block.id}
              onPointerDown={(e) => { e.stopPropagation(); onSelect(block.id); }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(block.id);
                onContextMenu(block, e.clientX, e.clientY, findMediaKey(e.target));
              }}
              className={`absolute rounded-xl border shadow-lg transition-shadow group ${borderClass} ${zIndexClass} ${isDragging ? 'cursor-grabbing' : ''}`}
              style={{
                left: `${(pos.grid_col / GRID_COLUMNS) * 100}%`,
                width: `${(pos.grid_col_span / GRID_COLUMNS) * 100}%`,
                top: pos.grid_row * ROW_UNIT_PX,
                height: pos.grid_row_span * ROW_UNIT_PX,
              }}
            >
              {/* Real, live-styled block content — click text to edit it directly */}
              <div ref={(el) => { blockContentRefs.current[block.id] = el; }} className={`w-full h-full overflow-hidden rounded-xl ${isInvisible ? 'opacity-35' : ''}`}>
                <SiteBlockView
                  block={block}
                  dark={dark}
                  accent={accent}
                  headingFont={theme.heading_font}
                  bodyFont={theme.body_font}
                  subdomain=""
                  editable
                  device="desktop"
                  onContentChange={(content) => onContentChange(block.id, content)}
                  onStyleChange={(style) => onStyleChange?.(block.id, style)}
                />
              </div>

              {isInvisible && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-[#0c0d12] text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1 shadow-lg pointer-events-none">
                  <EyeOff className="w-3 h-3" />
                  <span>Hidden Layer (Selected)</span>
                </div>
              )}

              {editingTransform && blockContentRefs.current[block.id] && (
                <TransformOverlay
                  containerEl={blockContentRefs.current[block.id]!}
                  mediaKey={editingTransform.mediaKey}
                  transform={getMediaTransform(block, editingTransform.mediaKey)}
                  onChange={(next) => onTransformChange(block.id, editingTransform.mediaKey, next)}
                  onDone={onExitTransformEdit}
                />
              )}

              {!editingTransform && (
                <>
                  {/* Slim floating toolbar — appears on hover/select, drag anywhere on it to move the block.
                      Flips to just inside the block's top edge when there's no room above (block near
                      the canvas top), instead of rendering off the top and getting clipped. */}
                  <div
                    onPointerDown={(e) => startDrag(e, block, 'move')}
                    className={`absolute flex items-center gap-1 px-1.5 h-7 rounded-lg bg-[#1a1c24] border border-white/10 shadow-lg cursor-grab active:cursor-grabbing transition-opacity z-30 ${nearTop ? 'top-1 left-1' : '-top-8 left-0'} ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  >
                    <Move className="w-3 h-3 text-slate-500 shrink-0 ml-0.5" />
                    {zLock && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" aria-label={zLock === 'front' ? 'Locked to front' : 'Locked to back'} />}
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wide truncate max-w-[90px]">{parseJson<BlockStyle>(block.style, {}).custom_label || blockMeta(block.block_type).label}</span>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={() => onOpenInspector(block)} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer" title="Style & settings">
                      <Settings2 className="w-3 h-3" />
                    </button>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={() => onDuplicate(block)} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer" title="Duplicate">
                      <Copy className="w-3 h-3" />
                    </button>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={() => onDelete(block)} className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 cursor-pointer" title="Delete">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {isSelected && HANDLES.map(h => (
                    <div
                      key={h}
                      onPointerDown={(e) => startDrag(e, block, 'resize', h)}
                      className="absolute w-2.5 h-2.5 rounded-[3px] bg-amber-400 border border-[#0a0b0f] shadow-sm z-30"
                      style={{ ...handlePos[h], cursor: HANDLE_CURSOR[h] }}
                    />
                  ))}
                </>
              )}
            </div>
          );
        })}
          </div>
        </div>
      </div>
    </div>
  );
}
