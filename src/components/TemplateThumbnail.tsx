import React from 'react';
import { SiteTemplate } from '../constants/siteTemplates';
import { GRID_COLUMNS } from '../constants/siteGrid';
import { blockMeta } from '../constants/siteBlockTypes';

// A tiny, real-proportioned schematic of what applying this template actually
// produces — built from the same grid_col/span/row/span values used to create
// the real blocks, just scaled down. This is what lets someone tell templates
// apart at a glance instead of reading a description and hoping.
export default function TemplateThumbnail({ template }: { template: SiteTemplate }) {
  const maxRow = Math.max(...template.blocks.map(b => b.grid_row + b.grid_row_span));

  return (
    <div className="relative w-full rounded-lg border border-white/10 bg-[#0a0b0f] overflow-hidden" style={{ aspectRatio: '16 / 11' }}>
      {template.blocks.map((b, idx) => {
        const meta = blockMeta(b.block_type);
        const Icon = meta.icon;
        return (
          <div
            key={idx}
            className="absolute rounded-[3px] border border-white/10 bg-white/[0.06] flex items-center justify-center"
            style={{
              left: `${(b.grid_col / GRID_COLUMNS) * 100}%`,
              width: `${(b.grid_col_span / GRID_COLUMNS) * 100}%`,
              top: `${(b.grid_row / maxRow) * 100}%`,
              height: `${(b.grid_row_span / maxRow) * 100}%`,
              padding: 1,
            }}
          >
            <Icon className="w-3 h-3 text-slate-500" style={{ width: '14%', height: '14%', minWidth: 6, minHeight: 6 }} />
          </div>
        );
      })}
    </div>
  );
}
