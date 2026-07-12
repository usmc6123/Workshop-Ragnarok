import React, { useRef, useState } from 'react';
import { Layers, ArrowUpToLine, ArrowDownToLine, Pencil, Check, X, GripVertical, Lock, Trash2 } from 'lucide-react';
import { SiteBlock, BlockStyle } from '../types';
import { blockMeta, blockSummary } from '../constants/siteBlockTypes';

type LockGroup = 'front' | 'normal' | 'back';
type WithStyle = { block: SiteBlock; style: BlockStyle };

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
 * Locking/unlocking a layer never moves it in the list on its own — only a
 * manual drag (or the canvas's Bring to Front/Send to Back context menu
 * actions) changes order, so an arrangement you set stays exactly where you
 * put it. Each row also has a delete button — deletion always confirms
 * first via the same confirm() dialog used everywhere else blocks are
 * deleted (canvas context menu, keyboard delete).
 *
 * Dragging uses pointer events (setPointerCapture), not the native HTML5
 * Drag and Drop API — the earlier version used real `draggable`/`onDragOver`/
 * `onDrop`, which was unreliable in practice: HTML5 DnD requires
 * preventDefault() on every single dragover tick to keep accepting a drop,
 * gives no useful continuous feedback, and — the main precision problem —
 * dropping ON a row could only ever insert BEFORE it, so there was no way to
 * drop something after the last row in a group. Pointer events give full
 * control: the drop position is computed continuously from the dragged
 * block's Y position against every other row's midpoint in the same group,
 * so it can land above OR below any row (including becoming the new last
 * item), and a live insertion-line indicator shows exactly where it'll land
 * before you let go.
 */
