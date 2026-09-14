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
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { ReceiptModal } from '../../components/ReceiptModal';
import { useCart } from '../../context/CartContext';
import { posApi } from '../../services/api';
import { theme } from '../../theme/colors';
import { Transaction, CheckoutTransaction } from '../../types';

export default function SellerCartScreen() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart, totalAmount, totalUnits } = useCart();

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile_money'>('cash');
  const [checkingOut, setCheckingOut] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [completedTxn, setCompletedTxn] = useState<Transaction | null>(null);

  // Cashier Discount State
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [discountInput, setDiscountInput] = useState<string>('');

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

  const handleCheckout = async () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Please scan or add at least one product before proceeding to checkout.');
      return;
    }

    setCheckingOut(true);
    try {
      const checkoutItems = items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity
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

              {items.map((item) => (
                <View key={item.product.id} style={styles.cartCard}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.product.name}
                    </Text>
                    <Text style={styles.itemId}>
                      ID: {item.product.id} • {item.product.category}
                    </Text>
                    <Text style={styles.itemPrice}>
                      ${Number(item.product.price).toFixed(2)} each
                    </Text>
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
                      ${(item.quantity * item.product.price).toFixed(2)}
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
              ))}
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
                  { label: '$5 Off', val: '5', type: 'fixed' as const },
                  { label: '$10 Off', val: '10', type: 'fixed' as const },
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
                      $ Fixed
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
                  <Text style={styles.currencyPrefix}>{discountType === 'fixed' ? '$' : '%'}</Text>
                  <TextInput
                    style={styles.discountInput}
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="decimal-pad"
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
                    Applying -${finalDiscount.toFixed(2)} discount to order
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
                <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
              </View>

              {finalDiscount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.accent, fontWeight: '600' }]}>
                    Discount ({discountType === 'percent' ? `${rawDiscountValue}%` : 'Fixed'})
                  </Text>
                  <Text style={[styles.summaryValue, { color: theme.accent, fontWeight: '700' }]}>
                    -${finalDiscount.toFixed(2)}
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
                <Text style={styles.totalValue}>${finalPayableTotal.toFixed(2)}</Text>
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
                      Complete Sale • ${finalPayableTotal.toFixed(2)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

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

const styles = StyleSheet.create({
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
    color: theme.accent
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
  }
});
