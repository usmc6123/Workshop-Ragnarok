import React, { useState } from 'react';
import { Layers, ArrowUpToLine, ArrowDownToLine, Pencil, Check, X, GripVertical, Lock } from 'lucide-react';
import { SiteBlock, BlockStyle } from '../types';
import { blockMeta, blockSummary } from '../constants/siteBlockTypes';

type LockGroup = 'front' | 'normal' | 'back';

/**
 * Left-side "layers" list for the Sites block editor.
 *
 * Stacking order IS the blocks array order UNLESS a block has been locked
 * (style.z_lock) — a locked-front block always renders above everything, a
 * locked-back block always renders below everything, no matter what else is
 * selected on the canvas (see SiteGridCanvas's zLock handling — this is what
 * fixes "selecting the background pushes the video behind it").
 *
 * The list is displayed in the SAME top-to-bottom order things actually
 * stack visually: locked-front blocks first, then normal blocks (most-front
 * first), then locked-back blocks last — so "where a layer is in this list"
 * always matches "where it renders," which is the whole fix for "hard to
 * understand where it is." Each of the three groups gets its own labeled
 * section once it has 2+ layers, so a page with many overlapping blocks
 * still reads clearly instead of turning into one long undifferentiated
 * list.
 *
 * Clicking a row selects that block AND opens its inspector on the right
 * (handled by the parent's onSelect). Renaming and locking are both handled
 * inline here, no separate dialog. Rows can also be dragged (via the grip
 * handle) to reorder WITHIN their own group — precise ordering beyond just
 * "front" or "back" is exactly what's needed once several blocks share a
 * lock state and their relative order among each other starts to matter.
 */
