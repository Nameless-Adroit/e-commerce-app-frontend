export type ThemeModeType = 'light' | 'dark';

export interface AppTheme {
  mode: ThemeModeType;
  background: string;
  surface: string;
  surfaceLight: string;
  surfaceBorder: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  warning: string;
  danger: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  cardGradient: [string, string];
  badgeBg: string;
  inputBg: string;
  inputBorder: string;
  shadow: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
}

export const lightTheme: AppTheme = {
  mode: 'light',
  background: '#F8FAFC',        // Slate-50: Crisp bright background
  surface: '#FFFFFF',           // Pure white cards & modals
  surfaceLight: '#F1F5F9',      // Slate-100: Soft nested containers & chips
  surfaceBorder: '#E2E8F0',     // Slate-200: Elegant subtle borders
  
  primary: '#4F46E5',           // Rich Indigo
  primaryHover: '#4338CA',
  primaryLight: 'rgba(79, 70, 229, 0.08)',
  
  secondary: '#0284C7',         // Ocean Sky Blue
  accent: '#059669',            // Crisp Emerald for profits & prices
  warning: '#D97706',           // Warm Amber
  danger: '#DC2626',            // Crimson / Rose
  
  text: '#0F172A',              // Slate-900: Deep crisp readable text
  textSecondary: '#475569',     // Slate-600: Refined secondary text
  textMuted: '#94A3B8',         // Slate-400: Placeholder / subtle
  
  cardGradient: ['#FFFFFF', '#F8FAFC'],
  badgeBg: '#F1F5F9',
  inputBg: '#FFFFFF',
  inputBorder: '#CBD5E1',

  shadow: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999
  }
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  background: '#0B0F19',        // Deepest dark slate
  surface: '#151C2C',           // Elevated dark card surface
  surfaceLight: '#1E293B',      // Slate-800: Soft nested containers & chips
  surfaceBorder: '#27354A',     // Slate-700: Sleek subtle border
  
  primary: '#6366F1',           // Vibrant Indigo for dark mode
  primaryHover: '#4F46E5',
  primaryLight: 'rgba(99, 102, 241, 0.16)',
  
  secondary: '#38BDF8',         // Bright Sky Blue
  accent: '#10B981',            // Emerald Green
  warning: '#F59E0B',           // Amber
  danger: '#EF4444',            // Bright Rose Red
  
  text: '#F8FAFC',              // Slate-50: Crisp readable text
  textSecondary: '#94A3B8',     // Slate-400: Refined secondary text
  textMuted: '#64748B',         // Slate-500: Subdued placeholder
  
  cardGradient: ['#151C2C', '#0F172A'],
  badgeBg: '#1E293B',
  inputBg: '#111827',
  inputBorder: '#334155',

  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999
  }
};

// Default exported theme for backward compatibility
export const theme: AppTheme = lightTheme;
