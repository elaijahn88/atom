// AgentScreen.tsx
import React, { useState } from "react";
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

// MOCK AGENT FUNCTIONS FOR DEMO
const depositMoney = async (_uid: string, amount: number) => {
  return new Promise((resolve) => setTimeout(resolve, 300));
};
const withdrawMoney = async (_uid: string, amount: number) => {
  return new Promise((resolve) => setTimeout(resolve, 300));
};
const freezeMoney = async (_uid: string, amount: number) => {
  return new Promise((resolve) => setTimeout(resolve, 300));
};
const unfreezeMoney = async (_uid: string, amount: number) => {
  return new Promise((resolve) => setTimeout(resolve, 300));
};

export default function AgentScreen() {
  const [user, setUser] = useState<any>({
    uid: "demo",
    username: "AgentUser",
    wallet: 100000,
    frozen: 20000,
  });
  const [amount, setAmount] = useState("");

  // ACTION HANDLER
  const handleAction = async (type: string) => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert("Error", "Enter valid amount");
      return;
    }

    const value = Number(amount);

    try {
      if (!user?.uid) throw new Error("User ID missing");

      // CALL DEMO AGENT FUNCTION
      if (type === "deposit") await depositMoney(user.uid, value);
      if (type === "withdraw") await withdrawMoney(user.uid, value);
      if (type === "freeze") await freezeMoney(user.uid, value);
      if (type === "unfreeze") await unfreezeMoney(user.uid, value);

      // UPDATE LOCAL DEMO USER
      setUser((prev: any) => {
        let wallet = prev.wallet;
        let frozen = prev.frozen;

        if (type === "deposit") wallet += value;
        if (type === "withdraw") wallet -= value;
        if (type === "freeze") {
          wallet -= value;
          frozen += value;
        }
        if (type === "unfreeze") {
          wallet += value;
          frozen -= value;
        }

        return { ...prev, wallet, frozen };
      });

      Alert.alert("Success", `${type} completed`);
      setAmount("");
    } catch (e) {
      console.log("Action error:", e);
      Alert.alert("Error", "Something went wrong");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>💼 Agent Panel (Demo)</Text>

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
          placeholderTextColor="#999"
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
    </SafeAreaView>
  );
}

// STYLES
const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#fff",
  },

  card: {
    backgroundColor: "#1e293b",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    color: "#94a3b8",
  },

  value: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },

  balance: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#22c55e",
    marginBottom: 10,
  },

  frozen: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#38bdf8",
  },

  input: {
    backgroundColor: "#1e293b",
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
    fontSize: 16,
    color: "#fff",
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

  deposit: {
    backgroundColor: "#16a34a",
  },

  withdraw: {
    backgroundColor: "#dc2626",
  },

  freeze: {
    backgroundColor: "#f59e0b",
  },

  unfreeze: {
    backgroundColor: "#3b82f6",
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
