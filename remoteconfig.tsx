import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import remoteConfig from '@react-native-firebase/remote-config';

export default function App() {
  const [welcomeMessage, setWelcomeMessage] = useState('Loading...');

  useEffect(() => {
    async function fetchConfig() {
      try {
        // Set default values in case fetch fails
        await remoteConfig().setDefaults({
          welcome_message: 'Hello!',
        });

        // Set fetch interval (in seconds)
        await remoteConfig().setConfigSettings({
          minimumFetchIntervalMillis: 3600000, // 1 hour
        });

        // Fetch and activate values
        await remoteConfig().fetchAndActivate();

        // Get value
        const message = remoteConfig().getValue('welcome_message').asString();
        setWelcomeMessage(message);
      } catch (error) {
        console.log('Remote Config fetch failed:', error);
      }
    }

    fetchConfig();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{welcomeMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 24, fontWeight: 'bold' },
});
