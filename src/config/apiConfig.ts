import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_STORAGE_KEY = 'POS_API_BASE_URL';

/**
 * Returns sensible default host based on runtime platform
 */
export function getDefaultApiBaseUrl(): string {
  if (Platform.OS === 'android') {
    // Android emulator loops back to host machine via 10.0.2.2
    return 'http://10.0.2.2:5000/api';
  }
  // Web, iOS simulator, or physical device on localhost
  return 'http://localhost:5000/api';
}

let currentBaseUrl: string = getDefaultApiBaseUrl();

export async function initApiConfig(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(API_STORAGE_KEY);
    if (saved) {
      currentBaseUrl = saved;
    } else {
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
  currentBaseUrl = newUrl.replace(/\/+$/, '');
  await AsyncStorage.setItem(API_STORAGE_KEY, currentBaseUrl);
}
