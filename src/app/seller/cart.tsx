import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { ReceiptModal } from '../../components/ReceiptModal';
import { useCart } from '../../context/CartContext';
import { posApi } from '../../services/api';
import { useTheme, useStyles } from '../../context/ThemeContext';
import { AppTheme } from '../../theme/colors';
import { Transaction, CheckoutTransaction } from '../../types';
import { formatCurrency } from '../../utils/currency';

export default function SellerCartScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  const { items, updateQuantity, updateItemPrice, removeItem, clearCart, totalAmount, totalUnits } = useCart();

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile_money'>('cash');
  const [checkingOut, setCheckingOut] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [completedTxn, setCompletedTxn] = useState<Transaction | null>(null);

  // Editable Price State for Seller Override
  const [editingPriceItem, setEditingPriceItem] = useState<{
    productId: string;
    name: string;
    currentPrice: number;
    catalogPrice: number;
    currencySymbol: string;
  } | null>(null);
  const [priceInputText, setPriceInputText] = useState('');

  // Cashier Discount State
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [discountInput, setDiscountInput] = useState<string>('');

  const currencySymbol = items[0]?.product.currency_symbol || 'TSh';

  // Computations
  const subtotal = totalAmount;
  const rawDiscountValue = Math.max(0, parseFloat(discountInput) || 0);
  const calculatedDiscount = discountType === 'percent'
    ? (subtotal * rawDiscountValue) / 100
    : rawDiscountValue;
  const finalDiscount = Math.min(subtotal, parseFloat(calculatedDiscount.toFixed(2)));
  const finalPayableTotal = Math.max(0, parseFloat((subtotal - finalDiscount).toFixed(2)));

  const handleClearCartPrompt = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from the current transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            clearCart();
            setDiscountInput('');
          }
        }
      ]
    );
  };

  const handleApplyPresetDiscount = (val: string, type: 'fixed' | 'percent') => {
    setDiscountType(type);
    setDiscountInput(val);
  };

  const handleSaveEditedPrice = () => {
    if (!editingPriceItem) return;
    const newPrice = parseFloat(priceInputText);
    if (isNaN(newPrice) || newPrice < 0) {
      Alert.alert('Invalid Price', 'Please enter a valid non-negative number for the unit price.');
      return;
    }
    updateItemPrice(editingPriceItem.productId, newPrice);
    setEditingPriceItem(null);
  };

  const handleResetCatalogPrice = () => {
    if (!editingPriceItem) return;
    updateItemPrice(editingPriceItem.productId, editingPriceItem.catalogPrice);
    setEditingPriceItem(null);
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Please scan or add at least one product before proceeding to checkout.');
      return;
    }

    setCheckingOut(true);
    try {
      const checkoutItems = items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        unitPrice: i.customPrice !== undefined ? i.customPrice : i.product.price
      }));

      const res = await posApi.checkout(
        checkoutItems,
        paymentMethod,
        undefined,
        finalDiscount
      );

      if (res.data) {
        setCompletedTxn(toReceiptTransaction(res.data));
        setReceiptVisible(true);
        clearCart();
        setDiscountInput('');
      }
    } catch (err: any) {
      Alert.alert('Checkout Failed', err.message || 'Error processing transaction.');
    } finally {
      setCheckingOut(false);
    }
  };


  return (
    <View style={styles.container}>
      <Header
        title="Transaction Cart"
        subtitle={`${totalUnits} unit${totalUnits === 1 ? '' : 's'} staged for checkout`}
        rightAction={
          items.length > 0 ? (
            <TouchableOpacity onPress={handleClearCartPrompt} style={styles.clearHeaderBtn}>
              <Ionicons name="trash-outline" size={18} color={theme.danger} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="cart-outline" size={54} color={theme.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Your cart is currently empty</Text>
            <Text style={styles.emptySub}>
              Scan barcodes or tap products from the Counter shelf to stage items for purchase.
            </Text>
            <TouchableOpacity
              style={styles.goToCounterBtn}
              onPress={() => router.push('/seller' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="barcode-outline" size={18} color="#ffffff" />
              <Text style={styles.goToCounterText}>Go to Counter / Scanner</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Cart Items List */}
            <View style={styles.listSection}>
              <Text style={styles.sectionHeader}>Line Items ({items.length})</Text>

              {items.map((item) => {
                const itemSymbol = item.product.currency_symbol || currencySymbol;
                const effectivePrice = item.customPrice !== undefined ? item.customPrice : item.product.price;
                const isCustomPrice = item.customPrice !== undefined && item.customPrice !== item.product.price;

                return (
                  <View key={item.product.id} style={styles.cartCard}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.product.name}
                      </Text>
                      <Text style={styles.itemId}>
                        ID: {item.product.id} • {item.product.category}
                      </Text>

                      {/* Price Display with Custom Price indicator */}
                      <View style={styles.priceRow}>
                        <Text style={[styles.itemPrice, isCustomPrice && styles.customItemPrice]}>
                          {formatCurrency(effectivePrice, itemSymbol)} each
                        </Text>
                        {isCustomPrice && (
                          <View style={styles.customPriceBadge}>
                            <Text style={styles.customPriceBadgeText}>Overridden</Text>
                          </View>
                        )}
                      </View>

                      {isCustomPrice && (
                        <Text style={styles.catalogPriceStrikethrough}>
                          Catalog: {formatCurrency(item.product.price, itemSymbol)}
                        </Text>
                      )}

                      {/* Edit Price Trigger */}
                      <TouchableOpacity
                        style={styles.editPriceTriggerBtn}
                        onPress={() => {
                          setEditingPriceItem({
                            productId: item.product.id,
                            name: item.product.name,
                            currentPrice: effectivePrice,
                            catalogPrice: item.product.price,
                            currencySymbol: itemSymbol
                          });
                          setPriceInputText(String(effectivePrice));
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="pencil-outline" size={13} color={theme.primary} />
                        <Text style={styles.editPriceTriggerText}>
                          {isCustomPrice ? 'Change / Reset Price' : 'Edit Sale Price'}
                        </Text>
                      </TouchableOpacity>

                      <Text style={styles.stockNotice}>
                        {item.product.stock_quantity} available in shop
                      </Text>
                    </View>

                    <View style={styles.actionCol}>
                      {/* Stepper */}
                      <View style={styles.stepper}>
                        <TouchableOpacity
                          onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                          style={styles.stepperBtn}
                        >
                          <Ionicons name="remove" size={16} color={theme.text} />
                        </TouchableOpacity>

                        <Text style={styles.stepperQty}>{item.quantity}</Text>

                        <TouchableOpacity
                          onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                          style={[
                            styles.stepperBtn,
                            item.quantity >= item.product.stock_quantity && { opacity: 0.3 }
                          ]}
                          disabled={item.quantity >= item.product.stock_quantity}
                        >
                          <Ionicons name="add" size={16} color={theme.text} />
                        </TouchableOpacity>
                      </View>

                      {/* Subtotal */}
                      <Text style={styles.subtotalText}>
                        {formatCurrency(item.quantity * effectivePrice, itemSymbol)}
                      </Text>

                      {/* Remove button */}
                      <TouchableOpacity
                        onPress={() => removeItem(item.product.id)}
                        style={styles.removeBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color={theme.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Cashier Discount Section */}
            <View style={styles.discountSection}>
              <View style={styles.discountHeaderRow}>
                <View style={styles.discountTitleLeft}>
                  <Ionicons name="pricetag-outline" size={18} color={theme.accent} />
                  <Text style={styles.sectionHeader}>Checkout Discount</Text>
                </View>
                {finalDiscount > 0 && (
                  <TouchableOpacity onPress={() => setDiscountInput('')}>
                    <Text style={styles.removeDiscountText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Quick Preset Buttons */}
              <View style={styles.presetRow}>
                {[
                  { label: '5%', val: '5', type: 'percent' as const },
                  { label: '10%', val: '10', type: 'percent' as const },
                  { label: '15%', val: '15', type: 'percent' as const },
                  { label: `${currencySymbol} 2,000`, val: '2000', type: 'fixed' as const },
                  { label: `${currencySymbol} 5,000`, val: '5000', type: 'fixed' as const },
                  { label: `${currencySymbol} 10,000`, val: '10000', type: 'fixed' as const },
                ].map((p) => {
                  const isPresetActive = discountType === p.type && discountInput === p.val;
                  return (
                    <TouchableOpacity
                      key={p.label}
                      style={[styles.presetChip, isPresetActive && styles.presetChipActive]}
                      onPress={() => handleApplyPresetDiscount(p.val, p.type)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.presetChipText, isPresetActive && styles.presetChipTextActive]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Input & Type Toggle */}
              <View style={styles.customDiscountRow}>
                <View style={styles.typeToggle}>
                  <TouchableOpacity
                    style={[styles.typeBtn, discountType === 'fixed' && styles.typeBtnActive]}
                    onPress={() => setDiscountType('fixed')}
                  >
                    <Text style={[styles.typeBtnText, discountType === 'fixed' && styles.typeBtnTextActive]}>
                      {currencySymbol} Fixed
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeBtn, discountType === 'percent' && styles.typeBtnActive]}
                    onPress={() => setDiscountType('percent')}
                  >
                    <Text style={[styles.typeBtnText, discountType === 'percent' && styles.typeBtnTextActive]}>
                      % Percent
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.discountInputBox}>
                  <Text style={styles.currencyPrefix}>{discountType === 'fixed' ? currencySymbol : '%'}</Text>
                  <TextInput
                    style={styles.discountInput}
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={discountInput}
                    onChangeText={setDiscountInput}
                  />
                  {discountInput.length > 0 && (
                    <TouchableOpacity onPress={() => setDiscountInput('')} style={{ padding: 4 }}>
                      <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {finalDiscount > 0 && (
                <View style={styles.discountAppliedNotice}>
                  <Ionicons name="checkmark-circle" size={15} color={theme.accent} />
                  <Text style={styles.discountAppliedText}>
                    Applying -{formatCurrency(finalDiscount, currencySymbol)} discount to order
                  </Text>
                </View>
              )}
            </View>

            {/* Payment Method Selector */}
            <View style={styles.paymentSection}>
              <Text style={styles.sectionHeader}>Payment Method</Text>
              <View style={styles.paymentGrid}>
                {(['cash', 'card', 'mobile_money'] as const).map((method) => {
                  const isActive = paymentMethod === method;
                  return (
                    <TouchableOpacity
                      key={method}
                      style={[styles.paymentCard, isActive && styles.paymentCardActive]}
                      onPress={() => setPaymentMethod(method)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={
                          method === 'cash'
                            ? 'cash-outline'
                            : method === 'card'
                            ? 'card-outline'
                            : 'phone-portrait-outline'
                        }
                        size={22}
                        color={isActive ? theme.primary : theme.textSecondary}
                      />
                      <Text style={[styles.paymentCardText, isActive && styles.paymentCardTextActive]}>
                        {method === 'cash' ? 'Cash' : method === 'card' ? 'Card' : 'Mobile Pay'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Order Summary & Checkout Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order Summary</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Units</Text>
                <Text style={styles.summaryValue}>{totalUnits} items</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatCurrency(subtotal, currencySymbol)}</Text>
              </View>

              {finalDiscount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.accent, fontWeight: '600' }]}>
                    Discount ({discountType === 'percent' ? `${rawDiscountValue}%` : 'Fixed'})
                  </Text>
                  <Text style={[styles.summaryValue, { color: theme.accent, fontWeight: '700' }]}>
                    -{formatCurrency(finalDiscount, currencySymbol)}
                  </Text>
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Payment Mode</Text>
                <Text style={styles.summaryValue}>
                  {paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'card' ? 'Debit/Credit' : 'Mobile Money'}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total Payable</Text>
                <Text style={styles.totalValue}>{formatCurrency(finalPayableTotal, currencySymbol)}</Text>
              </View>

              <TouchableOpacity
                style={[styles.checkoutBtn, checkingOut && { opacity: 0.7 }]}
                onPress={handleCheckout}
                disabled={checkingOut}
                activeOpacity={0.85}
              >
                {checkingOut ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View style={styles.checkoutBtnContent}>
                    <Ionicons name="shield-checkmark" size={20} color="#ffffff" />
                    <Text style={styles.checkoutBtnText}>
                      Complete Sale • {formatCurrency(finalPayableTotal, currencySymbol)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Edit Unit Price Modal */}
      <Modal
        visible={!!editingPriceItem}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingPriceItem(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.editPriceModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleCol}>
                <Text style={styles.modalHeaderTitle}>Adjust Unit Price</Text>
                <Text style={styles.modalHeaderSubtitle}>For this sale transaction only</Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditingPriceItem(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {editingPriceItem && (
              <>
                <Text style={styles.modalProductName}>{editingPriceItem.name}</Text>
                <Text style={styles.modalProductId}>ID: {editingPriceItem.productId}</Text>

                <View style={styles.catalogPriceBox}>
                  <Text style={styles.catalogPriceBoxLabel}>Catalog Price:</Text>
                  <Text style={styles.catalogPriceBoxVal}>
                    {formatCurrency(editingPriceItem.catalogPrice, editingPriceItem.currencySymbol)}
                  </Text>
                </View>

                <Text style={styles.inputFieldLabel}>New Selling Price per Unit:</Text>
                <View style={styles.modalInputWrapper}>
                  <Text style={styles.modalCurrencySymbol}>{editingPriceItem.currencySymbol}</Text>
                  <TextInput
                    style={styles.modalPriceInput}
                    keyboardType="numeric"
                    value={priceInputText}
                    onChangeText={setPriceInputText}
                    autoFocus
                    selectTextOnFocus
                    placeholder="Enter price"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>

                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={styles.resetCatalogBtn}
                    onPress={handleResetCatalogPrice}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.resetCatalogBtnText}>Reset to Catalog</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.applyPriceBtn}
                    onPress={handleSaveEditedPrice}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.applyPriceBtnText}>Apply Price</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* POS Receipt Modal */}
      <ReceiptModal
        visible={receiptVisible}
        transaction={completedTxn}
        onClose={() => setReceiptVisible(false)}
      />
    </View>
  );
}

function toReceiptTransaction(transaction: CheckoutTransaction): Transaction {
  return {
    ...transaction,
    id: transaction.transaction_id,
    subtotal_amount: transaction.subtotal_amount,
    discount_amount: transaction.discount_amount,
    transaction_date: new Date().toISOString()
  };
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  clearHeaderBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.08)'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    paddingHorizontal: 24
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8
  },
  emptySub: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24
  },
  goToCounterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    ...theme.shadow
  },
  goToCounterText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  listSection: {
    marginBottom: 20
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10
  },
  cartCard: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    ...theme.shadow
  },
  itemInfo: {
    flex: 1,
    marginRight: 12
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 3
  },
  itemId: {
    fontSize: 11,
    color: theme.textMuted,
    marginBottom: 4
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.accent
  },
  stockNotice: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 2
  },
  actionCol: {
    alignItems: 'flex-end',
    gap: 6
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  stepperBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  stepperQty: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
    minWidth: 24,
    textAlign: 'center'
  },
  subtotalText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text
  },
  removeBtn: {
    padding: 4
  },
  discountSection: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    marginBottom: 20,
    ...theme.shadow
  },
  discountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  discountTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  removeDiscountText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.danger
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  presetChipActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    borderColor: theme.accent
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary
  },
  presetChipTextActive: {
    color: theme.accent,
    fontWeight: '700'
  },
  customDiscountRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center'
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    padding: 2
  },
  typeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  typeBtnActive: {
    backgroundColor: theme.surface,
    ...theme.shadow
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textMuted
  },
  typeBtnTextActive: {
    color: theme.primary,
    fontWeight: '700'
  },
  discountInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    paddingHorizontal: 10,
    height: 38
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textMuted,
    marginRight: 4
  },
  discountInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: theme.text
  },
  discountAppliedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10
  },
  discountAppliedText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.accent
  },
  paymentSection: {
    marginBottom: 20
  },
  paymentGrid: {
    flexDirection: 'row',
    gap: 10
  },
  paymentCard: {
    flex: 1,
    backgroundColor: theme.surface,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.surfaceBorder,
    alignItems: 'center',
    gap: 6
  },
  paymentCardActive: {
    borderColor: theme.primary,
    backgroundColor: 'rgba(79, 70, 229, 0.05)'
  },
  paymentCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary
  },
  paymentCardTextActive: {
    color: theme.primary,
    fontWeight: '700'
  },
  summaryCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    ...theme.shadow
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 14
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.textSecondary
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text
  },
  divider: {
    height: 1,
    backgroundColor: theme.surfaceBorder,
    marginVertical: 12
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.text
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.isDark ? '#34D399' : theme.accent
  },
  checkoutBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow
  },
  checkoutBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  customItemPrice: {
    color: theme.primary,
    fontWeight: '800'
  },
  customPriceBadge: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  customPriceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.primary
  },
  catalogPriceStrikethrough: {
    fontSize: 11,
    color: theme.textMuted,
    textDecorationLine: 'line-through',
    marginTop: 1
  },
  editPriceTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    alignSelf: 'flex-start'
  },
  editPriceTriggerText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.primary
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  editPriceModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    ...theme.shadow
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  modalHeaderTitleCol: {
    flex: 1
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text
  },
  modalHeaderSubtitle: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 2
  },
  modalCloseBtn: {
    padding: 4
  },
  modalProductName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 2
  },
  modalProductId: {
    fontSize: 11,
    color: theme.textMuted,
    marginBottom: 14
  },
  catalogPriceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 14
  },
  catalogPriceBoxLabel: {
    fontSize: 12,
    color: theme.textSecondary
  },
  catalogPriceBoxVal: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text
  },
  inputFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 6
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceLight,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.primary,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 18
  },
  modalCurrencySymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.primary,
    marginRight: 6
  },
  modalPriceInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: theme.text
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10
  },
  resetCatalogBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  resetCatalogBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary
  },
  applyPriceBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow
  },
  applyPriceBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff'
  }
});
