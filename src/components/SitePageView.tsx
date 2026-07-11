import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { PublicSite, SiteBlock, ThemeConfig, BlockStyle } from '../types';
import { ensureGoogleFontsLoaded, SITE_FONT_OPTIONS } from '../constants/siteFonts';
import {
  Loader2, AlertTriangle, CheckCircle2, ArrowRight, Quote, Send, ChevronDown,
} from 'lucide-react';

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

// Same convention as FunnelPageView's getMediaOpacity: reads the JSON opacity
// map stored per-block and returns a 0-1 CSS opacity value for a given media key.
function getOpacity(block: SiteBlock, key: string, defaultPercent: number = 100): number {
  try {
    const map = block.media_opacity ? JSON.parse(block.media_opacity) : {};
    const val = map?.[key];
    return (typeof val === 'number' && val >= 0 && val <= 100) ? val / 100 : defaultPercent / 100;
  } catch {
    return defaultPercent / 100;
  }
}

function parseContent<T>(block: SiteBlock): T {
  try { return JSON.parse(block.content || '{}') as T; } catch { return {} as T; }
}

// Picks readable text (near-black or near-white) for a given accent hex so
// buttons stay legible no matter which color the owner picks.
function getContrastText(hex: string | undefined): string {
  if (!hex) return '#0f172a';
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#0f172a';
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#0f172a' : '#ffffff';
}

// --- Style helpers shared by every block renderer -----------------------------

function widthClass(width?: BlockStyle['width']): string {
  if (width === 'narrow') return 'max-w-xl mx-auto';
  if (width === 'full') return 'w-full';
  return 'max-w-3xl mx-auto';
}
function paddingClass(padding?: BlockStyle['padding']): string {
  if (padding === 'sm') return 'py-4';
  if (padding === 'lg') return 'py-16';
  return 'py-8';
}
// CSS trick to let a "full width" block escape its centered parent container
// and span the entire viewport, regardless of how deep it's nested.
function fullBleedStyle(width?: BlockStyle['width']): React.CSSProperties {
  if (width !== 'full') return {};
  return { marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)', width: '100vw' };
}
function alignClass(align: BlockStyle['align'] | undefined, fallback: 'left' | 'center' | 'right' = 'left'): string {
  const a = align || fallback;
  if (a === 'center') return 'text-center mx-auto';
  if (a === 'right') return 'text-right ml-auto';
  return 'text-left';
}
const HEADLINE_SIZE: Record<string, string> = {
  sm: 'text-xl md:text-2xl', md: 'text-2xl md:text-4xl', lg: 'text-3xl md:text-5xl', xl: 'text-4xl md:text-6xl',
};
const BODY_SIZE: Record<string, string> = {
  sm: 'text-xs', md: 'text-sm', lg: 'text-base', xl: 'text-lg',
};
function overrideStyle(style: BlockStyle): React.CSSProperties {
  const s: React.CSSProperties = {};
  if (style.bg_color) s.backgroundColor = style.bg_color;
  if (style.text_color) s.color = style.text_color;
  if (style.font_family) s.fontFamily = style.font_family;
  return s;
}

interface BlockRenderProps {
  block: SiteBlock;
  dark: boolean;
  accent: string;
  subdomain: string;
}

// --- Individual block renderers, one per block_type ---------------------------

