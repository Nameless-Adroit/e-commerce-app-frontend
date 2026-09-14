import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { authApi, shopApi } from '../../services/api';
import { theme } from '../../theme/colors';
import { Shop, Role } from '../../types';

export default function SuperAdminUsers() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('admin');
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const res = await shopApi.getAllShops();
        if (res.data?.shops) {
          setShops(res.data.shops);
          if (res.data.shops.length > 0) {
            setSelectedShopId(res.data.shops[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleCreateUser = async () => {
    if (!username.trim() || !email.trim() || !password || !fullName.trim()) {
      Alert.alert('Missing Fields', 'Please complete all user fields.');
      return;
    }

    if (role !== 'super_admin' && !selectedShopId) {
      Alert.alert('Shop Required', 'Admins and Sellers must be assigned to an active shop.');
      return;
    }

    setCreating(true);
    try {
      await authApi.registerUser({
        username: username.trim(),
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role,
        shop_id: role === 'super_admin' ? undefined : (selectedShopId || undefined)
      });

      Alert.alert('Success', `User '${username}' created with role '${role}'.`);
      setUsername('');
      setEmail('');
      setPassword('');
      setFullName('');
    } catch (err: any) {
      Alert.alert('Creation Failed', err.message || 'Error creating user account');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="User Provisioning" subtitle="Create System Staff Accounts" showBack />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Register New User</Text>
            <Text style={styles.cardDesc}>Assign permissions and shop scopes for platform personnel.</Text>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Johnathan Davis"
              placeholderTextColor={theme.textMuted}
              value={fullName}
              onChangeText={setFullName}
            />

            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. admin_uptown"
              placeholderTextColor={theme.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. john@business.com"
              placeholderTextColor={theme.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor={theme.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Text style={styles.label}>Role Permission</Text>
            <View style={styles.rolePicker}>
              {(['admin', 'seller', 'super_admin'] as Role[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleOption, role === r && styles.roleOptionActive]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                    {r === 'super_admin' ? 'Super Admin' : r === 'admin' ? 'Shop Admin' : 'Seller POS'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {role !== 'super_admin' && (
              <View style={styles.shopAssignSection}>
                <Text style={styles.label}>Assign to Shop</Text>
                <View style={styles.shopPicker}>
                  {shops.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.shopOption, selectedShopId === s.id && styles.shopOptionActive]}
                      onPress={() => setSelectedShopId(s.id)}
                    >
                      <Text style={[styles.shopText, selectedShopId === s.id && styles.shopTextActive]}>
                        {s.name} ({s.shop_code})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity 
              onPress={handleCreateUser} 
              style={[styles.submitBtn, creating && { opacity: 0.7 }]}
              disabled={creating}
            >
              {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create User Account</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
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
  cardTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700'
  },
  cardDesc: {
    color: theme.textSecondary,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 18
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
  rolePicker: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  roleOption: {
    flex: 1,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    alignItems: 'center'
  },
  roleOptionActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    borderColor: theme.primary
  },
  roleText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  roleTextActive: {
    color: theme.primary,
    fontWeight: '700'
  },
  shopAssignSection: {
    marginBottom: 16
  },
  shopPicker: {
    gap: 8
  },
  shopOption: {
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.md
  },
  shopOptionActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderColor: theme.secondary
  },
  shopText: {
    color: theme.textSecondary,
    fontSize: 13
  },
  shopTextActive: {
    color: theme.secondary,
    fontWeight: '700'
  },
  submitBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: 10
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700'
  }
});
