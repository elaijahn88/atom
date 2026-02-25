import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
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
    // 🍔 Meals
    {
      id: 1,
      name: "Classic Burger",
      price: 6,
      image:
        "https://images.unsplash.com/photo-1550547660-d9450f859349",
      category: "meal",
    },
    {
      id: 2,
      name: "Pepperoni Pizza",
      price: 10,
      image:
        "https://images.unsplash.com/photo-1548365328-9f547fb0953f",
      category: "meal",
    },
    {
      id: 3,
      name: "Grilled Chicken",
      price: 9,
      image:
        "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d",
      category: "meal",
    },

    // ☕ Chai
    {
      id: 4,
      name: "African Milk Tea",
      price: 2,
      image:
        "https://images.unsplash.com/photo-1517701604599-bb29b565090c",
      category: "chai",
    },
    {
      id: 5,
      name: "Masala Chai",
      price: 3,
      image:
        "https://images.unsplash.com/photo-1589308078054-8323d10d5c1e",
      category: "chai",
    },
    {
      id: 6,
      name: "Black Tea",
      price: 1.5,
      image:
        "https://images.unsplash.com/photo-1509042239860-f550ce710b93",
      category: "chai",
    },
  ];

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showAgentPanel, setShowAgentPanel] = useState(false);

  const addToCart = (item: FoodItem) => {
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

    const newOrder: Order = {
      id: orderId,
      items: cart,
      total,
    };

    setOrders(prev => [newOrder, ...prev]);
    setCart([]);
    setShowCart(false);

    Alert.alert(
      "Order Placed!",
      `Order ID: ${orderId}\nTotal: $${total}\n\nAgent Notified ✅`
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⭐ Star Foods</Text>

      <ScrollView>
        {menu.map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => addToCart(item)}
          >
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={styles.cardContent}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.price}>${item.price}</Text>
              <Text style={styles.category}>
                {item.category === "meal" ? "🍽 Meal" : "☕ Chai"}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Cart Button */}
      <TouchableOpacity
        style={styles.cartButton}
        onPress={() => setShowCart(!showCart)}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>
          🛒 {cart.length}
        </Text>
      </TouchableOpacity>

      {/* Agent Button */}
      <TouchableOpacity
        style={styles.agentButton}
        onPress={() => setShowAgentPanel(!showAgentPanel)}
      >
        <Text style={{ color: "white" }}>📩 Agent</Text>
      </TouchableOpacity>

      {/* Cart Panel */}
      {showCart && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Your Cart</Text>

          {cart.map(item => (
            <Text key={item.id}>
              {item.name} x {item.quantity}
            </Text>
          ))}

          <Text style={{ fontWeight: "bold", marginTop: 10 }}>
            Total: ${total}
          </Text>

          <TouchableOpacity style={styles.checkoutBtn} onPress={checkout}>
            <Text style={{ color: "white" }}>Checkout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Agent Panel (Simulated Notification Inbox) */}
      {showAgentPanel && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Agent Orders 📦</Text>

          {orders.length === 0 && <Text>No orders yet</Text>}

          {orders.map(order => (
            <View key={order.id} style={{ marginBottom: 10 }}>
              <Text style={{ fontWeight: "bold" }}>
                {order.id} - ${order.total}
              </Text>
              {order.items.map(item => (
                <Text key={item.id}>
                  • {item.name} x {item.quantity}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    padding: 15,
  },
  title: {
    fontSize: 26,
    textAlign: "center",
    marginBottom: 15,
    fontWeight: "bold",
    color: "#FF6347",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 15,
    elevation: 4,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 170,
  },
  cardContent: {
    padding: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
  },
  price: {
    color: "#32CD32",
    fontWeight: "bold",
    marginTop: 4,
  },
  category: {
    marginTop: 4,
    color: "#777",
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
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    elevation: 6,
    maxHeight: 350,
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
