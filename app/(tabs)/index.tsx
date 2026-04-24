import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Platform,
} from "react-native";

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as Application from "expo-application";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://api-1-lbzf.onrender.com";

// ================= API =================
const apiRequest = async (endpoint: string, method = "GET", body?: any) => {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Server error");
  }

  return data;
};

// ================= UID =================
const getUID = async () => {
  let uid = await AsyncStorage.getItem("uid");

  if (!uid) {
    uid = "agent-" + Math.random().toString(36).slice(2);
    await AsyncStorage.setItem("uid", uid);
  }

  return uid;
};

// ================= NOTIFICATIONS =================
async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) return null;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return null;

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return token;
}

// ================= MAIN =================
export default function AgentScreen() {
  const [uid, setUid] = useState("");
  const [receiverUid, setReceiverUid] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    const init = async () => {
      const id = await getUID();
      const token = await registerForPushNotificationsAsync();

      const deviceId =
        Platform.OS === "android"
          ? Application.androidId
          : await Application.getIosIdForVendorAsync();

      setUid(id);

      await apiRequest("/user", "POST", {
        uid: id,
        username: "Agent",
        pushToken: token,
        deviceId,
      });
    };

    init();
  }, []);

  // ================= SEND =================
  const sendMoney = async () => {
    const value = Number(amount);

    if (!receiverUid || isNaN(value) || value <= 0) {
      return Alert.alert("Error", "Enter valid details");
    }

    try {
      await apiRequest("/send", "POST", {
        fromUid: uid,
        toUid: receiverUid,
        amount: value,
      });

      Alert.alert("Success", "Money sent + notification delivered");
      setAmount("");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>💸 Send Money</Text>

      <Text style={styles.label}>Your UID</Text>
      <Text style={styles.uid}>{uid}</Text>

      <TextInput
        placeholder="Receiver UID"
        placeholderTextColor="#999"
        value={receiverUid}
        onChangeText={setReceiverUid}
        style={styles.input}
      />

      <TextInput
        placeholder="Amount"
        placeholderTextColor="#999"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        style={styles.input}
      />

      <TouchableOpacity style={styles.btn} onPress={sendMoney}>
        <Text style={styles.btnText}>Send</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 20,
  },
  title: {
    fontSize: 26,
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },
  label: { color: "#94a3b8", marginTop: 10 },
  uid: { color: "#22c55e", marginBottom: 10 },
  input: {
    backgroundColor: "#1e293b",
    padding: 14,
    borderRadius: 10,
    color: "#fff",
    marginTop: 10,
  },
  btn: {
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "bold" },
});
