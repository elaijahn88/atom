import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Dimensions,
  RefreshControl,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../firebase"; // ✅ make sure this is correct

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  description?: string;
  featured?: boolean;
};

type CartItem = Product & { quantity: number };

export default function MyStore() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterFeatured, setFilterFeatured] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastAnim = useRef(new Animated.Value(-60)).current;

  // ✅ Real-time Firestore listener
  useEffect(() => {
    const docRef = doc(db, "phones", "iphone");

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const productArray = Object.entries(data).map(([id, url]) => ({
          id,
          name: `iPhone ${id}`,
          price: parseFloat(id) * 10, // simple demo price logic
          image: url as string,
          description: `Apple iPhone ${id} — latest innovation.`,
          featured: id === "16" || id === "17",
        }));
        setProducts(productArray);
      } else {
        console.log("No such document!");
      }
    });

    return () => unsubscribe();
  }, []);

  // ✅ Manual refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const docSnap = await getDoc(doc(db, "phones", "iphone"));
      if (docSnap.exists()) {
        const data = docSnap.data();
        const productArray = Object.entries(data).map(([id, url]) => ({
          id,
          name: `iPhone ${id}`,
          price: parseFloat(id) * 10,
          image: url as string,
          description: `Apple iPhone ${id} — latest innovation.`,
          featured: id === "16" || id === "17",
        }));
        setProducts(productArray);
      }
      showToast("Products refreshed 🔄", "success");
    } catch (error) {
      console.error("Refresh error:", error);
      showToast("Error refreshing products ❌", "error");
    }
    setRefreshing(false);
  };

  // ✅ Toast System
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 20, duration: 300, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: -60, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  // ✅ Cart Logic
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    showToast(`${product.name} added to cart ✅`, "success");
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    showToast("Item removed from cart 🗑️", "error");
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePayment = () => {
    showToast(`Checkout $${cartTotal.toFixed(2)} 💰`, "success");
    setCart([]);
    setCartVisible(false);
  };

  // ✅ Filter & Search
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      (!filterFeatured || p.featured)
  );

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: "#1e1e1e" }]}>
      {item.featured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredText}>FEATURED</Text>
        </View>
      )}
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.cardBody}>
        <Text style={[styles.title, { color: "#fff" }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.description, { color: "#aaa" }]} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={[styles.price, { color: "#ff7f00" }]}>${item.price}</Text>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={() => addToCart(item)}
          style={[styles.smallBtn, { backgroundColor: "#34c759" }]}
        >
          <Ionicons name="cart" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => removeFromCart(item.id)}
          style={[styles.smallBtn, { backgroundColor: "#ff3b30" }]}
        >
          <Ionicons name="trash-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: "#121212" }]}>
      {/* ✅ Toast */}
      {toast && (
        <Animated.View
          style={[
            styles.toast,
            {
              backgroundColor: toast.type === "success" ? "#34c759" : "#ff3b30",
              transform: [{ translateY: toastAnim }],
            },
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}

      {/* ✅ Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>My Store</Text>
        <TouchableOpacity onPress={() => setCartVisible(true)}>
          <Ionicons name="cart-outline" size={32} color="#ff7f00" />
          {cart.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cart.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ✅ Search + Filter */}
      <View style={{ flexDirection: "row", marginHorizontal: 20, marginBottom: 10 }}>
        <TextInput
          placeholder="Search products..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          style={[styles.input, { flex: 1, backgroundColor: "#1f1f1f", color: "#fff" }]}
        />
        <TouchableOpacity
          style={[
            styles.smallBtn,
            { marginLeft: 8, backgroundColor: filterFeatured ? "#ff7f00" : "#555" },
          ]}
          onPress={() => setFilterFeatured(!filterFeatured)}
        >
          <Ionicons name="star" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ✅ Product Grid */}
      <FlatList
        data={filteredProducts}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 120 }}
        renderItem={renderProduct}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 10,
  },
  header: { fontSize: 26, fontWeight: "900", color: "#fff" },
  card: {
    width: CARD_WIDTH,
    borderRadius: 14,
    padding: 10,
    margin: 8,
    elevation: 3,
  },
  image: { width: "100%", height: CARD_WIDTH, borderRadius: 10 },
  cardBody: { marginTop: 8 },
  title: { fontWeight: "700", fontSize: 15 },
  description: { fontSize: 12, marginTop: 2 },
  price: { fontWeight: "800", marginTop: 4, fontSize: 16 },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 6,
  },
  smallBtn: {
    padding: 6,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 10,
    zIndex: 999,
    elevation: 5,
  },
  toastText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  cartBadge: {
    position: "absolute",
    right: -6,
    top: -4,
    backgroundColor: "red",
    borderRadius: 10,
    paddingHorizontal: 6,
  },
  cartBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  featuredBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#ff7f00",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  input: {
    backgroundColor: "#333",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 15,
    color: "#fff",
  },
});
