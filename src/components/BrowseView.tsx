/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Vehicle } from '../types';
import { api } from '../lib/api';
import { Search, Car, RefreshCw, AlertTriangle, BookOpen, ChevronRight, ArrowLeft, ChevronDown, History } from 'lucide-react';

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
    makes: ["Ford", "GM", "Chevrolet", "Dodge and RAM", "Jeep", "Chrysler", "Buick", "Cadillac", "Lincoln", "Mercury", "Pontiac", "Oldsmobile", "Saturn", "Plymouth", "GMC", "Hummer", "Tesla", "Rivian", "American Motors", "Eagle", "Geo", "General Motors", "SRT"]
  },
  {
    id: 'japanese',
    name: 'JAPANESE',
    emoji: '🇯🇵',
    makes: ["Toyota", "Honda", "Nissan-Datsun", "Mazda", "Subaru", "Mitsubishi", "Suzuki", "Isuzu", "Infiniti", "Lexus", "Acura", "Scion", "Daihatsu"]
  },
  {
    id: 'german',
    name: 'GERMAN',
    emoji: '🇩🇪',
    makes: ["BMW", "Mercedes Benz", "Audi", "Volkswagen", "Porsche", "Mini", "Smart", "Opel"]
  },
  {
    id: 'korean',
    name: 'KOREAN',
    emoji: '🇰🇷',
    makes: ["Hyundai", "Kia", "Genesis", "Daewoo"]
  },
  {
    id: 'european',
    name: 'EUROPEAN',
    emoji: '🇬🇧',
    makes: ["Land Rover", "Jaguar", "Volvo", "Saab", "Triumph", "Austin", "MG", "Sterling", "Lancia", "Fiat", "Alfa Romeo", "Renault", "Peugeot", "Merkur"]
  },
  {
    id: 'commercial',
    name: 'COMMERCIAL',
    emoji: '🚛',
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
  'dodge and ram': 'https://logo.clearbit.com/ramtrucks.com',
  'gmc': 'https://logo.clearbit.com/gmc.com',
  'hyundai': 'https://logo.clearbit.com/hyundai.com',
  'kia': 'https://logo.clearbit.com/kia.com',
  'lexus': 'https://logo.clearbit.com/lexus.com',
  'subaru': 'https://logo.clearbit.com/subaru.com',
  'mazda': 'https://logo.clearbit.com/mazda.com',
  'porsche': 'https://logo.clearbit.com/porsche.com',
  'volvo': 'https://logo.clearbit.com/volvocars.com',
  'land rover': 'https://logo.clearbit.com/landrover.com',
};

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

  // Collapsible section state (false = expanded, true = collapsed)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

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

    // Load recently viewed
    const stored = localStorage.getItem('recently_viewed_makes');
    if (stored) {
      try {
        setRecentlyViewed(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recently viewed', e);
      }
    } else {
      // Default placeholder list matching mockup if empty
      setRecentlyViewed(['BMW', 'Tesla', 'Toyota', 'Ford']);
    }
  }, []);

  // Fetch years when make is selected
  useEffect(() => {
    const fetchYears = async () => {
      if (!selectedMake) {
        setYears([]);
        setSelectedYear('');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const fetchedYears = await api.getYears(selectedMake);
        setYears(fetchedYears.sort((a, b) => b.localeCompare(a))); // Newest first
      } catch (err: any) {
        console.error('Failed to load years list', err);
        setError(err.message || 'Failed to load years list.');
      } finally {
        setLoading(false);
      }
    };
    fetchYears();
  }, [selectedMake]);

  // Fetch vehicles when year is selected
  useEffect(() => {
    const fetchVehicles = async () => {
      if (!selectedMake || !selectedYear) {
        setVehicles([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const fetchedVehicles = await api.getVehicles(selectedMake, selectedYear, undefined, 100);
        setVehicles(fetchedVehicles);
      } catch (err: any) {
        console.error('Failed to load vehicles list', err);
        setError(err.message || 'Failed to load vehicles list.');
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, [selectedMake, selectedYear]);

  // Debounced flat search across all manuals
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await api.getVehicles(undefined, undefined, searchTerm.trim(), 100);
        setSearchResults(results);
      } catch (err: any) {
        console.error('Flat search failed', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchTerm]);

  const handleSelectMake = (make: string) => {
    setSelectedMake(make);
    setSelectedYear('');
    setSearchTerm(''); // Clear search on select make to view its years list

    // Update recently viewed
    setRecentlyViewed(prev => {
      const filtered = prev.filter(m => m.toLowerCase() !== make.toLowerCase());
      const updated = [make, ...filtered].slice(0, 5);
      localStorage.setItem('recently_viewed_makes', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSelectVehicle = (vehicle: Vehicle) => {
    // Add vehicle make to recently viewed as well
    if (vehicle.make) {
      handleSelectMake(vehicle.make);
      // Reset selectedMake since we are directly opening the manual
      setSelectedMake('');
      setSelectedYear('');
    }
    if (onSelectVehicle) {
      onSelectVehicle(vehicle);
    }
  };

  // Back button navigation handler
  const handleGoBack = () => {
    if (selectedYear) {
      setSelectedYear('');
    } else if (selectedMake) {
      setSelectedMake('');
    }
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const scrollToSection = (sectionId: string) => {
    if (sectionId === 'all') {
      const element = document.getElementById('all-makes-container');
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      const element = document.getElementById(`section-${sectionId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Expand section if collapsed
      if (collapsedSections[sectionId]) {
        toggleSection(sectionId);
      }
    }
  };

  // Compute dynamic Other nationality makes
  const definedMakesLower = new Set(
    NATIONALITIES.flatMap(n => n.makes.map(m => m.toLowerCase()))
  );
  const otherMakes = makes.filter(m => !definedMakesLower.has(m.toLowerCase()));

  // Filter makes for group display based on search query
  const getFilteredGroupMakes = (groupMakes: string[]) => {
    return groupMakes.filter(m => 
      m.toLowerCase().includes(searchTerm.toLowerCase()) && makes.includes(m)
    );
  };

  const filteredOtherMakes = otherMakes.filter(m => 
    m.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-6 py-6 text-left font-sans" id="browse-view-root">
      
      {/* 1. Header Row */}
      <div className="flex items-center justify-between gap-4 border-b border-amber-500/10 pb-4">
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-3xl font-black text-slate-100 tracking-wider flex items-center gap-3 font-mono">
            <Car className="w-6 h-6 text-amber-500" />
            SERVICE MANUAL CATALOG
          </h1>
          <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase mt-0.5">
            #WORKSHOP / DATABASE / MANUALS
          </span>
        </div>

        {/* Total Manufacturers active Badge */}
        <div className="flex items-center gap-1.5 bg-amber-500/5 border border-amber-500/20 rounded-full px-3.5 py-1.5 font-mono text-[10px] text-amber-400 font-extrabold select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>{makes.length} manufacturers active</span>
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
            className="w-full rounded-full bg-[#111115] border border-amber-500/30 focus:border-amber-500 pl-12 pr-16 py-3.5 text-sm md:text-base text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-amber-500/5 transition duration-200 font-sans font-medium"
            id="browse-keyword-input"
          />
          <Search className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
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

        {/* Filter Pills with Flags */}
        {!selectedMake && (
          <div className="flex flex-wrap gap-2.5 pt-1 select-none">
            <button
              type="button"
              onClick={() => scrollToSection('all')}
              className="px-4 py-2 bg-amber-500 text-[#0a0a0f] font-mono text-[11px] font-black uppercase rounded-full transition duration-150 cursor-pointer shadow-lg shadow-amber-500/10"
            >
              ALL
            </button>
            {NATIONALITIES.map((nat) => {
              const groupFilteredMakes = getFilteredGroupMakes(nat.makes);
              if (searchTerm.trim() && groupFilteredMakes.length === 0) return null;
              return (
                <button
                  key={nat.id}
                  type="button"
                  onClick={() => scrollToSection(nat.id)}
                  className="px-4 py-2 bg-[#111115] hover:bg-[#1a1a22] border border-amber-500/20 hover:border-amber-500/50 text-slate-300 hover:text-amber-400 font-mono text-[11px] font-bold uppercase rounded-full transition duration-150 cursor-pointer flex items-center gap-1.5"
                >
                  <span className="text-xs leading-none">{nat.emoji}</span>
                  <span>{nat.name}</span>
                </button>
              );
            })}
            {filteredOtherMakes.length > 0 && (
              <button
                type="button"
                onClick={() => scrollToSection('other')}
                className="px-4 py-2 bg-[#111115] hover:bg-[#1a1a22] border border-amber-500/20 hover:border-amber-500/50 text-slate-300 hover:text-amber-400 font-mono text-[11px] font-bold uppercase rounded-full transition duration-150 cursor-pointer flex items-center gap-1.5"
              >
                <span>🌍</span>
                <span>OTHER</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Loader / Errors view */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-slate-400 text-sm font-mono">Syncing catalog data...</p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-900/30 bg-red-950/10 p-10 text-center space-y-3 max-w-2xl mx-auto">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <div>
            <p className="text-red-200 font-bold uppercase text-sm">Connection Interrupted</p>
            <p className="text-xs text-slate-400 mt-1">{error}</p>
          </div>
          <button
            onClick={() => {
              if (selectedYear) {
                setSelectedYear(selectedYear); // Retrigger
              } else if (selectedMake) {
                setSelectedMake(selectedMake);
              } else {
                setMakes([]); // Reset & retrigger
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
                <div className="flex items-center gap-2 border-b border-[#1e2028] pb-2">
                  <BookOpen className="w-4.5 h-4.5 text-amber-500" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    Procedure & Model Keyword Matches ({searchResults.length})
                  </h3>
                </div>

                {searchResults.length === 0 ? (
                  <div className="py-10 text-center border border-dashed border-[#1e2028] rounded-xl bg-[#111115]/40 max-w-xl mx-auto">
                    <p className="text-slate-450 text-xs">No model manual pages matched this specific keyword sequence.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults.map((v) => (
                      <div
                        key={v.id}
                        className="bg-gradient-to-b from-[#111115] to-[#0a0a0f] border border-[#1e2028] hover:border-amber-500/40 hover:border-l-amber-500 border-l-[3px] border-l-border-theme rounded-xl p-4 flex items-center justify-between gap-4 transition-all duration-200 group"
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

          {/* DRILL-DOWN BROWSER (Mockup exact grouped style) */}
          <div className="space-y-6">
            
            {/* Navigation Breadcrumb / Back Button Row */}
            {selectedMake && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e2028] pb-3">
                <nav aria-label="Catalog Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 font-sans font-medium">
                  <button
                    onClick={() => { setSelectedMake(''); setSelectedYear(''); }}
                    className={`hover:text-amber-500 transition-colors uppercase font-mono tracking-wider font-extrabold text-[10px] ${!selectedMake ? 'text-amber-500' : 'text-slate-400'}`}
                  >
                    All Makes
                  </button>

                  {selectedMake && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <button
                        onClick={() => { setSelectedMake(selectedMake); setSelectedYear(''); }}
                        className={`hover:text-amber-500 transition-colors uppercase font-mono tracking-wider font-extrabold text-[10px] ${!selectedYear ? 'text-amber-500' : 'text-slate-400'}`}
                      >
                        {selectedMake}
                      </button>
                    </>
                  )}

                  {selectedYear && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="text-amber-400 font-semibold uppercase font-mono tracking-wider font-extrabold text-[10px]">
                        {selectedYear}
                      </span>
                    </>
                  )}
                </nav>

                {/* Back Button */}
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 hover:text-white transition bg-surface-theme border border-border-theme hover:border-slate-700 rounded-lg px-3.5 py-1.5 shadow select-none cursor-pointer self-start sm:self-auto"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-amber-500" />
                  <span>← Back</span>
                </button>
              </div>
            )}

            {/* VIEW 1: MAKES LIST WITH NATION GROUPINGS */}
            {!selectedMake && (
              <div className="space-y-6">
                
                {/* 1A. Recently Viewed makes (Beautiful Cards row) */}
                {recentlyViewed.length > 0 && (
                  <div className="space-y-3 text-left">
                    <h3 className="text-xs md:text-sm font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      Recently Viewed
                    </h3>
                    <div className="flex flex-wrap gap-4 select-none">
                      {recentlyViewed.map((make) => {
                        const logoUrl = MAKE_LOGOS[make.toLowerCase()];
                        return (
                          <button
                            key={`recent-${make}`}
                            type="button"
                            onClick={() => handleSelectMake(make)}
                            className="flex flex-col items-center gap-1.5 group cursor-pointer"
                          >
                            {/* Rounded glow card for brand emblem */}
                            <div className="w-16 h-16 rounded-xl bg-[#111116] border border-amber-500/20 group-hover:border-amber-500/50 group-hover:shadow-lg group-hover:shadow-amber-500/10 flex items-center justify-center p-3 transition-all duration-150">
                              {logoUrl ? (
                                <img 
                                  src={logoUrl} 
                                  alt={`${make} Logo`} 
                                  className="w-full h-full object-contain filter brightness-90 group-hover:brightness-100 transition-all"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="font-mono text-base font-black tracking-wider text-amber-500 group-hover:text-amber-400">
                                  {make.substring(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-450 group-hover:text-white font-medium text-center select-none truncate max-w-[64px]">
                              {make}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

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
                        className="bg-[#111116] border border-amber-500/10 hover:border-amber-500/20 rounded-xl overflow-hidden transition duration-150 flex flex-col h-full"
                      >
                        {/* Group Header collapsible bar */}
                        <div
                          onClick={() => toggleSection(nat.id)}
                          className="px-4 py-3 bg-[#16161c] hover:bg-slate-800/25 border-b border-amber-500/10 flex items-center justify-between cursor-pointer select-none shrink-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm leading-none">{nat.emoji}</span>
                            <h3 className="text-xs font-mono font-black tracking-widest text-slate-200">
                              {nat.name}
                            </h3>
                          </div>
                          <button
                            type="button"
                            className="text-slate-400 hover:text-white p-0.5"
                          >
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* List of makes inside (compact pills with amber outline exactly like mockup) */}
                        {!isCollapsed && (
                          <div className="p-4 flex flex-wrap gap-2 overflow-y-auto max-h-[180px] scrollbar-thin">
                            {groupMakes.map((make) => (
                              <button
                                key={make}
                                type="button"
                                onClick={() => handleSelectMake(make)}
                                className="border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/15 text-amber-200/90 hover:text-amber-400 py-1.5 px-3 rounded-lg text-xs font-mono font-bold uppercase transition duration-150 cursor-pointer text-center select-none shadow"
                              >
                                {make}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Other / Miscellaneous group */}
                  {filteredOtherMakes.length > 0 && (
                    <div
                      id="section-other"
                      className="bg-[#111116] border border-amber-500/10 hover:border-amber-500/20 rounded-xl overflow-hidden transition duration-150 flex flex-col h-full"
                    >
                      <div
                        onClick={() => toggleSection('other')}
                        className="px-4 py-3 bg-[#16161c] hover:bg-slate-800/25 border-b border-amber-500/10 flex items-center justify-between cursor-pointer select-none shrink-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm leading-none">🌍</span>
                          <h3 className="text-xs font-mono font-black tracking-widest text-slate-200">
                            OTHER
                          </h3>
                        </div>
                        <button
                          type="button"
                          className="text-slate-400 hover:text-white p-0.5"
                        >
                          {collapsedSections['other'] ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {!collapsedSections['other'] && (
                        <div className="p-4 flex flex-wrap gap-2 overflow-y-auto max-h-[180px] scrollbar-thin">
                          {filteredOtherMakes.map((make) => (
                            <button
                              key={make}
                              type="button"
                              onClick={() => handleSelectMake(make)}
                              className="border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/15 text-amber-200/90 hover:text-amber-400 py-1.5 px-3 rounded-lg text-xs font-mono font-bold uppercase transition duration-150 cursor-pointer text-center select-none shadow"
                            >
                              {make}
                            </button>
                          ))}
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
                <h3 className="text-xs font-mono font-extrabold uppercase tracking-widest text-slate-400 border-l-2 border-amber-500 pl-3">
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
                        className="bg-gradient-to-b from-surface-theme to-bg-theme border border-border-theme hover:border-amber-500 text-slate-200 hover:text-amber-400 font-mono font-bold text-xs py-4 px-2 rounded-lg text-center transition-all duration-150 cursor-pointer block"
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 3: MODELS LIST */}
            {selectedMake && selectedYear && (
              <div className="space-y-4">
                <h3 className="text-xs font-mono font-extrabold uppercase tracking-widest text-slate-400 border-l-2 border-amber-500 pl-3">
                  Browse Service Manuals for {selectedYear} {selectedMake}
                </h3>
                
                {vehicles.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-border-theme rounded-xl text-slate-500 text-xs">
                    No model variants indexed for this combination yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="vehicles-catalog-list">
                    {vehicles.map((v) => (
                      <div
                        key={v.id}
                        className="bg-gradient-to-b from-[#111116] to-[#0a0a0f] border border-border-theme hover:border-slate-700 hover:border-l-amber-500 border-l-[3px] border-l-border-theme rounded-xl p-5 flex items-center justify-between gap-4 transition-all duration-200 group"
                      >
                        <div className="space-y-1.5 text-left min-w-0">
                          <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded select-none">
                            {v.year}
                          </span>
                          <h4 className="text-sm font-bold text-slate-100 truncate group-hover:text-amber-400 transition-colors leading-tight">
                            {v.make} {v.model}
                          </h4>
                          <p className="text-xs text-slate-400 font-mono truncate">{v.engine}</p>
                        </div>

                        <div className="flex flex-col items-end gap-2.5 shrink-0">
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
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-1.5 px-4 rounded-lg text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1.5 shadow"
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
            )}

          </div>

        </div>
      )}

    </div>
  );
}
