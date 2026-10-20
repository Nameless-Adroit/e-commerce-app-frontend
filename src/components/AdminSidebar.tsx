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
  Image,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Badge } from './Badge';

interface AdminSidebarProps {
  visible: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
  unreadNotificationsCount?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(320, Math.floor(SCREEN_WIDTH * 0.84));

export function AdminSidebar({
  visible,
  onClose,
  onOpenSettings,
  unreadNotificationsCount = 0
}: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user, activeShop, availableShops, setActiveShop, logout } = useAuth();

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
    setTimeout(() => {
      router.push(route as any);
    }, 120);
  };

  const handleLogout = () => {
    onClose();
    setTimeout(() => {
      Alert.alert(
        'Confirm Sign Out',
        'Are you sure you want to end your Admin session?',
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
      title: 'Dashboard',
      subtitle: 'Overview & key metrics',
      icon: 'grid-outline',
      activeIcon: 'grid',
      route: '/admin',
      isActive: pathname === '/admin' || pathname === '/admin/'
    },
    {
      title: 'Products',
      subtitle: 'Catalog & QR labels',
      icon: 'pricetags-outline',
      activeIcon: 'pricetags',
      route: '/admin/products',
      isActive: pathname === '/admin/products'
    },
    {
      title: 'Inventory',
      subtitle: 'Stock levels & restock',
      icon: 'layers-outline',
      activeIcon: 'layers',
      route: '/admin/inventory',
      isActive: pathname === '/admin/inventory'
    },
    {
      title: 'Sales',
      subtitle: 'Transactions & orders',
      icon: 'receipt-outline',
      activeIcon: 'receipt',
      route: '/admin/transactions',
      isActive: pathname === '/admin/transactions'
    },
    {
      title: 'Sellers',
      subtitle: 'Cashier accounts & staff',
      icon: 'people-outline',
      activeIcon: 'people',
      route: '/admin/sellers',
      isActive: pathname === '/admin/sellers'
    },
    {
      title: 'Reports',
      subtitle: 'Daily, weekly, top sellers',
      icon: 'bar-chart-outline',
      activeIcon: 'bar-chart',
      route: '/admin/reports',
      isActive: pathname === '/admin/reports' || pathname === '/admin/analytics'
    },
    {
      title: 'Notifications',
      subtitle: 'Stock & business alerts',
      icon: 'notifications-outline',
      activeIcon: 'notifications',
      route: '/admin/notifications',
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
      isActive: pathname === '/admin/notifications'
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
                  {user?.business_name || 'Retail Management'}
                </Text>
                <Text style={[styles.brandShop, { color: theme.textSecondary }]} numberOfLines={1}>
                  {activeShop ? `${activeShop.name} (${activeShop.shop_code})` : 'All Shops'}
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
              <Ionicons name="shield-checkmark" size={18} color={theme.primary} />
            </View>
            <View style={styles.userMeta}>
              <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                {user?.full_name || user?.username || 'Shop Administrator'}
              </Text>
              <View style={styles.userRoleRow}>
                <Badge label="ADMIN" variant="primary" />
                {user?.username && (
                  <Text style={[styles.userHandle, { color: theme.textMuted }]} numberOfLines={1}>
                    @{user.username}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Prominent "+ Add Product" Action */}
          <TouchableOpacity
            style={[styles.prominentAddBtn, { backgroundColor: theme.primary }]}
            onPress={() => handleNavigate('/admin/add-product')}
            activeOpacity={0.85}
          >
            <View style={styles.prominentAddIconCircle}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.prominentAddTextCol}>
              <Text style={styles.prominentAddTitle}>+ Add New Product</Text>
              <Text style={styles.prominentAddSub}>Auto-generate QR & stock</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          {/* Navigation Items Scroll */}
          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.navList}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
              ADMIN NAVIGATION
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
                      size={19}
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
                    <View style={[styles.itemBadge, { backgroundColor: theme.danger }]}>
                      <Text style={styles.itemBadgeText}>{item.badge}</Text>
                    </View>
                  )}

                  {active && (
                    <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Settings Item */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                onClose();
                if (onOpenSettings) {
                  setTimeout(() => onOpenSettings(), 120);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.navIconBox, { backgroundColor: theme.surfaceLight }]}>
                <Ionicons name="settings-outline" size={19} color={theme.text} />
              </View>
              <View style={styles.navTextCol}>
                <Text style={[styles.navTitle, { color: theme.text }]}>Settings</Text>
                <Text style={[styles.navSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
                  Store preferences & theme
                </Text>
              </View>
            </TouchableOpacity>

            {/* Switch to Counter Mode */}
            <TouchableOpacity
              style={[styles.counterSwitchCard, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}
              onPress={() => handleNavigate('/seller')}
              activeOpacity={0.8}
            >
              <View style={[styles.counterSwitchIconCircle, { backgroundColor: theme.primary + '18' }]}>
                <Ionicons name="barcode-outline" size={18} color={theme.primary} />
              </View>
              <View style={styles.counterSwitchTextCol}>
                <Text style={[styles.counterSwitchTitle, { color: theme.text }]}>Open POS Counter</Text>
                <Text style={[styles.counterSwitchSub, { color: theme.textMuted }]}>
                  Test counter sales as register
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={15} color={theme.primary} />
            </TouchableOpacity>
          </ScrollView>

          {/* Bottom Footer Section */}
          <View style={[styles.footerSection, { borderTopColor: theme.surfaceBorder }]}>
            <TouchableOpacity
              style={[styles.logoutBtn, { backgroundColor: theme.danger + '12', borderColor: theme.danger + '30' }]}
              onPress={handleLogout}
              activeOpacity={0.75}
            >
              <Ionicons name="log-out-outline" size={18} color={theme.danger} />
              <Text style={[styles.logoutText, { color: theme.danger }]}>Sign Out</Text>
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
    fontSize: 14,
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
    marginHorizontal: 14,
    marginTop: 12,
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
  prominentAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  prominentAddIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  prominentAddTextCol: {
    flex: 1,
  },
  prominentAddTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  prominentAddSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '500',
  },
  scrollArea: {
    flex: 1,
  },
  navList: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingHorizontal: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4,
    position: 'relative',
  },
  navIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  navTextCol: {
    flex: 1,
  },
  navTitle: {
    fontSize: 13,
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
    top: 6,
    bottom: 6,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  counterSwitchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  counterSwitchIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  counterSwitchTextCol: {
    flex: 1,
  },
  counterSwitchTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  counterSwitchSub: {
    fontSize: 10,
    marginTop: 1,
  },
  footerSection: {
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
