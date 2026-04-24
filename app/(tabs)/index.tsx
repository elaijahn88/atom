import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  Platform,
} from "react-native";

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://api-1-lbzf.onrender.com";

// ================= API =================
const apiRequest = async (endpoint: string, method = "GET", body?: any) => {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Server error");
    }

    return data;
  } catch (err: any) {
    throw new Error(err.message || "Network error (server asleep)");
  }
};

// ================= UID =================
const getUID = async () => {
  try {
    let uid = await AsyncStorage.getItem("uid");

    if (!uid) {
      uid = "agent-" + Math.random().toString(36).slice(2);
      await AsyncStorage.setItem("uid", uid);
    }

    return uid;
  } catch {
    return "agent-fallback";
  }
};

// ================= NOTIFICATIONS =================
async function registerForPushNotificationsAsync() {
  try {
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
  } catch {
    return null;
  }
}

const sendNotification = async (title: string, body: string) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {}
};

// ================= MAIN =================
export default function AgentScreen() {
  const [user, setUser] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [uid, setUid] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        const id = await getUID();

        setUid(id);

        const apiUser = await apiRequest("/user", "POST", {
          uid: id,
          username: "Agent",
          pushToken: token,
        });

        setUser(apiUser);
      } catch (err) {
        Alert.alert("Error", "Failed to connect to server");
      }
    };

    init();
  }, []);

  const handleAction = async (type: string) => {
    const value = Number(amount);

    if (isNaN(value) || value <= 0) {
      return Alert.alert("Error", "Enter valid amount");
    }

    try {
      const res = await apiRequest(`/${type}`, "POST", {
        uid,
        amount: value,
      });

      if (res.success) {
        setUser(res.user);
        setAmount("");

        const msg = `${type.toUpperCase()} UGX ${value.toLocaleString()} successful`;

        Alert.alert("Success", msg);
        await sendNotification("Transaction", msg);
      } else {
        Alert.alert("Error", res.error || "Transaction failed");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ color: "#fff" }}>Connecting...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>💼 Agent Dashboard</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{user.username || "Agent"}</Text>

          <Text style={styles.label}>Balance</Text>
          <Text style={styles.balance}>
            UGX {(user.balance || 0).toLocaleString()}
          </Text>

          <Text style={styles.label}>Frozen</Text>
          <Text style={styles.frozen}>
            UGX {(user.frozenBalance || 0).toLocaleString()}
          </Text>
        </View>

        <TextInput
          placeholder="Enter Amount"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          style={styles.input}
        />

        <View style={styles.grid}>
          <Btn title="Deposit" onPress={() => handleAction("deposit")} color="#16a34a" />
          <Btn title="Withdraw" onPress={() => handleAction("withdraw")} color="#dc2626" />
          <Btn title="Freeze" onPress={() => handleAction("freeze")} color="#f59e0b" />
          <Btn title="Unfreeze" onPress={() => handleAction("unfreeze")} color="#3b82f6" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const Btn = ({ title, onPress, color }: any) => (
  <TouchableOpacity style={[styles.btn, { backgroundColor: color }]} onPress={onPress}>
    <Text style={styles.btnText}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" },
  title: { fontSize: 28, color: "#fff", textAlign: "center", marginBottom: 24, fontWeight: "bold" },
  card: { backgroundColor: "#1e293b", padding: 20, borderRadius: 16, marginBottom: 24 },
  label: { color: "#94a3b8", marginTop: 12 },
  value: { color: "#fff", fontSize: 20 },
  balance: { color: "#22c55e", fontSize: 24, fontWeight: "bold" },
  frozen: { color: "#38bdf8", fontSize: 20 },
  input: { backgroundColor: "#1e293b", padding: 16, borderRadius: 12, color: "#fff", marginBottom: 24 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  btn: { width: "48%", padding: 16, borderRadius: 12, marginBottom: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "bold" },
});
