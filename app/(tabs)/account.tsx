import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  description?: string;
  featured?: boolean;
};

type CartItem = Product & { quantity: number };

type Transaction = {
  receiver: string;
  amount: string;
  timestamp: string;
  proof?: string;
  status?: "Pending" | "Completed";
};

type Props = { userEmail: string };

export default function StoreAndMoneyManager({ userEmail }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);

  const [userName, setUserName] = useState("");
  const [userAccount, setUserAccount] = useState(0);
  const [userAge, setUserAge] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topUpAmount, setTopUpAmount] = useState("");

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastAnim = useRef(new Animated.Value(-60)).current;

  const balanceAnim = useRef(new Animated.Value(0)).current;
  const quickTopUps = [5, 10, 20, 50, 100];

  // ------------------ TOAST ------------------
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 20, duration: 300, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: -60, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  // ------------------ FETCH USER DATA ------------------
  const fetchUserData = async () => {
    try {
      const userRef = doc(db, "users", userEmail);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        showToast("No user found with this email.", "error");
        return;
      }
      const data = userSnap.data();
      setUserName(data.name || "");
      setUserAccount(data.account || 0);
      setUserAge(data.age || 0);

      const txCol = collection(db, "users", userEmail, "transactions");
      const txSnap = await getDocs(txCol);
      const txList: Transaction[] = [];
      txSnap.forEach((doc) => txList.push(doc.data() as Transaction));
      setTransactions(txList.reverse());
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch user data.", "error");
    }
  };

  // ------------------ BALANCE LISTENER ------------------
  useEffect(() => {
    fetchUserData();
    const userRef = doc(db, "users", userEmail);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      const data = snap.data();
      if (!data) return;
      if (data.account !== userAccount) {
        setUserAccount(data.account);
        showToast(`Balance updated: $${data.account}`, "success");
        flashBalance();
      }
    });
    return () => unsubscribe();
  }, [userEmail, userAccount]);

  const flashBalance = () => {
    balanceAnim.setValue(0);
    Animated.sequence([
      Animated.timing(balanceAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
      Animated.timing(balanceAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
    ]).start();
  };

  // ------------------ INITIAL PRODUCTS ------------------
  useEffect(() => {
    const initialProducts: Product[] = [
      { id: "1", name: "iPhone 12", price: 699, image: "https://xlijah.com/pics/phones/iphone/12.jpg", description: "Compact and powerful smartphone.", featured: true },
      { id: "2", name: "iPhone 13", price: 799, image: "https://xlijah.com/pics/phones/iphone/13.jpg", description: "Improved camera and battery." },
      { id: "3", name: "iPhone 14", price: 899, image: "https://xlijah.com/pics/phones/iphone/14.jpg", description: "Sleek design with advanced features.", featured: true },
      { id: "4", name: "iPhone 15", price: 999, image: "https://xlijah.com/pics/phones/iphone/15.jpg", description: "Next-gen performance and display." },
      { id: "5", name: "iPhone 16", price: 1099, image: "https://xlijah.com/pics/phones/iphone/16.jpg", description: "Top-tier smartphone experience." },
    ];
    setProducts(initialProducts);
  }, []);

  // ------------------ CART HANDLERS ------------------
  const addToCart = (product: Product) => {
    if (product.price > userAccount) {
      showToast("Insufficient balance!", "error");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) return prev.map((p) => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      return [...prev, { ...product, quantity: 1 }];
    });
    showToast(`${product.name} added to cart ✅`);
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((p) => p.id !== id));
    showToast("Item removed from cart 🗑️", "error");
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cartTotal > userAccount) {
      showToast("Insufficient balance!", "error");
      return;
    }

    try {
      const newBalance = userAccount - cartTotal;
      setUserAccount(newBalance);
      flashBalance();

      const userRef = doc(db, "users", userEmail);
      await updateDoc(userRef, { account: newBalance });

      const txCol = collection(db, "users", userEmail, "transactions");
      for (const item of cart) {
        const tx: Transaction = {
          receiver: item.name,
          amount: item.price.toString(),
          timestamp: new Date().toLocaleString(),
          proof: `PUR#${Math.floor(Math.random() * 10000)}`,
          status: "Completed",
        };
        await addDoc(txCol, tx);
      }

      setTransactions((prev) => [
        ...cart.map((item) => ({
          receiver: item.name,
          amount: item.price.toString(),
          timestamp: new Date().toLocaleString(),
          proof: `PUR#${Math.floor(Math.random() * 10000)}`,
          status: "Completed",
        })),
        ...prev,
      ]);
      setCart([]);
      showToast("Purchase successful!", "success");
      setCartVisible(false);
    } catch (err) {
      console.error(err);
      showToast("Checkout failed!", "error");
    }
  };

  // ------------------ TOP-UP ------------------
  const simulateTopUp = async (amount?: number, method?: string) => {
    const topUpValue = amount ?? Number(topUpAmount);
    if (!topUpValue) {
      showToast("Enter a valid amount.", "error");
      return;
    }

    try {
      const newBalance = userAccount + topUpValue;
      setUserAccount(newBalance);
      flashBalance();

      const userRef = doc(db, "users", userEmail);
      await updateDoc(userRef, { account: newBalance });

      const txCol = collection(db, "users", userEmail, "transactions");
      const newTx: Transaction = {
        receiver: method || "Top-Up",
        amount: topUpValue.toString(),
        timestamp: new Date().toLocaleString(),
        proof: `MM#${Math.floor(Math.random() * 10000)}`,
        status: "Completed",
      };
      await addDoc(txCol, newTx);
      setTransactions((prev) => [newTx, ...prev]);
      setTopUpAmount("");
      showToast(`Top-Up of $${topUpValue} successful!`, "success");
    } catch (err) {
      console.error(err);
      showToast("Top-Up failed!", "error");
    }
  };

  const balanceColor = balanceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#fff", "#4CAF50"],
  });

  const mobileMoneyProviders = [
    { name: "MTN Mobile Money", color: "#FFD700" },
    { name: "Airtel Money", color: "#FF4500" },
    { name: "Other MM", color: "#4CAF50" },
  ];

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={[styles.card, { backgroundColor: "#1e1e1e" }]}>
      {item.featured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredText}>FEATURED</Text>
        </View>
      )}
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.cardBody}>
        <Text style={[styles.title, { color: "#fff" }]} numberOfLines={2}>{item.name}</Text>
        <Text style={[styles.description, { color: "#aaa" }]} numberOfLines={2}>{item.description}</Text>
        <Text style={[styles.price, { color: "#ff7f00" }]}>${item.price}</Text>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={() => addToCart(item)} style={[styles.smallBtn, { backgroundColor: "#34c759" }]}>
          <Ionicons name="cart" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* TOAST */}
      {toast && (
        <Animated.View
          style={[styles.toast, { backgroundColor: toast.type === "success" ? "#34c759" : "#ff3b30", transform: [{ translateY: toastAnim }] }]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}

      {/* USER INFO */}
      {userName && (
        <View style={styles.accountCard}>
          <Image source={{ uri: "https://i.pravatar.cc/100?u=" + userEmail }} style={styles.avatar} />
          <Text style={styles.welcomeText}>👤 {userName}</Text>
          <Animated.Text style={[styles.accountText, { color: balanceColor }]}>💰 Balance: ${userAccount.toFixed(2)}</Animated.Text>
          <Text style={styles.accountText}>🎂 Age: {userAge}</Text>
        </View>
      )}

      {/* TOP-UP */}
      <Text style={styles.sectionTitle}>Top-Up Account</Text>
      <View style={styles.card}>
        <TextInput style={styles.input} placeholder="Enter Amount" placeholderTextColor="#999" value={topUpAmount} onChangeText={setTopUpAmount} keyboardType="numeric" />
        <View style={styles.quickTopUps}>
          {quickTopUps.map((amt) => (
            <TouchableOpacity key={amt} style={styles.quickTopUpBtn} onPress={() => simulateTopUp(amt, "Manual")}>
              <Text style={styles.quickTopUpText}>${amt}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.mmRow}>
          {mobileMoneyProviders.map((p) => (
            <TouchableOpacity key={p.name} style={[styles.mmBtn, { backgroundColor: p.color }]} onPress={() => simulateTopUp(Number(topUpAmount), p.name)}>
              <Text style={styles.mmText}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.topUpButton} onPress={() => simulateTopUp()}>
          <Text style={styles.topUpButtonText}>Top-Up Now</Text>
        </TouchableOpacity>
      </View>

      {/* PRODUCTS */}
      <Text style={styles.sectionTitle}>Products</Text>
      <FlatList
        data={products}
        numColumns={2}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* CART BUTTON */}
      <TouchableOpacity style={[styles.topUpButton, { backgroundColor: "#007bff" }]} onPress={() => setCartVisible(true)}>
        <Text style={styles.topUpButtonText}>View Cart ({cart.length})</Text>
      </TouchableOpacity>

      {/* CART MODAL */}
      <Modal visible={cartVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: "#222", height: "70%" }]}>
            <Text style={[styles.modalTitle, { color: "#fff" }]}>My Cart ({cart.length})</Text>
            <ScrollView>
              {cart.map((item) => (
                <View key={item.id} style={[styles.cartItem, { backgroundColor: "#333" }]}>
                  <Image source={{ uri: item.image }} style={styles.cartImage} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontWeight: "700", color: "#fff" }}>{item.name}</Text>
                    <Text style={{ color: "#ff7f00", fontWeight: "600" }}>${item.price}</Text>
                    <Text style={{ color: "#fff" }}>Qty: {item.quantity}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeFromCart(item.id)} style={[styles.smallBtn, { backgroundColor: "#ff3b30" }]}>
                    <Ionicons name="trash" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16, textAlign: "center", marginVertical: 10 }}>Total: ${cartTotal}</Text>
            <TouchableOpacity style={[styles.topUpButton, { backgroundColor: "#34c759" }]} onPress={handleCheckout}>
              <Text style={styles.topUpButtonText}>Checkout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.topUpButton, { backgroundColor: "#999", marginTop: 8 }]} onPress={() => setCartVisible(false)}>
              <Text style={styles.topUpButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 15, backgroundColor: "#121212", flexGrow: 1 },
  toast: { position: "absolute", top: 0, left: 20, right: 20, padding: 12, borderRadius: 12, zIndex: 99 },
  toastText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  sectionTitle: { fontSize: 22, fontWeight: "700", marginVertical: 12, color: "#fff" },
  input: { width: "100%", backgroundColor: "#1a1a1a", color: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16 },
  card: { borderRadius: 20, padding: 10, margin: 6, width: CARD_WIDTH },
  accountCard: { backgroundColor: "#1f1f1f", borderRadius: 20, padding: 25, marginBottom: 20, alignItems: "center" },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
  welcomeText: { fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 10 },
  accountText: { fontSize: 16, color: "#ccc", marginVertical: 2 },
  quickTopUps: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  quickTopUpBtn: { backgroundColor: "#333", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 15, alignItems: "center" },
  quickTopUpText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  mmRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  mmBtn: { flex: 1, marginHorizontal: 3, borderRadius: 15, paddingVertical: 12, alignItems: "center" },
  mmText: { color: "#fff", fontWeight: "700", fontSize: 14, textAlign: "center" },
  topUpButton: { backgroundColor: "#FF5722", paddingVertical: 14, borderRadius: 25, marginTop: 10, alignItems: "center" },
  topUpButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  image: { width: "100%", height: 120, borderRadius: 12 },
  cardBody: { paddingVertical: 8 },
  title: { fontWeight: "700", fontSize: 16 },
  description: { fontSize: 12 },
  price: { fontWeight: "700", marginTop:6, fontSize: 14 },
  buttonRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
  smallBtn: { padding: 8, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  featuredBadge: { position: "absolute", top: 10, left: 10, backgroundColor: "#FFD700", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, zIndex: 1 },
  featuredText: { fontSize: 10, fontWeight: "700", color: "#000" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "90%", borderRadius: 20, padding: 15 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  cartItem: { flexDirection: "row", padding: 12, borderRadius: 12, marginVertical: 6, alignItems: "center" },
  cartImage: { width: 60, height: 60, borderRadius: 12 },
});
