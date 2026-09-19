import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { authApi, shopApi, getAuthToken, setAuthToken, setActiveShopId, getActiveShopId } from '../services/api';
import { User, Shop, Role } from '../types';
import { initApiConfig } from '../config/apiConfig';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  activeShop: Shop | null;
  availableShops: Shop[];
  setActiveShop: (shop: Shop | null) => Promise<void>;
  refreshShops: () => Promise<void>;
  currencyCode: string;
  currencySymbol: string;
  formatCurrency: (amount: number) => string;
  login: (identifier: string, pass: string) => Promise<string>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [activeShop, setActiveShopState] = useState<Shop | null>(null);
  const [availableShops, setAvailableShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const segments = useSegments();

  // Load shops belonging to current user
  const refreshShops = useCallback(async () => {
    try {
      const res = await shopApi.getAllShops();
      const shops = res.data?.shops || [];
      setAvailableShops(shops);

      // Auto-select shop if none active or current active invalid
      if (shops.length > 0) {
        const savedShopId = await getActiveShopId();
        const matched = shops.find((s) => s.id === savedShopId) || shops[0];
        setActiveShopState(matched);
        await setActiveShopId(matched.id);
      } else {
        setActiveShopState(null);
        await setActiveShopId(null);
      }
    } catch (err) {
      console.warn('Could not load shops:', err);
    }
  }, []);

  const setActiveShop = async (shop: Shop | null) => {
    setActiveShopState(shop);
    await setActiveShopId(shop ? shop.id : null);
  };

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
              const u = profileRes.data;
              setUser(u);
              if (u.role === 'admin' || u.role === 'super_admin' || u.role === 'seller') {
                const res = await shopApi.getAllShops();
                const shops = res.data?.shops || [];
                setAvailableShops(shops);
                const savedShopId = await getActiveShopId();
                const matched = shops.find((s) => s.id === savedShopId) || shops[0] || null;
                setActiveShopState(matched);
                if (matched) await setActiveShopId(matched.id);
              }
            }
          } catch (err) {
            console.warn('Failed to restore session, token might be expired:', err);
            await setAuthToken(null);
            await setActiveShopId(null);
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
        const loggedUser = res.data.user;
        setUser(loggedUser);

        // Load shops
        try {
          const shopRes = await shopApi.getAllShops();
          const shops = shopRes.data?.shops || [];
          setAvailableShops(shops);
          if (shops.length > 0) {
            const firstShop = shops[0];
            setActiveShopState(firstShop);
            await setActiveShopId(firstShop.id);
          }
        } catch (sErr) {
          console.warn('Could not fetch shops on login:', sErr);
        }

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
      setActiveShopState(null);
      setAvailableShops([]);
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

  // Currency helpers
  const currencyCode = activeShop?.currency_code || user?.shop_currency || 'TZS';
  const currencySymbol = activeShop?.currency_symbol || user?.shop_currency_symbol || 'TSh';

  const formatCurrency = useCallback((amount: number) => {
    const num = Number(amount) || 0;
    const formatted = num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    return `${currencySymbol} ${formatted}`;
  }, [currencySymbol]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        activeShop,
        availableShops,
        setActiveShop,
        refreshShops,
        currencyCode,
        currencySymbol,
        formatCurrency,
        login,
        logout,
        refreshProfile
      }}
    >
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
