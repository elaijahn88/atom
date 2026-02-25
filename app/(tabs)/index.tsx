import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  RefreshControl,
  Switch,
} from "react-native";

interface FoodItem {
  id: number;
  name: string;
  price: number;
  image: string;
  category: "meal" | "chai";
}

type CartItem = FoodItem & { quantity: number };

interface Order {
  id: string;
  items: CartItem[];
  total: number;
}

const App = () => {
  const menu: FoodItem[] = [
    {
      id: 1,
      name: "Classic Burger",
      price: 6,
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
      category: "meal",
    },
    {
      id: 2,
      name: "Pepperoni Pizza",
      price: 10,
      image: "https://images.unsplash.com/photo-1601924638867-3ec2c1c2f8d6?w=800",
      category: "meal",
    },
    {
      id: 3,
      name: "Grilled Chicken",
      price: 9,
      image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800",
      category: "meal",
    },
    {
      id: 4,
      name: "African Milk Tea",
      price: 2,
      image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800",
      category: "chai",
    },
    {
      id: 5,
      name: "Masala Chai",
      price: 3,
      image: "https://images.unsplash.com/photo-1542444459-db63c5d4d8d5?w=800",
      category: "chai",
    },
    {
      id: 6,
      name: "Black Tea",
      price: 1.5,
      image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800",
      category: "chai",
    },
  ];

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const cartScale = useRef(new Animated.Value(1)).current;

  const addToCart = (item: FoodItem) => {
    Animated.sequence([
      Animated.timing(cartScale, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.timing(cartScale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const checkout = () => {
    if (cart.length === 0) {
      Alert.alert("Cart is empty!");
      return;
    }

    const orderId = "ORD-" + Math.floor(Math.random() * 100000);

    setOrders(prev => [
      { id: orderId, items: cart, total },
      ...prev,
    ]);

    setCart([]);
    setShowCart(false);

    Alert.alert(
      "Order Placed!",
      `Order ID: ${orderId}\nTotal: $${total}\n\nAgent Notified ✅`
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const theme = darkMode
    ? { background: "#121212", text: "#fff", card: "#1E1E1E" }
    : { background: "#F8F9FA", text: "#000", card: "#fff" };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: "#FF6347" }]}>
           cocks 
        </Text>
        <Switch value={darkMode} onValueChange={setDarkMode} />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {menu.map(item => (
          <FoodCard
            key={item.id}
            item={item}
            addToCart={addToCart}
            theme={theme}
          />
        ))}
      </ScrollView>

      {/* Cart Button */}
      <Animated.View style={{ transform: [{ scale: cartScale }] }}>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => setShowCart(!showCart)}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>
            🛒 {cart.length}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Agent Button */}
      <TouchableOpacity
        style={styles.agentButton}
        onPress={() => setShowAgentPanel(!showAgentPanel)}
      >
        <Text style={{ color: "white" }}>📩 Agent</Text>
      </TouchableOpacity>

      {/* Cart Panel */}
      {showCart && (
        <View style={[styles.panel, { backgroundColor: theme.card }]}>
          <Text style={[styles.panelTitle, { color: theme.text }]}>
            Your Cart
          </Text>

          {cart.map(item => (
            <Text key={item.id} style={{ color: theme.text }}>
              {item.name} x {item.quantity}
            </Text>
          ))}

          <Text style={{ fontWeight: "bold", marginTop: 10, color: theme.text }}>
            Total: ${total}
          </Text>

          <TouchableOpacity style={styles.checkoutBtn} onPress={checkout}>
            <Text style={{ color: "white" }}>Checkout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Agent Panel */}
      {showAgentPanel && (
        <View style={[styles.panel, { backgroundColor: theme.card }]}>
          <Text style={[styles.panelTitle, { color: theme.text }]}>
            Agent Orders 📦
          </Text>

          {orders.length === 0 && (
            <Text style={{ color: theme.text }}>No orders yet</Text>
          )}

          {orders.map(order => (
            <View key={order.id} style={{ marginBottom: 10 }}>
              <Text style={{ fontWeight: "bold", color: theme.text }}>
                {order.id} - ${order.total}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const FoodCard = ({ item, addToCart, theme }: any) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(true);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card }]}
      onPress={() => addToCart(item)}
    >
      <View>
        {loading && (
          <ActivityIndicator
            size="large"
            color="#FF6347"
            style={styles.loader}
          />
        )}

        <Animated.Image
          source={{ uri: item.image }}
          style={[styles.image, { opacity: fadeAnim }]}
          resizeMode="cover"
          onLoad={() => {
            setLoading(false);
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }).start();
          }}
        />
      </View>

      <View style={styles.cardContent}>
        <Text style={[styles.name, { color: theme.text }]}>
          {item.name}
        </Text>
        <Text style={styles.price}>${item.price}</Text>
        <Text style={{ color: theme.text }}>
          {item.category === "meal" ? "🍽 Meal" : "☕ Chai"}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default App;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 10,
  },
  card: {
    borderRadius: 20,
    marginBottom: 18,
    elevation: 6,
    overflow: "hidden",
  },
  image: { width: "100%", height: 180 },
  loader: { position: "absolute", top: 70, alignSelf: "center" },
  cardContent: { padding: 14 },
  name: { fontSize: 17, fontWeight: "bold" },
  price: {
    color: "#2ecc71",
    fontWeight: "bold",
    marginTop: 5,
  },
  cartButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#32CD32",
    padding: 15,
    borderRadius: 30,
  },
  agentButton: {
    position: "absolute",
    bottom: 80,
    right: 20,
    backgroundColor: "#1E90FF",
    padding: 12,
    borderRadius: 30,
  },
  panel: {
    position: "absolute",
    bottom: 140,
    left: 10,
    right: 10,
    padding: 15,
    borderRadius: 15,
    elevation: 6,
  },
  panelTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 10,
  },
  checkoutBtn: {
    marginTop: 10,
    backgroundColor: "#FF6347",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});
