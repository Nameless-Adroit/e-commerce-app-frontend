import React, { useState, useEffect } from 'react';
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
import { ScannerModal } from '../../components/ScannerModal';
import { ReceiptModal } from '../../components/ReceiptModal';
import { useCart } from '../../context/CartContext';
import { posApi, productApi } from '../../services/api';
import { theme } from '../../theme/colors';
import { Product, Transaction } from '../../types';

export default function SellerPOS() {
  const router = useRouter();
  const { items, addItem, updateQuantity, removeItem, clearCart, totalAmount, totalUnits } = useCart();

  const [scannerVisible, setScannerVisible] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [completedTxn, setCompletedTxn] = useState<Transaction | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile_money'>('cash');
  const [checkingOut, setCheckingOut] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [directSearchId, setDirectSearchId] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  useEffect(() => {
    loadQuickProducts();
  }, []);

  const loadQuickProducts = async () => {
    setLoadingCatalog(true);
    try {
      const res = await productApi.listProducts({ limit: 8 });
      if (res.data?.products) {
        setCatalogProducts(res.data.products);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleProductScanned = async (productId: string) => {
    try {
      const res = await posApi.scanProduct(productId);
      if (res.data) {
        const p = res.data;
        if (p.stock_quantity <= 0) {
          Alert.alert('Out of Stock', `Product '${p.name}' is currently out of stock (0 units).`);
          return;
        }
        addItem(p, 1);
      }
    } catch (err: any) {
      Alert.alert('Scan Result', err.message || `No product found for ID '${productId}' in this shop.`);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Please scan or add at least one product to checkout.');
      return;
    }

    setCheckingOut(true);
    try {
      const checkoutItems = items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity
      }));

      const res = await posApi.checkout(checkoutItems, paymentMethod);
      if (res.data) {
        setCompletedTxn(res.data);
        setReceiptVisible(true);
        clearCart();
        loadQuickProducts(); // refresh stock numbers
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
        title="POS Retail Terminal" 
        subtitle="Camera Barcode & ID Checkout (SRS 3.3)" 
        rightAction={
          <TouchableOpacity onPress={() => router.push('/seller/history' as any)} style={styles.historyBtn}>
            <Ionicons name="time-outline" size={20} color={theme.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Top Scanner Button & Quick Alphanumeric Input */}
        <View style={styles.scannerRow}>
          <TouchableOpacity 
            style={styles.scanActionBtn}
            onPress={() => setScannerVisible(true)}
          >
            <Ionicons name="scan-circle" size={26} color="#fff" />
            <Text style={styles.scanActionText}>Scan Product Camera / ID</Text>
          </TouchableOpacity>
        </View>

        {/* Direct Alphanumeric ID Lookup */}
        <View style={styles.directInputBox}>
          <Ionicons name="barcode-outline" size={20} color={theme.textMuted} />
          <TextInput
            style={styles.directInput}
            placeholder="Type Product ID (e.g. PRD-SHP01-3BSR-CHG4)"
            placeholderTextColor={theme.textMuted}
            value={directSearchId}
            onChangeText={setDirectSearchId}
            autoCapitalize="characters"
            onSubmitEditing={() => {
              if (directSearchId.trim()) {
                handleProductScanned(directSearchId.trim().toUpperCase());
                setDirectSearchId('');
              }
            }}
          />
          <TouchableOpacity 
            style={styles.addDirectBtn}
            onPress={() => {
              if (directSearchId.trim()) {
                handleProductScanned(directSearchId.trim().toUpperCase());
                setDirectSearchId('');
              }
            }}
          >
            <Text style={styles.addDirectText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Shelf Select / Demo Products */}
        <View style={styles.shelfHeader}>
          <Text style={styles.shelfTitle}>Store Counter Products</Text>
          <TouchableOpacity onPress={loadQuickProducts}>
            <Ionicons name="refresh" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shelfScroll}>
          {catalogProducts.map((p) => (
            <TouchableOpacity 
              key={p.id} 
              style={[styles.shelfCard, p.stock_quantity <= 0 && { opacity: 0.5 }]}
              onPress={() => handleProductScanned(p.id)}
            >
              <Text style={styles.shelfCardTitle} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.shelfCardId}>{p.id}</Text>
              <View style={styles.shelfPriceRow}>
                <Text style={styles.shelfCardPrice}>${Number(p.price).toFixed(2)}</Text>
                <Text style={[styles.shelfCardStock, p.stock_quantity <= p.reorder_level ? { color: theme.danger } : { color: theme.accent }]}>
                  {p.stock_quantity} in stock
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Active Cart & Quantity Picker */}
        <View style={styles.cartSection}>
          <View style={styles.cartHeaderRow}>
            <View style={styles.cartHeaderTitleRow}>
              <Ionicons name="cart" size={20} color={theme.primary} />
              <Text style={styles.cartHeaderTitle}>Transaction Cart ({totalUnits} items)</Text>
            </View>
            {items.length > 0 && (
              <TouchableOpacity onPress={clearCart}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyCartBox}>
              <Ionicons name="basket-outline" size={40} color={theme.textMuted} />
              <Text style={styles.emptyCartText}>No products scanned yet.</Text>
              <Text style={styles.emptyCartSub}>Tap "Scan Product Camera / ID" or pick from shelf above.</Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.product.id} style={styles.cartItemCard}>
                <View style={styles.cartItemLeft}>
                  <Text style={styles.cartItemName}>{item.product.name}</Text>
                  <Text style={styles.cartItemId}>ID: {item.product.id}</Text>
                  <Text style={styles.cartItemPrice}>${Number(item.product.price).toFixed(2)} each</Text>
                </View>

                {/* Quantity Adjustment Controls (SRS 3.3) */}
                <View style={styles.qtyControlCol}>
                  <View style={styles.qtyStepper}>
                    <TouchableOpacity 
                      onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                      style={styles.qtyBtn}
                    >
                      <Ionicons name="remove" size={16} color={theme.text} />
                    </TouchableOpacity>

                    <Text style={styles.qtyNumber}>{item.quantity}</Text>

                    <TouchableOpacity 
                      onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                      style={[styles.qtyBtn, item.quantity >= item.product.stock_quantity && { opacity: 0.3 }]}
                      disabled={item.quantity >= item.product.stock_quantity}
                    >
                      <Ionicons name="add" size={16} color={theme.text} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.itemSubtotal}>
                    ${(item.quantity * item.product.price).toFixed(2)}
                  </Text>
                </View>

                <TouchableOpacity 
                  onPress={() => removeItem(item.product.id)}
                  style={styles.removeBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Payment & Checkout Footer */}
        {items.length > 0 && (
          <View style={styles.checkoutFooter}>
            <Text style={styles.payLabel}>Select Payment Method:</Text>
            <View style={styles.payPicker}>
              {(['cash', 'card', 'mobile_money'] as const).map((m) => (
                <TouchableOpacity 
                  key={m}
                  style={[styles.payOption, paymentMethod === m && styles.payOptionActive]}
                  onPress={() => setPaymentMethod(m)}
                >
                  <Text style={[styles.payText, paymentMethod === m && styles.payTextActive]}>
                    {m === 'cash' ? '💵 Cash' : m === 'card' ? '💳 Card' : '📱 Mobile'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalAmount}>${totalAmount.toFixed(2)}</Text>
            </View>

            <TouchableOpacity 
              style={[styles.checkoutBtn, checkingOut && { opacity: 0.7 }]}
              onPress={handleCheckout}
              disabled={checkingOut}
            >
              {checkingOut ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.checkoutBtnInner}>
                  <Ionicons name="shield-checkmark" size={20} color="#fff" />
                  <Text style={styles.checkoutBtnText}>Confirm Checkout & Deduct Units</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Camera & Alphanumeric Scanner Modal */}
      <ScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleProductScanned}
        sampleIds={catalogProducts.map((p) => p.id)}
      />

      {/* POS Receipt Modal */}
      <ReceiptModal
        visible={receiptVisible}
        transaction={completedTxn}
        onClose={() => setReceiptVisible(false)}
      />
    </View>
  );
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
  historyBtn: {
    padding: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.surfaceLight
  },
  scannerRow: {
    marginBottom: 12
  },
  scanActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.lg
  },
  scanActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },
  directInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16
  },
  directInput: {
    flex: 1,
    color: theme.text,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  addDirectBtn: {
    backgroundColor: theme.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.sm
  },
  addDirectText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12
  },
  shelfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  shelfTitle: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '700'
  },
  shelfScroll: {
    marginBottom: 18
  },
  shelfCard: {
    width: 140,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.md,
    padding: 10,
    marginRight: 10
  },
  shelfCardTitle: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '700'
  },
  shelfCardId: {
    color: theme.primary,
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2
  },
  shelfPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8
  },
  shelfCardPrice: {
    color: theme.accent,
    fontSize: 13,
    fontWeight: '700'
  },
  shelfCardStock: {
    fontSize: 10
  },
  cartSection: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 20
  },
  cartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  cartHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  cartHeaderTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700'
  },
  clearText: {
    color: theme.danger,
    fontSize: 13,
    fontWeight: '600'
  },
  emptyCartBox: {
    alignItems: 'center',
    paddingVertical: 36
  },
  emptyCartText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10
  },
  emptyCartSub: {
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center'
  },
  cartItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceLight,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 10
  },
  cartItemLeft: {
    flex: 1,
    paddingRight: 8
  },
  cartItemName: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '600'
  },
  cartItemId: {
    color: theme.primary,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2
  },
  cartItemPrice: {
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: 2
  },
  qtyControlCol: {
    alignItems: 'center',
    marginRight: 10
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBg,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.inputBorder
  },
  qtyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  qtyNumber: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 6
  },
  itemSubtotal: {
    color: theme.accent,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4
  },
  removeBtn: {
    padding: 6
  },
  checkoutFooter: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.lg,
    padding: 16
  },
  payLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8
  },
  payPicker: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  payOption: {
    flex: 1,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    alignItems: 'center'
  },
  payOptionActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: theme.primary
  },
  payText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  payTextActive: {
    color: '#fff',
    fontWeight: '700'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  totalLabel: {
    color: theme.textSecondary,
    fontSize: 16,
    fontWeight: '600'
  },
  totalAmount: {
    color: theme.accent,
    fontSize: 26,
    fontWeight: '800'
  },
  checkoutBtn: {
    backgroundColor: theme.accent,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center'
  },
  checkoutBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700'
  }
});
