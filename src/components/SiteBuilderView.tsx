import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  Site, SiteBlock, SiteBlockType, SiteMessage,
  HeroBlockContent, TextBlockContent, ImageBlockContent, VideoBlockContent, CtaBlockContent,
  ContactFormBlockContent, TestimonialBlockContent, PricingBlockContent, FaqBlockContent, SpacerBlockContent,
  PricingTier, FaqItem,
} from '../types';
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Loader2, GripVertical,
  LayoutTemplate, Type, Image as ImageIcon, Film, MousePointerClick, Mail,
  Quote, Tag, HelpCircle, MoveVertical, Save, X, Mailbox, ExternalLink,
} from 'lucide-react';

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

// Reused input styling helper components ------------------------------------

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
          <div>
            <FieldLabel>Alignment</FieldLabel>
            <div className="flex gap-2">
              {(['left', 'center'] as const).map(a => (
                <button key={a} type="button" onClick={() => set({ align: a })}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${c.align === a || (!c.align && a === 'left') ? 'border-amber-400 bg-amber-950/20 text-amber-300' : 'border-[#1e2028] text-slate-400 hover:border-slate-600'}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
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

// --- Main builder view --------------------------------------------------------

export default function SiteBuilderView({ site, onBack }: { site: Site; onBack: () => void }) {
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  // Local draft state for whichever block is currently expanded for editing.
  const [draftContent, setDraftContent] = useState<any>(null);
  const [draftOpacity, setDraftOpacity] = useState<Record<string, number>>({});

  const [tab, setTab] = useState<'blocks' | 'messages'>('blocks');
  const [messages, setMessages] = useState<SiteMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    loadBlocks();
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
      const created = await api.createSiteBlock(site.id, { block_type: blockType, content: blockMeta(blockType).defaultContent(), media_opacity: {} });
      setBlocks(prev => [...prev, created]);
      openEditor(created);
    } catch (err) {
      console.error(err);
      alert('Failed to add block.');
    }
  };

  const openEditor = (block: SiteBlock) => {
    setExpandedId(block.id);
    setDraftContent(parseJson(block.content, blockMeta(block.block_type).defaultContent()));
    setDraftOpacity(parseJson(block.media_opacity, {}));
  };

  const closeEditor = () => {
    setExpandedId(null);
    setDraftContent(null);
    setDraftOpacity({});
  };

  const handleSaveBlock = async (block: SiteBlock) => {
    setSavingId(block.id);
    try {
      const updated = await api.updateSiteBlock(site.id, block.id, { content: draftContent, media_opacity: draftOpacity });
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

  const moveBlock = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const reordered = [...blocks];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setBlocks(reordered);
    try {
      const updated = await api.reorderSiteBlocks(site.id, reordered.map(b => b.id));
      setBlocks(updated.sort((a, b) => a.position - b.position));
    } catch (err) {
      console.error(err);
      loadBlocks(); // resync on failure
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
              {blocks.length === 0 && (
                <div className="py-12 text-center border border-dashed border-[#1e2028] rounded-xl bg-[#13141a]/10 font-mono text-xs text-slate-500">
                  No blocks yet. Add your first one below — a Hero block is a good place to start.
                </div>
              )}
              {blocks.map((block, idx) => {
                const meta = blockMeta(block.block_type);
                const Icon = meta.icon;
                const isExpanded = expandedId === block.id;
                const content = parseJson(block.content, {});
                return (
                  <div key={block.id} className="bg-[#13141a]/80 backdrop-blur-sm border border-border-theme rounded-xl overflow-hidden shadow-xl">
                    <div className="flex items-center gap-3 p-4">
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0} className="text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"><ChevronUp className="w-3.5 h-3.5" /></button>
                        <button onClick={() => moveBlock(idx, 1)} disabled={idx === blocks.length - 1} className="text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"><ChevronDown className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="p-2 bg-[#0c0d12] rounded-lg text-primary-theme shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => isExpanded ? closeEditor() : openEditor(block)}>
                        <span className="block text-xs font-black text-white uppercase tracking-wide">{meta.label}</span>
                        <span className="block text-[11px] text-slate-500 truncate">{blockSummary(block.block_type, content)}</span>
                      </div>
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

          {/* Add block */}
          {!showPicker ? (
            <button onClick={() => setShowPicker(true)} className="w-full px-4 py-4 border-2 border-dashed border-[#1e2028] hover:border-amber-500/40 rounded-xl text-xs uppercase tracking-wider font-black text-slate-400 hover:text-amber-300 transition cursor-pointer flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Add Block
            </button>
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
