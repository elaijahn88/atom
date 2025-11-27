// --- ENTIRE FIXED FILE ---
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  StatusBar,
  Platform,
  Animated,
} from "react-native";
import { AppState } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  ref,
  set,
  push,
  onValue,
  update,
  serverTimestamp,
} from "firebase/database";
import { database } from "../../firebase";

export default function Green() {
  const db = database;

  const user = {
    email: "elajahn8@gmail.com",
    name: "Elajahn",
    avatar: "https://i.pravatar.cc/150?u=elajahn8",
  };

  const sanitizeEmail = (email) =>
    email ? email.replace(/\./g, ",") : "";

  const defaultUsers = [
    { email: "alice@green.com", name: "Alice", avatar: "https://i.pravatar.cc/150?u=alice" },
    { email: "bob@green.com", name: "Bob", avatar: "https://i.pravatar.cc/150?u=bob" },
    { email: "charlie@green.com", name: "Charlie", avatar: "https://i.pravatar.cc/150?u=charlie" },
    { email: "diana@green.com", name: "Diana", avatar: "https://i.pravatar.cc/150?u=diana" },
    { email: "eric@green.com", name: "Eric", avatar: "https://i.pravatar.cc/150?u=eric" },
    { email: "fiona@green.com", name: "Fiona", avatar: "https://i.pravatar.cc/150?u=fiona" },
    { email: "george@green.com", name: "George", avatar: "https://i.pravatar.cc/150?u=george" },
    { email: "hannah@green.com", name: "Hannah", avatar: "https://i.pravatar.cc/150?u=hannah" },
    { email: "ian@green.com", name: "Ian", avatar: "https://i.pravatar.cc/150?u=ian" },
    { email: "julia@green.com", name: "Julia", avatar: "https://i.pravatar.cc/150?u=julia" },
  ];

  const [messages, setMessages] = useState([]);
  const [receiverEmail, setReceiverEmail] = useState("");
  const [receiverProfile, setReceiverProfile] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  // --- PRESENCE ---
  useEffect(() => {
    const presenceRef = ref(db, `users/${sanitizeEmail(user.email)}/status`);
    const goOnline = () => set(presenceRef, "online");
    const goOffline = () => set(presenceRef, "offline");

    goOnline();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") goOnline();
      else goOffline();
    });

    return () => {
      sub.remove();
      goOffline();
    };
  }, []);

  // --- USER SETUP ---
  useEffect(() => {
    const setupUsers = async () => {
      const mainRef = ref(db, `users/${sanitizeEmail(user.email)}`);

      onValue(
        mainRef,
        (snap) => {
          if (!snap.exists()) {
            set(mainRef, {
              name: user.name,
              email: user.email,
              avatar: user.avatar,
              status: "online",
              inbox: {},
            });
          }
        },
        { onlyOnce: true }
      );

      for (let u of defaultUsers) {
        const uRef = ref(db, `users/${sanitizeEmail(u.email)}`);
        onValue(
          uRef,
          (snap) => {
            if (!snap.exists()) {
              set(uRef, {
                name: u.name,
                email: u.email,
                avatar: u.avatar,
                status: "offline",
                inbox: {},
              });
            }
          },
          { onlyOnce: true }
        );
      }

      const inboxData = {};
      defaultUsers.forEach((u) => {
        inboxData[sanitizeEmail(u.email)] = {
          lastText: "",
          unreadCount: 0,
          timestamp: 0,
        };
      });

      update(mainRef, { inbox: inboxData });
    };

    setupUsers();
  }, []);

  // --- INBOX LISTENER ---
  useEffect(() => {
    const inboxRef = ref(db, `users/${sanitizeEmail(user.email)}/inbox`);

    return onValue(inboxRef, async (snap) => {
      if (!snap.exists()) return setInbox([]);

      const data = snap.val();
      const inboxArr = [];

      for (let [peerSanitized, val] of Object.entries(data)) {
        const peerEmail = peerSanitized.replace(/,/g, ".");
        const userRef = ref(db, `users/${peerSanitized}`);

        let profile = {};
        await new Promise((resolve) =>
          onValue(
            userRef,
            (snap2) => {
              if (snap2.exists()) profile = snap2.val();
              resolve();
            },
            { onlyOnce: true }
          )
        );

        inboxArr.push({
          peer: peerEmail,
          peerSanitized,
          name: profile.name || peerEmail,
          avatar: profile.avatar,
          status: profile.status,
          ...val,
        });
      }

      setInbox(inboxArr);
    });
  }, []);

  // ---- RECEIVER LISTENER ----
  useEffect(() => {
    // Prevent crashes for invalid emails (typed input)
    if (!receiverEmail.includes("@") || !receiverEmail.includes(".")) {
      setReceiverProfile(null);
      return;
    }

    const receiverRef = ref(db, `users/${sanitizeEmail(receiverEmail)}`);

    const unsub = onValue(receiverRef, (snap) => {
      if (snap.exists()) setReceiverProfile(snap.val());
      else setReceiverProfile(null); // prevents undefined crash
    });

    // Reset unread count
    update(
      ref(
        db,
        `users/${sanitizeEmail(user.email)}/inbox/${sanitizeEmail(receiverEmail)}`
      ),
      { unreadCount: 0 }
    );

    return () => unsub();
  }, [receiverEmail]);

  // --- MESSAGES ---
  useEffect(() => {
    if (!receiverEmail.includes("@")) return;
    if (!receiverProfile) return;

    const chatPath = `chats/${[user.email, receiverEmail].sort().join("_")}/messages`;
    const messagesRef = ref(db, chatPath);

    return onValue(messagesRef, (snap) => {
      const msgs = [];
      snap.forEach((child) => {
        msgs.push({
          id: child.key,
          ...child.val(),
          readBy: child.val().readBy || {},
        });
      });

      // FIX: set() instead of update()
      msgs.forEach((msg) => {
        if (msg.senderEmail !== user.email) {
          set(
            ref(
              db,
              `${chatPath}/${msg.id}/readBy/${sanitizeEmail(user.email)}`
            ),
            true
          );
        }
      });

      setMessages(msgs);

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
  }, [receiverEmail, receiverProfile]);

  // SEND MESSAGE --------------
  const handleSend = async () => {
    if (!text.trim()) return;
    if (!receiverEmail.includes("@")) return;

    const chatPath = `chats/${[user.email, receiverEmail].sort().join("_")}/messages`;

    const msg = {
      text,
      senderEmail: user.email,
      senderName: user.name,
      senderAvatar: user.avatar,
      timestamp: serverTimestamp(),
      readBy: {
        [sanitizeEmail(user.email)]: true,
      },
    };

    const newMsgRef = push(ref(db, chatPath));
    await set(newMsgRef, msg);

    update(
      ref(
        db,
        `users/${sanitizeEmail(receiverEmail)}/inbox/${sanitizeEmail(user.email)}`
      ),
      {
        lastText: text,
        timestamp: Date.now(),
        unreadCount: 1,
      }
    );

    update(
      ref(
        db,
        `users/${sanitizeEmail(user.email)}/inbox/${sanitizeEmail(receiverEmail)}`
      ),
      {
        lastText: text,
        timestamp: Date.now(),
        unreadCount: 0,
      }
    );

    setText("");
  };

  // ---- TYPING BUBBLE ----
  const renderTypingBubble = () => {
    if (!isTyping) return null;

    return (
      <View style={styles.typingContainer}>
        <Animated.View
          style={[
            styles.typingBubble,
            {
              transform: [
                {
                  scale: typingAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.typingDots}>●●●</Text>
        </Animated.View>
      </View>
    );
  };

  // ---- MERGED INBOX ----
  const mergedInbox = defaultUsers
    .filter((u) => u.email !== user.email)
    .map((u) => {
      const san = sanitizeEmail(u.email);
      const inboxItem = inbox.find((i) => i.peerSanitized === san);

      return {
        peer: u.email,
        peerSanitized: san,
        name: u.name,
        avatar: u.avatar,
        status: inboxItem?.status || "offline",
        lastText: inboxItem?.lastText || "Say hi!",
        unreadCount: inboxItem?.unreadCount || 0,
        timestamp: inboxItem?.timestamp || 0,
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#075E54" barStyle="light-content" />
      <Text style={styles.appLogo}>Green</Text>

      {/* EMAIL INPUT */}
      <View style={styles.chatTo}>
        <TextInput
          style={styles.chatToInput}
          placeholder="Enter email to chat with"
          placeholderTextColor="#ccc"
          value={receiverEmail}
          onChangeText={(t) => setReceiverEmail(t.trim())}
          autoCapitalize="none"
        />
      </View>

      {/* INBOX */}
      {!receiverEmail.includes("@") && (
        <FlatList
          style={{ maxHeight: 250 }}
          data={mergedInbox}
          keyExtractor={(item) => item.peer}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setReceiverEmail(item.peer)}>
              <View style={styles.inboxItem}>
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.nameText}>{item.name}</Text>
                  <Text numberOfLines={1} style={styles.lastMessage}>
                    {item.lastText}
                  </Text>
                </View>
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* CHAT SCREEN */}
      {receiverEmail.includes("@") && receiverProfile && (
        <>
          {/* HEADER FIXED */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setReceiverEmail("")}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={{ marginLeft: 10 }}>
              <Text style={styles.headerText}>
                {receiverProfile?.name || "Loading..."}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color:
                    receiverProfile?.status === "online"
                      ? "#00FF95"
                      : "#aaa",
                }}
              >
                {receiverProfile?.status || "offline"}
              </Text>
            </View>
          </View>

          {/* MESSAGES */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 10 }}
            renderItem={({ item }) => {
              const mine = item.senderEmail === user.email;
              return (
                <View
                  style={[
                    styles.messageRow,
                    mine && { flexDirection: "row-reverse" },
                  ]}
                >
                  <Image
                    source={{ uri: item.senderAvatar }}
                    style={styles.avatar}
                  />
                  <View
                    style={[
                      styles.messageBubble,
                      mine ? styles.myBubble : styles.theirBubble,
                    ]}
                  >
                    <Text style={styles.senderName}>{item.senderName}</Text>
                    <Text style={styles.messageText}>{item.text}</Text>
                  </View>
                </View>
              );
            }}
          />

          {/* TYPING INDICATOR */}
          {renderTypingBubble()}

          {/* INPUT BAR */}
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

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121B22" },
  appLogo: { color: "#25D366", textAlign: "center", fontSize: 26, marginTop: 10 },
  chatTo: { padding: 10 },
  chatToInput: {
    backgroundColor: "#1E2C33",
    color: "#fff",
    borderRadius: 20,
    paddingHorizontal: 15,
  },
  inboxItem: {
    flexDirection: "row",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    alignItems: "center",
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  nameText: { color: "#fff", fontWeight: "bold" },
  lastMessage: { color: "#aaa", fontSize: 12 },
  unreadBadge: {
    backgroundColor: "#25D366",
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  unreadText: { color: "#fff" },
  header: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#075E54",
    alignItems: "center",
  },
  headerText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  messageRow: { flexDirection: "row", marginBottom: 10, alignItems: "flex-end" },
  messageBubble: {
    padding: 10,
    borderRadius: 10,
    maxWidth: "70%",
    marginHorizontal: 5,
  },
  myBubble: { backgroundColor: "#056162" },
  theirBubble: { backgroundColor: "#1E2C33" },
  senderName: { color: "#ccc", fontSize: 10 },
  messageText: { color: "#fff", fontSize: 14 },
  inputBar: {
    flexDirection: "row",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "#333",
    alignItems: "center",
  },
  textBox: {
    flex: 1,
    backgroundColor: "#1E2C33",
    color: "#fff",
    paddingHorizontal: 15,
    borderRadius: 25,
  },
  sendBtn: {
    backgroundColor: "#25D366",
    padding: 10,
    marginLeft: 5,
    borderRadius: 25,
  },
  typingContainer: { paddingHorizontal: 20 },
  typingBubble: {
    backgroundColor: "#1E2C33",
    padding: 8,
    borderRadius: 10,
    width: 50,
  },
  typingDots: { color: "#fff", textAlign: "center" },
});
