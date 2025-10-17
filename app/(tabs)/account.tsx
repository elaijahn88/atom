import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, ScrollView } from "react-native";
import { auth, db, database, ref, push, onValue } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [view, setView] = useState<"login" | "signup" | "account">("login");

  // ✅ Sign up a new user and store their profile in Firestore
  const handleSignup = async () => {
    setMessage("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      setUser(newUser);

      // Create Firestore user doc
      await setDoc(doc(db, "users", newUser.uid), {
        email,
        balance: 1000,
        createdAt: Date.now(),
      });

      setBalance(1000);
      setView("account");
      setMessage("✅ Account created successfully!");
    } catch (error: any) {
      setMessage("⚠️ " + error.message);
    }
  };

  // ✅ Login existing user and load profile + transactions
  const handleLogin = async () => {
    setMessage("");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const currentUser = userCredential.user;
      setUser(currentUser);

      // Load user data
      const docRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(docRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setBalance(data.balance || 0);
      } else {
        setMessage("⚠️ No user data found in Firestore.");
      }

      // Listen for transactions in Realtime DB
      const txRef = ref(database, `transactions/${currentUser.uid}`);
      onValue(txRef, (snapshot) => {
        const data = snapshot.val() || {};
        const list = Object.values(data).reverse();
        setTransactions(list);
      });

      setView("account");
      setMessage("✅ Login successful!");
    } catch (error: any) {
      setMessage("⚠️ " + error.message);
    }
  };

  // ✅ Add fake transaction
  const addTransaction = async (type: string, amount: number) => {
    if (!user) return;
    const newBalance = balance + (type === "Credit" ? amount : -amount);
    setBalance(newBalance);

    // Update Firestore balance
    await setDoc(doc(db, "users", user.uid), { email: user.email, balance: newBalance }, { merge: true });

    // Push to Realtime Database
    const txRef = ref(database, `transactions/${user.uid}`);
    push(txRef, {
      type,
      amount,
      timestamp: Date.now(),
    });
  };

  // ✅ Logout
  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setBalance(0);
    setTransactions([]);
    setView("login");
    setMessage("👋 Logged out successfully.");
  };

  // ===================
  // 🔒 LOGIN / SIGNUP
  // ===================
  if (view === "login" || view === "signup") {
    return (
      <View style={styles.container}>
        <Image source={{ uri: "https://i.imgur.com/3G4sQO5.png" }} style={styles.logo} />
        <Text style={styles.title}>Firebase Auth + Wallet</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={view === "login" ? handleLogin : handleSignup}
        >
          <Text style={styles.btnText}>{view === "login" ? "Login" : "Create Account"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => setView(view === "login" ? "signup" : "login")}
        >
          <Text style={styles.linkText}>
            {view === "login"
              ? "Don't have an account? Sign up"
              : "Already have an account? Login"}
          </Text>
        </TouchableOpacity>

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    );
  }

  // ===================
  // 👤 ACCOUNT SCREEN
  // ===================
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image
        source={{ uri: user?.photoURL || "https://i.imgur.com/3G4sQO5.png" }}
        style={styles.profilePic}
      />
      <Text style={styles.userName}>{user?.email}</Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Current Balance:</Text>
        <Text style={styles.infoValue}>${balance.toFixed(2)}</Text>
      </View>

      <View style={styles.quickRow}>
        <TouchableOpacity style={styles.quickBtn} onPress={() => addTransaction("Credit", 50)}>
          <Text style={styles.btnText}>+ Add $50</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn} onPress={() => addTransaction("Debit", 30)}>
          <Text style={styles.btnText}>− Spend $30</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Recent Transactions:</Text>
        {transactions.length === 0 ? (
          <Text style={styles.infoSmall}>No transactions yet.</Text>
        ) : (
          transactions.map((tx, i) => (
            <View key={i} style={styles.txRow}>
              <Text style={styles.txText}>{tx.type}</Text>
              <Text style={styles.txAmount}>
                {tx.type === "Credit" ? "+" : "−"}${tx.amount}
              </Text>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.btnText}>Logout</Text>
      </TouchableOpacity>

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </ScrollView>
  );
}

// ===================
// 💅 STYLES
// ===================
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  logo: { width: 80, height: 80, marginBottom: 20, borderRadius: 20 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 20 },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    width: "100%",
    padding: 12,
    borderRadius: 10,
    marginVertical: 6,
  },
  primaryBtn: {
    backgroundColor: "#00BFFF",
    width: "100%",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  quickRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 10 },
  quickBtn: {
    backgroundColor: "#00BFFF",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  secondaryBtn: { marginTop: 10 },
  logoutBtn: {
    backgroundColor: "#FF9800",
    width: "100%",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  linkText: { color: "#00BFFF", marginTop: 10 },
  message: { color: "#ccc", marginTop: 20, textAlign: "center" },
  profilePic: { width: 90, height: 90, borderRadius: 45, marginBottom: 10 },
  userName: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 20 },
  infoCard: {
    backgroundColor: "#1a1a1a",
    width: "100%",
    padding: 14,
    borderRadius: 10,
    marginVertical: 6,
  },
  infoLabel: { color: "#aaa", fontSize: 14, marginBottom: 4 },
  infoValue: { color: "#fff", fontSize: 18, fontWeight: "700" },
  infoSmall: { color: "#ccc", fontSize: 13, marginVertical: 2 },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#151515",
    padding: 10,
    borderRadius: 8,
    marginVertical: 4,
  },
  txText: { color: "#fff", fontWeight: "700" },
  txAmount: { color: "#00BFFF", fontWeight: "700" },
});
