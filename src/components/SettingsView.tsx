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
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  onSaveAddress: () => void;
}

export default function SettingsView({ theme, setTheme, onSaveAddress }: SettingsViewProps) {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [addressInput, setAddressInput] = useState(getApiBase());
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testErrorMessage, setTestErrorMessage] = useState('');

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
      <div className="border-b border-[#1e2028] pb-4">
        <h1 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-500" />
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
          <div className="bg-[#13141a] border border-[#1e2028] rounded-xl p-5 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-slate-200 uppercase flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-500" />
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
                  className="flex-1 bg-[#0a0a0f] border border-[#1e2028] rounded-lg px-3.5 py-2 text-sm text-slate-200 font-mono focus:border-amber-500 focus:outline-none"
                  id="api-address-input"
                />
                <button
                  onClick={handleTestAndSaveConnection}
                  disabled={testStatus === 'testing'}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg px-5 py-2 text-xs uppercase tracking-wider transition-all cursor-pointer"
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
          <div className="bg-[#13141a] border border-[#1e2028] rounded-xl p-5 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-slate-200 uppercase flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              Display Theme Configuration
            </h2>
            <p className="text-xs text-slate-400">
              Toggle the overall visual theme of the Workshop interface. Dark theme is recommended for eye safety in automotive garages.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTheme('dark')}
                className={`py-3 px-4 rounded-lg border text-xs uppercase font-black tracking-widest flex items-center justify-center gap-2 transition ${
                  theme === 'dark'
                    ? 'bg-amber-500 border-amber-500 text-slate-950 font-bold shadow'
                    : 'bg-[#0a0a0f] border-[#1e2028] text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Dark Theme</span>
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`py-3 px-4 rounded-lg border text-xs uppercase font-black tracking-widest flex items-center justify-center gap-2 transition ${
                  theme === 'light'
                    ? 'bg-amber-500 border-amber-500 text-slate-950 font-bold shadow'
                    : 'bg-[#0a0a0f] border-[#1e2028] text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Light Theme</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right Side: Database Stats Sidebar */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-[#13141a] border border-[#1e2028] rounded-xl p-5 space-y-4 shadow-xl text-left">
            <div className="flex items-center justify-between border-b border-[#1e2028] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-500" />
                Database Diagnostics
              </h3>
              <button
                onClick={fetchStats}
                disabled={statsLoading}
                className="p-1 text-slate-500 hover:text-white rounded transition"
                title="Refresh stats"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin text-amber-500' : ''}`} />
              </button>
            </div>

            {statsLoading && !stats ? (
              <div className="py-8 text-center text-slate-500 text-xs">Querying database sectors...</div>
            ) : stats ? (
              <div className="space-y-3.5">
                <div className="bg-[#0a0a0f] border border-[#1e2028] p-3 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Car Service Manuals</span>
                  <span className="text-base text-slate-200 font-bold block mt-0.5 font-mono">
                    {stats.totalManuals?.toLocaleString()}
                  </span>
                </div>
                <div className="bg-[#0a0a0f] border border-[#1e2028] p-3 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Stable Vehicles</span>
                  <span className="text-base text-slate-200 font-bold block mt-0.5 font-mono">
                    {stats.totalGarageVehicles?.toLocaleString()}
                  </span>
                </div>
                <div className="bg-[#0a0a0f] border border-[#1e2028] p-3 rounded-lg">
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

            <div className="text-slate-400 text-xs leading-relaxed bg-[#0a0a0f]/50 p-4 border border-[#1e2028] rounded-lg flex items-start gap-2 pt-3">
              <Cpu className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
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
