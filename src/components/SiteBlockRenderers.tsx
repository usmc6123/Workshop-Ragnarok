import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import {
  SiteBlock, BlockStyle, HeadingTag, DeviceBreakpoint,
  HeroBlockContent, TextBlockContent, ImageBlockContent, VideoBlockContent, CtaBlockContent,
  ContactFormBlockContent, TestimonialBlockContent, PricingBlockContent, FaqBlockContent,
  AiChatBotBlockContent, FunnelBlockContent, Funnel, BlockOverlayItem,
} from '../types';
import { getSiteIcon } from '../constants/siteIcons';
import RichTextEditor from './RichTextEditor';
import {
  Loader2, AlertTriangle, CheckCircle2, ArrowRight, Quote, Send, ChevronDown,
  ChevronLeft, ChevronRight, Bot, Filter, X, RotateCw, Plus, Trash2,
} from 'lucide-react';
import BotThreeCanvas from './BotThreeCanvas';
import { PERSONAS_20, ChatBotConfig } from './AiChatBotView';

function getBotConfig(botId?: string): ChatBotConfig {
  const defaultBot = PERSONAS_20.find(p => p.id === 'cooper-patrol-cat') || PERSONAS_20[0];
  if (!botId) return defaultBot;
  try {
    const saved = localStorage.getItem('ragnarok_custom_chat_bots');
    const customList: ChatBotConfig[] = saved ? JSON.parse(saved) : [];
    const found = customList.find(b => b.id === botId) || PERSONAS_20.find(p => p.id === botId);
    return found || defaultBot;
  } catch {
    return PERSONAS_20.find(p => p.id === botId) || defaultBot;
  }
}

function getSimulatedReply(userText: string, bot: ChatBotConfig): string {
  const lower = userText.toLowerCase();
  const docs = bot.uploaded_docs || '';
  const theme = bot.character_theme || 'mascot_cat';
  const primaryCta = bot.primary_cta || 'https://ragnarok.work/book';
  
  const hasPrice = lower.includes('price') || lower.includes('cost') || lower.includes('how much') || lower.includes('pricing') || lower.includes('fee') || lower.includes('rate');
  const hasLocation = lower.includes('where') || lower.includes('location') || lower.includes('address') || lower.includes('hours') || lower.includes('open');
  const hasBooking = lower.includes('book') || lower.includes('appointment') || lower.includes('schedule') || lower.includes('reserve') || lower.includes('slot') || lower.includes('tour') || lower.includes('ticket');
  const hasAI = lower.includes('ai') || lower.includes('robot') || lower.includes('bot') || lower.includes('computer');

  let docSnippet = '';
  if (docs && docs.trim()) {
    const lines = docs.split('\n');
    const words = lower.split(/\s+/).filter(w => w.length > 3);
    let bestLine = '';
    let maxMatches = 0;
    for (const l of lines) {
      if (!l.trim()) continue;
      let matches = 0;
      for (const w of words) {
        if (l.toLowerCase().includes(w)) {
          matches++;
        }
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestLine = l;
      }
    }
    if (maxMatches > 0) {
      docSnippet = bestLine.trim();
    }
  }

  if (docSnippet) {
    if (theme === 'mascot_cat') {
      return `Meow! 🐾 Found this in our files: "${docSnippet}"! Purr-fect! Let's get you set up at ${primaryCta}! ⚡`;
    } else if (theme === 'professional') {
      return `Regarding your inquiry, our record database indicates: "${docSnippet}". If you need further assistance, please visit ${primaryCta}.`;
    } else if (theme === 'minimalist_tech') {
      return `DATABASE HIT: "${docSnippet}". ROUTING PACKETS: Initialize schedule terminal at ${primaryCta}.`;
    } else {
      return `According to our uploaded knowledge base: "${docSnippet}". If you need details, go here: ${primaryCta}`;
    }
  } else if (theme === 'mascot_cat') {
    if (hasAI) {
      return `Meow! 🐾 I am Cooper's clone! I don't know what AI chips you're talking about, but my laser sensors are fully focused! ⚡`;
    } else if (hasPrice) {
      return `Vaporizing prices! 🐾 Tunings are $90, flushes are $110, and suspension rebuilds start at $180! Super cat-speed! ⚡`;
    } else if (hasLocation) {
      return `Find us patrolling at 123 Resistance Way, Pasadena! We're active Monday to Saturday from 8AM to 6PM! 🐾`;
    } else if (hasBooking) {
      return `Purr-fect! Let's lock in your coordinates. Click this link right now to claim your booking slot: ${primaryCta}! 🐾⚡`;
    } else {
      return `Meow! 🐾 That sounds awesome, but my laser pointers are targeting your next booking coordinates! Let's get you on the schedule! ⚡`;
    }
  } else if (theme === 'professional') {
    if (hasPrice) {
      return `Our pricing is structured transparently: tune-ups are $90, diagnostic services are $49, and complete services depend on your vehicle. Please see details at ${primaryCta}.`;
    } else if (hasLocation) {
      return `We are located at 123 Resistance Way, Pasadena, CA. Our operating hours are Monday through Saturday, 8:00 AM to 6:00 PM.`;
    } else if (hasBooking) {
      return `I would be pleased to secure an appointment for you. Please complete your registration via our system coordinate at ${primaryCta}.`;
    } else {
      return `I appreciate your inquiry. For detailed specifications or to schedule personal care, please consult our main interface at ${primaryCta}.`;
    }
  } else if (theme === 'minimalist_tech') {
    if (hasPrice) {
      return `PRICING METADATA: Standard diagnostics: $49. Base service package starts at $90. Check terminal at ${primaryCta} for details.`;
    } else if (hasLocation) {
      return `GEO COORDINATES: 123 Resistance Way, Pasadena, CA. UPTIME: Mon-Sat 0800-1800 PST.`;
    } else if (hasBooking) {
      return `PROPOSAL: Secure queue slot at: ${primaryCta}. Action recommended.`;
    } else {
      return `ACKNOWLEDGEMENT. Packet received. To execute actions or configure bookings, interface directly with ${primaryCta}.`;
    }
  } else {
    // Custom theme rules or fallback
    return `Hello! Thanks for reaching out. Please feel free to check out our booking page at ${primaryCta} for any appointments or pricing!`;
  }
}

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

