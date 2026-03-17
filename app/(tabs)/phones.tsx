import React, { useState, useRef, useEffect } from "react";
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
  TextInput,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  doc,
  getDoc,
  updateDoc,
  increment,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  setDoc,
} from "firebase/firestore";

import { db, auth } from "../../firebase";

import {
  signInWithPhoneNumber,
  signInWithCredential,
  PhoneAuthProvider,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

const numColumns = 2;
const screenWidth = Dimensions.get("window").width;
const cardWidth = screenWidth / numColumns - 20;

const demoProducts = [
  {
    id: 12,
    name: "iPhone 12",
    price: 3500000,
    image: "https://xlijah.com/pics/phones/iphone/12.jpg",
  },
  {
    id: 13,
    name: "iPhone 13",
    price: 4500000,
    image: "https://xlijah.com/pics/phones/iphone/13.jpg",
  },
  {
    id: 14,
    name: "iPhone 14",
    price: 5500000,
    image: "https://xlijah.com/pics/phones/iphone/14.jpg",
  },
  {
    id: 15,
    name: "iPhone 15",
    price: 6500000,
    image: "https://xlijah.com/pics/phones/iphone/15.jpg",
  },
];

const MyStore = () => {
  const [user, setUser] = useState<any>(null);
  const [phone, setPhone] = useState("");
  const [confirmation, setConfirmation] = useState<any>(null);
  const [code, setCode] = useState("");

  const [cart, setCart] = useState<any[]>([]);
  const [wallet, setWallet] = useState<number>(0);

  const toastAnim = useRef(new Animated.Value(0)).current;

  // 🔐 AUTH
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  // 💰 WALLET LISTENER
  useEffect(() => {
    if (!user) return;

    const walletRef = doc(db, "users", user.uid);

    const unsub = onSnapshot(walletRef, (snap) => {
      if (snap.exists()) {
        setWallet(snap.data()?.walletBalance || 0);
      }
    });

    return unsub;
  }, [user]);

  const showToast = () => {
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(1200),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const addToCart = (item: any) => {
    setCart((prev) =>
      prev.find((p) => p.id === item.id)
        ? prev
        : [...prev, item]
    );
    showToast();
  };

  const getCartTotal = () =>
    cart.reduce((sum, item) => sum + Number(item.price), 0);

  const handlePayment = async () => {
    if (!user) return;

    const total = getCartTotal();

    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        return Alert.alert("Error", "Wallet not found");
      }

      const balance = snap.data()?.walletBalance || 0;

      if (balance < total) {
        return Alert.alert("Insufficient Balance", "Top up from agent");
      }

      await updateDoc(userRef, {
        walletBalance: increment(-total),
      });

      await addDoc(collection(db, "orders"), {
        userId: user.uid,
        items: cart,
        total,
        currency: "UGX",
        status: "pending",
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", `UGX ${total.toLocaleString()} paid`);
      setCart([]);
      showToast();
    } catch {
      Alert.alert("Error", "Payment failed");
    }
  };

  // 🔐 LOGIN (PHONE)
  const login = async () => {
    try {
      // 🔥 TEST MODE
      if (phone === "+256700000000") {
        const credential = PhoneAuthProvider.credential(
          "test-verification-id",
          "123456"
        );

        const result = await signInWithCredential(auth, credential);

        await setDoc(
          doc(db, "users", result.user.uid),
          { walletBalance: 0 },
          { merge: true }
        );

        return;
      }

      const confirmationResult = await signInWithPhoneNumber(
        auth,
        phone
      );

      setConfirmation(confirmationResult);

      Alert.alert("Code Sent", "Enter the verification code");
    } catch {
      Alert.alert("Error", "Failed to send code");
    }
  };

  const confirmCode = async () => {
    try {
      const result = await confirmation.confirm(code);

      await setDoc(
        doc(db, "users", result.user.uid),
        { walletBalance: 0 },
        { merge: true }
      );
    } catch {
      Alert.alert("Error", "Invalid code");
    }
  };

  // 🔐 LOGIN SCREEN
  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Phone Login</Text>

        {!confirmation ? (
          <>
            <TextInput
              placeholder="Phone (+256...)"
              style={styles.input}
              onChangeText={setPhone}
            />

            <TouchableOpacity
              style={styles.payButton}
              onPress={login}
            >
              <Text style={{ color: "#000" }}>
                Send Code
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              placeholder="Enter Code"
              style={styles.input}
              onChangeText={setCode}
            />

            <TouchableOpacity
              style={styles.payButton}
              onPress={confirmCode}
            >
              <Text style={{ color: "#000" }}>
                Verify
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.image} />

      <Text style={styles.title}>{item.name}</Text>

      <Text style={styles.price}>
        {item.price.toLocaleString()} UGX
      </Text>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => addToCart(item)}
      >
        <Ionicons name="cart" size={18} color="#000" />
        <Text style={styles.addText}>Add</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.walletBar}>
        <Ionicons name="wallet" size={24} color="#00ffcc" />
        <Text style={styles.walletText}>
          UGX {wallet.toLocaleString()}
        </Text>
      </View>

      <FlatList
        data={demoProducts}
        renderItem={renderItem}
        keyExtractor={(i) => i.id.toString()}
        numColumns={numColumns}
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
  );
};

export default MyStore;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    padding: 10,
  },
  title: {
    color: "#fff",
    fontSize: 18,
  },
  input: {
    backgroundColor: "#1e1e1e",
    color: "#fff",
    marginBottom: 10,
    padding: 10,
  },
  walletBar: {
    flexDirection: "row",
    justifyContent: "center",
    padding: 10,
  },
  walletText: {
    color: "#00ffcc",
    marginLeft: 10,
  },
  card: {
    backgroundColor: "#1c1c1c",
    margin: 6,
    padding: 10,
    borderRadius: 12,
    width: cardWidth,
  },
  image: {
    width: "100%",
    height: 120,
  },
  price: {
    color: "#bbb",
  },
  addButton: {
    backgroundColor: "#00c853",
    flexDirection: "row",
    justifyContent: "center",
    padding: 8,
    marginTop: 5,
  },
  addText: {
    marginLeft: 5,
  },
  cartBar: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
  },
  cartText: {
    color: "#fff",
  },
  payButton: {
    backgroundColor: "#00c853",
    padding: 10,
  },
});
