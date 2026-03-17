import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  TextInput,
} from "react-native";

import { database, ref, push, onValue, auth } from "./firebase";
import { set, update } from "firebase/database";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

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
  userId: string;
  createdAt: number;
  status?: string;
}

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);

  const [showCart, setShowCart] = useState(false);
  const [showAgentPanel, setShowAgentPanel] = useState(false);

  const cartScale = useRef(new Animated.Value(1)).current;

  const menu: FoodItem[] = [
    {
      id: 1,
      name: "Classic Burger",
      price: 6,
      image:
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
      category: "meal",
    },
    {
      id: 2,
      name: "Pepperoni Pizza",
      price: 10,
      image:
        "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800",
      category: "meal",
    },
    {
      id: 3,
      name: "Grilled Chicken",
      price: 9,
      image:
        "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800",
      category: "meal",
    },
    {
      id: 4,
      name: "African Milk Tea",
      price: 2,
      image:
        "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800",
      category: "chai",
    },
  ];

  // 🔐 AUTH LISTENER
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    return unsub;
  }, []);

  // 🔥 LOAD WALLET
  useEffect(() => {
    if (!user) return;

    const balanceRef = ref(database, `users/${user.uid}/balance`);

    const unsub = onValue(balanceRef, (snap) => {
      setWalletBalance(snap.val() || 0);
    });

    return () => unsub();
  }, [user]);

  // 🔥 LOAD ORDERS
  useEffect(() => {
    if (!user) return;

    const ordersRef = ref(database, "orders");

    const unsub = onValue(ordersRef, (snap) => {
      const data = snap.val();

      if (data) {
        const arr: any = Object.values(data).filter(
          (o: any) => o.userId === user.uid
        );
        setOrders(arr.reverse());
      } else {
        setOrders([]);
      }
    });

    return () => unsub();
  }, [user]);

  const addToCart = (item: FoodItem) => {
    Animated.sequence([
      Animated.timing(cartScale, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(cartScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);

      if (existing) {
        return prev.map((c) =>
          c.id === item.id
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }

      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const checkout = () => {
    if (!user) return;

    if (walletBalance < total) {
      return Alert.alert("Insufficient balance");
    }

    const orderId = "ORD-" + Math.floor(Math.random() * 100000);

    const newOrder = {
      id: orderId,
      items: cart,
      total,
      userId: user.uid,
      createdAt: Date.now(),
      status: "pending",
    };

    push(ref(database, "orders"), newOrder);

    set(
      ref(database, `users/${user.uid}/balance`),
      walletBalance - total
    );

    setCart([]);
    setShowCart(false);

    Alert.alert("Success", "Order placed");
  };

  // 🔐 LOGIN
  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      await createUserWithEmailAndPassword(auth, email, password);

      if (auth.currentUser) {
        set(ref(database, `users/${auth.currentUser.uid}`), {
          balance: 0,
        });
      }
    }
  };

  // 🔐 LOGIN SCREEN
  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Login</Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#aaa"
          style={styles.input}
          onChangeText={setEmail}
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#aaa"
          style={styles.input}
          secureTextEntry
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.checkoutBtn} onPress={login}>
          <Text style={{ color: "white" }}>
            Login / Sign Up
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>coco</Text>

      <Text style={styles.walletText}>
        💰 ${walletBalance}
      </Text>

      <ScrollView>
        {menu.map((item) => (
          <FoodCard
            key={item.id}
            item={item}
            addToCart={addToCart}
          />
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.cartButton}
        onPress={() => setShowCart(!showCart)}
      >
        <Text style={{ color: "white" }}>
          🛒 {cart.length}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.agentButton}
        onPress={() => setShowAgentPanel(!showAgentPanel)}
      >
        <Text style={{ color: "white" }}>Agent</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ position: "absolute", top: 40, right: 20 }}
        onPress={() => signOut(auth)}
      >
        <Text style={{ color: "red" }}>Logout</Text>
      </TouchableOpacity>

      {showCart && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Cart</Text>

          {cart.map((item) => (
            <Text key={item.id} style={{ color: "#fff" }}>
              {item.name} x {item.quantity}
            </Text>
          ))}

          <Text style={{ color: "#fff" }}>
            Total: ${total}
          </Text>

          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={checkout}
          >
            <Text style={{ color: "white" }}>
              Checkout
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showAgentPanel && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>
            Agent Panel
          </Text>

          <TouchableOpacity
            style={styles.topUpBtn}
            onPress={() => {
              update(ref(database, `users/${user.uid}`), {
                balance: walletBalance + 50,
              });
            }}
          >
            <Text style={{ color: "#fff" }}>
              + Add Money
            </Text>
          </TouchableOpacity>

          {orders.map((o) => (
            <Text key={o.id} style={{ color: "#fff" }}>
              {o.id} - ${o.total} ({o.status})
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const FoodCard = ({ item, addToCart }: any) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(true);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => addToCart(item)}
    >
      {loading && (
        <ActivityIndicator
          style={{
            position: "absolute",
            top: 70,
            alignSelf: "center",
          }}
        />
      )}

      <Animated.Image
        source={{ uri: item.image }}
        style={{
          width: "100%",
          height: 180,
          opacity: fadeAnim,
        }}
        onLoad={() => {
          setLoading(false);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
        }}
      />

      <View style={{ padding: 10 }}>
        <Text style={{ color: "#fff" }}>
          {item.name}
        </Text>
        <Text style={{ color: "#2ecc71" }}>
          ${item.price}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 15,
  },
  title: {
    fontSize: 24,
    color: "#FF6347",
    fontWeight: "bold",
  },
  walletText: {
    color: "#32CD32",
    fontSize: 18,
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#1E1E1E",
    color: "#fff",
    marginBottom: 10,
    padding: 10,
  },
  card: {
    backgroundColor: "#1E1E1E",
    marginBottom: 15,
    borderRadius: 15,
    overflow: "hidden",
  },
  cartButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "green",
    padding: 15,
    borderRadius: 30,
  },
  agentButton: {
    position: "absolute",
    bottom: 80,
    right: 20,
    backgroundColor: "blue",
    padding: 12,
    borderRadius: 30,
  },
  panel: {
    position: "absolute",
    bottom: 140,
    left: 10,
    right: 10,
    backgroundColor: "#1E1E1E",
    padding: 15,
  },
  panelTitle: {
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 10,
  },
  checkoutBtn: {
    backgroundColor: "#FF6347",
    padding: 10,
    marginTop: 10,
  },
  topUpBtn: {
    backgroundColor: "green",
    padding: 10,
    marginBottom: 10,
  },
});
