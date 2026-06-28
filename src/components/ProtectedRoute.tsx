import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginPage from '../pages/LoginPage';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { currentUser, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center font-mono text-slate-400">
        <span className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mb-4" />
        <span>AUTHENTICATING SECURE MODULES...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onSuccess={() => window.location.reload()} />;
  }

  if (requireAdmin && currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 mb-4 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h1 className="text-xl font-bold font-mono text-slate-200 uppercase tracking-widest">
          ACCESS DENIED (ADMIN ONLY)
        </h1>
        <p className="text-xs font-mono text-slate-500 max-w-md mt-2 leading-relaxed">
          Your current security token (User ID: {currentUser.id}, Role: {currentUser.role}) does not have permissions to read this protected directory.
        </p>
        <button
          onClick={logout}
          className="mt-6 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-xs font-mono font-bold text-red-400 uppercase tracking-wider tracking-widest transition cursor-pointer"
        >
          Session Terminate
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
