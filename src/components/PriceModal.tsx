import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useTheme, useStyles } from '../context/ThemeContext';
import { AppTheme } from '../theme/colors';
import { Product } from '../types';
import { productApi } from '../services/api';
import { formatCurrency } from '../utils/currency';

interface PriceModalProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function PriceModal({ visible, product, onClose, onSuccess }: PriceModalProps) {
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setPrice(String(product.price));
      setCostPrice(String(product.cost_price || ''));
      setReorderLevel(String(product.reorder_level || '5'));
    }
  }, [product]);

  if (!product) return null;

  const handleUpdate = async () => {
    const numPrice = parseFloat(price);
    const numCost = parseFloat(costPrice) || 0;
    const numReorder = parseInt(reorderLevel, 10) || 5;

    if (isNaN(numPrice) || numPrice < 0) {
      Alert.alert('Invalid Price', 'Please enter a valid retail price.');
      return;
    }

    setLoading(true);
    try {
      await productApi.updateProduct(product.id, {
        price: numPrice,
        cost_price: numCost,
        reorder_level: numReorder
      });
      Alert.alert(
        'Pricing Updated',
        `Price for ${product.name} updated to ${formatCurrency(numPrice, product.currency_symbol)}.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Failed to update pricing');
    } finally {
      setLoading(false);
    }
  };

  const symbol = product.currency_symbol || 'TSh';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Text style={styles.title}>Update Product Pricing</Text>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productId}>ID: {product.id}</Text>

          <Text style={styles.label}>Selling Price ({symbol})</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={theme.textMuted}
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />

          <Text style={styles.label}>Cost / Wholesale Price ({symbol})</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={theme.textMuted}
            keyboardType="numeric"
            value={costPrice}
            onChangeText={setCostPrice}
          />

          <Text style={styles.label}>Low-Stock Reorder Threshold (Units)</Text>
          <TextInput
            style={styles.input}
            placeholder="5"
            placeholderTextColor={theme.textMuted}
            keyboardType="number-pad"
            value={reorderLevel}
            onChangeText={setReorderLevel}
          />

          <View style={styles.btnRow}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, styles.cancelBtn]} disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleUpdate} style={[styles.btn, styles.confirmBtn]} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Save Pricing</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
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
    maxWidth: 420,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4
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
    marginBottom: 16
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
