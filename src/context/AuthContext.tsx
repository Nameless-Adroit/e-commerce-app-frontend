import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { 
  authApi, 
  shopApi, 
  setAuthToken, 
  setActiveShopId, 
  getActiveShopId,
  setOnSessionExpired
} from '../services/api';
import { User, Shop } from '../types';
import { initApiConfig } from '../config/apiConfig';

interface LoginParams {
  phoneNumber?: string;
  pin?: string;
  identifier?: string;
  password?: string;
}

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
  login: (credentials: LoginParams | string, maybePassword?: string) => Promise<string>;
  loginWithPhone: (phone: string, pin: string) => Promise<string>;
  loginWithCredentials: (identifier: string, pass: string) => Promise<string>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateCurrentUser: (updated: User) => void;
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

  const updateCurrentUser = (updated: User) => {
    setUser(prev => prev ? { ...prev, ...updated } : updated);
  };

  // Register session expiration callback to clear auth state on 401 refresh failure
  useEffect(() => {
    setOnSessionExpired(() => {
      setTokenState(null);
      setUser(null);
      setActiveShopState(null);
      setAvailableShops([]);
      router.replace('/');
    });
  }, [router]);

  // Initial Auth Restoration: Attempt silent refresh via HTTP-only cookie
  useEffect(() => {
    async function loadStoredAuth() {
      try {
        await initApiConfig();

        // 1. Attempt silent token refresh via HTTP-only cookie
        try {
          const refreshRes = await authApi.refresh();
          if (refreshRes.data?.token) {
            setTokenState(refreshRes.data.token);

            // Fetch latest user profile and active shops
            const profileRes = await authApi.getProfile();
            if (profileRes.data) {
              const u = profileRes.data;
              setUser(u);

              try {
                const shopRes = await shopApi.getAllShops();
                const shops = shopRes.data?.shops || [];
                setAvailableShops(shops);
                const savedShopId = await getActiveShopId();
                const matched = shops.find((s) => s.id === savedShopId) || shops[0] || null;
                setActiveShopState(matched);
                if (matched) await setActiveShopId(matched.id);
              } catch (sErr) {
                console.warn('Could not load shops during session restoration:', sErr);
              }
            }
          }
        } catch {
          // No active cookie session or session expired; user starts at login
          await setAuthToken(null);
          await setActiveShopId(null);
          setTokenState(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Error during auth initialization:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStoredAuth();
  }, []);

  // Protected Route Guards
  useEffect(() => {
    if (isLoading) return;

    const firstSegment = (segments[0] as string) || '';
    const inAuthGroup = firstSegment === 'super-admin' || firstSegment === 'admin' || firstSegment === 'seller';

    if (!user && inAuthGroup) {
      router.replace('/' as any);
    } else if (user) {
      if (!inAuthGroup) {
        if (user.role === 'super_admin') {
          router.replace('/super-admin' as any);
        } else if (user.role === 'admin') {
          router.replace('/admin' as any);
        } else if (user.role === 'seller') {
          router.replace('/seller' as any);
        }
      } else {
        // Enforce strict role boundaries:
        // Admin is restricted to reports/management in /admin and CANNOT access /seller (POS)
        if (user.role === 'admin' && (firstSegment === 'seller' || firstSegment === 'super-admin')) {
          router.replace('/admin' as any);
        } else if (user.role === 'seller' && (firstSegment === 'admin' || firstSegment === 'super-admin')) {
          router.replace('/seller' as any);
        } else if (user.role === 'super_admin' && firstSegment === 'seller') {
          router.replace('/super-admin' as any);
        }
      }
    }
  }, [user, segments, isLoading, router]);

  /**
   * Single authentication handler (Phone Number + 6-digit PIN)
   */
  const login = async (credentials: LoginParams | string, maybePin?: string): Promise<string> => {
    setIsLoading(true);
    try {
      let payload: LoginParams;
      if (typeof credentials === 'string') {
        payload = { phoneNumber: credentials, pin: maybePin };
      } else {
        payload = credentials;
      }

      const res = await authApi.login(payload);
      if (res.data?.token && res.data?.user) {
        setTokenState(res.data.token);
        const loggedUser = res.data.user;
        setUser(loggedUser);

        // Load shops for user
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

  const loginWithPhone = async (phoneNumber: string, pin: string): Promise<string> => {
    return login({ phoneNumber, pin });
  };

  const loginWithCredentials = async (identifier: string, password: string): Promise<string> => {
    return login({ identifier, password });
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

  const logoutAll = async () => {
    setIsLoading(true);
    try {
      await authApi.logoutAll();
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
        loginWithPhone,
        loginWithCredentials,
        logout,
        logoutAll,
        refreshProfile,
        updateCurrentUser
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
