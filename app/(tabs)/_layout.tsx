import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '../hooks/haptic-tab';
import { IconSymbol } from '../hooks/icon-symbol';
import { Colors } from '../hooks/theme';
import { useColorScheme } from '../hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={20} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="money"
        options={{
          title: 'money',
          tabBarIcon: ({ color }) => <IconSymbol size={20} name="paperplane.fill" color={color} />,
        }}
      />



       <Tabs.Screen
        name="account"
        options={{
          title: 'account',
          tabBarIcon: ({ color }) => <IconSymbol size={20} name="person.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="music"
        options={{
          title: 'music',
          tabBarIcon: ({ color }) => <IconSymbol size={20} name="musical-notes.circle.fill" color={color} />,
        }}
      />


       <Tabs.Screen
        name="paid"
        options={{
          title: 'pay',
          tabBarIcon: ({ color }) => <IconSymbol size={20} name="cash.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="atom"
        options={{
          title: 'atom',
          tabBarIcon: ({ color }) => <IconSymbol size={20} name="swap-horizontal.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
