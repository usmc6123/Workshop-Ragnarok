/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GarageItem, Vehicle } from '../types';
import { api, ApiError } from '../lib/api';
import { Search, Car, Trash2, ShieldAlert, Plus, BookOpen, RefreshCw, Key, ChevronRight, AlertTriangle } from 'lucide-react';
import { MOCK_GARAGE } from '../lib/mockData';
import { LOGO_URL } from '../constants/branding';
import CatLaserOverlay from './CatLaserOverlay';

// Tech rivets for physical panel feeling in workshop
const PanelRivet = ({ className = "" }: { className?: string }) => (
  <div className={`absolute w-1 h-1 rounded-full bg-slate-500 border border-slate-900 shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.3)] ${className}`} id={`panel-rivet-${Math.random().toString(36).substr(2, 4)}`} />
);

// High-fidelity background with brushed metal texture, organic rock fractures/stone cracks, and center glow vignette
const SubtleCrackedMetalGrid = () => (
  <div className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-2xl z-0" id="subtle-cracked-metal-bg">
    {/* Micro Brushed Metal hairlines */}
    <div className="absolute inset-0 opacity-[0.09] mix-blend-overlay" style={{
      backgroundImage: 'repeating-linear-gradient(0deg, #000, #000 1px, transparent 1px, transparent 2px)',
      backgroundSize: '100% 2px'
    }} />
    {/* Organic Rock Fractures / Stone Cracks inside panel */}
    <svg className="absolute inset-0 w-full h-full opacity-[0.22] stroke-slate-505" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 50 10 L 80 40 L 65 75 L 110 110 L 140 180" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M 80 40 L 125 30 L 140 50" stroke="#64748b" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M 850 30 L 820 70 L 840 115 L 810 160 L 835 210" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M 820 70 L 770 90 L 755 120" stroke="#64748b" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M 280 220 L 310 245 L 295 270 L 330 300" stroke="#64748b" strokeWidth="1.0" strokeLinecap="round" opacity="0.7" />
      <path d="M 680 210 L 650 240 L 665 275 L 630 310" stroke="#64748b" strokeWidth="1.0" strokeLinecap="round" opacity="0.7" />
    </svg>
    {/* Central warm glow bloom */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.22)_0%,rgba(217,119,6,0.06)_45%,transparent_75%)]" />
    {/* Central sky cyan highlight */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.06)_0%,transparent_60%)]" />
    {/* Vignette edge shadowing */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(2,2,4,0.92)_100%)]" />
  </div>
);

// Gorgeous blooming lightning flashes for corner flourishes
const TopLeftLightning = () => (
  <svg className="absolute top-0 left-0 w-40 h-40 sm:w-52 sm:h-52 md:w-64 md:h-64 select-none pointer-events-none z-10" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" id="lightning-tl">
    <g filter="url(#lightning-neon-heavy)">
      <path d="M 0 0 L 25 30 L 12 42 L 50 75 L 35 90 L 85 130 L 70 145 L 115 185 M 25 30 L 55 20 M 50 75 L 85 65 M 85 130 L 115 115" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 0 0 L 25 30 L 12 42 L 50 75 L 35 90 L 85 130 L 70 145 L 115 185 M 25 30 L 55 20 M 50 75 L 85 65 M 85 130 L 115 115" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </g>
  </svg>
);

const TopRightLightning = () => (
  <svg className="absolute top-0 right-0 w-40 h-40 sm:w-52 sm:h-52 md:w-64 md:h-64 select-none pointer-events-none z-10" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" id="lightning-tr">
    <g filter="url(#lightning-neon-heavy)">
      <path d="M 200 0 L 175 30 L 188 42 L 150 75 L 165 90 L 115 130 L 130 145 L 85 185 M 175 30 L 145 20 M 150 75 L 115 65 M 115 130 L 85 115" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 200 0 L 175 30 L 188 42 L 150 75 L 165 90 L 115 130 L 130 145 L 85 185 M 175 30 L 145 20 M 150 75 L 115 65 M 115 130 L 85 115" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </g>
  </svg>
);

const BottomLeftLightning = () => (
  <svg className="absolute bottom-0 left-0 w-40 h-40 sm:w-52 sm:h-52 md:w-64 md:h-64 select-none pointer-events-none z-10" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" id="lightning-bl">
    <g filter="url(#lightning-neon-heavy)">
      <path d="M 0 200 L 25 170 L 12 158 L 50 125 L 35 110 L 85 70 L 70 55 L 115 15 M 25 170 L 55 180 M 50 125 L 85 135 M 85 70 L 115 85" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 0 200 L 25 170 L 12 158 L 50 125 L 35 110 L 85 70 L 70 55 L 115 15 M 25 170 L 55 180 M 50 125 L 85 135 M 85 70 L 115 85" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </g>
  </svg>
);

