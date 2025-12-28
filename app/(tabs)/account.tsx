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
const CURRENT_USER_KEY = "elijah";
const CURRENT_USER_NAME = "Nabimanya elijah";

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
  pin?: string;
};

/* =====================
   APP
===================== */
export default function MoneyApp() {
  const [ready, setReady] = useState(false);
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [pinInput, setPinInput] = useState("");
  const [pinModal, setPinModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);
  const [hasPin, setHasPin] = useState(false);

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const userRef = doc(db, "acc", CURRENT_USER_KEY);
  const transactionsRef = collection(userRef, "transactions");

  /* =====================
     INIT + FIRESTORE LISTENERS
  ===================== */
  useEffect(() => {
    let unsubTx: any;
    let unsubUsers: any;

    const init = async () => {
      try {
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          await setDoc(userRef, {
            name: CURRENT_USER_NAME,
            balance: 0,
            pin: "",
          });
          setBalance(0);
          setHasPin(false);
        } else {
          const data = snap.data();
          setBalance(data?.balance || 0);
          setHasPin(Boolean(data?.pin));
        }

        // Listen for transactions in acc/elijah/transactions
        unsubTx = onSnapshot(
          query(transactionsRef, orderBy("timestamp", "desc")),
          (snap) => {
            const txs: Transaction[] = [];
            snap.forEach((d) => {
              txs.push(d.data() as Transaction);
            });
            setTransactions(txs);
          }
        );

        // Listen for other users
        unsubUsers = onSnapshot(collection(db, "acc"), (snap) => {
          const list: User[] = [];
          snap.forEach((d) =>
            list.push({ ...(d.data() as any), id: d.id })
          );
          setUsers(list.filter((u) => u.id !== CURRENT_USER_KEY));
        });

        setReady(true);
      } catch {
        Alert.alert("Error", "Failed to load account");
        setReady(true);
      }
    };

    init();

    return () => {
      unsubTx && unsubTx();
      unsubUsers && unsubUsers();
    };
  }, []);

  /* =====================
     HELPERS
  ===================== */
  const detectNetwork = (phone: string) => {
    if (phone.startsWith("077") || phone.startsWith("078") || phone.startsWith("076"))
      return "MTN Mobile Money";
    if (phone.startsWith("070") || phone.startsWith("075") || phone.startsWith("074"))
      return "Airtel Money";
    return null;
  };

  const showConfirmation = (text: string) => {
    setConfirmText(text);
    setConfirmVisible(true);
    setTimeout(() => setConfirmVisible(false), 2500);
  };

  const confirmPin = async () => {
    const snap = await getDoc(userRef);
    const savedPin = snap.data()?.pin;

    if (pinInput !== savedPin) {
      Alert.alert("Wrong PIN");
      return;
    }

    setPinModal(false);
    setPinInput("");
    pendingAction && pendingAction();
    setPendingAction(null);
  };

  const savePin = async () => {
    if (pinInput.length < 4) {
      Alert.alert("PIN must be at least 4 digits");
      return;
    }
    await updateDoc(userRef, { pin: pinInput });
    setHasPin(true);
    Alert.alert("PIN saved successfully");
    setPinInput("");
  };

  /* =====================
     ACTIONS
  ===================== */
  const topUp = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return Alert.alert("Enter valid amount");

    const snap = await getDoc(userRef);
    const oldBalance = snap.data()?.balance || 0;

    await updateDoc(userRef, { balance: oldBalance + amt });

    await addDoc(transactionsRef, {
      sender: "Top-up",
      receiver: CURRENT_USER_NAME,
      amount: amt,
      timestamp: Date.now(),
    });

    setBalance(oldBalance + amt);
    setAmount("");
    showConfirmation(
      `Top-up successful: +${amt.toLocaleString()} UGX. New Balance: ${(oldBalance + amt).toLocaleString()} UGX`
    );
  };

  const sendMoney = async (toUser: string) => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return Alert.alert("Invalid amount");

    const snap = await getDoc(userRef);
    const senderBal = snap.data()?.balance || 0;
    if (amt > senderBal) return Alert.alert("Insufficient balance");

    const receiverKey = toUser.toLowerCase();
    const receiverRef = doc(db, "acc", receiverKey);
    let receiverSnap = await getDoc(receiverRef);

    if (!receiverSnap.exists()) {
      await setDoc(receiverRef, { name: toUser, balance: 0, pin: "" });
      receiverSnap = await getDoc(receiverRef);
    }

    const receiverBal = receiverSnap.data()?.balance || 0;

    await updateDoc(userRef, { balance: senderBal - amt });
    await updateDoc(receiverRef, { balance: receiverBal + amt });

    await addDoc(transactionsRef, {
      sender: CURRENT_USER_NAME,
      receiver: toUser,
      amount: amt,
      timestamp: Date.now(),
    });

    setBalance(senderBal - amt);
    setAmount("");

    showConfirmation(
      `Sent ${amt.toLocaleString()} UGX to ${toUser}. New Balance: ${(senderBal - amt).toLocaleString()} UGX`
    );
  };

  const sendToMobileMoney = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return Alert.alert("Invalid amount");

    const snap = await getDoc(userRef);
    const oldBalance = snap.data()?.balance || 0;
    if (amt > oldBalance) return Alert.alert("Insufficient balance");

    if (phone.length < 10) return Alert.alert("Invalid phone");

    const network = detectNetwork(phone);
    if (!network) return Alert.alert("Unsupported network");

    await updateDoc(userRef, { balance: oldBalance - amt });

    await addDoc(transactionsRef, {
      sender: CURRENT_USER_NAME,
      receiver: `${network} (${phone})`,
      amount: amt,
      timestamp: Date.now(),
    });

    setBalance(oldBalance - amt);
    setAmount("");
    setPhone("");

    showConfirmation(
      `Sent ${amt.toLocaleString()} UGX to ${network} (${phone}). New Balance: ${(oldBalance - amt).toLocaleString()} UGX`
    );
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

      {/* PIN INPUT */}
      {!hasPin && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Set your 4-digit PIN"
            placeholderTextColor="#aaa"
            secureTextEntry
            keyboardType="numeric"
            maxLength={4}
            value={pinInput}
            onChangeText={setPinInput}
          />
          <TouchableOpacity style={styles.btn} onPress={savePin}>
            <Text style={styles.btnText}>Save PIN</Text>
          </TouchableOpacity>
        </>
      )}

      {/* MOBILE MONEY */}
      <Text style={styles.subHeader}>Mobile Money</Text>
      <TextInput
        style={styles.input}
        placeholder="Phone number"
        placeholderTextColor="#aaa"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <TextInput
        style={styles.input}
        placeholder="Amount"
        placeholderTextColor="#aaa"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />
      <TouchableOpacity
        style={styles.btn}
        onPress={() => {
          setPendingAction(() => sendToMobileMoney);
          setPinModal(true);
        }}
      >
        <Text style={styles.btnText}>Send to Mobile Money</Text>
      </TouchableOpacity>

      {/* USERS */}
      <Text style={styles.subHeader}>Send to Users</Text>
      <FlatList
        data={users}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.userRow}
            onPress={() => {
              setPendingAction(() => () => sendMoney(item.name));
              setPinModal(true);
            }}
          >
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userBalance}>
              {item.balance.toLocaleString()} UGX
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* TRANSACTIONS */}
      <Text style={styles.subHeader}>Transactions</Text>
      <FlatList
        data={transactions}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <View style={styles.txRow}>
            <Text style={styles.txText}>
              {item.sender === CURRENT_USER_NAME
                ? `Sent ${item.amount.toLocaleString()} UGX to ${item.receiver}`
                : item.sender === "Top-up"
                ? `Top-up ${item.amount.toLocaleString()} UGX`
                : `Received ${item.amount.toLocaleString()} UGX from ${item.sender}`}
            </Text>
            <Text style={styles.txTime}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>
          </View>
        )}
      />

      {/* PIN MODAL */}
      {pinModal && (
        <View style={styles.pinOverlay}>
          <View style={styles.pinBox}>
            <Text style={styles.pinTitle}>Enter PIN</Text>
            <TextInput
              style={styles.pinInput}
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
              value={pinInput}
              onChangeText={setPinInput}
            />
            <TouchableOpacity style={styles.btn} onPress={confirmPin}>
              <Text style={styles.btnText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPinModal(false)}>
              <Text style={{ color: "#f55", marginTop: 8 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* CONFIRMATION OVERLAY */}
      {confirmVisible && (
        <View style={styles.confirmOverlay}>
          <Text style={styles.confirmText}>{confirmText}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

/* =====================
   STYLES
===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121B22", padding: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { color: "#25D366", fontSize: 22, fontWeight: "bold" },
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
    marginBottom: 12,
  },
  btnText: { color: "#fff", fontWeight: "bold" },
  userRow: {
    backgroundColor: "#1E2C33",
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  userName: { color: "#fff" },
  userBalance: { color: "#25D366", fontWeight: "bold" },
  txRow: { borderBottomWidth: 0.5, borderColor: "#2A3942", padding: 8 },
  txText: { color: "#fff" },
  txTime: { color: "#aaa", fontSize: 11 },

  pinOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  pinBox: {
    backgroundColor: "#1E2C33",
    width: "80%",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  pinTitle: { color: "#fff", fontSize: 18, marginBottom: 10 },
  pinInput: {
    backgroundColor: "#121B22",
    color: "#fff",
    width: "100%",
    padding: 12,
    borderRadius: 10,
    textAlign: "center",
    fontSize: 20,
    marginBottom: 12,
  },

  confirmOverlay: {
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: "#25D366",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    zIndex: 10,
  },
  confirmText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
});
