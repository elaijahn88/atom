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
  image?: string;
  restaurant: string;
}

type CartItem = FoodItem & { quantity: number };

const App = () => {
  const menu: FoodItem[] = [
    { id: 1, name: "Classic Burger", price: 5, image: "https://i.imgur.com/8q3Z6xU.png", restaurant: "Burger Palace" },
    { id: 2, name: "Cheese Fries", price: 3, image: "https://i.imgur.com/rE9RjEx.png", restaurant: "Burger Palace" },
    { id: 3, name: "Margherita Pizza", price: 8, image: "https://i.imgur.com/e9VQXrE.png", restaurant: "Pizza World" },
    { id: 4, name: "Pepperoni Pizza", price: 10, image: "https://i.imgur.com/e9VQXrE.png", restaurant: "Pizza World" },
    { id: 5, name: "Salmon Roll", price: 12, image: "https://i.imgur.com/KGxI7Ej.png", restaurant: "Sushi House" },
    { id: 6, name: "Tuna Roll", price: 14, image: "https://i.imgur.com/KGxI7Ej.png", restaurant: "Sushi House" },
  ];

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

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

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(c => c.id !== id));
  };

  const changeQuantity = (id: number, delta: number) => {
    setCart(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, quantity: Math.max(c.quantity + delta, 1) }
          : c
      )
    );
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const checkout = () => {
    if (cart.length === 0) {
      Alert.alert("Cart is empty!");
      return;
    }
    Alert.alert("Order placed!", `Total: $${total}`);
    setCart([]);
    setShowCart(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Star Foods</Text>

      <ScrollView>
        {menu.map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => addToCart(item)}
          >
            {item.image && (
              <Image source={{ uri: item.image }} style={styles.image} />
            )}
            <View style={{ padding: 10 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.restaurant}>{item.restaurant}</Text>
              <Text style={styles.price}>${item.price}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Floating Cart Button */}
      <TouchableOpacity
        style={styles.cartButton}
        onPress={() => setShowCart(!showCart)}
      >
        <Text style={{ color: "white" }}>🛒 {cart.length}</Text>
      </TouchableOpacity>

      {/* Cart Panel */}
      {showCart && (
        <View style={styles.cartPanel}>
          <Text style={{ fontWeight: "bold", fontSize: 16 }}>Your Cart</Text>

          {cart.length === 0 && <Text>Cart is empty</Text>}

          {cart.map(item => (
            <View key={item.id} style={styles.cartItem}>
              <View>
                <Text>
                  {item.name} x {item.quantity}
                </Text>
                <View style={{ flexDirection: "row", marginTop: 5 }}>
                  <TouchableOpacity
                    onPress={() => changeQuantity(item.id, -1)}
                  >
                    <Text style={styles.qtyBtn}>−</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => changeQuantity(item.id, 1)}
                  >
                    <Text style={styles.qtyBtn}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                <Text style={{ color: "red" }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}

          <Text style={{ fontWeight: "bold", marginTop: 10 }}>
            Total: ${total}
          </Text>

          <TouchableOpacity style={styles.checkoutBtn} onPress={checkout}>
            <Text style={{ color: "white" }}>Checkout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    textAlign: "center",
    marginBottom: 15,
    color: "#FF6347",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 150,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  name: {
    fontWeight: "bold",
  },
  restaurant: {
    color: "#777",
  },
  price: {
    fontWeight: "bold",
  },
  cartButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#32CD32",
    padding: 15,
    borderRadius: 30,
  },
  cartPanel: {
    position: "absolute",
    bottom: 80,
    right: 10,
    left: 10,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    elevation: 5,
  },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  qtyBtn: {
    fontSize: 18,
    marginHorizontal: 8,
  },
  checkoutBtn: {
    marginTop: 10,
    backgroundColor: "#FF6347",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
});
