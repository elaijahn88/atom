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

import { database, ref, push, onValue, auth } from "../../firebase";
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
  ownerName: string;
  ownerPhone: string;
  ownerLocation: string;
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

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [userName, setUserName] = useState("");
  const [contact, setContact] = useState("");

  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");

  const [showProfile, setShowProfile] = useState(false);

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
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
      category: "meal",
      ownerName: "Restaurant One",
      ownerPhone: "+256700000001",
      ownerLocation: "Kampala",
    },
    {
      id: 2,
      name: "Pepperoni Pizza",
      price: 10,
      image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800",
      category: "meal",
      ownerName: "Pizza Hub",
      ownerPhone: "+256700000002",
      ownerLocation: "Ntinda",
    },
    {
      id: 3,
      name: "Grilled Chicken",
      price: 9,
      image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800",
      category: "meal",
      ownerName: "Chicken Spot",
      ownerPhone: "+256700000003",
      ownerLocation: "Kawempe",
    },
    {
      id: 4,
      name: "African Milk Tea",
      price: 2,
      image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800",
      category: "chai",
      ownerName: "Tea Corner",
      ownerPhone: "+256700000004",
      ownerLocation: "Mukono",
    },
  ];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;

    const userRef = ref(database, `users/${user.uid}`);

    const unsub = onValue(userRef, (snap) => {
      const data = snap.val();

      if (data?.name) setUserName(data.name);
      if (data?.contact) setContact(data.contact);
      if (data?.balance) setWalletBalance(data.balance);
    });

    return () => unsub();
  }, [user]);

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
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
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

    const newOrder = {
      id: "ORD-" + Math.floor(Math.random() * 100000),
      items: cart,
      total,
      userId: user.uid,
      createdAt: Date.now(),
      status: "pending",
    };

    push(ref(database, "orders"), newOrder);

    update(ref(database, `users/${user.uid}`), {
      balance: walletBalance - total,
    });

    setCart([]);
    setShowCart(false);

    Alert.alert("Success", "Order placed");
  };

  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      await createUserWithEmailAndPassword(auth, email, password);

      if (auth.currentUser) {
        set(ref(database, `users/${auth.currentUser.uid}`), {
          name: name || "User",
          contact: phone || email,
          balance: 0,
        });
      }
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Login</Text>

        <TextInput
          placeholder="Name"
          style={styles.input}
          onChangeText={setName}
        />
        <TextInput
          placeholder="Phone"
          style={styles.input}
          onChangeText={setPhone}
        />
        <TextInput
          placeholder="Email"
          style={styles.input}
          onChangeText={setEmail}
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.checkoutBtn} onPress={login}>
          <Text style={{ color: "white" }}>Login / Sign Up</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{userName || "User"}</Text>
      <Text style={{ color: "#aaa" }}>{contact}</Text>
      <Text style={styles.walletText}>${walletBalance}</Text>

      <ScrollView>
        {menu.map((item) => (
          <FoodCard key={item.id} item={item} addToCart={addToCart} />
        ))}
      </ScrollView>
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
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
        }}
      />

      <View style={{ padding: 10 }}>
        <Text style={{ color: "#fff" }}>{item.name}</Text>
        <Text style={{ color: "#2ecc71" }}>${item.price}</Text>

        <View style={styles.ownerBox}>
          <Text style={styles.ownerName}>👤 {item.ownerName}</Text>
          <Text style={styles.ownerPhone}>📞 {item.ownerPhone}</Text>
          <Text style={styles.ownerLocation}>📍 {item.ownerLocation}</Text>
        </View>
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
  },
  input: {
    backgroundColor: "#1E1E1E",
    color: "#fff",
    marginTop: 10,
    padding: 10,
  },
  card: {
    backgroundColor: "#1E1E1E",
    marginBottom: 15,
    borderRadius: 15,
    overflow: "hidden",
  },
  ownerBox: {
    marginTop: 6,
    padding: 6,
    backgroundColor: "#111",
    borderRadius: 8,
  },
  ownerName: {
    color: "#fff",
    fontSize: 12,
  },
  ownerPhone: {
    color: "#00ffcc",
    fontSize: 12,
  },
  ownerLocation: {
    color: "#aaa",
    fontSize: 12,
  },
  checkoutBtn: {
    backgroundColor: "#FF6347",
    padding: 10,
    marginTop: 10,
  },
});
