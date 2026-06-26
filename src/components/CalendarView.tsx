import React, { useState, useEffect } from 'react';
import { Appointment, Customer, CustomerVehicle } from '../types';
import { api } from '../lib/api';
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, Clock, User, 
  Car, Trash2, Edit2, X, AlertTriangle, ChevronDown, CheckCircle
} from 'lucide-react';

export default function CalendarView() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal and form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDayAppointments, setSelectedDayAppointments] = useState<Appointment[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Form fields
  const [aCustomerId, setACustomerId] = useState('');
  const [aVehicleId, setAVehicleId] = useState('');
  const [aTitle, setATitle] = useState('');
  const [aDate, setADate] = useState('');
  const [aTime, setATime] = useState('09:00');
  const [aNotes, setANotes] = useState('');

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
    } catch (err) {
      console.error('Failed to load customers calendar dropdown:', err);
    }
  };

  // Date generation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDaysCount = new Date(year, month, 0).getDate();

  const calendarDays: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // 1. Fill previous month padding days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const prevMonthDate = new Date(year, month - 1, prevMonthDaysCount - i);
    const dateStr = prevMonthDate.toISOString().split('T')[0];
    calendarDays.push({
      dateStr,
      dayNum: prevMonthDaysCount - i,
      isCurrentMonth: false
    });
  }

  // 2. Fill current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    // Correct local date offset issues
    const yearStr = d.getFullYear();
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

    calendarDays.push({
      dateStr,
      dayNum: i,
      isCurrentMonth: true
    });
  }

  // 3. Fill next month padding days
  const remainingCells = 42 - calendarDays.length; // 6 rows of 7 = 42 cells standard
  for (let i = 1; i <= remainingCells; i++) {
    const nextMonthDate = new Date(year, month + 1, i);
    const dateStr = nextMonthDate.toISOString().split('T')[0];
    calendarDays.push({
      dateStr,
      dayNum: i,
      isCurrentMonth: false
    });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    const dayAppts = appointments.filter(a => a.date === dateStr);
    setSelectedDayAppointments(dayAppts);
    
    // Reset form for addition on that date
    setEditingAppointment(null);
    setACustomerId(customers.length > 0 ? customers[0].id.toString() : '');
    setAVehicleId('');
    setATitle('');
    setADate(dateStr);
    setATime('09:00');
    setANotes('');

    setIsModalOpen(true);
  };

  const handleEditAppointment = (appt: Appointment) => {
    setEditingAppointment(appt);
    setACustomerId(appt.customer_id.toString());
    setAVehicleId(appt.vehicle_id.toString());
    setATitle(appt.title);
    setADate(appt.date);
    setATime(appt.time);
    setANotes(appt.notes || '');
  };

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aCustomerId || !aVehicleId) {
      alert('Required customer and vehicle associations missing.');
      return;
    }

    const payload = {
      customer_id: parseInt(aCustomerId, 10),
      vehicle_id: parseInt(aVehicleId, 10),
      title: aTitle,
      date: aDate,
      time: aTime,
      duration_minutes: 60,
      notes: aNotes
    };

    try {
      if (editingAppointment) {
        await api.updateAppointment(editingAppointment.id, { ...editingAppointment, ...payload });
      } else {
        await api.addAppointment(payload);
      }
      setIsModalOpen(false);
      fetchAppointments();
    } catch (err: any) {
      alert(err.message || 'Failed to schedule appointment.');
    }
  };

  const handleDeleteAppointment = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel and delete this appointment?')) return;
    try {
      await api.deleteAppointment(id);
      setIsModalOpen(false);
      fetchAppointments();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment.');
    }
  };

  // Filter vehicles select options inside form
  const availableVehicles = vehicles.filter(v => v.customer_id.toString() === aCustomerId);

  // Sync default vehicle selection when customer changes
  useEffect(() => {
    if (availableVehicles.length > 0) {
      setAVehicleId(availableVehicles[0].id.toString());
    } else {
      setAVehicleId('');
    }
  }, [aCustomerId, vehicles]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6" id="calendar-view-container">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-theme pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-theme" />
            Shop Schedule Calendar
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Coordinate upcoming repairs, intake diagnostics, and active client appointments.
          </p>
        </div>

        {/* Month Selector Buttons */}
        <div className="flex items-center gap-2 bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-1.5 self-start select-none">
          <button 
            onClick={handlePrevMonth}
            className="p-2 hover:bg-bg-theme rounded text-slate-400 hover:text-white transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-black uppercase tracking-wider px-3 text-slate-200 min-w-[120px] text-center font-mono">
            {monthNames[month]} {year}
          </span>
          <button 
            onClick={handleNextMonth}
            className="p-2 hover:bg-bg-theme rounded text-slate-400 hover:text-white transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading && appointments.length === 0 ? (
        <div className="py-24 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
          <Calendar className="w-8 h-8 text-primary-theme animate-spin" />
          <span>Synchronizing schedules calendar...</span>
        </div>
      ) : (
        <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl overflow-hidden shadow-2xl">
          
          {/* Day Headers row */}
          <div className="grid grid-cols-7 text-center font-mono text-[10px] font-black uppercase tracking-widest text-slate-500 bg-bg-theme/40 border-b border-border-theme py-3 select-none">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Cells Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border-theme border-t border-border-theme bg-surface-theme">
            {calendarDays.map((cell, idx) => {
              const dayAppts = appointments.filter(a => a.date === cell.dateStr);
              const isToday = cell.dateStr === new Date().toISOString().split('T')[0];

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(cell.dateStr)}
                  className={`
                    min-h-[100px] p-2 flex flex-col justify-between transition cursor-pointer group text-left
                    ${cell.isCurrentMonth ? 'bg-transparent' : 'bg-bg-theme/10 opacity-30'}
                    ${isToday ? 'bg-primary-theme/5 border border-primary-theme/30' : 'hover:bg-bg-theme/30'}
                  `}
                >
                  <div className="flex items-center justify-between select-none">
                    <span className={`
                      text-xs font-bold font-mono px-1.5 py-0.5 rounded
                      ${isToday ? 'bg-primary-theme text-slate-950 font-black' : 'text-slate-400 group-hover:text-white'}
                    `}>
                      {cell.dayNum}
                    </span>
                    {dayAppts.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-primary-theme" />
                    )}
                  </div>

                  {/* Appointments indicators block list inside cell */}
                  <div className="mt-2 space-y-1 overflow-hidden">
                    {dayAppts.slice(0, 2).map((a) => (
                      <div
                        key={a.id}
                        className="bg-bg-theme border border-border-theme/80 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-300 truncate"
                        title={a.title}
                      >
                        {a.time} - {a.title}
                      </div>
                    ))}
                    {dayAppts.length > 2 && (
                      <div className="text-[8px] font-mono text-primary-theme italic text-right">
                        +{dayAppts.length - 2} more...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Appointment Day Details & Form Modal */}
      {isModalOpen && (
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
                    {selectedDayAppointments.map((appt) => (
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
                            <button
                              onClick={() => handleEditAppointment(appt)}
                              className="text-slate-400 hover:text-white p-0.5 rounded"
                              title="Edit appointment"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteAppointment(appt.id)}
                              className="text-slate-500 hover:text-red-400 p-0.5 rounded"
                              title="Cancel appointment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="text-left space-y-1.5">
                          <h4 className="text-xs font-bold text-slate-200">{appt.title}</h4>
                          <div className="text-[10px] text-slate-450 space-y-0.5">
                            <p className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>Owner: {appt.customer_name}</span>
                            </p>
                            <p className="flex items-center gap-1">
                              <Car className="w-3 h-3" />
                              <span>Fleet: {appt.vehicle_year} {appt.vehicle_make} {appt.vehicle_model}</span>
                            </p>
                          </div>
                          {appt.notes && (
                            <p className="text-[10px] text-slate-400 italic bg-bg-theme/40 p-2 border border-border-theme/40 rounded mt-2">
                              "{appt.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
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
                  {/* Customer Select */}
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

                  {/* Vehicle Select */}
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

                <div className="grid grid-cols-2 gap-4 text-left">
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
                </div>

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

                <div className="pt-2 border-t border-border-theme flex justify-end gap-3">
                  {editingAppointment && (
                    <button
                      type="button"
                      onClick={() => setEditingAppointment(null)}
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
        </div>
      )}

    </div>
  );
}
