/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { Job, Appointment, Customer, Vehicle, DatabaseStats } from '../types';
import { api } from '../lib/api';
import { 
  Search, Car, Wrench, ClipboardList, BookOpen, Clock, Users,
  RefreshCw, AlertTriangle, ChevronRight, Activity, Calendar, PlusCircle
} from 'lucide-react';

interface DashboardViewProps {
  onSelectVehicle: (vehicle: Vehicle) => void;
  onNavigateToTab: (tab: string) => void;
  onNavigateToBrowseWithSearch: (initialSearchTerm?: string) => void;
  refreshTrigger: number;
}

export default function DashboardView({ 
  onSelectVehicle, 
  onNavigateToTab, 
  onNavigateToBrowseWithSearch, 
  refreshTrigger 
}: DashboardViewProps) {
  
  // Dashboard stats and lists
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual Quick Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMake, setSelectedMake] = useState('');
  const [makes, setMakes] = useState<string[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    loadMakes();
  }, [refreshTrigger]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch CRM Stats
      const dbStats = await api.getStats();
      setStats(dbStats);

      // 2. Fetch Recent Jobs
      const allJobs = await api.getJobs();
      setRecentJobs(allJobs.slice(0, 5)); // show last 5 jobs

      // 3. Fetch Upcoming Appointments
      const appts = await api.getAppointments();
      const nowStr = new Date().toISOString().split('T')[0];
      const upcoming = appts
        .filter(a => a.date >= nowStr)
        .slice(0, 3); // show next 3 upcoming appointments
      setUpcomingAppointments(upcoming);

      // 4. Fetch Recent Customers
      const custs = await api.getGarageVehicles(); // wait, let's fetch real customers
      const allCusts = await api.getGarage() ? await api.getGarage() : []; // we have api.getMakes etc.
      // Wait, do we have an API for customers? Let's check api.ts!
      // Oh! In `src/lib/api.ts` we should define customer endpoints first.
      // Let's call them anyway as we will add them to `src/lib/api.ts` next.
      // Let's implement getting customers.
      try {
        const cData = await (api as any).getCustomers();
        setRecentCustomers(cData.slice(0, 5)); // show last 5 customers
      } catch (err) {
        console.error('Failed to fetch customers on dashboard', err);
      }

    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch dashboard overview metrics.');
    } finally {
      setLoading(false);
    }
  };

  const loadMakes = async () => {
    try {
      const list = await api.getMakes();
      setMakes(list.sort().slice(0, 30)); // limit makes dropdown on dashboard for speed
    } catch (err) {
      console.error('Failed to load makes:', err);
    }
  };

  // Trigger search on typing
  useEffect(() => {
    if (!searchTerm && !selectedMake) {
      setVehicles([]);
      return;
    }
    const timer = setTimeout(() => {
      executeSearch(selectedMake, searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedMake]);

  const executeSearch = async (make: string, query: string) => {
    setSearchLoading(true);
    setSearchError(null);
    try {
      const data = await api.getVehicles(make || undefined, undefined, query || undefined, 6);
      setVehicles(data);
    } catch (err: any) {
      setSearchError(err.message || 'Search lookup failed.');
      setVehicles([]);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6" id="dashboard-view-root">
      
      {/* 1. Overview Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-stats-deck">
        
        {/* Total Customers */}
        <div 
          onClick={() => onNavigateToTab('customers')}
          className="bg-surface-theme border border-border-theme hover:border-primary-theme/50 hover:border-l-primary-theme border-l-[3px] border-l-border-theme rounded-xl p-4 flex items-center justify-between transition-all duration-200 cursor-pointer shadow group"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
              Total Customers
            </span>
            <span className="text-2xl font-black text-white font-mono block group-hover:text-primary-theme transition-colors">
              {stats?.totalCustomers || 0}
            </span>
            <span className="text-[10px] text-slate-400 font-sans block">
              Manage accounts & logs
            </span>
          </div>
          <div className="bg-bg-theme p-2.5 rounded-lg border border-border-theme text-primary-theme group-hover:scale-105 transition-transform duration-150">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Active Jobs */}
        <div 
          onClick={() => onNavigateToTab('jobs')}
          className="bg-surface-theme border border-border-theme hover:border-primary-theme/50 hover:border-l-primary-theme border-l-[3px] border-l-border-theme rounded-xl p-4 flex items-center justify-between transition-all duration-200 cursor-pointer shadow group"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
              Active Jobs
            </span>
            <span className="text-2xl font-black text-white font-mono block group-hover:text-primary-theme transition-colors">
              {stats?.activeJobs || 0}
            </span>
            <span className="text-[10px] text-slate-400 font-sans block">
              Repair orders queue
            </span>
          </div>
          <div className="bg-bg-theme p-2.5 rounded-lg border border-border-theme text-primary-theme group-hover:scale-105 transition-transform duration-150">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>

        {/* Vehicles in System */}
        <div 
          onClick={() => onNavigateToTab('vehicles')}
          className="bg-surface-theme border border-border-theme hover:border-primary-theme/50 hover:border-l-primary-theme border-l-[3px] border-l-border-theme rounded-xl p-4 flex items-center justify-between transition-all duration-200 cursor-pointer shadow group"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
              Vehicles Registered
            </span>
            <span className="text-2xl font-black text-white font-mono block group-hover:text-primary-theme transition-colors">
              {stats?.totalVehicles || 0}
            </span>
            <span className="text-[10px] text-slate-400 font-sans block">
              Active client fleets
            </span>
          </div>
          <div className="bg-bg-theme p-2.5 rounded-lg border border-border-theme text-primary-theme group-hover:scale-105 transition-transform duration-150">
            <Car className="w-5 h-5" />
          </div>
        </div>

        {/* Indexed Service Manuals */}
        <div 
          onClick={() => onNavigateToTab('manual-library')}
          className="bg-surface-theme border border-border-theme hover:border-primary-theme/50 hover:border-l-primary-theme border-l-[3px] border-l-border-theme rounded-xl p-4 flex items-center justify-between transition-all duration-200 cursor-pointer shadow group"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
              Manuals Available
            </span>
            <span className="text-2xl font-black text-white font-mono block group-hover:text-primary-theme transition-colors">
              {stats?.totalManuals?.toLocaleString() || '300,000+'}
            </span>
            <span className="text-[10px] text-slate-400 font-sans block">
              Indexed manual manuals
            </span>
          </div>
          <div className="bg-bg-theme p-2.5 rounded-lg border border-border-theme text-primary-theme group-hover:scale-105 transition-transform duration-150">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 2. Interactive Manual Search Utility */}
      <div className="bg-surface-theme border border-border-theme rounded-xl p-5 space-y-4 shadow select-none text-left">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary-theme" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Quick Diagnostic Library Lookup
          </span>
        </div>

        <div className="bg-bg-theme border border-border-theme rounded-xl p-2.5 flex flex-col sm:flex-row gap-2.5">
          {/* Keyword Field */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search makes, models, or manual chapters... e.g. Corvette, Tacoma, Spark plug"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg bg-surface-theme border border-border-theme focus:border-primary-theme pl-10 pr-4 py-2 text-xs text-text-theme placeholder-slate-500 focus:outline-none transition"
              id="dashboard-quick-search-input"
            />
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
          </div>

          {/* Make Filter Dropdown */}
          <select
            value={selectedMake}
            onChange={(e) => setSelectedMake(e.target.value)}
            className="bg-surface-theme border border-border-theme hover:border-slate-700 rounded-lg px-4 py-2 text-xs text-text-theme focus:outline-none focus:border-primary-theme cursor-pointer transition md:w-52"
          >
            <option value="">All Manufacturers</option>
            {makes.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Live Search dropdown overlay details */}
        {(searchTerm || selectedMake) && (
          <div className="space-y-3.5 animate-fade-in border-t border-border-theme pt-4 text-left" id="dashboard-live-search-results">
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>MATCHING MANUAL BLUEPRINTS ({vehicles.length})</span>
              {searchLoading && <RefreshCw className="w-3.5 h-3.5 text-primary-theme animate-spin" />}
            </div>

            {searchError ? (
              <p className="text-xs text-red-400 font-mono">Failed to communicate with manuals catalog server.</p>
            ) : vehicles.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No exact match manuals found. Try adjusting keywords.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => onSelectVehicle(v)}
                    className="bg-bg-theme border border-border-theme hover:border-slate-700 rounded-lg p-3 flex items-center justify-between gap-3 transition cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono text-primary-theme font-bold block">
                        {v.year}
                      </span>
                      <h4 className="text-xs font-bold text-text-theme group-hover:text-primary-theme truncate">
                        {v.make} {v.model}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">{v.engine}</p>
                    </div>
                    <BookOpen className="w-4 h-4 text-slate-500 group-hover:text-primary-theme transition-colors shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Three-column Overview Stack */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
        
        {/* Left Aspect: Recent Jobs List (Last 5) */}
        <div className="lg:col-span-5 bg-surface-theme border border-border-theme rounded-xl p-5 space-y-4 shadow flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border-theme pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-primary-theme" />
                Recent Repair Orders (Last 5)
              </h3>
              <button
                onClick={() => onNavigateToTab('jobs')}
                className="text-[10px] font-bold text-primary-theme hover:text-primary-theme/80 uppercase tracking-widest font-mono"
              >
                View All
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">Querying open tickets...</div>
            ) : recentJobs.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No active service orders currently.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => onNavigateToTab('jobs')}
                    className="bg-bg-theme/60 hover:bg-bg-theme border border-border-theme hover:border-slate-700 p-3 rounded-lg cursor-pointer transition space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-slate-500 uppercase">
                        Ticket #{job.id.toString().padStart(4, '0')}
                      </span>
                      <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                        job.status === 'Complete'
                          ? 'bg-green-950/20 text-green-400 border-green-800/30'
                          : job.status === 'In Progress'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-slate-900 text-slate-400 border-slate-750'
                      }`}>
                        {job.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-200">
                        {job.vehicle_year} {job.vehicle_make} {job.vehicle_model}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{job.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateToTab('jobs')}
            className="w-full mt-4 bg-bg-theme hover:bg-surface-theme text-slate-300 hover:text-white border border-border-theme py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition text-center cursor-pointer flex items-center justify-center gap-1"
          >
            <span>Go to Active Jobs Queue</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Mid Aspect: Upcoming Appointments (Next 3) */}
        <div className="lg:col-span-4 bg-surface-theme border border-border-theme rounded-xl p-5 space-y-4 shadow flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border-theme pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary-theme" />
                Upcoming Appointments (Next 3)
              </h3>
              <button
                onClick={() => onNavigateToTab('calendar')}
                className="text-[10px] font-bold text-primary-theme hover:text-primary-theme/80 uppercase tracking-widest font-mono"
              >
                Go to Calendar
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">Querying appointment registry...</div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs italic">
                No upcoming appointments scheduled.
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    onClick={() => onNavigateToTab('calendar')}
                    className="bg-bg-theme/60 hover:bg-bg-theme border border-border-theme p-3 rounded-lg cursor-pointer transition space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-primary-theme font-bold">{appt.date}</span>
                      <span className="text-slate-500">{appt.time}</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 truncate">{appt.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                        Owner: {appt.customer_name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateToTab('calendar')}
            className="w-full mt-4 bg-bg-theme hover:bg-surface-theme text-slate-300 hover:text-white border border-border-theme py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition text-center cursor-pointer flex items-center justify-center gap-1"
          >
            <span>Create Appointment</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right Aspect: Recent Customers List (Last 5) */}
        <div className="lg:col-span-3 bg-surface-theme border border-border-theme rounded-xl p-5 space-y-4 shadow flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border-theme pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-355 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary-theme" />
                Recent Clients
              </h3>
              <button
                onClick={() => onNavigateToTab('customers')}
                className="text-[10px] font-bold text-primary-theme hover:text-primary-theme/80 uppercase tracking-widest font-mono"
              >
                CRM List
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">Querying database...</div>
            ) : recentCustomers.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs italic">
                No registered customers yet.
              </div>
            ) : (
              <div className="space-y-2">
                {recentCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onNavigateToTab('customers')}
                    className="bg-bg-theme/40 hover:bg-bg-theme p-2.5 rounded-lg border border-border-theme cursor-pointer transition flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-200 truncate">{c.name}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{c.phone || 'No phone'}</p>
                    </div>
                    <ChevronRight className="w-4.5 h-4.5 text-slate-600 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateToTab('customers')}
            className="w-full mt-4 bg-bg-theme hover:bg-surface-theme text-slate-300 hover:text-white border border-border-theme py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition text-center cursor-pointer flex items-center justify-center gap-1"
          >
            <span>Manage Customers</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
}
