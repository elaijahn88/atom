import { Stack } from 'expo-router';
import React from 'react';

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: 'Home' }}
      />
      <Stack.Screen
        name="money"
        options={{ title: 'Money' }}
      />
      <Stack.Screen
        name="atom"
        options={{ title: 'Atom' }}
      />
    </Stack>
  );
}
