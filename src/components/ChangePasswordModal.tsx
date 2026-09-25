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

  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!oldPin || !newPin) {
      Alert.alert('Required Fields', 'Please enter your current and new 6-digit PIN.');
      return;
    }

    if (!/^\d{6}$/.test(newPin)) {
      Alert.alert('Invalid PIN', 'New PIN must be exactly 6 numeric digits.');
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert('Mismatch', 'New PIN and confirmation PIN do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await authApi.setPin(newPin, oldPin);
      await refreshProfile();
      Alert.alert('Success', 'Your PIN has been updated successfully.', [
        {
          text: 'OK',
          onPress: () => {
            setOldPin('');
            setNewPin('');
            setConfirmPin('');
            onClose();
          }
        }
      ]);
    } catch (err: any) {
      Alert.alert('PIN Update Failed', err.message || 'Could not update PIN.');
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
              <Ionicons name="keypad-outline" size={24} color={theme.primary} />
              <View>
                <Text style={styles.title}>
                  {isForced ? 'Update Temporary PIN' : 'Change PIN'}
                </Text>
                <Text style={styles.subtitle}>
                  {isForced
                    ? 'You must set a permanent 6-digit PIN before continuing'
                    : 'Enter your current PIN and choose a new 6-digit PIN'}
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
            <Text style={styles.label}>Current / Temporary PIN</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                secureTextEntry={true}
                placeholder="Enter current PIN"
                placeholderTextColor={theme.textMuted}
                value={oldPin}
                onChangeText={(val) => setOldPin(val.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <Text style={styles.label}>New Permanent 6-Digit PIN</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                secureTextEntry={true}
                placeholder="6 numeric digits (e.g. 123456)"
                placeholderTextColor={theme.textMuted}
                value={newPin}
                onChangeText={(val) => setNewPin(val.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <Text style={styles.label}>Confirm New PIN</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                secureTextEntry={true}
                placeholder="Re-enter 6-digit PIN"
                placeholderTextColor={theme.textMuted}
                value={confirmPin}
                onChangeText={(val) => setConfirmPin(val.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
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
                <Text style={styles.submitText}>Save New PIN</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const ChangePinModal = ChangePasswordModal;

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
