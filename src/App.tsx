/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Vehicle, GarageItem } from './types';
import { api, getApiBase } from './lib/api';
import DashboardView from './components/DashboardView';
import BrowseView from './components/BrowseView';
import ManualView from './components/ManualView';
import NetworkSettingsModal from './components/NetworkSettingsModal';
import BootSplashScreen from './components/BootSplashScreen';
import { LOGO_URL, BACKGROUND_URL } from './constants/branding';

import { 
  Wrench, Home, Search, Server, Sun, Moon, AlertTriangle, PlayCircle, 
  Wifi, HelpCircle, CheckSquare, Settings
} from 'lucide-react';

type ViewType = 'dashboard' | 'browse' | 'manual';

export default function App() {
  const [view, setView] = useState<ViewType>('dashboard');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  // Create state to toggle Boot/Splash Screen once per session
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return !window.sessionStorage.getItem('ragnarok_splash_shown');
    }
    return true;
  });

  const handleSplashComplete = () => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('ragnarok_splash_shown', 'true');
    }
    setShowSplash(false);
  };
  
  // Custom initial search terms carried over from dashboard cards
  const [browseSearchQuery, setBrowseSearchQuery] = useState<string>('');
  
  // Settings modal visibility
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Refresh trackers to force reload garage queries
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Theme states defaults to dark mode
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Network connection diagnostics
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [currentApiEndpoint, setCurrentApiEndpoint] = useState(getApiBase());

  // Check connection status when API Base is set or on start
  const runServerDiagnostics = async () => {
    try {
      const base = getApiBase();
      const response = await fetch(`${base}/api/makes`, { method: 'GET' });
      setServerOnline(response.ok);
    } catch (err) {
      setServerOnline(false);
    }
  };

  useEffect(() => {
    runServerDiagnostics();
  }, [currentApiEndpoint]);

  // Synchronize CSS modes for HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.remove('theme-light');
      root.classList.add('theme-dark', 'bg-[#020204]');
      document.body.style.backgroundColor = '#020204'; // near-black
    } else {
      root.classList.remove('theme-dark', 'bg-[#020204]');
      root.classList.add('theme-light', 'bg-slate-50');
      document.body.style.backgroundColor = '#f8fafc'; // slate-50
    }
  }, [theme]);

  // Catch dynamic manual swappers from the child ManualView components
  useEffect(() => {
    const handleSwapSource = (event: Event) => {
      const targetVehicle = (event as CustomEvent).detail as Vehicle;
      if (targetVehicle) {
        setSelectedVehicle(targetVehicle);
        setView('browse');
      }
    };

    window.addEventListener('swap-manual-source', handleSwapSource);
    return () => {
      window.removeEventListener('swap-manual-source', handleSwapSource);
    };
  }, []);

  // Back to dashboard router resetters
  const handleNavHome = () => {
    setView('dashboard');
    setSelectedVehicle(null);
  };

  const handleNavBrowse = (initialSearch = '') => {
    setBrowseSearchQuery(initialSearch);
    setView('browse');
    setSelectedVehicle(null);
  };

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setView('browse');
  };

  const handleApplyNewSettings = () => {
    // Reload active states
    setCurrentApiEndpoint(getApiBase());
    setRefreshTrigger((prev) => prev + 1);
  };

  if (showSplash) {
    return <BootSplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <div 
      className={`min-h-screen flex flex-col font-sans transition-all duration-200 ${
        theme === 'dark' ? 'text-slate-100 bg-[#020204]/70' : 'text-slate-900 bg-slate-50/70'
      }`} 
      id="application-container"
      style={{
        backgroundImage: theme === 'dark' 
          ? `linear-gradient(rgba(2, 2, 4, 0.4), rgba(2, 2, 4, 0.6)), url(${BACKGROUND_URL})`
          : `linear-gradient(rgba(248, 250, 252, 0.75), rgba(248, 250, 252, 0.85)), url(${BACKGROUND_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'top center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    >
      
      {/* Dynamic Master Utility Banner if manual server can't be reached */}
      {serverOnline === false && (
        <div 
          className="bg-gradient-to-r from-orange-600 to-amber-600 text-slate-950 px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 select-none shadow animate-pulse shrink-0"
          id="offline-banner"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Can't reach the manual server — make sure the REST API is running under Roscoe or your LAN IP.</span>
          <button
            onClick={() => setSettingsOpen(true)}
            className="underline hover:text-white font-mono text-[10px] uppercase ml-2 bg-slate-950/20 px-2 py-0.5 rounded transition"
          >
            Configure Address
          </button>
        </div>
      )}

      {/* Main App Bar Navbar */}
      <header className={`sticky top-0 z-40 px-4 py-2.5 border-b flex items-center justify-between shadow-md shrink-0 select-none ${
        theme === 'dark' ? 'bg-[#06070a]/95 border-slate-900' : 'bg-white border-slate-200'
      }`} id="app-header">
        
        {/* Brand Title block with Workshop Ragnarok styling */}
        <div 
          onClick={handleNavHome}
          className="flex items-center gap-3 cursor-pointer hover:opacity-95 active:scale-95 transition"
        >
          {/* Tightly cropped circular version of the logo */}
          <img 
            src={LOGO_URL} 
            alt="Workshop: Ragnarök Logo" 
            className="w-9 h-9 md:w-10 md:h-10 object-cover rounded-full border border-slate-700/60 shadow-inner shrink-0 select-none"
          />
          <div>
            <h1 className="text-sm md:text-base font-black tracking-wider text-slate-100 font-metal select-none flex items-center gap-1 leading-none uppercase" style={{ fontFamily: '"Metal Mania", "Cinzel", serif' }}>
              WORKSHOP: <span className="text-amber-500">RAGNARÖK</span>
            </h1>
            <p className="text-[9px] text-slate-500 font-mono tracking-[0.2em] hidden md:block mt-0.5">
              SECURE WORKSHOP SERVICE INTERFACE
            </p>
          </div>
        </div>

        {/* Center navigation tabs (Dashboard vs Catalog) */}
        <nav className="flex items-center gap-1">
          <button
            onClick={handleNavHome}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
              view === 'dashboard'
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 bg-transparent border border-transparent'
            }`}
            id="tab-dashboard"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Garage</span>
          </button>

          <button
            onClick={() => handleNavBrowse('')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
              view === 'browse'
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 bg-transparent border border-transparent'
            }`}
            id="tab-browse"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Catalog</span>
          </button>
        </nav>

        {/* Right utility toolbar (Theme toggle, diagnostics indicators, Settings modal action) */}
        <div className="flex items-center gap-2">
          
          {/* LAN Host indicator widget */}
          <div 
            onClick={() => setSettingsOpen(true)}
            className={`hidden md:flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-mono cursor-pointer transition ${
              serverOnline 
                ? 'bg-green-950/15 border-green-800/30 text-green-400 hover:border-green-600' 
                : 'bg-red-950/15 border-red-800/30 text-red-400 hover:border-red-600'
            }`}
            title="Configure LAN Server Address IP"
          >
            <Wifi className="w-3.5 h-3.5 shrink-0" />
            <span>LAN: {currentApiEndpoint.replace(/^https?:\/\//, '')}</span>
          </div>

          {/* Theme switcher */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`p-2 rounded-lg border transition ${
              theme === 'dark' 
                ? 'bg-slate-800 border-slate-755 text-yellow-400 hover:bg-slate-750' 
                : 'bg-slate-100 border-slate-205 text-slate-650 hover:bg-slate-200'
            }`}
            title={theme === 'dark' ? 'Switch to light mode (Day mode)' : 'Switch to dark mode (Garage mode)'}
            aria-label="Theme toggle"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Quick Connection setup cog */}
          <button
            onClick={() => setSettingsOpen(true)}
            className={`p-2 rounded-lg border transition ${
              theme === 'dark' ? 'bg-slate-800 border-slate-755 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-205 text-slate-650'
            }`}
            title="Connection configuration Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Interactive Screen Content */}
      <div className="flex-1 flex flex-col min-w-0" id="main-content-viewport">
        {view === 'dashboard' && (
          <DashboardView
            onSelectVehicle={handleSelectVehicle}
            onNavigateToBrowse={handleNavBrowse}
            refreshTrigger={refreshTrigger}
          />
        )}

        {view === 'browse' && (
          <BrowseView 
            selectedVehicle={selectedVehicle}
            onSelectVehicle={handleSelectVehicle} 
            onClearSelectedVehicle={() => setSelectedVehicle(null)}
            initialSearch={browseSearchQuery}
          />
        )}

        {view === 'manual' && selectedVehicle && (
          <ManualView
            vehicle={selectedVehicle}
            onBackToDashboard={handleNavHome}
            onRefreshGarage={() => setRefreshTrigger((prev) => prev + 1)}
          />
        )}
      </div>

      {/* Embedded footer */}
      {view !== 'manual' && (
        <span className={`text-[10px] font-mono text-center pb-5 select-none ${
          theme === 'dark' ? 'text-slate-600' : 'text-slate-400'
        }`} id="app-footer-credit">
          Service Manuals • Built for Offline Workshop Deployments
        </span>
      )}

      {/* Connection configure Settings Modal wrapper */}
      <NetworkSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={handleApplyNewSettings}
      />
    </div>
  );
}
