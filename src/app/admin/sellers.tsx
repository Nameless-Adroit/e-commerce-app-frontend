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
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { authApi, shopApi, subscriptionApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useStyles } from '../../context/ThemeContext';
import { AppTheme } from '../../theme/colors';
import { User, Shop } from '../../types';

export default function AdminSellersScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();
  const styles = useStyles(createStyles);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sellers, setSellers] = useState<User[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [quotaDetails, setQuotaDetails] = useState<{
    active_sellers_count: number;
    max_sellers: number;
    plan_name?: string;
    plan_code?: string;
  } | null>(null);

  // New Seller Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadSellersData = async () => {
    try {
      const [usersRes, shopsRes, subRes] = await Promise.all([
        authApi.listUsers({ role: 'seller' }),
        shopApi.getAllShops(),
        subscriptionApi.getBusinessSubscription()
      ]);

      if (usersRes.data?.users) {
        setSellers(usersRes.data.users);
      }

      if (shopsRes.data?.shops) {
        setShops(shopsRes.data.shops);
        if (shopsRes.data.shops.length > 0 && !selectedShopId) {
          setSelectedShopId(shopsRes.data.shops[0].id);
        }
      }

      if (subRes.data) {
        const subData: any = (subRes.data as any)?.data || subRes.data;
        const maxSellers = subData?.max_sellers ?? subData?.usage?.max_sellers ?? subData?.plan?.max_sellers ?? 1;
        const currentSellers = subData?.active_sellers_count ?? subData?.usage?.current_sellers ?? 0;
        setQuotaDetails({
          active_sellers_count: currentSellers,
          max_sellers: maxSellers,
          plan_name: subData?.plan?.name || (maxSellers <= 1 ? 'Starter Plan' : maxSellers <= 5 ? 'Business Plan' : 'Enterprise Plan'),
          plan_code: subData?.plan?.plan_code || 'STARTER'
        });
      }
    } catch (err: any) {
      console.error('Failed to load sellers:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user || isLoading || user.role !== 'admin') return;
    loadSellersData();
  }, [user, isLoading]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSellersData();
  };

  const isSellerActive = (s: User) => s.is_active === true || (s.is_active as any) === 1 || (s.is_active as any) === '1';

  const activeCount = sellers.filter(isSellerActive).length;
  const maxLimit = quotaDetails?.max_sellers ?? 1;
  const isLimitReached = activeCount >= maxLimit;
  const planName = quotaDetails?.plan_name || 'Starter Plan';

  const handleOpenCreateModal = () => {
    if (isLimitReached) {
      Alert.alert(
        'Cashier Limit Reached',
        `Your current ${planName} allows a maximum of ${maxLimit} active cashier account(s). Please upgrade your subscription plan in Billing to add more staff.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade Plan', onPress: () => router.push('/admin/billing' as any) }
        ]
      );
      return;
    }
    setCreateModalVisible(true);
  };

  const handleCreateSeller = async () => {
    if (!fullName.trim() || !phone.trim() || !pin.trim()) {
      Alert.alert('Required Fields', 'Please fill in Full Name, Phone Number, and 6-digit PIN.');
      return;
    }

    if (!/^\d{6}$/.test(pin.trim())) {
      Alert.alert('Invalid PIN', 'PIN must be exactly 6 numeric digits.');
      return;
    }

    if (!selectedShopId) {
      Alert.alert('Select Store', 'Please select which store/branch this cashier is assigned to.');
      return;
    }

    setSubmitting(true);
    try {
      await authApi.registerUser({
        full_name: fullName.trim(),
        phone_number: phone.trim(),
        pin: pin.trim(),
        role: 'seller',
        shop_id: selectedShopId,
        username: username.trim() || undefined
      });

      Alert.alert(
        'Cashier Created',
        `Cashier account '${fullName.trim()}' has been created successfully. They can now sign in at the POS counter using their phone number and PIN.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setCreateModalVisible(false);
              setFullName('');
              setUsername('');
              setPhone('');
              setPin('');
              setShowOptionalFields(false);
              onRefresh();
            }
          }
        ]
      );
    } catch (err: any) {
      if (
        err.message &&
        (err.message.includes('allow') ||
          err.message.includes('plan') ||
          err.message.includes('limit') ||
          err.code === 'LIMIT_SELLERS_EXCEEDED')
      ) {
        Alert.alert(
          'Plan Limit Reached',
          err.message || 'You have reached the maximum number of cashiers allowed under your current plan.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Upgrade Plan',
              onPress: () => {
                setCreateModalVisible(false);
                router.push('/admin/billing' as any);
              }
            }
          ]
        );
      } else {
        Alert.alert('Creation Failed', err.message || 'Could not register cashier account. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (seller: User) => {
    const isCurrentlyActive = isSellerActive(seller);
    const newStatus = !isCurrentlyActive;
    const actionVerb = newStatus ? 'activate' : 'suspend';

    // Check if activating would exceed plan quota
    if (newStatus && activeCount >= maxLimit) {
      Alert.alert(
        'Quota Limit Reached',
        `You cannot activate this cashier because your ${planName} allows a maximum of ${maxLimit} active cashier(s). Please suspend another account or upgrade your plan in Billing.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade Plan', onPress: () => router.push('/admin/billing' as any) }
        ]
      );
      return;
    }

    Alert.alert(
      newStatus ? 'Activate Cashier' : 'Suspend Cashier',
      newStatus
        ? `Are you sure you want to reactivate cashier '${seller.full_name}'? They will regain counter checkout access and occupy 1 active staff slot.`
        : `Are you sure you want to suspend cashier '${seller.full_name}'? They will be unable to sign into the cashier counter until reactivated. This will immediately free up 1 staff slot. Accounts are never deleted, only suspended.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newStatus ? 'Activate' : 'Suspend',
          style: newStatus ? 'default' : 'destructive',
          onPress: async () => {
            try {
              // Optimistic UI update
              setSellers((prev) =>
                prev.map((item) => (item.id === seller.id ? { ...item, is_active: newStatus } : item))
              );
              await authApi.setUserStatus(seller.id, newStatus);
              await loadSellersData();
            } catch (err: any) {
              // Rollback on failure
              setSellers((prev) =>
                prev.map((item) => (item.id === seller.id ? { ...item, is_active: isCurrentlyActive } : item))
              );
              Alert.alert('Update Failed', err.message || `Could not ${actionVerb} user.`);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        title="Cashiers & Sellers"
        subtitle="Provision and manage store checkout accounts"
        showBack={true}
        onBack={() => router.back()}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading staff accounts...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        >
          {/* Cashier Capacity Card */}
          <View style={[styles.quotaCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
            <View style={styles.quotaHeader}>
              <View style={styles.quotaTitleRow}>
                <View
                  style={[
                    styles.quotaIconWrap,
                    {
                      backgroundColor: isLimitReached ? 'rgba(239, 68, 68, 0.12)' : 'rgba(99, 102, 241, 0.12)'
                    }
                  ]}
                >
                  <Ionicons name="people" size={18} color={isLimitReached ? '#ef4444' : theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.quotaTitle, { color: theme.text }]}>Cashier Capacity</Text>
                  <Text style={[styles.quotaSub, { color: theme.textSecondary }]}>
                    {activeCount} of {maxLimit} active cashier accounts in use
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.planBadge,
                  {
                    backgroundColor: isLimitReached ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                    borderColor: isLimitReached ? 'rgba(239, 68, 68, 0.3)' : 'rgba(99, 102, 241, 0.3)'
                  }
                ]}
              >
                <Text
                  style={[
                    styles.planBadgeText,
                    { color: isLimitReached ? '#ef4444' : theme.primary }
                  ]}
                >
                  {planName} • {maxLimit} Max
                </Text>
              </View>
            </View>

            {/* Quota Progress Bar */}
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.min(100, (activeCount / Math.max(1, maxLimit)) * 100)}%`,
                    backgroundColor:
                      isLimitReached ? '#ef4444' : (activeCount / maxLimit) >= 0.8 ? '#f59e0b' : theme.primary
                  }
                ]}
              />
            </View>

            {/* Quota Footnote */}
            <View style={styles.quotaFooter}>
              <Text
                style={[
                  styles.quotaFooterText,
                  { color: isLimitReached ? '#ef4444' : theme.textSecondary }
                ]}
              >
                {isLimitReached
                  ? 'Plan limit reached. Upgrade to add more cashiers.'
                  : `${maxLimit - activeCount} account slot${maxLimit - activeCount === 1 ? '' : 's'} available`}
              </Text>
              {isLimitReached && (
                <TouchableOpacity onPress={() => router.push('/admin/billing' as any)}>
                  <Text style={[styles.upgradeLink, { color: theme.primary }]}>Upgrade in Billing →</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Primary Action Button or Limit Alert Banner */}
          {isLimitReached ? (
            <View
              style={[
                styles.limitBanner,
                { backgroundColor: theme.surface, borderColor: 'rgba(239, 68, 68, 0.3)' }
              ]}
            >
              <View style={styles.limitBannerContent}>
                <View style={[styles.limitWarningIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                  <Ionicons name="lock-closed" size={20} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.limitBannerTitle, { color: theme.text }]}>Cashier Limit Reached</Text>
                  <Text style={[styles.limitBannerSub, { color: theme.textSecondary }]}>
                    Your {planName} is at full capacity ({activeCount}/{maxLimit}). Upgrade your plan to add more staff.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.upgradeActionBtn, { backgroundColor: theme.primary }]}
                onPress={() => router.push('/admin/billing' as any)}
                activeOpacity={0.85}
              >
                <Ionicons name="sparkles" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.upgradeActionBtnText}>Upgrade Subscription</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.primaryAddBtn, { backgroundColor: theme.primary }]}
              onPress={handleOpenCreateModal}
              activeOpacity={0.85}
            >
              <Ionicons name="person-add" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryAddBtnText}>Add New Cashier</Text>
            </TouchableOpacity>
          )}

          {/* Explanatory Callout */}
          <View
            style={[
              styles.noteBox,
              { backgroundColor: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.25)' }
            ]}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color="#3b82f6" style={{ marginRight: 8 }} />
            <Text style={[styles.noteText, { color: theme.textSecondary }]}>
              Cashiers sign in to the counter with their registered Phone Number and 6-digit PIN. Accounts are never deleted, only suspended.
            </Text>
          </View>

          {/* Sellers List Header */}
          <View style={styles.listHeaderRow}>
            <Text style={[styles.listHeader, { color: theme.textSecondary }]}>Registered Cashiers</Text>
            <Text style={[styles.listCounter, { color: theme.textMuted }]}>
              {sellers.length} {sellers.length === 1 ? 'account' : 'accounts'}
            </Text>
          </View>

          {sellers.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
              <Ionicons name="people-outline" size={40} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Cashiers Added Yet</Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                Add your first cashier to allow staff to record retail sales transactions on the POS counter.
              </Text>
            </View>
          ) : (
            sellers.map((s) => {
              const isActive = isSellerActive(s);
              return (
                <View
                  key={s.id}
                  style={[styles.sellerCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
                >
                  <View style={styles.sellerTop}>
                    <View style={styles.sellerInfoCol}>
                      <Text style={[styles.sellerName, { color: theme.text }]}>{s.full_name}</Text>
                      <View style={styles.phoneBadgeRow}>
                        <Ionicons name="call-outline" size={13} color={theme.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.sellerPhone, { color: theme.textSecondary }]}>
                          {s.phone_number || 'No phone set'}
                        </Text>
                      </View>
                      <Text style={[styles.sellerShop, { color: theme.primary }]}>
                        Store: {s.shop_name || `Shop #${s.shop_id}`}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'
                        }
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: isActive ? '#16a34a' : '#ef4444' }
                        ]}
                      >
                        {isActive ? 'ACTIVE' : 'SUSPENDED'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.sellerActionsRow, { borderTopColor: theme.surfaceBorder }]}>
                    <TouchableOpacity
                      style={[
                        styles.statusToggleBtn,
                        { borderColor: isActive ? '#ef4444' : '#16a34a' }
                      ]}
                      onPress={() => handleToggleStatus(s)}
                    >
                      <Ionicons
                        name={isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                        size={15}
                        color={isActive ? '#ef4444' : '#16a34a'}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.statusToggleBtnText, { color: isActive ? '#ef4444' : '#16a34a' }]}>
                        {isActive ? 'Suspend Cashier' : 'Activate Cashier'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Streamlined Create Cashier Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Add New Cashier</Text>
                <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
                  Cashiers sign in using Phone Number & 6-Digit PIN
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              {/* Full Name */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Full Name *</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.background, borderColor: theme.surfaceBorder, color: theme.text }
                ]}
                placeholder="e.g. Baraka Huma"
                placeholderTextColor={theme.textMuted}
                value={fullName}
                onChangeText={setFullName}
                autoCorrect={false}
              />

              {/* Phone Number */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                Phone Number (for Login) *
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.background, borderColor: theme.surfaceBorder, color: theme.text }
                ]}
                placeholder="e.g. 0712 345 678"
                placeholderTextColor={theme.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <Text style={[styles.inputHelper, { color: theme.textMuted }]}>
                Cashier will use this exact phone number to sign in.
              </Text>

              {/* 6-Digit PIN */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                Initial 6-Digit PIN *
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.background, borderColor: theme.surfaceBorder, color: theme.text }
                ]}
                placeholder="••••••"
                placeholderTextColor={theme.textMuted}
                secureTextEntry={true}
                value={pin}
                onChangeText={(val) => setPin(val.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />
              <Text style={[styles.inputHelper, { color: theme.textMuted }]}>
                Must be 6 numeric digits (e.g. 123456).
              </Text>

              {/* Assigned Store */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                Assigned Store / Branch *
              </Text>
              {shops.map((shp) => {
                const isSelected = selectedShopId === shp.id;
                return (
                  <TouchableOpacity
                    key={shp.id}
                    style={[
                      styles.shopOption,
                      {
                        backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.10)' : theme.background,
                        borderColor: isSelected ? theme.primary : theme.surfaceBorder
                      }
                    ]}
                    onPress={() => setSelectedShopId(shp.id)}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? theme.primary : theme.textMuted}
                    />
                    <Text style={[styles.shopOptionText, { color: theme.text, marginLeft: 10 }]}>
                      {shp.name} ({shp.shop_code})
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Optional Advanced Settings Toggle */}
              <TouchableOpacity
                style={styles.optionalToggle}
                onPress={() => setShowOptionalFields(!showOptionalFields)}
              >
                <Text style={[styles.optionalToggleText, { color: theme.primary }]}>
                  {showOptionalFields ? '- Hide Advanced Options' : '+ Custom Username (Optional)'}
                </Text>
              </TouchableOpacity>

              {showOptionalFields && (
                <View style={[styles.optionalBox, { backgroundColor: theme.background, borderColor: theme.surfaceBorder }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Custom Username</Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      { backgroundColor: theme.surface, borderColor: theme.surfaceBorder, color: theme.text }
                    ]}
                    placeholder="Leave blank to auto-generate from phone"
                    placeholderTextColor={theme.textMuted}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: theme.surfaceBorder }]}
                  onPress={() => setCreateModalVisible(false)}
                  disabled={submitting}
                >
                  <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: theme.primary }]}
                  onPress={handleCreateSeller}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Create Cashier Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14
    },
    scroll: {
      flex: 1
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40
    },
    quotaCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginBottom: 12
    },
    quotaHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14
    },
    quotaTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 10
    },
    quotaIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10
    },
    quotaTitle: {
      fontSize: 16,
      fontWeight: '700'
    },
    quotaSub: {
      fontSize: 12.5,
      marginTop: 2
    },
    planBadge: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1
    },
    planBadgeText: {
      fontSize: 11,
      fontWeight: '700'
    },
    track: {
      height: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(150, 150, 150, 0.2)',
      overflow: 'hidden'
    },
    fill: {
      height: '100%',
      borderRadius: 4
    },
    quotaFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10
    },
    quotaFooterText: {
      fontSize: 12,
      fontWeight: '500'
    },
    upgradeLink: {
      fontSize: 12,
      fontWeight: '700'
    },
    primaryAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderRadius: 12,
      marginBottom: 14,
      shadowColor: '#6366f1',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3
    },
    primaryAddBtnText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700'
    },
    limitBanner: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      marginBottom: 14
    },
    limitBannerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12
    },
    limitWarningIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12
    },
    limitBannerTitle: {
      fontSize: 15,
      fontWeight: '700'
    },
    limitBannerSub: {
      fontSize: 12.5,
      marginTop: 2,
      lineHeight: 17
    },
    upgradeActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 8
    },
    upgradeActionBtnText: {
      color: '#fff',
      fontSize: 13.5,
      fontWeight: '700'
    },
    noteBox: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 16
    },
    noteText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 17
    },
    listHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10
    },
    listHeader: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5
    },
    listCounter: {
      fontSize: 12,
      fontWeight: '500'
    },
    emptyCard: {
      alignItems: 'center',
      padding: 30,
      borderRadius: 16,
      borderWidth: 1
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginTop: 12
    },
    emptySub: {
      fontSize: 13,
      textAlign: 'center',
      marginTop: 4
    },
    sellerCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      marginBottom: 12
    },
    sellerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    },
    sellerInfoCol: {
      flex: 1
    },
    sellerName: {
      fontSize: 16,
      fontWeight: '700'
    },
    phoneBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4
    },
    sellerPhone: {
      fontSize: 13,
      fontWeight: '500'
    },
    sellerShop: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4
    },
    statusPill: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 12
    },
    statusPillText: {
      fontSize: 10,
      fontWeight: '700'
    },
    sellerActionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1
    },
    statusToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8
    },
    statusToggleBtnText: {
      fontSize: 12,
      fontWeight: '600'
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'flex-end'
    },
    modalCard: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: '90%'
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700'
    },
    modalSub: {
      fontSize: 12,
      marginTop: 2
    },
    closeBtn: {
      padding: 4
    },
    modalScrollContent: {
      paddingBottom: 24
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 6
    },
    modalInput: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      fontSize: 14
    },
    inputHelper: {
      fontSize: 11.5,
      marginTop: 4
    },
    shopOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      marginBottom: 8
    },
    shopOptionText: {
      fontSize: 14,
      fontWeight: '600'
    },
    optionalToggle: {
      marginVertical: 10
    },
    optionalToggleText: {
      fontSize: 12.5,
      fontWeight: '600'
    },
    optionalBox: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10
    },
    modalBtnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 18
    },
    cancelBtn: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center'
    },
    cancelBtnText: {
      fontSize: 14,
      fontWeight: '600'
    },
    submitBtn: {
      flex: 2,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center'
    },
    submitBtnText: {
      color: '#fff',
      fontSize: 14.5,
      fontWeight: '700'
    }
  });
