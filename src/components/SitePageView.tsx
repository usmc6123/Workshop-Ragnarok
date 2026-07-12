import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { PublicSite, SiteBlock, ThemeConfig, BlockStyle, DeviceBreakpoint } from '../types';
import { ensureGoogleFontsLoaded, SITE_FONT_OPTIONS } from '../constants/siteFonts';
import { GRID_COLUMNS, ROW_UNIT_PX, positionFromStyle } from '../constants/siteGrid';
import SiteBlockView from './SiteBlockRenderers';
import { Loader2, AlertTriangle } from 'lucide-react';

interface SitePageViewProps {
  subdomain: string;
}

const DEFAULT_ACCENT = '#f59e0b';

function parseThemeConfig(raw: string | null | undefined): ThemeConfig {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function parseBlockStyle(raw: string | null | undefined): BlockStyle {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

// Tracks whether the real browser viewport is at/under the same 640px
// breakpoint the static mobile-collapse CSS uses, so per-block "mobile"
// style overrides (font size/padding/align) and hide-on-device visibility
// react live to window resizing — not just the grid's own CSS collapse.
function useDeviceBreakpoint(): DeviceBreakpoint {
  const [device, setDevice] = useState<DeviceBreakpoint>(() =>
    typeof window !== 'undefined' && window.innerWidth <= 640 ? 'mobile' : 'desktop'
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setDevice(mq.matches ? 'mobile' : 'desktop');
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return device;
}

// Creates or updates a <meta>/<link> tag by id so repeated visits/site
// switches don't pile up duplicate tags in <head>.
function upsertHeadTag(id: string, build: () => HTMLElement) {
  let el = document.getElementById(id);
  if (!el) {
    el = build();
    el.id = id;
    document.head.appendChild(el);
  }
  return el;
}

// Static (non-dynamic) override that collapses the 12-column grid to a single
// column on phones — blocks placed side by side on desktop (e.g. 4-across)
// simply stack in order instead, ordered by row-then-column via the inline
// `order` set on each wrapper below.
const MOBILE_COLLAPSE_CSS = `
@media (max-width: 640px) {
  .site-grid > .site-grid-block {
    grid-column: 1 / -1 !important;
    grid-row: auto !important;
  }
}
`;

// Dark-theme sites would otherwise print as a solid black page (unreadable,
// wastes ink) — force a white background and keep blocks from splitting
// across a page break. Used by the "Export PDF" button in the Sites builder
// (window.print() on this same live page), but harmless/always-on so a
// manual Ctrl+P from a visitor also gets a sane result.
const PRINT_CSS = `
@media print {
  html, body { background: #ffffff !important; }
  .site-grid-block { break-inside: avoid; page-break-inside: avoid; }
}
`;

export default function SitePageView({ subdomain }: SitePageViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [site, setSite] = useState<PublicSite | null>(null);
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const device = useDeviceBreakpoint();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getPublicSite(subdomain);
        setSite(data.site);
        const sortedBlocks = (data.blocks || []).sort((a, b) => a.position - b.position);
        setBlocks(sortedBlocks);
        if (data.site?.title) document.title = data.site.title;

        const themeConfig = parseThemeConfig(data.site?.theme_config);

        if (data.site?.meta_description) {
          const tag = upsertHeadTag('site-meta-description', () => document.createElement('meta')) as HTMLMetaElement;
          tag.setAttribute('name', 'description');
          tag.setAttribute('content', data.site.meta_description);
        }
        if (data.site?.favicon_url) {
          const tag = upsertHeadTag('site-favicon', () => document.createElement('link')) as HTMLLinkElement;
          tag.setAttribute('rel', 'icon');
          tag.setAttribute('href', data.site.favicon_url);
        }

        const blockFonts = sortedBlocks.map(b => parseBlockStyle(b.style).font_family);
        ensureGoogleFontsLoaded([themeConfig.font_family, themeConfig.heading_font, themeConfig.body_font, ...blockFonts]);
      } catch (err: any) {
        console.error('Failed to load site:', err);
        setError(err.message || 'This site does not exist or is not currently active.');
      } finally {
        setLoading(false);
      }
    })();
  }, [subdomain]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-6">
        <div className="max-w-sm text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-slate-300 text-sm">{error || 'Site not found.'}</p>
        </div>
      </div>
    );
  }

  const dark = site.theme !== 'light';
  const themeConfig = parseThemeConfig(site.theme_config);
  const accent = themeConfig.accent_color || DEFAULT_ACCENT;
  const fontFamily = themeConfig.body_font || themeConfig.font_family || SITE_FONT_OPTIONS[0].value;

  return (
    <div className={dark ? 'min-h-screen bg-[#0a0a0f]' : 'min-h-screen bg-slate-50'} style={{ fontFamily }}>
      <style dangerouslySetInnerHTML={{ __html: MOBILE_COLLAPSE_CSS + PRINT_CSS }} />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div
          className="site-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
            gridAutoRows: `minmax(${ROW_UNIT_PX}px, auto)`,
            // Zero gap is deliberate, not an oversight — the builder canvas
            // (SiteGridCanvas) positions blocks with plain absolute pixel math
            // (`top: row * ROW_UNIT_PX`) and NO gutter at all between grid
            // lines, and every template's grid_row values were authored
            // assuming blocks that share a boundary sit flush against each
            // other (e.g. one block ending at row 20 and the next starting at
            // row 20). A non-zero `rowGap` here doesn't just add one visible
            // gap between blocks — CSS Grid inserts it between EVERY implicit
            // row track, including the ones INSIDE a single block's own
            // multi-row span, so a 20-row-tall hero silently rendered ~380px
            // taller here than in the editor (19 internal gaps × 20px), and
            // intentionally-overlapping locked blocks (a front-locked card
            // meant to sit over a back-locked hero image) ended up pushed far
            // apart instead. That's what caused the editor/live-preview
            // mismatch — matching the editor's zero-gap model exactly fixes
            // it. Use a spacer block or a block's own internal padding for
            // breathing room, same as the editor already assumes.
            columnGap: 0,
            rowGap: 0,
          }}
        >
          {blocks.map((block, idx) => {
            const style = parseBlockStyle(block.style);
            const pos = positionFromStyle(style, idx * 12);
            // hide_on is applied with real Tailwind breakpoint classes (not
            // the JS device hook) so it works even with SSR/no-JS and stays
            // perfectly in sync with the same 640px breakpoint used above.
            const visibilityClass = style.hide_on === 'mobile' ? 'hidden sm:block' : style.hide_on === 'desktop' ? 'sm:hidden' : '';
            // Locked blocks (see the Layers panel in the builder) always
            // paint in front of / behind everything else, matching the
            // editor's canvas — without this, stacking here just falls back
            // to plain DOM order, which only coincidentally matches intent.
            const zIndex = style.z_lock === 'front' ? 30 : style.z_lock === 'back' ? 0 : undefined;
            return (
              <div
                key={block.id}
                className={`site-grid-block ${visibilityClass}`}
                style={{
                  gridColumn: `${pos.grid_col + 1} / span ${pos.grid_col_span}`,
                  gridRow: `${pos.grid_row + 1} / span ${pos.grid_row_span}`,
                  // A definite height, not just a CSS Grid `auto` row-track,
                  // is required here — `h-full`/`height:100%` on a video or
                  // image inside a grid item whose row is auto-sized cannot
                  // reliably resolve (classic CSS Grid circular-sizing
                  // gotcha), so without this the video/image falls back to
                  // its own native intrinsic size instead of filling its
                  // block, which can balloon the whole page's height. This
                  // matches the editor canvas's math exactly (same
                  // ROW_UNIT_PX), so what you see while editing is what
                  // actually ships.
                  height: pos.grid_row_span * ROW_UNIT_PX,
                  order: pos.grid_row * 1000 + pos.grid_col,
                  position: zIndex !== undefined ? 'relative' : undefined,
                  zIndex,
                }}
              >
                <SiteBlockView
                  block={block}
                  dark={dark}
                  accent={accent}
                  secondaryColor={themeConfig.secondary_color}
                  headingFont={themeConfig.heading_font}
                  bodyFont={themeConfig.body_font}
                  subdomain={subdomain}
                  editable={false}
                  device={device}
                />
              </div>
            );
          })}
        </div>
        {blocks.length === 0 && (
          <div className={`text-center py-24 text-sm ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            This page doesn't have any content yet.
          </div>
        )}
      </div>
    </div>
  );
}
