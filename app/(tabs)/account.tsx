import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  SafeAreaView,
} from "react-native";
import { db } from "../../firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

/* =====================
   CONFIG
===================== */
const CURRENT_USER_KEY = "elijah"; // doc id in collection "acc"
const CURRENT_USER_NAME = "Nabimanya Elijah";

/* =====================
   TYPES
===================== */
type Transaction = {
  sender: string;
  receiver: string;
  amount: number;
  timestamp: number;
};

type User = {
  name: string;
  balance: number;
  id: string;
};

/* =====================
   APP
===================== */
export default function MoneyApp() {
  const [ready, setReady] = useState(false);
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [receiver, setReceiver] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  /* Initialize account, transactions, and user list */
  useEffect(() => {
    const init = async () => {
      const ref = doc(db, "acc", CURRENT_USER_KEY);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, { name: CURRENT_USER_NAME, balance: 0 });
        setBalance(0);
      } else {
        setBalance(snap.data()?.balance || 0);
      }

      // Listen for transactions
      const txQuery = query(
        collection(db, "transactions"),
        orderBy("timestamp", "desc")
      );
      onSnapshot(txQuery, (snap) => {
        const txs: Transaction[] = [];
        snap.forEach((d) => {
          const data = d.data() as Transaction;
          if (data.sender === CURRENT_USER_NAME || data.receiver === CURRENT_USER_NAME) {
            txs.push(data);
          }
        });
        setTransactions(txs);
      });

      // Listen for all users
      const usersRef = collection(db, "acc");
      onSnapshot(usersRef, (snap) => {
        const list: User[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          list.push({ ...data, id: d.id });
        });
        setUsers(list);
      });

      setReady(true);
    };
    init();
  }, []);

  /* Send money (auto-create receiver if needed) */
  const sendMoney = async (toUser?: string) => {
    const receiverName = toUser || receiver;
    const amt = Number(amount);
    if (!amt || amt <= 0) return Alert.alert("Enter a valid amount");
    if (!receiverName) return Alert.alert("Enter receiver name");
    if (amt > balance) return Alert.alert("Insufficient balance");

    try {
      const senderRef = doc(db, "acc", CURRENT_USER_KEY);
      const senderSnap = await getDoc(senderRef);
      const senderBal = senderSnap.data()?.balance || 0;

      const receiverKey = receiverName.toLowerCase();
      const receiverRef = doc(db, "acc", receiverKey);
      let receiverSnap = await getDoc(receiverRef);

      // Auto-create receiver if they don't exist
      if (!receiverSnap.exists()) {
        await setDoc(receiverRef, { name: receiverName, balance: 0 });
        receiverSnap = await getDoc(receiverRef);
      }
      const receiverBal = receiverSnap.data()?.balance || 0;

      // Update balances
      await updateDoc(senderRef, { balance: senderBal - amt });
      await updateDoc(receiverRef, { balance: receiverBal + amt });

      // Record transaction
      await addDoc(collection(db, "transactions"), {
        sender: CURRENT_USER_NAME,
        receiver: receiverName,
        amount: amt,
        timestamp: Date.now(),
      });

      setAmount("");
      setReceiver("");
      Alert.alert("Success", `Sent ${amt.toLocaleString()} UGX to ${receiverName}`);
    } catch (err) {
      Alert.alert("Error", "Transaction failed");
    }
  };

  /* Top-up / Deposit money */
  const topUp = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return Alert.alert("Enter a valid amount");

    try {
      const userRef = doc(db, "acc", CURRENT_USER_KEY);
      const snap = await getDoc(userRef);
      const oldBalance = snap.data()?.balance || 0;

      await updateDoc(userRef, { balance: oldBalance + amt });

      await addDoc(collection(db, "transactions"), {
        sender: "Top-up",
        receiver: CURRENT_USER_NAME,
        amount: amt,
        timestamp: Date.now(),
      });

      setAmount("");
      Alert.alert("Success", `Added ${amt.toLocaleString()} UGX to your account`);
    } catch (err) {
      Alert.alert("Error", "Top-up failed");
    }
  };

  if (!ready)
    return (
      <View style={styles.center}>
        <Text style={{ color: "#fff" }}>Loading account...</Text>
      </View>
    );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Balance: {balance.toLocaleString()} UGX</Text>

      <TextInput
        placeholder="Amount"
        placeholderTextColor="#aaa"
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <TouchableOpacity style={styles.btn} onPress={topUp}>
        <Text style={styles.btnText}>Top-up / Deposit</Text>
      </TouchableOpacity>

      <Text style={styles.subHeader}>Send Money to Users:</Text>
      <FlatList
        data={users.filter((u) => u.id !== CURRENT_USER_KEY)}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.userRow}
            onPress={() => sendMoney(item.name)}
          >
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userBalance}>{item.balance.toLocaleString()} UGX</Text>
          </TouchableOpacity>
        )}
      />

      <Text style={styles.txHeader}>Transactions</Text>
      <FlatList
        data={transactions}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <View style={styles.txRow}>
            <Text style={styles.txText}>
              {item.sender === CURRENT_USER_NAME
                ? `Sent ${item.amount.toLocaleString()} UGX to ${item.receiver}`
                : item.sender === "Top-up"
                ? `Top-up: ${item.amount.toLocaleString()} UGX`
                : `Received ${item.amount.toLocaleString()} UGX from ${item.sender}`}
            </Text>
            <Text style={styles.txTime}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

/* =====================
   STYLES
===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121B22", padding: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { color: "#25D366", fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  subHeader: { color: "#fff", fontSize: 18, marginVertical: 8 },
  input: {
    backgroundColor: "#1E2C33",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  btn: {
    backgroundColor: "#25D366",
    padding: 12,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  userRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#1E2C33",
    marginBottom: 4,
    borderRadius: 8,
  },
  userName: { color: "#fff", fontSize: 16 },
  userBalance: { color: "#25D366", fontWeight: "bold" },
  txHeader: { color: "#fff", fontSize: 18, marginVertical: 8 },
  txRow: {
    padding: 10,
    borderBottomWidth: 0.5,
    borderColor: "#2A3942",
  },
  txText: { color: "#fff" },
  txTime: { color: "#bbb", fontSize: 11, marginTop: 2 },
});
