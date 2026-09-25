import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme, useStyles } from '../context/ThemeContext';
import { AppTheme } from '../theme/colors';

interface SubscriptionBannerProps {
  onRenewPress?: () => void;
  compact?: boolean;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
  onRenewPress,
  compact = false
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const styles = useStyles(createStyles);

  if (!user) return null;

  const role = user.role;
  const status = user.subscription_status || 'active';
  const daysRemaining = typeof user.days_remaining === 'number' ? user.days_remaining : null;
  const warningLevel = user.warning_level || 'none';
  const isExpired = user.is_subscription_expired || status === 'expired' || status === 'suspended' || (daysRemaining !== null && daysRemaining <= 0);

  // If active with no warning, hide banner
  if (!isExpired && (warningLevel === 'none' || (daysRemaining !== null && daysRemaining > 30))) {
    return null;
  }

  // Determine banner theme based on urgency
  let bgColor = 'rgba(59, 130, 246, 0.12)';
  let borderColor = '#3b82f6';
  let textColor = '#2563eb';
  let iconName: keyof typeof Ionicons.glyphMap = 'information-circle-outline';
  let headline = 'Subscription Notice';
  let message = `Your store subscription has ${daysRemaining ?? 0} days remaining.`;

  if (isExpired) {
    bgColor = 'rgba(239, 68, 68, 0.15)';
    borderColor = '#ef4444';
    textColor = '#dc2626';
    iconName = 'alert-circle';
    headline = 'Subscription Expired';
    message = role === 'admin'
      ? 'Your store subscription has expired. Store operations are restricted until renewed.'
      : 'Store subscription is expired. Please contact your Business Owner to renew.';
  } else if (warningLevel === 'critical_1d' || daysRemaining === 1) {
    bgColor = 'rgba(239, 68, 68, 0.12)';
    borderColor = '#ef4444';
    textColor = '#dc2626';
    iconName = 'warning-outline';
    headline = 'Expires Tomorrow!';
    message = role === 'admin'
      ? 'Only 1 day left! Renew now to prevent interruption to store checkout and inventory.'
      : 'Store subscription expires tomorrow. Please alert your Business Owner.';
  } else if (warningLevel === 'urgent_3d' || (daysRemaining !== null && daysRemaining <= 3)) {
    bgColor = 'rgba(249, 115, 22, 0.12)';
    borderColor = '#f97316';
    textColor = '#ea580c';
    iconName = 'time-outline';
    headline = 'Expires in 3 Days';
    message = role === 'admin'
      ? `Subscription expires in ${daysRemaining} days. Submit renewal payment to ensure continuous operation.`
      : `Store subscription expires in ${daysRemaining} days. Notify your Business Owner.`;
  } else if (warningLevel === 'warning_7d' || (daysRemaining !== null && daysRemaining <= 7)) {
    bgColor = 'rgba(245, 158, 11, 0.12)';
    borderColor = '#f59e0b';
    textColor = '#d97706';
    iconName = 'alert-circle-outline';
    headline = 'Renewal Reminder';
    message = role === 'admin'
      ? `Your plan expires in ${daysRemaining} days. Renew early to preserve seamless store management.`
      : `Store subscription expires in ${daysRemaining} days.`;
  } else if (warningLevel === 'info_30d' || (daysRemaining !== null && daysRemaining <= 30)) {
    bgColor = 'rgba(59, 130, 246, 0.10)';
    borderColor = '#3b82f6';
    textColor = '#2563eb';
    iconName = 'calendar-outline';
    headline = 'Upcoming Renewal';
    message = role === 'admin'
      ? `Subscription active: ${daysRemaining} days remaining in your billing cycle.`
      : `Store subscription active (${daysRemaining} days remaining).`;
  }

  const handleAction = () => {
    if (onRenewPress) {
      onRenewPress();
    } else if (role === 'admin') {
      router.push('/admin/billing' as any);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor }, compact && styles.compactContainer]}>
      <View style={styles.contentRow}>
        <Ionicons name={iconName} size={compact ? 18 : 22} color={textColor} style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={[styles.headline, { color: textColor }]}>
            {headline} {daysRemaining !== null && !isExpired ? `(${daysRemaining}d)` : ''}
          </Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            {message}
          </Text>
        </View>
      </View>

      {role === 'admin' && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: borderColor }]}
            onPress={handleAction}
            activeOpacity={0.85}
          >
            <Ionicons name="card-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>{isExpired ? 'Renew Store Now' : 'Manage / Renew'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginHorizontal: 16,
      marginVertical: 10,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1.5
    },
    compactContainer: {
      padding: 10,
      marginVertical: 6
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'flex-start'
    },
    icon: {
      marginTop: 2,
      marginRight: 10
    },
    textContainer: {
      flex: 1
    },
    headline: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 2
    },
    message: {
      fontSize: 12.5,
      lineHeight: 17
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 10
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: 8
    },
    actionBtnText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '700'
    }
  });
