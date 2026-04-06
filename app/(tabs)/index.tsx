// AgentScreen.tsx
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
} from "react-native";

import { loginOrCreateUser, getDeviceId, getUser } from "../lib/acc";
import {
  depositMoney,
  withdrawMoney,
  freezeMoney,
  unfreezeMoney,
} from "../lib/agent";

export default function AgentScreen() {
  const [user, setUser] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const deviceId = getDeviceId();

  // ================= LOAD REAL USER =================
  const loadUser = async () => {
    try {
      // ALWAYS create/load Elijah
      await loginOrCreateUser("Elijah");

      const freshUser = await getUser(deviceId);
      setUser(freshUser);
    } catch (err) {
      console.log("Load user error:", err);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  // ================= ACTION HANDLER =================
  const handleAction = async (type: string) => {
    const value = Number(amount);

    if (!value || value <= 0) {
      return Alert.alert("Error", "Enter a valid amount");
    }

    try {
      if (!user) throw new Error("User not loaded");

      if (type === "deposit") await depositMoney(deviceId, value);
      if (type === "withdraw") await withdrawMoney(deviceId, value);
      if (type === "freeze") await freezeMoney(deviceId, value);
      if (type === "unfreeze") await unfreezeMoney(deviceId, value);

      await loadUser(); // refresh from Firestore
      setAmount("");

    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Transaction failed");
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
        <Text style={styles.title}>💼 Agent Panel</Text>

        {/* USER CARD */}
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

        {/* INPUT */}
        <TextInput
          placeholder="Enter Amount"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          style={styles.input}
        />

        {/* ACTION BUTTONS */}
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
    fontSize: 26,
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "bold",
  },

  card: {
    backgroundColor: "#1e293b",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },

  label: {
    color: "#94a3b8",
    marginTop: 10,
  },

  value: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },

  balance: {
    color: "#22c55e",
    fontSize: 22,
    fontWeight: "bold",
  },

  frozen: {
    color: "#38bdf8",
    fontSize: 18,
    fontWeight: "bold",
  },

  input: {
    backgroundColor: "#1e293b",
    padding: 14,
    borderRadius: 10,
    color: "#fff",
    marginBottom: 20,
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
    marginBottom: 15,
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
