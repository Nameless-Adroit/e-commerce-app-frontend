import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_STORAGE_KEY = 'POS_API_BASE_URL';

// Explicit LAN address for your laptop
const DEFAULT_LAN_HOST = 'http://192.168.0.13:3000';

// Expo inlines EXPO_PUBLIC_* variables at bundle time
const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim() || process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

/**
 * Checks if a URL contains outdated / stale emulator or dead port references
 */
function isStaleUrl(url?: string | null): boolean {
  if (!url) return true;
  // 10.0.2.2 is an emulator loopback, and 5000 was the previous port
  if (url.includes('10.0.2.2') || url.includes(':5000')) return true;
  // On physical mobile devices, localhost / 127.0.0.1 cannot reach the developer machine
  if (Platform.OS !== 'web' && (url.includes('localhost') || url.includes('127.0.0.1'))) return true;
  return false;
}

/**
 * Detects the laptop host IP from Expo Go's active connection if available
 */
function getExpoPackagerIp(): string | null {
  try {
    const hostUri = Constants.expoConfig?.hostUri 
      || (Constants as any).manifest?.debuggerHost 
      || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return ip;
      }
    }
  } catch {
    // Ignore error in environments where Constants is unavailable
  }
  return null;
}

/**
 * Normalizes an API base URL so that it always ends with `/api`
 * Example: `http://192.168.0.13:3000` -> `http://192.168.0.13:3000/api`
 * Example: `http://192.168.0.13:3000/api/` -> `http://192.168.0.13:3000/api`
 */
export function normalizeBaseUrl(url: string): string {
  let clean = url.trim().replace(/\/+$/, '');
  if (!clean.endsWith('/api')) {
    clean = `${clean}/api`;
  }
  return clean;
}

/**
 * Returns default API host based on environment variables, Expo packager, or LAN default
 */
export function getDefaultApiBaseUrl(): string {
  // 1. Environment variable if valid and not stale
  if (envUrl && !isStaleUrl(envUrl)) {
    return normalizeBaseUrl(envUrl);
  }

  // 2. Automatically detect laptop IP from Expo Go packager
  const packagerIp = getExpoPackagerIp();
  if (packagerIp) {
    return normalizeBaseUrl(`http://${packagerIp}:3000`);
  }

  // 3. Fallback to explicit LAN IP
  return normalizeBaseUrl(DEFAULT_LAN_HOST);
}

let currentBaseUrl: string = getDefaultApiBaseUrl();

export async function initApiConfig(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(API_STORAGE_KEY);
    // If saved value in storage is stale (e.g. old 10.0.2.2:5000), clear and discard it!
    if (saved && !isStaleUrl(saved)) {
      currentBaseUrl = normalizeBaseUrl(saved);
    } else {
      if (saved) {
        await AsyncStorage.removeItem(API_STORAGE_KEY);
      }
      currentBaseUrl = getDefaultApiBaseUrl();
    }
  } catch {
    currentBaseUrl = getDefaultApiBaseUrl();
  }
  return currentBaseUrl;
}

export function getApiBaseUrl(): string {
  return currentBaseUrl;
}

export async function setApiBaseUrl(newUrl: string): Promise<void> {
  currentBaseUrl = normalizeBaseUrl(newUrl);
  await AsyncStorage.setItem(API_STORAGE_KEY, currentBaseUrl);
}
