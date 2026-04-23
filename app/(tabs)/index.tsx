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

// 🌐 YOUR LIVE API
const API_URL = "https://api-1-lbzf.onrender.com";

// ================= API HELPER =================
const apiRequest = async (endpoint: string, method = "GET", body?: any) => {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) throw new Error("Request failed");

  return res.json();
};

// ================= NOTIFICATION SETUP =================
async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    Alert.alert("Error", "Use a real device");
    return;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    Alert.alert("Permission denied");
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log("Push Token:", token);

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return token;
}

// 🔔 LOCAL NOTIFICATION
const sendNotification = async (title: string, body: string) => {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
};

// ================= MAIN =================
export default function AgentScreen() {
  const [user, setUser] = useState<any>(null);
  const [amount, setAmount] = useState("");

  // ================= LOAD USER =================
  const loadUser = async () => {
    try {
      const data = await apiRequest("/user");
      setUser(data);
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Failed to load user");
    }
  };

  useEffect(() => {
    loadUser();
    registerForPushNotificationsAsync();
  }, []);

  // ================= ACTION =================
  const handleAction = async (type: string) => {
    const value = Number(amount);

    if (!value || value <= 0) {
      return Alert.alert("Error", "Enter valid amount");
    }

    try {
      let endpoint = "";

      switch (type) {
        case "deposit":
          endpoint = "/deposit";
          break;
        case "withdraw":
          endpoint = "/withdraw";
          break;
        case "freeze":
          endpoint = "/freeze";
          break;
        case "unfreeze":
          endpoint = "/unfreeze";
          break;
        default:
          return;
      }

      const res = await apiRequest(endpoint, "POST", { amount: value });

      if (res.success) {
        setUser(res.user);
        setAmount("");

        const msg = `${type.toUpperCase()} UGX ${value.toLocaleString()} successful`;

        Alert.alert("Success", msg);
        await sendNotification("Transaction Successful", msg);
      } else {
        Alert.alert("Error", "Transaction failed");
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err.message || "Failed");
    }
  };

  // ================= LOADING =================
  if (!user) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ color: "#fff" }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  // ================= UI =================
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>💼 Agent Dashboard</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{user.username}</Text>

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

// ================= BUTTON =================
const Btn = ({ title, onPress, color }: any) => (
  <TouchableOpacity style={[styles.btn, { backgroundColor: color }]} onPress={onPress}>
    <Text style={styles.btnText}>{title}</Text>
  </TouchableOpacity>
);

// ================= STYLES =================
const styles = StyleSheet.create({
  container: { padding: 20 },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },

  title: {
    fontSize: 28,
    color: "#fff",
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "bold",
  },

  card: {
    backgroundColor: "#1e293b",
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },

  label: { color: "#94a3b8", marginTop: 12 },
  value: { color: "#fff", fontSize: 20 },
  balance: { color: "#22c55e", fontSize: 24, fontWeight: "bold" },
  frozen: { color: "#38bdf8", fontSize: 20 },

  input: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
    color: "#fff",
    marginBottom: 24,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  btn: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
  },

  btnText: { color: "#fff", fontWeight: "bold" },
});
