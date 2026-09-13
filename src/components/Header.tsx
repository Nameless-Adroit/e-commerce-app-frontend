import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
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
    <View style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.leftCol}>
            {showBack && (
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={24} color={theme.text} />
              </TouchableOpacity>
            )}
            <View>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? (
                <Text style={styles.subtitle}>{subtitle}</Text>
              ) : user?.shop_name ? (
                <Text style={styles.subtitle}>{user.shop_name} ({user.shop_code})</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.rightCol}>
            {rightAction}
            <Badge label={roleInfo.text} variant={roleInfo.variant} />
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={20} color={theme.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.surfaceBorder,
    paddingTop: Platform.OS === 'android' ? 30 : 0
  },
  safeArea: {
    width: '100%'
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: theme.surfaceLight
  },
  title: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700'
  },
  subtitle: {
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: 2
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)'
  }
});
