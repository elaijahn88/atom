import React, { useEffect, useState } from 'react';
import { View, Text, Button, Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { database, ref, push, onValue } from '../../firebase'; // import your Realtime DB

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function PushNotifications({ name, email, userId }: { name: string; email: string; userId: string }) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any>(null);

  useEffect(() => {
    registerForPushNotifications();

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const receivedSubscription = Notifications.addNotificationReceivedListener(n => {
      setNotification(n);
      console.log('Notification received:', n);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(r => {
      console.log('User tapped notification:', r);
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  const registerForPushNotifications = async () => {
    if (!Device.isDevice) {
      Alert.alert('Push notifications require a physical device');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert('Failed to get push token');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    setExpoPushToken(token);
    console.log('Expo Push Token:', token);

    // Save token in Realtime DB
    saveTokenToDatabase(token);
  };

  const saveTokenToDatabase = async (token: string) => {
    if (!userId) return;

    try {
      // path: pushTokens/{userId}
      const userRef = ref(database, `pushTokens/${userId}`);
      await push(userRef, { name, email, token });
      console.log('✅ Token saved to Realtime DB');
    } catch (error) {
      console.error('❌ Failed to save token:', error);
    }
  };

  const sendTestNotification = async () => {
    if (!expoPushToken) {
      Alert.alert('Push token not available');
      return;
    }

    const message = {
      to: expoPushToken,
      sound: 'default',
      title: 'Hello!',
      body: 'sms from atom services ',
      data: { extraData: 'Some data' },
      android: { channelId: 'default' },
    };

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Accept-encoding': 'gzip, deflate', 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    Alert.alert('Test notification sent!');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ marginBottom: 10, textAlign: 'center' }}>
        Expo Push Token: {expoPushToken ?? 'Fetching...'}
      </Text>
      <Button title="Send Test Notification" onPress={sendTestNotification} />
      {notification && (
        <View style={{ marginTop: 20 }}>
          <Text>Notification:</Text>
          <Text>{JSON.stringify(notification, null, 2)}</Text>
        </View>
      )}
    </View>
  );
}
