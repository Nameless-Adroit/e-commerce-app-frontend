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
  Modal 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { shopApi } from '../../services/api';
import { theme } from '../../theme/colors';
import { Shop } from '../../types';
import { SUPPORTED_CURRENCIES } from '../../utils/currency';

export default function SuperAdminShops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Form state for creating new shop
  const [shopCode, setShopCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(SUPPORTED_CURRENCIES[0]);
  const [creating, setCreating] = useState(false);


  const loadShops = async () => {
    try {
      const res = await shopApi.getAllShops();
      if (res.data?.shops) {
        setShops(res.data.shops);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load shops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShops();
  }, []);

  const handleCreateShop = async () => {
    if (!shopCode.trim() || !name.trim()) {
      Alert.alert('Required Fields', 'Please provide a unique Shop Code (e.g. SHP03) and Business Name.');
      return;
    }

    setCreating(true);
    try {
      await shopApi.createShop({
        shop_code: shopCode.trim().toUpperCase(),
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        currency_code: selectedCurrency.code,
        currency_symbol: selectedCurrency.symbol,
        currency_name: selectedCurrency.name
      });
      Alert.alert('Success', `Shop '${name}' created successfully with ${selectedCurrency.code} (${selectedCurrency.symbol})!`);
      setShopCode('');
      setName('');
      setAddress('');
      setPhone('');
      setSelectedCurrency(SUPPORTED_CURRENCIES[0]);
      setModalVisible(false);
      loadShops();
    } catch (err: any) {
      Alert.alert('Failed to Create Shop', err.message || 'Error occurred');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Manage Businesses" 
        subtitle="Multi-Tenant Independent Stores" 
        rightAction={
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add Shop</Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {shops.map((shop) => (
            <View key={shop.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.shopIconBox}>
                  <Ionicons name="storefront" size={24} color={theme.primary} />
                </View>
                <View style={styles.titleCol}>
                  <Text style={styles.shopName}>{shop.name}</Text>
                  <View style={styles.codeAndCurrencyRow}>
                    <Text style={styles.shopCodeBadge}>Code: {shop.shop_code}</Text>
                    <View style={styles.currencyBadge}>
                      <Text style={styles.currencyBadgeText}>
                        {shop.currency_symbol || 'TSh'} ({shop.currency_code || 'TZS'})
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {shop.address && (
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={14} color={theme.textMuted} />
                  <Text style={styles.metaText}>{shop.address}</Text>
                </View>
              )}

              {shop.phone && (
                <View style={styles.metaRow}>
                  <Ionicons name="call-outline" size={14} color={theme.textMuted} />
                  <Text style={styles.metaText}>{shop.phone}</Text>
                </View>
              )}

              <View style={styles.statsBar}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Assigned Staff</Text>
                  <Text style={styles.statNumber}>{shop.staff_count || 0}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Products</Text>
                  <Text style={styles.statNumber}>{shop.product_count || 0}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Total Inventory</Text>
                  <Text style={styles.statNumber}>{shop.total_units_in_stock || 0} units</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add Shop Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Register New Business</Text>
            <Text style={styles.modalDesc}>Create an independent shop entity in the system.</Text>

            <Text style={styles.label}>Shop Code (Unique Prefix)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. SHP03"
              placeholderTextColor={theme.textMuted}
              value={shopCode}
              onChangeText={setShopCode}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Business Display Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Kariakoo Mobile Store"
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Flexible Currency Picker */}
            <Text style={styles.label}>Operating Currency</Text>
            <View style={styles.currencyChipsRow}>
              {SUPPORTED_CURRENCIES.map((curr) => {
                const isSelected = selectedCurrency.code === curr.code;
                return (
                  <TouchableOpacity
                    key={curr.code}
                    style={[styles.currencyChip, isSelected && styles.currencyChipActive]}
                    onPress={() => setSelectedCurrency(curr)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.currencyChipText, isSelected && styles.currencyChipTextActive]}>
                      {curr.symbol} {curr.code}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.selectedCurrencyDesc}>
              {selectedCurrency.name} • {selectedCurrency.country}
            </Text>

            <Text style={styles.label}>Physical Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Store location address (e.g. Kariakoo Market St)"
              placeholderTextColor={theme.textMuted}
              value={address}
              onChangeText={setAddress}
            />

            <Text style={styles.label}>Contact Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="+255 712 345 678"
              placeholderTextColor={theme.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.btnRow}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn} disabled={creating}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateShop} style={styles.confirmBtn} disabled={creating}>
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Create Shop</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 40
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.sm
  },
  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.lg,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10
  },
  shopIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  titleCol: {
    flex: 1
  },
  shopName: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700'
  },
  shopCodeBadge: {
    color: theme.primary,
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
    marginTop: 2
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6
  },
  metaText: {
    color: theme.textSecondary,
    fontSize: 13
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceLight,
    borderRadius: theme.radius.md,
    padding: 10,
    marginTop: 10
  },
  statCol: {
    flex: 1,
    alignItems: 'center'
  },
  statLabel: {
    color: theme.textMuted,
    fontSize: 11
  },
  statNumber: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.lg,
    padding: 24,
    width: '100%',
    maxWidth: 420
  },
  modalTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700'
  },
  modalDesc: {
    color: theme.textSecondary,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16
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
    marginBottom: 12
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: theme.surfaceLight,
    borderRadius: theme.radius.md,
    alignItems: 'center'
  },
  cancelText: {
    color: theme.textSecondary,
    fontWeight: '600'
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: theme.primary,
    borderRadius: theme.radius.md,
    alignItems: 'center'
  },
  confirmText: {
    color: '#fff',
    fontWeight: '700'
  },
  codeAndCurrencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4
  },
  currencyBadge: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  currencyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669'
  },
  currencyChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6
  },
  currencyChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  currencyChipActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
    borderColor: theme.primary
  },
  currencyChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary
  },
  currencyChipTextActive: {
    color: theme.primary,
    fontWeight: '800'
  },
  selectedCurrencyDesc: {
    fontSize: 11,
    color: theme.accent,
    fontWeight: '600',
    marginBottom: 12
  }
});
