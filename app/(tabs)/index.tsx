// app/tabs/index.tsx
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";

import {
  registerForPushNotifications,
  sendLocalNotification,
  listenNotifications,
  listenNotificationResponse,
} from "../lib/notifications"; // ✅ FIXED PATH

const Index = () => {
  const [token, setToken] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<any>(null);

  useEffect(() => {
    // Register device
    registerForPushNotifications().then((t) => {
      setToken(t);
      console.log("TOKEN:", t);
    });

    // Listen when notification arrives
    const sub1 = listenNotifications((notification: any) => {
      console.log("Notification received:", notification);
      setLastNotification(notification);
    });

    // Listen when user taps notification
    const sub2 = listenNotificationResponse((response: any) => {
      console.log("User tapped:", response);

      Alert.alert(
        "Notification Clicked",
        response.notification.request.content.body
      );
    });

    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, []);

  const handleSend = async () => {
    await sendLocalNotification(
      "Hello 👋",
      "This is your test notification!"
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>

      <Text style={styles.info}>Token:</Text>
      <Text style={styles.token}>
        {token ? token : "Fetching..."}
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleSend}>
        <Text style={styles.buttonText}>
          Send Notification
        </Text>
      </TouchableOpacity>

      {lastNotification && (
        <View style={styles.box}>
          <Text style={{ color: "#fff" }}>
            Last Notification:
          </Text>
          <Text style={{ color: "#aaa" }}>
            {lastNotification.request.content.title}
          </Text>
        </View>
      )}
    </View>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    color: "#FF6347",
    fontWeight: "bold",
    marginBottom: 20,
  },
  info: {
    color: "#aaa",
    marginTop: 10,
  },
  token: {
    color: "#00ffcc",
    fontSize: 12,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#FF6347",
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  box: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#1E1E1E",
    borderRadius: 10,
    width: "100%",
  },
});
