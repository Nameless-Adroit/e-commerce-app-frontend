import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Alert, 
  Modal 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { shopApi, businessApi } from '../../services/api';
import { useTheme, useStyles } from '../../context/ThemeContext';
import { AppTheme } from '../../theme/colors';
import { Shop, Business, ShopRequest } from '../../types';
import { SUPPORTED_CURRENCIES } from '../../utils/currency';

export default function SuperAdminShops() {
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  const [activeTab, setActiveTab] = useState<'ACTIVE_SHOPS' | 'REQUESTS'>('ACTIVE_SHOPS');
  const [shops, setShops] = useState<Shop[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [shopRequests, setShopRequests] = useState<ShopRequest[]>([]);
  const [selectedBusinessFilter, setSelectedBusinessFilter] = useState<string>('ALL');
  const [selectedRequestStatusFilter, setSelectedRequestStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Review Modal state
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ShopRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [superAdminNotes, setSuperAdminNotes] = useState('');
  const [processingReview, setProcessingReview] = useState(false);

  // Form state for direct creating new shop
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | undefined>(undefined);
  const [shopCode, setShopCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(SUPPORTED_CURRENCIES[0]);
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    try {
      const [shopsRes, bizRes, reqsRes] = await Promise.all([
        shopApi.getAllShops(),
        businessApi.getAllBusinesses(),
        shopApi.getShopRequests()
      ]);

      if (shopsRes.data?.shops) {
        setShops(shopsRes.data.shops);
      }
      if (bizRes.data) {
        const bizList = bizRes.data;
        setBusinesses(bizList);
        if (bizList.length > 0) {
          setSelectedBusinessId((prev) => prev ?? bizList[0].id);
        }
      }
      if (reqsRes.data?.requests) {
        setShopRequests(reqsRes.data.requests);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load shop directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingRequestsCount = shopRequests.filter(r => r.status === 'pending').length;

  const filteredShops = selectedBusinessFilter === 'ALL'
    ? shops
    : shops.filter((s) => String(s.business_id) === selectedBusinessFilter);

  const filteredRequests = selectedRequestStatusFilter === 'ALL'
    ? shopRequests
    : shopRequests.filter((r) => r.status === selectedRequestStatusFilter);

  const handleCreateShop = async () => {
    if (!shopCode.trim() || !name.trim()) {
      Alert.alert('Required Fields', 'Please provide a unique Shop Code (e.g. SHP03) and Shop Name.');
      return;
    }

    if (!selectedBusinessId && businesses.length > 0) {
      Alert.alert('Required Fields', 'Please select a parent Business.');
      return;
    }

    setCreating(true);
    try {
      await shopApi.createShop({
        business_id: selectedBusinessId,
        shop_code: shopCode.trim().toUpperCase(),
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        currency_code: selectedCurrency.code,
        currency_symbol: selectedCurrency.symbol,
        currency_name: selectedCurrency.name
      });
      Alert.alert('Success', `Shop '${name}' created successfully with currency ${selectedCurrency.code} (${selectedCurrency.symbol})!`);
      setShopCode('');
      setName('');
      setAddress('');
      setPhone('');
      setSelectedCurrency(SUPPORTED_CURRENCIES[0]);
      setModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Failed to Create Shop', err.message || 'Error occurred');
    } finally {
      setCreating(false);
    }
  };

  const openReviewModal = (req: ShopRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(req);
    setReviewAction(action);
    setSuperAdminNotes('');
    setReviewModalVisible(true);
  };

  const handleProcessReview = async () => {
    if (!selectedRequest) return;
    setProcessingReview(true);
    try {
      if (reviewAction === 'approve') {
        const res = await shopApi.approveShopRequest(selectedRequest.id, superAdminNotes.trim() || undefined);
        Alert.alert('Request Approved', res.message || `Store '${selectedRequest.name}' is now active!`);
      } else {
        const res = await shopApi.rejectShopRequest(selectedRequest.id, superAdminNotes.trim() || undefined);
        Alert.alert('Request Rejected', res.message || 'Store request has been rejected.');
      }
      setReviewModalVisible(false);
      await loadData();
    } catch (err: any) {
      Alert.alert('Review Action Failed', err.message || 'Error occurred while reviewing request.');
    } finally {
      setProcessingReview(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Store Branches" 
        subtitle="All Retail Outlets & Branches" 
        rightAction={
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add Store</Text>
          </TouchableOpacity>
        }
      />

      {/* Top Navigation Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'ACTIVE_SHOPS' && styles.tabBtnActive]}
          onPress={() => setActiveTab('ACTIVE_SHOPS')}
        >
          <Ionicons 
            name="storefront" 
            size={16} 
            color={activeTab === 'ACTIVE_SHOPS' ? theme.primary : theme.textSecondary} 
          />
          <Text style={[styles.tabBtnText, activeTab === 'ACTIVE_SHOPS' && styles.tabBtnTextActive]}>
            Active Stores ({shops.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'REQUESTS' && styles.tabBtnActive]}
          onPress={() => setActiveTab('REQUESTS')}
        >
          <Ionicons 
            name="git-pull-request" 
            size={16} 
            color={activeTab === 'REQUESTS' ? theme.primary : theme.textSecondary} 
          />
          <Text style={[styles.tabBtnText, activeTab === 'REQUESTS' && styles.tabBtnTextActive]}>
            Store Requests
          </Text>
          {pendingRequestsCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{pendingRequestsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : activeTab === 'ACTIVE_SHOPS' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Business Filter Chips */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Filter by Business:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              <TouchableOpacity
                style={[styles.filterChip, selectedBusinessFilter === 'ALL' && styles.filterChipActive]}
                onPress={() => setSelectedBusinessFilter('ALL')}
              >
                <Text style={[styles.filterChipText, selectedBusinessFilter === 'ALL' && styles.filterChipTextActive]}>
                  All Businesses ({shops.length})
                </Text>
              </TouchableOpacity>
              {businesses.map((b) => {
                const count = shops.filter((s) => s.business_id === b.id).length;
                const isSelected = selectedBusinessFilter === String(b.id);
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    onPress={() => setSelectedBusinessFilter(String(b.id))}
                  >
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {b.name} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {filteredShops.map((shop) => {
            const parentBiz = businesses.find((b) => b.id === shop.business_id);
            return (
              <View key={shop.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.shopIconBox}>
                    <Ionicons name="storefront" size={24} color={theme.primary} />
                  </View>
                  <View style={styles.titleCol}>
                    <Text style={styles.shopName}>{shop.name}</Text>
                    <View style={styles.codeAndCurrencyRow}>
                      <Text style={styles.shopCodeBadge}>Code: {shop.shop_code}</Text>
                      {parentBiz && (
                        <View style={styles.bizBadge}>
                          <Ionicons name="business" size={10} color={theme.primary} />
                          <Text style={styles.bizBadgeText}>{parentBiz.name}</Text>
                        </View>
                      )}
                      <View style={styles.currencyBadge}>
                        <Text style={styles.currencyBadgeText}>
                          {shop.currency_symbol || 'TSh'} ({shop.currency_code || 'TZS'})
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {shop.address && (
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={14} color={theme.textMuted} />
                    <Text style={styles.metaText}>{shop.address}</Text>
                  </View>
                )}

                {shop.phone && (
                  <View style={styles.metaRow}>
                    <Ionicons name="call-outline" size={14} color={theme.textMuted} />
                    <Text style={styles.metaText}>{shop.phone}</Text>
                  </View>
                )}

                <View style={styles.statsBar}>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Assigned Staff</Text>
                    <Text style={styles.statNumber}>{shop.staff_count || 0}</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Products</Text>
                    <Text style={styles.statNumber}>{shop.product_count || 0}</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Total Inventory</Text>
                    <Text style={styles.statNumber}>{shop.total_units_in_stock || 0} units</Text>
                  </View>
                </View>
              </View>
            );
          })}

          {filteredShops.length === 0 && (
            <View style={styles.emptyBox}>
              <Ionicons name="storefront-outline" size={38} color={theme.textMuted} />
              <Text style={styles.emptyText}>No stores found for this selection.</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Status Filter Chips */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Filter by Status:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {[
                { key: 'ALL', label: `All Requests (${shopRequests.length})` },
                { key: 'pending', label: `Pending (${shopRequests.filter(r => r.status === 'pending').length})` },
                { key: 'approved', label: `Approved (${shopRequests.filter(r => r.status === 'approved').length})` },
                { key: 'rejected', label: `Rejected (${shopRequests.filter(r => r.status === 'rejected').length})` }
              ].map((filter) => {
                const isSelected = selectedRequestStatusFilter === filter.key;
                return (
                  <TouchableOpacity
                    key={filter.key}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    onPress={() => setSelectedRequestStatusFilter(filter.key)}
                  >
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {filteredRequests.map((req) => {
            const isPending = req.status === 'pending';
            const isApproved = req.status === 'approved';
            const badgeBg = isApproved 
              ? 'rgba(16, 185, 129, 0.15)' 
              : isPending 
                ? 'rgba(245, 158, 11, 0.15)' 
                : 'rgba(239, 68, 68, 0.15)';
            const badgeText = isApproved ? theme.accent : isPending ? theme.warning : theme.danger;
            const statusLabel = isApproved ? 'APPROVED' : isPending ? 'PENDING REVIEW' : 'REJECTED';

            return (
              <View key={req.id} style={styles.requestCard}>
                <View style={styles.requestCardHeader}>
                  <View style={styles.requestTitleBox}>
                    <Text style={styles.requestTitle}>{req.name}</Text>
                    <View style={styles.requestMetaHeaderRow}>
                      <Text style={styles.requestCodeBadge}>Code: {req.shop_code}</Text>
                      <View style={styles.bizBadge}>
                        <Ionicons name="business" size={10} color={theme.primary} />
                        <Text style={styles.bizBadgeText}>{req.business_name || 'Business'}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.statusBadgePill, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.statusBadgePillText, { color: badgeText }]}>{statusLabel}</Text>
                  </View>
                </View>

                <View style={styles.requesterInfoRow}>
                  <Ionicons name="person-outline" size={14} color={theme.textSecondary} />
                  <Text style={styles.requesterInfoText}>
                    Requested by: <Text style={{ fontWeight: '700', color: theme.text }}>{req.requested_by_name || 'Store Admin'}</Text>
                    {req.requested_by_phone ? ` (${req.requested_by_phone})` : ''}
                  </Text>
                </View>

                {req.address && (
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={14} color={theme.textMuted} />
                    <Text style={styles.metaText}>{req.address}</Text>
                  </View>
                )}

                {req.phone && (
                  <View style={styles.metaRow}>
                    <Ionicons name="call-outline" size={14} color={theme.textMuted} />
                    <Text style={styles.metaText}>{req.phone}</Text>
                  </View>
                )}

                {req.admin_notes && (
                  <View style={styles.adminNotesBox}>
                    <Text style={styles.adminNotesLabel}>Admin Justification / Notes:</Text>
                    <Text style={styles.adminNotesText}>{req.admin_notes}</Text>
                  </View>
                )}

                {req.super_admin_notes && (
                  <View style={styles.reviewedFeedbackBox}>
                    <Text style={styles.reviewedFeedbackLabel}>Reviewer Feedback:</Text>
                    <Text style={styles.reviewedFeedbackText}>{req.super_admin_notes}</Text>
                  </View>
                )}

                <Text style={styles.requestTimestamp}>
                  Submitted on {new Date(req.created_at).toLocaleString()}
                  {req.reviewed_at ? ` • Reviewed on ${new Date(req.reviewed_at).toLocaleString()}` : ''}
                </Text>

                {isPending && (
                  <View style={styles.requestActionsRow}>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => openReviewModal(req, 'reject')}
                    >
                      <Ionicons name="close-circle-outline" size={16} color={theme.danger} />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => openReviewModal(req, 'approve')}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                      <Text style={styles.approveBtnText}>Approve & Create Store</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          {filteredRequests.length === 0 && (
            <View style={styles.emptyBox}>
              <Ionicons name="document-text-outline" size={38} color={theme.textMuted} />
              <Text style={styles.emptyText}>No store requests found for this filter.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Review Modal (Approve / Reject with Notes) */}
      <Modal visible={reviewModalVisible} transparent animationType="fade" onRequestClose={() => setReviewModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {reviewAction === 'approve' ? 'Approve Store Request' : 'Reject Store Request'}
            </Text>
            <Text style={styles.modalDesc}>
              {reviewAction === 'approve' 
                ? `Approving will instantiate store '${selectedRequest?.name}' (${selectedRequest?.shop_code}) under ${selectedRequest?.business_name}.`
                : `Reject request for '${selectedRequest?.name}' (${selectedRequest?.shop_code}).`}
            </Text>

            <Text style={styles.label}>Feedback Notes for Store Admin (Optional)</Text>
            <TextInput
              style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
              placeholder={reviewAction === 'approve' ? "e.g. Approved. Please proceed to onboard sellers." : "e.g. Needs revised location details or market study."}
              placeholderTextColor={theme.textMuted}
              value={superAdminNotes}
              onChangeText={setSuperAdminNotes}
              multiline
            />

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setReviewModalVisible(false)}
                disabled={processingReview}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  reviewAction === 'reject' && { backgroundColor: theme.danger },
                  processingReview && { opacity: 0.6 }
                ]}
                onPress={handleProcessReview}
                disabled={processingReview}
              >
                {processingReview ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmText}>
                    {reviewAction === 'approve' ? 'Approve & Create Store' : 'Reject Request'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Shop Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Register Store Branch</Text>
            <Text style={styles.modalDesc}>Add an independent store branch under a business.</Text>

            {/* Business Selector */}
            <Text style={styles.label}>Parent Business Enterprise *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bizSelectorScroll}>
              {businesses.map((biz) => {
                const isSelected = selectedBusinessId === biz.id;
                return (
                  <TouchableOpacity
                    key={biz.id}
                    style={[styles.bizChip, isSelected && styles.bizChipActive]}
                    onPress={() => setSelectedBusinessId(biz.id)}
                  >
                    <Ionicons 
                      name="business" 
                      size={12} 
                      color={isSelected ? '#fff' : theme.textSecondary} 
                    />
                    <Text style={[styles.bizChipText, isSelected && styles.bizChipTextActive]}>
                      {biz.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>Shop Code (Unique Prefix) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. SHP03, MWZ01"
              placeholderTextColor={theme.textMuted}
              value={shopCode}
              onChangeText={setShopCode}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Store Display Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mwanza City Center Branch"
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Operating Currency */}
            <Text style={styles.label}>Operating Currency</Text>
            <View style={styles.currencyChipsRow}>
              {SUPPORTED_CURRENCIES.map((curr) => {
                const isSelected = selectedCurrency.code === curr.code;
                return (
                  <TouchableOpacity
                    key={curr.code}
                    style={[styles.currencyChip, isSelected && styles.currencyChipActive]}
                    onPress={() => setSelectedCurrency(curr)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.currencyChipText, isSelected && styles.currencyChipTextActive]}>
                      {curr.symbol} {curr.code}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Physical Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Store location address"
              placeholderTextColor={theme.textMuted}
              value={address}
              onChangeText={setAddress}
            />

            <Text style={styles.label}>Contact Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="+255 712 345 678"
              placeholderTextColor={theme.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.btnRow}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn} disabled={creating}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateShop} style={styles.confirmBtn} disabled={creating}>
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Create Store</Text>}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.sm
  },
  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  filterSection: {
    marginBottom: 16
  },
  filterLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6
  },
  chipsScroll: {
    flexDirection: 'row'
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    marginRight: 8
  },
  filterChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary
  },
  filterChipText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '700'
  },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.md,
    padding: 16,
    marginBottom: 12
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10
  },
  shopIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  titleCol: {
    flex: 1
  },
  shopName: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800'
  },
  codeAndCurrencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4
  },
  shopCodeBadge: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4
  },
  bizBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4
  },
  bizBadgeText: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '600'
  },
  currencyBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4
  },
  currencyBadgeText: {
    color: theme.accent,
    fontSize: 11,
    fontWeight: '600'
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4
  },
  metaText: {
    color: theme.textSecondary,
    fontSize: 12
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: 8,
    padding: 10,
    marginTop: 12
  },
  statCol: {
    alignItems: 'center',
    flex: 1
  },
  statLabel: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: '600'
  },
  statNumber: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2
  },
  emptyBox: {
    alignItems: 'center',
    padding: 30
  },
  emptyText: {
    color: theme.textSecondary,
    fontSize: 13,
    marginTop: 8
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    maxHeight: '90%'
  },
  modalTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '800'
  },
  modalDesc: {
    color: theme.textSecondary,
    fontSize: 12,
    marginBottom: 12
  },
  bizSelectorScroll: {
    flexDirection: 'row',
    marginBottom: 10
  },
  bizChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    marginRight: 8
  },
  bizChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary
  },
  bizChipText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  bizChipTextActive: {
    color: '#fff',
    fontWeight: '700'
  },
  label: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4
  },
  input: {
    backgroundColor: theme.inputBg,
    borderColor: theme.inputBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: theme.text,
    fontSize: 14
  },
  currencyChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4
  },
  currencyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  currencyChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary
  },
  currencyChipText: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '600'
  },
  currencyChipTextActive: {
    color: '#fff',
    fontWeight: '700'
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  cancelText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  confirmBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  confirmText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.surfaceBorder,
    backgroundColor: theme.surface,
    paddingHorizontal: 16
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabBtnActive: {
    borderBottomColor: theme.primary
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary
  },
  tabBtnTextActive: {
    color: theme.primary,
    fontWeight: '700'
  },
  tabBadge: {
    backgroundColor: theme.warning,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 2
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800'
  },
  requestCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  requestCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  requestTitleBox: {
    flex: 1,
    paddingRight: 8
  },
  requestTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800'
  },
  requestMetaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4
  },
  requestCodeBadge: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  statusBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusBadgePillText: {
    fontSize: 10,
    fontWeight: '800'
  },
  requesterInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6
  },
  requesterInfoText: {
    color: theme.textSecondary,
    fontSize: 12
  },
  adminNotesBox: {
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderRadius: 6,
    padding: 10,
    marginTop: 6
  },
  adminNotesLabel: {
    color: theme.primary,
    fontSize: 10,
    fontWeight: '700'
  },
  adminNotesText: {
    color: theme.text,
    fontSize: 12,
    marginTop: 2
  },
  reviewedFeedbackBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: theme.warning,
    borderRadius: 6,
    padding: 10,
    marginTop: 6
  },
  reviewedFeedbackLabel: {
    color: theme.warning,
    fontSize: 10,
    fontWeight: '700'
  },
  reviewedFeedbackText: {
    color: theme.text,
    fontSize: 12,
    marginTop: 2
  },
  requestTimestamp: {
    color: theme.textMuted,
    fontSize: 10,
    marginTop: 8
  },
  requestActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.surfaceBorder
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)'
  },
  rejectBtnText: {
    color: theme.danger,
    fontSize: 12,
    fontWeight: '700'
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.accent
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  }
});
