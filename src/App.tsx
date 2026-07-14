/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Vehicle } from './types';
import { api, getApiBase, setApiBase } from './lib/api';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import BrowseView from './components/BrowseView';
import ManualView from './components/ManualView';
import CustomersView from './components/CustomersView';
import VehiclesView from './components/VehiclesView';
import JobsView from './components/JobsView';
import InventoryView from './components/InventoryView';
import CalendarView from './components/CalendarView';
import SettingsView from './components/SettingsView';
import NetworkSettingsModal from './components/NetworkSettingsModal';
import BootSplashScreen from './components/BootSplashScreen';
import EmailView from './components/EmailView';
import TextsView from './components/TextsView';
import AutomationsView from './components/AutomationsView';
import PaymentsView from './components/PaymentsView';
import CustomerPortalView from './components/CustomerPortalView';
import FunnelPageView from './components/FunnelPageView';
import FunnelsView from './components/FunnelsView';
import SitePageView from './components/SitePageView';
import SitesView from './components/SitesView';
import YoutubeTrimmerView from './components/YoutubeTrimmerView';
import QuickReformatView from './components/QuickReformatView';
import AiChatBotView from './components/AiChatBotView';
import VideoEditorView from './components/VideoEditorView';
import { LOGO_URL, BACKGROUND_URL } from './constants/branding';
import { SITES_BASE_DOMAIN, RESERVED_SITE_SUBDOMAINS } from './constants/sites';
import ProtectedRoute from './components/ProtectedRoute';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import ChatWidget from './components/ChatWidget';

import { 
  Wrench, Home, Search, Server, Sun, Moon, AlertTriangle, PlayCircle, 
  Wifi, HelpCircle, CheckSquare, Settings, Car, ClipboardList, LayoutDashboard, Menu
} from 'lucide-react';

type ViewType = 'dashboard' | 'customers' | 'vehicles' | 'jobs' | 'inventory' | 'calendar' | 'manual-library' | 'settings' | 'manual' | 'admin' | 'login' | 'email' | 'texts' | 'automations' | 'payments' | 'funnels' | 'sites' | 'youtube-trimmer' | 'reformat-tool' | 'ai-chat-bot' | 'video-editor';

