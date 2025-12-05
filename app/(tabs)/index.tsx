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

/*
  Full UI-only chat with:
  - Theme toggle (dark/light)
  - Stories UI on Inbox
  - Chat wallpapers (selectable in Settings)
  - Modular local components (easy to split into files)
  - Fake messages + typing + auto-scroll
*/

export default function App() {
  const [theme, setTheme] = useState("dark"); // 'dark' | 'light'
  const [screen, setScreen] = useState("inbox"); // inbox | chat | settings
  const [receiverKey, setReceiverKey] = useState(null);
  const [wallpaper, setWallpaper] = useState(wallpapers[0]); // current chat wallpaper

  // central styles getter
  const styles = makeStyles(theme);

  // shared dummy inbox (users) and stories
  const inbox = {
    alice: {
      id: "alice",
      name: "Alice",
      avatar: "https://i.pravatar.cc/150?u=alice",
      lastText: "Sent a photo",
    },
    bob: {
      id: "bob",
      name: "Bob",
      avatar: "https://i.pravatar.cc/150?u=bob",
      lastText: "On my way",
    },
    carol: {
      id: "carol",
      name: "Carol",
      avatar: "https://i.pravatar.cc/150?u=carol",
      lastText: "See you!",
    },
  };

  // messages per chat (local only)
  const messagesRef = useRef({
    alice: [
      { id: "1", sender: "them", text: "Hey there!" },
      { id: "2", sender: "me", text: "Hi Alice!" },
    ],
    bob: [
      { id: "1", sender: "them", text: "Morning :)" },
      { id: "2", sender: "me", text: "Morning!" },
      { id: "3", sender: "them", text: "Ready for today?" },
    ],
    carol: [{ id: "1", sender: "them", text: "Movie tonight?" }],
  });

  const openChat = (key) => {
    setReceiverKey(key);
    setScreen("chat");
  };

  // platform top status bar color
  useEffect(() => {
    StatusBar.setBarStyle(theme === "dark" ? "light-content" : "dark-content");
  }, [theme]);

  return (
    <SafeAreaView style={styles.container}>
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <Text style={styles.logo}>Green Chat</Text>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={{ marginRight: 14 }}
            onPress={() => setScreen("settings")}
          >
            <Ionicons
              name="settings-outline"
              size={22}
              color={theme === "dark" ? "#fff" : "#222"}
            />
          </TouchableOpacity>

          <Switch
            value={theme === "dark"}
            onValueChange={(v) => setTheme(v ? "dark" : "light")}
            trackColor={{ true: "#25D366", false: "#888" }}
            thumbColor={theme === "dark" ? "#fff" : "#fff"}
          />
        </View>
      </View>

      {/* SCREENS */}
      {screen === "inbox" && (
        <InboxScreen
          inbox={inbox}
          styles={styles}
          onOpenChat={openChat}
          theme={theme}
        />
      )}

      {screen === "chat" && receiverKey && (
        <ChatScreen
          chatId={receiverKey}
          user={inbox[receiverKey]}
          messagesRef={messagesRef}
          onBack={() => setScreen("inbox")}
          styles={styles}
          theme={theme}
          wallpaper={wallpaper}
        />
      )}

      {screen === "settings" && (
        <SettingsScreen
          styles={styles}
          theme={theme}
          onClose={() => setScreen("inbox")}
          wallpaper={wallpaper}
          setWallpaper={setWallpaper}
        />
      )}
    </SafeAreaView>
  );
}

