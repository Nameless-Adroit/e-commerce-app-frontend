import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme/colors';
import { Badge } from './Badge';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export function Header({ title, subtitle, showBack, rightAction }: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Dynamic top safe inset (guarantees notch & punch-hole clearance with comfortable padding)
  const topSafePadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 16
  ) + 6;

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return { text: 'SUPER ADMIN', variant: 'danger' as const };
      case 'admin':
        return { text: 'SHOP ADMIN', variant: 'primary' as const };
      case 'seller':
        return { text: 'POS SELLER', variant: 'success' as const };
      default:
        return { text: 'USER', variant: 'neutral' as const };
    }
  };

  const roleInfo = getRoleLabel(user?.role);

  return (
    <View style={[styles.wrapper, { paddingTop: topSafePadding }]}>
      <View style={styles.container}>
        <View style={styles.leftCol}>
          {showBack && (
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={theme.text} />
            </TouchableOpacity>
          )}
          <View style={styles.titleWrapper}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
            ) : user?.shop_name ? (
              <Text style={styles.subtitle} numberOfLines={1}>{user.shop_name} ({user.shop_code})</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.rightCol}>
          {rightAction}
          <Badge label={roleInfo.text} variant={roleInfo.variant} />
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={18} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.surfaceBorder,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    zIndex: 10
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 14
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12
  },
  titleWrapper: {
    flex: 1
  },
  backBtn: {
    padding: 7,
    borderRadius: 10,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  title: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  subtitle: {
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500'
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.16)'
  }
});
