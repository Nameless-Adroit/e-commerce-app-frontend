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
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { productApi } from '../../services/api';
import { theme } from '../../theme/colors';

export default function AddProductScreen() {
  const router = useRouter();
  const [productId, setProductId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [initialStock, setInitialStock] = useState('10');
  const [reorderLevel, setReorderLevel] = useState('5');
  
  const [generatingId, setGeneratingId] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auto-generate an initial unique ID on mount
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
      // Fallback local format if offline
      const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
      setProductId(`PRD-LOC-${rand}`);
    } finally {
      setGeneratingId(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !price) {
      Alert.alert('Missing Info', 'Product Name and Retail Selling Price are required.');
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price.');
      return;
    }

    setSubmitting(true);
    try {
      await productApi.createProduct({
        id: productId.trim() || undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || 'General',
        price: numPrice,
        cost_price: parseFloat(costPrice) || 0,
        initial_stock: parseInt(initialStock, 10) || 0,
        reorder_level: parseInt(reorderLevel, 10) || 5
      });

      Alert.alert(
        'Product Created', 
        `Product with ID '${productId}' was added to your store catalog.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert('Creation Failed', err.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Add New Product" subtitle="Unique ID Generation & Inventory Entry" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          {/* Unique ID Section (SRS 3.2) */}
          <Text style={styles.sectionHeader}>1. Unique Alphanumeric Identification</Text>
          <Text style={styles.sectionDesc}>
            This unique alphanumeric ID is used directly on product labels and scanned by sellers at checkout.
          </Text>

          <View style={styles.idBox}>
            <View style={styles.idDisplay}>
              <Ionicons name="finger-print" size={22} color={theme.primary} />
              <TextInput
                style={styles.idInput}
                value={productId}
                onChangeText={setProductId}
                placeholder="PRD-..."
                placeholderTextColor={theme.textMuted}
                autoCapitalize="characters"
              />
            </View>

            <TouchableOpacity 
              style={styles.generateBtn} 
              onPress={handleGenerateId}
              disabled={generatingId}
            >
              {generatingId ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color="#fff" />
                  <Text style={styles.generateText}>Regenerate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Product Details Section */}
          <Text style={[styles.sectionHeader, { marginTop: 20 }]}>2. Product Information</Text>

          <Text style={styles.label}>Product Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 100W Fast Charging Cable"
            placeholderTextColor={theme.textMuted}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Category</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Accessories, Audio, Footwear"
            placeholderTextColor={theme.textMuted}
            value={category}
            onChangeText={setCategory}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Product specs, color, model details..."
            placeholderTextColor={theme.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          {/* Pricing & Stock Section */}
          <Text style={[styles.sectionHeader, { marginTop: 20 }]}>3. Pricing & Stock Setup</Text>

          <View style={styles.rowInputs}>
            <View style={styles.halfCol}>
              <Text style={styles.label}>Retail Price ($) *</Text>
              <TextInput
                style={styles.input}
                placeholder="49.99"
                placeholderTextColor={theme.textMuted}
                keyboardType="decimal-pad"
                value={price}
                onChangeText={setPrice}
              />
            </View>

            <View style={styles.halfCol}>
              <Text style={styles.label}>Cost Price ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="22.50"
                placeholderTextColor={theme.textMuted}
                keyboardType="decimal-pad"
                value={costPrice}
                onChangeText={setCostPrice}
              />
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={styles.halfCol}>
              <Text style={styles.label}>Initial Stock (Units)</Text>
              <TextInput
                style={styles.input}
                placeholder="20"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                value={initialStock}
                onChangeText={setInitialStock}
              />
            </View>

            <View style={styles.halfCol}>
              <Text style={styles.label}>Low-Stock Alert Level</Text>
              <TextInput
                style={styles.input}
                placeholder="5"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                value={reorderLevel}
                onChangeText={setReorderLevel}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.submitBtnInner}>
                <Ionicons name="checkmark-done" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Save & Register Product</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 40
  },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.lg,
    padding: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  sectionHeader: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4
  },
  sectionDesc: {
    color: theme.textSecondary,
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16
  },
  idBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  idDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.inputBg,
    borderWidth: 1,
    borderColor: theme.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  idInput: {
    flex: 1,
    color: theme.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
    fontWeight: '700'
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: theme.radius.md
  },
  generateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  label: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6
  },
  input: {
    backgroundColor: theme.inputBg,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    borderRadius: theme.radius.md,
    color: theme.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: 'top'
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12
  },
  halfCol: {
    flex: 1
  },
  submitBtn: {
    backgroundColor: theme.accent,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  }
});
