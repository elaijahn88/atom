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
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  setDoc,
  arrayUnion,
} from "firebase/firestore";
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
  seller?: string;
  available?: boolean;
};

type CartItem = Product & { quantity: number };

export default function MyStore({ username }: { username: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [search, setSearch] = useState("");
  const [balance, setBalance] = useState(0); // user account balance
  const toastAnim = useRef(new Animated.Value(-60)).current;

  // ✅ Toast animation
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 20, duration: 300, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: -60, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  // ✅ Load products
  const loadProducts = async () => {
    try {
      const docRef = doc(db, "phones", "iphone");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const arr = data.products || [];
        const formatted: Product[] = arr.map((p: any, index: number) => ({
          id: p.id || `item-${index}`,
          name: `iPhone ${p.id || index + 1}`,
          price: p.price,
          image: p.url,
          description: p.description,
          featured: index % 5 === 0,
          seller: p.seller,
          available: p.available,
        }));
        setProducts(formatted);
        showToast("📱 Products loaded successfully!", "success");
      } else {
        showToast("⚠️ No document found for phones/iphone", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("❌ Error loading products", "error");
    }
  };

  // ✅ Realtime products listener
  useEffect(() => {
    const docRef = doc(db, "phones", "iphone");
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const arr = data.products || [];
        const formatted: Product[] = arr.map((p: any, index: number) => ({
          id: p.id || `item-${index}`,
          name: `iPhone ${p.id || index + 1}`,
          price: p.price,
          image: p.url,
          description: p.description,
          featured: index % 5 === 0,
          seller: p.seller,
          available: p.available,
        }));
        setProducts(formatted);
      }
    });
    return () => unsubscribe();
  }, []);

  // ✅ Realtime user balance listener
  useEffect(() => {
    const docRef = doc(db, "acc", username);
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) setBalance(snap.data()?.net || 0);
        else setBalance(0);
      },
      (err) => {
        console.error("Balance listener error:", err);
        setBalance(0);
      }
    );
    return () => unsubscribe();
  }, [username]);

  // ✅ Seed demo products
  const seedProducts = async () => {
    const products = [
      { id: "1", url: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone15pro-max-titanium", description: "iPhone 15 Pro Max — Titanium build, A17 Pro chip, 48MP camera.", price: 1499, seller: "+256701234567", available: true },
      { id: "2", url: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone15-pro-blue", description: "iPhone 15 Pro — Powerful, efficient, and stylish.", price: 1299, seller: "+256709876543", available: true },
      { id: "3", url: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone15-pink", description: "iPhone 15 — A fresh design with Dynamic Island.", price: 999, seller: "+256777332211", available: true },
      { id: "4", url: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone14-pro", description: "iPhone 14 Pro — Always-on display and ProMotion.", price: 1099, seller: "+256755998877", available: true },
      { id: "5", url: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone14", description: "iPhone 14 — Fast, bright, and beautiful.", price: 899, seller: "+256700889977", available: true },
      { id: "6", url: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone13-pro", description: "iPhone 13 Pro — Smooth performance and long battery life.", price: 799, seller: "+256702223344", available: true },
      { id: "7", url: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone13", description: "iPhone 13 — Compact and powerful with A15 Bionic chip.", price: 699, seller: "+256778889900", available: true },
      { id: "8", url: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone12", description: "iPhone 12 — Reliable performance and 5G ready.", price: 599, seller: "+256701112233", available: true },
      { id: "9", url: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone11", description: "iPhone 11 — Great camera system and value.", price: 499, seller: "+256704567890", available: true },
      { id: "10", url: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-se-2022", description: "iPhone SE (2022) — Compact, affordable, and fast.", price: 399, seller: "+256703221199", available: true },
    ];
    await setDoc(doc(db, "phones", "iphone"), { products });
    showToast("✅ 10 demo products uploaded!", "success");
  };

  // ✅ Add to Cart
  const addToCart = (item: Product) => {
    if (balance < item.price) {
      showToast("⚠️ Insufficient balance!", "error");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) return prev.map((p) => p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p);
      return [...prev, { ...item, quantity: 1 }];
    });
    showToast(`${item.name} added 🛒`, "success");
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((p) => p.id !== id));
    showToast("Removed from cart", "error");
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const renderItem = ({ item }: { item: Product }) => {
    const affordable = balance >= item.price && item.available;
    return (
      <TouchableOpacity style={styles.card} disabled={!affordable}>
        {item.featured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>FEATURED</Text>
          </View>
        )}
        <Image source={{ uri: item.image }} style={styles.image} />
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.description}>{item.description}</Text>
        <Text style={styles.price}>${item.price}</Text>
        <Text style={{ color: "#ccc", fontSize: 12 }}>Seller: {item.seller}</Text>
        <Text style={{ color: item.available ? "#34c759" : "#ff3b30", fontWeight: "600" }}>
          {item.available ? "Available" : "Out of Stock"}
        </Text>

        {!affordable && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={28} color="#fff" />
          </View>
        )}

        <View style={styles.row}>
          <TouchableOpacity
            onPress={() => affordable ? addToCart(item) : showToast("⚠️ Cannot afford!", "error")}
            style={[styles.btn, { backgroundColor: affordable ? "#34c759" : "#555" }]}
            disabled={!affordable}
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
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {toast && (
        <Animated.View
          style={[styles.toast, { backgroundColor: toast.type === "success" ? "#34c759" : "#ff3b30", transform: [{ translateY: toastAnim }] }]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}

      <View style={styles.headerRow}>
        <Text style={styles.header}>Store</Text>
        <Text style={{ color: "#ff7f00", fontWeight: "bold" }}>
          Cart: ${cartTotal.toFixed(2)} | Balance: ${balance.toFixed(2)}
        </Text>
      </View>

      <View style={{ flexDirection: "row", marginHorizontal: 20, marginBottom: 10 }}>
        <TextInput
          placeholder="Search iPhones..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          style={[styles.input, { flex: 1 }]}
        />
        <TouchableOpacity onPress={onRefresh} style={[styles.btn, { marginLeft: 8, backgroundColor: "#00BFFF" }]}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={seedProducts} style={[styles.btn, { marginLeft: 8, backgroundColor: "#ff7f00" }]}>
          <Ionicons name="cloud-upload" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", paddingTop: 40 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: 20, marginBottom: 10 },
  header: { color: "#fff", fontSize: 24, fontWeight: "900" },
  card: { width: CARD_WIDTH, backgroundColor: "#1e1e1e", borderRadius: 12, padding: 10, margin: 8 },
  image: { width: "100%", height: CARD_WIDTH, borderRadius: 10 },
  title: { color: "#fff", fontWeight: "700", marginTop: 8 },
  description: { color: "#aaa", fontSize: 12, marginTop: 4 },
  price: { color: "#ff7f00", fontWeight: "800", marginTop: 6 },
  row: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8, gap: 8 },
  btn: { padding: 8, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  featuredBadge: { position: "absolute", top: 6, left: 6, backgroundColor: "#ff7f00", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  featuredText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  toast: { position: "absolute", top: 20, left: 20, right: 20, padding: 12, borderRadius: 10, zIndex: 999, elevation: 5 },
  toastText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  input: { backgroundColor: "#1f1f1f", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: "#fff" },
  lockOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", borderRadius: 12, zIndex: 2 },
});
