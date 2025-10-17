// 📁 App.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../firebase";
import {
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  getDocs,
  collection,
  addDoc,
} from "firebase/firestore";

interface IUserData {
  email: string;
  account: number;
  createdAt: Date;
}

export default function App() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<IUserData | null>(null);
  const [showManager, setShowManager] = useState(false);

  const validateEmail = (email: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const setMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
    return false;
  };

  const handleLogin = async () => {
    if (!email.trim()) return setMsg("Email is required");
    if (!validateEmail(email)) return setMsg("Enter a valid email");

    setLoading(true);
    try {
      // Try to sign in; if not exist, create account automatically
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, "defaultpass");
        const user = userCredential.user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as IUserData;
          setUser(data);
        }
        setIsLoggedIn(true);
        setMsg("✅ Logged in successfully");
      } catch {
        const userCredential = await createUserWithEmailAndPassword(auth, email, "defaultpass");
        const user = userCredential.user;
        const userData: IUserData = {
          email: user.email || email,
          account: 0,
          createdAt: new Date(),
        };
        await setDoc(doc(db, "users", user.uid), userData);
        setUser(userData);
        setIsLoggedIn(true);
        setMsg("✅ Account created successfully!");
      }
    } catch (err: any) {
      setMsg("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsLoggedIn(false);
    setUser(null);
    setShowManager(false);
  };

  if (showManager) {
    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={{ backgroundColor: "#00BFFF", padding: 14, alignItems: "center" }}
          onPress={() => setShowManager(false)}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>⬅ Back to Dashboard</Text>
        </TouchableOpacity>
        <MobileMoneyManager />
      </View>
    );
  }

  if (isLoggedIn && user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Welcome, {user.email}</Text>
        <Text style={styles.balance}>💰 Account Balance: ${user.account}</Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#FF9800" }]}
          onPress={() => setShowManager(true)}
        >
          <Ionicons name="settings-outline" size={22} color="#fff" />
          <Text style={styles.buttonText}>Manage Users</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#FF5252", marginTop: 10 }]}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Log Out</Text>
        </TouchableOpacity>

        {message ? <Text style={styles.msg}>{message}</Text> : null}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={{ alignItems: "center" }}>
        <Ionicons name="mail-outline" size={50} color="#00BFFF" />
        <Text style={styles.title}>Simple Email Login</Text>

        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator size="large" color="#00BFFF" />}
        {message ? <Text style={styles.msg}>{message}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* 💰 Admin Mobile Money Manager */
function MobileMoneyManager() {
  const [email, setEmail] = useState("");
  const [fetchedEmail, setFetchedEmail] = useState("");
  const [userAccount, setUserAccount] = useState<number>(0);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [topUpAmount, setTopUpAmount] = useState("");
  const quickTopUps = [5, 10, 20, 50, 100];

  const fetchUserData = async () => {
    if (!email) return;
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      let foundUser: any = null;
      usersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.email === email) foundUser = { id: docSnap.id, ...data };
      });
      if (foundUser) {
        setFetchedEmail(email);
        setUserAccount(foundUser.account);
        setIsFrozen(foundUser.isFrozen || false);
        const txCol = collection(db, "users", foundUser.id, "transactions");
        const txSnap = await getDocs(txCol);
        const txList: any[] = [];
        txSnap.forEach((doc) => txList.push(doc.data()));
        setTransactions(txList.reverse());
      } else {
        Alert.alert("Not Found", "No user with that email exists.");
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      Alert.alert("Error", "Failed to fetch user data.");
    }
  };

  const simulateTopUp = async (amount?: number) => {
    const topUpValue = amount ?? Number(topUpAmount);
    if (!topUpValue || !fetchedEmail) return;
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      let userDocId = "";
      usersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.email === fetchedEmail) userDocId = docSnap.id;
      });
      if (!userDocId) return Alert.alert("Error", "User not found.");

      const newBalance = userAccount + topUpValue;
      await updateDoc(doc(db, "users", userDocId), { account: newBalance });
      await addDoc(collection(db, "users", userDocId, "transactions"), {
        amount: topUpValue,
        timestamp: new Date().toLocaleString(),
        status: "Completed",
      });
      setUserAccount(newBalance);
      setTopUpAmount("");
      Alert.alert("Success", `$${topUpValue} added successfully!`);
    } catch (err) {
      console.error("Error during top-up:", err);
      Alert.alert("Error", "Top-up failed!");
    }
  };

  const freezeAccount = async () => {
    if (!fetchedEmail) return;
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      let userDocId = "";
      usersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.email === fetchedEmail) userDocId = docSnap.id;
      });
      if (!userDocId) return;

      await updateDoc(doc(db, "users", userDocId), { isFrozen: !isFrozen });
      setIsFrozen(!isFrozen);
      Alert.alert("Success", `Account ${!isFrozen ? "frozen" : "unfrozen"}!`);
    } catch (err) {
      console.error("Error updating freeze:", err);
      Alert.alert("Error", "Failed to update account status.");
    }
  };

  return (
    <ScrollView style={styles.managerContainer}>
      <Text style={styles.managerTitle}>📱 Mobile Money Manager</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter User Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
      />
      <TouchableOpacity style={styles.button} onPress={fetchUserData}>
        <Text style={styles.buttonText}>Fetch User</Text>
      </TouchableOpacity>

      {fetchedEmail ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{fetchedEmail}</Text>
          <Text>Account: ${userAccount.toFixed(2)}</Text>
          <Text>Status: {isFrozen ? "❄️ Frozen" : "✅ Active"}</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: isFrozen ? "#4CAF50" : "#FF5252" }]}
              onPress={freezeAccount}
            >
              <Text style={styles.buttonText}>
                {isFrozen ? "Unfreeze" : "Freeze"}
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Enter top-up amount"
            value={topUpAmount}
            onChangeText={setTopUpAmount}
            keyboardType="numeric"
          />

          <View style={styles.quickTopUps}>
            {quickTopUps.map((amt) => (
              <TouchableOpacity
                key={amt}
                style={styles.quickTopUpButton}
                onPress={() => simulateTopUp(amt)}
              >
                <Text style={styles.buttonText}>+${amt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.txHeader}>Recent Transactions</Text>
          {transactions.map((tx, idx) => (
            <View key={idx} style={styles.txCard}>
              <Text>Amount: ${tx.amount}</Text>
              <Text>Status: {tx.status}</Text>
              <Text>{tx.timestamp}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

/* 🎨 Styles */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: { color: "#fff", fontSize: 24, fontWeight: "bold", marginVertical: 10 },
  balance: { color: "#00BFFF", fontSize: 18, marginVertical: 10 },
  input: {
    backgroundColor: "#111",
    color: "#fff",
    borderRadius: 10,
    padding: 12,
    marginVertical: 6,
    width: "90%",
  },
  button: {
    backgroundColor: "#00BFFF",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold", marginLeft: 6 },
  msg: { color: "#ccc", marginTop: 10 },
  managerContainer: { flex: 1, backgroundColor: "#111", padding: 20 },
  managerTitle: { color: "#00BFFF", fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  card: { backgroundColor: "#1a1a1a", padding: 20, borderRadius: 12, marginTop: 20 },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  actionRow: { flexDirection: "row", justifyContent: "center", marginTop: 10 },
  actionButton: { padding: 10, borderRadius: 10, alignItems: "center", marginHorizontal: 4 },
  quickTopUps: { flexDirection: "row", justifyContent: "space-around", marginVertical: 10 },
  quickTopUpButton: { backgroundColor: "#00BFFF", padding: 10, borderRadius: 10 },
  txHeader: { color: "#00BFFF", fontSize: 18, fontWeight: "bold", marginTop: 20 },
  txCard: { backgroundColor: "#222", padding: 10, borderRadius: 10, marginTop: 6 },
});
