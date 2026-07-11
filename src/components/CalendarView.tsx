import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Appointment, Customer, CustomerVehicle, Job, ShopSettings, AppointmentType, AppointmentRecurrence } from '../types';
import { api } from '../lib/api';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Clock, User,
  Car, Trash2, Edit2, X, ChevronDown, Wrench,
  Rss, Copy, ExternalLink, Repeat, ListChecks
} from 'lucide-react';

interface CalendarViewProps {
  onNavigateToJob?: (jobId: number) => void;
}

type ViewMode = 'month' | 'week' | 'day';

// Color chip for a job's lifecycle status — mirrors JobsView's badge colors so the
// calendar reads consistently with the rest of the app.
const JOB_STATUS_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
  'Pending': { bg: 'bg-slate-800/70', border: 'border-slate-600/50', text: 'text-slate-300', dot: 'bg-slate-400', label: 'Pending' },
  'In Progress': { bg: 'bg-primary-theme/15', border: 'border-primary-theme/40', text: 'text-primary-theme', dot: 'bg-primary-theme', label: 'In Progress' },
  'Complete': { bg: 'bg-green-950/40', border: 'border-green-700/40', text: 'text-green-400', dot: 'bg-green-500', label: 'Complete' },
  'Cancelled': { bg: 'bg-red-950/40', border: 'border-red-700/40', text: 'text-red-400', dot: 'bg-red-500', label: 'Cancelled' },
};

// Fallback color-coding by manually chosen appointment type, used only when no
// work order is linked (once linked, the job's own status takes over the color).
const APPT_TYPE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
  general: { bg: 'bg-slate-800/70', border: 'border-slate-600/50', text: 'text-slate-300', dot: 'bg-slate-400', label: 'General' },
  diagnostic: { bg: 'bg-blue-950/40', border: 'border-blue-700/40', text: 'text-blue-400', dot: 'bg-blue-500', label: 'Diagnostic' },
  repair: { bg: 'bg-amber-950/40', border: 'border-amber-700/40', text: 'text-amber-400', dot: 'bg-amber-500', label: 'Repair' },
  pickup: { bg: 'bg-purple-950/40', border: 'border-purple-700/40', text: 'text-purple-400', dot: 'bg-purple-500', label: 'Pickup' },
  consultation: { bg: 'bg-cyan-950/40', border: 'border-cyan-700/40', text: 'text-cyan-400', dot: 'bg-cyan-500', label: 'Consultation' },
};

