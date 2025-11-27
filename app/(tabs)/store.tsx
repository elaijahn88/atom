import React, { useState, useEffect, useRef } from "react";
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
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";

const numColumns = 2;
const screenWidth = Dimensions.get("window").width;
const cardWidth = screenWidth / numColumns - 20;

const MyStore = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [userEmail, setUserEmail] = useState("");
  const toastAnim = useRef(new Animated.Value(0)).current;

  // Toast notification
  const showToast = (msg: string) => {
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
    console.log(msg);
  };

  // 🔹 Detect logged-in user
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user?.email) setUserEmail(user.email);
      else setUserEmail(""); // logged out
    });
    return () => unsubAuth();
  }, []);

  // 🔹 Fetch user info ONLY if logged in
  useEffect(() => {
    if (!userEmail) {
      setUserInfo(null);
      return;
    }

    const userRef = doc(db, "acc", userEmail);
    const unsub = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) return setUserInfo(null);
      setUserInfo(snap.data());
    });

    return () => unsub();
  }, [userEmail]);

  // 🔹 Fetch products no matter what (public)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "phones", "iphone"), (snap) => {
      const data = snap.data() || {};
      const arr = Array.isArray(data.products) ? data.products : [];
      setProducts(arr);
    });

    return () => unsub();
  }, []);

  // Add item to cart
  const addToCart = (item: any) => {
    setCart((prev = []) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      if (safePrev.find((p) => p.id === item.id)) return safePrev;
      return [...safePrev, item];
    });
    showToast(`${item.name} added to cart`);
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + Number(item.price || 0), 0);
  };

  // 🔹 Payment handler with login protection
  const handlePayment = async () => {
    if (!userInfo) {
      Alert.alert("Login Required", "Please log in to complete your purchase.");
      return;
    }

    const total = getCartTotal();
    if (total > (userInfo.net || 0)) {
      Alert.alert("Insufficient Funds", "Your balance is too low.");
      return;
    }

    try {
      const userRef = doc(db, "acc", userEmail);

      await updateDoc(userRef, { net: userInfo.net - total });

      const purchaseRecords = cart.map((item) => ({
        ...item,
        timestamp: new Date(),
      }));

      await updateDoc(userRef, { purchases: arrayUnion(...purchaseRecords) });

      setCart([]);
      showToast(`Payment successful! UGX ${total.toLocaleString()} deducted.`);
    } catch (err) {
      console.error(err);
      showToast("Payment failed. Try again.");
    }
  };

  // Render product item
  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Image
        source={item.image ? { uri: item.image.trim() } : { uri: "https://xlijah.com/pics/phones/iphone/12.jpg" }}
        style={styles.image}
      />
      <Text style={styles.title}>{item.name}</Text>
      <Text style={styles.price}>{Number(item.price).toLocaleString()} UGX</Text>
      <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
        <Ionicons name="cart" size={20} color="#fff" />
        <Text style={styles.addText}>Add</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      
      {/* 🔹 Show ONLY if logged in */}
      {userInfo && (
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.header}>Welcome, {userInfo.Name}</Text>
          <Text style={styles.balance}>Balance: {Number(userInfo.net).toLocaleString()} UGX</Text>
          <Text>Phone: {userInfo.phone}</Text>
        </View>
      )}

      {/* 🔹 Products always visible */}
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* 🔹 Cart bar always visible, but checkout depends on login */}
      {cart.length > 0 && (
        <View style={styles.cartBar}>
          <Text style={styles.cartText}>Cart Total: {getCartTotal().toLocaleString()} UGX</Text>

          {userInfo ? (
            <TouchableOpacity style={styles.payButton} onPress={handlePayment}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Pay Now</Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ color: "yellow", fontWeight: "bold" }}>
              Login to Checkout
            </Text>
          )}
        </View>
      )}

      {/* Toast */}
      <Animated.View
        style={{
          position: "absolute",
          bottom: 40,
          alignSelf: "center",
          opacity: toastAnim,
          transform: [{ scale: toastAnim }],
          backgroundColor: "#333",
          padding: 10,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "#fff" }}>Notification</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 10 },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 5 },
  balance: { fontSize: 16, marginBottom: 5 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    margin: 5,
    padding: 10,
    width: cardWidth,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  image: { width: "100%", height: 120, borderRadius: 10 },
  title: { fontSize: 16, fontWeight: "bold", marginVertical: 5 },
  price: { fontSize: 14, color: "#555", marginBottom: 5 },
  addButton: {
    backgroundColor: "#28a745",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderRadius: 8,
  },
  addText: { color: "#fff", marginLeft: 5 },
  cartBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#007AFF",
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cartText: { color: "#fff", fontWeight: "bold" },
  payButton: {
    backgroundColor: "#28a745",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
});

export default MyStore;
