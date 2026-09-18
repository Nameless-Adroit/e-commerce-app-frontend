import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Badge } from './Badge';
import { SettingsModal } from './SettingsModal';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export function Header({ title, subtitle, showBack, rightAction }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Dynamic top safe inset (guarantees notch & punch-hole clearance with comfortable padding)
  const topSafePadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 16
  ) + 6;

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return { text: 'SUPER', variant: 'danger' as const };
      case 'admin':
        return { text: 'ADMIN', variant: 'primary' as const };
      case 'seller':
        return { text: 'SELLER', variant: 'success' as const };
      default:
        return { text: 'USER', variant: 'neutral' as const };
    }
  };

  const roleInfo = getRoleLabel(user?.role);

  const confirmLogout = () => {
    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to sign out of your session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive', 
          onPress: logout 
        }
      ]
    );
  };

  return (
    <>
      <View 
        style={[
          styles.wrapper, 
          { 
            paddingTop: topSafePadding,
            backgroundColor: theme.surface,
            borderBottomColor: theme.surfaceBorder
          }
        ]}
      >
        <View style={styles.container}>
          <View style={styles.leftCol}>
            {showBack && (
              <TouchableOpacity 
                onPress={() => router.back()} 
                style={[styles.backBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]} 
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={20} color={theme.text} />
              </TouchableOpacity>
            )}
            <View style={styles.titleWrapper}>
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{title}</Text>
              {subtitle ? (
                <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>{subtitle}</Text>
              ) : user?.shop_name ? (
                <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>{user.shop_name} ({user.shop_code})</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.rightCol}>
            {rightAction}
            {!rightAction && <Badge label={roleInfo.text} variant={roleInfo.variant} />}
            
            {/* Settings Gear Button */}
            <TouchableOpacity 
              onPress={() => setSettingsOpen(true)} 
              style={[styles.iconBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]} 
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={18} color={theme.text} />
            </TouchableOpacity>

            {/* Logout Button with Confirmation */}
            <TouchableOpacity 
              onPress={confirmLogout} 
              style={styles.logoutBtn} 
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={18} color={theme.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* App Settings Modal */}
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
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
    paddingHorizontal: 20,
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
    borderWidth: 1
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500'
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0
  },
  iconBtn: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.16)'
  }
});
