/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Vehicle } from '../types';
import { api } from '../lib/api';
import { Wrench, Car, RefreshCw, AlertTriangle, BookOpen, ChevronRight, ArrowLeft, ChevronDown, History } from 'lucide-react';

interface BrowseViewProps {
  onSelectVehicle?: (vehicle: Vehicle) => void;
  initialSearch?: string;
  selectedVehicle?: Vehicle | null;
  onClearSelectedVehicle?: () => void;
}

const NATIONALITIES = [
  {
    id: 'american',
    name: 'AMERICAN',
    emoji: '🇺🇸',
    accentColor: '#ef4444',
    makes: ["Ford", "GM", "Chevrolet", "Dodge and RAM", "Jeep", "Chrysler", "Buick", "Cadillac", "Lincoln", "Mercury", "Pontiac", "Oldsmobile", "Saturn", "Plymouth", "GMC", "Hummer", "Tesla", "Rivian", "American Motors", "Eagle", "Geo", "General Motors", "SRT"]
  },
  {
    id: 'japanese',
    name: 'JAPANESE',
    emoji: '🇯🇵',
    accentColor: '#f97316',
    makes: ["Toyota", "Honda", "Nissan-Datsun", "Mazda", "Subaru", "Mitsubishi", "Suzuki", "Isuzu", "Infiniti", "Lexus", "Acura", "Scion", "Daihatsu"]
  },
  {
    id: 'german',
    name: 'GERMAN',
    emoji: '🇩🇪',
    accentColor: '#eab308',
    makes: ["BMW", "Mercedes Benz", "Audi", "Volkswagen", "Porsche", "Mini", "Smart", "Opel"]
  },
  {
    id: 'korean',
    name: 'KOREAN',
    emoji: '🇰🇷',
    accentColor: '#3b82f6',
    makes: ["Hyundai", "Kia", "Genesis", "Daewoo"]
  },
  {
    id: 'european',
    name: 'EUROPEAN',
    emoji: '🇬🇧',
    accentColor: '#8b5cf6',
    makes: ["Land Rover", "Jaguar", "Volvo", "Saab", "Triumph", "Austin", "MG", "Sterling", "Lancia", "Fiat", "Alfa Romeo", "Renault", "Peugeot", "Merkur"]
  },
  {
    id: 'commercial',
    name: 'COMMERCIAL',
    emoji: '🚛',
    accentColor: '#10b981',
    makes: ["Freightliner", "International", "UD", "Workhorse"]
  }
];

const MAKE_LOGOS: Record<string, string> = {
  'toyota': 'https://logo.clearbit.com/toyota.com',
  'honda': 'https://logo.clearbit.com/honda.com',
  'nissan-datsun': 'https://logo.clearbit.com/nissan-global.com',
  'ford': 'https://logo.clearbit.com/ford.com',
  'chevrolet': 'https://logo.clearbit.com/chevrolet.com',
  'tesla': 'https://logo.clearbit.com/tesla.com',
  'bmw': 'https://logo.clearbit.com/bmw.com',
  'mercedes benz': 'https://logo.clearbit.com/mercedes-benz.com',
  'audi': 'https://logo.clearbit.com/audi.com',
  'volkswagen': 'https://logo.clearbit.com/volkswagen.com',
  'jeep': 'https://logo.clearbit.com/jeep.com',
  'dodge and ram': 'https://logo.clearbit.com/dodge.com',
  'gmc': 'https://logo.clearbit.com/gmc.com',
  'hyundai': 'https://logo.clearbit.com/hyundai.com',
  'kia': 'https://logo.clearbit.com/kia.com',
  'lexus': 'https://logo.clearbit.com/lexus.com',
  'subaru': 'https://logo.clearbit.com/subaru.com',
  'mazda': 'https://logo.clearbit.com/mazda.com',
  'porsche': 'https://logo.clearbit.com/porsche.com',
  'volvo': 'https://logo.clearbit.com/volvocars.com',
  'land rover': 'https://logo.clearbit.com/landrover.com',
  'genesis': 'https://logo.clearbit.com/genesis.com',
  'cadillac': 'https://logo.clearbit.com/cadillac.com',
  'buick': 'https://logo.clearbit.com/buick.com',
  'lincoln': 'https://logo.clearbit.com/lincoln.com',
  'infiniti': 'https://logo.clearbit.com/infinitiusa.com',
  'acura': 'https://logo.clearbit.com/acura.com',
  'mitsubishi': 'https://logo.clearbit.com/mitsubishi-motors.com',
  'alfa romeo': 'https://logo.clearbit.com/alfaromeo.com',
  'jaguar': 'https://logo.clearbit.com/jaguar.com',
};

