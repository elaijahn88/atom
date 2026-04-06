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
  loginOrCreateUser,
  withdrawMoney,
  UserAccount,
} from "../lib/acc";

const { width, height } = Dimensions.get("window");

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
}

type CartItem = Product & { quantity: number };

export default function Marketplace() {
  const deviceId = useMemo(
    () => Device.modelName || Device.brand + "-id",
    []
  );

  const [user, setUser] = useState<UserAccount | null>(null);
  const [balance, setBalance] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [toast, setToast] = useState({ message: "", visible: false });
  const toastAnim = useMemo(() => new Animated.Value(0), []);

  const [videoVisible, setVideoVisible] = useState(false);
  const [videoKey, setVideoKey] = useState(0);

  const CATEGORIES = ["shoes", "phones", "gadgets", "others"];

  // ================= INIT =================
  useEffect(() => {
    const init = async () => {
      const u = await loginOrCreateUser("Guest");
      setUser(u);
      setBalance(u.balance);
      generateProducts();
    };
    init();
  }, []);

  // ================= PRODUCTS =================
  const generateProducts = () => {
    const list: Product[] = [];

    for (let i = 0; i < 20; i++) {
      const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

      list.push({
        id: i.toString(),
        name: `${cat.toUpperCase()} ITEM`,
        price: Math.floor(Math.random() * 4000000) + 50000,
        category: cat,
        image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
      });
    }

    setProducts(list);
  };

  // ================= VIDEO =================
  const playVideo = () => {
    setVideoKey((prev) => prev + 1);
    setVideoVisible(true);
    setTimeout(() => setVideoVisible(false), 50000);
  };

  // ================= TOAST =================
  const showToast = (message: string) => {
    setToast({ message, visible: true });

    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setToast({ message: "", visible: false }));
      }, 2000);
    });
  };

  // ================= FILTER =================
  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory ? p.category === selectedCategory : true;
    return matchSearch && matchCat;
  });

  // ================= CART =================
  const addToCart = (product: Product) => {
    playVideo();

    const exists = cart.find((c) => c.id === product.id);

    const updated = exists
      ? cart.map((c) =>
          c.id === product.id
            ? { ...c, quantity: c.quantity + 1 }
            : c
        )
      : [...cart, { ...product, quantity: 1 }];

    setCart(updated);
    showToast(`Added ${product.name}`);
  };

  const removeFromCart = (id: string) => {
    playVideo();
    setCart(cart.filter((c) => c.id !== id));
    showToast("Item removed");
  };

  // ================= FAVORITES =================
  const toggleFavorite = (product: Product) => {
    const exists = favorites.find((f) => f.id === product.id);

    const updated = exists
      ? favorites.filter((f) => f.id !== product.id)
      : [...favorites, product];

    setFavorites(updated);
    showToast(exists ? "Removed favorite" : "Added favorite");
    playVideo();
  };

  // ================= CHECKOUT =================
  const checkout = async () => {
    if (!user) return;

    if (cart.length === 0) {
      showToast("Cart empty");
      return;
    }

    const total = cart.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    if (total > balance) {
      showToast("Insufficient balance");
      return;
    }

    try {
      playVideo();

      const newBalance = await withdrawMoney(total);

      setBalance(newBalance);
      setCart([]);

      showToast(`Paid UGX ${total.toLocaleString()}`);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // ================= RENDER =================
  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.img} />
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.price}>
        UGX {item.price.toLocaleString()}
      </Text>

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => addToCart(item)}
        >
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
      <Text style={styles.balance}>
        Balance: UGX {balance.toLocaleString()}
      </Text>

      <TextInput
        placeholder="Search..."
        style={styles.input}
        value={search}
        onChangeText={setSearch}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() =>
              setSelectedCategory(cat === selectedCategory ? null : cat)
            }
            style={[
              styles.cat,
              selectedCategory === cat && { backgroundColor: "#32CD32" },
            ]}
          >
            <Text style={{ color: "#fff" }}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredProducts}
        renderItem={renderItem}
        keyExtractor={(i) => i.id}
        numColumns={2}
      />

      {cart.length > 0 && (
        <TouchableOpacity style={styles.checkoutBtn} onPress={checkout}>
          <Text style={{ color: "#fff", fontWeight: "bold" }}>
            Checkout 🛒
          </Text>
        </TouchableOpacity>
      )}

      {/* VIDEO */}
      {videoVisible && (
        <View style={styles.videoContainer}>
          <Video
            key={videoKey}
            source={{
              uri: "https://www.w3schools.com/html/mov_bbb.mp4",
            }}
            style={styles.video}
            resizeMode="cover"
          />
        </View>
      )}

      {/* TOAST */}
      {toast.visible && (
        <Animated.View
          style={[styles.toast, { opacity: toastAnim }]}
        >
          <Text style={{ color: "#fff" }}>{toast.message}</Text>
        </Animated.View>
      )}
    </View>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#121212" },
  balance: { color: "#32CD32", marginBottom: 10 },
  input: {
    backgroundColor: "#1E1E1E",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  card: {
    flex: 1,
    backgroundColor: "#1E1E1E",
    margin: 5,
    padding: 10,
    borderRadius: 10,
  },
  img: { width: "100%", height: 120, borderRadius: 10 },
  name: { color: "#fff", marginTop: 5 },
  price: { color: "#32CD32" },
  btn: {
    backgroundColor: "#32CD32",
    padding: 6,
    marginTop: 5,
    borderRadius: 6,
  },
  cat: {
    backgroundColor: "#333",
    padding: 8,
    marginRight: 5,
    borderRadius: 10,
  },
  checkoutBtn: {
    backgroundColor: "#32CD32",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 10,
  },
  toast: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "#333",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  videoContainer: {
    position: "absolute",
    top: height / 4,
    left: width / 8,
    width: width * 0.75,
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
  },
  video: { width: "100%", height: "100%" },
});
