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
import { db } from "../../firebase"; // import your firebase.js
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDocs,
  getDoc,
  setDoc,
} from "firebase/firestore";

type Service = {
  id: string;
  name: string;
  description: string;
  balance: number;
  createdBy?: string;
};

type Tx = {
  id: string;
  user?: string;
  provider?: string;
  serviceId?: string;
  amount: number;
  type: "credit" | "savings" | "topup" | "loan" | "other";
  timestamp: number;
  note?: string;
  status?: "Pending" | "Completed" | "Failed";
};

export default function CreditSavingsServices() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [serviceDeposit, setServiceDeposit] = useState("");

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const USER_DOC_ID = "Nabimanya Elijah"; // Document name = account holder
  const userDocRef = doc(db, "acc", USER_DOC_ID);
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);

  // Load user + services
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(userDocRef);

        // Register user if not existing
        if (!snap.exists()) {
          const defaultData = {
            Name: "Nabimanya Elijah",
            phone: "0700000000",
            net: 500000,
            isFrozen: false,
            transactions: [],
            createdAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, defaultData);
          if (!mounted) return;
          setProfile(defaultData);
          setTransactions([]);
        } else {
          const data = snap.data();
          if (!("net" in data)) data.net = 0;
          if (!("transactions" in data)) data.transactions = [];
          if (!mounted) return;
          setProfile(data);
          setTransactions(data.transactions || []);
        }

        const serviceSnap = await getDocs(collection(db, "services"));
        const loadedServices = serviceSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Service[];
        if (!mounted) return;
        setServices(loadedServices);
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

  // Create service
  const createService = async () => {
    if (!serviceName.trim() || !serviceDesc.trim() || !serviceDeposit.trim()) {
      Alert.alert("Incomplete", "Please fill all fields.");
      return;
    }
    const initial = parseFloat(serviceDeposit);
    if (isNaN(initial) || initial < 0) {
      Alert.alert("Invalid deposit", "Enter a valid initial deposit.");
      return;
    }
    if ((profile.net || 0) < initial) {
      Alert.alert("Insufficient funds", "Not enough balance to deposit.");
      return;
    }

    try {
      const newService = {
        name: serviceName.trim(),
        description: serviceDesc.trim(),
        balance: initial,
        createdBy: USER_DOC_ID,
        createdAt: Date.now(),
      };
      const refDoc = await addDoc(collection(db, "services"), newService);
      setServices((prev) => [...prev, { id: refDoc.id, ...newService }]);

      const newNet = (profile.net || 0) - initial;
      await updateProfileNet(newNet);

      const tx: Tx = {
        id: `tx_${Date.now()}`,
        user: USER_DOC_ID,
        type: "savings",
        amount: initial,
        provider: "ServiceCreated",
        serviceId: refDoc.id,
        timestamp: Date.now(),
        note: `Created service ${serviceName.trim()} with deposit ${initial}`,
        status: "Completed",
      };
      await pushTxToProfile(tx);

      setServiceName("");
      setServiceDesc("");
      setServiceDeposit("");
      setModalVisible(false);
      Alert.alert("Created", `Service "${newService.name}" created successfully.`);
    } catch (err) {
      console.error("createService error:", err);
      Alert.alert("Error", "Failed to create service.");
    }
  };

  // Send payment
  const sendPayment = async () => {
    if (!selectedService) return;
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
      Alert.alert("Insufficient funds", "Not enough balance to complete payment.");
      return;
    }

    try {
      const serviceRef = doc(db, "services", selectedService.id);
      const newBalance = selectedService.balance + amt;
      await updateDoc(serviceRef, { balance: newBalance });
      setServices((prev) =>
        prev.map((s) => (s.id === selectedService.id ? { ...s, balance: newBalance } : s))
      );

      const newNet = (profile.net || 0) - amt;
      await updateProfileNet(newNet);

      const tx: Tx = {
        id: `tx_${Date.now()}`,
        user: USER_DOC_ID,
        serviceId: selectedService.id,
        amount: amt,
        type: "credit",
        provider: "ServicePayment",
        timestamp: Date.now(),
        note: `Paid UGX ${amt.toLocaleString()} to ${selectedService.name}`,
        status: "Completed",
      };
      await pushTxToProfile(tx);

      Alert.alert("Success", `Paid UGX ${amt.toLocaleString()} to ${selectedService.name}`);
      setPaymentAmount("");
      setSelectedService(null);
    } catch (err) {
      console.error("sendPayment error:", err);
      Alert.alert("Error", "Failed to send payment.");
    }
  };

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
      <Text style={[styles.header, { color: isDark ? "#fff" : "#000" }]}>Credit & Savings Services</Text>

      {/* Profile */}
      <View style={[styles.profileCard, { backgroundColor: isDark ? "#1c1c1e" : "#fff" }]}>
        <Text style={[styles.serviceName, { color: isDark ? "#fff" : "#000" }]}>{profile?.Name}</Text>
        <Text style={[styles.serviceDesc, { color: isDark ? "#aaa" : "#555" }]}>Phone: {profile?.phone}</Text>
        <Text style={[styles.serviceBalance, { color: "#00a650" }]}>
          Balance: UGX {Number(profile?.net || 0).toLocaleString()}
        </Text>
        <Text style={{ color: profile?.isFrozen ? "#FF5252" : "#4CAF50", marginTop: 6 }}>
          {profile?.isFrozen ? "Frozen" : "Active"}
        </Text>

        <TouchableOpacity style={[styles.payBtn, { marginTop: 10 }]} onPress={toggleFreeze}>
          <Text style={styles.payBtnText}>{profile?.isFrozen ? "Unfreeze" : "Freeze"}</Text>
        </TouchableOpacity>
      </View>

      {/* Create Service */}
      <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.createBtnText}>Create New Service</Text>
      </TouchableOpacity>

      {/* Services List */}
      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={[styles.serviceCard, { backgroundColor: isDark ? "#1c1c1e" : "#fff" }]}>
            <Text style={[styles.serviceName, { color: isDark ? "#fff" : "#000" }]}>{item.name}</Text>
            <Text style={[styles.serviceDesc, { color: isDark ? "#aaa" : "#555" }]}>{item.description}</Text>
            <Text style={[styles.serviceBalance, { color: "#00a650" }]}>
              Balance: UGX {item.balance.toLocaleString()}
            </Text>
            <TouchableOpacity style={styles.payBtn} onPress={() => setSelectedService(item)}>
              <Text style={styles.payBtnText}>Pay</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Transactions */}
      <Text style={[styles.sectionHeader, { color: isDark ? "#fff" : "#000" }]}>Transaction History</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={[styles.transactionCard, { backgroundColor: isDark ? "#1c1c1e" : "#fff" }]}>
            <Text style={{ color: isDark ? "#fff" : "#000", fontWeight: "700" }}>
              {item.type === "credit" ? `Paid UGX ${item.amount.toLocaleString()}` : `${item.type} UGX ${item.amount.toLocaleString()}`}
            </Text>
            <Text style={{ color: "#888", fontSize: 12 }}>{new Date(item.timestamp).toLocaleString()}</Text>
            {item.note && <Text style={{ color: "#aaa", marginTop: 6 }}>{item.note}</Text>}
          </View>
        )}
      />

      {/* Modals */}
      {/* Create Service Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <ScrollView contentContainerStyle={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? "#1c1c1e" : "#fff" }]}>
            <Text style={[styles.modalTitle, { color: isDark ? "#fff" : "#000" }]}>Create Service</Text>
            <TextInput
              placeholder="Service Name"
              placeholderTextColor={isDark ? "#888" : "#aaa"}
              value={serviceName}
              onChangeText={setServiceName}
              style={[styles.input, { backgroundColor: isDark ? "#121212" : "#f0f0f0" }]}
            />
            <TextInput
              placeholder="Description"
              placeholderTextColor={isDark ? "#888" : "#aaa"}
              value={serviceDesc}
              onChangeText={setServiceDesc}
              style={[styles.input, { backgroundColor: isDark ? "#121212" : "#f0f0f0" }]}
            />
            <TextInput
              placeholder="Initial Deposit"
              placeholderTextColor={isDark ? "#888" : "#aaa"}
              value={serviceDeposit}
              onChangeText={setServiceDeposit}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: isDark ? "#121212" : "#f0f0f0" }]}
            />
            <TouchableOpacity style={styles.modalBtn} onPress={createService}>
              <Text style={styles.modalBtnText}>Create Service</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc" }]} onPress={() => setModalVisible(false)}>
              <Text style={[styles.modalBtnText, { color: "#333" }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={!!selectedService} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? "#1c1c1e" : "#fff" }]}>
            <Text style={[styles.modalTitle, { color: isDark ? "#fff" : "#000" }]}>
              Pay {selectedService?.name}
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
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc" }]} onPress={() => setSelectedService(null)}>
              <Text style={[styles.modalBtnText, { color: "#333" }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={{ height: 36 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === "ios" ? 60 : 36, paddingHorizontal: 16 },
  header: { fontSize: 24, fontWeight: "800", marginBottom: 12, textAlign: "center" },
  createBtn: { flexDirection: "row", backgroundColor: "#25D366", padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  createBtnText: { color: "#fff", fontWeight: "700", marginLeft: 8 },
  serviceCard: { padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  serviceName: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
  serviceDesc: { fontSize: 14, marginBottom: 8 },
  serviceBalance: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
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
