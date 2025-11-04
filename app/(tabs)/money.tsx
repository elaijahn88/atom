import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { db, auth } from "../../firebase"; // your firebase.js
import { getAuth } from "firebase/auth";
import { doc, setDoc, getDoc, collection, addDoc, getDocs, updateDoc } from "firebase/firestore";

// ----------------- App -----------------
export default function App() {
  const [screen, setScreen] = useState<"registration" | "credits" | "loan">("registration");
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = getAuth().currentUser;
        if (!currentUser) {
          setScreen("registration");
          setLoading(false);
          return;
        }

        const USER_DOC_ID = currentUser.uid;
        const userDocRef = doc(db, "acc", USER_DOC_ID);
        const snap = await getDoc(userDocRef);

        if (snap.exists()) {
          setUserDocId(USER_DOC_ID);
          setScreen("credits");
        } else {
          setScreen("registration");
        }
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Failed to check user.");
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#00BFFF" />
        <Text style={{ color: "#ccc", marginTop: 12 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {screen === "registration" && (
        <Registration
          onRegistered={(id) => {
            setUserDocId(id);
            setScreen("credits");
          }}
        />
      )}
      {screen === "credits" && userDocId && <CreditSavingsServices USER_DOC_ID={userDocId} onSwitchScreen={setScreen} />}
      {screen === "loan" && userDocId && <LoanScreen USER_DOC_ID={userDocId} onSwitchScreen={setScreen} />}
    </View>
  );
}

// ----------------- Registration -----------------
function Registration({ onRegistered }: { onRegistered: (id: string) => void }) {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [dob, setDob] = useState("");
  const [father, setFather] = useState("");
  const [mother, setMother] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [profession, setProfession] = useState("");
  const [email, setEmail] = useState("");
  const [identification, setIdentification] = useState("");
  const [taxId, setTaxId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !surname.trim() || !phone.trim()) {
      Alert.alert("Incomplete", "Please fill required fields.");
      return;
    }

    const currentUser = getAuth().currentUser;
    if (!currentUser) {
      Alert.alert("Error", "No logged-in user found.");
      return;
    }

    setLoading(true);
    try {
      const USER_DOC_ID = currentUser.uid;
      const userDocRef = doc(db, "acc", USER_DOC_ID);

      await setDoc(userDocRef, {
        Name: name.trim(),
        Surname: surname.trim(),
        MiddleName: middleName.trim(),
        DOB: dob,
        Father: father,
        Mother: mother,
        Address: address,
        ZipCode: zip,
        City: city,
        Phone: phone,
        Mobile: mobile,
        Profession: profession,
        Email: email,
        Identification: identification,
        TaxId: taxId,
        net: 0,
        isFrozen: false,
        transactions: [],
        loans: [],
        createdAt: new Date().toISOString(),
      });

      Alert.alert("Success", "Registration completed!");
      onRegistered(USER_DOC_ID);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to register user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Register</Text>
      <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} />
      <TextInput placeholder="Surname" value={surname} onChangeText={setSurname} style={styles.input} />
      <TextInput placeholder="Middle Name" value={middleName} onChangeText={setMiddleName} style={styles.input} />
      <TextInput placeholder="Date of Birth" value={dob} onChangeText={setDob} style={styles.input} />
      <TextInput placeholder="Father's Name" value={father} onChangeText={setFather} style={styles.input} />
      <TextInput placeholder="Mother's Name" value={mother} onChangeText={setMother} style={styles.input} />
      <TextInput placeholder="Address" value={address} onChangeText={setAddress} style={styles.input} />
      <TextInput placeholder="Zip Code" value={zip} onChangeText={setZip} style={styles.input} />
      <TextInput placeholder="City" value={city} onChangeText={setCity} style={styles.input} />
      <TextInput placeholder="Phone" value={phone} onChangeText={setPhone} style={styles.input} />
      <TextInput placeholder="Mobile" value={mobile} onChangeText={setMobile} style={styles.input} />
      <TextInput placeholder="Profession" value={profession} onChangeText={setProfession} style={styles.input} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput placeholder="Identification" value={identification} onChangeText={setIdentification} style={styles.input} />
      <TextInput placeholder="Tax ID" value={taxId} onChangeText={setTaxId} style={styles.input} />

      <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Register</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ----------------- Credit & Savings -----------------
type Service = { id: string; name: string; description: string; balance: number };
type Tx = { id: string; type: string; amount: number; timestamp: number; note?: string };

function CreditSavingsServices({ USER_DOC_ID, onSwitchScreen }: { USER_DOC_ID: string; onSwitchScreen: (s: string) => void }) {
  const userDocRef = doc(db, "acc", USER_DOC_ID);
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) return;
        const data = snap.data();
        if (!mounted) return;
        setProfile(data);
        setTransactions(data.transactions || []);

        const serviceSnap = await getDocs(collection(db, "services"));
        const loadedServices = serviceSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        if (!mounted) return;
        setServices(loadedServices);
      } catch (err) {
        console.error(err);
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
      console.error(err);
    }
  };

  const updateProfileNet = async (newNet: number) => {
    try {
      await updateDoc(userDocRef, { net: newNet });
      setProfile((p: any) => ({ ...p, net: newNet }));
    } catch (err) {
      console.error(err);
    }
  };

  const sendPayment = async () => {
    if (!selectedService) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0 || profile.net < amt) {
      Alert.alert("Error", "Invalid or insufficient funds.");
      return;
    }

    try {
      const serviceRef = doc(db, "services", selectedService.id);
      const newBalance = selectedService.balance + amt;
      await updateDoc(serviceRef, { balance: newBalance });
      setServices((prev) => prev.map((s) => (s.id === selectedService.id ? { ...s, balance: newBalance } : s)));

      const newNet = profile.net - amt;
      await updateProfileNet(newNet);

      const tx: Tx = { id: `tx_${Date.now()}`, type: "credit", amount: amt, timestamp: Date.now(), note: `Paid ${amt} to ${selectedService.name}` };
      await pushTxToProfile(tx);

      setSelectedService(null);
      setPaymentAmount("");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to send payment.");
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#00BFFF" />;

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === "ios" ? 60 : 36 }]}>
      <Text style={styles.header}>Welcome {profile?.Name}</Text>
      <Text style={{ marginBottom: 12 }}>Balance: {profile?.net}</Text>

      <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 12 }}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.navBtnText}>Create Service</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => onSwitchScreen("loan")}>
          <Text style={styles.navBtnText}>Loans</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.serviceCard}>
            <Text style={{ fontWeight: "700" }}>{item.name}</Text>
            <Text>{item.description}</Text>
            <Text>Balance: {item.balance}</Text>
            <TouchableOpacity style={styles.payBtn} onPress={() => setSelectedService(item)}>
              <Text style={{ color: "#fff" }}>Pay</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Service Modals */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <ScrollView contentContainerStyle={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>Create Service</Text>
            <TextInput placeholder="Name" value={serviceName} onChangeText={setServiceName} style={styles.input} />
            <TextInput placeholder="Description" value={serviceDesc} onChangeText={setServiceDesc} style={styles.input} />
            <TouchableOpacity style={styles.modalBtn} onPress={sendPayment}>
              <Text style={{ color: "#fff" }}>Create</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc" }]} onPress={() => setModalVisible(false)}>
              <Text style={{ color: "#333" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>

      <Modal visible={!!selectedService} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>Pay {selectedService?.name}</Text>
            <TextInput placeholder="Amount" value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="numeric" style={styles.input} />
            <TouchableOpacity style={styles.modalBtn} onPress={sendPayment}>
              <Text style={{ color: "#fff" }}>Send Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc" }]} onPress={() => setSelectedService(null)}>
              <Text style={{ color: "#333" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ----------------- Loan Screen -----------------
type Loan = { id: string; amount: number; purpose: string; status: "Pending" | "Approved" | "Rejected" };

function LoanScreen({ USER_DOC_ID, onSwitchScreen }: { USER_DOC_ID: string; onSwitchScreen: (s: string) => void }) {
  const userDocRef = doc(db, "acc", USER_DOC_ID);
  const [profile, setProfile] = useState<any>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [loanAmount, setLoanAmount] = useState("");
  const [loanPurpose, setLoanPurpose] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) return;
        const data = snap.data();
        setProfile(data);
        setLoans(data.loans || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const applyLoan = async () => {
    const amt = parseFloat(loanAmount);
    if (isNaN(amt) || amt <= 0 || !loanPurpose.trim()) {
      Alert.alert("Error", "Fill all fields correctly.");
      return;
    }

    const newLoan: Loan = { id: `loan_${Date.now()}`, amount: amt, purpose: loanPurpose, status: "Pending" };

    try {
      // Add loan to user's loans
      const updatedLoans = [newLoan, ...(profile.loans || [])];
      await updateDoc(userDocRef, { loans: updatedLoans });
      setLoans(updatedLoans);
      setProfile((p: any) => ({ ...p, loans: updatedLoans }));

      setModalVisible(false);
      setLoanAmount("");
      setLoanPurpose("");
      Alert.alert("Success", "Loan application submitted.");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to submit loan.");
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#00BFFF" />;

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === "ios" ? 60 : 36 }]}>
      <Text style={styles.header}>Loan Applications</Text>
      <TouchableOpacity style={styles.navBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.navBtnText}>Apply Loan</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navBtn} onPress={() => onSwitchScreen("credits")}>
        <Text style={styles.navBtnText}>Back to Services</Text>
      </TouchableOpacity>

      <FlatList
        data={loans}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.serviceCard}>
            <Text style={{ fontWeight: "700" }}>UGX {item.amount}</Text>
            <Text>Purpose: {item.purpose}</Text>
            <Text>Status: {item.status}</Text>
          </View>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <ScrollView contentContainerStyle={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>Apply Loan</Text>
            <TextInput placeholder="Amount" value={loanAmount} onChangeText={setLoanAmount} keyboardType="numeric" style={styles.input} />
            <TextInput placeholder="Purpose" value={loanPurpose} onChangeText={setLoanPurpose} style={styles.input} />
            <TouchableOpacity style={styles.modalBtn} onPress={applyLoan}>
              <Text style={{ color: "#fff" }}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#ccc" }]} onPress={() => setModalVisible(false)}>
              <Text style={{ color: "#333" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

// ----------------- Styles -----------------
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { fontSize: 24, fontWeight: "800", marginBottom: 12, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 12, padding: 12, marginBottom: 12 },
  btn: { backgroundColor: "#25D366", padding: 12, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  navBtn: { backgroundColor: "#007AFF", padding: 10, borderRadius: 12, alignItems: "center", marginBottom: 8 },
  navBtnText: { color: "#fff", fontWeight: "700" },
  serviceCard: { padding: 12, borderRadius: 12, marginBottom: 8, backgroundColor: "#f9f9f9" },
  payBtn: { backgroundColor: "#25D366", padding: 8, borderRadius: 12, alignItems: "center", marginTop: 6 },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { width: "100%", borderRadius: 12, padding: 18, backgroundColor: "#fff" },
  modalBtn: { backgroundColor: "#25D366", padding: 12, borderRadius: 12, alignItems: "center", marginTop: 6 },
});
