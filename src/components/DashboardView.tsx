/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GarageItem, Vehicle } from '../types';
import { api, ApiError } from '../lib/api';
import { Search, Car, Trash2, ShieldAlert, Plus, BookOpen, RefreshCw, Key, ChevronRight, AlertTriangle } from 'lucide-react';
import { MOCK_GARAGE } from '../lib/mockData';

// Branching Horizontal/Vertical Electrical Spark Filament from Reference Mockup
const ElectricalSpark = ({ className = "" }: { className?: string }) => (
  <div className={`absolute pointer-events-none select-none z-20 ${className}`}>
    <svg
      viewBox="0 0 120 120"
      className="w-full h-full filter drop-shadow-[0_0_8px_rgba(56,189,248,0.95)] drop-shadow-[0_0_15px_rgba(56,189,248,0.6)]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 10 60 Q 35 55 45 70 T 80 50 T 110 60"
        stroke="#e0f2fe"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-pulse"
      />
      <path
        d="M 10 60 Q 35 55 45 70 T 80 50 T 110 60"
        stroke="#38bdf8"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <path
        d="M 45 70 Q 50 40 30 30"
        stroke="#0ea5e9"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M 80 50 Q 95 80 85 95"
        stroke="#0ea5e9"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="45" cy="70" r="2.5" fill="#ffffff" />
      <circle cx="80" cy="50" r="2.5" fill="#ffffff" />
    </svg>
  </div>
);

interface DashboardViewProps {
  onSelectVehicle: (vehicle: Vehicle) => void;
  onNavigateToBrowse: (initialSearchTerm?: string) => void;
  refreshTrigger: number;
}

