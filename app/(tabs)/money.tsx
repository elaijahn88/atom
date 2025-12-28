import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";

// ================================================================
// FIRESTORE PATH
// ================================================================
const USER_DOC_ID = "elijah";
const userDocRef = doc(db, "acc", USER_DOC_ID);

// ================================================================
// MAIN APP
// ================================================================
export default function App() {
  const [screen, setScreen] = useState("credits"); // Start at credits screen

  return (
    <View style={{ flex: 1 }}>
      {screen === "credits" && (
        <CreditSavingsServices USER_DOC_ID={USER_DOC_ID} onSwitchScreen={setScreen} />
      )}
      {screen === "loan" && <LoanScreen USER_DOC_ID={USER_DOC_ID} onSwitchScreen={setScreen} />}
      {screen === "sms" && <SMSMessaging USER_DOC_ID={USER_DOC_ID} onSwitchScreen={setScreen} />}
    </View>
  );
}

// ================================================================
// CREDIT & SAVINGS SERVICES
// ================================================================
function CreditSavingsServices({ USER_DOC_ID, onSwitchScreen }) {
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) return;

        const data = snap.data();
        if (!mounted) return;

        setProfile(data);

        const serviceSnap = await getDocs(collection(db, "services"));
        setServices(serviceSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => (mounted = false);
  }, []);

  const payService = async (serviceId: string) => {
    if (!profile) return;
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;
    const balance = profile.net || 0;
    if (balance < service.balance) {
      Alert.alert("Insufficient Funds", "Cannot pay for this service");
      return;
    }
    await updateDoc(userDocRef, { net: balance - service.balance });
    Alert.alert("Paid", `UGX ${service.balance} paid for ${service.name}`);
    setProfile({ ...profile, net: balance - service.balance });
  };

  if (loading)
    return <ActivityIndicator style={{ flex: 1, backgroundColor: "#1B2430" }} size="large" color="#00BFFF" />;

  return (
    <View style={[styles.container, { backgroundColor: "#1B2430", paddingTop: 36 }]}>
      <Text style={[styles.header, { color: "#fff" }]}>Welcome {profile?.Name}</Text>
      <Text style={{ color: "#fff", textAlign: "center", marginBottom: 16 }}>Balance: UGX {profile?.net?.toLocaleString()}</Text>

      <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 16 }}>
        <TouchableOpacity style={styles.navBtn} onPress={() => Alert.alert("New Service")}>
          <Text style={styles.navBtnText}>New Service</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navBtn} onPress={() => onSwitchScreen("loan")}>
          <Text style={styles.navBtnText}>Loans</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navBtn} onPress={() => onSwitchScreen("sms")}>
          <Text style={styles.navBtnText}>Messages</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.serviceCard, { backgroundColor: "#2C3E50" }]}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>{item.name}</Text>
            <Text style={{ color: "#fff" }}>{item.description}</Text>
            <Text style={{ color: "#fff" }}>Cost: UGX {item.balance}</Text>
            <TouchableOpacity style={styles.payBtn} onPress={() => payService(item.id)}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Pay</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

