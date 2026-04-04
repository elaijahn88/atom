// index.tsx
import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Linking, Alert, TextInput, Image
} from "react-native";
import * as Device from "expo-device";

import {
  loginOrSignup, updateWallet,
  getUserByDeviceId, saveDeviceIdForUser,
  sendMessage, listenForMessages,
  updateMessageStatus, setTypingStatus, listenTypingStatus
} from "../lib/fire";

import {
  sendLocalNotification, registerForPushNotifications
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

  const getDeviceId = () =>
    Device.modelName || Device.brand + Math.random();

  useEffect(() => {
    registerForPushNotifications().catch(console.log);
  }, []);

  // AUTO LOGIN
  useEffect(() => {
    const check = async () => {
      const deviceId = getDeviceId();
      const u = await getUserByDeviceId(deviceId);
      if (u) {
        setUser(u);
        setWalletBalance(u.wallet || 20);
      }
    };
    check();
  }, []);

  // LISTEN MESSAGES
  useEffect(() => {
    if (!user) return;

    const deviceId = getDeviceId();

    const unsub = listenForMessages(deviceId, async (msgs) => {
      setMessages(msgs);

      msgs.forEach(msg => {
        if (msg.status === "sent") {
          updateMessageStatus(msg.id, "delivered");
        }
      });

      if (msgs.length > 0) {
        await updateMessageStatus(msgs[0].id, "seen");
        sendLocalNotification("New Message 📩", msgs[0].text);
      }
    });

    return () => unsub();
  }, [user]);

  // LISTEN TYPING
  useEffect(() => {
    if (!user) return;

    const unsub = listenTypingStatus(getDeviceId(), (typing) => {
      setTypingUser(typing);
    });

    return () => unsub();
  }, [user]);

  // LOGIN
  const handleLogin = async () => {
    const deviceId = getDeviceId();
    const res = await loginOrSignup(email, password, "", deviceId);

    if (res.success) {
      await saveDeviceIdForUser(res.uid, deviceId);
      setUser({ uid: res.uid });
    } else {
      Alert.alert("Error", res.error);
    }
  };

  // CART (simple deduction)
  const addToCart = async (item: FoodItem) => {
    if (walletBalance < item.price) return;

    const newBalance = walletBalance - item.price;
    setWalletBalance(newBalance);
    await updateWallet(user.uid, newBalance);
  };

  // CHAT
  const openChat = (deviceId: string) => {
    setActiveChatDevice(deviceId);
    setScreen("chat");
  };

  const handleSendMessage = async () => {
    if (!messageText) return;

    await sendMessage(user.uid, activeChatDevice, messageText);
    setMessageText("");

    setTypingStatus(getDeviceId(), activeChatDevice, false);
  };

  // LOGIN UI
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

  // CHAT SCREEN
  if (screen === "chat") {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => setScreen("home")}>
          <Text style={{ color: "#fff" }}>⬅ Back</Text>
        </TouchableOpacity>

        <ScrollView style={{ marginTop: 10 }}>
          {messages.map(msg => {
            const isMe = msg.senderId === user.uid;

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

                <Text style={{ fontSize: 10, color: "#ccc" }}>
                  {msg.createdAt?.toDate?.().toLocaleTimeString?.()}
                </Text>

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

        {typingUser && (
          <Text style={{ color: "#aaa" }}>Typing...</Text>
        )}

        <TextInput
          placeholder="Type message..."
          placeholderTextColor="#aaa"
          style={styles.input}
          value={messageText}
          onChangeText={(text) => {
            setMessageText(text);
            setTypingStatus(getDeviceId(), activeChatDevice, text.length > 0);
          }}
        />

        <TouchableOpacity style={styles.button} onPress={handleSendMessage}>
          <Text style={styles.btnText}>Send</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // HOME
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.wallet}>Wallet: ${walletBalance}</Text>

      {menu.map(item => (
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
  input: { backgroundColor: "#1E1E1E", color: "#fff", padding: 10, marginTop: 10 },
  button: { backgroundColor: "#FF6347", padding: 12, borderRadius: 8, marginTop: 10 },
  btnText: { color: "#fff", textAlign: "center" },
  wallet: { color: "#0f0", marginBottom: 10 },
  card: { backgroundColor: "#1E1E1E", padding: 10, marginBottom: 10 },
  image: { width: "100%", height: 150 },
  cardTitle: { color: "#fff", fontSize: 18 },
  price: { color: "#0f0" },
  add: { color: "#FF6347" },
  chat: { color: "#00BFFF" },
  call: { color: "#32CD32" },
});
