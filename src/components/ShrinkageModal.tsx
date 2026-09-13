import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { theme } from '../theme/colors';
import { Product } from '../types';
import { productApi } from '../services/api';

interface ShrinkageModalProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ShrinkageModal({ visible, product, onClose, onSuccess }: ShrinkageModalProps) {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Damaged during storage / handling');
  const [loading, setLoading] = useState(false);

  if (!product) return null;

  const handleRecord = async () => {
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a positive number of damaged or lost units.');
      return;
    }

    if (qty > product.stock_quantity) {
      Alert.alert('Excess Quantity', `Cannot log shrinkage of ${qty} units when only ${product.stock_quantity} are in stock.`);
      return;
    }

    setLoading(true);
    try {
      await productApi.recordShrinkage(product.id, qty, reason);
      Alert.alert(
        'Shrinkage Logged', 
        `Recorded ${qty} lost/damaged units for ${product.name}. Cost impact: $${(qty * (product.cost_price || 0)).toFixed(2)}`
      );
      setQuantity('');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Failed to Record', err.message || 'Error recording inventory shrinkage');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Record Inventory Shrinkage</Text>
          </View>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productId}>ID: {product.id}</Text>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Shrinkage permanently deducts lost/damaged units from available inventory and records an audit log for end-of-day analytics.
            </Text>
          </View>

          <Text style={styles.label}>Units Lost / Damaged (-)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2"
            placeholderTextColor={theme.textMuted}
            keyboardType="number-pad"
            value={quantity}
            onChangeText={setQuantity}
          />

          <Text style={styles.label}>Reason for Discrepancy</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Broken in transit, expired, stolen"
            placeholderTextColor={theme.textMuted}
            value={reason}
            onChangeText={setReason}
          />

          <View style={styles.btnRow}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, styles.cancelBtn]} disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleRecord} style={[styles.btn, styles.dangerBtn]} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.dangerText}>Log Shrinkage</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: theme.radius.lg,
    padding: 24,
    width: '100%',
    maxWidth: 420
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    color: theme.danger,
    fontSize: 18,
    fontWeight: '700'
  },
  productName: {
    color: theme.text,
    fontSize: 15,
    marginTop: 6,
    fontWeight: '600'
  },
  productId: {
    color: theme.textMuted,
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 2
  },
  warningBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: theme.radius.md,
    padding: 10,
    marginVertical: 14
  },
  warningText: {
    color: '#FCA5A5',
    fontSize: 12,
    lineHeight: 18
  },
  label: {
    color: theme.textSecondary,
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '600'
  },
  input: {
    backgroundColor: theme.inputBg,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    borderRadius: theme.radius.md,
    color: theme.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 14
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelBtn: {
    backgroundColor: theme.surfaceLight
  },
  cancelText: {
    color: theme.textSecondary,
    fontWeight: '600'
  },
  dangerBtn: {
    backgroundColor: theme.danger
  },
  dangerText: {
    color: '#fff',
    fontWeight: '700'
  }
});
