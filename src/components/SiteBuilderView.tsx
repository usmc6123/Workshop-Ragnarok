import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import {
  Site, SiteBlock, SiteBlockType, SiteMessage, ThemeConfig, BlockStyle, DeviceBreakpoint, MediaTransform,
  HeroBlockContent, ImageBlockContent, VideoBlockContent, CtaBlockContent,
  ContactFormBlockContent, TestimonialBlockContent, PricingBlockContent, FaqBlockContent, SpacerBlockContent,
  PricingTier, FaqItem, ContactFormField,
} from '../types';
import { SITE_FONT_OPTIONS, ensureGoogleFontsLoaded } from '../constants/siteFonts';
import { SITE_TEMPLATES, SiteTemplate } from '../constants/siteTemplates';
import { BLOCK_TYPES, blockMeta } from '../constants/siteBlockTypes';
import { GridPosition, defaultGridPosition, nextAvailableRow, positionFromStyle } from '../constants/siteGrid';
import { SITE_ICON_NAMES } from '../constants/siteIcons';
import { SITES_BASE_DOMAIN } from '../constants/sites';
import { SITE_THEME_PRESETS, SiteThemePreset } from '../constants/sitePresets';
import SiteGridCanvas, { TransformEditTarget } from './SiteGridCanvas';
import SiteLayersPanel from './SiteLayersPanel';
import TemplateThumbnail from './TemplateThumbnail';
import MediaField from './MediaField';
import {
  ArrowLeft, Plus, Trash2, Loader2,
  Save, X, Mailbox, ExternalLink,
  Palette, AlignLeft, AlignCenter, AlignRight, Paintbrush, Sparkles, LayoutGrid, LayoutTemplate,
  Undo2, Redo2, Monitor, Tablet, Smartphone, Copy, Settings2, EyeOff, Download, FileJson, RefreshCw,
  ArrowUpToLine, ArrowDownToLine, ZoomIn, FileCode, Printer, History, ChevronDown,
  Check, Sliders,
} from 'lucide-react';

const DEFAULT_ACCENT = '#f59e0b';

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function parseThemeConfig(raw: string | null | undefined): ThemeConfig {
  return parseJson<ThemeConfig>(raw, {});
}

// --- Reused input styling helper components ------------------------------------

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{children}</label>;
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none resize-y"
    />
  );
}

