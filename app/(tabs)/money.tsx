import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  useColorScheme,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db, auth, database, ref, push, onValue } from "../../firebase";
import { collection, addDoc, doc, updateDoc, onSnapshot } from "firebase/firestore";

type Account = {
  id: string;
  name: string;
  type: "Bank" | "SACCO" | "Mobile Money";
  description: string;
  balance: number;
  createdBy?: string;
};

type Transaction = {
  id?: string;
  user: string;
  accountId?: string;
  amount: number;
  type: string;
  timestamp: number;
};

export default function MoneyManager() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [creatingType, setCreatingType] = useState<Account["type"]>("SACCO");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deposit, setDeposit] = useState("");

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [historyVisible, setHistoryVisible] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "success" | "error">("info");
  const msgAnim = useRef(new Animated.Value(0)).current;

  const currentUserEmail = auth.currentUser?.email || "guest@example.com";
  const avatarUri = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserEmail)}&background=111827&color=fff&size=128`;

  // --- Message helper ---
  const showMessage = (text: string, type: "info" | "success" | "error" = "info") => {
    setMessage(text);
    setMessageType(type);
    Animated.timing(msgAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(msgAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setMessage(""));
    }, 5000);
  };

  // --- Load accounts and detect balance changes ---
  useEffect(() => {
    let prevBalances: Record<string, number> = {};
    const accountsCol = collection(db, "accounts");

    const unsubscribe = onSnapshot(accountsCol, (snap) => {
      const loaded: Account[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      loaded.forEach((acc) => {
        const prev = prevBalances[acc.id];
        if (prev !== undefined && prev !== acc.balance) {
          showMessage(`${acc.name} balance changed: $${prev.toFixed(2)} → $${acc.balance.toFixed(2)}`, "info");
        }
        prevBalances[acc.id] = acc.balance;
      });
      setAccounts(loaded);
    }, (err) => showMessage("Failed to load accounts", "error"));

    return () => unsubscribe();
  }, []);

  // --- Load transactions for current user ---
  useEffect(() => {
    const safeEmail = currentUserEmail.replace(".", "_");
    const txRef = ref(database, "transactions/" + safeEmail);
    const unsub = onValue(txRef, (snapshot) => {
      const data = snapshot.val() || {};
      const loaded: Transaction[] = Object.entries(data).map(([k, v]: any) => ({ id: k, ...v }));
      setTransactions(loaded.reverse());
    });
    return () => unsub();
  }, [currentUserEmail]);

  // --- Create account ---
  const createAccount = async () => {
    if (!name.trim() || !description.trim() || !deposit.trim()) {
      showMessage("Please fill all fields.", "error");
      return;
    }
    const initial = parseFloat(deposit);
    if (isNaN(initial) || initial < 0) {
      showMessage("Enter a valid deposit.", "error");
      return;
    }
    try {
      const payload = { name, description, type: creatingType, balance: initial, createdBy: currentUserEmail };
      const docRef = await addDoc(collection(db, "accounts"), payload as any);
      setAccounts((prev) => [...prev, { id: docRef.id, ...(payload as any) }]);
      logActivity(`Created ${creatingType} "${name}"`);
      showMessage(`${creatingType} "${name}" created.`, "success");
      setModalVisible(false); setName(""); setDescription(""); setDeposit("");
    } catch (err) {
      console.error(err);
      showMessage("Failed to create account.", "error");
    }
  };

  // --- Deposit money ---
  const sendPayment = async () => {
    if (!selectedAccount) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      showMessage("Enter a valid amount.", "error");
      return;
    }
    try {
      const accRef = doc(db, "accounts", selectedAccount.id);
      const newBalance = selectedAccount.balance + amt;
      await updateDoc(accRef, { balance: newBalance });
      setAccounts((prev) => prev.map((a) => (a.id === selectedAccount.id ? { ...a, balance: newBalance } : a)));
      const safeEmail = currentUserEmail.replace(".", "_");
      await push(ref(database, "transactions/" + safeEmail), {
        user: currentUserEmail,
        accountId: selectedAccount.id,
        amount: amt,
        type: selectedAccount.type,
        timestamp: Date.now(),
      });
      logActivity(`Deposited $${amt.toFixed(2)} to ${selectedAccount.name}`);
      showMessage(`Deposited $${amt.toFixed(2)} to ${selectedAccount.name}`, "success");
      setPaymentAmount(""); setSelectedAccount(null);
    } catch (err) {
      console.error(err);
      showMessage("Deposit failed.", "error");
    }
  };

  // --- Log activity ---
  const logActivity = (action: string) => {
    const safeEmail = currentUserEmail.replace(".", "_");
    push(ref(database, "activity/" + safeEmail), { action, timestamp: Date.now() });
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0b0b0b" : "#f7f7f8" }]}>
      {/* Message */}
      {message ? (
        <Animated.View
          style={[
            styles.messageBox,
            {
              opacity: msgAnim,
              transform: [{ translateY: msgAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
              backgroundColor: messageType === "error" ? "#EF4444" : messageType === "success" ? "#10B981" : "#3B82F6",
            },
          ]}
        >
          <Text style={styles.messageText}>{message}</Text>
        </Animated.View>
      ) : null}

      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: isDark ? "#fff" : "#111" }]}>Money Manager</Text>
          <Text style={{ color: isDark ? "#bbb" : "#666" }}>{currentUserEmail}</Text>
        </View>
        <Image source={{ uri: avatarUri }} style={styles.avatar} />
      </View>

      {/* Account Creation */}
      <View style={styles.buttonRow}>
        {(["Bank", "SACCO", "Mobile Money"] as Account["type"][]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeBtn, { backgroundColor: t === "Bank" ? "#3B82F6" : t === "SACCO" ? "#10B981" : "#F59E0B" }]}
            onPress={() => { setCreatingType(t); setModalVisible(true); }}
          >
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={styles.typeBtnText}>Create {t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transaction History toggle */}
      <TouchableOpacity
        style={[styles.historyBtn, { backgroundColor: isDark ? "#111827" : "#007AFF" }]}
        onPress={() => setHistoryVisible(true)}
      >
        <Ionicons name="time-outline" size={18} color="#fff" />
        <Text style={styles.historyText}>Show Transaction History</Text>
      </TouchableOpacity>

      {/* Account list */}
      <FlatList
        data={accounts}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingVertical: 18 }}
        renderItem={({ item }) => (
          <View style={[styles.accountCard, { backgroundColor: isDark ? "#111" : "#fff" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.accountName, { color: isDark ? "#fff" : "#111" }]}>{item.name} • <Text style={{ fontWeight: "800" }}>{item.type}</Text></Text>
                <Text style={{ color: isDark ? "#aaa" : "#555" }}>{item.description}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: "#00a650", fontWeight: "800" }}>${item.balance.toFixed(2)}</Text>
                <TouchableOpacity style={styles.payBtn} onPress={() => setSelectedAccount(item)}>
                  <Text style={styles.payBtnText}>Deposit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      {/* Create Account Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <ScrollView contentContainerStyle={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? "#111" : "#fff" }]}>
            <Text style={[styles.modalTitle, { color: isDark ? "#fff" : "#111" }]}>Create {creatingType}</Text>
            <TextInput placeholder={`${creatingType} Name`} placeholderTextColor={isDark ? "#666" : "#999"} style={[styles.input, { backgroundColor: isDark ? "#0b0b0b" : "#f1f1f1" }]} value={name} onChangeText={setName} />
            <TextInput placeholder="Description" placeholderTextColor={isDark ? "#666" : "#999"} style={[styles.input, { backgroundColor: isDark ? "#0b0b0b" : "#f1f1f1" }]} value={description} onChangeText={setDescription} />
            <TextInput placeholder="Initial Deposit" placeholderTextColor={isDark ? "#666" : "#999"} style={[styles.input, { backgroundColor: isDark ? "#0b0b0b" : "#f1f1f1" }]} value={deposit} onChangeText={setDeposit} keyboardType="numeric" />

            <TouchableOpacity style={styles.modalBtn} onPress={createAccount}>
              <Text style={styles.modalBtnText}>Create {creatingType}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#6b7280" }]} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>

      {/* Deposit Modal */}
      <Modal visible={!!selectedAccount} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? "#111" : "#fff" }]}>
            <Text style={[styles.modalTitle, { color: isDark ? "#fff" : "#111" }]}>Deposit to {selectedAccount?.name}</Text>
            <TextInput placeholder="Amount" placeholderTextColor={isDark ? "#666" : "#999"} style={[styles.input, { backgroundColor: isDark ? "#0b0b0b" : "#f1f1f1" }]} value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="numeric" />
            <TouchableOpacity style={styles.modalBtn} onPress={sendPayment}>
              <Text style={styles.modalBtnText}>Deposit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#6b7280" }]} onPress={() => setSelectedAccount(null)}>
              <Text style={styles.modalBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Transaction History Modal */}
      <Modal visible={historyVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? "#111" : "#fff" }]}>
            <Text style={[styles.modalTitle, { color: isDark ? "#fff" : "#111" }]}>Transaction History</Text>
            <ScrollView style={{ maxHeight: 420, marginTop: 8 }}>
              {transactions.length === 0 && <Text style={{ color: isDark ? "#aaa" : "#666", textAlign: "center", padding: 20 }}>No transactions yet.</Text>}
              {transactions.map((t) => (
                <View key={t.id} style={[styles.transactionCard, { backgroundColor: isDark ? "#0b0b0b" : "#f3f3f3" }]}>
                  <Text style={{ color: isDark ? "#fff" : "#111" }}>{t.type} • ${t.amount.toFixed(2)}</Text>
                  <Text style={{ color: "#888", fontSize: 12 }}>{new Date(t.timestamp).toLocaleString()}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.modalBtn, { marginTop: 12 }]} onPress={() => setHistoryVisible(false)}>
              <Text style={styles.modalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, paddingHorizontal: 16 },
  messageBox: { position: "absolute", top: 12, left: 20, right: 20, paddingVertical: 10, borderRadius: 10, zIndex: 999 },
  messageText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  title: { fontSize: 28, fontWeight: "900" },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  typeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 10, borderRadius: 10, marginHorizontal: 6 },
  typeBtnText: { color: "#fff", marginLeft: 8, fontWeight: "700" },
  historyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, borderRadius: 10, marginBottom: 12 },
  historyText: { color: "#fff", marginLeft: 8, fontWeight: "700" },
  accountCard: { padding: 14, borderRadius: 12, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
  accountName: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  payBtn: { marginTop: 8, backgroundColor: "#111827", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  payBtnText: { color: "#fff", fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)", padding: 20 },
  modalContent: { width: "100%", borderRadius: 14, padding: 18 },
  modalTitle: { fontSize: 20, fontWeight: "900", marginBottom: 12, textAlign: "center" },
  input: { borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 12 },
  modalBtn: { backgroundColor: "#10B981", padding: 12, borderRadius: 10, alignItems: "center", marginTop: 8 },
  modalBtnText: { color: "#fff", fontWeight: "800" },
  transactionCard: { padding: 12, borderRadius: 10, marginBottom: 10 },
});
