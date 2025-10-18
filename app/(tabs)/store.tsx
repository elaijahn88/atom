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
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

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
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [search, setSearch] = useState("");
  const toastAnim = useRef(new Animated.Value(-60)).current;

  // ✅ Load all fields dynamically
  const loadProducts = async () => {
    try {
      const docRef = doc(db, "phones", "iphone");
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();
        const arr: Product[] = [];

        // Loop through all fields dynamically
        Object.entries(data).forEach(([key, value], index) => {
          if (typeof value === "string" && value.startsWith("http")) {
            arr.push({
              id: key,
              name: `iPhone ${key}`,
              price: (index + 1) * 10,
              image: value,
              description: `Apple iPhone ${key} — sleek and powerful.`,
              featured: (index + 1) % 5 === 0, // mark every 5th as featured
            });
          }
        });

        setProducts(arr);
        showToast("📱 Products loaded successfully!", "success");
      } else {
        showToast("⚠️ No document found for phones/iphone", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("❌ Error loading products", "error");
    }
  };

  // ✅ Realtime listener for document updates
  useEffect(() => {
    const docRef = doc(db, "phones", "iphone");
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const arr: Product[] = [];

        Object.entries(data).forEach(([key, value], index) => {
          if (typeof value === "string" && value.startsWith("http")) {
            arr.push({
              id: key,
              name: `iPhone ${key}`,
              price: (index + 1) * 10,
              image: value,
              description: `Apple iPhone ${key} — sleek and powerful.`,
              featured: (index + 1) % 5 === 0,
            });
          }
        });

        setProducts(arr);
      }
    });
    return () => unsubscribe();
  }, []);

  // ✅ Toast animation
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 20, duration: 300, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: -60, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  // ✅ Refresh logic
  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  // ✅ Cart logic
  const addToCart = (item: Product) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) =>
          p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    showToast(`${item.name} added 🛒`, "success");
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((p) => p.id !== id));
    showToast("Removed from cart ", "error");
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // ✅ Search filter
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity style={styles.card}>
      {item.featured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredText}>FEATURED</Text>
        </View>
      )}
      <Image source={{ uri: item.image }} style={styles.image} />
      <Text style={styles.title}>{item.name}</Text>
      <Text style={styles.description}>{item.description}</Text>
      <Text style={styles.price}>${item.price}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => addToCart(item)}
          style={[styles.btn, { backgroundColor: "#34c759" }]}
        >
          <Ionicons name="cart" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => removeFromCart(item.id)}
          style={[styles.btn, { backgroundColor: "#ff3b30" }]}
        >
          <Ionicons name="trash-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
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
        <Text style={styles.header}>Store</Text>
        <Text style={{ color: "#ff7f00", fontWeight: "bold" }}>
          Cart: ${cartTotal.toFixed(2)}
        </Text>
      </View>

      {/* ✅ Search bar */}
      <View style={{ flexDirection: "row", marginHorizontal: 20, marginBottom: 10 }}>
        <TextInput
          placeholder="Search iPhones..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          style={[styles.input, { flex: 1 }]}
        />
        <TouchableOpacity
          onPress={onRefresh}
          style={[styles.btn, { marginLeft: 8, backgroundColor: "#00BFFF" }]}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ✅ Product Grid */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", paddingTop: 40 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 10,
  },
  header: { color: "#fff", fontSize: 24, fontWeight: "900" },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 10,
    margin: 8,
  },
  image: { width: "100%", height: CARD_WIDTH, borderRadius: 10 },
  title: { color: "#fff", fontWeight: "700", marginTop: 8 },
  description: { color: "#aaa", fontSize: 12, marginTop: 4 },
  price: { color: "#ff7f00", fontWeight: "800", marginTop: 6 },
  row: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8, gap: 8 },
  btn: { padding: 8, borderRadius: 8, alignItems: "center", justifyContent: "center" },
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
  toast: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 10,
    zIndex: 999,
    elevation: 5,
  },
  toastText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  input: {
    backgroundColor: "#1f1f1f",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#fff",
  },
});