export default function SiteLayersPanel({
  blocks, selectedId, onSelect, onToggleLock, onRename, onReorder,
}: {
  blocks: SiteBlock[];
  selectedId: number | null;
  onSelect: (block: SiteBlock) => void;
  onToggleLock: (blockId: number, lock: 'front' | 'back') => void;
  onRename: (blockId: number, name: string) => void;
  onReorder: (orderedIds: number[]) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);

  const withStyle = blocks.map(b => ({ block: b, style: safeParse(b.style) as BlockStyle }));
  const front = withStyle.filter(x => x.style.z_lock === 'front').reverse();
  const normal = withStyle.filter(x => !x.style.z_lock).reverse();
  const back = withStyle.filter(x => x.style.z_lock === 'back').reverse();
  const ordered = [...front, ...normal, ...back];

  const groupOf = (id: number): LockGroup => {
    if (front.some(x => x.block.id === id)) return 'front';
    if (back.some(x => x.block.id === id)) return 'back';
    return 'normal';
  };

  const startEditing = (block: SiteBlock, style: BlockStyle) => {
    setEditingId(block.id);
    setDraftName(style.custom_label || blockMeta(block.block_type).label);
  };
  const commitEdit = (blockId: number) => {
    onRename(blockId, draftName);
    setEditingId(null);
  };

  const handleDrop = (targetId: number) => {
    const draggedId = dragId;
    setDragId(null);
    setDropTargetId(null);
    if (draggedId === null || draggedId === targetId) return;
    if (groupOf(draggedId) !== groupOf(targetId)) return; // reordering only makes sense within the same lock group

    const displayIds = ordered.map(x => x.block.id);
    const fromIdx = displayIds.indexOf(draggedId);
    if (fromIdx === -1) return;
    const next = [...displayIds];
    next.splice(fromIdx, 1);
    const insertAt = next.indexOf(targetId);
    next.splice(insertAt, 0, draggedId);

    // Convert back to storage order (index0 = furthest back, index(last) =
    // furthest front — see handleToggleLock in SiteBuilderView, which builds
    // that same invariant via push/unshift). Each group was individually
    // reversed to build display order above, so un-reverse each segment.
    const frontSeg = next.slice(0, front.length);
    const normalSeg = next.slice(front.length, front.length + normal.length);
    const backSeg = next.slice(front.length + normal.length);
    const storageOrder = [...backSeg.slice().reverse(), ...normalSeg.slice().reverse(), ...frontSeg.slice().reverse()];
    onReorder(storageOrder);
  };

  const renderRow = ({ block, style }: { block: SiteBlock; style: BlockStyle }) => {
    const isSelected = block.id === selectedId;
    const isEditing = editingId === block.id;
    const isDragging = dragId === block.id;
    const isDropTarget = dropTargetId === block.id && dragId !== null && dragId !== block.id;
    const Icon = blockMeta(block.block_type).icon;
    const summary = blockSummary(block.block_type, safeParse(block.content));
    const label = style.custom_label || blockMeta(block.block_type).label;

    return (
      <div
        key={block.id}
        onClick={() => !isEditing && onSelect(block)}
        onDragOver={(e) => {
          if (dragId === null || groupOf(dragId) !== groupOf(block.id)) return;
          e.preventDefault();
          if (dropTargetId !== block.id) setDropTargetId(block.id);
        }}
        onDrop={(e) => { e.preventDefault(); handleDrop(block.id); }}
        onDragEnd={() => { setDragId(null); setDropTargetId(null); }}
        className={`rounded-lg border px-2.5 py-2 transition ${isEditing ? 'cursor-default' : 'cursor-pointer'} ${
          isDragging ? 'opacity-40' : ''
        } ${
          isDropTarget
            ? 'border-amber-400/70 bg-amber-950/10 border-dashed'
            : isSelected
              ? 'border-amber-400 bg-amber-950/20'
              : 'border-transparent hover:border-white/10 hover:bg-white/5'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            draggable={!isEditing}
            onDragStart={(e) => { e.stopPropagation(); setDragId(block.id); e.dataTransfer.effectAllowed = 'move'; }}
            onClick={(e) => e.stopPropagation()}
            title="Drag to reorder within this group"
            className="shrink-0 p-0.5 -ml-1 rounded text-slate-600 hover:text-slate-300 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-300' : 'text-slate-400'}`} />
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit(block.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="min-w-0 flex-1 rounded bg-[#0c0d12] border border-amber-500/50 px-1.5 py-0.5 text-[10px] font-bold text-white focus:outline-none"
                />
                <button onClick={() => commitEdit(block.id)} className="p-0.5 rounded text-emerald-400 hover:text-emerald-300 cursor-pointer" title="Save name">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setEditingId(null)} className="p-0.5 rounded text-slate-500 hover:text-slate-300 cursor-pointer" title="Cancel">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 group/name">
                <div className={`text-[10px] font-bold truncate ${isSelected ? 'text-amber-200' : 'text-slate-200'}`}>{label}</div>
                <button
                  onClick={(e) => { e.stopPropagation(); startEditing(block, style); }}
                  className="shrink-0 p-0.5 rounded text-slate-600 hover:text-slate-300 opacity-0 group-hover/name:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                  title="Rename layer"
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
            <div className="text-[9px] text-slate-500 truncate">{summary}</div>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-1.5">
          <LockButton
            active={style.z_lock === 'front'}
            label="Lock to Front"
            onClick={() => onToggleLock(block.id, 'front')}
          >
            <ArrowUpToLine className="w-3 h-3" />
          </LockButton>
          <LockButton
            active={style.z_lock === 'back'}
            label="Lock to Back"
            onClick={() => onToggleLock(block.id, 'back')}
          >
            <ArrowDownToLine className="w-3 h-3" />
          </LockButton>
        </div>
      </div>
    );
  };

  // Section headers only add value once there's something to distinguish —
  // a single-group page (the common case) stays exactly as simple as before.
  const showSections = [front.length > 0, normal.length > 0, back.length > 0].filter(Boolean).length > 1;

  return (
    <div className="w-64 shrink-0 sticky top-4 rounded-2xl border border-white/10 bg-[#111218]/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
      <div className="flex items-center gap-2 p-4 border-b border-border-theme shrink-0">
        <Layers className="w-4 h-4 text-primary-theme shrink-0" />
        <h2 className="text-sm font-black text-white uppercase tracking-wider">Layers</h2>
        <span className="ml-auto text-[10px] font-mono text-slate-500">{blocks.length}</span>
      </div>
      <p className="px-4 pt-2 text-[9px] text-slate-500 leading-relaxed">
        Top of this list = front of the page. Drag the <GripVertical className="w-2.5 h-2.5 inline -mt-0.5" /> handle to reorder, or lock a layer to keep it there no matter what else you click.
      </p>

      {blocks.length === 0 ? (
        <p className="p-4 text-[10px] text-slate-500 font-mono">No blocks yet.</p>
      ) : (
        <div className="overflow-y-auto flex-1 min-h-0 p-2 space-y-1.5 mt-1">
          {showSections && front.length > 0 && (
            <>
              <SectionHeader label="Locked to Front" />
              {front.map(renderRow)}
            </>
          )}
          {showSections && normal.length > 0 && (
            <SectionHeader label="Unlocked" />
          )}
          {normal.map(renderRow)}
          {showSections && back.length > 0 && (
            <>
              <SectionHeader label="Locked to Back" />
              {back.map(renderRow)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="pt-2 pb-0.5 px-1 first:pt-0">
      <span className="text-[8px] font-bold uppercase tracking-widest text-slate-600">{label}</span>
    </div>
  );
}

function LockButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  // The word always stays "Front"/"Back" — never swaps to "Locked" — so it
  // doesn't change out from under you every time you click. Lock state is
  // shown instead via the amber highlight plus a small lock icon next to
  // whichever one is currently active.
  return (
    <button
      type="button"
      title={active ? `${label} (currently locked)` : label}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`flex-1 flex items-center justify-center gap-1 py-1 rounded border text-[9px] font-bold uppercase tracking-wide transition cursor-pointer ${
        active
          ? 'border-amber-400 bg-amber-500/20 text-amber-300'
          : 'border-[#1e2028] text-slate-400 hover:text-white hover:border-slate-500'
      }`}
    >
      {children}
      <span className="hidden xl:inline">{label.replace('Lock to ', '')}</span>
      {active && <Lock className="w-2.5 h-2.5 shrink-0" />}
    </button>
  );
}

function safeParse(raw: string | null | undefined): any {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}
