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

import {
  getUserByDeviceId,
  updateWallet,
} from "../lib/fire";

import {
  getFirestore,
  doc,
  updateDoc,
} from "firebase/firestore";

import { app } from "../../firebase";

const firestore = getFirestore(app);

// ================= TYPES =================
interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  sellerName: string;
}

type CartItem = Product & { quantity: number };

// ================= DATA =================
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

// ================= MAIN =================
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
      }

      loadMoreProducts(true);
    };

    init();
  }, []);

  // ================= WALLET COLOR =================
  let walletColor = "#32CD32";
  if (wallet < 500000) walletColor = "red";
  else if (wallet > 2000000) walletColor = "blue";

  // ================= PRODUCTS =================
  const loadMoreProducts = (reset = false) => {
    if (loadingMore) return;
    setLoadingMore(true);

    setTimeout(() => {
      setProducts((prev) => {
        const base = reset ? 1 : nextId;
        const newData: Product[] = [];

        for (let i = 0; i < PAGE_SIZE; i++) {
          newData.push(generateProduct(base + i));
        }

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

    if (exists) {
      updated = favorites.filter(f => f.id !== product.id);
    } else {
      updated = [...favorites, product];
    }

    setFavorites(updated);

    if (user) {
      await updateDoc(doc(firestore, "users", user.uid), {
        favorites: updated,
      });
    }
  };

  // ================= CART =================
  const addToCart = (product: Product) => {
    const existing = cart.find(i => i.id === product.id);

    if (existing) {
      setCart(cart.map(i =>
        i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(i => i.id !== id));
  };

  const checkout = async () => {
    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

    if (total > wallet) return Alert.alert("Error", "Insufficient balance");

    const newWallet = wallet - total;
    const order = { items: cart, total, date: new Date().toISOString() };

    setWallet(newWallet);
    setCart([]);
    setOrderHistory([...orderHistory, order]);

    if (user) {
      await updateWallet(user.uid, newWallet);

      await updateDoc(doc(firestore, "users", user.uid), {
        cart: [],
        orderHistory: [...orderHistory, order],
      });
    }

    Alert.alert("Success", `Paid UGX ${total.toLocaleString()}`);
  };

  // ================= UI =================
  const renderProduct = ({ item }: any) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.img} />
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.price}>UGX {item.price.toLocaleString()}</Text>

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <TouchableOpacity style={styles.btn} onPress={() => addToCart(item)}>
          <Text style={{ color: "#fff" }}>🛒</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "pink" }]}
          onPress={() => toggleFavorite(item)}
        >
          <Text style={{ color: "#fff" }}>❤️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* WALLET */}
      <Text style={{ color: walletColor, fontSize: 18, marginBottom: 10 }}>
        Wallet: UGX {wallet.toLocaleString()}
      </Text>

      {/* MARKET */}
      {view === "market" && (
        <>
          <TextInput
            placeholder="Search..."
            style={styles.input}
            value={search}
            onChangeText={setSearch}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
        </>
      )}

      {/* CART */}
      {view === "cart" && (
        <>
          <FlatList
            data={cart}
            keyExtractor={i => i.id}
            renderItem={({ item }) => (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 5 }}>
                <Text style={{ color: "#fff" }}>
                  {item.name} x {item.quantity}
                </Text>
                <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                  <Text style={{ color: "red" }}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          />

          <TouchableOpacity style={styles.checkout} onPress={checkout}>
            <Text style={{ color: "#fff" }}>Checkout</Text>
          </TouchableOpacity>
        </>
      )}

      {/* FAVORITES */}
      {view === "favorites" && (
        <>
          {favorites.length === 0 ? (
            <Text style={{ color: "#aaa", textAlign: "center" }}>
              No favorites yet ❤️
            </Text>
          ) : (
            <FlatList
              data={favorites}
              keyExtractor={i => i.id}
              numColumns={2}
              renderItem={renderProduct}
            />
          )}
        </>
      )}

      {/* ORDERS */}
      {view === "orders" && (
        <FlatList
          data={orderHistory}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => (
            <Text style={{ color: "#fff" }}>
              UGX {item.total.toLocaleString()}
            </Text>
          )}
        />
      )}

      {/* BOTTOM NAV */}
      <View style={styles.bottom}>
        <TouchableOpacity onPress={() => setView("market")}>
          <Text style={[styles.nav, view === "market" && { color: "#32CD32" }]}>🏬</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setView("cart")}>
          <Text style={[styles.nav, view === "cart" && { color: "#32CD32" }]}>🛒</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setView("favorites")}>
          <Text style={[styles.nav, view === "favorites" && { color: "#32CD32" }]}>❤️</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setView("orders")}>
          <Text style={[styles.nav, view === "orders" && { color: "#32CD32" }]}>📦</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, paddingBottom: 80, backgroundColor: "#121212" },

  input: { backgroundColor: "#1E1E1E", color: "#fff", padding: 10, borderRadius: 8, marginBottom: 10 },

  card: { flex: 1, backgroundColor: "#1E1E1E", margin: 5, padding: 10, borderRadius: 10 },
  img: { width: "100%", height: 120, borderRadius: 10 },
  name: { color: "#fff" },
  price: { color: "#32CD32" },

  btn: { backgroundColor: "#32CD32", padding: 6, marginTop: 5, borderRadius: 6 },

  cat: { backgroundColor: "#333", padding: 8, marginRight: 5, borderRadius: 10 },

  checkout: { backgroundColor: "red", padding: 12, marginTop: 10, borderRadius: 10 },

  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#1E1E1E",
    padding: 10,
  },

  nav: { color: "#fff", fontSize: 18 },
});
