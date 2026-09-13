import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/colors';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
}

export function Badge({ label, variant = 'primary', size = 'sm' }: BadgeProps) {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)' };
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' };
      case 'danger':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' };
      case 'neutral':
        return { bg: 'rgba(148, 163, 184, 0.12)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.25)' };
      case 'primary':
      default:
        return { bg: 'rgba(99, 102, 241, 0.15)', text: '#818CF8', border: 'rgba(99, 102, 241, 0.3)' };
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
    borderRadius: theme.radius.full,
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
