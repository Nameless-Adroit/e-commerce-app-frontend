import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { analyticsApi, shopApi } from '../../services/api';
import { theme } from '../../theme/colors';
import { GlobalSummary, DailyReport, Shop } from '../../types';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [globalSummary, setGlobalSummary] = useState<GlobalSummary | null>(null);
  const [shopBreakdown, setShopBreakdown] = useState<DailyReport[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);

  const loadData = async () => {
    try {
      const [analyticsRes, shopsRes] = await Promise.all([
        analyticsApi.getDailyReport(),
        shopApi.getAllShops()
      ]);

      if (analyticsRes.data) {
        if ('global_summary' in analyticsRes.data) {
          setGlobalSummary(analyticsRes.data.global_summary);
          setShopBreakdown(analyticsRes.data.shop_breakdown || []);
        }
      }

      if (shopsRes.data?.shops) {
        setShops(shopsRes.data.shops);
      }
    } catch (err: any) {
      console.error('Failed to load super admin data:', err);
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
      <Header title="Platform Overseer" subtitle="Global Multi-Store Administration" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Fetching system-wide metrics...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scroll} 
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        >
          {/* Action Shortcut Bar */}
          <View style={styles.shortcutRow}>
            <TouchableOpacity 
              style={[styles.shortcutBtn, { borderColor: theme.primary }]}
              onPress={() => router.push('/super-admin/shops' as any)}
            >
              <Ionicons name="business" size={20} color={theme.primary} />
              <Text style={styles.shortcutText}>Manage Shops</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.shortcutBtn, { borderColor: theme.secondary }]}
              onPress={() => router.push('/super-admin/users' as any)}
            >
              <Ionicons name="people" size={20} color={theme.secondary} />
              <Text style={styles.shortcutText}>User Accounts</Text>
            </TouchableOpacity>
          </View>

          {/* Section: Today's Global Performance */}
          <Text style={styles.sectionHeader}>Today's Cross-Shop Performance</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="cash-outline" size={22} color={theme.accent} />
              </View>
              <Text style={styles.statLabel}>Total Revenue</Text>
              <Text style={styles.statValue}>
                ${Number(globalSummary?.total_revenue || 0).toFixed(2)}
              </Text>
              <Text style={styles.statSub}>Profit: ${Number(globalSummary?.total_net_profit || 0).toFixed(2)}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <Ionicons name="cube-outline" size={22} color={theme.primary} />
              </View>
              <Text style={styles.statLabel}>Units Sold Today</Text>
              <Text style={styles.statValue}>{globalSummary?.total_units_sold || 0}</Text>
              <Text style={styles.statSub}>{globalSummary?.total_transactions || 0} Transactions</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Ionicons name="trending-down-outline" size={22} color={theme.danger} />
              </View>
              <Text style={styles.statLabel}>Global Shrinkage</Text>
              <Text style={[styles.statValue, { color: theme.danger }]}>
                {globalSummary?.total_shrinkage_count || 0} units
              </Text>
              <Text style={styles.statSub}>Cost: ${Number(globalSummary?.total_shrinkage_cost || 0).toFixed(2)}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
                <Ionicons name="storefront-outline" size={22} color={theme.secondary} />
              </View>
              <Text style={styles.statLabel}>Active Businesses</Text>
              <Text style={styles.statValue}>{shops.length}</Text>
              <Text style={styles.statSub}>{globalSummary?.reporting_shops || shops.length} Reporting</Text>
            </View>
          </View>

          {/* Section: Independent Store Breakdown */}
          <View style={styles.tableHeaderRow}>
            <Text style={styles.sectionHeader}>Store Breakdown & Status</Text>
            <TouchableOpacity onPress={() => router.push('/super-admin/shops' as any)}>
              <Text style={styles.linkText}>View All Shops →</Text>
            </TouchableOpacity>
          </View>

          {shops.map((shop) => {
            const report = shopBreakdown.find((r) => r.shop_id === shop.id);
            return (
              <TouchableOpacity 
                key={shop.id} 
                style={styles.shopCard}
                onPress={() => router.push('/super-admin/shops' as any)}
              >
                <View style={styles.shopCardHeader}>
                  <View style={styles.shopInfo}>
                    <Text style={styles.shopName}>{shop.name}</Text>
                    <Text style={styles.shopCode}>Code: {shop.shop_code} • Staff: {shop.staff_count || 0}</Text>
                  </View>
                  <View style={styles.shopBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={theme.accent} />
                    <Text style={styles.shopBadgeText}>Active</Text>
                  </View>
                </View>

                <View style={styles.shopStatsRow}>
                  <View style={styles.shopStatItem}>
                    <Text style={styles.miniLabel}>Today Revenue</Text>
                    <Text style={styles.miniValue}>${Number(report?.revenue_generated || 0).toFixed(2)}</Text>
                  </View>
                  <View style={styles.shopStatItem}>
                    <Text style={styles.miniLabel}>Units Sold</Text>
                    <Text style={styles.miniValue}>{report?.total_units_sold || 0}</Text>
                  </View>
                  <View style={styles.shopStatItem}>
                    <Text style={styles.miniLabel}>Stock on Hand</Text>
                    <Text style={styles.miniValue}>{shop.total_units_in_stock || 0} units</Text>
                  </View>
                  <View style={styles.shopStatItem}>
                    <Text style={styles.miniLabel}>Shrinkage</Text>
                    <Text style={[styles.miniValue, { color: (report?.shrinkage_count || 0) > 0 ? theme.danger : theme.textSecondary }]}>
                      {report?.shrinkage_count || 0}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: theme.textSecondary,
    fontSize: 14,
    marginTop: 12
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  shortcutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: 12
  },
  shortcutText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '600'
  },
  sectionHeader: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12
  },
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8
  },
  linkText: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '600'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.lg,
    padding: 16
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  statLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '500'
  },
  statValue: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '800',
    marginVertical: 4
  },
  statSub: {
    color: theme.textMuted,
    fontSize: 11
  },
  shopCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 12
  },
  shopCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  shopInfo: {
    flex: 1
  },
  shopName: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700'
  },
  shopCode: {
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: 2
  },
  shopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full
  },
  shopBadgeText: {
    color: theme.accent,
    fontSize: 11,
    fontWeight: '600'
  },
  shopStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.surfaceLight,
    padding: 10,
    borderRadius: theme.radius.md
  },
  shopStatItem: {
    alignItems: 'center'
  },
  miniLabel: {
    color: theme.textMuted,
    fontSize: 10
  },
  miniValue: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2
  }
});
