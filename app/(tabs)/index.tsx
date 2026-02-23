import React, { useState, useRef, useEffect } from "react";
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
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase"; // ✅ Firestore import

const numColumns = 2;
const screenWidth = Dimensions.get("window").width;
const cardWidth = screenWidth / numColumns - 20;

const demoProducts = [
  { id: 12, name: "iPhone 12", price: 3500000, image: "https://xlijah.com/pics/phones/iphone/12.jpg" },
  { id: 13, name: "iPhone 13", price: 4500000, image: "https://xlijah.com/pics/phones/iphone/13.jpg" },
  { id: 14, name: "iPhone 14", price: 5500000, image: "https://xlijah.com/pics/phones/iphone/14.jpg" },
  { id: 15, name: "iPhone 15", price: 6500000, image: "https://xlijah.com/pics/phones/iphone/15.jpg" },
];

const MyStore = () => {
  const [cart, setCart] = useState<any[]>([]);
  const [wallet, setWallet] = useState<number>(0);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const userId = "demoUser123"; // replace with auth UID

  // Load wallet balance live
  useEffect(() => {
    const walletRef = doc(db, "users", userId);
    const unsub = onSnapshot(walletRef, (snap) => {
      if (snap.exists()) setWallet(snap.data()?.walletBalance || 0);
    });
    return unsub;
  }, []);

  const showToast = () => {
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const addToCart = (item: any) => {
    setCart((prev) => (prev.find((p) => p.id === item.id) ? prev : [...prev, item]));
    showToast();
  };

  const getCartTotal = () => cart.reduce((sum, item) => sum + Number(item.price), 0);

  const handlePayment = async () => {
    const total = getCartTotal();
    try {
      const userRef = doc(db, "users", userId);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return Alert.alert("Error", "Wallet not found");

      const balance = snap.data()?.walletBalance || 0;
      if (balance < total) return Alert.alert("Insufficient Balance", "Please top up your wallet");

      // Deduct wallet balance
      await updateDoc(userRef, { walletBalance: increment(-total) });

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

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <Text style={styles.title}>{item.name}</Text>
      <Text style={styles.price}>{item.price.toLocaleString()} UGX</Text>
      <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
        <Ionicons name="cart" size={18} color="#fff" />
        <Text style={styles.addText}>Add to Cart</Text>
      </TouchableOpacity>
    </View>
  );

  // Infinite scroll data
  const infiniteData = Array.from({ length: 100 }).flatMap(() => demoProducts);

  return (
    <View style={styles.container}>
      <View style={styles.walletBar}>
        <Ionicons name="wallet" size={24} color="#fff" />
        <Text style={styles.walletText}>
          Wallet: UGX {wallet.toLocaleString()}
        </Text>
      </View>

      <FlatList
        data={infiniteData}
        renderItem={renderItem}
        keyExtractor={(i, idx) => `${i.id}-${idx}`}
        numColumns={numColumns}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {cart.length > 0 && (
        <View style={styles.cartBar}>
          <Text style={styles.cartText}>Total: {getCartTotal().toLocaleString()} UGX</Text>
          <TouchableOpacity style={styles.payButton} onPress={handlePayment}>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Pay Now</Text>
          </TouchableOpacity>
        </View>
      )}

      <Animated.View
        style={{
          position: "absolute",
          bottom: 140,
          alignSelf: "center",
          opacity: toastAnim,
          transform: [{ scale: toastAnim }],
          backgroundColor: "#333",
          padding: 12,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>Added to cart!</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f2", padding: 10 },
  walletBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  walletText: { color: "#fff", fontWeight: "bold", marginLeft: 6, fontSize: 16 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    margin: 5,
    padding: 12,
    width: cardWidth,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  image: { width: "100%", height: 140, borderRadius: 12 },
  title: { fontSize: 16, fontWeight: "bold", marginVertical: 6, color: "#333" },
  price: { fontSize: 14, color: "#666", marginBottom: 6 },
  addButton: {
    backgroundColor: "#28a745",
    flexDirection: "row",
    justifyContent: "center",
    padding: 10,
    borderRadius: 10,
  },
  addText: { color: "#fff", marginLeft: 6, fontWeight: "bold" },
  cartBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#007AFF",
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cartText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  payButton: {
    backgroundColor: "#28a745",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
    justifyContent: "center",
  },
});

export default MyStore;
