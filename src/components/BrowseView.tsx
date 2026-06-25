/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Vehicle } from '../types';
import { api } from '../lib/api';
import { Search, Car, RefreshCw, AlertTriangle, BookOpen } from 'lucide-react';

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
  
  // Search and query limits
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [makes, setMakes] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and load manufacturers filter
  useEffect(() => {
    const initializeFilters = async () => {
      try {
        const fetchedMakes = await api.getMakes();
        setMakes(fetchedMakes.sort());
      } catch (err) {
        console.error('Failed to load manufacturers list', err);
      }
    };
    initializeFilters();
  }, []);

  // Update year select option when manufacturer changes
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
        console.error('Failed to load years list', err);
      }
    };
    updateYears();
  }, [selectedMake]);

  // Execute query to fetch vehicles
  const executeSearch = async (make: string, year: string, query: string, currentLimit: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getVehicles(make || undefined, year || undefined, query || undefined, currentLimit);
      setVehicles(data);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to the manual server.');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search trigger as the user types
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(selectedMake, selectedYear, searchTerm, limit);
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchTerm, selectedMake, selectedYear, limit]);

  const handleLoadMore = () => {
    setLimit((prev) => prev + 50);
  };

  const handleSelectVehicle = (vehicle: Vehicle) => {
    if (onSelectVehicle) {
      onSelectVehicle(vehicle);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6" id="browse-view-root">
      
      {/* Header Info Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e2028] pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Car className="w-5 h-5 text-amber-500" />
            Service Manual Catalog
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Search our comprehensive, flat list of indexed vehicles to directly open their manuals.
          </p>
        </div>

        {/* Counter Info Badge */}
        <div className="flex items-center gap-2 bg-[#13141a] border border-[#1e2028] rounded-full px-4 py-1.5 self-start font-mono text-xs">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-slate-300">
            {vehicles.length} entries loaded
          </span>
        </div>
      </div>

      {/* Modern High-Contrast Filter Panel */}
      <div className="bg-[#13141a] border border-[#1e2028] rounded-xl p-5 shadow-lg select-none">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Keyword Search - Rounded-full Pill Shape */}
          <div className="md:col-span-6 space-y-1.5">
            <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">
              Manual Keyword Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search model, subclass... e.g. Civic, Explorer, F-150"
                className="w-full rounded-full bg-[#0a0a0f] border border-[#1e2028] focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 pl-11 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition font-sans"
                id="browse-keyword-input"
              />
              <Search className="absolute left-4 top-3 w-4.5 h-4.5 text-slate-500" />
            </div>
          </div>

          {/* Manufacturer Dropdown */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">
              Filter by Manufacturer
            </label>
            <select
              value={selectedMake}
              onChange={(e) => {
                setSelectedMake(e.target.value);
                setLimit(50); // reset page limit on filter change
              }}
              className="w-full bg-[#0a0a0f] border border-[#1e2028] hover:border-slate-700 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer transition"
            >
              <option value="">All Manufacturers</option>
              {makes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Model Year Dropdown */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">
              Filter by Model Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setLimit(50); // reset page limit on filter change
              }}
              disabled={!selectedMake || years.length === 0}
              className="w-full bg-[#0a0a0f] border border-[#1e2028] hover:border-slate-700 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
            >
              <option value="">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* List results board */}
      <div className="space-y-4">
        {loading && vehicles.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-slate-400 text-sm font-sans">Accessing catalog registry...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-900/30 bg-red-950/10 p-10 text-center space-y-3 max-w-2xl mx-auto">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
            <div>
              <p className="text-red-200 font-bold uppercase text-sm">Connection Interrupted</p>
              <p className="text-xs text-slate-400 mt-1">{error}</p>
            </div>
            <button
              onClick={() => executeSearch(selectedMake, selectedYear, searchTerm, limit)}
              className="px-4 py-2 rounded-lg bg-[#13141a] border border-[#1e2028] text-slate-200 hover:text-white text-xs font-bold uppercase tracking-wider transition"
            >
              Retry Connection
            </button>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-[#1e2028] rounded-xl bg-[#13141a]/10 max-w-xl mx-auto">
            <p className="text-slate-400 text-sm">No vehicles match your catalog filters.</p>
            <p className="text-slate-500 text-xs mt-1">Try broadening your keyword parameters.</p>
          </div>
        ) : (
          <div className="space-y-3" id="browse-results">
            {/* Flat Single Column List Grid */}
            <div className="space-y-2">
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  className="bg-gradient-to-b from-[#13141a] to-[#0f1015] border border-[#1e2028] hover:border-slate-700 hover:border-l-amber-500 border-l-[3px] border-l-[#1e2028] rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 group"
                  id={`vehicle-catalog-row-${v.id}`}
                >
                  {/* Left Metadata Row Column */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-mono text-amber-500 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded select-none">
                      {v.year}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 flex flex-wrap items-center gap-x-2 gap-y-0.5 group-hover:text-amber-500 transition-colors">
                        <span>{v.make} {v.model}</span>
                        <span className="text-slate-400 font-normal font-mono text-xs">
                          {v.engine}
                        </span>
                      </h4>
                    </div>
                  </div>

                  {/* Right Actions Block */}
                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border select-none ${
                      v.source === 'lemon'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    }`}>
                      {v.source} MANUAL
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectVehicle(v)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-1.5 px-4 rounded-lg text-xs uppercase tracking-wider transition-all duration-150 active:scale-98 cursor-pointer flex items-center gap-1.5 shadow"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Open Manual
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {vehicles.length >= limit && (
              <div className="pt-4 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  className="bg-[#13141a] hover:bg-[#1a1c24] border border-[#1e2028] text-slate-350 hover:text-white font-bold py-2.5 px-6 rounded-lg text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />}
                  <span>Load More Results</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
