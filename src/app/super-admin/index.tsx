import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { analyticsApi, shopApi, businessApi, authApi } from '../../services/api';
import { useTheme, useStyles } from '../../context/ThemeContext';
import { AppTheme } from '../../theme/colors';
import { GlobalSummary, DailyReport, Shop, Business, User } from '../../types';
import { formatCurrency } from '../../utils/currency';

const CURRENCY_OPTIONS = [
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'EUR', symbol: '€', name: 'Euro' }
];

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useStyles(createStyles);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [globalSummary, setGlobalSummary] = useState<GlobalSummary | null>(null);
  const [shopBreakdown, setShopBreakdown] = useState<DailyReport[]>([]);

  // Create Business Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [newBizCode, setNewBizCode] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCY_OPTIONS[0]);
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    try {
      const [bizRes, usersRes, shopsRes, analyticsRes] = await Promise.all([
        businessApi.getAllBusinesses(),
        authApi.listUsers(),
        shopApi.getAllShops(),
        analyticsApi.getDailyReport()
      ]);

      if (bizRes.data) setBusinesses(bizRes.data);
      if (usersRes.data?.users) setUsers(usersRes.data.users);
      if (shopsRes.data?.shops) setShops(shopsRes.data.shops);

      if (analyticsRes.data && 'global_summary' in analyticsRes.data) {
        setGlobalSummary(analyticsRes.data.global_summary);
        setShopBreakdown(analyticsRes.data.shop_breakdown || []);
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

  const handleCreateBusiness = async () => {
    if (!newBizName.trim()) {
      Alert.alert('Required', 'Please enter a business display name.');
      return;
    }

    setCreating(true);
    try {
      await businessApi.createBusiness({
        name: newBizName.trim(),
        business_code: newBizCode.trim() || undefined,
        currency_code: selectedCurrency.code,
        currency_symbol: selectedCurrency.symbol,
        currency_name: selectedCurrency.name
      });

      Alert.alert('Success', `Business '${newBizName}' created successfully.`);
      setCreateModalVisible(false);
      setNewBizName('');
      setNewBizCode('');
      loadData();
    } catch (err: any) {
      Alert.alert('Creation Failed', err.message || 'Could not create business.');
    } finally {
      setCreating(false);
    }
  };

  const adminCount = users.filter((u) => u.role === 'admin' && u.is_active).length;
  const sellerCount = users.filter((u) => u.role === 'seller' && u.is_active).length;

  return (
    <View style={styles.container}>
      <Header title="JM Solution POS" subtitle="System-Level Platform Administration" />

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
              onPress={() => setCreateModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={20} color={theme.primary} />
              <Text style={styles.shortcutText}>New Business</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.shortcutBtn, { borderColor: theme.secondary }]}
              onPress={() => router.push('/super-admin/users' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="people" size={20} color={theme.secondary} />
              <Text style={styles.shortcutText}>Admins & Users</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.shortcutBtn, { borderColor: theme.accent }]}
              onPress={() => router.push('/super-admin/shops' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="storefront" size={20} color={theme.accent} />
              <Text style={styles.shortcutText}>All Shops</Text>
            </TouchableOpacity>
          </View>

          {/* Section 1: System-Wide Overview Grid */}
          <Text style={styles.sectionHeader}>System Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
                <Ionicons name="business" size={20} color={theme.primary} />
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>Businesses</Text>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{businesses.length}</Text>
              <Text style={styles.statSub} numberOfLines={2}>Registered Enterprise Tenants</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(14, 165, 233, 0.1)' }]}>
                <Ionicons name="shield-checkmark" size={20} color={theme.secondary} />
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>Business Admins</Text>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{adminCount}</Text>
              <Text style={styles.statSub} numberOfLines={2}>Active Business Owners</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="storefront" size={20} color={theme.accent} />
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>Active Shops</Text>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{shops.length}</Text>
              <Text style={styles.statSub} numberOfLines={2}>Storefront Branches</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Ionicons name="card" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>Sellers / Cashiers</Text>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{sellerCount}</Text>
              <Text style={styles.statSub} numberOfLines={2}>Operating Floor Staff</Text>
            </View>
          </View>

          {/* Section 2: Enterprise Businesses Directory */}
          <View style={styles.tableHeaderRow}>
            <Text style={styles.sectionHeader}>Registered Businesses</Text>
            <TouchableOpacity onPress={() => setCreateModalVisible(true)}>
              <Text style={styles.linkText}>+ Add Business</Text>
            </TouchableOpacity>
          </View>

          {businesses.map((biz) => (
            <View key={biz.id} style={styles.bizCard}>
              <View style={styles.bizHeader}>
                <View style={styles.bizHeaderLeft}>
                  <View style={styles.bizBadge}>
                    <Text style={styles.bizBadgeText}>{biz.business_code}</Text>
                  </View>
                  <View style={styles.bizTitleCol}>
                    <Text style={styles.bizName} numberOfLines={1} ellipsizeMode="tail">{biz.name}</Text>
                    <Text style={styles.bizCurrency} numberOfLines={1} ellipsizeMode="tail">
                      Currency: {biz.currency_code} ({biz.currency_symbol})
                    </Text>
                  </View>
                </View>

                <View style={[
                  styles.statusPill,
                  biz.status === 'suspended' ? styles.statusSuspended : styles.statusActive
                ]}>
                  <Text style={[
                    styles.statusText,
                    biz.status === 'suspended' ? styles.statusTextSuspended : styles.statusTextActive
                  ]}>
                    {biz.status ? biz.status.toUpperCase() : 'ACTIVE'}
                  </Text>
                </View>
              </View>

              <View style={styles.bizStatsContainer}>
                <View style={styles.bizStatsCountsRow}>
                  <View style={styles.bizCountItem}>
                    <Text style={styles.miniLabel}>Shops</Text>
                    <Text style={styles.miniValue} numberOfLines={1}>{biz.shops_count || 0}</Text>
                  </View>
                  <View style={styles.bizStatDivider} />
                  <View style={styles.bizCountItem}>
                    <Text style={styles.miniLabel}>Admins</Text>
                    <Text style={styles.miniValue} numberOfLines={1}>{biz.admins_count || 0}</Text>
                  </View>
                  <View style={styles.bizStatDivider} />
                  <View style={styles.bizCountItem}>
                    <Text style={styles.miniLabel}>Sellers</Text>
                    <Text style={styles.miniValue} numberOfLines={1}>{biz.sellers_count || 0}</Text>
                  </View>
                </View>

                <View style={styles.bizSalesRow}>
                  <Text style={styles.bizSalesLabel}>Total Revenue</Text>
                  <Text style={styles.bizSalesValue} numberOfLines={1} adjustsFontSizeToFit>
                    {formatCurrency(biz.total_revenue || 0, biz.currency_symbol || 'TSh')}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {/* Section 3: Today's Global Performance Across All Shops */}
          {globalSummary && (
            <>
              <Text style={[styles.sectionHeader, { marginTop: 14 }]}>Today's Global POS Activity</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel} numberOfLines={1}>Today's Global Revenue</Text>
                  <Text style={[styles.statValue, { color: theme.accent }]} numberOfLines={1} adjustsFontSizeToFit>
                    {formatCurrency(globalSummary.total_revenue || 0)}
                  </Text>
                  <Text style={styles.statSub} numberOfLines={1}>{globalSummary.total_transactions} Transactions Today</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel} numberOfLines={1}>Units Sold Today</Text>
                  <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{globalSummary.total_units_sold}</Text>
                  <Text style={styles.statSub} numberOfLines={1}>Across {globalSummary.reporting_shops} Reporting Stores</Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* Create Business Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="business-outline" size={24} color={theme.primary} />
                <View>
                  <Text style={styles.modalTitle}>Create New Business</Text>
                  <Text style={styles.modalSub}>Establish ownership boundary for new enterprise</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.fieldLabel}>Business Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Serengeti General Traders"
                placeholderTextColor={theme.textMuted}
                value={newBizName}
                onChangeText={setNewBizName}
              />

              <Text style={styles.fieldLabel}>Business Code (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. BIZ03 (auto-generated if empty)"
                placeholderTextColor={theme.textMuted}
                value={newBizCode}
                onChangeText={setNewBizCode}
                autoCapitalize="characters"
              />

              <Text style={styles.fieldLabel}>Operational Currency (Default: TZS)</Text>
              <View style={styles.currencyRow}>
                {CURRENCY_OPTIONS.map((c) => {
                  const isSelected = selectedCurrency.code === c.code;
                  return (
                    <TouchableOpacity
                      key={c.code}
                      style={[styles.currencyChip, isSelected && styles.currencyChipActive]}
                      onPress={() => setSelectedCurrency(c)}
                    >
                      <Text style={[styles.currencyCode, isSelected && styles.currencyCodeActive]}>
                        {c.code}
                      </Text>
                      <Text style={[styles.currencySymbol, isSelected && styles.currencySymbolActive]}>
                        {c.symbol}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCreateModalVisible(false)}
                disabled={creating}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, creating && { opacity: 0.7 }]}
                onPress={handleCreateBusiness}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.confirmBtnText}>Create Business</Text>
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
  loadingText: {
    color: theme.textSecondary,
    fontSize: 14,
    marginTop: 12
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20
  },
  shortcutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    ...theme.shadow
  },
  shortcutText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '700'
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
    marginTop: 8,
    marginBottom: 10
  },
  linkText: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '700'
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
    borderRadius: 14,
    padding: 16,
    ...theme.shadow
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  statLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600'
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
  bizCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    ...theme.shadow
  },
  bizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  bizHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    marginRight: 8
  },
  bizBadge: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 0
  },
  bizBadgeText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '800'
  },
  bizTitleCol: {
    flex: 1,
    minWidth: 0
  },
  bizName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text
  },
  bizCurrency: {
    fontSize: 11,
    color: theme.textMuted,
    marginTop: 2
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)'
  },
  statusSuspended: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)'
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700'
  },
  statusTextActive: {
    color: theme.accent
  },
  statusTextSuspended: {
    color: theme.danger
  },
  bizStatsContainer: {
    backgroundColor: theme.surfaceLight,
    borderRadius: 10,
    padding: 10,
    gap: 8
  },
  bizStatsCountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around'
  },
  bizCountItem: {
    flex: 1,
    alignItems: 'center'
  },
  bizStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: theme.surfaceBorder
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
  },
  bizSalesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.surfaceBorder
  },
  bizSalesLabel: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '600'
  },
  bizSalesValue: {
    color: theme.accent,
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    ...theme.shadow
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text
  },
  modalSub: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 2
  },
  modalForm: {
    gap: 10
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    marginTop: 4
  },
  modalInput: {
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: theme.text
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4
  },
  currencyChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  currencyChipActive: {
    borderColor: theme.primary,
    backgroundColor: 'rgba(79, 70, 229, 0.08)'
  },
  currencyCode: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.text
  },
  currencyCodeActive: {
    color: theme.primary
  },
  currencySymbol: {
    fontSize: 10,
    color: theme.textMuted,
    marginTop: 2
  },
  currencySymbolActive: {
    color: theme.primary
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary
  },
  confirmBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff'
  }
});