export function parseDrivetrain(model: string): string {
  const m = model.toUpperCase();
  if (m.includes('AWD')) return 'AWD';
  if (m.includes('4WD') || m.includes('4X4')) return '4WD';
  if (m.includes('RWD')) return 'RWD';
  if (m.includes('FWD')) return 'FWD';
  
  const lower = model.toLowerCase();
  if (lower.includes('mustang') || lower.includes('corvette') || lower.includes('camaro') || lower.includes('charger') || lower.includes('challenger') || lower.includes('miata') || lower.includes('brz')) {
    return 'RWD';
  }
  if (lower.includes('silverado') || lower.includes('tacoma') || lower.includes('f-150') || lower.includes('f150') || lower.includes('tundra') || lower.includes('ram') || lower.includes('sierra') || lower.includes('wrangler') || lower.includes('land cruiser')) {
    return '4WD';
  }
  if (lower.includes('explorer') || lower.includes('subaru') || lower.includes('outback') || lower.includes('forester') || lower.includes('cr-v') || lower.includes('crv') || lower.includes('rav4') || lower.includes('rav-4')) {
    return 'AWD';
  }
  return 'FWD';
}

export function parseEngineType(engine: string): string {
  if (!engine) return 'Other';
  const e = engine.toUpperCase();
  if (e.includes('V8')) return 'V8';
  if (e.includes('V6')) return 'V6';
  if (e.includes('I4') || e.includes('L4') || e.includes('2.0L') || e.includes('2.4L') || e.includes('1.8L') || e.includes('1.5L') || e.includes('4-CYL')) return 'I4';
  if (e.includes('I6') || e.includes('L6') || e.includes('6-CYL') || e.includes('3.0L')) return 'I6';
  if (e.includes('V12')) return 'V12';
  if (e.includes('V10')) return 'V10';
  if (e.includes('H4') || e.includes('F4') || e.includes('BOXER')) return 'H4';
  if (e.includes('ELECTRIC') || e.includes('EV') || e.includes('BEV') || e.includes('DUAL MOTOR')) return 'EV';
  
  const cylinderMatch = e.match(/(\d)\s*-?\s*CYL/);
  if (cylinderMatch) {
    const cyl = cylinderMatch[1];
    if (cyl === '4') return 'I4';
    if (cyl === '6') return 'V6';
    if (cyl === '8') return 'V8';
  }
  return 'Other';
}

export function getDrivetrainBadge(drivetrain: string) {
  switch (drivetrain) {
    case 'FWD':
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/25';
    case 'AWD':
      return 'bg-green-500/10 text-green-400 border border-green-500/25';
    case 'RWD':
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/25';
    case '4WD':
      return 'bg-purple-500/10 text-purple-400 border border-purple-500/25';
    default:
      return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/25';
  }
}

