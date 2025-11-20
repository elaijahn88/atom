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
  KeyboardAvoidingView,
} from "react-native";
import { db } from "../../firebase";
import { getAuth } from "firebase/auth";
import { doc, setDoc, getDoc, collection, addDoc, getDocs, updateDoc } from "firebase/firestore";

// ======================================================================
// MAIN APP
// ======================================================================
export default function App() {
  const [screen, setScreen] = useState("registration");
  const [userDocId, setUserDocId] = useState(null);
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
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  if (loading)
    return (
      <View style={[styles.container, { justifyContent: "center", backgroundColor: "#1B2430" }]}>
        <ActivityIndicator size="large" color="#00BFFF" />
        <Text style={{ color: "#fff", marginTop: 10 }}>Loading...</Text>
      </View>
    );

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

      {screen === "credits" && userDocId && (
        <CreditSavingsServices USER_DOC_ID={userDocId} onSwitchScreen={setScreen} />
      )}

      {screen === "loan" && userDocId && (
        <LoanScreen USER_DOC_ID={userDocId} onSwitchScreen={setScreen} />
      )}

      {screen === "sms" && userDocId && (
        <SMSMessaging USER_DOC_ID={userDocId} onSwitchScreen={setScreen} />
      )}
    </View>
  );
}

// ======================================================================
// REGISTRATION
// ======================================================================
function Registration({ onRegistered }) {
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
        inbox: [],
        outbox: [],
        createdAt: new Date().toISOString(),
      });

      onRegistered(USER_DOC_ID);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to register user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#1B2430" }} behavior="padding">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800", textAlign: "center" }}>
          Registration
        </Text>

        {[ 
          { placeholder: "Name", value: name, setter: setName },
          { placeholder: "Surname", value: surname, setter: setSurname },
          { placeholder: "Middle Name", value: middleName, setter: setMiddleName },
          { placeholder: "Date of Birth", value: dob, setter: setDob },
          { placeholder: "Father's Name", value: father, setter: setFather },
          { placeholder: "Mother's Name", value: mother, setter: setMother },
          { placeholder: "Address", value: address, setter: setAddress },
          { placeholder: "Zip Code", value: zip, setter: setZip },
          { placeholder: "City", value: city, setter: setCity },
          { placeholder: "Phone", value: phone, setter: setPhone },
          { placeholder: "Mobile", value: mobile, setter: setMobile },
          { placeholder: "Profession", value: profession, setter: setProfession },
          { placeholder: "Email", value: email, setter: setEmail },
          { placeholder: "Identification", value: identification, setter: setIdentification },
          { placeholder: "Tax ID", value: taxId, setter: setTaxId },
        ].map((f, i) => (
          <TextInput key={i} placeholder={f.placeholder} placeholderTextColor="#ccc"
            value={f.value} onChangeText={f.setter} style={styles.input} />
        ))}

        <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Register</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ======================================================================
// CREDIT & SAVINGS SERVICES
// ======================================================================
function CreditSavingsServices({ USER_DOC_ID, onSwitchScreen }) {
  const userDocRef = doc(db, "acc", USER_DOC_ID);

  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serviceName, setServiceName] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [selectedService, setSelectedService] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) return;

        const data = snap.data();
        if (!mounted) return;

        setProfile(data);
        setTransactions(data.transactions || []);

        const serviceSnap = await getDocs(collection(db, "services"));
        setServices(serviceSnap.docs.map((d) => ({ id: d.id, ...(d.data()) })));
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => (mounted = false);
  }, []);

  if (loading)
    return (
      <ActivityIndicator style={{ flex: 1, backgroundColor: "#1B2430" }} size="large" color="#00BFFF" />
    );

  return (
    <View style={[styles.container, { paddingTop: 36, backgroundColor: "#1B2430" }]}>
      <Text style={[styles.header, { color: "#fff" }]}>Welcome {profile?.Name}</Text>

      <Text style={{ color: "#fff", textAlign: "center" }}>Balance: {profile?.net}</Text>

      {/* BUTTONS */}
      <View style={{ flexDirection: "row", justifyContent: "space-around", marginVertical: 12 }}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setModalVisible(true)}>
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
            <Text style={{ color: "#fff" }}>Balance: {item.balance}</Text>

            <TouchableOpacity style={styles.payBtn} onPress={() => setSelectedService(item)}>
              <Text style={{ color: "#fff" }}>Pay</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

