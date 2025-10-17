// App.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

/* -----------------------
   Types
   ----------------------- */
type Transaction = {
  id: string;
  provider?: string;
  type: "TopUp" | "Deposit" | "LoanPayment" | "Other";
  amount: number;
  timestamp: string;
  status: "Pending" | "Completed" | "Failed";
  note?: string;
};

type Loan = {
  amount: number;
  outstanding: number;
  status: "NoLoan" | "Active" | "Pending" | "Paid";
  dueDate?: string | null;
};

type User = {
  id: string;
  name: string;
  email: string;
  account: number;
  age?: number;
  isFrozen: boolean;
  transactions: Transaction[];
  loan: Loan;
};

/* -----------------------
   App Component
   ----------------------- */
export default function App() {
  const initialDavid: User = {
    id: "david-1",
    name: "David",
    email: "david@example.com",
    account: 500,
    age: 29,
    isFrozen: false,
    transactions: [
      {
        id: "tx_init_1",
        provider: "Initial",
        type: "Other",
        amount: 500,
        timestamp: new Date().toLocaleString(),
        status: "Completed",
        note: "Opening balance",
      },
    ],
    loan: { amount: 0, outstanding: 0, status: "NoLoan", dueDate: null },
  };

  const [david, setDavid] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [visibleSection, setVisibleSection] = useState<
    "none" | "deposit" | "viewClient" | "loan"
  >("none");
  const [topUpAmount, setTopUpAmount] = useState<string>("");

  const quickTopUps = [5, 10, 20, 50, 100];
  const mobileMoneyProviders = [
    { name: "MTN Mobile Money", key: "MTN" },
    { name: "AirtelTigo", key: "AirtelTigo" },
    { name: "Vodafone", key: "Vodafone" },
    { name: "G-Money", key: "G-Money" },
  ];

  /* -----------------------
     Initialize
     ----------------------- */
  useEffect(() => {
    const load = async () => {
      await new Promise((r) => setTimeout(r, 500));
      setDavid(initialDavid);
      setLoading(false);
    };
    load();
  }, []);

  /* -----------------------
     Helpers
     ----------------------- */
  const addTransaction = (tx: Transaction) => {
    setDavid((prev) =>
      prev ? { ...prev, transactions: [tx, ...prev.transactions] } : prev
    );
  };

  const handleTopUp = (amountParam?: number, providerKey?: string) => {
    if (!david) return;
    if (david.isFrozen) return Alert.alert("Account Frozen");

    const parsed = amountParam ?? Number(topUpAmount);
    if (!parsed || isNaN(parsed) || parsed <= 0)
      return Alert.alert("Invalid amount");

    const txId = `tx_${Date.now()}`;
    const provider = providerKey ?? "Manual";
    const tx: Transaction = {
      id: txId,
      provider,
      type: "TopUp",
      amount: parsed,
      timestamp: new Date().toLocaleString(),
      status: "Pending",
      note: `Top-up via ${provider}`,
    };

    addTransaction(tx);
    setTopUpAmount("");

    setTimeout(() => {
      setDavid((prev) => {
        if (!prev) return prev;
        const updatedTxs = prev.transactions.map((t) =>
          t.id === txId ? { ...t, status: "Completed" } : t
        );
        return { ...prev, account: prev.account + parsed, transactions: updatedTxs };
      });
      Alert.alert("Top-Up Completed", `$${parsed} added.`);
    }, 1200);
  };

  const toggleFreeze = () => {
    if (!david) return;
    const frozen = !david.isFrozen;
    setDavid({ ...david, isFrozen: frozen });
    Alert.alert("Account", frozen ? "Frozen" : "Unfrozen");
  };

  const requestLoan = (amount: number) => {
    if (!david) return;
    if (david.loan.status !== "NoLoan") return Alert.alert("Loan Exists");
    setDavid({
      ...david,
      loan: {
        amount,
        outstanding: amount,
        status: "Pending",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      },
    });
    Alert.alert("Loan Requested", `$${amount} pending approval.`);
  };

  const approveLoan = () => {
    if (!david || david.loan.status !== "Pending")
      return Alert.alert("No pending loan");

    const updatedLoan: Loan = { ...david.loan, status: "Active" };
    const tx: Transaction = {
      id: `loan_${Date.now()}`,
      type: "Other",
      amount: david.loan.amount,
      timestamp: new Date().toLocaleString(),
      status: "Completed",
      note: "Loan disbursed",
    };
    setDavid({
      ...david,
      account: david.account + david.loan.amount,
      transactions: [tx, ...david.transactions],
      loan: updatedLoan,
    });
    Alert.alert("Loan Approved", "Funds added.");
  };

  const repayLoan = (amount: number) => {
    if (!david || david.loan.status !== "Active")
      return Alert.alert("No active loan");
    if (amount > david.account) return Alert.alert("Insufficient funds");

    const outstanding = Math.max(0, david.loan.outstanding - amount);
    const status = outstanding === 0 ? "Paid" : "Active";
    const tx: Transaction = {
      id: `repay_${Date.now()}`,
      type: "LoanPayment",
      amount,
      timestamp: new Date().toLocaleString(),
      status: "Completed",
      note: "Loan repayment",
    };
    setDavid({
      ...david,
      account: david.account - amount,
      transactions: [tx, ...david.transactions],
      loan: { ...david.loan, outstanding, status },
    });
    Alert.alert("Payment Complete", `$${amount} paid.`);
  };

  const resetDavid = () => {
    Alert.alert("Reset", "Reset David's data?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => {
          setDavid(initialDavid);
        },
      },
    ]);
  };

  /* -----------------------
     Components
     ----------------------- */
  const SectionButton = ({
    label,
    icon,
    onPress,
  }: {
    label: string;
    icon: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.sectionBtn} onPress={onPress}>
      <Ionicons name={icon as any} size={18} color="#fff" />
      <Text style={styles.sectionBtnText}>{label}</Text>
    </TouchableOpacity>
  );

  const TxRow = ({ tx }: { tx: Transaction }) => (
    <View style={styles.txRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.txTextType}>
          {tx.type} {tx.provider ? `• ${tx.provider}` : ""}
        </Text>
        {tx.note && <Text style={styles.txTextSmall}>{tx.note}</Text>}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.txAmount}>${tx.amount.toFixed(2)}</Text>
        <Text
          style={{
            color: tx.status === "Completed" ? "#4CAF50" : "#FFD700",
            fontSize: 12,
          }}
        >
          {tx.status}
        </Text>
      </View>
    </View>
  );

  /* -----------------------
     Render
     ----------------------- */
  if (loading || !david) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#00BFFF" />
        <Text style={{ color: "#ccc", marginTop: 12 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.appTitle}>Admin Dashboard</Text>

        <View style={styles.buttonsRow}>
          <SectionButton
            onPress={() => setVisibleSection((s) => (s === "deposit" ? "none" : "deposit"))}
            label="Deposit"
            icon="cash-outline"
          />
          <SectionButton
            onPress={() => setVisibleSection((s) => (s === "viewClient" ? "none" : "viewClient"))}
            label="Client"
            icon="people-outline"
          />
          <SectionButton
            onPress={() => setVisibleSection((s) => (s === "loan" ? "none" : "loan"))}
            label="Loan"
            icon="briefcase-outline"
          />
        </View>

        {/* Deposit Section */}
        {visibleSection === "deposit" && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Deposit / Top-Up</Text>
            <Text style={styles.label}>Balance: ${david.account.toFixed(2)}</Text>

            <TextInput
              placeholder="Enter amount"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={topUpAmount}
              onChangeText={setTopUpAmount}
              style={styles.input}
            />

            <View style={styles.quickRow}>
              {quickTopUps.map((amt) => (
                <TouchableOpacity key={amt} style={styles.quickBtn} onPress={() => handleTopUp(amt)}>
                  <Text style={styles.quickBtnText}>+${amt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.providersRow}>
              {mobileMoneyProviders.map((p) => (
                <TouchableOpacity key={p.key} style={styles.providerBtn} onPress={() => handleTopUp(undefined, p.key)}>
                  <Text style={styles.providerText}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => handleTopUp()}>
              <Text style={styles.primaryBtnText}>Manual Top-Up</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.secondaryBtn, { marginTop: 8 }]} onPress={toggleFreeze}>
              <Text style={styles.secondaryBtnText}>
                {david.isFrozen ? "Unfreeze" : "Freeze"} Account
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* View Client */}
        {visibleSection === "viewClient" && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Client Info</Text>
            <Text style={styles.label}>Name: {david.name}</Text>
            <Text style={styles.label}>Email: {david.email}</Text>
            <Text style={styles.label}>Balance: ${david.account.toFixed(2)}</Text>

            <Text style={[styles.label, { marginTop: 10 }]}>Transactions</Text>
            {david.transactions.length === 0 ? (
              <Text style={styles.noTx}>No transactions.</Text>
            ) : (
              david.transactions.slice(0, 10).map((tx) => <TxRow key={tx.id} tx={tx} />)
            )}
          </View>
        )}

        {/* Loan Section */}
        {visibleSection === "loan" && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Loan Management</Text>
            <Text style={styles.label}>Loan Status: {david.loan.status}</Text>
            {david.loan.status !== "NoLoan" && (
              <>
                <Text style={styles.label}>Outstanding: ${david.loan.outstanding.toFixed(2)}</Text>
                <Text style={styles.label}>Due: {david.loan.dueDate ?? "—"}</Text>
              </>
            )}

            <TouchableOpacity style={styles.primaryBtn} onPress={() => requestLoan(100)}>
              <Text style={styles.primaryBtnText}>Request $100 Loan</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.secondaryBtn, { marginTop: 8 }]} onPress={approveLoan}>
              <Text style={styles.secondaryBtnText}>Approve Loan</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.secondaryBtn, { marginTop: 8 }]} onPress={() => repayLoan(50)}>
              <Text style={styles.secondaryBtnText}>Repay $50</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Reset */}
        <TouchableOpacity style={[styles.secondaryBtn, { marginTop: 20, alignSelf: "center" }]} onPress={resetDavid}>
          <Text style={styles.secondaryBtnText}>Reset David</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/* -----------------------
   Styles
   ----------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    paddingTop: Platform.OS === "ios" ? 60 : 36,
    backgroundColor: "#0b0b0b",
  },
  appTitle: { color: "#00BFFF", fontSize: 24, fontWeight: "700", marginBottom: 16, textAlign: "center" },
  buttonsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  sectionBtn: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionBtnText: { color: "#fff", marginLeft: 8, fontWeight: "700" },
  sectionCard: { backgroundColor: "#121212", marginTop: 10, padding: 14, borderRadius: 12 },
  sectionTitle: { fontSize: 18, color: "#fff", fontWeight: "700", marginBottom: 8 },
  label: { color: "#ccc", fontSize: 14 },
  input: { backgroundColor: "#1a1a1a", color: "#fff", padding: 12, borderRadius: 10, marginTop: 10 },
  quickRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  quickBtn: { backgroundColor: "#00BFFF", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  quickBtnText: { color: "#fff", fontWeight: "700" },
  providersRow: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  providerBtn: { width: "48%", backgroundColor: "#2a2a2a", padding: 12, borderRadius: 10, marginVertical: 4 },
  providerText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  primaryBtn: { backgroundColor: "#FF9800", padding: 12, borderRadius: 10, alignItems: "center", marginTop: 10 },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: { backgroundColor: "#333", padding: 12, borderRadius: 10, alignItems: "center" },
  secondaryBtnText: { color: "#fff", fontWeight: "700" },
  txRow: { backgroundColor: "#151515", padding: 10, borderRadius: 10, flexDirection: "row", alignItems: "center", marginTop: 8 },
  txTextType: { color: "#fff", fontWeight: "700" },
  txTextSmall: { color: "#aaa", fontSize: 12 },
  txAmount: { color: "#fff", fontWeight: "700" },
  noTx: { color: "#888", marginTop: 10, textAlign: "center" },
});
