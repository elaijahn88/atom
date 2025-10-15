import React from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

import { HapticTab } from '../hooks/haptic-tab';
import { IconSymbol } from '../hooks/icon-symbol';
import { Colors } from '../hooks/theme';
import { useColorScheme } from '../hooks/use-color-scheme';

interface BadgeProps {
  count: number;
}

const Badge: React.FC<BadgeProps> = ({ count }) => {
  if (count <= 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
};

const AnimatedTabButton = ({ children, onPress, focused }: any) => {
  const scale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.2 : 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <HapticTab onPress={onPress}>{children}</HapticTab>
    </Animated.View>
  );
};

export default function TabLayout({ Tabs }: any) {
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? 'light'].tint;
  const textDim = Colors[colorScheme ?? 'light'].textDim;

  const badges = {
    money: 3,
    music: 7,
    transfer: 0,
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tint,
        tabBarInactiveTintColor: textDim,
        headerShown: false,
        tabBarButton: AnimatedTabButton,
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          position: 'absolute',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? 'house.fill' : 'house'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="money"
        options={{
          title: 'Money',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <IconSymbol size={28} name={focused ? 'paperplane.fill' : 'paperplane'} color={color} />
              <Badge count={badges.money} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="music"
        options={{
          title: 'Music',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <IconSymbol size={28} name={focused ? 'music.note.list' : 'music.note'} color={color} />
              <Badge count={badges.music} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="transfer"
        options={{
          title: 'Transfer',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <IconSymbol
                size={28}
                name={focused ? 'arrow.right.circle.fill' : 'arrow.right.circle'}
                color={color}
              />
              <Badge count={badges.transfer} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: 'red',
    borderRadius: 10,
    paddingHorizontal: 5,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
