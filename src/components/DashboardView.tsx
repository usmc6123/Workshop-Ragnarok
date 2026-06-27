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

  // Universal Search States & Setup
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [vehicleResults, setVehicleResults] = useState<Vehicle[]>([]);
  const [procedureResults, setProcedureResults] = useState<{ title: string; href: string; vehicle: Vehicle }[]>([]);
  
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDashboardData();
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

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounced search trigger
  useEffect(() => {
    if (!searchTerm.trim()) {
      setVehicleResults([]);
      setProcedureResults([]);
      setDropdownOpen(false);
      return;
    }
    const timer = setTimeout(() => {
      executeSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const ALIAS_MAP: { [key: string]: string } = {
    chevy: 'Chevrolet',
    vw: 'Volkswagen',
    benz: 'Mercedes Benz',
    dodge: 'Dodge and RAM',
    ram: 'Dodge and RAM'
  };

  const PROCEDURE_KEYWORDS = new Set([
    'head', 'gasket', 'gaskets', 'torque', 'spec', 'specs', 'specification', 'specifications',
    'timing', 'chain', 'chains', 'inspection', 'calibration',
    'valve', 'valves', 'clearance', 'correction', 'setup', 'shimming', 'shim', 'shims',
    'cooling', 'system', 'systems', 'bleeding', 'coolant',
    'oil', 'pressure', 'relief', 'diagnostics', 'diagnostic',
    'obd', 'obd2', 'obdii', 'multi-diagnostic', 'codes', 'code', 'guide',
    'spark', 'plug', 'plugs', 'brake', 'brakes', 'pad', 'pads', 'rotor', 'rotors',
    'fluid', 'fluids', 'repair', 'manual', 'manuals', 'procedure', 'procedures', 'chapter', 'chapters',
    'service', 'maintenance', 'inspection'
  ]);

  const ALL_PROCEDURES = [
    { 
      title: "Head Gasket Service & Specifications", 
      href: "/engine/head-gasket", 
      keywords: ["head", "gasket", "torque", "specifications", "spec", "spark", "plug", "plugs", "cylinder"] 
    },
    { 
      title: "Timing Chain Inspection & Calibration", 
      href: "/engine/timing-chain", 
      keywords: ["timing", "chain", "inspection", "calibration", "camshaft", "crankshaft"] 
    },
    { 
      title: "Valve Clearance Correction Setup", 
      href: "/engine/valve-clearance", 
      keywords: ["valve", "clearance", "correction", "setup", "shimming", "shim", "shims", "intake", "exhaust"] 
    },
    { 
      title: "Cooling System Bleeding Procedure", 
      href: "/fluids/cooling", 
      keywords: ["cooling", "system", "bleeding", "coolant", "radiator", "fluid"] 
    },
    { 
      title: "Oil Pressure Relief Valve Diagnostics", 
      href: "/fluids/oil-flow", 
      keywords: ["oil", "pressure", "relief", "valve", "diagnostics", "fluid"] 
    },
    { 
      title: "OBD-II Multi-Diagnostic Codes Guide", 
      href: "/electrical/obd-codes", 
      keywords: ["obd", "obd2", "obdii", "diagnostic", "codes", "code", "guide", "brake", "brakes", "pad", "pads", "sensor"] 
    }
  ];

  const getExpandedTokens = (query: string): string[] => {
    const rawTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const tokens: string[] = [];
    rawTokens.forEach(t => {
      const clean = t.replace(/[^a-z0-9]/g, '');
      if (ALIAS_MAP[clean]) {
        tokens.push(...ALIAS_MAP[clean].toLowerCase().split(/\s+/));
      } else {
        tokens.push(t);
      }
    });
    return tokens;
  };

  const executeSearch = async (query: string) => {
    if (!query.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    setDropdownOpen(true);
    try {
      // 1. Fetch all vehicles to support flexible client-side multi-token matching
      const allVehicles = await api.getVehicles(undefined, undefined, undefined, 200);

      // 2. Expand aliases
      const tokens = getExpandedTokens(query);
      if (tokens.length === 0) {
        setVehicleResults([]);
        setProcedureResults([]);
        return;
      }

      // 3. Split tokens into vehicle properties and procedure keywords
      const vehicleTokens = tokens.filter(t => !PROCEDURE_KEYWORDS.has(t));
      const procedureTokens = tokens.filter(t => PROCEDURE_KEYWORDS.has(t));

      // 4. Find matching vehicles
      const matchedVehs = allVehicles.filter(v => {
        const searchFields = [v.make, v.model, v.year, v.engine].map(s => s.toLowerCase());
        const tokensToMatch = vehicleTokens.length > 0 ? vehicleTokens : tokens;
        return tokensToMatch.every(token => 
          searchFields.some(field => field.includes(token))
        );
      });

      // 5. Match procedures for each matched vehicle
      const matchedProcs: { title: string; href: string; vehicle: Vehicle }[] = [];
      
      matchedVehs.forEach(v => {
        let filteredProcs = ALL_PROCEDURES;
        if (procedureTokens.length > 0) {
          filteredProcs = ALL_PROCEDURES.filter(p => {
            const searchStr = (p.title + ' ' + p.keywords.join(' ')).toLowerCase();
            return procedureTokens.some(token => searchStr.includes(token));
          });
        }

        filteredProcs.forEach(p => {
          matchedProcs.push({
            title: p.title,
            href: p.href,
            vehicle: v
          });
        });
      });

      setVehicleResults(matchedVehs.slice(0, 8));
      setProcedureResults(matchedProcs.slice(0, 8));
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchError(err.message || 'Search lookup failed.');
      setVehicleResults([]);
      setProcedureResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectProcedure = (proc: { title: string; href: string; vehicle: Vehicle }) => {
    const modifiedVehicle: Vehicle = {
      ...proc.vehicle,
      uriPath: proc.href
    };
    onSelectVehicle(modifiedVehicle);
    setDropdownOpen(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-6" id="dashboard-view-root">
      
      {/* Dashboard Hero Section */}
      <div className="flex flex-col sm:flex-row items-center gap-6 py-5 pb-6 border-b border-amber-500/10" id="dashboard-hero">
        <img 
          src="https://raw.githubusercontent.com/usmc6123/images/main/newlogo.jpg" 
          alt="Workshop Ragnarök Hero Logo" 
          className="w-[120px] h-[120px] rounded-full object-cover border-2 border-amber-500/30 ring-2 ring-amber-500/40 shadow-xl shadow-amber-500/20 shrink-0"
        />
        <div className="text-center sm:text-left space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black tracking-widest text-amber-500 uppercase font-mono">
            WORKSHOP: RAGNARÖK
          </h1>
          <p className="text-sm sm:text-base font-mono tracking-wider text-slate-400 uppercase">
            Auto Shop Management System
          </p>
        </div>
      </div>

      {/* 1. Overview Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-stats-deck">
        
        {/* Total Customers */}
        <div 
          onClick={() => onNavigateToTab('customers')}
          className="bg-[#13141a]/80 backdrop-blur-sm border border-border-theme hover:border-primary-theme/50 hover:border-l-primary-theme border-l-[3px] border-l-border-theme rounded-xl p-5 flex items-center justify-between transition-all duration-200 cursor-pointer shadow group min-h-[110px]"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
              Total Customers
            </span>
            <span className="text-3xl font-black text-white font-mono block group-hover:text-primary-theme transition-colors">
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
          className="bg-[#13141a]/80 backdrop-blur-sm border border-border-theme hover:border-primary-theme/50 hover:border-l-primary-theme border-l-[3px] border-l-border-theme rounded-xl p-5 flex items-center justify-between transition-all duration-200 cursor-pointer shadow group min-h-[110px]"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
              Active Jobs
            </span>
            <span className="text-3xl font-black text-white font-mono block group-hover:text-primary-theme transition-colors">
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
          className="bg-[#13141a]/80 backdrop-blur-sm border border-border-theme hover:border-primary-theme/50 hover:border-l-primary-theme border-l-[3px] border-l-border-theme rounded-xl p-5 flex items-center justify-between transition-all duration-200 cursor-pointer shadow group min-h-[110px]"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
              Vehicles Registered
            </span>
            <span className="text-3xl font-black text-white font-mono block group-hover:text-primary-theme transition-colors">
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
          className="bg-[#13141a]/80 backdrop-blur-sm border border-border-theme hover:border-primary-theme/50 hover:border-l-primary-theme border-l-[3px] border-l-border-theme rounded-xl p-5 flex items-center justify-between transition-all duration-200 cursor-pointer shadow group min-h-[110px]"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
              Manuals Available
            </span>
            <span className="text-3xl font-black text-white font-mono block group-hover:text-primary-theme transition-colors">
              {stats?.totalManuals?.toLocaleString() || '300,000+'}
            </span>
            <span className="text-[10px] text-slate-450 font-sans block">
              Indexed manual manuals
            </span>
          </div>
          <div className="bg-bg-theme p-2.5 rounded-lg border border-border-theme text-primary-theme group-hover:scale-105 transition-transform duration-150">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 2. Interactive Manual Search Utility */}
      <div className="bg-[#13141a]/80 backdrop-blur-sm border border-border-theme rounded-xl p-5 space-y-4 shadow select-none text-left relative z-40" ref={dropdownRef}>
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary-theme" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-350">
            Quick Diagnostic Library Lookup
          </span>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search make, model, year, engine, or manual chapter (e.g. '2018 Chevy spark plug', 'Ford 2021 brake')..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => {
              if (searchTerm.trim()) {
                setDropdownOpen(true);
              }
            }}
            className="w-full rounded-lg bg-surface-theme border border-border-theme focus:border-primary-theme pl-10 pr-20 py-2.5 text-xs text-text-theme placeholder-slate-500 focus:outline-none transition-all shadow-inner"
            id="dashboard-quick-search-input"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {searchLoading && (
              <RefreshCw className="w-3.5 h-3.5 text-primary-theme animate-spin" />
            )}
            {searchTerm && (
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setVehicleResults([]);
                  setProcedureResults([]);
                  setDropdownOpen(false);
                }}
                className="text-slate-500 hover:text-slate-300 text-[10px] font-mono uppercase font-bold transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Live Search dropdown overlay */}
        {dropdownOpen && searchTerm.trim() && (
          <div 
            className="absolute left-0 right-0 mt-2 bg-[#101116]/98 backdrop-blur-md border border-border-theme rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in text-left" 
            id="dashboard-universal-search-dropdown"
          >
            {searchLoading && vehicleResults.length === 0 && procedureResults.length === 0 ? (
              <div className="p-8 text-center text-slate-450 text-xs font-mono flex flex-col items-center justify-center gap-2.5">
                <RefreshCw className="w-5 h-5 text-primary-theme animate-spin" />
                <span>Searching diagnostics database...</span>
              </div>
            ) : vehicleResults.length === 0 && procedureResults.length === 0 ? (
              <div className="p-8 text-center text-slate-450 text-xs font-mono">
                No results found for <span className="text-amber-500 font-bold">"{searchTerm}"</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border-theme/40 max-h-[380px] overflow-y-auto">
                {/* VEHICLES SECTION */}
                <div className="p-4 space-y-2.5">
                  <span className="text-[10px] font-mono font-black tracking-widest text-slate-500 uppercase flex items-center gap-1.5 border-b border-border-theme/20 pb-1.5">
                    <Car className="w-3.5 h-3.5 text-primary-theme" />
                    VEHICLES ({vehicleResults.length})
                  </span>
                  
                  {vehicleResults.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-2 pl-1">No matching vehicles.</p>
                  ) : (
                    <div className="space-y-1">
                      {vehicleResults.map((v) => (
                        <button
                          key={`veh-${v.id}`}
                          onClick={() => {
                            onSelectVehicle(v);
                            setDropdownOpen(false);
                          }}
                          className="w-full text-left bg-transparent hover:bg-white/5 rounded-lg p-2.5 flex items-center justify-between gap-2.5 transition group border border-transparent hover:border-border-theme/30 cursor-pointer"
                        >
                          <div className="min-w-0 text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-mono font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1 py-0.2 rounded">
                                {v.year}
                              </span>
                              <span className="text-xs font-bold text-text-theme group-hover:text-primary-theme transition-colors truncate">
                                {v.make} {v.model}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-450 truncate mt-0.5">
                              {v.engine}
                            </p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-primary-theme transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* PROCEDURES SECTION */}
                <div className="p-4 space-y-2.5">
                  <span className="text-[10px] font-mono font-black tracking-widest text-slate-500 uppercase flex items-center gap-1.5 border-b border-border-theme/20 pb-1.5">
                    <Wrench className="w-3.5 h-3.5 text-primary-theme" />
                    PROCEDURES ({procedureResults.length})
                  </span>

                  {procedureResults.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-2 pl-1">No matching chapters or procedures.</p>
                  ) : (
                    <div className="space-y-1">
                      {procedureResults.map((p, idx) => (
                        <button
                          key={`proc-${idx}`}
                          onClick={() => handleSelectProcedure(p)}
                          className="w-full text-left bg-transparent hover:bg-white/5 rounded-lg p-2.5 flex items-center justify-between gap-2.5 transition group border border-transparent hover:border-border-theme/30 cursor-pointer"
                        >
                          <div className="min-w-0 flex-1 text-left">
                            <h4 className="text-xs font-bold text-slate-100 group-hover:text-primary-theme transition-colors truncate">
                              {p.title}
                            </h4>
                            <p className="text-[10px] text-slate-450 mt-0.5 truncate">
                              Vehicle: <span className="text-slate-300">{p.vehicle.year} {p.vehicle.make} {p.vehicle.model}</span>
                            </p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-primary-theme transition-colors shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>      {/* 3. Three-column Overview Stack */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left relative z-10">
        
        {/* Left Aspect: Recent Jobs List (Last 5) */}
        <div className="lg:col-span-5 bg-[#13141a]/80 backdrop-blur-sm border border-border-theme rounded-xl p-5 space-y-4 shadow flex flex-col justify-between min-h-[480px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border-theme pb-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-350 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-primary-theme" />
                Recent Repair Orders (Last 5)
              </h3>
              <button
                onClick={() => onNavigateToTab('jobs')}
                className="text-[10px] font-bold text-primary-theme hover:text-primary-theme/80 uppercase tracking-widest font-mono transition-colors"
              >
                View All
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-450 text-xs font-mono">Querying open tickets...</div>
            ) : recentJobs.length === 0 ? (
              <div className="py-16 text-center text-slate-450 text-xs font-mono">
                No active service orders currently.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => onNavigateToTab('jobs')}
                    className="bg-bg-theme/60 hover:bg-bg-theme border border-border-theme hover:border-slate-600 p-3 rounded-lg cursor-pointer transition-all duration-200 space-y-2 shadow-md hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                        Ticket #{job.id.toString().padStart(4, '0')}
                      </span>
                      <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border font-bold ${
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
                      <p className="text-[10px] text-slate-450 mt-0.5 truncate">{job.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateToTab('jobs')}
            className="w-full mt-4 bg-bg-theme hover:bg-surface-theme text-slate-300 hover:text-white border border-border-theme py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition text-center cursor-pointer flex items-center justify-center gap-1 shadow-sm"
          >
            <span>Go to Active Jobs Queue</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mid Aspect: Upcoming Appointments (Next 3) */}
        <div className="lg:col-span-4 bg-[#13141a]/80 backdrop-blur-sm border border-border-theme rounded-xl p-5 space-y-4 shadow flex flex-col justify-between min-h-[480px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border-theme pb-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-355 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary-theme" />
                Upcoming Appointments (Next 3)
              </h3>
              <button
                onClick={() => onNavigateToTab('calendar')}
                className="text-[10px] font-bold text-primary-theme hover:text-primary-theme/80 uppercase tracking-widest font-mono transition-colors"
              >
                Go to Calendar
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-450 text-xs font-mono">Querying appointment registry...</div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="py-16 text-center text-slate-455 text-xs font-mono italic">
                No upcoming appointments scheduled.
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    onClick={() => onNavigateToTab('calendar')}
                    className="bg-bg-theme/60 hover:bg-bg-theme border border-border-theme hover:border-slate-600 p-3 rounded-lg cursor-pointer transition-all duration-200 space-y-1.5 shadow-md hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-primary-theme font-bold">{appt.date}</span>
                      <span className="text-slate-400">{appt.time}</span>
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
            className="w-full mt-4 bg-bg-theme hover:bg-surface-theme text-slate-300 hover:text-white border border-border-theme py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition text-center cursor-pointer flex items-center justify-center gap-1 shadow-sm"
          >
            <span>Create Appointment</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Aspect: Recent Customers List (Last 5) */}
        <div className="lg:col-span-3 bg-[#13141a]/80 backdrop-blur-sm border border-border-theme rounded-xl p-5 space-y-4 shadow flex flex-col justify-between min-h-[480px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border-theme pb-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-350 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary-theme" />
                Recent Clients
              </h3>
              <button
                onClick={() => onNavigateToTab('customers')}
                className="text-[10px] font-bold text-primary-theme hover:text-primary-theme/80 uppercase tracking-widest font-mono transition-colors"
              >
                CRM List
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-450 text-xs font-mono">Querying database...</div>
            ) : recentCustomers.length === 0 ? (
              <div className="py-16 text-center text-slate-455 text-xs font-mono italic">
                No registered customers yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onNavigateToTab('customers')}
                    className="bg-bg-theme/40 hover:bg-bg-theme p-2.5 rounded-lg border border-border-theme cursor-pointer transition-all duration-200 flex items-center justify-between gap-2.5 shadow-sm hover:shadow-md"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-200 truncate">{c.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{c.phone || 'No phone'}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 hover:text-primary-theme shrink-0 transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateToTab('customers')}
            className="w-full mt-4 bg-bg-theme hover:bg-surface-theme text-slate-300 hover:text-white border border-border-theme py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition text-center cursor-pointer flex items-center justify-center gap-1 shadow-sm"
          >
            <span>Manage Customers</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </div>
  );
}
