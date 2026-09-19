import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useStyles } from '../context/ThemeContext';
import { AppTheme } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { Shop } from '../types';

interface ShopSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectShop?: (shop: Shop) => void;
}

export const ShopSelectorModal: React.FC<ShopSelectorModalProps> = ({
  visible,
  onClose,
  onSelectShop
}) => {
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  const { availableShops, activeShop, setActiveShop, user } = useAuth();

  const handleSelect = async (shop: Shop) => {
    await setActiveShop(shop);
    if (onSelectShop) onSelectShop(shop);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="storefront-outline" size={24} color={theme.primary} />
              <View>
                <Text style={styles.title}>Select Active Shop</Text>
                <Text style={styles.subtitle}>
                  {user?.business_name || 'Business'} • {availableShops.length} Branches
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Shop List */}
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {availableShops.map((shop) => {
              const isSelected = activeShop?.id === shop.id;
              return (
                <TouchableOpacity
                  key={shop.id}
                  style={[styles.shopItem, isSelected && styles.shopItemActive]}
                  onPress={() => handleSelect(shop)}
                  activeOpacity={0.7}
                >
                  <View style={styles.shopLeft}>
                    <View style={[styles.codeBadge, isSelected && styles.codeBadgeActive]}>
                      <Text style={[styles.codeText, isSelected && styles.codeTextActive]}>
                        {shop.shop_code}
                      </Text>
                    </View>
                    <View style={styles.shopInfo}>
                      <Text style={[styles.shopName, isSelected && styles.shopNameActive]}>
                        {shop.name}
                      </Text>
                      {shop.address ? (
                        <Text style={styles.shopAddress} numberOfLines={1}>
                          {shop.address}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={22} color={theme.accent} />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                  )}
                </TouchableOpacity>
              );
            })}

            {availableShops.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No shops found in this business.</Text>
              </View>
            )}
          </ScrollView>
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
      maxHeight: '80%',
      borderWidth: 1,
      borderColor: theme.surfaceBorder,
      ...theme.shadow
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.surfaceBorder
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1
    },
    title: {
      fontSize: 16,
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
    list: {
      flexGrow: 0
    },
    listContent: {
      gap: 10
    },
    shopItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surfaceLight,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1.5,
      borderColor: theme.surfaceBorder
    },
    shopItemActive: {
      borderColor: theme.accent,
      backgroundColor: 'rgba(5, 150, 105, 0.08)'
    },
    shopLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1
    },
    codeBadge: {
      backgroundColor: theme.surfaceBorder,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6
    },
    codeBadgeActive: {
      backgroundColor: theme.accent
    },
    codeText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textSecondary
    },
    codeTextActive: {
      color: '#ffffff'
    },
    shopInfo: {
      flex: 1
    },
    shopName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text
    },
    shopNameActive: {
      color: theme.accent,
      fontWeight: '700'
    },
    shopAddress: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2
    },
    emptyContainer: {
      paddingVertical: 24,
      alignItems: 'center'
    },
    emptyText: {
      fontSize: 13,
      color: theme.textMuted
    }
  });
