import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Dimensions,
  Linking,
  PanResponder,
} from "react-native";

interface FoodItem {
  id: number;
  name: string;
  price: number;
  image: string;
  category: "meal" | "chai";
  ownerName: string;
  ownerPhone: string;
  ownerLocation: string;
}

type CartItem = FoodItem & { quantity: number };

const menu: FoodItem[] = [
  { id: 1, name: "Classic Burger", price: 6, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800", category: "meal", ownerName: "Restaurant One", ownerPhone: "+256700000001", ownerLocation: "Kampala" },
  { id: 2, name: "Pepperoni Pizza", price: 10, image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800", category: "meal", ownerName: "Pizza Hub", ownerPhone: "+256700000002", ownerLocation: "Ntinda" },
  { id: 3, name: "Grilled Chicken", price: 9, image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800", category: "meal", ownerName: "Chicken Spot", ownerPhone: "+256700000003", ownerLocation: "Kawempe" },
  { id: 4, name: "African Milk Tea", price: 2, image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800", category: "chai", ownerName: "Tea Corner", ownerPhone: "+256700000004", ownerLocation: "Mukono" },
];

const { height } = Dimensions.get("window");

const managers = [
  { name: "Manager", phone: "+256756707499" },
  { name: "Supervisor", phone: "0746524088" },
];

const App = () => {
  const [userName] = useState("coco iphoned");
  const [contact] = useState("+256757032685");
  const [walletBalance, setWalletBalance] = useState(50);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);

  const cartScale = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(height)).current;

  // Snap points
  const PARTIAL = height * 0.35;
  const FULL = 0;
  const CLOSED = height;

  // PanResponder for drag gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0 || gestureState.dy < 0) panY.setValue(gestureState.dy + (cartVisible ? PARTIAL : CLOSED));
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -100) snapTo(FULL); // dragged up
        else if (gestureState.dy > 100) closeCart(); // dragged down
        else snapTo(cartVisible ? PARTIAL : CLOSED); // small movement, snap back
      },
    })
  ).current;

  useEffect(() => {
    snapTo(cartVisible ? PARTIAL : CLOSED);
    Animated.timing(overlayOpacity, { toValue: cartVisible ? 0.5 : 0, duration: 300, useNativeDriver: true }).start();
  }, [cartVisible]);

  const snapTo = (toValue: number) => {
    Animated.spring(panY, { toValue, useNativeDriver: true, tension: 50, friction: 12 }).start();
  };

  const addToCart = (item: FoodItem) => {
    Animated.sequence([
      Animated.timing(cartScale, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.timing(cartScale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const increaseQty = (id: number) => setCart(cart.map((c) => (c.id === id ? { ...c, quantity: c.quantity + 1 } : c)));
  const decreaseQty = (id: number) => setCart(cart.map((c) => (c.id === id ? { ...c, quantity: c.quantity - 1 } : c)).filter((c) => c.quantity > 0));
  const removeItem = (id: number) => setCart(cart.filter((c) => c.id !== id));

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const checkout = () => {
    if (walletBalance < total) return alert("Insufficient balance");
    setWalletBalance(walletBalance - total);
    setCart([]);
    closeCart();
    alert("Order placed successfully!");
  };

  const callNumber = (number: string) => Linking.openURL(`tel:${number}`);

  const openCart = () => setCartVisible(true);
  const closeCart = () => {
    setCartVisible(false);
    snapTo(CLOSED);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{userName}</Text>
      <Text style={{ color: "#aaa" }}>{contact}</Text>
      <Text style={styles.walletText}>Wallet: ${walletBalance}</Text>

      <ScrollView>
        {menu.map((item) => (
          <FoodCard key={item.id} item={item} addToCart={addToCart} />
        ))}

        <View style={{ marginTop: 20 }}>
          {managers.map((m) => (
            <TouchableOpacity key={m.phone} onPress={() => callNumber(m.phone)} style={styles.managerBtn}>
              <Text style={{ color: "#fff" }}>{m.name}: {m.phone}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {cart.length > 0 && (
        <Animated.View style={[styles.floatingCart, { transform: [{ scale: cartScale }] }]}>
          <TouchableOpacity onPress={openCart}>
            <Text style={{ color: "#fff" }}>🛒 {cart.length} | ${total}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {cartVisible && (
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={closeCart} />
        </Animated.View>
      )}

      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.cartScreen, { transform: [{ translateY: panY }] }]}
      >
        <Text style={styles.cartTitle}>Your Cart</Text>
        <ScrollView>
          {cart.map((item) => (
            <View key={item.id} style={styles.cartItem}>
              <Text style={{ color: "#fff" }}>{item.name}</Text>
              <Text style={{ color: "#2ecc71" }}>
                ${item.price} x {item.quantity} = ${item.price * item.quantity}
              </Text>
              <View style={styles.qtyButtons}>
                <TouchableOpacity onPress={() => decreaseQty(item.id)}><Text style={styles.qtyBtn}>-</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => increaseQty(item.id)}><Text style={styles.qtyBtn}>+</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => removeItem(item.id)}><Text style={styles.qtyBtn}>🗑</Text></TouchableOpacity>
              </View>
            </View>
          ))}
          <Text style={styles.totalText}>Total: ${total}</Text>
          <TouchableOpacity style={styles.checkoutBtn} onPress={checkout}><Text style={{ color: "#fff" }}>Checkout</Text></TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 10 }} onPress={closeCart}><Text style={{ color: "#FF6347", textAlign: "center" }}>Close Cart</Text></TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const FoodCard = ({ item, addToCart }: any) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(true);

  return (
    <TouchableOpacity style={styles.card} onPress={() => addToCart(item)}>
      {loading && <ActivityIndicator style={{ marginTop: 60 }} />}
      <Animated.Image
        source={{ uri: item.image }}
        style={{ width: "100%", height: 180, opacity: fadeAnim }}
        onLoad={() => {
          setLoading(false);
          Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        }}
      />
      <View style={{ padding: 10 }}>
        <Text style={{ color: "#fff" }}>{item.name}</Text>
        <Text style={{ color: "#2ecc71" }}>${item.price}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default App;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 15 },
  title: { fontSize: 24, color: "#FF6347", fontWeight: "bold", marginBottom: 10 },
  walletText: { color: "#32CD32", fontSize: 18, marginBottom: 15 },
  card: { backgroundColor: "#1E1E1E", marginBottom: 15, borderRadius: 15, overflow: "hidden" },

  managerBtn: { padding: 10, backgroundColor: "#333", marginBottom: 10, borderRadius: 8 },

  floatingCart: { position: "absolute", bottom: 20, right: 20, backgroundColor: "#FF6347", padding: 15, borderRadius: 50 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#000" },

  cartScreen: { position: "absolute", bottom: 0, left: 0, right: 0, height: "100%", backgroundColor: "#1E1E1E", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 15 },
  cartTitle: { fontSize: 20, color: "#FF6347", fontWeight: "bold", marginBottom: 15 },
  cartItem: { marginBottom: 10 },
  qtyButtons: { flexDirection: "row", marginTop: 5, alignItems: "center" },
  qtyBtn: { color: "#fff", marginRight: 15, fontSize: 18 },
  totalText: { color: "#2ecc71", fontWeight: "bold", fontSize: 16, marginTop: 10 },
  checkoutBtn: { backgroundColor: "#FF6347", padding: 10, marginTop: 10, borderRadius: 8 },
});
