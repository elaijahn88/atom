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

export default function GreenChatApp() {
  const db = database;

  // ------------------ MAIN USER ------------------
  const user = {
    email: "elajahn8@gmail.com",
    name: "Elajahn",
    avatar: "https://i.pravatar.cc/150?u=elajahn8",
  };

  const sanitizeEmail = (email) => email.replace(/\./g, ",");

  // ------------------ DEFAULT USERS (10) ------------------
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

  // ------------------ STATE ------------------
  const [messages, setMessages] = useState([]);
  const [receiverEmail, setReceiverEmail] = useState("");
  const [receiverProfile, setReceiverProfile] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const typingAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  // ------------------ PRESENCE ------------------
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

  // ------------------ INITIAL USER SETUP ------------------
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

      // Create all default users on first run
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

      // Create inbox entries
      const inboxData = {};
      defaultUsers.forEach((u) => {
        inboxData[sanitizeEmail(u.email)] = {
          lastText: "",
          unreadCount: 0,
          timestamp: null,
        };
      });
      update(mainRef, { inbox: inboxData });
    };

    setupUsers();
  }, []);

  // ------------------ INBOX LISTENER ------------------
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

      setInbox(
        inboxArr.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      );
    });
  }, []);

  // ------------------ PREPOPULATE FIRST MESSAGE ------------------
  const createInitialMessages = async (peerEmail) => {
    const chatPath = `chats/${[user.email, peerEmail].sort().join("_")}/messages`;
    const messagesRef = ref(db, chatPath);

    return new Promise((resolve) => {
      onValue(
        messagesRef,
        (snap) => {
          if (!snap.exists()) {
            const bot = defaultUsers.find((u) => u.email === peerEmail);
            if (!bot) return resolve();

            const msg = {
              text: `Hi! I'm ${bot.name}. Nice to chat with you!`,
              senderEmail: bot.email,
              senderName: bot.name,
              senderAvatar: bot.avatar,
              timestamp: serverTimestamp(),
            };
            const newMsgRef = push(messagesRef);
            set(newMsgRef, msg);
          }
          resolve();
        },
        { onlyOnce: true }
      );
    });
  };

  // ------------------ SELECT RECEIVER ------------------
  useEffect(() => {
    if (!receiverEmail) return setReceiverProfile(null);

    const receiverRef = ref(db, `users/${sanitizeEmail(receiverEmail)}`);

    const unsub = onValue(receiverRef, (snap) => {
      if (snap.exists()) setReceiverProfile(snap.val());
    });

    // Reset unread count
    update(
      ref(
        db,
        `users/${sanitizeEmail(user.email)}/inbox/${sanitizeEmail(receiverEmail)}`
      ),
      { unreadCount: 0 }
    );

    createInitialMessages(receiverEmail);

    return () => unsub();
  }, [receiverEmail]);

  // ------------------ MESSAGES LISTENER ------------------
  useEffect(() => {
    if (!receiverEmail) return;

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

      // Mark all incoming messages as read
      msgs.forEach((msg) => {
        if (msg.senderEmail !== user.email) {
          update(
            ref(db, `${chatPath}/${msg.id}/readBy/${sanitizeEmail(user.email)}`),
            true
          );
        }
      });

      setMessages(msgs);

      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100
      );
    });
  }, [receiverEmail]);

  // ------------------ AI AUTO-REPLY ------------------
  const generateAIReply = (incomingText, botName) => {
    const replies = [
      `That's interesting!`,
      `Tell me more.`,
      `Really? Why is that?`,
      `Haha that's funny 😄`,
      `I didn't expect that.`,
      `I'm here! What's up?`,
      `Cool! Let’s chat more.`,
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  };

  // ------------------ SEND MESSAGE ------------------
  const handleSend = async () => {
    if (!text.trim()) return;

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

    // Inbox updates
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

    // ------------------ BOT AUTO-REPLY ------------------
    const isBot = defaultUsers.some((u) => u.email === receiverEmail);
    if (isBot) {
      const botUser = defaultUsers.find((u) => u.email === receiverEmail);

      setIsTyping(true);
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(typingAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();

      setTimeout(async () => {
        setIsTyping(false);
        typingAnim.stopAnimation();

        const botMsg = {
          text: generateAIReply(text, botUser.name),
          senderEmail: botUser.email,
          senderName: botUser.name,
          senderAvatar: botUser.avatar,
          timestamp: serverTimestamp(),
          readBy: {},
        };

        const botMsgRef = push(ref(db, chatPath));
        await set(botMsgRef, botMsg);

        // Inbox for me
        update(
          ref(
            db,
            `users/${sanitizeEmail(user.email)}/inbox/${sanitizeEmail(receiverEmail)}`
          ),
          {
            lastText: botMsg.text,
            timestamp: Date.now(),
            unreadCount: 1,
          }
        );
      }, 1200);
    }
  };

  // ------------------ READ RECEIPTS ------------------
  const getReceipt = (msg) => {
    if (msg.senderEmail !== user.email) return "";

    const readCount = Object.keys(msg.readBy || {}).length;

    if (readCount <= 1) return "✓";        // sent
    if (readCount === 2) return "✓✓";      // delivered
    if (readCount > 2) return "✓✓";        // (only show blue color, not special symbol)
  };

  // ------------------ TYPING INDICATOR ------------------
  const renderTypingBubble = () => {
    if (!isTyping) return null;

    const scale = typingAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
    });

    return (
      <View style={styles.typingContainer}>
        <Animated.View style={[styles.typingBubble, { transform: [{ scale }] }]}>
          <Text style={styles.typingDots}>●●●</Text>
        </Animated.View>
      </View>
    );
  };

  // ------------------ UI ------------------
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#075E54" barStyle="light-content" />

      <Text style={styles.appLogo}>Green Chat</Text>

      {/* SELECT RECEIVER */}
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
      {!receiverEmail && (
        <FlatList
          style={{ maxHeight: 250 }}
          data={inbox}
          keyExtractor={(item) => item.peer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.inboxItem}
              onPress={() => setReceiverEmail(item.peer)}
            >
              <Image
                source={{ uri: item.avatar }}
                style={{ width: 40, height: 40, borderRadius: 20 }}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.nameText}>{item.name}</Text>
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

      {/* CHAT VIEW */}
      {receiverEmail && (
        <>
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setReceiverEmail("")}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={{ marginLeft: 10 }}>
              <Text style={styles.headerText}>{receiverProfile?.name}</Text>
              <Text
                style={{
                  fontSize: 12,
                  color:
                    receiverProfile?.status === "online" ? "#00FF95" : "#aaa",
                }}
              >
                {receiverProfile?.status}
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
                  <Image source={{ uri: item.senderAvatar }} style={styles.avatar} />

                  <View
                    style={[
                      styles.messageBubble,
                      mine ? styles.myBubble : styles.theirBubble,
                    ]}
                  >
                    <Text style={styles.senderName}>{item.senderName}</Text>
                    <Text style={styles.messageText}>{item.text}</Text>

                    {mine && (
                      <Text
                        style={{
                          color:
                            Object.keys(item.readBy || {}).length > 1
                              ? "#00c2ff"
                              : "#ddd",
                          fontSize: 12,
                          marginTop: 2,
                          textAlign: "right",
                        }}
                      >
                        {getReceipt(item)}
                      </Text>
                    )}
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

// ------------------ STYLES ------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121B22" },
  appLogo: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "bold",
    color: "#25D366",
    paddingVertical: 10,
  },
  chatTo: { paddingHorizontal: 10, paddingBottom: 5 },
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
  unreadBadge: {
    backgroundColor: "#25D366",
    borderRadius: 12,
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadText: { color: "#fff", fontWeight: "bold", fontSize: 12 },

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

  // TYPING INDICATOR (CENTERED)
  typingContainer: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  typingBubble: {
    backgroundColor: "#1E2C33",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  typingDots: {
    color: "#fff",
    fontSize: 20,
    letterSpacing: 2,
  },
});