/* ---------------------------
   InboxScreen component
----------------------------*/
function InboxScreen({ inbox, styles, onOpenChat, theme }) {
  const storyData = [
    { id: "s_alice", user: "Alice", avatar: "https://i.pravatar.cc/100?u=alice" },
    { id: "s_bob", user: "Bob", avatar: "https://i.pravatar.cc/100?u=bob" },
    { id: "s_carol", user: "Carol", avatar: "https://i.pravatar.cc/100?u=carol" },
    { id: "s_dan", user: "Dan", avatar: "https://i.pravatar.cc/100?u=dan" },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* Stories bar */}
      <View style={styles.storiesContainer}>
        <FlatList
          data={storyData}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <StoryBubble item={item} onPress={() => {}} theme={theme} />
          )}
        />
      </View>

      {/* Inbox list */}
      <FlatList
        data={Object.values(inbox)}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onOpenChat(item.id)}>
            <View style={styles.inboxItem}>
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.last}>{item.lastText}</Text>
              </View>
              <View style={styles.timestampBox}>
                <Text style={styles.timestamp}>12:34</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

/* ---------------------------
   ChatScreen component
   - shows wallpaper (ImageBackground)
   - fake typing
   - auto-scroll
----------------------------*/
function ChatScreen({
  chatId,
  user,
  messagesRef,
  onBack,
  styles,
  theme,
  wallpaper,
}) {
  const [messages, setMessages] = useState(messagesRef.current[chatId] || []);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const flatRef = useRef(null);

  // auto-scroll when messages change
  useEffect(() => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  const fakeReplies = [
    "Okay!",
    "Nice 👍",
    "On my way",
    "Haha 😂",
    "Let's do it",
    "Cool",
    "Got it",
  ];

  const sendMessage = () => {
    if (!text.trim()) return;
    const my = { id: Date.now().toString(), sender: "me", text: text.trim() };
    setMessages((p) => [...p, my]);
    messagesRef.current[chatId] = [...(messagesRef.current[chatId] || []), my];
    setText("");
    setTyping(true);

    setTimeout(() => {
      const r = {
        id: (Date.now() + 1).toString(),
        sender: "them",
        text: fakeReplies[Math.floor(Math.random() * fakeReplies.length)],
      };
      setMessages((p) => [...p, r]);
      messagesRef.current[chatId] = [...(messagesRef.current[chatId] || []), r];
      setTyping(false);
    }, 1400 + Math.random() * 1200);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={theme === "dark" ? "#fff" : "#222"} />
        </TouchableOpacity>
        <Image source={{ uri: user.avatar }} style={styles.headerAvatar} />
        <Text style={styles.headerName}>{user.name}</Text>
      </View>

      <ImageBackground source={{ uri: wallpaper }} style={styles.chatBackground}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
          renderItem={({ item }) => {
            const mine = item.sender === "me";
            return (
              <View
                style={[
                  styles.msg,
                  mine ? styles.right : styles.left,
                  mine ? { backgroundColor: "#056162" } : null,
                ]}
              >
                <Text style={{ color: theme === "dark" ? "#fff" : "#111" }}>{item.text}</Text>
              </View>
            );
          }}
        />

        {/* typing indicator */}
        {typing && (
          <View style={styles.typingRow}>
            <Image source={{ uri: user.avatar }} style={styles.typingAvatar} />
            <Text style={styles.typingText}>Typing…</Text>
          </View>
        )}
      </ImageBackground>

      {/* input */}
      <View style={styles.inputBar}>
        <TouchableOpacity>
          <Ionicons name="happy-outline" size={26} color="#aaa" />
        </TouchableOpacity>

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
    </View>
  );
}

/* ---------------------------
   Settings screen
   - select wallpaper
----------------------------*/
function SettingsScreen({ styles, theme, onClose, wallpaper, setWallpaper }) {
  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={styles.settingsTitle}>Settings</Text>

      <TouchableOpacity onPress={onClose}>
        <Text style={styles.settingsItem}>Back</Text>
      </TouchableOpacity>

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
   StoryBubble small component
----------------------------*/
function StoryBubble({ item, onPress, theme }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 8 }}>
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            borderRadius: 36,
            padding: 3,
            borderWidth: 2,
            borderColor: theme === "dark" ? "#25D366" : "#075E54",
          }}
        >
          <Image source={{ uri: item.avatar }} style={{ width: 64, height: 64, borderRadius: 32 }} />
        </View>
        <Text style={{ color: theme === "dark" ? "#fff" : "#222", marginTop: 6 }}>{item.user}</Text>
      </View>
    </TouchableOpacity>
  );
}