// Per-media "Zoom & Position" (right-click a block on the canvas). `zoom` is
// clamped 1-4, `x`/`y` are percentage offsets — see MediaTransform in
// types.ts for the full contract this reads.
export function getMediaTransform(block: SiteBlock, key: string): { zoom: number; x: number; y: number; rotate?: number } {
  try {
    const map = block.media_transform ? JSON.parse(block.media_transform) : {};
    const t = map?.[key];
    const zoom = typeof t?.zoom === 'number' ? Math.max(1, Math.min(4, t.zoom)) : 1;
    const x = typeof t?.x === 'number' ? t.x : 0;
    const y = typeof t?.y === 'number' ? t.y : 0;
    const rotate = typeof t?.rotate === 'number' ? t.rotate : 0;
    return { zoom, x, y, rotate };
  } catch {
    return { zoom: 1, x: 0, y: 0, rotate: 0 };
  }
}

// CSS for the above — a no-op object when nothing's been adjusted, so this is
// safe to spread onto any media element unconditionally.
export function mediaTransformStyle(t: { zoom: number; x: number; y: number; rotate?: number }): React.CSSProperties {
  const rot = t.rotate || 0;
  if (t.zoom === 1 && t.x === 0 && t.y === 0 && rot === 0) return {};
  return { transform: `translate(${t.x}%, ${t.y}%) scale(${t.zoom}) rotate(${rot}deg)` };
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
// `mediaKey` is stamped on as data-media-key so the builder canvas's
// right-click "Zoom & Position" can figure out which media field was
// targeted; `transform` applies whatever zoom/pan was set for that key.
function VideoEmbed({ url, autoplay, controls, opacity, objectFit, transform, mediaKey }: { url: string; autoplay?: boolean; controls?: boolean; opacity: number; objectFit?: 'cover' | 'contain'; transform: { zoom: number; x: number; y: number }; mediaKey: string }) {
  const parsed = parseVideoEmbed(url);
  if (parsed.type === 'direct') {
    return (
      <div className="w-full h-full rounded-xl overflow-hidden">
        <video
          data-media-key={mediaKey}
          src={url} autoPlay={!!autoplay} muted={!!autoplay} controls={controls !== false} loop={!!autoplay} playsInline
          className="w-full h-full" style={{ opacity, objectFit: objectFit || 'cover', ...mediaTransformStyle(transform) }}
        />
      </div>
    );
  }
  const src = parsed.type === 'youtube'
    ? `https://www.youtube.com/embed/${parsed.id}?${autoplay ? 'autoplay=1&mute=1&' : ''}${controls === false ? 'controls=0&' : ''}rel=0`
    : `https://player.vimeo.com/video/${parsed.id}?${autoplay ? 'autoplay=1&muted=1&' : ''}`;
  return (
    <div className="w-full h-full rounded-xl overflow-hidden" style={{ opacity }}>
      <iframe data-media-key={mediaKey} src={src} className="w-full h-full" style={{ border: 0, ...mediaTransformStyle(transform) }} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title="Embedded video" />
    </div>
  );
}

// A "video as background" version — used behind the Hero block. Direct MP4s
// use a real <video>; YouTube/Vimeo use the classic oversized-iframe trick
// (no official API for a true cover-fit background embed). The zoom/pan
// transform is applied on top of that existing 300%-oversize-plus-center
// trick for the iframe case — it just zooms/pans further from there.
function VideoBackground({ url, opacity, transform, mediaKey }: { url: string; opacity: number; transform: { zoom: number; x: number; y: number }; mediaKey: string }) {
  const parsed = parseVideoEmbed(url);
  if (parsed.type === 'direct') {
    return <video data-media-key={mediaKey} src={url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" style={{ opacity, ...mediaTransformStyle(transform) }} />;
  }
  const src = parsed.type === 'youtube'
    ? `https://www.youtube.com/embed/${parsed.id}?autoplay=1&mute=1&loop=1&playlist=${parsed.id}&controls=0&rel=0`
    : `https://player.vimeo.com/video/${parsed.id}?autoplay=1&muted=1&loop=1&background=1`;
  return (
    <div data-media-key={mediaKey} className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity, ...mediaTransformStyle(transform) }}>
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
      {c.video_url && <VideoBackground url={c.video_url} opacity={getOpacity(block, 'video_url')} transform={getMediaTransform(block, 'video_url')} mediaKey="video_url" />}
      {c.image_url && !c.video_url && (
        <img
          data-media-key="image_url"
          src={c.image_url}
          alt={c.image_alt || c.headline || ''}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: c.object_fit === 'contain' ? 'contain' : 'cover', opacity: getOpacity(block, 'image_url'), ...mediaTransformStyle(getMediaTransform(block, 'image_url')) }}
        />
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
          <img
            key={i}
            data-media-key={`gallery_${i}`}
            src={img.url}
            alt={img.alt || img.caption || ''}
            className="absolute inset-0 w-full h-full transition-opacity duration-500"
            style={{ opacity: (i === idx ? 1 : 0) * getOpacity(block, `gallery_${i}`), objectFit: c.object_fit || 'cover', ...mediaTransformStyle(getMediaTransform(block, `gallery_${i}`)) }}
          />
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
            {img.url && (
              <img
                data-media-key={`gallery_${i}`}
                src={img.url}
                alt={img.alt || img.caption || ''}
                className="w-full h-full"
                style={{ objectFit: c.object_fit || 'cover', opacity: getOpacity(block, `gallery_${i}`), ...mediaTransformStyle(getMediaTransform(block, `gallery_${i}`)) }}
              />
            )}
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
      <VideoEmbed url={c.video_url} autoplay={c.autoplay} controls={c.controls} opacity={getOpacity(block, 'video_url')} objectFit={c.object_fit} transform={getMediaTransform(block, 'video_url')} mediaKey="video_url" />
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
        {c.photo_url && (
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
            <img
              data-media-key="photo_url"
              src={c.photo_url}
              alt={c.author || ''}
              className="w-full h-full object-cover"
              style={{ opacity: getOpacity(block, 'photo_url'), ...mediaTransformStyle(getMediaTransform(block, 'photo_url')) }}
            />
          </div>
        )}
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

function AiChatBotBlockView({ block, dark, accent, headingFont, editable, onContentChange, device }: SiteBlockViewProps) {
  const c = useContent<AiChatBotBlockContent>(block);
  const rawStyle = parseJson<BlockStyle>(block.style, {});
  const style = resolveDeviceStyle(rawStyle, device || 'desktop');
  const set = (patch: Partial<AiChatBotBlockContent>) => onContentChange?.({ ...c, ...patch });

  const botConfig = React.useMemo(() => getBotConfig(c.bot_id), [c.bot_id]);
  const ui = botConfig.ui_configuration;

  const [chatMessages, setChatMessages] = useState<{ sender: 'bot' | 'user'; text: string; time: string }[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setChatMessages([
      {
        sender: 'bot',
        text: ui.welcome_message || 'Hello! How can I assist you today?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [botConfig, ui.welcome_message]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isTyping) return;
    const text = userInput.trim();
    setUserInput('');
    setChatMessages(prev => [...prev, {
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setIsTyping(true);

    setTimeout(() => {
      const reply = getSimulatedReply(text, botConfig);
      setChatMessages(prev => [...prev, {
        sender: 'bot',
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setIsTyping(false);
    }, 1000);
  };

  const is3D = ui.bot_style === '3d_animated';

  const chatBgStyle: React.CSSProperties = {};

  const backdropOpacity = (ui.chat_bg_opacity ?? 100) / 100;

  return (
    <section className={`w-full h-full rounded-2xl border flex flex-col overflow-hidden ${paddingClass(style.padding)} ${dark ? 'bg-[#13141a]/80 border-border-theme' : 'bg-white border-slate-200'}`} style={boxAppearanceStyle(style)}>
      <div className="mb-4">
        <Heading tag={c.headline_tag} fontFamily={style.font_family || headingFont} className={`font-black ${HEADLINE_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-white' : 'text-slate-900') : ''}`}>
          <InlineText value={c.headline || ''} onCommit={(v) => set({ headline: v })} editable={editable} placeholder="Chat with our Assistant" />
        </Heading>
        <div className={`mt-1 text-xs opacity-75 ${!style.text_color ? (dark ? 'text-slate-300' : 'text-slate-600') : ''}`}>
          <RichTextEditor value={c.subheadline || ''} onChange={(v) => set({ subheadline: v })} editable={editable} placeholder="Select a customized or premade chatbot" />
        </div>
      </div>

      <div className={`grid grid-cols-1 ${is3D ? 'lg:grid-cols-12' : ''} gap-4 flex-1 min-h-[350px]`}>
        {is3D && (
          <div className="lg:col-span-5 relative rounded-xl overflow-hidden min-h-[220px] bg-[#0c0d12] flex flex-col items-center justify-center">
            {ui.three_bg_type === 'image' && ui.three_bg_val && (
              <img src={ui.three_bg_val} className="absolute inset-0 w-full h-full object-cover" style={{ opacity: (ui.three_bg_opacity ?? 100) / 100 }} alt="Backdrop" />
            )}
            {ui.three_bg_type === 'video' && ui.three_bg_val && (
              <video src={ui.three_bg_val} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" style={{ opacity: (ui.three_bg_opacity ?? 100) / 100 }} />
            )}
            <div className="absolute inset-0 z-10 w-full h-full">
              <BotThreeCanvas
                primaryColor={ui.primary_color || '#a855f7'}
                secondaryColor={ui.secondary_color || '#1e1b4b'}
                preset={ui.three_preset || 'quantum'}
                isTalking={isTyping}
                speed={ui.three_speed}
                wireframe={ui.three_wireframe}
                particleCount={ui.three_particles}
                customModelUrl={ui.three_file}
                bgColor={ui.three_bg_type === 'color' ? ui.three_bg_val : undefined}
                bgType={ui.three_bg_type}
                bgVal={ui.three_bg_val}
                bgOpacity={ui.three_bg_opacity}
                modelScale={ui.three_model_scale}
              />
            </div>
            <div className="absolute bottom-2 left-2 z-20 px-2 py-0.5 rounded text-[10px] bg-black/60 text-teal-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              <span>3D MODEL COMPANION</span>
            </div>
          </div>
        )}

        <div className={`${is3D ? 'lg:col-span-7' : 'w-full'} flex flex-col bg-slate-900/40 rounded-xl overflow-hidden border border-slate-800/60`}>
          <div className="bg-slate-950/80 p-3 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center overflow-hidden">
                {ui.avatar_image ? (
                  <img src={ui.avatar_image} alt={botConfig.bot_profile.name} className="w-full h-full object-cover" />
                ) : (
                  <Bot className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100">{botConfig.bot_profile.name}</h4>
                <p className="text-[9px] text-teal-400 font-mono tracking-wider">ONLINE // READY</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[9px] bg-slate-900 text-slate-400 uppercase font-mono border border-slate-800">
              {ui.bot_style === 'visual_media' ? 'Visual media' : ui.bot_style === 'classic' ? 'Classic' : ui.bot_style === 'bubble_popup' ? 'Bubble Popup' : '3D Companion'}
            </span>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 max-h-[250px] relative">
            {/* Backdrop Color Layer with True Transparency */}
            {ui.chat_bg_type === 'color' && ui.chat_bg_val && (
              <div 
                className="absolute inset-0 z-0 pointer-events-none" 
                style={{ backgroundColor: ui.chat_bg_val, opacity: backdropOpacity }}
              />
            )}
            {/* Backdrop Image Layer with True Transparency */}
            {ui.chat_bg_type === 'image' && ui.chat_bg_val && (
              <img
                src={ui.chat_bg_val}
                alt=""
                className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
                style={{ opacity: backdropOpacity }}
              />
            )}
            {/* Backdrop Video Layer with True Transparency */}
            {ui.chat_bg_type === 'video' && ui.chat_bg_val && (
              <video
                src={ui.chat_bg_val}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
                style={{ opacity: backdropOpacity }}
              />
            )}
            <div className="relative z-10 space-y-2.5">
              {chatMessages.map((msg, i) => {
                const isBot = msg.sender === 'bot';
                return (
                  <div key={i} className={`flex ${isBot ? 'justify-start' : 'justify-end'} items-end gap-2`}>
                    {isBot && (
                      <div className="w-6 h-6 rounded-full bg-slate-800 shrink-0 overflow-hidden border border-slate-700">
                        <img src={ui.avatar_image || '/cooper-logo.png'} className="w-full h-full object-cover" onError={(e) => { (e.target as any).src = '/cooper-logo.png' }} alt="" />
                      </div>
                    )}
                    <div className={`max-w-[75%] p-2.5 rounded-xl text-xs leading-relaxed ${
                      isBot 
                        ? 'bg-slate-800/90 text-slate-100 rounded-bl-none border border-slate-700/50' 
                        : 'bg-amber-500 text-slate-950 rounded-br-none font-bold'
                    }`}>
                      <p>{msg.text}</p>
                      <span className={`block text-[8px] mt-1 text-right ${isBot ? 'text-slate-500' : 'text-slate-850'}`}>{msg.time}</span>
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex justify-start items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-800 shrink-0 overflow-hidden border border-slate-700">
                    <img src={ui.avatar_image || '/cooper-logo.png'} className="w-full h-full object-cover" onError={(e) => { (e.target as any).src = '/cooper-logo.png' }} alt="" />
                  </div>
                  <div className="bg-slate-800/90 border border-slate-700/50 px-3 py-2 rounded-xl rounded-bl-none text-slate-400 text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSend} className="bg-slate-950/80 p-2 border-t border-slate-800/80 flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Ask us anything..."
              disabled={editable}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={editable || !userInput.trim() || isTyping}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold transition hover:bg-amber-400 active:scale-95 disabled:opacity-50 flex items-center justify-center cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function FunnelBlockView({ block, dark, accent, headingFont, editable, onContentChange, device }: SiteBlockViewProps) {
  const c = useContent<FunnelBlockContent>(block);
  const rawStyle = parseJson<BlockStyle>(block.style, {});
  const style = resolveDeviceStyle(rawStyle, device || 'desktop');
  const set = (patch: Partial<FunnelBlockContent>) => onContentChange?.({ ...c, ...patch });

  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);

  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formMake, setFormMake] = useState('');
  const [formModel, setFormModel] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFunnels = async () => {
      try {
        const list = await api.getFunnels();
        setFunnels(list);
        if (c.funnel_id) {
          const found = list.find(f => f.id === c.funnel_id);
          setSelectedFunnel(found || null);
        } else if (list.length > 0) {
          setSelectedFunnel(list[0]);
        }
      } catch (err) {
        console.error('Error loading funnels for block:', err);
      }
    };
    fetchFunnels();
  }, [c.funnel_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editable) return;
    if (!selectedFunnel) {
      setError('No funnel is configured for this block.');
      return;
    }
    if (!formName.trim() || !formPhone.trim() || !formEmail.trim()) {
      setError('Please fill in Name, Phone, and Email.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.submitFunnelLead(selectedFunnel.slug, {
        name: formName,
        phone: formPhone,
        email: formEmail,
        message: formMessage,
        vehicle_year: formYear,
        vehicle_make: formMake,
        vehicle_model: formModel,
        company_website: honeypot
      });
      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const accentText = getContrastText(accent);

  if (!selectedFunnel) {
    return (
      <div className="w-full p-8 text-center text-xs text-slate-500 border border-dashed border-slate-700/50 rounded-xl">
        {editable ? 'No funnel configured yet — click here to select one in the block settings.' : 'Lead capture funnel coming soon!'}
      </div>
    );
  }

  const f = selectedFunnel;
  const inputClass = dark
    ? 'w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none'
    : 'w-full rounded-lg bg-white border border-slate-300 focus:border-amber-500 px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none';

  return (
    <section className={`rounded-2xl border w-full h-full flex flex-col justify-center overflow-hidden ${paddingClass(style.padding)} ${dark ? 'bg-[#13141a]/80 border-border-theme' : 'bg-white border-slate-200'}`} style={boxAppearanceStyle(style)}>
      <div className={`space-y-4 ${alignClass(style.align, 'center')}`}>
        <Heading tag={c.headline_tag} fontFamily={style.font_family || headingFont} className={`font-black tracking-tight ${HEADLINE_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-white' : 'text-slate-900') : ''}`}>
          <InlineText value={c.headline || f.headline || ''} onCommit={(v) => set({ headline: v })} editable={editable} placeholder="Funnel Title" />
        </Heading>
        <div className={`text-xs opacity-80 ${!style.text_color ? (dark ? 'text-slate-300' : 'text-slate-600') : ''}`}>
          <RichTextEditor value={c.subheadline || f.subheadline || ''} onChange={(v) => set({ subheadline: v })} editable={editable} placeholder="Short sub-headline" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-center">
        <div className="lg:col-span-5 space-y-4">
          {(f.video_url || f.hero_video_url) ? (
            <div className="rounded-xl overflow-hidden aspect-video bg-black/25 border border-slate-800">
              <iframe src={f.video_url || f.hero_video_url || ''} className="w-full h-full" style={{ border: 0 }} allow="autoplay; fullscreen" allowFullScreen title="Funnel video" />
            </div>
          ) : f.image_url ? (
            <div className="rounded-xl overflow-hidden aspect-video bg-black/25 border border-slate-800">
              <img src={f.image_url} alt="Promo" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="rounded-xl aspect-video bg-slate-900/50 border border-slate-800 flex items-center justify-center p-4">
              <Filter className="w-12 h-12 text-slate-600" />
            </div>
          )}

          {f.body && (
            <div className={`text-xs leading-relaxed opacity-75 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
              <p>{f.body}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 bg-slate-950/20 p-4 rounded-xl border border-slate-800/40">
          {submitted ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className={`text-sm font-black ${dark ? 'text-white' : 'text-slate-900'}`}>Your offer is locked in!</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">Thanks! We have logged your request. Our service team will reach out to you shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Your Name *" value={formName} onChange={e => setFormName(e.target.value)} className={inputClass} required disabled={editable} />
                <input type="tel" placeholder="Phone Number *" value={formPhone} onChange={e => setFormPhone(e.target.value)} className={inputClass} required disabled={editable} />
              </div>

              <input type="email" placeholder="Email Address *" value={formEmail} onChange={e => setFormEmail(e.target.value)} className={inputClass} required disabled={editable} />

              <div className="grid grid-cols-3 gap-2">
                <input type="text" placeholder="Year" value={formYear} onChange={e => setFormYear(e.target.value)} className={inputClass} disabled={editable} />
                <input type="text" placeholder="Make" value={formMake} onChange={e => setFormMake(e.target.value)} className={inputClass} disabled={editable} />
                <input type="text" placeholder="Model" value={formModel} onChange={e => setFormModel(e.target.value)} className={inputClass} disabled={editable} />
              </div>

              <textarea placeholder="Describe service required or general questions..." value={formMessage} onChange={e => setFormMessage(e.target.value)} rows={2} className={inputClass} disabled={editable} />

              <input type="text" value={honeypot} onChange={e => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 0, height: 0, opacity: 0 }} />

              {error && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {error}</p>}

              <button type="submit" disabled={submitting || editable} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-black uppercase tracking-wider text-xs transition hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: accent, color: accentText }}>
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{f.cta_text || 'Submit Lead'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

interface InteractiveOverlayItemProps {
  key?: string;
  element: BlockOverlayItem;
  editable: boolean;
  onUpdate: (patch: Partial<BlockOverlayItem>) => void;
  onDelete: () => void;
  accent: string;
}

function InteractiveOverlayItem({ element, editable, onUpdate, onDelete, accent }: InteractiveOverlayItemProps) {
  const [activeAction, setActiveAction] = useState<'move' | 'resize' | 'rotate' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{
    clientX: number;
    clientY: number;
    x: number;
    y: number;
    w: number;
    h: number;
    rotate: number;
    parentWidth: number;
    parentHeight: number;
  } | null>(null);

  const handlePointerDown = (e: React.PointerEvent, action: 'move' | 'resize' | 'rotate') => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    
    const parent = containerRef.current?.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    
    startRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      x: element.x,
      y: element.y,
      w: element.w,
      h: element.h,
      rotate: element.rotate || 0,
      parentWidth: parentRect.width,
      parentHeight: parentRect.height,
    };
    setActiveAction(action);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeAction || !startRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const start = startRef.current;
    const dx = e.clientX - start.clientX;
    const dy = e.clientY - start.clientY;

    if (activeAction === 'move') {
      const dxPercent = (dx / start.parentWidth) * 100;
      const dyPercent = (dy / start.parentHeight) * 100;
      onUpdate({
        x: Math.max(0, Math.min(100 - start.w, start.x + dxPercent)),
        y: Math.max(0, Math.min(100 - start.h, start.y + dyPercent)),
      });
    } else if (activeAction === 'resize') {
      const dwPercent = (dx / start.parentWidth) * 100;
      const dhPercent = (dy / start.parentHeight) * 100;
      onUpdate({
        w: Math.max(5, Math.min(100 - start.x, start.w + dwPercent)),
        h: Math.max(5, Math.min(100 - start.y, start.h + dhPercent)),
      });
    } else if (activeAction === 'rotate') {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        const startAngle = Math.atan2(start.clientY - centerY, start.clientX - centerX) * (180 / Math.PI);
        let nextRotate = start.rotate + (currentAngle - startAngle);
        if (nextRotate < 0) nextRotate += 360;
        onUpdate({ rotate: Math.round(nextRotate % 360) });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!activeAction) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
    setActiveAction(null);
    startRef.current = null;
  };

  const itemStyle: React.CSSProperties = {
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.w}%`,
    height: `${element.h}%`,
    transform: `rotate(${element.rotate || 0}deg)`,
    transformOrigin: 'center center',
  };

  return (
    <div
      ref={containerRef}
      style={itemStyle}
      className={`absolute group pointer-events-auto select-none ${editable ? 'hover:ring-2 hover:ring-amber-500/50' : ''}`}
    >
      {/* Element content */}
      <div className="w-full h-full relative overflow-hidden rounded">
        {element.type === 'text' ? (
          <div
            className={`w-full h-full p-2 outline-none flex items-center justify-center text-center break-words leading-snug font-bold text-white text-sm bg-black/45 backdrop-blur-sm rounded ${
              editable ? 'focus:ring-1 focus:ring-amber-500 cursor-text' : ''
            }`}
            contentEditable={editable}
            suppressContentEditableWarning
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={(e) => {
              onUpdate({ text: e.currentTarget.textContent || '' });
            }}
          >
            {element.text || ''}
          </div>
        ) : (
          <img
            src={element.image_url}
            alt=""
            className="w-full h-full object-cover pointer-events-none rounded"
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      {/* Editor overlay handles */}
      {editable && (
        <>
          {/* Drag border/handle */}
          <div
            onPointerDown={(e) => handlePointerDown(e, 'move')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="absolute inset-0 border border-dashed border-amber-500/40 cursor-move group-hover:border-amber-500 z-10"
          />

          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md z-30 cursor-pointer"
            title="Delete item"
          >
            <X className="w-3 h-3" />
          </button>

          {/* Resize handle (bottom-right) */}
          <div
            onPointerDown={(e) => handlePointerDown(e, 'resize')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="absolute bottom-[-4px] right-[-4px] w-3 h-3 bg-amber-500 border border-black rounded-sm cursor-se-resize opacity-0 group-hover:opacity-100 transition z-35"
            title="Drag to resize"
          />

          {/* Rotate handle (top-center, with a connector line) */}
          <div className="absolute top-[-20px] left-1/2 -translate-x-1/2 flex flex-col items-center opacity-0 group-hover:opacity-100 transition z-35">
            <div
              onPointerDown={(e) => handlePointerDown(e, 'rotate')}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="w-4 h-4 rounded-full bg-emerald-500 hover:bg-emerald-400 border border-black cursor-grab active:cursor-grabbing flex items-center justify-center shadow-sm"
              title="Drag to rotate"
            >
              <RotateCw className="w-2.5 h-2.5 text-white" />
            </div>
            <div className="w-0.5 h-1.5 bg-emerald-500" />
          </div>
        </>
      )}
    </div>
  );
}

export default function SiteBlockView(props: SiteBlockViewProps) {
  const contentObj = parseJson<any>(props.block.content, {});
  const customElements = contentObj.custom_elements || [];

  const renderBlock = () => {
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
      case 'ai_chat_bot': return <AiChatBotBlockView {...props} />;
      case 'funnel': return <FunnelBlockView {...props} />;
      default: return null;
    }
  };

  const handleUpdateElement = (id: string, patch: Partial<BlockOverlayItem>) => {
    const nextElements = customElements.map((el: any) => el.id === id ? { ...el, ...patch } : el);
    props.onContentChange?.({ ...contentObj, custom_elements: nextElements });
  };

  const handleDeleteElement = (id: string) => {
    const nextElements = customElements.filter((el: any) => el.id !== id);
    props.onContentChange?.({ ...contentObj, custom_elements: nextElements });
  };

  return (
    <div className="relative w-full h-full group/block">
      {renderBlock()}
      
      {/* Custom Overlay Elements */}
      {customElements.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden rounded-2xl">
          {customElements.map((el: BlockOverlayItem) => (
            <InteractiveOverlayItem
              key={el.id}
              element={el}
              editable={props.editable}
              accent={props.accent}
              onUpdate={(patch) => handleUpdateElement(el.id, patch)}
              onDelete={() => handleDeleteElement(el.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
