import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
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

  // --- Fetch Users / Groups / Inbox ---
  useEffect(() => {
    onValue(ref(db, "users"), snap => { if (snap.exists()) setUsers(snap.val()); });
    onValue(ref(db, "groups"), snap => { if (snap.exists()) setGroups(snap.val()); });
    onValue(ref(db, `users/${userKey}/inbox`), snap => { if (snap.exists()) setInbox(snap.val()); });
  }, []);

  // --- Fetch Chat Messages ---
  useEffect(() => {
    if (!receiverKey) return;
    const isGroup = receiverKey.startsWith("GROUP_");
    const path = isGroup
      ? `groupChats/${receiverKey.replace("GROUP_", "")}`
      : `chats/${[userKey, receiverKey].sort().join("_")}`;
    return onValue(ref(db, path), snap => {
      const msgs = [];
      snap.forEach(s => msgs.push({ id: s.key, ...s.val() }));
      setMessages(msgs.sort((a, b) => a.timestamp - b.timestamp));
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    });
  }, [receiverKey]);

  // --- Send Text Message ---
  const sendMessage = async () => {
    if (!text.trim() || !receiverKey) return;
    await sendMessageToDB({ text, type: "text" });
    setText("");
  };

  // --- Generic DB Message Sender ---
  const sendMessageToDB = async ({ text, type }) => {
    const isGroup = receiverKey.startsWith("GROUP_");
    const id = isGroup ? receiverKey.replace("GROUP_", "") : [userKey, receiverKey].sort().join("_");
    const path = isGroup ? `groupChats/${id}` : `chats/${id}`;
    const msg = { text, sender: userKey, timestamp: Date.now(), type, reactions: {} };
    await push(ref(db, path), msg);

    if (isGroup) await updateGroupInbox(text, id);
    else await updatePrivateInbox(text);
  };

  // --- Update Private Inbox ---
  const updatePrivateInbox = async (text) => {
    const updates = {};
    updates[`users/${userKey}/inbox/${receiverKey}`] = { lastText: text, timestamp: Date.now(), unreadCount: 0 };
    updates[`users/${receiverKey}/inbox/${userKey}/lastText`] = text;
    updates[`users/${receiverKey}/inbox/${userKey}/timestamp`] = Date.now();
    updates[`users/${receiverKey}/inbox/${userKey}/unreadCount`] = (users[receiverKey]?.inbox?.[userKey]?.unreadCount || 0) + 1;
    await update(ref(db), updates);
  };

  // --- Update Group Inbox ---
  const updateGroupInbox = async (text, id) => {
    const members = groups[id]?.members || {};
    const updates = {};
    Object.keys(members).forEach(memberKey => {
      const base = `users/${memberKey}/inbox/GROUP_${id}`;
      updates[`${base}/lastText`] = text;
      updates[`${base}/timestamp`] = Date.now();
      updates[`${base}/unreadCount`] = memberKey !== userKey ? (users[memberKey]?.inbox?.[`GROUP_${id}`]?.unreadCount || 0) + 1 : 0;
    });
    await update(ref(db), updates);
  };

  // --- Mark as read ---
  useEffect(() => {
    if (!receiverKey) return;
    update(ref(db, `users/${userKey}/inbox/${receiverKey}`), { unreadCount: 0 });
  }, [receiverKey]);

  const renderInbox = Object.keys(inbox).sort((a, b) => inbox[b]?.timestamp - inbox[a]?.timestamp);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Green Chat</Text>

      {!receiverKey && <FlatList
        data={renderInbox}
        keyExtractor={k => k}
        renderItem={({ item }) => {
          const isGroup = item.startsWith("GROUP_");
          const data = isGroup ? groups[item.replace("GROUP_", "")] : users[item];
          const i = inbox[item];
          return (
            <TouchableOpacity onPress={() => setReceiverKey(item)}>
              <View style={styles.inboxItem}>
                <Image source={{ uri: data?.avatar }} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{data?.name}</Text>
                  <Text style={styles.last}>{i?.lastText || "Say hi!"}</Text>
                </View>
                {i?.unreadCount > 0 && <View style={styles.unread}><Text style={{ color: "#fff" }}>{i.unreadCount}</Text></View>}
              </View>
            </TouchableOpacity>
          )
        }}
      />}

      {receiverKey && <>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setReceiverKey(null)}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerName}>{receiverKey.startsWith("GROUP_") ? groups[receiverKey.replace("GROUP_", "")]?.name : users[receiverKey]?.name}</Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={i => i.id}
          renderItem={({ item }) => {
            const mine = item.sender === userKey;
            return (
              <View style={[styles.message, mine && styles.mine]}>
                <Text style={{ color: "#fff" }}>{item.text}</Text>
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
          <TouchableOpacity onPress={sendMessage}><Ionicons name="send" size={22} color="#25D366" /></TouchableOpacity>
        </View>
      </>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121B22" },
  logo: { color: "#25D366", fontSize: 22, textAlign: "center", margin: 10 },
  inboxItem: { flexDirection: "row", padding: 12, borderBottomWidth: 1, borderColor: "#333" },
  avatar: { width: 45, height: 45, borderRadius: 22, marginRight: 10 },
  name: { color: "#fff", fontWeight: "bold" },
  last: { color: "#aaa", fontSize: 12 },
  unread: { backgroundColor: "#25D366", padding: 6, borderRadius: 20 },
  header: { backgroundColor: "#075E54", padding: 10, flexDirection: "row", alignItems: "center" },
  headerName: { color: "#fff", marginLeft: 10, fontSize: 16, fontWeight: "bold" },
  message: { backgroundColor: "#1E2C33", padding: 8, margin: 6, borderRadius: 8, maxWidth: "70%" },
  mine: { backgroundColor: "#056162", alignSelf: "flex-end" },
  inputBar: { flexDirection: "row", padding: 8, alignItems: "center" },
  input: { flex: 1, backgroundColor: "#1E2C33", borderRadius: 25, padding: 10, color: "#fff", marginRight: 5 }
});