export function getClientSideSearchResults(query: string, data: Vehicle[]): Vehicle[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  // Split query into individual search tokens
  const queryParts = trimmed.split(/\s+/).filter(Boolean);

  return data.map(vehicle => {
    const makeLower = vehicle.make.toLowerCase();
    const modelLower = vehicle.model.toLowerCase();
    const yearLower = vehicle.year.toLowerCase();
    const engineLower = vehicle.engine ? vehicle.engine.toLowerCase() : '';

    let matches = true;
    let score = 0;

    for (const part of queryParts) {
      let partMatched = false;

      // Check aliases for make
      let matchedByAlias = false;
      if (part === 'chevy' && (makeLower.includes('chevrolet') || makeLower.includes('chevy'))) matchedByAlias = true;
      if (part === 'chevrolet' && (makeLower.includes('chevrolet') || makeLower.includes('chevy'))) matchedByAlias = true;
      if (part === 'vw' && (makeLower.includes('volkswagen') || makeLower.includes('vw'))) matchedByAlias = true;
      if (part === 'volkswagen' && (makeLower.includes('volkswagen') || makeLower.includes('vw'))) matchedByAlias = true;
      if (part === 'benz' && (makeLower.includes('mercedes benz') || makeLower.includes('mercedes') || makeLower.includes('benz'))) matchedByAlias = true;
      if (part === 'mercedes' && (makeLower.includes('mercedes benz') || makeLower.includes('mercedes') || makeLower.includes('benz'))) matchedByAlias = true;
      if (part === 'dodge' && (makeLower.includes('dodge and ram') || makeLower.includes('dodge') || makeLower.includes('ram'))) matchedByAlias = true;
      if (part === 'ram' && (makeLower.includes('dodge and ram') || makeLower.includes('dodge') || makeLower.includes('ram'))) matchedByAlias = true;

      if (matchedByAlias) {
        partMatched = true;
        score += 100;
      }

      // Exact or partial fields checks
      if (makeLower.includes(part)) {
        partMatched = true;
        if (makeLower === part) score += 200;
        else score += 80;
      }
      if (modelLower.includes(part)) {
        partMatched = true;
        if (modelLower === part) score += 50;
        else score += 30;
      }
      if (yearLower.includes(part)) {
        partMatched = true;
        if (yearLower === part) score += 15;
        else score += 10;
      }
      if (engineLower.includes(part)) {
        partMatched = true;
        score += 5;
      }

      if (!partMatched) {
        matches = false;
        break;
      }
    }

    return { vehicle, matches, score };
  })
  .filter(item => item.matches)
  .sort((a, b) => b.score - a.score)
  .map(item => item.vehicle);
}

