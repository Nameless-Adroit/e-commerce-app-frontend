import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Image,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Product } from '../types';
import { formatCurrency } from '../utils/currency';
import { productApi, getAuthToken } from '../services/api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

interface ThermalLabelModalProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onReprint?: () => void;
}

export function ThermalLabelModal({
  visible,
  product,
  onClose,
  onReprint
}: ThermalLabelModalProps) {
  const { theme } = useTheme();
  const [copies, setCopies] = useState<number>(1);
  const [printing, setPrinting] = useState(false);

  const [qrData, setQrData] = useState<{ id: string; uri: string } | null>(null);
  const qrUrl = qrData?.id === product?.id ? qrData?.uri : '';

  const [qrError, setQrError] = useState('');
  const busy = useRef(false);
  useEffect(() => {
    let cancelled = false;
    if (visible && product) productApi.getQRCode(product.id).then(response => {
      if (!cancelled) { setQrData({ id: product.id, uri: response.data?.data_uri || '' }); setQrError(''); }
    }).catch(error => { if (!cancelled) setQrError(error.message || 'QR preview unavailable.'); });
    return () => { cancelled = true; };
  }, [visible, product?.id]);

  if (!product) return null;
  const symbol = product.currency_symbol || 'TSh';
  const openPDF = async (format: 'thermal' | 'a4', share = false) => {
    if (busy.current) return;
    busy.current = true;
    setPrinting(true);
    let file: File | undefined;
    try {
      const url = await productApi.getQRLabelsUrl(product.id, copies, format, Platform.OS === 'web');
      if (Platform.OS === 'web') {
        const popup = window.open(url, '_blank');
        if (!popup) throw new Error('Allow popups to open the printable PDF.');
      } else {
        file = await File.downloadFileAsync(url, new File(Paths.cache, `labels-${Date.now()}.pdf`), { headers: { Authorization: `Bearer ${await getAuthToken()}` } });
        if (share) {
          if (!await Sharing.isAvailableAsync()) throw new Error('PDF sharing is unavailable on this device.');
          await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
        } else {
          await Print.printAsync({ uri: file.uri });
        }
      }
    } catch (err: any) {
      Alert.alert('Label PDF Error', err.message || 'Unable to open label PDF.');
    } finally {
      // Android resolves printAsync when the dialog opens; retain its file for the print service.
      busy.current = false;
      setPrinting(false);
    }
  };
  const handlePrintThermal = () => openPDF('thermal');
  const handlePrintA4Sheet = () => openPDF('a4');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.surfaceBorder }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconBox, { backgroundColor: theme.primary + '18' }]}>
                <Ionicons name="barcode" size={20} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Thermal Label & QR</Text>
                <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
                  Standard 50 mm Ã— 30 mm sticker preview
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.surfaceLight }]}>
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {/* 50mm x 30mm Sticker Preview (approx 5:3 aspect ratio) */}
            <View style={styles.previewContainer}>
              <Text style={[styles.previewLabel, { color: theme.textMuted }]}>
                STICKER PREVIEW (50mm Ã— 30mm)
              </Text>

              <View style={styles.stickerBox}>
                {/* Header item */}
                <View style={styles.stickerHeader}>
                  <Text style={styles.stickerCategory} numberOfLines={1}>
                    {product.category || 'RETAIL STORE'}
                  </Text>
                  <Text style={styles.stickerTitle} numberOfLines={2}>
                    {product.name}
                  </Text>
                </View>

                {/* Body Row: QR Code + SKU/Price */}
                <View style={styles.stickerBodyRow}>
                  <View style={styles.qrCodeWrapper}>
                    <Image
                      source={qrUrl ? { uri: qrUrl } : undefined}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.stickerDetailsCol}>
                    <Text style={styles.skuLabel}>SKU / PRODUCT ID</Text>
                    <Text style={styles.skuText} numberOfLines={1}>
                      {product.id}
                    </Text>

                    <Text style={styles.stickerPriceLabel}>PRICE</Text>
                    <Text style={styles.stickerPrice} numberOfLines={1}>
                      {formatCurrency(product.price, symbol)}
                    </Text>

                    <View style={styles.barcodeScanHint}>
                      <Ionicons name="scan-outline" size={11} color="#475569" />
                      <Text style={styles.barcodeScanHintText}>AUTO POS READY</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.stickerFooter}>
                  <Text style={styles.stickerFooterText}>Scan QR Code at POS Checkout</Text>
                </View>
              </View>
            </View>

            {/* Copies selector */}
            <View style={[styles.copiesRow, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}>
              <View style={styles.copiesTextCol}>
                <Text style={[styles.copiesTitle, { color: theme.text }]}>Print Quantity</Text>
                <Text style={[styles.copiesSubtitle, { color: theme.textMuted }]}>
                  Number of sticker labels to print
                </Text>
              </View>

              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
                  onPress={() => setCopies((prev) => Math.max(1, prev - 1))}
                >
                  <Ionicons name="remove" size={18} color={theme.text} />
                </TouchableOpacity>

                <Text style={[styles.stepperVal, { color: theme.text }]}>{copies}</Text>

                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
                  onPress={() => setCopies((prev) => prev + 1)}
                >
                  <Ionicons name="add" size={18} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick copy presets */}
            <View style={styles.presetRow}>
              {[1, 2, 5, 10, 20].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetBtn,
                    copies === preset
                      ? { backgroundColor: theme.primary, borderColor: theme.primary }
                      : { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }
                  ]}
                  onPress={() => setCopies(preset)}
                >
                  <Text
                    style={[
                      styles.presetText,
                      { color: copies === preset ? '#FFFFFF' : theme.text }
                    ]}
                  >
                    {preset} {preset === 1 ? 'copy' : 'copies'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ color: theme.textSecondary, marginBottom: 12 }}>
              System print / PDF only. Select 50 × 30 mm media and 100% scale in your printer service.
              Direct Bluetooth / USB: not configured. Printer model and protocol are awaiting selection.
            </Text>
            {qrError ? <Text style={{ color: theme.danger }}>{qrError}</Text> : null}
            {/* Actions */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.primaryPrintBtn, { backgroundColor: theme.primary }]}
                onPress={handlePrintThermal}
                disabled={printing}
                activeOpacity={0.85}
              >
                {printing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="print" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryPrintBtnText}>
                      Open Print Dialog ({copies} {copies === 1 ? 'Copy' : 'Copies'})
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.surfaceBorder }]} disabled={printing}
                onPress={() => openPDF('thermal', true)}>
                <Text style={{ color: theme.primary }}>Share / Save 50 × 30 mm PDF</Text>
              </TouchableOpacity>
              <View style={styles.secondaryActionsRow}>
                {onReprint && (
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}
                    onPress={() => {
                      if (!printing) { onReprint(); handlePrintThermal(); }
                    }}
                  >
                    <Ionicons name="refresh" size={16} color={theme.text} />
                    <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Reprint Label</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.secondaryBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder, flex: onReprint ? 1 : 2 }]}
                  onPress={handlePrintA4Sheet}
                  disabled={printing}
                >
                  <Ionicons name="document-text-outline" size={16} color={theme.primary} />
                  <Text style={[styles.secondaryBtnText, { color: theme.primary }]}>Sheet (A4 PDF)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    maxHeight: 520,
  },
  scrollContent: {
    padding: 16,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  stickerBox: {
    width: 310,
    height: 186,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0F172A',
    padding: 10,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  stickerHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
  },
  stickerCategory: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stickerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
    lineHeight: 15,
  },
  stickerBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  qrCodeWrapper: {
    width: 86,
    height: 86,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  qrImage: {
    width: 80,
    height: 80,
  },
  stickerDetailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  skuLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  skuText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
  stickerPriceLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  stickerPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#059669',
  },
  barcodeScanHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  barcodeScanHintText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
  },
  stickerFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 3,
    alignItems: 'center',
  },
  stickerFooterText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.3,
  },
  copiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  copiesTextCol: {
    flex: 1,
  },
  copiesTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  copiesSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperVal: {
    fontSize: 15,
    fontWeight: '800',
    minWidth: 24,
    textAlign: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsContainer: {
    gap: 10,
  },
  primaryPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 10,
  },
  primaryPrintBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
