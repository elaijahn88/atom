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
    <View style={{ flex: 1 }}>
      {screen === "home" && <Home setScreen={setScreen} />}
      {screen === "loans" && <Loans setScreen={setScreen} />}
      {screen === "admin" && <AdminPanel setScreen={setScreen} />}
    </View>
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#9B59B6" />
      </View>
    );

  if (!user) return null;

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
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Welcome {user.Name}</Text>
      <Text style={styles.info}>Balance: UGX {user.net}</Text>
      <Text style={styles.info}>
        Credit Used: {user.activeLoan}/{user.loanLimit}
      </Text>
      <Text style={styles.info}>Credit Score: {user.creditScore}</Text>

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

    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid amount");
      return;
    }

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
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Apply Loan</Text>

      <TextInput
        style={styles.input}
        placeholder="Amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <TouchableOpacity style={styles.greenBtn} onPress={applyLoan}>
        <Text style={styles.btnText}>Apply</Text>
      </TouchableOpacity>

      {loans.map(l => (
        <View key={l.id} style={styles.card}>
          <Text style={styles.cardText}>UGX {l.balance}</Text>
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
    const updatedLoans = loans.map(l =>
      l.id === loan.id ? { ...l, status: "Approved" } : l
    );

    await updateDoc(userRef, { loans: updatedLoans });
    setLoans(updatedLoans);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Admin</Text>

      {loans
        .filter(l => l.status === "Pending")
        .map(l => (
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
          <Text style={styles.btnText}>
            {s.toUpperCase()}
          </Text>
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
  info: { color: "#ccc", marginBottom: 6 },
  card: { backgroundColor: "#2C3E50", padding: 12, borderRadius: 12, marginBottom: 8 },
  cardTitle: { color: "#fff", fontWeight: "700" },
  cardText: { color: "#ccc" },
  input: { backgroundColor: "#2C3E50", color: "#fff", padding: 12, borderRadius: 10, marginBottom: 10 },
  greenBtn: { backgroundColor: "#25D366", padding: 12, borderRadius: 10, marginTop: 6 },
  purpleBtn: { backgroundColor: "#9B59B6", padding: 12, borderRadius: 10, marginBottom: 10 },
  navBtn: { backgroundColor: "#007AFF", padding: 12, borderRadius: 10, marginVertical: 4 },
  btnText: { color: "#fff", fontWeight: "700", textAlign: "center" },
});
