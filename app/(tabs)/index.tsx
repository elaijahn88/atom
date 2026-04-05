import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Alert, Image, Animated, Linking
} from "react-native";
import * as Device from "expo-device";

import {
  loginOrSignup,
  updateWallet,
  getUserByDeviceId,
  saveDeviceIdForUser
} from "../lib/fire";

import { sendLocalNotification, registerForPushNotifications, notifyAllUsers } from "../lib/noti";

type ScreenType = "login" | "foodMenu" | "moneySystem" | "profile";

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

const menu: FoodItem[] = [
  { id: 1, name: "Classic Burger", price: 600000, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800", category: "meal", ownerName: "Restaurant One", ownerPhone: "+256700000001", ownerLocation: "Kampala" },
  { id: 2, name: "Pepperoni Pizza", price: 1000000, image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800", category: "meal", ownerName: "Pizza Hub", ownerPhone: "+256700000002", ownerLocation: "Ntinda" },
  { id: 3, name: "Grilled Chicken", price: 900000, image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800", category: "meal", ownerName: "Chicken Spot", ownerPhone: "+256700000003", ownerLocation: "Kawempe" },
  { id: 4, name: "African Milk Tea", price: 200000, image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800", category: "chai", ownerName: "Tea Corner", ownerPhone: "+256700000004", ownerLocation: "Mukono" },
];

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenType>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [user, setUser] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(2000000);
  const [username, setUsername] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartScale = useRef(new Animated.Value(1)).current;
  const [showWallet, setShowWallet] = useState(false);
  const walletAnim = useRef(new Animated.Value(0)).current;

  const deviceId = useMemo(() => Device.modelName || "device-id", []);

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
        await registerForPushNotifications(existingUser.uid);
      }
    };
    init();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert("Error", "Email and password are required");
    const res = await loginOrSignup(email, password, phone, deviceId);
    if (res.success) {
      await saveDeviceIdForUser(res.uid, deviceId);
      setUser(res);
      setWalletBalance(res.wallet);
      setUsername(res.username);
      setUserPhone(res.phone);
      sendLocalNotification("Welcome!", `Hello ${res.username}`);
      await registerForPushNotifications(res.uid);
      setActiveScreen("foodMenu");
    } else {
      Alert.alert("Error", res.error || "Login failed");
    }
  };

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
    await notifyAllUsers("New Order", `${username} just purchased UGX ${totalAmount}!`);
    setCart([]);
  };

  const callOwner = (number: string) => Linking.openURL(`tel:${number}`);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const WalletDisplay = () => {
    const walletColor = walletBalance < 500000 ? "#ff4d4d" : walletBalance > 2000000 ? "#4d94ff" : "#00cc44";
    useEffect(() => {
      Animated.timing(walletAnim, { toValue: showWallet ? 1 : 0, duration: 300, useNativeDriver: true }).start();
    }, [showWallet]);

    return (
      <View style={{ marginBottom: 10 }}>
        <Animated.View style={{ opacity: walletAnim }}>
          <Text style={[styles.wallet, { color: walletColor }]}>Wallet: UGX {walletBalance}</Text>
        </Animated.View>
        <TouchableOpacity style={[styles.button, { marginBottom: 10 }]} onPress={() => setShowWallet(prev => !prev)}>
          <Text style={styles.btnText}>{showWallet ? "Hide Balance" : "Show Balance"}</Text>
        </TouchableOpacity>
      </View>
    );
  };

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
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Hello, {username}</Text>
        <WalletDisplay />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
          <TouchableOpacity style={[styles.button, { flex: 0.48 }]} onPress={() => setActiveScreen("moneySystem")}><Text style={styles.btnText}>Load Money</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.button, { flex: 0.48 }]} onPress={() => setActiveScreen("profile")}><Text style={styles.btnText}>Profile</Text></TouchableOpacity>
        </View>
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
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Load Money</Text>
        <WalletDisplay />
        <TouchableOpacity style={styles.button} onPress={() => setWalletBalance(walletBalance + 500000)}><Text style={styles.btnText}>+UGX 500,000</Text></TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => setActiveScreen("foodMenu")}><Text style={styles.btnText}>Back</Text></TouchableOpacity>
      </ScrollView>
    );
  }

  if (activeScreen === "profile") {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <WalletDisplay />
        <Text style={styles.wallet}>Name: {username}</Text>
        <Text style={styles.wallet}>Phone: {userPhone}</Text>
        <TouchableOpacity style={styles.button} onPress={() => setActiveScreen("foodMenu")}><Text style={styles.btnText}>Back</Text></TouchableOpacity>
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
  wallet: { fontSize: 18, marginBottom: 5 },
  card: { backgroundColor: "#1E1E1E", padding: 10, marginBottom: 10, borderRadius: 10 },
  image: { width: "100%", height: 150, borderRadius: 10 },
  cardTitle: { color: "#fff", fontSize: 18, marginTop: 5 },
  price: { color: "#0f0", marginTop: 2 },
  cardButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 5 },
  add: { color: "#FF6347", fontWeight: "bold" },
  call: { color: "#32CD32", fontWeight: "bold" },
  cart: { position: "absolute", bottom: 20, right: 20, backgroundColor: "#FF6347", padding: 10, borderRadius: 8 },
});
