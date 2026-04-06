import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
  Alert,
  Animated,
  Linking,
  TextInput,
} from "react-native";
import * as Device from "expo-device";

import {
  loginOrCreateUser,
  updateUserWallet,
  updateUserCart,
  notifyAllUsers,
  UserAccount,
} from "../lib/acc";
import { sendLocalNotification } from "../lib/noti";

const { width } = Dimensions.get("window");

interface FoodItem {
  id: number;
  name: string;
  price: number;
  image: string;
  ownerName: string;
  ownerPhone: string;
  ownerLocation: string;
}

type CartItem = FoodItem & { quantity: number };

const menuItems: FoodItem[] = [
  {
    id: 1,
    name: "Classic Burger",
    price: 600000,
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
    ownerName: "Restaurant One",
    ownerPhone: "+256700000001",
    ownerLocation: "Kampala",
  },
  {
    id: 2,
    name: "Pepperoni Pizza",
    price: 1000000,
    image:
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800",
    ownerName: "Pizza Hub",
    ownerPhone: "+256700000002",
    ownerLocation: "Ntinda",
  },
  {
    id: 3,
    name: "Grilled Chicken",
    price: 900000,
    image:
      "https://images.unsplash.com/photo-1599486092146-4d4c7e3c7d3e?w=800",
    ownerName: "Chicken Spot",
    ownerPhone: "+256700000003",
    ownerLocation: "Kawempe",
  },
  {
    id: 4,
    name: "African Milk Tea (Chai)",
    price: 200000,
    image:
      "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800",
    ownerName: "Tea Corner",
    ownerPhone: "+256700000004",
    ownerLocation: "Mukono",
  },
];

type ScreenType = "login" | "foodMenu";