function getApptColor(appt: Appointment) {
  if (appt.job_id && appt.job_status && JOB_STATUS_COLORS[appt.job_status]) {
    return JOB_STATUS_COLORS[appt.job_status];
  }
  return APPT_TYPE_COLORS[appt.appointment_type || 'general'];
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM - 8 PM

function formatHourLabel(hour: number) {
  const h = hour % 24;
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
}

function getHourBucket(time: string) {
  const hour = parseInt((time || '09:00').split(':')[0], 10);
  if (isNaN(hour)) return HOURS[0];
  if (hour < HOURS[0]) return HOURS[0];
  if (hour > HOURS[HOURS.length - 1]) return HOURS[HOURS.length - 1];
  return hour;
}

export default function CalendarView({ onNavigateToJob }: CalendarViewProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [unscheduledJobs, setUnscheduledJobs] = useState<Job[]>([]);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showUnscheduled, setShowUnscheduled] = useState(true);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [copiedFeedUrl, setCopiedFeedUrl] = useState(false);
  const [draggedApptId, setDraggedApptId] = useState<number | null>(null);

  // Modal and form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDayAppointments, setSelectedDayAppointments] = useState<Appointment[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [deleteSeriesPrompt, setDeleteSeriesPrompt] = useState(false);

  // Form fields
  const [aCustomerId, setACustomerId] = useState('');
  const [aVehicleId, setAVehicleId] = useState('');
  const [aJobId, setAJobId] = useState('');
  const [aType, setAType] = useState<AppointmentType>('general');
  const [aTitle, setATitle] = useState('');
  const [aDate, setADate] = useState('');
  const [aTime, setATime] = useState('09:00');
  const [aDuration, setADuration] = useState(60);
  const [aNotes, setANotes] = useState('');
  const [aRecurrence, setARecurrence] = useState<AppointmentRecurrence>('none');

  useEffect(() => {
    fetchAppointments();
    fetchAssociations();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const data = await api.getAppointments();
      setAppointments(data);
    } catch (err) {
      console.error('Failed to load appointments calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssociations = async () => {
    try {
      const custs = await api.getCustomers();
      setCustomers(custs);
      const vehs = await api.getVehiclesAll();
      setVehicles(vehs);
      const jobs = await api.getUnscheduledJobs();
      setUnscheduledJobs(jobs);
      const settings = await api.getShopSettings();
      setShopSettings(settings);
    } catch (err) {
      console.error('Failed to load customers/vehicles/jobs/settings for calendar:', err);
    }
  };

  const refreshAll = () => {
    fetchAppointments();
    fetchAssociations();
  };

  // Date generation helpers (month grid)
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDaysCount = new Date(year, month, 0).getDate();

  const calendarDays: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const prevMonthDate = new Date(year, month - 1, prevMonthDaysCount - i);
    calendarDays.push({
      dateStr: prevMonthDate.toISOString().split('T')[0],
      dayNum: prevMonthDaysCount - i,
      isCurrentMonth: false
    });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    calendarDays.push({ dateStr, dayNum: i, isCurrentMonth: true });
  }
  const remainingCells = 42 - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextMonthDate = new Date(year, month + 1, i);
    calendarDays.push({ dateStr: nextMonthDate.toISOString().split('T')[0], dayNum: i, isCurrentMonth: false });
  }

  // Week helper — the 7 dates of the week containing currentDate (Sun-Sat)
  const getWeekDates = (anchor: Date) => {
    const start = new Date(anchor);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };
  const weekDates = getWeekDates(currentDate);
  const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handlePrev = () => {
    if (viewMode === 'month') setCurrentDate(new Date(year, month - 1, 1));
    else if (viewMode === 'week') { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }
    else { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d); }
  };
  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate(new Date(year, month + 1, 1));
    else if (viewMode === 'week') { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }
    else { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d); }
  };
  const handleToday = () => setCurrentDate(new Date());

  const resetFormForNew = (dateStr: string) => {
    setEditingAppointment(null);
    setACustomerId(customers.length > 0 ? customers[0].id.toString() : '');
    setAVehicleId('');
    setAJobId('');
    setAType('general');
    setATitle('');
    setADate(dateStr);
    setATime('09:00');
    setADuration(60);
    setANotes('');
    setARecurrence('none');
    setDeleteSeriesPrompt(false);
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setSelectedDayAppointments(appointments.filter(a => a.date === dateStr));
    resetFormForNew(dateStr);
    setIsModalOpen(true);
  };

  const handleEditAppointment = (appt: Appointment) => {
    setEditingAppointment(appt);
    setACustomerId(appt.customer_id.toString());
    setAVehicleId(appt.vehicle_id.toString());
    setAJobId(appt.job_id ? appt.job_id.toString() : '');
    setAType((appt.appointment_type as AppointmentType) || 'general');
    setATitle(appt.title);
    setADate(appt.date);
    setATime(appt.time);
    setADuration(appt.duration_minutes || 60);
    setANotes(appt.notes || '');
    setARecurrence('none'); // editing never re-triggers series generation
    setDeleteSeriesPrompt(false);
  };

  // Clicking an appointment anywhere (month chip, week/day block) opens the same
  // modal, pre-loaded for editing that entry.
  const handleApptClick = (appt: Appointment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedDateStr(appt.date);
    setSelectedDayAppointments(appointments.filter(a => a.date === appt.date));
    handleEditAppointment(appt);
    setIsModalOpen(true);
  };

  // "Schedule" from the Unscheduled Jobs panel — pre-fills the form from a job.
  const handleScheduleJob = (job: Job) => {
    const todayStr = toDateStr(new Date());
    setSelectedDateStr(todayStr);
    setSelectedDayAppointments(appointments.filter(a => a.date === todayStr));
    setEditingAppointment(null);
    setACustomerId(job.customer_id ? job.customer_id.toString() : '');
    setAVehicleId(job.vehicle_id ? job.vehicle_id.toString() : '');
    setAJobId(job.id.toString());
    setAType('repair');
    setATitle(job.description ? job.description.split('\n')[0].slice(0, 80) : `Work order #${job.id}`);
    setADate(todayStr);
    setATime('09:00');
    setADuration(60);
    setANotes('');
    setARecurrence('none');
    setDeleteSeriesPrompt(false);
    setIsModalOpen(true);
  };

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aCustomerId || !aVehicleId) {
      alert('Required customer and vehicle associations missing.');
      return;
    }

    const payload: any = {
      customer_id: parseInt(aCustomerId, 10),
      vehicle_id: parseInt(aVehicleId, 10),
      job_id: aJobId ? parseInt(aJobId, 10) : null,
      appointment_type: aType,
      title: aTitle,
      date: aDate,
      time: aTime,
      duration_minutes: aDuration,
      notes: aNotes,
    };

    try {
      if (editingAppointment) {
        await api.updateAppointment(editingAppointment.id, { ...editingAppointment, ...payload });
      } else {
        await api.addAppointment({ ...payload, recurrence: aRecurrence });
      }
      setIsModalOpen(false);
      refreshAll();
    } catch (err: any) {
      alert(err.message || 'Failed to schedule appointment.');
    }
  };

  const handleDeleteAppointment = async (id: number, deleteSeries?: boolean) => {
    const confirmMsg = deleteSeries
      ? 'Delete this ENTIRE recurring series? This removes every future occurrence.'
      : 'Are you sure you want to cancel and delete this appointment?';
    if (!window.confirm(confirmMsg)) return;
    try {
      if (deleteSeries) {
        await api.deleteAppointmentSeries(id);
      } else {
        await api.deleteAppointment(id);
      }
      setIsModalOpen(false);
      refreshAll();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment.');
    }
  };

  // Drag-and-drop rescheduling (month view) — drop an appointment chip onto a
  // different day cell to move it there.
  const handleDropOnDay = async (dateStr: string) => {
    if (draggedApptId == null) return;
    const appt = appointments.find(a => a.id === draggedApptId);
    setDraggedApptId(null);
    if (!appt || appt.date === dateStr) return;
    try {
      await api.updateAppointment(appt.id, { ...appt, date: dateStr });
      refreshAll();
    } catch (err: any) {
      alert(err.message || 'Failed to reschedule appointment.');
    }
  };

  // Filter vehicles select options inside form
  const availableVehicles = vehicles.filter(v => v.customer_id.toString() === aCustomerId);
  const availableJobsForCustomer = unscheduledJobs.filter(j => j.customer_id.toString() === aCustomerId);

  useEffect(() => {
    if (availableVehicles.length > 0 && !editingAppointment) {
      setAVehicleId(availableVehicles[0].id.toString());
    } else if (availableVehicles.length === 0) {
      setAVehicleId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aCustomerId, vehicles]);

  // --- Capacity helpers ---
  const dailyCapacityMinutes = (shopSettings?.daily_capacity_hours || 8) * 60;
  const getDayCapacity = (dateStr: string) => {
    const dayAppts = appointments.filter(a => a.date === dateStr);
    const totalMinutes = dayAppts.reduce((sum, a) => sum + (a.duration_minutes || 60), 0);
    const ratio = dailyCapacityMinutes > 0 ? totalMinutes / dailyCapacityMinutes : 0;
    let barColor = 'bg-green-500';
    if (ratio >= 1) barColor = 'bg-red-500';
    else if (ratio >= 0.6) barColor = 'bg-amber-500';
    return { totalMinutes, ratio: Math.min(ratio, 1), barColor };
  };

  // --- iCal subscribe URL ---
  const feedUrl = shopSettings?.ical_token
    ? `${window.location.origin}/api/calendar-feed/${shopSettings.ical_token}.ics`
    : '';
  const handleCopyFeedUrl = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopiedFeedUrl(true);
      setTimeout(() => setCopiedFeedUrl(false), 2000);
    } catch {
      // Clipboard API can fail silently in some contexts — no-op, the field is still selectable.
    }
  };

  const headerLabel = viewMode === 'month'
    ? `${monthNames[month]} ${year}`
    : viewMode === 'week'
      ? `${monthNames[weekDates[0].getMonth()]} ${weekDates[0].getDate()} – ${monthNames[weekDates[6].getMonth()]} ${weekDates[6].getDate()}, ${weekDates[6].getFullYear()}`
      : `${dayNamesShort[currentDate.getDay()]}, ${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;

  return (
    <div className="space-y-6 w-full max-w-[1500px] mx-auto px-4 py-6" id="calendar-view-container">

      {/* Header Panel */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-border-theme pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-theme" />
            Shop Schedule Calendar
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Coordinate upcoming repairs, intake diagnostics, and active client appointments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-1 select-none">
            {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${viewMode === mode ? 'bg-primary-theme text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Prev/Next/Today */}
          <div className="flex items-center gap-2 bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-1.5 self-start select-none">
            <button onClick={handlePrev} className="p-2 hover:bg-bg-theme rounded text-slate-400 hover:text-white transition cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black uppercase tracking-wider px-3 text-slate-200 min-w-[140px] text-center font-mono">
              {headerLabel}
            </span>
            <button onClick={handleNext} className="p-2 hover:bg-bg-theme rounded text-slate-400 hover:text-white transition cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={handleToday} className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-theme hover:bg-bg-theme rounded transition cursor-pointer border-l border-border-theme ml-1">
              Today
            </button>
          </div>

          <button
            onClick={() => setShowSubscribe(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:border-primary-theme/40 transition cursor-pointer"
          >
            <Rss className="w-3.5 h-3.5 text-primary-theme" />
            Subscribe
          </button>
        </div>
      </div>

      {/* iCal subscribe panel */}
      {showSubscribe && (
        <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Rss className="w-4 h-4 text-primary-theme shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Sync to your calendar app</p>
            <input
              readOnly
              value={feedUrl || 'Loading feed URL...'}
              onFocus={(e) => e.target.select()}
              className="w-full bg-bg-theme border border-border-theme rounded px-3 py-1.5 text-xs font-mono text-slate-300"
            />
          </div>
          <button
            onClick={handleCopyFeedUrl}
            disabled={!feedUrl}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary-theme hover:bg-primary-theme/90 text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer disabled:opacity-40"
          >
            <Copy className="w-3.5 h-3.5" />
            {copiedFeedUrl ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">

        {/* Main calendar area */}
        {loading && appointments.length === 0 ? (
          <div className="py-24 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
            <Calendar className="w-8 h-8 text-primary-theme animate-spin" />
            <span>Synchronizing schedules calendar...</span>
          </div>
        ) : viewMode === 'month' ? (
          <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl overflow-hidden shadow-2xl">
            <div className="grid grid-cols-7 text-center font-mono text-[10px] font-black uppercase tracking-widest text-slate-500 bg-bg-theme/40 border-b border-border-theme py-3 select-none">
              {dayNamesShort.map(d => <div key={d}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-border-theme border-t border-border-theme bg-surface-theme">
              {calendarDays.map((cell, idx) => {
                const dayAppts = appointments.filter(a => a.date === cell.dateStr);
                const isToday = cell.dateStr === toDateStr(new Date());
                const capacity = getDayCapacity(cell.dateStr);

                return (
                  <div
                    key={idx}
                    onClick={() => handleDayClick(cell.dateStr)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleDropOnDay(cell.dateStr); }}
                    className={`
                      min-h-[140px] p-2 flex flex-col justify-between transition cursor-pointer group text-left
                      ${cell.isCurrentMonth ? 'bg-transparent' : 'bg-bg-theme/10 opacity-30'}
                      ${isToday ? 'bg-primary-theme/5 border border-primary-theme/30' : 'hover:bg-bg-theme/30'}
                    `}
                  >
                    <div className="flex items-center justify-between select-none">
                      <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${isToday ? 'bg-primary-theme text-slate-950 font-black' : 'text-slate-400 group-hover:text-white'}`}>
                        {cell.dayNum}
                      </span>
                      {dayAppts.length > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-10 h-1.5 bg-bg-theme rounded-full overflow-hidden" title={`${Math.round(capacity.ratio * 100)}% of daily capacity booked`}>
                            <div className={`h-full ${capacity.barColor}`} style={{ width: `${capacity.ratio * 100}%` }} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 space-y-1 overflow-hidden">
                      {dayAppts.slice(0, 3).map((a) => {
                        const c = getApptColor(a);
                        return (
                          <div
                            key={a.id}
                            draggable
                            onDragStart={(e) => { e.stopPropagation(); setDraggedApptId(a.id); }}
                            onClick={(e) => handleApptClick(a, e)}
                            className={`${c.bg} ${c.border} border rounded px-1.5 py-0.5 text-[9px] font-mono font-bold ${c.text} truncate flex items-center gap-1 cursor-grab active:cursor-grabbing`}
                            title={`${a.title}${a.job_id ? ` — ${a.job_status}` : ''}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${c.dot} shrink-0`} />
                            {a.time} - {a.title}
                          </div>
                        );
                      })}
                      {dayAppts.length > 3 && (
                        <div className="text-[8px] font-mono text-primary-theme italic text-right">
                          +{dayAppts.length - 3} more...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === 'week' ? (
          <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl overflow-hidden shadow-2xl overflow-x-auto">
            <div className="grid grid-cols-[60px_repeat(7,minmax(120px,1fr))] min-w-[900px]">
              <div className="border-b border-r border-border-theme bg-bg-theme/40" />
              {weekDates.map((d) => {
                const dateStr = toDateStr(d);
                const isToday = dateStr === toDateStr(new Date());
                return (
                  <div
                    key={dateStr}
                    onClick={() => handleDayClick(dateStr)}
                    className={`text-center font-mono text-[10px] font-black uppercase tracking-widest py-3 border-b border-l border-border-theme cursor-pointer hover:bg-bg-theme/30 ${isToday ? 'bg-primary-theme/10 text-primary-theme' : 'bg-bg-theme/40 text-slate-500'}`}
                  >
                    {dayNamesShort[d.getDay()]} <span className="text-slate-300">{d.getDate()}</span>
                  </div>
                );
              })}

              {HOURS.map((hour) => (
                <React.Fragment key={hour}>
                  <div className="border-r border-b border-border-theme text-[9px] font-mono text-slate-500 text-right pr-2 py-2">
                    {formatHourLabel(hour)}
                  </div>
                  {weekDates.map((d) => {
                    const dateStr = toDateStr(d);
                    const hourAppts = appointments.filter(a => a.date === dateStr && getHourBucket(a.time) === hour);
                    return (
                      <div
                        key={`${dateStr}-${hour}`}
                        onClick={() => handleDayClick(dateStr)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); handleDropOnDay(dateStr); }}
                        className="border-l border-b border-border-theme min-h-[44px] p-1 space-y-1 cursor-pointer hover:bg-bg-theme/20 transition"
                      >
                        {hourAppts.map((a) => {
                          const c = getApptColor(a);
                          return (
                            <div
                              key={a.id}
                              draggable
                              onDragStart={(e) => { e.stopPropagation(); setDraggedApptId(a.id); }}
                              onClick={(e) => handleApptClick(a, e)}
                              className={`${c.bg} ${c.border} border rounded px-1.5 py-0.5 text-[9px] font-mono font-bold ${c.text} truncate cursor-grab active:cursor-grabbing`}
                              title={a.title}
                            >
                              {a.time} {a.title}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl overflow-hidden shadow-2xl">
            <div className="grid grid-cols-[70px_1fr]">
              {HOURS.map((hour) => {
                const dateStr = toDateStr(currentDate);
                const hourAppts = appointments.filter(a => a.date === dateStr && getHourBucket(a.time) === hour);
                return (
                  <React.Fragment key={hour}>
                    <div className="border-r border-b border-border-theme text-[10px] font-mono text-slate-500 text-right pr-2 py-3">
                      {formatHourLabel(hour)}
                    </div>
                    <div
                      onClick={() => handleDayClick(dateStr)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); handleDropOnDay(dateStr); }}
                      className="border-b border-border-theme min-h-[56px] p-2 space-y-1.5 cursor-pointer hover:bg-bg-theme/20 transition"
                    >
                      {hourAppts.map((a) => {
                        const c = getApptColor(a);
                        return (
                          <div
                            key={a.id}
                            draggable
                            onDragStart={(e) => { e.stopPropagation(); setDraggedApptId(a.id); }}
                            onClick={(e) => handleApptClick(a, e)}
                            className={`${c.bg} ${c.border} border rounded-lg px-3 py-2 text-xs font-bold ${c.text} cursor-grab active:cursor-grabbing flex items-center justify-between gap-2`}
                          >
                            <span className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${c.dot} shrink-0`} />
                              {a.time} — {a.title}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400 truncate">{a.customer_name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Unscheduled Jobs sidebar */}
        <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl shadow-xl overflow-hidden">
          <button
            onClick={() => setShowUnscheduled(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 border-b border-border-theme bg-bg-theme/40 cursor-pointer"
          >
            <span className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <ListChecks className="w-4 h-4 text-primary-theme" />
              Unscheduled Jobs ({unscheduledJobs.length})
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showUnscheduled ? 'rotate-180' : ''}`} />
          </button>
          {showUnscheduled && (
            <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
              {unscheduledJobs.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs italic">
                  Nothing waiting — every open job has a slot on the calendar.
                </div>
              ) : (
                unscheduledJobs.map((job) => (
                  <div key={job.id} className="bg-bg-theme/60 border border-border-theme rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">#{job.id} · {job.status}</span>
                      <Wrench className="w-3 h-3 text-primary-theme shrink-0" />
                    </div>
                    <p className="text-xs font-bold text-slate-200 truncate">{job.customer_name || 'Unknown customer'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{job.vehicle_year} {job.vehicle_make} {job.vehicle_model}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-2">{job.description}</p>
                    <button
                      onClick={() => handleScheduleJob(job)}
                      className="w-full mt-1 flex items-center justify-center gap-1.5 bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-black px-3 py-1.5 rounded text-[10px] uppercase tracking-wider transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Schedule
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Appointment Day Details & Form Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
          <div className="w-full max-w-4xl rounded-xl border border-border-theme bg-surface-theme text-slate-100 overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-12">

            {/* Left Drawer aspect: Appointments scheduled for clicked day */}
            <div className="md:col-span-5 bg-bg-theme p-5 border-r border-border-theme flex flex-col justify-between max-h-[80vh] overflow-y-auto">
              <div className="space-y-4">
                <div className="border-b border-border-theme pb-2.5 text-left">
                  <span className="text-[10px] font-mono text-primary-theme font-bold">SCHEDULER LOG</span>
                  <h3 className="text-sm font-black text-white uppercase font-mono mt-1">
                    {selectedDateStr}
                  </h3>
                </div>

                {selectedDayAppointments.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs italic">
                    No diagnostics or repairs scheduled on this day. Use the form to book.
                  </div>
                ) : (
                  <div className="space-y-3" id="scheduled-day-appointments-list">
                    {selectedDayAppointments.map((appt) => {
                      const c = getApptColor(appt);
                      return (
                        <div
                          key={appt.id}
                          className="bg-surface-theme border border-border-theme rounded-xl p-4 space-y-3 relative group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-primary-theme font-bold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {appt.time}
                            </span>
                            <div className="flex gap-1.5 opacity-60 hover:opacity-100 transition">
                              <button onClick={() => handleEditAppointment(appt)} className="text-slate-400 hover:text-white p-0.5 rounded" title="Edit appointment">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleDeleteAppointment(appt.id)} className="text-slate-500 hover:text-red-400 p-0.5 rounded" title="Cancel appointment">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="text-left space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${c.bg} ${c.text} border ${c.border}`}>{c.label}</span>
                              <h4 className="text-xs font-bold text-slate-200">{appt.title}</h4>
                            </div>
                            <div className="text-[10px] text-slate-450 space-y-0.5">
                              <p className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>Owner: {appt.customer_name}</span>
                              </p>
                              <p className="flex items-center gap-1">
                                <Car className="w-3 h-3" />
                                <span>Fleet: {appt.vehicle_year} {appt.vehicle_make} {appt.vehicle_model}</span>
                              </p>
                              {appt.recurrence && appt.recurrence !== 'none' && (
                                <p className="flex items-center gap-1 text-primary-theme">
                                  <Repeat className="w-3 h-3" />
                                  <span>Recurring: {appt.recurrence}</span>
                                </p>
                              )}
                            </div>
                            {appt.notes && (
                              <p className="text-[10px] text-slate-400 italic bg-bg-theme/40 p-2 border border-border-theme/40 rounded mt-2">
                                "{appt.notes}"
                              </p>
                            )}
                            {appt.job_id && onNavigateToJob && (
                              <button
                                onClick={() => onNavigateToJob(appt.job_id!)}
                                className="w-full mt-1 flex items-center justify-center gap-1.5 border border-primary-theme/40 text-primary-theme hover:bg-primary-theme/10 px-3 py-1.5 rounded text-[10px] uppercase tracking-wider font-bold transition cursor-pointer"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Open Work Order
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full bg-surface-theme hover:bg-slate-800 text-slate-300 hover:text-white py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition border border-border-theme cursor-pointer mt-4"
              >
                Close Drawer
              </button>
            </div>

            {/* Right Drawer aspect: Add/Edit Appointment form */}
            <div className="md:col-span-7 p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-border-theme pb-3 mb-4 text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  {editingAppointment ? 'Modify Scheduled Entry' : 'Schedule Diagnostic / Intake'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white md:hidden">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAppointment} className="space-y-4">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Associated Client *</label>
                    <select
                      required
                      value={aCustomerId}
                      onChange={(e) => setACustomerId(e.target.value)}
                      className="w-full rounded bg-bg-theme border border-border-theme text-slate-205 text-text-theme text-sm px-3 py-2.5 focus:border-primary-theme focus:outline-none cursor-pointer"
                    >
                      <option value="" disabled>Select Customer...</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id.toString()}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Target Vehicle *</label>
                    <select
                      required
                      value={aVehicleId}
                      onChange={(e) => setAVehicleId(e.target.value)}
                      disabled={!aCustomerId || availableVehicles.length === 0}
                      className="w-full rounded bg-bg-theme border border-border-theme text-slate-205 text-text-theme text-sm px-3 py-2.5 focus:border-primary-theme focus:outline-none disabled:opacity-40 cursor-pointer"
                    >
                      <option value="" disabled>Select Vehicle...</option>
                      {availableVehicles.map((v) => (
                        <option key={v.id} value={v.id.toString()}>{v.year} {v.make} {v.model}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Appointment Type</label>
                    <select
                      value={aType}
                      onChange={(e) => setAType(e.target.value as AppointmentType)}
                      disabled={!!aJobId}
                      className="w-full rounded bg-bg-theme border border-border-theme text-sm px-3 py-2.5 focus:border-primary-theme focus:outline-none disabled:opacity-40 cursor-pointer"
                    >
                      {Object.entries(APPT_TYPE_COLORS).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                    {aJobId && <p className="text-[9px] text-slate-500">Color follows the linked work order's status instead.</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400 flex items-center gap-1">
                      <Wrench className="w-3 h-3" /> Link Work Order (optional)
                    </label>
                    <select
                      value={aJobId}
                      onChange={(e) => setAJobId(e.target.value)}
                      className="w-full rounded bg-bg-theme border border-border-theme text-sm px-3 py-2.5 focus:border-primary-theme focus:outline-none cursor-pointer"
                    >
                      <option value="">No linked job</option>
                      {editingAppointment && editingAppointment.job_id && !availableJobsForCustomer.some(j => j.id === editingAppointment.job_id) && (
                        <option value={editingAppointment.job_id.toString()}>#{editingAppointment.job_id} (currently linked)</option>
                      )}
                      {availableJobsForCustomer.map((j) => (
                        <option key={j.id} value={j.id.toString()}>#{j.id} — {j.description?.split('\n')[0].slice(0, 40)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Appointment Title / Concern *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Brake Replacement & Rotor Turning"
                    value={aTitle}
                    onChange={(e) => setATitle(e.target.value)}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 text-left">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Intake Date</label>
                    <input
                      type="date"
                      required
                      value={aDate}
                      onChange={(e) => setADate(e.target.value)}
                      className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Arrival Time</label>
                    <input
                      type="time"
                      required
                      value={aTime}
                      onChange={(e) => setATime(e.target.value)}
                      className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Duration (min)</label>
                    <input
                      type="number"
                      min={15}
                      step={15}
                      required
                      value={aDuration}
                      onChange={(e) => setADuration(parseInt(e.target.value, 10) || 60)}
                      className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {!editingAppointment && (
                  <div className="space-y-1.5 text-left">
                    <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400 flex items-center gap-1">
                      <Repeat className="w-3 h-3" /> Repeats
                    </label>
                    <select
                      value={aRecurrence}
                      onChange={(e) => setARecurrence(e.target.value as AppointmentRecurrence)}
                      className="w-full rounded bg-bg-theme border border-border-theme text-sm px-3 py-2.5 focus:border-primary-theme focus:outline-none cursor-pointer"
                    >
                      <option value="none">Does not repeat</option>
                      <option value="weekly">Weekly (next 8 occurrences)</option>
                      <option value="monthly">Monthly (next 12 occurrences)</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1.5 text-left">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Administrative scheduler Notes / Memo</label>
                  <textarea
                    placeholder="Provide details about customer drop-off key, towing required, preferred diagnostics lube..."
                    value={aNotes}
                    onChange={(e) => setANotes(e.target.value)}
                    rows={4}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-202 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2 border-t border-border-theme flex flex-wrap justify-end gap-3">
                  {editingAppointment && editingAppointment.recurrence_group_id && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAppointment(editingAppointment.id, true)}
                      className="px-4 py-2 text-xs font-semibold text-red-400 hover:text-red-300 uppercase flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Entire Series
                    </button>
                  )}
                  {editingAppointment && (
                    <button
                      type="button"
                      onClick={() => resetFormForNew(selectedDateStr)}
                      className="px-4 py-2 text-xs font-semibold text-slate-450 hover:text-slate-200 uppercase"
                    >
                      Clear form
                    </button>
                  )}
                  <button
                    type="submit"
                    className="rounded-lg bg-primary-theme hover:bg-primary-theme/90 text-slate-950 px-5 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    {editingAppointment ? 'Update Scheduled Entry' : 'Schedule Intake'}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
