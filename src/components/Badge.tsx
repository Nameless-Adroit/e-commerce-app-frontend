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
