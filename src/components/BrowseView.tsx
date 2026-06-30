/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Vehicle } from '../types';
import { api } from '../lib/api';
import { Wrench, Car, RefreshCw, AlertTriangle, BookOpen, ChevronRight, ArrowLeft, ChevronDown, History, Search, Folder, FolderOpen, FileText, MoreHorizontal } from 'lucide-react';

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
    makes: ["Ford", "GM", "Chevrolet", "Dodge and Ram", "Jeep", "Chrysler", "Buick", "Cadillac", "Lincoln", "Mercury", "Pontiac", "Oldsmobile", "Saturn", "Plymouth", "GMC", "Hummer", "Tesla", "Rivian", "American Motors", "Eagle", "Geo", "General Motors", "SRT"]
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
  },
  {
    id: 'other',
    name: 'OTHER',
    emoji: '🌍',
    accentColor: '#6b7280',
    makes: ["VinFast", "Yugo", "ZAP", "Checker"]
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

export function extractModelAndVariant(fullModel: string) {
  const regex = /\b([LVIH]\d-[0-9.]+L|L\d-|V\d-|I\d-|[0-9.]+L)\b/i;
  const match = fullModel.match(regex);
  if (match && match.index !== undefined) {
    const modelGroup = fullModel.slice(0, match.index).trim();
    const variantName = fullModel.slice(match.index).trim();
    return {
      modelGroup: modelGroup || "Other",
      variantName: variantName || fullModel
    };
  }
  
  const firstSpaceIdx = fullModel.indexOf(' ');
  if (firstSpaceIdx !== -1) {
    return {
      modelGroup: fullModel.slice(0, firstSpaceIdx).trim(),
      variantName: fullModel.slice(firstSpaceIdx).trim()
    };
  }
  
  return {
    modelGroup: fullModel,
    variantName: ""
  };
}

export function getVariantDisplayName(v: Vehicle) {
  const { variantName } = extractModelAndVariant(v.model);
  if (variantName) {
    return variantName;
  }
  const dt = parseDrivetrain(v.model);
  const eng = v.engine ? v.engine : "Standard";
  return `${eng} - ${dt}`;
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
  const [collapsedModels, setCollapsedModels] = useState<Record<string, boolean>>({});
  
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  
  // Search and Loading states
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');
  const [searchResults, setSearchResults] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Initialize and load all makes & recently viewed on mount
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
        // Limit raised from 500 to 10000 — some make/year combos (e.g. Chevrolet 1972 = 3196 rows)
        // have more engine/trans variants than the old cap allowed, which silently dropped
        // entire models from the tree view (e.g. International 1968 was missing Scout, M800, etc).
        const fetchedVehicles = await api.getVehicles(selectedMake, selectedYear, undefined, 10000);
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
        const results = await api.getVehicles(undefined, undefined, searchTerm.trim(), 100);
        setSearchResults(results);
      } catch (err: any) {
        console.error('Flat search failed', err);
      } finally { setLoading(false); }
    }, 300);
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [searchTerm]);

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
      {!(selectedMake && selectedYear) && (
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
      )}

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
          {searchTerm.trim() && !(selectedMake && selectedYear) ? (
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
                    const groupMakes = nat.id === 'other'
                      ? [...getFilteredGroupMakes(nat.makes), ...filteredOtherMakes]
                      : getFilteredGroupMakes(nat.makes);
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
                const matchSearch = !searchTerm.trim() || 
                  v.model.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  v.engine.toLowerCase().includes(searchTerm.toLowerCase());
                return matchDt && matchEng && matchSearch;
              });

              // Group filtered vehicles by model
              const groupedModels: Record<string, Vehicle[]> = {};
              filteredVehicles.forEach((v) => {
                const { modelGroup } = extractModelAndVariant(v.model);
                const uppercaseGroup = modelGroup.toUpperCase();
                if (!groupedModels[uppercaseGroup]) {
                  groupedModels[uppercaseGroup] = [];
                }
                groupedModels[uppercaseGroup].push(v);
              });

              const modelKeys = Object.keys(groupedModels).sort();

              const toggleModel = (m: string) => {
                setCollapsedModels(prev => {
                  const current = prev[m] === undefined ? true : prev[m];
                  return { ...prev, [m]: !current };
                });
              };

              return (
                <div className="w-full max-w-2xl mx-auto md:max-w-3xl animate-fade-in space-y-4">
                  {/* Back to Years floating button */}
                  <div className="flex justify-start">
                    <button
                      type="button"
                      onClick={() => setSelectedYear('')}
                      className="px-3.5 py-1.5 rounded-full text-xs font-mono font-extrabold uppercase tracking-wider transition-all duration-150 cursor-pointer bg-black/60 hover:bg-white/5 text-slate-300 border border-white/10 flex items-center gap-1.5 hover:text-white"
                    >
                      <span className="text-amber-500 font-black">←</span> Back to Years
                    </button>
                  </div>

                  {/* Main Tree Card Panel */}
                  <div className="bg-[#0e0f14]/95 border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4 text-left">
                    
                    {/* Integrated Search Input */}
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search"
                        className="w-full rounded-lg bg-[#14151c] border border-white/5 pl-10 pr-12 py-2.5 text-sm text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition duration-200"
                      />
                      <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="absolute right-3.5 top-2.5 text-zinc-500 hover:text-slate-300 text-xs font-mono uppercase tracking-widest font-extrabold cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Horizontal Filters Section */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {['FWD', 'AWD', 'RWD', '4WD'].map((dt) => {
                        const isActive = drivetrainFilter === dt;
                        return (
                          <button
                            key={dt}
                            type="button"
                            onClick={() => setDrivetrainFilter(isActive ? 'ALL' : dt)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-black transition duration-150 ${
                              isActive 
                                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400' 
                                : 'bg-[#14151c] border border-white/5 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {dt}
                          </button>
                        );
                      })}
                      
                      {uniqueEngines.length > 0 && (
                        <>
                          <div className="h-6 w-px bg-white/5 mx-1" />
                          {uniqueEngines.map((eng) => {
                            const isActive = engineFilter === eng;
                            return (
                              <button
                                key={eng}
                                type="button"
                                onClick={() => setEngineFilter(isActive ? 'ALL' : eng)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-black transition duration-150 ${
                                  isActive 
                                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400' 
                                    : 'bg-[#14151c] border border-white/5 text-zinc-400 hover:text-zinc-200'
                                }`}
                              >
                                {eng}
                              </button>
                            );
                          })}
                        </>
                      )}
                    </div>

                    {/* Separator line */}
                    <div className="h-px bg-white/5 w-full my-2" />

                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase select-none">
                      <button 
                        type="button"
                        onClick={() => { setSelectedMake(''); setSelectedYear(''); }}
                        className="text-zinc-400 hover:text-white transition"
                      >
                        Make
                      </button>
                      <span className="text-zinc-700 font-normal">&gt;</span>
                      <button 
                        type="button"
                        onClick={() => setSelectedYear('')}
                        className="text-zinc-400 hover:text-white transition"
                      >
                        Year
                      </button>
                      <span className="text-zinc-700 font-normal">&gt;</span>
                      <span className="text-amber-500">{selectedYear}</span>
                    </div>

                    {/* Tree List of Models and Variants */}
                    <div className="space-y-4 pt-2">
                      {modelKeys.length === 0 ? (
                        <div className="py-12 text-center border border-dashed border-white/5 rounded-xl text-zinc-500 text-xs">
                          No model variants match the selected filters.
                        </div>
                      ) : (
                        modelKeys.map((modelKey) => {
                          const isCollapsed = collapsedModels[modelKey] === undefined ? true : collapsedModels[modelKey];
                          const groupVariants = groupedModels[modelKey];

                          return (
                            <div key={modelKey} className="space-y-1">
                              {/* Collapsible Model Group Header */}
                              <div 
                                onClick={() => toggleModel(modelKey)}
                                className="flex items-center gap-2 cursor-pointer select-none group/header py-1"
                              >
                                {isCollapsed ? (
                                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover/header:text-white transition" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-zinc-500 group-hover/header:text-white transition" />
                                )}
                                
                                <Folder className="w-4.5 h-4.5 text-amber-500 shrink-0 fill-amber-500/10" />
                                
                                <span className="font-mono text-sm font-black tracking-wider text-slate-100 uppercase group-hover/header:text-amber-400 transition">
                                  {modelKey}
                                </span>
                              </div>

                              {/* Indented Variants list with left connection line */}
                              {!isCollapsed && (
                                <div className="border-l border-zinc-800/80 ml-5.5 pl-4 space-y-2.5 py-1.5">
                                  {groupVariants.map((v) => {
                                    const variantDisplayName = getVariantDisplayName(v);
                                    return (
                                      <div 
                                        key={v.id}
                                        className="flex items-center justify-between group/variant py-0.5"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
                                          <span className="font-mono text-xs md:text-sm text-zinc-300 group-hover/variant:text-slate-100 transition truncate uppercase">
                                            {variantDisplayName}
                                          </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 shrink-0 pl-2">
                                          <span className="text-zinc-600 font-bold select-none text-xs">...</span>
                                          <button
                                            type="button"
                                            onClick={() => handleSelectVehicle(v)}
                                            className="border border-amber-500/50 hover:border-amber-500 hover:bg-amber-500/10 text-amber-500 font-mono font-black text-[11px] px-3.5 py-1 rounded transition duration-150 cursor-pointer"
                                          >
                                            OPEN MANUAL
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

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
