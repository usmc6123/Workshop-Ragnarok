/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef } from 'react';
import { DatabaseStats, ShopSettings } from '../types';
import { api, getApiBase, setApiBase } from '../lib/api';
import { 
  Settings, Server, Sun, Database, RefreshCw, AlertTriangle, Info, ShieldCheck, Cpu, ChevronDown, Store
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
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [settings, setSettings] = useState<ShopSettings>({
    shop_name: '',
    shop_address: '',
    shop_phone: '',
    shop_logo_url: '',
    tax_rate: 0,
    default_labor_rate: 0,
    zip_code: ''
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'failed'>('idle');
  const [saveError, setSaveError] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableThemes = [
    { id: 'theme-ragnarok', name: 'Ragnarök Dark', colors: ['#0a0a0f', '#f59e0b', '#1e2028', '#d97706'], desc: 'Default industrial orange / amber' },
    { id: 'theme-midnight', name: 'Midnight Steel', colors: ['#0a0f1e', '#3b82f6', '#1e2535', '#1d4ed8'], desc: 'Oceanic blue / dark slate' },
    { id: 'theme-carbon', name: 'Carbon Black', colors: ['#000000', '#ef4444', '#111111', '#dc2626'], desc: 'Pure stealth black with red highlights' },
    { id: 'theme-arctic', name: 'Arctic White', colors: ['#f8fafc', '#0ea5e9', '#e2e8f0', '#0284c7'], desc: 'High-contrast light garage theme' },
    { id: 'theme-forest', name: 'Forest Green', colors: ['#0a1a0a', '#22c55e', '#1a2e1a', '#16a34a'], desc: 'Overland green & charcoal' },
    { id: 'theme-blood', name: 'Blood Orange', colors: ['#1a0500', '#f97316', '#2d0a00', '#ea580c'], desc: 'Crimson / heavy duty hot gold' },
    { id: 'theme-purple', name: 'Royal Purple', colors: ['#0f0a1e', '#a855f7', '#1e1535', '#9333ea'], desc: 'Specialized diagnostic neon purple' },
    { id: 'theme-gunmetal', name: 'Gunmetal', colors: ['#0a0f14', '#06b6d4', '#141e28', '#0891b2'], desc: 'Tactical cyan / heavy alloy' },
  ];

  useEffect(() => {
    fetchStats();
    loadShopSettings();

    // Close custom dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const loadShopSettings = async () => {
    try {
      const data = await api.getShopSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load shop settings:', err);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Max dimension is 300px (reasonable for a logo)
        const MAX_DIM = 300;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Get base64 string
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          setSettings(prev => ({ ...prev, shop_logo_url: compressedBase64 }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    setSaveError('');
    try {
      await api.updateShopSettings(settings);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('failed');
      setSaveError(err.message || 'Failed to save shop settings.');
    }
  };

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

  const currentTheme = availableThemes.find(t => t.id === activeTheme) || availableThemes[0];

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

          {/* Shop Profile Settings Card */}
          <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-5 space-y-4 shadow-xl text-left" id="shop-profile-card">
            <h2 className="text-sm font-bold text-slate-200 uppercase flex items-center gap-2">
              <Store className="w-4 h-4 text-primary-theme" />
              Shop Profile & Billing Preferences
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Configure your garage branding, location info, tax rate, and default labor rate. These details will dynamically generate invoice headings and tax calculations.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4" id="shop-profile-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Shop Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Shop Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Workshop: Ragnarök"
                    value={settings.shop_name}
                    onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-primary-theme focus:outline-none"
                    id="shop-name-input"
                  />
                </div>

                {/* Shop Phone */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. (555) 0199"
                    value={settings.shop_phone}
                    onChange={(e) => setSettings({ ...settings, shop_phone: e.target.value })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-primary-theme focus:outline-none"
                    id="shop-phone-input"
                  />
                </div>

                {/* Shop Address */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Street Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 123 Resistance Way, Los Angeles, CA"
                    value={settings.shop_address}
                    onChange={(e) => setSettings({ ...settings, shop_address: e.target.value })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-primary-theme focus:outline-none"
                    id="shop-address-input"
                  />
                </div>

                {/* Tax Rate */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 8.25"
                    value={settings.tax_rate === 0 ? '' : settings.tax_rate}
                    onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-primary-theme focus:outline-none"
                    id="shop-tax-rate-input"
                  />
                </div>

                {/* Default Labor Rate */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Default Labor Rate ($/hr)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 90.00"
                    value={settings.default_labor_rate === 0 ? '' : settings.default_labor_rate}
                    onChange={(e) => setSettings({ ...settings, default_labor_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-primary-theme focus:outline-none"
                    id="shop-labor-rate-input"
                  />
                </div>

                {/* Zip Code */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Shop Zip Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 90210"
                    value={settings.zip_code}
                    onChange={(e) => setSettings({ ...settings, zip_code: e.target.value })}
                    className="w-full bg-bg-theme border border-border-theme rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-primary-theme focus:outline-none"
                    id="shop-zip-code-input"
                  />
                </div>

                {/* Logo Upload & Preview */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Shop Logo</label>
                  <div className="flex items-center gap-3 bg-bg-theme/50 border border-border-theme rounded-lg p-2.5">
                    {settings.shop_logo_url ? (
                      <div className="relative w-12 h-12 bg-slate-800 rounded border border-border-theme flex items-center justify-center overflow-hidden">
                        <img 
                          src={settings.shop_logo_url} 
                          alt="Shop logo preview" 
                          className="max-w-full max-h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, shop_logo_url: '' })}
                          className="absolute top-0 right-0 bg-red-600/80 hover:bg-red-700 text-white rounded-bl p-0.5 text-[8px]"
                          title="Remove Logo"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-slate-900 rounded border border-border-theme flex items-center justify-center text-slate-500 text-xs font-mono">
                        N/A
                      </div>
                    )}
                    <div className="flex-1">
                      <label 
                        htmlFor="shop-logo-file-input"
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[10px] font-bold px-2.5 py-1.5 rounded cursor-pointer uppercase block text-center"
                      >
                        Upload Logo
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                        id="shop-logo-file-input"
                      />
                      <p className="text-[8px] text-slate-500 mt-1 font-sans leading-none">
                        Max 300x300px scale auto-enforced.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1e2028]">
                <div>
                  {saveStatus === 'success' && (
                    <span className="text-xs text-green-400 font-bold block animate-pulse">
                      ✓ Profile Saved Successfully!
                    </span>
                  )}
                  {saveStatus === 'failed' && (
                    <span className="text-xs text-red-400 font-bold block">
                      ⚠ {saveError}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={saveStatus === 'saving'}
                  className="bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-black rounded-lg px-6 py-2 text-xs uppercase tracking-wider transition-all cursor-pointer"
                  id="save-shop-profile-button"
                >
                  {saveStatus === 'saving' ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
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
              {/* Custom Dropdown Theme Swatch Selector */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full flex items-center justify-between bg-bg-theme border border-border-theme hover:border-amber-500/50 text-slate-200 text-xs px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/10 transition-all duration-150 cursor-pointer font-bold uppercase tracking-wider"
                  id="theme-select-dropdown"
                >
                  <div className="flex items-center gap-3">
                    {/* Swatch color circles */}
                    <div className="flex gap-0.5 shrink-0">
                      {currentTheme.colors.map((c, idx) => (
                        <span 
                          key={idx} 
                          className="w-3.5 h-3.5 rounded-sm border border-black/30 block shadow-sm" 
                          style={{ backgroundColor: c }} 
                        />
                      ))}
                    </div>
                    <span className="text-slate-200 font-extrabold">{currentTheme.name}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-[#13141a] border border-[#1e2028] rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto animate-fade-in divide-y divide-[#1e2028] outline-none">
                    {availableThemes.map((t) => {
                      const isSelected = t.id === activeTheme;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setActiveTheme(t.id);
                            setDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between text-left p-3 hover:bg-slate-800/40 transition duration-150 cursor-pointer ${isSelected ? 'bg-amber-500/5' : ''}`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              {/* Theme color swatch cells */}
                              <div className="flex gap-0.5 shrink-0">
                                {t.colors.map((c, idx) => (
                                  <span 
                                    key={idx} 
                                    className="w-3.5 h-3.5 rounded-sm border border-black/30 block shadow-sm" 
                                    style={{ backgroundColor: c }} 
                                  />
                                ))}
                              </div>
                              <span className={`text-xs font-black uppercase tracking-wider ${isSelected ? 'text-amber-400' : 'text-slate-200'}`}>
                                {t.name}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 normal-case font-normal font-sans pl-1">
                              {t.desc}
                            </p>
                          </div>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Theme Details Banner */}
              <div className="flex items-center gap-3.5 bg-bg-theme/40 border border-border-theme/60 rounded-lg p-3.5 select-none">
                <div className="flex gap-0.5 shrink-0">
                  {currentTheme.colors.map((c, idx) => (
                    <span 
                      key={idx} 
                      className="w-5 h-5 rounded-sm border border-black/45 block shadow-md" 
                      style={{ backgroundColor: c }} 
                    />
                  ))}
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-200 block uppercase tracking-wider">
                    {currentTheme.name} SELECTED
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {currentTheme.desc}
                  </p>
                </div>
              </div>

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
