export const theme = {
  // Core Surfaces (Bright, clean, modern aesthetic)
  background: '#F8FAFC',        // Slate-50: Crisp bright background
  surface: '#FFFFFF',           // Pure white cards & modals
  surfaceLight: '#F1F5F9',      // Slate-100: Soft nested containers & chips
  surfaceBorder: '#E2E8F0',     // Slate-200: Elegant subtle borders
  
  // Brand & Accents
  primary: '#4F46E5',           // Rich Indigo
  primaryHover: '#4338CA',
  primaryLight: 'rgba(79, 70, 229, 0.08)',
  
  secondary: '#0284C7',         // Ocean Sky Blue
  accent: '#059669',            // Crisp Emerald for profits & prices
  warning: '#D97706',           // Warm Amber
  danger: '#DC2626',            // Crimson / Rose
  
  // Typography (Dark high-contrast on light background)
  text: '#0F172A',              // Slate-900: Deep crisp readable text
  textSecondary: '#475569',     // Slate-600: Refined secondary text
  textMuted: '#94A3B8',         // Slate-400: Placeholder / subtle
  
  // Controls & Inputs
  cardGradient: ['#FFFFFF', '#F8FAFC'],
  badgeBg: '#F1F5F9',
  inputBg: '#FFFFFF',
  inputBorder: '#CBD5E1',

  // Depth & Elevation
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

