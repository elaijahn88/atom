import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList,
  Alert,
} from "react-native";
import { doc, getDoc, collection, getDocs, addDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

type Transaction = {
  receiver: string;
  amount: string;
  timestamp: string;
  proof?: string;
  status?: "Pending" | "Completed";
};

export default function MobileMoneyManager() {
  const [email, setEmail] = useState("");
  const [fetchedEmail, setFetchedEmail] = useState("");
  const [userName, setUserName] = useState<string>("");
  const [userAccount, setUserAccount] = useState<number>(0);
  const [userAge, setUserAge] = useState<number>(0);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topUpAmount, setTopUpAmount] = useState("");

  const quickTopUps = [5, 10, 20, 50, 100]; 

  const fetchUserData = async () => {
    if (!email) return;
    try {
      const userRef = doc(db, "users", email);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setFetchedEmail(email);
        setUserName(data.name || "");
        setUserAccount(data.account || 0);
        setUserAge(data.age || 0);
        setIsFrozen(data.isFrozen || false);

        const txCol = collection(db, "users", email, "transactions");
        const txSnap = await getDocs(txCol);
        const txList: Transaction[] = [];
        txSnap.forEach((doc) => txList.push(doc.data() as Transaction));
        setTransactions(txList.reverse());
      } else resetUser();
    } catch (err) {
      console.error("Error fetching user data:", err);
      Alert.alert("Error", "Failed to fetch user data.");
    }
  };

  const resetUser = () => {
    setFetchedEmail("");
    setUserName("");
    setUserAccount(0);
    setUserAge(0);
    setTransactions([]);
    setIsFrozen(false);
  };

  const simulateTopUp = async (amount?: number, method?: string) => {
    const topUpValue = amount ?? Number(topUpAmount);
    if (!topUpValue || !fetchedEmail) return;

    const newTx: Transaction = {
      receiver: method || "Top-Up",
      amount: topUpValue.toString(),
      timestamp: new Date().toLocaleString(),
      proof: `MM#${Math.floor(Math.random() * 10000)}`,
      status: "Pending",
    };

    setTransactions([newTx, ...transactions]);
    setTopUpAmount("");

    // simulate delay for pending → completed
    setTimeout(async () => {
      try {
        newTx.status = "Completed";
        setTransactions((prev) =>
          prev.map((tx) => (tx.proof === newTx.proof ? newTx : tx))
        );

        const newBalance = userAccount + topUpValue;
        setUserAccount(newBalance);

        const userRef = doc(db, "users", fetchedEmail);
        await updateDoc(userRef, { account: newBalance });

        const txCol = collection(db, "users", fetchedEmail, "transactions");
        await addDoc(txCol, newTx);

        Alert.alert("Top-Up Success", `$${topUpValue} via ${method} completed!`);
      } catch (err) {
        console.error("Error completing top-up:", err);
        Alert.alert("Error", "Top-Up failed!");
      }
    }, 3000); // 3 seconds for simulation
  };

  const freezeAccount = async () => {
    if (!fetchedEmail) return;
    try {
      const userRef = doc(db, "users", fetchedEmail);
      await updateDoc(userRef, { isFrozen: !isFrozen });
      setIsFrozen(!isFrozen);
      Alert.alert("Success", `Account ${!isFrozen ? "frozen" : "unfrozen"}!`);
    } catch (err) {
      console.error("Error updating freeze:", err);
      Alert.alert("Error", "Failed to update account status.");
    }
  };

  const updateBalanceManually = async () => {
    Alert.prompt(
      "Update Balance",
      "Enter new balance amount:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: async (value) => {
            if (!value || isNaN(Number(value))) return;
            const newBalance = Number(value);
            setUserAccount(newBalance);
            const userRef = doc(db, "users", fetchedEmail);
            await updateDoc(userRef, { account: newBalance });
            Alert.alert("Success", "Balance updated!");
          },
        },
      ],
      "plain-text",
      userAccount.toString()
    );
  };

  const mobileMoneyProviders = [
    { name: "MTN Mobile Money", color: "#FFD700" },
    { name: "Airtel Money", color: "#FF4500" },
    { name: "Other MM", color: "#4CAF50" },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Enter User Email</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TouchableOpacity style={styles.goButton} onPress={fetchUserData}>
        <Text style={styles.goButtonText}>Fetch User</Text>
      </TouchableOpacity>

      {userName ? (
        <>
          <View style={styles.accountCard}>
            <Text style={styles.welcomeText}>👤 {userName}</Text>
            <Text style={styles.accountText}>💰 Balance: ${userAccount.toFixed(2)}</Text>
            <Text style={styles.accountText}>🎂 Age: {userAge}</Text>
            <Text style={[styles.accountText, { color: isFrozen ? "#FF5252" : "#4CAF50" }]}>
              {isFrozen ? "❌ Frozen" : "✅ Active"}
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.actionButton} onPress={updateBalanceManually}>
                <Text style={styles.actionButtonText}>Update Balance</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: isFrozen ? "#4CAF50" : "#FF5252" }]}
                onPress={freezeAccount}
              >
                <Text style={styles.actionButtonText}>{isFrozen ? "Unfreeze" : "Freeze"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Top-Up Account</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              placeholder="Enter Amount"
              placeholderTextColor="#999"
              value={topUpAmount}
              onChangeText={setTopUpAmount}
              keyboardType="numeric"
            />
            <View style={styles.quickTopUps}>
              {quickTopUps.map((amt) => (
                <TouchableOpacity key={amt} style={styles.quickTopUpBtn} onPress={() => simulateTopUp(amt, "Manual")}>
                  <Text style={styles.quickTopUpText}>${amt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Mobile Money</Text>
            <View style={styles.mmRow}>
              {mobileMoneyProviders.map((provider) => (
                <TouchableOpacity
                  key={provider.name}
                  style={[styles.mmBtn, { backgroundColor: provider.color }]}
                  onPress={() => simulateTopUp(Number(topUpAmount), provider.name)}
                >
                  <Text style={styles.mmText}>{provider.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.topUpButton} onPress={() => simulateTopUp()}>
              <Text style={styles.topUpButtonText}>Top-Up Now</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Transaction History</Text>
          {transactions.length > 0 ? (
            <FlatList
              data={transactions}
              keyExtractor={(_, idx) => idx.toString()}
              renderItem={({ item }) => (
                <View style={styles.txCard}>
                  <Text style={styles.txText}>➡️ To: {item.receiver}</Text>
                  <Text style={styles.txText}>💲 Amount: {item.amount}</Text>
                  <Text style={styles.txText}>🕒 Time: {item.timestamp}</Text>
                  <Text style={styles.txText}>📄 Proof: {item.proof}</Text>
                  <Text style={[styles.txText, { color: item.status === "Completed" ? "#4CAF50" : "#FFD700" }]}>
                    Status: {item.status}
                  </Text>
                </View>
              )}
            />
          ) : (
            <Text style={styles.noTx}>No transactions yet.</Text>
          )}
        </>
      ) : (
        fetchedEmail ? <Text style={styles.noTx}>No user found with this email.</Text> : null
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 15, backgroundColor: "#121212", flexGrow: 1 },
  sectionTitle: { fontSize: 22, fontWeight: "700", marginVertical: 12, color: "#fff" },
  input: { width: "100%", backgroundColor: "#1a1a1a", color: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16 },
  goButton: { backgroundColor: "#007bff", paddingVertical: 14, borderRadius: 25, marginBottom: 20, alignItems: "center" },
  goButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  accountCard: { backgroundColor: "#1f1f1f", borderRadius: 20, padding: 25, marginBottom: 20 },
  welcomeText: { fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 10 },
  accountText: { fontSize: 16, color: "#ccc", marginVertical: 2 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 15 },
  actionButton: { flex: 1, backgroundColor: "#FF9800", paddingVertical: 12, borderRadius: 20, marginHorizontal: 5, alignItems: "center" },
  actionButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  card: { backgroundColor: "#1f1f1f", borderRadius: 20, padding: 20, marginBottom: 20 },
  quickTopUps: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  quickTopUpBtn: { backgroundColor: "#333", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 15, alignItems: "center" },
  quickTopUpText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  mmRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  mmBtn: { flex: 1, marginHorizontal: 3, borderRadius: 15, paddingVertical: 12, alignItems: "center" },
  mmText: { color: "#fff", fontWeight: "700", fontSize: 14, textAlign: "center" },

  topUpButton: { backgroundColor: "#FF5722", paddingVertical: 14, borderRadius: 25, marginTop: 10, alignItems: "center" },
  topUpButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  txCard: { backgroundColor: "#1a1a1a", borderRadius: 15, padding: 14, marginBottom: 12 },
  txText: { color: "#fff", fontSize: 14, marginBottom: 4 },
  noTx: { color: "#aaa", textAlign: "center", marginVertical: 10, fontSize: 15 },
});
