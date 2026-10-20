import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { Badge } from './Badge';

interface SellerSidebarProps {
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(310, Math.floor(SCREEN_WIDTH * 0.82));

export function SellerSidebar({ visible, onClose }: SellerSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user, activeShop, logout } = useAuth();
  const { totalUnits } = useCart();

  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);

  const handleNavigate = (route: string) => {
    onClose();
    // Allow animation to complete before route change
    setTimeout(() => {
      router.push(route as any);
    }, 120);
  };

  const handleLogout = () => {
    onClose();
    setTimeout(() => {
      Alert.alert(
        'Confirm Sign Out',
        'Are you sure you want to end your cashier session?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: logout
          }
        ]
      );
    }, 150);
  };

  const navItems = [
    {
      title: 'Counter',
      subtitle: 'Selling & barcode scanner',
      icon: 'barcode-outline',
      activeIcon: 'barcode',
      route: '/seller',
      isActive: pathname === '/seller' || pathname === '/seller/'
    },
    {
      title: 'Cart',
      subtitle: 'Review & payment',
      icon: 'cart-outline',
      activeIcon: 'cart',
      route: '/seller/cart',
      badge: totalUnits > 0 ? totalUnits : undefined,
      isActive: pathname === '/seller/cart'
    },
    {
      title: 'Returns',
      subtitle: 'Customer returns & exchanges',
      icon: 'arrow-undo-circle-outline',
      activeIcon: 'arrow-undo-circle',
      route: '/seller/returns',
      isActive: pathname === '/seller/returns'
    },
    {
      title: 'Sales History',
      subtitle: 'Past transactions & receipts',
      icon: 'receipt-outline',
      activeIcon: 'receipt',
      route: '/seller/history',
      isActive: pathname === '/seller/history'
    }
  ];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        {/* Backdrop overlay */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: fadeAnim }
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Sliding Sidebar Panel */}
        <Animated.View
          style={[
            styles.drawer,
            {
              width: DRAWER_WIDTH,
              backgroundColor: theme.surface,
              borderRightColor: theme.surfaceBorder,
              paddingTop: Math.max(insets.top, 16) + 8,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              transform: [{ translateX: slideAnim }]
            }
          ]}
        >
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: theme.surfaceBorder }]}>
            <View style={styles.headerBrand}>
              <View style={[styles.logoCircle, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}>
                <Image
                  source={require('../../assets/images/jmsolutions.png')}
                  style={styles.logoImg}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.headerInfo}>
                <Text style={[styles.brandTitle, { color: theme.text }]} numberOfLines={1}>
                  JM Solution POS
                </Text>
                <Text style={[styles.brandShop, { color: theme.textSecondary }]} numberOfLines={1}>
                  {activeShop ? `${activeShop.name} (${activeShop.shop_code})` : 'Retail Counter'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.surfaceLight }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* User profile card */}
          <View style={[styles.userCard, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}>
            <View style={[styles.avatarCircle, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="person" size={18} color={theme.primary} />
            </View>
            <View style={styles.userMeta}>
              <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                {user?.full_name || user?.username || 'Cashier'}
              </Text>
              <View style={styles.userRoleRow}>
                <Badge label="SELLER" variant="success" />
                {user?.username && (
                  <Text style={[styles.userHandle, { color: theme.textMuted }]} numberOfLines={1}>
                    @{user.username}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Navigation Items */}
          <View style={styles.navList}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
              STORE NAVIGATION
            </Text>

            {navItems.map((item) => {
              const active = item.isActive;
              return (
                <TouchableOpacity
                  key={item.route}
                  style={[
                    styles.navItem,
                    active && { backgroundColor: theme.primary + '14' }
                  ]}
                  onPress={() => handleNavigate(item.route)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.navIconBox,
                      { backgroundColor: active ? theme.primary : theme.surfaceLight }
                    ]}
                  >
                    <Ionicons
                      name={active ? (item.activeIcon as any) : (item.icon as any)}
                      size={20}
                      color={active ? '#FFFFFF' : theme.text}
                    />
                  </View>

                  <View style={styles.navTextCol}>
                    <Text
                      style={[
                        styles.navTitle,
                        { color: active ? theme.primary : theme.text },
                        active && styles.navTitleActive
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text style={[styles.navSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  </View>

                  {item.badge !== undefined && (
                    <View style={[styles.itemBadge, { backgroundColor: theme.primary }]}>
                      <Text style={styles.itemBadgeText}>{item.badge}</Text>
                    </View>
                  )}

                  {active && (
                    <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bottom Footer Section */}
          <View style={[styles.footerSection, { borderTopColor: theme.surfaceBorder }]}>
            {user?.role === 'admin' && (
              <TouchableOpacity
                style={[styles.adminSwitchBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}
                onPress={() => handleNavigate('/admin')}
                activeOpacity={0.75}
              >
                <Ionicons name="shield-checkmark" size={17} color={theme.primary} />
                <Text style={[styles.adminSwitchText, { color: theme.primary }]}>Switch to Admin</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.logoutBtn, { backgroundColor: theme.danger + '12', borderColor: theme.danger + '30' }]}
              onPress={handleLogout}
              activeOpacity={0.75}
            >
              <Ionicons name="log-out-outline" size={18} color={theme.danger} />
              <Text style={[styles.logoutText, { color: theme.danger }]}>Logout Session</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  drawer: {
    height: '100%',
    borderRightWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 16,
    display: 'flex',
    flexDirection: 'column',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  logoCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 10,
  },
  logoImg: {
    width: 28,
    height: 28,
  },
  headerInfo: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  brandShop: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  userMeta: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
  },
  userRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  userHandle: {
    fontSize: 11,
    fontWeight: '500',
  },
  navList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
    position: 'relative',
  },
  navIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navTextCol: {
    flex: 1,
  },
  navTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  navTitleActive: {
    fontWeight: '700',
  },
  navSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  itemBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 4,
  },
  itemBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  footerSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 8,
  },
  adminSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  adminSwitchText: {
    fontSize: 13,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
