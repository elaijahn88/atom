import { Tabs } from 'expo-router';
import React, { useRef } from 'react';
import { View, Animated, useWindowDimensions } from 'react-native';

import { HapticTab } from '../hooks/haptic-tab';
import { IconSymbol } from '../hooks/icon-symbol';
import { Colors } from '../hooks/theme';
import { useColorScheme } from '../hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const activeColor = '#00FF7F'; // green for icons and indicator
  const inactiveColor = '#999'; // gray for inactive icons
  const textColor = '#fff'; // text stays white
  const darkBackground = '#121212'; // dark background

  const { width } = useWindowDimensions();
  const tabCount = 6;
  const indicatorWidth = width / tabCount;
  const translateX = useRef(new Animated.Value(0)).current;

  const handleTabChange = (index: number) => {
    Animated.spring(translateX, {
      toValue: index * indicatorWidth,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  };

  const commonOptions = {
    headerShown: false,
    tabBarStyle: {
      backgroundColor: darkBackground,
      borderTopWidth: 0,
      height: 70,
      paddingBottom: 6,
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.15,
      shadowRadius: 5,
    },
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 5,
      color: textColor,
    },
    tabBarButton: HapticTab,
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={commonOptions}
        tabBar={(props) => {
          const { state, descriptors, navigation } = props;
          return (
            <View style={{ backgroundColor: darkBackground }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                {state.routes.map((route, index) => {
                  const { options } = descriptors[route.key];
                  const isActive = state.index === index;
                  const iconColor = isActive ? activeColor : inactiveColor;

                  return (
                    <HapticTab
                      key={route.key}
                      onPress={() => {
                        navigation.navigate(route.name);
                        handleTabChange(index);
                      }}
                      style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}
                    >
                      {options.tabBarIcon && options.tabBarIcon({ color: iconColor, size: 28 })}
                    </HapticTab>
                  );
                })}
              </View>
              {/* Animated green underline */}
              <Animated.View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: indicatorWidth,
                  height: 4, // thicker indicator
                  backgroundColor: activeColor,
                  transform: [{ translateX }],
                  borderRadius: 2,
                }}
              />
            </View>
          );
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Home', tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} /> }}
        />
        <Tabs.Screen
          name="money"
          options={{ title: 'Money', tabBarIcon: ({ color }) => <IconSymbol size={28} name="creditcard.fill" color={color} /> }}
        />
        <Tabs.Screen
          name="store"
          options={{ title: 'Store', tabBarIcon: ({ color }) => <IconSymbol size={28} name="megaphone.fill" color={color} /> }}
        />
        <Tabs.Screen
          name="music"
          options={{ title: 'Music', tabBarIcon: ({ color }) => <IconSymbol size={28} name="music.note.list" color={color} /> }}
        />
        <Tabs.Screen
          name="plug"
          options={{ title: 'Ads', tabBarIcon: ({ color }) => <IconSymbol size={28} name="atom" color={color} /> }}
        />
        <Tabs.Screen
          name="account"
          options={{ title: 'Account', tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.crop.circle.fill" color={color} /> }}
        />
      </Tabs>
    </View>
  );
}
