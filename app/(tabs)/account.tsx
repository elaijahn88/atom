import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList,
  Animated,
  Image,
} from "react-native";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [showTransactions, setShowTransactions] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // New: Message label
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info"
  );
  const messageAnim = useRef(new Animated.Value(0)).current;

  const balanceAnim = useRef(new Animated.Value(0)).current;
  const txAnimValues = useRef<{ [key: string]: Animated.Value }>({}).current;
  const quickTopUps = [5, 10, 20, 50, 100];

  // show message label
  const showMessage = (text: string, type: "success" | "error" | "info" = "info") => {
    setMessage(text);
    setMessageType(type);
    Animated.timing(messageAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(messageAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setMessage(""));
    }, 5000);
  };

  // balance listener
  useEffect(() => {
    if (!fetchedEmail) return;
    const userRef = doc(db, "users", fetchedEmail);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      const data = snap.data();
      if (!data) return;
      if (data.account !== userAccount) {
        showMessage(`Balance updated: $${data.account}`, "info");
        setUserAccount(data.account);
        flashBalance();
      }
    });
    return () => unsubscribe();
  }, [fetchedEmail, userAccount]);

  const flashBalance = () => {
    balanceAnim.setValue(0);
    Animated.sequence([
      Animated.timing(balanceAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
      Animated.timing(balanceAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
    ]).start();
  };

  const fetchUserData = async () => {
    setErrorMessage("");
    if (!email) {
      setErrorMessage("Please enter an email.");
      return;
    }
    try {
      const userRef = doc(db, "users", email);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setErrorMessage("No user found with this email.");
        resetUser();
        return;
      }

      const data = userSnap.data();
      setFetchedEmail(email);
      setUserName(data.name || "");
      setUserAccount(data.account || 0);
      setUserAge(data.age || 0);

      const txCol = collection(db, "users", email, "transactions");
      const txSnap = await getDocs(txCol);
      const txList: Transaction[] = [];
      txSnap.forEach((doc) => txList.push(doc.data() as Transaction));
      setTransactions(txList.reverse());
      setShowTransactions(false);
      showMessage("User data fetched successfully!", "success");
    } catch (err) {
      console.error("Error fetching user data:", err);
      setErrorMessage("Failed to fetch user data. Check your connection.");
      resetUser();
      showMessage("Error fetching user data.", "error");
    }
  };

  const resetUser = () => {
    setFetchedEmail("");
    setUserName("");
    setUserAccount(0);
    setUserAge(0);
    setTransactions([]);
  };

  const animateTransaction = (proof: string) => {
    if (!txAnimValues[proof]) txAnimValues[proof] = new Animated.Value(0);
    Animated.timing(txAnimValues[proof], {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const simulateTopUp = async (amount?: number, method?: string) => {
    const topUpValue = amount ?? Number(topUpAmount);
    if (!topUpValue || !fetchedEmail) {
      showMessage("Enter valid amount first.", "error");
      return;
    }

    const newTx: Transaction = {
      receiver: method || "Top-Up",
      amount: topUpValue.toString(),
      timestamp: new Date().toLocaleString(),
      proof: `MM#${Math.floor(Math.random() * 10000)}`,
      status: "Pending",
    };

    setTransactions([newTx, ...transactions]);
    animateTransaction(newTx.proof!);
    setTopUpAmount("");

    setTimeout(async () => {
      try {
        newTx.status = "Completed";
        setTransactions((prev) =>
          prev.map((tx) => (tx.proof === newTx.proof ? newTx : tx))
        );

        const newBalance = userAccount + topUpValue;
        setUserAccount(newBalance);
        flashBalance();

        const userRef = doc(db, "users", fetchedEmail);
        await updateDoc(userRef, { account: newBalance });

        const txCol = collection(db, "users", fetchedEmail, "transactions");
        await addDoc(txCol, newTx);
        showMessage(`Top-Up of $${topUpValue} successful!`, "success");
      } catch (err) {
        console.error("Error completing top-up:", err);
        showMessage("Top-Up failed!", "error");
      }
    }, 2000);
  };

  const balanceColor = balanceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#fff", "#4CAF50"],
  });

  const mobileMoneyProviders = [
    { name: "MTN Mobile Money", color: "#FFD700" },
    { name: "Airtel Money", color: "#FF4500" },
    { name: "Other MM", color: "#4CAF50" },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Message label */}
      {message ? (
        <Animated.View
          style={[
            styles.messageBox,
            {
              opacity: messageAnim,
              transform: [
                {
                  translateY: messageAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
              backgroundColor:
                messageType === "error"
                  ? "#FF5252"
                  : messageType === "success"
                  ? "#4CAF50"
                  : "#2196F3",
            },
          ]}
        >
          <Text style={styles.messageText}>{message}</Text>
        </Animated.View>
      ) : null}

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
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {userName ? (
        <>
          <View style={styles.accountCard}>
            <Image
              source={{ uri: "https://i.pravatar.cc/100?u=" + fetchedEmail }}
              style={styles.avatar}
            />
            <Text style={styles.welcomeText}>👤 {userName}</Text>
            <Animated.Text style={[styles.accountText, { color: balanceColor }]}>
              💰 Balance: ${userAccount.toFixed(2)}
            </Animated.Text>
            <Text style={styles.accountText}>🎂 Age: {userAge}</Text>

            <TouchableOpacity
              style={styles.showTxBtn}
              onPress={() => setShowTransactions(!showTransactions)}
            >
              <Text style={styles.showTxBtnText}>
                {showTransactions ? "Hide Transactions" : "Show Transactions"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Top-Up Section */}
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
                <TouchableOpacity
                  key={amt}
                  style={styles.quickTopUpBtn}
                  onPress={() => simulateTopUp(amt, "Manual")}
                >
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

          {/* Transaction History */}
          {showTransactions && (
            <>
              <Text style={styles.sectionTitle}>Transaction History</Text>
              {transactions.length > 0 ? (
                <FlatList
                  data={transactions}
                  keyExtractor={(item) => item.proof || Math.random().toString()}
                  renderItem={({ item }) => {
                    const anim = txAnimValues[item.proof!] || new Animated.Value(1);
                    return (
                      <Animated.View
                        style={{
                          opacity: anim,
                          transform: [
                            {
                              translateY: anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [20, 0],
                              }),
                            },
                          ],
                          marginBottom: 12,
                          backgroundColor: "#1a1a1a",
                          borderRadius: 15,
                          padding: 14,
                        }}
                      >
                        <Text style={styles.txText}>➡️ To: {item.receiver}</Text>
                        <Text style={styles.txText}>💲 Amount: {item.amount}</Text>
                        <Text style={styles.txText}>🕒 Time: {item.timestamp}</Text>
                        <Text style={styles.txText}>📄 Proof: {item.proof}</Text>
                        <Text
                          style={[
                            styles.txText,
                            {
                              color:
                                item.status === "Completed" ? "#4CAF50" : "#FFD700",
                            },
                          ]}
                        >
                          Status: {item.status}
                        </Text>
                      </Animated.View>
                    );
                  }}
                />
              ) : (
                <Text style={styles.noTx}>No transactions yet.</Text>
              )}
            </>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 15, backgroundColor: "#121212", flexGrow: 1 },
  messageBox: {
    position: "absolute",
    top: 15,
    left: 0,
    right: 0,
    marginHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    zIndex: 99,
  },
  messageText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  sectionTitle: { fontSize: 22, fontWeight: "700", marginVertical: 12, color: "#fff" },
  input: {
    width: "100%",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  goButton: {
    backgroundColor: "#007bff",
    paddingVertical: 14,
    borderRadius: 25,
    marginBottom: 10,
    alignItems: "center",
  },
  goButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  error: { color: "#FF5252", fontSize: 14, marginBottom: 10, textAlign: "center" },
  accountCard: {
    backgroundColor: "#1f1f1f",
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    alignItems: "center",
  },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
  welcomeText: { fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 10 },
  accountText: { fontSize: 16, color: "#ccc", marginVertical: 2 },
  showTxBtn: {
    backgroundColor: "#FF9800",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 15,
  },
  showTxBtnText: { color: "#fff", fontWeight: "700" },
  card: {
    backgroundColor: "#1f1f1f",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  quickTopUps: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  quickTopUpBtn: {
    backgroundColor: "#333",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 15,
    alignItems: "center",
  },
  quickTopUpText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  mmRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  mmBtn: { flex: 1, marginHorizontal: 3, borderRadius: 15, paddingVertical: 12, alignItems: "center" },
  mmText: { color: "#fff", fontWeight: "700", fontSize: 14, textAlign: "center" },
  topUpButton: {
    backgroundColor: "#FF5722",
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 10,
    alignItems: "center",
  },
  topUpButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  txText: { color: "#fff", fontSize: 14, marginBottom: 4 },
  noTx: { color: "#aaa", textAlign: "center", marginVertical: 10, fontSize: 15 },
});
