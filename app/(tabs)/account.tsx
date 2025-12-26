import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

type Transaction = {
  receiver: string;
  amount: number;
  timestamp: string;
  proof: string;
  status: string;
};

export default function AccountAndMoneyManager() {
  const USER_ID = "elijah";
  const userRef = doc(db, "acc", USER_ID);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [showTx, setShowTx] = useState(false);
  const [label, setLabel] = useState("");

  /* ---------------- FETCH USER DATA ---------------- */
  useEffect(() => {
    const loadAccount = async () => {
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          setLabel("Account not found.");
          return;
        }

        const data = snap.data();
        setProfile(data);
        setTransactions(data.transactions || []);
        setLabel(`Welcome, ${data.Name || "User"}`);
      } catch (e) {
        console.error(e);
        setLabel("Failed to load account.");
      } finally {
        setLoading(false);
      }
    };

    loadAccount();
  }, []);

  /* ---------------- TOP-UP ---------------- */
  const topUp = async () => {
    const amount = Number(topUpAmount);
    if (!amount || amount <= 0) {
      setLabel("Enter a valid amount");
      return;
    }

    const tx: Transaction = {
      receiver: "Top-Up",
      amount,
      timestamp: new Date().toLocaleString(),
      proof: `MM#${Math.floor(Math.random() * 9000 + 1000)}`,
      status: "Completed",
    };

    const newBalance = (profile?.net || 0) + amount;
    const updatedTx = [tx, ...transactions];

    setProfile({ ...profile, net: newBalance });
    setTransactions(updatedTx);
    setTopUpAmount("");

    await updateDoc(userRef, {
      net: newBalance,
      transactions: updatedTx,
    });

    setLabel(`Top-up of Shs ${amount} successful`);
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* USER INFO */}
      <Text style={styles.name}>{profile?.Name}</Text>
      <Text style={styles.balance}>Balance: Shs {profile?.net?.toFixed(2)}</Text>

      {/* OPTIONAL EXTRA DATA */}
      {profile?.phone && <Text style={styles.sub}>Phone: {profile.phone}</Text>}
      {profile?.nin && <Text style={styles.sub}>NIN: {profile.nin}</Text>}

      {/* TOP UP */}
      <Text style={styles.section}>Top Up</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="Enter amount"
        placeholderTextColor="#777"
        value={topUpAmount}
        onChangeText={setTopUpAmount}
      />
      <TouchableOpacity style={styles.btn} onPress={topUp}>
        <Text style={styles.btnText}>Top Up</Text>
      </TouchableOpacity>

      {/* TRANSACTIONS */}
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: "#2196F3" }]}
        onPress={() => setShowTx(!showTx)}
      >
        <Text style={styles.btnText}>
          {showTx ? "Hide Transactions" : "Show Transactions"}
        </Text>
      </TouchableOpacity>

      {showTx &&
        (transactions.length ? (
          <FlatList
            data={transactions}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
              <View style={styles.tx}>
                <Text style={styles.txText}>To: {item.receiver}</Text>
                <Text style={styles.txText}>Amount: Shs {item.amount}</Text>
                <Text style={styles.txText}>{item.timestamp}</Text>
                <Text style={styles.txText}>Proof: {item.proof}</Text>
                <Text
                  style={[
                    styles.txText,
                    { color: item.status === "Completed" ? "#4CAF50" : "#FFC107" },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            )}
          />
        ) : (
          <Text style={styles.empty}>No transactions</Text>
        ))}

      <Text style={styles.label}>{label}</Text>
    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { padding: 15, backgroundColor: "#121212", flexGrow: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  name: { fontSize: 24, fontWeight: "700", color: "#fff" },
  balance: { fontSize: 20, color: "#fff", marginVertical: 5 },
  sub: { color: "#aaa", marginBottom: 4 },
  section: { color: "#fff", fontSize: 18, marginVertical: 10 },
  input: {
    backgroundColor: "#1e1e1e",
    color: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  btn: {
    backgroundColor: "#FF5722",
    padding: 14,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 10,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  tx: { backgroundColor: "#1e1e1e", padding: 10, borderRadius: 10, marginBottom: 10 },
  txText: { color: "#fff", fontSize: 14 },
  empty: { color: "#777", textAlign: "center", marginTop: 10 },
  label: { color: "#bbb", textAlign: "center", marginTop: 10 },
});
