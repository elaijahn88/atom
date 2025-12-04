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

  // ✅ LOAD USERS + GROUPS + INBOX
  useEffect(() => {
    const uRef = ref(db, "users/users");
    const gRef = ref(db, "groups");
    const iRef = ref(db, `users/users/${userKey}/inbox`);

    const unUsers = onValue(uRef, (s) => setUsers(s.val() || {}));
    const unGroups = onValue(gRef, (s) => setGroups(s.val() || {}));
    const unInbox = onValue(iRef, (s) => setInbox(s.val() || {}));

    return () => {
      unUsers?.();
      unGroups?.();
      unInbox?.();
    };
  }, []);

  // ✅ LOAD MESSAGES (FROM USERS AND GROUPS ONLY)
  useEffect(() => {
    if (!receiverKey) return;

    const isGroup = receiverKey.startsWith("group_");

    const chatId = isGroup
      ? null
      : [userKey, receiverKey].sort().join("_");

    const path = isGroup
      ? `groups/${receiverKey}/messages`
      : `users/users/${userKey}/messages/${chatId}`;

    const unsub = onValue(ref(db, path), (snap) => {
      const list = [];
      snap.forEach((x) => list.push({ id: x.key, ...x.val() }));
      list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setMessages(list);

      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        50
      );
    });

    return () => unsub();
  }, [receiverKey]);

  // ✅ SEND MESSAGE
  const sendMessage = async () => {
    if (!text || !receiverKey) return;

    const isGroup = receiverKey.startsWith("group_");
    const chatId = isGroup
      ? null
      : [userKey, receiverKey].sort().join("_");

    const basePath = isGroup
      ? `groups/${receiverKey}/messages`
      : `users/users/${userKey}/messages/${chatId}`;

    const msg = {
      sender: userKey,
      text,
      timestamp: Date.now(),
    };

    await push(ref(db, basePath), msg);

    // ✅ SYNC PRIVATE COPY TO RECEIVER
    if (!isGroup) {
      await push(
        ref(db, `users/users/${receiverKey}/messages/${chatId}`),
        msg
      );
    }

    updateInbox(text);
    setText("");
  };

  // ✅ UPDATE INBOX (PRIVATE + GROUPS)
  const updateInbox = async (lastText) => {
    const isGroup = receiverKey.startsWith("group_");

    if (isGroup) {
      const members = groups[receiverKey]?.members || {};
      const updates = {};

      Object.keys(members).forEach((uid) => {
        updates[`users/users/${uid}/inbox/${receiverKey}`] = {
          lastText,
          timestamp: Date.now(),
          unreadCount:
            uid === userKey ? 0 : (users[uid]?.inbox?.[receiverKey]?.unreadCount || 0) + 1,
        };
      });

      await update(ref(db), updates);
      return;
    }

    // ✅ PRIVATE
    await update(ref(db), {
      [`users/users/${userKey}/inbox/${receiverKey}`]: {
        lastText,
        timestamp: Date.now(),
        unreadCount: 0,
      },
      [`users/users/${receiverKey}/inbox/${userKey}`]: {
        lastText,
        timestamp: Date.now(),
        unreadCount:
          (users[receiverKey]?.inbox?.[userKey]?.unreadCount || 0) + 1,
      },
    });
  };

  // ✅ MARK READ
  useEffect(() => {
    if (!receiverKey) return;
    update(ref(db, `users/users/${userKey}/inbox/${receiverKey}`), {
      unreadCount: 0,
    });
  }, [receiverKey]);

  const sortedInbox = Object.keys(inbox).sort(
    (a, b) => (inbox[b]?.timestamp || 0) - (inbox[a]?.timestamp || 0)
  );

  // ✅ UI
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#075E54" barStyle="light-content" />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <Text style={styles.logo}>Green Chat</Text>
        <Ionicons name="chatbubble-outline" size={22} color="#fff" />
      </View>

      {/* INBOX */}
      {!receiverKey && (
        <FlatList
          data={sortedInbox}
          keyExtractor={(k) => k}
          renderItem={({ item }) => {
            const isGroup = item.startsWith("group_");
            const data = isGroup ? groups[item] : users[item];
            if (!data) return null;

            return (
              <TouchableOpacity onPress={() => setReceiverKey(item)}>
                <View style={styles.inboxItem}>
                  <Image
                    source={{ uri: data.avatar || data.groupIcon }}
                    style={styles.avatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{data.name}</Text>
                    <Text style={styles.last}>
                      {inbox[item]?.lastText || "Say hi"}
                    </Text>
                  </View>
                  {inbox[item]?.unreadCount > 0 && (
                    <View style={styles.unread}>
                      <Text style={{ color: "white" }}>
                        {inbox[item].unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* CHAT */}
      {receiverKey && (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setReceiverKey(null)}>
              <Ionicons name="arrow-back" size={22} color="white" />
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
              {groups[receiverKey]?.name || users[receiverKey]?.name}
            </Text>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => {
              const mine = item.sender === userKey;
              return (
                <View style={[styles.msg, mine ? styles.right : styles.left]}>
                  <Text style={{ color: "white" }}>{item.text}</Text>
                </View>
              );
            }}
          />

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Type message"
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
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  logo: { color: "white", fontSize: 20, fontWeight: "bold" },
  inboxItem: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 0.5,
    borderColor: "#2A3942",
  },
  avatar: { width: 45, height: 45, borderRadius: 23, marginRight: 12 },
  name: { color: "white", fontSize: 16 },
  last: { color: "#bbb", fontSize: 13 },
  unread: {
    backgroundColor: "#25D366",
    paddingHorizontal: 8,
    borderRadius: 10,
    justifyContent: "center",
  },
  header: {
    backgroundColor: "#075E54",
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, marginHorizontal: 8 },
  headerName: { color: "white", fontSize: 16 },
  msg: {
    backgroundColor: "#1E2C33",
    margin: 6,
    padding: 10,
    borderRadius: 10,
    maxWidth: "70%",
  },
  left: { alignSelf: "flex-start" },
  right: { alignSelf: "flex-end", backgroundColor: "#056162" },
  inputBar: {
    flexDirection: "row",
    backgroundColor: "#1E2C33",
    padding: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#2A3942",
    borderRadius: 20,
    paddingHorizontal: 12,
    color: "white",
  },
});
