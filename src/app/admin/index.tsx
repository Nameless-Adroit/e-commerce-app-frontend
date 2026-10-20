import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { RestockModal } from '../../components/RestockModal';
import { ReceiptModal } from '../../components/ReceiptModal';
import { AdminSidebar } from '../../components/AdminSidebar';
import { SubscriptionBanner } from '../../components/SubscriptionBanner';
import { productApi, posApi, businessApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useStyles } from '../../context/ThemeContext';
import { AppTheme } from '../../theme/colors';
import { Product, Transaction } from '../../types';
import { formatCurrency } from '../../utils/currency';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isLoading, activeShop, currencySymbol } = useAuth();
  const { theme } = useTheme();
  const styles = useStyles(createStyles);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Business Data
  const [metrics, setMetrics] = useState<{ products_count: number; products_in_stock: number; low_stock_products: number; out_of_stock_products: number; total_revenue: number; today_revenue: number; total_transactions: number; active_sellers: number } | null>(null);
  const [loadError, setLoadError] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  // Modals
  const [selectedRestockProduct, setSelectedRestockProduct] = useState<Product | null>(null);
  const [restockVisible, setRestockVisible] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [receiptVisible, setReceiptVisible] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoadError('');
      const [productsRes, txnsRes, overviewRes] = await Promise.all([
        productApi.listProducts({ limit: 200 }),
        posApi.getTransactions({ limit: 6 }),
        businessApi.getBusinessOverview()
      ]);

      if (productsRes.data?.products) {
        setAllProducts(productsRes.data.products);
      }

      if (txnsRes.data?.transactions) {
        setRecentTransactions(txnsRes.data.transactions);
      }

      if (overviewRes.data?.summary) setMetrics(overviewRes.data.summary);
    } catch (err: any) {
      setLoadError(err.message || 'Dashboard could not be loaded. Pull down to retry.');
      console.error('Error loading admin dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user || isLoading || user.role !== 'admin') return;
    loadDashboardData();
  }, [user, isLoading, activeShop]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Compute 8 Core Business Summary Cards
  const summaryCards = useMemo(() => {
    return {
      totalProducts: metrics?.products_count ?? 0,
      productsInStock: metrics?.products_in_stock ?? 0,
      lowStockProducts: metrics?.low_stock_products ?? 0,
      outOfStockProducts: metrics?.out_of_stock_products ?? 0,
      totalSales: metrics?.total_revenue ?? 0,
      todaySales: metrics?.today_revenue ?? 0,
      todayOrders: metrics?.total_transactions ?? 0,
      totalSellers: metrics?.active_sellers ?? 0
    };
  }, [metrics]);

  // Low stock products alert items
  const lowStockAlertItems = useMemo(() => {
    return allProducts
      .filter((p) => p.stock_quantity <= p.reorder_level)
      .slice(0, 5);
  }, [allProducts]);

  const unreadAlerts = summaryCards.lowStockProducts + summaryCards.outOfStockProducts;

  return (
    <View style={styles.container}>
      <Header
        title={user?.business_name || 'JM Solution POS'}
        subtitle={activeShop ? `${activeShop.name} (${activeShop.shop_code}) • Dashboard` : 'Business Overview � All shops'}
        leftAction={
          <TouchableOpacity
            onPress={() => setSidebarVisible(true)}
            style={[styles.menuIconBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}
            activeOpacity={0.7}
            accessibilityLabel="Open Navigation Menu"
          >
            <Ionicons name="menu-outline" size={22} color={theme.text} />
          </TouchableOpacity>
        }
        rightAction={
          <TouchableOpacity
            onPress={() => router.push('/admin/notifications' as any)}
            style={[styles.notifHeaderBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={19} color={theme.text} />
            {unreadAlerts > 0 && (
              <View style={[styles.notifBadge, { backgroundColor: theme.danger }]}>
                <Text style={styles.notifBadgeText}>
                  {unreadAlerts > 9 ? '9+' : unreadAlerts}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      {loadError ? <Text style={{ color: theme.danger, padding: 12 }}>{loadError}</Text> : null}
      {/* Subscription Status Notice */}
      <SubscriptionBanner compact />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 40 }} />
        ) : (
          <>
            {/* Quick Action Shortcuts */}
            <View style={styles.shortcutsRow}>
              <TouchableOpacity
                style={[styles.primaryAddBtn, { backgroundColor: theme.primary }]}
                onPress={() => router.push('/admin/add-product' as any)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.primaryAddBtnText}>Add Product</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryShortcutBtn, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
                onPress={() => router.push('/admin/inventory' as any)}
                activeOpacity={0.75}
              >
                <Ionicons name="layers-outline" size={16} color={theme.primary} />
                <Text style={[styles.secondaryShortcutText, { color: theme.text }]}>Stock / Inventory</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryShortcutBtn, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
                onPress={() => router.push('/admin/sellers' as any)}
                activeOpacity={0.75}
              >
                <Ionicons name="people-outline" size={16} color={theme.primary} />
                <Text style={[styles.secondaryShortcutText, { color: theme.text }]}>Sellers</Text>
              </TouchableOpacity>
            </View>

            {/* 8 Business Summary Cards Grid */}
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Business Overview</Text>
              <Text style={[styles.sectionSub, { color: theme.textMuted }]}>Key operating statistics</Text>
            </View>

            <View style={styles.summaryGrid}>
              {/* Card 1: Total Products */}
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
                onPress={() => router.push('/admin/products' as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                  <Ionicons name="pricetags-outline" size={18} color={theme.primary} />
                </View>
                <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Total Products</Text>
                <Text style={[styles.cardValue, { color: theme.text }]}>{summaryCards.totalProducts}</Text>
              </TouchableOpacity>

              {/* Card 2: Products in Stock */}
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
                onPress={() => router.push('/admin/inventory' as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#059669" />
                </View>
                <Text style={[styles.cardLabel, { color: theme.textMuted }]}>In Stock</Text>
                <Text style={[styles.cardValue, { color: '#059669' }]}>{summaryCards.productsInStock}</Text>
              </TouchableOpacity>

              {/* Card 3: Low Stock Products */}
              <TouchableOpacity
                style={[
                  styles.card,
                  { backgroundColor: theme.surface, borderColor: theme.surfaceBorder },
                  summaryCards.lowStockProducts > 0 && { borderColor: '#F59E0B' }
                ]}
                onPress={() => router.push('/admin/inventory' as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                  <Ionicons name="warning-outline" size={18} color="#D97706" />
                </View>
                <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Low Stock</Text>
                <Text style={[styles.cardValue, { color: '#D97706' }]}>{summaryCards.lowStockProducts}</Text>
              </TouchableOpacity>

              {/* Card 4: Out of Stock Products */}
              <TouchableOpacity
                style={[
                  styles.card,
                  { backgroundColor: theme.surface, borderColor: theme.surfaceBorder },
                  summaryCards.outOfStockProducts > 0 && { borderColor: theme.danger }
                ]}
                onPress={() => router.push('/admin/inventory' as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                  <Ionicons name="alert-circle-outline" size={18} color={theme.danger} />
                </View>
                <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Out of Stock</Text>
                <Text style={[styles.cardValue, { color: theme.danger }]}>{summaryCards.outOfStockProducts}</Text>
              </TouchableOpacity>

              {/* Card 5: Today's Sales */}
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
                onPress={() => router.push('/admin/transactions' as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                  <Ionicons name="cash-outline" size={18} color="#059669" />
                </View>
                <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Today's Sales</Text>
                <Text style={[styles.cardValue, { color: '#059669' }]} numberOfLines={1}>
                  {formatCurrency(summaryCards.todaySales, currencySymbol)}
                </Text>
              </TouchableOpacity>

              {/* Card 6: Total Sales */}
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
                onPress={() => router.push('/admin/reports' as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                  <Ionicons name="bar-chart-outline" size={18} color={theme.primary} />
                </View>
                <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Total Revenue</Text>
                <Text style={[styles.cardValue, { color: theme.text }]} numberOfLines={1}>
                  {formatCurrency(summaryCards.totalSales, currencySymbol)}
                </Text>
              </TouchableOpacity>

              {/* Card 7: Total Orders/Transactions */}
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
                onPress={() => router.push('/admin/transactions' as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                  <Ionicons name="receipt-outline" size={18} color="#0284C7" />
                </View>
                <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Total Transactions</Text>
                <Text style={[styles.cardValue, { color: theme.text }]}>{summaryCards.todayOrders}</Text>
              </TouchableOpacity>

              {/* Card 8: Total Sellers/Cashiers */}
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
                onPress={() => router.push('/admin/sellers' as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
                  <Ionicons name="people-outline" size={18} color="#9333EA" />
                </View>
                <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Sellers / Staff</Text>
                <Text style={[styles.cardValue, { color: theme.text }]}>{summaryCards.totalSellers}</Text>
              </TouchableOpacity>
            </View>

            {/* Low Stock Alert Section */}
            <View style={[styles.sectionTitleRow, { marginTop: 20 }]}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Low Stock Alerts</Text>
                <Text style={[styles.sectionSub, { color: theme.textMuted }]}>
                  Products needing inventory replenishment
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/admin/inventory' as any)}
                style={styles.sectionActionBtn}
              >
                <Text style={[styles.sectionActionText, { color: theme.primary }]}>View All →</Text>
              </TouchableOpacity>
            </View>

            {lowStockAlertItems.length === 0 ? (
              <View style={[styles.cleanCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
                <Ionicons name="checkmark-done-circle" size={32} color="#059669" />
                <View style={styles.cleanCardTextCol}>
                  <Text style={[styles.cleanCardTitle, { color: theme.text }]}>All stock levels healthy</Text>
                  <Text style={[styles.cleanCardSub, { color: theme.textMuted }]}>
                    No products have reached their configured low-stock thresholds.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.alertList}>
                {lowStockAlertItems.map((item) => {
                  const isOut = item.stock_quantity <= 0;
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.alertItemCard,
                        { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }
                      ]}
                    >
                      <View style={styles.alertLeft}>
                        <View
                          style={[
                            styles.alertDot,
                            { backgroundColor: isOut ? theme.danger : '#F59E0B' }
                          ]}
                        />
                        <View style={styles.alertMeta}>
                          <Text style={[styles.alertName, { color: theme.text }]} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={[styles.alertSku, { color: theme.textMuted }]}>
                            SKU: {item.id} • {item.category || 'General'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.alertRight}>
                        <View style={styles.stockTextWrap}>
                          <Text
                            style={[
                              styles.alertStockNum,
                              { color: isOut ? theme.danger : '#D97706' }
                            ]}
                          >
                            {isOut ? '0 units (Out of Stock)' : `${item.stock_quantity} left`}
                          </Text>
                          <Text style={[styles.alertMinThreshold, { color: theme.textMuted }]}>
                            Min: {item.reorder_level}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[styles.quickRestockBtn, { backgroundColor: theme.primary }]}
                          onPress={() => {
                            setSelectedRestockProduct(item);
                            setRestockVisible(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="add" size={13} color="#FFFFFF" />
                          <Text style={styles.quickRestockText}>Restock</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Recent Sales / Transactions Section */}
            <View style={[styles.sectionTitleRow, { marginTop: 22 }]}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Sales & Transactions</Text>
                <Text style={[styles.sectionSub, { color: theme.textMuted }]}>
                  Latest completed counter checkouts
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/admin/transactions' as any)}
                style={styles.sectionActionBtn}
              >
                <Text style={[styles.sectionActionText, { color: theme.primary }]}>View Journal →</Text>
              </TouchableOpacity>
            </View>

            {recentTransactions.length === 0 ? (
              <View style={[styles.cleanCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
                <Ionicons name="receipt-outline" size={32} color={theme.textMuted} />
                <View style={styles.cleanCardTextCol}>
                  <Text style={[styles.cleanCardTitle, { color: theme.text }]}>No transactions yet</Text>
                  <Text style={[styles.cleanCardSub, { color: theme.textMuted }]}>
                    New sales completed at the POS counter will appear here immediately.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.txnsList}>
                {recentTransactions.map((txn) => {
                  const paymentIcon =
                    txn.payment_method === 'card'
                      ? 'card-outline'
                      : txn.payment_method === 'mobile_money'
                      ? 'phone-portrait-outline'
                      : 'cash-outline';

                  const dateFormatted = new Date(txn.transaction_date).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <TouchableOpacity
                      key={txn.id}
                      style={[styles.txnCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
                      onPress={() => {
                        setSelectedTxn(txn);
                        setReceiptVisible(true);
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={styles.txnLeft}>
                        <View style={[styles.txnIconCircle, { backgroundColor: theme.surfaceLight }]}>
                          <Ionicons name={paymentIcon} size={16} color={theme.primary} />
                        </View>
                        <View style={styles.txnMeta}>
                          <Text style={[styles.txnId, { color: theme.text }]} numberOfLines={1}>
                            {txn.id}
                          </Text>
                          <Text style={[styles.txnSeller, { color: theme.textMuted }]}>
                            Seller: {txn.seller_name || 'Cashier'} • {dateFormatted}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.txnRight}>
                        <Text style={[styles.txnAmount, { color: theme.text }]}>
                          {formatCurrency(txn.total_amount, currencySymbol)}
                        </Text>
                        <View style={[styles.paymentMethodPill, { backgroundColor: theme.surfaceLight }]}>
                          <Text style={[styles.paymentMethodText, { color: theme.textSecondary }]}>
                            {txn.payment_method.replace('_', ' ').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Restock Modal */}
      <RestockModal
        visible={restockVisible}
        product={selectedRestockProduct}
        onClose={() => setRestockVisible(false)}
        onSuccess={loadDashboardData}
      />

      {/* Receipt Details Modal */}
      <ReceiptModal
        visible={receiptVisible}
        transaction={selectedTxn}
        onClose={() => setReceiptVisible(false)}
      />

      {/* Admin Slide-out Sidebar */}
      <AdminSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        unreadNotificationsCount={unreadAlerts}
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
    notifHeaderBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    notifBadge: {
      position: 'absolute',
      top: -3,
      right: -3,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    notifBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 80,
    },
    shortcutsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 18,
    },
    primaryAddBtn: {
      flex: 1.2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      ...theme.shadow,
    },
    primaryAddBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    secondaryShortcutBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    secondaryShortcutText: {
      fontSize: 12,
      fontWeight: '600',
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    sectionSub: {
      fontSize: 11,
      marginTop: 2,
    },
    sectionActionBtn: {
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    sectionActionText: {
      fontSize: 12,
      fontWeight: '700',
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 8,
    },
    card: {
      width: '48.5%',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      ...theme.shadow,
    },
    cardIconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    cardLabel: {
      fontSize: 11,
      fontWeight: '600',
      marginBottom: 2,
    },
    cardValue: {
      fontSize: 16,
      fontWeight: '800',
    },
    cleanCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      gap: 12,
      marginBottom: 8,
    },
    cleanCardTextCol: {
      flex: 1,
    },
    cleanCardTitle: {
      fontSize: 13,
      fontWeight: '700',
    },
    cleanCardSub: {
      fontSize: 11,
      marginTop: 2,
    },
    alertList: {
      gap: 8,
      marginBottom: 8,
    },
    alertItemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    alertLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      marginRight: 8,
    },
    alertDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    alertMeta: {
      flex: 1,
    },
    alertName: {
      fontSize: 13,
      fontWeight: '700',
    },
    alertSku: {
      fontSize: 10,
      marginTop: 1,
    },
    alertRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    stockTextWrap: {
      alignItems: 'flex-end',
    },
    alertStockNum: {
      fontSize: 12,
      fontWeight: '800',
    },
    alertMinThreshold: {
      fontSize: 9,
      marginTop: 1,
    },
    quickRestockBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 6,
    },
    quickRestockText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    txnsList: {
      gap: 8,
      marginBottom: 16,
    },
    txnCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    txnLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      marginRight: 8,
    },
    txnIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    txnMeta: {
      flex: 1,
    },
    txnId: {
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'monospace',
    },
    txnSeller: {
      fontSize: 10,
      marginTop: 2,
    },
    txnRight: {
      alignItems: 'flex-end',
    },
    txnAmount: {
      fontSize: 13,
      fontWeight: '800',
    },
    paymentMethodPill: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 2,
    },
    paymentMethodText: {
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
  });
