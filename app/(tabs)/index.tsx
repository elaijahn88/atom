import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Image,
  ImageBackground,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ref, onValue, push, set } from "firebase/database";
import { database } from "../../firebase";

/* =====================
   USER
===================== */
const MY_EMAIL = "elajahn8@gmail.com";
const MY_KEY = MY_EMAIL.replace(/\./g, ",");

/* =====================
   APP
===================== */
export default function WhatsAppLikeApp() {
  const [tab, setTab] = useState<"Chats" | "Status" | "Calls">("Chats");
  const [screen, setScreen] = useState<"inbox" | "chat">("inbox");
  const [activeChat, setActiveChat] = useState<any>(null);
  const [inbox, setInbox] = useState<any[]>([]);

  /* Presence */
  useEffect(() => {
    const p = ref(database, `presence/${MY_KEY}`);
    set(p, { online: true, lastSeen: Date.now() });
    return () => set(p, { online: false, lastSeen: Date.now() });
  }, []);

  /* Register user */
  useEffect(() => {
    set(ref(database, `users/${MY_KEY}`), { email: MY_EMAIL });
  }, []);

  /* Load inbox */
  useEffect(() => {
    const chatsRef = ref(database, "chats");
    onValue(chatsRef, (snap) => {
      if (!snap.exists()) return;

      const rows: any[] = [];

      Object.entries(snap.val()).forEach(([cid, chat]: any) => {
        if (!cid.includes(MY_KEY)) return;

        const other = cid.replace(`${MY_KEY}_`, "").replace(`_${MY_KEY}`, "");
        const msgs = chat.messages || {};
        const last = Object.values(msgs).pop() as any;

        rows.push({
          id: cid,
          name: other,
          lastText: last?.text || "",
          time: last?.timestamp || 0,
          unread: Object.values(msgs).filter(
            (m: any) => m.sender !== MY_KEY && !m.seen
          ).length,
        });
      });

      rows.sort((a, b) => b.time - a.time);
      setInbox(rows);
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#075E54" barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>WhatsApp</Text>
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        {["Chats", "Status", "Calls"].map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t as any)}>
            <Text style={[styles.tab, tab === t && styles.activeTab]}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* SCREENS */}
      {tab === "Chats" && screen === "inbox" && (
        <FlatList
          data={inbox}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                setActiveChat(item);
                setScreen("chat");
              }}
            >
              <View style={styles.chatRow}>
                <Image
                  source={{ uri: `https://i.pravatar.cc/150?u=${item.id}` }}
                  style={styles.avatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.chatName}>{item.name}</Text>
                  <Text style={styles.lastMsg} numberOfLines={1}>
                    {item.lastText}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.time}>
                    {item.time
                      ? new Date(item.time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </Text>
                  {item.unread > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {tab === "Chats" && screen === "chat" && (
        <ChatScreen chat={activeChat} onBack={() => setScreen("inbox")} />
      )}

      {tab === "Status" && (
        <View style={styles.center}>
          <Text style={styles.placeholder}>Status coming soon</Text>
        </View>
      )}

      {tab === "Calls" && (
        <View style={styles.center}>
          <Text style={styles.placeholder}>Calls coming soon</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

/* =====================
   CHAT SCREEN
===================== */
function ChatScreen({ chat, onBack }: any) {
  const PATH = `chats/${chat.id}/messages`;

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const flat = useRef<FlatList>(null);

  useEffect(() => {
    onValue(ref(database, PATH), (snap) => {
      if (!snap.exists()) return setMessages([]);
      const list = Object.entries(snap.val()).map(([id, v]: any) => ({
        id,
        ...v,
      }));
      list.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(list);
      setTimeout(() => flat.current?.scrollToEnd({ animated: true }), 50);
    });
  }, []);

  /* Seen logic */
  useEffect(() => {
    messages.forEach((m) => {
      if (m.sender !== MY_KEY && !m.seen) {
        set(ref(database, `${PATH}/${m.id}/seen`), true);
      }
    });
  }, [messages]);

  /* Typing */
  useEffect(() => {
    const tRef = ref(database, `typing/${chat.id}`);
    onValue(tRef, (snap) => {
      if (!snap.exists()) return setTyping(false);
      const data = snap.val();
      setTyping(
        Object.keys(data).some((k) => k !== MY_KEY && data[k])
      );
    });
  }, []);

  const send = () => {
    if (!text.trim()) return;

    push(ref(database, PATH), {
      sender: MY_KEY,
      text,
      timestamp: Date.now(),
      delivered: true,
      seen: false,
    });

    set(ref(database, `typing/${chat.id}/${MY_KEY}`), false);
    setText("");
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.chatTitle}>{chat.name}</Text>
      </View>

      <ImageBackground
        source={{
          uri: "https://images.unsplash.com/photo-1503264116251-35a269479413",
        }}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={flat}
          data={messages}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 10, paddingBottom: 80 }}
          renderItem={({ item }) => {
            const mine = item.sender === MY_KEY;
            return (
              <View
                style={[
                  styles.bubble,
                  mine ? styles.mine : styles.theirs,
                ]}
              >
                <Text style={styles.msg}>{item.text}</Text>
                <View style={styles.msgMeta}>
                  <Text style={styles.msgTime}>
                    {new Date(item.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  {mine && (
                    <Ionicons
                      name={
                        item.seen
                          ? "checkmark-done"
                          : "checkmark"
                      }
                      size={14}
                      color={item.seen ? "#34B7F1" : "#ccc"}
                    />
                  )}
                </View>
              </View>
            );
          }}
        />

        {typing && <Text style={styles.typing}>typing…</Text>}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={(v) => {
              setText(v);
              set(ref(database, `typing/${chat.id}/${MY_KEY}`), v.length > 0);
            }}
            placeholder="Message"
            placeholderTextColor="#aaa"
          />
          <TouchableOpacity onPress={send}>
            <Ionicons name="send" size={26} color="#25D366" />
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}

/* =====================
   STYLES
===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121B22" },
  header: { backgroundColor: "#075E54", padding: 14 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },

  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#075E54",
  },
  tab: { color: "#cfd8dc", padding: 10 },
  activeTab: {
    color: "#fff",
    borderBottomWidth: 2,
    borderColor: "#25D366",
  },

  chatRow: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 0.5,
    borderColor: "#2A3942",
    alignItems: "center",
  },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  chatName: { color: "#fff", fontSize: 16 },
  lastMsg: { color: "#bbb", fontSize: 13 },
  time: { color: "#bbb", fontSize: 11 },

  badge: {
    backgroundColor: "#25D366",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  badgeText: { color: "#fff", fontSize: 12 },

  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#075E54",
  },
  chatTitle: { color: "#fff", fontSize: 16, marginLeft: 12 },

  bubble: {
    padding: 10,
    marginVertical: 4,
    borderRadius: 8,
    maxWidth: "80%",
  },
  mine: { backgroundColor: "#056162", alignSelf: "flex-end" },
  theirs: { backgroundColor: "#1E2C33", alignSelf: "flex-start" },
  msg: { color: "#fff" },

  msgMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  msgTime: { fontSize: 10, color: "#ccc", marginRight: 4 },

  typing: {
    color: "#9fd3c7",
    paddingLeft: 14,
    paddingBottom: 6,
  },

  inputBar: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: "#1E2C33",
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  input: {
    flex: 1,
    backgroundColor: "#2A3942",
    borderRadius: 20,
    paddingHorizontal: 12,
    color: "#fff",
    marginRight: 8,
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  placeholder: { color: "#bbb" },
});
