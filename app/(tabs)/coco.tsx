// MarketPlace.tsx – Full Marketplace with categories, search, cart, checkout

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";

import { firestore, database, auth } from "../../firebase";
import { collection, query, orderBy, limit, startAfter, getDocs, where } from "firebase/firestore";
import { ref, onValue, set } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";

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
// MAIN COMPONENT
// ============================

export default function Marketplace() {
  const [user, setUser] = useState<any>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [wallet, setWallet] = useState(0);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const PAGE_SIZE = 8;

  // ============================
  // AUTH LISTENER
  // ============================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) listenWallet(u.uid);
    });
    return unsubscribe;
  }, []);

  // ============================
  // WALLET LISTENER
  // ============================
  const listenWallet = (uid: string) => {
    const walletRef = ref(database, `wallet/${uid}`);
    return onValue(walletRef, (snap) => {
      const val = snap.val();
      setWallet(typeof val === "number" ? val : 0);
    });
  };

  // ============================
  // LOAD PRODUCTS
  // ============================
  useEffect(() => {
    loadProducts(true);
  }, [category, search]);

  const loadProducts = async (reset = false) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    let q: any = query(collection(firestore, "products"), orderBy("name"), limit(PAGE_SIZE));

    if (category) q = query(collection(firestore, "products"), where("category", "==", category), orderBy("name"), limit(PAGE_SIZE));
    if (reset && search) q = query(collection(firestore, "products"), where("name", ">=", search), where("name", "<=", search + "\uf8ff"), orderBy("name"), limit(PAGE_SIZE));

    if (!reset && lastDoc) q = query(collection(firestore, "products"), orderBy("name"), startAfter(lastDoc), limit(PAGE_SIZE));

    const snap = await getDocs(q);
    const arr: Product[] = [];
    snap.forEach((doc) => arr.push({ id: doc.id, ...(doc.data() as any) }));

    setProducts(reset ? arr : [...products, ...arr]);
    setLastDoc(snap.docs[snap.docs.length - 1] || null);

    setLoading(false);
    setLoadingMore(false);
  };

  const loadMore = () => {
    if (!lastDoc || loadingMore) return;
    loadProducts(false);
  };

  // ============================
  // CART HANDLERS
  // ============================
  const addToCart = (item: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const checkout = async () => {
    if (!user) return Alert.alert("Login first");
    if (cart.length === 0) return Alert.alert("Cart is empty");
    if (wallet < total) return Alert.alert("Insufficient wallet balance");

    try {
      cart.forEach((item) => {
        // In production, you would create orders in Firestore
        // Here we just deduct wallet
      });
      await set(ref(database, `wallet/${user.uid}`), wallet - total);
      setCart([]);
      Alert.alert("Checkout successful!");
    } catch {
      Alert.alert("Checkout failed");
    }
  };

  // ============================
  // AUTH UI
  // ============================
  if (!user) return (
    <View style={styles.center}><Text style={{color:'#fff'}}>Login required</Text></View>
  );

  // ============================
  // MAIN UI
  // ============================
  return (
    <View style={styles.container}>
      <Text style={styles.wallet}>Wallet: UGX {wallet}</Text>

      {/* SEARCH */}
      <TextInput
        placeholder="Search products..."
        placeholderTextColor="#888"
        style={styles.input}
        value={search}
        onChangeText={setSearch}
      />

      {/* CATEGORY TABS */}
      <View style={styles.tabs}>
        {["shoes", "phones", "gadgets", "others"].map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setCategory(category === cat ? null : cat)}
            style={[styles.tab, category === cat && styles.activeTab]}
          >
            <Text style={{color: category === cat ? "#fff" : "#aaa"}}>{cat.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProductCard item={item} addToCart={addToCart} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator /> : null}
      />

      {cart.length > 0 && (
        <TouchableOpacity style={styles.checkout} onPress={checkout}>
          <Text style={{ color: "#fff" }}>Checkout UGX {total}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================
// PRODUCT CARD
// ============================

const ProductCard = ({ item, addToCart }: any) => {
  const fade = useRef(new Animated.Value(0)).current;

  return (
    <TouchableOpacity style={styles.card} onPress={() => addToCart(item)}>
      <Animated.Image
        source={{ uri: item.image }}
        style={{ width: "100%", height: 180, opacity: fade }}
        resizeMode="cover"
        onLoad={() => Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start()}
      />
      <View style={{ padding: 10 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>UGX {item.price}</Text>
        <Text style={styles.seller}>🏪 {item.sellerName}</Text>
      </View>
    </TouchableOpacity>
  );
};

// ============================
// STYLES
// ============================

const styles = StyleSheet.create({
  container: { flex:1, padding:15, backgroundColor:'#121212' },
  wallet: { color:'#32CD32', fontSize:16, marginBottom:10 },
  input: { backgroundColor:'#1E1E1E', color:'#fff', padding:10, borderRadius:8, marginBottom:10 },
  tabs: { flexDirection:'row', justifyContent:'space-around', marginBottom:10 },
  tab: { padding:8, borderRadius:8, borderWidth:1, borderColor:'#555' },
  activeTab: { backgroundColor:'#FF6347', borderColor:'#FF6347' },
  card: { backgroundColor:'#1E1E1E', marginBottom:15, borderRadius:14, overflow:'hidden' },
  name: { color:'#fff', fontSize:16 },
  price: { color:'#2ecc71', fontSize:15 },
  seller: { color:'#aaa', fontSize:12 },
  checkout: { backgroundColor:'#e74c3c', padding:15, alignItems:'center', borderRadius:8, marginTop:10 },
  center: { flex:1, justifyContent:'center', alignItems:'center' }
});
