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
import { ReturnRestockModal } from '../../components/ReturnRestockModal';
import { useCart } from '../../context/CartContext';
import { posApi, productApi, analyticsApi } from '../../services/api';
import { theme } from '../../theme/colors';
import { Product, Transaction, CheckoutTransaction, TopProduct } from '../../types';

export default function SellerPOS() {
  const router = useRouter();
  const { items, addItem, updateQuantity, removeItem, clearCart, totalAmount, totalUnits } = useCart();

  const [scannerVisible, setScannerVisible] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [productToReturn, setProductToReturn] = useState<Product | null>(null);

  const [completedTxn, setCompletedTxn] = useState<Transaction | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile_money'>('cash');
  const [checkingOut, setCheckingOut] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [directSearchId, setDirectSearchId] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingTopProducts, setLoadingTopProducts] = useState(false);

  useEffect(() => {
    loadQuickProducts();
    loadTopProducts();
  }, []);

  const loadQuickProducts = async () => {
    setLoadingCatalog(true);
    try {
      const res = await productApi.listProducts({ limit: 12 });
      if (res.data?.products) {
        setCatalogProducts(res.data.products);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const loadTopProducts = async () => {
    setLoadingTopProducts(true);
    try {
      const res = await analyticsApi.getTopProducts(5);
      if (res.data?.top_products) {
        setTopProducts(res.data.top_products);
      }
    } catch (err) {
      console.error('Failed to load top products:', err);
    } finally {
      setLoadingTopProducts(false);
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

  const handleOpenReturnModal = (product?: Product) => {
    setProductToReturn(product || null);
    setReturnModalVisible(true);
  };

  const handleReturnSuccess = () => {
    loadQuickProducts();
    loadTopProducts();
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
        setCompletedTxn(toReceiptTransaction(res.data));
        setReceiptVisible(true);
        clearCart();
        loadQuickProducts(); // refresh stock numbers
        loadTopProducts();   // refresh sales rankings
      }
    } catch (err: any) {
      Alert.alert('Checkout Failed', err.message || 'Error processing transaction.');
    } finally {
      setCheckingOut(false);
    }
  };

  const topProductLeader = topProducts.length > 0 ? topProducts[0] : null;

  return (
    <View style={styles.container}>
      <Header 
        title="POS Retail Terminal" 
        subtitle="Camera Barcode, Sales & Returns" 
        rightAction={
          <TouchableOpacity onPress={() => router.push('/seller/history' as any)} style={styles.historyBtn}>
            <Ionicons name="time-outline" size={20} color={theme.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Top Dual Action Bar: Camera Scanner & Customer Return Restock */}
        <View style={styles.actionBarRow}>
          <TouchableOpacity 
            style={styles.scanActionBtn}
            onPress={() => setScannerVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="scan-circle" size={22} color="#fff" />
            <Text style={styles.scanActionText}>Scan Barcode</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.returnActionBtn}
            onPress={() => handleOpenReturnModal()}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-undo-circle" size={22} color="#fff" />
            <Text style={styles.returnActionText}>Return Restock</Text>
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

        {/* 🔥 Most Sold Product Spotlight Banner */}
        {topProductLeader && (
          <View style={styles.topSellerCard}>
            <View style={styles.topSellerHeader}>
              <View style={styles.flameBadge}>
                <Ionicons name="flame" size={15} color="#D97706" />
                <Text style={styles.flameBadgeText}>#1 MOST SOLD PRODUCT</Text>
              </View>
              <Text style={styles.unitsSoldBadge}>
                {topProductLeader.total_units_sold} units sold
              </Text>
            </View>

            <View style={styles.topSellerBody}>
              <View style={styles.topSellerInfo}>
                <Text style={styles.topSellerName} numberOfLines={1}>
                  {topProductLeader.name}
                </Text>
                <Text style={styles.topSellerId}>
                  ID: {topProductLeader.product_id} • {topProductLeader.category}
                </Text>
                <View style={styles.topSellerMetrics}>
                  <Text style={styles.topSellerPrice}>
                    ${Number(topProductLeader.price).toFixed(2)}
                  </Text>
                  <Text style={[
                    styles.topSellerStock,
                    topProductLeader.stock_quantity <= 5 && { color: theme.danger }
                  ]}>
                    Shelf Stock: {topProductLeader.stock_quantity}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.quickAddBtn,
                  topProductLeader.stock_quantity <= 0 && { opacity: 0.5 }
                ]}
                onPress={() => handleProductScanned(topProductLeader.product_id)}
                disabled={topProductLeader.stock_quantity <= 0}
              >
                <Ionicons name="cart-outline" size={16} color="#ffffff" />
                <Text style={styles.quickAddBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Runners-up ranks #2 and #3 if available */}
            {topProducts.length > 1 && (
              <View style={styles.runnersUpRow}>
                <Text style={styles.runnersUpLabel}>Top Sellers:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.runnersUpList}>
                  {topProducts.slice(1, 4).map((tp, idx) => (
                    <TouchableOpacity
                      key={tp.product_id}
                      style={styles.runnerUpChip}
                      onPress={() => handleProductScanned(tp.product_id)}
                    >
                      <Text style={styles.runnerUpRank}>#{idx + 2}</Text>
                      <Text style={styles.runnerUpName} numberOfLines={1}>{tp.name}</Text>
                      <Text style={styles.runnerUpSales}>({tp.total_units_sold})</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Quick Shelf Select / Demo Products */}
        <View style={styles.shelfHeader}>
          <View style={styles.shelfTitleRow}>
            <Text style={styles.shelfTitle}>Store Shelf Counter</Text>
            <Text style={styles.shelfSubtitle}>Tap card to add, or ↩ to return</Text>
          </View>
          <TouchableOpacity onPress={() => { loadQuickProducts(); loadTopProducts(); }}>
            <Ionicons name="refresh" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shelfScroll}>
          {catalogProducts.map((p) => (
            <View 
              key={p.id} 
              style={[styles.shelfCard, p.stock_quantity <= 0 && { opacity: 0.6 }]}
            >
              <TouchableOpacity 
                style={styles.shelfCardMain}
                onPress={() => handleProductScanned(p.id)}
              >
                <Text style={styles.shelfCardTitle} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.shelfCardId}>{p.id}</Text>
                <View style={styles.shelfPriceRow}>
                  <Text style={styles.shelfCardPrice}>${Number(p.price).toFixed(2)}</Text>
                  <Text style={[styles.shelfCardStock, p.stock_quantity <= p.reorder_level ? { color: theme.danger } : { color: theme.secondary }]}>
                    {p.stock_quantity} left
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Quick Return Shortcut Icon */}
              <TouchableOpacity
                style={styles.shelfCardReturnBtn}
                onPress={() => handleOpenReturnModal(p)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="arrow-undo-outline" size={13} color={theme.secondary} />
                <Text style={styles.shelfCardReturnText}>Return</Text>
              </TouchableOpacity>
            </View>
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
              <Text style={styles.emptyCartSub}>Tap "Scan Barcode" or pick an item from the shelf above.</Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.product.id} style={styles.cartItemCard}>
                <View style={styles.cartItemLeft}>
                  <Text style={styles.cartItemName}>{item.product.name}</Text>
                  <Text style={styles.cartItemId}>ID: {item.product.id}</Text>
                  <Text style={styles.cartItemPrice}>${Number(item.product.price).toFixed(2)} each</Text>
                </View>

                {/* Quantity Adjustment Controls */}
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

      {/* Camera & Barcode Scanner Modal */}
      <ScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleProductScanned}
        sampleIds={catalogProducts.map((p) => p.id)}
      />

      {/* Customer Return & Restock Modal */}
      <ReturnRestockModal
        visible={returnModalVisible}
        onClose={() => setReturnModalVisible(false)}
        onSuccess={handleReturnSuccess}
        initialProduct={productToReturn}
        products={catalogProducts}
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

/** Adapts the compact checkout response to the receipt component's full model. */
function toReceiptTransaction(transaction: CheckoutTransaction): Transaction {
  return {
    ...transaction,
    id: transaction.transaction_id,
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
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 40
  },
  historyBtn: {
    padding: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.surfaceLight
  },
  actionBarRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14
  },
  scanActionBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.primary,
    paddingVertical: 13,
    borderRadius: theme.radius.lg,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3
  },
  scanActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  },
  returnActionBtn: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.secondary,
    paddingVertical: 13,
    borderRadius: theme.radius.lg,
    shadowColor: theme.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3
  },
  returnActionText: {
    color: '#fff',
    fontSize: 14,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1
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
  topSellerCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: theme.radius.lg,
    padding: 14,
    marginBottom: 18,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2
  },
  topSellerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  flameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  flameBadgeText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4
  },
  unitsSoldBadge: {
    color: theme.secondary,
    fontSize: 12,
    fontWeight: '700'
  },
  topSellerBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  topSellerInfo: {
    flex: 1
  },
  topSellerName: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700'
  },
  topSellerId: {
    color: theme.textMuted,
    fontSize: 11,
    marginTop: 2
  },
  topSellerMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6
  },
  topSellerPrice: {
    color: theme.accent,
    fontSize: 15,
    fontWeight: '800'
  },
  topSellerStock: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.md
  },
  quickAddBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  runnersUpRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  runnersUpLabel: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '600'
  },
  runnersUpList: {
    flexDirection: 'row',
    gap: 6
  },
  runnerUpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm
  },
  runnerUpRank: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '800'
  },
  runnerUpName: {
    color: theme.text,
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 80
  },
  runnerUpSales: {
    color: theme.textMuted,
    fontSize: 10
  },
  shelfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  shelfTitleRow: {
    flex: 1
  },
  shelfTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700'
  },
  shelfSubtitle: {
    color: theme.textMuted,
    fontSize: 11,
    marginTop: 1
  },
  shelfScroll: {
    marginBottom: 18
  },
  shelfCard: {
    width: 145,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.md,
    padding: 10,
    marginRight: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    justifyContent: 'space-between'
  },
  shelfCardMain: {
    flex: 1
  },
  shelfCardTitle: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '700'
  },
  shelfCardId: {
    color: theme.primary,
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
    fontSize: 10,
    fontWeight: '600'
  },
  shelfCardReturnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.surfaceBorder
  },
  shelfCardReturnText: {
    color: theme.secondary,
    fontSize: 11,
    fontWeight: '600'
  },
  cartSection: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.lg,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
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
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
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
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    alignItems: 'center'
  },
  payOptionActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    borderColor: theme.primary
  },
  payText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  payTextActive: {
    color: theme.primary,
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
