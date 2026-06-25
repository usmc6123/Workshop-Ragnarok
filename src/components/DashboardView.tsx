/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GarageItem, Vehicle } from '../types';
import { api } from '../lib/api';
import { Search, Car, Trash2, RefreshCw, AlertTriangle, BookOpen } from 'lucide-react';
import { MOCK_GARAGE } from '../lib/mockData';
import { LOGO_URL } from '../constants/branding';

interface DashboardViewProps {
  onSelectVehicle: (vehicle: Vehicle) => void;
  onNavigateToBrowse: (initialSearchTerm?: string) => void;
  refreshTrigger: number;
}

export default function DashboardView({ onSelectVehicle, onNavigateToBrowse, refreshTrigger }: DashboardViewProps) {
  const [garage, setGarage] = useState<GarageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [makes, setMakes] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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

  // Fetch makes list
  const loadMakes = async () => {
    try {
      const list = await api.getMakes();
      setMakes(list.sort());
    } catch (err) {
      console.error('Failed to load makes list', err);
    }
  };

  useEffect(() => {
    loadGarage();
    loadMakes();
  }, [refreshTrigger]);

  // Load years list when make selection changes
  useEffect(() => {
    const loadYears = async () => {
      if (!selectedMake) {
        setYears([]);
        setSelectedYear('');
        return;
      }
      try {
        const list = await api.getYears(selectedMake);
        setYears(list.sort((a, b) => b.localeCompare(a))); // Newest years first
      } catch (err) {
        console.error('Failed to load years list', err);
      }
    };
    loadYears();
  }, [selectedMake]);

  // Execute query to fetch vehicles (debounced)
  const executeSearch = async (make: string, year: string, query: string) => {
    setSearchLoading(true);
    setSearchError(null);
    try {
      const data = await api.getVehicles(make || undefined, year || undefined, query || undefined, 60);
      setVehicles(data);
    } catch (err: any) {
      setSearchError(err.message || 'Failed to search vehicle database.');
      setVehicles([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounce search as the user types
  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch(selectedMake, selectedYear, searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedMake, selectedYear]);

  const handleRemove = async (e: React.MouseEvent, garageId: number) => {
    e.stopPropagation(); // prevent clicking card
    if (!window.confirm('Are you sure you want to remove this vehicle from your garage?')) return;
    
    try {
      await api.removeFromGarage(garageId);
      loadGarage();
    } catch (err: any) {
      alert(err.message || 'Failed to remove vehicle.');
    }
  };

  // Safe fallback to show demo cars if none bookmarked or offline
  const displayGarage = (error || garage.length === 0) ? MOCK_GARAGE : garage;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6" id="dashboard-view-root">
      
      {/* 1. Horizontal Scrollable Saved Garage Shelf */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              My Saved Garage
            </h2>
            <span className="bg-[#121218] text-amber-500 border border-slate-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ml-1">
              {displayGarage.length} UNITS
            </span>
          </div>
          {error && (
            <span className="text-[10px] text-amber-500/80 font-mono font-semibold uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded">
              Demo Active (Offline)
            </span>
          )}
        </div>

        <div className="flex gap-4 overflow-x-auto pb-3.5 pt-1 scrollbar-thin scrollbar-thumb-slate-850" id="garage-shelf">
          {displayGarage.map((item) => (
            <div
              key={item.garageId}
              onClick={() => onSelectVehicle(item)}
              className="bg-[#0c0c0f] hover:bg-[#121217] border border-slate-850 hover:border-amber-500/50 rounded p-4 flex flex-col justify-between shrink-0 w-64 transition-all duration-150 cursor-pointer group shadow-sm hover:shadow"
              id={`garage-item-${item.garageId}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[9px] text-slate-500 font-mono tracking-wider uppercase">
                    {item.nickname ? item.nickname : `UNIT #${item.id}`}
                  </span>
                  <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                    item.source === 'lemon'
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                  }`}>
                    {item.source}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-500 transition-colors truncate">
                  {item.year} {item.make} {item.model}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-1 truncate">{item.engine}</p>
              </div>

              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-900">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/90 group-hover:text-amber-400 transition-colors flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  Open Manual
                </span>
                <button
                  onClick={(e) => handleRemove(e, item.garageId)}
                  className="text-slate-500 hover:text-red-400 p-1.5 rounded hover:bg-slate-900 transition cursor-pointer"
                  title="Remove from garage"
                  aria-label="Remove vehicle"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Central Search-First Hero Block */}
      <div className="bg-[#09090d] border border-slate-850 rounded p-6 md:p-10 text-center space-y-6 shadow-md select-none">
        <div className="max-w-2xl mx-auto space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Car className="w-5 h-5 text-amber-500" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-slate-500">
              SECURE INDEX DATABASE
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight uppercase">
            FIND YOUR SERVICE MANUAL
          </h1>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Access complete mechanical specifications, service procedures, electrical diagrams, and repair checklists.
          </p>
        </div>

        {/* Big Smart Search with inline filter dropdowns */}
        <div className="max-w-4xl mx-auto bg-[#030305] border border-slate-800 rounded p-2.5">
          <div className="flex flex-col md:flex-row items-stretch gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search manufacturer, model name, or diagnostic code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded bg-[#09090d] border border-slate-850 focus:border-amber-500 pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition font-sans"
                id="dashboard-search-input"
              />
              <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-500" />
            </div>

            {/* Make Filter Dropdown */}
            <select
              value={selectedMake}
              onChange={(e) => setSelectedMake(e.target.value)}
              className="bg-[#09090d] border border-slate-850 hover:border-slate-700 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer transition font-sans md:w-48"
            >
              <option value="">All Manufacturers</option>
              {makes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Year Filter Dropdown */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              disabled={!selectedMake}
              className="bg-[#09090d] border border-slate-850 hover:border-slate-700 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition font-sans md:w-36"
            >
              <option value="">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Search Results Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            {searchLoading ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            )}
            <span>Filtered Catalog ({vehicles.length} cataloged nodes)</span>
          </h2>
        </div>

        {searchError ? (
          <div className="rounded border border-red-900/30 bg-red-950/10 p-6 text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-sm text-red-200 font-semibold">Diagnostic Connection Interrupted</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">{searchError}</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No matching manuals found. Refine parameters or search keyword above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" id="vehicle-results-grid">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="bg-[#09090d] border border-slate-850 hover:border-slate-700 rounded p-4 flex flex-col justify-between transition-all duration-150 shadow-sm"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-amber-500 font-bold bg-amber-500/5 px-2 py-0.5 rounded">
                      {v.year}
                    </span>
                    <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                      v.source === 'lemon'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                    }`}>
                      {v.source} MANUAL
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-100 tracking-tight leading-snug">
                    {v.make} {v.model}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">{v.engine}</p>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectVehicle(v)}
                  className="w-full mt-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-1.5 px-3 rounded text-xs uppercase tracking-wider transition-all duration-150 active:scale-98 cursor-pointer flex items-center justify-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Open Manual
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
