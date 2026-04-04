// MarketplaceWithVisuals.tsx – Marketplace + Wallet + Cart + Favorites + Order History (horizontal UI)
import React, { useState, useEffect } from "react";
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

import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
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
const SELLERS = ["Nike Store", "Apple Store", "Samsung Store", "Tech Store"];

const CATEGORY_IMAGES: { [key: string]: string[] } = {
  shoes: ["https://images.unsplash.com/photo-1600181956339-44be8b6e5d83?w=800"],
  phones: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800"],
  gadgets: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800"],
  others: ["https://images.unsplash.com/photo-1602524209072-39d1b4db1d38?w=800"],
};

const generateProduct = (id: number): Product => {
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const name = `${category.toUpperCase()} ITEM`;
  const sellerName = SELLERS[Math.floor(Math.random() * SELLERS.length)];
  const price = Math.floor(Math.random() * 4000000) + 50000;
  const image = CATEGORY_IMAGES[category][0];
  return { id: id.toString(), name, price, category, sellerName, image };
};

// ============================
// MAIN COMPONENT
// ============================

export default function MarketplaceWithVisuals({ userId }: { userId: string }) {
  const PAGE_SIZE = 6;

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wallet, setWallet] = useState(0);
  const [username, setUsername] = useState("");
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextId, setNextId] = useState(1);
  const [view, setView] = useState<"market" | "cart" | "favorites" | "orders">("market");

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
        setUsername(data.username || "User");
        setFavorites(data.favorites || []);
        setOrderHistory(data.orderHistory || []);
      } else {
        await setDoc(userRef, {
          wallet: 5000000,
          cart: [],
          username: "User",
          favorites: [],
          orderHistory: [],
        });
        setWallet(5000000);
        setUsername("User");
        setFavorites([]);
        setOrderHistory([]);
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

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const loadMoreProducts = (reset = false) => {
    if (loadingMore) return;
    setLoadingMore(true);

    setTimeout(() => {
      const newProducts: Product[] = [];
      for (let i = 0; i < PAGE_SIZE; i++) {
        newProducts.push(generateProduct(nextId + i));
      }
      setNextId(nextId + PAGE_SIZE);
      setProducts(reset ? newProducts : [...products, ...newProducts]);
      setLoadingMore(false);
    }, 300);
  };

  useEffect(() => {
    loadMoreProducts(true);
  }, [search]);

  // ============================
  // CART LOGIC
  // ============================

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      setCart(cart.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    sendLocalNotification("Added to Cart", product.name);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const checkout = async () => {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (total > wallet) {
      Alert.alert("Error", "Insufficient balance");
      return;
    }

    const newWallet = wallet - total;
    const order = { items: cart, total, date: new Date().toISOString() };
    const newOrderHistory = [...orderHistory, order];

    setWallet(newWallet);
    setCart([]);
    setOrderHistory(newOrderHistory);

    await updateDoc(doc(firestore, "users", userId), {
      wallet: newWallet,
      cart: [],
      orderHistory: arrayUnion(order),
    });

    await update(ref(realtime, `users/${userId}`), {
      wallet: newWallet,
      cart: [],
      orderHistory: newOrderHistory,
    });

    Alert.alert("Success", `Paid UGX ${total.toLocaleString()}`);
    sendLocalNotification("Checkout Successful", `UGX ${total}`);
  };

  // ============================
  // FAVORITES
  // ============================

  const toggleFavorite = async (product: Product) => {
    const exists = favorites.find((f) => f.id === product.id);
    let newFavorites;
    if (exists) {
      newFavorites = favorites.filter((f) => f.id !== product.id);
    } else {
      newFavorites = [...favorites, product];
    }
    setFavorites(newFavorites);

    await updateDoc(doc(firestore, "users", userId), { favorites: newFavorites });
    await update(ref(realtime, `users/${userId}`), { favorites: newFavorites });
  };

  // ============================
  // RENDERERS
  // ============================

  const renderProductCard = (item: Product) => (
    <View style={styles.productCard}>
      <Image source={{ uri: item.image }} style={styles.productImage} />
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={styles.productPrice}>UGX {item.price.toLocaleString()}</Text>

      <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
        <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
          <Text style={{ color: "#fff" }}>🛒</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addBtn} onPress={() => toggleFavorite(item)}>
          <Text style={{ color: "#fff" }}>{favorites.find(f => f.id === item.id) ? "❤️" : "🤍"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCartItem = (item: CartItem) => (
    <View style={styles.scrollCard}>
      <Image source={{ uri: item.image }} style={styles.scrollImage} />
      <Text style={styles.scrollTitle}>{item.name}</Text>
      <Text style={styles.scrollPrice}>UGX {(item.price * item.quantity).toLocaleString()}</Text>
      <Text style={{ color: "#aaa" }}>Qty: {item.quantity}</Text>
      <TouchableOpacity onPress={() => removeFromCart(item.id)}>
        <Text style={{ color: "red", marginTop: 4 }}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFavoriteItem = (item: Product) => (
    <View style={styles.scrollCard}>
      <Image source={{ uri: item.image }} style={styles.scrollImage} />
      <Text style={styles.scrollTitle}>{item.name}</Text>
      <Text style={styles.scrollPrice}>UGX {item.price.toLocaleString()}</Text>
      <TouchableOpacity onPress={() => toggleFavorite(item)}>
        <Text style={{ color: "red", marginTop: 4 }}>Remove ❤️</Text>
      </TouchableOpacity>
    </View>
  );

  const renderOrderItem = (order: any, idx: number) => (
    <View style={styles.scrollCard} key={idx}>
      <Text style={{ color: "#fff", fontWeight: "bold" }}>Order #{idx + 1}</Text>
      <Text style={{ color: "#32CD32" }}>Total: UGX {order.total.toLocaleString()}</Text>
      <Text style={{ color: "#aaa", fontSize: 12 }}>Items:</Text>
      {order.items.map((i: any) => <Text key={i.id} style={{ color: "#fff", fontSize: 12 }}>• {i.name} x {i.quantity}</Text>)}
      <Text style={{ color: "#aaa", fontSize: 10 }}>{new Date(order.date).toLocaleString()}</Text>
    </View>
  );

  // ============================
  // MAIN UI
  // ============================

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
        <Text style={styles.wallet}>Wallet: UGX {wallet.toLocaleString()}</Text>
        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity style={styles.tabBtn} onPress={() => setView("market")}><Text>🏬 Market</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabBtn} onPress={() => setView("cart")}><Text>🛒 Cart</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabBtn} onPress={() => setView("favorites")}><Text>❤️ Fav</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabBtn} onPress={() => setView("orders")}><Text>📦 Orders</Text></TouchableOpacity>
        </View>
      </View>

      {view === "market" && (
        <>
          <TextInput placeholder="Search..." style={styles.input} value={search} onChangeText={setSearch} />
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: "space-between", marginBottom: 15 }}
            renderItem={({ item }) => renderProductCard(item)}
          />
        </>
      )}

      {view === "cart" && (
        <FlatList
          horizontal
          data={cart}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderCartItem(item)}
          showsHorizontalScrollIndicator={false}
        />
      )}

      {view === "favorites" && (
        <FlatList
          horizontal
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderFavoriteItem(item)}
          showsHorizontalScrollIndicator={false}
        />
      )}

      {view === "orders" && (
        <FlatList
          horizontal
          data={orderHistory}
          keyExtractor={(_, idx) => idx.toString()}
          renderItem={({ item, index }) => renderOrderItem(item, index)}
          showsHorizontalScrollIndicator={false}
        />
      )}

      {view === "cart" && cart.length > 0 && (
        <TouchableOpacity style={styles.checkoutBtn} onPress={checkout}>
          <Text style={{ color: "#fff", textAlign: "center" }}>Checkout ({cart.length})</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================
// STYLES
// ============================

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#121212" },
  wallet: { color: "#32CD32", fontWeight: "bold" },

  input: { backgroundColor: "#1E1E1E", color: "#fff", padding: 10, borderRadius: 8, marginBottom: 10 },

  productCard: { flex: 1, backgroundColor: "#1E1E1E", borderRadius: 10, padding: 10, alignItems: "center", marginHorizontal: 5 },
  productImage: { width: "100%", height: 120, borderRadius: 10, marginBottom: 8 },
  productName: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  productPrice: { color: "#32CD32", fontWeight: "bold", marginVertical: 4 },
  addBtn: { backgroundColor: "#32CD32", padding: 6, borderRadius: 6, width: "48%", alignItems: "center" },

  scrollCard: { width: 180, marginRight: 12, padding: 10, backgroundColor: "#1E1E1E", borderRadius: 10 },
  scrollImage: { width: "100%", height: 120, borderRadius: 10, marginBottom: 6 },
  scrollTitle: { color: "#fff", fontWeight: "bold" },
  scrollPrice: { color: "#32CD32", marginBottom: 4 },

  checkoutBtn: { backgroundColor: "#FF6347", padding: 14, borderRadius: 10, marginTop: 10 },
  tabBtn: { backgroundColor: "#333", padding: 6, marginHorizontal: 2, borderRadius: 6 },
});
