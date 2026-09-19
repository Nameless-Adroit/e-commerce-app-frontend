import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator, 
  RefreshControl,
  Alert,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { ShopSelectorModal } from '../../components/ShopSelectorModal';
import { analyticsApi, productApi, shopApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useStyles } from '../../context/ThemeContext';
import { AppTheme } from '../../theme/colors';
import { DailyReport, Product, Shop } from '../../types';
import { formatCurrency } from '../../utils/currency';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, activeShop, availableShops, setActiveShop, refreshShops, currencySymbol } = useAuth();
  const { theme } = useTheme();
  const styles = useStyles(createStyles);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [shopSelectorVisible, setShopSelectorVisible] = useState(false);

  // Create Shop Modal state
  const [createShopModalVisible, setCreateShopModalVisible] = useState(false);
  const [newShopCode, setNewShopCode] = useState('');
  const [newShopName, setNewShopName] = useState('');
  const [newShopAddress, setNewShopAddress] = useState('');
  const [newShopPhone, setNewShopPhone] = useState('');
  const [creatingShop, setCreatingShop] = useState(false);

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
  }, [activeShop]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshShops();
    await loadData();
    setRefreshing(false);
  };

  const handleCreateShop = async () => {
    if (!newShopCode.trim() || !newShopName.trim()) {
      Alert.alert('Missing Fields', 'Please enter a shop code (e.g. SHP03) and shop name.');
      return;
    }

    setCreatingShop(true);
    try {
      const res = await shopApi.createShop({
        shop_code: newShopCode.trim().toUpperCase(),
        name: newShopName.trim(),
        address: newShopAddress.trim() || undefined,
        phone: newShopPhone.trim() || undefined,
        currency_code: user?.business_currency || 'TZS'
      });

      Alert.alert('Shop Created', `Store '${newShopName}' has been added to ${user?.business_name || 'your business'}.`);
      setNewShopCode('');
      setNewShopName('');
      setNewShopAddress('');
      setNewShopPhone('');
      setCreateShopModalVisible(false);
      await refreshShops();
    } catch (err: any) {
      Alert.alert('Creation Failed', err.message || 'Could not create new shop.');
    } finally {
      setCreatingShop(false);
    }
  };

  const handleSwitchAndOpenPOS = async (shop: Shop) => {
    await setActiveShop(shop);
    router.push('/seller' as any);
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Admin Management" 
        subtitle={user?.business_name ? `${user.business_name} (${user.business_code || 'BIZ'})` : 'Store Operations'} 
      />

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
          {/* Business Information Card */}
          <View style={styles.businessHeaderCard}>
            <View style={styles.businessHeaderTop}>
              <View style={[styles.businessBadge, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="business" size={24} color={theme.primary} />
              </View>
              <View style={styles.businessDetails}>
                <Text style={styles.businessName}>{user?.business_name || 'Business Enterprise'}</Text>
                <View style={styles.businessMetaRow}>
                  <Text style={styles.businessCodeBadge}>Code: {user?.business_code || 'BIZ'}</Text>
                  <Text style={styles.businessCurrencyBadge}>
                    Currency: {user?.business_currency || 'TZS'} ({currencySymbol})
                  </Text>
                </View>
              </View>
            </View>

            {/* Active Shop Context Banner */}
            <View style={styles.activeShopBanner}>
              <View style={styles.activeShopLeft}>
                <Ionicons name="storefront-outline" size={18} color={theme.primary} />
                <View>
                  <Text style={styles.activeShopLabel}>Active Store Context:</Text>
                  <Text style={styles.activeShopName}>
                    {activeShop ? `${activeShop.name} (${activeShop.shop_code})` : 'No store selected'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.switchShopBtn} 
                onPress={() => setShopSelectorVisible(true)}
              >
                <Ionicons name="swap-horizontal" size={14} color="#fff" />
                <Text style={styles.switchShopBtnText}>Switch</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Action Navigation Grid */}
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: theme.accent }]}
              onPress={() => router.push('/seller' as any)}
            >
              <Ionicons name="barcode" size={26} color={theme.accent} />
              <Text style={styles.actionTitle}>POS Register</Text>
              <Text style={styles.actionSub}>Sell in {activeShop?.shop_code || 'Store'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderColor: theme.primary }]}
              onPress={() => router.push('/admin/add-product' as any)}
            >
              <Ionicons name="add-circle" size={26} color={theme.primary} />
              <Text style={styles.actionTitle}>New Item</Text>
              <Text style={styles.actionSub}>Add Product</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: 'rgba(14, 165, 233, 0.12)', borderColor: theme.secondary }]}
              onPress={() => router.push('/admin/products' as any)}
            >
              <Ionicons name="pricetags" size={26} color={theme.secondary} />
              <Text style={styles.actionTitle}>Inventory</Text>
              <Text style={styles.actionSub}>Stock & Pricing</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: 'rgba(234, 88, 12, 0.12)', borderColor: '#f97316' }]}
              onPress={() => router.push('/admin/transactions' as any)}
            >
              <Ionicons name="receipt" size={26} color="#f97316" />
              <Text style={styles.actionTitle}>Journal</Text>
              <Text style={styles.actionSub}>Audit History</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: 'rgba(139, 92, 246, 0.12)', borderColor: '#8b5cf6' }]}
              onPress={() => router.push('/admin/analytics' as any)}
            >
              <Ionicons name="bar-chart" size={26} color="#8b5cf6" />
              <Text style={styles.actionTitle}>Daily Close</Text>
              <Text style={styles.actionSub}>Reconciliation</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderColor: '#3b82f6' }]}
              onPress={() => setCreateShopModalVisible(true)}
            >
              <Ionicons name="storefront" size={26} color="#3b82f6" />
              <Text style={styles.actionTitle}>+ Add Shop</Text>
              <Text style={styles.actionSub}>New Branch</Text>
            </TouchableOpacity>
          </View>

          {/* Business Shops / Outlets Section */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="business-outline" size={20} color={theme.primary} />
              <Text style={styles.sectionTitle}>
                Business Stores ({availableShops.length})
              </Text>
            </View>
            <TouchableOpacity onPress={() => setCreateShopModalVisible(true)}>
              <Text style={styles.linkText}>+ New Store</Text>
            </TouchableOpacity>
          </View>

          {availableShops.map((shop) => {
            const isActive = activeShop?.id === shop.id;
            return (
              <View 
                key={shop.id} 
                style={[
                  styles.shopCard, 
                  isActive && { borderColor: theme.primary, borderWidth: 1.5 }
                ]}
              >
                <View style={styles.shopCardContent}>
                  <View style={styles.shopCardLeft}>
                    <View style={styles.shopTitleRow}>
                      <Text style={styles.shopCardName}>{shop.name}</Text>
                      {isActive && (
                        <View style={[styles.activeBadge, { backgroundColor: theme.primary }]}>
                          <Text style={styles.activeBadgeText}>ACTIVE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.shopCardCode}>Code: {shop.shop_code}</Text>
                    {shop.address && (
                      <Text style={styles.shopCardAddress}>📍 {shop.address}</Text>
                    )}
                    {shop.phone && (
                      <Text style={styles.shopCardPhone}>📞 {shop.phone}</Text>
                    )}
                  </View>
                  <View style={styles.shopCardActions}>
                    {!isActive ? (
                      <TouchableOpacity 
                        style={styles.selectShopBtn}
                        onPress={() => setActiveShop(shop)}
                      >
                        <Text style={styles.selectShopBtnText}>Select</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.openPosQuickBtn, { backgroundColor: theme.accent }]}
                        onPress={() => router.push('/seller' as any)}
                      >
                        <Ionicons name="cart-outline" size={14} color="#fff" />
                        <Text style={styles.openPosQuickText}>Register</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

          {/* Today's Active Store Summary Card */}
          <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="stats-chart-outline" size={20} color={theme.accent} />
              <Text style={styles.sectionTitle}>
                Today's Store Summary ({activeShop?.shop_code || 'Store'})
              </Text>
            </View>
          </View>

          <View style={styles.metricsCard}>
            <View style={styles.metricRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Total Revenue</Text>
                <Text style={[styles.metricValue, { color: theme.accent }]}>
                  {formatCurrency(dailyReport?.revenue_generated || 0, currencySymbol)}
                </Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>{Number(dailyReport?.net_profit || 0) < 0 ? 'Net Loss' : 'Net Profit'}</Text>
                <Text style={[
                  styles.metricValue,
                  { color: Number(dailyReport?.net_profit || 0) < 0 ? theme.danger : theme.secondary }
                ]}>
                  {Number(dailyReport?.net_profit || 0) < 0 ? '-' : ''}{formatCurrency(Math.abs(Number(dailyReport?.net_profit || 0)), currencySymbol)}
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
                  {dailyReport?.shrinkage_count || 0} units ({formatCurrency(dailyReport?.shrinkage_cost || 0, currencySymbol)})
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
              <Text style={styles.alertTitle}>Low Stock Restock Alerts ({activeShop?.shop_code || 'Store'})</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/admin/products' as any)}>
              <Text style={styles.linkText}>View Catalog →</Text>
            </TouchableOpacity>
          </View>

          {lowStockProducts.length === 0 ? (
            <View style={styles.emptyAlertBox}>
              <Ionicons name="checkmark-circle-outline" size={24} color={theme.accent} />
              <Text style={styles.emptyAlertText}>All products in this store are well above reorder levels.</Text>
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

      {/* Shop Selector Modal */}
      <ShopSelectorModal
        visible={shopSelectorVisible}
        onClose={() => setShopSelectorVisible(false)}
      />

      {/* Create Shop Modal */}
      <Modal visible={createShopModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons name="storefront" size={22} color={theme.primary} />
                <Text style={styles.modalTitle}>Add New Branch Shop</Text>
              </View>
              <TouchableOpacity onPress={() => setCreateShopModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Create a new physical retail shop under {user?.business_name || 'your business'}.
            </Text>

            <Text style={styles.inputLabel}>Shop Code *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. SHP03, ARUSHA01"
              placeholderTextColor={theme.textMuted}
              value={newShopCode}
              onChangeText={setNewShopCode}
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Store / Shop Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Arusha Clock Tower Branch"
              placeholderTextColor={theme.textMuted}
              value={newShopName}
              onChangeText={setNewShopName}
            />

            <Text style={styles.inputLabel}>Physical Address (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Clock Tower Roundabout, Arusha"
              placeholderTextColor={theme.textMuted}
              value={newShopAddress}
              onChangeText={setNewShopAddress}
            />

            <Text style={styles.inputLabel}>Phone Contact (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. +255 788 123 456"
              placeholderTextColor={theme.textMuted}
              value={newShopPhone}
              onChangeText={setNewShopPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.currencyNoteBox}>
              <Ionicons name="information-circle-outline" size={16} color={theme.primary} />
              <Text style={styles.currencyNoteText}>
                Inherits business currency: {user?.business_currency || 'TZS'} ({currencySymbol})
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCreateShopModalVisible(false)}
                disabled={creatingShop}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, creatingShop && { opacity: 0.6 }]}
                onPress={handleCreateShop}
                disabled={creatingShop}
              >
                {creatingShop ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Store</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 40
  },
  businessHeaderCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  businessHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  businessBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  businessDetails: {
    flex: 1
  },
  businessName: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '800'
  },
  businessMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4
  },
  businessCodeBadge: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  businessCurrencyBadge: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '600'
  },
  activeShopBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 10,
    padding: 10,
    marginTop: 12
  },
  activeShopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  activeShopLabel: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: '500'
  },
  activeShopName: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700'
  },
  switchShopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  switchShopBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700'
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20
  },
  actionCard: {
    width: '31%',
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
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center'
  },
  actionSub: {
    color: theme.textSecondary,
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center'
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700'
  },
  linkText: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '600'
  },
  shopCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 10
  },
  shopCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  shopCardLeft: {
    flex: 1,
    paddingRight: 10
  },
  shopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  shopCardName: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700'
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800'
  },
  shopCardCode: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2
  },
  shopCardAddress: {
    color: theme.textSecondary,
    fontSize: 11,
    marginTop: 2
  },
  shopCardPhone: {
    color: theme.textSecondary,
    fontSize: 11,
    marginTop: 1
  },
  shopCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  selectShopBtn: {
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  selectShopBtnText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  openPosQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6
  },
  openPosQuickText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  metricsCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.lg,
    padding: 16,
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
    fontSize: 11,
    fontWeight: '500'
  },
  metricValue: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4
  },
  divider: {
    height: 1,
    backgroundColor: theme.surfaceBorder,
    marginVertical: 12
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
    marginTop: 12
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
    fontSize: 14,
    fontWeight: '700'
  },
  emptyAlertBox: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.md,
    padding: 18,
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
    padding: 12,
    marginBottom: 8,
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
    marginTop: 3
  },
  restockQuickBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.sm
  },
  restockQuickText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    padding: 22,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  modalTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '800'
  },
  modalSubtitle: {
    color: theme.textSecondary,
    fontSize: 12,
    marginBottom: 16
  },
  inputLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 8
  },
  textInput: {
    backgroundColor: theme.inputBg,
    borderColor: theme.inputBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: theme.text,
    fontSize: 14
  },
  currencyNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: 8,
    padding: 10,
    marginTop: 14
  },
  currencyNoteText: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '600',
    flex: 1
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  cancelBtnText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  submitBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  }
});
