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
  Dimensions,
  StatusBar,
} from "react-native";

import * as Device from "expo-device";

import {
  getUserByDeviceId,
  updateWallet,
  addToCart as addToCartFire,
  updateDoc,
  doc,
  getFirestore,
} from "../lib/fire";

import {
  sendLocalNotification,
  registerForPushNotifications,
  notifyAllUsers,
} from "../lib/noti";

import { app } from "../../firebase";

const firestore = getFirestore(app);
const { width } = Dimensions.get("window");

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  sellerName: string;
}

type CartItem = Product & { quantity: number };

const CATEGORIES = ["phones", "vehicles", "electronics", "fashion", "others"];

const CATEGORY_IMAGES: any = {
  phones: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800",
  vehicles: "https://images.unsplash.com/photo-1558981406-2e9d6e8c0f0a?w=800",
  electronics: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
  fashion: "https://images.unsplash.com/photo-1525507119028-ed4bd977a94a?w=800",
  others: "https://images.unsplash.com/photo-1602524209072-39d1b4db1d38?w=800",
};

const generateProduct = (id: number): Product => {
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  return {
    id: id.toString(),
    name: `${category.toUpperCase()} ${Math.floor(Math.random() * 900) + 100}`,
    price: Math.floor(Math.random() * 3500000) + 150000,
    category,
    sellerName: "Verified Seller",
    image: CATEGORY_IMAGES[category],
  };
};

