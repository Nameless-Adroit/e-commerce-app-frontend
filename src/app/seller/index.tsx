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
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { ScannerModal } from '../../components/ScannerModal';
import { ProductDetailModal } from '../../components/ProductDetailModal';
import { useCart } from '../../context/CartContext';
import { posApi, productApi, analyticsApi } from '../../services/api';
import { theme } from '../../theme/colors';
import { Product, TopProduct } from '../../types';
import { formatCurrency } from '../../utils/currency';

export default function SellerCounterScreen() {
  const router = useRouter();
  const { addItem, items, totalUnits, totalAmount } = useCart();

  const [scannerVisible, setScannerVisible] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [directSearchId, setDirectSearchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, topRes] = await Promise.all([
        productApi.listProducts({ limit: 40 }),
        analyticsApi.getTopProducts(5)
      ]);

      if (productsRes.data?.products) {
        setCatalogProducts(productsRes.data.products);
      }
      if (topRes.data?.top_products) {
        setTopProducts(topRes.data.top_products);
      }
    } catch (err) {
      console.error('Failed to load store counter data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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

  const categories = ['ALL', ...Array.from(new Set(catalogProducts.map((p) => p.category || 'General')))];

  const filteredProducts = catalogProducts.filter((p) => {
    if (categoryFilter !== 'ALL' && (p.category || 'General') !== categoryFilter) {
      return false;
    }
    if (directSearchId.trim()) {
      const q = directSearchId.trim().toLowerCase();
      return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    }
    return true;
  });

  const topProductLeader = topProducts.length > 0 ? topProducts[0] : null;

  return (
    <View style={styles.container}>
      <Header
        title="POS Counter"
        subtitle="Barcode scan & quick-add shelf counter"
        rightAction={
          <TouchableOpacity onPress={() => router.push('/seller/cart' as any)} style={styles.cartIconBtn}>
            <Ionicons name="cart-outline" size={20} color={theme.text} />
            {totalUnits > 0 && (
              <View style={styles.badgeCircle}>
                <Text style={styles.badgeText}>{totalUnits}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* Large Barcode Scanner Action */}
        <TouchableOpacity
          style={styles.scanHeroBtn}
          onPress={() => setScannerVisible(true)}
          activeOpacity={0.85}
        >
          <View style={styles.scanHeroInner}>
            <View style={styles.scanHeroIconCircle}>
              <Ionicons name="scan" size={26} color="#ffffff" />
            </View>
            <View style={styles.scanHeroTextCol}>
              <Text style={styles.scanHeroTitle}>Launch Barcode Scanner</Text>
              <Text style={styles.scanHeroSubtitle}>Auto-detects camera barcodes & instant cart add</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* Manual Product ID Lookup / Filter Input */}
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
          <Ionicons name="search-outline" size={20} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search by product name or ID..."
            placeholderTextColor={theme.textMuted}
            value={directSearchId}
            onChangeText={setDirectSearchId}
            autoCapitalize="characters"
            onSubmitEditing={() => {
              if (directSearchId.trim()) {
                handleProductScanned(directSearchId.trim().toUpperCase());
              }
            }}
          />
          {directSearchId.trim().length > 0 && (
            <TouchableOpacity
              style={styles.addDirectBtn}
              onPress={() => {
                handleProductScanned(directSearchId.trim().toUpperCase());
              }}
            >
              <Text style={styles.addDirectBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Top Product Leader Spotlight */}
        {topProductLeader && (
          <View style={styles.topSellerCard}>
            <View style={styles.topSellerHeader}>
              <View style={styles.flameBadge}>
                <Ionicons name="flame" size={15} color="#D97706" />
                <Text style={styles.flameBadgeText}>#1 TOP SELLING PRODUCT</Text>
              </View>
              <Text style={styles.unitsSoldBadge}>
                {topProductLeader.total_units_sold} sold
              </Text>
            </View>

            <TouchableOpacity
              style={styles.topSellerBody}
              onPress={() => setSelectedDetailProduct(topProductLeader as any)}
              activeOpacity={0.8}
            >
              <View style={styles.topSellerInfo}>
                <Text style={styles.topSellerName} numberOfLines={1}>
                  {topProductLeader.name}
                </Text>
                <Text style={styles.topSellerId}>
                  ID: {topProductLeader.product_id} • {topProductLeader.category}
                </Text>
                <View style={styles.topSellerMetrics}>
                  <Text style={styles.topSellerPrice}>
                    {formatCurrency(topProductLeader.price)}
                  </Text>
                  <Text
                    style={[
                      styles.topSellerStock,
                      topProductLeader.stock_quantity <= 5 && { color: theme.danger }
                    ]}
                  >
                    Stock: {topProductLeader.stock_quantity}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.quickAddBtn,
                  topProductLeader.stock_quantity <= 0 && { opacity: 0.5 }
                ]}
                onPress={(e) => {
                  e.stopPropagation?.();
                  handleProductScanned(topProductLeader.product_id);
                }}
                disabled={topProductLeader.stock_quantity <= 0}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color="#ffffff" />
                <Text style={styles.quickAddBtnText}>Add</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        )}

        {/* Category Filter Chips */}
        {categories.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categories.map((cat) => {
              const isSelected = categoryFilter === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                  onPress={() => setCategoryFilter(cat)}
                >
                  <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Store Shelf Counter Grid */}
        <View style={styles.shelfHeaderRow}>
          <Text style={styles.shelfTitle}>Store Shelf Catalog ({filteredProducts.length})</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Ionicons name="refresh" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 30 }} />
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyShelfBox}>
            <Text style={styles.emptyShelfText}>No products matching your search.</Text>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {filteredProducts.map((p) => {
              const inCartCount = items.find((i) => i.product.id === p.id)?.quantity || 0;
              const isOutOfStock = p.stock_quantity <= 0;

              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.productCard, isOutOfStock && styles.productCardOOS]}
                  onPress={() => setSelectedDetailProduct(p)}
                  activeOpacity={0.75}
                >
                  {inCartCount > 0 && (
                    <View style={styles.inCartBadge}>
                      <Text style={styles.inCartBadgeText}>{inCartCount} in cart</Text>
                    </View>
                  )}

                  <Text style={styles.productName} numberOfLines={2}>
                    {p.name}
                  </Text>
                  <Text style={styles.productId} numberOfLines={1}>
                    {p.id}
                  </Text>

                  <View style={styles.productFooter}>
                    <View>
                      <Text style={styles.productPrice}>{formatCurrency(p.price, p.currency_symbol)}</Text>
                      <Text
                        style={[
                          styles.productStock,
                          p.stock_quantity <= p.reorder_level
                            ? { color: theme.danger }
                            : { color: theme.secondary }
                        ]}
                      >
                        {isOutOfStock ? '0 units' : `${p.stock_quantity} left`}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.quickCardAddBtn, isOutOfStock && { opacity: 0.4 }]}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleProductScanned(p.id);
                      }}
                      disabled={isOutOfStock}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={16} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Cart Quick Peek */}
      {totalUnits > 0 && (
        <View style={styles.floatingCartContainer}>
          <TouchableOpacity
            style={styles.floatingCartBar}
            onPress={() => router.push('/seller/cart' as any)}
            activeOpacity={0.9}
          >
            <View style={styles.floatingCartLeft}>
              <View style={styles.floatingCartBadge}>
                <Ionicons name="cart" size={16} color="#ffffff" />
                <Text style={styles.floatingCartBadgeText}>{totalUnits}</Text>
              </View>
              <Text style={styles.floatingCartTotal}>
                {formatCurrency(totalAmount, catalogProducts[0]?.currency_symbol)}
              </Text>
            </View>

            <View style={styles.floatingCartRight}>
              <Text style={styles.floatingCartActionText}>Proceed to Checkout</Text>
              <Ionicons name="arrow-forward" size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Barcode Scanner Modal */}
      <ScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleProductScanned}
        sampleIds={catalogProducts.map((p) => p.id)}
      />

      {/* Product Detail Lightbox Modal */}
      <ProductDetailModal
        visible={!!selectedDetailProduct}
        product={selectedDetailProduct}
        onClose={() => setSelectedDetailProduct(null)}
        onAddToCart={(product, qty) => addItem(product, qty)}
        inCartQuantity={items.find((i) => i.product.id === selectedDetailProduct?.id)?.quantity || 0}
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
    paddingBottom: 90
  },
  cartIconBtn: {
    padding: 8,
    position: 'relative'
  },
  badgeCircle: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: theme.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700'
  },
  scanHeroBtn: {
    backgroundColor: theme.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    ...theme.shadow
  },
  scanHeroInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1
  },
  scanHeroIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  scanHeroTextCol: {
    flex: 1
  },
  scanHeroTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  scanHeroSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 2
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 14,
    gap: 10,
    ...theme.shadow
  },
  searchInput: {
    flex: 1,
    height: 48,
    paddingVertical: 0,
    textAlignVertical: 'center',
    fontSize: 14,
    color: theme.text
  },
  addDirectBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8
  },
  addDirectBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  topSellerCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    marginBottom: 14
  },
  topSellerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  flameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  flameBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309'
  },
  unitsSoldBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E'
  },
  topSellerBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  topSellerInfo: {
    flex: 1,
    marginRight: 10
  },
  topSellerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78350F'
  },
  topSellerId: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 2
  },
  topSellerMetrics: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4
  },
  topSellerPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.accent
  },
  topSellerStock: {
    fontSize: 12,
    color: theme.secondary,
    fontWeight: '600'
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  quickAddBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  categoryScroll: {
    gap: 8,
    paddingBottom: 14
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  categoryChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary
  },
  categoryChipTextActive: {
    color: '#ffffff'
  },
  shelfHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  shelfTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  productCard: {
    width: '48.5%',
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    position: 'relative',
    ...theme.shadow
  },
  productCardOOS: {
    opacity: 0.5
  },
  inCartBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  inCartBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.primary
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
    marginTop: 2
  },
  productId: {
    fontSize: 10,
    color: theme.textMuted,
    marginBottom: 8
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.accent
  },
  productStock: {
    fontSize: 11,
    fontWeight: '600'
  },
  quickCardAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow
  },
  emptyShelfBox: {
    padding: 30,
    alignItems: 'center'
  },
  emptyShelfText: {
    color: theme.textMuted,
    fontSize: 13
  },
  floatingCartContainer: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    zIndex: 99
  },
  floatingCartBar: {
    backgroundColor: theme.text,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadow
  },
  floatingCartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  floatingCartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  floatingCartBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  floatingCartTotal: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  },
  floatingCartRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  floatingCartActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600'
  }
});
