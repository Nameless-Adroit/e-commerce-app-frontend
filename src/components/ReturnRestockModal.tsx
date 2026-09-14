import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/colors';
import { Product } from '../types';
import { productApi } from '../services/api';

interface ReturnRestockModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProduct?: Product | null;
  products?: Product[];
}

const COMMON_REASONS = [
  'Customer Return - Unopened Item',
  'Customer Exchange - Size/Color',
  'Customer Cancellation',
  'Defective Return (Inspected/Restocked)',
  'Wrong Item Delivered - Returned',
];

export function ReturnRestockModal({
  visible,
  onClose,
  onSuccess,
  initialProduct,
  products = [],
}: ReturnRestockModalProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (visible) {
      if (initialProduct) {
        setSelectedProductId(initialProduct.id);
      } else if (products.length > 0) {
        setSelectedProductId(products[0].id);
      } else {
        setSelectedProductId('');
      }
      setQuantity(1);
      setReason(COMMON_REASONS[0]);
      setCustomReason('');
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [visible, initialProduct, products]);

  const selectedProduct =
    initialProduct && initialProduct.id === selectedProductId
      ? initialProduct
      : products.find((p) => p.id === selectedProductId);

  const handleIncrement = () => setQuantity((prev) => prev + 1);
  const handleDecrement = () => setQuantity((prev) => Math.max(1, prev - 1));

  const handleSubmit = async () => {
    if (!selectedProductId) {
      setErrorMsg('Please select a product to restock.');
      return;
    }

    if (quantity <= 0) {
      setErrorMsg('Quantity must be at least 1.');
      return;
    }

    const finalReason = reason === 'Other' ? customReason.trim() : reason;
    if (!finalReason) {
      setErrorMsg('Please enter or choose a reason for the return.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await productApi.restock(selectedProductId, quantity, `[RETURN] ${finalReason}`, 'return');
      Alert.alert(
        'Return Processed',
        `Successfully restocked ${quantity} unit(s) of ${selectedProduct?.name || selectedProductId} back to inventory.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to process return restock';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.topBar}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="arrow-undo-outline" size={20} color={theme.secondary} />
              </View>
              <View>
                <Text style={styles.title}>Process Customer Return</Text>
                <Text style={styles.subtitle}>Restock returned items back to shelf inventory</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Error Banner */}
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={theme.danger} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Product Info / Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TARGET PRODUCT</Text>
              {initialProduct ? (
                <View style={styles.selectedProductCard}>
                  <View style={styles.productIconWrap}>
                    <Ionicons name="cube-outline" size={20} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName} numberOfLines={1}>{initialProduct.name}</Text>
                    <Text style={styles.productIdText}>{initialProduct.id}</Text>
                    <Text style={styles.currentStockText}>
                      Current Shelf Stock: <Text style={styles.stockHighlight}>{initialProduct.stock_quantity} units</Text>
                    </Text>
                  </View>
                </View>
              ) : products.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productPickerScroll}>
                  {products.map((p) => {
                    const isSelected = p.id === selectedProductId;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => setSelectedProductId(p.id)}
                        style={[styles.productPill, isSelected && styles.productPillActive]}
                      >
                        <Text style={[styles.productPillName, isSelected && styles.productPillTextActive]} numberOfLines={1}>
                          {p.name}
                        </Text>
                        <Text style={[styles.productPillStock, isSelected && styles.productPillTextActive]}>
                          Stock: {p.stock_quantity}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter Product ID (e.g. PRD-SHP01-...)"
                  placeholderTextColor={theme.textMuted}
                  value={selectedProductId}
                  onChangeText={setSelectedProductId}
                  autoCapitalize="characters"
                />
              )}
            </View>

            {/* Quantity Stepper */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>RETURN QUANTITY</Text>
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={handleDecrement}
                  disabled={quantity <= 1}
                >
                  <Ionicons name="remove" size={22} color={quantity <= 1 ? theme.textMuted : theme.text} />
                </TouchableOpacity>

                <View style={styles.qtyDisplay}>
                  <Text style={styles.qtyNumber}>{quantity}</Text>
                  <Text style={styles.qtySubtext}>unit{quantity > 1 ? 's' : ''} to restock</Text>
                </View>

                <TouchableOpacity style={styles.stepperBtn} onPress={handleIncrement}>
                  <Ionicons name="add" size={22} color={theme.text} />
                </TouchableOpacity>
              </View>

              {selectedProduct && (
                <Text style={styles.newStockPreview}>
                  New Stock After Restock: <Text style={styles.newStockHighlight}>{selectedProduct.stock_quantity + quantity} units</Text>
                </Text>
              )}
            </View>

            {/* Return Reason */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>RETURN REASON / AUDIT NOTE</Text>
              <View style={styles.reasonsList}>
                {COMMON_REASONS.map((r) => {
                  const isSelected = reason === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setReason(r)}
                      style={[styles.reasonChip, isSelected && styles.reasonChipActive]}
                    >
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={15}
                        color={isSelected ? theme.secondary : theme.textMuted}
                      />
                      <Text style={[styles.reasonChipText, isSelected && styles.reasonChipTextActive]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  onPress={() => setReason('Other')}
                  style={[styles.reasonChip, reason === 'Other' && styles.reasonChipActive]}
                >
                  <Ionicons
                    name={reason === 'Other' ? 'radio-button-on' : 'radio-button-off'}
                    size={15}
                    color={reason === 'Other' ? theme.secondary : theme.textMuted}
                  />
                  <Text style={[styles.reasonChipText, reason === 'Other' && styles.reasonChipTextActive]}>
                    Custom Reason / Specific Note
                  </Text>
                </TouchableOpacity>
              </View>

              {reason === 'Other' && (
                <TextInput
                  style={[styles.textInput, { marginTop: 8 }]}
                  placeholder="Describe reason for return (e.g. customer returned item in good box)..."
                  placeholderTextColor={theme.textMuted}
                  value={customReason}
                  onChangeText={setCustomReason}
                />
              )}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, isSubmitting && styles.confirmBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="arrow-undo-circle" size={18} color="#ffffff" />
                  <Text style={styles.confirmBtnText}>Confirm Restock ({quantity})</Text>
                </>
              )}
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.xl,
    padding: 20,
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: theme.surfaceLight,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: theme.radius.md,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: theme.danger,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  selectedProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.md,
    padding: 12,
  },
  productIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
  },
  productIdText: {
    color: theme.textMuted,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  currentStockText: {
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  stockHighlight: {
    fontWeight: '700',
    color: theme.text,
  },
  productPickerScroll: {
    flexDirection: 'row',
  },
  productPill: {
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    minWidth: 110,
  },
  productPillActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderColor: theme.primary,
  },
  productPillName: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '600',
  },
  productPillStock: {
    color: theme.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  productPillTextActive: {
    color: theme.primary,
  },
  textInput: {
    backgroundColor: theme.inputBg,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    borderRadius: theme.radius.md,
    color: theme.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.md,
    padding: 6,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyDisplay: {
    alignItems: 'center',
  },
  qtyNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.text,
  },
  qtySubtext: {
    fontSize: 11,
    color: theme.textMuted,
    marginTop: 2,
  },
  newStockPreview: {
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  newStockHighlight: {
    color: theme.secondary,
    fontWeight: '700',
  },
  reasonsList: {
    gap: 8,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  reasonChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: theme.secondary,
  },
  reasonChipText: {
    color: theme.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  reasonChipTextActive: {
    color: theme.text,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.surfaceBorder,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.secondary,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
