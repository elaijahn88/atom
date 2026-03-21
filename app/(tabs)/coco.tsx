import React, { useState, useRef, useEffect } from "react"; import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, Animated, Dimensions, Alert, ActivityIndicator, } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { doc, getDoc, updateDoc, increment, collection, addDoc, serverTimestamp, onSnapshot, } from "firebase/firestore";

import { db, auth } from "../../firebase"; import { onAuthStateChanged, signOut } from "firebase/auth";

const numColumns = 2; const screenWidth = Dimensions.get("window").width; const cardWidth = screenWidth / numColumns - 20;

// Demo products with owner information const demoProducts = [ { id: 1, name: "iPhone 15", price: 6500000, image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569", category: "Phones", ownerName: "Elijah Nabimanya", ownerPhone: "+256700000000", ownerLocation: "Kampala", }, { id: 2, name: "Samsung S23", price: 4200000, image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf", category: "Phones", ownerName: "Sarah K.", ownerPhone: "+256701111111", ownerLocation: "Entebbe", }, { id: 3, name: "MacBook Pro", price: 9500000, image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8", category: "Laptops", ownerName: "Daniel M.", ownerPhone: "+256702222222", ownerLocation: "Kampala", }, { id: 4, name: "Dell XPS", price: 5200000, image: "https://images.unsplash.com/photo-1587614382346-acd977736f90", category: "Laptops", ownerName: "Joy A.", ownerPhone: "+256703333333", ownerLocation: "Mukono", }, { id: 5, name: "Nike Air Max", price: 350000, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff", category: "Shoes", ownerName: "Paul B.", ownerPhone: "+256704444444", ownerLocation: "Kawempe", }, { id: 6, name: "Adidas Ultraboost", price: 400000, image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519", category: "Shoes", ownerName: "Grace N.", ownerPhone: "+256705555555", ownerLocation: "Ntinda", }, ];

const MyStore = () => { const [user, setUser] = useState(null); const [cart, setCart] = useState([]); const [wallet, setWallet] = useState(0);

const [products, setProducts] = useState([]); const [page, setPage] = useState(1); const [loadingMore, setLoadingMore] = useState(false);

const toastAnim = useRef(new Animated.Value(0)).current;

useEffect(() => { const unsub = onAuthStateChanged(auth, (u) => setUser(u)); return unsub; }, []);

useEffect(() => { if (!user) return;

const walletRef = doc(db, "users", user.uid);

const unsub = onSnapshot(walletRef, (snap) => {
  if (snap.exists()) {
    setWallet(snap.data()?.walletBalance || 0);
  }
});

return unsub;

}, [user]);

useEffect(() => { loadMoreProducts(); }, []);

const loadMoreProducts = () => { if (loadingMore) return;

setLoadingMore(true);

setTimeout(() => {
  const newItems = demoProducts.map((item, index) => ({
    ...item,
    id: item.id + page * 100 + index,
  }));

  setProducts((prev) => [...prev, ...newItems]);
  setPage((prev) => prev + 1);
  setLoadingMore(false);
}, 800);

};

const addToCart = (item) => { setCart((prev) => prev.find((p) => p.id === item.id) ? prev : [...prev, item] ); };

const getCartTotal = () => cart.reduce((sum, item) => sum + Number(item.price), 0);

const handlePayment = async () => { if (!user) return Alert.alert("Login required");

const total = getCartTotal();

try {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return Alert.alert("Wallet not found");

  const balance = snap.data()?.walletBalance || 0;

  if (balance < total) {
    return Alert.alert("Insufficient Balance");
  }

  await updateDoc(userRef, {
    walletBalance: increment(-total),
  });

  await addDoc(collection(db, "orders"), {
    userId: user.uid,
    items: cart,
    total,
    createdAt: serverTimestamp(),
  });

  Alert.alert("Success", `UGX ${total.toLocaleString()} paid`);
  setCart([]);
} catch {
  Alert.alert("Payment failed");
}

};

const renderItem = ({ item }) => ( <View style={styles.card}> <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />

<Text style={styles.title}>{item.name}</Text>
  <Text style={styles.category}>{item.category}</Text>

  <Text style={styles.price}>
    {item.price.toLocaleString()} UGX
  </Text>

  <View style={styles.ownerBox}>
    <Text style={styles.ownerName}>👤 {item.ownerName}</Text>
    <Text style={styles.ownerPhone}>📞 {item.ownerPhone}</Text>
    <Text style={styles.ownerLocation}>📍 {item.ownerLocation}</Text>
  </View>

  <TouchableOpacity
    style={styles.addButton}
    onPress={() => addToCart(item)}
  >
    <Ionicons name="cart" size={18} color="#000" />
    <Text style={styles.addText}>Add</Text>
  </TouchableOpacity>
</View>

);

if (!user) { return ( <View style={styles.container}> <Text style={{ color: "#fff" }}> Please login from your main app </Text> </View> ); }

return ( <View style={styles.container}> <View style={styles.walletBar}> <Ionicons name="wallet" size={24} color="#00ffcc" /> <Text style={styles.walletText}> UGX {wallet.toLocaleString()} </Text> </View>

<FlatList
    data={products}
    renderItem={renderItem}
    keyExtractor={(i) => i.id.toString()}
    numColumns={numColumns}
    onEndReached={loadMoreProducts}
    onEndReachedThreshold={0.5}
    ListFooterComponent={
      loadingMore ? <ActivityIndicator color="#00ffcc" /> : null
    }
  />

  {cart.length > 0 && (
    <View style={styles.cartBar}>
      <Text style={styles.cartText}>
        Total: {getCartTotal().toLocaleString()} UGX
      </Text>

      <TouchableOpacity
        style={styles.payButton}
        onPress={handlePayment}
      >
        <Text style={{ color: "#000" }}>Pay</Text>
      </TouchableOpacity>
    </View>
  )}

  <TouchableOpacity
    style={{ position: "absolute", top: 40, right: 20 }}
    onPress={() => signOut(auth)}
  >
    <Text style={{ color: "red" }}>Logout</Text>
  </TouchableOpacity>
</View>

); };

export default MyStore;

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: "#0f0f0f", padding: 10, }, title: { color: "#fff", fontSize: 16, }, category: { color: "#00ffcc", fontSize: 12, }, walletBar: { flexDirection: "row", justifyContent: "center", padding: 10, }, walletText: { color: "#00ffcc", marginLeft: 10, }, card: { backgroundColor: "#1c1c1c", margin: 6, padding: 10, borderRadius: 12, width: cardWidth, }, image: { width: "100%", height: 120, borderRadius: 8, }, price: { color: "#bbb", }, addButton: { backgroundColor: "#00c853", flexDirection: "row", justifyContent: "center", padding: 8, marginTop: 5, borderRadius: 6, }, addText: { marginLeft: 5, }, ownerBox: { marginTop: 6, padding: 6, backgroundColor: "#111", borderRadius: 8, }, ownerName: { color: "#fff", fontSize: 12, }, ownerPhone: { color: "#00ffcc", fontSize: 12, }, ownerLocation: { color: "#aaa", fontSize: 12, }, cartBar: { position: "absolute", bottom: 0, width: "100%", flexDirection: "row", justifyContent: "space-between", padding: 10, backgroundColor: "#000", }, cartText: { color: "#fff", }, payButton: { backgroundColor: "#00c853", padding: 10, borderRadius: 6, }, });