export default function FoodOrderingApp() {
  const [activeScreen, setActiveScreen] = useState<ScreenType>("login");
  const [user, setUser] = useState<UserAccount | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [username, setUsername] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const [inputUsername, setInputUsername] = useState("");
  const [inputPassword, setInputPassword] = useState("");

  const cartScale = useRef(new Animated.Value(1)).current;
  const deviceId = useMemo(() => Device.modelName || "device-id", []);

  // ================= INIT =================
  useEffect(() => {
    // auto-login if previously saved user
  }, []);

  // ================= CART =================
  const addToCart = async (item: FoodItem) => {
    if (!user) return;

    if (walletBalance < item.price) {
      Alert.alert("Insufficient Balance", "You don't have enough money", [
        { text: "OK", onPress: () => {} },
      ]);
      return;
    }

    // Animation
    Animated.sequence([
      Animated.timing(cartScale, {
        toValue: 1.3,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(cartScale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();

    const updatedCart: CartItem[] = cart.find((c) => c.id === item.id)
      ? cart.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      : [...cart, { ...item, quantity: 1 }];

    const newBalance = walletBalance - item.price;

    setCart(updatedCart);
    setWalletBalance(newBalance);

    await updateUserCart(user.uid, updatedCart);
    await updateUserWallet(user.uid, newBalance);

    Alert.alert(
      "Added to Cart",
      `${item.name} added. Remaining UGX ${newBalance.toLocaleString()}`,
      [{ text: "OK", onPress: () => {} }]
    );
  };

  const handleCheckout = async () => {
    if (!user) return;
    if (cart.length === 0)
      return Alert.alert("Cart Empty", "Add items first");

    const totalAmount = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    if (walletBalance < totalAmount)
      return Alert.alert("Insufficient Balance");

    const newBalance = walletBalance - totalAmount;
    setWalletBalance(newBalance);
    setCart([]);

    await updateUserWallet(user.uid, newBalance);
    await updateUserCart(user.uid, []);

    sendLocalNotification(
      "Order Placed!",
      `You paid UGX ${totalAmount.toLocaleString()}`
    );
    await notifyAllUsers(
      "New Order",
      `${username} just ordered UGX ${totalAmount.toLocaleString()}!`
    );

    Alert.alert("Success", "Order placed successfully!");
  };

  const callOwner = (phone: string) => Linking.openURL(`tel:${phone}`);
  const totalCartAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // ================= LOGIN HANDLER =================
  const handleLogin = async () => {
    if (!inputUsername || !inputPassword)
      return Alert.alert("Error", "Please fill all fields");

    const u = await loginOrCreateUser(inputUsername, inputPassword); // proper login
    setUser(u);
    setWalletBalance(u.wallet);
    setUsername(u.username);
    setCart(u.cart || []);
    setActiveScreen("foodMenu");
  };

  // ================= RENDER =================
  if (activeScreen === "foodMenu") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#050505" />
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome, {username}</Text>
          <Text style={styles.walletText}>
            Wallet:{" "}
            <Text style={styles.walletAmount}>
              UGX {walletBalance.toLocaleString()}
            </Text>{" "}
            • Device: {deviceId} • User: {username}
          </Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              activeOpacity={0.92}
              onPress={() => addToCart(item)}
            >
              <View style={styles.imageContainer}>
                <Image source={{ uri: item.image }} style={styles.foodImage} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>
                  UGX {item.price.toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => addToCart(item)}
              >
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {cart.length > 0 && (
          <Animated.View style={[styles.cartContainer, { transform: [{ scale: cartScale }] }]}>
            <Text style={styles.cartText}>
              🛒 {cart.length} items • UGX {totalCartAmount.toLocaleString()}
            </Text>
            <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
              <Text style={styles.checkoutText}>Checkout</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </SafeAreaView>
    );
  }

  // ================= LOGIN SCREEN =================
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loginContainer}>
        <Text style={styles.welcomeText}>Login</Text>
        <TextInput
          placeholder="Username"
          placeholderTextColor="#AAA"
          style={styles.input}
          value={inputUsername}
          onChangeText={setInputUsername}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#AAA"
          style={styles.input}
          value={inputPassword}
          onChangeText={setInputPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.updateButton} onPress={handleLogin}>
          <Text style={styles.updateButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  loginContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  subtitle: { fontSize: 18, color: "#888", marginBottom: 20 },
  input: { width: "100%", backgroundColor: "#121212", padding: 14, borderRadius: 12, marginBottom: 20, color: "#FFF" },
  header: { paddingTop: 50, paddingBottom: 30, alignItems: "center" },
  welcomeText: { fontSize: 32, fontWeight: "700", color: "#FFFFFF" },
  walletText: { fontSize: 16, color: "#AAAAAA", marginTop: 6, textAlign: "center" },
  walletAmount: { color: "#4ADE80", fontWeight: "700" },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 180 },
  menuItem: { backgroundColor: "#121212", borderRadius: 24, marginBottom: 18, flexDirection: "row", alignItems: "center", paddingRight: 16, borderWidth: 0.5, borderColor: "#1F1F1F" },
  imageContainer: { width: 135, height: 135, borderTopLeftRadius: 24, borderBottomLeftRadius: 24, overflow: "hidden" },
  foodImage: { width: "100%", height: "100%", resizeMode: "cover" },
  itemInfo: { flex: 1, paddingLeft: 20 },
  itemName: { fontSize: 21, fontWeight: "600", color: "#F0F0F0", marginBottom: 6 },
  itemPrice: { fontSize: 19, color: "#4ADE80", fontWeight: "700" },
  addButton: { backgroundColor: "#10B981", width: 46, height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center" },
  addButtonText: { color: "#FFFFFF", fontSize: 30, fontWeight: "300" },
  cartContainer: { position: "absolute", bottom: 90, left: 20, right: 20, backgroundColor: "#1A1A1A", borderRadius: 20, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#10B981" },
  cartText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  checkoutButton: { backgroundColor: "#10B981", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  checkoutText: { color: "#FFF", fontWeight: "bold" },
  updateButton: { backgroundColor: "#10B981", paddingVertical: 18, borderRadius: 20, alignItems: "center", width: "100%" },
  updateButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
});
