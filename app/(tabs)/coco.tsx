// MarketplaceWithProfile.tsx – Marketplace + Profile + Wallet + Notifications
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
} from "react-native";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { getDatabase, ref, update } from "firebase/database";

// Notifications helper (from App.tsx)
import { sendLocalNotification, registerForPushNotifications } from "../lib/noti";
import { app } from "../../firebase"; // Firebase init

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
// DATA & IMAGES
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

interface MarketplaceProps {
  userId: string; // pass from login screen
}

export default function MarketplaceWithProfile({ userId }: MarketplaceProps) {
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
  // INIT USER + NOTIFICATIONS
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
        setCart([]);
      }

      // Register notifications
      const token = await registerForPushNotifications();
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
  // CART
  // ============================

  const addToCart = async (item: Product, quantity: number) => {
    if (quantity <= 0) return;

    const totalPrice = item.price * quantity;
    if (totalPrice > wallet) return alert("Insufficient wallet balance!");

    const newCart = [...cart];
    const existing = newCart.find((c) => c.id === item.id);
    if (existing) existing.quantity += quantity;
    else newCart.push({ ...item, quantity });
    setCart(newCart);

    const newWallet = wallet - totalPrice;
    setWallet(newWallet);

    await updateDoc(doc(firestore, "users", userId), { wallet: newWallet, cart: newCart });
    await update(ref(realtime, `users/${userId}`), { wallet: newWallet, cart: newCart });

    sendLocalNotification("Cart Updated", `${quantity} x ${item.name} added! Wallet: ${newWallet}`);
  };

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const checkout = async () => {
    if (cart.length === 0) return alert("Cart is empty");
    if (wallet < total) return alert("Insufficient wallet balance");

    setCart([]);
    alert("Checkout successful!");

    await updateDoc(doc(firestore, "users", userId), { cart: [] });
    await update(ref(realtime, `users/${userId}`), { cart: [] });
  };

  // ============================
  // PROFILE SAVE
  // ============================

  const saveProfile = async () => {
    await updateDoc(doc(firestore, "users", userId), { username, location, favorites });
    await update(ref(realtime, `users/${userId}`), { username, location, favorites });
    Alert.alert("Saved", "Profile updated successfully");
    setShowProfile(false);
  };

  // ============================
  // RENDER
  // ============================

  if (showProfile) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Edit Profile</Text>
        <TextInput placeholder="Username" style={styles.input} value={username} onChangeText={setUsername} />
        <TextInput placeholder="Location (Building/Level/Shop)" style={styles.input} value={location} onChangeText={setLocation} />
        <TextInput placeholder="Food & Drinks you like" style={styles.input} value={favorites} onChangeText={setFavorites} />
        <TouchableOpacity style={styles.button} onPress={saveProfile}>
          <Text style={{ color: "#fff", textAlign: "center" }}>Save & Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
        <Text style={styles.wallet}>Wallet: UGX {wallet}</Text>
        <TouchableOpacity style={styles.profileBtn} onPress={() => setShowProfile(true)}>
          <Text style={{ color: "#fff" }}>Profile</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ color: "#fff", fontSize: 16, marginBottom: 10 }}>Hello, {username || "User"}!</Text>

      <TextInput
        placeholder="Search products..."
        placeholderTextColor="#888"
        style={styles.input}
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.tabs}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setCategory(category === cat ? null : cat)}
            style={[styles.tab, category === cat && styles.activeTab]}
          >
            <Text style={{ color: category === cat ? "#fff" : "#aaa" }}>{cat.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProductCard item={item} addToCart={addToCart} />}
        onEndReached={() => loadMoreProducts(false)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator color="#fff" /> : null}
        ListEmptyComponent={<Text style={{ color: "#fff", textAlign: "center", marginTop: 20 }}>No products found</Text>}
      />

      {cart.length > 0 && (
        <TouchableOpacity style={styles.checkout} onPress={checkout}>
          <Text style={{ color: "#fff" }}>Checkout UGX {total}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================
// PRODUCT CARD
// ============================

const ProductCard = ({ item, addToCart }: any) => {
  const fade = new Animated.Value(0);
  const [quantity, setQuantity] = useState(1);

  return (
    <View style={styles.card}>
      <Animated.Image
        source={{ uri: item.image }}
        style={{ width: "100%", height: 180, opacity: fade }}
        resizeMode="cover"
        onLoad={() => Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start()}
      />
      <View style={{ padding: 10 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>UGX {item.price}</Text>
        <Text style={styles.seller}>🏪 {item.sellerName}</Text>

        <View style={styles.quantityContainer}>
          <TouchableOpacity style={styles.qtyButton} onPress={() => setQuantity((q) => (q > 1 ? q - 1 : 1))}>
            <Text style={styles.qtyText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.qtyNumber}>{quantity}</Text>
          <TouchableOpacity style={styles.qtyButton} onPress={() => setQuantity((q) => q + 1)}>
            <Text style={styles.qtyText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item, quantity)}>
            <Text style={{ color: "#fff" }}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ============================
// STYLES
// ============================

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#121212" },
  wallet: { color: "#32CD32", fontSize: 16 },
  profileBtn: { backgroundColor: "#FF6347", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  input: { backgroundColor: "#1E1E1E", color: "#fff", padding: 10, borderRadius: 8, marginBottom: 10 },
  tabs: { flexDirection: "row", justifyContent: "space-around", marginBottom: 10 },
  tab: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: "#555" },
  activeTab: { backgroundColor: "#FF6347", borderColor: "#FF6347" },
  card: { backgroundColor: "#1E1E1E", marginBottom: 15, borderRadius: 14, overflow: "hidden" },
  name: { color: "#fff", fontSize: 16 },
  price: { color: "#2ecc71", fontSize: 15 },
  seller: { color: "#aaa", fontSize: 12 },
  checkout: { backgroundColor: "#e74c3c", padding: 15, alignItems: "center", borderRadius: 8, marginTop: 10 },
  quantityContainer: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  qtyButton: { padding: 8, backgroundColor: "#333", borderRadius: 5 },
  qtyText: { color: "#fff", fontSize: 16 },
  qtyNumber: { color: "#fff", marginHorizontal: 10, fontSize: 16 },
  addButton: { marginLeft: 10, backgroundColor: "#FF6347", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 5 },
  title: { fontSize: 22, fontWeight: "bold", color: "#FF6347", marginBottom: 15 },
  button: { backgroundColor: "#FF6347", padding: 12, borderRadius: 10, marginTop: 10 },
});
