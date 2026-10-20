import React from 'react';
import { LogBox } from 'react-native';
import { Stack, useRouter, ErrorBoundaryProps } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { ErrorView } from '../components/ErrorView';

// Suppress LogBox error popups and toasts in the UI - all errors are logged cleanly to terminal
LogBox.ignoreAllLogs(true);

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const router = useRouter();

  React.useEffect(() => {
    console.log('[Root ErrorBoundary caught]:', error);
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

function ScopedCart({ children }: { children: React.ReactNode }) {
  const { user, activeShop } = useAuth();
  return <CartProvider key={`${user?.id || 'guest'}-${activeShop?.id || 'none'}`}>{children}</CartProvider>;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ScopedCart>
          <RootNavigation />
        </ScopedCart>
      </AuthProvider>
    </ThemeProvider>
  );
}