// ======================================================================
// SMS MESSAGING MODULE
// ======================================================================
function SMSMessaging({ USER_DOC_ID, onSwitchScreen }) {
  const userDocRef = doc(db, "acc", USER_DOC_ID);

  const [inbox, setInbox] = useState([]);
  const [outbox, setOutbox] = useState([]);
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

    const smsObj = {
      id: "sms_" + Date.now(),
      text: smsInput.trim(),
      timestamp: Date.now(),
      type: "sent",
    };

    const updatedOut = [smsObj, ...outbox];
    setOutbox(updatedOut);
    await updateDoc(userDocRef, { outbox: updatedOut });

    setSmsInput("");
  };

  const receiveSMS = async () => {
    const smsObj = {
      id: "incoming_" + Date.now(),
      text: "Reply received!",
      timestamp: Date.now(),
      type: "received",
    };

    const updatedIn = [smsObj, ...inbox];
    setInbox(updatedIn);
    await updateDoc(userDocRef, { inbox: updatedIn });

    Alert.alert("New SMS", "You received a message.");
  };

  if (loading)
    return (
      <ActivityIndicator style={{ flex: 1, backgroundColor: "#1B2430" }} size="large" color="#00BFFF" />
    );

  return (
    <View style={[styles.container, { paddingTop: 36, backgroundColor: "#1B2430" }]}>
      <Text style={[styles.header, { color: "#fff" }]}>SMS Messaging</Text>

      {/* Input */}
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

      {/* Messages */}
      <ScrollView style={{ marginTop: 16 }}>
        {[...outbox, ...inbox]
          .sort((a, b) => b.timestamp - a.timestamp)
          .map((sms) => (
            <View
              key={sms.id}
              style={[
                styles.smsBubble,
                sms.type === "sent" ? styles.sentBubble : styles.receivedBubble,
              ]}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                {sms.type === "sent" ? "You" : "Sender"}
              </Text>
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

// ======================================================================
// LOAN SCREEN
// ======================================================================
function LoanScreen({ USER_DOC_ID, onSwitchScreen }) {
  const userDocRef = doc(db, "acc", USER_DOC_ID);

  const [profile, setProfile] = useState(null);
  const [loans, setLoans] = useState([]);
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

    const newLoan = {
      id: "loan_" + Date.now(),
      amount: parseFloat(loanAmount),
      purpose: loanPurpose,
      status: "Pending",
    };

    const updated = [newLoan, ...loans];
    setLoans(updated);
    await updateDoc(userDocRef, { loans: updated });

    setModalVisible(false);
    setLoanAmount("");
    setLoanPurpose("");

    Alert.alert("Success", "Loan application submitted.");
  };

  if (loading)
    return (
      <ActivityIndicator style={{ flex: 1, backgroundColor: "#1B2430" }} size="large" color="#00BFFF" />
    );

  return (
    <View style={[styles.container, { paddingTop: 36, backgroundColor: "#1B2430" }]}>
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

      {/* Loan Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <ScrollView contentContainerStyle={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: "#1B2430" }]}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 20 }}>Apply for Loan</Text>

            <TextInput
              placeholder="Amount"
              placeholderTextColor="#ccc"
              value={loanAmount}
              onChangeText={setLoanAmount}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              placeholder="Purpose"
              placeholderTextColor="#ccc"
              value={loanPurpose}
              onChangeText={setLoanPurpose}
              style={styles.input}
            />

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

// ======================================================================
// STYLES
// ======================================================================
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { fontSize: 24, fontWeight: "800", marginBottom: 12, textAlign: "center" },

  input: {
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    color: "#fff",
    backgroundColor: "#2C3E50",
  },

  btn: {
    backgroundColor: "#25D366",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  navBtn: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 4,
  },
  navBtnText: { color: "#fff", fontWeight: "700" },

  serviceCard: { padding: 12, borderRadius: 12, marginBottom: 8 },

  payBtn: {
    backgroundColor: "#25D366",
    padding: 8,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "100%",
    borderRadius: 12,
    padding: 18,
  },
  modalBtn: {
    backgroundColor: "#25D366",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },

  // SMS Styling
  smsBubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: "80%",
  },
  sentBubble: {
    backgroundColor: "#2ECC71",
    alignSelf: "flex-end",
  },
  receivedBubble: {
    backgroundColor: "#3498DB",
    alignSelf: "flex-start",
  },
  sendBtn: {
    backgroundColor: "#25D366",
    padding: 14,
    borderRadius: 12,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});
