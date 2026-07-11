import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { PublicFunnel } from '../types';
import {
  Wrench, Car, Phone, Mail, User, MessageSquare, AlertTriangle,
  CheckCircle, ArrowRight, Loader2, CheckCircle2, Zap, Clapperboard, Volume2
} from 'lucide-react';

// Small inline "filled" indicator shown next to a label once the visitor has
// typed something in — a tiny bit of live feedback to make the form feel
// responsive rather than static.
function FieldCheck({ filled, colorClass }: { filled: boolean; colorClass?: string }) {
  if (!filled) return null;
  return <CheckCircle2 className={`w-3 h-3 animate-fade-in ${colorClass || 'text-emerald-400'}`} />;
}

// Reads the per-field transparency the shop owner set in the admin Edit Funnel
// modal (stored as a JSON map on funnel.media_opacity, e.g. '{"image_url":80}') and
// returns a 0-1 CSS opacity value for a given media field key. Missing key, missing
// column, or unparseable JSON all fall back to 1 (fully opaque) — the same as every
// funnel that existed before this feature, so nothing changes for them.
// defaultPercent matches whatever that field's baked-in look already was before this
// feature existed (100 for anything that rendered undimmed; 75 for the one spot —
// the Classic headline background video — that already had a fixed opacity-75 for
// brightness-matching) so every existing funnel looks pixel-identical until the
// owner actually touches that field's slider.
function getMediaOpacity(funnel: PublicFunnel, key: string, defaultPercent: number = 100): number {
  try {
    const map = funnel.media_opacity ? JSON.parse(funnel.media_opacity) : {};
    const val = map?.[key];
    return (typeof val === 'number' && val >= 0 && val <= 100) ? val / 100 : defaultPercent / 100;
  } catch {
    return defaultPercent / 100;
  }
}

interface FunnelPageViewProps {
  slug: string;
}

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  vehicle_year: '',
  vehicle_make: '',
  vehicle_model: '',
  message: '',
  company_website: '', // honeypot - never shown to real visitors
};

type FunnelForm = typeof EMPTY_FORM;

