import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { RestockModal } from '../../components/RestockModal';
import { AdminSidebar } from '../../components/AdminSidebar';
import { analyticsApi, productApi } from '../../services/api';
import { useTheme, useStyles } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AppTheme } from '../../theme/colors';
import { ProductsSoldReportResponse, Product, ProductSoldReportItem } from '../../types';
import { formatCurrency } from '../../utils/currency';

type TimeFilter = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL_TIME';

export default function AdminReportsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, isLoading, activeShop, currencySymbol } = useAuth();
  const styles = useStyles(createStyles);

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('THIS_MONTH');
  const [reportData, setReportData] = useState<ProductsSoldReportResponse | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [restockVisible, setRestockVisible] = useState(false);

  const computeDateRange = (filter: TimeFilter): { startDate?: string; endDate?: string } => {
    const today = new Date();
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const endDate = formatDate(today);

    if (filter === 'TODAY') {
      return { startDate: endDate, endDate };
    }

    if (filter === 'THIS_WEEK') {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      return { startDate: formatDate(start), endDate };
    }

    if (filter === 'THIS_MONTH') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: formatDate(start), endDate };
    }

    return {};
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = computeDateRange(timeFilter);
      const [salesRes, lowStockRes] = await Promise.all([
        analyticsApi.getProductsSoldReport({ startDate, endDate }),
        productApi.listProducts({ low_stock: true, limit: 10 })
      ]);

      if (salesRes.data) {
        setReportData(salesRes.data);
      }
      if (lowStockRes.data?.products) {
        setLowStockProducts(lowStockRes.data.products);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user || isLoading || user.role !== 'admin') return;
    loadReport();
  }, [user, isLoading, timeFilter, activeShop]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReport();
  };

  const products = reportData?.products || [];
  const summary = reportData?.summary || {
    distinct_products_sold: 0,
    total_units_sold: 0,
    total_revenue: 0,
    total_estimated_profit: 0
  };

  // Find max units sold for relative percentage progress bar
