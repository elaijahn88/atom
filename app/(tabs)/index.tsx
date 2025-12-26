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
import { database } from "../../firebase"; // <-- your Firebase setup

/* =====================
   USER SETUP
===================== */
const MY_EMAIL = "elajahn8@gmail.com";
const MY_KEY = MY_EMAIL.replace(/\./g, ",");

export default function App() {
  const [screen, setScreen] = useState("inbox"); // inbox | chat | settings
  const [darkMode, setDarkMode] = useState(true);
  const [wallpaper, setWallpaper] = useState(wallpapers[0]);
  const [selectedChat, setSelectedChat] = useState(null); // chatKey / userKey
  const [inboxUsers, setInboxUsers] = useState({}); // users with messages
  const styles = stylesFn(darkMode);

  /* -----------------------
     Init DB nodes
  ------------------------*/
  useEffect(() => {
    StatusBar.setBarStyle(darkMode ? "light-content" : "dark-content", true);

    set(ref(database, `users/${MY_KEY}`), { email: MY_EMAIL, createdAt: Date.now() });
  }, []);

  /* -----------------------
     Load users with messages
  ------------------------*/
  useEffect(() => {
    const usersRef = ref(database, "chats");
    onValue(usersRef, (snap) => {
      if (!snap.exists()) return;
      const chats = snap.val();
      const users = {};
      Object.keys(chats).forEach((chatId) => {
        if (!chatId.includes(MY_KEY)) return;
        const otherKey = chatId.split(MY_KEY + "_").join("") || chatId.split("_" + MY_KEY)[0];
        users[otherKey] = {
          id: otherKey,
          name: otherKey,
          lastText: chats[chatId].messages
            ? Object.values(chats[chatId].messages).pop()?.text
            : "",
        };
      });
      setInboxUsers(users);
    });
  }, []);

  const openChat = (userKey) => {
    setSelectedChat(userKey);
    setScreen("chat");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <Text style={styles.logo}>Green₩</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={{ marginRight: 14 }}
            onPress={() => setScreen("settings")}
          >
            <Ionicons
              name="settings-outline"
              size={22}
              color={darkMode ? "#fff" : "#222"}
            />
          </TouchableOpacity>

          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ true: "#25D366", false: "#888" }}
            thumbColor={darkMode ? "#fff" : "#fff"}
          />
        </View>
      </View>

      {/* SCREENS */}
      {screen === "inbox" && (
        <InboxScreen inbox={inboxUsers} styles={styles} onOpenChat={openChat} />
      )}

      {screen === "chat" && selectedChat && (
        <ChatScreen
          chatKey={selectedChat}
          styles={styles}
          darkMode={darkMode}
          wallpaper={wallpaper}
        />
      )}

      {screen === "settings" && (
        <SettingsScreen
          styles={styles}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          wallpaper={wallpaper}
          setWallpaper={setWallpaper}
          onBack={() => setScreen("inbox")}
        />
      )}
    </SafeAreaView>
  );
}

/* ---------------------------
   InboxScreen
----------------------------*/
function InboxScreen({ inbox, styles, onOpenChat }) {
  const storyData = Object.values(inbox).slice(0, 5);
  return (
    <View style={{ flex: 1 }}>
      {/* Stories */}
      <View style={styles.storiesContainer}>
        <FlatList
          data={storyData}
          horizontal
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <StoryBubble item={item} onPress={() => {}} />}
        />
      </View>

      {/* Users */}
      <FlatList
        data={Object.values(inbox)}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onOpenChat(item.id)}>
            <View style={styles.inboxItem}>
              <Image source={{ uri: `https://i.pravatar.cc/150?u=${item.id}` }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.last}>{item.lastText}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

