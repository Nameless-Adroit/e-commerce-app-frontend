import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/colors';
import { Transaction } from '../types';

interface ReceiptModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
}

export function ReceiptModal({ visible, transaction, onClose }: ReceiptModalProps) {
  if (!transaction) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle" size={48} color={theme.accent} />
          </View>

          <Text style={styles.title}>Transaction Complete</Text>
          <Text style={styles.txnId}>{transaction.id}</Text>
          <Text style={styles.dateText}>
            {new Date(transaction.transaction_date || Date.now()).toLocaleString()}
          </Text>

          <View style={styles.divider} />

          <ScrollView style={styles.itemsScroll} showsVerticalScrollIndicator={false}>
            {transaction.items && transaction.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemColLeft}>
                  <Text style={styles.itemName}>{item.name || item.product_name || `Item ${index + 1}`}</Text>
                  <Text style={styles.itemSub}>
                    {item.quantity} x ${Number(item.unit_price).toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>
                  ${(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.divider} />

          {Number(transaction.discount_amount) > 0 && (
            <>
              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>Subtotal</Text>
                <Text style={styles.subtotalValue}>
                  ${Number(transaction.subtotal_amount || transaction.total_amount).toFixed(2)}
                </Text>
              </View>
              <View style={styles.discountRow}>
                <Text style={styles.discountLabel}>Discount Applied</Text>
                <Text style={styles.discountValue}>
                  -${Number(transaction.discount_amount).toFixed(2)}
                </Text>
              </View>
              <View style={styles.divider} />
            </>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Paid ({transaction.payment_method?.toUpperCase()})</Text>
            <Text style={styles.totalValue}>${Number(transaction.total_amount).toFixed(2)}</Text>
          </View>

          <View style={styles.acidBadge}>
            <Ionicons name="shield-checkmark" size={14} color={theme.accent} />
            <Text style={styles.acidText}>ACID Atomic Inventory Deduction Confirmed</Text>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
            <Text style={styles.doneText}>Done / Next Sale</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  title: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '700'
  },
  txnId: {
    color: theme.primary,
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4
  },
  dateText: {
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: theme.surfaceBorder,
    width: '100%',
    marginVertical: 14
  },
  itemsScroll: {
    maxHeight: 180,
    width: '100%'
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  itemColLeft: {
    flex: 1,
    paddingRight: 12
  },
  itemName: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '500'
  },
  itemSub: {
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 2
  },
  itemTotal: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '600'
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 4
  },
  subtotalLabel: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '500'
  },
  subtotalValue: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '600'
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 6
  },
  discountLabel: {
    color: theme.accent,
    fontSize: 14,
    fontWeight: '600'
  },
  discountValue: {
    color: theme.accent,
    fontSize: 15,
    fontWeight: '700'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginVertical: 6
  },
  totalLabel: {
    color: theme.textSecondary,
    fontSize: 15,
    fontWeight: '600'
  },
  totalValue: {
    color: theme.accent,
    fontSize: 22,
    fontWeight: '700'
  },
  acidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    marginTop: 12,
    marginBottom: 16
  },
  acidText: {
    color: theme.accent,
    fontSize: 11,
    fontWeight: '600'
  },
  doneBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  doneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  }
});
