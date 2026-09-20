import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { getApiBaseUrl } from '../config/apiConfig';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { user, logout, logoutAll } = useAuth();
  const { theme, mode, setMode } = useTheme();

  const handleSignOut = () => {
    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to sign out of this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive', 
          onPress: () => {
            onClose();
            logout();
          } 
        }
      ]
    );
  };

  const handleSignOutAll = () => {
    Alert.alert(
      'Sign Out All Devices',
      'This will revoke all active sessions for your account across all phones, tablets, and computers. You will need to log in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out Everywhere', 
          style: 'destructive', 
          onPress: () => {
            onClose();
            logoutAll();
          } 
        }
      ]
    );
  };

  const themeOptions: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
    { key: 'light', label: 'Light', icon: 'sunny-outline', desc: 'Crisp bright daylight theme' },
    { key: 'dark', label: 'Dark', icon: 'moon-outline', desc: 'High-contrast midnight slate' },
    { key: 'system', label: 'System', icon: 'phone-portrait-outline', desc: 'Match your device settings' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: theme.surfaceBorder }]}>
            <View style={styles.headerTitleCol}>
              <Text style={[styles.title, { color: theme.text }]}>Settings & Info</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>App preferences and security settings</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.surfaceLight }]}>
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Theme Preference Section */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>APPEARANCE / DISPLAY</Text>
            <View style={styles.themeGrid}>
              {themeOptions.map((opt) => {
                const isSelected = mode === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.themeCard,
                      {
                        backgroundColor: isSelected ? theme.primaryLight : theme.surfaceLight,
                        borderColor: isSelected ? theme.primary : theme.surfaceBorder,
                      }
                    ]}
                    onPress={() => setMode(opt.key)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={22}
                      color={isSelected ? theme.primary : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.themeCardLabel,
                        { color: isSelected ? theme.primary : theme.text, fontWeight: isSelected ? '700' : '600' }
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
                        <Ionicons name="checkmark" size={12} color="#ffffff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Signed-in User Details */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>CURRENT ACCOUNT & IDENTITY</Text>
            <View style={[styles.infoCard, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>User Name:</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{user?.username || 'Guest'}</Text>
              </View>
              {user?.phone_number && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Phone Number:</Text>
                  <Text style={[styles.infoValue, { color: theme.text, fontFamily: 'monospace' }]}>{user.phone_number}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Assigned Role:</Text>
                <Text style={[styles.infoValue, { color: theme.primary, fontWeight: '700' }]}>
                  {user?.role?.toUpperCase() || 'UNKNOWN'}
                </Text>
              </View>
              {user?.shop_name && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Assigned Shop:</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>
                    {user.shop_name} ({user.shop_code})
                  </Text>
                </View>
              )}
            </View>

            {/* Security & Active Session */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SECURITY & SESSION</Text>
            <View style={[styles.infoCard, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Session Architecture:</Text>
                <View style={styles.statusOnline}>
                  <View style={styles.statusDot} />
                  <Text style={[styles.statusText, { color: '#10B981' }]}>Secure Dual-Token</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Access Lifetime:</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>15 Minutes (In-Memory)</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Refresh Lifetime:</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>7 Days (HTTP-Only Cookie)</Text>
              </View>
            </View>

            {/* Application & Server Information */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>APPLICATION DETAILS</Text>
            <View style={[styles.infoCard, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>App Version:</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  v{Constants.expoConfig?.version || '2.0.0'} (Build {Constants.expoConfig?.android?.versionCode || 4})
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Build Type:</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>Standalone Release APK</Text>
              </View>
            </View>

            {/* Logout Actions */}
            <TouchableOpacity
              style={[styles.signOutBtn, { borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}
              onPress={handleSignOut}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={18} color={theme.danger} />
              <Text style={[styles.signOutText, { color: theme.danger }]}>Sign Out of This Device</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.signOutBtn, { borderColor: 'rgba(239, 68, 68, 0.5)', backgroundColor: 'rgba(239, 68, 68, 0.15)', marginTop: 0 }]}
              onPress={handleSignOutAll}
              activeOpacity={0.8}
            >
              <Ionicons name="shield-outline" size={18} color={theme.danger} />
              <Text style={[styles.signOutText, { color: theme.danger }]}>Sign Out of All Devices Everywhere</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
    maxHeight: '85%'
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1
  },
  headerTitleCol: {
    flex: 1
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scroll: {
    marginTop: 14
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8
  },
  themeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    position: 'relative'
  },
  themeCardLabel: {
    fontSize: 13,
    marginTop: 6
  },
  checkCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center'
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 0
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right'
  },
  infoValueSmall: {
    fontSize: 11,
    fontWeight: '500',
    maxWidth: '55%'
  },
  statusOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981'
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700'
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 22,
    marginBottom: 12
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700'
  }
});