function IconPickerSelect({ value, onChange, label }: { value: string | undefined; onChange: (v: string | undefined) => void; label: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-2 py-2 text-xs text-white focus:outline-none"
      >
        <option value="">No icon</option>
        {SITE_ICON_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
      </select>
    </div>
  );
}

function PresetToggle<T extends string | number>({
  options, value, onChange,
}: {
  options: { value: T; label: string; icon?: React.ElementType }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(opt => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border cursor-pointer flex items-center gap-1 transition ${active ? 'border-amber-400 bg-amber-950/20 text-amber-300' : 'border-[#1e2028] text-slate-400 hover:border-slate-600'}`}
          >
            {Icon && <Icon className="w-3 h-3" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string | undefined; onChange: (v: string | undefined) => void }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2 rounded-lg bg-[#0c0d12] border border-[#1e2028] px-2 py-1.5">
        <input
          type="color"
          value={value || '#111318'}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0 shrink-0"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder="Site default"
          className="flex-1 min-w-0 bg-transparent text-xs text-white font-mono placeholder-slate-600 focus:outline-none"
        />
        {value && (
          <button onClick={() => onChange(undefined)} className="text-slate-500 hover:text-white cursor-pointer shrink-0" title="Reset to site default">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// A theme preset's "thumbnail" is a real live mockup rendered with the preset's
// actual accent/secondary colors and font pairing — not a screenshot or a static
// image, so it never goes stale and always shows exactly what applying it does.
// `dark` reflects the site's own current dark/light mode (set elsewhere, in
// SitesView's Settings modal) so the preview's background always matches what
// the preset would actually look like on this specific site.
function ThemePresetCard({ preset, active, dark, onClick }: { preset: SiteThemePreset; active: boolean; dark: boolean; onClick: () => void }) {
  const pageBg = dark ? '#0b0c10' : '#ffffff';
  const mutedText = dark ? '#94a3b8' : '#64748b';
  const buttonText = dark ? '#0b0c10' : '#ffffff';
  return (
    <button
      type="button"
      onClick={onClick}
      title={preset.description}
      className={`group text-left rounded-xl border p-2.5 transition cursor-pointer ${
        active ? 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-500/[0.06]' : 'border-[#1e2028] bg-[#0f1015] hover:border-slate-500'
      }`}
    >
      <div
        className="rounded-lg overflow-hidden border border-black/30 p-3 flex flex-col gap-1.5 shadow-inner"
        style={{ backgroundColor: pageBg }}
      >
        <div className="w-7 h-1.5 rounded-full" style={{ backgroundColor: preset.secondary_color }} />
        <div className="text-[15px] leading-tight font-bold truncate" style={{ fontFamily: preset.heading_font, color: preset.accent_color }}>
          Your Shop Name
        </div>
        <div className="text-[9.5px] leading-snug" style={{ fontFamily: preset.body_font, color: mutedText }}>
          Trusted auto repair, done right.
        </div>
        <div
          className="mt-1 inline-flex w-fit px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wide"
          style={{ backgroundColor: preset.accent_color, color: buttonText, fontFamily: preset.body_font }}
        >
          Book Now
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-1">
        <span className="text-[11px] font-bold text-white truncate">{preset.name}</span>
        {active && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
      </div>
      <p className="text-[9.5px] text-slate-500 leading-snug mt-0.5 line-clamp-2">{preset.description}</p>
    </button>
  );
}

const ALIGNABLE_TYPES: SiteBlockType[] = ['hero', 'text', 'cta', 'testimonial'];
const ALIGN_OPTIONS: { value: NonNullable<BlockStyle['align']>; label: string; icon: React.ElementType }[] = [
  { value: 'left', label: 'Left', icon: AlignLeft },
  { value: 'center', label: 'Center', icon: AlignCenter },
  { value: 'right', label: 'Right', icon: AlignRight },
];
const FONT_SIZE_OPTIONS: { value: NonNullable<BlockStyle['font_size']>; label: string }[] = [
  { value: 'sm', label: 'S' }, { value: 'md', label: 'M' }, { value: 'lg', label: 'L' }, { value: 'xl', label: 'XL' },
];
const PADDING_OPTIONS: { value: NonNullable<BlockStyle['padding']>; label: string }[] = [
  { value: 'sm', label: 'Compact' }, { value: 'md', label: 'Comfortable' }, { value: 'lg', label: 'Spacious' },
];
const BORDER_WIDTH_OPTIONS: { value: NonNullable<BlockStyle['border_width']>; label: string }[] = [
  { value: 0, label: 'None' }, { value: 1, label: '1px' }, { value: 2, label: '2px' }, { value: 4, label: '4px' },
];
const BORDER_STYLE_OPTIONS: { value: NonNullable<BlockStyle['border_style']>; label: string }[] = [
  { value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashed' }, { value: 'dotted', label: 'Dotted' },
];
const RADIUS_OPTIONS: { value: NonNullable<BlockStyle['border_radius']>; label: string }[] = [
  { value: 'none', label: 'None' }, { value: 'sm', label: 'S' }, { value: 'md', label: 'M' }, { value: 'lg', label: 'L' }, { value: 'full', label: 'Pill' },
];
const SHADOW_OPTIONS: { value: NonNullable<BlockStyle['shadow']>; label: string }[] = [
  { value: 'none', label: 'None' }, { value: 'sm', label: 'S' }, { value: 'md', label: 'M' }, { value: 'lg', label: 'L' }, { value: 'xl', label: 'XL' },
];
const GRADIENT_DIR_OPTIONS: { value: NonNullable<BlockStyle['bg_gradient_direction']>; label: string }[] = [
  { value: 'to-r', label: '→' }, { value: 'to-l', label: '←' }, { value: 'to-b', label: '↓' },
  { value: 'to-t', label: '↑' }, { value: 'to-br', label: '↘' }, { value: 'to-bl', label: '↙' },
];

function BlockStyleEditor({ blockType, style, onChange, device }: { blockType: SiteBlockType; style: BlockStyle; onChange: (next: BlockStyle) => void; device: DeviceBreakpoint }) {
  const set = (patch: Partial<BlockStyle>) => onChange({ ...style, ...patch });
  const setMobile = (patch: Partial<BlockStyle['mobile']>) => onChange({ ...style, mobile: { ...(style.mobile || {}), ...patch } });
  const [gradientMode, setGradientMode] = useState(style.bg_type === 'gradient');

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#1e2028] bg-[#0c0d12]/40 p-3 space-y-3">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
          <Paintbrush className="w-3 h-3" /> Style
        </div>
        <p className="text-[9px] text-slate-600 -mt-1.5">Position and size are set by dragging the block on the canvas.</p>

        {ALIGNABLE_TYPES.includes(blockType) && (
          <div>
            <FieldLabel>Text Alignment</FieldLabel>
            <PresetToggle options={ALIGN_OPTIONS} value={style.align || (blockType === 'hero' ? 'center' : 'left')} onChange={(v) => set({ align: v })} />
          </div>
        )}

        {blockType !== 'spacer' && blockType !== 'image' && blockType !== 'video' && (
          <div>
            <FieldLabel>Text Size</FieldLabel>
            <PresetToggle options={FONT_SIZE_OPTIONS} value={style.font_size || 'md'} onChange={(v) => set({ font_size: v })} />
          </div>
        )}

        {blockType !== 'spacer' && (
          <div>
            <FieldLabel>Spacing</FieldLabel>
            <PresetToggle options={PADDING_OPTIONS} value={style.padding || 'md'} onChange={(v) => set({ padding: v })} />
          </div>
        )}

        {blockType !== 'spacer' && (
          <div>
            <FieldLabel>Font</FieldLabel>
            <select
              value={style.font_family || ''}
              onChange={(e) => set({ font_family: e.target.value || undefined })}
              className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-2 py-2 text-xs text-white focus:outline-none"
              style={{ fontFamily: style.font_family || undefined }}
            >
              <option value="">Use Site Font</option>
              {SITE_FONT_OPTIONS.map(f => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
              ))}
            </select>
          </div>
        )}

        {blockType !== 'spacer' && (
          <div>
            <FieldLabel>Line Height</FieldLabel>
            <PresetToggle options={[{ value: 'tight', label: 'Tight' }, { value: 'normal', label: 'Normal' }, { value: 'relaxed', label: 'Relaxed' }]} value={style.line_height || 'normal'} onChange={(v) => set({ line_height: v as any })} />
          </div>
        )}
      </div>

      {blockType !== 'spacer' && blockType !== 'image' && blockType !== 'video' && (
        <div className="rounded-lg border border-[#1e2028] bg-[#0c0d12]/40 p-3 space-y-3">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
            <Palette className="w-3 h-3" /> Colors & Background
          </div>
          <div>
            <FieldLabel>Background</FieldLabel>
            <PresetToggle
              options={[{ value: 'solid', label: 'Solid' }, { value: 'gradient', label: 'Gradient' }]}
              value={gradientMode ? 'gradient' : 'solid'}
              onChange={(v) => { setGradientMode(v === 'gradient'); set({ bg_type: v as any }); }}
            />
          </div>
          {gradientMode ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <ColorField label="From" value={style.bg_gradient_from} onChange={(v) => set({ bg_gradient_from: v })} />
                <ColorField label="To" value={style.bg_gradient_to} onChange={(v) => set({ bg_gradient_to: v })} />
              </div>
              <div>
                <FieldLabel>Direction</FieldLabel>
                <PresetToggle options={GRADIENT_DIR_OPTIONS} value={style.bg_gradient_direction || 'to-br'} onChange={(v) => set({ bg_gradient_direction: v })} />
              </div>
            </div>
          ) : (
            <ColorField label="Background Color" value={style.bg_color} onChange={(v) => set({ bg_color: v })} />
          )}
          <ColorField label="Text Color" value={style.text_color} onChange={(v) => set({ text_color: v })} />
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Hover Background" value={style.hover_bg_color} onChange={(v) => set({ hover_bg_color: v })} />
            <ColorField label="Hover Text" value={style.hover_text_color} onChange={(v) => set({ hover_text_color: v })} />
          </div>
        </div>
      )}

      {blockType !== 'spacer' && (
        <div className="rounded-lg border border-[#1e2028] bg-[#0c0d12]/40 p-3 space-y-3">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
            <LayoutGrid className="w-3 h-3" /> Border & Shadow
          </div>
          <div>
            <FieldLabel>Border Width</FieldLabel>
            <PresetToggle options={BORDER_WIDTH_OPTIONS} value={style.border_width ?? 0} onChange={(v) => set({ border_width: v })} />
          </div>
          {(style.border_width ?? 0) > 0 && (
            <>
              <div>
                <FieldLabel>Border Style</FieldLabel>
                <PresetToggle options={BORDER_STYLE_OPTIONS} value={style.border_style || 'solid'} onChange={(v) => set({ border_style: v })} />
              </div>
              <ColorField label="Border Color" value={style.border_color} onChange={(v) => set({ border_color: v })} />
            </>
          )}
          <div>
            <FieldLabel>Corner Radius</FieldLabel>
            <PresetToggle options={RADIUS_OPTIONS} value={style.border_radius || 'md'} onChange={(v) => set({ border_radius: v })} />
          </div>
          <div>
            <FieldLabel>Shadow</FieldLabel>
            <PresetToggle options={SHADOW_OPTIONS} value={style.shadow || 'none'} onChange={(v) => set({ shadow: v })} />
          </div>
        </div>
      )}

      <div className="rounded-lg border border-[#1e2028] bg-[#0c0d12]/40 p-3 space-y-3">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
          <Smartphone className="w-3 h-3" /> Responsive
        </div>
        <div>
          <FieldLabel>Visibility</FieldLabel>
          <PresetToggle
            options={[{ value: 'none', label: 'Show Always' }, { value: 'mobile', label: 'Hide on Mobile' }, { value: 'desktop', label: 'Hide on Desktop' }]}
            value={style.hide_on || 'none'}
            onChange={(v) => set({ hide_on: v === 'none' ? undefined : (v as any) })}
          />
        </div>
        {blockType !== 'spacer' && (
          <div className="space-y-2 pt-1 border-t border-[#1e2028]/60">
            <FieldLabel>Mobile Overrides {device === 'mobile' ? '(editing — switch canvas to mobile preview to see live)' : ''}</FieldLabel>
            <PresetToggle options={FONT_SIZE_OPTIONS} value={style.mobile?.font_size || style.font_size || 'md'} onChange={(v) => setMobile({ font_size: v })} />
            <PresetToggle options={PADDING_OPTIONS} value={style.mobile?.padding || style.padding || 'md'} onChange={(v) => setMobile({ padding: v })} />
            {ALIGNABLE_TYPES.includes(blockType) && (
              <PresetToggle options={ALIGN_OPTIONS} value={style.mobile?.align || style.align || 'left'} onChange={(v) => setMobile({ align: v })} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- The per-block-type structural content editor (non-inline-editable parts) --

function BlockContentEditor({
  blockType, content, mediaOpacity, onContentChange, onOpacityChange,
}: {
  blockType: SiteBlockType;
  content: any;
  mediaOpacity: Record<string, number>;
  onContentChange: (next: any) => void;
  onOpacityChange: (key: string, value: number) => void;
}) {
  const set = (patch: object) => onContentChange({ ...content, ...patch });

  switch (blockType) {
    case 'hero': {
      const c: HeroBlockContent = content;
      return (
        <div className="space-y-3">
          <p className="text-[10px] text-slate-500 -mt-1">Headline, subheadline, and button text are edited directly on the canvas — click the text to type.</p>
          <MediaField label="Background Image URL" value={c.image_url || ''} onChange={(v) => set({ image_url: v })} opacityKey="image_url" mediaOpacity={mediaOpacity} onOpacityChange={onOpacityChange} showOpacity accept="image" />
          {c.image_url && (
            <div>
              <FieldLabel>Image Alt Text</FieldLabel>
              <TextInput value={c.image_alt || ''} onChange={(v) => set({ image_alt: v })} placeholder="Describes the image for screen readers & Google Images" />
            </div>
          )}
          <MediaField label="Background Video URL" value={c.video_url || ''} onChange={(v) => set({ video_url: v })} opacityKey="video_url" mediaOpacity={mediaOpacity} onOpacityChange={onOpacityChange} showOpacity accept="video" />
          <div><FieldLabel>Button Link</FieldLabel><TextInput value={c.cta_link || ''} onChange={(v) => set({ cta_link: v })} placeholder="https:// or #contact" /></div>
          <div className="grid grid-cols-2 gap-3">
            <IconPickerSelect label="Button Icon" value={c.cta_icon} onChange={(v) => set({ cta_icon: v })} />
            <div>
              <FieldLabel>Icon Position</FieldLabel>
              <PresetToggle options={[{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }]} value={c.cta_icon_position || 'left'} onChange={(v) => set({ cta_icon_position: v })} />
            </div>
          </div>
        </div>
      );
    }
    case 'text': {
      return <p className="text-[10px] text-slate-500">Headline and body text are edited directly on the canvas — click the text to type. Use the Style tab for typography.</p>;
    }
    case 'image': {
      const c: ImageBlockContent = content;
      const images = c.images || [];
      const updateImage = (idx: number, patch: object) => set({ images: images.map((img, i) => i === idx ? { ...img, ...patch } : img) });
      const removeImage = (idx: number) => set({ images: images.filter((_, i) => i !== idx) });
      const addImage = () => set({ images: [...images, { url: '', caption: '' }] });
      return (
        <div className="space-y-3">
          <div>
            <FieldLabel>Layout</FieldLabel>
            <PresetToggle options={[{ value: 'grid', label: 'Grid' }, { value: 'carousel', label: 'Carousel' }]} value={c.layout || 'grid'} onChange={(v) => set({ layout: v })} />
          </div>
          {c.layout === 'carousel' && (
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input type="checkbox" checked={!!c.carousel_autoplay} onChange={(e) => set({ carousel_autoplay: e.target.checked })} className="w-4 h-4" />
              <span>Autoplay slides</span>
            </label>
          )}
          <div>
            <FieldLabel>Image Fit</FieldLabel>
            <PresetToggle options={[{ value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }]} value={c.object_fit || 'cover'} onChange={(v) => set({ object_fit: v })} />
          </div>
          {images.map((img, idx) => (
            <div key={idx} className="rounded-lg border border-[#1e2028] bg-[#0c0d12]/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Image {idx + 1}</span>
                <button onClick={() => removeImage(idx)} className="text-rose-400 hover:text-rose-300 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
              </div>
              <MediaField value={img.url} onChange={(v) => updateImage(idx, { url: v })} opacityKey={`gallery_${idx}`} mediaOpacity={mediaOpacity} onOpacityChange={onOpacityChange} showOpacity accept="image" placeholder="https://..." />
              <TextInput value={img.caption || ''} onChange={(v) => updateImage(idx, { caption: v })} placeholder="Caption (optional, shown on the page)" />
              <TextInput value={img.alt || ''} onChange={(v) => updateImage(idx, { alt: v })} placeholder="Alt text (optional, for screen readers & Google Images — falls back to caption)" />
            </div>
          ))}
          <button onClick={addImage} className="w-full px-3 py-2 border border-dashed border-[#1e2028] hover:border-amber-500/40 rounded-lg text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-amber-300 transition cursor-pointer flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Image
          </button>
        </div>
      );
    }
    case 'video': {
      const c: VideoBlockContent = content;
      return (
        <div className="space-y-3">
          <MediaField label="Video URL (YouTube, Vimeo, or direct file)" value={c.video_url || ''} onChange={(v) => set({ video_url: v })} opacityKey="video_url" mediaOpacity={mediaOpacity} onOpacityChange={onOpacityChange} showOpacity accept="video" help="Upload a video file directly, or paste a YouTube/Vimeo link instead." />
          <div>
            <FieldLabel>Video Fit</FieldLabel>
            <PresetToggle options={[{ value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }]} value={c.object_fit || 'cover'} onChange={(v) => set({ object_fit: v })} />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input type="checkbox" checked={!!c.autoplay} onChange={(e) => set({ autoplay: e.target.checked })} className="w-4 h-4" />
              <span>Autoplay (muted)</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input type="checkbox" checked={c.controls !== false} onChange={(e) => set({ controls: e.target.checked })} className="w-4 h-4" />
              <span>Show controls</span>
            </label>
          </div>
        </div>
      );
    }
    case 'cta': {
      const c: CtaBlockContent = content;
      return (
        <div className="space-y-3">
          <p className="text-[10px] text-slate-500 -mt-1">Headline, subheadline, and button text are edited directly on the canvas.</p>
          <div><FieldLabel>Button Link</FieldLabel><TextInput value={c.button_link || ''} onChange={(v) => set({ button_link: v })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <IconPickerSelect label="Button Icon" value={c.button_icon} onChange={(v) => set({ button_icon: v })} />
            <div>
              <FieldLabel>Icon Position</FieldLabel>
              <PresetToggle options={[{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }]} value={c.button_icon_position || 'left'} onChange={(v) => set({ button_icon_position: v })} />
            </div>
          </div>
        </div>
      );
    }
    case 'contact_form': {
      const c: ContactFormBlockContent = content;
      const fields = c.fields || [];
      const updateField = (idx: number, patch: Partial<ContactFormField>) => set({ fields: fields.map((f, i) => i === idx ? { ...f, ...patch } : f) });
      const removeField = (idx: number) => set({ fields: fields.filter((_, i) => i !== idx) });
      const addField = () => set({ fields: [...fields, { id: `field_${Date.now()}`, type: 'text', label: 'New Field', required: false }] });
      return (
        <div className="space-y-3">
          <p className="text-[10px] text-slate-500 -mt-1">Headline, subheadline, and submit button text are edited directly on the canvas.</p>
          <p className="text-[10px] text-slate-500">Add custom fields to replace the default Name / Email / Message trio. Leave empty to keep the default form.</p>
          {fields.map((f, idx) => (
            <div key={f.id} className="rounded-lg border border-[#1e2028] bg-[#0c0d12]/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Field {idx + 1}</span>
                <button onClick={() => removeField(idx)} className="text-rose-400 hover:text-rose-300 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
              </div>
              <TextInput value={f.label} onChange={(v) => updateField(idx, { label: v })} placeholder="Field label" />
              <select value={f.type} onChange={(e) => updateField(idx, { type: e.target.value as ContactFormField['type'] })} className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-2 py-2 text-xs text-white focus:outline-none">
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="textarea">Multi-line Text</option>
                <option value="dropdown">Dropdown</option>
                <option value="checkbox">Checkbox</option>
              </select>
              {f.type === 'dropdown' && (
                <TextArea value={(f.options || []).join('\n')} onChange={(v) => updateField(idx, { options: v.split('\n').map(s => s.trim()).filter(Boolean) })} placeholder={'One option per line'} rows={2} />
              )}
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input type="checkbox" checked={!!f.required} onChange={(e) => updateField(idx, { required: e.target.checked })} className="w-4 h-4" />
                <span>Required</span>
              </label>
            </div>
          ))}
          <button onClick={addField} className="w-full px-3 py-2 border border-dashed border-[#1e2028] hover:border-amber-500/40 rounded-lg text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-amber-300 transition cursor-pointer flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Custom Field
          </button>
        </div>
      );
    }
    case 'testimonial': {
      const c: TestimonialBlockContent = content;
      return (
        <div className="space-y-3">
          <p className="text-[10px] text-slate-500 -mt-1">Quote, author, and role are edited directly on the canvas.</p>
          <MediaField label="Photo URL (optional)" value={c.photo_url || ''} onChange={(v) => set({ photo_url: v })} opacityKey="photo_url" mediaOpacity={mediaOpacity} onOpacityChange={onOpacityChange} showOpacity accept="image" />
        </div>
      );
    }
    case 'pricing': {
      const c: PricingBlockContent = content;
      const tiers = c.tiers || [];
      const updateTier = (idx: number, patch: Partial<PricingTier>) => set({ tiers: tiers.map((t, i) => i === idx ? { ...t, ...patch } : t) });
      const removeTier = (idx: number) => set({ tiers: tiers.filter((_, i) => i !== idx) });
      const addTier = () => set({ tiers: [...tiers, { name: 'New Plan', price: '$0', features: [] }] });
      const updateFeatures = (idx: number, raw: string) => updateTier(idx, { features: raw.split('\n').map(s => s.trim()).filter(Boolean) });
      return (
        <div className="space-y-3">
          <p className="text-[10px] text-slate-500 -mt-1">Section headline, plan names, and prices are edited directly on the canvas — manage the list and features here.</p>
          {tiers.map((tier, idx) => (
            <div key={idx} className="rounded-lg border border-[#1e2028] bg-[#0c0d12]/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Plan {idx + 1}: {tier.name || 'Untitled'}</span>
                <button onClick={() => removeTier(idx)} className="text-rose-400 hover:text-rose-300 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
              </div>
              <TextArea value={(tier.features || []).join('\n')} onChange={(v) => updateFeatures(idx, v)} placeholder={'One feature per line'} rows={3} />
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input type="checkbox" checked={!!tier.highlighted} onChange={(e) => updateTier(idx, { highlighted: e.target.checked })} className="w-4 h-4" />
                <span>Highlight this plan</span>
              </label>
            </div>
          ))}
          <button onClick={addTier} className="w-full px-3 py-2 border border-dashed border-[#1e2028] hover:border-amber-500/40 rounded-lg text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-amber-300 transition cursor-pointer flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Plan
          </button>
        </div>
      );
    }
    case 'faq': {
      const c: FaqBlockContent = content;
      const items = c.items || [];
      const removeItem = (idx: number) => set({ items: items.filter((_, i) => i !== idx) });
      const addItem = () => set({ items: [...items, { question: 'New question', answer: '' }] });
      return (
        <div className="space-y-3">
          <p className="text-[10px] text-slate-500 -mt-1">Section headline, questions, and answers are edited directly on the canvas — manage the list here.</p>
          {items.map((item, idx) => (
            <div key={idx} className="rounded-lg border border-[#1e2028] bg-[#0c0d12]/60 p-3 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400 truncate">{item.question || `Question ${idx + 1}`}</span>
              <button onClick={() => removeItem(idx)} className="text-rose-400 hover:text-rose-300 cursor-pointer shrink-0"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
          <button onClick={addItem} className="w-full px-3 py-2 border border-dashed border-[#1e2028] hover:border-amber-500/40 rounded-lg text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-amber-300 transition cursor-pointer flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Question
          </button>
        </div>
      );
    }
    case 'spacer': {
      const c: SpacerBlockContent = content;
      return (
        <div>
          <FieldLabel>Height</FieldLabel>
          <div className="flex gap-2">
            {(['sm', 'md', 'lg'] as const).map(s => (
              <button key={s} type="button" onClick={() => set({ size: s })}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${(c.size || 'md') === s ? 'border-amber-400 bg-amber-950/20 text-amber-300' : 'border-[#1e2028] text-slate-400 hover:border-slate-600'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

// --- Main builder view --------------------------------------------------------

export default function SiteBuilderView({ site, onBack }: { site: Site; onBack: () => void }) {
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [device, setDevice] = useState<DeviceBreakpoint>('desktop');

  const [inspectorBlock, setInspectorBlock] = useState<SiteBlock | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'content' | 'style'>('content');
  const [draftContent, setDraftContent] = useState<any>(null);
  const [draftOpacity, setDraftOpacity] = useState<Record<string, number>>({});
  const [draftStyle, setDraftStyle] = useState<BlockStyle>({});
  const inspectorSaveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const [contextMenu, setContextMenu] = useState<{ block: SiteBlock; x: number; y: number; mediaKey: string | null } | null>(null);

  // Right-click on Undo/Redo — a jump-list of past/future edits instead of
  // clicking one-by-one.
  const [historyMenu, setHistoryMenu] = useState<{ direction: 'undo' | 'redo'; x: number; y: number } | null>(null);

  // One "Export" button with a format picker dropdown, instead of a separate
  // toolbar button per format.
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // "Zoom & Position" (right-click a block's image/video) — which block +
  // media-field key is currently in the interactive drag/scroll-to-zoom
  // mode on the canvas. null means normal editing.
  const [transformEditTarget, setTransformEditTarget] = useState<TransformEditTarget | null>(null);
  const transformSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // One undo step per drag/scroll burst, not per pixel/wheel-tick — same
  // "pushed" flag pattern as the inspector/content debounced saves above.
  // (Declared here even though `pushHistory` itself is defined further down
  // in this component — fine, since this function only ever runs later, as
  // an event callback, by which point `pushHistory` already exists in the
  // closure for that render.)
  const transformHistoryPushed = useRef<Set<string>>(new Set());

  // Same per-key debounce pattern as scheduleInspectorSave, and same
  // partial-update contract on the backend — only media_transform is ever
  // sent, content/style are left untouched.
  const handleTransformChange = (blockId: number, mediaKey: string, next: MediaTransform) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const currentMap = parseJson<Record<string, MediaTransform>>(block.media_transform, {});
    const nextMap = { ...currentMap, [mediaKey]: next };
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, media_transform: JSON.stringify(nextMap) } : b));

    const timerKey = `${blockId}:${mediaKey}`;
    if (!transformHistoryPushed.current.has(timerKey)) {
      pushHistory(`Repositioned image/video: ${blockMeta(block.block_type).label} block`);
      transformHistoryPushed.current.add(timerKey);
    }
    if (transformSaveTimers.current[timerKey]) clearTimeout(transformSaveTimers.current[timerKey]);
    transformSaveTimers.current[timerKey] = setTimeout(async () => {
      delete transformSaveTimers.current[timerKey];
      transformHistoryPushed.current.delete(timerKey);
      try {
        const updated = await api.updateSiteBlock(site.id, blockId, { media_transform: nextMap });
        setBlocks(prev => prev.map(b => b.id === blockId ? updated : b));
      } catch (err) {
        console.error(err);
        loadBlocks();
      }
    }, 300);
  };

  const [tab, setTab] = useState<'blocks' | 'theme' | 'messages'>('blocks');
  const [messages, setMessages] = useState<SiteMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [themeForm, setThemeForm] = useState<ThemeConfig>(() => parseThemeConfig(site.theme_config));
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeSaved, setThemeSaved] = useState(false);

  const dark = site.theme === 'dark';
  const accent = themeForm.accent_color || DEFAULT_ACCENT;

  // Undo/redo — a real, server-persisted history, not just a visual rollback.
  // Each entry is exactly ONE logical edit (one click, one drag gesture, one
  // debounced burst of typing/dragging) with a human-readable label, so the
  // history dropdown (right-click Undo/Redo) can show a real list to jump
  // through instead of just a stack depth.
  interface HistoryEntry { label: string; blocks: SiteBlock[]; }
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const blocksRef = useRef<SiteBlock[]>([]);
  blocksRef.current = blocks;

  // Called BEFORE a mutation is applied to local state, so it snapshots the
  // pre-edit state (blocksRef.current still reflects last render's committed
  // state at the point any handler below calls this, even if called after a
  // setBlocks() earlier in the same handler — React doesn't re-render, and
  // therefore doesn't update the ref, until the handler finishes).
  const pushHistory = (label: string) => {
    setHistory(prev => [...prev, { label, blocks: blocksRef.current.map(b => ({ ...b })) }].slice(-30));
    setFuture([]);
  };

  const restoreSnapshot = async (snapshot: SiteBlock[]) => {
    setHistoryBusy(true);
    try {
      const current = blocksRef.current;
      const snapshotIds = new Set(snapshot.map(b => b.id));
      const currentIds = new Set(current.map(b => b.id));

      for (const b of current) {
        if (!snapshotIds.has(b.id)) {
          await api.deleteSiteBlock(site.id, b.id).catch(() => {});
        }
      }
      for (const b of snapshot) {
        if (!currentIds.has(b.id)) {
          await api.createSiteBlock(site.id, {
            block_type: b.block_type,
            content: parseJson(b.content, {}),
            media_opacity: parseJson(b.media_opacity, {}),
            style: parseJson(b.style, {}),
          }).catch(() => {});
        }
      }
      for (const b of snapshot) {
        const cur = current.find(x => x.id === b.id);
        if (cur && (cur.content !== b.content || cur.media_opacity !== b.media_opacity || cur.style !== b.style || cur.media_transform !== b.media_transform)) {
          await api.updateSiteBlock(site.id, b.id, {
            content: parseJson(b.content, {}),
            media_opacity: parseJson(b.media_opacity, {}),
            media_transform: parseJson(b.media_transform, {}),
            style: parseJson(b.style, {}),
          }).catch(() => {});
        }
      }
      await loadBlocks();
    } finally {
      setHistoryBusy(false);
    }
  };

  // Converts a "chain" of entries being passed over (oldest-of-chain first,
  // nearest-to-current-boundary last — i.e. exactly what history.slice(index)
  // or future.slice(index) produces) into the correctly re-labeled entries
  // for the OTHER stack. Each entry's label describes an edit; the state that
  // edit PRODUCES is the next entry's stored blocks (or `boundaryBlocks` —
  // the actual current state — for the very last one in the chain). Walking
  // the chain back-to-front pairs each label with the right resulting state
  // and naturally comes out in the correct order for the destination stack.
  const relabelChain = (chain: HistoryEntry[], boundaryBlocks: SiteBlock[]): HistoryEntry[] => {
    const out: HistoryEntry[] = [];
    for (let j = chain.length - 1; j >= 0; j--) {
      const producedBlocks = j + 1 < chain.length ? chain[j + 1].blocks : boundaryBlocks;
      out.push({ label: chain[j].label, blocks: producedBlocks });
    }
    return out;
  };

  // Jump directly to any point in the past/future timeline (used by both the
  // plain Undo/Redo buttons — jumping exactly one step — and the right-click
  // history dropdown, which can jump several steps at once). `index` is
  // 0-based into `history`/`future` (both ordered oldest-first).
  const jumpBackTo = async (index: number) => {
    if (index < 0 || index >= history.length || historyBusy) return;
    const target = history[index];
    const currentBlocks = blocksRef.current.map(b => ({ ...b }));
    const newFutureEntries = relabelChain(history.slice(index), currentBlocks);
    setHistory(prev => prev.slice(0, index));
    setFuture(prev => [...prev, ...newFutureEntries]);
    await restoreSnapshot(target.blocks);
  };

  const jumpForwardTo = async (index: number) => {
    if (index < 0 || index >= future.length || historyBusy) return;
    const target = future[index];
    const currentBlocks = blocksRef.current.map(b => ({ ...b }));
    const newHistoryEntries = relabelChain(future.slice(index), currentBlocks);
    setFuture(prev => prev.slice(0, index));
    setHistory(prev => [...prev, ...newHistoryEntries]);
    await restoreSnapshot(target.blocks);
  };

  const handleUndo = () => jumpBackTo(history.length - 1);
  const handleRedo = () => jumpForwardTo(future.length - 1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (tab !== 'blocks') return;
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tab, history, future, historyBusy]);

  useEffect(() => {
    const closeMenu = () => { setContextMenu(null); setHistoryMenu(null); setExportMenuOpen(false); };
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    loadBlocks();
    ensureGoogleFontsLoaded([parseThemeConfig(site.theme_config).font_family, ...SITE_FONT_OPTIONS.map(f => f.value)]);
  }, [site.id]);

  const loadBlocks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSiteBlocks(site.id);
      setBlocks(data.sort((a, b) => a.position - b.position));
    } catch (err) {
      console.error(err);
      setError('Failed to load blocks.');
    } finally {
      setLoading(false);
    }
  };

  // Manual "Refresh" button — re-pulls the canonical block list from the
  // server. Useful after edits made elsewhere (another tab, an undo/redo that
  // didn't fully settle, etc.) since everything else here autosaves silently
  // with no visible confirmation that the server actually has the latest copy.
  const handleRefreshBlocks = async () => {
    setSelectedId(null);
    setInspectorBlock(null);
    setContextMenu(null);
    await loadBlocks();
  };

  const loadMessages = async () => {
    setMessagesLoading(true);
    try {
      setMessages(await api.getSiteMessages(site.id));
    } catch (err) {
      console.error(err);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => { if (tab === 'messages') loadMessages(); }, [tab]);

  const currentPositions = (): GridPosition[] =>
    blocks.map((b, idx) => positionFromStyle(parseJson<BlockStyle>(b.style, {}), idx * 12));

  const handleAddBlock = async (blockType: SiteBlockType) => {
    setShowPicker(false);
    pushHistory(`Added ${blockMeta(blockType).label} block`);
    try {
      const row = nextAvailableRow(currentPositions());
      const gridPos = defaultGridPosition(blockType, row);
      const created = await api.createSiteBlock(site.id, {
        block_type: blockType,
        content: blockMeta(blockType).defaultContent(),
        media_opacity: {},
        style: { ...gridPos },
      });
      setBlocks(prev => [...prev, created]);
      setSelectedId(created.id);
    } catch (err) {
      console.error(err);
      alert('Failed to add block.');
    }
  };

  const handleApplyTemplate = async (template: SiteTemplate) => {
    if (blocks.length > 0 && !confirm(`Add the "${template.name}" template's ${template.blocks.length} blocks to this page?`)) return;
    setApplyingTemplateId(template.id);
    pushHistory(`Applied "${template.name}" template`);
    try {
      const rowOffset = nextAvailableRow(currentPositions());
      for (const tplBlock of template.blocks) {
        const created = await api.createSiteBlock(site.id, {
          block_type: tplBlock.block_type,
          content: tplBlock.content,
          media_opacity: {},
          style: {
            ...(tplBlock.style || {}),
            grid_col: tplBlock.grid_col,
            grid_col_span: tplBlock.grid_col_span,
            grid_row: tplBlock.grid_row + rowOffset,
            grid_row_span: tplBlock.grid_row_span,
          },
        });
        setBlocks(prev => [...prev, created]);
      }
      setShowTemplatePicker(false);
    } catch (err) {
      console.error(err);
      alert('Failed to apply template — some blocks may have been added. Reloading.');
      loadBlocks();
    } finally {
      setApplyingTemplateId(null);
    }
  };

  const handleDuplicateBlock = async (block: SiteBlock) => {
    pushHistory(`Duplicated ${blockMeta(block.block_type).label} block`);
    try {
      const result = await api.duplicateSiteBlock(site.id, block.id);
      setBlocks(result.blocks.sort((a, b) => a.position - b.position));
    } catch (err) {
      console.error(err);
      alert('Failed to duplicate block.');
    }
  };

  const handleDeleteBlock = async (block: SiteBlock) => {
    const label = parseJson<BlockStyle>(block.style, {}).custom_label || blockMeta(block.block_type).label;
    if (!confirm(`Delete "${label}"? This can't be undone.`)) return;
    pushHistory(`Deleted ${blockMeta(block.block_type).label} block`);
    try {
      await api.deleteSiteBlock(site.id, block.id);
      setBlocks(prev => prev.filter(b => b.id !== block.id));
      if (inspectorBlock?.id === block.id) setInspectorBlock(null);
      if (selectedId === block.id) setSelectedId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete block.');
    }
  };

  // Called by the canvas the instant a drag or resize gesture ends — persists
  // immediately so there's no separate "save layout" step.
  const handlePositionChange = async (blockId: number, position: GridPosition) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    pushHistory(`Moved ${blockMeta(block.block_type).label} block`);
    const nextStyle: BlockStyle = { ...parseJson<BlockStyle>(block.style, {}), ...position };
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, style: JSON.stringify(nextStyle) } : b));
    try {
      await api.updateSiteBlock(site.id, blockId, { style: nextStyle });
    } catch (err) {
      console.error(err);
      loadBlocks();
    }
  };

  // Layers panel front/back/forward/backward — stacking order IS array order
  // (no separate z-index field), so this is just an array reorder + the
  // existing (previously unused by any UI) reorder endpoint, same one-call
  // persistence pattern as handlePositionChange above.
  const handleReorderBlock = async (blockId: number, action: 'front' | 'back' | 'forward' | 'backward') => {
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return;
    const blockLabel = blockMeta(blocks[idx].block_type).label;
    const next = [...blocks];
    if (action === 'front') {
      const [item] = next.splice(idx, 1);
      next.push(item);
    } else if (action === 'back') {
      const [item] = next.splice(idx, 1);
      next.unshift(item);
    } else if (action === 'forward' && idx < next.length - 1) {
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    } else if (action === 'backward' && idx > 0) {
      [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
    } else {
      return; // no-op (already at front/back)
    }
    const actionLabel = action === 'front' ? 'Brought to front' : action === 'back' ? 'Sent to back' : action === 'forward' ? 'Moved forward' : 'Moved backward';
    pushHistory(`${actionLabel}: ${blockLabel} block`);
    setBlocks(next);
    try {
      const updated = await api.reorderSiteBlocks(site.id, next.map(b => b.id));
      setBlocks(updated);
    } catch (err) {
      console.error(err);
      loadBlocks();
    }
  };

  // Layers panel drag-to-reorder — the panel does all the group-aware
  // reordering math itself (dragging only ever reorders within the same
  // lock group) and just hands back the full ordered id list, same
  // single-call persistence pattern as handleReorderBlock above.
  const handleDragReorderBlocks = async (orderedIds: number[]) => {
    const byId = new Map(blocks.map(b => [b.id, b]));
    const next = orderedIds.map(id => byId.get(id)).filter((b): b is SiteBlock => !!b);
    if (next.length !== blocks.length) return;
    pushHistory('Reordered layers');
    setBlocks(next);
    try {
      const updated = await api.reorderSiteBlocks(site.id, orderedIds);
      setBlocks(updated);
    } catch (err) {
      console.error(err);
      loadBlocks();
    }
  };

  // Layers panel lock toggle — "lock to front"/"lock to back" pins the
  // block's z-index (see SiteGridCanvas) so selecting some other block can
  // never visually bury it again. This deliberately does NOT touch array
  // order any more — it used to force the block to the literal front/back of
  // the whole array on lock, which silently undid whatever position the user
  // had just dragged it to in the Layers panel. Locking/unlocking now only
  // flips style.z_lock; the block stays exactly where it was arranged, and
  // grouping in the Layers panel (front/normal/back sections) just re-reads
  // from whatever z_lock is now set. Clicking an already-active lock turns
  // it off, same no-move behavior.
  const handleToggleLock = async (blockId: number, lock: 'front' | 'back') => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const currentStyle = parseJson<BlockStyle>(block.style, {});
    const turningOff = currentStyle.z_lock === lock;
    const lockLabel = turningOff ? 'Unlocked' : lock === 'front' ? 'Locked to front' : 'Locked to back';
    pushHistory(`${lockLabel}: ${blockMeta(block.block_type).label} block`);

    const nextStyle: BlockStyle = { ...currentStyle, z_lock: turningOff ? undefined : lock };
    const next = blocks.map(b => b.id === blockId ? { ...b, style: JSON.stringify(nextStyle) } : b);
    setBlocks(next);
    if (inspectorBlock?.id === blockId) setDraftStyle(nextStyle);

    try {
      const updated = await api.updateSiteBlock(site.id, blockId, { style: nextStyle });
      setBlocks(prev => prev.map(b => b.id === blockId ? updated : b));
    } catch (err) {
      console.error(err);
      loadBlocks();
    }
  };

  // Layers panel rename — purely cosmetic label stored in the style JSON
  // (see BlockStyle.custom_label), no schema change needed.
  const handleRenameBlock = async (blockId: number, name: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const currentStyle = parseJson<BlockStyle>(block.style, {});
    const trimmed = name.trim();
    const nextStyle: BlockStyle = { ...currentStyle, custom_label: trimmed || undefined };
    // Committed once on Enter/blur (not per-keystroke), so a single push here
    // is already exactly one undo step per rename — no debouncing needed.
    pushHistory(`Renamed ${blockMeta(block.block_type).label} block`);
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, style: JSON.stringify(nextStyle) } : b));
    if (inspectorBlock?.id === blockId) setDraftStyle(nextStyle);
    try {
      const updated = await api.updateSiteBlock(site.id, blockId, { style: nextStyle });
      setBlocks(prev => prev.map(b => b.id === blockId ? updated : b));
    } catch (err) {
      console.error(err);
      loadBlocks();
    }
  };

  // Inline content edits made directly on the canvas — update local state
  // immediately for a snappy feel, debounce the actual server save, and only
  // record ONE undo step per burst of typing rather than one per keystroke.
  const contentSaveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const contentHistoryPushed = useRef<Set<number>>(new Set());

  const handleCanvasContentChange = (blockId: number, content: any) => {
    const block = blocks.find(b => b.id === blockId);
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, content: JSON.stringify(content) } : b));
    if (!contentHistoryPushed.current.has(blockId)) {
      pushHistory(block ? `Edited ${blockMeta(block.block_type).label} content` : 'Edited content');
      contentHistoryPushed.current.add(blockId);
    }
    if (contentSaveTimers.current[blockId]) clearTimeout(contentSaveTimers.current[blockId]);
    contentSaveTimers.current[blockId] = setTimeout(async () => {
      contentHistoryPushed.current.delete(blockId);
      try {
        await api.updateSiteBlock(site.id, blockId, { content });
      } catch (err) {
        console.error(err);
      }
    }, 700);
  };

  const openInspector = (block: SiteBlock, initialTab: 'content' | 'style' = 'content') => {
    setSelectedId(block.id);
    setInspectorBlock(block);
    setInspectorTab(initialTab);
    setDraftContent(parseJson(block.content, blockMeta(block.block_type).defaultContent()));
    setDraftOpacity(parseJson(block.media_opacity, {}));
    setDraftStyle(parseJson(block.style, {}));
    setContextMenu(null);
  };

  // Canvas click — plain select, EXCEPT if the inspector is already open for
  // some other block: in that case, switch it to follow the new selection
  // (same tab it was already on) instead of leaving it showing stale content
  // for a block that's no longer selected.
  const handleCanvasSelect = (id: number | null) => {
    setSelectedId(id);
    if (id === null || !inspectorBlock) return;
    const block = blocks.find(b => b.id === id);
    if (block) openInspector(block, inspectorTab);
  };

  // Inspector edits (structural content + style) also autosave, debounced,
  // rather than requiring an explicit Save button — matches the "click and
  // it's just saved" feel of the inline canvas editing. Keyed per-block: a
  // shared single timer would let switching to a different block within the
  // debounce window silently cancel — and lose — the previous block's still-
  // pending save (this was the "my image goes away, I have to re-upload"
  // bug: uploading in block A, then clicking block B before A's 500ms save
  // fired, cancelled A's save entirely).
  // One history entry per debounced save burst (same "don't record a step
  // per keystroke" rule as the inline canvas editor above) — the entry is
  // pushed on the FIRST change of a burst, using blocksRef's still-stale
  // pre-burst state, and the "pushed" flag resets once the burst's save
  // actually fires so the next burst records its own separate step.
  const inspectorHistoryPushed = useRef<Set<number>>(new Set());

  const scheduleInspectorSave = (blockId: number, patch: { content?: any; media_opacity?: any; style?: any }, historyLabel?: string) => {
    if (historyLabel && !inspectorHistoryPushed.current.has(blockId)) {
      pushHistory(historyLabel);
      inspectorHistoryPushed.current.add(blockId);
    }
    if (inspectorSaveTimers.current[blockId]) clearTimeout(inspectorSaveTimers.current[blockId]);
    inspectorSaveTimers.current[blockId] = setTimeout(async () => {
      delete inspectorSaveTimers.current[blockId];
      inspectorHistoryPushed.current.delete(blockId);
      try {
        const updated = await api.updateSiteBlock(site.id, blockId, patch);
        setBlocks(prev => prev.map(b => b.id === blockId ? updated : b));
      } catch (err) {
        console.error(err);
      }
    }, 500);
  };

  const handleDraftContentChange = (next: any) => {
    if (!inspectorBlock) return;
    setDraftContent(next);
    setBlocks(prev => prev.map(b => b.id === inspectorBlock.id ? { ...b, content: JSON.stringify(next) } : b));
    scheduleInspectorSave(inspectorBlock.id, { content: next, media_opacity: draftOpacity, style: draftStyle }, `Edited ${blockMeta(inspectorBlock.block_type).label} content`);
  };

  const handleDraftOpacityChange = (key: string, value: number) => {
    if (!inspectorBlock) return;
    const next = { ...draftOpacity, [key]: value };
    setDraftOpacity(next);
    setBlocks(prev => prev.map(b => b.id === inspectorBlock.id ? { ...b, media_opacity: JSON.stringify(next) } : b));
    scheduleInspectorSave(inspectorBlock.id, { content: draftContent, media_opacity: next, style: draftStyle }, `Changed opacity: ${blockMeta(inspectorBlock.block_type).label} block`);
  };

  const handleDraftStyleChange = (next: BlockStyle) => {
    if (!inspectorBlock) return;
    setDraftStyle(next);
    setBlocks(prev => prev.map(b => b.id === inspectorBlock.id ? { ...b, style: JSON.stringify(next) } : b));
    scheduleInspectorSave(inspectorBlock.id, { content: draftContent, media_opacity: draftOpacity, style: next }, `Changed style: ${blockMeta(inspectorBlock.block_type).label} block`);
  };

  const handleSaveTheme = async () => {
    setThemeSaving(true);
    setThemeSaved(false);
    try {
      await api.updateSite(site.id, {
        name: site.name, subdomain: site.subdomain, title: site.title, theme: site.theme, active: site.active,
        theme_config: themeForm,
      } as any);
      ensureGoogleFontsLoaded([themeForm.font_family, themeForm.heading_font, themeForm.body_font]);
      setThemeSaved(true);
      setTimeout(() => setThemeSaved(false), 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to save theme.');
    } finally {
      setThemeSaving(false);
    }
  };

  // Applies a preset to the in-progress theme form only — still requires
  // clicking Save Theme to persist, same as any other manual edit here, so a
  // preset click is always undo-able by just not saving.
  const handleApplyPreset = (preset: SiteThemePreset) => {
    setThemeForm(prev => ({
      ...prev,
      accent_color: preset.accent_color,
      secondary_color: preset.secondary_color,
      heading_font: preset.heading_font,
      body_font: preset.body_font,
      font_family: preset.body_font,
    }));
    setThemeSaved(false);
  };

  // A preset counts as "active" (gets the checkmark) only when every one of
  // its fields matches the current form exactly — a manual tweak after
  // applying a preset correctly un-highlights it rather than showing a stale
  // selection.
  const activePresetId = SITE_THEME_PRESETS.find(p =>
    (themeForm.accent_color || DEFAULT_ACCENT) === p.accent_color &&
    (themeForm.secondary_color || '') === p.secondary_color &&
    (themeForm.heading_font || '') === p.heading_font &&
    (themeForm.body_font || themeForm.font_family || '') === p.body_font
  )?.id;

  // Export/import — a plain JSON snapshot of this page's blocks (type, content,
  // opacity, style/position), portable between sites or usable as a manual
  // backup. Deliberately not a ZIP: no new dependency is allowed here since
  // package-lock.json is a protected/mirrored file, and JSON alone covers the
  // real need (moving a page's layout+content around) without pulling in a
  // hand-rolled archive format for no added benefit.
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleExportSite = () => {
    const payload = {
      exported_from: 'Workshop Ragnarok Sites',
      site_name: site.name,
      exported_at: new Date().toISOString(),
      blocks: blocks.map(b => ({
        block_type: b.block_type,
        content: parseJson(b.content, {}),
        media_opacity: parseJson(b.media_opacity, {}),
        style: parseJson(b.style, {}),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${site.subdomain}-site-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const importedBlocks: { block_type: SiteBlockType; content: any; media_opacity: any; style: any }[] = payload.blocks || [];
      if (importedBlocks.length === 0) {
        alert('That file has no blocks to import.');
        return;
      }
      if (!confirm(`Import ${importedBlocks.length} block(s) from "${payload.site_name || file.name}"? They'll be added after your existing content.`)) return;
      pushHistory(`Imported ${importedBlocks.length} block(s)`);
      const rowOffset = nextAvailableRow(currentPositions());
      for (const b of importedBlocks) {
        const pos = positionFromStyle(b.style || {}, 0);
        const created = await api.createSiteBlock(site.id, {
          block_type: b.block_type,
          content: b.content || {},
          media_opacity: b.media_opacity || {},
          style: { ...(b.style || {}), grid_row: pos.grid_row + rowOffset },
        });
        setBlocks(prev => [...prev, created]);
      }
    } catch (err) {
      console.error(err);
      alert('That file could not be imported — make sure it\'s a JSON export from this Sites builder.');
    } finally {
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  // HTML/PDF export both reuse the actual live public page (loaded in a
  // hidden iframe / new tab) rather than re-implementing the block renderer —
  // that guarantees the export looks exactly like what visitors see, and
  // means it reflects the LAST SAVED state (autosave already covers normal
  // editing within ~300-500ms, so this is only stale mid-keystroke).
  const [exportingHTML, setExportingHTML] = useState(false);

  const handleExportHTML = async () => {
    const url = `${window.location.origin}/site/${site.subdomain}`;
    setExportingHTML(true);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '1200px';
    iframe.style.height = '2000px';
    document.body.appendChild(iframe);

    try {
      await new Promise<void>((resolve, reject) => {
        const deadline = Date.now() + 15000;
        const poll = () => {
          const doc = iframe.contentDocument;
          const ready = doc && (doc.querySelector('.site-grid') || doc.body?.textContent?.includes("doesn't have any content yet"));
          if (ready) { resolve(); return; }
          if (Date.now() > deadline) { reject(new Error('Timed out loading the live site — make sure it\'s active and try again.')); return; }
          setTimeout(poll, 150);
        };
        iframe.onload = () => setTimeout(poll, 150);
        iframe.src = url;
      });

      const doc = iframe.contentDocument!;
      // Inline the app's own compiled CSS bundle so the exported file needs
      // no server for styling (media URLs stay pointed at this server though
      // — they're not base64-embedded, so this server must stay reachable
      // for images/video in the export to load).
      const linkEls = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
      let css = '';
      for (const link of linkEls) {
        try {
          const res = await fetch(link.href);
          css += `\n/* ${link.href} */\n${await res.text()}`;
        } catch (err) {
          console.warn('Could not inline stylesheet', link.href, err);
        }
      }

      const clone = doc.documentElement.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('script').forEach(s => s.remove());
      clone.querySelectorAll('link[rel="stylesheet"], link[rel="modulepreload"]').forEach(l => l.remove());
      const head = clone.querySelector('head');
      if (head) {
        const styleTag = document.createElement('style');
        styleTag.textContent = css;
        head.appendChild(styleTag);
        const baseTag = document.createElement('base');
        baseTag.setAttribute('href', `${window.location.origin}/`);
        head.prepend(baseTag);
      }

      const html = `<!doctype html>\n${clone.outerHTML}`;
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${site.subdomain}-site-snapshot.html`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to export HTML.');
    } finally {
      document.body.removeChild(iframe);
      setExportingHTML(false);
    }
  };

  const handleExportPDF = () => {
    const url = `${window.location.origin}/site/${site.subdomain}`;
    const win = window.open(url, '_blank');
    if (!win) {
      alert('Please allow pop-ups for this site to export a PDF.');
      return;
    }
    const deadline = Date.now() + 15000;
    const tryPrint = () => {
      try {
        const doc = win.document;
        const ready = doc && (doc.querySelector('.site-grid') || doc.body?.textContent?.includes("doesn't have any content yet"));
        if (ready) { setTimeout(() => win.print(), 400); return; }
      } catch {
        // Cross-origin during initial load — ignore and keep polling.
      }
      if (Date.now() < deadline) setTimeout(tryPrint, 200);
    };
    tryPrint();
  };

  const previewUrl = `${window.location.origin}/site/${site.subdomain}`;

  const DEVICE_OPTIONS: { value: DeviceBreakpoint; icon: React.ElementType; label: string }[] = [
    { value: 'desktop', icon: Monitor, label: 'Desktop' },
    { value: 'tablet', icon: Tablet, label: 'Tablet' },
    { value: 'mobile', icon: Smartphone, label: 'Mobile' },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-theme pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-black text-slate-100 uppercase tracking-wider truncate">{site.name}</h1>
            <p className="text-xs text-slate-500 font-mono truncate">{site.subdomain}.{SITES_BASE_DOMAIN}</p>
          </div>
        </div>
        <a href={previewUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs uppercase tracking-wider font-bold transition flex items-center gap-1.5 cursor-pointer self-start md:self-center">
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Preview Site</span>
        </a>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <button onClick={() => setTab('blocks')} className={`px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-bold transition cursor-pointer flex items-center gap-1.5 ${tab === 'blocks' ? 'bg-primary-theme text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
            <LayoutTemplate className="w-3.5 h-3.5" /> Blocks
          </button>
          <button onClick={() => setTab('theme')} className={`px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-bold transition cursor-pointer flex items-center gap-1.5 ${tab === 'theme' ? 'bg-primary-theme text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
            <Palette className="w-3.5 h-3.5" /> Site Theme
          </button>
          <button onClick={() => setTab('messages')} className={`px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-bold transition cursor-pointer flex items-center gap-1.5 ${tab === 'messages' ? 'bg-primary-theme text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
            <Mailbox className="w-3.5 h-3.5" /> Contact Form Submissions{messages.length > 0 ? ` (${messages.length})` : ''}
          </button>
        </div>
        {tab === 'blocks' && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 p-1 rounded-lg bg-slate-800/60 border border-[#1e2028]">
              {DEVICE_OPTIONS.map(d => {
                const Icon = d.icon;
                const active = device === d.value;
                return (
                  <button key={d.value} onClick={() => setDevice(d.value)} title={d.label} className={`p-1.5 rounded-md cursor-pointer transition ${active ? 'bg-primary-theme text-slate-950' : 'text-slate-400 hover:text-white'}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => { setShowPicker(v => !v); setShowTemplatePicker(false); }}
              title="Add a new block"
              className={`px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${showPicker ? 'bg-primary-theme text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Block</span>
            </button>
            {blocks.length > 0 && (
              <button
                onClick={() => { setShowTemplatePicker(v => !v); setShowPicker(false); }}
                title="Add a ready-made template layout"
                className={`px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${showTemplatePicker ? 'bg-primary-theme text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Use a Template</span>
              </button>
            )}
            <button
              onClick={handleRefreshBlocks}
              disabled={loading}
              title="Reload this page's blocks from the server — discards any unsaved local edits"
              className="px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleUndo}
              onContextMenu={(e) => { e.preventDefault(); if (history.length > 0) setHistoryMenu({ direction: 'undo', x: e.clientX, y: e.clientY }); }}
              disabled={history.length === 0 || historyBusy}
              title="Undo (Ctrl+Z) — right-click for history"
              className="px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {historyBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Undo</span>
            </button>
            <button
              onClick={handleRedo}
              onContextMenu={(e) => { e.preventDefault(); if (future.length > 0) setHistoryMenu({ direction: 'redo', x: e.clientX, y: e.clientY }); }}
              disabled={future.length === 0 || historyBusy}
              title="Redo (Ctrl+Y) — right-click for history"
              className="px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Redo</span>
            </button>
            <input ref={importFileRef} type="file" accept="application/json" className="hidden" onChange={(e) => handleImportFile(e.target.files?.[0])} />
            <button onClick={() => importFileRef.current?.click()} title="Import blocks from a JSON export" className="px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700">
              <FileJson className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import</span>
            </button>
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setExportMenuOpen(v => !v); }}
                disabled={blocks.length === 0}
                title="Export this page"
                className={`px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed ${exportMenuOpen ? 'bg-primary-theme text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                {exportingHTML ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {exportMenuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1.5 z-50 w-60 rounded-xl border border-white/10 bg-[#1a1c24]/98 backdrop-blur-xl shadow-2xl overflow-hidden py-1"
                >
                  <button
                    onClick={() => { handleExportSite(); setExportMenuOpen(false); }}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-white/10 cursor-pointer"
                  >
                    <FileJson className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span>
                      <span className="block text-xs font-bold text-slate-200">Export as JSON</span>
                      <span className="block text-[10px] text-slate-500">Portable blocks file — re-import here or into another site</span>
                    </span>
                  </button>
                  <button
                    onClick={() => { handleExportHTML(); setExportMenuOpen(false); }}
                    disabled={exportingHTML}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-white/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FileCode className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span>
                      <span className="block text-xs font-bold text-slate-200">Export as HTML</span>
                      <span className="block text-[10px] text-slate-500">Standalone snapshot — needs this server reachable for images/video</span>
                    </span>
                  </button>
                  <button
                    onClick={() => { handleExportPDF(); setExportMenuOpen(false); }}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-white/10 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span>
                      <span className="block text-xs font-bold text-slate-200">Export as PDF</span>
                      <span className="block text-[10px] text-slate-500">Opens the live site and triggers Print / Save as PDF</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {tab === 'blocks' ? (
        <div className="flex gap-5 items-start">
          {!loading && blocks.length > 0 && (
            <SiteLayersPanel
              blocks={blocks}
              selectedId={selectedId}
              onSelect={(block) => openInspector(block, inspectorTab)}
              onToggleLock={handleToggleLock}
              onRename={handleRenameBlock}
              onReorder={handleDragReorderBlocks}
              onDelete={handleDeleteBlock}
            />
          )}

          <div className="flex-1 min-w-0 space-y-4">
            {error && <div className="bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs font-mono">{error}</div>}

            {showPicker && (
              <div className="bg-[#13141a]/80 border border-border-theme rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white uppercase tracking-wider">Choose a Block Type</span>
                  <button onClick={() => setShowPicker(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {BLOCK_TYPES.map(bt => {
                    const Icon = bt.icon;
                    return (
                      <button key={bt.type} onClick={() => handleAddBlock(bt.type)} className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-[#1e2028] hover:border-amber-500/40 bg-[#0c0d12]/60 hover:bg-amber-950/10 transition cursor-pointer">
                        <Icon className="w-4 h-4 text-primary-theme" />
                        <span className="text-[10px] font-bold text-slate-200">{bt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {showTemplatePicker && (
              <div className="bg-[#13141a]/80 border border-border-theme rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5 text-amber-300" /> Choose a Template
                  </span>
                  <button onClick={() => setShowTemplatePicker(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
                </div>
                <p className="text-[10px] text-slate-500 -mt-2">Adds a ready-made, multi-column layout with placeholder copy — nothing existing gets touched. Each thumbnail shows the template's actual example content.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[560px] overflow-y-auto pr-1 -mr-1">
                  {SITE_TEMPLATES.map(tpl => {
                    const isApplying = applyingTemplateId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => handleApplyTemplate(tpl)}
                        disabled={!!applyingTemplateId}
                        className="flex flex-col gap-1.5 p-2.5 rounded-xl border border-[#1e2028] hover:border-amber-500/40 bg-[#0c0d12]/60 hover:bg-amber-950/10 transition cursor-pointer text-left disabled:opacity-50"
                      >
                        <TemplateThumbnail template={tpl} />
                        <div className="flex items-center gap-1.5">
                          <tpl.icon className="w-3 h-3 text-primary-theme shrink-0" />
                          <span className="text-[11px] font-black text-white truncate">{tpl.name}</span>
                          {isApplying && <Loader2 className="w-3 h-3 animate-spin text-amber-300 ml-auto shrink-0" />}
                        </div>
                        <span className="block text-[9.5px] text-slate-500 leading-snug line-clamp-2">{tpl.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {loading ? (
              <div className="py-16 text-center text-slate-400 font-mono text-xs flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-primary-theme animate-spin" />
                <span>Loading blocks...</span>
              </div>
            ) : (
              <>
                <p className="text-[11px] text-slate-500 font-mono">
                  Click any text directly on the canvas to edit it in place. Drag a block's title bar to move it anywhere, or drag a corner/edge handle to resize — right-click a block for more options.
                </p>

                {blocks.length === 0 && !showTemplatePicker && (
                  <div className="py-10 text-center border border-dashed border-[#1e2028] rounded-xl bg-[#13141a]/10 space-y-3">
                    <p className="font-mono text-xs text-slate-500">No blocks yet. Start from a template, or build from scratch above.</p>
                    <button onClick={() => setShowTemplatePicker(true)} className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg text-[10px] uppercase tracking-wider font-black transition cursor-pointer inline-flex items-center gap-1.5">
                      <LayoutGrid className="w-3.5 h-3.5" /> Choose a Template
                    </button>
                  </div>
                )}

                {blocks.length > 0 && (
                  <SiteGridCanvas
                    blocks={blocks}
                    selectedId={selectedId}
                    device={device}
                    theme={themeForm}
                    dark={dark}
                    accent={accent}
                    onSelect={handleCanvasSelect}
                    onContentChange={handleCanvasContentChange}
                    onDuplicate={handleDuplicateBlock}
                    onDelete={handleDeleteBlock}
                    onPositionChange={handlePositionChange}
                    onContextMenu={(block, x, y, mediaKey) => setContextMenu({ block, x, y, mediaKey })}
                    onOpenInspector={(block) => openInspector(block, 'style')}
                    transformEditTarget={transformEditTarget}
                    onTransformChange={handleTransformChange}
                    onExitTransformEdit={() => setTransformEditTarget(null)}
                  />
                )}
              </>
            )}
          </div>

          {/* Docked Inspector panel — Windows-11-style rounded acrylic card, replaces the old popup modal */}
          {inspectorBlock && (
            <div className="w-[420px] shrink-0 sticky top-4 rounded-2xl border border-white/10 bg-[#111218]/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
              <div className="flex items-center justify-between p-4 border-b border-border-theme shrink-0">
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 truncate">
                  {React.createElement(blockMeta(inspectorBlock.block_type).icon, { className: 'w-4 h-4 text-primary-theme shrink-0' })}
                  <span className="truncate">{blockMeta(inspectorBlock.block_type).label}</span>
                </h2>
                <button onClick={() => setInspectorBlock(null)} className="text-slate-400 hover:text-white cursor-pointer shrink-0"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex gap-1 p-2 border-b border-border-theme shrink-0">
                <button onClick={() => setInspectorTab('content')} className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold transition cursor-pointer ${inspectorTab === 'content' ? 'bg-primary-theme text-slate-950' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700'}`}>Content</button>
                <button onClick={() => setInspectorTab('style')} className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold transition cursor-pointer ${inspectorTab === 'style' ? 'bg-primary-theme text-slate-950' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700'}`}>Style</button>
              </div>
              <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
                {inspectorTab === 'content' ? (
                  <BlockContentEditor
                    blockType={inspectorBlock.block_type}
                    content={draftContent}
                    mediaOpacity={draftOpacity}
                    onContentChange={handleDraftContentChange}
                    onOpacityChange={handleDraftOpacityChange}
                  />
                ) : (
                  <BlockStyleEditor blockType={inspectorBlock.block_type} style={draftStyle} onChange={handleDraftStyleChange} device={device} />
                )}
              </div>
              <div className="p-3 border-t border-border-theme shrink-0 flex items-center gap-1.5 text-[10px] text-slate-500">
                <Save className="w-3 h-3" /> Changes save automatically
              </div>
            </div>
          )}
        </div>
      ) : tab === 'theme' ? (
        <div className="max-w-5xl space-y-6">
          {/* Presets — the visual gallery. Each thumbnail is a real live mockup
              rendered with that preset's exact colors/fonts, so what you see is
              exactly what clicking it applies. */}
          <div className="bg-[#13141a]/80 border border-border-theme rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-300" /> Theme Presets
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-1.5 max-w-md">
                  Pick a ready-made color + font pairing to start from, then fine-tune it below.
                  Each thumbnail is a live preview — no guessing what a combination looks like.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {SITE_THEME_PRESETS.map(preset => (
                <ThemePresetCard
                  key={preset.id}
                  preset={preset}
                  dark={dark}
                  active={activePresetId === preset.id}
                  onClick={() => handleApplyPreset(preset)}
                />
              ))}
            </div>
          </div>

          {/* Customize — manual fine-tuning, plus a live strip previewing exactly
              the current (possibly hand-edited) combination in context. */}
          <div className="bg-[#13141a]/80 border border-border-theme rounded-xl p-5 space-y-5">
            <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-amber-300" /> Customize
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed -mt-3">
              Sets the default look for every block on this site. Any block can still override the font or colors in its own Style panel.
            </p>

            {/* Live preview of the current form state, independent of any preset */}
            <div
              className="rounded-lg overflow-hidden border border-black/30 p-5 flex flex-col gap-2 shadow-inner"
              style={{ backgroundColor: dark ? '#0b0c10' : '#ffffff' }}
            >
              <div className="w-10 h-2 rounded-full" style={{ backgroundColor: themeForm.secondary_color || '#334155' }} />
              <div
                className="text-2xl leading-tight font-bold"
                style={{ fontFamily: themeForm.heading_font || themeForm.font_family || SITE_FONT_OPTIONS[0].value, color: themeForm.accent_color || DEFAULT_ACCENT }}
              >
                Your Shop Name
              </div>
              <div
                className="text-xs leading-snug"
                style={{ fontFamily: themeForm.body_font || themeForm.font_family || SITE_FONT_OPTIONS[0].value, color: dark ? '#94a3b8' : '#64748b' }}
              >
                Trusted auto repair, done right — book your next service in minutes.
              </div>
              <div
                className="mt-1.5 inline-flex w-fit px-4 py-2 rounded-full text-xs font-black uppercase tracking-wide"
                style={{
                  backgroundColor: themeForm.accent_color || DEFAULT_ACCENT,
                  color: dark ? '#0b0c10' : '#ffffff',
                  fontFamily: themeForm.body_font || themeForm.font_family || SITE_FONT_OPTIONS[0].value,
                }}
              >
                Book Now
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Accent Color</FieldLabel>
                <div className="flex items-center gap-2 rounded-lg bg-[#0c0d12] border border-[#1e2028] px-2 py-1.5">
                  <input type="color" value={themeForm.accent_color || DEFAULT_ACCENT} onChange={(e) => setThemeForm(prev => ({ ...prev, accent_color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0 shrink-0" />
                  <input type="text" value={themeForm.accent_color || DEFAULT_ACCENT} onChange={(e) => setThemeForm(prev => ({ ...prev, accent_color: e.target.value }))} className="flex-1 min-w-0 bg-transparent text-xs text-white font-mono focus:outline-none" />
                </div>
              </div>
              <div>
                <FieldLabel>Secondary Color</FieldLabel>
                <div className="flex items-center gap-2 rounded-lg bg-[#0c0d12] border border-[#1e2028] px-2 py-1.5">
                  <input type="color" value={themeForm.secondary_color || '#334155'} onChange={(e) => setThemeForm(prev => ({ ...prev, secondary_color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0 shrink-0" />
                  <input type="text" value={themeForm.secondary_color || ''} onChange={(e) => setThemeForm(prev => ({ ...prev, secondary_color: e.target.value || undefined }))} placeholder="Optional" className="flex-1 min-w-0 bg-transparent text-xs text-white font-mono placeholder-slate-600 focus:outline-none" />
                </div>
              </div>
              <div>
                <FieldLabel>Body Font (default)</FieldLabel>
                <select value={themeForm.font_family || SITE_FONT_OPTIONS[0].value} onChange={(e) => setThemeForm(prev => ({ ...prev, font_family: e.target.value }))} className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2.5 text-sm text-white focus:outline-none" style={{ fontFamily: themeForm.font_family }}>
                  {SITE_FONT_OPTIONS.map(f => <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Heading Font (optional pairing)</FieldLabel>
                <select value={themeForm.heading_font || ''} onChange={(e) => setThemeForm(prev => ({ ...prev, heading_font: e.target.value || undefined }))} className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2.5 text-sm text-white focus:outline-none" style={{ fontFamily: themeForm.heading_font || undefined }}>
                  <option value="">Same as body font</option>
                  {SITE_FONT_OPTIONS.map(f => <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-border-theme">
              <button onClick={handleSaveTheme} disabled={themeSaving} className="px-4 py-2 bg-primary-theme hover:opacity-90 text-slate-950 rounded-lg text-xs uppercase tracking-wider font-black transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50">
                {themeSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Theme
              </button>
              {themeSaved && <span className="text-[11px] text-emerald-400 font-mono">Saved!</span>}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {messagesLoading ? (
            <div className="py-16 text-center text-slate-400 font-mono text-xs flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-primary-theme animate-spin" />
              <span>Loading submissions...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-[#1e2028] rounded-xl bg-[#13141a]/10 font-mono text-xs text-slate-500">
              No submissions yet. When a visitor fills out your Contact Form block, it shows up here.
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className="bg-[#13141a]/80 border border-border-theme rounded-xl p-4 space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black text-white">{msg.name || 'Anonymous'}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{new Date(msg.created_at).toLocaleString()}</span>
                </div>
                {msg.email && <span className="block text-[11px] text-primary-theme font-mono">{msg.email}</span>}
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Right-click context menu — Windows-11-style small rounded flyout */}
      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-44 rounded-xl border border-white/10 bg-[#1a1c24]/98 backdrop-blur-xl shadow-2xl overflow-hidden py-1"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={() => openInspector(contextMenu.block, 'style')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 cursor-pointer">
            <Settings2 className="w-3.5 h-3.5" /> Style & Settings
          </button>
          {contextMenu.mediaKey && (
            <button
              onClick={() => { setTransformEditTarget({ blockId: contextMenu.block.id, mediaKey: contextMenu.mediaKey! }); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-300 hover:bg-amber-500/10 cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" /> Zoom & Position
            </button>
          )}
          <button onClick={() => { handleDuplicateBlock(contextMenu.block); setContextMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 cursor-pointer">
            <Copy className="w-3.5 h-3.5" /> Duplicate
          </button>
          <button onClick={() => { handleReorderBlock(contextMenu.block.id, 'front'); setContextMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 cursor-pointer">
            <ArrowUpToLine className="w-3.5 h-3.5" /> Bring to Front
          </button>
          <button onClick={() => { handleReorderBlock(contextMenu.block.id, 'back'); setContextMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 cursor-pointer">
            <ArrowDownToLine className="w-3.5 h-3.5" /> Send to Back
          </button>
          <button
            onClick={() => {
              const b = contextMenu.block;
              const style = parseJson<BlockStyle>(b.style, {});
              const nextHideOn = style.hide_on === 'mobile' ? undefined : 'mobile';
              const nextStyle = { ...style, hide_on: nextHideOn };
              setBlocks(prev => prev.map(x => x.id === b.id ? { ...x, style: JSON.stringify(nextStyle) } : x));
              api.updateSiteBlock(site.id, b.id, { style: nextStyle }).catch(() => loadBlocks());
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 cursor-pointer"
          >
            <EyeOff className="w-3.5 h-3.5" /> {parseJson<BlockStyle>(contextMenu.block.style, {}).hide_on === 'mobile' ? 'Show on Mobile' : 'Hide on Mobile'}
          </button>
          <div className="h-px bg-white/10 my-1" />
          <button onClick={() => { handleDeleteBlock(contextMenu.block); setContextMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/10 cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}

      {historyMenu && (() => {
        // Nearest edit first (most useful at the top): history[] is
        // oldest-first so we walk it backward; future[] is already
        // farthest-first, i.e. reverse-of-nearest, so it's walked forward.
        const entries = historyMenu.direction === 'undo'
          ? history.map((h, i) => ({ ...h, index: i })).reverse()
          : future.map((f, i) => ({ ...f, index: i })).reverse();
        return (
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed z-50 w-64 max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-[#1a1c24]/98 backdrop-blur-xl shadow-2xl py-1"
            style={{ top: historyMenu.y, left: historyMenu.x }}
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 border-b border-white/10 mb-1">
              <History className="w-3 h-3" />
              {historyMenu.direction === 'undo' ? 'Jump back to…' : 'Jump forward to…'}
            </div>
            {entries.map((entry, displayIdx) => (
              <button
                key={`${entry.index}-${entry.label}`}
                onClick={() => {
                  if (historyMenu.direction === 'undo') jumpBackTo(entry.index); else jumpForwardTo(entry.index);
                  setHistoryMenu(null);
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 cursor-pointer text-left"
              >
                <span className="truncate">{entry.label}</span>
                <span className="shrink-0 text-[9px] font-mono text-slate-500">{displayIdx === 0 ? '1 step' : `${displayIdx + 1} steps`}</span>
              </button>
            ))}
          </div>
        );
      })()}
    </div>
  );
}