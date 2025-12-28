import React, { useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase"; // ✅ CORRECT PATH

/* ---------------- STORE DATA ---------------- */

const numColumns = 2;
const screenWidth = Dimensions.get("window").width;
const cardWidth = screenWidth / numColumns - 20;

const demoProducts = [
  { id: 12, name: "iPhone 12", price: 3500000, image: "https://xlijah.com/pics/phones/iphone/12.jpg" },
  { id: 13, name: "iPhone 13", price: 4500000, image: "https://xlijah.com/pics/phones/iphone/13.jpg" },
  { id: 14, name: "iPhone 14", price: 5500000, image: "https://xlijah.com/pics/phones/iphone/14.jpg" },
  { id: 15, name: "iPhone 15", price: 6500000, image: "https://xlijah.com/pics/phones/iphone/15.jpg" },
];

/* ---------------- COMPONENT ---------------- */

const MyStore = () => {
  const [cart, setCart] = useState<any[]>([]);
  const toastAnim = useRef(new Animated.Value(0)).current;

  // 🔑 replace with auth UID later
  const userId = "demoUser123";

  /* ---------------- TOAST ---------------- */

  const showToast = () => {
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  /* ---------------- CART ---------------- */

  const addToCart = (item: any) => {
    setCart((prev) =>
      prev.find((p) => p.id === item.id) ? prev : [...prev, item]
    );
    showToast();
  };

  const getCartTotal = () =>
    cart.reduce((sum, item) => sum + Number(item.price), 0);

  /* ---------------- WALLET PAYMENT ---------------- */

  const handlePayment = async () => {
    const total = getCartTotal();

    try {
      const userRef = doc(db, "users", userId);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        Alert.alert("Error", "Wallet not found");
        return;
      }

      const balance = snap.data().walletBalance || 0;

      if (balance < total) {
        Alert.alert("Insufficient Balance", "Please top up your wallet");
        return;
      }

      // Deduct wallet balance
      await updateDoc(userRef, {
        walletBalance: increment(-total),
      });

      // Save order
      await addDoc(collection(db, "orders"), {
        userId,
        items: cart,
        total,
        currency: "UGX",
        status: "PAID",
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", `UGX ${total.toLocaleString()} paid`);
      setCart([]);
      showToast();

    } catch (e) {
      Alert.alert("Error", "Payment failed");
    }
  };

  /* ---------------- UI ---------------- */

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <Text style={styles.title}>{item.name}</Text>
      <Text style={styles.price}>{item.price.toLocaleString()} UGX</Text>

      <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
        <Ionicons name="cart" size={18} color="#fff" />
        <Text style={styles.addText}>Add</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={demoProducts}
        renderItem={renderItem}
        keyExtractor={(i) => i.id.toString()}
        numColumns={numColumns}
      />

      {cart.length > 0 && (
        <View style={styles.cartBar}>
          <Text style={styles.cartText}>
            Total: {getCartTotal().toLocaleString()} UGX
          </Text>
          <TouchableOpacity style={styles.payButton} onPress={handlePayment}>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Pay</Text>
          </TouchableOpacity>
        </View>
      )}

      <Animated.View
        style={{
          position: "absolute",
          bottom: 80,
          alignSelf: "center",
          opacity: toastAnim,
          transform: [{ scale: toastAnim }],
          backgroundColor: "#333",
          padding: 10,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "#fff" }}>Added to cart</Text>
      </Animated.View>
    </View>
  );
};

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 10 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    margin: 5,
    padding: 10,
    width: cardWidth,
    elevation: 2,
  },
  image: { width: "100%", height: 120, borderRadius: 10 },
  title: { fontSize: 16, fontWeight: "bold", marginVertical: 5 },
  price: { fontSize: 14, color: "#555" },
  addButton: {
    backgroundColor: "#28a745",
    flexDirection: "row",
    justifyContent: "center",
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  addText: { color: "#fff", marginLeft: 5 },
  cartBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#007AFF",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cartText: { color: "#fff", fontWeight: "bold" },
  payButton: {
    backgroundColor: "#28a745",
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: "center",
  },
});

export default MyStore;
