import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { PublicSite, SiteBlock } from '../types';
import {
  Loader2, AlertTriangle, CheckCircle2, ArrowRight, Quote, Send, ChevronDown,
} from 'lucide-react';

interface SitePageViewProps {
  subdomain: string;
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

// --- Individual block renderers, one per block_type ---------------------------

function HeroBlock({ block, dark }: { block: SiteBlock; dark: boolean }) {
  const c = parseContent<any>(block);
  return (
    <section className="relative overflow-hidden rounded-2xl min-h-[420px] flex items-center justify-center text-center px-6 py-20">
      {c.video_url && (
        <video src={c.video_url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" style={{ opacity: getOpacity(block, 'video_url') }} />
      )}
      {c.image_url && !c.video_url && (
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${c.image_url})`, opacity: getOpacity(block, 'image_url') }} />
      )}
      <div className={`absolute inset-0 ${dark ? 'bg-gradient-to-b from-black/60 via-black/50 to-black/70' : 'bg-gradient-to-b from-white/50 via-white/40 to-white/60'}`} />
      <div className="relative z-10 max-w-2xl mx-auto space-y-5">
        {c.headline && <h1 className={`text-3xl md:text-5xl font-black tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>{c.headline}</h1>}
        {c.subheadline && <p className={`text-base md:text-lg ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{c.subheadline}</p>}
        {c.cta_text && (
          <a href={c.cta_link || '#'} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-wider text-sm transition">
            {c.cta_text} <ArrowRight className="w-4 h-4" />
          </a>
        )}
      </div>
    </section>
  );
}

function TextBlock({ block, dark }: { block: SiteBlock; dark: boolean }) {
  const c = parseContent<any>(block);
  const align = c.align === 'center' ? 'text-center mx-auto' : 'text-left';
  return (
    <section className={`max-w-2xl py-10 px-2 ${align}`}>
      {c.headline && <h2 className={`text-2xl font-black mb-3 ${dark ? 'text-white' : 'text-slate-900'}`}>{c.headline}</h2>}
      {c.body && <p className={`text-sm leading-relaxed whitespace-pre-wrap ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{c.body}</p>}
    </section>
  );
}

function ImageBlock({ block }: { block: SiteBlock }) {
  const c = parseContent<any>(block);
  const images: { url: string; caption?: string }[] = c.images || [];
  if (images.length === 0) return null;
  return (
    <section className="py-8">
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

function VideoBlock({ block }: { block: SiteBlock }) {
  const c = parseContent<any>(block);
  if (!c.video_url) return null;
  return (
    <section className="py-8">
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

function CtaBlock({ block, dark }: { block: SiteBlock; dark: boolean }) {
  const c = parseContent<any>(block);
  return (
    <section className={`rounded-2xl py-14 px-6 text-center space-y-4 ${dark ? 'bg-amber-950/20 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
      {c.headline && <h2 className={`text-2xl font-black ${dark ? 'text-white' : 'text-slate-900'}`}>{c.headline}</h2>}
      {c.subheadline && <p className={`text-sm ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{c.subheadline}</p>}
      {c.button_text && (
        <a href={c.button_link || '#'} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-wider text-sm transition">
          {c.button_text} <ArrowRight className="w-4 h-4" />
        </a>
      )}
    </section>
  );
}

function TestimonialBlock({ block, dark }: { block: SiteBlock; dark: boolean }) {
  const c = parseContent<any>(block);
  if (!c.quote) return null;
  return (
    <section className={`rounded-2xl p-8 space-y-4 ${dark ? 'bg-[#13141a]/80 border border-border-theme' : 'bg-white border border-slate-200'}`}>
      <Quote className="w-6 h-6 text-amber-400" />
      <p className={`text-lg italic leading-relaxed ${dark ? 'text-slate-200' : 'text-slate-700'}`}>&ldquo;{c.quote}&rdquo;</p>
      <div className="flex items-center gap-3">
        {c.photo_url && <img src={c.photo_url} alt={c.author || ''} className="w-10 h-10 rounded-full object-cover" style={{ opacity: getOpacity(block, 'photo_url') }} />}
        <div>
          {c.author && <span className={`block text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{c.author}</span>}
          {c.role && <span className="block text-xs text-slate-500">{c.role}</span>}
        </div>
      </div>
    </section>
  );
}

function PricingBlock({ block, dark }: { block: SiteBlock; dark: boolean }) {
  const c = parseContent<any>(block);
  const tiers: any[] = c.tiers || [];
  if (tiers.length === 0) return null;
  return (
    <section className="py-8 space-y-6">
      {c.headline && <h2 className={`text-2xl font-black text-center ${dark ? 'text-white' : 'text-slate-900'}`}>{c.headline}</h2>}
      <div className={`grid gap-4 ${tiers.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : tiers.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {tiers.map((tier, idx) => (
          <div key={idx} className={`rounded-2xl p-6 space-y-4 border-2 ${tier.highlighted ? 'border-amber-400 bg-amber-950/10' : dark ? 'border-border-theme bg-[#13141a]/60' : 'border-slate-200 bg-white'}`}>
            <div>
              <span className={`block text-sm font-bold uppercase tracking-wider ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{tier.name}</span>
              <span className={`block text-3xl font-black mt-1 ${dark ? 'text-white' : 'text-slate-900'}`}>{tier.price}</span>
            </div>
            {(tier.features || []).length > 0 && (
              <ul className="space-y-1.5">
                {tier.features.map((f: string, i: number) => (
                  <li key={i} className={`flex items-start gap-2 text-xs ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /> {f}
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

function FaqBlock({ block, dark }: { block: SiteBlock; dark: boolean }) {
  const c = parseContent<any>(block);
  const items: any[] = c.items || [];
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  if (items.length === 0) return null;
  return (
    <section className="py-8 space-y-4 max-w-2xl mx-auto w-full">
      {c.headline && <h2 className={`text-2xl font-black text-center mb-2 ${dark ? 'text-white' : 'text-slate-900'}`}>{c.headline}</h2>}
      <div className="space-y-2">
        {items.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={idx} className={`rounded-xl border overflow-hidden ${dark ? 'border-border-theme bg-[#13141a]/60' : 'border-slate-200 bg-white'}`}>
              <button onClick={() => setOpenIdx(isOpen ? null : idx)} className="w-full flex items-center justify-between gap-3 p-4 text-left cursor-pointer">
                <span className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{item.question}</span>
                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''} ${dark ? 'text-slate-400' : 'text-slate-500'}`} />
              </button>
              {isOpen && item.answer && (
                <p className={`px-4 pb-4 text-sm leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{item.answer}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SpacerBlock({ block }: { block: SiteBlock }) {
  const c = parseContent<any>(block);
  const heightClass = c.size === 'sm' ? 'h-6' : c.size === 'lg' ? 'h-24' : 'h-12';
  return <div className={heightClass} />;
}

const EMPTY_MSG_FORM = { name: '', email: '', message: '', company_website: '' };

function ContactFormBlock({ block, dark, subdomain }: { block: SiteBlock; dark: boolean; subdomain: string }) {
  const c = parseContent<any>(block);
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

  if (submitted) {
    return (
      <section className={`rounded-2xl p-8 text-center space-y-2 ${dark ? 'bg-emerald-950/20 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}>
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
        <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Thanks — your message was sent!</p>
      </section>
    );
  }

  const inputClass = dark
    ? 'w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none'
    : 'w-full rounded-lg bg-white border border-slate-300 focus:border-amber-500 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none';

  return (
    <section className={`rounded-2xl p-8 space-y-4 max-w-xl mx-auto w-full ${dark ? 'bg-[#13141a]/80 border border-border-theme' : 'bg-white border border-slate-200'}`}>
      {c.headline && <h2 className={`text-2xl font-black text-center ${dark ? 'text-white' : 'text-slate-900'}`}>{c.headline}</h2>}
      {c.subheadline && <p className={`text-sm text-center ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{c.subheadline}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="text" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name" className={inputClass} />
        <input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Your email" className={inputClass} />
        <textarea value={form.message} onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Your message" rows={4} className={inputClass} />
        {/* Honeypot field — hidden from real visitors via CSS, invisible to screen readers via tabIndex/aria-hidden */}
        <input type="text" value={form.company_website} onChange={(e) => setForm(p => ({ ...p, company_website: e.target.value }))} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 0, height: 0, opacity: 0 }} />
        {error && <p className="text-xs text-rose-400 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {error}</p>}
        <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-wider text-sm transition disabled:opacity-50">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {c.button_text || 'Send Message'}
        </button>
      </form>
    </section>
  );
}

function BlockRenderer({ block, dark, subdomain }: { block: SiteBlock; dark: boolean; subdomain: string }) {
  switch (block.block_type) {
    case 'hero': return <HeroBlock block={block} dark={dark} />;
    case 'text': return <TextBlock block={block} dark={dark} />;
    case 'image': return <ImageBlock block={block} />;
    case 'video': return <VideoBlock block={block} />;
    case 'cta': return <CtaBlock block={block} dark={dark} />;
    case 'contact_form': return <ContactFormBlock block={block} dark={dark} subdomain={subdomain} />;
    case 'testimonial': return <TestimonialBlock block={block} dark={dark} />;
    case 'pricing': return <PricingBlock block={block} dark={dark} />;
    case 'faq': return <FaqBlock block={block} dark={dark} />;
    case 'spacer': return <SpacerBlock block={block} />;
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
        setBlocks((data.blocks || []).sort((a, b) => a.position - b.position));
        if (data.site?.title) document.title = data.site.title;
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

  return (
    <div className={dark ? 'min-h-screen bg-[#0a0a0f]' : 'min-h-screen bg-slate-50'}>
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col gap-8">
        {blocks.map(block => (
          <BlockRenderer key={block.id} block={block} dark={dark} subdomain={subdomain} />
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
