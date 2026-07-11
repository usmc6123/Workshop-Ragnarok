import React, { useRef, useState, useCallback, useEffect } from 'react';
import { SiteBlock, BlockStyle } from '../types';
import {
  GRID_COLUMNS, ROW_UNIT_PX, GridPosition,
  clampCol, clampColSpan, clampRow, clampRowSpan, positionFromStyle,
} from '../constants/siteGrid';
import { blockMeta, blockSummary } from '../constants/siteBlockTypes';
import { Copy, Trash2, Pencil } from 'lucide-react';

type HandleDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const HANDLE_CURSOR: Record<HandleDir, string> = {
  n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
  ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize',
};

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function getPosition(block: SiteBlock, fallbackRow: number): GridPosition {
  const style = parseJson<BlockStyle>(block.style, {});
  return positionFromStyle(style, fallbackRow);
}

interface DragState {
  blockId: number;
  mode: 'move' | 'resize';
  handle?: HandleDir;
  startPointerX: number;
  startPointerY: number;
  startPos: GridPosition;
  colWidthPx: number;
}

export default function SiteGridCanvas({
  blocks, selectedId, onSelect, onEdit, onDuplicate, onDelete, onPositionChange,
}: {
  blocks: SiteBlock[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onEdit: (block: SiteBlock) => void;
  onDuplicate: (block: SiteBlock) => void;
  onDelete: (block: SiteBlock) => void;
  onPositionChange: (blockId: number, position: GridPosition) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(1152);
  const [liveOverrides, setLiveOverrides] = useState<Record<number, GridPosition>>({});
  const dragState = useRef<DragState | null>(null);

  useEffect(() => {
    const measure = () => {
      if (canvasRef.current) setCanvasWidth(canvasRef.current.clientWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  const positions = blocks.reduce<Record<number, GridPosition>>((acc, b, idx) => {
    acc[b.id] = liveOverrides[b.id] || getPosition(b, idx * 12);
    return acc;
  }, {});

  const totalRows = Math.max(20, ...blocks.map(b => positions[b.id].grid_row + positions[b.id].grid_row_span)) + 4;
  const colWidthPx = canvasWidth / GRID_COLUMNS;

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const drag = dragState.current;
    if (!drag) return;
    const dx = e.clientX - drag.startPointerX;
    const dy = e.clientY - drag.startPointerY;
    const dCol = dx / drag.colWidthPx;
    const dRow = dy / ROW_UNIT_PX;

    let next: GridPosition = { ...drag.startPos };

    if (drag.mode === 'move') {
      next.grid_col = clampCol(drag.startPos.grid_col + dCol);
      next.grid_col_span = clampColSpan(next.grid_col, drag.startPos.grid_col_span);
      next.grid_row = clampRow(drag.startPos.grid_row + dRow);
    } else {
      const h = drag.handle!;
      if (h.includes('e')) {
        next.grid_col_span = clampColSpan(drag.startPos.grid_col, drag.startPos.grid_col_span + dCol);
      }
      if (h.includes('w')) {
        const newCol = clampCol(drag.startPos.grid_col + dCol);
        const delta = drag.startPos.grid_col - newCol;
        next.grid_col = newCol;
        next.grid_col_span = clampColSpan(newCol, drag.startPos.grid_col_span + delta);
      }
      if (h.includes('s')) {
        next.grid_row_span = clampRowSpan(drag.startPos.grid_row_span + dRow);
      }
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
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const HANDLES: HandleDir[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  const handlePos: Record<HandleDir, React.CSSProperties> = {
    n: { top: -5, left: '50%', transform: 'translateX(-50%)' },
    s: { bottom: -5, left: '50%', transform: 'translateX(-50%)' },
    e: { right: -5, top: '50%', transform: 'translateY(-50%)' },
    w: { left: -5, top: '50%', transform: 'translateY(-50%)' },
    ne: { top: -5, right: -5 },
    nw: { top: -5, left: -5 },
    se: { bottom: -5, right: -5 },
    sw: { bottom: -5, left: -5 },
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
        <span>Page width preview — this frame matches the live site's max width</span>
        <span>{Math.round(canvasWidth)}px</span>
      </div>
      <div
        ref={canvasRef}
        onPointerDown={() => onSelect(null)}
        className="relative w-full mx-auto rounded-2xl border-2 border-dashed border-[#2a2d3a] bg-[#0a0b0f] overflow-hidden"
        style={{ maxWidth: 1152, height: totalRows * ROW_UNIT_PX }}
      >
        {/* Subtle column guides — purely visual, helps line up multi-column rows */}
        <div className="absolute inset-0 pointer-events-none flex">
          {Array.from({ length: GRID_COLUMNS }).map((_, i) => (
            <div key={i} className="flex-1 border-r border-white/[0.03] last:border-r-0" />
          ))}
        </div>

        {blocks.map(block => {
          const pos = positions[block.id];
          const meta = blockMeta(block.block_type);
          const Icon = meta.icon;
          const content = parseJson<any>(block.content, {});
          const isSelected = selectedId === block.id;
          const isDragging = dragState.current?.blockId === block.id;

          return (
            <div
              key={block.id}
              onPointerDown={(e) => { e.stopPropagation(); onSelect(block.id); }}
              className={`absolute rounded-xl border backdrop-blur-md shadow-lg transition-shadow group ${
                isSelected
                  ? 'border-amber-400 shadow-[0_0_0_2px_rgba(245,158,11,0.35),0_8px_24px_rgba(0,0,0,0.4)] bg-[#181a22]/95 z-20'
                  : 'border-white/10 bg-[#14151c]/90 hover:border-white/20 z-10'
              } ${isDragging ? 'cursor-grabbing' : ''}`}
              style={{
                left: `${(pos.grid_col / GRID_COLUMNS) * 100}%`,
                width: `${(pos.grid_col_span / GRID_COLUMNS) * 100}%`,
                top: pos.grid_row * ROW_UNIT_PX,
                height: pos.grid_row_span * ROW_UNIT_PX,
              }}
            >
              {/* Windows-11-style title bar: drag handle + quick actions */}
              <div
                onPointerDown={(e) => startDrag(e, block, 'move')}
                className="flex items-center gap-2 px-2.5 h-8 border-b border-white/10 cursor-grab active:cursor-grabbing rounded-t-xl bg-white/[0.03]"
              >
                <Icon className="w-3.5 h-3.5 text-primary-theme shrink-0" />
                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide truncate flex-1">{meta.label}</span>
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => onEdit(block)} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer" title="Edit content & style">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => onDuplicate(block)} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer" title="Duplicate">
                  <Copy className="w-3 h-3" />
                </button>
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => onDelete(block)} className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 cursor-pointer" title="Delete">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Body — compact preview, not the live render (see Preview Site for that) */}
              <div className="px-2.5 py-1.5 overflow-hidden text-[10px] text-slate-500 leading-snug" style={{ height: `calc(100% - 32px)` }}>
                {blockSummary(block.block_type, content)}
              </div>

              {/* Resize handles — only interactive once selected, Windows-11-style small squares */}
              {isSelected && HANDLES.map(h => (
                <div
                  key={h}
                  onPointerDown={(e) => startDrag(e, block, 'resize', h)}
                  className="absolute w-2.5 h-2.5 rounded-[3px] bg-amber-400 border border-[#0a0b0f] shadow-sm z-30"
                  style={{ ...handlePos[h], cursor: HANDLE_CURSOR[h] }}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
