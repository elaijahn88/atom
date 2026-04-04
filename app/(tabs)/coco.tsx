// MarketplaceWithProfile.tsx – Marketplace + Profile + Wallet + Notifications + Drag Back
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  PanResponder,
} from "react-native";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { getDatabase, ref, update } from "firebase/database";

import { sendLocalNotification, registerForPushNotifications } from "../lib/noti";
import { app } from "../../firebase";

const firestore = getFirestore(app);
const realtime = getDatabase(app);

// ============================
// TYPES
// ============================

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  sellerName: string;
}

type CartItem = Product & { quantity: number };

// ============================
// DATA
// ============================

const CATEGORIES = ["shoes", "phones", "gadgets", "others"];
const SELLERS = ["Nike Store", "Apple Store", "Samsung Store", "Tech Store", "Puma Store", "Sound Store", "Google Store"];
const PRODUCT_NAMES = ["Air", "Boost", "Galaxy", "iPhone", "Pixel", "Headphones", "Laptop", "Tablet", "Sneakers", "Buds"];

const CATEGORY_IMAGES: { [key: string]: string[] } = {
  shoes: [
    "https://images.unsplash.com/photo-1513105737059-ff4a5fef25cc?w=800",
    "https://images.unsplash.com/photo-1600181956339-44be8b6e5d83?w=800",
    "https://images.unsplash.com/photo-1586461574993-c4d21a8b0c65?w=800",
  ],
  phones: [
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800",
    "https://images.unsplash.com/photo-1580910051073-cd1d6f1c5a13?w=800",
    "https://images.unsplash.com/photo-1512499617640-c2f99979a44f?w=800",
  ],
  gadgets: [
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
    "https://images.unsplash.com/photo-1593642532973-d31b6557fa68?w=800",
    "https://images.unsplash.com/photo-1587825140708-5d395f6e52e6?w=800",
  ],
  others: [
    "https://images.unsplash.com/photo-1602524209072-39d1b4db1d38?w=800",
    "https://images.unsplash.com/photo-1582571344366-1b2e3d0bb9d6?w=800",
    "https://images.unsplash.com/photo-1600181956313-2f35f1a1c3f6?w=800",
  ],
};

const generateProduct = (id: number): Product => {
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const name = `${category.charAt(0).toUpperCase() + category.slice(1)} ${PRODUCT_NAMES[Math.floor(Math.random() * PRODUCT_NAMES.length)]}`;
  const sellerName = SELLERS[Math.floor(Math.random() * SELLERS.length)];
  const price = Math.floor(Math.random() * 4000000) + 50000;
  const imagePool = CATEGORY_IMAGES[category];
  const image = imagePool[Math.floor(Math.random() * imagePool.length)];
  return { id: id.toString(), name, price, category, sellerName, image };
};

// ============================
// MAIN COMPONENT
// ============================

export default function MarketplaceWithProfile({ userId }: { userId: string }) {
  const PAGE_SIZE = 6;

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wallet, setWallet] = useState(0);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextId, setNextId] = useState(1);

  const [username, setUsername] = useState("");
  const [location, setLocation] = useState("");
  const [favorites, setFavorites] = useState("");

  const [showProfile, setShowProfile] = useState(false);

  // ============================
  // DRAG LOGIC
  // ============================

  const dragX = useState(new Animated.Value(0))[0];

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      if (gesture.dx > 0) dragX.setValue(gesture.dx);
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > 120) {
        setShowProfile(false);
        dragX.setValue(0);
      } else {
        Animated.spring(dragX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  // ============================
  // INIT USER
  // ============================

  useEffect(() => {
    const initUser = async () => {
      const userRef = doc(firestore, "users", userId);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        setWallet(data.wallet || 5000000);
        setCart(data.cart || []);
        setUsername(data.username || "");
        setLocation(data.location || "");
        setFavorites(data.favorites || "");
      } else {
        await setDoc(userRef, { wallet: 5000000, cart: [], username: "", location: "", favorites: "" });
        setWallet(5000000);
      }

      await registerForPushNotifications();
      sendLocalNotification("Welcome!", "Marketplace ready!");
    };

    initUser();
    loadMoreProducts(true);
  }, [userId]);

  // ============================
  // PRODUCTS
  // ============================

  const filteredProducts = products.filter((p) => {
    const matchCategory = category ? p.category === category : true;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const loadMoreProducts = (reset = false) => {
    if (loadingMore) return;
    setLoadingMore(true);

    setTimeout(() => {
      const newProducts: Product[] = [];
      for (let i = 0; i < PAGE_SIZE; i++) {
        const id = nextId + i;
        newProducts.push(generateProduct(id));
      }
      setNextId(nextId + PAGE_SIZE);
      setProducts(reset ? newProducts : [...products, ...newProducts]);
      setLoadingMore(false);
    }, 400);
  };

  useEffect(() => {
    loadMoreProducts(true);
  }, [category, search]);

  // ============================
  // PROFILE SAVE
  // ============================

  const saveProfile = async () => {
    await updateDoc(doc(firestore, "users", userId), { username, location, favorites });
    await update(ref(realtime, `users/${userId}`), { username, location, favorites });
    Alert.alert("Saved", "Profile updated successfully");
  };

  // ============================
  // PROFILE SCREEN
  // ============================

  if (showProfile) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Edit Profile</Text>

        <TextInput placeholder="Username" style={styles.input} value={username} onChangeText={setUsername} />
        <TextInput placeholder="Location" style={styles.input} value={location} onChangeText={setLocation} />
        <TextInput placeholder="Favorites" style={styles.input} value={favorites} onChangeText={setFavorites} />

        <TouchableOpacity style={styles.button} onPress={saveProfile}>
          <Text style={{ color: "#fff", textAlign: "center" }}>Save Profile</Text>
        </TouchableOpacity>

        <Text style={{ color: "#aaa", marginTop: 20 }}>👉 Drag to go back</Text>

        <View style={styles.dragContainer}>
          <Animated.View
            {...panResponder.panHandlers}
            style={[styles.dragButton, { transform: [{ translateX: dragX }] }]}
          >
            <Text style={{ color: "#fff" }}>➡ Drag Back</Text>
          </Animated.View>
        </View>
      </ScrollView>
    );
  }

  // ============================
  // MAIN SCREEN
  // ============================

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={styles.wallet}>Wallet: UGX {wallet}</Text>
        <TouchableOpacity style={styles.profileBtn} onPress={() => setShowProfile(true)}>
          <Text style={{ color: "#fff" }}>Profile</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ color: "#fff", marginVertical: 10 }}>Hello, {username || "User"}!</Text>

      <TextInput placeholder="Search..." style={styles.input} value={search} onChangeText={setSearch} />

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Text style={{ color: "#fff" }}>{item.name}</Text>}
      />
    </View>
  );
}

// ============================
// STYLES
// ============================

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#121212" },
  wallet: { color: "#32CD32" },
  profileBtn: { backgroundColor: "#FF6347", padding: 8, borderRadius: 6 },
  input: { backgroundColor: "#1E1E1E", color: "#fff", padding: 10, borderRadius: 8, marginBottom: 10 },
  button: { backgroundColor: "#FF6347", padding: 12, borderRadius: 10, marginTop: 10 },
  title: { fontSize: 22, color: "#FF6347", marginBottom: 10 },

  dragContainer: {
    width: "100%",
    height: 60,
    backgroundColor: "#1E1E1E",
    borderRadius: 10,
    justifyContent: "center",
    marginTop: 10,
  },

  dragButton: {
    width: 140,
    height: 50,
    backgroundColor: "#FF6347",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