// ================================================================
// SMS MESSAGING MODULE
// ================================================================
function SMSMessaging({ USER_DOC_ID, onSwitchScreen }) {
  const [inbox, setInbox] = useState<any[]>([]);
  const [outbox, setOutbox] = useState<any[]>([]);
  const [smsInput, setSmsInput] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSMS = async () => {
      try {
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) return;

        const data = snap.data();
        setInbox(data.inbox || []);
        setOutbox(data.outbox || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadSMS();
  }, []);

  const sendSMS = async () => {
    if (!smsInput.trim()) return;
    const smsObj = { id: "sms_" + Date.now(), text: smsInput.trim(), timestamp: Date.now(), type: "sent" };
    const updatedOut = [smsObj, ...outbox];
    setOutbox(updatedOut);
    await updateDoc(userDocRef, { outbox: updatedOut });
    setSmsInput("");
  };

  const receiveSMS = async () => {
    const smsObj = { id: "incoming_" + Date.now(), text: "Reply received!", timestamp: Date.now(), type: "received" };
    const updatedIn = [smsObj, ...inbox];
    setInbox(updatedIn);
    await updateDoc(userDocRef, { inbox: updatedIn });
    Alert.alert("New SMS", "You received a message.");
  };

  if (loading)
    return <ActivityIndicator style={{ flex: 1, backgroundColor: "#1B2430" }} size="large" color="#00BFFF" />;

  return (
    <View style={[styles.container, { backgroundColor: "#1B2430", paddingTop: 36 }]}>
      <Text style={[styles.header, { color: "#fff" }]}>SMS Messaging</Text>
      <View style={{ flexDirection: "row", marginVertical: 12 }}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Type message..."
          placeholderTextColor="#ccc"
          value={smsInput}
          onChangeText={setSmsInput}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendSMS}>
          <Text style={{ color: "#fff" }}>Send</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.navBtn, { backgroundColor: "#FFD700" }]} onPress={receiveSMS}>
        <Text style={{ color: "#000", fontWeight: "700" }}>Simulate Incoming</Text>
      </TouchableOpacity>

      <ScrollView style={{ marginTop: 16 }}>
        {[...outbox, ...inbox]
          .sort((a, b) => b.timestamp - a.timestamp)
          .map((sms) => (
            <View key={sms.id} style={[styles.smsBubble, sms.type === "sent" ? styles.sentBubble : styles.receivedBubble]}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>{sms.type === "sent" ? "You" : "Sender"}</Text>
              <Text style={{ color: "#fff" }}>{sms.text}</Text>
            </View>
          ))}
      </ScrollView>

      <TouchableOpacity style={styles.navBtn} onPress={() => onSwitchScreen("credits")}>
        <Text style={styles.navBtnText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

// ================================================================
// LOAN SCREEN
// ================================================================
function LoanScreen({ USER_DOC_ID, onSwitchScreen }) {
  const [profile, setProfile] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loanAmount, setLoanAmount] = useState("");
  const [loanPurpose, setLoanPurpose] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(userDocRef);
      if (!snap.exists()) return;

      const data = snap.data();
      setProfile(data);
      setLoans(data.loans || []);
      setLoading(false);
    };
    load();
  }, []);

  const applyLoan = async () => {
    if (!loanAmount.trim() || !loanPurpose.trim()) return;

    const newLoan = { id: "loan_" + Date.now(), amount: parseFloat(loanAmount), purpose: loanPurpose, status: "Pending" };
    const updated = [newLoan, ...loans];
    setLoans(updated);
    await updateDoc(userDocRef, { loans: updated });

    setModalVisible(false);
    setLoanAmount("");
    setLoanPurpose("");

    Alert.alert("Success", "Loan application submitted.");
  };

  if (loading)
    return <ActivityIndicator style={{ flex: 1, backgroundColor: "#1B2430" }} size="large" color="#00BFFF" />;

  return (
    <View style={[styles.container, { backgroundColor: "#1B2430", paddingTop: 36 }]}>
      <Text style={[styles.header, { color: "#fff" }]}>Loan Applications</Text>

      <TouchableOpacity style={styles.navBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.navBtnText}>Apply Loan</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navBtn} onPress={() => onSwitchScreen("credits")}>
        <Text style={styles.navBtnText}>Back</Text>
      </TouchableOpacity>

      <FlatList
        data={loans}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={[styles.serviceCard, { backgroundColor: "#2C3E50" }]}>
            <Text style={{ color: "#fff", fontWeight: "800" }}>UGX {item.amount}</Text>
            <Text style={{ color: "#fff" }}>Purpose: {item.purpose}</Text>
            <Text style={{ color: "#fff" }}>Status: {item.status}</Text>
          </View>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <ScrollView contentContainerStyle={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: "#1B2430" }]}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 20 }}>Apply for Loan</Text>
            <TextInput placeholder="Amount" placeholderTextColor="#ccc" value={loanAmount} onChangeText={setLoanAmount} keyboardType="numeric" style={styles.input} />
            <TextInput placeholder="Purpose" placeholderTextColor="#ccc" value={loanPurpose} onChangeText={setLoanPurpose} style={styles.input} />
            <TouchableOpacity style={styles.modalBtn} onPress={applyLoan}><Text style={{ color: "#fff" }}>Submit</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc" }]} onPress={() => setModalVisible(false)}><Text style={{ color: "#333" }}>Cancel</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

// ================================================================
// STYLES
// ================================================================
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { fontSize: 24, fontWeight: "800", marginBottom: 12, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#555", borderRadius: 12, padding: 12, marginBottom: 12, color: "#fff", backgroundColor: "#2C3E50" },
  navBtn: { backgroundColor: "#007AFF", padding: 10, borderRadius: 12, alignItems: "center", marginVertical: 4 },
  navBtnText: { color: "#fff", fontWeight: "700" },
  serviceCard: { padding: 12, borderRadius: 12, marginBottom: 8 },
  payBtn: { backgroundColor: "#25D366", padding: 8, borderRadius: 12, alignItems: "center", marginTop: 6 },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { width: "100%", borderRadius: 12, padding: 18 },
  modalBtn: { backgroundColor: "#25D366", padding: 12, borderRadius: 12, alignItems: "center", marginTop: 6 },
  smsBubble: { padding: 12, borderRadius: 12, marginBottom: 8, maxWidth: "80%" },
  sentBubble: { backgroundColor: "#2ECC71", alignSelf: "flex-end" },
  receivedBubble: { backgroundColor: "#3498DB", alignSelf: "flex-start" },
  sendBtn: { backgroundColor: "#25D366", padding: 14, borderRadius: 12, marginLeft: 8, justifyContent: "center", alignItems: "center" },
});
