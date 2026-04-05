import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, TextInput, KeyboardAvoidingView, Alert
} from "react-native";
import * as Device from "expo-device";

import {
  loginOrSignup,
  updateWallet,
  updateUserProfile,
  getUserProfile,
  getUserByDeviceId,
  saveDeviceIdForUser,
  sendMessage,
  listenForMessages,
  getUserByPhone,
  getChatUsers,
  addChatUser,
  addTransaction,
  listenForTransactions
} from "../lib/fire";

import { sendLocalNotification, registerForPushNotifications } from "../lib/noti";

interface FoodItem {
  id: number;
  name: string;
  price: number;
  image: string;
  ownerPhone: string;
  ownerDeviceId: string;
}

type CartItem = FoodItem & { quantity: number };

const menu: FoodItem[] = [
  { id: 1, name: "Burger", price: 6000, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800", ownerPhone: "+256700000001", ownerDeviceId: "seller-1" },
  { id: 2, name: "Pizza", price: 10000, image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800", ownerPhone: "+256700000002", ownerDeviceId: "seller-2" },
  { id: 3, name: "Chai", price: 2000, image: "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800", ownerPhone: "+256700000003", ownerDeviceId: "seller-3" },
  { id: 4, name: "Beer", price: 5000, image: "https://images.unsplash.com/photo-1604908177231-3d8e1b5b0c6b?w=800", ownerPhone: "+256700000004", ownerDeviceId: "seller-4" },
  { id: 5, name: "Grilled Chicken", price: 12000, image: "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=800", ownerPhone: "+256700000005", ownerDeviceId: "seller-5" }
];

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(200000);
  const [username, setUsername] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [activeScreen, setActiveScreen] = useState<"home"|"send"|"history"|"profile">("home");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  // ACC/UPDATE WALLET
  const [showUpdateWallet, setShowUpdateWallet] = useState(false);
  const [walletEdit, setWalletEdit] = useState("");
  const [walletPassword, setWalletPassword] = useState("");

  // SEND MONEY
  const [receiverPhone, setReceiverPhone] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendPin, setSendPin] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const deviceId = useMemo(() => Device.modelName || Device.brand + "-id", []);

  // ====================== INITIALIZE USER ======================
  useEffect(() => {
    registerForPushNotifications().catch(console.log);
    const init = async () => {
      const u = await getUserByDeviceId(deviceId);
      if (u) {
        setUser(u);
        setWalletBalance(u.wallet || 200000);
        setUsername(u.username || "User");
        setUserPhone(u.phone || "");
      }
    };
    init();
  }, []);

  // ====================== LOGIN ======================
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const res = await loginOrSignup(email, password, "", deviceId);
    if (res.success) {
      await saveDeviceIdForUser(res.uid, deviceId);
      setUser({ uid: res.uid });
    } else Alert.alert("Error", res.error);
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <TextInput placeholder="Email" style={styles.input} onChangeText={setEmail} />
        <TextInput placeholder="Password" style={styles.input} secureTextEntry onChangeText={setPassword} />
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.btnText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ====================== WALLET COLOR LOGIC ======================
  let accColor = "#0f0";
  if (walletBalance < 500000) accColor = "#f00";
  else if (walletBalance > 2000000) accColor = "#00f";

  // ====================== HOME SCREEN ======================
  const renderHome = () => (
    <ScrollView style={styles.scrollContainer}>
      <Text style={{ color: "#fff", fontSize: 22, marginBottom: 10 }}>{username}</Text>
      <Text style={{ color: accColor, fontSize: 20, marginBottom: 15 }}>Acc©: {walletBalance} ugx</Text>

      <TouchableOpacity style={[styles.button, { backgroundColor: "#008000" }]} onPress={() => setShowUpdateWallet(prev => !prev)}>
        <Text style={styles.btnText}>{showUpdateWallet ? "off" : "Acc"}</Text>
      </TouchableOpacity>

      {showUpdateWallet && (
        <>
          <TextInput placeholder="Update Acc Amount" style={styles.input} value={walletEdit} onChangeText={setWalletEdit} keyboardType="numeric" />
          <TextInput placeholder="Admin Password" style={styles.input} value={walletPassword} onChangeText={setWalletPassword} secureTextEntry />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#0f0" }]}
            onPress={async () => {
              if (walletPassword !== "elaijah2013") return Alert.alert("Access Denied");
              const newAmount = parseFloat(walletEdit);
              if (isNaN(newAmount) || newAmount < 0) return Alert.alert("Invalid amount");
              await updateWallet(user.uid, newAmount);
              setWalletBalance(newAmount);
              sendLocalNotification(`Acc Ac13****/ updated to ${newAmount}`);
              setWalletEdit("");
              setWalletPassword("");
            }}
          >
            <Text style={styles.btnText}>Acc+</Text>
          </TouchableOpacity>
        </>
      )}

      {menu.map(item => (
        <View key={item.id} style={styles.card}>
          <Image source={{ uri: item.image }} style={styles.image} />
          <Text style={{ color: "#fff", fontSize: 16 }}>{item.name}</Text>
          <Text style={{ color: "#0f0", fontSize: 14 }}>{item.price} ugx</Text>
        </View>
      ))}
    </ScrollView>
  );

  // ====================== SEND MONEY SCREEN ======================
  const renderSendMoney = () => (
    <ScrollView style={styles.scrollContainer}>
      <Text style={{ color: "#fff", fontSize: 22, marginBottom: 10 }}>Send Money</Text>
      <Text style={{ color: accColor, fontSize: 20, marginBottom: 20 }}>Wallet: {walletBalance} ugx</Text>

      <TextInput placeholder="Receiver Phone" style={styles.input} value={receiverPhone} onChangeText={setReceiverPhone} keyboardType="phone-pad" />
      <TextInput placeholder="Amount" style={styles.input} value={sendAmount} onChangeText={setSendAmount} keyboardType="numeric" />
      <TextInput placeholder="PIN" style={styles.input} value={sendPin} onChangeText={setSendPin} secureTextEntry />
      <TextInput placeholder="Admin Password (optional)" style={styles.input} value={adminPassword} onChangeText={setAdminPassword} secureTextEntry />

      <TouchableOpacity style={[styles.button, { backgroundColor: "#008000" }]} onPress={async () => await handleSendMoney()}>
        <Text style={styles.btnText}>Send</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ====================== HISTORY SCREEN ======================
  const renderHistory = () => (
    <ScrollView style={styles.scrollContainer}>
      <Text style={{ color: "#fff", fontSize: 22, marginBottom: 10 }}>Transaction History</Text>
      {transactions.map((tx, i) => (
        <View key={i} style={styles.card}>
          <Text style={{ color: "#fff" }}>{tx.type}</Text>
          {tx.to && <Text style={{ color: "#0ff" }}>To: {tx.to}</Text>}
          <Text style={{ color: "#0f0" }}>{tx.amount} ugx</Text>
          <Text style={{ color: "#aaa" }}>{tx.date}</Text>
        </View>
      ))}
    </ScrollView>
  );

  // ====================== PROFILE SCREEN ======================
  const renderProfile = () => (
    <ScrollView style={styles.scrollContainer}>
      <Text style={{ color: "#fff", fontSize: 22, marginBottom: 10 }}>Profile</Text>
      <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} />
      <TextInput style={styles.input} placeholder="Phone" value={userPhone} onChangeText={setUserPhone} />
      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#008000" }]}
        onPress={async () => {
          await updateUserProfile(user.uid, { username, phone: userPhone });
          sendLocalNotification("Profile updated");
        }}
      >
        <Text style={styles.btnText}>Save</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case "home": return renderHome();
      case "send": return renderSendMoney();
      case "history": return renderHistory();
      case "profile": return renderProfile();
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {renderActiveScreen()}
      {/* Bottom Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setActiveScreen("home")}><Text style={styles.btnText}>Home</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setActiveScreen("send")}><Text style={styles.btnText}>Send</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setActiveScreen("history")}><Text style={styles.btnText}>History</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => setActiveScreen("profile")}><Text style={styles.btnText}>Profile</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 15 },
  scrollContainer: { flex: 1, backgroundColor: "#121212", padding: 15 },
  input: { backgroundColor: "#1E1E1E", color: "#fff", padding: 10, marginVertical: 8, borderRadius: 6 },
  button: { backgroundColor: "#008000", padding: 12, marginVertical: 8, alignItems: "center", borderRadius: 6 },
  navBar: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 10, backgroundColor: "#222" },
  navBtn: { flex: 1, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "bold" },
  card: { backgroundColor: "#1E1E1E", padding: 10, marginBottom: 10, borderRadius: 8 },
  image: { width: "100%", height: 150, borderRadius: 8 }
});
