import React, { useState } from 'react';
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
import { productApi } from '../services/api';
import * as WebBrowser from 'expo-web-browser';

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

  if (!product) return null;

  const symbol = product.currency_symbol || 'TSh';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    product.id
  )}&margin=4`;

  const handlePrintThermal = () => {
    setPrinting(true);
    try {
      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank', 'width=450,height=400');
        if (printWindow) {
          const htmlContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8" />
                <title>Thermal Label - ${product.id}</title>
                <style>
                  @page {
                    size: 50mm 30mm;
                    margin: 0;
                  }
                  body {
                    margin: 0;
                    padding: 0;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                    background: #fff;
                    color: #000;
                  }
                  .label-sheet {
                    display: flex;
                    flex-direction: column;
                  }
                  .label {
                    width: 50mm;
                    height: 30mm;
                    box-sizing: border-box;
                    padding: 2mm 3mm;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    page-break-after: always;
                    text-align: center;
                  }
                  .shop-name {
                    font-size: 8px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 1px;
                  }
                  .product-name {
                    font-size: 10px;
                    font-weight: 700;
                    line-height: 1.1;
                    max-height: 22px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                  }
                  .middle-row {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    margin: 1mm 0;
                  }
                  .qr-img {
                    width: 17mm;
                    height: 17mm;
                    display: block;
                  }
                  .code-col {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    justify-content: center;
                    text-align: left;
                  }
                  .sku-code {
                    font-size: 8px;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                    font-family: monospace;
                  }
                  .price-tag {
                    font-size: 12px;
                    font-weight: 900;
                    margin-top: 2px;
                  }
                  .footer-hint {
                    font-size: 6px;
                    color: #555;
                  }
                </style>
              </head>
              <body>
                <div class="label-sheet">
                  ${Array.from({ length: copies })
                    .map(
                      () => `
                    <div class="label">
                      <div>
                        <div class="shop-name">${product.category || 'RETAIL STORE'}</div>
                        <div class="product-name">${product.name}</div>
                      </div>
                      <div class="middle-row">
                        <img class="qr-img" src="${qrUrl}" alt="QR" />
                        <div class="code-col">
                          <div class="sku-code">${product.id}</div>
                          <div class="price-tag">${symbol} ${Number(product.price).toLocaleString()}</div>
                          <div class="footer-hint">SCAN AT POS COUNTER</div>
                        </div>
                      </div>
                    </div>
                  `
                    )
                    .join('')}
                </div>
                <script>
                  window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                  };
                </script>
              </body>
            </html>
          `;
          printWindow.document.open();
          printWindow.document.write(htmlContent);
          printWindow.document.close();
        }
      } else {
        // Native platform: fallback to PDF Sheet or notify user
        handlePrintA4Sheet();
      }
    } catch (err: any) {
      Alert.alert('Print Error', err.message || 'Could not trigger label printing.');
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintA4Sheet = async () => {
    try {
      const url = await productApi.getQRLabelsUrl(product.id, Math.max(copies, 15));
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch (err: any) {
      Alert.alert('Unable to Open PDF', err.message || 'Error generating QR labels PDF sheet.');
    }
  };

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
                  Standard 50 mm × 30 mm sticker preview
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
                STICKER PREVIEW (50mm × 30mm)
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
                      source={{ uri: qrUrl }}
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
                      Print Label ({copies} {copies === 1 ? 'Copy' : 'Copies'})
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.secondaryActionsRow}>
                {onReprint && (
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder }]}
                    onPress={() => {
                      onReprint();
                      handlePrintThermal();
                    }}
                  >
                    <Ionicons name="refresh" size={16} color={theme.text} />
                    <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Reprint Label</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.secondaryBtn, { backgroundColor: theme.surfaceLight, borderColor: theme.surfaceBorder, flex: onReprint ? 1 : 2 }]}
                  onPress={handlePrintA4Sheet}
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
