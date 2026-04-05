import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Linking, Alert, TextInput, Image,
  KeyboardAvoidingView
} from "react-native";
import * as Device from "expo-device";

import {
  loginOrSignup,
  updateWallet,
  updateUserProfile,
  getUserProfile,
  getUserByDeviceId,
  saveDeviceIdForUser,
  sendMessage,
  listenForMessages,
  getUserByPhone
} from "../lib/fire";

import {
  sendLocalNotification,
  registerForPushNotifications
} from "../lib/noti";

interface FoodItem {
  id: number;
  name: string;
  price: number;
  image: string;
  ownerPhone: string;
  ownerDeviceId: string;
}

type CartItem = FoodItem & { quantity: number };

const menu: FoodItem[] = [
  {
    id: 1,
    name: "Burger",
    price: 6,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
    ownerPhone: "+256700000001",
    ownerDeviceId: "seller-1"
  },
  {
    id: 2,
    name: "Pizza",
    price: 10,
    image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800",
    ownerPhone: "+256700000002",
    ownerDeviceId: "seller-2"
  }
];

export default function App() {
  const [screen, setScreen] = useState<
    "home" | "chat" | "profile" | "send" | "history" | "receipt"
  >("home");

  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [walletBalance, setWalletBalance] = useState(20);

  // PROFILE
  const [username, setUsername] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [pin, setPin] = useState("");

  // CART
  const [cart, setCart] = useState<CartItem[]>([]);

  // SEND
  const [receiverPhone, setReceiverPhone] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendPin, setSendPin] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // TRANSACTIONS
  const [transactions, setTransactions] = useState<any[]>([]);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  // CHAT
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [activeChatDevice, setActiveChatDevice] = useState("");

  const scrollViewRef = useRef<ScrollView>(null);

  const deviceId = useMemo(
    () => Device.modelName || Device.brand + "-id",
    []
  );

  // INIT
  useEffect(() => {
    registerForPushNotifications().catch(console.log);

    const init = async () => {
      const u = await getUserByDeviceId(deviceId);
      if (u) {
        setUser(u);
        setWalletBalance(u.wallet || 20);
        setUsername(u.username || "User");
        setUserPhone(u.phone || "");
      }
    };

    init();
  }, []);

  // CHAT LISTENER
  useEffect(() => {
    if (!user) return;
    return listenForMessages(deviceId, setMessages);
  }, [user]);

  // LOGIN
  const handleLogin = async () => {
    const res = await loginOrSignup(email, password, "", deviceId);
    if (res.success) {
      await saveDeviceIdForUser(res.uid, deviceId);
      setUser({ uid: res.uid });
    } else {
      Alert.alert("Error", res.error);
    }
  };

  // CART
  const addToCart = async (item: FoodItem) => {
    if (walletBalance < item.price) return Alert.alert("No balance");

    setCart(prev => {
      const exist = prev.find(c => c.id === item.id);
      if (exist) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });

    const newBalance = walletBalance - item.price;
    setWalletBalance(newBalance);
    await updateWallet(user.uid, newBalance);
  };

  // CHECKOUT
  const handleCheckout = async () => {
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    if (walletBalance < total) return Alert.alert("Not enough");

    const newBalance = walletBalance - total;
    setWalletBalance(newBalance);
    await updateWallet(user.uid, newBalance);

    const tx = {
      type: "purchase",
      amount: total,
      date: new Date().toLocaleString()
    };

    setTransactions(prev => [tx, ...prev]);
    setLastTransaction(tx);

    setCart([]);
    setScreen("receipt");
  };

  // SEND MONEY
  const handleSendMoney = async () => {
    const amount = parseFloat(sendAmount);
    if (!amount || amount <= 0) return Alert.alert("Invalid");
    if (walletBalance < amount) return Alert.alert("Insufficient");

    const profile = await getUserProfile(user.uid);

    const isPinValid = profile?.pin === sendPin;
    const isAdmin = adminPassword === "elaijah2013";

    if (!isPinValid && !isAdmin) {
      return Alert.alert("Access Denied");
    }

    const receiver = await getUserByPhone(receiverPhone);
    if (!receiver) return Alert.alert("User not found");

    const senderNew = walletBalance - amount;
    const receiverNew = (receiver.wallet || 0) + amount;

    await updateWallet(user.uid, senderNew);
    await updateWallet(receiver.uid, receiverNew);

    setWalletBalance(senderNew);

    const tx = {
      type: "send",
      amount,
      to: receiver.phone,
      date: new Date().toLocaleString()
    };

    setTransactions(prev => [tx, ...prev]);
    setLastTransaction(tx);

    setScreen("receipt");
  };

  // CHAT SEND
  const handleSendMessage = async () => {
    if (!messageText) return;
    await sendMessage(user.uid, activeChatDevice, messageText);
    setMessageText("");
  };

  // LOGIN SCREEN
  if (!user) {
    return (
      <View style={styles.container}>
        <TextInput placeholder="Email" style={styles.input} onChangeText={setEmail} />
        <TextInput placeholder="Password" style={styles.input} secureTextEntry onChangeText={setPassword} />
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.btnText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // PROFILE
  if (screen === "profile") {
    const save = async () => {
      await updateUserProfile(user.uid, { username, phone: userPhone, pin });
      setScreen("home");
    };

    return (
      <ScrollView style={styles.container}>
        <TextInput value={username} onChangeText={setUsername} style={styles.input} placeholder="Username" />
        <TextInput value={userPhone} onChangeText={setUserPhone} style={styles.input} placeholder="Phone" />
        <TextInput value={pin} onChangeText={setPin} style={styles.input} placeholder="PIN" secureTextEntry />
        <TouchableOpacity style={styles.button} onPress={save}>
          <Text style={styles.btnText}>Save</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // SEND SCREEN
  if (screen === "send") {
    return (
      <ScrollView style={styles.container}>
        <TextInput placeholder="Phone" style={styles.input} value={receiverPhone} onChangeText={setReceiverPhone} />
        <TextInput placeholder="Amount" style={styles.input} value={sendAmount} onChangeText={setSendAmount} />
        <TextInput placeholder="PIN" style={styles.input} secureTextEntry value={sendPin} onChangeText={setSendPin} />
        <TextInput placeholder="Admin Password" style={styles.input} secureTextEntry value={adminPassword} onChangeText={setAdminPassword} />
        <TouchableOpacity style={styles.button} onPress={handleSendMoney}>
          <Text style={styles.btnText}>Send</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // HISTORY
  if (screen === "history") {
    return (
      <ScrollView style={styles.container}>
        <Text style={{ color: "#fff", fontSize: 20 }}>Transactions</Text>
        {transactions.map((tx, i) => (
          <View key={i} style={styles.card}>
            <Text style={{ color: "#fff" }}>{tx.type}</Text>
            <Text style={{ color: "#0f0" }}>${tx.amount}</Text>
            <Text style={{ color: "#aaa" }}>{tx.date}</Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  // RECEIPT
  if (screen === "receipt") {
    return (
      <View style={styles.container}>
        <Text style={{ color: "#0f0", fontSize: 20 }}>Success</Text>
        <Text style={{ color: "#fff" }}>Amount: ${lastTransaction?.amount}</Text>
        <Text style={{ color: "#fff" }}>{lastTransaction?.date}</Text>
        <TouchableOpacity style={styles.button} onPress={() => setScreen("home")}>
          <Text style={styles.btnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // CHAT
  if (screen === "chat") {
    return (
      <KeyboardAvoidingView style={styles.container}>
        <ScrollView ref={scrollViewRef}>
          {messages.map((m) => (
            <Text key={m.id} style={{ color: "#fff" }}>{m.text}</Text>
          ))}
        </ScrollView>
        <TextInput style={styles.input} value={messageText} onChangeText={setMessageText} />
        <TouchableOpacity style={styles.button} onPress={handleSendMessage}>
          <Text style={styles.btnText}>Send</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  // HOME
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.wallet}>Wallet: ${walletBalance}</Text>

      <TouchableOpacity style={styles.button} onPress={() => setScreen("send")}>
        <Text style={styles.btnText}>Send Money</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => setScreen("history")}>
        <Text style={styles.btnText}>History</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => setScreen("profile")}>
        <Text style={styles.btnText}>Profile</Text>
      </TouchableOpacity>

      {menu.map(item => (
        <View key={item.id} style={styles.card}>
          <Image source={{ uri: item.image }} style={styles.image} />
          <Text style={{ color: "#fff" }}>{item.name}</Text>

          <TouchableOpacity onPress={() => addToCart(item)}>
            <Text style={{ color: "#FF6347" }}>Add</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => {
            setActiveChatDevice(item.ownerDeviceId);
            setScreen("chat");
          }}>
            <Text style={{ color: "#00BFFF" }}>Chat</Text>
          </TouchableOpacity>
        </View>
      ))}

      {cart.length > 0 && (
        <TouchableOpacity style={styles.cart} onPress={handleCheckout}>
          <Text style={{ color: "#fff" }}>Checkout</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 15 },
  input: { backgroundColor: "#1E1E1E", color: "#fff", padding: 10, marginTop: 10 },
  button: { backgroundColor: "#FF6347", padding: 12, marginTop: 10 },
  btnText: { color: "#fff", textAlign: "center" },
  wallet: { color: "#0f0", marginBottom: 10 },
  card: { backgroundColor: "#1E1E1E", padding: 10, marginBottom: 10 },
  image: { width: "100%", height: 150 },
  cart: { backgroundColor: "#FF6347", padding: 10, marginTop: 20 }
});
