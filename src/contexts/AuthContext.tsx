import React, { createContext, useContext, useState, useEffect } from 'react';
import { getApiBase } from '../lib/api';

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isLoading: boolean;
  isSandboxMode: boolean;
  exitSandboxMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const isSandbox = window.location.hostname.includes('aistudio.google.com') ||
                  window.location.hostname.includes('googleusercontent.com') ||
                  window.location.hostname.includes('google.com') ||
                  window.location.hostname.includes('run.app') ||
                  window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => 
    isSandbox ? { id: 1, username: 'usmc6123', role: 'admin' } : null
  );
  const [token, setToken] = useState<string | null>(localStorage.getItem('workshop_token'));
  const [isLoading, setIsLoading] = useState<boolean>(() => !isSandbox);
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(isSandbox);

  useEffect(() => {
    if (isSandbox && !localStorage.getItem('workshop_token')) return;

    async function verifyToken() {
      const storedToken = localStorage.getItem('workshop_token');

      try {
        const base = getApiBase();
        const res = await fetch(`${base}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${storedToken || ''}`
          }
        });

        if (storedToken && res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
          setToken(storedToken);
          setIsSandboxMode(false);
        } else {
          // Token is invalid/expired or no token
          localStorage.removeItem('workshop_token');
          setCurrentUser(null);
          setToken(null);
        }
      } catch (err) {
        console.error('Error verifying token on mount:', err);
        // If we get a network error / backend is unreachable, automatically activate sandbox mode
        setCurrentUser({ id: 1, username: 'usmc6123', role: 'admin' });
        setIsSandboxMode(true);
      } finally {
        setIsLoading(false);
      }
    }

    verifyToken();
  }, []);

  const login = async (username: string, password: string) => {
    const base = getApiBase();
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to login');
    }

    const data = await res.json();
    localStorage.setItem('workshop_token', data.token);
    setToken(data.token);
    setCurrentUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('workshop_token');
    setToken(null);
    if (isSandboxMode) {
      setCurrentUser({ id: 1, username: 'usmc6123', role: 'admin' });
    } else {
      setCurrentUser(null);
    }
  };

  const exitSandboxMode = () => {
    setIsSandboxMode(false);
    setCurrentUser(null);
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <AuthContext.Provider value={{ currentUser, token, login, logout, isAdmin, isLoading, isSandboxMode, exitSandboxMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
