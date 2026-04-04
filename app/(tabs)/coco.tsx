// MarketplaceWithProfile.tsx – Marketplace + Profile + Wallet + Notifications + Drag Back + Cart + Checkout
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Alert,
  ScrollView,
  PanResponder,
  Image,
} from "react-native";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
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
const SELLERS = ["Nike Store", "Apple Store", "Samsung Store", "Tech Store", "Puma Store", "Sound Store", "Google Store"];
const PRODUCT_NAMES = ["Air", "Boost", "Galaxy", "iPhone", "Pixel", "Headphones", "Laptop", "Tablet", "Sneakers", "Buds"];

const CATEGORY_IMAGES: { [key: string]: string[] } = {
  shoes: [
    "https://images.unsplash.com/photo-1513105737059-ff4a5fef25cc?w=800",
    "https://images.unsplash.com/photo-1600181956339-44be8b6e5d83?w=800",
    "https://images.unsplash.com/photo-1586461574993-c4d21a8b0c65?w=800",
  ],
  phones: [
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800",
    "https://images.unsplash.com/photo-1580910051073-cd1d6f1c5a13?w=800",
    "https://images.unsplash.com/photo-1512499617640-c2f99979a44f?w=800",
  ],
  gadgets: [
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
    "https://images.unsplash.com/photo-1593642532973-d31b6557fa68?w=800",
    "https://images.unsplash.com/photo-1587825140708-5d395f6e52e6?w=800",
  ],
  others: [
    "https://images.unsplash.com/photo-1602524209072-39d1b4db1d38?w=800",
    "https://images.unsplash.com/photo-1582571344366-1b2e3d0bb9d6?w=800",
    "https://images.unsplash.com/photo-1600181956313-2f35f1a1c3f6?w=800",
  ],
};

const generateProduct = (id: number): Product => {
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const name = `${category.charAt(0).toUpperCase() + category.slice(1)} ${PRODUCT_NAMES[Math.floor(Math.random() * PRODUCT_NAMES.length)]}`;
  const sellerName = SELLERS[Math.floor(Math.random() * SELLERS.length)];
  const price = Math.floor(Math.random() * 4000000) + 50000;
  const imagePool = CATEGORY_IMAGES[category];
  const image = imagePool[Math.floor(Math.random() * imagePool.length)];
  return { id: id.toString(), name, price, category, sellerName, image };
};

// ============================
// MAIN COMPONENT
// ============================

