/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { DatabaseStats } from '../types';
import { api, getApiBase, setApiBase } from '../lib/api';
import { 
  Settings, Server, Sun, Moon, Database, Sparkles, Wrench, Wifi,
  RefreshCw, AlertTriangle, CheckSquare, Info, ShieldCheck, Cpu
} from 'lucide-react';

interface SettingsViewProps {
  activeTheme: string;
  setActiveTheme: (theme: string) => void;
  onSaveAddress: () => void;
}

export default function SettingsView({ activeTheme, setActiveTheme, onSaveAddress }: SettingsViewProps) {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [addressInput, setAddressInput] = useState(getApiBase());
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testErrorMessage, setTestErrorMessage] = useState('');

  const availableThemes = [
    { id: 'theme-ragnarok', name: 'Ragnarök Dark', primaryColor: '#f59e0b', bgColor: '#0a0a0f', desc: 'Default industrial orange / amber' },
    { id: 'theme-midnight', name: 'Midnight Steel', primaryColor: '#58a6ff', bgColor: '#0d1117', desc: 'Oceanic blue / dark slate' },
    { id: 'theme-carbon', name: 'Carbon Black', primaryColor: '#ef4444', bgColor: '#000000', desc: 'Pure stealth black with red highlights' },
    { id: 'theme-arctic', name: 'Arctic White', primaryColor: '#3b82f6', bgColor: '#f8fafc', desc: 'High-contrast light garage theme' },
    { id: 'theme-forest', name: 'Forest Green', primaryColor: '#22c55e', bgColor: '#0a0f0a', desc: 'Overland green & charcoal' },
    { id: 'theme-blood', name: 'Blood Orange', primaryColor: '#f97316', bgColor: '#0f0a00', desc: 'Crimson / heavy duty hot gold' },
    { id: 'theme-purple', name: 'Royal Purple', primaryColor: '#a855f7', bgColor: '#0a0014', desc: 'Specialized diagnostic neon purple' },
    { id: 'theme-gunmetal', name: 'Gunmetal', primaryColor: '#06b6d4', bgColor: '#0a0c0f', desc: 'Tactical cyan / heavy alloy' },
  ];

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load database stats:', err);
    } finally {
      setStatsLoading(false);
    }
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-6" id="settings-view-root">
      
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

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Side: General and connection settings */}
        <div className="md:col-span-8 space-y-6">
          
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
              <div className="relative">
                <select
                  value={activeTheme}
                  onChange={(e) => setActiveTheme(e.target.value)}
                  className="w-full bg-bg-theme border border-border-theme text-slate-200 text-xs px-3.5 py-3 rounded-lg focus:border-primary-theme focus:outline-none cursor-pointer font-bold uppercase tracking-wider"
                  id="theme-select-dropdown"
                >
                  {availableThemes.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#13141a] text-slate-200 text-xs py-2">
                      {t.name} ({t.desc})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Theme Details Banner */}
              {(() => {
                const currentTheme = availableThemes.find(t => t.id === activeTheme) || availableThemes[0];
                return (
                  <div className="flex items-center gap-3.5 bg-bg-theme/40 border border-border-theme/60 rounded-lg p-3 select-none">
                    <div className="flex gap-1 shrink-0">
                      <span 
                        className="w-5 h-5 rounded-full border border-black/40 block shadow-sm" 
                        style={{ backgroundColor: currentTheme.primaryColor }} 
                      />
                      <span 
                        className="w-5 h-5 rounded-full border border-black/40 block -ml-2.5 shadow-lg" 
                        style={{ backgroundColor: currentTheme.bgColor }} 
                      />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-200 block uppercase tracking-wider">
                        {currentTheme.name}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {currentTheme.desc}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

        </div>

        {/* Right Side: Database Stats Sidebar */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-5 space-y-4 shadow-xl text-left">
            <div className="flex items-center justify-between border-b border-border-theme pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-primary-theme" />
                Database Diagnostics
              </h3>
              <button
                onClick={fetchStats}
                disabled={statsLoading}
                className="p-1 text-slate-500 hover:text-white rounded transition"
                title="Refresh stats"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin text-primary-theme' : ''}`} />
              </button>
            </div>

            {statsLoading && !stats ? (
              <div className="py-8 text-center text-slate-500 text-xs">Querying database sectors...</div>
            ) : stats ? (
              <div className="space-y-3.5">
                <div className="bg-bg-theme border border-border-theme p-3 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Car Service Manuals</span>
                  <span className="text-base text-slate-200 font-bold block mt-0.5 font-mono">
                    {stats.totalManuals?.toLocaleString()}
                  </span>
                </div>
                <div className="bg-bg-theme border border-border-theme p-3 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Stable Vehicles</span>
                  <span className="text-base text-slate-200 font-bold block mt-0.5 font-mono">
                    {stats.totalGarageVehicles?.toLocaleString()}
                  </span>
                </div>
                <div className="bg-bg-theme border border-border-theme p-3 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Active Job Tickets</span>
                  <span className="text-base text-slate-200 font-bold block mt-0.5 font-mono">
                    {stats.totalJobs?.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 text-xs font-sans">
                Could not read server metrics. Verify LAN Host address.
              </div>
            )}

            <div className="text-slate-400 text-xs leading-relaxed bg-bg-theme/50 p-4 border border-border-theme rounded-lg flex items-start gap-2 pt-3">
              <Cpu className="w-4 h-4 text-primary-theme shrink-0 mt-0.5" />
              <div>
                <span className="text-[9px] font-mono uppercase text-slate-500 block font-black">Homelab Environment</span>
                <p className="text-[11px] mt-0.5">
                  Workshop operates as a fully local self-hosted instance using an integrated better-sqlite3 engine and static data routing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
