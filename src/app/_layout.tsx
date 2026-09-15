import React from 'react';
import { Stack, useRouter, ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { theme } from '../theme/colors';
import { ErrorView } from '../components/ErrorView';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const router = useRouter();

  return (
    <>
      <StatusBar style="dark" />
      <ErrorView
        title="Application Error"
        message="An unexpected error occurred while loading this screen."
        error={error}
        onRetry={retry}
        onGoHome={() => router.replace('/')}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.background },
            animation: 'slide_from_right'
          }}
        />
      </CartProvider>
    </AuthProvider>
  );
}

