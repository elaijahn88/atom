// Marketplace.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import * as Device from "expo-device";
import Video from "react-native-video";

import {
  getUserByDevice,
  updateUserWallet,
  updateUserCart,
  updateUserFavorites,
  addUserOrder,
  notifyAllUsers,
  UserAccount,
} from "../lib/acc";
import { sendLocalNotification } from "../lib/noti";

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  sellerName: string;
}

type CartItem = Product & { quantity: number };

const { width, height } = Dimensions.get("window");

export default function Marketplace() {
  const PAGE_SIZE = 6;
  const deviceId = useMemo(() => Device.modelName || Device.brand + "-id", []);

  const [user, setUser] = useState<UserAccount | null>(null);
  const [wallet, setWallet] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [nextId, setNextId] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });
  const toastAnim = useMemo(() => new Animated.Value(0), []);

  // ===== VIDEO PLAYING =====
  const [videoVisible, setVideoVisible] = useState(false);
  const [videoKey, setVideoKey] = useState(0); // re-render video each click

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
      const u = await getUserByDevice(deviceId);
      if (u) {
        setUser(u);
        setWallet(u.wallet);
        setCart(u.cart || []);
        setFavorites(u.favorites || []);
        showToast(`Welcome ${u.username || "Guest"}!`);
      }
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

  // ================= TOAST =================
  const showToast = (message: string) => {
    setToast({ message, visible: true });
    Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToast({ message: "", visible: false }));
      }, 2000);
    });
  };

  // ================= FAVORITES =================
  const toggleFavorite = async (product: Product) => {
    if (!user) return;
    const exists = favorites.find(f => f.id === product.id);
    const updated = exists ? favorites.filter(f => f.id !== product.id) : [...favorites, product];

    setFavorites(updated);
    await updateUserFavorites(user.uid, updated);
    showToast(exists ? `Removed ${product.name}` : `Saved ${product.name}`);
    playVideo();
  };

  // ================= CART =================
  const playVideo = () => {
    setVideoKey(prev => prev + 1);
    setVideoVisible(true);
    setTimeout(() => setVideoVisible(false), 50000); // 50 seconds
  };

  const addToCart = async (product: Product) => {
    if (!user) return;
    playVideo();

    if (wallet < product.price) {
      showToast(`Insufficient UGX ${product.price.toLocaleString()}`);
      return;
    }

    const existing = cart.find(i => i.id === product.id);
    const updatedCart: CartItem[] = existing
      ? cart.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      : [...cart, { ...product, quantity: 1 }];

    const newWallet = wallet - product.price;

    setCart(updatedCart);
    setWallet(newWallet);

    await updateUserCart(user.uid, updatedCart);
    await updateUserWallet(user.uid, newWallet);

    showToast(`Added ${product.name} • Remaining UGX ${newWallet.toLocaleString()}`);
  };

  const removeFromCart = async (id: string) => {
    if (!user) return;
    const item = cart.find(i => i.id === id);
    const updatedCart = cart.filter(i => i.id !== id);
    setCart(updatedCart);
    await updateUserCart(user.uid, updatedCart);
    if (item) showToast(`Removed ${item.name}`);
    playVideo();
  };

  // ================= CHECKOUT =================
  const checkout = async () => {
    if (!user) return;
    if (cart.length === 0) return showToast("Cart Empty");
    playVideo();

    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    if (total > wallet) {
      showToast("Insufficient balance");
      return;
    }

    const newWallet = wallet - total;
    const order = { items: cart, total, date: new Date().toISOString() };

    setWallet(newWallet);
    setCart([]);

    await updateUserWallet(user.uid, newWallet);
    await addUserOrder(user.uid, order);

    showToast(`Payment Successful! Remaining UGX ${newWallet.toLocaleString()}`);
    await notifyAllUsers("Marketplace Purchase", `User ${user.username} bought items worth UGX ${total.toLocaleString()}`);
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
      <Text style={{ color: "#32CD32", fontSize: 16, marginBottom: 5 }}>
        Wallet: UGX {wallet.toLocaleString()} • Device: {deviceId} • User: {user?.username || "Guest"}
      </Text>
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
      {cart.length > 0 && (
        <TouchableOpacity style={styles.checkoutBtn} onPress={checkout}>
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Checkout 🛒</Text>
        </TouchableOpacity>
      )}

      {/* MINI POPUP VIDEO */}
      {videoVisible && (
        <View style={styles.videoContainer}>
          <Video
            key={videoKey}
            source={{ uri: "https://www.w3schools.com/html/mov_bbb.mp4" }} // online video
            style={styles.video}
            resizeMode="cover"
            repeat={false}
            onEnd={() => setVideoVisible(false)}
          />
        </View>
      )}

      {/* TOAST */}
      {toast.visible && (
        <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
          <Text style={{ color: "#fff" }}>{toast.message}</Text>
        </Animated.View>
      )}
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
  checkoutBtn: { backgroundColor: "#32CD32", padding: 14, borderRadius: 12, alignItems: "center", marginVertical: 10 },
  toast: { position: "absolute", bottom: 100, left: 20, right: 20, backgroundColor: "#333", padding: 12, borderRadius: 10, alignItems: "center" },
  videoContainer: {
    position: "absolute",
    top: height / 4,
    left: width / 8,
    width: width * 0.75,
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#32CD32",
  },
  video: { width: "100%", height: "100%" },
});
