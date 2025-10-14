import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  ScrollView,
  useColorScheme,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db, auth, database, ref, push, onValue } from "../../firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDocs,
  query,
} from "firebase/firestore";

type Sacco = {
  id: string;
  name: string;
  description: string;
  balance: number;
};

type Transaction = {
  id?: string;
  user: string;
  saccoId?: string;
  recipientEmail?: string;
  amount: number;
  type: "sacco" | "gift";
  timestamp: number;
};

export default function SaccoManager() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [saccos, setSaccos] = useState<Sacco[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deposit, setDeposit] = useState("");

  const [selectedSacco, setSelectedSacco] = useState<Sacco | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [giftEmail, setGiftEmail] = useState("");

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const currentUserEmail = auth.currentUser?.email || "guest";

  // 🔄 Load SACCOs from Firestore
  useEffect(() => {
    const loadSaccos = async () => {
      const saccoSnapshot = await getDocs(collection(db, "saccos"));
      const loadedSaccos = saccoSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Sacco[];
      setSaccos(loadedSaccos);
    };
    loadSaccos();
  }, []);

  // 🔄 Load user transactions from Realtime Database
  useEffect(() => {
    const userRef = ref(database, "transactions/" + currentUserEmail.replace(".", "_"));
    onValue(userRef, (snapshot) => {
      const data = snapshot.val() || {};
      const loaded: Transaction[] = Object.entries(data).map(([key, value]: any) => ({
        id: key,
        ...value,
      }));
      setTransactions(loaded.reverse());
    });
  }, []);

  // Create SACCO
  const createSacco = async () => {
    if (!name.trim() || !description.trim() || !deposit.trim()) {
      Alert.alert("Incomplete", "Please fill all fields.");
      return;
    }

    const newSacco = {
      name,
      description,
      balance: parseFloat(deposit),
      createdBy: currentUserEmail,
    };

    const docRef = await addDoc(collection(db, "saccos"), newSacco);
    setSaccos([...saccos, { id: docRef.id, ...newSacco }]);
    logActivity("Created SACCO: " + name);
    setName(""); setDescription(""); setDeposit("");
    setModalVisible(false);
  };

  // Send payment to SACCO
  const sendPayment = async () => {
    if (!selectedSacco || !paymentAmount.trim()) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid amount", "Enter a valid payment amount.");
      return;
    }

    const saccoRef = doc(db, "saccos", selectedSacco.id);
    await updateDoc(saccoRef, { balance: selectedSacco.balance + amount });

    setSaccos(
      saccos.map((sacco) =>
        sacco.id === selectedSacco.id
          ? { ...sacco, balance: sacco.balance + amount }
          : sacco
      )
    );

    push(ref(database, "transactions/" + currentUserEmail.replace(".", "_")), {
      user: currentUserEmail,
      saccoId: selectedSacco.id,
      amount,
      type: "sacco",
      timestamp: Date.now(),
    });

    logActivity(`Sent $${amount} to ${selectedSacco.name}`);
    Alert.alert("Success", `$${amount.toFixed(2)} sent to ${selectedSacco.name}`);
    setPaymentAmount(""); setSelectedSacco(null);
  };

  // Send gift payment to another user
  const sendGift = async () => {
    if (!giftEmail.trim() || !paymentAmount.trim()) {
      Alert.alert("Incomplete", "Enter recipient email and amount.");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid amount", "Enter a valid amount.");
      return;
    }

    push(ref(database, "transactions/" + currentUserEmail.replace(".", "_")), {
      user: currentUserEmail,
      recipientEmail: giftEmail,
      amount,
      type: "gift",
      timestamp: Date.now(),
    });

    push(ref(database, "transactions/" + giftEmail.replace(".", "_")), {
      user: currentUserEmail,
      recipientEmail: giftEmail,
      amount,
      type: "gift",
      timestamp: Date.now(),
    });

    logActivity(`Sent gift $${amount} to ${giftEmail}`);
    Alert.alert("Success", `Sent $${amount.toFixed(2)} gift to ${giftEmail}`);
    setGiftEmail(""); setPaymentAmount("");
  };

  // Track activity
  const logActivity = (action: string) => {
    push(ref(database, "activity/" + currentUserEmail.replace(".", "_")), { action, timestamp: Date.now() });
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#121212" : "#f9f9f9" }]}>
      <Text style={[styles.header, { color: isDark ? "#fff" : "#000" }]}>SACCO Manager</Text>

      <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.createBtnText}>Create New SACCO</Text>
      </TouchableOpacity>

      <FlatList
        data={saccos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 20 }}
        renderItem={({ item }) => (
          <View style={[styles.saccoCard, { backgroundColor: isDark ? "#1c1c1e" : "#fff" }]}>
            <Text style={[styles.saccoName, { color: isDark ? "#fff" : "#000" }]}>{item.name}</Text>
            <Text style={[styles.saccoDesc, { color: isDark ? "#aaa" : "#555" }]}>{item.description}</Text>
            <Text style={[styles.saccoBalance, { color: "#00a650" }]}>Balance: ${item.balance.toFixed(2)}</Text>

            <TouchableOpacity style={styles.payBtn} onPress={() => setSelectedSacco(item)}>
              <Text style={styles.payBtnText}>Send Payment</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Transaction History */}
      <Text style={[styles.sectionHeader, { color: isDark ? "#fff" : "#000" }]}>Transaction History</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id || Math.random().toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={[styles.transactionCard, { backgroundColor: isDark ? "#1c1c1e" : "#fff" }]}>
            <Text style={{ color: isDark ? "#fff" : "#000" }}>
              {item.type === "sacco"
                ? `Paid $${item.amount} to SACCO`
                : `Gifted $${item.amount} to ${item.recipientEmail}`}
            </Text>
            <Text style={{ color: "#888", fontSize: 12 }}>{new Date(item.timestamp).toLocaleString()}</Text>
          </View>
        )}
      />

      {/* Create SACCO Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <ScrollView contentContainerStyle={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? "#1c1c1e" : "#fff" }]}>
            <Text style={[styles.modalTitle, { color: isDark ? "#fff" : "#000" }]}>Create SACCO</Text>
            <TextInput placeholder="SACCO Name" placeholderTextColor={isDark ? "#888" : "#aaa"} value={name} onChangeText={setName} style={[styles.input, { backgroundColor: isDark ? "#121212" : "#f0f0f0" }]} />
            <TextInput placeholder="Description" placeholderTextColor={isDark ? "#888" : "#aaa"} value={description} onChangeText={setDescription} style={[styles.input, { backgroundColor: isDark ? "#121212" : "#f0f0f0" }]} />
            <TextInput placeholder="Initial Deposit" placeholderTextColor={isDark ? "#888" : "#aaa"} value={deposit} onChangeText={setDeposit} keyboardType="numeric" style={[styles.input, { backgroundColor: isDark ? "#121212" : "#f0f0f0" }]} />

            <TouchableOpacity style={styles.modalBtn} onPress={createSacco}>
              <Text style={styles.modalBtnText}>Create SACCO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc" }]} onPress={() => setModalVisible(false)}>
              <Text style={[styles.modalBtnText, { color: "#333" }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>

      {/* SACCO Payment Modal */}
      <Modal visible={!!selectedSacco} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? "#1c1c1e" : "#fff" }]}>
            <Text style={[styles.modalTitle, { color: isDark ? "#fff" : "#000" }]}>
              Send Payment to {selectedSacco?.name}
            </Text>
            <TextInput placeholder="Amount" placeholderTextColor={isDark ? "#888" : "#aaa"} value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="numeric" style={[styles.input, { backgroundColor: isDark ? "#121212" : "#f0f0f0" }]} />

            <TouchableOpacity style={styles.modalBtn} onPress={sendPayment}>
              <Text style={styles.modalBtnText}>Send Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc" }]} onPress={() => setSelectedSacco(null)}>
              <Text style={[styles.modalBtnText, { color: "#333" }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Gift Payment */}
      <View style={{ marginTop: 20 }}>
        <Text style={[styles.sectionHeader, { color: isDark ? "#fff" : "#000" }]}>Send Gift</Text>
        <TextInput placeholder="Recipient Email" placeholderTextColor={isDark ? "#888" : "#aaa"} value={giftEmail} onChangeText={setGiftEmail} style={[styles.input, { backgroundColor: isDark ? "#121212" : "#f0f0f0" }]} />
        <TextInput placeholder="Amount" placeholderTextColor={isDark ? "#888" : "#aaa"} value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="numeric" style={[styles.input, { backgroundColor: isDark ? "#121212" : "#f0f0f0" }]} />
        <TouchableOpacity style={styles.modalBtn} onPress={sendGift}>
          <Text style={styles.modalBtnText}>Send Gift</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, paddingHorizontal: 16 },
  header: { fontSize: 28, fontWeight: "900", marginBottom: 20 },
  createBtn: { flexDirection: "row", backgroundColor: "#25D366", padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  createBtnText: { color: "#fff", fontWeight: "700", marginLeft: 8 },
  saccoCard: { padding: 16, borderRadius: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 5 },
  saccoName: { fontSize: 20, fontWeight: "900", marginBottom: 4 },
  saccoDesc: { fontSize: 14, marginBottom: 8 },
  saccoBalance: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  payBtn: { backgroundColor: "#007aff", padding: 10, borderRadius: 12, alignItems: "center" },
  payBtnText: { color: "#fff", fontWeight: "700" },
  sectionHeader: { fontSize: 22, fontWeight: "900", marginVertical: 10 },
  transactionCard: { padding: 12, borderRadius: 12, marginBottom: 8 },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)", padding: 20 },
  modalContent: { width: "100%", borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 22, fontWeight: "900", marginBottom: 12, textAlign: "center" },
  input: { borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 12 },
  modalBtn: { backgroundColor: "#25D366", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 8 },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
