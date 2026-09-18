import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useStyles } from '../context/ThemeContext';
import { AppTheme } from '../theme/colors';
import { Product } from '../types';
import { formatCurrency } from '../utils/currency';

interface ProductDetailModalProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onAddToCart?: (product: Product, quantity: number) => void;
  inCartQuantity?: number;
}

export function ProductDetailModal({
  visible,
  product,
  onClose,
  onAddToCart,
  inCartQuantity = 0
}: ProductDetailModalProps) {
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (visible) {
      setQuantity(1);
    }
  }, [visible, product]);

  if (!product) return null;

  const isOutOfStock = product.stock_quantity <= 0;
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= product.reorder_level;
  const maxAvailable = Math.max(0, product.stock_quantity - inCartQuantity);

  const handleIncrement = () => {
    if (quantity < maxAvailable) {
      setQuantity((q) => q + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  const handleAdd = () => {
    if (onAddToCart && quantity > 0 && !isOutOfStock) {
      onAddToCart(product, quantity);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{product.category || 'General'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Title & Product ID */}
            <Text style={styles.productName}>{product.name}</Text>

            <View style={styles.idChip}>
              <Ionicons name="barcode-outline" size={16} color={theme.primary} />
              <Text style={styles.idChipText}>{product.id}</Text>
            </View>

            {/* Price & Stock Badges */}
            <View style={styles.metricRow}>
              <View style={styles.priceCol}>
                <Text style={styles.metricLabel}>Retail Price</Text>
                <Text style={styles.priceValue}>{formatCurrency(product.price, product.currency_symbol)}</Text>
              </View>

              <View style={styles.stockCol}>
                <Text style={styles.metricLabel}>Inventory Status</Text>
                <View style={[
                  styles.stockBadge,
                  isOutOfStock ? styles.stockBadgeOOS : isLowStock ? styles.stockBadgeLow : styles.stockBadgeInStock
                ]}>
                  <Ionicons
                    name={isOutOfStock ? 'close-circle' : isLowStock ? 'warning' : 'checkmark-circle'}
                    size={14}
                    color={isOutOfStock ? theme.danger : isLowStock ? theme.warning : theme.accent}
                  />
                  <Text style={[
                    styles.stockBadgeText,
                    isOutOfStock ? styles.stockTextOOS : isLowStock ? styles.stockTextLow : styles.stockTextInStock
                  ]}>
                    {isOutOfStock ? 'Out of Stock' : `${product.stock_quantity} available`}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Description Section (Stored in Database) */}
            <View style={styles.descSection}>
              <View style={styles.descHeaderRow}>
                <Ionicons name="document-text-outline" size={16} color={theme.textSecondary} />
                <Text style={styles.descSectionTitle}>Product Description</Text>
              </View>
              <Text style={styles.descBody}>
                {product.description && product.description.trim().length > 0
                  ? product.description
                  : 'No detailed description stored for this item in the database.'}
              </Text>
            </View>

            {/* Shop Scope Info if present */}
            {(product.shop_name || product.shop_code) && (
              <View style={styles.shopScopeBox}>
                <Ionicons name="storefront-outline" size={15} color={theme.textMuted} />
                <Text style={styles.shopScopeText}>
                  Assigned Store: {product.shop_name || 'Primary Store'} ({product.shop_code || 'SHP'})
                </Text>
              </View>
            )}

            {/* In Cart Notice */}
            {inCartQuantity > 0 && (
              <View style={styles.inCartNotice}>
                <Ionicons name="cart" size={15} color={theme.primary} />
                <Text style={styles.inCartNoticeText}>
                  {inCartQuantity} unit{inCartQuantity === 1 ? '' : 's'} already in active cart
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Quantity & Add Action */}
          {onAddToCart && (
            <View style={styles.footer}>
              {!isOutOfStock ? (
                <View style={styles.footerInner}>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      onPress={handleDecrement}
                      style={[styles.stepperBtn, quantity <= 1 && { opacity: 0.4 }]}
                      disabled={quantity <= 1}
                    >
                      <Ionicons name="remove" size={18} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{quantity}</Text>
                    <TouchableOpacity
                      onPress={handleIncrement}
                      style={[styles.stepperBtn, quantity >= maxAvailable && { opacity: 0.4 }]}
                      disabled={quantity >= maxAvailable}
                    >
                      <Ionicons name="add" size={18} color={theme.text} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.addBtn, (isOutOfStock || maxAvailable <= 0) && { opacity: 0.5 }]}
                    onPress={handleAdd}
                    disabled={isOutOfStock || maxAvailable <= 0}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="cart" size={18} color="#ffffff" />
                    <Text style={styles.addBtnText} numberOfLines={1} adjustsFontSizeToFit>
                      Add to Cart • {formatCurrency(quantity * product.price, product.currency_symbol)}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.outOfStockBanner}>
                  <Ionicons name="alert-circle" size={16} color={theme.danger} />
                  <Text style={styles.outOfStockText}>This item is currently out of stock.</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    width: '100%',
    maxWidth: 460,
    maxHeight: '85%',
    overflow: 'hidden',
    ...theme.shadow
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10
  },
  categoryBadge: {
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  categoryText: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: theme.surfaceLight
  },
  scroll: {
    paddingHorizontal: 20
  },
  productName: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: -0.4,
    lineHeight: 26,
    marginBottom: 8
  },
  idChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    marginBottom: 16
  },
  idChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.surfaceLight,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  priceCol: {},
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.accent
  },
  stockCol: {
    alignItems: 'flex-end'
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  stockBadgeInStock: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)'
  },
  stockBadgeLow: {
    backgroundColor: 'rgba(217, 119, 6, 0.1)'
  },
  stockBadgeOOS: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)'
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: '700'
  },
  stockTextInStock: {
    color: theme.accent
  },
  stockTextLow: {
    color: theme.warning
  },
  stockTextOOS: {
    color: theme.danger
  },
  divider: {
    height: 1,
    backgroundColor: theme.surfaceBorder,
    marginVertical: 16
  },
  descSection: {
    marginBottom: 16
  },
  descHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8
  },
  descSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  descBody: {
    fontSize: 14,
    color: theme.text,
    lineHeight: 22
  },
  shopScopeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.surfaceLight,
    borderRadius: 8,
    marginBottom: 14
  },
  shopScopeText: {
    fontSize: 12,
    color: theme.textSecondary
  },
  inCartNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(79, 70, 229, 0.06)',
    borderRadius: 8,
    marginBottom: 16
  },
  inCartNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.primary
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.surfaceBorder,
    backgroundColor: theme.surface
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  stepperBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  stepperValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
    minWidth: 26,
    textAlign: 'center'
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.primary,
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRadius: 10,
    ...theme.shadow
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1
  },
  outOfStockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderRadius: 8
  },
  outOfStockText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.danger
  }
});
