/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef } from 'react';
import { Job, Appointment, Customer, Vehicle, DatabaseStats, InventoryItem, SmsMessage, CustomerVehicle } from '../types';
import { api } from '../lib/api';
import {
  Search, Car, Wrench, ClipboardList, BookOpen, Clock, Users,
  RefreshCw, AlertTriangle, ChevronRight, Activity, Calendar, PlusCircle,
  Briefcase, Bot, Clapperboard, Scissors, Globe, TrendingUp, PackageX,
  Rss, BarChart3, Sparkles, DollarSign, MessageSquare, Mail,
  UserPlus, CheckCircle2, CalendarClock
} from 'lucide-react';
import CatHeaderBanner from './CatHeaderBanner';
import CatLaserOverlay from './CatLaserOverlay';

interface DashboardViewProps {
  onSelectVehicle: (vehicle: Vehicle) => void;
  onNavigateToTab: (tab: string) => void;
  onNavigateToBrowseWithSearch: (initialSearchTerm?: string) => void;
  refreshTrigger: number;
}

// Quick Launch — one-click shortcuts to the pages that have piled up in the
// sidebar over time without ever getting dashboard-level visibility.
const QUICK_LAUNCH_ITEMS = [
  { tab: 'office', label: 'The Office', icon: Briefcase, bg: '/office.png' },
  { tab: 'ai-chat-bot', label: 'AI Chat Bot', icon: Bot, bg: '/chatbot.png' },
  { tab: 'video-editor', label: 'Video Editor', icon: Clapperboard, bg: '/videoeditor.png' },
  { tab: 'youtube-trimmer', label: 'Youtube Trimmer', icon: Scissors, bg: '/youtubetrimmer.png' },
  { tab: 'sites', label: 'Websites', icon: Globe, bg: '/websites.png' },
] as const;

type FeedItem = {
  key: string;
  type: 'job' | 'payment' | 'text' | 'customer';
  label: string;
  sublabel: string;
  timestamp: string;
};

