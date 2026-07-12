import React from 'react';
import { SiteTemplate, SiteTemplateBlock } from '../constants/siteTemplates';
import { GRID_COLUMNS } from '../constants/siteGrid';
import { Image as ImageIcon, PlayCircle } from 'lucide-react';

function stripHtml(html: string | undefined): string {
  return (html || '').replace(/<[^>]+>/g, '');
}

// Renders each block's ACTUAL template content (headline, body, tier names,
// quote, etc.) at a tiny scale, instead of a generic centered type icon —
// this is what makes the thumbnail a real preview of what applying the
// template produces, rather than just an abstract wireframe of box shapes.
function ThumbBlockContent({ block }: { block: SiteTemplateBlock }) {
  const c: any = block.content;
  switch (block.block_type) {
    case 'hero':
    case 'cta': {
      const cta = c.cta_text || c.button_text;
      return (
        <div className="flex flex-col items-center justify-center text-center gap-[2px] px-1.5 py-1 w-full h-full overflow-hidden">
          {c.headline && <div className="text-[6px] font-black text-white leading-[1.1] line-clamp-2">{c.headline}</div>}
          {c.subheadline && <div className="text-[4px] text-slate-400 leading-tight line-clamp-2">{stripHtml(c.subheadline)}</div>}
          {cta && <div className="mt-[1px] px-1.5 py-[1.5px] rounded-full bg-amber-500/80 text-[3.5px] font-bold text-slate-950 whitespace-nowrap">{cta}</div>}
        </div>
      );
    }
    case 'text':
      return (
        <div className="flex flex-col gap-[2px] px-1.5 py-1 w-full h-full overflow-hidden">
          {c.headline && <div className="text-[5px] font-bold text-white leading-none line-clamp-1">{c.headline}</div>}
          {c.body && <div className="text-[3.5px] text-slate-500 leading-snug line-clamp-5">{stripHtml(c.body)}</div>}
        </div>
      );
    case 'testimonial':
      return (
        <div className="flex flex-col justify-center gap-[2px] px-1.5 py-1 w-full h-full overflow-hidden">
          {c.quote && <div className="text-[4px] text-slate-300 italic leading-snug line-clamp-3">&ldquo;{stripHtml(c.quote)}&rdquo;</div>}
          {c.author && <div className="text-[3.5px] text-amber-400 font-bold truncate">— {c.author}</div>}
        </div>
      );
    case 'pricing':
      return (
        <div className="flex flex-col gap-[2px] px-1.5 py-1 w-full h-full overflow-hidden">
          {c.headline && <div className="text-[5px] font-bold text-white leading-none line-clamp-1">{c.headline}</div>}
          <div className="flex gap-[2px] flex-1 min-h-0">
            {(c.tiers || []).slice(0, 3).map((t: any, i: number) => (
              <div key={i} className={`flex-1 min-w-0 rounded-[2px] border flex flex-col items-center justify-center px-[1px] ${t.highlighted ? 'border-amber-400/60 bg-amber-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
                <div className="text-[3.5px] font-bold text-white truncate w-full text-center">{t.name}</div>
                <div className="text-[3.5px] text-amber-300 truncate w-full text-center">{t.price}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'faq':
      return (
        <div className="flex flex-col gap-[1.5px] px-1.5 py-1 w-full h-full overflow-hidden">
          {c.headline && <div className="text-[5px] font-bold text-white leading-none line-clamp-1">{c.headline}</div>}
          {(c.items || []).slice(0, 3).map((it: any, i: number) => (
            <div key={i} className="text-[3.5px] text-slate-400 truncate">• {it.question}</div>
          ))}
        </div>
      );
    case 'contact_form':
      return (
        <div className="flex flex-col gap-[1.5px] px-1.5 py-1 w-full h-full overflow-hidden">
          {c.headline && <div className="text-[5px] font-bold text-white leading-none line-clamp-1">{c.headline}</div>}
          <div className="flex flex-col gap-[1.5px] mt-[1px] flex-1 min-h-0">
            <div className="h-[3px] rounded-[1px] bg-white/10 w-full shrink-0" />
            <div className="h-[3px] rounded-[1px] bg-white/10 w-full shrink-0" />
            <div className="rounded-[1px] bg-white/10 w-full flex-1 min-h-0" />
          </div>
          {c.button_text && <div className="self-start mt-[1px] px-1.5 py-[1.5px] rounded-full bg-amber-500/80 text-[3.5px] font-bold text-slate-950 whitespace-nowrap">{c.button_text}</div>}
        </div>
      );
    case 'image':
      return (
        <div className="flex gap-[2px] p-1 w-full h-full">
          {(c.images && c.images.length > 0 ? c.images : [{}]).slice(0, 3).map((_: any, i: number) => (
            <div key={i} className="flex-1 min-w-0 rounded-[2px] bg-gradient-to-br from-white/10 to-white/[0.03] border border-white/10 flex items-center justify-center">
              <ImageIcon className="text-slate-600" style={{ width: '30%', height: '30%', minWidth: 6, minHeight: 6 }} />
            </div>
          ))}
        </div>
      );
    case 'video':
      return (
        <div className="w-full h-full flex items-center justify-center bg-black/40">
          <PlayCircle className="text-slate-500" style={{ width: '24%', height: '24%', minWidth: 8, minHeight: 8 }} />
        </div>
      );
    default:
      return null;
  }
}

// A tiny, real-proportioned schematic of what applying this template actually
// produces — built from the same grid_col/span/row/span values used to create
// the real blocks, just scaled down, with each block rendering an excerpt of
// its own real template copy (headline, tier names, quote, etc.) rather than
// a generic type icon. This is what lets someone tell templates apart at a
// glance, and actually see what they'll get, instead of reading a
// description and hoping.
export default function TemplateThumbnail({ template }: { template: SiteTemplate }) {
  const maxRow = Math.max(...template.blocks.map(b => b.grid_row + b.grid_row_span));

  return (
    <div className="relative w-full rounded-lg border border-white/10 bg-[#0a0b0f] overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
      {template.blocks.map((b, idx) => (
        <div
          key={idx}
          className="absolute rounded-[3px] border border-white/10 bg-white/[0.06] overflow-hidden"
          style={{
            left: `${(b.grid_col / GRID_COLUMNS) * 100}%`,
            width: `${(b.grid_col_span / GRID_COLUMNS) * 100}%`,
            top: `${(b.grid_row / maxRow) * 100}%`,
            height: `${(b.grid_row_span / maxRow) * 100}%`,
            padding: 1,
          }}
        >
          <ThumbBlockContent block={b} />
        </div>
      ))}
    </div>
  );
}
