import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { Badge } from '../../components/Badge';
import { RestockModal } from '../../components/RestockModal';
import { ShrinkageModal } from '../../components/ShrinkageModal';
import { ThermalLabelModal } from '../../components/ThermalLabelModal';
import { AdminSidebar } from '../../components/AdminSidebar';
import { productApi } from '../../services/api';
import { useTheme, useStyles } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AppTheme } from '../../theme/colors';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/currency';

type StockStatusFilter = 'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK';

export default function AdminInventoryScreen() {
  const router = useRouter();
  const { user, isLoading, activeShop } = useAuth();
  const { theme } = useTheme();
  const styles = useStyles(createStyles);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modals state
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [restockVisible, setRestockVisible] = useState(false);
  const [shrinkageVisible, setShrinkageVisible] = useState(false);
  const [labelModalVisible, setLabelModalVisible] = useState(false);

  const loadProducts = async () => {
    try {
      const res = await productApi.listProducts({
        limit: 150
      });
      if (res.data?.products) {
        setProducts(res.data.products);
      }
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user || isLoading || user.role !== 'admin') return;
    loadProducts();
  }, [user, isLoading, activeShop]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  // Inventory Metrics
  const metrics = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    products.forEach((p) => {
      if (p.stock_quantity <= 0) {
        outOfStock++;
      } else if (p.stock_quantity <= p.reorder_level) {
        lowStock++;
      } else {
        inStock++;
      }
    });

    return {
      total: products.length,
      inStock,
      lowStock,
      outOfStock
    };
  }, [products]);

  const categories = useMemo(() => {
    return ['ALL', ...Array.from(new Set(products.map((p) => p.category || 'General')))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category Filter
      if (selectedCategory !== 'ALL' && (p.category || 'General') !== selectedCategory) {
        return false;
      }

      // Status Filter
      if (statusFilter === 'OUT_OF_STOCK' && p.stock_quantity > 0) {
        return false;
      }
      if (statusFilter === 'LOW_STOCK' && (p.stock_quantity <= 0 || p.stock_quantity > p.reorder_level)) {
        return false;
      }
      if (statusFilter === 'IN_STOCK' && p.stock_quantity <= p.reorder_level) {
        return false;
      }

      // Search Query
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [products, search, statusFilter, selectedCategory]);

  const openRestock = (p: Product) => {
    setSelectedProduct(p);
    setRestockVisible(true);
  };

  const openShrinkage = (p: Product) => {
    setSelectedProduct(p);
    setShrinkageVisible(true);
  };

  const openLabelModal = (p: Product) => {
    setSelectedProduct(p);
    setLabelModalVisible(true);
  };

  const renderStockStatusBadge = (p: Product) => {
    if (p.stock_quantity <= 0) {
      return (
        <View style={[styles.statusBadge, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
          <Ionicons name="close-circle" size={12} color={theme.danger} />
          <Text style={[styles.statusBadgeText, { color: theme.danger }]}>Out of Stock</Text>
        </View>
      );
    }
    if (p.stock_quantity <= p.reorder_level) {
      return (
        <View style={[styles.statusBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
          <Ionicons name="alert-circle" size={12} color="#D97706" />
          <Text style={[styles.statusBadgeText, { color: '#D97706' }]}>Low Stock</Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
        <Ionicons name="checkmark-circle" size={12} color="#059669" />
        <Text style={[styles.statusBadgeText, { color: '#059669' }]}>In Stock</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Inventory & Stock"
        subtitle={activeShop ? `${activeShop.name} • Stock Level Controls` : 'Live Stock Management'}
        leftAction={
          <TouchableOpacity
            onPress={() => setSidebarVisible(true)}
            style={[styles.menuIconBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}
            activeOpacity={0.7}
          >
            <Ionicons name="menu-outline" size={22} color={theme.text} />
          </TouchableOpacity>
        }
        rightAction={
          <TouchableOpacity
            style={[styles.headerAddBtn, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/admin/add-product' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.headerAddBtnText}>Add Product</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Metric Summary Strips */}
            <View style={styles.metricsStrip}>
              <TouchableOpacity
                style={[
                  styles.metricCard,
                  { backgroundColor: theme.surface, borderColor: theme.surfaceBorder },
                  statusFilter === 'ALL' && { borderColor: theme.primary, borderWidth: 1.5 }
                ]}
                onPress={() => setStatusFilter('ALL')}
                activeOpacity={0.8}
              >
                <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Total SKUs</Text>
                <Text style={[styles.metricVal, { color: theme.text }]}>{metrics.total}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.metricCard,
                  { backgroundColor: theme.surface, borderColor: theme.surfaceBorder },
                  statusFilter === 'IN_STOCK' && { borderColor: '#10B981', borderWidth: 1.5 }
                ]}
                onPress={() => setStatusFilter('IN_STOCK')}
                activeOpacity={0.8}
              >
                <Text style={[styles.metricLabel, { color: '#059669' }]}>In Stock</Text>
                <Text style={[styles.metricVal, { color: '#059669' }]}>{metrics.inStock}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.metricCard,
                  { backgroundColor: theme.surface, borderColor: theme.surfaceBorder },
                  statusFilter === 'LOW_STOCK' && { borderColor: '#F59E0B', borderWidth: 1.5 }
                ]}
                onPress={() => setStatusFilter('LOW_STOCK')}
                activeOpacity={0.8}
              >
                <Text style={[styles.metricLabel, { color: '#D97706' }]}>Low Stock</Text>
                <Text style={[styles.metricVal, { color: '#D97706' }]}>{metrics.lowStock}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.metricCard,
                  { backgroundColor: theme.surface, borderColor: theme.surfaceBorder },
                  statusFilter === 'OUT_OF_STOCK' && { borderColor: theme.danger, borderWidth: 1.5 }
                ]}
                onPress={() => setStatusFilter('OUT_OF_STOCK')}
                activeOpacity={0.8}
              >
                <Text style={[styles.metricLabel, { color: theme.danger }]}>Out of Stock</Text>
                <Text style={[styles.metricVal, { color: theme.danger }]}>{metrics.outOfStock}</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
              <Ionicons name="search-outline" size={18} color={theme.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search inventory by name, SKU or category..."
                placeholderTextColor={theme.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Filter Chips */}
            {categories.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
              >
                {categories.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: active ? theme.primary : theme.surface,
                          borderColor: active ? theme.primary : theme.surfaceBorder
                        }
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          { color: active ? '#FFFFFF' : theme.text }
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Table Header Row */}
            <View style={[styles.tableHeader, { borderBottomColor: theme.surfaceBorder }]}>
              <Text style={[styles.tableColHeader, { flex: 2, color: theme.textMuted }]}>PRODUCT</Text>
              <Text style={[styles.tableColHeader, { width: 70, textAlign: 'center', color: theme.textMuted }]}>STOCK</Text>
              <Text style={[styles.tableColHeader, { width: 95, textAlign: 'center', color: theme.textMuted }]}>STATUS</Text>
              <Text style={[styles.tableColHeader, { width: 85, textAlign: 'right', color: theme.textMuted }]}>ACTION</Text>
            </View>
          </>
        }
        renderItem={({ item }) => {
          const isLow = item.stock_quantity <= item.reorder_level && item.stock_quantity > 0;
          const isOut = item.stock_quantity <= 0;

          return (
            <View style={[styles.rowCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
              {/* Product Info */}
              <View style={styles.productCol}>
                <Text style={[styles.productName, { color: theme.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.skuRow}>
                  <Text style={[styles.skuText, { color: theme.textMuted }]}>
                    {item.id}
                  </Text>
                  <Text style={[styles.bullet, { color: theme.textMuted }]}>•</Text>
                  <Text style={[styles.categoryText, { color: theme.textSecondary }]}>
                    {item.category || 'General'}
                  </Text>
                </View>
                <Text style={[styles.priceText, { color: theme.primary }]}>
                  {formatCurrency(item.price, item.currency_symbol)}
                </Text>
              </View>

              {/* Stock Level vs Threshold */}
              <View style={styles.stockCol}>
                <Text
                  style={[
                    styles.currentStockNum,
                    isOut
                      ? { color: theme.danger }
                      : isLow
                      ? { color: '#D97706' }
                      : { color: theme.text }
                  ]}
                >
                  {item.stock_quantity}
                </Text>
                <Text style={[styles.reorderLevelText, { color: theme.textMuted }]}>
                  Min: {item.reorder_level}
                </Text>
              </View>

              {/* Status Badge */}
              <View style={styles.statusCol}>
                {renderStockStatusBadge(item)}
              </View>

              {/* Actions */}
              <View style={styles.actionCol}>
                <TouchableOpacity
                  style={[styles.quickRestockBtn, { backgroundColor: theme.primary }]}
                  onPress={() => openRestock(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={14} color="#FFFFFF" />
                  <Text style={styles.quickRestockText}>Restock</Text>
                </TouchableOpacity>

                <View style={styles.moreActionsRow}>
                  <TouchableOpacity
                    style={[styles.smallIconBtn, { backgroundColor: theme.surfaceLight }]}
                    onPress={() => openLabelModal(item)}
                    accessibilityLabel="Print QR Label"
                  >
                    <Ionicons name="qr-code-outline" size={13} color={theme.text} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.smallIconBtn, { backgroundColor: theme.surfaceLight }]}
                    onPress={() => openShrinkage(item)}
                    accessibilityLabel="Record Shrinkage"
                  >
                    <Ionicons name="remove-circle-outline" size={13} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="layers-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No inventory records match</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                Try adjusting your search query or filters.
              </Text>
            </View>
          )
        }
      />

      {/* Restock Modal */}
      <RestockModal
        visible={restockVisible}
        product={selectedProduct}
        onClose={() => setRestockVisible(false)}
        onSuccess={loadProducts}
      />

      {/* Shrinkage Modal */}
      <ShrinkageModal
        visible={shrinkageVisible}
        product={selectedProduct}
        onClose={() => setShrinkageVisible(false)}
        onSuccess={loadProducts}
      />

      {/* Thermal Label Modal */}
      <ThermalLabelModal
        visible={labelModalVisible}
        product={selectedProduct}
        onClose={() => setLabelModalVisible(false)}
      />

      {/* Admin Slide-out Sidebar */}
      <AdminSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        unreadNotificationsCount={metrics.lowStock + metrics.outOfStock}
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    menuIconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    headerAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    headerAddBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    listContent: {
      padding: 16,
      paddingBottom: 80,
    },
    metricsStrip: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
    },
    metricCard: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
    },
    metricLabel: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginBottom: 4,
    },
    metricVal: {
      fontSize: 16,
      fontWeight: '800',
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 10,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      padding: 0,
    },
    categoryScroll: {
      gap: 6,
      marginBottom: 12,
    },
    categoryChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
    },
    categoryChipText: {
      fontSize: 11,
      fontWeight: '600',
    },
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      marginBottom: 6,
    },
    tableColHeader: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    rowCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 8,
    },
    productCol: {
      flex: 2,
      paddingRight: 6,
    },
    productName: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 2,
    },
    skuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 2,
    },
    skuText: {
      fontSize: 10,
      fontFamily: 'monospace',
    },
    bullet: {
      fontSize: 10,
    },
    categoryText: {
      fontSize: 10,
      fontWeight: '500',
    },
    priceText: {
      fontSize: 11,
      fontWeight: '700',
    },
    stockCol: {
      width: 70,
      alignItems: 'center',
      justifyContent: 'center',
    },
    currentStockNum: {
      fontSize: 15,
      fontWeight: '800',
    },
    reorderLevelText: {
      fontSize: 9,
      marginTop: 2,
    },
    statusCol: {
      width: 95,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
    },
    statusBadgeText: {
      fontSize: 9,
      fontWeight: '700',
    },
    actionCol: {
      width: 85,
      alignItems: 'flex-end',
      gap: 4,
    },
    quickRestockBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 6,
    },
    quickRestockText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    moreActionsRow: {
      flexDirection: 'row',
      gap: 4,
      marginTop: 2,
    },
    smallIconBtn: {
      width: 24,
      height: 24,
      borderRadius: 5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      marginTop: 12,
    },
    emptySubtitle: {
      fontSize: 12,
      marginTop: 4,
    },
  });