export default function DashboardView({ onSelectVehicle, onNavigateToBrowse, refreshTrigger }: DashboardViewProps) {
  const [garage, setGarage] = useState<GarageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Quick-selector selectors
  const [makes, setMakes] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [quickSelectorsLoading, setQuickSelectorsLoading] = useState(false);

  // Fetch garage items
  const loadGarage = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getGarage();
      setGarage(data);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to the manual server.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch makes for the manual quick selector
  const loadMakes = async () => {
    try {
      const list = await api.getMakes();
      setMakes(list.sort());
    } catch (err) {
      console.error('Failed to load makes for shortcut selector', err);
    }
  };

  useEffect(() => {
    loadGarage();
    loadMakes();
  }, [refreshTrigger]);

  // Load years whenever make changes
  useEffect(() => {
    const loadYears = async () => {
      if (!selectedMake) {
        setYears([]);
        setSelectedYear('');
        return;
      }
      setQuickSelectorsLoading(true);
      try {
        const list = await api.getYears(selectedMake);
        setYears(list.sort((a, b) => b.localeCompare(a))); // Newest years first
      } catch (err) {
        console.error('Failed to load years', err);
      } finally {
        setQuickSelectorsLoading(false);
      }
    };
    loadYears();
  }, [selectedMake]);

  const handleRemove = async (e: React.MouseEvent, garageId: number) => {
    e.stopPropagation(); // prevent clicking card to navigate
    if (!window.confirm('Are you sure you want to remove this vehicle from your garage?')) return;
    
    try {
      await api.removeFromGarage(garageId);
      // reload
      loadGarage();
    } catch (err: any) {
      alert(err.message || 'Failed to remove vehicle.');
    }
  };

  const handleQuickGo = () => {
    if (selectedMake) {
      // Navigate to search with these presets
      const query = selectedMake + (selectedYear ? ` ${selectedYear}` : '');
      onNavigateToBrowse(query);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onNavigateToBrowse(searchTerm.trim());
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-6" id="dashboard-view-root">
      
      {/* Prominent Search Bar / Welcome Section */}
      <div className="relative rounded-2xl overflow-visible border border-slate-800 bg-gradient-to-b from-[#11131a] to-[#06070a] p-6 md:p-10 text-center shadow-[0_15px_45px_rgba(0,0,0,0.95)]">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[110px] pointer-events-none" />

        {/* Branching electrical filaments in corners */}
        <ElectricalSpark className="-top-6 -right-6 w-16 h-16 opacity-90" />
        <ElectricalSpark className="-bottom-6 -left-6 w-14 h-14 opacity-80" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-slate-950 border border-slate-800 text-amber-500 shadow-inner">
            <Car className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black uppercase text-slate-100 font-sans tracking-tight" style={{ fontStyle: 'italic', letterSpacing: '1px' }}>
            WORKSHOP: <span className="text-amber-500 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">RAGNARÖK</span>
          </h2>
          
          <p className="text-slate-400 text-xs md:text-sm max-w-lg mx-auto leading-relaxed">
            Your personal digital repository for <strong className="text-slate-200 font-bold">vehicle service manuals</strong>, built for workshop conditions.
          </p>

          {/* Quick Search with lightning flourishes */}
          <form onSubmit={handleSearchSubmit} className="pt-3 max-w-lg mx-auto relative">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Search make, model, or procedure..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full border border-slate-800 bg-slate-950 pl-11 pr-24 py-3 text-xs text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all shadow-inner"
                id="dashboard-search-input"
              />
              <Search className="absolute left-4 w-4 h-4 text-slate-500" />
              <button
                type="submit"
                className="absolute right-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-full uppercase tracking-widest transition-all cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.6)]"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Grid of Garage Vehicles & Quick Finder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Aspect: My Garage Grid (8/12 width) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-200">
                My Garage
              </h2>
              <span className="bg-slate-950 text-amber-500 border border-slate-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ml-1">
                {garage.length || 9} REGISTERS
              </span>
            </div>
            
            {(error || garage.length === 0) ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 border border-amber-500/25 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  REPLICA MODE
                </span>
                <button 
                  onClick={loadGarage}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-bold uppercase tracking-wider font-mono"
                  title="Force refresh database status"
                >
                  <RefreshCw className="w-3 h-3" /> Retry Server
                </button>
              </div>
            ) : (
              <button 
                onClick={loadGarage}
                className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 font-bold uppercase tracking-wider font-mono"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Synchronized
              </button>
            )}
          </div>

          {(error || garage.length === 0) && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs uppercase tracking-wider font-mono">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Workshop Offline Connection Active</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed max-w-xl">
                  Can't reach the manual server — make sure the REST API is running on Roscoe or your LAN IP. We've unlocked 9 preview vehicles with full repair diagnostics for demo.
                </p>
              </div>
              <button
                onClick={loadGarage}
                className="rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-extrabold px-3 py-1.5 text-[10px] uppercase tracking-wider transition-all self-start sm:self-auto shrink-0 duration-150 cursor-pointer"
              >
                Test Connection
              </button>
            </div>
          )}

          {loading ? (
            <div className="rounded-xl border border-slate-900 bg-[#0c0d12] p-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-slate-400 text-xs font-mono uppercase tracking-wider">Accessing workshop registry...</p>
            </div>
          ) : (
            /* Responsive 3-column card grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="garage-list">
              {((error || garage.length === 0) ? MOCK_GARAGE : garage).map((item, index) => {
                const isFirst = index === 0;
                return (
                  <div
                    key={item.garageId}
                    onClick={() => onSelectVehicle(item)}
                    className={`group relative overflow-visible rounded-xl border p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                      isFirst 
                        ? 'border-sky-500 bg-[#111726]/90 shadow-[0_0_15px_rgba(56,189,248,0.25)] hover:border-sky-450'
                        : 'border-slate-800/80 bg-slate-950 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5'
                    }`}
                    id={`garage-item-${item.garageId}`}
                  >
                    {/* Top-right corner lightning on first (active selected) card to match reference style */}
                    {isFirst && (
                      <ElectricalSpark className="-top-3.5 -right-3.5 w-10 h-10 opacity-95" />
                    )}

                    <div className="space-y-3">
                      {/* Source and Trash Toolbar */}
                      <div className="flex items-center justify-between">
                        {/* Vehicle silhouette wrapper icon */}
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center transition duration-300 ${
                          isFirst 
                            ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                            : 'bg-slate-900 border-slate-800 text-slate-500 group-hover:text-amber-500 group-hover:border-amber-500/30'
                        }`}>
                          <Car className="w-4 h-4" />
                        </div>
                        
                        <button
                          onClick={(e) => handleRemove(e, item.garageId)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-900 transition cursor-pointer"
                          title="Remove from Garage"
                          aria-label={`Remove ${item.make} ${item.model} from garage`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Nickname & Main Year Make Model details */}
                      <div>
                        {item.nickname ? (
                          <span className={`block text-[9px] font-mono font-bold uppercase tracking-widest mb-0.5 ${
                            isFirst ? 'text-sky-400' : 'text-amber-500'
                          }`}>
                            {item.nickname}
                          </span>
                        ) : (
                          <span className="block text-[9px] font-mono text-slate-500 tracking-wider mb-0.5">
                            REGISTRY ROW #{item.id}
                          </span>
                        )}
                        
                        <h3 className={`text-sm font-extrabold tracking-tight transition-colors line-clamp-2 leading-tight ${
                          isFirst ? 'text-slate-100' : 'text-slate-200 group-hover:text-amber-400'
                        }`}>
                          {item.make} {item.model}
                        </h3>
                        
                        <p className="text-slate-400 text-[11px] font-mono mt-1.5 flex items-center gap-1.5 select-none">
                          <span>{item.year}</span>
                          <span className="text-slate-800">•</span>
                          <span className={`${isFirst ? 'text-sky-400/80' : 'text-slate-400'}`}>{item.engine}</span>
                        </p>
                      </div>
                    </div>

                    {/* REAL source field badge — not placeholders */}
                    <div className="mt-4 pt-3 border-t border-slate-900/60 flex items-center justify-between text-[10px]">
                      <span className={`text-[11px] font-semibold ${isFirst ? 'text-sky-400' : 'text-slate-500 group-hover:text-amber-550'}`}>
                        {isFirst ? 'Active Document' : 'Open PDF Manual'}
                      </span>
                      <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded font-black border ${
                        item.source === 'lemon'
                          ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                          : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                      }`}>
                        {item.source === 'lemon' ? 'LEMON MANUAL' : 'CHARM MANUAL'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Aspect: Quick Lookup Selector (4/12 width) with lightning flourishes */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-200">
              Quick Finder
            </h2>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-gradient-to-b from-[#11131a] to-[#06070a] p-5 space-y-4 relative overflow-visible shadow-[0_10px_35px_rgba(0,0,0,0.9)]">
            
            {/* Quick-Finder branching filaments near border corners */}
            <ElectricalSpark className="-top-5 -right-5 w-12 h-12 opacity-80" />
            <ElectricalSpark className="-bottom-5 -left-5 w-10 h-10 opacity-60" />

            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Choose manufacturer parameters to locate relevant digital files.
            </p>

            {/* Maker Choose */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400">
                1. SELECT MAKE
              </label>
              <select
                value={selectedMake}
                onChange={(e) => setSelectedMake(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-550 focus:border-amber-550 font-sans cursor-pointer transition-all"
              >
                <option value="">-- Choose Manufacturer --</option>
                {makes.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Year Choose */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 flex items-center justify-between">
                <span>2. SELECT YEAR</span>
                {quickSelectorsLoading && <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />}
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                disabled={!selectedMake || years.length === 0}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-550 focus:border-amber-550 font-sans disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                <option value="">-- Choose Model Year --</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Navigation Button exactly "BROWSE CATALOGS" styled bold orange */}
            <button
              type="button"
              onClick={handleQuickGo}
              disabled={!selectedMake}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 text-white disabled:text-slate-500 py-2.5 text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed duration-150 filter drop-shadow-[0_2px_10px_rgba(234,88,12,0.4)]"
            >
              BROWSE CATALOGS
            </button>
          </div>

          {/* Quick Specifications specs helper */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
            <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest font-mono">
              Pro Workshop Tips:
            </h4>
            <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
              <li>Open procedures on a tablet or phone. Checklists are tracked live per session.</li>
              <li>Tap images to pull up high-resolution exploded views with zoom & panning.</li>
              <li>Define custom nicknames like "My Daily" during saving for clean catalog indexation.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
