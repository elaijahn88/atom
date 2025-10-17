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
import AsyncStorage from "@react-native-async-storage/async-storage";

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
   Constants
   ----------------------- */
const STORAGE_KEY = "@david_data_v1";

/* -----------------------
   App
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
  const [loadingStore, setLoadingStore] = useState(true);

  // UI state
  const [visibleSection, setVisibleSection] = useState<
    "none" | "deposit" | "viewClient" | "loan"
  >("none");

  // deposit UI
  const [topUpAmount, setTopUpAmount] = useState<string>("");
  const quickTopUps = [5, 10, 20, 50, 100];
  const mobileMoneyProviders = [
    { name: "MTN Mobile Money", key: "MTN" },
    { name: "AirtelTigo", key: "AirtelTigo" },
    { name: "Vodafone", key: "Vodafone" },
    { name: "G-Money", key: "G-Money" },
  ];

  /* -----------------------
     Load David from AsyncStorage on mount
     ----------------------- */
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (json) {
          const parsed = JSON.parse(json) as User;
          if (mounted) setDavid(parsed);
        } else {
          if (mounted) setDavid(initialDavid);
        }
      } catch (err) {
        console.error("Failed loading david from storage:", err);
        if (mounted) setDavid(initialDavid);
      } finally {
        if (mounted) setLoadingStore(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -----------------------
     Persist david whenever it changes
     ----------------------- */
  useEffect(() => {
    if (!david) return;
    const persist = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(david));
      } catch (err) {
        console.error("Failed saving david to storage:", err);
      }
    };
    persist();
  }, [david]);

  /* -----------------------
     Helpers: update state and transactions
     ----------------------- */
  const addTransaction = (tx: Transaction) => {
    setDavid((prev) =>
      prev ? { ...prev, transactions: [tx, ...prev.transactions] } : prev
    );
  };

  /* -----------------------
     Top-up (no confirmation)
     ----------------------- */
  const handleTopUp = (amountParam?: number, providerKey?: string) => {
    if (!david) return;
    if (david.isFrozen) {
      Alert.alert("Account Frozen", "Cannot top up: account is frozen.");
      return;
    }

    const parsedAmount = amountParam ?? Number(topUpAmount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Enter a valid top-up amount.");
      return;
    }

    const txId = `tx_${Date.now()}`;
    const provider = providerKey ?? "Manual";
    const pendingTx: Transaction = {
      id: txId,
      provider,
      type: "TopUp",
      amount: parsedAmount,
      timestamp: new Date().toLocaleString(),
      status: "Pending",
      note: `Top-up via ${provider}`,
    };

    addTransaction(pendingTx);
    setTopUpAmount("");

    // simulate processing then complete
    setTimeout(() => {
      setDavid((prev) => {
        if (!prev) return prev;
        const updatedTxs = prev.transactions.map((t) =>
          t.id === txId ? { ...t, status: "Completed" } : t
        );
        const newBalance = prev.account + parsedAmount;
        return { ...prev, account: newBalance, transactions: updatedTxs };
      });
      Alert.alert("Top-Up Completed", `$${parsedAmount} added to David's account.`);
    }, 1200);
  };

  /* -----------------------
     Freeze / Unfreeze (with confirmation)
     ----------------------- */
  const confirmToggleFreeze = () => {
    if (!david) return;
    Alert.alert(
      `${david.isFrozen ? "Unfreeze" : "Freeze"} Account`,
      `Are you sure you want to ${david.isFrozen ? "unfreeze" : "freeze"} David's account?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: david.isFrozen ? "Unfreeze" : "Freeze",
          style: "destructive",
          onPress: () => {
            setDavid((prev) => (prev ? { ...prev, isFrozen: !prev.isFrozen } : prev));
            Alert.alert("Success", `Account ${david.isFrozen ? "unfrozen" : "frozen"}.`);
          },
        },
      ]
    );
  };

  /* -----------------------
     Loan functions (request, approve with confirmation, repay with confirmation)
     ----------------------- */
  const requestLoan = (amount: number) => {
    if (!david) return;
    if (amount <= 0 || isNaN(amount)) {
      Alert.alert("Invalid amount", "Enter a valid loan amount.");
      return;
    }
    setDavid((prev) =>
      prev
        ? {
            ...prev,
            loan: {
              amount,
              outstanding: amount,
              status: "Pending",
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            },
          }
        : prev
    );
    Alert.alert("Loan Requested", `Loan of $${amount} is pending approval.`);
  };

  const confirmApproveLoan = () => {
    if (!david) return;
    if (david.loan.status !== "Pending") {
      Alert.alert("No pending loan", "There is no loan pending approval.");
      return;
    }
    Alert.alert(
      "Approve Loan",
      `Approve loan of $${david.loan.amount}? This will disburse funds to David's account.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: () => {
            // Approve - add to balance, create a tx
            setDavid((prev) => {
              if (!prev) return prev;
              const newBalance = prev.account + prev.loan.amount;
              const updatedLoan: Loan = { ...prev.loan, status: "Active" };
              const tx: Transaction = {
                id: `loan_disburse_${Date.now()}`,
                type: "Other",
                amount: prev.loan.amount,
                timestamp: new Date().toLocaleString(),
                status: "Completed",
                note: "Loan disbursed",
              };
              return {
                ...prev,
                account: newBalance,
                transactions: [tx, ...prev.transactions],
                loan: updatedLoan,
              };
            });
            Alert.alert("Loan Approved", "Loan has been disbursed to David's account.");
          },
        },
      ]
    );
  };

  const confirmRepayLoan = (amount: number) => {
    if (!david) return;
    if (david.loan.status !== "Active") {
      Alert.alert("No active loan", "There is no active loan to repay.");
      return;
    }
    if (amount <= 0 || isNaN(amount)) {
      Alert.alert("Invalid amount", "Enter a valid repayment amount.");
      return;
    }
    if (amount > david.account) {
      Alert.alert("Insufficient funds", "David doesn't have enough balance to repay that amount.");
      return;
    }

    Alert.alert(
      "Confirm Repayment",
      `Repay $${amount} towards the loan? This will deduct the amount from David's account.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Repay",
          onPress: () => {
            setDavid((prev) => {
              if (!prev) return prev;
              const newOutstanding = Math.max(0, prev.loan.outstanding - amount);
              const newAccount = prev.account - amount;
              const loanStatus = newOutstanding === 0 ? "Paid" : "Active";
              const tx: Transaction = {
                id: `loan_repay_${Date.now()}`,
                type: "LoanPayment",
                amount,
                timestamp: new Date().toLocaleString(),
                status: "Completed",
                note: "Loan repayment",
              };
              return {
                ...prev,
                account: newAccount,
                transactions: [tx, ...prev.transactions],
                loan: { ...prev.loan, outstanding: newOutstanding, status: loanStatus },
              };
            });
            Alert.alert("Repayment Received", `Paid $${amount} towards the loan.`);
          },
        },
      ]
    );
  };

  /* -----------------------
     Reset saved data (confirmation)
     ----------------------- */
  const confirmResetData = () => {
    Alert.alert(
      "Reset David",
      "This will restore David to the original initial state and clear saved data. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(STORAGE_KEY);
              setDavid(initialDavid);
              Alert.alert("Reset", "David's data has been reset.");
            } catch (err) {
              console.error("Error resetting storage:", err);
              Alert.alert("Error", "Failed to reset data.");
            }
          },
        },
      ]
    );
  };

  /* -----------------------
     Small components
     ----------------------- */
  const SectionButton = ({ onPress, label, icon }: { onPress: () => void; label: string; icon: string }) => (
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
        {tx.note ? <Text style={styles.txTextSmall}>{tx.note}</Text> : null}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.txAmount}>${tx.amount.toFixed(2)}</Text>
        <Text style={[styles.txStatus, { color: tx.status === "Completed" ? "#4CAF50" : "#FFD700" }]}>
          {tx.status}
        </Text>
        <Text style={styles.txTextSmall}>{tx.timestamp}</Text>
      </View>
    </View>
  );

  /* -----------------------
     Render
     ----------------------- */
  if (loadingStore || !david) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#00BFFF" />
        <Text style={{ color: "#ccc", marginTop: 12 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.appTitle}>Admin Dashboard</Text>

      {/* Dashboard buttons */}
      <View style={styles.buttonsRow}>
        <SectionButton
          onPress={() => setVisibleSection((s) => (s === "deposit" ? "none" : "deposit"))}
          label="Deposit / Top-Up"
          icon="cash-outline"
        />
        <SectionButton
          onPress={() => setVisibleSection((s) => (s === "viewClient" ? "none" : "viewClient"))}
          label="View Client / Transactions"
          icon="people-outline"
        />
        <SectionButton
          onPress={() => setVisibleSection((s) => (s === "loan" ? "none" : "loan"))}
          label="Check Loan / Account"
          icon="briefcase-outline"
        />
      </View>

      {/* Only one visible at a time */}
      {visibleSection === "deposit" && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>💰 Deposit / Top-Up (David)</Text>
          <Text style={styles.label}>Current Balance: ${david.account.toFixed(2)}</Text>

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
              <TouchableOpacity
                key={amt}
                style={styles.quickBtn}
                onPress={() => handleTopUp(amt, "Quick")}
              >
                <Text style={styles.quickBtnText}>+${amt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Providers</Text>
          <View style={styles.providersRow}>
            {mobileMoneyProviders.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={styles.providerBtn}
                onPress={() => handleTopUp(undefined, p.key)}
              >
                <Text style={styles.providerText}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 14 }]}
            onPress={() => handleTopUp(undefined)}
          >
            <Text style={styles.primaryBtnText}>Top-Up Manual</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { marginTop: 8 }]}
            onPress={confirmToggleFreeze}
          >
            <Text style={styles.secondaryBtnText}>
              {david.isFrozen ? "Unfreeze Account" : "Freeze Account"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {visibleSection === "viewClient" && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>👥 View Client / Transaction History</Text>
          <View style={styles.clientRow}>
            <View>
              <Text style={styles.clientName}>{david.name}</Text>
              <Text style={styles.clientEmail}>{david.email}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.clientBalance}>${david.account.toFixed(2)}</Text>
              <Text style={{ color: david.isFrozen ? "#FF5252" : "#4CAF50" }}>
                {david.isFrozen ? "Frozen" : "Active"}
              </Text>
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 10 }]}>Transactions</Text>
          {david.transactions.length === 0 ? (
            <Text style={styles.noTx}>No transactions yet.</Text>
          ) : (
            <FlatList
              data={david.transactions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <TxRow tx={item} />}
              style={{ marginTop: 8, width: "100%" }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          )}
        </View>
      )}

      {visibleSection === "loan" && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🏦 Check Loan / Account Management</Text>
          <Text style={styles.label}>Name: {david.name}</Text>
          <Text style={styles.label}>Balance: ${david.account.toFixed(2)}</Text>
          <Text style={styles.label}>Loan Status: {david.loan.status}</Text>
          {david.loan.status !== "NoLoan" && (
            <>
              <Text style={styles.label}>Loan Amount: ${david.loan.amount.toFixed(2)}</Text>
              <Text style={styles.label}>Outstanding: ${david.loan.outstanding.toFixed(2)}</Text>
              <Text style={styles.label}>Due: {david.loan.dueDate ?? "—"}</Text>
            </>
          )}

          {/* Loan actions */}
          <View style={{ marginTop: 12 }}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => requestLoan(100)}
            >
              <Text style={styles.primaryBtnText}>Request $100 Loan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { marginTop: 8 }]}
              onPress={confirmApproveLoan}
            >
              <Text style={styles.secondaryBtnText}>Approve Pending Loan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { marginTop: 8 }]}
              onPress={() => confirmRepayLoan(50)}
            >
              <Text style={styles.secondaryBtnText}>Repay $50</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Utility footer */}
      <View style={{ marginTop: 18, alignItems: "center" }}>
        <TouchableOpacity style={[styles.secondaryBtn, { width: 180 }]} onPress={confirmResetData}>
          <Text style={styles.secondaryBtnText}>Reset David (clear storage)</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 36 }} />
    </ScrollView>
  );
}

/* -----------------------
   Styles
   ----------------------- */
const styles = StyleSheet.create({
  container: {
    padding: 18,
    paddingTop: Platform.OS === "ios" ? 60 : 36,
    backgroundColor: "#0b0b0b",
    minHeight: "100%",
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

  sectionCard: {
    backgroundColor: "#121212",
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
  },
  sectionTitle: { fontSize: 18, color: "#fff", fontWeight: "700", marginBottom: 8 },

  label: { color: "#ccc", fontSize: 14 },

  input: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },

  quickRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  quickBtn: { backgroundColor: "#00BFFF", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  quickBtnText: { color: "#fff", fontWeight: "700" },

  providersRow: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  providerBtn: {
    width: "48%",
    backgroundColor: "#2a2a2a",
    padding: 12,
    borderRadius: 10,
    marginVertical: 4,
  },
  providerText: { color: "#fff", fontWeight: "700", textAlign: "center" },

  primaryBtn: {
    backgroundColor: "#FF9800",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },

  secondaryBtn: {
    backgroundColor: "#333",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#fff", fontWeight: "700" },

  clientRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  clientName: { color: "#fff", fontSize: 20, fontWeight: "700" },
  clientEmail: { color: "#aaa" },
  clientBalance: { color: "#00BFFF", fontWeight: "700", fontSize: 18 },

  txRow: {
    backgroundColor: "#151515",
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  txTextType: { color: "#fff", fontWeight: "700" },
  txTextSmall: { color: "#aaa", fontSize: 12 },
  txAmount: { color: "#fff", fontWeight: "700" },
  txStatus: { fontSize: 12 },

  noTx: { color: "#888", marginTop: 10, textAlign: "center" },
});