/* ---------------------------
   Wallpapers (sample URLs)
----------------------------*/
const wallpapers = [
  // subtle patterns / gradients / photos
  "https://images.unsplash.com/photo-1503264116251-35a269479413?w=1200&q=60&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470167290877-7d5b1f83c9a0?w=1200&q=60&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=1200&q=60&auto=format&fit=crop",
];

/* ---------------------------
   Styles factory (theme-aware)
----------------------------*/
const makeStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme === "dark" ? "#121B22" : "#fafafa" },

    topBar: {
      backgroundColor: theme === "dark" ? "#075E54" : "#e6f4ef",
      padding: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    logo: { color: theme === "dark" ? "#fff" : "#075E54", fontSize: 20, fontWeight: "bold" },

    storiesContainer: {
      paddingVertical: 12,
      paddingLeft: 12,
      borderBottomWidth: 0.5,
      borderColor: theme === "dark" ? "#2A3942" : "#ddd",
      backgroundColor: theme === "dark" ? "#121B22" : "#fff",
    },

    inboxItem: {
      flexDirection: "row",
      padding: 12,
      borderBottomWidth: 0.5,
      borderColor: theme === "dark" ? "#2A3942" : "#eee",
      alignItems: "center",
    },

    avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 12 },
    name: { color: theme === "dark" ? "#fff" : "#111", fontSize: 16 },
    last: { color: theme === "dark" ? "#bbb" : "#666", fontSize: 13 },

    timestampBox: {
      alignItems: "flex-end",
      justifyContent: "center",
      marginLeft: 8,
    },
    timestamp: { color: theme === "dark" ? "#bbb" : "#999", fontSize: 12 },

    header: {
      backgroundColor: theme === "dark" ? "#075E54" : "#e6f4ef",
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
    },

    headerAvatar: { width: 36, height: 36, borderRadius: 18, marginHorizontal: 8 },
    headerName: { color: theme === "dark" ? "#fff" : "#075E54", fontSize: 16 },

    chatBackground: {
      flex: 1,
      resizeMode: "cover",
      backgroundColor: theme === "dark" ? "#0f1a1d" : "#f5f5f5",
    },

    msg: {
      backgroundColor: theme === "dark" ? "#1E2C33" : "#e8f6f2",
      marginVertical: 6,
      padding: 10,
      borderRadius: 12,
      maxWidth: "78%",
    },

    left: { alignSelf: "flex-start" },
    right: { alignSelf: "flex-end" },

    typingRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 8,
      marginLeft: 12,
    },

    typingAvatar: { width: 28, height: 28, borderRadius: 14 },
    typingText: { color: theme === "dark" ? "#aaa" : "#666", marginLeft: 8 },

    inputBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme === "dark" ? "#1E2C33" : "#fff",
      padding: 10,
      borderTopWidth: 0.5,
      borderColor: theme === "dark" ? "#26343a" : "#ddd",
    },

    input: {
      flex: 1,
      backgroundColor: theme === "dark" ? "#2A3942" : "#f0f0f0",
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: theme === "dark" ? "#fff" : "#111",
      marginHorizontal: 8,
    },

    settingsTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: theme === "dark" ? "#fff" : "#111",
      marginBottom: 12,
    },

    settingsItem: {
      fontSize: 18,
      color: theme === "dark" ? "#ccc" : "#444",
      marginVertical: 10,
    },
  });

/* ---------------------------
   Notes
----------------------------
- This is a single-file implementation with small local components.
- To split into multiple files:
  - InboxScreen -> Inbox.js
  - ChatScreen -> Chat.js
  - SettingsScreen -> Settings.js
  - StoryBubble -> StoryBubble.js
  - Move wallpapers array to constants.js
- Wallpapers are Unsplash images — change to local assets if offline.
- All data is local/dummy. Reconnect to your Firebase logic when ready.
----------------------------*/
