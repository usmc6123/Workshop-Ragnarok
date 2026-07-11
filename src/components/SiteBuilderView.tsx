import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import {
  Site, SiteBlock, SiteBlockType, SiteMessage, ThemeConfig, BlockStyle,
  HeroBlockContent, TextBlockContent, ImageBlockContent, VideoBlockContent, CtaBlockContent,
  ContactFormBlockContent, TestimonialBlockContent, PricingBlockContent, FaqBlockContent, SpacerBlockContent,
  PricingTier, FaqItem,
} from '../types';
import { SITE_FONT_OPTIONS, ensureGoogleFontsLoaded } from '../constants/siteFonts';
import { SITE_TEMPLATES, SiteTemplate } from '../constants/siteTemplates';
import {
  ArrowLeft, Plus, Trash2, Loader2, GripVertical,
  LayoutTemplate, Type, Image as ImageIcon, Film, MousePointerClick, Mail,
  Quote, Tag, HelpCircle, MoveVertical, Save, X, Mailbox, ExternalLink, Copy,
  Palette, AlignLeft, AlignCenter, AlignRight, Paintbrush, Sparkles, LayoutGrid,
} from 'lucide-react';

const DEFAULT_ACCENT = '#f59e0b';

// --- Block type registry: icon, label, and a fresh default content payload for
// each of the 10 block types. Adding an 11th block type later only means adding
// one entry here plus one render branch in BlockContentEditor/BlockPreview below.
const BLOCK_TYPES: { type: SiteBlockType; label: string; icon: React.ElementType; defaultContent: () => object }[] = [
  { type: 'hero', label: 'Hero', icon: LayoutTemplate, defaultContent: () => ({ headline: 'Your Big Headline', subheadline: 'A short supporting line goes here.', cta_text: 'Get Started', cta_link: '' } as HeroBlockContent) },
  { type: 'text', label: 'Text', icon: Type, defaultContent: () => ({ headline: '', body: 'Write something here...', align: 'left' } as TextBlockContent) },
  { type: 'image', label: 'Image Gallery', icon: ImageIcon, defaultContent: () => ({ images: [] } as ImageBlockContent) },
  { type: 'video', label: 'Video', icon: Film, defaultContent: () => ({ video_url: '', autoplay: false, controls: true } as VideoBlockContent) },
  { type: 'cta', label: 'Call To Action', icon: MousePointerClick, defaultContent: () => ({ headline: 'Ready to get started?', subheadline: '', button_text: 'Contact Us', button_link: '' } as CtaBlockContent) },
  { type: 'contact_form', label: 'Contact Form', icon: Mail, defaultContent: () => ({ headline: 'Get In Touch', subheadline: '', button_text: 'Send Message' } as ContactFormBlockContent) },
  { type: 'testimonial', label: 'Testimonial', icon: Quote, defaultContent: () => ({ quote: '', author: '', role: '' } as TestimonialBlockContent) },
  { type: 'pricing', label: 'Pricing', icon: Tag, defaultContent: () => ({ headline: 'Plans & Pricing', tiers: [{ name: 'Basic', price: '$0', features: [] }] } as PricingBlockContent) },
  { type: 'faq', label: 'FAQ', icon: HelpCircle, defaultContent: () => ({ headline: 'Frequently Asked Questions', items: [] } as FaqBlockContent) },
  { type: 'spacer', label: 'Spacer', icon: MoveVertical, defaultContent: () => ({ size: 'md' } as SpacerBlockContent) },
];

