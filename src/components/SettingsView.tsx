/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef } from 'react';
import { DatabaseStats, ShopSettings } from '../types';
import { api, getApiBase, setApiBase } from '../lib/api';
import MediaField from './MediaField';
import {
  Settings, Server, Sun, Database, RefreshCw, AlertTriangle, Info, ShieldCheck, Cpu, ChevronDown, Store,
  Users, Car, ClipboardList, Clock, Timer, Gauge, Package, CheckCircle2, DollarSign, TrendingUp, Megaphone,
  LayoutDashboard, BookOpen, Mail, MessageSquare, Globe, Bot, Clapperboard, Scissors, Image, Calendar, X, Check
} from 'lucide-react';

// A tiny, fully CSS-built mockup of the app shell in a given theme's colors —
// a mini sidebar strip, header bar, and a content card with a primary-colored
// button and a couple of text lines — so the picker shows an honest preview
// of what you'll actually get instead of just a row of color dots.
function ThemeThumbnail({ theme, className = '' }: { theme: { bg: string; surface: string; border: string; primary: string; text: string }; className?: string }) {
  return (
    <div
      className={`relative flex overflow-hidden rounded-lg border ${className}`}
      style={{ backgroundColor: theme.bg, borderColor: theme.border }}
    >
      {/* Fake sidebar */}
      <div className="w-[22%] shrink-0 flex flex-col items-center gap-1.5 py-2.5" style={{ backgroundColor: theme.surface, borderRight: `1px solid ${theme.border}` }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.primary }} />
        <span className="w-[60%] h-1 rounded-full opacity-60" style={{ backgroundColor: theme.text }} />
        <span className="w-[60%] h-1 rounded-full opacity-30" style={{ backgroundColor: theme.text }} />
        <span className="w-[60%] h-1 rounded-full opacity-30" style={{ backgroundColor: theme.text }} />
      </div>
      {/* Fake main pane */}
      <div className="flex-1 flex flex-col gap-1.5 p-2.5">
        {/* Fake header bar */}
        <div className="flex items-center justify-between rounded px-1.5 py-1" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}>
          <span className="w-[35%] h-1 rounded-full opacity-70" style={{ backgroundColor: theme.text }} />
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
        </div>
        {/* Fake content card */}
        <div className="flex-1 rounded p-1.5 flex flex-col justify-between" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}>
          <div className="space-y-1">
            <span className="block w-[70%] h-1 rounded-full opacity-70" style={{ backgroundColor: theme.text }} />
            <span className="block w-[50%] h-1 rounded-full opacity-40" style={{ backgroundColor: theme.text }} />
          </div>
          <span className="self-start rounded-full px-2 py-0.5 text-[6px] font-black" style={{ backgroundColor: theme.primary, color: theme.bg }}>
            &nbsp;
          </span>
        </div>
      </div>
    </div>
  );
}

interface SettingsViewProps {
  activeTheme: string;
  setActiveTheme: (theme: string) => void;
  onSaveAddress: () => void;
  pageBackgrounds: Record<string, { url: string; opacity: number; playbackRate?: number }>;
  setPageBackgrounds: (bgs: Record<string, { url: string; opacity: number; playbackRate?: number }>) => void;
}

