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
import { db } from "../../firebase";

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

  const userId = "demoUser123";

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

  const getCartTotal = () =>
    cart.reduce((sum, item) => sum + Number(item.price), 0);

  const handlePayment = async () => {
    const total = getCartTotal();
    try {
      const userRef = doc(db, "users", userId);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return Alert.alert("Error", "Wallet not found");

      const balance = snap.data()?.walletBalance || 0;
      if (balance < total)
        return Alert.alert("Insufficient Balance", "Please top up your wallet");

      await updateDoc(userRef, { walletBalance: increment(-total) });

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
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => addToCart(item)}
      >
        <Ionicons name="cart" size={18} color="#000" />
        <Text style={styles.addText}>Add to Cart</Text>
      </TouchableOpacity>
    </View>
  );

  const infiniteData = Array.from({ length: 100 }).flatMap(
    () => demoProducts
  );

  return (
    <View style={styles.container}>
      <View style={styles.walletBar}>
        <Ionicons name="wallet" size={24} color="#00ffcc" />
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
        showsVerticalScrollIndicator={false}
      />

      {cart.length > 0 && (
        <View style={styles.cartBar}>
          <Text style={styles.cartText}>
            Total: {getCartTotal().toLocaleString()} UGX
          </Text>
          <TouchableOpacity style={styles.payButton} onPress={handlePayment}>
            <Text style={{ color: "#000", fontWeight: "bold" }}>
              Pay Now
            </Text>
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
          backgroundColor: "#1e1e1e",
          borderWidth: 1,
          borderColor: "#2a2a2a",
          padding: 12,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "#00ffcc", fontWeight: "bold" }}>
          Added to cart!
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    padding: 10,
  },

  walletBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e1e1e",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },

  walletText: {
    color: "#00ffcc",
    fontWeight: "bold",
    marginLeft: 6,
    fontSize: 16,
  },

  card: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    margin: 6,
    padding: 12,
    width: cardWidth,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },

  image: {
    width: "100%",
    height: 140,
    borderRadius: 12,
  },

  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginVertical: 6,
    color: "#ffffff",
  },

  price: {
    fontSize: 14,
    color: "#bbbbbb",
    marginBottom: 6,
  },

  addButton: {
    backgroundColor: "#00c853",
    flexDirection: "row",
    justifyContent: "center",
    padding: 10,
    borderRadius: 12,
  },

  addText: {
    color: "#000",
    marginLeft: 6,
    fontWeight: "bold",
  },

  cartBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1e1e1e",
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
  },

  cartText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },

  payButton: {
    backgroundColor: "#00c853",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
    justifyContent: "center",
  },
});

export default MyStore;