/* ---------------------------
   ChatScreen
----------------------------*/
function ChatScreen({ chatKey, styles, darkMode, wallpaper }) {
  const chatId = [MY_KEY, chatKey].sort().join("_");
  const CHAT_PATH = `chats/${chatId}/messages`;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const flatRef = useRef(null);

  useEffect(() => {
    const msgRef = ref(database, CHAT_PATH);
    onValue(msgRef, (snap) => {
      if (!snap.exists()) {
        setMessages([]);
        return;
      }
      const list = Object.entries(snap.val()).map(([id, v]) => ({ id, ...v }));
      list.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(list);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
    });
  }, []);

  const sendMessage = () => {
    if (!text.trim()) return;
    push(ref(database, CHAT_PATH), { sender: MY_KEY, text: text.trim(), timestamp: Date.now() });
    setText("");
  };

  return (
    <ImageBackground source={{ uri: wallpaper }} style={{ flex: 1 }}>
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        renderItem={({ item }) => {
          const mine = item.sender === MY_KEY;
          return (
            <View style={[styles.msgBubble, mine ? styles.mine : styles.theirs]}>
              <Text style={styles.msgText}>{item.text}</Text>
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
        <TouchableOpacity onPress={sendMessage}>
          <Ionicons name="send" size={26} color="#25D366" />
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

/* ---------------------------
   SettingsScreen
----------------------------*/
function SettingsScreen({ styles, darkMode, setDarkMode, wallpaper, setWallpaper, onBack }) {
  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <TouchableOpacity onPress={onBack}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
      <Text style={styles.settingsTitle}>Settings</Text>
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Dark Mode</Text>
        <Switch value={darkMode} onValueChange={setDarkMode} />
      </View>
      <Text style={[styles.settingsItem, { marginTop: 18 }]}>Chat Wallpapers</Text>
      <FlatList
        data={wallpapers}
        horizontal
        keyExtractor={(w) => w}
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setWallpaper(item)}>
            <Image
              source={{ uri: item }}
              style={{
                width: 120,
                height: 80,
                borderRadius: 8,
                marginRight: 12,
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

/* ---------------------------
   StoryBubble
----------------------------*/
function StoryBubble({ item, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 8 }}>
      <Image
        source={{ uri: `https://i.pravatar.cc/100?u=${item.id}` }}
        style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: "#25D366" }}
      />
      <Text style={{ color: "#fff", marginTop: 4 }}>{item.name}</Text>
    </TouchableOpacity>
  );
}

/* ---------------------------
   Wallpapers
----------------------------*/
const wallpapers = [
  "https://images.unsplash.com/photo-1503264116251-35a269479413?w=1200&q=60&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470167290877-7d5b1f83c9a0?w=1200&q=60&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=1200&q=60&auto=format&fit=crop",
];

/* ---------------------------
   Styles
----------------------------*/
const stylesFn = (dark) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: dark ? "#121B22" : "#f2f2f2" },
    topBar: { padding: 12, backgroundColor: "#075E54", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    logo: { color: "#fff", fontSize: 20, fontWeight: "bold" },

    storiesContainer: { paddingVertical: 12, paddingLeft: 12, borderBottomWidth: 0.5, borderColor: "#2A3942" },
    inboxItem: { flexDirection: "row", padding: 12, borderBottomWidth: 0.5, borderColor: "#2A3942", alignItems: "center" },
    avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 12 },
    name: { color: "#fff", fontSize: 16 },
    last: { color: "#bbb", fontSize: 13 },

    msgBubble: { padding: 10, margin: 8, borderRadius: 10, maxWidth: "80%" },
    mine: { backgroundColor: "#056162", alignSelf: "flex-end" },
    theirs: { backgroundColor: "#1E2C33", alignSelf: "flex-start" },
    msgText: { color: "#fff" },

    inputBar: { flexDirection: "row", padding: 10, backgroundColor: "#1E2C33", alignItems: "center" },
    input: { flex: 1, backgroundColor: "#2A3942", borderRadius: 20, paddingHorizontal: 12, color: "#fff", marginRight: 8 },

    backText: { color: "#25D366", marginBottom: 20, fontSize: 16 },
    settingsTitle: { color: "#fff", fontSize: 22, fontWeight: "bold", marginBottom: 20 },
    settingsItem: { fontSize: 18, color: "#ccc", marginVertical: 10 },
    settingItem: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
    settingLabel: { color: "#fff", fontSize: 16 },
  });
