import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
  Platform,
} from "react-native";
import { db } from "../../firebase"; // replace with your firebase.js
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  getDocs,
} from "firebase/firestore";

// --------------------- APP ---------------------
export default function App() {
  const [role, setRole] = useState<"admin" | "member" | null>(null);
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!role) return <LoginScreen onLogin={(role, id) => { setRole(role); setUserDocId(id); }} />;
  if (role === "admin") return <AdminDashboard adminId={userDocId!} onLogout={() => { setRole(null); setUserDocId(null); }} />;
  if (role === "member") return <MemberDashboard memberId={userDocId!} onLogout={() => { setRole(null); setUserDocId(null); }} />;
  return null;
}

// --------------------- LOGIN ---------------------
function LoginScreen({ onLogin }: { onLogin: (role: "admin" | "member", id: string) => void }) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewAdminSignup, setViewAdminSignup] = useState(false);

  const handleLogin = async () => {
    if (!name.trim()) return setLabel("Enter name");
    setLoading(true);

    try {
      // Check admin collection first
      const adminRef = doc(db, "admin", name.trim().toLowerCase());
      const adminSnap = await getDoc(adminRef);
      if (adminSnap.exists()) {
        onLogin("admin", name.trim().toLowerCase());
        return;
      }

      // Check member collection
      const memberRef = doc(db, "acc", name.trim().toLowerCase());
      const memberSnap = await getDoc(memberRef);
      if (memberSnap.exists()) {
        onLogin("member", name.trim().toLowerCase());
        return;
      }

      // If not exist, create member automatically
      const newMember = {
        Name: name.trim(),
        net: 0,
        transactions: [],
        loans: [],
        savings: [],
        status: "active",
        createdAt: new Date().toISOString(),
      };
      await setDoc(memberRef, newMember);
      onLogin("member", name.trim().toLowerCase());
    } catch (err) {
      console.error(err);
      setLabel("Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#00BFFF" />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Login</Text>
      <TextInput style={styles.input} placeholder="Enter your name" value={name} onChangeText={setName} />
      <TouchableOpacity style={styles.btn} onPress={handleLogin}>
        <Text style={styles.btnText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, { backgroundColor: "#444" }]} onPress={() => setViewAdminSignup(true)}>
        <Text style={styles.btnText}>CEO: Add Admin</Text>
      </TouchableOpacity>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      {viewAdminSignup && <AdminSignup onAdminCreated={() => setViewAdminSignup(false)} />}
    </View>
  );
}

// --------------------- CEO VERIFIED ADMIN SIGNUP ---------------------
function AdminSignup({ onAdminCreated }: { onAdminCreated: () => void }) {
  const [ceoPassword, setCeoPassword] = useState("");
  const [verified, setVerified] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerifyCEO = () => {
    if (ceoPassword === "elijah2013grok") setVerified(true);
    else Alert.alert("Unauthorized", "Incorrect CEO password");
  };

  const handleCreateAdmin = async () => {
    if (!adminName.trim()) return Alert.alert("Enter admin name");
    setLoading(true);

    try {
      const docRef = doc(db, "admin", adminName.trim().toLowerCase());
      await setDoc(docRef, {
        Name: adminName.trim(),
        role: "admin",
        net: 0,
        transactions: [],
        loans: [],
        savings: [],
        status: "active",
        createdAt: new Date().toISOString(),
      });
      Alert.alert("Success", "Admin account created!");
      onAdminCreated();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to create admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.modalOverlay, { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }]}>
      <View style={styles.modalContent}>
        {!verified ? (
          <>
            <Text style={styles.header}>CEO Verification</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter CEO password"
              secureTextEntry
              value={ceoPassword}
              onChangeText={setCeoPassword}
            />
            <TouchableOpacity style={styles.btn} onPress={handleVerifyCEO}>
              <Text style={styles.btnText}>Verify</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.header}>Create Admin</Text>
            <TextInput style={styles.input} placeholder="Admin Name" value={adminName} onChangeText={setAdminName} />
            <TouchableOpacity style={styles.btn} onPress={handleCreateAdmin} disabled={loading}>
              <Text style={styles.btnText}>{loading ? "Creating..." : "Create Admin"}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

// --------------------- ADMIN DASHBOARD ---------------------
function AdminDashboard({ adminId, onLogout }: { adminId: string; onLogout: () => void }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "acc"));
      const allMembers = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setMembers(allMembers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMembers(); }, []);

  const removeMember = async (id: string) => {
    try {
      const ref = doc(db, "acc", id);
      await updateDoc(ref, { status: "removed" });
      loadMembers();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#00BFFF" />;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Admin Dashboard</Text>
      <TouchableOpacity style={styles.btn} onPress={onLogout}>
        <Text style={styles.btnText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Members</Text>
      {members.map((m) => (
        <View key={m.id} style={styles.serviceCard}>
          <Text>Name: {m.Name}</Text>
          <Text>Net: {m.net}</Text>
          <Text>Status: {m.status}</Text>
          <TouchableOpacity style={styles.navBtn} onPress={() => { setSelectedMember(m); setModalVisible(true); }}>
            <Text>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navBtn, { backgroundColor: "#FF4444" }]} onPress={() => removeMember(m.id)}>
            <Text>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Modal for editing member */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.header}>Edit Member</Text>
            <TextInput style={styles.input} placeholder="Name" value={selectedMember?.Name} onChangeText={(t) => setSelectedMember({ ...selectedMember, Name: t })} />
            <TextInput style={styles.input} placeholder="Net" value={String(selectedMember?.net)} keyboardType="numeric" onChangeText={(t) => setSelectedMember({ ...selectedMember, net: Number(t) })} />
            <TouchableOpacity style={styles.btn} onPress={async () => {
              if (!selectedMember) return;
              const ref = doc(db, "acc", selectedMember.id);
              await updateDoc(ref, { Name: selectedMember.Name, net: selectedMember.net });
              setModalVisible(false); loadMembers();
            }}>
              <Text style={styles.btnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: "#ccc" }]} onPress={() => setModalVisible(false)}>
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// --------------------- MEMBER DASHBOARD ---------------------
function MemberDashboard({ memberId, onLogout }: { memberId: string; onLogout: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "acc", memberId));
        if (snap.exists()) setProfile(snap.data());
      } catch (err) {
        console.error(err);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#00BFFF" />;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Member Dashboard</Text>
      <Text>Name: {profile?.Name}</Text>
      <Text>Net: {profile?.net}</Text>
      <TouchableOpacity style={styles.btn} onPress={onLogout}><Text style={styles.btnText}>Logout</Text></TouchableOpacity>
      {/* Savings, Loans, Transactions screens can be added similarly */}
    </ScrollView>
  );
}

// --------------------- STYLES ---------------------
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 12, padding: 12, marginBottom: 12 },
  btn: { backgroundColor: "#007AFF", padding: 12, borderRadius: 12, alignItems: "center", marginBottom: 8 },
  btnText: { color: "#fff", fontWeight: "700" },
  label: { color: "#FF4444", marginTop: 6 },
  sectionTitle: { fontSize: 20, fontWeight: "600", marginTop: 12 },
  serviceCard: { padding: 12, borderRadius: 12, marginBottom: 8, backgroundColor: "#f5f5f5" },
  navBtn: { backgroundColor: "#25D366", padding: 8, borderRadius: 8, marginTop: 6, alignItems: "center" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 20 },
  modalContent: { width: "100%", backgroundColor: "#fff", padding: 20, borderRadius: 12 },
});
