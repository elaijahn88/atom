import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function GreenDemo() {
  const user = {
    email: "elajahn8@gmail.com",
    name: "Elajahn",
    avatar: "https://i.pravatar.cc/150?u=elajahn8",
  };

  // --- 10 demo users ---
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

  const [receiverEmail, setReceiverEmail] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const receiverProfile = defaultUsers.find((u) => u.email === receiverEmail) || null;

  // --- Typing animation ---
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(typingAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(typingAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // --- Simulate "other user typing" ---
  useEffect(() => {
    if (!receiverProfile) return;
    if (messages.length === 0) return;

    const timeout = setTimeout(() => {
      setIsTyping(true);
      const sendDelay = Math.random() * 2000 + 1000;
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            text: "This is a demo reply!",
            senderEmail: receiverProfile.email,
            senderName: receiverProfile.name,
            senderAvatar: receiverProfile.avatar,
          },
        ]);
        setIsTyping(false);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
      }, sendDelay);
    }, Math.random() * 3000 + 1000);

    return () => clearTimeout(timeout);
  }, [messages, receiverProfile]);

  const handleSend = () => {
    if (!text.trim() || !receiverProfile) return;

    const newMsg = {
      id: Date.now().toString(),
      text,
      senderEmail: user.email,
      senderName: user.name,
      senderAvatar: user.avatar,
    };

    setMessages((prev) => [...prev, newMsg]);
    setText("");

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
  };

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

  const mergedInbox = defaultUsers.map((u) => ({
    ...u,
    lastText: messages
      .filter((m) => m.senderEmail === u.email || m.senderEmail === user.email)
      .slice(-1)[0]?.text || "Say hi!",
    unreadCount: messages.filter((m) => m.senderEmail === u.email).length,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.appLogo}>Green</Text>

      {/* EMAIL INPUT */}
      <View style={styles.chatTo}>
        <TextInput
          style={styles.chatToInput}
          placeholder="phone number"
          placeholderTextColor="#ccc"
          value={receiverEmail}
          onChangeText={setReceiverEmail}
          autoCapitalize="none"
        />
      </View>

      {/* INBOX */}
      {!receiverEmail && (
        <FlatList
          style={{ maxHeight: 250 }}
          data={mergedInbox}
          keyExtractor={(item) => item.email}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setReceiverEmail(item.email)}>
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
      {receiverEmail && receiverProfile && (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setReceiverEmail("")}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.headerText}>{receiverProfile.name}</Text>
              <Text style={{ fontSize: 12, color: "#00FF95" }}>online</Text>
            </View>
          </View>

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
                  </View>
                </View>
              );
            }}
          />

          {renderTypingBubble()}

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
  header: { flexDirection: "row", padding: 10, backgroundColor: "#075E54", alignItems: "center" },
  headerText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  messageRow: { flexDirection: "row", marginBottom: 10, alignItems: "flex-end" },
  messageBubble: { padding: 10, borderRadius: 10, maxWidth: "70%", marginHorizontal: 5 },
  myBubble: { backgroundColor: "#056162" },
  theirBubble: { backgroundColor: "#1E2C33" },
  senderName: { color: "#ccc", fontSize: 10 },
  messageText: { color: "#fff", fontSize: 14 },
  inputBar: { flexDirection: "row", padding: 8, borderTopWidth: 1, borderTopColor: "#333", alignItems: "center" },
  textBox: { flex: 1, backgroundColor: "#1E2C33", color: "#fff", paddingHorizontal: 15, borderRadius: 25 },
  sendBtn: { backgroundColor: "#25D366", padding: 10, marginLeft: 5, borderRadius: 25 },
  typingContainer: { paddingHorizontal: 20, marginVertical: 5 },
  typingBubble: { backgroundColor: "#1E2C33", padding: 8, borderRadius: 10, width: 50 },
  typingDots: { color: "#fff", textAlign: "center" },
});