export default function SettingsView({
  activeTheme,
  setActiveTheme,
  onSaveAddress,
  pageBackgrounds,
  setPageBackgrounds
}: SettingsViewProps) {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [diagnosticsNow, setDiagnosticsNow] = useState(() => Date.now());
  const diagnosticsMountedAt = useRef(Date.now());
  const [addressInput, setAddressInput] = useState(getApiBase());
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testErrorMessage, setTestErrorMessage] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [bgDropdownOpen, setBgDropdownOpen] = useState(false);
  const [selectedBgPageId, setSelectedBgPageId] = useState('dashboard');

  const [settings, setSettings] = useState<ShopSettings>({
    shop_name: '',
    shop_address: '',
    shop_city: '',
    shop_state: '',
    shop_phone: '',
    shop_logo_url: '',
    tax_rate: 0,
    default_labor_rate: 0,
    zip_code: '',
    default_parts_markup: 0,
    admin_notification_email: '',
    google_review_url: '',
    local_access_url: '',
    owner_cell_number: '',
    booking_open_time: '08:00',
    booking_close_time: '17:00',
    booking_slot_minutes: 60,
    booking_days_closed: '["Saturday", "Sunday"]',
    booking_min_notice_hours: 24,
    booking_max_concurrent: 1
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'failed'>('idle');
  const [saveError, setSaveError] = useState('');
  const [bookingSaveStatus, setBookingSaveStatus] = useState<'idle' | 'saving' | 'success' | 'failed'>('idle');
  const [bookingSaveError, setBookingSaveError] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const bgDropdownRef = useRef<HTMLDivElement>(null);

  // Colors here are pulled directly from each .theme-* class in index.css so
  // the thumbnails shown in the picker are a true, accurate preview of what
  // you'll actually get — not just an approximation.
  const availableThemes = [
    { id: 'theme-ragnarok', name: 'Ragnarök Dark', bg: '#0a0a0f', surface: '#13141a', border: '#1e2028', primary: '#f59e0b', text: '#f1f5f9', desc: 'Default industrial orange / amber' },
    { id: 'theme-midnight', name: 'Midnight Steel', bg: '#0d1117', surface: '#161b22', border: '#21262d', primary: '#58a6ff', text: '#e6edf3', desc: 'Oceanic blue / dark slate' },
    { id: 'theme-carbon', name: 'Carbon Black', bg: '#000000', surface: '#111111', border: '#222222', primary: '#ef4444', text: '#ffffff', desc: 'Pure stealth black with red highlights' },
    { id: 'theme-arctic', name: 'Arctic White', bg: '#f8fafc', surface: '#ffffff', border: '#e2e8f0', primary: '#3b82f6', text: '#0f172a', desc: 'High-contrast light garage theme' },
    { id: 'theme-forest', name: 'Forest Green', bg: '#0a0f0a', surface: '#111811', border: '#1a2e1a', primary: '#22c55e', text: '#f0fdf4', desc: 'Overland green & charcoal' },
    { id: 'theme-blood', name: 'Blood Orange', bg: '#0f0a00', surface: '#1a1200', border: '#2d2000', primary: '#f97316', text: '#fff7ed', desc: 'Heavy-duty amber / burnt orange' },
    { id: 'theme-purple', name: 'Royal Purple', bg: '#0a0014', surface: '#12001f', border: '#1f0035', primary: '#a855f7', text: '#faf5ff', desc: 'Specialized diagnostic neon purple' },
    { id: 'theme-gunmetal', name: 'Gunmetal', bg: '#0a0c0f', surface: '#131720', border: '#1e2533', primary: '#06b6d4', text: '#e2e8f0', desc: 'Tactical cyan / heavy alloy' },
    { id: 'theme-crimson', name: 'Crimson Racing', bg: '#100404', surface: '#1c0808', border: '#2e0f0f', primary: '#dc2626', text: '#fef2f2', desc: 'Motorsport red on near-black' },
    { id: 'theme-cyberpunk', name: 'Neon Cyberpunk', bg: '#07020d', surface: '#100a1f', border: '#1f1235', primary: '#ec4899', text: '#fdf2f8', desc: 'Hot magenta / late-night diagnostics' },
    { id: 'theme-copper', name: 'Copper Industrial', bg: '#120a05', surface: '#1f150a', border: '#33240f', primary: '#c2703d', text: '#fdf3ea', desc: 'Aged copper & rust on dark leather' },
    { id: 'theme-ocean', name: 'Deep Ocean', bg: '#040f12', surface: '#0a1e22', border: '#123238', primary: '#14b8a6', text: '#ecfeff', desc: 'Teal & navy, calm night-shift mode' },
  ];

  useEffect(() => {
    fetchStats();
    loadShopSettings();

    // Close custom dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (bgDropdownRef.current && !bgDropdownRef.current.contains(event.target as Node)) {
        setBgDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef, bgDropdownRef]);

  // Live tick for the diagnostics panel — drives the "last synced" relative
  // timestamp and the session uptime clock without needing another server call.
  useEffect(() => {
    const interval = setInterval(() => setDiagnosticsNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const loadShopSettings = async () => {
    try {
      const data = await api.getShopSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load shop settings:', err);
    }
  };

  const getDaysClosedArray = (): string[] => {
    try {
      if (!settings.booking_days_closed) return [];
      const parsed = JSON.parse(settings.booking_days_closed);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [];
  };

  const handleToggleDayClosed = (day: string) => {
    const currentDays = getDaysClosedArray();
    let nextDays: string[];
    if (currentDays.includes(day)) {
      nextDays = currentDays.filter(d => d !== day);
    } else {
      nextDays = [...currentDays, day];
    }
    setSettings({ ...settings, booking_days_closed: JSON.stringify(nextDays) });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    setSaveError('');
    try {
      await api.updateShopSettings(settings);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('failed');
      setSaveError(err.message || 'Failed to save shop settings.');
    }
  };

  const handleSaveBookingSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingSaveStatus('saving');
    setBookingSaveError('');
    try {
      await api.updateShopSettings(settings);
      setBookingSaveStatus('success');
      setTimeout(() => setBookingSaveStatus('idle'), 3000);
    } catch (err: any) {
      setBookingSaveStatus('failed');
      setBookingSaveError(err.message || 'Failed to save booking settings.');
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const data = await api.getStats();
      setStats(data);
      setLastFetchedAt(new Date());
    } catch (err) {
      console.error('Failed to load database stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const formatRelativeTime = (date: Date | null, nowMs: number): string => {
    if (!date) return '—';
    const diffSec = Math.max(0, Math.floor((nowMs - date.getTime()) / 1000));
    if (diffSec < 2) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr}h ago`;
  };

  const formatUptime = (ms: number): string => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleTestAndSaveConnection = async () => {
    setTestStatus('testing');
    setTestErrorMessage('');
    const targetAddress = addressInput.trim().replace(/\/$/, ''); // remove trailing slash

    try {
      // Fetch health with timeout
      const response = await fetch(`${targetAddress}/api/health`, { method: 'GET' });
      if (response.ok) {
        setTestStatus('success');
        setApiBase(targetAddress);
        onSaveAddress(); // callback to trigger app reload Base
        fetchStats();
      } else {
        throw new Error(`Server responded with status ${response.status}`);
      }
    } catch (err: any) {
      setTestStatus('failed');
      setTestErrorMessage(err.message || 'Server did not respond to ping test.');
    }
  };

  const currentTheme = availableThemes.find(t => t.id === activeTheme) || availableThemes[0];

  const hasAlerts = !!stats && (stats.lowStockCount ?? 0) > 0;
  const conversionRate = stats && (stats.totalLeads ?? 0) > 0
    ? ((stats.convertedLeads ?? 0) / (stats.totalLeads ?? 1)) * 100
    : 0;
  const formatMoney = (cents?: number) => `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-6" id="settings-view-root">

      {/* 1. Header Row */}
      <div className="border-b border-border-theme pb-4">
        <h1 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary-theme" />
          Workshop Settings
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure diagnostic connections, toggle theme elements, and view database partition logs.
        </p>
      </div>

      {/* 2. Business Diagnostics — wide dashboard */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Database className="w-4 h-4 text-primary-theme" />
            Business Diagnostics
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-slate-500">Synced {formatRelativeTime(lastFetchedAt, diagnosticsNow)}</span>
            <button
              onClick={fetchStats}
              disabled={statsLoading}
              className="p-1.5 text-slate-500 hover:text-white bg-bg-theme border border-border-theme rounded-lg transition cursor-pointer"
              title="Refresh stats"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin text-primary-theme' : ''}`} />
            </button>
          </div>
        </div>

        {statsLoading && !stats ? (
          <div className="py-14 text-center text-slate-500 text-xs font-mono bg-[#13141a]/80 border border-[#1e2028] rounded-xl">
            Querying database sectors...
          </div>
        ) : stats ? (
          <>
            {/* System status banner */}
            <div className={`flex items-center justify-between flex-wrap gap-2 rounded-xl px-4 py-3 border ${hasAlerts ? 'bg-amber-950/20 border-amber-600/30' : 'bg-emerald-950/20 border-emerald-600/30'}`}>
              <span className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider ${hasAlerts ? 'text-amber-400' : 'text-emerald-400'}`}>
                {hasAlerts ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {hasAlerts ? `${stats.lowStockCount} Inventory Alert${stats.lowStockCount === 1 ? '' : 's'} — Reorder Needed` : 'All Systems Nominal'}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {stats.totalJobsAllTime ?? 0} jobs all-time · {stats.completedJobsCount ?? 0} completed · {stats.rushJobsCount ?? 0} rush in progress
              </span>
            </div>

            {/* Category cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Database & Content */}
              <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-4 space-y-3 shadow-xl">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5 border-b border-border-theme pb-2.5">
                  <Database className="w-3.5 h-3.5 text-primary-theme" />
                  Database & Content
                </h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Service Manuals', value: stats.totalManuals?.toLocaleString() ?? '—', icon: Database },
                    { label: 'Customers On File', value: stats.totalCustomers?.toLocaleString() ?? '—', icon: Users },
                    { label: 'Vehicles Tracked', value: stats.totalVehicles?.toLocaleString() ?? '—', icon: Car },
                  ].map((row, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <row.icon className="w-3.5 h-3.5 text-primary-theme shrink-0" />
                        {row.label}
                      </span>
                      <span className="text-sm font-bold text-slate-100 font-mono">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Job Pipeline */}
              <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-4 space-y-3 shadow-xl">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5 border-b border-border-theme pb-2.5">
                  <ClipboardList className="w-3.5 h-3.5 text-primary-theme" />
                  Job Pipeline
                </h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Active Job Tickets', value: stats.activeJobs?.toLocaleString() ?? '—', icon: ClipboardList },
                    { label: 'Jobs In Queue', value: stats.queueCount?.toLocaleString() ?? '—', icon: Clock },
                    { label: 'Rush Jobs In Progress', value: (stats.rushJobsCount ?? 0).toLocaleString(), icon: AlertTriangle, warn: (stats.rushJobsCount ?? 0) > 0 },
                    { label: 'Pending Labor Hrs', value: `${(stats.totalPendingHours ?? 0).toFixed(1)}h`, icon: Timer },
                    { label: 'Avg Repair Time', value: `${(stats.avgRepairHours ?? 0).toFixed(1)}h`, icon: Gauge },
                  ].map((row, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <row.icon className={`w-3.5 h-3.5 shrink-0 ${row.warn ? 'text-amber-400' : 'text-primary-theme'}`} />
                        {row.label}
                      </span>
                      <span className={`text-sm font-bold font-mono ${row.warn ? 'text-amber-400' : 'text-slate-100'}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financials */}
              <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-4 space-y-3 shadow-xl">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5 border-b border-border-theme pb-2.5">
                  <DollarSign className="w-3.5 h-3.5 text-primary-theme" />
                  Financials
                </h3>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      Revenue This Month
                    </span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">{formatMoney(stats.revenueThisMonthCents)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <DollarSign className="w-3.5 h-3.5 text-primary-theme shrink-0" />
                      Revenue All-Time
                    </span>
                    <span className="text-sm font-bold text-slate-100 font-mono">{formatMoney(stats.revenueTotalCents)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Package className="w-3.5 h-3.5 text-primary-theme shrink-0" />
                      Avg Payment Value
                    </span>
                    <span className="text-sm font-bold text-slate-100 font-mono">{formatMoney(stats.avgPaymentValueCents)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${(stats.unpaidJobsCount ?? 0) > 0 ? 'text-amber-400' : 'text-primary-theme'}`} />
                      Unpaid Jobs
                    </span>
                    <span className={`text-sm font-bold font-mono ${(stats.unpaidJobsCount ?? 0) > 0 ? 'text-amber-400' : 'text-slate-100'}`}>
                      {(stats.unpaidJobsCount ?? 0).toLocaleString()} · {formatMoney((stats.unpaidJobsValue ?? 0) * 100)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Funnels & Leads */}
              <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-4 space-y-3 shadow-xl">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5 border-b border-border-theme pb-2.5">
                  <Megaphone className="w-3.5 h-3.5 text-primary-theme" />
                  Funnels & Leads
                </h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Active Funnels', value: `${stats.activeFunnels ?? 0} / ${stats.totalFunnels ?? 0}`, icon: Megaphone },
                    { label: 'Total Leads Captured', value: (stats.totalLeads ?? 0).toLocaleString(), icon: Users },
                    { label: 'Converted To Jobs', value: (stats.convertedLeads ?? 0).toLocaleString(), icon: CheckCircle2 },
                    { label: 'Conversion Rate', value: `${conversionRate.toFixed(0)}%`, icon: Gauge },
                  ].map((row, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <row.icon className="w-3.5 h-3.5 text-primary-theme shrink-0" />
                        {row.label}
                      </span>
                      <span className="text-sm font-bold text-slate-100 font-mono">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Homelab environment footer strip */}
            <div className="flex items-center flex-wrap gap-x-6 gap-y-1.5 text-slate-400 text-[11px] bg-bg-theme/50 px-4 py-3 border border-border-theme rounded-xl">
              <span className="flex items-center gap-1.5 font-black uppercase tracking-wider text-slate-500">
                <Cpu className="w-3.5 h-3.5 text-primary-theme" />
                Homelab Environment
              </span>
              <span>Fully local self-hosted instance</span>
              <span className="text-slate-600">·</span>
              <span>Engine: <span className="text-slate-300 font-mono">better-sqlite3</span></span>
              <span className="text-slate-600">·</span>
              <span>Routing: <span className="text-slate-300 font-mono">Static / local</span></span>
              <span className="text-slate-600">·</span>
              <span>Session Uptime: <span className="text-primary-theme font-mono">{formatUptime(diagnosticsNow - diagnosticsMountedAt.current)}</span></span>
            </div>
          </>
        ) : (
          <div className="py-6 text-center text-slate-500 text-xs font-sans bg-[#13141a]/80 border border-[#1e2028] rounded-xl">
            Could not read server metrics. Verify LAN Host address.
          </div>
        )}
      </div>

      <div className="max-w-4xl space-y-6">

          {/* Server Connection + Theme row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Server Connection Form Card */}
            <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-5 space-y-4 shadow-xl">
              <h2 className="text-sm font-bold text-slate-200 uppercase flex items-center gap-2">
                <Server className="w-4 h-4 text-primary-theme" />
                API Server LAN Host Location
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Set the LAN IP Address and PORT of your self-hosted Node.js backend. The default is http://localhost:4000.
              </p>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. http://192.168.1.100:4000"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    className="flex-1 bg-bg-theme border border-border-theme rounded-lg px-3.5 py-2 text-sm text-slate-205 font-mono focus:border-primary-theme focus:outline-none"
                    id="api-address-input"
                  />
                  <button
                    onClick={handleTestAndSaveConnection}
                    disabled={testStatus === 'testing'}
                    className="bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-black rounded-lg px-5 py-2 text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    {testStatus === 'testing' ? 'Testing...' : 'Test & Save'}
                  </button>
                </div>

                {/* Status responses */}
                {testStatus === 'success' && (
                  <div className="bg-green-950/20 border border-green-800/30 text-green-300 p-3 rounded-lg text-xs flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                    <span>Connection successful! Server synchronized. Settings updated.</span>
                  </div>
                )}

                {testStatus === 'failed' && (
                  <div className="bg-red-950/20 border border-red-900/30 text-red-300 p-3 rounded-lg text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Ping Check Interrupted</span>
                      <span className="text-[10px] text-slate-400">{testErrorMessage}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Theme customizer */}
            <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-5 space-y-4 shadow-xl text-left">
              <h2 className="text-sm font-bold text-slate-200 uppercase flex items-center gap-2">
                <Sun className="w-4 h-4 text-primary-theme" />
                Workshop Display Theme
              </h2>
              <p className="text-xs text-slate-400">
                Select a specialized color layout. Dark-ambient presets are highly recommended for eye safety and durability inside physical repair environments.
              </p>

              <div className="space-y-3">
                {/* Current theme preview + button to open the picker modal */}
                <div className="flex items-center gap-4 bg-bg-theme/40 border border-border-theme/60 rounded-xl p-4 select-none">
                  <ThemeThumbnail theme={currentTheme} className="w-28 h-20 shrink-0 shadow-lg" />
                  <div className="text-left flex-1 min-w-0">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Currently Active</span>
                    <span className="text-sm font-black text-slate-100 block uppercase tracking-wider mt-0.5">
                      {currentTheme.name}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {currentTheme.desc}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(true)}
                    className="shrink-0 bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-black rounded-lg px-4 py-2.5 text-[11px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                    id="theme-select-dropdown"
                  >
                    <Sun className="w-3.5 h-3.5" />
                    Change Theme
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Page Backgrounds Card */}
          <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-5 space-y-4 shadow-xl text-left">
            <h2 className="text-sm font-bold text-slate-200 uppercase flex items-center gap-2">
              <Image className="w-4 h-4 text-primary-theme" />
              Custom Page Backgrounds
            </h2>
            <p className="text-xs text-slate-400">
              Upload and configure custom background images or videos with transparency overlays for each section. Automations page is excluded.
            </p>

            <div className="space-y-4">
              {/* Dropdown to select page */}
              <div className="relative" ref={bgDropdownRef}>
                <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1">Select Page to Configure</label>
                <button
                  type="button"
                  onClick={() => setBgDropdownOpen(!bgDropdownOpen)}
                  className="w-full flex items-center justify-between bg-bg-theme border border-border-theme hover:border-amber-500/50 text-slate-200 text-xs px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/10 transition-all duration-150 cursor-pointer font-bold uppercase tracking-wider"
                >
                  <div className="flex items-center gap-2.5">
                    {(() => {
                      const backgroundPages = [
                        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
                        { id: 'customers', name: 'Customers', icon: Users },
                        { id: 'vehicles', name: 'Vehicles', icon: Car },
                        { id: 'jobs', name: 'Jobs / Work Orders', icon: ClipboardList },
                        { id: 'inventory', name: 'Inventory', icon: Package },
                        { id: 'calendar', name: 'Calendar', icon: Calendar },
                        { id: 'manual-library', name: 'Manual Library', icon: BookOpen },
                        { id: 'manual', name: 'Active Service Manual', icon: BookOpen },
                        { id: 'email', name: 'Email', icon: Mail },
                        { id: 'texts', name: 'Texts', icon: MessageSquare },
                        { id: 'payments', name: 'Payments', icon: DollarSign },
                        { id: 'funnels', name: 'Funnels', icon: Megaphone },
                        { id: 'sites', name: 'Websites', icon: Globe },
                        { id: 'ai-chat-bot', name: 'AI Chat Bot', icon: Bot },
                        { id: 'video-editor', name: 'Video Editor', icon: Clapperboard },
                        { id: 'youtube-trimmer', name: 'Youtube Trimmer', icon: Scissors },
                        { id: 'settings', name: 'Settings', icon: Settings },
                        { id: 'admin', name: 'Manage Users', icon: ShieldCheck }
                      ];
                      const selectedPage = backgroundPages.find(p => p.id === selectedBgPageId) || backgroundPages[0];
                      const PageIcon = selectedPage.icon;
                      return (
                        <>
                          <PageIcon className="w-4 h-4 text-primary-theme" />
                          <span>{selectedPage.name}</span>
                        </>
                      );
                    })()}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${bgDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {bgDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-[#13141a] border border-[#1e2028] rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto animate-fade-in divide-y divide-[#1e2028] outline-none">
                    {(() => {
                      const backgroundPages = [
                        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
                        { id: 'customers', name: 'Customers', icon: Users },
                        { id: 'vehicles', name: 'Vehicles', icon: Car },
                        { id: 'jobs', name: 'Jobs / Work Orders', icon: ClipboardList },
                        { id: 'inventory', name: 'Inventory', icon: Package },
                        { id: 'calendar', name: 'Calendar', icon: Calendar },
                        { id: 'manual-library', name: 'Manual Library', icon: BookOpen },
                        { id: 'manual', name: 'Active Service Manual', icon: BookOpen },
                        { id: 'email', name: 'Email', icon: Mail },
                        { id: 'texts', name: 'Texts', icon: MessageSquare },
                        { id: 'payments', name: 'Payments', icon: DollarSign },
                        { id: 'funnels', name: 'Funnels', icon: Megaphone },
                        { id: 'sites', name: 'Websites', icon: Globe },
                        { id: 'ai-chat-bot', name: 'AI Chat Bot', icon: Bot },
                        { id: 'video-editor', name: 'Video Editor', icon: Clapperboard },
                        { id: 'youtube-trimmer', name: 'Youtube Trimmer', icon: Scissors },
                        { id: 'settings', name: 'Settings', icon: Settings },
                        { id: 'admin', name: 'Manage Users', icon: ShieldCheck }
                      ];
                      return backgroundPages.map((p) => {
                        const isSelected = p.id === selectedBgPageId;
                        const PageIcon = p.icon;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedBgPageId(p.id);
                              setBgDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between text-left p-3 hover:bg-slate-800/40 transition duration-150 cursor-pointer ${isSelected ? 'bg-amber-500/5' : ''}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <PageIcon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                              <span className={`text-xs font-black uppercase tracking-wider ${isSelected ? 'text-amber-400' : 'text-slate-200'}`}>
                                {p.name}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse" />
                            )}
                          </button>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              {/* MediaField for custom background upload */}
              {(() => {
                const backgroundPages = [
                  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
                  { id: 'customers', name: 'Customers', icon: Users },
                  { id: 'vehicles', name: 'Vehicles', icon: Car },
                  { id: 'jobs', name: 'Jobs / Work Orders', icon: ClipboardList },
                  { id: 'inventory', name: 'Inventory', icon: Package },
                  { id: 'calendar', name: 'Calendar', icon: Calendar },
                  { id: 'manual-library', name: 'Manual Library', icon: BookOpen },
                  { id: 'manual', name: 'Active Service Manual', icon: BookOpen },
                  { id: 'email', name: 'Email', icon: Mail },
                  { id: 'texts', name: 'Texts', icon: MessageSquare },
                  { id: 'payments', name: 'Payments', icon: DollarSign },
                  { id: 'funnels', name: 'Funnels', icon: Megaphone },
                  { id: 'sites', name: 'Websites', icon: Globe },
                  { id: 'ai-chat-bot', name: 'AI Chat Bot', icon: Bot },
                  { id: 'video-editor', name: 'Video Editor', icon: Clapperboard },
                  { id: 'youtube-trimmer', name: 'Youtube Trimmer', icon: Scissors },
                  { id: 'settings', name: 'Settings', icon: Settings },
                  { id: 'admin', name: 'Manage Users', icon: ShieldCheck }
                ];
                const selectedPage = backgroundPages.find(p => p.id === selectedBgPageId) || backgroundPages[0];
                const bgConfig = pageBackgrounds[selectedPage.id] || { url: '', opacity: 100 };

                const handleBgChange = (url: string) => {
                  const updated = { ...pageBackgrounds };
                  if (!url.trim()) {
                    delete updated[selectedPage.id];
                  } else {
                    updated[selectedPage.id] = {
                      url,
                      opacity: bgConfig.opacity ?? 100,
                      playbackRate: bgConfig.playbackRate ?? 1
                    };
                  }
                  setPageBackgrounds(updated);
                };

                const handleOpacityChange = (key: string, opacityVal: number) => {
                  const updated = { ...pageBackgrounds };
                  if (updated[key]) {
                    updated[key] = {
                      ...updated[key],
                      opacity: opacityVal
                    };
                  } else {
                    updated[key] = {
                      url: '',
                      opacity: opacityVal
                    };
                  }
                  setPageBackgrounds(updated);
                };

                const handlePlaybackRateChange = (key: string, rateVal: number) => {
                  const updated = { ...pageBackgrounds };
                  if (updated[key]) {
                    updated[key] = {
                      ...updated[key],
                      playbackRate: rateVal
                    };
                  } else {
                    updated[key] = {
                      url: '',
                      opacity: 100,
                      playbackRate: rateVal
                    };
                  }
                  setPageBackgrounds(updated);
                };

                // Create a temporary media opacity/speed map for MediaField input
                const mediaOpacityMap = {
                  [selectedPage.id]: bgConfig.opacity ?? 100
                };
                const mediaPlaybackRateMap = {
                  [selectedPage.id]: bgConfig.playbackRate ?? 1
                };

                return (
                  <div className="space-y-3 bg-bg-theme/40 border border-border-theme/40 rounded-xl p-4">
                    <div className="flex items-center justify-between border-b border-border-theme pb-2 mb-2">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        Configure: {selectedPage.name} Background
                      </span>
                      {bgConfig.url && (
                        <button
                          type="button"
                          onClick={() => handleBgChange('')}
                          className="text-[10px] font-mono text-red-400 hover:text-red-300 uppercase tracking-wider cursor-pointer"
                        >
                          Reset Background
                        </button>
                      )}
                    </div>
                    <MediaField
                      value={bgConfig.url}
                      onChange={handleBgChange}
                      accept="both"
                      showPreview={true}
                      placeholder="Upload custom image/video or paste URL"
                      showOpacity={true}
                      opacityKey={selectedPage.id}
                      mediaOpacity={mediaOpacityMap}
                      onOpacityChange={handleOpacityChange}
                      showPlaybackRate={true}
                      playbackRateKey={selectedPage.id}
                      mediaPlaybackRate={mediaPlaybackRateMap}
                      onPlaybackRateChange={handlePlaybackRateChange}
                      help={`Select or upload a custom image or video for the ${selectedPage.name} view. Videos autoplay muted and loop. Move the transparency slider to adjust visibility (higher values make the background more visible, lower values darken it with a black overlay for higher text readability). Video backgrounds also get a playback speed slider (0.25x-2x).`}
                    />
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Shop Profile Settings Card */}
          <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-5 space-y-4 shadow-xl text-left" id="shop-profile-card">
            <h2 className="text-sm font-bold text-slate-200 uppercase flex items-center gap-2">
              <Store className="w-4 h-4 text-primary-theme" />
              Shop Profile & Billing Preferences
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Configure your garage branding, location info, tax rate, and default labor rate. These details will dynamically generate invoice headings and tax calculations.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4" id="shop-profile-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Shop Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Shop Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Workshop: Ragnarök"
                    value={settings.shop_name}
                    onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-primary-theme focus:outline-none"
                    id="shop-name-input"
                  />
                </div>

                {/* Shop Phone */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. (555) 0199"
                    value={settings.shop_phone}
                    onChange={(e) => setSettings({ ...settings, shop_phone: e.target.value })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-primary-theme focus:outline-none"
                    id="shop-phone-input"
                  />
                </div>

                {/* Shop Address */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Street Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 123 Resistance Way"
                    value={settings.shop_address}
                    onChange={(e) => setSettings({ ...settings, shop_address: e.target.value })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-primary-theme focus:outline-none"
                    id="shop-address-input"
                  />
                </div>

                {/* Shop City */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Los Angeles"
                    value={settings.shop_city}
                    onChange={(e) => setSettings({ ...settings, shop_city: e.target.value })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-primary-theme focus:outline-none"
                    id="shop-city-input"
                  />
                </div>

                {/* Shop State */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">State</label>
                  <input
                    type="text"
                    placeholder="e.g. CA"
                    value={settings.shop_state}
                    onChange={(e) => setSettings({ ...settings, shop_state: e.target.value })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-primary-theme focus:outline-none"
                    id="shop-state-input"
                  />
                </div>

                {/* Tax Rate */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 8.25"
                    value={settings.tax_rate === 0 ? '' : settings.tax_rate}
                    onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-primary-theme focus:outline-none"
                    id="shop-tax-rate-input"
                  />
                </div>

                {/* Default Labor Rate */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Default Labor Rate ($/hr)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 90.00"
                    value={settings.default_labor_rate === 0 ? '' : settings.default_labor_rate}
                    onChange={(e) => setSettings({ ...settings, default_labor_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-primary-theme focus:outline-none"
                    id="shop-labor-rate-input"
                  />
                </div>

                {/* Default Parts Markup (%) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Default Parts Markup (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 30.00"
                    value={(settings.default_parts_markup === undefined || settings.default_parts_markup === 0) ? '' : settings.default_parts_markup}
                    onChange={(e) => setSettings({ ...settings, default_parts_markup: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-primary-theme focus:outline-none"
                    id="shop-parts-markup-input"
                  />
                </div>

                {/* Zip Code */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Shop Zip Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 90210"
                    value={settings.zip_code}
                    onChange={(e) => setSettings({ ...settings, zip_code: e.target.value })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-primary-theme focus:outline-none"
                    id="shop-zip-code-input"
                  />
                </div>

                {/* Admin Notification Email */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Admin Notification Email</label>
                  <input
                    type="email"
                    placeholder="e.g. admin@yourshop.com"
                    value={settings.admin_notification_email || ''}
                    onChange={(e) => setSettings({ ...settings, admin_notification_email: e.target.value })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-primary-theme focus:outline-none"
                    id="shop-admin-notification-email-input"
                  />
                </div>

                {/* Google Review Link — powers the automated post-job review request */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Google Review Link</label>
                  <input
                    type="text"
                    placeholder="https://g.page/r/.../review"
                    value={settings.google_review_url || ''}
                    onChange={(e) => setSettings({ ...settings, google_review_url: e.target.value })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-primary-theme focus:outline-none"
                    id="shop-google-review-url-input"
                  />
                  <p className="text-[9px] text-slate-500 mt-1">
                    Used by the automated review-request that goes out ~2 days after a job is marked Complete. Nothing sends until this is filled in.
                  </p>
                </div>

                {/* Local/Tailscale Access URL — surfaced as a link in the Reformat tool
                    for large videos, since Cloudflare's proxy caps uploads around
                    100-200MB and silently fails anything bigger over the public domain */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Local / Tailscale Access URL</label>
                  <input
                    type="text"
                    placeholder="http://192.168.x.x:4000 or your Tailscale address"
                    value={settings.local_access_url || ''}
                    onChange={(e) => setSettings({ ...settings, local_access_url: e.target.value })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-primary-theme focus:outline-none"
                    id="shop-local-access-url-input"
                  />
                  <p className="text-[9px] text-slate-500 mt-1">
                    Large video uploads can fail over the public domain — Cloudflare caps proxied uploads around 100-200MB. Fill this in with your LAN IP:4000 or a Tailscale address, and the Reformat tool will offer it as a one-click link when a big file is selected. You'll need to log back in once you switch.
                  </p>
                </div>

                {/* Owner Cell Number — powers the Call button in Texts. Twilio calls
                    this number first, then bridges the call to whoever you tapped
                    Call on, once you pick up. */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Your Cell Number (for Call button)</label>
                  <input
                    type="tel"
                    placeholder="+1 555 123 4567"
                    value={settings.owner_cell_number || ''}
                    onChange={(e) => setSettings({ ...settings, owner_cell_number: e.target.value })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-primary-theme focus:outline-none"
                    id="shop-owner-cell-number-input"
                  />
                  <p className="text-[9px] text-slate-500 mt-1">
                    Used only by the Call button in Texts — Twilio rings this number first, and the moment you answer, it dials the contact and connects you both. Never shown to customers.
                  </p>
                </div>

                {/* Logo Upload & Preview */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Shop Logo</label>
                  <MediaField
                    value={settings.shop_logo_url}
                    onChange={(v) => setSettings({ ...settings, shop_logo_url: v })}
                    accept="image"
                    maxImageDimension={300}
                    showPreview
                    placeholder="https://... or upload a file"
                    help="Uploads are auto-scaled to 300x300px max, or paste a hosted image URL directly."
                  />
                </div>

              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1e2028]">
                <div>
                  {saveStatus === 'success' && (
                    <span className="text-xs text-green-400 font-bold block animate-pulse">
                      ✓ Profile Saved Successfully!
                    </span>
                  )}
                  {saveStatus === 'failed' && (
                    <span className="text-xs text-red-400 font-bold block">
                      ⚠ {saveError}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={saveStatus === 'saving'}
                  className="bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-black rounded-lg px-6 py-2 text-xs uppercase tracking-wider transition-all cursor-pointer"
                  id="save-shop-profile-button"
                >
                  {saveStatus === 'saving' ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>

          {/* Booking Settings Card */}
          <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-5 space-y-4 shadow-xl text-left" id="shop-booking-card">
            <h2 className="text-sm font-bold text-slate-200 uppercase flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-theme" />
              Self-Service Booking Availability
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Configure your shop's booking times, slot durations, closed days, and notice periods. These values will govern slot generation and validations for public customer booking funnels.
            </p>

            <form onSubmit={handleSaveBookingSettings} className="space-y-4" id="shop-booking-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Booking Open Time */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Daily Open Time</label>
                  <input
                    type="time"
                    value={settings.booking_open_time || '08:00'}
                    onChange={(e) => setSettings({ ...settings, booking_open_time: e.target.value })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-primary-theme focus:outline-none font-mono"
                    id="booking-open-time-input"
                  />
                </div>

                {/* Booking Close Time */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Daily Close Time</label>
                  <input
                    type="time"
                    value={settings.booking_close_time || '17:00'}
                    onChange={(e) => setSettings({ ...settings, booking_close_time: e.target.value })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-primary-theme focus:outline-none font-mono"
                    id="booking-close-time-input"
                  />
                </div>

                {/* Booking Slot Duration */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Slot Duration (Minutes)</label>
                  <input
                    type="number"
                    min="15"
                    step="5"
                    placeholder="e.g. 60"
                    value={settings.booking_slot_minutes || 60}
                    onChange={(e) => setSettings({ ...settings, booking_slot_minutes: parseInt(e.target.value) || 60 })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-primary-theme focus:outline-none"
                    id="booking-slot-minutes-input"
                  />
                </div>

                {/* Minimum Notice Period */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Minimum Notice Period (Hours)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 24"
                    value={settings.booking_min_notice_hours === undefined ? 24 : settings.booking_min_notice_hours}
                    onChange={(e) => setSettings({ ...settings, booking_min_notice_hours: parseInt(e.target.value) || 0 })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-primary-theme focus:outline-none"
                    id="booking-min-notice-input"
                  />
                </div>

                {/* Max Concurrent Bookings */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Max Bookings Per Slot</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 1"
                    value={settings.booking_max_concurrent || 1}
                    onChange={(e) => setSettings({ ...settings, booking_max_concurrent: parseInt(e.target.value) || 1 })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-primary-theme focus:outline-none"
                    id="booking-max-concurrent-input"
                  />
                </div>

                {/* Days Closed */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1">Weekly Closed Days (Off Days)</label>
                  <div className="flex flex-wrap gap-2">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                      const isClosed = getDaysClosedArray().includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleToggleDayClosed(day)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider border cursor-pointer transition-all ${
                            isClosed
                              ? 'bg-red-950/40 border-red-500/50 text-red-400 hover:bg-red-950/60'
                              : 'bg-[#181922] border-slate-700/50 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {day.substring(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1">
                    Toggle days your shop is closed. Customers will not be allowed to book appointments on closed days.
                  </p>
                </div>

              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1e2028]">
                <div>
                  {bookingSaveStatus === 'success' && (
                    <span className="text-xs text-green-400 font-bold block animate-pulse">
                      ✓ Booking Settings Saved!
                    </span>
                  )}
                  {bookingSaveStatus === 'failed' && (
                    <span className="text-xs text-red-400 font-bold block">
                      ⚠ {bookingSaveError}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={bookingSaveStatus === 'saving'}
                  className="bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-black rounded-lg px-6 py-2 text-xs uppercase tracking-wider transition-all cursor-pointer"
                  id="save-booking-settings-button"
                >
                  {bookingSaveStatus === 'saving' ? 'Saving...' : 'Save Booking Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Theme Picker Modal */}
          {dropdownOpen && (
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
              onClick={() => setDropdownOpen(false)}
            >
              <div
                className="bg-[#13141a] border border-[#1e2028] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2028] shrink-0">
                  <div>
                    <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <Sun className="w-4 h-4 text-primary-theme" />
                      Choose a Workshop Theme
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {availableThemes.length} presets — click any card to apply it instantly.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(false)}
                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableThemes.map((t) => {
                    const isSelected = t.id === activeTheme;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setActiveTheme(t.id);
                          setDropdownOpen(false);
                        }}
                        className={`relative flex flex-col gap-2.5 text-left p-3 rounded-xl border transition-all duration-150 cursor-pointer group ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/40'
                            : 'border-[#1e2028] hover:border-slate-600 bg-black/20 hover:bg-black/30'
                        }`}
                      >
                        <ThemeThumbnail theme={t} className="w-full h-24 group-hover:scale-[1.02] transition-transform shadow-md" />
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className={`text-xs font-black uppercase tracking-wider block ${isSelected ? 'text-amber-400' : 'text-slate-200'}`}>
                              {t.name}
                            </span>
                            <p className="text-[10px] text-slate-450 normal-case font-normal font-sans mt-0.5 leading-snug">
                              {t.desc}
                            </p>
                          </div>
                          {isSelected && (
                            <span className="shrink-0 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                              <Check className="w-3 h-3 text-slate-950" strokeWidth={3} />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
      </div>

    </div>
  );
}

