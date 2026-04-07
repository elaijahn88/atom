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
  description?: string;   // Added for better UI
}

type CartItem = FoodItem & { quantity: number };

const menuItems: FoodItem[] = [
  {
    id: 1,
    name: "Classic Burger",
    price: 600000,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
    description: "Juicy beef patty with fresh vegetables",
  },
  {
    id: 2,
    name: "Pepperoni Pizza",
    price: 1000000,
    image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800",
    description: "Classic pepperoni with melted cheese",
  },
  {
    id: 3,
    name: "Grilled Chicken",
    price: 900000,
    image: "https://images.unsplash.com/photo-1599486092146-4d4c7e3c7d3e?w=800",
    description: "Perfectly grilled chicken with spices",
  },
  {
    id: 4,
    name: "African Milk Tea",
    price: 200000,
    image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800",
    description: "Rich and creamy traditional milk tea",
  },
];

export default function FoodOrderingApp() {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [balance, setBalance] = useState(0);
  const [username, setUsername] = useState("");
  const [inputUsername, setInputUsername] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

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

  // ================= CART FUNCTIONS =================
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
  };

  const decreaseQuantity = (id: number) => {
    setCart(cart.map((item) =>
      item.id === id && item.quantity > 1
        ? { ...item, quantity: item.quantity - 1 }
        : item
    ).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter((c) => c.id !== id));
  };

  // ================= CHECKOUT =================
  const checkout = async () => {
    if (!user || cart.length === 0) return;

    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const tax = Math.round(subtotal * 0.05); // 5% tax
    const grandTotal = subtotal + tax;

    if (grandTotal > balance) {
      Alert.alert("Insufficient Balance", `You need UGX ${grandTotal.toLocaleString()}`);
      return;
    }

    try {
      const newBalance = await withdrawMoney(grandTotal);

      setBalance(newBalance);
      setCart([]);

      Alert.alert(
        "Order Successful",
        `Paid UGX ${grandTotal.toLocaleString()}\n\nEnjoy your meal!`
      );
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + tax;

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
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ================= MAIN SCREEN =================
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>
        {username} • UGX {balance.toLocaleString()}
      </Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 200 }}>
        {/* Menu Items */}
        <Text style={styles.sectionTitle}>Menu</Text>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => addToCart(item)}
          >
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={styles.itemInfo}>
              <Text style={styles.name}>{item.name}</Text>
              {item.description && (
                <Text style={styles.description}>{item.description}</Text>
              )}
              <Text style={styles.price}>
                UGX {item.price.toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => addToCart(item)}
            >
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {/* Cart Section - Like in the screenshot */}
        {cart.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Orders ({cart.length} items)</Text>
            {cart.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <Image source={{ uri: item.image }} style={styles.cartImage} />
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemPrice}>
                    UGX {(item.price * item.quantity).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.quantityControl}>
                  <TouchableOpacity onPress={() => decreaseQuantity(item.id)} style={styles.qtyBtn}>
                    <Text style={styles.qtyText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantity}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => addToCart(item)} style={styles.qtyBtn}>
                    <Text style={styles.qtyText}>+</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                  <Text style={{ color: "#ff4444", fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Payment Summary & Process Order Button */}
      {cart.length > 0 && (
        <View style={styles.paymentContainer}>
          <View style={styles.paymentSummary}>
            <Text style={styles.summaryText}>Subtotal</Text>
            <Text style={styles.summaryAmount}>UGX {subtotal.toLocaleString()}</Text>
          </View>

          <View style={styles.paymentSummary}>
            <Text style={styles.summaryText}>Tax (5%)</Text>
            <Text style={styles.summaryAmount}>UGX {tax.toLocaleString()}</Text>
          </View>

          <View style={[styles.paymentSummary, styles.grandTotal]}>
            <Text style={styles.grandTotalText}>Grand Total</Text>
            <Text style={styles.grandTotalAmount}>UGX {grandTotal.toLocaleString()}</Text>
          </View>

          <TouchableOpacity style={styles.processBtn} onPress={checkout}>
            <Text style={styles.processBtnText}>
              Process Order ({cart.length} Items)
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0B0B", padding: 16 },
  title: { color: "#fff", fontSize: 28, marginBottom: 20, textAlign: "center" },
  header: { color: "#32CD32", fontSize: 18, marginBottom: 15, fontWeight: "bold" },

  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 15,
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#1E1E1E",
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    padding: 8,
  },
  image: { width: 100, height: 100, borderRadius: 8 },
  itemInfo: { flex: 1, paddingHorizontal: 12, justifyContent: "center" },
  name: { color: "#fff", fontSize: 17, fontWeight: "600" },
  description: { color: "#aaa", fontSize: 13, marginVertical: 4 },
  price: { color: "#32CD32", fontSize: 16, fontWeight: "bold" },

  addBtn: {
    backgroundColor: "#32CD32",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  addBtnText: { color: "#fff", fontSize: 24, fontWeight: "bold" },

  // Cart Item
  cartItem: {
    flexDirection: "row",
    backgroundColor: "#1E1E1E",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  cartImage: { width: 70, height: 70, borderRadius: 8 },
  cartItemInfo: { flex: 1, paddingHorizontal: 12 },
  cartItemName: { color: "#fff", fontSize: 16 },
  cartItemPrice: { color: "#32CD32", fontWeight: "bold" },

  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 8,
    marginRight: 12,
  },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  qtyText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  quantity: { color: "#fff", fontSize: 16, marginHorizontal: 8, fontWeight: "600" },

  // Payment
  paymentContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1E1E1E",
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  paymentSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryText: { color: "#ccc", fontSize: 16 },
  summaryAmount: { color: "#fff", fontSize: 16 },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: "#444",
    paddingTop: 12,
    marginTop: 8,
  },
  grandTotalText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  grandTotalAmount: { color: "#32CD32", fontSize: 18, fontWeight: "bold" },

  processBtn: {
    backgroundColor: "#32CD32",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  processBtnText: {
    color: "#000",
    fontSize: 17,
    fontWeight: "bold",
  },

  input: {
    backgroundColor: "#222",
    color: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  loginBtn: {
    backgroundColor: "#32CD32",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
});
