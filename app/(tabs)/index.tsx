// FoodOrderingApp.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Animated,
} from "react-native";

import {
  loginOrCreateUser,
  withdrawMoney,
  UserAccount,
} from "../lib/acc";

interface FoodItem {
  id: number;
  name: string;
  price: number;
  image: string;
}

type CartItem = FoodItem & { quantity: number };

const menuItems: FoodItem[] = [
  {
    id: 1,
    name: "Classic Burger",
    price: 600000,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
  },
  {
    id: 2,
    name: "Pepperoni Pizza",
    price: 1000000,
    image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800",
  },
  {
    id: 3,
    name: "Grilled Chicken",
    price: 900000,
    image: "https://images.unsplash.com/photo-1599486092146-4d4c7e3c7d3e?w=800",
  },
  {
    id: 4,
    name: "African Milk Tea",
    price: 200000,
    image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800",
  },
];

export default function FoodOrderingApp() {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [balance, setBalance] = useState(0);
  const [username, setUsername] = useState("");
  const [inputUsername, setInputUsername] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const cartScale = useState(new Animated.Value(1))[0];

  // ================= LOGIN =================
  const handleLogin = async () => {
    if (!inputUsername) {
      Alert.alert("Enter username");
      return;
    }

    const u = await loginOrCreateUser(inputUsername);
    setUser(u);
    setUsername(u.username);
    setBalance(u.balance);
  };

  // ================= CART =================
  const addToCart = (item: FoodItem) => {
    const exists = cart.find((c) => c.id === item.id);

    const updated = exists
      ? cart.map((c) =>
          c.id === item.id
            ? { ...c, quantity: c.quantity + 1 }
            : c
        )
      : [...cart, { ...item, quantity: 1 }];

    setCart(updated);

    // animation
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
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter((c) => c.id !== id));
  };

  // ================= CHECKOUT =================
  const checkout = async () => {
    if (!user) return;

    if (cart.length === 0) {
      Alert.alert("Cart is empty");
      return;
    }

    const total = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    if (total > balance) {
      Alert.alert("Insufficient Balance");
      return;
    }

    try {
      const newBalance = await withdrawMoney(total);

      setBalance(newBalance);
      setCart([]);

      Alert.alert(
        "Success",
        `Paid UGX ${total.toLocaleString()}`
      );
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // ================= LOGIN SCREEN =================
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Food App Login</Text>

        <TextInput
          placeholder="Enter username"
          style={styles.input}
          value={inputUsername}
          onChangeText={setInputUsername}
        />

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
          <Text style={{ color: "#fff" }}>Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ================= MAIN =================
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>
        {username} • UGX {balance.toLocaleString()}
      </Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => addToCart(item)}
          >
            <Image source={{ uri: item.image }} style={styles.image} />

            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.price}>
                UGX {item.price.toLocaleString()}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => addToCart(item)}
            >
              <Text style={{ color: "#fff", fontSize: 20 }}>+</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* CART */}
      {cart.length > 0 && (
        <Animated.View
          style={[
            styles.cartBox,
            { transform: [{ scale: cartScale }] },
          ]}
        >
          <Text style={{ color: "#fff" }}>
            🛒 {cart.length} items • UGX{" "}
            {totalAmount.toLocaleString()}
          </Text>

          <TouchableOpacity onPress={checkout}>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              Checkout
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0B0B", padding: 20 },
  title: { color: "#fff", fontSize: 28, marginBottom: 20 },
  header: { color: "#32CD32", marginBottom: 10 },
  input: {
    backgroundColor: "#222",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  loginBtn: {
    backgroundColor: "#32CD32",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#1E1E1E",
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  image: { width: 120, height: 120 },
  name: { color: "#fff", fontSize: 18 },
  price: { color: "#32CD32" },
  addBtn: {
    backgroundColor: "#32CD32",
    padding: 10,
    justifyContent: "center",
  },
  cartBox: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "#111",
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
