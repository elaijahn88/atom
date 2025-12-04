import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  Animated,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ref, onValue, push, update } from "firebase/database";
import { db } from "../../firebase";

export default function GreenChatTextOnly() {
  const userEmail = "elajahn8@gmail.com";
  const userKey = userEmail.replace(/\./g, ",");

  const [users, setUsers] = useState({});
  const [groups, setGroups] = useState({});
  const [inbox, setInbox] = useState({});
  const [receiverKey, setReceiverKey] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const flatListRef = useRef(null);

  // Load data
  useEffect(() => {
    onValue(ref(db, "users"), (snap) =>
      setUsers(snap.exists() ? snap.val() : {})
    );
    onValue(ref(db, "groups"), (snap) =>
      setGroups(snap.exists() ? snap.val() : {})
    );
    onValue(ref(db, `users/${userKey}/inbox`), (snap) =>
      setInbox(snap.exists() ? snap.val() : {})
    );
  }, []);

  // Messages
  useEffect(() => {
    if (!receiverKey) return;
    const isGroup = receiverKey.startsWith("group_");
    const id = isGroup ? receiverKey : [userKey, receiverKey].sort().join("_");
    const path = isGroup ? `groupChats/${id}` : `chats/${id}`;
    const unsub = onValue(ref(db, path), (snap) => {
      const list = [];
      snap.forEach((s) => list.push({ id: s.key, ...s.val() }));
      setMessages(list.sort((a, b) => a.timestamp - b.timestamp));
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        50
      );
    });
    return () => unsub();
  }, [receiverKey]);

  // Send
  const sendMessage = async () => {
    if (!text.trim() || !receiverKey) return;
    const isGroup = receiverKey.startsWith("group_");
    const id = isGroup ? receiverKey : [userKey, receiverKey].sort().join("_");
    const path = isGroup ? `groupChats/${id}` : `chats/${id}`;
    const msg = {
      sender: userKey,
      text: text,
      timestamp: Date.now(),
      type: "text",
      reactions: {},
    };
    await push(ref(db, path), msg);
    isGroup ? updateGroupInbox(text, id) : updatePrivateInbox(text);
    setText("");
  };

  const updatePrivateInbox = async (text) => {
    const updates = {};
    updates[`users/${userKey}/inbox/${receiverKey}`] = {
      lastText: text,
      timestamp: Date.now(),
      unreadCount: 0,
    };
    updates[`users/${receiverKey}/inbox/${userKey}`] = {
      lastText: text,
      timestamp: Date.now(),
      unreadCount:
        (users[receiverKey]?.inbox?.[userKey]?.unreadCount || 0) + 1,
    };
    await update(ref(db), updates);
  };

  const updateGroupInbox = async (text, groupId) => {
    const members = groups[groupId]?.members || {};
    const updates = {};
    Object.keys(members).forEach((uid) => {
      updates[`users/${uid}/inbox/${groupId}`] = {
        lastText: text,
        timestamp: Date.now(),
        unreadCount:
          uid === userKey
            ? 0
            : (users[uid]?.inbox?.[groupId]?.unreadCount || 0) + 1,
      };
    });
    await update(ref(db), updates);
  };

  useEffect(() => {
    if (!receiverKey) return;
    update(ref(db, `users/${userKey}/inbox/${receiverKey}`), {
      unreadCount: 0,
    });
  }, [receiverKey]);

  const sortedInbox = Object.keys(inbox).sort(
    (a, b) => inbox[b]?.timestamp - inbox[a]?.timestamp
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#075E54" barStyle="light-content" />
      <View style={styles.topBar}>
        <Text style={styles.logo}>Green Chat</Text>
        <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
      </View>

      {/* Inbox */}
      {!receiverKey && (
        <FlatList
          data={sortedInbox}
          keyExtractor={(k) => k}
          contentContainerStyle={{ paddingBottom: 10 }}
          renderItem={({ item }) => {
            const isGroup = item.startsWith("group_");
            const data = isGroup ? groups[item] : users[item];
            if (!data) return null;
            const i = inbox[item];

            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setReceiverKey(item)}
              >
                <View style={styles.inboxItem}>
                  <Image
                    source={{ uri: data.avatar || data.groupIcon }}
                    style={styles.avatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{data.name}</Text>
                    <Text style={styles.last} numberOfLines={1}>
                      {i?.lastText || "Say hi!"}
                    </Text>
                  </View>
                  {i?.unreadCount > 0 && (
                    <View style={styles.unread}>
                      <Text style={{ color: "#fff", fontSize: 12 }}>
                        {i.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Chat */}
      {receiverKey && (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setReceiverKey(null)}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Image
              source={{
                uri:
                  groups[receiverKey]?.groupIcon ||
                  users[receiverKey]?.avatar ||
                  "https://i.pravatar.cc/100",
              }}
              style={styles.headerAvatar}
            />
            <Text style={styles.headerName}>
              {receiverKey.startsWith("group_")
                ? groups[receiverKey]?.name
                : users[receiverKey]?.name}
            </Text>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ padding: 10 }}
            renderItem={({ item }) => {
              const mine = item.sender === userKey;
              const senderName = users[item.sender]?.name || "Unknown";
              return (
                <View
                  style={[
                    styles.msgContainer,
                    mine ? styles.right : styles.left,
                  ]}
                >
                  {!mine && (
                    <Text style={styles.senderName}>{senderName}</Text>
                  )}
                  <View style={[styles.message, mine && styles.mine]}>
                    <Text style={{ color: "#fff" }}>{item.text}</Text>
                  </View>
                </View>
              );
            }}
          />

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Message..."
              placeholderTextColor="#888"
            />
            <TouchableOpacity onPress={sendMessage}>
              <Ionicons name="send" size={22} color="#25D366" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121B22" },
  topBar: {
    backgroundColor: "#075E54",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    alignItems: "center",
  },
  logo: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  inboxItem: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderColor: "#2A3942",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  name: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  last: { color: "#aaa", fontSize: 13 },
  unread: {
    backgroundColor: "#25D366",
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  header: {
    backgroundColor: "#075E54",
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 8,
  },
  headerName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  msgContainer: { marginVertical: 4, maxWidth: "80%" },
  left: { alignSelf: "flex-start" },
  right: { alignSelf: "flex-end" },
  senderName: { color: "#25D366", fontSize: 12, marginLeft: 8, marginBottom: 3 },
  message: {
    backgroundColor: "#1E2C33",
    padding: 10,
    borderRadius: 10,
  },
  mine: { backgroundColor: "#056162" },
  inputBar: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#1E2C33",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#2A3942",
    borderRadius: 25,
    paddingHorizontal: 15,
    color: "#fff",
    marginRight: 8,
  },
});