interface LayoutProps {
  funnel: PublicFunnel;
  form: FunnelForm;
  updateField: (field: keyof FunnelForm, value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  submitError: string | null;
  submitted: boolean;
}

export default function FunnelPageView({ slug }: FunnelPageViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [funnel, setFunnel] = useState<PublicFunnel | null>(null);

  const [form, setForm] = useState<FunnelForm>({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getPublicFunnel(slug);
        setFunnel(data);
      } catch (err: any) {
        console.error('Failed to load funnel:', err);
        setError(err.message || 'This link is invalid or no longer active.');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const updateField = (field: keyof FunnelForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.message.trim()) {
      setSubmitError('Please fill in your name, phone, email, and a short description.');
      return;
    }
    if (!form.vehicle_year.trim() || !form.vehicle_make.trim() || !form.vehicle_model.trim()) {
      setSubmitError('Please fill in your vehicle year, make, and model.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.submitFunnelLead(slug, form);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Failed to submit lead:', err);
      setSubmitError(err.message || 'Something went wrong submitting your request. Please try again or call us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center font-mono text-slate-400 p-6">
        <span className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mb-4" />
        <span className="tracking-wider uppercase text-xs">Loading...</span>
      </div>
    );
  }

  if (error || !funnel) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6 text-center select-none font-mono">
        <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 mb-5 text-red-400">
          <AlertTriangle className="w-12 h-12" />
        </div>
        <h1 className="text-lg font-bold text-slate-200 uppercase tracking-widest">
          Page Not Available
        </h1>
        <p className="text-xs text-slate-500 max-w-md mt-2 leading-relaxed">
          This link is invalid, has been paused, or no longer exists.
        </p>
      </div>
    );
  }

  const layoutProps: LayoutProps = { funnel, form, updateField, handleSubmit, submitting, submitError, submitted };

  if (funnel.layout === 'modern') return <ModernFunnelLayout {...layoutProps} />;
  if (funnel.layout === 'video') return <VideoFunnelLayout {...layoutProps} />;
  return <ClassicFunnelLayout {...layoutProps} />;
}

// ============================================================================
// CLASSIC LAYOUT — the original bold/amber auto-shop design
// ============================================================================
function ClassicFunnelLayout({ funnel, form, updateField, handleSubmit, submitting, submitError, submitted }: LayoutProps) {
  // Headline box background video: if two clips are configured, play clip 1,
  // then clip 2 on 'ended', then loop back to clip 1 — otherwise just loop clip 1.
  const headlineVideoRef = useRef<HTMLVideoElement | null>(null);
  const [headlineVideoTurn, setHeadlineVideoTurn] = useState<1 | 2>(1);
  const hasSecondHeadlineVideo = !!funnel.headline_bg_video_url_2;
  const currentHeadlineVideoSrc = headlineVideoTurn === 2 && hasSecondHeadlineVideo
    ? funnel.headline_bg_video_url_2
    : funnel.headline_bg_video_url;

  useEffect(() => {
    setHeadlineVideoTurn(1);
  }, [funnel.headline_bg_video_url, funnel.headline_bg_video_url_2]);

  useEffect(() => {
    const vid = headlineVideoRef.current;
    if (vid) {
      vid.load();
      vid.play().catch(() => {});
    }
  }, [headlineVideoTurn]);

  const handleHeadlineVideoEnded = () => {
    if (hasSecondHeadlineVideo) {
      setHeadlineVideoTurn(prev => (prev === 1 ? 2 : 1));
    }
  };

  // Standalone "video underneath headline" section: same clip-1-then-clip-2 pattern.
  const secondaryVideoRef = useRef<HTMLVideoElement | null>(null);
  const [secondaryVideoTurn, setSecondaryVideoTurn] = useState<1 | 2>(1);
  const hasSecondSecondaryVideo = !!funnel.secondary_video_url_2;
  const currentSecondaryVideoSrc = secondaryVideoTurn === 2 && hasSecondSecondaryVideo
    ? funnel.secondary_video_url_2
    : funnel.secondary_video_url;

  useEffect(() => {
    setSecondaryVideoTurn(1);
  }, [funnel.secondary_video_url, funnel.secondary_video_url_2]);

  useEffect(() => {
    const vid = secondaryVideoRef.current;
    if (vid) {
      vid.load();
      vid.play().catch(() => {});
    }
  }, [secondaryVideoTurn]);

  const handleSecondaryVideoEnded = () => {
    if (hasSecondSecondaryVideo) {
      setSecondaryVideoTurn(prev => (prev === 1 ? 2 : 1));
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-200 selection:bg-amber-500/30 selection:text-white pb-16">

      {/* Header / Shop Branding */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur border-b-2 border-amber-500/40 shadow-lg px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-12 h-12 rounded-md bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center text-amber-500 shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-widest uppercase font-mono text-white leading-none">
              WORKSHOP: RAGNARÖK
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 mt-8 space-y-6">

        {/* Hero */}
        <section className="bg-[#111218] border-2 border-amber-500/20 rounded-lg overflow-hidden shadow-2xl animate-fade-in">
          {funnel.video_url ? (
            <video src={funnel.video_url} autoPlay muted loop playsInline style={{ opacity: getMediaOpacity(funnel, 'video_url') }} className="w-full h-72 sm:h-80 object-cover" />
          ) : funnel.image_url ? (
            <img src={funnel.image_url} alt={funnel.headline} style={{ opacity: getMediaOpacity(funnel, 'image_url') }} className="w-full h-72 sm:h-80 object-cover" referrerPolicy="no-referrer" />
          ) : null}

          <div className="relative border-t-2 border-amber-500/30 overflow-hidden">
            {funnel.headline_bg_video_url ? (
              <>
                <video
                  ref={headlineVideoRef}
                  src={currentHeadlineVideoSrc || undefined}
                  autoPlay
                  muted
                  playsInline
                  loop={!hasSecondHeadlineVideo}
                  onEnded={handleHeadlineVideoEnded}
                  style={{ opacity: getMediaOpacity(funnel, 'headline_bg_video_url', 75) }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-[#0d0d18]/35" />
              </>
            ) : funnel.headline_bg_image_url ? (
              <>
                <img
                  src={funnel.headline_bg_image_url}
                  alt=""
                  style={{ opacity: getMediaOpacity(funnel, 'headline_bg_image_url') }}
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/70" />
              </>
            ) : null}
            <div className="relative z-10 p-6 space-y-3 font-mono">
              {funnel.service_type && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-black uppercase tracking-widest border-2 bg-amber-500 text-black border-amber-400">
                  {funnel.service_type}
                </span>
              )}
              <h2 className="text-3xl sm:text-4xl font-black text-white leading-none uppercase tracking-tight">{funnel.headline}</h2>
              {funnel.subheadline && (
                <p className="text-base text-amber-200/80 font-bold">{funnel.subheadline}</p>
              )}
              {funnel.body && (
                <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line pt-3 border-t border-white/10">
                  {funnel.body}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Lead capture form / thank-you state */}
        <section
          className="relative overflow-hidden border-2 border-amber-500/20 rounded-lg shadow-2xl animate-fade-in"
          style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}
        >
          {funnel.secondary_video_url && (
            <>
              <video
                ref={secondaryVideoRef}
                src={currentSecondaryVideoSrc || undefined}
                autoPlay
                muted
                playsInline
                loop={!hasSecondSecondaryVideo}
                onEnded={handleSecondaryVideoEnded}
                style={{ opacity: getMediaOpacity(funnel, 'secondary_video_url', 75) }}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-[#0d0d18]/35" />
            </>
          )}
          <div className={`relative z-10 p-6 font-mono ${funnel.secondary_video_url ? '' : 'bg-[#111218]'}`}>
          {submitted ? (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-md font-bold text-emerald-400 uppercase tracking-wider">Request Received</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Thanks, {form.name.split(' ')[0] || 'friend'}! We've got your details and a confirmation is on its way to {form.email}. Our team will follow up shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-amber-500 text-xl sm:text-2xl uppercase tracking-tight font-black border-b-2 border-amber-500/30 pb-3">
                {funnel.cta_text || 'Get My Free Quote'}
              </h3>

              {submitError && (
                <div className="bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-lg p-3 text-xs">
                  {submitError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                    <User className="w-3 h-3" /> Name * <FieldCheck filled={form.name.trim().length > 0} />
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:scale-[1.01] px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-all duration-150"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                    <Phone className="w-3 h-3" /> Phone * <FieldCheck filled={form.phone.trim().length > 0} />
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:scale-[1.01] px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-all duration-150"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  <Mail className="w-3 h-3" /> Email * <FieldCheck filled={form.email.trim().length > 0} />
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:scale-[1.01] px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-all duration-150"
                  placeholder="jane@example.com"
                />
                <p className="text-[9px] text-slate-600 mt-1">We'll send your confirmation here.</p>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  <Car className="w-3 h-3" /> Vehicle * <FieldCheck filled={form.vehicle_year.trim().length > 0 && form.vehicle_make.trim().length > 0 && form.vehicle_model.trim().length > 0} />
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={form.vehicle_year}
                    onChange={(e) => updateField('vehicle_year', e.target.value)}
                    className="rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:scale-[1.01] px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-all duration-150"
                    placeholder="Year"
                  />
                  <input
                    type="text"
                    required
                    value={form.vehicle_make}
                    onChange={(e) => updateField('vehicle_make', e.target.value)}
                    className="rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:scale-[1.01] px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-all duration-150"
                    placeholder="Make"
                  />
                  <input
                    type="text"
                    required
                    value={form.vehicle_model}
                    onChange={(e) => updateField('vehicle_model', e.target.value)}
                    className="rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:scale-[1.01] px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-all duration-150"
                    placeholder="Model"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  <MessageSquare className="w-3 h-3" /> What's going on? * <FieldCheck filled={form.message.trim().length > 0} />
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => updateField('message', e.target.value)}
                  className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none resize-none transition-all duration-150"
                  placeholder="Tell us what you need — a repair, a strange noise, routine service, anything."
                />
              </div>

              {/* Honeypot field: visually hidden and off-screen, real users never see or fill this.
                  Any bot that blindly fills every input will trip it and get silently dropped server-side. */}
              <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
                <label htmlFor="company_website">Leave this field blank</label>
                <input
                  type="text"
                  id="company_website"
                  name="company_website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.company_website}
                  onChange={(e) => updateField('company_website', e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-5 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 hover:scale-[1.015] disabled:from-zinc-800 disabled:to-zinc-800 text-black disabled:text-zinc-500 font-black rounded-md text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] border-2 border-amber-400/60 cursor-pointer ${submitting ? '' : 'animate-pulse-glow'}`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Wrench className="w-4 h-4" />
                    <span>{funnel.cta_text || 'Get My Free Quote'}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}
          </div>
        </section>
      </main>
    </div>
  );
}

// ============================================================================
// MODERN LAYOUT — vibrant/futuristic design (per funnelpic2.jpg reference):
// rounded pill header w/ cyan glow border, blue/purple/cyan ambient glow bg,
// glowing rounded-3xl card borders, pink-orange gradient CTA button.
// ============================================================================
function ModernFunnelLayout({ funnel, form, updateField, handleSubmit, submitting, submitError, submitted }: LayoutProps) {
  return (
    <div className="relative min-h-screen bg-[#08070f] text-slate-200 selection:bg-cyan-400/30 selection:text-white pb-20 overflow-hidden">

      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]" />
      <div className="pointer-events-none absolute top-1/3 -right-32 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-[110px]" />

      {/* Header — floating glowing pill */}
      <header className="relative z-40 sticky top-4 px-4">
        <div className="max-w-md mx-auto flex items-center gap-3 rounded-full bg-black/70 backdrop-blur-xl border-2 border-cyan-400/50 px-5 py-3 animate-pulse-glow-cyan">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-[0_0_12px_rgba(34,211,238,0.6)]">
            <Zap className="w-5 h-5" />
          </div>
          <h1 className="text-sm font-black tracking-wide uppercase bg-gradient-to-r from-cyan-300 via-blue-200 to-purple-300 bg-clip-text text-transparent leading-none">
            Workshop: Ragnarök
          </h1>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 mt-8 space-y-6">

        {/* Hero */}
        <section className="relative rounded-3xl overflow-hidden border-2 border-purple-500/40 shadow-[0_0_50px_rgba(168,85,247,0.25)] animate-fade-in">
          {funnel.video_url ? (
            <video src={funnel.video_url} autoPlay muted loop playsInline style={{ opacity: getMediaOpacity(funnel, 'video_url') }} className="w-full h-80 sm:h-96 object-cover" />
          ) : funnel.image_url ? (
            <img src={funnel.image_url} alt={funnel.headline} style={{ opacity: getMediaOpacity(funnel, 'image_url') }} className="w-full h-80 sm:h-96 object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-56 bg-gradient-to-br from-indigo-950 via-purple-950 to-black" />
          )}
          {/* gradient wash so text stays legible over any hero art */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-6 space-y-2.5">
            {funnel.service_type && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest bg-gradient-to-r from-cyan-400 to-purple-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.5)]">
                {funnel.service_type}
              </span>
            )}
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
              {funnel.headline}
            </h2>
            {funnel.subheadline && (
              <p className="text-base sm:text-lg font-bold bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                {funnel.subheadline}
              </p>
            )}
          </div>
        </section>

        {funnel.body && (
          <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-line px-2 animate-fade-in" style={{ animationDelay: '0.05s', animationFillMode: 'backwards' }}>
            {funnel.body}
          </p>
        )}

        {/* Lead capture form / thank-you state */}
        <section
          className="relative overflow-hidden rounded-3xl border-2 border-cyan-400/40 shadow-[0_0_40px_rgba(34,211,238,0.15)] animate-fade-in"
          style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}
        >
          {/* Optional looping background video, peeking through behind the glass card */}
          {funnel.card_video_url && (
            <video
              src={funnel.card_video_url}
              autoPlay
              muted
              loop
              playsInline
              style={{ opacity: getMediaOpacity(funnel, 'card_video_url', 75) }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          <div className={`relative z-10 p-6 sm:p-8 ${funnel.card_video_url ? 'bg-[#0d0d18]/35' : 'bg-[#0d0d18]/90 backdrop-blur'}`}>
          {submitted ? (
            <div className="flex flex-col items-center text-center gap-3 py-8">
              <div className="p-3.5 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.5)] text-black">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                Request Received!
              </h3>
              <p className="text-sm text-slate-400 max-w-sm">
                Thanks, {form.name.split(' ')[0] || 'friend'}! We've got your details and a confirmation is on its way to {form.email}. Our team will follow up shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-cyan-300 via-blue-200 to-purple-300 bg-clip-text text-transparent border-b-2 border-cyan-400/20 pb-3">
                {funnel.cta_text || 'Get My Free Quote'}
              </h3>

              {submitError && (
                <div className="bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-2xl p-3 text-xs">
                  {submitError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] text-cyan-300/80 uppercase tracking-wider mb-1 font-bold">
                    <User className="w-3 h-3" /> Name * <FieldCheck filled={form.name.trim().length > 0} colorClass="text-cyan-400" />
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full rounded-2xl bg-[#0a0a14] border border-purple-500/25 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 focus:scale-[1.01] px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition-all duration-150"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] text-cyan-300/80 uppercase tracking-wider mb-1 font-bold">
                    <Phone className="w-3 h-3" /> Phone * <FieldCheck filled={form.phone.trim().length > 0} colorClass="text-cyan-400" />
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full rounded-2xl bg-[#0a0a14] border border-purple-500/25 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 focus:scale-[1.01] px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition-all duration-150"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10px] text-cyan-300/80 uppercase tracking-wider mb-1 font-bold">
                  <Mail className="w-3 h-3" /> Email * <FieldCheck filled={form.email.trim().length > 0} colorClass="text-cyan-400" />
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full rounded-2xl bg-[#0a0a14] border border-purple-500/25 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 focus:scale-[1.01] px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition-all duration-150"
                  placeholder="jane@example.com"
                />
                <p className="text-[9px] text-slate-600 mt-1">We'll send your confirmation here.</p>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10px] text-cyan-300/80 uppercase tracking-wider mb-1 font-bold">
                  <Car className="w-3 h-3" /> Vehicle * <FieldCheck filled={form.vehicle_year.trim().length > 0 && form.vehicle_make.trim().length > 0 && form.vehicle_model.trim().length > 0} colorClass="text-cyan-400" />
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={form.vehicle_year}
                    onChange={(e) => updateField('vehicle_year', e.target.value)}
                    className="rounded-2xl bg-[#0a0a14] border border-purple-500/25 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 focus:scale-[1.01] px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition-all duration-150"
                    placeholder="Year"
                  />
                  <input
                    type="text"
                    required
                    value={form.vehicle_make}
                    onChange={(e) => updateField('vehicle_make', e.target.value)}
                    className="rounded-2xl bg-[#0a0a14] border border-purple-500/25 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 focus:scale-[1.01] px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition-all duration-150"
                    placeholder="Make"
                  />
                  <input
                    type="text"
                    required
                    value={form.vehicle_model}
                    onChange={(e) => updateField('vehicle_model', e.target.value)}
                    className="rounded-2xl bg-[#0a0a14] border border-purple-500/25 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 focus:scale-[1.01] px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition-all duration-150"
                    placeholder="Model"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10px] text-cyan-300/80 uppercase tracking-wider mb-1 font-bold">
                  <MessageSquare className="w-3 h-3" /> What's going on? * <FieldCheck filled={form.message.trim().length > 0} colorClass="text-cyan-400" />
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => updateField('message', e.target.value)}
                  className="w-full rounded-2xl bg-[#0a0a14] border border-purple-500/25 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none resize-none transition-all duration-150"
                  placeholder="Tell us what you need — a repair, a strange noise, routine service, anything."
                />
              </div>

              {/* Honeypot field: visually hidden and off-screen, real users never see or fill this.
                  Any bot that blindly fills every input will trip it and get silently dropped server-side. */}
              <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
                <label htmlFor="company_website">Leave this field blank</label>
                <input
                  type="text"
                  id="company_website"
                  name="company_website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.company_website}
                  onChange={(e) => updateField('company_website', e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-5 px-6 bg-gradient-to-r from-pink-500 via-orange-500 to-amber-400 hover:from-pink-400 hover:via-orange-400 hover:to-amber-300 hover:scale-[1.015] disabled:from-zinc-800 disabled:to-zinc-800 text-black disabled:text-zinc-500 font-black rounded-full text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] border-2 border-pink-400/60 cursor-pointer ${submitting ? '' : 'animate-pulse-glow-pink'}`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>{funnel.cta_text || 'Get My Free Quote'}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}
          </div>
        </section>
      </main>
    </div>
  );
}

// ============================================================================
// VIDEO LAYOUT — cinematic layout built around a big, click-to-play hero
// video with real sound + controls. The video is the whole pitch; the form
// sits directly beneath it so a convinced visitor doesn't have to scroll or
// hunt for it. No autoplay-with-sound trickery here — browsers block that
// anyway, so this leans into "press play, watch/listen, then convert" as the
// actual intended flow rather than fighting the platform.
// ============================================================================
function VideoFunnelLayout({ funnel, form, updateField, handleSubmit, submitting, submitError, submitted }: LayoutProps) {
  // Browsers block autoplay-with-sound outright, so the only way to actually start
  // playback the instant the page loads is muted autoplay, with a one-tap "unmute"
  // control layered on top (tapping counts as user interaction, so sound then plays
  // uninterrupted from wherever the video already is — no restart).
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [heroMuted, setHeroMuted] = useState(true);

  const handleUnmute = () => {
    const v = heroVideoRef.current;
    if (v) {
      v.muted = false;
      v.play().catch(() => {});
    }
    setHeroMuted(false);
  };

  return (
    <div className="relative min-h-screen bg-[#0d0612] text-white selection:bg-pink-400/30 selection:text-white pb-20 overflow-hidden">

      {/* Ambient vibrant glows — warm sunset palette, distinct from Modern's cool cyan/purple */}
      <div className="pointer-events-none absolute -top-32 -left-24 w-96 h-96 bg-pink-500/25 rounded-full blur-[110px]" />
      <div className="pointer-events-none absolute top-1/4 -right-32 w-96 h-96 bg-orange-500/20 rounded-full blur-[110px]" />
      <div className="pointer-events-none absolute bottom-10 left-1/3 w-96 h-96 bg-amber-400/15 rounded-full blur-[120px]" />

      {/* Header — floating glowing pill, matching Modern's polish */}
      <header className="relative z-40 sticky top-4 px-4">
        <div className="max-w-md mx-auto flex items-center gap-3 rounded-full bg-black/70 backdrop-blur-xl border-2 border-pink-400/50 px-5 py-3 shadow-[0_0_20px_rgba(236,72,153,0.35)]">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 via-orange-400 to-amber-300 flex items-center justify-center text-black shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.6)]">
            <Clapperboard className="w-5 h-5" />
          </div>
          <h1 className="text-sm font-black tracking-wide uppercase bg-gradient-to-r from-pink-300 via-orange-200 to-amber-200 bg-clip-text text-transparent leading-none">
            Workshop: Ragnarök
          </h1>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 mt-8 space-y-6">

        {/* Unified hero: badge + headline + subheadline + video + body, all one flowing card
            so nothing feels like disconnected boxes stacked on top of each other. */}
        <section
          className="relative rounded-3xl overflow-hidden border-2 border-pink-400/40 shadow-[0_0_50px_rgba(236,72,153,0.25)] bg-gradient-to-b from-[#1c0f27] to-[#0d0612] animate-fade-in"
        >
          {/* Hero Image URL now actually does something: it's the backdrop behind the
              whole card (badge/headline/video/body), not just a video poster frame that
              gets covered up the instant autoplay kicks in. Dark gradient on top keeps
              text and the video's edges readable regardless of what the image looks like. */}
          {funnel.image_url && (
            <>
              <img
                src={funnel.image_url}
                alt=""
                style={{ opacity: getMediaOpacity(funnel, 'image_url') }}
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {/* One moderate readability overlay, not stacked near-opaque layers — the
                  Transparency slider above is now the shop owner's actual control over
                  how much of this image shows through, so the overlay needs real room
                  to move instead of quietly overpowering every slider setting. */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#1c0f27]/75 via-[#1c0f27]/65 to-[#0d0612]/80" />
            </>
          )}

          <div className="relative z-10 p-6 sm:p-8 pb-5 space-y-3 text-center">
            {funnel.service_type && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest bg-gradient-to-r from-pink-400 via-orange-400 to-amber-300 text-black shadow-[0_0_15px_rgba(251,146,60,0.5)]">
                {funnel.service_type}
              </span>
            )}
            <h2 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight bg-gradient-to-r from-pink-300 via-orange-200 to-amber-200 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
              {funnel.headline}
            </h2>
            {funnel.subheadline && (
              <p className="text-base sm:text-lg font-bold text-orange-100/90">
                {funnel.subheadline}
              </p>
            )}
          </div>

          {/* Video — edge to edge within the same card. Starts playing automatically
              (muted, since that's the only autoplay browsers allow) with a one-tap
              button to turn sound on. */}
          <div className="relative z-10 px-3 sm:px-4">
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              {funnel.hero_video_url ? (
                <>
                  <video
                    ref={heroVideoRef}
                    src={funnel.hero_video_url}
                    controls
                    autoPlay
                    muted={heroMuted}
                    playsInline
                    preload="auto"
                    poster={funnel.image_url || undefined}
                    style={{ opacity: getMediaOpacity(funnel, 'hero_video_url') }}
                    className="w-full aspect-video bg-black"
                  />
                  {heroMuted ? (
                    <button
                      type="button"
                      onClick={handleUnmute}
                      className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 border border-amber-400/60 text-amber-200 text-[10px] font-bold uppercase tracking-wider hover:bg-black/90 hover:border-amber-300 transition-colors cursor-pointer animate-pulse-glow"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      Tap for Sound
                    </button>
                  ) : (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 border border-amber-400/50 text-amber-200 text-[9px] font-bold uppercase tracking-wider pointer-events-none">
                      <Volume2 className="w-3 h-3" />
                      Sound On
                    </div>
                  )}
                </>
              ) : funnel.video_url ? (
                <video src={funnel.video_url} controls autoPlay muted playsInline preload="auto" style={{ opacity: getMediaOpacity(funnel, 'video_url') }} className="w-full aspect-video bg-black" />
              ) : funnel.image_url ? (
                <img src={funnel.image_url} alt={funnel.headline} style={{ opacity: getMediaOpacity(funnel, 'image_url') }} className="w-full aspect-video object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center text-slate-700">
                  <Clapperboard className="w-12 h-12" />
                </div>
              )}
            </div>
          </div>

          {/* Body copy — inside the same card, high-contrast and easy to read */}
          {funnel.body && (
            <div className="relative z-10 px-6 sm:px-8 pt-5 pb-7">
              <p className="text-sm sm:text-[15px] text-white/85 leading-relaxed whitespace-pre-line text-center max-w-xl mx-auto">
                {funnel.body}
              </p>
            </div>
          )}
        </section>

        {/* Lead capture form / thank-you state — sits right under the video on purpose */}
        <section
          className="relative overflow-hidden rounded-3xl border-2 border-amber-400/40 shadow-[0_0_40px_rgba(251,191,36,0.18)] animate-fade-in bg-[#150a1d]"
          style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}
        >
          {funnel.video_form_bg_image_url && (
            <>
              <img
                src={funnel.video_form_bg_image_url}
                alt=""
                style={{ opacity: getMediaOpacity(funnel, 'video_form_bg_image_url') }}
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#1c0f27]/75 via-[#150a1d]/65 to-[#0d0612]/80" />
            </>
          )}
          <div className="relative z-10 p-6 sm:p-8 font-mono">
          {submitted ? (
            <div className="flex flex-col items-center text-center gap-3 py-8">
              <div className="p-3.5 bg-gradient-to-br from-pink-400 to-amber-300 rounded-full shadow-[0_0_20px_rgba(251,191,36,0.5)] text-black">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-md font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-orange-200 to-amber-200 uppercase tracking-wider">Request Received</h3>
              <p className="text-xs text-white/70 max-w-sm">
                Thanks, {form.name.split(' ')[0] || 'friend'}! We've got your details and a confirmation is on its way to {form.email}. Our team will follow up shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-orange-200 to-amber-200 text-xl sm:text-2xl uppercase tracking-tight font-black border-b-2 border-amber-400/30 pb-3">
                {funnel.cta_text || 'Get My Free Quote'}
              </h3>

              {submitError && (
                <div className="bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-lg p-3 text-xs">
                  {submitError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] text-white/60 uppercase tracking-wider mb-1">
                    <User className="w-3 h-3" /> Name * <FieldCheck filled={form.name.trim().length > 0} colorClass="text-amber-300" />
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full rounded-xl bg-black/40 border border-white/15 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 focus:scale-[1.01] px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-all duration-150"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] text-white/60 uppercase tracking-wider mb-1">
                    <Phone className="w-3 h-3" /> Phone * <FieldCheck filled={form.phone.trim().length > 0} colorClass="text-amber-300" />
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full rounded-xl bg-black/40 border border-white/15 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 focus:scale-[1.01] px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-all duration-150"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10px] text-white/60 uppercase tracking-wider mb-1">
                  <Mail className="w-3 h-3" /> Email * <FieldCheck filled={form.email.trim().length > 0} colorClass="text-amber-300" />
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-white/15 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 focus:scale-[1.01] px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-all duration-150"
                  placeholder="jane@example.com"
                />
                <p className="text-[9px] text-white/40 mt-1">We'll send your confirmation here.</p>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10px] text-white/60 uppercase tracking-wider mb-1">
                  <Car className="w-3 h-3" /> Vehicle * <FieldCheck filled={form.vehicle_year.trim().length > 0 && form.vehicle_make.trim().length > 0 && form.vehicle_model.trim().length > 0} colorClass="text-amber-300" />
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={form.vehicle_year}
                    onChange={(e) => updateField('vehicle_year', e.target.value)}
                    className="rounded-xl bg-black/40 border border-white/15 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 focus:scale-[1.01] px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-all duration-150"
                    placeholder="Year"
                  />
                  <input
                    type="text"
                    required
                    value={form.vehicle_make}
                    onChange={(e) => updateField('vehicle_make', e.target.value)}
                    className="rounded-xl bg-black/40 border border-white/15 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 focus:scale-[1.01] px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-all duration-150"
                    placeholder="Make"
                  />
                  <input
                    type="text"
                    required
                    value={form.vehicle_model}
                    onChange={(e) => updateField('vehicle_model', e.target.value)}
                    className="rounded-xl bg-black/40 border border-white/15 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 focus:scale-[1.01] px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-all duration-150"
                    placeholder="Model"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10px] text-white/60 uppercase tracking-wider mb-1">
                  <MessageSquare className="w-3 h-3" /> What's going on? * <FieldCheck filled={form.message.trim().length > 0} colorClass="text-amber-300" />
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => updateField('message', e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-white/15 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none resize-none transition-all duration-150"
                  placeholder="Tell us what you need — a repair, a strange noise, routine service, anything."
                />
              </div>

              {/* Honeypot field: visually hidden and off-screen, real users never see or fill this.
                  Any bot that blindly fills every input will trip it and get silently dropped server-side. */}
              <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
                <label htmlFor="company_website">Leave this field blank</label>
                <input
                  type="text"
                  id="company_website"
                  name="company_website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.company_website}
                  onChange={(e) => updateField('company_website', e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-5 px-6 bg-gradient-to-r from-pink-500 via-orange-500 to-amber-400 hover:from-pink-400 hover:via-orange-400 hover:to-amber-300 hover:scale-[1.015] disabled:from-zinc-800 disabled:to-zinc-800 text-black disabled:text-zinc-500 font-black rounded-full text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] border-2 border-amber-300/60 cursor-pointer ${submitting ? '' : 'animate-pulse-glow-pink'}`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Wrench className="w-4 h-4" />
                    <span>{funnel.cta_text || 'Get My Free Quote'}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}
          </div>
        </section>
      </main>
    </div>
  );
}