function blockMeta(type: SiteBlockType) {
  return BLOCK_TYPES.find(b => b.type === type) || BLOCK_TYPES[0];
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

// Blocks where left/center/right alignment actually means something visually.
const ALIGNABLE_TYPES: SiteBlockType[] = ['hero', 'text', 'cta', 'testimonial'];

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

// A media URL field with its own transparency slider (once a URL is present) —
// same convention already established in FunnelsView's MediaField.
function MediaUrlField({
  label, value, onChange, opacityKey, mediaOpacity, onOpacityChange, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  opacityKey: string;
  mediaOpacity: Record<string, number>;
  onOpacityChange: (key: string, value: number) => void;
  placeholder?: string;
}) {
  const opacity = mediaOpacity[opacityKey] ?? 100;
  return (
    <div className="rounded-lg border border-[#1e2028] bg-[#0c0d12]/60 p-3 space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'https://...'}
        className="w-full rounded-lg bg-[#08090d] border border-[#1e2028] focus:border-slate-500 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
      />
      {value.trim() && (
        <div className="pt-1.5 border-t border-[#1e2028]/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Transparency</span>
            <span className="text-[10px] font-mono text-slate-400">{opacity}% visible</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={opacity}
            onChange={(e) => onOpacityChange(opacityKey, parseInt(e.target.value, 10))}
            className="w-full cursor-pointer accent-amber-500"
          />
        </div>
      )}
    </div>
  );
}

// A small pill-button toggle group — used for width/align/font-size/padding presets.
function PresetToggle<T extends string>({
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

// A color field with a swatch + hex input + a "clear" button to fall back to
// the site default / built-in look, rather than forcing every block to override.
function ColorField({ label, value, onChange, allowClear = true }: { label: string; value: string | undefined; onChange: (v: string | undefined) => void; allowClear?: boolean }) {
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
        {allowClear && value && (
          <button onClick={() => onChange(undefined)} className="text-slate-500 hover:text-white cursor-pointer shrink-0" title="Reset to site default">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

const WIDTH_OPTIONS: { value: NonNullable<BlockStyle['width']>; label: string }[] = [
  { value: 'narrow', label: 'Narrow' },
  { value: 'wide', label: 'Wide' },
  { value: 'full', label: 'Full' },
];
const ALIGN_OPTIONS: { value: NonNullable<BlockStyle['align']>; label: string; icon: React.ElementType }[] = [
  { value: 'left', label: 'Left', icon: AlignLeft },
  { value: 'center', label: 'Center', icon: AlignCenter },
  { value: 'right', label: 'Right', icon: AlignRight },
];
const FONT_SIZE_OPTIONS: { value: NonNullable<BlockStyle['font_size']>; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
  { value: 'xl', label: 'XL' },
];
const PADDING_OPTIONS: { value: NonNullable<BlockStyle['padding']>; label: string }[] = [
  { value: 'sm', label: 'Compact' },
  { value: 'md', label: 'Comfortable' },
  { value: 'lg', label: 'Spacious' },
];

// The per-block "Style" panel — layout/color/typography controls that apply on
// top of whatever the block's content editor already handles. Every value here
// is optional; leaving it unset means "inherit the site default."
function BlockStyleEditor({ blockType, style, onChange }: { blockType: SiteBlockType; style: BlockStyle; onChange: (next: BlockStyle) => void }) {
  const set = (patch: Partial<BlockStyle>) => onChange({ ...style, ...patch });
  return (
    <div className="rounded-lg border border-[#1e2028] bg-[#0c0d12]/40 p-3 space-y-3">
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
        <Paintbrush className="w-3 h-3" /> Style
      </div>

      {blockType !== 'spacer' && (
        <div>
          <FieldLabel>Container Width</FieldLabel>
          <PresetToggle options={WIDTH_OPTIONS} value={style.width || 'wide'} onChange={(v) => set({ width: v })} />
        </div>
      )}

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

      {blockType !== 'spacer' && blockType !== 'image' && blockType !== 'video' && (
        <div className="grid grid-cols-2 gap-2">
          <ColorField label="Background" value={style.bg_color} onChange={(v) => set({ bg_color: v })} />
          <ColorField label="Text Color" value={style.text_color} onChange={(v) => set({ text_color: v })} />
        </div>
      )}
    </div>
  );
}

// --- The per-block-type content editor ---------------------------------------

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
          <div><FieldLabel>Headline</FieldLabel><TextInput value={c.headline || ''} onChange={(v) => set({ headline: v })} placeholder="Your Big Headline" /></div>
          <div><FieldLabel>Subheadline</FieldLabel><TextInput value={c.subheadline || ''} onChange={(v) => set({ subheadline: v })} placeholder="A short supporting line" /></div>
          <MediaUrlField label="Background Image URL" value={c.image_url || ''} onChange={(v) => set({ image_url: v })} opacityKey="image_url" mediaOpacity={mediaOpacity} onOpacityChange={onOpacityChange} />
          <MediaUrlField label="Background Video URL" value={c.video_url || ''} onChange={(v) => set({ video_url: v })} opacityKey="video_url" mediaOpacity={mediaOpacity} onOpacityChange={onOpacityChange} />
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Button Text</FieldLabel><TextInput value={c.cta_text || ''} onChange={(v) => set({ cta_text: v })} placeholder="Get Started" /></div>
            <div><FieldLabel>Button Link</FieldLabel><TextInput value={c.cta_link || ''} onChange={(v) => set({ cta_link: v })} placeholder="https:// or #contact" /></div>
          </div>
        </div>
      );
    }
    case 'text': {
      const c: TextBlockContent = content;
      return (
        <div className="space-y-3">
          <div><FieldLabel>Headline (optional)</FieldLabel><TextInput value={c.headline || ''} onChange={(v) => set({ headline: v })} /></div>
          <div><FieldLabel>Body</FieldLabel><TextArea value={c.body || ''} onChange={(v) => set({ body: v })} rows={5} /></div>
        </div>
      );
    }
    case 'image': {
      const c: ImageBlockContent = content;
      const images = c.images || [];
      const updateImage = (idx: number, patch: object) => {
        const next = images.map((img, i) => i === idx ? { ...img, ...patch } : img);
        set({ images: next });
      };
      const removeImage = (idx: number) => set({ images: images.filter((_, i) => i !== idx) });
      const addImage = () => set({ images: [...images, { url: '', caption: '' }] });
      return (
        <div className="space-y-3">
          {images.map((img, idx) => (
            <div key={idx} className="rounded-lg border border-[#1e2028] bg-[#0c0d12]/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Image {idx + 1}</span>
                <button onClick={() => removeImage(idx)} className="text-rose-400 hover:text-rose-300 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
              </div>
              <TextInput value={img.url} onChange={(v) => updateImage(idx, { url: v })} placeholder="https://..." />
              <TextInput value={img.caption || ''} onChange={(v) => updateImage(idx, { caption: v })} placeholder="Caption (optional)" />
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
          <MediaUrlField label="Video URL" value={c.video_url || ''} onChange={(v) => set({ video_url: v })} opacityKey="video_url" mediaOpacity={mediaOpacity} onOpacityChange={onOpacityChange} />
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
          <div><FieldLabel>Headline</FieldLabel><TextInput value={c.headline || ''} onChange={(v) => set({ headline: v })} /></div>
          <div><FieldLabel>Subheadline</FieldLabel><TextInput value={c.subheadline || ''} onChange={(v) => set({ subheadline: v })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Button Text</FieldLabel><TextInput value={c.button_text || ''} onChange={(v) => set({ button_text: v })} /></div>
            <div><FieldLabel>Button Link</FieldLabel><TextInput value={c.button_link || ''} onChange={(v) => set({ button_link: v })} /></div>
          </div>
        </div>
      );
    }
    case 'contact_form': {
      const c: ContactFormBlockContent = content;
      return (
        <div className="space-y-3">
          <div><FieldLabel>Headline</FieldLabel><TextInput value={c.headline || ''} onChange={(v) => set({ headline: v })} /></div>
          <div><FieldLabel>Subheadline</FieldLabel><TextInput value={c.subheadline || ''} onChange={(v) => set({ subheadline: v })} /></div>
          <div><FieldLabel>Submit Button Text</FieldLabel><TextInput value={c.button_text || ''} onChange={(v) => set({ button_text: v })} /></div>
          <p className="text-[10px] text-slate-500 leading-relaxed">Messages submitted here land in this site's Messages tab — nothing else to configure.</p>
        </div>
      );
    }
    case 'testimonial': {
      const c: TestimonialBlockContent = content;
      return (
        <div className="space-y-3">
          <div><FieldLabel>Quote</FieldLabel><TextArea value={c.quote || ''} onChange={(v) => set({ quote: v })} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Author</FieldLabel><TextInput value={c.author || ''} onChange={(v) => set({ author: v })} /></div>
            <div><FieldLabel>Role / Company</FieldLabel><TextInput value={c.role || ''} onChange={(v) => set({ role: v })} /></div>
          </div>
          <MediaUrlField label="Photo URL (optional)" value={c.photo_url || ''} onChange={(v) => set({ photo_url: v })} opacityKey="photo_url" mediaOpacity={mediaOpacity} onOpacityChange={onOpacityChange} />
        </div>
      );
    }
    case 'pricing': {
      const c: PricingBlockContent = content;
      const tiers = c.tiers || [];
      const updateTier = (idx: number, patch: Partial<PricingTier>) => {
        const next = tiers.map((t, i) => i === idx ? { ...t, ...patch } : t);
        set({ tiers: next });
      };
      const removeTier = (idx: number) => set({ tiers: tiers.filter((_, i) => i !== idx) });
      const addTier = () => set({ tiers: [...tiers, { name: 'New Plan', price: '$0', features: [] }] });
      const updateFeatures = (idx: number, raw: string) => updateTier(idx, { features: raw.split('\n').map(s => s.trim()).filter(Boolean) });
      return (
        <div className="space-y-3">
          <div><FieldLabel>Section Headline</FieldLabel><TextInput value={c.headline || ''} onChange={(v) => set({ headline: v })} /></div>
          {tiers.map((tier, idx) => (
            <div key={idx} className="rounded-lg border border-[#1e2028] bg-[#0c0d12]/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Plan {idx + 1}</span>
                <button onClick={() => removeTier(idx)} className="text-rose-400 hover:text-rose-300 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TextInput value={tier.name || ''} onChange={(v) => updateTier(idx, { name: v })} placeholder="Plan name" />
                <TextInput value={tier.price || ''} onChange={(v) => updateTier(idx, { price: v })} placeholder="$99/mo" />
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
      const updateItem = (idx: number, patch: Partial<FaqItem>) => {
        const next = items.map((it, i) => i === idx ? { ...it, ...patch } : it);
        set({ items: next });
      };
      const removeItem = (idx: number) => set({ items: items.filter((_, i) => i !== idx) });
      const addItem = () => set({ items: [...items, { question: '', answer: '' }] });
      return (
        <div className="space-y-3">
          <div><FieldLabel>Section Headline</FieldLabel><TextInput value={c.headline || ''} onChange={(v) => set({ headline: v })} /></div>
          {items.map((item, idx) => (
            <div key={idx} className="rounded-lg border border-[#1e2028] bg-[#0c0d12]/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Question {idx + 1}</span>
                <button onClick={() => removeItem(idx)} className="text-rose-400 hover:text-rose-300 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
              </div>
              <TextInput value={item.question || ''} onChange={(v) => updateItem(idx, { question: v })} placeholder="Question" />
              <TextArea value={item.answer || ''} onChange={(v) => updateItem(idx, { answer: v })} placeholder="Answer" rows={2} />
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

// One-line preview summary shown on the collapsed block card, so the owner can
// tell blocks apart at a glance without expanding each one.
function blockSummary(blockType: SiteBlockType, content: any): string {
  switch (blockType) {
    case 'hero': return content.headline || 'Untitled hero';
    case 'text': return content.headline || (content.body ? content.body.slice(0, 60) : 'Empty text block');
    case 'image': return `${(content.images || []).length} image(s)`;
    case 'video': return content.video_url ? content.video_url : 'No video set';
    case 'cta': return content.headline || 'Untitled CTA';
    case 'contact_form': return content.headline || 'Contact form';
    case 'testimonial': return content.author ? `Quote from ${content.author}` : 'Untitled testimonial';
    case 'pricing': return `${(content.tiers || []).length} plan(s)`;
    case 'faq': return `${(content.items || []).length} question(s)`;
    case 'spacer': return `Size: ${content.size || 'md'}`;
    default: return '';
  }
}

function parseThemeConfig(raw: string | null | undefined): ThemeConfig {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

// --- Main builder view --------------------------------------------------------

export default function SiteBuilderView({ site, onBack }: { site: Site; onBack: () => void }) {
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  // Local draft state for whichever block is currently expanded for editing.
  const [draftContent, setDraftContent] = useState<any>(null);
  const [draftOpacity, setDraftOpacity] = useState<Record<string, number>>({});
  const [draftStyle, setDraftStyle] = useState<BlockStyle>({});

  const [tab, setTab] = useState<'blocks' | 'theme' | 'messages'>('blocks');
  const [messages, setMessages] = useState<SiteMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Site-wide theme, editable right here so switching to Settings isn't needed
  // mid-build.
  const [themeForm, setThemeForm] = useState<ThemeConfig>(() => parseThemeConfig(site.theme_config));
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeSaved, setThemeSaved] = useState(false);

  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    loadBlocks();
    ensureGoogleFontsLoaded([site.theme_config ? parseThemeConfig(site.theme_config).font_family : undefined, ...SITE_FONT_OPTIONS.map(f => f.value)]);
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

  const loadMessages = async () => {
    setMessagesLoading(true);
    try {
      const data = await api.getSiteMessages(site.id);
      setMessages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'messages') loadMessages();
  }, [tab]);

  const handleAddBlock = async (blockType: SiteBlockType) => {
    setShowPicker(false);
    try {
      const created = await api.createSiteBlock(site.id, { block_type: blockType, content: blockMeta(blockType).defaultContent(), media_opacity: {}, style: {} });
      setBlocks(prev => [...prev, created]);
      openEditor(created);
    } catch (err) {
      console.error(err);
      alert('Failed to add block.');
    }
  };

  // Applies a template by creating each of its blocks in order. Positions are
  // assigned server-side (max + 1 each time), so awaiting sequentially — rather
  // than firing them all in parallel — is what keeps the template's intended
  // top-to-bottom order intact. Templates only ever ADD blocks; they never
  // touch or remove whatever's already on the page.
  const handleApplyTemplate = async (template: SiteTemplate) => {
    if (blocks.length > 0 && !confirm(`Add the "${template.name}" template's ${template.blocks.length} blocks to the end of this page?`)) return;
    setApplyingTemplateId(template.id);
    try {
      for (const tplBlock of template.blocks) {
        const created = await api.createSiteBlock(site.id, {
          block_type: tplBlock.block_type,
          content: tplBlock.content,
          media_opacity: {},
          style: tplBlock.style || {},
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
    try {
      const result = await api.duplicateSiteBlock(site.id, block.id);
      setBlocks(result.blocks.sort((a, b) => a.position - b.position));
    } catch (err) {
      console.error(err);
      alert('Failed to duplicate block.');
    }
  };

  const openEditor = (block: SiteBlock) => {
    setExpandedId(block.id);
    setDraftContent(parseJson(block.content, blockMeta(block.block_type).defaultContent()));
    setDraftOpacity(parseJson(block.media_opacity, {}));
    setDraftStyle(parseJson(block.style, {}));
  };

  const closeEditor = () => {
    setExpandedId(null);
    setDraftContent(null);
    setDraftOpacity({});
    setDraftStyle({});
  };

  const handleSaveBlock = async (block: SiteBlock) => {
    setSavingId(block.id);
    try {
      const updated = await api.updateSiteBlock(site.id, block.id, { content: draftContent, media_opacity: draftOpacity, style: draftStyle });
      setBlocks(prev => prev.map(b => b.id === block.id ? updated : b));
      closeEditor();
    } catch (err) {
      console.error(err);
      alert('Failed to save block.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteBlock = async (block: SiteBlock) => {
    if (!confirm('Delete this block?')) return;
    try {
      await api.deleteSiteBlock(site.id, block.id);
      setBlocks(prev => prev.filter(b => b.id !== block.id));
      if (expandedId === block.id) closeEditor();
    } catch (err) {
      console.error(err);
      alert('Failed to delete block.');
    }
  };

  // --- Real drag-and-drop reordering ---
  // The whole collapsed block row is draggable (grip icon is just the visual
  // affordance). Dropping onto another row's position swaps it into that slot
  // and persists the new order via reorderSiteBlocks.
  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) setDragOverIndex(index);
  };
  const handleDragEnd = () => {
    dragIndex.current = null;
    setDragOverIndex(null);
  };
  const handleDrop = async (index: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    setDragOverIndex(null);
    if (from === null || from === index) return;

    const reordered = [...blocks];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(index, 0, moved);
    setBlocks(reordered);
    try {
      const updated = await api.reorderSiteBlocks(site.id, reordered.map(b => b.id));
      setBlocks(updated.sort((a, b) => a.position - b.position));
    } catch (err) {
      console.error(err);
      loadBlocks(); // resync on failure
    }
  };

  const handleSaveTheme = async () => {
    setThemeSaving(true);
    setThemeSaved(false);
    try {
      await api.updateSite(site.id, {
        name: site.name,
        subdomain: site.subdomain,
        title: site.title,
        theme: site.theme,
        active: site.active,
        theme_config: themeForm,
      } as any);
      ensureGoogleFontsLoaded([themeForm.font_family]);
      setThemeSaved(true);
      setTimeout(() => setThemeSaved(false), 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to save theme.');
    } finally {
      setThemeSaving(false);
    }
  };

  const previewUrl = `${window.location.origin}/site/${site.subdomain}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-theme pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-black text-slate-100 uppercase tracking-wider truncate">{site.name}</h1>
            <p className="text-xs text-slate-500 font-mono truncate">{site.subdomain}.sites.homeslab.uk</p>
          </div>
        </div>
        <a href={previewUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs uppercase tracking-wider font-bold transition flex items-center gap-1.5 cursor-pointer self-start md:self-center">
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Preview Site</span>
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('blocks')} className={`px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-bold transition cursor-pointer flex items-center gap-1.5 ${tab === 'blocks' ? 'bg-primary-theme text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
          <LayoutTemplate className="w-3.5 h-3.5" /> Blocks
        </button>
        <button onClick={() => setTab('theme')} className={`px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-bold transition cursor-pointer flex items-center gap-1.5 ${tab === 'theme' ? 'bg-primary-theme text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
          <Palette className="w-3.5 h-3.5" /> Site Theme
        </button>
        <button onClick={() => setTab('messages')} className={`px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-bold transition cursor-pointer flex items-center gap-1.5 ${tab === 'messages' ? 'bg-primary-theme text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
          <Mailbox className="w-3.5 h-3.5" /> Messages{messages.length > 0 ? ` (${messages.length})` : ''}
        </button>
      </div>

      {tab === 'blocks' ? (
        <>
          {error && <div className="bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs font-mono">{error}</div>}

          {loading ? (
            <div className="py-16 text-center text-slate-400 font-mono text-xs flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-primary-theme animate-spin" />
              <span>Loading blocks...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {blocks.length === 0 && !showTemplatePicker && (
                <div className="py-10 text-center border border-dashed border-[#1e2028] rounded-xl bg-[#13141a]/10 space-y-3">
                  <p className="font-mono text-xs text-slate-500">No blocks yet. Start from a template, or build from scratch below.</p>
                  <button onClick={() => setShowTemplatePicker(true)} className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg text-[10px] uppercase tracking-wider font-black transition cursor-pointer inline-flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5" /> Choose a Template
                  </button>
                </div>
              )}
              {blocks.map((block, idx) => {
                const meta = blockMeta(block.block_type);
                const Icon = meta.icon;
                const isExpanded = expandedId === block.id;
                const content = parseJson(block.content, {});
                const isDragTarget = dragOverIndex === idx;
                return (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    className={`bg-[#13141a]/80 backdrop-blur-sm border rounded-xl overflow-hidden shadow-xl transition ${isDragTarget ? 'border-amber-400' : 'border-border-theme'}`}
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-300 shrink-0" title="Drag to reorder">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="p-2 bg-[#0c0d12] rounded-lg text-primary-theme shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => isExpanded ? closeEditor() : openEditor(block)}>
                        <span className="block text-xs font-black text-white uppercase tracking-wide">{meta.label}</span>
                        <span className="block text-[11px] text-slate-500 truncate">{blockSummary(block.block_type, content)}</span>
                      </div>
                      <button onClick={() => handleDuplicateBlock(block)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer shrink-0" title="Duplicate block">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => isExpanded ? closeEditor() : openEditor(block)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] uppercase tracking-wider font-bold transition cursor-pointer shrink-0">
                        {isExpanded ? 'Close' : 'Edit'}
                      </button>
                      <button onClick={() => handleDeleteBlock(block)} className="p-2 bg-rose-950/40 hover:bg-rose-950/70 text-rose-300 rounded-lg transition cursor-pointer shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {isExpanded && draftContent && (
                      <div className="border-t border-border-theme p-4 space-y-4 bg-bg-theme/40">
                        <BlockContentEditor
                          blockType={block.block_type}
                          content={draftContent}
                          mediaOpacity={draftOpacity}
                          onContentChange={setDraftContent}
                          onOpacityChange={(key, value) => setDraftOpacity(prev => ({ ...prev, [key]: value }))}
                        />
                        <BlockStyleEditor blockType={block.block_type} style={draftStyle} onChange={setDraftStyle} />
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-theme">
                          <button onClick={closeEditor} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs uppercase tracking-wider font-bold transition cursor-pointer flex items-center gap-1.5">
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                          <button onClick={() => handleSaveBlock(block)} disabled={savingId === block.id} className="px-4 py-2 bg-primary-theme hover:opacity-90 text-slate-950 rounded-lg text-xs uppercase tracking-wider font-black transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50">
                            {savingId === block.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Save Block
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Template picker — always available, not just on an empty page, so a
              template's blocks can be appended to flesh out an existing page. */}
          {showTemplatePicker && (
            <div className="bg-[#13141a]/80 border border-border-theme rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-amber-300" /> Choose a Template
                </span>
                <button onClick={() => setShowTemplatePicker(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-[10px] text-slate-500 -mt-2">Adds a ready-made set of blocks with placeholder copy to the end of this page — nothing existing gets touched.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SITE_TEMPLATES.map(tpl => {
                  const Icon = tpl.icon;
                  const isApplying = applyingTemplateId === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => handleApplyTemplate(tpl)}
                      disabled={!!applyingTemplateId}
                      className="flex items-start gap-3 p-3 rounded-lg border border-[#1e2028] hover:border-amber-500/40 bg-[#0c0d12]/60 hover:bg-amber-950/10 transition cursor-pointer text-left disabled:opacity-50"
                    >
                      <div className="p-2 bg-[#111218] rounded-lg text-primary-theme shrink-0">
                        {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-black text-white">{tpl.name}</span>
                        <span className="block text-[10px] text-slate-500 leading-snug mt-0.5">{tpl.description}</span>
                        <span className="block text-[9px] text-slate-600 mt-1 font-mono">{tpl.blocks.length} blocks</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add block */}
          {!showPicker ? (
            <div className="flex gap-2.5">
              <button onClick={() => setShowPicker(true)} className="flex-1 px-4 py-4 border-2 border-dashed border-[#1e2028] hover:border-amber-500/40 rounded-xl text-xs uppercase tracking-wider font-black text-slate-400 hover:text-amber-300 transition cursor-pointer flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Block
              </button>
              {!showTemplatePicker && blocks.length > 0 && (
                <button onClick={() => setShowTemplatePicker(true)} className="px-4 py-4 border-2 border-dashed border-[#1e2028] hover:border-amber-500/40 rounded-xl text-xs uppercase tracking-wider font-black text-slate-400 hover:text-amber-300 transition cursor-pointer flex items-center justify-center gap-2 shrink-0">
                  <LayoutGrid className="w-4 h-4" /> Use a Template
                </button>
              )}
            </div>
          ) : (
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
        </>
      ) : tab === 'theme' ? (
        <div className="bg-[#13141a]/80 border border-border-theme rounded-xl p-5 space-y-5 max-w-lg">
          <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-300" /> Site-Wide Theme
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed -mt-3">
            Sets the default look for every block on this site. Any block can still override the font in its own Style panel.
          </p>

          <div>
            <FieldLabel>Accent Color</FieldLabel>
            <div className="flex items-center gap-2 rounded-lg bg-[#0c0d12] border border-[#1e2028] px-2 py-1.5">
              <input
                type="color"
                value={themeForm.accent_color || DEFAULT_ACCENT}
                onChange={(e) => setThemeForm(prev => ({ ...prev, accent_color: e.target.value }))}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0 shrink-0"
              />
              <input
                type="text"
                value={themeForm.accent_color || DEFAULT_ACCENT}
                onChange={(e) => setThemeForm(prev => ({ ...prev, accent_color: e.target.value }))}
                className="flex-1 min-w-0 bg-transparent text-xs text-white font-mono focus:outline-none"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Default Font</FieldLabel>
            <select
              value={themeForm.font_family || SITE_FONT_OPTIONS[0].value}
              onChange={(e) => setThemeForm(prev => ({ ...prev, font_family: e.target.value }))}
              className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2.5 text-sm text-white focus:outline-none"
              style={{ fontFamily: themeForm.font_family }}
            >
              {SITE_FONT_OPTIONS.map(f => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-border-theme">
            <button onClick={handleSaveTheme} disabled={themeSaving} className="px-4 py-2 bg-primary-theme hover:opacity-90 text-slate-950 rounded-lg text-xs uppercase tracking-wider font-black transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50">
              {themeSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Theme
            </button>
            {themeSaved && <span className="text-[11px] text-emerald-400 font-mono">Saved!</span>}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {messagesLoading ? (
            <div className="py-16 text-center text-slate-400 font-mono text-xs flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-primary-theme animate-spin" />
              <span>Loading messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-[#1e2028] rounded-xl bg-[#13141a]/10 font-mono text-xs text-slate-500">
              No messages yet. When a visitor submits your Contact Form block, it shows up here.
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
    </div>
  );
}
