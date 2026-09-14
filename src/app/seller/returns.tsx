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
import { Header } from '../../components/Header';
import { ScannerModal } from '../../components/ScannerModal';
import { productApi, posApi } from '../../services/api';
import { theme } from '../../theme/colors';
import { Product } from '../../types';

const COMMON_REASONS = [
  'Customer Return - Unopened Item',
  'Customer Exchange - Size / Variation',
  'Customer Order Cancellation',
  'Defective Item - Not Restockable',
  'Wrong Item Delivered / Picked'
];

export default function SellerReturnsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedReason, setSelectedReason] = useState<string>(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isDefective, setIsDefective] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = async () => {
    try {
      const res = await productApi.listProducts({ limit: 50 });
      if (res.data?.products) {
        setProducts(res.data.products);
      }
    } catch (err) {
      console.error('Failed to load products for returns:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const handleProductScanned = async (productId: string) => {
    try {
      const res = await posApi.scanProduct(productId);
      if (res.data) {
        setSelectedProduct(res.data as any);
        setSearchQuery(res.data.id);
      }
    } catch (err: any) {
      Alert.alert('Scan Result', err.message || `No product found for ID '${productId}'.`);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchQuery(product.id);
  };

  const handleSubmitReturn = async () => {
    if (!selectedProduct) {
      Alert.alert('Selection Required', 'Please select or scan a product to return.');
      return;
    }

    if (quantity <= 0) {
      Alert.alert('Invalid Quantity', 'Return quantity must be at least 1 unit.');
      return;
    }

    const finalReason = selectedReason === 'Other' ? customReason.trim() : selectedReason;
    if (!finalReason) {
      Alert.alert('Reason Required', 'Please specify a valid return reason.');
      return;
    }

    setSubmitting(true);
    try {
      if (isDefective) {
        // Record as defective shrinkage so it doesn't inflate sellable stock
        await productApi.recordShrinkage(
          selectedProduct.id,
          quantity,
          `[DAMAGED/DEFECTIVE RETURN] ${finalReason}`
        );
        Alert.alert(
          'Defective Return Logged',
          `${quantity} unit(s) of ${selectedProduct.name} logged as damaged inventory audit.`
        );
      } else {
        // Return to shelf inventory
        await productApi.restock(
          selectedProduct.id,
          quantity,
          `[CUSTOMER RETURN] ${finalReason}`,
          'return'
        );
        Alert.alert(
          'Return Restocked',
          `Successfully restocked ${quantity} unit(s) of ${selectedProduct.name} back to shelf stock.`
        );
      }

      // Reset form & reload
      setSelectedProduct(null);
      setSearchQuery('');
      setQuantity(1);
      loadProducts();
    } catch (err: any) {
      Alert.alert('Processing Error', err.message || 'Failed to complete return.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Returns & Restock"
        subtitle="Process customer returns and audit shelf inventory"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* Quick Scan Action Bar */}
        <View style={styles.scanBar}>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => setScannerVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="barcode-outline" size={20} color="#ffffff" />
            <Text style={styles.scanBtnText}>Scan Returned Item Barcode</Text>
          </TouchableOpacity>
        </View>

        {/* Product Search & Selection Box */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Locate Product</Text>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color={theme.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search product ID or name..."
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (selectedProduct && text !== selectedProduct.id) {
                  setSelectedProduct(null);
                }
              }}
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSelectedProduct(null);
                }}
              >
                <Ionicons name="close-circle" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* If a product is actively selected */}
          {selectedProduct ? (
            <View style={styles.selectedBadge}>
              <View style={styles.selectedLeft}>
                <Ionicons name="checkmark-circle" size={24} color={theme.accent} />
                <View>
                  <Text style={styles.selectedName}>{selectedProduct.name}</Text>
                  <Text style={styles.selectedMeta}>
                    ID: {selectedProduct.id} • Current Stock: {selectedProduct.stock_quantity}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedProduct(null)} style={styles.changeBtn}>
                <Text style={styles.changeBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            searchQuery.length > 0 && (
              <View style={styles.dropdown}>
                {filteredProducts.slice(0, 5).map((prod) => (
                  <TouchableOpacity
                    key={prod.id}
                    style={styles.dropdownItem}
                    onPress={() => handleSelectProduct(prod)}
                  >
                    <View>
                      <Text style={styles.dropdownName}>{prod.name}</Text>
                      <Text style={styles.dropdownId}>{prod.id}</Text>
                    </View>
                    <Text style={styles.dropdownStock}>{prod.stock_quantity} on shelf</Text>
                  </TouchableOpacity>
                ))}
                {filteredProducts.length === 0 && (
                  <Text style={styles.noResultsText}>No matching products found</Text>
                )}
              </View>
            )
          )}
        </View>

        {/* Quantity & Restock Destination */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Return Quantity & Condition</Text>

          <View style={styles.qtyRow}>
            <Text style={styles.fieldLabel}>Units Being Returned:</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                style={styles.stepperBtn}
              >
                <Ionicons name="remove" size={18} color={theme.text} />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{quantity}</Text>
              <TouchableOpacity
                onPress={() => setQuantity((q) => q + 1)}
                style={styles.stepperBtn}
              >
                <Ionicons name="add" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Condition Toggle */}
          <Text style={styles.fieldLabel}>Inventory Disposition:</Text>
          <View style={styles.conditionRow}>
            <TouchableOpacity
              style={[styles.conditionBtn, !isDefective && styles.conditionBtnActive]}
              onPress={() => setIsDefective(false)}
            >
              <Ionicons
                name="checkmark-done-circle"
                size={20}
                color={!isDefective ? theme.accent : theme.textMuted}
              />
              <View>
                <Text style={[styles.conditionTitle, !isDefective && styles.conditionTitleActive]}>
                  Restock to Shelf
                </Text>
                <Text style={styles.conditionSub}>Item is clean and ready to sell</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.conditionBtn, isDefective && styles.conditionBtnDefectiveActive]}
              onPress={() => setIsDefective(true)}
            >
              <Ionicons
                name="alert-circle"
                size={20}
                color={isDefective ? theme.danger : theme.textMuted}
              />
              <View>
                <Text style={[styles.conditionTitle, isDefective && styles.conditionTitleDanger]}>
                  Damaged / Defective
                </Text>
                <Text style={styles.conditionSub}>Do not add to sellable shelf stock</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Return Reason Selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>3. Return Reason</Text>
          <View style={styles.reasonsList}>
            {COMMON_REASONS.map((r) => {
              const isSelected = selectedReason === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.reasonChip, isSelected && styles.reasonChipActive]}
                  onPress={() => setSelectedReason(r)}
                >
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={isSelected ? theme.primary : theme.textMuted}
                  />
                  <Text style={[styles.reasonText, isSelected && styles.reasonTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!selectedProduct || submitting) && { opacity: 0.6 }
          ]}
          onPress={handleSubmitReturn}
          disabled={!selectedProduct || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <View style={styles.submitBtnContent}>
              <Ionicons name="arrow-undo-circle" size={22} color="#ffffff" />
              <Text style={styles.submitBtnText}>
                {isDefective ? 'Log Defective Return' : 'Confirm Return & Restock Units'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Barcode Scanner Modal */}
      <ScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleProductScanned}
        sampleIds={products.map((p) => p.id)}
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
  scanBar: {
    marginBottom: 14
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    ...theme.shadow
  },
  scanBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    ...theme.shadow
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 12
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.text
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.25)',
    borderRadius: 10,
    padding: 12,
    marginTop: 10
  },
  selectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1
  },
  selectedName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text
  },
  selectedMeta: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2
  },
  changeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: theme.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary
  },
  dropdown: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.surfaceBorder
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.surfaceBorder
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text
  },
  dropdownId: {
    fontSize: 11,
    color: theme.textMuted
  },
  dropdownStock: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.secondary
  },
  noResultsText: {
    fontSize: 13,
    color: theme.textMuted,
    paddingVertical: 10,
    textAlign: 'center'
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 8
  },
  qtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: 8
  },
  stepperBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    minWidth: 32,
    textAlign: 'center'
  },
  divider: {
    height: 1,
    backgroundColor: theme.surfaceBorder,
    marginVertical: 14
  },
  conditionRow: {
    gap: 10
  },
  conditionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.surfaceBorder,
    backgroundColor: theme.surfaceLight
  },
  conditionBtnActive: {
    borderColor: theme.accent,
    backgroundColor: 'rgba(5, 150, 105, 0.05)'
  },
  conditionBtnDefectiveActive: {
    borderColor: theme.danger,
    backgroundColor: 'rgba(220, 38, 38, 0.05)'
  },
  conditionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text
  },
  conditionTitleActive: {
    color: theme.accent
  },
  conditionTitleDanger: {
    color: theme.danger
  },
  conditionSub: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2
  },
  reasonsList: {
    gap: 8
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  reasonChipActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.06)',
    borderColor: theme.primary
  },
  reasonText: {
    fontSize: 13,
    color: theme.text,
    fontWeight: '500'
  },
  reasonTextActive: {
    color: theme.primary,
    fontWeight: '700'
  },
  submitBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    ...theme.shadow
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  }
});