export default function MarketplaceWithProfile({ userId }: { userId: string }) {
  const PAGE_SIZE = 6;

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wallet, setWallet] = useState(0);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextId, setNextId] = useState(1);

  const [username, setUsername] = useState("");
  const [location, setLocation] = useState("");
  const [favorites, setFavorites] = useState("");

  const [showProfile, setShowProfile] = useState(false);
  const [showProfileBtn, setShowProfileBtn] = useState(true);

  // ============================
  // DRAG LOGIC
  // ============================

  const dragX = useState(new Animated.Value(0))[0];

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      if (gesture.dx > 0) dragX.setValue(gesture.dx);
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > 120) {
        setShowProfile(false);
        dragX.setValue(0);
      } else {
        Animated.spring(dragX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

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
        setUsername(data.username || "");
        setLocation(data.location || "");
        setFavorites(data.favorites || "");
      } else {
        await setDoc(userRef, { wallet: 5000000, cart: [], username: "", location: "", favorites: "" });
        setWallet(5000000);
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

  const filteredProducts = products.filter((p) => {
    const matchCategory = category ? p.category === category : true;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const loadMoreProducts = (reset = false) => {
    if (loadingMore) return;
    setLoadingMore(true);

    setTimeout(() => {
      const newProducts: Product[] = [];
      for (let i = 0; i < PAGE_SIZE; i++) {
        const id = nextId + i;
        newProducts.push(generateProduct(id));
      }
      setNextId(nextId + PAGE_SIZE);
      setProducts(reset ? newProducts : [...products, ...newProducts]);
      setLoadingMore(false);
    }, 400);
  };

  useEffect(() => {
    loadMoreProducts(true);
  }, [category, search]);

  // ============================
  // PROFILE SAVE
  // ============================

  const saveProfile = async () => {
    await updateDoc(doc(firestore, "users", userId), { username, location, favorites });
    await update(ref(realtime, `users/${userId}`), { username, location, favorites });
    Alert.alert("Saved", "Profile updated successfully");
    sendLocalNotification("Profile Saved", "Your profile has been updated!");
    setShowProfileBtn(false); // Hide profile button after save
  };

  // ============================
  // CART & CHECKOUT
  // ============================

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      setCart(cart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    sendLocalNotification("Added to Cart", `${product.name} added to your cart`);
  };

  const checkout = async () => {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (total > wallet) {
      Alert.alert("Insufficient Wallet", "You do not have enough money to checkout");
      return;
    }

    const newWallet = wallet - total;
    setWallet(newWallet);
    setCart([]);

    // Save wallet and empty cart to Firestore & Realtime DB
    await updateDoc(doc(firestore, "users", userId), { wallet: newWallet, cart: [] });
    await update(ref(realtime, `users/${userId}`), { wallet: newWallet, cart: [] });

    Alert.alert("Checkout Successful", `You paid UGX ${total.toLocaleString()}`);
    sendLocalNotification("Checkout Successful", `You paid UGX ${total.toLocaleString()}`);
  };

  // ============================
  // PROFILE SCREEN
  // ============================

  if (showProfile) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Edit Profile</Text>

        <TextInput placeholder="Username" style={styles.input} value={username} onChangeText={setUsername} />
        <TextInput placeholder="Location" style={styles.input} value={location} onChangeText={setLocation} />
        <TextInput placeholder="Favorites" style={styles.input} value={favorites} onChangeText={setFavorites} />

        <TouchableOpacity style={styles.button} onPress={saveProfile}>
          <Text style={{ color: "#fff", textAlign: "center" }}>Save Profile</Text>
        </TouchableOpacity>

        <Text style={{ color: "#aaa", marginTop: 20 }}>👉 Drag to go back</Text>

        <View style={styles.dragContainer}>
          <Animated.View
            {...panResponder.panHandlers}
            style={[styles.dragButton, { transform: [{ translateX: dragX }] }]}
          >
            <Text style={{ color: "#fff" }}>➡ Drag Back</Text>
          </Animated.View>
        </View>
      </ScrollView>
    );
  }

  // ============================
  // MAIN SCREEN
  // ============================

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={styles.wallet}>Wallet: UGX {wallet.toLocaleString()}</Text>
        {showProfileBtn && (
          <TouchableOpacity style={styles.profileBtn} onPress={() => setShowProfile(true)}>
            <Text style={{ color: "#fff" }}>Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={{ color: "#fff", marginVertical: 10 }}>Hello, {username || "User"}!</Text>

      <TextInput placeholder="Search..." style={styles.input} value={search} onChangeText={setSearch} />

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: "space-between", marginBottom: 15 }}
        renderItem={({ item }) => (
          <View style={styles.productCard}>
            <Image source={{ uri: item.image }} style={styles.productImage} />
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productSeller}>{item.sellerName}</Text>
            <Text style={styles.productPrice}>UGX {item.price.toLocaleString()}</Text>

            <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
              <Text style={{ color: "#fff" }}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {cart.length > 0 && (
        <TouchableOpacity style={styles.checkoutBtn} onPress={checkout}>
          <Text style={{ color: "#fff", textAlign: "center" }}>Checkout ({cart.length} items)</Text>
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
  profileBtn: { backgroundColor: "#FF6347", padding: 8, borderRadius: 6 },
  input: { backgroundColor: "#1E1E1E", color: "#fff", padding: 10, borderRadius: 8, marginBottom: 10 },
  button: { backgroundColor: "#FF6347", padding: 12, borderRadius: 10, marginTop: 10 },
  title: { fontSize: 22, color: "#FF6347", marginBottom: 10 },

  dragContainer: {
    width: "100%",
    height: 60,
    backgroundColor: "#1E1E1E",
    borderRadius: 10,
    justifyContent: "center",
    marginTop: 10,
  },

  dragButton: {
    width: 140,
    height: 50,
    backgroundColor: "#FF6347",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  productCard: {
    flex: 1,
    backgroundColor: "#1E1E1E",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  productImage: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    marginBottom: 8,
  },
  productName: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  productSeller: {
    color: "#aaa",
    fontSize: 12,
    marginBottom: 4,
  },
  productPrice: {
    color: "#32CD32",
    fontWeight: "bold",
    marginBottom: 6,
  },
  addBtn: {
    backgroundColor: "#32CD32",
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
    width: "100%",
    alignItems: "center",
  },
  checkoutBtn: {
    backgroundColor: "#FF6347",
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
  },
});
