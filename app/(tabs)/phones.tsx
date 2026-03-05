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

  // 🔄 Real-time wallet listener
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
    setCart((prev) =>
      prev.find((p) => p.id === item.id) ? prev : [...prev, item]
    );
    showToast();
  };

  const getCartTotal = () =>
    cart.reduce((sum, item) => sum + Number(item.price), 0);

  // 💰 TOP UP FUNCTION
  const handleTopUp = async (amount: number) => {
    try {
      const userRef = doc(db, "users", userId);

      await updateDoc(userRef, {
        walletBalance: increment(amount),
      });

      await addDoc(collection(db, "transactions"), {
        userId,
        type: "TOP_UP",
        amount,
        currency: "UGX",
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", `UGX ${amount.toLocaleString()} added to wallet`);
    } catch (error) {
      Alert.alert("Error", "Top up failed");
    }
  };

  // 💳 PAYMENT FUNCTION
  const handlePayment = async () => {
    const total = getCartTotal();
    try {
      const userRef = doc(db, "users", userId);
      const snap = await getDoc(userRef);

      if (!snap.exists())
        return Alert.alert("Error", "Wallet not found");

      const balance = snap.data()?.walletBalance || 0;

      if (balance < total)
        return Alert.alert("Insufficient Balance", "Please top up your wallet");

      await updateDoc(userRef, {
        walletBalance: increment(-total),
      });

      await addDoc(collection(db, "orders"), {
        userId,
        items: cart,
        total,
        currency: "UGX",
        status: "PAID",
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "transactions"), {
        userId,
        type: "PAYMENT",
        amount: total,
        currency: "UGX",
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
      {/* WALLET BAR */}
      <View style={styles.walletBar}>
        <Ionicons name="wallet" size={24} color="#00ffcc" />
        <Text style={styles.walletText}>
          Wallet: UGX {wallet.toLocaleString()}
        </Text>

        <TouchableOpacity
          style={styles.topUpButton}
          onPress={() =>
            Alert.alert("Top Up Wallet", "Select amount", [
              { text: "10,000 UGX", onPress: () => handleTopUp(10000) },
              { text: "50,000 UGX", onPress: () => handleTopUp(50000) },
              { text: "100,000 UGX", onPress: () => handleTopUp(100000) },
              { text: "Cancel", style: "cancel" },
            ])
          }
        >
          <Ionicons name="add-circle" size={20} color="#000" />
        </TouchableOpacity>
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

      {/* TOAST */}
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

export default MyStore;
