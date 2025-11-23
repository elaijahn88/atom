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
import { getDatabase, ref, set, push, onValue, update, serverTimestamp } from "firebase/database";
import { database } from "../../firebase"; // changed from db to database

export default function GreenChatApp() {
  const db = database; // assign database to db for easier usage throughout

  const user = {
    email: "elajahn8@gmail.com",
    name: "Elajahn",
    avatar: "https://i.pravatar.cc/150?u=elajahn8",
  };

  const defaultUsers = [
    { email: "alice@green.com", name: "Alice", avatar: "https://i.pravatar.cc/150?u=alice" },
    { email: "bob@green.com", name: "Bob", avatar: "https://i.pravatar.cc/150?u=bob" },
  ];

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");
  const [receiverProfile, setReceiverProfile] = useState<any>(null);
  const [inbox, setInbox] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // ------------------ Setup users ------------------
  useEffect(() => {
    const setupUsers = async () => {
      // Main user
      const mainRef = ref(db, `users/${user.email.replace(".", ",")}`);
      onValue(
        mainRef,
        (snap) => {
          if (!snap.exists()) {
            set(mainRef, { name: user.name, email: user.email, avatar: user.avatar, inbox: {} });
          }
        },
        { onlyOnce: true }
      );

      // Default users
      for (let u of defaultUsers) {
        const uRef = ref(db, `users/${u.email.replace(".", ",")}`);
        onValue(
          uRef,
          (snap) => {
            if (!snap.exists()) {
              set(uRef, { name: u.name, email: u.email, avatar: u.avatar, inbox: {} });
            }
          },
          { onlyOnce: true }
        );
      }

      // Initialize inbox for main user
      const inboxData: any = {};
      defaultUsers.forEach((u) => {
        inboxData[u.email.replace(".", ",")] = { lastText: "", unreadCount: 0, timestamp: null };
      });
      update(mainRef, { inbox: inboxData });
    };

    setupUsers();
  }, []);

  // ------------------ Inbox listener ------------------
  useEffect(() => {
    const inboxRef = ref(db, `users/${user.email.replace(".", ",")}/inbox`);
    const unsubscribe = onValue(inboxRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const inboxArr = Object.entries(data).map(([peer, val]: any) => ({ peer, ...val }));
        setInbox(inboxArr);
      } else {
        setInbox([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // ------------------ Fetch receiver profile & reset unread ------------------
  useEffect(() => {
    if (!receiverEmail) return setReceiverProfile(null);

    const receiverRef = ref(db, `users/${receiverEmail.replace(".", ",")}`);
    const unsubscribe = onValue(receiverRef, (snap) => {
      if (snap.exists()) setReceiverProfile(snap.val());
    });

    // Reset unread count for this chat
    const inboxRef = ref(
      db,
      `users/${user.email.replace(".", ",")}/inbox/${receiverEmail.replace(".", ",")}`
    );
    update(inboxRef, { unreadCount: 0 });

    return () => unsubscribe();
  }, [receiverEmail]);

  // ------------------ Messages listener ------------------
  useEffect(() => {
    if (!receiverEmail) return;

    const chatPath = `chats/${[user.email, receiverEmail].sort().join("_")}/messages`;
    const messagesRef = ref(db, chatPath);

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const msgs: any[] = [];
      snapshot.forEach((childSnap) => {
        msgs.push({ id: childSnap.key, ...childSnap.val() });
      });
      setMessages(msgs);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    return () => unsubscribe();
  }, [receiverEmail]);

  // ------------------ Send message ------------------
  const handleSend = async () => {
    if (!text.trim() || !receiverEmail) return;

    const msg = {
      text,
      senderEmail: user.email,
      senderName: user.name,
      senderAvatar: user.avatar,
      timestamp: serverTimestamp(),
    };

    const chatPath = `chats/${[user.email, receiverEmail].sort().join("_")}/messages`;
    const newMsgRef = push(ref(db, chatPath));
    await set(newMsgRef, msg);

    // Update inbox for sender and receiver
    const updateInbox = (targetEmail: string, lastText: string, incrementUnread: boolean) => {
      const peerEmail = targetEmail === user.email ? receiverEmail : user.email;
      const inboxRef = ref(
        db,
        `users/${targetEmail.replace(".", ",")}/inbox/${peerEmail.replace(".", ",")}`
      );

      onValue(
        inboxRef,
        (snap) => {
          const old = snap.val() || {};
          const updated = {
            ...old,
            lastText,
            timestamp: Date.now(),
            unreadCount: incrementUnread ? (old.unreadCount || 0) + 1 : 0,
          };
          update(inboxRef, updated);
        },
        { onlyOnce: true }
      );
    };

    updateInbox(user.email, text, false); // sender unread = 0
    updateInbox(receiverEmail, text, true); // receiver unread += 1

    setText("");
  };

  // ------------------ UI ------------------
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#075E54" barStyle="light-content" />
      <Text style={styles.appLogo}>Green Chat</Text>

      <View style={styles.chatTo}>
        <TextInput
          style={styles.chatToInput}
          placeholder="Enter email to chat with"
          placeholderTextColor="#ccc"
          value={receiverEmail}
          onChangeText={(t) => setReceiverEmail(t.trim())}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      {!receiverEmail && (
        <FlatList
          style={{ maxHeight: 200 }}
          data={inbox.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))}
          keyExtractor={(item) => item.peer}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.inboxItem} onPress={() => setReceiverEmail(item.peer)}>
              <Ionicons name="person-circle-outline" size={40} color="#25D366" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.nameText}>{item.peer}</Text>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {item.lastText}
                </Text>
              </View>
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {receiverEmail && (
        <>
          <View style={styles.header}>
            <Text style={styles.headerText}>{receiverProfile?.name || receiverEmail}</Text>
          </View>

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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121B22" },
  appLogo: { textAlign: "center", fontSize: 28, fontWeight: "bold", color: "#25D366", paddingVertical: 10 },
  chatTo: { paddingHorizontal: 10, paddingBottom: 5 },
  chatToInput: {
    backgroundColor: "#1E2C33",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === "ios" ? 10 : 5,
    color: "#fff",
  },
  header: { height: 60, backgroundColor: "#075E54", flexDirection: "row", alignItems: "center", paddingHorizontal: 15 },
  headerText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  inboxItem: { flexDirection: "row", padding: 10, borderBottomWidth: 1, borderColor: "#333", alignItems: "center" },
  nameText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  lastMessage: { fontSize: 14, color: "#aaa" },
  unreadBadge: { backgroundColor: "#25D366", borderRadius: 12, minWidth: 24, paddingHorizontal: 6, paddingVertical: 2, justifyContent: "center", alignItems: "center" },
  unreadText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  messageRow: { flexDirection: "row", marginVertical: 4, alignItems: "flex-end" },
  avatar: { width: 36, height: 36, borderRadius: 18, marginHorizontal: 6 },
  messageBubble: { maxWidth: "75%", padding: 10, borderRadius: 10 },
  myBubble: { backgroundColor: "#25D366" },
  theirBubble: { backgroundColor: "#1E2C33" },
  senderName: { fontSize: 12, fontWeight: "600", color: "#fff" },
  messageText: { fontSize: 16, color: "#fff" },
  inputBar: { flexDirection: "row", padding: 8, backgroundColor: "#121B22", borderTopWidth: 1, borderColor: "#333" },
  textBox: { flex: 1, backgroundColor: "#1E2C33", borderRadius: 20, paddingHorizontal: 15, paddingVertical: Platform.OS === "ios" ? 10 : 5, color: "#fff" },
  sendBtn: { marginLeft: 8, backgroundColor: "#25D366", padding: 10, borderRadius: 20 },
});
