import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useStyles } from '../context/ThemeContext';
import { AppTheme } from '../theme/colors';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  isForced?: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  visible,
  onClose,
  isForced = false
}) => {
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  const { refreshProfile } = useAuth();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const handleSubmit = async () => {
    if (!oldPassword || !newPassword) {
      Alert.alert('Required Fields', 'Please enter your current and new password.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirmation password do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await authApi.changePassword(oldPassword, newPassword);
      await refreshProfile();
      Alert.alert('Success', 'Your password has been changed successfully.', [
        {
          text: 'OK',
          onPress: () => {
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            onClose();
          }
        }
      ]);
    } catch (err: any) {
      Alert.alert('Password Change Failed', err.message || 'Could not change password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="key-outline" size={24} color={theme.primary} />
              <View>
                <Text style={styles.title}>
                  {isForced ? 'Update Temporary Password' : 'Change Password'}
                </Text>
                <Text style={styles.subtitle}>
                  {isForced
                    ? 'You must set a permanent password before continuing'
                    : 'Enter your current password and choose a new one'}
                </Text>
              </View>
            </View>
            {!isForced && (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Form inputs */}
          <View style={styles.form}>
            <Text style={styles.label}>Current / Temporary Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                secureTextEntry={!showPasswords}
                placeholder="Enter current password"
                placeholderTextColor={theme.textMuted}
                value={oldPassword}
                onChangeText={setOldPassword}
              />
              <TouchableOpacity onPress={() => setShowPasswords(!showPasswords)}>
                <Ionicons
                  name={showPasswords ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.textMuted}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>New Permanent Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                secureTextEntry={!showPasswords}
                placeholder="At least 6 characters"
                placeholderTextColor={theme.textMuted}
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                secureTextEntry={!showPasswords}
                placeholder="Re-enter new password"
                placeholderTextColor={theme.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {!isForced && (
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitText}>Save New Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      padding: 20
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.surfaceBorder,
      ...theme.shadow
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text
    },
    subtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2
    },
    closeBtn: {
      padding: 4
    },
    form: {
      gap: 12
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceLight,
      borderWidth: 1,
      borderColor: theme.surfaceBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 44
    },
    input: {
      flex: 1,
      fontSize: 14,
      color: theme.text
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 20
    },
    cancelBtn: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.surfaceBorder
    },
    cancelText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary
    },
    submitBtn: {
      backgroundColor: theme.primary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center'
    },
    submitText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#ffffff'
    }
  });
