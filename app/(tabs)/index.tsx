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
} from "react-native";
import * as Device from "expo-device";

import {
  loginOrSignup,
  updateWallet,
  getUserByDeviceId,
  saveDeviceIdForUser,
} from "../lib/fire";

import { sendLocalNotification, registerForPushNotifications, notifyAllUsers } from "../lib/noti";

const { width } = Dimensions.get("window");

type ScreenType = "login" | "foodMenu";

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
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
    ownerName: "Restaurant One",
    ownerPhone: "+256700000001",
    ownerLocation: "Kampala",
  },
  {
    id: 2,
    name: "Pepperoni Pizza",
    price: 1000000,
    image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800",
    ownerName: "Pizza Hub",
    ownerPhone: "+256700000002",
    ownerLocation: "Ntinda",
  },
  {
    id: 3,
    name: "Grilled Chicken",
    price: 900000,
    image: "https://images.unsplash.com/photo-1599486092146-4d4c7e3c7d3e?w=800",
    ownerName: "Chicken Spot",
    ownerPhone: "+256700000003",
    ownerLocation: "Kawempe",
  },
  {
    id: 4,
    name: "African Milk Tea (Chai)",
    price: 200000,
    image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800",
    ownerName: "Tea Corner",
    ownerPhone: "+256700000004",
    ownerLocation: "Mukono",
  },
];

export default function FoodOrderingApp() {
  const [activeScreen, setActiveScreen] = useState<ScreenType>("login");
  const [user, setUser] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(2000000);
  const [username, setUsername] = useState("User");
  const [cart, setCart] = useState<CartItem[]>([]);

  const cartScale = useRef(new Animated.Value(1)).current;
  const deviceId = useMemo(() => Device.modelName || "device-id", []);

  // Initialize user from device
  useEffect(() => {
    const init = async () => {
      const existingUser = await getUserByDeviceId(deviceId);
      if (existingUser) {
        setUser(existingUser);
        setWalletBalance(existingUser.wallet || 2000000);
        setUsername(existingUser.username || "User");
        setActiveScreen("foodMenu");
        await registerForPushNotifications(existingUser.uid);
      }
    };
    init();
  }, []);

  const handleLogin = async () => {
    // Simplified for demo - in real app use proper form
    Alert.alert("Demo Mode", "Login skipped for demo. Going to menu...");
    setActiveScreen("foodMenu");
  };

  const addToCart = async (item: FoodItem) => {
    if (walletBalance < item.price) {
      return Alert.alert("Insufficient Balance", "You don't have enough money in your wallet.");
    }

    // Animation
    Animated.sequence([
      Animated.timing(cartScale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.timing(cartScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();

    setCart((prev) => {
      const exist = prev.find((c) => c.id === item.id);
      if (exist) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });

    const newBalance = walletBalance - item.price;
    setWalletBalance(newBalance);
    if (user?.uid) await updateWallet(user.uid, newBalance);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return Alert.alert("Cart Empty", "Add items first");

    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (walletBalance < totalAmount) {
      return Alert.alert("Insufficient Balance");
    }

    const newBalance = walletBalance - totalAmount;
    setWalletBalance(newBalance);
    if (user?.uid) await updateWallet(user.uid, newBalance);

    sendLocalNotification("Order Placed!", `You paid UGX ${totalAmount}`);
    await notifyAllUsers("New Order", `${username} just ordered UGX ${totalAmount}!`);

    setCart([]);
    Alert.alert("Success", "Order placed successfully!");
  };

  const callOwner = (phone: string) => Linking.openURL(`tel:${phone}`);

  const totalCartAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // ==================== MAIN FOOD MENU SCREEN ====================
  if (activeScreen === "foodMenu") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#050505" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome, {username}</Text>
          <Text style={styles.walletText}>
            Wallet:{" "}
            <Text style={styles.walletAmount}>UGX {walletBalance.toLocaleString()}</Text>
          </Text>
        </View>

        {/* Acc/Update Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.updateButton} activeOpacity={0.85}>
            <Text style={styles.updateButtonText}>Acc/Update</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
                <Text style={styles.itemPrice}>UGX {item.price.toLocaleString()}</Text>
              </View>

              <TouchableOpacity
                style={styles.addButton}
                onPress={() => addToCart(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Floating Cart Summary */}
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

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
            <View style={styles.activeDot} />
            <Text style={[styles.navIcon, styles.activeNav]}>🏠</Text>
            <Text style={[styles.navLabel, styles.activeNav]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
            <Text style={styles.navIcon}>📤</Text>
            <Text style={styles.navLabel}>Send</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
            <Text style={styles.navIcon}>🕒</Text>
            <Text style={styles.navLabel}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
            <Text style={styles.navIcon}>👤</Text>
            <Text style={styles.navLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Login Screen (Simple)
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loginContainer}>
        <Text style={styles.welcomeText}>Welcome</Text>
        <Text style={styles.subtitle}>Food & Wallet App</Text>

        <TouchableOpacity style={styles.updateButton} onPress={handleLogin}>
          <Text style={styles.updateButtonText}>Continue as Guest / Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  subtitle: {
    fontSize: 18,
    color: "#888",
    marginBottom: 60,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  walletText: {
    fontSize: 19,
    color: "#AAAAAA",
    marginTop: 6,
  },
  walletAmount: {
    color: "#4ADE80",
    fontWeight: "700",
  },
  buttonContainer: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  updateButton: {
    backgroundColor: "#10B981",
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  updateButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 180,
  },
  menuItem: {
    backgroundColor: "#121212",
    borderRadius: 24,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 15,
    borderWidth: 0.5,
    borderColor: "#1F1F1F",
  },
  imageContainer: {
    width: 135,
    height: 135,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    overflow: "hidden",
  },
  foodImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  itemInfo: {
    flex: 1,
    paddingLeft: 20,
  },
  itemName: {
    fontSize: 21,
    fontWeight: "600",
    color: "#F0F0F0",
    marginBottom: 6,
  },
  itemPrice: {
    fontSize: 19,
    color: "#4ADE80",
    fontWeight: "700",
  },
  addButton: {
    backgroundColor: "#10B981",
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "300",
  },
  cartContainer: {
    position: "absolute",
    bottom: 90,
    left: 20,
    right: 20,
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  cartText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  checkoutButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  checkoutText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0A0A0A",
    borderTopWidth: 1,
    borderTopColor: "#1F1F1F",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingBottom: 28,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    width: width / 5,
  },
  activeDot: {
    position: "absolute",
    top: -6,
    width: 7,
    height: 7,
    backgroundColor: "#4ADE80",
    borderRadius: 4,
  },
  navIcon: {
    fontSize: 26,
    marginBottom: 4,
    color: "#777777",
  },
  navLabel: {
    fontSize: 11.5,
    fontWeight: "500",
    color: "#777777",
  },
  activeNav: {
    color: "#4ADE80",
  },
});
