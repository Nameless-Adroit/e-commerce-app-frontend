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
import { authApi, businessApi, shopApi } from '../../services/api';
import { useTheme, useStyles } from '../../context/ThemeContext';
import { AppTheme } from '../../theme/colors';
import { Business, Shop, User, Role } from '../../types';
import { formatPhoneNumber } from '../../utils/phone';

export default function SuperAdminUsers() {
  const { theme } = useTheme();
  const styles = useStyles(createStyles);

  const [users, setUsers] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

  // Create User Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('admin');
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  // Reset Password Modal State
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [newTempPassword, setNewTempPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  // Edit User Identity / PIN Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPin, setEditPin] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadData = async () => {
    try {
      const [usersRes, bizRes, shopsRes] = await Promise.all([
        authApi.listUsers(),
        businessApi.getAllBusinesses(),
        shopApi.getAllShops()
      ]);

      if (usersRes.data?.users) setUsers(usersRes.data.users);
      if (bizRes.data) {
        setBusinesses(bizRes.data);
        if (bizRes.data.length > 0 && !selectedBusinessId) {
          setSelectedBusinessId(bizRes.data[0].id);
        }
      }
      if (shopsRes.data?.shops) {
        setShops(shopsRes.data.shops);
        if (shopsRes.data.shops.length > 0 && !selectedShopId) {
          setSelectedShopId(shopsRes.data.shops[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load user management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async () => {
    if (!username.trim() || !email.trim() || !fullName.trim()) {
      Alert.alert('Missing Fields', 'Please complete username, email, and full name.');
      return;
    }

    if (role === 'admin' && !selectedBusinessId) {
      Alert.alert('Business Required', 'Please assign this Admin to an active Business.');
      return;
    }

    if (role === 'seller' && !selectedShopId) {
      Alert.alert('Shop Required', 'Please assign this Seller to an active Shop.');
      return;
    }

    setCreating(true);
    try {
      await authApi.registerUser({
        username: username.trim(),
        email: email.trim(),
        phone_number: phoneNumber.trim() || undefined,
        password: password || undefined,
        pin: pin.trim() || undefined,
        full_name: fullName.trim(),
        role,
        business_id: role === 'admin' ? (selectedBusinessId || undefined) : undefined,
        shop_id: role === 'seller' ? (selectedShopId || undefined) : undefined
      });

      Alert.alert('User Created', `User '${username}' provisioned successfully.`);
      setUsername('');
      setEmail('');
      setPhoneNumber('');
      setPin('');
      setPassword('');
      setFullName('');
      setActiveTab('list');
      loadData();
    } catch (err: any) {
      Alert.alert('Creation Failed', err.message || 'Error creating user account');
    } finally {
      setCreating(false);
    }
  };

  const handleEditUser = async () => {
    if (!targetUser) return;
    if (!editFullName.trim()) {
      Alert.alert('Missing Name', 'Full name cannot be empty.');
      return;
    }

    setUpdating(true);
    try {
      await authApi.updateUser(targetUser.id, {
        full_name: editFullName.trim(),
        phone_number: editPhone.trim() || undefined,
        pin: editPin.trim() || undefined
      });

      Alert.alert('Success', 'User profile updated successfully.');
      setEditModalVisible(false);
      setTargetUser(null);
      loadData();
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update user profile.');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleStatus = (u: User) => {
    const actionText = u.is_active ? 'suspend' : 'activate';
    Alert.alert(
      `Confirm ${actionText.toUpperCase()}`,
      `Are you sure you want to ${actionText} user account '${u.username}'?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: u.is_active ? 'Suspend' : 'Activate',
          style: u.is_active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await authApi.setUserStatus(u.id, !u.is_active);
              loadData();
            } catch (err: any) {
              Alert.alert('Action Failed', err.message || 'Could not update user status.');
            }
          }
        }
      ]
    );
  };

  const handleResetPassword = async () => {
    if (!targetUser || !newTempPassword || newTempPassword.length < 4) {
      Alert.alert('Validation Error', 'Temporary PIN must be 4 to 6 numeric digits.');
      return;
    }

    setResetting(true);
    try {
      await authApi.resetPassword(targetUser.id, newTempPassword);
      Alert.alert('PIN Reset', `Temporary PIN set for ${targetUser.username}. The user can now login with this PIN.`);
      setResetModalVisible(false);
      setNewTempPassword('');
      setTargetUser(null);
      loadData();
    } catch (err: any) {
      Alert.alert('Reset Failed', err.message || 'Could not reset PIN.');
    } finally {
      setResetting(false);
    }
  };

  const filteredShops = selectedBusinessId
    ? shops.filter((s) => s.business_id === selectedBusinessId)
    : shops;

  return (
    <View style={styles.container}>
      <Header title="User Administration" subtitle="Manage Admins, Sellers & Credentials" />

      {/* Navigation Segments */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'list' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('list')}
        >
          <Ionicons name="people" size={16} color={activeTab === 'list' ? '#ffffff' : theme.textSecondary} />
          <Text style={[styles.segmentText, activeTab === 'list' && styles.segmentTextActive]}>
            User Directory ({users.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'create' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('create')}
        >
          <Ionicons name="person-add" size={16} color={activeTab === 'create' ? '#ffffff' : theme.textSecondary} />
          <Text style={[styles.segmentText, activeTab === 'create' && styles.segmentTextActive]}>
            Provision User
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : activeTab === 'list' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {users.map((u) => {
            const isSelf = u.role === 'super_admin';
            return (
              <View key={u.id} style={styles.userCard}>
                <View style={styles.userTop}>
                  <View style={styles.userMeta}>
                    <View style={styles.nameRow}>
                      <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                        {u.full_name || u.username}
                      </Text>
                      <View style={[
                        styles.roleBadge,
                        u.role === 'super_admin' ? styles.roleSuper : (u.role === 'admin' ? styles.roleAdmin : styles.roleSeller)
                      ]}>
                        <Text style={styles.roleText}>{u.role.toUpperCase().replace('_', ' ')}</Text>
                      </View>
                    </View>
                    <Text style={styles.userEmail} numberOfLines={1} ellipsizeMode="tail">
                      @{u.username} • {u.email}
                    </Text>
                    {u.phone_number ? (
                      <Text style={[styles.userEmail, { marginTop: 2, color: theme.primary, fontWeight: '600' }]} numberOfLines={1}>
                        📱 {formatPhoneNumber(u.phone_number)}
                      </Text>
                    ) : null}
                    {u.business_name ? (
                      <Text style={styles.userBusiness} numberOfLines={1} ellipsizeMode="tail">
                        🏢 {u.business_name} {u.shop_name ? `• 🏪 ${u.shop_name}` : ''}
                      </Text>
                    ) : null}
                  </View>

                  <View style={[styles.statusBadge, u.is_active ? styles.statusActive : styles.statusSuspended]}>
                    <Text style={[styles.statusBadgeText, u.is_active ? styles.statusTextActive : styles.statusTextSuspended]}>
                      {u.is_active ? 'Active' : 'Suspended'}
                    </Text>
                  </View>
                </View>

                {/* User action buttons */}
                {!isSelf && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => {
                        setTargetUser(u);
                        setEditFullName(u.full_name || '');
                        setEditPhone(u.phone_number || '');
                        setEditPin('');
                        setEditModalVisible(true);
                      }}
                    >
                      <Ionicons name="create-outline" size={14} color={theme.primary} />
                      <Text style={[styles.actionBtnText, { color: theme.primary }]}>Edit Profile & PIN</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => {
                        setTargetUser(u);
                        setNewTempPassword('123456');
                        setResetModalVisible(true);
                      }}
                    >
                      <Ionicons name="key-outline" size={14} color={theme.textSecondary} />
                      <Text style={[styles.actionBtnText, { color: theme.textSecondary }]}>Reset PIN</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, u.is_active ? styles.actionBtnDanger : styles.actionBtnSuccess]}
                      onPress={() => handleToggleStatus(u)}
                    >
                      <Ionicons
                        name={u.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
                        size={14}
                        color={u.is_active ? theme.danger : theme.accent}
                      />
                      <Text style={[styles.actionBtnText, { color: u.is_active ? theme.danger : theme.accent }]}>
                        {u.is_active ? 'Suspend' : 'Reactivate'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Register User Account</Text>
            <Text style={styles.cardDesc}>
              Provision Business Admins or Storefront Sellers with appropriate ownership boundaries.
            </Text>

            {/* Role Selection */}
            <Text style={styles.fieldLabel}>Account Role</Text>
            <View style={styles.roleGrid}>
              <TouchableOpacity
                style={[styles.roleSelectBtn, role === 'admin' && styles.roleSelectBtnActive]}
                onPress={() => setRole('admin')}
              >
                <Ionicons name="shield-checkmark" size={18} color={role === 'admin' ? theme.primary : theme.textMuted} />
                <Text style={[styles.roleSelectText, role === 'admin' && styles.roleSelectTextActive]}>
                  Business Admin
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleSelectBtn, role === 'seller' && styles.roleSelectBtnActive]}
                onPress={() => setRole('seller')}
              >
                <Ionicons name="cart" size={18} color={role === 'seller' ? theme.accent : theme.textMuted} />
                <Text style={[styles.roleSelectText, role === 'seller' && styles.roleSelectTextActive]}>
                  Shop Seller
                </Text>
              </TouchableOpacity>
            </View>

            {/* Business Assignment for Admin */}
            {role === 'admin' && (
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Assign to Business Entity *</Text>
                <View style={styles.optionsWrap}>
                  {businesses.map((b) => {
                    const isSelected = selectedBusinessId === b.id;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={[styles.optionChip, isSelected && styles.optionChipActive]}
                        onPress={() => setSelectedBusinessId(b.id)}
                      >
                        <Text style={[styles.optionChipText, isSelected && styles.optionChipTextActive]}>
                          {b.name} ({b.business_code})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Shop Assignment for Seller */}
            {role === 'seller' && (
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Assign to Shop Branch *</Text>
                <View style={styles.optionsWrap}>
                  {shops.map((s) => {
                    const isSelected = selectedShopId === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.optionChip, isSelected && styles.optionChipActive]}
                        onPress={() => setSelectedShopId(s.id)}
                      >
                        <Text style={[styles.optionChipText, isSelected && styles.optionChipTextActive]}>
                          {s.name} ({s.shop_code})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Marcus Vance"
                placeholderTextColor={theme.textMuted}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. admin_apex"
                placeholderTextColor={theme.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. marcus@apexcommerce.tz"
                placeholderTextColor={theme.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Mobile Phone Number (Login Identifier)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 0712 345 678"
                placeholderTextColor={theme.textMuted}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Staff PIN (4-6 Digits for POS login)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 1234"
                placeholderTextColor={theme.textMuted}
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Initial Password (Optional / Admin fallback)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter strong password"
                placeholderTextColor={theme.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, creating && { opacity: 0.7 }]}
              onPress={handleCreateUser}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>Create User Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Reset PIN Modal */}
      <Modal visible={resetModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Staff PIN</Text>
              <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Assign a temporary login PIN for <Text style={{ fontWeight: '700' }}>{targetUser?.username}</Text>.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter 4-6 digit numeric PIN"
              placeholderTextColor={theme.textMuted}
              value={newTempPassword}
              onChangeText={setNewTempPassword}
              keyboardType="number-pad"
              maxLength={6}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setResetModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { marginTop: 0 }, resetting && { opacity: 0.7 }]}
                onPress={handleResetPassword}
                disabled={resetting}
              >
                {resetting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitBtnText}>Set PIN</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit User Profile & PIN Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User Profile & PIN</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Update profile identity and authorization PIN for <Text style={{ fontWeight: '700' }}>{targetUser?.full_name}</Text> (@{targetUser?.username}).
            </Text>

            <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { marginBottom: 12 }]}
              placeholder="Full Name"
              placeholderTextColor={theme.textMuted}
              value={editFullName}
              onChangeText={setEditFullName}
            />

            <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>Mobile Phone Number</Text>
            <TextInput
              style={[styles.input, { marginBottom: 12 }]}
              placeholder="e.g. 0712 345 678"
              placeholderTextColor={theme.textMuted}
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
            />

            <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>Assign New Staff PIN (Leave blank to keep unchanged)</Text>
            <TextInput
              style={[styles.input, { marginBottom: 16 }]}
              placeholder="4-6 numeric digits"
              placeholderTextColor={theme.textMuted}
              value={editPin}
              onChangeText={setEditPin}
              keyboardType="number-pad"
              maxLength={6}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { marginTop: 0 }, updating && { opacity: 0.7 }]}
                onPress={handleEditUser}
                disabled={updating}
              >
                {updating ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitBtnText}>Save Profile</Text>}
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
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    padding: 6,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8
  },
  segmentBtnActive: {
    backgroundColor: theme.primary
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary
  },
  segmentTextActive: {
    color: '#ffffff',
    fontWeight: '700'
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  userCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    ...theme.shadow
  },
  userTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  userMeta: {
    flex: 1,
    minWidth: 0,
    marginRight: 8
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
    flexShrink: 1
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0
  },
  roleSuper: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)'
  },
  roleAdmin: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)'
  },
  roleSeller: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)'
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.primary
  },
  userEmail: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 4
  },
  userBusiness: {
    fontSize: 12,
    color: theme.textMuted
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)'
  },
  statusSuspended: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)'
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  statusTextActive: {
    color: theme.accent
  },
  statusTextSuspended: {
    color: theme.danger
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.surfaceBorder
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    flexGrow: 1,
    justifyContent: 'center'
  },
  actionBtnDanger: {
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  actionBtnSuccess: {
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600'
  },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: 14,
    padding: 18,
    ...theme.shadow
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4
  },
  cardDesc: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 16
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 6
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14
  },
  roleSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1.5,
    borderColor: theme.surfaceBorder
  },
  roleSelectBtnActive: {
    borderColor: theme.primary,
    backgroundColor: 'rgba(79, 70, 229, 0.08)'
  },
  roleSelectText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text
  },
  roleSelectTextActive: {
    color: theme.primary,
    fontWeight: '700'
  },
  inputGroup: {
    marginBottom: 14
  },
  input: {
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: theme.text
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  optionChipActive: {
    borderColor: theme.primary,
    backgroundColor: 'rgba(79, 70, 229, 0.1)'
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.text
  },
  optionChipTextActive: {
    color: theme.primary,
    fontWeight: '700'
  },
  submitBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    ...theme.shadow
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text
  },
  modalDesc: {
    fontSize: 13,
    color: theme.textSecondary,
    marginBottom: 14
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary
  }
});
