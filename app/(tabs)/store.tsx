import React, { useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const numColumns = 2;
const screenWidth = Dimensions.get("window").width;
const cardWidth = screenWidth / numColumns - 20;

const demoProducts = [
  { id: 12, name: "iPhone 12", price: 3500000, image: "https://xlijah.com/pics/phones/iphone/12.jpg" },
  { id: 13, name: "iPhone 13", price: 4500000, image: "https://xlijah.com/pics/phones/iphone/13.jpg" },
  { id: 14, name: "iPhone 14", price: 5500000, image: "https://xlijah.com/pics/phones/iphone/14.jpg" },
  { id: 15, name: "iPhone 15", price: 6500000, image: "https://xlijah.com/pics/phones/iphone/15.jpg" },
  { id: 16, name: "iPhone 16", price: 7500000, image: "https://xlijah.com/pics/phones/iphone/16.jpg" },
  { id: 17, name: "iPhone 17", price: 8500000, image: "https://xlijah.com/pics/phones/iphone/17.jpg" },
];

const MyStore = () => {
  const [products] = useState(demoProducts);
  const [cart, setCart] = useState([]);
  const toastAnim = useRef(new Animated.Value(0)).current;

  // Toast notification
  const showToast = (msg: string) => {
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
    console.log(msg);
  };

  const addToCart = (item: any) => {
    setCart((prev = []) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      if (safePrev.find((p) => p.id === item.id)) return safePrev;
      return [...safePrev, item];
    });
    showToast(`${item.name} added to cart`);
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + Number(item.price || 0), 0);
  };

  const handlePayment = () => {
    const total = getCartTotal();
    Alert.alert("Payment Successful", `UGX ${total.toLocaleString()} deducted.`);
    setCart([]);
    showToast("Payment successful!");
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <Text style={styles.title}>{item.name}</Text>
      <Text style={styles.price}>{Number(item.price).toLocaleString()} UGX</Text>
      <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
        <Ionicons name="cart" size={20} color="#fff" />
        <Text style={styles.addText}>Add</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {cart.length > 0 && (
        <View style={styles.cartBar}>
          <Text style={styles.cartText}>Cart Total: {getCartTotal().toLocaleString()} UGX</Text>
          <TouchableOpacity style={styles.payButton} onPress={handlePayment}>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Pay Now</Text>
          </TouchableOpacity>
        </View>
      )}

      <Animated.View
        style={{
          position: "absolute",
          bottom: 40,
          alignSelf: "center",
          opacity: toastAnim,
          transform: [{ scale: toastAnim }],
          backgroundColor: "#333",
          padding: 10,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "#fff" }}>Notification</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 10 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    margin: 5,
    padding: 10,
    width: cardWidth,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  image: { width: "100%", height: 120, borderRadius: 10 },
  title: { fontSize: 16, fontWeight: "bold", marginVertical: 5 },
  price: { fontSize: 14, color: "#555", marginBottom: 5 },
  addButton: {
    backgroundColor: "#28a745",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderRadius: 8,
  },
  addText: { color: "#fff", marginLeft: 5 },
  cartBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#007AFF",
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cartText: { color: "#fff", fontWeight: "bold" },
  payButton: {
    backgroundColor: "#28a745",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
});

export default MyStore;
