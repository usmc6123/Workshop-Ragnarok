import { SiteBlockType, BlockStyle } from '../types';

// The Sites builder positions blocks on a 12-column grid — the same model
// real page builders (Webflow, Framer, Elementor) use to let blocks sit
// side-by-side ("4 in a row") while still collapsing sanely to a single
// column on phones. True pixel-freeform placement was considered and
// rejected: it looks great in the editor and breaks completely on mobile,
// since there's no sane way to reflow arbitrary (x,y) coordinates onto a
// 375px-wide screen. A grid keeps "place it anywhere, resize it however you
// want" while still being a real, working website on every device.
export const GRID_COLUMNS = 12;

// One vertical "row unit" in pixels, both in the builder canvas and on the
// live page. Blocks size their height in multiples of this. Content taller
// than its assigned row span still renders fully (see grid_row_span below) —
// nothing ever gets clipped, the block just visually grows.
export const ROW_UNIT_PX = 20;

export const MIN_COL_SPAN = 2;
export const MIN_ROW_SPAN = 4;

// Sensible starting height (in row units) for a freshly-added block of each
// type, so a new Hero isn't the same height as a new Spacer by default.
export const DEFAULT_ROW_SPAN: Record<SiteBlockType, number> = {
  hero: 20,
  text: 10,
  image: 14,
  video: 16,
  cta: 10,
  contact_form: 18,
  testimonial: 12,
  pricing: 16,
  faq: 14,
  spacer: 3,
  ai_chat_bot: 24,
  funnel: 22,
  link_button: 6,
};

export interface GridPosition {
  grid_col: number;      // 0-11, start column
  grid_col_span: number; // 1-12, width in columns
  grid_row: number;      // 0-based start row
  grid_row_span: number; // height in row units
}

export function defaultGridPosition(blockType: SiteBlockType, nextRow: number): GridPosition {
  return {
    grid_col: 0,
    grid_col_span: GRID_COLUMNS,
    grid_row: nextRow,
    grid_row_span: DEFAULT_ROW_SPAN[blockType] || 10,
  };
}

// Reads a block's grid position out of its (already-parsed) style object,
// falling back to "full width" and a caller-supplied row if unset — e.g. for
// legacy blocks created before the grid system existed.
export function positionFromStyle(style: BlockStyle, fallbackRow: number): GridPosition {
  return {
    grid_col: style.grid_col ?? 0,
    grid_col_span: style.grid_col_span ?? GRID_COLUMNS,
    grid_row: style.grid_row ?? fallbackRow,
    grid_row_span: style.grid_row_span ?? 10,
  };
}

// Finds the first empty row below every existing block, so a newly added
// block always lands below everything else instead of overlapping it.
export function nextAvailableRow(positions: GridPosition[]): number {
  if (positions.length === 0) return 0;
  return Math.max(...positions.map(p => p.grid_row + p.grid_row_span));
}

export function clampCol(col: number): number {
  return Math.max(0, Math.min(GRID_COLUMNS - MIN_COL_SPAN, Math.round(col)));
}
export function clampColSpan(col: number, span: number): number {
  const rounded = Math.max(MIN_COL_SPAN, Math.round(span));
  return Math.min(rounded, GRID_COLUMNS - col);
}
export function clampRow(row: number): number {
  return Math.max(0, Math.round(row));
}
export function clampRowSpan(span: number): number {
  return Math.max(MIN_ROW_SPAN, Math.round(span));
}
