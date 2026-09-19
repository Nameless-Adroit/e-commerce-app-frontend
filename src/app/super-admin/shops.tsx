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
import { shopApi, businessApi } from '../../services/api';
import { useTheme, useStyles } from '../../context/ThemeContext';
import { AppTheme } from '../../theme/colors';
import { Shop, Business } from '../../types';
import { SUPPORTED_CURRENCIES } from '../../utils/currency';

export default function SuperAdminShops() {
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  const [shops, setShops] = useState<Shop[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessFilter, setSelectedBusinessFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Form state for creating new shop
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | undefined>(undefined);
  const [shopCode, setShopCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(SUPPORTED_CURRENCIES[0]);
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    try {
      const [shopsRes, bizRes] = await Promise.all([
        shopApi.getAllShops(),
        businessApi.getAllBusinesses()
      ]);

      if (shopsRes.data?.shops) {
        setShops(shopsRes.data.shops);
      }
      if (bizRes.data) {
        const bizList = bizRes.data;
        setBusinesses(bizList);
        if (bizList.length > 0) {
          setSelectedBusinessId((prev) => prev ?? bizList[0].id);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load shop directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredShops = selectedBusinessFilter === 'ALL'
    ? shops
    : shops.filter((s) => String(s.business_id) === selectedBusinessFilter);

  const handleCreateShop = async () => {
    if (!shopCode.trim() || !name.trim()) {
      Alert.alert('Required Fields', 'Please provide a unique Shop Code (e.g. SHP03) and Shop Name.');
      return;
    }

    if (!selectedBusinessId && businesses.length > 0) {
      Alert.alert('Required Fields', 'Please select a parent Business.');
      return;
    }

    setCreating(true);
    try {
      await shopApi.createShop({
        business_id: selectedBusinessId,
        shop_code: shopCode.trim().toUpperCase(),
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        currency_code: selectedCurrency.code,
        currency_symbol: selectedCurrency.symbol,
        currency_name: selectedCurrency.name
      });
      Alert.alert('Success', `Shop '${name}' created successfully with currency ${selectedCurrency.code} (${selectedCurrency.symbol})!`);
      setShopCode('');
      setName('');
      setAddress('');
      setPhone('');
      setSelectedCurrency(SUPPORTED_CURRENCIES[0]);
      setModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Failed to Create Shop', err.message || 'Error occurred');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Store Branches" 
        subtitle="All Retail Outlets & Branches" 
        rightAction={
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add Store</Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Business Filter Chips */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Filter by Business:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              <TouchableOpacity
                style={[styles.filterChip, selectedBusinessFilter === 'ALL' && styles.filterChipActive]}
                onPress={() => setSelectedBusinessFilter('ALL')}
              >
                <Text style={[styles.filterChipText, selectedBusinessFilter === 'ALL' && styles.filterChipTextActive]}>
                  All Businesses ({shops.length})
                </Text>
              </TouchableOpacity>
              {businesses.map((b) => {
                const count = shops.filter((s) => s.business_id === b.id).length;
                const isSelected = selectedBusinessFilter === String(b.id);
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    onPress={() => setSelectedBusinessFilter(String(b.id))}
                  >
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {b.name} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {filteredShops.map((shop) => {
            const parentBiz = businesses.find((b) => b.id === shop.business_id);
            return (
              <View key={shop.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.shopIconBox}>
                    <Ionicons name="storefront" size={24} color={theme.primary} />
                  </View>
                  <View style={styles.titleCol}>
                    <Text style={styles.shopName}>{shop.name}</Text>
                    <View style={styles.codeAndCurrencyRow}>
                      <Text style={styles.shopCodeBadge}>Code: {shop.shop_code}</Text>
                      {parentBiz && (
                        <View style={styles.bizBadge}>
                          <Ionicons name="business" size={10} color={theme.primary} />
                          <Text style={styles.bizBadgeText}>{parentBiz.name}</Text>
                        </View>
                      )}
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
            );
          })}

          {filteredShops.length === 0 && (
            <View style={styles.emptyBox}>
              <Ionicons name="storefront-outline" size={38} color={theme.textMuted} />
              <Text style={styles.emptyText}>No stores found for this selection.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Shop Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Register Store Branch</Text>
            <Text style={styles.modalDesc}>Add an independent store branch under a business.</Text>

            {/* Business Selector */}
            <Text style={styles.label}>Parent Business Enterprise *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bizSelectorScroll}>
              {businesses.map((biz) => {
                const isSelected = selectedBusinessId === biz.id;
                return (
                  <TouchableOpacity
                    key={biz.id}
                    style={[styles.bizChip, isSelected && styles.bizChipActive]}
                    onPress={() => setSelectedBusinessId(biz.id)}
                  >
                    <Ionicons 
                      name="business" 
                      size={12} 
                      color={isSelected ? '#fff' : theme.textSecondary} 
                    />
                    <Text style={[styles.bizChipText, isSelected && styles.bizChipTextActive]}>
                      {biz.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>Shop Code (Unique Prefix) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. SHP03, MWZ01"
              placeholderTextColor={theme.textMuted}
              value={shopCode}
              onChangeText={setShopCode}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Store Display Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mwanza City Center Branch"
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Operating Currency */}
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

            <Text style={styles.label}>Physical Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Store location address"
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
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Create Store</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  scroll: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.sm
  },
  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  filterSection: {
    marginBottom: 16
  },
  filterLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6
  },
  chipsScroll: {
    flexDirection: 'row'
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    marginRight: 8
  },
  filterChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary
  },
  filterChipText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '700'
  },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.md,
    padding: 16,
    marginBottom: 12
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
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  titleCol: {
    flex: 1
  },
  shopName: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800'
  },
  codeAndCurrencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4
  },
  shopCodeBadge: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4
  },
  bizBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4
  },
  bizBadgeText: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '600'
  },
  currencyBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4
  },
  currencyBadgeText: {
    color: theme.accent,
    fontSize: 11,
    fontWeight: '600'
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4
  },
  metaText: {
    color: theme.textSecondary,
    fontSize: 12
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: 8,
    padding: 10,
    marginTop: 12
  },
  statCol: {
    alignItems: 'center',
    flex: 1
  },
  statLabel: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: '600'
  },
  statNumber: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2
  },
  emptyBox: {
    alignItems: 'center',
    padding: 30
  },
  emptyText: {
    color: theme.textSecondary,
    fontSize: 13,
    marginTop: 8
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    maxHeight: '90%'
  },
  modalTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '800'
  },
  modalDesc: {
    color: theme.textSecondary,
    fontSize: 12,
    marginBottom: 12
  },
  bizSelectorScroll: {
    flexDirection: 'row',
    marginBottom: 10
  },
  bizChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    marginRight: 8
  },
  bizChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary
  },
  bizChipText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  bizChipTextActive: {
    color: '#fff',
    fontWeight: '700'
  },
  label: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4
  },
  input: {
    backgroundColor: theme.inputBg,
    borderColor: theme.inputBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: theme.text,
    fontSize: 14
  },
  currencyChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4
  },
  currencyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  currencyChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary
  },
  currencyChipText: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '600'
  },
  currencyChipTextActive: {
    color: '#fff',
    fontWeight: '700'
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  cancelText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  confirmBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  confirmText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  }
});
