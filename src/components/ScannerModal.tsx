import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Platform,
  Animated,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useTheme, useStyles } from '../context/ThemeContext';
import { AppTheme } from '../theme/colors';

interface ScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (productId: string) => void;
  sampleIds?: string[];
}

export function ScannerModal({ visible, onClose, onScan, sampleIds = [] }: ScannerModalProps) {
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  const [manualId, setManualId] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Viewfinder laser line animation
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setTorchOn(false);

      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();

      return () => animation.stop();
    }
  }, [visible]);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);

    const scannedText = (result.data || '').trim().toUpperCase();
    if (scannedText) {
      onScan(scannedText);
      setTimeout(() => {
        onClose();
      }, 300);
    } else {
      setScanned(false);
    }
  };

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

  const translateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 185],
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.topBar}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="scan" size={20} color={theme.primary} />
              </View>
              <View>
                <Text style={styles.title}>Scan Barcode / QR</Text>
                <Text style={styles.subtitle}>Hold product code in the frame</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Camera Viewfinder */}
          <View style={styles.cameraContainer}>
            {!permission ? (
              <View style={styles.permissionBox}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={styles.permissionText}>Loading camera...</Text>
              </View>
            ) : !permission.granted ? (
              <View style={styles.permissionBox}>
                <Ionicons name="camera-outline" size={44} color={theme.textMuted} />
                <Text style={styles.permissionTitle}>Camera Permission Required</Text>
                <Text style={styles.permissionText}>
                  Allow camera access to scan product barcodes and QR codes instantly.
                </Text>
                <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#ffffff" />
                  <Text style={styles.grantBtnText}>Grant Permission</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  enableTorch={torchOn}
                  barcodeScannerSettings={{
                    barcodeTypes: [
                      'qr',
                      'ean13',
                      'ean8',
                      'code128',
                      'code39',
                      'upc_a',
                      'upc_e',
                      'aztec',
                      'datamatrix',
                    ],
                  }}
                  onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                />

                {/* Viewfinder Reticle Overlay (Positioned Absolutely on Top of CameraView) */}
                <View style={[StyleSheet.absoluteFill, styles.reticleOverlay]}>
                  <View style={[styles.corner, styles.tl]} />
                  <View style={[styles.corner, styles.tr]} />
                  <View style={[styles.corner, styles.bl]} />
                  <View style={[styles.corner, styles.br]} />

                  {/* Animated laser line */}
                  <Animated.View
                    style={[
                      styles.laserLine,
                      {
                        transform: [{ translateY }],
                      },
                    ]}
                  />

                  {/* Torch Toggle button */}
                  <TouchableOpacity
                    style={[styles.torchBtn, torchOn && styles.torchBtnActive]}
                    onPress={() => setTorchOn((prev) => !prev)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={torchOn ? 'flash' : 'flash-outline'}
                      size={18}
                      color={torchOn ? '#F59E0B' : '#FFFFFF'}
                    />
                    <Text style={[styles.torchText, torchOn && styles.torchTextActive]}>
                      {torchOn ? 'Torch On' : 'Torch Off'}
                    </Text>
                  </TouchableOpacity>

                  {scanned && (
                    <View style={styles.scannedBadge}>
                      <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                      <Text style={styles.scannedBadgeText}>Captured!</Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>

          {/* Manual Alphanumeric Entry Fallback */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionLabel}>Or Enter Product ID Manually</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. PRD-SHP01-3BSR-CHG4"
                placeholderTextColor={theme.textMuted}
                value={manualId}
                onChangeText={setManualId}
                autoCapitalize="characters"
                onSubmitEditing={handleManualSubmit}
                returnKeyType="search"
              />
              <TouchableOpacity onPress={handleManualSubmit} style={styles.searchBtn}>
                <Ionicons name="arrow-forward" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick-tap sample IDs */}
          {sampleIds.length > 0 && (
            <View style={styles.quickSection}>
              <Text style={styles.quickLabel}>Quick Sample Product IDs:</Text>
              <View style={styles.chipWrap}>
                {sampleIds.slice(0, 4).map((id) => (
                  <TouchableOpacity key={id} onPress={() => handleChipSelect(id)} style={styles.idChip}>
                    <Ionicons name="barcode-outline" size={13} color={theme.primary} />
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

const createStyles = (theme: AppTheme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.xl,
    padding: 20,
    width: '100%',
    maxWidth: 440,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: theme.surfaceLight,
  },
  cameraContainer: {
    height: 220,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.surfaceLight,
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
    marginTop: 10,
    marginBottom: 4,
  },
  permissionText: {
    color: theme.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 18,
  },
  grantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  grantBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  reticleOverlay: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#38BDF8',
  },
  tl: { top: 20, left: 24, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  tr: { top: 20, right: 24, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  bl: { bottom: 20, left: 24, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  br: { bottom: 20, right: 24, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },
  laserLine: {
    position: 'absolute',
    left: 28,
    right: 28,
    height: 2,
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  torchBtn: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  torchBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
  },
  torchText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  torchTextActive: {
    color: '#F59E0B',
  },
  scannedBadge: {
    position: 'absolute',
    top: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scannedBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  inputSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: theme.inputBg,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    borderRadius: theme.radius.md,
    color: theme.text,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  searchBtn: {
    backgroundColor: theme.primary,
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickSection: {
    marginTop: 4,
  },
  quickLabel: {
    color: theme.textMuted,
    fontSize: 11,
    marginBottom: 6,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  idChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.surfaceLight,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: theme.radius.sm,
  },
  chipText: {
    color: theme.text,
    fontSize: 11,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
