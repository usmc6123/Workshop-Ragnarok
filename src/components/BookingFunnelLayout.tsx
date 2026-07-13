import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { PublicFunnel } from '../types';
import {
  Wrench, Car, Phone, Mail, User, MessageSquare, AlertTriangle,
  CheckCircle, ArrowRight, Loader2, CheckCircle2, Calendar, Clock,
  ChevronLeft, ChevronRight
} from 'lucide-react';

interface LayoutProps {
  funnel: PublicFunnel;
  embedded?: boolean;
}

// Helper to retrieve custom media field opacity/transparency
function getMediaOpacity(funnel: PublicFunnel, key: string, defaultPercent: number = 100): number {
  try {
    const map = funnel.media_opacity ? JSON.parse(funnel.media_opacity) : {};
    const val = map?.[key];
    return (typeof val === 'number' && val >= 0 && val <= 100) ? val / 100 : defaultPercent / 100;
  } catch {
    return defaultPercent / 100;
  }
}

// Inline FieldCheck same as other layouts for beautiful live input feedback
function FieldCheck({ filled, colorClass }: { filled: boolean; colorClass?: string }) {
  if (!filled) return null;
  return <CheckCircle2 className={`w-3 h-3 animate-fade-in ${colorClass || 'text-emerald-400'}`} />;
}

