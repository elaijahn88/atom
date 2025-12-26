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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ref, onValue, push, set } from "firebase/database";
import { database } from "../../firebase"; // <-- changed here

/* =====================
   USER & CHAT SETUP
===================== */
const MY_EMAIL = "elajahn8@gmail.com";
const MY_KEY = MY_EMAIL.replace(/\./g, ",");

// Self-chat for demo (can be replaced with other user)
const CHAT_ID = `${MY_KEY}_${MY_KEY}`;
const CHAT_PATH = `chats/${CHAT_ID}/messages`;
const USER_PATH = `users/${MY_KEY}`;

/* =====================
   APP
===================== */
export default function App() {
  const [screen, setScreen] = useState("chat");
  const [darkMode, setDarkMode] = useState(true);
  const styles = stylesFn(darkMode);

  useEffect(() => {
    StatusBar.setBarStyle("light-content", true);

    // Create USER node if not exists
    set(ref(database, USER_PATH), {
      email: MY_EMAIL,
      createdAt: Date.now(),
    });

    // Create CHAT metadata if not exists
    set(ref(database, `chats/${CHAT_ID}/info`), {
      createdAt: Date.now(),
      participants: {
        [MY_KEY]: true,
      },
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.logo}>Green₩</Text>
        <TouchableOpacity onPress={() => setScreen("settings")}>
          <Ionicons name="settings" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {screen === "chat" && <ChatScreen styles={styles} />}
      {screen === "settings" && (
        <SettingsScreen
          styles={styles}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onBack={() => setScreen("chat")}
        />
      )}
    </SafeAreaView>
  );
}

/* =====================
   CHAT SCREEN
===================== */
function ChatScreen({ styles }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    const msgRef = ref(database, CHAT_PATH);

    onValue(msgRef, (snap) => {
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

      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });
  }, []);

  const sendMessage = () => {
    if (!text.trim()) return;

    push(ref(database, CHAT_PATH), {
      sender: MY_KEY,
      text: text.trim(),
      timestamp: Date.now(),
    });

    setText("");
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => {
          const mine = item.sender === MY_KEY;
          return (
            <View
              style={[
                styles.msgBubble,
                mine ? styles.mine : styles.theirs,
              ]}
            >
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
          placeholder="Type a message"
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity onPress={sendMessage}>
          <Ionicons name="send" size={26} color="#25D366" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* =====================
   SETTINGS SCREEN
===================== */
function SettingsScreen({ styles, darkMode, setDarkMode, onBack }) {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.settingsTitle}>Settings</Text>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Dark Mode</Text>
        <Switch value={darkMode} onValueChange={setDarkMode} />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Account</Text>
        <Text style={styles.settingValue}>{MY_EMAIL}</Text>
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Database</Text>
        <Text style={styles.settingValue}>Realtime DB (Auto-created)</Text>
      </View>
    </View>
  );
}

/* =====================
   STYLES
===================== */
const stylesFn = (dark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: dark ? "#121B22" : "#f2f2f2",
    },
    topBar: {
      padding: 12,
      backgroundColor: "#075E54",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    logo: {
      color: "#fff",
      fontSize: 20,
      fontWeight: "bold",
    },

    msgBubble: {
      padding: 10,
      margin: 8,
      borderRadius: 10,
      maxWidth: "80%",
    },
    mine: {
      backgroundColor: "#056162",
      alignSelf: "flex-end",
    },
    theirs: {
      backgroundColor: "#1E2C33",
      alignSelf: "flex-start",
    },
    msgText: {
      color: "#fff",
    },

    inputBar: {
      flexDirection: "row",
      padding: 10,
      backgroundColor: "#1E2C33",
      alignItems: "center",
    },
    input: {
      flex: 1,
      backgroundColor: "#2A3942",
      borderRadius: 20,
      paddingHorizontal: 12,
      color: "#fff",
      marginRight: 8,
    },

    backText: {
      color: "#25D366",
      marginBottom: 20,
      fontSize: 16,
    },
    settingsTitle: {
      color: dark ? "#fff" : "#000",
      fontSize: 22,
      fontWeight: "bold",
      marginBottom: 20,
    },
    settingItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    settingLabel: {
      color: dark ? "#fff" : "#000",
      fontSize: 16,
    },
    settingValue: {
      color: "#aaa",
    },
  });