// Updated maxUnits calculation using total_quantity_sold
  const maxUnits = products.length > 0 ? Math.max(...products.map((p) => p.total_quantity_sold)) : 1;

  return (
    <View style={styles.container}>
      <Header
        title="Business Reports"
        subtitle={activeShop ? `${activeShop.name} • Sales & Inventory Insights` : 'Performance Overview'}
        leftAction={
          <TouchableOpacity
            onPress={() => setSidebarVisible(true)}
            style={[styles.menuIconBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}
            activeOpacity={0.7}
          >
            <Ionicons name="menu-outline" size={22} color={theme.text} />
          </TouchableOpacity>
        }
      />

      {/* Time Period Filter Chips */}
      <View style={[styles.filterBar, { backgroundColor: theme.surface, borderBottomColor: theme.surfaceBorder }]}>
        <View style={[styles.filterTabsWrapper, { backgroundColor: theme.surfaceLight }]}>
          {[
            { key: 'TODAY', label: 'Daily Sales' },
            { key: 'THIS_WEEK', label: 'Weekly' },
            { key: 'THIS_MONTH', label: 'Monthly' },
            { key: 'ALL_TIME', label: 'All Time' },
          ].map((item) => {
            const active = timeFilter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.filterTab,
                  active && { backgroundColor: theme.surface, ...theme.shadow }
                ]}
                onPress={() => setTimeFilter(item.key as TimeFilter)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    { color: active ? theme.primary : theme.textMuted },
                    active && { fontWeight: '700' }
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 40 }} />
        ) : (
          <>
            {/* Key Summary Metric Cards */}
            <View style={styles.kpiGrid}>
              <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
                <View style={[styles.kpiIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                  <Ionicons name="cash-outline" size={20} color="#059669" />
                </View>
                <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>
                  {timeFilter === 'TODAY' ? "Today's Sales" : timeFilter === 'THIS_WEEK' ? 'Weekly Sales' : 'Total Revenue'}
                </Text>
                <Text style={[styles.kpiValue, { color: theme.text }]}>
                  {formatCurrency(summary.total_revenue, currencySymbol)}
                </Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
                <View style={[styles.kpiIconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                  <Ionicons name="cube-outline" size={20} color={theme.primary} />
                </View>
                <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Units Sold</Text>
                <Text style={[styles.kpiValue, { color: theme.text }]}>
                  {summary.total_units_sold} <Text style={[styles.kpiSubUnit, { color: theme.textMuted }]}>items</Text>
                </Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
                <View style={[styles.kpiIconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                  <Ionicons name="pricetags-outline" size={20} color="#0284C7" />
                </View>
                <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Distinct SKUs</Text>
                <Text style={[styles.kpiValue, { color: theme.text }]}>
                  {summary.distinct_products_sold}
                </Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
                <View style={[styles.kpiIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                  <Ionicons name="trending-up-outline" size={20} color="#D97706" />
                </View>
                <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>Est. Gross Profit</Text>
                <Text style={[styles.kpiValue, { color: '#D97706' }]}>
                  {formatCurrency((summary as any).total_estimated_profit || 0, currencySymbol)}
                </Text>
              </View>
            </View>

            {/* Best-Selling Products Section */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Best-Selling Products</Text>
                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                  Ranked by sales volume for selected period
                </Text>
              </View>
            </View>

            {products.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
                <Ionicons name="cart-outline" size={36} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  No sales recorded for this timeframe.
                </Text>
              </View>
            ) : (
              <View style={styles.bestSellersList}>
                {products.map((p, index) => {
                  const percentage = Math.round((p.total_quantity_sold / maxUnits) * 100);
                  const rankColors = ['#F59E0B', '#94A3B8', '#B45309'];
                  const isTopThree = index < 3;

                  return (
                    <View
                      key={p.product_id}
                      style={[styles.productRankCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
                    >
                      <View style={styles.rankHeaderRow}>
                        <View style={styles.rankLeft}>
                          <View
                            style={[
                              styles.rankBadge,
                              { backgroundColor: isTopThree ? rankColors[index] : theme.surfaceLight }
                            ]}
                          >
                            <Text
                              style={[
                                styles.rankBadgeText,
                                { color: isTopThree ? '#FFFFFF' : theme.text }
                              ]}
                            >
                              #{index + 1}
                            </Text>
                          </View>
                          <View style={styles.nameMetaCol}>
                            <Text style={[styles.productRankName, { color: theme.text }]} numberOfLines={1}>
                              {p.name}
                            </Text>
                            <Text style={[styles.productRankCategory, { color: theme.textMuted }]}>
                              {p.category || 'General'} • SKU: {p.product_id}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.rankRight}>
                          <Text style={[styles.rankRevenue, { color: theme.primary }]}>
                            {formatCurrency(p.total_revenue, currencySymbol)}
                          </Text>
                          <Text style={[styles.rankUnits, { color: theme.textSecondary }]}>
                            {p.total_quantity_sold} {p.total_quantity_sold === 1 ? 'unit' : 'units'} sold
                          </Text>
                        </View>
                      </View>

                      {/* Visual Sales Progress Bar */}
                      <View style={[styles.progressBarTrack, { backgroundColor: theme.surfaceLight }]}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${Math.max(percentage, 6)}%`,
                              backgroundColor: isTopThree ? theme.primary : '#38BDF8'
                            }
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Low-Stock Products Section */}
            <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Low-Stock Products Alert</Text>
                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                  Inventory items reaching or below reorder threshold
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/admin/inventory' as any)}
                style={styles.viewInventoryBtn}
              >
                <Text style={[styles.viewInventoryText, { color: theme.primary }]}>View All →</Text>
              </TouchableOpacity>
            </View>

            {lowStockProducts.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
                <Ionicons name="checkmark-circle-outline" size={36} color="#059669" />
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  All catalog inventory is currently well-stocked.
                </Text>
              </View>
            ) : (
              <View style={styles.lowStockList}>
                {lowStockProducts.slice(0, 5).map((item) => {
                  const isOut = item.stock_quantity <= 0;
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.lowStockCard,
                        { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }
                      ]}
                    >
                      <View style={styles.lowStockLeft}>
                        <View
                          style={[
                            styles.lowStockDot,
                            { backgroundColor: isOut ? theme.danger : '#F59E0B' }
                          ]}
                        />
                        <View style={styles.lowStockInfo}>
                          <Text style={[styles.lowStockName, { color: theme.text }]} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={[styles.lowStockMeta, { color: theme.textMuted }]}>
                            SKU: {item.id} • Min: {item.reorder_level}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.lowStockRight}>
                        <Text
                          style={[
                            styles.lowStockCount,
                            { color: isOut ? theme.danger : '#D97706' }
                          ]}
                        >
                          {isOut ? 'Out of stock' : `${item.stock_quantity} left`}
                        </Text>
                        <TouchableOpacity
                          style={[styles.quickRestockBtn, { backgroundColor: theme.primary }]}
                          onPress={() => {
                            setSelectedProduct(item);
                            setRestockVisible(true);
                          }}
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
          </>
        )}
      </ScrollView>

      {/* Restock Modal */}
      <RestockModal
        visible={restockVisible}
        product={selectedProduct}
        onClose={() => setRestockVisible(false)}
        onSuccess={loadReport}
      />

      {/* Admin Slide-out Sidebar */}
      <AdminSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        unreadNotificationsCount={lowStockProducts.length}
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
    filterBar: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    filterTabsWrapper: {
      flexDirection: 'row',
      borderRadius: 10,
      padding: 3,
    },
    filterTab: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },
    filterTabText: {
      fontSize: 11,
      fontWeight: '600',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 80,
    },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 20,
    },
    kpiCard: {
      width: '48.5%',
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      ...theme.shadow,
    },
    kpiIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    kpiLabel: {
      fontSize: 11,
      fontWeight: '600',
      marginBottom: 2,
    },
    kpiValue: {
      fontSize: 17,
      fontWeight: '800',
    },
    kpiSubUnit: {
      fontSize: 12,
      fontWeight: '500',
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    sectionSubtitle: {
      fontSize: 11,
      marginTop: 2,
    },
    viewInventoryBtn: {
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    viewInventoryText: {
      fontSize: 12,
      fontWeight: '700',
    },
    emptyBox: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      borderRadius: 12,
      borderWidth: 1,
      gap: 8,
    },
    emptyText: {
      fontSize: 13,
      fontWeight: '500',
    },
    bestSellersList: {
      gap: 8,
    },
    productRankCard: {
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      ...theme.shadow,
    },
    rankHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    rankLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 10,
      gap: 10,
    },
    rankBadge: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    nameMetaCol: {
      flex: 1,
    },
    productRankName: {
      fontSize: 13,
      fontWeight: '700',
    },
    productRankCategory: {
      fontSize: 10,
      marginTop: 1,
    },
    rankRight: {
      alignItems: 'flex-end',
    },
    rankRevenue: {
      fontSize: 13,
      fontWeight: '800',
    },
    rankUnits: {
      fontSize: 10,
      marginTop: 1,
    },
    progressBarTrack: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    lowStockList: {
      gap: 8,
    },
    lowStockCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    lowStockLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      marginRight: 8,
    },
    lowStockDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    lowStockInfo: {
      flex: 1,
    },
    lowStockName: {
      fontSize: 13,
      fontWeight: '700',
    },
    lowStockMeta: {
      fontSize: 10,
      marginTop: 1,
    },
    lowStockRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    lowStockCount: {
      fontSize: 12,
      fontWeight: '800',
    },
    quickRestockBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 6,
    },
    quickRestockText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
  });
