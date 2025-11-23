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
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

export default function GreenChatApp() {
  // ------------------ Hardcoded current user ------------------
  const user = {
    email: "business@green.com",
    name: "Green Business",
    avatar: "https://i.pravatar.cc/150?u=business",
  };

  const defaultUsers = [
    { email: "alice@green.com", name: "Alice", avatar: "https://i.pravatar.cc/150?u=alice" },
    { email: "bob@green.com", name: "Bob", avatar: "https://i.pravatar.cc/150?u=bob" },
    { email: "carol@green.com", name: "Carol", avatar: "https://i.pravatar.cc/150?u=carol" },
    { email: "dave@green.com", name: "Dave", avatar: "https://i.pravatar.cc/150?u=dave" },
    { email: "eve@green.com", name: "Eve", avatar: "https://i.pravatar.cc/150?u=eve" },
    { email: "frank@green.com", name: "Frank", avatar: "https://i.pravatar.cc/150?u=frank" },
    { email: "grace@green.com", name: "Grace", avatar: "https://i.pravatar.cc/150?u=grace" },
    { email: "heidi@green.com", name: "Heidi", avatar: "https://i.pravatar.cc/150?u=heidi" },
    { email: "ivan@green.com", name: "Ivan", avatar: "https://i.pravatar.cc/150?u=ivan" },
    { email: "judy@green.com", name: "Judy", avatar: "https://i.pravatar.cc/150?u=judy" },
  ];

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");
  const [receiverProfile, setReceiverProfile] = useState<any>(null);
  const [inbox, setInbox] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // ------------------ First-time setup: create users ------------------
  useEffect(() => {
    const setupUsers = async () => {
      // Create main user if doesn't exist
      const mainSnap = await getDoc(doc(db, "users", user.email));
      if (!mainSnap.exists()) {
        await setDoc(doc(db, "users", user.email), {
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          inbox: [],
        });
      }

      // Create default users
      for (let u of defaultUsers) {
        const snap = await getDoc(doc(db, "users", u.email));
        if (!snap.exists()) {
          await setDoc(doc(db, "users", u.email), {
            name: u.name,
            email: u.email,
            avatar: u.avatar,
            inbox: [],
          });
        }
      }

      // Populate main user's inbox
      const inboxUsers = defaultUsers.map((u) => ({
        peer: u.email,
        text: "sms",
      }));
      await updateDoc(doc(db, "users", user.email), { inbox: inboxUsers });
    };

    setupUsers();
  }, []);

  // ------------------ Inbox listener ------------------
  useEffect(() => {
    const userRef = doc(db, "users", user.email);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) setInbox(snap.data().inbox || []);
    });
    return () => unsub();
  }, []);

  // ------------------ Messages listener ------------------
  useEffect(() => {
    if (!receiverEmail) return;
    const chatRef = collection(
      db,
      "users",
      user.email,
      "chats",
      receiverEmail,
      "messages"
    );
    const q = query(chatRef, orderBy("timestamp", "asc"));

    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(arr);
      flatListRef.current?.scrollToEnd({ animated: true });
    });

    return () => unsub();
  }, [receiverEmail]);

  // ------------------ Fetch receiver profile ------------------
  useEffect(() => {
    const fetchReceiver = async () => {
      if (!receiverEmail) return setReceiverProfile(null);
      const snap = await getDoc(doc(db, "users", receiverEmail));
      if (snap.exists()) setReceiverProfile(snap.data());
    };
    fetchReceiver();
  }, [receiverEmail]);

  // ------------------ Send message ------------------
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
    const senderRef = collection(
      db,
      "users",
      user.email,
      "chats",
      receiverEmail,
      "messages"
    );
    const receiverRef = collection(
      db,
      "users",
      receiverEmail,
      "chats",
      user.email,
      "messages"
    );

    await Promise.all([addDoc(senderRef, msg), addDoc(receiverRef, msg)]);

    setText("");
  };

  // ------------------ UI ------------------
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#075E54" barStyle="light-content" />

      {/* App Logo */}
      <Text style={styles.appLogo}>Green Chat</Text>

      {/* Chat To Input */}
      <View style={styles.chatTo}>
        <TextInput
          style={styles.chatToInput}
          placeholder="Enter email to chat with"
          placeholderTextColor="#ccc"
          value={receiverEmail}
          onChangeText={(text) => setReceiverEmail(text.trim())}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      {/* Inbox (hidden if typing email) */}
      {!receiverEmail && (
        <FlatList
          style={{ maxHeight: 200 }}
          data={inbox}
          keyExtractor={(item, idx) => idx.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.inboxItem}
              onPress={() => setReceiverEmail(item.peer)}
            >
              <Ionicons name="person-circle-outline" size={40} color="#25D366" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.nameText}>{item.peer}</Text>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {item.text}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Chat View */}
      {receiverEmail ? (
        <>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {receiverProfile?.name || receiverEmail}
            </Text>
          </View>

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageRow,
                  item.senderEmail === user.email
                    ? { flexDirection: "row-reverse" }
                    : {},
                ]}
              >
                <Image source={{ uri: item.senderAvatar }} style={styles.avatar} />
                <View
                  style={[
                    styles.messageBubble,
                    item.senderEmail === user.email
                      ? styles.myBubble
                      : styles.theirBubble,
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
              placeholder="Type a message"
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
        <Text style={{ textAlign: "center", marginTop: 20, color: "#ccc" }}>
          Select a chat or type email to start messaging
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121B22" },

  appLogo: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "bold",
    color: "#25D366",
    paddingVertical: 10,
  },

  chatTo: {
    paddingHorizontal: 10,
    paddingBottom: 5,
  },
  chatToInput: {
    backgroundColor: "#1E2C33",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === "ios" ? 10 : 5,
    color: "#fff",
  },

  header: {
    height: 60,
    backgroundColor: "#075E54",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  headerText: { color: "#fff", fontSize: 20, fontWeight: "bold" },

  inboxItem: {
    flexDirection: "row",
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  nameText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  lastMessage: { fontSize: 14, color: "#aaa" },

  messageRow: { flexDirection: "row", marginVertical: 4, alignItems: "flex-end" },
  avatar: { width: 36, height: 36, borderRadius: 18, marginHorizontal: 6 },

  messageBubble: { maxWidth: "75%", padding: 10, borderRadius: 10 },
  myBubble: { backgroundColor: "#25D366" },
  theirBubble: { backgroundColor: "#1E2C33" },

  senderName: { fontSize: 12, fontWeight: "600", color: "#fff" },
  messageText: { fontSize: 16, color: "#fff" },

  inputBar: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: "#121B22",
    borderTopWidth: 1,
    borderColor: "#333",
  },
  textBox: {
    flex: 1,
    backgroundColor: "#1E2C33",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === "ios" ? 10 : 5,
    color: "#fff",
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: "#25D366",
    padding: 10,
    borderRadius: 20,
  },
});
