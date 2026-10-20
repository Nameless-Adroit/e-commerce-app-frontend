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
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { Badge } from '../../components/Badge';
import { RestockModal } from '../../components/RestockModal';
import { ThermalLabelModal } from '../../components/ThermalLabelModal';
import { AdminSidebar } from '../../components/AdminSidebar';
import { productApi } from '../../services/api';
import { useTheme, useStyles } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AppTheme } from '../../theme/colors';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/currency';

export default function AdminProducts() {
  const router = useRouter();
  const { user, isLoading, activeShop } = useAuth();
  const { theme } = useTheme();
  const styles = useStyles(createStyles);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');

  // Modals state
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [restockVisible, setRestockVisible] = useState(false);
  const [labelModalVisible, setLabelModalVisible] = useState(false);

  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCostPrice, setEditCostPrice] = useState('');
  const [editReorderLevel, setEditReorderLevel] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadProducts = async () => {
    try {
      const res = await productApi.listProducts({ limit: 200 });
      if (res.data?.products) {
        setProducts(res.data.products);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
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

  const categories = useMemo(() => {
    return ['ALL', ...Array.from(new Set(products.map((p) => p.category || 'General')))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'ALL' && (p.category || 'General') !== selectedCategory) {
        return false;
      }
      if (stockStatusFilter === 'OUT_OF_STOCK' && p.stock_quantity > 0) {
        return false;
      }
      if (stockStatusFilter === 'LOW_STOCK' && (p.stock_quantity <= 0 || p.stock_quantity > p.reorder_level)) {
        return false;
      }
      if (stockStatusFilter === 'IN_STOCK' && p.stock_quantity <= p.reorder_level) {
        return false;
      }
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
  }, [products, search, selectedCategory, stockStatusFilter]);

  const openEditModal = (p: Product) => {
    setSelectedProduct(p);
    setEditName(p.name);
    setEditCategory(p.category || 'General');
    setEditPrice(String(p.price));
    setEditCostPrice(String(p.cost_price || ''));
    setEditReorderLevel(String(p.reorder_level || 5));
    setEditDescription(p.description || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedProduct) return;
    if (!editName.trim() || !editPrice.trim()) {
      Alert.alert('Required Fields', 'Product name and selling price are required.');
      return;
    }

    const numPrice = parseFloat(editPrice);
    if (isNaN(numPrice) || numPrice < 0) {
      Alert.alert('Invalid Price', 'Please enter a valid numeric selling price.');
      return;
    }

    setSavingEdit(true);
    try {
      await productApi.updateProduct(selectedProduct.id, {
        name: editName.trim(),
        category: editCategory.trim() || 'General',
        price: numPrice,
        cost_price: parseFloat(editCostPrice) || 0,
        reorder_level: parseInt(editReorderLevel, 10) || 5,
        description: editDescription.trim() || undefined
      });

      Alert.alert('Success', 'Product updated successfully.');
      setEditModalVisible(false);
      loadProducts();
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Failed to update product details.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteProduct = (p: Product) => {
    Alert.alert(
      'Remove Product',
      `Are you sure you want to delete or deactivate '${p.name}' (${p.id})?\n\nIf the product has past sales records, it will be safely retired with 0 stock.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await productApi.deleteProduct(p.id);
              Alert.alert('Product Removed', res.data?.message || 'Product removed successfully.');
              loadProducts();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not remove product.');
            }
          }
        }
      ]
    );
  };

  const openRestock = (p: Product) => {
    setSelectedProduct(p);
    setRestockVisible(true);
  };

  const openLabelModal = (p: Product) => {
    setSelectedProduct(p);
    setLabelModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <Header
        title="Products Catalog"
        subtitle={activeShop ? `${activeShop.name} • ${products.length} Products` : `${products.length} Products`}
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
            {/* Search Input */}
            <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
              <Ionicons name="search-outline" size={18} color={theme.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search products by name or product ID..."
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

            {/* Status Filter Tabs */}
            <View style={styles.statusTabsRow}>
              {[
                { key: 'ALL', label: 'All Products' },
                { key: 'IN_STOCK', label: 'In Stock' },
                { key: 'LOW_STOCK', label: 'Low Stock' },
                { key: 'OUT_OF_STOCK', label: 'Out of Stock' }
              ].map((tab) => {
                const active = stockStatusFilter === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.statusTabBtn,
                      active
                        ? { backgroundColor: theme.primary, borderColor: theme.primary }
                        : { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }
                    ]}
                    onPress={() => setStockStatusFilter(tab.key as any)}
                  >
                    <Text
                      style={[
                        styles.statusTabText,
                        { color: active ? '#FFFFFF' : theme.textSecondary },
                        active && { fontWeight: '700' }
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        }
        renderItem={({ item }) => {
          const isOut = item.stock_quantity <= 0;
          const isLow = item.stock_quantity <= item.reorder_level && !isOut;

          return (
            <View style={[styles.productCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
              {/* Top row: Category, Stock status */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={[styles.categoryPill, { color: theme.textMuted }]}>
                    {item.category || 'General'}
                  </Text>
                  <Text style={[styles.skuCode, { color: theme.textMuted }]}>
                    ID: {item.id}
                  </Text>
                </View>

                {isOut ? (
                  <View style={[styles.statusBadge, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                    <Text style={[styles.statusBadgeText, { color: theme.danger }]}>Out of Stock</Text>
                  </View>
                ) : isLow ? (
                  <View style={[styles.statusBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                    <Text style={[styles.statusBadgeText, { color: '#D97706' }]}>Low Stock ({item.stock_quantity})</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                    <Text style={[styles.statusBadgeText, { color: '#059669' }]}>{item.stock_quantity} in stock</Text>
                  </View>
                )}
              </View>

              {/* Product Title */}
              <Text style={[styles.productTitle, { color: theme.text }]} numberOfLines={2}>
                {item.name}
              </Text>

              {item.description ? (
                <Text style={[styles.productDesc, { color: theme.textSecondary }]} numberOfLines={1}>
                  {item.description}
                </Text>
              ) : null}

              {/* Pricing & Stock Details */}
              <View style={[styles.metaRow, { borderTopColor: theme.surfaceBorder }]}>
                <View style={styles.priceCol}>
                  <Text style={[styles.priceLabel, { color: theme.textMuted }]}>SELLING PRICE</Text>
                  <Text style={[styles.sellingPrice, { color: theme.primary }]}>
                    {formatCurrency(item.price, item.currency_symbol)}
                  </Text>
                </View>

                {item.cost_price ? (
                  <View style={styles.priceCol}>
                    <Text style={[styles.priceLabel, { color: theme.textMuted }]}>COST PRICE</Text>
                    <Text style={[styles.costPrice, { color: theme.textSecondary }]}>
                      {formatCurrency(item.cost_price, item.currency_symbol)}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.priceCol}>
                  <Text style={[styles.priceLabel, { color: theme.textMuted }]}>STOCK LEVEL</Text>
                  <Text
                    style={[
                      styles.stockVal,
                      isOut
                        ? { color: theme.danger }
                        : isLow
                        ? { color: '#D97706' }
                        : { color: theme.text }
                    ]}
                  >
                    {item.stock_quantity} units
                  </Text>
                </View>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.cardActionsRow}>
                {/* Print QR Sticker */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}
                  onPress={() => openLabelModal(item)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="qr-code-outline" size={15} color={theme.text} />
                  <Text style={[styles.actionBtnText, { color: theme.text }]}>QR Label</Text>
                </TouchableOpacity>

                {/* Restock */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}
                  onPress={() => openRestock(item)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="add-circle-outline" size={15} color={theme.primary} />
                  <Text style={[styles.actionBtnText, { color: theme.primary }]}>Restock</Text>
                </TouchableOpacity>

                {/* Edit */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}
                  onPress={() => openEditModal(item)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="create-outline" size={15} color={theme.text} />
                  <Text style={[styles.actionBtnText, { color: theme.text }]}>Edit</Text>
                </TouchableOpacity>

                {/* Delete / Deactivate */}
                <TouchableOpacity
                  style={[styles.actionBtnDanger, { backgroundColor: theme.danger + '10' }]}
                  onPress={() => handleDeleteProduct(item)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="trash-outline" size={15} color={theme.danger} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetags-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No products match your search</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                Add a new product or change the selected category filter.
              </Text>
              <TouchableOpacity
                style={[styles.emptyAddBtn, { backgroundColor: theme.primary }]}
                onPress={() => router.push('/admin/add-product' as any)}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.emptyAddBtnText}>Add New Product</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* Edit Product Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.editCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
            <View style={[styles.editHeader, { borderBottomColor: theme.surfaceBorder }]}>
              <View>
                <Text style={[styles.editTitle, { color: theme.text }]}>Edit Product</Text>
                <Text style={[styles.editSub, { color: theme.textMuted }]}>
                  SKU: {selectedProduct?.id}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editBody}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Product Name *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.surfaceLight, color: theme.text, borderColor: theme.surfaceBorder }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Product Name"
                placeholderTextColor={theme.textMuted}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.surfaceLight, color: theme.text, borderColor: theme.surfaceBorder }]}
                value={editCategory}
                onChangeText={setEditCategory}
                placeholder="e.g. Beverages, Snacks, Groceries"
                placeholderTextColor={theme.textMuted}
              />

              <View style={styles.editTwoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Selling Price *</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.surfaceLight, color: theme.text, borderColor: theme.surfaceBorder }]}
                    value={editPrice}
                    onChangeText={setEditPrice}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Cost Price</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.surfaceLight, color: theme.text, borderColor: theme.surfaceBorder }]}
                    value={editCostPrice}
                    onChangeText={setEditCostPrice}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Low Stock Threshold</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.surfaceLight, color: theme.text, borderColor: theme.surfaceBorder }]}
                value={editReorderLevel}
                onChangeText={setEditReorderLevel}
                keyboardType="numeric"
                placeholder="5"
                placeholderTextColor={theme.textMuted}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, { backgroundColor: theme.surfaceLight, color: theme.text, borderColor: theme.surfaceBorder }]}
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                numberOfLines={3}
                placeholder="Product description notes..."
                placeholderTextColor={theme.textMuted}
              />
            </ScrollView>

            <View style={[styles.editFooter, { borderTopColor: theme.surfaceBorder }]}>
              <TouchableOpacity
                style={[styles.editCancelBtn, { backgroundColor: theme.surfaceLight }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={[styles.editCancelText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.editSaveBtn, { backgroundColor: theme.primary }]}
                onPress={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.editSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Restock Modal */}
      <RestockModal
        visible={restockVisible}
        product={selectedProduct}
        onClose={() => setRestockVisible(false)}
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
      marginBottom: 10,
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
    statusTabsRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 14,
    },
    statusTabBtn: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      borderWidth: 1,
    },
    statusTabText: {
      fontSize: 10,
      fontWeight: '600',
    },
    productCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
      marginBottom: 10,
      ...theme.shadow,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
      marginRight: 6,
    },
    categoryPill: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    skuCode: {
      fontSize: 10,
      fontFamily: 'monospace',
    },
    statusBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
    },
    statusBadgeText: {
      fontSize: 9,
      fontWeight: '800',
    },
    productTitle: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 4,
    },
    productDesc: {
      fontSize: 11,
      marginBottom: 8,
    },
    metaRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      paddingTop: 8,
      marginTop: 4,
      marginBottom: 10,
      justifyContent: 'space-between',
    },
    priceCol: {
      flex: 1,
    },
    priceLabel: {
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 0.4,
      marginBottom: 2,
    },
    sellingPrice: {
      fontSize: 14,
      fontWeight: '800',
    },
    costPrice: {
      fontSize: 12,
      fontWeight: '600',
    },
    stockVal: {
      fontSize: 12,
      fontWeight: '700',
    },
    cardActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
    },
    actionBtnText: {
      fontSize: 11,
      fontWeight: '600',
    },
    actionBtnDanger: {
      width: 34,
      height: 32,
      borderRadius: 8,
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
      marginBottom: 16,
    },
    emptyAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 8,
    },
    emptyAddBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    editCard: {
      width: '100%',
      maxWidth: 480,
      maxHeight: '85%',
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
    },
    editHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
    },
    editTitle: {
      fontSize: 16,
      fontWeight: '700',
    },
    editSub: {
      fontSize: 11,
      marginTop: 2,
    },
    editBody: {
      padding: 16,
    },
    inputLabel: {
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 5,
      marginTop: 8,
    },
    textInput: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 13,
    },
    textArea: {
      height: 60,
      textAlignVertical: 'top',
    },
    editTwoCol: {
      flexDirection: 'row',
      gap: 10,
    },
    editFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      padding: 14,
      borderTopWidth: 1,
      gap: 8,
    },
    editCancelBtn: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 8,
    },
    editCancelText: {
      fontSize: 13,
      fontWeight: '600',
    },
    editSaveBtn: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 8,
    },
    editSaveText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
  });
