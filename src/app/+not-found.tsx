import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/colors';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found', headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Decorative Icon Glow Container */}
          <View style={styles.glowOuter}>
            <View style={styles.glowInner}>
              <Ionicons name="compass-outline" size={56} color={theme.primary} />
            </View>
          </View>

          {/* Error Tag */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>404 ERROR</Text>
          </View>

          {/* Headings */}
          <Text style={styles.title}>Page Not Found</Text>
          <Text style={styles.subtitle}>
            The screen you are looking for doesn't exist, was moved, or you might not have permission to view it.
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace('/')}
              activeOpacity={0.85}
            >
              <Ionicons name="home-outline" size={18} color="#ffffff" style={styles.buttonIcon} />
              <Text style={styles.primaryButtonText}>Return to Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/');
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color={theme.textSecondary} style={styles.buttonIcon} />
              <Text style={styles.secondaryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>

          {/* Helpful Footnote */}
          <View style={styles.footerNote}>
            <Ionicons name="information-circle-outline" size={16} color={theme.textMuted} />
            <Text style={styles.footerText}>
              Point of Sale & Inventory Management System
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40
  },
  glowOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.15)'
  },
  glowInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow
  },
  badge: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    marginBottom: 12
  },
  badgeText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 12
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 36,
    maxWidth: 340
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
  buttonIcon: {
    marginRight: 8
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24
  },
  footerText: {
    fontSize: 12,
    color: theme.textMuted
  }
});
