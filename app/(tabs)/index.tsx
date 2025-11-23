import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../firebase";

import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

export default function GreenChatApp() {
  // --------------------------------------------------------------
  // 🔹 Hardcoded current user (replace later with your own system)
  // --------------------------------------------------------------
  const user = {
    email: "business@green.com",
    name: "Green Business",
    avatar: "https://i.pravatar.cc/150?u=business",
  };

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");

  const [receiverEmail, setReceiverEmail] = useState("");
  const [receiverProfile, setReceiverProfile] = useState<any>(null);
  const [receiverStatus, setReceiverStatus] = useState<string>("");

  const [inbox, setInbox] = useState<any[]>([]);

  const flatListRef = useRef<FlatList>(null);

  // --------------------------------------------------------------
  // 🔹 Inbox listener
  // --------------------------------------------------------------
  useEffect(() => {
    const userRef = doc(db, "users", user.email);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) setInbox(snap.data().inbox || []);
    });
    return () => unsub();
  }, []);

  // --------------------------------------------------------------
  // 🔹 Messages listener
  // --------------------------------------------------------------
  useEffect(() => {
    if (!receiverEmail) return;
    const chatRef = collection(db, "users", user.email, "chats", receiverEmail, "messages");
    const q = query(chatRef, orderBy("timestamp", "asc"));

    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(arr);
      flatListRef.current?.scrollToEnd({ animated: true });
    });

    return () => unsub();
  }, [receiverEmail]);

  // --------------------------------------------------------------
  // 🔹 Fetch receiver profile
  // --------------------------------------------------------------
  useEffect(() => {
    const fetchReceiver = async () => {
      if (!receiverEmail) return setReceiverProfile(null);
      const snap = await getDoc(doc(db, "users", receiverEmail));
      if (snap.exists()) setReceiverProfile(snap.data());
    };
    fetchReceiver();
  }, [receiverEmail]);

  // --------------------------------------------------------------
  // 🔹 Send message
  // --------------------------------------------------------------
  const handleSend = async () => {
    if (!text.trim() || !receiverEmail) return;

    const timestamp = new Date();
    const msg = {
      text,
      senderEmail: user.email,
      senderName: user.name,
      senderAvatar: user.avatar,
      receiverEmail,
      timestamp,
    };

    // Store for sender & receiver
    const senderRef = collection(db, "users", user.email, "chats", receiverEmail, "messages");
    const receiverRef = collection(db, "users", receiverEmail, "chats", user.email, "messages");

    await Promise.all([addDoc(senderRef, msg), addDoc(receiverRef, msg)]);

    setText("");
  };

  // UI ---------------------------------------------------------------------
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#075E54" barStyle="light-content" />

      {/* Branding */}
      <Text style={styles.appLogo}>Green</Text>

      {/* Inbox */}
      <FlatList
        style={{ maxHeight: 200 }}
        data={inbox}
        keyExtractor={(item, idx) => idx.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.inboxItem} onPress={() => setReceiverEmail(item.peer)}>
            <Ionicons name="person-circle-outline" size={40} color="#128C7E" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.nameText}>{item.peer}</Text>
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.text}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Chat View */}
      {receiverEmail ? (
        <>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerText}>{receiverProfile?.name || receiverEmail}</Text>
              <Text style={styles.statusText}>{receiverStatus}</Text>
            </View>
          </View>

          {/* Message List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageRow,
                  item.senderEmail === user.email ? { flexDirection: "row-reverse" } : {},
                ]}
              >
                <Image source={{ uri: item.senderAvatar }} style={styles.avatar} />
                <View
                  style={[
                    styles.messageBubble,
                    item.senderEmail === user.email ? styles.myBubble : styles.theirBubble,
                  ]}
                >
                  <Text style={styles.senderName}>{item.senderName}</Text>
                  <Text style={styles.messageText}>{item.text}</Text>
                </View>
              </View>
            )}
            contentContainerStyle={{ padding: 10 }}
          />

          {/* Input */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textBox}
              placeholder="Message"
              placeholderTextColor="#ccc"
              value={text}
              onChangeText={setText}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <Text style={{ textAlign: "center", marginTop: 20, color: "#333" }}>
          Select a chat to start messaging
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EDEDED" },

  appLogo: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "bold",
    color: "#128C7E",
    paddingVertical: 10,
  },

  // Header
  header: {
    height: 60,
    backgroundColor: "#075E54",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  headerText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  statusText: { color: "#ddd", fontSize: 12 },

  inboxItem: {
    flexDirection: "row",
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  nameText: { fontSize: 16, fontWeight: "600" },
  lastMessage: { fontSize: 14, color: "#555" },

  // Messages
  messageRow: { flexDirection: "row", marginVertical: 4, alignItems: "flex-end" },
  avatar: { width: 36, height: 36, borderRadius: 18, marginHorizontal: 6 },

  messageBubble: { maxWidth: "75%", padding: 10, borderRadius: 10 },
  myBubble: { backgroundColor: "#DCF8C6" },
  theirBubble: { backgroundColor: "#fff" },

  senderName: { fontSize: 12, fontWeight: "600", color: "#444" },
  messageText: { fontSize: 16, color: "#000" },

  // Input area
  inputBar: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ccc",
  },
  textBox: {
    flex: 1,
    backgroundColor: "#f1f1f1",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: "#25D366",
    padding: 10,
    borderRadius: 20,
  },
});
