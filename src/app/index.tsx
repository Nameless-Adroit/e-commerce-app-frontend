import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator, 
  Alert, 
  ScrollView,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme/colors';
import { getApiBaseUrl, setApiBaseUrl, initApiConfig } from '../config/apiConfig';

export default function LoginScreen() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getApiBaseUrl());

  React.useEffect(() => {
    initApiConfig().then((url: string) => {
      setServerUrlInput(url);
    });
  }, []);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter your username/email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(identifier.trim(), password);
    } catch (err: any) {
      Alert.alert('Authentication Failed', err.message || 'Invalid credentials or server unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPersona = (user: string, pass: string) => {
    setIdentifier(user);
    setPassword(pass);
  };

  const handleSaveServerUrl = async () => {
    if (serverUrlInput.trim()) {
      await setApiBaseUrl(serverUrlInput.trim());
      setServerModalVisible(false);
      Alert.alert('Settings Saved', `API Base URL set to: ${serverUrlInput.trim()}`);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Branding */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Ionicons name="storefront" size={36} color={theme.primary} />
          </View>
          <Text style={styles.appTitle}>Apex POS & Retail</Text>
          <Text style={styles.appSubtitle}>Multi-Tier E-Commerce & Point of Sale System</Text>
        </View>

        {/* Login Form Card */}
        <View style={styles.card}>
          <Text style={styles.formTitle}>Unified Login Portal</Text>
          <Text style={styles.formDesc}>Sign in with your role-authorized credentials</Text>

          {/* Identifier Input */}
          <Text style={styles.inputLabel}>Username or Email</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. admin_tech or superadmin"
              placeholderTextColor={theme.textMuted}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor={theme.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.loginBtn, loading && styles.btnDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.btnInner}>
                <Text style={styles.loginBtnText}>Authenticate & Enter</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Quick Demo Personas */}
          <View style={styles.personaSection}>
            <Text style={styles.personaSectionTitle}>Quick Demo 1-Tap Login:</Text>
            
            <View style={styles.personaChips}>
              <TouchableOpacity 
                style={[styles.chip, styles.chipSuper]}
                onPress={() => handleQuickPersona('superadmin', 'SuperAdmin123!')}
              >
                <Ionicons name="shield-checkmark" size={14} color="#EF4444" />
                <Text style={styles.chipTextSuper}>Super Admin</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.chip, styles.chipAdmin]}
                onPress={() => handleQuickPersona('admin_tech', 'Admin123!')}
              >
                <Ionicons name="briefcase" size={14} color="#818CF8" />
                <Text style={styles.chipTextAdmin}>Shop Admin</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.chip, styles.chipSeller]}
                onPress={() => handleQuickPersona('seller_alice', 'Seller123!')}
              >
                <Ionicons name="cart" size={14} color="#10B981" />
                <Text style={styles.chipTextSeller}>POS Seller</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Server Config Button */}
        <TouchableOpacity 
          style={styles.serverSettingsBtn}
          onPress={() => {
            setServerUrlInput(getApiBaseUrl());
            setServerModalVisible(true);
          }}
        >
          <Ionicons name="server-outline" size={14} color={theme.textMuted} />
          <Text style={styles.serverSettingsText}>Server: {getApiBaseUrl()}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Server URL Config Modal */}
      <Modal visible={serverModalVisible} transparent animationType="fade" onRequestClose={() => setServerModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Backend API Host Config</Text>
            <Text style={styles.modalDesc}>
              Set the backend API host. Use your computer's local LAN IP (e.g., http://192.168.0.13:3000) when connecting from a physical mobile phone.
            </Text>

            <TextInput
              style={styles.modalInput}
              value={serverUrlInput}
              onChangeText={setServerUrlInput}
              placeholder="http://192.168.0.13:3000"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setServerModalVisible(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveServerUrl} style={styles.modalSaveBtn}>
                <Text style={styles.modalSaveText}>Save URL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14
  },
  appTitle: {
    color: theme.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5
  },
  appSubtitle: {
    color: theme.textSecondary,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center'
  },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.lg,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center'
  },
  formTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '700'
  },
  formDesc: {
    color: theme.textSecondary,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20
  },
  inputLabel: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBg,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    borderRadius: theme.radius.md,
    marginBottom: 16,
    paddingHorizontal: 12
  },
  inputIcon: {
    marginRight: 8
  },
  input: {
    flex: 1,
    color: theme.text,
    paddingVertical: 12,
    fontSize: 14
  },
  eyeBtn: {
    padding: 6
  },
  loginBtn: {
    backgroundColor: theme.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8
  },
  btnDisabled: {
    opacity: 0.6
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700'
  },
  personaSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: theme.surfaceBorder,
    paddingTop: 16
  },
  personaSectionTitle: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center'
  },
  personaChips: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1
  },
  chipSuper: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  chipTextSuper: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600'
  },
  chipAdmin: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  chipTextAdmin: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '600'
  },
  chipSeller: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  chipTextSeller: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600'
  },
  serverSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20
  },
  serverSettingsText: {
    color: theme.textMuted,
    fontSize: 12
  },
  modalOverlay: {
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
    maxWidth: 400
  },
  modalTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700'
  },
  modalDesc: {
    color: theme.textSecondary,
    fontSize: 13,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18
  },
  modalInput: {
    backgroundColor: theme.inputBg,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    borderRadius: theme.radius.md,
    color: theme.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.surfaceLight,
    alignItems: 'center'
  },
  modalCancelText: {
    color: theme.textSecondary,
    fontWeight: '600'
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.primary,
    alignItems: 'center'
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: '700'
  }
});
