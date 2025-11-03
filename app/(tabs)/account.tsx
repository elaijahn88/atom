import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { db } from "../../firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export default function AccountAndMoneyManager() {
  const [name, setName] = useState("");
  const [view, setView] = useState("login"); // "login" | "account"
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [label, setLabel] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [showTransactions, setShowTransactions] = useState(false);

  const quickTopUps = [5000, 10000, 20000, 50000, 100000];
  const mobileMoneyProviders = [
    { name: "T-Money", color: "#FFD700" },
    { name: "X-Money", color: "#FF4500" },
    { name: "E-Money", color: "#4CAF50" },
  ];

  const handleLoginOrRegister = async () => {
    if (!name.trim()) {
      setLabel("Enter your name.");
      return;
    }
    setLoading(true);
    const userDocRef = doc(db, "acc", name.trim().toLowerCase());

    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data();
        if (!("net" in data)) data.net = 0;
        if (!("transactions" in data)) data.transactions = [];
        await updateDoc(userDocRef, { net: data.net, transactions: data.transactions });
        setProfile(data);
        setTransactions(data.transactions);
        setLabel(`Welcome back, ${data.Name}!`);
      } else {
        const defaultData = {
          Name: name.trim(),
          age: 26,
          bod: "",
          father: "",
          mother: "",
          idno: 0,
          nin: "",
          nok: "",
          phone: 0,
          net: 0,
          transactions: [],
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, defaultData);
        setProfile(defaultData);
        setTransactions([]);
        setLabel(`Account created for ${defaultData.Name}`);
      }
      setView("account");
    } catch (err) {
      console.error(err);
      setLabel("Login/Register failed.");
    } finally {
      setLoading(false);
    }
  };

  const updateFirestore = async (updates: any) => {
    if (!profile?.Name) return;
    const docRef = doc(db, "acc", profile.Name.toLowerCase());
    await updateDoc(docRef, updates);
  };

  const simulateTopUp = async (amount: number, method?: string) => {
    if (method === profile?.Name) {
      setLabel("You cannot top-up yourself.");
      return;
    }
    if (!amount || isNaN(amount)) {
      setLabel("Enter valid amount.");
      return;
    }
    const newTx = {
      receiver: method || "Top-Up",
      amount,
      timestamp: new Date().toLocaleString(),
      proof: `MM#${Math.floor(Math.random() * 10000)}`,
      status: "Completed",
    };
    const newNet = (profile?.net || 0) + amount;
    const updatedTxs = [newTx, ...transactions];
    setProfile({ ...profile, net: newNet });
    setTransactions(updatedTxs);
    setTopUpAmount("");
    setLabel(`Top-up of Shs ${amount} via ${method || "manual"} successful!`);
    await updateFirestore({ net: newNet, transactions: updatedTxs });
  };

  const sendMoney = async () => {
    const amount = Number(transferAmount);
    if (!recipientName.trim()) {
      setLabel("Enter recipient name.");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setLabel("Enter valid amount.");
      return;
    }
    if ((profile?.net || 0) < amount) {
      setLabel("Insufficient funds to send.");
      return;
    }

    const recipientRef = doc(db, "acc", recipientName.trim().toLowerCase());
    const snap = await getDoc(recipientRef);
    if (!snap.exists()) {
      setLabel("Recipient does not exist.");
      return;
    }
    const recipientData = snap.data();

    const newSenderTx = {
      receiver: recipientName.trim(),
      amount,
      timestamp: new Date().toLocaleString(),
      proof: `TX#${Math.floor(Math.random() * 10000)}`,
      status: "Completed",
    };
    const newSenderNet = profile.net - amount;
    const updatedSenderTxs = [newSenderTx, ...transactions];
    setProfile({ ...profile, net: newSenderNet });
    setTransactions(updatedSenderTxs);
    await updateFirestore({ net: newSenderNet, transactions: updatedSenderTxs });

    const newRecipientTx = {
      receiver: profile.Name,
      amount,
      timestamp: new Date().toLocaleString(),
      proof: `TX#${Math.floor(Math.random() * 10000)}`,
      status: "Received",
    };
    const recipientNet = (recipientData?.net || 0) + amount;
    const recipientTxs = [newRecipientTx, ...(recipientData.transactions || [])];
    await updateDoc(recipientRef, { net: recipientNet, transactions: recipientTxs });

    setLabel(`Sent Shs ${amount} to ${recipientName.trim()}`);
    setRecipientName("");
    setTransferAmount("");
  };

  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );

  if (view === "login")
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Account Login / Register</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          placeholderTextColor="#888"
          value={name}
          onChangeText={setName}
        />
        <TouchableOpacity style={styles.button} onPress={handleLoginOrRegister}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{profile?.Name}</Text>
      <Text style={styles.balanceText}>Net: Shs {profile?.net?.toFixed(2)}</Text>

      <Text style={styles.sectionTitle}>Top-Up Account</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter amount"
        placeholderTextColor="#999"
        keyboardType="numeric"
        value={topUpAmount}
        onChangeText={setTopUpAmount}
      />
      <View style={styles.quickTopUps}>
        {quickTopUps.map((amt) => (
          <TouchableOpacity
            key={amt}
            style={styles.quickTopUpBtn}
            onPress={() => simulateTopUp(amt, "Manual")}
          >
            <Text style={styles.quickTopUpText}>Shs {amt}</Text>
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

      <Text style={styles.sectionTitle}>Send Money</Text>
      <TextInput
        style={styles.input}
        placeholder="Recipient Name"
        placeholderTextColor="#999"
        value={recipientName}
        onChangeText={setRecipientName}
      />
      <TextInput
        style={styles.input}
        placeholder="Amount"
        placeholderTextColor="#999"
        keyboardType="numeric"
        value={transferAmount}
        onChangeText={setTransferAmount}
      />
      <TouchableOpacity style={styles.topUpButton} onPress={sendMoney}>
        <Text style={styles.topUpButtonText}>Send Money</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.topUpButton, { backgroundColor: '#007bff' }]}
        onPress={() => setShowTransactions(!showTransactions)}
      >
        <Text style={styles.topUpButtonText}>{showTransactions ? 'Hide Transactions' : 'Show Transactions'}</Text>
      </TouchableOpacity>

      {showTransactions && (
        transactions.length > 0 ? (
          <FlatList
            data={transactions}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
              <View style={styles.txCard}>
                <Text style={styles.txText}>To: {item.receiver}</Text>
                <Text style={styles.txText}>Amount: Shs {item.amount}</Text>
                <Text style={styles.txText}>{item.timestamp}</Text>
                <Text style={styles.txText}>Proof: {item.proof}</Text>
                <Text
                  style={[
                    styles.txText,
                    { color: item.status === "Completed" ? "#4CAF50" : "#FFD700" },
                  ]}
                >
                  Status: {item.status}
                </Text>
              </View>
            )}
          />
        ) : (
          <Text style={styles.noTx}>No transactions yet.</Text>
        )
      )}

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => setView("login")}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {label ? <Text style={styles.label}>{label}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 15, backgroundColor: "#121212" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 12 },
  balanceText: { fontSize: 20, color: "#fff", marginVertical: 5 },
  sectionTitle: { fontSize: 20, color: "#fff", fontWeight: "600", marginVertical: 10 },
  input: {
    width: "100%",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  button: { backgroundColor: "#007bff", padding: 14, borderRadius: 20, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  label: { color: "#ccc", textAlign: "center", marginTop: 10 },
  quickTopUps: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  quickTopUpBtn: { backgroundColor: "#333", padding: 10, borderRadius: 10 },
  quickTopUpText: { color: "#fff", fontWeight: "600" },
  mmRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  mmBtn: { flex: 1, marginHorizontal: 3, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  mmText: { color: "#fff", fontWeight: "700" },
  topUpButton: { backgroundColor: "#FF5722", padding: 14, borderRadius: 20, alignItems: "center", marginBottom: 10 },
  topUpButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  txCard: { backgroundColor: "#1a1a1a", borderRadius: 10, padding: 10, marginBottom: 10 },
  txText: { color: "#fff", fontSize: 14, marginBottom: 2 },
  noTx: { color: "#888", fontStyle: "italic", textAlign: "center", marginVertical: 10 },
  logoutButton: { backgroundColor: "#555", padding: 12, borderRadius: 20, alignItems: "center", marginTop: 20 },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
