import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useStyles } from '../context/ThemeContext';
import { AppTheme } from '../theme/colors';

export interface ErrorViewProps {
  title?: string;
  message?: string;
  error?: Error | string | null;
  onRetry?: () => void;
  onGoHome?: () => void;
  variant?: 'general' | 'network' | 'unauthorized' | 'not_found';
}

export function ErrorView({
  title,
  message,
  error,
  onRetry,
  onGoHome,
  variant = 'general'
}: ErrorViewProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { theme } = useTheme();
  const styles = useStyles(createStyles);

  const getVariantConfig = () => {
    switch (variant) {
      case 'network':
        return {
          icon: 'wifi-outline' as const,
          color: theme.warning,
          bgColor: 'rgba(217, 119, 6, 0.15)',
          defaultTitle: 'Connection Error',
          defaultMessage: 'Unable to reach the POS server. Please check your internet connection'
        };
      case 'unauthorized':
        return {
          icon: 'lock-closed-outline' as const,
          color: theme.danger,
          bgColor: 'rgba(220, 38, 38, 0.15)',
          defaultTitle: 'Access Restricted',
          defaultMessage: 'You do not have permission to access this resource'
        };
      case 'not_found':
        return {
          icon: 'alert-circle-outline' as const,
          color: theme.primary,
          bgColor: theme.primaryLight,
          defaultTitle: 'Resource Not Found',
          defaultMessage: 'The requested item or record could not be found.'
        };
      default:
        return {
          icon: 'warning-outline' as const,
          color: theme.danger,
          bgColor: 'rgba(220, 38, 38, 0.15)',
          defaultTitle: 'Something Went Wrong',
          defaultMessage: 'An unexpected error occurred while processing your request. Please try again.'
        };
    }
  };

  const config = getVariantConfig();
  const displayTitle = title || config.defaultTitle;
  const displayMessage = message || config.defaultMessage;
  const rawErrorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : null;
  const stackTrace = error instanceof Error ? error.stack : null;

  // Log technical error details to console instead of exposing on UI
  React.useEffect(() => {
    if (error) {
      console.error('[Application Error Caught]:', error);
      if (stackTrace) {
        console.error('[Error Stack Trace]:', stackTrace);
      }
    }
  }, [error, stackTrace]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={[styles.iconOuter, { backgroundColor: config.bgColor, borderColor: config.color + '30' }]}>
          <View style={styles.iconInner}>
            <Ionicons name={config.icon} size={48} color={config.color} />
          </View>
        </View>

        <Text style={styles.title}>{displayTitle}</Text>
        <Text style={styles.message}>{displayMessage}</Text>

        {/* Action Controls */}
        <View style={styles.actionContainer}>
          {onRetry ? (
            <TouchableOpacity style={styles.primaryButton} onPress={onRetry} activeOpacity={0.85}>
              <Ionicons name="refresh" size={18} color="#ffffff" style={styles.btnIcon} />
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          ) : null}

          {onGoHome ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={onGoHome} activeOpacity={0.7}>
              <Ionicons name="home-outline" size={18} color={theme.textSecondary} style={styles.btnIcon} />
              <Text style={styles.secondaryButtonText}>Return to Dashboard</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32
  },
  iconOuter: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1.5
  },
  iconInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 10
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 340
  },
  detailsBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    marginBottom: 24,
    overflow: 'hidden'
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 6
  },
  detailsToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary
  },
  detailsContent: {
    padding: 12,
    backgroundColor: theme.surfaceLight,
    borderTopWidth: 1,
    borderTopColor: theme.surfaceBorder
  },
  detailsErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.danger,
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  },
  detailsStackText: {
    fontSize: 11,
    color: theme.textMuted,
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  },
  actionContainer: {
    width: '100%',
    maxWidth: 320,
    gap: 12
  },
  primaryButton: {
    backgroundColor: theme.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: theme.radius.md,
    ...theme.shadow
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600'
  },
  secondaryButton: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: theme.radius.md
  },
  secondaryButtonText: {
    color: theme.textSecondary,
    fontSize: 15,
    fontWeight: '600'
  },
  btnIcon: {
    marginRight: 8
  }
});
export default ErrorView;
