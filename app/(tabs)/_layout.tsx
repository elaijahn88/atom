import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '../hooks/haptic-tab';
import { IconSymbol } from '../hooks/icon-symbol';
import { Colors } from '../hooks/theme';
import { useColorScheme } from '../hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const activeColor = Colors[colorScheme ?? 'light'].tint;
  const inactiveColor =
    Colors[colorScheme ?? 'light'].tabIconDefault ?? '#999';

  const darkBackground = '#121212';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: darkBackground,
          borderTopWidth: 0,
          elevation: 5,
          shadowOpacity: 0.1,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 5,
          color: '#fff',
        },
        tabBarButton: HapticTab,
      }}
    >
      {/* FOOD */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Agent',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="fork.knife"
              color={color}
            />
          ),
        }}
      />

      {/* IPHONES */}
      <Tabs.Screen
        name="phones"
        options={{
          title: 'store',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="iphone"
              color={color}
            />
          ),
        }}
      />

      {/* STORE */}
      <Tabs.Screen
        name="store"
        options={{
          title: 'Store',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="storefront.fill"
              color={color}
            />
          ),
        }}
      />

      {/* MUSIC */}
      <Tabs.Screen
        name="music"
        options={{
          title: 'Music',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="music.note"
              color={color}
            />
          ),
          contentStyle: { backgroundColor: 'green' },
        }}
      />

      {/* ADS */}
      <Tabs.Screen
        name="plug"
        options={{
          title: 'Ads',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="megaphone.fill"
              color={color}
            />
          ),
        }}
      />

      {/* ACCOUNT */}
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="person.circle.fill"
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
