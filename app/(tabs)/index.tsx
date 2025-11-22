import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  doc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

/////////////////////////////
// TypingIndicator Component
/////////////////////////////

const TypingIndicator = () => {
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveDot((prev) => (prev + 1) % 3);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.typingContainer}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.typingDot,
            {
              opacity: activeDot === i ? 1 : 0.3,
              transform: [{ scale: activeDot === i ? 1.2 : 1 }],
            },
          ]}
        />
      ))}
    </View>
  );
};

/////////////////////////////
// SendInput Component
/////////////////////////////

const SendInput = ({ text, setText, onSend }) => {
  const handlePress = () => {
    if (text.trim()) onSend();
  };

  return (
    <View style={styles.inputBar}>
      <TextInput
        style={styles.textBox}
        placeholder="Type a message..."
        value={text}
        onChangeText={setText}
        multiline
        returnKeyType="send"
        onSubmitEditing={handlePress}
      />
      <TouchableOpacity
        style={[styles.sendBtn, { opacity: text.trim() ? 1 : 0.5 }]}
        onPress={handlePress}
        disabled={!text.trim()}
      >
        <Ionicons name="send" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

/////////////////////////////
// ChatScreen Component
/////////////////////////////

export default function ChatScreen({
  user,
  receiverEmail,
  activeGroup,
  setActiveScreen,
  setActiveGroup,
}) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [receiverProfile, setReceiverProfile] = useState(null);
  const flatListRef = useRef(null);

  /////////////////////////////
  // Fetch receiver profile (safe)
  /////////////////////////////

  useEffect(() => {
    if (!receiverEmail) return;

    const fetchProfile = async () => {
      // FIX: must use correct user path
      const profileRef = doc(db, "acc", "elijah", "users", receiverEmail);
      const snap = await getDoc(profileRef);

      if (snap.exists()) setReceiverProfile(snap.data());
      else setReceiverProfile({ email: receiverEmail });
    };

    fetchProfile();
  }, [receiverEmail]);

  /////////////////////////////
  // Messages listener
  /////////////////////////////

  useEffect(() => {
    if (!user?.email) return;

    let chatRef;

    if (activeGroup) {
      chatRef = collection(
        db,
        "acc",
        "elijah",
        "groups",
        activeGroup.id,
        "messages"
      );
    } else if (receiverEmail) {
      chatRef = collection(
        db,
        "acc",
        "elijah",
        user.email,
        "chats",
        receiverEmail,
        "messages"
      );
    }

    if (!chatRef) return;

    const qRef = query(chatRef, orderBy("timestamp", "asc"));

    const unsub = onSnapshot(qRef, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(arr);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 20);
    });

    return () => unsub();
  }, [receiverEmail, activeGroup, user]);

  /////////////////////////////
  // Typing listener
  /////////////////////////////

  useEffect(() => {
    if (!user?.email) return;

    let typingCol;

    if (activeGroup) {
      typingCol = collection(
        db,
        "acc",
        "elijah",
        "groups",
        activeGroup.id,
        "typing"
      );
    } else if (receiverEmail) {
      typingCol = collection(
        db,
        "acc",
        "elijah",
        receiverEmail,
        "chats",
        user.email,
        "typing"
      );
    }

    if (!typingCol) return;

    const unsub = onSnapshot(typingCol, (snap) => {
      const usersTyping = snap.docs
        .filter((d) => d.id !== user.email && d.data()?.isTyping)
        .map((d) => d.id);

      setTypingUsers(usersTyping);
    });

    return () => unsub();
  }, [receiverEmail, activeGroup, user]);

  /////////////////////////////
  // Handle typing (SAFE)
  /////////////////////////////

  const handleTyping = async (val) => {
    setText(val);
    if (!user?.email) return;

    const typingRef = activeGroup
      ? doc(
          db,
          "acc",
          "elijah",
          "groups",
          activeGroup.id,
          "typing",
          user.email
        )
      : doc(
          db,
          "acc",
          "elijah",
          receiverEmail,
          "chats",
          user.email,
          "typing"
        );

    await setDoc(
      typingRef,
      { isTyping: !!val.trim(), lastUpdate: new Date() },
      { merge: true }
    );
  };

  /////////////////////////////
  // Handle send
  /////////////////////////////

  const handleSend = async () => {
    if (!text.trim() || !user?.email) return;

    const timestamp = new Date();

    const message = {
      text,
      senderEmail: user.email,
      senderName: user.name || user.email.split("@")[0],
      senderAvatar:
        user.avatar || `https://i.pravatar.cc/150?u=${user.email}`,
      timestamp,
    };

    // Optimistic UI update
    setMessages((prev) =>
      [...prev, { id: `tmp-${Math.random()}`, ...message }].sort(
        (a, b) =>
          (a.timestamp?.toDate?.() || a.timestamp) -
          (b.timestamp?.toDate?.() || b.timestamp)
      )
    );

    flatListRef.current?.scrollToEnd({ animated: true });

    try {
      if (activeGroup) {
        const groupRef = collection(
          db,
          "acc",
          "elijah",
          "groups",
          activeGroup.id,
          "messages"
        );
        await addDoc(groupRef, message);
      } else if (receiverEmail) {
        // send to both "my" and "their" chat
        const senderRef = collection(
          db,
          "acc",
          "elijah",
          user.email,
          "chats",
          receiverEmail,
          "messages"
        );

        const receiverRef = collection(
          db,
          "acc",
          "elijah",
          receiverEmail,
          "chats",
          user.email,
          "messages"
        );

        await Promise.all([addDoc(senderRef, message), addDoc(receiverRef, message)]);
      }
    } catch (err) {
      console.error("Send message error:", err);
    }

    setText("");
    handleTyping("");
  };

  /////////////////////////////
  // Render
  /////////////////////////////

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* HEADER */}
      <View style={styles.chatHeader}>
        <Text style={styles.title}>
          {activeGroup
            ? activeGroup.name
            : receiverProfile?.name || receiverEmail}
        </Text>
        <TouchableOpacity
          onPress={() => {
            setActiveGroup(null);
            setActiveScreen(activeGroup ? "groups" : "sms");
          }}
        >
          <Ionicons name="arrow-back-outline" size={28} color="#000" />
        </TouchableOpacity>
      </View>

      {/* MESSAGES */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isMe = item.senderEmail === user.email;
          const date = item.timestamp?.toDate
            ? item.timestamp.toDate()
            : new Date(item.timestamp);

          return (
            <View
              style={[
                styles.messageRow,
                isMe
                  ? { justifyContent: "flex-end" }
                  : { justifyContent: "flex-start" },
              ]}
            >
              {!isMe && (
                <Image source={{ uri: item.senderAvatar }} style={styles.avatar} />
              )}

              <View
                style={[
                  styles.messageBubble,
                  isMe ? styles.myBubble : styles.theirBubble,
                ]}
              >
                {!isMe && <Text style={styles.senderName}>{item.senderName}</Text>}

                <Text
                  style={[
                    styles.messageText,
                    !isMe && { color: "#000" }, // FIX: readable text
                  ]}
                >
                  {item.text}
                </Text>

                <Text style={styles.timestamp}>
                  {date.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>

              {isMe && (
                <Image source={{ uri: item.senderAvatar }} style={styles.avatar} />
              )}
            </View>
          );
        }}
        contentContainerStyle={{ padding: 10 }}
      />

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginLeft: 15,
            marginBottom: 5,
          }}
        >
          <TypingIndicator />
          <Text style={{ marginLeft: 8, color: "#666", fontStyle: "italic" }}>
            {typingUsers.join(", ")}{" "}
            {typingUsers.length === 1 ? "is" : "are"} typing...
          </Text>
        </View>
      )}

      {/* Send Input */}
      <SendInput text={text} setText={handleTyping} onSend={handleSend} />
    </KeyboardAvoidingView>
  );
}

/////////////////////////////
// Styles
/////////////////////////////

const styles = StyleSheet.create({
  container: { flex: 1, width: "100%", backgroundColor: "#E5DDD5" },
  title: { fontSize: 22, fontWeight: "bold" },
  chatHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 4,
    paddingHorizontal: 10,
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  messageBubble: {
    maxWidth: "75%",
    padding: 10,
    borderRadius: 15,
    marginHorizontal: 4,
  },
  myBubble: {
    backgroundColor: "#34B76B",
    borderTopRightRadius: 0,
  },
  theirBubble: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 0,
  },
  messageText: { fontSize: 16, color: "#fff" },
  senderName: { fontSize: 12, color: "#444", marginBottom: 2 },
  timestamp: { fontSize: 10, color: "#444", alignSelf: "flex-end", marginTop: 4 },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    width: "100%",
    borderTopWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  textBox: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: "#128C7E",
    borderRadius: 20,
    padding: 12,
  },
  typingContainer: {
    flexDirection: "row",
    marginLeft: 15,
    marginBottom: 5,
    height: 10,
    alignItems: "center",
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#666",
    marginHorizontal: 2,
  },
});
