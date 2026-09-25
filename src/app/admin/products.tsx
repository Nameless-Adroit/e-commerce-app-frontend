import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Platform,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { Badge } from '../../components/Badge';
import { RestockModal } from '../../components/RestockModal';
import { PriceModal } from '../../components/PriceModal';
import { ShrinkageModal } from '../../components/ShrinkageModal';
import { productApi } from '../../services/api';
import { useTheme, useStyles } from '../../context/ThemeContext';
import { AppTheme } from '../../theme/colors';
import { Product } from '../../types';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/currency';

export default function AdminProducts() {
  const router = useRouter();
  const { user, isLoading, activeShop, currencySymbol } = useAuth();
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [restockVisible, setRestockVisible] = useState(false);
  const [priceVisible, setPriceVisible] = useState(false);
  const [shrinkageVisible, setShrinkageVisible] = useState(false);

  const loadProducts = async () => {
    try {
      const res = await productApi.listProducts({
        search: search.trim() || undefined,
        low_stock: filterLowStock || undefined,
        limit: 100
      });
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
  }, [user, isLoading, filterLowStock, activeShop]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const openRestock = (p: Product) => {
    setSelectedProduct(p);
    setRestockVisible(true);
  };

  const openPrice = (p: Product) => {
    setSelectedProduct(p);
    setPriceVisible(true);
  };

  const openShrinkage = (p: Product) => {
    setSelectedProduct(p);
    setShrinkageVisible(true);
  };

  const handlePrintQRLabels = async (p: Product) => {
    try {
      const url = await productApi.getQRLabelsUrl(p.id, 15);
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch (err: any) {
      Alert.alert('Unable to Open PDF', err.message || 'Error generating QR labels PDF.');
    }
  };

  return (

    <View style={styles.container}>
      <Header 
        title="Store Inventory" 
        subtitle="Catalog & Stock Levels" 
        rightAction={
          <TouchableOpacity onPress={() => router.push('/admin/add-product' as any)} style={styles.addHeaderBtn}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addHeaderText}>New</Text>
          </TouchableOpacity>
        }
      />

      {/* Search and Filters */}
      <View style={styles.filterSection}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={theme.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ID, name, or category..."
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={loadProducts}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => { setSearch(''); loadProducts(); }}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity 
          style={[styles.filterChip, filterLowStock && styles.filterChipActive]}
          onPress={() => setFilterLowStock(!filterLowStock)}
        >
          <Ionicons 
            name="warning" 
            size={14} 
            color={filterLowStock ? '#fff' : theme.warning} 
          />
          <Text style={[styles.filterChipText, filterLowStock && styles.filterChipTextActive]}>
            Low Stock Only
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color={theme.textMuted} />
              <Text style={styles.emptyText}>No products found.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isLow = item.stock_quantity <= item.reorder_level;
            return (
              <View style={[styles.productCard, isLow && styles.lowStockBorder]}>
                <View style={styles.cardHeader}>
                  <View style={styles.titleInfo}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <Text style={styles.productIdText}>ID: {item.id}</Text>
                  </View>
                  <Badge 
                    label={item.category || 'General'} 
                    variant="neutral" 
                  />
                </View>

                {item.description ? (
                  <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
                ) : null}

                <View style={styles.priceRow}>
                  <View>
                    <Text style={styles.metaLabel}>Selling Price</Text>
                    <Text style={styles.priceVal}>{formatCurrency(item.price, item.currency_symbol || currencySymbol)}</Text>
                  </View>
                  <View>
                    <Text style={styles.metaLabel}>Buying Price</Text>
                    <Text style={styles.costVal}>{formatCurrency(item.cost_price, item.currency_symbol || currencySymbol)}</Text>
                  </View>
                  <View>
                    <Text style={styles.metaLabel}>Available Units</Text>
                    <Text style={[styles.stockVal, isLow ? { color: theme.danger } : { color: theme.accent }]}>
                      {item.stock_quantity} units
                    </Text>
                  </View>
                </View>

                {/* Management Action Buttons */}
                <View style={styles.actionGrid}>
                  <TouchableOpacity onPress={() => openRestock(item)} style={styles.btnRestock}>
                    <Ionicons name="arrow-up-circle" size={15} color="#fff" />
                    <Text style={styles.btnRestockText}>Restock</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => openPrice(item)} style={styles.btnPrice}>
                    <Ionicons name="pencil" size={13} color={theme.text} />
                    <Text style={styles.btnPriceText}>Price</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handlePrintQRLabels(item)} style={styles.btnQr}>
                    <Ionicons name="qr-code-outline" size={13} color={theme.primary} />
                    <Text style={styles.btnQrText}>Labels</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => openShrinkage(item)} style={styles.btnShrinkage}>
                    <Ionicons name="trash-outline" size={13} color={theme.danger} />
                    <Text style={styles.btnShrinkageText}>Loss</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Modals */}
      <RestockModal 
        visible={restockVisible} 
        product={selectedProduct} 
        onClose={() => setRestockVisible(false)} 
        onSuccess={loadProducts} 
      />

      <PriceModal 
        visible={priceVisible} 
        product={selectedProduct} 
        onClose={() => setPriceVisible(false)} 
        onSuccess={loadProducts} 
      />

      <ShrinkageModal 
        visible={shrinkageVisible} 
        product={selectedProduct} 
        onClose={() => setShrinkageVisible(false)} 
        onSuccess={loadProducts} 
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.sm
  },
  addHeaderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.surfaceBorder,
    backgroundColor: theme.surface
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.inputBg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  searchInput: {
    flex: 1,
    color: theme.text,
    fontSize: 13
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.warning,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: theme.radius.md
  },
  filterChipActive: {
    backgroundColor: theme.warning
  },
  filterChipText: {
    color: theme.warning,
    fontSize: 12,
    fontWeight: '600'
  },
  filterChipTextActive: {
    color: '#fff'
  },
  listContent: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 40
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    color: theme.textMuted,
    fontSize: 14,
    marginTop: 10
  },
  productCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  lowStockBorder: {
    borderColor: 'rgba(245, 158, 11, 0.4)'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6
  },
  titleInfo: {
    flex: 1,
    paddingRight: 10
  },
  productName: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700'
  },
  productIdText: {
    color: theme.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2
  },
  descText: {
    color: theme.textSecondary,
    fontSize: 12,
    marginVertical: 4
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.surfaceLight,
    padding: 10,
    borderRadius: theme.radius.md,
    marginTop: 8,
    marginBottom: 12
  },
  metaLabel: {
    color: theme.textMuted,
    fontSize: 10
  },
  priceVal: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2
  },
  costVal: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2
  },
  stockVal: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 8
  },
  btnRestock: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.primary,
    paddingVertical: 9,
    borderRadius: theme.radius.md
  },
  btnRestockText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  },
  btnPrice: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    paddingVertical: 9,
    borderRadius: theme.radius.md
  },
  btnPriceText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '600'
  },
  btnQr: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.25)',
    paddingVertical: 9,
    borderRadius: theme.radius.md
  },
  btnQrText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '700'
  },
  btnShrinkage: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingVertical: 9,
    borderRadius: theme.radius.md
  },
  btnShrinkageText: {
    color: theme.danger,
    fontSize: 12,
    fontWeight: '600'
  }
});
