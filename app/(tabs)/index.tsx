// AgentScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";

import { loginOrCreateUser } from "../lib/acc";
import {
  depositMoney,
  withdrawMoney,
  freezeMoney,
  unfreezeMoney,
} from "../lib/agent";

export default function AgentScreen() {
  const [user, setUser] = useState<any>(null);
  const [amount, setAmount] = useState("");

  // ================= LOAD USER =================
  useEffect(() => {
    const loadUser = async () => {
      const u = await loginOrCreateUser("AgentUser");
      setUser(u);
    };
    loadUser();
  }, []);

  // ================= ACTION HANDLER =================
  const handleAction = async (type: string) => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert("Error", "Enter valid amount");
      return;
    }

    const value = Number(amount);

    try {
      if (type === "deposit") await depositMoney(user.uid, value);
      if (type === "withdraw") await withdrawMoney(user.uid, value);
      if (type === "freeze") await freezeMoney(user.uid, value);
      if (type === "unfreeze") await unfreezeMoney(user.uid, value);

      Alert.alert("Success", `${type} completed`);

      setAmount("");
    } catch (e) {
      Alert.alert("Error", "Something went wrong");
    }
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>Loading user...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>💼 Agent Panel</Text>

      {/* USER INFO */}
      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <Text style={styles.value}>{user.username}</Text>

        <Text style={styles.label}>Wallet</Text>
        <Text style={styles.balance}>
          UGX {user.wallet?.toLocaleString()}
        </Text>

        <Text style={styles.label}>Frozen</Text>
        <Text style={styles.frozen}>
          UGX {(user.frozen || 0).toLocaleString()}
        </Text>
      </View>

      {/* INPUT */}
      <TextInput
        placeholder="Enter Amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        style={styles.input}
      />

      {/* BUTTONS */}
      <View style={styles.grid}>
        <TouchableOpacity
          style={[styles.btn, styles.deposit]}
          onPress={() => handleAction("deposit")}
        >
          <Text style={styles.btnText}>Deposit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.withdraw]}
          onPress={() => handleAction("withdraw")}
        >
          <Text style={styles.btnText}>Withdraw</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.freeze]}
          onPress={() => handleAction("freeze")}
        >
          <Text style={styles.btnText}>Freeze</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.unfreeze]}
          onPress={() => handleAction("unfreeze")}
        >
          <Text style={styles.btnText}>Unfreeze</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f5f5f5",
    flexGrow: 1,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 3,
  },

  label: {
    fontSize: 14,
    color: "#777",
  },

  value: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },

  balance: {
    fontSize: 20,
    fontWeight: "bold",
    color: "green",
    marginBottom: 10,
  },

  frozen: {
    fontSize: 18,
    fontWeight: "bold",
    color: "blue",
  },

  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    fontSize: 16,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  btn: {
    width: "48%",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
  },

  deposit: {
    backgroundColor: "green",
  },

  withdraw: {
    backgroundColor: "red",
  },

  freeze: {
    backgroundColor: "orange",
  },

  unfreeze: {
    backgroundColor: "blue",
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
