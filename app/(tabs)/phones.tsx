// Marketplace.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
} from "react-native";

import * as Device from "expo-device";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { app } from "../../firebase";

import { getUserByDeviceId, updateWallet } from "../lib/fire";
import { sendLocalNotification } from "../lib/noti";
import { registerDevicePushToken, sendPushToAllUsers } from "../lib/push";

const firestore = getFirestore(app);

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  sellerName: string;
}

type CartItem = Product & { quantity: number };

export default function Marketplace() {
  const PAGE_SIZE = 6;
  const deviceId = useMemo(() => Device.modelName || Device.brand + "-id", []);

  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"market" | "cart" | "favorites" | "orders">("market");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [nextId, setNextId] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const CATEGORIES = ["shoes", "phones", "gadgets", "others"];
  const CATEGORY_IMAGES: any = {
    shoes: ["https://images.unsplash.com/photo-1600181956339-44be8b6e5d83?w=800"],
    phones: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800"],
    gadgets: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800"],
    others: ["https://images.unsplash.com/photo-1602524209072-39d1b4db1d38?w=800"],
  };

  const generateProduct = (id: number): Product => {
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    return {
      id: id.toString(),
      name: `${category.toUpperCase()} ITEM`,
      price: Math.floor(Math.random() * 4000000) + 50000,
      category,
      sellerName: "Tech Store",
      image: CATEGORY_IMAGES[category][0],
    };
  };

  // ================= INIT =================
  useEffect(() => {
    const init = async () => {
      const u = await getUserByDeviceId(deviceId);
      if (u) {
        setUser(u);
        setWallet(u.wallet || 200000);
        setCart(u.cart || []);
        setFavorites(u.favorites || []);
        setOrderHistory(u.orderHistory || []);

        // Automatically register push token
        await registerDevicePushToken(u.uid);
      }

      sendLocalNotification("Welcome 👋", "Welcome back to Marketplace");
      loadMoreProducts(true);
    };
    init();
  }, []);

  // ================= PRODUCTS =================
  const loadMoreProducts = (reset = false) => {
    if (loadingMore) return;
    setLoadingMore(true);

    setTimeout(() => {
      setProducts((prev) => {
        const base = reset ? 1 : nextId;
        const newData: Product[] = [];
        for (let i = 0; i < PAGE_SIZE; i++) newData.push(generateProduct(base + i));
        setNextId(base + PAGE_SIZE);
        return reset ? newData : [...prev, ...newData];
      });
      setLoadingMore(false);
    }, 300);
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory ? p.category === selectedCategory : true;
    return matchSearch && matchCat;
  });

  // ================= FAVORITES =================
  const toggleFavorite = async (product: Product) => {
    let updated;
    const exists = favorites.find(f => f.id === product.id);
    if (exists) updated = favorites.filter(f => f.id !== product.id);
    else updated = [...favorites, product];

    setFavorites(updated);
    if (user) await updateDoc(doc(firestore, "users", user.uid), { favorites: updated });
    sendLocalNotification(exists ? "Removed ❌" : "Saved ❤️", `${product.name}`);
  };

  // ================= CART =================
  const addToCart = (product: Product) => {
    const existing = cart.find(i => i.id === product.id);
    if (existing) setCart(cart.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    else setCart([...cart, { ...product, quantity: 1 }]);
    sendLocalNotification("Cart 🛒", `${product.name} added to cart`);
  };

  const removeFromCart = (id: string) => {
    const item = cart.find(i => i.id === id);
    setCart(cart.filter(i => i.id !== id));
    if (item) sendLocalNotification("Removed ❌", `${item.name} removed from cart`);
  };

  // ================= CHECKOUT =================
  const checkout = async () => {
    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    if (total > wallet) return sendLocalNotification("Failed ❌", "Insufficient balance");

    const newWallet = wallet - total;
    const order = { items: cart, total, date: new Date().toISOString() };
    setWallet(newWallet);
    setCart([]);
    setOrderHistory([...orderHistory, order]);

    if (user) {
      await updateWallet(user.uid, newWallet);
      await updateDoc(doc(firestore, "users", user.uid), { cart: [], orderHistory: [...orderHistory, order] });
    }

    sendLocalNotification("Payment Successful 💸", `Paid UGX ${total.toLocaleString()}`);

    // Push notification to all other users
    await sendPushToAllUsers("Marketplace Purchase", `Someone bought items worth UGX ${total.toLocaleString()}`);
  };

  // ================= RENDER =================
  const renderProduct = ({ item }: any) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.img} />
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.price}>UGX {item.price.toLocaleString()}</Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <TouchableOpacity style={styles.btn} onPress={() => addToCart(item)}>
          <Text style={{ color: "#fff" }}>🛒</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: "pink" }]} onPress={() => toggleFavorite(item)}>
          <Text style={{ color: "#fff" }}>❤️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={{ color: "#32CD32", fontSize: 18, marginBottom: 10 }}>Wallet: UGX {wallet.toLocaleString()}</Text>
      <TextInput placeholder="Search..." style={styles.input} value={search} onChangeText={setSearch} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
            style={[styles.cat, selectedCategory === cat && { backgroundColor: "#32CD32" }]}
          >
            <Text style={{ color: "#fff" }}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={i => i.id}
        numColumns={2}
        onEndReached={() => loadMoreProducts()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#121212" },
  input: { backgroundColor: "#1E1E1E", color: "#fff", padding: 10, borderRadius: 8, marginBottom: 10 },
  card: { flex: 1, backgroundColor: "#1E1E1E", margin: 5, padding: 10, borderRadius: 10 },
  img: { width: "100%", height: 120, borderRadius: 10 },
  name: { color: "#fff", marginTop: 5 },
  price: { color: "#32CD32", marginTop: 2 },
  btn: { backgroundColor: "#32CD32", padding: 6, marginTop: 5, borderRadius: 6 },
  cat: { backgroundColor: "#333", padding: 8, marginRight: 5, borderRadius: 10 },
});
