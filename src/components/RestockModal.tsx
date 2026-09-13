import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { theme } from '../theme/colors';
import { Product } from '../types';
import { productApi } from '../services/api';

interface RestockModalProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function RestockModal({ visible, product, onClose, onSuccess }: RestockModalProps) {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Supplier shipment restock');
  const [loading, setLoading] = useState(false);

  if (!product) return null;

  const handleRestock = async () => {
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a positive number of units to add.');
      return;
    }

    setLoading(true);
    try {
      await productApi.restock(product.id, qty, reason);
      Alert.alert('Stock Updated', `Added ${qty} units to ${product.name}. New total: ${product.stock_quantity + qty}`);
      setQuantity('');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Error Restocking', err.message || 'Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Text style={styles.title}>Restock Product</Text>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productId}>ID: {product.id}</Text>

          <View style={styles.stockOverview}>
            <Text style={styles.stockText}>Current Stock: <Text style={styles.stockHighlight}>{product.stock_quantity}</Text> units</Text>
          </View>

          <Text style={styles.label}>Units to Add (+)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 20"
            placeholderTextColor={theme.textMuted}
            keyboardType="number-pad"
            value={quantity}
            onChangeText={setQuantity}
          />

          <Text style={styles.label}>Reason / Shipment Note</Text>
          <TextInput
            style={styles.input}
            placeholder="Reason for restock"
            placeholderTextColor={theme.textMuted}
            value={reason}
            onChangeText={setReason}
          />

          <View style={styles.btnRow}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, styles.cancelBtn]} disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleRestock} style={[styles.btn, styles.confirmBtn]} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Increment Stock</Text>}
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.lg,
    padding: 24,
    width: '100%',
    maxWidth: 420
  },
  title: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '700'
  },
  productName: {
    color: theme.textSecondary,
    fontSize: 15,
    marginTop: 4
  },
  productId: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'monospace',
    marginTop: 2
  },
  stockOverview: {
    backgroundColor: theme.surfaceLight,
    padding: 12,
    borderRadius: theme.radius.md,
    marginVertical: 14
  },
  stockText: {
    color: theme.textSecondary,
    fontSize: 14
  },
  stockHighlight: {
    color: theme.accent,
    fontWeight: '700',
    fontSize: 16
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
  confirmBtn: {
    backgroundColor: theme.primary
  },
  confirmText: {
    color: '#fff',
    fontWeight: '700'
  }
});