const BottomRightLightning = () => (
  <svg className="absolute bottom-0 right-0 w-40 h-40 sm:w-52 sm:h-52 md:w-64 md:h-64 select-none pointer-events-none z-10" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" id="lightning-br">
    <g filter="url(#lightning-neon-heavy)">
      <path d="M 200 200 L 175 170 L 188 158 L 150 125 L 165 110 L 115 70 L 130 55 L 85 15 M 175 170 L 145 180 M 150 125 L 115 135 M 115 70 L 85 85" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 200 200 L 175 170 L 188 158 L 150 125 L 165 110 L 115 70 L 130 55 L 85 15 M 175 170 L 145 180 M 150 125 L 115 135 M 115 70 L 85 85" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </g>
  </svg>
);

// Branching Horizontal/Vertical Electrical Spark Filament from Reference Mockup
const ElectricalSpark = ({ className = "" }: { className?: string }) => (
  <div className={`absolute pointer-events-none select-none z-20 ${className}`} id={`electrical-spark-${Math.random().toString(36).substr(2, 4)}`}>
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
      <CatLaserOverlay />
      
      {/* Shared SVG filter definition for corner lightning neon bloom */}
      <svg className="absolute w-0 h-0" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="lightning-neon-heavy" x="-100%" y="-100%" width="300%" height="300%">
            <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#0284c7" floodOpacity="0.95" />
            <feDropShadow dx="0" dy="0" stdDeviation="4.5" floodColor="#38bdf8" floodOpacity="1" />
            <feDropShadow dx="0" dy="0" stdDeviation="1.2" floodColor="#ffffff" floodOpacity="1" />
          </filter>
        </defs>
      </svg>

      {/* Prominent Search Bar / Welcome Section (Redesigned Hero matching reference) */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-[#101116]/40 backdrop-blur-sm p-8 md:p-14 text-center shadow-[0_20px_50px_rgba(0,0,0,0.98)] select-none">
        
        {/* Four massive majestic blooming lightning corner flourishes */}
        <TopLeftLightning />
        <TopRightLightning />
        <BottomLeftLightning />
        <BottomRightLightning />

        {/* Tech rivets on hero corners */}
        <PanelRivet className="top-3 left-3" />
        <PanelRivet className="top-3 right-3" />
        <PanelRivet className="bottom-3 left-3" />
        <PanelRivet className="bottom-3 right-3" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          {/* Centered above headline, roughly 15-18% of hero height */}
          <div className="relative w-24 h-24 md:w-32 md:h-32 mx-auto shrink-0 transition-transform duration-300 hover:scale-105 active:scale-95 cursor-pointer">
            {/* Soft Warm bloom highlight specifically behind the centered logo */}
            <div className="absolute -inset-6 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
            <img 
              src={LOGO_URL} 
              alt="Workshop: Ragnarök" 
              className="w-full h-full object-cover rounded-full border-2 border-slate-700/50 shadow-[0_0_15px_rgba(245,158,11,0.25)] select-none"
            />
          </div>

          {/* Epic Chunky display-style headline utilizing Metal Mania */}
          <h1 className="text-4xl sm:text-5xl md:text-6.5xl font-black uppercase text-center flex flex-wrap items-center justify-center gap-x-3 gap-y-1 select-none font-metal py-1" style={{ fontFamily: '"Metal Mania", "Cinzel", serif' }}>
            <span className="bg-gradient-to-b from-slate-100 via-slate-300 to-slate-400 bg-clip-text text-transparent filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] [text-shadow:0_1px_0_#94a3b8,0_2px_0_#64748b,0_3px_0_#475569,0_5px_8px_rgba(0,0,0,0.9)] tracking-wide" style={{ WebkitTextStroke: '1.2px #020204' }}>
              WORKSHOP:
            </span>
            <span className="bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 bg-clip-text text-transparent filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] [text-shadow:0_1px_0_#f59e0b,0_2px_0_#d97706,0_3px_0_#b45309,0_5px_8px_rgba(0,0,0,0.9)] tracking-wide" style={{ WebkitTextStroke: '1.2px #020204' }}>
              RAGNARÖK
            </span>
          </h1>
          
          {/* Muted elegant tagline */}
          <p className="text-slate-300 text-xs sm:text-sm md:text-base font-medium max-w-2xl mx-auto leading-relaxed">
            Your personal digital repository for <strong className="font-extrabold text-slate-100 italic">vehicle service manuals</strong>, built for workshop conditions.
          </p>

          {/* Quick Search with standard state wiring */}
          <form onSubmit={handleSearchSubmit} className="pt-3 max-w-xl mx-auto relative z-20">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Search make, model, or procedure..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full border border-slate-700 bg-slate-950/95 pl-11 pr-28 py-3.5 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 focus:outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)] font-sans"
                id="dashboard-search-input"
              />
              <Search className="absolute left-4 w-4 h-4 text-slate-400" />
              <button
                type="submit"
                className="absolute right-1.5 px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-full uppercase tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all cursor-pointer font-bold duration-150 active:scale-95"
              >
                SEARCH
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
            /* Responsive 3-column card grid with metallic panel designs and rivets */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="garage-list">
              {((error || garage.length === 0) ? MOCK_GARAGE : garage).map((item, index) => {
                const isFirst = index === 0;
                return (
                  <div
                    key={item.garageId}
                    onClick={() => onSelectVehicle(item)}
                    className={`group relative overflow-hidden rounded-xl border p-4.5 cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                      isFirst 
                        ? 'border-sky-500/90 bg-gradient-to-b from-[#111726]/95 to-[#07090f]/95 shadow-[0_0_15px_rgba(56,189,248,0.22)] hover:border-sky-455'
                        : 'border-slate-705/90 bg-gradient-to-b from-[#181a24] to-[#0a0b0e] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-amber-500/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.12)] hover:-translate-y-0.5'
                    }`}
                    id={`garage-item-${item.garageId}`}
                  >
                    {/* Corner rivets for raw mechanical panel feeling */}
                    <PanelRivet className="top-2 left-2 opacity-30 group-hover:opacity-75" />
                    <PanelRivet className="top-2 right-2 opacity-30 group-hover:opacity-75" />
                    <PanelRivet className="bottom-2 left-2 opacity-30 group-hover:opacity-75" />
                    <PanelRivet className="bottom-2 right-2 opacity-30 group-hover:opacity-75" />

                    {/* Top-right corner lightning on first (active selected) card to match reference style */}
                    {isFirst && (
                      <ElectricalSpark className="-top-3.5 -right-3.5 w-10 h-10 opacity-95" />
                    )}

                    <div className="space-y-3 relative z-10 bg-transparent">
                      {/* Source and Trash Toolbar */}
                      <div className="flex items-center justify-between">
                        {/* Vehicle silhouette wrapper icon */}
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center transition duration-300 ${
                          isFirst 
                            ? 'bg-sky-500/10 border-sky-500/20 text-sky-400 font-bold'
                            : 'bg-[#020204] border-slate-700 text-slate-500 group-hover:text-amber-500 group-hover:border-amber-500/30'
                        }`}>
                          <Car className="w-4 h-4" />
                        </div>
                        
                        <button
                          onClick={(e) => handleRemove(e, item.garageId)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-900 transition cursor-pointer relative z-20"
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
                          <span className={`${isFirst ? 'text-sky-400/80 font-semibold' : 'text-slate-400'}`}>{item.engine}</span>
                        </p>
                      </div>
                    </div>

                    {/* REAL source field badge — not placeholders */}
                    <div className="mt-4 pt-3 border-t border-slate-900/60 flex items-center justify-between text-[10px] relative z-10">
                      <span className={`text-[11px] font-semibold ${isFirst ? 'text-sky-400' : 'text-slate-500 group-hover:text-amber-500/80'}`}>
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

          <div className="rounded-xl border border-slate-700 bg-gradient-to-b from-[#181a24] to-[#0a0b0e] p-5.5 space-y-4 relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] shadow-[0_15px_35px_rgba(0,0,0,0.95)] select-none">
            
            {/* Tech rivets on corner boundaries */}
            <PanelRivet className="top-2 left-2" />
            <PanelRivet className="top-2 right-2" />
            <PanelRivet className="bottom-2 left-2" />
            <PanelRivet className="bottom-2 right-2" />

            {/* Quick-Finder branching filaments near border corners */}
            <ElectricalSpark className="-top-5 -right-5 w-12 h-12 opacity-80" />
            <ElectricalSpark className="-bottom-5 -left-5 w-10 h-10 opacity-60" />

            <p className="text-[11px] text-slate-400 leading-relaxed font-sans mt-1">
              Choose manufacturer parameters to locate relevant digital files.
            </p>

            {/* Maker Choose */}
            <div className="space-y-1.5 relative z-10">
              <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400">
                1. SELECT MAKE
              </label>
              <select
                value={selectedMake}
                onChange={(e) => setSelectedMake(e.target.value)}
                className="w-full bg-[#020204]/95 border border-slate-700 hover:border-slate-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-sans cursor-pointer transition-all"
              >
                <option value="">-- Choose Manufacturer --</option>
                {makes.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Year Choose */}
            <div className="space-y-1.5 relative z-10">
              <label className="block text-[10px] font-bold tracking-widest uppercase text-slate-400 flex items-center justify-between">
                <span>2. SELECT YEAR</span>
                {quickSelectorsLoading && <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />}
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                disabled={!selectedMake || years.length === 0}
                className="w-full bg-[#020204]/95 border border-slate-700 hover:border-slate-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-sans disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
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
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 disabled:bg-slate-900 disabled:from-slate-850 disabled:to-slate-900 disabled:text-slate-500 py-2.5 text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed duration-150 filter drop-shadow-[0_2px_10px_rgba(245,158,11,0.25)] relative z-10 font-bold"
            >
              BROWSE CATALOGS
            </button>
          </div>

          {/* Quick Specifications specs helper */}
          <div className="relative overflow-hidden rounded-xl border border-slate-705 bg-gradient-to-b from-[#181a24]/95 to-[#0a0b0e]/95 p-4 space-y-3 shadow-md">
            <PanelRivet className="top-1.5 left-1.5 opacity-25" />
            <PanelRivet className="top-1.5 right-1.5 opacity-25" />
            <PanelRivet className="bottom-1.5 left-1.5 opacity-25" />
            <PanelRivet className="bottom-1.5 right-1.5 opacity-25" />

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
