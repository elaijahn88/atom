import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Switch,
  Image,
  ImageBackground,
  ScrollView,
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
export default function App() {
  const [screen, setScreen] = useState("inbox");
  const [darkMode, setDarkMode] = useState(true);
  const [wallpaper, setWallpaper] = useState(wallpapers[0]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [inbox, setInbox] = useState({});
  const styles = stylesFn(darkMode);

  /* Presence */
  useEffect(() => {
    const p = ref(database, `presence/${MY_KEY}`);
    set(p, { online: true, lastSeen: Date.now() });
    return () => set(p, { online: false, lastSeen: Date.now() });
  }, []);

  /* Init user */
  useEffect(() => {
    StatusBar.setBarStyle(darkMode ? "light-content" : "dark-content");
    set(ref(database, `users/${MY_KEY}`), { email: MY_EMAIL });
  }, []);

  /* Load private chats */
  useEffect(() => {
    const chatsRef = ref(database, "chats");
    onValue(chatsRef, (snap) => {
      if (!snap.exists()) return;
      const data = {};
      Object.entries(snap.val()).forEach(([cid, c]) => {
        if (!cid.includes(MY_KEY)) return;
        const other = cid.replace(`${MY_KEY}_`, "").replace(`_${MY_KEY}`, "");
        const msgs = c.messages || {};
        const last = Object.values(msgs).pop();
        const unread = Object.values(msgs).filter(
          (m) => m.sender !== MY_KEY && !m.seen
        ).length;

        data[cid] = {
          id: cid,
          name: other,
          isGroup: false,
          lastText: last?.text || "",
          unread,
        };
      });
      setInbox((p) => ({ ...p, ...data }));
    });
  }, []);

  /* Load groups */
  useEffect(() => {
    const gRef = ref(database, "groups");
    onValue(gRef, (snap) => {
      if (!snap.exists()) return;
      const data = {};
      Object.entries(snap.val()).forEach(([id, g]) => {
        if (!g.members?.[MY_KEY]) return;
        data[id] = {
          id,
          name: g.name,
          isGroup: true,
          members: g.members,
        };
      });
      setInbox((p) => ({ ...p, ...data }));
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* TOP */}
      <View style={styles.topBar}>
        <Text style={styles.logo}>Green₩</Text>
        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity onPress={() => setScreen("settings")}>
            <Ionicons name="settings-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <Switch value={darkMode} onValueChange={setDarkMode} />
        </View>
      </View>

      {screen === "inbox" && (
        <FlatList
          data={Object.values(inbox)}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                setSelectedChat(item);
                setScreen("chat");
              }}
            >
              <View style={styles.inboxItem}>
                <Image
                  source={{ uri: `https://i.pravatar.cc/150?u=${item.id}` }}
                  style={styles.avatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.last}>{item.lastText}</Text>
                </View>
                {item.unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unread}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {screen === "chat" && selectedChat && (
        <ChatScreen
          chat={selectedChat}
          styles={styles}
          wallpaper={wallpaper}
          onBack={() => setScreen("inbox")}
        />
      )}

      {screen === "settings" && (
        <ScrollView style={{ padding: 16 }}>
          <TouchableOpacity onPress={() => setScreen("inbox")}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.settingsTitle}>Settings</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Switch value={darkMode} onValueChange={setDarkMode} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/* =====================
   CHAT
===================== */
function ChatScreen({ chat, styles, wallpaper, onBack }) {
  const isGroup = chat.isGroup;
  const chatId = isGroup
    ? chat.id
    : [MY_KEY, chat.name].sort().join("_");

  const PATH = isGroup
    ? `groupMessages/${chatId}`
    : `chats/${chatId}/messages`;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const flat = useRef();

  useEffect(() => {
    onValue(ref(database, PATH), (snap) => {
      if (!snap.exists()) return setMessages([]);
      const list = Object.entries(snap.val()).map(([id, v]) => ({ id, ...v }));
      list.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(list);
      setTimeout(() => flat.current?.scrollToEnd({ animated: true }), 50);
    });
  }, []);

  /* Seen logic */
  useEffect(() => {
    messages.forEach((m) => {
      if (isGroup) {
        if (!m.seen?.[MY_KEY]) {
          set(ref(database, `${PATH}/${m.id}/seen/${MY_KEY}`), true);
        }
      } else {
        if (m.sender !== MY_KEY && !m.seen) {
          set(ref(database, `${PATH}/${m.id}/seen`), true);
        }
      }
    });
  }, [messages]);

  const send = () => {
    if (!text.trim()) return;
    push(ref(database, PATH), {
      sender: MY_KEY,
      text,
      timestamp: Date.now(),
      seen: isGroup ? { [MY_KEY]: true } : false,
    });
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

      <ImageBackground source={{ uri: wallpaper }} style={{ flex: 1 }}>
        <FlatList
          ref={flat}
          data={messages}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
          renderItem={({ item }) => {
            const mine = item.sender === MY_KEY;
            return (
              <View style={[styles.msgBubble, mine ? styles.mine : styles.theirs]}>
                {isGroup && !mine && (
                  <Text style={styles.senderName}>{item.sender}</Text>
                )}
                <Text style={styles.msgText}>{item.text}</Text>
                <Text style={styles.time}>
                  {new Date(item.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            );
          }}
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
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
   WALLPAPERS
===================== */
const wallpapers = [
  "https://images.unsplash.com/photo-1503264116251-35a269479413?w=1200",
];

/* =====================
   STYLES
===================== */
const stylesFn = (dark) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: dark ? "#121B22" : "#f2f2f2" },
    topBar: {
      padding: 12,
      backgroundColor: "#075E54",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    logo: { color: "#fff", fontSize: 20, fontWeight: "bold" },

    inboxItem: {
      flexDirection: "row",
      padding: 12,
      borderBottomWidth: 0.5,
      borderColor: "#2A3942",
      alignItems: "center",
    },
    avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 12 },
    name: { color: "#fff", fontSize: 16 },
    last: { color: "#bbb", fontSize: 13 },

    chatHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      backgroundColor: "#075E54",
    },
    chatTitle: { color: "#fff", fontSize: 16, fontWeight: "bold", marginLeft: 12 },

    msgBubble: {
      padding: 10,
      marginVertical: 6,
      borderRadius: 10,
      maxWidth: "80%",
    },
    mine: { backgroundColor: "#056162", alignSelf: "flex-end" },
    theirs: { backgroundColor: "#1E2C33", alignSelf: "flex-start" },
    msgText: { color: "#fff" },
    senderName: { fontSize: 11, color: "#9fd3c7", marginBottom: 2 },
    time: { fontSize: 10, color: "#ccc", alignSelf: "flex-end" },

    inputBar: {
      flexDirection: "row",
      padding: 10,
      backgroundColor: "#1E2C33",
    },
    input: {
      flex: 1,
      backgroundColor: "#2A3942",
      borderRadius: 20,
      paddingHorizontal: 12,
      color: "#fff",
      marginRight: 8,
    },

    badge: {
      backgroundColor: "#25D366",
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: { color: "#fff", fontSize: 12 },

    backText: { color: "#25D366", fontSize: 16 },
    settingsTitle: { color: "#fff", fontSize: 22, marginBottom: 20 },
    settingItem: { flexDirection: "row", justifyContent: "space-between" },
    settingLabel: { color: "#fff" },
  });
