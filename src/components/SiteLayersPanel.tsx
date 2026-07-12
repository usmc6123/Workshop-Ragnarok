import React, { useState } from 'react';
import { Layers, ArrowUpToLine, ArrowDownToLine, Pencil, Check, X } from 'lucide-react';
import { SiteBlock, BlockStyle } from '../types';
import { blockMeta, blockSummary } from '../constants/siteBlockTypes';

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
 * understand where it is."
 *
 * Clicking a row selects that block AND opens its inspector on the right
 * (handled by the parent's onSelect). Renaming and locking are both handled
 * inline here, no separate dialog.
 */
export default function SiteLayersPanel({
  blocks, selectedId, onSelect, onToggleLock, onRename,
}: {
  blocks: SiteBlock[];
  selectedId: number | null;
  onSelect: (block: SiteBlock) => void;
  onToggleLock: (blockId: number, lock: 'front' | 'back') => void;
  onRename: (blockId: number, name: string) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');

  const withStyle = blocks.map(b => ({ block: b, style: safeParse(b.style) as BlockStyle }));
  const front = withStyle.filter(x => x.style.z_lock === 'front').reverse();
  const normal = withStyle.filter(x => !x.style.z_lock).reverse();
  const back = withStyle.filter(x => x.style.z_lock === 'back').reverse();
  const ordered = [...front, ...normal, ...back];

  const startEditing = (block: SiteBlock, style: BlockStyle) => {
    setEditingId(block.id);
    setDraftName(style.custom_label || blockMeta(block.block_type).label);
  };
  const commitEdit = (blockId: number) => {
    onRename(blockId, draftName);
    setEditingId(null);
  };

  return (
    <div className="w-64 shrink-0 sticky top-4 rounded-2xl border border-white/10 bg-[#111218]/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
      <div className="flex items-center gap-2 p-4 border-b border-border-theme shrink-0">
        <Layers className="w-4 h-4 text-primary-theme shrink-0" />
        <h2 className="text-sm font-black text-white uppercase tracking-wider">Layers</h2>
        <span className="ml-auto text-[10px] font-mono text-slate-500">{blocks.length}</span>
      </div>
      <p className="px-4 pt-2 text-[9px] text-slate-500 leading-relaxed">
        Top of this list = front of the page. Lock a layer to keep it there no matter what else you click.
      </p>

      {blocks.length === 0 ? (
        <p className="p-4 text-[10px] text-slate-500 font-mono">No blocks yet.</p>
      ) : (
        <div className="overflow-y-auto flex-1 min-h-0 p-2 space-y-1.5 mt-1">
          {ordered.map(({ block, style }) => {
            const isSelected = block.id === selectedId;
            const isEditing = editingId === block.id;
            const Icon = blockMeta(block.block_type).icon;
            const summary = blockSummary(block.block_type, safeParse(block.content));
            const label = style.custom_label || blockMeta(block.block_type).label;

            return (
              <div
                key={block.id}
                onClick={() => !isEditing && onSelect(block)}
                className={`rounded-lg border px-2.5 py-2 transition ${isEditing ? 'cursor-default' : 'cursor-pointer'} ${
                  isSelected
                    ? 'border-amber-400 bg-amber-950/20'
                    : 'border-transparent hover:border-white/10 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
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
          })}
        </div>
      )}
    </div>
  );
}

function LockButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`flex-1 flex items-center justify-center gap-1 py-1 rounded border text-[9px] font-bold uppercase tracking-wide transition cursor-pointer ${
        active
          ? 'border-amber-400 bg-amber-500/20 text-amber-300'
          : 'border-[#1e2028] text-slate-400 hover:text-white hover:border-slate-500'
      }`}
    >
      {children}
      <span className="hidden xl:inline">{active ? 'Locked' : label.replace('Lock to ', '')}</span>
    </button>
  );
}

function safeParse(raw: string | null | undefined): any {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}
