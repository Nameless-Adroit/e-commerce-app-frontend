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
import { analyticsApi, productApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useStyles } from '../../context/ThemeContext';
import { AppTheme } from '../../theme/colors';
import { DailyReport, Product } from '../../types';
import { formatCurrency } from '../../utils/currency';

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [totalProductsCount, setTotalProductsCount] = useState<number>(0);

  const loadData = async () => {
    try {
      const [reportRes, productsRes] = await Promise.all([
        analyticsApi.getDailyReport(),
        productApi.listProducts({ low_stock: true, limit: 5 })
      ]);

      if (reportRes.data && !('global_summary' in reportRes.data)) {
        setDailyReport(reportRes.data as DailyReport);
      }

      if (productsRes.data) {
        setLowStockProducts(productsRes.data.products || []);
        setTotalProductsCount(productsRes.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error loading admin dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <View style={styles.container}>
      <Header title="Shop Management" subtitle={user?.shop_name || 'Store Operations'} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView 
          style={styles.scroll} 
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        >
          {/* Quick Action Navigation Grid */}
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderColor: theme.primary }]}
              onPress={() => router.push('/admin/add-product' as any)}
            >
              <Ionicons name="add-circle" size={26} color={theme.primary} />
              <Text style={styles.actionTitle}>New Item</Text>
              <Text style={styles.actionSub}>Product ID</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: 'rgba(234, 88, 12, 0.12)', borderColor: '#f97316' }]}
              onPress={() => router.push('/admin/transactions' as any)}
            >
              <Ionicons name="receipt" size={26} color="#f97316" />
              <Text style={styles.actionTitle}>Transactions</Text>
              <Text style={styles.actionSub}>Sales History</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: 'rgba(14, 165, 233, 0.12)', borderColor: theme.secondary }]}
              onPress={() => router.push('/admin/products' as any)}
            >
              <Ionicons name="pricetags" size={26} color={theme.secondary} />
              <Text style={styles.actionTitle}>Inventory</Text>
              <Text style={styles.actionSub}>Restock</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: theme.accent }]}
              onPress={() => router.push('/admin/analytics' as any)}
            >
              <Ionicons name="bar-chart" size={26} color={theme.accent} />
              <Text style={styles.actionTitle}>Daily Close</Text>
              <Text style={styles.actionSub}>Audit</Text>
            </TouchableOpacity>
          </View>

          {/* Today's Metrics Card */}
          <Text style={styles.sectionTitle}>Today's Business Summary</Text>
          <View style={styles.metricsCard}>
            <View style={styles.metricRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Total Revenue</Text>
                <Text style={[styles.metricValue, { color: theme.accent }]}>
                  {formatCurrency(dailyReport?.revenue_generated || 0)}
                </Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>{Number(dailyReport?.net_profit || 0) < 0 ? 'Net Loss' : 'Net Profit'}</Text>
                <Text style={[
                  styles.metricValue,
                  { color: Number(dailyReport?.net_profit || 0) < 0 ? theme.danger : theme.secondary }
                ]}>
                  {Number(dailyReport?.net_profit || 0) < 0 ? '-' : ''}{formatCurrency(Math.abs(Number(dailyReport?.net_profit || 0)))}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.metricRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Units Sold Today</Text>
                <Text style={styles.metricValue}>{dailyReport?.total_units_sold || 0}</Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Inventory Shrinkage</Text>
                <Text style={[styles.metricValue, { color: (dailyReport?.shrinkage_count || 0) > 0 ? theme.danger : theme.textMuted }]}>
                  {dailyReport?.shrinkage_count || 0} units ({formatCurrency(dailyReport?.shrinkage_cost || 0)})
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.journalLinkBtn}
              onPress={() => router.push('/admin/transactions' as any)}
            >
              <View style={styles.journalLinkLeft}>
                <Ionicons name="receipt-outline" size={16} color={theme.primary} />
                <Text style={styles.journalLinkText}>
                  Audit Today's Sales Journal ({dailyReport?.total_transactions || 0} transactions)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* Low Stock Alerts */}
          <View style={styles.alertHeader}>
            <View style={styles.alertTitleRow}>
              <Ionicons name="warning-outline" size={20} color={theme.warning} />
              <Text style={styles.alertTitle}>Low Stock Restock Alerts</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/admin/products' as any)}>
              <Text style={styles.linkText}>View Catalog →</Text>
            </TouchableOpacity>
          </View>

          {lowStockProducts.length === 0 ? (
            <View style={styles.emptyAlertBox}>
              <Ionicons name="checkmark-circle-outline" size={24} color={theme.accent} />
              <Text style={styles.emptyAlertText}>All products are well above reorder levels.</Text>
            </View>
          ) : (
            lowStockProducts.map((p) => (
              <View key={p.id} style={styles.alertCard}>
                <View style={styles.alertCardLeft}>
                  <Text style={styles.alertProductName}>{p.name}</Text>
                  <Text style={styles.alertProductId}>ID: {p.id}</Text>
                  <Text style={styles.stockStatus}>
                    In Stock: <Text style={{ color: theme.danger, fontWeight: '700' }}>{p.stock_quantity}</Text> (Threshold: {p.reorder_level})
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.restockQuickBtn}
                  onPress={() => router.push('/admin/products' as any)}
                >
                  <Text style={styles.restockQuickText}>Restock</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 40
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20
  },
  actionCard: {
    width: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1
  },
  actionTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8
  },
  actionSub: {
    color: theme.textSecondary,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center'
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10
  },
  metricsCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.lg,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metricItem: {
    flex: 1
  },
  metricLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '500'
  },
  metricValue: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4
  },
  divider: {
    height: 1,
    backgroundColor: theme.surfaceBorder,
    marginVertical: 14
  },
  journalLinkBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 14
  },
  journalLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  journalLinkText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '700'
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  alertTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700'
  },
  linkText: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '600'
  },
  emptyAlertBox: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.md,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  emptyAlertText: {
    color: theme.textSecondary,
    fontSize: 13
  },
  alertCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  alertCardLeft: {
    flex: 1,
    paddingRight: 10
  },
  alertProductName: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700'
  },
  alertProductId: {
    color: theme.primary,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2
  },
  stockStatus: {
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 4
  },
  restockQuickBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm
  },
  restockQuickText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  }
});
