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

export default function SuperAdminShops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Form state for creating new shop
  const [shopCode, setShopCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
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
        phone: phone.trim()
      });
      Alert.alert('Success', `Shop '${name}' created successfully!`);
      setShopCode('');
      setName('');
      setAddress('');
      setPhone('');
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
        showBack 
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
                  <Text style={styles.shopCodeBadge}>Code: {shop.shop_code}</Text>
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
              placeholder="e.g. Uptown Supermarket"
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={setName}
            />

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
              placeholder="+1-555-0199"
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
    padding: 16
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    marginBottom: 14
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
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
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
  }
});
