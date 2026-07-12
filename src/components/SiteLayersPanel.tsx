import React from 'react';
import { Layers, ArrowUpToLine, ArrowDownToLine, ChevronUp, ChevronDown } from 'lucide-react';
import { SiteBlock } from '../types';
import { blockMeta, blockSummary } from '../constants/siteBlockTypes';

/**
 * Left-side "layers" list for the Sites block editor — shows every block on
 * the page in stacking order, frontmost at the top (matching the Figma/
 * Photoshop convention), so overlapping blocks (e.g. a video placed on top
 * of a background image) are easy to find and reorder instead of getting
 * visually buried.
 *
 * Stacking order IS the blocks array order — there's no separate z-index
 * field. `blocks` is expected in the same position-ascending order the
 * canvas renders in (later in the array = rendered later = visually on top),
 * this component just displays it reversed. Reordering is delegated entirely
 * to the parent via `onReorder`, which owns the actual array manipulation
 * and the `api.reorderSiteBlocks` call — this component is purely display +
 * button clicks.
 */
export default function SiteLayersPanel({
  blocks, selectedId, onSelect, onReorder,
}: {
  blocks: SiteBlock[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onReorder: (blockId: number, action: 'front' | 'back' | 'forward' | 'backward') => void;
}) {
  const lastIndex = blocks.length - 1;

  return (
    <div className="w-60 shrink-0 sticky top-4 rounded-2xl border border-white/10 bg-[#111218]/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
      <div className="flex items-center gap-2 p-4 border-b border-border-theme shrink-0">
        <Layers className="w-4 h-4 text-primary-theme shrink-0" />
        <h2 className="text-sm font-black text-white uppercase tracking-wider">Layers</h2>
        <span className="ml-auto text-[10px] font-mono text-slate-500">{blocks.length}</span>
      </div>

      {blocks.length === 0 ? (
        <p className="p-4 text-[10px] text-slate-500 font-mono">No blocks yet.</p>
      ) : (
        <div className="overflow-y-auto flex-1 min-h-0 p-2 space-y-1">
          {[...blocks].reverse().map((block) => {
            const idx = blocks.findIndex(b => b.id === block.id); // real position, not display order
            const isSelected = block.id === selectedId;
            const Icon = blockMeta(block.block_type).icon;
            const summary = blockSummary(block.block_type, safeParse(block.content));

            return (
              <div
                key={block.id}
                onClick={() => onSelect(block.id)}
                className={`group rounded-lg border px-2 py-1.5 cursor-pointer transition ${
                  isSelected
                    ? 'border-amber-400 bg-amber-950/20'
                    : 'border-transparent hover:border-white/10 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-300' : 'text-slate-400'}`} />
                  <div className="min-w-0 flex-1">
                    <div className={`text-[10px] font-bold truncate ${isSelected ? 'text-amber-200' : 'text-slate-200'}`}>
                      {blockMeta(block.block_type).label}
                    </div>
                    <div className="text-[9px] text-slate-500 truncate">{summary}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <LayerButton title="Bring to front" disabled={idx === lastIndex} onClick={() => onReorder(block.id, 'front')}>
                    <ArrowUpToLine className="w-3 h-3" />
                  </LayerButton>
                  <LayerButton title="Bring forward" disabled={idx === lastIndex} onClick={() => onReorder(block.id, 'forward')}>
                    <ChevronUp className="w-3 h-3" />
                  </LayerButton>
                  <LayerButton title="Send backward" disabled={idx === 0} onClick={() => onReorder(block.id, 'backward')}>
                    <ChevronDown className="w-3 h-3" />
                  </LayerButton>
                  <LayerButton title="Send to back" disabled={idx === 0} onClick={() => onReorder(block.id, 'back')}>
                    <ArrowDownToLine className="w-3 h-3" />
                  </LayerButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LayerButton({ title, disabled, onClick, children }: { title: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="flex-1 flex items-center justify-center py-1 rounded border border-[#1e2028] text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
    >
      {children}
    </button>
  );
}

function safeParse(raw: string | null | undefined): any {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}
