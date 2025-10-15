import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert, FlatList } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';

interface User {
  id: string;
  name?: string;
  email?: string;
  fcmToken?: string;
}

const FCMUserManager: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const userId = 'user_123'; // Replace with real user ID
  const userName = 'Elijah';
  const userEmail = 'elijah@example.com';

  useEffect(() => {
    requestPermissionAndToken();
    listenTokenRefresh();
    fetchAllUsers();
  }, []);

  // Request permission and get token
  const requestPermissionAndToken = async () => {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      getAndSaveToken();
    } else {
      Alert.alert('Permission denied', 'Push notifications permission denied');
    }
  };

  // Listen for token refresh
  const listenTokenRefresh = () => {
    return messaging().onTokenRefresh(newToken => {
      console.log('Token refreshed:', newToken);
      setToken(newToken);
      saveTokenToFirestore(newToken);
    });
  };

  const getAndSaveToken = async () => {
    try {
      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        console.log('FCM Token:', fcmToken);
        setToken(fcmToken);
        saveTokenToFirestore(fcmToken);
      }
    } catch (error) {
      console.log('Error getting token:', error);
    }
  };

  const saveTokenToFirestore = async (fcmToken: string) => {
    try {
      await firestore().collection('users').doc(userId).set(
        {
          name: userName,
          email: userEmail,
          fcmToken,
        },
        { merge: true } // Merge so other fields are preserved
      );
      console.log('Token saved to Firestore');
      fetchAllUsers(); // Refresh list
    } catch (error) {
      console.log('Error saving token:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const snapshot = await firestore().collection('users').get();
      const userList: User[] = [];
      snapshot.forEach(doc => {
        userList.push({ id: doc.id, ...doc.data() } as User);
      });
      setUsers(userList);
    } catch (error) {
      console.log('Error fetching users:', error);
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={{ marginVertical: 5 }}>
      <Text>{item.name} ({item.email})</Text>
      <Text selectable>{item.fcmToken}</Text>
    </View>
  );

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ marginBottom: 10 }}>Your FCM Token:</Text>
      <Text selectable>{token || 'Fetching token...'}</Text>
      <Button title="Refresh Token" onPress={getAndSaveToken} />

      <Text style={{ marginVertical: 15, fontSize: 16 }}>All Users & Tokens:</Text>
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={renderUser}
      />
    </View>
  );
};

export default FCMUserManager;
