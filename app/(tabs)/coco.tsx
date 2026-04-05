// MarketplaceWithVisuals.tsx
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

import { getUserProfile, updateWallet, updateUserProfile } from "../lib/fire";
import { sendLocalNotification, registerForPushNotifications } from "../lib/noti";

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
const SELLERS = ["Nike Store", "Apple Store", "Samsung Store", "Tech Store"];

const CATEGORY_IMAGES: any = {
  shoes: ["https://images.unsplash.com/photo-1600181956339-44be8b6e5d83?w=800"],
  phones: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa8?w=800"],
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
    sellerName: SELLERS[Math.floor(Math.random() * SELLERS.length)],
    image: CATEGORY_IMAGES[category][0],
  };
};

// ================= MAIN =================
export default function MarketplaceWithVisuals({ userId }: { userId: string }) {
  const PAGE_SIZE = 6;

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wallet, setWallet] = useState(0);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextId, setNextId] = useState(1);
  const [view, setView] = useState<"market" | "cart" | "favorites" | "orders">("market");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [notifiedProductIds, setNotifiedProductIds] = useState<string[]>([]);

  // ================= INIT =================
  useEffect(() => {
    const initUser = async () => {
      const profile = await getUserProfile(userId);
      if (profile) {
        setWallet(profile.wallet || 5000000);
        setCart(profile.cart || []);
        setFavorites(profile.favorites || []);
        setOrderHistory(profile.orderHistory || []);
      }
      await registerForPushNotifications();
      sendLocalNotification("Welcome!", "Marketplace ready!");
      loadMoreProducts(true);
    };

    initUser();
  }, []);

  // ================= PRODUCTS =================
  const loadMoreProducts = (reset = false) => {
    if (loadingMore) return;
    setLoadingMore(true);

    setTimeout(() => {
      setProducts((prev) => {
        const baseId = reset ? 1 : nextId;
        const newProducts: Product[] = [];
        for (let i = 0; i < PAGE_SIZE; i++) newProducts.push(generateProduct(baseId + i));
        setNextId(baseId + PAGE_SIZE);
        return reset ? newProducts : [...prev, ...newProducts];
      });
      setLoadingMore(false);
    }, 300);
  };

  const filteredProducts = products.filter((p) => {
    const searchMatch = p.name.toLowerCase().includes(search.toLowerCase());
    const catMatch = selectedCategory ? p.category === selectedCategory : true;
    return searchMatch && catMatch;
  });

  const getRecommendedProducts = () => {
    const liked = [...favorites.map(f => f.category), ...cart.map(c => c.category)];
    return products.filter(p => liked.includes(p.category));
  };

  // ================= RECOMMENDED NOTIFICATIONS =================
  useEffect(() => {
    const recommended = getRecommendedProducts();
    recommended.forEach(p => {
      if (!notifiedProductIds.includes(p.id)) {
        sendLocalNotification("Recommended Product", `${p.name} might interest you!`);
        setNotifiedProductIds(prev => [...prev, p.id]);
      }
    });
  }, [products, favorites, cart]);

  // ================= CART =================
  const addToCart = (product: Product) => {
    const existing = cart.find(i => i.id === product.id);
    const newCart = existing
      ? cart.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      : [...cart, { ...product, quantity: 1 }];

    setCart(newCart);
    updateUserProfile(userId, { cart: newCart });
  };

  const removeFromCart = (id: string) => {
    const newCart = cart.filter(i => i.id !== id);
    setCart(newCart);
    updateUserProfile(userId, { cart: newCart });
  };

  const checkout = async () => {
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    if (total > wallet) return Alert.alert("Error", "Insufficient balance");

    const newWallet = wallet - total;
    const order = { items: cart, total, date: new Date().toISOString() };

    setWallet(newWallet);
    setCart([]);
    setOrderHistory([...orderHistory, order]);

    await updateWallet(userId, newWallet);
    await updateUserProfile(userId, {
      cart: [],
      orderHistory: [...orderHistory, order],
    });

    sendLocalNotification("Success", `Paid UGX ${total.toLocaleString()}`);
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
          style={styles.btn}
          onPress={() => {
            setFavorites([...favorites, item]);
            updateUserProfile(userId, { favorites: [...favorites, item] });
            sendLocalNotification("Added to Favorites", item.name);
          }}
        >
          <Text style={{ color: "#fff" }}>❤️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const recommended = getRecommendedProducts();

  return (
    <View style={styles.container}>
      <Text style={styles.wallet}>Wallet: UGX {wallet.toLocaleString()}</Text>

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

          {recommended.length > 0 && (
            <>
              <Text style={{ color: "#fff", marginVertical: 5 }}>🔥 Recommended</Text>
              <FlatList horizontal data={recommended} renderItem={renderProduct} keyExtractor={i => i.id} />
            </>
          )}

          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            numColumns={2}
            onEndReached={() => loadMoreProducts()}
            onEndReachedThreshold={0.5}
            refreshing={loadingMore}
            onRefresh={() => loadMoreProducts(true)}
            keyExtractor={i => i.id}
          />
        </>
      )}

      {view === "cart" && (
        <>
          <FlatList
            data={cart}
            renderItem={({ item }) => (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                <Text style={{ color: "#fff" }}>{item.name} x{item.quantity}</Text>
                <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                  <Text style={{ color: "red" }}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
            keyExtractor={i => i.id}
          />
          <TouchableOpacity style={styles.checkout} onPress={checkout}>
            <Text style={{ color: "#fff" }}>Checkout</Text>
          </TouchableOpacity>
        </>
      )}

      {view === "orders" && (
        <FlatList
          data={orderHistory}
          renderItem={({ item }) => <Text style={{ color: "#fff" }}>UGX {item.total.toLocaleString()}</Text>}
          keyExtractor={(i, idx) => idx.toString()}
        />
      )}

      {/* BOTTOM NAV */}
      <View style={styles.bottom}>
        <TouchableOpacity onPress={() => setView("market")}><Text style={styles.nav}>🏬</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setView("cart")}><Text style={styles.nav}>🛒</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setView("favorites")}><Text style={styles.nav}>❤️</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setView("orders")}><Text style={styles.nav}>📦</Text></TouchableOpacity>
      </View>
    </View>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, paddingBottom: 70, backgroundColor: "#121212" },
  wallet: { color: "#32CD32", marginBottom: 10 },

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