export default function SiteLayersPanel({
  blocks, selectedId, onSelect, onToggleLock, onRename, onReorder, onDelete,
}: {
  blocks: SiteBlock[];
  selectedId: number | null;
  onSelect: (block: SiteBlock) => void;
  onToggleLock: (blockId: number, lock: 'front' | 'back') => void;
  onRename: (blockId: number, name: string) => void;
  onReorder: (orderedIds: number[]) => void;
  onDelete: (block: SiteBlock) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragGroup, setDragGroup] = useState<LockGroup | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const withStyle = blocks.map(b => ({ block: b, style: safeParse(b.style) as BlockStyle }));
  const front = withStyle.filter(x => x.style.z_lock === 'front').reverse();
  const normal = withStyle.filter(x => !x.style.z_lock).reverse();
  const back = withStyle.filter(x => x.style.z_lock === 'back').reverse();

  const groupOf = (id: number): LockGroup => {
    if (front.some(x => x.block.id === id)) return 'front';
    if (back.some(x => x.block.id === id)) return 'back';
    return 'normal';
  };
  const groupArray = (group: LockGroup): WithStyle[] => group === 'front' ? front : group === 'back' ? back : normal;

  const startEditing = (block: SiteBlock, style: BlockStyle) => {
    setEditingId(block.id);
    setDraftName(style.custom_label || blockMeta(block.block_type).label);
  };
  const commitEdit = (blockId: number) => {
    onRename(blockId, draftName);
    setEditingId(null);
  };

  const startDrag = (e: React.PointerEvent, block: SiteBlock) => {
    if (editingId !== null) return;
    e.preventDefault();
    e.stopPropagation();
    const group = groupOf(block.id);
    setDragId(block.id);
    setDragGroup(group);
    setDropIndex(groupArray(group).findIndex(x => x.block.id === block.id));
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (dragId === null || dragGroup === null) return;
    const groupBlocks = groupArray(dragGroup);
    let idx = groupBlocks.length; // default: pointer is below every row in the group — becomes the new last item
    for (let i = 0; i < groupBlocks.length; i++) {
      const el = rowRefs.current[groupBlocks[i].block.id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) { idx = i; break; }
    }
    setDropIndex(idx);
  };

  const endDrag = () => {
    if (dragId !== null && dragGroup !== null && dropIndex !== null) {
      const groupBlocks = groupArray(dragGroup);
      const ids = groupBlocks.map(x => x.block.id);
      const fromIdx = ids.indexOf(dragId);
      if (fromIdx !== -1) {
        const next = [...ids];
        next.splice(fromIdx, 1);
        // dropIndex was computed against the PRE-removal array — once the
        // dragged item is spliced out, every index after it shifts down by
        // one, so the insertion point needs the same correction.
        const insertAt = Math.max(0, Math.min(next.length, fromIdx < dropIndex ? dropIndex - 1 : dropIndex));
        next.splice(insertAt, 0, dragId);

        const newFrontIds = dragGroup === 'front' ? next : front.map(x => x.block.id);
        const newNormalIds = dragGroup === 'normal' ? next : normal.map(x => x.block.id);
        const newBackIds = dragGroup === 'back' ? next : back.map(x => x.block.id);

        // Convert display order (front-first within each group) back to
        // storage order (index0 = furthest back, index(last) = furthest
        // front — see handleToggleLock in SiteBuilderView) by un-reversing
        // each group segment.
        const storageOrder = [
          ...newBackIds.slice().reverse(),
          ...newNormalIds.slice().reverse(),
          ...newFrontIds.slice().reverse(),
        ];
        onReorder(storageOrder);
      }
    }
    setDragId(null);
    setDragGroup(null);
    setDropIndex(null);
  };

  const renderRow = ({ block, style }: WithStyle) => {
    const isSelected = block.id === selectedId;
    const isEditing = editingId === block.id;
    const isDragging = dragId === block.id;
    const Icon = blockMeta(block.block_type).icon;
    const summary = blockSummary(block.block_type, safeParse(block.content));
    const label = style.custom_label || blockMeta(block.block_type).label;

    return (
      <div
        key={block.id}
        ref={(el) => { rowRefs.current[block.id] = el; }}
        onClick={() => !isEditing && onSelect(block)}
        className={`rounded-lg border px-2.5 py-2 transition ${isEditing ? 'cursor-default' : 'cursor-pointer'} ${
          isDragging ? 'opacity-40' : ''
        } ${
          isSelected
            ? 'border-amber-400 bg-amber-950/20'
            : 'border-transparent hover:border-white/10 hover:bg-white/5'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onPointerDown={(e) => startDrag(e, block)}
            onPointerMove={handleDragMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClick={(e) => e.stopPropagation()}
            title="Drag to reorder within this group"
            style={{ touchAction: 'none' }}
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
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(block); }}
            title="Delete layer"
            className="shrink-0 flex items-center justify-center p-1.5 rounded border border-[#1e2028] text-slate-500 hover:text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/10 cursor-pointer transition"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  // Interleaves a live amber insertion-line between rows at whichever gap
  // the pointer currently sits over, only for the group actually being
  // dragged within — this is the "you'll land exactly here" feedback that
  // was missing from the old native-DnD version (which had no equivalent of
  // "drop after the last row").
  const renderGroup = (group: LockGroup, items: WithStyle[]) => {
    const dragging = dragGroup === group && dragId !== null;
    const nodes: React.ReactNode[] = [];
    items.forEach((item, i) => {
      if (dragging && dropIndex === i) nodes.push(<DropIndicator key={`gap-${group}-${i}`} />);
      nodes.push(renderRow(item));
    });
    if (dragging && dropIndex === items.length) nodes.push(<DropIndicator key={`gap-${group}-end`} />);
    return nodes;
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
          {/* A group's rows always render whenever it has blocks — `showSections`
              only ever controls whether the little label above them shows, never
              whether the rows themselves do. Previously `showSections &&` also
              wrapped the front/back rows directly, so whenever fewer than 2 of
              the 3 groups had anything in them (e.g. every block locked to back
              and none unlocked — a completely normal setup, like a background
              image behind a locked-front CTA), showSections went false and the
              only populated group's rows vanished entirely, looking exactly like
              the layers had disappeared. Adding a new block (which defaults to
              unlocked) bumped the non-empty-group count back to 2+, flipping
              showSections back on and un-hiding everything at once — which is
              why it looked like it "came back" only after adding a block. */}
          {front.length > 0 && (
            <>
              {showSections && <SectionHeader label="Locked to Front" />}
              {renderGroup('front', front)}
            </>
          )}
          {normal.length > 0 && (
            <>
              {showSections && <SectionHeader label="Unlocked" />}
              {renderGroup('normal', normal)}
            </>
          )}
          {back.length > 0 && (
            <>
              {showSections && <SectionHeader label="Locked to Back" />}
              {renderGroup('back', back)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DropIndicator() {
  return <div className="h-[3px] my-0.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />;
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
