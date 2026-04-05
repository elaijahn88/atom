import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Alert, Image, Animated, Linking
} from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import {
  loginOrSignup,
  updateWallet,
  updateUserProfile,
  getUserByDeviceId,
  saveDeviceIdForUser,
  addTransaction,
  getUserProfile
} from "../lib/fire";

import { sendLocalNotification, registerForPushNotifications } from "../lib/noti";

// ================= TYPES =================
type ScreenType =
  | "login"
  | "foodMenu"
  | "moneySystem"
  | "send"
  | "withdraw"
  | "deposit"
  | "history"
  | "agentDashboard";

interface FoodItem {
  id: number;
  name: string;
  price: number;
  image: string;
  category: "meal" | "chai";
  ownerName: string;
  ownerPhone: string;
  ownerLocation: string;
}

type CartItem = FoodItem & { quantity: number };

// ================= MENU =================
const menu: FoodItem[] = [
  { id: 1, name: "Classic Burger", price: 600000, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800", category: "meal", ownerName: "Restaurant One", ownerPhone: "+256700000001", ownerLocation: "Kampala" },
  { id: 2, name: "Pepperoni Pizza", price: 1000000, image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800", category: "meal", ownerName: "Pizza Hub", ownerPhone: "+256700000002", ownerLocation: "Ntinda" },
  { id: 3, name: "Grilled Chicken", price: 900000, image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800", category: "meal", ownerName: "Chicken Spot", ownerPhone: "+256700000003", ownerLocation: "Kawempe" },
  { id: 4, name: "African Milk Tea", price: 200000, image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800", category: "chai", ownerName: "Tea Corner", ownerPhone: "+256700000004", ownerLocation: "Mukono" },
];

// ================= APP =================
export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenType>("login");

  // USER LOGIN
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [user, setUser] = useState<any>(null);

  // USER DATA
  const [walletBalance, setWalletBalance] = useState(2000000);
  const [username, setUsername] = useState("");
  const [userPhone, setUserPhone] = useState("");

  // CART
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartScale = useRef(new Animated.Value(1)).current;

  // DEVICE
  const deviceId = useMemo(() => Device.modelName || "device-id", []);

  // MONEY SYSTEM
  const [receiverPhone, setReceiverPhone] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [pin, setPin] = useState("");
  const [savedPin] = useState("1234");
  const [transactions, setTransactions] = useState<any[]>([]);

  const isSuperAgent = user?.isSuperAgent === true;

  useEffect(() => {
    const init = async () => {
      const existingUser = await getUserByDeviceId(deviceId);
      if (existingUser) {
        setUser(existingUser);
        setWalletBalance(existingUser.wallet || 2000000);
        setUsername(existingUser.username || "User");
        setUserPhone(existingUser.phone || "");
        sendLocalNotification("Welcome back!", `Hello ${existingUser.username || "User"}`);
        setActiveScreen("foodMenu");
      }
      await registerForPushNotifications();
    };
    init();
  }, []);

  // ================= LOGIN =================
  const handleLogin = async () => {
    if (!email || !password) return Alert.alert("Error", "Email and password are required");
    const res = await loginOrSignup(email, password, phone, deviceId);
    if (res.success) {
      await saveDeviceIdForUser(res.uid, deviceId);
      const userData = { uid: res.uid, phone: res.phone || "", username: res.username || "User", wallet: res.wallet || 2000000 };
      setUser(userData);
      setWalletBalance(userData.wallet);
      setUsername(userData.username);
      setUserPhone(userData.phone);
      sendLocalNotification("Welcome!", `Hello ${userData.username}`);
      setActiveScreen("foodMenu");
    } else {
      Alert.alert("Error", res.error || "Login failed");
    }
  };

  // ================= FOOD MENU =================
  const addToCart = async (item: FoodItem) => {
    if (walletBalance < item.price) return Alert.alert("Error", "Insufficient balance");
    Animated.sequence([
      Animated.timing(cartScale, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.timing(cartScale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setCart(prev => {
      const exist = prev.find(c => c.id === item.id);
      if (exist) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
    const newBalance = walletBalance - item.price;
    setWalletBalance(newBalance);
    if (user?.uid) await updateWallet(user.uid, newBalance);
  };

  const handleCheckout = async () => {
    if (!user?.uid) return Alert.alert("Error", "You must be logged in to checkout");
    if (cart.length === 0) return Alert.alert("Cart empty", "Add items first");
    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (walletBalance < totalAmount) return Alert.alert("Insufficient balance");
    const newBalance = walletBalance - totalAmount;
    setWalletBalance(newBalance);
    await updateWallet(user.uid, newBalance);
    sendLocalNotification("Checkout Complete", `You have paid UGX ${totalAmount} successfully!`);
    setCart([]);
  };

  const callOwner = (number: string) => Linking.openURL(`tel:${number}`);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // ================= MONEY SYSTEM =================
  const findUser = async (phone: string) => getUserByDeviceId(phone); // placeholder

  const handleSend = async () => {
    const amount = parseFloat(sendAmount);
    if (!receiverPhone || isNaN(amount)) return Alert.alert("Invalid");
    if (pin !== savedPin) return Alert.alert("Wrong PIN");
    if (amount > walletBalance) return Alert.alert("No balance");

    const receiver = await findUser(receiverPhone);
    if (!receiver) return Alert.alert("User not found");

    await updateWallet(user.uid, walletBalance - amount);
    setWalletBalance(walletBalance - amount);
    await updateWallet(receiver.uid, (receiver.wallet || 0) + amount);

    const tx = { type: "send", amount, to: receiverPhone, date: new Date().toISOString() };
    await addTransaction(user.uid, tx);
    setTransactions(prev => [tx, ...prev]);

    Alert.alert("Success", `Sent UGX ${amount} to ${receiverPhone}`);
    setReceiverPhone(""); setSendAmount(""); setPin("");
  };

  // ================= SCREENS =================
  if (activeScreen === "login") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Login / Signup</Text>
        <TextInput placeholder="Email" style={styles.input} value={email} onChangeText={setEmail} />
        <TextInput placeholder="Password" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
        <TextInput placeholder="Phone" style={styles.input} value={phone} onChangeText={setPhone} />
        <TouchableOpacity style={styles.button} onPress={handleLogin}><Text style={styles.btnText}>Login / Signup</Text></TouchableOpacity>
      </View>
    );
  }

  if (activeScreen === "foodMenu") {
    const walletColor = walletBalance < 500000 ? "#ff4d4d" : walletBalance > 2000000 ? "#4d94ff" : "#00cc44";
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Hello, {username}</Text>
        <Text style={[styles.wallet, { color: walletColor }]}>Wallet: UGX {walletBalance}</Text>
        <TouchableOpacity style={styles.button} onPress={() => setActiveScreen("moneySystem")}><Text style={styles.btnText}>Go to Money System</Text></TouchableOpacity>

        {menu.map(item => (
          <View key={item.id} style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.price}>UGX {item.price}</Text>
            <View style={styles.cardButtons}>
              <TouchableOpacity onPress={() => addToCart(item)}><Text style={styles.add}>Add</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => callOwner(item.ownerPhone)}><Text style={styles.call}>Call</Text></TouchableOpacity>
            </View>
          </View>
        ))}

        {cart.length > 0 && (
          <View style={styles.cart}>
            <Text style={{ color: "#fff" }}>🛒 {cart.length} | UGX {total}</Text>
            <TouchableOpacity onPress={handleCheckout}><Text style={{ color: "#fff", marginTop: 5, fontWeight: "bold" }}>Checkout</Text></TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  }

  if (activeScreen === "moneySystem") {
    const walletColor = walletBalance < 500000 ? "#ff4d4d" : walletBalance > 2000000 ? "#4d94ff" : "#00cc44";
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Money System</Text>
        <Text style={[styles.wallet, { color: walletColor }]}>Wallet: UGX {walletBalance}</Text>

        <Text style={styles.sectionTitle}>Send Money</Text>
        <TextInput style={styles.input} placeholder="Receiver Phone" value={receiverPhone} onChangeText={setReceiverPhone} />
        <TextInput style={styles.input} placeholder="Amount" value={sendAmount} onChangeText={setSendAmount} />
        <TextInput style={styles.input} placeholder="PIN" secureTextEntry value={pin} onChangeText={setPin} />
        <TouchableOpacity style={styles.button} onPress={handleSend}><Text style={styles.btnText}>Send</Text></TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => setActiveScreen("foodMenu")}><Text style={styles.btnText}>Back to Menu</Text></TouchableOpacity>
      </ScrollView>
    );
  }

  return <View><Text>Loading...</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 15 },
  input: { backgroundColor: "#1E1E1E", color: "#fff", padding: 10, marginBottom: 10 },
  button: { backgroundColor: "#FF6347", padding: 12, borderRadius: 8, marginBottom: 10 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  title: { color: "#fff", fontSize: 24, marginBottom: 10, fontWeight: "bold" },
  wallet: { fontSize: 18, marginBottom: 15 },
  card: { backgroundColor: "#1E1E1E", padding: 10, marginBottom: 10, borderRadius: 10 },
  image: { width: "100%", height: 150, borderRadius: 10 },
  cardTitle: { color: "#fff", fontSize: 18, marginTop: 5 },
  price: { color: "#0f0", marginTop: 2 },
  cardButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 5 },
  add: { color: "#FF6347", fontWeight: "bold" },
  call: { color: "#32CD32", fontWeight: "bold" },
  cart: { position: "absolute", bottom: 20, right: 20, backgroundColor: "#FF6347", padding: 10, borderRadius: 8 },
  sectionTitle: { color: "#fff", fontSize: 20, marginTop: 20, marginBottom: 10, fontWeight: "bold" },
});
