import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '../../components/Header';
import { ReceiptModal } from '../../components/ReceiptModal';
import { posApi } from '../../services/api';
import { useTheme, useStyles } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AppTheme } from '../../theme/colors';
import { Transaction, TransactionSummary } from '../../types';
import { formatCurrency } from '../../utils/currency';

function formatDateToISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseISODate(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date();
}

function formatDisplayDate(dateStr: string): string {
  const d = parseISODate(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default function AdminTransactions() {
  const { theme } = useTheme();
  const { activeShop, currencySymbol } = useAuth();
  const styles = useStyles(createStyles);
  const params = useLocalSearchParams<{ date?: string }>();
  const todayStr = useMemo(() => formatDateToISO(new Date()), []);
  
  const [selectedDate, setSelectedDate] = useState<string>(params.date || todayStr);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'card' | 'mobile_money'>('all');
  
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  // Date Picker Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [customInputDate, setCustomInputDate] = useState(selectedDate);

  const fetchTransactionsForDate = async (dateToLoad: string) => {
    setLoading(true);
    try {
      const res = await posApi.getTransactions({
        date: dateToLoad,
        limit: 100
      });

      if (res.data) {
        setTransactions(res.data.transactions || []);
        setSummary(res.data.summary || null);
      }
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      Alert.alert('Error', err.message || 'Could not load transaction journal.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (params.date && params.date !== selectedDate) {
      setSelectedDate(params.date);
    }
  }, [params.date]);

  useEffect(() => {
    fetchTransactionsForDate(selectedDate);
  }, [selectedDate, activeShop]);

  const handlePrevDay = () => {
    const current = parseISODate(selectedDate);
    current.setDate(current.getDate() - 1);
    setSelectedDate(formatDateToISO(current));
  };

  const handleNextDay = () => {
    const current = parseISODate(selectedDate);
    current.setDate(current.getDate() + 1);
    setSelectedDate(formatDateToISO(current));
  };

  const handleSelectQuickDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setModalVisible(false);
  };

  const handleApplyCustomDate = () => {
    const trimmed = customInputDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      Alert.alert('Invalid Format', 'Please enter a valid date in YYYY-MM-DD format (e.g. 2026-09-14)');
      return;
    }
    setSelectedDate(trimmed);
    setModalVisible(false);
  };

  const handleOpenReceipt = async (txn: Transaction) => {
    setLoadingReceipt(true);
    try {
      const res = await posApi.getTransactionDetails(txn.id);
      if (res.data) {
        setSelectedTxn(res.data);
      } else {
        setSelectedTxn(txn);
      }
    } catch {
      setSelectedTxn(txn);
    } finally {
      setLoadingReceipt(false);
      setReceiptVisible(true);
    }
  };

  // Filter transactions by payment method
  const filteredTransactions = useMemo(() => {
    if (paymentFilter === 'all') return transactions;
    return transactions.filter(t => t.payment_method === paymentFilter);
  }, [transactions, paymentFilter]);

  const isToday = selectedDate === todayStr;

  const yesterdayStr = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return formatDateToISO(y);
  }, []);

  const isYesterday = selectedDate === yesterdayStr;

  return (
    <View style={styles.container}>
      <Header 
        title="Transaction History" 
        subtitle="Sales Journal & Digital Receipts" 
      />

      {/* Date Navigation Bar */}
      <View style={styles.dateBar}>
        <View style={styles.dateControlsRow}>
          <TouchableOpacity 
            style={styles.navArrowBtn} 
            onPress={handlePrevDay}
            accessibilityLabel="Previous Day"
          >
            <Ionicons name="chevron-back" size={20} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dateDisplayBtn} 
            onPress={() => {
              setCustomInputDate(selectedDate);
              setModalVisible(true);
            }}
          >
            <Ionicons name="calendar" size={18} color={theme.primary} />
            <View style={styles.dateTextGroup}>
              <Text style={styles.dateDisplayMain}>{formatDisplayDate(selectedDate)}</Text>
              <Text style={styles.dateDisplaySub}>
                {selectedDate} {isToday ? '• (Today)' : isYesterday ? '• (Yesterday)' : ''}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.navArrowBtn} 
            onPress={handleNextDay}
            accessibilityLabel="Next Day"
          >
            <Ionicons name="chevron-forward" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Quick Date Presets Row */}
        <View style={styles.presetsRow}>
          <TouchableOpacity 
            style={[styles.presetChip, isToday && styles.presetChipActive]}
            onPress={() => setSelectedDate(todayStr)}
          >
            <Text style={[styles.presetChipText, isToday && styles.presetChipTextActive]}>Today</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.presetChip, isYesterday && styles.presetChipActive]}
            onPress={() => setSelectedDate(yesterdayStr)}
          >
            <Text style={[styles.presetChipText, isYesterday && styles.presetChipTextActive]}>Yesterday</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.presetChip, !isToday && !isYesterday && styles.presetChipActive]}
            onPress={() => {
              setCustomInputDate(selectedDate);
              setModalVisible(true);
            }}
          >
            <Ionicons 
              name="calendar-outline" 
              size={13} 
              color={!isToday && !isYesterday ? theme.primary : theme.textMuted} 
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.presetChipText, !isToday && !isYesterday && styles.presetChipTextActive]}>
              Pick Any Date
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Day Aggregate Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Total Sales</Text>
            <Text style={styles.summaryValue}>{summary?.total_transactions || 0}</Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Gross Revenue</Text>
            <Text style={[styles.summaryValue, { color: theme.accent }]}>
              {formatCurrency(summary?.total_revenue || 0)}
            </Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Discounts</Text>
            <Text style={[styles.summaryValue, { color: (summary?.total_discount || 0) > 0 ? theme.warning : theme.textMuted }]}>
              {formatCurrency(summary?.total_discount || 0)}
            </Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Avg / Txn</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(summary && summary.total_transactions > 0 
                ? (summary.total_revenue / summary.total_transactions) 
                : 0)}
            </Text>
          </View>
        </View>
      </View>

      {/* Payment Filter Chips */}
      <View style={styles.filterRow}>
        {(['all', 'cash', 'card', 'mobile_money'] as const).map(method => (
          <TouchableOpacity
            key={method}
            style={[styles.filterChip, paymentFilter === method && styles.filterChipActive]}
            onPress={() => setPaymentFilter(method)}
          >
            <Text style={[styles.filterText, paymentFilter === method && styles.filterTextActive]}>
              {method === 'all' ? 'All Methods' : method === 'mobile_money' ? 'Mobile Money' : method.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transactions List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Fetching transactions for {selectedDate}...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchTransactionsForDate(selectedDate);
              }}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="receipt-outline" size={54} color={theme.textMuted} />
              <Text style={styles.emptyTitle}>No Sales Found</Text>
              <Text style={styles.emptySub}>
                There are no recorded transactions matching this date ({selectedDate})
                {paymentFilter !== 'all' ? ` for payment method "${paymentFilter}".` : '.'}
              </Text>
              <TouchableOpacity 
                style={styles.emptyBtn} 
                onPress={() => setSelectedDate(todayStr)}
              >
                <Text style={styles.emptyBtnText}>Jump to Today</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const dateObj = new Date(item.transaction_date);
            const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const hasDiscount = Number(item.discount_amount || 0) > 0;

            return (
              <TouchableOpacity
                style={styles.txnCard}
                onPress={() => handleOpenReceipt(item)}
                activeOpacity={0.75}
              >
                {/* Header Row */}
                <View style={styles.cardTop}>
                  <View style={styles.idGroup}>
                    <Ionicons name="receipt" size={17} color={theme.primary} />
                    <Text style={styles.txnIdText}>{item.id}</Text>
                  </View>
                  <View style={styles.badgeGroup}>
                    <View style={[styles.statusBadge, item.status === 'completed' ? styles.statusCompleted : styles.statusOther]}>
                      <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
                    </View>
                  </View>
                </View>

                {/* Amount & Discount Highlight */}
                <View style={styles.cardMid}>
                  <View>
                    <Text style={styles.totalAmount}>{formatCurrency(item.total_amount)}</Text>
                    {hasDiscount && (
                      <View style={styles.discountTag}>
                        <Ionicons name="pricetag" size={11} color={theme.warning} />
                        <Text style={styles.discountTagText}>
                          Discount: -{formatCurrency(item.discount_amount)} (Sub: {formatCurrency(item.subtotal_amount || item.total_amount)})
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.payMethodPill}>
                    <Ionicons 
                      name={item.payment_method === 'cash' ? 'cash-outline' : item.payment_method === 'card' ? 'card-outline' : 'phone-portrait-outline'} 
                      size={14} 
                      color={theme.text} 
                    />
                    <Text style={styles.payMethodText}>
                      {item.payment_method === 'mobile_money' ? 'M-MONEY' : item.payment_method.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Footer Row: Seller, Time, Items, Receipt Arrow */}
                <View style={styles.cardBot}>
                  <View style={styles.metaLeft}>
                    <Text style={styles.sellerName}>
                      <Ionicons name="person-outline" size={12} color={theme.textMuted} /> {item.seller_name || 'Staff'}
                    </Text>
                    <Text style={styles.timeText}>
                      <Ionicons name="time-outline" size={12} color={theme.textMuted} /> {timeStr}
                    </Text>
                  </View>

                  <View style={styles.receiptAction}>
                    <Text style={styles.receiptActionText}>
                      {item.item_count ? `${item.item_count} items` : 'Receipt'} →
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Date Picker Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="calendar" size={22} color={theme.primary} />
                <Text style={styles.modalTitle}>Choose Audit Date</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Select a quick preset or type any date (YYYY-MM-DD) to audit sales and view receipts.
            </Text>

            {/* Quick Preset Buttons */}
            <View style={styles.quickPresetsContainer}>
              <TouchableOpacity 
                style={styles.quickBtn}
                onPress={() => handleSelectQuickDate(todayStr)}
              >
                <Text style={styles.quickBtnText}>Today ({todayStr})</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.quickBtn}
                onPress={() => handleSelectQuickDate(yesterdayStr)}
              >
                <Text style={styles.quickBtnText}>Yesterday ({yesterdayStr})</Text>
              </TouchableOpacity>

              {[-2, -3, -7, -14, -30].map(daysAgo => {
                const pastDate = new Date();
                pastDate.setDate(pastDate.getDate() + daysAgo);
                const iso = formatDateToISO(pastDate);
                return (
                  <TouchableOpacity
                    key={daysAgo}
                    style={styles.quickBtnSmall}
                    onPress={() => handleSelectQuickDate(iso)}
                  >
                    <Text style={styles.quickBtnSmallText}>{Math.abs(daysAgo)}d ago ({iso})</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Manual Date Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Custom Date (YYYY-MM-DD):</Text>
              <TextInput
                style={styles.dateInput}
                value={customInputDate}
                onChangeText={setCustomInputDate}
                placeholder="2026-09-14"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.applyBtn} 
                onPress={handleApplyCustomDate}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.applyBtnText}>Load Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receipt Details Modal */}
      <ReceiptModal
        visible={receiptVisible}
        transaction={selectedTxn}
        title="Transaction Sales Receipt"
        onClose={() => {
          setReceiptVisible(false);
          setSelectedTxn(null);
        }}
      />
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
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    color: theme.textMuted,
    marginTop: 12,
    fontSize: 14
  },
  dateBar: {
    backgroundColor: theme.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.surfaceBorder
  },
  dateControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  navArrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dateDisplayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)'
  },
  dateTextGroup: {
    alignItems: 'center',
    marginHorizontal: 8
  },
  dateDisplayMain: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700'
  },
  dateDisplaySub: {
    color: theme.textMuted,
    fontSize: 11,
    marginTop: 2
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  presetChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: theme.primary
  },
  presetChipText: {
    fontSize: 12,
    color: theme.textMuted,
    fontWeight: '500'
  },
  presetChipTextActive: {
    color: theme.primary,
    fontWeight: '700'
  },
  summaryCard: {
    backgroundColor: theme.surface,
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  summaryCol: {
    alignItems: 'center',
    flex: 1
  },
  summaryLabel: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4
  },
  summaryValue: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700'
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    gap: 8
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  filterChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary
  },
  filterText: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '700'
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24
  },
  emptyTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14
  },
  emptySub: {
    color: theme.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18
  },
  emptyBtn: {
    marginTop: 18,
    backgroundColor: theme.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  },
  txnCard: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    padding: 14,
    marginBottom: 10
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  idGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  txnIdText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700'
  },
  badgeGroup: {
    flexDirection: 'row'
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  statusCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)'
  },
  statusOther: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)'
  },
  statusText: {
    color: theme.accent,
    fontSize: 10,
    fontWeight: '700'
  },
  cardMid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10
  },
  totalAmount: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '800'
  },
  discountTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3
  },
  discountTagText: {
    color: theme.warning,
    fontSize: 11,
    fontWeight: '600'
  },
  payMethodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  payMethodText: {
    color: theme.text,
    fontSize: 11,
    fontWeight: '700'
  },
  cardBot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 8,
    marginTop: 4
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  sellerName: {
    color: theme.textMuted,
    fontSize: 12
  },
  timeText: {
    color: theme.textMuted,
    fontSize: 12
  },
  receiptAction: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  receiptActionText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '700'
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  modalTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700'
  },
  modalSubtitle: {
    color: theme.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16
  },
  quickPresetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
  },
  quickBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  quickBtnText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '600'
  },
  quickBtnSmall: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  quickBtnSmallText: {
    color: theme.textMuted,
    fontSize: 11
  },
  inputGroup: {
    marginBottom: 18
  },
  inputLabel: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6
  },
  dateInput: {
    backgroundColor: theme.background,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  cancelBtnText: {
    color: theme.textMuted,
    fontSize: 13,
    fontWeight: '600'
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  }
});
