// index.tsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import * as Device from "expo-device";

import {
  loginOrSignup,
  updateWallet,
  getUserByDeviceId,
  saveDeviceIdForUser,
  sendMessage,
  listenForMessages,
  updateMessageStatus,
  setTypingStatus,
  listenTypingStatus
} from "../lib/fire";

import {
  sendLocalNotification,
  registerForPushNotifications
} from "../lib/noti";

interface FoodItem {
  id: number;
  name: string;
  price: number;
  image: string;
  ownerPhone: string;
  ownerDeviceId: string;
}

const menu: FoodItem[] = [
  {
    id: 1,
    name: "Burger",
    price: 6,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
    ownerPhone: "+256700000001",
    ownerDeviceId: "seller-1"
  },
  {
    id: 2,
    name: "Pizza",
    price: 10,
    image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800",
    ownerPhone: "+256700000002",
    ownerDeviceId: "seller-2"
  }
];

export default function App() {
  const [screen, setScreen] = useState<"home" | "chat">("home");

  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [walletBalance, setWalletBalance] = useState(20);

  // CHAT
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [activeChatDevice, setActiveChatDevice] = useState("");
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // SAFE DEVICE ID (memoized)
  const deviceId = useMemo(
    () => (Device.modelName || Device.brand || "android-device") + "-id",
    []
  );

  // Push notifications
  useEffect(() => {
    registerForPushNotifications().catch(console.log);
  }, []);

  // AUTO LOGIN
  useEffect(() => {
    const check = async () => {
      const u = await getUserByDeviceId(deviceId).catch(console.log);
      if (u) {
        setUser(u);
        setWalletBalance(typeof u.wallet === "number" ? u.wallet : 20);
      }
    };
    check();
  }, [deviceId]);

  // LISTEN MESSAGES
  useEffect(() => {
    if (!user) return;

    const unsub = listenForMessages(deviceId, async (msgs) => {
      if (!msgs) return;
      setMessages(msgs);

      msgs.forEach((msg) => {
        if (msg.status === "sent") updateMessageStatus(msg.id, "delivered").catch(console.log);
      });

      if (msgs.length > 0) {
        try {
          await updateMessageStatus(msgs[0].id, "seen");
          sendLocalNotification("New Message 📩", msgs[0].text);
        } catch (e) {
          console.log(e);
        }
      }

      if (isAtBottom) {
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
      }
    });

    return () => unsub();
  }, [user, deviceId, isAtBottom]);

  // LISTEN TYPING
  useEffect(() => {
    if (!user) return;

    const unsub = listenTypingStatus(deviceId, (typing) => {
      setTypingUser(typing);
    });

    return () => unsub();
  }, [user, deviceId]);

  // LOGIN
  const handleLogin = async () => {
    try {
      const res = await loginOrSignup(email, password, "", deviceId);
      if (res.success) {
        await saveDeviceIdForUser(res.uid, deviceId);
        setUser({ uid: res.uid });
      } else {
        Alert.alert("Error", res.error || "Login failed");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Login failed");
    }
  };

  // CART (simple deduction)
  const addToCart = async (item: FoodItem) => {
    if (!user?.uid) return;

    if (walletBalance < item.price) {
      Alert.alert("Insufficient Balance", "You don't have enough wallet balance.");
      return;
    }

    const newBalance = walletBalance - item.price;
    setWalletBalance(newBalance);
    await updateWallet(user.uid, newBalance).catch(console.log);
  };

  // CHAT
  const openChat = (chatDevice: string) => {
    setActiveChatDevice(chatDevice);
    setScreen("chat");
  };

  const handleSendMessage = async () => {
    if (!messageText || !user?.uid || !activeChatDevice) return;

    await sendMessage(user.uid, activeChatDevice, messageText).catch(console.log);
    setMessageText("");
    setTypingStatus(deviceId, activeChatDevice, false).catch(console.log);
  };

  // TRACK IF USER SCROLLS UP
  const handleScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const bottom = contentSize.height - layoutMeasurement.height - paddingToBottom;
    setIsAtBottom(contentOffset.y >= bottom);
  };

  // LOGIN UI
  if (!user) {
    return (
      <View style={styles.container}>
        <TextInput
          placeholder="Email"
          style={styles.input}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#aaa"
        />
        <TextInput
          placeholder="Password"
          style={styles.input}
          secureTextEntry
          onChangeText={setPassword}
          placeholderTextColor="#aaa"
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.btnText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // CHAT SCREEN
  if (screen === "chat") {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#121212" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableOpacity onPress={() => setScreen("home")}>
          <Text style={{ color: "#fff" }}>⬅ Back</Text>
        </TouchableOpacity>

        <View style={{ flex: 1, marginTop: 10 }}>
          <ScrollView
            ref={scrollViewRef}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 10 }}
          >
            {messages.map((msg) => {
              const isMe = msg.senderId === user.uid;
              let time = "";
              try {
                if (msg.createdAt?.toDate) time = msg.createdAt.toDate().toLocaleTimeString();
                else if (msg.createdAt) time = new Date(msg.createdAt).toLocaleTimeString();
              } catch (e) {}

              return (
                <View
                  key={msg.id}
                  style={{
                    alignSelf: isMe ? "flex-end" : "flex-start",
                    backgroundColor: isMe ? "#FF6347" : "#1E1E1E",
                    padding: 10,
                    marginTop: 5,
                    borderRadius: 10,
                    maxWidth: "70%"
                  }}
                >
                  <Text style={{ color: "#fff" }}>{msg.text}</Text>
                  <Text style={{ fontSize: 10, color: "#ccc" }}>{time}</Text>
                  {isMe && (
                    <Text style={{ fontSize: 10, color: "#ccc" }}>
                      {msg.status === "sent" && "✔"}
                      {msg.status === "delivered" && "✔✔"}
                      {msg.status === "seen" && "✔✔ Seen"}
                    </Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        {typingUser && <Text style={{ color: "#aaa" }}>Typing...</Text>}

        <TextInput
          placeholder="Type message..."
          placeholderTextColor="#aaa"
          style={styles.input}
          value={messageText}
          onChangeText={(text) => {
            setMessageText(text);
            if (activeChatDevice) setTypingStatus(deviceId, activeChatDevice, text.length > 0).catch(console.log);
          }}
        />

        <TouchableOpacity style={styles.button} onPress={handleSendMessage}>
          <Text style={styles.btnText}>Send</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  // HOME SCREEN
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.wallet}>Wallet: ${walletBalance}</Text>

      {menu.map((item) => (
        <View key={item.id} style={styles.card}>
          <Image source={{ uri: item.image }} style={styles.image} />
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.price}>${item.price}</Text>

          <TouchableOpacity onPress={() => addToCart(item)}>
            <Text style={styles.add}>Buy</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => openChat(item.ownerDeviceId)}>
            <Text style={styles.chat}>💬 Chat Seller</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.ownerPhone}`)}>
            <Text style={styles.call}>Call</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 15 },
  input: { backgroundColor: "#1E1E1E", color: "#fff", padding: 10, marginTop: 10, borderRadius: 5 },
  button: { backgroundColor: "#FF6347", padding: 12, borderRadius: 8, marginTop: 10 },
  btnText: { color: "#fff", textAlign: "center" },
  wallet: { color: "#0f0", marginBottom: 10, fontSize: 16 },
  card: { backgroundColor: "#1E1E1E", padding: 10, marginBottom: 10, borderRadius: 8 },
  image: { width: "100%", height: 150, borderRadius: 8 },
  cardTitle: { color: "#fff", fontSize: 18, marginTop: 5 },
  price: { color: "#0f0", marginBottom: 5 },
  add: { color: "#FF6347", marginBottom: 5 },
  chat: { color: "#00BFFF", marginBottom: 5 },
  call: { color: "#32CD32" }
});
