import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/colors';

interface ScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (productId: string) => void;
  sampleIds?: string[];
}

export function ScannerModal({ visible, onClose, onScan, sampleIds = [] }: ScannerModalProps) {
  const [manualId, setManualId] = useState('');

  const handleManualSubmit = () => {
    if (manualId.trim()) {
      onScan(manualId.trim().toUpperCase());
      setManualId('');
      onClose();
    }
  };

  const handleChipSelect = (id: string) => {
    onScan(id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.topBar}>
            <View style={styles.titleRow}>
              <Ionicons name="scan" size={22} color={theme.primary} />
              <Text style={styles.title}>Scan Product ID</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Viewfinder simulation frame */}
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />

            <Ionicons name="camera-outline" size={48} color={theme.textMuted} />
            <Text style={styles.viewfinderText}>
              Point camera at product ID barcode/QR
            </Text>
            <View style={styles.laserLine} />
          </View>

          {/* Direct alphanumeric search / input */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionLabel}>Or Enter / Paste Product ID Manually</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. PRD-SHP01-3BSR-CHG4"
                placeholderTextColor={theme.textMuted}
                value={manualId}
                onChangeText={setManualId}
                autoCapitalize="characters"
                onSubmitEditing={handleManualSubmit}
              />
              <TouchableOpacity onPress={handleManualSubmit} style={styles.searchBtn}>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick-tap sample IDs for fast testing / demo */}
          {sampleIds.length > 0 && (
            <View style={styles.quickSection}>
              <Text style={styles.quickLabel}>Quick Demo Scan Suggestions:</Text>
              <View style={styles.chipWrap}>
                {sampleIds.slice(0, 4).map((id) => (
                  <TouchableOpacity key={id} onPress={() => handleChipSelect(id)} style={styles.idChip}>
                    <Ionicons name="barcode-outline" size={14} color={theme.primary} />
                    <Text style={styles.chipText}>{id}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 460,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  title: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700'
  },
  closeBtn: {
    padding: 4
  },
  viewfinder: {
    height: 200,
    backgroundColor: '#050811',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16
  },
  viewfinderText: {
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 8
  },
  laserLine: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    height: 2,
    backgroundColor: theme.danger,
    opacity: 0.8
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: theme.primary
  },
  tl: { top: 12, left: 12, borderTopWidth: 3, borderLeftWidth: 3 },
  tr: { top: 12, right: 12, borderTopWidth: 3, borderRightWidth: 3 },
  bl: { bottom: 12, left: 12, borderBottomWidth: 3, borderLeftWidth: 3 },
  br: { bottom: 12, right: 12, borderBottomWidth: 3, borderRightWidth: 3 },
  inputSection: {
    marginBottom: 12
  },
  sectionLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600'
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8
  },
  textInput: {
    flex: 1,
    backgroundColor: theme.inputBg,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    borderRadius: theme.radius.md,
    color: theme.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  searchBtn: {
    backgroundColor: theme.primary,
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center'
  },
  quickSection: {
    marginTop: 6
  },
  quickLabel: {
    color: theme.textMuted,
    fontSize: 11,
    marginBottom: 6
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  idChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.sm
  },
  chipText: {
    color: theme.text,
    fontSize: 11,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  }
});
