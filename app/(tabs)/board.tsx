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
  Alert,
  Modal,
  Platform,
} from "react-native";
import { db } from "../../firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
} from "firebase/firestore";

// ----------------- App -----------------
export default function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<"admin" | "member" | null>(null);
  const [screen, setScreen] = useState<"login" | "admin" | "member">("login");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (name: string) => {
    if (!name.trim()) return Alert.alert("Enter your name");
    setLoading(true);
    const userDocRef = doc(db, "acc", name.trim().toLowerCase());
    try {
      const snap = await getDoc(userDocRef);
      if (!snap.exists()) {
        Alert.alert("User not found");
      } else {
        const data = snap.data();
        setUserId(name.trim().toLowerCase());
        setRole(data.role);
        setScreen(data.role === "admin" ? "admin" : "member");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00BFFF" />
      </View>
    );

  if (screen === "login") return <LoginScreen onLogin={handleLogin} />;

  if (screen === "admin" && userId) return <AdminDashboard USER_ID={userId} onLogout={() => setScreen("login")} />;

  if (screen === "member" && userId) return <MemberDashboard USER_ID={userId} onLogout={() => setScreen("login")} />;

  return null;
}

// ----------------- Login Screen -----------------
function LoginScreen({ onLogin }: { onLogin: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Board / Member Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter name"
        placeholderTextColor="#888"
        value={name}
        onChangeText={setName}
      />
      <TouchableOpacity style={styles.btn} onPress={() => onLogin(name)}>
        <Text style={styles.btnText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

// ----------------- Admin Dashboard -----------------
function AdminDashboard({ USER_ID, onLogout }: { USER_ID: string; onLogout: () => void }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState<"member" | "admin">("member");

  const loadMembers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "acc"));
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const addMember = async () => {
    if (!memberName.trim()) return Alert.alert("Enter member name");
    try {
      const docRef = doc(db, "acc", memberName.trim().toLowerCase());
      await setDoc(docRef, {
        Name: memberName,
        role: memberRole,
        net: 0,
        transactions: [],
        loans: [],
        savings: [],
        status: "active",
        createdAt: new Date().toISOString(),
      });
      Alert.alert("Member added");
      setModalVisible(false);
      setMemberName("");
      loadMembers();
    } catch (err) {
      console.error(err);
      Alert.alert("Failed to add member");
    }
  };

  const removeMember = async (id: string) => {
    try {
      const docRef = doc(db, "acc", id);
      await setDoc(docRef, { status: "inactive" }, { merge: true });
      Alert.alert("Member marked inactive");
      loadMembers();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#00BFFF" />;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Admin Dashboard</Text>
      <TouchableOpacity style={styles.navBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.navBtnText}>Add Member</Text>
      </TouchableOpacity>
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.serviceCard}>
            <Text style={{ fontWeight: "700" }}>{item.Name}</Text>
            <Text>Role: {item.role}</Text>
            <Text>Status: {item.status}</Text>
            <TouchableOpacity style={[styles.payBtn, { backgroundColor: "#FF5722" }]} onPress={() => removeMember(item.id)}>
              <Text style={{ color: "#fff" }}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>Add Member</Text>
            <TextInput placeholder="Name" value={memberName} onChangeText={setMemberName} style={styles.input} />
            <TextInput placeholder="Role (member/admin)" value={memberRole} onChangeText={(t) => setMemberRole(t as any)} style={styles.input} />
            <TouchableOpacity style={styles.modalBtn} onPress={addMember}>
              <Text style={{ color: "#fff" }}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc" }]} onPress={() => setModalVisible(false)}>
              <Text style={{ color: "#333" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ----------------- Member Dashboard -----------------
function MemberDashboard({ USER_ID, onLogout }: { USER_ID: string; onLogout: () => void }) {
  const userDocRef = doc(db, "acc", USER_ID);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loanAmount, setLoanAmount] = useState("");
  const [loanPurpose, setLoanPurpose] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        setProfile(snap.data());
        setTransactions(snap.data().transactions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const submitLoan = async () => {
    const amt = parseFloat(loanAmount);
    if (!loanPurpose.trim() || isNaN(amt) || amt <= 0) return Alert.alert("Fill fields correctly");

    const newLoan = {
      id: `loan_${Date.now()}`,
      amount: amt,
      purpose: loanPurpose,
      status: "Pending",
      timestamp: Date.now(),
    };

    try {
      const updatedLoans = [newLoan, ...(profile.loans || [])];
      await updateDoc(userDocRef, { loans: updatedLoans });
      setProfile((p: any) => ({ ...p, loans: updatedLoans }));
      setLoanAmount("");
      setLoanPurpose("");
      Alert.alert("Loan submitted");
    } catch (err) {
      console.error(err);
      Alert.alert("Failed to submit loan");
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#00BFFF" />;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Member Dashboard</Text>
      <Text style={{ fontWeight: "700", fontSize: 20 }}>Welcome, {profile.Name}</Text>
      <Text style={{ marginBottom: 12 }}>Balance: Shs {profile.net}</Text>

      {/* Loan Submission */}
      <Text style={{ fontWeight: "700", marginBottom: 6 }}>Apply Loan</Text>
      <TextInput placeholder="Amount" value={loanAmount} onChangeText={setLoanAmount} keyboardType="numeric" style={styles.input} />
      <TextInput placeholder="Purpose" value={loanPurpose} onChangeText={setLoanPurpose} style={styles.input} />
      <TouchableOpacity style={styles.btn} onPress={submitLoan}>
        <Text style={styles.btnText}>Submit Loan</Text>
      </TouchableOpacity>

      {/* Transaction History */}
      <Text style={{ fontWeight: "700", marginTop: 12, marginBottom: 6 }}>Transactions</Text>
      {transactions.length > 0 ? (
        <FlatList
          data={transactions}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => (
            <View style={styles.txCard}>
              <Text>To: {item.receiver}</Text>
              <Text>Amount: Shs {item.amount}</Text>
              <Text>{item.timestamp}</Text>
            </View>
          )}
        />
      ) : (
        <Text>No transactions yet</Text>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ----------------- Styles -----------------
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f0f0f0" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { fontSize: 24, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 12, padding: 12, marginBottom: 12 },
  btn: { backgroundColor: "#007AFF", padding: 12, borderRadius: 12, alignItems: "center", marginBottom: 12 },
  btnText: { color: "#fff", fontWeight: "700" },
  navBtn: { backgroundColor: "#25D366", padding: 12, borderRadius: 12, alignItems: "center", marginBottom: 12 },
  navBtnText: { color: "#fff", fontWeight: "700" },
  serviceCard: { padding: 12, borderRadius: 12, marginBottom: 8, backgroundColor: "#fff" },
  payBtn: { backgroundColor: "#007BFF", padding: 8, borderRadius: 12, alignItems: "center", marginTop: 6 },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { width: "90%", backgroundColor: "#fff", padding: 16, borderRadius: 12 },
  modalBtn: { backgroundColor: "#007BFF", padding: 12, borderRadius: 12, alignItems: "center", marginTop: 6 },
  logoutButton: { backgroundColor: "#FF5722", padding: 12, borderRadius: 12, alignItems: "center", marginTop: 12 },
  logoutText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  txCard: { backgroundColor: "#fff", padding: 12, borderRadius: 12, marginBottom: 8 },
});
