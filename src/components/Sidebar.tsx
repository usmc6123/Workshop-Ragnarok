import React from 'react';
import {
  LayoutDashboard, Users, Car, ClipboardList, Calendar, BookOpen, Settings,
  ChevronLeft, ChevronRight, Menu, ShieldCheck, LogOut, Package, Mail, MessageSquare, Zap, DollarSign, Megaphone, Scissors, Globe
} from 'lucide-react';
import { LOGO_URL } from '../constants/branding';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: any) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onToggleMobile: () => void;
}

export default function Sidebar({
  currentView,
  onChangeView,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onToggleMobile
}: SidebarProps) {
  const { currentUser, isAdmin, logout } = useAuth();
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'vehicles', label: 'Vehicles', icon: Car },
    { id: 'jobs', label: 'Jobs / Work Orders', icon: ClipboardList },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'manual-library', label: 'Manual Library', icon: BookOpen },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'texts', label: 'Texts', icon: MessageSquare },
    { id: 'automations', label: 'Automations', icon: Zap },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'funnels', label: 'Funnels', icon: Megaphone },
    { id: 'sites', label: 'Sites', icon: Globe },
    { id: 'youtube-trimmer', label: 'Youtube Trimmer', icon: Scissors },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Manage Users', icon: ShieldCheck });
  }

  navItems.push({ id: 'settings', label: 'Settings', icon: Settings });

  return (
    <>
      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div 
          onClick={onToggleMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Sidebar Wrapper */}
      <aside 
        className={`
          fixed md:sticky top-0 left-0 bottom-0 z-40
          bg-[#0d0e14] border-r border-border-theme h-screen flex flex-col justify-between
          transition-all duration-300 select-none text-text-theme
          ${collapsed ? 'w-[64px]' : 'w-[240px]'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        id="app-left-sidebar"
      >
        {/* Upper Brand / Logo Block */}
        <div className="flex flex-col">
          <div className="p-4 border-b border-border-theme flex items-center justify-between gap-3 h-[64px] shrink-0">
            <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => onChangeView('dashboard')}>
              <img 
                src="https://raw.githubusercontent.com/usmc6123/images/main/newlogo.jpg" 
                alt="Workshop: Ragnarök Logo" 
                className={`${collapsed ? 'w-8 h-8' : 'w-10 h-10'} rounded-full object-cover border border-border-theme shrink-0`}
              />
              {!collapsed && (
                <div className="animate-fade-in truncate">
                  <h2 className="text-xs font-black tracking-widest uppercase text-white leading-none">
                    WORKSHOP
                  </h2>
                  <span className="text-[9px] font-mono text-primary-theme font-black tracking-wider block mt-1">
                    RAGNARÖK
                  </span>
                </div>
              )}
            </div>
            {/* Desktop Collapse Toggle */}
            <button 
              onClick={onToggleCollapse}
              className="hidden md:flex p-1.5 rounded hover:bg-bg-theme border border-transparent hover:border-border-theme text-slate-400 hover:text-white transition"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Items list */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-120px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id || 
                (item.id === 'manual-library' && currentView === 'manual'); // Treat active manual as Manual Library
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onChangeView(item.id);
                    if (mobileOpen) onToggleMobile();
                  }}
                  className={`
                    w-full flex items-center rounded-lg transition-all py-2.5 px-3 gap-3 text-xs font-bold uppercase tracking-wider
                    ${isActive 
                      ? 'bg-primary-theme text-slate-950 font-black shadow-md' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-bg-theme'
                    }
                  `}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                  {!collapsed && <span className="animate-fade-in truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Lower Status Indicator row / User Account & Logout */}
        <div className="p-3 border-t border-border-theme shrink-0 space-y-3">
          {!collapsed ? (
            <div className="flex items-center justify-between gap-2 p-2.5 bg-[#08090d] rounded-xl border border-[#1e202d] animate-fade-in">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Active Agent</p>
                <p className="text-xs font-mono font-black text-slate-200 truncate">{currentUser?.username || 'Guest'}</p>
                <p className="text-[8px] font-mono text-amber-500 font-bold uppercase tracking-widest mt-0.5">{currentUser?.role}</p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition border border-transparent hover:border-red-500/10 cursor-pointer"
                title="De-authorize Session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                title="De-authorize Session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {!collapsed ? (
            <div className="text-[10px] font-mono text-slate-500 animate-fade-in px-1">
              <p className="font-bold">v1.2.0-CRM</p>
              <p className="text-[9px] mt-0.5">LOCAL WORKSPACE</p>
            </div>
          ) : (
            <div className="flex justify-center text-slate-600 font-mono text-[9px]">v1.2</div>
          )}
        </div>
      </aside>
    </>
  );
}
