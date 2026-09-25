import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Badge } from './Badge';
import { SettingsModal } from './SettingsModal';
import { ShopSelectorModal } from './ShopSelectorModal';
import { ChangePasswordModal } from './ChangePasswordModal';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function Header({ title = 'JM Solution POS', subtitle, showBack, onBack, rightAction }: HeaderProps) {
  const { user, logout, activeShop, availableShops } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shopSelectorOpen, setShopSelectorOpen] = useState(false);

  // Dynamic top safe inset (guarantees notch & punch-hole clearance with comfortable padding)
  const topSafePadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 16
  ) + 6;

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return { text: 'PLATFORM', variant: 'danger' as const };
      case 'admin':
        return { text: 'OWNER', variant: 'primary' as const };
      case 'seller':
        return { text: 'CASHIER', variant: 'success' as const };
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

  const resolvedSubtitle = subtitle || (
    user?.role === 'admin'
      ? `${user?.business_name || 'Business'} • ${activeShop ? activeShop.name : 'Select Shop'}`
      : (user?.shop_name ? `${user.shop_name} (${user.shop_code})` : null)
  );

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
            {showBack ? (
              <TouchableOpacity 
                onPress={() => onBack ? onBack() : router.back()} 
                style={[styles.backBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]} 
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={20} color={theme.text} />
              </TouchableOpacity>
            ) : (
              <View style={styles.headerLogoContainer}>
                <Image 
                  source={require('../../assets/images/jmsolutions.png')} 
                  style={styles.headerLogo} 
                  resizeMode="cover" 
                />
              </View>
            )}
            <View style={styles.titleWrapper}>
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{title}</Text>
              {resolvedSubtitle ? (
                <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>{resolvedSubtitle}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.rightCol}>
            {/* Admin Shop Switcher Pill or Role Badge */}
            {user?.role === 'admin' && availableShops.length > 0 ? (
              <TouchableOpacity
                onPress={() => setShopSelectorOpen(true)}
                style={[styles.shopSwitcherBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}
                activeOpacity={0.75}
              >
                <Ionicons name="storefront-outline" size={13} color={theme.primary} />
                <Text style={[styles.shopSwitcherText, { color: theme.text }]} numberOfLines={1}>
                  {activeShop ? activeShop.shop_code : 'Shop'}
                </Text>
                <Ionicons name="chevron-down" size={11} color={theme.textMuted} />
              </TouchableOpacity>
            ) : (
              !rightAction && <Badge label={roleInfo.text} variant={roleInfo.variant} />
            )}

            {rightAction}
            
            {/* Settings Gear Button */}
            <TouchableOpacity 
              onPress={() => setSettingsOpen(true)} 
              style={[styles.iconBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]} 
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={17} color={theme.text} />
            </TouchableOpacity>

            {/* Logout Button with Confirmation */}
            <TouchableOpacity 
              onPress={confirmLogout} 
              style={styles.logoutBtn} 
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={17} color={theme.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* App Settings Modal */}
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Admin Shop Selector Modal */}
      <ShopSelectorModal visible={shopSelectorOpen} onClose={() => setShopSelectorOpen(false)} />

      {/* Mandatory PIN Change Modal for users with temporary credentials */}
      <ChangePasswordModal
        visible={Boolean(user?.temporary_pin ?? user?.temporary_password)}
        onClose={() => {}}
        isForced={true}
      />
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
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
    minWidth: 0
  },
  titleWrapper: {
    flex: 1,
    minWidth: 0
  },
  headerLogoContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexShrink: 0
  },
  headerLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
    transform: [{ scale: 1.05 }]
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
    fontWeight: '500'
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1
  },
  logoutBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.16)'
  },
  shopSwitcherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
    maxWidth: 75
  },
  shopSwitcherText: {
    fontSize: 10.5,
    fontWeight: '700'
  }
});
