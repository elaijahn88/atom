// app/tabs/index.tsx
import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Linking, Alert, TextInput, ActivityIndicator, Dimensions } from "react-native";
import * as Device from "expo-device";

// Services
import { loginOrSignup, updateWallet } from "../../lib/fire";
import { sendLocalNotification, registerForPushNotifications } from "./lib/noti";
import { pickImage, pickFile } from "../../lib/file";

// Types
interface FoodItem { id: number; name: string; price: number; image: string; category: "meal" | "chai"; ownerName: string; ownerPhone: string; ownerLocation: string; }
type CartItem = FoodItem & { quantity: number; };

const menu: FoodItem[] = [
  { id: 1, name: "Classic Burger", price: 6, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800", category: "meal", ownerName: "Restaurant One", ownerPhone: "+256700000001", ownerLocation: "Kampala" },
  { id: 2, name: "Pepperoni Pizza", price: 10, image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800", category: "meal", ownerName: "Pizza Hub", ownerPhone: "+256700000002", ownerLocation: "Ntinda" },
  { id: 3, name: "Grilled Chicken", price: 9, image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800", category: "meal", ownerName: "Chicken Spot", ownerPhone: "+256700000003", ownerLocation: "Kawempe" },
  { id: 4, name: "African Milk Tea", price: 2, image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800", category: "chai", ownerName: "Tea Corner", ownerPhone: "+256700000004", ownerLocation: "Mukono" },
];

const managers = [
  { name: "Manager", phone: "+256756707499" },
  { name: "Supervisor", phone: "0746524088" },
];

const { height } = Dimensions.get("window");

const App = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [user, setUser] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(20);
  const [cart, setCart] = useState<CartItem[]>([]);

  const cartScale = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(height)).current;

  const PARTIAL = height * 0.35;
  const FULL = 0;
  const CLOSED = height;

  // Auto-register notifications
  useEffect(() => {
    registerForPushNotifications().then(token => console.log("Push token:", token));
  }, []);

  // Cart bottom sheet
  const snapTo = (toValue: number) => Animated.spring(panY, { toValue, useNativeDriver: true, tension: 50, friction: 12 }).start();
  const openCart = () => { snapTo(PARTIAL); Animated.timing(overlayOpacity, { toValue: 0.5, duration: 300, useNativeDriver: true }).start(); };
  const closeCart = () => { snapTo(CLOSED); Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(); };

  // Add to cart & wallet deduction
  const addToCart = async (item: FoodItem) => {
    if (walletBalance < item.price) {
      alert("Insufficient wallet balance!");
      return;
    }

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

    // Save wallet to Firebase
    if (user?.uid) await updateWallet(user.uid, newBalance);

    sendLocalNotification("Cart Updated", `${item.name} added! Wallet: $${newBalance}`);
  };

  // Call owner & notify
  const callOwner = (number: string, name: string) => {
    sendLocalNotification("Calling", `Calling ${name} (${number})`);
    Linking.openURL(`tel:${number}`);
  };

  // Login / Signup
  const handleLogin = async () => {
    const deviceId = Device.deviceName || "unknown-device";
    const res = await loginOrSignup(email, password, phone, deviceId);
    if (res.success) {
      setUser({ uid: res.uid, email: res.email, phone: res.phone });
      setWalletBalance(res.wallet || 20);
      sendLocalNotification("Welcome!", `Logged in as ${res.email}`);
    } else {
      Alert.alert("Error", res.error || "Login failed");
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // LOGIN SCREEN
  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Login / Signup</Text>
        <TextInput placeholder="Email" style={styles.input} value={email} onChangeText={setEmail} placeholderTextColor="#aaa" />
        <TextInput placeholder="Password" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#aaa" />
        <TextInput placeholder="Phone" style={styles.input} value={phone} onChangeText={setPhone} placeholderTextColor="#aaa" />
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "bold" }}>Login / Signup</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // APP SCREEN
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Hello, {user.email}</Text>
      <Text style={{ color: "#aaa" }}>{user.phone}</Text>
      <Text style={styles.walletText}>Wallet: ${walletBalance}</Text>

      {menu.map(item => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardPrice}>${item.price}</Text>
          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <TouchableOpacity onPress={() => addToCart(item)} style={{ marginRight: 15 }}>
              <Text style={styles.addBtn}>Add 🛒</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => callOwner(item.ownerPhone, item.ownerName)}>
              <Text style={styles.callBtn}>Call Owner</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {managers.map(m => (
        <TouchableOpacity key={m.phone} onPress={() => callOwner(m.phone, m.name)} style={styles.button}>
          <Text style={{ color: "#fff" }}>{m.name}: {m.phone}</Text>
        </TouchableOpacity>
      ))}

      {cart.length > 0 && (
        <Animated.View style={[styles.floatingCart, { transform: [{ scale: cartScale }] }]}>
          <TouchableOpacity onPress={openCart}>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>🛒 {cart.length} | ${total}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {cart.length > 0 && (
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}><TouchableOpacity style={{ flex: 1 }} onPress={closeCart} /></Animated.View>
      )}
    </ScrollView>
  );
};

// STYLES
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 15 },
  title: { fontSize: 24, color: "#FF6347", fontWeight: "bold", marginBottom: 15 },
  walletText: { color: "#32CD32", fontSize: 18, marginBottom: 20 },
  input: { backgroundColor: "#1E1E1E", color: "#fff", padding: 12, borderRadius: 10, marginBottom: 15 },
  button: { backgroundColor: "#FF6347", padding: 12, marginTop: 10, borderRadius: 10 },
  card: { backgroundColor: "#1E1E1E", padding: 15, marginBottom: 15, borderRadius: 12 },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  cardPrice: { color: "#2ecc71", fontSize: 16 },
  addBtn: { color: "#FF6347", fontWeight: "bold" },
  callBtn: { color: "#32CD32", fontWeight: "bold" },
  floatingCart: { position: "absolute", bottom: 25, right: 25, backgroundColor: "#FF6347", padding: 15, borderRadius: 50 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#000" },
});

export default App;
