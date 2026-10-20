import React from 'react';
import { Stack } from 'expo-router';

export default function SellerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="cart" />
      <Stack.Screen name="returns" />
      <Stack.Screen name="history" />
    </Stack>
  );
}
