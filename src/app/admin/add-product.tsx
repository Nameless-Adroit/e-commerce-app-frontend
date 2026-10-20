import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { ThermalLabelModal } from '../../components/ThermalLabelModal';
import { productApi } from '../../services/api';
import { useTheme, useStyles } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AppTheme } from '../../theme/colors';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/currency';

const POPULAR_CATEGORIES = ['Beverages', 'Snacks', 'Food & Dairy', 'Toiletries', 'General'];

export default function AddProductScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { currencySymbol, activeShop } = useAuth();
  const styles = useStyles(createStyles);

  const [productId, setProductId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [initialStock, setInitialStock] = useState('10');
  const [reorderLevel, setReorderLevel] = useState('5');
  const [imageUrl, setImageUrl] = useState('');

  const [generatingId, setGeneratingId] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Success Created Product State for immediate QR label preview
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);
  const [thermalModalVisible, setThermalModalVisible] = useState(false);

  useEffect(() => {
    handleGenerateId();
  }, []);

  const handleGenerateId = async () => {
    setGeneratingId(true);
    try {
      const res = await productApi.generateId();
      if (res.data?.product_id) {
        setProductId(res.data.product_id);
      }
    } catch (err: any) {
      console.warn('ID generation fallback:', err.message);
      const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
      setProductId(`PRD-LOC-${rand}`);
    } finally {
      setGeneratingId(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !price) {
      Alert.alert('Missing Info', 'Product Name and Selling Price are required.');
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      Alert.alert('Invalid Price', 'Please enter a valid numeric selling price.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await productApi.createProduct({
        id: productId.trim() || undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || 'General',
        price: numPrice,
        cost_price: parseFloat(costPrice) || 0,
        initial_stock: parseInt(initialStock, 10) || 0,
        reorder_level: parseInt(reorderLevel, 10) || 5
      });

      const prod = res.data;
      if (prod) {
        const fullProd: Product = {
          ...prod,
          currency_symbol: prod.currency_symbol || currencySymbol || 'TSh'
        };
        setCreatedProduct(fullProd);
      } else {
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Creation Failed', err.message || 'Failed to create product.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('General');
    setPrice('');
    setCostPrice('');
    setInitialStock('10');
    setReorderLevel('5');
    setImageUrl('');
    setCreatedProduct(null);
    handleGenerateId();
  };

  return (
    <View style={styles.container}>
      <Header
        title={createdProduct ? 'Product Created' : 'Add New Product'}
        subtitle="Catalog & automatic QR label generation"
        showBack={true}
        onBack={() => router.back()}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* If product was successfully created, show Success Card + Immediate QR Preview */}
        {createdProduct ? (
          <View style={[styles.successCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
            <View style={[styles.successIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Ionicons name="checkmark-circle" size={42} color="#059669" />
            </View>

            <Text style={[styles.successTitle, { color: theme.text }]}>
              Product Added Successfully!
            </Text>
            <Text style={[styles.successSubtitle, { color: theme.textMuted }]}>
              Unique QR code automatically generated and linked to SKU: {createdProduct.id}
            </Text>

            {/* Quick 50x30mm QR sticker preview */}
            <View style={styles.createdStickerPreview}>
              <Image
                source={{
                  uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                    createdProduct.id
                  )}&margin=2`
                }}
                style={styles.createdQrImg}
                resizeMode="contain"
              />
              <View style={styles.createdStickerMeta}>
                <Text style={styles.createdStickerName} numberOfLines={1}>
                  {createdProduct.name}
                </Text>
                <Text style={styles.createdStickerPrice}>
                  {formatCurrency(createdProduct.price, createdProduct.currency_symbol || currencySymbol)}
                </Text>
                <Text style={styles.createdStickerSku}>{createdProduct.id}</Text>
              </View>
            </View>

            {/* Print Label Action */}
            <TouchableOpacity
              style={[styles.printStickerBtn, { backgroundColor: theme.primary }]}
              onPress={() => setThermalModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="print" size={18} color="#FFFFFF" />
              <Text style={styles.printStickerBtnText}>Print Thermal Label (50mm × 30mm)</Text>
            </TouchableOpacity>

            <View style={styles.successActionsRow}>
              <TouchableOpacity
                style={[styles.secondaryActionBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}
                onPress={resetForm}
              >
                <Ionicons name="add-circle-outline" size={16} color={theme.text} />
                <Text style={[styles.secondaryActionText, { color: theme.text }]}>Add Another Product</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryActionBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}
                onPress={() => router.push('/admin/inventory' as any)}
              >
                <Ionicons name="layers-outline" size={16} color={theme.primary} />
                <Text style={[styles.secondaryActionText, { color: theme.primary }]}>View in Inventory</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
            {/* Auto Product ID Generator */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Product ID / SKU *</Text>
                <TouchableOpacity onPress={handleGenerateId} disabled={generatingId}>
                  <Text style={[styles.regenerateText, { color: theme.primary }]}>
                    {generatingId ? 'Generating...' : 'Regenerate ID'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.idContainer, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}>
                <Ionicons name="barcode-outline" size={18} color={theme.primary} />
                <TextInput
                  style={[styles.idInput, { color: theme.text }]}
                  value={productId}
                  onChangeText={setProductId}
                  autoCapitalize="characters"
                  placeholder="e.g. PRD-SHP01-X7K9"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <Text style={[styles.fieldHint, { color: theme.textMuted }]}>
                Guaranteed unique ID encoded into product's scannable QR sticker.
              </Text>
            </View>

            {/* Product Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Product Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder, color: theme.text }]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Coca-Cola 500ml"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            {/* Category with quick chips */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Category</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder, color: theme.text }]}
                value={category}
                onChangeText={setCategory}
                placeholder="Category name"
                placeholderTextColor={theme.textMuted}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {POPULAR_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.suggestionChip,
                      category === cat
                        ? { backgroundColor: theme.primary, borderColor: theme.primary }
                        : { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.suggestionChipText,
                        { color: category === cat ? '#FFFFFF' : theme.text }
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Two Column: Selling Price & Cost Price */}
            <View style={styles.twoCol}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Selling Price ({currencySymbol}) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder, color: theme.text }]}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Cost Price ({currencySymbol})</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder, color: theme.text }]}
                  value={costPrice}
                  onChangeText={setCostPrice}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            </View>

            {/* Two Column: Stock Quantity & Low Stock Threshold */}
            <View style={styles.twoCol}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Initial Stock Quantity</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder, color: theme.text }]}
                  value={initialStock}
                  onChangeText={setInitialStock}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Low Stock Threshold</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder, color: theme.text }]}
                  value={reorderLevel}
                  onChangeText={setReorderLevel}
                  keyboardType="numeric"
                  placeholder="5"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            </View>

            {/* Product Image URL (Optional) */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Product Image URL (Optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder, color: theme.text }]}
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://example.com/image.jpg"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            {/* Product Description */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Product Description</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder, color: theme.text }
                ]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                placeholder="Optional notes, size, package specifications..."
                placeholderTextColor={theme.textMuted}
              />
            </View>

            {/* Submit Action */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.primary }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Create Product & Generate QR</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* 50x30mm Thermal Label Printing Modal */}
      {createdProduct && (
        <ThermalLabelModal
          visible={thermalModalVisible}
          product={createdProduct}
          onClose={() => setThermalModalVisible(false)}
        />
      )}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 80,
    },
    formCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 18,
      ...theme.shadow,
    },
    fieldGroup: {
      marginBottom: 14,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 6,
    },
    regenerateText: {
      fontSize: 12,
      fontWeight: '700',
    },
    idContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      gap: 8,
    },
    idInput: {
      flex: 1,
      paddingVertical: 10,
      fontSize: 14,
      fontFamily: 'monospace',
      fontWeight: '700',
    },
    fieldHint: {
      fontSize: 11,
      marginTop: 4,
    },
    input: {
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
    },
    textArea: {
      height: 70,
      textAlignVertical: 'top',
    },
    chipRow: {
      marginTop: 8,
    },
    suggestionChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 14,
      borderWidth: 1,
      marginRight: 6,
    },
    suggestionChipText: {
      fontSize: 11,
      fontWeight: '600',
    },
    twoCol: {
      flexDirection: 'row',
      gap: 12,
    },
    submitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      marginTop: 8,
      ...theme.shadow,
    },
    submitBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    successCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 24,
      alignItems: 'center',
      ...theme.shadow,
    },
    successIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    successTitle: {
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 6,
      textAlign: 'center',
    },
    successSubtitle: {
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 18,
      paddingHorizontal: 12,
    },
    createdStickerPreview: {
      width: 270,
      height: 140,
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      borderWidth: 2,
      borderColor: '#0F172A',
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 5,
      elevation: 4,
    },
    createdQrImg: {
      width: 80,
      height: 80,
    },
    createdStickerMeta: {
      flex: 1,
    },
    createdStickerName: {
      fontSize: 12,
      fontWeight: '800',
      color: '#0F172A',
      marginBottom: 4,
    },
    createdStickerPrice: {
      fontSize: 14,
      fontWeight: '900',
      color: '#059669',
      marginBottom: 2,
    },
    createdStickerSku: {
      fontSize: 9,
      fontWeight: '700',
      color: '#64748B',
      fontFamily: 'monospace',
    },
    printStickerBtn: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      borderRadius: 10,
      marginBottom: 12,
      ...theme.shadow,
    },
    printStickerBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    successActionsRow: {
      width: '100%',
      flexDirection: 'row',
      gap: 8,
    },
    secondaryActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
    },
    secondaryActionText: {
      fontSize: 11,
      fontWeight: '600',
    },
  });
