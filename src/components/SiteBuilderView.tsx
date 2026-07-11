import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import {
  Site, SiteBlock, SiteBlockType, SiteMessage, ThemeConfig, BlockStyle,
  HeroBlockContent, TextBlockContent, ImageBlockContent, VideoBlockContent, CtaBlockContent,
  ContactFormBlockContent, TestimonialBlockContent, PricingBlockContent, FaqBlockContent, SpacerBlockContent,
  PricingTier, FaqItem,
} from '../types';
import { SITE_FONT_OPTIONS, ensureGoogleFontsLoaded } from '../constants/siteFonts';
import { SITE_TEMPLATES, SiteTemplate } from '../constants/siteTemplates';
import { BLOCK_TYPES, blockMeta } from '../constants/siteBlockTypes';
import { GridPosition, defaultGridPosition, nextAvailableRow, positionFromStyle } from '../constants/siteGrid';
import SiteGridCanvas from './SiteGridCanvas';
import TemplateThumbnail from './TemplateThumbnail';
import {
  ArrowLeft, Plus, Trash2, Loader2,
  Type, Mail, Save, X, Mailbox, ExternalLink,
  Palette, AlignLeft, AlignCenter, AlignRight, Paintbrush, Sparkles, LayoutGrid, LayoutTemplate,
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

function BlockStyleEditor({ blockType, style, onChange }: { blockType: SiteBlockType; style: BlockStyle; onChange: (next: BlockStyle) => void }) {
  const set = (patch: Partial<BlockStyle>) => onChange({ ...style, ...patch });
  return (
    <div className="rounded-lg border border-[#1e2028] bg-[#0c0d12]/40 p-3 space-y-3">
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
        <Paintbrush className="w-3 h-3" /> Style
      </div>
      <p className="text-[9px] text-slate-600 -mt-1.5">Position and size are set by dragging the block on the canvas — this panel is for color, font, and text.</p>

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
      const updateImage = (idx: number, patch: object) => set({ images: images.map((img, i) => i === idx ? { ...img, ...patch } : img) });
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
          <p className="text-[10px] text-slate-500 leading-relaxed">Messages submitted here land in this site's Messages tab.</p>
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
      const updateTier = (idx: number, patch: Partial<PricingTier>) => set({ tiers: tiers.map((t, i) => i === idx ? { ...t, ...patch } : t) });
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
      const updateItem = (idx: number, patch: Partial<FaqItem>) => set({ items: items.map((it, i) => i === idx ? { ...it, ...patch } : it) });
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

// --- Main builder view --------------------------------------------------------

export default function SiteBuilderView({ site, onBack }: { site: Site; onBack: () => void }) {
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingBlock, setEditingBlock] = useState<SiteBlock | null>(null);
  const [savingBlock, setSavingBlock] = useState(false);

  const [draftContent, setDraftContent] = useState<any>(null);
  const [draftOpacity, setDraftOpacity] = useState<Record<string, number>>({});
  const [draftStyle, setDraftStyle] = useState<BlockStyle>({});

  const [tab, setTab] = useState<'blocks' | 'theme' | 'messages'>('blocks');
  const [messages, setMessages] = useState<SiteMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [themeForm, setThemeForm] = useState<ThemeConfig>(() => parseThemeConfig(site.theme_config));
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeSaved, setThemeSaved] = useState(false);

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
    try {
      const result = await api.duplicateSiteBlock(site.id, block.id);
      setBlocks(result.blocks.sort((a, b) => a.position - b.position));
    } catch (err) {
      console.error(err);
      alert('Failed to duplicate block.');
    }
  };

  const handleDeleteBlock = async (block: SiteBlock) => {
    if (!confirm('Delete this block?')) return;
    try {
      await api.deleteSiteBlock(site.id, block.id);
      setBlocks(prev => prev.filter(b => b.id !== block.id));
      if (editingBlock?.id === block.id) setEditingBlock(null);
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
    const nextStyle: BlockStyle = { ...parseJson<BlockStyle>(block.style, {}), ...position };
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, style: JSON.stringify(nextStyle) } : b));
    try {
      await api.updateSiteBlock(site.id, blockId, { style: nextStyle });
    } catch (err) {
      console.error(err);
      loadBlocks();
    }
  };

  const openEditor = (block: SiteBlock) => {
    setEditingBlock(block);
    setDraftContent(parseJson(block.content, blockMeta(block.block_type).defaultContent()));
    setDraftOpacity(parseJson(block.media_opacity, {}));
    setDraftStyle(parseJson(block.style, {}));
  };

  const handleSaveBlock = async () => {
    if (!editingBlock) return;
    setSavingBlock(true);
    try {
      const updated = await api.updateSiteBlock(site.id, editingBlock.id, { content: draftContent, media_opacity: draftOpacity, style: draftStyle });
      setBlocks(prev => prev.map(b => b.id === editingBlock.id ? updated : b));
      setEditingBlock(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save block.');
    } finally {
      setSavingBlock(false);
    }
  };

  const handleSaveTheme = async () => {
    setThemeSaving(true);
    setThemeSaved(false);
    try {
      await api.updateSite(site.id, {
        name: site.name, subdomain: site.subdomain, title: site.title, theme: site.theme, active: site.active,
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
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-6">
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
            <>
              <p className="text-[11px] text-slate-500 font-mono">
                Drag a block's title bar to move it anywhere on the page. Select it, then drag an edge or corner handle to resize — put several blocks side by side to build multi-column rows.
              </p>

              {blocks.length === 0 && !showTemplatePicker && (
                <div className="py-10 text-center border border-dashed border-[#1e2028] rounded-xl bg-[#13141a]/10 space-y-3">
                  <p className="font-mono text-xs text-slate-500">No blocks yet. Start from a template, or build from scratch below.</p>
                  <button onClick={() => setShowTemplatePicker(true)} className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg text-[10px] uppercase tracking-wider font-black transition cursor-pointer inline-flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5" /> Choose a Template
                  </button>
                </div>
              )}

              {blocks.length > 0 && (
                <SiteGridCanvas
                  blocks={blocks}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onEdit={openEditor}
                  onDuplicate={handleDuplicateBlock}
                  onDelete={handleDeleteBlock}
                  onPositionChange={handlePositionChange}
                />
              )}
            </>
          )}

          {showTemplatePicker && (
            <div className="bg-[#13141a]/80 border border-border-theme rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-amber-300" /> Choose a Template
                </span>
                <button onClick={() => setShowTemplatePicker(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-[10px] text-slate-500 -mt-2">Adds a ready-made, multi-column layout with placeholder copy — nothing existing gets touched.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SITE_TEMPLATES.map(tpl => {
                  const isApplying = applyingTemplateId === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => handleApplyTemplate(tpl)}
                      disabled={!!applyingTemplateId}
                      className="flex flex-col gap-2 p-3 rounded-xl border border-[#1e2028] hover:border-amber-500/40 bg-[#0c0d12]/60 hover:bg-amber-950/10 transition cursor-pointer text-left disabled:opacity-50"
                    >
                      <TemplateThumbnail template={tpl} />
                      <div className="flex items-center gap-2">
                        <tpl.icon className="w-3.5 h-3.5 text-primary-theme shrink-0" />
                        <span className="text-xs font-black text-white">{tpl.name}</span>
                        {isApplying && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300 ml-auto" />}
                      </div>
                      <span className="block text-[10px] text-slate-500 leading-snug">{tpl.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2.5">
            {!showPicker ? (
              <button onClick={() => setShowPicker(true)} className="flex-1 px-4 py-4 border-2 border-dashed border-[#1e2028] hover:border-amber-500/40 rounded-xl text-xs uppercase tracking-wider font-black text-slate-400 hover:text-amber-300 transition cursor-pointer flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Block
              </button>
            ) : (
              <div className="flex-1 bg-[#13141a]/80 border border-border-theme rounded-xl p-4 space-y-3">
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
            {!showTemplatePicker && blocks.length > 0 && (
              <button onClick={() => setShowTemplatePicker(true)} className="px-4 py-4 border-2 border-dashed border-[#1e2028] hover:border-amber-500/40 rounded-xl text-xs uppercase tracking-wider font-black text-slate-400 hover:text-amber-300 transition cursor-pointer flex items-center justify-center gap-2 shrink-0">
                <LayoutGrid className="w-4 h-4" /> Use a Template
              </button>
            )}
          </div>
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
              <input type="color" value={themeForm.accent_color || DEFAULT_ACCENT} onChange={(e) => setThemeForm(prev => ({ ...prev, accent_color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0 shrink-0" />
              <input type="text" value={themeForm.accent_color || DEFAULT_ACCENT} onChange={(e) => setThemeForm(prev => ({ ...prev, accent_color: e.target.value }))} className="flex-1 min-w-0 bg-transparent text-xs text-white font-mono focus:outline-none" />
            </div>
          </div>
          <div>
            <FieldLabel>Default Font</FieldLabel>
            <select value={themeForm.font_family || SITE_FONT_OPTIONS[0].value} onChange={(e) => setThemeForm(prev => ({ ...prev, font_family: e.target.value }))} className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2.5 text-sm text-white focus:outline-none" style={{ fontFamily: themeForm.font_family }}>
              {SITE_FONT_OPTIONS.map(f => <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>)}
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

      {/* Block edit modal — Windows-11-style rounded acrylic card, opened from the canvas's pencil button */}
      {editingBlock && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !savingBlock && setEditingBlock(null)}>
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-[#111218]/95 backdrop-blur-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border-theme shrink-0">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                {React.createElement(blockMeta(editingBlock.block_type).icon, { className: 'w-4 h-4 text-primary-theme' })}
                Edit {blockMeta(editingBlock.block_type).label}
              </h2>
              <button onClick={() => setEditingBlock(null)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
              <BlockContentEditor
                blockType={editingBlock.block_type}
                content={draftContent}
                mediaOpacity={draftOpacity}
                onContentChange={setDraftContent}
                onOpacityChange={(key, value) => setDraftOpacity(prev => ({ ...prev, [key]: value }))}
              />
              <BlockStyleEditor blockType={editingBlock.block_type} style={draftStyle} onChange={setDraftStyle} />
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-border-theme shrink-0">
              <button onClick={() => setEditingBlock(null)} disabled={savingBlock} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs uppercase tracking-wider font-bold transition cursor-pointer disabled:opacity-50">Cancel</button>
              <button onClick={handleSaveBlock} disabled={savingBlock} className="px-4 py-2 bg-primary-theme hover:opacity-90 text-slate-950 rounded-lg text-xs uppercase tracking-wider font-black transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50">
                {savingBlock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
