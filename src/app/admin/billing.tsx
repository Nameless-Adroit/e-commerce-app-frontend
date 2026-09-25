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
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { subscriptionApi, platformApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useStyles } from '../../context/ThemeContext';
import { AppTheme } from '../../theme/colors';
import { SubscriptionPlan, SubscriptionPayment, PaymentMethodConfig, PlatformConfig } from '../../types';
import { formatCurrency } from '../../utils/currency';

export default function AdminBillingScreen() {
  const router = useRouter();
  const { user, isLoading, refreshProfile, currencySymbol } = useAuth();
  const { theme } = useTheme();
  const styles = useStyles(createStyles);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subDetails, setSubDetails] = useState<any>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);

  // Renewal Modal
  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('M-Pesa');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingRenewal, setSubmittingRenewal] = useState(false);

  const loadBillingData = async () => {
    try {
      const [subRes, plansRes, configRes, methodsRes] = await Promise.all([
        subscriptionApi.getBusinessSubscription(),
        subscriptionApi.getPublicPlans(),
        platformApi.getConfig(),
        platformApi.getPaymentMethods()
      ]);

      if (subRes.data) {
        setSubDetails(subRes.data);
        if (subRes.data.plan?.id) {
          setSelectedPlanId(subRes.data.plan.id);
        }
      }

      if (plansRes.data?.plans) {
        setAvailablePlans(plansRes.data.plans);
        if (!selectedPlanId && plansRes.data.plans.length > 0) {
          setSelectedPlanId(plansRes.data.plans[0].id);
        }
      }

      if (configRes.data) {
        setPlatformConfig(configRes.data);
      }

      if (methodsRes.data) {
        const methods = Array.isArray(methodsRes.data) ? methodsRes.data : (methodsRes.data as any)?.paymentMethods || [];
        setPaymentMethods(methods);
        if (methods.length > 0) {
          setSelectedPaymentMethod(methods[0].provider_name || methods[0].name || '');
        }
      }
    } catch (err: any) {
      console.error('Error loading billing data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user || isLoading || user.role !== 'admin') return;
    loadBillingData();
  }, [user, isLoading]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    await loadBillingData();
  };

  const handleRenewSubmit = async () => {
    if (!subDetails?.business_id) {
      Alert.alert('Error', 'No active business account identified.');
      return;
    }

    if (!selectedPlanId) {
      Alert.alert('Select Plan', 'Please select a subscription plan.');
      return;
    }

    // Payment Reference check commented out per requirements (will come in handy later)
    /*
    if (!paymentReference.trim()) {
      Alert.alert('Missing Reference', 'Please enter your payment or transaction reference code (e.g. M-Pesa transaction ID).');
      return;
    }
    */

    setSubmittingRenewal(true);
    try {
      const res = await subscriptionApi.renewSubscription(subDetails.business_id, {
        plan_id: selectedPlanId,
        payment_method: selectedPaymentMethod,
        payment_reference: paymentReference.trim() || undefined,
        notes: paymentNotes.trim() || undefined
      });

      Alert.alert(
        'Renewal Submitted',
        res.message || 'Your manual renewal payment has been submitted for platform verification. Your days remaining have been preserved.',
        [
          {
            text: 'OK',
            onPress: () => {
              setRenewModalVisible(false);
              setPaymentReference('');
              setPaymentNotes('');
              onRefresh();
            }
          }
        ]
      );
    } catch (err: any) {
      Alert.alert('Renewal Failed', err.message || 'Could not submit renewal request.');
    } finally {
      setSubmittingRenewal(false);
    }
  };

  const daysRemaining = subDetails?.days_remaining ?? user?.days_remaining ?? 0;
  const isExpired = subDetails?.is_expired ?? user?.is_subscription_expired ?? false;
  const currentPlan = subDetails?.plan;
  const payments: SubscriptionPayment[] = subDetails?.payments || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        title="Subscription & Billing"
        subtitle="Manage plan, limits, and manual renewals"
        showBack={true}
        onBack={() => router.back()}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading subscription status...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        >
          {/* Subscription Overview Card */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={[styles.planNameText, { color: theme.text }]}>
                  {currentPlan?.name || 'Standard Retail Plan'}
                </Text>
                <Text style={[styles.planCodeText, { color: theme.textMuted }]}>
                  Plan Code: {currentPlan?.plan_code || 'RETAIL'}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isExpired
                      ? 'rgba(239, 68, 68, 0.15)'
                      : daysRemaining <= 7
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(34, 197, 94, 0.15)'
                  }
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color: isExpired ? '#ef4444' : daysRemaining <= 7 ? '#d97706' : '#16a34a'
                    }
                  ]}
                >
                  {isExpired ? 'EXPIRED' : `${daysRemaining} DAYS LEFT`}
                </Text>
              </View>
            </View>

            {/* Countdown / Stats Bar */}
            <View style={[styles.statBoxRow, { backgroundColor: theme.isDark ? '#0F172A' : '#F1F5F9' }]}>
              <View style={styles.statCol}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Days Remaining</Text>
                <Text
                  style={[
                    styles.statValue,
                    { color: isExpired ? '#ef4444' : daysRemaining <= 7 ? '#d97706' : theme.primary }
                  ]}
                >
                  {daysRemaining}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Expires On</Text>
                <Text style={[styles.statValueSub, { color: theme.text }]}>
                  {subDetails?.subscription_end_date
                    ? new Date(subDetails.subscription_end_date).toLocaleDateString('en-GB')
                    : 'Not set'}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Plan Price</Text>
                <Text style={[styles.statValueSub, { color: theme.text }]}>
                  {currentPlan ? `TZS ${Number(currentPlan.price_tzs).toLocaleString()}` : '-'}
                </Text>
              </View>
            </View>

            {/* Quota Limits & Progress */}
            <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>Quota & Resource Limits</Text>
            
            <View style={styles.limitRow}>
              <View style={styles.limitHeader}>
                <View style={styles.limitIconTitle}>
                  <Ionicons name="storefront-outline" size={16} color={theme.primary} />
                  <Text style={[styles.limitTitle, { color: theme.text }]}>Active Branches / Shops</Text>
                </View>
                <Text style={[styles.limitNumbers, { color: theme.text }]}>
                  {subDetails?.active_shops_count ?? 0} / {subDetails?.max_shops ?? currentPlan?.max_shops ?? 1}
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(
                        100,
                        (((subDetails?.active_shops_count ?? 0) / (subDetails?.max_shops ?? 1)) * 100)
                      )}%`,
                      backgroundColor: theme.primary
                    }
                  ]}
                />
              </View>
            </View>

            <View style={[styles.limitRow, { marginTop: 14 }]}>
              <View style={styles.limitHeader}>
                <View style={styles.limitIconTitle}>
                  <Ionicons name="people-outline" size={16} color={theme.secondary} />
                  <Text style={[styles.limitTitle, { color: theme.text }]}>Cashier / Seller Accounts</Text>
                </View>
                <Text style={[styles.limitNumbers, { color: theme.text }]}>
                  {subDetails?.active_sellers_count ?? 0} / {subDetails?.max_sellers ?? currentPlan?.max_sellers ?? 3}
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(
                        100,
                        (((subDetails?.active_sellers_count ?? 0) / (subDetails?.max_sellers ?? 1)) * 100)
                      )}%`,
                      backgroundColor: theme.secondary
                    }
                  ]}
                />
              </View>
            </View>

            {/* Renew Button */}
            <TouchableOpacity
              style={[styles.renewBtn, { backgroundColor: theme.primary }]}
              onPress={() => setRenewModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="card-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.renewBtnText}>Renew or Extend Subscription</Text>
            </TouchableOpacity>
          </View>

          {/* Payment & Contact Instructions */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="help-buoy-outline" size={20} color={theme.primary} />
              <Text style={[styles.infoCardTitle, { color: theme.text }]}>Technical Support & Renewal Desk</Text>
            </View>
            <Text style={[styles.infoCardDesc, { color: theme.textSecondary }]}>
              Payments are verified manually by platform administrators. Once you send payment via mobile money or bank transfer, enter the transaction code above to confirm renewal.
            </Text>

            {platformConfig?.settings && (
              <View style={styles.contactDetails}>
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={16} color={theme.primary} />
                  <Text style={[styles.contactText, { color: theme.text }]}>
                    Helpline: {platformConfig.settings.support_phone || '+255 712 000 000'}
                  </Text>
                </View>
                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={16} color={theme.primary} />
                  <Text style={[styles.contactText, { color: theme.text }]}>
                    Email: {platformConfig.settings.support_email || 'support@jmsolutions.co.tz'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Billing & Payment History */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
            <Text style={[styles.historyTitle, { color: theme.text }]}>Payment & Billing Journal</Text>
            {payments.length === 0 ? (
              <Text style={[styles.noHistoryText, { color: theme.textMuted }]}>
                No billing transactions recorded yet.
              </Text>
            ) : (
              payments.map((p) => (
                <View key={p.id} style={[styles.paymentItem, { borderBottomColor: theme.surfaceBorder }]}>
                  <View style={styles.paymentLeft}>
                    <Text style={[styles.paymentPlan, { color: theme.text }]}>{p.plan_name || 'Plan Renewal'}</Text>
                    <Text style={[styles.paymentRef, { color: theme.textSecondary }]}>
                      Ref: {p.payment_reference || 'N/A'} • {p.payment_method}
                    </Text>
                    <Text style={[styles.paymentDate, { color: theme.textMuted }]}>
                      {new Date(p.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                  <View style={styles.paymentRight}>
                    <Text style={[styles.paymentAmount, { color: theme.text }]}>
                      TZS {Number(p.amount).toLocaleString()}
                    </Text>
                    <View
                      style={[
                        styles.payStatusPill,
                        {
                          backgroundColor:
                            (p.status || 'verified').toLowerCase() === 'verified' || (p.status || 'verified').toLowerCase() === 'completed'
                              ? 'rgba(34, 197, 94, 0.15)'
                              : (p.status || '').toLowerCase() === 'rejected'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : 'rgba(245, 158, 11, 0.15)'
                        }
                      ]}
                    >
                      <Text
                        style={[
                          styles.payStatusPillText,
                          {
                            color:
                              (p.status || 'verified').toLowerCase() === 'verified' || (p.status || 'verified').toLowerCase() === 'completed'
                                ? '#16a34a'
                                : (p.status || '').toLowerCase() === 'rejected'
                                ? '#ef4444'
                                : '#d97706'
                          }
                        ]}
                      >
                        {(p.status || 'verified').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Manual Renewal Modal */}
      <Modal visible={renewModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Renew Store Subscription</Text>
              <TouchableOpacity onPress={() => setRenewModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {/* Step 1: Select Plan */}
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Select Duration / Plan</Text>
              {availablePlans.map((pl) => {
                const isSelected = selectedPlanId === pl.id;
                return (
                  <TouchableOpacity
                    key={pl.id}
                    style={[
                      styles.planOption,
                      {
                        backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.10)' : theme.background,
                        borderColor: isSelected ? theme.primary : theme.surfaceBorder
                      }
                    ]}
                    onPress={() => setSelectedPlanId(pl.id)}
                  >
                    <View style={styles.planOptionLeft}>
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={isSelected ? theme.primary : theme.textMuted}
                      />
                      <View style={{ marginLeft: 10 }}>
                        <Text style={[styles.planOptionName, { color: theme.text }]}>{pl.name}</Text>
                        <Text style={[styles.planOptionMeta, { color: theme.textSecondary }]}>
                          {pl.duration_days} Days • Up to {pl.max_shops} Shops • {pl.max_sellers} Sellers
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.planOptionPrice, { color: theme.primary }]}>
                      TZS {Number(pl.price_tzs).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Step 2: Payment Instructions */}
              <Text style={[styles.modalLabel, { color: theme.textSecondary, marginTop: 16 }]}>
                Payment Channel
              </Text>
              {paymentMethods.map((pm: any) => {
                const isSelected = selectedPaymentMethod === (pm.provider_name || pm.name);
                return (
                  <TouchableOpacity
                    key={pm.id}
                    style={[
                      styles.methodOption,
                      {
                        backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.10)' : theme.background,
                        borderColor: isSelected ? theme.secondary : theme.surfaceBorder
                      }
                    ]}
                    onPress={() => setSelectedPaymentMethod(pm.provider_name || pm.name)}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={isSelected ? theme.secondary : theme.textMuted}
                    />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={[styles.methodName, { color: theme.text }]}>
                        {pm.provider_name || pm.name} ({pm.account_number})
                      </Text>
                      <Text style={[styles.methodAccount, { color: theme.textSecondary }]}>
                        Name: {pm.account_name}
                      </Text>
                      {pm.instructions && (
                        <Text style={[styles.methodInstructions, { color: theme.textMuted }]}>
                          {pm.instructions}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Step 3: Transaction Reference (Commented out per user requirements - will come in handy later) */}
              {/*
              <Text style={[styles.modalLabel, { color: theme.textSecondary, marginTop: 16 }]}>
                Payment Reference / Transaction ID
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.background, borderColor: theme.surfaceBorder, color: theme.text }
                ]}
                placeholder="e.g. 9JA7654321 / M-Pesa Code"
                placeholderTextColor={theme.textMuted}
                value={paymentReference}
                onChangeText={setPaymentReference}
                autoCapitalize="characters"
              />
              */}

              {/* Notes */}
              <Text style={[styles.modalLabel, { color: theme.textSecondary, marginTop: 12 }]}>
                Additional Notes (Optional)
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.background, borderColor: theme.surfaceBorder, color: theme.text, height: 60 }
                ]}
                placeholder="Notes for platform verifying team"
                placeholderTextColor={theme.textMuted}
                value={paymentNotes}
                onChangeText={setPaymentNotes}
                multiline
              />

              <TouchableOpacity
                style={[styles.submitRenewalBtn, { backgroundColor: theme.primary }]}
                onPress={handleRenewSubmit}
                disabled={submittingRenewal}
              >
                {submittingRenewal ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitRenewalBtnText}>Submit Renewal Confirmation</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
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
    card: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginBottom: 16
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 14
    },
    planNameText: {
      fontSize: 20,
      fontWeight: '700'
    },
    planCodeText: {
      fontSize: 12,
      marginTop: 2
    },
    statusBadge: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 20
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '700'
    },
    statBoxRow: {
      flexDirection: 'row',
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      justifyContent: 'space-around',
      marginBottom: 16
    },
    statCol: {
      alignItems: 'center',
      flex: 1
    },
    statDivider: {
      width: 1,
      height: 30,
      backgroundColor: 'rgba(150, 150, 150, 0.2)'
    },
    statLabel: {
      fontSize: 11,
      marginBottom: 4
    },
    statValue: {
      fontSize: 22,
      fontWeight: '800'
    },
    statValueSub: {
      fontSize: 13,
      fontWeight: '600'
    },
    sectionHeading: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10
    },
    limitRow: {
      marginBottom: 6
    },
    limitHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6
    },
    limitIconTitle: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    limitTitle: {
      fontSize: 13,
      fontWeight: '500',
      marginLeft: 6
    },
    limitNumbers: {
      fontSize: 13,
      fontWeight: '700'
    },
    progressBarTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(150, 150, 150, 0.2)',
      overflow: 'hidden'
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 3
    },
    renewBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      marginTop: 18
    },
    renewBtnText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700'
    },
    infoCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8
    },
    infoCardTitle: {
      fontSize: 15,
      fontWeight: '700',
      marginLeft: 8
    },
    infoCardDesc: {
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 12
    },
    contactDetails: {
      marginTop: 6
    },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6
    },
    contactText: {
      fontSize: 13,
      marginLeft: 8,
      fontWeight: '500'
    },
    historyTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 12
    },
    noHistoryText: {
      fontSize: 13,
      fontStyle: 'italic',
      textAlign: 'center',
      paddingVertical: 16
    },
    paymentItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1
    },
    paymentLeft: {
      flex: 1
    },
    paymentPlan: {
      fontSize: 14,
      fontWeight: '600'
    },
    paymentRef: {
      fontSize: 12,
      marginTop: 2
    },
    paymentDate: {
      fontSize: 11,
      marginTop: 2
    },
    paymentRight: {
      alignItems: 'flex-end',
      marginLeft: 12
    },
    paymentAmount: {
      fontSize: 14,
      fontWeight: '700'
    },
    payStatusPill: {
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 12,
      marginTop: 4
    },
    payStatusPillText: {
      fontSize: 10,
      fontWeight: '700'
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
      alignItems: 'center',
      marginBottom: 16
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700'
    },
    closeBtn: {
      padding: 4
    },
    modalScroll: {
      marginBottom: 10
    },
    modalLabel: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 8
    },
    planOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      marginBottom: 8
    },
    planOptionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1
    },
    planOptionName: {
      fontSize: 14,
      fontWeight: '700'
    },
    planOptionMeta: {
      fontSize: 11,
      marginTop: 2
    },
    planOptionPrice: {
      fontSize: 13,
      fontWeight: '700',
      marginLeft: 8
    },
    methodOption: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      marginBottom: 8
    },
    methodName: {
      fontSize: 13,
      fontWeight: '700'
    },
    methodAccount: {
      fontSize: 12,
      marginTop: 1
    },
    methodInstructions: {
      fontSize: 11,
      marginTop: 2
    },
    modalInput: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      fontSize: 14
    },
    submitRenewalBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 10,
      marginTop: 20,
      marginBottom: 16
    },
    submitRenewalBtnText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700'
    }
  });
