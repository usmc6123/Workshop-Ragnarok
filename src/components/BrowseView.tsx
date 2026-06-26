/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Vehicle } from '../types';
import { api } from '../lib/api';
import { Search, Car, RefreshCw, AlertTriangle, BookOpen, ChevronRight, ArrowLeft } from 'lucide-react';

interface BrowseViewProps {
  onSelectVehicle?: (vehicle: Vehicle) => void;
  initialSearch?: string;
  selectedVehicle?: Vehicle | null;
  onClearSelectedVehicle?: () => void;
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

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and load all makes on mount
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

  const handleSelectVehicle = (vehicle: Vehicle) => {
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

  // Filter makes client-side based on the search term (to support filtering list as they type)
  const filteredMakes = makes.filter((m) => 
    m.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 text-left" id="browse-view-root">
      
      {/* Header Info Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-theme pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Car className="w-5 h-5 text-primary-theme" />
            Service Manual Catalog
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Explore indexed vehicle service manuals dynamically step-by-step or search directly.
          </p>
        </div>

        {/* Counter Info Badge */}
        <div className="flex items-center gap-2 bg-surface-theme border border-border-theme rounded-full px-4 py-1.5 self-start font-mono text-xs">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-slate-350">
            {searchTerm.trim() ? `${searchResults.length} matches` : `${makes.length} manufacturers active`}
          </span>
        </div>
      </div>

      {/* Global Search Bar (Always Visible at Top) */}
      <div className="bg-surface-theme border border-border-theme rounded-xl p-5 shadow-lg select-none">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">
            Manual Search Bar
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search make, year, model or keywords... e.g. Toyota Civic, 2011 Ford"
              className="w-full rounded-full bg-bg-theme border border-border-theme focus:border-primary-theme pl-11 pr-10 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition font-sans font-medium"
              id="browse-keyword-input"
            />
            <Search className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-500" />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-3 text-slate-500 hover:text-slate-300 text-xs font-mono uppercase tracking-widest font-extrabold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loader / Errors view */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-primary-theme animate-spin" />
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

      {/* MAIN VIEWPORT STATE MACHINE */}
      {!loading && !error && (
        <div className="space-y-4">
          
          {/* SEARCH TERM IS ACTIVE (Smart Search View) */}
          {searchTerm.trim() ? (
            <div className="space-y-6">
              
              {/* Client-Side Makes Filter (Matching Manufacturers section) */}
              {filteredMakes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350">
                    Matching Manufacturers ({filteredMakes.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {filteredMakes.slice(0, 12).map((make) => (
                      <button
                        key={make}
                        type="button"
                        onClick={() => {
                          setSelectedMake(make);
                          setSelectedYear('');
                          setSearchTerm(''); // Clear search on select make to view its years list
                        }}
                        className="bg-surface-theme border border-border-theme hover:border-primary-theme text-slate-200 hover:text-primary-theme font-black uppercase text-xs tracking-wider py-4 px-3 rounded-lg text-center transition-all duration-200 shadow hover:shadow-primary-theme/5 cursor-pointer block truncate"
                      >
                        {make}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Flat Search Results List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350">
                  Flat Search Results ({searchResults.length})
                </h3>

                {searchResults.length === 0 ? (
                  <div className="py-16 text-center border border-dashed border-border-theme rounded-xl bg-surface-theme/10 max-w-xl mx-auto">
                    <p className="text-slate-400 text-sm">No vehicles match your search query.</p>
                    <p className="text-slate-500 text-xs mt-1">Try broadening your keyword parameters.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((v) => (
                      <div
                        key={v.id}
                        className="bg-gradient-to-b from-surface-theme to-bg-theme border border-border-theme hover:border-slate-700 hover:border-l-primary-theme border-l-[3px] border-l-border-theme rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 group"
                        id={`vehicle-catalog-row-${v.id}`}
                      >
                        {/* Info Column */}
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-mono text-primary-theme font-bold bg-primary-theme/10 border border-primary-theme/20 px-2.5 py-1 rounded select-none">
                            {v.year}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-slate-200 flex flex-wrap items-center gap-x-2 gap-y-0.5 group-hover:text-primary-theme transition-colors">
                              <span>{v.make} {v.model}</span>
                              <span className="text-slate-400 font-normal font-mono text-xs">
                                {v.engine}
                              </span>
                            </h4>
                          </div>
                        </div>

                        {/* Actions Block */}
                        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                          <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border select-none ${
                            v.source === 'lemon'
                              ? 'bg-primary-theme/10 text-primary-theme border-primary-theme/20'
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          }`}>
                            {v.source} MANUAL
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSelectVehicle(v)}
                            className="bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-bold py-1.5 px-4 rounded-lg text-xs uppercase tracking-wider transition-all duration-150 active:scale-98 cursor-pointer flex items-center gap-1.5 shadow"
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
          ) : (
            
            // DRILL-DOWN BROWSER (Lemon style state-machine)
            <div className="space-y-6">
              
              {/* Navigation Breadcrumb / Back Button Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-theme pb-3">
                <nav aria-label="Catalog Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 font-sans font-medium">
                  <button
                    onClick={() => { setSelectedMake(''); setSelectedYear(''); }}
                    className={`hover:text-primary-theme transition-colors uppercase font-mono tracking-wider font-extrabold text-[10px] ${!selectedMake ? 'text-primary-theme' : 'text-slate-400'}`}
                  >
                    All Makes
                  </button>

                  {selectedMake && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <button
                        onClick={() => { setSelectedMake(selectedMake); setSelectedYear(''); }}
                        className={`hover:text-primary-theme transition-colors uppercase font-mono tracking-wider font-extrabold text-[10px] ${!selectedYear ? 'text-primary-theme' : 'text-slate-400'}`}
                      >
                        {selectedMake}
                      </button>
                    </>
                  )}

                  {selectedYear && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="text-primary-theme font-semibold uppercase font-mono tracking-wider font-extrabold text-[10px]">
                        {selectedYear}
                      </span>
                    </>
                  )}
                </nav>

                {/* Back Button */}
                {selectedMake && (
                  <button
                    type="button"
                    onClick={handleGoBack}
                    className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 hover:text-white transition bg-surface-theme border border-border-theme hover:border-slate-700 rounded-lg px-3.5 py-1.5 shadow select-none cursor-pointer self-start sm:self-auto"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-primary-theme" />
                    <span>← Back</span>
                  </button>
                )}
              </div>

              {/* VIEW 1: MAKES LIST */}
              {!selectedMake && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350">
                    Manufacturers Catalog Directory
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5" id="makes-catalog-grid">
                    {makes.map((make) => (
                      <button
                        key={make}
                        type="button"
                        onClick={() => { setSelectedMake(make); setSelectedYear(''); }}
                        className="bg-gradient-to-b from-surface-theme to-bg-theme border border-border-theme hover:border-primary-theme text-slate-100 hover:text-primary-theme font-black uppercase text-xs tracking-wider py-5 px-4 rounded-xl text-center transition-all duration-200 shadow hover:shadow-primary-theme/5 cursor-pointer block truncate"
                      >
                        {make}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* VIEW 2: YEARS LIST */}
              {selectedMake && !selectedYear && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350">
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
                          className="bg-gradient-to-b from-surface-theme to-bg-theme border border-border-theme hover:border-primary-theme text-slate-200 hover:text-primary-theme font-mono font-bold text-xs py-4 px-2 rounded-lg text-center transition-all duration-150 cursor-pointer block"
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
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350">
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
                          className="bg-gradient-to-b from-surface-theme to-bg-theme border border-border-theme hover:border-slate-700 hover:border-l-primary-theme border-l-[3px] border-l-border-theme rounded-xl p-5 flex items-center justify-between gap-4 transition-all duration-200 group"
                        >
                          <div className="space-y-1.5 text-left min-w-0">
                            <span className="text-[10px] font-mono text-primary-theme bg-primary-theme/10 border border-primary-theme/20 px-2 py-0.5 rounded select-none">
                              {v.year}
                            </span>
                            <h4 className="text-sm font-bold text-slate-101 truncate group-hover:text-primary-theme transition-colors leading-tight">
                              {v.make} {v.model}
                            </h4>
                            <p className="text-xs text-slate-400 font-mono truncate">{v.engine}</p>
                          </div>

                          <div className="flex flex-col items-end gap-2.5 shrink-0">
                            <span className={`text-[8px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border select-none ${
                              v.source === 'lemon'
                                ? 'bg-primary-theme/10 text-primary-theme border-primary-theme/20'
                                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            }`}>
                              {v.source} manual
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSelectVehicle(v)}
                              className="bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-bold py-1.5 px-4 rounded-lg text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1.5 shadow"
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
          )}

        </div>
      )}

    </div>
  );
}
