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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('workshop_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function verifyToken() {
      const storedToken = localStorage.getItem('workshop_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const base = getApiBase();
        const res = await fetch(`${base}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
          setToken(storedToken);
        } else {
          // Token is invalid/expired
          localStorage.removeItem('workshop_token');
          setCurrentUser(null);
          setToken(null);
        }
      } catch (err) {
        console.error('Error verifying token on mount:', err);
        // If we get a network error but have a token, we can still load to protect offline-first functionality,
        // but let's parse the token if we can to get some basic info, or just keep loading.
        // Let's decode the JWT payload to reconstruct the user details if offline
        try {
          const parts = storedToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            // Check if expired
            if (payload.exp && payload.exp * 1000 > Date.now()) {
              setCurrentUser({
                id: payload.id,
                username: payload.username,
                role: payload.role
              });
            } else {
              // Expired
              localStorage.removeItem('workshop_token');
              setCurrentUser(null);
              setToken(null);
            }
          }
        } catch (decodeErr) {
          console.error('Failed to parse cached JWT token', decodeErr);
        }
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
    setCurrentUser(null);
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <AuthContext.Provider value={{ currentUser, token, login, logout, isAdmin, isLoading }}>
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
