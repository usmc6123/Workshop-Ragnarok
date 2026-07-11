import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { PublicFunnel } from '../types';
import {
  Wrench, Car, Phone, Mail, User, MessageSquare, AlertTriangle,
  CheckCircle, ArrowRight, Loader2
} from 'lucide-react';

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

export default function FunnelPageView({ slug }: FunnelPageViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [funnel, setFunnel] = useState<PublicFunnel | null>(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });
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

  const updateField = (field: keyof typeof EMPTY_FORM, value: string) => {
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
        <section className="bg-[#111218] border-2 border-amber-500/20 rounded-lg overflow-hidden shadow-2xl">
          {funnel.video_url ? (
            <video src={funnel.video_url} autoPlay muted loop playsInline className="w-full h-72 sm:h-80 object-cover" />
          ) : funnel.image_url ? (
            <img src={funnel.image_url} alt={funnel.headline} className="w-full h-72 sm:h-80 object-cover" referrerPolicy="no-referrer" />
          ) : null}

          <div className="p-6 space-y-3 font-mono border-t-2 border-amber-500/30">
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
        </section>

        {/* Lead capture form / thank-you state */}
        <section className="bg-[#111218] border-2 border-amber-500/20 rounded-lg p-6 shadow-2xl font-mono">
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
                    <User className="w-3 h-3" /> Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                    <Phone className="w-3 h-3" /> Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  <Mail className="w-3 h-3" /> Email *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                  placeholder="jane@example.com"
                />
                <p className="text-[9px] text-slate-600 mt-1">We'll send your confirmation here.</p>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  <Car className="w-3 h-3" /> Vehicle *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={form.vehicle_year}
                    onChange={(e) => updateField('vehicle_year', e.target.value)}
                    className="rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                    placeholder="Year"
                  />
                  <input
                    type="text"
                    required
                    value={form.vehicle_make}
                    onChange={(e) => updateField('vehicle_make', e.target.value)}
                    className="rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                    placeholder="Make"
                  />
                  <input
                    type="text"
                    required
                    value={form.vehicle_model}
                    onChange={(e) => updateField('vehicle_model', e.target.value)}
                    className="rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                    placeholder="Model"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  <MessageSquare className="w-3 h-3" /> What's going on? *
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => updateField('message', e.target.value)}
                  className="w-full rounded-lg bg-[#0c0d12] border border-[#1e2028] focus:border-amber-500 px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none resize-none"
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
                className="w-full py-5 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:from-zinc-800 disabled:to-zinc-800 text-black disabled:text-zinc-500 font-black rounded-md text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] border-2 border-amber-400/60 shadow-[0_6px_24px_rgba(245,158,11,0.35)] cursor-pointer"
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
        </section>
      </main>
    </div>
  );
}
