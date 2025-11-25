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
import { getAuth } from "firebase/auth";
import { db } from "../../firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

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

  const quickTopUps = [5000, 10000, 20000, 50000, 100000];
  const mobileMoneyProviders = [
    { name: "Tx", color: "#FFD700" },
    { name: "Xn", color: "#FF4500" },
    { name: "rx", color: "#4CAF50" },
  ];

  const auth = getAuth();
  const currentUser = auth.currentUser;

  // ---------------- Fetch current user profile ----------------
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser) {
        setLabel("No logged-in user found. Please log in.");
        setLoading(false);
        return;
      }

      const userDocRef = doc(db, "acc", currentUser.uid);
      try {
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          if (!("net" in data)) data.net = 0;
          if (!("transactions" in data)) data.transactions = [];
          setProfile(data);
          setTransactions(data.transactions);
          setLabel(
            `Welcome back, ${data.Name || currentUser.displayName || "User"}!`
          );
        } else {
          const defaultData = {
            Name: currentUser.displayName || "User",
            age: "",
            dob: "",
            father: "",
            mother: "",
            idno: "",
            nin: "",
            nok: "",
            phone: currentUser.phoneNumber || "",
            net: 0,
            transactions: [],
            createdAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, defaultData);
          setProfile(defaultData);
          setTransactions([]);
          setLabel(`Account created for ${defaultData.Name}`);
        }
      } catch (err) {
        console.error(err);
        setLabel("Failed to load user profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [currentUser]);

  // ---------------- Firestore Update ----------------
  const updateFirestore = async (updates: any) => {
    if (!currentUser) return;
    const docRef = doc(db, "acc", currentUser.uid);
    try {
      await updateDoc(docRef, updates);
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

    if (
      (method === "Manual" || mobileMoneyProviders.some((p) => p.name === method)) &&
      (profile?.net || 0) < amount
    ) {
      setLabel(`Insufficient balance to top-up Shs ${amount} via ${method}.`);
      return;
    }

    const newTx = {
      receiver: method || "Top-Up",
      amount,
      timestamp: new Date().toLocaleString(),
      proof: `MM#${Math.floor(Math.random() * 10000)}`,
      status: "Completed",
    };

    const newNet =
      method === "Manual" || mobileMoneyProviders.some((p) => p.name === method)
        ? (profile?.net || 0) - amount
        : (profile?.net || 0) + amount;

    const updatedTxs = [newTx, ...transactions];
    setProfile({ ...profile, net: newNet });
    setTransactions(updatedTxs);
    setTopUpAmount("");
    setLabel(`${method || "Top-Up"} of Shs ${amount} processed successfully!`);
    await updateFirestore({ net: newNet, transactions: updatedTxs });
  };

  // ---------------- Send Money ----------------
  const sendMoney = async () => {
    const amount = Number(transferAmount);
    if (!recipientName.trim()) {
      setLabel("Enter recipient name.");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setLabel("Enter a valid amount.");
      return;
    }
    if ((profile?.net || 0) < amount) {
      setLabel("Insufficient funds to send.");
      return;
    }

    const recipientRef = doc(db, "acc", recipientName.trim().toLowerCase());
    const snap = await getDoc(recipientRef);
    if (!snap.exists()) {
      setLabel("Recipient does not exist.");
      return;
    }
    const recipientData = snap.data();

    const newSenderTx = {
      receiver: recipientName.trim(),
      amount,
      timestamp: new Date().toLocaleString(),
      proof: `TX#${Math.floor(Math.random() * 10000)}`,
      status: "Completed",
    };
    const newSenderNet = profile.net - amount;
    const updatedSenderTxs = [newSenderTx, ...transactions];
    setProfile({ ...profile, net: newSenderNet });
    setTransactions(updatedSenderTxs);
    await updateFirestore({ net: newSenderNet, transactions: updatedSenderTxs });

    const newRecipientTx = {
      receiver: profile.Name,
      amount,
      timestamp: new Date().toLocaleString(),
      proof: `TX#${Math.floor(Math.random() * 10000)}`,
      status: "Received",
    };
    const recipientNet = (recipientData?.net || 0) + amount;
    const recipientTxs = [newRecipientTx, ...(recipientData.transactions || [])];
    await updateDoc(recipientRef, { net: recipientNet, transactions: recipientTxs });

    setLabel(`Sent Shs ${amount} to ${recipientName.trim()}`);
    setRecipientName("");
    setTransferAmount("");
  };

  // ---------------- Edit Profile ----------------
  const openEditProfile = () => {
    if (!profile) return;

    setEditData({
      Name: profile.Name || "",
      age: profile.age ? String(profile.age) : "",
      dob: profile.dob || "",
      father: profile.father || "",
      mother: profile.mother || "",
      idno: profile.idno || "",
      nin: profile.nin || "",
      nok: profile.nok || "",
      phone: profile.phone ? String(profile.phone) : "",
    });

    setEditProfileModal(true);
  };

  const saveProfile = async () => {
    try {
      await updateFirestore(editData);
      setProfile((prev) => ({ ...prev, ...editData }));
      setLabel("Profile updated successfully!");
    } catch (err) {
      console.error("Profile update error:", err);
      setLabel("Failed to update profile.");
    }
    setEditProfileModal(false);
  };

  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );

  const topUpAmountNum = Number(topUpAmount);
  const sendAmountNum = Number(transferAmount);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{profile?.Name}</Text>
      <Text style={styles.balanceText}>Net: Shs {profile?.net?.toFixed(2)}</Text>

      <TouchableOpacity style={styles.editProfileBtn} onPress={openEditProfile}>
        <Text style={styles.editProfileText}>Edit Profile</Text>
      </TouchableOpacity>

      {/* ---------------- Top-Up Section ---------------- */}
      <Text style={styles.sectionTitle}>Top-Up Account</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter amount"
        placeholderTextColor="#999"
        keyboardType="numeric"
        value={topUpAmount}
        onChangeText={setTopUpAmount}
      />
      {topUpAmountNum > (profile?.net || 0) && (
        <Text style={styles.warningText}>Insufficient funds for this top-up.</Text>
      )}

      <View style={styles.quickTopUps}>
        {quickTopUps.map((amt) => (
          <TouchableOpacity
            key={amt}
            style={[
              styles.quickTopUpBtn,
              { backgroundColor: (profile?.net || 0) >= amt ? "#333" : "#555" },
            ]}
            onPress={() => (profile?.net || 0) >= amt && simulateTopUp(amt, "Manual")}
            disabled={(profile?.net || 0) < amt}
          >
            <Text style={styles.quickTopUpText}>Shs {amt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Mobile Money</Text>
      <View style={styles.mmRow}>
        {mobileMoneyProviders.map((provider) => {
          const canAfford =
            !isNaN(topUpAmountNum) && topUpAmountNum > 0 && (profile?.net || 0) >= topUpAmountNum;
          return (
            <TouchableOpacity
              key={provider.name}
              style={[styles.mmBtn, { backgroundColor: canAfford ? provider.color : "#555" }]}
              onPress={() => canAfford && simulateTopUp(topUpAmountNum, provider.name)}
              disabled={!canAfford}
            >
              <Text style={styles.mmText}>{provider.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ---------------- Send Money ---------------- */}
      <Text style={styles.sectionTitle}>Send Money</Text>
      <TextInput
        style={styles.input}
        placeholder="Recipient Name"
        placeholderTextColor="#999"
        value={recipientName}
        onChangeText={setRecipientName}
      />
      <TextInput
        style={styles.input}
        placeholder="Amount"
        placeholderTextColor="#999"
        keyboardType="numeric"
        value={transferAmount}
        onChangeText={setTransferAmount}
      />
      {sendAmountNum > (profile?.net || 0) && (
        <Text style={styles.warningText}>Insufficient funds to send.</Text>
      )}
      <TouchableOpacity
        style={[
          styles.topUpButton,
          { backgroundColor: sendAmountNum > (profile?.net || 0) || !recipientName ? "#555" : "#FF5722" },
        ]}
        onPress={sendMoney}
        disabled={sendAmountNum > (profile?.net || 0) || !recipientName || !transferAmount}
      >
        <Text style={styles.topUpButtonText}>Send Money</Text>
      </TouchableOpacity>

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
                  style={[styles.txText, { color: item.status === "Completed" ? "#4CAF50" : "#FFD700" }]}
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

      {/* ---------------- Edit Profile Modal ---------------- */}
      {editProfileModal && profile && (
        <Modal visible transparent animationType="slide">
          <ScrollView contentContainerStyle={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
                Edit Profile
              </Text>

              {Object.keys(editData).map((key) => (
                <TextInput
                  key={key}
                  style={styles.input}
                  placeholder={key}
                  placeholderTextColor="#999"
                  value={String(editData[key] ?? "")}
                  onChangeText={(text) =>
                    setEditData((prev) => ({ ...prev, [key]: text }))
                  }
                />
              ))}

              <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Save</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: "#ccc" }]}
                onPress={() => setEditProfileModal(false)}
              >
                <Text style={{ color: "#333" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Modal>
      )}
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
  warningText: { color: "#FF3B30", marginBottom: 8, fontSize: 14 },
  quickTopUps: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  quickTopUpBtn: { backgroundColor: "#333", padding: 10, borderRadius: 10 },
  quickTopUpText: { color: "#fff", fontWeight: "600" },
  mmRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  mmBtn: { flex: 1, marginHorizontal: 3, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  mmText: { color: "#fff", fontWeight: "700" },
  topUpButton: { backgroundColor: "#FF5722", padding: 14, borderRadius: 20, alignItems: "center", marginBottom: 10 },
  topUpButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  txCard: { backgroundColor: "#1a1a1a", borderRadius: 10, padding: 10, marginBottom: 10 },
  txText: { color: "#fff", fontSize: 14, marginBottom: 2 },
  noTx: { color: "#888", fontStyle: "italic", textAlign: "center", marginVertical: 10 },
  label: { color: "#ccc", textAlign: "center", marginTop: 10 },
  editProfileBtn: { backgroundColor: "#007bff", padding: 12, borderRadius: 20, alignItems: "center", marginBottom: 10 },
  editProfileText: { color: "#fff", fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { width: "100%", borderRadius: 12, padding: 18, backgroundColor: "#fff" },
  saveBtn: { backgroundColor: "#25D366", padding: 12, borderRadius: 12, alignItems: "center", marginTop: 6 },
});
