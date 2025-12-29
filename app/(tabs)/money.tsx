import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase";

/* =====================================================
   CONSTANTS
===================================================== */
const USER_ID = "elijah";
const userRef = doc(db, "acc", USER_ID);

/* =====================================================
   DEFAULT DATA
===================================================== */
const DEFAULT_USER = {
  Name: "Elijah",
  net: 100000,
  activeLoan: 0,
  loanLimit: 300000,
  creditScore: 600,
  loans: [],
  createdAt: Date.now(),
};

const DEFAULT_SERVICES = [
  { id: "airtime", name: "Airtime", balance: 5000 },
  { id: "power", name: "Power Bill", balance: 20000 },
  { id: "water", name: "Water Bill", balance: 15000 },
];

/* =====================================================
   MAIN APP
===================================================== */
export default function DigitalBankingApp() {
  const [screen, setScreen] =
    useState<"home" | "loans" | "admin">("home");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#1B2430" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1B2430" />

      {screen === "home" && <Home setScreen={setScreen} />}
      {screen === "loans" && <Loans setScreen={setScreen} />}
      {screen === "admin" && <AdminPanel setScreen={setScreen} />}
    </SafeAreaView>
  );
}

/* =====================================================
   HOME
===================================================== */
function Home({ setScreen }: any) {
  const [user, setUser] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          await setDoc(userRef, DEFAULT_USER);
          mounted && setUser(DEFAULT_USER);
        } else {
          mounted && setUser(snap.data());
        }

        const sSnap = await getDocs(collection(db, "services"));

        if (sSnap.empty) {
          await Promise.all(
            DEFAULT_SERVICES.map(s =>
              setDoc(doc(db, "services", s.id), s)
            )
          );
          mounted && setServices(DEFAULT_SERVICES);
        } else {
          mounted &&
            setServices(
              sSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            );
        }
      } catch (e) {
        Alert.alert("Initialization failed");
      } finally {
        mounted && setLoading(false);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading)
    return (
      <View style={[styles.center, { backgroundColor: "#1B2430" }]}>
        <ActivityIndicator size="large" color="#9B59B6" />
      </View>
    );

  const useCredit = async () => {
    const amount = 50000;

    if (user.activeLoan + amount > user.loanLimit) {
      Alert.alert("Credit limit reached");
      return;
    }

    const net = user.net + amount;
    const activeLoan = user.activeLoan + amount;

    await updateDoc(userRef, { net, activeLoan });
    setUser({ ...user, net, activeLoan });
  };

  const payService = async (s: any) => {
    if (user.net < s.balance) {
      Alert.alert("Insufficient balance");
      return;
    }

    const net = user.net - s.balance;
    await updateDoc(userRef, { net });
    setUser({ ...user, net });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.header}>Welcome {user.Name}</Text>
      <Text style={styles.sub}>Digital Wallet</Text>

      <View style={styles.card}>
        <Text style={styles.cardText}>Balance</Text>
        <Text style={styles.big}>UGX {user.net}</Text>
        <Text style={styles.cardText}>
          Credit Used: {user.activeLoan}/{user.loanLimit}
        </Text>
        <Text style={styles.cardText}>
          Credit Score: {user.creditScore}
        </Text>
      </View>

      <TouchableOpacity style={styles.purpleBtn} onPress={useCredit}>
        <Text style={styles.btnText}>Use Credit (50,000)</Text>
      </TouchableOpacity>

      {services.map(s => (
        <View key={s.id} style={styles.card}>
          <Text style={styles.cardTitle}>{s.name}</Text>
          <Text style={styles.cardText}>UGX {s.balance}</Text>
          <TouchableOpacity
            style={styles.greenBtn}
            onPress={() => payService(s)}
          >
            <Text style={styles.btnText}>Pay</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Nav setScreen={setScreen} />
    </ScrollView>
  );
}

/* =====================================================
   LOANS
===================================================== */
function Loans({ setScreen }: any) {
  const [loans, setLoans] = useState<any[]>([]);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    getDoc(userRef).then(s =>
      setLoans(s.data()?.loans || [])
    );
  }, []);

  const applyLoan = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return Alert.alert("Invalid amount");

    const loan = {
      id: `loan_${Date.now()}`,
      amount: amt,
      balance: Math.round(amt * 1.2),
      status: "Pending",
    };

    const updated = [loan, ...loans];
    setLoans(updated);
    await updateDoc(userRef, { loans: updated });
    setAmount("");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.header}>Apply Loan</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter amount"
        placeholderTextColor="#aaa"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <TouchableOpacity style={styles.greenBtn} onPress={applyLoan}>
        <Text style={styles.btnText}>Apply Loan</Text>
      </TouchableOpacity>

      {loans.map(l => (
        <View key={l.id} style={styles.card}>
          <Text style={styles.cardTitle}>UGX {l.balance}</Text>
          <Text style={styles.cardText}>Status: {l.status}</Text>
        </View>
      ))}

      <Nav setScreen={setScreen} />
    </ScrollView>
  );
}

/* =====================================================
   ADMIN
===================================================== */
function AdminPanel({ setScreen }: any) {
  const [loans, setLoans] = useState<any[]>([]);

  useEffect(() => {
    getDoc(userRef).then(s =>
      setLoans(s.data()?.loans || [])
    );
  }, []);

  const approve = async (loan: any) => {
    const updated = loans.map(l =>
      l.id === loan.id ? { ...l, status: "Approved" } : l
    );
    await updateDoc(userRef, { loans: updated });
    setLoans(updated);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Admin Panel</Text>

      {loans.filter(l => l.status === "Pending").map(l => (
        <TouchableOpacity
          key={l.id}
          style={styles.greenBtn}
          onPress={() => approve(l)}
        >
          <Text style={styles.btnText}>
            Approve UGX {l.amount}
          </Text>
        </TouchableOpacity>
      ))}

      <Nav setScreen={setScreen} />
    </ScrollView>
  );
}

/* =====================================================
   NAV
===================================================== */
function Nav({ setScreen }: any) {
  return (
    <View style={{ marginTop: 20 }}>
      {["home", "loans", "admin"].map(s => (
        <TouchableOpacity
          key={s}
          style={styles.navBtn}
          onPress={() => setScreen(s)}
        >
          <Text style={styles.btnText}>{s.toUpperCase()}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#1B2430" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 10 },
  sub: { color: "#9B59B6", marginBottom: 14 },
  card: { backgroundColor: "#34495E", padding: 16, borderRadius: 14, marginBottom: 12 },
  cardTitle: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cardText: { color: "#ccc", marginTop: 4 },
  big: { color: "#25D366", fontSize: 22, fontWeight: "800", marginVertical: 4 },
  input: { backgroundColor: "#34495E", color: "#fff", padding: 14, borderRadius: 12, marginBottom: 12 },
  greenBtn: { backgroundColor: "#25D366", padding: 14, borderRadius: 12, marginTop: 8 },
  purpleBtn: { backgroundColor: "#9B59B6", padding: 14, borderRadius: 12, marginBottom: 12 },
  navBtn: { backgroundColor: "#007AFF", padding: 14, borderRadius: 12, marginVertical: 6 },
  btnText: { color: "#fff", fontWeight: "700", textAlign: "center" },
});
