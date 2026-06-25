/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { GarageVehicle, Job, ServiceHistory, Vehicle } from '../types';
import { api } from '../lib/api';
import { 
  Search, Car, Wrench, ClipboardList, Database, BookOpen, Clock, 
  PlusCircle, RefreshCw, AlertTriangle, ChevronRight, Activity, Calendar
} from 'lucide-react';

interface DashboardViewProps {
  onSelectVehicle: (vehicle: Vehicle) => void;
  onNavigateToTab: (tab: 'dashboard' | 'browse' | 'garage' | 'jobs' | 'settings') => void;
  onNavigateToBrowseWithSearch: (initialSearchTerm?: string) => void;
  refreshTrigger: number;
}

export default function DashboardView({ 
  onSelectVehicle, 
  onNavigateToTab, 
  onNavigateToBrowseWithSearch, 
  refreshTrigger 
}: DashboardViewProps) {
  
  // Dashboard states
  const [garageCount, setGarageCount] = useState<number>(0);
  const [jobsCount, setJobsCount] = useState<number>(0);
  const [manualsCount, setManualsCount] = useState<number>(300000);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [recentLogs, setRecentLogs] = useState<{ log: ServiceHistory; vehicle: GarageVehicle }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual Quick Search state
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
      // 1. Fetch Stats
      const stats = await api.getStats();
      setGarageCount(stats.totalGarageVehicles);
      setJobsCount(stats.totalJobs);
      setManualsCount(stats.totalManuals);

      // 2. Fetch Active Jobs
      const jobs = await api.getJobs();
      setActiveJobs(jobs.slice(0, 3)); // show top 3 recent jobs

      // 3. Fetch Recent Service Logs across all garage vehicles
      const gVehicles = await api.getGarageVehicles();
      const logsAccum: { log: ServiceHistory; vehicle: GarageVehicle }[] = [];
      
      // Fetch logs for top vehicles to construct a global log shelf
      for (const v of gVehicles.slice(0, 4)) {
        try {
          const logs = await api.getServiceHistory(v.id);
          logs.forEach(l => {
            logsAccum.push({ log: l, vehicle: v });
          });
        } catch (e) {
          console.error(`Failed to load history for vehicle ${v.id}`, e);
        }
      }

      // Sort logs newest first
      logsAccum.sort((a, b) => b.log.date.localeCompare(a.log.date));
      setRecentLogs(logsAccum.slice(0, 4)); // show top 4 recent logs

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
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-6" id="dashboard-view-root">
      
      {/* 1. Overview Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="dashboard-stats-deck">
        
        {/* Total Stable Vehicles */}
        <div 
          onClick={() => onNavigateToTab('garage')}
          className="bg-gradient-to-b from-[#13141a] to-[#0f1015] border border-[#1e2028] hover:border-amber-500/50 hover:border-l-amber-500 border-l-[3px] border-l-[#1e2028] rounded-xl p-5 flex items-center justify-between transition-all duration-200 cursor-pointer shadow-lg group"
        >
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
              GARAGE STABLE
            </span>
            <span className="text-3xl font-black text-white font-mono block group-hover:text-amber-500 transition-colors">
              {garageCount}
            </span>
            <span className="text-xs text-slate-400 font-sans block">
              Manage personal vehicles & logs
            </span>
          </div>
          <div className="bg-[#1a1c24] p-3.5 rounded-lg border border-[#1e2028] text-amber-500 group-hover:scale-105 transition-transform duration-150">
            <Car className="w-6 h-6" />
          </div>
        </div>

        {/* Active Shop Jobs */}
        <div 
          onClick={() => onNavigateToTab('jobs')}
          className="bg-gradient-to-b from-[#13141a] to-[#0f1015] border border-[#1e2028] hover:border-amber-500/50 hover:border-l-amber-500 border-l-[3px] border-l-[#1e2028] rounded-xl p-5 flex items-center justify-between transition-all duration-200 cursor-pointer shadow-lg group"
        >
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
              ACTIVE SERVICE QUEUE
            </span>
            <span className="text-3xl font-black text-white font-mono block group-hover:text-amber-500 transition-colors">
              {jobsCount}
            </span>
            <span className="text-xs text-slate-400 font-sans block">
              Track ongoing repairs & parts lists
            </span>
          </div>
          <div className="bg-[#1a1c24] p-3.5 rounded-lg border border-[#1e2028] text-amber-500 group-hover:scale-105 transition-transform duration-150">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>

        {/* Indexed Service Manuals */}
        <div 
          onClick={() => onNavigateToTab('browse')}
          className="bg-gradient-to-b from-[#13141a] to-[#0f1015] border border-[#1e2028] hover:border-amber-500/50 hover:border-l-amber-500 border-l-[3px] border-l-[#1e2028] rounded-xl p-5 flex items-center justify-between transition-all duration-200 cursor-pointer shadow-lg group"
        >
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
              INDEXED MANUALS
            </span>
            <span className="text-3xl font-black text-white font-mono block group-hover:text-amber-500 transition-colors">
              {manualsCount?.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-sans block">
              Repair indexes & schematics
            </span>
          </div>
          <div className="bg-[#1a1c24] p-3.5 rounded-lg border border-[#1e2028] text-amber-500 group-hover:scale-105 transition-transform duration-150">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* 2. Interactive Manual Search Utility */}
      <div className="bg-[#13141a] border border-[#1e2028] rounded-xl p-6 md:p-8 space-y-5 shadow-2xl select-none">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-amber-500" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Quick Diagnostic Library Lookup
          </span>
        </div>

        <div className="bg-[#0a0a0f] border border-[#1e2028] rounded-xl p-3 flex flex-col sm:flex-row gap-3">
          {/* Keyword Field */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search make, model, or diagnostic code... e.g. Corvette, Civic, Spark plug"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg bg-[#13141a] border border-[#1e2028] focus:border-amber-500 pl-11 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition"
              id="dashboard-quick-search-input"
            />
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
          </div>

          {/* Make Filter Dropdown */}
          <select
            value={selectedMake}
            onChange={(e) => setSelectedMake(e.target.value)}
            className="bg-[#13141a] border border-[#1e2028] hover:border-slate-700 rounded-lg px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer transition md:w-52"
          >
            <option value="">All Manufacturers</option>
            {makes.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Live Search dropdown overlay details */}
        {(searchTerm || selectedMake) && (
          <div className="space-y-3.5 animate-fade-in border-t border-[#1e2028] pt-4" id="dashboard-live-search-results">
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>MATCHING MANUAL BLUEPRINTS ({vehicles.length})</span>
              {searchLoading && <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />}
            </div>

            {searchError ? (
              <p className="text-xs text-red-400 font-mono">Failed to communicate with manuals catalog server.</p>
            ) : vehicles.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No exact match manuals found. Try adjusting keywords.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => onSelectVehicle(v)}
                    className="bg-[#0a0a0f] border border-[#1e2028] hover:border-slate-700 rounded-lg p-3.5 flex items-center justify-between gap-3 transition cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono text-amber-500 font-bold block">
                        {v.year}
                      </span>
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-amber-500 truncate">
                        {v.make} {v.model}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">{v.engine}</p>
                    </div>
                    <BookOpen className="w-4 h-4 text-slate-500 group-hover:text-amber-500 transition-colors shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Bottom Row Split: Active Tickets & Recent Service Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Aspect: Active Tickets Board (40%) */}
        <div className="lg:col-span-5 bg-[#13141a] border border-[#1e2028] rounded-xl p-6 space-y-4 shadow-xl text-left flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2028] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-amber-500" />
                Active Repair Tickets Queue
              </h3>
              <button
                onClick={() => onNavigateToTab('jobs')}
                className="text-[10px] font-bold text-amber-500 hover:text-amber-400 uppercase tracking-widest font-mono"
              >
                View All
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">Querying open tickets...</div>
            ) : activeJobs.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No active service orders currently. All tickets completed.
              </div>
            ) : (
              <div className="space-y-3">
                {activeJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => onNavigateToTab('jobs')}
                    className="bg-[#0a0a0f]/60 hover:bg-[#0a0a0f] border border-[#1e2028] hover:border-slate-700 p-4 rounded-lg cursor-pointer transition space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">
                        Ticket #{job.id.toString().padStart(4, '0')}
                      </span>
                      <span className={`text-[8px] font-mono uppercase px-2 py-0.5 rounded border ${
                        job.status === 'Complete'
                          ? 'bg-green-950 text-green-400 border-green-800'
                          : job.status === 'In Progress'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-[#1a1c24] text-slate-400'
                      }`}>
                        {job.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-200">
                        {job.vehicle_year} {job.vehicle_make} {job.vehicle_model}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 truncate">{job.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateToTab('jobs')}
            className="w-full mt-4 bg-[#0a0a0f] hover:bg-[#1a1c24] text-slate-300 hover:text-white border border-[#1e2028] py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition text-center cursor-pointer flex items-center justify-center gap-1"
          >
            <span>Go to Active Jobs Queue</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right Aspect: Maintenance Logs shelf (60%) */}
        <div className="lg:col-span-7 bg-[#13141a] border border-[#1e2028] rounded-xl p-6 space-y-4 shadow-xl text-left flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2028] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-500" />
                Latest Garage Maintenance Logs
              </h3>
              <button
                onClick={() => onNavigateToTab('garage')}
                className="text-[10px] font-bold text-amber-500 hover:text-amber-400 uppercase tracking-widest font-mono"
              >
                Go to Garage
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">Querying maintenance files...</div>
            ) : recentLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No recent maintenance logs on file. Log service directly inside vehicle profiles in My Garage.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentLogs.map(({ log, vehicle }) => (
                  <div
                    key={log.id}
                    onClick={() => onNavigateToTab('garage')}
                    className="bg-[#0a0a0f]/60 hover:bg-[#0a0a0f] border border-[#1e2028] hover:border-slate-700 p-4 rounded-lg cursor-pointer transition space-y-2 text-left"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>{log.date}</span>
                      <span className="font-bold text-amber-500/80">{log.mileage?.toLocaleString()} mi</span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-200 truncate">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {log.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateToTab('garage')}
            className="w-full mt-4 bg-[#0a0a0f] hover:bg-[#1a1c24] text-slate-300 hover:text-white border border-[#1e2028] py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition text-center cursor-pointer flex items-center justify-center gap-1"
          >
            <span>Go to My Garage Stable</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
}