export default function BookingFunnelLayout({ funnel, embedded = false }: LayoutProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Date carousel pagination: showing next 14 days
  const [carouselStartIdx, setCarouselStartIdx] = useState(0);

  // Form State
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    vehicle_year: '',
    vehicle_make: '',
    vehicle_model: '',
    notes: '',
    company_website: '', // honeypot
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Generate 14 selectable days starting from today (or tomorrow if late)
  const days: { dateStr: string; label: string; dayName: string; isToday: boolean }[] = [];
  const today = new Date();
  
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Check if Sunday or Saturday to show label properly
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    
    days.push({
      dateStr,
      label,
      dayName,
      isToday: i === 0
    });
  }

  // Set initial selected date to the first day in the list
  useEffect(() => {
    if (days.length > 0 && !selectedDate) {
      setSelectedDate(days[0].dateStr);
    }
  }, []);

  // Fetch availability when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      fetchAvailability(selectedDate);
      setSelectedTime(''); // Reset selected time
    }
  }, [selectedDate]);

  const fetchAvailability = async (date: string) => {
    setSlotsLoading(true);
    setSlotsError(null);
    try {
      const res = await api.getFunnelAvailability(funnel.slug, date);
      setSlots(res.slots || []);
    } catch (err: any) {
      console.error(err);
      setSlotsError(err?.message || 'Failed to fetch available time slots.');
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleFieldChange = (field: string, val: string) => {
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      setSubmitError('Please select a date and time slot first.');
      return;
    }
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      setSubmitError('Please fill out your name, phone, and email address.');
      return;
    }
    if (!form.vehicle_year.trim() || !form.vehicle_make.trim() || !form.vehicle_model.trim()) {
      setSubmitError('Please fill out your vehicle year, make, and model.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.bookFunnelAppointment(funnel.slug, {
        name: form.name,
        phone: form.phone,
        email: form.email,
        vehicle_year: form.vehicle_year,
        vehicle_make: form.vehicle_make,
        vehicle_model: form.vehicle_model,
        date: selectedDate,
        time: selectedTime,
        notes: form.notes,
        company_website: form.company_website
      });
      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setSubmitError(err?.message || 'Failed to book appointment. Please try selecting a different slot or call us.');
    } finally {
      setSubmitting(false);
    }
  };

  // Pagination helper for the carousel (showing 5 days at a time on mobile, up to 7 on desktop)
  const visibleDays = days.slice(carouselStartIdx, carouselStartIdx + 5);

  const prevCarousel = () => {
    setCarouselStartIdx(prev => Math.max(0, prev - 1));
  };

  const nextCarousel = () => {
    setCarouselStartIdx(prev => Math.min(days.length - 5, prev + 1));
  };

  // Format date readable
  const formatReadableDate = (dateString: string) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Convert 24h slot "14:30" to "2:30 PM"
  const formatTimeSlot = (slot: string) => {
    if (!slot) return '';
    const [h, m] = slot.split(':');
    const hour = Number(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  if (embedded) {
    return (
      <div className="w-full text-slate-200 font-mono space-y-4">
        {/* Box 2 (embedded): Appointment Selectors */}
        <div className="relative bg-[#111218]/80 border border-emerald-500/20 rounded-lg overflow-hidden p-4 shadow-xl">
          {funnel.video_url ? (
            <>
              <video
                src={funnel.video_url}
                autoPlay
                muted
                loop
                playsInline
                style={{ opacity: getMediaOpacity(funnel, 'video_url', 75) }}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
              <div className="absolute inset-0 bg-[#0d0d18]/45" />
            </>
          ) : funnel.image_url ? (
            <>
              <img
                src={funnel.image_url}
                alt=""
                style={{ opacity: getMediaOpacity(funnel, 'image_url', 100) }}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-[#0d0d18]/45" />
            </>
          ) : null}

          <div className="relative z-10">
            {submitted ? (
              <div className="flex flex-col items-center text-center gap-4 py-6 animate-fade-in">
                <div className="p-3 bg-emerald-500/10 rounded-full border-2 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-black text-emerald-400 uppercase tracking-widest">Appointment Confirmed!</h3>
                  <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase tracking-wider">SMS / Email details dispatched</p>
                </div>
                <div className="bg-[#0c0d12]/90 border border-[#1e2028] rounded-xl p-3 w-full max-w-md text-left space-y-2.5 text-[11px]">
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="text-slate-500">Scheduled Date:</span>
                    <span className="text-white font-bold">{formatReadableDate(selectedDate)}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="text-slate-500">Scheduled Time:</span>
                    <span className="text-white font-bold">{formatTimeSlot(selectedTime)}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="text-slate-500">Vehicle:</span>
                    <span className="text-white font-bold">{[form.vehicle_year, form.vehicle_make, form.vehicle_model].join(' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Contact:</span>
                    <span className="text-white font-bold">{form.name} ({form.phone})</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 max-w-sm mt-1">
                  A confirmation has been sent via email/SMS. If you need to make changes, please contact the shop!
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* DATE SELECTION STEP */}
                <div className="space-y-2">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>1. Choose Date</span>
                  </h3>

                  {/* Day Carousel */}
                  <div className="relative flex items-center gap-1.5 bg-[#0c0d12]/90 border border-[#1e2028] p-2 rounded-xl">
                    <button
                      type="button"
                      onClick={prevCarousel}
                      disabled={carouselStartIdx === 0}
                      className="p-1 rounded bg-[#111218] text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex-1 grid grid-cols-5 gap-1 overflow-hidden">
                      {visibleDays.map(day => (
                        <button
                          key={day.dateStr}
                          type="button"
                          onClick={() => setSelectedDate(day.dateStr)}
                          className={`py-1.5 px-0.5 text-center rounded-lg border flex flex-col items-center justify-center transition cursor-pointer ${
                            selectedDate === day.dateStr
                              ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                              : 'bg-[#111218]/90 hover:bg-[#1a1b24] border-[#1e2028] text-slate-300'
                          }`}
                        >
                          <span className="text-[8px] uppercase tracking-wider font-bold opacity-75">{day.dayName}</span>
                          <span className="text-[10px] font-black mt-0.5">{day.label.split(' ')[1]}</span>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={nextCarousel}
                      disabled={carouselStartIdx >= days.length - 5}
                      className="p-1 rounded bg-[#111218] text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* TIME SLOT SELECTION STEP */}
                <div className="space-y-2">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>2. Select Time Slot</span>
                  </h3>

                  {slotsLoading ? (
                    <div className="py-4 flex flex-col items-center justify-center gap-1.5 text-[9px] text-slate-400">
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                      <span>FETCHING TIME SLOTS...</span>
                    </div>
                  ) : slotsError ? (
                    <div className="p-2.5 bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-lg text-[10px]">
                      {slotsError}
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="py-4 text-center border border-dashed border-[#1e2028] rounded-xl text-[11px] text-slate-500">
                      No slots available on {formatReadableDate(selectedDate)}.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {slots.map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedTime(slot)}
                          className={`py-2 px-1 text-center rounded-lg border text-[10px] font-bold transition cursor-pointer ${
                            selectedTime === slot
                              ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.35)] font-black'
                              : 'bg-[#0c0d12]/90 hover:bg-[#13141e] border-[#1e2028] text-slate-300'
                          }`}
                        >
                          {formatTimeSlot(slot)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Box 3 (embedded): Guest & Vehicle Details */}
        {selectedDate && selectedTime && !submitted && (
          <div className="relative bg-[#111218]/80 border border-emerald-500/20 rounded-lg overflow-hidden p-4 shadow-xl animate-fade-in">
            {funnel.secondary_video_url ? (
              <>
                <video
                  src={funnel.secondary_video_url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  style={{ opacity: getMediaOpacity(funnel, 'secondary_video_url', 75) }}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
                <div className="absolute inset-0 bg-[#0d0d18]/45" />
              </>
            ) : funnel.video_form_bg_image_url ? (
              <>
                <img
                  src={funnel.video_form_bg_image_url}
                  alt=""
                  style={{ opacity: getMediaOpacity(funnel, 'video_form_bg_image_url', 100) }}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-[#0d0d18]/45" />
              </>
            ) : null}

            <div className="relative z-10 space-y-4">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                <span>3. Guest & Vehicle Details</span>
              </h3>

              {submitError && (
                <div className="p-2.5 bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-lg text-[10px]">
                  {submitError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase tracking-wider mb-0.5 font-bold">
                    <User className="w-2.5 h-2.5" /> Name * <FieldCheck filled={form.name.trim().length > 0} />
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full rounded-lg bg-[#0c0d12]/90 border border-[#1e2028] focus:border-emerald-500 px-2.5 py-2 text-[11px] text-white focus:outline-none"
                    placeholder="Sarah Connor"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase tracking-wider mb-0.5 font-bold">
                    <Phone className="w-2.5 h-2.5" /> Phone * <FieldCheck filled={form.phone.trim().length > 0} />
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    className="w-full rounded-lg bg-[#0c0d12]/90 border border-[#1e2028] focus:border-emerald-500 px-2.5 py-2 text-[11px] text-white focus:outline-none"
                    placeholder="(555) 0199"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase tracking-wider mb-0.5 font-bold">
                  <Mail className="w-2.5 h-2.5" /> Email * <FieldCheck filled={form.email.trim().length > 0} />
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="w-full rounded-lg bg-[#0c0d12]/90 border border-[#1e2028] focus:border-emerald-500 px-2.5 py-2 text-[11px] text-white focus:outline-none"
                  placeholder="sconnor@cyberdyne.net"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase tracking-wider mb-0.5 font-bold">
                  <Car className="w-2.5 h-2.5" /> Vehicle * <FieldCheck filled={form.vehicle_year.trim().length > 0 && form.vehicle_make.trim().length > 0 && form.vehicle_model.trim().length > 0} />
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    required
                    value={form.vehicle_year}
                    onChange={(e) => handleFieldChange('vehicle_year', e.target.value)}
                    className="rounded-lg bg-[#0c0d12]/90 border border-[#1e2028] focus:border-emerald-500 px-2 py-1.5 text-[11px] text-white focus:outline-none"
                    placeholder="Year"
                  />
                  <input
                    type="text"
                    required
                    value={form.vehicle_make}
                    onChange={(e) => handleFieldChange('vehicle_make', e.target.value)}
                    className="rounded-lg bg-[#0c0d12]/90 border border-[#1e2028] focus:border-emerald-500 px-2 py-1.5 text-[11px] text-white focus:outline-none"
                    placeholder="Make"
                  />
                  <input
                    type="text"
                    required
                    value={form.vehicle_model}
                    onChange={(e) => handleFieldChange('vehicle_model', e.target.value)}
                    className="rounded-lg bg-[#0c0d12]/90 border border-[#1e2028] focus:border-emerald-500 px-2 py-1.5 text-[11px] text-white focus:outline-none"
                    placeholder="Model"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase tracking-wider mb-0.5 font-bold">
                  <MessageSquare className="w-2.5 h-2.5" /> Service Needed <FieldCheck filled={form.notes.trim().length > 0} />
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  className="w-full rounded-lg bg-[#0c0d12]/90 border border-[#1e2028] focus:border-emerald-500 px-2.5 py-2 text-[11px] text-white focus:outline-none resize-none"
                  placeholder="e.g. routine oil change..."
                />
              </div>

              {/* Honeypot field for bot protection */}
              <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
                <label htmlFor="company_website">Leave this blank</label>
                <input
                  type="text"
                  id="company_website"
                  name="company_website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.company_website}
                  onChange={(e) => handleFieldChange('company_website', e.target.value)}
                />
              </div>

              {/* Summary of Selected Time Slot before booking */}
              <div className="bg-[#0c0d12]/90 border border-emerald-500/20 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-[11px]">
                <div>
                  <div className="text-slate-500">Selected Appointment:</div>
                  <div className="text-white font-bold text-xs mt-0.5">
                    {formatReadableDate(selectedDate)} @ {formatTimeSlot(selectedTime)}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-black disabled:text-zinc-500 font-black rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-[1.015]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Booking...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      <span>Book Appointment</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-200 selection:bg-emerald-500/30 selection:text-white pb-16">
      {/* Header / Shop Branding */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur border-b-2 border-emerald-500/40 shadow-lg px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-12 h-12 rounded-md bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-widest uppercase font-mono text-white leading-none">
              WORKSHOP: RAGNARÖK
            </h1>
            <span className="text-[9px] uppercase font-mono text-emerald-400/80 tracking-wider">Self-Service Appointment Booking</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 mt-8 space-y-6">
        {/* Box 1: Funnel Copy Box */}
        <section className="relative bg-[#111218]/80 border-2 border-emerald-500/20 rounded-lg overflow-hidden shadow-2xl animate-fade-in p-6">
          {funnel.headline_bg_video_url ? (
            <>
              <video
                src={funnel.headline_bg_video_url}
                autoPlay
                muted
                loop
                playsInline
                style={{ opacity: getMediaOpacity(funnel, 'headline_bg_video_url', 75) }}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
              <div className="absolute inset-0 bg-[#0d0d18]/40" />
            </>
          ) : funnel.headline_bg_image_url ? (
            <>
              <img
                src={funnel.headline_bg_image_url}
                alt=""
                style={{ opacity: getMediaOpacity(funnel, 'headline_bg_image_url', 100) }}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-[#0d0d18]/40" />
            </>
          ) : null}

          <div className="relative space-y-3 font-mono z-10">
            {funnel.service_type && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-black uppercase tracking-widest border-2 bg-emerald-50 text-emerald-950 border-emerald-400">
                {funnel.service_type}
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight uppercase tracking-tight">
              {funnel.headline || 'Book Your Repair or Service Instantly'}
            </h2>
            {funnel.subheadline && (
              <p className="text-sm text-emerald-300/80 font-bold">{funnel.subheadline}</p>
            )}
            {funnel.body && (
              <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line pt-3 border-t border-white/10">
                {funnel.body}
              </p>
            )}
          </div>
        </section>

        {/* Box 2: Appointment Selectors */}
        <section className="relative bg-[#111218]/80 border-2 border-emerald-500/20 rounded-lg shadow-2xl overflow-hidden p-6 font-mono">
          {funnel.video_url ? (
            <>
              <video
                src={funnel.video_url}
                autoPlay
                muted
                loop
                playsInline
                style={{ opacity: getMediaOpacity(funnel, 'video_url', 75) }}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
              <div className="absolute inset-0 bg-[#0d0d18]/45" />
            </>
          ) : funnel.image_url ? (
            <>
              <img
                src={funnel.image_url}
                alt=""
                style={{ opacity: getMediaOpacity(funnel, 'image_url', 100) }}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-[#0d0d18]/45" />
            </>
          ) : null}

          <div className="relative z-10">
            {submitted ? (
              <div className="flex flex-col items-center text-center gap-4 py-8 animate-fade-in">
                <div className="p-4 bg-emerald-500/10 rounded-full border-2 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-emerald-400 uppercase tracking-widest">Appointment Confirmed!</h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">SMS / Email details dispatched</p>
                </div>
                <div className="bg-[#0c0d12]/90 border border-[#1e2028] rounded-xl p-4 w-full max-w-md text-left space-y-3 text-xs">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500">Scheduled Date:</span>
                    <span className="text-white font-bold">{formatReadableDate(selectedDate)}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500">Scheduled Time:</span>
                    <span className="text-white font-bold">{formatTimeSlot(selectedTime)}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500">Vehicle:</span>
                    <span className="text-white font-bold">{[form.vehicle_year, form.vehicle_make, form.vehicle_model].join(' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Contact:</span>
                    <span className="text-white font-bold">{form.name} ({form.phone})</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 max-w-sm mt-2">
                  Thank you for choosing Workshop: Ragnarök. A booking confirmation has been sent via email and text message. If you need to make changes, please reply to our message or call the shop!
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* DATE SELECTION STEP */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>1. Choose Date</span>
                  </h3>

                  {/* Day Carousel */}
                  <div className="relative flex items-center gap-1.5 bg-[#0c0d12]/90 border border-[#1e2028] p-3 rounded-xl">
                    <button
                      type="button"
                      onClick={prevCarousel}
                      disabled={carouselStartIdx === 0}
                      className="p-1 rounded bg-[#111218] text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex-1 grid grid-cols-5 gap-1.5 overflow-hidden">
                      {visibleDays.map(day => (
                        <button
                          key={day.dateStr}
                          type="button"
                          onClick={() => setSelectedDate(day.dateStr)}
                          className={`py-2 px-1 text-center rounded-lg border flex flex-col items-center justify-center transition cursor-pointer ${
                            selectedDate === day.dateStr
                              ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                              : 'bg-[#111218]/90 hover:bg-[#1a1b24] border-[#1e2028] text-slate-300'
                          }`}
                        >
                          <span className="text-[9px] uppercase tracking-wider font-bold opacity-75">{day.dayName}</span>
                          <span className="text-[11px] font-black mt-0.5">{day.label.split(' ')[1]}</span>
                          <span className="text-[8px] uppercase font-black opacity-50 mt-0.5">{day.label.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={nextCarousel}
                      disabled={carouselStartIdx >= days.length - 5}
                      className="p-1 rounded bg-[#111218] text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* TIME SLOT SELECTION STEP */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>2. Select Time Slot</span>
                  </h3>

                  {slotsLoading ? (
                    <div className="py-6 flex flex-col items-center justify-center gap-2 text-[10px] text-slate-400">
                      <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                      <span>FETCHING AVAILABLE HOURS...</span>
                    </div>
                  ) : slotsError ? (
                    <div className="p-3 bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-lg text-xs">
                      {slotsError}
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="py-6 text-center border border-dashed border-[#1e2028] rounded-xl text-xs text-slate-500">
                      The shop is closed or fully booked on {formatReadableDate(selectedDate)}. Please choose another date.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {slots.map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedTime(slot)}
                          className={`py-3 px-2 text-center rounded-lg border text-xs font-bold transition cursor-pointer ${
                            selectedTime === slot
                              ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.35)] font-black'
                              : 'bg-[#0c0d12]/90 hover:bg-[#13141e] border-[#1e2028] text-slate-300'
                          }`}
                        >
                          {formatTimeSlot(slot)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Box 3: Guest & Vehicle Details Form (shown when date & time selected) */}
        {selectedDate && selectedTime && !submitted && (
          <section className="relative bg-[#111218]/80 border-2 border-emerald-500/20 rounded-lg shadow-2xl overflow-hidden p-6 font-mono animate-fade-in">
            {funnel.secondary_video_url ? (
              <>
                <video
                  src={funnel.secondary_video_url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  style={{ opacity: getMediaOpacity(funnel, 'secondary_video_url', 75) }}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
                <div className="absolute inset-0 bg-[#0d0d18]/45" />
              </>
            ) : funnel.video_form_bg_image_url ? (
              <>
                <img
                  src={funnel.video_form_bg_image_url}
                  alt=""
                  style={{ opacity: getMediaOpacity(funnel, 'video_form_bg_image_url', 100) }}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-[#0d0d18]/45" />
              </>
            ) : null}

            <div className="relative z-10 space-y-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>3. Guest & Vehicle Details</span>
              </h3>

              {submitError && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-lg text-xs">
                  {submitError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">
                      <User className="w-3 h-3" /> Full Name * <FieldCheck filled={form.name.trim().length > 0} colorClass="text-emerald-400" />
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      className="w-full rounded-lg bg-[#0c0d12]/90 border border-[#1e2028] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                      placeholder="Sarah Connor"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">
                      <Phone className="w-3 h-3" /> Phone Number * <FieldCheck filled={form.phone.trim().length > 0} colorClass="text-emerald-400" />
                    </label>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      className="w-full rounded-lg bg-[#0c0d12]/90 border border-[#1e2028] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                      placeholder="(555) 0199"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">
                    <Mail className="w-3 h-3" /> Email Address * <FieldCheck filled={form.email.trim().length > 0} colorClass="text-emerald-400" />
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    className="w-full rounded-lg bg-[#0c0d12]/90 border border-[#1e2028] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                    placeholder="sconnor@cyberdyne.net"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">
                    <Car className="w-3 h-3" /> Vehicle Information * <FieldCheck filled={form.vehicle_year.trim().length > 0 && form.vehicle_make.trim().length > 0 && form.vehicle_model.trim().length > 0} colorClass="text-emerald-400" />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      required
                      value={form.vehicle_year}
                      onChange={(e) => handleFieldChange('vehicle_year', e.target.value)}
                      className="rounded-lg bg-[#0c0d12]/90 border border-[#1e2028] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                      placeholder="Year"
                    />
                    <input
                      type="text"
                      required
                      value={form.vehicle_make}
                      onChange={(e) => handleFieldChange('vehicle_make', e.target.value)}
                      className="rounded-lg bg-[#0c0d12]/90 border border-[#1e2028] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                      placeholder="Make"
                    />
                    <input
                      type="text"
                      required
                      value={form.vehicle_model}
                      onChange={(e) => handleFieldChange('vehicle_model', e.target.value)}
                      className="rounded-lg bg-[#0c0d12]/90 border border-[#1e2028] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                      placeholder="Model"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">
                    <MessageSquare className="w-3 h-3" /> Describe Service Needed <FieldCheck filled={form.notes.trim().length > 0} colorClass="text-emerald-400" />
                  </label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                    className="w-full rounded-lg bg-[#0c0d12]/90 border border-[#1e2028] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none resize-none"
                    placeholder="e.g. routine oil change, checking squeaking noise in front suspension, brake check..."
                  />
                </div>

                {/* Honeypot field for bot protection */}
                <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
                  <label htmlFor="company_website">Leave this blank</label>
                  <input
                    type="text"
                    id="company_website"
                    name="company_website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.company_website}
                    onChange={(e) => handleFieldChange('company_website', e.target.value)}
                  />
                </div>

                {/* Summary of Selected Time Slot before booking */}
                <div className="bg-[#0c0d12]/90 border border-emerald-500/20 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  <div>
                    <div className="text-slate-400">Selected Appointment Slot:</div>
                    <div className="text-white font-bold text-sm mt-0.5">
                      {formatReadableDate(selectedDate)} @ {formatTimeSlot(selectedTime)}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-black disabled:text-zinc-500 font-black rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-[1.015] active:scale-[0.98]"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Booking...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Book Appointment Now</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
