import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function AccountAndMoneyManager() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [label, setLabel] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [showTransactions, setShowTransactions] = useState(false);
  const [editProfileModal, setEditProfileModal] = useState(false);

  const [editData, setEditData] = useState({
    Name: "",
    age: "",
    dob: "",
    father: "",
    mother: "",
    idno: "",
    nin: "",
    nok: "",
    phone: "",
  });

  const USER_ID = "elajah"; // hardcoded user
  const userDocRef = doc(db, "acc", USER_ID);

  // ---------------- Fetch existing user profile ----------------
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data);
          setTransactions(data.transactions || []);
          setLabel(`Welcome back, ${data.Name || "User"}!`);
        } else {
          setLabel("No account found for this user.");
        }
      } catch (err) {
        console.error(err);
        setLabel("Failed to load user profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // ---------------- Firestore Update ----------------
  const updateFirestore = async (updates: any) => {
    try {
      await updateDoc(userDocRef, updates);
    } catch (err) {
      console.error("Firestore update failed:", err);
      setLabel("Failed to update data.");
    }
  };

  // ---------------- Top-Up Function ----------------
  const simulateTopUp = async (amount: number, method?: string) => {
    if (!amount || isNaN(amount) || amount <= 0) {
      setLabel("Enter a valid amount.");
      return;
    }

    const newTx = {
      receiver: method || "Top-Up",
      amount,
      timestamp: new Date().toLocaleString(),
      proof: `MM#${Math.floor(Math.random() * 10000)}`,
      status: "Completed",
    };

    const newNet = (profile?.net || 0) + amount;
    const updatedTxs = [newTx, ...transactions];
    setProfile({ ...profile, net: newNet });
    setTransactions(updatedTxs);
    setTopUpAmount("");
    setLabel(`${method || "Top-Up"} of Shs ${amount} processed successfully!`);
    await updateFirestore({ net: newNet, transactions: updatedTxs });
  };

  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{profile?.Name}</Text>
      <Text style={styles.balanceText}>Net: Shs {profile?.net?.toFixed(2)}</Text>

      {/* Top-Up Section */}
      <Text style={styles.sectionTitle}>Top-Up Account</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter amount"
        placeholderTextColor="#999"
        keyboardType="numeric"
        value={topUpAmount}
        onChangeText={setTopUpAmount}
      />
      <TouchableOpacity
        style={styles.topUpButton}
        onPress={() => simulateTopUp(Number(topUpAmount))}
      >
        <Text style={styles.topUpButtonText}>Top-Up</Text>
      </TouchableOpacity>

      {/* Transactions */}
      <TouchableOpacity
        style={[styles.topUpButton, { backgroundColor: "#007bff" }]}
        onPress={() => setShowTransactions(!showTransactions)}
      >
        <Text style={styles.topUpButtonText}>
          {showTransactions ? "Hide Transactions" : "Show Transactions"}
        </Text>
      </TouchableOpacity>

      {showTransactions &&
        (transactions.length > 0 ? (
          <FlatList
            data={transactions}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
              <View style={styles.txCard}>
                <Text style={styles.txText}>To: {item.receiver}</Text>
                <Text style={styles.txText}>Amount: Shs {item.amount}</Text>
                <Text style={styles.txText}>{item.timestamp}</Text>
                <Text style={styles.txText}>Proof: {item.proof}</Text>
                <Text
                  style={[
                    styles.txText,
                    { color: item.status === "Completed" ? "#4CAF50" : "#FFD700" },
                  ]}
                >
                  Status: {item.status}
                </Text>
              </View>
            )}
          />
        ) : (
          <Text style={styles.noTx}>No transactions yet.</Text>
        ))}

      <Text style={styles.label}>{label}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 15, backgroundColor: "#121212" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 12 },
  balanceText: { fontSize: 20, color: "#fff", marginVertical: 5 },
  sectionTitle: { fontSize: 20, color: "#fff", fontWeight: "600", marginVertical: 10 },
  input: {
    width: "100%",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  topUpButton: { backgroundColor: "#FF5722", padding: 14, borderRadius: 20, alignItems: "center", marginBottom: 10 },
  topUpButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  txCard: { backgroundColor: "#1a1a1a", borderRadius: 10, padding: 10, marginBottom: 10 },
  txText: { color: "#fff", fontSize: 14, marginBottom: 2 },
  noTx: { color: "#888", fontStyle: "italic", textAlign: "center", marginVertical: 10 },
  label: { color: "#ccc", textAlign: "center", marginTop: 10 },
});
