import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase";

// =====================================================
// CONSTANTS
// =====================================================
const USER_ID = "elijah";
const userRef = doc(db, "acc", USER_ID);

// =====================================================
// MAIN APP
// =====================================================
export default function DigitalBankingApp() {
  const [screen, setScreen] = useState<
    "home" | "loans" | "sms" | "admin"
  >("home");

  return (
    <View style={{ flex: 1 }}>
      {screen === "home" && <Home setScreen={setScreen} />}
      {screen === "loans" && <Loans setScreen={setScreen} />}
      {screen === "sms" && <SMS setScreen={setScreen} />}
      {screen === "admin" && <AdminPanel setScreen={setScreen} />}
    </View>
  );
}

// =====================================================
// HOME (CREDIT + BALANCE)
// =====================================================
function Home({ setScreen }: any) {
  const [user, setUser] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(userRef);
      if (snap.exists()) setUser(snap.data());

      const sSnap = await getDocs(collection(db, "services"));
      setServices(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    load();
  }, []);

  const useCredit = async () => {
    const amount = 50000;
    if (user.activeLoan + amount > user.loanLimit) {
      Alert.alert("Credit Limit Reached");
      return;
    }
    await updateDoc(userRef, {
      net: user.net + amount,
      activeLoan: user.activeLoan + amount,
    });
    setUser({
      ...user,
      net: user.net + amount,
      activeLoan: user.activeLoan + amount,
    });
  };

  const payService = async (s: any) => {
    if (user.net < s.balance) {
      Alert.alert("Insufficient funds");
      return;
    }
    await updateDoc(userRef, { net: user.net - s.balance });
    setUser({ ...user, net: user.net - s.balance });
  };

  if (loading)
    return <ActivityIndicator style={{ flex: 1 }} />;

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

// =====================================================
// LOANS + REPAYMENT ENGINE
// =====================================================
function Loans({ setScreen }: any) {
  const [loans, setLoans] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(userRef);
      if (snap.exists()) setLoans(snap.data().loans || []);

      const pSnap = await getDocs(collection(db, "loan_products"));
      setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    load();
  }, []);

  const applyLoan = async () => {
    if (!selected) return;
    const amt = Number(amount);
    if (amt > selected.maxAmount) return;

    const interest = amt * selected.interestRate;
    const loan = {
      id: "loan_" + Date.now(),
      product: selected.name,
      amount: amt,
      interest,
      total: amt + interest,
      balance: amt + interest,
      status: "Pending",
      created: Date.now(),
    };

    const updated = [loan, ...loans];
    setLoans(updated);
    await updateDoc(userRef, { loans: updated });
  };

  const repay = async (loan: any) => {
    const snap = await getDoc(userRef);
    const user = snap.data();

    if (user.net < 10000) {
      Alert.alert("Not enough balance");
      return;
    }

    loan.balance -= 10000;
    if (loan.balance <= 0) {
      loan.status = "Cleared";
      user.creditScore += 10;
    }

    await updateDoc(userRef, {
      loans: loans.map(l => (l.id === loan.id ? loan : l)),
      net: user.net - 10000,
      creditScore: user.creditScore,
    });

    setLoans(loans.map(l => (l.id === loan.id ? loan : l)));
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Loan Products</Text>

      {products.map(p => (
        <TouchableOpacity
          key={p.id}
          style={styles.card}
          onPress={() => setSelected(p)}
        >
          <Text style={styles.cardTitle}>{p.name}</Text>
          <Text style={styles.cardText}>
            Interest {p.interestRate * 100}%
          </Text>
        </TouchableOpacity>
      ))}

      <TextInput
        style={styles.input}
        placeholder="Loan amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <TouchableOpacity style={styles.greenBtn} onPress={applyLoan}>
        <Text style={styles.btnText}>Apply Loan</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Your Loans</Text>
      {loans.map(l => (
        <View key={l.id} style={styles.card}>
          <Text style={styles.cardTitle}>{l.product}</Text>
          <Text style={styles.cardText}>Balance: {l.balance}</Text>
          <Text>Status: {l.status}</Text>
          {l.status === "Approved" && (
            <TouchableOpacity
              style={styles.greenBtn}
              onPress={() => repay(l)}
            >
              <Text style={styles.btnText}>Pay 10,000</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <Nav setScreen={setScreen} />
    </ScrollView>
  );
}

// =====================================================
// ADMIN PANEL (APPROVAL)
// =====================================================
function AdminPanel({ setScreen }: any) {
  const [loans, setLoans] = useState<any[]>([]);

  useEffect(() => {
    getDoc(userRef).then(s =>
      setLoans(s.data()?.loans || [])
    );
  }, []);

  const approve = async (loan: any) => {
    loan.status = "Approved";
    await updateDoc(userRef, {
      loans: loans.map(l => (l.id === loan.id ? loan : l)),
    });
    setLoans(loans.map(l => (l.id === loan.id ? loan : l)));
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Admin Panel</Text>
      {loans
        .filter(l => l.status === "Pending")
        .map(l => (
          <View key={l.id} style={styles.card}>
            <Text>{l.product}</Text>
            <TouchableOpacity
              style={styles.greenBtn}
              onPress={() => approve(l)}
            >
              <Text style={styles.btnText}>Approve</Text>
            </TouchableOpacity>
          </View>
        ))}
      <Nav setScreen={setScreen} />
    </ScrollView>
  );
}

// =====================================================
// SMS
// =====================================================
function SMS({ setScreen }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>SMS Notifications</Text>
      <Text style={styles.cardText}>
        • Loan Approved  
        • Payment Deducted  
        • Credit Score Updated
      </Text>
      <Nav setScreen={setScreen} />
    </View>
  );
}

// =====================================================
// NAVIGATION
// =====================================================
function Nav({ setScreen }: any) {
  return (
    <View style={{ marginTop: 20 }}>
      <TouchableOpacity style={styles.navBtn} onPress={() => setScreen("home")}>
        <Text style={styles.btnText}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navBtn} onPress={() => setScreen("loans")}>
        <Text style={styles.btnText}>Loans</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navBtn} onPress={() => setScreen("admin")}>
        <Text style={styles.btnText}>Admin</Text>
      </TouchableOpacity>
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#1B2430" },
  header: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 10 },
  info: { color: "#ccc", marginBottom: 6 },
  card: { backgroundColor: "#2C3E50", padding: 12, borderRadius: 12, marginBottom: 8 },
  cardTitle: { color: "#fff", fontWeight: "700" },
  cardText: { color: "#ccc" },
  input: { backgroundColor: "#2C3E50", color: "#fff", padding: 12, borderRadius: 10 },
  greenBtn: { backgroundColor: "#25D366", padding: 12, borderRadius: 10, marginTop: 6 },
  purpleBtn: { backgroundColor: "#9B59B6", padding: 12, borderRadius: 10, marginBottom: 10 },
  navBtn: { backgroundColor: "#007AFF", padding: 12, borderRadius: 10, marginVertical: 4 },
  btnText: { color: "#fff", fontWeight: "700", textAlign: "center" },
});
