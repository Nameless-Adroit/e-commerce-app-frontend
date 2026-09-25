import React from 'react';
import { Stack, useRouter, ErrorBoundaryProps } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { ErrorView } from '../components/ErrorView';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const router = useRouter();

  React.useEffect(() => {
    console.error('[Root ErrorBoundary caught]:', error);
  }, [error]);

  return (
    <ErrorView
      title="Application Error"
      message="An unexpected error occurred while loading this screen."
      error={error}
      onRetry={retry}
      onGoHome={() => router.replace('/')}
    />
  );
}

function RootNavigation() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
        animation: 'slide_from_right'
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <RootNavigation />
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