export default function JijiMarketplace() {
  const PAGE_SIZE = 8;
  const deviceId = useMemo(() => Device.modelName || "device-id", []);

  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState(2000000);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"market" | "cart" | "favorites" | "orders">("market");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [nextId, setNextId] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Initialize
  useEffect(() => {
    const init = async () => {
      await registerForPushNotifications();

      const u = await getUserByDeviceId(deviceId);
      if (u) {
        setUser(u);
        setWallet(u.wallet || 2000000);
        setCart(u.cart || []);
        setFavorites(u.favorites || []);
        setOrderHistory(u.orderHistory || []);
      }

      sendLocalNotification("👋 Welcome to Jiji Uganda", "Find great deals near you!");
      loadMoreProducts(true);
    };

    init();
  }, []);

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
    }, 400);
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory ? p.category === selectedCategory : true;
    return matchSearch && matchCat;
  });

  // Add to Cart (Firebase synced)
  const handleAddToCart = async (product: Product) => {
    const cartItem = { ...product, quantity: 1, addedAt: new Date().toISOString() };

    // Local state
    const existing = cart.find((i) => i.id === product.id);
    let newCart;
    if (existing) {
      newCart = cart.map((i) =>
        i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
      );
    } else {
      newCart = [...cart, cartItem];
    }
    setCart(newCart);

    // Firebase
    if (user?.uid) {
      await addToCartFire(user.uid, cartItem);
    }

    sendLocalNotification("🛒 Added!", `${product.name} added to cart`);
  };

  // Toggle Favorite (Firebase synced)
  const toggleFavorite = async (product: Product) => {
    const exists = favorites.find((f) => f.id === product.id);
    let updated;

    if (exists) {
      updated = favorites.filter((f) => f.id !== product.id);
      sendLocalNotification("❤️ Removed", `${product.name} removed from favorites`);
    } else {
      updated = [...favorites, product];
      sendLocalNotification("❤️ Saved", `${product.name} added to favorites`);
    }

    setFavorites(updated);

    if (user?.uid) {
      await updateDoc(doc(firestore, "users", user.uid), { favorites: updated });
    }
  };

  // Checkout with notification broadcast
  const handleCheckout = async () => {
    if (cart.length === 0) return Alert.alert("Empty Cart", "Add items first");

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (total > wallet) {
      sendLocalNotification("❌ Failed", "Insufficient wallet balance");
      return Alert.alert("Insufficient Balance", `You need USh ${total.toLocaleString()}`);
    }

    const newWallet = wallet - total;
    const order = { items: cart, total, date: new Date().toISOString() };

    setWallet(newWallet);
    setCart([]);
    setOrderHistory([...orderHistory, order]);

    if (user?.uid) {
      await updateWallet(user.uid, newWallet);
      await updateDoc(doc(firestore, "users", user.uid), {
        cart: [],
        orderHistory: [...orderHistory, order],
      });
    }

    // Local + Global notifications
    await sendLocalNotification("💸 Payment Successful!", `You paid USh ${total.toLocaleString()}`);
    await notifyAllUsers("🛒 New Sale on Jiji!", `Someone just bought items worth USh ${total.toLocaleString()}`);

    Alert.alert("✅ Success", `Checkout complete!\nTotal: USh ${total.toLocaleString()}`);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((i) => i.id !== id));
    sendLocalNotification("🗑️ Removed", "Item removed from cart");
  };

  // Render Product Card (Jiji Style)
  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <Image source={{ uri: item.image }} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productPrice}>USh {item.price.toLocaleString()}</Text>
        <Text style={styles.seller}>{item.sellerName}</Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.cartBtn} onPress={() => handleAddToCart(item)}>
          <Text style={styles.btnText}>🛒</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.favBtn, favorites.some(f => f.id === item.id) && styles.favActive]}
          onPress={() => toggleFavorite(item)}
        >
          <Text style={styles.btnText}>❤️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00B140" />

      {/* Green Jiji Header */}
      <View style={styles.greenHeader}>
        <Text style={styles.headerTitle}>Jiji Uganda</Text>
        <Text style={styles.walletHeader}>
          Wallet: <Text style={{ color: wallet < 500000 ? '#FF3B30' : '#4ADE80' }}>USh {wallet.toLocaleString()}</Text>
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="What are you looking for?"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#999"
        />
      </View>

      {view === "market" && (
        <>
          {/* Categories */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                style={[styles.categoryChip, selectedCategory === cat && styles.activeChip]}
              >
                <Text style={selectedCategory === cat ? styles.activeChipText : styles.chipText}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Product Grid */}
          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(i) => i.id}
            numColumns={2}
            contentContainerStyle={styles.grid}
            onEndReached={() => loadMoreProducts()}
            onEndReachedThreshold={0.5}
          />
        </>
      )}

      {/* Cart View */}
      {view === "cart" && (
        <View style={styles.cartView}>
          {cart.length === 0 ? (
            <Text style={styles.emptyText}>Your cart is empty 🛒</Text>
          ) : (
            <>
              <FlatList
                data={cart}
                keyExtractor={(i) => i.id}
                renderItem={({ item }) => (
                  <View style={styles.cartItem}>
                    <Image source={{ uri: item.image }} style={styles.cartImage} />
                    <View style={styles.cartInfo}>
                      <Text style={styles.cartName}>{item.name}</Text>
                      <Text style={styles.cartPrice}>USh {(item.price * item.quantity).toLocaleString()}</Text>
                      <Text>Qty: {item.quantity}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                      <Text style={{ color: "red", fontSize: 18 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
              <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
                <Text style={styles.checkoutText}>
                  Checkout - USh {cart.reduce((sum, i) => sum + i.price * i.quantity, 0).toLocaleString()}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Favorites & Orders Views (simplified for now) */}
      {view === "favorites" && (
        <FlatList
          data={favorites}
          renderItem={renderProduct}
          keyExtractor={(i) => i.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
        />
      )}

      {view === "orders" && (
        <View style={styles.ordersView}>
          <Text style={styles.emptyText}>Order history coming soon 📦</Text>
        </View>
      )}

      {/* Bottom Navigation - Jiji Style */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setView("market")}>
          <Text style={[styles.navIcon, view === "market" && styles.activeNav]}>🏠</Text>
          <Text style={[styles.navLabel, view === "market" && styles.activeNav]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setView("favorites")}>
          <Text style={[styles.navIcon, view === "favorites" && styles.activeNav]}>❤️</Text>
          <Text style={[styles.navLabel, view === "favorites" && styles.activeNav]}>Saved</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setView("cart")}>
          <Text style={[styles.navIcon, view === "cart" && styles.activeNav]}>🛒</Text>
          <Text style={[styles.navLabel, view === "cart" && styles.activeNav]}>Cart ({cart.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setView("orders")}>
          <Text style={[styles.navIcon, view === "orders" && styles.activeNav]}>📦</Text>
          <Text style={[styles.navLabel, view === "orders" && styles.activeNav]}>Orders</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ================= STYLES (Modern Jiji-inspired) =================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  greenHeader: { backgroundColor: "#00B140", paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  walletHeader: { color: "#fff", fontSize: 15, marginTop: 6, opacity: 0.9 },

  searchContainer: { padding: 16, backgroundColor: "#121212" },
  searchInput: { backgroundColor: "#1E1E1E", color: "#fff", padding: 14, borderRadius: 12, fontSize: 16 },

  categoryScroll: { backgroundColor: "#121212", paddingVertical: 10 },
  categoryChip: { backgroundColor: "#222", paddingHorizontal: 18, paddingVertical: 8, marginHorizontal: 6, borderRadius: 20 },
  activeChip: { backgroundColor: "#00B140" },
  chipText: { color: "#ccc" },
  activeChipText: { color: "#000", fontWeight: "600" },

  grid: { padding: 12 },
  productCard: { flex: 1, backgroundColor: "#1A1A1A", margin: 6, borderRadius: 16, overflow: "hidden" },
  productImage: { width: "100%", height: 140, resizeMode: "cover" },
  productInfo: { padding: 12 },
  productName: { color: "#fff", fontSize: 15, fontWeight: "600", marginBottom: 4 },
  productPrice: { color: "#00B140", fontSize: 17, fontWeight: "700" },
  seller: { color: "#888", fontSize: 12, marginTop: 4 },

  cardActions: { flexDirection: "row", justifyContent: "space-between", padding: 12, borderTopWidth: 1, borderTopColor: "#333" },
  cartBtn: { backgroundColor: "#00B140", width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  favBtn: { backgroundColor: "#333", width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  favActive: { backgroundColor: "#FF2D55" },
  btnText: { fontSize: 18 },

  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1A1A1A",
    borderTopWidth: 1,
    borderTopColor: "#333",
    flexDirection: "row",
    paddingVertical: 10,
    paddingBottom: 24,
  },
  navItem: { flex: 1, alignItems: "center" },
  navIcon: { fontSize: 24, color: "#888" },
  navLabel: { fontSize: 11, color: "#888", marginTop: 2 },
  activeNav: { color: "#00B140" },

  // Cart Styles
  cartView: { flex: 1, padding: 16 },
  cartItem: { flexDirection: "row", backgroundColor: "#1A1A1A", marginBottom: 12, borderRadius: 12, padding: 12 },
  cartImage: { width: 70, height: 70, borderRadius: 8 },
  cartInfo: { flex: 1, marginLeft: 12 },
  cartName: { color: "#fff", fontWeight: "600" },
  cartPrice: { color: "#00B140", fontSize: 16, fontWeight: "700" },
  checkoutButton: { backgroundColor: "#00B140", padding: 18, borderRadius: 12, alignItems: "center", marginTop: 20 },
  checkoutText: { color: "#000", fontSize: 18, fontWeight: "700" },

  emptyText: { color: "#888", textAlign: "center", marginTop: 100, fontSize: 16 },
  ordersView: { flex: 1, justifyContent: "center", alignItems: "center" },
});
