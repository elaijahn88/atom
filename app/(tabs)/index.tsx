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

import { loginOrCreateUser, getDeviceId, getUser } from "../lib/acc";
import {
  depositMoney,
  withdrawMoney,
  freezeMoney,
  unfreezeMoney,
} from "../lib/agent";

// ================= NOTIFICATION SETUP =================
async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    Alert.alert("Error", "Use a real device for notifications");
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
    Alert.alert("Permission denied", "Enable notifications in settings");
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

// 🔔 SEND LOCAL NOTIFICATION
const sendNotification = async (title: string, body: string) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null,
  });
};

// ================= MAIN SCREEN =================
export default function AgentScreen() {
  const [user, setUser] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const deviceId = getDeviceId();

  // ================= LOAD USER =================
  const loadUser = async () => {
    try {
      await loginOrCreateUser("Elijah");
      const freshUser = await getUser(deviceId);
      setUser(freshUser);
    } catch (err) {
      console.log("Load user error:", err);
      Alert.alert("Error", "Failed to load user data");
    }
  };

  useEffect(() => {
    loadUser();
    registerForPushNotificationsAsync();
  }, []);

  // ================= ACTION HANDLER =================
  const handleAction = async (type: string) => {
    const value = Number(amount);

    if (!value || value <= 0) {
      return Alert.alert("Error", "Enter a valid amount");
    }

    if (!user) {
      return Alert.alert("Error", "User not loaded yet");
    }

    try {
      let success = false;

      switch (type) {
        case "deposit":
          success = await depositMoney(deviceId, value);
          break;
        case "withdraw":
          success = await withdrawMoney(deviceId, value);
          break;
        case "freeze":
          success = await freezeMoney(deviceId, value);
          break;
        case "unfreeze":
          success = await unfreezeMoney(deviceId, value);
          break;
        default:
          return;
      }

      if (success) {
        await loadUser();
        setAmount("");

        const msg = `${type.toUpperCase()} of UGX ${value.toLocaleString()} successful`;

        // In-app alert
        Alert.alert("Success", msg);

        // 🔔 SYSTEM NOTIFICATION
        await sendNotification("Transaction Successful", msg);
      } else {
        Alert.alert("Error", "Transaction failed");
      }
    } catch (err: any) {
      console.error("Transaction error:", err);
      Alert.alert("Error", err.message || "Transaction failed");
    }
  };

  // ================= LOADING =================
  if (!user) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ color: "#fff" }}>Loading user...</Text>
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

          <Text style={styles.label}>Frozen Amount</Text>
          <Text style={styles.frozen}>
            UGX {(user.frozenBalance || 0).toLocaleString()}
          </Text>

          <Text style={styles.label}>Device ID</Text>
          <Text style={styles.deviceId}>{deviceId}</Text>
        </View>

        <TextInput
          placeholder="Enter Amount (UGX)"
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
  container: { padding: 20, paddingBottom: 40 },

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

  value: { color: "#fff", fontSize: 20, fontWeight: "600" },

  balance: { color: "#22c55e", fontSize: 24, fontWeight: "bold" },

  frozen: { color: "#38bdf8", fontSize: 20, fontWeight: "600" },

  deviceId: { color: "#64748b", fontSize: 12, marginTop: 4 },

  input: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
    color: "#fff",
    fontSize: 18,
    marginBottom: 24,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  btn: {
    width: "48%",
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