function HeroBlock({ block, dark, accent }: BlockRenderProps) {
  const c = parseContent<any>(block);
  const style = parseBlockStyle(block.style);
  const accentText = getContrastText(accent);
  return (
    <section className={`relative overflow-hidden rounded-2xl min-h-[420px] flex items-center px-6 ${paddingClass(style.padding)} ${widthClass(style.width)}`} style={{ ...fullBleedStyle(style.width), ...overrideStyle(style) }}>
      {c.video_url && (
        <video src={c.video_url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" style={{ opacity: getOpacity(block, 'video_url') }} />
      )}
      {c.image_url && !c.video_url && (
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${c.image_url})`, opacity: getOpacity(block, 'image_url') }} />
      )}
      <div className={`absolute inset-0 ${dark ? 'bg-gradient-to-b from-black/60 via-black/50 to-black/70' : 'bg-gradient-to-b from-white/50 via-white/40 to-white/60'}`} />
      <div className={`relative z-10 w-full max-w-2xl space-y-5 ${alignClass(style.align, 'center')}`}>
        {c.headline && <h1 className={`font-black tracking-tight ${HEADLINE_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-white' : 'text-slate-900') : ''}`}>{c.headline}</h1>}
        {c.subheadline && <p className={`${BODY_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-slate-300' : 'text-slate-600') : 'opacity-80'}`}>{c.subheadline}</p>}
        {c.cta_text && (
          <a href={c.cta_link || '#'} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-black uppercase tracking-wider text-sm transition hover:opacity-90" style={{ backgroundColor: accent, color: accentText }}>
            {c.cta_text} <ArrowRight className="w-4 h-4" />
          </a>
        )}
      </div>
    </section>
  );
}

function TextBlock({ block, dark }: BlockRenderProps) {
  const c = parseContent<any>(block);
  const style = parseBlockStyle(block.style);
  return (
    <section className={`${paddingClass(style.padding)} px-2 ${widthClass(style.width)}`} style={{ ...fullBleedStyle(style.width), ...overrideStyle(style) }}>
      <div className={alignClass(style.align, 'left')}>
        {c.headline && <h2 className={`font-black mb-3 ${HEADLINE_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-white' : 'text-slate-900') : ''}`}>{c.headline}</h2>}
        {c.body && <p className={`leading-relaxed whitespace-pre-wrap ${BODY_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-slate-300' : 'text-slate-600') : ''}`}>{c.body}</p>}
      </div>
    </section>
  );
}

function ImageBlock({ block }: BlockRenderProps) {
  const c = parseContent<any>(block);
  const style = parseBlockStyle(block.style);
  const images: { url: string; caption?: string }[] = c.images || [];
  if (images.length === 0) return null;
  return (
    <section className={`${paddingClass(style.padding)} ${widthClass(style.width)}`} style={fullBleedStyle(style.width)}>
      <div className={`grid gap-4 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'}`}>
        {images.map((img, idx) => (
          <figure key={idx} className="rounded-xl overflow-hidden bg-black/20">
            {img.url && <img src={img.url} alt={img.caption || ''} className="w-full h-full object-cover" />}
            {img.caption && <figcaption className="text-[11px] text-slate-400 p-2 text-center">{img.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </section>
  );
}

function VideoBlock({ block }: BlockRenderProps) {
  const c = parseContent<any>(block);
  const style = parseBlockStyle(block.style);
  if (!c.video_url) return null;
  return (
    <section className={`${paddingClass(style.padding)} ${widthClass(style.width)}`} style={fullBleedStyle(style.width)}>
      <video
        src={c.video_url}
        autoPlay={!!c.autoplay}
        muted={!!c.autoplay}
        controls={c.controls !== false}
        loop={!!c.autoplay}
        playsInline
        className="w-full rounded-xl"
        style={{ opacity: getOpacity(block, 'video_url') }}
      />
    </section>
  );
}

function CtaBlock({ block, dark, accent }: BlockRenderProps) {
  const c = parseContent<any>(block);
  const style = parseBlockStyle(block.style);
  const accentText = getContrastText(accent);
  return (
    <section
      className={`rounded-2xl px-6 space-y-4 border ${paddingClass(style.padding)} ${widthClass(style.width)} ${alignClass(style.align, 'center')}`}
      style={{ ...fullBleedStyle(style.width), borderColor: `${accent}33`, backgroundColor: style.bg_color || `${accent}1a`, color: style.text_color }}
    >
      {c.headline && <h2 className={`font-black ${HEADLINE_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-white' : 'text-slate-900') : ''}`}>{c.headline}</h2>}
      {c.subheadline && <p className={`${BODY_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-slate-300' : 'text-slate-600') : ''}`}>{c.subheadline}</p>}
      {c.button_text && (
        <a href={c.button_link || '#'} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-black uppercase tracking-wider text-sm transition hover:opacity-90" style={{ backgroundColor: accent, color: accentText }}>
          {c.button_text} <ArrowRight className="w-4 h-4" />
        </a>
      )}
    </section>
  );
}

function TestimonialBlock({ block, dark, accent }: BlockRenderProps) {
  const c = parseContent<any>(block);
  const style = parseBlockStyle(block.style);
  if (!c.quote) return null;
  return (
    <section
      className={`rounded-2xl p-8 space-y-4 border ${paddingClass(style.padding)} ${widthClass(style.width)}`}
      style={{ ...fullBleedStyle(style.width), borderColor: dark ? undefined : undefined, ...overrideStyle(style) }}
    >
      <div className={dark ? 'bg-[#13141a]/80 border border-border-theme rounded-2xl p-8 space-y-4 -m-8' : 'bg-white border border-slate-200 rounded-2xl p-8 space-y-4 -m-8'} style={overrideStyle(style)}>
        <Quote className="w-6 h-6" style={{ color: accent }} />
        <p className={`italic leading-relaxed ${HEADLINE_SIZE[style.font_size === 'sm' ? 'sm' : 'sm']} ${!style.text_color ? (dark ? 'text-slate-200' : 'text-slate-700') : ''}`}>&ldquo;{c.quote}&rdquo;</p>
        <div className="flex items-center gap-3">
          {c.photo_url && <img src={c.photo_url} alt={c.author || ''} className="w-10 h-10 rounded-full object-cover" style={{ opacity: getOpacity(block, 'photo_url') }} />}
          <div>
            {c.author && <span className={`block text-sm font-bold ${!style.text_color ? (dark ? 'text-white' : 'text-slate-900') : ''}`}>{c.author}</span>}
            {c.role && <span className="block text-xs text-slate-500">{c.role}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingBlock({ block, dark, accent }: BlockRenderProps) {
  const c = parseContent<any>(block);
  const style = parseBlockStyle(block.style);
  const tiers: any[] = c.tiers || [];
  if (tiers.length === 0) return null;
  return (
    <section className={`space-y-6 ${paddingClass(style.padding)} ${widthClass(style.width)}`} style={{ ...fullBleedStyle(style.width), ...overrideStyle(style) }}>
      {c.headline && <h2 className={`font-black text-center ${HEADLINE_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-white' : 'text-slate-900') : ''}`}>{c.headline}</h2>}
      <div className={`grid gap-4 ${tiers.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : tiers.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {tiers.map((tier, idx) => (
          <div
            key={idx}
            className={`rounded-2xl p-6 space-y-4 border-2 ${!tier.highlighted ? (dark ? 'border-border-theme bg-[#13141a]/60' : 'border-slate-200 bg-white') : ''}`}
            style={tier.highlighted ? { borderColor: accent, backgroundColor: `${accent}1a` } : undefined}
          >
            <div>
              <span className={`block text-sm font-bold uppercase tracking-wider ${!style.text_color ? (dark ? 'text-slate-300' : 'text-slate-600') : ''}`}>{tier.name}</span>
              <span className={`block text-3xl font-black mt-1 ${!style.text_color ? (dark ? 'text-white' : 'text-slate-900') : ''}`}>{tier.price}</span>
            </div>
            {(tier.features || []).length > 0 && (
              <ul className="space-y-1.5">
                {tier.features.map((f: string, i: number) => (
                  <li key={i} className={`flex items-start gap-2 text-xs ${!style.text_color ? (dark ? 'text-slate-300' : 'text-slate-600') : ''}`}>
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

function FaqBlock({ block, dark, accent }: BlockRenderProps) {
  const c = parseContent<any>(block);
  const style = parseBlockStyle(block.style);
  const items: any[] = c.items || [];
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  if (items.length === 0) return null;
  return (
    <section className={`space-y-4 w-full ${paddingClass(style.padding)} ${widthClass(style.width)}`} style={{ ...fullBleedStyle(style.width), ...overrideStyle(style) }}>
      {c.headline && <h2 className={`font-black text-center mb-2 ${HEADLINE_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-white' : 'text-slate-900') : ''}`}>{c.headline}</h2>}
      <div className="space-y-2">
        {items.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={idx} className={`rounded-xl border overflow-hidden ${dark ? 'border-border-theme bg-[#13141a]/60' : 'border-slate-200 bg-white'}`}>
              <button onClick={() => setOpenIdx(isOpen ? null : idx)} className="w-full flex items-center justify-between gap-3 p-4 text-left cursor-pointer">
                <span className={`text-sm font-bold ${!style.text_color ? (dark ? 'text-white' : 'text-slate-900') : ''}`}>{item.question}</span>
                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: isOpen ? accent : undefined }} />
              </button>
              {isOpen && item.answer && (
                <p className={`px-4 pb-4 text-sm leading-relaxed ${!style.text_color ? (dark ? 'text-slate-300' : 'text-slate-600') : ''}`}>{item.answer}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SpacerBlock({ block }: BlockRenderProps) {
  const c = parseContent<any>(block);
  const heightClass = c.size === 'sm' ? 'h-6' : c.size === 'lg' ? 'h-24' : 'h-12';
  return <div className={heightClass} />;
}

const EMPTY_MSG_FORM = { name: '', email: '', message: '', company_website: '' };

function ContactFormBlock({ block, dark, subdomain, accent }: BlockRenderProps) {
  const c = parseContent<any>(block);
  const style = parseBlockStyle(block.style);
  const accentText = getContrastText(accent);
  const [form, setForm] = useState({ ...EMPTY_MSG_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.message.trim()) {
      setError('Please enter a message.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.submitSiteMessage(subdomain, form);
      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setError('Something went wrong sending your message — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const outerClass = `space-y-4 w-full ${paddingClass(style.padding)} ${widthClass(style.width === 'full' ? 'wide' : style.width)}`;

  if (submitted) {
    return (
      <section className={outerClass} style={fullBleedStyle(style.width)}>
        <div className="rounded-2xl p-8 text-center space-y-2 bg-emerald-950/20 border border-emerald-500/20">
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
    <section className={outerClass} style={fullBleedStyle(style.width)}>
      <div
        className={`rounded-2xl p-8 space-y-4 border ${dark ? 'bg-[#13141a]/80 border-border-theme' : 'bg-white border-slate-200'}`}
        style={overrideStyle(style)}
      >
        {c.headline && <h2 className={`font-black text-center ${HEADLINE_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-white' : 'text-slate-900') : ''}`}>{c.headline}</h2>}
        {c.subheadline && <p className={`text-center ${BODY_SIZE[style.font_size || 'md']} ${!style.text_color ? (dark ? 'text-slate-300' : 'text-slate-600') : ''}`}>{c.subheadline}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name" className={inputClass} />
          <input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Your email" className={inputClass} />
          <textarea value={form.message} onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Your message" rows={4} className={inputClass} />
          {/* Honeypot field — hidden from real visitors via CSS, invisible to screen readers via tabIndex/aria-hidden */}
          <input type="text" value={form.company_website} onChange={(e) => setForm(p => ({ ...p, company_website: e.target.value }))} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 0, height: 0, opacity: 0 }} />
          {error && <p className="text-xs text-rose-400 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {error}</p>}
          <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-black uppercase tracking-wider text-sm transition hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: accent, color: accentText }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {c.button_text || 'Send Message'}
          </button>
        </form>
      </div>
    </section>
  );
}

function BlockRenderer(props: BlockRenderProps) {
  switch (props.block.block_type) {
    case 'hero': return <HeroBlock {...props} />;
    case 'text': return <TextBlock {...props} />;
    case 'image': return <ImageBlock {...props} />;
    case 'video': return <VideoBlock {...props} />;
    case 'cta': return <CtaBlock {...props} />;
    case 'contact_form': return <ContactFormBlock {...props} />;
    case 'testimonial': return <TestimonialBlock {...props} />;
    case 'pricing': return <PricingBlock {...props} />;
    case 'faq': return <FaqBlock {...props} />;
    case 'spacer': return <SpacerBlock {...props} />;
    default: return null;
  }
}

export default function SitePageView({ subdomain }: SitePageViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [site, setSite] = useState<PublicSite | null>(null);
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);

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
        const blockFonts = sortedBlocks.map(b => parseBlockStyle(b.style).font_family);
        ensureGoogleFontsLoaded([themeConfig.font_family, ...blockFonts]);
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
  const fontFamily = themeConfig.font_family || SITE_FONT_OPTIONS[0].value;

  return (
    <div className={dark ? 'min-h-screen bg-[#0a0a0f]' : 'min-h-screen bg-slate-50'} style={{ fontFamily }}>
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col gap-8">
        {blocks.map(block => (
          <BlockRenderer key={block.id} block={block} dark={dark} accent={accent} subdomain={subdomain} />
        ))}
        {blocks.length === 0 && (
          <div className={`text-center py-24 text-sm ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            This page doesn't have any content yet.
          </div>
        )}
      </div>
    </div>
  );
}