export default function BrowseView({ 
  onSelectVehicle, 
  initialSearch,
  selectedVehicle,
  onClearSelectedVehicle
}: BrowseViewProps) {
  
  // Drill-down states
  const [makes, setMakes] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  
  // Search and Loading states
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');
  const [searchResults, setSearchResults] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allCatalogVehicles, setAllCatalogVehicles] = useState<Vehicle[]>([]);
  const [drivetrainFilter, setDrivetrainFilter] = useState('ALL');
  const [engineFilter, setEngineFilter] = useState('ALL');

  // Reset filters when selected vehicle/make/year changes
  useEffect(() => {
    setDrivetrainFilter('ALL');
    setEngineFilter('ALL');
  }, [selectedMake, selectedYear]);

  // Collapsible section state (false = expanded, true = collapsed)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Active filter pill
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Hovered make state for dynamic accent glows
  const [hoveredMake, setHoveredMake] = useState<string | null>(null);

  // Recently viewed makes
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and load all makes, all vehicles & recently viewed on mount
  useEffect(() => {
    const fetchMakes = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedMakes = await api.getMakes();
        setMakes(fetchedMakes.sort());
      } catch (err: any) {
        console.error('Failed to load manufacturers list', err);
        setError(err.message || 'Failed to connect to the manual server.');
      } finally {
        setLoading(false);
      }
    };
    fetchMakes();

    const fetchAllVehicles = async () => {
      try {
        const list = await api.getVehicles(undefined, undefined, undefined, 2500);
        setAllCatalogVehicles(list);
      } catch (e) {
        console.error('Failed to pre-fetch catalog vehicles', e);
      }
    };
    fetchAllVehicles();

    const stored = localStorage.getItem('recently_viewed_makes');
    if (stored) {
      try {
        setRecentlyViewed(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recently viewed', e);
      }
    } else {
      setRecentlyViewed(['BMW', 'Tesla', 'Toyota', 'Ford']);
    }
  }, []);

  useEffect(() => {
    const fetchYears = async () => {
      if (!selectedMake) { setYears([]); setSelectedYear(''); return; }
      setLoading(true); setError(null);
      try {
        const fetchedYears = await api.getYears(selectedMake);
        setYears(fetchedYears.sort((a, b) => b.localeCompare(a)));
      } catch (err: any) {
        setError(err.message || 'Failed to load years list.');
      } finally { setLoading(false); }
    };
    fetchYears();
  }, [selectedMake]);

  useEffect(() => {
    const fetchVehicles = async () => {
      if (!selectedMake || !selectedYear) { setVehicles([]); return; }
      setLoading(true); setError(null);
      try {
        const fetchedVehicles = await api.getVehicles(selectedMake, selectedYear, undefined, 100);
        setVehicles(fetchedVehicles);
      } catch (err: any) {
        setError(err.message || 'Failed to load vehicles list.');
      } finally { setLoading(false); }
    };
    fetchVehicles();
  }, [selectedMake, selectedYear]);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!searchTerm.trim()) { setSearchResults([]); return; }
    setLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        let results: Vehicle[] = [];
        if (allCatalogVehicles && allCatalogVehicles.length > 0) {
          results = getClientSideSearchResults(searchTerm, allCatalogVehicles);
        } else {
          // Fallback if not loaded yet
          const fetched = await api.getVehicles(undefined, undefined, undefined, 2500);
          setAllCatalogVehicles(fetched);
          results = getClientSideSearchResults(searchTerm, fetched);
        }
        setSearchResults(results);
      } catch (err: any) {
        console.error('Flat search failed', err);
      } finally { setLoading(false); }
    }, 200);
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [searchTerm, allCatalogVehicles]);

  const handleSelectMake = (make: string) => {
    setSelectedMake(make);
    setSelectedYear('');
    setSearchTerm('');
    setRecentlyViewed(prev => {
      const filtered = prev.filter(m => m.toLowerCase() !== make.toLowerCase());
      const updated = [make, ...filtered].slice(0, 5);
      localStorage.setItem('recently_viewed_makes', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSelectVehicle = (vehicle: Vehicle) => {
    if (vehicle.make) {
      handleSelectMake(vehicle.make);
      setSelectedMake('');
      setSelectedYear('');
    }
    if (onSelectVehicle) onSelectVehicle(vehicle);
  };

  const handleGoBack = () => {
    if (selectedYear) setSelectedYear('');
    else if (selectedMake) setSelectedMake('');
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const scrollToSection = (sectionId: string) => {
    setActiveFilter(sectionId);
    if (sectionId === 'all') {
      document.getElementById('all-makes-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      const element = document.getElementById(`section-${sectionId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (collapsedSections[sectionId]) toggleSection(sectionId);
    }
  };

  const definedMakesLower = new Set(NATIONALITIES.flatMap(n => n.makes.map(m => m.toLowerCase())));
  const otherMakes = makes.filter(m => !definedMakesLower.has(m.toLowerCase()));

  const getFilteredGroupMakes = (groupMakes: string[]) =>
    groupMakes.filter(m => m.toLowerCase().includes(searchTerm.toLowerCase()) && makes.includes(m));

  const filteredOtherMakes = otherMakes.filter(m => m.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-6 py-6 text-left font-sans select-none" id="browse-view-root">
      
      {/* 1. Header Row */}
      <div className="flex items-center justify-between gap-4 border-b border-amber-500/15 pb-4">
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-3xl font-black text-slate-100 tracking-wider flex items-center gap-3 font-mono">
            <Wrench className="w-6 h-6 text-amber-500" />
            SERVICE MANUAL CATALOG
          </h1>
          <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase mt-0.5">
            #WORKSHOP / DATABASE / MANUALS
          </span>
        </div>

        {/* Total Manufacturers active Badge */}
        <div className="flex items-center gap-1.5 bg-amber-500/5 border border-amber-500/20 rounded-full px-3.5 py-1.5 font-mono text-[10px] text-amber-400 font-extrabold select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>{makes.length} MANUFACTURERS ACTIVE</span>
        </div>
      </div>

      {/* 2. Global Large Search Bar & Filters Section */}
      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for car make, model, or year... e.g., Toyota Camry, 2018 Ford"
            className="w-full rounded-full bg-black/50 border border-amber-500/30 focus:border-amber-500 pl-12 pr-16 py-3.5 text-sm md:text-base text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-amber-500/5 transition duration-200 font-sans font-medium"
            id="browse-keyword-input"
          />
          <Wrench className="absolute left-4 top-4.5 w-4.5 h-4.5 text-amber-500" />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300 text-xs font-mono uppercase tracking-widest font-extrabold cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Loader / Errors view */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-black/30 backdrop-blur-sm border border-white/5 rounded-xl">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-slate-400 text-sm font-mono">Syncing catalog data...</p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-900/30 bg-red-950/10 p-10 text-center space-y-3 max-w-2xl mx-auto backdrop-blur-sm">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <div>
            <p className="text-red-200 font-bold uppercase text-sm">Connection Interrupted</p>
            <p className="text-xs text-slate-400 mt-1">{error}</p>
          </div>
          <button
            onClick={() => {
              if (selectedYear) {
                setSelectedYear(selectedYear);
              } else if (selectedMake) {
                setSelectedMake(selectedMake);
              } else {
                setMakes([]);
              }
            }}
            className="px-4 py-2 rounded-lg bg-surface-theme border border-border-theme text-slate-202 hover:text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* MAIN VIEWPORT */}
      {!loading && !error && (
        <div className="space-y-6" id="all-makes-container">
          
          {/* SEARCH TERM IS ACTIVE */}
          {searchTerm.trim() ? (
            <div className="space-y-6">
              
              {/* Flat Search Results List */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                  <BookOpen className="w-4.5 h-4.5 text-amber-500" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    Procedure & Model Keyword Matches ({searchResults.length})
                  </h3>
                </div>

                {searchResults.length === 0 ? (
                  <div className="py-10 text-center border border-dashed border-white/10 rounded-xl bg-black/40 backdrop-blur-sm max-w-xl mx-auto">
                    <p className="text-slate-400 text-xs">No model manual pages matched this specific keyword sequence.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults.map((v) => (
                      <div
                        key={v.id}
                        className="bg-black/40 backdrop-blur-sm border border-white/10 hover:border-amber-500/40 hover:border-l-amber-500 border-l-[3px] border-l-border-theme rounded-xl p-4 flex items-center justify-between gap-4 transition-all duration-200 group"
                        id={`vehicle-catalog-row-${v.id}`}
                      >
                        <div className="space-y-1 min-w-0 text-left">
                          <span className="text-[9px] font-mono font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded select-none">
                            {v.year}
                          </span>
                          <h4 className="text-xs md:text-sm font-extrabold text-slate-200 truncate group-hover:text-amber-400 transition-colors leading-tight">
                            {v.make} {v.model}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-mono truncate">{v.engine}</p>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className={`text-[8px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border select-none ${
                            v.source === 'lemon'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          }`}>
                            {v.source} manual
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSelectVehicle(v)}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-1.5 px-3.5 rounded-lg text-[10px] uppercase tracking-wider transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5 shadow"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            Open Manual
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : null}

          {/* DRILL-DOWN BROWSER */}
          <div className="space-y-6">

            {/* VIEW 1: MAKES LIST WITH NATION GROUPINGS */}
            {!selectedMake && (
              <div className="space-y-6">
                
                {/* 1B. 3-Column Responsive Grid of Collapsible National Groups */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {NATIONALITIES.map((nat) => {
                    const groupMakes = getFilteredGroupMakes(nat.makes);
                    if (groupMakes.length === 0) return null;
                    const isCollapsed = !!collapsedSections[nat.id];

                    return (
                      <div
                        key={nat.id}
                        id={`section-${nat.id}`}
                        className="bg-black/40 backdrop-blur-sm border border-white/5 rounded-xl overflow-hidden transition duration-150 flex flex-col h-full"
                        style={{ borderLeft: `4px solid ${nat.accentColor}` }}
                      >
                        {/* Group Header collapsible bar */}
                        <div
                          onClick={() => toggleSection(nat.id)}
                          className="px-4 py-3 bg-[#111116] hover:bg-slate-800/25 border-b border-white/5 flex items-center justify-between cursor-pointer select-none shrink-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-2xl leading-none">{nat.emoji}</span>
                            <div className="flex flex-col text-left">
                              <h3 className="text-xs font-mono font-black tracking-widest text-slate-200">
                                {nat.name}
                              </h3>
                              <span className="text-[9px] font-mono text-slate-500 font-bold">
                                {groupMakes.length} MANUFACTURERS
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="text-slate-400 hover:text-white p-0.5"
                          >
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* List of makes inside (compact pills with accent outline glow) */}
                        {!isCollapsed && (
                          <div className="p-4 flex flex-wrap gap-2">
                            {groupMakes.map((make) => {
                              const isHovered = hoveredMake === `${nat.id}-${make}`;
                              return (
                                <button
                                  key={make}
                                  type="button"
                                  onClick={() => handleSelectMake(make)}
                                  onMouseEnter={() => setHoveredMake(`${nat.id}-${make}`)}
                                  onMouseLeave={() => setHoveredMake(null)}
                                  style={isHovered ? { boxShadow: `0 0 8px ${nat.accentColor}66`, borderColor: nat.accentColor } : { borderColor: 'rgba(255, 255, 255, 0.08)' }}
                                  className="border bg-black/60 text-slate-300 py-2 px-4 rounded-lg text-sm font-mono font-bold uppercase transition duration-150 cursor-pointer text-center select-none shadow"
                                >
                                  {make}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Other / Miscellaneous group */}
                  {filteredOtherMakes.length > 0 && (
                    <div
                      id="section-other"
                      className="bg-black/40 backdrop-blur-sm border border-white/5 rounded-xl overflow-hidden transition duration-150 flex flex-col h-full"
                      style={{ borderLeft: '4px solid #6b7280' }}
                    >
                      <div
                        onClick={() => toggleSection('other')}
                        className="px-4 py-3 bg-[#111116] hover:bg-slate-800/25 border-b border-white/5 flex items-center justify-between cursor-pointer select-none shrink-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl leading-none">🌍</span>
                          <div className="flex flex-col text-left">
                            <h3 className="text-xs font-mono font-black tracking-widest text-slate-200">
                              OTHER
                            </h3>
                            <span className="text-[9px] font-mono text-slate-500 font-bold">
                              {filteredOtherMakes.length} MANUFACTURERS
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="text-slate-400 hover:text-white p-0.5"
                        >
                          {collapsedSections['other'] ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {!collapsedSections['other'] && (
                        <div className="p-4 flex flex-wrap gap-2">
                          {filteredOtherMakes.map((make) => {
                            const isHovered = hoveredMake === `other-${make}`;
                            return (
                              <button
                                key={make}
                                type="button"
                                onClick={() => handleSelectMake(make)}
                                onMouseEnter={() => setHoveredMake(`other-${make}`)}
                                onMouseLeave={() => setHoveredMake(null)}
                                style={isHovered ? { boxShadow: `0 0 8px #6b728066`, borderColor: '#6b7280' } : { borderColor: 'rgba(255, 255, 255, 0.08)' }}
                                className="border bg-black/60 text-slate-300 py-2 px-4 rounded-lg text-sm font-mono font-bold uppercase transition duration-150 cursor-pointer text-center select-none shadow"
                              >
                                {make}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* VIEW 2: YEARS LIST */}
            {selectedMake && !selectedYear && (
              <div className="space-y-4">
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => setSelectedMake('')}
                    className="px-3.5 py-1.5 rounded-full text-xs font-mono font-extrabold uppercase tracking-wider transition-all duration-150 cursor-pointer bg-black/60 hover:bg-white/5 text-slate-300 border border-white/10 flex items-center gap-1.5 hover:text-white"
                  >
                    <span className="text-amber-500 font-black">←</span> Back to Makes
                  </button>
                </div>
                <div className="space-y-4 bg-black/40 backdrop-blur-sm border border-white/5 rounded-xl p-6 w-full">
                  <h3 className="text-xs font-mono font-extrabold uppercase tracking-widest text-slate-300 border-l-2 border-amber-500 pl-3">
                    Select Model Year for {selectedMake}
                  </h3>
                  {years.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-6">No release years found for this manufacturer.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 gap-3" id="years-catalog-grid">
                      {years.map((year) => (
                        <button
                          key={year}
                          type="button"
                          onClick={() => setSelectedYear(year)}
                          className="bg-black/50 border border-white/10 hover:border-amber-500 text-slate-200 hover:text-amber-400 font-mono font-bold text-xs py-4 px-2 rounded-lg text-center transition-all duration-150 cursor-pointer block"
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 3: MODELS LIST */}
            {selectedMake && selectedYear && (() => {
              const uniqueEngines = Array.from(new Set(vehicles.map(v => parseEngineType(v.engine))))
                .filter(Boolean)
                .sort();

              const filteredVehicles = vehicles.filter(v => {
                const dt = parseDrivetrain(v.model);
                const eng = parseEngineType(v.engine);
                const matchDt = drivetrainFilter === 'ALL' || dt === drivetrainFilter;
                const matchEng = engineFilter === 'ALL' || eng === engineFilter;
                return matchDt && matchEng;
              });

              return (
                <div className="space-y-4">
                  <div className="flex justify-start">
                    <button
                      type="button"
                      onClick={() => setSelectedYear('')}
                      className="px-3.5 py-1.5 rounded-full text-xs font-mono font-extrabold uppercase tracking-wider transition-all duration-150 cursor-pointer bg-black/60 hover:bg-white/5 text-slate-300 border border-white/10 flex items-center gap-1.5 hover:text-white"
                    >
                      <span className="text-amber-500 font-black">←</span> Back to Years
                    </button>
                  </div>
                  <div className="space-y-4 bg-black/40 backdrop-blur-sm border border-white/5 rounded-xl p-6 animate-fade-in w-full">
                    <h3 className="text-xs font-mono font-extrabold uppercase tracking-widest text-slate-300 border-l-2 border-amber-500 pl-3">
                      Browse Service Manuals for {selectedYear} {selectedMake}
                    </h3>

                  {/* Filter bar at top */}
                  <div className="flex flex-col gap-3.5 border-b border-white/5 pb-5 mb-5">
                    {/* Drivetrain Filters */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase w-28 shrink-0">DRIVETRAIN:</span>
                      <div className="flex flex-wrap gap-2">
                        {['ALL', 'FWD', 'AWD', 'RWD', '4WD'].map((dt) => (
                          <button
                            key={dt}
                            type="button"
                            onClick={() => setDrivetrainFilter(dt)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold uppercase transition-all duration-150 cursor-pointer ${
                              drivetrainFilter === dt
                                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                                : 'bg-black/60 hover:bg-white/5 text-slate-400 border border-white/5 hover:text-slate-200'
                            }`}
                          >
                            {dt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Engine Filters */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase w-28 shrink-0">ENGINE TYPE:</span>
                      <div className="flex flex-wrap gap-2">
                        {['ALL', ...uniqueEngines].map((eng) => (
                          <button
                            key={eng}
                            type="button"
                            onClick={() => setEngineFilter(eng)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold uppercase transition-all duration-150 cursor-pointer ${
                              engineFilter === eng
                                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                                : 'bg-black/60 hover:bg-white/5 text-slate-400 border border-white/5 hover:text-slate-200'
                            }`}
                          >
                            {eng}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {filteredVehicles.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-white/10 rounded-xl text-slate-500 text-xs">
                      No model variants match the selected filters.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#07080c]" id="vehicles-catalog-list">
                      <table className="w-full text-left border-collapse table-auto">
                        <thead className="bg-[#101118] border-b border-white/5 font-mono text-[10px] tracking-widest text-slate-400 uppercase">
                          <tr>
                            <th className="px-4 py-3 font-extrabold">YEAR</th>
                            <th className="px-4 py-3 font-extrabold">MODEL</th>
                            <th className="px-4 py-3 font-extrabold">ENGINE</th>
                            <th className="px-4 py-3 font-extrabold">DRIVETRAIN</th>
                            <th className="px-4 py-3 font-extrabold text-right">ACTION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredVehicles.map((v, idx) => {
                            const dt = parseDrivetrain(v.model);
                            const engType = parseEngineType(v.engine);
                            return (
                              <tr 
                                key={v.id} 
                                className={`transition-colors duration-150 group ${
                                  idx % 2 === 0 ? 'bg-[#0b0c11]' : 'bg-[#07080c]'
                                } hover:bg-white/5`}
                              >
                                {/* Year badge */}
                                <td className="px-4 py-2 font-mono whitespace-nowrap">
                                  <span className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded font-extrabold select-none">
                                    {v.year}
                                  </span>
                                </td>

                                {/* Model name */}
                                <td className="px-4 py-2 font-sans font-extrabold text-base md:text-lg text-white uppercase tracking-wide">
                                  {v.make} {v.model}
                                </td>

                                {/* Engine spec */}
                                <td className="px-4 py-2 font-mono text-xs text-slate-300">
                                  <div className="flex items-center gap-1.5">
                                    <span>{v.engine}</span>
                                    <span className="text-slate-500 text-[10px] font-bold">[{engType}]</span>
                                  </div>
                                </td>

                                {/* Drivetrain badge */}
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <span className={`text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full ${getDrivetrainBadge(dt)}`}>
                                    {dt}
                                  </span>
                                </td>

                                {/* OPEN MANUAL button */}
                                <td className="px-4 py-2 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectVehicle(v)}
                                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-1 px-3.5 rounded-lg text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer inline-flex items-center gap-1.5 shadow"
                                  >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>OPEN MANUAL</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
            })()}

          </div>

        </div>
      )}

    </div>
  );
}
