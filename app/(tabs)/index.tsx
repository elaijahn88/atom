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
import { doc, collection, query, orderBy, onSnapshot, addDoc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
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
            { opacity: activeDot === i ? 1 : 0.3, transform: [{ scale: activeDot === i ? 1.2 : 1 }] },
          ]}
        />
      ))}
    </View>
  );
};

/////////////////////////////
// SendInput Component
/////////////////////////////

const SendInput = ({ text, setText, onSend }) => (
  <View style={styles.inputBar}>
    <TextInput
      style={styles.textBox}
      placeholder="Type a message..."
      value={text}
      onChangeText={setText}
      multiline
    />
    <TouchableOpacity style={styles.sendBtn} onPress={onSend}>
      <Ionicons name="send" size={22} color="#fff" />
    </TouchableOpacity>
  </View>
);

/////////////////////////////
// ChatScreen Component
/////////////////////////////

export default function ChatScreen({ user, receiverEmail, activeGroup, setActiveScreen, setActiveGroup }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [receiverProfile, setReceiverProfile] = useState(null);
  const flatListRef = useRef(null);

  /////////////////////////////
  // Fetch receiver profile
  /////////////////////////////

  useEffect(() => {
    if (!receiverEmail) return;
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, "acc", "elijah", receiverEmail));
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
      chatRef = collection(db, "acc", "elijah", "groups", activeGroup.id, "messages");
    } else if (receiverEmail) {
      chatRef = collection(db, "acc", "elijah", user.email, "chats", receiverEmail, "messages");
    }
    if (!chatRef) return;

    const q = query(chatRef, orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(arr);
      flatListRef.current?.scrollToEnd({ animated: true });

      // Reset unread if private chat
      if (!activeGroup && receiverEmail) {
        const receiverDoc = doc(db, "acc", "elijah", user.email);
        getDoc(receiverDoc).then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const updatedInbox = (data.inbox || []).map((i) =>
              i.peer === receiverEmail ? { ...i, unreadCount: 0 } : i
            );
            updateDoc(receiverDoc, { inbox: updatedInbox });
          }
        });
      }
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
      typingCol = collection(db, "acc", "elijah", "groups", activeGroup.id, "typing");
    } else if (receiverEmail) {
      typingCol = collection(db, "acc", "elijah", receiverEmail, "chats", user.email, "typing");
    }
    if (!typingCol) return;

    const unsub = onSnapshot(typingCol, (snap) => {
      const usersTyping = snap.docs
        .filter((d) => d.id !== user.email && d.data().isTyping)
        .map((d) => d.id);
      setTypingUsers(usersTyping);
    });

    return () => unsub();
  }, [receiverEmail, activeGroup, user]);

  /////////////////////////////
  // Handle typing
  /////////////////////////////

  const handleTyping = (val) => {
    setText(val);
    if (!user?.email) return;

    const typingRef = activeGroup
      ? doc(db, "acc", "elijah", "groups", activeGroup.id, "typing", user.email)
      : doc(db, "acc", "elijah", receiverEmail, "chats", user.email, "typing");

    updateDoc(typingRef, { isTyping: !!val.trim(), lastUpdate: new Date() }).catch(console.error);
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
      senderAvatar: user.avatar || `https://i.pravatar.cc/150?u=${user.email}`,
      timestamp,
    };

    try {
      if (activeGroup) {
        const groupRef = collection(db, "acc", "elijah", "groups", activeGroup.id, "messages");
        await addDoc(groupRef, message);
      } else if (receiverEmail) {
        const senderRef = collection(db, "acc", "elijah", user.email, "chats", receiverEmail, "messages");
        const receiverRef = collection(db, "acc", "elijah", receiverEmail, "chats", user.email, "messages");

        await Promise.all([addDoc(senderRef, message), addDoc(receiverRef, message)]);

        // Update inbox for sender
        const senderDoc = doc(db, "acc", "elijah", user.email);
        await updateDoc(senderDoc, {
          inbox: arrayUnion({ peer: receiverEmail, text, timestamp, unreadCount: 0 }),
        });

        // Update inbox for receiver
        const receiverDoc = doc(db, "acc", "elijah", receiverEmail);
        const snap = await getDoc(receiverDoc);
        if (snap.exists()) {
          const data = snap.data();
          const updatedInbox = (data.inbox || []).filter((i) => i.peer !== user.email);
          const existing = data.inbox?.find((i) => i.peer === user.email);
          const newUnread = existing ? (existing.unreadCount || 0) + 1 : 1;
          updatedInbox.push({ peer: user.email, text, timestamp, unreadCount: newUnread });
          await updateDoc(receiverDoc, { inbox: updatedInbox });
        }
      }
    } catch (err) {
      console.error("Send message error:", err);
    }

    setText("");
    handleTyping(""); // reset typing
  };

  /////////////////////////////
  // Render
  /////////////////////////////

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <Text style={styles.title}>{activeGroup ? activeGroup.name : receiverProfile?.name || receiverEmail}</Text>
        <TouchableOpacity
          onPress={() => {
            setActiveGroup(null);
            setActiveScreen(activeGroup ? "groups" : "sms");
          }}
        >
          <Ionicons name="arrow-back-outline" size={28} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        style={{ width: "100%" }}
        renderItem={({ item }) => (
          <View style={[styles.messageRow, item.senderEmail === user.email ? { flexDirection: "row-reverse" } : {}]}>
            <Image source={{ uri: item.senderAvatar }} style={styles.avatar} />
            <View style={[styles.messageBubble, item.senderEmail === user.email ? styles.myBubble : styles.theirBubble]}>
              <Text style={styles.senderName}>{item.senderName}</Text>
              <Text style={styles.messageText}>{item.text}</Text>
              <Text style={styles.timestamp}>
                {new Date(item.timestamp.seconds ? item.timestamp.seconds * 1000 : item.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={{ padding: 10 }}
      />

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 15, marginBottom: 5 }}>
          <TypingIndicator />
          <Text style={{ marginLeft: 8, color: "#666", fontStyle: "italic" }}>
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </Text>
        </View>
      )}

      {/* Send input */}
      <SendInput text={text} setText={handleTyping} onSend={handleSend} />
    </KeyboardAvoidingView>
  );
}

/////////////////////////////
// Styles
/////////////////////////////

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80, width: "100%" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15 },
  chatHeader: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderColor: "#ddd" },
  messageRow: { flexDirection: "row", alignItems: "flex-end", marginVertical: 5, paddingHorizontal: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginHorizontal: 6 },
  messageBubble: { maxWidth: "70%", padding: 10, borderRadius: 10 },
  myBubble: { backgroundColor: "#B9FBC0", alignSelf: "flex-end" },
  theirBubble: { backgroundColor: "#fff", alignSelf: "flex-start" },
  senderName: { fontSize: 12, fontWeight: "600", marginBottom: 2, color: "#333" },
  messageText: { fontSize: 16, color: "#000" },
  timestamp: { fontSize: 10, color: "#888", alignSelf: "flex-end", marginTop: 2 },
  inputBar: { flexDirection: "row", alignItems: "center", padding: 8, width: "100%", borderTopWidth: 1, borderColor: "#ddd" },
  textBox: { flex: 1, backgroundColor: "#f1f1f1", borderRadius: 25, paddingHorizontal: 15, paddingVertical: 8, fontSize: 16 },
  sendBtn: { marginLeft: 8, backgroundColor: "#25D366", borderRadius: 25, padding: 12 },
  typingContainer: { flexDirection: "row", marginLeft: 15, marginBottom: 5, height: 10, alignItems: "center" },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#666", marginHorizontal: 2 },
});
