import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useStyles } from '../context/ThemeContext';
import { AppTheme } from '../theme/colors';
import { analyticsApi } from '../services/api';
import { DailyReconciliation } from '../types';
import { formatCurrency } from '../utils/currency';

interface CloseBusinessModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccessClose?: () => void;
}

export function CloseBusinessModal({ visible, onClose, onSuccessClose }: CloseBusinessModalProps) {
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [data, setData] = useState<DailyReconciliation | null>(null);

  useEffect(() => {
    if (visible) {
      loadReconciliation();
    }
  }, [visible]);

  const loadReconciliation = async () => {
    setLoading(true);
    try {
      const res = await analyticsApi.getDailyReconciliation();
      if (res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      Alert.alert('Reconciliation Error', err.message || 'Failed to fetch end-of-day sales data.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClose = () => {
    Alert.alert(
      'Close Business for Today?',
      'Are you sure you want to finalize and lock the daily journal? This will compile the end-of-day sales report in the store ledger.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Close',
          style: 'destructive',
          onPress: executeDailyClose
        }
      ]
    );
  };

  const executeDailyClose = async () => {
    setClosing(true);
    try {
      const res = await analyticsApi.triggerDailyClose();
      Alert.alert(
        'Business Closed Successfully',
        res.message || 'End-of-day business closure compiled and saved to ledger.',
        [
          {
            text: 'Done',
            onPress: () => {
              onClose();
              onSuccessClose?.();
            }
          }
        ]
      );
    } catch (err: any) {
      Alert.alert('Closure Failed', err.message || 'Error compiling daily close.');
    } finally {
      setClosing(false);
    }
  };

  const symbol = data?.currency_symbol || 'TSh';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="lock-closed" size={22} color={theme.primary} />
              </View>
              <View>
                <Text style={styles.title}>Close Business & EOD Audit</Text>
                <Text style={styles.subtitle}>Cross-check transactions before closing</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={styles.loadingText}>Compiling today's sales and payment channels...</Text>
            </View>
          ) : !data ? (
            <View style={styles.centerBox}>
              <Ionicons name="alert-circle-outline" size={40} color={theme.danger} />
              <Text style={styles.errorText}>No reconciliation data available for today.</Text>
            </View>
          ) : (
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {/* Grand Total Highlight */}
              <View style={styles.grandTotalCard}>
                <Text style={styles.grandTotalLabel}>Today's Total Sales Turnover</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(data.total_sales || 0, symbol)}</Text>
                <View style={styles.grandTotalMetaRow}>
                  <Text style={styles.grandTotalMeta}>
                    {data.transactions_count ?? (data as any).total_transactions ?? 0} transactions • {data.total_items_sold ?? (data as any).total_units_sold ?? 0} total units sold
                  </Text>
                </View>
              </View>

              {/* Payment Methods Breakdown */}
              <Text style={styles.sectionHeader}>Payment Channel Reconciliation</Text>
              <View style={styles.breakdownGrid}>
                {/* Cash */}
                <View style={styles.breakdownCard}>
                  <View style={styles.breakdownHeader}>
                    <Ionicons name="cash-outline" size={18} color="#059669" />
                    <Text style={styles.breakdownTitle}>Cash in Drawer</Text>
                  </View>
                  <Text style={styles.breakdownAmount}>
                    {formatCurrency(data.payment_breakdown?.cash || 0, symbol)}
                  </Text>
                </View>

                {/* Card */}
                <View style={styles.breakdownCard}>
                  <View style={styles.breakdownHeader}>
                    <Ionicons name="card-outline" size={18} color="#2563EB" />
                    <Text style={styles.breakdownTitle}>Card / Terminal</Text>
                  </View>
                  <Text style={styles.breakdownAmount}>
                    {formatCurrency(data.payment_breakdown?.card || 0, symbol)}
                  </Text>
                </View>

                {/* Mobile Money */}
                <View style={styles.breakdownCard}>
                  <View style={styles.breakdownHeader}>
                    <Ionicons name="phone-portrait-outline" size={18} color="#D97706" />
                    <Text style={styles.breakdownTitle}>Mobile Money</Text>
                  </View>
                  <Text style={styles.breakdownAmount}>
                    {formatCurrency(data.payment_breakdown?.mobile_money || 0, symbol)}
                  </Text>
                </View>
              </View>

              {/* Transaction Audit List */}
              <Text style={styles.sectionHeader}>
                Transaction Cross-Check ({(data.transactions || []).length})
              </Text>

              {(!data.transactions || data.transactions.length === 0) ? (
                <View style={styles.noTxnsBox}>
                  <Text style={styles.noTxnsText}>No transactions executed today.</Text>
                </View>
              ) : (
                <View style={styles.auditList}>
                  {data.transactions.map((t) => (
                    <View key={t.id} style={styles.auditRow}>
                      <View style={styles.auditLeft}>
                        <Text style={styles.auditTxnId}>{t.id}</Text>
                        <Text style={styles.auditMeta}>
                          {t.time} • {t.items_count} items
                        </Text>
                      </View>
                      <View style={styles.auditRight}>
                        <Text style={styles.auditAmount}>{formatCurrency(t.total_amount, symbol)}</Text>
                        <View style={styles.methodBadge}>
                          <Text style={styles.methodBadgeText}>{t.payment_method}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}

          {/* Action Footer */}
          {data && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.closeBusinessBtn, closing && { opacity: 0.7 }]}
                onPress={handleConfirmClose}
                disabled={closing || loading}
                activeOpacity={0.85}
              >
                {closing ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View style={styles.closeBusinessBtnContent}>
                    <Ionicons name="lock-closed" size={18} color="#ffffff" />
                    <Text style={styles.closeBusinessBtnText}>Confirm & Close Business Today</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
    ...theme.shadow
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.surfaceBorder
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text
  },
  subtitle: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2
  },
  closeBtn: {
    padding: 6
  },
  centerBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: theme.textSecondary
  },
  errorText: {
    marginTop: 10,
    fontSize: 14,
    color: theme.danger
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16
  },
  grandTotalCard: {
    backgroundColor: theme.surfaceLight,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    alignItems: 'center',
    marginBottom: 18
  },
  grandTotalLabel: {
    fontSize: 13,
    color: theme.textSecondary,
    fontWeight: '600'
  },
  grandTotalValue: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.accent,
    marginVertical: 4
  },
  grandTotalMetaRow: {
    marginTop: 2
  },
  grandTotalMeta: {
    fontSize: 12,
    color: theme.textMuted
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 6
  },
  breakdownGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18
  },
  breakdownCard: {
    flex: 1,
    backgroundColor: theme.surfaceLight,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6
  },
  breakdownTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.textSecondary,
    textTransform: 'uppercase'
  },
  breakdownAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.text
  },
  auditList: {
    backgroundColor: theme.surfaceLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    overflow: 'hidden',
    marginBottom: 20
  },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.surfaceBorder
  },
  auditLeft: {
    flex: 1
  },
  auditTxnId: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.text,
    fontFamily: 'monospace'
  },
  auditMeta: {
    fontSize: 11,
    color: theme.textMuted,
    marginTop: 2
  },
  auditRight: {
    alignItems: 'flex-end',
    gap: 4
  },
  auditAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text
  },
  methodBadge: {
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  methodBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.primary
  },
  noTxnsBox: {
    padding: 20,
    alignItems: 'center'
  },
  noTxnsText: {
    fontSize: 13,
    color: theme.textMuted
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12
  },
  closeBusinessBtn: {
    backgroundColor: theme.danger,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow
  },
  closeBusinessBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  closeBusinessBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  }
});

export default CloseBusinessModal;
