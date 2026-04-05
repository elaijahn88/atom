// App.tsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, TextInput, KeyboardAvoidingView, Alert
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
  getUserByPhone,
  getChatUsers,
  addChatUser,
  addTransaction,
  listenForTransactions
} from "../lib/fire";

import { sendLocalNotification, registerForPushNotifications } from "../lib/noti";

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
  { id: 1, name: "Burger", price: 6, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800", ownerPhone: "+256700000001", ownerDeviceId: "seller-1" },
  { id: 2, name: "Pizza", price: 10, image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800", ownerPhone: "+256700000002", ownerDeviceId: "seller-2" }
];

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(20);
  const [username, setUsername] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [screen, setScreen] = useState<"home"|"profile"|"send"|"history"|"receipt"|"chat"|"chatList">("home");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  // CHAT
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [activeChatDevice, setActiveChatDevice] = useState("");
  const [chatUsers, setChatUsers] = useState<any[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);
  const deviceId = useMemo(() => Device.modelName || Device.brand + "-id", []);

  // ADMIN WALLET EDIT
  const [walletEdit, setWalletEdit] = useState("");
  const [walletPassword, setWalletPassword] = useState("");

  // LOGIN
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
    const unsubscribe = listenForMessages(deviceId, (msgs) => {
      setMessages(msgs);
      if (msgs.length) sendLocalNotification("New message received");
    });
    return unsubscribe;
  }, [user]);

  // CHAT LIST
  useEffect(() => {
    if (!user) return;
    getChatUsers(user.uid).then(setChatUsers);
  }, [user]);

  // TRANSACTIONS LISTENER
  useEffect(() => {
    if (!user) return;
    const unsubscribeTx = listenForTransactions(user.uid, (txs) => {
      setTransactions(txs);
      if (txs.length) setLastTransaction(txs[0]);
    });
    return unsubscribeTx;
  }, [user]);

  // LOGIN
  const handleLogin = async () => {
    const res = await loginOrSignup(email, password, "", deviceId);
    if (res.success) {
      await saveDeviceIdForUser(res.uid, deviceId);
      setUser({ uid: res.uid });
    } else Alert.alert("Error", res.error);
  };

  // ADD TO CART
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

    const tx = { type: "purchase", amount: total, date: new Date().toLocaleString() };
    await addTransaction(user.uid, tx);
    setCart([]);
    setScreen("receipt");
    sendLocalNotification(`Purchase successful: $${total}`);
  };

  // CHAT SEND
  const handleSendMessage = async () => {
    if (!messageText) return;
    await sendMessage(user.uid, activeChatDevice, messageText);
    setMessageText("");
    sendLocalNotification("Message sent");
  };

  // SEND MONEY
  const [receiverPhone, setReceiverPhone] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendPin, setSendPin] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const handleSendMoney = async () => {
    const amount = parseFloat(sendAmount);
    if (!amount || amount <= 0) return Alert.alert("Invalid amount");
    if (walletBalance < amount) return Alert.alert("Insufficient funds");

    const profile = await getUserProfile(user.uid);
    const isPinValid = profile?.pin === sendPin;
    const isAdmin = adminPassword === "elaijah2013";
    if (!isPinValid && !isAdmin) return Alert.alert("Access Denied");

    const receiver = await getUserByPhone(receiverPhone);
    if (!receiver) return Alert.alert("User not found");

    const senderNew = walletBalance - amount;
    const receiverNew = (receiver.wallet || 0) + amount;

    await updateWallet(user.uid, senderNew);
    await updateWallet(receiver.uid, receiverNew);

    setWalletBalance(senderNew);

    const tx = { type: "send", amount, to: receiver.phone, date: new Date().toLocaleString() };
    await addTransaction(user.uid, tx);

    setScreen("receipt");
    sendLocalNotification(`You sent $${amount} to ${receiver.phone}`);
    sendLocalNotification(`You received $${amount} from ${profile.username || profile.phone}`);

    // Add to chat list automatically
    await addChatUser(user.uid, receiver.deviceId, receiver.username || receiver.phone, receiver.phone);
    await addChatUser(receiver.uid, deviceId, profile.username || profile.phone, profile.phone);
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

  // CHAT SCREEN
  if (screen === "chat") {
    return (
      <KeyboardAvoidingView style={styles.container}>
        <TouchableOpacity onPress={() => setScreen("chatList")} style={{ marginBottom: 10 }}>
          <Text style={{ color: "#FF6347" }}>Back to Chats</Text>
        </TouchableOpacity>
        <ScrollView ref={scrollViewRef}>
          {messages.map(m => (
            <Text key={m.id} style={{ color: "#fff", marginVertical: 2 }}>{m.text}</Text>
          ))}
        </ScrollView>
        <TextInput style={styles.input} value={messageText} onChangeText={setMessageText} placeholder="Type a message" />
        <TouchableOpacity style={styles.button} onPress={handleSendMessage}>
          <Text style={styles.btnText}>Send</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  // CHAT LIST
  if (screen === "chatList") {
    return (
      <ScrollView style={styles.container}>
        <TouchableOpacity onPress={() => setScreen("home")} style={{ marginBottom: 10 }}>
          <Text style={{ color: "#FF6347" }}>Back to Food Menu</Text>
        </TouchableOpacity>
        {chatUsers.map(u => (
          <TouchableOpacity
            key={u.deviceId}
            onPress={() => { setActiveChatDevice(u.deviceId); setScreen("chat"); }}
          >
            <Text style={{ color: "#00BFFF", padding: 10 }}>
              {u.username || u.phone}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  // HISTORY
  if (screen === "history") {
    return (
      <ScrollView style={styles.container}>
        <TouchableOpacity onPress={() => setScreen("home")} style={{ marginBottom: 10 }}>
          <Text style={{ color: "#FF6347" }}>Back</Text>
        </TouchableOpacity>
        <Text style={{ color: "#fff", fontSize: 20, marginBottom: 10 }}>Transactions</Text>
        {transactions.map((tx, i) => (
          <View key={i} style={styles.card}>
            <Text style={{ color: "#fff" }}>{tx.type}</Text>
            {tx.to && <Text style={{ color: "#0ff" }}>To: {tx.to}</Text>}
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

  // PROFILE
  if (screen === "profile") {
    const saveProfile = async () => {
      await updateUserProfile(user.uid, { username, phone: userPhone });
      setScreen("home");
      sendLocalNotification("Profile updated");
    };
    return (
      <ScrollView style={styles.container}>
        <TextInput value={username} onChangeText={setUsername} style={styles.input} placeholder="Username" />
        <TextInput value={userPhone} onChangeText={setUserPhone} style={styles.input} placeholder="Phone" />
        <TouchableOpacity style={styles.button} onPress={saveProfile}>
          <Text style={styles.btnText}>Save</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // HOME + MENU + NAVIGATION + ADMIN WALLET EDIT
  return (
    <View style={styles.container}>
      <View style={{ marginBottom: 15 }}>
        <Text style={{ color: "#0f0", fontSize: 16 }}>Wallet: ${walletBalance}</Text>
        <Text style={{ color: "#fff", fontSize: 16 }}>Username: {username}</Text>

        <TextInput
          placeholder="Enter new wallet amount"
          style={[styles.input, { marginTop: 10 }]}
          value={walletEdit}
          onChangeText={setWalletEdit}
          keyboardType="numeric"
        />
        <TextInput
          placeholder="Admin password"
          style={styles.input}
          value={walletPassword}
          onChangeText={setWalletPassword}
          secureTextEntry
        />
        <TouchableOpacity
          style={styles.button}
          onPress={async () => {
            if (walletPassword !== "elaijah2013") return Alert.alert("Access Denied");
            const newAmount = parseFloat(walletEdit);
            if (isNaN(newAmount) || newAmount < 0) return Alert.alert("Invalid amount");
            await updateWallet(user.uid, newAmount);
            setWalletBalance(newAmount);
            sendLocalNotification(`Wallet updated to $${newAmount}`);
            setWalletEdit("");
            setWalletPassword("");
          }}
        >
          <Text style={styles.btnText}>Update Wallet</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {menu.map(item => (
          <View key={item.id} style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <Text style={{ color: "#fff" }}>{item.name}</Text>
            <Text style={{ color: "#0f0" }}>${item.price}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 5 }}>
              <TouchableOpacity onPress={() => addToCart(item)}>
                <Text style={{ color: "#FF6347" }}>Cart</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setActiveChatDevice(item.ownerDeviceId); setScreen("chatList"); }}>
                <Text style={{ color: "#00BFFF" }}>Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 10 }}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setScreen("send")}>
          <Text style={styles.btnText}>Send Money</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setScreen("history")}>
          <Text style={styles.btnText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setScreen("profile")}>
          <Text style={styles.btnText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 15 },
  input: { backgroundColor: "#1E1E1E", color: "#fff", padding: 10, marginTop: 10 },
  button: { backgroundColor: "#FF6347", padding: 12, marginTop: 10 },
  navBtn: { backgroundColor: "#333", padding: 12, marginTop: 5, flex: 1, marginHorizontal: 5, alignItems: "center" },
  btnText: { color: "#fff", textAlign: "center" },
  card: { backgroundColor: "#1E1E1E", padding: 10, marginBottom: 10 },
  image: { width: "100%", height: 150 },
  cart: { backgroundColor: "#FF6347", padding: 10, marginTop: 10 }
});
