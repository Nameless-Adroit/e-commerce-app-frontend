import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
}

export function Badge({ label, variant = 'primary', size = 'sm' }: BadgeProps) {
  const { isDark } = useTheme();

  const getColors = () => {
    if (isDark) {
      switch (variant) {
        case 'success':
          return { bg: 'rgba(52, 211, 153, 0.15)', text: '#34D399', border: 'rgba(52, 211, 153, 0.3)' };
        case 'warning':
          return { bg: 'rgba(251, 191, 36, 0.15)', text: '#FBBF24', border: 'rgba(251, 191, 36, 0.3)' };
        case 'danger':
          return { bg: 'rgba(248, 113, 113, 0.15)', text: '#F87171', border: 'rgba(248, 113, 113, 0.3)' };
        case 'neutral':
          return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.3)' };
        case 'primary':
        default:
          return { bg: 'rgba(129, 140, 248, 0.15)', text: '#818CF8', border: 'rgba(129, 140, 248, 0.3)' };
      }
    }

    switch (variant) {
      case 'success':
        return { bg: 'rgba(5, 150, 105, 0.1)', text: '#059669', border: 'rgba(5, 150, 105, 0.25)' };
      case 'warning':
        return { bg: 'rgba(217, 119, 6, 0.1)', text: '#D97706', border: 'rgba(217, 119, 6, 0.25)' };
      case 'danger':
        return { bg: 'rgba(220, 38, 38, 0.1)', text: '#DC2626', border: 'rgba(220, 38, 38, 0.25)' };
      case 'neutral':
        return { bg: 'rgba(71, 85, 105, 0.08)', text: '#475569', border: 'rgba(71, 85, 105, 0.2)' };
      case 'primary':
      default:
        return { bg: 'rgba(79, 70, 229, 0.1)', text: '#4F46E5', border: 'rgba(79, 70, 229, 0.25)' };
    }
  };

  const colors = getColors();

  return (
    <View style={[
      styles.badge, 
      { backgroundColor: colors.bg, borderColor: colors.border },
      size === 'sm' ? styles.badgeSm : styles.badgeMd
    ]}>
      <Text style={[
        styles.text, 
        { color: colors.text },
        size === 'sm' ? styles.textSm : styles.textMd
      ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 9999,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center'
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  badgeMd: {
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  text: {
    fontWeight: '600'
  },
  textSm: {
    fontSize: 11
  },
  textMd: {
    fontSize: 13
  }
});
