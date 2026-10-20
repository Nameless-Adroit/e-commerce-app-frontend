import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { RestockModal } from '../../components/RestockModal';
import { AdminSidebar } from '../../components/AdminSidebar';
import { productApi } from '../../services/api';
import { useTheme, useStyles } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AppTheme } from '../../theme/colors';
import { Product } from '../../types';

interface StoreNotification {
  id: string;
  type: 'out_of_stock' | 'low_stock' | 'info';
  title: string;
  message: string;
  timestamp: string;
  product?: Product;
  read: boolean;
}

export default function AdminNotificationsScreen() {
  const router = useRouter();
  const { user, isLoading, activeShop } = useAuth();
  const { theme } = useTheme();
  const styles = useStyles(createStyles);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<StoreNotification[]>([]);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [restockVisible, setRestockVisible] = useState(false);

  const loadNotifications = async () => {
    try {
      const res = await productApi.listProducts({ limit: 100 });
      const products = res.data?.products || [];

      const list: StoreNotification[] = [];

      products.forEach((p) => {
        if (p.stock_quantity <= 0) {
          list.push({
            id: `oos-${p.id}`,
            type: 'out_of_stock',
            title: `Out of Stock: ${p.name}`,
            message: `Product has 0 units remaining. Cashiers at POS counter cannot sell this item until restocked.`,
            timestamp: 'Action required',
            product: p,
            read: false,
          });
        } else if (p.stock_quantity <= p.reorder_level) {
          list.push({
            id: `low-${p.id}`,
            type: 'low_stock',
            title: `Low Stock Alert: ${p.name}`,
            message: `Current stock (${p.stock_quantity}) has dropped below your reorder threshold (${p.reorder_level}).`,
            timestamp: 'Needs attention',
            product: p,
            read: false,
          });
        }
      });

      // System notification
      list.push({
        id: 'system-info-pos',
        type: 'info',
        title: 'POS Counter Active',
        message: `${activeShop ? activeShop.name : 'Store'} counter register is online. Ready for barcode scanning and cash/card/mobile money checkout.`,
        timestamp: 'System',
        read: true,
      });

      setNotifications(list);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user || isLoading || user.role !== 'admin') return;
    loadNotifications();
  }, [user, isLoading, activeShop]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  return (
    <View style={styles.container}>
      <Header
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} alert${unreadCount === 1 ? '' : 's'} requiring attention`
            : 'All systems normal'
        }
        leftAction={
          <TouchableOpacity
            onPress={() => setSidebarVisible(true)}
            style={[styles.menuIconBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}
            activeOpacity={0.7}
          >
            <Ionicons name="menu-outline" size={22} color={theme.text} />
          </TouchableOpacity>
        }
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
              <Text style={[styles.markAllBtnText, { color: theme.primary }]}>Mark all read</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isOOS = item.type === 'out_of_stock';
          const isLow = item.type === 'low_stock';

          const iconColor = isOOS ? theme.danger : isLow ? '#D97706' : theme.primary;
          const iconName = isOOS ? 'alert-circle' : isLow ? 'warning' : 'information-circle';
          const bgLight = isOOS
            ? 'rgba(239, 68, 68, 0.08)'
            : isLow
            ? 'rgba(245, 158, 11, 0.08)'
            : 'rgba(99, 102, 241, 0.08)';

          return (
            <View
              style={[
                styles.notifCard,
                { backgroundColor: theme.surface, borderColor: theme.surfaceBorder },
                !item.read && { borderColor: iconColor, borderWidth: 1.5 }
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: bgLight }]}>
                <Ionicons name={iconName} size={22} color={iconColor} />
              </View>

              <View style={styles.contentCol}>
                <View style={styles.headerRow}>
                  <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!item.read && <View style={[styles.unreadDot, { backgroundColor: iconColor }]} />}
                </View>

                <Text style={[styles.message, { color: theme.textSecondary }]}>
                  {item.message}
                </Text>

                <View style={styles.footerRow}>
                  <Text style={[styles.timestamp, { color: theme.textMuted }]}>
                    {item.timestamp}
                  </Text>

                  <View style={styles.actionRow}>
                    {item.product && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                        onPress={() => {
                          setSelectedProduct(item.product!);
                          setRestockVisible(true);
                        }}
                      >
                        <Ionicons name="add" size={13} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>Restock</Text>
                      </TouchableOpacity>
                    )}

                    {!item.read && (
                      <TouchableOpacity
                        style={[styles.dismissBtn, { backgroundColor: theme.surfaceLight }]}
                        onPress={() => handleMarkAsRead(item.id)}
                      >
                        <Text style={[styles.dismissBtnText, { color: theme.textMuted }]}>Dismiss</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No notifications</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                Your inventory levels and business metrics are currently healthy.
              </Text>
            </View>
          )
        }
      />

      <RestockModal
        visible={restockVisible}
        product={selectedProduct}
        onClose={() => setRestockVisible(false)}
        onSuccess={loadNotifications}
      />

      <AdminSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        unreadNotificationsCount={unreadCount}
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    menuIconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    markAllBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    markAllBtnText: {
      fontSize: 12,
      fontWeight: '600',
    },
    listContent: {
      padding: 16,
      paddingBottom: 80,
    },
    notifCard: {
      flexDirection: 'row',
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
      marginBottom: 10,
      gap: 12,
      ...theme.shadow,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contentCol: {
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      flex: 1,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginLeft: 6,
    },
    message: {
      fontSize: 12,
      lineHeight: 17,
      marginBottom: 8,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    timestamp: {
      fontSize: 11,
      fontWeight: '500',
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 6,
    },
    actionBtnText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    dismissBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    dismissBtnText: {
      fontSize: 11,
      fontWeight: '600',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      marginTop: 12,
    },
    emptySubtitle: {
      fontSize: 12,
      marginTop: 4,
      textAlign: 'center',
      paddingHorizontal: 24,
    },
  });
