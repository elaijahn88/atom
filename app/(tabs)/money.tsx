// MergedAccountSacco.tsx
import React, { useEffect, useState } from "react";
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
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDocs,
  getDoc,
  setDoc,
} from "firebase/firestore";

/* -----------------------
   Types
   ----------------------- */
type Sacco = {
  id: string;
  name: string;
  description: string;
  balance: number;
  createdBy?: string;
};

type Tx = {
  id: string;
  user?: string; // who initiated
  provider?: string; // sacco or MM provider
  saccoId?: string;
  recipient?: string; // recipient username/email
  amount: number;
  type: "sacco" | "gift" | "topup" | "loan" | "other";
  timestamp: number;
  note?: string;
  status?: "Pending" | "Completed" | "Failed";
};

/* -----------------------
   Component
   ----------------------- */
export default function MergedAccountSacco() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // UI / local states
  const [loading, setLoading] = useState(true);

  // saccos + modal states
  const [saccos, setSaccos] = useState<Sacco[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [saccoName, setSaccoName] = useState("");
  const [saccoDesc, setSaccoDesc] = useState("");
  const [saccoDeposit, setSaccoDeposit] = useState("");

  // payment/gift states
  const [selectedSacco, setSelectedSacco] = useState<Sacco | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [giftEmail, setGiftEmail] = useState("");

  // Profile (acc/elijah)
  const USER_DOC_ID = "elijah"; // fixed as requested
  const userDocRef = doc(db, "acc", USER_DOC_ID);
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);

  /* -----------------------
     Load initial data: user doc and saccos
     ----------------------- */
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // load elijah doc (create if missing)
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) {
          // create default elijah doc
          const defaultData = {
            Name: "Nabimanya Elijah",
            father: "Ziriganira Robert",
            mother: "Winnie Kenturegye Zebra",
            nok: "Atukunda Timothy",
            idno: 18535416,
            nin: "CM9900910LFEAF",
            phone: 746524088,
            net: 200000, // initial balance as you used earlier
            isFrozen: false,
            transactions: [],
            createdAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, defaultData);
          if (!mounted) return;
          setProfile(defaultData);
          setTransactions(defaultData.transactions || []);
        } else {
          const data = snap.data();
          if (!("net" in data)) data.net = 0;
          if (!("transactions" in data)) data.transactions = [];
          if (!mounted) return;
          setProfile(data);
          // ensure transactions typed correctly
          setTransactions((data.transactions || []) as Tx[]);
        }

        // load saccos from collection
        const saccoSnap = await getDocs(collection(db, "saccos"));
        const loadedSaccos = saccoSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Sacco[];
        if (!mounted) return;
        setSaccos(loadedSaccos);
      } catch (err) {
        console.error("Load error:", err);
        Alert.alert("Error", "Failed loading data.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  /* -----------------------
     Helpers
     ----------------------- */
  const pushTxToProfile = async (tx: Tx) => {
    try {
      const newTxs = [tx, ...(profile.transactions || [])];
      await updateDoc(userDocRef, { transactions: newTxs });
      setProfile((p: any) => ({ ...p, transactions: newTxs }));
      setTransactions(newTxs);
    } catch (err) {
      console.error("pushTxToProfile error:", err);
    }
  };

  const updateProfileNet = async (newNet: number) => {
    try {
      await updateDoc(userDocRef, { net: newNet });
      setProfile((p: any) => ({ ...p, net: newNet }));
    } catch (err) {
      console.error("updateProfileNet error:", err);
      Alert.alert("Error", "Failed to update balance.");
    }
  };

  /* -----------------------
     SACCO: Create
     ----------------------- */
  const createSacco = async () => {
    if (!saccoName.trim() || !saccoDesc.trim() || !saccoDeposit.trim()) {
      Alert.alert("Incomplete", "Please fill all fields.");
      return;
    }
    const initial = parseFloat(saccoDeposit);
    if (isNaN(initial) || initial < 0) {
      Alert.alert("Invalid deposit", "Enter a valid initial deposit.");
      return;
    }

    try {
      const newSacco = {
        name: saccoName.trim(),
        description: saccoDesc.trim(),
        balance: initial,
        createdBy: USER_DOC_ID,
        createdAt: Date.now(),
      };
      const refDoc = await addDoc(collection(db, "saccos"), newSacco);
      setSaccos((prev) => [...prev, { id: refDoc.id, ...newSacco }]);

      // log transaction to elijah (treat as deposit into sacco, but not from elijah)
      const tx: Tx = {
        id: `tx_${Date.now()}`,
        user: USER_DOC_ID,
        type: "other",
        amount: initial,
        provider: "SaccoCreated",
        saccoId: refDoc.id,
        timestamp: Date.now(),
        note: `Created SACCO ${saccoName.trim()}`,
        status: "Completed",
      };
      await pushTxToProfile(tx);

      setSaccoName("");
      setSaccoDesc("");
      setSaccoDeposit("");
      setModalVisible(false);
      Alert.alert("Created", `SACCO "${newSacco.name}" created.`);
    } catch (err) {
      console.error("createSacco error:", err);
      Alert.alert("Error", "Failed to create SACCO.");
    }
  };

  /* -----------------------
     Send Payment to SACCO
     Deduct from acc/elijah.net and add to sacco.balance
     Also record a Tx inside elijah document (transactions array)
     ----------------------- */
  const sendPayment = async () => {
    if (!selectedSacco) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid amount", "Enter a valid payment amount.");
      return;
    }
    if (!profile) return;
    if (profile.isFrozen) {
      Alert.alert("Account Frozen", "Cannot make payment while account is frozen.");
      return;
    }
    if ((profile.net || 0) < amt) {
      Alert.alert("Insufficient funds", "Not enough net to complete payment.");
      return;
    }

    try {
      // update sacco document
      const saccoRef = doc(db, "saccos", selectedSacco.id);
      const newSaccoBalance = selectedSacco.balance + amt;
      await updateDoc(saccoRef, { balance: newSaccoBalance });

      // update local saccos list
      setSaccos((prev) =>
        prev.map((s) =>
          s.id === selectedSacco.id ? { ...s, balance: newSaccoBalance } : s
        )
      );

      // deduct from elijah.net
      const newNet = (profile.net || 0) - amt;
      await updateProfileNet(newNet);

      // create tx in elijah doc
      const tx: Tx = {
        id: `tx_${Date.now()}`,
        user: USER_DOC_ID,
        saccoId: selectedSacco.id,
        amount: amt,
        type: "sacco",
        provider: "SaccoPayment",
        timestamp: Date.now(),
        note: `Paid to SACCO ${selectedSacco.name}`,
        status: "Completed",
      };
      await pushTxToProfile(tx);

      Alert.alert("Success", `Sent $${amt.toFixed(2)} to ${selectedSacco.name}`);
      setPaymentAmount("");
      setSelectedSacco(null);
    } catch (err) {
      console.error("sendPayment error:", err);
      Alert.alert("Error", "Failed to send payment.");
    }
  };

  /* -----------------------
     Send Gift
     Deduct from elijah.net, credit recipient's acc/<recipient> net,
     append tx both sides' transactions arrays
     ----------------------- */
  const sendGift = async () => {
    if (!giftEmail.trim() || !paymentAmount.trim()) {
      Alert.alert("Incomplete", "Enter recipient and amount.");
      return;
    }
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid amount", "Enter a valid amount.");
      return;
    }
    if (!profile) return;
    if (profile.isFrozen) {
      Alert.alert("Account Frozen", "Cannot send gift while account is frozen.");
      return;
    }
    if ((profile.net || 0) < amt) {
      Alert.alert("Insufficient funds", "Not enough net to send gift.");
      return;
    }

    // recipient doc id: normalize email -> use without domain or full? We'll assume the recipient doc id is the part before @ or full email sanitized.
    // We'll try both: preferring doc with exact string as provided, otherwise use local part before @.
    const recipientKeyCandidates = [
      giftEmail.trim().toLowerCase(),
      giftEmail.trim().toLowerCase().replace(".", "_"),
      (giftEmail.split("@")[0] || "").toLowerCase(),
    ].filter(Boolean);

    try {
      // find recipient doc
      let recipientRef: any = null;
      let recipientSnap: any = null;
      for (const key of recipientKeyCandidates) {
        const candRef = doc(db, "acc", key);
        const snap = await getDoc(candRef);
        if (snap.exists()) {
          recipientRef = candRef;
          recipientSnap = snap;
          break;
        }
      }

      // if not found, create recipient doc with default profile (so they get credited)
      if (!recipientRef) {
        const newRecipientId = recipientKeyCandidates[0] || `user_${Date.now()}`;
        const newRecipientRef = doc(db, "acc", newRecipientId);
        const newRecipientData = {
          Name: giftEmail.split("@")[0] || newRecipientId,
          net: amt,
          transactions: [],
          isFrozen: false,
          createdAt: new Date().toISOString(),
        };
        await setDoc(newRecipientRef, newRecipientData);
        recipientRef = newRecipientRef;
        recipientSnap = await getDoc(newRecipientRef);
      }

      // debit elijah
      const newNetSender = (profile.net || 0) - amt;
      await updateProfileNet(newNetSender);

      // credit recipient
      const recipientData = recipientSnap.data();
      const recipientNet = (recipientData.net || 0) + amt;
      await updateDoc(recipientRef, { net: recipientNet });

      // create tx objects
      const txId = `tx_${Date.now()}`;

      const senderTx: Tx = {
        id: txId + "_s",
        user: USER_DOC_ID,
        recipient: recipientRef.id,
        amount: amt,
        type: "gift",
        timestamp: Date.now(),
        note: `Gifted to ${recipientRef.id}`,
        status: "Completed",
      };

      const recipientTx: Tx = {
        id: txId + "_r",
        user: recipientRef.id,
        recipient: USER_DOC_ID,
        amount: amt,
        type: "gift",
        timestamp: Date.now(),
        note: `Received gift from ${USER_DOC_ID}`,
        status: "Completed",
      };

      // push sender tx to elijah
      await pushTxToProfile(senderTx);

      // push recipient tx into their transactions array
      try {
        const recipientTxs = recipientData.transactions || [];
        const updatedRecipientTxs = [recipientTx, ...recipientTxs];
        await updateDoc(recipientRef, { transactions: updatedRecipientTxs });
      } catch (err) {
        console.error("writing recipient tx failed:", err);
      }

      Alert.alert("Success", `Sent $${amt.toFixed(2)} gift to ${giftEmail}`);
      setPaymentAmount("");
      setGiftEmail("");
    } catch (err) {
      console.error("sendGift error:", err);
      Alert.alert("Error", "Failed to send gift.");
    }
  };

  /* -----------------------
     Freeze toggle (on profile)
     ----------------------- */
  const toggleFreeze = async () => {
    if (!profile) return;
    try {
      const newStatus = !profile.isFrozen;
      await updateDoc(userDocRef, { isFrozen: newStatus });
      setProfile((p: any) => ({ ...p, isFrozen: newStatus }));
      Alert.alert("Success", `Account ${newStatus ? "frozen" : "unfrozen"}`);
    } catch (err) {
      console.error("toggleFreeze error:", err);
      Alert.alert("Error", "Failed to update status.");
    }
  };

  /* -----------------------
     UI Rendering
     ----------------------- */
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#00BFFF" />
        <Text style={{ color: "#ccc", marginTop: 12 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#121212" : "#f9f9f9" }]}>
      <Text style={[styles.header, { color: isDark ? "#fff" : "#000" }]}>SACCO & Account Manager</Text>

      {/* Profile / Balance */}
      <View style={[styles.profileCard, { backgroundColor: isDark ? "#1c1c1e" : "#fff" }]}>
        <Text style={[styles.saccoName, { color: isDark ? "#fff" : "#000" }]}>{profile?.Name}</Text>
        <Text style={[styles.saccoDesc, { color: isDark ? "#aaa" : "#555" }]}>Phone: {profile?.phone}</Text>
        <Text style={[styles.saccoBalance, { color: "#00a650" }]}>Net (Balance): ${Number(profile?.net || 0).toFixed(2)}</Text>
        <Text style={{ color: profile?.isFrozen ? "#FF5252" : "#4CAF50", marginTop: 6 }}>
          {profile?.isFrozen ? "Frozen" : "Active"}
        </Text>

        <View style={{ flexDirection: "row", marginTop: 10 }}>
          <TouchableOpacity style={[styles.payBtn, { marginRight: 8 }]} onPress={toggleFreeze}>
            <Text style={styles.payBtnText}>{profile?.isFrozen ? "Unfreeze" : "Freeze"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Create SACCO */}
      <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.createBtnText}>Create New SACCO</Text>
      </TouchableOpacity>

      {/* SACCO list */}
      <FlatList
        data={saccos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 10 }}
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

      {/* Transaction History (from profile.transactions) */}
      <Text style={[styles.sectionHeader, { color: isDark ? "#fff" : "#000" }]}>Transaction History</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={[styles.transactionCard, { backgroundColor: isDark ? "#1c1c1e" : "#fff" }]}>
            <Text style={{ color: isDark ? "#fff" : "#000", fontWeight: "700" }}>
              {item.type === "sacco" ? `Paid $${item.amount} to SACCO` : item.type === "gift" ? `Gift $${item.amount}` : `${item.type} $${item.amount}`}
            </Text>
            <Text style={{ color: "#888", fontSize: 12 }}>{new Date(item.timestamp).toLocaleString()}</Text>
            {item.note ? <Text style={{ color: "#aaa", marginTop: 6 }}>{item.note}</Text> : null}
          </View>
        )}
      />

      {/* Create SACCO Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <ScrollView contentContainerStyle={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? "#1c1c1e" : "#fff" }]}>
            <Text style={[styles.modalTitle, { color: isDark ? "#fff" : "#000" }]}>Create SACCO</Text>
            <TextInput
              placeholder="SACCO Name"
              placeholderTextColor={isDark ? "#888" : "#aaa"}
              value={saccoName}
              onChangeText={setSaccoName}
              style={[styles.input, { backgroundColor: isDark ? "#121212" : "#f0f0f0" }]}
            />
            <TextInput
              placeholder="Description"
              placeholderTextColor={isDark ? "#888" : "#aaa"}
              value={saccoDesc}
              onChangeText={setSaccoDesc}
              style={[styles.input, { backgroundColor: isDark ? "#121212" : "#f0f0f0" }]}
            />
            <TextInput
              placeholder="Initial Deposit"
              placeholderTextColor={isDark ? "#888" : "#aaa"}
              value={saccoDeposit}
              onChangeText={setSaccoDeposit}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: isDark ? "#121212" : "#f0f0f0" }]}
            />

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
            <TextInput
              placeholder="Amount"
              placeholderTextColor={isDark ? "#888" : "#aaa"}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: isDark ? "#121212" : "#f0f0f0" }]}
            />

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
      <View style={{ marginTop: 18 }}>
        <Text style={[styles.sectionHeader, { color: isDark ? "#fff" : "#000" }]}>Send Gift</Text>
        <TextInput
          placeholder="Recipient Key (acc doc id or email)"
          placeholderTextColor={isDark ? "#888" : "#aaa"}
          value={giftEmail}
          onChangeText={setGiftEmail}
          style={[styles.input, { backgroundColor: isDark ? "#121212" : "#f0f0f0" }]}
        />
        <TextInput
          placeholder="Amount"
          placeholderTextColor={isDark ? "#888" : "#aaa"}
          value={paymentAmount}
          onChangeText={setPaymentAmount}
          keyboardType="numeric"
          style={[styles.input, { backgroundColor: isDark ? "#121212" : "#f0f0f0" }]}
        />
        <TouchableOpacity style={styles.modalBtn} onPress={sendGift}>
          <Text style={styles.modalBtnText}>Send Gift</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 36 }} />
    </View>
  );
}

/* -----------------------
   Styles
   ----------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === "ios" ? 60 : 36, paddingHorizontal: 16 },
  header: { fontSize: 24, fontWeight: "800", marginBottom: 12, textAlign: "center" },
  createBtn: { flexDirection: "row", backgroundColor: "#25D366", padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  createBtnText: { color: "#fff", fontWeight: "700", marginLeft: 8 },
  saccoCard: { padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  saccoName: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
  saccoDesc: { fontSize: 14, marginBottom: 8 },
  saccoBalance: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  payBtn: { backgroundColor: "#007aff", padding: 10, borderRadius: 12, alignItems: "center" },
  payBtnText: { color: "#fff", fontWeight: "700" },
  sectionHeader: { fontSize: 20, fontWeight: "800", marginVertical: 10 },
  transactionCard: { padding: 12, borderRadius: 12, marginBottom: 8 },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)", padding: 20 },
  modalContent: { width: "100%", borderRadius: 16, padding: 18 },
  modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 12, textAlign: "center" },
  input: { borderRadius: 12, padding: 12, fontSize: 15, marginBottom: 12 },
  modalBtn: { backgroundColor: "#25D366", padding: 12, borderRadius: 12, alignItems: "center", marginTop: 6 },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  profileCard: { padding: 14, borderRadius: 12, marginBottom: 12 },
});
