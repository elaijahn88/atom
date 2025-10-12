import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import messaging from 'expo-firebase-messaging';

export default function App() {
  useEffect(() => {
    // Request permission
    const requestPermission = async () => {
      const authStatus = await messaging().requestPermission();
      if (authStatus === messaging.AuthorizationStatus.AUTHORIZED) {
        console.log('FCM authorized');
      }
    };

    // Get device token
    const getToken = async () => {
      const token = await messaging().getToken();
      console.log('Device FCM token:', token);
    };

    requestPermission();
    getToken();

    // Listen for foreground messages
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('FCM Message received:', remoteMessage);
    });

    return unsubscribe;
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Expo Firebase Messaging Demo</Text>
    </View>
  );
}
