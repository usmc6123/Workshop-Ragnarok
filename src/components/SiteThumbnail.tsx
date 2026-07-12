import React, { useRef, useState, useEffect } from 'react';
import { SiteBlock, ThemeConfig, BlockStyle } from '../types';
import { GRID_COLUMNS, ROW_UNIT_PX, positionFromStyle } from '../constants/siteGrid';
import SiteBlockView from './SiteBlockRenderers';

function parseBlockStyle(raw: string | null | undefined): BlockStyle {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

// Matches SitePageView's `max-w-6xl` content width, so the grid math and font
// sizes scale down proportionally to exactly what a visitor would see.
const REFERENCE_WIDTH = 1152;

/**
 * A real, live-rendered miniature of a site's actual current content — the
 * exact same CSS Grid layout SitePageView uses for the real public page, just
 * shrunk with a CSS transform and cropped to a fixed-height window (so a long
 * page shows its top "above the fold" section, not a squished sliver of the
 * whole thing). Used on the Sites list so each card is recognizable at a
 * glance, instead of an abstract block-position diagram.
 */
export default function SiteThumbnail({
  blocks, theme, dark, accent, height = 170,
}: {
  blocks: SiteBlock[];
  theme: ThemeConfig;
  dark: boolean;
  accent: string;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setScale(containerRef.current.clientWidth / REFERENCE_WIDTH);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const fontFamily = theme.body_font || theme.font_family || undefined;

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-lg border overflow-hidden ${dark ? 'bg-[#0a0a0f] border-white/10' : 'bg-slate-50 border-black/10'}`}
      style={{ height }}
    >
      {blocks.length === 0 ? (
        <div className={`w-full h-full flex items-center justify-center text-[10px] font-mono ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
          No content yet
        </div>
      ) : (
        <div
          style={{
            width: REFERENCE_WIDTH,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            fontFamily,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
              gridAutoRows: `minmax(${ROW_UNIT_PX}px, auto)`,
              // Zero gap to exactly match SitePageView (the real live page
              // this is a miniature of) and the builder canvas — see the long
              // comment in SitePageView.tsx for why a non-zero gap here
              // silently inflates every multi-row-spanning block's height and
              // breaks intentional block overlap.
              columnGap: 0,
              rowGap: 0,
              padding: 24,
            }}
          >
            {blocks.map((block, idx) => {
              const style = parseBlockStyle(block.style);
              const pos = positionFromStyle(style, idx * 12);
              return (
                <div
                  key={block.id}
                  style={{
                    gridColumn: `${pos.grid_col + 1} / span ${pos.grid_col_span}`,
                    gridRow: `${pos.grid_row + 1} / span ${pos.grid_row_span}`,
                    order: pos.grid_row * 1000 + pos.grid_col,
                  }}
                >
                  <SiteBlockView
                    block={block}
                    dark={dark}
                    accent={accent}
                    secondaryColor={theme.secondary_color}
                    headingFont={theme.heading_font}
                    bodyFont={theme.body_font}
                    subdomain=""
                    editable={false}
                    device="desktop"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
