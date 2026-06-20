/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Vehicle } from '../types';
import { api } from '../lib/api';
import { Search, Filter, Car, RefreshCw, Layers, ShieldAlert, Sparkles, BookOpen, Star } from 'lucide-react';

interface BrowseViewProps {
  onSelectVehicle: (vehicle: Vehicle) => void;
  initialSearch?: string;
}

export default function BrowseView({ onSelectVehicle, initialSearch }: BrowseViewProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [makes, setMakes] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and load filters
  useEffect(() => {
    const initializeFilters = async () => {
      try {
        const fetchedMakes = await api.getMakes();
        setMakes(fetchedMakes.sort());
      } catch (err) {
        console.error('Failed to load Makes filter list', err);
      }
    };
    initializeFilters();
  }, []);

  // Whenever selected make changes, retrieve its allowed years
  useEffect(() => {
    const updateYears = async () => {
      if (!selectedMake) {
        setYears([]);
        setSelectedYear('');
        return;
      }
      try {
        const fetchedYears = await api.getYears(selectedMake);
        setYears(fetchedYears.sort((a, b) => b.localeCompare(a)));
      } catch (err) {
        console.error('Failed to load Years filter list', err);
      }
    };
    updateYears();
  }, [selectedMake]);

  // Execute query to fetch vehicles
  const executeSearch = async (make: string, year: string, query: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getVehicles(make || undefined, year || undefined, query || undefined, 80);
      setVehicles(data);
    } catch (err: any) {
      setError(err.message || 'The server failed to respond or is offline.');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search-as-you-type tracker
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(selectedMake, selectedYear, searchTerm);
    }, 250); // Fast snappy debounce for local networks

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchTerm, selectedMake, selectedYear]);

  // Group search results by vehicle features to unite duplicate entries having different sources (lemon/charm)
  interface GroupedVehicle {
    key: string;
    make: string;
    year: string;
    model: string;
    engine: string;
    lemonVehicle?: Vehicle;
    charmVehicle?: Vehicle;
  }

  // First, group duplicate entries of (make, year, model, engine)
  const groupedCombos: GroupedVehicle[] = [];
  vehicles.forEach((v) => {
    const comboKey = `${v.make}|${v.year}|${v.model}|${v.engine}`.toLowerCase();
    let existing = groupedCombos.find((item) => item.key === comboKey);
    if (!existing) {
      existing = {
        key: comboKey,
        make: v.make,
        year: v.year,
        model: v.model,
        engine: v.engine,
      };
      groupedCombos.push(existing);
    }

    if (v.source === 'lemon') {
      existing.lemonVehicle = v;
    } else if (v.source === 'charm') {
      existing.charmVehicle = v;
    }
  });

  // Second, group these consolidated combos by MAKE for beautiful headers
  const categorizedByMake: { [make: string]: GroupedVehicle[] } = {};
  groupedCombos.forEach((combo) => {
    const makeHeader = combo.make;
    if (!categorizedByMake[makeHeader]) {
      categorizedByMake[makeHeader] = [];
    }
    categorizedByMake[makeHeader].push(combo);
  });

  const makesSortedAlphabetically = Object.keys(categorizedByMake).sort();

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6" id="browse-view-root">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Car className="w-6 h-6 text-amber-500" />
            Manual Database Browser
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Search, filter, and choose from hundreds of digitized vehicle manuals.
          </p>
        </div>

        {/* Quick status line */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 self-start">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[10px] md:text-xs font-mono font-medium text-slate-300">
            {vehicles.length} direct nodes fetched
          </span>
        </div>
      </div>

      {/* Filter and Search Instrumentation Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-xl shadow-lg">
        {/* Text Input Search (5/12 width) */}
        <div className="md:col-span-5 relative">
          <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400 mb-1.5">
            Manual Keyword Search
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search model, subclass... e.g. Civic, F-150"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none transition font-sans"
              id="browse-keyword-input"
            />
            <Search className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-slate-500" />
          </div>
        </div>

        {/* Make Dropdown filter (4/12 width) */}
        <div className="md:col-span-4 select-none">
          <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400 mb-1.5">
            Filter by Manufacturer
          </label>
          <select
            value={selectedMake}
            onChange={(e) => setSelectedMake(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="">-- All Manufacturers --</option>
            {makes.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Year Dropdown filter (3/12 width) */}
        <div className="md:col-span-3 select-none">
          <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Filter by Year</span>
            {!selectedMake && <span className="text-[9px] text-slate-500 font-sans lowercase">Select Make first</span>}
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            disabled={!selectedMake || years.length === 0}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <option value="">-- All Years --</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Results Board */}
      <div className="space-y-6">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-10 h-10 text-amber-500 animate-spin" />
            <p className="text-slate-400 text-sm font-medium font-sans">Querying local directory...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-950/40 bg-red-950/15 p-12 text-center max-w-2xl mx-auto space-y-4">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-red-200 font-bold uppercase tracking-wider text-sm">Query Connection Interrupted</h3>
              <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                {error}
              </p>
            </div>
            <button
              onClick={() => executeSearch(selectedMake, selectedYear, searchTerm)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider border border-slate-700 transition"
            >
              Re-evaluate Diagnosis
            </button>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/15 max-w-xl mx-auto">
            <p className="text-slate-400 text-sm font-medium">No model manuals match your query.</p>
            <p className="text-slate-500 text-xs mt-1">Try broadening your keyword search or adjusting the filters.</p>
          </div>
        ) : (
          <div className="space-y-8" id="browse-results">
            {makesSortedAlphabetically.map((makeGroup) => (
              <div key={makeGroup} className="space-y-3" id={`make-group-${makeGroup.toLowerCase()}`}>
                {/* Group Divider */}
                <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest border-b border-slate-800 pb-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-amber-500 rounded-sm" />
                  {makeGroup} Specification Entries
                </h3>

                {/* Combos belonging to this Make */}
                <div className="grid grid-cols-1 gap-3">
                  {categorizedByMake[makeGroup].map((combo) => {
                    const hasBoth = !!(combo.lemonVehicle && combo.charmVehicle);
                    
                    return (
                      <div
                        key={combo.key}
                        className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 hover:bg-slate-900/60 transition"
                      >
                        {/* Title details */}
                        <div className="space-y-1 bg-transparent">
                          <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                            <span className="text-amber-500 font-mono spec-number">{combo.year}</span>
                            <span>{combo.make} {combo.model}</span>
                          </h4>
                          <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                            Engine Spec: <span className="text-slate-200">{combo.engine}</span>
                          </p>
                          
                          {/* Alert if complete state differs or features both */}
                          {hasBoth && (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 font-bold uppercase mt-1">
                              <Layers className="w-3.5 h-3.5 shrink-0" />
                              Dual Manuals Pack Installed (Compare options below)
                            </span>
                          )}
                        </div>

                        {/* Action buttons list */}
                        <div className="flex flex-wrap items-center gap-2.5 shrink-0 bg-transparent">
                          {combo.lemonVehicle && (
                            <button
                              type="button"
                              onClick={() => onSelectVehicle(combo.lemonVehicle!)}
                              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 hover:border-amber-500/80 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 cursor-pointer"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              Browse Lemon Manual
                            </button>
                          )}

                          {combo.charmVehicle && (
                            <button
                              type="button"
                              onClick={() => onSelectVehicle(combo.charmVehicle!)}
                              className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 hover:border-indigo-500/80 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 cursor-pointer"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              Browse Charm Manual
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
