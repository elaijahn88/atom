// app/App.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Linking,
  Alert,
  TextInput,
  Dimensions,
  Image,
} from "react-native";
import * as Device from "expo-device";

// Firebase services
import {
  loginOrSignup,
  updateWallet,
  updateUserProfile,
  getUserProfile,
  getUserByDeviceId,
  saveDeviceIdForUser,
} from "../lib/fire";
import { sendLocalNotification, registerForPushNotifications } from "../lib/noti";

// Types
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

const managers = [
  { name: "Jof", phone: "+256756707499" },
  { name: "Eli", phone: "0746524088" },
];

const { width, height } = Dimensions.get("window");

const App = () => {
  // LOGIN STATE
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [user, setUser] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(20);
  const [cart, setCart] = useState<CartItem[]>([]);

  // PROFILE STATE
  const [showProfile, setShowProfile] = useState(false);
  const [username, setUsername] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [location, setLocation] = useState("");
  const [foodLikes, setFoodLikes] = useState("");
  const [drinkLikes, setDrinkLikes] = useState("");

  // ANIMATION REFS
  const cartScale = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(height)).current;
  const PARTIAL = height * 0.35;
  const CLOSED = height;

  // PUSH NOTIFICATIONS
  useEffect(() => {
    registerForPushNotifications().then((token) =>
      console.log("Push token:", token)
    );
  }, []);

  // ONE-TIME DEVICE LOGIN
  useEffect(() => {
    const checkDeviceLogin = async () => {
      const deviceId = Device.deviceName || "unknown-device";
      try {
        const existingUser = await getUserByDeviceId(deviceId);
        if (existingUser) {
          setUser(existingUser);
          setWalletBalance(existingUser.wallet || 20);
          setUsername(existingUser.username || "User");
          setUserPhone(existingUser.phone || "");
          setLocation(existingUser.location || "");
          setFoodLikes(existingUser.foodLikes || "");
          setDrinkLikes(existingUser.drinkLikes || "");
          sendLocalNotification("Welcome back!", `Hello ${existingUser.username || "User"}`);
        }
      } catch (err) {
        console.log("Device login check error:", err);
      }
    };
    checkDeviceLogin();
  }, []);

  // CART FUNCTIONS
  const snapTo = (toValue: number) =>
    Animated.spring(panY, { toValue, useNativeDriver: true, tension: 50, friction: 12 }).start();
  const openCart = () => {
    snapTo(PARTIAL);
    Animated.timing(overlayOpacity, { toValue: 0.5, duration: 300, useNativeDriver: true }).start();
  };
  const closeCart = () => {
    snapTo(CLOSED);
    Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };

  const addToCart = async (item: FoodItem) => {
    if (walletBalance < item.price) {
      alert("Insufficient wallet balance!");
      return;
    }

    Animated.sequence([
      Animated.timing(cartScale, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.timing(cartScale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    setCart((prev) => {
      const exist = prev.find((c) => c.id === item.id);
      if (exist) return prev.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });

    const newBalance = walletBalance - item.price;
    setWalletBalance(newBalance);
    if (user?.uid) await updateWallet(user.uid, newBalance);

    sendLocalNotification("Cart Updated", `${item.name} added! Wallet: $${newBalance}`);
  };

  const callOwner = (number: string, name: string) => {
    sendLocalNotification("Calling", `Calling ${name} (${number})`);
    Linking.openURL(`tel:${number}`);
  };

  // LOGIN HANDLER
  const handleLogin = async () => {
    const deviceId = Device.deviceName || "unknown-device";
    const res = await loginOrSignup(email, password, phone, deviceId);
    if (res.success) {
      await saveDeviceIdForUser(res.uid, deviceId); // save device for auto login
      setUser({ uid: res.uid, phone: res.phone });
      setWalletBalance(res.wallet || 20);
      setUsername(res.username || "User");
      setUserPhone(res.phone || "");
      setLocation(res.location || "");
      setFoodLikes(res.foodLikes || "");
      setDrinkLikes(res.drinkLikes || "");
      sendLocalNotification("Welcome!", `Hello ${res.username || "User"}`);
    } else {
      Alert.alert("Error", res.error || "Login failed");
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // ---------------- LOGIN SCREEN ----------------
  if (!user) {
    return (
      <View style={styles.container}>
        <TextInput placeholder="Email" style={styles.input} value={email} onChangeText={setEmail} placeholderTextColor="#aaa" />
        <TextInput placeholder="Password" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#aaa" />
        <TextInput placeholder="Phone" style={styles.input} value={phone} onChangeText={setPhone} placeholderTextColor="#aaa" />
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "bold" }}>Login / Signup</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------------- PROFILE SCREEN ----------------
  if (showProfile) {
    useEffect(() => {
      const fetchProfile = async () => {
        if (!user?.uid) return;
        try {
          const data = await getUserProfile(user.uid);
          if (data) {
            setUsername(data.username || "");
            setUserPhone(data.phone || "");
            setLocation(data.location || "");
            setFoodLikes(data.foodLikes || "");
            setDrinkLikes(data.drinkLikes || "");
          }
        } catch (err) {
          console.log("Error fetching profile:", err);
        }
      };
      fetchProfile();
    }, [showProfile]);

    const handleSaveAndBack = async () => {
      if (!username || !userPhone) {
        Alert.alert("Error", "Username and Phone are required!");
        return;
      }
      try {
        if (user?.uid) {
          await updateUserProfile(user.uid, { username, phone: userPhone, location, foodLikes, drinkLikes });
        }
        setUser({ ...user, username, phone: userPhone, location, foodLikes, drinkLikes });
        sendLocalNotification("Profile Updated", "Your profile changes were saved.");
        setShowProfile(false);
      } catch (err) {
        console.log("Profile save error:", err);
        Alert.alert("Error", "Failed to save profile. Try again.");
      }
    };

    return (
      <ScrollView style={styles.container}>
        <TouchableOpacity style={[styles.button, { marginBottom: 15, backgroundColor: "#888" }]} onPress={handleSaveAndBack}>
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "bold" }}>Save & Back</Text>
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Edit Profile</Text>
        <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={styles.input} placeholderTextColor="#aaa" />
        <TextInput placeholder="Phone" value={userPhone} onChangeText={setUserPhone} style={styles.input} placeholderTextColor="#aaa" keyboardType="phone-pad" />
        <TextInput placeholder="Location (Building/Level/Shop No.)" value={location} onChangeText={setLocation} style={styles.input} placeholderTextColor="#aaa" />
        <TextInput placeholder="Food you like" value={foodLikes} onChangeText={setFoodLikes} style={styles.input} placeholderTextColor="#aaa" />
        <TextInput placeholder="Drinks you like" value={drinkLikes} onChangeText={setDrinkLikes} style={styles.input} placeholderTextColor="#aaa" />
      </ScrollView>
    );
  }

  // ---------------- MAIN APP SCREEN ----------------
  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={[styles.button, { marginBottom: 15 }]} onPress={() => setShowProfile(true)}>
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "bold" }}>Profile</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{username}</Text>
      <Text style={styles.walletText}>Wallet: ${walletBalance}</Text>

      {menu.map((item) => (
        <View key={item.id} style={styles.card}>
          <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardPrice}>${item.price}</Text>
          </View>
          <View style={styles.cardButtons}>
            <TouchableOpacity onPress={() => addToCart(item)} style={styles.addButton}>
              <Text style={styles.addBtn}>Add 🛒</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => callOwner(item.ownerPhone, item.ownerName)} style={styles.callButton}>
              <Text style={styles.callBtn}>Call Owner</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={styles.managersRow}>
        {managers.map((m) => (
          <TouchableOpacity key={m.phone} onPress={() => callOwner(m.phone, m.name)} style={[styles.managerBtn, { width: width * 0.25 }]}>
            <Text style={{ color: "#fff", textAlign: "center" }}>{m.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {cart.length > 0 && (
        <Animated.View style={[styles.floatingCart, { transform: [{ scale: cartScale }] }]}>
          <TouchableOpacity onPress={openCart}>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>🛒 {cart.length} | ${total}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
      {cart.length > 0 && (
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={closeCart} />
        </Animated.View>
      )}
    </ScrollView>
  );
};

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 15 },
  title: { fontSize: 24, color: "#FF6347", fontWeight: "bold", marginBottom: 15 },
  sectionTitle: { fontSize: 20, color: "#FFD700", fontWeight: "bold", marginBottom: 10 },
  walletText: { color: "#32CD32", fontSize: 18, marginBottom: 20 },
  input: { backgroundColor: "#1E1E1E", color: "#fff", padding: 12, borderRadius: 10, marginBottom: 15 },
  button: { backgroundColor: "#FF6347", padding: 12, borderRadius: 10, marginTop: 5 },
  card: { backgroundColor: "#1E1E1E", borderRadius: 12, marginBottom: 15, overflow: "hidden", paddingBottom: 10 },
  cardImage: { width: "100%", height: 150 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 10, paddingTop: 10 },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  cardPrice: { color: "#2ecc71", fontSize: 16 },
  cardButtons: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, marginTop: 10 },
  addButton: { backgroundColor: "#FF6347", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  callButton: { backgroundColor: "#32CD32", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  addBtn: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  callBtn: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  managersRow: { flexDirection: "row", justifyContent: "flex-start", flexWrap: "wrap", marginTop: 15 },
  managerBtn: { backgroundColor: "#FF6347", padding: 10, borderRadius: 8, marginRight: 10, marginBottom: 10, alignItems: "center" },
  floatingCart: { position: "absolute", bottom: 25, right: 25, backgroundColor: "#FF6347", padding: 15, borderRadius: 50 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#000" },
});

export default App;
