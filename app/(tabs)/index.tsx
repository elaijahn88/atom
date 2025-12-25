import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  StatusBar,
  ImageBackground,
  Switch,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ref, onValue, push, set } from "firebase/database";
import { db } from "../../firebase"; // <-- your firebase config

/* =====================
   HELPERS
===================== */
const safeKey = (email) => email.replace(/\./g, ",");

const makeChatId = (email1, email2) => {
  const a = safeKey(email1);
  const b = safeKey(email2);
  return [a, b].sort().join("_");
};

// 🔐 Logged-in user (replace later with Firebase Auth)
const MY_EMAIL = "elajahn8@gmail.com";
const MY_KEY = safeKey(MY_EMAIL);

/* =====================
   APP
===================== */
export default function App() {
  const [theme, setTheme] = useState("dark");
  const [screen, setScreen] = useState("inbox");
  const [activeChat, setActiveChat] = useState(null);
  const [wallpaper, setWallpaper] = useState(wallpapers[0]);
  const [inbox, setInbox] = useState({});

  const styles = makeStyles(theme);

  /* 🔄 LOAD INBOX */
  useEffect(() => {
    const inboxRef = ref(db, `users/${MY_KEY}/inbox`);
    return onValue(inboxRef, (snap) => {
      if (!snap.exists()) {
        setInbox({});
        return;
      }
      setInbox(snap.val());
    });
  }, []);

  useEffect(() => {
    StatusBar.setBarStyle(theme === "dark" ? "light-content" : "dark-content");
  }, [theme]);

  const openChat = (otherKey) => {
    const chatId = makeChatId(MY_EMAIL, otherKey.replace(/,/g, "."));
    setActiveChat({ chatId, otherKey });
    setScreen("chat");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <Text style={styles.logo}>Green Chat</Text>
        <Switch
          value={theme === "dark"}
          onValueChange={(v) => setTheme(v ? "dark" : "light")}
        />
      </View>

      {screen === "inbox" && (
        <InboxScreen
          inbox={inbox}
          styles={styles}
          onOpenChat={openChat}
        />
      )}

      {screen === "chat" && activeChat && (
        <ChatScreen
          {...activeChat}
          styles={styles}
          wallpaper={wallpaper}
          onBack={() => setScreen("inbox")}
        />
      )}

      {screen === "settings" && (
        <SettingsScreen
          styles={styles}
          wallpaper={wallpaper}
          setWallpaper={setWallpaper}
          onClose={() => setScreen("inbox")}
        />
      )}
    </SafeAreaView>
  );
}

/* =====================
   INBOX
===================== */
function InboxScreen({ inbox, styles, onOpenChat }) {
  const data = Object.entries(inbox).map(([key, v]) => ({
    id: key,
    ...v,
  }));

  return (
    <FlatList
      data={data}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => onOpenChat(item.id)}>
          <View style={styles.inboxItem}>
            <Text style={styles.name}>{item.id.replace(/,/g, ".")}</Text>
            <Text style={styles.last}>{item.lastText}</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

/* =====================
   CHAT
===================== */
function ChatScreen({ chatId, otherKey, styles, wallpaper, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const flatRef = useRef(null);

  useEffect(() => {
    const msgRef = ref(db, `chats/${chatId}/messages`);
    return onValue(msgRef, (snap) => {
      if (!snap.exists()) {
        setMessages([]);
        return;
      }
      const list = Object.entries(snap.val()).map(([id, v]) => ({
        id,
        ...v,
      }));
      list.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(list);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
    });
  }, [chatId]);

  const sendMessage = () => {
    if (!text.trim()) return;

    const msg = {
      sender: MY_KEY,
      text,
      timestamp: Date.now(),
    };

    push(ref(db, `chats/${chatId}/messages`), msg);

    set(ref(db, `users/${MY_KEY}/inbox/${otherKey}`), {
      lastText: text,
      timestamp: msg.timestamp,
      unreadCount: 0,
    });

    setText("");
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerName}>{otherKey.replace(/,/g, ".")}</Text>
      </View>

      <ImageBackground source={{ uri: wallpaper }} style={styles.chatBackground}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.msg,
                item.sender === MY_KEY ? styles.right : styles.left,
              ]}
            >
              <Text style={{ color: "#fff" }}>{item.text}</Text>
            </View>
          )}
        />
      </ImageBackground>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message"
        />
        <TouchableOpacity onPress={sendMessage}>
          <Ionicons name="send" size={26} color="#25D366" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* =====================
   SETTINGS
===================== */
function SettingsScreen({ styles, wallpaper, setWallpaper, onClose }) {
  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={styles.settingsTitle}>Wallpapers</Text>
      <TouchableOpacity onPress={onClose}>
        <Text style={styles.settingsItem}>Back</Text>
      </TouchableOpacity>

      <FlatList
        data={wallpapers}
        horizontal
        keyExtractor={(w) => w}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setWallpaper(item)}>
            <Image
              source={{ uri: item }}
              style={{
                width: 120,
                height: 80,
                margin: 8,
                borderWidth: item === wallpaper ? 3 : 0,
                borderColor: "#25D366",
              }}
            />
          </TouchableOpacity>
        )}
      />
    </ScrollView>
  );
}

/* =====================
   WALLPAPERS
===================== */
const wallpapers = [
  "https://images.unsplash.com/photo-1503264116251-35a269479413?w=1200",
  "https://images.unsplash.com/photo-1470167290877-7d5b1f83c9a0?w=1200",
];

/* =====================
   STYLES
===================== */
const makeStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: "#121B22" },
    topBar: { padding: 12, backgroundColor: "#075E54" },
    logo: { color: "#fff", fontSize: 20, fontWeight: "bold" },

    inboxItem: { padding: 14, borderBottomWidth: 0.5, borderColor: "#333" },
    name: { color: "#fff", fontSize: 16 },
    last: { color: "#aaa" },

    header: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      backgroundColor: "#075E54",
    },
    headerName: { color: "#fff", fontSize: 16, marginLeft: 10 },

    chatBackground: { flex: 1 },
    msg: {
      padding: 10,
      margin: 8,
      borderRadius: 10,
      maxWidth: "75%",
      backgroundColor: "#1E2C33",
    },
    left: { alignSelf: "flex-start" },
    right: { alignSelf: "flex-end", backgroundColor: "#056162" },

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
    },

    settingsTitle: { fontSize: 20, color: "#fff" },
    settingsItem: { color: "#25D366", marginVertical: 10 },
  });
