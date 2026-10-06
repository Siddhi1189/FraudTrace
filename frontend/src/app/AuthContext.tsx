import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest, getStoredToken, removeStoredToken, setStoredToken } from '../api/client';
import { queryClient } from '../lib/queryClient';
import { getSocket, disconnectSocket } from '../lib/socket';

export interface User {
  _id?: string;
  name: string;
  email: string;
  role: 'ANALYST' | 'ADMIN';
  createdAt?: string;
  updatedAt?: string;
}

interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function restoreSession() {
      const stored = getStoredToken();
      if (!stored) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await apiRequest<{ user: User }>('/api/auth/me');
        setUser({
          name: res.user.name,
          email: res.user.email,
          role: res.user.role,
        });
        setToken(stored);
        getSocket();
      } catch {
        removeStoredToken();
        disconnectSocket();
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setStoredToken(res.token);
    setToken(res.token);
    setUser({
      name: res.user.name,
      email: res.user.email,
      role: res.user.role,
    });
    getSocket();
  };

  const logout = () => {
    disconnectSocket();
    removeStoredToken();
    queryClient.clear();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
