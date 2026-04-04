// index.tsx
import React, { useState, useEffect, useRef } from "react";
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Linking, Alert, TextInput, Dimensions, Image 
} from "react-native";
import * as Device from "expo-device";

import { 
  loginOrSignup, updateWallet, updateUserProfile, getUserProfile, getUserByDeviceId, saveDeviceIdForUser 
} from "../lib/fire";

import { sendLocalNotification, registerForPushNotifications } from "../lib/noti";

// TYPES
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
  { id: 1, name: "Classic Burger", price: 6, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800", category: "meal", ownerName: "Restaurant One", ownerPhone: "+256700000001", ownerLocation: "Kampala" },
  { id: 2, name: "Pepperoni Pizza", price: 10, image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800", category: "meal", ownerName: "Pizza Hub", ownerPhone: "+256700000002", ownerLocation: "Ntinda" },
  { id: 3, name: "Grilled Chicken", price: 9, image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800", category: "meal", ownerName: "Chicken Spot", ownerPhone: "+256700000003", ownerLocation: "Kawempe" },
  { id: 4, name: "African Milk Tea", price: 2, image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800", category: "chai", ownerName: "Tea Corner", ownerPhone: "+256700000004", ownerLocation: "Mukono" },
];

const { height } = Dimensions.get("window");

export default function App() {
  // LOGIN STATE
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [user, setUser] = useState<any>(null);

  // USER DATA
  const [walletBalance, setWalletBalance] = useState(20);
  const [username, setUsername] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [location, setLocation] = useState("");
  const [foodLikes, setFoodLikes] = useState("");
  const [drinkLikes, setDrinkLikes] = useState("");

  // UI STATE
  const [showProfile, setShowProfile] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  // ANIMATION
  const cartScale = useRef(new Animated.Value(1)).current;

  // PUSH NOTIFICATIONS
  useEffect(() => { registerForPushNotifications().catch(console.log); }, []);

  // DEVICE ID (library-free)
  const getDeviceId = () => {
    return (
      Device.osInternalBuildId || 
      Device.modelName || 
      Device.brand + "-" + Math.floor(Math.random() * 1000000)
    );
  };

  // AUTO LOGIN
  useEffect(() => {
    const checkDeviceLogin = async () => {
      const deviceId = getDeviceId();
      const existingUser = await getUserByDeviceId(deviceId);
      if (existingUser) {
        setUser(existingUser);
        setWalletBalance(existingUser.wallet || 20);
        setUsername(existingUser.username || "User");
        setUserPhone(existingUser.phone || "");
        sendLocalNotification("Welcome back!", `Hello ${existingUser.username || "User"}`);
      }
    };
    checkDeviceLogin();
  }, []);

  // PROFILE FETCH
  useEffect(() => {
    if (!showProfile || !user?.uid) return;
    const fetchProfile = async () => {
      const data = await getUserProfile(user.uid);
      if (data) {
        setUsername(data.username || "");
        setUserPhone(data.phone || "");
        setLocation(data.location || "");
        setFoodLikes(data.foodLikes || "");
        setDrinkLikes(data.drinkLikes || "");
      }
    };
    fetchProfile();
  }, [showProfile]);

  // LOGIN
  const handleLogin = async () => {
    const deviceId = getDeviceId();
    if (!email || !password) return Alert.alert("Error", "Email and password are required");
    if (password.length < 6) return Alert.alert("Error", "Password must be at least 6 characters");

    const res = await loginOrSignup(email, password, phone, deviceId);
    if (res.success) {
      await saveDeviceIdForUser(res.uid, deviceId);
      const userData = { uid: res.uid, phone: res.phone || "", username: res.username || "User", location: res.location || "", foodLikes: res.foodLikes || "", drinkLikes: res.drinkLikes || "", wallet: res.wallet || 20 };
      setUser(userData);
      setWalletBalance(userData.wallet);
      setUsername(userData.username);
      setUserPhone(userData.phone);
      sendLocalNotification("Welcome!", `Hello ${userData.username}`);
    } else {
      Alert.alert("Error", res.error || "Login failed");
    }
  };

  // CART
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

  // CHECKOUT
  const handleCheckout = async () => {
    if (!user?.uid) return Alert.alert("Error", "You must be logged in to checkout");
    if (cart.length === 0) return Alert.alert("Cart empty", "Add items first");

    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (walletBalance < totalAmount) return Alert.alert("Insufficient balance", "You don't have enough funds");

    const newBalance = walletBalance - totalAmount;
    setWalletBalance(newBalance);
    await updateWallet(user.uid, newBalance);

    sendLocalNotification("Checkout Complete", `You have paid $${totalAmount} successfully!`);
    setCart([]);
  };

  const callOwner = (number: string) => Linking.openURL(`tel:${number}`);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // LOGIN SCREEN
  if (!user) {
    return (
      <View style={styles.container}>
        <TextInput placeholder="Email" style={styles.input} value={email} onChangeText={setEmail} />
        <TextInput placeholder="Password" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
        <TextInput placeholder="Phone" style={styles.input} value={phone} onChangeText={setPhone} />
        <TouchableOpacity style={styles.button} onPress={handleLogin}><Text style={styles.btnText}>Login / Signup</Text></TouchableOpacity>
      </View>
    );
  }

  // PROFILE SCREEN
  if (showProfile) {
    const saveProfile = async () => {
      if (!user?.uid) return;
      await updateUserProfile(user.uid, { username, phone: userPhone, location, foodLikes, drinkLikes });
      setShowProfile(false);
    };
    return (
      <ScrollView style={styles.container}>
        <TextInput value={username} onChangeText={setUsername} style={styles.input} placeholder="Username" />
        <TextInput value={userPhone} onChangeText={setUserPhone} style={styles.input} placeholder="Phone" />
        <TouchableOpacity style={styles.button} onPress={saveProfile}><Text style={styles.btnText}>Save</Text></TouchableOpacity>
      </ScrollView>
    );
  }

  // MAIN APP
  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={() => setShowProfile(true)}><Text style={styles.btnText}>Profile</Text></TouchableOpacity>
      <Text style={styles.title}>{username}</Text>
      <Text style={styles.wallet}>Wallet: ${walletBalance}</Text>

      {menu.map(item => (
        <View key={item.id} style={styles.card}>
          <Image source={{ uri: item.image }} style={styles.image} />
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.price}>${item.price}</Text>
          <TouchableOpacity onPress={() => addToCart(item)}><Text style={styles.add}>Add</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => callOwner(item.ownerPhone)}><Text style={styles.call}>Call</Text></TouchableOpacity>
        </View>
      ))}

      {cart.length > 0 && (
        <View style={styles.cart}>
          <Text style={{ color: "#fff" }}>🛒 {cart.length} | ${total}</Text>
          <TouchableOpacity onPress={handleCheckout}>
            <Text style={{ color: "#fff", marginTop: 5, fontWeight: "bold" }}>Checkout</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 15 },
  input: { backgroundColor: "#1E1E1E", color: "#fff", padding: 10, marginBottom: 10 },
  button: { backgroundColor: "#FF6347", padding: 12, borderRadius: 8 },
  btnText: { color: "#fff", textAlign: "center" },
  title: { color: "#fff", fontSize: 22 },
  wallet: { color: "#0f0", marginBottom: 15 },
  card: { backgroundColor: "#1E1E1E", padding: 10, marginBottom: 10 },
  image: { width: "100%", height: 150 },
  cardTitle: { color: "#fff", fontSize: 18 },
  price: { color: "#0f0" },
  add: { color: "#FF6347" },
  call: { color: "#32CD32" },
  cart: { position: "absolute", bottom: 20, right: 20, backgroundColor: "#FF6347", padding: 10, borderRadius: 8 },
});
