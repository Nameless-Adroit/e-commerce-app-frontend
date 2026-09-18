import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme, StyleSheet, Platform, UIManager, LayoutAnimation } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { lightTheme, darkTheme, AppTheme } from '../theme/colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  theme: AppTheme;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const STORAGE_KEY = 'POS_APP_THEME_MODE';

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  theme: lightTheme,
  isDark: false,
  setMode: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
      setInitialized(true);
    }).catch(() => {
      setInitialized(true);
    });
  }, []);

  const setMode = async (newMode: ThemeMode) => {
    LayoutAnimation.configureNext({
      duration: 350,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newMode);
    } catch (e) {
      console.warn('Failed to save theme mode to storage', e);
    }
  };

  const isDark = mode === 'dark' || (mode === 'system' && systemColorScheme === 'dark');
  const currentTheme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ mode, theme: currentTheme, isDark, setMode }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  creator: (theme: AppTheme) => T
): T {
  const { theme } = useTheme();
  return useMemo(() => creator(theme), [theme]);
}
