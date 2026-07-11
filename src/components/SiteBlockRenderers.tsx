import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  SiteBlock, BlockStyle, HeadingTag, DeviceBreakpoint,
  HeroBlockContent, TextBlockContent, ImageBlockContent, VideoBlockContent, CtaBlockContent,
  ContactFormBlockContent, TestimonialBlockContent, PricingBlockContent, FaqBlockContent,
} from '../types';
import { getSiteIcon } from '../constants/siteIcons';
import RichTextEditor from './RichTextEditor';
import {
  Loader2, AlertTriangle, CheckCircle2, ArrowRight, Quote, Send, ChevronDown,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

// This file is the single source of truth for what a block actually looks
// like — both SitePageView (the real public site) and SiteGridCanvas (the
// builder) render through these same components, just with `editable`
// true/false. That guarantees the edit screen and the live site are pixel-
// identical, and lets text fields be edited by clicking directly on them
// instead of through a separate popup form.

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export function getOpacity(block: SiteBlock, key: string, defaultPercent: number = 100): number {
  try {
    const map = block.media_opacity ? JSON.parse(block.media_opacity) : {};
    const val = map?.[key];
    return (typeof val === 'number' && val >= 0 && val <= 100) ? val / 100 : defaultPercent / 100;
  } catch {
    return defaultPercent / 100;
  }
}

export function getContrastText(hex: string | undefined): string {
  if (!hex) return '#0f172a';
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#0f172a';
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#0f172a' : '#ffffff';
}

// --- Style application helpers -------------------------------------------------

const RADIUS_MAP: Record<string, string> = { none: '0px', sm: '8px', md: '16px', lg: '24px', full: '9999px' };
const SHADOW_MAP: Record<string, string> = {
  none: 'none', sm: '0 1px 3px rgba(0,0,0,0.3)', md: '0 4px 14px rgba(0,0,0,0.35)',
  lg: '0 12px 28px rgba(0,0,0,0.4)', xl: '0 24px 48px rgba(0,0,0,0.45)',
};
const LINE_HEIGHT_MAP: Record<string, string> = { tight: '1.15', normal: '1.5', relaxed: '1.85' };
const LETTER_SPACING_MAP: Record<string, string> = { tight: '-0.02em', normal: 'normal', wide: '0.06em' };
const GRADIENT_DIR_MAP: Record<string, string> = {
  'to-r': 'to right', 'to-l': 'to left', 'to-b': 'to bottom', 'to-t': 'to top', 'to-br': 'to bottom right', 'to-bl': 'to bottom left',
};

// Resolves the effective style for the current device — mobile overrides
// (font_size/padding/align) merge on top of the base style so a Hero can be
// smaller/left-aligned on phones without touching the desktop version at all.
export function resolveDeviceStyle(style: BlockStyle, device: DeviceBreakpoint): BlockStyle {
  if (device !== 'mobile' || !style.mobile) return style;
  return { ...style, ...style.mobile };
}

export function boxAppearanceStyle(style: BlockStyle): React.CSSProperties {
  const s: React.CSSProperties = {};
  if (style.bg_type === 'gradient' && style.bg_gradient_from && style.bg_gradient_to) {
    s.background = `linear-gradient(${GRADIENT_DIR_MAP[style.bg_gradient_direction || 'to-br']}, ${style.bg_gradient_from}, ${style.bg_gradient_to})`;
  } else if (style.bg_color) {
    s.backgroundColor = style.bg_color;
  }
  if (style.text_color) s.color = style.text_color;
  if (style.font_family) s.fontFamily = style.font_family;
  if (style.border_width) {
    s.borderWidth = style.border_width;
    s.borderStyle = style.border_style || 'solid';
    s.borderColor = style.border_color || 'rgba(255,255,255,0.15)';
  }
  if (style.border_radius) s.borderRadius = RADIUS_MAP[style.border_radius];
  if (style.shadow) s.boxShadow = SHADOW_MAP[style.shadow];
  if (style.line_height) s.lineHeight = LINE_HEIGHT_MAP[style.line_height];
  if (style.letter_spacing) s.letterSpacing = LETTER_SPACING_MAP[style.letter_spacing];
  if (style.text_transform && style.text_transform !== 'none') s.textTransform = style.text_transform as any;
  return s;
}

export function paddingClass(padding?: BlockStyle['padding']): string {
  if (padding === 'sm') return 'p-4';
  if (padding === 'lg') return 'p-10';
  return 'p-6';
}
export function alignClass(align: BlockStyle['align'] | undefined, fallback: 'left' | 'center' | 'right' = 'left'): string {
  const a = align || fallback;
  if (a === 'center') return 'text-center mx-auto';
  if (a === 'right') return 'text-right ml-auto';
  return 'text-left';
}
const HEADLINE_SIZE: Record<string, string> = {
  sm: 'text-lg md:text-xl', md: 'text-xl md:text-3xl', lg: 'text-2xl md:text-4xl', xl: 'text-3xl md:text-5xl',
};
const BODY_SIZE: Record<string, string> = { sm: 'text-xs', md: 'text-sm', lg: 'text-base', xl: 'text-lg' };

// --- Video/YouTube/Vimeo embed detection ---------------------------------------

function parseVideoEmbed(url: string): { type: 'youtube' | 'vimeo' | 'direct'; id?: string } {
  if (!url) return { type: 'direct' };
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{6,})/);
  if (yt) return { type: 'youtube', id: yt[1] };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { type: 'vimeo', id: vm[1] };
  return { type: 'direct' };
}

