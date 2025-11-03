import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../firebase";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";

const MyStore = ({ username }) => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [balance, setBalance] = useState(0);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = (msg) => {
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    if (!username) return;
    const accRef = doc(db, "acc", username);
    const unsub = onSnapshot(accRef, (snap) => {
      if (!snap.exists()) return setBalance(0);
      const data = snap.data() || {};
      setBalance(Number(data.net) || 0);
    });
    return () => unsub();
  }, [username]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "phones", "iphone"), (snap) => {
      const data = snap.data() || {};
      const arr = Array.isArray(data.products) ? data.products : [];
      setProducts(arr);
    });
    return () => unsub();
  }, []);

  const seedData = async () => {
    try {
      const seedProducts = [
        { id: 12, name: "iPhone 12", price: 3500000, image: "https://xlijah.com/pics/phones/iphone/12.jpg" },
        { id: 13, name: "iPhone 13", price: 4200000, image: "https://xlijah.com/pics/phones/iphone/13.jpg" },
        { id: 14, name: "iPhone 14", price: 4900000, image: "https://xlijah.com/pics/phones/iphone/14.jpg" },
        { id: 15, name: "iPhone 15", price: 5600000, image: "https://xlijah.com/pics/phones/iphone/15.jpg" },
        { id: 16, name: "iPhone 16", price: 6300000, image: "https://xlijah.com/pics/phones/iphone/16.jpg" },
        { id: 17, name: "iPhone 17", price: 7000000, image: "https://xlijah.com/pics/phones/iphone/17.jpg" },
        { id: 18, name: "Benz Car", price: 25000000, image: "https://xlijah.com/pics/benz.jpg" },
        { id: 19, name: "Gold Bar", price: 15000000, image: "https://xlijah.com/pics/gold.jpg" },
        { id: 20, name: "iPhone 14 Pro", price: 5400000, image: "https://xlijah.com/pics/phones/iphone/14.jpg" },
        { id: 21, name: "iPhone 14 Max", price: 5900000, image: "https://xlijah.com/pics/phones/iphone/14.jpg" },
        { id: 22, name: "iPhone 14 Ultra", price: 6400000, image: "https://xlijah.com/pics/phones/iphone/14.jpg" },
      ];
      await setDoc(doc(db, "phones", "iphone"), { products: seedProducts });
      showToast("Products with UGX prices seeded successfully");
    } catch (e) {
      console.error(e);
      showToast("Failed to seed data");
    }
  };

  const addToCart = (item) => {
    setCart((prev = []) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      if (safePrev.find((p) => p.id === item.id)) return safePrev;
      return [...safePrev, item];
    });
    showToast(`${item.name} added to cart`);
  };

  const renderItem = ({ item }) => (
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
      <Text style={styles.header}>My Store</Text>
      <Text style={styles.balance}>Balance: {balance.toLocaleString()} UGX</Text>
      <TouchableOpacity style={styles.seedButton} onPress={seedData}>
        <Text style={{ color: "#fff" }}>Seed Products</Text>
      </TouchableOpacity>

      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

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
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  balance: { fontSize: 16, marginBottom: 10 },
  seedButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 15,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  image: { width: "100%", height: 150, borderRadius: 10 },
  title: { fontSize: 18, fontWeight: "bold", marginVertical: 5 },
  price: { fontSize: 16, color: "#555", marginBottom: 5 },
  addButton: {
    backgroundColor: "#28a745",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderRadius: 8,
  },
  addText: { color: "#fff", marginLeft: 5 },
});

export default MyStore;