export default function App() {
  console.log('APP RENDERING');
  // Reads ?view=reformat-tool so the "Open this app locally" link in MediaField's
  // Reformat panel can drop the user straight into the quick uploader instead of
  // the Dashboard. Read once at initial state so it survives the full page
  // reload ProtectedRoute/LoginPage does right after a fresh login (the query
  // string stays in the URL across that reload).
  const [view, setView] = useState<ViewType>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'reformat-tool') return 'reformat-tool';
    }
    return 'dashboard';
  });
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [initialSelectedVehicleId, setInitialSelectedVehicleId] = useState<number | null>(null);
  const [initialSelectedJobId, setInitialSelectedJobId] = useState<number | null>(null);
  
  // Quick compose state for the Email center
  const [emailComposeData, setEmailComposeData] = useState<{ customerId?: number; recipientEmail?: string } | null>(null);

  const handleTriggerQuickEmail = (customerId: number, email?: string) => {
    setEmailComposeData({ customerId, recipientEmail: email });
    setView('email');
  };
  
  // Create state to toggle Boot/Splash Screen once per session
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return !window.sessionStorage.getItem('ragnarok_splash_shown');
    }
    return true;
  });

  const [lastView, setLastView] = useState<ViewType>('dashboard');

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

  // Sidebar states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // Theme state: defaults to 'theme-ragnarok'
  const [activeTheme, setActiveTheme] = useState(() => {
    return localStorage.getItem('ragnarok_active_theme') || 'theme-ragnarok';
  });

  // Per-page scale state and storage loading
  const [scale, setScale] = useState(100);

  useEffect(() => {
    const saved = localStorage.getItem(`page_scale_${view}`);
    if (saved) {
      setScale(parseInt(saved, 10) || (view === 'dashboard' ? 115 : 100));
    } else {
      setScale(view === 'dashboard' ? 115 : 100);
    }
  }, [view]);

  const handleAdjustScale = (amount: number) => {
    setScale((prev) => {
      const next = Math.min(150, Math.max(70, prev + amount));
      localStorage.setItem(`page_scale_${view}`, String(next));
      return next;
    });
  };

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

  // Synchronize CSS modes for HTML documentElement and save to localStorage
  useEffect(() => {
    const root = document.documentElement;
    // Clear previous theme classes
    root.className = '';
    root.classList.add(activeTheme);
    localStorage.setItem('ragnarok_active_theme', activeTheme);
  }, [activeTheme]);

  // Catch dynamic manual swappers from the child ManualView components
  useEffect(() => {
    const handleSwapSource = (event: Event) => {
      const targetVehicle = (event as CustomEvent).detail as Vehicle;
      if (targetVehicle) {
        setSelectedVehicle(targetVehicle);
        setView('manual');
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
    setView('manual-library');
    setSelectedVehicle(null);
  };

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setLastView(view);
    setSelectedVehicle(vehicle);
    setView('manual');
  };

  const handleBackFromManual = () => {
    setView(lastView);
    setSelectedVehicle(null);
  };

  const handleApplyNewSettings = () => {
    setCurrentApiEndpoint(getApiBase());
    setRefreshTrigger((prev) => prev + 1);
  };

  const getViewTitle = () => {
    switch (view) {
      case 'dashboard': return 'Workshop Dashboard';
      case 'customers': return 'Clients & CRM Profiles';
      case 'vehicles': return 'Vehicle Fleet Profiles';
      case 'jobs': return 'Work Orders & Repairs';
      case 'inventory': return 'Inventory & Spare Parts';
      case 'calendar': return 'Schedules & Intake';
      case 'manual-library': return 'Service Manual Catalog';
      case 'settings': return 'System Settings';
      case 'manual': return 'Active Service Manual';
      case 'admin': return 'Manage Users';
      case 'automations': return 'Automations';
      case 'payments': return 'Payments';
      case 'sites': return 'Website Builder';
      case 'ai-chat-bot': return 'AI Chat Bot Builder';
      case 'video-editor': return 'Shop Video Editor';
      case 'login': return 'Terminal Auth';
      case 'reformat-tool': return 'Quick Upload / Reformat';
      default: return 'Workshop Management';
    }
  };

  if (showSplash) {
    return <BootSplashScreen onComplete={handleSplashComplete} />;
  }

  const isManualOrLibrary = view === 'manual' || view === 'manual-library';
  const isManualLibrary = view === 'manual-library';

  const getBackgroundStyle = () => {
    if (isManualLibrary) {
      return {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.55)), url('https://raw.githubusercontent.com/usmc6123/images/main/carmanualsbackground.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      };
    }
    if (view === 'manual') {
      return { backgroundColor: '#0a0a0f' };
    }
    if (view === 'video-editor') {
      return {
        backgroundImage: `url('/catvideoeditbackground.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      };
    }
    return {
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url('https://raw.githubusercontent.com/usmc6123/images/main/catbackground.jpg')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      backgroundRepeat: 'no-repeat',
    };
  };

  const pathParts = window.location.pathname.split('/');
  const isPortal = pathParts[1] === 'portal' && pathParts[2];
  const isFunnel = pathParts[1] === 'funnel' && pathParts[2];
  const isSitePreviewPath = pathParts[1] === 'site' && pathParts[2];

  // Once the one-time wildcard Cloudflare Tunnel route for *.<domain> is
  // added, a visitor's browser hits this app with a hostname like
  // "my-portfolio.homeslab.uk" instead of the usual shop hostname — pull the
  // subdomain straight out of window.location.hostname, same idea as the
  // existing path-based detection above but for real subdomain traffic.
  // Sites live at flat one-level hostnames (not a dedicated "sites." prefix)
  // since a two-level wildcard needs paid Advanced Certificate Manager —
  // see RESERVED_SITE_SUBDOMAINS for why this must exclude 'workshop'.
  const siteHostnameSuffix = `.${SITES_BASE_DOMAIN}`;
  const siteHostnameLabel = window.location.hostname.endsWith(siteHostnameSuffix)
    ? window.location.hostname.slice(0, -siteHostnameSuffix.length)
    : null;
  const isValidSiteLabel = !!siteHostnameLabel && /^[a-z0-9-]+$/i.test(siteHostnameLabel) && !RESERVED_SITE_SUBDOMAINS.has(siteHostnameLabel.toLowerCase());
  const siteSubdomain = isSitePreviewPath ? pathParts[2] : (isValidSiteLabel ? siteHostnameLabel : null);

  if (isPortal) {
    const portalToken = pathParts[2];
    return (
      <ProtectedRoute>
        <CustomerPortalView token={portalToken} />
      </ProtectedRoute>
    );
  }

  if (isFunnel) {
    const funnelSlug = pathParts[2];
    return (
      <ProtectedRoute>
        <FunnelPageView slug={funnelSlug} />
      </ProtectedRoute>
    );
  }

  if (siteSubdomain) {
    return (
      <ProtectedRoute>
        <SitePageView subdomain={siteSubdomain} />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div 
        className={`min-h-screen flex text-text-theme transition-all duration-200 ${
          view === 'video-editor' ? 'bg-transparent' : 'bg-bg-theme'
        }`} 
        id="application-container"
        style={getBackgroundStyle()}
      >
        
        {/* 1. Left Navigation Sidebar */}
        <Sidebar
          currentView={view}
          onChangeView={setView}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={sidebarMobileOpen}
          onToggleMobile={() => setSidebarMobileOpen(!sidebarMobileOpen)}
        />

        {/* 2. Main Right pane wrapper */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          
          {/* Top Header Row Panel */}
          <header className="sticky top-0 z-30 h-[64px] px-6 bg-surface-theme/90 backdrop-blur-md border-b border-border-theme flex items-center justify-between shadow-md shrink-0 select-none">
            
            <div className="flex items-center gap-4">
              {/* Mobile Hamburger toggle */}
              <button
                onClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
                className="md:hidden p-2 hover:bg-bg-theme rounded text-slate-400 hover:text-white transition"
                id="sidebar-mobile-toggle"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Path indicator titles */}
              <div className="text-left">
                <h2 className="text-sm font-black tracking-wider text-slate-100 uppercase font-mono">
                  {getViewTitle()}
                </h2>
                <p className="hidden sm:block text-[9px] text-slate-500 font-mono tracking-widest mt-0.5 uppercase">
                  Workshop RAGNARÖK / {view === 'manual-library' ? 'manuals' : view === 'sites' ? 'website builder' : view}
                </p>
              </div>
            </div>

            {/* Right Toolbar controls */}
            <div className="flex items-center gap-3">
              {/* Offline diagnostics warning */}
              {serverOnline === false && (
                <div 
                  onClick={() => setSettingsOpen(true)}
                  className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition animate-pulse"
                  title="Manual server is unreachable. Click to configure connection address."
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Offline Mode Active</span>
                </div>
              )}

              {/* Connection Diagnostics widget */}
              <div 
                onClick={() => setSettingsOpen(true)}
                className={`hidden md:flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-mono cursor-pointer transition ${
                  serverOnline 
                    ? 'bg-green-950/15 border-green-800/30 text-green-400 hover:border-green-600' 
                    : 'bg-red-950/15 border-red-800/30 text-red-400 hover:border-red-600'
                }`}
                title="Configure API Server IP Host"
              >
                <Wifi className="w-3.5 h-3.5 shrink-0" />
                <span>{currentApiEndpoint.replace(/^https?:\/\//, '')}</span>
              </div>

              {/* Quick settings gear cog */}
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 rounded-lg border border-border-theme bg-bg-theme/40 hover:bg-bg-theme text-slate-355 hover:text-white transition cursor-pointer"
                title="API Server settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* 3. Main Viewport Container */}
          <main className={`flex-1 ${view === 'automations' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            {view === 'automations' ? (
              <AutomationsView />
            ) : (
              <div
                style={{
                  transform: `scale(${scale / 100})`,
                  transformOrigin: view === 'dashboard' ? '97.5% top' : 'top center'
                }}
                className="w-full"
                id="main-content-scale-wrapper"
              >
                {view === 'dashboard' && (
                  <DashboardView
                    onSelectVehicle={handleSelectVehicle}
                    onNavigateToTab={(tab) => setView(tab as any)}
                    onNavigateToBrowseWithSearch={handleNavBrowse}
                    refreshTrigger={refreshTrigger}
                  />
                )}

                {view === 'customers' && (
                  <CustomersView 
                    onNavigateToTab={(tab, vehicleId) => {
                      setView(tab as any);
                      setInitialSelectedVehicleId(vehicleId ?? null);
                    }} 
                    onTriggerEmail={handleTriggerQuickEmail}
                  />
                )}

                {view === 'vehicles' && (
                  <VehiclesView
                    onNavigateToManualWithSearch={(make, year, model) => handleNavBrowse(`${make} ${model}`)}
                    onSelectVehicle={handleSelectVehicle}
                    refreshTrigger={refreshTrigger}
                    initialSelectedVehicleId={initialSelectedVehicleId}
                    onInitialVehicleConsumed={() => setInitialSelectedVehicleId(null)}
                  />
                )}

                {view === 'jobs' && (
                  <JobsView
                    refreshTrigger={refreshTrigger}
                    onTriggerEmail={handleTriggerQuickEmail}
                    initialSelectedJobId={initialSelectedJobId}
                    onInitialJobConsumed={() => setInitialSelectedJobId(null)}
                  />
                )}

                {view === 'inventory' && (
                  <InventoryView />
                )}

                {view === 'calendar' && (
                  <CalendarView
                    onNavigateToJob={(jobId) => {
                      setInitialSelectedJobId(jobId);
                      setView('jobs');
                    }}
                  />
                )}

                {view === 'email' && (
                  <EmailView
                    initialComposeData={emailComposeData}
                    onClearComposeData={() => setEmailComposeData(null)}
                    onNavigateToCustomer={(customerId) => {
                      setView('customers');
                    }}
                  />
                )}

                {view === 'texts' && (
                  <TextsView />
                )}

                {view === 'payments' && (
                  <PaymentsView
                    onNavigateToJob={(jobId) => {
                      setInitialSelectedJobId(jobId);
                      setView('jobs');
                    }}
                    onNavigateToCustomer={() => setView('customers')}
                  />
                )}

                {view === 'manual-library' && (
                  <BrowseView 
                    selectedVehicle={selectedVehicle}
                    onSelectVehicle={handleSelectVehicle} 
                    onClearSelectedVehicle={() => setSelectedVehicle(null)}
                    initialSearch={browseSearchQuery}
                  />
                )}

                {view === 'settings' && (
                  <SettingsView 
                    activeTheme={activeTheme}
                    setActiveTheme={setActiveTheme}
                    onSaveAddress={handleApplyNewSettings}
                  />
                )}

                {view === 'manual' && selectedVehicle && (
                  <ManualView
                    vehicle={selectedVehicle}
                    onBackToDashboard={handleBackFromManual}
                    onRefreshGarage={() => setRefreshTrigger((prev) => prev + 1)}
                  />
                )}

                {view === 'funnels' && (
                  <FunnelsView />
                )}

                {view === 'sites' && (
                  <SitesView />
                )}

                {view === 'ai-chat-bot' && (
                  <AiChatBotView />
                )}

                {view === 'video-editor' && (
                  <VideoEditorView />
                )}

                {view === 'youtube-trimmer' && (
                  <YoutubeTrimmerView />
                )}

                {view === 'reformat-tool' && (
                  <QuickReformatView />
                )}

                {view === 'admin' && (
                  <ProtectedRoute requireAdmin={true}>
                    <AdminPage />
                  </ProtectedRoute>
                )}
              </div>
            )}
          </main>

          {/* Floating Scale Control Widget */}
          {view !== 'settings' && view !== 'admin' && view !== 'automations' && (
            <div 
              className="fixed bottom-6 right-6 z-40 flex items-center gap-1.5 bg-[#0e0f14]/80 backdrop-blur-md border border-white/10 px-2.5 py-1.5 rounded-full shadow-lg select-none"
              id="page-scale-control-widget"
            >
              <button
                type="button"
                onClick={() => handleAdjustScale(-5)}
                disabled={scale <= 70}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-black/40 border border-white/5 text-amber-500 hover:text-amber-400 disabled:text-zinc-600 disabled:cursor-not-allowed hover:bg-white/5 active:scale-95 transition cursor-pointer text-sm font-bold animate-none"
                id="scale-down-btn"
              >
                -
              </button>
              <span className="text-[11px] font-mono font-black text-amber-500 w-11 text-center" id="scale-display-value">
                {scale}%
              </span>
              <button
                type="button"
                onClick={() => handleAdjustScale(5)}
                disabled={scale >= 150}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-black/40 border border-white/5 text-amber-500 hover:text-amber-400 disabled:text-zinc-600 disabled:cursor-not-allowed hover:bg-white/5 active:scale-95 transition cursor-pointer text-sm font-bold animate-none"
                id="scale-up-btn"
              >
                +
              </button>
            </div>
          )}

          {/* Mini Embedded Footer copyright */}
          {view !== 'manual' && (
            <footer className="py-4 border-t border-border-theme/40 text-[10px] font-mono text-center text-slate-600 select-none">
              RAGNARÖK AUTO WORKSHOP SUITE • LOCAL DISK PORT 3000
            </footer>
          )}
        </div>

        {/* Network Diagnostics configuration Dialog overlay */}
        <NetworkSettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSave={handleApplyNewSettings}
        />

        <ChatWidget />
      </div>
    </ProtectedRoute>
  );
}