// A standard aspect-ratio video embed — used by the dedicated Video block.
function VideoEmbed({ url, autoplay, controls, opacity, objectFit }: { url: string; autoplay?: boolean; controls?: boolean; opacity: number; objectFit?: 'cover' | 'contain' }) {
  const parsed = parseVideoEmbed(url);
  if (parsed.type === 'direct') {
    return (
      <video
        src={url} autoPlay={!!autoplay} muted={!!autoplay} controls={controls !== false} loop={!!autoplay} playsInline
        className="w-full h-full rounded-xl" style={{ opacity, objectFit: objectFit || 'cover' }}
      />
    );
  }
  const src = parsed.type === 'youtube'
    ? `https://www.youtube.com/embed/${parsed.id}?${autoplay ? 'autoplay=1&mute=1&' : ''}${controls === false ? 'controls=0&' : ''}rel=0`
    : `https://player.vimeo.com/video/${parsed.id}?${autoplay ? 'autoplay=1&muted=1&' : ''}`;
  return (
    <div className="w-full h-full rounded-xl overflow-hidden" style={{ opacity }}>
      <iframe src={src} className="w-full h-full" style={{ border: 0 }} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title="Embedded video" />
    </div>
  );
}

// A "video as background" version — used behind the Hero block. Direct MP4s
// use a real <video>; YouTube/Vimeo use the classic oversized-iframe trick
// (no official API for a true cover-fit background embed).
function VideoBackground({ url, opacity }: { url: string; opacity: number }) {
  const parsed = parseVideoEmbed(url);
  if (parsed.type === 'direct') {
    return <video src={url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" style={{ opacity }} />;
  }
  const src = parsed.type === 'youtube'
    ? `https://www.youtube.com/embed/${parsed.id}?autoplay=1&mute=1&loop=1&playlist=${parsed.id}&controls=0&rel=0`
    : `https://player.vimeo.com/video/${parsed.id}?autoplay=1&muted=1&loop=1&background=1`;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity }}>
      <iframe
        src={src}
        className="absolute top-1/2 left-1/2 pointer-events-none"
        style={{ border: 0, width: '300%', height: '300%', transform: 'translate(-50%, -50%)' }}
        allow="autoplay"
        title="Background video"
      />
    </div>
  );
}

// --- Inline-editable primitives ------------------------------------------------

// Short, single-line, plain-text fields (headline, button labels, prices...).
// No formatting toolbar — just click and type.
function InlineText({ value, onCommit, editable, className, placeholder, tag = 'span' }: {
  value: string; onCommit: (v: string) => void; editable: boolean; className?: string; placeholder?: string; tag?: 'span' | 'div';
}) {
  const ref = React.useRef<HTMLElement>(null);
  const focused = React.useRef(false);

  useEffect(() => {
    if (ref.current && !focused.current && ref.current.textContent !== (value || '')) {
      ref.current.textContent = value || '';
    }
  }, [value]);

  if (!editable) {
    const Tag = tag;
    return <Tag className={className}>{value}</Tag>;
  }

  const Tag = tag;
  return (
    // @ts-ignore — ref typing across span/div union
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      className={`${className || ''} outline-none focus:ring-2 focus:ring-amber-400/50 rounded-sm cursor-text empty:before:content-[attr(data-placeholder)] empty:before:opacity-40`}
      onFocus={() => { focused.current = true; }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => { focused.current = false; onCommit(e.currentTarget.textContent || ''); }}
    />
  );
}

