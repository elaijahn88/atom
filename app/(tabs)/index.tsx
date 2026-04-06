// FoodOrderingApp.tsx
import React, { useState } from "react";
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
    name: "Burger",
    price: 600000,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
  },
  {
    id: 2,
    name: "Pizza",
    price: 1000000,
    image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800",
  },
];

export default function FoodOrderingApp() {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [balance, setBalance] = useState(0);
  const [username, setUsername] = useState("");
  const [inputUsername, setInputUsername] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (item: FoodItem) => {
    const existing = cart.find((c) => c.id === item.id);
    const updated = existing
      ? cart.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      : [...cart, { ...item, quantity: 1 }];

    setCart(updated);
  };

  const checkout = async () => {
    if (!user) return;

    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

    if (total > balance) {
      Alert.alert("Insufficient Balance");
      return;
    }

    try {
      const newBalance = await withdrawMoney(total);
      setBalance(newBalance);
      setCart([]);

      Alert.alert("Success", `Paid UGX ${total.toLocaleString()}`);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const login = async () => {
    const u = await loginOrCreateUser(inputUsername);
    setUser(u);
    setUsername(u.username);
    setBalance(u.balance);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <TextInput
          placeholder="Username"
          style={styles.input}
          onChangeText={setInputUsername}
        />
        <TouchableOpacity style={styles.btn} onPress={login}>
          <Text style={{ color: "#fff" }}>Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>
        {username} • Balance: UGX {balance.toLocaleString()}
      </Text>

      <ScrollView>
        {menuItems.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => addToCart(item)}>
            <Image source={{ uri: item.image }} style={styles.img} />
            <Text style={{ color: "#fff" }}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {cart.length > 0 && (
        <TouchableOpacity style={styles.checkout} onPress={checkout}>
          <Text style={{ color: "#fff" }}>Checkout</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111", padding: 20 },
  input: { backgroundColor: "#222", color: "#fff", padding: 10, marginBottom: 10 },
  btn: { backgroundColor: "green", padding: 15 },
  header: { color: "#fff", marginBottom: 10 },
  img: { width: "100%", height: 150 },
  checkout: { backgroundColor: "green", padding: 15, marginTop: 10 },
});
