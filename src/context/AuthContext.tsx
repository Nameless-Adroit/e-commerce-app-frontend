import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { authApi, getAuthToken, setAuthToken } from '../services/api';
import { User, Role } from '../types';
import { initApiConfig } from '../config/apiConfig';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<string>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    async function loadStoredAuth() {
      try {
        await initApiConfig();
        const savedToken = await getAuthToken();
        if (savedToken) {
          setTokenState(savedToken);
          try {
            const profileRes = await authApi.getProfile();
            if (profileRes.data) {
              setUser(profileRes.data);
            }
          } catch (err) {
            console.warn('Failed to restore session, token might be expired:', err);
            await setAuthToken(null);
            setTokenState(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Error during auth initialization:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStoredAuth();
  }, []);

  // Handle protected route redirection based on role
  useEffect(() => {
    if (isLoading) return;

    const firstSegment = (segments[0] as string) || '';
    const inAuthGroup = firstSegment === 'super-admin' || firstSegment === 'admin' || firstSegment === 'seller';

    if (!user && inAuthGroup) {
      // Redirect to login if unauthenticated
      router.replace('/' as any);
    } else if (user && !inAuthGroup) {
      // Redirect authenticated users to their specific dashboard
      if (user.role === 'super_admin') {
        router.replace('/super-admin' as any);
      } else if (user.role === 'admin') {
        router.replace('/admin' as any);
      } else if (user.role === 'seller') {
        router.replace('/seller' as any);
      }
    }
  }, [user, segments, isLoading]);

  const login = async (identifier: string, pass: string): Promise<string> => {
    setIsLoading(true);
    try {
      const res = await authApi.login(identifier, pass);
      if (res.data?.token && res.data?.user) {
        setTokenState(res.data.token);
        setUser(res.data.user);
        return res.data.redirect_url;
      }
      throw new Error(res.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
      setTokenState(null);
      setUser(null);
      router.replace('/');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await authApi.getProfile();
      if (res.data) {
        setUser(res.data);
      }
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