function Heading({ tag, children, className, fontFamily }: { tag?: HeadingTag; children: React.ReactNode; className?: string; fontFamily?: string }) {
  const Tag = (tag || 'h2') as any;
  return <Tag className={className} style={fontFamily ? { fontFamily } : undefined}>{children}</Tag>;
}

function ButtonIcon({ name }: { name?: string }) {
  const Icon = getSiteIcon(name);
  if (!Icon) return null;
  return <Icon className="w-4 h-4" />;
}

// --- Shared prop shape ----------------------------------------------------------

export interface SiteBlockViewProps {
  block: SiteBlock;
  dark: boolean;
  accent: string;
  secondaryColor?: string;
  headingFont?: string;
  bodyFont?: string;
  subdomain: string;
  editable: boolean;
  device?: DeviceBreakpoint;
  onContentChange?: (content: any) => void;
}

function useContent<T>(block: SiteBlock): T {
  return React.useMemo(() => parseJson<T>(block.content, {} as T), [block.content]);
}

// --- Individual block views -----------------------------------------------------

function HeroView({ block, dark, accent, headingFont, editable, onContentChange, device }: SiteBlockViewProps) {
  const c = useContent<HeroBlockContent>(block);
  const rawStyle = parseJson<BlockStyle>(block.style, {});
  const style = resolveDeviceStyle(rawStyle, device || 'desktop');
  const accentText = getContrastText(accent);
  const set = (patch: Partial<HeroBlockContent>) => onContentChange?.({ ...c, ...patch });

  return (
    <section className={`relative overflow-hidden rounded-2xl w-full h-full flex items-center ${paddingClass(style.padding)}`} style={boxAppearanceStyle(style)}>
      {c.video_url && <VideoBackground url={c.video_url} opacity={getOpacity(block, 'video_url')} />}
      {c.image_url && !c.video_url && (
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${c.image_url})`, backgroundSize: c.object_fit === 'contain' ? 'contain' : 'cover', opacity: getOpacity(block, 'image_url') }} />
      )}
      <div className={`absolute inset-0 ${dark ? 'bg-gradient-to-b from-black/60 via-black/50 to-black/70' : 'bg-gradient-to-b from-white/50 via-white/40 to-white/60'}`} />
      <div className={`relative z-10 w-full space-y-4 ${alignClass(style.align, 'center')}`}>
        <Heading tag={c.headline_tag} fontFamily={style.font_family || headingFont} className={`font-black tracking-tight ${HEADLINE_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-white' : 'text-slate-900') : ''}`}>
          <InlineText value={c.headline || ''} onCommit={(v) => set({ headline: v })} editable={editable} placeholder="Your Big Headline" tag="span" />
        </Heading>
        <div className={`${BODY_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-slate-300' : 'text-slate-600') : 'opacity-80'}`}>
          <RichTextEditor value={c.subheadline || ''} onChange={(v) => set({ subheadline: v })} editable={editable} placeholder="A short supporting line" />
        </div>
        {(c.cta_text || editable) && (
          <a href={c.cta_link || '#'} onClick={(e) => editable && e.preventDefault()} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-black uppercase tracking-wider text-sm transition hover:opacity-90" style={{ backgroundColor: accent, color: accentText }}>
            {(!c.cta_icon_position || c.cta_icon_position === 'left') && <ButtonIcon name={c.cta_icon} />}
            <InlineText value={c.cta_text || ''} onCommit={(v) => set({ cta_text: v })} editable={editable} placeholder="Get Started" />
            {c.cta_icon_position === 'right' && <ButtonIcon name={c.cta_icon} />}
            {!c.cta_icon && !editable && <ArrowRight className="w-4 h-4" />}
          </a>
        )}
      </div>
    </section>
  );
}

function TextView({ block, dark, headingFont, editable, onContentChange, device }: SiteBlockViewProps) {
  const c = useContent<TextBlockContent>(block);
  const rawStyle = parseJson<BlockStyle>(block.style, {});
  const style = resolveDeviceStyle(rawStyle, device || 'desktop');
  const set = (patch: Partial<TextBlockContent>) => onContentChange?.({ ...c, ...patch });
  return (
    <section className={`w-full h-full ${paddingClass(style.padding)}`} style={boxAppearanceStyle(style)}>
      <div className={alignClass(style.align, 'left')}>
        <Heading tag={c.headline_tag} fontFamily={style.font_family || headingFont} className={`font-black mb-3 ${HEADLINE_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-white' : 'text-slate-900') : ''}`}>
          <InlineText value={c.headline || ''} onCommit={(v) => set({ headline: v })} editable={editable} placeholder="Headline (optional)" />
        </Heading>
        <div className={`leading-relaxed ${BODY_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-slate-300' : 'text-slate-600') : ''}`}>
          <RichTextEditor value={c.body || ''} onChange={(v) => set({ body: v })} editable={editable} placeholder="Write something here..." />
        </div>
      </div>
    </section>
  );
}

function ImageView({ block, editable, onContentChange }: SiteBlockViewProps) {
  const c = useContent<ImageBlockContent>(block);
  const images = c.images || [];
  const [idx, setIdx] = useState(0);
  const isCarousel = c.layout === 'carousel';

  useEffect(() => {
    if (!isCarousel || !c.carousel_autoplay || images.length < 2) return;
    const t = setInterval(() => setIdx(i => (i + 1) % images.length), 4000);
    return () => clearInterval(t);
  }, [isCarousel, c.carousel_autoplay, images.length]);

  if (images.length === 0) {
    return editable ? <div className="w-full h-full flex items-center justify-center text-xs text-slate-600 border border-dashed border-white/10 rounded-xl">No images yet — add some in the panel</div> : null;
  }

  if (isCarousel) {
    return (
      <section className="relative w-full h-full rounded-xl overflow-hidden bg-black/20">
        {images.map((img, i) => (
          <img key={i} src={img.url} alt={img.caption || ''} className="absolute inset-0 w-full h-full transition-opacity duration-500" style={{ opacity: i === idx ? 1 : 0, objectFit: c.object_fit || 'cover' }} />
        ))}
        {images.length > 1 && (
          <>
            <button onClick={() => setIdx(i => (i - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setIdx(i => (i + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => <button key={i} onClick={() => setIdx(i)} className={`w-1.5 h-1.5 rounded-full cursor-pointer ${i === idx ? 'bg-white' : 'bg-white/40'}`} />)}
            </div>
          </>
        )}
      </section>
    );
  }

  return (
    <section className="w-full h-full">
      <div className={`grid gap-3 h-full ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {images.map((img, i) => (
          <figure key={i} className="rounded-xl overflow-hidden bg-black/20 relative">
            {img.url && <img src={img.url} alt={img.caption || ''} className="w-full h-full" style={{ objectFit: c.object_fit || 'cover' }} />}
            {img.caption && <figcaption className="text-[11px] text-slate-400 p-2 text-center">{img.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </section>
  );
}

function VideoView({ block }: SiteBlockViewProps) {
  const c = useContent<VideoBlockContent>(block);
  if (!c.video_url) return null;
  return (
    <section className="w-full h-full">
      <VideoEmbed url={c.video_url} autoplay={c.autoplay} controls={c.controls} opacity={getOpacity(block, 'video_url')} objectFit={c.object_fit} />
    </section>
  );
}

function CtaView({ block, dark, accent, headingFont, editable, onContentChange, device }: SiteBlockViewProps) {
  const c = useContent<CtaBlockContent>(block);
  const rawStyle = parseJson<BlockStyle>(block.style, {});
  const style = resolveDeviceStyle(rawStyle, device || 'desktop');
  const accentText = getContrastText(accent);
  const set = (patch: Partial<CtaBlockContent>) => onContentChange?.({ ...c, ...patch });
  return (
    <section
      className={`rounded-2xl space-y-3 border w-full h-full flex flex-col justify-center ${paddingClass(style.padding)} ${alignClass(style.align, 'center')}`}
      style={{ borderColor: `${accent}33`, ...boxAppearanceStyle(style), backgroundColor: style.bg_type === 'gradient' ? undefined : (style.bg_color || `${accent}1a`) }}
    >
      <Heading tag={c.headline_tag} fontFamily={style.font_family || headingFont} className={`font-black ${HEADLINE_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-white' : 'text-slate-900') : ''}`}>
        <InlineText value={c.headline || ''} onCommit={(v) => set({ headline: v })} editable={editable} placeholder="Ready to get started?" />
      </Heading>
      <div className={`${BODY_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-slate-300' : 'text-slate-600') : ''}`}>
        <RichTextEditor value={c.subheadline || ''} onChange={(v) => set({ subheadline: v })} editable={editable} placeholder="Optional supporting line" />
      </div>
      <a href={c.button_link || '#'} onClick={(e) => editable && e.preventDefault()} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-black uppercase tracking-wider text-sm transition hover:opacity-90 self-center" style={{ backgroundColor: accent, color: accentText }}>
        {(!c.button_icon_position || c.button_icon_position === 'left') && <ButtonIcon name={c.button_icon} />}
        <InlineText value={c.button_text || ''} onCommit={(v) => set({ button_text: v })} editable={editable} placeholder="Contact Us" />
        {c.button_icon_position === 'right' && <ButtonIcon name={c.button_icon} />}
      </a>
    </section>
  );
}

function TestimonialView({ block, dark, accent, editable, onContentChange, device }: SiteBlockViewProps) {
  const c = useContent<TestimonialBlockContent>(block);
  const rawStyle = parseJson<BlockStyle>(block.style, {});
  const style = resolveDeviceStyle(rawStyle, device || 'desktop');
  const set = (patch: Partial<TestimonialBlockContent>) => onContentChange?.({ ...c, ...patch });
  return (
    <section
      className={`rounded-2xl space-y-3 border w-full h-full flex flex-col justify-center ${paddingClass(style.padding)} ${dark ? 'bg-[#13141a]/80 border-border-theme' : 'bg-white border-slate-200'}`}
      style={boxAppearanceStyle(style)}
    >
      <Quote className="w-6 h-6" style={{ color: accent }} />
      <div className={`italic leading-relaxed text-sm ${!style.text_color ? (dark ? 'text-slate-200' : 'text-slate-700') : ''}`}>
        <RichTextEditor value={c.quote || ''} onChange={(v) => set({ quote: v })} editable={editable} placeholder="Write the testimonial..." />
      </div>
      <div className="flex items-center gap-3">
        {c.photo_url && <img src={c.photo_url} alt={c.author || ''} className="w-10 h-10 rounded-full object-cover" style={{ opacity: getOpacity(block, 'photo_url') }} />}
        <div>
          <div className={`text-sm font-bold ${!style.text_color ? (dark ? 'text-white' : 'text-slate-900') : ''}`}>
            <InlineText value={c.author || ''} onCommit={(v) => set({ author: v })} editable={editable} placeholder="Author name" />
          </div>
          <div className="text-xs text-slate-500">
            <InlineText value={c.role || ''} onCommit={(v) => set({ role: v })} editable={editable} placeholder="Role / Company" />
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingView({ block, dark, accent, headingFont, editable, onContentChange, device }: SiteBlockViewProps) {
  const c = useContent<PricingBlockContent>(block);
  const rawStyle = parseJson<BlockStyle>(block.style, {});
  const style = resolveDeviceStyle(rawStyle, device || 'desktop');
  const tiers = c.tiers || [];
  const set = (patch: Partial<PricingBlockContent>) => onContentChange?.({ ...c, ...patch });
  const updateTier = (i: number, patch: any) => set({ tiers: tiers.map((t, idx) => idx === i ? { ...t, ...patch } : t) });
  if (tiers.length === 0 && !editable) return null;
  return (
    <section className={`space-y-5 w-full h-full ${paddingClass(style.padding)}`} style={boxAppearanceStyle(style)}>
      <Heading tag={c.headline_tag} fontFamily={style.font_family || headingFont} className={`font-black text-center ${HEADLINE_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-white' : 'text-slate-900') : ''}`}>
        <InlineText value={c.headline || ''} onCommit={(v) => set({ headline: v })} editable={editable} placeholder="Plans & Pricing" />
      </Heading>
      <div className={`grid gap-4 ${tiers.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : tiers.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {tiers.map((tier, i) => (
          <div key={i} className={`rounded-2xl p-6 space-y-4 border-2 ${!tier.highlighted ? (dark ? 'border-border-theme bg-[#13141a]/60' : 'border-slate-200 bg-white') : ''}`} style={tier.highlighted ? { borderColor: accent, backgroundColor: `${accent}1a` } : undefined}>
            <div>
              <div className={`text-sm font-bold uppercase tracking-wider ${!style.text_color ? (dark ? 'text-slate-300' : 'text-slate-600') : ''}`}>
                <InlineText value={tier.name || ''} onCommit={(v) => updateTier(i, { name: v })} editable={editable} placeholder="Plan name" />
              </div>
              <div className={`text-3xl font-black mt-1 ${!style.text_color ? (dark ? 'text-white' : 'text-slate-900') : ''}`}>
                <InlineText value={tier.price || ''} onCommit={(v) => updateTier(i, { price: v })} editable={editable} placeholder="$0" />
              </div>
            </div>
            {(tier.features || []).length > 0 && (
              <ul className="space-y-1.5">
                {tier.features!.map((f, fi) => (
                  <li key={fi} className={`flex items-start gap-2 text-xs ${!style.text_color ? (dark ? 'text-slate-300' : 'text-slate-600') : ''}`}>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: accent }} /> {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function FaqView({ block, dark, accent, headingFont, editable, onContentChange, device }: SiteBlockViewProps) {
  const c = useContent<FaqBlockContent>(block);
  const rawStyle = parseJson<BlockStyle>(block.style, {});
  const style = resolveDeviceStyle(rawStyle, device || 'desktop');
  const items = c.items || [];
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const set = (patch: Partial<FaqBlockContent>) => onContentChange?.({ ...c, ...patch });
  const updateItem = (i: number, patch: any) => set({ items: items.map((it, idx) => idx === i ? { ...it, ...patch } : it) });
  if (items.length === 0 && !editable) return null;
  return (
    <section className={`space-y-3 w-full h-full ${paddingClass(style.padding)}`} style={boxAppearanceStyle(style)}>
      <Heading tag={c.headline_tag} fontFamily={style.font_family || headingFont} className={`font-black text-center mb-2 ${HEADLINE_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-white' : 'text-slate-900') : ''}`}>
        <InlineText value={c.headline || ''} onCommit={(v) => set({ headline: v })} editable={editable} placeholder="Frequently Asked Questions" />
      </Heading>
      <div className="space-y-2">
        {items.map((item, i) => {
          const isOpen = openIdx === i;
          return (
            <div key={i} className={`rounded-xl border overflow-hidden ${dark ? 'border-border-theme bg-[#13141a]/60' : 'border-slate-200 bg-white'}`}>
              <button onClick={() => setOpenIdx(isOpen ? null : i)} className="w-full flex items-center justify-between gap-3 p-4 text-left cursor-pointer">
                <div className={`text-sm font-bold ${!style.text_color ? (dark ? 'text-white' : 'text-slate-900') : ''}`}>
                  <InlineText value={item.question || ''} onCommit={(v) => updateItem(i, { question: v })} editable={editable} placeholder="Question" />
                </div>
                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: isOpen ? accent : undefined }} />
              </button>
              {isOpen && (
                <div className={`px-4 pb-4 text-sm leading-relaxed ${!style.text_color ? (dark ? 'text-slate-300' : 'text-slate-600') : ''}`}>
                  <RichTextEditor value={item.answer || ''} onChange={(v) => updateItem(i, { answer: v })} editable={editable} placeholder="Answer" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SpacerView() {
  return <div className="w-full h-full" />;
}

const EMPTY_MSG_FORM: Record<string, any> = { name: '', email: '', message: '', company_website: '' };

function ContactFormView({ block, dark, accent, headingFont, subdomain, editable, onContentChange, device }: SiteBlockViewProps) {
  const c = useContent<ContactFormBlockContent>(block);
  const rawStyle = parseJson<BlockStyle>(block.style, {});
  const style = resolveDeviceStyle(rawStyle, device || 'desktop');
  const accentText = getContrastText(accent);
  const set = (patch: Partial<ContactFormBlockContent>) => onContentChange?.({ ...c, ...patch });
  const customFields = c.fields || [];

  const [form, setForm] = useState<Record<string, any>>({ ...EMPTY_MSG_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editable) return;
    if (customFields.length === 0 && !form.message.trim()) {
      setError('Please enter a message.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (customFields.length > 0) {
        const extra: Record<string, any> = {};
        customFields.forEach(f => { extra[f.id] = form[f.id] ?? ''; });
        await api.submitSiteMessage(subdomain, { name: '', email: '', message: '', extra_fields: extra, company_website: form.company_website });
      } else {
        await api.submitSiteMessage(subdomain, form as any);
      }
      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setError('Something went wrong sending your message — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section className="w-full h-full flex items-center justify-center">
        <div className="rounded-2xl p-8 text-center space-y-2 bg-emerald-950/20 border border-emerald-500/20 w-full">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Thanks — your message was sent!</p>
        </div>
      </section>
    );
  }

  const inputClass = dark
    ? 'w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none'
    : 'w-full rounded-lg bg-white border border-slate-300 focus:border-amber-500 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none';

  return (
    <section className={`rounded-2xl space-y-3 border w-full h-full ${paddingClass(style.padding)} ${dark ? 'bg-[#13141a]/80 border-border-theme' : 'bg-white border-slate-200'}`} style={boxAppearanceStyle(style)}>
      <Heading tag={c.headline_tag} fontFamily={style.font_family || headingFont} className={`font-black text-center ${HEADLINE_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-white' : 'text-slate-900') : ''}`}>
        <InlineText value={c.headline || ''} onCommit={(v) => set({ headline: v })} editable={editable} placeholder="Get In Touch" />
      </Heading>
      <div className={`text-center ${BODY_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-slate-300' : 'text-slate-600') : ''}`}>
        <RichTextEditor value={c.subheadline || ''} onChange={(v) => set({ subheadline: v })} editable={editable} placeholder="Optional supporting line" />
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        {customFields.length > 0 ? (
          customFields.map(f => (
            <div key={f.id}>
              {f.type === 'textarea' ? (
                <textarea value={form[f.id] || ''} onChange={(e) => setForm(p => ({ ...p, [f.id]: e.target.value }))} placeholder={f.label} rows={3} className={inputClass} required={f.required} disabled={editable} />
              ) : f.type === 'dropdown' ? (
                <select value={form[f.id] || ''} onChange={(e) => setForm(p => ({ ...p, [f.id]: e.target.value }))} className={inputClass} required={f.required} disabled={editable}>
                  <option value="">{f.label}</option>
                  {(f.options || []).map((opt, oi) => <option key={oi} value={opt}>{opt}</option>)}
                </select>
              ) : f.type === 'checkbox' ? (
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={!!form[f.id]} onChange={(e) => setForm(p => ({ ...p, [f.id]: e.target.checked }))} className="w-4 h-4" disabled={editable} />
                  {f.label}
                </label>
              ) : (
                <input type={f.type} value={form[f.id] || ''} onChange={(e) => setForm(p => ({ ...p, [f.id]: e.target.value }))} placeholder={f.label} className={inputClass} required={f.required} disabled={editable} />
              )}
            </div>
          ))
        ) : (
          <>
            <input type="text" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name" className={inputClass} disabled={editable} />
            <input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Your email" className={inputClass} disabled={editable} />
            <textarea value={form.message} onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Your message" rows={3} className={inputClass} disabled={editable} />
          </>
        )}
        <input type="text" value={form.company_website} onChange={(e) => setForm(p => ({ ...p, company_website: e.target.value }))} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 0, height: 0, opacity: 0 }} />
        {error && <p className="text-xs text-rose-400 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {error}</p>}
        <button type="submit" disabled={submitting || editable} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-black uppercase tracking-wider text-sm transition hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: accent, color: accentText }}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <InlineText value={c.button_text || ''} onCommit={(v) => set({ button_text: v })} editable={editable} placeholder="Send Message" />
        </button>
      </form>
    </section>
  );
}

export default function SiteBlockView(props: SiteBlockViewProps) {
  switch (props.block.block_type) {
    case 'hero': return <HeroView {...props} />;
    case 'text': return <TextView {...props} />;
    case 'image': return <ImageView {...props} />;
    case 'video': return <VideoView {...props} />;
    case 'cta': return <CtaView {...props} />;
    case 'contact_form': return <ContactFormView {...props} />;
    case 'testimonial': return <TestimonialView {...props} />;
    case 'pricing': return <PricingView {...props} />;
    case 'faq': return <FaqView {...props} />;
    case 'spacer': return <SpacerView {...props} />;
    default: return null;
  }
}