export default function DashboardView({
  onSelectVehicle,
  onNavigateToTab,
  onNavigateToBrowseWithSearch,
  refreshTrigger
}: DashboardViewProps) {

  const heroRef = useRef<HTMLDivElement>(null);
  const [hudBelowBanner, setHudBelowBanner] = useState(false);

  useEffect(() => {
    const checkHudLayout = () => {
      const heroEl = heroRef.current;
      if (!heroEl) return;
      const heroRect = heroEl.getBoundingClientRect();
      const neededWidth = 280 + 24;
      const spaceOnRight = window.innerWidth - heroRect.right;
      setHudBelowBanner(spaceOnRight < neededWidth);
    };

    checkHudLayout();
    window.addEventListener('resize', checkHudLayout);
    // Periodically recheck in case of layout shifts or scroll shifts
    const interval = setInterval(checkHudLayout, 250);

    return () => {
      window.removeEventListener('resize', checkHudLayout);
      clearInterval(interval);
    };
  }, []);

  // Dashboard stats and lists
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);

  // New widgets' data
  const [jobsDueToday, setJobsDueToday] = useState<Job[]>([]);
  const [appointmentsToday, setAppointmentsToday] = useState<Appointment[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [smsMessages, setSmsMessages] = useState<SmsMessage[]>([]);
  const [fleetVehicles, setFleetVehicles] = useState<CustomerVehicle[]>([]);
  const [briefing, setBriefing] = useState('');
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Universal Search States & Setup
  const [searchTerm, setSearchTerm] = useState('');
  const latestSearchQueryRef = useRef('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [vehicleResults, setVehicleResults] = useState<Vehicle[]>([]);
  const [procedureResults, setProcedureResults] = useState<{ title: string; href: string; vehicle: Vehicle }[]>([]);

  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDashboardData();
  }, [refreshTrigger]);

  const fetchBriefing = async (statsData: DatabaseStats | null, dueTodayCount: number, apptsTodayCount: number) => {
    setBriefingLoading(true);
    setBriefingError(false);
    try {
      const token = localStorage.getItem('workshop_token');
      const prompt = `Give me a tight 2-3 sentence morning briefing for the shop. Facts to work from: ${dueTodayCount} job(s) due today, ${apptsTodayCount} appointment(s) today, ${statsData?.unpaidJobsCount || 0} unpaid invoice(s), ${statsData?.lowStockCount || 0} part(s) low on stock, ${statsData?.activeJobs || 0} active jobs in the queue overall. Write it like a sharp shop manager giving the owner the state of play — no greeting, no fluff, just what's actually happening and what needs attention first if anything does.`;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      });
      const data = await res.json();
      setBriefing(data.reply || '');
      if (!data.reply) setBriefingError(true);
    } catch (err) {
      console.error('Failed to fetch AI morning briefing', err);
      setBriefingError(true);
    } finally {
      setBriefingLoading(false);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    const todayStr = new Date().toISOString().split('T')[0];
    let dueTodayCount = 0;
    let apptsTodayCount = 0;

    try {
      // 1. Fetch CRM Stats
      const dbStats = await api.getStats();
      setStats(dbStats);

      // 2. Fetch Recent Jobs (and derive "due today" from the full list)
      const allJobs = await api.getJobs();
      setRecentJobs(allJobs.slice(0, 5)); // show last 5 jobs
      const dueToday = allJobs.filter(j =>
        j.estimated_completion === todayStr && j.status !== 'Complete' && j.status !== 'Cancelled'
      );
      setJobsDueToday(dueToday);
      dueTodayCount = dueToday.length;

      // 3. Fetch Upcoming Appointments (and derive "today only" from the full list)
      const appts = await api.getAppointments();
      const upcoming = appts
        .filter(a => a.date >= todayStr)
        .slice(0, 3); // show next 3 upcoming appointments
      setUpcomingAppointments(upcoming);
      const todaysAppts = appts.filter(a => a.date === todayStr);
      setAppointmentsToday(todaysAppts);
      apptsTodayCount = todaysAppts.length;

      // 4. Fetch Recent Customers
      try {
        const cData = await (api as any).getCustomers();
        setRecentCustomers(cData.slice(0, 5)); // show last 5 customers
      } catch (err) {
        console.error('Failed to fetch customers on dashboard', err);
      }

      // 5. Inventory (for low-stock alert)
      try {
        const inv = await api.getInventory();
        setInventory(inv);
      } catch (err) {
        console.error('Failed to fetch inventory on dashboard', err);
      }

      // 6. Payments (for revenue sparkline + activity feed)
      try {
        const pays = await api.getPayments();
        setPayments(pays);
      } catch (err) {
        console.error('Failed to fetch payments on dashboard', err);
      }

      // 7. Texts (for activity feed)
      try {
        const sms = await api.getSmsMessages();
        setSmsMessages(sms);
      } catch (err) {
        console.error('Failed to fetch texts on dashboard', err);
      }

      // 8. Fleet vehicles (for the fleet insight card)
      try {
        const vehs = await api.getVehiclesAll();
        setFleetVehicles(vehs);
      } catch (err) {
        console.error('Failed to fetch fleet vehicles on dashboard', err);
      }

      // 9. AI morning briefing, using the numbers we just computed
      fetchBriefing(dbStats, dueTodayCount, apptsTodayCount);

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
    // Guards against a race condition: if the user keeps typing while an
    // earlier search is still in flight, a second (more complete) search
    // fires before the first one resolves. Without this check, whichever
    // request happens to finish last wins — even if it's the stale, less-
    // specific one — silently overwriting good results with wrong/empty
    // ones a moment later. This ref always holds the most recently issued
    // query, so a response only gets applied if it's still the latest one.
    latestSearchQueryRef.current = query;
    setSearchLoading(true);
    setSearchError(null);
    setDropdownOpen(true);
    try {
      // 1. Expand aliases and split into vehicle vs. procedure tokens first,
      // so we know what to actually search for before hitting the backend.
      const tokens = getExpandedTokens(query);
      if (tokens.length === 0) {
        if (latestSearchQueryRef.current !== query) return;
        setVehicleResults([]);
        setProcedureResults([]);
        return;
      }

      const vehicleTokens = tokens.filter(t => !PROCEDURE_KEYWORDS.has(t));
      const procedureTokens = tokens.filter(t => PROCEDURE_KEYWORDS.has(t));

      // 2. Ask the backend to search across the full 304,923-vehicle
      // database using these tokens, rather than fetching an arbitrary
      // fixed batch and filtering client-side — with 300k+ vehicles, any
      // fixed-size sample is very unlikely to contain the specific vehicle
      // being searched for, which is why multi-word searches (e.g. "2008
      // toyota") previously returned nothing once more than one token had
      // to match. The backend's /api/vehicles?q= endpoint already does
      // correct multi-token AND-matching across make/model/year/engine.
      const searchTokens = vehicleTokens.length > 0 ? vehicleTokens : tokens;
      const matchedVehs = await api.getVehicles(undefined, undefined, searchTokens.join(' '), 50);

      // If a newer search has started since this one was issued, discard
      // this response — it's stale, even though it just resolved.
      if (latestSearchQueryRef.current !== query) return;

      // 3. Match procedures for each matched vehicle
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
      if (latestSearchQueryRef.current !== query) return;
      console.error('Search error:', err);
      setSearchError(err.message || 'Search lookup failed.');
      setVehicleResults([]);
      setProcedureResults([]);
    } finally {
      if (latestSearchQueryRef.current === query) {
        setSearchLoading(false);
      }
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

  // --- Derived data for the new widgets ---

  const lowStockItems = inventory
    .filter(i => i.quantity_on_hand <= i.reorder_threshold)
    .sort((a, b) => (a.quantity_on_hand - a.reorder_threshold) - (b.quantity_on_hand - b.reorder_threshold));

  // Revenue sparkline: succeeded payments bucketed into the last 14 days.
  const revenueDays = (() => {
    const days: { label: string; total: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const total = payments
        .filter((p: any) => p.status === 'succeeded' && typeof p.created_at === 'string' && p.created_at.startsWith(key))
        .reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0);
      days.push({ label: key.slice(5), total: total / 100 });
    }
    return days;
  })();
  const revenueMax = Math.max(1, ...revenueDays.map(d => d.total));
  const revenue14DayTotal = revenueDays.reduce((sum, d) => sum + d.total, 0);

  // Fleet insight: top makes by vehicle count.
  const makeCounts = fleetVehicles.reduce((acc: Record<string, number>, v) => {
    if (v.make) acc[v.make] = (acc[v.make] || 0) + 1;
    return acc;
  }, {});
  const topMakes = Object.entries(makeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topMakesMax = Math.max(1, ...topMakes.map(([, count]) => count));

  // Unified activity feed — merges jobs, payments, texts, and new customers
  // into one chronological list instead of three separate "recent X" panels.
  const activityFeed: FeedItem[] = (() => {
    const items: FeedItem[] = [];

    recentJobs.forEach(j => {
      if (!j.created_at) return;
      items.push({
        key: `job-${j.id}`,
        type: 'job',
        label: `${j.vehicle_year || ''} ${j.vehicle_make || ''} ${j.vehicle_model || ''}`.trim() || `Job #${j.id}`,
        sublabel: j.description || j.status,
        timestamp: j.created_at,
      });
    });

    payments.forEach((p: any) => {
      if (!p.created_at || p.status !== 'succeeded') return;
      items.push({
        key: `payment-${p.id}`,
        type: 'payment',
        label: `Payment received — $${((p.amount_cents || 0) / 100).toFixed(2)}`,
        sublabel: p.customer_name || 'Unknown customer',
        timestamp: p.created_at,
      });
    });

    smsMessages.forEach(s => {
      if (!s.created_at) return;
      items.push({
        key: `sms-${s.id}`,
        type: 'text',
        label: s.direction === 'inbound' ? 'Incoming text' : 'Outgoing text',
        sublabel: `${s.customer_name || s.private_contact_name || s.phone} — ${s.body.slice(0, 60)}`,
        timestamp: s.created_at,
      });
    });

    recentCustomers.forEach(c => {
      if (!c.created_at) return;
      items.push({
        key: `customer-${c.id}`,
        type: 'customer',
        label: `New customer: ${c.name}`,
        sublabel: c.phone || c.email || '',
        timestamp: c.created_at,
      });
    });

    return items
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 8);
  })();

  const feedIcon = (type: FeedItem['type']) => {
    switch (type) {
      case 'job': return ClipboardList;
      case 'payment': return DollarSign;
      case 'text': return MessageSquare;
      case 'customer': return UserPlus;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-6" id="dashboard-view-root">
      <CatLaserOverlay heroRef={heroRef} />

      {/* Dashboard Hero Section */}
      <div ref={heroRef} className="w-full">
        <CatHeaderBanner sources={['/garage-calm.mp4', '/garage-run.mp4']}>
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 h-full w-full justify-center sm:justify-start" id="dashboard-hero">
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
        </CatHeaderBanner>
      </div>

      {/* Spacer for the "Cooper & Roscoe on patrol" HUD when dropped below the hero banner to avoid any overlap on mobile/narrow screens */}
      {hudBelowBanner && (
        <div className="h-[144px] w-full" id="dashboard-hud-spacer" />
      )}

      {/* NEW: Quick Launch row */}
      <div className="bg-[#13141a]/80 backdrop-blur-sm border border-border-theme rounded-xl p-4 shadow" id="dashboard-quick-launch">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary-theme" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-350">Quick Launch</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {QUICK_LAUNCH_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.tab}
                onClick={() => onNavigateToTab(item.tab)}
                className="relative flex flex-col items-center justify-end h-28 rounded-lg overflow-hidden border border-border-theme hover:border-primary-theme/60 transition-all duration-200 group shadow-md"
                style={{
                  backgroundImage: `url('${item.bg}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent group-hover:from-black/60 transition-colors" />
                <div className="relative flex items-center gap-1.5 pb-2 px-2">
                  <Icon className="w-3.5 h-3.5 text-primary-theme drop-shadow group-hover:scale-110 transition-transform shrink-0" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white text-center drop-shadow">{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* NEW: Today at a glance strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" id="dashboard-today-strip">
        <div
          onClick={() => onNavigateToTab('jobs')}
          className="bg-[#13141a]/80 border border-border-theme hover:border-primary-theme/50 rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all"
        >
          <div className="bg-bg-theme p-2 rounded-lg border border-border-theme text-primary-theme"><CalendarClock className="w-4 h-4" /></div>
          <div>
            <div className="text-xl font-black text-white font-mono leading-none">{jobsDueToday.length}</div>
            <div className="text-[9px] font-mono text-slate-450 uppercase tracking-wider mt-1">Due Today</div>
          </div>
        </div>
        <div
          onClick={() => onNavigateToTab('calendar')}
          className="bg-[#13141a]/80 border border-border-theme hover:border-primary-theme/50 rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all"
        >
          <div className="bg-bg-theme p-2 rounded-lg border border-border-theme text-primary-theme"><Calendar className="w-4 h-4" /></div>
          <div>
            <div className="text-xl font-black text-white font-mono leading-none">{appointmentsToday.length}</div>
            <div className="text-[9px] font-mono text-slate-450 uppercase tracking-wider mt-1">Appts Today</div>
          </div>
        </div>
        <div
          onClick={() => onNavigateToTab('payments')}
          className="bg-[#13141a]/80 border border-border-theme hover:border-primary-theme/50 rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all"
        >
          <div className="bg-bg-theme p-2 rounded-lg border border-border-theme text-primary-theme"><DollarSign className="w-4 h-4" /></div>
          <div>
            <div className="text-xl font-black text-white font-mono leading-none">{stats?.unpaidJobsCount || 0}</div>
            <div className="text-[9px] font-mono text-slate-450 uppercase tracking-wider mt-1">Unpaid Invoices</div>
          </div>
        </div>
        <div
          onClick={() => onNavigateToTab('inventory')}
          className="bg-[#13141a]/80 border border-border-theme hover:border-primary-theme/50 rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all"
        >
          <div className="bg-bg-theme p-2 rounded-lg border border-border-theme text-primary-theme"><PackageX className="w-4 h-4" /></div>
          <div>
            <div className="text-xl font-black text-white font-mono leading-none">{lowStockItems.length}</div>
            <div className="text-[9px] font-mono text-slate-450 uppercase tracking-wider mt-1">Low Stock</div>
          </div>
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

      {/* NEW: AI Morning Briefing */}
      <div className="bg-gradient-to-br from-[#151626]/90 to-[#13141a]/80 backdrop-blur-sm border border-primary-theme/25 rounded-xl p-5 shadow" id="dashboard-ai-briefing">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-theme" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-350">Cooper & Roscoe's Morning Briefing</span>
          </div>
          <button
            onClick={() => fetchBriefing(stats, jobsDueToday.length, appointmentsToday.length)}
            disabled={briefingLoading}
            className="text-slate-500 hover:text-primary-theme transition-colors disabled:opacity-50"
            title="Refresh briefing"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${briefingLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {briefingLoading ? (
          <p className="text-xs text-slate-450 font-mono">Thinking it over...</p>
        ) : briefingError || !briefing ? (
          <p className="text-xs text-slate-450 font-mono italic">Briefing unavailable right now — check the AI Chat Bot setup if this persists.</p>
        ) : (
          <p className="text-sm text-slate-200 leading-relaxed">{briefing}</p>
        )}
      </div>

      {/* NEW: Revenue sparkline + Low stock alert */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#13141a]/80 backdrop-blur-sm border border-border-theme rounded-xl p-5 shadow" id="dashboard-revenue-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-theme" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-350">Revenue — Last 14 Days</span>
            </div>
            <span className="text-lg font-black text-white font-mono">${revenue14DayTotal.toFixed(0)}</span>
          </div>
          <div className="flex items-end gap-1 h-24">
            {revenueDays.map((d) => (
              <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                <div
                  className="w-full bg-primary-theme/70 group-hover:bg-primary-theme rounded-t transition-all"
                  style={{ height: `${Math.max(2, (d.total / revenueMax) * 100)}%` }}
                  title={`${d.label}: $${d.total.toFixed(2)}`}
                />
              </div>
            ))}
          </div>
          <button
            onClick={() => onNavigateToTab('payments')}
            className="w-full mt-4 bg-bg-theme hover:bg-surface-theme text-slate-300 hover:text-white border border-border-theme py-2 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider transition text-center flex items-center justify-center gap-1"
          >
            <span>View Payments</span><ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-[#13141a]/80 backdrop-blur-sm border border-border-theme rounded-xl p-5 shadow" id="dashboard-low-stock-card">
          <div className="flex items-center gap-2 mb-4">
            <PackageX className="w-4 h-4 text-primary-theme" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-350">Low Stock Alert</span>
          </div>
          {lowStockItems.length === 0 ? (
            <div className="py-8 text-center text-slate-450 text-xs font-mono italic">All inventory above reorder threshold.</div>
          ) : (
            <div className="space-y-2">
              {lowStockItems.slice(0, 4).map(item => (
                <div
                  key={item.id}
                  onClick={() => onNavigateToTab('inventory')}
                  className="bg-bg-theme/60 hover:bg-bg-theme border border-border-theme rounded-lg p-2.5 flex items-center justify-between cursor-pointer transition-all"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">{item.name}</div>
                    <div className="text-[10px] text-slate-450">{item.part_number}</div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-red-400 bg-red-950/20 border border-red-800/30 px-2 py-1 rounded shrink-0">
                    {item.quantity_on_hand}/{item.reorder_threshold}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => onNavigateToTab('inventory')}
            className="w-full mt-4 bg-bg-theme hover:bg-surface-theme text-slate-300 hover:text-white border border-border-theme py-2 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider transition text-center flex items-center justify-center gap-1"
          >
            <span>Go to Inventory</span><ChevronRight className="w-3.5 h-3.5" />
          </button>
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

      {/* NEW: Unified activity feed + Fleet insight */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#13141a]/80 backdrop-blur-sm border border-border-theme rounded-xl p-5 space-y-3 shadow" id="dashboard-activity-feed">
          <div className="flex items-center gap-2 border-b border-border-theme pb-2">
            <Rss className="w-4 h-4 text-primary-theme" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-350">Activity Feed</span>
          </div>
          {activityFeed.length === 0 ? (
            <div className="py-10 text-center text-slate-450 text-xs font-mono italic">Nothing recent to show yet.</div>
          ) : (
            <div className="space-y-2">
              {activityFeed.map(item => {
                const Icon = feedIcon(item.type);
                return (
                  <div key={item.key} className="flex items-center gap-3 bg-bg-theme/50 border border-border-theme/60 rounded-lg p-2.5">
                    <div className="bg-bg-theme p-1.5 rounded-md border border-border-theme text-primary-theme shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-200 truncate">{item.label}</div>
                      <div className="text-[10px] text-slate-450 truncate">{item.sublabel}</div>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 shrink-0">{item.timestamp.slice(5, 16).replace('T', ' ')}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-[#13141a]/80 backdrop-blur-sm border border-border-theme rounded-xl p-5 space-y-3 shadow" id="dashboard-fleet-insight">
          <div className="flex items-center gap-2 border-b border-border-theme pb-2">
            <BarChart3 className="w-4 h-4 text-primary-theme" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-350">Fleet Insight — Top Makes</span>
          </div>
          {topMakes.length === 0 ? (
            <div className="py-10 text-center text-slate-450 text-xs font-mono italic">No vehicle data yet.</div>
          ) : (
            <div className="space-y-2.5">
              {topMakes.map(([make, count]) => (
                <div key={make} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-300 font-bold">{make}</span>
                    <span className="text-slate-450">{count}</span>
                  </div>
                  <div className="h-1.5 bg-bg-theme rounded-full overflow-hidden border border-border-theme">
                    <div
                      className="h-full bg-primary-theme rounded-full"
                      style={{ width: `${(count / topMakesMax) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
